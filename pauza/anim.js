/* «ПАУЗА» — серия 1. Анимация на canvas, синхронизированная с озвучкой.
   Каждый кадр — чистая функция времени render(t), поэтому один и тот же код
   используется и для проигрывания в браузере, и для покадрового рендера в видео. */
(() => {
'use strict';
const W = 1920, H = 1080, DUR = 70;

// ---------- утилиты ----------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const ss = (a, b, t) => { const k = clamp((t - a) / (b - a)); return k * k * (3 - 2 * k); };
const lin = (a, b, t) => clamp((t - a) / (b - a));
const eout = k => 1 - Math.pow(1 - k, 3);
const eio = k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
const back = k => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); };
const rnd = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const TAU = Math.PI * 2;
function mk(w = W, h = H) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function rr(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }
function cam(g, cx, cy, z, rot = 0) { g.translate(W / 2, H / 2); if (rot) g.rotate(rot); g.scale(z, z); g.translate(-cx, -cy); }
function shake(t, amp, seed = 0) { const f = Math.floor(t * 30); return [(rnd(f + seed) - .5) * amp, (rnd(f * 1.7 + 9 + seed) - .5) * amp]; }
// интерполяция по ключам [[t, v], ...] с плавностью
function keys(t, ks, ease = eio) {
  if (t <= ks[0][0]) return ks[0][1];
  for (let i = 1; i < ks.length; i++) if (t <= ks[i][0]) {
    const k = ease((t - ks[i - 1][0]) / (ks[i][0] - ks[i - 1][0]));
    const a = ks[i - 1][1], b = ks[i][1];
    return Array.isArray(a) ? a.map((v, j) => lerp(v, b[j], k)) : lerp(a, b, k);
  }
  return ks[ks.length - 1][1];
}

// ---------- «время мира»: замедляется и замирает после нажатия ----------
const FA = 22.35, FB = 23.05, WF = FA + (FB - FA) / 2;
const wtime = t => t < FA ? t : t < FB ? FA + (t - FA) - (t - FA) ** 2 / (2 * (FB - FA)) : WF;

// ---------- обратный отсчёт ----------
function timerVal(t) {
  if (t < 38.18) return 30;
  if (t < 60.57) return lerp(30, 3, (t - 38.18) / (60.57 - 38.18));
  return keys(t, [[60.57, 3], [61.78, 2], [62.76, 1], [63.75, 0]], k => k);
}
const timerInt = t => Math.max(0, Math.ceil(timerVal(t) - 1e-6));

// ---------- ресурсы ----------
const IMG = {};
const SPR = ['body', 'walk', 'front', 'profile', 'three4', 'think', 'skeptic', 'sarcastic', 'happy', 'surprise'];
function load(base) {
  return Promise.all([
    ...SPR.map(n => new Promise((res, rej) => { const i = new Image(); i.onload = () => { IMG[n] = i; res(); }; i.onerror = rej; i.src = base + 'sprites/' + n + '.webp'; })),
    document.fonts.load('900 80px Rubik', 'ПАУЗА09'), document.fonts.load('500 40px Rubik', 'Привет09'), document.fonts.load('300 40px Rubik', '7:42'), document.fonts.load('80px "Rubik Glitch"', 'ПАУЗА'),
  ]);
}

// =====================================================================
//                              КУХНЯ
// =====================================================================
const BIRD0 = [470, 330];
const SPOUT = [1600, 566], CUPTOP = 668;
function drawBird(g, x, y, wing, s = 1) {
  g.save(); g.translate(x, y); g.scale(s, s);
  const up = wing; // -1..1
  g.fillStyle = '#2a2420';
  // крыло дальнее
  g.beginPath(); g.moveTo(-2, -2); g.quadraticCurveTo(-14, -26 * up - 4, -34, -30 * up + 2); g.quadraticCurveTo(-18, -10 * up, 6, 0); g.fill();
  // тело
  g.beginPath(); g.ellipse(0, 0, 17, 6.5, -0.08, 0, TAU); g.fill();
  g.beginPath(); g.arc(15, -3, 5.2, 0, TAU); g.fill();
  g.beginPath(); g.moveTo(19, -4); g.lineTo(26, -2.5); g.lineTo(19.5, -1); g.fillStyle = '#d89a3a'; g.fill();
  g.fillStyle = '#2a2420';
  g.beginPath(); g.moveTo(-15, -1); g.lineTo(-29, -7); g.lineTo(-27, 3); g.closePath(); g.fill();
  // крыло ближнее с перьями
  g.beginPath(); g.moveTo(-4, -2); g.quadraticCurveTo(-2, -30 * up - 6, -24, -40 * up - 2);
  for (let i = 0; i < 4; i++) g.lineTo(-24 + i * 5, -40 * up + 2 + i * 7 * up + (i % 2) * 2);
  g.quadraticCurveTo(4, -6 * up, 8, 1); g.fillStyle = '#3a312b'; g.fill();
  g.beginPath(); g.arc(16.5, -4, 1.2, 0, TAU); g.fillStyle = '#fff'; g.fill();
  g.restore();
}

function drawKitchen(g, wt, o = {}) {
  // стена
  let gr = g.createLinearGradient(0, 0, 0, 880);
  gr.addColorStop(0, '#e8d3b8'); gr.addColorStop(1, '#cfb08c');
  g.fillStyle = gr; g.fillRect(-200, -200, W + 400, 1100);
  g.globalAlpha = .05; g.fillStyle = '#7a5a3a';
  for (let x = -200; x < W + 200; x += 46) g.fillRect(x, -200, 3, 1080);
  g.globalAlpha = 1;
  // окно
  g.save(); rr(g, 260, 130, 640, 560, 6); g.clip();
  gr = g.createLinearGradient(0, 130, 0, 690);
  gr.addColorStop(0, '#7fb6e2'); gr.addColorStop(.55, '#f6d6a4'); gr.addColorStop(1, '#ffad74');
  g.fillStyle = gr; g.fillRect(260, 130, 640, 560);
  // солнце
  gr = g.createRadialGradient(720, 560, 10, 720, 560, 260);
  gr.addColorStop(0, 'rgba(255,250,225,1)'); gr.addColorStop(.18, 'rgba(255,236,190,.9)'); gr.addColorStop(1, 'rgba(255,200,140,0)');
  g.fillStyle = gr; g.fillRect(260, 130, 640, 560);
  // облака
  g.fillStyle = 'rgba(255,240,225,.7)';
  for (let i = 0; i < 4; i++) { const cx = 300 + i * 170 + (wt * 4) % 40, cy = 220 + (i % 2) * 60; g.beginPath(); g.ellipse(cx, cy, 70, 14, 0, 0, TAU); g.ellipse(cx + 30, cy - 9, 40, 13, 0, 0, TAU); g.fill(); }
  // город
  for (let layer = 0; layer < 2; layer++) {
    g.fillStyle = layer ? '#9a6f66' : '#c89a8a';
    for (let i = 0; i < 14; i++) {
      const bw = 40 + rnd(i * 3 + layer) * 50, bx = 250 + i * 50 + layer * 20, bh = 70 + rnd(i * 7 + layer * 11) * (layer ? 120 : 170);
      g.fillRect(bx, 690 - bh - (layer ? 0 : 20), bw, bh + 30);
      if (layer) { g.fillStyle = 'rgba(255,220,150,.55)'; for (let w = 0; w < 6; w++) if (rnd(i * 13 + w) > .55) g.fillRect(bx + 8 + (w % 2) * 18, 690 - bh + 14 + Math.floor(w / 2) * 22, 8, 10); g.fillStyle = '#9a6f66'; }
    }
  }
  // птица
  const p = ((wt - WF) * 60 + 210) % 760; const bx = 260 + (p < 0 ? p + 760 : p) - 40;
  drawBird(g, bx, BIRD0[1] + Math.sin((wt - WF) * 1.7) * 12, Math.sin((wt - WF) * 9 + Math.PI / 2), o.birdScale || 1);
  g.restore();
  // рама
  g.strokeStyle = '#f4ede2'; g.lineWidth = 22; g.strokeRect(260, 130, 640, 560);
  g.fillStyle = '#f4ede2'; g.fillRect(571, 130, 18, 560); g.fillRect(260, 402, 640, 16);
  g.fillStyle = '#e9dfd0'; g.fillRect(232, 690, 696, 26); g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(232, 716, 696, 8);
  // растение на подоконнике
  g.fillStyle = '#b5643e'; g.beginPath(); g.moveTo(330, 690); g.lineTo(390, 690); g.lineTo(382, 640); g.lineTo(338, 640); g.fill();
  g.fillStyle = '#4d7a45';
  for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (i - 3) * .32 + Math.sin(wt * 1.3 + i) * .03; g.save(); g.translate(360, 642); g.rotate(a); g.beginPath(); g.ellipse(0, -38, 11, 40, 0, 0, TAU); g.fill(); g.restore(); }
  // шторы
  for (const side of [0, 1]) {
    g.save(); const sx = side ? 905 : 255, dir = side ? 1 : -1;
    gr = g.createLinearGradient(sx - 90, 0, sx + 90, 0); gr.addColorStop(0, '#a9483c'); gr.addColorStop(.5, '#c9614f'); gr.addColorStop(1, '#93392f');
    g.fillStyle = gr; g.beginPath(); g.moveTo(sx - 20 * dir, 100);
    const sway = Math.sin(wt * .8 + side) * 8;
    g.lineTo(sx + 95 * dir, 100); g.bezierCurveTo(sx + 70 * dir, 400, sx + 120 * dir + sway, 650, sx + 100 * dir + sway, 860);
    g.lineTo(sx - 30 * dir + sway, 860); g.bezierCurveTo(sx - 10 * dir, 600, sx + 10 * dir, 350, sx - 20 * dir, 100); g.fill();
    g.strokeStyle = 'rgba(0,0,0,.12)'; g.lineWidth = 3;
    for (let k = 1; k < 4; k++) { g.beginPath(); g.moveTo(sx + (k * 25 - 10) * dir, 110); g.quadraticCurveTo(sx + (k * 28) * dir, 500, sx + (k * 30 - 5) * dir + sway, 850); g.stroke(); }
    g.restore();
  }
  g.fillStyle = '#6e5440'; g.fillRect(200, 92, 760, 12);
  // часы
  drawClock(g, 1300, 230, 80, wt);
  // полка
  g.fillStyle = '#8a6346'; g.fillRect(1180, 420, 300, 14); g.fillStyle = 'rgba(0,0,0,.15)'; g.fillRect(1180, 434, 300, 6);
  const jars = [['#d9c6a5', 1200, 70], ['#8fb3a5', 1262, 92], ['#e2b36b', 1330, 60], ['#c7d2d8', 1390, 80]];
  for (const [c, x, h] of jars) { g.fillStyle = c; rr(g, x, 420 - h, 48, h, 8); g.fill(); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x + 8, 420 - h + 10, 6, h - 20); g.fillStyle = '#5a4030'; g.fillRect(x - 2, 420 - h - 8, 52, 10); }
  // пол
  gr = g.createLinearGradient(0, 860, 0, 1080); gr.addColorStop(0, '#9a6a48'); gr.addColorStop(1, '#6c4630');
  g.fillStyle = gr; g.fillRect(-200, 860, W + 400, 400);
  g.strokeStyle = 'rgba(40,20,10,.25)'; g.lineWidth = 2;
  for (let i = 0, y = 868; i < 9; i++, y += 10 + i * 6) { g.beginPath(); g.moveTo(-200, y); g.lineTo(W + 200, y); g.stroke(); }
  for (let i = -12; i < 14; i++) { g.beginPath(); g.moveTo(960 + i * 90, 860); g.lineTo(960 + i * 220, 1300); g.stroke(); }
  g.fillStyle = '#f0e6d8'; g.fillRect(-200, 848, W + 400, 16);
  // солнечные лучи
  g.save(); g.globalCompositeOperation = 'screen';
  gr = g.createLinearGradient(500, 300, 1100, 1080); gr.addColorStop(0, 'rgba(255,230,180,.35)'); gr.addColorStop(1, 'rgba(255,230,180,0)');
  g.fillStyle = gr; g.beginPath(); g.moveTo(290, 160); g.lineTo(880, 160); g.lineTo(1500, 1080); g.lineTo(560, 1080); g.fill();
  g.restore();
  // стол
  g.fillStyle = '#5c3e2c'; g.fillRect(1190, 790, 24, 260); g.fillRect(1790, 790, 24, 260);
  gr = g.createLinearGradient(0, 770, 0, 795); gr.addColorStop(0, '#8b5f42'); gr.addColorStop(1, '#5f3f2c');
  g.fillStyle = gr; g.fillRect(1150, 770, 700, 24);
  g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.ellipse(1500, 1060, 420, 26, 0, 0, TAU); g.fill();
  drawCoffeeMachine(g, wt, o);
  // пылинки в лучах
  g.fillStyle = 'rgba(255,248,225,.75)';
  for (let i = 0; i < 70; i++) {
    const bx = 400 + rnd(i) * 900, by = 200 + rnd(i + 50) * 800;
    const x = bx + Math.sin(wt * .4 + i) * 26 + (o.dustPush ? o.dustPush(i, bx, by) : 0), y = by - ((wt * 10 + i * 13) % 60) + Math.cos(wt * .5 + i) * 12;
    g.globalAlpha = .25 + rnd(i + 7) * .5; g.beginPath(); g.arc(x, y, 1.2 + rnd(i + 3) * 2.2, 0, TAU); g.fill();
  }
  g.globalAlpha = 1;
}

