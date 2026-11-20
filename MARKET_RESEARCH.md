# ContextKey — market research brief

**Research cut-off:** 20 November 2026  
**Scope:** global consumer AI and agentic software, Google/Android announcements, provider memory portability, emerging standards, market benchmarks, and a small sample of public community discussions.

This is a focused decision brief, not a claim that every Google forum, news article, startup, or product worldwide has been exhaustively reviewed. The supplied Claude artifact page could not be opened by the research browser, so this assessment evaluates the written concept and claims, not the artifact's underlying code or UI.

## 1. Executive decision

**Build ContextKey, but do not build it as “another AI memory exporter.”** The defensible product hypothesis is a **local-first AI Context Wallet**: a user-owned, encrypted source of truth where people curate context, keep entries private by default, and create narrow, task-specific packs for whichever assistant they choose.

The first version should be useful without an AI model, paid API, cloud database, or account. This is the best *starting project under a zero-budget, Android-first, solo-builder constraint*—not a prediction that it has the largest possible market or that it will become the next WhatsApp.

### The weakest part of the original ContextKey thesis

A portable profile file does not create a WhatsApp-style network effect. WhatsApp became more valuable as more of a user's contacts joined. ContextKey's value is initially individual, and a person may only export a context pack occasionally. The product therefore has two hard problems:

1. **Retention:** what makes someone update and use it repeatedly after the first export?
2. **Differentiation:** major AI providers are already building memory and import features, and open memory formats plus startups are now entering the same space.

The answer cannot be “we are first.” ContextKey must win on user control, selective sharing, privacy, transparent exports, and eventually reliable interoperability.

## 2. What the market is signalling

### A. Generative AI is a large and still-growing app category—but retention is weak

- Sensor Tower's *State of Mobile 2026* reported 3.8 billion generative-AI app downloads in 2025 and more than US$5 billion in category in-app purchase revenue. Total mobile app downloads grew only 0.8% year over year, so AI growth is happening inside a mature, highly competitive app market.
- Adjust's 2026 AI app analysis, based on January–September data, reported global AI-app installs up 14% year over year, with APAC up 43%. Its AI-app Day-30 retention benchmark was **0.7%** (Day 1: 6.1%; Day 7: 2.0%; Day 14: 1.2%). These are Adjust's measured AI-app benchmarks, not a universal law for every app.
- Sensor Tower's June 2026 report estimated global time spent in generative-AI apps at 36 billion hours in H1 2026, versus 17.2 billion hours in H1 2025, and AI-app in-app purchase revenue above US$4 billion in H1 2026.

**Implication:** demand and attention are real, but “AI-powered” is not a retention strategy. A product must solve a recurring, specific problem.

### B. AI assistants are shifting from chat to delegated action

At Google I/O 2026, Google presented Gemini Spark as a 24/7 personal agent, described Android Halo as a place to see agent progress, and discussed third-party tool connections through MCP. Google later announced Spark's expansion in India for Google AI Pro and Ultra subscribers. This is a meaningful direction-of-travel signal, but Spark is not a free, universally available feature.

Android's AppFunctions (described by Google as Android MCP integration) let apps expose functions for assistants and agents to discover. Google's developer documentation labels AppFunctions **experimental** and says the capability is for Android 16 or higher. That makes it a future integration option, not a safe dependency for an Android-first v0.1 app.

### C. Context portability is a real gap, but it is no longer empty

- Google introduced Gemini memory and chat-history import on 26 March 2026. Users can transfer a memory summary and upload a ZIP of exported chats. Google's help page says the feature requires a personal Google Account and users aged 18 or older; it is unavailable for supervised accounts and in some regions.
- Anthropic's Claude help centre documents memory import/export. It describes the import as experimental and warns that Claude may not incorporate every imported memory; its memory is also oriented toward work-related context.
- The open-source **Portable Memory** project from MacPaw published a cross-vendor memory format proposal and reference implementations. A separate **Portable AI Memory (PAM)** specification also exists. This means ContextKey should study and interoperate with emerging formats rather than invent yet another incompatible schema.
- Y Combinator lists Egoist Machines, an active Summer 2026 company building an AI Passport for portable personal context. That is direct startup competition.

**Implication:** a generic “write profile once, export text anywhere” feature is easy to copy. A user-friendly, local-first control layer with careful selection, review, versioning, and dependable adapters is a stronger wedge.

### D. Trust is becoming a product requirement for agents

A Q3 2026 Metrigy/NiCE consumer survey found 41% of surveyed consumers named trust as the top barrier to AI-agent use, and 55% cited accuracy as the leading reason for choosing a service channel. This supports a future direction around user control and clear boundaries. It does **not** prove consumers will pay for a separate permission app.

### E. The surrounding ecosystem is moving toward standards

