'use strict';
// First-person fighter viewmodel: two gloved arms + two bare shins/feet, driven by keyframe tracks.
// Pose = [x, y, z, rx, ry, rz] in camera space (camera looks down -Z). A limb's mesh extends from its
// "end" (glove / foot) back along local +Z toward the body. Arms use the authored rotation; LEGS are
// aimed automatically from the foot toward a fixed hip anchor, so any foot path looks like a real leg.
//
// Moves are authored for the RIGHT side (jab is authored left) and mirrored for the other side.
// A move is a set of tracks: one per limb it drives, plus a camera track (the body: pivot, lean, step).
//   limb key:  K(t, pose, ease)          t in 0..1 of the move, ease of the segment ENDING at this key
//   cam key:   K(t, [yaw, pitch, roll, offsetX, offsetZ], ease)
// Ease: 's' smoothstep, 'i' ease-in (accelerating swing), 'o' ease-out (follow through), 'l' linear.

const mirrorPose = p => [-p[0], p[1], p[2], p[3], -p[4], -p[5]];
const mirrorCam = c => [-c[0], c[1], -c[2], -c[3], c[4]];

// Muay Thai guard: gloves up beside the cheeks, forearms near vertical, elbows tucked
const GUARD_R = [0.28, -0.13, -0.6, 1.2, 0.1, 0];
const GUARD_L = mirrorPose(GUARD_R);
const TIGHT_R = [0.2, -0.07, -0.56, 1.25, 0.08, 0];   // guard hand pulled in against the face while the other side works
const TIGHT_L = mirrorPose(TIGHT_R);
const HIGH_L = [-0.21, 0.0, -0.56, 1.25, -0.1, 0];  // lead hand raised beside the temple
const THROAT_R = [-0.04, -0.1, -0.5, 0.75, 1.15, 0.1];   // kicking-side glove across the throat, forearm angled back to the shoulder
const LEG_HIDE_R = [0.3, -1.1, -0.1, 0, 0, 0];
const LEG_HIDE_L = mirrorPose(LEG_HIDE_R);
const HIP_R = [0.2, -0.75, 0.2];                      // hip anchor (camera space) the leg points back to
const HIP_L = [-0.2, -0.75, 0.2];

const K = (t, p, e) => ({ t, p, e: e || 's' });
const other = s => (s === 'L' ? 'R' : 'L');

// ----- authored moves -----
// Roundhouse (tae): rear-side leg. Timeline (fraction of move):
//   0-.22 diagonal step + pivot on the lead foot (camera slides out and the hips start turning)
//   .22-.40 knee lifts and chambers out to the side, kicking-side arm drops and swings back
//   .40-.58 hips whip through, leg accelerates in a flat arc (shin strikes at ~.58)
//   .58-.72 follow through, torso carried round past the target
//   .72-1 foot comes back, pivot unwinds, guard re-forms
function roundhouse(o) {
  const yi = o.yi, yc = o.yc;
  return {
    limb: 'leg', dur: o.dur, active: [0.52, 0.66], reach: 1.9, impulse: o.impulse, step: 2.4,
    tracks: ({ side }) => ({
      // knee leads up and forward, foot tucked behind it (reference: high chamber before the shin whips out)
      leg: [K(0, null), K(0.2, [0.5, -0.95, 0.2, 0, 0, 0]), K(0.38, [0.95, yc - 0.1, 0.1, 0, 0, 0]),
        K(0.5, [0.68, yi, -0.72, 0, 0, 0], 'i'), K(0.58, [0.15, yi, -0.92, 0, 0, 0], 'l'),
        K(0.7, [-0.55, yi + 0.04, -0.6, 0, 0, 0], 'o'), K(0.86, [-0.3, -0.85, 0.05, 0, 0, 0]), K(1, LEG_HIDE_R)],
      // kicking-side (power) arm: whips back and wide as the leg chambers, then snaps across the body with the hips
      // same-side arm as the kicking leg: first covers the face (glove tight at the cheek while the knee chambers),
      // then drops down and back across the body as the hips whip the leg through
      // glove goes across the throat/chin ("choking himself") to shield the jaw before the arm whips down
      kArm: [K(0, null), K(0.2, THROAT_R), K(0.42, THROAT_R), K(0.6, [0.22, -0.55, -0.4, 0.7, 0.3, 0], 'i'), K(0.74, [-0.12, -0.62, -0.42, 0.55, 0.45, 0], 'o'),
        K(0.9, [0.2, -0.3, -0.55, 0.9, 0.2, 0]), K(1, GUARD_R)],
      // other arm stays high on the guard
      gArm: [K(0, null), K(0.22, HIGH_L), K(0.86, HIGH_L), K(1, GUARD_L)],
      // upright through the step, then the torso leans back as the leg whips through
      cam: [K(0, [0, 0, 0, 0, 0]), K(0.2, [0.08, 0.0, 0.02, -0.34, -0.3]), K(0.38, [0.3, o.pitch * 0.4 + 0.03, o.roll * 0.4, -0.36, -0.32]),
        K(0.58, [0.85, o.pitch + 0.14, o.roll, -0.3, -0.26], 'i'), K(0.72, [1.0, o.pitch * 0.8 + 0.1, o.roll * 0.8, -0.22, -0.22], 'o'),
        K(0.88, [0.28, o.pitch * 0.3, o.roll * 0.3, -0.08, -0.1]), K(1, [0, 0, 0, 0, 0])],
    }),
  };
}

