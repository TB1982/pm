# SDD：VAS — Tauri 版

**版本：** 0.7
**日期：** 2026-03-29
**狀態：** Sprint 1 進行中
**前身：** `SDD-mac-screenshot-tool.md`（Electron 版，已封存，git tag `electron-final`）

---

## 變更紀錄

| 版本 | 日期 | 摘要 |
|------|------|------|
| v0.1 | 2026-03-28 | 初版：架構框架 + Product Backlog 整理自 Electron SDD |
| v0.2 | 2026-03-28 | Tauri 2 scaffold 建立完成（`src-tauri/` 初始化）；補記開發環境版本 |
| v0.3 | 2026-03-28 | Sprint 1 開始：浮動工具列架構遷移（DoR 通過，SDD + TDD 寫入） |
| v0.4 | 2026-03-28 | S1-02 檔案選擇對話框實作（DoR 通過，SDD + TDD 寫入） |
| v0.5 | 2026-03-28 | 浮水印實作（image + imageproc + ab_glyph）；批次轉換 TDD 補入；Wishlist 新增圓角對齊 |
| v0.6 | 2026-03-28 | 浮水印 UI 重構：文字 / 圖片各自獨立 9-grid 位置；同位置衝突偵測（toast + 阻擋）；圖片預覽空間保留 |
| v0.7 | 2026-03-29 | S1-03 浮水印 TDD 全部完工（[x]）；工具列拖曳把手 hover 移入 Wishlist（WKWebView non-key window 限制）；Sprint 1 範疇收斂為「完全恢復 Toolbar」（S1-01 / S1-02 / S1-03）；新增 § 9.4 阻礙決策日誌 |

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

## 3.3 Sprint Velocity 追蹤

| Sprint | 期間 | 完成功能 | 備註 |
|--------|------|---------|------|
| Sprint 1 | 2026-03-28 – 進行中 | S1-03 批次轉換 + 浮水印（done）；S1-01、S1-02 進行中 | 範疇收斂：完全恢復 Toolbar |

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
| **日文 UI 在地化（ja）** | i18n 架構擴充為 zh / en / ja；隱私遮蔽補充日文場景（マイナンバー、JP 電話番号、メールアドレス）；§ 9.2 術語表新增 ja 欄 | `done` |

---

### Sprint Candidates（已評估，待排入）

| 功能 | 說明 | 平台限定 |
|------|------|---------|
| **物件旋轉（Rotation）** | 選取時顯示旋轉把手；`ctx.save/translate/rotate/restore`；點擊偵測需反向旋轉座標系 | Tauri |
| **截圖歷史（Screenshot History）** | 自動儲存截圖歷史，可回溯查看；`tauri-plugin-store` + `std::fs` 管理生命週期 | Tauri |
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
| 未聚焦 hover 效果（含拖曳把手發光） | WKWebView 設計上不在 non-key window 更新 CSS `:hover`；Chromium（Electron）無此限制。具體表現：Electron 版拖曳把手只要 hover 即發光；Tauri 版須先點擊工具列視窗使其成為 key window，hover 效果才觸發——此為 Apple WKWebView 底層行為，無法透過 CSS 直接修正。可選方案：① JS 以 `tauri://cursor-moved` + `elementFromPoint` 模擬 hover 狀態；② 將視窗改為 NSPanel（non-activating）。複雜度中～高，暫緩。見 § 9.4 決策紀錄 2026-03-29。 |
| Modal 圓角對齊 | toolbar（全視窗寬）與 modal card 因寬度不同，頂角出現在不同 x 座標，視覺上不完全對齊。目前已將 modal 展開寬度設為 520px = toolbar 自然寬，改善幅度約 70%；完美對齊需要 toolbar 加上 `border-radius: 0 0 16px 16px`（modal 展開時）+ modal card `border-radius: 16px 16px 0 0`（Top 接縫）的動態 class 切換方案。 |
| 浮水印圖片預覽 | 批次轉換浮水印的圖片區塊保留了預覽空間（`.wm-img-preview`），待實作選取圖片後顯示縮圖。 |
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

### S1-01　浮動工具列架構遷移

**Sprint：** 1　｜　**狀態：** `in-sprint`　｜　**DoR 通過：** 2026-03-28

#### 使用者故事
> 身為 VAS 使用者，我想要一個小巧的浮動工具列常駐在桌面，這樣我可以隨時截圖或把圖片拖進去，不佔桌面空間。

#### 視窗架構

