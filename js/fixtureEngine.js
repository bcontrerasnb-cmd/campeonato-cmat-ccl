import { SCHEDULE_CONFIG } from './config.js';

export function buildTournamentMatches(groupA, groupB, judges = [], rooms = []) {
  const idx = [0, 1, 2, 3, 4, 5];
  const rounds = [];
  let rot = [...idx];

  for (let r = 0; r < 5; r++) {
    rounds.push([
      [rot[0], rot[5]],
      [rot[1], rot[4]],
      [rot[2], rot[3]]
    ]);
    rot = [rot[0], rot[5], rot[1], rot[2], rot[3], rot[4]];
  }

  const matches = [];

  rounds.forEach((pairings, rIdx) => {
    const partidoNum = rIdx + 1;
    const sched = SCHEDULE_CONFIG[partidoNum];

    pairings.forEach((pair, k) => {
      const team1 = groupA[pair[0]];
      const team2 = groupA[pair[1]];
      matches.push({
        id: `P${partidoNum}-A-${k + 1}`,
        partidoNum,
        jornada: sched.jornada,
        fecha: sched.fecha,
        hora: sched.hora,
        grupo: 'A',
        isFinal: false,
        seedA: `A${pair[0] + 1}`,
        seedB: `A${pair[1] + 1}`,
        teamA: team1,
        teamB: team2,
        ptsA: null,
        ptsB: null,
        penA: 0,
        penB: 0,
        sala: '',
        judgeId: ''
      });
    });

    pairings.forEach((pair, k) => {
      const team1 = groupB[pair[0]];
      const team2 = groupB[pair[1]];
      matches.push({
        id: `P${partidoNum}-B-${k + 1}`,
        partidoNum,
        jornada: sched.jornada,
        fecha: sched.fecha,
        hora: sched.hora,
        grupo: 'B',
        isFinal: false,
        seedA: `B${pair[0] + 1}`,
        seedB: `B${pair[1] + 1}`,
        teamA: team1,
        teamB: team2,
        ptsA: null,
        ptsB: null,
        penA: 0,
        penB: 0,
        sala: '',
        judgeId: ''
      });
    });
  });

  const finalSched = SCHEDULE_CONFIG[6];
  for (let rank = 1; rank <= 6; rank++) {
    matches.push({
      id: `P6-F-${rank}`,
      partidoNum: 6,
      jornada: finalSched.jornada,
      fecha: finalSched.fecha,
      hora: finalSched.hora,
      grupo: 'F',
      isFinal: true,
      targetRank: rank,
      seedA: `${rank}° Grupo A`,
      seedB: `${rank}° Grupo B`,
      teamA: null,
      teamB: null,
      ptsA: null,
      ptsB: null,
      penA: 0,
      penB: 0,
      sala: '',
      judgeId: ''
    });
  }

  return autoAssignResources(matches, judges, rooms);
}

/**
 * Asigna las 6 salas y vincula permanentemente a cada juez en su sala fija
 * durante los 6 partidos del campeonato (Partido 1 al 6).
 */
export function autoAssignResources(matches, judges, rooms) {
  const cloned = matches.map(m => ({ ...m }));

  const fixedJudgeByRoom = new Map();
  rooms.forEach((roomName, idx) => {
    const explicitJudge = judges.find(j => j.fixedRoom === roomName);
    const assignedJudge = explicitJudge || judges[idx];
    if (assignedJudge) {
      fixedJudgeByRoom.set(roomName, assignedJudge.id);
    }
  });

  for (let p = 1; p <= 6; p++) {
    const block = cloned.filter(m => m.partidoNum === p);
    const usedRooms = new Set();

    block.forEach((match, idx) => {
      const assignedRoom = rooms[idx] && !usedRooms.has(rooms[idx])
        ? rooms[idx]
        : (rooms.find(r => !usedRooms.has(r)) || '');

      match.sala = assignedRoom;
      if (assignedRoom) {
        usedRooms.add(assignedRoom);
        match.judgeId = fixedJudgeByRoom.get(assignedRoom) || '';
      } else {
        match.judgeId = '';
      }
    });
  }

  return cloned;
}

export function hasResourceCollision(matches, targetMatch, field, value) {
  if (!value) return false;
  if (field === 'judgeId') {
    return matches.some(
      m => m.judgeId === value && m.sala && targetMatch.sala && m.sala !== targetMatch.sala
    );
  }
  return matches.some(
    m => m.id !== targetMatch.id &&
         m.partidoNum === targetMatch.partidoNum &&
         m[field] === value
  );
}

export function auditScheduleCollisions(matches) {
  const issues = [];
  const roomJudgeMap = new Map();

  for (let p = 1; p <= 6; p++) {
    const block = matches.filter(m => m.partidoNum === p);
    const seenRooms = new Set();
    const seenJudges = new Set();

    block.forEach(m => {
      if (m.sala) {
        if (seenRooms.has(m.sala)) issues.push(`Partido ${p}: Sala duplicada (${m.sala})`);
        seenRooms.add(m.sala);
      }
      if (m.judgeId) {
        if (seenJudges.has(m.judgeId)) issues.push(`Partido ${p}: Juez duplicado en el mismo horario`);
        seenJudges.add(m.judgeId);
      }
      if (m.sala && m.judgeId) {
        if (!roomJudgeMap.has(m.sala)) {
          roomJudgeMap.set(m.sala, m.judgeId);
        } else if (roomJudgeMap.get(m.sala) !== m.judgeId) {
          issues.push(`${m.sala}: El juez debe mantenerse fijo para los 6 partidos`);
        }
      }
    });
  }
  return issues;
}