const MOVES = {
  jab: {
    limb: 'hand', fixedSide: 'L', dur: 0.28, active: [0.3, 0.5], reach: 1.6, impulse: 2.2,
    tracks: () => ({
      hand: [K(0, null), K(0.34, [-0.05, -0.06, -1.1, 0.12, -0.04, 0], 'i'), K(0.5, [-0.05, -0.06, -1.1, 0.12, -0.04, 0]), K(1, GUARD_L, 'o')],
      gArm: [K(0, null), K(0.25, TIGHT_R), K(0.8, TIGHT_R), K(1, GUARD_R)],
      cam: [K(0, [0, 0, 0, 0, 0]), K(0.38, [0.03, -0.01, 0, 0, -0.1]), K(1, [0, 0, 0, 0, 0])],
    }),
  },
  cross: {
    limb: 'hand', fixedSide: 'R', dur: 0.38, active: [0.34, 0.5], reach: 1.65, impulse: 3.4,
    tracks: () => ({
      // thrown straight from the guard, no wind-up
      hand: [K(0, null), K(0.38, [0.04, -0.04, -1.15, 0.1, 0.05, 0], 'i'), K(0.58, [0.04, -0.04, -1.15, 0.1, 0.05, 0]), K(1, GUARD_R, 'o')],
      gArm: [K(0, null), K(0.2, TIGHT_L), K(0.8, TIGHT_L), K(1, GUARD_L)],
      // rear hip drives through: shoulders turn into the punch
      cam: [K(0, [0, 0, 0, 0, 0]), K(0.4, [0.2, -0.01, 0.02, -0.05, -0.12], 'i'), K(1, [0, 0, 0, 0, 0])],
    }),
  },
  hook: {
    limb: 'hand', dur: 0.46, active: [0.3, 0.5], reach: 1.4, impulse: 3.6,
    tracks: ({ side }) => ({
      // arcs out from the guard (elbow up and wide, never pulled back) and sweeps across the target
      hand: [K(0, null), K(0.2, [0.58, -0.14, -0.66, 0.25, 0.95, 0], 'o'), K(0.38, [0.12, -0.04, -0.85, 0.12, 0.6, 0], 'i'), K(0.58, [-0.34, -0.04, -0.74, 0.12, 0.34, 0], 'o'), K(1, GUARD_R)],
      gArm: [K(0, null), K(0.2, TIGHT_L), K(0.8, TIGHT_L), K(1, GUARD_L)],
      cam: [K(0, [0, 0, 0, 0, 0]), K(0.4, [0.38, 0, 0.04, -0.08, -0.08], 'i'), K(0.62, [0.44, 0, 0.03, -0.06, -0.06], 'o'), K(1, [0, 0, 0, 0, 0])],
    }),
  },
  legkick: roundhouse({ dur: 1.05, yi: -0.62, yc: -0.62, pitch: -0.06, roll: 0.03, impulse: 3.6 }),
  midkick: roundhouse({ dur: 1.15, yi: -0.3, yc: -0.4, pitch: -0.02, roll: 0.06, impulse: 4.2 }),
  highkick: roundhouse({ dur: 1.28, yi: 0.1, yc: -0.15, pitch: 0.07, roll: 0.13, impulse: 4.0 }),
  // Elbow: short horizontal slash. Hand is pulled tight beside the face and the elbow whips across, no wind-up
  elbow: {
    limb: 'hand', dur: 0.4, active: [0.3, 0.46], reach: 0.9, impulse: 3.0, step: 1.2,
    tracks: () => ({
      hand: [K(0, null), K(0.18, [0.3, 0.02, -0.34, 0.75, 1.15, 0.2], 'o'), K(0.4, [-0.22, 0.0, -0.5, 0.6, 0.15, -0.1], 'i'),
        K(0.56, [-0.3, 0.0, -0.5, 0.6, 0.0, -0.1]), K(1, GUARD_R, 'o')],
      gArm: [K(0, null), K(0.2, TIGHT_L), K(0.8, TIGHT_L), K(1, GUARD_L)],
      cam: [K(0, [0, 0, 0, 0, 0]), K(0.4, [0.3, 0.02, 0.04, -0.06, -0.12], 'i'), K(0.62, [0.34, 0.02, 0.03, -0.05, -0.1], 'o'), K(1, [0, 0, 0, 0, 0])],
    }),
  },
  // Knee: both hands drag the head down (clinch) while the hips drive forward and the knee rises through the target
  knee: {
    limb: 'leg', dur: 0.85, active: [0.42, 0.6], reach: 1.2, impulse: 4.4, step: 1.6,
    tracks: () => ({
      leg: [K(0, null), K(0.25, [0.2, -0.62, 0.05, 0, 0, 0]), K(0.46, [0.1, -0.28, -0.5, 0, 0, 0], 'i'),
        K(0.62, [0.1, -0.24, -0.5, 0, 0, 0]), K(0.84, [0.2, -0.7, 0.0, 0, 0, 0]), K(1, LEG_HIDE_R)],
      kArm: [K(0, null), K(0.25, [0.12, -0.12, -0.55, 0.9, -0.2, 0]), K(0.48, [0.08, -0.38, -0.5, 1.0, -0.1, 0], 'i'), K(0.7, [0.08, -0.38, -0.5, 1.0, -0.1, 0]), K(1, GUARD_R)],
      gArm: [K(0, null), K(0.25, [-0.12, -0.12, -0.55, 0.9, 0.2, 0]), K(0.48, [-0.08, -0.38, -0.5, 1.0, 0.1, 0], 'i'), K(0.7, [-0.08, -0.38, -0.5, 1.0, 0.1, 0]), K(1, GUARD_L)],
      cam: [K(0, [0, 0, 0, 0, 0]), K(0.25, [0, 0.03, 0, 0, 0.04]), K(0.48, [0, -0.1, 0, 0, -0.22], 'i'), K(0.68, [0, -0.08, 0, 0, -0.18], 'o'), K(1, [0, 0, 0, 0, 0])],
    }),
  },
  // Teep: knee drives up, hip thrusts forward and the ball of the foot pushes out; torso leans back
  teep: {
    limb: 'leg', dur: 0.98, active: [0.5, 0.66], reach: 2.0, impulse: 3.2, step: 0,
    tracks: () => ({
      leg: [K(0, null), K(0.28, [0.2, -0.5, -0.12, 0, 0, 0]), K(0.44, [0.14, -0.3, -0.45, 0, 0, 0]),
        K(0.56, [0.1, -0.04, -1.12, 0, 0, 0], 'i'), K(0.7, [0.1, -0.04, -1.12, 0, 0, 0]), K(0.86, [0.18, -0.62, -0.2, 0, 0, 0]), K(1, LEG_HIDE_R)],
      // hands stay up in the guard through a teep (the hips and leg do the work); gloves just tighten at the face
      kArm: [K(0, null), K(0.36, TIGHT_R), K(0.8, TIGHT_R), K(1, GUARD_R)],
      gArm: [K(0, null), K(0.3, TIGHT_L), K(0.82, TIGHT_L), K(1, GUARD_L)],
      // knee drives up, hips thrust forward and the torso leans back as the foot pushes out
      cam: [K(0, [0, 0, 0, 0, 0]), K(0.44, [0.0, 0.02, 0, 0, 0.02]), K(0.58, [0.0, 0.1, 0, 0, 0.2], 'i'), K(0.74, [0, 0.09, 0, 0, 0.17]), K(1, [0, 0, 0, 0, 0])],
    }),
  },
};