| 視窗 | 屬性 | 說明 |
|------|------|------|
| `toolbar` | 無邊框、永遠最上層、不可調整大小 | 常駐，44px 高，只顯示 icon |
| `editor` | 標準視窗、可調整大小 | 截圖或開檔後才顯示，同時只能開一個 |

#### 工具列規格

- 高度：44px
- 顯示：icon only，無文字標籤
- Icon 風格：SF Symbols 與 Lucide 各實作一版，QC 時由 Nova 選定
- Tooltip：hover 後顯示工具名稱（對應 i18n key）
- 拖動把手（⠿）：hover 時發光效果；使用 Tauri 原生拖曳 API（`data-tauri-drag-region`）

#### 檔案拖入行為

| 情境 | 行為 |
|------|------|
| 編輯器**未開啟**，拖圖進工具列 | 開啟編輯器，圖片載入為底圖 |
| 編輯器**已開啟**，拖圖進工具列 | 圖片作為疊圖物件插入（不複寫底圖） |

#### 截圖行為

| 情境 | 行為 |
|------|------|
| 點擊截圖（全螢幕 / 視窗 / 矩形） | 工具列隱藏 → 截圖 → 工具列恢復 → 編輯器開啟截圖結果 |
| 編輯器已開啟時點截圖 | 同上；截完後複寫現有編輯器內容（無需確認） |

#### 關閉行為
- 關閉工具列（紅色 ✕）= 關閉整個 app（`app.exit()`）

---

## 6. 測試案例（TDD）

### S1-01　浮動工具列架構遷移

#### 視窗行為
- [ ] 啟動 app → 只出現工具列視窗，編輯器視窗不出現
- [ ] 工具列視窗無標準 title bar（無邊框）
- [ ] 工具列視窗永遠在其他視窗上層（always-on-top）
- [ ] 工具列高度約 44px
- [ ] 關閉工具列 → 整個 app 結束

#### 拖動把手
- [ ] 拖動把手（⠿）可拖動工具列到螢幕任意位置
- [ ] 拖動把手 hover → 發光效果出現
- [ ] 拖動把手 hover 離開 → 效果消失

#### Icon 與 Tooltip
- [ ] 工具列只顯示 icon，無常駐文字標籤
- [ ] Hover 任一 icon → tooltip 出現（顯示正確工具名稱）
- [ ] Tooltip 文字對應 i18n（zh / en / ja 切換正確）

#### 檔案拖入
- [ ] 編輯器未開啟，拖 PNG 進工具列 → 編輯器開啟，圖片為底圖
- [ ] 編輯器未開啟，拖 JPG 進工具列 → 編輯器開啟，圖片為底圖
- [ ] 編輯器未開啟，拖 WebP 進工具列 → 編輯器開啟，圖片為底圖
- [ ] 編輯器已開啟，拖圖進工具列 → 圖片作為疊圖物件插入，不複寫底圖
- [ ] 拖非圖片檔案進工具列 → 無反應或 toast 提示

#### 截圖流程
- [ ] 點全螢幕截圖 → 工具列隱藏 → 截圖完成 → 工具列恢復 → 編輯器開啟截圖
- [ ] 點視窗截圖 → 工具列隱藏 → 截圖完成 → 工具列恢復 → 編輯器開啟截圖
- [ ] 點矩形截圖 → 工具列隱藏 → 截圖完成 → 工具列恢復 → 編輯器開啟截圖
- [ ] 編輯器已開啟時截圖 → 截完後複寫編輯器內容

#### 編輯器視窗
- [ ] 同時只能開一個編輯器視窗
- [ ] 關閉編輯器 → 工具列繼續常駐

### S1-02　檔案選擇對話框

**Sprint：** 1　｜　**狀態：** `in-sprint`　｜　**DoR 通過：** 2026-03-28

#### 使用者故事
> 身為使用者，我希望按「開啟」可以用系統對話框選擇圖片，按批次轉相關按鈕可以選擇多個檔案或資料夾，這樣功能才能真正運作。

#### 涉及指令
| IPC 頻道 | Rust 指令 | 行為 |
|----------|-----------|------|
| `open-image-file` | `open_image_file` | 單選圖片，選完 emit `open-image-result` 事件（編輯器開啟另行實作） |
| `select-batch-files` | `select_batch_files` | 多選圖片，最多 100 張，回傳路徑陣列；取消回傳空陣列 |
| `select-output-dir` | `select_output_dir` | 選資料夾，回傳路徑字串；取消回傳空字串 |
| `select-watermark-image` | `select_watermark_image` | 單選圖片，回傳路徑字串；取消回傳空字串 |

