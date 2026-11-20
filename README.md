# ContextKey — AI Context Wallet

**Version:** 0.1 (experimental MVP)  
**Product direction:** a local-first, user-controlled context vault for AI assistants.

ContextKey keeps useful personal context in one place and lets the user choose exactly which entries to include in a context pack. It is not another chatbot and it does not connect to any AI provider.

## What works in this MVP

- Create a vault protected with a passphrase of at least 12 characters.
- Encrypt saved context in the browser using PBKDF2-SHA-256 and AES-256-GCM.
- Save, edit, search, and delete context entries.
- Keep each new entry private by default.
- Select only approved entries for a task-specific context pack.
- Preview the exact Markdown before copying or downloading it.
- Download and restore an encrypted `.ckvault` backup.
- Install as a PWA and use the app shell offline after the first successful visit.
- No sign-in, server database, analytics, external JavaScript libraries, or AI API key.

## Run it on Android

The encryption API requires a secure browser origin. The simplest free route is GitHub Pages:

1. Create a **public** GitHub repository for the app source. Do not put your personal context, exported packs, or `.ckvault` backups in the repository.
2. Upload the contents of this project folder to the repository root: `index.html`, `styles.css`, `app.js`, `manifest.webmanifest`, `icon.svg`, `icon-192.png`, `icon-512.png`, and `sw.js`.
3. In the repository, open **Settings → Pages** and set the build/deployment source to **GitHub Actions**. The included workflow deploys only the app files whenever changes are pushed to `main`.
4. Open the Pages URL in Chrome on Android. Create your vault and choose **Add to Home screen** from Chrome's menu.
5. Open the installed app, enter context, and create a pack from **Build a context pack**.

GitHub Pages hosts the app files, not your vault. The app does not send your entries to GitHub or to a ContextKey server. The encrypted vault is saved in that browser's local storage. GitHub Pages may still log visitor IP addresses and standard web-request metadata for its own security and operations; 'local-first' means your vault content is not uploaded by this app, not that the hosting visit is invisible.

## Backup and device changes

Use **Encrypted backup** regularly. The `.ckvault` file is encrypted and can be restored from **Restore backup** on another browser/device. You must still know the original passphrase. There is no password-reset service because there is no server holding your key.

## Important privacy limits

- The app encrypts its saved vault at rest in browser storage. This is not a substitute for a secure, updated device and a strong passphrase.
- A context pack copied to the clipboard or downloaded as `.md` is plaintext. Review it before sharing and delete exported copies when no longer needed.
- Do not store passwords, recovery codes, private keys, bank details, government ID numbers, medical records, or other highly sensitive information.
- If you forget the passphrase and have no working encrypted backup, the vault cannot be recovered.
- Clearing Chrome site data can remove the on-device vault. Keep encrypted backups.
- This version has no automatic sync. Moving data between devices is a manual encrypted-backup restore.
- ContextKey does **not** control, audit, or guarantee the behaviour of ChatGPT, Claude, Gemini, or other providers. It only prepares the context you choose to share.

## Development and checks

The runtime app is plain HTML, CSS, and JavaScript. It has no production build step or runtime package dependencies. Automated checks run in GitHub Actions with Node.js 22 and Playwright.

For local testing, serve this folder at `http://127.0.0.1:4173` (or another secure origin). With Node.js 22 installed, run `npm install --no-save --no-package-lock playwright@1.56.1`, then `npx playwright install chromium`. Start a static server in the repository root on port 4173, then run:

```sh
node --check app.js
node --test tests/security-guards.test.mjs
node tests/browser-security.spec.cjs
```

Opening `index.html` as a `file://` URL may disable browser encryption APIs and service workers. The Pages workflow stages only the public runtime assets; research documents and test files are not deployed.

## License

No open-source license is currently included. The repository is publicly viewable, but you do not have permission to reuse, modify, or redistribute its code unless the owner grants permission. A license will be added only after the provenance and ownership of all included code and assets are confirmed.

## Product principle

**Share the minimum useful context for the current task.** An entry being saved in the vault does not make it shareable. Sharing is an explicit, separate choice.

See `EXECUTIVE_SUMMARY.md` for the decision brief, `MARKET_RESEARCH.md` for the market assessment, and `PRODUCT_PLAN.md` for the roadmap and validation gates. These are research and planning documents, not proof of product-market fit.
