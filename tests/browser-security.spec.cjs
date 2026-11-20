const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const BASE_URL = 'http://127.0.0.1:4173/';
const PASS_A = 'contextkey-test-passphrase-A-2026';
const PASS_B = 'contextkey-test-passphrase-B-2026';

async function createVault(page, passphrase) {
  await page.goto(BASE_URL);
  await page.locator('#new-pass').fill(passphrase);
  await page.locator('#confirm-pass').fill(passphrase);
  await page.locator('#create-vault').click();
  await page.locator('#app').waitFor({ state: 'visible' });
}

async function addEntry(page, title, content, shareable) {
  await page.locator('[data-view="library"]').click();
  await page.locator('#item-name').fill(title);
  await page.locator('#item-content').fill(content);
  if (shareable) await page.locator('#item-shareable').check();
  await page.locator('#item-form').locator('button[type="submit"]').click();
  await page.getByText(title, { exact: true }).waitFor();
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  try {
    const mobile = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
    const packContext = await browser.newContext({ ...mobile, acceptDownloads: true });
    const packPage = await packContext.newPage();
    await createVault(packPage, PASS_A);
    await addEntry(packPage, 'Shareable sample', 'This text is approved for export.', true);
    await addEntry(packPage, 'Private sample', 'This text must stay private.', false);
    await packPage.locator('[data-view="share"]').click();

    assert.equal(await packPage.locator('#pack-preview').inputValue(), '', 'context pack must start empty');
    assert.equal(await packPage.locator('#pack-items [data-pack-id]').count(), 1, 'private entries must not appear in the picker');
    await packPage.locator('#pack-items [data-pack-id]').check();
    const preview = await packPage.locator('#pack-preview').inputValue();
    assert.match(preview, /Shareable sample/);
    assert.doesNotMatch(preview, /Private sample/);
    assert.match(preview, /Purpose: General assistant/);
    assert.equal(await packPage.locator('#pack-length').innerText(), `${preview.length} characters`);

    await packPage.locator('#pack-purpose').selectOption('study');
    assert.match(await packPage.locator('#pack-preview').inputValue(), /Purpose: Learning \/ study/);
    await packPage.locator('#clear-selection').click();
    assert.equal(await packPage.locator('#pack-preview').inputValue(), '');
    await packPage.locator('#select-suggested').click();
    assert.match(await packPage.locator('#pack-preview').inputValue(), /Shareable sample/);

    const [packDownload] = await Promise.all([
      packPage.waitForEvent('download'),
      packPage.locator('#download-pack').click()
    ]);
    assert.match(packDownload.suggestedFilename(), /^contextkey-study-\d{4}-\d{2}-\d{2}\.md$/);

    await packPage.locator('#lock-button').click();
    await packPage.locator('#gate').waitFor({ state: 'visible' });
    assert.equal(await packPage.locator('#pack-preview').inputValue(), '');
    assert.equal(await packPage.locator('#item-name').inputValue(), '');
    assert.equal(await packPage.locator('#item-content').inputValue(), '');
    assert.equal(await packPage.locator('#context-list').innerText(), '');
    await packContext.close();

    const backupContext = await browser.newContext({ ...mobile, acceptDownloads: true });
    const backupPage = await backupContext.newPage();
    await createVault(backupPage, PASS_B);
    await addEntry(backupPage, 'Restored sample', 'Only the verified backup should replace the vault.', true);
    await backupPage.locator('[data-view="overview"]').click();
    const [backupDownload] = await Promise.all([
      backupPage.waitForEvent('download'),
      backupPage.locator('#backup-button').click()
    ]);
    const backupPath = await backupDownload.path();
    assert.ok(backupPath, 'encrypted backup download should produce a file');
    const backupBuffer = fs.readFileSync(backupPath);
    await backupContext.close();

    const restoreContext = await browser.newContext(mobile);
    const restorePage = await restoreContext.newPage();
    await createVault(restorePage, PASS_A);
    await addEntry(restorePage, 'Current sample', 'This entry must survive a rejected restore.', true);

    await restorePage.locator('#restore-file').setInputFiles({
      name: 'contextkey-test.ckvault',
      mimeType: 'application/json',
      buffer: backupBuffer
    });
    await restorePage.locator('#restore-dialog').waitFor({ state: 'visible' });
    await restorePage.locator('#restore-passphrase').fill('incorrect-passphrase');
    await restorePage.locator('#verify-backup').click();
    await restorePage.getByText('That passphrase did not unlock this backup.').waitFor();
    assert.equal(await restorePage.getByText('Current sample', { exact: true }).count(), 1);

    await restorePage.locator('#restore-passphrase').fill(PASS_B);
    await restorePage.locator('#verify-backup').click();
    await restorePage.locator('#restore-confirm-step').waitFor({ state: 'visible' });
    await restorePage.getByText('This encrypted backup contains 1 entry.').waitFor();
    await restorePage.locator('#confirm-restore').click();
    await restorePage.locator('#gate').waitFor({ state: 'visible' });
    await restorePage.locator('#unlock-pass').fill(PASS_B);
    await restorePage.locator('#unlock-vault').click();
    await restorePage.locator('#app').waitFor({ state: 'visible' });
    await restorePage.locator('[data-view="library"]').click();
    assert.equal(await restorePage.getByText('Restored sample', { exact: true }).count(), 1);
    assert.equal(await restorePage.getByText('Current sample', { exact: true }).count(), 0);
    await restoreContext.close();

    const blockedContext = await browser.newContext(mobile);
    await blockedContext.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        get() { throw new DOMException('Storage disabled', 'SecurityError'); }
      });
    });
    const blockedPage = await blockedContext.newPage();
    await blockedPage.goto(BASE_URL);
    await blockedPage.getByText('Browser storage is blocked or unavailable').waitFor();
    assert.equal(await blockedPage.locator('#create-vault').isDisabled(), true);
    await blockedContext.close();

    const failedSaveContext = await browser.newContext(mobile);
    const failedSavePage = await failedSaveContext.newPage();
    await createVault(failedSavePage, PASS_A);
    await failedSavePage.evaluate(() => {
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key, value) {
        if (key === 'contextkey.encrypted.v1') throw new DOMException('Storage full', 'QuotaExceededError');
        return original.call(this, key, value);
      };
    });
    await failedSavePage.locator('[data-view="library"]').click();
    await failedSavePage.locator('#item-name').fill('Unsaved sample');
    await failedSavePage.locator('#item-content').fill('This should not appear as a saved entry.');
    await failedSavePage.locator('#item-shareable').check();
    await failedSavePage.locator('#item-form button[type="submit"]').click();
    await failedSavePage.getByText('Browser storage could not save this change.').waitFor();
    assert.equal(await failedSavePage.locator('.context-item').count(), 0, 'failed write must not commit entry in memory');
    assert.equal(await failedSavePage.locator('#item-name').inputValue(), 'Unsaved sample', 'failed save should preserve the draft for retry');
    await failedSaveContext.close();

    const oversizedContext = await browser.newContext(mobile);
    const oversizedPage = await oversizedContext.newPage();
    await oversizedPage.goto(BASE_URL);
    await oversizedPage.locator('.restore-from-gate').first().click();
    await oversizedPage.locator('#restore-file').setInputFiles({
      name: 'oversized.ckvault',
      mimeType: 'application/json',
      buffer: Buffer.alloc(7 * 1024 * 1024 + 1)
    });
    await oversizedPage.getByText('This backup is larger than the supported 7 MiB limit.').waitFor();
    await oversizedContext.close();

    const responsiveContext = await browser.newContext({ viewport: { width: 360, height: 780 } });
    const responsivePage = await responsiveContext.newPage();
    await createVault(responsivePage, PASS_A);
    const mobileWidth = await responsivePage.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth
    }));
    assert.ok(mobileWidth.content <= mobileWidth.viewport, 'mobile app must not overflow horizontally');
    await responsivePage.setViewportSize({ width: 1440, height: 900 });
    const desktopWidth = await responsivePage.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth
    }));
    assert.ok(desktopWidth.content <= desktopWidth.viewport, 'desktop app must not overflow horizontally');
    await responsiveContext.close();

    process.stdout.write('ContextKey browser checks passed: explicit sharing, preview, export, lock cleanup, backup verification, restore safety, blocked storage, failed-write rollback, size limits and responsive layout.\n');
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
