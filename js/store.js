import {
  STORAGE_KEYS,
  DEFAULT_TEAMS_RAW,
  DEFAULT_ROOMS,
  DEFAULT_JUDGES,
  parseTeamsText
} from './config.js';
import {
  buildTournamentMatches,
  autoAssignResources,
  hasResourceCollision
} from './fixtureEngine.js';

class TournamentStore {
  constructor() {
    this.listeners = new Set();
    this.state = this.loadInitialState();
  }

  loadInitialState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.STATE);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.teams) && parsed.teams.length === 12) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('No se pudo leer estado previo:', e);
    }

    const legacyTeams = localStorage.getItem(STORAGE_KEYS.LEGACY_TEAMS);
    const teamsRaw = legacyTeams || DEFAULT_TEAMS_RAW;
    const teams = parseTeamsText(teamsRaw);

    return {
      teamsRaw,
      teams: teams.length === 12 ? teams : parseTeamsText(DEFAULT_TEAMS_RAW),
      rooms: [...DEFAULT_ROOMS],
      judges: [...DEFAULT_JUDGES],
      draw: {
        completed: false,
        code: '',
        tStart: null,
        tEnd: null,
        order: [],
        groupA: [],
        groupB: []
      },
      matches: []
    };
  }

  persist() {
    try {
      localStorage.setItem(STORAGE_KEYS.STATE, JSON.stringify(this.state));
      localStorage.setItem(STORAGE_KEYS.LEGACY_TEAMS, this.state.teamsRaw);
    } catch (e) {
      console.error('Error guardando estado en localStorage:', e);
    }
    this.notify();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    this.listeners.forEach(fn => fn(this.state));
  }

  getState() {
    return this.state;
  }

  recordBallExtraction({ code, tStart, order }) {
    const groupA = order.filter((_, i) => i % 2 === 0);
    const groupB = order.filter((_, i) => i % 2 === 1);

    this.state.draw = {
      completed: false,
      code,
      tStart: tStart ? tStart.toISOString() : new Date().toISOString(),
      tEnd: null,
      order: order.slice(),
      groupA,
      groupB
    };
    this.persist();
  }

  completeDraw({ code, tStart, tEnd, order }) {
    const groupA = order.filter((_, i) => i % 2 === 0);
    const groupB = order.filter((_, i) => i % 2 === 1);
    const matches = buildTournamentMatches(
      groupA,
      groupB,
      this.state.judges,
      this.state.rooms
    );

    this.state.draw = {
      completed: true,
      code,
      tStart: tStart.toISOString(),
      tEnd: tEnd.toISOString(),
      order: order.slice(),
      groupA,
      groupB
    };
    this.state.matches = matches;
    this.persist();
  }

  updateMatchScore(matchId, field, rawValue) {
    const match = this.state.matches.find(m => m.id === matchId);
    if (!match) return;

    if (field === 'ptsA' || field === 'ptsB') {
      match[field] = rawValue === '' ? null : Math.max(0, parseInt(rawValue, 10) || 0);
    } else if (field === 'penA' || field === 'penB') {
      match[field] = rawValue === '' ? 0 : Math.max(0, parseInt(rawValue, 10) || 0);
    }
    this.persist();
  }

  updateMatchResource(matchId, field, value) {
    const match = this.state.matches.find(m => m.id === matchId);
    if (!match) return { ok: false, reason: 'Partido no encontrado' };

    if (hasResourceCollision(this.state.matches, match, field, value)) {
      return {
        ok: false,
        reason: field === 'sala'
          ? `La ${value} ya está ocupada en el Partido ${match.partidoNum} (${match.hora})`
          : `Este juez ya está fijo en otra sala del campeonato`
      };
    }

    if (field === 'judgeId') {
      if (match.sala) {
        // Fija este juez a la misma sala durante los 6 partidos
        this.state.matches.forEach(m => {
          if (m.sala === match.sala) {
            m.judgeId = value;
          }
        });
      } else {
        match.judgeId = value;
      }
      this.persist();
      return {
        ok: true,
        message: value && match.sala
          ? `Juez fijado en ${match.sala} para los 6 partidos`
          : 'Asignación de juez actualizada'
      };
    }

    if (field === 'sala') {
      match.sala = value;
      if (value) {
        // Hereda el juez fijo que tenga asignada esa sala
        const fixedPeer = this.state.matches.find(m => m.id !== match.id && m.sala === value && m.judgeId);
        if (fixedPeer) {
          match.judgeId = fixedPeer.judgeId;
        }
      }
      this.persist();
      return { ok: true, message: 'Sala asignada sin conflictos' };
    }

    return { ok: true };
  }

  reassignAllResources() {
    if (!this.state.matches.length) return;
    this.state.matches = autoAssignResources(
      this.state.matches,
      this.state.judges,
      this.state.rooms
    );
    this.persist();
  }

  addJudge(name, role) {
    const cleanName = name.trim();
    if (!cleanName) return;
    this.state.judges.push({
      id: 'j-' + Date.now().toString(36),
      name: cleanName,
      role: role.trim() || 'Árbitro de Sala'
    });
    this.persist();
  }

  removeJudge(judgeId) {
    this.state.judges = this.state.judges.filter(j => j.id !== judgeId);
    this.state.matches.forEach(m => {
      if (m.judgeId === judgeId) m.judgeId = '';
    });
    this.persist();
  }

  updateRooms(roomsArray) {
    this.state.rooms = roomsArray;
    this.state.matches.forEach(m => {
      if (m.sala && !roomsArray.includes(m.sala)) m.sala = '';
    });
    this.persist();
  }

  updateTeams(teamsRaw, parsedTeams) {
    this.state.teamsRaw = teamsRaw;
    this.state.teams = parsedTeams;
    this.state.draw = {
      completed: false,
      code: '',
      tStart: null,
      tEnd: null,
      order: [],
      groupA: [],
      groupB: []
    };
    this.state.matches = [];
    this.persist();
  }

  importFullState(importedData) {
    if (!importedData || !Array.isArray(importedData.teams) || importedData.teams.length !== 12) {
      throw new Error('El archivo JSON no contiene una nómina válida de 12 equipos.');
    }
    this.state = {
      ...this.state,
      ...importedData
    };
    this.persist();
  }

  resetAll() {
    localStorage.removeItem(STORAGE_KEYS.STATE);
    this.state = this.loadInitialState();
    this.persist();
  }
}

export const store = new TournamentStore();