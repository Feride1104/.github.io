// «ПАУЗА» — сезон 2, серия 1 в 3D («блендер-стиль»). Голос и звук — s2e1_audio.mp3.
import * as THREE from 'three';
import { RoundedBoxGeometry } from './lib/RoundedBoxGeometry.js';
import { makeCharacter } from './char3d.js';
import { buildOffice, LAYER_ILMIR } from './office3d.js';

const L = window.PAUZA_LIB;
const { clamp, lerp, ss, lin, eio, eout, rnd } = L;
const W = 1080, H = 1920, DUR = 89, RESUME = 54.0, TAU = Math.PI * 2;
const RB = (w, h, d, r = .03) => new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2 - .001, h / 2 - .001, d / 2 - .001));
const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: .8, ...o });
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const lerpV = (a, b, k) => a.clone().lerp(b, k);

// ---------- рендер ----------
const gl = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
gl.setSize(W, H); gl.setPixelRatio(1); gl.shadowMap.enabled = true; gl.shadowMap.type = THREE.PCFSoftShadowMap;
gl.outputColorSpace = THREE.SRGBColorSpace; gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.15;
const cam = new THREE.PerspectiveCamera(40, W / H, .03, 60); cam.layers.enable(LAYER_ILMIR);

// ---------- кабинет ----------
const office = new THREE.Scene(); office.background = new THREE.Color('#0b0e12');
const OF = buildOffice(office);
const setLayer = (obj, l) => obj.traverse(m => m.layers.set(l));
const ilmir = makeCharacter({}); office.add(ilmir.root); setLayer(ilmir.root, LAYER_ILMIR);
const dbl = makeCharacter({ outfit: 'jacket' }); office.add(dbl.root);
const dblCoat = makeCharacter({}); office.add(dblCoat.root);
const EL = V(-1.55, 0, -.25), EL_YAW = 1.15;               // Ильмир стоит лицом к двери
const DOORP = V(3.05, 0, -.5), DESKP = V(.15, 0, -2.1), MIRP = V(-2.78, 0, -1.0), RACKP = V(2.6, 0, -1.95);
const phoneHand = new THREE.Group(); phoneHand.add(new THREE.Mesh(RB(.08, .16, .012, .008), M('#0c0d10', { roughness: .3 })));
const phoneHandScreen = new THREE.Mesh(new THREE.PlaneGeometry(.07, .145), new THREE.MeshBasicMaterial({ color: '#000' })); phoneHandScreen.position.z = .007; phoneHand.add(phoneHandScreen);
const phoneLight = new THREE.PointLight('#9cc6ff', 0, 1.2, 2); office.add(phoneLight);
const keysHand = OF.keys;

// ---------- телефон крупно ----------
const phoneScene = new THREE.Scene();
const scrCanvas = document.createElement('canvas'); scrCanvas.width = L.SW; scrCanvas.height = L.SHh;
const scrTex = new THREE.CanvasTexture(scrCanvas); scrTex.colorSpace = THREE.SRGBColorSpace;
const bigPhone = new THREE.Group(); phoneScene.add(bigPhone);
bigPhone.add(new THREE.Mesh(RB(.5, 1.0, .05, .07), M('#15171b', { roughness: .35, metalness: .3 })));
const scrMesh = new THREE.Mesh(new THREE.PlaneGeometry(.464, .964), new THREE.MeshBasicMaterial({ map: scrTex })); scrMesh.position.z = .026; bigPhone.add(scrMesh);
const skin = M('#e8b493');
const bigHand = new THREE.Group(); phoneScene.add(bigHand);
for (let i = 0; i < 4; i++) { const f = new THREE.Mesh(RB(.2, .085, .09, .04), skin); f.position.set(-.3, .05 - i * .1, .0); bigHand.add(f); }
const thumbM = new THREE.Mesh(RB(.09, .26, .09, .044), skin); thumbM.position.set(.22, -.42, .06); thumbM.rotation.z = .7; bigHand.add(thumbM);
const palm = new THREE.Mesh(RB(.4, .5, .12, .1), skin); palm.position.set(-.12, -.5, -.08); bigHand.add(palm);
const sleeve = new THREE.Mesh(RB(.42, .5, .3, .12), M('#eef0f2')); sleeve.position.set(-.2, -.95, -.1); bigHand.add(sleeve);
phoneScene.add(new THREE.HemisphereLight('#c8d6ee', '#30281f', 1.2));
const pk = new THREE.DirectionalLight('#ffe0c0', 1.2); pk.position.set(-1, 2, 3); phoneScene.add(pk);
const pcam = new THREE.PerspectiveCamera(40, W / H, .01, 20);

