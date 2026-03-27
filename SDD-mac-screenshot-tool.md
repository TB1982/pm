# SDD：Mac 截圖與圖片編輯工具
**版本：** 3.43
**日期：** 2026-03-27
**狀態：** 待審閱
**變更紀錄：**

### v3.43 — 套版搖桿絲滑化（step 0.1）

#### 變更摘要

套版面板「圓角」與「外框」搖桿的步長從 `step="1"`（11 段）改為 `step="0.1"`（101 段），拖曳時感覺連續而非一格一格。數值標籤同步顯示一位小數（如 `5.0`）。底層效果公式不變。

#### TDD 測試案例（v3.43）

- [ ] 拖動「圓角」搖桿 → 顯示值以 0.1 為單位變化（如 4.9 → 5.0 → 5.1）
- [ ] 拖動「外框」搖桿 → 顯示值以 0.1 為單位變化
- [ ] 搖桿拖到最左端 → 顯示 0.0；最右端 → 顯示 10.0
- [ ] 套用後重新開啟套版面板 → 搖桿恢復預設值 5.0

---

### v3.42 — 裁切選取框鍵盤微移

#### 變更摘要

裁切工具有效選取框時，方向鍵可微移位置：
- **← ↑ → ↓**：移動 1px
- **Shift + 方向鍵**：移動 10px

觸發條件：`tool === 'crop' && cropRect && !isCropping`（拖曳過程中不介入）。移動後更新尺寸標籤並重繪。

#### TDD 測試案例（v3.42）

- [x] 裁切工具畫出選取框後，按方向鍵 → 選取框位移 1px
- [x] Shift + 方向鍵 → 選取框位移 10px
- [x] 拖曳過程中按方向鍵 → 不觸發（isCropping 中忽略）
- [x] 未畫選取框時按方向鍵 → 不觸發裁切移動

---

### v3.41 — 裁切工具修正：handle 翻轉 + 尺寸穩定 + 雙擊確認 + 按鈕動態顯隱

#### 變更摘要

1. **Handle resize 錨點 Bug 修正**：`applyCropResize` 改用 `cropMoveStart.origRect`（mousedown 快照）作為對邊錨點，解決把手拖過對邊後選取框塌縮消失的問題。同時在 mousedown 捕捉 handle 時補存 `cropMoveStart`，mouseup 時清除。
2. **尺寸標籤寬度固定**：`#cropSizeLabel` 加 `min-width: 100px; font-variant-numeric: tabular-nums; text-align: right`，消除三位數↔四位數切換時右側確認/取消按鈕的位移抖動。
3. **雙擊確認裁切**：在 `annotCanvas` 上加 `dblclick` 事件，`tool === 'crop' && cropRect` 時呼叫 `confirmCrop()`。
4. **確認裁切按鈕動態顯隱**：`updateCropSizeLabel()` 同步更新 `btnCropConfirm.hidden`，無有效選取框時自動隱藏，拖出選取框且 mouseup 後才出現；切換到裁切工具時立即套用初始狀態。

#### TDD 測試案例（v3.41）

- [x] 裁切工具中拖出選取框，把手拖過對邊 → 選取框翻轉，不消失
- [x] 拖曳選取框大小時，options bar 尺寸數字穩定不推擠右側按鈕
- [x] 有選取框時雙擊畫布 → 執行裁切（等同按確認裁切）
- [x] 切換到裁切工具時「確認裁切」按鈕隱藏；拖出選取框後才出現

---

### v3.40 — 資安修補：XSS 防護 + 畫布尺寸上限

#### 變更摘要

1. **視窗選取器 XSS 修補**：`source.name`（桌面視窗標題）從 `innerHTML` 插值改為 `textContent`，防止惡意命名的視窗標題注入 HTML。
2. **批次檔案清單 XSS 修補**：批次清單項目從 `innerHTML` 模板改為 DOM 方法建立，`filename` 改用 `textContent`，防止惡意命名的檔案注入 HTML。
3. **新開畫布尺寸上限**：`w > 8192 || h > 8192` 直接 return，防止輸入超大尺寸導致 sharp OOM crash。上限 8192px 覆蓋所有合理場景（8K 解析度）。

#### TDD 測試案例（v3.40）

- [x] 視窗選取器顯示視窗清單，視窗名稱正確顯示（不因特殊字元破版）
- [x] 批次清單加入含空格或特殊字元的檔名，顯示正常
- [x] 新開畫布輸入 8192 × 8192 → 正常建立
- [x] 新開畫布輸入 8193（任一軸）→ 靜默不執行，modal 保持開啟

---

### v3.39 — 批次轉換單檔大小上限

#### 變更摘要

- **單檔大小上限：20 MB**。`batch-convert` main process handler 在 sharp 處理前先 `fs.stat` 檢查，超出者拋出 `檔案過大（X.X MB），單檔上限 20 MB` 錯誤，記入 log（`✗` 樣式）並繼續處理其餘檔案。
- 設計依據：MacBook Pro Retina 截圖（PNG）最大約 15 MB，20 MB 覆蓋所有合理截圖場景；超過通常為誤丟的相機 RAW 或影片素材。

#### TDD 測試案例（v3.39）

- [x] 批次清單含一個 > 20 MB 的檔案 → log 顯示 `✗ 檔名：檔案過大（X.X MB），單檔上限 20 MB`
- [x] 超大檔記為失敗後，清單中其餘 < 20 MB 的檔案繼續正常轉換
- [x] 全部 < 20 MB → 無任何大小相關錯誤，正常轉換
- [x] 恰好 20 MB（邊界值）→ 正常轉換，不觸發錯誤

#### 壓力測試 script

在 `/home/user/pm` 目錄下執行，生成 100 張 2560×1600 PNG（每張約 8–12 MB，模擬真實 MacBook Pro Retina 截圖）：

```bash
node -e "
const sharp = require('./node_modules/sharp');
const p = [];
for (let i = 1; i <= 100; i++) {
  const r = (i * 37) % 256, g = (i * 73) % 256, b = (i * 113) % 256;
  p.push(
    sharp({ create: { width: 2560, height: 1600, channels: 3,
      background: { r, g, b } } })
      .png()
      .toFile('/tmp/stress_' + String(i).padStart(3,'0') + '.png')
  );
}
Promise.all(p).then(() => console.log('100 張 2560x1600 PNG 產生完畢：/tmp/stress_*.png'));
"
```

再額外生 1 張超大檔測試拒絕邏輯（25 MB 合成圖）：

```bash
node -e "
const sharp = require('./node_modules/sharp');
sharp({ create: { width: 4096, height: 4096, channels: 4,
  background: { r: 255, g: 0, b: 0, alpha: 1 } } })
  .png({ compressionLevel: 0 })
  .toFile('/tmp/stress_oversize.png')
  .then(() => console.log('超大測試檔產生完畢：/tmp/stress_oversize.png'));
"
```

---

### v3.38 — 批次轉換檔案數上限

#### 變更摘要

- **批次轉換上限：100 張**。`addBatchFiles()` 加入 `BATCH_MAX = 100` 防護：超出部分靜默略過，並以 error toast 顯示「批次轉換上限為 100 張，多餘的檔案已略過」。
- 去重邏輯不變，上限計算以最終清單長度為準（去重後）。

#### TDD 測試案例（v3.38）

- [x] 拖曳 101 個不重複圖片至批次區 → 清單最多顯示 100 張，toast 顯示上限提示（error 樣式）
- [x] 已有 90 張時再加 20 張 → 僅新增 10 張至滿 100，剩餘 10 張略過，toast 顯示提示
- [x] 已有 100 張時再加任意檔案 → 清單不增加，toast 顯示提示
- [x] 加入含重複路徑的批次（50 新 + 50 重複）→ 實際新增 50 張，不觸發上限 toast（未超過 100）

---

### v3.37 — QR 閾值調整 + 工具列新開畫布獨立入口

#### 變更摘要

1. **QR 自動開啟閾值**：由 ≥ 70% 調整為 ≥ 45%。`jsQR` 偵測的 bounding box 不含 QR quiet zone（白邊），導致視覺上「截滿版」的 QR 實際比例僅約 25–35%，閾值下調後行為更符合使用者預期。
2. **新開畫布入口獨立**：桌面浮動工具列新增「白板」獨立按鈕（`btnWhiteboard`），直接展開新開畫布 modal。「開啟」按鈕維持直接觸發開檔對話框，不合併為下拉選單。兩個入口各自獨立，意圖更清晰。
3. **編輯器 ⊞ 改為延伸畫布**：v3.35 的編輯器 ⊞ 下拉選單（開新畫布 / 開檔）功能已由工具列兩顆按鈕承接，⊞ 改為「延伸畫布（E）」工具（`btnExtend`）。編輯器內匯入圖片由「疊圖（O）」（`btnOverlayImg`）負責。

#### TDD 測試案例（v3.37）

- [x] 桌面工具列點「白板」→ 工具列展開 modal，顯示預設尺寸選單、寬高輸入、背景色、透明切換
- [x] 桌面工具列點「開啟」→ 直接彈出檔案選擇對話框（無下拉選單）
- [x] 選預設尺寸 → 寬高自動填入
- [x] 點「建立」→ 編輯器開啟對應尺寸的空白畫布
- [x] 透明模式 → 建立後畫布背景透明（棋盤格）
- [x] 編輯器 ⊞ 按鈕 → 開啟延伸畫布 modal（非開檔）
- [x] 編輯器「疊圖」按鈕 → 開啟檔案選擇，選取後疊入為標注圖層
- [x] 截 QR 使 QR 佔畫面 ≥ 45% → 直接開瀏覽器（不開編輯器）
- [x] 截 QR 使 QR 佔畫面 21–44% → 開編輯器 + Action Toast 詢問

---

### v3.36 — QR Code 智慧掃描

#### 功能概述

區域截圖完成後，自動使用 `jsQR` 掃描圖片內是否包含 QR code。依 QR code 佔截圖面積比例，觸發三種行為。

#### 比例判斷邏輯

| QR 佔比 | 行為 |
|---------|------|
| ≥ 45% | 判定為刻意掃碼。若為 URL 直接呼叫 `shell.openExternal`，**不開編輯器**；若為純文字則複製到剪貼簿 |
| 21–44% | 判定為模糊意圖。開啟編輯器並顯示 Action Toast，讓使用者決定是否開啟 |
| ≤ 20% | 判定為截圖順帶包含 QR，靜默開啟編輯器 |

#### 技術實作

- **函式庫**：`jsqr@^1.4.0`（純 JS，無原生依賴）
- **偵測節點**：`main.js` 的 `capture-rect` IPC handler，於 `captureGlobalRect` 之後執行
- **像素取得**：`sharp(imagePath).ensureAlpha().raw().toBuffer()` → 傳入 `jsQR(Uint8ClampedArray, w, h)`
- **面積比例**：QR 四角點 bounding box 面積 ÷ 圖片總面積 × 100
- **IPC**：新增 `qr-detected`（main → editor renderer）、`open-url`（editor → main）

#### Action Toast

Action Toast 為帶按鈕的互動式提示，不自動消失：
- 訊息：`偵測到 QR Code：<url>`
- 按鈕：「開啟」（紫色主要按鈕）／「略過」（次要按鈕）
- 點「開啟」→ `invoke('open-url', url)` → `shell.openExternal`

#### 非 URL QR code（21–44% 區間）

純文字 QR（名片 vCard、WiFi 設定等）→ 複製到剪貼簿 + 一般 toast 提示。

#### TDD 測試案例（v3.36）

- [x] QR code 佔比 ≥ 45%，URL 類型 → 直接開瀏覽器，不開編輯器
- [x] QR code 佔比 ≥ 45%，純文字類型 → 複製到剪貼簿，不開編輯器
- [x] QR code 佔比 21–44% → 開編輯器 + Action Toast 顯示 URL
- [x] Action Toast 點「開啟」→ 開啟對應網頁
- [x] Action Toast 點「略過」→ toast 消失，編輯器正常使用
- [x] QR code 佔比 ≤ 20% → 靜默開編輯器，不顯示任何 QR 提示
- [x] 截圖範圍內無 QR code → 正常流程，不影響效能
- [x] 非 URL QR（21–44%）→ 複製到剪貼簿 + toast，不顯示 Action Toast URL

---

### v3.35 — 新開畫布 / 開啟檔案

#### 功能概述

左側工具列新增「⊞」按鈕（`btnOpenMenu`）。點擊後彈出浮動選單，提供兩個選項：

1. **新開畫布**：開啟 `newCanvasModal` 對話框，允許使用者指定尺寸與背景顏色，建立空白畫布。
2. **開啟檔案**：觸發隱藏的 `<input type="file">` 選取本機圖片，取代現有畫布內容（行為等同拖曳匯入）。

#### 新開畫布對話框

| 欄位 | 說明 |
|------|------|
| 預設尺寸 | 下拉選單，依類別分組（螢幕 / 紙張 / 社群媒體 / 其他），選取後自動填入寬高 |
| 寬度 / 高度 | 數字輸入框，可手動覆寫；手動修改後預設選單切換為「自訂」 |
| 背景顏色 | 色彩選取器（預設白色）；點「透明」切換為全透明背景 |

#### 預設尺寸清單

| 類別 | 名稱 | 尺寸 |
|------|------|------|
| 螢幕 | HD | 1280 × 720 |
| 螢幕 | Full HD | 1920 × 1080 |
| 螢幕 | 2K | 2560 × 1440 |
| 螢幕 | 4K | 3840 × 2160 |
| 紙張（72 dpi）| A4 直 | 595 × 842 |
| 紙張（72 dpi）| A4 橫 | 842 × 595 |
| 紙張（72 dpi）| A3 直 | 842 × 1191 |
| 紙張（72 dpi）| A3 橫 | 1191 × 842 |
| 社群媒體（建議尺寸）| IG 1:1 | 1080 × 1080 |
| 社群媒體（建議尺寸）| IG 4:5 | 1080 × 1350 |
| 社群媒體（建議尺寸）| Story 9:16 | 1080 × 1920 |
| 社群媒體（建議尺寸）| Facebook | 1200 × 630 |
| 社群媒體（建議尺寸）| X / Twitter | 1600 × 900 |
| 社群媒體（建議尺寸）| LinkedIn | 1200 × 627 |
| 社群媒體（建議尺寸）| YouTube 縮圖 | 1280 × 720 |
| 其他 | 正方形 | 1000 × 1000 |
| 其他 | 自訂 | 手動輸入 |

> 社群媒體尺寸為「建議上傳解析度」，不隨平台政策異動；長寬比（1:1、4:5、9:16）多年穩定。

#### 建立邏輯

```javascript
// 1. 建立 offscreen canvas
const off = document.createElement('canvas')
off.width = w; off.height = h
const octx = off.getContext('2d')
if (bgColor) { octx.fillStyle = bgColor; octx.fillRect(0, 0, w, h) }

// 2. 載入為 imgElement，清空 annotations、history
newImg.onload = () => {
  imgElement = newImg; imgWidth = w; imgHeight = h
  annotations = []; history = [[]]; historyIdx = 0
  selectedId = null; selectedIds = new Set(); userZoomed = false
  fitCanvas(); drawBase(); renderAnnotations()
}
```

#### TDD 測試案例（v3.35）

- [x] 點擊「⊞」按鈕，浮動選單出現（含「新開畫布」與「開啟檔案」）
- [x] 點擊選單外任意位置，選單消失
- [x] 選取「Full HD」預設，寬高自動填入 1920 × 1080
- [x] 手動修改寬度，預設下拉切換為「自訂」
- [x] 建立白色背景 800×600 畫布，畫布顯示正確尺寸，標注清空
- [x] 建立透明背景畫布，背景呈棋盤格（Canvas 預設透明行為）
- [x] 「開啟檔案」選取 PNG，圖片正確載入，取代現有畫布
- [x] 選取同一個檔案兩次（重設 `input.value`），可正常重複開啟

---

### v3.34 — 線條曲線控制點（Quadratic Bezier）

#### 功能概述

線條（含箭頭）選取後，顯示三個控制把手：兩端點控制位置，中間的「曲線控制點」控制曲度。拖曳中間把手後線條從直線變為二次貝茲曲線（Quadratic Bezier）。對齊 FastStone UX 模式，不新增額外工具。

#### 資料結構

`line` 類型標注新增可選欄位：

```javascript
{ type: 'line', x1, y1, x2, y2,
  cx, cy   // 可選；未設定 = 直線，設定後 = 曲線
}
```

向下相容：舊標注無 `cx, cy`，渲染為直線不受影響。

#### 三個把手

| id | 位置 | 顏色 | 功能 |
|----|------|------|------|
| `p1` | `(x1, y1)` | 白 | 起點 |
| `p2` | `(x2, y2)` | 白 | 終點 |
| `curve` | `(cx,cy)` 或幾何中點 | 白（未移動）／綠（已移動）| 曲度 |

#### 渲染邏輯

- `cx` 未設定 → `lineTo(x2, y2)`（直線）
- `cx` 已設定 → `quadraticCurveTo(cx, cy, x2, y2)`

#### 箭頭方向修正（曲線模式）

| 箭頭 | 角度計算 |
|------|---------|
| 起點 | `atan2(cy−y1, cx−x1)` |
| 終點 | `atan2(y2−cy, x2−cx)` |

曲線模式不做 arrInset trimming，arrowhead 直接畫在端點。

#### TDD 測試案例（v3.34）

- [x] 選取直線 → 出現 3 個把手，`curve` 把手白色，位在幾何中點
- [x] 拖曳 `curve` 把手 → 把手變綠，線條彎曲為二次貝茲曲線
- [x] 拖曳 `p1` / `p2` → 線條端點移動，曲線形狀隨之更新
- [x] 有箭頭的曲線 → 箭頭跟隨切線方向，不朝向另一端點
- [x] 拖曳整條曲線（move drag）→ 三個控制點一起平移，形狀不變
- [x] 舊有直線（無 cx/cy）→ 正常渲染，`curve` 把手顯示白色

---

### v3.33 — 智慧磁吸對齊（Smart Snap Alignment）

#### 功能概述

拖曳標注時，自動偵測與其他物件邊緣／中線或畫布邊緣／中線的接近關係，在接近時產生磁吸效果，並顯示紅色輔助線作為視覺回饋。

#### 觸發條件

- 僅在拖曳（`isDragging`）期間啟用
- 磁吸來源：所有**未被拖曳**的標注邊緣與中線 + 畫布四邊與中線
- 多選拖曳時：以整個群組 bounding box 作為磁吸主體

#### 磁吸感應點

| 方向 | 感應點 |
|------|--------|
| X 軸 | 拖曳物件／群組的左邊緣、水平中線、右邊緣 |
| Y 軸 | 拖曳物件／群組的上邊緣、垂直中線、下邊緣 |

| 參考來源 | 參考點 |
|----------|--------|
| 其他物件 | 左邊緣、水平中線、右邊緣、上邊緣、垂直中線、下邊緣 |
| 畫布 | 左邊（0）、水平中線（imgWidth/2）、右邊（imgWidth）、上邊（0）、垂直中線（imgHeight/2）、下邊（imgHeight） |

#### 磁吸邏輯

```
SNAP_PX = 8  // 畫面像素（screen pixels）
threshold   = SNAP_PX / viewScale  // 轉換為 image 座標
```

- X 軸與 Y 軸**獨立**計算，互不干擾
- 在各自方向找距離最小且 < threshold 的 (拖曳點, 參考點) 配對
- 找到配對後，將拖曳物件額外偏移 `delta = 參考點 - 拖曳點`（吸合）
- 拖曳物件偏移後距離超過 threshold → 自動脫離（無需任何特殊操作）
- 按住 `Alt / Option`：暫停磁吸（直接拖曳，不做吸附）

#### 輔助線視覺回饋

兩種類型，樣式不同以便區分：

| 類型 | 顏色 | 虛線節奏 | 條數 |
|------|------|---------|------|
| 邊緣／中線對齊 | `rgba(255,45,85, 0.65)` | `[6, 4]` | 1 條 |
| 均分對齊 | `rgba(255,45,85, 0.45)` | `[3, 4]` | 4 條（夾住兩個等寬間距） |

均分觸發時的四條線位置（水平為例）：`[A右邊 | 拖曳物左邊 | 拖曳物右邊 | B左邊]`，垂直同理。放開滑鼠後立即消失。

#### 均分磁吸（Distribute Snap）

對任意兩個非拖曳物件組成的配對 (A, B)（A 在左／上），檢查三種相對位置：

| Case | 拖曳物件位置 | 吸附條件 |
|------|------------|---------|
| 1 | 夾在 A、B 中間 | 兩側間距相等 |
| 2 | 在 A、B 右方／下方 | gap(B→拖) = gap(A→B) |
| 3 | 在 A、B 左方／上方 | gap(拖→A) = gap(A→B) |

需至少 2 個其他物件在畫布上才會觸發均分磁吸。

#### 設計決策：永遠開啟，不設 toggle

磁吸功能沒有開關設定。理由：
- 輔助線只在拖曳過程中短暫出現，放手即消失，視覺干擾極低
- `Alt / Option` 鍵已提供「臨時暫停磁吸」的逃生出口，比設定面板更直覺
- 截圖標注工具的使用情境快速，磁吸是省力功能，幾乎不需要關閉

#### 拖曳位置計算方式

為避免磁吸導致位置累積漂移，採用**絕對座標法**：
1. 拖曳開始時快照所有被拖曳標注的原始位置（`dragStartStates`）
2. 每個 mousemove frame：先以 `startPos + totalDelta` 設定絕對位置，再疊加磁吸修正量

#### 狀態變數（新增）

```javascript
const SNAP_PX       = 8    // 感應距離（screen pixels）
let snapGuides      = []   // [{ axis, type, value? | lines? }] 目前顯示中的輔助線
let dragStartPos    = null // { x, y } 拖曳起始滑鼠位置（image 座標）
let dragStartStates = {}   // { [id]: { x, y, x2?, y2? } } 拖曳起始各標注位置
```

#### TDD 測試案例（v3.33）

- [x] 拖曳單一物件接近另一物件左邊緣 8px 內 → 吸附，1 條垂直輔助線出現
- [x] 拖曳物件水平中線接近畫布水平中線 8px 內 → 吸附
- [x] 吸附後繼續拖曳超過 8px → 自動脫離，輔助線消失
- [x] 按住 Alt 拖曳 → 不磁吸，不顯示輔助線
- [x] 多選群組拖曳：群組右邊緣接近另一物件左邊緣 → 吸附
- [x] 放開滑鼠 → 輔助線立即消失
- [x] X 軸與 Y 軸同時磁吸 → 顯示水平 + 垂直各 1 條
- [x] 畫布上只有一個標注（無其他物件）→ 仍可吸附至畫布邊緣
- [x] 均分磁吸 Case 1：物件拖至兩物件中間等距位置 → 4 條輔助線出現
- [x] 均分磁吸 Case 2：物件拖至兩物件右方等距位置 → 4 條輔助線出現
- [x] 均分磁吸 Case 3：物件拖至兩物件左方等距位置 → 4 條輔助線出現
- [x] 畫布上少於 2 個其他標注 → 不觸發均分磁吸

---

### v3.32 — 對齊工具列（多選子功能）

#### 功能概述

多選狀態下，options bar 空白區域顯示 8 個對齊按鈕 + 1 個 checkbox，操作完成後一次 pushHistory，支援 Cmd+Z 還原。

#### UI 位置

options bar（`#optionsBar`）內，多選時顯示 `#grpAlign` 區塊；單選或無選取時隱藏。

#### 按鈕與行為

| 按鈕 ID | 圖示 | unchecked（對齊物件） | checked（對齊中線） |
|---------|------|----------------------|-------------------|
| `btnAlignLeft`    | ⬛← | 所有左邊緣 → 最左物件左邊緣 | 所有左邊緣 → x = 0 |
| `btnAlignHCenter` | ⬛↔ | 所有中心 x → 群組 bounding box 水平中線 | 所有中心 x → imgWidth / 2 |
| `btnAlignRight`   | →⬛ | 所有右邊緣 → 最右物件右邊緣 | 所有右邊緣 → imgWidth |
| `btnAlignTop`     | ⬛↑ | 所有上邊緣 → 最上物件上邊緣 | 所有上邊緣 → y = 0 |
| `btnAlignVCenter` | ⬛↕ | 所有中心 y → 群組 bounding box 垂直中線 | 所有中心 y → imgHeight / 2 |
| `btnAlignBottom`  | ↓⬛ | 所有下邊緣 → 最下物件下邊緣 | 所有下邊緣 → imgHeight |
| `btnDistributeH`  | ↔均 | 水平間距相等（需 ≥ 3 個標注） | 同左（均分不參照圖片） |
| `btnDistributeV`  | ↕均 | 垂直間距相等（需 ≥ 3 個標注） | 同左 |

#### Checkbox

```
☐ 對齊中線   （id: chkAlignToCanvas）
```
- 未勾：所有對齊以選取群組中的物件為參照
- 勾選：對齊以圖片邊緣 / 中線為參照
- 均分（水平/垂直均分）不受 checkbox 影響

#### 對齊邏輯（unchecked）

```javascript
// 靠左
const anchor = Math.min(...annots.map(a => bounds(a).x))
annots.forEach(a => { const b = bounds(a); moveAnnot(a, anchor - b.x, 0) })

// 水平置中
const cx = (groupBounds.x + groupBounds.x + groupBounds.w) / 2
annots.forEach(a => { const b = bounds(a); moveAnnot(a, cx - (b.x + b.w/2), 0) })

// 水平均分（≥3）
// 按 left 排序 → 第一個與最後一個固定，中間的 x 均分
```

#### 均分演算法

```
水平均分：
  1. 按 bounds.x 由左至右排序
  2. totalSpan = rightmost.right - leftmost.left
  3. sumWidths  = Σ bounds(a).w
  4. gap = (totalSpan - sumWidths) / (n - 1)
  5. 從第二個開始：a.left = prev.right + gap
```

垂直均分同理，改為 y 軸。

#### History

對齊操作前呼叫 `pushHistory()`，一次操作一次還原點。

---

#### TDD v3.32

**靠左 / 靠右 / 靠上 / 靠下（unchecked）**
- [x] 選取 3 個 x 位置不同的矩形 → 按靠左 → 三個左邊緣對齊最左那個
- [x] 按靠右 → 三個右邊緣對齊最右那個
- [x] 按靠上 → 三個上邊緣對齊最上那個
- [x] 按靠下 → 三個下邊緣對齊最下那個
- [x] Cmd+Z → 還原至對齊前位置

**水平/垂直置中（unchecked）**
- [x] 3 個位置不同的標注 → 按水平置中 → 三個中心 x 對齊群組 bounding box 水平中線
- [x] 按垂直置中 → 三個中心 y 對齊群組 bounding box 垂直中線

**對齊中線（checked）**
- [x] 勾選 checkbox → 按靠左 → 所有標注左邊緣貼圖片左緣（x=0）
- [x] 按水平置中 → 所有標注中心 x 對齊 imgWidth/2
- [x] 按靠右 → 所有標注右邊緣貼圖片右緣
- [x] 靠上 / 垂直置中 / 靠下 同理

**均分（≥3 個）**
- [x] 3 個水平位置不均等的標注 → 按水平均分 → 三個間距目視相等
- [x] 3 個垂直位置不均等的標注 → 按垂直均分 → 三個間距目視相等
- [x] 只選 2 個 → 均分按鈕 disabled（灰色不可點）

**整體**
- [x] 單選時 grpAlign 隱藏，不干擾現有 options bar
- [x] 多選時 grpAlign 顯示於 options bar

---

### v3.31 — 複數選取（框選 + Shift 加選）

#### 功能概述

在選取工具（箭頭）模式下支援複數標注同時選取，為後續對齊工具列奠定基礎。

#### 操作方式

| 操作 | 行為 |
|------|------|
| 箭頭工具 + 點擊標注 | 單選（維持現有行為） |
| 箭頭工具 + Shift + 點擊已選取標注 | 從選取中移除該標注 |
| 箭頭工具 + Shift + 點擊未選取標注 | 加入選取 |
| 箭頭工具 + 空白處拖曳 | 框選（橡皮筋矩形），放開後選取完全包含於框內的標注 |
| 箭頭工具 + 點擊空白處（無拖曳）| 取消全選 |
| 拖曳任一選取標注 | 整組一起移動（每個標注個別 moveAnnot） |
| Delete / Backspace | 整組刪除（逐一 removeAnnot + 單次 pushHistory） |
| Escape | 取消全選，回到零選狀態 |
| Cmd+A | 全選所有標注 |

#### 狀態變數

```javascript
let selectedIds = new Set()   // 目前選取的標注 id 集合（補充現有 selectedAnnot）
let rubberBand  = null        // 框選矩形：{ x0, y0, x1, y1 } canvas 座標，null = 未框選
```

`selectedAnnot`（原單選指標）維持不動，單選時 `selectedIds` 同步為 `{ selectedAnnot.id }`；多選時 `selectedAnnot = null`。

#### 視覺回饋