#### 實作細節
- 使用 `tauri-plugin-dialog` 2.x
- 對話框為 macOS 原生系統 sheet
- 所有指令以 `tokio::sync::oneshot` 橋接 dialog callback 與 async command
- 取消選擇：`open-image-file` 靜默；其餘回傳空值，JS 端已有 null guard

---

## 6. 測試案例（TDD）— S1-02

### S1-02　檔案選擇對話框

#### 開啟（open-image-file）
- [ ] 點「開啟」→ macOS 原生圖片選擇對話框彈出
- [ ] 選擇圖片後對話框關閉，工具列恢復正常狀態
- [ ] 取消對話框 → 工具列無反應，不報錯

#### 批次轉 — 選擇檔案（select-batch-files）
- [ ] 批次轉 modal 中點「選擇檔案」→ 多選對話框彈出
- [ ] 選擇 1 張圖片 → 檔案列表顯示該檔案
- [ ] 選擇 3 張圖片 → 檔案列表顯示 3 筆
- [ ] 取消對話框 → 檔案列表不變
- [ ] 再次點「加入更多」→ 新選的檔案附加至既有清單

#### 批次轉 — 上限（select-batch-files）
- [ ] 選取超過 100 張圖片 → 只保留前 100 張，其餘截斷

#### 批次轉 — 輸出目錄（select-output-dir）
- [ ] 點「選擇目錄」→ 資料夾選擇對話框彈出
- [ ] 選擇目錄後 → 路徑顯示在 UI 上（顯示最後一段目錄名）
- [ ] 取消 → 路徑欄位不變

#### 批次轉 — 浮水印圖片（select-watermark-image）
- [ ] 浮水印啟用時點「選擇圖片」→ 圖片選擇對話框彈出
- [ ] 選擇圖片 → 圖片路徑顯示在 UI 上
- [ ] 取消 → 路徑欄位不變

### S1-03　批次格式轉換

**Sprint：** 1　｜　**狀態：** `in-sprint`　｜　**DoR 通過：** 2026-03-28

> 移植自 Electron v3.27 批次浮水印功能規格（SDD-mac-screenshot-tool.md § v3.27）

#### 支援格式
PNG / JPG / WebP / GIF / BMP / TIFF

#### 浮水印規格（移植自 Electron v3.27）
- **文字浮水印**：文字內容、字級（px）、顏色（color picker）、不透明度（%）
- **圖片浮水印**：選取 PNG/JPG/WebP/GIF 圖片、寬度佔比（%）、不透明度（%）
- 兩種可同時啟用：文字在下、圖片在上（均參照同一 position/margin）
- **9-grid 位置選擇器**：northwest / north / northeast / west / center / east / southwest / south / southeast；預設 southeast
- **邊距**：0–500px，預設 20px
- 圖片不透明度以 raw RGBA alpha channel 操作（Rust image crate）
- 文字渲染：macOS 系統 TTF 字型（Arial.ttf 優先）；若系統無可用字型，文字浮水印靜默略過

#### 其他批次功能
- 統一調整尺寸（寬 / 高 / 最長邊，等比例）
- 輸出位置：同原始檔案目錄 / 指定目錄
- 轉換完成後刪除原始檔（同名同目錄時不刪除）
- 同格式衝突警告

#### Rust 後端（lib.rs）
| 函式 | 說明 |
|------|------|
| `batch_convert` | 主指令，逐檔呼叫 `convert_single`，每完成一檔 emit `batch-progress` |
| `convert_single` | 開啟圖 → resize → 套浮水印 → 存檔 |
| `apply_watermarks` | 依序呼叫 text → image watermark |
| `apply_image_watermark` | image::imageops::overlay + alpha 縮放 |
| `apply_text_watermark` | imageproc::draw_text_mut + ab_glyph 系統字型 |
| `wm_offset` | 9-grid 位置計算（含 margin） |

---

## 6. 測試案例（TDD）— S1-03（批次轉換浮水印）

> 下列案例移植自 Electron v3.27 TDD（SDD-mac-screenshot-tool.md § TDD v3.27），已通過 Electron 版 QC。

