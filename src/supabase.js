// ─────────────────────────────────────────────
// Supabase REST client (sem SDK — fetch puro)
// Credenciais injetadas pelo Vite via .env
// ─────────────────────────────────────────────

const SB_URL = import.meta.env.VITE_SUPABASE_URL
const SB_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SB_URL || !SB_KEY) {
  console.error('[Bolão] Variáveis de ambiente não encontradas. Crie o arquivo .env com VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.')
}

/**
 * Wrapper REST para Supabase.
 * @param {string} path  - ex: 'jogos?jogo_id=eq.j1'
 * @param {object} opts  - method, body, prefer, headers
 */
export async function sb(path, opts = {}) {
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, {
    method: opts.method || 'GET',
    headers: {
      'apikey': SB_KEY,
      'Authorization': `Bearer ${SB_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': opts.prefer || 'return=representation',
      ...opts.headers,
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Supabase [${res.status}]: ${err}`)
  }

  const text = await res.text()
  return text ? JSON.parse(text) : null
}

export function isConfigured() {
  return Boolean(SB_URL && SB_KEY)
}
