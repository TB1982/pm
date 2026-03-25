# 深握計畫 Deep Holding Project

> *人與 AI 在未知深淵中相握探索——深，指的是心理與內在的縱深；握，是陪伴，不是控制。*

**作者：** Nova（babelon1882@gmail.com）
**網站：** https://tb1982.github.io/pm/
**GitHub：** https://github.com/tb1982

---

## 專案簡介

這是一個靜態網站，記錄 AI 協作研究與專案管理方法論的探索歷程。內容涵蓋人機協作、Scrum 實踐、設計系統，以及各種互動工具的開發過程，主要以繁體中文撰寫，並提供中英雙語切換。

同一個 repo 內，也收錄了 **Vas** — 一款 Mac 截圖與圖片編輯工具（Electron 桌面應用）的原始碼。

---

## 目錄結構

```
/
├── index.html              # 主頁儀表板（導航樞紐）
├── research.html           # 研究計畫概述
├── pm.html                 # AI 協作與跨職能生產力
├── scrummaster.html        # Scrum Master 方法論
├── design.html             # AI 設計風格庫 v3
├── library.html            # PMP 知識庫（科學驗證版）
├── ai.html                 # AI 發展策略金字塔
├── deepholding.html        # 互動 Canvas「內在宇宙循環」動畫
├── lucid_dream.html        # 清醒夢概念模型
├── mandal_chart.html       # 曼陀羅九宮格工具
├── lottery.html            # 樂透號碼選號工具
├── distillation.html       # 知識蒸餾頁面
├── faq.html                # 常見問題
├── vas.html                # Vas 工具 Landing Page
│
├── SDD-mac-screenshot-tool.md  # Vas 規格文件（SDD + TDD）
├── main.js                     # Electron 主程序
├── package.json
└── src/
    ├── editor.html / editor.js / editor.css  # 標註編輯器
    ├── renderer.js             # Renderer 輔助
    ├── overlay.js / overlay.html             # 截圖覆蓋層
    └── screen-select.js / screen-select.html # 螢幕選取
```

---

## 技術棧

### 靜態網站

| 層面 | 技術 |
|------|------|
| 標記 | HTML5 |
| 樣式 | Tailwind CSS（CDN）、內嵌 CSS3 |
| 腳本 | Vanilla JavaScript |
| 圖表 | Chart.js（CDN） |
| 字型 | Google Fonts — Noto Sans TC、Inter |
| Canvas | HTML5 Canvas API |

> 無任何建構工具、套件管理器、TypeScript 或測試框架。

### Vas（Electron 工具）

| 層面 | 技術 |
|------|------|
| 應用殼層 | Electron |
| UI | HTML / CSS / Vanilla JavaScript |
| 圖片處理 | Sharp（Node.js） |
| 網頁截圖 | Playwright（Chromium） |
| 標註 | HTML5 Canvas |

---

## 快速開始

### 靜態網站（本地預覽）

```bash
python3 -m http.server 8080
# 開啟 http://localhost:8080
```

### Vas 桌面工具（Mac）

```bash
npm install   # 第一次執行
npm start     # 啟動應用程式
```

---

## 關於 Vas

Vas 是一款 Mac 桌面截圖 + 圖片標註工具，支援：

- 全螢幕 / 區域截圖
- 圖片匯入與批次轉換（PNG / JPG / GIF）
- 文字、矩形、線條、編號等標註工具
- Apple 風格漸層一鍵套版（六色）
- 社群尺寸快選（LinkedIn / Instagram / X）

完整規格見 [`SDD-mac-screenshot-tool.md`](./SDD-mac-screenshot-tool.md)（版本 3.26）。

---

## 聯絡

- GitHub：https://github.com/tb1982
- LinkedIn：https://www.linkedin.com/in/yingtzuliu
- Instagram：https://www.instagram.com/liuyingtzu
- Email：babelon1882@gmail.com

---

Deployed via GitHub　｜　Built with Claude Code　｜　Last updated 2026 by Nova (babelon1882@gmail.com)
