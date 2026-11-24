# Redthread Frontend — Design System (`THE CASE FILE / WAR ROOM`)

## 1. Visual Concept

Redthread makes the metaphor literal: an investigator tracing a physical **red thread** across official recall notices and retail product listings.

- **Dark Evidence Board** (`#0E0F12` ink, `#15171C` board with faint 40px archival coordinate grid and subtle procedural film grain) establishes focus and lets red thread edges and bright highlights dominate.
- **Aged-Paper Evidence Tags** (`#EFE8D8` warm off-white, `#171512` dark ink, `#C8BCA2` ruled border, metallic brass/red tack pin) hold every concrete piece of evidence, verdict card, extraction dossier, and the printed exposure report.
- **Asymmetric War Room Hierarchy**: the Evidence Board commands ~55–60% of the viewport width at full height, flanked by a narrow left agent rail (Live Browser Monitor + Monospace Action Trace) and a right Case File column (folder-index tabs, 6-tier count strip, rubber-stamped paper Verdict Cards).

---

## 2. Colour Tokens (Zero Green Anywhere · WCAG AA)

| Token | Hex | Role |
|---|---|---|
| `--ink` | `#0E0F12` | Deep near-black background canvas |
| `--board` | `#15171C` | Evidence board & panel surface |
| `--board-raised` | `#1B1E25` | Controls, interactive surfaces |
| `--board-line` | `#292D38` | Structural dividers |
| `--paper` | `#EFE8D8` | Aged-paper evidence tags, drawer, report sheet |
| `--paper-aged` | `#E4DAC4` | Dossier headers & secondary paper bands |
| `--paper-ink` | `#171512` | Primary ink on paper (>14:1 contrast) |
| `--paper-muted` | `#564E43` | Secondary ink on paper (>6.4:1 contrast) |
| `--thread` | `#E5383B` | Signature glowing red thread & `CONFIRMED` accent |
| `--brass` | `#C9A45C` | Brass pushpins & sandbox indicator |
| `--verified-ink` | `#1E40AF` | Cobalt archival ink for verified-quote stamps |

### Verdict Tier Tokens (Colour + Explicit Text Stamp)

| Tier | Board Accent | Ink on Paper (`#EFE8D8`) | Stamp Label |
|---|---|---|---|
| `CONFIRMED` | `#E5383B` | `#B51F24` | `CONFIRMED` |
| `LIKELY` | `#E06B2E` | `#A63D0A` | `LIKELY` |
| `RELATED` | `#D9A426` | `#805A00` | `RELATED` |
| `CONFLICT` | `#9F75FF` | `#5B21B6` | `CONFLICT` |
| `NO_MATCH` | `#8596AC` | `#3E4B5E` | `NO MATCH` (*No match found in checked sources*) |
| `UNRESOLVED` | `#A8AFB9` | `#4B525C` | `UNRESOLVED` |

---

## 3. Typography (100% Self-Hosted Offline via `@fontsource`)

- **Display / Editorial Serif**: `Instrument Serif` (`400`, `400 italic`) — wordmark, section headlines, dossier titles, oversized tier numerals. Tight display tracking (`-0.03em` hero, `-0.015em` headings).
- **UI Body Sans**: `IBM Plex Sans` (`400`, `500`, `600`, `700`) — concise prose, button labels, plain-English reason sentences.
- **Monospace Telemetry**: `IBM Plex Mono` (`400`, `500`, `600`, `700`) — URLs, terminal action logs, verbatim quotes, evidence IDs, timestamps, small-caps labels (`0.68rem`, `letter-spacing: 0.12em`).

---

## 4. Motion Rules (`prefers-reduced-motion` Compliant)

- **Hero thread draw-in**: `1.5s` `cubic-bezier(0.22, 1, 0.36, 1)` SVG `stroke-dashoffset` sweep on start screen load.
- **Graph edge draw-in**: newly arriving edges subdivide and draw their sagging quadratic Bezier curve over `560ms`; new listing pins pop in (`240ms`) with a soft `1.4s` crimson ring pulse.
- **Rubber-stamp verdicts**: `230ms` scale-and-settle (`1.32 → 0.96 → 1`, `-2°` tilt).
- **Browser monitor**: `220ms` opacity crossfade between consecutive screenshots, subtle scanline overlay and `REC` dot pulse while running.
- **Drawer & log**: `220ms` right slide-over drawer; `180ms` vertical fade-in on new terminal log lines; smooth `zoomToFit` on node arrivals.
- **Reduced motion**: `@media (prefers-reduced-motion: reduce)` and `matchMedia` checks inside `GraphPanel` collapse all animations/pulses/scanlines to instant state changes while preserving every layout and indicator.

---

## 5. Component Inventory

- `StartScreen.jsx` — Case-opening editorial foyer with animated SVG red thread, pinned Form RT-01 intake card, live/replay/demo launch controls, and persistent badges.
- `App.jsx` — Slim sticky Command Bar (wordmark, recall dossier pill, live status, Sandbox + Live/Recorded badges, Demo toggle, Exposure Report button) and asymmetric 3-column War Room shell.
- `Stepper.jsx` — Horizontal red thread running through 7 numbered stage pins (`01 Official record` through `07 Report`).
- `BrowserPanel.jsx` — Framed Chromium monitor with URL bar, `REC` indicator, scanlines, crossfading JPEG frames (with path/backslash normalization, Vite `/shots` proxy, cache-busting, and disk-flush retry), illustrated standby schematic, and live DOM telemetry fallback when a fixture stream carries no JPEG frames.
- `ActionLog.jsx` — Auto-scrolling monospace terminal trace with geometric glyphs, dimmed reasoning text, and highlighted guard refusals.
- `GraphPanel.jsx` — Full-height responsive Evidence Board built on `react-force-graph-2d` with custom canvas rendering: anchored central pinned Recall dossier card, aged-paper Listing tags, sagging glowing red threads, hover path tracing, zoom/fit controls, and auto `zoomToFit`.
- `VerdictTable.jsx` (`VerdictCards`) — 6-tier interactive filter count strip + aged-paper verdict cards sorted by severity tier, rubber-stamped verdicts, plain-English reason sentences, hover-to-highlight board link, and `Open evidence` trigger.
- `ExtractionPanel.jsx` — Paper extraction sheets with verbatim monospace quotes and ink-stamped verification seals.
- `EvidenceDrawer.jsx` — Right slide-over paper dossier tag displaying source URL, highlighted monospace quote, verification stamp, metadata, screenshot thumbnail, and one-click `Copy evidence` button.
- `ReportView.jsx` — Printed editorial Exposure Report with oversized serif tier counts, official recall summary, listing cards, dedicated `"What We Did Not Check"` dashed box, small-caps disclaimer, JSON export, ElevenLabs narration, AWS S3 archival, and white-background `@media print` stylesheet.
- `Badges.jsx` & `Chip.jsx` — Always-visible `Sandbox shop` / `Live run` / `Recorded run` badges, rubber-stamp verdict badges, plain-English reason lists, and archival verification ink seals.