| 狀態 | 呈現 |
|------|------|
| 多選中的標注 | 原有藍色外框（`drawSelectionBox`）保持；每個選取標注都畫外框 |
| 框選拖曳中 | 淡藍半透明矩形（`rgba(0,122,255,0.12)`）+ 藍色 1px 邊線（`#007AFF`），繪製於 annotCtx 最上層 |
| 框選結束 | 橡皮筋矩形消失，被框住的標注顯示選取外框 |

#### 移動行為

- 拖曳任一選取標注時，計算 `(dx, dy)` → 對 `selectedIds` 內每個標注呼叫 `moveAnnot(a, dx, dy)`
- 移動過程中 **不觸發** pushHistory，mouseup 時才一次 pushHistory
- 正在移動的標注的 resize handle **不顯示**（多選移動時不提供 resize）

#### 與現有功能的相容性

| 場景 | 行為 |
|------|------|
| 單選時所有現有操作 | 不變（resize handle、options bar 等） |
| 多選時點擊非選取標注 | 切換為單選該標注（除非按住 Shift） |
| 多選時 Cmd+C / Cmd+V | 暫不支援（維持現有單選複製貼上） |
| 多選時 Cmd+Z | 回到上一個 history 狀態（整組移動 / 刪除可一次 undo） |

#### 對齊工具列（預留，下一版實作）

多選狀態下，options bar 目前空白區域將顯示對齊按鈕組：

```
[ ⬛← ] [ ⬛↔ ] [ →⬛ ]   ←左對齊、水平置中、右對齊
[ ⬛↑ ] [ ⬛↕ ] [ ↓⬛ ]   ←上對齊、垂直置中、下對齊
```

對齊基準：**圖片邊緣 / 中線**（非選取集合的 bounding box）。

| 按鈕 | 行為 |
|------|------|
| 齊左 | 每個標注的左邊緣對齊圖片左邊緣（x = 0） |
| 水平置中 | 每個標注水平中心對齊圖片水平中線 |
| 齊右 | 每個標注的右邊緣對齊圖片右邊緣 |
| 齊上 | 每個標注的上邊緣對齊圖片上邊緣（y = 0） |
| 垂直置中 | 每個標注垂直中心對齊圖片垂直中線 |
| 齊下 | 每個標注的下邊緣對齊圖片下邊緣 |

本版規格暫不實作，介面留空。

---

#### TDD v3.31

**Shift 加選**
- [x] 箭頭工具下 Shift+點擊第二個標注 → 兩個標注均顯示選取外框
- [x] 再次 Shift+點擊已選取標注 → 該標注取消選取，另一個保持選取

**框選**
- [x] 箭頭工具下在空白處拖曳 → 顯示藍色半透明橡皮筋矩形
- [x] 放開滑鼠 → 完全包含在框內的標注被選取，框消失
- [x] 僅部分重疊的標注（框未完全覆蓋）→ 不被選取

**整組移動**
- [x] 多選後拖曳任一選取標注 → 所有選取標注同步移動，相對位置不變
- [x] 移動完成放開滑鼠 → 一次 Cmd+Z 可還原整組移動

**整組刪除**
- [x] 多選後按 Delete → 所有選取標注同時刪除
- [x] 一次 Cmd+Z 還原整組刪除

**全選**
- [x] Cmd+A → 所有標注顯示選取外框

**取消選取**
- [x] Escape → 清除所有選取
- [x] 點擊空白處（無拖曳）→ 清除所有選取

**相容性**
- [x] 多選後點擊非選取標注（無 Shift）→ 切換為單選該標注
- [x] 單選時所有原有操作（resize、options bar、雙擊文字編輯）均正常

---

### v3.30 — 資安升級 + Retina WYSIWYG + 數字工具修正 + contextBridge 後置修補

#### 資安升級：contextIsolation + Preload 橋接

**動機**
移除 `nodeIntegration: true` / `contextIsolation: false`，消除 XSS 攻擊可直接呼叫 Node.js API 的風險。

**四個視窗全面改為：**
```
nodeIntegration: false
contextIsolation: true
preload: path.join(__dirname, 'src/preload-X.js')
```

**Preload 設計原則**
- 以 `contextBridge.exposeInMainWorld('electronAPI', {...})` 暴露最小必要介面
- IPC 頻道採 `Set` allowlist，呼叫不在名單內的頻道直接拋出 `Error`
- `ipcRenderer.on` 回呼以 `WeakMap` 記錄包裝函式，支援 `removeListener`

| Preload 檔案 | 對應視窗 | 暴露的 API |
|---|---|---|
| `preload-editor.js` | 圖片編輯器 | invoke / send / on / removeListener / clipboard |
| `preload-toolbar.js` | 工具列 | invoke / on / removeListener / getPathForFile |
| `preload-overlay.js` | 擷取遮罩 | invoke |
| `preload-screen-select.js` | 螢幕選擇 | invoke / on |

**Renderer 端改動**
- `editor.js`、`overlay.js`、`renderer.js`、`screen-select.js` 全部移除 `require('electron')` / `require('./i18n')`
- 改用 `window.electronAPI.*` 呼叫 IPC
- `i18n.js` 改為雙模式：Node.js 環境用 `module.exports`，瀏覽器環境掛到 `window.t / window.applyI18n / window.lang`
- `editor.html` / `src/index.html` 加入 `<script src="i18n.js">` 載入順序置於 app script 之前

**Clipboard 架構調整**
原設計於 preload 直接呼叫 `clipboard.writeImage(nativeImage.createFromDataURL(dataURL))`。Electron 41 序列化大型 dataURL 後 contextBridge sub-object 會失效，導致後續 `writeText` 出現 `Cannot read properties of undefined` 錯誤。

改為由 main process 統一處理：
- `ipcMain.handle('clipboard-write-text')`
- `ipcMain.handle('clipboard-write-image')`
- `ipcMain.handle('clipboard-clear')`

Preload 的 `clipboard` 物件改為 `ipcRenderer.invoke(...)` 橋接，API surface 對 editor.js 不變。

---

#### Retina WYSIWYG：imgDPR 狀態變數 + fitScale 校正

**問題**
Retina 螢幕截圖（DPR=2）在編輯器內顯示為 200%，導致標注圓圈在視覺上只有 ViewSonic 延伸螢幕的一半大。

**解法**

| 機制 | 說明 |
|---|---|
| `imgDPR` 狀態變數 | 追蹤來源圖片的像素密度（ViewSonic=1，Retina=2） |
| `scaleFactor` 截圖時傳入 | `screen.getDisplayNearestPoint({x,y}).scaleFactor` 於截圖當下取得，作為第一優先；fallback 為 Sharp metadata `density > 90 → Math.round(density/72)` |
| `fitScale` 上限 `1/imgDPR` | `Math.min(aw/imgWidth, ah/imgHeight, 1/imgDPR)` — Retina 圖片最多縮放到邏輯 100%，確保所見即所得 |
| 標注渲染乘以 `imgDPR` | `r = size * viewScale * imgDPR` — ViewSonic: `size * 1 * 1 = size`；Retina: `size * 0.5 * 2 = size`（CSS pixel 一致） |
| burnIn 匯出 | 設 `viewScale=1`，標注以 `size * imgDPR` 渲染，與圖片像素比例一致 |

---

#### 數字工具修正

**圓圈大小三段（修正自 v3.29）**

| 標籤 | 值 |
|---|---|
| 小 | 18 |
| 中（預設） | 24 |
| 大 | 30 |

v3.29 的「大=32」在 DPR 修正後視覺偏大，調整為 30。

**數字字符垂直置中修正**
舊版以 `textBaseline = 'middle'` 對齊 em-box 中線，字形視覺中心偏上。改用：
```javascript
ctx.textBaseline = 'alphabetic'
const m = ctx.measureText(str)
const yOff = (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2
ctx.fillText(str, cx, cy + yOff)
```

---

#### contextBridge 後置修補

| # | 問題 | 修正 |
|---|------|------|
| 1 | `showOptionsForTool(t)` 參數名 `t` 遮蔽全域 `window.t()` → OCR 工具切換時 `t('ocr_drag')` TypeError | 函數參數改名：`showOptionsForTool(tool)`、`setTool(newTool)` |
| 2 | Electron 41 廢棄 `file.path`，批次拖曳檔案列表空白 | `preload-toolbar.js` 暴露 `webUtils.getPathForFile`；renderer.js drop handler 改用 `window.electronAPI.getPathForFile(f)` |
| 3 | `select-batch-files` 對話框取消時回傳 `null`，`addBatchFiles(null)` 崩潰 | 函數頂部加 `if (!newPaths \|\| newPaths.length === 0) return` |
| 4 | 選色後色彩面板立即關閉，無法連續新增品牌色 | 移除 `applyColor*` 系列函數內的 `hideColorPanel()`；改加 document capture-phase click-outside handler，點色板外才收起 |
| 5 | OCR 複製前的 `clipboard.clear()` 有時造成剪貼簿短暫空白被其他事件插隊 | 移除 `clear()`；`writeText()` 本身即替換剪貼簿內容 |

---

#### TDD v3.30

**資安 — Preload 橋接**
- [x] 工具列：全螢幕截圖、視窗截圖、矩形截圖、延遲截圖均可正常觸發
- [x] 編輯器：Cmd+S 儲存、Cmd+Shift+C 複製圖片、OCR 辨識均正常
- [x] 批次：拖曳 PNG 進批次視窗 → 檔案名稱出現；按「新增檔案」也正常
- [x] 多螢幕選取：點擊目標螢幕 → 截到正確螢幕

**Retina WYSIWYG**
- [x] 於 Retina 螢幕截圖後開啟編輯器：右下角縮放顯示 47%（或接近 `1/DPR` 值），圖片物理尺寸與 ViewSonic 延伸螢幕一致
- [x] 於 ViewSonic 延伸螢幕截圖後開啟編輯器：右下角縮放顯示 100%
- [x] 兩種螢幕的數字圓圈視覺大小一致（中=24 時目視相同）

**數字工具**
- [x] 小/中/大 按鈕對應 18/24/30；預設為「中」（active 狀態）
- [x] 數字字符目視垂直置中於圓圈內（測試單位數 1、雙位數 10、三位數 100）
- [x] Retina 與 ViewSonic 截圖匯出後，數字大小比例一致

**Clipboard（OCR × 圖片複製 互動）**
- [x] 先「複製圖片」（Cmd+Shift+C）→ 再 OCR「複製文字」→ 貼入文字編輯器得純文字
- [x] 先 OCR「複製文字」→ 再「複製圖片」→ 貼入 Preview/Finder 得圖片
- [x] 反覆交替複製 5 次：無崩潰、無 `Cannot read properties of undefined` 錯誤

**色彩面板 click-outside**
- [x] 點擊顏色按鈕：面板開啟
- [x] 點擊面板內色票：顏色套用，面板保持開啟
- [x] 點擊面板外任意位置：面板收起
- [x] 連續點「+」加入多個品牌色：面板全程不關閉
- [x] 切換工具：面板自動收起

**批次拖曳（Electron 41）**
- [x] 從 Finder 拖曳 PNG / JPG / WebP 至批次視窗：檔案名稱正確顯示
- [x] 拖曳後按「開始轉換」：轉換正常完成

---

### v3.29 — 測試修正批次：歷史按鈕、字型預設、數字大小、裁切復原、疊圖限制、OCR 複製、關閉動畫

#### 修正項目

| # | 問題 | 修正 |
|---|------|------|
| 1 | 歷史按鈕無法點擊（游標顯示黑色箭頭） | `titleBarStyle: hiddenInset` 模式下整個視窗為可拖曳區域；為所有 `position:fixed` 互動元件（history drawer、float-drag-export、OCR panel、symbol picker、template panel）及 canvas-area 加上 `-webkit-app-region: no-drag` |
| 2 | 文字工具預設字型大小 48pt 過大 | 預設值改為 24pt；快速選單新增 12pt 與 18pt 選項 |
| 3 | 數字工具圓圈在 Retina DPR 修正後顯示過大 | 小/標準/大 預設半徑由 36/48/56 → 18/24/32（配合 imgSourceDPR 渲染倍率）；預設值同步改為 24 |
| 4 | 裁切（Crop）無法復原 | 裁切前將整幅影像截圖存入 history entry（imgSnap）；裁切後同樣保存截圖以支援 redo；Ctrl+Z 可完整還原影像與標注 |
| 5 | 疊圖（Overlay Image）按鈕誤報「請先刪除現有疊圖」 | 移除一次只能有一張疊圖的限制；允許同時存在多個 img 類型標注 |
| 6 | OCR 複製後剪貼簿仍為圖片型別（無法貼上文字） | OCR 複製按鈕改為先 `clipboard.clear()` 再 `clipboard.writeText()`，確保清除前次複製圖片殘留的 image pasteboard 類型 |
| 7 | 存檔後視窗關閉像閃退 | 改用 IPC `close-editor-window` 讓 main process 呼叫 `win.close()`，恢復 macOS 原生 zoom-out 關閉動畫；延遲由 800ms 拉長至 1200ms 讓 toast 可讀完 |

### v3.28 — 隱私遮蔽工具 + 歷史 Drawer 重設計 + Retina DPR 修正

#### 隱私遮蔽工具（Privacy Mask）— 取代去背功能

**概述**
以 K 鍵全圖掃描或滑鼠拖框指定區域掃描，自動偵測截圖中的敏感資訊並覆蓋非破壞性馬賽克/模糊標注。掃描完成後自動切換至選取工具，可直接拖曳八方向把手精修遮蔽範圍。

**操作方式**
- `K` 鍵：全圖掃描
- 點擊工具列「文̶」→ 拖曳矩形框：限定區域掃描
- 掃描結果為複數獨立 mosaic annotation，可個別 Delete 刪除

**遮蔽方式**
工具列上方選項列可切換：
- 馬賽克（Block size：8 / 16 / 24 / 32 px）
- 模糊（Blur radius：4 / 8 / 16 / 24 px）

**掃描引擎（macOS only — Swift + Vision Framework）**
底層呼叫 Swift 一次性腳本，逐 OCR observation 取得字元範圍精準 bounding box（`VNRecognizedText.boundingBox(for: range)`），非整行遮蔽。

偵測層次（由上至下）：

| 層次 | 技術 | 偵測項目 |
|------|------|---------|
| 1 | NSDataDetector | 電話號碼、Email/URL、實體地址（英文） |
| 2 | NLTagger `.nameType` | 人名、組織名（中英） |
| 3 | Regex — 結構化格式 | TW 身分證、統一編號（排除日期）、信用卡、IPv4、IPv6（完整 8 組）、API Token ≥20 碼 |
| 4 | Regex — 台灣地址 | 縣/市 → 區/鄉/鎮 → 路/街/道 → 數字+號 依序出現 |
| 5 | Regex — 中文標籤感知 | 姓名/名字/聯絡人/收件人/寄件人/負責人/承辦人/密碼/通行碼 後方值 |
| 6 | Regex — 英文標籤感知 | Name/Contact/Recipient/Sender/Manager/Handler/Password/Passcode/PIN 後方值（含 First Last 雙字姓名）|

**統一編號日期排除邏輯**
`\d{8}` 匹配後額外驗證：年 1900–2100、月 01–12、日 01–31 → 判定為日期，跳過不遮。

**已知限制**
- IPv6 被 OCR 斷行時尾端可能漏出（八把手可補）
- 信用卡首字元偶有 bounding box 偏移（八把手可補）
- 英文三字以上人名只遮前兩字（八把手可補）
- 全大寫姓氏（SMITH）只遮名（八把手可補）
- 組織名稱 NLTagger 中文識別率低（不穩定，不列為保證功能）
- 中文地址需符合台灣行政區格式才偵測（英文地址由 NSDataDetector 處理）
- 非 macOS 平台顯示「此功能僅支援 macOS」toast

**工具列位置**
文（OCR）工具右側，快捷鍵：`K`（全圖）/ 工具按鈕拖框（指定區域）

---

#### 歷史截圖面板重設計 — 右側書籤式 Drawer

**改版原因**
原底部 bar 形式因 `.editor-layout` 的 CSS `transform` 屬性導致 `position: fixed` 被鎖在 layout 容器內，面板無法正確定位。

**新設計**
- `#historyDrawer` 移至 `<body>` 直接子層（`</body>` 前、`<script>` 前）
- 垂直置中固定於視窗右緣：`position: fixed; top: 50%; right: 0; transform: translateY(-50%)`
- 書籤 tab（文字直排 `writing-mode: vertical-rl`）點擊展開/收起
- 面板以 `transform: translateX(100%) → translateX(0)` 動畫滑入
- z-index：400（低於 toast 500、高於 modal 200）

---

#### Retina / HiDPI DPR 修正

**問題**：所有 canvas 操作使用 CSS pixel 座標，Retina 螢幕（DPR=2）實際 canvas 解析度未補償，導致筆劃模糊。

**修正**
- `const DPR = window.devicePixelRatio || 1` 於 canvas 初始化時讀取
- `_applyCanvasSize()`：canvas `.width/.height` 設為 `CSS size × DPR`，`style.width/height` 保持 CSS 尺寸
- `baseCtx` / `annotCtx` 套用 `setTransform(DPR, 0, 0, DPR, 0, 0)`，所有繪圖繼續以 CSS px 座標操作
- `drawMosaic()`：讀取 baseCanvas 像素時來源座標乘以 DPR
- 半透明筆劃 off-screen canvas（`_getOffCanvas`）：使用物理尺寸建立、套用 DPR transform、以 CSS 尺寸寫回

---

#### 工具列順序調整

調整前後對比（左→右）：
- 舊：矩形、橢圓、線條、箭頭、鉛筆、文字、編號、符號、去背、馬賽克、OCR...
- 新：…符號、馬賽克、OCR（文）、隱私遮蔽（文̶）— 相關工具相鄰，繼承關係清晰

---

#### TDD v3.29

**OCR 複製衝突**
- [x] 先點「複製圖片」，再進行 OCR 掃描，點「複製文字」→ 貼入任意文字編輯器應得到純文字（不是圖片）
- [x] OCR 複製後再度點「複製圖片」→ 貼入仍為圖片（方向正確）

**存檔關閉動畫**
- [x] 存檔後 toast 顯示「已儲存：xxx」，約 1.2 秒後視窗以 macOS 原生縮小動畫關閉（不閃白、不突然消失）
- [x] 視窗關閉後工具列正常重新出現

**歷史按鈕互動修正**
- [x] 滑鼠移到右側「歷史截圖」tab → 游標顯示手指（pointer），可點擊
- [x] 點擊歷史 tab → 面板滑入；再次點擊 → 面板滑出
- [x] 浮動匯出按鈕（float-drag-export）游標顯示 grab 並可互動
- [x] OCR 面板（開啟後）可正常點擊內部按鈕

**文字工具預設值**
- [x] 新增文字標注時預設字型大小為 24pt（非 48pt）
- [x] 快速選單包含 12pt、18pt、24pt 選項

**數字工具大小**
- [x] 新增數字標注時預設半徑為「標準」（24）
- [x] 小/標準/大 按鈕對應 18/24/32，圓圈大小目視合理

**裁切復原**
- [x] 確認裁切後按 Ctrl/Cmd+Z → 圖片與標注完整還原為裁切前狀態
- [x] 還原後再按 Ctrl+Shift+Z（redo）→ 重新套用裁切
- [x] 裁切後延伸畫布：延伸結果僅包含裁切後的圖片，不出現被裁掉的區域

**疊圖限制移除**
- [x] 已有疊圖時再次點擊「匯入疊圖」→ 可正常開啟檔案選取，不顯示錯誤
- [x] Cmd+V 貼上選取區域後，疊圖按鈕仍可正常使用（不誤判為已有疊圖）
- [x] 同一畫面可同時存在多個 img 類型標注，各自可拖曳縮放

---

#### TDD v3.28

**隱私遮蔽工具**
- [x] 按 K 鍵，顯示「掃描中…」toast，完成後顯示「已遮蔽 N 處」
- [x] 掃描完成後工具列自動切換為選取工具（箭頭）
- [x] 選取工具狀態下點擊 mosaic annotation → 顯示 8 方向白色圓形把手
- [x] 拖曳任意把手 → mosaic 範圍即時更新
- [x] 對掃描出的 mosaic 按 Delete → 單筆刪除，不影響其他 mosaic
- [x] Ctrl/Cmd+Z 還原一次掃描的全部結果
- [x] 無圖片時按 K → 顯示「請先載入圖片」toast
- [x] 非 macOS 平台按 K → 顯示「此功能僅支援 macOS」toast
- [x] 工具列選項列：點擊「馬賽克」→ 顯示 block size 選項；點擊「模糊」→ 顯示 blur radius 選項
- [x] 拖曳框選 → 放開後僅掃描框選範圍內的文字
- [x] 靶紙測試（截圖後掃描）：電話/Email/身分證/統編/信用卡/IPv4/API Token 均被遮蔽
- [x] 靶紙測試：日期 `20260326` **不**被遮蔽（統編日期排除邏輯）
- [x] 靶紙測試：密碼欄位值被遮蔽（中文「密碼：」與英文「Password:」）
- [x] 靶紙測試：台灣地址（縣市區路號格式）被遮蔽
- [x] 靶紙測試：「不應被遮蔽」段落（純中文說明文字）完全乾淨

**歷史 Drawer**
- [x] 點擊右側書籤 tab → 面板從右側滑入
- [x] 再次點擊 tab 或點擊 ✕ → 面板滑出
- [x] 面板在各種縮放比例下均固定於視窗右緣、垂直居中

**Retina 渲染**
- [x] Retina 螢幕下標注筆劃清晰、無模糊（對比修正前截圖）
- [x] 100% 縮放下圖片與標注像素對齊

---

### v3.27 — 批次 WebP 恢復 + 浮水印 + 去背 + 品牌色庫 + 歷史截圖面板

#### 批次 WebP 恢復
- 批次轉換格式選單恢復 WebP 選項（PNG / JPG / WebP / GIF）

#### 批次浮水印
- 批次轉換新增浮水印設定區塊（在輸出位置下方）
- 支援**文字浮水印**：文字內容、字級（px）、顏色（color picker）、不透明度（%）
- 支援**圖片浮水印**：選取 PNG/JPG/WebP/GIF 圖片、寬度佔比（%）、不透明度（%）
- 兩種浮水印可同時啟用（文字在下、圖片在上，均參照同一位置設定）
- **9-grid 位置選擇器**：預設右下角（southeast）
- **邊距**：0–500px，預設 20px
- 圖片不透明度透過 raw buffer 操作 alpha channel 實作，確保任何格式均可套用

#### 去背（主體提取）
- 使用 macOS 12+ Vision Framework `VNGenerateForegroundInstanceMaskRequest`
- 去背按鈕位於工具列（原「去背 Pro 版佔位」按鈕，已解鎖）
- 快捷鍵：`K`
- 去背後結果取代底圖，標注清空（可 Undo）
- 非 macOS 平台觸發時顯示「此功能僅支援 macOS 12 以上」提示

#### 品牌色庫
- 顏色選取器面板新增「品牌色庫」區塊（位於最近使用色與工具列之間）
- `+` 按鈕：將目前選取色加入品牌色庫
- 右鍵單一色票：從色庫移除
- 品牌色持久化儲存於 `userData/brand-colors.json`

#### 歷史截圖面板
- 編輯器底部 bar 新增「歷史」按鈕（在複製按鈕左側）
- 儲存或複製時自動記錄縮圖（JPEG 150px 寬，約 5–10 KB/張）+ 檔案路徑
- 最多保留 20 筆，超過自動移除最舊記錄
- 歷史面板點擊縮圖：若有儲存路徑且檔案存在，直接重新開啟
- 持久化儲存於 `userData/history.json`

#### TDD v3.27
- [x] 批次轉換格式選單包含 WebP
- [x] 勾選「加入浮水印」，文字/圖片區塊展開；取消勾選，區塊收起
- [x] 文字浮水印：輸入文字後轉換，輸出圖片含對應文字
- [x] 圖片浮水印：選取 Logo 後轉換，輸出圖片含 Logo 疊圖
- [x] 浮水印位置：點選 9-grid 各格，轉換結果浮水印位置正確
- [ ] 去背按鈕可點擊（不再 disabled）
- [ ] 按 K 鍵觸發去背，顯示「主體提取中…」toast
- [ ] 去背成功：底圖更換為透明背景版本，標注清空
- [ ] 去背失敗（非 macOS）：顯示對應錯誤 toast
- [x] 顏色選取器面板含「品牌色庫」區塊
- [x] 點擊 + 加入色票，區塊顯示新色票
- [x] 右鍵色票移除，關閉再開啟面板後色票已消失
- [x] 重啟 app 後品牌色庫仍存在
- [ ] 「歷史」按鈕點擊，面板在底部 bar 上方展開
- [ ] 執行儲存後，歷史面板出現對應縮圖
- [ ] 執行複製後，歷史面板出現對應縮圖（標示「已複製」）
- [ ] 重啟 app 後歷史仍保留

---

### v3.26 — 套版三滑桿 + 批次轉換移除 WebP

#### 套版面板新增三個即時滑桿
- **留白**（Padding）：2–30%，預設 9%
- **圓角**（Border Radius）：0–10，預設 5（radius factor = value × 0.005）
- **陰影**（Shadow）：0–10，預設 5（blur factor = value × 0.008）
- 滑桿調整後 120ms debounce 自動重套版（從快照重算，不疊加）
- 滑桿數值在面板關閉後保留，下次開啟沿用

#### 批次轉換移除 WebP
- 批次轉換格式選單僅保留 PNG / JPG / GIF
- WebP 仍可於圖片編輯器單檔匯出

#### TDD v3.26
- [x] 留白滑桿拖動：圖片背景邊框隨即改變寬度
- [x] 圓角滑桿拖到 0：圖片角落變為直角
- [x] 陰影滑桿拖到 0：無陰影；拖到 10：明顯投影
- [x] 關閉面板再重開：滑桿數值與上次一致
- [x] 批次轉換格式選單不含 WebP
- [x] 單檔匯出仍可選 WebP

---

### v3.25 — mesh gradient + 社群尺寸（見 v3.24 底部說明）

#### 背景改用多點放射疊加（Mesh Gradient）
- 所有 6 款套版改用 `_tplMesh()` helper（多個 radial blob 疊加）
- 縮圖 CSS 同步改為多層 radial-gradient
- 紫色模板增加第 4 個光球，形成極光效果

#### 社群尺寸快選
- Auto / LinkedIn 1.91:1 / Instagram 1:1 / X 16:9
- 以 `_tplTargetRatio` 狀態驅動，`_tplGradLayout` 自動計算使圖片置中

---

### v3.24 — 一鍵套版重設計：全改 Apple 漸層六色

#### 變更內容
- 移除原有 6 款套版（拍立得、底片、Apple 暖、Apple 冷、Mac 視窗、行動裝置）
- 改為 Apple 風格明亮漸層六色：

  | ID | 名稱 | 漸層起點 | 漸層終點 |
  |----|------|----------|----------|
  | `apple-red`    | Apple 紅 | `#ff512f` | `#dd2476` |
  | `apple-orange` | Apple 橙 | `#f7971e` | `#ffd200` |
  | `apple-yellow` | Apple 黃 | `#ffe259` | `#ffa751` |
  | `apple-green`  | Apple 綠 | `#43e97b` | `#38f9d7` |
  | `apple-blue`   | Apple 藍（水藍色系） | `#4facfe` | `#00f2fe` |
  | `apple-purple` | Apple 紫 | `#c471f5` | `#fa71cd` |

- 所有套版採用統一 layout（`_tplGradLayout`：短邊 9% 留白）與 drawImg（`_tplGradDrawImg`：圓角 + 投影）
- 新增共用 `_tplGradLayout` / `_tplGradDrawImg` 函式

#### TDD v3.24
- [x] 面板顯示 6 張卡片，背景顏色依序為紅橙黃綠藍紫漸層
- [x] Apple 藍套版：背景為天藍 → 水藍漸層（非深藍紫）
- [x] 所有套版圖片具圓角與陰影效果
- [x] 各套版套用後圖片尺寸正確（加上 9% 四邊留白）
- [x] Undo 可還原套版

---

### v3.23 — 一鍵套版 Snapshot 修正（防止層疊套用）

#### 問題描述
面板開啟後多次點選不同套版，導致每次都在前一次套版的結果上再疊加，而非從原圖重新套版。

#### 修正內容
- 新增狀態變數 `_tplBaseSnapshot`（dataURL + width + height + annotations 深拷貝）
- `openTemplatePanel()`：當面板從隱藏變為顯示時，快照當前圖片與標註
- `applyTemplate()`：改為從快照圖片（而非 `imgElement`）計算 layout 並合成；套用後還原快照的標註再平移；面板保持開啟，供使用者切換不同套版
- `hideTemplatePanel()`：關閉面板時清除快照（`_tplBaseSnapshot = null`）

#### TDD v3.23
- [x] 面板開啟後連續點選不同套版：每次都從原圖套用，不疊加
- [x] 面板開啟後套用套版 A，再點套版 B：最終圖片為 B 效果（非 A+B 疊加）
- [x] 關閉面板後再次開啟：重新快照當前（已套版）圖片作為新基底
- [x] 套版後 annotation 位置仍正確（以快照時的座標為基準再平移）
- [x] 每次套版仍支援 Undo（`pushHistory()` 在每次套用前呼叫）

