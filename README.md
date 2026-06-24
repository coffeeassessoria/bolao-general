# 🇧🇷 Bolão Copa 2026 · General Carros

Sistema de bolão para os jogos do Brasil na Copa do Mundo 2026, com backend Supabase.

---

## Estrutura do Projeto

```
bolao-general-carros/
├── index.html           ← HTML principal
├── vite.config.js       ← Config do Vite
├── package.json
├── .env                 ← ⚠️ Criar manualmente (não commitar)
├── .env.example         ← Template das variáveis
├── .gitignore
└── src/
    ├── main.js          ← Entry point, toda a lógica
    ├── supabase.js      ← Client REST do Supabase
    ├── jogos.js         ← Dados estáticos dos jogos
    ├── pontuacao.js     ← Cálculo de pontos
    ├── ui.js            ← Toast, modal, confetti
    └── style.css        ← Todos os estilos
```

---

## Setup Rápido

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar variáveis de ambiente

Copie o `.env.example` e preencha com as credenciais do seu projeto Supabase:

```bash
cp .env.example .env
```

Edite o `.env`:

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> As credenciais estão em: **Supabase → Settings → API**

### 3. Rodar em desenvolvimento

```bash
npm run dev
```

Acesse: `http://localhost:5173`

### 4. Gerar build para produção

```bash
npm run build
```

A pasta `/dist` é gerada com tudo pronto para deploy.

---

## Deploy no Vercel (recomendado para bolao.generalcarros.com.br)

1. Instale o Vercel CLI: `npm i -g vercel`
2. Rode `vercel` na raiz do projeto
3. No painel do Vercel, vá em **Settings → Environment Variables** e adicione:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Aponte o domínio `bolao.generalcarros.com.br` nas configurações de DNS

> **Alternativa:** Netlify, Cloudflare Pages — funcionam da mesma forma.

---

## Banco de Dados (Supabase)

Execute o arquivo `setup-banco.sql` no **SQL Editor** do Supabase antes de rodar o sistema.

### Tabelas criadas

| Tabela | Descrição |
|--------|-----------|
| `jogos` | Status e placar de cada jogo (gerenciado pelo ADM) |
| `palpites` | Palpites dos funcionários (somente INSERT — imutável) |
| `grupo_c` | Classificação do Grupo C (editável pelo ADM) |

---

## Senhas

| Função | Senha |
|--------|-------|
| ADM | `generalcarros2026` |

> Para trocar a senha do ADM, edite a constante `ADM_SENHA` em `src/main.js`.

---

## Pontuação

| Acerto | Pontos |
|--------|--------|
| Placar exato | 🎯 3 pts |
| Vencedor certo | ✅ 1 pt |
| Errou | ❌ 0 pts |

Múltiplos palpites: R$10,00 por palpite (2 palpites = R$20,00, etc.)