#### 基本轉換
- [x] 轉換格式選單包含 PNG / JPG / WebP / GIF / BMP / TIFF
- [x] 選擇檔案後點「開始轉換」→ 進度條推進，log 顯示每筆結果
- [x] 轉換完成 → toast 顯示成功數量
- [x] 指定輸出目錄 → 轉換檔案輸出至指定資料夾
- [x] 同原始檔案目錄 → 轉換檔案輸出至原始資料夾
- [x] 啟用刪除原始檔 → 轉換後原始檔消失

#### 浮水印
- [x] 勾選「加入浮水印」→ 文字 / 圖片區塊展開；取消勾選 → 區塊收起
- [x] 文字浮水印：輸入文字後轉換 → 輸出圖片含對應文字
- [x] 文字浮水印：字型大小、顏色、不透明度變更後 → 輸出圖片反映設定
- [x] 圖片浮水印：選取 Logo 後轉換 → 輸出圖片含 Logo 疊圖
- [x] 圖片浮水印：不透明度 50% → Logo 呈半透明
- [x] 浮水印位置：點選 9-grid 各格 → 轉換結果浮水印位置正確
- [x] 邊距設為 0 → 浮水印貼邊；設為 100 → 浮水印往內縮 100px
- [x] 文字 + 圖片同時啟用，各自選擇不同位置 → 兩者同時清晰出現（例如文字 southwest、圖片 southeast）
- [x] 文字 + 圖片同時啟用，選擇相同位置 → toast 警告「位置相同，請各自選擇不同位置」，轉換被阻擋
- [x] 無可用系統字型時 → 文字浮水印靜默略過，圖片浮水印仍套用

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

---

## 10. Tauri 血淚開發紀錄

> 本節記錄 Tauri + WKWebView 開發中踩過的坑，供未來 Sprint 參考。每條附根本原因與解法。

### 坑 1 — WKWebView HTTP 快取極度頑固（2026-03-29）

**症狀：** CSS / JS / HTML 改完推上去，重啟 `cargo tauri dev` 後 WebView 仍顯示舊版內容，`curl` 確認 server 有新版，但 WebView 就是不更新。

**根本原因：** WKWebView 對 HTTP 資源做持久快取，存活於 app 重啟之間。清除 `~/Library/Application Support/com.tb1982.vas`、`~/Library/Caches/com.tb1982.vas`、`~/Library/WebKit` 均無效。

**解法：**
1. **換 port**：WKWebView 快取以 URL origin 為 key，換 port 就等於全新 origin，舊快取完全無效。目前 Tauri dev 固定使用 port 8085。
2. **自製 no-cache dev server**（`src-tauri/dev-server.py`）：每個 HTTP 回應加上 `Cache-Control: no-store`，根治快取問題。前者是一次性繞過，後者是永久解法。

**教訓：** Python 內建 `http.server` 會送 `Last-Modified` 並接受 `If-Modified-Since`，WKWebView 會據此回 304，不重新抓檔。必須用自製 server 強制送 no-store。

---

### 坑 2 — WebKit `<button>` 預設樣式鎖死字型（2026-03-29）

**症狀：** `<button>` 套了 CSS class，`font-size`、`font-family` 完全無效，`-webkit-appearance: none` 也救不了。

**根本原因：** WKWebView 的 user-agent stylesheet 對 `<button>` 的字型設定優先度高於 author stylesheet，即使加了 `-webkit-appearance: none` 仍部分保留。

**解法：** 在 HTML 元素上直接加 `style="font-size:15px;font-family:inherit;"` inline style。inline style 優先度高於 user-agent stylesheet，一定有效。

**教訓：** 凡是原生表單元素（`<button>`, `<input>`, `<select>`），字型相關屬性一律用 inline style 設定，不要只靠 CSS class。

---

## 9. 決策紀錄

### 9.4 阻礙決策日誌

| 日期 | Phase | 功能 | 阻礙描述 | 決策 | 影響 |
|------|-------|------|---------|------|------|
| 2026-03-29 | Sprint 1 | 工具列拖曳把手 hover 發光效果 | WKWebView（Tauri）不在 non-key window 更新 CSS `:hover`，必須先點擊工具列使其成為 key window hover 效果才觸發。Electron 版（Chromium）無此限制，行為落差明顯。無法以 CSS 修正，兩種 JS workaround 複雜度均為中～高。 | **延後** — 移入 Wishlist，Sprint 1 不包含此功能，待評估 `tauri://cursor-moved` 方案或 NSPanel 改寫 | 工具列 hover 體驗與 Electron 版有落差；不影響核心功能，使用者仍可正常拖移工具列 |

---

*文件建立：2026-03-28　｜　作者：Nova（babelon1882@gmail.com）*
