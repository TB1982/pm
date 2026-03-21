# CLAUDE.md — 專案開發守則

## 文件同步規則（強制）

### 修 Bug → 更新 TDD
每次修復測試中發現的 bug，必須在 `SDD-mac-screenshot-tool.md` 第 5 節（測試案例）補上對應的測試案例，涵蓋：
- 重現該 bug 的操作步驟
- 修復後應有的正確行為

### 新增功能 → 更新 SDD + TDD
每次追加新功能（含原本規格沒有的行為），必須同步更新 `SDD-mac-screenshot-tool.md`：
1. **版本號遞增**（`版本：` 欄位）並在**變更紀錄**補一行 `vX.X — 異動摘要`
2. **對應功能章節**補入完整規格說明
3. **第 5 節測試案例**補入新的測試項目（`- [ ]` 格式）

### 提交順序
文件更新與程式碼修改應在**同一個 session 的最後一併 commit**，commit message 清楚標記 `docs(SDD):` 或 `fix:` / `feat:`。

---

## 專案檔案位置

| 檔案 | 用途 |
|------|------|
| `SDD-mac-screenshot-tool.md` | 規格文件（含 TDD 測試案例） |
| `src/editor.js` | 編輯器主邏輯 |
| `src/editor.html` | 編輯器 HTML |
| `src/editor.css` | 編輯器樣式 |
| `main.js` | Electron 主程序 |
