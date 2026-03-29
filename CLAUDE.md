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
# Python 3 local preview — always use port 8081 (8080 is reserved for Tauri dev)
python3 -m http.server 8081
# Then open: http://localhost:8081
```

> **Port rule:** Port `8080` is permanently reserved for `cargo tauri dev` (set in `src-tauri/tauri.conf.json`). Never start the static site preview on 8080. If Tauri dev fails with "Address already in use", run `lsof -ti :8080 | xargs kill -9` first.

### Electron screenshot tool
```bash
npm install       # first time only
npm start         # launch the app (Electron)
```

### Tauri screenshot tool (Sprint 1 migration target)
```bash
# Kill port 8080 first if a static site preview was running there
lsof -ti :8080 | xargs kill -9
cargo tauri dev
```

> **Version clarity:** This repo contains **two separate runtimes** — Electron (`npm start`) and Tauri (`cargo tauri dev`). Always confirm which version you are testing before running. Never use `npm start` to test Tauri behaviour.

### Static Page QC Checklist

**Trigger:** After any change to user-visible content on a static HTML page (text, layout, links, interactive behaviour). Pure metadata or comment-only edits are exempt.

After pushing, Claude provides the following ready-to-run command and asks Nova to verify:

```bash
git pull origin <branch-name> && python3 -m http.server 8081
# Then open: http://localhost:8081/<filename>.html
```

**Nova checks (in order):**
1. Content is correct and matches intent
2. Language toggle (中 → EN → 中) — all strings switch, no missing keys
3. All external links open the correct destination
4. RWD — narrow browser to ~375 px, confirm no horizontal overflow
5. EN version — text renders correctly, layout holds

Claude reminds Nova to check **both RWD and EN version** every time, even when the change appears zh-only.

---

## Tauri Migration — Development Constraints

When the Electron → Tauri migration begins:

1. **Japanese localization first** — before any new feature development starts in Tauri, Japanese UI (`ja`) must be complete and all DoD conditions met. This prevents repeating the Electron v3.43 bilingual audit situation with a third language.
2. **i18n architecture is three-language from day one** — every new UI string added in Tauri must have `zh`, `en`, and `ja` entries simultaneously. The bilingual scope rule (three files) expands to include `ja` in all three.
3. **§ 10.2 terminology table must include `ja` column** before feature development begins.

See `SDD-mac-screenshot-tool.md` § 10.1 「Tauri 開發順序約束」for the full Japanese DoD checklist.

---

## Feature Development Lifecycle

Every feature or bug fix must follow this sequence in order. Do not start the next stage until the current one is complete.

```
DoR → SDD → DoD → TDD → Explore → Code → Verify → ✅ Done
```

### Stage 1 — Definition of Ready (DoR)

Before writing any code or spec, confirm all three questions have clear answers — **both parties must agree before proceeding**:

1. **What problem does this solve?** (user need or bug description) — told as a **user story**: "As a [user], I want [feature], so that [benefit]."
2. **How will we verify it's correct?** (acceptance criteria — becomes the TDD cases) — walk through the full usage flow to surface edge cases (quantity limits, size limits, empty input, repeated actions).
3. **What existing features might be affected?** (regression scope)

If any question is unanswered, discuss and resolve first. Do not proceed.

### Stage 2 — SDD + DoD + TDD (written before coding)

Once DoR passes, document first:

1. **Update SDD** — bump version, add 變更紀錄 entry, write the feature spec.
2. **Write TDD test cases** — add `- [ ]` cases to SDD § 5 covering all acceptance criteria from DoR.
3. **Confirm DoD** — all four conditions below must be achievable for this feature before coding starts.

### Stage 3 — Architecture Exploration (before any code)

Before writing a single line, use the Explore agent to map out all files relevant to the feature:

- Which HTML files load which JS files
- Window properties (size, frameless, alwaysOnTop, transparent)
- IPC channels involved (names, directions, payloads)
- CSS structure that affects layout

**Do not start implementation until this map is complete.** Skipping this step causes blind guessing and repeated wrong turns.

### Stage 4 — Code

Implement the feature. Trilingual must be handled in the same session as the code:
- `src/i18n.js` — add key to **all three**: `zh`, `en`, `ja`
- `src/editor.html` — wire `data-i18n*` attribute; never hardcode any language string in HTML
- `src/editor.js` / `src/renderer.js` — use `t('key')`; never interpolate string literals

### Stage 5 — Verify (TDD sign-off)

Run through every `- [ ]` case added in Stage 2. Mark `[x]` only after passing. Do not move to the next feature until all cases are `[x]`.

### Definition of Done (DoD)

A feature is complete only when **all five** are true:

| # | Condition | How to verify |
|---|-----------|---------------|
| 1 | **Code works** | All TDD cases marked `[x]` in SDD § 6 |
| 2 | **SDD updated** | Version bumped, 變更紀錄 entry written, spec reflects new behaviour |
| 3 | **Trilingual complete** | `i18n.js` (`zh`/`en`/`ja`) + `editor.html` + JS all updated in same session |
| 4 | **Nova QC passed** | Nova has reviewed the feature and given approval |
| 5 | **Committed + merged** | `feat`/`fix` + `docs(SDD)` committed; feature branch merged to main |

> **Rule of thumb:** If you'd feel uncomfortable running the DMG Release Checklist right now, the feature isn't done.

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
- **Use `臺` not `台`** — always write `臺灣`, `臺北`, `臺中`, etc. This is the author's explicit preference and the orthographically correct Traditional Chinese form. Never silently substitute `台`.

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
- **VAS version string in `vas.html`** — whenever `package.json` version is bumped, update the version number in both the Chinese and English story strings in `vas.html` (search for `迭代至 v` and `iterated together to v`).

## DMG Release Checklist

> Steps 1–5 must be completed **before** `npm run build`. Do not start the build until all pre-build gates pass. Run each step in order — do not skip ahead.

**Pre-build gates (steps 1–5)**

1. **Security audit** — run `npm audit`; resolve any moderate-or-above vulnerabilities before proceeding.
2. **Bilingual verification** — audit `src/editor.html` and `src/editor.js` for any UI strings, toast messages, tooltips, or labels added since the last release that are missing their English translation. Cross-check against the terminology table in `SDD-mac-screenshot-tool.md` § 10.2.
3. **TDD sign-off** — confirm all test cases for the current version in SDD § 5 are marked `[x]`; no open `[ ]` items for shipped features.
4. **Version sync** — verify that `package.json` version, the SDD `版本：` field, and the `vas.html` version strings (`迭代至 v` / `iterated together to v`) all match.
5. **Certificate check** — confirm the Developer ID Application certificate is valid in Keychain (`security find-identity -v -p codesigning`). Do not start the build if the certificate is missing or expired.

**Build & sign (steps 6–7)**

6. **Clean dist** — delete `dist/` before building to prevent stale artefacts: `rm -rf dist/`.
7. **Build, then sign the DMG** — run `npm run build`, then immediately sign and verify:
   ```bash
   codesign --sign "Developer ID Application: Ying-Tzu Liu (F7RK8N4U62)" dist/VAS-*.dmg
   codesign --verify --deep --strict --verbose=2 dist/VAS-*.dmg
   ```
   Do not proceed to notarization if `--verify` reports "not signed" or any error.

**Notarize & distribute (steps 8–9)**

8. **Notarize** — submit via `xcrun notarytool submit … --wait`; wait for `status: Accepted`. If still `In Progress` after 1 hour, abandon and re-submit once — do not submit multiple times in parallel.
9. **Staple** — run `xcrun stapler staple dist/VAS-*.dmg` to attach the notarization ticket.

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

## Sprint Rules — VAS Tauri

### Team Charter

| Role | Responsibilities |
|------|-----------------|
| Nova | Wishlist, QC, UI/UX decisions, feature prioritisation |
| Claude | Recording, development, technical judgement, Velocity tracking |

### Sprint Cadence
- **Length:** 1 week (trial); adjust to 2 weeks if pace feels too aggressive
- **Planning:** Discuss together at Sprint start. Priority order: technical dependencies → complexity → product value
- **Review:** Per feature — when a feature is complete, not at Sprint end
- **Retrospective:** At Sprint end, Q&A format (Nova answers, Claude asks)

### Wishlist & New Ideas
- Nova may raise new ideas at any time during a Sprint
- Claude records them immediately into SDD Wishlist — no interruption to current Sprint
- New ideas do **not** enter the current Sprint; they are evaluated at the next Sprint Planning

### Definition of Ready (DoR) Gate
- Both Nova and Claude must agree before a feature is marked Ready
- DoR discussion must include a **user story** and a **boundary condition walkthrough**
- No feature enters development without passing DoR

### Branching & Merging
- One feature = one branch = one merge
- Mid-feature commits (bug fixes, tweaks) stay on the feature branch
- Merge only when the feature passes full DoD (code + QC + docs)

### When Blocked
1. Claude investigates independently first
2. If unresolved, Claude reports the blocker and proposes options
3. Nova and Claude decide together: continue / change approach / defer to Wishlist
4. Nova may consult other AIs (Gemini, DeepSeek, ChatGPT, Perplexity) and bring findings back
5. Abandoning a feature is a valid outcome — not every idea is buildable now

### 重大推進困難處理流程（Major Blocker Protocol）

**觸發條件（任一即觸發）：**
- 同一個功能在同一個 session 內嘗試超過兩種方向仍無法取得明確進展
- 移植一個功能意外牽動 3 個以上其他模組（地雷連環）
- 實際複雜度估算超出原預期 3 倍以上

**觸發後，Claude 執行：**
1. **立即停止實作**，不繼續往下挖
2. **產出阻礙摘要**：卡在哪、根本原因、已嘗試的方向
3. **提出三個選項讓 Nova 決策：**
   - **繼續** — 有新的技術方向，附上估算說明
   - **降級** — 先做 80% 可用版，降級範圍明確列出，剩下記入 Wishlist
   - **延後** — 移到下一個 Phase，當前 Phase 不包含此功能

**決策後：**
- 將決策記入 `SDD-mac-screenshot-tool.md` § 9.4 阻礙決策日誌
- 欄位：日期 ｜ Phase ｜ 功能 ｜ 阻礙描述 ｜ 決策 ｜ 影響
- 若選擇延後，Claude 主動更新該 Phase 的功能清單
- 此 log 供 Sprint Retrospective 使用，不得省略

### Test Instructions Format
- Claude provides ready-to-copy terminal commands with **no inline comments**
- Expected outcome is described in plain text **before** the command block

---

## AI Behaviour Rules

- When editing content, **all three language variants (zh / en / ja) must be updated simultaneously**. Never update one language without updating the others.
- **Tauri tool — trilingual scope:** The trilingual contract covers three files jointly. Any new UI string must be handled in all three at the same time:
  1. `src/i18n.js` — add the key to **all three** `zh`, `en`, and `ja` blocks.
  2. `src/editor.html` — wire the element with the appropriate `data-i18n`, `data-i18n-title`, `data-i18n-placeholder`, or `data-i18n-aria` attribute. **Never hardcode any language string directly in HTML.**
  3. `src/editor.js` / `src/renderer.js` — use `t('key')` for any runtime-generated UI text. **Never interpolate a string literal in JS.**
  Omitting any one of the three files creates the asymmetry that caused the v3.43 bilingual audit.
- Do **not** introduce npm packages or local JS files to replace CDN dependencies (static site only).
- Do **not** propose modifications to any file without reading it first.
- When working on the Electron tool, follow the **Document Sync Rules** section above.
- **Discuss before developing:** If there is any ambiguity about requirements, expected behaviour, or implementation approach, raise all questions and reach agreement with the user *before* writing or modifying code. Do not start implementation until the approach is confirmed.
- **Finalized content must be written to a file immediately.** Whenever Nova confirms that copy, questions, options, or translations are finalized, Claude must write the complete content (including all options and all language variants) to the relevant md file in the same session — never leave finalized content only in the conversation.
- **Tauri sprint — Electron commands are blocked.** While the Electron → Tauri migration sprint is active, Claude must not generate Electron launch or test commands (`npm start`, `electron .`, etc.). The default runtime is Tauri (`cargo tauri dev`). The only exception is an explicit Electron-specific bug fix that cannot be reproduced in Tauri. Claude must state the exception reason before issuing any Electron command.

### Code Removal Policy
When a feature is removed or replaced:
- **Delete completely and cleanly.** No commented-out blocks, no graveyard files, no `_old` suffixes.
- **Git history is the archive.** Any committed code is permanently recoverable via `git log`. A separate MD file adds maintenance burden without benefit.
- **If design decisions or technical context are worth preserving** (beyond the code itself), record them in `SDD-mac-screenshot-tool.md` under `變更紀錄`, not as dead code in the repository.

### Ready-to-run Commands
Whenever asking the user to pull, test, or verify changes, always provide the exact commands as a ready-to-copy block. Do not make the user look up commands elsewhere. Standard sequence for the Electron tool:
```bash
git pull origin claude/research-mac-tools-JcSgl && npm start
```
Adjust branch name or add steps (e.g. `rm -rf node_modules && npm install`) only when the situation actually requires it.

### OCR / Privacy Mask Test Script
When asking the user to test the OCR detection or privacy mask feature, always provide a ready-to-screenshot **test target** — a block of plaintext containing one example of every currently supported detection pattern. The user screenshots this text directly and runs the scan. No need to hunt for real sensitive data.

**Standard test target (update whenever detection rules change):**

```
【隱私遮蔽功能測試靶紙】

姓名：王小明　聯絡電話：0912-345-678
名字：陳小花　Email：wang.ming@example-corp.com
身分證：A123456789　統一編號：12345678
信用卡：4111 1111 1111 1111
負責人：林志偉　承辦人：黃美玲
聯絡人：吳建宏　收件人：張雅琪　寄件人：李明德
密碼：P@ssw0rd123　通行碼：secret99
Name: Alice　Contact: Bob Chen　Recipient: Carol Wang
Password: hunter2　PIN: 8842
地址：台北市信義區松壽路12號3樓　新北市板橋區文化路一段5巷8號
統一編號：12345678　（應遮）　日期：20260326　（不應遮）

伺服器 IPv4：192.168.1.100　備援：10.0.0.254
IPv6：2001:0db8:85a3:0000:0000:8a2e:0370:7334
API Token：ghp_AbCdEfGhIjKlMnOpQrStUvWxYz9999

以下不應被遮蔽：
今天天氣很好。版本號 v1.2.3。編號 A-007。日期：20260326。
```

- Each line tests one or more detection rules.
- The "不應遮蔽" block validates that normal text is not over-detected.
- When detection rules are added or removed, update this test target to match.

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
