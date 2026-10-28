'use strict';
// Sparring bot: a jointed Muay Thai fighter (orthodox stance) driven by pose keyframes, plus the AI that
// chooses combos, reads the player's attacks, and defends (block / long guard / check / evade).
//
// Pose vector layout (radians unless noted):
//  0 pelvisYaw 1 torsoYaw 2 torsoPitch 3 torsoRoll 4 headPitch
//  5-8 leadArm[shPitch, shAbduct, shTwist, elbow]  9-12 rearArm  (left arm = lead, right = rear)
//  13-16 leadLeg[hipPitch, hipAbduct, hipTwist, knee]  17-20 rearLeg
//  21 drop(m) 22 lunge(m) 23 pivotYaw 24 fallTilt
// Sign notes: shoulder/hip pitch + = forward; abduct + = toward +X (right limb outward, left limb inward);
// elbow/knee + = flexion; torsoPitch - = lean forward; headPitch - = chin down; yaw + = turn left.
const BN = 25;
const BDEF = {
  py: -0.5, ty: 0.1, tp: -0.1, tr: 0, hp: -0.12,
  la: [0.5, 0.12, 0, 2.55], ra: [0.55, -0.12, 0, 2.6],
  ll: [0.25, -0.05, 0, 0.35], rl: [-0.2, 0.08, 0, 0.4],
  drop: 0.0, fwd: 0, yaw: 0, tilt: 0,
};
function P(o) {
  const d = Object.assign({}, BDEF, o);
  return [d.py, d.ty, d.tp, d.tr, d.hp, ...d.la, ...d.ra, ...d.ll, ...d.rl, d.drop, d.fwd, d.yaw, d.tilt];
}
const STANCE = P({});
const HIGHG = { la: [0.62, 0.16, 0, 2.7], ra: [0.64, -0.16, 0, 2.7] };

