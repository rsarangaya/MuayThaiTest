// Headless physics sanity checks: node tools/sim.js
// The movement course is switched off in the game map; run with MAP_FULL=1 ($env:MAP_FULL='1') to test against it.
// There is no jump (the pivot took its key), so the jump / bhop / wall bounce / ground mantle checks are gone.
const MAP = require('../js/map.js');
const { Player } = require('../js/player.js');
const DT = 1 / 120;
function mk(spawn) {
  const p = new Player(MAP.solids, MAP.pads, MAP);
  p.events = [];
  p.onEvent = (n) => p.events.push(n);
  p.respawn(spawn);
  return p;
}
function run(p, secs, f) { for (let i = 0; i < secs / DT; i++) { if (f) f(p, i * DT); p.step(DT); } }
const log = (name, ok, extra) => console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : ''));

// 1. sprint reaches sprint speed, stops with friction
let p = mk({ x: 0, z: 70, yaw: 0 });
p.input.fwd = 1; p.input.sprint = true; run(p, 1.5);
log('sprint speed', Math.abs(p.hspeed - 7.8) < 0.1, p.hspeed.toFixed(2));
p.input.fwd = 0; run(p, 0.8);
log('friction stop', p.hspeed < 0.2, p.hspeed.toFixed(2));

// 2. slide: crouch while sprinting speeds up then decays
p = mk({ x: 0, z: 70, yaw: 0 }); p.input.fwd = 1; p.input.sprint = true; run(p, 1.5);
p.input.crouch = true; p.crouchEdge = 0.1; p.step(DT); const s0 = p.hspeed;
log('slide starts', p.sliding && s0 > 8.5, s0.toFixed(2));
p.input.fwd = 0; run(p, 3); log('slide ends', !p.sliding && p.hspeed < 3.2, p.hspeed.toFixed(2));

// 3. downhill slide gains speed
p = mk({ x: 0, z: -22, yaw: 0 }); p.input.fwd = 1; p.input.sprint = true; run(p, 3.5);
log('climb ramp', p.pos.y > 3, 'y=' + p.pos.y.toFixed(2) + ' z=' + p.pos.z.toFixed(1));
p.input.fwd = 0; p.input.crouch = true; p.crouchEdge = 0.1; p.yaw = Math.PI; p.vel.z = 8; p.vel.y = 0; p.pos.y = 7 * (-24 - p.pos.z) / 26; p.groundN = MAP.normalOf(MAP.solids.find(s => s.kind === 'ramp')); const dv0 = 8; p.step(DT); run(p, 1.0);
log('downhill slide accelerates', p.sliding && p.hspeed > dv0, dv0.toFixed(2) + ' -> ' + p.hspeed.toFixed(2));

// 4. low ledge walk-up step
p = mk({ x: -14, z: -2.5, yaw: 0 }); p.input.fwd = 1; let sy = 0; run(p, 6, (pl) => { sy = Math.max(sy, pl.pos.y); });
log('stairs walk-up', sy > 3.4, 'peak y=' + sy.toFixed(2));

// 5. crouch slide under bridge (clearance 1.25)
p = mk({ x: -24, z: -20, yaw: 0 }); p.input.fwd = 1; p.input.sprint = true; run(p, 1.2);
p.input.crouch = true; p.crouchEdge = 0.1; run(p, 1.0);
log('under bridge', p.pos.z < -30 || p.pos.z < -26, 'z=' + p.pos.z.toFixed(1) + ' slide=' + p.sliding);
p = mk({ x: -24, z: -20, yaw: 0 }); p.input.fwd = 1; p.input.sprint = true; run(p, 2);
log('blocked standing', p.pos.z > -26.5, 'z=' + p.pos.z.toFixed(1));

// 6. jump pad
p = mk({ x: 0, z: 14, yaw: 0 }); let py = 0; run(p, 1.5, (pl) => { py = Math.max(py, pl.pos.y); });
log('jump pad', py > 5, 'peak ' + py.toFixed(1));