function drawClock(g, x, y, r, wt, detail = 0) {
  g.save(); g.translate(x, y);
  g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.arc(6, 8, r + 8, 0, TAU); g.fill();
  g.fillStyle = '#3b2b22'; g.beginPath(); g.arc(0, 0, r + 8, 0, TAU); g.fill();
  const gr = g.createRadialGradient(-r * .3, -r * .3, 4, 0, 0, r); gr.addColorStop(0, '#fffdf8'); gr.addColorStop(1, '#e9e1d3');
  g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
  g.fillStyle = '#2b211b';
  for (let i = 0; i < 60; i++) { g.save(); g.rotate(i / 60 * TAU); const big = i % 5 === 0; g.fillRect(-(big ? 2.2 : .8) * r / 80, -r * .92, (big ? 4.4 : 1.6) * r / 80, (big ? 12 : 5) * r / 80); g.restore(); }
  g.font = `500 ${r * .2}px Rubik`; g.textAlign = 'center'; g.textBaseline = 'middle';
  for (let i = 1; i <= 12; i++) { const a = i / 12 * TAU; g.fillText(i, Math.sin(a) * r * .7, -Math.cos(a) * r * .7); }
  const time = 7 * 3600 + 42 * 60 + 10 + wt;
  const sec = Math.floor(time) + back(clamp((time % 1) / .18));
  const hand = (a, len, wdt, col) => { g.save(); g.rotate(a); g.fillStyle = col; rr(g, -wdt / 2, -len, wdt, len + r * .12, wdt / 2); g.fill(); g.restore(); };
  hand(time / 43200 * TAU, r * .5, r * .07, '#2b211b');
  hand(time / 3600 * TAU, r * .75, r * .045, '#2b211b');
  const jit = wt >= WF - 1e-6 && detail ? Math.sin(performanceT * 90) * .006 : 0;
  hand(sec / 60 * TAU + jit, r * .85, r * .018, '#c83a2c');
  g.fillStyle = '#c83a2c'; g.beginPath(); g.arc(0, 0, r * .05, 0, TAU); g.fill();
  // стекло
  g.fillStyle = 'rgba(255,255,255,.22)'; g.beginPath(); g.ellipse(-r * .3, -r * .35, r * .5, r * .22, -.6, 0, TAU); g.fill();
  g.restore();
}
let performanceT = 0;

function dropPos(i, wt) {
  const p = ((wt * 1.4 + i / 5) % 1 + 1) % 1;
  return [SPOUT[0], SPOUT[1] + 8 + p * p * (CUPTOP - SPOUT[1] - 8), p];
}
function drawDrop(g, x, y, s, rot = 0) {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
  const gr = g.createLinearGradient(-4, -8, 4, 6); gr.addColorStop(0, '#7a4a2a'); gr.addColorStop(1, '#2e170b');
  g.fillStyle = gr; g.beginPath(); g.moveTo(0, -9); g.bezierCurveTo(3.5, -3, 4.6, 0, 4.6, 2.4); g.arc(0, 2.4, 4.6, 0, Math.PI); g.bezierCurveTo(-4.6, 0, -3.5, -3, 0, -9); g.fill();
  g.fillStyle = 'rgba(255,240,220,.8)'; g.beginPath(); g.ellipse(-1.5, 1, .9, 1.8, -.3, 0, TAU); g.fill();
  g.restore();
}
function drawCoffeeMachine(g, wt, o) {
  // корпус
  let gr = g.createLinearGradient(1500, 0, 1700, 0); gr.addColorStop(0, '#2b2e33'); gr.addColorStop(.5, '#4a4f57'); gr.addColorStop(1, '#23262a');
  g.fillStyle = gr; rr(g, 1500, 430, 200, 115, 14); g.fill();
  g.fillStyle = gr; g.fillRect(1650, 520, 50, 240);
  g.fillStyle = '#1b1d20'; rr(g, 1495, 742, 210, 28, 6); g.fill();
  g.fillStyle = '#9aa0a8'; g.fillRect(1510, 742, 140, 4);
  g.fillStyle = '#c0c6cc'; rr(g, 1585, 540, 30, 22, 4); g.fill();
  g.fillStyle = '#6fd0ff'; g.beginPath(); g.arc(1530, 470, 5, 0, TAU); g.fill();
  g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(1512, 440, 8, 95);
  // кружка
  g.fillStyle = '#f3efe9'; rr(g, 1560, 660, 80, 82, 10); g.fill();
  g.strokeStyle = '#f3efe9'; g.lineWidth = 9; g.beginPath(); g.arc(1642, 698, 18, -1.2, 1.2); g.stroke();
  g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(1618, 662, 20, 78);
  g.fillStyle = '#3a1f10'; g.beginPath(); g.ellipse(1600, CUPTOP, 37, 7, 0, 0, TAU); g.fill();
  // струйка капель
  const push = o.dropPush || 0;
  for (let i = 0; i < 5; i++) {
    const [x, y, p] = dropPos(i, wt);
    const dx = push * (90 + i * 26), dy = -push * (10 + i * 6);
    drawDrop(g, x + dx, y + dy, .9 + p * .4, push * (0.5 + i * .3));
  }
  // корона брызг
  const [, , p0] = dropPos(4, wt);
  const sp = ((wt * 1.4 + .9) % 1 + 1) % 1;
  if (sp < .35) {
    const k = sp / .35;
    g.fillStyle = '#4a2814';
    for (let j = 0; j < 7; j++) { const a = Math.PI + (j + .5) / 7 * Math.PI; const rr2 = 6 + k * 22; g.beginPath(); g.arc(1600 + Math.cos(a) * rr2 * 1.4 + push * 100, CUPTOP + Math.sin(a) * rr2 * .9 - k * 6 - push * 14, 2.4 * (1 - k * .5), 0, TAU); g.fill(); }
  }
  // пар
  g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = 5; g.lineCap = 'round';
  for (let j = 0; j < 3; j++) {
    g.beginPath(); const ph = wt * 1.1 + j * 2.1; g.globalAlpha = .45;
    for (let s = 0; s <= 20; s++) { const yy = 650 - s * 6, xx = 1575 + j * 25 + Math.sin(ph + s * .35) * 8 + (o.steamPush || 0) * s * 3; s ? g.lineTo(xx, yy) : g.moveTo(xx, yy); }
    g.stroke();
  }
  g.globalAlpha = 1; g.lineCap = 'butt';
}

// Ильмир целиком (стоит)
function drawElmirStand(g, x, feetY, h, t, flip = 1) {
  const im = IMG.body, s = h / im.height, w = im.width * s;
  g.save(); g.translate(x, feetY);
  g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(0, 0, w * .38, 16, 0, 0, TAU); g.fill();
  g.rotate(Math.sin(t * .9) * .006); g.scale(flip, 1 + Math.sin(t * 2.1) * .004);
  g.drawImage(im, -w / 2, -h, w, h);
  g.restore();
}
function drawElmirWalk(g, x, feetY, h, phase, flip = -1, breath = 0) {
  const im = IMG.walk, s = h / im.height, w = im.width * s;
  g.save(); g.translate(x, feetY);
  g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(0, 0, w * .45, 14, 0, 0, TAU); g.fill();
  const bob = Math.abs(Math.sin(phase)) * 12;
  g.translate(0, -bob); g.rotate(Math.sin(phase) * .025);
  g.scale(flip, 1 + breath * .012);
  g.drawImage(im, -w / 2, -h, w, h);
  g.restore();
}

