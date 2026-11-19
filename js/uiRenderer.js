import { JORNADAS_INFO, SCHEDULE_CONFIG, getCrestPath } from './config.js';
import { auditScheduleCollisions } from './fixtureEngine.js';

export const esc = s =>
  String(s ?? '').replace(/[&<>"]/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;'
  }[c]));

function renderCrestAvatar(team) {
  const src = esc(team.crest || getCrestPath(team.n));
  return `
    <span class="crest-badge">
      <img src="${src}" alt="${esc(team.school)}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
      <span class="fallback-num" style="display:none">${team.n}</span>
    </span>
  `;
}

export function renderTombolaState(state, drawCode) {
  const { teams, draw } = state;
  document.getElementById('code').textContent = draw.code || drawCode;

  const listA = Array.isArray(draw.groupA) ? draw.groupA : [];
  const listB = Array.isArray(draw.groupB) ? draw.groupB : [];

  const renderGroupList = (arr, letter) =>
    arr.map((t, i) => `
      <li>
        <span class="pos">${letter}${i + 1}</span>
        ${renderCrestAvatar(t)}
        <span class="nm">${esc(t.school)}${t.team ? `<span class="tm">${esc(t.team)}</span>` : ''}</span>
      </li>
    `).join('');

  document.getElementById('gA').innerHTML = renderGroupList(listA, 'A');
  document.getElementById('gB').innerHTML = renderGroupList(listB, 'B');
  document.getElementById('cA').textContent = `${listA.length}/6`;
  document.getElementById('cB').textContent = `${listB.length}/6`;

  const extractedIds = new Set((draw.order || []).map(t => t.n));
  document.getElementById('legend').innerHTML = teams
    .map(t => {
      const src = esc(t.crest || getCrestPath(t.n));
      return `<span class="${extractedIds.has(t.n) ? 'gone' : ''}">
        <img src="${src}" alt="" onerror="this.style.display='none'">
        ${t.n} · ${esc(t.school)}
      </span>`;
    })
    .join('');

  if (draw.completed) {
    document.getElementById('turn').textContent = 'Sorteo oficial finalizado';
    document.getElementById('drawBtn').disabled = true;
    document.getElementById('autoBtn').disabled = true;
  } else {
    const nextNum = (draw.order ? draw.order.length : 0) + 1;
    document.getElementById('turn').textContent = `Bolita ${nextNum} de ${teams.length}`;
    document.getElementById('drawBtn').disabled = false;
    document.getElementById('autoBtn').disabled = false;
  }
}

