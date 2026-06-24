// ─────────────────────────────────────────────
// UI Helpers — toast, modal, confetti
// ─────────────────────────────────────────────

// ── Toast ──
let _toastTimer = null
export function toast(msg, type = '') {
  const el = document.getElementById('toast')
  el.textContent = msg
  el.className = `show ${type}`
  clearTimeout(_toastTimer)
  _toastTimer = setTimeout(() => (el.className = ''), 3200)
}

// ── Modal ──
let _modalCb = null

export function openModal(title, msg, cb) {
  document.getElementById('modal-title').textContent = title
  document.getElementById('modal-msg').innerHTML = msg
  document.getElementById('modal-overlay').classList.add('open')
  _modalCb = cb
  document.getElementById('modal-ok').onclick = () => {
    closeModal()
    _modalCb?.()
  }
}

export function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open')
}

// ── Confetti ──
export function confetti() {
  const colors = ['#F2A614', '#25B056', '#EAF0F7', '#F8BC30', '#1A7A3C', '#009C3B', '#FFDF00']
  for (let i = 0; i < 90; i++) {
    const el = document.createElement('div')
    el.className = 'confetti-piece'
    el.style.left = Math.random() * 100 + 'vw'
    el.style.background = colors[Math.floor(Math.random() * colors.length)]
    el.style.borderRadius = Math.random() > 0.5 ? '50%' : '0'
    el.style.width = el.style.height = 7 + Math.random() * 9 + 'px'
    el.style.animationDuration = 2 + Math.random() * 3 + 's'
    el.style.animationDelay = Math.random() * 1.5 + 's'
    document.body.appendChild(el)
    setTimeout(() => el.remove(), 6000)
  }
}

// ── Loading placeholder ──
export function loadingHTML(msg = 'Carregando…') {
  return `<div class="loading"><div class="spinner"></div> ${msg}</div>`
}

export function emptyHTML(icon, msg) {
  return `<div class="empty-state"><div class="icon">${icon}</div><p>${msg}</p></div>`
}

// ── DB status dot ──
export function setDbStatus(ok) {
  document.getElementById('db-dot').className = 'db-dot ' + (ok ? 'ok' : 'err')
  document.getElementById('db-label').textContent = ok ? 'Banco conectado' : 'Sem conexão'
}
