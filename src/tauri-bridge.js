'use strict'
// Tauri 相容橋接層：提供與 Electron preload 相同的 window.electronAPI 介面
// renderer.js / editor.js 完全不需要修改，繼續使用 window.electronAPI

;(function () {
  // Tauri 2 的 invoke API（__TAURI_INTERNALS__ 在所有 Tauri 2 WebView 中一定存在）
  const tauriInvoke = window.__TAURI_INTERNALS__?.invoke
    ?? window.__TAURI__?.core?.invoke

  const tauriListen = window.__TAURI_INTERNALS__?.listen
    ?? window.__TAURI__?.event?.listen

  if (!tauriInvoke) {
    console.error('[tauri-bridge] Tauri invoke API not found — running outside Tauri?')
  }

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

  const toCmd = ch => ch.replace(/-/g, '_')
  const unlistenMap = new Map()

  window.electronAPI = {
    async invoke(channel, payload) {
      if (!INVOKE_CH.has(channel)) throw new Error(`[bridge] blocked invoke: ${channel}`)
      if (!tauriInvoke) return
      // batch-convert passes a single `payload` param on the Rust side;
      // all other commands use flat parameter names matching the args keys.
      const args = channel === 'batch-convert' ? { payload } : (payload ?? {})
      return tauriInvoke(toCmd(channel), args)
    },

    on(channel, callback) {
      if (!ON_CH.has(channel)) throw new Error(`[bridge] blocked on: ${channel}`)
      if (!tauriListen) return
      tauriListen(channel, event => callback(null, event.payload)).then(unlisten => {
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

    getPathForFile: (file) => file?.path ?? ''
  }
})()
