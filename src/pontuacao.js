// ─────────────────────────────────────────────
// Lógica de pontuação
// ─────────────────────────────────────────────

/**
 * Calcula pontos de um palpite dado o resultado real.
 * @returns {number} 3 = placar exato | 1 = vencedor certo | 0 = errou
 */
export function calcPontos(pg1, pg2, g1, g2) {
  if (pg1 === g1 && pg2 === g2) return 3
  const res = g1 > g2 ? 'h' : g1 < g2 ? 'a' : 'd'
  const pr  = pg1 > pg2 ? 'h' : pg1 < pg2 ? 'a' : 'd'
  return res === pr ? 1 : 0
}

export function ptsBadge(pts) {
  if (pts === 3) return `<span class="palpite-pts">🎯 Exato (+3)</span>`
  if (pts === 1) return `<span class="palpite-pts">✅ Vencedor (+1)</span>`
  return `<span class="palpite-pts errou">❌ Errou</span>`
}
