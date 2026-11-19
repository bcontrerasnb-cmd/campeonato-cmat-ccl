export const STORAGE_KEYS = {
  STATE: 'cmat_ccl_2026_state_v2',
  LEGACY_TEAMS: 'jac-equipos'
};

export const SCHEDULE_CONFIG = {
  1: { jornada: 1, fecha: 'Viernes 20 de noviembre', hora: '14:15', label: 'PARTIDO 1', isFinal: false },
  2: { jornada: 1, fecha: 'Viernes 20 de noviembre', hora: '15:25', label: 'PARTIDO 2', isFinal: false },
  3: { jornada: 1, fecha: 'Viernes 20 de noviembre', hora: '16:35', label: 'PARTIDO 3', isFinal: false },
  4: { jornada: 2, fecha: 'Viernes 27 de noviembre', hora: '14:15', label: 'PARTIDO 4', isFinal: false },
  5: { jornada: 2, fecha: 'Viernes 27 de noviembre', hora: '15:25', label: 'PARTIDO 5', isFinal: false },
  6: { jornada: 2, fecha: 'Viernes 27 de noviembre', hora: '16:35', label: 'PARTIDO 6 · FINAL POR LUGARES', isFinal: true }
};

export const JORNADAS_INFO = {
  1: 'Primera Jornada · Viernes 20 de noviembre de 2026',
  2: 'Segunda Jornada · Viernes 27 de noviembre de 2026'
};

export const DEFAULT_ROOMS = [
  'Sala 1',
  'Sala 2',
  'Sala 3',
  'Sala 4',
  'Sala 5',
  'Sala 6'
];

export const DEFAULT_JUDGES = [
  { id: 'j-1', name: 'Marcelo Montecino', role: 'Juez Fijo · Sala 1', fixedRoom: 'Sala 1' },
  { id: 'j-2', name: 'Melisa Bascuñan', role: 'Juez Fijo · Sala 2', fixedRoom: 'Sala 2' },
  { id: 'j-3', name: 'Rodrigo Reyes', role: 'Juez Fijo · Sala 3', fixedRoom: 'Sala 3' },
  { id: 'j-4', name: 'Francisco Arévalo', role: 'Juez Fijo · Sala 4', fixedRoom: 'Sala 4' },
  { id: 'j-5', name: 'Ramón Cordova', role: 'Juez Fijo · Sala 5', fixedRoom: 'Sala 5' },
  { id: 'j-6', name: 'Claudia Arenas', role: 'Juez Fijo · Sala 6', fixedRoom: 'Sala 6' }
];

export const DEFAULT_TEAMS_RAW = `MAT-2026-001\tLBE Colegio Concepción Linares\tLos Catenusa
MAT-2026-002\tInstituto Valentín Letelier\tLos π-ratas
MAT-2026-003\tLiceo Bicentenario de Excelencia Valentín Letelier\t8vo al cubo
MAT-2026-004\tSalesianos Linares\tLos Torres de Hanoi
MAT-2026-005\tColegio Alborada\tMateCAL
MAT-2026-006\tLiceo Bicentenario San Miguel Arcángel\tLos miguelinos
MAT-2026-007\tEscuela Básica España\tLa Liga de las Incógnitas
MAT-2026-008\tColegio Concepción de Parral
MAT-2026-009\tColegio Lucila Godoy\tBrillantemente
MAT-2026-010\tColegio Cordillera Linares\tFactor Común
MAT-2026-011\tColegio Amelia Troncoso
MAT-2026-012\tEscuela Presidente Carlos Ibáñez del Campo`;

export function getCrestPath(teamNumber) {
  return `./assets/escudos/${String(teamNumber).padStart(2, '0')}.png`;
}

export function parseTeamsText(txt) {
  const out = [];
  txt.split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .forEach((line, idx) => {
      const parts = line.split('\t').map(s => s.trim()).filter(Boolean);
      let n = idx + 1;
      let code = '';
      if (/^MAT-\d{4}-\d{3}$/i.test(parts[0]) || /^\d{1,3}$/.test(parts[0])) {
        code = parts.shift();
        n = parseInt(code.slice(-3), 10);
      }
      out.push({
        n,
        code: code || `MAT-2026-${String(n).padStart(3, '0')}`,
        school: parts[0] || `Equipo ${n}`,
        team: parts[1] || '',
        crest: getCrestPath(n)
      });
    });
  return out.sort((a, b) => a.n - b.n);
}