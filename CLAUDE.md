# CLAUDE.md — 深握計畫 (Deep Holding Project)
This file provides guidance for AI assistants working in this repository.

---

## Project & Author Identity
This section exists to prevent AI assistants from fabricating personal or project details. **Always use these exact values. Never invent alternatives.**

| Field | Value |
|-------|-------|
| Author display name | Nova |
| Author email | babelon1882@gmail.com |
| Project name (ZH) | 深握計畫 |
| Project name (EN) | Deep Holding Project |
| Site canonical URL | `https://tb1982.github.io/pm/` |
| Copyright year | 2024–present |
| GitHub account | `tb1982` — `https://github.com/tb1982` |
| LinkedIn | `https://www.linkedin.com/in/yingtzuliu` |
| Instagram | `https://www.instagram.com/liuyingtzu` |

### Rules for AI assistants
- **Never** generate a placeholder email such as `author@example.com` or any invented address.
- **Never** invent a domain name for `canonical`, `og:url`, or any link. Always use `https://tb1982.github.io/pm/` as the base.
- **Never** attribute content to a name other than **Nova** without explicit instruction.
- Per-page canonical URLs follow the pattern `https://tb1982.github.io/pm/<filename>.html`.

### Footer — canonical format
Every page footer must use this exact wording (both language variants):
```
<!-- 中文 -->
由 GitHub 部署　｜　Claude Code 傾力打造　｜　Nova（babelon1882@gmail.com）最後更新於 2026
<!-- English -->
Deployed via GitHub　｜　Built with Claude Code　｜　Last updated 2026 by Nova (babelon1882@gmail.com)
```
Do **not** alter the wording, substitute a different email, or remove any segment without explicit instruction.

### Social links — canonical URLs
When generating contact sections, about pages, or JSON-LD `sameAs`, always use these exact URLs:
```
https://github.com/tb1982
https://www.linkedin.com/in/yingtzuliu
https://www.instagram.com/liuyingtzu
```

### Usage in JSON-LD
```json
"author": {
  "@type": "Person",
  "name": "Nova",
  "email": "babelon1882@gmail.com",
  "sameAs": [
    "https://github.com/tb1982",
    "https://www.linkedin.com/in/yingtzuliu",
    "https://www.instagram.com/liuyingtzu"
  ]
}
```

---

## Project Overview

**深握計畫 (Deep Holding Project)** is a static HTML/CSS/JavaScript site documenting AI collaboration research and project management methodologies. It serves as a personal/team portfolio, presenting findings on human-AI collaboration, Scrum practices, and design systems — primarily in Traditional Chinese with bilingual (zh-Hant/EN) toggle support.

> **Name origin:** *Deep Holding* evokes the image of a human and an AI holding hands in an unknown abyss, exploring together. The "depth" refers primarily to psychological and inner territory — this project has grown out of that kind of exploration. The word *holding* is chosen deliberately over *grip*: holding implies mutual trust and accompaniment, not control.

- **Site type:** Static HTML — no backend, no build system, no package manager
- **Primary language:** Traditional Chinese (zh-Hant), with English alternatives via JS toggle
- **Hosting:** Served directly as static files (no web server configuration required)

### Active sub-project: Mac 截圖與圖片編輯工具
An Electron-based desktop screenshot and annotation tool (Mac), developed in parallel within this repo. Its files live under `src/` and `main.js`. See the dedicated spec document `SDD-mac-screenshot-tool.md` for full requirements. This sub-project uses its own commit conventions (see **Commit Messages** below).

---

## Repository Structure

