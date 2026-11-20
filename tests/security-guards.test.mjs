import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');

test('vault envelopes require the supported KDF and cipher metadata', () => {
  assert.match(app, /envelope\.kdf !== 'PBKDF2-SHA256'/);
  assert.match(app, /envelope\.iterations !== PBKDF2_ITERATIONS/);
  assert.match(app, /envelope\.cipher !== 'AES-256-GCM'/);
});

test('vault envelopes validate salt, IV, and ciphertext lengths', () => {
  assert.match(app, /salt\.length !== 16/);
  assert.match(app, /iv\.length !== 12/);
  assert.match(app, /data\.length < 16/);
  assert.match(app, /data\.length > 5 \* 1024 \* 1024/);
});

test('locking clears decrypted DOM content and sensitive form values', () => {
  const start = app.indexOf('function lockVault()');
  const end = app.indexOf('\nfunction setView(', start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const lock = app.slice(start, end);
  assert.match(lock, /context-list/);
  assert.match(lock, /pack-items/);
  assert.match(lock, /pack-preview/);
  assert.match(lock, /item-content/);
  assert.match(lock, /item-name/);
  assert.match(lock, /item-form.*reset/s);
});

test('backup decryption completes before the stored vault is replaced', () => {
  const start = app.indexOf('async function restoreBackup(file)');
  const end = app.indexOf('\nasync function wipeVault()', start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const restore = app.slice(start, end);
  const verify = restore.indexOf('await decryptVaultEnvelope(backup, backupPassphrase)');
  const replace = restore.indexOf('localStorage.setItem(STORAGE_KEY, JSON.stringify(backup))');
  assert.notEqual(verify, -1);
  assert.notEqual(replace, -1);
  assert.ok(verify < replace, 'backup must decrypt before replacing the current vault');
  assert.match(restore, /window\.confirm/);
});

test('service worker cache version is bumped for the hardened shell', () => {
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  assert.match(sw, /contextkey-shell-v2/);
});