// ---------- кэш размытых фонов ----------
const CACHE = {};
const BGS = {
  kw: [gg => { gg.save(); cam(gg, 1100, 500, 1.3); drawKitchen(gg, 5); gg.restore(); }, 22],
  kfz: [gg => { gg.save(); cam(gg, 1100, 500, 1.3); drawKitchen(gg, WF); gg.restore(); }, 22],
  corrB: [gg => { drawCorridor(gg, { figZ: 99 }); }, 18],
};
function blurred(key) {
  if (CACHE[key]) return CACHE[key];
  const [fn, px] = BGS[key];
  const a = mk(), ga = a.getContext('2d'); fn(ga);
  const b = mk(), gb = b.getContext('2d'); gb.filter = `blur(${px}px)`; gb.drawImage(a, 0, 0); gb.filter = 'none';
  return CACHE[key] = b;
}
function frozenFilter(g, src, f, x = 0, y = 0) {
  g.filter = `saturate(${1 - .6 * f}) brightness(${1 - .06 * f}) contrast(${1 + .12 * f})`;
  g.drawImage(src, x, y); g.filter = 'none';
  if (f > 0) { g.save(); g.globalCompositeOperation = 'multiply'; g.fillStyle = `rgba(165,195,245,${.5 * f})`; g.fillRect(0, 0, W, H); g.restore(); }
}
const B1 = mk(), b1 = B1.getContext('2d');
const B2 = mk(), b2 = B2.getContext('2d');
function clear(g) { g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.filter = 'none'; g.clearRect(0, 0, W, H); }

// мир кухни через камеру; frozen 0..1
function kitchenShot(g, t, c, frozen, extra) {
  clear(b1); b1.save(); cam(b1, ...c); drawKitchen(b1, wtime(t), extra || {}); b1.restore();
  frozenFilter(g, B1, frozen);
}

// =====================================================================
//                              ТЕЛЕФОН
// =====================================================================
const PH = { x: 710, y: 60, w: 500, h: 1000, in: 18 };
const SW = PH.w - PH.in * 2, SHh = PH.h - PH.in * 2;
const ICON = 92, ICOLS = 4, IGAP = (SW - ICOLS * ICON) / (ICOLS + 1);
const iconPos = (c, r) => [IGAP + c * (ICON + IGAP), 150 + r * 132];
const NEWC = 1, NEWR = 2;
function iconWorld() { const [x, y] = iconPos(NEWC, NEWR); return [PH.x + PH.in + x + ICON / 2, PH.y + PH.in + y + ICON / 2]; }

function drawHandBack(g) {
  // ладонь и пальцы за телефоном
  const gr = g.createLinearGradient(600, 700, 900, 1100); gr.addColorStop(0, '#e9b591'); gr.addColorStop(1, '#c98a66');
  g.fillStyle = gr;
  g.beginPath(); g.ellipse(800, 1040, 220, 170, -.3, 0, TAU); g.fill();
}
function drawHandFront(g) {
  const gr = g.createLinearGradient(620, 600, 760, 900); gr.addColorStop(0, '#efbd9a'); gr.addColorStop(1, '#cf916c');
  g.fillStyle = gr;
  for (let i = 0; i < 4; i++) {
    g.save(); g.translate(712, 590 + i * 96 - i * i * 4); g.rotate(.1 - i * .05);
    const fg = g.createLinearGradient(0, -40, 0, 40); fg.addColorStop(0, '#f2c4a2'); fg.addColorStop(.6, '#dca07c'); fg.addColorStop(1, '#b97856');
    g.fillStyle = fg; rr(g, -260, -40, 300 - i * 12, 82, 41); g.fill();
    g.fillStyle = 'rgba(255,235,220,.55)'; rr(g, -6 - i * 12, -28, 34, 50, 17); g.fill();
    g.strokeStyle = 'rgba(120,60,40,.25)'; g.lineWidth = 3; g.beginPath(); g.moveTo(-70 - i * 12, -30); g.quadraticCurveTo(-60 - i * 12, 0, -70 - i * 12, 30); g.stroke();
    g.restore();
  }
  g.fillStyle = gr;
  // большой палец снизу справа
  g.save(); g.translate(1180, 960); g.rotate(-.9); rr(g, -55, -150, 110, 260, 55); g.fill();
  g.fillStyle = 'rgba(255,225,205,.6)'; g.beginPath(); g.ellipse(0, -110, 30, 24, 0, 0, TAU); g.fill(); g.restore();
  // рукав куртки
  g.fillStyle = '#22304d'; g.beginPath(); g.moveTo(540, 1080); g.quadraticCurveTo(700, 960, 980, 1100); g.lineTo(540, 1180); g.fill();
  g.fillStyle = '#1a2640'; for (let i = 0; i < 10; i++) g.fillRect(580 + i * 36, 1030 + i * 6, 6, 50);
}
function drawPhone(g, t, content) {
  // корпус
  g.save();
  g.shadowColor = 'rgba(0,0,0,.5)'; g.shadowBlur = 60; g.shadowOffsetY = 25;
  const gr = g.createLinearGradient(PH.x, 0, PH.x + PH.w, 0); gr.addColorStop(0, '#2a2d33'); gr.addColorStop(.06, '#5b606a'); gr.addColorStop(.12, '#1c1e22'); gr.addColorStop(.9, '#1c1e22'); gr.addColorStop(1, '#4a4e56');
  g.fillStyle = gr; rr(g, PH.x, PH.y, PH.w, PH.h, 70); g.fill();
  g.restore();
  g.fillStyle = '#050506'; rr(g, PH.x + 8, PH.y + 8, PH.w - 16, PH.h - 16, 62); g.fill();
  g.save(); rr(g, PH.x + PH.in, PH.y + PH.in, SW, SHh, 54); g.clip();
  g.translate(PH.x + PH.in, PH.y + PH.in);
  content(g);
  // динамический остров
  g.fillStyle = '#000'; rr(g, SW / 2 - 62, 16, 124, 36, 18); g.fill();
  // отражение стекла
  const rg = g.createLinearGradient(0, 0, SW, SHh); rg.addColorStop(0, 'rgba(255,255,255,.07)'); rg.addColorStop(.35, 'rgba(255,255,255,0)'); rg.addColorStop(.36, 'rgba(255,255,255,.04)'); rg.addColorStop(.5, 'rgba(255,255,255,0)');
  g.fillStyle = rg; g.fillRect(0, 0, SW, SHh);
  g.restore();
}
function statusBar(g, light = true) {
  g.fillStyle = light ? '#fff' : '#ddd'; g.font = '600 22px Rubik'; g.textAlign = 'left'; g.textBaseline = 'middle';
  g.fillText('7:42', 44, 36);
  rr(g, SW - 78, 27, 38, 18, 5); g.strokeStyle = g.fillStyle; g.lineWidth = 2; g.stroke(); g.fillRect(SW - 75, 30, 26, 12);
  for (let i = 0; i < 4; i++) g.fillRect(SW - 126 + i * 8, 42 - i * 4, 5, 4 + i * 4);
}
const APPS = [['#ff7a59', 'Почта'], ['#ffd166', 'Заметки'], ['#06d6a0', 'Карты'], ['#118ab2', 'Погода'], ['#ef476f', 'Музыка'], ['#8338ec', 'Фото'], ['#3a86ff', 'Камера'], ['#fb5607', 'Часы'],
  ['#2ec4b6', 'Банк'], null, ['#ff006e', 'Видео'], ['#90be6d', 'Шаги'], ['#577590', 'Файлы'], ['#f9c74f', 'Такси'], ['#43aa8b', 'Звонки'], ['#f94144', 'Новости']];