export function renderFixtureView(state, resolvedMatches, filters) {
  const { draw, judges, rooms } = state;
  const fixBody = document.getElementById('fixBody');
  const fixSub = document.getElementById('fixSub');

  // Sincroniza selector de jueces para exportar acta individual
  const judgeSel = document.getElementById('printJudgeSelect');
  if (judgeSel) {
    const currentVal = judgeSel.value;
    judgeSel.innerHTML = `<option value="">-- Seleccionar Juez --</option>` + judges.map(j => {
      const assignedMatch = resolvedMatches.find(m => m.judgeId === j.id && m.sala);
      const roomTag = assignedMatch ? ` · ${assignedMatch.sala}` : '';
      return `<option value="${esc(j.id)}" ${currentVal === j.id ? 'selected' : ''}>${esc(j.name)}${esc(roomTag)}</option>`;
    }).join('');
  }

  const playedCount = resolvedMatches.filter(m => m.ptsA !== null && m.ptsB !== null).length;
  document.getElementById('badgeMatches').textContent = `${playedCount}/${resolvedMatches.length || 36}`;

  if (!draw.completed || !resolvedMatches.length) {
    fixSub.textContent = 'Pendiente de sorteo. Ve a la pestaña "1. Tómbola y Sorteo" o importa un archivo JSON.';
    fixBody.innerHTML = `<p style="padding:20px 0;color:#5a6596">Aún no se ha ejecutado el sorteo de grupos.</p>`;
    return;
  }

  const startStr = new Date(draw.tStart).toLocaleString('es-CL');
  fixSub.textContent = `Sorteo ${draw.code} (${startStr}) · Jornadas oficiales: 20 y 27 de noviembre · Jueces fijos por sala`;

  const issues = auditScheduleCollisions(resolvedMatches);
  const banner = document.getElementById('collisionBanner');
  if (issues.length > 0) {
    banner.className = 'collision-status warn';
    banner.textContent = `Atención: ${issues[0]}`;
  } else {
    banner.className = 'collision-status';
    banner.textContent = 'Salas y Jueces fijos verificados sin colisiones';
  }

  const jornadasToRender = filters.jornada === 'all' ? [1, 2] : [Number(filters.jornada)];

  fixBody.innerHTML = jornadasToRender.map(jNum => {
    const partidosInJornada = Object.values(SCHEDULE_CONFIG).filter(s => s.jornada === jNum);

    const sectionsHTML = partidosInJornada.map(sched => {
      const pNum = Number(Object.keys(SCHEDULE_CONFIG).find(k => SCHEDULE_CONFIG[k] === sched));
      let blockMatches = resolvedMatches.filter(m => m.partidoNum === pNum);

      const occupiedRooms = new Map();
      const occupiedJudges = new Map();
      blockMatches.forEach(m => {
        if (m.sala) occupiedRooms.set(m.sala, m.id);
        if (m.judgeId) occupiedJudges.set(m.judgeId, m.id);
      });

      if (filters.grupo !== 'all') {
        blockMatches = blockMatches.filter(m => m.grupo === filters.grupo);
      }

      if (!blockMatches.length) return '';

      const cardsHTML = blockMatches.map(m => {
        const isPlayed = m.ptsA !== null && m.ptsB !== null;
        const grpLabel = m.grupo === 'F'
          ? (m.isOfficialPairing ? `FINAL LUGAR ${m.targetRank}° (OFICIAL)` : `FINAL LUGAR ${m.targetRank}° (PROVISIONAL)`)
          : `GRUPO ${m.grupo}`;

        const roomOptions = `<option value="">-- Sala --</option>` + rooms.map(r => {
          const busyByOther = occupiedRooms.has(r) && occupiedRooms.get(r) !== m.id;
          return `<option value="${esc(r)}" ${m.sala === r ? 'selected' : ''} ${busyByOther ? 'disabled' : ''}>
            ${esc(r)}${busyByOther ? ' (Ocupada)' : ''}
          </option>`;
        }).join('');

        const judgeOptions = `<option value="">-- Sin Juez --</option>` + judges.map(j => {
          const busyByOther = occupiedJudges.has(j.id) && occupiedJudges.get(j.id) !== m.id;
          return `<option value="${esc(j.id)}" ${m.judgeId === j.id ? 'selected' : ''} ${busyByOther ? 'disabled' : ''}>
            ${esc(j.name)}${busyByOther ? ' (Fijo en otra sala)' : ''}
          </option>`;
        }).join('');

        const teamAName = m.teamA ? esc(m.teamA.school) : `<em>Por definir (${esc(m.seedA)})</em>`;
        const teamASub = m.teamA?.team ? esc(m.teamA.team) : '';
        const teamBName = m.teamB ? esc(m.teamB.school) : `<em>Por definir (${esc(m.seedB)})</em>`;
        const teamBSub = m.teamB?.team ? esc(m.teamB.team) : '';

        return `
          <div class="match-card ${isPlayed ? 'played' : ''}" data-match-id="${m.id}">
            <div class="match-top">
              <span class="grp-pill ${m.grupo}">${grpLabel}</span>
              <div class="res-selects">
                <select class="res-select ${!m.sala ? 'missing' : ''}" data-field="sala" title="Sala asignada">
                  ${roomOptions}
                </select>
                <select class="res-select ${!m.judgeId ? 'missing' : ''}" data-field="judgeId" title="Árbitro / Juez fijo en esta sala">
                  ${judgeOptions}
                </select>
              </div>
            </div>

            <div class="team-row">
              <div class="team-info">
                <span class="seed">${esc(m.seedA)}</span><strong>${teamAName}</strong>
                ${teamASub ? `<small>${teamASub}</small>` : ''}
              </div>
              <div class="input-box">
                <label>Puntos</label>
                <input type="number" min="0" step="1" class="score-in" data-field="ptsA" value="${m.ptsA ?? ''}" placeholder="—">
              </div>
              <div class="input-box">
                <label>Penaliz.</label>
                <input type="number" min="0" step="1" class="score-in pen-in" data-field="penA" value="${m.penA ?? 0}">
              </div>
            </div>

            <div class="team-row">
              <div class="team-info">
                <span class="seed">${esc(m.seedB)}</span><strong>${teamBName}</strong>
                ${teamBSub ? `<small>${teamBSub}</small>` : ''}
              </div>
              <div class="input-box">
                <label>Puntos</label>
                <input type="number" min="0" step="1" class="score-in" data-field="ptsB" value="${m.ptsB ?? ''}" placeholder="—">
              </div>
              <div class="input-box">
                <label>Penaliz.</label>
                <input type="number" min="0" step="1" class="score-in pen-in" data-field="penB" value="${m.penB ?? 0}">
              </div>
            </div>
          </div>
        `;
      }).join('');

      return `
        <div class="partido-section ${sched.isFinal ? 'final' : ''}">
          <div class="partido-header">
            <span class="p-title">${sched.label}</span>
            <span class="p-time">⏰ ${sched.hora} hrs · ${sched.fecha}</span>
          </div>
          <div class="matches-grid">${cardsHTML}</div>
        </div>
      `;
    }).join('');

    return `
      <div class="jor-block">
        <div class="jor-title"><span>${JORNADAS_INFO[jNum]}</span></div>
        ${sectionsHTML}
      </div>
    `;
  }).join('');
}