---

### v3.22 — 一鍵套版（MVP：6 款裝飾框架）

#### 功能概述
- **工具列按鈕**：`▣`，位於「疊入圖片」按鈕下方，點擊開啟套版選擇浮動面板
- **套版種類（6 款）**：
  | ID | 名稱 | 效果 |
  |----|------|------|
  | `polaroid` | 拍立得 | 純白底，上/左/右等寬留白，下方留白 3.5× 厚 |
  | `film` | 底片 | 近黑底，左右兩側柯達式片孔（圓角矩形） |
  | `apple-warm` | Apple 暖 | 橘粉珊瑚漸層底，圖片圓角 + 投影 |
  | `apple-cool` | Apple 冷 | 深藍紫漸層底，圖片圓角 + 投影 |
  | `mac-window` | Mac 視窗 | 灰色標題列 + 紅黃綠圓點，圖片置於視窗內 |
  | `mobile` | 行動裝置 | 深色手機外框，含 Dynamic Island + 底部 Home bar |
- **套用行為**：
  - 先 `pushHistory()`（支援 Undo）
  - 建立 offscreen canvas，畫背景 + 原圖
  - 更新 `imgElement / imgWidth / imgHeight`
  - 所有現有 annotation 座標以 `moveAnnot(a, imgX, imgY)` 平移
  - 呼叫 `fitCanvas() + drawBase() + renderAnnotations()`
- **留白比例**：以 `Math.min(imgWidth, imgHeight)` 為基準，各 style 8–10%

#### TDD v3.22
- [x] 點 `▣` 按鈕：面板出現，顯示 6 個套版縮圖卡片
- [x] 無圖片時點按鈕：toast 提示「請先載入圖片」，不開面板
- [x] 套用「拍立得」：圖片被白框包圍，下方留白明顯比上方厚
- [x] 套用「底片」：黑色背景，左右可見片孔排列
- [x] 套用「Apple 暖」：橘粉漸層底，圖片有圓角與陰影
- [x] 套用「Apple 冷」：深藍紫漸層底，圖片有圓角與陰影
- [x] 套用「Mac 視窗」：頂部灰色標題列，可見紅黃綠三個圓點
- [ ] 套用「行動裝置」：深色手機外框，上方有膠囊形 Dynamic Island
- [ ] 套版後現有 annotation 位置正確（不偏移）
- [ ] 套版後可 Undo 還原（⌘Z 恢復原圖）
- [ ] 套版後關閉面板，再次開啟並套另一款：以已套版圖片為基底，正確產生新套版
- [ ] 套版後「完成並儲存」：匯出圖片包含套版效果

---

### v3.21 — 符號工具重構：多群組按鈕 + 馬賽克參數顯示修正

#### 符號工具多群組架構
- **工具列**：原單一 `☺` 按鈕改為 4 個群組按鈕，各自帶獨立的浮動面板與分頁
  - `★` → 形狀（幾何 / 裝飾）
  - `Ａ` → 字母（圓框 / 全形 / 粗體 / 粗斜 / 草書）
  - `→` → 箭頭（一般 / 雙線 / 三角）
  - `©` → 其他（標記 / 貨幣 / 數學 / 技術）
- **字母群組**：僅收錄 Unicode 中 A–Z 26 個字母全部完整的 style；使用 `String.fromCodePoint` 範圍生成，避免缺字問題
  - 圓框 Ⓐ–Ⓩ ⓐ–ⓩ　全形 Ａ–Ｚ ａ–ｚ　粗體 𝐀–𝐙 𝐚–𝐳　粗斜 𝑨–𝒁 𝒂–𝒛　草書 𝓐–𝓩 𝓪–𝔃
- **動態 tab**：`buildSymTabs(group)` 動態生成 tab 按鈕；`buildSymGrid(group, cat)` 動態生成符號格
- **狀態變數**：`activeSymGroup`（目前群組）+ `symCurrentCat`（目前分頁）
- **鍵盤 U**：開啟 `activeSymGroup` 的面板
- **Swatch 點擊**：重新開啟目前群組面板（toggle）

#### 馬賽克參數顯示修正
- **問題**：`grpMosaicBlock` / `grpMosaicBlur` 使用 `mosaic-int-group` class，該 class 未定義 `.hidden` 規則，導致兩組參數同時顯示
- **修正**：改為 `opt-group` class，直接使用已定義的 `.opt-group.hidden { display: none }` 規則

#### 符號大小欄位同步修正
- **問題**：拖曳 SE 手把調整符號大小後，options bar 的大小輸入欄未同步
- **修正**：mouseup 完成 resize 後，若選取的是 symbol annotation，立即更新 `symbolSizeInput.value`

#### TDD v3.21
- [ ] 工具列出現 4 個符號群組按鈕（★ Ａ → ©），各自可點擊開啟對應面板
- [ ] 形狀面板：包含「幾何」「裝飾」兩個 tab，各顯示對應符號格
- [ ] 字母面板：包含「圓框」「全形」「粗體」「粗斜」「草書」5 個 tab，每 tab 顯示 52 個字符
- [ ] 箭頭面板：包含「一般」「雙線」「三角」3 個 tab
- [ ] 其他面板：包含「標記」「貨幣」「數學」「技術」4 個 tab
- [ ] 點同一群組按鈕再次點擊：面板 toggle 關閉
- [ ] Swatch 點擊：重新開啟目前群組面板
- [ ] 鍵盤 U：開啟目前 activeSymGroup 的面板
- [ ] 馬賽克模式下：只顯示區塊大小選項（4/8/16/32），不顯示模糊強度
- [ ] 模糊模式下：只顯示強度選項（4px/8px/16px/24px），不顯示區塊大小
- [ ] 符號 SE 手把拖曳後：options bar 大小欄位正確顯示新數值

---

### v3.20 — 符號工具選取框精準化 + 移除重複符號

#### 符號選取框修正
- **問題**：選取框使用 `size × size` 固定正方形，與實際字符渲染尺寸不符
- **修正**：新增 `measureSymbol(char, size)` helper，使用 Map 快取，以 `measureText()` 的 `actualBoundingBoxAscent / Descent / width` 計算實際字符邊界
- **`bounds()` 更新**：symbol 類型改為 `{ x: a.x - hw, y: a.y - ascent, w: hw*2, h: ascent+descent }`
- **`getHandles()` 更新**：SE 手把位置改為 `(a.x + hw, a.y + descent)`，對齊字符實際右下角

#### 符號集移除重複項
- **問題**：「標記」分類中含有 `⓪①②③`，與既有「編號」工具（圓形樣式）功能重複
- **修正**：從 `SYMBOL_SETS.marks` 移除 `⓪①②③`

#### TDD v3.20
- [ ] 選取符號 `★`（size=64）：選取框緊貼字符邊緣，不超過 10px 誤差
- [ ] 選取 Emoji 符號（如 🔥）：選取框貼合字符，不使用 64×64 固定框
- [ ] SE 手把：位置位於字符右下角，可拖曳調整大小
- [ ] 符號印章「標記」分類：不再出現 ⓪①②③ 符號

---

### v3.19 — 無縫匯入匯出（MVP：Drag & Drop + 複製 + Drag Out）

#### 匯入：Drag & Drop
- **任意位置放開**：在 editor 視窗任何位置拖曳圖片檔（PNG/JPG/WebP/GIF）放開即可匯入
- **視覺回饋**：拖曳進入時出現紫色虛線框 + 半透明背景覆蓋層，離開或放開後消失
- **行為**：匯入後取代現有底圖，清空所有 annotation，重置 undo history
- **技術**：純 renderer 實作（FileReader API），無需 IPC；`dragenter` / `dragleave` depth 計數防止子元素觸發閃爍

#### 匯出：複製到剪貼簿
- **按鈕**：底部列「複製」按鈕；快捷鍵 `⌘⇧C`
- **行為**：`burnIn('png')` → `nativeImage.createFromDataURL` → `clipboard.writeImage`
- 所有 annotation 燒入，原始解析度輸出

#### 匯出：拖曳匯出（Drag Out）
- **按鈕**：底部列「⬆ 拖曳匯出」handle（cursor: grab）
- **行為**：`mousedown` → `ipcRenderer.send('start-drag-export', { dataURL })` → main.js 寫暫存 PNG → `event.sender.startDrag({ file, icon })`
- 成品可直接拖到 Line / Slack / Finder / 桌面等任何接受圖片的目標

#### 尚未實作（v1.x 規劃）
- Dock 圖示接受拖曳（需 macOS Info.plist `CFBundleDocumentTypes` + `NSServices`）
- Share Sheet 匯入 / AirDrop 匯出（需打包為正式 `.app` + bundle ID）
- 批次 WebP 匯出（Pro 版功能）

#### TDD v3.19
- [ ] 拖曳 PNG 進視窗：出現紫色 drop overlay，放開後圖片載入至編輯器
- [ ] 拖曳 JPG / WebP / GIF：同上，均可載入
- [ ] 拖曳非圖片檔案（.pdf / .txt）：不載入，顯示 toast 錯誤提示
- [ ] 拖曳圖片進入視窗再拖出（不放開）：overlay 消失，不影響現有圖片
- [ ] 已有 annotation 時匯入新圖片：annotation 清除，底圖更新
- [ ] 「複製」按鈕：點擊後 toast 顯示「圖片已複製到剪貼簿」
- [ ] ⌘⇧C：同上效果
- [ ] 複製後貼到 Keynote / Figma：圖片含所有 annotation 正確顯示
- [ ] 「拖曳匯出」handle：mousedown 後拖曳至 Finder 桌面，出現 PNG 檔案
- [ ] 「拖曳匯出」handle：拖至 Slack 聊天室，直接傳送圖片

---

### v3.18 — 新工具：馬賽克/模糊 + 符號印章

#### 馬賽克/模糊工具（annotation-based）
- **工具列按鈕**：`▦`，快捷鍵 `X`，啟用 `data-tool="mosaic"`
- **操作流程**：拖曳繪製矩形區域 → 即時預覽效果（紫色虛線框）→ 放開滑鼠後自動 commit 為 `mosaic` annotation
- **馬賽克模式**：`getImageData / putImageData` 像素取樣平均化，區塊大小 4 / 8 / 16 / 32 px（圖像像素）
- **模糊模式**：`ctx.filter = 'blur(Npx)'` offscreen compositing，強度 4 / 8 / 16 / 24 px
- **讀取來源**：`baseCanvas`（不含其他 annotation），馬賽克只遮蔽底圖像素
- **可移動 / 縮放**：支援 8 個方向 resize handle（與 rect 相同）；支援 Cmd+C/V 複製貼上
- **Undo 支援**：annotation-based，完整納入 pushHistory / undo 機制
- **Options Bar 選項**
  - 模式切換：馬賽克 / 模糊（`btnMosaicModeMosaic` / `btnMosaicModeBlur`）
  - 馬賽克區塊大小：4 / 8 / 16 / 32 按鈕（`grpMosaicBlock`）
  - 模糊強度：4px / 8px / 16px / 24px 按鈕（`grpMosaicBlur`）
- **Annotation 資料結構**：`{ type: 'mosaic', x, y, w, h, mode, blockSize, blurRadius }`

#### 符號印章工具（Symbol Stamp）
- **工具列按鈕**：`☺`，快捷鍵 `U`，啟用 `data-tool="symbol"`
- **操作流程**：選取工具 → 點擊畫面 → 符號即時置放在點擊位置
- **渲染**：`fillText()` + `font-size = size * viewScale`，顏色由 grpColor 控制，支援陰影
- **字型 fallback**：`'Apple Color Emoji', 'Noto Sans Symbols 2', 'Segoe UI Symbol', sans-serif`
- **符號選取面板**（浮動 panel，點擊 `symbolPreviewSwatch` 開啟）
  - 4 個分類 Tab：幾何 / 標記 / 箭頭 / 其他
  - 每類 24 個常用 Unicode 符號，8 列格狀排列
- **Bounds 計算**：以 x,y 為中心，size 為直徑（方形包圍盒）
- **Resize**：單一 SE 角 handle，拖曳調整 size 值
- **Options Bar**：grpColor（顏色）+ grpSymbol（符號選取 + 大小輸入）+ grpShadow（陰影）
- **Annotation 資料結構**：`{ type: 'symbol', x, y, char, color, size, shadow }`

#### 其他異動
- `bounds()`、`moveAnnot()`、`getHandles()`、`startResize()`、`applyResize()`：新增 `mosaic` / `symbol` 支援
- crop 座標平移、resize 等比縮放：新增 `mosaic` / `symbol` 支援
- `grpMosaic`、`grpSymbol` 加入 `hideAllOptions` 清單

#### TDD v3.18
- [ ] 馬賽克工具：拖曳繪製，即時預覽（紫色虛線框＋馬賽克效果），放開後 commit 為 annotation
- [ ] 馬賽克工具：拖曳距離 < 4px，不產生 annotation
- [ ] 馬賽克模式：選取 annotation 後切換區塊大小（4/8/16/32），效果即時更新
- [ ] 模糊模式：切換至模糊，選取強度（4/8/16/24px），效果即時更新
- [ ] 馬賽克 annotation：支援移動、8 方向縮放，效果隨位置/大小更新
- [ ] 馬賽克 annotation：Cmd+Z 撤銷，Cmd+Y 重做
- [ ] 馬賽克 annotation：Cmd+C 複製，Cmd+V 貼上，位置偏移 8px
- [ ] 符號印章工具：點擊畫面，在點擊位置置放目前符號
- [ ] 符號印章面板：點擊 swatch 開啟浮動 panel，四個分類 Tab 可切換
- [ ] 符號印章面板：點擊符號，swatch 更新，panel 關閉
- [ ] 符號大小輸入框：輸入 64，annotation 的 size 更新，顯示大小改變
- [ ] 符號顏色：透過 grpColor 改色，annotation 即時更新
- [ ] 符號 annotation：支援移動（SE handle 縮放）、Cmd+Z 撤銷
- [ ] 快捷鍵：X 啟動馬賽克工具；U 啟動符號印章工具
- [ ] Escape：馬賽克工具拖曳中按 Esc，取消預覽框，回到空白狀態

---

### v3.17 — Bug 修正：鉛筆工具粗線箭頭方向跑掉

#### Bug 修正
- **粗線箭頭方向錯誤**：`stableFrom` 的查找距離上限從 `insetImgPx × 1.2`（隨線寬等比放大）改為 `min(insetImgPx, thickness × 2.5 + 10)`，避免在粗線情境下回看距離過大繞過曲線彎道、讀到錯誤方向

#### TDD v3.17
- [ ] 鉛筆工具，thickness ≥ 20，終點有彎曲：箭頭方向應反映線段實際末端方向，不跑到彎道另一側
- [ ] 鉛筆工具，thickness = 5（細線）：箭頭方向不退化，行為與修改前一致

---

### v3.16 — Bug 修正：箭頭露餡 + 缺口 + 調色盤自動收起

#### Bug 修正
- **鉛筆工具箭頭露餡與缺口**：`buildPath` 在每個箭頭端點加入 0.5 image-px 的小步伐，使 bezier 路徑以箭頭軸向切入箭頭基底，butt cap 垂直於箭頭軸心，完全藏在三角形填色下方
- **調色盤自動收起**：選色後不再停留在畫面上；`applyColor`、`applyFillColor`、`applyFillColorA`、`applyFillColorB`、`applyFillBorderColor`、`applyTextStrokeColor`、`applyTextBgColor` 統一在執行後呼叫 `hideColorPanel()`

#### TDD v3.16 測試項目
- [ ] 鉛筆 arrow 箭頭：箭頭基底與線段主體無缺口，無露餡（有無外框皆測）
- [ ] 鉛筆 arrow 起點與終點：同上
- [ ] 主色（筆形、線段、外框、色塊、文字）：選色後調色盤自動收起
- [ ] 漸層色 A/B、填色外框色、文字底色：同上
- [ ] 外框色（已有自動收起）：行為不受影響

---

### v3.15 — Bug 修正：鉛筆箭頭與線段斷開

#### Bug 修正
- **鉛筆箭頭線段斷開**：`buildPath()` 的截止點改用 `arrowBase(pN, pFromN)`（與 `drawCap` 完全相同的 stable-direction 向量計算），與箭頭基底的座標完全吻合；消除因修剪方向（原用 `pts[n-2]→pts[n-1]`）與箭頭方向（`pFromN→pN`）不同所造成的缺口

---

### v3.14 — Bug 修正：箭頭方形頂點 + 外框位移

#### Bug 修正
- **箭頭方形頂點消除**：直線與鉛筆工具，線段主體在箭頭端點改為「截止於箭頭基底」（arrInset = sz × 0.8），不再延伸到尖端；消除線段矩形端口在箭頭尖端的方形露出
- **外框不再位移**：棄用「大三角疊小三角」方案；改由修改 `drawCap()` 支援 `borderCol/borderW` 參數，以「先 stroke 後 fill 同一路徑」實作外框；外框邊線緊貼箭頭三角形邊緣，無前後位移感
- **drawCap 重構**：新增 `borderCol`、`borderW` 選用參數；`arrow`/`dot` 皆支援；向下相容（舊呼叫無需傳入參數）

---

### v3.13 — Bug 修正：箭頭外框金字塔 + 鉛筆箭頭角度偏移

#### Bug 修正
- **外框箭頭「金字塔」消除**：直線與鉛筆工具的外框端點大小，由 `(borderThickness × 4 + 8) × viewScale`（與主線完全不成比例）改為 `sz + (borderThickness − thickness) × viewScale`，外框三角形現在只比主三角形微幅外擴，視覺上呈正常描邊效果
- **鉛筆箭頭角度穩定**：手繪點密集時 pts[1] / pts[n-2] 方向不穩定；新增 `stableFrom()` 函數，向後搜尋第一個距端點至少 `thickness × 2 + 4` 圖素遠的取向點，箭頭角度現在能正確貼合筆跡走向

---

### v3.12 — Bug 修正：直線端點外框 + 空心圓端點符號

#### Bug 修正
- **直線端點不套外框**：`drawLine` 在繪製外框路徑後，補上以外框色 + 較大 `borderSz` 繪製的 border cap，再疊上主色 cap，arrow / dot 端點正確出現外框輪廓
- **空心圓符號優化**：端點選單的 `round` 選項從 `○`（U+25CB）改為 `◯`（U+25EF 大空心圓），視覺上更清晰易辨

---

### v3.11 — Bug 修正：鉛筆端點外框 + 虛實線失效 + 外框群組移至最後

#### Bug 修正
- **鉛筆端點不套外框**：`drawPen` 在繪製外框路徑後，現同步繪製外框色端點（border cap），再疊上主色端點，使 arrow / dot 端點正確呈現外框效果
- **鉛筆虛實線失效**：外框段落呼叫 `ctx.setLineDash([])` 重設後，主筆跡繪製前未重新套用 `lineStyle`，導致主線永遠為實線；現於主筆跡 `buildPath()` 前補上 `ctx.setLineDash(getLineDash(a.lineStyle, sz))`
- **外框群組排序**：`grpLineStyle`（線條外框）、`grpPenBorder`（鉛筆外框）、`grpStrokeBorder`（框線外框）三個群組移至 options bar 最後，使主線設定（線條 → 端點 → 不透明）連貫，外框作為獨立附加群組置於末端

---

### v3.10 — Bug 修正 + 端點 UI 精簡 + 外框粗細/虛實線分組

#### Bug 修正
- **X 光曝光修正**：line / polyline / pen 在不透明 < 100% 時，使用 offscreen canvas 合成整段線後再以單一 globalAlpha 繪至主畫布，徹底消除 cap 與主線重疊處的雙重曝光效果
- **鉛筆端點透明修正**：arrow / dot cap 繪製移入同一 save/restore 區塊，正確繼承 globalAlpha
- **鉛筆縮放 handle**：pen annotation 選取後顯示 8 個外框縮放手把（與 polyline 相同邏輯），支援等比例縮放

#### UI 精簡：grpCaps → 下拉選單
- 起點 / 終點各改為 `<select class="cap-select">（寬 52px）`，取代原本 5+5 = 10 顆按鈕
- 選項符號：`―`(none) `○`(round) `●`(dot) `⏹`(square) `◀/▶`(arrow)

#### 外框細節升級（三處）
- **grpLineStyle**：新增 `lineBorderThicknessInput`（px）+ `lineBorderDashSelect`（虛實線）
- **grpPenBorder**：新增 `penBorderThicknessInput` + `penBorderDashSelect`
- **grpStrokeBorder**（rect/ellipse）：新增 `strokeBorderThicknessInput` + `strokeBorderDashSelect`
- 外框粗細以絕對 px 儲存於 `borderThickness`；外框虛實線儲存於 `borderDashStyle`（與主線 `lineStyle` 獨立）

#### 狀態變數新增
- `lineBorderThickness`, `lineBorderDashStyle`
- `penBorderThickness`, `penBorderDashStyle`
- `rectBorderThickness`, `rectBorderDashStyle`
- `ellipseBorderThickness`, `ellipseBorderDashStyle`

#### 技術實作細節
- `drawOne`：新增 offscreen 路徑（`_offCanvas` 共用畫布避免 GC 壓力）
- `drawLine/drawPen`：讀取 `a.borderThickness` / `a.borderDashStyle`
- `drawRect/drawEllipse`：讀取 `a.borderThickness` / `a.borderDashStyle`
- `getHandles`：pen 加入 bb_* 8 個手把
- `startResize` / `applyResize`：pen 與 polyline 共用 isBBoxResize 邏輯

### v3.9 — Options Bar 全面對齊；框線外框位移；虛實線全工具覆蓋

#### Options Bar 重構
- 新增 `grpDashStyle`（虛實線 select）：共用於 pen / line / polyline / rect / ellipse / fillrect / fillellipse
- 新增 `grpPenBorder`：筆型工具外框色 swatch（從 grpPen 拆出，DOM 位置移至粗細後）
- 新增 `grpStrokeBorder`：框線工具（rect / ellipse）外框色 + X/Y 位移輸入
- 新增 `grpStrokeOpacity`：共用不透明度 input（pen / line / polyline / rect / ellipse）
- `grpLineStyle` 精簡為：外框色 swatch + 直角按鈕（線條/折線專屬）
- `grpPen` 移除（功能分拆至 grpPenBorder + grpStrokeOpacity）
- 直角（`btnLineOrtho`）：顯示於 line 工具；折線 annotation 選取時自動隱藏

#### 各工具最終 Options Bar 順序
- **筆形**：顏色－粗細－外框－虛實線－起點－終點－不透明－陰影
- **線條**：顏色－粗細－外框＋直角－虛實線－起點－終點－不透明－陰影
- **框線**：方/圓－顏色－粗細－外框（色+XY）－虛實線－圓角－不透明－陰影
- **色塊**：方/圓－實色/漸層－粗細－邊框色－虛實線－圓角－透明度（grpFillColor 內）－陰影

#### 框線工具新功能
- **外框色**：rect/ellipse 新增第二層描框，`borderColor`（預設 transparent）
- **外框位移**：`borderOffsetX` / `borderOffsetY`（px，-50 至 +50），形成位移外框設計效果
- 外框繪製在主框之前，不帶陰影；主框繪製在後，套用陰影（若啟用）
- **透明度**：rect/ellipse 新增 `opacity` 欄位（0–100，預設 100）
- **虛實線**：rect/ellipse 邊框現在支援全部 6 種虛實線樣式

#### 線條／折線新功能
- **透明度**：line/polyline 新增 `opacity` 欄位（0–100，預設 100）

#### 色塊工具新功能
- **虛實線**：fillrect/fillellipse 邊框現在支援全部 6 種虛實線樣式，存於 `lineStyle` 欄位

#### 狀態變數新增
- `rectOpacity`, `ellipseOpacity`, `lineOpacity`
- `rectBorderColor`, `rectBorderOffsetX`, `rectBorderOffsetY`
- `ellipseBorderColor`, `ellipseBorderOffsetX`, `ellipseBorderOffsetY`
- `rectLineStyle`, `ellipseLineStyle`, `fillrectLineStyle`, `fillellipseLineStyle`
- `syncDashStyle()` 取代 `syncLineStyle()`（保留 alias 向下相容）
- `syncStrokeOpacity()`, `syncStrokeBorderColor()`, `syncStrokeBorderOffset()`

### v3.8 — 工具一致性升級（邊框／陰影統一）

#### 色塊工具邊框簡化
- 移除 `grpFillColor` 中的「有」「無」邊框按鈕（`btnFillBorderOn` / `btnFillBorderOff`）
- 邊框顯示邏輯改為：`thickness > 0` 且 `fillBorder !== false` 才繪製（向下相容舊資料）
- 新建 fillrect / fillellipse 時不再寫入 `fillBorder` 欄位（預設有邊框 = 粗細 > 0 即顯示）
- 移除 `fillBorderEnabled` 狀態變數、`syncFillBorder()`、`applyFillBorder()` 函式及對應事件綁定

#### 線條／折線新增外框色
- `grpLineStyle` 新增「外框」色彩 swatch（`lineBorderColorPreview`）
- 預設 `transparent`（無外框）；使用者點選後啟用外框，顏色選完後自動關閉選色面板
- `lineBorderColor` 狀態變數（預設 `'transparent'`）；`syncLineBorderColor()` 同步 UI
- `drawLine` / `drawPolyline` 繪製時：先以 `(thickness + 4) × viewScale` 線寬描邊外框色，再疊上主色
- `line` / `polyline` annotation 新增 `lineBorderColor` 欄位

#### 線條／折線新增陰影
- `grpShadow` 現在在工具切換為 `line` 時也會顯示
- `lineShadow` 狀態變數（預設 `false`）；`shadowCheck` handler 統一分派
- `line` / `polyline` annotation 新增 `shadow` 欄位
- `showOptionsForAnnot` 讀取已存 annotation 的 `shadow` 與 `lineBorderColor` 並同步 UI

### v3.7 — 筆型工具；虛線種類升級；端點樣式升級

#### 虛線種類升級（線條 / 折線 / 筆型共用）
- `grpLineStyle` 從 2 個按鈕改為 `<select>` 下拉，支援 6 種：
  - `solid` 實線、`dash` 短虛線、`dash-lg` 長虛線、`dot` 點線、`dot-dash` 點虛線、`dash-dot-dot` 長點點
- 新增 `getLineDash(style, sz)` helper 統一換算 `setLineDash` 陣列

#### 端點樣式升級（線條 / 折線 / 筆型共用）
- `grpCaps` 起點與終點各新增「圓頭 (round)」與「方頭 (square)」選項（共 5 種）
- 新增 `capToLineCap(startCap, endCap)` helper，自動決定 canvas `lineCap`
- `drawCap` 對 `round`/`square` 直接 return（由 `lineCap` 處理，不需額外繪製）

#### 筆型工具（pen）
- 工具列「✏」按鈕啟用，快捷鍵 `P`
- 按住拖曳收集路徑點（每 2px 取樣一次），mouseup 時 commit 為 `pen` annotation
- `drawPen` 使用 `quadraticCurveTo` 平滑曲線渲染
- 共用 grpColor（顏色）、grpThickness（線寬）、grpLineStyle（虛線）、grpCaps（起終點端點）、grpShadow（陰影）
- 新增 `grpPen` panel（筆型專屬）：
  - 不透明度 0–100%（預設 100）
  - 外框色 swatch（預設 transparent；挑色後自動啟用外框，選色後關閉面板）
- `pen` annotation 資料結構：`{ type, points, color, thickness, lineStyle, startCap, endCap, penOpacity, penBorderColor, shadow }`
- 支援選取、移動、Cmd+C/V 複製貼上；bounds 計算與 moveAnnot 已擴充

### v3.6 — 框型選取工具（矩形區域複製為浮動圖層）

#### 框型選取工具（boxselect）
- 工具列「⬚」按鈕從 `disabled` 改為可點選，綁定工具 `boxselect`，快捷鍵 `M`
- 拖曳繪製選取框，canvas 以綠色虛線（`#22c55e`）＋10% 填充標示選取區域
- Options bar 顯示即時尺寸（`W × H px`）
- 「複製為圖層」按鈕：
  - 將選取區域的像素（base image + 所有已燒入標註）繪製至 offscreen canvas
  - 裁切後轉為 `image/png` dataURL
  - 透過 `nativeImage` + Electron `clipboard.writeImage` 同時寫入系統剪貼簿
  - `pixelClipboard` 變數存留，供後續 `Cmd+V` 使用
- `Cmd+V`：優先貼上 `pixelClipboard`（若有）為 `img` 型 annotation，置中於畫布，進入選取模式可移動/縮放
- 「取消選取」按鈕清除選取框
- 切換至其他工具自動清除選取框狀態

#### 修正
- `btn-primary:disabled` / `btn-secondary:disabled` 補充 CSS 樣式（`opacity: 0.35, cursor: not-allowed`）

### v3.5 — 工具列雙排佈局；Smart Semantic Numbering；粗細 px 輸入

