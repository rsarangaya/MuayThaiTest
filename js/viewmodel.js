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

const GUARD_R = [0.3, -0.27, -0.62, 0.5, 0.2, 0];
const GUARD_L = mirrorPose(GUARD_R);
const TIGHT_R = [0.2, -0.13, -0.5, 0.65, 0.15, 0];   // guard hand pulled up to the chin while the other side works
const TIGHT_L = mirrorPose(TIGHT_R);
const HIGH_L = [-0.2, -0.02, -0.5, 0.85, -0.15, 0];  // lead hand raised beside the temple
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
      leg: [K(0, null), K(0.2, [0.55, -1.0, 0.25, 0, 0, 0]), K(0.38, [1.2, yc, -0.1, 0, 0, 0]),
        K(0.5, [0.68, yi, -0.72, 0, 0, 0], 'i'), K(0.58, [0.15, yi, -0.92, 0, 0, 0], 'l'),
        K(0.7, [-0.55, yi + 0.04, -0.6, 0, 0, 0], 'o'), K(0.86, [-0.3, -0.85, 0.05, 0, 0, 0]), K(1, LEG_HIDE_R)],
      // kicking-side (power) arm: whips back and wide as the leg chambers, then snaps across the body with the hips
      kArm: [K(0, null), K(0.22, [0.9, -0.65, 0.1, 0.7, -0.5, 0]), K(0.42, [1.0, -0.8, 0.2, 0.7, -0.6, 0]),
        K(0.58, [0.2, -0.5, -0.5, 0.8, 0.3, 0], 'i'), K(0.72, [-0.15, -0.48, -0.5, 0.8, 0.4, 0], 'o'),
        K(0.88, [0.2, -0.3, -0.55, 0.6, 0.2, 0]), K(1, GUARD_R)],
      // lead arm swings up to a high guard and stays there
      gArm: [K(0, null), K(0.24, HIGH_L), K(0.86, HIGH_L), K(1, GUARD_L)],
      cam: [K(0, [0, 0, 0, 0, 0]), K(0.2, [0.08, o.pitch * 0.3, 0.02, -0.34, -0.3]), K(0.38, [0.14, o.pitch * 0.6, o.roll * 0.4, -0.36, -0.32]),
        K(0.58, [0.5, o.pitch, o.roll, -0.3, -0.34], 'i'), K(0.72, [0.64, o.pitch * 0.8, o.roll * 0.8, -0.22, -0.28], 'o'),
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
      leg: [K(0, null), K(0.28, [0.2, -0.6, -0.12, 0, 0, 0]), K(0.44, [0.14, -0.42, -0.45, 0, 0, 0]),
        K(0.56, [0.1, -0.18, -1.12, 0, 0, 0], 'i'), K(0.7, [0.1, -0.18, -1.12, 0, 0, 0]), K(0.86, [0.18, -0.62, -0.2, 0, 0, 0]), K(1, LEG_HIDE_R)],
      kArm: [K(0, null), K(0.36, [0.75, -0.55, -0.05, 0.7, -0.4, 0]), K(0.8, [0.7, -0.5, -0.05, 0.7, -0.35, 0]), K(1, GUARD_R)],
      gArm: [K(0, null), K(0.3, HIGH_L), K(0.82, HIGH_L), K(1, GUARD_L)],
      cam: [K(0, [0, 0, 0, 0, 0]), K(0.44, [0.04, 0.03, 0, 0, 0.05]), K(0.58, [0.0, 0.07, 0, 0, 0.14], 'i'), K(0.74, [0, 0.06, 0, 0, 0.12]), K(1, [0, 0, 0, 0, 0])],
    }),
  },
};

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
    const arm = (side) => {
      const g = new THREE.Group(), gm = glove(0xc22b2b);
      const fist = new THREE.Mesh(new THREE.SphereGeometry(0.075, 20, 14), gm); fist.scale.set(1, 0.92, 1.25); g.add(fist);
      const thumb = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), gm); thumb.position.set(side === 'L' ? 0.07 : -0.07, 0.01, 0.0); g.add(thumb);
      const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.07, 0.14, 14), new THREE.MeshLambertMaterial({ color: 0xf2f2f2 }));
      cuff.rotation.x = Math.PI / 2; cuff.position.z = 0.17; g.add(cuff);
      const fore = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.1, 12), this.skin);
      fore.rotation.x = Math.PI / 2; fore.position.z = 0.78; g.add(fore);
      return g;
    };
    const leg = () => {
      const g = new THREE.Group();
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.34), this.skin); foot.position.set(0, -0.01, -0.03); g.add(foot);
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), this.skin); ball.position.set(0, -0.01, -0.17); g.add(ball);
      const wrap = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.064, 0.3, 12), new THREE.MeshLambertMaterial({ color: 0xeeeeee }));
      wrap.rotation.x = Math.PI / 2; wrap.position.z = 0.28; g.add(wrap);
      const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.068, 1.3, 12), this.skin);
      shin.rotation.x = Math.PI / 2; shin.position.z = 1.1; g.add(shin);
      const shorts = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 0.6, 12), new THREE.MeshLambertMaterial({ color: 0x1f5fbf }));
      shorts.rotation.x = Math.PI / 2; shorts.position.z = 1.9; g.add(shorts);
      return g;
    };
    this.limbs = { LH: arm('L'), RH: arm('R'), LL: leg(), RL: leg() };
    for (const k in this.limbs) this.root.add(this.limbs[k]);

    this.cur = { LH: GUARD_L.slice(), RH: GUARD_R.slice(), LL: LEG_HIDE_L.slice(), RL: LEG_HIDE_R.slice() };
    this.holds = { block: null, longGuard: false, check: null, checkSide: 'R' };
    this.action = null; this.pending = null; this.name = '';
    // body motion the main loop applies to the camera: yaw/pitch/roll + sideways/forward offset
    this.camKick = { yaw: 0, pitch: 0, roll: 0, ox: 0, oz: 0 };
    this.onActive = () => {}; this.onStart = () => {};
    this.sway = { x: 0, y: 0 }; this.lastYaw = 0; this.lastPitch = 0;
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
    this.pending = null; this.name = name.toUpperCase() + (def.fixedSide ? '' : ' (' + side + ')');
    this.onStart(name, side, def);
  }

  setHolds(h) { Object.assign(this.holds, h); }
  get busy() { return !!this.action; }
  get label() {
    if (this.action) return this.name;
    const h = this.holds;
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
      g.position.set(p[0] + this.sway.x + bx, p[1] + this.sway.y + by + br - ctx.landDip * 0.8, p[2]);
      if (k[1] === 'L') { // leg: aim the shin from the foot back to the hip anchor
        const hip = k[0] === 'L' ? HIP_L : HIP_R, dx = hip[0] - p[0], dyy = hip[1] - p[1], dz = hip[2] - p[2];
        g.rotation.set(-Math.atan2(dyy, Math.hypot(dx, dz)), Math.atan2(dx, dz), p[5]);
      } else g.rotation.set(p[3], p[4], p[5]);
    }
    this.root.rotation.z = -ctx.roll * 0.6;
  }
}
