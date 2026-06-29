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
window.saveCelularLocal    = saveCelularLocal
window.renderPainel        = renderPainel
window.renderAdmPalpites   = renderAdmPalpites
window.admAdicionarPalpite = admAdicionarPalpite
window.admIniciarEdicao    = admIniciarEdicao
window.admSalvarEdicao     = admSalvarEdicao
window.admExcluirPalpite   = admExcluirPalpite
window.admTogglePago       = admTogglePago
window.copiarPix           = copiarPix
window.openMenu            = openMenu
window.closeMenu           = closeMenu
window.salvarAdversario    = salvarAdversario
window.iniciarJogo         = iniciarJogo

const ADM_SENHA = 'generalcarros2026'
let admLogado   = false
let _dbJogosMap = {}   // cache dos dados de jogos do banco

// retorna os dados do time2 com override do banco (para adversários das fases finais)
function jogoTime2(j) {
  const db = _dbJogosMap[j.id] || {}
  return {
    nome: db.time2_nome || j.time2.nome,
    flag: db.time2_flag || j.time2.flag,
  }
}

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

// ═══════════════ MENU HAMBÚRGUER ═══════════════
function openMenu() {
  document.getElementById('drawer').classList.add('open')
  document.getElementById('drawer-overlay').classList.add('open')
  document.body.style.overflow = 'hidden'
}

function closeMenu() {
  document.getElementById('drawer').classList.remove('open')
  document.getElementById('drawer-overlay').classList.remove('open')
  document.body.style.overflow = ''
}

// ═══════════════ NAVEGAÇÃO ═══════════════
function goPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'))
  document.getElementById('page-' + id).classList.add('active')

  // top nav (desktop)
  document.querySelectorAll('.top-nav button').forEach(b =>
    b.classList.toggle('active', b.getAttribute('onclick')?.includes(`'${id}'`))
  )
  // drawer nav (mobile)
  document.querySelectorAll('.drawer-item').forEach(b =>
    b.classList.toggle('active', b.dataset.page === id)
  )

  closeMenu()

  if (id === 'tabela')   { renderTabela(); renderGrupo(); updateHeroStats() }
  if (id === 'palpitar') { renderPalpitarSelect(); preencherDadosSalvos() }
  if (id === 'ranking')  renderRanking()
  if (id === 'meus')     { renderPainel(); preencherFiltroCelular() }
  if (id === 'adm' && admLogado) renderAdmPanel()

  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// ═══════════════ SCORE STEPPER ═══════════════
function adjustScore(inputId, delta) {
  const el  = document.getElementById(inputId)
  const val = parseInt(el.value) || 0
  const next = Math.max(0, Math.min(20, val + delta))
  el.value = next
}

// ═══════════════ LOCALSTORAGE ═══════════════
function saveNomeLocal() {
  const v = document.getElementById('p-nome').value
  if (v.trim()) localStorage.setItem('bolao_nome', v.trim())
}
function saveDeptLocal() {
  const v = document.getElementById('p-dept').value
  if (v.trim()) localStorage.setItem('bolao_dept', v.trim())
}
function saveCelularLocal() {
  const v = document.getElementById('p-celular').value.replace(/\D/g, '')
  if (v.length === 11) localStorage.setItem('bolao_celular', v)
}

function preencherDadosSalvos() {
  const nome    = localStorage.getItem('bolao_nome')
  const dept    = localStorage.getItem('bolao_dept')
  const celular = localStorage.getItem('bolao_celular')
  const elNome    = document.getElementById('p-nome')
  const elDept    = document.getElementById('p-dept')
  const elCelular = document.getElementById('p-celular')
  if (nome    && !elNome.value)    elNome.value    = nome
  if (dept    && !elDept.value)    elDept.value    = dept
  if (celular && !elCelular.value) elCelular.value = celular
}

function copiarPix() {
  navigator.clipboard.writeText('contato@coffeeassessoria.com.br')
    .then(() => toast('✅ Chave PIX copiada!', 'success'))
    .catch(() => toast('contato@coffeeassessoria.com.br', ''))
}