#### 工具列雙排佈局
- 工具列寬度從 52px 單排改為 88px 雙排（`flex-wrap`）
- 工具重新配對分組：選取/框選、筆/線、矩形/色塊、文字/去背、編號/符號、OCR/馬賽克
- 未實作工具（框型選取、筆形、去背、符號、馬賽克）以 `disabled` 佔位按鈕呈現，hover 不可點

#### 編號風格升級：Smart Semantic Numbering
- 新增 `numberStyle` 欄位至 number annotation 資料結構
- 支援 7 種風格：
  - `dot`：原始實心圓點＋數字（無上限，向下相容）
  - `circle`：空心圓圈 ①②③ (Unicode U+2460–U+32BF，上限 50)
  - `circle-fill`：實心圓圈 ➊➋➌ (Unicode，上限 10)
  - `roman`：羅馬數字 Ⅰ Ⅱ Ⅲ (Unicode U+2160–U+216B，上限 12)
  - `cjk-paren`：中文括號 ㈠㈡㈢ (Unicode U+3220–U+3229，上限 10)
  - `cjk-circle`：中文圓圈 ㊀㊁㊂ (Unicode U+3280–U+3289，上限 10)
- 超出 Unicode 上限自動 fallback 至 `dot` 樣式繼續計數
- 所有 glyph 直接 `fillText` 渲染，使用系統字型（`-apple-system, Noto Sans TC`），零額外開銷
- 舊版 annotation（無 `numberStyle` 欄位）自動視為 `dot`，完整向下相容
- `grpNumber` panel 新增風格選擇按鈕列（6 個風格按鈕＋現有大小按鈕）

#### 粗細與文字描邊改為 px 數字輸入
- `grpThickness` 改為數字輸入框（`strokeWidthInput`）＋快速預設下拉（1–10）
- 文字描邊改為數字輸入框（`textStrokeWidthInput`，0=無）＋快速預設下拉（0–5）
- 移除舊 enum 按鈕（細/中/粗、無/細/中/粗）
- 舊版描邊 enum（1→3px、2→6px、3→10px）向下相容自動轉換

### v3.4 — OCR 改用 macOS Vision；折線縮放；UX 修正

#### OCR 引擎全面改寫（重大變更）
- 棄用 Tesseract.js（在 Electron 環境下 WASM 初始化不穩定、語言包無法下載）
- 改用 macOS 內建 Vision 框架，透過 `swift` 腳本呼叫
- 不需要下載任何語言包，完全離線可用
- 支援繁體中文（zh-Hant）+ 英文（en-US）原生辨識
- 辨識速度極快（約 1-2 秒，視圖片大小）
- 移除 tessdata 檢查/下載對話框，直接觸發辨識
- 已知限制：overlay 截圖游標在 macOS 透明視窗中，hover 狀態無法穩定顯示十字游標，點擊後正常

#### 折線整體縮放（新功能）
- 折線選取後，外框新增 8 個縮放手把（4 角 + 4 邊中點），行為與矩形框一致
- 拖曳角落手把 → 自由縮放所有頂點等比例映射
- 拖曳邊緣手把 → 單軸縮放（鎖定對邊）
- 外框手把（圓形）與頂點手把（菱形）共存，視覺可區分

#### UX 修正
- OCR 面板關閉時自動清除選取框，左上「取消」按鈕隨之消失
- 辨識完成後進度條正確隱藏

### v3.2 — 折線頂點手把修正

#### Bug 修正
- **折線頂點手把外觀**：頂點手把改為菱形（◆），尺寸從 5px 增大至 8px，更易辨識與點擊
- **折線頂點點擊範圍**：菱形手把點擊半徑從 9px 增大至 12px，降低誤觸機率
- **折線 Shift 吸附方向**：修正 Shift 拖曳頂點時吸附方向計算錯誤的問題
  - **原因**：舊邏輯以「相鄰頂點座標」為參考計算 `adx/ady`，當相鄰頂點距離遠時（例如 100px 外），水平偏移量始終大於使用者的垂直拖曳量，導致永遠只觸發水平吸附（y 鎖定），垂直吸附（x 鎖定）難以觸發
  - **修正**：以「拖曳起點（頂點原始位置）」為參考，`adx/ady` 正確反映使用者的實際移動方向，H/V 兩個方向均可正常觸發

### v3.1 — OCR 文字辨識工具（Free MVP）
- 新增 `ocr` 工具，快捷鍵 G，工具列按鈕「文」
- 拖曳選取辨識區域 → 自動觸發 OCR
- 使用 Tesseract.js（繁體中文 + 英文，離線可用）
- 語言包按需下載（首次使用顯示確認對話框）
- 辨識結果顯示於浮動筆記本視窗（可編輯）
- 結果視窗提供「複製」與「複製並關閉」按鈕
- 辨識進度條即時顯示下載及辨識狀態

### v3.0 — 橢圓框工具（Shift 拉 = 正圓）
- 新增 `ellipse` 工具，拖拉繪製橢圓形框線
- 支援顏色、線條粗細、陰影選項
- Shift 拖曳鎖定為正圓（等比例）
- 8 個 resize 把手（4 角 + 4 邊中點），行為與矩形框一致
- Select 後可調整顏色、線條粗細、陰影

### v2.7 — 編輯器底部三按鈕：複製至剪貼簿 + macOS Share Sheet

#### 底部按鈕重構（新功能）
- 編輯器右下角按鈕從單一「完成並儲存」擴充為三個並排按鈕，由左至右：
  `[完成並儲存]`　`[複製至剪貼簿]`　`[分享]`
- 三個按鈕互不排斥，使用者可先複製再分享再儲存，不限順序

#### 完成並儲存（行為更新）
- 行為不變：選擇格式 → 輸出檔案 → **關閉編輯器視窗**
- 按下後視窗關閉，若需繼續編輯須重新開啟該圖片

#### 複製至剪貼簿（新功能）
- 將當前畫布（底圖 + 所有標註）燒錄成平面圖後複製至系統剪貼簿
- 複製成功後顯示 toast 提示「已複製」（綠色，約 2 秒後自動消失）
- 複製後**編輯器視窗保持開啟**，使用者可繼續編輯或執行其他動作
- 複製的是所見即所得的合併平面圖（非原始底圖）

#### 分享（新功能）
- 點擊後將當前畫布（含標註）燒錄至暫存 PNG，呼叫 macOS 原生 Share Sheet
- Share Sheet 自動列出所有已安裝且支援圖片分享的 App（LINE、微信、Messages、Mail、AirDrop、備忘錄等），無需個別對接 API
- 分享後**編輯器視窗保持開啟**，使用者可繼續編輯或執行其他動作
- Electron MVP 實作：`Menu.buildFromTemplate([{ role: 'shareMenu', sharingItem: { filePaths: [tempPath] } }]).popup()`（Electron 9+ 原生支援）
- Tauri 版本：改用 `tauri-plugin-share` 呼叫系統原生 `NSSharingServicePicker`
- 暫存檔命名規則：`YYYY-MM-DD-HH-mm-ss-share.png`，分享完成後自動清理

### v2.6 — 文字工具 UX 全面升級 + 框線/色塊圓角 + 線條正交折線（字體選擇、字型大小快選、工具列重排、文字對齊、預覽對齊修正、圓角、正交折線）

#### 字體選擇（新功能）
- 文字工具選項列新增「字體」下拉選單（`<select id="fontFamilySelect">`），共 10 種字體：
  - 中文無襯線：系統預設（-apple-system）、蘋方-繁（PingFang TC）、黑體-繁（Heiti TC）
  - 中文有襯線：宋體-繁（Songti TC）、楷體-繁（Kaiti TC）
  - 英文無襯線：Helvetica Neue、Verdana
  - 英文有襯線：Georgia
  - 特殊：Impact、等寬 Menlo
- 字體選擇即時反應於 textarea 預覽與 canvas 繪製
- 字體以 `fontFamily` id 儲存於 annotation；`getFontCss(id)` 統一映射至 CSS font stack
- 重新選取文字 annotation 時，「字體」下拉自動恢復對應值

#### 字型大小改版
- 輸入框改回 `type="number"`，恢復上下微調箭頭
- 旁邊新增獨立快選 `<select id="fontSizePreset" class="fs-preset">`，提供 36 / 48 / 64 / 96 / 128 / 192 六個快速選項
- 快選後輸入框即時更新、select 自動重置為「—」佔位符，兩個元件獨立運作

#### 文字工具選項列重排
- 由左至右新順序：顏色（全局色票，固定最左）→ **字體** → **大小 + 快選** → **B / I / U / S** → **文字對齊** → **描邊** → **文字背景** → **陰影**

#### 文字對齊（新功能）
- 文字工具選項列在 **B / I / U / S** 之後新增三個對齊按鈕：`左`（靠左）、`中`（置中）、`右`（靠右）
- 對齊方式影響多行文字區塊內部的水平排列（類同 PPT 文字框的對齊設定）
- `a.x` / `a.y` 為錨點座標，語意依對齊方式而定：
  - `left`：錨點為文字區塊左緣
  - `center`：錨點為文字區塊中軸
  - `right`：錨點為文字區塊右緣
- 背景色塊、底線、刪除線均依對齊方向正確計算各行起點
- `textarea` 編輯中即時反映 CSS `text-align`；中/右對齊以 `translateX(-50% / -100%)` 讓輸入框錨點對齊畫布
- `textAlign` 儲存於 annotation；重新選取時按鈕狀態自動恢復
- `bounds()` 計算 bounding box 左邊界時依 `textAlign` 修正，選取框 / 點擊命中範圍正確

#### 文字背景透明度行為修正
- `textBgOpacity` 初始預設值由 `50` 改為 `0`（預設無背景）
- 新行為：背景色塊預覽顯示棋盤格透明樣式（`.cpp-swatch-transparent`）直到使用者主動選色
- 使用者於選色面板點選實色 → 若當前 opacity = 0，自動升至 50%（沿用原有設計意圖）
- 以下四個時機同步更新預覽色塊：選透明色 / 選實色 / 手動修改 % 數值 / 切換至已有 annotation

#### 編輯中預覽位移修正（Bug fix）
- **問題根因：** CSS `line-height: 1.25` 在每行上下各加 `halfLeading = (1.25−1)×fs/2` 的空白，導致 textarea 視覺字形頂端比元素上緣低 `halfLeading` px；而 canvas 以 `textBaseline='top'`（EM square 頂端）繪製描邊與背景，兩者偏移量 ≈ `0.125 × fontSize`（48px 字約 6px）
- **修法：** `showTextInput()` 的 `top` 定位從 `c(pos.y) − 2` 改為 `c(pos.y) − 2 − halfLeading`，使 textarea 視覺字形頂端精確對齊 canvas 繪製基準；偏移量隨字級等比例自動計算

#### 矩形框 / 色塊圓角（新功能）
- 框線工具（R 鍵）與色塊工具（B 鍵）的 options bar 新增「圓角 %」數字輸入框（`<input type="number" id="cornerRadiusInput">`，0–100，預設 0）
- 圓角半徑計算：`r = (cornerRadius / 100) × min(w, h) / 2`（canvas 像素）
  - 0% → 直角矩形（原有行為）
  - 中間值 → 圓角矩形（任意弧度）
  - 100% → 系統自動 clamp 為 `min(w, h) / 2`，即橢圓形
- 渲染：`cornerRadius > 0` 時改用 `ctx.roundRect()`（Canvas API，Chromium 99+ 支援）取代 `strokeRect()` / `fillRect()`
- 色塊填色（含漸層）與邊框共用同一 `roundRect` 路徑
- `cornerRadius` 儲存於 annotation；Select 工具選取已有標註時自動恢復數值
- 即時更新：調整輸入框時若已選取標註則即時重繪

#### 線條工具正交折線 → 升級為多段折線（新功能 v2.6+）
- 線條工具（L 鍵）options bar 在「實線 / 虛線」之後新增「直角」toggle 按鈕（`id="btnLineOrtho"`），預設關閉（非 active）
- **直角 OFF（預設）**：拖曳畫單一線段，`|ΔX| ≥ |ΔY|` → 水平吸附，否則垂直吸附（已選取 `line` 標註時直接修改端點）
- **直角 ON → 多段折線模式（`type: 'polyline'`）**：
  - 每次點擊加入一個頂點，游標即時預覽當前段折線路徑
  - 各段自動路由：`|ΔX| ≥ |ΔY|` → 先水平後垂直（H→V）；否則先垂直後水平（V→H）
  - **雙擊**完成折線（移除最後一個因雙擊第二下加入的重複點），切換至選取模式
  - **Escape** 取消繪製中的折線（所有頂點丟棄）
  - 折線標註（`type: 'polyline'`）儲存欄位：`{ points: [{x,y}], lineStyle, startCap, endCap, color, thickness }`
  - Select 工具選取後：各頂點顯示圓點把手（可個別拖移）；整體可整體拖移
  - 折線支援 Cmd+C / Cmd+V 複製貼上（貼上偏移 8px）
- 端點箭頭依首段 / 末段的實際出發 / 到達方向繪製，方向判斷正確
- 端點樣式、虛線設定完全共用現有 options bar（不另開工具）

### v2.5 — 浮動選色面板升級；編號標記大小調整
- **浮動選色面板（三層架構）**：將工具列嵌入式色票升級為共用浮動面板 `#colorPickerPanel`
  - 第一層：主題色盤（Office 風格，10 行 × 6 色，共 60 色，欄排列）
  - 第二層：標準色彩列（11 色含透明）+ 分隔線
  - 第三層：滴管按鈕 + Hex 輸入框 + 原生 `<input type="color">` fallback
- **透明色票**：標準色彩列新增「透明」選項（白底 + 45° 紅斜線 CSS 樣式），取代原漸層工具的「透」按鈕
- **Sticky 面板 UX**：選色後面板保持開啟，可連續切換顏色；僅點擊工具列預覽色塊（錨點元素）再次觸發才關閉（toggle 邏輯）
- **切換工具自動關閉面板**：呼叫 `setTool()` 時立即執行 `hideColorPanel()`
- **漸層「透」按鈕移除**：`grpFillColor` 中的「透 A」「透 B」按鈕由透明色票取代，選項列簡化
- **編號標記大小調整**：
  - 小：半徑 `10 → 24 px`
  - 標準：半徑 `14 → 36 px`（預設值）
  - 大：半徑 `22 → 56 px`
- **CSS 特異性修正**：`#colorPickerPanel.hidden { display: none }` 明確覆蓋 ID 選擇器，修正面板因優先度衝突無法隱藏的問題

### v2.4 — 截圖後開啟編輯器：偏好設定切換
- S1 輸出行為改為可設定：新增「截圖後自動開啟編輯器」全局切換（預設：開啟）
- 關閉時截圖僅進剪貼簿，不開啟編輯器，工具列立即恢復顯示
- 切換狀態透過 `localStorage` 持久記憶
- 新增 P1 偏好設定規格（Section 3）與對應 TDD 測試案例

### v2.3 — 長期遷移規劃：Tauri 版本 + UI 中英切換
- 新增第 9 節「Tauri 遷移規劃」，記錄 Electron → Tauri 的切換策略
- 確立 UI 雙語切換策略：Electron 版本完成後一次性建立術語對照表，切換 Tauri 時套入 `data-i18n` + JS 字典，避免邊開發邊翻譯造成術語不一致

### v2.2 — 框線/色塊工具拆分；色塊漸層；編號複製貼上
- 色塊工具（B 鍵）：新增 `fillrect` annotation 類型
  - 實色模式：填色色票 + 透明度（0–100%）
  - 漸層模式：顏色 A + 顏色 B（含「透明」選項）+ 4 方向（左→右、上→下、左上→右下、左下→右上）
  - 點擊色票預覽方塊可開啟系統原生檢色器選任意色
  - 邊框可開關、可換色、可設粗細
- options bar grpFillColor：[實色] [漸層] 模式切換；漸層時顯示 A→B 雙色票 + 方向按鈕
- 框線工具（R 鍵）：維持原有行為（中空矩形框），不變
- 編號標記複製貼上：選取編號後 Cmd+C 複製，Cmd+V 貼出相同大小/顏色的副本（位移 +8px）

### v2.1 — S2 網頁截圖移除；延遲截圖；迭代規劃 v2.1–v2.4
- S2 網頁截圖：考量實體大小 CP 值，本版本不實作，功能標記移除
- 移除 Playwright（Chromium binary）相依，.dmg 體積縮小
- 移除工具列「網頁」按鈕，替換為「延遲截圖」按鈕
- 延遲截圖：工具列新增按鈕 + 內嵌秒數下拉（1s / 2s / 3s），按下後倒數至 0 再全螢幕截圖；支援 Esc 取消；上次選取秒數透過 localStorage 記憶
- 全域快捷鍵 Cmd+Ctrl+3 觸發延遲截圖（使用上次記憶的秒數）
- 備註：截圖同時複製到系統剪貼簿已於 S1 規格實作，非本版新增
- 新增第 8 節迭代規劃（v2.1–v2.4）

### v2.0 — 批次轉檔佇列管理修正
- `.file-remove` 按鈕點擊區域放大（font-size 13px + padding 6px 10px），修正最後一個檔案難以刪除的問題
- 即時同格式預警：加入 `updateSameFormatWarning()`，在引入檔案 / 切換格式時主動顯示橘色警示，無須等到「開始轉換」
- 預警 pre-emptive 模式按鈕切換為「從清單移除 / 忽略提示」，點擊「從清單移除」直接清除同格式檔案並更新佇列
- 點擊「開始轉換」時自動轉為轉換意圖模式（`warnPreemptive=false`），按鈕恢復原始文字
- 開啟圖檔後補收工具列（`mainWindow.hide()`），行為與截圖路徑一致

### v1.9 — 新增延伸畫布功能（E1-C）
- 左側工具列「⊞ 延伸畫布（E）」按鈕開啟 modal
- 3×3 方向盤（8 方向 + 置中）
- 單方向（上/下/左/右）顯示單一輸入欄；斜角顯示寬/高各自獨立輸入欄；置中顯示「四邊延伸」欄（新尺寸 = 原 + amount×2）
- 延伸區域白色填充；即時預覽結果尺寸
- 確認後 annotations 座標自動平移（向左/向上延伸時）

### v1.8 — 實作 E3 疊圖
- 左側工具列新增「⧉ 疊入圖片（O）」按鈕；O 鍵快捷鍵
- `type:'img'` annotation 接入現有系統（undo/redo / move / 8 把手 resize / bounds / hits 全部自動繼承）
- 角落把手等比例縮放（鎖定 aspectRatio），邊緣把手自由縮放
- 插入後預設尺寸 = 原始尺寸縮放至 50% 底圖，置中；限制一次只能插入一張
- `HTMLImageElement` 以 Map 快取，與 annotation JSON 資料分離

### v1.7 — 顏色工具列：滴管選色（E2-F）與 Hex 輸入（E2-G）
- 滴管按鈕優先使用 Chromium `EyeDropper` API（可吸取螢幕任意像素），不可用時 fallback 到 macOS 原生色票 picker
- Hex 欄位即時同步（輸入 6 位元有效值立即套用）；支援貼上 `#RRGGBB` 格式自動去 `#`
- 所有顏色來源（色塊 / 滴管 / hex）統一走 `applyColor()`；`syncColor()` 連動更新 hex 欄位
- hex 欄位 `keydown` 事件 `stopPropagation`，防止觸發編輯器快捷鍵

### v1.6 — 新增批次格式轉換功能（F1-C）
- 第 6 顆工具列按鈕（批次轉）；工具列寬度 440 → 514px
- 支援 PNG / JPG / WebP / GIF / SVG 來源；轉換目標 PNG / JPG / WebP / GIF
- 選項：品質（JPG/WebP）、SVG 輸出寬度（預設 1920px）、統一調整尺寸（等比例）、輸出目錄、轉換後刪除原始檔
- 同格式偵測：轉換前彈出警示並提供「略過 / 取消全部」
- 轉換中逐檔顯示進度條與 log

### v1.5 — 主視窗改為浮動工具列模式
- 主視窗縮小為 440×68px 水平工具列（`frame:false, transparent, alwaysOnTop`）
- 截圖時工具列 `hide()`，編輯器全部關閉後自動 `show()`
- 位置可拖曳，重啟後記憶位置（`userData/toolbar-pos.json`）
- 視窗選擇 / 說明 modal 開啟時動態 resize 展開，關閉後縮回工具列
- 矩形截圖修正：`open-overlay` 時 `hide()` 主視窗，`cancel-overlay` 時 `show()`；全域快捷鍵與按鈕觸發路徑行為一致

### v1.4 — Bug 修復
- 存檔 WebP 時加入 `.withMetadata()`，修正 macOS Quick Look 無法生成桌面縮圖的問題
- 編輯器存檔成功後延遲 800ms 自動關閉視窗（原本存檔後視窗不會關閉）

### v1.3 — 裁切框支援移動與調整大小
- 框內拖曳移動；8 個把手（角落 × 4 + 邊緣中點 × 4）拖曳縮放
- hover cursor 即時反映操作意圖（move / resize / crosshair）
- 框外空白處重新拖曳可覆蓋舊框

### v1.2 — 實作 E1 尺寸調整
- **E1-B 裁切工具**（✂ 按鈕 / C 鍵）：拖曳選取範圍 → 顯示尺寸 + 遮罩 → Enter 或「確認裁切」套用，Esc 取消；裁切後標註座標自動平移
- **E1-A 等比例縮放**（⇔ 按鈕 / S 鍵）：Modal 輸入目標寬度，高度自動等比計算，套用後標註比例同步縮放

### v1.1 — 縮放功能細節修正
- 最小縮放比例改為動態 `fitScale`（適合視窗比例），移除固定 10% 最小值與下拉選單中的 10% 選項
- 下拉選單與縮放操作連動——點擊 ⊕/⊖/⊟ 按鈕或 Pinch/快捷鍵後，即時反映當前比例
- 修正放大後無法捲動至左邊界的問題（`flex justify-content:center` 改為 `canvas-wrapper margin:auto`）

### v1.0 — 編輯器新增縮放與平移功能
- 工具列放大（⊕）/縮小（⊖）/適合視窗（⊟）按鈕；上方下拉選單直選比例（適合視窗–400%）
- 放大/縮小工具狀態下：拖曳 = 手掌平移，點擊 = 以游標為中心縮放
- `Ctrl+Scroll` / Trackpad Pinch 縮放；快捷鍵 `⌘=` / `⌘-` / `⌘0`
- 縮放範圍 fitScale–400%；`canvas-scroll-content` wrapper 修正大圖縮放後的捲動問題

### v0.9 — 全螢幕截圖互動重設計
- 雙螢幕時顯示螢幕選擇 overlay（半透明遮罩 + 邊框高亮），點擊截單一螢幕、Enter 截全部螢幕合併、Esc 取消
- 雙螢幕合併改為等比例縮放（原為裁切）
- 視窗截圖移除不必要的 minimize（`screencapture -l` 直接以 `CGWindowID` 截圖，不受主視窗遮擋影響）
- 單螢幕全螢幕截圖行為不變

### v0.8 — 文字工具全面精修
- 支援多行換行（Enter 換行，Shift+Enter 確認）
- 點擊文字框外自動退出編輯並恢復工具列
- 選取點擊範圍改用 `measureText` 準確計算
- 換色與字型大小在編輯中即時反應
- 預設字型大小 24 → 48px；文字框隨字數自動橫向展開
- 重新編輯時位置對齊畫布文字（補償 padding 偏移）
- 存檔檔名精度升至秒（`YYYY-MM-DD-HH-mm-ss`）

### v0.7 — 編輯器 UX 細節補充
- 標註 Resize 把手
- 中文 IME 相容 + 雙擊重新編輯文字
- 編號標記重置 / 大小 / AA 無障礙對比
- 選取工具可即時編輯標註屬性
- 存檔檔名改用日期時間格式

### v0.6 — 雙螢幕行為規格補充
- 補充全螢幕合併截圖、矩形選取遮罩覆蓋所有螢幕的規格
- 跨螢幕矩形選取列入後續迭代

### v0.5
- SVG 轉檔合併進「開啟圖片」流程，移除主畫面獨立按鈕

### v0.4
- 矩形截圖拖曳過程即時顯示尺寸標籤（選取框右下角外側）

### v0.3
- 矩形截圖快捷鍵改 `Cmd+Ctrl+X`
- 新增快捷鍵說明面板
- 箭頭工具升級為線條工具

---

## 1. 專案概述

### 1.1 背景
Mac 生態系缺乏能同時涵蓋「截圖、標註編輯、疊圖、格式轉換」的一體化工具。現有工具（Shottr、Snagit 等）各有缺口，無法對標 Windows 上的 FastStone Capture 使用體驗。

### 1.2 目標使用者
需要在 Mac 上進行多模態工作溝通的非技術使用者（PM、設計師、跨部門溝通人員）。

### 1.3 核心原則
- **MVP 優先**：只做確認的六個功能模組，其餘列入後續迭代
- **操作直覺**：使用者不需要閱讀說明書
- **輸出即用**：產出的圖片可直接貼入 Google Docs、Slack、Email

---

## 2. 技術棧

| 層級 | 技術 | 用途 |
|------|------|------|
| 應用框架 | Electron | 跨平台桌面應用殼層 |
| 前端 UI | HTML / CSS / JavaScript | 介面渲染 |
| 圖片處理 | Sharp (Node.js) | 格式轉換、縮放、裁切、合成 |
| ~~網頁截圖~~ | ~~Playwright (Chromium)~~ | ~~URL 完整頁面截圖~~（已移除，見 S2） |
| 桌面截圖 | Electron desktopCapturer + Screenshot API | 全螢幕、視窗、區域截圖 |
| 標註渲染 | HTML5 Canvas | 標註層繪製與燒錄 |

### 2.1 分發方式

**MVP：.dmg 直接下載**

理由：
- 無 Apple Sandbox 限制，Screenshot API 直接申請系統授權
- 開發迭代快，不需 App Store 審核等待
- S2（網頁截圖）已移除，不再內嵌 Chromium binary，.dmg 體積大幅縮小

**未來上 Mac App Store（非 MVP）所需工作：**
- 加 App Sandbox entitlement + 螢幕錄製權限申請
- Code signing + Notarization
- 申請 Apple Developer 帳號（$99/年）

---

## 3. 功能規格

### S1｜桌面截圖

**觸發方式：**
- 工具列按鈕
- 全域快捷鍵（可設定）

**截圖模式：**

| 模式 | 行為 |
|------|------|
| 全螢幕 | 立即截取整個螢幕 |
| 當前視窗 | 點選任一視窗後截取該視窗範圍 |
| 矩形選取 | 拖拉繪製矩形範圍後截取；拖曳過程中在選取框右下角外側即時顯示目前尺寸（例：`940 x 526 px`），標籤樣式為半透明深色底 + 白字小圓角方塊，隨選取框移動 |

**輸出：**

截圖完成後的行為依**偏好設定 P1-A**（截圖後自動開啟編輯器）決定：

| 設定 | 截圖結果 |
|------|---------|
| 開啟（預設） | 截圖進入**編輯畫面（E1–E3）**，同時複製到系統剪貼簿 |
| 關閉 | 截圖**僅複製到系統剪貼簿**，不開啟編輯器；工具列立即恢復顯示 |

> **剪貼簿注意：** 剪貼簿一次只儲存一張圖片。在「關閉編輯器」模式下連續截圖，後一張會覆蓋前一張；需立即貼上後再截下一張。

**工具列隱藏行為：**

| 截圖模式 | 工具列行為 |
|---------|-----------|
| 全螢幕 | 截圖前 `hide()`；編輯器全部關閉後 `show()` |
| 矩形選取 | overlay 開啟前 `hide()`；取消時 `show()`；截圖後保持隱藏直到編輯器關閉 |
| 視窗截圖 | 以 CGWindowID 截取，工具列不遮擋截圖內容，不需 `hide()` |

**邊界條件：**
- 取消矩形選取（按 Esc）：`cancel-overlay` 觸發 `show()`，工具列回到原位
- 多個編輯器同時開啟時，最後一個關閉後才觸發 `show()`

**雙螢幕行為：**

| 模式 | 行為 |
|------|------|
| 全螢幕（單螢幕） | 立即截取整個螢幕，進入編輯畫面 |
| 全螢幕（雙螢幕）| 每個螢幕出現螢幕選擇 overlay（半透明遮罩）；滑鼠移入任一螢幕時邊框高亮，提示即將截圖的範圍；**點擊**截取該螢幕；**Enter** 截取所有螢幕並等比例縮放後左右合併（以最小高度為基準，較高螢幕縮放至相同高度，寬度同比例調整），輸出為單一矩形圖片；**Esc** 取消 |
| 矩形選取 | 半透明遮罩覆蓋所有螢幕；選取框限定在單一螢幕邊界內（不可跨螢幕，跨螢幕選取功能列入後續迭代） |
| 視窗 | 使用系統視窗選擇器選取目標視窗後截圖；以 CGWindowID 直接截取，不受主視窗遮擋影響，無需最小化主視窗 |

---

### S2｜網頁截圖（完整頁面）

