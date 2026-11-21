// Кабинет стоматолога ночью: стены, стол, лампа, окно, зеркало, дверь, часы, вешалка.
import * as THREE from 'three';
import { RoundedBoxGeometry } from './lib/RoundedBoxGeometry.js';
import { Reflector } from './lib/Reflector.js';

const RB = (w, h, d, r = .03) => new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2 - .001, h / 2 - .001, d / 2 - .001));
const M = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: .8, ...o });
export const LAYER_ILMIR = 1;          // Ильмира не видит зеркало

function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.userData.canvas = c; return t; }

export function buildOffice(scene) {
  const o = {};
  const add = (geo, mat, x, y, z, parent = scene) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };
  // комната 7 × 3 × 6 (z: задняя стена -3, камера смотрит в -z)
  const wallM = M('#5f7473'), floorM = M('#4a4f52', { roughness: .6 });
  add(new THREE.PlaneGeometry(7, 6), floorM, 0, 0, 0).rotation.x = -Math.PI / 2;
  add(new THREE.PlaneGeometry(7, 3), wallM, 0, 1.5, -3);
  const lw = add(new THREE.PlaneGeometry(6, 3), wallM, -3.5, 1.5, 0); lw.rotation.y = Math.PI / 2;
  const rw = add(new THREE.PlaneGeometry(6, 3), wallM, 3.5, 1.5, 0); rw.rotation.y = -Math.PI / 2;
  add(new THREE.PlaneGeometry(7, 6), M('#3c4547'), 0, 3, 0).rotation.x = Math.PI / 2;
  add(RB(7, .9, .04, .01), M('#4b5d5d'), 0, .45, -2.98);   // панель внизу стены
  // окно с городом и жалюзи (задняя стена, справа)
  const cityT = canvasTex(512, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#060b1a'); gr.addColorStop(1, '#1b2747'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 14; i++) { const bx = i * 38 - 10, bh = 120 + Math.abs(Math.sin(i * 7.3)) * 260; g.fillStyle = '#121a30'; g.fillRect(bx, h - bh, 34, bh); g.fillStyle = 'rgba(255,205,130,.75)'; for (let k = 0; k < 18; k++) if (Math.sin(i * 13 + k * 7) > .2) g.fillRect(bx + 5 + (k % 3) * 9, h - bh + 12 + Math.floor(k / 3) * 22, 6, 9); }
    g.fillStyle = 'rgba(200,210,215,.5)'; for (let y = 6; y < h; y += 26) g.fillRect(0, y, w, 8);
  });
  add(new THREE.PlaneGeometry(1.5, 1.3), new THREE.MeshBasicMaterial({ map: cityT }), 1.2, 1.75, -2.99);
  add(RB(1.6, .06, .08), M('#dfe3e2'), 1.2, 2.42, -2.96); add(RB(1.6, .06, .08), M('#dfe3e2'), 1.2, 1.08, -2.96);
  add(RB(.06, 1.36, .08), M('#dfe3e2'), .42, 1.75, -2.96); add(RB(.06, 1.36, .08), M('#dfe3e2'), 1.98, 1.75, -2.96);
  // дипломы
  for (const x of [-.4, .05]) {
    add(RB(.36, .46, .03), M('#3b2e24'), x, 1.85, -2.97);
    add(new THREE.PlaneGeometry(.3, .4), new THREE.MeshStandardMaterial({ map: canvasTex(128, 160, (g, w, h) => { g.fillStyle = '#efe9dc'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(80,60,40,.45)'; for (let k = 0; k < 6; k++) g.fillRect(18, 30 + k * 16, 92 - (k % 2) * 30, 5); g.fillStyle = '#b8402f'; g.beginPath(); g.arc(96, 136, 10, 0, 7); g.fill(); }) }), x, 1.85, -2.95);
  }
  // часы
  const clockT = canvasTex(256, 256, () => {}); o.clockTex = clockT;
  const clock = add(new THREE.CylinderGeometry(.26, .26, .05, 40), M('#2b211b'), 2.6, 2.3, -2.96); clock.rotation.x = Math.PI / 2;
  add(new THREE.CircleGeometry(.23, 40), new THREE.MeshStandardMaterial({ map: clockT }), 2.6, 2.3, -2.93);
  // стол
  const deskM = M('#6b4a35'), deskTop = .78;
  add(RB(1.9, .06, .85), M('#8a6247'), .3, deskTop, -1.6);
  add(RB(1.8, .7, .05), deskM, .3, .43, -1.2);
  add(RB(.06, .74, .8), deskM, -.6, .37, -1.6); add(RB(.06, .74, .8), deskM, 1.2, .37, -1.6);
  // монитор
  const monT = canvasTex(512, 300, () => {}); o.monitorTex = monT;
  add(RB(.62, .4, .04), M('#1e2124'), .75, 1.12, -1.85); add(RB(.05, .2, .05), M('#1e2124'), .75, .89, -1.86); add(RB(.25, .02, .16), M('#1e2124'), .75, deskTop + .03, -1.86);
  o.monitor = add(new THREE.PlaneGeometry(.57, .35), new THREE.MeshBasicMaterial({ map: monT }), .75, 1.12, -1.828);
  // лампа
  add(new THREE.CylinderGeometry(.1, .12, .03, 20), M('#2d2d2d'), -.35, deskTop + .03, -1.8);
  add(new THREE.CylinderGeometry(.012, .012, .45, 8), M('#2d2d2d'), -.35, deskTop + .25, -1.8);
  const shade = add(new THREE.ConeGeometry(.16, .18, 24, 1, true), M('#d8b07a', { side: THREE.DoubleSide, emissive: '#7a5524', emissiveIntensity: .6 }), -.35, deskTop + .5, -1.8);
  const lamp = new THREE.PointLight('#ffc98a', 7, 6, 1.6); lamp.position.set(-.35, deskTop + .44, -1.75); lamp.castShadow = false; scene.add(lamp); o.lamp = lamp;
  // телефон и ключи на столе
  o.phone = new THREE.Group(); o.phone.position.set(.05, deskTop + .035, -1.45); scene.add(o.phone);
  add(RB(.08, .012, .16, .006), M('#0c0d10', { roughness: .3 }), 0, 0, 0, o.phone);
  o.phoneScreenMat = new THREE.MeshBasicMaterial({ color: '#000000' });
  const ps = add(new THREE.PlaneGeometry(.07, .15), o.phoneScreenMat, 0, .007, 0, o.phone); ps.rotation.x = -Math.PI / 2;
  o.keys = new THREE.Group(); o.keys.position.set(.95, deskTop + .035, -1.4); scene.add(o.keys);
  const ring = add(new THREE.TorusGeometry(.025, .004, 8, 24), M('#c0c4c8', { metalness: .7, roughness: .3 }), 0, 0, 0, o.keys); ring.rotation.x = Math.PI / 2;
  add(RB(.07, .006, .018, .003), M('#c8a15a', { metalness: .6, roughness: .35 }), .05, 0, .01, o.keys);
  add(RB(.06, .006, .016, .003), M('#aab0b6', { metalness: .6, roughness: .35 }), .03, 0, -.03, o.keys).rotation.y = .9;
  // стул
  add(RB(.5, .08, .5), M('#222'), 1.9, .5, -2.4); add(RB(.5, .6, .07), M('#222'), 1.9, .85, -2.65);
  // зеркало (левая стена) — настоящее отражение; Ильмир в нём не виден
  add(RB(.06, 1.35, .9), M('#3a2d22'), -3.47, 1.55, -1.0).rotation.y = 0;
  const mirror = new Reflector(new THREE.PlaneGeometry(.8, 1.22), { textureWidth: 1024, textureHeight: 1560, color: 0xb8c4c8, clipBias: .003 });
  mirror.position.set(-3.43, 1.55, -1.0); mirror.rotation.y = Math.PI / 2; scene.add(mirror); o.mirror = mirror;
  const vc = mirror.getRenderTarget ? null : null;
  mirror.onBeforeRender2 = null;
  // дверь (правая стена) с коридором
  o.doorPivot = new THREE.Group(); o.doorPivot.position.set(3.47, 0, .05); scene.add(o.doorPivot);
  add(RB(.08, 2.2, 1.1), M('#d3d8d8'), 3.48, 1.1, -.5);       // наличник фоном
  const corrT = canvasTex(256, 512, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#9fb3c0'); gr.addColorStop(.5, '#dfe9ef'); gr.addColorStop(1, '#6e7c86'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(255,255,255,.9)'; for (let i = 0; i < 4; i++) g.fillRect(90 + i * 6, 20 + i * 30, 76 - i * 12, 10 - i * 2); });
  o.corridor = add(new THREE.PlaneGeometry(.9, 2.05), new THREE.MeshBasicMaterial({ map: corrT }), 3.43, 1.03, -.5); o.corridor.rotation.y = -Math.PI / 2;
  const door = add(RB(.05, 2.05, .9), M('#e9ebea'), 0, 1.03, -.45, o.doorPivot);
  add(RB(.04, .04, .14), M('#9aa1a3', { metalness: .5, roughness: .3 }), -.05, 1.0, -.8, o.doorPivot);
  o.doorHandle = o.doorPivot.children[o.doorPivot.children.length - 1];
  const corrLight = new THREE.PointLight('#dfefff', 0, 4, 1.5); corrLight.position.set(3.8, 2.0, -.5); scene.add(corrLight); o.corrLight = corrLight;
  // вешалка с халатом
  add(new THREE.CylinderGeometry(.025, .025, 1.85, 10), M('#3a3a3a'), 2.9, .93, -2.6);
  add(new THREE.CylinderGeometry(.18, .2, .03, 20), M('#3a3a3a'), 2.9, .02, -2.6);
  o.rackCoat = new THREE.Group(); o.rackCoat.position.set(2.9, 1.72, -2.52); scene.add(o.rackCoat);
  add(RB(.4, 1.05, .14, .06), M('#eef0f2'), 0, -.5, 0, o.rackCoat);
  add(RB(.02, 1.0, .02), M('#c9ced3'), 0, -.52, .072, o.rackCoat);
  // свет
  scene.add(new THREE.HemisphereLight('#b9c8e0', '#4a4036', 1.25));
  const key = new THREE.DirectionalLight('#ffe2c4', 1.5); key.position.set(-1.0, 3.2, 4.5); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: .5, far: 15 }); key.shadow.bias = -.0005; scene.add(key); o.key = key;
  const moon = new THREE.DirectionalLight('#9db7ff', .5); moon.position.set(1.2, 2.4, -4); scene.add(moon);
  const fill = new THREE.DirectionalLight('#ffd9b0', .25); fill.position.set(-2, 3, 3); scene.add(fill);
  o.setDoor = k => { o.doorPivot.rotation.y = -k * 1.3; corrLight.intensity = k * 6; };
  o.drawClock = (secs) => {
    const c = clockT.userData.canvas, g = c.getContext('2d'), r = 120;
    g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#f7f3ea'; g.fillRect(0, 0, 256, 256); g.translate(128, 128); g.fillStyle = '#2b211b';
    for (let i = 0; i < 60; i++) { g.save(); g.rotate(i / 60 * 6.283); const b = i % 5 === 0; g.fillRect(b ? -3 : -1, -r * .92, b ? 6 : 2, b ? 16 : 7); g.restore(); }
    const hand = (a, l, w, col) => { g.save(); g.rotate(a); g.fillStyle = col; g.fillRect(-w / 2, -l, w, l + 14); g.restore(); };
    hand(secs / 43200 * 6.283, r * .5, 8, '#2b211b'); hand(secs / 3600 * 6.283, r * .75, 5, '#2b211b'); hand(Math.floor(secs) / 60 * 6.283, r * .85, 2, '#c83a2c');
    clockT.needsUpdate = true;
  };
  o.drawMonitor = (fn) => { const c = monT.userData.canvas, g = c.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); fn(g, c.width, c.height); monT.needsUpdate = true; };
  return o;
}
