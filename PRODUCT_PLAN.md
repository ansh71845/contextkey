# ContextKey — product plan

## Product promise

Your context should move with you. You decide what is stored, what is shared, and when.

## Version 0.1 — built

- [x] Local encrypted vault with passphrase
- [x] Context entries by category
- [x] Private by default
- [x] Explicit share-ready flag
- [x] Task-specific context selection
- [x] Exact Markdown preview
- [x] Copy and download context packs
- [x] Encrypted backup and restore
- [x] Mobile-first responsive layout
- [x] PWA manifest and offline shell
- [x] No external APIs, analytics, sign-in, or server

## Version 0.2 — only after user testing

- [ ] Guided onboarding that helps users write concise, reusable facts
- [ ] Import a plain-text/Markdown memory summary and review every entry before saving
- [ ] Merge and duplicate detection
- [ ] Context freshness dates and an “out of date” review queue
- [ ] Better export presets based on real user workflows

## Version 0.3 — interoperability

- [ ] Research and implement a compatible export/import path for one emerging open memory format (evaluate Portable Memory and PAM; do not create a new format without a reason)
- [ ] Preserve record IDs, dates, source/provenance, and deletions during import/export
- [ ] Automated conformance tests and sample fixtures
- [ ] Separate private notes from assistant-shareable context at the schema level

## Version 0.4 — future agent control

- [ ] Define a user-readable permission policy: what context can be read, for what purpose, and for how long
- [ ] Add an audit record for packs created and the data each pack contained
- [ ] Research MCP integration only after there is a real supported agent/client use case
- [ ] Evaluate Android AppFunctions when its API is stable and supported by target devices

**Important:** permission labels and audit records in an app do not technically restrict a third-party agent unless the integration enforces them. Do not market this feature as security enforcement until it is technically implemented and independently tested.

## First validation sprint

**Goal:** prove repeated use, not collect downloads.

1. Find 20 people who already use at least two AI assistants. Ask about repeated context entry and information they refuse to share.
2. Give 10 people this MVP and observe whether they can create three entries and export one relevant pack without coaching.
3. Ask whether the pack improved the first answer; collect specific examples, not “looks useful” feedback.
4. Re-contact users after 14 days. Measure repeat updates and second exports.
5. Continue only if at least 5 of 10 testers return and use it again within 14 days. If fewer than 3 return, pause feature development and reconsider the problem.

## Success metrics

- Activation: created 3 entries + built 1 pack.
- Share conversion: pack copied/downloaded, not merely generated.
- Repeat use: second pack or edit within 14 days.
- Privacy quality: users can correctly explain what stays local and what leaves the device.
- Reliability: backup restore succeeds on a second browser/device using the original passphrase.

## Non-goals

- Compete with ChatGPT, Gemini, or Claude as a model.
- Train or host a foundation model.
- Store user data on a central server.
- Add subscriptions, ads, or payment processing in the MVP.
- Claim a WhatsApp-like network effect before one exists.

## First 7 days: launch and learn

**Day 1 — deploy privately for testing.** Create the public code-only repository, publish the static PWA, and install it from Chrome. Do not add real personal context to screenshots or the repository.

**Day 2 — reliability test.** Create a test vault with non-sensitive sample data. Lock/unlock it, refresh the page, create an encrypted backup, restore it in a second browser profile or device, and verify that a wrong passphrase does not unlock it. Record any failure before inviting testers.

**Day 3 — problem interviews.** Interview five people who already use two or more AI assistants. Ask about the last real time they repeated context, what they had to repeat, what they would not share, and what they currently do. Do not pitch ContextKey until after hearing the story.

**Day 4 — usability pilots.** Observe up to five people using the app with their own non-sensitive test context. Measure whether they can create three entries, mark only suitable items shareable, and produce the right pack without coaching.

**Day 5 — task test.** Ask pilot users to use one pack in a task they were already doing. Compare the result with their normal workflow. Record concrete improvements, confusion, and oversharing concerns—not just whether they like the interface.

**Day 6 — repeat-use check.** Ask whether they needed to update an entry or create another pack naturally. Do not manufacture a reason to use it. A product that requires prompting to be used again may not have a recurring problem.

**Day 7 — decision.** Review activation, successful backup/restore, task usefulness, and observed repeat behaviour. Fix critical reliability/privacy issues first. Do not add AI chat, sync, accounts, or paid services to compensate for weak retention.

### Interview prompts

1. “Tell me about the last time you used a different AI assistant and had to explain your background or project again.”
2. “What exactly did you repeat, and how long did it take?”
3. “Which information would you not want copied into another AI assistant?”
4. “What do you use today to keep that information available?”
5. “Have you tried an assistant's built-in memory or import feature? What did it miss?”

Avoid asking “Would you use this?” Hypothetical enthusiasm is weak evidence. Ask for recent behaviour and observe an actual task.

### Tester privacy

For the first test, prefer adult volunteers already using AI assistants. If testing with other minors, involve a parent/guardian and avoid collecting their personal context. Use tester codes rather than names in notes. Do not ask people to share passwords, sensitive documents, account exports, medical details, or private conversations. The prototype is not a place to collect or store tester data for the founder.
