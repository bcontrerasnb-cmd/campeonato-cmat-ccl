import { parseTeamsText } from './config.js';
import { store } from './store.js';
import { TombolaController } from './tombola.js';
import { calculateGroupStandings, resolveFinalCrossings } from './standingsEngine.js';
import {
  renderTombolaState,
  renderFixtureView,
  renderStandingsView,
  renderConfigView
} from './uiRenderer.js';
import {
  printOfficialActa,
  printJudgeActa,
  printJornadaResults,
  printStandingsReport
} from './reportGenerator.js';

const filters = {
  jornada: 'all',
  grupo: 'all'
};

let transitionInterval = null;

function clearTransitionCountdown() {
  if (transitionInterval) {
    clearInterval(transitionInterval);
    transitionInterval = null;
  }
  const pill = document.getElementById('drawCountdown');
  if (pill) {
    pill.style.display = 'none';
    pill.textContent = '';
  }
}

function startOneMinuteFixtureCountdown() {
  clearTransitionCountdown();
  let secondsLeft = 60;
  const pill = document.getElementById('drawCountdown');
  pill.style.display = 'inline-block';
  pill.textContent = `Sorteo completo · Pasando al Fixture Oficial en ${secondsLeft}s...`;

  transitionInterval = setInterval(() => {
    secondsLeft -= 1;
    if (secondsLeft > 0) {
      pill.textContent = `Sorteo completo · Pasando al Fixture Oficial en ${secondsLeft}s...`;
    } else {
      clearTransitionCountdown();
      switchTab('fixture');
    }
  }, 1000);
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('on');
  setTimeout(() => t.classList.remove('on'), 2800);
}

function startClock() {
  const clockEl = document.getElementById('clock');
  const tick = () => {
    const d = new Date();
    const dateStr = d.toLocaleDateString('es-CL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    const timeStr = d.toLocaleTimeString('es-CL', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    clockEl.textContent = `${dateStr} · ${timeStr}`;
  };
  tick();
  setInterval(tick, 1000);
}

const tombola = new TombolaController({
  canvas: document.getElementById('tomb'),
  onBallExtracted: ({ code, tStart, order }) => {
    store.recordBallExtraction({ code, tStart, order });
  },
  onDrawFinished: drawResult => {
    store.completeDraw(drawResult);
    showToast('¡Sorteo finalizado! En 1 minuto se abrirá el Fixture Oficial.');
    startOneMinuteFixtureCountdown();
  }
});

function refreshAllViews() {
  const state = store.getState();

  const groupMatchesA = state.matches.filter(m => m.grupo === 'A');
  const groupMatchesB = state.matches.filter(m => m.grupo === 'B');

  const standingsA = calculateGroupStandings(state.draw.groupA, groupMatchesA);
  const standingsB = calculateGroupStandings(state.draw.groupB, groupMatchesB);
  const resolvedMatches = resolveFinalCrossings(state.matches, standingsA, standingsB);

  renderTombolaState(state, tombola.code);
  renderFixtureView(state, resolvedMatches, filters);
  renderStandingsView(standingsA, standingsB);
  renderConfigView(state);

  return { standingsA, standingsB, resolvedMatches };
}

function switchTab(tabName) {
  if (tabName !== 'sorteo') {
    clearTransitionCountdown();
  }
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
  document.querySelectorAll('.view-panel').forEach(panel => {
    panel.classList.toggle('active', panel.id === `view-${tabName}`);
  });
}

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

document.getElementById('drawBtn').addEventListener('click', () => tombola.drawOne());
document.getElementById('autoBtn').addEventListener('click', () => tombola.runAuto());
document.getElementById('fsBtn').addEventListener('click', async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch {
    showToast('Pantalla completa no disponible en esta ventana');
  }
});

const fixBody = document.getElementById('fixBody');

fixBody.addEventListener('change', e => {
  const card = e.target.closest('.match-card');
  if (!card) return;
  const matchId = card.dataset.matchId;
  const field = e.target.dataset.field;

  if (e.target.classList.contains('score-in')) {
    store.updateMatchScore(matchId, field, e.target.value);
    showToast('Marcador actualizado y tabla recalculada');
  } else if (e.target.classList.contains('res-select')) {
    const res = store.updateMatchResource(matchId, field, e.target.value);
    if (!res.ok) {
      showToast(res.reason);
      refreshAllViews();
    } else {
      showToast(res.message || 'Asignación actualizada');
    }
  }
});

document.getElementById('filterJornada').addEventListener('change', e => {
  filters.jornada = e.target.value;
  refreshAllViews();
});

document.getElementById('filterGrupo').addEventListener('change', e => {
  filters.grupo = e.target.value;
  refreshAllViews();
});