function glyph(g, i, x, y, s) {
  g.fillStyle = 'rgba(255,255,255,.92)'; g.strokeStyle = 'rgba(255,255,255,.92)'; g.lineWidth = s * .07;
  const c = x + s / 2, m = y + s / 2;
  switch (i % 6) {
    case 0: g.beginPath(); g.arc(c, m, s * .22, 0, TAU); g.stroke(); break;
    case 1: rr(g, c - s * .2, m - s * .2, s * .4, s * .4, s * .08); g.stroke(); break;
    case 2: g.beginPath(); g.moveTo(c - s * .22, m + s * .18); g.lineTo(c, m - s * .22); g.lineTo(c + s * .22, m + s * .18); g.closePath(); g.stroke(); break;
    case 3: g.beginPath(); g.arc(c, m, s * .13, 0, TAU); g.fill(); g.beginPath(); g.arc(c, m, s * .27, 0, TAU); g.stroke(); break;
    case 4: for (let k = 0; k < 3; k++) g.fillRect(c - s * .22, m - s * .18 + k * s * .14, s * .44, s * .06); break;
    case 5: g.beginPath(); g.moveTo(c - s * .14, m - s * .2); g.lineTo(c + s * .2, m); g.lineTo(c - s * .14, m + s * .2); g.fill(); break;
  }
}
function pauseIcon(g, x, y, s, glow = 0) {
  g.save();
  if (glow) { g.shadowColor = 'rgba(255,50,50,' + glow + ')'; g.shadowBlur = 40 * glow; }
  const gr = g.createLinearGradient(x, y, x, y + s); gr.addColorStop(0, '#16171b'); gr.addColorStop(1, '#030304');
  g.fillStyle = gr; rr(g, x, y, s, s, s * .23); g.fill(); g.restore();
  g.strokeStyle = 'rgba(255,70,70,.6)'; g.lineWidth = 1.5; rr(g, x + .75, y + .75, s - 1.5, s - 1.5, s * .23); g.stroke();
  g.fillStyle = '#ff3b3b'; g.fillRect(x + s * .33, y + s * .27, s * .11, s * .46); g.fillRect(x + s * .56, y + s * .27, s * .11, s * .46);
}
function homeScreen(g, t, newK, dim, cursor) {
  const gr = g.createLinearGradient(0, 0, SW * .4, SHh); gr.addColorStop(0, '#26335f'); gr.addColorStop(.6, '#7a4a7a'); gr.addColorStop(1, '#e0876a');
  g.fillStyle = gr; g.fillRect(0, 0, SW, SHh);
  g.fillStyle = 'rgba(255,255,255,.08)'; g.beginPath(); g.arc(SW * .8, SHh * .25, 160, 0, TAU); g.fill();
  statusBar(g);
  g.fillStyle = 'rgba(255,255,255,.9)'; g.font = '300 64px Rubik'; g.textAlign = 'center'; g.fillText('7:42', SW / 2, 104);
  for (let i = 0; i < 16; i++) {
    const c = i % 4, r = Math.floor(i / 4), [x, y] = iconPos(c, r);
    if (!APPS[i]) continue;
    g.globalAlpha = 1 - dim * .7;
    g.fillStyle = APPS[i][0]; rr(g, x, y, ICON, ICON, 22); g.fill();
    const hg = g.createLinearGradient(0, y, 0, y + ICON); hg.addColorStop(0, 'rgba(255,255,255,.25)'); hg.addColorStop(1, 'rgba(0,0,0,.1)'); g.fillStyle = hg; rr(g, x, y, ICON, ICON, 22); g.fill();
    glyph(g, i, x, y, ICON);
    g.fillStyle = '#fff'; g.font = '400 16px Rubik'; g.textAlign = 'center'; g.fillText(APPS[i][1], x + ICON / 2, y + ICON + 18);
    g.globalAlpha = 1;
  }
  // док
  g.fillStyle = 'rgba(255,255,255,.18)'; rr(g, 18, SHh - 130, SW - 36, 112, 36); g.fill();
  for (let i = 0; i < 4; i++) { const x = IGAP + i * (ICON + IGAP); g.globalAlpha = 1 - dim * .7; g.fillStyle = ['#34c759', '#0a84ff', '#ff9f0a', '#bf5af2'][i]; rr(g, x, SHh - 120, ICON, ICON, 22); g.fill(); glyph(g, i + 2, x, SHh - 120, ICON); }
  g.globalAlpha = 1;
  // новое приложение
  if (newK > 0) {
    const [x, y] = iconPos(NEWC, NEWR);
    const sc = back(clamp(newK));
    g.save(); g.translate(x + ICON / 2, y + ICON / 2); g.scale(sc, sc);
    const gl = t > 3.2 && t < 4.4 ? 1 : 0;
    if (gl && rnd(Math.floor(t * 24)) > .35) {
      for (let k = 0; k < 6; k++) { const yy = -ICON / 2 + k * ICON / 6, off = (rnd(Math.floor(t * 24) * 7 + k) - .5) * 40; g.save(); g.beginPath(); g.rect(-ICON, yy, ICON * 2, ICON / 6); g.clip(); pauseIcon(g, -ICON / 2 + off, -ICON / 2, ICON, .6); g.restore(); }
      g.globalCompositeOperation = 'screen'; g.globalAlpha = .5; g.fillStyle = '#0ff'; rr(g, -ICON / 2 + 6, -ICON / 2, ICON, ICON, 22); g.fill(); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    } else pauseIcon(g, -ICON / 2, -ICON / 2, ICON, .3 + .3 * Math.sin(t * 4) ** 2);
    g.restore();
    if (cursor) { if (Math.floor(t * 2.2) % 2 === 0) { g.fillStyle = '#fff'; g.fillRect(x + ICON / 2 - 1.5, y + ICON + 6, 3, 20); } }
  }
}
// экран приложения: btn 0..1, label 0..1, digit 0..1, timer 0..1
function appScreen(g, t, st) {
  g.fillStyle = '#050608'; g.fillRect(0, 0, SW, SHh);
  const cx = SW / 2, cy = SHh * .55, R = 150;
  let gr = g.createRadialGradient(cx, cy, 10, cx, cy, 420); gr.addColorStop(0, `rgba(160,20,20,${.35 * st.btn})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, SW, SHh);
  statusBar(g, false);
  // цифра сверху
  if (st.digit > 0) {
    const k = back(clamp(st.digit)), y = SHh * .19;
    g.save(); g.translate(cx, y); g.scale(k, k);
    g.strokeStyle = 'rgba(255,80,80,.5)'; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, 44, 0, TAU); g.stroke();
    g.shadowColor = '#ff3030'; g.shadowBlur = 25; g.fillStyle = '#ff5050'; g.font = '500 58px Rubik'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(st.digitText || '3', 0, 3); g.restore();
    if (st.digitFlash) { g.globalAlpha = st.digitFlash; g.strokeStyle = '#ff6060'; g.lineWidth = 3; g.beginPath(); g.arc(cx, y, 44 + (1 - st.digitFlash) * 80, 0, TAU); g.stroke(); g.globalAlpha = 1; }
  }
  if (st.btn > 0) {
    const k = back(clamp(st.btn)) * (st.press ? 1 - .06 * st.press : 1) * (st.beat || 1);
    g.save(); g.translate(cx, cy); g.scale(k, k);
    g.shadowColor = 'rgba(255,40,40,.9)'; g.shadowBlur = 50 + 30 * (st.glow || 0);
    g.strokeStyle = '#ff3b3b'; g.lineWidth = 5; g.beginPath(); g.arc(0, 0, R, 0, TAU); g.stroke();
    g.shadowBlur = 0;
    gr = g.createLinearGradient(0, -R, 0, R); gr.addColorStop(0, '#2c2f37'); gr.addColorStop(1, '#0b0c0f');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, R - 12, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, R - 24, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
    // таймер-кольцо
    if (st.timer > 0) {
      g.strokeStyle = 'rgba(255,255,255,.1)'; g.lineWidth = 12; g.beginPath(); g.arc(0, 0, R + 26, 0, TAU); g.stroke();
      g.strokeStyle = '#ff3b3b'; g.shadowColor = '#ff3b3b'; g.shadowBlur = 20; g.globalAlpha = st.timer;
      g.beginPath(); g.arc(0, 0, R + 26, -Math.PI / 2, -Math.PI / 2 + TAU * (st.frac ?? 1)); g.stroke(); g.shadowBlur = 0; g.globalAlpha = 1;
    }
    g.textAlign = 'center'; g.textBaseline = 'middle';
    if (st.label > 0 && (st.timer || 0) < 1) {
      const lk = st.label, sc = lerp(1.8, 1, eout(clamp(lk)));
      g.save(); g.globalAlpha = clamp(lk * 3) * (1 - (st.timer || 0)); g.scale(sc, sc);
      g.fillStyle = '#f4f4f4'; g.font = '900 50px Rubik'; g.letterSpacing = '4px'; g.fillText('ПАУЗА', 0, 4); g.letterSpacing = '0px'; g.restore();
    }
    if (st.timer > 0) {
      g.globalAlpha = st.timer; g.fillStyle = '#fff'; g.font = '900 110px Rubik'; g.fillText(String(st.num), 0, -6);
      g.font = '500 22px Rubik'; g.fillStyle = '#ff6b6b'; g.letterSpacing = '6px'; g.fillText('СЕКУНД', 0, 66); g.letterSpacing = '0px'; g.globalAlpha = 1;
    }
    g.restore();
  }
  if (st.ripple) for (let k = 0; k < 3; k++) { const p = clamp(st.ripple - k * .18); if (p <= 0 || p >= 1) continue; g.globalAlpha = 1 - p; g.strokeStyle = '#ff5a5a'; g.lineWidth = 6 * (1 - p); g.beginPath(); g.arc(cx, cy, R + p * 400, 0, TAU); g.stroke(); g.globalAlpha = 1; }
}
function phoneBg(g, t, frozen) {
  const bg = blurred(frozen ? 'kfz' : 'kw');
  frozenFilter(g, bg, frozen ? 1 : 0);
  g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, 0, W, H);
}
function thumb(g, x, y, rot) {
  g.save(); g.translate(x, y); g.rotate(rot);
  g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = 40; g.shadowOffsetY = 20;
  const gr = g.createLinearGradient(-70, 0, 70, 0); gr.addColorStop(0, '#c98a66'); gr.addColorStop(.45, '#f0c09e'); gr.addColorStop(1, '#c4835f');
  g.fillStyle = gr; rr(g, -70, -30, 140, 560, 70); g.fill(); g.shadowBlur = 0; g.shadowOffsetY = 0;
  g.fillStyle = 'rgba(255,232,218,.75)'; rr(g, -42, -12, 84, 96, 40); g.fill();
  g.strokeStyle = 'rgba(150,80,60,.35)'; g.lineWidth = 3; g.beginPath(); g.moveTo(-50, 190); g.quadraticCurveTo(0, 205, 50, 190); g.stroke();
  g.restore();
}

// =====================================================================
//                         КРУПНЫЕ ПЛАНЫ ЛИЦА
// =====================================================================
function head(g, name, x, topY, h, rot = 0, alpha = 1, filter = 'none') {
  const im = IMG[name], s = h / im.height, w = im.width * s;
  g.save(); g.globalAlpha = alpha; g.translate(x, topY + h); g.rotate(rot);
  g.filter = filter; g.drawImage(im, -w / 2, -h, w, h); g.filter = 'none'; g.restore();
}
function headBg(g, kind) {
  if (kind === 'warm') frozenFilter(g, blurred('kw'), 0);
  else if (kind === 'frozen') frozenFilter(g, blurred('kfz'), 1);
  else if (kind === 'corr') g.drawImage(blurred('corrB'), 0, 0);
}
function phoneGlow(g, x, y, a, col = '120,170,255') {
  g.save(); g.globalCompositeOperation = 'screen';
  const gr = g.createRadialGradient(x, y, 20, x, y, 700); gr.addColorStop(0, `rgba(${col},${.45 * a})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, W, H); g.restore();
}
function bubble(g, x, y, r, k, icon) {
  if (k <= 0) return; const s = back(clamp(k));
  g.save(); g.translate(x, y); g.scale(s, s);
  g.shadowColor = 'rgba(0,0,0,.25)'; g.shadowBlur = 30; g.fillStyle = '#fffaf2';
  g.beginPath(); for (let i = 0; i < 9; i++) { const a = i / 9 * TAU; g.moveTo(Math.cos(a) * r * .78 + r * .3, Math.sin(a) * r * .7); g.arc(Math.cos(a) * r * .78, Math.sin(a) * r * .7, r * .34, 0, TAU); } g.fill();
  g.beginPath(); g.arc(0, 0, r * .8, 0, TAU); g.fill(); g.shadowBlur = 0;
  icon(g, r * .55); g.restore();
}
const ICONS = {
  donut(g, s) { g.fillStyle = '#d99a5b'; g.beginPath(); g.arc(0, 0, s, 0, TAU); g.arc(0, 0, s * .35, 0, TAU, true); g.fill('evenodd'); g.fillStyle = '#ff7eb6'; g.beginPath(); for (let i = 0; i <= 24; i++) { const a = i / 24 * TAU, rr2 = s * (.86 + Math.sin(i * 2.3) * .06); g.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2); } g.arc(0, 0, s * .42, 0, TAU, true); g.fill('evenodd'); const c = ['#fff', '#6cf', '#ff0', '#7f7']; for (let i = 0; i < 14; i++) { const a = rnd(i) * TAU, d = s * (.5 + rnd(i + 3) * .3); g.save(); g.translate(Math.cos(a) * d, Math.sin(a) * d); g.rotate(rnd(i + 9) * 3); g.fillStyle = c[i % 4]; g.fillRect(-6, -2, 12, 4); g.restore(); } },
  money(g, s) { for (let i = 0; i < 4; i++) { g.save(); g.translate(-8 + i * 6, 10 - i * 12); g.rotate(-.15 + i * .05); g.fillStyle = '#6dbb6a'; rr(g, -s, -s * .5, s * 2, s, 8); g.fill(); g.strokeStyle = '#3d8a3c'; g.lineWidth = 3; rr(g, -s + 8, -s * .5 + 8, s * 2 - 16, s - 16, 4); g.stroke(); g.fillStyle = '#2f6e2e'; g.font = `900 ${s * .6}px Rubik`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('₽', 0, 2); g.restore(); } },
  plane(g, s) { g.fillStyle = '#4b8ff0'; g.save(); g.rotate(-.5); g.beginPath(); g.ellipse(0, 0, s, s * .18, 0, 0, TAU); g.fill(); g.beginPath(); g.moveTo(-s * .1, 0); g.lineTo(-s * .45, -s * .8); g.lineTo(-s * .2, -s * .8); g.lineTo(s * .35, 0); g.lineTo(-s * .2, s * .8); g.lineTo(-s * .45, s * .8); g.fill(); g.beginPath(); g.moveTo(-s * .75, 0); g.lineTo(-s * .95, -s * .38); g.lineTo(-s * .8, -s * .38); g.lineTo(-s * .55, 0); g.fill(); g.restore(); },
  crown(g, s) { g.fillStyle = '#f2c230'; g.beginPath(); g.moveTo(-s, s * .5); g.lineTo(-s, -s * .3); g.lineTo(-s * .5, s * .05); g.lineTo(0, -s * .6); g.lineTo(s * .5, s * .05); g.lineTo(s, -s * .3); g.lineTo(s, s * .5); g.fill(); g.fillStyle = '#e04848'; for (const x of [-.5, 0, .5]) { g.beginPath(); g.arc(x * s, s * .25, s * .1, 0, TAU); g.fill(); } g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(-s * .9, s * .32, s * 1.8, s * .06); },
};