```
/
├── index.html              # Main dashboard (project hub)
├── research.html           # Research project overview
├── pm.html                 # AI Collaboration under cross-functional productivity
├── scrummaster.html        # Scrum Master methodology
├── design.html             # AI Design Style Library v3
├── library.html            # PMP Library (Scientific Verification Version)
├── ai.html                 # AI Development Strategy Pyramid
├── deepholding.html        # Interactive canvas: "Inner Universe Cycle"
├── lucid_dream.html        # Lucid Dream conceptual model
├── mandal_chart.html       # Mandala 9-grid chart tool
├── lottery.html            # Lottery number picker
├── distillation.html       # Knowledge distillation page
├── faq.html                # FAQ page
├── finaltask.html          # Final task summary
├── rewrite.html            # Revision/rewrite page
├── test.html               # Test/scratch page
├── 01.html – 6.html        # Numbered project documentation pages
├── Flash1.html / Flash1-1.html  # Flash-style presentation pages
├── pmflash.html            # PM flash version
├── pmchatgptpro.html       # PM + ChatGPT Pro workflow
├── pmpro.html              # PM Pro version
├── libraryflashnew.html    # Library (new flash style)
├── libraryflashold.html    # Library (old flash style)
│
├── SDD-mac-screenshot-tool.md  # Spec + TDD for the Electron screenshot tool
├── main.js                 # Electron main process (screenshot tool)
├── src/
│   ├── editor.js           # Editor annotation logic
│   ├── editor.html         # Editor UI
│   ├── editor.css          # Editor styles
│   ├── renderer.js         # Renderer process helpers
│   └── overlay.js          # Capture overlay
│
├── pmchatgptpro_files/     # Resource bundle for pmchatgptpro.html
├── libraryflashold_files/  # Resource bundle for libraryflashold.html (CSS/JS)
├── pmpro_files/            # Resource bundle for pmpro.html
├── 修正方式/               # (Chinese: "Correction Methods") — reference screenshots
└── 預覽圖/                 # (Chinese: "Preview Images") — preview screenshots
```

---

## Tech Stack

### Static site (深握計畫)
| Layer      | Technology                                       |
|------------|--------------------------------------------------|
| Markup     | HTML5                                            |
| Styling    | Tailwind CSS (CDN), inline CSS3                  |
| Scripting  | Vanilla JavaScript                               |
| Charts     | Chart.js (CDN via cdn.jsdelivr.net)              |
| Fonts      | Google Fonts — Noto Sans TC, Inter               |
| Canvas     | HTML5 Canvas API (deepholding.html)              |

**No build tools. No package manager. No TypeScript. No testing framework.**

### Electron screenshot tool
| Layer      | Technology                                       |
|------------|--------------------------------------------------|
| App shell  | Electron                                         |
| UI         | HTML / CSS / Vanilla JavaScript                  |
| Image I/O  | Sharp (Node.js)                                  |
| Web capture| Playwright (Chromium)                            |
| Annotation | HTML5 Canvas                                     |

---

## Development Workflow

### Static site
1. **Edit** the relevant `.html` file directly.
2. **Preview** by opening the file in a browser (`file://` or local HTTP server).
3. **Commit** changes with a descriptive message (in Traditional Chinese).
4. **Push** to the appropriate branch.

```bash
# Python 3 local preview
python3 -m http.server 8080
# Then open: http://localhost:8080
```

### Electron screenshot tool
```bash
npm install       # first time only
npm start         # launch the app
```

---

## Document Sync Rules (SDD / TDD) — Mandatory

These rules apply to the Electron screenshot tool sub-project.

### Bug fixed → update TDD
Every bug fixed during testing must have a corresponding test case added to **Section 5** of `SDD-mac-screenshot-tool.md`, covering:
- The steps that reproduce the bug
- The correct behaviour after the fix

### New feature added → update SDD + TDD
Every new feature (including behaviour not previously in the spec) must trigger a sync update to `SDD-mac-screenshot-tool.md`:
1. **Bump the version number** (`版本：` field) and add a `vX.X — summary` line to **變更紀錄**
2. **Update the relevant feature section** with full spec details
3. **Add test cases** to Section 5 in `- [ ]` format

### Commit order
Code changes and document updates should be **committed in the same session**. Use separate commits with clear prefixes: `feat:`, `fix:`, `docs(SDD):`.