> ⚠️ **本版本考量實體大小 CP 值不實作，移除。**
>
> Playwright（Chromium binary）體積龐大，對主要使用情境（桌面截圖 ＋ 標註）貢獻有限。未來若需上架 Mac App Store，亦須替換此模組（App Store 禁止內嵌 Chromium binary）。
> 功能保留於 Section 7 後續迭代供參考。

---

### E1｜圖片尺寸調整

**觸發方式：** 編輯畫面工具列「調整大小」

#### E1-A 等比例縮放
- 使用者輸入目標寬度（px）
- 高度自動依原始比例計算並顯示（唯讀）
- 使用者確認後套用

#### E1-B 裁切
- 使用者在畫面上拖拉選取矩形區域；選取框即時顯示目前尺寸（px）
- 選取框畫完後可進行以下互動（確認前皆可重複操作）：
  - **移動**：框內拖曳，整體位移
  - **調整大小**：框邊緣與角落各有 1 個把手（共 8 個），拖曳縮放
  - **重新繪製**：於框外空白處重新拖曳，覆蓋舊選取框
- 確認後裁切，框外區域丟棄；裁切後標註座標自動平移（減去裁切偏移量）
- 可隨時取消（Esc 或「取消」按鈕）

**邊界條件：**
- 縮放最小值：**1px**（寬或高，支援 1px 精度輸入）
- 縮放最大值：原始尺寸的 400%
- 裁切區域不可為 0px

---

### E2｜圖片標註

**觸發方式：** 編輯畫面工具列各標註工具按鈕

#### 支援的標註元素

| 元素 | 操作 | 說明 |
|------|------|------|
| 矩形框 | 拖拉繪製 | 中空框線，無填色 |
| 橢圓框 | 拖拉繪製 | 中空橢圓框線；Shift 拖曳 = 正圓 |
| 線條 | 拖拉起終點 | 可設定線條樣式與兩端端點樣式（詳見下方） |
| 文字 | 點選位置後輸入 | 自由文字，可設定字型大小 |
| 編號標記 | 點選位置放置 | 圓形底色 + 數字，自動遞增（1, 2, 3…） |

#### 線條工具詳細規格

**線條樣式（選擇其一）：**

| 選項 | 說明 |
|------|------|
| 實線 | 連續線段（預設） |
| 虛線 | 間隔虛線段 |

**端點樣式（起點、終點各自獨立設定）：**

| 選項 | 說明 |
|------|------|
| 無 | 平頭，無修飾（預設） |
| 箭頭 | 填色三角形箭頭頭 |
| 圓點 | 填色圓形 |

**常用組合示意：**
- 單向箭頭：起點「無」+ 終點「箭頭」
- 雙向箭頭：起點「箭頭」+ 終點「箭頭」
- 指示線（帶圓點）：起點「圓點」+ 終點「箭頭」

#### 共用屬性（每個元素獨立設定）
- **顏色**：點擊工具列顏色預覽方塊，開啟浮動選色面板（詳見下方「顏色工具」規格）
- **線條粗細**（框、線條）：細 / 中 / 粗

#### 選取工具行為（V 鍵 / 工具列箭頭按鈕）

| 操作 | 行為 |
|------|------|
| 單擊標註 | 選取，頂部選項列顯示該標註的屬性（顏色、粗細、端點等） |
| 選取後修改屬性 | 即時更新該標註（顏色、粗細、線條樣式、端點、字型大小、編號大小均可修改） |
| 拖動標註主體 | 移動位置 |
| 拖動 Resize 把手 | 調整大小（見下方） |
| 單擊空白處 | 取消選取 |
| Delete / Backspace | 刪除選取標註 |
| 雙擊文字標註 | 進入文字編輯模式（可修改內容、顏色、字型大小） |

#### Resize 把手規格

| 標註類型 | 把手數量 | 位置 |
|---------|---------|------|
| 矩形框 | 8 個 | 四角（↖↗↘↙） + 四邊中點（↕↔） |
| 線條 | 2 個 | 起點 + 終點（可拖動改變端點位置） |
| 文字 | 無（改字型大小請用選項列） | — |
| 編號標記 | 無（改大小請用選項列） | — |

- 把手視覺：白底 + 藍色圓框，直徑 10dp
- 游標跟隨把手方向：`nwse-resize`、`nesw-resize`、`ns-resize`、`ew-resize`
- Resize 完成放開滑鼠後記入 Undo 歷史

#### 文字工具詳細規格

**預設字型大小：** 48px（圖片像素）

**選項列布局（由左至右）：**

| 欄位 | 控制元件 | 說明 |
|------|---------|------|
| 顏色 | 色塊預覽（全局共用） | 文字填色，固定在選項列最左 |
| 字體 | `<select>` 下拉（10 種） | 見下方字體清單 |
| 大小 | `<input type="number">` + `<select>` 快選 | 手動輸入 8–400px；快選：36 / 48 / 64 / 96 / 128 / 192 |
| 樣式 | B / I / U / S 按鈕 | 粗體 / 斜體 / 底線 / 刪除線 |
| 對齊 | 左 / 中 / 右 按鈕（互斥，預設靠左） | 多行文字區塊內部水平對齊；`a.x` 為對應錨點 |
| 描邊 | 色塊 + 無/細/中/粗 | 文字外框描邊 |
| 文字背景 | 色塊 + 透明度 % | 文字後方高亮底色，預設 0%（透明） |
| 陰影 | Checkbox | 預設未勾選 |

**可選字體（10 種，macOS 系統字體）：**

| id | 顯示名稱 | CSS font stack |
|----|---------|---------------|
| system | 系統預設 | -apple-system, "Helvetica Neue", sans-serif |
| pingfang | 蘋方-繁 | "PingFang TC", "Heiti TC", sans-serif |
| heiti | 黑體-繁 | "Heiti TC", "STHeiti", sans-serif |
| songti | 宋體-繁 | "Songti TC", "STSong", serif |
| kaiti | 楷體-繁 | "Kaiti TC", "STKaiti", cursive |
| helvetica | Helvetica Neue | "Helvetica Neue", Helvetica, Arial, sans-serif |
| georgia | Georgia | Georgia, "Times New Roman", serif |
| verdana | Verdana | Verdana, Geneva, sans-serif |
| impact | Impact | Impact, "Arial Black", sans-serif |
| mono | 等寬 Menlo | Menlo, "Courier New", monospace |

**輸入框行為：**

| 操作 | 行為 |
|------|------|
| 點選畫布空白處 | 在該位置放置文字輸入框，可直接打字 |
| Enter | 插入換行（支援多行文字） |
| Shift+Enter | 確認並燒錄文字（結束編輯） |
| Escape | 取消，若為重新編輯則還原原始文字 |
| 點擊文字框外區域 | 自動確認並燒錄（等同 Shift+Enter） |

**文字框尺寸：**
- 寬度隨輸入字數**自動橫向展開**（以最長行為基準量測，不設固定上限）
- 高度隨行數**自動縱向展開**
- 最小寬度 60px

**選取範圍（Select 工具）：**
- 點擊範圍以 `canvas.measureText()` 計算實際文字像素寬度為準，正確涵蓋所有字元（包含中文全形字）
- 多行文字高度 = 行數 × 字型大小 × 1.25 行高

**屬性即時更新（編輯模式中）：**
- 換色（色盤點擊）→ 文字框內文字顏色立即更新，不需切換工具
- 字型大小輸入 / 快選 → 文字框內文字大小立即更新，不需切換工具
- 字體切換 → 文字框內 `font-family` 及 canvas preview 即時更新

**重新編輯（雙擊文字標註）：**
- 原標註從畫布移除，內容填入輸入框可修改
- 輸入框位置與原文字**精確對齊**
  - 補償 CSS `padding`（左 4px、上 2px）
  - 補償 `line-height: 1.25` 的 half-leading（`(1.25−1) × fontSize × viewScale / 2`）
- Shift+Enter 確認：產生一筆 Undo 歷史
- Escape：還原原始文字

**文字背景色塊行為：**
- 預設透明度 0（色塊預覽顯示棋盤格透明樣式）
- 使用者點選實色後：若當前透明度 = 0，自動升至 50%
- 使用者點選「透明」色票：透明度歸零，預覽色塊切回棋盤格
- 手動調整 % 數值：預覽色塊即時反映（0 → 棋盤格；> 0 → 實色）

#### 文字工具中文輸入法（IME）相容

- 使用 `compositionstart` / `compositionend` 事件偵測注音/拼音輸入中狀態
- 輸入法候選字選取過程中**不觸發 Shift+Enter 確認**，等待 `compositionend` 後才處理

#### 編號標記詳細規格

**大小選項（options bar）：**

| 選項 | 圓形半徑（圖片像素） | 適用場景 |
|------|------|------|
| 小 | 24 px | 密集標注、備注 |
| 標準 | 36 px | 一般使用（預設） |
| 大 | 56 px | 高解析度截圖、說明文件 |

**編號重置：**
- Options bar 提供「重置編號」按鈕
- 點按後下一個編號從 1 重新開始
- 已放置的編號不受影響（保持語意一致性）

**Smart Semantic Numbering — 風格化標籤庫（v3.5 新增）：**

| 風格 ID | 樣本 | Unicode 範圍 | 上限 | 適用場景 |
|---------|------|------------|------|---------|
| `dot` | ●1 | 自繪圓形 | 無限 | 通用（預設，向下相容） |
| `circle` | ①②③ | U+2460–U+32BF | 50 | 現代 UI 介面教學 |
| `circle-fill` | ➊➋➌ | U+278A–U+2793 | 10 | 強調、視覺醒目 |
| `roman` | Ⅰ Ⅱ Ⅲ | U+2160–U+216B | 12 | 正式文件、商業邏輯階段 |
| `cjk-paren` | ㈠㈡㈢ | U+3220–U+3229 | 10 | 政府公文、傳統中文排版 |
| `cjk-circle` | ㊀㊁㊂ | U+3280–U+3289 | 10 | 亞洲市場在地化設計 |

- 超出各風格 Unicode 上限時自動 fallback 至 `dot` 樣式繼續計數
- 所有 glyph 直接 `fillText` 渲染（`-apple-system, Noto Sans TC`），零額外圖形開銷
- `numberStyle` 存入 annotation 資料，可隨時選取標記後切換風格
- 舊版存檔（無 `numberStyle` 欄位）自動視為 `dot`，完整向下相容

**無障礙 AA 文字對比：**
- 圓形內文字色根據底色亮度自動切換：亮色底（橙、黃、綠、白）→ 深色字 `#1c1c1e`；暗色底（紅、藍、紫、黑）→ 白色字 `#ffffff`
- 計算公式：感知亮度 = 0.299R + 0.587G + 0.114B；> 0.5 用深色字，≤ 0.5 用白字

#### 編輯層行為
- **編輯中**：每個標註元素為獨立物件，可點選選取、拖動移動、Resize、刪除（Delete 鍵）
- **確認燒錄**：按「完成」按鈕後，所有標註合併進底圖，不可再拆開
- **燒錄前可撤銷**：Cmd+Z 逐步撤銷標註動作（含移動、Resize、屬性修改）

**邊界條件：**
- 最多標註元素數量：無硬性限制（效能考量，實際測試後決定是否加上警示）
- 編號標記：手動刪除後，編號不自動重新排序（保持語意一致性）；需要重新排序請用「重置編號」後重新標注

---

#### 顏色工具詳細規格（v2.5 升級）

**架構：** 共用浮動面板（`#colorPickerPanel`，`position: fixed; z-index: 9999`），由工具列所有顏色預覽方塊共用同一個 DOM 元素。

**觸發：** 點擊工具列上的顏色預覽方塊（colorPreview / fillColorPreview / fillColorAPreview / fillColorBPreview / fillBorderColorPreview）開啟浮動面板；再次點擊同一個方塊關閉面板（toggle 邏輯）。

**面板三層架構：**

| 層次 | 內容 |
|------|------|
| 第一層：主題色盤 | 10 行 × 6 色（灰、紅、橙、黃、綠、青、天空藍、藍、紫、玫瑰紅），欄排列（每欄一色系由淺至深） |
| 第二層：標準色彩 | 11 色：黑、深灰、紅、橙、黃、綠、青、藍、靛、紫，以及「透明」（白底 + 45° 紅斜線） |
| 第三層：工具列 | 滴管按鈕（EyeDropper API / fallback 原生 picker）+ `#` Hex 輸入框（6 位，即時套用）|

**Sticky 行為（保持開啟）：**
- 點擊色票後：顏色立即套用至當前工具／已選取的標註，面板**保持開啟**（可繼續點其他顏色）
- 面板關閉路徑：再次點擊工具列預覽方塊（toggle）；或切換工具（`setTool()` 自動呼叫 `hideColorPanel()`）

**透明色票：**
- 出現於標準色彩列最後一格
- 視覺：白底 + `::after` 偽元素繪製 45° 紅斜線（`#d42020`）
- 套用後：填色類標註（fillrect）顯示為全透明填色；線條 / 框線類工具不支援透明（選取後行為維持原顏色）

**漸層「透」按鈕移除：**
- 原 `grpFillColor` 選項列中的「透 A」「透 B」按鈕已移除，透明色現由浮動面板透明色票統一處理

---

### E3｜疊圖

**觸發方式：** 編輯畫面工具列「疊入圖片」

**操作流程：**
1. 使用者點選「疊入圖片」，開啟系統檔案選取視窗
2. 選取圖片後，疊入圖出現在畫布中央
3. 使用者可：
   - **拖動**：移動疊入圖的位置
   - **拖拉邊角**：等比例縮放疊入圖大小
4. 點選其他工具或按「完成」後，疊入圖燒錄進底圖

**支援疊入格式：** JPG、PNG、WebP、GIF（靜態，取第一幀）、SVG

**視覺回饋：**
- 疊入圖選取中：顯示邊框 + 8 個控制點（四角 + 四邊中點）
- 等比例縮放鎖定：拖角時保持長寬比

**邊界條件：**
- 疊入圖可超出底圖邊界（超出部分在燒錄時裁切）
- 一次只能操作一張疊入圖（下一張疊入前需先燒錄或取消）

---

### F1｜格式轉換

**觸發方式：**
1. 儲存時選擇目標格式（主要路徑）
2. 獨立的「批次轉換」功能（次要路徑，詳見下方）

#### F1-A 儲存時轉換

**預設存檔位置：** 使用 `app.getPath('pictures')` 取得系統圖片資料夾（macOS 為 `~/Pictures`，Windows 為 `C:\Users\<user>\Pictures`），確保在無系統管理員權限下仍能正常存檔，不會落入過深的系統路徑。

**預設檔名：** 採 FastStone Capture 慣例，以存檔當下時間命名，格式為 `YYYY-MM-DD-HH-mm-ss.副檔名`（例：`2026-03-21-14-30-45.png`），精度到秒以避免同分鐘連續截圖時產生檔名衝突。

使用者在「另存新檔」時，從格式下拉選單選取目標格式：

| 格式 | 說明 |
|------|------|
| PNG | 無損，支援透明背景（Alpha 通道） |
| JPG | 有損壓縮，可設定品質（預設 90%） |
| WebP | 現代格式，較小檔案，支援透明 |
| GIF | 靜態 GIF，不支援透明 |

> SVG 來源的圖片已在開啟時點陣化（見 F1-B），儲存格式選單自動隱藏 SVG 選項。

#### F1-B SVG 開啟時點陣化

**觸發方式：** 主畫面「開啟圖片」→ 選取 .svg 檔案

**操作流程：**
1. 使用者點「開啟圖片」，選取 .svg 檔案
2. 偵測到 SVG，顯示點陣化確認對話框：
   - 說明文字：「SVG 為向量格式，開啟後會先轉換為點陣圖才能進行編輯。轉換完成後儲存格式僅支援 PNG / JPG / WebP。」
   - 輸出寬度輸入欄（預設值：SVG 的 viewBox 寬度，若無則 1920px）
   - 高度唯讀欄位，自動依比例計算顯示
   - 按鈕：「取消」／「開啟編輯」
3. 確認後將 SVG 點陣化，進入編輯畫面
4. 編輯畫面儲存格式選單隱藏 SVG 選項，只顯示 PNG / JPG / WebP

**設計背景：** 專為 Claude 輸出的流程圖 SVG 轉換為可貼入 Google Docs 的 PNG 設計；合併入開啟圖片流程以簡化主畫面。

#### F1-C 批次轉換

**觸發方式：** 工具列第 6 顆按鈕「🔄 批次轉」→ 工具列展開至 560×620，顯示批次轉換 modal

**操作流程：**
1. 選取檔案（按鈕或拖曳）；重複操作可累加，不重複加入已存在的路徑
2. 選擇目標格式（PNG / JPG / WebP / GIF）
3. 選填選項：
   - **品質**：1–100%，僅 JPG / WebP 時顯示（預設 90）
   - **SVG 輸出寬度**：僅選取到 .svg 檔案時顯示（預設 1920px）
   - **統一調整尺寸**：勾選後出現「固定寬度 / 高度 px 輸入」，另一軸等比例自動縮放
4. 選擇輸出位置：同原始目錄 或 指定目錄
5. 可勾選「轉換完成後刪除原始檔」
6. 按「開始轉換」

**同格式偵測：**
- 若有檔案來源格式與目標格式相同，點擊「開始轉換」時在 modal 內插入警示
- 顯示同格式檔案清單，提供兩個動作：
  - **略過這些，繼續轉換**：跳過同格式檔案，轉換其餘
  - **取消全部**：中止整個操作

**轉換進度：**
- 逐檔順序執行（非並行）
- 每完成一檔，進度條推進並追加 log 行（成功：✓ 原檔 → 輸出檔；失敗：✗ 原檔：錯誤訊息）
- 全部完成後 toast 顯示「已轉換 N 個檔案」或「N 個成功，M 個失敗」
- 轉換中「開始轉換」按鈕 disabled，modal 不可關閉

**來源格式：** PNG / JPG / WebP / GIF / SVG（SVG 以 librsvg 點陣化後輸出）
**目標格式：** PNG / JPG / WebP / GIF（不含 SVG 輸出）

---

### P1｜偏好設定

**觸發方式：** 工具列「⚙ 偏好設定」按鈕 → 工具列展開顯示設定面板（或內嵌於工具列行內）

#### P1-A 截圖後自動開啟編輯器

| 項目 | 說明 |
|------|------|
| 類型 | 全局切換（Toggle） |
| 預設 | **開啟** |
| 儲存 | `localStorage`，key：`pref_open_editor`，值：`"true"` / `"false"` |
| 重啟沿用 | 是 |

**行為對照：**

| 設定 | 截圖後行為 | 工具列 |
|------|-----------|--------|
| 開啟（預設） | 進入編輯畫面 + 複製到剪貼簿 | 保持隱藏，等編輯器關閉後恢復 |
| 關閉 | 僅複製到剪貼簿，不開啟編輯器 | 截圖完成後立即恢復顯示 |

> **使用情境：** 需要連續截多張圖再分別使用時，關閉此設定可加快工作流程；需要標注或存檔時開啟。

---

### S3｜編輯器輸出動作（底部三按鈕）

**位置：** 編輯畫面右下角，三個按鈕由左至右排列：

```
[完成並儲存]   [複製至剪貼簿]   [分享]
```

**視覺優先序：**
- `完成並儲存`：主要按鈕（藍底白字），代表「完成流程」
- `複製至剪貼簿`：次要按鈕（藍底白字，與主按鈕同色系）
- `分享`：次要按鈕（藍底白字，與主按鈕同色系）

> 三個按鈕互不排斥，可依序使用（例如先複製、再分享、最後儲存）。

---

#### S3-A｜完成並儲存

**行為：**
1. 使用者點擊「完成並儲存」
2. 系統彈出格式選擇對話框（PNG / JPG / WebP）
3. 使用者選取儲存路徑與檔名
4. 圖片（底圖 + 所有標註，已合併平面化）輸出至檔案
5. 儲存成功後**關閉編輯器視窗**

> 視窗關閉後若需再次編輯，需重新以「開啟圖片」載入該檔案。

**邊界條件：**
- 使用者在格式選擇對話框按「取消」：不儲存，視窗保持開啟
- 畫布為空：按鈕 disabled

---

#### S3-B｜複製至剪貼簿

**觸發方式：** 點擊「複製至剪貼簿」按鈕

**操作流程：**
1. 將當前畫布（底圖 + 所有標註）燒錄成合併平面圖（PNG）
2. 寫入系統剪貼簿
3. 顯示 toast 提示「已複製」（綠色背景，約 2 秒後自動消失）
4. **編輯器視窗保持開啟**，使用者可繼續編輯、再次複製或執行其他動作

**複製內容規格：**
- 格式：PNG（系統剪貼簿標準圖片格式）
- 內容：所見即所得的合併平面圖（非原始底圖，含所有標註）

**UI 細節：**
- 燒錄期間按鈕進入 loading 狀態（disabled），完成後恢復可點擊
- toast 顯示在編輯器視窗內右下角（按鈕上方），不遮擋主畫布

**Electron 實作備註：**
```js
// 燒錄 canvas 為 PNG buffer 後寫入剪貼簿
const { clipboard, nativeImage } = require('electron');
const image = nativeImage.createFromBuffer(pngBuffer);
clipboard.writeImage(image);
```

**邊界條件：**
- 畫布為空（未開啟任何圖片）：「複製至剪貼簿」按鈕 disabled
- 剪貼簿寫入失敗：toast 顯示「複製失敗，請重試」（紅色），不崩潰

---

#### S3-C｜分享（Share Sheet）

**觸發方式：** 點擊「分享」按鈕

**操作流程：**
1. 使用者點擊「分享」按鈕
2. 系統將當前畫布（底圖 + 所有標註）燒錄至暫存 PNG 檔案
3. 呼叫 macOS 原生 **Share Sheet**，列出所有支援圖片接收的已安裝 App
4. 使用者選取目標 App（如 LINE、微信、Messages、Mail、AirDrop、備忘錄）
5. 目標 App 接收圖片後，暫存檔自動清理
6. **編輯器視窗保持開啟**，使用者可繼續編輯或執行其他動作

**支援的分享目標（系統自動列出，非硬編碼）：**
- 通訊類：LINE、WeChat（微信）、Messages（iMessage）
- 電子郵件：Mail、Outlook、Gmail App（如已安裝）
- 檔案傳輸：AirDrop
- 筆記與文件：備忘錄、Notion、Slack（如已安裝）
- 其他：任何在 macOS 登記支援 `com.apple.share-services` 且接受圖片格式的 App

> 分享目標清單由 macOS 系統管理，不需本工具個別維護。

**暫存檔規格：**
- 格式：PNG（保留透明度）
- 檔名：`YYYY-MM-DD-HH-mm-ss-share.png`
- 路徑：`os.tmpdir()`（系統暫存目錄）
- 清理時機：Share Sheet 關閉後 5 秒自動刪除（無論使用者是否完成分享）

**UI 細節：**
- 燒錄期間顯示 loading 狀態（按鈕 disabled），完成後 Share Sheet 彈出
- 按鈕 icon：系統分享圖示（SF Symbol：`square.and.arrow.up`）

**Electron 實作備註：**
```js
// Electron 9+ 原生支援 macOS Share Sheet
Menu.buildFromTemplate([{
  role: 'shareMenu',
  sharingItem: { filePaths: [tempFilePath] }
}]).popup({ window: editorWindow });
```

**Tauri 版本備註：**
- 改用 `tauri-plugin-share` 呼叫系統原生 `NSSharingServicePicker`
- 前端呼叫介面與 Electron 版本語意一致，改動集中在 IPC bridge 層

**邊界條件：**
- 畫布為空（未開啟任何圖片）：「分享」按鈕 disabled
- 暫存目錄寫入失敗：toast 顯示「暫存檔建立失敗，請重試」，不崩潰
- 使用者在 Share Sheet 點「取消」：暫存檔仍依時序自動清理，編輯器狀態不受影響

---

### S4｜選取範圍工具

**工具入口：** 左側工具列「⬚ 選取範圍」按鈕 / 快捷鍵 `M`

---

#### S4-0｜選取框操作基礎

**建立選取框：**
- 於畫布上拖曳繪製矩形選取框
- 框繪製完成後顯示 8 個調整把手（四角 + 四邊中點）
- 拖曳把手可調整選取框大小
- 拖曳**框內空白區域**（非把手、非像素搬移觸發區）：移動選取框位置，不帶動底圖像素

**選取框啟用時 UI：**
- 選取框以虛線邊框顯示（對比色，深色底圖用白色虛線，淺色底圖用黑色虛線）
- canvas 下方顯示**浮動操作列**，列出 7 個動作按鈕

**取消選取：**
- 按 `Esc`：清除選取框，浮動操作列消失，工具恢復待命狀態
- 點擊畫布選取框外部：同上

---

#### S4-1｜複製

**觸發：** 浮動操作列「複製」按鈕

**行為：**
1. 將選取框範圍內的像素（底圖 + 已合併標註）讀取為圖片
2. 寫入系統剪貼簿
3. 顯示 toast「已複製」（綠色，2 秒消失）
4. 選取框保持啟用，可繼續操作

**邊界條件：**
- 選取框超出畫布邊界：僅複製畫布內的交集部分

---

#### S4-2｜剪下

**觸發：** 浮動操作列「剪下」按鈕

**行為：**
1. 複製選取區域至剪貼簿（同 S4-1）
2. 原位填白（`#FFFFFF`）
3. 推入 undo stack（可 Cmd+Z 還原）
4. 顯示 toast「已剪下」（綠色，2 秒消失）
5. 清除選取框

---

#### S4-3｜剪裁

**觸發：** 浮動操作列「剪裁」按鈕

**行為：**
- 裁切畫布至選取框範圍（與現有 E1-B 裁切工具行為一致）
- 推入 undo stack
- 裁切後選取框消失，畫布尺寸更新

> 裁切工具（C 鍵，E1-B）與選取範圍工具（M 鍵）各自獨立；S4-3 為從選取範圍觸發裁切的快捷路徑。

---

#### S4-4｜刪除

**觸發：** 浮動操作列「刪除」按鈕 / 鍵盤 `Delete` / `Backspace`（選取框啟用時）

**行為：**
1. 將選取區域填白（`#FFFFFF`）
2. 推入 undo stack
3. 清除選取框

---

#### S4-5｜模糊／馬賽克

**觸發：** 浮動操作列「模糊」按鈕

**行為：**
1. 彈出小型設定面板：
   - 模式切換：**模糊**（高斯模糊）/ **馬賽克**（像素化）
   - 強度滑桿（模糊：1–20px；馬賽克：區塊 4 / 8 / 16 / 32 px）
2. 即時預覽效果於選取框內
3. 點擊「套用」：效果燒進底圖 → 推入 undo stack → 清除選取框
4. 點擊「取消」：不套用，選取框保持啟用

**技術實作：**
- `getImageData` 讀取選取區 → 套用演算法 → `putImageData` 寫回
- 僅影響選取框範圍內的像素

---

#### S4-6｜聚光燈

**觸發：** 浮動操作列「聚光燈」按鈕

**行為：**
1. 選取框外的區域套用半透明暗化遮罩（預設：`rgba(0,0,0,0.5)`，可調整透明度）
2. 彈出小型設定面板：暗化強度滑桿（0%–80%）
3. 即時預覽
4. 點擊「套用」：效果燒進底圖（destructive）→ 推入 undo stack → 清除選取框
5. 點擊「取消」：不套用

**邊界條件：**
- Cmd+Z 可完整還原至套用前狀態（undo stack 記錄整張底圖快照）

---

#### S4-7｜填充

**觸發：** 浮動操作列「填充」按鈕

**行為：**
1. 以當前工具顏色（全局色票選取色）填充選取區域
2. 燒進底圖 → 推入 undo stack
3. 清除選取框

---

#### S4-8｜移動選取區域（像素搬移）

**觸發：** 選取框啟用時，**拖曳框內像素**（區分於移動選取框本身的操作）

> 操作意圖判定：游標移至框內後顯示「移動」cursor（四向箭頭），此時拖曳 = 搬移像素；拖曳把手 = 調整大小；拖曳框邊緣非把手區 = 移動選取框。

**行為：**
1. 開始拖曳：選取框內像素「剪起」，原位立即填白；選取像素成為浮動物件（可移動）
2. 拖曳中：浮動物件跟隨游標移動，顯示在畫布最上層
3. **確認（Enter 或點擊框外）：** 浮動物件落點燒進底圖 → 推入 undo stack → 清除選取框
4. **取消（Esc）：** 浮動物件消失，原位白色區域還原，選取框回到移動前狀態

**邊界條件：**
- 浮動物件可拖至畫布邊界外（部分超出）；確認時超出部分裁切
- 移動過程中不可觸發其他 S4 操作（浮動操作列 disabled）

---

## 4. UI 流程