document.getElementById('autoAssignBtn').addEventListener('click', () => {
  store.reassignAllResources();
  showToast('Jueces fijados en cada sala para los 6 partidos');
});

// Impresión y Exportación de Actas y Resultados
document.getElementById('actaBtn').addEventListener('click', () => {
  const { resolvedMatches } = refreshAllViews();
  printOfficialActa(store.getState(), resolvedMatches);
});

document.getElementById('printResultsBtn').addEventListener('click', () => {
  const { resolvedMatches } = refreshAllViews();
  printJornadaResults(store.getState(), resolvedMatches, filters.jornada);
});

document.getElementById('printJudgeActaBtn').addEventListener('click', () => {
  const judgeId = document.getElementById('printJudgeSelect').value;
  if (!judgeId) {
    showToast('Selecciona un juez de la lista para exportar su acta');
    return;
  }
  const { resolvedMatches } = refreshAllViews();
  printJudgeActa(store.getState(), resolvedMatches, judgeId);
});

document.getElementById('boletinBtn').addEventListener('click', () => {
  const { standingsA, standingsB } = refreshAllViews();
  printStandingsReport(store.getState(), standingsA, standingsB);
});

// Configuración y Jueces
document.getElementById('judgeForm').addEventListener('submit', e => {
  e.preventDefault();
  const nameIn = document.getElementById('judgeName');
  const roleIn = document.getElementById('judgeRole');
  store.addJudge(nameIn.value, roleIn.value);
  nameIn.value = '';
  roleIn.value = '';
  showToast('Juez inscrito correctamente');
});

document.getElementById('judgesList').addEventListener('click', e => {
  const printBtn = e.target.closest('[data-print-judge]');
  if (printBtn) {
    const { resolvedMatches } = refreshAllViews();
    printJudgeActa(store.getState(), resolvedMatches, printBtn.dataset.printJudge);
    return;
  }

  const delBtn = e.target.closest('[data-remove-judge]');
  if (!delBtn) return;
  store.removeJudge(delBtn.dataset.removeJudge);
  showToast('Juez eliminado de la nómina');
});

document.getElementById('saveRoomsBtn').addEventListener('click', () => {
  const rooms = document.getElementById('roomsIn').value
    .split('\n')
    .map(r => r.trim())
    .filter(Boolean);
  if (rooms.length < 6) {
    showToast('Debes mantener al menos 6 salas disponibles');
    return;
  }
  store.updateRooms(rooms);
  showToast('Salas actualizadas');
});

document.getElementById('saveTeamsBtn').addEventListener('click', () => {
  const raw = document.getElementById('teamsIn').value;
  const parsed = parseTeamsText(raw);
  if (parsed.length !== 12) {
    showToast(`Se requieren exactamente 12 equipos (actualmente hay ${parsed.length})`);
    return;
  }
  if (new Set(parsed.map(t => t.n)).size !== 12) {
    showToast('Hay números de inscripción duplicados');
    return;
  }
  clearTransitionCountdown();
  store.updateTeams(raw, parsed);
  tombola.setup(parsed, null);
  refreshAllViews();
  switchTab('sorteo');
  showToast('Nómina aplicada y tómbola reiniciada');
});

document.getElementById('exportJsonBtn').addEventListener('click', () => {
  const dataStr = JSON.stringify(store.getState(), null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const code = store.getState().draw.code || 'SIN-SORTEO';
  a.href = url;
  a.download = `Campeonato_CMAT_${code}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Archivo JSON exportado');
});

document.getElementById('importJsonInput').addEventListener('change', async e => {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const json = JSON.parse(text);
    clearTransitionCountdown();
    store.importFullState(json);
    const st = store.getState();
    tombola.setup(st.teams, st.draw);
    refreshAllViews();
    showToast('Datos importados correctamente');
  } catch (err) {
    showToast('Error al importar JSON: ' + err.message);
  }
  e.target.value = '';
});

document.getElementById('resetAllBtn').addEventListener('click', () => {
  if (!confirm('¿Seguro que deseas borrar el sorteo, los marcadores y reiniciar el torneo?')) return;
  clearTransitionCountdown();
  store.resetAll();
  const st = store.getState();
  tombola.setup(st.teams, null);
  refreshAllViews();
  switchTab('sorteo');
  showToast('Campeonato reiniciado');
});

window.addEventListener('beforeunload', e => {
  if (tombola.busy || tombola.auto) {
    e.preventDefault();
    e.returnValue = '';
  }
});

startClock();
const initialState = store.getState();
tombola.setup(initialState.teams, initialState.draw);
store.subscribe(refreshAllViews);
refreshAllViews();