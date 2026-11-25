import { readFileSync, existsSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const app = read('app.js');
const html = read('index.html');
const css = read('styles.css');
const sw = read('sw.js');
const gitignore = read('.gitignore');
const pages = read('.github/workflows/pages.yml');
const quality = read('.github/workflows/quality.yml');
const security = read('.github/workflows/security-checks.yml');

test('public runtime contains no common committed credential formats', () => {
  const publicFiles = [
    'index.html', 'app.js', 'styles.css', 'manifest.webmanifest', 'sw.js',
    'privacy.html', 'terms.html', '404.html', 'legal.css', 'legal.js', 'icon.svg'
  ];
  const patterns = [
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i,
    /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{30,})\b/,
    /\bAIza[0-9A-Za-z_-]{30,}\b/,
    /\bAKIA[0-9A-Z]{16}\b/,
    /\b(?:api[_-]?key|client[_-]?secret|access[_-]?token|refresh[_-]?token)\s*[:=]\s*["'][^"']{12,}["']/i
  ];
  for (const path of publicFiles) {
    const source = read(path);
    for (const pattern of patterns) {
      assert.doesNotMatch(source, pattern, path + ' must not contain committed credentials');
    }
  }
});

test('app runtime does not send vault content to external services', () => {
  assert.doesNotMatch(app, /\b(?:XMLHttpRequest|WebSocket|sendBeacon|axios|fetch)\b/);
  assert.match(html, /connect-src 'self'/);
  assert.match(html, /script-src 'self'/);
  assert.match(html, /style-src 'self'/);
  assert.match(sw, /if \(url\.origin !== self\.location\.origin\) return/);
  assert.match(app, /const STORAGE_KEY = 'contextkey\.encrypted\.v1'/);
  assert.doesNotMatch(app, /localStorage\.clear\(/);
});

test('Pages publishes only the explicit public runtime allowlist', () => {
  assert.match(pages, /cp index\.html styles\.css app\.js manifest\.webmanifest sw\.js icon\.svg icon-192\.png icon-512\.png privacy\.html terms\.html 404\.html legal\.css legal\.js _site\//);
  assert.match(pages, /test ! -e _site\/README\.md/);
  assert.match(pages, /test ! -e _site\/tests/);
  assert.match(pages, /test ! -e _site\/SECURITY\.md/);
  assert.match(pages, /test ! -e _site\/PRODUCT_PLAN\.md/);
});

test('Pages upload and deployment are isolated to separate jobs with an artifact-visibility gate', () => {
  assert.match(pages, /jobs:\s+build:[\s\S]*?upload-pages-artifact/);
  assert.match(pages, /deploy:\s*[\\r\\n]+\\s*needs: build/);
  assert.match(pages, /Wait for uploaded Pages artifact to become visible/);
  assert.match(pages, /actions\/runs\/\$\{GITHUB_RUN_ID\}\/artifacts/);
  assert.match(pages, /select\(.name == "github-pages" and .expired == false\)/);
  assert.match(pages, /sleep 2/);
  assert.match(pages, /actions: read/);
  assert.match(pages, /pages: write/);
  assert.match(pages, /id-token: write/);
  assert.doesNotMatch(pages, /uses: actions\/deploy-pages[^\n]*\n\s*uses: actions\/upload-pages-artifact/);
});

test('Actions use immutable pins, least privilege, and a fixed supported runner', () => {
  for (const workflow of [pages, quality, security]) {
    assert.match(workflow, /runs-on: ubuntu-24\.04/);
    assert.match(workflow, /actions\/checkout@[0-9a-f]{40}/);
    assert.match(workflow, /actions\/setup-node@[0-9a-f]{40}/);
    assert.match(workflow, /persist-credentials: false/);
    assert.match(workflow, /package-manager-cache: false/);
    assert.doesNotMatch(workflow, /runs-on: ubuntu-latest/);
  }
  assert.match(pages, /actions\/configure-pages@[0-9a-f]{40}/);
  assert.match(pages, /actions\/upload-pages-artifact@[0-9a-f]{40}/);
  assert.match(pages, /actions\/deploy-pages@[0-9a-f]{40}/);
  assert.match(pages, /actions: read/);
  assert.match(pages, /pages: write/);
  assert.match(pages, /id-token: write/);
  assert.match(quality, /contents: read/);
  assert.match(security, /contents: read/);
  assert.match(pages, /playwright@1\.65\.1/);
  assert.match(security, /playwright@1\.65\.1/);
});

test('git ignore rules cover local vaults, exports, environment files, and key material', () => {
  for (const rule of ['*.ckvault', '*.context-pack.md', '.env', '.env.*', '!.env.example', '.npmrc', '.netrc', '*.pem', '*.key', '*.p12', '*.pfx', 'credentials.json', 'secrets.*']) {
    assert.ok(gitignore.includes(rule), 'missing ignore rule: ' + rule);
  }
  for (const path of ['.env', 'credentials.json', 'secrets.json']) {
    assert.equal(existsSync(new URL('../' + path, import.meta.url)), false, path + ' must not be present in the repository checkout');
  }
});

test('selected visual system is accessible and avoids decorative motion', () => {
  assert.match(css, /--canvas: #f2efe7/);
  assert.match(css, /--green: #1f5846/);
  assert.match(css, /--copper: #925331/);
  assert.match(css, /--sea-glass: #89aa9b/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.doesNotMatch(css, /seal-drift|radial-gradient/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /overflow-x:hidden/);
});
