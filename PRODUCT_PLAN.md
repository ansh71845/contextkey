# ContextKey product plan

## Product definition

ContextKey is a local-first AI Context Wallet. It lets a person curate useful context in an encrypted browser vault, keep entries private by default, and prepare narrow, task-specific context packs for manual sharing.

**Product promise:** Your context stays under your control. You choose what to store, what to share, and when.

ContextKey is not a chatbot, an automatic conversation collector, or a universal one-click connector to every AI provider.

## Current build: version 0.3 experimental MVP

### Implemented

- [x] Passphrase-protected local vault using PBKDF2-SHA-256 and AES-256-GCM.
- [x] Context entries with categories, editing, searching, filtering, and deletion.
- [x] Private-by-default entries and a separate share-ready permission.
- [x] Empty-by-default task-specific context pack builder.
- [x] Exact Markdown preview, character count, copy, and download.
- [x] Encrypted vault backup and verified restore flow.
- [x] Portable contextkey-context JSON v1 export and import.
- [x] Import validation, size limits, duplicate detection, conflict preview, and explicit item selection.
- [x] Local Markdown and plain-text import with editable previews and private-by-default saving.
- [x] Installable PWA with an offline app shell.
- [x] Privacy Policy, Terms and Conditions, custom 404 page, favicon, page metadata, and responsive navigation.
- [x] Static regression checks and Playwright browser tests for vault, sharing, restore, storage failures, mobile navigation, and responsive layout.

### Known limits

- No automatic sync or cloud vault.
- No provider account import or direct chatbot integration.
- No MCP server or Android AppFunctions integration.
- No server-side permissions or access enforcement for third-party agents.
- Portable JSON and Markdown packs are plaintext and must be reviewed before sharing.
- The app has not had a professional security audit or broad independent user testing.
- GitHub Pages deployment and real-device acceptance must be verified after each release.

## Release gate: complete before calling the MVP launch-ready

1. Confirm the newest GitHub Pages deployment is successful and serves the latest main commit.
2. Test the current build on Android Chrome at narrow and wide phone widths.
3. Test create, save, edit, search, filter, lock, unlock, refresh, backup, wrong-passphrase rejection, and restore.
4. Verify private entries never appear in a pack unless explicitly approved and selected.
5. Verify the app and legal pages work offline after one successful visit.
6. Check keyboard navigation, visible focus, reduced motion, contrast, broken links, and browser console errors.
7. Have an adult and a qualified reviewer check the Privacy Policy and Terms before public promotion. These pages are product drafts, not legal advice.
8. Ask a small group of suitable testers to use non-sensitive sample information. Do not collect their vault contents.

A custom domain is optional. The GitHub Pages URL is sufficient for an initial test release. Do not delay testing to buy a domain.

## Next phase: prove the problem and repeat use

Do not add integrations just because they sound advanced. First determine whether people actually need ContextKey more than once.

1. Interview 10 to 20 people who already use multiple AI assistants. Ask about a recent time they repeated context, what they repeated, and what they would not share.
2. Observe 5 to 10 testers using non-sensitive sample context. Measure whether they can add entries and create the right pack without coaching.
3. Ask testers to use a pack in a real task they were already doing. Record concrete improvements, confusion, and oversharing concerns.
4. Check again after 14 days for natural repeat edits or exports.
5. Continue feature development only if repeat use and task value are demonstrated. If people do not return, revisit the problem before adding features.

Success measures:
- Activation: create three entries and build one relevant pack.
- Correct sharing: users can explain what stays local and what leaves the device.
- Reliability: backup restores on a second browser or device with the original passphrase.
- Repeat use: a second pack or meaningful edit within 14 days.
- Task value: users can point to a real task where the pack reduced repeated explanation or improved the result.

## Later phase: improve context quality

Only prioritise these after observing actual user behaviour:
- Guided onboarding for writing concise, reusable context.
- Review dates and a queue for stale or conflicting entries.
- Source and provenance fields so users know where a fact came from.
- Better task templates based on observed workflows.
- Safer update and merge flows that never silently overwrite existing entries.
- Export/import compatibility research for established open memory formats, including Portable Memory and PAM. Preserve IDs, dates, provenance, and deletions where the format supports them. Do not invent another format without a clear reason.

## Later phase: controlled interoperability

Only begin after a supported client use case and a threat model exist:
- Start with read-only access.
- Require clear, per-request user approval.
- Restrict context by purpose and minimum necessary fields.
- Show what was requested and what was returned.
- Keep an understandable access history.
- Test revocation, expired permissions, malformed requests, and data minimisation.
- Evaluate MCP or Android AppFunctions only when the target platform and user eligibility support them.

A permission label in the UI is not technical enforcement. Do not describe permissions as enforced unless the integration itself checks them and the behaviour has been tested.

## Explicit non-goals until validation

- No automatic collection of all chatbot conversations.
- No central database or cloud sync in the current product.
- No accounts, subscriptions, advertising, or payments.
- No generic chatbot feature.
- No claim of universal AI-provider compatibility.
- No claim of professional security certification or legal compliance.

## Decision rule

The MVP is complete when the release gate passes and real users can complete the core workflow reliably. The broader ContextKey product is not finished until its interoperability, security, and repeat-use assumptions have been validated. Treat each later capability as a separately scoped release, not one giant launch promise.
