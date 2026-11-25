const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const BASE_URL = 'http://127.0.0.1:4173/';
const PASS_A = 'contextkey-test-passphrase-A-2026';
const PASS_B = 'contextkey-test-passphrase-B-2026';

async function createVault(page, passphrase) {
  await page.goto(BASE_URL);
  await page.locator('a[href="./privacy.html"]').first().waitFor({ state: 'visible' });
  await page.locator('a[href="./terms.html"]').first().waitFor({ state: 'visible' });
  await page.locator('#new-pass').fill(passphrase);
  await page.locator('#confirm-pass').fill(passphrase);
  await page.locator('#create-vault').click();
  await page.locator('#app').waitFor({ state: 'visible' });
}

async function navigate(page, view) {
  const menu = page.locator('#mobile-menu-toggle');
  if (await menu.isVisible() && await menu.getAttribute('aria-expanded') !== 'true') await menu.click();
  await page.locator('button[data-view="' + view + '"]').click();
  if (await menu.isVisible()) assert.equal(await menu.getAttribute('aria-expanded'), 'false', 'mobile menu should close after navigation');
}

async function addEntry(page, title, content, shareable) {
  await navigate(page, 'library');
  await page.locator('#item-name').fill(title);
  await page.locator('#item-content').fill(content);
  assert.equal(await page.locator('#content-count').innerText(), `${content.length} / 1,400`);
  if (shareable) await page.locator('.share-toggle').click();
  await page.locator('#item-form').locator('button[type="submit"]').click();
  await page.getByText(title, { exact: true }).waitFor();
  assert.equal(await page.locator('#content-count').innerText(), '0 / 1,400');
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
    await packPage.locator('#library-filter').selectOption('private');
    assert.equal(await packPage.locator('.context-item').count(), 1, 'private filter should show only private entries');
    await packPage.getByText('Private sample', { exact: true }).waitFor();
    await packPage.locator('#library-filter').selectOption('shareable');
    assert.equal(await packPage.locator('.context-item').count(), 1, 'share-ready filter should show only approved entries');
    await packPage.getByText('Shareable sample', { exact: true }).waitFor();
    await packPage.locator('#library-filter').selectOption('all');
    await navigate(packPage, 'share');

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
    await navigate(backupPage, 'overview');
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
    await navigate(restorePage, 'library');
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
    await navigate(failedSavePage, 'library');
    await failedSavePage.locator('#item-name').fill('Unsaved sample');
    await failedSavePage.locator('#item-content').fill('This should not appear as a saved entry.');
    await failedSavePage.locator('.share-toggle').click();
    await failedSavePage.locator('#item-form button[type="submit"]').click();
    await failedSavePage.getByText('This device is low on browser storage. Free up space and try again.').waitFor();
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

    const offlineContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const offlinePage = await offlineContext.newPage();
    await createVault(offlinePage, PASS_A);
    await offlinePage.evaluate(async () => { await navigator.serviceWorker.ready; });
    await offlinePage.goto(BASE_URL + 'privacy.html');
    await offlinePage.waitForFunction(() => navigator.serviceWorker.controller !== null);
    await offlineContext.setOffline(true);
    await offlinePage.reload();
    assert.match(await offlinePage.title(), /Privacy Policy/, 'offline privacy navigation must not be replaced by the app shell');
    await offlinePage.goto(BASE_URL);
    assert.match(await offlinePage.title(), /ContextKey/, 'the offline app entry point must remain intact');
    await offlineContext.close();

    const responsiveContext = await browser.newContext({ viewport: { width: 360, height: 780 } });
    const responsivePage = await responsiveContext.newPage();
    await createVault(responsivePage, PASS_A);
    assert.equal(await responsivePage.locator('#mobile-menu-toggle').isVisible(), true, 'mobile menu control should be visible at phone widths');
    assert.equal(await responsivePage.locator('#mobile-menu-toggle').getAttribute('aria-expanded'), 'false');
    await responsivePage.locator('#mobile-menu-toggle').click();
    assert.equal(await responsivePage.locator('#mobile-menu-toggle').getAttribute('aria-expanded'), 'true');
    await responsivePage.locator('#mobile-menu-toggle').press('Escape');
    assert.equal(await responsivePage.locator('#mobile-menu-toggle').getAttribute('aria-expanded'), 'false', 'Escape should close the mobile menu');
    assert.equal(await responsivePage.evaluate(() => document.activeElement.id), 'mobile-menu-toggle', 'Escape should return focus to the menu control');
    await navigate(responsivePage, 'library');
    const mobileWidth = await responsivePage.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth
    }));
    assert.ok(mobileWidth.content <= mobileWidth.viewport, 'mobile app must not overflow horizontally');
    await responsivePage.goto(BASE_URL + 'privacy.html');
    assert.match(await responsivePage.title(), /Privacy Policy/);
    assert.ok(await responsivePage.locator('meta[name="description"]').getAttribute('content'));
    const legalWidth = await responsivePage.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
    assert.ok(legalWidth.content <= legalWidth.viewport, 'privacy page must not overflow horizontally');
    await responsivePage.goto(BASE_URL + 'terms.html');
    assert.match(await responsivePage.title(), /Terms and Conditions/);
    const termsWidth = await responsivePage.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
    assert.ok(termsWidth.content <= termsWidth.viewport, 'terms page must not overflow horizontally');
    await responsivePage.goto(BASE_URL + '404.html');
    assert.match(await responsivePage.title(), /Page Not Found/);
    const notFoundWidth = await responsivePage.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
    assert.ok(notFoundWidth.content <= notFoundWidth.viewport, '404 page must not overflow horizontally');
    await responsivePage.goto(BASE_URL);
    await responsivePage.locator('#unlock-pass').fill(PASS_A);
    await responsivePage.locator('#unlock-vault').click();
    await responsivePage.locator('#app').waitFor({ state: 'visible' });

    const responsiveWidths = [320, 360, 390, 430, 700, 701, 768, 980, 1024, 1440];
    for (const width of responsiveWidths) {
      await responsivePage.setViewportSize({ width, height: 900 });
      const dimensions = await responsivePage.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        content: document.documentElement.scrollWidth
      }));
      assert.ok(dimensions.content <= dimensions.viewport,
        'app must not overflow horizontally at ' + width + 'px');
      assert.equal(await responsivePage.locator('#mobile-menu-toggle').isVisible(), width <= 700,
        'mobile menu visibility must switch at the documented breakpoint (' + width + 'px)');
      for (const view of ['overview', 'library', 'share']) {
        await navigate(responsivePage, view);
        const viewDimensions = await responsivePage.evaluate(() => ({
          viewport: document.documentElement.clientWidth,
          content: document.documentElement.scrollWidth
        }));
        assert.ok(viewDimensions.content <= viewDimensions.viewport,
          view + ' must not overflow horizontally at ' + width + 'px');
      }
    }
    await responsivePage.locator('.topbar .brand').click();
    await responsivePage.locator('#view-overview').waitFor({ state: 'visible' });
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