```
啟動 App
│
├── 浮動工具列（440×68px，常駐螢幕，alwaysOnTop，可拖曳）
│   ├── [全螢幕] → 工具列 hide() → 截圖 → 編輯畫面（編輯器關閉後 show()）
│   ├── [視窗] → 展開 760×540 顯示視窗選擇器 → 選取後縮回工具列 → 截圖 → 編輯畫面
│   ├── [矩形] → 工具列 hide() → overlay 覆蓋螢幕 → 截圖 → 編輯畫面（Esc 取消則 show()）
│   └── [開啟圖片] 按鈕 → 選取檔案
│           ├── 一般圖片（PNG/JPG/WebP）→ 直接進編輯畫面
│           └── SVG → 點陣化對話框（輸入寬度）→ 編輯畫面（存檔限 PNG/JPG/WebP）
│
└── 編輯畫面
    ├── 左側工具列：縮放、裁切、**選取範圍**、矩形框、箭頭、文字、編號、疊圖
    ├── 頂部：顏色選取、線條粗細
    ├── 畫布：圖片 + 標註層
    └── 右下角（三按鈕）：
            ├── [完成並儲存] → 選擇格式 → 輸出檔案 → 關閉視窗
            ├── [複製至剪貼簿] → 燒錄平面圖 → 寫入剪貼簿 → toast「已複製」（視窗留著）
            └── [分享] → 燒錄平面圖 → macOS Share Sheet → 暫存檔自動清理（視窗留著）
```

---

## 5. 測試案例（TDD 清單）

### S1 桌面截圖

#### 基本截圖
- [ ] 全螢幕截圖產生圖片，尺寸等於螢幕解析度
- [ ] 矩形選取截圖，輸出尺寸等於選取範圍
- [ ] 按 Esc 取消選取，不產生圖片、不進入編輯畫面
- [ ] 截圖結果自動複製到剪貼簿

#### 浮動工具列顯示 / 隱藏
- [ ] App 啟動時顯示 440×68px 工具列，alwaysOnTop，不在 Dock 顯示
- [ ] 工具列可拖曳至螢幕任意位置；重啟 App 後位置維持上次設定
- [ ] 點擊「全螢幕」或觸發 ⌘⌃1 快捷鍵：工具列立即消失，截圖完成後不自動彈回（等編輯器關閉）
- [ ] 點擊「矩形」或觸發 ⌘⌃X 快捷鍵：工具列立即消失，overlay 出現
- [ ] 矩形截圖按 Esc 取消：工具列重新出現，位置不變
- [ ] 矩形截圖完成進入編輯器：工具列保持隱藏
- [ ] 編輯器「完成並儲存」關閉後：若無其他開著的編輯器，工具列重新出現
- [ ] 同時開兩個編輯器（截兩張圖）：兩個都關閉後工具列才重新出現
- [ ] 點擊「視窗」或觸發 ⌘⌃2 快捷鍵：工具列展開至 760×540，顯示視窗選擇器
- [ ] 視窗選擇器關閉（取消或選取後）：工具列縮回 440×68
- [ ] 點擊「?」說明按鈕：工具列展開至 560×480，顯示快捷鍵說明
- [ ] 說明 modal 關閉：工具列縮回 440×68

#### S1 雙螢幕
- [ ] 雙螢幕下按全螢幕截圖，出現螢幕選擇 overlay（兩個螢幕各出現半透明遮罩）
- [ ] 滑鼠移入某螢幕 overlay，該螢幕邊框高亮、文字提示「點擊截取此螢幕」
- [ ] 滑鼠移出某螢幕 overlay，邊框回復暗淡狀態
- [ ] 點擊某螢幕 overlay，只截取該螢幕，其他螢幕不截取
- [ ] 點擊截取單一螢幕後，所有 overlay 關閉、進入編輯畫面
- [ ] 截取任一螢幕：工具列 hide()，截圖結果不含工具列
- [ ] 在任一 overlay 按 Enter，截取所有螢幕並等比例縮放後左右合併
- [ ] 雙螢幕 Enter 合併：輸出高度 = 兩螢幕中較小的高度（以 minHeight 為基準）
- [ ] 雙螢幕 Enter 合併：較高螢幕等比例縮放（寬度同比縮小），不裁切
- [ ] 雙螢幕 Enter 合併：兩螢幕水平排列順序符合系統螢幕排列設定（左右正確）
- [ ] 在任一 overlay 按 Esc，所有 overlay 關閉，不產生截圖
- [ ] 雙螢幕下矩形選取，半透明遮罩同時覆蓋兩個螢幕
- [ ] 雙螢幕下矩形選取，選取框在單一螢幕內正常運作，不可拖拉超過該螢幕邊界
- [ ] 雙螢幕下視窗截圖，點選第二螢幕的視窗可正確截取（不需最小化主視窗）
- [ ] 全域快捷鍵在次螢幕觸發，截圖功能正常啟動

### P1-A 截圖後自動開啟編輯器

#### 預設行為
- [ ] App 首次啟動，`pref_open_editor` 尚未設定：截圖後自動進入編輯畫面（等同開啟）
- [ ] `pref_open_editor = "true"`：截圖完成後開啟編輯器，圖片同時複製到剪貼簿

#### 關閉編輯器模式
- [ ] `pref_open_editor = "false"`：全螢幕截圖完成後，不開啟編輯器，工具列立即恢復顯示
- [ ] `pref_open_editor = "false"`：矩形截圖完成後，不開啟編輯器，工具列立即恢復顯示
- [ ] `pref_open_editor = "false"`：視窗截圖完成後，不開啟編輯器，工具列立即恢復顯示
- [ ] 關閉編輯器模式下，截圖結果仍複製到系統剪貼簿
- [ ] 關閉編輯器模式下，連續截兩張圖：第二張圖覆蓋剪貼簿，第一張圖不殘留

#### 偏好設定持久記憶
- [ ] 切換設定後重啟 App，設定值維持不變（`localStorage` 持久）
- [ ] 偏好設定面板正確顯示當前設定狀態（toggle 與 localStorage 值同步）

### S2 網頁截圖

> ⚠️ 功能已移除（本版本不實作）。測試案例保留供日後參考。

- [ ] （已移除）有效 URL 產生完整頁面截圖（高度 > 1 個螢幕高度的頁面）
- [ ] （已移除）無效 URL 顯示錯誤訊息，不崩潰
- [ ] （已移除）截圖期間顯示載入狀態
- [ ] （已移除）HTTPS 和 HTTP 網址皆可處理

### E0 縮放與平移（視圖縮放，不影響輸出）
- [ ] 點擊工具列「⊕」按鈕，畫面放大約 25%（×1.25），底部比例標籤與上方下拉選單同步更新
- [ ] 連續點擊「⊕」三次，比例持續累加放大，不超過 400%
- [ ] 點擊工具列「⊖」按鈕，畫面縮小約 20%（÷1.25），底部標籤與下拉選單同步更新
- [ ] 縮放至適合視窗比例後繼續點「⊖」，比例維持在 fitScale（不低於適合視窗比例）
- [ ] 點擊「⊟」按鈕（適合視窗），比例回到初始 fit 比例，捲動歸零，下拉選單同步顯示當前比例
- [ ] 上方下拉選單選取「200%」，畫面立即縮放至 200%
- [ ] 下拉選單預設值為 25%/50%/75%/100%/150%/200%/300%/400%（無 10% 選項）；比例為預設值時選單顯示對應項目；比例不在預設值時（如適合視窗的 32%）顯示動態百分比選項（如「32%」），底部標籤同步顯示相同數值
- [ ] 點擊⊕/⊖/⊟按鈕後，上方下拉選單立即反映當前縮放比例（不再顯示空白）
- [ ] 切換至放大工具後，在畫布上拖曳，畫面平移（不標註）；鬆開後不觸發縮放
- [ ] 切換至放大工具後，在畫布上「點擊」（非拖曳），以點擊位置為中心放大
- [ ] 切換至縮小工具後，點擊畫布，以點擊位置為中心縮小
- [ ] 快捷鍵 ⌘= 放大一段，⌘- 縮小一段，⌘0 適合視窗
- [ ] Trackpad Pinch（雙指縮放）以游標為中心縮放，下拉選單同步更新
- [ ] Ctrl+滾輪以游標為中心縮放
- [ ] 圖片放大超過視窗後可上下左右捲動，捲動後視圖移動正確（含左邊界：scrollLeft=0 時可見畫布左邊緣）
- [ ] 圖片放大後，水平捲軸拖至最左端，畫布左邊緣可見（不被截斷在視窗外）
- [ ] 縮放後「完成並儲存」，輸出圖片解析度為原始尺寸（縮放不影響輸出）
- [ ] 開啟新圖片時，視圖比例重置為 fit

### E1-A 等比例縮放
- [ ] 點擊 ⇔ 按鈕或按 S 鍵，開啟「調整尺寸」Modal
- [ ] Modal 預設值為目前圖片尺寸（寬 × 高）
- [ ] 修改寬度，高度欄位自動等比例更新（唯讀）
- [ ] 按「套用」，圖片以新尺寸重新繪製，imgInfo 顯示新尺寸
- [ ] 縮放至 1px 寬不崩潰
- [ ] 縮放至原始尺寸 400% 正常執行
- [ ] 套用後標註元素座標與字型大小同比例縮放
- [ ] 按「取消」或點遮罩，圖片不變
- [ ] Toast 顯示「已調整尺寸：W × H px」

### E1-B 裁切

#### 基本繪製
- [ ] 點擊 ✂ 按鈕或按 C 鍵，切換至裁切工具
- [ ] 進入裁切工具後 options bar 顯示「確認裁切」與「取消」按鈕
- [ ] 在畫布拖曳，選取框即時顯示半透明遮罩（框外區域變暗）
- [ ] 選取框邊緣顯示白色虛線邊框
- [ ] 拖曳過程中 options bar 即時顯示選取框尺寸（如 `940 × 526 px`）
- [ ] 拖曳鬆開後，選取框維持顯示，可繼續互動

#### 移動選取框
- [ ] 框內任意位置 hover，cursor 顯示為 `move`
- [ ] 框內拖曳，整個選取框跟著移動，尺寸不變
- [ ] 移動過程中 options bar 尺寸保持正確（不因移動而改變）

#### 調整選取框大小
- [ ] 選取框顯示 8 個白色圓形把手（4 角 + 4 邊中點）
- [ ] hover 至把手，cursor 顯示對應方向（`nwse-resize`、`ns-resize`、`ew-resize` 等）
- [ ] 拖曳角落把手，對角固定，選取框自由縮放
- [ ] 拖曳邊緣中點把手，對邊固定，僅改變單一方向尺寸
- [ ] 把手拖過對邊後選取框自動翻轉（負值不崩潰）
- [ ] 調整大小時 options bar 即時顯示新尺寸

#### 重新繪製
- [ ] 在框外空白處重新拖曳，舊選取框被新框覆蓋

#### 確認與取消
- [ ] 按「確認裁切」或 Enter，圖片裁切為選取框尺寸，imgInfo 更新
- [ ] 裁切後標註座標平移（減去裁切 x, y 偏移量）
- [ ] 裁切後 Undo 歷史重置（不可 Undo 回裁切前狀態）
- [ ] 裁切框未選取時按「確認裁切」，顯示 toast 提示，不執行裁切
- [ ] 按「取消」或 Esc，取消裁切模式，回到矩形框工具
- [ ] Toast 顯示「已裁切：W × H px」

### E1-C 延伸畫布

#### 開啟與方向選取
- [ ] 點擊 ⊞ 按鈕或按 E 鍵，開啟「延伸畫布」Modal
- [ ] Modal 顯示 3×3 方向盤，預設選取「→（右）」
- [ ] 點擊任一方向按鈕，該按鈕呈現 active（藍色）樣式，其餘恢復
- [ ] 方向盤中央「⊕」代表四邊均等延伸（置中模式）

#### 輸入欄位條件顯示
- [ ] 選擇「上 / 下」：僅顯示「高度延伸」輸入欄
- [ ] 選擇「左 / 右」：僅顯示「寬度延伸」輸入欄
- [ ] 選擇「右上 / 右下 / 左上 / 左下」：同時顯示「寬度延伸」和「高度延伸」兩欄，且標籤正確反映方向（向左/向右 + 向上/向下）
- [ ] 選擇「⊕ 置中」：僅顯示「四邊延伸」單一輸入欄

#### 即時預覽
- [ ] 輸入數值後，下方預覽列即時顯示原始尺寸 → 新尺寸
- [ ] 切換方向時，預覽尺寸隨輸入欄變化即時更新
- [ ] 在輸入欄按下任意字母鍵（如 R、E），不觸發編輯器工具切換

#### 延伸結果驗證
- [ ] 向右延伸 200px：輸出寬度 = 原寬 + 200；高度不變；右側為白色
- [ ] 向下延伸 200px：輸出高度 = 原高 + 200；寬度不變；下方為白色
- [ ] 向左延伸 200px：輸出寬度 = 原寬 + 200；左側為白色；原圖向右移 200px
- [ ] 向上延伸 200px：輸出高度 = 原高 + 200；上方為白色；原圖向下移 200px
- [ ] 右下延伸（寬 100、高 150）：輸出寬 = 原 + 100；高 = 原 + 150；右下角白色
- [ ] 左上延伸（寬 100、高 100）：原圖向右下移 100px，左上角白色
- [ ] 置中延伸 100px：輸出寬 = 原 + 200；高 = 原 + 200；四邊各 100px 白色；原圖置中

#### 標註座標連動
- [ ] 向左延伸 200px 後，已存在的矩形框、文字等標註 x 座標 += 200，位置正確
- [ ] 向上延伸 200px 後，標註 y 座標 += 200，位置正確
- [ ] 向右 / 下延伸，標註座標不變，位置正確

#### 邊界與取消
- [ ] 輸入值為 0 或空白，按「確認延伸」等同取消（不做任何更改）
- [ ] 按「取消」或點遮罩，圖片與標註不變
- [ ] 延伸後 Toast 顯示「已延伸：W × H px」

### E2 標註

#### 顏色工具列 — 色塊、滴管、Hex 輸入

**色塊**
- [ ] 點擊色塊，顏色狀態更新，色塊出現 active 白框
- [ ] 切換色塊後新增矩形，矩形顏色與所選色塊一致
- [ ] 選取已有標註 → 點擊色塊，標註顏色即時更新

**Hex 色碼輸入**
- [ ] 工具列顏色區顯示 `#` 前綴 + 6 位輸入框
- [ ] 點擊色塊後，hex 欄位自動同步顯示對應色碼（大寫）
- [ ] 手動輸入 6 位合法 hex，顏色即時套用，色塊 active 狀態消除（自訂色無對應色塊）
- [ ] 輸入不足 6 位時，顏色不變（無中途套用）
- [ ] 輸入非 hex 字元（如 G、Z），字元被自動過濾
- [ ] 貼上 `#FF3B30` 格式，自動去掉 `#`，套用顏色
- [ ] 在 hex 欄位按下 `R`（矩形快捷鍵），不觸發工具切換
- [ ] 選取標註 → 手動輸入 hex → 標註顏色即時更新

**滴管選色**
- [ ] 工具列顏色區顯示滴管按鈕（眼藥水圖示 SVG）
- [ ] 點擊滴管按鈕，按鈕出現 active 樣式，進入吸色模式
- [ ] 吸取螢幕任意顏色，applyColor() 更新顏色狀態（色塊、hex 欄位同步）
- [ ] 按 Esc 取消吸色，顏色不變，按鈕 active 樣式移除
- [ ] EyeDropper API 不可用時（測試環境），fallback 開啟 OS 原生色票 picker
- [ ] 從 OS 原生 picker 選色後，顏色正確套用

#### 浮動選色面板（v2.5）

**面板開關與 Toggle**
- [ ] 點擊工具列 `colorPreview` 方塊，浮動面板出現（`display` 從 `none` 變為 `flex`）
- [ ] 面板開啟後再次點擊同一個 `colorPreview` 方塊，面板關閉
- [ ] 面板開啟期間點擊 `fillColorPreview`，面板切換錨點，繼續開啟（不關閉）
- [ ] 切換工具（例如從矩形框切換至線條），面板自動關閉
- [ ] 面板開啟時點擊畫布繪圖區域，面板**不**關閉（Sticky 行為）

**選色 Sticky 行為**
- [ ] 點擊主題色盤中的任一色票，顏色套用，面板保持開啟
- [ ] 連續點擊不同色票，每次顏色即時更新，面板始終開啟
- [ ] 點擊標準色彩中的色票，顏色套用，面板保持開啟
- [ ] Hex 輸入框輸入 6 位合法值並按 Enter，顏色套用，面板保持開啟
- [ ] 滴管吸色完成後，顏色套用，面板保持開啟

**透明色票**
- [ ] 標準色彩列最後一格顯示白底 + 45° 紅斜線的透明色票
- [ ] 點擊透明色票，`fillrect` 標註的填色變為全透明（alpha 0）
- [ ] 透明色票套用後，面板保持開啟（Sticky 行為一致）

**主題色盤結構**
- [ ] 面板顯示 10 欄 × 6 列色塊（共 60 色），每欄為同色系由淺至深排列
- [ ] 主題色盤色塊點擊後，對應色塊出現 active 高亮框
- [ ] 切換至其他色系色塊，先前色塊 active 樣式移除，新色塊加上 active 樣式

**Hex 同步**
- [ ] 開啟面板時，Hex 輸入框顯示當前工具顏色的 6 位大寫 hex 碼
- [ ] 點擊任一色票後，Hex 輸入框即時同步更新顯示新的色碼

#### 編號標記大小（v2.5）
- [ ] 點擊「小」按鈕（`data-ns="36"`），新增編號半徑為 36 px
- [ ] 點擊「標準」按鈕（`data-ns="48"`），新增編號半徑為 48 px（預設值）
- [ ] 點擊「大」按鈕（`data-ns="56"`），新增編號半徑為 56 px
- [ ] 預設開啟編輯器時，編號大小為標準（48 px）
- [ ] Select 工具選取已有編號 → 於選項列切換大小，編號即時縮放

#### Smart Semantic Numbering — 風格化標籤（v3.5）
- [ ] 預設風格為 `dot`：點擊畫布放置編號，顯示實心圓點內含數字
- [ ] 切換至 `circle`（①）風格，點擊放置 ①②③，連續點擊自動遞增
- [ ] `circle` 風格第 21 個編號顯示 ㉑（U+3251），第 36 個顯示 ㊱（U+32B1）
- [ ] `circle` 風格第 51 個編號自動 fallback 為 dot 樣式並顯示數字 51
- [ ] 切換至 `circle-fill`（➊）風格，點擊放置 ➊➋➌，連續點擊自動遞增
- [ ] `circle-fill` 風格第 11 個編號自動 fallback 為 dot 樣式並顯示數字 11
- [ ] 切換至 `roman`（Ⅰ）風格，點擊放置 Ⅰ Ⅱ Ⅲ，連續點擊自動遞增
- [ ] `roman` 風格第 13 個編號自動 fallback 為 dot 樣式並顯示數字 13
- [ ] 切換至 `cjk-paren`（㈠）風格，點擊放置 ㈠㈡㈢，連續點擊自動遞增
- [ ] 切換至 `cjk-circle`（㊀）風格，點擊放置 ㊀㊁㊂，連續點擊自動遞增
- [ ] glyph 風格的標籤顏色跟隨顏色工具列所選色
- [ ] 選取已放置的 glyph 風格編號 → options bar 風格按鈕正確高亮
- [ ] 選取已放置的 glyph 風格編號 → 切換風格 → 畫布即時更新
- [ ] 舊版存檔（無 `numberStyle` 欄位）開啟後顯示為 `dot` 樣式，不出錯
- [ ] 點擊「重置編號」後再放置，計數從 1 重新開始，風格保持不變

#### 虛線種類升級（v3.7）
- [ ] 線條工具 options bar 顯示下拉選單，預設「實線」
- [ ] 切換為「點線」，繪製線條後呈現點狀虛線
- [ ] 切換為「長點點」，繪製折線後呈現長點點虛線
- [ ] 選取已存在線條，切換虛線種類，線條即時更新
- [ ] 虛線設定在筆型工具中同樣有效

#### 端點樣式升級（v3.7）
- [ ] 線條工具 grpCaps 起點與終點各顯示 5 個按鈕（平/圓/方/點/箭）
- [ ] 選擇「圓頭」，線條兩端呈現圓弧端點
- [ ] 選擇「方頭」，線條兩端延伸至端點外半個線寬
- [ ] 圓頭 + 箭頭組合：箭頭端畫箭頭，另一端圓頭正確顯示
- [ ] 筆型工具可設定起點 / 終點端點樣式（含箭頭）

#### 筆型工具（v3.7）
- [ ] 工具列「✏」按鈕可點選，按 `P` 快捷鍵切換
- [ ] 按住滑鼠拖曳，畫出平滑曲線（quadratic bezier 插值）
- [ ] 放開滑鼠後曲線成為可選取的 pen annotation
- [ ] pen annotation 可被拖曳移動、Cmd+C 複製、Cmd+V 貼上（offset 8px）
- [ ] options bar 顯示：顏色、粗細、虛線、起終點端點、不透明度、外框、陰影
- [ ] 不透明度設為 50%，筆跡半透明
- [ ] 外框色選黑色，筆跡出現黑色外框描邊
- [ ] 外框色為透明（預設），不顯示外框
- [ ] 陰影勾選，筆跡出現右下陰影
- [ ] 選取後修改任何屬性（顏色、粗細、透明度），筆跡即時更新

#### Bug 修正（v3.15）

**鉛筆箭頭線段銜接**
- [ ] 鉛筆工具，arrow 終點：箭頭三角形與線段主體無缺口，邊框無斷裂
- [ ] 鉛筆工具，arrow 起點：同上，起點銜接正常
- [ ] 有外框色時：外框線段與外框箭頭同樣無缺口
- [ ] 無外框時：行為與前版相同，不退化

#### Bug 修正（v3.14）

**箭頭方形頂點**
- [ ] 直線工具，設定 arrow 端點，繪製線條：箭頭尖端應為純三角，無線段方形矩形端口露出
- [ ] 鉛筆工具，同上，箭頭尖端乾淨
- [ ] 短線段（兩端皆為 arrow）：線段體仍可見，不被過度截短
- [ ] 無外框時（純箭頭）：外觀與前版相同，無退化

**外框箭頭不位移**
- [ ] 直線設定外框色，arrow 端點：外框描邊緊貼箭頭三角形邊緣，無往後偏移
- [ ] 鉛筆同上
- [ ] dot 端點：外框圓環緊貼圓點邊緣
- [ ] 外框色為透明時，箭頭只顯示主色，無額外描邊

#### Bug 修正（v3.13）

**外框箭頭金字塔**
- [ ] 直線工具：設定外框色、端點為 arrow，外框三角形應比主三角形微幅外擴（非暴增），不形成「金字塔」堆疊感
- [ ] 鉛筆工具：同上，外框 arrow 端點呈正常描邊，主色 arrow 清晰疊在外框之上
- [ ] dot 端點：外框圓點比主色圓點微幅大，形成圓形描邊

**鉛筆箭頭角度**
- [ ] 手繪長弧線，終點 arrow 方向與筆跡末段走向一致
- [ ] 繪製繞圈筆跡，起點 / 終點 arrow 方向貼合線段實際切線方向
- [ ] 筆觸只有 2 點時，方向退回鄰接點，不崩潰

#### Bug 修正（v3.12）

**直線端點外框**
- [ ] 線條工具：設外框色（黑色）、終點為 arrow，繪製線條，箭頭端點周圍出現黑色外框輪廓
- [ ] 起點為 dot：圓點周圍出現外框色描邊
- [ ] 起點 / 終點為 none / round / square：不受影響（lineCap 已處理）
- [ ] 外框色透明時，不繪製任何邊框端點

**空心圓符號**
- [ ] 端點起點 / 終點下拉選單，`round` 選項顯示 `◯`（大空心圓），視覺上明顯為空心
- [ ] 選取已有 round cap 的線條，select 正確顯示 `◯`

#### Bug 修正（v3.11）

**鉛筆端點外框**
- [ ] 鉛筆工具：設定外框色（黑色）、端點為 arrow，繪製筆跡後，箭頭端點周圍出現黑色外框輪廓
- [ ] 端點為 dot：圓點周圍出現外框色描邊
- [ ] 端點為 none / round / square：無外框端點（lineCap 已處理），行為不變
- [ ] 外框色為透明時，不繪製任何邊框端點

**鉛筆虛實線**
- [ ] 鉛筆工具：切換線條為「短虛線（dash）」，繪製筆跡，筆觸呈虛線
- [ ] 切換為「點線（dot）」，筆觸呈點線
- [ ] 外框虛實線獨立：外框為實線、主線為虛線，兩者互不影響
- [ ] 選取已有 lineStyle 的鉛筆 annotation，修改虛實線，即時更新

**外框群組排序**
- [ ] 線條工具：options bar 由左至右順序為「粗細 → 線條（虛實）→ 起點 → 終點 → 不透明 → 外框」
- [ ] 鉛筆工具：順序為「粗細 → 線條（虛實）→ 起點 → 終點 → 不透明 → 外框」
- [ ] 矩形框工具：「粗細 → 線條 → 圓角 → 不透明 → 外框（含 X/Y 位移）」

#### Bug 修正 + UI 精簡（v3.10）

**X 光曝光**
- [ ] 線條不透明設為 60%，起點設箭頭，終點設箭頭：箭頭與線身不應出現「X 光透視」效果
- [ ] 鉛筆不透明設為 50%，起點 dot：整段筆觸含端點均呈均勻半透明

**鉛筆縮放 handle**
- [ ] 選取鉛筆筆觸，出現 8 個藍色縮放手把（藍色虛線框四角+四邊）
- [ ] 拖動角落手把，筆觸整體等比例縮放
- [ ] 拖動邊中手把，筆觸在該軸方向縮放

**grpCaps 下拉**
- [ ] 線條工具 options bar 起點 / 終點各顯示一個下拉選單（寬約 52px）
- [ ] 選單選項符號正確：`―`  `○`  `●`  `⏹`  `◀/▶`
- [ ] 切換起點為 `●`，線段起點出現圓點標記
- [ ] 選取已有 arrow 終點的線條，select 顯示 `▶`

**外框粗細 / 外框虛實線**
- [ ] 線條工具 grpLineStyle 外框色票右方出現 px 數字 input（預設 6）+ 虛實線 select
- [ ] 外框粗細改為 10，繪製有外框色的線條，外框明顯變粗
- [ ] 外框虛實線改為「點線」，外框呈點線，主線仍為實線
- [ ] rect 工具 grpStrokeBorder 同樣出現 px input + 虛實線 select
- [ ] 選取已有 borderThickness 的 rect annotation，UI 正確顯示

#### Options Bar 全面對齊（v3.9）

**框線工具外框 + 位移**
- [ ] 切換至矩形框（rect）工具，options bar 顯示「外框」色票，預設棋盤格（透明）
- [ ] 點擊外框色票，選色後 swatch 更新為選取色，X/Y 輸入框預設為 0
- [ ] X = 0, Y = 0 時，外框與主框重疊（等同純描框加粗效果）
- [ ] 設 X = 8，繪製矩形框，可見外框向右偏移 8px
- [ ] 設 Y = -8，繪製矩形框，可見外框向上偏移 8px
- [ ] 選取已有外框的 rect annotation，UI 正確顯示外框色與 X/Y 數值
- [ ] 橢圓框（ellipse）同樣支援外框色 + X/Y 位移

**框線工具透明度**
- [ ] rect/ellipse 工具 options bar 顯示「不透明」數字輸入（0–100）
- [ ] 設不透明 = 50，繪製矩形框，框線呈半透明
- [ ] 選取已有 opacity 的 rect annotation，UI 正確顯示數值

**線條/折線透明度**
- [ ] line 工具 options bar 顯示「不透明」輸入
- [ ] 設不透明 = 30，繪製線條，線條明顯半透明
- [ ] polyline annotation 選取後同樣顯示不透明輸入，數值正確

**虛實線全工具覆蓋**
- [ ] rect 工具 options bar 顯示「線條」虛實線 select
- [ ] 選擇「點線」後繪製矩形框，邊框呈點線樣式
- [ ] fillrect 工具顯示虛實線 select；色塊邊框可呈虛線
- [ ] pen / line 的虛實線 select 移至 grpDashStyle，功能不變

**直角按鈕顯示邏輯**
- [ ] line 工具時，直角按鈕顯示
- [ ] 選取 polyline annotation 時，直角按鈕隱藏

**筆型外框位置**
- [ ] pen 工具時，外框色 swatch 出現在「粗細」後、「虛實線」前
- [ ] 設外框色後繪製筆觸，可見外框描邊

#### 工具一致性升級（v3.8）

**色塊工具邊框簡化**
- [ ] 矩形色塊（fillrect）選項列中，不再出現「有」「無」邊框按鈕
- [ ] 粗細 = 0 時，fillrect / fillellipse 不繪製邊框；粗細 ≥ 1 時顯示邊框
- [ ] 舊版含 `fillBorder: false` 的 annotation 仍不顯示邊框（向下相容）
- [ ] 切換到 fillrect / fillellipse 工具，UI 無 「有」「無」按鈕出現

