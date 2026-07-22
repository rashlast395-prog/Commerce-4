# Richy's Eat — Design System

Canonical source of truth. Lives in code at `packages/design-tokens`
(`tokens.css` for CSS custom properties + component classes, `src/index.ts`
for programmatic access e.g. status-color mapping). Every frontend
(customer-web now, admin-web/rider-web in later phases) imports the same
package — do not fork or redefine these values per-app.

## Color

| Token | Value | Use |
|---|---|---|
| `--re-primary` | `#0F766E` (deep teal) | Primary actions, links, brand |
| `--re-secondary` | `#06B6D4` (cyan) | Gradients, secondary accents |
| `--re-accent` | `#10B981` (emerald) | Success-adjacent accents, badges |
| `--re-bg` | `#F8FAFC` | Page background |
| `--re-surface` | `#FFFFFF` | Cards, panels |
| `--re-text` | `#0F172A` | Primary text |
| `--re-muted` | `#64748B` | Secondary text |
| `--re-success` / `--re-warning` / `--re-error` | `#22C55E` / `#F59E0B` / `#EF4444` | Status states |

Gradients: `--re-gradient-primary` (teal → cyan, primary CTAs/hero) and
`--re-gradient-accent` (cyan → emerald, active/selected states) — used
distinctly, not interchangeably.

## Typography

- Headings: **Poppins** (600/700)
- Body/UI: **Inter**
- Numbers & prices: **Space Grotesk** (`.re-numeric` class, tabular figures)

## Spacing, radius, shadow

- 8px spacing scale: `--re-space-1` (4px) through `--re-space-7` (64px)
- Radius: `--re-radius-sm` (8px) → `--re-radius-xl` (20px), `--re-radius-pill` for chips/badges
- Shadows: `--re-shadow-sm/md/lg` for elevation, `--re-shadow-hover` (teal-tinted) for interactive lift
- Glassmorphism: `.re-glass` utility (used on the sticky navbar) — `backdrop-filter: blur(16px)` with translucent surface

## Motion

- `--re-dur-fast/base/slow` (150/250/400ms), `--re-ease` standard easing
- `.re-animate-fade`, `.re-animate-slide-up` entrance animations
- `.re-hover-lift` for card hover, image zoom built into `.re-food-card__image-wrap img`
- `prefers-reduced-motion` respected globally (animations collapse to ~0ms)

## Core components (all in `tokens.css`)

`.btn-re-primary` / `.btn-re-secondary`, `.re-form-control` / `.re-label`,
`.re-card` / `.re-hover-lift`, `.re-badge` (+ accent/success/warning/error
variants), `.re-food-card` (image zoom, favorite toggle, rating, price,
add-to-cart), `.re-category-chip`, `.re-skeleton` (loading shimmer).

## History

Palette went through two revisions before landing here — orange/amber was
built and fully wired first, then replaced with this teal/cyan/emerald
system per explicit direction. Token-based architecture (no hardcoded hex
in app code) is what made the second swap a ~30 line diff instead of a
rewrite — keep it that way in future phases.
