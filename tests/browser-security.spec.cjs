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

async function verifyDataIntegrityHelpers(page) {
  const now = new Date().toISOString();
  const valid = await page.evaluate((timestamp) => {
    const result = validateBackupVault({
      version: 1,
      items: [
        { id: 'first-id', section: 'About', title: 'First note', content: 'Preserve every character. ', shareable: false, createdAt: timestamp, updatedAt: timestamp },
        { id: 'second-id', section: 'Goals', title: 'Second note', content: 'Keep this entry too.', shareable: true, createdAt: timestamp, updatedAt: timestamp }
      ]
    });
    return { count: result.items.length, content: result.items[0].content, idsDiffer: result.items[0].id !== result.items[1].id };
  }, now);
  assert.equal(valid.count, 2, 'strict backup validation must retain all valid entries');
  assert.equal(valid.content, 'Preserve every character. ', 'backup validation must preserve content exactly');
  const legacy = await page.evaluate(() => {
    const result = normalizeStoredVault({
      version: 1,
      items: [
        { id: 'duplicate-id', section: 'Unknown category', title: 'Legacy note', content: 'Preserve every character. ', shareable: 'yes', createdAt: 'invalid-date', updatedAt: 'invalid-date' },
        { id: 'duplicate-id', section: 'Goals', title: 'Second note', content: 'Keep this entry too.', shareable: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
      ]
    });
    return {
      count: result.items.length,
      firstContent: result.items[0].content,
      firstSection: result.items[0].section,
      firstShareable: result.items[0].shareable,
      idsDiffer: result.items[0].id !== result.items[1].id,
      firstCreatedAtValid: Number.isFinite(Date.parse(result.items[0].createdAt)),
      firstUpdatedAtValid: Number.isFinite(Date.parse(result.items[0].updatedAt))
    };
  });
  assert.equal(legacy.count, 2, 'legacy vault loading must preserve every valid entry');
  assert.equal(legacy.firstContent, 'Preserve every character. ', 'legacy normalization must preserve content exactly');
  assert.equal(legacy.firstSection, 'About', 'unknown legacy categories must retain the established fallback');
  assert.equal(legacy.firstShareable, false, 'unknown legacy sharing values must remain private');
  assert.equal(legacy.idsDiffer, true, 'legacy duplicate IDs must be repaired without dropping entries');
  assert.equal(legacy.firstCreatedAtValid, true, 'legacy invalid creation timestamps must be normalized');
  assert.equal(legacy.firstUpdatedAtValid, true, 'legacy invalid update timestamps must be normalized');


  const markdownSource = [
    'Intro text before the first heading.',
    '',
    '# Profile',
    'A profile detail.',
    '',
    '```md',
    '## This heading belongs to code',
    '```',
    '',
    '## Project',
    'A project detail.'
  ].join('\n');
  const markdown = await page.evaluate((source) => parseMarkdownMemory(source, 'notes.md')
    .map((entry) => ({ title: entry.title, content: entry.content })), markdownSource);
  assert.equal(markdown.length, 3, 'Markdown preamble and both real headings should become entries');
  assert.equal(markdown[0].title, 'Introduction');
  assert.match(markdown[0].content, /Intro text before the first heading/);
  assert.match(markdown[1].content, /## This heading belongs to code/, 'headings inside fenced code must remain content');
  assert.equal(markdown[2].title, 'Project');

  const duplicateIds = await page.evaluate((timestamp) => {
    try {
      validateBackupVault({
        version: 1,
        items: [
          { id: 'duplicate', section: 'About', title: 'First', content: 'Keep me', shareable: false, createdAt: timestamp, updatedAt: timestamp },
          { id: 'duplicate', section: 'Goals', title: 'Second', content: 'Do not silently repair', shareable: true, createdAt: timestamp, updatedAt: timestamp }
        ]
      });
      return 'accepted';
    } catch (error) {
      return error.message;
    }
  }, now);
  assert.match(duplicateIds, /Backup entry 2 is invalid or unsupported/);

  const malformed = await page.evaluate((timestamp) => {
    try {
      validateBackupVault({ version: 1, items: [{ id: 'valid', section: 'Unknown', title: 'Valid', content: 'Keep me', shareable: true, createdAt: timestamp, updatedAt: timestamp }] });
      return 'accepted';
    } catch (error) {
      return error.message;
    }
  }, now);
  assert.match(malformed, /Backup entry 1 is invalid or unsupported/);

  const oversized = await page.evaluate((timestamp) => {
    try {
      validateBackupVault({ version: 1, items: [{ id: 'long', section: 'About', title: 'Valid', content: 'x'.repeat(1401), shareable: false, createdAt: timestamp, updatedAt: timestamp }] });
      return 'accepted';
    } catch (error) {
      return error.message;
    }
  }, now);
  assert.match(oversized, /Backup entry 1 is invalid or unsupported/);
}
async function main() {
  const browser = await chromium.launch({ headless: true });
  try {
    const mobile = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
    const packContext = await browser.newContext({ ...mobile, acceptDownloads: true });
    const packPage = await packContext.newPage();
    await createVault(packPage, PASS_A);
    await verifyDataIntegrityHelpers(packPage);
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

    const lockRaceContext = await browser.newContext(mobile);
    const lockRacePage = await lockRaceContext.newPage();
    await createVault(lockRacePage, PASS_A);
    await navigate(lockRacePage, 'library');
    await lockRacePage.locator('#item-name').fill('Saved during lock');
    await lockRacePage.locator('#item-content').fill('The save must finish without restoring the unlocked session.');
    await lockRacePage.evaluate(() => {
      const originalPersist = persistVault;
      persistVault = async (...args) => {
        await new Promise((resolve) => setTimeout(resolve, 350));
        return originalPersist(...args);
      };
    });
    await lockRacePage.locator('#item-form button[type="submit"]').click();
    await lockRacePage.waitForFunction(() => isSaving === true);
    await lockRacePage.locator('#lock-button').click();
    assert.equal(await lockRacePage.locator('#app').isVisible(), true,
      'the current save must finish before the vault transitions to its locked screen');
    await lockRacePage.locator('#gate').waitFor({ state: 'visible' });
    await lockRacePage.waitForTimeout(500);
    assert.equal(await lockRacePage.locator('#app').isVisible(), false, 'the app must remain locked after the pending save completes');
    assert.equal(await lockRacePage.locator('#context-list .context-item').count(), 0,
      'a pending save must not repopulate decrypted entry content after locking');
    const persistedTitles = await lockRacePage.evaluate(async (passphrase) => {
      const envelope = JSON.parse(localStorage.getItem('contextkey.encrypted.v1') || 'null');
      if (!envelope) return [];
      const decrypted = await decryptVaultEnvelope(envelope, passphrase, normalizeStoredVault);
      return decrypted.vault.items.map((item) => item.title);
    }, PASS_A);
    assert.ok(persistedTitles.includes('Saved during lock'),
      'the pending save must finish writing its encrypted record before the session is unlocked');
    await lockRacePage.locator('#unlock-pass').fill(PASS_A);
    await lockRacePage.locator('#unlock-vault').click();
    await lockRacePage.locator('#app').waitFor({ state: 'visible' });
    await navigate(lockRacePage, 'library');
    assert.equal(await lockRacePage.getByText('Saved during lock', { exact: true }).count(), 1,
      'the encrypted save should still be available after a deliberate unlock');
    await lockRaceContext.close();

    const importTimestamp = new Date().toISOString();
    const portableFixture = (id, title) => Buffer.from(JSON.stringify({
      format: 'contextkey-context',
      schemaVersion: 1,
      exportedAt: importTimestamp,
      items: [{ id, section: 'About', title, content: 'Private import fixture content.', shareable: false, createdAt: importTimestamp, updatedAt: importTimestamp }]
    }));
    const competingImportContext = await browser.newContext(mobile);
    const competingImportPage = await competingImportContext.newPage();
    await createVault(competingImportPage, PASS_A);
    await competingImportPage.evaluate(() => {
      const originalText = File.prototype.text;
      File.prototype.text = function () {
        const result = originalText.call(this);
        if (this.name === 'slow-first.json') {
          return new Promise((resolve, reject) => setTimeout(() => result.then(resolve, reject), 600));
        }
        return result;
      };
    });
    await competingImportPage.locator('#portable-import-file').setInputFiles({
      name: 'slow-first.json', mimeType: 'application/json',
      buffer: portableFixture('slow-id', 'Stale first file')
    });
    await competingImportPage.locator('#portable-import-file').setInputFiles({
      name: 'fast-second.json', mimeType: 'application/json',
      buffer: portableFixture('fast-id', 'Current second file')
    });
    await competingImportPage.locator('#portable-import-dialog').waitFor({ state: 'visible' });
    assert.equal(await competingImportPage.locator('#portable-import-list').getByText('Current second file').count(), 1,
      'the newest selected JSON file should own the preview');
    await competingImportPage.waitForTimeout(700);
    assert.equal(await competingImportPage.locator('#portable-import-list').getByText('Stale first file').count(), 0,
      'a slower earlier JSON read must not overwrite the newer preview');
    assert.equal(await competingImportPage.locator('#portable-import-list').getByText('Current second file').count(), 1);
    await competingImportPage.locator('#portable-import-cancel').click();
    await competingImportContext.close();

    const portableLockContext = await browser.newContext(mobile);
    const portableLockPage = await portableLockContext.newPage();
    await createVault(portableLockPage, PASS_A);
    await portableLockPage.evaluate(() => {
      const originalText = File.prototype.text;
      File.prototype.text = function () {
        const result = originalText.call(this);
        if (this.name === 'delayed-private.json') {
          return new Promise((resolve, reject) => setTimeout(() => result.then(resolve, reject), 600));
        }
        return result;
      };
    });
    await portableLockPage.locator('#portable-import-file').setInputFiles({
      name: 'delayed-private.json', mimeType: 'application/json',
      buffer: portableFixture('locked-json-id', 'Sensitive JSON preview')
    });
    await portableLockPage.waitForFunction(() => portableImportGeneration > 0);
    await portableLockPage.locator('#lock-button').click();
    await portableLockPage.locator('#gate').waitFor({ state: 'visible' });
    await portableLockPage.waitForTimeout(700);
    assert.equal(await portableLockPage.locator('#portable-import-dialog').isVisible(), false,
      'locking must close a pending JSON import preview');
    assert.equal(await portableLockPage.evaluate(() => pendingPortableItems.length), 0,
      'locking must clear pending JSON import data');
    assert.equal(await portableLockPage.getByText('Sensitive JSON preview').count(), 0,
      'a stale JSON read must not reinsert imported content after lock');
    await portableLockContext.close();

    const markdownLockContext = await browser.newContext(mobile);
    const markdownLockPage = await markdownLockContext.newPage();
    await createVault(markdownLockPage, PASS_A);
    const markdownFixture = '# Sensitive Markdown preview\nPrivate imported note.';
    assert.deepEqual(await markdownLockPage.evaluate((text) => parseMarkdownMemory(text, 'fixture.md'), markdownFixture), [
      { title: 'Sensitive Markdown preview', content: 'Private imported note.', section: 'About', shareable: false }
    ]);
    await markdownLockPage.evaluate(() => {
      const originalText = File.prototype.text;
      File.prototype.text = function () {
        const result = originalText.call(this);
        if (this.name === 'delayed-private.md') {
          return new Promise((resolve, reject) => setTimeout(() => result.then(resolve, reject), 600));
        }
        return result;
      };
    });
    await markdownLockPage.locator('#markdown-import-file').setInputFiles({
      name: 'delayed-private.md', mimeType: 'text/markdown',
      buffer: Buffer.from(markdownFixture)
    });
    await markdownLockPage.waitForFunction(() => markdownImportGeneration > 0);
    await markdownLockPage.locator('#lock-button').click();
    await markdownLockPage.locator('#gate').waitFor({ state: 'visible' });
    await markdownLockPage.waitForTimeout(700);
    assert.equal(await markdownLockPage.locator('#markdown-import-dialog').isVisible(), false,
      'locking must close a pending Markdown import preview');
    assert.equal(await markdownLockPage.evaluate(() => pendingMarkdownItems.length), 0,
      'locking must clear pending Markdown import data');
    assert.equal(await markdownLockPage.getByText('Sensitive Markdown preview').count(), 0,
      'a stale Markdown read must not reinsert imported content after lock');
    await markdownLockContext.close();

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

    const restoreRaceContext = await browser.newContext(mobile);
    const restoreRacePage = await restoreRaceContext.newPage();
    await createVault(restoreRacePage, PASS_A);
    await addEntry(restoreRacePage, 'Current before stale read', 'A delayed read failure must not disturb this vault.', true);
    await restoreRacePage.evaluate(() => {
      const originalText = File.prototype.text;
      window.__staleRestoreReadStarted = false;
      File.prototype.text = function () {
        if (this.name === 'delayed-stale-failure.ckvault') {
          window.__staleRestoreReadStarted = true;
          return new Promise((resolve, reject) => setTimeout(
            () => reject(new Error('stale restore file read failure')), 700
          ));
        }
        return originalText.call(this);
      };
      const toast = document.getElementById('toast');
      toast.classList.remove('show');
      toast.textContent = '';
    });
    await restoreRacePage.locator('#restore-file').setInputFiles({
      name: 'delayed-stale-failure.ckvault',
      mimeType: 'application/json',
      buffer: Buffer.from('delayed invalid backup')
    });
    await restoreRacePage.waitForFunction(() => window.__staleRestoreReadStarted === true);
    await restoreRacePage.locator('#restore-file').setInputFiles({
      name: 'latest-valid-backup.ckvault',
      mimeType: 'application/json',
      buffer: backupBuffer
    });
    await restoreRacePage.locator('#restore-dialog').waitFor({ state: 'visible' });
    assert.equal(await restoreRacePage.evaluate(() => pendingBackup?.format), 'contextkey-vault',
      'the latest valid backup should own the restore dialog');
    await restoreRacePage.waitForTimeout(800);
    assert.equal(await restoreRacePage.evaluate(() => {
      const toast = document.getElementById('toast');
      return toast.classList.contains('show') && toast.textContent.includes('stale restore file read failure');
    }), false, 'a stale file-read rejection must not replace the active restore UI with an old error');
    await restoreRacePage.locator('#restore-passphrase').fill(PASS_B);
    await restoreRacePage.locator('#verify-backup').click();
    await restoreRacePage.getByText('Backup verified').waitFor();
    await restoreRacePage.locator('#cancel-restore').click();
    assert.equal(await restoreRacePage.getByText('Current before stale read', { exact: true }).count(), 1,
      'the current vault must remain intact after a stale rejected file read');
    await restoreRaceContext.close();

    const restoreContext = await browser.newContext(mobile);
    const restorePage = await restoreContext.newPage();
    await createVault(restorePage, PASS_A);
    await addEntry(restorePage, 'Current sample', 'This entry must survive a rejected restore.', true);

    await restorePage.locator('#restore-file').setInputFiles({
      name: 'invalid-json.ckvault',
      mimeType: 'application/json',
      buffer: Buffer.from('{not-json')
    });
    await restorePage.locator('#toast').filter({ hasText: /JSON|Unexpected token|valid/i }).waitFor();
    assert.equal(await restorePage.getByText('Current sample', { exact: true }).count(), 1,
      'invalid JSON must not alter the existing vault');

    await restorePage.locator('#restore-file').setInputFiles({
      name: 'unsupported-format.ckvault',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify({ format: 'other', version: 99 }))
    });
    await restorePage.getByText('This backup uses an unsupported or invalid encryption format.').waitFor();
    assert.equal(await restorePage.getByText('Current sample', { exact: true }).count(), 1,
      'unsupported backup metadata must not alter the existing vault');

    const nonCanonicalEnvelope = JSON.parse(backupBuffer.toString('utf8'));
    nonCanonicalEnvelope.salt = nonCanonicalEnvelope.salt.slice(0, -3) + 'B==';
    await restorePage.locator('#restore-file').setInputFiles({
      name: 'corrupt-base64.ckvault',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(nonCanonicalEnvelope))
    });
    await restorePage.getByText('This backup has invalid encryption data or exceeds the supported size.').waitFor();
    assert.equal(await restorePage.getByText('Current sample', { exact: true }).count(), 1,
      'non-canonical base64 must be rejected before restore verification');

    const malformedBackup = await restorePage.evaluate(async (passphrase) => {
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const key = await deriveKey(passphrase, salt);
      return JSON.stringify(await encryptObject({
        version: 1,
        items: [
          { id: 'valid-entry', section: 'About', title: 'Valid backup entry', content: 'This content must remain intact.', shareable: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
          null
        ]
      }, key, salt));
    }, PASS_B);
    await restorePage.locator('#restore-file').setInputFiles({
      name: 'malformed-but-encrypted.ckvault',
      mimeType: 'application/json',
      buffer: Buffer.from(malformedBackup)
    });
    await restorePage.locator('#restore-dialog').waitFor({ state: 'visible' });
    await restorePage.locator('#restore-passphrase').fill(PASS_B);
    await restorePage.locator('#verify-backup').click();
    await restorePage.getByText('Backup entry 2 is invalid or unsupported. No vault data was changed.').waitFor();
    assert.equal(await restorePage.getByText('Current sample', { exact: true }).count(), 1,
      'malformed encrypted backup must not change the current vault');
    await restorePage.locator('#cancel-restore').click();

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

    await restorePage.evaluate(() => {
      window.__originalStorageSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key, value) {
        if (key === 'contextkey.encrypted.v1') throw new DOMException('Storage full', 'QuotaExceededError');
        return window.__originalStorageSetItem.call(this, key, value);
      };
    });
    await restorePage.locator('#confirm-restore').click();
    await restorePage.getByText(/low on browser storage|could not restore this backup/i).waitFor();
    assert.equal(await restorePage.getByText('Current sample', { exact: true }).count(), 1,
      'failed storage write must leave the current vault in memory');
    await restorePage.evaluate(() => { Storage.prototype.setItem = window.__originalStorageSetItem; });
    await restorePage.locator('#confirm-restore').click();
    await restorePage.locator('#gate').waitFor({ state: 'visible' });
    await restorePage.locator('#unlock-pass').fill(PASS_B);
    await restorePage.locator('#unlock-vault').click();
    await restorePage.locator('#app').waitFor({ state: 'visible' });
    await navigate(restorePage, 'library');
    assert.equal(await restorePage.getByText('Restored sample', { exact: true }).count(), 1);
    assert.equal(await restorePage.getByText('Current sample', { exact: true }).count(), 0);
    await restoreContext.close();

    const restoreRaceContext = await browser.newContext(mobile);
    const restoreRacePage = await restoreRaceContext.newPage();
    await createVault(restoreRacePage, PASS_A);
    await restoreRacePage.evaluate(() => {
      const originalDecrypt = decryptVaultEnvelope;
      let calls = 0;
      decryptVaultEnvelope = async (...args) => {
        calls += 1;
        if (calls === 1) await new Promise((resolve) => setTimeout(resolve, 500));
        return originalDecrypt(...args);
      };
    });
    await restoreRacePage.locator('#restore-file').setInputFiles({
      name: 'stale-verification.ckvault',
      mimeType: 'application/json',
      buffer: backupBuffer
    });
    await restoreRacePage.locator('#restore-dialog').waitFor({ state: 'visible' });
    await restoreRacePage.locator('#restore-passphrase').fill(PASS_B);
    await restoreRacePage.locator('#verify-backup').click();
    await restoreRacePage.waitForFunction(() => restoreInProgress === true);
    await restoreRacePage.locator('#cancel-restore').click();
    await restoreRacePage.locator('#restore-dialog').waitFor({ state: 'hidden' });
    await restoreRacePage.locator('#restore-file').setInputFiles({
      name: 'new-verification.ckvault',
      mimeType: 'application/json',
      buffer: backupBuffer
    });
    await restoreRacePage.locator('#restore-dialog').waitFor({ state: 'visible' });
    await restoreRacePage.locator('#restore-passphrase').fill('incorrect-passphrase');
    await restoreRacePage.locator('#verify-backup').click();
    await restoreRacePage.getByText('That passphrase did not unlock this backup.').waitFor();
    await restoreRacePage.waitForTimeout(650);
    assert.equal(await restoreRacePage.locator('#restore-verify-step').isVisible(), true,
      'a stale successful verification must not advance a newly opened restore dialog');
    assert.equal(await restoreRacePage.locator('#restore-confirm-step').isVisible(), false,
      'a stale verification must not enable confirmation for a different restore attempt');
    assert.equal(await restoreRacePage.locator('#restore-error').innerText(),
      'That passphrase did not unlock this backup.',
      'a stale completion must not overwrite the current restore error');
    assert.equal(await restoreRacePage.locator('#verify-backup').isEnabled(), true,
      'the current restore attempt must retain control of its verification button');
    await restoreRaceContext.close();

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