// =====================================================================
//                              КОРИДОР
// =====================================================================
const VP = [960, 500], ZEND = 6;
const pj = (x, y, z) => { const s = 1 / (1 + z); return [VP[0] + (x - VP[0]) * s, VP[1] + (y - VP[1]) * s]; };
const CL = 380, CR = 1540, CT = 40, CF = 1080;
const LIGHTS = [0.4, 1.4, 2.4, 3.4, 4.4, 5.4];
function quad(g, a, b, c, d) { g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.lineTo(...c); g.lineTo(...d); g.closePath(); g.fill(); }
function drawCorridor(g, st) {
  const on = st.lights || LIGHTS.map(() => 1);
  // торцевая стена — источник холодного света
  const [ex0, ey0] = pj(CL, CT, ZEND), [ex1, ey1] = pj(CR, CF, ZEND);
  g.fillStyle = '#0b0e12'; g.fillRect(-W, -H, W * 3, H * 3);
  let gr = g.createRadialGradient(960, 520, 10, 960, 520, 220); gr.addColorStop(0, '#dfe8ef'); gr.addColorStop(1, '#7d8c96');
  g.fillStyle = gr; g.fillRect(ex0, ey0, ex1 - ex0, ey1 - ey0);
  // полосы стен/пола/потолка по глубине
  const N = 30;
  for (let i = N - 1; i >= 0; i--) {
    const z0 = -.62 + (ZEND + .62) * (i / N) ** 1.6, z1 = -.62 + (ZEND + .62) * ((i + 1) / N) ** 1.6;
    let light = .14 + .55 * (Math.max(0, z0) / ZEND) ** 1.4;
    LIGHTS.forEach((lz, j) => { light += on[j] * .5 * Math.exp(-((z0 - lz - .15) ** 2) / .12) * (1 / (1 + lz * .4)); });
    light = clamp(light, 0, 1);
    const wall = (l) => `rgb(${46 + 120 * l},${58 + 122 * l},${60 + 118 * l})`;
    g.fillStyle = wall(light * .85); quad(g, pj(CL, CT, z0), pj(CL, CT, z1), pj(CL, CF, z1), pj(CL, CF, z0));
    g.fillStyle = wall(light * .8); quad(g, pj(CR, CT, z0), pj(CR, CT, z1), pj(CR, CF, z1), pj(CR, CF, z0));
    g.fillStyle = wall(light * .55); quad(g, pj(CL, CT, z0), pj(CL, CT, z1), pj(CR, CT, z1), pj(CR, CT, z0));
    const fl = light * .7; g.fillStyle = `rgb(${30 + 90 * fl},${36 + 92 * fl},${38 + 86 * fl})`; quad(g, pj(CL, CF, z0), pj(CL, CF, z1), pj(CR, CF, z1), pj(CR, CF, z0));
  }
  // плитка на полу
  g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 2;
  for (let x = CL; x <= CR; x += 145) { g.beginPath(); g.moveTo(...pj(x, CF, -.6)); g.lineTo(...pj(x, CF, ZEND)); g.stroke(); }
  for (let z = -.5; z < ZEND; z += .5) { g.beginPath(); g.moveTo(...pj(CL, CF, z)); g.lineTo(...pj(CR, CF, z)); g.stroke(); }
  // плинтус
  g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 4;
  for (const x of [CL, CR]) { g.beginPath(); g.moveTo(...pj(x, CF - 40, -.6)); g.lineTo(...pj(x, CF - 40, ZEND)); g.stroke(); }
  // двери
  const doors = [[-.4, .1], [1.0, 1.5], [2.6, 3.05], [4.1, 4.45]];
  for (const [za, zb] of doors) for (const x of [CL, CR]) {
    g.fillStyle = 'rgba(20,24,28,.75)'; quad(g, pj(x, 330, za), pj(x, 330, zb), pj(x, CF, zb), pj(x, CF, za));
    g.fillStyle = 'rgba(200,210,215,.12)'; const [hx, hy] = pj(x, 720, za + (zb - za) * .82); g.beginPath(); g.arc(hx + (x === CL ? 4 : -4) / (1 + za), hy, 7 / (1 + za), 0, TAU); g.fill();
    g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 6 / (1 + za); g.beginPath(); g.moveTo(...pj(x, 330, za)); g.lineTo(...pj(x, 330, zb)); g.lineTo(...pj(x, CF, zb)); g.stroke();
  }
  // лампы
  LIGHTS.forEach((lz, j) => {
    if (on[j] <= 0.01) { g.fillStyle = '#20262b'; quad(g, pj(860, CT, lz), pj(860, CT, lz + .28), pj(1060, CT, lz + .28), pj(1060, CT, lz)); return; }
    g.save(); g.globalAlpha = on[j];
    g.fillStyle = '#f2f7ff'; quad(g, pj(860, CT, lz), pj(860, CT, lz + .28), pj(1060, CT, lz + .28), pj(1060, CT, lz));
    g.globalCompositeOperation = 'screen';
    const [lx, ly] = pj(960, CT + 30, lz + .14), rad = 520 / (1 + lz);
    gr = g.createRadialGradient(lx, ly, 2, lx, ly, rad); gr.addColorStop(0, 'rgba(210,230,255,.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(lx - rad, ly - rad, rad * 2, rad * 2);
    // отражение на полу
    const [fx, fy] = pj(960, CF, lz + .14), fr = 380 / (1 + lz);
    gr = g.createRadialGradient(fx, fy, 2, fx, fy, fr); gr.addColorStop(0, 'rgba(200,220,240,.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.save(); g.translate(fx, fy); g.scale(1, .35); g.translate(-fx, -fy); g.fillStyle = gr; g.fillRect(fx - fr, fy - fr, fr * 2, fr * 2); g.restore();
    g.restore();
  });
  // фигура
  if (st.figZ < 50) drawFigure(g, st);
  // общий холод и туман
  g.save(); g.globalCompositeOperation = 'multiply'; g.fillStyle = 'rgba(170,195,215,.6)'; g.fillRect(-W, -H, W * 3, H * 3); g.restore();
  if (st.dark) { g.fillStyle = `rgba(0,0,0,${st.dark})`; g.fillRect(-W, -H, W * 3, H * 3); }
}
function figureAnchor(z) { const [x, y] = pj(960, CF, z); return { x, y, h: 690 / (1 + z) }; }
function drawFigure(g, st) {
  const { x, y, h } = figureAnchor(st.figZ);
  const turn = st.turn || 0, stepK = st.step || 0;
  g.save(); g.translate(x, y); g.scale(h, h);
  // ореол
  g.save(); g.globalCompositeOperation = 'screen';
  const gr = g.createRadialGradient(0, -.6, .05, 0, -.6, .75); gr.addColorStop(0, 'rgba(190,215,235,.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(-1, -1.5, 2, 2); g.restore();
  // тень на полу
  g.fillStyle = 'rgba(0,0,0,.55)'; g.beginPath(); g.ellipse(0, 0, .2, .025, 0, 0, TAU); g.fill();
  g.fillStyle = '#040506';
  // ноги
  const lg = stepK * .07;
  g.beginPath(); g.moveTo(-.075, -.46); g.lineTo(-.03, -.46); g.lineTo(-.04 - lg, 0); g.lineTo(-.09 - lg, 0); g.fill();
  g.beginPath(); g.moveTo(.03, -.46); g.lineTo(.075, -.46); g.lineTo(.09 + lg * .3, 0); g.lineTo(.04 + lg * .3, 0); g.fill();
  // пальто
  g.beginPath(); g.moveTo(-.12, -.8); g.quadraticCurveTo(-.17, -.78, -.17, -.7);
  g.lineTo(-.19, -.36); g.lineTo(-.16, -.34); g.lineTo(-.155, -.42); g.lineTo(-.165, -.3);
  g.lineTo(.165, -.3); g.lineTo(.155, -.42); g.lineTo(.16, -.34); g.lineTo(.19, -.36);
  g.lineTo(.17, -.7); g.quadraticCurveTo(.17, -.78, .12, -.8); g.closePath(); g.fill();
  // капюшон (поворот: 0 — профиль, 1 — анфас)
  const hy = -.9, hr = .075, asy = (1 - turn) * -.035;
  g.beginPath(); g.moveTo(-.13, -.79);
  g.bezierCurveTo(-.11, -.86, -.1 + asy, -.99, -.005 + asy, -1.0);
  g.bezierCurveTo(.07 + asy * .3, -1.0, .1, -.9, .13, -.79); g.closePath(); g.fill();
  if (turn < .98) { g.beginPath(); g.moveTo(-.07 + asy, -.97); g.quadraticCurveTo(-.11 + asy * 2, -.93, -.095 + asy * 1.5, -.86); g.lineTo(-.06, -.86); g.fill(); }
  // лицо в тени капюшона
  if (turn > .3) { const fa = ss(.3, 1, turn); g.fillStyle = `rgba(0,0,0,${fa})`; g.beginPath(); g.ellipse(lerp(-.03, 0, turn) + asy, hy - .005, hr * .62 * fa, hr * .82, 0, 0, TAU); g.fill(); }
  // контур света
  g.strokeStyle = 'rgba(175,205,230,.45)'; g.lineWidth = .005;
  g.beginPath(); g.moveTo(-.13, -.79); g.bezierCurveTo(-.11, -.86, -.1 + asy, -.99, -.005 + asy, -1.0); g.bezierCurveTo(.07 + asy * .3, -1.0, .1, -.9, .13, -.79); g.stroke();
  g.beginPath(); g.moveTo(-.13, -.79); g.quadraticCurveTo(-.17, -.77, -.17, -.7); g.stroke();
  g.beginPath(); g.moveTo(.13, -.79); g.quadraticCurveTo(.17, -.77, .17, -.7); g.stroke();
  // глаза
  const eyes = (st.eyes ?? ss(.55, 1, turn)) * (st.eyeMul || 1);
  if (eyes > 0) {
    const ex = lerp(-hr * .4, 0, ss(.4, 1, turn)) + asy, sep = hr * .27 * ss(.3, 1, turn);
    g.save(); g.globalCompositeOperation = 'lighter';
    for (const dx of [-sep, sep]) {
      const r = hr * .09, ey = hy - hr * .08;
      const eg = g.createRadialGradient(ex + dx, ey, 0, ex + dx, ey, r * 5);
      eg.addColorStop(0, `rgba(255,255,255,${eyes})`); eg.addColorStop(.16, `rgba(225,238,255,${eyes})`); eg.addColorStop(.3, `rgba(150,190,255,${eyes * .35})`); eg.addColorStop(1, 'rgba(120,160,255,0)');
      g.fillStyle = eg; g.beginPath(); g.arc(ex + dx, ey, r * 5, 0, TAU); g.fill();
    }
    g.restore();
  }
  g.restore();
}
function corridorShot(g, t, c, st, blur = 0) {
  clear(b1); b1.save(); cam(b1, ...c); drawCorridor(b1, st); b1.restore();
  if (blur) g.filter = `blur(${blur}px)`;
  g.drawImage(B1, 0, 0); g.filter = 'none';
}

// =====================================================================
//                                СЦЕНЫ
// =====================================================================
const S = [];
const shot = (s, tin, fn) => S.push({ s, tin, fn });

// A — утро, кухня
shot(0, { type: 'cut' }, (g, t) => {
  const z = lerp(1.0, 1.06, ss(0, 2.6, t));
  clear(b1); b1.save(); cam(b1, 1000, 560, z); drawKitchen(b1, wtime(t)); drawElmirStand(b1, 1000, 1045, 880, t); b1.restore();
  g.drawImage(B1, 0, 0);
  // вибрация телефона в кармане
  const bz = (t > 1.75 && t < 2.15) || (t > 2.25 && t < 2.6);
  if (bz) {
    g.save(); cam(g, 1000, 560, z);
    const px = 1000 + 712 * (880 / 2096) * .27, py = 1045 - 880 * .45;
    g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 4; g.lineCap = 'round';
    for (let k = 0; k < 3; k++) { const o = 18 + k * 14 + (t * 60 % 8); g.beginPath(); g.arc(px, py, o, -.7, .7); g.stroke(); g.beginPath(); g.arc(px, py, o, Math.PI - .7, Math.PI + .7); g.stroke(); }
    g.restore();
  }
});

// B+C — экран, появляется приложение, без названия, открытие
shot(2.6, { type: 'fade', d: .35 }, (g, t) => {
  phoneBg(g, t, 0);
  const [ix, iy] = iconWorld();
  const c = keys(t, [[2.6, [960, 560, .98]], [3.3, [960, 560, 1.03]], [4.3, [950, 555, 1.08]], [6.75, [ix, iy, 1.75]], [7.15, [ix, iy + 25, 3.3]], [8.7, [ix, iy + 15, 3.6]], [9.3, [960, 560, 1.12]]], eio);
  const ln = ss(8.7, 9.3, t);
  g.save(); cam(g, c[0], c[1], c[2], Math.sin(t * .7) * .01);
  drawHandBack(g);
  drawPhone(g, t, sg => {
    homeScreen(sg, t, ss(3.25, 3.75, t) + (t > 3.75 ? 1 : 0) * 0, ss(4.6, 6.0, t), t > 6.9 && t < 8.7);
    if (t > 7.95 && t < 8.75) { // «Ни инструкции» — пустая подсказка
      const k = ss(7.95, 8.2, t) * (1 - ss(8.55, 8.75, t)); const [x, y] = iconPos(NEWC, NEWR);
      sg.globalAlpha = k; sg.fillStyle = 'rgba(30,30,36,.92)'; rr(sg, x + ICON + 12, y + 8, 120, 70, 14); sg.fill();
      sg.fillStyle = '#888'; sg.font = '900 40px Rubik'; sg.textAlign = 'center'; sg.textBaseline = 'middle'; sg.fillText('?', x + ICON + 72, y + 44); sg.globalAlpha = 1;
    }
    if (ln > 0) { const [x, y] = iconPos(NEWC, NEWR); const k = eio(ln); sg.fillStyle = '#050608'; rr(sg, lerp(x, 0, k), lerp(y, 0, k), lerp(ICON, SW, k), lerp(ICON, SHh, k), lerp(22, 54, k)); sg.fill(); }
  });
  drawHandFront(g);
  g.restore();
});

// D — одна кнопка «ПАУЗА» и цифра 3
shot(9.3, { type: 'cut' }, (g, t) => {
  phoneBg(g, t, 0);
  let c = keys(t, [[9.3, [960, 600, 1.12]], [11.5, [960, 640, 1.3]], [12.0, [960, 640, 1.42]], [12.45, [960, 640, 1.42]], [13.4, [960, 330, 2.0]], [15.35, [960, 300, 2.25]]], eio);
  const hit = Math.exp(-Math.max(0, t - 11.6) * 7) * (t > 11.6 ? 1 : 0), hit2 = Math.exp(-Math.max(0, t - 14.57) * 6) * (t > 14.57 ? 1 : 0);
  const [sx, sy] = shake(t, 26 * hit + 14 * hit2);
  g.save(); g.translate(sx, sy); cam(g, c[0], c[1], c[2] * (1 + hit * .05 + hit2 * .04));
  drawHandBack(g);
  drawPhone(g, t, sg => appScreen(sg, t, { btn: ss(9.55, 10.15, t) * 1.0 + 0 * 0, label: lin(11.6, 11.85, t), glow: hit, digit: lin(14.57, 14.85, t), digitFlash: t > 14.57 ? clamp(1 - (t - 14.57) / .6) : 0 }));
  drawHandFront(g);
  g.restore();
  if (hit > .01) { g.fillStyle = `rgba(255,60,60,${hit * .25})`; g.fillRect(0, 0, W, H); }
});

// E — «розыгрыш»: ухмылка
shot(15.35, { type: 'cut' }, (g, t) => {
  headBg(g, 'warm');
  const k = t - 15.35;
  head(g, 'sarcastic', 960 + k * 8, 110 - k * 4, 1020 + k * 18, Math.sin(k * 5.5) * .018 * ss(0.6, 1.2, k) * (1 - ss(1.8, 2.4, k)) - .01);
  phoneGlow(g, 960, 1250, .7);
});
// F — любопытство: задумался
shot(17.78, { type: 'fade', d: .3 }, (g, t) => {
  headBg(g, 'warm');
  const k = t - 17.78;
  head(g, 'think', 990 - k * 10, 120 - k * 14, 980 + k * 40, Math.sin(k * 1.4) * .012);
  phoneGlow(g, 960, 1250, .8);
});

// G — «Я нажал»
shot(19.85, { type: 'cut' }, (g, t) => {
  phoneBg(g, t, 0);
  const pr = ss(20.08, 20.25, t) * (1 - ss(20.4, 20.7, t)), rip = lin(20.25, 21.0, t);
  const [sx, sy] = shake(t, t > 20.25 ? 20 * Math.exp(-(t - 20.25) * 6) : 0);
  g.save(); g.translate(sx, sy); cam(g, 960, 600, 1.45 + ss(19.85, 20.9, t) * .2);
  drawHandBack(g);
  drawPhone(g, t, sg => appScreen(sg, t, { btn: 1, label: 1, digit: 1, press: pr, glow: rip > 0 ? 1 - rip : 0, ripple: rip }));
  drawHandFront(g);
  const tx = lerp(1350, 985, eout(ss(19.85, 20.25, t))), ty = lerp(1100, 640, eout(ss(19.85, 20.25, t))) + pr * 10;
  thumb(g, tx - ss(20.45, 20.95, t) * 200, ty + ss(20.45, 20.95, t) * 260, -.62);
  g.restore();
  if (t > 20.25) { const f = Math.exp(-(t - 20.25) * 9); g.fillStyle = `rgba(255,255,255,${f * .8})`; g.fillRect(0, 0, W, H); }
});

// H — всё останавливается (волна заморозки)
shot(20.98, { type: 'flash', d: .25 }, (g, t) => {
  const punch = t > FB ? Math.exp(-(t - FB) * 5) * .05 : 0;
  const z = 1.12 + ss(20.98, 24.6, t) * .06 + punch;
  const c = [1000, 560, z];
  clear(b1); b1.save(); cam(b1, ...c); drawKitchen(b1, wtime(t)); b1.restore();
  const O = [W / 2 + (1000 + 80 - 1000) * z, H / 2 + (1045 - 880 * .45 - 560) * z];
  const r = Math.pow(lin(21.15, 23.05, t), 1.6) * 2600;
  g.drawImage(B1, 0, 0);
  if (r > 0) {
    g.save(); g.beginPath(); g.arc(O[0], O[1], r, 0, TAU); g.clip(); frozenFilter(g, B1, 1); g.restore();
    if (r < 2500) {
      // «линза» на фронте волны
      g.save(); g.beginPath(); g.arc(O[0], O[1], r + 60, 0, TAU); g.arc(O[0], O[1], Math.max(0, r - 20), 0, TAU, true); g.clip('evenodd');
      g.translate(O[0], O[1]); g.scale(1.035, 1.035); g.translate(-O[0], -O[1]); g.drawImage(B1, 0, 0); g.restore();
      g.save(); g.strokeStyle = 'rgba(220,240,255,.8)'; g.lineWidth = 6; g.shadowColor = '#bfe3ff'; g.shadowBlur = 40; g.beginPath(); g.arc(O[0], O[1], r, 0, TAU); g.stroke(); g.restore();
    }
  }
  // Ильмир остаётся в цвете
  g.save(); cam(g, ...c); drawElmirStand(g, 1000, 1045, 880, t); g.restore();
  if (t > FB) { const f = Math.exp(-(t - FB) * 6); g.fillStyle = `rgba(210,230,255,${f * .35})`; g.fillRect(0, 0, W, H); }
});

// I — «Часы замерли»
shot(24.58, { type: 'cut' }, (g, t) => {
  performanceT = t;
  const k = ss(24.58, 25.95, t);
  kitchenShot(g, t, [1300, 232, lerp(4.4, 4.9, k), lerp(-.05, .02, k)], 1);
});
// J — «Капли кофе зависли»
shot(25.95, { type: 'cut' }, (g, t) => {
  const k = ss(25.95, 28.12, t);
  kitchenShot(g, t, [lerp(1585, 1615, k), 612, lerp(6.6, 7.2, k), lerp(.03, -.02, k)], 1);
  // боке на переднем плане
  g.save(); g.globalCompositeOperation = 'screen';
  for (let i = 0; i < 9; i++) { const x = (rnd(i) * W + (k - .5) * 300 * (1 + rnd(i + 2))) , y = rnd(i + 5) * H, r = 40 + rnd(i + 9) * 90; const gr = g.createRadialGradient(x, y, r * .6, x, y, r); gr.addColorStop(0, 'rgba(255,220,180,.10)'); gr.addColorStop(1, 'rgba(255,220,180,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
  g.restore();
});
// K — «Даже птица…»
shot(28.12, { type: 'fade', d: .3 }, (g, t) => {
  const k = ss(28.12, 30.98, t);
  kitchenShot(g, t, [BIRD0[0] - 10, BIRD0[1] - 8, lerp(3.4, 4.4, k), lerp(.02, -.02, k)], 1, { birdScale: 1 });
});
// L — «А я мог ходить. Дышать. Двигать предметы»
shot(30.98, { type: 'fade', d: .3 }, (g, t) => {
  const walkK = ss(31.0, 32.7, t), lunge = ss(33.55, 33.95, t) * (1 - ss(34.3, 34.8, t) * .6);
  const push = eout(lin(33.75, 34.9, t));
  const x = lerp(760, 1395, walkK) + lunge * 25;
  const cx = lerp(1050, 1330, ss(31, 34.3, t)), z = lerp(1.2, 1.55, ss(31, 34.6, t));
  const c = [cx, 640, z];
  clear(b1); b1.save(); cam(b1, ...c);
  drawKitchen(b1, wtime(t), { dropPush: push, steamPush: push * .6, dustPush: (i, bx, by) => { const dx = bx - x, dy = by - 600; const d = Math.hypot(dx, dy); return d < 300 ? (1 - d / 300) * 70 * ss(31.0, 32.7, t) : 0; } });
  b1.restore();
  frozenFilter(g, B1, 1);
  g.save(); cam(g, ...c);
  const phase = (t - 31.0) * 7.5 * (walkK < 1 ? 1 : 0) + (walkK >= 1 ? 7.5 * 1.7 : 0);
  const br = Math.sin(ss(32.7, 33.5, t) * Math.PI);
  drawElmirWalk(g, x, 1050, 700, walkK < 1 ? phase : Math.PI, -1, br);
  // «дышать»: облачко пара
  if (t > 32.8 && t < 33.8) { const k = lin(32.8, 33.8, t); g.fillStyle = `rgba(255,255,255,${.5 * Math.sin(k * Math.PI)})`; for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(x + 40 + k * 60 + i * 12, 1050 - 700 * .85 - k * 8 + Math.sin(i) * 6, 10 + k * 18 + i * 3, 0, TAU); g.fill(); } }
  // касание капель — искра
  if (t > 33.72 && t < 34.3) { const k = lin(33.72, 34.3, t); g.strokeStyle = `rgba(255,255,255,${1 - k})`; g.lineWidth = 3; g.beginPath(); g.arc(1590, 600, 10 + k * 60, 0, TAU); g.stroke(); }
  g.restore();
});

// M — обратный отсчёт
shot(34.92, { type: 'cut' }, (g, t) => {
  phoneBg(g, t, 1);
  const c = keys(t, [[34.92, [960, 560, 1.05]], [36.6, [960, 620, 1.3]], [38.18, [960, 640, 1.55]], [39.6, [960, 640, 1.62]]], eio);
  const tick = t > 38.18 ? Math.exp(-((t - 38.18) % 1) * 8) : 0;
  g.save(); cam(g, c[0], c[1], c[2] * (1 + tick * .01));
  drawHandBack(g);
  drawPhone(g, t, sg => appScreen(sg, t, { btn: 1, label: 1, digit: 1, timer: ss(35.4, 36.3, t), num: timerInt(t), frac: timerVal(t) / 30, glow: tick, beat: 1 + tick * .03 }));
  drawHandFront(g);
  g.restore();
});

// N — «Сначала мне стало смешно»
shot(39.6, { type: 'cut' }, (g, t) => {
  headBg(g, 'frozen');
  const k = t - 39.6, laugh = Math.abs(Math.sin(k * 11)) * ss(.2, .5, k) * (1 - ss(1.4, 1.9, k));
  head(g, 'happy', 960, 120 - laugh * 18 - k * 5, 990 + k * 20, Math.sin(k * 3) * .02);
});
// O — «сколько всего можно сделать»
shot(41.55, { type: 'fade', d: .2 }, (g, t) => {
  headBg(g, 'frozen');
  const k = t - 41.55;
  head(g, 'sarcastic', 620 - k * 6, 150, 960 + k * 10, Math.sin(k * 1.2) * .015);
  const B = [[1300, 330, 120, 42.0, 'donut'], [1620, 520, 120, 42.85, 'money'], [1290, 690, 115, 43.75, 'plane'], [1630, 230, 105, 44.55, 'crown']];
  for (const [x, y, r, st, ic] of B) {
    const kk = lin(st, st + .35, t); const fl = Math.sin(t * 2 + x) * 8;
    if (kk > 0) for (let j = 0; j < 3; j++) { g.fillStyle = 'rgba(255,250,242,.9)'; g.beginPath(); g.arc(lerp(900, x, (j + 1) / 4), lerp(380, y, (j + 1) / 4), 10 + j * 6, 0, TAU); g.globalAlpha = clamp(kk * 4 - j); g.fill(); g.globalAlpha = 1; }
    bubble(g, x, y + fl, r, kk, ICONS[ic]);
  }
});
// P — «Но потом я заметил кое-что странное»
shot(45.6, { type: 'cut' }, (g, t) => {
  headBg(g, 'frozen');
  const k = t - 45.6;
  head(g, 'skeptic', 960 + k * 6, 110 + k * 4, 1000 + k * 40, -.01 - k * .004);
  // лопающиеся пузыри
  const pop = lin(45.6, 46.0, t);
  if (pop < 1) for (const [x, y] of [[1500, 330], [1620, 560]]) { g.strokeStyle = `rgba(255,255,255,${1 - pop})`; g.lineWidth = 4; for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; g.beginPath(); g.moveTo(x + Math.cos(a) * 60 * (1 + pop), y + Math.sin(a) * 60 * (1 + pop)); g.lineTo(x + Math.cos(a) * 100 * (1 + pop), y + Math.sin(a) * 100 * (1 + pop)); g.stroke(); } }
  // тень наползает
  const dk = ss(46.5, 48.6, t);
  const gr = g.createRadialGradient(960, 480, 200, 960, 480, 1100); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, `rgba(0,0,0,${.75 * dk})`);
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
});

// Q — коридор и человек в конце
shot(48.6, { type: 'dip', d: .7 }, (g, t) => {
  const k = ss(48.6, 51.7, t);
  corridorShot(g, t, [960, 520, lerp(1.0, 1.35, k)], { figZ: 5.2 });
});
// R — «не обратил внимания»: Ильмир на переднем плане, перевод фокуса
shot(51.7, { type: 'cut' }, (g, t) => {
  const rack = ss(53.2, 53.95, t);
  corridorShot(g, t, [990, 520, 1.6], { figZ: 5.2 }, lerp(9, 0, rack));
  const k = t - 51.7;
  head(g, 'three4', 1420 - k * 6, 230, 980, .02, 1, `blur(${lerp(0, 8, rack)}px) brightness(.72) saturate(.85)`);
  phoneGlow(g, 1500, 1200, .6);
});
// S — «Пока он… не повернул голову»
shot(54.15, { type: 'cut' }, (g, t) => {
  const A = figureAnchor(5.2), hy = A.y - A.h * .905;
  const turn = eio(ss(55.35, 56.5, t));
  corridorShot(g, t, [A.x, hy + A.h * .12, lerp(6.6, 7.6, ss(54.15, 56.8, t))], { figZ: 5.2, turn });
});
// T — «Прямо в мою сторону»
shot(56.82, { type: 'cut' }, (g, t) => {
  const A = figureAnchor(5.2), hy = A.y - A.h * .905;
  const z = lerp(9, 16, eout(lin(56.82, 57.25, t))) + (t - 57.25 > 0 ? (t - 57.25) * .8 : 0);
  const [sx, sy] = shake(t, 10 * Math.exp(-Math.max(0, t - 56.9) * 3));
  g.save(); g.translate(sx, sy);
  corridorShot(g, t, [A.x, hy, z], { figZ: 5.2, turn: 1, eyeMul: 1 + ss(56.9, 57.4, t) * .6 });
  g.restore();
  // хроматический сдвиг
  g.save(); g.globalCompositeOperation = 'screen'; g.globalAlpha = .25 * Math.exp(-Math.max(0, t - 56.9) * 4); g.drawImage(B1, 8, 0); g.restore();
});
// U — «Я посмотрел на телефон»
shot(58.66, { type: 'cut' }, (g, t) => {
  headBg(g, 'corr');
  const k = t - 58.66;
  head(g, 'surprise', 960, 120 + k * 6, 990 + k * 50, .0, 1, 'brightness(.8) saturate(.9)');
  phoneGlow(g, 960, 1220, 1, '255,90,90');
});
// V — «Три секунды»
shot(60.5, { type: 'cut' }, (g, t) => {
  phoneBg(g, t, 1);
  const beat = 1 + .05 * Math.exp(-Math.max(0, t - 60.57) * 6);
  g.save(); cam(g, 960, 640, 2.0 * beat);
  drawPhone(g, t, sg => appScreen(sg, t, { btn: 1, label: 1, digit: 1, timer: 1, num: timerInt(t), frac: timerVal(t) / 30, glow: 1, beat }));
  g.restore();
  g.fillStyle = `rgba(255,0,0,${.18 * Math.exp(-Math.max(0, t - 60.57) * 4)})`; g.fillRect(0, 0, W, H);
});
// W — «Две»
shot(61.7, { type: 'cut' }, (g, t) => {
  const A = figureAnchor(5.2);
  corridorShot(g, t, [A.x, A.y - A.h * .6, lerp(3.4, 3.7, lin(61.7, 62.7, t))], { figZ: 5.2, turn: 1 });
});
// X — «Одна»
shot(62.7, { type: 'cut' }, (g, t) => {
  headBg(g, 'corr');
  const k = t - 62.7, beat = 1 + .03 * Math.exp(-Math.max(0, t - 62.76) * 5);
  head(g, 'surprise', 960, -420 - k * 20, 2300 * beat + k * 80, 0, 1, 'brightness(.75) saturate(.85)');
  phoneGlow(g, 960, 1300, 1, '255,80,80');
});
// Y — «И тут он сделал шаг ко мне»
shot(63.7, { type: 'cut' }, (g, t) => {
  const stepK = eout(lin(64.9, 65.2, t));
  const figZ = lerp(5.2, 2.4, stepK);
  const offs = [65.62, 65.5, 65.38, 65.26, 65.14, 65.02];
  const lights = LIGHTS.map((_, j) => { const o = offs[j]; if (t < o) return 1; const fl = t - o; return fl < .12 ? (rnd(Math.floor(t * 60) + j) > .5 ? 1 : .2) : 0; });
  const hit = t > 64.95 ? Math.exp(-(t - 64.95) * 5) : 0;
  const [sx, sy] = shake(t, 40 * hit);
  g.save(); g.translate(sx, sy);
  const A = figureAnchor(figZ);
  corridorShot(g, t, [960, lerp(520, A.y - A.h * .55, .5), lerp(1.5, 1.75, lin(63.7, 65.9, t)) * (1 + hit * .04)], { figZ, turn: 1, step: stepK, lights, dark: ss(65.55, 65.9, t) });
  g.restore();
});
// Z — титр
shot(65.95, { type: 'cut' }, (g, t) => {
  g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
  const k = t - 65.95, a = ss(.45, .8, k) * (1 - ss(3.4, 4.0, k));
  if (a <= 0) return;
  g.save(); g.textAlign = 'center'; g.textBaseline = 'middle';
  const gl = k < 1.1 || (k > 2.2 && k < 2.35);
  const f = Math.floor(t * 24);
  g.font = '210px "Rubik Glitch"';
  if (gl) { g.globalAlpha = a * .8; g.fillStyle = '#00e5ff'; g.fillText('ПАУЗА', 960 - 10 * rnd(f), 500); g.fillStyle = '#ff2a2a'; g.fillText('ПАУЗА', 960 + 10 * rnd(f + 1), 500 + 4); }
  g.globalAlpha = a; g.fillStyle = '#f3f3f3'; g.fillText('ПАУЗА', 960, 500);
  if (gl && rnd(f + 5) > .5) { const y = 400 + rnd(f + 2) * 200; g.drawImage(g.canvas, 0, y, W, 24, (rnd(f + 3) - .5) * 60, y, W, 24); }
  g.globalAlpha = a * ss(.9, 1.3, k); g.font = '500 40px Rubik'; g.letterSpacing = '14px'; g.fillStyle = '#ff4a4a'; g.fillText('ЭЛЬМИР  ·  СЕРИЯ 1', 960, 660);
  g.globalAlpha = a * ss(1.6, 2.1, k); g.font = '400 30px Rubik'; g.letterSpacing = '4px'; g.fillStyle = '#9a9a9a'; g.fillText('продолжение следует…', 960, 740);
  g.letterSpacing = '0px'; g.restore();
});

// ---------- субтитры ----------
const SUBS = [[0.0, 2.6, 'Представь, что однажды утром на твоём телефоне'], [2.6, 6.7, 'появляется приложение, которое ты никогда не устанавливал.'], [6.93, 9.2, 'Ни названия. Ни инструкции.'], [9.37, 12.3, 'Только одна кнопка с надписью «ПАУЗА».'], [12.49, 15.2, 'И маленькая цифра сверху — три.'], [15.47, 17.75, 'Я подумал, что это какой-то розыгрыш.'], [17.84, 19.75, 'Но любопытство взяло верх.'], [19.91, 20.9, 'Я нажал.'], [21.05, 22.8, 'И в следующую секунду…'], [23.03, 24.5, '…всё остановилось.'], [24.66, 25.9, 'Часы замерли.'], [26.02, 28.05, 'Капли кофе зависли в воздухе.'], [28.21, 30.9, 'Даже птица за окном перестала двигаться.'], [31.11, 32.65, 'А я мог ходить.'], [32.75, 33.5, 'Дышать.'], [33.62, 34.9, 'Двигать предметы.'], [35.02, 37.95, 'На экране телефона появился обратный отсчёт.'], [38.18, 39.5, 'Тридцать секунд.'], [39.73, 41.5, 'Сначала мне стало смешно.'], [41.62, 45.5, 'Я даже успел подумать, сколько всего можно сделать с такой штукой.'], [45.71, 48.5, 'Но потом я заметил кое-что странное.'], [48.71, 51.6, 'В самом конце коридора стоял человек.'], [51.8, 54.1, 'Сначала я не обратил на него внимания.'], [54.26, 56.7, 'Пока он… не повернул голову.'], [56.9, 58.5, 'Прямо в мою сторону.'], [58.77, 60.4, 'Я посмотрел на телефон.'], [60.57, 61.6, 'Три секунды.'], [61.78, 62.6, 'Две.'], [62.76, 63.6, 'Одна.'], [63.75, 65.9, 'И тут он сделал шаг ко мне.']];
function subtitles(g, t) {
  const s = SUBS.find(s => t >= s[0] && t < s[1] + .15); if (!s) return;
  const a = ss(s[0], s[0] + .15, t) * (1 - ss(s[1], s[1] + .15, t));
  g.save(); g.globalAlpha = a; g.font = '500 40px Rubik'; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  g.lineWidth = 7; g.strokeStyle = 'rgba(0,0,0,.75)'; g.lineJoin = 'round'; g.fillStyle = '#fff';
  g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 12;
  g.strokeText(s[2], 960, H - 58); g.shadowBlur = 0; g.fillText(s[2], 960, H - 58); g.restore();
}
// ---------- HUD-таймер ----------
function hud(g, t, sh) {
  if (t < 38.3 || t > 63.8) return;
  if (['M', 'V'].includes(sh)) return;
  const v = timerInt(t), a = ss(38.3, 38.7, t);
  const pulse = (timerVal(t) % 1) > .85 ? 1 : 0;
  g.save(); g.globalAlpha = a; g.font = '600 44px Rubik'; g.textAlign = 'right'; g.textBaseline = 'middle';
  g.fillStyle = v <= 3 ? '#ff4040' : 'rgba(255,255,255,.9)'; g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 10;
  g.fillText('00:' + String(v).padStart(2, '0'), W - 70, 70);
  g.fillStyle = '#ff3b3b'; g.beginPath(); g.arc(W - 70 - 150, 70, 9 + pulse * 3, 0, TAU); g.fill();
  g.restore();
}
const SHOT_NAMES = 'A B D E F G H I J K L M N O P Q R S T U V W X Y Z'.split(' ');

// ---------- пост-эффекты ----------
const GRAIN = [0, 1, 2, 3].map(k => { const c = mk(480, 270), x = c.getContext('2d'), d = x.createImageData(480, 270); for (let i = 0; i < d.data.length; i += 4) { const v = rnd(i * .37 + k * 1000.3) * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; } x.putImageData(d, 0, 0); return c; });
let VIG;
function post(g, t) {
  g.save(); g.globalCompositeOperation = 'overlay'; g.globalAlpha = .07; g.imageSmoothingEnabled = false;
  g.drawImage(GRAIN[Math.floor(t * 24) % 4], 0, 0, W, H); g.restore();
  if (!VIG) { VIG = mk(); const x = VIG.getContext('2d'); const gr = x.createRadialGradient(960, 540, 450, 960, 540, 1150); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.55)'); x.fillStyle = gr; x.fillRect(0, 0, W, H); }
  g.drawImage(VIG, 0, 0);
  // каше
  g.fillStyle = '#000'; const bar = 54; g.fillRect(0, 0, W, bar); g.fillRect(0, H - bar, W, bar);
  // вход из черноты
  if (t < .8) { g.fillStyle = `rgba(0,0,0,${1 - ss(0, .8, t)})`; g.fillRect(0, 0, W, H); }
}

// ---------- кадр ----------
const T1 = mk(), t1 = T1.getContext('2d'), T2 = mk(), t2 = T2.getContext('2d');
function drawShot(i, g, t) { clear(g); g.save(); S[i].fn(g, t); g.restore(); }
function render(ctx, t) {
  t = clamp(t, 0, DUR - 1e-3);
  performanceT = t;
  let i = 0; while (i + 1 < S.length && t >= S[i + 1].s) i++;
  const sh = S[i], d = sh.tin.d || 0, k = d ? (t - sh.s) / d : 1;
  clear(ctx);
  if (k < 1 && i > 0 && sh.tin.type === 'fade') {
    drawShot(i - 1, t1, t); drawShot(i, t2, t);
    ctx.drawImage(T1, 0, 0); ctx.globalAlpha = eio(k); ctx.drawImage(T2, 0, 0); ctx.globalAlpha = 1;
  } else if (k < 1 && i > 0 && sh.tin.type === 'dip') {
    const half = k < .5; drawShot(half ? i - 1 : i, t1, t); ctx.drawImage(T1, 0, 0);
    ctx.fillStyle = `rgba(0,0,0,${half ? k * 2 : 2 - k * 2})`; ctx.fillRect(0, 0, W, H);
  } else {
    drawShot(i, t1, t); ctx.drawImage(T1, 0, 0);
    if (k < 1 && sh.tin.type === 'flash') { ctx.fillStyle = `rgba(255,255,255,${1 - k})`; ctx.fillRect(0, 0, W, H); }
  }
  post(ctx, t);
  if (render.subs !== false) subtitles(ctx, t);
  hud(ctx, t, SHOT_NAMES[i]);
}
window.PAUZA = { W, H, DUR, load, render };
})();
