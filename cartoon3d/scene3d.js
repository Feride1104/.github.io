// ================= PartnerZ — low-poly 3D cartoon =================
const W = 1080, H = 1920, PI = Math.PI;
const T = THREE;
const Q = new URLSearchParams(location.search), SMOOTH = Q.has('smooth'), CLEAN = Q.has('clean');
if (SMOOTH) {
  const Cy = T.CylinderGeometry, Co = T.ConeGeometry, Sp = T.SphereGeometry, To = T.TorusGeometry;
  T.CylinderGeometry = class extends Cy { constructor(a, b, h, n = 8, hs = 1, o, ts, tl) { super(a, b, h, Math.max(n, 32), hs, o, ts, tl); } };
  T.ConeGeometry = class extends Co { constructor(r, h, n = 8, hs, o, ts, tl) { super(r, h, Math.max(n, 20), hs, o, ts, tl); } };
  T.SphereGeometry = class extends Sp { constructor(r, w = 32, h = 16, ps, pl, ts, tl) { super(r, Math.max(w, 40), Math.max(h, 24), ps, pl, ts, tl); } };
  T.IcosahedronGeometry = class extends Sp { constructor(r = 1) { super(r, 40, 28); } };
  T.TorusGeometry = class extends To { constructor(r, t, rs = 8, ts = 12, a) { super(r, t, Math.max(rs, 12), Math.max(ts, 28), a); } };
}
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
const V3 = (x, y, z) => new T.Vector3(x, y, z);
const lv = (a, b, t) => V3(lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t));

// ---------- renderer ----------
const renderer = new T.WebGLRenderer({ canvas: document.getElementById('gl'), antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
renderer.outputColorSpace = T.SRGBColorSpace;
const scene = new T.Scene();
const camera = new T.PerspectiveCamera(34, W / H, .05, 200);
const ov = document.getElementById('ov'), g2 = ov.getContext('2d');

// ---------- helpers ----------
const mats = {};
function mat(c, o = {}) { const key = c + JSON.stringify(o); return mats[key] || (mats[key] = new T.MeshStandardMaterial(Object.assign({ color: c, flatShading: !SMOOTH, roughness: SMOOTH ? .7 : .85, metalness: 0 }, o))); }
function shade(hex, a) { const c = new T.Color(hex); const t = a > 0 ? new T.Color('#ffffff') : new T.Color('#000000'); c.lerp(t, Math.abs(a)); return '#' + c.getHexString(); }
function jitter(geo, amt, seed = 1) {
  if (SMOOTH) return geo;
  const p = geo.attributes.position, R = {};
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), key = `${x.toFixed(3)},${y.toFixed(3)},${z.toFixed(3)}`;
    if (!R[key]) { const r = rng(hash(key) + seed); R[key] = [(r() - .5) * amt, (r() - .5) * amt, (r() - .5) * amt]; }
    p.setXYZ(i, x + R[key][0], y + R[key][1], z + R[key][2]);
  }
  geo.computeVertexNormals(); return geo;
}
function add(parent, geo, m, x = 0, y = 0, z = 0, shadow = true) {
  const me = new T.Mesh(geo, typeof m === 'string' ? mat(m) : m); me.position.set(x, y, z);
  me.castShadow = shadow; me.receiveShadow = true; parent.add(me); return me;
}
const BOX = (w, h, d) => new T.BoxGeometry(w, h, d);
const CYL = (a, b, h, n = 8) => new T.CylinderGeometry(a, b, h, n);
const ICO = (r, d = 1) => new T.IcosahedronGeometry(r, d);
function grp(parent, x = 0, y = 0, z = 0) { const g = new T.Group(); g.position.set(x, y, z); if (parent) parent.add(g); return g; }
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; return t; }

// ---------- textures ----------
const cityTex = canvasTex(1024, 768, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#141a3a'); gr.addColorStop(.55, '#3b3266'); gr.addColorStop(.85, '#a0607a'); gr.addColorStop(1, '#e09a7a');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  const R = rng(4); g.fillStyle = '#fff'; for (let i = 0; i < 60; i++) { g.globalAlpha = .3 + R() * .7; g.fillRect(R() * w, R() * h * .4, 2, 2); } g.globalAlpha = 1;
  for (let layer = 0; layer < 2; layer++) {
    let x = -20;
    while (x < w) {
      const bw = 70 + R() * 120, bh = (layer ? 260 : 160) + R() * (layer ? 300 : 200);
      g.fillStyle = layer ? '#141832' : '#2a2d55'; g.fillRect(x, h - bh, bw, bh);
      for (let yy = h - bh + 18; yy < h - 10; yy += 26) for (let xx = x + 10; xx < x + bw - 14; xx += 22) if (R() < (layer ? .42 : .25)) { g.fillStyle = R() < .8 ? '#ffcf6b' : '#ffe9b0'; g.fillRect(xx, yy, 11, 14); }
      x += bw + 6;
    }
  }
});
function clockTex(text) {
  return canvasTex(256, 128, (g, w, h) => { g.fillStyle = '#120d0b'; g.fillRect(0, 0, w, h); g.font = '900 86px U'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = '#ff5a3c'; g.shadowBlur = 18; g.fillStyle = '#ff6b4a'; g.fillText(text, w / 2, h / 2 + 4); });
}
const CLOCKS = [];
const woodTone = ['#b88458', '#c39066', '#a9774d', '#bf8a5c', '#b07e52'];

// ---------- set pieces ----------
function planks(parent, w, d, x0 = 0, z0 = 0) {
  const n = Math.ceil(w / .32), R = rng(11);
  for (let i = 0; i < n; i++) {
    let z = -d / 2;
    while (z < d / 2) { const L = Math.min(.8 + R() * 1.4, d / 2 - z); add(parent, BOX(.31, .06, L - .01), woodTone[Math.floor(R() * woodTone.length)], x0 - w / 2 + .16 + i * .32, -.03, z0 + z + L / 2, false); z += L; }
  }
}
function wall(parent, w, h, x, y, z, ry, col = '#7c8696') { const m = add(parent, BOX(w, h, .12), col, x, y, z); m.rotation.y = ry; return m; }
function windowWith(parent, x, y, z, w, h, curtain = '#d98a2b') {
  const g = grp(parent, x, y, z);
  const back = new T.Mesh(new T.PlaneGeometry(w * 1.6, h * 1.4), new T.MeshBasicMaterial({ map: cityTex, toneMapped: false })); back.position.set(0, 0, -.35); g.add(back);
  const fr = '#e9e4da';
  add(g, BOX(w + .1, .08, .14), fr, 0, h / 2, 0); add(g, BOX(w + .1, .08, .14), fr, 0, -h / 2, 0);
  add(g, BOX(.08, h, .14), fr, -w / 2, 0, 0); add(g, BOX(.08, h, .14), fr, w / 2, 0, 0);
  add(g, BOX(.05, h, .1), fr, 0, 0, 0); add(g, BOX(w, .05, .1), fr, 0, h * .12, 0);
  add(g, BOX(w + .3, .06, .3), fr, 0, -h / 2 - .04, .08);
  // curtains: folded panels
  for (const s of [-1, 1]) {
    const cg = grp(g, s * (w / 2 + .12), .05, .14);
    for (let i = 0; i < 5; i++) { const m = add(cg, BOX(.11, h + .45, .05), i % 2 ? curtain : shade(curtain, -.12), (i - 2) * .095, 0, (i % 2) * .05); m.rotation.y = (i % 2 ? .5 : -.5); }
  }
  add(g, CYL(.025, .025, w + 1.0, 6), '#4a3a2c', 0, h / 2 + .28, .16).rotation.z = PI / 2;
  return g;
}
function plant(parent, x, z, s = 1) {
  const g = grp(parent, x, 0, z); g.scale.setScalar(s);
  add(g, jitter(CYL(.2, .15, .38, 7), .02), '#d9d2c4', 0, .19, 0);
  const R = rng(5);
  for (let i = 0; i < 9; i++) { const l = add(g, jitter(new T.ConeGeometry(.07, .7 + R() * .4, 4), .02), i % 2 ? '#3f7a4a' : '#2f6440', 0, .7, 0); l.rotation.set((R() - .5) * 1.2, R() * 6, (R() - .5) * 1.2); l.position.set((R() - .5) * .2, .55 + R() * .3, (R() - .5) * .2); }
  return g;
}
function rug(parent, x, z, r) { const cs = ['#d8c8b0', '#b8826a', '#efe6d6', '#8c6b5a', '#efe6d6']; cs.forEach((c, i) => add(parent, CYL(r * (1 - i * .18), r * (1 - i * .18), .012 + i * .002, 24), c, x, .006 + i * .002, z, false)); }
function lampFloor(parent, x, z, on) {
  const g = grp(parent, x, 0, z);
  add(g, CYL(.18, .2, .04, 10), '#3a3330', 0, .02, 0); add(g, CYL(.02, .02, 1.5, 6), '#3a3330', 0, .77, 0);
  add(g, CYL(.2, .2, .3, 24), BRASS, 0, 1.55, 0).material = BRASS; const shadeM = add(g, CYL(.17, .17, .02, 24), mat('#fff3d6', { emissive: '#ffcf8a', emissiveIntensity: on ? 1.2 : 0 }), 0, 1.395, 0);
  const L = new T.PointLight('#ffb36b', on ? 6 : 0, 7, 1.6); L.position.set(0, 1.45, 0); g.add(L);
  g.userData = { L, shadeM }; return g;
}
function digitalClock(parent, x, y, z, text) {
  const g = grp(parent, x, y, z);
  add(g, BOX(.36, .2, .12), '#2b2522', 0, 0, 0);
  const sc = new T.Mesh(new T.PlaneGeometry(.31, .155), new T.MeshBasicMaterial({ map: clockTex(text), toneMapped: false })); sc.position.z = .061; g.add(sc); CLOCKS.push([sc.material, text]);
  const gl = new T.PointLight('#ff6040', .5, 1.2, 2); gl.position.set(0, 0, .2); g.add(gl);
  return g;
}
function heartGeo(s) {
  const sh = new T.Shape(); sh.moveTo(0, -s * .9); sh.bezierCurveTo(-s * 1.4, -s * .1, -s * .8, s * 1.1, 0, s * .35); sh.bezierCurveTo(s * .8, s * 1.1, s * 1.4, -s * .1, 0, -s * .9);
  return new T.ExtrudeGeometry(sh, { depth: s * .4, bevelEnabled: true, bevelThickness: s * .12, bevelSize: s * .1, bevelSegments: 1, curveSegments: 6 });
}