Google's Universal Commerce Protocol (UCP), announced in January 2026 with a broad group of industry partners, aims to standardise agentic commerce interactions between consumer surfaces, merchants, and payment providers. Google describes compatibility with AP2, A2A, and MCP. This is evidence that agents will need structured data and safe ways to take actions—but it is a different market from personal memory. ContextKey should treat agent permissions and action logs as a later research direction, not claim to be a UCP competitor.

## 3. What users and communities are saying

The sampled public discussions show the friction, but they are anecdotal rather than representative surveys:

- A Reddit user who tried Claude's memory import said broad preferences transferred but detailed project decisions were lost. This highlights the difference between a short profile and durable working context.
- A Google Gemini Apps Community thread asked for reliable cross-chat memory across assistants because users did not want to restart project context. Another community thread reported trouble opening the Gemini import flow. These are useful problem signals, not proof of mass demand.

The practical lesson: importing a summary is not the same as preserving a living, structured record of decisions, project state, and preferences.

## 4. Claude proposal: fact-check

| Claim in the supplied response | Assessment |
|---|---|
| Gemini Spark and Android Halo were announced at Google I/O 2026 | **Verified.** They were announced, but rollout and subscription access are limited; Google later described Spark's India expansion for AI Pro/Ultra subscribers. |
| Google and Anthropic introduced memory-import flows in March 2026 | **Broadly verified.** Google announced Gemini import on 26 March; Anthropic's release notes list memory for free users and memory import/export on 2 March. |
| The AI market is growing very quickly | **Verified.** Sensor Tower and Adjust report strong AI category usage, installs, and revenue growth. |
| AI apps retain about 6% of users by Day 30 | **Misleading if applied to AI apps.** Adjust's 2026 AI-app Day-30 benchmark is 0.7%. The 6% figure is closer to some broad app-market benchmarks, not the AI-app figure in that report. |
| Consumer AI spending will top US$10 billion in 2026 | **Not verified from the current primary sources reviewed.** Sensor Tower's cited H1 2026 figure is more than US$4 billion in AI-app in-app purchase revenue; that is not evidence for the specific US$10 billion claim. |
| “No common standard” exists | **Needs nuance.** There is no universally adopted cross-provider consumer standard, but open proposals/specifications such as MacPaw Portable Memory and PAM already exist. |
| On-device storage avoids most child-data obligations | **Too confident.** Local-first design reduces the amount of personal data handled by a central service, but it does not automatically settle legal applicability. Get appropriate adult/legal review before collecting or syncing other people's data. |

## 5. Opportunity ranking

Scores below are qualitative founder-fit scores out of 10, weighted for recurring pain, future relevance, differentiation, feasibility on an Android phone, and ability to start free. They are not market-size forecasts.

| Rank | Project opportunity | Score | Main upside | Main weakness |
|---:|---|---:|---|---|
| 1 | **ContextKey — local-first AI Context Wallet** | **7.8** | Immediate personal pain; no API or backend required; globally useful; fits Android and a free build | Low initial network effect; provider features and memory standards are converging |
| 2 | AI-agent permission and action-audit wallet | 7.2 | Trust and control become more important as agents act | Without integrations it cannot enforce permissions; real enforcement needs platforms and standards |
| 3 | Agent-ready data layer for independent service businesses | 7.0 | Could develop two-sided network effects between businesses and AI agents | Requires onboarding businesses, reliable live data, and operational support; standards are evolving |
| 4 | AI back-office automation for small businesses | 6.4 | Clear potential ROI and recurring use | Crowded market; integrations, support, and customer acquisition are difficult for a solo zero-budget builder |
| 5 | General-purpose AI chatbot or generic study assistant | 5.3 | Large headline market | Weak differentiation, platform competition, and retention risk |

**Why rank ContextKey first?** It is not the highest absolute-upside market. It is the best first experiment that can be built, tested, and operated without paid APIs, a server, a desktop computer, or a payment account. The project can be stopped cheaply if users do not return.

## 6. Product definition

### Product

**ContextKey — your encrypted, user-owned AI Context Wallet.**

### Target user

People who use more than one AI assistant and repeatedly explain their preferences, goals, working style, or project background. Start with technically curious students, creators, and independent builders; expand only after observing actual repeated use.

### Core job to be done

“When I start a task with a different AI assistant, help me give it the smallest accurate context it needs without rebuilding my profile or oversharing everything.”

### MVP features

1. Encrypted local vault protected by a passphrase.
2. Structured entries for background, goals, preferences, skills, projects, and working rules.
3. New entries private by default.
4. Task-specific selection and exact preview before sharing.
5. Plain Markdown packs that can be pasted into different AI assistants.
6. Encrypted backup and restore.
7. No account, cloud database, external AI API, analytics, or paid dependencies.

### What v0.1 deliberately does not do

- No automated import from provider accounts.
- No AI-generated memory synthesis or paid API calls.
- No automatic sync between devices.
- No direct MCP/AppFunctions integration.
- No claim that it can enforce what an AI provider remembers or does.

