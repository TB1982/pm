// OCR child process — spawned by main.js via child_process.fork()
// Uses standard process.send() / process.on('message') IPC

const { createWorker } = require('tesseract.js')

process.on('message', async ({ dataURL, cachePath }) => {
  try {
    const worker = await createWorker(['chi_tra', 'eng'], 1, {
      cachePath,
      logger: m => {
        process.send({
          type: 'progress',
          status: m.status,
          progress: m.progress || 0
        })
      }
    })

    const { data: { text } } = await worker.recognize(dataURL)
    await worker.terminate()
    process.send({ type: 'result', success: true, text: text.trim() })
  } catch (err) {
    process.send({ type: 'result', success: false, error: err.message })
  }
})
