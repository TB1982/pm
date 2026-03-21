/**
 * 視窗截圖功能診斷腳本
 * 執行方式：npx electron test-window-capture.js
 *
 * 測試項目：
 *   1. desktopCapturer 能取得視窗清單
 *   2. source ID 格式正確可解析出 CGWindowID
 *   3. screencapture -l <CGWindowID> 能產出非空的 PNG
 */

const { app, desktopCapturer } = require('electron')
const { exec } = require('child_process')
const { promisify } = require('util')
const path = require('path')
const fs   = require('fs')
const os   = require('os')

const execAsync = promisify(exec)

const GREEN  = '\x1b[32m'
const RED    = '\x1b[31m'
const YELLOW = '\x1b[33m'
const RESET  = '\x1b[0m'

function pass(msg) { console.log(`${GREEN}  ✓${RESET}  ${msg}`) }
function fail(msg) { console.log(`${RED}  ✗${RESET}  ${msg}`) }
function info(msg) { console.log(`${YELLOW}  ·${RESET}  ${msg}`) }

app.whenReady().then(async () => {
  console.log('\n=== 視窗截圖診斷 ===\n')

  // ─── Test 1: 取得視窗清單 ─────────────────────────────────────────────────

  console.log('[1] desktopCapturer.getSources')
  let sources
  try {
    sources = await desktopCapturer.getSources({
      types: ['window'],
      thumbnailSize: { width: 320, height: 200 }
    })
    pass(`取得 ${sources.length} 個視窗來源`)
  } catch (err) {
    fail(`getSources 失敗：${err.message}`)
    app.exit(1)
    return
  }

  if (sources.length === 0) {
    fail('視窗清單為空（請先開啟其他應用程式視窗再執行此腳本）')
    app.exit(1)
    return
  }

  // ─── Test 2: 列印所有視窗來源 & 驗證 ID 格式 ──────────────────────────────

  console.log('\n[2] 視窗清單與 ID 解析')
  const parsed = []
  for (const s of sources) {
    const match = s.id.match(/^window:(\d+)/)
    const windowId = match ? match[1] : null
    const status = windowId ? `CGWindowID = ${windowId}` : '⚠ ID 格式無法解析'
    info(`"${s.name}"  |  raw id: ${s.id}  |  ${status}`)
    if (windowId) parsed.push({ name: s.name, id: s.id, windowId })
  }

  if (parsed.length === 0) {
    fail('所有視窗 ID 均無法解析（格式可能在此 Electron 版本不同）')
    app.exit(1)
    return
  }
  pass(`${parsed.length} / ${sources.length} 個視窗 ID 可解析`)

  // ─── Test 3: 用 screencapture -l 對第一個視窗實際截圖 ────────────────────

  const target = parsed[0]
  console.log(`\n[3] screencapture -l 測試（目標："${target.name}"，CGWindowID ${target.windowId}）`)

  const tmpPath = path.join(os.tmpdir(), `test-window-${Date.now()}.png`)
  try {
    await execAsync(`/usr/sbin/screencapture -l ${target.windowId} -x "${tmpPath}"`)
    pass('screencapture 指令執行成功（exit 0）')
  } catch (err) {
    fail(`screencapture 指令失敗：${err.message}`)
    app.exit(1)
    return
  }

  if (!fs.existsSync(tmpPath)) {
    fail('截圖檔案不存在（screencapture 未產出檔案）')
    app.exit(1)
    return
  }

  const stat = fs.statSync(tmpPath)
  if (stat.size === 0) {
    fail(`截圖檔案大小為 0（可能缺乏「螢幕錄製」權限，或 CGWindowID 不符）`)
    fs.unlinkSync(tmpPath)
    app.exit(1)
    return
  }

  pass(`截圖檔案大小：${(stat.size / 1024).toFixed(1)} KB`)
  info(`暫存路徑：${tmpPath}`)

  // ─── Test 4: 讀取 PNG header 確認格式正確 ────────────────────────────────

  console.log('\n[4] 驗證 PNG 格式')
  const buf = Buffer.alloc(8)
  const fd  = fs.openSync(tmpPath, 'r')
  fs.readSync(fd, buf, 0, 8, 0)
  fs.closeSync(fd)

  const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])
  if (buf.equals(PNG_SIGNATURE)) {
    pass('PNG 檔頭驗證通過')
  } else {
    fail(`非標準 PNG 格式（header: ${buf.toString('hex')}）`)
    app.exit(1)
    return
  }

  // ─── 清理並結束 ───────────────────────────────────────────────────────────

  fs.unlinkSync(tmpPath)

  console.log('\n=== 所有測試通過，視窗截圖功能正常 ===\n')
  app.exit(0)
})

app.on('window-all-closed', () => {})
