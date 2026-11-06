/* «ПАУЗА» — серия 3 (финал сезона). Анимация на canvas, синхронизированная с озвучкой.
   Каждый кадр — чистая функция времени render(t), поэтому один и тот же код
   используется и для проигрывания в браузере, и для покадрового рендера в видео. */
(() => {
'use strict';
const W = 1920, H = 1080, DUR = 88;
// логический кадр всегда 1920×1080; вывод — 16:9 или 9:16 (вертикальный кадр вырезается из центра)
let OW = 1080, OH = 1920, BS = OH / H, OX = OW / 2 - 960 * BS, PORT = true;

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
function timerVal(t) { return t < 31 ? lerp(9, 0, t / 31) : 0; }
const timerInt = t => Math.max(0, Math.ceil(timerVal(t) - 1e-6));

// ---------- ресурсы ----------
const IMG = {};
const SPR = ['body', 'walk', 'front', 'profile', 'three4', 'think', 'skeptic', 'sarcastic', 'happy', 'surprise', 'old_front', 'old_body', 'old_smile'];
function load(base) {
  return Promise.all([
    ...SPR.map(n => new Promise((res, rej) => { const i = new Image(); i.onload = () => { IMG[n] = i; res(); }; i.onerror = rej; i.src = base + 'sprites/' + n + '.webp'; })),
    document.fonts.load('900 80px Rubik', 'ПАУЗА09'), document.fonts.load('500 40px Rubik', 'Привет09'), document.fonts.load('300 40px Rubik', '7:42'), document.fonts.load('80px "Rubik Glitch"', 'ПАУЗА'), document.fonts.load('700 80px Caveat', 'НЕ НАЖИМАЙ'),
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
  const dk = o.dusk || 0;
  gr.addColorStop(0, mixc('#7fb6e2', '#1c2350', dk)); gr.addColorStop(.55, mixc('#f6d6a4', '#c4566a', dk)); gr.addColorStop(1, mixc('#ffad74', '#ff8a4a', dk));
  g.fillStyle = gr; g.fillRect(260, 130, 640, 560);
  // солнце
  gr = g.createRadialGradient(720 - dk * 200, 560 + dk * 160, 10, 720 - dk * 200, 560 + dk * 160, 260);
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
  if (o.night) { g.save(); g.globalCompositeOperation = 'multiply'; g.fillStyle = 'rgb(70,80,125)'; g.fillRect(-W, -H, W * 3, H * 3); g.restore(); }
  if (dkAll(o)) { g.save(); g.globalCompositeOperation = 'multiply'; const d = o.dusk; g.fillStyle = `rgb(${lerp(255, 95, d)},${lerp(255, 80, d)},${lerp(255, 140, d)})`; g.fillRect(-W, -H, W * 3, H * 3); g.restore(); }
  if (o.car) drawCar(g, 260 + ((wt * 150 + 352.5) % 900 + 900) % 900 - 120, 0);
}
const dkAll = o => (o.dusk || 0) > 0;
function drawCar(g, x, y) {
  g.save(); g.beginPath(); g.rect(260, 130, 640, 560); g.clip();
  g.fillStyle = 'rgba(20,22,30,.9)'; g.fillRect(250, 682, 660, 10);
  const tr = g.createLinearGradient(x - 220, 0, x, 0); tr.addColorStop(0, 'rgba(255,60,50,0)'); tr.addColorStop(1, 'rgba(255,60,50,.45)');
  g.fillStyle = tr; g.fillRect(x - 220, 674, 220, 5);
  g.globalCompositeOperation = 'screen';
  const hl = g.createLinearGradient(x + 70, 0, x + 300, 0); hl.addColorStop(0, 'rgba(255,240,200,.7)'); hl.addColorStop(1, 'rgba(255,240,200,0)');
  g.fillStyle = hl; g.beginPath(); g.moveTo(x + 70, 672); g.lineTo(x + 300, 650); g.lineTo(x + 300, 692); g.lineTo(x + 70, 680); g.fill();
  g.globalCompositeOperation = 'source-over';
  g.fillStyle = '#14161c'; rr(g, x - 5, 664, 80, 18, 5); g.fill(); rr(g, x + 12, 652, 42, 16, 6); g.fill();
  g.fillStyle = 'rgba(255,210,140,.55)'; g.fillRect(x + 17, 655, 14, 9); g.fillRect(x + 35, 655, 14, 9);
  g.fillStyle = '#fff4d0'; g.fillRect(x + 70, 670, 6, 5); g.fillStyle = '#ff3b30'; g.fillRect(x - 5, 670, 5, 5);
  g.fillStyle = '#050608'; g.beginPath(); g.arc(x + 12, 683, 6, 0, TAU); g.arc(x + 58, 683, 6, 0, TAU); g.fill();
  g.restore();
}
function mixc(a, b, k) { const p = h => [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16)); const A = p(a), B = p(b); return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], k))).join(',')})`; }

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
  if (src._out) blit(g, src); else g.drawImage(src, x, y);
  g.filter = 'none';
  if (f > 0) { g.save(); g.globalCompositeOperation = 'multiply'; g.fillStyle = `rgba(165,195,245,${.5 * f})`; g.fillRect(0, 0, W, H); g.restore(); }
}
let B1, b1, T1, t1, T2, t2, VIG;
function outBuf() { const c = mk(OW, OH); c._out = true; return c; }
function setMode(m) {
  PORT = m !== 'landscape';
  [OW, OH] = PORT ? [1080, 1920] : [1920, 1080];
  BS = OH / H; OX = OW / 2 - 960 * BS;
  B1 = outBuf(); b1 = B1.getContext('2d'); if (typeof KLAY !== 'undefined') KLAY.length = 0; T1 = outBuf(); t1 = T1.getContext('2d'); T2 = outBuf(); t2 = T2.getContext('2d'); VIG = null;
}
function base(g) { g.setTransform(BS, 0, 0, BS, OX, 0); }
const toOut = (x, y) => [x * BS + OX, y * BS];
function clear(g) { g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.filter = 'none'; g.clearRect(0, 0, OW, OH); base(g); }
// вывести буфер размера экрана, игнорируя текущий логический transform
function blit(g, src, dx = 0, dy = 0) { g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(src, dx, dy); g.restore(); }

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
  if (st.figZ < 50) { g.save(); g.globalAlpha = st.figAlpha ?? 1; drawFigure(g, st); g.restore(); }
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
  if (turn < .98 && !st.back) { g.beginPath(); g.moveTo(-.07 + asy, -.97); g.quadraticCurveTo(-.11 + asy * 2, -.93, -.095 + asy * 1.5, -.86); g.lineTo(-.06, -.86); g.fill(); }
  // лицо в тени капюшона
  if (turn > .3 && !st.back) { const fa = ss(.3, 1, turn); g.fillStyle = `rgba(0,0,0,${fa})`; g.beginPath(); g.ellipse(lerp(-.03, 0, turn) + asy, hy - .005, hr * .62 * fa, hr * .82, 0, 0, TAU); g.fill(); }
  // контур света
  g.strokeStyle = 'rgba(175,205,230,.45)'; g.lineWidth = .005;
  g.beginPath(); g.moveTo(-.13, -.79); g.bezierCurveTo(-.11, -.86, -.1 + asy, -.99, -.005 + asy, -1.0); g.bezierCurveTo(.07 + asy * .3, -1.0, .1, -.9, .13, -.79); g.stroke();
  g.beginPath(); g.moveTo(-.13, -.79); g.quadraticCurveTo(-.17, -.77, -.17, -.7); g.stroke();
  g.beginPath(); g.moveTo(.13, -.79); g.quadraticCurveTo(.17, -.77, .17, -.7); g.stroke();
  // глаза
  const eyes = st.back ? 0 : (st.eyes ?? ss(.55, 1, turn)) * (st.eyeMul || 1);
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
  blit(g, B1); g.filter = 'none';
}

// =====================================================================
//                         СЦЕНЫ — СЕРИЯ 2
// =====================================================================
const S = [];
const shot = (s, tin, fn, o = {}) => S.push({ s, tin, fn, ...o });
const FREEZE2 = 36.05;           // второе нажатие
const LIT = LIGHTS.map(() => 1);

function corrBuf(c, st) { clear(b1); b1.save(); cam(b1, ...c); drawCorridor(b1, st); b1.restore(); }
function corrFrozen(g, c, st, f = 1) { corrBuf(c, st); frozenFilter(g, B1, f); }
function phoneBgCorr(g, frozen = 0) { frozenFilter(g, blurred('corrB'), frozen); g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, 0, W, H); }

// ---------- камеры наблюдения ----------
const CC = mk(960, 540), cc = CC.getContext('2d');
function cctv(g, x, y, w, h, t, kind, o = {}) {
  cc.setTransform(1, 0, 0, 1, 0, 0); cc.clearRect(0, 0, 960, 540); cc.setTransform(.5, 0, 0, .5, 0, 0);
  if (kind === 'corr') {
    cc.save(); cam(cc, 960, 470, 1.05, -.03); drawCorridor(cc, { figZ: 99, lights: LIT });
    if (o.elmir) { const A = figureAnchor(2.6); drawElmirStand(cc, A.x - 40, A.y, A.h * 1.02, 0); }
    cc.restore();
  } else if (kind === 'corr2') { cc.save(); cam(cc, 1200, 520, 1.6, .05); drawCorridor(cc, { figZ: 99, lights: LIT }); cc.restore(); }
  else if (kind === 'kitchen') { cc.save(); cam(cc, 1100, 520, 1.1); drawKitchen(cc, 12); cc.restore(); }
  else if (kind === 'door') { cc.save(); drawDoor(cc, 0, '214', 0); cc.restore(); }
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
  const ar = w / h; let sx = 0, sy = 0, sw = 960, sh = 540; if (ar < 960 / 540) { sw = 540 * ar; sx = (960 - sw) / 2; } else { sh = 960 / ar; sy = (540 - sh) / 2; }
  g.filter = 'grayscale(1) contrast(1.3) brightness(1.08)'; g.drawImage(CC, sx, sy, sw, sh, x, y, w, h); g.filter = 'none';
  g.fillStyle = 'rgba(40,80,60,.18)'; g.fillRect(x, y, w, h);
  g.globalCompositeOperation = 'overlay'; g.globalAlpha = .35; g.drawImage(GRAIN[(Math.floor(t * 24) + (o.seed || 0)) % 4], x, y, w, h); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  g.fillStyle = 'rgba(0,0,0,.18)'; for (let yy = y; yy < y + h; yy += 5) g.fillRect(x, yy, w, 2);
  const band = (t * 120 + (o.seed || 0) * 90) % (h + 200) - 100; g.fillStyle = 'rgba(255,255,255,.05)'; g.fillRect(x, y + band, w, 40);
  const fs = Math.max(14, Math.min(w, h) * .065); g.font = `500 ${fs}px Rubik`; g.textBaseline = 'top'; g.textAlign = 'left';
  g.fillStyle = 'rgba(255,255,255,.85)'; g.fillText(o.label || 'КАМ 02', x + fs * .7, y + fs * .6);
  g.textAlign = 'right'; g.fillText(o.time || tc(8 * 3600 + 14 * 60 + 7 + (t - 10)), x + w - fs * .7, y + h - fs * 1.6);
  if (Math.floor(t * 2) % 2 === 0) { g.fillStyle = '#ff3030'; g.beginPath(); g.arc(x + w - fs * 2.6, y + fs * 1.1, fs * .32, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,.85)'; g.textAlign = 'left'; g.fillText('REC', x + w - fs * 2.1, y + fs * .6); }
  if (o.stamp) { g.globalAlpha = o.stamp; g.fillStyle = 'rgba(200,20,20,.85)'; const sw = w * .7, sh = fs * 2; rr(g, x + (w - sw) / 2, y + (h - sh) / 2, sw, sh, 6); g.fill(); g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `900 ${fs * 1.05}px Rubik`; g.fillText('НЕТ ДВИЖЕНИЯ', x + w / 2, y + h / 2 + 2); g.globalAlpha = 1; }
  g.restore();
  g.strokeStyle = 'rgba(120,140,140,.6)'; g.lineWidth = 3; g.strokeRect(x, y, w, h);
}
const tc = s => { s = Math.max(0, Math.floor(s)); return [s / 3600 | 0, (s / 60 | 0) % 60, s % 60].map(v => String(v).padStart(2, '0')).join(':'); };

// ---------- дверь кабинета ----------
function drawDoor(g, openK, num, t) {
  let gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#6d7a7c'); gr.addColorStop(1, '#4b5658');
  g.fillStyle = gr; g.fillRect(-W, -H, W * 3, H * 3);
  g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(-W, 1020, W * 3, 80);
  // проём и комната
  const X0 = 730, Y0 = 170, DW = 460;
  g.fillStyle = '#2a2f31'; g.fillRect(X0 - 34, Y0 - 34, DW + 68, H);
  g.fillStyle = '#12171a'; g.fillRect(X0, Y0, DW, H);
  g.fillStyle = '#5d7380'; g.fillRect(X0 + 150, Y0 + 150, 220, 200); g.fillStyle = '#12171a'; g.fillRect(X0 + 255, Y0 + 150, 10, 200); g.fillRect(X0 + 150, Y0 + 245, 220, 8);
  g.fillStyle = 'rgba(120,150,170,.12)'; g.beginPath(); g.moveTo(X0 + 150, Y0 + 350); g.lineTo(X0 + 370, Y0 + 350); g.lineTo(X0 + 420, Y0 + 900); g.lineTo(X0 + 40, Y0 + 900); g.fill();
  g.fillStyle = '#06090a'; g.fillRect(X0 + 50, Y0 + 600, 360, 26); g.fillRect(X0 + 70, Y0 + 626, 14, 200); g.fillRect(X0 + 376, Y0 + 626, 14, 200);
  g.fillRect(X0 + 150, Y0 + 520, 120, 80); g.fillStyle = 'rgba(110,170,220,.25)'; g.fillRect(X0 + 158, Y0 + 528, 104, 62);
  g.fillStyle = '#06090a'; rr(g, X0 + 280, Y0 + 560, 90, 120, 14); g.fill(); g.fillRect(X0 + 318, Y0 + 680, 12, 120);
  // свет из коридора на полу комнаты
  g.fillStyle = `rgba(220,235,240,${.12 * openK})`; g.beginPath(); g.moveTo(X0, H); g.lineTo(X0 + DW, H); g.lineTo(X0 + DW * .8, Y0 + 820); g.lineTo(X0 + DW * .2, Y0 + 820); g.fill();
  // полотно двери
  const a = openK * 1.35, wp = DW * Math.cos(a), sk = 70 * Math.sin(a);
  gr = g.createLinearGradient(X0, 0, X0 + wp, 0); gr.addColorStop(0, '#8a7560'); gr.addColorStop(1, lerp(1, .5, openK) > .8 ? '#7a6550' : '#5a4838');
  g.fillStyle = gr; g.beginPath(); g.moveTo(X0, Y0); g.lineTo(X0 + wp, Y0 - sk); g.lineTo(X0 + wp, H + 20 + sk); g.lineTo(X0, H + 20); g.fill();
  g.fillStyle = `rgba(0,0,0,${.35 * openK})`; g.fill();
  if (wp > 120) {
    const k = wp / DW;
    g.fillStyle = '#c9c2b6'; g.beginPath(); g.moveTo(X0 + wp * .3, Y0 + 120 - sk * .3); g.lineTo(X0 + wp * .7, Y0 + 120 - sk * .7); g.lineTo(X0 + wp * .7, Y0 + 170 - sk * .7); g.lineTo(X0 + wp * .3, Y0 + 170 - sk * .3); g.fill();
    g.save(); g.translate(X0 + wp * .5, Y0 + 147 - sk * .5); g.scale(k, 1); g.fillStyle = '#222'; g.font = '700 30px Rubik'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('КАБ. ' + num, 0, 0); g.restore();
    g.fillStyle = '#d8d2c5'; rr(g, X0 + wp - 60 * k, Y0 + 520, 40 * k, 14, 7); g.fill();
  }
  g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(X0 - 34, Y0 - 34, DW + 68, 14);
}

// ---------- лист бумаги ----------
function drawPaper(g, x, y, w, h, rot, t, reveal) {
  g.save(); g.translate(x + w / 2, y + h / 2); g.rotate(rot); g.translate(-w / 2, -h / 2);
  g.shadowColor = 'rgba(0,0,0,.5)'; g.shadowBlur = 40; g.shadowOffsetY = 18;
  let gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#efe7d3'); gr.addColorStop(1, '#d9ceb4');
  g.fillStyle = gr; g.beginPath(); g.moveTo(0, 6); for (let i = 0; i <= 20; i++) g.lineTo(w * i / 20, (rnd(i) - .5) * 6); g.lineTo(w, h); g.lineTo(0, h); g.closePath(); g.fill();
  g.shadowBlur = 0; g.shadowOffsetY = 0;
  g.save(); g.clip();
  g.globalCompositeOperation = 'multiply'; g.globalAlpha = .25; g.drawImage(GRAIN[2], 0, 0, w, h); g.globalAlpha = 1;
  for (let i = 0; i < 5; i++) { const cx = rnd(i * 7) * w, cy = rnd(i * 7 + 1) * h, r = 40 + rnd(i * 7 + 2) * 120; const sg = g.createRadialGradient(cx, cy, 0, cx, cy, r); sg.addColorStop(0, 'rgba(150,110,60,.18)'); sg.addColorStop(1, 'rgba(150,110,60,0)'); g.fillStyle = sg; g.fillRect(cx - r, cy - r, r * 2, r * 2); }
  g.globalCompositeOperation = 'source-over';
  // сгибы
  g.strokeStyle = 'rgba(120,100,70,.35)'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, h / 2); g.lineTo(w, h / 2 + 4); g.moveTo(w / 2, 0); g.lineTo(w / 2 - 3, h); g.stroke();
  g.strokeStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.moveTo(0, h / 2 + 3); g.lineTo(w, h / 2 + 7); g.stroke();
  // надпись
  if (reveal) {
    const lines = reveal.lines(PORT);
    g.font = '700 100px Caveat'; const mw = Math.max(...lines.map(l => g.measureText(l[0]).width));
    const fs = Math.min(PORT ? w * .26 : w * .17, 100 * w * .84 / mw);
    g.font = `700 ${fs}px Caveat`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#1d1612';
    const lh = fs * (PORT ? .95 : 1.05), y0 = h / 2 - lh * (lines.length - 1) / 2;
    lines.forEach(([txt, st], i) => {
      const k = clamp((t - st) / .42);
      if (k <= 0) return;
      const tw = g.measureText(txt).width;
      g.save(); g.beginPath(); g.rect(w / 2 - tw / 2 - 20, y0 + i * lh - lh, (tw + 40) * eout(k), lh * 2); g.clip();
      g.translate(w / 2, y0 + i * lh); g.rotate(-.03 + i * .015);
      g.globalAlpha = .25; g.fillText(txt, 3, 3); g.globalAlpha = 1; g.fillText(txt, 0, 0);
      g.restore();
    });
  }
  g.restore();
  g.restore();
}

// ---------- исчезновение двойника ----------
const TILESC = {}, FILTC = {};
function tilesFor(name, im, ts) {
  if (TILESC[name]) return TILESC[name];
  const c = mk(im.width, im.height), x = c.getContext('2d'); x.drawImage(im, 0, 0);
  const d = x.getImageData(0, 0, im.width, im.height).data; const T = [];
  for (let ty = 0; ty < im.height; ty += ts) for (let tx = 0; tx < im.width; tx += ts) {
    let a = 0; for (let yy = ty; yy < Math.min(im.height, ty + ts); yy += 3) for (let xx = tx; xx < Math.min(im.width, tx + ts); xx += 3) a = Math.max(a, d[(yy * im.width + xx) * 4 + 3]);
    if (a > 10) T.push([tx, ty]);
  }
  return TILESC[name] = T;
}
function filtered(name, filter) {
  const key = name + '|' + filter; if (FILTC[key]) return FILTC[key];
  const im = IMG[name], c = mk(im.width, im.height), x = c.getContext('2d'); x.filter = filter; x.drawImage(im, 0, 0);
  return FILTC[key] = c;
}
// распад спрайта на квадраты; order(u, v, i) → 0..1 — кто исчезает раньше
function dissolveSprite(g, name, x, top, h, t, t0, span = 2.2, order = null, filter = 'none') {
  const im = IMG[name], src = filter === 'none' ? im : filtered(name, filter), s = h / im.height, w = im.width * s, ts = 16;
  const tl = tilesFor(name, im, ts);
  g.save(); g.translate(x - w / 2, top); g.scale(s, s);
  const glow = [];
  tl.forEach(([tx, ty], i) => {
    const u = tx / im.width, v = ty / im.height;
    const ord = order ? clamp(order(u, v, i)) * .75 + .25 * rnd(i * 1.3) : .45 * rnd(i * 1.3) + .4 * (1 - v) * .6 + .35 * u;
    const p = clamp((t - t0 - ord * span * .7) / .9);
    if (p >= 1) return;
    if (p <= 0) { g.drawImage(src, tx, ty, ts, ts, tx - .3, ty - .3, ts + .6, ts + .6); return; }
    const e = p * p, dx = e * (160 + rnd(i) * 320) / s, dy = -e * (260 + rnd(i + 5) * 300) / s + Math.sin(p * 6 + i) * 6 * p / s;
    g.save(); g.globalAlpha *= 1 - p; g.translate(tx + ts / 2 + dx, ty + ts / 2 + dy); g.rotate(p * (rnd(i + 9) - .5) * 4); const sc = 1 - p * .5; g.scale(sc, sc);
    g.drawImage(src, tx, ty, ts, ts, -ts / 2 - .5, -ts / 2 - .5, ts + 1, ts + 1); g.restore();
    if (p < .5) glow.push([tx + ts / 2 + dx, ty + ts / 2 + dy, 1 - p * 2]);
  });
  g.globalCompositeOperation = 'lighter';
  for (const [gx, gy, a] of glow) { g.fillStyle = `rgba(150,200,255,${a * .5})`; g.fillRect(gx - 5, gy - 5, 10, 10); }
  g.restore();
}
const dissolveHead = (g, name, x, top, h, t, t0, span) => dissolveSprite(g, name, x, top, h, t, t0, span);

// ---------- лист в руке ----------
function paperInHand(g, t, k) {
  const y = lerp(1200, 560, eout(k)), x = 960, rot = -.06 + Math.sin(t * 9) * .004 * k;
  drawPaper(g, x - 170, y, 340, 440, rot, t, false);
  // просвечивающий текст с обратной стороны
  g.save(); g.translate(x, y + 220); g.rotate(rot); g.scale(-1, 1); g.globalAlpha = .12 * k; g.fillStyle = '#1d1612'; g.font = '700 58px Caveat'; g.textAlign = 'center'; g.fillText('Я НАЖАЛ', 0, -20); g.fillText('ТРЕТИЙ РАЗ.', 0, 50); g.restore();
  // кисть
  const gr = g.createLinearGradient(0, y + 360, 0, y + 520); gr.addColorStop(0, '#cfa68c'); gr.addColorStop(1, '#a87e66');
  g.fillStyle = '#1c2742'; g.beginPath(); g.moveTo(x - 330, H + 50); g.quadraticCurveTo(x - 260, y + 520, x - 120, y + 500); g.lineTo(x + 40, y + 560); g.lineTo(x - 60, H + 50); g.fill();
  g.fillStyle = gr; g.beginPath(); g.ellipse(x - 70, y + 470, 95, 70, -.2, 0, TAU); g.fill();
  for (let i = 0; i < 4; i++) { g.save(); g.translate(x - 150 + i * 46, y + 412 + Math.abs(i - 1.5) * 6); g.rotate(-.08); rr(g, -21, -34, 42, 78, 21); g.fill(); g.fillStyle = 'rgba(230,200,185,.55)'; rr(g, -13, -28, 26, 24, 11); g.fill(); g.fillStyle = gr; g.restore(); }
}

// ---------------- сцены — серия 3 ----------------
const PAPER3 = { lines: port => port
  ? [['Я НАЖАЛ', 15.34], ['ТРЕТИЙ РАЗ.', 15.95], ['И ВРЕМЯ', 17.14], ['ДЛЯ МЕНЯ', 17.6], ['БОЛЬШЕ НЕ', 18.32], ['ПОШЛО', 18.85]]
  : [['Я НАЖАЛ ТРЕТИЙ РАЗ.', 15.34], ['И ВРЕМЯ ДЛЯ МЕНЯ', 17.14], ['БОЛЬШЕ НЕ ПОШЛО.', 18.32]] };
const FZ = 66.45;                                   // ночная остановка времени
const wt3 = t => t < FZ ? t : FZ;
const GHOST_T = 2.55;                               // насколько двойник «стёрт», пока стоит время
// призрак-двойник: частично рассыпан и мерцает
function ghost(g, name, x, top, h, t, order, extra = 0) {
  const fl = .72 + .2 * Math.sin(t * 23) * Math.sin(t * 7.3) + (rnd(Math.floor(t * 18)) > .9 ? -.3 : 0);
  g.save(); g.globalAlpha = clamp(fl);
  dissolveSprite(g, name, x, top, h, GHOST_T + extra, 1.2, 3.4, order, 'brightness(.95) saturate(.55) hue-rotate(-10deg)');
  g.restore();
}
const handsFirst = (u, v) => Math.min(Math.hypot(u - .12, v - .56), Math.hypot(u - .8, v - .5)) * 1.6;
const faceOut = (u, v) => .9 - Math.hypot(u - .5, v - .45) * 1.4;
function nightKitchen(g, t, c, o = {}) {
  clear(b1); b1.save(); cam(b1, ...c); drawKitchen(b1, wt3(t), { dusk: 1, night: 1, car: o.car, ...o }); b1.restore();
  frozenFilter(g, B1, o.frozen || 0);
}
function voidClocks(g, t) {
  const gr = g.createRadialGradient(960, 540, 50, 960, 540, 1100); gr.addColorStop(0, '#16233a'); gr.addColorStop(1, '#03050a');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  const drift = (t - 27.2) * 18;
  const cl = [];
  for (let i = 0; i < 18; i++) cl.push([PORT ? 600 + rnd(i * 3) * 720 : rnd(i * 3) * 2200 - 140, rnd(i * 3 + 1) * 1300 - 110, .35 + rnd(i * 3 + 2) * 1.2, i]);
  cl.sort((a, b) => a[2] - b[2]);
  for (const [x, y, z, i] of cl) {
    g.save(); g.globalAlpha = .25 + .55 * (z / 1.55);
    g.filter = z < .7 ? 'blur(3px) saturate(.4)' : 'saturate(.5)';
    drawClock(g, x + drift * z * (i % 2 ? 1 : -1), y - drift * .3 * z, 46 * z, 1000 + i * 1337);
    g.filter = 'none'; g.restore();
  }
}

// A — двойник начал исчезать
shot(0, { type: 'cut' }, (g, t) => {
  frozenFilter(g, blurred('corrB'), 1); g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(0, 0, W, H);
  dissolveSprite(g, 'old_front', 960, 130 - t * 6, 975 + t * 15, t, .5, 4.5, faceOut, 'brightness(.9) saturate(.75)');
});
// B — сначала руки
shot(2.4, { type: 'cut' }, (g, t) => {
  frozenFilter(g, blurred('corrB'), 1); g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(0, 0, W, H);
  const h = 1350, top = 40 - (t - 2.4) * 8;
  dissolveSprite(g, 'old_body', 960, top, h, t, 2.55, 6, handsFirst, 'brightness(.85) saturate(.7)');
});
// C — потом лицо
shot(3.7, { type: 'cut' }, (g, t) => {
  frozenFilter(g, blurred('corrB'), 1); g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(0, 0, W, H);
  dissolveSprite(g, 'old_front', 960, -120 - (t - 3.7) * 20, 1300 + (t - 3.7) * 40, t, 3.8, 3.2, faceOut, 'brightness(.88) saturate(.7)');
});
// D — пальцы прошли сквозь него
shot(4.9, { type: 'cut' }, (g, t) => {
  frozenFilter(g, blurred('corrB'), 1); g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, 0, W, H);
  const reach = eio(ss(5.6, 7.6, t)), touch = t > 7.4;
  const ex = (PORT ? 800 : 860) + reach * 70, hx = ex + .45 * 1150 * IMG.walk.width / IMG.walk.height, hy = 1180 - 1150 * .7;
  drawElmirWalk(g, ex, 1180, 1150, Math.PI, -1, 0);
  ghost(g, 'old_body', PORT ? 1170 : 1240, 30, 1350, t, handsFirst, touch ? (t - 7.4) * .25 : 0);
  if (touch) for (let k = 0; k < 3; k++) { const p = clamp((t - 7.45 - k * .22) / .9); if (p <= 0 || p >= 1) continue; g.strokeStyle = `rgba(170,215,255,${(1 - p) * .8})`; g.lineWidth = 4; g.beginPath(); g.ellipse(hx, hy, 30 + p * 160, 20 + p * 110, 0, 0, TAU); g.stroke(); }
});
// E — несколько секунд
shot(8.9, { type: 'cut' }, (g, t) => {
  phoneBgCorr(g, 1);
  const beat = 1 + .04 * Math.exp(-((t - 8.9) % 1) * 6);
  g.save(); cam(g, 960, 640, 1.85 * beat);
  drawPhone(g, t, sg => appScreen(sg, t, { btn: 1, label: 1, digit: 1, digitText: '1', timer: 1, num: timerInt(t), frac: timerVal(t) / 30, glow: .7, beat }));
  g.restore();
}, { noHud: true });
// F — ещё одна записка
shot(11.55, { type: 'cut' }, (g, t) => {
  frozenFilter(g, blurred('corrB'), 1); g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(0, 0, W, H);
  ghost(g, 'old_body', 960, 40 - (t - 11.55) * 10, 2000, t, handsFirst);
  paperInHand(g, t, lin(12.2, 13.4, t));
});
// G — «Я НАЖАЛ ТРЕТИЙ РАЗ. И ВРЕМЯ ДЛЯ МЕНЯ БОЛЬШЕ НЕ ПОШЛО»
shot(15.2, { type: 'cut' }, (g, t) => {
  frozenFilter(g, blurred('corrB'), 1); g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(0, 0, W, H);
  const z = lerp(1.0, 1.1, ss(15.2, 19.7, t)), tr = Math.sin(t * 11) * 2;
  const hit = Math.max(...[15.34, 17.14, 18.32].map(s => t > s ? Math.exp(-(t - s) * 5) : 0)), [sx, sy] = shake(t, 8 * hit);
  g.save(); g.translate(sx, sy); cam(g, 960, 540, z);
  if (PORT) drawPaper(g, 690, 60 + tr, 540, 960, -.02, t, PAPER3); else drawPaper(g, 380, 90 + tr, 1160, 900, -.02, t, PAPER3);
  g.restore();
  // края листа начинают рассыпаться
  if (t > 19.0) { g.save(); g.globalCompositeOperation = 'screen'; for (let i = 0; i < 40; i++) { const p = clamp((t - 19.0 - rnd(i) * .5) / .8); if (p <= 0) continue; g.fillStyle = `rgba(200,220,255,${(1 - p) * .6})`; g.fillRect(700 + rnd(i + 1) * 520 + p * 120, 80 + rnd(i + 2) * 900 - p * 200, 8, 8); } g.restore(); }
});
// H — я посмотрел на него
shot(19.7, { type: 'cut' }, (g, t) => {
  headBg(g, 'corr'); frozenFilter(g, blurred('corrB'), 1);
  head(g, 'skeptic', 960, 110 - (t - 19.7) * 6, 1000 + (t - 19.7) * 30, -.01, 1, 'saturate(.8) brightness(.85)');
});
// I — на телефон
shot(21.3, { type: 'cut' }, (g, t) => {
  phoneBgCorr(g, 1);
  g.save(); cam(g, 960, 600, lerp(1.4, 1.6, lin(21.3, 22.4, t)));
  drawPhone(g, t, sg => appScreen(sg, t, { btn: 1, label: 1, digit: 1, digitText: '1', timer: 1, num: timerInt(t), frac: timerVal(t) / 30, glow: .6 }));
  g.restore();
}, { noHud: true });
// J — и наконец всё понял
shot(22.4, { type: 'cut' }, (g, t) => {
  headBg(g, 'corr'); frozenFilter(g, blurred('corrB'), 1);
  const k = t - 22.4;
  if (t < 23.44) head(g, 'think', 960, 120, 980 + k * 30, 0, 1, 'saturate(.8) brightness(.85)');
  else {
    const z = eout(lin(23.44, 23.8, t));
    head(g, 'surprise', 960, 110 - z * 60, 1000 + z * 160, 0, 1, 'saturate(.85) brightness(.9)');
    // вспышки воспоминаний
    const fl = [[23.44, 'old_front'], [23.62, 'surprise'], [23.8, 'old_front']].filter(([s]) => t >= s && t < s + .09);
    if (fl.length) { g.fillStyle = 'rgba(255,255,255,.85)'; g.fillRect(0, 0, W, H); head(g, fl[0][1], 960, 80, 1050, 0, .9, 'grayscale(1) contrast(1.4)'); }
  }
});
// K — это был я, только из будущего (сплит)
shot(24.5, { type: 'cut' }, (g, t) => {
  g.fillStyle = '#05070a'; g.fillRect(0, 0, W, H);
  const old = .45 + .55 * ss(25.77, 26.3, t), z = (t - 24.5) * 10;
  const halves = PORT
    ? [[[656, 0, 608, 540], 'front', 960, -60 - z, 720 + z, 1], [[656, 540, 608, 540], 'old_front', 960, 480 - z * .5, 720 + z, old]]
    : [[[0, 0, 960, 1080], 'front', 480, 60 - z, 1000 + z, 1], [[960, 0, 960, 1080], 'old_front', 1440, 60 - z, 1000 + z, old]];
  for (const [[x, y, w, h], name, hx, top, hh, br] of halves) {
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
    g.drawImage(blurred('corrB'), 0, 0); g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(x, y, w, h);
    head(g, name, hx, top, hh, 0, 1, `brightness(${br * .9}) saturate(.8)`);
    g.restore();
  }
  g.save(); g.shadowColor = '#bfe3ff'; g.shadowBlur = 30; g.fillStyle = 'rgba(220,240,255,.9)';
  if (PORT) g.fillRect(656, 537, 608 * eout(lin(24.5, 24.9, t)), 4); else g.fillRect(958, 0, 4, 1080 * eout(lin(24.5, 24.9, t)));
  g.restore();
});
// L — застрял там, где время остановилось навсегда
shot(27.2, { type: 'fade', d: .4 }, (g, t) => {
  voidClocks(g, t);
  ghost(g, 'old_front', 960, 330 - (t - 27.2) * 10, 420 - (t - 27.2) * 25, t, faceOut);
  const fade = ss(29.6, 30.9, t); g.fillStyle = `rgba(0,0,0,${fade * .55})`; g.fillRect(0, 0, W, H);
});
// M — всё вокруг ожило
shot(30.9, { type: 'dip', d: .3 }, (g, t) => {
  const st = { figZ: 99, lights: LIT };
  const c = [960, 520, 1.25 - ss(30.9, 33.9, t) * .1];
  corrBuf(c, st);
  frozenFilter(g, B1, 1);
  const O = [960, 1080], r = Math.pow(lin(31.05, 32.2, t), 1.4) * 2400;
  if (r > 0) { g.save(); g.beginPath(); g.arc(O[0], O[1], r, 0, TAU); g.clip(); blit(g, B1); g.restore();
    if (r < 2300) { g.save(); g.strokeStyle = 'rgba(255,225,180,.85)'; g.lineWidth = 8; g.shadowColor = '#ffd9a0'; g.shadowBlur = 40; g.beginPath(); g.arc(O[0], O[1], r, 0, TAU); g.stroke(); g.restore(); } }
  if (t > 31.05) { const f = Math.exp(-(t - 31.05) * 5); g.fillStyle = `rgba(255,240,215,${f * .3})`; g.fillRect(0, 0, W, H); }
});
// N — а он исчез
shot(33.9, { type: 'cut' }, (g, t) => {
  corridorShot(g, t, [960, 470, 1.9], { figZ: 99, lights: LIT });
  g.save(); g.globalAlpha = .85;
  dissolveSprite(g, 'old_body', 960, 120, 1250, GHOST_T + (Math.min(t, 35.4) - 33.9) * 1.9, 1.2, 3.4, handsFirst, 'brightness(.95) saturate(.55) hue-rotate(-10deg)');
  g.restore();
  g.save(); g.globalCompositeOperation = 'screen';
  for (let i = 0; i < 90; i++) { const p = clamp((t - 33.95 - rnd(i) * .9) / 1.1); if (p <= 0 || p >= 1) continue; g.fillStyle = `rgba(180,215,255,${(1 - p) * .8})`; g.fillRect(760 + rnd(i + 1) * 400 + p * 260 * (rnd(i + 4) - .3), 150 + rnd(i + 2) * 800 - p * 420, 7, 7); }
  g.restore();
});
// O — я стоял посреди коридора
shot(35.5, { type: 'cut' }, (g, t) => {
  const k = ss(35.5, 39.45, t);
  clear(b1); b1.save(); cam(b1, 960, lerp(560, 520, k), lerp(2.2, 1.35, k), lerp(.02, -.01, k)); drawCorridor(b1, { figZ: 99, lights: LIT });
  const A = figureAnchor(2.0); drawElmirStand(b1, A.x, A.y, A.h * 1.02, t);
  b1.globalCompositeOperation = 'multiply'; b1.fillStyle = 'rgba(200,215,230,.5)'; b1.fillRect(-W, -H, W * 3, H * 3); b1.restore();
  blit(g, B1);
});
// P — оставалась одна попытка
shot(39.45, { type: 'cut' }, (g, t) => {
  phoneBgCorr(g);
  const c = keys(t, [[39.45, [960, 560, 1.15]], [41.0, [960, 330, 1.9]], [42.3, [960, 300, 2.1]]], eio);
  g.save(); cam(g, ...c);
  drawHandBack(g); drawPhone(g, t, sg => appScreen(sg, t, { btn: 1, label: 1, digit: 1, digitText: '1', digitFlash: t > 41.2 ? clamp(1 - (t - 41.2) / .7) : 0, glow: .4 + .4 * Math.sin(t * 5) })); drawHandFront(g);
  g.restore();
}, { noHud: true });
// Q — я удалил приложение
shot(42.3, { type: 'cut' }, (g, t) => {
  phoneBgCorr(g);
  const [ix, iy] = iconWorld();
  g.save(); cam(g, ix, iy + 40, 1.9);
  drawHandBack(g);
  drawPhone(g, t, sg => {
    const gone = ss(43.25, 43.6, t);
    homeScreen(sg, t, 1 - gone + (gone >= 1 ? 0 : 0), 0, false);
    if (gone < 1) {
      const [x, y] = iconPos(NEWC, NEWR), b = ss(42.55, 42.75, t) * (1 - gone);
      sg.save(); sg.translate(x + 6, y + 6); sg.scale(b, b); sg.fillStyle = '#e8e8ea'; sg.beginPath(); sg.arc(0, 0, 16, 0, TAU); sg.fill();
      sg.strokeStyle = '#333'; sg.lineWidth = 3; sg.beginPath(); sg.moveTo(-6, -6); sg.lineTo(6, 6); sg.moveTo(6, -6); sg.lineTo(-6, 6); sg.stroke(); sg.restore();
    }
    if (t > 43.25 && t < 43.9) { const p = lin(43.25, 43.9, t), [x, y] = iconPos(NEWC, NEWR); for (let i = 0; i < 14; i++) { const a = rnd(i) * TAU; sg.fillStyle = `rgba(255,60,60,${1 - p})`; sg.fillRect(x + ICON / 2 + Math.cos(a) * p * 90, y + ICON / 2 + Math.sin(a) * p * 90, 6, 6); } }
  });
  drawHandFront(g);
  const e = eout(ss(42.35, 42.6, t)) * (1 - ss(43.0, 43.15, t)) + eout(ss(43.1, 43.25, t)) * (1 - ss(43.4, 43.8, t));
  thumb(g, lerp(1350, ix + 10, e), lerp(1150, iy + 30, e), -.62);
  g.restore();
}, { noHud: true });
// R — выключил телефон
shot(43.9, { type: 'cut' }, (g, t) => {
  phoneBgCorr(g);
  g.save(); cam(g, 960, 560, 1.12);
  drawHandBack(g);
  drawPhone(g, t, sg => {
    sg.fillStyle = '#000'; sg.fillRect(0, 0, SW, SHh);
    const k1 = ss(44.35, 44.6, t), k2 = ss(44.6, 44.8, t);
    if (k2 < 1) { sg.save(); sg.translate(SW / 2, SHh / 2); sg.scale(lerp(1, .9, k1) * (1 - k2 * .999), lerp(1, .004, k1)); sg.translate(-SW / 2, -SHh / 2); homeScreen(sg, t, 0, 0, false); sg.restore();
      if (k1 > .9) { sg.fillStyle = `rgba(255,255,255,${1 - k2})`; sg.fillRect(SW / 2 - SW / 2 * (1 - k2), SHh / 2 - 2, SW * (1 - k2), 4); } }
  });
  drawHandFront(g);
  g.restore();
}, { noHud: true });
// S — пообещал себе не вспоминать
shot(45.3, { type: 'cut' }, (g, t) => {
  headBg(g, 'corr'); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, 0, W, H);
  const k = t - 45.3;
  head(g, 'front', 960, 140 - k * 10, 960 + k * 35, 0, 1, 'brightness(.85)');
  g.fillStyle = `rgba(0,0,0,${ss(48.2, 49.0, t)})`; g.fillRect(0, 0, W, H);
});
// T — прошла неделя (дни и ночи)
shot(49.0, { type: 'cut' }, (g, t) => {
  const k = lin(49.0, 50.45, t), dusk = .5 - .5 * Math.cos(k * TAU * 3.5);
  clear(b1); b1.save(); cam(b1, 1050, 540, 1.12); drawKitchen(b1, 5 + k * 600000, { dusk }); b1.restore();
  blit(g, B1);
  g.fillStyle = `rgba(0,0,0,${1 - ss(49.0, 49.3, t)})`; g.fillRect(0, 0, W, H);
});
// U — всё вернулось на свои места
shot(50.45, { type: 'fade', d: .3 }, (g, t) => {
  clear(b1); b1.save(); cam(b1, PORT ? 1000 : 1050, 560, lerp(1.06, 1.12, ss(50.45, 52.45, t))); drawKitchen(b1, t); drawElmirStand(b1, 1000, 1045, 880, t); b1.restore();
  blit(g, B1);
});
// V — однажды ночью телефон загорелся сам
shot(52.45, { type: 'dip', d: .5 }, (g, t) => {
  const lit = ss(55.0, 55.25, t), c = [1330, 700, lerp(1.6, 2.4, ss(52.6, 56.6, t))];
  nightKitchen(g, t, c);
  g.fillStyle = 'rgba(0,4,18,.12)'; g.fillRect(0, 0, W, H);
  // телефон на столе
  g.save(); cam(g, ...c);
  g.fillStyle = '#0c0d10'; g.beginPath(); g.moveTo(1270, 768); g.lineTo(1400, 768); g.lineTo(1390, 760); g.lineTo(1285, 760); g.fill();
  if (lit > 0) {
    g.fillStyle = `rgba(200,225,255,${lit})`; g.beginPath(); g.moveTo(1274, 765); g.lineTo(1396, 765); g.lineTo(1388, 761); g.lineTo(1287, 761); g.fill();
    g.globalCompositeOperation = 'screen';
    const gr = g.createRadialGradient(1335, 740, 5, 1335, 740, 420); gr.addColorStop(0, `rgba(150,190,255,${.55 * lit})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(900, 300, 900, 700);
    if (t > 55.2 && t < 56.6) { g.strokeStyle = `rgba(200,225,255,${.6 * lit})`; g.lineWidth = 2; for (let k = 0; k < 2; k++) { const o = 20 + k * 14 + (t * 50 % 10); g.beginPath(); g.arc(1335, 760, o, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); } }
  }
  g.restore();
});
// W/X — сообщение «ПОСЛЕДНЯЯ ОСТАНОВКА ИСПОЛЬЗОВАНА»
function lockScreen(sg, t) {
  const gr = sg.createLinearGradient(0, 0, 0, SHh); gr.addColorStop(0, '#0b0f1c'); gr.addColorStop(1, '#030407'); sg.fillStyle = gr; sg.fillRect(0, 0, SW, SHh);
  statusBar(sg, false);
  sg.fillStyle = 'rgba(255,255,255,.9)'; sg.textAlign = 'center'; sg.font = '300 96px Rubik'; sg.fillText('3:17', SW / 2, 190); sg.font = '400 20px Rubik'; sg.fillText('пятница, 14 ноября', SW / 2, 240);
  const k = eout(lin(57.3, 57.75, t)); if (k <= 0) return;
  const y = lerp(-200, 300, k), cw = SW - 40, ch = t > 59.1 ? lerp(110, 360, eout(lin(59.1, 59.5, t))) : 110;
  sg.save(); sg.globalAlpha = k; sg.fillStyle = 'rgba(40,42,50,.92)'; rr(sg, 20, y, cw, ch, 26); sg.fill();
  pauseIcon(sg, 38, y + 20, 44, .6); sg.textAlign = 'left'; sg.fillStyle = '#ddd'; sg.font = '600 20px Rubik'; sg.fillText('ПАУЗА', 96, y + 38); sg.fillStyle = '#888'; sg.font = '400 17px Rubik'; sg.textAlign = 'right'; sg.fillText('сейчас', SW - 40, y + 38);
  sg.textAlign = 'left'; sg.fillStyle = '#bbb'; sg.font = '400 19px Rubik'; if (t < 59.1) sg.fillText('Новое сообщение', 96, y + 72);
  const words = [['ПОСЛЕДНЯЯ', 59.17], ['ОСТАНОВКА', 59.85], ['ИСПОЛЬЗОВАНА', 60.45]];
  words.forEach(([w, s], i) => { const p = clamp((t - s) / .25); if (p <= 0) return; sg.globalAlpha = k * p; sg.fillStyle = '#ff3b3b'; sg.font = '900 44px Rubik'; sg.shadowColor = '#ff2020'; sg.shadowBlur = 18 * p; sg.fillText(w, 40, y + 130 + i * 70 + (1 - p) * 12); sg.shadowBlur = 0; });
  sg.restore();
}
shot(56.6, { type: 'cut' }, (g, t) => {
  g.fillStyle = '#020306'; g.fillRect(0, 0, W, H);
  const zz = PORT ? 1.3 : 1.75; const c = keys(t, [[56.6, [960, 560, 1.1]], [58.8, [960, 560, 1.15]], [59.6, [960, 520, zz]], [61.8, [960, 520, zz * 1.05]]], eio);
  const gl = t > 61.0 && rnd(Math.floor(t * 20)) > .6;
  g.save(); cam(g, ...c, gl ? .01 : 0);
  drawPhone(g, t, sg => lockScreen(sg, t));
  g.restore();
  g.save(); g.globalCompositeOperation = 'screen'; const gr = g.createRadialGradient(960, 560, 100, 960, 560, 900); gr.addColorStop(0, `rgba(80,110,200,${.2 + .15 * ss(59.1, 59.6, t)})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); g.restore();
}, { noHud: true });
// Y — я замер
shot(61.75, { type: 'cut' }, (g, t) => {
  g.fillStyle = '#04060a'; g.fillRect(0, 0, W, H);
  head(g, 'surprise', 960, 100, 1020 + (t - 61.75) * 30, 0, 1, 'brightness(.55) saturate(.7)');
  phoneGlow(g, 960, 1250, 1, '255,70,70');
});
// Z — я ведь не нажимал
shot(62.9, { type: 'cut' }, (g, t) => {
  g.fillStyle = '#020306'; g.fillRect(0, 0, W, H);
  g.save(); cam(g, 960, 640, lerp(1.6, 1.8, lin(62.9, 64.4, t)));
  const gl = rnd(Math.floor(t * 15)) > .7;
  drawPhone(g, t, sg => { appScreen(sg, t, { btn: 1, label: 1, digit: 1, digitText: '0', glow: gl ? 1 : .2, press: 1 }); if (gl) { sg.fillStyle = 'rgba(255,0,0,.15)'; sg.fillRect(0, rnd(Math.floor(t * 15)) * SHh, SW, 40); } });
  g.restore();
}, { noHud: true });
// AA — часы на стене остановились
shot(64.4, { type: 'cut' }, (g, t) => {
  const f = ss(66.45, 66.9, t);
  nightKitchen(g, t, [1300, 232, lerp(4.2, 4.7, ss(64.4, 67.3, t)), -.03], { frozen: f });
  g.fillStyle = 'rgba(0,4,18,.08)'; g.fillRect(0, 0, W, H);
  if (t > 66.45) { const fl = Math.exp(-(t - 66.45) * 5); g.fillStyle = `rgba(200,225,255,${fl * .3})`; g.fillRect(0, 0, W, H); }
});
// AB — за окном зависла машина
shot(67.3, { type: 'cut' }, (g, t) => {
  nightKitchen(g, t, [600, 640, lerp(3.4, 3.9, ss(67.3, 69.45, t))], { frozen: .6, car: 1 });
  g.fillStyle = 'rgba(0,4,18,.25)'; g.fillRect(0, 0, W, H);
});
// AC — из тёмного коридора послышались шаги
shot(69.45, { type: 'cut' }, (g, t) => {
  const steps = [71.05, 71.6, 72.15], hit = Math.max(...steps.map(s => t > s ? Math.exp(-(t - s) * 6) : 0));
  const lights = [0, 0, 0, 0, .15 + .25 * hit, .35];
  corrFrozen(g, [960, 520, lerp(1.1, 1.5, ss(69.45, 72.5, t))], { figZ: 5.2, back: false, turn: 1, eyes: 0, figAlpha: ss(71.0, 72.4, t) * .5, lights, dark: .55 });
});
// AD — я медленно повернулся
shot(72.5, { type: 'cut' }, (g, t) => {
  g.fillStyle = '#04060a'; g.fillRect(0, 0, W, H);
  const k = lin(72.6, 74.4, t), seq = ['profile', 'three4', 'surprise'];
  const pos = k * 2, i = Math.min(1, Math.floor(pos)), fr = ss(.55, 1, pos - i);
  const f = 'brightness(.5) saturate(.7)';
  head(g, seq[i], 960, 110, 1000, 0, 1 - (i === 1 && pos >= 2 ? 1 : 0) * fr, f);
  if (fr > 0) head(g, seq[i + 1], 960, 110, 1000, 0, fr, f);
  phoneGlow(g, 960, 1250, .8, '255,70,70');
});
// AE — в дверях стоял мой двойник
shot(74.6, { type: 'cut' }, (g, t) => {
  g.fillStyle = '#0d1013'; g.fillRect(0, 0, W, H);
  const z = lerp(1.0, 1.12, ss(74.6, 77.2, t));
  g.save(); cam(g, 960, 560, z);
  g.save(); g.beginPath(); g.rect(740, 120, 440, 960); g.clip();
  g.save(); g.translate(960, 600); g.scale(.45, .45); g.translate(-960, -540); drawCorridor(g, { figZ: 99, lights: [0, 0, 0, .4, .6, .8], dark: .25 }); g.restore();
  const im = IMG.old_body, h = 1050, w = im.width * h / im.height;
  g.filter = 'blur(6px) brightness(2.4) saturate(0)'; g.globalAlpha = .35; g.drawImage(im, 960 - w / 2 - 4, 170, w + 8, h); g.globalAlpha = 1;
  g.filter = 'brightness(.12) saturate(.3)'; g.drawImage(im, 960 - w / 2, 175, w, h); g.filter = 'none';
  g.restore();
  g.fillStyle = '#1c2125'; g.fillRect(712, 92, 28, 990); g.fillRect(1180, 92, 28, 990); g.fillRect(712, 92, 496, 28);
  g.restore();
  phoneGlow(g, 960, 1200, .35, '255,70,70');
});
// AF — только теперь…
shot(77.2, { type: 'cut' }, (g, t) => {
  g.fillStyle = '#030405'; g.fillRect(0, 0, W, H);
  const k = t - 77.2;
  head(g, 'old_front', 960, 60 - k * 20, 1200 + k * 50, 0, 1, 'brightness(.14) contrast(1.2) saturate(.4)');
  g.save(); g.beginPath(); g.rect(0, 60 - k * 20 + (1200 + k * 50) * .4, W, (1200 + k * 50) * .12); g.clip();
  head(g, 'old_front', 960, 60 - k * 20, 1200 + k * 50, 0, .7, 'brightness(.6) contrast(1.2) saturate(.5)'); g.restore();
});
// AG — он улыбался… (и две секунды тишины)
shot(78.6, { type: 'cut' }, (g, t) => {
  g.fillStyle = '#020304'; g.fillRect(0, 0, W, H);
  const k = t - 78.6, lit = ss(79.15, 80.0, t);
  head(g, 'old_smile', 960, 60 - k * 14, 1000 + k * 32, 0, 1, `brightness(${lerp(.1, .8, lit)}) contrast(1.15) saturate(${lerp(.3, .75, lit)})`);
  g.save(); g.globalCompositeOperation = 'multiply'; const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, 'rgba(40,10,10,1)'); gr.addColorStop(.55, 'rgba(255,200,190,1)'); gr.addColorStop(1, 'rgba(255,120,110,1)'); g.globalAlpha = lit * .7; g.fillStyle = gr; g.fillRect(0, 0, W, H); g.restore();
  phoneGlow(g, 960, 1250, lit * .9, '255,60,60');
});
// финал
shot(82.1, { type: 'cut' }, (g, t) => {
  g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
  const k = t - 82.1, a = ss(.7, 1.6, k) * (1 - ss(5.3, 5.9, k));
  if (a <= 0) return;
  g.save(); g.textAlign = 'center'; g.textBaseline = 'middle';
  g.globalAlpha = a; g.fillStyle = '#f2f2f2';
  if (PORT) { g.font = '900 64px Rubik'; g.letterSpacing = '6px'; g.fillText('КОНЕЦ', 960, 440); g.font = '900 40px Rubik'; g.letterSpacing = '5px'; g.fillText('ПЕРВОГО СЕЗОНА', 960, 510); }
  else { g.font = '900 72px Rubik'; g.letterSpacing = '10px'; g.fillText('КОНЕЦ ПЕРВОГО СЕЗОНА', 960, 480); }
  g.globalAlpha = a * ss(1.8, 2.4, k); g.fillStyle = '#ff3b3b'; const lw = (PORT ? 260 : 520) * eout(ss(1.8, 2.6, k)); g.fillRect(960 - lw / 2, PORT ? 560 : 545, lw, 3);
  g.globalAlpha = a * ss(2.4, 3.0, k); g.font = '500 22px Rubik'; g.letterSpacing = '8px'; g.fillStyle = '#9a9a9a';
  g.fillText(PORT ? 'ПАУЗА · ИЛЬМИР ИЛЬДАРОВИЧ' : 'ПАУЗА  ·  ИЛЬМИР ИЛЬДАРОВИЧ', 960, PORT ? 605 : 600);
  g.letterSpacing = '0px'; g.restore();
});

// ---------- HUD ----------
function hud(g, t, sh) {
  if (sh.noHud) return;
  let v, a, red = true;
  if (t < 31.05) { v = timerInt(t); a = 1; }
  else if (t < 31.8) { v = 0; a = Math.floor(t * 4) % 2 ? .3 : 1; }
  else if (t > 66.6 && t < 80.1) { v = 0; a = (Math.floor(t * 2) % 2 ? .35 : 1) * ss(66.6, 67, t); }
  else return;
  g.save(); g.globalAlpha = a; g.font = '600 44px Rubik'; g.textAlign = 'right'; g.textBaseline = 'middle';
  g.fillStyle = red ? '#ff4040' : 'rgba(255,255,255,.9)'; g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 10;
  const hy = PORT ? 110 : 70;
  g.fillText('00:' + String(v).padStart(2, '0'), OW - 60, hy);
  g.fillStyle = '#ff3b3b'; g.beginPath(); g.arc(OW - 60 - 150, hy, 9, 0, TAU); g.fill();
  g.restore();
}

// ---------- субтитры (горизонтальный формат) ----------
// =====================================================================
//     КИНЕТИЧЕСКИЕ СУБТИТРЫ (вертикальный формат)
//  *слово* — крупно белым, !слово! — крупно красным, ~слово~ — глитч
//  зона: top / bot; слова появляются по слогам в такт речи
// =====================================================================
const KSUBS = [
  [0.0, 2.1, 'bot', 'Мой *двойник* начал !исчезать.!'],
  [2.5, 3.5, 'top', 'Сначала *руки.*'],
  [3.79, 4.6, 'bot', 'Потом *лицо.*'],
  [4.97, 8.75, 'top', 'Я попытался *схватить его,* но мои пальцы прошли !сквозь него.!'],
  [9.05, 11.45, 'bot', 'Времени оставалось всего *несколько секунд.*'],
  [11.66, 14.95, 'top', 'И тогда он успел показать мне *ещё одну записку.*'],
  [19.89, 21.1, 'top', 'Я посмотрел *на него.*'],
  [21.43, 22.2, 'top', '*На телефон.*'],
  [22.54, 24.2, 'bot', 'И наконец !всё понял.!'],
  [24.61, 25.5, 'bot', '*Это был я.*'],
  [25.77, 26.95, 'top', 'Только !из будущего.!'],
  [27.29, 30.65, 'bot', 'Он *застрял* там, где время остановилось !навсегда.!'],
  [31.03, 33.7, 'top', 'В следующую секунду всё вокруг *ожило.*'],
  [33.96, 35.2, 'bot', 'А он !исчез.!'],
  [35.66, 39.3, 'top', 'Я стоял посреди коридора, *не понимая,* что делать дальше.'],
  [39.59, 42.1, 'bot', 'На телефоне оставалась !одна попытка.!'],
  [42.47, 43.8, 'top', 'Я *удалил* приложение.'],
  [44.04, 45.15, 'top', '*Выключил* телефон.'],
  [45.47, 48.85, 'bot', 'И пообещал себе *никогда больше* не вспоминать об этом.'],
  [49.29, 50.25, 'bot', '*Прошла неделя.*'],
  [50.54, 52.2, 'bot', 'Всё вернулось *на свои места.*'],
  [52.56, 56.35, 'top', 'Пока однажды *ночью* мой телефон не !загорелся сам.!'],
  [56.71, 58.85, 'bot', 'На экране появилось *сообщение:*'],
  [61.86, 62.6, 'top', 'Я !замер.!'],
  [62.98, 64.05, 'bot', 'Я ведь *не нажимал…*'],
  [64.49, 67.1, 'bot', 'И тут *часы на стене* !остановились.!'],
  [67.4, 69.3, 'bot', 'За окном *зависла машина.*'],
  [69.56, 72.25, 'top', 'А из тёмного коридора послышались ~шаги.~'],
  [72.64, 74.4, 'bot', 'Я *медленно* повернулся.'],
  [74.73, 77.0, 'bot', 'В дверях стоял !мой двойник.!'],
  [77.37, 78.2, 'top', 'Только *теперь…*'],
  [78.71, 80.1, 'bot', 'Он !улыбался.!'],
];
// горизонтальные субтитры — тот же текст без разметки (+ записка и сообщение)
const SUBS = [...KSUBS.map(s => [s[0], s[1], s[3].replace(/[*!~]/g, '')]), [15.34, 19.5, '«Я нажал третий раз. И время для меня больше не пошло».'], [59.17, 61.6, '«ПОСЛЕДНЯЯ ОСТАНОВКА ИСПОЛЬЗОВАНА».']].sort((a, b) => a[0] - b[0]);

const syl = w => Math.max(1, (w.match(/[аеёиоуыэюяАЕЁИОУЫЭЮЯ]/g) || []).length);
const KLAY = [];
const ALIGNS = [['left', 'right', 'center', 'left'], ['right', 'left', 'right', 'center'], ['center', 'left', 'right', 'left'], ['left', 'center', 'right', 'right']];
function kLayout(g, idx) {
  if (KLAY[idx]) return KLAY[idx];
  const [s, e, zone, text] = KSUBS[idx];
  const toks = [];
  for (const m of text.matchAll(/\*([^*]+)\*|!([^!]+)!|~([^~]+)~|(\S+)/g)) {
    const type = m[1] ? 'big' : m[2] ? 'red' : m[3] ? 'glitch' : 'small';
    const str = m[1] || m[2] || m[3] || m[4];
    toks.push({ type, str: type === 'small' ? str : str.toUpperCase(), n: str.split(/\s+/).reduce((a, w) => a + syl(w), 0) });
  }
  // время появления каждого слова — пропорционально слогам
  const total = toks.reduce((a, t) => a + t.n, 0), dur = Math.max(.4, (e - s) * .88);
  let acc = 0; for (const t of toks) { t.t = s + acc / total * dur; acc += t.n; }
  const MAXW = OW - 150, SMALL = PORT ? 58 : 46;
  const font = (type, size) => type === 'small' ? `500 ${size}px Rubik` : type === 'glitch' ? `${size}px "Rubik Glitch"` : `900 ${size}px Rubik`;
  const lines = []; let cur = null;
  for (const t of toks) {
    if (t.type === 'small') {
      g.font = font('small', SMALL); t.w = g.measureText(t.str).width;
      const sp = g.measureText(' ').width;
      if (!cur || cur.type !== 'small' || cur.w + sp + t.w > MAXW) { cur = { type: 'small', size: SMALL, toks: [], w: 0 }; lines.push(cur); }
      t.x = cur.w ? cur.w + sp : 0; cur.w = t.x + t.w; cur.toks.push(t);
    } else {
      // крупное слово подбирается по ширине, но не больше 190px
      g.font = font(t.type, 100); const w100 = g.measureText(t.str).width;
      const size = Math.min(t.str.length <= 5 ? 250 : t.type === 'glitch' ? 210 : 185, Math.floor(100 * MAXW / w100));
      g.font = font(t.type, size); t.w = g.measureText(t.str).width; t.x = 0;
      cur = { type: t.type, size, toks: [t], w: t.w }; lines.push(cur); cur = null;
    }
  }
  const pat = ALIGNS[idx % ALIGNS.length];
  let y = 0;
  lines.forEach((l, i) => {
    l.align = pat[i % pat.length];
    l.x = l.align === 'left' ? 75 : l.align === 'right' ? OW - 75 - l.w : (OW - l.w) / 2;
    const lh = l.type === 'small' ? l.size * 1.3 : l.size * .98;
    l.y = y + lh * (l.type === 'small' ? .8 : .82); y += lh;
    l.rot = l.type === 'small' ? 0 : ((i + idx) % 2 ? 1 : -1) * .025;
  });
  const top = zone === 'top' ? 190 : OH - 190 - y;
  lines.forEach(l => l.y += top);
  return KLAY[idx] = { lines, zone, s, e, h: y, top };
}
function kinetic(g, t) {
  const idx = KSUBS.findIndex(s => t >= s[0] - .02 && t < s[1] + .25); if (idx < 0) return;
  const L = kLayout(g, idx);
  const out = ss(L.e, L.e + .25, t);
  g.save();
  // мягкая подложка для читаемости
  const gy0 = L.zone === 'top' ? 0 : OH, gy1 = L.zone === 'top' ? L.top + L.h + 160 : L.top - 160;
  const gr = g.createLinearGradient(0, gy0, 0, gy1); gr.addColorStop(0, `rgba(0,0,0,${.55 * (1 - out)})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, Math.min(gy0, gy1), OW, Math.abs(gy1 - gy0));
  g.globalAlpha = 1 - out;
  const lift = (L.zone === 'top' ? -1 : 1) * out * 30;
  g.textBaseline = 'alphabetic'; g.textAlign = 'left';
  for (const l of L.lines) {
    g.save(); g.translate(l.x + l.w / 2, l.y + lift); g.rotate(l.rot); g.translate(-l.w / 2, 0);
    // красный акцент-штрих у мелких строк, выровненных влево
    if (l.type === 'small' && l.align === 'left' && t >= l.toks[0].t) { g.fillStyle = '#ff3b3b'; g.fillRect(-26, -l.size * .72, 8, l.size * .82 * eout(clamp((t - l.toks[0].t) / .25))); }
    for (const tk of l.toks) {
      if (t < tk.t) continue;
      const k = clamp((t - tk.t) / (tk.type === 'small' ? .2 : .28));
      g.save();
      if (tk.type === 'small') {
        g.globalAlpha *= k; g.translate(tk.x, (1 - eout(k)) * 22);
        g.font = `500 ${l.size}px Rubik`; g.shadowColor = 'rgba(0,0,0,.8)'; g.shadowBlur = 14; g.fillStyle = 'rgba(255,255,255,.93)';
        g.fillText(tk.str, 0, 0);
      } else {
        const sc = lerp(1.45, 1, back(k)); g.globalAlpha *= clamp(k * 2.5);
        g.translate(tk.x + tk.w / 2, -l.size * .35); g.scale(sc, sc); g.translate(-tk.w / 2, l.size * .35);
        const glitch = tk.type === 'glitch';
        g.font = glitch ? `${l.size}px "Rubik Glitch"` : `900 ${l.size}px Rubik`;
        // объёмная тень
        g.fillStyle = 'rgba(0,0,0,.55)'; g.fillText(tk.str, l.size * .03, l.size * .06);
        if (glitch) {
          const f = Math.floor(t * 20), j = (k < 1 || rnd(f) > .7) ? 1 : 0;
          g.globalCompositeOperation = 'screen';
          g.fillStyle = '#00e5ff'; g.fillText(tk.str, -8 * j * rnd(f + 1), 0);
          g.fillStyle = '#ff2a2a'; g.fillText(tk.str, 8 * j * rnd(f + 2), 3);
          g.globalCompositeOperation = 'source-over';
          g.fillStyle = '#fff'; g.fillText(tk.str, 0, 0);
        } else {
          g.shadowColor = tk.type === 'red' ? 'rgba(255,40,40,.55)' : 'rgba(0,0,0,.6)'; g.shadowBlur = 26;
          g.fillStyle = tk.type === 'red' ? '#ff3b3b' : '#ffffff'; g.fillText(tk.str, 0, 0);
        }
      }
      g.restore();
    }
    g.restore();
  }
  g.restore();
}

function subtitles(g, t) {
  const s = SUBS.find(s => t >= s[0] && t < s[1] + .15); if (!s) return;
  const a = ss(s[0], s[0] + .15, t) * (1 - ss(s[1], s[1] + .15, t));
  g.save(); g.globalAlpha = a; g.font = '500 40px Rubik'; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  g.lineWidth = 7; g.strokeStyle = 'rgba(0,0,0,.75)'; g.lineJoin = 'round'; g.fillStyle = '#fff';
  g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 12;
  g.strokeText(s[2], OW / 2, OH - 58); g.shadowBlur = 0; g.fillText(s[2], OW / 2, OH - 58); g.restore();
}
// ---------- пост-эффекты ----------
const GRAIN = [0, 1, 2, 3].map(k => { const c = mk(480, 270), x = c.getContext('2d'), d = x.createImageData(480, 270); for (let i = 0; i < d.data.length; i += 4) { const v = rnd(i * .37 + k * 1000.3) * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; } x.putImageData(d, 0, 0); return c; });
function post(g, t) {
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.save(); g.globalCompositeOperation = 'overlay'; g.globalAlpha = .07; g.imageSmoothingEnabled = false;
  g.drawImage(GRAIN[Math.floor(t * 24) % 4], 0, 0, OW, OH); g.restore();
  if (!VIG) { VIG = mk(OW, OH); const x = VIG.getContext('2d'); const cx = OW / 2, cy = OH / 2, R = Math.hypot(cx, cy); const gr = x.createRadialGradient(cx, cy, R * .4, cx, cy, R); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.55)'); x.fillStyle = gr; x.fillRect(0, 0, OW, OH); }
  g.drawImage(VIG, 0, 0);
  // каше только в горизонтальном формате
  if (!PORT) { g.fillStyle = '#000'; const bar = 54; g.fillRect(0, 0, OW, bar); g.fillRect(0, OH - bar, OW, bar); }
  // вход из черноты
  if (t < .8) { g.fillStyle = `rgba(0,0,0,${1 - ss(0, .8, t)})`; g.fillRect(0, 0, OW, OH); }
}

// ---------- кадр ----------
function drawShot(i, g, t) { clear(g); g.save(); S[i].fn(g, t); g.restore(); }
function render(ctx, t) {
  t = clamp(t, 0, DUR - 1e-3);
  performanceT = t;
  let i = 0; while (i + 1 < S.length && t >= S[i + 1].s) i++;
  const sh = S[i], d = sh.tin.d || 0, k = d ? (t - sh.s) / d : 1;
  clear(ctx); ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (k < 1 && i > 0 && sh.tin.type === 'fade') {
    drawShot(i - 1, t1, t); drawShot(i, t2, t);
    ctx.drawImage(T1, 0, 0); ctx.globalAlpha = eio(k); ctx.drawImage(T2, 0, 0); ctx.globalAlpha = 1;
  } else if (k < 1 && i > 0 && sh.tin.type === 'dip') {
    const half = k < .5; drawShot(half ? i - 1 : i, t1, t); ctx.drawImage(T1, 0, 0);
    ctx.fillStyle = `rgba(0,0,0,${half ? k * 2 : 2 - k * 2})`; ctx.fillRect(0, 0, OW, OH);
  } else {
    drawShot(i, t1, t); ctx.drawImage(T1, 0, 0);
    if (k < 1 && sh.tin.type === 'flash') { ctx.fillStyle = `rgba(255,255,255,${1 - k})`; ctx.fillRect(0, 0, OW, OH); }
  }
  post(ctx, t);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (render.subs !== false) (PORT ? kinetic : subtitles)(ctx, t);
  hud(ctx, t, S[i]);
}
setMode('portrait');
window.PAUZA = { DUR, load, render, setMode, size: () => [OW, OH] };
})();