## 7. The moat hypothesis

The moat is **not** trapping users. The product's promise is that users can leave with their data at any time.

The possible long-term advantage is becoming the trusted, user-owned source of context that works across assistants: structured context, version history, task-specific packs, reliable import/export adapters, compatibility with emerging open memory formats, and eventually consent-based integrations. This is only a hypothesis. There is no network effect in the first MVP.

## 8. Validation gates

Do not add complex AI features before these tests:

- Interview 20 people who already use at least two AI assistants. Ask what they repeat, what they would never share, and how often they switch tools.
- Give 10 people the prototype. Measure who creates three useful entries, builds a pack, and actually pastes it into an assistant.
- Re-contact them after 14 days. Count how many update the vault and create a second pack.

**Internal go/no-go rule (not an industry benchmark):** continue only if at least 5 of 10 testers use it a second time within 14 days and can name a recurring problem it solved. If fewer than 3 return, stop adding features and test a different problem.

## 9. Free operating plan

- **Build:** plain HTML/CSS/JavaScript; edit through a mobile code editor or GitHub's web interface.
- **Host:** GitHub Pages on a public repository, or an equivalent free static host. The repository contains app code only.
- **Storage:** encrypted browser local storage; manual encrypted backup file.
- **AI use:** the user copies a selected Markdown pack into an AI assistant they already have permission to use. The app itself makes no API calls.
- **Costs:** no domain, server, database, paid model, or Play Store account required for the prototype. Third-party free-plan limits and terms can change.

The app is designed as a PWA so it can be added to the Android home screen. It does not require a native Android build.

## 10. Privacy and age-related caution

India's Digital Personal Data Protection framework includes special requirements for children's personal data, including verifiable parental consent and restrictions on tracking/behavioural monitoring and targeted advertising. The final rules use a staged commencement schedule. Local-first design is a sensible data-minimisation choice, but do not interpret this report as legal advice or as a declaration that an app is exempt. Before releasing a service that collects, syncs, or processes other people's data—especially children's data—get an adult/guardian involved and obtain appropriate legal guidance. The MVP avoids accounts, analytics, advertising, and server-side collection by design.

## Sources

1. Sensor Tower, *2026 State of Mobile* (21 Jan 2026): https://sensortower.com/blog/state-of-mobile-2026
2. Adjust, *AI app trends 2026: Installs, sessions, and retention* (Nov 2026): https://www.adjust.com/blog/ai-app-trends-2026/
3. Sensor Tower, *State of AI 2026* (16 Jun 2026): https://sensortower.com/press/sensor-tower-state-of-ai-2026-report-global-time-spent-on-generative-ai-apps-projected-to-more-than-double-year-over-year
4. Google, *I/O 2026: Welcome to the agentic Gemini era* (May 2026): https://blog.google/innovation-and-ai/sundar-pichai-io-2026/
5. Google India, *Introducing Gemini Spark in India* (29 Jul 2026): https://blog.google/intl/en-in/company-news/technology/introducing-gemini-spark-your-247-personal-ai-agent-in-country/
6. Android Developers, *Top AI on Android updates from I/O 2026* (26 May 2026): https://android-developers.googleblog.com/2026/05/android-ai-intelligence-system.html
7. Google, *Bring your AI memories and chat history to Gemini* (26 Mar 2026): https://blog.google/innovation-and-ai/products/gemini-app/switch-to-gemini-app/
8. Google Gemini Help, *Import from other AI platforms* (age and availability requirements): https://support.google.com/gemini/answer/16868299?co=GENIE.Platform%3DAndroid&hl=en
9. Anthropic Claude Help, *Import and export your memory from Claude*: https://support.claude.com/en/articles/12123587-import-and-export-your-memory-from-claude
10. MacPaw, *Portable Memory* open-source project: https://github.com/MacPaw/portable-memory
11. MacPaw Research, *Memory Belongs to the User* (6 Jul 2026): https://research.macpaw.com/publications/portable-memory
12. Y Combinator, *Egoist Machines*: https://www.ycombinator.com/companies/egoist-machines
13. NiCE/Metrigy, *AI Consumer Experience Index, Q3 2026*: https://www.nice.com/lps/ai-consumer-index
14. Google Developers, *Universal Commerce Protocol* (11 Jan 2026): https://developers.googleblog.com/under-the-hood-universal-commerce-protocol-ucp/
15. Google Gemini Apps Community, cross-chat memory request: https://support.google.com/gemini/thread/441185726/
16. Reddit, user report of details lost during memory import (27 Apr 2026): https://www.reddit.com/r/ClaudeAI/comments/1swsw6z/memory_import_drops_a_bunch_of_memory/
17. Government of India, Gazette notification for DPDP Rules 2025: https://egazette.gov.in/WriteReadData/2025/267650.pdf
