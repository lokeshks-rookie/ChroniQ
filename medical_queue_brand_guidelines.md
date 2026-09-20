# Brand & Design Guidelines
### Medical Queue Management App — Visual System (inspired by Vistal, Webflow template)

This document is derived from direct pixel analysis of the uploaded reference screenshots — a Landbook color-extraction panel for the Vistal template, the live `vistal.webflow.io` hero section, and the Vistal navigation/wordmark — cross-checked against a live fetch of `vistal.webflow.io`. All hex values below were sampled programmatically from the actual image pixels, not estimated by eye. Where something could not be verified with certainty (typeface identity), that is stated explicitly rather than guessed.

This system is meant to be handed to any agentic tool (Codex, Antigravity, Cursor, etc.) as a single source of truth so output stays consistent across sessions and tools.

---

## 1. Brand Rationale

The reference's original four-color system (mustard-yellow accent against black, cream, and white) has been replaced with a user-specified warm, earth-toned palette — near-black espresso, cream/ivory, and honey-tan browns, with no yellow or true white in the set. For a medical queue management app this maps well conceptually: the deep ink tone still carries the legibility and authority a clinical tool needs, while the warm cream and tan tones soften the sterile, cold-clinical feel that blue-and-white hospital software typically has — useful for a product patients interact with while anxious or waiting. The honey-tan accent takes over the "something needs your attention" role the old yellow played (a called turn, a queue update), without reading as an alarm color the way a brighter yellow or red would in a healthcare context.

---

## 2. Color Palette

The core palette below was supplied directly by the user as the app's brand colors and supersedes the Vistal-sampled values from the original version of this document. These hex values are not independently pixel-verified against a live reference the way the original mustard-yellow/black/cream/white set was — they are authoritative as given.

| Token | Hex | RGB | Usage |
|---|---|---|---|
| `--color-ink` | `#190801` | 25, 8, 1 | Primary text, dark section backgrounds, header/footer, primary buttons |
| `--color-accent` | `#9A6E56` | 154, 110, 86 | CTAs, active states, highlight sections, badges, "attention needed" indicators |
| `--color-base` | `#FDF9F0` | 253, 249, 240 | Primary background, card backgrounds, nav bar |
| `--color-cream` | `#B88C70` | 184, 140, 112 | Secondary section backgrounds (alternate, warmer than base — note this reads as a light tan rather than a near-white, since the supplied palette has no second near-white tone) |
| `--color-text-muted` | `#694436` | 105, 68, 54 | Body copy, secondary/supporting text, captions |

**Do not introduce additional hues.** No blues, greens, or reds outside of functional states (see below). The entire aesthetic depends on restraint — four neutrals plus one accent.

### 2.1 Extended palette (full 10-color set as supplied)

This is the complete set of colors supplied by the user, presented as the extended reference palette. The five roles in the core table above are drawn from this same set — swatches 1, 2, 5, 7, and 10 below correspond directly to `--color-base`, `--color-text-muted`, `--color-ink`, `--color-accent`, and `--color-cream` respectively. The remaining swatches are secondary/supporting tones, useful for briefing photographers or color-grading real facility and clinic photos so they sit within the same warm, desaturated world as the UI (see §6, Imagery):

| Swatch | Hex | RGB | Read |
|---|---|---|---|
| 1 | `#FDF9F0` | 253, 249, 240 | Warm ivory — matches `--color-base`, the dominant light neutral |
| 2 | `#694436` | 105, 68, 54 | Warm mid-brown — matches `--color-text-muted` |
| 3 | `#552C1B` | 85, 44, 27 | Deep rust-brown — secondary dark tone |
| 4 | `#453526` | 69, 53, 38 | Dark olive-brown — secondary dark tone |
| 5 | `#190801` | 25, 8, 1 | Near-black espresso — matches `--color-ink` |
| 6 | `#301003` | 48, 16, 3 | Very dark brown — secondary near-black |
| 7 | `#9A6E56` | 154, 110, 86 | Honey-tan — matches `--color-accent` |
| 8 | `#5E4A3C` | 94, 74, 60 | Medium umber — secondary muted tone |
| 9 | `#220400` | 34, 4, 0 | Near-black maroon-brown — secondary near-black |
| 10 | `#B88C70` | 184, 140, 112 | Light dusty tan — matches `--color-cream` |

