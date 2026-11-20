import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');

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
  assert.match(app, /function lockVault\(\)\s*\{\s*clearSession\(\)/);
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
  assert.match(app, /await decryptVaultEnvelope\(pendingBackup, passphrase\)/);
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
  assert.match(sw, /contextkey-shell-v4/);
  assert.match(sw, /event\.request\.mode === 'navigate'/);
  const fetchHandler = sw.slice(sw.indexOf("self.addEventListener('fetch'"));
  assert.match(fetchHandler, /catch\(\(\) => caches\.match\('\.\/index\.html'\)\)/);
});

test('design system includes responsive layout, visible focus and reduced-motion support', () => {
  assert.match(css, /--canvas: #f2efe7/);
  assert.match(css, /--green: #205442/);
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
  assert.ok(contrastRatio('#65736a', surface) >= 4.5, 'input hints must meet 4.5:1 on white surfaces');
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
  assert.match(app, /more than the supported 500 entries/);
});


test('document head contains no literal escaped newlines before metadata tags', () => {
  assert.equal(html.includes(String.fromCharCode(92, 110) + '  <meta'), false);
});
