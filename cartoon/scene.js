// ===================== PartnerZ cartoon renderer =====================
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
const W = 1080, H = 1920, PI = Math.PI;

// ---------- math ----------
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const k = (t, a, b) => clamp((t - a) / (b - a));
const eio = x => x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
const eo = x => 1 - Math.pow(1 - x, 3);
const ei = x => x * x * x;
const spring = x => x <= 0 ? 0 : 1 - Math.exp(-5 * x) * Math.cos(10 * x);
const pop = (t, t0, sp = 2.2) => t < t0 ? 0 : spring((t - t0) * sp);
function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hash(s) { let h = 7; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return h; }

// ---------- colour ----------
function hex2rgb(h) { h = h.replace('#', ''); return [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16)); }
function mix(h, a) { const c = hex2rgb(h), t = a > 0 ? 255 : 0, m = Math.abs(a); return `rgb(${c.map(v => Math.round(v + (t - v) * m)).join(',')})`; }
function rgba(h, a) { return `rgba(${hex2rgb(h).join(',')},${a})`; }

const COL = {
  wood: '#e6c18f', woodL: '#efd3a9', woodD: '#c99a63', woodDark: '#9c6b3e', walnut: '#7a4f2c',
  wall: '#f7f1e5', ink: '#171212', red: '#c8173f', pink: '#e2678f', cream: '#fbf6ec', skin: '#e9c79c',
};

// ---------- textures ----------
const cache = {};
function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function noise(g, w, h, amt, R) { const id = g.getImageData(0, 0, w, h); for (let i = 0; i < id.data.length; i += 4) { const n = (R() - .5) * amt; id.data[i] += n; id.data[i + 1] += n; id.data[i + 2] += n; } g.putImageData(id, 0, 0); }
function woodTex(base) {
  const key = 'w' + base; if (cache[key]) return cache[key];
  const w = 512, h = 512, c = mk(w, h), g = c.getContext('2d'), R = rng(hash(base));
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 170; i++) {
    const y0 = R() * h, amp = 1.5 + R() * 7, n = 1 + Math.floor(R() * 3), ph = R() * 6;
    g.strokeStyle = R() < .62 ? `rgba(110,62,25,${.03 + R() * .09})` : `rgba(255,248,235,${.05 + R() * .1})`;
    g.lineWidth = .5 + R() * 2.6; g.beginPath();
    for (let x = 0; x <= w; x += 8) { const y = y0 + Math.sin(x / w * 2 * PI * n + ph) * amp + Math.sin(x / w * 2 * PI * (n + 2) + ph * 2) * amp * .3; x ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.stroke();
  }
  noise(g, w, h, 12, R);
  return cache[key] = ctx.createPattern(c, 'repeat');
}
function knitTex(base, sz = 24) {
  const key = 'k' + base + sz; if (cache[key]) return cache[key];
  const w = sz, h = Math.round(sz * .82), c = mk(w * 4, h * 4), g = c.getContext('2d'), R = rng(hash(key));
  g.fillStyle = mix(base, -.32); g.fillRect(0, 0, c.width, c.height);
  for (let cx = 0; cx < 5; cx++) for (let cy = -1; cy < 5; cy++) for (const s of [-1, 1]) {
    g.save(); g.translate(cx * w + w / 2 + s * w * .2, cy * h + h * .5); g.rotate(s * -.58);
    const gr = g.createLinearGradient(0, -h * .6, 0, h * .6);
    gr.addColorStop(0, mix(base, .22)); gr.addColorStop(.5, base); gr.addColorStop(1, mix(base, -.14));
    g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, w * .2, h * .64, 0, 0, 7); g.fill(); g.restore();
  }
  noise(g, c.width, c.height, 10, R);
  return cache[key] = ctx.createPattern(c, 'repeat');
}
function pegTex(base) {
  const key = 'p' + base; if (cache[key]) return cache[key];
  const s = 54, c = mk(s * 4, s * 4), g = c.getContext('2d'), R = rng(5);
  g.fillStyle = base; g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = mix(base, -.2); g.lineWidth = 2.2; g.lineCap = 'round';
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { const x = i * s + s / 2, y = j * s + s / 2; g.beginPath(); g.moveTo(x - 4, y - 4); g.lineTo(x + 4, y + 4); g.moveTo(x + 4, y - 4); g.lineTo(x - 4, y + 4); g.stroke(); }
  noise(g, c.width, c.height, 6, R);
  return cache[key] = ctx.createPattern(c, 'repeat');
}
function patAt(p, x = 0, y = 0, rot = 0, sc = 1) { p.setTransform(new DOMMatrix().translate(x, y).rotate(rot * 180 / PI).scale(sc)); return p; }

// ---------- primitive drawing ----------
function rr(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
function shadeOver(x, y, w, h, dir = 'v', a = 1) {
  const g = dir === 'v' ? ctx.createLinearGradient(x, y, x, y + h) : ctx.createLinearGradient(x, y, x + w, y);
  g.addColorStop(0, `rgba(255,252,245,${.28 * a})`); g.addColorStop(.45, 'rgba(255,255,255,0)'); g.addColorStop(1, `rgba(70,35,10,${.25 * a})`);
  ctx.fillStyle = g; ctx.fill();
}
function sphere(x, y, r, base, tex = true) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, 7);
  ctx.fillStyle = tex ? patAt(woodTex(base), x, y, .3, .6) : base; ctx.fill();
  const g = ctx.createRadialGradient(x - r * .38, y - r * .42, r * .05, x, y, r * 1.02);
  g.addColorStop(0, 'rgba(255,250,240,.6)'); g.addColorStop(.42, 'rgba(255,255,255,0)'); g.addColorStop(.82, 'rgba(70,35,10,.14)'); g.addColorStop(1, 'rgba(60,28,8,.38)');
  ctx.fillStyle = g; ctx.fill();
}
function limb(x1, y1, x2, y2, r, fill, knit) {
  const a = Math.atan2(y2 - y1, x2 - x1) - PI / 2, L = Math.hypot(x2 - x1, y2 - y1);
  ctx.save(); ctx.translate(x1, y1); ctx.rotate(a);
  rr(-r, -r * .2, 2 * r, L + r * .4, r * .55);
  ctx.fillStyle = knit ? patAt(knitTex(fill, 18), 0, 0) : patAt(woodTex(fill), 0, 0, PI / 2, .5); ctx.fill();
  const g = ctx.createLinearGradient(-r, 0, r, 0);
  g.addColorStop(0, 'rgba(60,30,10,.2)'); g.addColorStop(.3, 'rgba(255,250,240,.32)'); g.addColorStop(.55, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(60,28,8,.36)');
  ctx.fillStyle = g; ctx.fill();
  ctx.restore();
}
function softShadow(x, y, rx, ry, a = .16) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, rx);
  g.addColorStop(0, `rgba(60,40,20,${a})`); g.addColorStop(1, 'rgba(60,40,20,0)');
  ctx.save(); ctx.translate(x, y); ctx.scale(1, ry / rx); ctx.translate(-x, -y);
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rx, 0, 7); ctx.fill(); ctx.restore();
}
function woodRect(x, y, w, h, r, base = COL.wood, rot = 0, sc = .8) {
  rr(x, y, w, h, r); ctx.fillStyle = patAt(woodTex(base), x, y, rot, sc); ctx.fill();
}

// ---------- characters ----------
const CH = {
  dad: { sweater: '#6c8db2', pants: '#d3cabb', shoe: '#5d6064', hair: '#6a452e', s: 1, head: 1, kind: 'dad' },
  mom: { sweater: '#9cae8c', pants: '#6f8fb0', shoe: '#6f8fb0', hair: '#a9693e', s: .93, head: 1, kind: 'mom' },
  kid: { sweater: '#eab04a', pants: '#e4caa4', shoe: '#d7b487', hair: '#bd7a3e', s: .56, head: 1.32, kind: 'kid' },
};
const G = { headR: 72, neckY: -262, torsoTop: -252, torsoBot: 22, torsoW: 198, shX: 104, shY: -218, ua: 86, fa: 78, armR: 21, hipX: 50, hipY: 24, th: 92, sh: 92, legR: 27 };
const DEF = { la: -.14, le: .05, ra: .14, re: -.05, lh: -.03, lk: 0, rh: .03, rk: 0, tilt: 0, head: 0, bob: 0, eyes: 'open', mouth: 'smile', brows: 0, look: 0, blush: .5 };
const dirv = a => [Math.sin(a), Math.cos(a)];

function ik(S, T, L1, L2, bendSign) {
  const dx = T[0] - S[0], dy = T[1] - S[1];
  const d = clamp(Math.hypot(dx, dy), Math.abs(L1 - L2) + 1, L1 + L2 - .5);
  const a0 = Math.atan2(dx, dy);
  const A = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
  const B = Math.acos(clamp((L2 * L2 + d * d - L1 * L1) / (2 * L2 * d), -1, 1));
  const a1 = a0 + bendSign * A, a2 = a0 - bendSign * B;
  return [a1, a2 - a1];
}

