# Security policy

## Scope

ContextKey is an experimental, local-first MVP. It encrypts vault data stored by the app in browser local storage. It is not a professionally audited security product and does not protect against a compromised device, malicious browser extensions, malicious same-origin scripts, or an attacker who obtains the unlocked device or passphrase.

Context packs copied or downloaded from the app are plaintext. Users should review them before sharing and avoid storing highly sensitive information in ContextKey.

Same-origin tabs coordinate lock events and listen for changes to the encrypted browser-storage record. Newer app versions serialize vault writes with the Web Locks API where supported and reject writes whose encrypted starting snapshot is stale. Browsers without Web Locks fall back to a synchronous snapshot check, which cannot provide the same cross-tab transaction guarantee. Different origins, such as the Vercel and GitHub Pages deployments, have separate browser storage and cannot coordinate sessions.

## Reporting a vulnerability

Please do not publish exploit details, private vault contents, passphrases, or backup files in public issues or discussions.

If GitHub's **Report a vulnerability** option is available in this repository's Security tab, use that private reporting route. If it is not available, do not post sensitive technical details publicly; first contact the repository owner through an appropriate private channel.

## Supported version

Security fixes are currently developed against the main branch. There are no release guarantees or formal service-level commitments while the project remains an experimental MVP.