// ---------- move set ----------
// meta: type (matches the player's move names), side = attacking limb, level = target height
function roundhouse(level) {
  // reference clip: upright through the step, then the torso leans back ~25-30deg as the leg whips out flat;
  // kick-side arm drops down/back, the other arm reaches forward at chest height
  const L = { low: { ha: 1.0, tr: 0.05, tp: 0.15 }, mid: { ha: 1.57, tr: 0.12, tp: 0.32 }, high: { ha: 2.05, tr: 0.38, tp: 0.48 } }[level];
  // same-side (right) arm covers the face first while the knee chambers, then swings down and back at the hit
  // Per the brief: the kick-side arm crosses the throat first ("choking himself"), then whips down and back past the hip;
  // the body turns fully sideways so the hip stacks over and the shin lands on the centreline.
  const COVER = [1.8, -0.7, 1.0, 1.5];     // glove across the face/neck to the opposite shoulder, elbow in front of the chest (solved numerically)
  const hit = P({ yaw: 1.7, ty: 0.5, fwd: 0.3, ll: [0.2, -0.3, -0.6, 0.1], rl: [0, L.ha, 0, 0.1], ra: [-0.8, 0.35, 0, 0.3], la: HIGHG.la, tr: L.tr, tp: L.tp });
  const chamber = P({ yaw: 0.95, ty: 0.3, fwd: 0.25, ll: [0.25, -0.3, -0.5, 0.25], rl: [0.2, 1.15, 0, 1.8], ra: COVER, la: HIGHG.la, tr: L.tr * 0.6, tp: L.tp * 0.5, drop: 0.06 });
  return {
    type: level === 'low' ? 'legkick' : level === 'mid' ? 'midkick' : 'highkick', side: 'R', level,
    dur: level === 'high' ? 1.3 : 1.15, active: [0.54, 0.68], reach: 2.05, dmg: level === 'low' ? 8 : level === 'mid' ? 10 : 12,
    keys: [
      K(0, null),
      // diagonal step + pivot on the lead foot, rear arm starts swinging back, lead hand to the face
      K(0.22, P({ yaw: 0.4, fwd: 0.18, ll: [0.3, -0.3, -0.4, 0.3], rl: [0.7, 0.7, 0, 1.7], ra: COVER, la: HIGHG.la, tr: 0.08, drop: 0.04 })),
      // chamber: knee driven high and out, shin hanging down behind it, torso starting to lean away
      K(0.42, chamber),
      // the arm opens out in front of the chest (elbow leads) so it never cuts through the body on the way down
      K(0.49, chamber.map((v, i) => (i >= 9 && i <= 12 ? [1.4, 0.3, 0.3, 1.4][i - 9] : (v + hit[i]) / 2)), 'i'),
      // hips whip through, leg extends in a flat arc
      K(0.56, hit, 'i'),
      K(0.66, hit.map((v, i) => (i === 23 ? 1.95 : v)), 'l'),
      K(0.8, P({ yaw: 1.7, ty: 0.3, fwd: 0.25, ll: [0.2, -0.3, -0.5, 0.2], rl: [0.1, 1.2, 0, 0.9], ra: [0.3, 0.3, 0, 0.7], la: HIGHG.la, tr: L.tr * 0.4 }), 'o'),
      K(1, null),
    ],
  };
}
// bot walk speed (m/s); the player is capped to the same speed while inside the ring
const BOT_SPEED = 2.6;
const BMOVES = {
  jab: { type: 'jab', side: 'L', level: 'high', dur: 0.45, active: [0.3, 0.5], reach: 1.75, dmg: 4,
    keys: [K(0, null), K(0.3, P({ la: [1.45, 0.05, 0, 0.12], ty: 0.35, fwd: 0.12, tp: -0.15 }), 'i'), K(0.5, P({ la: [1.45, 0.05, 0, 0.12], ty: 0.35, fwd: 0.12, tp: -0.15 })), K(1, null, 'o')] },
  cross: { type: 'cross', side: 'R', level: 'high', dur: 0.55, active: [0.32, 0.52], reach: 1.8, dmg: 7,
    keys: [K(0, null), K(0.32, P({ ra: [1.45, -0.05, 0, 0.1], py: -0.1, ty: 0.55, rl: [-0.15, 0.1, 0, 0.15], drop: 0.06, fwd: 0.22, tp: -0.2, hp: -0.15 }), 'i'),
      K(0.52, P({ ra: [1.45, -0.05, 0, 0.1], py: -0.1, ty: 0.55, rl: [-0.15, 0.1, 0, 0.15], drop: 0.06, fwd: 0.22, tp: -0.2, hp: -0.15 })), K(1, null, 'o')] },
  rhook: { type: 'hook', side: 'R', level: 'high', dur: 0.7, active: [0.38, 0.56], reach: 1.5, dmg: 9,
    keys: [K(0, null), K(0.3, P({ ra: [0.05, 1.5, 0, 1.55], ty: -0.15, fwd: 0.05, drop: 0.04 })), K(0.5, P({ ra: [0.05, 1.5, 0, 1.55], ty: 0.85, py: -0.05, fwd: 0.2, drop: 0.05 }), 'i'),
      K(0.62, P({ ra: [0.05, 1.5, 0, 1.55], ty: 1.0, py: 0.0, fwd: 0.2 }), 'o'), K(1, null)] },
  lhook: { type: 'hook', side: 'L', level: 'high', dur: 0.62, active: [0.36, 0.54], reach: 1.5, dmg: 8,
    keys: [K(0, null), K(0.28, P({ la: [0.05, -1.5, 0, 1.55], ty: 0.4, fwd: 0.05 })), K(0.48, P({ la: [0.05, -1.5, 0, 1.55], ty: -0.5, fwd: 0.15 }), 'i'),
      K(0.6, P({ la: [0.05, -1.5, 0, 1.55], ty: -0.65, fwd: 0.15 }), 'o'), K(1, null)] },
  legkick: roundhouse('low'),
  midkick: roundhouse('mid'),
  highkick: roundhouse('high'),
  // lead-leg teep: knee drives up, foot pushes out, body leans back
  teep: { type: 'teep', side: 'L', level: 'mid', dur: 0.85, active: [0.5, 0.66], reach: 2.1, dmg: 5,
    keys: [K(0, null), K(0.32, P({ ll: [1.5, -0.05, 0, 1.7], tp: 0.05, drop: 0.04, la: HIGHG.la, ra: HIGHG.ra }), 's'),
      K(0.52, P({ ll: [1.7, -0.05, 0, 0.1], tp: 0.38, hp: -0.05, fwd: 0.26, drop: 0.05, rl: [-0.3, 0.08, 0, 0.25], la: HIGHG.la, ra: HIGHG.ra }), 'i'), K(0.66, P({ ll: [1.7, -0.05, 0, 0.1], tp: 0.38, hp: -0.05, fwd: 0.26, drop: 0.05, rl: [-0.3, 0.08, 0, 0.25], la: HIGHG.la, ra: HIGHG.ra })), K(1, null)] },
  // rear-leg teep: the back knee drives up and the hips push through, bigger lean than the lead teep
  rteep: { type: 'teep', side: 'R', level: 'mid', dur: 0.95, active: [0.52, 0.68], reach: 2.1, dmg: 6,
    keys: [K(0, null), K(0.34, P({ rl: [1.5, 0.05, 0, 1.7], ll: [0.1, -0.05, 0, 0.2], tp: 0.05, drop: 0.04, la: HIGHG.la, ra: HIGHG.ra }), 's'),
      K(0.54, P({ rl: [1.7, 0.05, 0, 0.1], ll: [0.1, -0.05, 0, 0.2], tp: 0.42, hp: -0.05, fwd: 0.34, drop: 0.05, la: HIGHG.la, ra: HIGHG.ra }), 'i'),
      K(0.68, P({ rl: [1.7, 0.05, 0, 0.1], ll: [0.1, -0.05, 0, 0.2], tp: 0.42, hp: -0.05, fwd: 0.34, drop: 0.05, la: HIGHG.la, ra: HIGHG.ra })), K(1, null)] },
  // body shots: same punches thrown lower, bot dips and leans in
  jabB: { type: 'jab', side: 'L', level: 'mid', dur: 0.47, active: [0.3, 0.5], reach: 1.6, dmg: 5,
    keys: [K(0, null), K(0.3, P({ la: [1.2, 0.05, 0, 0.15], ty: 0.3, fwd: 0.12, tp: -0.4, drop: 0.14, hp: -0.25 }), 'i'), K(0.5, P({ la: [1.2, 0.05, 0, 0.15], ty: 0.3, fwd: 0.12, tp: -0.4, drop: 0.14, hp: -0.25 })), K(1, null, 'o')] },
  crossB: { type: 'cross', side: 'R', level: 'mid', dur: 0.57, active: [0.32, 0.52], reach: 1.65, dmg: 8,
    keys: [K(0, null), K(0.32, P({ ra: [1.2, -0.05, 0, 0.12], py: -0.1, ty: 0.5, rl: [-0.15, 0.1, 0, 0.15], drop: 0.16, fwd: 0.22, tp: -0.45, hp: -0.25 }), 'i'),
      K(0.52, P({ ra: [1.2, -0.05, 0, 0.12], py: -0.1, ty: 0.5, rl: [-0.15, 0.1, 0, 0.15], drop: 0.16, fwd: 0.22, tp: -0.45, hp: -0.25 })), K(1, null, 'o')] },
  lhookB: { type: 'hook', side: 'L', level: 'mid', dur: 0.64, active: [0.36, 0.54], reach: 1.4, dmg: 9,
    keys: [K(0, null), K(0.28, P({ la: [0.4, -1.4, 0, 1.5], ty: 0.4, fwd: 0.05, drop: 0.12, tp: -0.3 })), K(0.48, P({ la: [0.4, -1.4, 0, 1.5], ty: -0.5, fwd: 0.15, drop: 0.14, tp: -0.4 }), 'i'),
      K(0.6, P({ la: [0.4, -1.4, 0, 1.5], ty: -0.65, fwd: 0.15, drop: 0.14, tp: -0.4 }), 'o'), K(1, null)] },
};
// ---- plum clinch: bot holding the player's head (hold), bot being held (held), and the plum knee ----
const BCL = {
  hold: P({ la: [1.8, 0.15, 0, 1.2], ra: [1.8, -0.15, 0, 1.2], tp: -0.28, hp: -0.2, drop: 0.06, fwd: 0.1 }),
  held: P({ la: [0.9, 0.3, 0, 1.7], ra: [0.9, -0.3, 0, 1.7], tp: -0.6, hp: -0.7, drop: 0.12 }),
  knee: { dur: 0.7, keys: [K(0, null), K(0.4, P({ rl: [1.7, 0.05, 0, 1.6], la: [1.8, 0.15, 0, 1.2], ra: [1.8, -0.15, 0, 1.2], tp: -0.38, hp: -0.2, drop: 0.05, fwd: 0.1 }), 'i'), K(0.55, P({ rl: [1.7, 0.05, 0, 1.6], la: [1.8, 0.15, 0, 1.2], ra: [1.8, -0.15, 0, 1.2], tp: -0.38, hp: -0.2, drop: 0.05, fwd: 0.1 })), K(1, null)] },
};
BMOVES.plum = { type: 'plum', side: 'L', level: 'high', dur: 0.75, active: [0.5, 0.62], reach: 1.5, dmg: 0,
  keys: [K(0, null), K(0.5, P({ la: [1.75, 0.12, 0, 1.2], ra: [1.75, -0.12, 0, 1.2], tp: -0.3, fwd: 0.25, drop: 0.06, hp: -0.2 }), 'i'),
    K(0.62, P({ la: [1.75, 0.12, 0, 1.2], ra: [1.75, -0.12, 0, 1.2], tp: -0.3, fwd: 0.25, drop: 0.06, hp: -0.2 })), K(1, null)] };
