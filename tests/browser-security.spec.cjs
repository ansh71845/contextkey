const { chromium } = require('playwright');
const assert = require('node:assert/strict');

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
  if (shareable) await page.locator('.share-toggle').click();
  await page.locator('#item-form').locator('button[type="submit"]').click();
  await page.getByText(title, { exact: true }).waitFor();
}

async function waitForRestoreInputReset(page) {
  await page.waitForFunction(() => {
    const input = document.querySelector('#restore-file');
    return input && input.value === '';
  });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  try {
    const lockContext = await browser.newContext();
    const lockPage = await lockContext.newPage();
    await createVault(lockPage, PASS_A);
    await addEntry(lockPage, 'Shareable sample', 'This text is approved for export.', true);
    await addEntry(lockPage, 'Private sample', 'This text must stay private.', false);
    await lockPage.locator('[data-view="share"]').click();
    const preview = await lockPage.locator('#pack-preview').inputValue();
    assert.match(preview, /Shareable sample/);
    assert.doesNotMatch(preview, /Private sample/);
    await lockPage.locator('#lock-button').click();
    await lockPage.locator('#gate').waitFor({ state: 'visible' });
    assert.equal(await lockPage.locator('#pack-preview').inputValue(), '');
    assert.equal(await lockPage.locator('#item-name').inputValue(), '');
    assert.equal(await lockPage.locator('#item-content').inputValue(), '');
    assert.equal(await lockPage.locator('#context-list').innerText(), '');
    await lockContext.close();

    const backupContext = await browser.newContext({ acceptDownloads: true });
    const backupPage = await backupContext.newPage();
    await createVault(backupPage, PASS_B);
    await addEntry(backupPage, 'Restored sample', 'Only the verified backup should replace the vault.', true);
    await backupPage.locator('[data-view="overview"]').click();
    const [download] = await Promise.all([
      backupPage.waitForEvent('download'),
      backupPage.locator('#backup-button').click()
    ]);
    const backupPath = await download.path();
    assert.ok(backupPath, 'encrypted backup download should produce a file');
    const backupBuffer = require('node:fs').readFileSync(backupPath);
    await backupContext.close();

    const restoreContext = await browser.newContext();
    const restorePage = await restoreContext.newPage();
    await createVault(restorePage, PASS_A);
    await addEntry(restorePage, 'Current sample', 'This entry must survive a rejected restore.', true);

    restorePage.once('dialog', async (dialog) => {
      assert.equal(dialog.type, 'prompt');
      await dialog.accept('incorrect-passphrase');
    });
    await restorePage.locator('#restore-file').setInputFiles({
      name: 'contextkey-test.ckvault',
      mimeType: 'application/json',
      buffer: backupBuffer
    });
    await waitForRestoreInputReset(restorePage);
    assert.equal(await restorePage.getByText('Current sample', { exact: true }).count(), 1);

    restorePage.on('dialog', async (dialog) => {
      if (dialog.type === 'prompt') await dialog.accept(PASS_B);
      else if (dialog.type === 'confirm') await dialog.accept();
      else await dialog.dismiss();
    });
    await restorePage.locator('#restore-file').setInputFiles({
      name: 'contextkey-test.ckvault',
      mimeType: 'application/json',
      buffer: backupBuffer
    });
    await waitForRestoreInputReset(restorePage);
    await restorePage.locator('#gate').waitFor({ state: 'visible' });
    await restorePage.locator('#unlock-pass').fill(PASS_B);
    await restorePage.locator('#unlock-vault').click();
    await restorePage.locator('#app').waitFor({ state: 'visible' });
    await restorePage.locator('[data-view="library"]').click();
    assert.equal(await restorePage.getByText('Restored sample', { exact: true }).count(), 1);
    assert.equal(await restorePage.getByText('Current sample', { exact: true }).count(), 0);
    await restoreContext.close();

    process.stdout.write('Browser security checks passed: lock cleanup, private-pack exclusion, rejected restore preservation, and verified restore.\\n');
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
