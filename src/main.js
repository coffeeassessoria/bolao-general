// ─────────────────────────────────────────────
// main.js — Entry point Bolão Copa 2026
// General Carros
// ─────────────────────────────────────────────

import { sb, isConfigured } from './supabase.js'
import { JOGOS_BRASIL } from './jogos.js'
import { calcPontos, ptsBadge } from './pontuacao.js'
import { toast, openModal, closeModal, confetti, loadingHTML, emptyHTML, setDbStatus } from './ui.js'

// Expõe funções usadas no HTML (onclick inline)
window.goPage              = goPage
window.updatePalpiteLabels = updatePalpiteLabels
window.salvarPalpite       = salvarPalpite
window.filtrarPalpites     = filtrarPalpites
window.loginAdm            = loginAdm
window.admTab              = admTab
window.salvarResultado     = salvarResultado
window.reabrirJogo         = reabrirJogo
window.verGanhador         = verGanhador
window.salvarGrupoLinha    = salvarGrupoLinha
window.closeModal          = closeModal
window.adjustScore         = adjustScore
window.saveNomeLocal       = saveNomeLocal
window.saveDeptLocal       = saveDeptLocal

const ADM_SENHA = 'generalcarros2026'
let admLogado = false

// ═══════════════ BOOT ═══════════════
window.addEventListener('DOMContentLoaded', async () => {
  if (!isConfigured()) {
    setDbStatus(false)
    document.getElementById('jogos-container').innerHTML =
      emptyHTML('⚠️', 'Variáveis de ambiente não configuradas. Crie o arquivo <code>.env</code> com as credenciais do Supabase.')
    return
  }
  try {
    await sb('jogos?limit=1')
    setDbStatus(true)
    await initApp()
  } catch (e) {
    setDbStatus(false)
    console.error('[Bolão] Falha na conexão:', e.message)
  }
})

async function initApp() {
  await Promise.all([renderTabela(), renderGrupo(), updateHeroStats()])
}

// ═══════════════ NAVEGAÇÃO ═══════════════
function goPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'))
  document.getElementById('page-' + id).classList.add('active')

  // top nav
  document.querySelectorAll('.top-nav button').forEach(b =>
    b.classList.toggle('active', b.getAttribute('onclick')?.includes(`'${id}'`))
  )
  // bottom nav
  document.querySelectorAll('.bnav-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.page === id)
  )

  if (id === 'tabela')   { renderTabela(); renderGrupo(); updateHeroStats() }
  if (id === 'palpitar') { renderPalpitarSelect(); preencherNomeSalvo() }
  if (id === 'ranking')  renderRanking()
  if (id === 'meus')     { document.getElementById('meus-palpites-list').innerHTML = ''; preencherFiltroNome() }
  if (id === 'adm' && admLogado) renderAdmPanel()

  // scroll to top on page change
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// ═══════════════ SCORE STEPPER ═══════════════
function adjustScore(inputId, delta) {
  const el  = document.getElementById(inputId)
  const val = parseInt(el.value) || 0
  const next = Math.max(0, Math.min(20, val + delta))
  el.value = next
}

// ═══════════════ LOCALSTORAGE (nome / dept) ═══════════════
function saveNomeLocal() {
  const v = document.getElementById('p-nome').value
  if (v.trim()) localStorage.setItem('bolao_nome', v.trim())
}
function saveDeptLocal() {
  const v = document.getElementById('p-dept').value
  if (v.trim()) localStorage.setItem('bolao_dept', v.trim())
}

function preencherNomeSalvo() {
  const nome = localStorage.getItem('bolao_nome')
  const dept = localStorage.getItem('bolao_dept')
  const elNome = document.getElementById('p-nome')
  const elDept = document.getElementById('p-dept')
  if (nome && !elNome.value) elNome.value = nome
  if (dept && !elDept.value) elDept.value = dept
}

