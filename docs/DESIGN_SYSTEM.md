# CFP Dashboard — Design System Reference

Source: Figma Make file ["Redesign Dashboard for Usability"](https://www.figma.com/make/yyVEABmgRB3AWBSkXrtPUu/Redesign-Dashboard-for-Usability) (file key `yyVEABmgRB3AWBSkXrtPUu`).

This file is a Figma Make prototype (React + Tailwind v4), not a linked Figma design-library file, so it has no exported variable/style collection — the tokens below were reverse-engineered from its `src/index.css` theme block and the inline styles used consistently throughout `src/App.tsx`. Treat this as the working reference for the redesigned "hiresmartz" admin dashboard until a real component library exists.

Use this doc to brief future redesign prompts, e.g. _"restyle the Candidates table using the DESIGN_SYSTEM.md tokens."_

---

## 0. Implementation status in this codebase

The tokens in §1 already exist in this app, independently of this doc — `src/theme/index.css` defines `--primary: #263d92`, `--accent/--secondary: #11b7dd`, and `--surface-indigo/-cyan/-gray` matching `cfp-lavender`/`cfp-ice`/`cfp-surface` almost exactly, and `src/theme/tailwind-theme.css` exposes them as `--color-brand-50..900` plus `bg-primary` / `text-accent` / etc. Ant Design is themed to match in `src/main.tsx`. **When redesigning a component, prefer these existing Tailwind classes/CSS vars over hand-copying hex values from §1.**

Global shell and Dashboard were redesigned to match the Figma reference (2026-08-05):

- **[Sidebar](../src/components/Sidebar/index.tsx)** — new persistent left nav (`bg-brand-900`, closest existing token to the mock's `#0f1c4d`), replacing the horizontal `Navbar` that used to render inside `Header`. Reuses `Navbar`'s exact permission-filtering (`useHasAccess`, `canViewCompanyTab`) and impersonation-exit logic — only the container changed from a horizontal bar to a vertical rail.
- **[MainLayout](../src/layouts/MainLayout.tsx)** — now renders `Sidebar` + a content column offset by `SIDEBAR_WIDTH` (240px); `Header` changed from `fixed`-over-content to `sticky`-in-flow, so the old `pt-16` spacer offset was removed. The two paths that used to hide the horizontal `Navbar` (`/profile`, `/change-password`) now hide the `Sidebar` instead, preserving the original "no primary nav" intent on those pages.
- **[Header](../src/components/Header/index.tsx)** — logo moved to the sidebar; the embedded `<Navbar />` render was removed. All existing handlers, RTK Query calls, and the two calendar modals are untouched — only the outer wrapper/positioning changed.
- **[Dashboard](../src/components/Dashboard/index.tsx)** and its **[CustomerTable](../src/components/Dashboard/CustomerTable.tsx)**, **[InterviewDashboard](../src/components/Dashboard/InterviewDashboard.tsx)**, **[RevenueGenerated](../src/components/Dashboard/RevenueGenerated.tsx)** / **[UpcomingRevenue](../src/components/Dashboard/UpcomingRevenue.tsx)** panels — swapped the four KPI cards' one-off pastel backgrounds (`bg-amber-50`, `#F58220`, `#6495EC`, etc.) for the brand accent set (navy/cyan/green) on a consistent white/bordered card, and gave every dashboard panel the same white-card treatment. All data fetching, role gating, and click handlers are unchanged — this was a styling-only pass.
- Not yet redesigned: everything outside Dashboard (Companies, Job Openings, Candidates, Company Settings, etc.) still uses prior styling. The shell change (Sidebar/Header/MainLayout) affects those pages automatically since they all render through `MainLayout`, but their own content hasn't been restyled.
- Verified via `tsc -b --noEmit` and a full `vite build` (both clean). Not verified with a live/logged-in screenshot — this app requires a real backend and auth session to reach any authenticated page, and no browser-automation tooling was available in this environment to drive it. Please sanity-check the shell and Dashboard visually before merging.

---

## 1. Color

### 1.1 Brand tokens (defined in `@theme`)

| Token                  | Hex       | Usage                                                                           |
| ---------------------- | --------- | ------------------------------------------------------------------------------- |
| `--color-cfp-navy`     | `#263d92` | Primary brand color — primary buttons, active avatar chips, package badges      |
| `--color-cfp-cyan`     | `#11b7dd` | Accent/brand-secondary — logo mark, active nav state, links, FAB, focus accents |
| `--color-cfp-lavender` | `#eef2ff` | Tinted background — page body background, package pill background               |
| `--color-cfp-ice`      | `#ecf7fb` | Secondary tinted background                                                     |
| `--color-cfp-surface`  | `#f9fafc` | Neutral surface background                                                      |

### 1.2 Extended palette (used inline, not yet tokenized)

**Neutrals / text**
| Color | Hex | Role |
|---|---|---|
| Ink / heading text | `#0f1c4d` | Card titles, KPI values, primary headings |
| Body text | `#1a2440` | Default body text color |
| Muted text | `#8892aa` | Secondary text, labels, subtext |
| Faint text | `#b0b8cc` | Tertiary/help text |
| Faintest text | `#c0c8da` | Chart axis labels, timestamps |
| Table label text | `#6b7fa3` | Table cell secondary text, dropdown inactive items |
| Menu item text | `#4a5470` | Dropdown menu item text |

**Backgrounds & surfaces**
| Color | Hex | Role |
|---|---|---|
| App background | `#f4f6fb` | Page canvas background |
| Card / surface | `#ffffff` | Card, panel, dropdown backgrounds |
| Table header background | `#fafbfe` | Table head row background |
| Sidebar background | `#0f1c4d` | Fixed sidebar (dark navy) |

**Borders / dividers**
| Color | Hex | Role |
|---|---|---|
| Standard border | `#eef0f6` | Card borders, header/footer dividers |
| Row divider | `#f5f6fa` | Table row / list item dividers |
| Input border | `#eaecf4` | Search box, buttons, dropdown triggers |
| Empty-state dashed border | `#e4e8f4` | Placeholder/"no data" boxes |
| Progress track | `#f0f2f8` | Progress bar background track |

**Accent set (data viz / quick actions)**
| Color | Hex | Role |
|---|---|---|
| Navy | `#263d92` | Primary accent (see brand) |
| Cyan | `#11b7dd` | Secondary accent (see brand) |
| Purple | `#6d5bd0` | Tertiary accent — "Schedule Interview" action, chart series |
| Green | `#059669` | Positive/success accent — "Record Revenue" action, chart series |
| Deep blue | `#0f4c82` | Additional avatar/series color |

**Status pills**
| Status | Background | Text |
|---|---|---|
| Active | `#ecfdf5` | `#065f46` |
| Pending | `#fffbeb` | `#92400e` |
| Inactive | `#fef2f2` | `#991b1b` |

**Sidebar-on-dark states** (white with opacity, for the navy sidebar)
| Opacity | Usage |
|---|---|
| `rgba(255,255,255,0.06)` | Sidebar hairline dividers, border |
| `rgba(255,255,255,0.08)` | Inactive nav badge background |
| `rgba(255,255,255,0.12)`–`0.2` | Active nav badge background |
| `rgba(255,255,255,0.25)` | "Main Menu" section label |
| `rgba(255,255,255,0.3)`–`0.35` | Muted sidebar sub-text, inactive badge text |
| `rgba(255,255,255,0.45)` | Inactive nav item label |

**Tint pattern**: accent colors are frequently reused as translucent backgrounds by appending a 2-digit hex alpha suffix, e.g. `${accent}12` (~7% opacity) for KPI icon swatches, `${accent}18` for divider lines under KPI cards, `#11b7dd14` for the "new" notification count chip. Reuse this pattern instead of inventing new tint colors: `<hex>12` / `<hex>14` / `<hex>18` for light tints on white surfaces.

**Shadow tints** (navy-based, not black) — see §4.

---

## 2. Typography

Fonts loaded via Google Fonts in `src/index.css`:

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap');
```

| Role      | Font family                                               | Weights available | Usage                                                              |
| --------- | --------------------------------------------------------- | ----------------- | ------------------------------------------------------------------ |
| Body / UI | `Inter, sans-serif`                                       | 400, 500, 600     | Default `body` font — all running text, labels, nav, table content |
| Display   | `'Plus Jakarta Sans', sans-serif` (class `.font-display`) | 600, 700, 800     | Headings, page title, KPI values, large numeric display            |

### Type scale (Tailwind utility classes observed)

| Class       | Size | Typical use                                      |
| ----------- | ---- | ------------------------------------------------ |
| `text-xs`   | 12px | Labels, subtext, table cells, badges, nav labels |
| `text-sm`   | 14px | Card titles, nav item labels, body copy          |
| `text-base` | 16px | Page title (`Dashboard`)                         |
| `text-xl`   | 20px | Empty-state "N/A" figure                         |
| `text-2xl`  | 24px | KPI card values                                  |

### Weight & tracking conventions

- Default body weight 400; `font-medium` (500) for emphasis/labels; `font-semibold` (600) for titles/buttons; `font-bold`/`font-extrabold` reserved for `.font-display` headings and KPI values.
- Section eyebrow labels (e.g. "Main Menu", table column headers) use `text-xs font-semibold uppercase tracking-wider` (or `tracking-widest` in the sidebar), in a muted color.
- Active states swap weight (400→500) rather than changing size.

---

## 3. Spacing & Layout

Base unit follows Tailwind's 4px scale. Observed increments: `1.5` (6px), `2` (8px), `2.5` (10px), `3` (12px), `3.5` (14px), `4` (16px), `5` (20px), `7` (28px).

| Token                | Value                      | Usage                                                         |
| -------------------- | -------------------------- | ------------------------------------------------------------- |
| Sidebar width        | `220px`                    | Fixed left nav; content area offset with `margin-left: 220px` |
| Page padding         | `px-7 py-6` (28px / 24px)  | Main content area                                             |
| Header padding       | `px-7 py-3`                | Top bar                                                       |
| Card padding         | `p-5` (20px)               | KPI cards, revenue panels                                     |
| Card section padding | `px-5 py-4`                | Table/panel header & footer rows                              |
| Table cell padding   | `px-5 py-3`                | Row padding                                                   |
| Gaps                 | `gap-1.5`–`gap-5` (6–20px) | Flex/grid gaps scale with content density                     |

### Grid layouts

- KPI row: `grid grid-cols-4 gap-4`
- Middle section (table + interviews panel): `grid` with `gridTemplateColumns: '1fr 340px'`, `gap-4`
- Revenue panels: `grid grid-cols-2 gap-4`
- Company table columns: `gridTemplateColumns: '2fr 1.2fr 80px 100px 80px 80px'` (Company / Phone / Interviews / Package / Recruiters / Status)

### Radius scale

| Class          | Value | Usage                                                 |
| -------------- | ----- | ----------------------------------------------------- |
| `rounded-sm`   | 2px   | Mini bar-chart bars, small color swatches             |
| `rounded`      | 4px   | Small badges (package/status pills)                   |
| `rounded-md`   | 6px   | Logo mark, avatar-initial squares                     |
| `rounded-lg`   | 8px   | Buttons, inputs, dropdown triggers, nav items         |
| `rounded-xl`   | 12px  | Cards, panels, dropdown/notification menus            |
| `rounded-full` | pill  | Avatars, status dots, progress bars, FAB action pills |

---

## 4. Elevation

This UI is largely **flat/bordered** (cards use a 1px `#eef0f6` border, not shadow) — shadows are reserved for floating/overlay elements, and are tinted navy or brand-color rather than pure black:

| Context                       | Shadow                                               |
| ----------------------------- | ---------------------------------------------------- |
| Dropdown / notification panel | `0 8px 40px rgba(15,28,77,0.14)`                     |
| Period-select menu            | `0 8px 32px rgba(15,28,77,0.12)`                     |
| Quick-action expanded buttons | `0 4px 16px rgba(15,28,77,0.18)`                     |
| Floating action button (FAB)  | `0 4px 20px rgba(17,183,221,0.35)` (brand-cyan glow) |

---

## 5. Iconography

Custom inline SVG icon set (no external icon library):

- `viewBox="0 0 24 24"`, `fill="none"`, `stroke="currentColor"`
- Default `strokeWidth: 1.6`, bumped to `2` for active/emphasized states
- `strokeLinecap="round"` `strokeLinejoin="round"`
- Rendered sizes range 11–18px depending on context (nav 15px, header actions 12–14px, inline arrows 11px, FAB 18px)

---

## 6. Components

### Sidebar (`Sidebar`)

Fixed, 220px, navy background (`#0f1c4d`), hairline white-opacity dividers. Logo mark: 28px rounded-md square in cyan with a 2×2 dot grid glyph, plus wordmark "hiresmartz" + "pro" in cyan. Nav items: 12px radius rows, icon + label + optional count badge; active state = `rgba(17,183,221,0.12)` background with cyan text/icon; inactive = transparent with `rgba(255,255,255,0.45)` text. Footer: user avatar chip (navy circle, white initial) + name/role, above a hairline divider.

### Top bar (header)

Sticky, white background, bottom border. Left: page title (`.font-display font-bold text-base`, `#0f1c4d`) + breadcrumb-style subtitle in muted gray. Right-aligned cluster: search input (bordered, `#f4f6fb` fill), period-select dropdown (bordered white button + checkmark list), notification bell (bordered icon button with cyan unread dot), user menu (bordered pill with avatar + name + chevron). Dropdowns are absolutely positioned white rounded-xl cards with the §4 shadow.

### KPI Card

White card, bordered, `p-5`, `flex-col gap-3`. Icon swatch: 32px rounded-lg square tinted at ~7% accent opacity containing an 8px solid accent square. Label in muted 12px, value in `.font-display text-2xl font-bold` navy, optional subtext. Divider line tinted at accent+18% opacity, footer note in accent color (used here for an "— No data yet" empty state).

### Data table (e.g. Companies)

White card, bordered, `rounded-xl overflow-hidden`. Header row: title + count subtitle + "View all" link (cyan, with arrow icon). Column header row: uppercase, `tracking-wider`, muted color, `#fafbfe` background. Body rows: hover `bg-slate-50`, bottom hairline divider (`#f5f6fa`), avatar-initial chip (28px rounded-md, colored by row index cycling through the accent set), package pill (`#eef2ff` bg / navy text), status pill (see §1 status colors).

### Progress bar (`Bar`)

1.5px-tall rounded-full track (`#f0f2f8`), filled bar colored per-series, `transition-all duration-700` for animated width changes.

### Notification / user dropdown panels

White, `rounded-xl`, bordered, §4 shadow, fixed width (320px notif / 208px user menu). List items separated by hairline dividers, hover `bg-slate-50`. Notification unread indicator: 6px cyan dot vs. `#e0e4f0` read dot.

### Quick Action FAB

Fixed bottom-right. Collapsed: 44px cyan rounded-xl button with plus icon, cyan glow shadow; rotates 45° on open (0.2s ease). Expanded: stacked pill buttons (per-action accent color, white text, navy-tinted shadow) sliding in above the FAB.

### Buttons

- **Primary/solid**: navy or cyan fill, white text, `text-xs font-semibold`, `rounded-lg`, `hover:opacity-90`.
- **Secondary/outline**: white fill, `#eaecf4` border, muted text, `hover:bg-slate-50`.
- **Text/link**: cyan text, no background, `hover:opacity-70`.

### Empty / no-data states

Dashed border box (`1px dashed #e4e8f4`) on `#fafbfe` fill, centered muted `.font-display` placeholder value ("N/A") + helper text in faint gray. Used for revenue panels pending real data.

---

## 7. Motion

- `transition-all` / `transition-colors` on interactive elements (buttons, rows, nav items).
- Progress bars animate width with `duration-700`.
- FAB rotates 45° over `0.2s ease` when opened.
- Hover states shift opacity (`hover:opacity-70/80/90`) rather than color for text/icon buttons, and background (`hover:bg-slate-50`) for list/row items.

---

## 8. Known issues in source (do not copy as-is)

The Figma Make prototype has at least one layout bug that must be **fixed**, not reproduced, when implementing these patterns for real:

- **Company table header collision.** The header row uses `gridTemplateColumns: '2fr 1.2fr 80px 100px 80px 80px'` with `text-xs font-semibold uppercase tracking-wider` labels. At that column width, adjacent uppercase/tracked labels don't have room to breathe and visually run together — confirmed in the rendered screenshot, where "INTERVIEWS"/"PACKAGE" render as `INTERVIEWSPACKAGE` and "RECRUITERS"/"STATUS" render as `RECRUITERSSTATUS`. When building the real table: widen the `Package`/`Recruiters`/`Status` columns to fit the tracked-uppercase label width (measure at the actual tracking value, don't eyeball it), and/or drop `tracking-wider` on narrow columns.
- More generally: because this is a Figma Make prototype (hand-rolled inline styles, mock/static data, `useState` for all "interactivity"), treat anything **structural or interaction-related** as unverified — column widths, breakpoint behavior, and empty/loading states were never tested against real data volumes. Only the **tokens** (color, type scale, spacing, radius) in §1–§5 should be treated as trustworthy; layout numbers should be re-validated against real content.

---

## 9. Notes for future prompts

- The source file has no component library (no shadcn/Radix/MUI) — everything is hand-rolled inline-style React. When redesigning existing app components, prefer mapping these tokens onto this project's actual UI kit rather than copying inline styles verbatim.
- No dark theme is defined in the source; all colors above are light-mode only.
- If the Figma file gains real design-library styles/variables in the future, re-run `search_design_system` / `get_variable_defs` against a `/design/` (not `/make/`) URL to pull canonical tokens instead of these reverse-engineered values.