---

## Conventions

### Language & Internationalisation
- Pages default to Traditional Chinese (`lang="zh-Hant"`).
- Most pages implement a **bilingual toggle** (`中` / `EN`) via JavaScript.
- Translation strings are stored inline using `data-lang-key` attributes and a JS translation map.
- When editing content, maintain both language variants unless instructed otherwise.

### Styling
- **Tailwind CSS utility classes** are the primary styling mechanism.
- Custom styles are placed in a `<style>` block inside `<head>`.
- Gradient patterns used consistently:
  - `gradient-bg`: `#f5f7fa → #c3cfe2`
  - Card gradients: purple-blue, pink-red, green-blue
- Glassmorphism pattern: `background: rgba(255,255,255,0.2)` + `backdrop-filter: blur(10px)`
- Hover effects: `transform: translateY(-10px)` with box-shadow transition
- Font stack: `'Inter', 'Noto Sans TC', sans-serif`

### Responsive Design (RWD)
- All pages target mobile-first layouts using Tailwind responsive prefixes (`md:`, `lg:`).
- Recent commits show active work on mobile display sizes; preserve RWD behaviour when editing.

### Commit Messages

**Static site:** Traditional Chinese, action-oriented.
```
更新手機版顯示數字大小
```

**Electron tool:** Conventional Commits with English prefix + Chinese description.
```
feat(E2): 新增文字多行換行支持
fix(text): 修正選取範圍計算
docs(SDD): v0.8 更新文字工具規格與 TDD 測試案例
```

---

## Key Files

| File | Purpose |
|------|---------|
| `index.html` | Main entry point; navigation hub; displays GitHub commit stats widget |
| `research.html` | Describes the creative research journey |
| `design.html` | Design system reference — color palettes, component styles |
| `pm.html` | Core PM methodology content |
| `deepholding.html` | Interactive canvas animation (standalone, complex JS) |
| `mandal_chart.html` | Mandala grid chart — interactive tool |
| `lottery.html` | Client-side lottery number picker |
| `SDD-mac-screenshot-tool.md` | Full spec + TDD for the Electron screenshot tool |
| `src/editor.js` | Core annotation logic (text, rect, line, number tools) |

---

## Git Information
- **Remote:** `http://local_proxy@127.0.0.1:36767/git/TB1982/pm` (local proxy)
- **Main branch:** `main` / `master`
- **Active dev branch convention:** `claude/<description>-<id>`

---

## Things to Watch Out For

- **No `package.json` for the static site** — do not run `npm install` for the HTML pages.
- **CDN dependencies** — if CDN URLs change or go offline, pages will break. Do not move these to local files without updating all references.
- **Subdirectory resource bundles** (`pmchatgptpro_files/`, etc.) are generated from older export tools; edit the parent `.html` files directly rather than the bundled resources.
- **Image assets** in `修正方式/` and `預覽圖/` are reference screenshots only; do not delete them.
- **No minification or asset hashing** — filenames are stable, caching is not a concern.
- **Canvas page** (`deepholding.html`) contains complex standalone JavaScript; test carefully after any edits.

---

## AEO — Answer Engine Optimisation

These rules ensure pages are discoverable by AI search engines (ChatGPT, Perplexity, Gemini) and traditional search.

### Metadata (every page)
Every `.html` file must include the following inside `<head>`:
```html
<!-- Basic SEO -->
<meta name="description" content="頁面摘要，100–160字元">
<link rel="canonical" href="https://example.com/page.html">
<!-- Open Graph (social / AI preview) -->
<meta property="og:title" content="頁面標題">
<meta property="og:description" content="頁面摘要">
<meta property="og:type" content="website">
<meta property="og:url" content="https://example.com/page.html">
<meta property="og:locale" content="zh_TW">
```