// draws a figure with feet on ground (x,y). Returns world joint info.
function figure(who, x, y, p = {}, extraScale = 1) {
  const c = CH[who]; p = Object.assign({}, DEF, p);
  const s = c.s * extraScale;
  const legLen = G.hipY + G.th + G.sh + 52;
  ctx.save();
  softShadow(x, y + 4, 120 * s, 22 * s, .2);
  ctx.translate(x, y - (legLen - p.bob) * s); ctx.scale(s, s);
  // legs (local hip coords)
  const leg = (hx, a1, a2) => {
    const [d1x, d1y] = dirv(a1), [d2x, d2y] = dirv(a1 + a2);
    const kx = hx + d1x * G.th, ky = G.hipY + d1y * G.th, fx = kx + d2x * G.sh, fy = ky + d2y * G.sh;
    limb(hx, G.hipY, kx, ky, G.legR, c.pants, false);
    sphere(kx, ky, 17, COL.wood);
    limb(kx, ky, fx, fy, G.legR, c.pants, false);
    // shoe dome
    ctx.save(); ctx.translate(fx, fy + 12); ctx.rotate(-(a1 + a2) * .6);
    ctx.beginPath(); ctx.ellipse(0, 6, 40, 32, 0, PI, 0); ctx.lineTo(40, 14); ctx.quadraticCurveTo(0, 22, -40, 14); ctx.closePath();
    ctx.fillStyle = patAt(woodTex(c.shoe), 0, 0, 0, .5); ctx.fill(); shadeOver(-40, -26, 80, 48, 'v', 1.2);
    ctx.restore();
  };
  ctx.save(); ctx.rotate(p.tilt * .3);
  sphere(-G.hipX, G.hipY, 19, COL.wood); sphere(G.hipX, G.hipY, 19, COL.wood);
  leg(-G.hipX, p.lh, p.lk); leg(G.hipX, p.rh, p.rk);
  ctx.restore();
  // torso
  ctx.rotate(p.tilt);
  const tw = G.torsoW, tt = G.torsoTop, tb = G.torsoBot;
  ctx.beginPath();
  ctx.moveTo(-tw * .42, tt); ctx.quadraticCurveTo(-tw * .55, tt + 8, -tw * .52, tt + 70);
  ctx.quadraticCurveTo(-tw * .58, tb - 40, -tw * .5, tb - 6); ctx.quadraticCurveTo(0, tb + 14, tw * .5, tb - 6);
  ctx.quadraticCurveTo(tw * .58, tb - 40, tw * .52, tt + 70); ctx.quadraticCurveTo(tw * .55, tt + 8, tw * .42, tt); ctx.closePath();
  ctx.fillStyle = patAt(knitTex(c.sweater, 22), 0, 0); ctx.fill();
  let g = ctx.createLinearGradient(-tw / 2, 0, tw / 2, 0);
  g.addColorStop(0, 'rgba(40,30,20,.28)'); g.addColorStop(.28, 'rgba(255,255,255,.14)'); g.addColorStop(.55, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(30,20,10,.32)');
  ctx.fillStyle = g; ctx.fill();
  // hem rib
  ctx.save(); ctx.clip(); ctx.fillStyle = mix(c.sweater, -.12); ctx.fillRect(-tw, tb - 32, tw * 2, 60);
  ctx.strokeStyle = mix(c.sweater, -.3); ctx.lineWidth = 3; for (let i = -tw / 2; i < tw / 2; i += 9) { ctx.beginPath(); ctx.moveTo(i, tb - 30); ctx.lineTo(i, tb + 12); ctx.stroke(); }
  ctx.restore();
  // collar rib
  ctx.beginPath(); ctx.ellipse(0, tt + 2, 54, 16, 0, 0, 7); ctx.fillStyle = mix(c.sweater, -.1); ctx.fill();
  ctx.save(); ctx.clip(); ctx.strokeStyle = mix(c.sweater, -.32); ctx.lineWidth = 3; for (let i = -54; i < 54; i += 8) { ctx.beginPath(); ctx.moveTo(i, tt - 16); ctx.lineTo(i, tt + 18); ctx.stroke(); } ctx.restore();
  // neck + head
  ctx.save(); ctx.translate(0, G.neckY); ctx.rotate(p.head);
  sphere(0, 0, 16, COL.wood);
  head(c, 0, -G.headR * c.head - 6, G.headR * c.head, p);
  ctx.restore();
  // arms
  const arm = (sx, a1, a2, tgt, bend) => {
    if (tgt) { const inv = (P) => { const d0 = CAMM.transformPoint(new DOMPoint(P[0], P[1])); const m = ctx.getTransform().inverse(); const q = m.transformPoint(d0); return [q.x, q.y]; }; [a1, a2] = ik([sx, G.shY], inv(tgt), G.ua, G.fa, bend); }
    const [d1x, d1y] = dirv(a1), [d2x, d2y] = dirv(a1 + a2);
    const ex = sx + d1x * G.ua, ey = G.shY + d1y * G.ua, hx = ex + d2x * G.fa, hy = ey + d2y * G.fa;
    sphere(sx, G.shY, 23, COL.wood);
    limb(sx, G.shY, ex, ey, G.armR, c.sweater, true);
    sphere(ex, ey, 16, COL.wood);
    limb(ex, ey, hx, hy, G.armR - 1, c.sweater, true);
    sphere(hx + d2x * 10, hy + d2y * 10, 23, COL.wood);
    return [hx, hy];
  };
  const lh = arm(-G.shX, p.la, p.le, p.lt, p.lb || 1);
  const rhp = arm(G.shX, p.ra, p.re, p.rt, p.rb || -1);
  const m = ctx.getTransform();
  const toW = P => { const q = m.transformPoint(new DOMPoint(P[0], P[1])); return [q.x, q.y]; };
  const out = { lhand: toW(lh), rhand: toW(rhp), head: toW([0, G.neckY - G.headR * c.head - 6]), s };
  ctx.restore();
  return out;
}

function hairShape(c, r, p) {
  const kind = c.kind;
  ctx.save();
  const hc = c.hair;
  if (kind === 'mom') { // bun
    sphere(0, -r * 1.02, r * .4, hc, true);
    ctx.strokeStyle = mix(hc, -.25); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, -r * 1.02, r * .25, .3, 2.6); ctx.stroke();
  }
  ctx.beginPath();
  if (kind === 'dad') {
    ctx.arc(0, 0, r * 1.08, PI * 1.02, PI * 1.98);
    ctx.quadraticCurveTo(r * 1.05, -r * .05, r * .95, r * .05);
    ctx.quadraticCurveTo(r * .8, -r * .45, r * .3, -r * .5);
    ctx.quadraticCurveTo(r * .05, -r * .32, -r * .2, -r * .52);
    ctx.quadraticCurveTo(-r * .7, -r * .45, -r * .95, r * .05);
    ctx.closePath();
  } else if (kind === 'mom') {
    ctx.arc(0, 0, r * 1.07, PI * .95, PI * 2.05);
    ctx.quadraticCurveTo(r * 1.1, r * .5, r * .9, r * .75);
    ctx.quadraticCurveTo(r * .82, r * .2, r * .62, -r * .38);
    ctx.quadraticCurveTo(r * .1, -r * .62, -r * .1, -r * .5);
    ctx.quadraticCurveTo(-r * .5, -r * .62, -r * .7, -r * .32);
    ctx.quadraticCurveTo(-r * .85, r * .2, -r * .92, r * .78);
    ctx.quadraticCurveTo(-r * 1.12, r * .45, -r * 1.06, r * .1);
    ctx.closePath();
  } else {
    ctx.arc(0, 0, r * 1.06, PI * 1.05, PI * 1.95);
    ctx.quadraticCurveTo(r * .95, -r * .3, r * .5, -r * .45);
    ctx.quadraticCurveTo(r * .1, -r * .3, -r * .25, -r * .5);
    ctx.quadraticCurveTo(-r * .8, -r * .35, -r * 1.0, -r * .2);
    ctx.closePath();
  }
  ctx.fillStyle = patAt(woodTex(hc), 0, 0, 1.2, .5); ctx.fill();
  const g = ctx.createRadialGradient(-r * .35, -r * .7, r * .1, 0, -r * .2, r * 1.3);
  g.addColorStop(0, 'rgba(255,240,220,.45)'); g.addColorStop(.5, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(40,20,5,.35)');
  ctx.fillStyle = g; ctx.fill();
  // strands
  ctx.clip(); ctx.strokeStyle = mix(hc, -.3); ctx.lineWidth = 2;
  for (let i = -6; i <= 6; i++) { ctx.beginPath(); ctx.moveTo(i * r * .13, -r * 1.1); ctx.quadraticCurveTo(i * r * .17, -r * .6, i * r * .2 + r * .05, r * .2); ctx.stroke(); }
  ctx.restore();
  if (kind === 'kid') { // curl
    ctx.strokeStyle = mix(hc, -.15); ctx.lineWidth = r * .1; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(r * .05, -r * 1.12, r * .15, PI * .2, PI * 1.6); ctx.stroke();
  }
}
function head(c, x, y, r, p) {
  ctx.save(); ctx.translate(x, y);
  sphere(0, 0, r, COL.skin);
  if (p.flour) { ctx.fillStyle = 'rgba(255,255,255,.75)'; [[-.4, -.1, .16], [.35, .25, .12], [.1, -.45, .1]].forEach(([a, b, s]) => { ctx.beginPath(); ctx.arc(a * r, b * r, s * r, 0, 7); ctx.fill(); }); }
  hairShape(c, r, p);
  // face
  const ex = r * .32, ey = r * .02, lk = p.look * r * .08;
  if (p.blush) { for (const sx of [-1, 1]) { const g = ctx.createRadialGradient(sx * r * .5, r * .3, 0, sx * r * .5, r * .3, r * .22); g.addColorStop(0, `rgba(230,120,120,${.35 * p.blush})`); g.addColorStop(1, 'rgba(230,120,120,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx * r * .5, r * .3, r * .22, 0, 7); ctx.fill(); } }
  ctx.strokeStyle = '#2a1a12'; ctx.fillStyle = '#1e1410'; ctx.lineCap = 'round'; ctx.lineWidth = r * .055;
  const eyes = Array.isArray(p.eyes) ? p.eyes : [p.eyes, p.eyes];
  [-1, 1].forEach((sx, i) => {
    const e = eyes[i], X = sx * ex + lk, Y = ey;
    ctx.beginPath();
    if (e === 'closed') { ctx.arc(X, Y - r * .02, r * .1, PI * .15, PI * .85); ctx.stroke(); }
    else if (e === 'happy') { ctx.arc(X, Y + r * .08, r * .1, PI * 1.15, PI * 1.85); ctx.stroke(); }
    else if (e === 'wide') { ctx.fillStyle = '#fff'; ctx.arc(X, Y, r * .15, 0, 7); ctx.fill(); ctx.lineWidth = r * .03; ctx.stroke(); ctx.lineWidth = r * .055; ctx.fillStyle = '#1e1410'; ctx.beginPath(); ctx.arc(X + lk * .5, Y, r * .07, 0, 7); ctx.fill(); }
    else { ctx.ellipse(X, Y, r * .065, r * .085, 0, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.arc(X + r * .025, Y - r * .03, r * .022, 0, 7); ctx.fill(); ctx.fillStyle = '#1e1410'; }
    // brows
    const b = p.brows; ctx.beginPath(); ctx.lineWidth = r * .045;
    ctx.moveTo(X - sx * r * .13, Y - r * .2 - (b > 0 ? b * r * .08 : 0)); ctx.lineTo(X + sx * r * .12, Y - r * .22 + (b < 0 ? b * r * .1 : 0) + (b > 0 ? -b * r * .02 : 0)); ctx.stroke(); ctx.lineWidth = r * .055;
  });
  const my = r * .38 + 0, mx = lk;
  ctx.beginPath();
  switch (p.mouth) {
    case 'smile': ctx.arc(mx, my - r * .08, r * .13, PI * .2, PI * .8); ctx.stroke(); break;
    case 'grin': ctx.moveTo(mx - r * .17, my - r * .05); ctx.quadraticCurveTo(mx, my + r * .26, mx + r * .17, my - r * .05); ctx.closePath(); ctx.fillStyle = '#5a1e1e'; ctx.fill(); break;
    case 'o': ctx.ellipse(mx, my, r * .07, r * .1, 0, 0, 7); ctx.fillStyle = '#4a1818'; ctx.fill(); break;
    case 'O': ctx.ellipse(mx, my + r * .04, r * .11, r * .16, 0, 0, 7); ctx.fillStyle = '#4a1818'; ctx.fill(); break;
    case 'flat': ctx.moveTo(mx - r * .1, my); ctx.lineTo(mx + r * .1, my); ctx.stroke(); break;
    case 'sh': ctx.arc(mx, my, r * .05, 0, 7); ctx.fillStyle = '#4a1818'; ctx.fill(); break;
    case 'wavy': ctx.moveTo(mx - r * .14, my); ctx.quadraticCurveTo(mx - r * .07, my - r * .06, mx, my); ctx.quadraticCurveTo(mx + r * .07, my + r * .06, mx + r * .14, my); ctx.stroke(); break;
  }
  ctx.restore();
}
// lying head for bed scenes
function lyingHead(who, x, y, r, rot, p) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  head(CH[who], 0, 0, r, Object.assign({}, DEF, p)); ctx.restore();
}

// ---------- props ----------
function room(x, y, w, h, o = {}) {
  const f = 18, d = o.d || 58, fd = o.fd || h * .16;
  const I = { x: x + f, y: y + f, w: w - 2 * f, h: h - 2 * f };
  const B = { x: I.x + d, y: I.y + d * .8, w: I.w - 2 * d, h: I.h - d * .8 - fd };
  softShadow(x + w / 2, y + h + 6, w * .55, 40, .22);
  woodRect(x, y, w, h, 6, COL.woodL);
  ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(x, y, w, 5);
  // ceiling
  ctx.beginPath(); ctx.moveTo(I.x, I.y); ctx.lineTo(I.x + I.w, I.y); ctx.lineTo(B.x + B.w, B.y); ctx.lineTo(B.x, B.y); ctx.closePath(); ctx.fillStyle = mix(COL.wall, -.05); ctx.fill();
  // side walls
  const wallC = o.wall || COL.wall;
  ctx.beginPath(); ctx.moveTo(I.x, I.y); ctx.lineTo(B.x, B.y); ctx.lineTo(B.x, B.y + B.h); ctx.lineTo(I.x, I.y + I.h); ctx.closePath(); ctx.fillStyle = mix(wallC, -.08); ctx.fill();
  ctx.beginPath(); ctx.moveTo(I.x + I.w, I.y); ctx.lineTo(B.x + B.w, B.y); ctx.lineTo(B.x + B.w, B.y + B.h); ctx.lineTo(I.x + I.w, I.y + I.h); ctx.closePath(); ctx.fillStyle = mix(wallC, -.12); ctx.fill();
  // back wall
  ctx.fillStyle = patAt(pegTex(wallC), B.x, B.y); ctx.fillRect(B.x, B.y, B.w, B.h);
  // floor
  ctx.beginPath(); ctx.moveTo(B.x, B.y + B.h); ctx.lineTo(B.x + B.w, B.y + B.h); ctx.lineTo(I.x + I.w, I.y + I.h); ctx.lineTo(I.x, I.y + I.h); ctx.closePath();
  ctx.fillStyle = patAt(woodTex('#e3bd88'), B.x, B.y + B.h, 0, 1); ctx.fill();
  ctx.save(); ctx.clip(); ctx.strokeStyle = 'rgba(120,80,40,.25)'; ctx.lineWidth = 1.5;
  for (let i = 0; i <= 6; i++) { const t = i / 6; ctx.beginPath(); ctx.moveTo(lerp(B.x, B.x + B.w, t), B.y + B.h); ctx.lineTo(lerp(I.x, I.x + I.w, t), I.y + I.h); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(I.x, B.y + B.h + fd * .5); ctx.lineTo(I.x + I.w, B.y + B.h + fd * .5); ctx.stroke();
  const fg = ctx.createLinearGradient(0, B.y + B.h, 0, I.y + I.h); fg.addColorStop(0, 'rgba(80,40,10,.18)'); fg.addColorStop(1, 'rgba(255,255,255,.05)'); ctx.fillStyle = fg; ctx.fillRect(I.x, B.y + B.h, I.w, fd);
  ctx.restore();
  // ambient occlusion corners
  const ao = ctx.createLinearGradient(0, B.y, 0, B.y + 40); ao.addColorStop(0, 'rgba(90,60,30,.12)'); ao.addColorStop(1, 'rgba(90,60,30,0)'); ctx.fillStyle = ao; ctx.fillRect(B.x, B.y, B.w, 40);
  return { I, B, floor: B.y + B.h, ground: B.y + B.h + fd * .55, fd };
}
function darkness(R, a, glow) { // night overlay inside room
  if (a <= 0) return;
  ctx.save(); ctx.beginPath(); ctx.rect(R.I.x, R.I.y, R.I.w, R.I.h); ctx.clip();
  ctx.fillStyle = `rgba(18,22,52,${a})`; ctx.fillRect(R.I.x, R.I.y, R.I.w, R.I.h);
  if (glow) { ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(glow[0], glow[1], 0, glow[0], glow[1], glow[2]); g.addColorStop(0, `rgba(255,190,110,${glow[3] || .35})`); g.addColorStop(1, 'rgba(255,190,110,0)'); ctx.fillStyle = g; ctx.fillRect(R.I.x, R.I.y, R.I.w, R.I.h); }
  ctx.restore();
}
function windowF(x, y, w, h, night, t = 0) {
  woodRect(x - 14, y - 14, w + 28, h + 28, 6, '#d99a55');
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  if (night) { g.addColorStop(0, '#1d2550'); g.addColorStop(1, '#3a4277'); } else { g.addColorStop(0, '#bfe0f2'); g.addColorStop(1, '#fde7c4'); }
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  if (night) {
    ctx.fillStyle = '#fff6d6'; ctx.beginPath(); ctx.arc(x + w * .7, y + h * .3, w * .13, 0, 7); ctx.fill();
    ctx.fillStyle = '#1d2550'; ctx.beginPath(); ctx.arc(x + w * .76, y + h * .26, w * .12, 0, 7); ctx.fill();
    const R = rng(3); ctx.fillStyle = '#fff'; for (let i = 0; i < 12; i++) { ctx.globalAlpha = .4 + .6 * Math.abs(Math.sin(t * 2 + i)); ctx.beginPath(); ctx.arc(x + R() * w, y + R() * h, 1.5 + R() * 1.5, 0, 7); ctx.fill(); } ctx.globalAlpha = 1;
  } else {
    ctx.fillStyle = '#ffd88a'; ctx.beginPath(); ctx.arc(x + w * .3, y + h * .75, w * .2, 0, 7); ctx.fill();
  }
  ctx.restore();
  ctx.fillStyle = patAt(woodTex('#d99a55'), x, y); ctx.fillRect(x + w / 2 - 6, y, 12, h); ctx.fillRect(x, y + h / 2 - 6, w, 12);
}
function lamp(x, y0, y, on) {
  ctx.strokeStyle = '#3a2a20'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x - 30, y); ctx.lineTo(x + 30, y); ctx.lineTo(x + 66, y + 52); ctx.lineTo(x - 66, y + 52); ctx.closePath();
  ctx.fillStyle = patAt(knitTex('#e9dcc5', 16), x, y); ctx.fill(); shadeOver(x - 66, y, 132, 52, 'h');
  if (on) { ctx.fillStyle = '#fff3cf'; ctx.beginPath(); ctx.ellipse(x, y + 54, 40, 8, 0, 0, 7); ctx.fill(); }
}
function bed(x, y, w, o = {}) { // y = floor line where legs stand
  const hh = w * .5;
  woodRect(x, y - hh - 120, 46, hh + 120, [24, 24, 4, 4], COL.woodD); shadeOver(x, y - hh - 120, 46, hh + 120, 'h');
  woodRect(x + 20, y - hh * .62, w - 30, hh * .5, 8, COL.woodD);
  ctx.fillStyle = patAt(woodTex(COL.woodD), x, y); ctx.fillRect(x + w - 34, y - hh * .62, 28, hh * .62); ctx.fillRect(x + 40, y - 30, 22, 30);
  rr(x + 40, y - hh * .78, w - 70, hh * .3, 18); ctx.fillStyle = '#f4efe6'; ctx.fill(); shadeOver(x + 40, y - hh * .78, w - 70, hh * .3);
  // pillow
  rr(x + 50, y - hh * .98, w * .3, hh * .3, 30); ctx.fillStyle = '#fbf8f2'; ctx.fill(); shadeOver(x + 50, y - hh * .98, w * .3, hh * .3, 'v', 1.2);
  if (o.headFn) o.headFn(x + 50 + w * .15, y - hh * .9);
  // blanket
  ctx.beginPath(); ctx.moveTo(x + 50 + w * .2, y - hh * .78); ctx.quadraticCurveTo(x + w * .5, y - hh * .92 - (o.breath || 0), x + w - 30, y - hh * .78);
  ctx.lineTo(x + w - 26, y - hh * .28); ctx.lineTo(x + 34, y - hh * .28); ctx.quadraticCurveTo(x + 40, y - hh * .7, x + 50 + w * .2, y - hh * .78); ctx.closePath();
  ctx.fillStyle = patAt(knitTex(o.blanket || '#7f9cc0', 20), x, y); ctx.fill(); shadeOver(x + 30, y - hh, w, hh * .7, 'v', 1.2);
}
function tag(x, y, text, t, t0, o = {}) {
  if (t < t0 || (o.t1 && t > o.t1 + .25)) return;
  let p = pop(t, t0, 2.6); if (o.t1 && t > o.t1) p *= 1 - eo(k(t, o.t1, o.t1 + .25));
  const size = o.size || 46; ctx.font = `700 ${size}px H`; const tw = ctx.measureText(text).width;
  const pw = tw + size * .9, ph = size * 1.25;
  ctx.save(); ctx.translate(x, y); ctx.rotate((o.rot ?? -.04) + Math.sin(t * 1.7 + x) * .012); ctx.scale(p, p);
  ctx.shadowColor = 'rgba(80,50,20,.22)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 5;
  ctx.fillStyle = o.bg || COL.cream; ctx.fillRect(-pw / 2, -ph / 2, pw, ph); ctx.shadowColor = 'transparent';
  ctx.fillStyle = 'rgba(120,90,50,.05)'; for (let i = 0; i < 40; i++) ctx.fillRect(-pw / 2 + ((i * 37) % pw), -ph / 2 + ((i * 23) % ph), 2, 2);
  ctx.setLineDash([7, 5]); ctx.strokeStyle = '#c4b293'; ctx.lineWidth = 2; ctx.strokeRect(-pw / 2 + 6, -ph / 2 + 6, pw - 12, ph - 12); ctx.setLineDash([]);
  ctx.fillStyle = o.color || '#231a17'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 0, size * .04);
  if (o.strike) { ctx.strokeStyle = '#231a17'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-tw / 2, 0); ctx.lineTo(-tw / 2 + tw * o.strike, 0); ctx.stroke(); }
  ctx.restore();
}
function block(x, y, text, t, t0, o = {}) { // wooden number block like reference "20"
  if (t < t0) return; const p = pop(t, t0, 2.3);
  const s = o.size || 150;
  ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot ?? .05); ctx.scale(p, p);
  ctx.shadowColor = 'rgba(80,50,20,.3)'; ctx.shadowBlur = 20; ctx.shadowOffsetY = 8;
  woodRect(-s * .55, -s * .5, s * 1.1 * (o.wide || 1), s, 12, COL.woodL, 0, .6); ctx.shadowColor = 'transparent';
  rr(-s * .55 + 10, -s * .5 + 10, s * 1.1 * (o.wide || 1) - 20, s - 20, 8); ctx.strokeStyle = 'rgba(140,90,40,.35)'; ctx.lineWidth = 3; ctx.stroke();
  ctx.font = `900 ${s * (o.fs || .62)}px U`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(60,25,5,.25)'; ctx.fillText(text, -s * .55 + s * .55 * (o.wide || 1) + 4, 8);
  ctx.fillStyle = o.color || '#8a4520'; ctx.fillText(text, -s * .55 + s * .55 * (o.wide || 1), 2);
  ctx.restore();
}
function zigzag(x, y, len, ang, t, col = COL.pink, a = 1) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.globalAlpha = a;
  ctx.strokeStyle = col; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); const n = 4, amp = 12 + Math.sin(t * 20) * 3;
  for (let i = 0; i <= n; i++) { const yy = i / n * len; ctx.lineTo((i % 2 ? amp : -amp), yy); }
  ctx.stroke(); ctx.restore();
}
function heartPath(x, y, s) { ctx.beginPath(); ctx.moveTo(x, y + s * .35); ctx.bezierCurveTo(x - s * 1.1, y - s * .35, x - s * .45, y - s * 1.05, x, y - s * .45); ctx.bezierCurveTo(x + s * .45, y - s * 1.05, x + s * 1.1, y - s * .35, x, y + s * .35); ctx.closePath(); }
function heart(x, y, s, a = 1) { ctx.save(); ctx.globalAlpha = a; heartPath(x, y + s * .3, s); ctx.fillStyle = patAt(knitTex(COL.red, 12), x, y); ctx.fill(); shadeOver(x - s, y - s, 2 * s, 2 * s, 'v', 1.3); ctx.restore(); }
function burst(x, y, r, t, col = COL.red) { // knitted star burst (reference)
  ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * 5) * .1); ctx.beginPath();
  for (let i = 0; i < 18; i++) { const rr_ = i % 2 ? r * .55 : r; const a = i / 18 * 2 * PI; ctx.lineTo(Math.cos(a) * rr_, Math.sin(a) * rr_); }
  ctx.closePath(); ctx.fillStyle = patAt(knitTex(col, 12), 0, 0); ctx.fill(); shadeOver(-r, -r, 2 * r, 2 * r); ctx.restore();
}
function cloud(x, y, s, col = '#efe5d3') {
  const pts = [[-.6, .1, .42], [-.25, -.2, .5], [.2, -.25, .5], [.6, .05, .42], [.25, .25, .45], [-.25, .25, .45]];
  ctx.save(); ctx.beginPath(); pts.forEach(([a, b, r]) => { ctx.moveTo(x + a * s + r * s, y + b * s); ctx.arc(x + a * s, y + b * s, r * s, 0, 7); });
  ctx.shadowColor = 'rgba(80,50,20,.18)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 6;
  ctx.fillStyle = patAt(knitTex(col, 16), x, y); ctx.fill(); ctx.shadowColor = 'transparent'; shadeOver(x - s, y - s * .8, 2 * s, 1.6 * s, 'v', .8); ctx.restore();
}
function rollingPin(x, y, len, rot) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  const r = len * .085;
  for (const sx of [-1, 1]) { limb(sx * len * .5, 0, sx * len * .72, 0, r * .45, COL.woodD, false); sphere(sx * len * .74, 0, r * .55, COL.woodD); }
  limb(-len * .5, 0, len * .5, 0, r, COL.woodL, false);
  ctx.restore();
}
function plate(x, y, s, t) {
  softShadow(x, y + 20 * s, 190 * s, 30 * s, .25);
  ctx.beginPath(); ctx.ellipse(x, y, 170 * s, 50 * s, 0, 0, 7); ctx.fillStyle = '#f6f1ea'; ctx.fill(); ctx.strokeStyle = '#d9d0c4'; ctx.lineWidth = 3; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(x, y, 120 * s, 34 * s, 0, 0, 7); ctx.fillStyle = '#efe8de'; ctx.fill();
  for (let i = 0; i < 6; i++) { const yy = y - i * 20 * s; ctx.beginPath(); ctx.ellipse(x, yy, 110 * s, 30 * s, 0, 0, 7); ctx.fillStyle = i % 2 ? '#d99a4e' : '#e2a659'; ctx.fill(); ctx.beginPath(); ctx.ellipse(x, yy - 6 * s, 108 * s, 27 * s, 0, 0, 7); ctx.fillStyle = '#f1c27e'; ctx.fill(); }
  const top = y - 5 * 20 * s - 8 * s;
  ctx.beginPath(); ctx.ellipse(x, top, 80 * s, 20 * s, 0, 0, 7); ctx.fillStyle = 'rgba(160,80,20,.85)'; ctx.fill();
  ctx.fillStyle = 'rgba(160,80,20,.85)'; for (const dx of [-70, 20, 75]) { const d = 30 + 20 * Math.sin(t * 2 + dx); rr(x + dx * s - 7 * s, top, 14 * s, d * s, 7 * s); ctx.fill(); }
  rr(x - 22 * s, top - 30 * s, 44 * s, 30 * s, 6 * s); ctx.fillStyle = '#fbe9a6'; ctx.fill(); shadeOver(x - 22 * s, top - 30 * s, 44 * s, 30 * s);
  for (const [dx, dy] of [[-120, 10], [130, 0]]) { ctx.save(); ctx.translate(x + dx * s, y + dy * s); ctx.beginPath(); ctx.moveTo(0, -26 * s); ctx.bezierCurveTo(26 * s, -26 * s, 22 * s, 14 * s, 0, 24 * s); ctx.bezierCurveTo(-22 * s, 14 * s, -26 * s, -26 * s, 0, -26 * s); ctx.fillStyle = '#d5263f'; ctx.fill(); shadeOver(-26 * s, -26 * s, 52 * s, 50 * s); ctx.fillStyle = '#4f8a3c'; ctx.beginPath(); ctx.ellipse(0, -26 * s, 14 * s, 6 * s, 0, 0, 7); ctx.fill(); ctx.restore(); }
  // steam
  ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 8 * s; ctx.lineCap = 'round';
  for (let i = -1; i <= 1; i++) { ctx.globalAlpha = .55 + .3 * Math.sin(t * 3 + i); ctx.beginPath(); const bx = x + i * 50 * s; for (let j = 0; j < 10; j++) { const yy = top - 50 * s - j * 14 * s; ctx.lineTo(bx + Math.sin(t * 3 + j * .7 + i) * 12 * s, yy); } ctx.strokeStyle = 'rgba(200,190,180,.6)'; ctx.stroke(); } ctx.globalAlpha = 1;
}
function cabinet(x, y, w, h, o = {}) { // front view kitchen base cabinet: y = floor line
  softShadow(x + w / 2, y, w * .55, 18, .2);
  woodRect(x, y - h, w, h, 6, COL.woodL); shadeOver(x, y - h, w, h, 'v', .6);
  const cols = 3, cw = (w - 30) / cols;
  for (let i = 0; i < cols; i++) {
    const cx = x + 15 + i * cw;
    if (i === 0) { for (let j = 0; j < 3; j++) { const dh = (h - 50) / 3; woodRect(cx + 6, y - h + 30 + j * dh, cw - 12, dh - 10, 6, COL.wood); shadeOver(cx + 6, y - h + 30 + j * dh, cw - 12, dh - 10); rr(cx + cw / 2 - 30, y - h + 30 + j * dh + dh / 2 - 12, 60, 10, 5); ctx.fillStyle = '#7d5a3c'; ctx.fill(); } }
    else { woodRect(cx + 6, y - h + 30, cw - 12, h - 50, 6, COL.wood); shadeOver(cx + 6, y - h + 30, cw - 12, h - 50); rr(cx + (i === 1 ? cw - 34 : 22), y - h + 70, 10, 60, 5); ctx.fillStyle = '#7d5a3c'; ctx.fill(); }
  }
  // countertop
  woodRect(x - 16, y - h - 26, w + 32, 30, 5, COL.woodD); shadeOver(x - 16, y - h - 26, w + 32, 30);
  return y - h - 26;
}
function shelf(x, y, w) { woodRect(x, y, w, 18, 4, COL.woodD); shadeOver(x, y, w, 18); }
function jar(x, y, h, col) { rr(x - 28, y - h, 56, h, 12); ctx.fillStyle = 'rgba(220,235,240,.65)'; ctx.fill(); rr(x - 24, y - h * .7, 48, h * .66, 10); ctx.fillStyle = col; ctx.fill(); woodRect(x - 30, y - h - 14, 60, 16, 4, COL.woodD); ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(x - 18, y - h + 8, 6, h - 18); }
function bowl(x, y, s = 1) { ctx.beginPath(); ctx.ellipse(x, y - 40 * s, 80 * s, 18 * s, 0, 0, PI * 2); ctx.fillStyle = '#efe6d6'; ctx.fill(); ctx.beginPath(); ctx.moveTo(x - 80 * s, y - 40 * s); ctx.quadraticCurveTo(x, y + 40 * s, x + 80 * s, y - 40 * s); ctx.fillStyle = patAt(knitTex('#d2a08a', 14), x, y); ctx.fill(); shadeOver(x - 80 * s, y - 40 * s, 160 * s, 50 * s, 'h'); }
function door(x, y, w, h, open = 0) { // front-view wooden door; open 0..1 swings (squash)
  woodRect(x - 16, y - 16, w + 32, h + 16, 6, COL.woodD);
  ctx.fillStyle = '#2b2018'; ctx.fillRect(x, y, w, h);
  const dw = w * (1 - open * .85);
  woodRect(x, y, dw, h, 4, COL.wood, PI / 2, .7); shadeOver(x, y, dw, h, 'h', 1 + open);
  ctx.strokeStyle = 'rgba(120,80,40,.35)'; ctx.lineWidth = 3; ctx.strokeRect(x + dw * .12, y + h * .06, dw * .76, h * .38); ctx.strokeRect(x + dw * .12, y + h * .52, dw * .76, h * .4);
  sphere(x + dw * .86, y + h * .52, 13, '#b88a4f', false);
}