// ---------- characters ----------
const PD = { x: 0, y: 0, z: 0, yaw: 0, rx: 0, rz: 0, bob: 0, crouch: 0, lean: 0, twist: 0, tilt: 0, hp: 0, hy: 0, ht: 0, armL: [.12, 0, .1], armR: [.12, 0, .1], legL: [0, 0], legR: [0, 0], eyes: 'open', mouth: 'smile', brows: 0, look: [0, 0], blush: true, flour: false };
const SPEC = {
  dad: { skin: '#f0c29c', hair: '#4a2f1f', top: '#3f6f8f', pants: '#3a3d48', shoe: '#ece7de', legL: .8, torso: .58, headR: .25, w: .27, armR: .072 },
  mom: { skin: '#f0c4a2', hair: '#a8482a', top: '#c9a04a', pants: '#3a4a6a', shoe: '#efe8de', legL: .74, torso: .52, headR: .245, w: .225, armR: .064 },
  kid: { skin: '#f4caa6', hair: '#d98b3f', top: '#e2533c', pants: '#5b81aa', shoe: '#f2efe8', legL: .36, torso: .32, headR: .215, w: .17, armR: .052 },
};
function onHead(c, mesh, u, v, lift = 1.0) {
  const r = c.P.headR, zz = Math.sqrt(Math.max(0, 1 - u * u - v * v));
  mesh.position.set(u * r, v * r, zz * r * .92 * lift); mesh.rotation.set(-Math.asin(v) * .9, Math.asin(u) * .9, 0); c.head.add(mesh); return mesh;
}
function makeChar(kind) {
  const P = SPEC[kind], c = { kind, P };
  c.root = grp(null);
  c.hips = grp(c.root, 0, P.legL, 0);
  const lr = P.armR * 1.3, L = P.legL / 2;
  c.legs = [-1, 1].map(s => {
    const hip = grp(c.hips, s * P.w * .45, 0, 0);
    add(hip, jitter(CYL(lr * 1.08, lr, L + .03, 6), .01, s), P.pants, 0, -L / 2, 0);
    const knee = grp(hip, 0, -L, 0);
    add(knee, jitter(CYL(lr, lr * .92, L, 6), .01, s + 3), P.pants, 0, -L / 2, 0);
    add(knee, jitter(BOX(lr * 2.4, lr * 1.15, lr * 3.6), .01, s + 5), P.shoe, 0, -L + lr * .2, lr * .7);
    return { hip, knee };
  });
  c.torso = grp(c.hips, 0, 0, 0);
  const body = add(c.torso, jitter(new T.CylinderGeometry(P.w * .88, P.w * 1.05, P.torso, 7, 2), .02, 3), P.top, 0, P.torso / 2, 0); body.scale.z = .78;
  add(c.torso, CYL(P.w * 1.08, P.w * 1.08, P.torso * .12, 7), shade(P.top, -.12), 0, P.torso * .06, 0).scale.z = .8;
  add(c.torso, CYL(P.w * .45, P.w * .55, P.torso * .08, 7), shade(P.top, -.12), 0, P.torso * .98, 0);
  if (kind === 'kid') { // hoodie strings + pocket
    add(c.torso, BOX(P.w * 1.1, P.torso * .3, .04), shade(P.top, -.08), 0, P.torso * .32, P.w * .8);
  }
  
  c.neck = grp(c.torso, 0, P.torso, 0);
  add(c.neck, CYL(P.armR, P.armR * 1.1, .07, 6), P.skin, 0, .02, 0);
  c.head = grp(c.neck, 0, P.headR * .95, 0);
  const hm = add(c.head, jitter(ICO(P.headR, 1), P.headR * .13, kind.length), P.skin); hm.scale.set(1, .97, .92);
  // ears
  for (const s of [-1, 1]) add(c.head, ICO(P.headR * .16, 0), P.skin, s * P.headR * .95, -P.headR * .05, 0);
  buildHair(c); buildFace(c);
  c.arms = [-1, 1].map(s => {
    const sh = grp(c.torso, s * P.w * .95, P.torso * .86, 0);
    const ua = P.torso * .5, fa = P.torso * .48, r = P.armR;
    add(sh, ICO(r * 1.15, 0), P.top, 0, 0, 0);
    add(sh, jitter(CYL(r * 1.12, r, ua, 6), .01, s + 9), P.top, 0, -ua / 2, 0);
    const el = grp(sh, 0, -ua, 0);
    add(el, jitter(CYL(r, r * .92, fa, 6), .01, s + 11), P.top, 0, -fa / 2, 0);
    const hand = add(el, jitter(ICO(r * 1.05, 0), .01, s + 13), P.skin, 0, -fa - r * .55, 0);
    return { sh, el, hand };
  });
  // flour spots
  c.flour = [];
  for (const [u, v] of [[-.4, .25], [.35, -.2], [.1, .55]]) { const f = onHead(c, new T.Mesh(new T.CircleGeometry(P.headR * .14, 6), mat('#ffffff', { roughness: 1 })), u, v, 1.06); c.flour.push(f); }
  const tf = add(c.torso, BOX(P.w * .6, P.w * .4, .02), '#ffffff', -P.w * .3, P.torso * .5, P.w * .82, false); c.flour.push(tf);
  c.all = []; c.root.traverse(o => { if (o.isMesh) c.all.push(o); });
  return c;
}
function buildHair(c) {
  const P = c.P, r = P.headR, hc = P.hair;
  const cap = add(c.head, jitter(new T.SphereGeometry(r * 1.08, 9, 6, 0, PI * 2, 0, PI * .52), r * .1, 21), hc);
  cap.rotation.x = -.38; cap.position.set(0, r * .06, -r * .06);
  if (c.kind === 'dad') {
    for (let i = -2; i <= 2; i++) { const f = add(c.head, jitter(new T.ConeGeometry(r * .22, r * .45, 4), r * .05, i), hc, i * r * .22, r * .62, r * .55); f.rotation.set(1.9, 0, i * .25); }
  } else if (c.kind === 'mom') {
    const back = add(c.head, jitter(CYL(r * .95, r * 1.08, r * 1.5, 8), r * .1, 4), hc, 0, -r * .45, -r * .3); back.scale.z = .75;
    for (const s of [-1, 1]) { const lk = add(c.head, jitter(CYL(r * .25, r * .32, r * 1.4, 5), r * .06, s), hc, s * r * .85, -r * .3, r * .25); lk.rotation.z = s * .12; }
    for (let i = -2; i <= 2; i++) { const f = add(c.head, jitter(new T.ConeGeometry(r * .24, r * .5, 4), r * .05, i + 9), hc, i * r * .2, r * .6, r * .58); f.rotation.set(1.95, 0, i * .35); }
    add(c.head, jitter(ICO(r * .42, 1), r * .06, 2), hc, 0, r * .95, -r * .55);
  } else {
    for (let i = 0; i < 7; i++) { const a = i / 7 * PI * 2; const s = add(c.head, jitter(new T.ConeGeometry(r * .2, r * .55, 4), r * .05, i), hc, Math.cos(a) * r * .45, r * .95, Math.sin(a) * r * .4 - r * .05); s.rotation.set(Math.sin(a) * .7, 0, -Math.cos(a) * .7); }
    for (let i = -2; i <= 2; i++) { const f = add(c.head, jitter(new T.ConeGeometry(r * .22, r * .5, 4), r * .05, i + 3), hc, i * r * .2, r * .62, r * .58); f.rotation.set(1.95, 0, i * .3); }
  }
}
function buildFace(c) {
  const r = c.P.headR, F = c.face = { eyes: [], hl: [], closed: [], happy: [], brows: [], mouth: {} };
  const eyeM = new T.MeshStandardMaterial({ color: '#120c0c', roughness: .15, metalness: .1 });
  const white = new T.MeshBasicMaterial({ color: '#ffffff' });
  const dark = mat('#2a1a14', { flatShading: false });
  [-1, 1].forEach((s, i) => {
    const eg = new T.Group(); onHead(c, eg, s * .36, .02, 1.0);
    const e = new T.Mesh(new T.SphereGeometry(r * .15, 14, 10), eyeM); e.scale.set(.82, 1.12, .5); eg.add(e);
    const hl = new T.Mesh(new T.SphereGeometry(r * .045, 8, 6), white); hl.position.set(r * .04, r * .06, r * .06); eg.add(hl);
    const hl2 = new T.Mesh(new T.SphereGeometry(r * .022, 6, 4), white); hl2.position.set(-r * .03, -r * .05, r * .06); eg.add(hl2);
    F.eyes.push(eg);
    const cl = new T.Mesh(new T.TorusGeometry(r * .11, r * .022, 4, 10, PI), dark); onHead(c, cl, s * .36, -.02, 1.02); cl.rotation.z = PI; F.closed.push(cl);
    const hp = new T.Mesh(new T.TorusGeometry(r * .11, r * .022, 4, 10, PI), dark); onHead(c, hp, s * .36, -.02, 1.02); F.happy.push(hp);
    const b = new T.Mesh(BOX(r * .28, r * .06, r * .05), mat(shade(c.P.hair, -.2))); onHead(c, b, s * .36, .3, 1.02); F.brows.push(b);
    const bl = new T.Mesh(new T.CircleGeometry(r * .11, 8), new T.MeshBasicMaterial({ color: '#f08a8a', transparent: true, opacity: .55 })); onHead(c, bl, s * .55, -.2, 1.03);
  });
  if (c.kind === 'kid') { for (const [u, v] of [[-.5, -.08], [-.42, -.14], [.5, -.08], [.43, -.15]]) onHead(c, new T.Mesh(new T.CircleGeometry(r * .022, 5), new T.MeshBasicMaterial({ color: '#b5643c' })), u, v, 1.035); }
  // nose
  onHead(c, new T.Mesh(ICO(r * .07, 0), mat(shade(c.P.skin, -.05))), 0, -.12, 1.02);
  const mouthM = mat('#5a1f1f', { flatShading: false });
  const sm = new T.Mesh(new T.TorusGeometry(r * .1, r * .02, 4, 10, PI), dark); sm.rotation.z = PI; F.mouth.smile = onHead(c, grpWrap(sm), 0, -.36, 1.02);
  const gr = new T.Mesh(new T.CircleGeometry(r * .14, 10, PI, PI), mouthM); F.mouth.grin = onHead(c, grpWrap(gr), 0, -.3, 1.03);
  const o = new T.Mesh(new T.SphereGeometry(r * .07, 10, 8), mouthM); o.scale.set(1, 1.3, .4); F.mouth.o = onHead(c, grpWrap(o), 0, -.38, 1.0);
  const O = new T.Mesh(new T.SphereGeometry(r * .11, 10, 8), mouthM); O.scale.set(.9, 1.3, .4); F.mouth.O = onHead(c, grpWrap(O), 0, -.4, 1.0);
  const fl = new T.Mesh(BOX(r * .18, r * .03, r * .03), dark); F.mouth.flat = onHead(c, grpWrap(fl), 0, -.38, 1.02);
  const sh = new T.Mesh(new T.SphereGeometry(r * .045, 8, 6), mouthM); sh.scale.z = .4; F.mouth.sh = onHead(c, grpWrap(sh), 0, -.38, 1.0);
}
function grpWrap(m) { const g = new T.Group(); g.add(m); return g; }
function setFace(c, p) {
  const F = c.face, eyes = Array.isArray(p.eyes) ? p.eyes : [p.eyes, p.eyes];
  [0, 1].forEach(i => {
    const e = eyes[i];
    F.eyes[i].visible = e === 'open' || e === 'wide';
    F.eyes[i].scale.setScalar(e === 'wide' ? 1.35 : 1);
    F.eyes[i].children[0].position.set(p.look[0] * c.P.headR * .05, p.look[1] * c.P.headR * .05, 0);
    F.closed[i].visible = e === 'closed'; F.happy[i].visible = e === 'happy';
    const s = i ? 1 : -1; F.brows[i].rotation.z = s * -p.brows * .35; F.brows[i].position.y = c.P.headR * (.3 + Math.abs(p.brows) * .05 * (p.brows > 0 ? 1 : -.5));
  });
  for (const m in F.mouth) F.mouth[m].visible = m === p.mouth;
  c.flour.forEach(f => f.visible = !!p.flour);
}
function pose(c, p) {
  p = Object.assign({}, PD, p);
  c.root.visible = true;
  c.root.position.set(p.x, p.y, p.z); c.root.rotation.set(p.rx, p.yaw, p.rz);
  c.hips.position.y = c.P.legL - p.crouch + p.bob;
  [p.legL, p.legR].forEach((L, i) => { c.legs[i].hip.rotation.set(-L[0], 0, 0); c.legs[i].knee.rotation.set(L[1], 0, 0); });
  c.torso.rotation.set(p.lean, p.twist, p.tilt);
  c.head.rotation.set(p.hp, p.hy, p.ht);
  [p.armL, p.armR].forEach((A, i) => { const s = i ? 1 : -1; c.arms[i].sh.rotation.set(-A[1], A[3] || 0, s * A[0]); c.arms[i].el.rotation.set(-A[2], 0, 0); });
  setFace(c, p);
}
function walkP(t, sp = 7, amp = .45) { const ph = t * sp; return { legL: [Math.sin(ph) * amp, Math.max(0, -Math.cos(ph)) * amp * 1.2], legR: [-Math.sin(ph) * amp, Math.max(0, Math.cos(ph)) * amp * 1.2], bob: Math.abs(Math.cos(ph)) * .03, armL: [.15, -Math.sin(ph) * amp * .8, .3], armR: [.15, Math.sin(ph) * amp * .8, .3] }; }

const dad = makeChar('dad'), mom = makeChar('mom'), kid = makeChar('kid'), momBed = makeChar('mom');
[dad, mom, kid, momBed].forEach(c => scene.add(c.root));