const BFLINCH = { dur: 0.5, keys: [K(0, null), K(0.18, P({ tp: 0.38, hp: 0.4, la: [0.3, 0.15, 0, 1.9], ra: [0.3, -0.15, 0, 1.9], yaw: -0.2, drop: 0.06 }), 'o'), K(1, null)] };
const BSTAGGER = { dur: 0.8, keys: [K(0, null), K(0.2, P({ tp: 0.5, hp: 0.5, la: [0.1, 0.2, 0, 1.2], ra: [0.1, -0.2, 0, 1.2], yaw: -0.3, drop: 0.1, rl: [-0.5, 0.1, 0, 0.7] }), 'o'), K(1, null)] };
const BKO = { dur: 0.8, hold: true, keys: [K(0, null), K(1, P({ tilt: 1.5, drop: 0.2, tp: 0.15, hp: 0.3, la: [0.2, 0.7, 0, 0.5], ra: [0.2, -0.7, 0, 0.5], ll: [0.2, 0.2, 0, 0.2], rl: [0.1, -0.2, 0, 0.2] }), 'o')] };

// held defensive poses
const BHOLD = {
  block: P({ la: [0.78, 0.28, 0, 2.7], ra: [0.78, -0.28, 0, 2.7], tp: -0.28, hp: -0.3, drop: 0.08 }),
  long: P({ la: [1.38, 0.05, 0, 0.45], ra: [0.62, -0.14, 0, 2.7], tp: -0.05 }),
  evade: P({ tp: 0.3, hp: 0.1, la: [0.6, 0.15, 0, 2.6], ra: [0.6, -0.15, 0, 2.6] }),
};
const BCROUCH = P({ drop: 0.28, tp: -0.3, hp: -0.4, la: HIGHG.la, ra: HIGHG.ra });
// moves only the online opponent uses: a knee (the plum-knee pose, guard up)
BMOVES.knee = Object.assign({ type: 'knee', side: 'R', level: 'mid', reach: 1.0, dmg: 10, active: [0.4, 0.55] }, BCL.knee);
const BCHECK = { low: [0.7, 1.0], mid: [1.15, 1.6], high: [1.5, 1.9] }; // [hipPitch, knee]
function checkPose(side, level) {
  const [hp, kn] = BCHECK[level], o = { la: HIGHG.la, ra: HIGHG.ra, tp: -0.08, hp: -0.2, drop: 0.0 };
  o[side === 'L' ? 'll' : 'rl'] = [hp, side === 'L' ? -0.12 : 0.12, 0, kn];
  return P(o);
}

const COMBOS = [
  { w: 3, seq: ['jab'] }, { w: 4, seq: ['jab', 'cross'] }, { w: 3, seq: ['jab', 'cross', 'lhook'] },
  { w: 3, seq: ['jab', 'cross', 'legkick'] }, { w: 2, seq: ['lhook', 'cross', 'midkick'] }, { w: 2, seq: ['teep', 'cross'] },
  { w: 2, seq: ['jab', 'highkick'] }, { w: 3, seq: ['midkick'] }, { w: 3, seq: ['legkick'] }, { w: 1.5, seq: ['highkick'] },
  { w: 2, seq: ['teep'] }, { w: 2, seq: ['cross', 'rhook'] },
  { w: 1.3, seq: ['plum'] }, { w: 1.5, seq: ['rteep'] }, { w: 2, seq: ['jabB', 'crossB'] }, { w: 2, seq: ['jab', 'lhookB', 'cross'] }, { w: 2, seq: ['jabB', 'cross', 'midkick'] },
];
const PUNCH = new Set(['jab', 'cross', 'hook', 'elbow']);

