'use strict';
// Apex-style movement. Fixed-timestep, Source-style accelerate/friction core with:
//  sprint, crouch, slide (+slope acceleration, steering, slide-jump), auto bunny-hop,
//  air strafing, tap-strafe, ledge mantle, wall bounce, superglide, jump pads.
// Units: metres / seconds. Camera forward at yaw 0 is -Z.
const PC = {
  R: 0.4, HS: 1.8, HC: 1.0, STEP: 0.5,
  G: 24, JUMP: 8.4,
  WALK: 4.8, SPRINT: 7.8, CROUCH: 3.4,
  ACCEL: 8, FRICTION: 7, STOP: 2.2,
  AIR_ACCEL: 8, AIR_CAP: 1.5,
  SLIDE_FRIC: 1.1, SLIDE_MIN: 6.4, SLIDE_MAX: 11.5, SLIDE_CD: 0.35,
  MANTLE_GROUND: 1.7, MANTLE_AIR: 2.4,
  SOFT_CAP: 22,
};

class Player {
  constructor(solids, pads, mapApi) {
    this.solids = solids; this.pads = pads; this.map = mapApi;
    this.pos = { x: 0, y: 0, z: 0 }; this.prev = { x: 0, y: 0, z: 0 };
    this.vel = { x: 0, y: 0, z: 0 };
    this.yaw = 0; this.pitch = 0;
    this.input = { fwd: 0, side: 0, jump: false, crouch: false, sprint: false };
    this.onEvent = () => {};
    this.respawn({ x: 0, z: 0, yaw: 0 });
  }

  respawn(s) {
    Object.assign(this.pos, { x: s.x, y: 0, z: s.z }); Object.assign(this.prev, this.pos);
    Object.assign(this.vel, { x: 0, y: 0, z: 0 });
    this.yaw = s.yaw || 0; this.pitch = 0;
    this.t = 0; this.onGround = true; this.crouched = false; this.sliding = false;
    this.mantle = null; this.canBounce = true; this.airTime = 0; this.groundTime = 0;
    this.groundN = { x: 0, y: 1, z: 0 };
    this.jumpBuf = 0; this.crouchEdge = 0; this.tapEdge = 0; this.lastJumpT = -9;
    this.mantleCd = 0; this.slideCd = 0; this.padCd = 0; this.coyote = 0; this.bhop = 0;
    this.eye = PC.HS - 0.15; this.landDip = 0; this.bounceKick = 0;
  }

  get hspeed() { return Math.hypot(this.vel.x, this.vel.z); }
  get height() { return this.crouched ? PC.HC : PC.HS; }
  get targetEye() { return this.mantle ? 1.2 : this.sliding ? 0.72 : this.crouched ? 0.95 : 1.65; }

  // ---------- collision queries ----------
  _blocked(x, z, feet) {
    const top = feet + this.height;
    for (const s of this.solids) {
      if (!this.map.overlap(s, x, z, PC.R)) continue;
      if (s.y0 >= top - 0.001) continue;
      if (this.map.topOver(s, x, z, PC.R) > feet + PC.STEP + 1e-4) return true;
    }
    return false;
  }
  _ground(x, z, feet) {
    let g = 0, n = null;
    for (const s of this.solids) {
      if (s.rope || !this.map.overlap(s, x, z, PC.R * 0.9)) continue;   // ropes block sideways but can't be stood on
      const top = this.map.topOver(s, x, z, PC.R * 0.9);
      if (top <= feet + PC.STEP && top > g - 1e-6) { g = Math.max(g, top); n = s; }
    }
    return { h: g, solid: n };
  }
  _canStand() {
    const { x, y, z } = this.pos;
    for (const s of this.solids) {
      if (!this.map.overlap(s, x, z, PC.R)) continue;
      if (s.y0 < y + PC.HS && this.map.topOver(s, x, z, PC.R) > y + PC.HC + 0.01) return false;
    }
    return true;
  }
  _wallNormal() {
    const d = 0.14, probes = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    let best = null, bestDot = 0.0;
    const sp = this.hspeed || 1;
    for (const [dx, dz] of probes) {
      if (!this._blocked(this.pos.x + dx * d, this.pos.z + dz * d, this.pos.y)) continue;
      const into = (this.vel.x * dx + this.vel.z * dz) / sp; // >0 when heading into the wall
      if (!best || into > bestDot) { best = { x: -dx, z: -dz }; bestDot = into; }
    }
    return best;
  }

