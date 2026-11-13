const cv = document.getElementById('c'), g = cv.getContext('2d'), W = 1080, H = 1920, PI = Math.PI;
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x)), k = (t, a, b) => clamp((t - a) / (b - a));
const eo = x => 1 - Math.pow(1 - x, 3);
const spring = x => x <= 0 ? 0 : 1 - Math.exp(-5 * x) * Math.cos(10 * x);
const pop = (t, t0, sp = 2.2) => t < t0 ? 0 : spring((t - t0) * sp);
const END = 59.46;
function lineLayout(words, size) {
  g.font = `900 ${size}px U`; g.letterSpacing = `${-size * .03}px`;
  const ws = words.map(w => g.measureText(w.w).width), sp = size * .32;
  return { ws, sp, total: ws.reduce((a, b) => a + b, 0) + sp * (words.length - 1) };
}
function subtitles(t, cy) {
  const c = SUBS.find(c => t >= c.t && t < c.end); if (!c) return;
  if (c.words.length === 1 && c.words[0].w.startsWith('PARTNERZ')) return; // logo covers it
  const words = c.words, acc = words.some(w => w.a);
  // try one line, else split into two lines
  let size = Math.min(acc ? 175 : 155, 1000 / lineLayout(words, 100).total * 100);
  let lines = [words];
  if (size < 112 && words.length > 1) {
    const m = Math.ceil(words.length / 2); lines = [words.slice(0, m), words.slice(m)];
    size = Math.min(acc ? 175 : 150, ...lines.map(l => 1000 / lineLayout(l, 100).total * 100));
  }
  const out = t > c.end - .06 ? 1 - k(t, c.end - .06, c.end) : 1;
  const life = k(t, c.t, c.end), breathe = 1 + .04 * eo(life);
  const lh = size * 1.12, y0 = cy - (lines.length - 1) * lh / 2;
  g.save(); g.translate(540, cy); g.scale(breathe, breathe); g.translate(-540, -cy);
  lines.forEach((ln, li) => {
    const L = lineLayout(ln, size); let x = 540 - L.total / 2;
    ln.forEach((w, i) => {
      const ww = L.ws[i];
      if (t >= w.t) {
        const p = pop(t, w.t, 3.0), a = clamp((t - w.t) / .05) * out;
        const s = .2 + .8 * Math.min(p, 1) + Math.max(0, p - 1) * .5;
        g.save(); g.translate(x + ww / 2, y0 + li * lh + (1 - Math.min(p, 1)) * 60);
        g.rotate((w.a ? -.06 : -.025) * Math.exp(-(t - w.t) * 6) * Math.cos((t - w.t) * 14)); g.scale(s, s);
        g.globalAlpha = a; g.font = `900 ${size}px U`; g.letterSpacing = `${-size * .03}px`; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.lineJoin = 'round'; g.lineWidth = size * .22; g.strokeStyle = '#120c14';
        g.shadowColor = 'rgba(0,0,0,.55)'; g.shadowBlur = size * .35; g.shadowOffsetY = size * .08; g.strokeText(w.w, 0, 0); g.shadowColor = 'transparent';
        g.fillStyle = w.a ? '#ffd23a' : '#ffffff'; g.fillText(w.w, 0, 0);
        g.restore();
      }
      x += ww + L.sp;
    });
  });
  g.restore(); g.letterSpacing = '0px';
}
function endCard(t) {
  const a = k(t, END - .05, END + .3); if (a <= 0) return;
  g.save(); g.globalAlpha = a;
  const bg = g.createRadialGradient(540, 820, 50, 540, 960, 1300); bg.addColorStop(0, '#2a1d1f'); bg.addColorStop(.55, '#140d10'); bg.addColorStop(1, '#070506');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  // warm floating particles
  for (let i = 0; i < 60; i++) { const r = Math.sin(i * 91.7) * .5 + .5, r2 = Math.sin(i * 37.3) * .5 + .5; const y = (H + 40 - ((t - END) * (30 + r * 60) + r2 * H) % (H + 80)); const x = r * W + Math.sin(t * .8 + i) * 20; g.fillStyle = `rgba(255,${190 + r2 * 50},120,${.12 + r * .35})`; g.beginPath(); g.arc(x, y, 1.5 + r2 * 3.5, 0, 7); g.fill(); }
  // glow
  const gl = g.createRadialGradient(540, 820, 0, 540, 820, 520); gl.addColorStop(0, `rgba(255,170,90,${.22 * eo(k(t, END + .2, END + 1))})`); gl.addColorStop(1, 'rgba(255,170,90,0)'); g.fillStyle = gl; g.fillRect(0, 0, W, H);
  // logo
  const p = pop(t, END + .1, 2.2);
  if (p > 0) {
    g.save(); g.translate(540, 820); const s = Math.max(p, .001); g.scale(s, s);
    g.font = '900 170px U'; g.letterSpacing = '-7px'; g.textBaseline = 'middle'; g.textAlign = 'left';
    const wP = g.measureText('Partner').width, wA = g.measureText('PartnerZ').width;
    g.shadowColor = 'rgba(255,160,80,.45)'; g.shadowBlur = 50; g.fillStyle = '#fff6ea'; g.fillText('Partner', -wA / 2, 0);
    g.shadowColor = 'rgba(230,40,70,.7)'; g.fillStyle = '#e8304f'; g.fillText('Z', -wA / 2 + wP, 0);
    g.shadowColor = 'transparent'; g.letterSpacing = '0px';
    // underline sweep
    const u = eo(k(t, END + .5, END + 1.2)); g.fillStyle = '#e8304f'; g.fillRect(-wA / 2, 105, wA * u, 10);
    g.restore();
  }
  g.restore();
}
function render(t) {
  g.clearRect(0, 0, W, H);
  endCard(t);
  subtitles(t, t >= END ? 1240 : 1330);
}
window.render = render;
window.ready = (async () => { await document.fonts.load('900 50px U', 'АБВ abc 0123'); render(0); return true; })();