// ---------- стоматология снаружи (для записи камеры) ----------
const clinic = new THREE.Scene(); clinic.background = new THREE.Color('#05070c');
(function buildClinic() {
  const add = (g, m, x, y, z) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; clinic.add(o); return o; };
  add(new THREE.PlaneGeometry(30, 20), M('#2a2f36'), 0, 0, 3).rotation.x = -Math.PI / 2;
  const wallM = M('#4a525c');
  add(RB(3.25, 5, 3), wallM, -2.875, 2.5, -2.5); add(RB(3.25, 5, 3), wallM, 2.875, 2.5, -2.5); add(RB(2.5, 2.55, 3), wallM, 0, 3.725, -2.5);
  add(RB(2.5, .05, 3), M('#b8c4cc'), 0, .025, -2.5);
  for (let r = 0; r < 2; r++) for (let c = 0; c < 6; c++) { if (r === 0 && (c === 2 || c === 3)) continue; add(new THREE.PlaneGeometry(.9, .8), new THREE.MeshBasicMaterial({ color: Math.sin(r * 9 + c * 4) > 0 ? '#c9d6e4' : '#141a22' }), -3.4 + c * 1.36, 1.6 + r * 1.6, -.99); }
  const lobby = add(new THREE.PlaneGeometry(2.5, 2.45), new THREE.MeshBasicMaterial({ color: '#e6eff5' }), 0, 1.22, -3.95);
  add(RB(.8, .9, .4), M('#9fb0bd'), .7, .45, -3.6);
  add(RB(2.6, .12, .3), M('#59636e'), 0, 2.42, -1.0); add(RB(.1, 2.4, .3), M('#59636e'), -1.25, 1.2, -1.0); add(RB(.1, 2.4, .3), M('#59636e'), 1.25, 1.2, -1.0); add(RB(.06, 2.4, .1), M('#59636e'), 0, 1.2, -1.0);
  const glass = add(new THREE.PlaneGeometry(2.4, 2.35), new THREE.MeshStandardMaterial({ color: '#cfe3f0', transparent: true, opacity: .18, roughness: .05 }), 0, 1.2, -.98);
  const signC = document.createElement('canvas'); signC.width = 1024; signC.height = 160; const sg = signC.getContext('2d');
  sg.fillStyle = '#eef2f5'; sg.fillRect(0, 0, 1024, 160); L.tooth(sg, 90, 82, 52, '#2b6cd8'); sg.fillStyle = '#1f2b38'; sg.font = '900 92px Rubik'; sg.textBaseline = 'middle'; sg.fillText('СТОМАТОЛОГИЯ', 170, 86);
  const st = new THREE.CanvasTexture(signC); st.colorSpace = THREE.SRGBColorSpace;
  add(new THREE.PlaneGeometry(3.4, .53), new THREE.MeshBasicMaterial({ map: st }), 0, 2.85, -.98);
  const inner = new THREE.PointLight('#e8f2ff', 9, 7, 1.2); inner.position.set(0, 2.2, -2.6); clinic.add(inner);
  const porch = new THREE.SpotLight('#fff1dc', 25, 9, .9, .5, 1.2); porch.position.set(0, 3.1, .6); porch.target.position.set(0, 0, 1.0); clinic.add(porch, porch.target);
  const street = new THREE.PointLight('#ffcf94', 6, 9, 1.5); street.position.set(3.4, 3.2, 1.5); street.castShadow = true; clinic.add(street);
  add(new THREE.CylinderGeometry(.05, .05, 3.2, 8), M('#20252b'), 3.4, 1.6, 1.5);
  clinic.add(new THREE.HemisphereLight('#7e8fae', '#1b1a18', .7));
})();
const ilmirC = makeCharacter({}); clinic.add(ilmirC.root);
const dblC = makeCharacter({}); clinic.add(dblC.root);
const ccam = new THREE.PerspectiveCamera(48, W / H, .1, 60);

// ---------- 3D-портреты для галереи ----------
const portraits = [];
function makePortraits() {
  const pr = new THREE.Scene(); const ch = makeCharacter({}); pr.add(ch.root);
  pr.add(new THREE.HemisphereLight('#ffffff', '#555', 1.4)); const d = new THREE.DirectionalLight('#fff', 1.2); d.position.set(1, 2, 3); pr.add(d);
  const c = new THREE.PerspectiveCamera(30, 1, .05, 10); c.position.set(.0, 1.86, 1.25); c.lookAt(0, 1.8, 0);
  const cols = ['#e8b86b', '#6bb3e8', '#e86b8f', '#8fd18f', '#b48ce8', '#6be8c9'];
  const poses = [{ smile: .6 }, { smile: 1, browUp: .5 }, { sneer: .4, smile: .4, browAng: -.3 }, { lookX: .6, lookY: .5, browUp: .6 }, { open: .3, browUp: 1 }, { yaw: .5, smile: .5 }];
  gl.setSize(256, 256);
  poses.forEach((p, i) => { pr.background = new THREE.Color(cols[i]); ch.apply({ yaw: 0, ...p }); gl.render(pr, c); const cv = document.createElement('canvas'); cv.width = cv.height = 256; cv.getContext('2d').drawImage(gl.domElement, 0, 0); portraits.push(cv); });
  gl.setSize(W, H);
  const map = { coat_front: 0, coat_happy: 1, coat_sarcastic: 2, coat_think: 3, happy: 4, three4: 5, front: 0 };
  L.GAL.forEach(e => { if (e[0] === 'face') { e[0] = 'canvas'; e[1] = portraits[map[e[1]] ?? 0]; } if (e[0] === 'coat') { e[0] = 'canvas'; e[1] = portraits[(e[1] + 1) % 6]; } });
}
let phoneBG = null;
function makePhoneBG() {
  setOffice(30); cam.fov = 40; cam.position.set(.3, 1.6, 2.6); cam.lookAt(.3, 1.2, -1.5); cam.updateProjectionMatrix();
  gl.render(office, cam); const c = document.createElement('canvas'); c.width = W / 4; c.height = H / 4; const g = c.getContext('2d'); g.filter = 'blur(6px) brightness(.7)'; g.drawImage(gl.domElement, 0, 0, W / 4, H / 4);
  phoneBG = new THREE.CanvasTexture(c); phoneBG.colorSpace = THREE.SRGBColorSpace; phoneScene.background = phoneBG;
}

