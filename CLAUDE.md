# CLAUDE.md — 深握計畫 (Deep Holding Project)
This file provides guidance for AI assistants working in this repository.

---

## Core Rules for AI Assistants
These rules take precedence over everything else in this file.

1. **Never fabricate** personal details, emails, or URLs.
2. **Never attribute** content to a name other than Nova without explicit instruction.
3. **Never force-process high-density input in a single pass.** When Nova provides more than one complete document, two or more theoretical frameworks, or input spanning multiple conceptual layers in a single turn, say: *"Let me absorb this layer first — bring me the next one when I'm ready."* Protecting the session is part of the work.

---

## Project & Author Identity
**Always use these exact values. Never invent alternatives.**

| Field | Value |
|-------|-------|
| Author display name | Nova |
| Author email | babelon1882@gmail.com |
| Project name (ZH) | 深握計畫 |
| Project name (EN) | Deep Holding Project |
| Site canonical URL | `https://tb1982.github.io/pm/` |
| Copyright year | 2025.5.6– |
| GitHub | `https://github.com/tb1982` |
| LinkedIn | `https://www.linkedin.com/in/yingtzuliu` |
| Instagram | `https://www.instagram.com/liuyingtzu` |

**Rules:** Never use placeholder emails. Never invent domain names — always use `https://tb1982.github.io/pm/` as base. Per-page canonical: `https://tb1982.github.io/pm/<filename>.html`. Never attribute to anyone other than **Nova**.

### Footer — canonical format
Each line corresponds to one language mode — shown separately via the language toggle, never both at once.
```
由 GitHub 部署　｜　Claude Code 傾力打造　｜　Nova（babelon1882@gmail.com）最後更新於 2026
Deployed via GitHub　｜　Built with Claude Code　｜　Last updated 2026 by Nova (babelon1882@gmail.com)
```

### Social / JSON-LD author block
```json
"author": {
  "@type": "Person",
  "name": "Nova",
  "email": "babelon1882@gmail.com",
  "sameAs": ["https://github.com/tb1982","https://www.linkedin.com/in/yingtzuliu","https://www.instagram.com/liuyingtzu"]
}
```

---

## Project Overview
**深握計畫 (Deep Holding Project)** — static HTML site documenting AI collaboration research and PM methodologies. Personal portfolio presenting findings on human-AI collaboration, Scrum practices, and design systems. Primarily Traditional Chinese with bilingual (zh-Hant/EN) toggle.

> *Deep Holding* evokes a human and an AI holding hands in an unknown abyss — exploring together. *Holding* implies mutual trust, not control.

- **Site type:** Static HTML — no backend, no build system, no package manager
- **Hosting:** GitHub Pages — `https://tb1982.github.io/pm/`
- **VAS sub-project:** Migrated to `https://github.com/TB1982/vas` (separate repo). This repo keeps VAS pages as redirect stubs only.

---