// ================= SETS =================
const SETS = {};
function setLights(g, o) {
  const hemi = new T.HemisphereLight(o.sky || '#8a93c0', o.ground || '#4a3428', o.hemi ?? .6); g.add(hemi);
  const dl = new T.DirectionalLight(o.dcol || '#ffd9b0', o.dint ?? 1.6); dl.position.set(...(o.dpos || [3, 6, 4])); dl.castShadow = true;
  dl.shadow.mapSize.set(2048, 2048); const sc = dl.shadow.camera; sc.left = -5; sc.right = 5; sc.top = 5; sc.bottom = -5; sc.near = .5; sc.far = 20; dl.shadow.bias = -.0008; dl.shadow.normalBias = .02;
  dl.target.position.set(...(o.dtar || [0, 0, 0])); g.add(dl); g.add(dl.target);
  return { hemi, dl };
}
// --- premium materials & helpers
const BRASS = new T.MeshStandardMaterial({ color: '#c9a24a', metalness: .9, roughness: .28 });
const CHROME = new T.MeshStandardMaterial({ color: '#d9dde0', metalness: .9, roughness: .2 });
const marbleTex = canvasTex(1024, 512, (g, w, h) => {
  g.fillStyle = '#f3f0eb'; g.fillRect(0, 0, w, h); const R = rng(77);
  for (let i = 0; i < 26; i++) {
    g.strokeStyle = `rgba(${120 + R() * 40},${120 + R() * 40},${125 + R() * 40},${.12 + R() * .3})`; g.lineWidth = .6 + R() * 2.6; g.filter = `blur(${R() * 1.5}px)`;
    g.beginPath(); let x = R() * w, y = R() * h; g.moveTo(x, y);
    for (let j = 0; j < 6; j++) { const nx = x + (R() - .3) * 260, ny = y + (R() - .5) * 140; g.quadraticCurveTo((x + nx) / 2 + (R() - .5) * 80, (y + ny) / 2 + (R() - .5) * 80, nx, ny); x = nx; y = ny; }
    g.stroke();
  }
  g.filter = 'none';
});
marbleTex.wrapS = marbleTex.wrapT = T.RepeatWrapping;
const MARBLE = new T.MeshStandardMaterial({ map: marbleTex, roughness: .18, metalness: 0 });
const chevronTex = canvasTex(2048, 2048, (g, w, h) => {
  const ppm = w / 7, cw = .42 * ppm, sp = .12 * Math.SQRT2 * ppm, R = rng(42);
  const pal = ['#c8a27a', '#bf976e', '#d1ad86', '#b98f66', '#c59c73', '#ccA57d'];
  for (let c = 0; c * cw < w; c++) {
    const x0 = c * cw, x1 = x0 + cw, dir = c % 2 ? 1 : -1;
    g.save(); g.beginPath(); g.rect(x0, 0, cw, h); g.clip();
    for (let y = -cw - sp * 2; y < h + cw + sp; y += sp) {
      g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y + dir * cw); g.lineTo(x1, y + dir * cw + sp); g.lineTo(x0, y + sp); g.closePath();
      g.fillStyle = pal[Math.floor(R() * pal.length)]; g.fill();
      g.strokeStyle = 'rgba(90,55,25,.35)'; g.lineWidth = 1.5; g.stroke();
      g.strokeStyle = 'rgba(110,70,35,.12)'; g.lineWidth = 1;
      for (let k = 0; k < 3; k++) { const o = sp * (.25 + k * .25) + (R() - .5) * 4; g.beginPath(); g.moveTo(x0, y + o); g.lineTo(x1, y + dir * cw + o); g.stroke(); }
    }
    g.restore();
  }
});
function floorLux(parent, w = 7, d = 7) {
  const m = new T.Mesh(new T.PlaneGeometry(w, d), new T.MeshStandardMaterial({ map: chevronTex, roughness: .38, metalness: 0 }));
  m.rotation.x = -PI / 2; m.receiveShadow = true; parent.add(m); return m;
}
function moldings(parent, x0, x1, z, y0, y1, col, n) { // wall panel frames on a back wall
  const w = (x1 - x0) / n, th = .025;
  for (let i = 0; i < n; i++) {
    const cx = x0 + w * (i + .5), fw = w - .18, fh = y1 - y0;
    add(parent, BOX(fw, th, th), col, cx, y0, z, false); add(parent, BOX(fw, th, th), col, cx, y1, z, false);
    add(parent, BOX(th, fh, th), col, cx - fw / 2, (y0 + y1) / 2, z, false); add(parent, BOX(th, fh, th), col, cx + fw / 2, (y0 + y1) / 2, z, false);
  }
}
function shaker(parent, w, h, x, y, z, col, handle = 'v') { // cabinet front with inset panel + brass handle
  add(parent, BOX(w, h, .025), col, x, y, z);
  add(parent, BOX(w - .1, h - .1, .012), shade(col, -.06), x, y, z + .015, false);
  add(parent, BOX(w - .14, h - .14, .012), col, x, y, z + .02, false);
  const hd = handle === 'v' ? BOX(.018, Math.min(.22, h * .5), .018) : BOX(Math.min(.24, w * .45), .018, .018);
  const m = new T.Mesh(hd, BRASS); m.castShadow = true; m.position.set(x + (handle === 'v' ? w * .36 : 0), y + (handle === 'h' ? h * .22 : 0), z + .045); parent.add(m);
}
function pendant(parent, x, y, z, drop = .8, glow = 1) {
  const g = grp(parent, x, y, z);
  add(g, CYL(.006, .006, drop, 6), '#222', 0, -drop / 2, 0, false);
  const dome = new T.Mesh(new T.SphereGeometry(.17, 24, 12, 0, PI * 2, 0, PI / 2), BRASS); dome.position.y = -drop; dome.material.side = T.DoubleSide; g.add(dome);
  add(g, new T.SphereGeometry(.06, 16, 10), mat('#fff3d6', { emissive: '#ffd79a', emissiveIntensity: 2 * glow }), 0, -drop - .04, 0, false);
  const L = new T.PointLight('#ffc98a', 3.5 * glow, 4, 1.6); L.position.y = -drop - .1; g.add(L);
  return g;
}
function stool(parent, x, z) {
  const g = grp(parent, x, 0, z);
  const seat = add(g, CYL(.2, .19, .07, 20), '#6b4a33', 0, .72, 0); seat.material = mat('#6b4a33');
  add(g, CYL(.2, .2, .04, 20), '#3e2a1e', 0, .78, 0);
  for (let i = 0; i < 4; i++) { const a = i / 4 * PI * 2 + PI / 4; const l = new T.Mesh(CYL(.012, .012, .74, 8), BRASS); l.position.set(Math.cos(a) * .13, .36, Math.sin(a) * .13); l.rotation.set(Math.sin(a) * .12, 0, -Math.cos(a) * .12); l.castShadow = true; g.add(l); }
  const ring = new T.Mesh(new T.TorusGeometry(.14, .008, 6, 24), BRASS); ring.rotation.x = PI / 2; ring.position.y = .3; g.add(ring);
}
function fruitBowl(parent, x, y, z) {
  const g = grp(parent, x, y, z);
  add(g, new T.SphereGeometry(.17, 24, 10, 0, PI * 2, PI / 2, PI / 2), '#e9e2d6', 0, .12, 0).rotation.x = PI;
  [['#f08a24', .06, -.05, .02], ['#f08a24', .055, .06, -.03], ['#8bc34a', .055, .0, .07], ['#e8c547', .05, -.02, -.07], ['#f08a24', .055, .03, .03]].forEach(([c, r, ox, oz], i) => add(g, new T.SphereGeometry(r, 16, 12), c, ox, .1 + (i > 2 ? .05 : 0), oz));
}
function vaseFlowers(parent, x, y, z, s = 1) {
  const g = grp(parent, x, y, z); g.scale.setScalar(s);
  add(g, CYL(.06, .045, .26, 20), mat('#e8e3da', { roughness: .3 }), 0, .13, 0);
  const R = rng(9);
  for (let i = 0; i < 7; i++) { const st = add(g, CYL(.004, .004, .45, 4), '#5f7a55', 0, .45, 0, false); st.rotation.set((R() - .5) * .6, 0, (R() - .5) * .6); for (let j = 0; j < 4; j++) { const lf = add(g, new T.SphereGeometry(.025, 10, 6), '#8aa38a', Math.sin(st.rotation.z) * -.2 * (j / 4 + .3) + (R() - .5) * .04, .3 + j * .08, Math.sin(st.rotation.x) * .2 * (j / 4 + .3)); lf.scale.set(1, .3, 1.4); } }
}
// --- living room (origin 0,0,0)
(() => {
  const g = grp(scene); SETS.living = g;
  floorLux(g, 7, 7);
  wall(g, 7, 3.4, 0, 1.7, -2.6, 0, '#56657a'); wall(g, 6, 3.4, -3.3, 1.7, 0, PI / 2, '#4f5d70');
  add(g, BOX(7, .14, .04), '#e9e4da', 0, .07, -2.52, false); add(g, BOX(7, .1, .08), '#e9e4da', 0, 3.33, -2.5, false);
  moldings(g, .3, 3.4, -2.53, .3, 1.0, '#6a7a90', 2); moldings(g, .3, 3.4, -2.53, 1.25, 3.0, '#6a7a90', 2);
  windowWith(g, -1.0, 1.65, -2.52, 1.9, 1.7, '#a8553a');
  for (const [x, c1, c2] of [[1.15, '#d9a441', '#e9dfcf'], [2.05, '#c2563a', '#2f4a40']]) { const f = grp(g, x, 1.85, -2.5); add(f, BOX(.7, .9, .04), BRASS, 0, 0, 0); add(f, BOX(.62, .82, .02), '#f2ece2', 0, 0, .025, false); add(f, new T.CircleGeometry(.18, 32), c1, -.06, .12, .04, false); add(f, BOX(.4, .2, .01), c2, .05, -.2, .04, false); }
  // sofa
  const s = grp(g, 1.6, 0, -1.9);
  const VEL = mat('#2f5d50', { roughness: .55 });
  add(s, BOX(2.0, .36, .9), VEL, 0, .3, 0); add(s, BOX(2.0, .6, .25), VEL, 0, .72, -.33);
  for (const x of [-1.05, 1.05]) add(s, CYL(.13, .13, .9, 24), VEL, x, .5, 0).rotation.x = PI / 2;
  for (const x of [-.5, .5]) add(s, BOX(.88, .16, .72), mat('#356a5c', { roughness: .55 }), x, .55, .05);
  for (const x of [-.85, .85]) for (const z of [-.35, .35]) { const l = new T.Mesh(CYL(.025, .015, .14, 12), BRASS); l.position.set(x, .07, z); s.add(l); }
  add(s, BOX(.42, .38, .14), '#d9a441', -.6, .8, -.12).rotation.z = .2; add(s, BOX(.38, .34, .14), '#b5653f', .65, .78, -.12).rotation.z = -.15;
  const tbl = grp(g, 1.7, 0, -.75); const tt = new T.Mesh(CYL(.42, .42, .05, 40), MARBLE); tt.position.y = .42; tt.castShadow = tt.receiveShadow = true; tbl.add(tt); const tb = new T.Mesh(CYL(.08, .2, .4, 24), BRASS); tb.position.y = .2; tbl.add(tb);
  vaseFlowers(tbl, .1, .45, 0, .8); add(tbl, BOX(.25, .04, .18), '#c2563a', -.18, .47, .05); add(tbl, BOX(.23, .03, .17), '#e9dfcf', -.18, .5, .05);
  rug(g, .3, -.4, 1.6);
  plant(g, -2.7, -2.1, 1.1);
  SETS.livingLamp = lampFloor(g, 2.9, -2.1, true);
  // sideboard with clock
  const sb = grp(g, -2.6, 0, -.6); sb.rotation.y = PI / 2;
  add(sb, BOX(1.4, .62, .45), '#6b4a33', 0, .41, 0); for (const x of [-.35, .35]) shaker(sb, .64, .52, x, .41, .225, '#6b4a33', 'v'); for (const x of [-.6, .6]) { const l = new T.Mesh(CYL(.02, .015, .1, 12), BRASS); l.position.set(x, .05, 0); sb.add(l); }
  SETS.livingClock = digitalClock(sb, -.3, .8, 0, '03:17');
  add(sb, jitter(CYL(.08, .1, .25, 6), .01), '#c2563a', .4, .82, 0);
  SETS.livingL = setLights(g, { hemi: .9, dint: 1.4, dcol: '#ffd2a8', dpos: [3, 5, 5], dtar: [0, 0, -.5] });
  const moon = new T.DirectionalLight('#8fa0ff', .8); moon.position.set(-1.5, 4, -5); g.add(moon);
  const warm = new T.PointLight('#ffb070', 5, 9, 1.5); warm.position.set(1.5, 2.6, 1.5); g.add(warm); SETS.livingWarm = warm;
  const flash = new T.SpotLight('#fff1d0', 0, 8, .5, .5, 1.2); g.add(flash); g.add(flash.target); SETS.flash = flash;
})();
// --- bedroom (origin 30,0,0)
(() => {
  const g = grp(scene, 30, 0, 0); SETS.bed = g;
  floorLux(g, 7, 7);
  wall(g, 6, 3.4, 0, 1.7, -2.4, 0, '#7d8aa0'); wall(g, 6, 3.4, -2.8, 1.7, 0, PI / 2, '#74819a');
  moldings(g, -.6, 2.8, -2.33, 1.5, 3.0, '#8e9bb0', 2); add(g, BOX(6, .14, .04), '#e9e4da', 0, .07, -2.33, false);
  for (const x of [-.65, 1.65]) { const sc = grp(g, 30 * 0 + x, 1.55, -2.3); const b = new T.Mesh(CYL(.03, .03, .12, 12), BRASS); b.rotation.x = PI / 2; sc.add(b); add(sc, new T.SphereGeometry(.08, 16, 10), mat('#fff3d6', { emissive: '#ffd79a', emissiveIntensity: 1.2 }), 0, 0, .12, false); }
  windowWith(g, -1.5, 1.75, -2.32, 1.3, 1.4, '#6d7fb0');
  const b = grp(g, .5, 0, -1.25);
  add(b, BOX(1.95, .35, 2.2), mat('#8fa08c', { roughness: .6 }), 0, .2, 0);
  add(b, BOX(2.05, 1.35, .18), mat('#8fa08c', { roughness: .6 }), 0, .68, -1.12);
  for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) add(b, new T.SphereGeometry(.015, 8, 6), BRASS, -.85 + i * .34, .85 + j * .3, -1.02, false);
  add(b, jitter(BOX(1.8, .2, 2.1), .02), '#f2ede4', 0, .47, 0);
  add(b, jitter(BOX(.75, .18, .45), .05), '#ffffff', -.4, .63, -.78); add(b, jitter(BOX(.75, .18, .45), .05), '#ffffff', .45, .63, -.78);
  const blanket = add(b, jitter(new T.BoxGeometry(1.86, .34, 1.6, 4, 1, 4), .07, 3), '#d6c8b6', 0, .76, .28); SETS.blanket = blanket;
  add(b, BOX(1.98, .36, .45), '#b8826a', 0, .78, .85);
  // nightstand + clock + lamp
  const n = grp(g, 1.85, 0, -1.9);
  add(n, BOX(.55, .5, .45), '#6b4a33', 0, .3, 0); shaker(n, .5, .2, 0, .4, .225, '#6b4a33', 'h'); for (const x of [-.22, .22]) { const l = new T.Mesh(CYL(.015, .012, .06, 10), BRASS); l.position.set(x, .03, 0); n.add(l); }
  SETS.bedClock = digitalClock(n, -.05, .66, .05, '03:17');
  rug(g, .5, .8, 1.0);
  plant(g, -2.3, -1.9, .9);
  SETS.bedL = setLights(g, { hemi: 1.0, sky: '#8a96d8', dint: 1.3, dcol: '#b8c4ff', dpos: [2, 5, 4], dtar: [.5, 0, -1] });
  const nl = new T.PointLight('#ffb070', 2.5, 4, 1.5); nl.position.set(1.8, 1.0, -1.6); g.add(nl);
})();
// --- kitchen (origin 60,0,0)
(() => {
  const g = grp(scene, 60, 0, 0); SETS.kitchen = g;
  floorLux(g, 7, 7);
  const WALL = '#d9d0c4', CAB = '#2f4a40', CAB2 = '#e9e3d8';
  wall(g, 5.2, 3.4, -.9, 1.7, -2.4, 0, WALL); wall(g, .8, 3.4, 3.1, 1.7, -2.4, 0, WALL); wall(g, 1.0, 1.2, 2.2, 2.8, -2.4, 0, WALL); wall(g, 6, 3.4, -3.3, 1.7, 0, PI / 2, shade(WALL, -.05));
  // skirting & crown
  add(g, BOX(7, .12, .03), '#ece6dc', 0, .06, -2.33, false); add(g, BOX(7, .1, .06), '#ece6dc', 0, 3.33, -2.32, false);
  // marble backsplash
  const bs = new T.Mesh(new T.PlaneGeometry(3.7, .72), MARBLE); bs.position.set(-1.1, 1.3, -2.335); g.add(bs);
  windowWith(g, -1.6, 2.15, -2.33, 1.2, 1.0, '#eadfce');
  // base cabinets (deep green shaker, brass hardware)
  const cab = grp(g, 0, 0, -2.0); SETS.cab = cab;
  const cw = .6;
  add(cab, BOX(3.6, .1, .55), '#1f2a25', -1.1, .05, -.03);
  for (let i = 0; i < 6; i++) {
    const x = -2.9 + .3 + i * cw;
    add(cab, BOX(cw - .01, .8, .6), CAB, x, .5, 0);
    if (i === 2) continue;
    if (i === 4) { const ov = add(cab, BOX(cw - .06, .5, .02), mat('#141414', { roughness: .15, metalness: .4 }), x, .56, .31); const hb = new T.Mesh(BOX(.4, .02, .02), CHROME); hb.position.set(x, .87, .34); cab.add(hb); continue; }
    shaker(cab, cw - .04, .76, x, .5, .31, CAB, 'v');
  }
  const dx = -2.9 + .3 + 2 * cw; SETS.drawerX = dx;
  for (let j = 1; j < 3; j++) shaker(cab, cw - .04, .24, dx, .755 - j * .27, .31, CAB, 'h');
  const dr = grp(cab, dx, .755, 0); SETS.drawer = dr;
  shaker(dr, cw - .04, .24, 0, 0, .31, CAB, 'h');
  add(dr, BOX(cw - .12, .16, .02), '#c9a982', 0, -.02, -.27); add(dr, BOX(.02, .16, .58), '#c9a982', -(cw - .12) / 2, -.02, .02); add(dr, BOX(.02, .16, .58), '#c9a982', (cw - .12) / 2, -.02, .02); add(dr, BOX(cw - .12, .02, .58), '#b8966e', 0, -.1, .02);
  const pin = grp(dr, 0, -.02, .05); pin.rotation.y = PI / 2; SETS.pinInDrawer = pin;
  rollingPin(pin, .5);
  // marble countertop
  const ct = new T.Mesh(BOX(3.7, .06, .68), MARBLE); ct.position.set(-1.1, .93, -2.0); ct.castShadow = ct.receiveShadow = true; g.add(ct);
  // upper glass cabinets with warm interior light + LED strip
  for (let i = 0; i < 2; i++) {
    const x = .1 + i * .6;
    add(g, BOX(.58, .8, .35), CAB2, x, 2.35, -2.2);
    add(g, BOX(.5, .72, .01), mat('#ffe6c0', { emissive: '#ffcf8a', emissiveIntensity: .35 }), x, 2.35, -2.36 + .02, false);
    for (const yy of [2.12, 2.4]) { add(g, BOX(.5, .015, .3), mat('#ffffff', { transparent: true, opacity: .5 }), x, yy, -2.2, false); }
    [['#f2efe8', .1], ['#d8d2c6', .12], ['#f2efe8', .08]].forEach(([c, h], k) => add(g, CYL(.04, .04, h, 16), c, x - .15 + k * .15, (k % 2 ? 2.4 : 2.12) + h / 2 + .01, -2.22));
    add(g, BOX(.56, .78, .02), mat('#dfe9ea', { transparent: true, opacity: .25, roughness: .05 }), x, 2.35, -2.02, false);
    for (const [fw, fh, ox, oy] of [[.58, .05, 0, .375], [.58, .05, 0, -.375], [.05, .8, -.265, 0], [.05, .8, .265, 0]]) add(g, BOX(fw, fh, .03), CAB2, x + ox, 2.35 + oy, -2.02);
    const kn = new T.Mesh(new T.SphereGeometry(.018, 12, 8), BRASS); kn.position.set(x + (i ? -.22 : .22), 2.05, -1.99); g.add(kn);
  }
  add(g, BOX(1.2, .015, .02), mat('#fff3d6', { emissive: '#ffd59a', emissiveIntensity: 1.5 }), .4, 1.94, -2.05, false);
  // plaster range hood above stove + cooktop
  const hood = add(g, new T.CylinderGeometry(.24, .42, .55, 4, 1), '#efe9df', -.5, 2.6, -2.15); hood.rotation.y = PI / 4; hood.scale.z = .55;
  add(g, BOX(.62, .06, .36), '#efe9df', -.5, 2.3, -2.12);
  add(g, BOX(.55, .012, .42), mat('#111', { roughness: .1, metalness: .3 }), -.5, .965, -2.0);
  for (const [ox, oz] of [[-.12, -.1], [.12, -.1], [-.12, .1], [.12, .1]]) { const r = new T.Mesh(new T.TorusGeometry(.065, .006, 6, 24), mat('#444')); r.rotation.x = PI / 2; r.position.set(-.5 + ox, .975, -2.0 + oz); g.add(r); }
  // walnut floating shelves by the window
  for (const y of [1.95, 2.45]) add(g, BOX(.75, .045, .26), '#6b4a33', -2.65, y, -2.25);
  [['#efe9df', .16], ['#c2a37a', .1], ['#6b8f7a', .2]].forEach(([c, h], k) => add(g, CYL(.05, .045, h, 16), c, -2.9 + k * .22, 1.98 + h / 2, -2.25));
  vaseFlowers(g, -2.5, 2.47, -2.25, .8);
  // counter decor
  SETS.props = [];
  const board = add(g, BOX(.32, .45, .025), '#8a5d3b', -2.5, 1.18, -2.3); board.rotation.x = -.12;
  const coffee = grp(g, -2.85, .96, -2.05); add(coffee, BOX(.24, .34, .3), '#2a2a2a', 0, .17, 0); const cf = new T.Mesh(BOX(.2, .12, .02), CHROME); cf.position.set(0, .26, .16); coffee.add(cf);
  const bw = add(g, new T.SphereGeometry(.2, 24, 10, 0, PI * 2, PI / 2, PI / 2), '#e8e2d5', -.9, 1.16, -1.95); bw.rotation.x = PI; SETS.props.push(bw);
  for (let i = 0; i < 3; i++) { const e = add(g, new T.SphereGeometry(.045, 16, 12), '#f3e7d3', -.0 + i * .1, 1.0, -1.82); e.scale.y = 1.25; SETS.props.push(e); }
  SETS.props.push(add(g, BOX(.22, .32, .14), '#e9dfc9', -1.35, 1.12, -1.9));
  const kettle = add(g, new T.SphereGeometry(.13, 24, 16), mat('#b87333', { metalness: .85, roughness: .3 }), -.5, 1.09, -2.0); kettle.scale.y = .85;
  // tall built-in column on the left wall (oven tower)
  const col = grp(g, -3.0, 0, -1.0); col.rotation.y = PI / 2;
  add(col, BOX(1.2, 2.4, .6), CAB, 0, 1.2, 0);
  shaker(col, .56, 1.0, -.29, .55, .31, CAB, 'v'); shaker(col, .56, 1.0, .29, .55, .31, CAB, 'v');
  add(col, BOX(1.1, .55, .02), mat('#111', { roughness: .1, metalness: .4 }), 0, 1.4, .31); const oh = new T.Mesh(BOX(.8, .02, .02), CHROME); oh.position.set(0, 1.62, .34); col.add(oh);
  shaker(col, 1.12, .55, 0, 2.0, .31, CAB, 'h');
  // kitchen island with marble top, stools and pendants
  const isl = grp(g, -2.25, 0, 1.45);
  add(isl, BOX(1.25, .86, .68), CAB, 0, .45, 0); add(isl, BOX(1.2, .08, .64), '#1f2a25', 0, .04, 0);
  for (const x of [-.31, .31]) shaker(isl, .58, .76, x, .47, .345, CAB, 'v');
  const it = new T.Mesh(BOX(1.4, .06, .85), MARBLE); it.position.set(0, .91, .05); it.castShadow = it.receiveShadow = true; isl.add(it);
  fruitBowl(isl, .25, .94, .05); vaseFlowers(isl, -.35, .94, .0, .9);
  stool(g, -2.55, 2.15); stool(g, -1.95, 2.15);
  pendant(g, -2.55, 3.4, 1.5, 1.15); pendant(g, -1.95, 3.4, 1.5, 1.15);
  pendant(g, -.4, 3.4, -1.2, .9, .8);
  // door (walnut, brass), hallway
  const dg = grp(g, 2.2, 0, -2.36); SETS.doorPivot = grp(dg, -.5, 0, 0);
  add(SETS.doorPivot, BOX(1.0, 2.2, .06), '#6b4a33', .5, 1.1, 0);
  for (const y of [.55, 1.6]) { add(SETS.doorPivot, BOX(.74, .78, .015), '#5a3d2a', .5, y, .035); add(SETS.doorPivot, BOX(.66, .7, .015), '#6b4a33', .5, y, .045); }
  for (const zz of [.08, -.08]) { const lv = new T.Mesh(BOX(.14, .025, .025), BRASS); lv.position.set(.84, 1.05, zz); SETS.doorPivot.add(lv); }
  for (const [x, w] of [[-.58, .12], [.58, .12]]) add(dg, BOX(w, 2.38, .16), '#ece6dc', x, 1.19, 0); add(dg, BOX(1.28, .12, .16), '#ece6dc', 0, 2.3, 0);
  const hl = new T.PointLight('#ffcf8a', 8, 5, 1.5); hl.position.set(2.2, 1.8, -3.4); g.add(hl); SETS.hallLight = hl;
  add(g, BOX(2.4, 3, .1), '#e3d6c2', 2.2, 1.5, -4.4); floorLux(grp(g, 2.2, 0, -3.4), 2.4, 2.1); wall(g, 2, 3, 1.0, 1.5, -3.4, PI / 2, '#d9cbb5'); wall(g, 2, 3, 3.4, 1.5, -3.4, PI / 2, '#d9cbb5');
  moldings(g, 1.2, 3.2, -4.33, .4, 1.1, '#efe5d6', 1);
  const pic = grp(g, 2.2, 1.9, -4.33); add(pic, BOX(.66, .5, .04), BRASS, 0, 0, 0); add(pic, new T.PlaneGeometry(.56, .4), new T.MeshBasicMaterial({ map: cityTex }), 0, 0, .025);
  const sconce = new T.Mesh(new T.SphereGeometry(.07, 16, 10), mat('#fff3d6', { emissive: '#ffd79a', emissiveIntensity: 1.5 })); sconce.position.set(1.6, 1.9, -4.3); g.add(sconce);
  // wall clock (brass rim)
  const wc = grp(g, 1.1, 2.55, -2.32); SETS.wallClock = wc;
  add(wc, CYL(.24, .24, .05, 32), '#f6f1e7', 0, 0, 0).rotation.x = PI / 2; const rim = new T.Mesh(new T.TorusGeometry(.24, .022, 10, 40), BRASS); rim.position.z = .02; wc.add(rim);
  for (let i = 0; i < 12; i++) { const tk = add(wc, BOX(.012, .035, .01), '#333', Math.sin(i / 12 * PI * 2) * .19, Math.cos(i / 12 * PI * 2) * .19, .03, false); tk.rotation.z = -i / 12 * PI * 2; }
  SETS.hourH = grp(wc, 0, 0, .04); add(SETS.hourH, BOX(.025, .12, .01), '#222', 0, .06, 0);
  SETS.minH = grp(wc, 0, 0, .05); add(SETS.minH, BOX(.018, .19, .01), '#222', 0, .095, 0);
  plant(g, 3.1, -1.9, 1.0);
  SETS.kitchenL = setLights(g, { hemi: .55, sky: '#c9c2d8', ground: '#5a4030', dint: 1.2, dcol: '#ffe2bd', dpos: [2.5, 5, 4], dtar: [-.5, 0, -1] });
  const ul = new T.PointLight('#ffc88a', 4, 6, 1.6); ul.position.set(-.8, 2.0, -1.4); g.add(ul);
  // mess props
  const mess = grp(g); SETS.mess = mess; mess.visible = false;
  const R = rng(17);
  SETS.splats = [];
  for (let i = 0; i < 12; i++) { const sp = add(mess, new T.CircleGeometry(.06 + R() * .1, 12), i % 3 ? '#ffffff' : '#f2c53d', -2.6 + R() * 3.4, 1.0 + R() * .6, -2.32, false); SETS.splats.push(sp); }
  for (let i = 0; i < 9; i++) { const sp = add(mess, new T.CircleGeometry(.12 + R() * .25, 12), '#fbf8f2', -2 + R() * 3.5, .006 + i * .0005, -1.4 + R() * 1.8, false); sp.rotation.x = -PI / 2; SETS.splats.push(sp); }
  const pot = add(mess, CYL(.2, .18, .2, 24), mat('#b87333', { metalness: .85, roughness: .3 }), .9, .1, .3); pot.rotation.z = 1.3; SETS.splats.push(pot);
  const pan = add(mess, CYL(.18, .16, .04, 24), '#333', -1.0, .02, .3); SETS.splats.push(pan);
  const fpin = grp(mess, .2, .05, .7); fpin.rotation.y = .6; rollingPin(fpin, .5); SETS.splats.push(fpin);
  for (let i = 0; i < 5; i++) { const sh = add(mess, new T.SphereGeometry(.05, 12, 6, 0, PI * 2, 0, PI / 2), '#f3e7d3', -1 + R() * 2, .0, -.4 + R() * 1.0); SETS.splats.push(sh); }
})();
function rollingPin(parent, len) {
  add(parent, jitter(CYL(.045, .045, len * .62, 8), .004), '#e1b783', 0, 0, 0).rotation.z = PI / 2;
  for (const s of [-1, 1]) { add(parent, CYL(.018, .018, len * .2, 6), '#b07e52', s * len * .4, 0, 0).rotation.z = PI / 2; add(parent, ICO(.03, 1), '#b07e52', s * len * .5, 0, 0); }
}
// --- exterior house (origin 90,0,0)
(() => {
  const g = grp(scene, 90, 0, 0); SETS.ext = g;
  add(g, new T.CylinderGeometry(9, 9, .2, 12), '#2f4a3c', 0, -.1, 0, false);
  const house = grp(g, 0, 0, -1);
  add(house, jitter(BOX(4, 2.6, 3), .03), '#e9dcc4', 0, 1.3, 0);
  const rs = new T.Shape(); rs.moveTo(-2.3, 0); rs.lineTo(2.3, 0); rs.lineTo(0, 1.5); rs.closePath();
  const roof = add(house, new T.ExtrudeGeometry(rs, { depth: 3.4, bevelEnabled: false }), '#a9483a', 0, 2.6, -1.7);
  add(house, BOX(.4, .9, .4), '#7a4a3a', 1.1, 3.6, -.4);
  SETS.extWins = [];
  [[-1.1, 1.85], [1.1, 1.85], [-1.1, .75], [1.1, .75]].forEach(([x, y]) => { const m = add(house, BOX(.7, .6, .05), new T.MeshStandardMaterial({ color: '#1a2140', emissive: '#ffc35a', emissiveIntensity: 0 }), x, y, 1.51); SETS.extWins.push(m); add(house, BOX(.8, .07, .1), '#fff', x, y - .33, 1.53); });
  add(house, BOX(.7, 1.2, .05), '#7a4a3a', 0, .6, 1.51);
  const R = rng(3);
  for (let i = 0; i < 7; i++) { const tx = (R() < .5 ? -1 : 1) * (3 + R() * 3), tz = -3 + R() * 4; const tr = grp(g, tx, 0, tz); add(tr, CYL(.08, .1, .6, 5), '#5a3e2b', 0, .3, 0); add(tr, jitter(new T.ConeGeometry(.6, 1.6, 6), .1, i), '#2e5a43', 0, 1.3, 0); }
  const moon = add(g, ICO(.5, 1), new T.MeshBasicMaterial({ color: '#fff4d0' }), -3, 6.5, -8, false);
  const sp = []; for (let i = 0; i < 200; i++) { sp.push((R() - .5) * 60, 3 + R() * 25, -15 - R() * 5); }
  const sg = new T.BufferGeometry(); sg.setAttribute('position', new T.Float32BufferAttribute(sp, 3));
  g.add(new T.Points(sg, new T.PointsMaterial({ color: '#ffffff', size: .12 })));
  const sky = new T.Mesh(new T.PlaneGeometry(120, 60), new T.MeshBasicMaterial({ color: '#141a3a' })); sky.position.set(0, 10, -22); g.add(sky);
  SETS.extL = setLights(g, { hemi: 1.1, sky: '#7080c0', ground: '#2a4a30', dint: 1.4, dcol: '#a8b8ff', dpos: [-3, 6, 4], dtar: [0, 0, 0] });
})();
// --- end card studio (origin 120,0,0)
(() => {
  const g = grp(scene, 120, 0, 0); SETS.end = g;
  floorLux(g, 7, 7);
  wall(g, 7, 3.6, 0, 1.8, -1.6, 0, '#d9cfc2'); moldings(g, -3, 3, -1.53, .35, 1.1, '#e8e0d4', 4); moldings(g, -3, 3, -1.53, 1.35, 3.2, '#e8e0d4', 4); add(g, BOX(7, .14, .04), '#ece6dc', 0, .07, -1.53, false);
  const ch = grp(g, 0, 0, -1.1); SETS.chest = ch;
  add(ch, BOX(1.3, .95, .55), '#6b4a33', 0, .62, 0); add(ch, BOX(1.38, .05, .6), '#5a3d2a', 0, 1.12, 0);
  for (const x of [-.55, .55]) for (const z of [-.2, .2]) { const l = new T.Mesh(CYL(.025, .018, .15, 12), BRASS); l.position.set(x, .075, z); ch.add(l); }
  SETS.chestDr = [];
  for (let j = 0; j < 3; j++) { const d = grp(ch, 0, .35 + j * .28, .28); shaker(d, 1.18, .24, 0, 0, 0, '#7a5640', 'h'); add(d, BOX(1.1, .2, .5), '#c9a982', 0, -.01, -.26); SETS.chestDr.push(d); }
  plant(g, -1.4, -1.0, 1.0);
  const lamp = grp(ch, .4, 1.15, 0); add(lamp, CYL(.06, .09, .25, 6), '#e2d3bb', 0, .12, 0); add(lamp, CYL(.12, .2, .22, 8), mat('#f3e2c2', { emissive: '#ffcf8a', emissiveIntensity: .6 }), 0, .36, 0);
  const pl = new T.PointLight('#ffc070', 3, 4, 1.6); pl.position.set(.4, 1.6, -.9); g.add(pl);
  const fr = grp(g, -.3, 2.0, -1.53); add(fr, BOX(.7, .5, .04), '#5a3e2b', 0, 0, 0); add(fr, new T.PlaneGeometry(.6, .4), new T.MeshBasicMaterial({ map: cityTex }), 0, 0, .025);
  SETS.endL = setLights(g, { hemi: .8, sky: '#fff0e0', ground: '#6a4a30', dint: 1.8, dcol: '#ffe2c0', dpos: [3, 5, 4], dtar: [0, .5, -1] });
})();
// hearts / particles pool
const hearts = []; for (let i = 0; i < 10; i++) { const h = new T.Mesh(heartGeo(.08), mat('#e8344a', { emissive: '#801020', emissiveIntensity: .3 })); h.visible = false; scene.add(h); hearts.push(h); }
const puffs = []; for (let i = 0; i < 40; i++) { const p = new T.Mesh(jitter(ICO(.2, 1), .05, i), new T.MeshStandardMaterial({ color: '#ffffff', flatShading: true, transparent: true, opacity: 1, roughness: 1 })); p.visible = false; scene.add(p); puffs.push(p); }
const feather = new T.Mesh(new T.ConeGeometry(.05, .22, 4), mat('#ffffff', { side: T.DoubleSide })); feather.scale.z = .2; scene.add(feather);
const trayG = grp(scene); (() => {
  add(trayG, jitter(BOX(.62, .03, .42), .004), '#a9774d', 0, 0, 0);
  for (const [x, z, w, d] of [[0, -.2, .62, .03], [0, .2, .62, .03], [-.3, 0, .03, .42], [.3, 0, .03, .42]]) add(trayG, BOX(w, .06, d), '#a9774d', x, .03, z);
  add(trayG, CYL(.17, .15, .02, 14), '#f7f3ec', -.06, .025, 0);
  for (let i = 0; i < 5; i++) add(trayG, jitter(CYL(.12, .12, .028, 10), .006, i), i % 2 ? '#d99a4e' : '#e8ad62', -.06, .05 + i * .03, 0);
  add(trayG, CYL(.08, .1, .02, 8), '#8a3f12', -.06, .2, 0);
  add(trayG, BOX(.06, .04, .05), '#fbe9a6', -.06, .23, 0);
  for (const [x, z] of [[-.2, .1], [.07, .12], [-.16, -.12]]) { const s = add(trayG, new T.ConeGeometry(.03, .06, 6), '#d5263f', x, .06, z); s.rotation.x = PI; }
  add(trayG, CYL(.05, .045, .14, 8), mat('#ffb347', { transparent: true, opacity: .9 }), .18, .09, -.05);
  const vase = grp(trayG, .2, .02, .11); add(vase, CYL(.03, .04, .1, 6), '#7aa7c7', 0, .05, 0); add(vase, CYL(.006, .006, .16, 4), '#3f7a4a', 0, .16, 0); add(vase, ICO(.04, 0), '#f2b631', 0, .25, 0);
})();

