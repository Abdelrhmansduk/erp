---
name: ui-ux-design-system
description: "Mobbin Design System skill (from DESIGN-mobbin.md): gallery-white monochrome palette (#141414 ink on #ffffff canvas), shadow-free neutral tint ladder (#f3f3f3, #f0f0f0, #e0e0e0), electric blue commercial signal (#0066ff), Saans/Inter variable typography (652/456/300), stadium-pill controls, 24px cards, 16px inputs, and 30% squircle icons."
---

# Mobbin UI/UX & Design System Skill (`DESIGN-mobbin.md`)

## When to Use This Skill
Use this skill whenever designing, refactoring, or auditing any UI page, component, form, or stylesheet in the Khalid Al-Sulaim Holding Group ERP (`src/pages/`, `src/components/`, `src/styles/`).

---

## 1. Strict Monochrome Color Ladder & Single Accent (`DESIGN-mobbin.md` §Colors)

- **Ink Black (`--color-primary` / `--color-ink`: `#141414`)**: Fills every primary CTA pill (`button-primary`), the inverse footer band (`footer`), and all display/heading typography.
- **Pure White (`--color-on-primary` / `--color-canvas`: `#ffffff`)**: Default page and resting card background across all pages.
- **Soft Canvas (`--color-canvas-soft`: `#f3f3f3`)**: 6% ink wash over white. Fills `nav-pill`, `pricing-card-featured`, `ex-auth-form-card`, `segmented-control` tracks, `button-pill-soft`, and `faq-row`.
- **Field (`--color-field`: `#f0f0f0`)**: 8% ink wash used as the borderless fill for form inputs (`text-input`).
- **Soft Hairline (`--color-hairline-soft`: `#f0f0f0`)**: `1px` card outlines on white-on-white cards.
- **Hairline (`--color-hairline`: `#e0e0e0`)**: `1px` control border on `button-outline` and table dividers.
- **Soft Ink (`--color-ink-soft`: `#262626`)**: Hover state for `#141414` pills and secondary lockups.
- **Muted Text (`--color-text-muted`: `#707070`)**: Supporting paragraphs, inactive tab labels, subtitles.
- **Faint Text (`--color-text-faint`: `#adadad`)**: Placeholders, captions, footer fine print.
- **Electric Blue (`--color-accent`: `#0066ff`)**: The **ONLY** chromatic accent in the system. Reserved exclusively for `badge-popular` commercial signals (`PRO 2026`, `ENTERPRISE`). Never use `#0066ff` for CTA buttons!

---

## 2. Variable Typography Rules (`Saans` / `Inter Variable` + `Readex Pro`)

| Role | Class | Size | Weight | Line Height | Letter Spacing |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `display` | `.mobbin-display` | `80px` | `652` | `1.0` | `0` |
| `heading-1` | `.mobbin-heading-1` | `56px` | `652` | `1.0` | `0` |
| `heading-2` | `.mobbin-heading-2` | `44px` | `652` | `1.13` | `0` |
| `heading-3` | `.mobbin-heading-3` | `32px` | `652` | `1.13` | `0` |
| `heading-4` | `.mobbin-heading-4` | `24px` | `652` | `1.25` | `0` |
| `title` | `.mobbin-title` | `20px` | `600` | `1.3` | `0` |
| `body-lg` | `.mobbin-body-lg` | `20px` | `300` | `1.38` | `0` |
| `body` | `.mobbin-body` | `16px` | `456` | `1.38` | `0` |
| `body-sm` | `.mobbin-body-sm` | `14px` | `456` | `1.43` | `0` |
| `link` | `.mobbin-link` | `16px` | `600` | `1.38` | `0` |
| `label` | `.mobbin-label` | `12px` | `600` | `1.33` | `0` |
| `caption` | `.mobbin-caption` | `12px` | `456` | `1.33` | `0` |

- **Weight Contrast**: Pair `652`-weight headings with `300`-weight `.mobbin-body-lg` subtitles for dramatic hierarchy without color.
- **Zero Letter-Spacing**: Always keep `letter-spacing: 0`.
- **Terminal Periods**: End primary hero and auth headlines with a period (`.`).

---

## 3. Shapes, Elevation & Component Do's and Don'ts

### Do:
- Use `{rounded.full}` (`9999px`) for **every** button, nav bar, badge, and toggle (`nav-pill`, `button-primary`, `button-outline`, `button-pill-soft`, `segmented-control`).
- Use `{rounded.md}` (`24px`) for content cards (`ex-auth-form-card`, `pricing-card`, `ex-modal-card`) and footer top corners (`rounded-t-[24px]`).
- Use `{rounded.sm}` (`16px`) for form inputs (`text-input`), accordion rows (`faq-row`), and inner tiles.
- Use `border-radius: 30%` (`.app-icon-squircle`) for app/sector icon tiles.
- Build elevation with **neutral tint fills (`#f3f3f3`, `#f0f0f0`) and `1px` hairlines (`#f0f0f0`, `#e0e0e0`)** instead of drop shadows.
- Close pages with the polarity-inverted `#141414` (`{colors.ink}`) footer with `24px` rounded top corners.

### Don't:
- Don't add drop shadows to cards, buttons, or navigation bars.
- Don't put borders on form inputs at rest; inputs use `#f0f0f0` / `#ffffff` fill and show a **`2px solid #141414` ring on focus**.
- Don't use `#0066ff` for buttons; primary actions are always `#141414` pills.
- Don't square off buttons at small sizes; all interactive pills remain `rounded-full`.