**Application:** when color-grading or selecting real photography for the product (facility photos, clinic/hospital shots), bias toward this warm, desaturated, brown/tan range rather than cool or saturated tones — it's what keeps photography cohesive with the ink/cream/accent UI rather than clashing against it. Do not use these as UI element colors; they stay confined to imagery grading.

### Functional / semantic colors (new — not in the reference, required for app states)

The reference is a static marketing site and has no form-validation or status states. These must be added, kept minimal, and kept out of the way of the core palette:

| Token | Hex | Usage |
|---|---|---|
| `--color-success` | `#2E7D46` | Item successfully claimed, verification passed |
| `--color-danger` | `#C0392B` | Claim rejected, form errors, destructive actions |
| `--color-info` | `#3B5BA5` | Informational banners only — use sparingly, this is the only "cool" color permitted |

Use these only for functional state indicators (badges, toast messages, form validation). Never use them decoratively.

---

## 3. Typography

**Honesty note:** the exact typeface used in the reference still could not be confirmed programmatically — Webflow serves fonts through hashed CSS bundles I could not fetch directly, and I am not going to name a specific font family as fact when I have not verified it. Cross-checking the hero headline ("Experience innovative architecture that transforms your vision") and the "Vistal" nav wordmark screenshots against the earlier finding: both confirm a grotesque/neo-grotesque sans-serif, medium x-height, moderate letter-spacing on uppercase labels ("ABOUT VISTAL"), no serifs anywhere. The wordmark's lowercase "a" is double-story (open bowl over a straight stem), which is consistent with General Sans, Inter, and Manrope alike, so it doesn't narrow the choice further — all three remain valid, license-clear stand-ins.

Given that, use one of these verified, license-clear alternatives that match the same visual category:

| Role | Recommended font | Source | Why |
|---|---|---|---|
| Primary (headings + body) | **General Sans** | Fontshare (free) | Closest structural match to the reference — geometric grotesque, same weight range |
| Alternative 1 | **Inter** | Google Fonts | Safe, extremely well-supported, near-identical proportions |
| Alternative 2 | **Manrope** | Google Fonts | Slightly rounder, still fits the same mood |

Pick **one** and use it everywhere. Do not mix.

### Type scale

| Style | Size (desktop) | Size (mobile) | Weight | Case |
|---|---|---|---|---|
| Display (hero headline) | 64–96px | 36–44px | 500–600 | Sentence case |
| H1 (section headline) | 40–48px | 28–32px | 500 | Sentence case |
| H2 (subsection) | 24–28px | 20–22px | 500 | Sentence case |
| Body | 16–18px | 15–16px | 400 | Sentence case |
| Caption / label | 12–13px | 12px | 500 | UPPERCASE, +0.08em tracking |
| Button text | 14–15px | 14px | 500 | Sentence case |

**Small uppercase labels** (confirmed live: "■ ABOUT VISTAL" sits directly above the hero headline, black square marker, tracked uppercase, on the yellow section background) precede nearly every section headline. Adopt this as a system convention: every major section gets a small tracked-uppercase eyebrow label with a tiny square/dot marker before it (e.g. "■ REPORT AN ITEM", "■ SEARCH RESULTS", "■ YOUR CLAIMS"). Nav items follow the same marker convention ("▪ Home V.1", "▪ Projects V.1", "▪ Services") — reuse the small square bullet as a consistent micro-detail across both nav and section labels.

---

## 4. Layout & Spacing

- **Base unit:** 8px grid. All padding/margin values should be multiples of 8.
- **Section vertical padding:** 96–120px desktop, 48–64px mobile.
- **Max content width:** 1280px, centered, with 24px side gutters on mobile.
- **Corner radius:** consistent 12–16px on cards and buttons, full pill (999px) on tags and primary CTA buttons. Do not mix radius values within the same component type.
- **Alternating section backgrounds:** the reference deliberately alternates its background tones to create rhythm as the user scrolls. Replicate this using your own token sequence — `base → accent → base → ink → base → cream → accent` — rather than a single background for the whole site; it is one of the strongest identity markers of this design.