// ================= SCENE SCRIPT =================
function show(name) { for (const n of ['living', 'bed', 'kitchen', 'ext', 'end']) SETS[n].visible = n === name; scene.background = new T.Color(name === 'ext' ? '#141a3a' : '#1c1a20'); }
function hideAll() { [dad, mom, kid, momBed].forEach(c => c.root.visible = false); hearts.forEach(h => h.visible = false); puffs.forEach(p => p.visible = false); feather.visible = false; trayG.visible = false; }
function camAt(pos, tar, off = [0, 0, 0], fov = 34) { camera.position.set(pos[0] + off[0], pos[1], pos[2]); camera.lookAt(tar[0] + off[0], tar[1], tar[2]); if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); } }
function shakeCam(a, t) { camera.position.x += Math.sin(t * 61) * a; camera.position.y += Math.cos(t * 47) * a; }
function heartFX(t, t0, origin, n = 6, spread = .8) {
  for (let i = 0; i < n; i++) { const tt = t0 + i * .25; const h = hearts[i]; if (t < tt) continue; const ph = t - tt, R = rng(i + 7); h.visible = ph < 2.4; const s = Math.min(1, pop(t, tt)) * (1 - k(ph, 1.8, 2.4)); h.scale.setScalar(Math.max(s, .001)); h.position.set(origin[0] + (R() - .5) * spread + Math.sin(ph * 3 + i) * .08, origin[1] + ph * .45, origin[2] + (R() - .5) * .3); h.rotation.set(0, Math.sin(ph * 2 + i) * .6, Math.sin(ph * 3) * .2); }
}
function puffFX(t, t0, origin, n, spread, size = 1, life = 2.5) {
  for (let i = 0; i < n; i++) { const p = puffs.find(p => !p.visible); if (!p) return; const R = rng(i * 13 + Math.floor(t0 * 10)); const tt = t0 + R() * .4; if (t < tt) continue; const ph = t - tt; if (ph > life) continue; p.visible = true; const s = (.3 + R() * .7) * size * eo(Math.min(1, ph * 2.5)) * (1 + ph * .3); p.scale.setScalar(Math.max(s, .001)); p.position.set(origin[0] + (R() - .5) * spread * (1 + ph), origin[1] + R() * spread * .5 + ph * .35, origin[2] + (R() - .5) * spread * .6); p.material.opacity = clamp(1 - ph / life) * .7; }
}
const S = []; // [t0, t1, fn]
// 1a exterior: all asleep
S.push([0, 1.3, t => {
  show('ext'); const O = [90, 0, 0];
  SETS.extWins.forEach(w => w.material.emissiveIntensity = 0);
  const p = eio(k(t, 0, 1.3)); camAt([O[0] + lerp(-1.5, -.6, p), lerp(3.4, 2.9, p), lerp(15, 12.5, p)], [O[0], 2.0, -1]);
}]);
// 1b bedroom: mom asleep
function momSleeping(t, eyes = 'closed', mouth = 'flat', brows = 0) {
  pose(momBed, { x: 30 + .5, y: .72, z: -.5, rx: -PI / 2, armL: [.05, 0, 0], armR: [.05, 0, 0], eyes, mouth, brows, hy: -.25, bob: 0 });
  SETS.blanket.scale.y = 1 + Math.sin(t * 2.2) * .06;
}
S.push([1.3, 2.42, t => {
  show('bed'); momSleeping(t);
  const p = eio(k(t, 1.3, 2.42)); camAt([30 + lerp(1.3, 1.0, p), lerp(2.4, 2.2, p), lerp(-.3, -.6, p)], [30 + .5, .78, -2.0]);
}]);
// 1c living room in the dark: eyes, then flashlight
S.push([2.42, 4.56, t => {
  show('living');
  const lit = k(t, 3.3, 3.45);
  SETS.livingL.hemi.intensity = lerp(.04, .5, lit); SETS.livingL.dl.intensity = lerp(.05, .6, lit); SETS.livingWarm.intensity = lerp(0, 2, lit);
  SETS.livingLamp.userData.L.intensity = 0; SETS.livingLamp.userData.shadeM.material.emissiveIntensity = 0;
  const f = SETS.flash; f.intensity = lit * 30; f.position.set(.3, 1.2, 1.2); f.target.position.set(0, 1.0, -.2); f.castShadow = false;
  const blink = (t > 2.95 && t < 3.05) ? 'closed' : 'open';
  pose(dad, { x: -.35, z: -.2, yaw: .15, eyes: t < 3.3 ? blink : 'open', mouth: t < 3.3 ? 'flat' : 'grin', look: [.3, 0], brows: .5, armR: [.3, 1.2, .4] });
  pose(kid, { x: .45, z: .1, yaw: -.2, eyes: t < 3.3 ? blink : 'open', mouth: t < 3.3 ? 'flat' : 'grin', look: [-.4, 0], bob: t > 3.4 ? Math.abs(Math.sin((t - 3.4) * 9)) * .08 * (1 - k(t, 3.4, 4.3)) : 0, armL: [.5 + lit * 1.8, 0, .2], armR: [.5 + lit * 1.8, 0, .2] });
  const z = eio(k(t, 2.42, 4.5)); camAt([lerp(.25, .15, z), 1.3, lerp(4.4, 4.0, z)], [.1, 1.0, -.2], [0, 0, 0], 40);
}]);
// 2 clock 3:17, then dad & son plan the surprise
S.push([4.56, 10.49, t => {
  show('living');
  SETS.livingL.hemi.intensity = .9; SETS.livingL.dl.intensity = 1.4; SETS.livingWarm.intensity = 5; SETS.flash.intensity = 0;
  SETS.livingLamp.userData.L.intensity = 6; SETS.livingLamp.userData.shadeM.material.emissiveIntensity = .7;
  if (t < 6.35) { // clock close-up
    const p = eio(k(t, 4.56, 6.35));
    pose(dad, { x: -.35, z: -.2 }); pose(kid, { x: .45, z: .1 });
    camAt([lerp(-1.1, -1.5, p), lerp(1.05, .95, p), lerp(.0, -.2, p)], [-2.6, .8, -.3]);
    return;
  }
  const whisper = k(t, 8.6, 9.0) * (1 - k(t, 10.0, 10.4));
  const dadBounce = t > 6.4 && t < 7.4 ? Math.abs(Math.sin((t - 6.4) * 8)) * .05 * (1 - k(t, 6.4, 7.4)) : 0;
  const kidJump = t > 7.6 && t < 8.6 ? Math.abs(Math.sin((t - 7.6) * 9)) * .12 * (1 - k(t, 7.6, 8.6)) : 0;
  const yay = t > 9.6 ? Math.abs(Math.sin((t - 9.6) * 10)) * .12 : 0;
  pose(dad, { x: -.35, z: -.2, yaw: .35 + whisper * .3, crouch: whisper * .32, legL: [whisper * .9, whisper * 1.6], legR: [whisper * .3, whisper * 1.2], lean: whisper * .3, hy: whisper * .2, mouth: whisper > .5 ? 'sh' : 'grin', eyes: 'open', brows: .3, bob: dadBounce,
    armL: [.2, whisper * 1.0, whisper * 1.6], armR: t > 6.4 && t < 7.5 ? [.4, 1.3, 1.6] : [.15, 0, .1] });
  pose(kid, { x: .35, z: .15, yaw: -.4, bob: kidJump + yay, mouth: t > 9.3 ? 'grin' : 'smile', eyes: t > 9.6 ? 'happy' : 'open', look: [-.3, .2], hp: -.15,
    armL: t > 9.6 ? [2.6, 0, .2] : [.2, 0, .1], armR: t > 9.6 ? [2.6, 0, .2] : [.2, 0, .1] });
  heartFX(t, 9.5, [0, 1.4, 0], 5, .7);
  const p = eio(k(t, 6.35, 10.49)); camAt([lerp(.6, .1, p), lerp(1.4, 1.3, p), lerp(4.6, 3.9, p)], [0, 1.05, -.1], [0, 0, 0], 40);
}]);
// 3 the plan: kitchen lights on, quick mom-asleep insert
S.push([10.49, 14.02, t => {
  if (t > 12.85) { show('bed'); momSleeping(t); const p = k(t, 12.85, 14.02); camAt([30 + 1.0, 2.1, lerp(-.8, -.95, p)], [30 + .5, .78, -2.0]); return; }
  show('kitchen');
  const on = k(t, 10.6, 10.75);
  SETS.kitchenL.hemi.intensity = lerp(.15, .6, on); SETS.kitchenL.dl.intensity = lerp(.2, 1.3, on); SETS.hallLight.intensity = 0;
  SETS.drawer.position.z = 0; SETS.doorPivot.rotation.y = 0; SETS.mess.visible = false;
  SETS.hourH.rotation.z = -(3 + 17 / 60) / 12 * PI * 2; SETS.minH.rotation.z = -17 / 60 * PI * 2;
  const lt = t - 10.49;
  pose(dad, { x: 60 + .9, z: .2, yaw: -.3, mouth: 'grin', armR: t > 11.7 ? [1.0, 1.2, 1.2] : [.15, 0, .1], armL: [.2, 0, .1], brows: .3, look: [-.2, 0] });
  pose(kid, { x: 60 + 1.6, z: .5, yaw: -.5, mouth: 'grin', eyes: 'open', bob: Math.abs(Math.sin(lt * 6)) * .04, armL: [.3, 1.4, .3], look: [-.3, .2] });
  const p = eio(k(t, 10.49, 12.85)); camAt([60 + lerp(1.6, 1.4, p), lerp(1.6, 1.5, p), lerp(5.0, 4.4, p)], [60 + .6, 1.0, -.6], [0, 0, 0], 40);
}]);
// 4 problem: mom wakes from the tiniest sound
S.push([14.02, 20.18, t => {
  show('bed');
  const awake = t > 18.8 && t < 19.75;
  momSleeping(t, awake ? 'wide' : 'closed', awake ? 'o' : 'flat', awake ? .8 : 0);
  if (t > 16.7 && t < 18.85) { feather.visible = true; const p = k(t, 16.7, 18.8); feather.position.set(30 + .4 + Math.sin(t * 3) * .12 * (1 - p), lerp(1.7, .95, eio(p)), -1.75); feather.rotation.set(Math.sin(t * 3) * .6, t, Math.cos(t * 2.5) * .5); }
  else if (t >= 18.85) { feather.visible = true; feather.position.set(30 + .4, .95, -1.75); feather.rotation.set(PI / 2, 0, .3); }
  const p = eio(k(t, 14.02, 20.18));
  camAt([30 + lerp(.85, .7, p), lerp(1.75, 1.6, p), lerp(-1.15, -1.3, p)], [30 + .5, .8, -2.0]);
  if (t > 16.6 && t < 18.8) { camera.lookAt(30.45, lerp(.8, 1.0, k(t, 16.6, 17.2)), -1.9); }
  if (awake) shakeCam(.012, t);
}]);
// 5 tiptoe through the living room
S.push([20.18, 23.77, t => {
  show('living');
  SETS.livingL.hemi.intensity = .75; SETS.livingL.dl.intensity = 1.1; SETS.livingWarm.intensity = 4; SETS.flash.intensity = 0;
  SETS.livingLamp.userData.L.intensity = 3; SETS.livingLamp.userData.shadeM.material.emissiveIntensity = .4;
  const lt = t - 20.18, x = lerp(-2.0, 1.4, lt / 3.6);
  const w1 = walkP(lt, 5, .55), w2 = walkP(lt + .3, 6, .5);
  pose(dad, Object.assign({}, w1, { x: x, z: .3, yaw: PI / 2 - .5, crouch: .12, lean: .25, bob: w1.bob + Math.sin(lt * 10) * .01, mouth: 'flat', eyes: 'open', brows: .6, look: [.3, 0], armR: [.25, 1.9, 2.3], armL: [1.1, .3, .4] }));
  pose(kid, Object.assign({}, w2, { x: x - .8, z: .5, yaw: PI / 2 - .5, mouth: 'sh', eyes: 'open', brows: .4, armL: [1.4, 0, .3], armR: [1.4, 0, .3] }));
  camAt([x - .2, 1.5, 5.2], [x - .3, .95, 0]);
}]);
// kitchen common state
function kitchenBase() { show('kitchen'); SETS.props.forEach(p => p.visible = true); SETS.kitchenL.hemi.intensity = .6; SETS.kitchenL.dl.intensity = 1.3; SETS.hallLight.intensity = 0; SETS.doorPivot.rotation.y = 0; SETS.mess.visible = false; SETS.pinInDrawer.visible = true; SETS.hourH.rotation.z = -(3 + 17 / 60) / 12 * PI * 2; SETS.minH.rotation.z = -17 / 60 * PI * 2; }
const DX = () => 60 + SETS.drawerX;
// 6 rolling pin needed
S.push([23.77, 26.4, t => {
  kitchenBase(); SETS.drawer.position.z = 0;
  const lt = t - 23.77;
  pose(dad, { x: DX() + .9, z: -.7, yaw: -.2, mouth: 'flat', brows: .4, look: [-.3, .3], hp: .15, armR: [.4, 1.6, 2.4], armL: [.15, 0, .1], ht: Math.sin(lt * 4) * .05 });
  pose(kid, { x: DX() + .1, z: -.9, yaw: .2, mouth: 'grin', eyes: 'open', hp: .2, armR: [.4, 1.2, .1], armL: [.2, 0, .1], look: [0, -.3] });
  const p = eio(k(t, 23.77, 26.4)); camAt([DX() + lerp(1.3, 1.0, p), lerp(1.55, 1.45, p), lerp(3.6, 3.1, p)], [DX() + .5, 1.0, -1.0], [0, 0, 0], 42);
}]);
// 7 kid opens drawer and lets go
function drawerOpenAt(t) { if (t < 27.8) return .45 * eio(k(t, 26.6, 27.8)); if (t < 29.6) return .45; if (t < 30.82) return lerp(.45, .06, ei(k(t, 29.6, 30.35))); return .06; }
S.push([26.4, 30.82, t => {
  kitchenBase(); const o = drawerOpenAt(t); SETS.drawer.position.z = o;
  const shocked = t > 29.65;
  const pull = t < 29.6;
  const back = eo(k(t, 29.65, 30.3)); pose(kid, { x: DX() + .15 - back * .4, z: -1.25 + o * .9 + back * .15, yaw: PI, lean: pull ? -.15 : 0, mouth: shocked ? 'O' : 'grin', eyes: shocked ? 'wide' : 'open', brows: shocked ? .9 : 0,
    armL: pull ? [.15, 1.35, 0] : (shocked ? [2.7, 0, .3] : [.3, .3, .2]), armR: pull ? [.15, 1.35, 0] : (shocked ? [2.7, 0, .3] : [.3, .3, .2]) });
  kid.root.rotation.y = shocked ? lerp(PI, PI + .9, k(t, 29.65, 29.9)) : PI;
  pose(dad, { x: DX() - .9, z: -.6, yaw: .6, mouth: shocked ? 'O' : 'smile', eyes: shocked ? 'wide' : 'open', look: [-.4, 0] });
  if (t < 28.9) camAt([DX() + 1.6, 1.45, 1.4], [DX() + .05, .8, -1.2], [0, 0, 0], 48);
  else { const p = eio(k(t, 28.9, 29.5)); camAt([DX() + lerp(1.6, 1.3, p), lerp(1.45, 1.3, p), lerp(1.4, 1.0, p)], [DX() - .05, .8, -1.2], [0, 0, 0], 48); if (shocked) shakeCam(.01, t); }
}]);
// 8 dad horror + imagined house waking
S.push([30.82, 33.97, t => {
  if (t < 31.75) {
    kitchenBase(); SETS.drawer.position.z = .06;
    pose(dad, { x: DX() + 1.2, z: -.3, yaw: -.3, eyes: 'wide', mouth: 'O', brows: 1, armL: [.6, 1.7, 2.4], armR: [.6, 1.7, 2.4], ht: Math.sin(t * 40) * .02 });
    const p = eio(k(t, 30.82, 31.75)); camAt([DX() + 1.0, 1.65, lerp(2.3, 1.9, p)], [DX() + 1.05, 1.45, -.3], [0, 0, 0], 40); return;
  }
  show('ext');
  SETS.extWins.forEach((w, i) => { const on = k(t, 31.95 + i * .4, 32.05 + i * .4); w.material.emissiveIntensity = on * 1.6; });
  const p = eio(k(t, 31.75, 33.97)); camAt([90 + lerp(0, .3, p), lerp(3.0, 2.7, p), lerp(13.5, 11.5, p)], [90, 2.0, -1]); shakeCam(.04 * k(t, 32.0, 32.4), t);
}]);
// 9 drawer closes silently
S.push([33.97, 37.19, t => {
  kitchenBase(); const o = lerp(.06, 0, eo(k(t, 34.0, 35.8))); SETS.drawer.position.z = o;
  const relief = t > 35.9;
  pose(kid, { x: DX() - .45, z: -.75, yaw: PI + .9, mouth: relief ? 'grin' : 'O', eyes: relief ? 'happy' : 'wide', brows: relief ? 0 : .9, armL: relief ? [.2, 0, .1] : [2.7, 0, .3], armR: relief ? [.2, 0, .1] : [2.7, 0, .3] });
  pose(dad, { x: relief ? DX() + .85 : DX() + 2.4, z: -1.25, yaw: -.4, eyes: relief ? 'happy' : 'wide', mouth: relief ? 'grin' : 'O', brows: relief ? 0 : 1, armR: relief ? [.5, 2.1, 2.2] : [.6, 1.7, 2.4], armL: relief ? [.2, 0, .1] : [.6, 1.7, 2.4], lean: relief ? -.1 : 0 });
  if (t < 35.9) { const p = eio(k(t, 33.97, 35.9)); camAt([DX() + 1.3, lerp(1.3, 1.2, p), lerp(1.0, .8, p)], [DX() - .05, .78, -1.3], [0, 0, 0], 48); }
  else { const p = eio(k(t, 35.9, 37.19)); camAt([DX() + lerp(.9, .7, p), 1.55, lerp(3.6, 3.3, p)], [DX() + .25, 1.05, -.8], [0, 0, 0], 46); }
}]);
// 10 high five
S.push([37.19, 39.01, t => {
  kitchenBase(); SETS.drawer.position.z = 0;
  const hit = k(t, 37.7, 37.95);
  pose(dad, { x: DX() + 1.0, z: -.4, yaw: -.7, eyes: t > 37.95 ? 'happy' : 'open', mouth: 'grin', crouch: .1, legL: [.3, .5], legR: [.1, .3], armL: [lerp(.6, 1.9, hit), 0, .2] });
  pose(kid, { x: DX() + .25, z: -.15, yaw: .9, eyes: t > 37.95 ? 'happy' : 'open', mouth: 'grin', armR: [lerp(.6, 2.7, hit), .1, .1], bob: t > 37.95 ? Math.abs(Math.sin((t - 37.95) * 8)) * .1 * (1 - k(t, 37.95, 38.9)) : 0 });
  if (t > 37.95 && t < 38.6) puffFX(t, 37.95, [DX() + .6, 1.45, -.3], 6, .25, .25, .6);
  camAt([DX() + .7, 1.5, 3.7], [DX() + .65, 1.1, -.3], [0, 0, 0], 42);
}]);
// 11 twenty minutes later: catastrophe
S.push([39.01, 44.59, t => {
  kitchenBase(); SETS.drawer.position.z = 0;
  const spin = eio(k(t, 39.01, 40.1));
  SETS.minH.rotation.z = -(17 + 20 * spin) / 60 * PI * 2 - spin * PI * 2 * 0; SETS.hourH.rotation.z = -(3 + (17 + 20 * spin) / 60) / 12 * PI * 2;
  if (t < 40.1) { camAt([60 + 1.1, 2.45, -1.2], [60 + 1.1, 2.55, -2.32]); return; }
  SETS.mess.visible = true;
  SETS.splats.forEach((s, i) => { const tt = 40.2 + (i % 12) * .22; const sc = Math.min(1, pop(t, tt)); s.visible = t > tt; s.scale.setScalar(Math.max(sc, .001)); });
  const lt = t - 40.1;
  pose(dad, { x: DX() + 1.2, z: -.9, yaw: -.3, eyes: 'happy', mouth: 'grin', flour: t > 41, armL: [.6, 1.2 + Math.sin(lt * 12) * .4, 1.2], armR: [.4, 1.0, 1.6 + Math.sin(lt * 10) * .3], lean: Math.sin(lt * 6) * .05 });
  pose(kid, { x: DX() + .2, z: -.6, yaw: .3, eyes: 'happy', mouth: 'grin', flour: t > 41.6, armL: [2.4 + Math.sin(lt * 11) * .3, 0, .3], armR: [2.4 + Math.cos(lt * 11) * .3, 0, .3], bob: Math.abs(Math.sin(lt * 7)) * .08 });
  puffFX(t, 40.3, [DX() + .6, 1.1, -1.8], 8, .6, .5, 2.2);
  puffFX(t, 41.4, [DX() - .2, 1.0, -1.7], 8, .6, .55, 2.2);
  if (t > 43.0) puffFX(t, 43.0, [DX() + .6, 1.0, -1.0], 22, 1.6, .8, 1.5);
  const p = eio(k(t, 40.1, 44.59)); camAt([DX() + lerp(.9, .7, p), lerp(1.65, 1.55, p), lerp(4.2, 3.7, p)], [DX() + .6, 1.1, -1.1], [0, 0, 0], 42);
  if (t > 43.0) shakeCam(.04 * Math.exp(-(t - 43) * 2.5), t);
}]);
// 12 breakfast ready
S.push([44.59, 46.66, t => {
  kitchenBase(); SETS.drawer.position.z = 0; SETS.mess.visible = true; SETS.splats.forEach(s => { s.visible = true; s.scale.setScalar(1); });
  SETS.props.forEach(p => p.visible = false); trayG.visible = true; trayG.position.set(DX() + .25, .96, -1.85); trayG.rotation.y = 0; trayG.scale.setScalar(1);
  heartFX(t, 45.0, [DX() + .25, 1.35, -1.85], 4, .5);
  const a = lerp(-.5, .5, eio(k(t, 44.59, 46.66)));
  camAt([DX() + .25 + Math.sin(a) * 1.15, 1.6, -1.85 + Math.cos(a) * 1.15], [DX() + .25, 1.04, -1.85]);
}]);
// 13-15 to the door, the detail, mom reveal
S.push([46.66, 55.94, t => {
  kitchenBase(); SETS.drawer.position.z = 0; SETS.mess.visible = true; SETS.splats.forEach(s => { s.visible = true; s.scale.setScalar(1); });
  const doorX = 60 + 2.2;
  const arrive = eio(k(t, 46.66, 48.9));
  const dX = lerp(DX() + .8, doorX - .6, arrive), dZ = lerp(-.3, -.75, arrive);
  const kX = lerp(DX() + .1, doorX + .45, arrive), kZ = lerp(.2, -1.0, arrive);
  const wk = arrive < 1 ? walkP(t, 7, .4) : {};
  const open = eo(k(t, 51.5, 52.3));
  SETS.doorPivot.rotation.y = open * 1.5; SETS.hallLight.intensity = 8 * open;
  const surprised = t > 52.0 && t < 54.6;
  const fwd = Math.atan2(doorX - dX, -2.4 - dZ) * 0;
  pose(dad, Object.assign({}, wk, { x: dX, z: dZ, yaw: lerp(PI / 2, PI, k(t, 48.3, 49.0)), eyes: surprised ? 'wide' : 'open', mouth: surprised ? 'O' : (t > 49 ? 'flat' : 'grin'), brows: surprised ? .9 : 0, armL: [.25, 1.25, .5], armR: [.25, 1.25, .5] }));
  trayG.visible = true; trayG.scale.setScalar(1);
  const yawD = dad.root.rotation.y; /* tray follows dad */ trayG.rotation.y = yawD; trayG.position.set(dX + Math.sin(yawD) * .38, 1.0 + (wk.bob || 0), dZ + Math.cos(yawD) * .38);
  pose(kid, Object.assign({}, wk, { x: kX, z: kZ, yaw: lerp(PI / 2, PI, k(t, 48.5, 49.2)), eyes: surprised ? 'wide' : 'open', mouth: surprised ? 'O' : 'grin', brows: surprised ? .9 : 0, armR: t > 49.3 && t < 51.6 ? [.3, 1.5, .1] : [.2, 0, .1] }));
  // mom behind door
  const momBlink = (t % 3.3) < .12 ? 'closed' : 'open';
  pose(mom, { x: doorX + .1, z: -3.0, yaw: 0, eyes: t > 54.5 ? 'happy' : momBlink, mouth: t > 54.5 ? 'grin' : 'smile', brows: t > 53.4 && t < 54.5 ? .8 : 0, hy: t > 53.4 && t < 54.4 ? .15 : 0, armL: [.35, 1.35, 1.9, .9], armR: [.35, 1.35, 1.9, -.9], look: [0, 0] });
  if (t > 54.6) heartFX(t, 54.7, [doorX, 1.85, -2.9], 3, .4);
  if (t < 48.97) { const p = eio(k(t, 46.66, 48.97)); camAt([lerp(DX() + 1.0, doorX - .2, p), 1.55, lerp(3.6, 2.6, p)], [lerp(DX() + .6, doorX - .1, p), 1.1, lerp(-.6, -1.4, p)], [0, 0, 0], 44); }
  else if (t < 51.47) { const p = eio(k(t, 48.97, 51.47)); camAt([doorX + lerp(1.0, .8, p), lerp(1.6, 1.5, p), lerp(2.5, 1.9, p)], [doorX - .35, 1.15, -1.5], [0, 0, 0], 44); }
  else if (t < 53.6) { const p = eio(k(t, 51.47, 52.4)); camAt([doorX + lerp(.8, -.05, p), lerp(1.45, 1.8, p), lerp(1.6, .7, p)], [doorX + .05, lerp(1.1, 1.25, p), lerp(-1.6, -3.0, p)], [0, 0, 0], 42); }
  else { const p = eio(k(t, 53.6, 55.94)); camAt([doorX - .05, 1.45, lerp(-1.05, -1.3, p)], [doorX + .1, 1.25, -3.0], [0, 0, 0], 44); }
}]);
// 16 best surprise: family hug
S.push([55.94, 59.46, t => {
  kitchenBase(); SETS.drawer.position.z = 0; SETS.mess.visible = true; SETS.splats.forEach(s => { s.visible = true; s.scale.setScalar(1); });
  SETS.doorPivot.rotation.y = 1.5; SETS.hallLight.intensity = 8;
  const doorX = 60 + 2.2, cx = doorX - .1, cz = -1.6;
  const sway = Math.sin(t * 2.4) * .05;
  pose(mom, { x: cx + .42, z: cz, yaw: -.45, crouch: .18, legL: [.5, .9], legR: [.2, .5], lean: .15, eyes: 'happy', mouth: 'grin', tilt: sway, ht: .12, armL: [1.0, .9, 1.2], armR: [.4, .6, .8] });
  pose(kid, { x: cx, z: cz + .2, yaw: 0, eyes: 'happy', mouth: 'grin', armL: [2.4, 0, .3], armR: [2.4, 0, .3], tilt: -sway, bob: Math.abs(Math.sin(t * 4)) * .05 });
  pose(dad, { x: cx - .45, z: cz - .05, yaw: .45, crouch: .2, legL: [.3, .5], legR: [.5, .9], lean: .15, eyes: 'happy', mouth: 'grin', tilt: sway * .5, ht: -.12, armR: [1.0, .9, 1.2], armL: [.4, .6, .8] });
    heartFX(t, 56.1, [cx, 1.6, cz], 8, 1.2);
  const a = lerp(-.35, .35, eio(k(t, 55.94, 59.46)));
  camAt([cx + Math.sin(a) * 3.3, 1.45, cz + Math.cos(a) * 3.3], [cx, 1.05, cz], [0, 0, 0], 40);
}]);
// 17 end card
S.push([59.46, 64.5, t => {
  show('end');
  const op = Math.sin(k(t, 60.6, 62.6) * PI); SETS.chestDr.forEach((d, j) => d.position.z = .28 + (j === 1 ? op * .32 : 0));
  pose(dad, { x: 120 - .9, z: -.1, yaw: .4, eyes: 'happy', mouth: 'smile', armR: [.6, .8, .6] });
  pose(mom, { x: 120 + .9, z: -.1, yaw: -.4, eyes: 'happy', mouth: 'smile' });
  pose(kid, { x: 120 + .45, z: .15, yaw: -.3, eyes: 'happy', mouth: 'grin', armR: [2.5, 0, .3], bob: Math.abs(Math.sin(t * 5)) * .06 });
  const p = eio(k(t, 59.46, 63.95)); camAt([120 + lerp(.4, 0, p), lerp(1.6, 1.5, p), lerp(7.0, 6.4, p)], [120, 1.0, -.6], [0, 0, 0], 40);
}]);