// Body-shot variants of the punches: same motion, thrown lower with the head dipping and the shoulders dropping
function bodyShot(def, label) {
  const lower = p => [p[0], p[1] - 0.3, p[2] + 0.05, p[3] + 0.45, p[4], p[5]];
  const mid = (a, i) => i === 0 || i === a.length - 1;
  return Object.assign({}, def, {
    label, reach: def.reach * 0.92,
    tracks: o => {
      const t = def.tracks(o);
      t.hand = t.hand.map((k, i, a) => (mid(a, i) ? k : K(k.t, lower(k.p), k.e)));
      t.cam = t.cam.map((k, i, a) => (mid(a, i) ? k : K(k.t, [k.p[0], k.p[1] - 0.09, k.p[2], k.p[3], k.p[4] - 0.1], k.e)));
      return t;
    },
  });
}
MOVES.jabB = bodyShot(MOVES.jab, 'BODY JAB');
MOVES.crossB = bodyShot(MOVES.cross, 'BODY CROSS');
MOVES.hookB = bodyShot(MOVES.hook, 'BODY HOOK');

// Held (continuous) poses
const CHECK_FOOT_Y = { low: -0.55, mid: -0.3, high: -0.02 };
function holdPoses(h) {
  const out = {};
  if (h.longGuard) { out.LH = [-0.1, -0.06, -1.0, 0.14, -0.06, 0]; out.RH = [0.17, -0.1, -0.42, 0.6, 0.2, 0]; }
  if (h.block === 'L') { out.LH = [-0.17, 0.02, -0.4, 1.0, -0.12, 0.2]; out.RH = [0.12, -0.14, -0.4, 0.7, 0.18, 0]; }
  if (h.block === 'R') { out.RH = [0.17, 0.02, -0.4, 1.0, 0.12, -0.2]; out.LH = [-0.12, -0.14, -0.4, 0.7, -0.18, 0]; }
  if (h.check) { // knee up, shin turned out to catch the kick
    const L = h.checkSide === 'L';
    out[L ? 'LL' : 'RL'] = [L ? -0.26 : 0.26, CHECK_FOOT_Y[h.check], -0.5, 0, 0, 0];
  }
  // muay thai plum: 'hold' = both gloves locked behind the opponent's head; 'held' = being pulled down, hands shoving at the chest
  if (h.clinch === 'hold') { out.LH = [-0.1, -0.27, -0.66, 0.65, 0.3, 0]; out.RH = [0.1, -0.27, -0.66, 0.65, -0.3, 0]; }
  if (h.clinch === 'held') { out.LH = [-0.2, -0.28, -0.62, 0.6, -0.15, 0]; out.RH = [0.2, -0.28, -0.62, 0.6, 0.15, 0]; }
  return out;
}

