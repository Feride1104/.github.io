const cv = document.getElementById('c'), g = cv.getContext('2d'), W = 1080, H = 1920, PI = Math.PI;
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x)), k = (t, a, b) => clamp((t - a) / (b - a));
const eo = x => 1 - Math.pow(1 - x, 3), eio = x => x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
const spring = x => x <= 0 ? 0 : 1 - Math.exp(-5 * x) * Math.cos(10 * x);
const pop = (t, t0, sp = 2.4) => t < t0 ? 0 : spring((t - t0) * sp);
const rnd = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const CUTS = [5.5, 10.0, 13.24, 21.03, 26.2, 28.2, 30.2, 32.39, 34.88];
const BIG = [5.5, 13.24, 21.03, 32.39];
const FREEZE = 39.59, CARD = 40.6;

// ---------- Pixar-style text ----------
function fancyText(txt, x, y, size, accent, alpha = 1) {
  g.save(); g.globalAlpha = alpha;
  g.font = `900 ${size}px N`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  // soft shadow
  g.shadowColor = 'rgba(30,10,0,.45)'; g.shadowBlur = size * .35; g.shadowOffsetY = size * .12;
  // 3D extrusion
  for (let d = Math.round(size * .09); d > 0; d -= 2) { g.lineWidth = size * .2; g.strokeStyle = accent ? '#7a2c06' : '#4a2410'; g.strokeText(txt, x, y + d); if (d === Math.round(size * .09)) g.shadowColor = 'transparent'; }
  g.shadowColor = 'transparent';
  g.lineWidth = size * .2; g.strokeStyle = accent ? '#8f3508' : '#5a2c12'; g.strokeText(txt, x, y);
  const gr = g.createLinearGradient(0, y - size * .5, 0, y + size * .45);
  if (accent) { gr.addColorStop(0, '#fff3a6'); gr.addColorStop(.45, '#ffc93a'); gr.addColorStop(1, '#ff8a1f'); }
  else { gr.addColorStop(0, '#ffffff'); gr.addColorStop(.6, '#fff8ea'); gr.addColorStop(1, '#ffe2a8'); }
  g.fillStyle = gr; g.fillText(txt, x, y);
  // glossy highlight
  g.save(); g.beginPath(); g.rect(x - 2000, y - size * .5, 4000, size * .32); g.clip();
  g.fillStyle = 'rgba(255,255,255,.35)'; g.fillText(txt, x, y); g.restore();
  g.restore();
}
function subtitles(t) {
  const c = SUBS.find(c => t >= c.t && t < c.end); if (!c) return;
  const words = c.words, base = 90, accSize = 118;
  const sz = w => w.a ? accSize : base;
  const meas = w => { g.font = `900 ${sz(w)}px N`; return g.measureText(w.w).width; };
  let lines = [words];
  const lineW = ln => ln.reduce((a, w) => a + meas(w), 0) + 38 * (ln.length - 1);
  if (lineW(words) > 960 && words.length > 1) { const m = Math.ceil(words.length / 2); lines = [words.slice(0, m), words.slice(m)]; }
  const out = t > c.end - .1 ? 1 - k(t, c.end - .1, c.end) : 1;
  const cy = 1490, lh = 118, y0 = cy - (lines.length - 1) * lh / 2;
  g.save(); g.translate(540, cy); const so = .85 + .15 * out; g.scale(so, so); g.translate(-540, -cy);
  lines.forEach((ln, li) => {
    let x = 540 - lineW(ln) / 2; const fit = Math.min(1, 1000 / lineW(ln));
    ln.forEach(w => {
      const ww = meas(w) * fit;
      if (t >= w.t) {
        const dt = t - w.t; let s, yo, rot;
        if (w.a) { const p = k(dt, 0, .18); s = lerp(1.45, 1, eo(p)) + Math.sin(dt * 18) * .06 * Math.exp(-dt * 5); yo = 0; rot = Math.sin(dt * 22) * .05 * Math.exp(-dt * 4); }
        else { const p = pop(t, w.t, 3.2); s = .3 + .7 * Math.min(p, 1) + Math.max(0, p - 1) * .2; yo = (1 - Math.min(p, 1)) * 50; rot = -.04 * Math.exp(-dt * 6) * Math.cos(dt * 14); }
        g.save(); g.translate(x + ww / 2, y0 + li * lh + yo); g.rotate(rot); g.scale(s * fit, s * fit);
        fancyText(w.w, 0, 0, sz(w), w.a, clamp(dt / .05) * out); g.restore();
      }
      x += ww + 38 * fit;
    });
  });
  g.restore();
}
const lerp = (a, b, t) => a + (b - a) * t;

