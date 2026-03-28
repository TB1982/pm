# SDD：VAS — Tauri 版

**版本：** 0.2
**日期：** 2026-03-28
**狀態：** 規劃中
**前身：** `SDD-mac-screenshot-tool.md`（Electron 版，已封存，git tag `electron-final`）

---

## 變更紀錄

| 版本 | 日期 | 摘要 |
|------|------|------|
| v0.1 | 2026-03-28 | 初版：架構框架 + Product Backlog 整理自 Electron SDD |
| v0.2 | 2026-03-28 | Tauri 2 scaffold 建立完成（`src-tauri/` 初始化）；補記開發環境版本 |

---

## 1. 專案概述

**VAS（Visual Annotation Studio）** 是一款 Mac 原生桌面截圖與圖片標注工具。
Tauri 版為 Electron 版的架構遷移，前端 UI（HTML / CSS / Vanilla JS）完整保留，僅替換底層 App shell。

### 遷移動機

| 考量 | Electron | Tauri 目標 |
|------|----------|-----------|
| 安裝包體積 | ~150–250 MB（含 Chromium） | ~5–20 MB（使用系統 WebView） |
| 記憶體佔用 | 高（Chromium 常駐） | 低 |
| 原生 API | 透過 IPC + Node.js | Rust backend，系統 API 更直接 |
| 分發簽署 | Apple notarization（手動） | Tauri bundler 已整合 |

### 遷移原則

- 前端 UI（HTML / CSS / Vanilla JS）**全部保留**，僅替換 Electron 主程序層。
- 截圖邏輯（`screencapture` / `CGWindowID`）改以 Rust command 呼叫，IPC 介面維持相同語意。
- Sharp 影像處理改用 Rust image crate 或保留 Node sidecar，視 bundle 體積評估決定。
- `localStorage` 用於偏好設定，Tauri WebView 支援，邏輯不變。

---

## 2. 技術棧

| 層 | 技術 |
|----|------|
| App shell | Tauri 2.x |
| 前端 UI | HTML / CSS / Vanilla JavaScript（沿用 Electron 版） |
| 後端 | Rust |
| 截圖 | Rust（`core-graphics` / `screencapture` CLI） |
| 影像處理 | Rust `image` crate（或 Node sidecar） |
| PDF 輸出 | Rust `printpdf` crate |
| 網頁截圖 | Playwright（sidecar） |
| 分發 | Tauri bundler + Apple notarization |

### 2.1 開發環境版本（2026-03-28 建立）

| 工具 | 版本 |
|------|------|
| rustc | 1.94.1 |
| tauri-cli | 2.10.1 |
| Node.js | v25.8.1 |
| npm | 11.11.0 |
| macOS | Apple Silicon（arm64） |

---

## 3. 架構設計

### 3.1 IPC Contract（Rust Commands）

> **規則：** 每個 Rust command 在實作前必須先在此處完整規格化（名稱、參數、回傳值、錯誤情境）。前端呼叫端依此 contract 實作，不得自行假設介面。

*（待第一個 Sprint 規劃時填入）*

### 3.2 i18n 架構

三語系從 Day 1 建立：**zh / en / ja**。

規則（繼承自 Electron 版，擴充為三語）：
- `src/i18n.js`：每個 key 必須同時有 `zh`、`en`、`ja` 三個值。
- `src/editor.html`：所有 UI 文字透過 `data-i18n*` 屬性掛接，不得硬編碼任何語言的字串。
- `src/editor.js` / renderer：使用 `t('key')` 產生 UI 文字，不得內插字串。

**日文在地化為開發優先項**，須在所有新功能開發之前完成。見 § 4 Backlog 優先佇列。

---

## 4. Product Backlog

> 此處為唯一的需求與想法收納處。
> **想法隨時可以加入，但只有在 Sprint 規劃時才能進入開發。當前 Sprint 不插隊。**
> 每個項目進入開發前必須通過 DoR（見 CLAUDE.md），並在 SDD 中補寫功能規格與 TDD。

### 狀態定義