// ---------- состояние кабинета в момент t ----------
const blink = (t, seed = 0) => { const p = (t + seed * 1.7) % 3.6; return p < .12 ? Math.sin(p / .12 * Math.PI) : 0; };
const stoneAt = t => t < 8.4 ? 0 : t < 55.4 ? eio(ss(8.4, 10.2, t)) : 1 - ss(55.4, 56.6, t);
function placeWalk(ch, pts, t0, t1, t, speed = 8) {
  const k = clamp((t - t0) / (t1 - t0)), n = pts.length - 1, seg = Math.min(n - 1, Math.floor(eio(k) * n)), f = eio(k) * n - seg;
  const a = pts[seg], b = pts[seg + 1], p = lerpV(a, b, f); ch.root.position.copy(p);
  const moving = k > 0 && k < 1; const dir = b.clone().sub(a);
  ch.root.rotation.y = Math.atan2(dir.x, dir.z);
  return { walk: moving ? 1 : 0, walkPhase: (t - t0) * speed };
}
function setOffice(t, o = {}) {
  // часы и монитор
  OF.drawClock(2 * 3600 + 41 * 60 + 12 + (t < RESUME ? 0 : t - RESUME));
  OF.drawMonitor(o.monitor || ((g, w, h) => { g.fillStyle = '#0f2a44'; g.fillRect(0, 0, w, h); g.fillStyle = '#1e5a8a'; g.fillRect(0, 0, w, 36); g.fillStyle = 'rgba(255,255,255,.75)'; for (let k = 0; k < 7; k++) g.fillRect(24, 60 + k * 26, 120 + (k * 37 % 160), 10); g.strokeStyle = '#4fd1a5'; g.lineWidth = 4; g.beginPath(); for (let i = 0; i <= 80; i++) { const ph = (i / 80 * 4 + (t < RESUME ? 0 : t)) % 1, y = h - 40 - (ph > .45 && ph < .5 ? 40 : 0); i ? g.lineTo(i * w / 80, y) : g.moveTo(0, y); } g.stroke(); }));
  OF.setDoor(o.door ?? (t < 10.9 ? 1 : t < 50.6 ? 1 : 1 - ss(51.55, 51.95, t)));
  OF.rackCoat.visible = t < 47.6;
  // Ильмир
  const st = stoneAt(t);
  ilmir.root.position.copy(EL); ilmir.root.rotation.y = EL_YAW;
  ilmir.apply({ stone: st, age: 0, blink: st > .5 ? 0 : blink(t), walk: 0, yaw: 0, pitch: 0, browUp: .5, open: .1, lookX: 0, lookY: 0, smile: 0, sneer: 0, browAng: 0, breath: st > .5 ? 0 : t * 2, armL: null, armR: null, ...(o.ilmir || {}) });
  if (o.ilmirPos) ilmir.root.position.copy(o.ilmirPos); if (o.ilmirYaw !== undefined) ilmir.root.rotation.y = o.ilmirYaw;
  // двойник (до халата) и двойник в халате
  const coatOn = t >= 48.3;
  dbl.root.visible = !coatOn && !o.hideDbl; dblCoat.root.visible = coatOn && t < 51.8 && !o.hideDbl;
  const age = 1 - eio(lin(45.75, 47.1, t));
  let dp = { age, blink: blink(t, 2), walk: 0, yaw: 0, pitch: 0, smile: .25, sneer: .15, browAng: -.15, browUp: 0, open: 0, lookX: 0, lookY: 0, stone: 0, armL: null, armR: null, breath: t * 2 };
  let pos = DOORP.clone(), yaw = -Math.PI / 2;
  if (t < 10.75) { pos = DOORP.clone(); yaw = -Math.PI / 2; }
  else if (t < 13.0) { Object.assign(dp, placeWalk(dbl, [DOORP, V(1.65, 0, -.8), V(1.65, 0, -2.1), DESKP], 10.75, 13.0, t)); pos = dbl.root.position.clone(); yaw = dbl.root.rotation.y; }
  else if (t < 34.4) { pos = DESKP.clone(); yaw = 0; }
  else if (t < 36.7) { Object.assign(dp, placeWalk(dbl, [DESKP, V(-1.05, 0, -2.1), V(-2.0, 0, -1.3), MIRP], 34.4, 36.7, t)); pos = dbl.root.position.clone(); yaw = dbl.root.rotation.y; }
  else if (t < 47.4) { pos = MIRP.clone(); yaw = -Math.PI / 2; }
  else { pos = RACKP.clone(); yaw = 2.55; }
  dbl.root.position.copy(pos); dbl.root.rotation.y = yaw;
  Object.assign(dp, o.dbl || {}); dbl.apply(dp);
  // двойник в халате: стоит у вешалки → идёт к двери
  let cp = { age: 0, blink: blink(t, 3), smile: .35, sneer: .2, walk: 0, yaw: 0, pitch: 0, browAng: -.1, browUp: 0, open: 0, lookX: 0, lookY: 0, stone: 0, armL: null, armR: null, breath: t * 2 };
  if (t < 49.4) { dblCoat.root.position.copy(RACKP); dblCoat.root.rotation.y = Math.PI * .5; }
  else if (t < 50.65) { dblCoat.root.position.set(1.0, 0, -1.95); dblCoat.root.rotation.y = 0; }
  else Object.assign(cp, placeWalk(dblCoat, [V(1.0, 0, -2.08), V(1.7, 0, -1.0), V(2.6, 0, -.5), DOORP.clone().add(V(.7, 0, 0))], 50.65, 51.8, t));
  Object.assign(cp, o.dblCoat || {}); dblCoat.apply(cp);
  // телефон: на столе → в руке двойника (15.0–34.4) → на столе (светится)
  const held = t >= 15.0 && t < 34.4;
  if (held && phoneHand.parent !== dbl.handR) { dbl.handR.add(phoneHand); phoneHand.position.set(0, -.08, .05); phoneHand.rotation.set(-1.2, 0, 0); }
  if (!held && phoneHand.parent) phoneHand.parent.remove(phoneHand);
  OF.phone.visible = !held;
  const lit = held ? 1 : (t >= 34.4 && t < 36.8 ? .8 * (1 - lin(35.5, 36.8, t)) : (t >= 61.3 ? ss(61.3, 61.6, t) : 0));
  OF.phoneScreenMat.color.setRGB(.55 * lit, .7 * lit, 1 * lit);
  phoneHandScreen.material.color.setRGB(.6, .75, 1);
  phoneLight.intensity = held && t > 18 && t < 30.7 ? 2.2 : 0;
  if (held) { const wp = new THREE.Vector3(); phoneHand.getWorldPosition(wp); phoneLight.position.copy(wp).add(V(0, .05, .15)); }
  // ключи
  OF.keys.visible = t < 49.9;
}