const EASE = { s: f => f * f * (3 - 2 * f), i: f => f * f, o: f => 1 - (1 - f) * (1 - f), l: f => f };
function evalTrack(keys, u, out) {
  let i = 0; while (i < keys.length - 2 && u > keys[i + 1].t) i++;
  const k0 = keys[i], k1 = keys[i + 1];
  let f = (u - k0.t) / (k1.t - k0.t); f = f < 0 ? 0 : f > 1 ? 1 : f; f = EASE[k1.e](f);
  for (let j = 0; j < out.length; j++) out[j] = k0.p[j] + (k1.p[j] - k0.p[j]) * f;
}

class ViewModel {
  constructor(THREE, camera) {
    this.THREE = THREE;
    this.root = new THREE.Group(); camera.add(this.root);
    this.skin = new THREE.MeshLambertMaterial({ color: 0xc98f6b });
    const glove = c => new THREE.MeshLambertMaterial({ color: c });
    const M = c => new THREE.MeshLambertMaterial({ color: c });
    const white = M(0xf2f2f2), red = M(0xc22b2b), dark = M(0x2a1a14), tape = M(0xe9e4d6), trunks = M(0x1f5fbf), trim = M(0xf2c230);
    const mesh = (geo, m, parent, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x || 0, y || 0, z || 0); parent.add(o); return o; };
    const arm = (side) => {
      const g = new THREE.Group(), gm = glove(0xc22b2b), sg = side === 'L' ? 1 : -1;
      const fist = mesh(new THREE.SphereGeometry(0.068, 24, 16), gm, g); fist.scale.set(1.05, 0.95, 1.3);
      mesh(new THREE.SphereGeometry(0.05, 14, 10), gm, g, 0, 0.0, 0.08).scale.set(1.05, 1, 1.2);               // back of the glove
      mesh(new THREE.SphereGeometry(0.043, 12, 10), gm, g, sg * 0.072, 0.012, 0.0);                             // thumb
      mesh(new THREE.CylinderGeometry(0.058, 0.064, 0.1, 16), white, g, 0, 0, 0.17).rotation.x = Math.PI / 2;     // glove cuff
      mesh(new THREE.CylinderGeometry(0.059, 0.059, 0.022, 16), red, g, 0, 0, 0.12).rotation.x = Math.PI / 2;     // cuff stripe
      for (let i = 0; i < 3; i++) mesh(new THREE.CylinderGeometry(0.052 + i * 0.002, 0.052 + i * 0.002, 0.03, 14), tape, g, 0, 0, 0.26 + i * 0.045).rotation.x = Math.PI / 2; // hand wraps
      const fore = mesh(new THREE.CylinderGeometry(0.052, 0.07, 1.05, 16), this.skin, g, 0, 0, 0.83); fore.rotation.x = Math.PI / 2;
      mesh(new THREE.SphereGeometry(0.075, 12, 10), this.skin, g, 0, 0.0, 0.58).scale.set(1, 1, 1.9);        // forearm muscle belly
      return g;
    };
    // Leg: thigh + shin solved by two-bone IK each frame (see _legIK). Shin/thigh are unit-height cylinders
    // stretched between joints, so the knee actually bends instead of a rigid stick swinging.
    const unitCyl = (r0, r1, m, seg) => new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, 1, seg || 16), m);
    const leg = (side) => {
      const g = new THREE.Group();
      const L = { g, side };
      L.thigh = unitCyl(0.098, 0.082, this.skin); g.add(L.thigh);
      L.shorts = unitCyl(0.165, 0.128, trunks); g.add(L.shorts);
      L.hem = unitCyl(0.131, 0.131, trim); g.add(L.hem);
      L.knee = mesh(new THREE.SphereGeometry(0.088, 16, 12), this.skin, g);
      L.shin = unitCyl(0.082, 0.062, this.skin); g.add(L.shin);
      L.calf = mesh(new THREE.SphereGeometry(0.1, 16, 12), this.skin, g);
      L.ankle = unitCyl(0.07, 0.066, tape, 14); g.add(L.ankle);
      L.wrap2 = unitCyl(0.073, 0.073, tape, 14); g.add(L.wrap2);
      L.foot = new THREE.Group(); g.add(L.foot);                       // oriented in _legIK; toes along local -Z, sole toward local -Y
      mesh(new THREE.BoxGeometry(0.115, 0.075, 0.27), this.skin, L.foot, 0, -0.035, -0.07);
      mesh(new THREE.SphereGeometry(0.058, 12, 10), this.skin, L.foot, 0, -0.03, -0.185).scale.set(1.0, 0.7, 1.1);   // ball of the foot / toes
      mesh(new THREE.BoxGeometry(0.1, 0.03, 0.1), dark, L.foot, 0, -0.075, 0.0);                                       // heel
      for (let i = 0; i < 5; i++) mesh(new THREE.SphereGeometry(0.017, 6, 5), this.skin, L.foot, (i - 2) * 0.021 * (side === 'L' ? 1 : -1), -0.04, -0.235 + Math.abs(i - 2) * 0.01);
      mesh(new THREE.CylinderGeometry(0.066, 0.075, 0.05, 14), white, L.foot, 0, 0.012, 0.0);                          // ankle sock band
      return L;
    };
    this.legs = { LL: leg('L'), RL: leg('R') };
    this.limbs = { LH: arm('L'), RH: arm('R'), LL: this.legs.LL.g, RL: this.legs.RL.g };
    for (const k in this.limbs) this.root.add(this.limbs[k]);

    this.cur = { LH: GUARD_L.slice(), RH: GUARD_R.slice(), LL: LEG_HIDE_L.slice(), RL: LEG_HIDE_R.slice() };
    this.holds = { block: null, longGuard: false, check: null, checkSide: 'R' };
    this.action = null; this.pending = null; this.name = '';
    // body motion the main loop applies to the camera: yaw/pitch/roll + sideways/forward offset
    this.camKick = { yaw: 0, pitch: 0, roll: 0, ox: 0, oz: 0 };
    this.onActive = () => {}; this.onStart = () => {};
    this.sway = { x: 0, y: 0 }; this.lastYaw = 0; this.lastPitch = 0; this.clp = 0;
  }

  // Start (or queue) a move. Returns true if it started immediately.
  trigger(name, sideMod) {
    const def = MOVES[name]; if (!def) return false;
    const side = def.fixedSide || (sideMod ? 'L' : 'R');
    const a = this.action;
    if (a && a.u < 0.8) { this.pending = { name, side, age: 0 }; return false; }
    this._start(name, side); return true;
  }

  _start(name, side) {
    const def = MOVES[name], raw = def.tracks({ side });
    // Authored side: right, except jab (left). Mirror when the requested side differs.
    const authored = def.fixedSide === 'L' ? 'L' : 'R', flip = side !== authored;
    const ownKey = def.limb === 'hand' ? side + 'H' : side + 'L';
    const tracks = [];
    for (const k in raw) {
      let limb, isCam = k === 'cam';
      if (k === 'hand' || k === 'leg') limb = ownKey;
      else if (k === 'kArm') limb = side + 'H';            // kicking-side arm
      else if (k === 'gArm') limb = other(side) + 'H';     // guard arm
      const keys = raw[k].map(kf => ({ t: kf.t, e: kf.e, p: kf.p && (flip ? (isCam ? mirrorCam(kf.p) : mirrorPose(kf.p)) : kf.p) }));
      if (!isCam) keys[0].p = this.cur[limb].slice(); else keys[0].p = [0, 0, 0, 0, 0];
      tracks.push({ limb, isCam, keys, tmp: new Array(isCam ? 5 : 6).fill(0) });
    }
    this.action = { name, side, def, tracks, t: 0, u: 0, fired: false, limbs: tracks.filter(t => !t.isCam).map(t => t.limb) };
    this.pending = null; this.name = (def.label || name.toUpperCase()) + (def.fixedSide ? '' : ' (' + side + ')');
    this.onStart(name, side, def);
  }

  setHolds(h) { Object.assign(this.holds, h); }
  get busy() { return !!this.action; }
  get label() {
    if (this.action) return this.name;
    const h = this.holds;
    if (h.clinch) return h.clinch === 'hold' ? 'PLUM CLINCH' : 'IN THE PLUM';
    if (h.check) return 'CHECK ' + h.check.toUpperCase() + ' (' + h.checkSide + ')';
    if (h.longGuard) return 'LONG GUARD';
    if (h.block) return 'BLOCK ' + h.block;
    return '';
  }

  _lerpPose(a, b, k) { for (let i = 0; i < 6; i++) a[i] += (b[i] - a[i]) * k; }

  update(dt, ctx) {
    const a = this.action, ck = this.camKick; ck.yaw = ck.pitch = ck.roll = ck.ox = ck.oz = 0;
    if (a) {
      a.t += dt; a.u = Math.min(1, a.t / a.def.dur);
      for (const tr of a.tracks) {
        evalTrack(tr.keys, a.u, tr.tmp);
        if (tr.isCam) { ck.yaw = tr.tmp[0]; ck.pitch = tr.tmp[1]; ck.roll = tr.tmp[2]; ck.ox = tr.tmp[3]; ck.oz = tr.tmp[4]; }
        else { const c = this.cur[tr.limb]; for (let i = 0; i < 6; i++) c[i] = tr.tmp[i]; }
      }
      if (!a.fired && a.u >= a.def.active[0]) { a.fired = true; this.onActive(a.name, a.side, a.def); }
      if (a.u >= 1) { this.action = null; this.name = ''; if (this.pending) this._start(this.pending.name, this.pending.side); }
    }
    if (this.pending) { this.pending.age += dt; if (this.pending.age > 0.3) this.pending = null; }

    // ---- base + hold poses for limbs not driven by an action ----
    const sp = ctx.speed, bob = ctx.bobPhase, mv = Math.min(1, sp / 8), grounded = ctx.grounded;
    const base = { LH: GUARD_L.slice(), RH: GUARD_R.slice(), LL: LEG_HIDE_L.slice(), RL: LEG_HIDE_R.slice() };
    if (ctx.mantle) { base.LH = [-0.26, -0.4, -0.5, 1.15, -0.1, 0]; base.RH = [0.26, -0.4, -0.5, 1.15, 0.1, 0]; }
    else if (ctx.sliding) { base.LH = [-0.3, -0.36, -0.55, 0.8, -0.25, -0.1]; base.RH = [0.3, -0.36, -0.55, 0.8, 0.25, 0.1]; }
    else if (!grounded) { base.LH[1] += 0.03; base.RH[1] += 0.03; base.LH[2] -= 0.04; base.RH[2] -= 0.04; }
    else if (sp > 6.2 && ctx.sprinting) {
      const s1 = Math.sin(bob * 2) * 0.03, s2 = Math.cos(bob * 2) * 0.03;
      base.LH[1] += -0.05 + s1; base.RH[1] += -0.05 + s2; base.LH[2] += 0.05 + s2; base.RH[2] += 0.05 + s1;
    }
    const hold = holdPoses(this.holds), driven = a ? a.limbs : [];
    for (const k in hold) if (!driven.includes(k)) base[k] = hold[k];
    const rate = 1 - Math.exp(-22 * dt);
    for (const k in this.cur) if (!driven.includes(k)) this._lerpPose(this.cur[k], base[k], rate);

    // ---- viewmodel lags view turns, breathing, step bob ----
    let dy = ctx.yaw - this.lastYaw, dp = ctx.pitch - this.lastPitch; this.lastYaw = ctx.yaw; this.lastPitch = ctx.pitch;
    dy = Math.max(-0.15, Math.min(0.15, dy)); dp = Math.max(-0.15, Math.min(0.15, dp));
    const sr = 1 - Math.exp(-10 * dt);
    this.sway.x += (dy * 0.9 - this.sway.x) * sr; this.sway.y += (-dp * 0.9 - this.sway.y) * sr;
    const br = Math.sin(ctx.time * 1.9) * 0.004;
    const bx = grounded ? Math.cos(bob) * 0.012 * mv : 0, by = grounded ? Math.abs(Math.sin(bob)) * -0.016 * mv : 0;

    // ---- apply ----
    for (const k in this.limbs) {
      const p = this.cur[k], g = this.limbs[k];
      const ox = this.sway.x + bx, oy = this.sway.y + by + br - ctx.landDip * 0.8;
      if (k[1] === 'L') this._legIK(this.legs[k], k[0] === 'L' ? HIP_L : HIP_R, p, ox, oy);
      else {
        g.position.set(p[0] + ox, p[1] + oy, p[2]);
        g.rotation.set(p[3], p[4], p[5]);
      }
    }
    // plum: the head gets pulled down (and shaken when we're the one being held)
    const cl = this.holds.clinch, tgtP = cl === 'hold' ? -0.04 : cl === 'held' ? -0.4 : 0;
    this.clp += (tgtP - this.clp) * (1 - Math.exp(-6 * dt));
    ck.pitch += this.clp;
    if (cl === 'held') { ck.roll += Math.sin(ctx.time * 11) * 0.03; ck.yaw += Math.sin(ctx.time * 7.3) * 0.025; }
    this.root.rotation.z = -ctx.roll * 0.6;
  }

  // Two-bone IK: hip anchor -> knee -> ankle(foot pose). If the foot is out of reach the hip is dragged toward
  // it (the body lunges into the kick) so the foot always lands exactly where the animation says.
  _legIK(L, hip0, p, ox, oy) {
    const T = this.THREE, V = this._v || (this._v = { h: new T.Vector3(), a: new T.Vector3(), d: new T.Vector3(), pole: new T.Vector3(), perp: new T.Vector3(),
      knee: new T.Vector3(), s: new T.Vector3(), t: new T.Vector3(), x: new T.Vector3(), y: new T.Vector3(), z: new T.Vector3(), q: new T.Vector3(), m: new T.Matrix4(), up: new T.Vector3(0, 1, 0) });
    const A = 0.5, B = 0.48, sgn = L.side === 'L' ? -1 : 1;           // thigh / shin length
    V.h.set(hip0[0] + ox, hip0[1] + oy, hip0[2]); V.a.set(p[0] + ox, p[1] + oy, p[2]);
    V.d.subVectors(V.a, V.h); let d = V.d.length();
    const maxR = (A + B) * 0.985;
    if (d > maxR) { V.h.addScaledVector(V.d.normalize(), d - maxR); V.d.subVectors(V.a, V.h); d = V.d.length(); }
    V.d.normalize();
    d = Math.max(Math.abs(A - B) + 0.02, Math.min(maxR, d));
    const x = (A * A - B * B + d * d) / (2 * d), hh = Math.sqrt(Math.max(0, A * A - x * x));
    V.pole.set(sgn * 0.45, 0.75, -0.35);                                // knees lead up and slightly outward
    V.perp.copy(V.pole).addScaledVector(V.d, -V.pole.dot(V.d));
    if (V.perp.lengthSq() < 1e-4) V.perp.set(0, 1, 0);
    V.perp.normalize();
    V.knee.copy(V.h).addScaledVector(V.d, x).addScaledVector(V.perp, hh);

    const place = (m, P, Q, t0, t1) => {                              // stretch a unit cylinder between P+(Q-P)t0 .. P+(Q-P)t1
      V.q.subVectors(Q, P); const len = V.q.length(); if (len < 1e-4) { m.visible = false; return; }
      m.visible = true; V.q.divideScalar(len);
      m.position.copy(P).addScaledVector(V.q, len * (t0 + t1) / 2); m.scale.y = len * (t1 - t0);
      m.quaternion.setFromUnitVectors(V.up, V.q);
    };
    place(L.thigh, V.h, V.knee, 0, 1);
    place(L.shorts, V.h, V.knee, 0, 0.62);
    place(L.hem, V.h, V.knee, 0.6, 0.64);
    place(L.shin, V.knee, V.a, 0, 1);
    place(L.ankle, V.a, V.knee, 0, 0.17);
    place(L.wrap2, V.a, V.knee, 0.2, 0.24);
    L.knee.position.copy(V.knee);
    V.s.subVectors(V.a, V.knee).normalize();                          // shin direction (knee -> ankle)
    L.calf.position.copy(V.knee).addScaledVector(V.s, B * 0.3).addScaledVector(V.perp, -0.05); L.calf.scale.set(1, 1.55, 1);
    L.calf.quaternion.setFromUnitVectors(V.up, V.s);

    // foot: toes follow the shin as the leg extends (pointed instep on a kick), hang forward when it is down
    const e = 1 - Math.abs(V.s.y);
    V.t.set(0, 0, -1).multiplyScalar(1 - e * 0.5).addScaledVector(V.s, 0.35 + 0.6 * e);
    V.t.normalize();
    V.y.set(0, 1, 0).addScaledVector(V.s, -0.35 * (1 - e)); V.y.addScaledVector(V.t, -V.y.dot(V.t)).normalize();   // dorsum stays roughly up
    V.z.copy(V.t).multiplyScalar(-1); V.x.crossVectors(V.y, V.z).normalize();
    V.m.makeBasis(V.x, V.y, V.z); L.foot.quaternion.setFromRotationMatrix(V.m);
    L.foot.position.copy(V.a);
  }
}