| 狀態 | 說明 |
|------|------|
| `wishlist` | 有想法，尚未評估 |
| `candidate` | 下個 Sprint 備選，已初步評估 |
| `in-sprint` | 當前 Sprint 開發中 |
| `done` | 已完成並通過 TDD |

---

### 優先佇列（開發啟動前必須完成）

| 功能 | 說明 | 狀態 |
|------|------|------|
| **日文 UI 在地化（ja）** | i18n 架構擴充為 zh / en / ja；隱私遮蔽補充日文場景（マイナンバー、JP 電話番号、メールアドレス）；§ 9.2 術語表新增 ja 欄 | `candidate` |

---

### Sprint Candidates（已評估，待排入）

| 功能 | 說明 | 平台限定 |
|------|------|---------|
| **物件旋轉（Rotation）** | 選取時顯示旋轉把手；`ctx.save/translate/rotate/restore`；點擊偵測需反向旋轉座標系 | Tauri |
| **截圖歷史（Screenshot History）** | 自動儲存截圖歷史，可回溯查看；`tauri-plugin-store` + `std::fs` 管理生命週期 | Tauri |
| **工具列拖曳把手 hover 回饋** | Electron `-webkit-app-region` 吃掉 pointer events；Tauri 原生視窗拖曳 API 可對把手單獨設 hover 樣式 | Tauri |
| **兩點貝茲曲線（Cubic Bezier）** | 升級為兩個控制點；更新資料模型（cp1/cp2 相對偏移）、渲染、handle 顯示、箭頭切線角度 | Tauri |
| **Share Sheet（原生分享）** | `tauri-plugin-share` 呼叫 `NSSharingServicePicker`；付費版差異化功能 | Tauri |
| **線條漸層（Line Gradient Stroke）** | 箭頭 / 曲線支援起點→終點雙色漸層；`ctx.createLinearGradient`；貝茲曲線以端點連線方向計算漸層向量 | Tauri |
| **批次網頁截圖（Batch Web Capture）** | URL 列表 + Playwright 依序截圖，自動命名；QA 版本比對、RWD 多頁確認、多語系版面核對 | Tauri |
| **捲軸截圖（Scrolling / Full-Page Capture）** | `page.screenshot({ fullPage: true })`；處理 sticky header 重疊 | Tauri |
| **圖片轉 PDF（Image to PDF）** | 一張或多張圖片打包為 PDF；Rust `printpdf` crate；支援自訂頁面尺寸與排列順序 | Tauri |
| **移除拖曳匯出浮水印** | 付費版不需 VAS 浮水印；移除匯出時的浮水印疊加邏輯 | Tauri |

---

### Wishlist（有想法，尚未評估）

| 功能 | 說明 |
|------|------|
| 跨螢幕矩形選取 | 選取框可跨越雙螢幕邊界；需處理不同 DPI 螢幕的截圖拼合與座標轉換 |
| 並排拼版 | 多圖上下 / 左右排列成一張 |
| 自由筆選區截圖 | 不規則形狀截圖 |
| 固定區域截圖 | 記憶座標的重複截圖 |
| 動態 GIF 製作 | 多幀合成動畫 |
| PNG / JPG → SVG | 向量追蹤轉換 |
| 標註樣式預設集 | 儲存常用顏色 / 樣式組合 |
| Mac App Store 分發 | 需 Sandbox + Notarization；Playwright 不再是障礙 |

---

## 5. 功能規格

*每個功能進入 Sprint 後，在此處補寫完整規格。格式沿用 Electron SDD。*

---

## 6. 測試案例（TDD）

*每個功能的 TDD 案例在實作前寫好，通過後標記 `[x]`。*

---

## 7. 快捷鍵規格

*沿用 Electron 版規格，Tauri 遷移後確認無差異再標記完成。*

---

## 8. 開放問題

| # | 問題 | 狀態 |
|---|------|------|
| Q1 | Sharp 保留 Node sidecar 或改 Rust image crate？ | 待評估（bundle 體積 vs. 功能完整性） |
| Q2 | Tauri 版定價與授權模式？ | 待定 |

---

*文件建立：2026-03-28　｜　作者：Nova（babelon1882@gmail.com）*
