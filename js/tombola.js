import { getCrestPath } from './config.js';

const sleep = ms => new Promise(r => setTimeout(r, ms));

export function randInt(n) {
  const lim = Math.floor(4294967296 / n) * n;
  const a = new Uint32Array(1);
  let x;
  do {
    crypto.getRandomValues(a);
    x = a[0];
  } while (x >= lim);
  return x % n;
}

export function generateDrawCode() {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i++) s += alphabet[randInt(alphabet.length)];
  return `JAC-${s.slice(0, 3)}-${s.slice(3)}`;
}

export class TombolaController {
  constructor({ canvas, onBallExtracted, onDrawFinished }) {
    this.cv = canvas;
    this.cx = canvas.getContext('2d');
    this.C = 300;
    this.R = 262;
    this.BR = 42;
    this.balls = [];
    this.crestImages = new Map();
    this.mixing = false;
    this.ang = 0;

    this.teams = [];
    this.pool = [];
    this.order = [];
    this.code = '';
    this.tStart = null;
    this.tEnd = null;
    this.busy = false;
    this.auto = false;

    this.onBallExtracted = onBallExtracted;
    this.onDrawFinished = onDrawFinished;

    this.startLoop();
  }

  preloadCrests(teams) {
    teams.forEach(t => {
      const src = t.crest || getCrestPath(t.n);
      const img = new Image();
      img.onload = () => {
        this.crestImages.set(t.n, img);
      };
      img.onerror = () => {
        this.crestImages.delete(t.n);
      };
      img.src = src;
    });
  }

  setup(teams, savedDraw = null) {
    this.auto = false;
    this.busy = false;
    this.teams = teams.slice();
    this.preloadCrests(this.teams);

    if (savedDraw && savedDraw.completed && savedDraw.order.length === 12) {
      this.code = savedDraw.code;
      this.tStart = new Date(savedDraw.tStart);
      this.tEnd = new Date(savedDraw.tEnd);
      this.order = savedDraw.order.slice();
      this.pool = [];
      this.balls = [];
    } else if (savedDraw && !savedDraw.completed && Array.isArray(savedDraw.order) && savedDraw.order.length > 0) {
      this.code = savedDraw.code || generateDrawCode();
      this.tStart = savedDraw.tStart ? new Date(savedDraw.tStart) : null;
      this.tEnd = null;
      this.order = savedDraw.order.slice();
      const drawnIds = new Set(this.order.map(t => t.n));
      this.pool = teams.filter(t => !drawnIds.has(t.n));
      this.initBalls(this.pool);
    } else {
      this.code = generateDrawCode();
      this.tStart = null;
      this.tEnd = null;
      this.order = [];
      this.pool = teams.slice();
      this.initBalls(this.pool);
    }
  }

  initBalls(sourceTeams) {
    this.balls = [];
    sourceTeams.forEach(t => {
      let x, y, ok, k = 0;
      do {
        x = this.C + (Math.random() * 2 - 1) * (this.R - this.BR);
        y = this.C + (Math.random() * 2 - 1) * (this.R - this.BR);
        ok = Math.hypot(x - this.C, y - this.C) < this.R - this.BR &&
             this.balls.every(b => Math.hypot(b.x - x, b.y - y) > 2 * this.BR);
        k++;
      } while (!ok && k < 500);
      this.balls.push({ n: t.n, x, y, vx: 0, vy: 0 });
    });
  }

