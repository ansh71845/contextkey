import { readFileSync, existsSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const workflow = readFileSync(new URL('../.github/workflows/pages.yml', import.meta.url), 'utf8');

function relativeLuminance(hex) {
  const channels = hex.replace('#', '').match(/.{2}/g).map((part) => parseInt(part, 16) / 255);
  const linear = channels.map((channel) => channel <= 0.04045
    ? channel / 12.92
    : ((channel + 0.055) / 1.055) ** 2.4);
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}

function contrastRatio(foreground, background) {
  const values = [relativeLuminance(foreground), relativeLuminance(background)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

test('secondary GitHub Pages origin warns about separate browser vault storage', () => {
  assert.match(html, /id="origin-notice"/);
  assert.match(html, /separate browser storage from the primary Vercel app/);
  assert.match(html, /export an encrypted backup before switching sites/);
  assert.match(html, /https:\/\/contextkey-security-preview\.vercel\.app\//);
  assert.match(app, /window\.location\.hostname !== 'ansh71845\.github\.io'/);
  assert.match(css, /\.origin-notice\s*\{/);
});

test('vault envelopes use the supported PBKDF2 and AES-GCM format', () => {
  assert.match(app, /PBKDF2_ITERATIONS = 310000/);
  assert.match(app, /PBKDF2-SHA256/);
  assert.match(app, /AES-256-GCM/);
  assert.match(app, /envelope\.iterations !== PBKDF2_ITERATIONS/);
});

test('vault envelopes validate salt, IV, and ciphertext lengths before decrypting', () => {
  assert.match(app, /salt\.length !== 16/);
  assert.match(app, /iv\.length !== 12/);
  assert.match(app, /data\.length < 16/);
  assert.match(app, /data\.length > 5 \* 1024 \* 1024/);
});

test('locking removes decrypted DOM content and clears local editing state', () => {
  const start = app.indexOf('function clearSession()');
  const end = app.indexOf('\nfunction lockVault()', start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const clear = app.slice(start, end);
  for (const id of ['context-list', 'pack-items', 'pack-preview', 'item-name', 'item-content', 'search-items']) {
    assert.ok(clear.includes(id), `lock cleanup must clear ${id}`);
  }
  assert.match(clear, /item-form.*reset/s);
  assert.match(clear, /closePortableImport\(\)/);
  assert.match(clear, /closeMarkdownImport\(\)/);
  assert.match(app, /let portableImportGeneration = 0/);
  assert.match(app, /let markdownImportGeneration = 0/);
  assert.match(app, /fileGeneration !== portableImportGeneration \|\| importSession !== sessionGeneration \|\| !vault/);
  assert.match(app, /fileGeneration !== markdownImportGeneration \|\| importSession !== sessionGeneration \|\| !vault/);

  assert.match(app, /function lockVault\(\)\s*\{\s*if \(isSaving\)/);
  assert.match(app, /lockRequested = true/);
  assert.match(app, /if \(lockRequested\) lockVault\(\)/);
});

test('saves encrypt the proposed vault before committing it to in-memory state', () => {
  assert.match(app, /async function persistVault\(nextVault = vault/);
  assert.match(app, /const encrypted = await encryptObject\(nextVault, key, salt\)/);
  assert.match(app, /localStorage\.setItem\(STORAGE_KEY, JSON\.stringify\(encrypted\)\)/);
  const saveStart = app.indexOf('async function handleItemSubmit');
  const saveEnd = app.indexOf('\nfunction editItem', saveStart);
  const save = app.slice(saveStart, saveEnd);
  assert.ok(save.indexOf('await persistVault(nextVault)') < save.indexOf('vault = nextVault'));
});

test('restore requires successful decryption and explicit replacement confirmation', () => {
  assert.match(app, /await decryptVaultEnvelope\(backupToVerify, passphrase, validateBackupVault\)/);
  const verifyStart = app.indexOf('async function verifyBackup');
  const verifyEnd = app.indexOf('\nfunction confirmRestore', verifyStart);
  const verify = app.slice(verifyStart, verifyEnd);
  assert.match(verify, /restoreVerified = true/);
  const restoreStart = app.indexOf('function confirmRestore');
  const restoreEnd = app.indexOf('\nasync function wipeVault', restoreStart);
  const restore = app.slice(restoreStart, restoreEnd);
  assert.ok(restore.indexOf('!restoreVerified') < restore.indexOf('localStorage.setItem'));
  assert.doesNotMatch(app, /window\.prompt\(/);
});

test('context packs begin empty and include only explicitly selected share-ready entries', () => {
  const builderStart = app.indexOf('function renderPackBuilder');
  const builderEnd = app.indexOf('\nfunction updatePackPreview', builderStart);
  const builder = app.slice(builderStart, builderEnd);
  assert.match(builder, /selectedIds = new Set\(\)/);
  const packStart = app.indexOf('function makePack');
  const packEnd = app.indexOf('\nfunction renderPackBuilder', packStart);
  const pack = app.slice(packStart, packEnd);
  assert.match(pack, /selectedIds\.has\(item\.id\) && item\.shareable/);
});

test('save-ready selection is a deliberate action and has a clear-selection control', () => {
  assert.match(html, /id="select-suggested"/);
  assert.match(html, /id="clear-selection"/);
  assert.match(app, /addEventListener\('click', selectSuggestedEntries\)/);
  assert.match(app, /addEventListener\('click', clearPackSelection\)/);
});

test('backup size is rejected before reading and invalid envelopes are checked before showing restore', () => {
  const start = app.indexOf('async function restoreBackup(file)');
  const end = app.indexOf('\nasync function verifyBackup', start);
  const restore = app.slice(start, end);
  assert.ok(restore.indexOf('file.size > 7 * 1024 * 1024') < restore.indexOf('await file.text()'));
  assert.ok(restore.indexOf('decodeVaultEnvelope(backup)') < restore.indexOf('showModal()'));
});

test('storage errors do not commit an unsaved entry to the in-memory vault', () => {
  const start = app.indexOf('async function handleItemSubmit');
  const end = app.indexOf('\nfunction editItem', start);
  const save = app.slice(start, end);
  assert.ok(save.indexOf('await persistVault(nextVault)') < save.indexOf('vault = nextVault'));
  assert.match(save, /catch \(error\)/);
  assert.match(save, /Could not save this entry/);
});

test('service worker cache is versioned and offline HTML fallback is navigation-only', () => {
  assert.match(sw, /contextkey-shell-v11/);
  assert.match(sw, /event\.request\.mode === 'navigate'/);
  const fetchHandler = sw.slice(sw.indexOf("self.addEventListener('fetch'"));
  assert.match(fetchHandler, /if \(event\.request\.mode === 'navigate'\) return caches\.match\('\.\/index\.html'\)/);
});

test('design system includes responsive layout, visible focus and reduced-motion support', () => {
  assert.match(css, /--canvas: #f2efe7/);
  assert.match(css, /--green: #1f5846/);
  assert.match(css, /--sea-glass: #89aa9b/);
  assert.doesNotMatch(css, /seal-drift|radial-gradient/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /@media \(max-width: 700px\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});

test('app remains self-hosted without external font or script dependencies', () => {
  assert.match(html, /script-src 'self'/);
  assert.match(html, /font-src 'self'/);
  assert.doesNotMatch(html, /https:\/\/(fonts\.googleapis|fonts\.gstatic|cdn\.)/i);
});

test('secondary typography and input hints meet WCAG AA contrast on primary surfaces', () => {
  const token = (name) => {
    const matches = [...css.matchAll(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`, 'g'))];
    assert.ok(matches.length, `missing ${name} colour token`);
    return matches[matches.length - 1][1];
  };
  const canvas = token('canvas');
  const surface = token('surface');
  const soft = token('soft');
  const muted = token('muted');
  assert.ok(contrastRatio(soft, canvas) >= 4.5, 'secondary labels must meet 4.5:1 on the canvas');
  assert.ok(contrastRatio(soft, surface) >= 4.5, 'secondary labels must meet 4.5:1 on white surfaces');
  assert.ok(contrastRatio(muted, canvas) >= 4.5, 'body copy must meet 4.5:1 on the canvas');
  assert.ok(contrastRatio(muted, surface) >= 4.5, 'input hints must meet 4.5:1 on white surfaces');
  assert.match(css, /::placeholder[^}]*color: var\(--muted\)/s);
});

test('library filters distinguish private, share-ready, and category entries', () => {
  assert.match(html, /id="library-filter"/);
  assert.match(app, /const matchesFilter = filter === 'all'/);
  assert.match(app, /filter === 'private' && !item\.shareable/);
  assert.match(app, /filter === 'shareable' && item\.shareable/);
});

test('entry editor exposes a live character count and imported vaults have a bounded entry count', () => {
  assert.match(html, /id="content-count"/);
  assert.match(app, /function updateContentCount\(\)/);
  assert.match(app, /value\.items\.length > 500/);
  assert.match(app, /value\.items\.length > 500/);
});


test('document head contains no literal escaped newlines before metadata tags', () => {
  assert.equal(html.includes(String.fromCharCode(92, 110) + '  <meta'), false);
});

test('portable context format v1 is versioned and excludes private entries unless explicitly included', () => {
  assert.match(app, /PORTABLE_FORMAT = 'contextkey-context'/);
  assert.match(app, /schemaVersion: PORTABLE_SCHEMA_VERSION/);
  assert.match(app, /filter\(\(item\) => includePrivate \|\| item\.shareable\)/);
  assert.match(html, /id="portable-include-private"/);
  assert.match(html, /JSON exports are not encrypted/);
});

test('portable imports validate schema, size bounds, categories, timestamps, and unique IDs', () => {
  assert.match(app, /PORTABLE_MAX_BYTES = 2 \* 1024 \* 1024/);
  assert.match(app, /PORTABLE_MAX_ENTRIES = 500/);
  assert.match(app, /SECTION_ORDER\.includes\(item\.section\)/);
  assert.match(app, /seenIds\.has\(item\.id\)/);
  assert.match(app, /item\.content\.length > 1400/);
});

test('portable import previews duplicates and ID conflicts without overwriting existing entries', () => {
  assert.match(app, /exactDuplicates/);
  assert.match(app, /contentDuplicates/);
  assert.match(app, /idConflicts/);
  assert.match(app, /existingById/);
  assert.match(app, /pendingPortableItems\.filter/);
  assert.match(html, /Existing entries are never replaced/);
  assert.match(html, /id="portable-import-confirm"/);
});

test('portable import requires explicit item selection and confirmation', () => {
  assert.match(html, /id="portable-select-all"/);
  assert.match(html, /id="portable-select-none"/);
  assert.match(app, /querySelectorAll\('\[data-import-id\]:checked'\)/);
  assert.match(html, /Import selected/);
});


test('backup loading rejects malformed and oversized entries instead of silently dropping or repairing them', () => {
  const start = app.indexOf('function validateBackupVault(value)');
  const end = app.indexOf('\nasync function decryptVaultEnvelope', start);
  const loader = app.slice(start, end);
  assert.match(loader, /value\.version !== 1/);
  assert.match(loader, /value\.items\.map/);
  assert.doesNotMatch(loader, /value\.items\.filter/);
  assert.match(loader, /No vault data was changed/);
  assert.match(loader, /item\.title\.length > 70/);
  assert.match(loader, /item\.content\.length > 1400/);
  assert.match(loader, /ids\.has\(item\.id\)/);
  assert.doesNotMatch(loader, /item\.(?:title|content)\.slice/);
});

test('locking waits for pending encrypted saves and then invalidates the decrypted session', () => {
  assert.match(app, /let sessionGeneration = 0/);
  assert.match(app, /sessionGeneration \+= 1/);
  assert.match(app, /saveGeneration !== sessionGeneration/);
  assert.match(app, /function lockVault\(\)\s*\{\s*if \(isSaving\)/);
  assert.match(app, /lockRequested = true/);
  assert.match(app, /if \(lockRequested\) lockVault\(\)/);
});

test('Markdown import preserves preamble text and does not split headings inside fenced code', () => {
  const start = app.indexOf('function parseMarkdownMemory(text, filename)');
  const end = app.indexOf('\nfunction closeMarkdownImport()', start);
  const parser = app.slice(start, end);
  assert.match(parser, /const preamble = \[\]/);
  assert.match(parser, /const fenceLine = line\.match/);
  assert.match(parser, /title: 'Introduction'/);
  assert.match(parser, /current\.lines\.push\(line\)/);
});

test('Markdown and text imports are local, bounded, editable, selectable, and private by default', () => {
  assert.match(html, /id="markdown-import-file"/);
  assert.match(html, /id="markdown-import-dialog"/);
  assert.match(html, /id="markdown-import-confirm"/);
  assert.match(app, /function parseMarkdownMemory\(/);
  assert.match(app, /file\.size > 100 \* 1024/);
  assert.match(app, /shareable: false/);
  assert.match(app, /data-markdown-title/);
  assert.match(app, /data-markdown-content/);
  assert.match(app, /await persistVault\(nextVault\)/);
  assert.match(sw, /contextkey-shell-v11/);
});


test('release foundation includes mobile navigation, legal links, favicon metadata, and overflow guard', () => {
 assert.match(html,/id="mobile-menu-toggle"/); assert.match(html,/id="workspace-navigation"/);
 assert.match(html,/href="\.\/privacy\.html"/); assert.match(html,/href="\.\/terms\.html"/);
 assert.match(html,/rel="apple-touch-icon"/); assert.match(app,/function closeMobileMenu\(/);
 assert.match(app,/event\.key === 'Escape'/); assert.match(css,/overflow-x:hidden/);
 assert.match(workflow,/privacy\.html terms\.html 404\.html legal\.css legal\.js/);
 assert.match(sw,/contextkey-shell-v11/);
});


test('public page copy avoids em dashes and fabricated endorsement language', () => {
  for (const page of ['index.html', 'privacy.html', 'terms.html', '404.html']) {
    const content = readFileSync(new URL('../' + page, import.meta.url), 'utf8');
    assert.doesNotMatch(content, /—/);
    assert.doesNotMatch(content, /made with ai|made with al|customer reviews|trusted by \d+/i);
  }
});


test('all local links and assets on public HTML pages resolve', () => {
  const pages = ['index.html', 'privacy.html', 'terms.html', '404.html'];
  for (const page of pages) {
    const source = readFileSync(new URL('../' + page, import.meta.url), 'utf8');
    const ids = new Set([...source.matchAll(/id="([^"]+)"/g)].map((match) => match[1]));
    for (const match of source.matchAll(/(?:href|src)="([^"]+)"/g)) {
      const target = match[1];
      if (target.includes(':') || target.startsWith('//')) continue;
      if (target.startsWith('#')) {
        assert.ok(ids.has(target.slice(1)), page + ' has a broken in-page link: ' + target);
        continue;
      }
      const resolved = new URL(target, new URL('../' + page, import.meta.url));
      const fileUrl = resolved.pathname.endsWith('/') ? new URL('index.html', resolved) : resolved;
      assert.ok(existsSync(fileUrl), page + ' has a broken local reference: ' + target);
    }
  }
});


test('encrypted backup decoding rejects non-canonical base64 and strict vault validation rejects silent repair', () => {
  assert.ok(app.includes('bytesToBase64(salt) !== envelope.salt'));
  assert.ok(app.includes('bytesToBase64(iv) !== envelope.iv'));
  assert.ok(app.includes('bytesToBase64(data) !== envelope.data'));
  assert.ok(app.includes('function validateBackupVault(value)'));
  assert.ok(app.includes('ids.has(item.id)'));
  assert.ok(app.includes('!SECTION_ORDER.includes(item.section)'));
  assert.ok(app.includes("typeof item.shareable !== 'boolean'"));
});

test('normal vault unlock keeps legacy normalization separate from strict backup restore validation', () => {
  assert.ok(app.includes('function normalizeStoredVault(value)'));
  const unlockStart = app.indexOf('async function unlockVault');
  const unlockEnd = app.indexOf('function clearSession', unlockStart);
  const unlock = app.slice(unlockStart, unlockEnd);
  assert.match(unlock, /decryptVaultEnvelope\(stored, pass, normalizeStoredVault\)/);
  const restoreStart = app.indexOf('async function verifyBackup');
  const restoreEnd = app.indexOf('function confirmRestore', restoreStart);
  const restore = app.slice(restoreStart, restoreEnd);
  assert.match(restore, /decryptVaultEnvelope\(backupToVerify, passphrase, validateBackupVault\)/);
});

test('stale asynchronous backup verification cannot mutate a newer restore attempt', () => {
  assert.match(app, /let restoreGeneration = 0/);
  assert.match(app, /function clearRestoreState\(\)\s*\{\s*restoreGeneration \+= 1/);
  const start = app.indexOf('async function verifyBackup');
  const end = app.indexOf('\nfunction confirmRestore', start);
  const verify = app.slice(start, end);
  assert.match(verify, /const verificationGeneration = restoreGeneration/);
  assert.match(verify, /const backupToVerify = pendingBackup/);
  assert.match(verify, /verificationGeneration !== restoreGeneration \|\| pendingBackup !== backupToVerify/);
  assert.match(verify, /if \(verificationGeneration === restoreGeneration\)/);
  assert.match(app, /if \(fileGeneration !== restoreGeneration\) return/);
  assert.match(app, /addEventListener\('close', \(\) => \{\s*if \(pendingBackup \|\| restoreVerified \|\| restoreInProgress\) clearRestoreState\(\)/);
});

test('restore binds confirmation to the exact verified backup snapshot', () => {
  assert.ok(app.includes('restoreVerifiedSnapshot = JSON.stringify(backupToVerify)'));
  assert.ok(app.includes('JSON.stringify(pendingBackup) !== restoreVerifiedSnapshot'));
  const start = app.indexOf('function confirmRestore');
  const end = app.indexOf('async function wipeVault', start);
  const restore = app.slice(start, end);
  assert.ok(restore.indexOf('decodeVaultEnvelope(pendingBackup)') < restore.indexOf('localStorage.setItem'));
  assert.ok(restore.includes('localStorage.setItem(STORAGE_KEY, restoreVerifiedSnapshot)'));
});