function preencherFiltroNome() {
  const nome = localStorage.getItem('bolao_nome')
  const el   = document.getElementById('filtro-nome')
  if (nome && !el.value) el.value = nome
}

// ═══════════════ HERO STATS ═══════════════
async function updateHeroStats() {
  try {
    const [palpites, jogos] = await Promise.all([
      sb('palpites?select=nome'),
      sb('jogos?select=status'),
    ])
    const nomes = [...new Set(palpites.map(p => p.nome))]
    const enc   = jogos.filter(j => j.status === 'encerrado').length
    document.getElementById('stat-palpites').textContent      = palpites.length
    document.getElementById('stat-participantes').textContent = nomes.length
    document.getElementById('stat-premio').textContent        = 'R$' + (palpites.length * 10).toLocaleString('pt-BR')
    document.getElementById('stat-enc').textContent           = `${enc}/3`
  } catch (e) {
    console.warn('[stats]', e.message)
  }
}

// ═══════════════ TABELA DE JOGOS ═══════════════
async function renderTabela() {
  const el = document.getElementById('jogos-container')
  el.innerHTML = loadingHTML('Carregando jogos…')
  try {
    const dbJogos = await sb('jogos?order=id')
    const dbMap   = Object.fromEntries(dbJogos.map(j => [j.jogo_id, j]))

    let faseAtual = ''
    let html = ''
    JOGOS_BRASIL.forEach(j => {
      const db  = dbMap[j.id] || {}
      const enc = db.status === 'encerrado'
      if (j.fase !== faseAtual) {
        faseAtual = j.fase
        html += `<div class="fase-header">${j.fase}</div>`
      }
      html += `
        <div class="jogo-row ${enc ? 'encerrado' : 'agendado'}">
          <div class="team-block">
            <div class="team-flag">${j.time1.flag}</div>
            <div class="team-name ${j.time1.brasil ? 'brasil' : ''}">${j.time1.nome}</div>
          </div>
          <div class="placar-center">
            <div class="placar-num ${enc ? '' : 'pending'}">${enc ? `${db.gols1} × ${db.gols2}` : '×'}</div>
            <div class="jogo-data">${j.data} · ${j.horario}</div>
            <div class="jogo-local">${j.local}</div>
            <span class="badge ${enc ? 'badge-green' : 'badge-dim'}">${enc ? 'Encerrado' : 'Agendado'}</span>
          </div>
          <div class="team-block">
            <div class="team-flag">${j.time2.flag}</div>
            <div class="team-name ${j.time2.brasil ? 'brasil' : ''}">${j.time2.nome}</div>
          </div>
        </div>`
    })
    el.innerHTML = html
  } catch (e) {
    el.innerHTML = emptyHTML('⚠️', `Erro ao carregar jogos: ${e.message}`)
  }
}

// ═══════════════ CLASSIFICAÇÃO GRUPO C ═══════════════
async function renderGrupo() {
  const el = document.getElementById('tabela-grupo')
  try {
    const rows = await sb('grupo_c?order=pts.desc,sg.desc,gp.desc')
    let html = `<thead><tr>
      <th style="text-align:left;">Seleção</th>
      <th>J</th><th>V</th><th>E</th><th>D</th><th>GP</th><th>GC</th><th>SG</th><th>PTS</th>
    </tr></thead><tbody>`
    rows.forEach((s, i) => {
      const isBr = s.pais.includes('Brasil')
      html += `<tr ${isBr ? 'class="brasil-row"' : ''}>
        <td>${i < 3 ? '✅ ' : '❌ '}${s.pais}</td>
        <td>${s.j}</td><td>${s.v}</td><td>${s.e}</td><td>${s.d}</td>
        <td>${s.gp}</td><td>${s.gc}</td>
        <td>${s.sg > 0 ? '+' + s.sg : s.sg}</td>
        <td class="pts-cell">${s.pts}</td>
      </tr>`
    })
    el.innerHTML = html + '</tbody>'
  } catch (e) {
    el.innerHTML = `<tr><td style="color:var(--text-muted);font-size:13px;">Erro ao carregar: ${e.message}</td></tr>`
  }
}

