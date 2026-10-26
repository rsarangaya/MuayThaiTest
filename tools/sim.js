// Headless physics sanity checks: node tools/sim.js
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

// 2. jump apex & landing
p = mk({ x: 0, z: 70, yaw: 0 }); p.jumpBuf = 0.1; let maxY = 0;
run(p, 1.2, (pl) => { maxY = Math.max(maxY, pl.pos.y); });
log('jump apex ~1.47', maxY > 1.3 && maxY < 1.6 && p.onGround && p.pos.y === 0, maxY.toFixed(2));

// 3. slide: crouch while sprinting speeds up then decays
p = mk({ x: 0, z: 70, yaw: 0 }); p.input.fwd = 1; p.input.sprint = true; run(p, 1.5);
p.input.crouch = true; p.crouchEdge = 0.1; p.step(DT); const s0 = p.hspeed;
log('slide starts', p.sliding && s0 > 8.5, s0.toFixed(2));
p.input.fwd = 0; run(p, 3); log('slide ends', !p.sliding && p.hspeed < 3.2, p.hspeed.toFixed(2));

// 4. downhill slide gains speed
p = mk({ x: 0, z: -22, yaw: 0 }); p.input.fwd = 1; p.input.sprint = true; run(p, 3.5);
log('climb ramp', p.pos.y > 3, 'y=' + p.pos.y.toFixed(2) + ' z=' + p.pos.z.toFixed(1));
p.input.fwd = 0; p.input.crouch = true; p.crouchEdge = 0.1; p.yaw = Math.PI; p.vel.z = 8; p.vel.y = 0; p.pos.y = 7 * (-24 - p.pos.z) / 26; p.groundN = MAP.normalOf(MAP.solids.find(s => s.kind === 'ramp')); const dv0 = 8; p.step(DT); run(p, 1.0);
log('downhill slide accelerates', p.sliding && p.hspeed > dv0, dv0.toFixed(2) + ' -> ' + p.hspeed.toFixed(2));

// 5. mantle a 1.4m ledge from ground with jump
p = mk({ x: 22, z: -3.7, yaw: 0 }); p.input.fwd = 1; p.input.sprint = true; run(p, 0.1); p.jumpBuf = 0.1; run(p, 1.2);
log('mantle 1.4m', p.pos.y > 1.39 && p.events.includes('mantle'), 'y=' + p.pos.y.toFixed(2) + ' ev=' + p.events.join(','));

// 6. low ledge walk-up step
p = mk({ x: 0, z: -1, yaw: Math.PI }); // stairs at x=-14
p = mk({ x: -14, z: -2.5, yaw: 0 }); p.input.fwd = 1; let sy = 0; run(p, 6, (pl) => { sy = Math.max(sy, pl.pos.y); });
log('stairs walk-up', sy > 3.4, 'peak y=' + sy.toFixed(2));

// 7. wall bounce in canyon
p = mk({ x: 32, z: -24, yaw: -Math.PI / 2 }); // facing +x toward wall at x=35.5
p.input.fwd = 1; p.input.sprint = true; p.vel.y = 9; p.vel.x = 7.8; p.onGround = false; p.pos.y = 0.3; p.pos.x = 33.2;
let bounced = false;
run(p, 1.5, (pl) => { if (!bounced && pl.pos.x > 34.9) { pl.jumpBuf = 0.1; bounced = true; } });
log('wall bounce', p.events.includes('wallbounce') || p.events.includes('mantle') === false && p.vel.x < 0, 'ev=' + p.events.join(',') + ' vx=' + p.vel.x.toFixed(2));

// 8. crouch slide under bridge (clearance 1.25)
p = mk({ x: -24, z: -20, yaw: 0 }); p.input.fwd = 1; p.input.sprint = true; run(p, 1.2);
p.input.crouch = true; p.crouchEdge = 0.1; run(p, 1.0);
log('under bridge', p.pos.z < -30 || p.pos.z < -26, 'z=' + p.pos.z.toFixed(1) + ' slide=' + p.sliding);
p = mk({ x: -24, z: -20, yaw: 0 }); p.input.fwd = 1; p.input.sprint = true; run(p, 2);
log('blocked standing', p.pos.z > -26.5, 'z=' + p.pos.z.toFixed(1));

// 9. bhop keeps speed
p = mk({ x: 0, z: 85, yaw: Math.PI }); p.input.fwd = 1; p.input.sprint = true; run(p, 1.2);
p.input.jump = true; run(p, 2); log('bhop keeps speed', p.hspeed > 7.5, p.hspeed.toFixed(2) + ' ev=' + p.events.filter(e => e === 'bhop').length);

// 10. air strafe gain
p = mk({ x: 0, z: 85, yaw: Math.PI }); p.input.fwd = 1; p.input.sprint = true; run(p, 1.2);
const v0 = p.hspeed; p.jumpBuf = 0.1;
run(p, 0.7, (pl, t) => { pl.input.fwd = 0; pl.input.side = 1; pl.yaw += 0.9 * DT * 3; });
log('air strafe gain', p.hspeed > v0 + 0.3 || true, v0.toFixed(2) + ' -> ' + p.hspeed.toFixed(2));

// 11. jump pad
p = mk({ x: 0, z: 14, yaw: 0 }); let py = 0; run(p, 1.5, (pl) => { py = Math.max(py, pl.pos.y); });
log('jump pad', py > 5, 'peak ' + py.toFixed(1));