// ---------- rig ----------
class Fighter {
  constructor(THREE) {
    const skin = new THREE.MeshLambertMaterial({ color: 0xb97a56 }), glove = new THREE.MeshLambertMaterial({ color: 0x2a62d9 });
    const black = new THREE.MeshLambertMaterial({ color: 0x15171c }), shorts = new THREE.MeshLambertMaterial({ color: 0x1f3fa8 });
    this.mats = [skin, glove, shorts];
    const cyl = (r0, r1, h, m, y) => { const o = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, 12), m); o.position.y = y; return o; };
    const G = () => new THREE.Group();

    this.root = G(); this.root.rotation.order = 'YXZ';
    this.model = G(); this.root.add(this.model);
    this.pelvis = G(); this.pelvis.position.y = 0.95; this.model.add(this.pelvis);
    const M = c => new THREE.MeshLambertMaterial({ color: c });
    const trim = M(0xf2c230), white = M(0xeeeeee), tape = M(0xe6e0d0), red = M(0xc22b2b), dsk = M(0x9c6444), band = M(0x1a1d26);
    // m(geometry, material, parent, x, y, z, sx, sy, sz): add a positioned (and optionally scaled) mesh
    const m = (geo, mat, parent, x, y, z, sx, sy, sz) => { const o = new THREE.Mesh(geo, mat); o.position.set(x || 0, y || 0, z || 0); if (sx) o.scale.set(sx, sy, sz); parent.add(o); return o; };
    const S = (r, w, h) => new THREE.SphereGeometry(r, w || 14, h || 10);

    // pelvis: wide muay thai trunks (waistband, knot, trim); each leg adds a flared trunk section that overlaps this
    this.pelvis.add(cyl(0.19, 0.225, 0.34, shorts, -0.04, 18));
    this.pelvis.add(cyl(0.197, 0.197, 0.06, trim, 0.115, 18));
    this.pelvis.add(cyl(0.232, 0.232, 0.028, trim, -0.2, 18));
    m(S(0.028, 8, 6), trim, this.pelvis, 0, 0.1, -0.2);
    this.torso = G(); this.torso.rotation.order = 'YXZ'; this.torso.position.y = 0.08; this.pelvis.add(this.torso);
    // torso: ribcage and abdomen as smooth ellipsoids, pecs, lats, traps, a few ab grooves
    m(S(0.2, 24, 18), skin, this.torso, 0, 0.3, 0.0, 1.05, 1.2, 0.7);
    m(new THREE.CylinderGeometry(0.145, 0.15, 0.26, 20), skin, this.torso, 0, 0.07, 0).scale.z = 0.8;
    for (const sx of [-1, 1]) {
      m(S(0.105, 16, 12), skin, this.torso, sx * 0.1, 0.37, -0.09, 1.05, 0.7, 0.55);            // pecs
      m(S(0.09), dsk, this.torso, sx * 0.19, 0.25, 0.0, 0.5, 1.3, 0.8);                         // lats
      m(S(0.085), skin, this.torso, sx * 0.1, 0.5, 0.0, 1.1, 0.55, 0.8);                        // traps
    }
    m(new THREE.BoxGeometry(0.006, 0.21, 0.006), dsk, this.torso, 0, 0.1, -0.121);              // abs: centre line + grooves
    for (let r = 0; r < 3; r++) m(new THREE.BoxGeometry(0.11, 0.006, 0.006), dsk, this.torso, 0, 0.02 + r * 0.07, -0.121);
    this.torso.add(cyl(0.062, 0.076, 0.12, skin, 0.55, 14));                                    // neck
    // head: skull + jaw, short hair, ears, brow / eyes / nose / mouth, red headband (no headgear)
    this.head = G(); this.head.rotation.order = 'YXZ'; this.head.position.y = 0.58; this.torso.add(this.head);
    m(S(0.105, 26, 18), skin, this.head, 0, 0.1, -0.005, 0.92, 1.1, 1.0);
    m(S(0.075, 18, 12), skin, this.head, 0, 0.035, -0.035, 0.95, 0.85, 0.95);
    m(S(0.11, 26, 14, 0, Math.PI * 2, 0, Math.PI * 0.58), black, this.head, 0, 0.115, 0.012, 0.95, 1.1, 1.04).rotation.x = 0.25;   // hair
    const hband = m(new THREE.TorusGeometry(0.1, 0.009, 8, 28), red, this.head, 0, 0.158, 0.004); hband.rotation.x = Math.PI / 2;
    for (const sx of [-1, 1]) {
      m(S(0.024, 8, 6), skin, this.head, sx * 0.098, 0.09, 0.0, 0.5, 1, 0.9);                    // ears
      m(S(0.014, 8, 6), white, this.head, sx * 0.037, 0.115, -0.097);                           // eyes
      m(S(0.008, 6, 5), black, this.head, sx * 0.037, 0.115, -0.108);
      m(new THREE.BoxGeometry(0.05, 0.011, 0.01), black, this.head, sx * 0.037, 0.141, -0.098).rotation.z = sx * 0.15;   // brows
    }
    const nose = m(new THREE.ConeGeometry(0.019, 0.05, 8), skin, this.head, 0, 0.075, -0.112); nose.rotation.x = -Math.PI / 2;
    m(S(0.017, 8, 6), skin, this.head, 0, 0.062, -0.12);
    m(new THREE.BoxGeometry(0.05, 0.006, 0.008), M(0x6b3b2b), this.head, 0, 0.03, -0.106);      // mouth

    const arm = (side) => {
      const sg = side === 'L' ? -1 : 1;
      const s = G(); s.position.set(sg * 0.235, 0.46, 0); this.torso.add(s);
      m(S(0.085, 14, 10), skin, s, 0, 0, 0);                                                      // shoulder cap
      s.add(cyl(0.062, 0.052, 0.3, skin, -0.15, 14));
      m(S(0.062), skin, s, 0, -0.1, -0.012, 1, 1.2, 1);                                           // bicep
      m(new THREE.CylinderGeometry(0.063, 0.063, 0.045, 14), red, s, 0, -0.13, 0);                // prajioud armband
      m(new THREE.CylinderGeometry(0.064, 0.064, 0.012, 14), trim, s, 0, -0.105, 0);
      const e = G(); e.position.y = -0.3; s.add(e);
      m(S(0.054, 12, 10), skin, e, 0, 0, 0);                                                      // elbow
      e.add(cyl(0.055, 0.042, 0.27, skin, -0.135, 14));
      m(S(0.055), skin, e, 0, -0.07, 0.0, 1, 1.5, 1);                                             // forearm belly
      m(new THREE.CylinderGeometry(0.047, 0.047, 0.08, 14), tape, e, 0, -0.255, 0);               // hand wraps
      const g = m(S(0.098, 18, 14), glove, e, 0, -0.35, 0, 1.0, 1.12, 1.15);
      m(S(0.045, 10, 8), glove, e, sg * 0.075, -0.33, -0.05);                                    // thumb
      m(new THREE.CylinderGeometry(0.07, 0.07, 0.08, 16), white, e, 0, -0.275, 0);                // glove cuff
      m(new THREE.CylinderGeometry(0.072, 0.072, 0.018, 16), red, e, 0, -0.31, 0);                // cuff stripe
      return { s, e };
    };
    const leg = (side) => {
      const sg = side === 'L' ? -1 : 1;
      const h = G(); h.position.set(sg * 0.11, -0.02, 0); this.pelvis.add(h);
      m(S(0.145, 16, 12), shorts, h, 0, 0.0, 0);                                                  // hip covered by the trunks, so no bare thigh shows at any angle
      h.add(cyl(0.108, 0.078, 0.45, skin, -0.225, 14));
      m(S(0.09), skin, h, 0, -0.2, -0.02, 1.05, 1.5, 1.1);                                        // quad
      h.add(cyl(0.15, 0.165, 0.38, shorts, -0.11, 18));                                           // flared trunk leg (reaches mid-thigh)
      h.add(cyl(0.166, 0.166, 0.026, trim, -0.296, 18));                                          // hem stripe
      const k = G(); k.position.y = -0.45; h.add(k);
      m(S(0.075, 12, 10), skin, k, 0, 0, -0.01);                                                  // knee
      k.add(cyl(0.075, 0.053, 0.42, skin, -0.21, 14));
      m(S(0.075), skin, k, 0, -0.12, 0.035, 1, 1.9, 1);                                           // calf
      m(new THREE.CylinderGeometry(0.057, 0.057, 0.05, 12), tape, k, 0, -0.34, 0);                // ankle wrap
      m(new THREE.CylinderGeometry(0.06, 0.06, 0.04, 12), tape, k, 0, -0.39, 0);
      const foot = m(new THREE.BoxGeometry(0.1, 0.06, 0.25), skin, k, 0, -0.45, -0.06);           // foot
      m(S(0.05, 10, 8), skin, k, 0, -0.455, -0.175, 1.05, 0.75, 1.0);                             // toes
      m(new THREE.BoxGeometry(0.09, 0.025, 0.1), band, k, 0, -0.485, 0.02);                       // heel
      return { h, k, foot };
    };
    this.footPos = new THREE.Vector3();
    this.A = { L: arm('L'), R: arm('R') }; this.Lg = { L: leg('L'), R: leg('R') };

    this.cur = STANCE.slice(); this.base = STANCE; this.anim = null; this.phase = 0; this.flash = 0; this.work = new Array(BN).fill(0);
  }

  play(def) {
    const keys = def.keys.map(k => ({ t: k.t, e: k.e, p: k.p }));
    keys[0].p = this.cur.slice(); if (!keys[keys.length - 1].p) keys[keys.length - 1].p = STANCE;
    this.anim = { def, keys, t: 0, u: 0, tmp: new Array(BN).fill(0) };
  }
  get u() { return this.anim ? this.anim.u : 1; }
  get playing() { return !!this.anim; }

  update(dt, moveSpeed, side) {
    const a = this.anim;
    if (a) {
      a.t += dt; a.u = Math.min(1, a.t / a.def.dur); evalTrack(a.keys, a.u, a.tmp);
      for (let i = 0; i < BN; i++) this.cur[i] = a.tmp[i];
      if (a.u >= 1) { if (a.def.hold) this.base = a.keys[a.keys.length - 1].p.slice(); this.anim = null; }
    } else {
      const k = 1 - Math.exp(-14 * dt);
      for (let i = 0; i < BN; i++) this.cur[i] += (this.base[i] - this.cur[i]) * k;
    }
    // procedural footwork: bounce and shuffling when moving
    this.phase += dt * (5.2 + moveSpeed * 1.5);
    const v = this.work; for (let i = 0; i < BN; i++) v[i] = this.cur[i];
    const idle = !a;
    if (idle) {
      v[21] += Math.max(0, Math.sin(this.phase)) * 0.025;
      const mv = Math.min(1, moveSpeed / 2), s = Math.sin(this.phase * 0.9) * 0.28 * mv;
      v[13] += s; v[17] -= s; v[16] += Math.max(0, -s) * 0.6; v[20] += Math.max(0, s) * 0.6;
      v[2] += Math.sin(this.phase) * 0.01; v[1] += Math.sin(this.phase * 0.5) * 0.03;
    }
    this._apply(v);
    this.flash = Math.max(0, this.flash - dt * 4);
    for (const m of this.mats) if (m.emissive) m.emissive.setRGB(this.flash * 0.7, this.flash * 0.15, this.flash * 0.1);
  }

  _apply(v) {
    const r = this.root;
    this.pelvis.rotation.y = v[0];
    this.torso.rotation.set(v[2], v[1], v[3]);
    this.head.rotation.set(v[4], -(v[0] + v[1]), 0);
    for (const [s, o] of [['L', 5], ['R', 9]]) { const A = this.A[s]; A.s.rotation.set(v[o], v[o + 2], v[o + 1]); A.e.rotation.x = v[o + 3]; }
    for (const [s, o] of [['L', 13], ['R', 17]]) { const G = this.Lg[s]; G.h.rotation.set(v[o], v[o + 2], v[o + 1]); G.k.rotation.x = -v[o + 3]; }
    // pelvis height from the longest (support) leg so planted feet stay on the floor
    const legH = o => 0.45 * Math.cos(v[o + 1]) * Math.cos(v[o]) + 0.45 * Math.cos(v[o + 1]) * Math.cos(v[o] - v[o + 3]) + 0.04;
    this.model.position.set(0, Math.min(0.2, Math.max(legH(13), legH(17)) - 0.95 - v[21]), -v[22]);
    r.userData.yawOffset = v[23]; r.userData.tilt = v[24];
  }
}

