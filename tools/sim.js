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

// 8. pivot: facing turns 90 degrees toward the strafe, the body swings round the lead foot (shifts, does not spin on the spot)
function pivotTest(name, yaw, dir, stance, wantFwd) {
  const q = mk({ x: 0, z: 70, yaw }); q.stance = stance || 'orthodox';
  const sx = q.pos.x, sz = q.pos.z; q.startPivot(dir); run(q, 0.5);
  const fwd = { x: -Math.sin(q.yaw), z: -Math.cos(q.yaw) }, moved = Math.hypot(q.pos.x - sx, q.pos.z - sz);
  log(name, !q.pivot && Math.abs(fwd.x - wantFwd.x) < 0.01 && Math.abs(fwd.z - wantFwd.z) < 0.01 && moved > 0.15 && moved < 0.6, 'facing ' + fwd.x.toFixed(2) + ',' + fwd.z.toFixed(2) + ' moved ' + moved.toFixed(2));
  return q;
}
pivotTest('pivot right: north -> east', 0, 1, 'orthodox', { x: 1, z: 0 });
pivotTest('pivot left: north -> west', 0, -1, 'orthodox', { x: -1, z: 0 });
pivotTest('pivot right from east -> south', -Math.PI / 2, 1, 'orthodox', { x: 0, z: 1 });
const q1 = pivotTest('southpaw pivot right', 0, 1, 'southpaw', { x: 1, z: 0 });
const q2 = mk({ x: 0, z: 70, yaw: 0 }); q2.startPivot(1); run(q2, 0.5);
log('pivot foot depends on stance', Math.hypot(q1.pos.x - q2.pos.x, q1.pos.z - q2.pos.z) > 0.2, 'orthodox ' + q2.pos.x.toFixed(2) + ',' + q2.pos.z.toFixed(2) + ' southpaw ' + q1.pos.x.toFixed(2) + ',' + q1.pos.z.toFixed(2));