// ═══════════════ PALPITAR ═══════════════
async function renderPalpitarSelect() {
  const sel = document.getElementById('p-jogo')
  sel.innerHTML = '<option>Carregando…</option>'
  try {
    const dbJogos = await sb('jogos?select=jogo_id,status')
    const dbMap   = Object.fromEntries(dbJogos.map(j => [j.jogo_id, j]))
    const disp    = JOGOS_BRASIL.filter(j => dbMap[j.id]?.status !== 'encerrado')

    if (!disp.length) {
      sel.innerHTML = '<option>Nenhum jogo disponível</option>'
      return
    }
    sel.innerHTML = ''
    disp.forEach(j => {
      const opt = document.createElement('option')
      opt.value = j.id
      opt.textContent = `${j.data} — ${j.time1.nome} × ${j.time2.nome}`
      sel.appendChild(opt)
    })
    updatePalpiteLabels()
  } catch (e) {
    sel.innerHTML = '<option>Erro ao carregar</option>'
  }
}

function updatePalpiteLabels() {
  const jogoId = document.getElementById('p-jogo').value
  const j = JOGOS_BRASIL.find(x => x.id === jogoId)
  if (!j) return
  document.getElementById('p-flag1').textContent  = j.time1.flag
  document.getElementById('p-label1').textContent = j.time1.nome
  document.getElementById('p-flag2').textContent  = j.time2.flag
  document.getElementById('p-label2').textContent = j.time2.nome
  // reset placar ao trocar jogo
  document.getElementById('p-gols1').value = 0
  document.getElementById('p-gols2').value = 0
}

async function salvarPalpite() {
  const nome   = document.getElementById('p-nome').value.trim()
  const dept   = document.getElementById('p-dept').value.trim()
  const jogoId = document.getElementById('p-jogo').value
  const g1     = parseInt(document.getElementById('p-gols1').value)
  const g2     = parseInt(document.getElementById('p-gols2').value)

  if (!nome)              { toast('Informe seu nome.', 'error'); return }
  if (!jogoId || jogoId === 'Carregando…' || jogoId === 'Nenhum jogo disponível') {
    toast('Selecione um jogo.', 'error'); return
  }
  if (isNaN(g1) || isNaN(g2)) { toast('Preencha o placar.', 'error'); return }

  // Checar status no banco
  const [dbJogo] = await sb(`jogos?jogo_id=eq.${jogoId}&select=status`)
  if (dbJogo?.status === 'encerrado') { toast('Jogo já encerrado.', 'error'); return }

  const j          = JOGOS_BRASIL.find(x => x.id === jogoId)
  const anteriores = await sb(`palpites?nome=ilike.${encodeURIComponent(nome)}&jogo_id=eq.${jogoId}&select=id`)
  const jaExiste   = anteriores.length > 0

  const todosAntes = await sb(`palpites?nome=ilike.${encodeURIComponent(nome)}&select=id`)
  const qtd        = todosAntes.length
  const valor      = (qtd + 1) * 10

  const avisoExtra = jaExiste
    ? `<br><br>⚠️ Você já tem um palpite para este jogo. Um novo palpite será adicionado.`
    : ''

  openModal(
    'Confirmar Palpite',
    `Você já tem <strong>${qtd} palpite(s)</strong>. Este será o <strong>${qtd + 1}º</strong>,
     totalizando <strong>R$${valor},00</strong>.
     ${avisoExtra}<br><br>
     Palpite: <strong>${j.time1.flag} ${j.time1.nome} ${g1} × ${g2} ${j.time2.nome} ${j.time2.flag}</strong><br><br>
     Uma vez salvo, <strong>não poderá ser alterado</strong>.`,
    async () => {
      const btn = document.getElementById('btn-salvar-palpite')
      btn.disabled = true
      try {
        await sb('palpites', {
          method: 'POST',
          body: { nome, dept: dept || '—', jogo_id: jogoId, gols1: g1, gols2: g2 },
          prefer: 'return=minimal',
        })
        // persiste nome/dept localmente para próximas visitas
        localStorage.setItem('bolao_nome', nome)
        if (dept) localStorage.setItem('bolao_dept', dept)

        toast('✅ Palpite salvo!', 'success')
        document.getElementById('p-gols1').value = 0
        document.getElementById('p-gols2').value = 0
        await updateHeroStats()
      } catch (e) {
        toast('Erro ao salvar: ' + e.message, 'error')
      } finally {
        btn.disabled = false
      }
    }
  )
}

