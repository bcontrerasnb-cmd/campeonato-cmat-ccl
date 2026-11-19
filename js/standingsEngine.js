export function calculateGroupStandings(groupTeams, groupMatches) {
  if (!groupTeams || groupTeams.length === 0) return [];

  const statsMap = new Map();
  groupTeams.forEach((team, idx) => {
    statsMap.set(team.n, {
      team,
      seedPos: idx + 1,
      PJ: 0,
      PG: 0,
      PE: 0,
      PP: 0,
      PF: 0,
      PC: 0,
      DIF: 0,
      PEN: 0,
      PTS: 0,
      tieNote: ''
    });
  });

  const validMatches = groupMatches.filter(
    m => !m.isFinal && m.teamA && m.teamB && m.ptsA !== null && m.ptsB !== null
  );

  validMatches.forEach(m => {
    const rowA = statsMap.get(m.teamA.n);
    const rowB = statsMap.get(m.teamB.n);
    if (!rowA || !rowB) return;

    const pA = Number(m.ptsA) || 0;
    const pB = Number(m.ptsB) || 0;
    const penA = Number(m.penA) || 0;
    const penB = Number(m.penB) || 0;

    rowA.PJ += 1;
    rowB.PJ += 1;
    rowA.PF += pA;
    rowA.PC += pB;
    rowB.PF += pB;
    rowB.PC += pA;
    rowA.PEN += penA;
    rowB.PEN += penB;

    if (pA > pB) {
      rowA.PG += 1;
      rowA.PTS += 3;
      rowB.PP += 1;
    } else if (pB > pA) {
      rowB.PG += 1;
      rowB.PTS += 3;
      rowA.PP += 1;
    } else {
      rowA.PE += 1;
      rowB.PE += 1;
      rowA.PTS += 1;
      rowB.PTS += 1;
    }
  });

  const rows = Array.from(statsMap.values()).map(r => ({
    ...r,
    DIF: r.PF - r.PC
  }));

  function getHeadToHeadStats(teamN, tiedIdsSet) {
    let h2hPts = 0;
    let h2hDif = 0;
    validMatches.forEach(m => {
      const idA = m.teamA.n;
      const idB = m.teamB.n;
      if (tiedIdsSet.has(idA) && tiedIdsSet.has(idB)) {
        const pA = Number(m.ptsA) || 0;
        const pB = Number(m.ptsB) || 0;
        if (idA === teamN) {
          h2hDif += (pA - pB);
          if (pA > pB) h2hPts += 3;
          else if (pA === pB) h2hPts += 1;
        } else if (idB === teamN) {
          h2hDif += (pB - pA);
          if (pB > pA) h2hPts += 3;
          else if (pB === pA) h2hPts += 1;
        }
      }
    });
    return { h2hPts, h2hDif };
  }

  rows.sort((a, b) => {
    if (b.PTS !== a.PTS) return b.PTS - a.PTS;

    if (b.DIF !== a.DIF) {
      a.tieNote = 'Dif. Pts';
      b.tieNote = 'Dif. Pts';
      return b.DIF - a.DIF;
    }

    const tiedGroup = rows.filter(r => r.PTS === a.PTS && r.DIF === a.DIF);
    const tiedSet = new Set(tiedGroup.map(r => r.team.n));
    const hA = getHeadToHeadStats(a.team.n, tiedSet);
    const hB = getHeadToHeadStats(b.team.n, tiedSet);

    if (hB.h2hPts !== hA.h2hPts) {
      a.tieNote = 'Duelo Directo';
      b.tieNote = 'Duelo Directo';
      return hB.h2hPts - hA.h2hPts;
    }
    if (hB.h2hDif !== hA.h2hDif) {
      a.tieNote = 'Duelo Directo';
      b.tieNote = 'Duelo Directo';
      return hB.h2hDif - hA.h2hDif;
    }

    if (a.PEN !== b.PEN) {
      a.tieNote = 'Menos Penaliz.';
      b.tieNote = 'Menos Penaliz.';
      return a.PEN - b.PEN;
    }

    if (b.PF !== a.PF) return b.PF - a.PF;
    return a.seedPos - b.seedPos;
  });

  return rows.map((r, index) => ({
    ...r,
    rank: index + 1
  }));
}

export function resolveFinalCrossings(matches, standingsA, standingsB) {
  const groupMatches = matches.filter(m => !m.isFinal);
  const allGroupPlayed = groupMatches.length === 30 &&
    groupMatches.every(m => m.ptsA !== null && m.ptsB !== null);

  return matches.map(m => {
    if (!m.isFinal) return m;
    const rankIdx = m.targetRank - 1;
    const rowA = standingsA[rankIdx];
    const rowB = standingsB[rankIdx];

    return {
      ...m,
      isOfficialPairing: allGroupPlayed,
      teamA: rowA ? rowA.team : null,
      teamB: rowB ? rowB.team : null
    };
  });
}