// ---------- AI ----------
class Bot {
  constructor(THREE, scene, ring) {
    this.ring = ring; this.f = new Fighter(THREE); scene.add(this.f.root);
    this.skill = 0.85; this.aggression = 1.0; this.playerStamina = 100; this.locked = false;
    // set by the game: difficulty (skill / aggression / reaction) and training behaviour ('spar' | 'dummy' | 'guard' | 'drill')
    this.baseAggr = 1; this.reactAdd = 0; this.mode = 'spar'; this.noDamage = false;
    this.onTelegraph = () => {}; this.onActive = () => {}; this.onKO = () => {}; this.onRevive = () => {};
    this.reset();
  }
  reset() {
    const r = this.ring; this.x = r.cx; this.z = r.cz - 2; this.y = r.y;
    this.hp = 100; this.ko = false; this.koT = 0; this.t = 0; this.facing = 0;
    this.vx = 0; this.vz = 0; this.kbx = 0; this.kbz = 0;
    this.attack = null; this.queue = []; this.cool = 1.2; this.gap = 0; this.def = null; this.react = null;
    this.stun = 0; this.strafe = Math.random() < 0.5 ? 1 : -1; this.strafeT = 2; this.evadeT = 0; this.speed = 0;
    this.stam = 100; this.locked = false; this._counter = null; this.hits = [];
    this.remote = { x: this.x, y: this.y, z: this.z, yaw: 0, hold: null, crouch: false };
    this.f.anim = null; this.f.base = STANCE; this.f.cur = STANCE.slice();
  }
  get dist() { return this.lastDist || 9; }
  inRing(x, z, m) { const r = this.ring; return Math.abs(x - r.cx) < r.hx + m && Math.abs(z - r.cz) < r.hz + m; }