// ═══════════════ MEUS PALPITES ═══════════════
async function filtrarPalpites() {
  const nome = document.getElementById('filtro-nome').value.trim()
  if (!nome) { toast('Digite seu nome.', 'error'); return }

  const el = document.getElementById('meus-palpites-list')
  el.innerHTML = loadingHTML('Buscando…')

  try {
    const [palpites, dbJogos] = await Promise.all([
      // ilike = case-insensitive, sem wildcards faz match exato
      sb(`palpites?nome=ilike.${encodeURIComponent(nome)}&order=created_at.asc`),
      sb('jogos?select=jogo_id,status,gols1,gols2'),
    ])
    const dbMap = Object.fromEntries(dbJogos.map(j => [j.jogo_id, j]))

    if (!palpites.length) {
      el.innerHTML = emptyHTML('🔍', `Nenhum palpite para "<strong>${nome}</strong>".`)
      return
    }

    // persiste nome para reuso
    localStorage.setItem('bolao_nome', palpites[0].nome)

    let totalPts = 0
    let html = `<div style="margin-bottom:12px;color:var(--text-dim);font-size:13px;">
      ${palpites.length} palpite(s) · investimento: <strong style="color:var(--gold);">R$${palpites.length * 10},00</strong>
    </div><div style="display:grid;gap:8px;">`

    palpites.forEach(p => {
      const j   = JOGOS_BRASIL.find(x => x.id === p.jogo_id)
      const db  = dbMap[p.jogo_id] || {}
      const enc = db.status === 'encerrado'
      let ptsHtml = `<span class="badge badge-dim">Aguardando</span>`

      if (enc) {
        const pts = calcPontos(p.gols1, p.gols2, db.gols1, db.gols2)
        totalPts += pts
        ptsHtml   = ptsBadge(pts)
      }

      html += `<div class="palpite-card">
        <div class="palpite-jogo">
          ${j ? `${j.time1.flag} ${j.time1.nome} × ${j.time2.nome} ${j.time2.flag}` : p.jogo_id}<br>
          <span style="font-size:11px;color:var(--text-muted);">${j ? `${j.data} · ${j.fase}` : ''}</span>
        </div>
        <div class="palpite-result-display">${p.gols1} × ${p.gols2}</div>
        ${ptsHtml}
      </div>`
    })

    html += `</div><div class="info-box" style="margin-top:14px;">Total acumulado: <strong>${totalPts} pts</strong></div>`
    el.innerHTML = html
  } catch (e) {
    el.innerHTML = emptyHTML('⚠️', e.message)
  }
}