// ---------- subtitles ----------
function subtitles(t) {
  const c = SUBS.find(c => t >= c.t && t < c.end); if (!c) return;
  const words = c.words;
  const acc = words.some(w => w.a);
  const meas = sz => { ctx.font = `900 ${sz}px U`; ctx.letterSpacing = `${-sz * .03}px`; const ws = words.map(w => ctx.measureText(w.w).width); return [ws, ws.reduce((a, b) => a + b, 0) + sz * .38 * (words.length - 1)]; };
  let size = Math.min(acc ? 128 : 110, 960 / meas(100)[1] * 100);
  if (words.length === 1 && !acc) size = Math.min(size, 104);
  const [ws, total] = meas(size); const sp = size * .38, sc = 1;
  const life = k(t, c.t, c.end);
  const breathe = 1 + .035 * eo(life);
  const out = t > c.end - .07 ? 1 - k(t, c.end - .07, c.end) : 1;
  const cy = 1590;
  ctx.save(); ctx.translate(540, cy); ctx.scale(breathe, breathe);
  let x = -total / 2;
  words.forEach((w, i) => {
    const ww = ws[i] * sc;
    if (t >= w.t) {
      const p = pop(t, w.t, 3.2); const a = clamp((t - w.t) / .06) * out;
      ctx.save(); ctx.translate(x + ww / 2, (1 - Math.min(p, 1)) * 30); const s_ = .4 + .6 * Math.min(p, 1) + Math.max(0, p - 1) * .35; ctx.scale(s_, s_);
      if (w.a) ctx.rotate(Math.sin((t - w.t) * 9) * .03 * Math.exp(-(t - w.t) * 3));
      ctx.globalAlpha = a; ctx.font = `900 ${size}px U`; ctx.letterSpacing = `${-size * .03}px`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = w.a ? COL.red : COL.ink; ctx.fillText(w.w, 0, 0);
      ctx.restore();
    }
    x += ww + sp;
  });
  ctx.restore(); ctx.letterSpacing = '0px';
}

