// Ильмир в 3D: мягкий «блендер-стиль» персонаж с мимикой и позами.
import * as THREE from 'three';
import { RoundedBoxGeometry } from './lib/RoundedBoxGeometry.js';

const RB = (w, h, d, r = .08, s = 5) => new RoundedBoxGeometry(w, h, d, s, Math.min(r, w / 2 - .001, h / 2 - .001, d / 2 - .001));
const CAP = (r, l) => new THREE.CapsuleGeometry(r, l, 6, 16);
const M = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: .72, metalness: 0, ...o });

// оболочка из треугольников исходной геометрии, у которых центр удовлетворяет keep(x,y,z)
function shell(geo, scale, keep) {
  const g = geo.clone().toNonIndexed(); g.scale(...scale);
  const p = g.attributes.position.array, n = g.attributes.normal.array, P = [], N = [];
  for (let i = 0; i < p.length; i += 9) {
    const cx = (p[i] + p[i + 3] + p[i + 6]) / 3 / scale[0], cy = (p[i + 1] + p[i + 4] + p[i + 7]) / 3 / scale[1], cz = (p[i + 2] + p[i + 5] + p[i + 8]) / 3 / scale[2];
    if (keep(cx, cy, cz)) for (let k = 0; k < 9; k++) { P.push(p[i + k]); N.push(n[i + k]); }
  }
  const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); out.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); return out;
}
function toothTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  g.fillStyle = '#f1f2f4'; g.fillRect(0, 0, 128, 128); g.strokeStyle = '#2b5fc8'; g.lineWidth = 7; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(42, 40); g.bezierCurveTo(30, 20, 56, 20, 64, 32); g.bezierCurveTo(72, 20, 98, 20, 86, 40);
  g.bezierCurveTo(82, 60, 84, 96, 76, 100); g.bezierCurveTo(68, 104, 70, 72, 64, 72); g.bezierCurveTo(58, 72, 60, 104, 52, 100); g.bezierCurveTo(44, 96, 46, 60, 42, 40); g.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// opts: { hair, beard, skin, outfit: 'coat' | 'jacket' }