function preencherFiltroCelular() {
  const celular = localStorage.getItem('bolao_celular')
  const el      = document.getElementById('filtro-celular')
  if (celular && !el.value) el.value = celular
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
    _dbJogosMap   = dbMap

    let faseAtual = ''
    let html = ''
    JOGOS_BRASIL.forEach(j => {
      const db   = dbMap[j.id] || {}
      const enc  = db.status === 'encerrado'
      const live = db.status === 'em_andamento'
      const adv  = jogoTime2(j)
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
            <span class="badge ${enc ? 'badge-green' : live ? 'badge-live' : 'badge-dim'}">${enc ? 'Encerrado' : live ? '🔴 Em andamento' : 'Agendado'}</span>
          </div>
          <div class="team-block">
            <div class="team-flag">${adv.flag}</div>
            <div class="team-name ${j.time2.brasil ? 'brasil' : ''}">${adv.nome}</div>
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
  const sel   = document.getElementById('p-jogo')
  const retry = document.getElementById('palpitar-retry')
  sel.innerHTML = '<option>Carregando…</option>'
  if (retry) retry.style.display = 'none'
  try {
    const dbJogos = await sb('jogos?select=jogo_id,status')
    const rows    = Array.isArray(dbJogos) ? dbJogos : []
    const dbMap   = Object.fromEntries(rows.map(j => [j.jogo_id, j]))
    Object.entries(dbMap).forEach(([k, v]) => {
      _dbJogosMap[k] = { ...(_dbJogosMap[k] || {}), ...v }
    })
    const disp = JOGOS_BRASIL.filter(j => !['encerrado','em_andamento'].includes(dbMap[j.id]?.status))

    if (!disp.length) {
      sel.innerHTML = '<option>Nenhum jogo disponível no momento</option>'
      return
    }
    sel.innerHTML = ''
    disp.forEach(j => {
      const adv = jogoTime2(j)
      const opt = document.createElement('option')
      opt.value = j.id
      opt.textContent = `${j.data} — ${j.time1.nome} × ${adv.nome}`
      sel.appendChild(opt)
    })
    updatePalpiteLabels()
  } catch (e) {
    console.error('[Bolão] renderPalpitarSelect falhou:', e.message)
    sel.innerHTML = '<option>— Selecione um jogo —</option>'
    if (retry) retry.style.display = 'block'
    toast('Erro ao carregar jogos. Tente novamente.', 'error')
  }
}

function updatePalpiteLabels() {
  const jogoId = document.getElementById('p-jogo').value
  const j = JOGOS_BRASIL.find(x => x.id === jogoId)
  if (!j) return
  const adv = jogoTime2(j)
  document.getElementById('p-flag1').textContent  = j.time1.flag
  document.getElementById('p-label1').textContent = j.time1.nome
  document.getElementById('p-flag2').textContent  = adv.flag
  document.getElementById('p-label2').textContent = adv.nome
  document.getElementById('p-gols1').value = 0
  document.getElementById('p-gols2').value = 0
}

async function salvarPalpite() {
  const nome    = document.getElementById('p-nome').value.trim()
  const celular = document.getElementById('p-celular').value.replace(/\D/g, '')
  const dept    = document.getElementById('p-dept').value.trim()
  const jogoId  = document.getElementById('p-jogo').value
  const g1      = parseInt(document.getElementById('p-gols1').value)
  const g2      = parseInt(document.getElementById('p-gols2').value)

  if (!nome) { toast('Informe seu nome.', 'error'); return }
  if (!/^\d{11}$/.test(celular)) {
    toast('Celular inválido. Use DDD + 9 dígitos, ex: 66999812901', 'error'); return
  }
  if (!jogoId || jogoId === 'Carregando…' || jogoId === 'Nenhum jogo disponível') {
    toast('Selecione um jogo.', 'error'); return
  }
  if (isNaN(g1) || isNaN(g2)) { toast('Preencha o placar.', 'error'); return }

  const [dbJogo] = await sb(`jogos?jogo_id=eq.${jogoId}&select=status`)
  if (dbJogo?.status === 'encerrado')    { toast('Jogo já encerrado.', 'error'); return }
  if (dbJogo?.status === 'em_andamento') { toast('Este jogo já começou. Palpites encerrados.', 'error'); return }

  const j = JOGOS_BRASIL.find(x => x.id === jogoId)

  // usa celular como chave para contar palpites deste participante
  const [anterioresJogo, todosAntes] = await Promise.all([
    sb(`palpites?celular=eq.${celular}&jogo_id=eq.${jogoId}&select=id`),
    sb(`palpites?celular=eq.${celular}&select=id`),
  ])
  const jaExiste = anterioresJogo.length > 0
  const qtd      = todosAntes.length
  const valor    = (qtd + 1) * 10

  const avisoExtra = jaExiste
    ? `<br><br>⚠️ Você já tem um palpite para este jogo. Um novo será adicionado.`
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
          body: { nome, celular, dept: dept || '—', jogo_id: jogoId, gols1: g1, gols2: g2 },
          prefer: 'return=minimal',
        })
        localStorage.setItem('bolao_nome', nome)
        localStorage.setItem('bolao_celular', celular)
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

// ═══════════════ PAINEL (todos os palpites) ═══════════════
async function renderPainel() {
  const el = document.getElementById('meus-palpites-list')
  el.innerHTML = loadingHTML('Carregando painel…')
  try {
    const [palpites, dbJogos] = await Promise.all([
      sb('palpites?order=created_at.desc'),
      sb('jogos?select=jogo_id,status,gols1,gols2'),
    ])
    const dbMap = Object.fromEntries(dbJogos.map(j => [j.jogo_id, j]))

    // apenas palpites de jogos já iniciados ficam visíveis no painel público
    const visiveis   = palpites.filter(p => ['encerrado','em_andamento'].includes(dbMap[p.jogo_id]?.status))
    const bloqueados = palpites.length - visiveis.length

    if (!palpites.length) {
      el.innerHTML = emptyHTML('📋', 'Nenhum palpite registrado ainda.')
      return
    }

    let html = `<div class="painel-total">
      ${visiveis.length} palpite${visiveis.length !== 1 ? 's' : ''} visível${visiveis.length !== 1 ? 'is' : ''}
      ${bloqueados > 0 ? `· <span style="color:var(--text-muted);">🔒 ${bloqueados} oculto${bloqueados > 1 ? 's' : ''} até o início do jogo</span>` : ''}
    </div>`

    if (!visiveis.length) {
      html += `<div class="info-box" style="text-align:center;padding:24px;">
        🔒 <strong>Os palpites serão revelados quando o jogo começar.</strong><br>
        <span style="font-size:12px;color:var(--text-muted);margin-top:6px;display:block;">Nenhum jogo iniciado ainda.</span>
      </div>`
      el.innerHTML = html
      return
    }

    html += `<div style="display:grid;gap:8px;">`
    visiveis.forEach(p => {
      const j   = JOGOS_BRASIL.find(x => x.id === p.jogo_id)
      const db  = dbMap[p.jogo_id] || {}
      const enc = db.status === 'encerrado'
      const adv = jogoTime2(j || { id: p.jogo_id, time2: { nome: p.jogo_id, flag: '' } })
      let statusHtml = `<span class="badge badge-live">🔴 Em jogo</span>`
      if (enc) {
        const exato = p.gols1 === db.gols1 && p.gols2 === db.gols2
        statusHtml = exato
          ? `<span class="badge badge-gold">🏆 Acertou!</span>`
          : `<span class="badge" style="background:rgba(192,57,43,.12);color:#e74c3c;">Errou</span>`
      }
      html += `<div class="painel-card">
        <div class="painel-card-info">
          <div class="painel-card-nome">${p.nome}</div>
          <div class="painel-card-meta">${p.dept} · ${j ? `${j.time1.flag} ${j.time1.nome} × ${adv.nome} ${adv.flag}` : p.jogo_id}</div>
        </div>
        <div class="painel-card-right">
          <div class="painel-card-score">${p.gols1} × ${p.gols2}</div>
          ${statusHtml}
        </div>
      </div>`
    })
    el.innerHTML = html + '</div>'
  } catch (e) {
    el.innerHTML = emptyHTML('⚠️', e.message)
  }
}

// ═══════════════ MEUS PALPITES (filtro por celular) ═══════════════
async function filtrarPalpites() {
  const celular = document.getElementById('filtro-celular').value.replace(/\D/g, '')
  if (!/^\d{11}$/.test(celular)) {
    toast('Digite o celular com DDD (11 dígitos), ex: 66999812901', 'error'); return
  }

  const el = document.getElementById('meus-palpites-list')
  el.innerHTML = loadingHTML('Buscando seus palpites…')

  try {
    const [palpites, dbJogos] = await Promise.all([
      sb(`palpites?celular=eq.${celular}&order=created_at.asc`),
      sb('jogos?select=jogo_id,status,gols1,gols2'),
    ])
    const dbMap = Object.fromEntries(dbJogos.map(j => [j.jogo_id, j]))

    if (!palpites.length) {
      el.innerHTML = emptyHTML('🔍', 'Nenhum palpite encontrado para este celular.')
      return
    }

    localStorage.setItem('bolao_celular', celular)
    if (palpites[0].nome) localStorage.setItem('bolao_nome', palpites[0].nome)

    let html = `<div class="painel-total">
      <strong>${palpites[0].nome}</strong> · ${palpites.length} palpite${palpites.length > 1 ? 's' : ''}
      · <span style="color:var(--gold);">R$${palpites.length * 10},00 investido${palpites.length > 1 ? 's' : ''}</span>
    </div><div style="display:grid;gap:8px;">`

    palpites.forEach(p => {
      const j   = JOGOS_BRASIL.find(x => x.id === p.jogo_id)
      const db  = dbMap[p.jogo_id] || {}
      const enc = db.status === 'encerrado'
      let statusHtml = `<span class="badge badge-dim">Aguardando</span>`
      if (enc) {
        const exato = p.gols1 === db.gols1 && p.gols2 === db.gols2
        statusHtml = exato
          ? `<span class="badge badge-gold">🏆 Acertou!</span>`
          : `<span class="badge" style="background:rgba(192,57,43,.12);color:#e74c3c;">Errou</span>`
      }

      const pagoHtml = p.pago
        ? `<span class="badge badge-green" style="font-size:9px;">✅ PIX Recebido</span>`
        : `<span class="badge" style="background:rgba(192,57,43,.1);color:#e74c3c;font-size:9px;">💸 PIX Pendente</span>`

      html += `<div class="painel-card">
        <div class="painel-card-info">
          <div class="painel-card-nome">${j ? `${j.time1.flag} ${j.time1.nome} × ${j.time2.nome} ${j.time2.flag}` : p.jogo_id}</div>
          <div class="painel-card-meta">${j ? `${j.data} · ${j.fase}` : ''}</div>
        </div>
        <div class="painel-card-right">
          <div class="painel-card-score">${p.gols1} × ${p.gols2}</div>
          ${statusHtml}
          ${pagoHtml}
        </div>
      </div>`
    })
    el.innerHTML = html + '</div>'
  } catch (e) {
    el.innerHTML = emptyHTML('⚠️', e.message)
  }
}

// ═══════════════ BOLÕES & RESULTADOS ═══════════════
async function renderRanking() {
  const el = document.getElementById('ranking-list')
  const ws = document.getElementById('winner-section')
  el.innerHTML = loadingHTML('Carregando bolões…')
  ws.innerHTML = ''

  try {
    const [palpites, dbJogos] = await Promise.all([
      sb('palpites?order=created_at.asc'),
      sb('jogos?select=jogo_id,status,gols1,gols2&order=id'),
    ])
    const dbMap = Object.fromEntries(dbJogos.map(j => [j.jogo_id, j]))

    // historico de acertos por pessoa (apenas para a seção de histórico)
    const acertosMap = {}

    let html = ''
    JOGOS_BRASIL.forEach(j => {
      const db          = dbMap[j.id] || {}
      const enc         = db.status === 'encerrado'
      const palpsJogo   = palpites.filter(p => p.jogo_id === j.id)
      const pot         = palpsJogo.length * 10

      let ganh = []
      if (enc) {
        ganh = palpsJogo.filter(p => p.gols1 === db.gols1 && p.gols2 === db.gols2)
        ganh.forEach(g => {
          const key = g.nome.toLowerCase()
          if (!acertosMap[key]) acertosMap[key] = { nome: g.nome, dept: g.dept, acertos: 0 }
          acertosMap[key].acertos++
        })
      }
      const premioEach = ganh.length > 0 ? Math.floor(pot / ganh.length) : 0

      html += `<div class="bolao-card ${enc ? 'bolao-enc' : 'bolao-pend'}">
        <div class="bolao-card-header">
          <div class="bolao-teams">${j.time1.flag} ${j.time1.nome} × ${j.time2.nome} ${j.time2.flag}</div>
          <span class="badge ${enc ? 'badge-green' : 'badge-dim'}">${enc ? 'Encerrado' : 'Aguardando'}</span>
        </div>
        <div class="bolao-meta">${j.data} · ${j.fase}</div>
        ${enc ? `<div class="bolao-resultado">Resultado oficial: <strong>${db.gols1} × ${db.gols2}</strong></div>` : ''}
        <div class="bolao-stats">
          <div class="bolao-stat">
            <span>${palpsJogo.length}</span><small>Palpites</small>
          </div>
          <div class="bolao-stat bolao-stat-gold">
            <span>R$${pot.toLocaleString('pt-BR')},00</span><small>Prêmio</small>
          </div>
          ${enc ? `<div class="bolao-stat ${ganh.length > 0 ? 'bolao-stat-green' : ''}">
            <span>${ganh.length > 0 ? ganh.length : '—'}</span>
            <small>${ganh.length === 1 ? 'Ganhador' : ganh.length > 1 ? 'Ganhadores' : 'Sem acerto'}</small>
          </div>` : ''}
        </div>
        ${enc && ganh.length > 0 ? `
          <div class="bolao-winners">
            <div class="bolao-winners-names">🏆 ${ganh.map(g => g.nome).join(' · ')}</div>
            <div class="bolao-winners-prize">R$${premioEach.toLocaleString('pt-BR')},00${ganh.length > 1 ? ' cada' : ''}</div>
          </div>` : enc ? `
          <div class="bolao-no-winner">Ninguém acertou o placar exato — sem ganhador nesta rodada</div>` : `
          <div class="bolao-pending-msg">⏳ Faça seu palpite antes do jogo começar!</div>`
        }
      </div>`
    })

    el.innerHTML = html

    // ── Histórico de acertos (quem já ganhou algum bolão) ──
    const leaderboard = Object.values(acertosMap).sort((a, b) => b.acertos - a.acertos)
    if (leaderboard.length > 0) {
      const cls = i => ['gold', 'silver', 'bronze'][i] ?? ''
      ws.innerHTML = `
        <div class="section-title" style="margin-top:32px;">Histórico de Acertos</div>
        <div style="display:grid;gap:8px;">
          ${leaderboard.map((r, i) => `
          <div class="ranking-row">
            <div class="ranking-pos ${cls(i)}">${i + 1}</div>
            <div>
              <div class="ranking-name">${r.nome}</div>
              <div class="ranking-dept">${r.dept}</div>
            </div>
            <div class="ranking-col" style="color:var(--gold);font-weight:700;font-size:16px;" colspan="3">
              ⭐ ${r.acertos} placar${r.acertos > 1 ? 'es' : ''} exato${r.acertos > 1 ? 's' : ''}
            </div>
          </div>`).join('')}
        </div>`
    }
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
    _dbJogosMap   = dbMap

    el.innerHTML = JOGOS_BRASIL.map(j => {
      const db         = dbMap[j.id] || {}
      const enc        = db.status === 'encerrado'
      const live       = db.status === 'em_andamento'
      const adv        = jogoTime2(j)
      const isKnockout = !j.fase.includes('Grupos')

      return `<div class="adm-game-row">
        <div class="adm-game-info">
          <div class="adm-game-teams">${j.time1.flag} ${j.time1.nome} × ${adv.nome} ${adv.flag}</div>
          <span class="badge ${enc ? 'badge-green' : live ? 'badge-live' : 'badge-dim'}">${enc ? 'Encerrado' : live ? '🔴 Em andamento' : 'Agendado'}</span>
          <span style="font-size:12px;color:var(--text-muted);">${j.data} · ${j.fase}</span>
        </div>
        ${isKnockout ? `
        <div style="display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap;padding:10px 0;border-top:1px solid var(--border);margin-top:10px;">
          <div>
            <label style="font-size:10px;display:block;margin-bottom:3px;color:var(--text-muted);">BANDEIRA</label>
            <input type="text" id="adm-t2flag-${j.id}" value="${adv.flag !== '🏳️' ? adv.flag : ''}" placeholder="🇯🇵" style="width:62px;text-align:center;font-size:22px;padding:6px;">
          </div>
          <div style="flex:1;min-width:150px;">
            <label style="font-size:10px;display:block;margin-bottom:3px;color:var(--text-muted);">ADVERSÁRIO</label>
            <input type="text" id="adm-t2nome-${j.id}" value="${adv.nome !== 'A Definir' ? adv.nome : ''}" placeholder="Ex: França">
          </div>
          <button class="btn btn-primary" style="height:42px;" onclick="salvarAdversario('${j.id}')">✅ Salvar Adversário</button>
        </div>` : ''}
        <div class="adm-score-row">
          <span>${j.time1.flag}</span>
          <input type="number" id="adm-g1-${j.id}" value="${db.gols1 ?? 0}" min="0" max="30">
          <span style="font-family:'Barlow Condensed';font-size:20px;color:var(--text-muted);">×</span>
          <input type="number" id="adm-g2-${j.id}" value="${db.gols2 ?? 0}" min="0" max="30">
          <span>${adv.flag}</span>
        </div>
        <div class="adm-actions">
          ${!enc && !live ? `<button class="btn btn-danger" onclick="iniciarJogo('${j.id}')">🔴 Iniciar Jogo</button>` : ''}
          ${!enc ? `<button class="btn btn-green" onclick="salvarResultado('${j.id}')">💾 Salvar Resultado</button>` : ''}
          <button class="btn btn-primary" onclick="verGanhador('${j.id}')">🏆 Ver Ganhador</button>
          ${enc || live ? `<button class="btn btn-ghost" onclick="reabrirJogo('${j.id}')">↩ Reabrir</button>` : ''}
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
    toast('Jogo reaberto para palpites.', 'success')
    await renderAdmResultados()
    renderTabela()
  } catch (e) {
    toast('Erro: ' + e.message, 'error')
  }
}

async function iniciarJogo(jogoId) {
  const j = JOGOS_BRASIL.find(x => x.id === jogoId)
  const adv = jogoTime2(j)
  openModal(
    '🔴 Iniciar Jogo',
    `Confirma o início de <strong>${j.time1.nome} × ${adv.nome}</strong>?<br><br>
     Ao iniciar:<br>
     • Palpites serão <strong>bloqueados</strong><br>
     • Painel público será <strong>liberado</strong>`,
    async () => {
      try {
        await sb(`jogos?jogo_id=eq.${jogoId}`, {
          method: 'PATCH',
          body: { status: 'em_andamento' },
          prefer: 'return=minimal',
        })
        toast('🔴 Jogo iniciado! Painel liberado.', 'success')
        await renderAdmResultados()
        renderTabela()
      } catch (e) {
        toast('Erro: ' + e.message, 'error')
      }
    }
  )
}

async function salvarAdversario(jogoId) {
  const nome = document.getElementById(`adm-t2nome-${jogoId}`).value.trim()
  const flag = document.getElementById(`adm-t2flag-${jogoId}`).value.trim()
  if (!nome) { toast('Informe o nome do adversário.', 'error'); return }
  try {
    await sb(`jogos?jogo_id=eq.${jogoId}`, {
      method: 'PATCH',
      body: { time2_nome: nome, time2_flag: flag || '🏳️' },
      prefer: 'return=minimal',
    })
    toast(`✅ Adversário atualizado: ${flag} ${nome}`, 'success')
    await renderAdmResultados()
    renderTabela()
  } catch (e) {
    toast('Erro: ' + e.message, 'error')
  }
}

async function verGanhador(jogoId) {
  try {
    const [[db], palpsJogo] = await Promise.all([
      sb(`jogos?jogo_id=eq.${jogoId}`),
      sb(`palpites?jogo_id=eq.${jogoId}`),
    ])
    if (!db || db.status !== 'encerrado') { toast('Salve o resultado primeiro.', 'error'); return }

    const j        = JOGOS_BRASIL.find(x => x.id === jogoId)
    // prêmio = palpites DESTE jogo × R$10 (cada jogo é um bolão independente)
    const pot      = palpsJogo.length * 10
    const exatos   = palpsJogo.filter(p => p.gols1 === db.gols1 && p.gols2 === db.gols2)
    const premio   = exatos.length > 0 ? Math.floor(pot / exatos.length) : 0
    const ws       = document.getElementById('winner-section')

    const potHTML = `<div style="margin-top:16px;display:flex;gap:20px;justify-content:center;flex-wrap:wrap;">
      <div style="text-align:center;">
        <div style="font-family:'Barlow Condensed';font-size:26px;font-weight:800;color:var(--gold);">R$${pot.toLocaleString('pt-BR')},00</div>
        <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;">Prêmio do bolão</div>
      </div>
      <div style="text-align:center;">
        <div style="font-family:'Barlow Condensed';font-size:26px;font-weight:800;color:var(--text-dim);">${palpsJogo.length}</div>
        <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;">Participantes</div>
      </div>
      ${exatos.length > 0 ? `<div style="text-align:center;">
        <div style="font-family:'Barlow Condensed';font-size:26px;font-weight:800;color:var(--green-bright);">R$${premio.toLocaleString('pt-BR')},00</div>
        <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;">Por ganhador</div>
      </div>` : ''}
    </div>`

    if (exatos.length > 0) {
      ws.innerHTML = `<div class="winner-banner">
        <span class="winner-banner-icon">🏆</span>
        <div class="winner-name">${exatos.map(p => p.nome).join(' & ')}</div>
        <p style="margin-top:10px;color:var(--text-dim);">
          Acertou o placar exato: <strong>${j.time1.flag} ${db.gols1} × ${db.gols2} ${j.time2.flag}</strong>
          ${exatos.length > 1 ? `<br><span style="font-size:13px;">${exatos.length} ganhadores dividem o prêmio igualmente</span>` : ''}
        </p>
        ${potHTML}
      </div>`
      confetti()
    } else {
      ws.innerHTML = `<div class="winner-banner" style="border-color:var(--border);">
        <span class="winner-banner-icon">😅</span>
        <div class="winner-name" style="color:var(--text-dim);font-size:28px;">Ninguém acertou</div>
        <p style="margin-top:10px;color:var(--text-muted);">Placar real: <strong>${db.gols1} × ${db.gols2}</strong> — sem ganhador nesta rodada</p>
        ${potHTML}
      </div>`
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

    const jogoOpts = JOGOS_BRASIL.map(j =>
      `<option value="${j.id}">${j.time1.nome} × ${j.time2.nome} (${j.data})</option>`
    ).join('')

    let html = `
      <div class="adm-game-row" style="margin-bottom:20px;">
        <div style="font-weight:700;margin-bottom:12px;color:var(--gold);">➕ Adicionar Palpite Manual</div>
        <div class="form-grid" style="margin-bottom:10px;">
          <div class="form-group">
            <label>Nome</label>
            <input type="text" id="adm-add-nome" placeholder="Nome do funcionário" autocomplete="off">
          </div>
          <div class="form-group">
            <label>Celular (11 dígitos)</label>
            <input type="tel" id="adm-add-celular" placeholder="66999812901" maxlength="11" inputmode="numeric">
          </div>
        </div>
        <div class="form-group" style="margin-bottom:10px;">
          <label>Setor / Departamento</label>
          <input type="text" id="adm-add-dept" placeholder="Ex: Vendas" autocomplete="off">
        </div>
        <div class="form-group" style="margin-bottom:10px;">
          <label>Jogo</label>
          <select id="adm-add-jogo">${jogoOpts}</select>
        </div>
        <div class="adm-score-row" style="margin-bottom:12px;">
          <input type="number" id="adm-add-g1" value="0" min="0" max="30" style="width:70px;text-align:center;">
          <span style="font-family:'Barlow Condensed';font-size:20px;color:var(--text-muted);">×</span>
          <input type="number" id="adm-add-g2" value="0" min="0" max="30" style="width:70px;text-align:center;">
        </div>
        <button class="btn btn-green" onclick="admAdicionarPalpite()">➕ Adicionar Palpite</button>
      </div>

      <div style="color:var(--text-dim);font-size:13px;margin-bottom:12px;">
        ${palpites.length} palpite(s) cadastrados · R$${palpites.length * 10},00 de premiação
      </div>
      <div style="display:grid;gap:8px;">`

    palpites.forEach(p => {
      const j   = JOGOS_BRASIL.find(x => x.id === p.jogo_id)
      const db  = dbMap[p.jogo_id] || {}
      const enc = db.status === 'encerrado'
      const pts = enc ? calcPontos(p.gols1, p.gols2, db.gols1, db.gols2) : null

      html += `<div class="palpite-card" id="pcard-${p.id}" style="flex-wrap:wrap;gap:10px;">
        <div class="palpite-user" style="min-width:120px;">
          ${p.nome}<br>
          <span style="font-size:11px;color:var(--text-muted);">${p.dept}</span><br>
          <span style="font-size:11px;color:var(--text-muted);">📱 ${p.celular || '—'}</span>
        </div>
        <div class="palpite-jogo">
          ${j ? `${j.time1.flag} ${j.time1.nome} × ${j.time2.nome} ${j.time2.flag}` : p.jogo_id}<br>
          <span style="font-size:11px;color:var(--text-muted);">${new Date(p.created_at).toLocaleString('pt-BR')}</span>
        </div>
        <div id="pcard-score-${p.id}">
          <div class="palpite-result-display">${p.gols1} × ${p.gols2}</div>
        </div>
        ${pts !== null ? ptsBadge(pts) : '<span class="badge badge-dim">Pendente</span>'}
        <div style="display:flex;gap:6px;margin-left:auto;align-items:center;flex-wrap:wrap;">
          <button class="btn ${p.pago ? 'btn-green' : 'btn-ghost'}" style="padding:6px 12px;font-size:12px;"
            onclick="admTogglePago(${p.id},${!!p.pago})">${p.pago ? '✅ Pago' : '💸 Pago?'}</button>
          <button class="btn btn-ghost" style="padding:6px 12px;font-size:13px;" onclick="admIniciarEdicao(${p.id},${p.gols1},${p.gols2})">✏️</button>
          <button class="btn btn-danger" style="padding:6px 12px;font-size:13px;" onclick="admExcluirPalpite(${p.id},'${p.nome.replace(/'/g, "\\'")}')">🗑️</button>
        </div>
      </div>`
    })

    el.innerHTML = html + '</div>'
  } catch (e) {
    el.innerHTML = emptyHTML('⚠️', e.message)
  }
}

function admIniciarEdicao(id, g1, g2) {
  document.getElementById(`pcard-score-${id}`).innerHTML = `
    <div style="display:flex;align-items:center;gap:6px;">
      <input type="number" id="edit-g1-${id}" value="${g1}" min="0" max="30"
        style="width:54px;text-align:center;font-family:'Barlow Condensed';font-size:22px;font-weight:800;padding:4px;color:var(--gold);background:var(--surface);border:1px solid var(--gold);border-radius:6px;">
      <span style="font-family:'Barlow Condensed';font-size:18px;color:var(--text-muted);">×</span>
      <input type="number" id="edit-g2-${id}" value="${g2}" min="0" max="30"
        style="width:54px;text-align:center;font-family:'Barlow Condensed';font-size:22px;font-weight:800;padding:4px;color:var(--gold);background:var(--surface);border:1px solid var(--gold);border-radius:6px;">
      <button class="btn btn-green" style="padding:6px 10px;font-size:13px;" onclick="admSalvarEdicao(${id})">💾</button>
      <button class="btn btn-ghost" style="padding:6px 10px;font-size:13px;" onclick="renderAdmPalpites()">✕</button>
    </div>`
}

async function admSalvarEdicao(id) {
  const g1 = parseInt(document.getElementById(`edit-g1-${id}`).value)
  const g2 = parseInt(document.getElementById(`edit-g2-${id}`).value)
  if (isNaN(g1) || isNaN(g2)) { toast('Placar inválido.', 'error'); return }
  try {
    await sb(`palpites?id=eq.${id}`, {
      method: 'PATCH',
      body: { gols1: g1, gols2: g2 },
      prefer: 'return=minimal',
    })
    toast('✅ Palpite atualizado!', 'success')
    await renderAdmPalpites()
  } catch (e) {
    toast('Erro: ' + e.message, 'error')
  }
}

function admExcluirPalpite(id, nome) {
  openModal(
    'Excluir Palpite',
    `Tem certeza que deseja excluir o palpite de <strong>${nome}</strong>?<br>Esta ação não pode ser desfeita.`,
    async () => {
      try {
        await sb(`palpites?id=eq.${id}`, { method: 'DELETE', prefer: 'return=minimal' })
        toast('Palpite excluído.', 'success')
        await renderAdmPalpites()
        await updateHeroStats()
      } catch (e) {
        toast('Erro ao excluir: ' + e.message, 'error')
      }
    }
  )
}

async function admTogglePago(id, pago) {
  try {
    await sb(`palpites?id=eq.${id}`, {
      method: 'PATCH',
      body: { pago: !pago },
      prefer: 'return=minimal',
    })
    toast(!pago ? '✅ Pagamento confirmado!' : 'Pagamento desmarcado.', !pago ? 'success' : '')
    await renderAdmPalpites()
  } catch (e) {
    toast('Erro: ' + e.message, 'error')
  }
}

async function admAdicionarPalpite() {
  const nome    = document.getElementById('adm-add-nome').value.trim()
  const celular = document.getElementById('adm-add-celular').value.replace(/\D/g, '')
  const dept    = document.getElementById('adm-add-dept').value.trim()
  const jogoId  = document.getElementById('adm-add-jogo').value
  const g1      = parseInt(document.getElementById('adm-add-g1').value)
  const g2      = parseInt(document.getElementById('adm-add-g2').value)

  if (!nome) { toast('Informe o nome.', 'error'); return }
  if (!/^\d{11}$/.test(celular)) { toast('Celular inválido — use 11 dígitos com DDD.', 'error'); return }
  if (isNaN(g1) || isNaN(g2)) { toast('Placar inválido.', 'error'); return }

  try {
    await sb('palpites', {
      method: 'POST',
      body: { nome, celular, dept: dept || '—', jogo_id: jogoId, gols1: g1, gols2: g2 },
      prefer: 'return=minimal',
    })
    toast('✅ Palpite adicionado!', 'success')
    document.getElementById('adm-add-nome').value    = ''
    document.getElementById('adm-add-celular').value = ''
    document.getElementById('adm-add-dept').value    = ''
    document.getElementById('adm-add-g1').value      = 0
    document.getElementById('adm-add-g2').value      = 0
    await renderAdmPalpites()
    await updateHeroStats()
  } catch (e) {
    toast('Erro ao adicionar: ' + e.message, 'error')
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