// ---------- camera ----------
function cam(z, cx, cy, shake = 0, t = 0) {
  const sx = shake ? Math.sin(t * 61) * shake + Math.sin(t * 37) * shake * .5 : 0, sy = shake ? Math.cos(t * 53) * shake : 0;
  ctx.translate(W / 2 + sx, H / 2 + sy); ctx.scale(z, z); ctx.translate(-cx, -cy);
  CAMM = ctx.getTransform();
}
let CAMM = new DOMMatrix();

// =============== SCENES ===============
const BOX = [40, 440, 1000, 1000];
const walk = (t, sp = 7, amp = .38) => { const ph = t * sp; return { lh: Math.sin(ph) * amp, rh: -Math.sin(ph) * amp, lk: Math.max(0, -Math.sin(ph)) * amp * 1.4 * -1, rk: Math.max(0, Math.sin(ph)) * amp * 1.4 * -1, bob: Math.abs(Math.cos(ph)) * 10 }; };

const SC = [];
// 1. sleeping house
SC.push([0, 4.56, (t) => {
  const z = lerp(1.5, 1, eio(k(t, 1.6, 2.6))), cx = lerp(300, 540, eio(k(t, 1.6, 2.6)));
  cam(z, cx, 940 + (1 - k(t, 1.6, 2.6)) * 80);
  const R = room(...BOX);
  // partition wall
  const px = 540; woodRect(px - 18, R.B.y - 30, 36, R.ground - R.B.y + 50, 4, COL.woodL); shadeOver(px - 18, R.B.y, 36, 600, 'h');
  windowF(170, 600, 150, 150, true, t);
  windowF(800, 600, 120, 150, true, t);
  bed(110, R.ground + 20, 400, { breath: Math.sin(t * 2.2) * 6, headFn: (x, y) => lyingHead('mom', x, y, 44, -.25, { eyes: 'closed', mouth: 'flat' }) });
  // zzz
  for (let i = 0; i < 3; i++) { const ph = (t * .5 + i / 3) % 1; ctx.globalAlpha = Math.sin(ph * PI); ctx.font = `700 ${40 + ph * 30}px H`; ctx.fillStyle = '#5b6aa0'; ctx.fillText('z', 230 + ph * 60 + i * 10, 960 - ph * 160); } ctx.globalAlpha = 1;
  const lit = k(t, 3.3, 3.5);
  lamp(780, R.B.y - 40, 620, lit > .5);
  figure('dad', 700, R.ground, { eyes: t < 3.3 ? 'wide' : 'open', mouth: t < 3.3 ? 'flat' : 'grin', look: -1, brows: .6 });
  figure('kid', 880, R.ground, { eyes: t < 3.3 ? 'wide' : 'open', mouth: t < 3.3 ? 'flat' : 'grin', look: -1, bob: pop(t, 3.4) * 0 + Math.max(0, Math.sin((t - 3.4) * 12)) * 20 * k(t, 3.4, 3.41) * (1 - k(t, 4, 4.4)) });
  darkness(R, .2, null);
  // right room darker until lamp
  ctx.save(); ctx.beginPath(); ctx.rect(px + 18, R.I.y, R.I.x + R.I.w - px - 18, R.I.h); ctx.clip();
  ctx.fillStyle = `rgba(8,10,28,${.6 * (1 - lit)})`; ctx.fillRect(0, 0, W, H);
  if (lit > 0) { ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(780, 700, 0, 780, 700, 520); g.addColorStop(0, `rgba(255,180,90,${.32 * lit})`); g.addColorStop(1, 'rgba(255,180,90,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
  ctx.restore();
  // eyes glint in the dark
  if (t > 2.42 && t < 3.4) { const bl = (t > 2.9 && t < 3.0) ? .2 : 1; ctx.fillStyle = '#fff'; for (const [ex, ey, r] of [[675, 806, 11], [715, 806, 11], [868, 1063, 8], [892, 1063, 8]]) { ctx.beginPath(); ctx.ellipse(ex, ey, r, r * bl, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(ex - 3, ey, r * .45 * bl, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; } }
  tag(300, 520, 'все спят…', t, .5, { rot: -.06 });
  tag(790, 520, 'почти все', t, 3.35, { rot: .05 });
}]);
// 2. 3:17 dad and son
SC.push([4.56, 10.49, (t) => {
  cam(1 + .03 * k(t, 4.56, 10.49), 540, 960);
  const R = room(...BOX);
  windowF(170, 600, 170, 170, true, t); lamp(760, R.B.y - 40, 640, true);
  shelf(560, 820, 300); jar(620, 820, 80, '#e7d7b8'); jar(700, 820, 60, '#c98b5a'); jar(790, 820, 90, '#9db08a');
  const whisper = k(t, 8.0, 8.4) * (1 - k(t, 9.6, 10));
  const dadB = pop(t, 6.9) > 0 && t < 7.6 ? Math.sin((t - 6.9) * 9) * 18 * (1 - k(t, 6.9, 7.6)) : 0;
  const kidB = t > 7.7 && t < 8.6 ? Math.abs(Math.sin((t - 7.7) * 9)) * 26 * (1 - k(t, 7.7, 8.6)) : 0;
  const d = figure('dad', 420, R.ground, { tilt: whisper * .22, head: whisper * .25, mouth: whisper > .3 ? 'sh' : 'grin', bob: dadB, la: -.2, ra: .3 + whisper * .6, re: -1.1 * whisper, eyes: 'open', look: whisper, brows: .3 });
  figure('kid', 690, R.ground, { mouth: t > 9 ? 'grin' : 'smile', bob: kidB, eyes: t > 9.2 ? 'happy' : 'open', look: -1, la: -.2 - .9 * whisper, le: -.8 * whisper, ra: .2 });
  darkness(R, .14, [760, 720, 600, .25]);
  block(860, 470, '3:17', t, 4.65, { size: 150, wide: 1.6, fs: .5 });
  tag(260, 520, 'три часа ночи', t, 5.2, { rot: -.05, t1: 8.8 });
  tag(400, 760, 'папа', t, 6.95, { rot: -.03 });
  tag(720, 1000, '4 года', t, 7.75, { rot: .05 });
  if (t > 9.2) { const p = pop(t, 9.25); ctx.save(); ctx.translate(560, 820 - (t - 9.25) * 40); ctx.scale(p, p); heart(0, 0, 60); ctx.restore(); }
  tag(560, 690, 'сюрприз для мамы', t, 9.3, { rot: -.04, size: 48 });
}]);
// 3. the plan
SC.push([10.49, 14.02, (t) => {
  cam(1, 540, 960);
  softShadow(520, 1330, 380, 30, .2);
  woodRect(140, 520, 760, 800, 18, COL.woodL); shadeOver(140, 520, 760, 800, 'v', .6);
  rr(170, 550, 700, 740, 12); ctx.fillStyle = patAt(pegTex('#f5ecdc'), 170, 550); ctx.fill();
  tag(520, 640, 'план', t, 10.55, { size: 80, rot: -.03 });
  const items = [[11.73, 'приготовить завтрак', 800], [12.8, 'пока мама спит', 1060]];
  items.forEach(([t0, txt, y], i) => {
    tag(520, y, txt, t, t0, { size: 56, rot: i ? .03 : -.02 });
    if (t > t0 + .2) { // icon
      const p = pop(t, t0 + .2);
      ctx.save(); ctx.translate(520, y + 120); ctx.scale(p, p);
      if (i === 0) plate(0, 0, .45, t); else { lyingHead('mom', -30, 0, 46, -.3, { eyes: 'closed', mouth: 'flat' }); ctx.font = '700 50px H'; ctx.fillStyle = '#5b6aa0'; ctx.fillText('z z', 30, -40 - Math.sin(t * 3) * 6); }
      ctx.restore();
    }
    if (t > t0 + .6) { // red check
      const p = k(t, t0 + .6, t0 + .9); ctx.strokeStyle = COL.red; ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); const x0 = 210, y0 = y; ctx.moveTo(x0, y0); ctx.lineTo(x0 + 20 * Math.min(1, p * 2), y0 + 22 * Math.min(1, p * 2)); if (p > .5) ctx.lineTo(x0 + 20 + 40 * (p - .5) * 2, y0 + 22 - 50 * (p - .5) * 2); ctx.stroke();
    }
  });
  figure('kid', 900, 1420, { la: -2.0 + Math.sin(t * 5) * .08 + (t > 12.8 ? .5 : 0), le: 0, ra: .2, mouth: 'grin', look: -1 }, 1.25);
  tag(700, 470, 'простой!', t, 11.0, { rot: .07, size: 50 });
}]);
// 4. mom wakes from the smallest sound
SC.push([14.02, 20.18, (t) => {
  const z = lerp(1.25, 1.55, eio(k(t, 14, 20)));
  cam(z, 380, 1060, t > 18.75 && t < 19.1 ? 4 : 0, t);
  const R = room(...BOX);
  windowF(620, 600, 170, 170, true, t);
  const eyeOpen = t > 18.8 && t < 19.9;
  bed(110, R.ground + 20, 500, { breath: Math.sin(t * 2.2) * 6, headFn: (x, y) => lyingHead('mom', x, y, 56, -.25, { eyes: eyeOpen ? ['closed', 'wide'] : 'closed', mouth: eyeOpen ? 'o' : 'flat', brows: eyeOpen ? .8 : 0 }) });
  darkness(R, .18, null);
  // feather falling
  if (t > 16.9) { const p = eo(k(t, 16.9, 18.8)); const fx = 420 + Math.sin(t * 3) * 40 * (1 - p), fy = lerp(620, 1060, p);
    ctx.save(); ctx.translate(fx, fy); ctx.rotate(Math.sin(t * 3) * .5); ctx.beginPath(); ctx.ellipse(0, 0, 10, 34, 0, 0, 7); ctx.fillStyle = '#fbf7f0'; ctx.fill(); ctx.strokeStyle = '#d8cbb6'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -34); ctx.lineTo(0, 40); ctx.stroke(); ctx.restore();
    tag(520, 600, 'пёрышко', t, 17.1, { rot: .06, size: 40, t1: 18.7 });
  }
  if (t > 18.78) { const a = 1 - k(t, 19.6, 20); zigzag(200, 900, 90, -.4, t, COL.pink, a); zigzag(470, 960, 90, .5, t, COL.pink, a); }
  tag(300, 760, 'проблема', t, 15.2, { rot: -.05, color: COL.red, t1: 16.8 });
  tag(330, 760, 'слышит всё', t, 18.85, { rot: -.05, size: 44 });
  if (t > 14.3 && t < 16.8) burst(170, 880, 40, t);
}]);
// 5. tiptoe
SC.push([20.18, 23.77, (t) => {
  cam(1, 540, 960);
  const R = room(...BOX);
  windowF(760, 600, 150, 150, true, t);
  door(160, 700, 180, R.floor - 700);
  const lt = t - 20.18, x0 = lerp(260, 560, lt / 3.6);
  const w1 = walk(lt, 5, .32), w2 = walk(lt + .4, 6, .28);
  const d = figure('dad', x0, R.ground, Object.assign({}, w1, { bob: w1.bob - 26, tilt: .08, eyes: 'open', look: 1, mouth: 'flat', brows: .5, la: -1.0 + Math.sin(lt * 5) * .1, le: -.6, rt: [x0 + 34, R.ground - 520], rb: -1 }));
  figure('kid', x0 + 260, R.ground, Object.assign({}, w2, { bob: w2.bob - 10, eyes: 'open', mouth: 'sh', look: 1, la: -1.3, le: -.3, ra: 1.3, re: .3 }), 1);
  darkness(R, .14, null);
  tag(x0 + 140, 640, 'тсс…', t, 20.5, { size: 58, rot: -.06 });
  tag(800, 860, 'на цыпочках', t, 21.6, { rot: .05 });
}]);
// 6. kitchen + rolling pin
function kitchen(R, t, mess = 0) {
  windowF(640, 590, 170, 150, true, t);
  shelf(200, 740, 340); jar(250, 740, 80, '#e7d7b8'); jar(330, 740, 60, '#c98b5a'); jar(420, 740, 100, '#efe7dc'); jar(500, 740, 70, '#9db08a');
  const top = cabinet(140, R.floor + 30, 800, 300);
  bowl(330, top + 4, .8);
  return top;
}
SC.push([23.77, 26.4, (t) => {
  cam(1, 540, 960);
  const R = room(...BOX);
  const top = kitchen(R, t);
  figure('dad', 250, R.ground + 60, { la: -.2, ra: .3, look: 1, mouth: 'o', eyes: 'open', brows: .5 }, .9);
  figure('kid', 830, R.ground + 60, { look: -1, mouth: 'grin', ra: .2, la: -2.4, le: -.3 }, 1.05);
  darkness(R, .1, null);
  const p = pop(t, 24.6); if (p > 0) { ctx.save(); ctx.translate(540, 760 - Math.sin(t * 2) * 15); ctx.scale(p, p); softShadow(0, 140, 200, 20, .15); rollingPin(0, 0, 420, Math.sin(t * 1.5) * .12);
    for (let i = 0; i < 6; i++) { const a = i / 6 * 2 * PI + t; ctx.fillStyle = '#ffd56b'; ctx.beginPath(); ctx.arc(Math.cos(a) * 260, Math.sin(a) * 80, 6, 0, 7); ctx.fill(); } ctx.restore(); }
  tag(540, 610, 'скалка', t, 25.1, { size: 58, rot: .04 });
}]);
// 7 / 9. drawer close-up
function drawerScene(t, open, kidP, o = {}) {
  cam(1, 540, 960);
  // floor plank / shelf like reference
  softShadow(540, 1420, 470, 30, .18);
  woodRect(60, 1400, 960, 26, 6, COL.woodD);
  // cabinet side view
  const cx = 150, cw = 430, ctop = 720, cbot = 1400;
  woodRect(cx - 20, ctop - 34, cw + 50, 34, 5, COL.woodD); shadeOver(cx - 20, ctop - 34, cw + 50, 34);
  woodRect(cx, ctop, cw, cbot - ctop, 4, COL.woodL); shadeOver(cx, ctop, cw, cbot - ctop, 'h', .7);
  ctx.strokeStyle = 'rgba(120,80,40,.3)'; ctx.lineWidth = 3; ctx.strokeRect(cx + 20, ctop + 20, cw - 40, cbot - ctop - 40);
  // drawer
  const dy = 760, dh = 190, fx = cx + cw + open;
  // box sides
  ctx.save(); ctx.beginPath(); ctx.rect(cx + cw, 0, 2000, 2000); ctx.clip();
  woodRect(cx + cw - 360 + open, dy + 20, 360, dh - 30, 4, COL.wood); shadeOver(cx + cw - 360 + open, dy + 20, 360, dh - 30);
  ctx.restore();
  ctx.strokeStyle = 'rgba(90,55,25,.5)'; ctx.lineWidth = 3; ctx.strokeRect(cx + 20, dy - 4, cw - 40, dh + 8);
  // contents: rolling pin peeking
  if (o.pin !== false) { ctx.save(); ctx.beginPath(); ctx.rect(cx + cw, 0, 2000, dy + 30); ctx.clip(); rollingPin(fx - 170, dy + 18, 260, 0); ctx.restore(); }
  // cabinet front edge to hide drawer body inside
  woodRect(cx + cw - 20, ctop, 20, cbot - ctop, 2, COL.woodD);
  // front panel
  woodRect(fx, dy, 34, dh, 6, COL.wood, PI / 2); shadeOver(fx, dy, 34, dh, 'h');
  // handle
  woodRect(fx + 34, dy + dh / 2 - 34, 20, 68, 8, COL.walnut); shadeOver(fx + 34, dy + dh / 2 - 34, 20, 68, 'h');
  const hx = fx + 50, hy = dy + dh / 2;
  return { hx, hy };
}
SC.push([26.4, 30.82, (t) => {
  let open;
  if (t < 27.9) open = 300 * eio(k(t, 26.6, 27.9));
  else if (t < 29.55) open = 300;
  else open = lerp(300, 34, ei(k(t, 29.55, 30.35)));
  const sh = t > 29.55 ? 3 : 0;
  ctx.save(); cam(1, 540, 960, sh, t); ctx.restore();
  const D = drawerScene(t, open);
  const holding = t < 29.0;
  const kx = holding ? D.hx + 170 : lerp(D.hx + 170, 870, eo(k(t, 29, 29.5)));
  const kidX = Math.max(kx, 760);
  const shocked = t > 29.4;
  figure('kid', kidX, 1400, { lt: holding ? [D.hx + 6, D.hy] : undefined, lb: -1, la: shocked ? -2.6 : -.9, le: shocked ? -.4 : 0, ra: shocked ? 2.6 : .2, re: shocked ? .4 : 0, look: -1, mouth: shocked ? 'O' : 'grin', eyes: shocked ? 'wide' : 'open', brows: shocked ? .8 : 0, tilt: holding ? .08 : 0 }, 1.45);
  if (t > 29.55) { // motion lines
    ctx.strokeStyle = 'rgba(40,30,25,.55)'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) { const y = 790 + i * 40, x = 600 + open + 70; ctx.beginPath(); ctx.moveTo(x + 20, y); ctx.lineTo(x + 120 + i * 20, y); ctx.stroke(); }
    burst(900, 720, 60, t);
    ctx.font = '900 70px U'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText('!', 900, 746); ctx.textAlign = 'left';
  }
  tag(380, 620, 'кухонный ящик', t, 27.2, { rot: -.04, t1: 29.4 });
  tag(380, 620, 'ой!', t, 29.45, { rot: -.06, size: 60, color: COL.red });
}]);
// 8. dad imagines the whole house waking up
SC.push([30.82, 33.97, (t) => {
  cam(1, 540, 960, 2.5, t);
  softShadow(540, 1440, 420, 30, .2); woodRect(150, 1420, 780, 26, 6, COL.woodD);
  figure('dad', 540, 1420, { lt: [470, 760], rt: [610, 760], lb: 1, rb: -1, eyes: 'wide', mouth: 'O', brows: 1, tilt: Math.sin(t * 30) * .01 }, 1.12);
  // thought cloud
  const p = pop(t, 31.0);
  if (p > 0) {
    ctx.save(); ctx.translate(770, 520); ctx.scale(p, p);
    for (const [x, y, r] of [[-170, 200, 18], [-140, 160, 26]]) { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fillStyle = patAt(knitTex('#efe5d3', 14), 0, 0); ctx.fill(); }
    cloud(0, 0, 230);
    // mini house
    ctx.fillStyle = patAt(woodTex(COL.wood), 0, 0); ctx.beginPath(); ctx.moveTo(-110, -20); ctx.lineTo(0, -110); ctx.lineTo(110, -20); ctx.closePath(); ctx.fill();
    woodRect(-90, -20, 180, 140, 4, COL.woodL);
    const wins = [[-60, 10], [20, 10], [-60, 65], [20, 65]];
    wins.forEach(([x, y], i) => { const on = t > 31.5 + i * .45; ctx.fillStyle = on ? '#ffd56b' : '#2c3360'; ctx.fillRect(x, y, 40, 38); if (on) { ctx.globalAlpha = .3; ctx.fillStyle = '#ffd56b'; ctx.beginPath(); ctx.arc(x + 20, y + 19, 45, 0, 7); ctx.fill(); ctx.globalAlpha = 1; } });
    if (t > 32.6) { zigzag(-160, -60, 80, -.5, t); zigzag(150, -60, 80, .5, t); }
    ctx.restore();
  }
  tag(250, 560, 'весь дом проснётся!', t, 32.4, { rot: -.06, size: 44, color: COL.red });
}]);
// 9. drawer closes silently (soft close)
SC.push([33.97, 37.19, (t) => {
  const open = lerp(34, 0, eo(k(t, 34.0, 35.8)));
  const D = drawerScene(t, open);
  const relief = t > 35.9;
  figure('kid', 860, 1400, { la: relief ? -.3 : -2.6, le: relief ? 0 : -.4, ra: relief ? .3 : 2.6, re: relief ? 0 : .4, look: -1, mouth: relief ? 'grin' : 'O', eyes: relief ? 'happy' : 'wide', brows: relief ? 0 : .8 }, 1.45);
  // soft-close cushion glow
  if (t > 34 && t < 36.2) { const a = Math.sin(k(t, 34, 36.2) * PI); ctx.strokeStyle = `rgba(150,180,140,${a})`; ctx.lineWidth = 5; for (let i = 1; i <= 3; i++) { ctx.beginPath(); ctx.arc(600 + open, 855, 30 * i + (t * 40 % 30), -.9, .9); ctx.stroke(); } }
  tag(360, 620, 'бесшумно', t, 35.4, { size: 56, rot: -.04 });
  tag(820, 1000, 'фух…', t, 36.0, { size: 52, rot: .06 });
  tag(380, 520, 'плавное закрывание', t, 34.3, { size: 40, rot: .03, bg: '#fff' });
}]);
// 10. operation continues
SC.push([37.19, 39.01, (t) => {
  cam(1.05, 540, 960);
  const R = room(...BOX); kitchen(R, t);
  const hi = pop(t, 37.9);
  const meet = [540, 1000 - hi * 40];
  figure('dad', 360, R.ground + 60, { rt: meet, rb: 1, look: 1, mouth: 'grin', eyes: t > 37.9 ? 'happy' : 'open' }, .95);
  figure('kid', 700, R.ground + 60, { lt: [meet[0] + 20, meet[1] + 20], lb: -1, look: -1, mouth: 'grin', eyes: t > 37.9 ? 'happy' : 'open', bob: hi > 0 ? Math.abs(Math.sin((t - 37.9) * 8)) * 30 * (1 - k(t, 37.9, 38.9)) : 0 }, 1.25);
  darkness(R, .1, null);
  if (t > 37.9) burst(540, 930, 50 * Math.min(1, pop(t, 37.9)), t, '#eab04a');
  tag(540, 560, 'операция «завтрак»', t, 37.3, { size: 50, rot: -.03 });
}]);
// 11. kitchen catastrophe
SC.push([39.01, 44.59, (t) => {
  const boom = t > 43.0 ? Math.exp(-(t - 43.0) * 3) * 14 : 0;
  cam(1 + .04 * k(t, 39, 44.6), 540, 960, boom + (t > 40 ? 1.2 : 0), t);
  const R = room(...BOX); const top = kitchen(R, t);
  const m = k(t, 40, 43.2);
  // splats on wall
  const R2 = rng(9);
  for (let i = 0; i < 9; i++) { const tt = 40.1 + i * .35; if (t < tt) continue; const p = Math.min(1, pop(t, tt)); const x = 180 + R2() * 700, y = 600 + R2() * 260, s = 20 + R2() * 30; ctx.fillStyle = i % 3 === 0 ? '#f3c93e' : 'rgba(255,255,255,.95)'; ctx.beginPath(); for (let j = 0; j < 10; j++) { const a = j / 10 * 2 * PI, r = s * p * (j % 2 ? .6 : 1.1); ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } ctx.fill(); }
  // pot on floor, eggshells, milk puddle
  if (t > 41) { ctx.beginPath(); ctx.ellipse(800, R.ground + 40, 120 * eo(k(t, 41, 42)), 20, 0, 0, 7); ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fill(); }
  if (t > 41.3) { ctx.save(); ctx.translate(860, R.ground + 20); ctx.rotate(1.2); rr(-50, -40, 100, 80, 12); ctx.fillStyle = '#9aa3aa'; ctx.fill(); shadeOver(-50, -40, 100, 80, 'h'); ctx.restore(); }
  if (t > 40.6) rollingPin(380, R.ground + 50, 220, .2);
  const flour = { flour: true };
  figure('dad', 330, R.ground + 60, Object.assign({ eyes: 'happy', mouth: 'grin', la: -2.2 + Math.sin(t * 9) * .3, le: -.5, ra: .5, look: 1 }, m > .3 ? flour : {}), .95);
  figure('kid', 650, R.ground + 60, Object.assign({ eyes: 'happy', mouth: 'grin', ra: 2.3 + Math.sin(t * 11) * .3, re: .4, la: -2.3, le: -.4, bob: Math.abs(Math.sin(t * 7)) * 18 }, m > .5 ? flour : {}), 1.2);
  // flour puffs
  for (let i = 0; i < 14; i++) { const tt = 40 + i * .25; if (t < tt) continue; const ph = t - tt; const R3 = rng(i + 20); const x = 200 + R3() * 680, y = top - 20 - ph * 60 * R3(); const r = (30 + R3() * 40) * Math.min(1, ph * 3) + ph * 10; ctx.globalAlpha = clamp(1 - ph / 3) * .85; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
  ctx.globalAlpha = 1;
  if (t > 43.0) { const p = k(t, 43.0, 43.6); ctx.globalAlpha = (1 - k(t, 43.6, 44.6)) * .8; ctx.fillStyle = '#fff'; for (let i = 0; i < 16; i++) { const a = i / 16 * 2 * PI; ctx.beginPath(); ctx.arc(540 + Math.cos(a) * 420 * eo(p), 980 + Math.sin(a) * 360 * eo(p), 70 * p + 20, 0, 7); ctx.fill(); } ctx.globalAlpha = 1; }
  
  block(860, 480, '20', t, 39.05, { size: 150 });
  tag(260, 500, 'двадцать минут спустя', t, 39.3, { size: 44, rot: -.04, t1: 42.6 });
  tag(540, 660, 'катастрофа', t, 43.15, { size: 62, rot: .04, color: COL.red });
}]);
// 12. breakfast ready
SC.push([44.59, 46.66, (t) => {
  cam(1 + .05 * k(t, 44.6, 46.7), 540, 1000);
  softShadow(540, 1300, 460, 30, .2);
  woodRect(80, 1240, 920, 60, 10, COL.woodD); shadeOver(80, 1240, 920, 60);
  woodRect(170, 1120, 740, 120, 20, COL.woodL); shadeOver(170, 1120, 740, 120);
  const p = pop(t, 44.65);
  ctx.save(); ctx.translate(540, 1150); ctx.scale(p, p); plate(0, 0, 1.5, t); ctx.restore();
  // cup
  ctx.save(); ctx.translate(820, 1150); rr(-50, -110, 100, 110, [8, 8, 30, 30]); ctx.fillStyle = patAt(knitTex('#e9dcc5', 14), 0, 0); ctx.fill(); shadeOver(-50, -110, 100, 110, 'h'); ctx.lineWidth = 12; ctx.strokeStyle = '#e0d2bc'; ctx.beginPath(); ctx.arc(55, -55, 26, -1.3, 1.3); ctx.stroke(); ctx.restore();
  for (let i = 0; i < 3; i++) { const tt = 45 + i * .3; if (t > tt) { ctx.save(); ctx.translate(250 + i * 280, 640 - (t - tt) * 60); const q = pop(t, tt); ctx.scale(q, q); heart(0, 0, 34 + i * 6); ctx.restore(); } }
  tag(540, 560, 'завтрак готов!', t, 45.4, { size: 58, rot: -.04 });
}]);
// 13-15. hallway: walk to door, the detail, mom reveal
SC.push([46.66, 55.94, (t) => {
  // world is wider than the screen: two rooms separated by a wall with a door
  let cx = 520, z = 1;
  if (t > 48.97) { z = lerp(1, 1.18, eio(k(t, 48.97, 51.3))); cx = lerp(520, 640, eio(k(t, 48.97, 51.3))); }
  if (t > 51.47) { z = lerp(1.18, .82, eio(k(t, 51.47, 52.6))); cx = lerp(640, 820, eio(k(t, 51.47, 52.6))); }
  cam(z, cx, 960);
  const R = room(-60, 440, 1760, 1000);
  windowF(80, 620, 150, 150, false, t);
  lamp(400, R.B.y - 40, 600, true);
  // partition with doorway (cross-section) at x=1000
  const wx = 990, ww = 50;
  woodRect(wx, R.B.y - 40, ww, 240, 4, COL.woodL); shadeOver(wx, R.B.y, ww, 200, 'h');
  woodRect(wx, R.ground - 30, ww, 40, 4, COL.woodL);
  // door leaf (edge-on, slightly ajar)
  ctx.save(); ctx.translate(wx + ww / 2, R.B.y + 200); ctx.rotate(t > 51.6 ? -.08 * eo(k(t, 51.6, 52.2)) : 0); woodRect(-12, 0, 24, R.ground - R.B.y - 230, 4, COL.wood, PI / 2); shadeOver(-12, 0, 24, 700, 'h'); sphere(-22, 380, 12, '#b88a4f', false); sphere(22, 380, 12, '#b88a4f', false); ctx.restore();
  // right room: bedroom & mom
  windowF(1380, 620, 170, 170, false, t);
  bed(1290, R.ground + 20, 360, { blanket: '#7f9cc0' });
  const peek = k(t, 51.6, 52.4);
  const momBlink = (t % 3.1) < .12 ? 'closed' : 'open';
  figure('mom', 1150, R.ground, { la: -.3, le: 2.1, ra: .3, re: -2.1, eyes: t > 54.5 ? 'happy' : momBlink, mouth: 'smile', look: -1, head: -.12 * peek, tilt: -.05 * peek, brows: t > 53.7 && t < 54.5 ? .9 : 0 });
  // left room: dad with tray, kid
  const lt = t - 46.66, arrive = k(t, 46.66, 48.9);
  const dx = lerp(300, 660, eo(arrive)), kx = lerp(500, 860, eo(arrive));
  const wk = arrive < 1 ? walk(lt, 7, .3) : {};
  const trayY = R.ground - 360;
  const dadP = figure('dad', dx, R.ground, Object.assign({}, wk, { lt: [dx - 70, trayY + 20], rt: [dx + 80, trayY + 20], lb: -1, rb: 1, look: 1, mouth: t > 48.9 ? 'flat' : 'grin', eyes: 'open', brows: t > 49 && t < 51.4 ? .5 : 0 }));
  ctx.save(); ctx.translate(dx, trayY + 10); woodRect(-130, -10, 260, 22, 6, COL.woodD); shadeOver(-130, -10, 260, 22); plate(0, -30, .45, t); ctx.restore();
  figure('kid', kx, R.ground, Object.assign({}, wk, { look: 1, mouth: 'grin', ra: t > 48.9 ? -2.5 : .2, re: t > 48.9 ? -.3 : 0, rt: t > 48.9 ? [wx - 20, R.B.y + 590] : undefined, rb: 1 }), 1.15);
  tag(560, 560, 'разбудить маму', t, 46.9, { rot: -.04, t1: 48.9 });
  tag(720, 560, 'одна деталь…', t, 49.5, { rot: .04, size: 54, t1: 51.5 });
  block(1350, 520, '10', t, 52.1, { size: 140, rot: -.06 });
  tag(1170, 640, 'мама всё видела', t, 52.4, { rot: -.05, size: 48 });
  if (t > 54.6) { const p = pop(t, 54.6); ctx.save(); ctx.translate(1150, 760 - (t - 54.6) * 30); ctx.scale(p, p); heart(0, 0, 48); ctx.restore(); }
}]);
// 16. best surprise
SC.push([55.94, 59.46, (t) => {
  cam(1 + .04 * k(t, 55.9, 59.5), 540, 980);
  const R = room(...BOX);
  windowF(170, 590, 170, 170, false, t);
  lamp(760, R.B.y - 40, 600, false);
  // morning light
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(250, 700, 0, 250, 700, 700); g.addColorStop(0, 'rgba(255,200,120,.25)'); g.addColorStop(1, 'rgba(255,200,120,0)'); ctx.fillStyle = g; ctx.fillRect(R.I.x, R.I.y, R.I.w, R.I.h); ctx.restore();
  const sway = Math.sin(t * 2.4) * .04;
  figure('dad', 330, R.ground, { tilt: .06 + sway, ra: -2.0, re: .0, rt: [520, 890], rb: 1, eyes: 'happy', mouth: 'grin', head: .1 });
  figure('mom', 600, R.ground, { tilt: -.04 + sway, la: 2.0, lt: [440, 900], lb: -1, rt: [760, 1100], rb: -1, eyes: 'happy', mouth: 'grin', head: -.08 });
  figure('kid', 790, R.ground, { la: -2.5, le: -.4, ra: 2.4, re: .4, eyes: 'happy', mouth: 'grin', bob: Math.abs(Math.sin(t * 5)) * 16 });
  ctx.save(); ctx.translate(540, R.ground + 40); plate(0, 0, .45, t); ctx.restore();
  for (let i = 0; i < 7; i++) { const tt = 56.1 + i * .35; if (t < tt) continue; const ph = t - tt; const R3 = rng(i + 3); ctx.save(); ctx.translate(250 + R3() * 600 + Math.sin(ph * 3 + i) * 20, 900 - ph * 150); const q = Math.min(1, pop(t, tt)); ctx.scale(q, q); heart(0, 0, 26 + R3() * 22, clamp(2.4 - ph)); ctx.restore(); }
  tag(540, 540, 'лучший сюрприз', t, 56.9, { size: 58, rot: -.03 });
}]);
// 17. PartnerZ end card
SC.push([59.46, 64.5, (t) => {
  cam(1, 540, 960);
  // chest of drawers
  const x = 260, y = 960, w = 560, h = 460;
  softShadow(540, y + h + 50, 340, 30, .25);
  woodRect(x - 20, y - 30, w + 40, 34, 6, COL.woodD); shadeOver(x - 20, y - 30, w + 40, 34);
  woodRect(x, y, w, h, 6, COL.woodL); shadeOver(x, y, w, h, 'v', .6);
  for (const lx of [x + 30, x + w - 50]) { woodRect(lx, y + h, 20, 46, 4, COL.woodD); }
  const op = Math.sin(k(t, 60.4, 62.4) * PI); // drawer opens and softly closes
  for (let j = 0; j < 3; j++) {
    const dh = (h - 40) / 3, dy = y + 20 + j * dh, out = j === 1 ? op * 46 : 0;
    ctx.save(); ctx.translate(0, out * .25); const sc = 1 + out / 900; ctx.translate(540, dy + dh / 2); ctx.scale(sc, sc); ctx.translate(-540, -(dy + dh / 2));
    if (out > 0) { ctx.fillStyle = 'rgba(70,40,15,.25)'; ctx.fillRect(x + 22, dy + dh - 14, w - 44, out * .4); }
    woodRect(x + 20, dy, w - 40, dh - 12, 8, COL.wood); shadeOver(x + 20, dy, w - 40, dh - 12);
    rr(540 - 50, dy + dh / 2 - 14, 100, 14, 7); ctx.fillStyle = COL.walnut; ctx.fill();
    ctx.restore();
  }
  // small family on top
  figure('dad', 380, y - 30, { eyes: 'happy', mouth: 'smile', la: -.15, ra: .4 }, .38);
  figure('mom', 520, y - 30, { eyes: 'happy', mouth: 'smile', la: -.4 }, .4);
  figure('kid', 640, y - 30, { eyes: 'happy', mouth: 'grin', ra: 2.5, re: .3, bob: Math.abs(Math.sin(t * 5)) * 18 }, .44);
  heart(700, y - 340 - Math.sin(t * 2) * 8, 24 * Math.min(1, pop(t, 60)));
  // logo
  const p = pop(t, 59.5, 2.4);
  ctx.save(); ctx.translate(540, 400); ctx.scale(p, p);
  ctx.font = '900 128px U'; ctx.letterSpacing = '-5px'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const full = 'PartnerZ', wPart = ctx.measureText('Partner').width, wAll = ctx.measureText(full).width;
  ctx.fillStyle = 'rgba(60,30,10,.18)'; ctx.fillText(full, 4, 8);
  ctx.textAlign = 'left'; ctx.fillStyle = '#3b2a20'; ctx.fillText('Partner', -wAll / 2, 0); ctx.fillStyle = COL.red; ctx.fillText('Z', -wAll / 2 + wPart, 0);
  ctx.letterSpacing = '0px'; ctx.restore();
  tag(540, 540, 'мебель для семейных историй', t, 60.6, { size: 44, rot: -.02 });
}]);

// =============== main render ===============
function render(t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#fdfcfa'; ctx.fillRect(0, 0, W, H);
  const s = SC.find(s => t >= s[0] && t < s[1]) || SC[SC.length - 1];
  ctx.save();
  // cut transition: quick settle
  const since = t - s[0];
  if (since < .35 && s[0] > 0) { const e = eo(since / .35); ctx.translate(540, 960); const z = lerp(1.07, 1, e); ctx.scale(z, z); ctx.translate(-540, -960); ctx.globalAlpha = clamp(since / .08); }
  CAMM = ctx.getTransform();
  s[2](t);
  ctx.restore();
  ctx.globalAlpha = 1; ctx.setTransform(1, 0, 0, 1, 0, 0);
  // white flash on cut
  if (since < .08 && s[0] > 0) { ctx.fillStyle = `rgba(253,252,250,${1 - since / .08})`; ctx.fillRect(0, 0, W, H); }
  subtitles(t);
}
window.render = render;
window.ready = (async () => { for (const f of ['900 50px U', '700 50px H']) { await document.fonts.load(f, 'АБВ abc 123'); } render(0); return true; })();