  // ---------- velocity helpers ----------
  _friction(dt, f) {
    const sp = this.hspeed; if (sp < 1e-4) return;
    const drop = Math.max(sp, PC.STOP) * f * dt;
    const k = Math.max(0, sp - drop) / sp; this.vel.x *= k; this.vel.z *= k;
  }
  _accel(wx, wz, wishSpeed, accel, dt) {
    const add = wishSpeed - (this.vel.x * wx + this.vel.z * wz); if (add <= 0) return;
    const a = Math.min(add, accel * wishSpeed * dt); this.vel.x += wx * a; this.vel.z += wz * a;
  }
  _airAccel(wx, wz, wishSpeed, dt) {
    const cap = PC.AIR_CAP + Math.max(0, 4 - this.hspeed) * 0.8; // a bit more control at low speed
    const add = Math.min(wishSpeed, cap) - (this.vel.x * wx + this.vel.z * wz); if (add <= 0) return;
    const a = Math.min(add, PC.AIR_ACCEL * wishSpeed * dt); this.vel.x += wx * a; this.vel.z += wz * a;
  }
  _rotateVel(ang) {
    const c = Math.cos(ang), s = Math.sin(ang), x = this.vel.x, z = this.vel.z;
    this.vel.x = x * c - z * s; this.vel.z = x * s + z * c;
  }
  _angleTo(wx, wz) { // signed angle from velocity heading to (wx,wz)
    const vx = this.vel.x, vz = this.vel.z;
    return Math.atan2(vx * wz - vz * wx, vx * wx + vz * wz);
  }

