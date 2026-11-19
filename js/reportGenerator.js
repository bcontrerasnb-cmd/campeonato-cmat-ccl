import { JORNADAS_INFO, SCHEDULE_CONFIG } from './config.js';
import { esc } from './uiRenderer.js';

function openPrintWindow(htmlContent) {
  const win = window.open('', '_blank');
  if (!win) {
    alert('Permite las ventanas emergentes en tu navegador para generar el documento imprimible.');
    return;
  }
  win.document.write(htmlContent);
  win.document.close();
}

/**
 * 1. Acta Oficial del Sorteo con firmas de Prof. Rodrigo Pérez Carrasco
 * y los 12 docentes encargados de cada colegio participante.
 */
export function printOfficialActa(state, resolvedMatches) {
  const { draw, judges, teams } = state;
  if (!draw.completed) return;

  const judgeMap = new Map(judges.map(j => [j.id, j.name]));
  const tStart = new Date(draw.tStart);
  const tEnd = new Date(draw.tEnd);
  const fmtDate = d => d.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const fmtTime = d => d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const renderGroupRows = (arr, letter) =>
    arr.map((t, i) => `
      <tr>
        <td class="c"><b>${letter}${i + 1}</b></td>
        <td class="c">${t.n}</td>
        <td>${esc(t.school)} ${t.team ? `<i>(${esc(t.team)})</i>` : ''}</td>
      </tr>
    `).join('');

  const renderJornadaTables = jNum => {
    const schedules = Object.entries(SCHEDULE_CONFIG).filter(([, s]) => s.jornada === jNum);
    return schedules.map(([pKey, sched]) => {
      const pNum = Number(pKey);
      const block = resolvedMatches.filter(m => m.partidoNum === pNum);
      return `
        <table class="pt">
          <thead>
            <tr>
              <th colspan="4">${sched.label} · ${sched.hora} HRS</th>
            </tr>
          </thead>
          <tbody>
            ${block.map(m => {
              const nameA = m.teamA ? `<b>${esc(m.seedA)}</b> ${esc(m.teamA.school)}` : `<b>${esc(m.seedA)}</b>`;
              const nameB = m.teamB ? `<b>${esc(m.seedB)}</b> ${esc(m.teamB.school)}` : `<b>${esc(m.seedB)}</b>`;
              const jName = judgeMap.get(m.judgeId) || 'Por asignar';
              return `
                <tr>
                  <td class="c s${m.grupo}">${esc(m.sala || 'Sin sala')}</td>
                  <td>${nameA}</td>
                  <td>${nameB}</td>
                  <td style="font-size:10px">Juez: ${esc(jName)}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `;
    }).join('');
  };

  // Firmas de los 12 docentes encargados de cada colegio
  const schoolSignaturesHTML = teams.map(t => `
    <div class="sig-box">
      <div class="sig-line"></div>
      <b>Docente Encargado(a) · Equipo ${String(t.n).padStart(2, '0')}</b><br>
      <span>${esc(t.school)}</span>
      <div class="sig-sub">Nombre y Firma</div>
    </div>
  `).join('');

  const html = `<!DOCTYPE html>
  <html lang="es"><head><meta charset="utf-8"><title>Acta Oficial ${draw.code}</title>
  <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,700;0,800;1,800;1,900&family=Barlow:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    @page { size: letter; margin: 11mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { font-family: Barlow, Arial, sans-serif; color: #0a1650; font-size: 11px; margin: 0; }
    .hd { display: flex; align-items: center; gap: 14px; border-bottom: 4px solid #f5c21b; padding-bottom: 8px; }
    .hd img { height: 60px; }
    .t1 { font: italic 900 23px/1 "Barlow Condensed"; color: #071a66; }
    .t2 { font: italic 900 17px/1.1 "Barlow Condensed"; color: #d4122b; }
    .t3 { font: 600 11px Barlow; color: #4a5488; }
    .band { margin: 10px 0; background: #071a66; color: #fff; display: flex; justify-content: space-between; align-items: center; padding: 6px 12px; }
    .band b { font: italic 900 19px "Barlow Condensed"; }
    .band span { font: 800 14px "Barlow Condensed"; background: #f5c21b; color: #071a66; padding: 2px 10px; }
    h4 { font: italic 800 15px "Barlow Condensed"; margin: 11px 0 5px; color: #071a66; border-left: 5px solid #d4122b; padding-left: 7px; }
    .two { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 7px; }
    td, th { border: 1px solid #c9d2f2; padding: 3px 6px; }
    .ga th { background: #1f56e0; color: #fff; font: 800 13px "Barlow Condensed"; text-align: left; }
    .gb th { background: #d4122b; color: #fff; font: 800 13px "Barlow Condensed"; text-align: left; }
    .c { text-align: center; white-space: nowrap; width: 1%; }
    .pt th { background: #071a66; color: #f5c21b; font: 800 12.5px "Barlow Condensed"; text-align: left; }
    .sA { background: #e6edff; color: #1f56e0; font-weight: 700; }
    .sB { background: #ffe8eb; color: #d4122b; font-weight: 700; }
    .sF { background: #fff4cc; font-weight: 700; }
    .coord-sig { margin: 22px auto 14px; width: 320px; text-align: center; break-inside: avoid; }
    .coord-sig .sig-line { border-top: 2px solid #071a66; margin-bottom: 5px; }
    .firmas-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 22px 14px; margin-top: 14px; }
    .sig-box { break-inside: avoid; font-size: 9.5px; line-height: 1.25; }
    .sig-box .sig-line { border-top: 1.3px solid #0a1650; margin-top: 20px; margin-bottom: 3px; }
    .sig-box .sig-sub { color: #5a6596; font-size: 8.5px; margin-top: 2px; }
  </style></head><body>
    <div class="hd">
      <img src="./assets/logo-ccl.png" onerror="this.style.display='none'">
      <div>
        <div class="t1">I CAMPEONATO DE MATEMÁTICAS · JOSÉ ÁVILA CHANDÍA</div>
        <div class="t2">8° Básico · Formato CMAT · Región del Maule 2026</div>
        <div class="t3">Organiza: Liceo Bicentenario de Excelencia Colegio Concepción Linares</div>
      </div>
    </div>
    <div class="band"><b>ACTA OFICIAL DE SORTEO, FIXTURE Y VALIDACIÓN DE DELEGACIONES</b><span>CÓDIGO ${draw.code}</span></div>
    <p>En Linares, el ${fmtDate(tStart)}, entre las ${fmtTime(tStart)} y las ${fmtTime(tEnd)} horas, se realizó el sorteo oficial de grupos con ${teams.length} establecimientos inscritos. Las extracciones impares conforman el Grupo A y las pares el Grupo B.</p>
    <h4>Conformación Oficial de Grupos</h4>
    <div class="two">
      <table class="ga"><tr><th class="c">Pos.</th><th class="c">N°</th><th>GRUPO A</th></tr>${renderGroupRows(draw.groupA, 'A')}</table>
      <table class="gb"><tr><th class="c">Pos.</th><th class="c">N°</th><th>GRUPO B</th></tr>${renderGroupRows(draw.groupB, 'B')}</table>
    </div>
    <h4>${JORNADAS_INFO[1]}</h4>
    ${renderJornadaTables(1)}
    <h4>${JORNADAS_INFO[2]}</h4>
    ${renderJornadaTables(2)}

    <h4>Validación y Firmas Oficiales</h4>
    <div class="coord-sig">
      <div class="sig-line"></div>
      <b style="font-size:12px">Prof. Rodrigo Pérez Carrasco</b><br>
      <span>Coordinador General · I Campeonato de Matemáticas José Ávila Chandía</span>
    </div>

    <div class="firmas-grid">${schoolSignaturesHTML}</div>
    <script>window.addEventListener('load', () => setTimeout(() => window.print(), 400));</script>
  </body></html>`;

  openPrintWindow(html);
}

/**
 * 2. Acta individual por Juez (funciona como hoja de ruta y acta de partidos de su sala fija).
 */
export function printJudgeActa(state, resolvedMatches, judgeId) {
  const { draw, judges } = state;
  const judge = judges.find(j => j.id === judgeId);
  if (!judge) return;

  const judgeMatches = resolvedMatches
    .filter(m => m.judgeId === judgeId)
    .sort((a, b) => a.partidoNum - b.partidoNum);

  const assignedRooms = [...new Set(judgeMatches.map(m => m.sala).filter(Boolean))];
  const roomDisplay = assignedRooms.length ? assignedRooms.join(', ') : 'Sin sala asignada';

  const rowsHTML = judgeMatches.map(m => {
    const nameA = m.teamA ? `${esc(m.seedA)} · ${esc(m.teamA.school)}` : `${esc(m.seedA)} (Por definir)`;
    const nameB = m.teamB ? `${esc(m.seedB)} · ${esc(m.teamB.school)}` : `${esc(m.seedB)} (Por definir)`;
    const ptsAStr = m.ptsA !== null ? m.ptsA : '';
    const ptsBStr = m.ptsB !== null ? m.ptsB : '';
    const penAStr = m.ptsA !== null ? (m.penA ?? 0) : '';
    const penBStr = m.ptsB !== null ? (m.penB ?? 0) : '';

    return `
      <tr>
        <td class="c"><b>Partido ${m.partidoNum}</b><br><span style="font-size:9.5px">${m.jornada === 1 ? '20 Nov' : '27 Nov'} · ${m.hora}</span></td>
        <td class="c"><b>${m.grupo === 'F' ? `Final ${m.targetRank}°` : `Grupo ${m.grupo}`}</b><br><span style="font-size:9.5px">${esc(m.sala || '—')}</span></td>
        <td>
          <div style="margin-bottom:4px"><b>A:</b> ${nameA}</div>
          <div><b>B:</b> ${nameB}</div>
        </td>
        <td class="c score-cell">${ptsAStr}<hr class="cell-div">${ptsBStr}</td>
        <td class="c score-cell">${penAStr}<hr class="cell-div">${penBStr}</td>
        <td class="sig-cell"><div class="mini-line">Firma Docente A</div><div class="mini-line" style="margin-top:14px">Firma Docente B</div></td>
      </tr>
    `;
  }).join('');

  const html = `<!DOCTYPE html>
  <html lang="es"><head><meta charset="utf-8"><title>Acta Juez - ${esc(judge.name)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,700;0,800;1,800;1,900&family=Barlow:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    @page { size: letter; margin: 12mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { font-family: Barlow, Arial, sans-serif; color: #0a1650; font-size: 11px; margin: 0; }
    .hd { display: flex; align-items: center; gap: 14px; border-bottom: 4px solid #f5c21b; padding-bottom: 8px; }
    .hd img { height: 58px; }
    .t1 { font: italic 900 22px/1 "Barlow Condensed"; color: #071a66; }
    .t2 { font: italic 900 16px/1.1 "Barlow Condensed"; color: #d4122b; }
    .band { margin: 10px 0; background: #071a66; color: #fff; display: flex; justify-content: space-between; align-items: center; padding: 6px 12px; }
    .band b { font: italic 900 18px "Barlow Condensed"; }
    .band span { font: 800 13px "Barlow Condensed"; background: #f5c21b; color: #071a66; padding: 2px 10px; }
    .judge-box { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 10px; background: #f2f5ff; border: 1.5px solid #c5d0f2; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; }
    .judge-box div small { display: block; font-size: 9.5px; text-transform: uppercase; color: #5a6596; font-weight: 700; }
    .judge-box div strong { font-size: 14px; color: #071a66; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
    th { background: #071a66; color: #f5c21b; font: 800 12.5px "Barlow Condensed"; padding: 6px; border: 1px solid #071a66; }
    td { border: 1px solid #bfc9eb; padding: 7px 6px; vertical-align: middle; }
    .c { text-align: center; }
    .score-cell { width: 64px; font-weight: 700; font-size: 13px; }
    .cell-div { border: 0; border-top: 1px dashed #bfc9eb; margin: 6px 0; }
    .sig-cell { width: 145px; font-size: 8.5px; color: #5a6596; }
    .mini-line { border-top: 1px solid #0a1650; padding-top: 2px; margin-top: 12px; text-align: center; }
    .footer-sigs { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 38px; break-inside: avoid; }
    .footer-sigs div { border-top: 1.5px solid #071a66; padding-top: 5px; text-align: center; font-size: 11px; }
  </style></head><body>
    <div class="hd">
      <img src="./assets/logo-ccl.png" onerror="this.style.display='none'">
      <div>
        <div class="t1">I CAMPEONATO DE MATEMÁTICAS · JOSÉ ÁVILA CHANDÍA</div>
        <div class="t2">ACTA DE SALA Y REGISTRO OFICIAL DE PARTIDOS POR JUEZ</div>
        <div style="font-size:10.5px;color:#4a5488">Liceo Bicentenario de Excelencia Colegio Concepción Linares · Formato CMAT</div>
      </div>
    </div>

    <div class="band">
      <b>PLANILLA DE CONTROL DE SALA Y ACTA DE ENCUENTROS</b>
      <span>CÓDIGO ${draw.code || 'SIN SORTEO'}</span>
    </div>

    <div class="judge-box">
      <div><small>Juez / Árbitro Asignado</small><strong>${esc(judge.name)}</strong> (${esc(judge.role)})</div>
      <div><small>Sala Fija (6 Partidos)</small><strong>${esc(roomDisplay)}</strong></div>
      <div><small>Total Encuentros</small><strong>${judgeMatches.length} Partidos</strong></div>
    </div>

    ${judgeMatches.length === 0
      ? `<p>Este juez aún no tiene partidos asignados en el fixture.</p>`
      : `<table>
          <thead>
            <tr>
              <th>Partido / Hora</th>
              <th>Grupo / Sala</th>
              <th>Equipos Enfrentados</th>
              <th>Puntos</th>
              <th>Penaliz.</th>
              <th>Conformidad Docentes</th>
            </tr>
          </thead>
          <tbody>${rowsHTML}</tbody>
        </table>`
    }

    <p style="font-size:10px;color:#4a5488">Instrucciones: El juez deberá registrar los puntos obtenidos y penalizaciones de cada equipo al término de cada bloque horario, recabando la firma de los docentes encargados y entregando esta acta en Coordinación General.</p>

    <div class="footer-sigs">
      <div><b>${esc(judge.name)}</b><br>Firma Juez / Árbitro de Sala (${esc(roomDisplay)})</div>
      <div><b>Prof. Rodrigo Pérez Carrasco</b><br>Recepción Coordinación General</div>
    </div>
    <script>window.addEventListener('load', () => setTimeout(() => window.print(), 400));</script>
  </body></html>`;

  openPrintWindow(html);
}

/**
 * 3. Impresión de resultados oficiales filtrados por Jornada (1, 2 o Ambas).
 */
export function printJornadaResults(state, resolvedMatches, jornadaFilter = 'all') {
  const { draw, judges } = state;
  if (!draw.completed) return;

  const judgeMap = new Map(judges.map(j => [j.id, j.name]));
  const jornadas = jornadaFilter === 'all' ? [1, 2] : [Number(jornadaFilter)];
  const titleSuffix = jornadaFilter === '1'
    ? 'PRIMERA JORNADA (20 DE NOVIEMBRE)'
    : jornadaFilter === '2'
      ? 'SEGUNDA JORNADA (27 DE NOVIEMBRE)'
      : 'TODAS LAS JORNADAS (1 Y 2)';

  const bodySections = jornadas.map(jNum => {
    const schedules = Object.entries(SCHEDULE_CONFIG).filter(([, s]) => s.jornada === jNum);
    const tablesHTML = schedules.map(([pKey, sched]) => {
      const pNum = Number(pKey);
      const block = resolvedMatches.filter(m => m.partidoNum === pNum);
      return `
        <table>
          <thead>
            <tr>
              <th colspan="6">${sched.label} · ${sched.hora} HRS</th>
            </tr>
            <tr class="sub-th">
              <th>Sala / Juez</th>
              <th>Grupo</th>
              <th>Equipo A</th>
              <th>Marcador</th>
              <th>Equipo B</th>
              <th>Resultado / Estado</th>
            </tr>
          </thead>
          <tbody>
            ${block.map(m => {
              const nameA = m.teamA ? `${esc(m.seedA)} · ${esc(m.teamA.school)}` : esc(m.seedA);
              const nameB = m.teamB ? `${esc(m.seedB)} · ${esc(m.teamB.school)}` : esc(m.seedB);
              const played = m.ptsA !== null && m.ptsB !== null;
              const scoreText = played
                ? `<b>${m.ptsA}</b> - <b>${m.ptsB}</b><br><span style="font-size:9px;color:#a80e22">Pen: ${m.penA ?? 0} / ${m.penB ?? 0}</span>`
                : '— vs —';

              let statusText = 'Pendiente';
              if (played) {
                if (m.ptsA > m.ptsB) statusText = `Ganador: ${esc(m.teamA?.school || m.seedA)}`;
                else if (m.ptsB > m.ptsA) statusText = `Ganador: ${esc(m.teamB?.school || m.seedB)}`;
                else statusText = 'Empate (1 pt c/u)';
              }

              const jName = judgeMap.get(m.judgeId) || 'Sin juez';
              return `
                <tr>
                  <td class="c"><b>${esc(m.sala || '—')}</b><br><span style="font-size:9px">${esc(jName)}</span></td>
                  <td class="c">${m.grupo === 'F' ? `Final ${m.targetRank}°` : `Grupo ${m.grupo}`}</td>
                  <td>${nameA}</td>
                  <td class="c">${scoreText}</td>
                  <td>${nameB}</td>
                  <td style="font-size:10px">${statusText}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `;
    }).join('');

    return `<h3>${JORNADAS_INFO[jNum]}</h3>${tablesHTML}`;
  }).join('');

  const html = `<!DOCTYPE html>
  <html lang="es"><head><meta charset="utf-8"><title>Resultados ${titleSuffix}</title>
  <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,700;0,800;1,800;1,900&family=Barlow:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    @page { size: letter; margin: 11mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { font-family: Barlow, Arial, sans-serif; color: #0a1650; font-size: 10.5px; margin: 0; }
    .hd { display: flex; align-items: center; gap: 14px; border-bottom: 4px solid #f5c21b; padding-bottom: 8px; }
    .hd img { height: 56px; }
    .t1 { font: italic 900 22px/1 "Barlow Condensed"; color: #071a66; }
    .t2 { font: italic 900 16px/1.1 "Barlow Condensed"; color: #d4122b; }
    .band { margin: 10px 0; background: #071a66; color: #fff; display: flex; justify-content: space-between; align-items: center; padding: 6px 12px; }
    .band b { font: italic 900 17px "Barlow Condensed"; }
    .band span { font: 800 13px "Barlow Condensed"; background: #f5c21b; color: #071a66; padding: 2px 10px; }
    h3 { font: italic 900 17px "Barlow Condensed"; color: #071a66; border-left: 5px solid #d4122b; padding-left: 8px; margin: 14px 0 8px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 10px; break-inside: avoid; }
    th { background: #071a66; color: #f5c21b; font: 800 12.5px "Barlow Condensed"; padding: 4px 6px; text-align: left; border: 1px solid #071a66; }
    .sub-th th { background: #eef2ff; color: #071a66; font-size: 11px; border: 1px solid #c9d2f2; }
    td { border: 1px solid #c9d2f2; padding: 4px 6px; }
    .c { text-align: center; }
    .coord-sig { margin: 30px auto 0; width: 320px; text-align: center; break-inside: avoid; }
    .coord-sig .sig-line { border-top: 1.5px solid #071a66; margin-bottom: 4px; }
  </style></head><body>
    <div class="hd">
      <img src="./assets/logo-ccl.png" onerror="this.style.display='none'">
      <div>
        <div class="t1">I CAMPEONATO DE MATEMÁTICAS · JOSÉ ÁVILA CHANDÍA</div>
        <div class="t2">BOLETÍN OFICIAL DE RESULTADOS · ${titleSuffix}</div>
        <div style="font-size:10px;color:#4a5488">LBE Colegio Concepción Linares · Emitido: ${new Date().toLocaleString('es-CL')}</div>
      </div>
    </div>
    <div class="band"><b>RESULTADOS POR JORNADA Y SALA</b><span>CÓDIGO ${draw.code}</span></div>
    ${bodySections}
    <div class="coord-sig">
      <div class="sig-line"></div>
      <b>Prof. Rodrigo Pérez Carrasco</b><br>
      <span>Coordinador General · I Campeonato de Matemáticas José Ávila Chandía</span>
    </div>
    <script>window.addEventListener('load', () => setTimeout(() => window.print(), 400));</script>
  </body></html>`;

  openPrintWindow(html);
}

export function printStandingsReport(state, standingsA, standingsB) {
  const { draw } = state;
  const renderRows = rows => rows.map(r => `
    <tr>
      <td class="c"><b>${r.rank}°</b></td>
      <td><b>${esc(r.team.school)}</b> ${r.team.team ? `(${esc(r.team.team)})` : ''}</td>
      <td class="c">${r.PJ}</td>
      <td class="c">${r.PG}</td>
      <td class="c">${r.PE}</td>
      <td class="c">${r.PP}</td>
      <td class="c">${r.PF}</td>
      <td class="c">${r.PC}</td>
      <td class="c"><b>${r.DIF > 0 ? '+' + r.DIF : r.DIF}</b></td>
      <td class="c">${r.PEN}</td>
      <td class="c"><b>${r.PTS}</b></td>
    </tr>
  `).join('');

  const html = `<!DOCTYPE html>
  <html lang="es"><head><meta charset="utf-8"><title>Tabla de Posiciones ${draw.code || 'CMAT'}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #0a1650; font-size: 12px; padding: 16px; }
    h2 { margin: 0 0 4px; color: #071a66; }
    h3 { background: #071a66; color: #f5c21b; padding: 6px 10px; margin: 16px 0 6px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #c9d2f2; padding: 5px 7px; }
    th { background: #eef2ff; }
    .c { text-align: center; }
  </style></head><body>
    <h2>I CAMPEONATO DE MATEMÁTICAS JOSÉ ÁVILA CHANDÍA — TABLA DE POSICIONES</h2>
    <div>LBE Colegio Concepción Linares · Código: <b>${draw.code || 'Sin código'}</b> · Emitido: ${new Date().toLocaleString('es-CL')}</div>
    <h3>GRUPO A</h3>
    <table><thead><tr><th>#</th><th>Colegio</th><th>PJ</th><th>PG</th><th>PE</th><th>PP</th><th>PF</th><th>PC</th><th>DIF</th><th>PEN</th><th>PTS</th></tr></thead><tbody>${renderRows(standingsA)}</tbody></table>
    <h3>GRUPO B</h3>
    <table><thead><tr><th>#</th><th>Colegio</th><th>PJ</th><th>PG</th><th>PE</th><th>PP</th><th>PF</th><th>PC</th><th>DIF</th><th>PEN</th><th>PTS</th></tr></thead><tbody>${renderRows(standingsB)}</tbody></table>
    <p style="font-size:11px;color:#4a5488">Puntuación: 3 pts victoria, 1 pt empate, 0 pts derrota. Desempate: 1° Diferencia de puntos (PF-PC), 2° Enfrentamiento directo, 3° Menor cantidad de penalizaciones.</p>
    <div style="margin:36px auto 0;width:300px;text-align:center;border-top:1.5px solid #071a66;padding-top:4px;font-size:11px">
      <b>Prof. Rodrigo Pérez Carrasco</b><br>Coordinador General Campeonato
    </div>
    <script>window.addEventListener('load', () => setTimeout(() => window.print(), 400));</script>
  </body></html>`;

  openPrintWindow(html);
}