// ---------- effects ----------
function vignette(a) { const v = g.createRadialGradient(540, 900, 380, 540, 960, 1250); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, `rgba(10,5,15,${a})`); g.fillStyle = v; g.fillRect(0, 0, W, H); }
function sparkle(x, y, r, a, rot = 0) {
  g.save(); g.translate(x, y); g.rotate(rot); g.globalAlpha = a;
  const gl = g.createRadialGradient(0, 0, 0, 0, 0, r * 1.2); gl.addColorStop(0, 'rgba(255,255,240,.9)'); gl.addColorStop(1, 'rgba(255,240,200,0)'); g.fillStyle = gl; g.beginPath(); g.arc(0, 0, r * 1.2, 0, 7); g.fill();
  g.fillStyle = '#fffef5'; g.beginPath();
  for (let i = 0; i < 8; i++) { const a2 = i / 8 * PI * 2, rr = i % 2 ? r * .18 : r; g.lineTo(Math.cos(a2) * rr, Math.sin(a2) * rr); }
  g.closePath(); g.fill(); g.restore();
}
function twinkle(t, t0, x, y, r) { if (t < t0 || t > t0 + .9) return; const p = k(t, t0, t0 + .9); sparkle(x, y, r * Math.sin(p * PI), 1, p * 1.5); sparkle(x + r * .9, y - r * .6, r * .45 * Math.sin(clamp(p * 1.4 - .2) * PI), 1, -p); }
function transition(t) {
  for (const c of CUTS) {
    const d = t - c;
    if (d > -0.12 && d < 0.28) {
      const big = BIG.includes(c);
      // light-leak sweep
      const p = k(d, -0.12, 0.28), x = lerp(-600, 1700, eio(p));
      const gr = g.createLinearGradient(x - 500, 0, x + 500, 0);
      gr.addColorStop(0, 'rgba(255,170,80,0)'); gr.addColorStop(.5, `rgba(255,220,160,${big ? .55 : .3})`); gr.addColorStop(1, 'rgba(255,170,80,0)');
      g.save(); g.globalCompositeOperation = 'screen'; g.fillStyle = gr; g.fillRect(0, 0, W, H); g.restore();
      if (d > 0 && d < .1) { g.fillStyle = `rgba(255,250,240,${(big ? .5 : .25) * (1 - d / .1)})`; g.fillRect(0, 0, W, H); }
    }
  }
}
function candy(x, y, s, rot, hue) {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
  g.fillStyle = `hsl(${hue},85%,55%)`;
  g.beginPath(); g.moveTo(-34, -12); g.lineTo(-20, 0); g.lineTo(-34, 12); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(34, -12); g.lineTo(20, 0); g.lineTo(34, 12); g.closePath(); g.fill();
  g.beginPath(); g.ellipse(0, 0, 22, 15, 0, 0, 7); g.fill();
  g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.ellipse(-6, -6, 9, 4, -.3, 0, 7); g.fill();
  g.restore();
}
function candyRain(t, t0, t1) {
  if (t < t0 || t > t1 + 2) return;
  for (let i = 0; i < 26; i++) {
    const st = t0 + rnd(i) * (t1 - t0), dt = t - st; if (dt < 0) continue;
    const y = -60 + dt * (500 + rnd(i + 9) * 400) + 160 * dt * dt, x = 60 + rnd(i + 3) * 960 + Math.sin(dt * 3 + i) * 30;
    if (y > H + 60) continue;
    g.globalAlpha = clamp((t1 + 1.5 - t) / .5); candy(x, y, .9 + rnd(i + 5) * .8, dt * (2 + rnd(i) * 4), rnd(i + 7) * 360); g.globalAlpha = 1;
  }
}
function comicBurst(t, t0, x, y, txt, col = '#ff4d3a') {
  if (t < t0 || t > t0 + 1.4) return;
  const p = pop(t, t0, 3), out = 1 - k(t, t0 + 1.1, t0 + 1.4);
  g.save(); g.translate(x, y); g.rotate(-.12); g.scale(p, p); g.globalAlpha = out;
  g.beginPath(); for (let i = 0; i < 24; i++) { const a = i / 24 * PI * 2, r = i % 2 ? 105 : 175; g.lineTo(Math.cos(a) * r * 1.25, Math.sin(a) * r); }
  g.closePath(); g.fillStyle = '#ffe14d'; g.fill(); g.lineWidth = 10; g.strokeStyle = '#4a1d0a'; g.stroke();
  fancyText(txt, 0, 4, 78, true, 1); g.restore();
  // radial speed lines
  g.save(); g.globalAlpha = .5 * out; g.strokeStyle = '#ffffff'; g.lineCap = 'round';
  for (let i = 0; i < 40; i++) { const a = i / 40 * PI * 2 + rnd(i), r0 = 620 + rnd(i + 2) * 200; g.lineWidth = 3 + rnd(i) * 6; g.beginPath(); g.moveTo(540 + Math.cos(a) * r0, 960 + Math.sin(a) * r0 * 1.4); g.lineTo(540 + Math.cos(a) * 1500, 960 + Math.sin(a) * 2100); g.stroke(); }
  g.restore();
}
function speedLines(t, t0, t1) {
  if (t < t0 || t > t1) return; const a = Math.sin(k(t, t0, t1) * PI) * .5;
  g.save(); g.globalAlpha = a; g.strokeStyle = '#ffffff'; g.lineCap = 'round';
  for (let i = 0; i < 36; i++) { const ang = i / 36 * PI * 2 + Math.floor(t * 12) * .37, r0 = 560 + rnd(i + Math.floor(t * 12)) * 260; g.lineWidth = 2 + rnd(i) * 5; g.beginPath(); g.moveTo(540 + Math.cos(ang) * r0, 960 + Math.sin(ang) * r0 * 1.5); g.lineTo(540 + Math.cos(ang) * 1400, 960 + Math.sin(ang) * 2000); g.stroke(); }
  g.restore();
}
function countdown(t) {
  if (t < 26.25 || t > 28.2) return;
  const n = 3 - Math.floor((t - 26.25) / .65); if (n < 1) return;
  const t0 = 26.25 + (3 - n) * .65, p = pop(t, t0, 3.5);
  g.save(); g.translate(880, 330); g.scale(p, p);
  g.beginPath(); g.arc(0, 0, 95, 0, 7); g.fillStyle = 'rgba(255,60,50,.92)'; g.fill(); g.lineWidth = 10; g.strokeStyle = '#fff'; g.stroke();
  g.beginPath(); g.arc(0, 0, 80, -PI / 2, -PI / 2 + PI * 2 * (1 - k(t, t0, t0 + .65))); g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 8; g.stroke();
  fancyText(String(n), 0, 6, 110, false, 1); g.restore();
}
function godRays(t, t0, x, y) {
  if (t < t0) return; const a = eo(k(t, t0, t0 + .8)) * (t < FREEZE ? 1 : 1);
  g.save(); g.globalCompositeOperation = 'screen'; g.translate(x, y);
  for (let i = 0; i < 14; i++) { const ang = i / 14 * PI * 2 + t * .25; g.rotate(PI * 2 / 14); g.fillStyle = `rgba(255,200,90,${.12 * a})`; g.beginPath(); g.moveTo(0, 0); g.lineTo(1600, -90); g.lineTo(1600, 90); g.closePath(); g.fill(); }
  const gl = g.createRadialGradient(0, 0, 0, 0, 0, 500); gl.addColorStop(0, `rgba(255,220,140,${.45 * a})`); gl.addColorStop(1, 'rgba(255,200,100,0)'); g.fillStyle = gl; g.beginPath(); g.arc(0, 0, 500, 0, 7); g.fill();
  g.restore();
}
function shockLines(t, t0, x, y) {
  if (t < t0 || t > CARD) return; const p = eo(k(t, t0, t0 + .25));
  g.save(); g.translate(x, y); g.strokeStyle = '#2a1206'; g.lineCap = 'round'; g.lineWidth = 12;
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { const a = -PI / 2 + s * (.55 + i * .32), r0 = 250, r1 = 250 + 90 * p + Math.sin(t * 30 + i) * 6; g.beginPath(); g.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); g.lineTo(Math.cos(a) * r1, Math.sin(a) * r1); g.stroke(); }
  g.restore();
}
function questionPop(t) {
  if (t < FREEZE || t > CARD) return; const p = pop(t, FREEZE + .05, 3);
  g.save(); g.translate(820, 420); g.rotate(.15 + Math.sin(t * 12) * .04); g.scale(p, p); fancyText('?!', 0, 0, 260, true, 1); g.restore();
}
function tooth(x, y, s) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.beginPath(); g.moveTo(-70, -60); g.bezierCurveTo(-90, -110, -30, -120, 0, -95); g.bezierCurveTo(30, -120, 90, -110, 70, -60);
  g.bezierCurveTo(60, 0, 55, 60, 38, 105); g.bezierCurveTo(28, 125, 12, 110, 8, 70); g.bezierCurveTo(4, 45, -4, 45, -8, 70); g.bezierCurveTo(-12, 110, -28, 125, -38, 105); g.bezierCurveTo(-55, 60, -60, 0, -70, -60); g.closePath();
  const gr = g.createLinearGradient(-70, -110, 70, 120); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#dfe6f2');
  g.shadowColor = 'rgba(255,200,120,.6)'; g.shadowBlur = 40; g.fillStyle = gr; g.fill(); g.shadowColor = 'transparent';
  g.lineWidth = 7; g.strokeStyle = '#5a2c12'; g.stroke();
  g.fillStyle = '#2a1206'; for (const ex of [-25, 25]) { g.beginPath(); g.ellipse(ex, -35, 9, 13, 0, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(ex + 3, -40, 3.5, 0, 7); g.fill(); g.fillStyle = '#2a1206'; }
  g.beginPath(); g.arc(0, -10, 18, .2, PI - .2); g.lineWidth = 6; g.stroke();
  g.fillStyle = 'rgba(255,140,140,.5)'; for (const ex of [-45, 45]) { g.beginPath(); g.arc(ex, -15, 11, 0, 7); g.fill(); }
  g.restore();
}
function card(t) {
  const a = k(t, CARD - .15, CARD + .25); if (a <= 0) return;
  g.save(); g.globalAlpha = a;
  const bg = g.createRadialGradient(540, 760, 60, 540, 960, 1300); bg.addColorStop(0, '#3a2418'); bg.addColorStop(.55, '#1b110c'); bg.addColorStop(1, '#0a0605'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 70; i++) { const r = rnd(i), r2 = rnd(i + 50); const y = (H + 40 - ((t - CARD) * (25 + r * 55) + r2 * H) % (H + 80)); g.fillStyle = `rgba(255,${190 + r2 * 50},120,${.1 + r * .35})`; g.beginPath(); g.arc(r * W + Math.sin(t + i) * 15, y, 1.5 + r2 * 4, 0, 7); g.fill(); }
  const tp = pop(t, CARD + .1, 2.2); tooth(540, 470 + Math.sin(t * 2.5) * 10, Math.max(tp, .001) * 1.25);
  const p1 = pop(t, CARD + .35, 2.4);
  g.save(); g.translate(540, 740); g.scale(Math.max(p1, .001), Math.max(p1, .001)); fancyText('Семья', 0, -70, 120, false, 1); fancyText('стоматолога', 0, 60, 120, true, 1); g.restore();
  const p2 = eo(k(t, CARD + .8, CARD + 1.2));
  g.globalAlpha = a * p2; g.font = '900 54px N'; g.textAlign = 'center'; g.fillStyle = '#ffdca0'; g.fillText('Серия 1 · «Правило»', 540, 935 + (1 - p2) * 20);
  const tt = 'Продолжение следует…', n = Math.floor(clamp((t - CARD - 1.2) / 1.2) * tt.length);
  g.globalAlpha = a; g.font = 'italic 900 48px N'; g.fillStyle = '#fff6ea'; g.fillText(tt.slice(0, n), 540, 1040);
  // subscribe button
  if (t > 42.2) {
    const bp = pop(t, 42.2, 2.6), tap = t > 42.9 && t < 43.2 ? .92 : 1;
    g.save(); g.translate(540, 1230); g.scale(bp * tap, bp * tap);
    g.shadowColor = 'rgba(255,90,60,.6)'; g.shadowBlur = 40; g.beginPath(); g.roundRect(-250, -62, 500, 124, 62); g.fillStyle = t > 43.0 ? '#4a3a33' : '#ff4d3a'; g.fill(); g.shadowColor = 'transparent';
    g.font = '900 54px N'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.fillText(t > 43.0 ? 'Вы подписаны ✓' : 'Подписаться', 0, 4);
    g.restore();
    if (t > 42.6 && t < 43.4) { // finger tap
      const fp = k(t, 42.6, 42.95); g.save(); g.translate(lerp(760, 600, eo(fp)), lerp(1420, 1270, eo(fp))); g.font = '110px serif'; g.fillText('👆', 0, 0); g.restore();
    }
  }
  g.restore();
}
function render(t) {
  g.clearRect(0, 0, W, H);
  if (t < CARD) {
    vignette(t < 5.5 ? .75 + Math.sin(t * 3) * .05 : .38);
    twinkle(t, 6.8, 370, 612, 70);           // tooth shine
    candyRain(t, 21.1, 23.3);                  // feast
    comicBurst(t, 24.45, 540, 820, 'ЩЁЛК!');    // key in lock
    speedLines(t, 26.2, 28.2); countdown(t);   // panic
    twinkle(t, 31.0, 380, 395, 90);            // dental mirror
    godRays(t, 36.0, 1000, 720);               // golden light from cabinet
    shockLines(t, 37.35, 470, 560);
    if (t >= FREEZE) { g.fillStyle = `rgba(20,8,0,${.35 * k(t, FREEZE, FREEZE + .2)})`; g.fillRect(0, 0, W, H); }
    questionPop(t);
    transition(t);
  }
  card(t);
  subtitles(t);
}
window.render = render;
window.ready = (async () => { await document.fonts.load('900 50px N', 'АБВ abc 0123'); render(0); return true; })();