// ═══════════════ RANKING ═══════════════
async function renderRanking() {
  const el = document.getElementById('ranking-list')
  el.innerHTML = loadingHTML('Calculando ranking…')

  try {
    const [palpites, dbJogos] = await Promise.all([
      sb('palpites?order=created_at.asc'),
      sb('jogos?select=jogo_id,status,gols1,gols2'),
    ])
    const dbMap = Object.fromEntries(dbJogos.map(j => [j.jogo_id, j]))

    const map = {}
    palpites.forEach(p => {
      // agrupa por nome normalizado (lowercase) para evitar duplicatas de case
      const key = p.nome.toLowerCase()
      if (!map[key]) map[key] = { nome: p.nome, dept: p.dept, total: 0, palpites: 0, exatos: 0 }
      map[key].palpites++
      const db = dbMap[p.jogo_id]
      if (db?.status === 'encerrado') {
        const pts = calcPontos(p.gols1, p.gols2, db.gols1, db.gols2)
        map[key].total += pts
        if (pts === 3) map[key].exatos++
      }
    })

    const ranking = Object.values(map).sort((a, b) => b.total - a.total || b.exatos - a.exatos)
    if (!ranking.length) {
      el.innerHTML = emptyHTML('📊', 'Nenhum palpite ainda.')
      return
    }

    const cls = i => ['gold', 'silver', 'bronze'][i] ?? ''
    el.innerHTML = ranking.map((r, i) => `
      <div class="ranking-row">
        <div class="ranking-pos ${cls(i)}">${i + 1}</div>
        <div>
          <div class="ranking-name">${r.nome}</div>
          <div class="ranking-dept">${r.dept}</div>
        </div>
        <div class="ranking-col">${r.palpites}</div>
        <div class="ranking-col" style="color:var(--gold);font-weight:700;font-size:17px;">${r.total}</div>
        <div class="ranking-col">⭐ ${r.exatos}</div>
      </div>`).join('')

    document.getElementById('winner-section').innerHTML = ''
  } catch (e) {
    el.innerHTML = emptyHTML('⚠️', e.message)
  }
}

// ═══════════════ ADM ═══════════════
function loginAdm() {
  if (document.getElementById('adm-senha').value !== ADM_SENHA) {
    toast('Senha incorreta.', 'error')
    return
  }
  admLogado = true
  document.getElementById('adm-login-box').style.display = 'none'
  document.getElementById('adm-panel').style.display = 'block'
  renderAdmPanel()
  toast('✅ ADM liberado.', 'success')
}

function admTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b =>
    b.classList.toggle('active', b.getAttribute('onclick')?.includes(`'${tab}'`))
  )
  ;['resultados', 'palpites', 'grupo'].forEach(t => {
    document.getElementById('adm-' + t).style.display = t === tab ? 'block' : 'none'
  })
  if (tab === 'palpites') renderAdmPalpites()
  if (tab === 'grupo')    renderAdmGrupo()
}

function renderAdmPanel() { renderAdmResultados() }

async function renderAdmResultados() {
  const el = document.getElementById('adm-resultados')
  el.innerHTML = loadingHTML()
  try {
    const dbJogos = await sb('jogos?order=id')
    const dbMap   = Object.fromEntries(dbJogos.map(j => [j.jogo_id, j]))

    el.innerHTML = JOGOS_BRASIL.map(j => {
      const db  = dbMap[j.id] || {}
      const enc = db.status === 'encerrado'
      return `<div class="adm-game-row">
        <div class="adm-game-info">
          <div class="adm-game-teams">${j.time1.flag} ${j.time1.nome} × ${j.time2.nome} ${j.time2.flag}</div>
          <span class="badge ${enc ? 'badge-green' : 'badge-dim'}">${enc ? 'Encerrado' : 'Agendado'}</span>
          <span style="font-size:12px;color:var(--text-muted);">${j.data} · ${j.fase}</span>
        </div>
        <div class="adm-score-row">
          <span>${j.time1.flag}</span>
          <input type="number" id="adm-g1-${j.id}" value="${db.gols1 ?? 0}" min="0" max="30">
          <span style="font-family:'Barlow Condensed';font-size:20px;color:var(--text-muted);">×</span>
          <input type="number" id="adm-g2-${j.id}" value="${db.gols2 ?? 0}" min="0" max="30">
          <span>${j.time2.flag}</span>
        </div>
        <div class="adm-actions">
          <button class="btn btn-green"  onclick="salvarResultado('${j.id}')">💾 Salvar Resultado</button>
          <button class="btn btn-primary" onclick="verGanhador('${j.id}')">🏆 Ver Ganhador</button>
          ${enc ? `<button class="btn btn-ghost" onclick="reabrirJogo('${j.id}')">↩ Reabrir</button>` : ''}
        </div>
      </div>`
    }).join('')
  } catch (e) {
    el.innerHTML = emptyHTML('⚠️', e.message)
  }
}