**線條 / 折線外框色**
- [ ] 線條（line）選項列中，`grpLineStyle` 出現「外框」色塊 swatch
- [ ] 折線（polyline）選取後，選項列也顯示「外框」色塊
- [ ] 預設外框色 swatch 顯示棋盤格（透明）
- [ ] 點擊外框色 swatch 開啟選色面板；選色後關閉面板、swatch 更新為選取色
- [ ] 選取外框色後，線條繪製出現明顯外框（比主線寬 4px）
- [ ] 若外框色為透明，渲染結果與 v3.7 相同（無外框）
- [ ] 選取已有外框色的 line annotation，UI 正確顯示該外框色

**線條 / 折線陰影**
- [ ] 切換至線條（line）工具，`grpShadow`（陰影選項）出現於選項列
- [ ] 勾選陰影後拖曳繪製線條，線條具有陰影效果
- [ ] 選取已有陰影的 line annotation，陰影 checkbox 呈現勾選狀態
- [ ] 折線（polyline）同樣支援陰影（commit 後重新選取可見陰影 checkbox 正確）

#### 框型選取工具（v3.6）
- [ ] 工具列「⬚」按鈕可點選，點擊後切換到 boxselect 工具（options bar 顯示尺寸標籤）
- [ ] 按 `M` 快捷鍵切換到 boxselect 工具
- [ ] 拖曳選取區域，canvas 出現綠色虛線框＋淡綠色填充，options bar 即時顯示 `W × H px　Cmd+C 複製`
- [ ] 拖曳完成後按 `Cmd+C`，toast 顯示「已複製 W × H px，Cmd+V 貼上為浮動圖層」
- [ ] 複製後按 `Cmd+V`，選取區域像素以 `img` annotation 形式出現於畫布中心，自動進入選取模式
- [ ] 貼上的浮動圖層可被拖曳移動
- [ ] 貼上的浮動圖層可被角落 handle 縮放（維持長寬比）
- [ ] 複製動作同時寫入系統剪貼簿（可在 macOS 預覽、Notes 等 App 中直接貼上）
- [ ] 按 `Esc` 清除綠色虛線框，取消選取
- [ ] 切換至其他工具（如矩形框、文字），綠色選取框自動消失
- [ ] 拖曳範圍小於 4px 視為無效選取，不顯示選取框

#### 最近使用色（v2.3 階段 A）
- [ ] 初始開啟面板時，「最近使用」區塊不顯示（`#cppRecentSection` 隱藏）
- [ ] 從主題色盤或標準色彩點擊任一顏色後，「最近使用」區塊出現，顯示剛才使用的色塊
- [ ] 連續使用 3 個不同顏色，recent 列按最新在前的順序排列（最新的在最左）
- [ ] 重複點擊已存在於 recent 的顏色，該色移至最前，不重複出現
- [ ] 使用超過 10 個不同顏色，recent 列最多保留 10 格，最舊的自動移除
- [ ] 點擊 recent 列中的色塊，顏色正確套用至當前工具
- [ ] 點擊 recent 色塊後，面板保持開啟（Sticky 行為一致）
- [ ] 點擊透明色票，transparent **不**進入 recent 列
- [ ] fillrect 填色 A / 填色 B / 邊框色等所有顏色來源均計入同一份 recent 列
- [ ] 重新開啟 App（重啟 Electron），recent 列清空（session-only，不持久化）

#### 文字描邊（v2.3 階段 B）
- [ ] 文字工具選項列顯示「描邊」色塊 + 無/細/中/粗 按鈕組
- [ ] 預設為「無」（`data-tsw="0"` active）
- [ ] 點擊「細」，新增文字後可見 1px 描邊（顏色為描邊色塊所選色）
- [ ] 點擊「中」/ 「粗」，描邊線寬分別為 2px / 3px
- [ ] 點擊「無」，文字不顯示描邊
- [ ] 點擊描邊色塊，浮動選色面板開啟，選色後描邊色即時更新
- [ ] Select 工具選取已有文字 → 修改描邊粗細，文字即時更新

#### 文字背景色塊（v2.3 階段 B + v2.6 修正）
- [ ] 文字工具選項列顯示「背景」色塊 + 透明度數字輸入框
- [ ] **預設透明度 0**（無背景）；背景色塊預覽顯示棋盤格透明樣式
- [ ] 輸入透明度 40，新增文字後可見半透明背景底色
- [ ] 背景色塊寬高涵蓋所有行文字（包含多行），帶 3px padding
- [ ] 點擊背景色塊，浮動選色面板開啟
  - 選實色：若透明度 = 0，自動升至 50%；色塊預覽切換為該實色
  - 選透明：透明度歸零，色塊預覽切換回棋盤格
- [ ] 手動將透明度數值改為 0，色塊預覽即時顯示棋盤格（背景消失）
- [ ] 手動將透明度數值改為 > 0，色塊預覽即時顯示對應實色
- [ ] Select 工具選取已有文字 → 修改透明度，背景即時更新
- [ ] Select 工具選取透明度 = 0 的已有文字，背景色塊預覽正確顯示棋盤格（不殘留上一個 annotation 的實色）

#### 文字工具 — 字體選擇（v2.6）
- [ ] 文字工具選項列「字體」欄位顯示 `<select>` 下拉，預設選項「系統預設」
- [ ] 下拉展開後顯示 10 種字體：系統預設、蘋方-繁、黑體-繁、宋體-繁、楷體-繁、Helvetica Neue、Georgia、Verdana、Impact、等寬 Menlo
- [ ] 切換字體，textarea 內的預覽文字 `font-family` 即時變更
- [ ] 切換字體，canvas 預覽（描邊 / 背景）使用新字體重繪
- [ ] 確認文字後，燒錄到畫布的文字使用所選字體
- [ ] Select 工具選取已有文字 → 切換字體，canvas 文字即時以新字體重繪
- [ ] Select 工具選取已有文字，「字體」下拉自動恢復該標註儲存的字體

#### 文字工具 — 字型大小快選（v2.6）
- [ ] 文字工具選項列字型大小旁顯示快選 `<select>`，初始顯示「—」
- [ ] 快選下拉展開後顯示：36 / 48 / 64 / 96 / 128 / 192
- [ ] 選取快選中任一數值，左側數字輸入框立即更新，textarea 文字大小即時變化
- [ ] 快選選取後，`<select>` 自動重置為「—」（不留在選取的數值）
- [ ] 手動在數字輸入框 keyin 值，快選不受干擾（保持「—」）
- [ ] 數字輸入框仍支援上下鍵微調（type=number 原生行為）

#### 文字工具 — 編輯中預覽對齊（v2.6 Bug fix）
- [ ] 新增文字並設定文字描邊，編輯中 textarea 的描邊預覽與文字字形在垂直方向對齊（無明顯偏移）
- [ ] 新增文字並設定背景色塊，編輯中背景色塊的垂直起點與文字字形頂端對齊
- [ ] 字型大小從 36px 換至 128px，描邊預覽仍保持對齊（偏移不隨字級放大）
- [ ] 雙擊重新編輯既有文字，輸入框位置與畫布文字精確對齊（無論任何字體 / 大小）
- [ ] 確認燒錄後，最終成品描邊位置與編輯中預覽一致

#### 文字工具 — 文字對齊（v2.6）
- [ ] 文字工具選項列在刪除線 S 按鈕之右、描邊之左，顯示「左」「中」「右」三個對齊按鈕，預設「左」為 active
- [ ] 點擊「中」，active 切換至「中」；點擊「右」，active 切換至「右」（三選一互斥）
- [ ] 靠左對齊：多行文字每行均從點擊位置（錨點左緣）起始，與原有行為一致
- [ ] 置中對齊：多行文字每行均以點擊位置為中軸水平置中
- [ ] 靠右對齊：多行文字每行均以點擊位置為右緣，向左延伸
- [ ] 三種對齊下背景色塊（textBgOpacity > 0）均以最寬行為準正確框住所有行文字
- [ ] 三種對齊下底線、刪除線均正確覆蓋各行文字，無位移
- [ ] 三種對齊下描邊（textStrokeWidth > 0）渲染正確，無錯位
- [ ] 編輯中 textarea `text-align` CSS 反映目前對齊設定（即時可見）
- [ ] **輸入中切換對齊**：文字輸入框已開啟時切換置中/靠右，textarea 水平錨點即時更新，canvas 預覽（描邊/背景）與輸入框完全重合，無位移
- [ ] **描邊 + 置中對齊**：輸入文字並套用描邊，canvas 描邊與輸入框文字位置一致（過去 bug：textarea 錨點不更新導致錯位）
- [ ] **描邊 + 靠右對齊**：同上，靠右對齊下描邊無錯位
- [ ] Select 工具選取已有文字 → 切換對齊，canvas 文字即時依新對齊方式重繪
- [ ] Select 工具選取已有文字，對齊按鈕 active 狀態自動恢復為該標註儲存的對齊值
- [ ] 選取框（8 把手）的位置與文字實際渲染範圍相符（置中 / 靠右時 bounding box 正確）

#### 陰影開關（v2.3 階段 B）
- [ ] 矩形框工具選項列出現「☑ 陰影」checkbox，預設未勾
- [ ] 色塊工具選項列出現「☑ 陰影」checkbox，預設未勾
- [ ] 編號工具選項列出現「☑ 陰影」checkbox，預設未勾
- [ ] 文字工具選項列出現「☑ 陰影」checkbox（在 grpFont 內），預設未勾
- [ ] 線條工具選項列**不**顯示陰影 checkbox
- [ ] 矩形框勾選陰影，繪製後矩形框出現右下角陰影
- [ ] 色塊勾選陰影，繪製後色塊出現陰影（填色區塊有陰影，邊框無陰影）
- [ ] 編號勾選陰影，放置後圓形出現陰影，圓內數字**不**額外顯示陰影
- [ ] 文字勾選陰影且無背景，文字填色出現陰影
- [ ] 文字勾選陰影且有背景色塊，陰影顯示於背景色塊上（而非文字本身）
- [ ] Select 工具選取已有標注 → 勾選 / 取消陰影，即時更新

#### 矩形框 / 色塊 — 圓角（v2.6）
- [ ] 框線工具（R）options bar 顯示「圓角 %」數字輸入框，預設值 0
- [ ] 色塊工具（B）options bar 同上顯示「圓角 %」輸入框，預設值 0
- [ ] 圓角 0%：繪製出直角矩形（與原有行為一致）
- [ ] 圓角 50%：矩形四角出現明顯弧度，視覺為圓角矩形
- [ ] 圓角 100%：短邊較小的矩形自動 clamp 為橢圓（寬 > 高 → 橫橢圓；高 > 寬 → 豎橢圓；等比例 → 圓形）
- [ ] 拖曳繪製框線矩形時，即時預覽顯示對應圓角弧度
- [ ] 拖曳繪製色塊時，填色與邊框均以圓角路徑渲染
- [ ] Select 工具選取已有矩形框 → 修改圓角 %，canvas 即時重繪
- [ ] Select 工具選取已有矩形框，圓角輸入框自動恢復該標註儲存的數值
- [ ] 色塊漸層填色模式下圓角同樣生效（漸層裁切在圓角路徑內）
- [ ] **色塊加圓角後仍可縮放**：Select 工具選取已有色塊（含圓角），拖曳 8 個把手可自由縮放大小（過去 bug：applyResize 缺少 fillrect 分支導致拖曳無反應）
- [ ] 色塊縮放後圓角比例依新尺寸重新計算，視覺弧度一致

#### 線條工具 — 正交折線（v2.6）
- [ ] 線條工具（L）options bar 在「虛線」按鈕之後顯示「直角」toggle 按鈕，預設非 active
- [ ] 點擊「直角」按鈕 → active 狀態開啟；再次點擊 → 關閉（toggle）
- [ ] 直角模式開啟，拖曳方向 `|ΔX| > |ΔY|`：終點吸附為水平線（y2 = y1），即時預覽顯示水平線
- [ ] 直角模式開啟，拖曳方向 `|ΔX| < |ΔY|`：終點吸附為垂直線（x2 = x1），即時預覽顯示垂直線
- [ ] 直角模式開啟，端點箭頭方向正確（水平線 → 左右箭頭；垂直線 → 上下箭頭）
- [ ] 直角模式開啟，虛線樣式正常生效
- [ ] 直角模式關閉，拖曳行為恢復任意角度（與原有行為一致）
- [ ] Select 工具選取已有直角線條，「直角」按鈕自動恢復 active 狀態
- [ ] Select 工具選取非直角線條，「直角」按鈕為非 active
- [ ] **選中已繪製線條後啟用直角**：Select 工具選取斜線 → 點「直角」按鈕，線條端點自動吸附至水平或垂直（`|ΔX| >= |ΔY|` → y2=y1；否則 → x2=x1），操作可 Undo

#### 折線工具（多段折線，v2.6+）
- [ ] 線條工具選取 + 直角 ON：第一次點擊畫布開始折線模式，游標旁有即時預覽段
- [ ] 每次點擊新增頂點，各段自動路由為直角（H→V 或 V→H）
- [ ] 游標移動時，即時預覽從最後頂點到游標的折線段
- [ ] 雙擊完成折線，折線燒錄至標註，切換到選取工具
- [ ] Escape 取消進行中折線，畫布清除預覽，工具維持不變
- [ ] 折線至少需 2 個頂點才能完成；若只點 1 下後雙擊則取消
- [ ] 完成後 Select 工具選取折線：各頂點顯示小圓點把手
- [ ] 拖曳頂點把手，該頂點移到新位置，相鄰段即時更新
- [ ] 拖曳折線本體（非把手），整條折線整體位移
- [ ] 折線箭頭（endCap = arrow）方向正確指向末段到達方向
- [ ] 折線虛線樣式（lineStyle = dashed）渲染正確
- [ ] Cmd+C / Cmd+V 複製貼上折線，貼上版本偏移 8px
- [ ] 直角 toggle OFF 後，進行中的折線自動取消

#### 橢圓框工具（v3.0）
- [ ] 工具列點擊「○」按鈕，切換至 ellipse 工具，按鈕呈 active 狀態
- [ ] 拖曳畫布，即時預覽橢圓形輪廓（半透明）
- [ ] 放開滑鼠後橢圓燒錄至標註，切換至 Select 工具
- [ ] **Shift 拖曳**：橢圓鎖定為正圓（寬高相等）
- [ ] options bar 顯示：顏色、線條粗細、陰影；**不**顯示圓角 % 輸入框
- [ ] 拖曳距離過短（< 2px）不產生標註
- [ ] Select 工具選取橢圓 → 修改顏色，橢圓即時更新顏色
- [ ] Select 工具選取橢圓 → 修改線條粗細，即時更新
- [ ] Select 工具選取橢圓 → 勾選陰影，橢圓顯示右下角陰影
- [ ] Select 工具選取橢圓 → 取消陰影，陰影消失，可 Undo
- [ ] 選取橢圓顯示 8 個白色圓形把手（4 角 + 4 邊中點）
- [ ] 拖曳角落把手，對角固定，橢圓自由縮放
- [ ] 拖曳邊緣中點把手，對邊固定，僅單一軸縮放
- [ ] 拖曳橢圓本體（非把手），整個橢圓整體位移
- [ ] Cmd+Z 撤銷橢圓，Cmd+Shift+Z 重做
- [ ] Cmd+C / Cmd+V 複製貼上橢圓，貼上版本偏移 8px

#### 矩形、線條、編號
- [ ] 新增矩形框，顏色為選取的顏色
- [ ] 新增線條（實線，單向箭頭），終點顯示箭頭頭
- [ ] 新增線條（虛線），呈現虛線樣式
- [ ] 新增線條（雙向箭頭），兩端皆顯示箭頭頭
- [ ] 新增線條（起點圓點 + 終點箭頭），兩端樣式正確
- [ ] 新增編號，第一個為 1，第二個為 2
- [ ] 拖動標註元素，位置正確更新
- [ ] Cmd+Z 撤銷最後一個標註
- [ ] 按「完成」後標註燒錄，無法再選取標註元素
- [ ] 可同時存在不同顏色的框（藍框 + 紅框）
- [ ] 點擊 `?` 按鈕，快捷鍵說明 Modal 正確開啟
- [ ] Modal 按 Esc 關閉

#### 文字工具 — 基本
- [ ] 點選畫布新增文字，輸入框出現在點擊位置，內容正確顯示
- [ ] 預設字型大小為 48px
- [ ] Shift+Enter 確認文字，燒錄至畫布
- [ ] Escape 取消，畫布無殘留文字
- [ ] 點擊文字框外區域，文字自動確認燒錄（等同 Shift+Enter）

#### 文字工具 — 多行換行
- [ ] 輸入文字後按 Enter，游標換至下一行（不提前確認）
- [ ] 輸入三行文字，燒錄後畫布顯示三行，行距正確
- [ ] 多行文字中 Shift+Enter 正確確認並燒錄所有行
- [ ] IME 輸入法（注音）打字中按 Enter 選字，不觸發換行以外的動作

#### 文字工具 — 文字框自動展開
- [ ] 輸入短文字，框寬度隨字數橫向展開（不裁切）
- [ ] 輸入長文字（超過初始框寬），框持續展開，不出現橫向捲軸
- [ ] 多行文字最長行決定框寬度，其餘行不影響
- [ ] 輸入框高度隨行數增加而下移展開

#### 文字工具 — 選取範圍準確性
- [ ] Select 工具點擊文字最後一個字元，仍可選取（框涵蓋全部文字）
- [ ] 含中文全形字的文字標註，選取框寬度正確涵蓋所有字元（不因 0.58 係數低估）
- [ ] 多行文字選取框高度 = 行數 × 字型大小 × 1.25

#### 文字工具 — 重新編輯
- [ ] 雙擊文字標註，進入編輯模式，原文字立即從畫布消失（不重疊）
- [ ] 重新編輯時輸入框位置與原文字精確對齊
- [ ] 重新編輯後 Shift+Enter 確認，更新後文字位置不位移
- [ ] 重新編輯後 Escape，還原原始文字且位置不變

#### 文字工具 — 編輯中屬性即時反應
- [ ] 文字輸入中（textActive），點擊色盤換色，輸入框內文字立即變色
- [ ] 燒錄後顏色與編輯中一致
- [ ] 文字輸入中修改字型大小，輸入框內文字大小立即變化
- [ ] 燒錄後字型大小與編輯中設定一致
- [ ] 從 Select 工具雙擊進入重新編輯模式後，換色即時反應（不需切換至文字工具）
- [ ] 從 Select 工具雙擊進入重新編輯模式後，改字型大小即時反應

#### 文字工具 — 工具列可見性
- [ ] 進入文字編輯模式，工具列顯示顏色與字型大小選項
- [ ] 點擊文字框外確認文字後回到 Select 工具，工具列狀態正常（不消失）
- [ ] 雙擊文字重新編輯後點框外確認，工具列仍正常顯示

### E3 疊圖

#### 基本操作
- [ ] 左側工具列出現「⧉」按鈕，title 顯示「疊入圖片 (O)」
- [ ] 按下 O 鍵，觸發與按鈕相同的行為（開啟檔案選取）
- [ ] 選取 PNG 圖片，疊入圖出現在畫布中央，預設尺寸 ≤ 底圖的 50%
- [ ] 選取 JPG、WebP、GIF 圖片，均可正確疊入
- [ ] 插入後自動切換為選取工具，疊入圖呈現選取框 + 8 個控制點

#### 移動
- [ ] 拖動疊入圖主體，位置正確更新
- [ ] Cmd+Z 撤銷移動，圖片回到原位

#### 縮放
- [ ] 拖動角落把手（NW / NE / SE / SW），等比例縮放（寬高比不變）
- [ ] 拖動邊緣把手（N / S / E / W），自由縮放（允許拉伸）
- [ ] Cmd+Z 撤銷縮放，圖片回到原尺寸

#### 限制與邊界
- [ ] 疊入圖存在時再次按 O 鍵，顯示 toast 提示「請先刪除現有疊入圖」
- [ ] 選取疊入圖時，頂部選項列不顯示顏色 / 粗細等屬性面板
- [ ] Delete 鍵刪除疊入圖
- [ ] 疊入圖可超出底圖邊界，超出部分在燒錄時裁切

#### 燒錄
- [ ] 按「完成」，疊入圖與其他標註一起燒錄進底圖，輸出圖片正確包含疊入圖像素
- [ ] 燒錄後無法再選取或移動疊入圖

- [ ] 拖動疊入圖，位置正確更新
- [ ] 拖拉邊角縮放，長寬比保持不變
- [ ] 疊入 SVG，正確渲染（不顯示為空白）
- [ ] 燒錄後疊入圖合併進底圖

### F1 格式轉換
- [ ] 存檔對話框預設目錄為系統圖片資料夾（macOS：`~/Pictures`，Windows：`%USERPROFILE%\Pictures`）
- [ ] Windows 環境下不以系統管理員身份執行，存檔對話框仍能正常開啟且預設目錄可寫入
- [ ] PNG 存檔，透明背景（Alpha 通道）保留
- [ ] JPG 存檔，檔案大小小於原始 PNG
- [ ] WebP 存檔，檔案正確開啟
- [ ] WebP 存檔後，macOS Finder 桌面可顯示縮圖預覽（不顯示通用 WEBP 圖示）
- [ ] 裁切後存 WebP，桌面縮圖仍可正確顯示
- [ ] 等比例縮放後存 WebP，桌面縮圖仍可正確顯示
- [ ] 存檔成功後 toast 顯示「已儲存：檔名」
- [ ] 存檔成功後約 800ms，編輯器視窗自動關閉
- [ ] 若使用者取消存檔對話框，編輯器視窗不關閉
- [ ] 開啟 SVG 檔案，顯示點陣化對話框並正確顯示說明文字
- [ ] 對話框預設寬度 = SVG viewBox 寬度（無 viewBox 時為 1920）
- [ ] 對話框高度欄位依輸入寬度自動更新（等比例）
- [ ] 點陣化後進編輯畫面，儲存格式選單不出現 SVG 選項
- [ ] SVG → PNG 輸出，尺寸符合對話框設定的寬度
### F1-C 批次轉換

#### 基本流程
- [x] 點擊「批次轉」按鈕，工具列展開並顯示批次 modal
- [x] 按「選取檔案」選取多個圖片，檔案清單正確顯示
- [x] 拖曳圖片至拖曳區，檔案加入清單
- [x] 重複加入同一路徑，不重複列入（去重）
- [x] 點擊清單中檔案旁的 ✕，該檔案從清單移除
- [x] 點擊「+ 新增檔案」可累加新檔案至現有清單
- [x] 選取 PNG → WebP，按「開始轉換」，輸出 .webp 檔案存在，內容正確

#### 格式與選項
- [x] 目標格式選 JPG：「品質」欄位出現；選 PNG：「品質」欄位消失
- [x] 目標格式選 WebP：「品質」欄位出現
- [x] 清單有 .svg 檔案：「SVG 輸出寬度」欄位出現；清單全為非 SVG：欄位消失
- [x] SVG → PNG，輸出圖片寬度 = SVG 輸出寬度設定值
- [x] 勾選「統一調整尺寸」：固定寬度 / 高度選項出現
- [x] 固定寬度 600px 轉換，輸出圖片寬度 = 600px，高度等比例縮放
- [x] 固定高度 400px 轉換，輸出圖片高度 = 400px，寬度等比例縮放
- [x] 輸出位置選「指定目錄」，點「選擇…」選資料夾，路徑顯示於旁
- [x] 輸出位置「指定目錄」但未選資料夾，點「開始轉換」顯示 toast 提示

#### 同格式偵測
- [x] 清單包含與目標格式相同的檔案（如 .png → PNG），點「開始轉換」顯示警示
- [x] 警示列出所有同格式檔案名稱
- [x] 點「略過這些，繼續轉換」：同格式檔案跳過，其他正常轉換
- [x] 點「取消全部」：警示關閉，不執行任何轉換

#### 進度與完成
- [x] 轉換中進度條推進，log 逐行追加（✓ 成功 / ✗ 失敗）
- [x] 轉換中「開始轉換」按鈕 disabled，按 Esc 不關閉 modal
- [x] 全部成功：toast 顯示「已轉換 N 個檔案」
- [x] 部分失敗：toast 顯示「N 個成功，M 個失敗」（error 樣式）
- [x] 轉換完成後按鈕恢復可點擊

#### 刪除原始檔
- [x] 勾選「轉換完成後刪除原始檔」，轉換後原始檔案不存在
- [x] 來源 = 輸出路徑相同（格式相同）時已被略過，不觸發刪除（已測試）

#### 多格式混合
- [x] 清單同時有 PNG / JPG / SVG，目標 WebP，全部轉換成功
- [x] 批次轉換 3 個檔案，全部輸出成功

### S3 編輯器輸出動作（底部三按鈕）

#### 按鈕排列與狀態
- [ ] 編輯器右下角依序顯示三個按鈕：[完成並儲存]、[複製至剪貼簿]、[分享]
- [ ] 編輯器開啟圖片後，三個按鈕均為可點擊狀態
- [ ] 編輯器未開啟任何圖片時，三個按鈕均為 disabled（灰色，無法點擊）
- [ ] 三個按鈕可不依順序任意使用（互不排斥）

#### S3-A 完成並儲存
- [ ] 點擊「完成並儲存」，彈出格式選擇對話框（PNG / JPG / WebP）
- [ ] 選擇格式並確認路徑後，輸出合併平面圖至指定位置
- [ ] 存檔成功後，編輯器視窗關閉
- [ ] 存檔成功後工具列重新顯示（若無其他開啟中的編輯器）
- [ ] 在格式選擇對話框按「取消」：不儲存，視窗保持開啟，可繼續編輯

#### S3-B 複製至剪貼簿
- [ ] 點擊「複製至剪貼簿」，按鈕立即進入 loading 狀態（disabled）
- [ ] loading 結束後，toast 顯示「已複製」（綠色），約 2 秒後自動消失
- [ ] 複製後**編輯器視窗保持開啟**，可繼續編輯
- [ ] 複製後繼續編輯（新增標註），再次複製，剪貼簿內容為最新狀態（含新標註）
- [ ] 複製的圖片貼入 Finder 預覽 / 其他 App，內容包含所有標註（已燒錄為平面圖）
- [ ] 複製前畫布無標註：剪貼簿內容為乾淨的底圖
- [ ] 複製不影響編輯器狀態（標註、Undo 歷史、底圖均不變）
- [ ] 剪貼簿寫入失敗：toast 顯示「複製失敗，請重試」（紅色），不崩潰

#### S3-C 分享（Share Sheet）
- [ ] 點擊「分享」按鈕，按鈕立即進入 loading 狀態（disabled）
- [ ] loading 結束後，macOS Share Sheet 正確彈出
- [ ] Share Sheet 列出的 App 包含 LINE（已安裝前提下）
- [ ] Share Sheet 列出的 App 包含 Messages
- [ ] Share Sheet 列出的 App 包含 Mail
- [ ] Share Sheet 列出的 App 包含 AirDrop
- [ ] Share Sheet 列出的 App 包含 備忘錄
- [ ] 分享前畫布有標註：Share Sheet 接收的圖片包含所有標註（已燒錄）
- [ ] 分享前畫布無標註：Share Sheet 接收的圖片為乾淨的底圖
- [ ] 分享圖片格式為 PNG（保留透明度）
- [ ] 分享後**編輯器視窗保持開啟**，可繼續編輯
- [ ] 分享後不影響編輯器狀態（標註、Undo 歷史、底圖均不變）
- [ ] 點擊分享後，`os.tmpdir()` 下產生對應暫存 PNG 檔案
- [ ] 暫存檔命名格式符合 `YYYY-MM-DD-HH-mm-ss-share.png`
- [ ] Share Sheet 關閉後約 5 秒，暫存檔被自動刪除
- [ ] 使用者在 Share Sheet 點「取消」不分享，暫存檔仍依時序自動清理
- [ ] 暫存目錄無寫入權限時，toast 顯示「暫存檔建立失敗，請重試」，Share Sheet 不彈出，不崩潰
- [ ] Share Sheet 顯示後使用者點「取消」，編輯器回到正常可操作狀態

---

### S4 選取範圍工具

#### 選取框基礎操作
- [x] 點擊工具列「選取範圍」或按 M 鍵，游標變為十字
- [x] 拖曳畫布建立矩形選取框，顯示虛線邊框 + 8 個把手
- [x] 拖曳角落把手可調整選取框大小
- [x] 拖曳框內（非把手區）移動選取框位置，底圖像素不動
- [x] Esc 取消選取框，浮動操作列消失
- [x] 點擊選取框外部，取消選取

#### 浮動操作列
- [x] 選取框啟用後，顯示浮動操作列含 7 個按鈕：複製、剪下、剪裁、刪除、模糊、聚光燈、填充
- [x] 未建立選取框時，浮動操作列不顯示

#### S4-1 複製
- [x] 點擊「複製」，選取區域像素寫入剪貼簿，toast「已複製」顯示
- [x] 選取框超出畫布邊界，複製僅包含畫布內交集部分
- [x] 複製後選取框保持啟用

#### S4-2 剪下
- [x] 點擊「剪下」，選取區域寫入剪貼簿 + 原位填白 + toast「已剪下」
- [x] Cmd+Z 還原：白色區域消失，原像素回復
- [x] 剪下後選取框清除