// ---------- кадры ----------
const SH = [];
const shot = (s, f) => SH.push({ s, f });
function C(pos, tgt, fov = 40, roll = 0) { cam.fov = fov; cam.position.copy(pos); cam.up.set(Math.sin(roll), Math.cos(roll), 0); cam.lookAt(tgt); cam.updateProjectionMatrix(); }
const headPos = (ch) => { const v = new THREE.Vector3(); ch.head.getWorldPosition(v); return v; };
const front = (ch, d, dy = 0, side = 0) => { const y = ch.root.rotation.y; return headPos(ch).add(V(Math.sin(y) * d + Math.cos(y) * side, dy, Math.cos(y) * d - Math.sin(y) * side)); };
const shake = (t, a) => { const f = Math.floor(t * 30); return V((rnd(f) - .5) * a, (rnd(f + 7) - .5) * a, 0); };
// A — он стоял в дверях
shot(0, t => { setOffice(t, { dbl: { smile: .1 } }); C(V(.6, 1.65, .9), V(3.0, 1.55, -.5), 38); return { scene: office, dark: .35 }; });
// B — смотрел прямо на меня
shot(1.6, t => { setOffice(t, { dbl: { smile: .1, lookX: 0 } }); const k = t - 1.6; C(front(dbl, 1.7 - k * .12, -.03), headPos(dbl).add(V(0, -.05, 0)), 38); return { scene: office, dark: .25 - .1 * ss(1.6, 3.7, t) }; });
// C — и улыбался
shot(3.7, t => { setOffice(t, { dbl: { smile: lerp(.2, 1, ss(3.85, 4.6, t)), sneer: .35, browAng: -.35 } }); C(front(dbl, 1.45 - (t - 3.7) * .1, 0, .05), headPos(dbl).add(V(0, -.04, 0)), 38); return { scene: office, red: ss(3.9, 4.6, t) * .25 }; });
// D — пытался сделать шаг назад
shot(5.1, t => { const strain = ss(5.6, 7.2, t) * (1 - ss(7.6, 8.1, t)); setOffice(t, { ilmir: { browUp: 1, open: .25, lookX: .3, blink: 0 } }); C(front(ilmir, 1.6, -.03).add(shake(t, .02 * strain)), headPos(ilmir).add(V(0, -.06, 0)), 38); return { scene: office, vignetteRed: strain * .5 }; });
// E — окаменел
shot(8.3, t => { setOffice(t, { ilmir: { browUp: 1, open: .2, lookX: .4 } }); const k = ss(8.3, 10.5, t); C(V(-.25, 1.45, 2.9 - k * .4), V(-1.55, 1.15, -.25), 40); return { scene: office }; });
// F — спокойно вошёл
shot(10.5, t => { setOffice(t, { ilmir: { browUp: 1, open: .2, lookX: .5 } }); const p = dbl.root.position; C(V(lerp(1.6, .6, ss(10.5, 13, t)), 1.65, 2.9), V(p.x * .8, 1.2, p.z * .6), 44); return { scene: office }; });
// G — подошёл к столу
shot(13.1, t => { setOffice(t, { dbl: { pitch: .35, lookY: -.8, smile: .2 } }); C(V(.15, 1.55, 1.0), V(.15, 1.25, -2.1), 36); return { scene: office }; });
// H — взял мой телефон
shot(14.4, t => { const k = eio(ss(14.6, 15.4, t)), up = eio(ss(15.0, 15.85, t)); setOffice(t, { dbl: { pitch: .35 * (1 - up), lookY: -.8 * (1 - up), smile: .3, armR: { sh: -.5 - .45 * k - .5 * up, el: -.2 - 1.0 * up, z: -.06 } } }); C(V(.1, 1.35, .25), V(.1, 1.05, -1.8), 34); return { scene: office }; });
// I — и знаете, что самое странное? (живые только глаза)
shot(15.9, t => { setOffice(t, { ilmir: { lookX: Math.sin((t - 15.9) * 3) * .8, lookY: .1, browUp: 1, open: .2, blink: 0 } }); C(front(ilmir, 1.25, .08), headPos(ilmir).add(V(0, .08, 0)), 30); return { scene: office }; });
// J1 — Face ID: телефон перед лицом двойника
shot(18.2, t => { setOffice(t, { dbl: { smile: .35, armR: { sh: -1.35, el: -1.05, z: -.25, y: .2 }, pitch: -.05 } }); C(front(dbl, 1.5, -.08, -.35), headPos(dbl).add(V(0, -.1, 0)), 38); return { scene: office, scan: lin(18.4, 19.5, t) }; });
// J2/K/L — экран телефона крупно
function phoneShot(t, draw, zoom = 1) { draw(scrCanvas.getContext('2d')); scrTex.needsUpdate = true; bigPhone.position.set(0, 0, 0); bigHand.visible = true; pcam.fov = 40; pcam.position.set(0, -.02, 1.75 / zoom); pcam.lookAt(0, -.02, 0); pcam.updateProjectionMatrix(); return { scene: phoneScene, camera: pcam }; }
shot(19.6, t => phoneShot(t, sg => { const up = eio(lin(20.6, 21.0, t)); sg.save(); if (up < 1) { sg.save(); sg.translate(0, -up * L.SHh); L.faceIdScreen(sg, t, 19.65); sg.restore(); } if (up > 0) { sg.save(); sg.translate(0, (1 - up) * L.SHh); L.homeScreen(sg, t, 0, 0, false); sg.restore(); } sg.restore(); }));
shot(21.0, t => phoneShot(t, sg => { L.homeScreen(sg, t, 0, 0, false); const op = eio(lin(21.55, 22.05, t)); if (op > 0) { const [px, py] = L.iconPos(1, 1); sg.save(); sg.translate(lerp(px, 0, op), lerp(py, 0, op)); sg.scale(lerp(L.ICON / L.SW, 1, op), lerp(L.ICON / L.SHh, 1, op)); sg.beginPath(); sg.rect(0, 0, L.SW, L.SHh); sg.clip(); L.gallery(sg, t, 0, -1); sg.restore(); } }));
shot(22.8, t => phoneShot(t, sg => { const scroll = L.keys(t, [[22.8, 0], [24.5, 0], [24.9, 330], [25.7, 330], [26.1, 660], [27.1, 700]], eio); L.gallery(sg, t, scroll, t < 23 ? -1 : t < 24.55 ? 0 : t < 25.75 ? 1 : 2); }, 1.05));
// M — листал, будто всё принадлежало ему
shot(27.1, t => {
  if (t < 29.0) return phoneShot(t, sg => L.gallery(sg, t, 700 + ((t - 27.1) * 900) % 1400, -1), 1.1);
  setOffice(t, { dbl: { smile: .8, sneer: .35, browAng: -.3, lookY: -.4, pitch: .15, armR: { sh: -1.1, el: -1.0, z: -.2 } } }); C(front(dbl, 1.4, -.05, .1), headPos(dbl).add(V(0, -.05, 0)), 36); return { scene: office };
});
// N — хотел закричать, не мог открыть рот
shot(30.7, t => { const push = ss(32.3, 34.0, t); setOffice(t, { ilmir: { browUp: 1, open: .04 + Math.abs(Math.sin(t * 30)) * .03 * ss(30.9, 31.5, t), lookX: .3, blink: 0 } }); C(front(ilmir, lerp(1.5, .7, eio(push)), lerp(-.03, -.08, push)).add(shake(t, .012 + .02 * push)), headPos(ilmir).add(V(0, -.08 * push, 0)), 32); return { scene: office, pulse: .5 + .5 * Math.sin(t * 9) }; });
// O — подошёл к зеркалу
shot(34.2, t => { setOffice(t, { ilmir: { browUp: 1, open: .2, lookX: -.5 } }); const p = dbl.root.position; C(V(lerp(.2, -1.3, ss(34.4, 36.7, t)), 1.65, 2.3), V(p.x * .7 - .4, 1.2, -1.0), 46); return { scene: office }; });
// P — похолодело внутри
shot(36.8, t => { setOffice(t, { ilmir: { lookX: -1, browUp: .8, open: .15, blink: 0 } }); C(front(ilmir, 1.55, -.03, .2), headPos(ilmir).add(V(0, -.05, 0)), 38); return { scene: office, frost: ss(37.2, 40.4, t) }; });
// Q/R/S — зеркало: в отражении только двойник
shot(40.7, t => { setOffice(t, { ilmir: { lookX: -1 }, dbl: { smile: .3 } }); C(V(-.75, 1.9, .55), V(-3.4, 1.65, -1.0), 40); return { scene: office }; });
shot(43.8, t => { setOffice(t, { ilmir: { lookX: -1 }, dbl: { smile: .3 } }); const k = ss(43.8, 45.5, t); C(V(lerp(-1.95, -2.15, k), 1.82, lerp(.35, .2, k)), V(-3.43, 1.65, -.7), 32); return { scene: office, ghost: ss(44, 44.6, t) }; });
shot(45.5, t => { const fix = Math.sin(clamp((t - 45.65) / 1.5) * Math.PI); setOffice(t, { dbl: { smile: .4, armR: { sh: -2.4 * fix, el: -1.2 * fix, z: -.3 * fix } } }); C(V(-2.05, 1.85, .35), V(-3.43, 1.75, -1.0), 30); return { scene: office }; });
// T — халат с вешалки → склейка → двойник в халате
shot(47.4, t => {
  if (t < 48.3) { setOffice(t, { hideDbl: true }); OF.rackCoat.visible = true; const lift = eio(ss(47.75, 48.25, t)); OF.rackCoat.position.set(2.9 - lift * .5, 1.72 + lift * .35, -2.52 + lift * .2); OF.rackCoat.rotation.z = lift * .6; C(V(1.7, 1.5, -1.2), V(2.85, 1.35, -2.55), 40); return { scene: office }; }
  OF.rackCoat.position.set(2.9, 1.72, -2.52); OF.rackCoat.rotation.z = 0;
  setOffice(t, { dblCoat: { smile: .5, sneer: .25 } }); dblCoat.root.rotation.y = -Math.PI * .1; C(V(1.9, 1.5, .3), V(2.5, 1.35, -2.1), 44); return { scene: office, flash: Math.exp(-(t - 48.3) * 9) * .7 };
});
// U — взял ключи
shot(49.4, t => { const k = eio(ss(49.5, 49.95, t)), up = eio(ss(50.0, 50.5, t)); setOffice(t, { dblCoat: { pitch: .4, armR: { sh: -.95 * k - .5 * up, el: -.25 * k - .6 * up, z: -.06 } } }); if (t > 49.9) { OF.keys.visible = true; const hp = new THREE.Vector3(); dblCoat.handR.getWorldPosition(hp); OF.keys.position.set(.95, .815 + eio(ss(49.95, 50.5, t)) * .5, -1.4); OF.keys.rotation.z = Math.sin(t * 25) * .3 * ss(49.95, 50.1, t); } C(V(1.22, 1.12, -.78), V(.97, .86, -1.45), 30); return { scene: office }; });
// V — вышел из кабинета
shot(50.6, t => { OF.keys.position.set(.95, .815, -1.4); setOffice(t, { ilmir: { lookX: 1 } }); C(V(.8, 1.6, 1.6), V(2.9, 1.2, -.6), 42); return { scene: office, shake: t > 51.95 ? Math.exp(-(t - 51.95) * 8) : 0 }; });
// W — часы снова пошли
shot(52.2, t => { setOffice(t); const k = lin(52.2, 55.3, t); C(V(2.6, 2.3, -1.9 - k * .2), V(2.6, 2.3, -2.95), 34); return { scene: office, unfreeze: t > RESUME ? Math.exp(-(t - RESUME) * 5) : 0 }; });
// X — наконец смог пошевелиться
shot(55.3, t => { const gasp = Math.sin(clamp((t - 55.45) / .5) * Math.PI); setOffice(t, { ilmir: { open: .2 + .5 * gasp, browUp: 1, pitch: -.15 * gasp, blink: 0 } }); C(front(ilmir, 1.6, -.03).add(shake(t, .02 * gasp)), headPos(ilmir).add(V(0, -.05, 0)), 38); return { scene: office, crumbs: ss(55.4, 56.6, t) }; });
// Y — бросился к двери
shot(57.4, t => { const k = eio(lin(57.45, 58.7, t)); const p = lerpV(EL, V(2.95, 0, -.5), k); setOffice(t, { ilmirPos: p, ilmirYaw: Math.PI / 2, ilmir: { walk: 1, walkPhase: (t - 57.4) * 14, open: .3, browUp: 1 } }); C(p.clone().add(V(-.3, 1.55, 2.3)).add(shake(t, .03)), p.clone().add(V(.5, 1.15, 0)), 46); return { scene: office }; });
// Z — дверь не открывалась
shot(58.8, t => { const hits = [58.95, 59.4, 59.85], r = Math.max(...hits.map(s => t > s ? Math.exp(-(t - s) * 9) * Math.sin((t - s) * 50) : 0)); setOffice(t, { door: 0, ilmirPos: V(2.95, 0, -.5), ilmirYaw: Math.PI / 2, ilmir: { armR: { sh: -1.2 + r * .15, el: -.2, z: -.1 }, browUp: 1, open: .3 } }); OF.doorHandle.rotation.x = r * .4; C(V(2.75, 1.2, .35).add(shake(t, .02 * Math.abs(r))), V(3.42, 1.0, -.75), 36); return { scene: office }; });
// AA — уведомление на телефоне (на столе)
shot(60.4, t => { setOffice(t, { ilmirPos: V(2.4, 0, -.4), ilmirYaw: -Math.PI * .6, ilmir: { lookX: -.5, browUp: .8 } }); OF.doorHandle.rotation.x = 0; const k = ss(60.4, 63.6, t); C(V(lerp(.6, .15, k), lerp(1.5, 1.15, k), lerp(-.4, -1.0, k)), V(.05, .8, -1.45), 40); return { scene: office }; });
// AB–AD — «ЗАМЕНА ЗАВЕРШЕНА», «…24 ЧАСА»
shot(63.6, t => { const r = phoneShot(t, sg => L.lockNotes(sg, t)); bigHand.visible = false; const z = L.keys(t, [[63.6, [0, .22, 1.5]], [65.6, [0, .22, 1.5]], [66.6, [0, -.1, 1.5]], [71.8, [0, -.12, 1.45]]], eio); pcam.position.set(z[0], z[1], z[2]); pcam.lookAt(0, z[1], 0); return { ...r, noHud: true }; });
// AE — запись на мониторе
shot(71.8, t => {
  const sw = ss(73.0, 73.3, t);
  setOffice(t, { ilmirPos: V(.9, 0, -.6), ilmirYaw: Math.PI, monitor: (g, w, h) => { g.fillStyle = '#0f2a44'; g.fillRect(0, 0, w, h); if (sw > 0) { renderClinic(74.9); g.globalAlpha = sw; g.filter = 'grayscale(1) contrast(1.3)'; g.drawImage(gl.domElement, 0, H * .2, W, H * .55, 0, 0, w, h); g.filter = 'none'; g.globalAlpha = 1; g.fillStyle = '#fff'; g.font = '600 22px Rubik'; g.fillText('КАМ 01', 14, 30); } } });
  const k = eio(lin(71.9, 74.8, t)); C(lerpV(V(.9, 1.75, .3), V(.75, 1.15, -1.35), k), V(.75, 1.12, -1.85), lerp(44, 30, k)); return { scene: office };
});
// AF–AI — стоматология на записи
function renderClinic(t) {
  const dx = lerp(.4, -1.7, lin(75.0, 82.9, t));
  dblC.root.position.set(dx, 0, .2); dblC.root.rotation.y = -Math.PI / 2 + .25; dblC.apply({ walk: 1, walkPhase: (t - 75) * 7.5, smile: .3 });
  const ghost = ss(79.55, 80.1, t) * (rnd(Math.floor(t * 20)) > .12 ? 1 : 0);
  ilmirC.root.visible = ghost > 0; ilmirC.root.position.set(.25, 0, -2.2); ilmirC.root.rotation.y = 0; ilmirC.apply({ pitch: -.25 * ss(80.9, 81.5, t), lookY: .8 * ss(80.9, 81.5, t), browUp: .3, blink: 0 });
  ccam.position.set(1.9, 3.4, 5.0); ccam.lookAt(-.2, 1.25, -1.2); ccam.updateProjectionMatrix();
  gl.render(clinic, ccam);
}
shot(74.9, t => { renderClinic(t); const zoom = L.keys(t, [[74.9, 1], [77.9, 1], [79.5, 1.45], [80.9, 1.45], [81.3, 2.6], [82.1, 2.6], [82.4, 4.4], [83, 4.6]], k => k < 1 ? Math.round(k * 4) / 4 : 1); const hp = new THREE.Vector3(); ilmirC.head.getWorldPosition(hp); hp.project(ccam); const fx = (hp.x + 1) / 2, fy = (1 - hp.y) / 2;
  const zk = ss(79.5, 82.4, t); return { pre: true, cctv: true, zoom, zx: lerp(.5, fx, zk), zy: lerp(.5, fy, zk), glitch: t > 82.4 }; });