async function salvarResultado(jogoId) {
  const g1 = parseInt(document.getElementById(`adm-g1-${jogoId}`).value)
  const g2 = parseInt(document.getElementById(`adm-g2-${jogoId}`).value)
  try {
    await sb(`jogos?jogo_id=eq.${jogoId}`, {
      method: 'PATCH',
      body: { gols1: g1, gols2: g2, status: 'encerrado' },
      prefer: 'return=minimal',
    })
    toast('✅ Resultado salvo!', 'success')
    await renderAdmResultados()
    await updateHeroStats()
  } catch (e) {
    toast('Erro: ' + e.message, 'error')
  }
}

async function reabrirJogo(jogoId) {
  try {
    await sb(`jogos?jogo_id=eq.${jogoId}`, {
      method: 'PATCH',
      body: { status: 'agendado', gols1: null, gols2: null },
      prefer: 'return=minimal',
    })
    toast('Jogo reaberto.', 'success')
    await renderAdmResultados()
  } catch (e) {
    toast('Erro: ' + e.message, 'error')
  }
}

async function verGanhador(jogoId) {
  try {
    const [[db], palpites] = await Promise.all([
      sb(`jogos?jogo_id=eq.${jogoId}`),
      sb(`palpites?jogo_id=eq.${jogoId}`),
    ])
    if (!db || db.status !== 'encerrado') { toast('Salve o resultado primeiro.', 'error'); return }

    const j      = JOGOS_BRASIL.find(x => x.id === jogoId)
    const exatos = palpites.filter(p => p.gols1 === db.gols1 && p.gols2 === db.gols2)
    const ws     = document.getElementById('winner-section')

    if (exatos.length) {
      ws.innerHTML = `<div class="winner-banner">
        <span class="winner-banner-icon">🏆</span>
        <div class="winner-name">${exatos.map(p => p.nome).join(' & ')}</div>
        <p style="margin-top:10px;color:var(--text-dim);">Acertou o placar exato:
          <strong>${j.time1.flag} ${db.gols1} × ${db.gols2} ${j.time2.flag}</strong>
        </p>
      </div>`
      confetti()
    } else {
      const resJogo = db.gols1 > db.gols2 ? 'h' : db.gols1 < db.gols2 ? 'a' : 'd'
      const venc    = palpites.filter(p => {
        const rp = p.gols1 > p.gols2 ? 'h' : p.gols1 < p.gols2 ? 'a' : 'd'
        return rp === resJogo
      })
      if (venc.length) {
        ws.innerHTML = `<div class="winner-banner" style="border-color:var(--green-bright);">
          <span class="winner-banner-icon">🥈</span>
          <div class="winner-name" style="color:var(--green-bright);">${venc.map(p => p.nome).join(', ')}</div>
          <p style="margin-top:10px;color:var(--text-dim);">Acertou o vencedor. Placar real: <strong>${db.gols1} × ${db.gols2}</strong></p>
        </div>`
      } else {
        ws.innerHTML = `<div class="winner-banner" style="border-color:var(--border);">
          <span class="winner-banner-icon">😅</span>
          <div class="winner-name" style="color:var(--text-dim);font-size:24px;">Ninguém acertou</div>
          <p style="margin-top:10px;color:var(--text-muted);">Placar real: <strong>${db.gols1} × ${db.gols2}</strong></p>
        </div>`
      }
    }
    ws.scrollIntoView({ behavior: 'smooth', block: 'center' })
  } catch (e) {
    toast('Erro: ' + e.message, 'error')
  }
}