  // ---------- main step ----------
  step(dt) {
    this.t += dt;
    this.prev.x = this.pos.x; this.prev.y = this.pos.y; this.prev.z = this.pos.z;
    this.jumpBuf = Math.max(0, this.jumpBuf - dt); this.crouchEdge = Math.max(0, this.crouchEdge - dt);
    this.tapEdge = Math.max(0, this.tapEdge - dt);
    this.mantleCd -= dt; this.slideCd -= dt; this.padCd -= dt; this.coyote -= dt;
    this.landDip *= Math.exp(-9 * dt); this.bounceKick *= Math.exp(-8 * dt);

    const I = this.input, sy = Math.sin(this.yaw), cy = Math.cos(this.yaw);
    const fx = -sy, fz = -cy, rx = cy, rz = -sy;
    let wx = I.fwd * fx + I.side * rx, wz = I.fwd * fz + I.side * rz;
    const wl = Math.hypot(wx, wz), wishMag = Math.min(1, wl);
    if (wl > 1e-4) { wx /= wl; wz /= wl; }

    if (this.mantle) { this._stepMantle(dt, fx, fz); return; }

    // --- crouch / slide ---
    if (I.crouch) {
      if (!this.crouched) {
        this.crouched = true;
        if (this.onGround && this.crouchEdge > 0 && this.hspeed >= PC.SLIDE_MIN && this.slideCd <= 0) this._startSlide();
      }
    } else if (this.crouched && this._canStand()) { this.crouched = false; this.sliding = false; }
    if (this.sliding && !I.crouch) this.sliding = false;

    // --- jump pads ---
    if (this.padCd <= 0) for (const p of this.pads) {
      if (Math.hypot(this.pos.x - p.x, this.pos.z - p.z) < p.r && this.pos.y < 0.6) {
        this.vel.y = p.vy; this.vel.x += p.fx; this.vel.z += p.fz; this.onGround = false; this.sliding = false;
        this.padCd = 0.4; this.canBounce = true; this.onEvent('pad'); break;
      }
    }

    const wantSprint = I.sprint && wishMag > 0 && I.fwd >= 0 && !this.crouched;
    const target = (this.crouched ? PC.CROUCH : wantSprint ? PC.SPRINT : PC.WALK) * wishMag;

    if (this.onGround) {
      this.airTime = 0; this.groundTime += dt; this.canBounce = true;
      const wantJump = this.jumpBuf > 0 || I.jump;
      let jumped = false;
      if (wantJump) {
        if (this.jumpBuf > 0 && this._tryMantle(fx, fz, true)) { this.jumpBuf = 0; return; }
        jumped = true; this._jump();
      }
      if (!jumped) {
        if (this.sliding) this._slideStep(dt, wx, wz, wishMag);
        else { this._friction(dt, PC.FRICTION); if (wishMag > 0) this._accel(wx, wz, target, PC.ACCEL, dt); }
      }
    } else {
      this.airTime += dt; this.groundTime = 0;
      this.vel.y -= PC.G * dt;
      if (wishMag > 0) this._airAccel(wx, wz, Math.max(target, PC.WALK * wishMag), dt);
      const sp = this.hspeed;
      if (sp > PC.SOFT_CAP) { const k = 1 - 0.8 * dt; this.vel.x *= k; this.vel.z *= k; }

      // coyote jump
      if (this.jumpBuf > 0 && this.coyote > 0 && this.vel.y <= 0.5) { this._jump(); }
      // tap strafe: quick strafe tap + view turn redirects momentum toward the view direction
      else if (this.tapEdge > 0 && this.airTime < 1.0 && sp > 4.5) {
        const ang = this._angleTo(fx, fz), a = Math.abs(ang);
        if (a > 0.1 && a < 1.3) {
          this._rotateVel(Math.sign(ang) * Math.min(a, 0.55)); this.vel.x *= 0.985; this.vel.z *= 0.985;
          this.tapEdge = 0; if (a > 0.25) this.onEvent('tapstrafe');
        }
      }
      // ledge mantle (auto when airborne and pushing into a ledge) / wall bounce
      if ((I.fwd > 0 || I.jump || this.jumpBuf > 0) && this._tryMantle(wl > 1e-4 ? wx : fx, wl > 1e-4 ? wz : fz, false)) return;
      if (this.jumpBuf > 0 && this.canBounce && this.airTime > 0.05) {
        const n = this._wallNormal();
        if (n) this._wallBounce(n);
      }
    }

    this._move(dt);
    const lim = this.map.HALF - 0.5;
    this.pos.x = Math.max(-lim, Math.min(lim, this.pos.x)); this.pos.z = Math.max(-lim, Math.min(lim, this.pos.z));
  }

  _jump() {
    const sp = this.hspeed;
    this.vel.y = PC.JUMP; this.onGround = false; this.coyote = 0; this.jumpBuf = 0; this.lastJumpT = this.t;
    if (this.sliding) {
      this.sliding = false; this.vel.x *= 1.05; this.vel.z *= 1.05; this.onEvent('slidejump');
    } else if (this.groundTime < 0.1 && sp > PC.SPRINT * 0.95) { this.bhop++; if (this.bhop >= 2) this.onEvent('bhop', this.bhop); }
    else this.bhop = 0;
  }

  _startSlide() {
    this.sliding = true; this.slideCd = PC.SLIDE_CD;
    const sp = this.hspeed, ns = Math.min(PC.SLIDE_MAX, sp + (sp < 9 ? 1.2 : 0.4)), k = ns / sp;
    this.vel.x *= k; this.vel.z *= k; this.onEvent('slide');
  }