export function renderStandingsView(standingsA, standingsB) {
  const container = document.getElementById('standingsContainer');

  if (!standingsA.length && !standingsB.length) {
    container.innerHTML = `<p style="color:#5a6596">Realiza el sorteo para visualizar las tablas de posiciones de los Grupos A y B.</p>`;
    return;
  }

  const buildTable = (rows, groupLetter) => `
    <div class="table-card ${groupLetter}">
      <div class="th-banner">
        <h3>GRUPO ${groupLetter}</h3>
        <span>Clasificación en vivo</span>
      </div>
      <div style="overflow-x:auto">
        <table class="pos-table">
          <thead>
            <tr>
              <th>#</th>
              <th class="left">Colegio / Equipo</th>
              <th title="Partidos Jugados">PJ</th>
              <th title="Ganados">PG</th>
              <th title="Empatados">PE</th>
              <th title="Perdidos">PP</th>
              <th title="Puntos a Favor">PF</th>
              <th title="Puntos en Contra">PC</th>
              <th title="Diferencia de Puntos (1er desempate)">DIF</th>
              <th title="Penalizaciones acumuladas (3er desempate)">PEN</th>
              <th title="Puntos de Campeonato (3/1/0)">PTS</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(r => `
              <tr class="rank-${r.rank}">
                <td><span class="rank-num">${r.rank}</span></td>
                <td class="left">
                  <strong>${esc(r.team.school)}</strong>
                  ${r.team.team ? `<div style="font-size:12px;color:#5a6596">${esc(r.team.team)}</div>` : ''}
                  ${r.tieNote ? `<span class="tie-tag">${esc(r.tieNote)}</span>` : ''}
                </td>
                <td>${r.PJ}</td>
                <td>${r.PG}</td>
                <td>${r.PE}</td>
                <td>${r.PP}</td>
                <td>${r.PF}</td>
                <td>${r.PC}</td>
                <td><strong>${r.DIF > 0 ? '+' + r.DIF : r.DIF}</strong></td>
                <td style="color:var(--red2)">${r.PEN}</td>
                <td class="pts-col">${r.PTS}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  container.innerHTML = buildTable(standingsA, 'A') + buildTable(standingsB, 'B');
}

export function renderConfigView(state) {
  document.getElementById('badgeJudges').textContent = state.judges.length;
  document.getElementById('roomsIn').value = state.rooms.join('\n');
  document.getElementById('teamsIn').value = state.teamsRaw;

  const listEl = document.getElementById('judgesList');
  if (!state.judges.length) {
    listEl.innerHTML = `<p class="help-txt">No hay jueces inscritos. Agrega al menos 6 jueces para cubrir las 6 salas simultáneas.</p>`;
    return;
  }

  listEl.innerHTML = state.judges.map((j, idx) => {
    const fixedMatch = state.matches.find(m => m.judgeId === j.id && m.sala);
    const roomBadge = fixedMatch ? ` · Fijo en ${fixedMatch.sala}` : '';
    return `
      <div class="res-item">
        <div>
          <strong>${idx + 1}. ${esc(j.name)}</strong>
          <span>(${esc(j.role)}${esc(roomBadge)})</span>
        </div>
        <div style="display:flex;gap:6px">
          <button type="button" class="del-btn" style="background:#eef2ff;color:var(--navy)" data-print-judge="${j.id}">Acta Juez</button>
          <button type="button" class="del-btn" data-remove-judge="${j.id}">Eliminar</button>
        </div>
      </div>
    `;
  }).join('');
}