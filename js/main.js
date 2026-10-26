'use strict';
(function () {
  const THREE = window.THREE, DT = 1 / 120;
  const $ = id => document.getElementById(id);

  // ---------- settings ----------
  const settings = { sens: 1.0, fov: 78, autoSprint: true };
  try { Object.assign(settings, JSON.parse(localStorage.getItem('mtfps-settings') || '{}')); } catch (e) {}
  const saveSettings = () => { try { localStorage.setItem('mtfps-settings', JSON.stringify(settings)); } catch (e) {} };

  // ---------- three setup ----------
  const renderer = new THREE.WebGLRenderer({ canvas: $('c'), antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(settings.fov, 1, 0.03, 400);
  camera.rotation.order = 'YXZ';
  scene.add(camera);
  MAP.build(THREE, scene);
  function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
  addEventListener('resize', resize); resize();

  // ---------- game objects ----------
  const player = new Player(MAP.solids, MAP.pads, MAP);
  const vm = new ViewModel(THREE, camera);
  let zoneIdx = 0, peak = 0, locked = false, camRoll = 0, bobPhase = 0, fovNow = settings.fov, eye = 1.65, time = 0;

  function toast(text, cls) {
    const box = $('toasts'); const el = document.createElement('div');
    el.className = 'toast ' + (cls || ''); el.textContent = text; box.appendChild(el);
    while (box.children.length > 4) box.removeChild(box.firstChild);
    setTimeout(() => el.remove(), 1400);
  }
  player.onEvent = (name, v) => {
    if (name === 'slide') toast('SLIDE');
    else if (name === 'slidejump') toast('SLIDE JUMP', 'hot');
    else if (name === 'bhop') toast('BHOP x' + v);
    else if (name === 'tapstrafe') toast('TAP STRAFE', 'hot');
    else if (name === 'wallbounce') toast('WALL BOUNCE', 'hot');
    else if (name === 'mantle') toast('LEDGE CLIMB');
    else if (name === 'superglide') toast('SUPERGLIDE', 'hot');
    else if (name === 'pad') toast('LAUNCH PAD');
  };
  vm.onActive = (name, side, def) => {
    const fx = -Math.sin(player.yaw), fz = -Math.cos(player.yaw);
    if (MAP.hitBags(player.pos.x, player.pos.z, fx, fz, def.reach, def.impulse)) { toast('HIT · ' + name.toUpperCase(), 'hit'); }
  };
  // Roundhouse opens with a 45-degree step: shove the body diagonally forward, away from the kicking side.
  vm.onStart = (name, side, def) => {
    if (!def.step || !player.onGround || player.mantle) return;
    const sy = Math.sin(player.yaw), cy = Math.cos(player.yaw), s = side === 'R' ? -1 : 1, r = Math.SQRT1_2;
    const dx = -sy * r + cy * r * s, dz = -cy * r + -sy * r * s;
    player.vel.x += dx * def.step; player.vel.z += dz * def.step;
  };
  function goZone(i) {
    zoneIdx = (i + MAP.spawns.length) % MAP.spawns.length; player.respawn(MAP.spawns[zoneIdx]);
    peak = 0; $('zone').textContent = MAP.spawns[zoneIdx].name;
  }
  goZone(0);

  // ---------- input ----------
  const keys = {};
  const GAME_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'ShiftLeft', 'ShiftRight', 'ControlLeft', 'KeyC', 'KeyQ', 'KeyR', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6',
    'KeyZ', 'KeyX', 'KeyV', 'KeyF', 'KeyG', 'KeyH', 'Backspace', 'BracketLeft', 'BracketRight', 'KeyT', 'F1', 'Tab']);
  addEventListener('keydown', e => {
    if (GAME_KEYS.has(e.code)) e.preventDefault();
    if (e.repeat) return;
    keys[e.code] = true;
    if (!locked) return;
    const c = e.code;
    if (c === 'Space') player.jumpBuf = 0.13;
    if (c === 'KeyC' || c === 'ControlLeft') player.crouchEdge = 0.1;
    if (c === 'KeyA' || c === 'KeyD') player.tapEdge = 0.12;
    if (c === 'KeyR') vm.trigger('hook', keys.KeyQ);
    if (c === 'Digit1') vm.trigger('legkick', keys.KeyQ);
    if (c === 'Digit2') vm.trigger('midkick', keys.KeyQ);
    if (c === 'Digit3') vm.trigger('highkick', keys.KeyQ);
    if (c === 'Digit4') vm.trigger('teep', keys.KeyQ);
    if (c === 'Digit5') vm.trigger('knee', keys.KeyQ);
    if (c === 'Digit6') vm.trigger('elbow', keys.KeyQ);
    if (c === 'KeyZ' || c === 'KeyX' || c === 'KeyV') vm.setHolds({ checkSide: keys.KeyQ ? 'L' : 'R' });
    if (c === 'Backspace') goZone(zoneIdx);
    if (c === 'BracketRight') goZone(zoneIdx + 1);
    if (c === 'BracketLeft') goZone(zoneIdx - 1);
    if (c === 'KeyT') { settings.autoSprint = !settings.autoSprint; saveSettings(); toast('AUTO-SPRINT ' + (settings.autoSprint ? 'ON' : 'OFF')); }
    if (c === 'F1' || c === 'Tab') $('help').classList.toggle('hidden');
  });
  addEventListener('keyup', e => { keys[e.code] = false; });
  addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
  addEventListener('contextmenu', e => e.preventDefault());
  addEventListener('mousedown', e => {
    if (!locked) return;
    if (e.button === 0) vm.trigger('jab'); else if (e.button === 2) vm.trigger('cross'); else if (e.button === 1) { e.preventDefault(); vm.trigger('hook', keys.KeyQ); }
  });
  addEventListener('mousemove', e => {
    if (!locked) return;
    const s = 0.0022 * settings.sens;
    player.yaw -= e.movementX * s; player.pitch = Math.max(-1.5, Math.min(1.5, player.pitch - e.movementY * s));
  });

  const canvas = $('c'), overlay = $('overlay');
  overlay.addEventListener('click', e => { if (e.target.closest('.settings')) return; canvas.requestPointerLock && canvas.requestPointerLock(); });
  canvas.addEventListener('click', () => { if (!locked) canvas.requestPointerLock(); });
  document.addEventListener('pointerlockchange', () => {
    locked = document.pointerLockElement === canvas; overlay.classList.toggle('hidden', locked);
    if (!locked) for (const k in keys) keys[k] = false;
  });
  // settings UI
  const sens = $('sens'), fov = $('fov'), auto = $('auto');
  sens.value = settings.sens; fov.value = settings.fov; auto.checked = settings.autoSprint;
  const syncLabels = () => { $('sensv').textContent = (+sens.value).toFixed(2); $('fovv').textContent = fov.value; };
  syncLabels();
  sens.oninput = () => { settings.sens = +sens.value; syncLabels(); saveSettings(); };
  fov.oninput = () => { settings.fov = +fov.value; syncLabels(); saveSettings(); };
  auto.onchange = () => { settings.autoSprint = auto.checked; saveSettings(); };

  function readInput() {
    const I = player.input;
    I.fwd = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0); I.side = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
    I.jump = !!keys.Space; I.crouch = !!(keys.KeyC || keys.ControlLeft);
    const shift = !!(keys.ShiftLeft || keys.ShiftRight);
    I.sprint = settings.autoSprint ? !shift : shift;
    // combat holds
    vm.setHolds({
      block: keys.KeyF ? 'L' : keys.KeyG ? 'R' : null, longGuard: !!keys.KeyH,
      check: keys.KeyZ ? 'low' : keys.KeyX ? 'mid' : keys.KeyV ? 'high' : null,
    });
  }

  // ---------- loop ----------
  let last = performance.now(), acc = 0, fpsT = 0, frames = 0;
  const hud = { speed: $('speed'), state: $('state'), peak: $('peak'), act: $('action'), bar: $('bar'), fps: $('fps') };

  function frame(now) {
    requestAnimationFrame(frame);
    let dt = Math.min(0.1, (now - last) / 1000); last = now;
    frames++; fpsT += dt; if (fpsT > 0.5) { hud.fps.textContent = Math.round(frames / fpsT) + ' fps'; frames = 0; fpsT = 0; }
    if (locked) {
      readInput();
      acc += dt;
      while (acc >= DT) { player.step(DT); acc -= DT; MAP.update(DT); }
    } else acc = 0;
    time += dt;
    const alpha = acc / DT;
    const px = player.prev.x + (player.pos.x - player.prev.x) * alpha, py = player.prev.y + (player.pos.y - player.prev.y) * alpha, pz = player.prev.z + (player.pos.z - player.prev.z) * alpha;

    // camera feel
    const sp = player.hspeed, sy = Math.sin(player.yaw), cy = Math.cos(player.yaw);
    const strafeV = player.vel.x * cy - player.vel.z * sy;
    let rollT = -Math.max(-0.07, Math.min(0.07, strafeV * 0.0055));
    if (player.sliding) rollT += 0.045;
    rollT += player.bounceKick * 0.08;
    camRoll += (rollT - camRoll) * (1 - Math.exp(-9 * dt));
    if (player.onGround && !player.sliding && !player.mantle) bobPhase += sp * dt * 1.35;
    const mv = Math.min(1, sp / 8);
    const bobY = player.onGround && !player.sliding ? Math.sin(bobPhase * 2) * 0.03 * mv : 0;
    const bobX = player.onGround && !player.sliding ? Math.cos(bobPhase) * 0.022 * mv : 0;
    eye += (player.targetEye - eye) * (1 - Math.exp(-16 * dt));
    const fovT = settings.fov + Math.max(0, Math.min(14, (sp - 6) * 0.9)) + (player.sliding ? 4 : 0) + (player.mantle ? -4 : 0);
    fovNow += (fovT - fovNow) * (1 - Math.exp(-6 * dt));
    if (Math.abs(camera.fov - fovNow) > 0.01) { camera.fov = fovNow; camera.updateProjectionMatrix(); }

    vm.update(dt, { speed: sp, bobPhase, grounded: player.onGround, sprinting: sp > 6.2, sliding: player.sliding, mantle: !!player.mantle, yaw: player.yaw, pitch: player.pitch, time, landDip: player.landDip, roll: camRoll });
    const k = vm.camKick;
    // body motion from attacks: sidestep/lean offset in the player's (unkicked) frame
    const ox = k.ox + bobX, fo = -k.oz;
    camera.position.set(px + cy * ox - sy * fo, py + eye + bobY - player.landDip, pz - sy * ox - cy * fo);
    camera.rotation.y = player.yaw + k.yaw;
    camera.rotation.x = player.pitch + k.pitch + (player.mantle ? -0.08 : 0);
    camera.rotation.z = camRoll + k.roll;
    renderer.render(scene, camera);

    // HUD
    peak = Math.max(peak, sp);
    hud.speed.textContent = sp.toFixed(1);
    hud.state.textContent = player.state();
    hud.peak.textContent = 'TOP ' + peak.toFixed(1);
    hud.bar.style.width = Math.min(100, sp / 20 * 100) + '%';
    hud.bar.className = sp > 11 ? 'fast' : '';
    hud.act.textContent = vm.label;
    hud.act.style.opacity = vm.label ? 1 : 0;
  }
  requestAnimationFrame(frame);

  window.game = { player, vm, MAP, settings, goZone, step: n => { for (let i = 0; i < n; i++) player.step(DT); }, setLocked: v => { locked = v; } };
})();
