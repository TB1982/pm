# designrule.md — 深握計畫 設計規則
Read this before any HTML or CSS change.

---

## Styling

- **Tailwind CSS utility classes** are the primary styling mechanism.
- Custom styles go in a `<style>` block inside `<head>`.

### Visual language — aligned with VAS (2026-10)
`index.html` and `journal.html` follow VAS's current design (source of truth: `~/vas/css/tokens.css` dark, `~/vas/css/theme.css` light).
`deepholding.html`, `lottery.html`, `mandal_chart.html` still use their own older styles — not yet migrated.

| Token | Dark「器」(index, journal dark) | Light「思」(journal light) |
|-------|------|-------|
| Background | `#0e0b1a` (`--vas-void`), raised `#15121f` / `#1b1825` | paper `#faf8f3`, raised `#f2eee4` / `#eae4d6` |
| Text | `rgba(240,232,220, .94 / .78 / .60 / .55)` (`--vas-ash-0…3`) | ink `rgba(26,24,22, .96 / .80 / .66)` |
| Rule lines | `rgba(240,232,220, .08 / .18)` | `rgba(26,24,22, .12 / .24)` |
| Accent | violet `#c471f5`, pink `#fa71cd`, blue `#4facfe` | rust `#8b3a1f`, gold `#a8895c` |

- Surfaces: flat panels with a 1px hairline border — no drop shadows, no colourful gradient cards.
- Section header: mono label (`01 · FLAGSHIP`) above a serif `<h2>`.

### Motion
- Hover lift: `transform: translateY(-4px)` with border-colour transition.
- Always include reduced-motion guard on pages with CSS transitions:
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Typography
- Serif (body + headings, zh): `'Shippori Mincho', 'Noto Serif TC', 'Fraunces', serif`
- Serif (EN mode, wordmarks): `'Fraunces', 'Shippori Mincho', 'Noto Serif TC', serif`
- Mono (labels, credits, clock, buttons): `'JetBrains Mono', 'SF Mono', ui-monospace, monospace`
- Shippori Mincho loads up to weight 600 — never ask for 700 (also applies to canvas `context.font`).
- Noto Serif TC is a fallback only: Google Fonts downloads its slices just for glyphs Shippori lacks.
- Body text minimum: `1rem` (16px) on mobile; never below `0.875rem` for readable content.

### Orphan Prevention
Add to every page's `<style>` block:
```css
p { text-wrap: pretty; }
```
If orphans persist in one language, add `max-width: 54ch` to that specific element.

---

## Responsive Design (RWD)

- Mobile-first. Use Tailwind prefixes: `sm:` / `md:` / `lg:`.
- Never use fixed `px` widths on containers.
- Test at: **375px** (mobile) · **768px** (tablet) · **1280px** (desktop).
- Touch targets: minimum **44×44px** — `min-h-[44px] min-w-[44px]`.
- Images: `max-w-full` to prevent horizontal overflow.
- Always verify desktop layout after mobile changes.

---

## Accessibility (A11y)
Target: **WCAG 2.1 Level AA** — pragmatically, without sacrificing visual design.

- Every `<img>`: `alt=""` (decorative) or descriptive alt text.
- Heading hierarchy: one `<h1>` per page, then `<h2>` → `<h3>` in order. No skipping.
- Interactive elements (`<button>`, `<a>`): visible focus styles + descriptive labels.
- Colour contrast: body text **4.5:1** minimum against background.
- Language toggle: update `<html lang>` attribute when switching.
```js
document.documentElement.lang = isEnglish ? 'en' : 'zh-Hant';
```
- Canvas pages (`deepholding.html`): add `aria-label` and `role="img"` to `<canvas>`.

---

## Low-Carbon Web

- **No autoplay** — no video, audio, or GIF that plays automatically.
- **Lazy-load images** — `loading="lazy"` on all `<img>` below the fold.
- **No redundant CDN calls** — Tailwind loaded once; never add a second CSS framework.
- **No tracking scripts** — no analytics, ad pixels, or third-party tracking without explicit instruction.
- **Prefer SVG** over raster for icons and simple illustrations.

---

## AEO — Answer Engine Optimisation
Every `.html` file must include inside `<head>`:
```html
<meta name="description" content="頁面摘要，100–160字元">
<link rel="canonical" href="https://tb1982.github.io/pm/page.html">
<meta property="og:title" content="頁面標題">
<meta property="og:description" content="頁面摘要">
<meta property="og:type" content="website">
<meta property="og:url" content="https://tb1982.github.io/pm/page.html">
<meta property="og:locale" content="zh_TW">
```

Add JSON-LD before `</body>` on key pages:
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "頁面名稱",
  "description": "頁面描述",
  "inLanguage": "zh-Hant",
  "author": {
    "@type": "Person",
    "name": "Nova",
    "email": "babelon1882@gmail.com"
  }
}
</script>
```

`@type` guidance:
- `"Article"` — research / documentation pages
- `"WebApplication"` — interactive tools (`lottery.html`, `mandal_chart.html`)
- Do not fabricate URLs — only add canonical/og:url when the real production URL is known.
