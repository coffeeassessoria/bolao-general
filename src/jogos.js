// ─────────────────────────────────────────────
// Dados estáticos dos jogos do Brasil — Copa 2026
// Resultados e status vêm do banco (tabela jogos)
// ─────────────────────────────────────────────

export const JOGOS_BRASIL = [
  {
    id: 'j1',
    fase: 'Fase de Grupos · Rodada 1',
    time1: { nome: 'Brasil',   flag: '🇧🇷', brasil: true  },
    time2: { nome: 'Marrocos', flag: '🇲🇦', brasil: false },
    data: '13/06/2026', horario: '19h00 (Brasília)',
    local: 'MetLife Stadium · Nova York/NJ',
  },
  {
    id: 'j2',
    fase: 'Fase de Grupos · Rodada 2',
    time1: { nome: 'Brasil', flag: '🇧🇷', brasil: true  },
    time2: { nome: 'Haiti',  flag: '🇭🇹', brasil: false },
    data: '19/06/2026', horario: '21h30 (Brasília)',
    local: 'Lincoln Financial Field · Filadélfia',
  },
  {
    id: 'j3',
    fase: 'Fase de Grupos · Rodada 3',
    time1: { nome: 'Escócia', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', brasil: false },
    time2: { nome: 'Brasil',  flag: '🇧🇷', brasil: true  },
    data: '24/06/2026', horario: '19h00 (Brasília)',
    local: 'Hard Rock Stadium · Miami',
  },
  {
    id: 'j4',
    fase: 'Oitavas de Final',
    time1: { nome: 'Brasil',    flag: '🇧🇷', brasil: true  },
    time2: { nome: 'A Definir', flag: '🏳️', brasil: false },
    data: '29/06/2026', horario: 'A Definir',
    local: 'Houston ou Monterrey',
  },
  {
    id: 'j5',
    fase: 'Quartas de Final',
    time1: { nome: 'Brasil',    flag: '🇧🇷', brasil: true  },
    time2: { nome: 'A Definir', flag: '🏳️', brasil: false },
    data: '04–05/07/2026', horario: 'A Definir',
    local: 'A Definir',
  },
  {
    id: 'j6',
    fase: 'Semifinal',
    time1: { nome: 'Brasil',    flag: '🇧🇷', brasil: true  },
    time2: { nome: 'A Definir', flag: '🏳️', brasil: false },
    data: '14–15/07/2026', horario: 'A Definir',
    local: 'A Definir',
  },
  {
    id: 'j7',
    fase: 'Final',
    time1: { nome: 'Brasil',    flag: '🇧🇷', brasil: true  },
    time2: { nome: 'A Definir', flag: '🏳️', brasil: false },
    data: '19/07/2026', horario: '17h00 (Brasília)',
    local: 'MetLife Stadium · Nova York/NJ',
  },
]