export function makeCharacter(opts = {}) {
  const o = { hair: '#211915', beard: '#3a2a21', skin: '#ebb995', outfit: 'coat', ...opts };
  const root = new THREE.Group();
  const mats = {
    skin: M(o.skin), hair: M(o.hair, { roughness: .95 }), beard: M(o.beard, { roughness: .95 }),
    white: M('#eef0f2'), navy: M('#22305a'), jacket: M('#26355a'), tee: M('#e9e1cf'), pants: M('#2c3038'),
    shoe: M('#f4f4f2'), eye: M('#ffffff', { roughness: .25, emissive: '#5a5a58', emissiveIntensity: 1 }), iris: M('#5b3a22', { roughness: .25 }), pupil: M('#0b0b0b', { roughness: .2 }),
    brow: M(o.hair, { roughness: .9 }), mouthIn: M('#5a231c'), bag: M('#6e4450', { transparent: true, opacity: 0 }),
    watch: M('#2a2a2a'), lens: M('#9aa3ab', { metalness: .8, roughness: .2 }),
  };
  const shadow = m => { m.castShadow = true; m.receiveShadow = true; return m; };
  const add = (parent, geo, mat, x = 0, y = 0, z = 0) => { const m = shadow(new THREE.Mesh(geo, mat)); m.position.set(x, y, z); parent.add(m); return m; };
  const coat = o.outfit === 'coat';

  // ---------- ноги ----------
  const hips = new THREE.Group(); hips.position.y = .86; root.add(hips);
  const legs = [];
  for (const sx of [-1, 1]) {
    const leg = new THREE.Group(); leg.position.set(sx * .12, 0, 0); hips.add(leg);
    add(leg, CAP(.1, .26), coat ? mats.navy : mats.pants, 0, -.2, 0);
    const knee = new THREE.Group(); knee.position.y = -.42; leg.add(knee);
    add(knee, CAP(.09, .26), coat ? mats.navy : mats.pants, 0, -.18, 0);
    add(knee, RB(.19, .1, .32, .05), mats.shoe, 0, -.4, .05);
    legs.push({ leg, knee });
  }
  // ---------- торс ----------
  const torso = new THREE.Group(); torso.position.y = .86; root.add(torso);
  const chest = new THREE.Group(); chest.position.y = .02; torso.add(chest);
  if (coat) {
    add(chest, RB(.62, .66, .36, .17), mats.white, 0, .3, 0);                    // халат (корпус)
    add(chest, RB(.64, .36, .34, .12), mats.white, 0, -.08, -.005);              // полы до середины бедра
    add(chest, RB(.17, .82, .02, .01), mats.navy, 0, .2, .182);                  // костюм в распахе
    const v = add(chest, new THREE.CircleGeometry(.07, 3), mats.skin, 0, .57, .194); v.rotation.z = -Math.PI / 2; v.scale.set(1, 1.3, 1);
    for (const sx of [-1, 1]) { const lap = add(chest, RB(.07, .26, .02, .01), M('#dfe2e6'), sx * .1, .5, .186); lap.rotation.z = -sx * .35; }
    add(chest, new THREE.PlaneGeometry(.11, .11), new THREE.MeshStandardMaterial({ map: toothTexture(), roughness: .8 }), -.19, .42, .181);
    for (const sx of [-1, 1]) add(chest, RB(.13, .015, .01, .004), M('#cfd3d8'), sx * .19, -.06, .172);
    for (const sx of [-1, 1]) add(chest, new THREE.CylinderGeometry(.018, .018, .04, 12), mats.lens, sx * .03, .44, .2).rotation.x = Math.PI / 2;
  } else {
    add(chest, RB(.62, .62, .36, .17), mats.jacket, 0, .32, 0);
    add(chest, RB(.2, .54, .02, .01), mats.tee, 0, .34, .181);
    add(chest, RB(.64, .07, .38, .03), mats.jacket, 0, .03, 0);
  }
  // ---------- руки ----------
  const arms = [];
  for (const sx of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(sx * .37, .54, 0); chest.add(sh);
    const sleeve = coat ? mats.white : mats.jacket;
    add(sh, CAP(.075, .2), sleeve, 0, -.15, 0);
    const el = new THREE.Group(); el.position.y = -.31; sh.add(el);
    add(el, CAP(.068, .18), sleeve, 0, -.13, 0);
    const hand = new THREE.Group(); hand.position.y = -.3; el.add(hand);
    add(hand, new THREE.SphereGeometry(.06, 16, 12), mats.skin, 0, -.02, 0).scale.set(1, 1.05, .7);
    for (let f = 0; f < 3; f++) add(hand, CAP(.016, .05), mats.skin, -.03 + f * .03, -.08, .005);
    add(hand, CAP(.016, .04), mats.skin, sx * -.055, -.035, .02).rotation.z = sx * .6;
    if (sx === 1) add(el, new THREE.TorusGeometry(.066, .012, 8, 20), mats.watch, 0, -.25, 0).rotation.x = Math.PI / 2;
    arms.push({ sh, el, hand });
  }
  // ---------- шея и голова ----------
  add(chest, new THREE.CylinderGeometry(.075, .085, .14, 16), mats.skin, 0, .67, 0);
  const head = new THREE.Group(); head.position.set(0, .98, 0); chest.add(head);
  const headGeo = RB(.5, .6, .5, .2, 20);
  add(head, headGeo, mats.skin);
  add(head, shell(headGeo, [1.06, 1.045, 1.06], (x, y, z) => y > .15 || (z < -.06 && y > -.16) || (Math.abs(x) > .2 && y > .02 && z < .1)), mats.hair);
  const mouthHole = (x, y, z) => z > .17 && Math.abs(x) < .085 && y > -.205 && y < -.112;
  add(head, shell(headGeo, [1.04, 1.03, 1.045], (x, y, z) => (y < -.075 && z > -.12) || (Math.abs(x) > .2 && y < .04 && y > -.3 && z > -.1 && z < .16)), mats.beard);
  for (const sx of [-1, 1]) add(head, new THREE.SphereGeometry(.055, 14, 10), mats.skin, sx * .255, .02, -.02).scale.set(.55, 1, .8);
  add(head, new THREE.SphereGeometry(.035, 14, 10), mats.skin, 0, -.015, .255).scale.set(.9, 1.25, 1);
  const eyes = [];
  for (const sx of [-1, 1]) {
    const eg = new THREE.Group(); eg.position.set(sx * .105, .085, .252); head.add(eg);
    add(eg, RB(.11, .07, .012, .03, 4), mats.eye, 0, 0, 0);
    const iris = add(eg, new THREE.CircleGeometry(.025, 24), mats.iris, 0, 0, .0075);
    add(iris, new THREE.CircleGeometry(.012, 18), mats.pupil, 0, 0, .0006);
    add(iris, new THREE.CircleGeometry(.0055, 10), M('#ffffff', { emissive: '#ffffff', emissiveIntensity: .7 }), .009, .009, .0012);
    const bag = add(eg, RB(.1, .025, .006, .008), mats.bag, 0, -.058, .002);
    const brow = add(head, RB(.11, .022, .018, .009), mats.brow, sx * .105, .165, .255);
    eyes.push({ eg, iris, brow, sx, bag });
  }
  const mouth = new THREE.Group(); mouth.position.set(0, -.158, .262); head.add(mouth);
  const lips = add(mouth, RB(.11, .038, .012, .018, 4), M('#a2604f'), 0, 0, 0);
  const mIn = add(mouth, RB(.085, .02, .01, .009, 4), mats.mouthIn, 0, 0, .006);

  const P = { yaw: 0, pitch: 0, roll: 0, lookX: 0, lookY: 0, blink: 0, squint: 0, browUp: 0, browAng: 0, smile: 0, open: 0, sneer: 0, breath: 0, walk: 0, walkPhase: 0, armL: null, armR: null, stone: 0, age: 0 };
  const stoneCol = new THREE.Color('#8b8f93');
  const base = {}; for (const k in mats) base[k] = mats[k].color.clone();
  const skinBase = new THREE.Color(o.skin), hairBase = new THREE.Color(o.hair), beardBase = new THREE.Color(o.beard);
  function setAge(a) {
    mats.hair.color.copy(hairBase).lerp(new THREE.Color('#a19f9b'), a); mats.brow.color.copy(hairBase).lerp(new THREE.Color('#9a9894'), a * .9);
    mats.beard.color.copy(beardBase).lerp(new THREE.Color('#6f6c69'), a); mats.skin.color.copy(skinBase).lerp(new THREE.Color('#d6b4a2'), a * .6);
    mats.bag.opacity = a * .8;
  }
  function apply(p = {}) {
    Object.assign(P, p);
    head.rotation.set(P.pitch, P.yaw, P.roll);
    const br = Math.sin(P.breath) * .006; chest.scale.set(1 + br, 1 + br * 1.5, 1 + br);
    for (const e of eyes) {
      e.iris.position.set(P.lookX * .026, P.lookY * .018, .0075);
      e.eg.scale.y = Math.max(.08, 1 - Math.max(P.blink, P.smile * .3, P.squint));
      e.brow.position.y = .165 + P.browUp * .03; e.brow.rotation.z = e.sx * P.browAng * .35;
    }
    mIn.scale.set(1 + P.smile * .25, .35 + P.open * 2.4, 1); lips.scale.set(1 + P.smile * .2, 1 + P.open * 1.4, 1);
    mouth.rotation.z = P.sneer * .25; mouth.position.y = -.158 + P.smile * .006 - P.open * .01;
    const w = P.walk, ph = P.walkPhase;
    legs[0].leg.rotation.x = Math.sin(ph) * .5 * w; legs[1].leg.rotation.x = -Math.sin(ph) * .5 * w;
    legs[0].knee.rotation.x = Math.max(0, -Math.sin(ph)) * .6 * w; legs[1].knee.rotation.x = Math.max(0, Math.sin(ph)) * .6 * w;
    hips.position.y = torso.position.y = .86 + Math.abs(Math.cos(ph)) * .02 * w;
    const aL = P.armL || { sh: -Math.sin(ph) * .4 * w, el: -.15, z: .06 }, aR = P.armR || { sh: Math.sin(ph) * .4 * w, el: -.15, z: -.06 };
    arms[0].sh.rotation.set(aL.sh, aL.y || 0, aL.z ?? .06); arms[0].el.rotation.set(aL.el, 0, 0);
    arms[1].sh.rotation.set(aR.sh, aR.y || 0, aR.z ?? -.06); arms[1].el.rotation.set(aR.el, 0, 0);
    for (const k in mats) if (mats[k].color && base[k] && k !== 'bag') mats[k].color.copy(base[k]);
    setAge(P.age || 0);
    if (P.stone > 0) for (const k in mats) if (mats[k].color && k !== 'bag' && !['eye', 'iris', 'pupil'].includes(k)) mats[k].color.lerp(stoneCol, P.stone * .9);
  }
  apply();
  return { root, head, chest, arms, eyes, apply, P, setAge, mats, handR: arms[1].hand, handL: arms[0].hand };
}
