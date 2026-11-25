# ContextKey — Local-First AI Context Wallet

**Version:** 0.3 (experimental MVP)  

**Your context. Your choice.** Keep useful background in an encrypted, on-device vault. Choose exactly what goes into each task-specific context pack.

<https://ansh71845.github.io/contextkey/>

**Try the live app:** open the link above in Chrome. No account or AI API key is required. Create a vault, add a small sample entry, and build a context pack. On Android, use Chrome's **Add to Home screen** option if you want an app-like shortcut.

> **Experimental MVP:** ContextKey is an early prototype, not a professionally audited security product. Test it with non-sensitive sample information only.

## What ContextKey does

ContextKey keeps useful personal context in one place and lets you choose which entries to include in a context pack. It is not another chatbot and it does not connect to any AI provider.

## What works in this MVP

- Create a vault protected with a passphrase of at least 12 characters.
- Encrypt saved context in the browser using PBKDF2-SHA-256 and AES-256-GCM.
- Save, edit, search, filter, and delete context entries. Filter by privacy state or category, with a live character count while writing.
- Keep each new entry private by default.
- Select only approved entries for a task-specific context pack. Packs start empty; nothing is included until you select it.
- Optionally add purpose-based suggestions, then review and clear selections before exporting.
- Preview the exact Markdown and character count before copying or downloading it.
- Export a versioned ContextKey JSON file (v1) for manual portability. Share-ready entries are included by default; private entries require an explicit opt-in.
- Preview JSON imports, select individual entries, detect duplicates and ID conflicts, and add imported entries without overwriting existing ones. Imported entries are encrypted when saved to the vault.
- Import Markdown (`.md`/`.markdown`) and plain-text (`.txt`) notes locally. Review and edit extracted sections, select entries, and import them as private by default.
- Verify an encrypted `.ckvault` backup before explicitly replacing the current vault.
- Install as a PWA and use the app shell offline after the first successful visit.
- No sign-in, server database, analytics, external JavaScript libraries, or AI API key.

## Run it on Android

The encryption API requires a secure browser origin. The simplest free route is GitHub Pages:

1. Open the [live ContextKey app](https://ansh71845.github.io/contextkey/) in Chrome on Android.
2. Create your vault using a strong passphrase that you can remember. There is no password-reset service.
3. Add a few non-sensitive sample entries. Keep private entries marked private.
4. In **Context pack**, select only the approved entries needed for that task. The pack starts empty; **Add suggested** is optional and does not export anything.
5. Review the exact Markdown preview and character count before copying or downloading it.
6. Optionally choose **Add to Home screen** from Chrome's menu.

To inspect the source, browse this repository. Do not put your personal context, exported packs, or `.ckvault` backups in the repository.

## Where your data lives

GitHub Pages hosts the app files, not your vault. The app does not send your entries to GitHub or to a ContextKey server. The encrypted vault is saved in that browser's local storage. GitHub Pages may still log visitor IP addresses and standard web-request metadata for its own security and operations; 'local-first' means your vault content is not uploaded by this app, not that the hosting visit is invisible.

## Portable context format v1

The **Export JSON** action creates a plaintext `contextkey-context` document with `schemaVersion: 1`, an export timestamp, and structured entries (stable ID, category, title, content, shareability, creation time, and update time). Private entries are excluded unless **Include private entries** is explicitly checked. The file is not encrypted; treat it like a context pack and review it before moving or sharing it.

Use **Import JSON** to validate a file and preview new entries, exact duplicates, content duplicates, and ID conflicts. **Import notes** accepts Markdown and plain-text files up to 100 KiB. Markdown headings (`#`, `##`, `###`) become proposed entry titles; the text beneath each heading becomes its content. Review and edit each proposed entry before importing. Notes imports are private by default and are encrypted when saved. Select the entries to add. Existing entries are never replaced. Imported records are encrypted when saved into the destination vault. The importer currently accepts up to 500 entries and 2 MiB per file. This is a ContextKey-to-ContextKey manual interchange format, not a universal AI-provider integration or an external standard yet.

## Backup and device changes

Use **Encrypted backup** regularly. The `.ckvault` file is encrypted and can be restored from **Restore backup** on another browser/device. ContextKey verifies the backup passphrase before it offers to replace the current vault. You must still know the original passphrase. There is no password-reset service because there is no server holding your key.

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