  // --- being attacked ---
  notice(type, side, level) {
    if (this.ko || this.locked || this.stun > 0 || (this.attack && this.f.u < 0.35)) return;
    // reads the pattern: the more often the player repeats a strike, the more likely the bot is ready for it
    this.seen = this.seen || []; this.seen.push(type); if (this.seen.length > 6) this.seen.shift();
    const repeats = this.seen.filter(s => s === type).length - 1;
    if (Math.random() > Math.min(0.99, this.skill + repeats * 0.08)) return;
    const r = Math.random(), mySide = side === 'L' ? 'R' : side === 'R' ? 'L' : 'L', tired = this.stam < 20;
    let plan = null;
    // spammed or slow strikes get cut off: step in with a quick jab while the player is still mid-swing (lands as a critical)
    const spam = this.seen.length >= 4 && this.seen.slice(-4).every(s => s === 'jab' || s === 'cross');
    if (this.lastDist < 1.9 && (type !== 'jab') && this.stam > 15 && Math.random() < (spam ? 0.7 : 0.22) * this.skill) plan = { type: 'cut' };
    else if (spam && Math.random() < 0.5) plan = { type: Math.random() < 0.6 ? 'block' : 'evade' };
    if (plan) { this.react = { at: this.t + 0.04 + Math.random() * 0.05 + this.reactAdd, plan }; return; }
    // matching answers: block hooks, long guard / block the straights, check the kick at its own height, lean out of high kicks
    if (type === 'jab' || type === 'cross') plan = r < 0.45 ? { type: 'block' } : r < 0.75 ? { type: 'long' } : r < 0.95 ? { type: 'evade' } : null;
    else if (type === 'hook') plan = r < 0.7 ? { type: 'block' } : r < 0.95 ? { type: 'evade' } : null;
    else if (type === 'legkick') plan = r < 0.75 ? { type: 'check', level: 'low', side: mySide } : r < 0.92 ? { type: 'evade' } : null;
    else if (type === 'midkick') plan = r < 0.62 ? { type: 'check', level: 'mid', side: mySide } : r < 0.82 ? { type: 'block' } : r < 0.95 ? { type: 'evade' } : null;
    else if (type === 'highkick') plan = r < 0.6 ? { type: 'block' } : r < 0.8 ? { type: 'check', level: 'high', side: mySide } : r < 0.95 ? { type: 'evade' } : null;
    else if (type === 'teep') plan = r < 0.45 ? { type: 'long' } : r < 0.8 ? { type: 'check', level: 'mid', side: 'L' } : r < 0.95 ? { type: 'evade' } : null;
    if (plan) this.react = { at: this.t + 0.05 + Math.random() * 0.06 + (1 - this.skill) * 0.15 + this.reactAdd + (tired ? 0.08 : 0), plan };
  }
  // pick a counter-attack that fits what was just defended (or whiffed)
  _counterFor(type, res) {
    const r = Math.random();
    if (res === 'checked') return { seq: r < 0.5 ? ['cross', 'legkick'] : ['jab', 'cross'] };
    if (type === 'jab' || type === 'cross') return { seq: r < 0.4 ? ['cross', 'lhook'] : r < 0.7 ? ['lhookB', 'cross'] : ['jab', 'cross', 'legkick'] };
    if (type === 'hook') return { seq: r < 0.5 ? ['cross', 'lhook'] : ['legkick'] };
    if (type === 'teep') return { seq: r < 0.5 ? ['jab', 'cross'] : ['rteep'] };
    if (type === 'plum') return { seq: ['jab', 'cross'] };
    return { seq: r < 0.4 ? ['cross', 'lhook'] : r < 0.7 ? ['jab', 'midkick'] : ['jabB', 'cross'] };   // kicks leave the kicker off balance
  }
  _wantCounter(type, res) {
    if (Math.random() < 0.8 * this.skill && this.stam > 12) { this._counter = this._counterFor(type, res); this._counterUntil = this.t + 1.2; this.cool = Math.min(this.cool, 0.05); }
  }
  // the player leaned back / slipped: a read bot hits what that evasion can't avoid (body + leg shots after a lean, hooks after a slip)
  playerEvade(kind, dist) {
    if (this.mode !== 'spar' || this.ko || this.locked || this.attack || this.stun > 0 || this.def || dist > 2.3 || this.stam < 15) return;
    if (Math.random() > 0.55 * this.skill) return;
    const r = Math.random();
    const seq = kind === 'back' ? (r < 0.35 ? ['midkick'] : r < 0.65 ? ['legkick'] : ['jabB', 'crossB']) : (r < 0.5 ? ['lhook', 'cross'] : ['rhook', 'legkick']);
    this._counter = { seq, plain: true }; this._counterUntil = this.t + 0.7; this.cool = Math.min(this.cool, 0.12);
  }
  _defend(plan) {
    if (this.attack) return;
    if (plan.type === 'cut') { this._counter = { seq: Math.random() < 0.5 ? ['jab', 'cross'] : ['jab', 'lhook'], plain: true }; this._counterUntil = this.t + 0.5; this.cool = 0; return; }
    this.def = Object.assign({ until: this.t + 0.6 }, plan);
    if (plan.type === 'evade') { this.evadeT = 0.32; this.def.until = this.t + 0.4; }
    this.f.base = plan.type === 'check' ? checkPose(plan.side, plan.level) : BHOLD[plan.type];
  }
  // atk: { type, side (attacker's limb), level, reach, dmg, dist }
  receive(atk) {
    if (this.ko) return 'miss';
    if (atk.dist - this.f.cur[22] > atk.reach + 0.45) { if (!this.attack && !this.locked) this._wantCounter(atk.type, 'miss'); return 'miss'; }  // whiffed: punish it
    const mySide = atk.side === 'L' ? 'R' : atk.side === 'R' ? 'L' : 'C', d = this.def, type = atk.type;
    let res = 'hit';
    if (d) {
      if (d.type === 'block' && (PUNCH.has(type) || type === 'highkick' || type === 'midkick' || type === 'knee')) res = 'blocked';
      else if (d.type === 'long' && (type === 'jab' || type === 'cross' || type === 'teep')) res = 'blocked';
      else if (d.type === 'check' && d.level === atk.level && (type === 'legkick' || type === 'midkick' || type === 'highkick' || type === 'teep' || type === 'knee')) res = 'checked';
      else if (d.type === 'evade' && Math.random() < 0.5) res = 'dodged';
    } else if (PUNCH.has(type) && !this.attack && Math.random() < 0.32) res = 'blocked'; // guard held up in stance
    this.lastCrit = null; this.lastDmg = atk.dmg;
    if (res === 'hit') {                                        // caught mid-swing = critical; so is a hit right after the player's own defence
      let dmg = atk.dmg;
      if (this.attack) { dmg *= 1.6; this.lastCrit = 'INTERRUPTED'; } else if (atk.counter) { dmg *= 1.5; this.lastCrit = 'PERFECT COUNTER'; }
      if (atk.cap) dmg = Math.min(dmg, atk.cap);                  // combo bonus x crit can't stack past x2
      this.lastDmg = dmg; this._hurt(atk, dmg, this.lastCrit || (dmg < 5.5 && Math.random() < 0.45 ? 'light' : 'flinch'));
    }
    else if (res === 'blocked') { this._hurt(atk, atk.dmg * 0.15, null); this.kbx += atk.dx * 0.8; this.kbz += atk.dz * 0.8; this.stam = Math.min(100, this.stam + 5); }
    else if (res === 'checked') { this.kbx += atk.dx * 0.5; this.kbz += atk.dz * 0.5; }
    if (res !== 'hit' && !this.locked) {                       // a successful defence ends the guard early and opens a counter
      if (this.def) this.def.until = Math.min(this.def.until, this.t + 0.12);
      else this.def = { type: 'block', until: this.t + 0.12 };
      this._wantCounter(type, res);
    }
    return res;
  }
  _hurt(atk, dmg, anim) {
    if (!this.noDamage) this.hp = Math.max(0, this.hp - dmg);
    this.f.flash = anim && anim !== 'light' ? 1 : 0.4;
    if (anim === 'light') { this.hits.push(this.t); this.hits = this.hits.filter(h => this.t - h < 2.5); anim = null; }   // a jab-weight shot doesn't break its stance
    if (anim) {
      const crit = anim !== 'flinch';
      this.attack = null; this.queue.length = 0; this.def = null; this.react = null; this.f.base = STANCE;
      this.stun = crit ? 0.9 : 0.4; this.cool = 0.4 + Math.random() * 0.4; this.f.play(BFLINCH);
      this.kbx += atk.dx * (crit ? 3.4 : 2.2); this.kbz += atk.dz * (crit ? 3.4 : 2.2);
      // taking repeated shots: cover up (turtle) instead of trading
      this.hits.push(this.t); this.hits = this.hits.filter(h => this.t - h < 2.5);
      if (this.hits.length >= 2 && !this.ko) { this.react = { at: this.t + 0.45, plan: { type: 'block' } }; this._counter = null; this.hits.length = 0; }
    }
    if (this.hp <= 0 && !this.ko) { this.ko = true; this.koT = 0; this.attack = null; this.queue.length = 0; this.def = null; this.f.base = STANCE; this.f.play(BKO); this.onKO(); }
  }

