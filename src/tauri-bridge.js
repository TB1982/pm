'use strict'
// Tauri 相容橋接層：提供與 Electron preload 相同的 window.electronAPI 介面
// renderer.js / editor.js 完全不需要修改，繼續使用 window.electronAPI

;(function () {
  const { invoke } = window.__TAURI__.core
  const { listen }  = window.__TAURI__.event

  const INVOKE_CH = new Set([
    'resize-for-modal', 'resize-to-toolbar', 'open-permission-settings',
    'capture-fullscreen', 'get-window-sources', 'capture-window',
    'open-overlay', 'open-image-file', 'new-canvas-create',
    'select-batch-files', 'select-output-dir', 'select-watermark-image',
    'batch-convert',
  ])
  const ON_CH = new Set([
    'shortcut-fullscreen', 'shortcut-window', 'shortcut-rect',
    'capture-result', 'batch-progress',
  ])

  // channel name: kebab-case → snake_case（Tauri command 命名規則）
  const toCmd = ch => ch.replace(/-/g, '_')

  // unlisten 函數儲存，供 removeListener 使用
  const unlistenMap = new Map()

  window.electronAPI = {
    async invoke(channel, payload) {
      if (!INVOKE_CH.has(channel)) throw new Error(`[bridge] blocked invoke: ${channel}`)
      return invoke(toCmd(channel), payload ?? {})
    },

    on(channel, callback) {
      if (!ON_CH.has(channel)) throw new Error(`[bridge] blocked on: ${channel}`)
      listen(channel, event => callback(event.payload)).then(unlisten => {
        if (!unlistenMap.has(channel)) unlistenMap.set(channel, new Map())
        unlistenMap.get(channel).set(callback, unlisten)
      })
    },

    removeListener(channel, callback) {
      const unlisten = unlistenMap.get(channel)?.get(callback)
      if (unlisten) {
        unlisten()
        unlistenMap.get(channel).delete(callback)
      }
    },

    // 檔案路徑取得（Electron webUtils.getPathForFile 相容）
    getPathForFile: (file) => file?.path ?? ''
  }
})()
