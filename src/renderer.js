// Help modal
const helpBtn = document.getElementById('helpBtn')
const helpModal = document.getElementById('helpModal')
const modalClose = document.getElementById('modalClose')

helpBtn.addEventListener('click', () => {
  helpModal.classList.remove('hidden')
})

modalClose.addEventListener('click', () => {
  helpModal.classList.add('hidden')
})

helpModal.addEventListener('click', (e) => {
  if (e.target === helpModal) helpModal.classList.add('hidden')
})

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') helpModal.classList.add('hidden')
})

// Main screen buttons (placeholder handlers - features to be implemented)
document.getElementById('btnFullscreen').addEventListener('click', () => {
  console.log('TODO: fullscreen capture (S1)')
})

document.getElementById('btnWindow').addEventListener('click', () => {
  console.log('TODO: window capture (S1)')
})

document.getElementById('btnRect').addEventListener('click', () => {
  console.log('TODO: rectangle capture (S1)')
})

document.getElementById('btnWebCapture').addEventListener('click', () => {
  console.log('TODO: web capture (S2)')
})

document.getElementById('btnOpenImage').addEventListener('click', () => {
  console.log('TODO: open image')
})