---

## 5. Components

### Buttons
- **Primary CTA:** ink-colored pill-shaped button, base-colored text, with a small circular accent-colored icon-badge (arrow) docked at the trailing edge. Hover: slight scale (1.02) or icon-badge rotates 45°.
- **Secondary:** outline button, ink border, transparent fill, ink text.
- On accent or ink section backgrounds, invert appropriately — never place an ink button directly on an ink section.

### Badges / Tags
- Small pill shape, ink background with base text for inactive/default state, accent background with ink text for the active/selected state. This active/inactive pill pattern is used in the reference for category filters — reuse it directly for filtering item categories (Electronics, ID Cards, Bags, etc.) in the search page.

### Cards
- Base or cream background, 12–16px radius, subtle shadow only (no heavy drop shadows — the reference uses almost none). Image on top, content below, generous internal padding (24–32px).
- The "fanned/stacked card" treatment on the homepage (slightly rotated overlapping cards) is a strong visual signature — appropriate for a "recently reported items" carousel on the dashboard or landing page.

### Accordion (FAQ pattern)
- Reuse directly for FAQ pages and for "claim status details" — thin horizontal dividers, plus/minus icon on the right, generous vertical padding per row (24px+).

### Icons
- Use lucide react icons . 

---

## 6. Imagery

- Photography-led, not illustration-led. Real, high-quality photographs (architecture in the reference; for this project — actual facility photos, clinic/hospital location photos).
- No stock-photo gloss. Natural light, slightly desaturated, consistent color grading across all images.
- Avoid decorative illustration entirely — it does not belong in this system.

---

## 7. Voice & Microcopy

- Section eyebrow labels: short, uppercase, 2–4 words ("REPORT AN ITEM," "RECENT MATCHES").
- Headlines: direct, benefit-first sentence case, no exclamation points.
- Body copy: short paragraphs, 1–2 sentences, plain language — no jargon, no filler adjectives.
- Buttons: verb-first, 1–3 words ("Get started," "Report item," "Track claim").

---

## 8. What Not To Do

- Do not add drop shadows, gradients, or glassmorphism — none exist in the reference.
- Do not introduce a second accent color without a functional reason.
- Do not use serif fonts anywhere.
- Do not break the 8px spacing grid for "just this one section."
- Do not use rounded corners on some cards and sharp corners on others — pick one radius value per component type and hold it everywhere.

---

## 9. Application Notes for This Project

Map the reference's marketing-site sections onto your actual page types as follows:

| Reference pattern | Your equivalent |
|---|---|
| Hero with large wordmark + CTA | Landing page hero |
| "About" section with stacked fanned cards | Dashboard: recent lost/found items carousel |
| Category pill filters | Search page: item category filters |
| Numbered service list (01, 02, 03) | Reporting flow: step indicator (01 Details, 02 Photos, 03 Location, 04 Review) |
| FAQ accordion | Help/FAQ page, and per-claim status breakdown |
| Dark "tailored for you" CTA section | AI query page or claim-submission confirmation screen |
| Accent closing CTA band | Final claim confirmation / "track your item" prompt |

This file is the single reference for color, type, spacing, and component rules for every page you build next — landing, auth, dashboard, report, search, claim, and AI query. When we move to individual page specs, they will build on top of these tokens rather than redefining them.

---

## 10. Verification Log

- **Color palette**: the original Vistal-sampled values (mustard-yellow accent, pure black, near-white cream/white) have been superseded by a 10-color palette supplied directly by the user. These are not independently pixel-verified against a live reference — they are taken as authoritative as given, and both the core token table (§2) and the extended palette (§2.1) are built from this same set.
- **Typography**: no new definitive font match found; the wordmark and headline screenshots reinforce (not overturn) the earlier grotesque-sans finding. Recommendation to use General Sans/Inter/Manrope stands unchanged.
- **Eyebrow-label + nav marker pattern**: confirmed directly from the live nav bar and hero screenshots, including the exact wording "ABOUT VISTAL" and the square-bullet convention used before both nav items and section labels.