#### S4-3 剪裁
- [x] 點擊「剪裁」，畫布裁切至選取框範圍，行為與 E1-B 一致
- [x] 裁切後 Cmd+Z 可還原畫布至裁切前尺寸
- [x] 裁切後選取框清除

#### S4-4 刪除
- [x] 點擊「刪除」或按 Delete/Backspace（選取框啟用時），選取區域填白
- [x] Cmd+Z 還原白色填充
- [x] 刪除後選取框清除

#### S4-5 模糊／馬賽克
- [x] 點擊「模糊」，彈出設定面板（模式 + 強度）
- [x] 模式切換：「模糊」顯示 1–20px 滑桿；「馬賽克」顯示 4/8/16/32px 選項
- [x] 調整強度時，選取框內即時預覽效果
- [x] 點擊「套用」：效果燒進底圖，Cmd+Z 可還原
- [x] 點擊「取消」：不套用，選取框保持啟用
- [x] 套用後選取框清除
- [x] 套用效果不影響選取框外的像素

#### S4-6 聚光燈
- [x] 點擊「聚光燈」，彈出設定面板（暗化強度 0%–80%）
- [x] 即時預覽：選取框外區域半透明暗化，框內清晰
- [x] 點擊「套用」：效果燒進底圖，Cmd+Z 可完整還原至套用前
- [x] 點擊「取消」：不套用，選取框保持啟用
- [x] 套用後選取框清除

#### S4-7 填充
- [x] 點擊「填充」，選取區域以當前工具顏色填充
- [x] Cmd+Z 可還原填充
- [x] 填充後選取框清除

#### S4-8 移動選取區域（像素搬移）
- [x] 游標移至選取框內，顯示四向箭頭游標
- [x] 框內拖曳：選取像素「剪起」，原位立即填白，像素成為浮動物件跟隨游標
- [x] 浮動物件移動中，浮動操作列所有按鈕 disabled
- [x] 拖至新位置後按 Enter 確認：浮動物件落點燒進底圖 → 推入 undo stack → 清除選取框
- [x] 拖至新位置後點擊框外確認：行為同 Enter
- [x] 確認後 Cmd+Z：浮動物件消失，原位白色區域還原，選取框回到搬移前狀態
- [x] 拖曳中按 Esc：浮動物件消失，原位白色還原，選取框回到拖曳前狀態
- [x] 浮動物件部分超出畫布邊界後確認：超出部分裁切，畫布尺寸不變

---

### S5 折線整體縮放（v3.3）

#### 縮放手把外觀
- [x] 折線選取後，外框顯示 8 個圓形縮放手把（4 角 + 4 邊中點），與矩形框樣式相同
- [x] 外框縮放手把（圓形）與頂點手把（菱形）同時顯示，視覺上可區分
- [x] 游標移到角落手把時顯示 `nwse-resize` 或 `nesw-resize`，移到邊緣手把顯示 `ns-resize` 或 `ew-resize`

#### 縮放互動
- [x] 拖曳角落手把 → 所有頂點等比例縮放，外框對角保持固定
- [x] 拖曳上下邊緣手把 → 僅垂直縮放，水平不變
- [x] 拖曳左右邊緣手把 → 僅水平縮放，垂直不變
- [x] 縮放放開後，折線形狀更新並記錄至 Undo 歷史
- [x] 縮放至極小（接近 1px）不會讓頂點坐標混亂

#### OCR 工作程序錯誤處理（v3.3）
- [ ] 若 `npm install` 尚未執行（tesseract.js 模組不存在），OCR 面板顯示錯誤訊息（而非永久卡在「準備中...」）
- [ ] 錯誤訊息說明原因並提示使用者執行 `npm install`
- [ ] utilityProcess.fork() 本身失敗時（Electron API 不可用），OCR 面板也能正確顯示錯誤

### S5 折線頂點手把修正（v3.2）

#### 頂點手把外觀與點擊
- [x] 折線被選取後，每個頂點顯示菱形（◆）手把，顏色為白底藍框
- [x] 菱形手把視覺大小約 8px，明顯大於矩形框的圓形手把
- [x] 游標移到菱形手把時變為 `crosshair`
- [x] 點擊菱形手把範圍（約 12px 半徑）可開始拖曳該頂點
- [x] 拖曳頂點後放開，折線形狀更新並記錄至 Undo 歷史

#### Shift 吸附方向
- [x] 拖曳折線頂點時按住 Shift，移動 X 位移 > Y 位移 → 水平鎖定（y 固定在拖曳起點的 y 值）
- [x] 拖曳折線頂點時按住 Shift，移動 Y 位移 > X 位移 → 垂直鎖定（x 固定在拖曳起點的 x 值）
- [x] Shift 水平／垂直鎖定相互切換正確（以拖曳起點為判斷基準，不受相鄰頂點位置影響）

### S5 OCR 文字辨識工具（v3.1）

#### 工具入口與選取操作
- [x] 點擊工具列「文」按鈕或按 G 鍵，游標變為十字，options bar 顯示「請拖曳選取辨識區域」
- [x] 在畫布上拖曳，顯示藍色虛線矩形選框 + 淡藍填色
- [x] 拖曳中 options bar 顯示即時尺寸（寬 × 高 px）
- [x] 選取框小於 4×4 px 時放開滑鼠不觸發 OCR
- [x] 按 Esc 清除選取框，狀態恢復初始提示文字
- [x] 點擊 options bar「取消」按鈕，切換回矩形框工具

#### 語言包下載（v3.4 已移除，改用 macOS Vision 無需下載）
- [x] ~~首次使用彈出下載對話框~~ → 不適用，Vision 無需語言包
- [x] ~~進度條顯示下載百分比~~ → 不適用

#### OCR 辨識結果面板（v3.4 Vision）
- [x] 拖曳選取後直接辨識，無需任何前置步驟（已驗證）
- [x] 繁體中文辨識正確（已驗證）
- [x] 辨識速度約 1-2 秒（已驗證）
- [x] OCR 面板關閉時左上「取消」按鈕隨之消失（選取框清除）
- [x] 辨識完成後進度條隱藏
- [x] 辨識完成後，右下角浮動面板出現，顯示辨識文字
- [x] 辨識結果可在面板內直接編輯
- [x] 辨識無文字時，面板顯示空白並出現 toast「OCR 未辨識到文字」
- [x] 辨識失敗時，面板顯示錯誤訊息，toast「OCR 辨識失敗」
- [x] 點擊「複製」：辨識文字寫入系統剪貼簿，toast「文字已複製到剪貼簿」，面板保持開啟
- [x] 點擊「複製並關閉」：寫入剪貼簿 + toast + 面板關閉
- [x] 點擊面板右上角「✕」：關閉面板
- [x] 面板開啟中可繼續使用 OCR 工具對新區域進行辨識（面板內容更新）
- [x] 面板開啟中可切換至其他工具，面板保持顯示（不自動關閉）

#### 辨識正確性（啟動後手動驗測）
- [x] 清晰螢幕截圖中的印刷繁體中文文字辨識率 ≥ 85%
- [x] 清晰螢幕截圖中的英文字母及數字辨識率 ≥ 95%
- [x] 中英文混排段落可正常辨識並保留空白

---

## 6. 快捷鍵規格（K1）

### 6.1 設計原則
- macOS 系統已佔用 `Cmd+Shift+3/4/5`，全域快捷鍵需避開
- 全域快捷鍵（從任何 App 觸發）用 `Cmd+Ctrl+` 前綴
- 編輯器內部快捷鍵沿用 macOS 慣例

### 6.2 全域快捷鍵（系統任何地方皆可觸發）

| 功能 | 預設快捷鍵 | 可否自訂 |
|------|-----------|---------|
| 全螢幕截圖 | `Cmd+Ctrl+1` | ✓ |
| 視窗截圖 | `Cmd+Ctrl+2` | ✓ |
| 矩形選取截圖 | `Cmd+Ctrl+X` | ✓ |
| 開啟 App 主視窗 | `Cmd+Ctrl+0` | ✓ |

### 6.3 編輯器內部快捷鍵

#### 工具切換
| 功能 | 快捷鍵 |
|------|--------|
| 矩形框工具 | `R` |
| 線條工具 | `L` |
| 文字工具 | `T` |
| 編號標記工具 | `N` |
| 疊入圖片 | `O` |
| 調整大小工具 | `S` |
| 裁切工具 | `C` |
| OCR 文字辨識工具 | `G` |

#### 通用操作
| 功能 | 快捷鍵 |
|------|--------|
| 撤銷 | `Cmd+Z` |
| 重做 | `Cmd+Shift+Z` |
| 刪除選取的標註元素 | `Delete` / `Backspace` |
| 取消 / 離開目前工具 | `Esc` |
| 儲存 | `Cmd+S` |
| 另存新檔 | `Cmd+Shift+S` |
| 放大畫布 | `Cmd++` |
| 縮小畫布 | `Cmd+-` |
| 畫布縮放重置（Fit） | `Cmd+0` |

### 6.4 快捷鍵說明面板

**觸發方式：** 點擊 App 右上角 `?` 按鈕

**行為：**
- 彈出 Modal 視窗，列出所有快捷鍵（全域 + 編輯器）
- 按 `Esc` 或點擊遮罩關閉
- Modal 本身不可編輯（僅說明用）

---

## 7. 後續迭代（Out of Scope for MVP）

| 功能 | 說明 |
|------|------|
| 跨螢幕矩形選取 | 矩形選取框可跨越雙螢幕邊界；需處理不同 DPI 螢幕的截圖拼合與座標轉換 |
| 歷史截圖紀錄 | 自動儲存截圖歷史，可回溯查看 |
| 並排拼版 | 多圖上下/左右排列成一張 |
| 自由筆選區截圖 | 不規則形狀截圖 |
| 固定區域截圖 | 記憶座標的重複截圖 |
| 動態 GIF 製作 | 多幀合成動畫 |
| PNG/JPG → SVG | 向量追蹤轉換 |
| ~~截圖後直接傳送~~ | ~~寄信、傳 Slack 等~~（已升格為 S3 正式功能，v2.7 實作）|
| 標註樣式預設集 | 儲存常用顏色/樣式組合 |
| Mac App Store 分發 | S2 已移除，Playwright 不再是障礙；仍需 Sandbox + Notarization |
| S2 網頁截圖（重新評估） | 若日後 CP 值提升，可考慮以輕量替代方案（非 Chromium）重新實作 |

---

## 8. 迭代規劃

### v2.1 — 截圖工作流程優化

**功能包：**

#### 延遲截圖

工具列「網頁」按鈕（S2 已移除）替換為「延遲截圖」按鈕。

**設計概念（對標 FastStone）：**
延遲是全局設定，而非獨立截圖模式。設定後，**全螢幕**與**矩形**截圖皆套用延遲；**視窗**截圖不受影響，永遠立即執行。

**UI 設計：**
- 工具列「延遲」區域（⏱ 圖示 + 「延遲」標籤）為**純設定用途**，無點擊觸發動作
- 內嵌秒數下拉（`<select>`）：選項 **0s / 1s / 2s / 3s**，0s = 立即截圖（等同未設定）
- 全域快捷鍵 Cmd+Ctrl+1（全螢幕）、Cmd+Ctrl+X（矩形）皆套用相同延遲設定

**倒數行為：**
- 點擊全螢幕或矩形按鈕（或觸發快捷鍵）後：
  - delay = 0：立即執行截圖
  - delay > 0：工具列顯示半透明倒數 overlay（覆蓋所有按鈕），顯示剩餘秒數（字級統一，不隨數字大小改變）
- 倒數期間可正常操作其他 App（hover 效果、展開選單等）
- 倒數至 0：overlay 消失 → 執行對應截圖（全螢幕 or 矩形）
- 全螢幕倒數至 0 → `mainWindow.hide()` → 截圖 → 進入編輯器
- 矩形倒數至 0 → `mainWindow.hide()` → 選取框 overlay 出現 → 拖拉截圖 → 進入編輯器

**取消：**
- 倒數期間按 `Esc` 取消，overlay 消失，恢復可用狀態

**秒數記憶：**
- 使用者選取的秒數透過 `localStorage` 記憶，重啟 App 後沿用上次設定

**備註：** 截圖同時複製到系統剪貼簿已於 S1 原始規格實作，非本版新增。

---

### v2.2 — 標註核心工具升級

**功能包：**

#### 矩形工具拆分（FastStone 風格）

目前的矩形框工具拆為兩個獨立工具：

| 工具 | 預設行為 | 可設定屬性 |
|------|----------|-----------|
| **框線工具**（原矩形框） | 中空透明，只有邊框 | 邊框顏色、邊框粗細（1–10px） |
| **色塊工具**（新增） | 填色 + 邊框 | 填色顏色、填色透明度（0–100%）、邊框顏色（可設為無邊框）、邊框粗細（1–10px） |

色塊工具說明：
- 填色透明度滑桿（0% = 完全透明 / highlight 效果；100% = 完全不透明 / 遮蓋色塊）
- 邊框可獨立設定顏色與粗細，也可設為「無邊框」

#### 編號標記複製貼上

| 操作 | 行為 |
|------|------|
| 選取標號後 `Cmd+C` | 複製標號（保留大小、顏色、數字） |
| `Cmd+V` | 貼出相同大小的標號，位置偏移 (+8px, +8px)，可拖至目標位置 |

目的：方便在同一張圖上放置多個相同大小的標號，無需手動重新設定大小。

**快捷鍵（新增）：**

| 工具 | 快捷鍵 |
|------|--------|
| 框線工具 | `R`（沿用） |
| 色塊工具 | `B` |

---

### v2.3 — 標註品質細化（已實作）

**功能包：**

| 功能 | 說明 | 狀態 |
|------|------|------|
| 文字外框（描邊） | 文字標註可選擇加上 1–3px 對比色描邊，在複雜背景上提升可讀性 | ✅ 已實作 |
| 文字背景色塊 | 文字標註可選擇加上半透明底色（highlight 效果），比描邊更強的對比 | ✅ 已實作 |
| 最近使用色（釘選） | 顏色列自動記憶最近使用的顏色，顯示於浮動面板標準色下方（移至 v2.5 實作） | ✅ 移至 v2.5 |
| 馬賽克 / 模糊工具 | 拖拉選取矩形區域套用馬賽克或高斯模糊，用於遮蓋個資或敏感資訊 | → v3.0 |
| 曲線箭頭（貝茲把手） | 畫完箭頭後，線段中間出現可拖動的控制把手；拖動把手使箭頭彎曲（quadratic Bézier） | → v3.1 |

---

### v2.4 — 截圖後開啟編輯器：偏好設定切換（已實作）

> 詳見變更紀錄 v2.4。原規劃於此版的「文字沿路徑排列」因版號重新分配，已移至 v3.2。

---

### v2.5 — 浮動選色面板；編號大小升級（已實作）

**功能包：**

| 功能 | 說明 |
|------|------|
| 文字外框（描邊） | 文字標註可選擇加上描邊：顏色自選、粗細 無/細/中/粗（1/2/3px）；選項列色塊 + tsw 按鈕組 |
| 文字背景色塊 | 文字標註可選擇加上半透明底色：顏色自選、透明度 0–100%（0% = 無背景）；小 padding 3px |
| 陰影開關 | 矩形框、色塊、文字、編號各自獨立的陰影 checkbox（預設關）；固定參數：offset 3px、blur 8px、rgba(0,0,0,0.45) |
| 浮動選色面板 | 三層架構（主題色盤 60 色 / 標準色彩含透明 / 滴管 + Hex 輸入），所有顏色預覽方塊共用同一浮動面板 |
| Sticky 面板 UX | 選色後面板保持開啟，可連續切換顏色；點擊錨點或切換工具才關閉 |
| 透明色票 | 標準色彩列新增透明選項，取代漸層工具的獨立「透」按鈕 |
| 最近使用色 | 浮動面板標準色下方自動顯示最近使用顏色（最多 10 色），隨使用自動更新 |
| 編號標記大小升級 | 小 / 標準 / 大 → 半徑 24 / 36 / 56 px，提供更清晰的視覺差異 |
| CSS 特異性修正 | 修正 `#colorPickerPanel` ID 選擇器優先度高於 `.hidden` 導致面板無法隱藏的問題 |

---

### v2.6 — 文字工具 UX 全面升級（已實作）

> 詳見變更紀錄 v2.6。

---

### v2.9 — 選取範圍工具（S4）

#### 新增工具：選取範圍（M 鍵）
- 左側工具列新增「⬚ 選取範圍（M）」按鈕
- 拖曳繪製矩形選取框，8 個把手可調整大小，框內拖曳可移動選取框位置（不帶動像素）
- 選取框啟用後，canvas 下方顯示**浮動操作列**（含 7 個動作按鈕），Esc 取消選取

#### 操作清單
| 動作 | 行為 | undo |
|------|------|------|
| 複製 | 選取區域像素複製至剪貼簿 + toast「已複製」 | 不需要 |
| 剪下 | 複製選取區域 + 原位填白 | ✓ |
| 剪裁 | 裁切畫布至選取範圍（與 E1-B 合流） | ✓ |
| 刪除 | 選取區域填白 | ✓ |
| 模糊／馬賽克 | 對選取區域套用效果（選項：模糊 / 馬賽克，強度可調） | ✓ |
| 聚光燈 | 選取框外半透明暗化，框內清晰；destructive 燒進底圖 | ✓ |
| 填充 | 以當前工具顏色填充選取區域 | ✓ |

#### 移動選取區域（像素搬移）
- 框內**長按後拖曳**（或特定按鍵修飾）：選取像素「剪起」，原位填白，成為可自由移動的浮動物件
- 浮動物件可拖至畫布任意位置
- Enter 確認落點（燒進底圖）；Esc 還原（復位 + 原位白色區域消失）

---

### v2.7 — 編輯器底部三按鈕（複製至剪貼簿 + 分享 + 完成並儲存）

> 規格詳見變更紀錄 v2.7。實作待進行。

---

### v2.8 — 歷史（複數）圖片

> 延續 v2.7 輸出動作的概念，讓截圖工作流程支援多張圖片的歷史記錄與管理。詳細規格待 v2.7 實作完成後展開。

---

### v2.9 — 鉛筆工具（自由塗鴉）

> 全新工具，螢光筆為其子集（預設不透明度 40%、顏色預設黃色）。

**功能包：**

| 功能 | 說明 |
|------|------|
| 鉛筆工具（P 鍵） | 自由曲線塗鴉，mousedown→mousemove→mouseup 記錄路徑點並連續 lineTo |
| 選項列 | 顏色 / 筆粗（細/中/粗）/ 不透明度（0–100%）/ 實線‧虛線 / 描邊色+粗細 / 陰影 |
| 螢光筆模式 | 鉛筆工具 + 不透明度預設 40%，顏色預設黃色（`#ffff00`），無需另開工具 |
| 路徑儲存 | annotation 以 `points: [{x, y}, …]` 陣列儲存，燒錄時重播路徑 |

**技術挑戰：**
- Hit-test 需對多段 lineTo 路徑做 Bézier 近似距離判定（非矩形 AABB）

---

### v3.0 — 選取範圍工具（S4）

> 原規劃為 v2.9，因 v2.9 插入鉛筆工具，版號後移至本版。完整規格詳見 S4 章節。
> 馬賽克 / 模糊操作已作為選取範圍的子動作整合於此版，原獨立 v3.0 馬賽克工具合流至本版。

**功能包：**

| 功能 | 說明 |
|------|------|
| 選取範圍（M 鍵） | 拖拉繪製矩形選取框；把手調整大小；框內拖曳移動框位置（不帶動像素） |
| 複製 | 選取區域像素寫入剪貼簿 + toast |
| 剪下 | 複製 + 原位填白，可 undo |
| 剪裁 | 裁切畫布至選取範圍（與 E1-B 各自獨立，互通觸發點） |
| 刪除 | 選取區域填白（`#FFFFFF`），可 undo |
| 模糊／馬賽克 | 選取區域套用高斯模糊或像素化馬賽克（強度可調），destructive + undo |
| 聚光燈 | 選取框外半透明暗化，destructive + undo（整張底圖快照） |
| 填充 | 以當前工具顏色填充選取區域，可 undo |
| 像素搬移 | 框內拖曳剪起像素為浮動物件，Enter 確認落點 / Esc 還原 |

---

### v3.1 — 對話框（Speech Bubble）

> 向量形狀三連作（v3.1–v3.3）之一。R 鍵 / B 鍵形狀擴充。

**功能包：**

| 功能 | 說明 |
|------|------|
| 對話框模式 | 框線工具（R）和色塊工具（B）各新增「﹏ 對話框」形狀模式按鈕 |
| 圓角矩形底層 | 底層為現有圓角矩形（`cornerRadius` 共用） |
| 發話錨點（尾巴） | 矩形某邊 1/3 處顯示可拖曳錨點；拖曳錨點產生三角形尾巴（兩底角固定在邊上，頂點隨錨點移動） |
| Canvas 路徑 | 以 `ctx.beginPath()` 繪製完整形狀（圓角矩形 + 三角尾巴插入），無需 SVG |
| 錨點 UX | 同現有 resize 把手機制；Select 工具選取後可再次拖曳調整尾巴位置 |

**技術挑戰：**
- 尾巴插入點計算（依拖曳錨點判斷吸附在哪條邊）
- 不規則形狀 hit-test

---

### v3.2 — 曲線箭頭（貝茲把手）

> 原規劃為 v3.1，因 v3.1 插入對話框，版號後移至本版。

**功能包：**

| 功能 | 說明 |
|------|------|
| 曲線箭頭 | 畫完箭頭後，線段中間出現可拖動的控制把手 |
| Quadratic Bézier | 拖動把手使箭頭彎曲；點擊其他地方確認定型 |
| 即時預覽 | 拖動把手時即時預覽曲線形狀與箭頭方向 |

**技術挑戰：**
- 箭頭終點方向需依曲線切線角度旋轉
- 選取判定需改為曲線距離計算（非矩形 AABB）

---

### v3.3 — 文字沿路徑排列（實驗性）

> ⚠️ **Experimental** — 原規劃為 v2.4，因版號重新分配移至本版。視 v3.1 完成品質與時程決定是否實作。

| 功能 | 說明 |
|------|------|
| 文字沿路徑排列 | 類似 Word 文字藝術師效果；文字可沿自訂曲線路徑排列（每個字元依路徑角度旋轉） |

**技術挑戰：**
- Canvas 無原生路徑文字支援，需手動計算每個字元的位置與旋轉角度
- 中文字元寬度不一，間距計算複雜
- 互動體驗（拖把手同時即時預覽文字彎曲）需大量即時重繪

**評估標準：** v3.2 完成後評估技術可行性，視覺效果可接受則進入 v3.3，否則移至長期 Backlog。

---

## 9. 長期遷移規劃

### 9.1 Electron → Tauri 遷移

> **時機：** Electron 版本所有功能模組（含 v2.4 或其評估結果）完成、測試通過後啟動。

#### 遷移動機

| 考量 | Electron 現況 | Tauri 目標 |
|------|--------------|-----------|
| 安裝包體積 | ~150–250 MB（含 Chromium） | ~5–20 MB（使用系統 WebView） |
| 記憶體佔用 | 高（Chromium 常駐） | 低 |
| 原生 API 整合 | 透過 IPC + Node.js | Rust backend，系統 API 更直接 |
| 分發簽署 | 需 Apple Developer 帳號 notarise | 相同，Tauri bundler 已整合 |

#### 遷移原則
- 前端 UI（HTML / CSS / Vanilla JS）**全部保留**，僅替換 Electron 主程序層。
- 截圖邏輯（`screencapture` / `CGWindowID`）改以 Rust command 呼叫，IPC 介面維持相同語意，前端呼叫端改動最小化。
- Sharp 影像處理改用 Tauri 的 Rust image crate 或保留 Node sidecar，視 bundle 體積評估決定。
- `localStorage` 用於儲存偏好設定的邏輯不變（Tauri WebView 支援 localStorage）。

#### 遷移後新增功能排程

以下功能刻意保留至 Tauri 版本再實作，避免在遷移前引入額外複雜度：

| 功能 | 原因 |
|------|------|
| **物件旋轉（Rotation）** | 點擊偵測需反向旋轉座標系，改動範圍大；Tauri 後 canvas 渲染邏輯更穩定再加 |
| **截圖歷史（Screenshot History）** | Electron 下 temp 檔生命週期不可靠、縮圖快取與 IPC 有時序問題；Tauri 用 `tauri-plugin-store` + `std::fs` 管理後生命週期可完全控制 |
| **移除拖曳匯出浮水印** | Tauri 版為付費產品，不需要 VAS 浮水印；移除匯出時的浮水印疊加邏輯 |
| **工具列拖曳把手 hover 回饋** | Electron 的 `-webkit-app-region: drag` 吃掉所有 pointer events，CSS `:hover` 與 `cursor: grab` 在 drag region 上完全無效；Tauri 使用原生視窗拖曳 API，可對把手元素單獨設定懸停樣式與游標 |
| **兩點貝茲曲線（Cubic Bezier）** | 升級為兩個控制點，與免費版單點貝茲做功能區隔；需更新資料模型（cp1/cp2 相對偏移）、渲染（`bezierCurveTo`）、handle 顯示（端點連控制點虛線）、箭頭切線角度計算 |
| **Share Sheet（系統原生分享）** | 刻意不在 Electron 版實作，作為付費版差異化功能；Tauri 版使用 `tauri-plugin-share` 呼叫 `NSSharingServicePicker` |
| **線條漸層（Line Gradient Stroke）** | 箭頭 / 曲線支援起點→終點雙色漸層；Canvas 原生 `ctx.createLinearGradient` 即可實作，`strokeStyle` 直接吃 gradient object；貝茲曲線以端點連線方向計算漸層向量 |
| **日文 UI 在地化（ja）** | 新增第三語系；i18n 架構擴充為 zh / en / ja 三包翻譯；隱私遮蔽規則補充日文場景特化（マイナンバー、電話番号 JP 格式、メールアドレス）；韌性市場拓展 |

> 旋轉的渲染核心：每個標注新增 `angle` 欄位，選取時顯示旋轉把手，`ctx.save()` → `ctx.translate(cx,cy)` → `ctx.rotate(angle)` → 繪製 → `ctx.restore()`。點擊偵測需將滑鼠座標反向旋轉至物件局部座標系再判斷 hit。

#### 遷移檢查清單（啟動前確認）
- [ ] Electron 版本所有 TDD 測試案例全部通過
- [ ] `.dmg` 安裝包在 macOS 13 / 14 / 15 測試無誤
- [ ] 使用者體驗凍結（不在遷移期間新增功能）
- [ ] 備份 `main.js`、`src/` 完整版本至獨立 tag（`git tag electron-final`）

---

### 9.2 UI 雙語切換（中 / EN）

> **時機：** 在切換至 Tauri 版本時一併實作，Electron 版本以中文介面為唯一語言，不預先內建切換。

#### 設計原則
- Electron 版本開發完成後，UI 文字已全部確定，此時**一次性**對齊中英譯文，避免邊開發邊翻譯造成術語不一致。
- 中文為預設語言；英文為次要語言，可手動切換（選單或設定頁）。
- 不依賴外部 i18n 函式庫，維持 Vanilla JS 原則。

#### 實現方式（Tauri 前端為 HTML/JS，與靜態站做法一致）

**方案：`data-i18n` 屬性 + JS 翻譯字典**

```html
<!-- 範例：工具列按鈕 -->
<button data-i18n="toolbar.screenshot">截圖</button>
<button data-i18n="toolbar.open">開啟圖片</button>
```

```js
// i18n.js
const translations = {
  'zh': {
    'toolbar.screenshot': '截圖',
    'toolbar.open': '開啟圖片',
    // ...
  },
  'en': {
    'toolbar.screenshot': 'Screenshot',
    'toolbar.open': 'Open Image',
    // ...
  }
};

function applyLang(lang) {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    el.textContent = translations[lang]?.[key] ?? el.textContent;
  });
  document.documentElement.lang = lang === 'en' ? 'en' : 'zh-Hant';
  localStorage.setItem('lang', lang);
}
```

#### 語言偵測順序
1. `localStorage` 記憶的使用者選擇（最優先）
2. 系統語言（`navigator.language` 或 Tauri 的 `locale` API）
3. 預設 `zh`

#### 術語統一原則
- 切換至 Tauri 前，建立一份**術語對照表**（工具名稱、UI 元素、提示文字），確保翻譯一致後再套入 JS 字典。
- 術語表附於本節末尾（待 Electron 版本完成後補齊）。

---

## 8. 開放問題（待決定）

| # | 問題 | 狀態 |
|---|------|------|
| Q1 | App 分發方式 | ✅ 確認：.dmg，S2 模組化封裝供未來替換 |
| Q2 | 歷史截圖紀錄 | ✅ 確認：不列入 MVP，移至後續迭代 |
| Q3 | 全域快捷鍵預設值 | ✅ 確認：矩形截圖 Cmd+Ctrl+X，其餘 Cmd+Ctrl+1/2 |

---

*本文件為 SDD v2.0，所有開放問題已確認，可進入開發環境建置。*