// ================= OVERLAY =================
function subtitles(t) {
  const c = SUBS.find(c => t >= c.t && t < c.end); if (!c) return;
  const words = c.words, acc = words.some(w => w.a);
  const meas = sz => { g2.font = `900 ${sz}px U`; g2.letterSpacing = `${-sz * .03}px`; const ws = words.map(w => g2.measureText(w.w).width); return [ws, ws.reduce((a, b) => a + b, 0) + sz * .38 * (words.length - 1)]; };
  let size = Math.min(acc ? 124 : 104, 940 / meas(100)[1] * 100);
  if (words.length === 1 && !acc) size = Math.min(size, 100);
  const [ws, total] = meas(size), sp = size * .38;
  const life = k(t, c.t, c.end), breathe = 1 + .035 * eo(life);
  const out = t > c.end - .07 ? 1 - k(t, c.end - .07, c.end) : 1;
  g2.save(); g2.translate(540, 1440); g2.scale(breathe, breathe);
  let x = -total / 2;
  words.forEach((w, i) => {
    const ww = ws[i];
    if (t >= w.t) {
      const p = pop(t, w.t, 3.2), a = clamp((t - w.t) / .06) * out;
      g2.save(); g2.translate(x + ww / 2, (1 - Math.min(p, 1)) * 30); const s_ = .4 + .6 * Math.min(p, 1) + Math.max(0, p - 1) * .35; g2.scale(s_, s_);
      if (w.a) g2.rotate(Math.sin((t - w.t) * 9) * .03 * Math.exp(-(t - w.t) * 3));
      g2.globalAlpha = a; g2.font = `900 ${size}px U`; g2.letterSpacing = `${-size * .03}px`; g2.textAlign = 'center'; g2.textBaseline = 'middle';
      g2.lineJoin = 'round'; g2.lineWidth = size * .2; g2.strokeStyle = 'rgba(25,18,30,.92)';
      g2.shadowColor = 'rgba(0,0,0,.45)'; g2.shadowBlur = size * .25; g2.shadowOffsetY = size * .06; g2.strokeText(w.w, 0, 0); g2.shadowColor = 'transparent';
      g2.fillStyle = w.a ? '#ffcf3a' : '#ffffff'; g2.fillText(w.w, 0, 0);
      g2.restore();
    }
    x += ww + sp;
  });
  g2.restore(); g2.letterSpacing = '0px';
}
function overlay(t, s) {
  g2.setTransform(1, 0, 0, 1, 0, 0); g2.clearRect(0, 0, W, H);
  if (CLEAN) return;
  // subtle vignette
  const vg = g2.createRadialGradient(540, 900, 500, 540, 960, 1250); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(10,5,15,.45)'); g2.fillStyle = vg; g2.fillRect(0, 0, W, H);
  // dream frame for imagination
  if (t > 31.75 && t < 33.97) { const a = k(t, 31.75, 31.95); const g = g2.createRadialGradient(540, 900, 300, 540, 900, 1000); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, `rgba(235,225,255,${.85 * a})`); g2.fillStyle = g; g2.fillRect(0, 0, W, H); }
  // cut flash
  const since = t - s[0]; if (since < .1 && s[0] > 0) { g2.fillStyle = `rgba(0,0,0,${.6 * (1 - since / .1)})`; g2.fillRect(0, 0, W, H); }
  // end logo
  if (t > 59.46) {
    const p = pop(t, 59.5, 2.4);
    g2.save(); g2.translate(540, 360); g2.scale(p, p);
    g2.font = '900 132px U'; g2.letterSpacing = '-5px'; g2.textBaseline = 'middle';
    const wPart = g2.measureText('Partner').width, wAll = g2.measureText('PartnerZ').width;
    g2.lineJoin = 'round'; g2.lineWidth = 22; g2.strokeStyle = 'rgba(255,248,236,.95)'; g2.textAlign = 'left';
    g2.shadowColor = 'rgba(60,30,10,.35)'; g2.shadowBlur = 30; g2.shadowOffsetY = 10; g2.strokeText('PartnerZ', -wAll / 2, 0); g2.shadowColor = 'transparent';
    g2.fillStyle = '#3b2a20'; g2.fillText('Partner', -wAll / 2, 0); g2.fillStyle = '#d6283f'; g2.fillText('Z', -wAll / 2 + wPart, 0);
    g2.letterSpacing = '0px'; g2.restore();
  }
  subtitles(t);
}

const fill = new T.PointLight('#fff1e2', 1.3, 0, 0); scene.add(fill);
function render(t) {
  hideAll();
  const s = S.find(s => t >= s[0] && t < s[1]) || S[S.length - 1];
  s[2](t);
  fill.position.copy(camera.position); fill.position.y += .3; fill.intensity = (t > 2.42 && t < 3.3) ? 0 : (t > 3.3 && t < 4.56 ? .6 : 1.3);
  renderer.render(scene, camera);
  overlay(t, s);
}
window.render = render;
window.ready = (async () => { await document.fonts.load('900 50px U', 'АБВ abc 0123'); cityTex.needsUpdate = true; CLOCKS.forEach(([m, tx]) => { m.map = clockTex(tx); m.needsUpdate = true; }); render(0); return true; })();