  _slideStep(dt, wx, wz, wishMag) {
    const n = this.groundN;
    // gravity projected on the slope plane -> downhill acceleration (exaggerated, Apex slides feel "slippery" on hills)
    const ax = PC.G * n.y * n.x * 1.6, az = PC.G * n.y * n.z * 1.6, slopeAcc = Math.hypot(ax, az);
    this._friction(dt, PC.SLIDE_FRIC * Math.max(0.12, 1 - slopeAcc / 7));
    this.vel.x += ax * dt; this.vel.z += az * dt;
    if (this.hspeed > PC.SOFT_CAP) { const k = 1 - 0.8 * dt; this.vel.x *= k; this.vel.z *= k; }
    if (wishMag > 0 && this.hspeed > 1) { // gentle steering
      const ang = this._angleTo(wx, wz);
      if (Math.abs(ang) < 1.4) this._rotateVel(Math.sign(ang) * Math.min(Math.abs(ang), 1.7 * dt));
    }
    if (this.hspeed < 3.0 && slopeAcc < 1.5) this.sliding = false;
  }

  // ---------- mantle ----------
  _tryMantle(dx, dz, fromGround) {
    if (this.mantleCd > 0 || this.hspeed < 0.5 && !fromGround && this.input.fwd <= 0) return false;
    const feet = this.pos.y, maxRise = fromGround ? PC.MANTLE_GROUND : PC.MANTLE_AIR, minRise = PC.STEP + 0.05;
    const dist = PC.R + 0.3, lx = -dz, lz = dx;
    let hit = null;
    for (const off of [0, 0.28, -0.28]) {
      const px = this.pos.x + dx * dist + lx * off, pz = this.pos.z + dz * dist + lz * off;
      for (const s of this.solids) {
        if (s.rope || s.kind !== 'box' || !(px > s.x0 && px < s.x1 && pz > s.z0 && pz < s.z1)) continue;
        const rise = s.y1 - feet;
        if (rise < minRise || rise > maxRise || s.y0 > feet + this.height - 0.2) continue;
        if (!hit || s.y1 < hit.y1) hit = s;
      }
      if (hit) break;
    }
    if (!hit) return false;
    const inx = Math.min(PC.R * 0.9, (hit.x1 - hit.x0) / 2 - 0.01), inz = Math.min(PC.R * 0.9, (hit.z1 - hit.z0) / 2 - 0.01);
    const tx = Math.max(hit.x0 + inx, Math.min(hit.x1 - inx, this.pos.x + dx * (dist + 0.35)));
    const tz = Math.max(hit.z0 + inz, Math.min(hit.z1 - inz, this.pos.z + dz * (dist + 0.35)));
    for (const s of this.solids) { // headroom on the ledge
      if (s === hit || !this.map.overlap(s, tx, tz, PC.R * 0.9)) continue;
      if (s.y0 < hit.y1 + PC.HC + 0.02 && this.map.topOver(s, tx, tz, PC.R * 0.9) > hit.y1 + 0.05) return false;
    }
    const rise = hit.y1 - feet;
    this.mantle = { sx: this.pos.x, sy: feet, sz: this.pos.z, tx, ty: hit.y1, tz, t: 0, dur: 0.28 + 0.06 * rise, dx, dz, entry: this.hspeed };
    this.vel.x = this.vel.y = this.vel.z = 0; this.sliding = false;
    return true;
  }

  _stepMantle(dt, fx, fz) {
    const m = this.mantle; m.t += dt;
    const u = Math.min(1, m.t / m.dur);
    const up = 1 - Math.pow(1 - Math.min(1, u / 0.65), 2);
    this.pos.y = m.sy + (m.ty - m.sy) * up;
    const f = Math.max(0, Math.min(1, (u - 0.3) / 0.7)), fe = f * f * (3 - 2 * f);
    this.pos.x = m.sx + (m.tx - m.sx) * fe; this.pos.z = m.sz + (m.tz - m.sz) * fe;
    const glide = this.crouchEdge > 0 && this.t - this.lastJumpT < 0.22 && u > 0.4;
    if (u >= 1 || glide) {
      this.pos.x = m.tx; this.pos.y = m.ty; this.pos.z = m.tz;
      this.mantle = null; this.onGround = true; this.canBounce = true; this.mantleCd = 0.3; this.groundTime = 0;
      this.groundN = { x: 0, y: 1, z: 0 };
      if (glide) {
        const v = Math.min(12, Math.max(m.entry, 6) + 2.5);
        this.vel.x = m.dx * v; this.vel.z = m.dz * v; this.crouched = true; this.sliding = true; this.slideCd = PC.SLIDE_CD;
        this.crouchEdge = 0; this.onEvent('superglide');
      } else {
        const v = Math.max(3.5, Math.min(7.5, m.entry * 0.85));
        this.vel.x = m.dx * v; this.vel.z = m.dz * v; this.onEvent('mantle');
      }
    }
  }

