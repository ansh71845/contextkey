# ContextKey visual system

## Direction

ContextKey should feel like a considered personal information workspace: quiet, secure, editorial, and practical. It should not resemble a generic AI landing page, a banking dashboard, or a chatbot clone.

## Palette evaluation

| Rank | Direction | Core colours | Strength | Trade-off |
|---:|---|---|---|---|
| 1 | **Field Notes** | Pine, parchment, sea-glass, copper | Distinctive but calm. Natural warmth signals care and privacy; dark pine gives the interface a stable anchor. | Needs careful contrast control for the lighter sea-glass accent. |
| 2 | Slate and Cobalt | Graphite slate, muted cobalt, ice, pale steel | Clear, technical, and credible. | More generic SaaS appearance and less ownable for this product. |
| 3 | Graphite and Moss | Charcoal, moss, warm white, ochre | Grounded and mature, with strong contrast. | Risks reading as an outdoor or sustainability product. |
| 4 | Midnight and Teal | Deep blue-green, restrained teal, ivory, brass | Premium and focused. | Leans toward financial software and feels heavier on small screens. |

## Selected palette: Field Notes

The selected system uses four colour families. Neutral shades are supporting surfaces, not extra brand colours.

| Role | Colour | Hex | Usage |
|---|---|---|---|
| Primary | Pine | `#1F5846` | Primary actions, active navigation, brand mark |
| Canvas | Parchment | `#F2EFE7` | Main background |
| Accent | Copper | `#925331` | Small editorial accents, metadata, key detail in logo |
| Supporting accent | Sea-glass | `#89AA9B` | Decorative details and soft emphasis only, not small text |

Core surfaces use warm white `#FFFCF6`. Main text uses deep ink `#1C3029`; supporting copy uses `#495A51` and `#5B6C62`. These text colours were checked against the parchment and warm-white surfaces for WCAG AA contrast. Sea-glass is deliberately not used for small text because its contrast is too low.

## Logo concept

The mark combines a context document with a key. The page represents curated knowledge; the key represents user control over access and disclosure. The copper key is part of the same symbol, not a separate decorative badge. The design is geometric and should remain legible at favicon and app-icon sizes.

## Interaction and motion

- Use restrained transitions, normally between 140 and 180 ms.
- Use small state changes: border, surface, focus, and a one- or two-pixel hover lift.
- No cursor animation, scroll-triggered spectacle, rotating ornaments, parallax, or animated gradients.
- Honour `prefers-reduced-motion`.
- Use visible focus styles and keep all controls usable with keyboard and touch.
- Buttons and status labels remain rectangular. The share control may retain a conventional switch track because it communicates a binary setting.

## Layout and content

- Prioritise legibility, a strong content hierarchy, and useful whitespace.
- Keep the mobile navigation compact and keyboard accessible.
- Avoid horizontal scrolling and keep long user content wrap-safe.
- Explain product behaviour directly. Do not add fake adoption numbers, fake reviews, invented contact details, or claims of universal provider compatibility.
- Do not add decorative stock imagery. The product is a focused workspace and its own interface is the visual content.

## Product boundary

ContextKey is a local-first context vault and manual context-pack builder. This visual system does not imply direct access to ChatGPT Pro, Claude paid features, or any other provider. Provider integrations require separate eligibility, permissions, security design, and implementation.