// 7. no jump: nothing lifts a grounded player
p = mk({ x: 0, z: 70, yaw: 0 }); p.input.fwd = 1; p.input.sprint = true; p.jumpBuf = 1; p.input.jump = true; let jy = 0; run(p, 1.5, (pl) => { jy = Math.max(jy, pl.pos.y); });
log('no jump', jy === 0 && p.onGround, 'maxY=' + jy);

// 8. pivot: a 90 degree drift round the empty point PIVOT_R (1.5 m) straight ahead, still facing it (not round the opponent).
// Facing north with the point at (0, 60.5): D ends you east of it looking west, A west of it looking east.
function orbit(name, dir, yaw, sx, sz, endX, endZ, faceX, faceZ) {
  const q = mk({ x: sx, z: sz, yaw }); q.startPivot(dir); const cx = q.pivot.cx, cz = q.pivot.cz; run(q, 0.6);
  const f = { x: -Math.sin(q.yaw), z: -Math.cos(q.yaw) }, rad = Math.hypot(q.pos.x - cx, q.pos.z - cz);
  log(name, !q.pivot && Math.abs(q.pos.x - endX) < 0.02 && Math.abs(q.pos.z - endZ) < 0.02 && Math.abs(f.x - faceX) < 0.01 && Math.abs(f.z - faceZ) < 0.01,
    'at ' + q.pos.x.toFixed(2) + ',' + q.pos.z.toFixed(2) + ' facing ' + f.x.toFixed(2) + ',' + f.z.toFixed(2) + ' radius ' + rad.toFixed(2));
}
orbit('pivot right: north -> ends east of the point, facing west', 1, 0, 0, 62, 1.5, 60.5, -1, 0);
orbit('pivot left: ends west of the point, facing east', -1, 0, 0, 62, -1.5, 60.5, 1, 0);
orbit('pivot right again: facing west -> ends north, facing south', 1, Math.PI / 2, 1.5, 60.5, 0, 59, 0, 1);
// the point stays dead ahead the whole way round
{ const q = mk({ x: 0, z: 62, yaw: 0 }); q.startPivot(1); const P = q.pivot; let worst = 0;
  run(q, 0.4, (pl) => { if (!pl.pivot) return; const dx = P.cx - pl.pos.x, dz = P.cz - pl.pos.z, l = Math.hypot(dx, dz); worst = Math.max(worst, 1 - (dx * -Math.sin(pl.yaw) + dz * -Math.cos(pl.yaw)) / l); });
  log('pivot point stays in line of sight', worst < 0.001, 'worst 1-cos = ' + worst.toExponential(1)); }
// an opponent standing at the point ends up off to the side of the line: that is the angle
{ const B = { x: 0, z: 60.5 }, q = mk({ x: 0, z: 62, yaw: 0 }); q.startPivot(1); run(q, 0.6);
  const dx = B.x - q.pos.x, dz = B.z - q.pos.z, off = Math.acos(Math.min(1, (dx * -Math.sin(q.yaw) + dz * -Math.cos(q.yaw)) / Math.hypot(dx, dz)));
  log('opponent at the point is still dead ahead (angle comes from them standing elsewhere)', off < 0.01, 'off ' + off.toFixed(3)); }
{ const B = { x: 0, z: 60 }, q = mk({ x: 0, z: 62, yaw: 0 }); q.startPivot(1); run(q, 0.6);
  const dx = B.x - q.pos.x, dz = B.z - q.pos.z, off = Math.acos((dx * -Math.sin(q.yaw) + dz * -Math.cos(q.yaw)) / Math.hypot(dx, dz)) * 180 / Math.PI;
  log('opponent 0.5 m past the point ends up off the line', off > 15 && off < 25, 'off ' + off.toFixed(1) + ' deg'); }