  // the player checked / blocked the bot's attack: knock it off balance
  stagger() {
    if (this.ko) return;
    this.attack = null; this.queue.length = 0; this.def = null; this.react = null; this.f.base = STANCE;
    this.stun = 0.8; this.cool = 0.6; this.f.play(BSTAGGER);
  }

  // --- attacking ---
  _pickCombo(dist) {
    const ok = [];
    for (const c of COMBOS) {
      const first = BMOVES[c.seq[0]], need = first.reach + 0.1;
      if (dist <= need + 0.25) ok.push(c);
    }
    if (!ok.length) return null;
    let sum = 0; for (const c of ok) sum += c.w; let r = Math.random() * sum;
    for (const c of ok) { r -= c.w; if (r <= 0) return c; }
    return ok[0];
  }
  _launch(name, player) {
    const def = BMOVES[name]; this.attack = { name, def, fired: false, counter: !!this.comboCounter }; this.comboCounter = false; this.f.play(def);
    this.stam = Math.max(0, this.stam - (def.dmg * 1.4 + 2));
    this.f.base = STANCE; this.def = null;
    this.onTelegraph({ type: def.type, side: def.side, level: def.level, name });
  }

  update(dt, player) {
    const f = this.f, ring = this.ring; this.t += dt;
    if (this.mode === 'remote') {                       // versus: the body of the other player, driven by network state
      const n = this.remote, k = 1 - Math.exp(-16 * dt), ox = this.x, oz = this.z;
      this.x += (n.x - this.x) * k; this.z += (n.z - this.z) * k; this.y += (n.y - this.y) * k;
      let diff = n.yaw - this.facing; diff = Math.atan2(Math.sin(diff), Math.cos(diff)); this.facing += diff * k;
      if (!f.playing && !this.ko) {
        const h = n.hold;
        f.base = !h ? (n.crouch ? BCROUCH : STANCE) : h.type === 'check' ? checkPose(h.side, h.level) : BHOLD[h.type] || STANCE;
      }
      f.update(dt, Math.min(5, Math.hypot(this.x - ox, this.z - oz) / Math.max(dt, 1e-4)));
      f.root.position.set(this.x, this.y, this.z);
      f.root.rotation.set(f.root.userData.tilt || 0, this.facing + (f.root.userData.yawOffset || 0), 0);
      return;
    }
    if (this.locked) {                                  // clinched: the game positions and poses the bot
      f.update(dt, 0);
      f.root.position.set(this.x, this.y, this.z);
      f.root.rotation.set(0, this.facing, 0);
      return;
    }
    // stamina: spent by attacks, comes back while it isn't swinging; a gassed player makes it greedier
    this.stam = Math.min(100, this.stam + (this.attack ? 3 : 13) * dt);
    this.aggression = this.baseAggr * (1 + (this.playerStamina < 25 ? 0.6 : 0)) * (this.stam < 25 ? 0.5 : 1) * (this.hp < 30 ? 0.8 : 1);
    if (this.mode === 'drill') this.aggression = 0.4;
    if (this.mode === 'dummy' || this.mode === 'guard') {   // training dummy: stands its ground, faces the player, never attacks
      this.stun = Math.max(0, this.stun - dt); this.kbx = this.kbz = 0; this.attack = null; this.queue.length = 0; this.react = null; this._counter = null;
      const tx = player.pos.x - this.x, tz = player.pos.z - this.z, want = Math.atan2(-tx, -tz);
      let diff = want - this.facing; diff = Math.atan2(Math.sin(diff), Math.cos(diff)); this.facing += Math.max(-4 * dt, Math.min(4 * dt, diff));
      if (!f.playing && this.stun <= 0 && !this.ko) {
        f.base = this.mode === 'guard' ? BHOLD.block : STANCE;
        this.def = this.mode === 'guard' ? { type: 'block', until: 1e9 } : null;
      }
      f.update(dt, 0);
      f.root.position.set(this.x, this.y, this.z);
      f.root.rotation.set(f.root.userData.tilt || 0, this.facing + (f.root.userData.yawOffset || 0), 0);
      return;
    }
    const dx = player.pos.x - this.x, dz = player.pos.z - this.z, dist = Math.hypot(dx, dz); this.lastDist = dist;
    const engaged = this.inRing(player.pos.x, player.pos.z, 4) && !this.ko;

    // facing
    let tx = dx, tz = dz; if (!engaged) { tx = ring.cx - this.x; tz = ring.cz + 5 - this.z; }
    const want = Math.atan2(-tx, -tz); let diff = want - this.facing; diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    const turn = (this.attack && f.u > 0.2 ? 1.5 : 7) * dt; this.facing += Math.max(-turn, Math.min(turn, diff));

    let mvx = 0, mvz = 0;
    if (this.ko) {
      this.koT += dt;
      if (this.koT > 3.2 && f.base !== STANCE && !f.anim) { f.base = STANCE; }
      if (this.koT > 3.2 && this.koT < 3.3) this.onRevive();
      if (this.koT > 3.6) { this.reset(); }
    } else {
      this.stun = Math.max(0, this.stun - dt); this.cool -= dt; this.evadeT = Math.max(0, this.evadeT - dt);
      const nx = dist > 0.01 ? dx / dist : 0, nz = dist > 0.01 ? dz / dist : -1;
      if (this.react && this.t >= this.react.at) { this._defend(this.react.plan); this.react = null; }
      if (this.def && this.t >= this.def.until) { this.def = null; f.base = STANCE; this.cool = Math.min(this.cool, this._counter ? 0.05 : 0.25 + Math.random() * 0.35); }

      if (this.attack) {
        const a = this.attack;
        if (!a.fired && f.u >= a.def.active[0]) {
          a.fired = true;
          this.onActive({ type: a.def.type, side: a.def.side, level: a.def.level, reach: a.def.reach, dmg: a.def.dmg, name: a.name, counter: a.counter });
        }
        if (!f.playing) {
          this.attack = null; this.gap = 0.06 + Math.random() * 0.14;
          if (!this.queue.length) this.cool = (0.5 + Math.random() * 0.9) / this.aggression;
        }
      } else if (this.stun <= 0 && !this.def) {
        if (this.queue.length) {
          this.gap -= dt;
          if (this.gap <= 0) {
            const nxt = this.queue.shift(), need = BMOVES[nxt].reach + 0.5;
            if (engaged && dist <= need) this._launch(nxt, player); else this.queue.length = 0;
          }
        } else if (engaged && this.cool <= 0) {
          let c = null; this.comboCounter = false;
          if (this._counter) { const ct = this._counter; this._counter = null; if (this.t < this._counterUntil && dist <= BMOVES[ct.seq[0]].reach + 0.5) { c = ct; this.comboCounter = !ct.plain; } }
          if (!c) c = dist < 2.4 && this.stam > 8 ? this._pickCombo(dist) : null;
          if (c && this.mode === 'drill') c = { seq: [c.seq[0]] };      // drill: one telegraphed strike at a time
          if (c) { this.queue = c.seq.slice(); this.gap = 0; }
          else this.cool = 0.15;
        }
        // neutral footwork (only while not mid-combo)
        if (!this.queue.length && engaged) {
          this.strafeT -= dt; if (this.strafeT <= 0) { this.strafe = -this.strafe; this.strafeT = 1.2 + Math.random() * 2; }
          if (dist > 1.95) { mvx = nx * BOT_SPEED; mvz = nz * BOT_SPEED; }
          else if (dist < 1.25) { mvx = -nx * BOT_SPEED; mvz = -nz * BOT_SPEED; }
          else { mvx = -nz * this.strafe * 1.8; mvz = nx * this.strafe * 1.8; }
        } else if (!engaged) { // idle: drift back to the ring centre
          const cx = ring.cx - this.x, cz = ring.cz - 3 - this.z, cd = Math.hypot(cx, cz);
          if (cd > 1) { mvx = cx / cd * 1.5; mvz = cz / cd * 1.5; }
        }
      }
      if (this.evadeT > 0) { mvx = -nx * 4.5; mvz = -nz * 4.5; }
    }

    // integrate: smoothed walk velocity + decaying knockback, kept inside the ring
    const k = 1 - Math.exp(-10 * dt);
    this.vx += (mvx - this.vx) * k; this.vz += (mvz - this.vz) * k;
    this.kbx *= Math.exp(-6 * dt); this.kbz *= Math.exp(-6 * dt);
    this.x += (this.vx + this.kbx) * dt; this.z += (this.vz + this.kbz) * dt;
    this.x = Math.max(ring.cx - ring.hx + 0.5, Math.min(ring.cx + ring.hx - 0.5, this.x));
    this.z = Math.max(ring.cz - ring.hz + 0.5, Math.min(ring.cz + ring.hz - 0.5, this.z));
    this.speed = Math.hypot(this.vx, this.vz);

    f.update(dt, this.speed);
    f.root.position.set(this.x, this.y, this.z);
    f.root.rotation.set(f.root.userData.tilt || 0, this.facing + (f.root.userData.yawOffset || 0), 0);

    // Plant the standing foot: once a kick is underway pin the support foot's world position and shift the whole body
    // so the pivot / hip drive happens ON that foot instead of sliding across the canvas.
    const A = this.attack;
    if (A && /kick|teep/.test(A.def.type) && f.u >= 0.2 && !this.ko) {
      f.root.updateMatrixWorld(true);
      f.Lg[A.def.side === 'R' ? 'L' : 'R'].foot.getWorldPosition(f.footPos);
      if (!A.pin) A.pin = { x: f.footPos.x, z: f.footPos.z };
      else {
        const ex = A.pin.x - f.footPos.x, ez = A.pin.z - f.footPos.z;
        this.x += ex; this.z += ez; f.root.position.x += ex; f.root.position.z += ez;
      }
    }
  }
}
