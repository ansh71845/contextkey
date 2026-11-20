# ContextKey — executive decision brief

**Research cut-off:** 20 November 2026  
**Build:** Android-first, zero-paid-dependency web app (PWA)  
**Decision:** Proceed with a narrow validation MVP; do not assume product-market fit.

## The opportunity

AI assistants are becoming more capable and increasingly able to act across tools. Their usefulness depends partly on access to accurate, current user context. Yet preferences, goals, project decisions, and working rules are scattered across apps and provider-specific memory features. Moving between assistants can mean rebuilding or losing context.

This is a real problem, but it is not an empty market. Google Gemini and Anthropic Claude now offer memory import/export flows, while open specifications such as MacPaw Portable Memory and PAM are emerging. A generic “export your AI memory” app is therefore not sufficiently differentiated.

## Chosen product

**ContextKey — a personal AI Context Wallet.**

A user stores useful context in an encrypted, local-first vault, marks only selected entries as shareable, then creates a task-specific Markdown pack to paste into an AI assistant. The user reviews the exact content before sharing it.

**Product promise:** Your context belongs to you. You decide what is stored, what is shared, and when.

### Why this version

- It solves a repeatable workflow, not just a one-time profile export.
- It works across providers through a plain-text format instead of depending on one company API.
- The first version can run without an AI model, server, database, paid API, custom domain, or Play Store account.
- Local-first storage reduces the amount of personal data the product itself receives.
- Its future interoperability work can build on emerging open formats instead of inventing another incompatible standard.

## Opportunity ranking

Scores are qualitative founder-fit assessments, not market forecasts. They weight recurring user pain, future relevance, differentiation, feasibility from an Android phone, and zero-cost launch potential.

| Rank | Opportunity | Score | Critical weakness |
|---:|---|---:|---|
| 1 | **ContextKey — AI Context Wallet** | **7.8/10** | Provider memory features and open standards may make basic export a commodity; repeat use must be proven. |
| 2 | AI-agent permission and action-audit wallet | 7.2/10 | A standalone interface cannot enforce permissions without real integrations. |
| 3 | Agent-ready business information network | 7.0/10 | Requires onboarding businesses and maintaining accurate live data. |
| 4 | AI back-office tools for small businesses | 6.4/10 | Crowded, integration-heavy, and support-intensive. |
| 5 | Generic AI chatbot or study assistant | 5.3/10 | Weak differentiation and high retention risk. |

ContextKey is not necessarily the biggest eventual market. It is the strongest first experiment because it can be built and tested at almost zero operating cost.

## What is built in v0.1

- Passphrase-protected vault; entries are encrypted in the browser with PBKDF2-SHA-256 and AES-256-GCM.
- Context categories for background, goals, preferences, skills, projects, and working rules.
- Entries are private by default.
- Users explicitly approve entries for sharing and select them for each pack.
- A Markdown preview shows exactly what will be copied or downloaded.
- Encrypted `.ckvault` backup and restore.
- Installable Progressive Web App with an offline app shell after the first successful visit.
- No account, backend, database, analytics, AI API key, external JavaScript library, or recurring app cost.

**Limits:** No automatic device sync, provider-account import, or agent permission enforcement. Exported Markdown is plaintext. The passphrase cannot be recovered. The app has not yet completed real-device user acceptance testing.

## The first validation gate

Do not add features until the problem is tested with real users.

1. Interview 20 people who already use at least two AI assistants.
2. Give 10 people the MVP and observe whether they can add three useful entries and create a relevant pack without help.
3. Measure whether a pack improves an actual assistant task; collect examples rather than satisfaction scores alone.
4. Contact testers again after 14 days and measure repeat edits or exports.

**Continue:** at least 5 of 10 testers return and use it again within 14 days.  
**Reconsider:** fewer than 3 return. Investigate the workflow or change direction before adding features.

A download, compliment, or one-time export is not evidence of product-market fit.

## Free Android workflow

- Edit the plain HTML/CSS/JavaScript files using a mobile editor or GitHub's web interface.
- Host the static app on GitHub Pages using a public repository; app code only goes in the repository.
- Open the HTTPS Pages URL in Chrome and use **Add to Home screen**.
- Store context locally in the browser and make encrypted backups manually.
- Copy a selected context pack into an AI assistant whose age, account, and usage terms the user is eligible to use.

No paid AI API is needed. GitHub Pages can log visitor IP addresses and request metadata, but the app does not upload vault entries to GitHub. If the project later becomes a commercial service or needs broader hosting capabilities, reassess the host's terms and use a suitable alternative.

## Important age and privacy constraint

Google's documented Gemini memory-import feature has an 18+ eligibility requirement and other account/region restrictions. Do not bypass it. ContextKey's manual Markdown export is a separate workflow; whether a user may paste it into another assistant depends on that provider's current age and account terms.

Local-first architecture is data minimisation, not a legal exemption. Do not collect other people's personal data, add behavioural tracking or targeted advertising, or claim compliance without appropriate adult and legal review. Do not store passwords, recovery codes, banking details, government IDs, medical records, or other highly sensitive information in this prototype.

## Verdict

**Build, test, and measure ContextKey — but only as a narrow context-selection and portability tool.** Its first defensible feature is not “AI memory”; it is a trustworthy user-controlled workflow that makes it easy to share the minimum useful context across assistants. Its right to grow depends on repeat use and successful backup/restore tests, not market hype.

## Selected research sources

- Sensor Tower, [State of Mobile 2026](https://sensortower.com/blog/state-of-mobile-2026) — AI app downloads and spending.
- Adjust, [AI app trends 2026](https://www.adjust.com/blog/ai-app-trends-2026/) — current installs and retention benchmarks.
- Google, [Gemini memory and chat-history import](https://blog.google/innovation-and-ai/products/gemini-app/switch-to-gemini-app/) — provider-native portability feature.
- Google, [Gemini Apps Help: import from other AI platforms](https://support.google.com/gemini/answer/16868299?co=GENIE.Platform%3DAndroid&hl=en) — age, account, and availability limitations.
- Anthropic, [Import and export your memory from Claude](https://support.claude.com/en/articles/12123587-import-and-export-your-memory-from-claude) — another provider-native memory feature.
- MacPaw, [Portable Memory specification](https://github.com/MacPaw/portable-memory) — an emerging open interoperability proposal.
- Y Combinator, [Egoist Machines](https://www.ycombinator.com/companies/egoist-machines) — evidence of startup activity in AI identity/context portability.
- NiCE/Metrigy, [AI Consumer Experience Index, Q3 2026](https://www.nice.com/lps/ai-consumer-index) — consumer trust barriers to agents.