async function renderAdmPalpites() {
  const el = document.getElementById('adm-palpites')
  el.innerHTML = loadingHTML()
  try {
    const [palpites, dbJogos] = await Promise.all([
      sb('palpites?order=created_at.desc'),
      sb('jogos?select=jogo_id,status,gols1,gols2'),
    ])
    const dbMap = Object.fromEntries(dbJogos.map(j => [j.jogo_id, j]))

    if (!palpites.length) { el.innerHTML = emptyHTML('📋', 'Nenhum palpite.'); return }

    let html = `<div style="color:var(--text-dim);font-size:13px;margin-bottom:14px;">
      ${palpites.length} palpite(s) · R$${palpites.length * 10},00 de premiação acumulada
    </div><div style="display:grid;gap:8px;">`

    palpites.forEach(p => {
      const j   = JOGOS_BRASIL.find(x => x.id === p.jogo_id)
      const db  = dbMap[p.jogo_id] || {}
      const enc = db.status === 'encerrado'
      const pts = enc ? calcPontos(p.gols1, p.gols2, db.gols1, db.gols2) : null

      html += `<div class="palpite-card">
        <div class="palpite-user">${p.nome} <span style="font-size:11px;color:var(--text-muted);">${p.dept}</span></div>
        <div class="palpite-jogo">
          ${j ? `${j.time1.flag} ${j.time1.nome} × ${j.time2.nome} ${j.time2.flag}` : p.jogo_id}<br>
          <span style="font-size:11px;color:var(--text-muted);">${new Date(p.created_at).toLocaleString('pt-BR')}</span>
        </div>
        <div class="palpite-result-display">${p.gols1} × ${p.gols2}</div>
        ${pts !== null ? ptsBadge(pts) : '<span class="badge badge-dim">Pendente</span>'}
      </div>`
    })

    el.innerHTML = html + '</div>'
  } catch (e) {
    el.innerHTML = emptyHTML('⚠️', e.message)
  }
}

async function renderAdmGrupo() {
  const el = document.getElementById('adm-grupo')
  el.innerHTML = loadingHTML()
  try {
    const rows = await sb('grupo_c?order=pts.desc')
    let html = `<div class="info-box" style="margin-bottom:16px;">Atualize a classificação do Grupo C conforme os jogos acontecem.</div>`
    rows.forEach(s => {
      html += `<div class="adm-game-row" style="margin-bottom:8px;">
        <div style="font-weight:700;margin-bottom:10px;">${s.pais}</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;">
          ${['j','v','e','d','gp','gc','pts'].map(k => `
            <div>
              <label style="font-size:10px;display:block;margin-bottom:3px;color:var(--text-muted);">${k.toUpperCase()}</label>
              <input type="number" value="${s[k]}" style="width:56px;text-align:center;" id="gc-${s.id}-${k}">
            </div>`).join('')}
          <button class="btn btn-green" style="height:40px;" onclick="salvarGrupoLinha(${s.id}, '${s.pais}')">Salvar</button>
        </div>
      </div>`
    })
    el.innerHTML = html
  } catch (e) {
    el.innerHTML = emptyHTML('⚠️', e.message)
  }
}

async function salvarGrupoLinha(id, pais) {
  const vals = {}
  ;['j','v','e','d','gp','gc','pts'].forEach(k => {
    vals[k] = parseInt(document.getElementById(`gc-${id}-${k}`).value) || 0
  })
  vals.sg = vals.gp - vals.gc
  try {
    await sb(`grupo_c?id=eq.${id}`, { method: 'PATCH', body: vals, prefer: 'return=minimal' })
    toast(`✅ ${pais} atualizado!`, 'success')
    renderGrupo()
  } catch (e) {
    toast('Erro: ' + e.message, 'error')
  }
}