  physics() {
    const g = this.mixing ? 0.15 : 0.55;
    for (const b of this.balls) {
      b.vy += g;
      if (this.mixing) {
        const dx = b.x - this.C;
        const dy = b.y - this.C;
        b.vx += (Math.random() - 0.5) * 3.2 - dy * 0.004;
        b.vy += (Math.random() - 0.5) * 3.2 + dx * 0.004 - 0.35;
      }
      b.vx *= 0.985;
      b.vy *= 0.985;
      b.x += b.vx;
      b.y += b.vy;

      const dx = b.x - this.C;
      const dy = b.y - this.C;
      const d = Math.hypot(dx, dy);
      const lim = this.R - this.BR;
      if (d > lim) {
        const nx = dx / d;
        const ny = dy / d;
        b.x = this.C + nx * lim;
        b.y = this.C + ny * lim;
        const vn = b.vx * nx + b.vy * ny;
        if (vn > 0) {
          b.vx -= 1.75 * vn * nx;
          b.vy -= 1.75 * vn * ny;
        }
        if (!this.mixing) {
          b.vx *= 0.9;
          b.vy *= 0.9;
        }
      }
    }

    for (let i = 0; i < this.balls.length; i++) {
      for (let j = i + 1; j < this.balls.length; j++) {
        const a = this.balls[i];
        const b = this.balls[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 0.01;
        if (d < 2 * this.BR) {
          const nx = dx / d;
          const ny = dy / d;
          const o = (2 * this.BR - d) / 2;
          a.x -= nx * o;
          a.y -= ny * o;
          b.x += nx * o;
          b.y += ny * o;
          const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
          if (rv < 0) {
            const k = -0.9 * rv;
            a.vx -= k * nx;
            a.vy -= k * ny;
            b.vx += k * nx;
            b.vy += k * ny;
          }
        }
      }
    }
  }

  drawFrame() {
    const { cx, C, R, BR } = this;
    cx.clearRect(0, 0, 600, 600);
    cx.beginPath();
    cx.arc(C, C, R + 16, 0, Math.PI * 2);
    const bg = cx.createRadialGradient(C, C - 60, 20, C, C, R + 16);
    bg.addColorStop(0, 'rgba(60, 110, 255, 0.35)');
    bg.addColorStop(1, 'rgba(10, 30, 120, 0.25)');
    cx.fillStyle = bg;
    cx.fill();

    this.ang += this.mixing ? 0.09 : 0.004;
    cx.save();
    cx.translate(C, C);
    cx.rotate(this.ang);
    cx.strokeStyle = 'rgba(245, 194, 27, 0.22)';
    cx.lineWidth = 4;
    for (let k = 0; k < 6; k++) {
      cx.rotate(Math.PI / 3);
      cx.beginPath();
      cx.moveTo(0, 0);
      cx.lineTo(R + 12, 0);
      cx.stroke();
    }
    cx.restore();

    for (const b of this.balls) {
      const gr = cx.createRadialGradient(b.x - 12, b.y - 14, 4, b.x, b.y, BR);
      gr.addColorStop(0, '#fff7d6');
      gr.addColorStop(0.45, '#ffd84d');
      gr.addColorStop(0.85, '#f5c21b');
      gr.addColorStop(1, '#a87a05');
      cx.beginPath();
      cx.arc(b.x, b.y, BR, 0, Math.PI * 2);
      cx.fillStyle = gr;
      cx.fill();

      const innerR = BR * 0.78;
      cx.beginPath();
      cx.arc(b.x, b.y, innerR, 0, Math.PI * 2);
      cx.fillStyle = '#ffffff';
      cx.fill();

      const crestImg = this.crestImages.get(b.n);
      if (crestImg && crestImg.complete && crestImg.naturalWidth > 0) {
        cx.save();
        cx.beginPath();
        cx.arc(b.x, b.y, innerR - 2, 0, Math.PI * 2);
        cx.clip();

        const maxDim = (innerR - 4) * 2;
        const ratio = Math.min(maxDim / crestImg.naturalWidth, maxDim / crestImg.naturalHeight);
        const w = crestImg.naturalWidth * ratio;
        const h = crestImg.naturalHeight * ratio;
        cx.drawImage(crestImg, b.x - w / 2, b.y - h / 2, w, h);
        cx.restore();
      } else {
        cx.fillStyle = '#071a66';
        cx.font = '800 34px "Barlow Condensed", sans-serif';
        cx.textAlign = 'center';
        cx.textBaseline = 'middle';
        cx.fillText(b.n, b.x, b.y + 2);
      }
    }

    cx.beginPath();
    cx.arc(C, C, R + 16, 0, Math.PI * 2);
    cx.strokeStyle = '#d4122b';
    cx.lineWidth = 14;
    cx.stroke();

    cx.beginPath();
    cx.arc(C, C, R + 16, 0, Math.PI * 2);
    cx.strokeStyle = '#f5c21b';
    cx.lineWidth = 5;
    cx.stroke();
  }

  startLoop() {
    const tick = () => {
      this.physics();
      this.drawFrame();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  buildCrestHTML(team) {
    const src = team.crest || getCrestPath(team.n);
    return `
      <img src="${src}" alt="${team.school}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
      <span class="fallback-num" style="display:none">${team.n}</span>
    `;
  }

  animateFlightToGroup(team, group) {
    return new Promise(resolve => {
      const bigEl = document.getElementById('big');
      const listSelector = group === 'A' ? '#gA li:last-child' : '#gB li:last-child';
      const targetRow = document.querySelector(listSelector);
      const targetBadge = targetRow ? targetRow.querySelector('.crest-badge') : null;
      const groupCard = document.querySelector(`.group.${group}`);

      if (!bigEl || !targetRow || !targetBadge) {
        resolve();
        return;
      }

      targetRow.classList.add('awaiting-ball');
      bigEl.classList.add('flying-away');

      if (groupCard) {
        groupCard.classList.add('pulse-receive');
      }

      const startRect = bigEl.getBoundingClientRect();
      const endRect = targetBadge.getBoundingClientRect();

      if (!startRect.width || !endRect.width) {
        targetRow.classList.remove('awaiting-ball');
        targetRow.classList.add('just-landed');
        bigEl.classList.remove('flying-away');
        if (groupCard) groupCard.classList.remove('pulse-receive');
        resolve();
        return;
      }

      const fly = document.createElement('div');
      fly.className = 'fly-ball';
      fly.innerHTML = this.buildCrestHTML(team);

      const startX = startRect.left + startRect.width / 2 - 48;
      const startY = startRect.top + startRect.height / 2 - 48;
      const endX = endRect.left + endRect.width / 2 - 48;
      const endY = endRect.top + endRect.height / 2 - 48;

      fly.style.left = `${startX}px`;
      fly.style.top = `${startY}px`;
      document.body.appendChild(fly);

      const deltaX = endX - startX;
      const deltaY = endY - startY;

      const anim = fly.animate(
        [
          {
            transform: 'translate(0px, 0px) scale(1.083)',
            opacity: 1,
            easing: 'ease-in-out'
          },
          {
            transform: `translate(${deltaX * 0.25}px, ${deltaY * 0.22 - 75}px) scale(2.75)`,
            opacity: 1,
            offset: 0.34,
            easing: 'ease-in-out'
          },
          {
            transform: `translate(${deltaX * 0.6}px, ${deltaY * 0.56 - 55}px) scale(2.6)`,
            opacity: 1,
            offset: 0.66,
            easing: 'ease-in-out'
          },
          {
            transform: `translate(${deltaX}px, ${deltaY}px) scale(0.458)`,
            opacity: 1
          }
        ],
        {
          duration: 3600,
          fill: 'forwards'
        }
      );

      anim.onfinish = () => {
        targetRow.classList.remove('awaiting-ball');
        targetRow.classList.add('just-landed');

        const fadeOut = fly.animate(
          [{ opacity: 1 }, { opacity: 0 }],
          { duration: 350, easing: 'ease-out', fill: 'forwards' }
        );

        fadeOut.onfinish = () => {
          fly.remove();
        };

        if (groupCard) {
          setTimeout(() => groupCard.classList.remove('pulse-receive'), 850);
        }
        resolve();
      };
    });
  }

  async drawOne() {
    if (this.busy || !this.pool.length) return;
    this.busy = true;
    if (!this.tStart) this.tStart = new Date();

    const drawBtn = document.getElementById('drawBtn');
    const big = document.getElementById('big');
    const whoBox = document.querySelector('.who');
    drawBtn.disabled = true;

    // Desvanece pausadamente el resultado anterior antes de volver a agitar
    if (big.innerHTML || whoBox.classList.contains('reveal')) {
      big.classList.add('fade-reset');
      whoBox.classList.add('fade-reset');
      await sleep(550);
    }

    big.className = 'big';
    big.innerHTML = '';
    whoBox.className = 'who';
    document.getElementById('wS').textContent = '';
    document.getElementById('wE').textContent = '';
    document.getElementById('wG').textContent = '';

    this.mixing = true;
    await sleep(2200);
    this.mixing = false;

    const extracted = this.pool.splice(randInt(this.pool.length), 1)[0];
    this.order.push(extracted);
    this.balls = this.balls.filter(b => b.n !== extracted.n);

    // Salida pausada y fluida de 2.3s desde la tómbola hasta el medallón central
    big.innerHTML = this.buildCrestHTML(extracted);
    void big.offsetWidth;
    big.classList.add('land');
    await sleep(2250);

    const k = this.order.length;
    const group = k % 2 === 1 ? 'A' : 'B';
    const pos = Math.ceil(k / 2);

    document.getElementById('wS').textContent = extracted.school;
    document.getElementById('wE').textContent = extracted.team;
    document.getElementById('wG').innerHTML =
      `→ <span style="color:${group === 'A' ? '#6fa0ff' : '#ff6b7d'}">GRUPO ${group} (${group}${pos})</span>`;

    // Revelación pausada en cascada (2.25s) + pausa de lectura antes del vuelo al grupo
    void whoBox.offsetWidth;
    whoBox.classList.add('reveal');
    await sleep(2650);

    if (this.onBallExtracted) {
      this.onBallExtracted({
        code: this.code,
        tStart: this.tStart,
        team: extracted,
        group,
        pos,
        order: this.order.slice(),
        remaining: this.pool.length
      });
    }

    await this.animateFlightToGroup(extracted, group);
    await sleep(750);

    if (this.pool.length === 0) {
      this.tEnd = new Date();
      this.auto = false;
      if (this.onDrawFinished) {
        this.onDrawFinished({
          code: this.code,
          tStart: this.tStart,
          tEnd: this.tEnd,
          order: this.order.slice()
        });
      }
    } else {
      drawBtn.disabled = false;
    }

    this.busy = false;
  }

  async runAuto() {
    if (this.auto || !this.pool.length) return;
    this.auto = true;
    document.getElementById('autoBtn').disabled = true;
    while (this.pool.length && this.auto) {
      await this.drawOne();
      await sleep(1100);
    }
  }
}