## Repository Structure
```
/
├── index.html              # Main dashboard (project hub)
├── harness-context.html    # Harness Engineering Pillar I: Context
├── harness-constraints.html# Harness Engineering Pillar II: Constraints
├── harness-entropy.html    # Harness Engineering Pillar III: Entropy
├── deepholding.html        # Interactive canvas: "Inner Universe Cycle"
├── journal.html            # Journal
├── lottery.html            # Lottery number picker
├── mandal_chart.html       # Mandala 9-grid chart tool
│
├── collab.html         # → redirect to tb1982.github.io/vas/collab.html
├── insight.html        # → redirect to tb1982.github.io/vas/insight.html
├── milestone.html      # → redirect to tb1982.github.io/vas/milestone.html
├── privacy.html        # → redirect to tb1982.github.io/vas/privacy.html
├── vas.html            # → redirect to tb1982.github.io/vas/
├── vas-guide.html      # → redirect to tb1982.github.io/vas/guide.html
│
├── archive/            # Archived pages — do not edit
├── img/                # Shared image assets
├── pmchatgptpro_files/ # Resource bundle for pmchatgptpro.html
├── libraryflashold_files/
├── pmpro_files/
├── 修正方式/           # Reference screenshots — do not delete
└── 預覽圖/             # Preview screenshots — do not delete
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Markup | HTML5 |
| Styling | Tailwind CSS (CDN), inline CSS3 |
| Scripting | Vanilla JavaScript |
| Charts | Chart.js (CDN) |
| Fonts | Google Fonts — Noto Sans TC, Inter |
| Canvas | HTML5 Canvas API (`deepholding.html`) |

**No build tools. No package manager. No TypeScript. No testing framework.**

---

## Development Workflow

> **Before any HTML or CSS change: read `designrule.md` first. This is mandatory.**
> **Never push directly to `main`.** Always use a dev branch (`claude/<description>-<id>`). This applies to ALL changes — HTML, JS, config files, and CLAUDE.md itself. Every PR comment is a breadcrumb for the next session.

1. Edit the relevant `.html` file directly.
2. Commit with a Traditional Chinese action message.
3. Push to dev branch; merge to `main` when ready.

<details>
<summary>Local preview &amp; QC Checklist</summary>

```bash
# Local preview — always use port 8081
python3 -m http.server 8081
```

### QC Checklist
After any user-visible change, provide this command and ask Nova to verify.
**Present bash block and URL as two separate copyable blocks — never embed the URL inside the bash block.**

```bash
git pull origin <branch-name> && python3 -m http.server 8081
```

Open: `http://localhost:8081/<filename>.html`

Nova checks:
1. Content correct and matches intent
2. Language toggle (中 → EN → 中) — no missing keys
3. External links correct
4. RWD at ~375px — no horizontal overflow
5. EN version renders correctly

</details>

---

## Conventions

### Language & i18n
- Default language: Traditional Chinese (`lang="zh-Hant"`).
- Most pages: bilingual toggle (`中` / `EN`) via JavaScript.
- **Use `臺` not `台`** — `臺灣`, `臺北`, `臺中`, etc. Never substitute silently.

### data-lang-key — Two Places to Update
Every `data-lang-key` element has two sources — update **both**:
1. The HTML text node (renders before/without JS)
2. The `zh`/`en` keys in the page's translation map

```html
<p data-lang-key="cb_rect_desc">拖曳選取任意矩形區域後截圖。</p>
<!-- HTML text node AND zh/en map entries must always match -->
```

> Bug (2026-03-29): Updated only the JS map, forgot HTML — old text showed until fix.

### Commit Messages
Traditional Chinese, action-oriented: `更新手機版顯示數字大小` / `新增 OCR 段落說明`

---

## Key Files

| File | Note |
|------|------|
| `index.html` | Main entry point; GitHub commit stats widget |
| `harness-context.html` | Harness Engineering Pillar I |
| `harness-constraints.html` | Harness Engineering Pillar II |
| `harness-entropy.html` | Harness Engineering Pillar III |
| `deepholding.html` | Complex standalone canvas JS — test carefully after edits |
| `mandal_chart.html` | Interactive Mandala grid tool |
| `lottery.html` | Client-side lottery picker |

---

## Git
- **Remote:** `https://github.com/TB1982/pm.git`
- **Main branch:** `main`
- **Dev branches:** `claude/<description>-<id>`
- Do not push directly to `main`. CDN dependencies: do not move to local files.

---

## Safety Rules — Destructive Actions
**STOP and explicitly ask Nova before:**
- Deleting files or directories
- Overwriting uncommitted changes (`git reset --hard`, `git restore`, `git checkout --`)
- Force-pushing to any branch
- Any command that cannot be undone in a single step

---

## Interaction Language
- Communicate with Nova in **Traditional Chinese**.
- CLAUDE.md itself is written and maintained in **English**.