shot(83.0, t => ({ title: true }));

// ---------- кадр ----------
const out = document.createElement('canvas'); out.width = W; out.height = H; out.id = 'c3d';
const ctx = out.getContext('2d');
function frost(g, a) { g.save(); g.globalCompositeOperation = 'screen'; for (let i = 0; i < 260; i++) { const ang = rnd(i) * TAU, d = 1 - a * (.25 + rnd(i + 1) * .35), x = W / 2 + Math.cos(ang) * 620 * Math.max(d, .55), y = H / 2 + Math.sin(ang) * 1100 * Math.max(d, .55); g.strokeStyle = `rgba(200,230,255,${.5 * a})`; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(ang + 2) * 30, y + Math.sin(ang + 2) * 30); g.moveTo(x, y); g.lineTo(x + Math.cos(ang - 2) * 24, y + Math.sin(ang - 2) * 24); g.stroke(); } const gr = g.createRadialGradient(W / 2, H / 2, 300, W / 2, H / 2, 1200); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, `rgba(150,200,255,${.45 * a})`); g.fillStyle = gr; g.fillRect(0, 0, W, H); g.restore(); }
function title(g, t) {
  g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
  const k = t - 83.0, a = ss(.6, 1.0, k) * (1 - ss(5.2, 5.8, k)); if (a <= 0) return;
  g.save(); g.textAlign = 'center'; g.textBaseline = 'middle'; const f = Math.floor(t * 24), gli = k < 1.2 || (k > 2.4 && k < 2.55);
  g.font = '266px "Rubik Glitch"'; if (gli) { g.globalAlpha = a * .8; g.fillStyle = '#00e5ff'; g.fillText('ПАУЗА', W / 2 - 18 * rnd(f), 820); g.fillStyle = '#ff2a2a'; g.fillText('ПАУЗА', W / 2 + 18 * rnd(f + 1), 827); }
  g.globalAlpha = a; g.fillStyle = '#f3f3f3'; g.fillText('ПАУЗА', W / 2, 820);
  g.globalAlpha = a * ss(.9, 1.3, k); g.font = '900 60px Rubik'; g.letterSpacing = '14px'; g.fillStyle = '#ff4a4a'; g.fillText('СЕЗОН 2', W / 2, 1020);
  g.font = '900 78px Rubik'; g.letterSpacing = '5px'; g.fillStyle = '#fff'; g.fillText('СЕРИЯ 1', W / 2, 1118);
  g.globalAlpha = a * ss(1.4, 1.8, k); g.font = '500 38px Rubik'; g.letterSpacing = '10px'; g.fillStyle = '#bbb'; g.fillText('ИЛЬМИР ИЛЬДАРОВИЧ', W / 2, 1226);
  g.globalAlpha = a * ss(1.9, 2.4, k); g.font = '400 38px Rubik'; g.letterSpacing = '5px'; g.fillStyle = '#9a9a9a'; g.fillText('продолжение следует…', W / 2, 1350);
  g.letterSpacing = '0px'; g.restore();
}
export function render(t) {
  t = clamp(t, 0, DUR - 1e-3);
  let i = 0; while (i + 1 < SH.length && t >= SH[i + 1].s) i++;
  const r = SH[i].f(t) || {};
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.filter = 'none'; ctx.globalCompositeOperation = 'source-over';
  if (r.title) title(ctx, t);
  else {
    if (!r.pre) gl.render(r.scene, r.camera || cam);
    if (r.cctv) {
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      const zw = W / r.zoom, zh = H / r.zoom, sx = clamp(W * r.zx - zw / 2, 0, W - zw), sy = clamp(H * r.zy - zh / 2, 0, H - zh);
      ctx.imageSmoothingEnabled = r.zoom < 1.5; ctx.filter = 'grayscale(1) contrast(1.35) brightness(1.1)'; ctx.drawImage(gl.domElement, sx, sy, zw, zh, 0, 0, W, H); ctx.filter = 'none'; ctx.imageSmoothingEnabled = true;
      ctx.fillStyle = 'rgba(0,0,0,.2)'; for (let y = 0; y < H; y += 6) ctx.fillRect(0, y, W, 2);
      ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = .35; ctx.drawImage(L.GRAIN[Math.floor(t * 24) % 4], 0, 0, W, H); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(255,255,255,.88)'; ctx.font = '500 44px Rubik'; ctx.textBaseline = 'top'; ctx.fillText('КАМ 01 · ВХОД', 60, 200);
      ctx.textAlign = 'right'; ctx.fillText(L.tc(2 * 3600 + 44 * 60 + 14 + (t - 74.9)), W - 60, H - 300); ctx.textAlign = 'left';
      if (Math.floor(t * 2) % 2 === 0) { ctx.fillStyle = '#ff3030'; ctx.beginPath(); ctx.arc(W - 190, 226, 14, 0, TAU); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillText('REC', W - 165, 202); }
      if (r.glitch) { const f = Math.floor(t * 30); for (let k = 0; k < 7; k++) { const y = rnd(f * 7 + k) * H, hh = 20 + rnd(f + k) * 80; ctx.drawImage(out, 0, y, W, hh, (rnd(f * 3 + k) - .5) * 160, y, W, hh); } }
    } else ctx.drawImage(gl.domElement, 0, 0);
    if (r.dark) { ctx.fillStyle = `rgba(0,0,0,${r.dark})`; ctx.fillRect(0, 0, W, H); }
    if (r.red) { ctx.fillStyle = `rgba(120,0,0,${r.red})`; ctx.fillRect(0, 0, W, H); }
    if (r.vignetteRed) { const gr = ctx.createRadialGradient(W / 2, H / 2, 300, W / 2, H / 2, 1200); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, `rgba(80,0,0,${r.vignetteRed})`); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H); }
    if (r.pulse !== undefined) { ctx.fillStyle = `rgba(120,0,0,${.16 * r.pulse})`; ctx.fillRect(0, 0, W, H); }
    if (r.frost) frost(ctx, r.frost);
    if (r.scan > 0 && r.scan < 1) { ctx.save(); ctx.globalCompositeOperation = 'screen'; const y = 520 + (r.scan * 2 % 1) * 820, gr = ctx.createLinearGradient(0, y - 90, 0, y + 6); gr.addColorStop(0, 'rgba(90,220,255,0)'); gr.addColorStop(1, 'rgba(120,230,255,.75)'); ctx.fillStyle = gr; ctx.fillRect(140, y - 90, 800, 96); ctx.strokeStyle = 'rgba(90,220,255,.25)'; ctx.lineWidth = 2; for (let k = 0; k < 16; k++) { ctx.beginPath(); ctx.moveTo(180, 520 + k * 52); ctx.lineTo(900, 520 + k * 52); ctx.stroke(); } ctx.restore(); }
    if (r.ghost) { ctx.save(); ctx.globalAlpha = .18 * r.ghost * (.5 + .5 * Math.sin(t * 13)); ctx.strokeStyle = '#cfe8ff'; ctx.setLineDash([14, 16]); ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(W * .62, H * .45, 150, 420, 0, 0, TAU); ctx.stroke(); ctx.restore(); }
    if (r.flash) { ctx.fillStyle = `rgba(255,255,255,${r.flash})`; ctx.fillRect(0, 0, W, H); }
    if (r.unfreeze) { ctx.fillStyle = `rgba(255,235,200,${r.unfreeze * .3})`; ctx.fillRect(0, 0, W, H); }
    if (r.crumbs) { ctx.fillStyle = 'rgba(170,175,180,.9)'; for (let k = 0; k < 90; k++) { const p = clamp((t - 55.45 - rnd(k) * 1.2) / .9); if (p <= 0 || p >= 1) continue; ctx.fillRect(250 + rnd(k + 1) * 580, 300 + rnd(k + 2) * 900 + p * p * 700, 9, 9); } }
    if (t < RESUME && !r.cctv && r.scene === office) { ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = 'rgba(175,195,235,.35)'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  }
  L.post(ctx, t);
  if (!r.title || t < 83.05) L.kinetic(ctx, t);
  if (!r.title) L.hud(ctx, t, { noHud: !!r.noHud });
  return out;
}
export const DURATION = DUR;
export async function init() { await window.PAUZA.load(''); window.PAUZA.setMode('portrait'); makePortraits(); makePhoneBG(); }
export const canvas = out;