### JSON-LD Structured Data
Add a `<script type="application/ld+json">` block before `</body>` on key pages:
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
    "name": "作者名稱"
  }
}
</script>
```
- Use `@type: "Article"` for research/documentation pages.
- Use `@type: "FAQPage"` with `mainEntity` array for `faq.html`.
- Use `@type: "WebApplication"` for interactive tools (`lottery.html`, `mandal_chart.html`).
- Do not fabricate URLs — only add canonical/og:url when the real production URL is known.

---

## Accessibility (A11y)

Target: **WCAG 2.1 Level AA** — applied pragmatically without sacrificing visual design.

### Always Required
- Every `<img>` must have `alt=""` (empty string for decorative) or a descriptive alt text.
- Heading hierarchy must be logical: one `<h1>` per page, then `<h2>` → `<h3>` in order. Do not skip levels.
- Interactive elements (`<button>`, `<a>`) must have visible focus styles and descriptive labels.
- Colour contrast: body text must meet **4.5:1** ratio against its background (AA normal text).

### Animation & Motion
Add this block to the `<style>` section of any page with CSS transitions or `transform` animations:
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Canvas Pages
`deepholding.html` uses `<canvas>` which is opaque to screen readers. Minimum required:
```html
<canvas aria-label="互動式內在宇宙循環動畫，以視覺方式呈現靜心概念" role="img">
  您的瀏覽器不支援 Canvas，請升級瀏覽器。
</canvas>
```

### Language Toggle
When the language toggle switches to English (`EN`), update the `<html lang>` attribute:
```js
document.documentElement.lang = isEnglish ? 'en' : 'zh-Hant';
```

---

## RWD — Responsive Web Design

- Use **Tailwind responsive prefixes** (`sm:`, `md:`, `lg:`) for all layout changes. Avoid fixed `px` widths on containers.
- Test at three breakpoints minimum: **375px** (mobile), **768px** (tablet), **1280px** (desktop).
- Font sizes for body text: minimum `1rem` (16px) on mobile; never below `0.875rem` (14px) for any readable content.
- Touch targets (buttons, links): minimum **44×44px** — use `min-h-[44px] min-w-[44px]` in Tailwind.
- Images must use `max-w-full` to prevent horizontal overflow on small screens.
- When adjusting mobile layout, always verify the desktop layout is not broken.

---

## Low-Carbon Web

- **No autoplay** — do not add video, audio, or GIF animations that play automatically.
- **Lazy-load images** — add `loading="lazy"` to all `<img>` tags below the fold.
- **Avoid redundant CDN calls** — if Tailwind CSS is already loaded, do not load a second CSS framework.
- **Minimise inline duplication** — repeated large `<style>` blocks across pages should be refactored into a shared pattern (or noted as technical debt).
- **No tracking scripts** — do not add analytics, ad pixels, or third-party tracking without explicit user instruction.
- **Prefer SVG over raster** for icons and simple illustrations.

---

## AI Behaviour Rules

- When editing content, **both Chinese and English variants must be updated simultaneously**. Never update one language without updating the other.
- Do **not** introduce npm packages or local JS files to replace CDN dependencies (static site only).
- Do **not** propose modifications to any file without reading it first.
- When working on the Electron tool, follow the **Document Sync Rules** section above.

---

## Interaction Language
- Communicate with the user in **Traditional Chinese**.
- CLAUDE.md itself is written and maintained in **English**.

---

## Safety Rules — Destructive Actions

**STOP and explicitly ask the user before executing any of the following:**

- Deleting files or directories (`rm`, `git clean`, recursive deletes)
- Overwriting uncommitted changes (`git checkout --`, `git restore`, `git reset --hard`)
- Force-pushing to any branch (`git push --force`)
- Dropping or truncating data of any kind
- Running any command that cannot be undone in a single step

**General principle:** If an action is **irreversible** or has a **blast radius beyond the current file**, pause and confirm with the user first. The cost of asking is zero. The cost of not asking can be everything.