  // ---------- wall bounce ----------
  _wallBounce(n) {
    this.canBounce = false; this.jumpBuf = 0;
    const into = this.vel.x * n.x + this.vel.z * n.z;
    if (into < 0) { this.vel.x -= 2 * into * n.x; this.vel.z -= 2 * into * n.z; }
    this.vel.x += n.x * 4.5; this.vel.z += n.z * 4.5;
    const sp = this.hspeed;
    if (sp < 6.5) { const k = 6.5 / sp; this.vel.x *= k; this.vel.z *= k; }
    this.vel.y = 7.4; this.bounceKick = 1; this.onEvent('wallbounce');
  }

  // ---------- integration + collisions ----------
  _move(dt) {
    const wasGround = this.onGround, p = this.pos, v = this.vel;
    // horizontal, axis-separated
    let nx = p.x + v.x * dt;
    if (!this._blocked(nx, p.z, p.y)) p.x = nx; else v.x = 0;
    let nz = p.z + v.z * dt;
    if (!this._blocked(p.x, nz, p.y)) p.z = nz; else v.z = 0;

    if (wasGround) {
      const g = this._ground(p.x, p.z, p.y);
      if (v.y <= 0.01 && p.y - g.h <= 0.3) { // snapped to ground (also steps up)
        p.y = g.h; this.groundN = g.solid ? this.map.normalOf(g.solid) : { x: 0, y: 1, z: 0 };
      } else { // walked off an edge / over a ramp lip
        this.onGround = false; this.coyote = 0.09;
        const n = this.groundN;
        if (v.y <= 0.01 && n.y < 0.999) v.y = -(v.x * n.x + v.z * n.z) / n.y; // keep following the slope direction
        this.sliding = false;
      }
    }
    if (!this.onGround) {
      const oldHead = p.y + this.height; let ny = p.y + v.y * dt;
      if (v.y > 0) {
        for (const s of this.solids) {
          if (!this.map.overlap(s, p.x, p.z, PC.R)) continue;
          if (s.y0 >= oldHead - 0.05 && s.y0 < ny + this.height) { ny = s.y0 - this.height - 0.001; v.y = 0; }
        }
      }
      p.y = ny;
      if (v.y <= 0) {
        const g = this._ground(p.x, p.z, p.y);
        if (p.y <= g.h + 1e-4) this._land(g);
      }
    }
  }

  _land(g) {
    const impact = -this.vel.y;
    this.pos.y = g.h; this.vel.y = 0; this.onGround = true; this.groundTime = 0; this.canBounce = true;
    this.groundN = g.solid ? this.map.normalOf(g.solid) : { x: 0, y: 1, z: 0 };
    this.landDip = Math.min(0.28, impact * 0.012);
    if (this.input.crouch && this.hspeed >= PC.SLIDE_MIN && this.slideCd <= 0) { this.crouched = true; this._startSlide(); }
    this.onEvent('land', impact);
  }

  state() {
    if (this.mantle) return 'MANTLE';
    if (!this.onGround) return 'AIRBORNE';
    if (this.sliding) return 'SLIDING';
    if (this.crouched) return 'CROUCHED';
    const sp = this.hspeed;
    return sp > 6 ? 'SPRINTING' : sp > 0.5 ? 'WALKING' : 'IDLE';
  }
}
if (typeof module !== 'undefined') module.exports = { Player, PC };
