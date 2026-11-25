import { readFileSync, existsSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');

test('service worker caches each successful navigation under its own request URL', () => {
  const sw = read('sw.js');
  assert.match(sw, /cache\.put\(event\.request, copy\)/);
  assert.doesNotMatch(sw, /cache\.put\('\.\/index\.html', copy\)/);
  assert.match(sw, /caches\.match\(event\.request\).*caches\.match\('\.\/index\.html'\)/s);
});

test('service worker shell includes every public page and required local asset', () => {
  const sw = read('sw.js');
  for (const asset of ['index.html', 'privacy.html', 'terms.html', '404.html', 'legal.css', 'legal.js', 'manifest.webmanifest', 'icon.svg']) {
    assert.ok(sw.includes('./' + asset), 'offline shell must include ' + asset);
    assert.ok(existsSync(new URL('../' + asset, import.meta.url)), 'missing public asset ' + asset);
  }
});

test('PWA install name follows the restrained product naming rules', () => {
  const manifest = JSON.parse(read('manifest.webmanifest'));
  assert.equal(manifest.name, 'ContextKey: Local Context Wallet');
  assert.doesNotMatch(manifest.name, /—|–/);
  assert.equal(manifest.short_name, 'ContextKey');
  assert.ok(manifest.icons.some((icon) => icon.src === 'icon-192.png'));
  assert.ok(manifest.icons.some((icon) => icon.src === 'icon-512.png'));
});

test('Pages deployment stages the complete public application and legal pages', () => {
  const workflow = read('.github/workflows/pages.yml');
  for (const asset of ['index.html', 'styles.css', 'app.js', 'manifest.webmanifest', 'sw.js', 'icon.svg', 'icon-192.png', 'icon-512.png', 'privacy.html', 'terms.html', '404.html', 'legal.css', 'legal.js']) {
    assert.ok(workflow.includes(asset), 'Pages bundle must stage ' + asset);
  }
});

test('online requests revalidate assets before using the offline cache', () => {
  const sw = read('sw.js');
  const fetchHandler = sw.slice(sw.indexOf("self.addEventListener('fetch'"));
  assert.ok(fetchHandler.indexOf('fetch(event.request)') < fetchHandler.indexOf('caches.match(event.request)'));
  assert.match(fetchHandler, /\.catch\(\(\) => caches\.match\(event\.request\)/);
  assert.match(sw, /contextkey-shell-v10/);
});

test('app explicitly checks for service worker updates and refreshes after controller changes', () => {
  const app = read('app.js');
  assert.match(app, /updateViaCache: 'none'/);
  assert.match(app, /registration\.update\(\)/);
  assert.match(app, /serviceWorker\.addEventListener\('controllerchange'/);
});

test('Vercel does not retain stale app or service worker responses', () => {
  const config = JSON.parse(read('vercel.json'));
  const swHeaders = config.headers.find((entry) => entry.source === '/sw.js')?.headers || [];
  const appHeaders = config.headers.find((entry) => entry.source === '/(.*)')?.headers || [];
  assert.ok(swHeaders.some((header) => header.key === 'Cache-Control' && /no-store/.test(header.value)));
  assert.ok(swHeaders.some((header) => header.key === 'Service-Worker-Allowed' && header.value === '/'));
  assert.ok(appHeaders.some((header) => header.key === 'Cache-Control' && /must-revalidate/.test(header.value)));
});
