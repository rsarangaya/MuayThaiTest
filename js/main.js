'use strict';
(function () {
  const THREE = window.THREE, DT = 1 / 120;
  const $ = id => document.getElementById(id);

  // ---------- settings ----------
  const settings = { sens: 1.0, fov: 78, autoSprint: true, difficulty: 'normal', mode: 'spar', trainBot: 'dummy' };
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
  // ---------- sparring bot + simple hit resolution (placeholder for the real battle system) ----------
  const bot = new Bot(THREE, scene, MAP.RING);
  let hp = 100, shake = 0, hurtFlash = 0, teleT = 0;
  let stamina = 100, stamDelay = 0, clinch = null, inRingPrev = false, gateMode = null;
  let versus = false, vsKO = 0, vsSendT = 0, vsReset = 0; const vsScore = { me: 0, opp: 0 };   // online versus state

  // ---------- difficulty + training ----------
  // skill = how often / how correctly the bot defends, aggr = attack tempo, react = extra reaction delay (s), dmg = damage it deals
  const DIFF = {
    easy: { label: 'EASY', skill: 0.55, aggr: 0.65, react: 0.16, dmg: 0.7 },
    normal: { label: 'NORMAL', skill: 0.8, aggr: 1.0, react: 0.04, dmg: 1.0 },
    hard: { label: 'HARD', skill: 0.92, aggr: 1.3, react: 0.0, dmg: 1.2 },
    nak: { label: 'NAK MUAY', skill: 0.98, aggr: 1.6, react: -0.03, dmg: 1.4 },
  };
  const TRAIN_BOTS = { dummy: 'DUMMY', guard: 'GUARD', drill: 'DRILL' };
  const training = () => settings.mode === 'train' && !versus;
  const LEVEL_NAME = { low: 'LEGS', mid: 'BODY', high: 'HEAD' };
  const tr = { attempts: 0, hits: 0, combo: 0, best: 0, dmg: 0, lastT: -9, last: '—' };
  function renderTrain() {
    $('train').classList.toggle('hidden', !training());
    if (!training()) return;
    $('trBot').textContent = TRAIN_BOTS[settings.trainBot] + ' · ' + (DIFF[settings.difficulty] || DIFF.normal).label;
    $('trStats').textContent = 'HITS ' + tr.hits + '/' + tr.attempts + (tr.attempts ? ' (' + Math.round(tr.hits / tr.attempts * 100) + '%)' : '') + ' · COMBO ' + tr.combo + ' (best ' + tr.best + ') · DMG ' + tr.dmg.toFixed(0);
    $('trLast').textContent = 'LAST: ' + tr.last;
  }
  function trainReset() { Object.assign(tr, { attempts: 0, hits: 0, combo: 0, best: 0, dmg: 0, lastT: -9, last: '—' }); renderTrain(); }
  function applyBotSettings() {
    const d = DIFF[settings.difficulty] || DIFF.normal;
    bot.skill = d.skill; bot.baseAggr = d.aggr; bot.reactAdd = d.react;
    bot.mode = training() ? settings.trainBot : 'spar'; bot.noDamage = training();
    for (const [id, v] of [['modeSel', settings.mode], ['diffSel', settings.difficulty], ['trainSel', settings.trainBot]]) { const el = $(id); if (el) el.value = v; }
    renderTrain();
  }
  function resetFight() { hp = 100; stamina = 100; endClinch(); bot.reset(); trainReset(); }
  function setMode(m) { settings.mode = m; saveSettings(); applyBotSettings(); resetFight(); toast(training() ? 'TRAINING MODE' : 'SPARRING MODE', 'hot'); }
  function setDifficulty(k) { settings.difficulty = k; saveSettings(); applyBotSettings(); toast('DIFFICULTY · ' + DIFF[k].label, 'hot'); }
  function setTrainBot(k) { settings.trainBot = k; saveSettings(); applyBotSettings(); if (training()) { bot.reset(); bot.mode = k; } toast('TRAINING BOT · ' + TRAIN_BOTS[k], 'hot'); }
  const cycle = (obj, cur) => { const ks = Object.keys(obj); return ks[(ks.indexOf(cur) + 1) % ks.length]; };
  function trainNote(name, A, res, dmg) {
    tr.attempts++;
    if (res === 'hit') {
      tr.hits++; tr.dmg += dmg; tr.combo = time - tr.lastT < 2.5 ? tr.combo + 1 : 1; tr.best = Math.max(tr.best, tr.combo); tr.lastT = time;
    } else tr.combo = 0;
    tr.last = name.toUpperCase() + ' → ' + LEVEL_NAME[A.level] + ' · ' + res.toUpperCase() + (res === 'hit' ? ' ' + dmg.toFixed(1) : '');
    renderTrain();
  }
  const PATK = { jab: { level: 'high', dmg: 4 }, cross: { level: 'high', dmg: 7 }, hook: { level: 'high', dmg: 9 }, elbow: { level: 'high', dmg: 11 },
    legkick: { level: 'low', dmg: 8 }, midkick: { level: 'mid', dmg: 10 }, highkick: { level: 'high', dmg: 12 }, teep: { level: 'mid', dmg: 5 }, knee: { level: 'mid', dmg: 10 } };
  PATK.jabB = { type: 'jab', level: 'mid', dmg: 5 }; PATK.crossB = { type: 'cross', level: 'mid', dmg: 8 }; PATK.hookB = { type: 'hook', level: 'mid', dmg: 10 };
  const BOT_NAME = { jab: 'JAB', cross: 'CROSS', lhook: 'LEFT HOOK', rhook: 'RIGHT HOOK', legkick: 'LEG KICK', midkick: 'MID KICK', highkick: 'HIGH KICK', teep: 'TEEP', rteep: 'REAR TEEP',
    jabB: 'BODY JAB', crossB: 'BODY CROSS', lhookB: 'BODY HOOK', plum: 'PLUM CLINCH' };
  const BOT_HINT = { jab: 'BLOCK / LONG GUARD', cross: 'BLOCK / LONG GUARD', lhook: 'BLOCK', rhook: 'BLOCK', legkick: 'CHECK LOW', midkick: 'CHECK MID / BLOCK', highkick: 'BLOCK / CHECK HIGH · or duck', teep: 'LONG GUARD / CHECK MID', rteep: 'LONG GUARD / CHECK MID',
    jabB: 'BLOCK / LONG GUARD', crossB: 'BLOCK / LONG GUARD', lhookB: 'BLOCK', plum: 'LONG GUARD · DUCK · BACK AWAY' };

  vm.onActive = (name, side, def) => {
    const fx = -Math.sin(player.yaw), fz = -Math.cos(player.yaw);
    const lvl = PATK[name], hitY = player.pos.y + { low: 0.55, mid: 1.2, high: 1.65 }[lvl ? lvl.level : 'mid'];   // where on the bag the strike lands
    if (MAP.hitBags(player.pos.x, player.pos.z, fx, fz, def.reach, def.impulse, hitY)) { toast('HIT · ' + name.toUpperCase(), 'hit'); }
    const A = PATK[name]; if (!A) return;
    if (versus) { vsStrike(name, side, def, A, fx, fz); return; }
    const bx = bot.x - player.pos.x, bz = bot.z - player.pos.z, d = Math.hypot(bx, bz);
    const held = clinch && clinch.holder === 'player';           // inside our own plum every knee / elbow connects, harder
    if (!held && (d < 0.01 || (bx * fx + bz * fz) / d < 0.62)) { // bot not in front of the strike: a whiff the bot may punish
      bot.receive({ type: A.type || name, side, level: A.level, reach: def.reach, dmg: 0, dist: 99, dx: 0, dz: 0 });
      if (training()) trainNote(name, A, 'miss', 0);
      return;
    }
    const dmgScale = (0.4 + 0.6 * Math.min(1, stamina / 60)) * (held ? 1.4 : 1);   // tired strikes hurt less
    // combo: distinct strikes that keep landing build a bonus (3+), a heavy finisher adds more; a repeated move or any miss / block resets it
    const n = lastRepeat ? 1 : (time - comboT < 2.0 ? combo : 0) + 1;
    const cMul = n >= 3 ? (1 + 0.08 * Math.min(3, n - 2)) * (HEAVY.has(name) ? 1.15 : 1) : 1, base = A.dmg * dmgScale;
    const res = bot.receive({ type: A.type || name, side, level: A.level, reach: def.reach, dmg: base * cMul, cap: base * 2, dist: d, dx: bx / d, dz: bz / d, counter: time < counterUntil });
    if (res === 'hit') { counterUntil = 0; combo = n; comboT = time; if (n >= 2) toast('COMBO ×' + n + (cMul > 1 ? ' · +' + Math.round((cMul - 1) * 100) + '%' : ''), 'hot'); }
    else combo = 0;
    if (held && res === 'hit') clinch.meter = Math.max(0, clinch.meter - 18);                   // damage wears down its escape
    if (training()) trainNote(name, A, res, bot.lastDmg || A.dmg * dmgScale);
    if (res === 'hit' && bot.lastCrit) { toast('CRITICAL · ' + bot.lastCrit, 'hit'); shake = Math.max(shake, 0.45); }
    else if (res === 'hit') toast('HIT · ' + name.toUpperCase(), 'hit');
    else if (res === 'blocked') toast('BLOCKED', 'hot');
    else if (res === 'checked') toast('CHECKED', 'hot');
    else if (res === 'dodged') toast('DODGED', 'hot');
    if (res === 'hit') shake = Math.max(shake, 0.25);
  };

  bot.onTelegraph = a => {
    const mySide = a.side === 'L' ? 'R' : 'L';
    const hint = BOT_HINT[a.name] + (a.type === 'hook' || a.level !== 'high' || a.type === 'highkick' ? ' ' + (a.type === 'teep' ? '' : mySide) : '');
    $('telegraph').textContent = BOT_NAME[a.name] + '  →  ' + hint; teleT = 0.9;
  };
  bot.onActive = a => {
    const dx = player.pos.x - bot.x, dz = player.pos.z - bot.z, d = Math.hypot(dx, dz);
    if (d - bot.f.cur[22] > a.reach + 0.3 + (lean ? lean.disp : 0)) return;     // judged from where you stood before the lean
    if (avoided(a)) return;
    if (a.type === 'plum') {                                      // the bot reaches for the plum
      if (clinch) return;
      if ((vm.holds.longGuard && Math.random() < 0.7) || !player.onGround) { toast('PLUM AVOIDED', 'hot'); return; }
      startClinch('bot'); return;
    }
    if (incoming(a, dx, dz, d, (DIFF[settings.difficulty] || DIFF.normal).dmg) === 'checked') bot.stagger();
  };
  // jumped over a low kick / ducked under a high one
  function avoided(a) {
    if (leanActive('back') && (a.level === 'high' || a.type === 'plum')) { leanDodged('LEANED OUT'); return true; }
    if (leanActive('slip') && a.level === 'high' && (a.type === 'jab' || a.type === 'cross')) { leanDodged('SLIPPED'); return true; }
    if (a.level === 'low' && player.pos.y - bot.y > 0.5) { toast('JUMPED IT', 'hot'); return true; }
    if (a.level === 'high' && (player.crouched || player.sliding)) { toast('DUCKED', 'hot'); return true; }
    return false;
  }
  // a strike reaches the player (from the bot, or from the other player online): block / check / take it. Returns hit | blocked | checked
  function incoming(a, dx, dz, d, mul) {
    const mySide = a.side === 'L' ? 'R' : 'L', h = vm.holds;
    const punch = a.type === 'jab' || a.type === 'cross' || a.type === 'hook';
    const sideOk = a.type === 'jab' || a.type === 'cross';
    let res = 'hit';
    if (h.longGuard && (a.type === 'jab' || a.type === 'cross' || a.type === 'teep')) res = 'blocked';
    else if (h.block && (punch || a.type === 'highkick' || a.type === 'midkick') && (sideOk || h.block === mySide)) res = 'blocked';
    else if (h.check === a.level && (h.checkSide === mySide || a.type === 'teep') && a.type !== 'jab' && !punch) res = 'checked';
    if (res === 'checked') { toast('CHECKED +STAMINA', 'hot'); counterUntil = time + 1.0; stamina = Math.min(100, stamina + 7); return res; }
    let dmg = a.dmg * mul, crit = null;
    if (res === 'hit') {                                           // caught mid-swing, or the bot punishing your own whiff / block, is a critical
      if (vm.busy) { crit = 'INTERRUPTED'; dmg *= 1.6; vm.interrupt(); stamDelay = 1.2; } else if (a.counter) { crit = 'COUNTER'; dmg *= 1.5; }
    }
    dmg = Math.round(dmg * 10) / 10;
    if (res === 'blocked') { toast('BLOCKED +STAMINA', 'hot'); counterUntil = time + 1.0; stamina = Math.min(100, stamina + 7); if (!training()) hp = Math.max(1, hp - dmg * 0.15); shake = Math.max(shake, 0.1); }
    else { toast((crit ? 'CRITICAL · ' + crit + ' · ' : '') + (training() ? 'WOULD HIT · -' + dmg + ' HP' : '-' + dmg + ' HP'), 'hit'); damagePlayer(dmg); if (player.onGround && d > 0.01) { player.vel.x += dx / d * 3; player.vel.z += dz / d * 3; } }
    return res;
  }
  bot.onKO = () => toast('BOT KO', 'hot');

  // Roundhouse opens with a 45-degree step: shove the body diagonally forward, away from the kicking side.
  vm.onStart = (name, side, def) => {
    hist = hist.filter(h => time - h.t < 3); lastRepeat = hist.slice(-3).some(h => h.name === name);
    const flow = !lastRepeat && hist.length && time - lastStrikeT < 1.2;
    hist.push({ name, t: time }); lastStrikeT = time;
    stamina = Math.max(0, stamina - (COST[name] || 12) * (lastRepeat ? 1.25 : flow ? 0.8 : 1)); stamDelay = 1.2;
    const lvl = PATK[name];
    if (versus) NET.send({ t: 'mv', n: name, s: side });
    else if (lvl && Math.hypot(bot.x - player.pos.x, bot.z - player.pos.z) < 5) bot.notice(name === 'knee' ? 'midkick' : name === 'elbow' ? 'hook' : lvl.type || name, side, lvl.level);
    if (!def.step || !player.onGround || player.mantle) return;
    const sy = Math.sin(player.yaw), cy = Math.cos(player.yaw), s = side === 'R' ? -1 : 1, r = Math.SQRT1_2;
    const dx = -sy * r + cy * r * s, dz = -cy * r + -sy * r * s;
    player.vel.x += dx * def.step; player.vel.z += dz * def.step;
  };
  function goZone(i) {
    endClinch(); zoneIdx = (i + MAP.spawns.length) % MAP.spawns.length; player.respawn(MAP.spawns[zoneIdx]); hp = 100; stamina = 100; bot.reset();
    peak = 0; $('zone').textContent = MAP.spawns[zoneIdx].name;
  }
  applyBotSettings();
  goZone(0);

  // ---------- aiming: strike height follows where the crosshair points ----------
  // Height (above the target's feet) of the point under the crosshair, measured at the bot's distance when it is
  // roughly ahead and close, otherwise 2 m out.
  function aimHeight() {
    const dx = bot.x - player.pos.x, dz = bot.z - player.pos.z, d = Math.hypot(dx, dz);
    const near = d < 6 && d > 0.01 && (dx * -Math.sin(player.yaw) + dz * -Math.cos(player.yaw)) / d > 0.5;
    return player.pos.y + eye + Math.tan(player.pitch) * (near ? d : 2) - (near ? bot.y : player.pos.y);
  }
  const kickLevel = () => { const h = aimHeight(); return h < 0.7 ? 'low' : h < 1.4 ? 'mid' : 'high'; };
  const kickName = () => ({ low: 'legkick', mid: 'midkick', high: 'highkick' })[kickLevel()];
  const punchName = base => (aimHeight() < 1.15 ? base + 'B' : base);

  // ---------- bindings (rebindable; keyboard codes plus mouse buttons as Mouse0..Mouse4) ----------
  const A = (group, id, label, def) => ({ group, id, label, def });
  const ACTIONS = [
    A('Movement', 'fwd', 'Move forward', ['KeyW']), A('Movement', 'back', 'Move back', ['KeyS']),
    A('Movement', 'left', 'Strafe left', ['KeyA']), A('Movement', 'right', 'Strafe right', ['KeyD']),
    A('Movement', 'jump', 'Jump (hold to bhop)', ['Space']), A('Movement', 'crouch', 'Crouch / slide', ['KeyC', 'ControlLeft']),
    A('Movement', 'walk', 'Walk (sprint if auto-sprint is off)', ['ShiftLeft']), A('Movement', 'autoSprint', 'Toggle auto-sprint', ['KeyT']),
    A('Punches · aim low = body, level = head', 'jab', 'Jab (lead hand)', ['Mouse0']), A('Punches · aim low = body, level = head', 'cross', 'Cross (rear hand)', ['Mouse2']),
    A('Punches · aim low = body, level = head', 'hookR', 'Right hook', ['KeyR', 'Mouse1']), A('Punches · aim low = body, level = head', 'hookL', 'Left hook', ['KeyE']),
    A('Kicks · aim = target (legs / body / head)', 'kick', 'Roundhouse kick', ['Digit1']), A('Kicks · aim = target (legs / body / head)', 'sideMod', 'Hold: use LEFT leg / hand', ['KeyQ']),
    A('Kicks · aim = target (legs / body / head)', 'teepL', 'Teep, lead leg', ['Digit2']), A('Kicks · aim = target (legs / body / head)', 'teepR', 'Teep, rear leg', ['Digit3']),
    A('Kicks · aim = target (legs / body / head)', 'knee', 'Knee', ['Digit5']), A('Kicks · aim = target (legs / body / head)', 'elbow', 'Elbow', ['Digit6']),
    A('Defence (hold)', 'checkLow', 'Check low', ['KeyZ']), A('Defence (hold)', 'checkMid', 'Check mid', ['KeyX']), A('Defence (hold)', 'checkHigh', 'Check high', ['KeyV']),
    A('Defence (hold)', 'blockL', 'Block left', ['KeyF']), A('Defence (hold)', 'blockR', 'Block right', ['KeyB']), A('Defence (hold)', 'longGuard', 'Long guard', ['KeyH']),
    A('Evasion (tap)', 'leanBack', 'Lean back (head strikes + plum; not body/legs)', ['WheelDown']), A('Evasion (tap)', 'slip', 'Slip (head jab / cross, not body; strafe key picks the side)', ['WheelUp']),
    A('Clinch', 'clinch', 'Plum clinch / release  (tap Jab + Cross fast to escape)', ['KeyG']),
    A('Ring & training', 'interact', 'Enter / exit the ring (at the green corner)', ['KeyY']),
    A('Ring & training', 'modeToggle', 'Toggle sparring / training mode', ['KeyM']), A('Ring & training', 'trainBot', 'Training bot: dummy / guard / drill', ['KeyU']),
    A('Ring & training', 'difficulty', 'Cycle bot difficulty', ['KeyN']),
    A('Other', 'respawn', 'Respawn / reset', ['Backspace']), A('Other', 'zoneNext', 'Next zone', ['BracketRight']), A('Other', 'zonePrev', 'Previous zone', ['BracketLeft']),
    A('Other', 'help', 'Show / hide controls', ['F1', 'Tab']),
  ];
  const DEFAULT_BINDS = {}; for (const a of ACTIONS) DEFAULT_BINDS[a.id] = [a.def[0] || null, a.def[1] || null];
  let binds = JSON.parse(JSON.stringify(DEFAULT_BINDS));
  try {
    const s = JSON.parse(localStorage.getItem('mtfps-binds') || '{}');
    for (const id in s) if (binds[id] && Array.isArray(s[id])) binds[id] = [s[id][0] || null, s[id][1] || null];
  } catch (e) {}
  const saveBinds = () => { try { localStorage.setItem('mtfps-binds', JSON.stringify(binds)); } catch (e) {} };
  const MOUSE_NAMES = { Mouse0: 'Left Click', Mouse1: 'Middle Click', Mouse2: 'Right Click', Mouse3: 'Mouse 4 (Back)', Mouse4: 'Mouse 5 (Forward)', WheelDown: 'Scroll Down', WheelUp: 'Scroll Up' };
  const codeLabel = c => !c ? '—' : MOUSE_NAMES[c] || c.replace(/^Key/, '').replace(/^Digit/, '').replace('ShiftLeft', 'L-Shift').replace('ShiftRight', 'R-Shift')
    .replace('ControlLeft', 'L-Ctrl').replace('BracketLeft', '[').replace('BracketRight', ']').replace(/^Arrow/, 'Arrow ');
  const bindLabel = id => binds[id].filter(Boolean).map(codeLabel).join(' / ') || 'unbound';
  const keys = {};
  const isDown = id => binds[id].some(c => c && keys[c]);
  const actionsFor = code => ACTIONS.filter(a => binds[a.id].includes(code)).map(a => a.id);
  const isBound = code => code === 'F1' || code === 'Tab' || actionsFor(code).length > 0;

  function renderHelp() {
    let html = '', group = '';
    for (const a of ACTIONS) {
      if (a.group !== group) { group = a.group; html += '<h4>' + group + '</h4>'; }
      html += '<div><span>' + a.label + '</span><span><kbd>' + bindLabel(a.id) + '</kbd></span></div>';
    }
    $('help').innerHTML = html;
  }

  // ---------- combat input: stamina, attacks, clinch ----------
  const COST = { jab: 8, cross: 12, hook: 14, jabB: 9, crossB: 13, hookB: 15, legkick: 22, midkick: 22, highkick: 26, teep: 15, knee: 18, elbow: 15 };
  // combos: a fresh move flowing off the last one is cheaper and builds a bonus; repeating a recent move costs extra and builds nothing
  let counterUntil = 0, hist = [], lastStrikeT = -9, lastRepeat = false, combo = 0, comboT = -9;
  const HEAVY = new Set(['legkick', 'midkick', 'highkick', 'hook', 'elbow', 'knee']);
  // lean back (wheel down) and slip (wheel up): timed evasions. Spamming one doubles its stamina cost each time.
  const LEAN = { back: { cost: 8, start: 0.08, act: 0.38, end: 0.63, dist: 0.3 }, slip: { cost: 5, start: 0.06, act: 0.28, end: 0.5, dist: 0.3 } };
  let lean = null; const leanStreak = { back: [0, -9], slip: [0, -9] };
  const leanActive = kind => lean && lean.kind === kind && time - lean.t >= LEAN[kind].start && time - lean.t <= LEAN[kind].act;
  function startLean(kind) {
    if (clinch || (versus && vsKO > 0) || vm.busy || !player.onGround) return;
    if (lean) return;                                              // still going / recovering
    if (stamina < 1) { toast('NO STAMINA', 'hot'); return; }
    const L = LEAN[kind], s = leanStreak[kind];
    s[0] = time - s[1] < 0.8 ? Math.min(3, s[0] + 1) : 0;
    const cost = L.cost * Math.pow(2, s[0]); s[1] = time + L.end;
    stamina = Math.max(0, stamina - cost); stamDelay = 1.0;
    let dir = 0;
    if (kind === 'slip') dir = player.input.side || (bot.attack && bot.attack.def.side === 'L' ? -1 : 1);   // away from the side the punch comes down
    lean = { kind, t: time, dir, amt: 0, disp: 0, dodged: false };
    toast((kind === 'back' ? 'LEAN BACK' : 'SLIP') + (s[0] ? ' · COST ×' + Math.pow(2, s[0]) : ''), 'hot');
    if (!versus) bot.playerEvade(kind, Math.hypot(bot.x - player.pos.x, bot.z - player.pos.z));
  }
  function stepLean(dt) {
    const L = LEAN[lean.kind], e = time - lean.t, ramp = L.start + 0.07;
    const amt = e >= L.end ? 0 : e < ramp ? e / ramp : e < L.act ? 1 : 1 - (e - L.act) / (L.end - L.act);
    const d = (amt - lean.amt) * L.dist, sy = Math.sin(player.yaw), cy = Math.cos(player.yaw);
    if (lean.kind === 'back') { player.pos.x += sy * d; player.pos.z += cy * d; }          // backwards = -forward = (sin, cos)
    else { player.pos.x += cy * d * lean.dir; player.pos.z -= sy * d * lean.dir; }          // right = (cos, -sin)
    lean.amt = amt; lean.disp = amt * L.dist;
    if (e >= L.end) lean = null;
  }
  function leanDodged(msg) {
    lean.dodged = true; counterUntil = time + 1.0; stamina = Math.min(100, stamina + 5); toast(msg + ' +STAMINA', 'hot');
  }
  function attack(name, sideMod) {
    if (versus && vsKO > 0) return;
    if (clinch) { if (clinch.holder === 'player' && (name === 'knee' || name === 'elbow') && stamina >= 4) vm.trigger(name, sideMod); return; }
    if (lean && !lean.dodged) return;                              // committed to the evasion until it ends (a clean dodge lets you counter at once)
    if (stamina < 1) { toast('NO STAMINA', 'hot'); return; }
    vm.trigger(name, sideMod);
  }
  function mash(id) {
    if (!clinch || clinch.holder !== 'bot') return false;
    clinch.meter += id === clinch.last ? 5 : 11; clinch.last = id; shake = Math.max(shake, 0.07);
    return true;
  }
  function handle(id) {
    switch (id) {
      case 'jump': player.jumpBuf = 0.13; break;
      case 'crouch': player.crouchEdge = 0.1; break;
      case 'left': case 'right': player.tapEdge = 0.12; break;
      case 'jab': if (!mash('jab')) attack(punchName('jab')); break;
      case 'cross': if (!mash('cross')) attack(punchName('cross')); break;
      case 'hookR': attack(punchName('hook'), isDown('sideMod')); break;
      case 'hookL': attack(punchName('hook'), true); break;
      case 'kick': attack(kickName(), isDown('sideMod')); break;
      case 'teepL': attack('teep', true); break;
      case 'teepR': attack('teep', false); break;
      case 'knee': attack('knee', isDown('sideMod')); break;
      case 'elbow': attack('elbow', isDown('sideMod')); break;
      case 'checkLow': case 'checkMid': case 'checkHigh': vm.setHolds({ checkSide: isDown('sideMod') ? 'L' : 'R' }); break;
      case 'leanBack': startLean('back'); break;
      case 'slip': startLean('slip'); break;
      case 'clinch': toggleClinch(); break;
      case 'interact': useGate(); break;
      case 'modeToggle': if (!versus) setMode(training() ? 'spar' : 'train'); break;
      case 'trainBot': if (!versus) setTrainBot(cycle(TRAIN_BOTS, settings.trainBot)); break;
      case 'difficulty': if (!versus) setDifficulty(cycle(DIFF, settings.difficulty)); break;
      case 'respawn': if (!versus) goZone(zoneIdx); break;
      case 'zoneNext': if (!versus) goZone(zoneIdx + 1); break;
      case 'zonePrev': if (!versus) goZone(zoneIdx - 1); break;
      case 'autoSprint': settings.autoSprint = !settings.autoSprint; $('auto').checked = settings.autoSprint; saveSettings(); toast('AUTO-SPRINT ' + (settings.autoSprint ? 'ON' : 'OFF')); break;
      case 'help': $('help').classList.toggle('hidden'); break;
    }
  }

  // Ring entrance: stand near the green corner; inside the ring you get "exit", outside you get "enter".
  function useGate() {
    if (!gateMode || clinch) return;
    const G = MAP.GATE, R = MAP.RING;
    if (gateMode === 'exit') { player.pos.x = G.x + 1.7; player.pos.z = G.z + 1.7; player.pos.y = 0; toast('LEFT THE RING'); }
    else { player.pos.x = G.x - 1.4; player.pos.z = G.z - 1.4; player.pos.y = R.y; player.yaw = Math.PI / 4; toast('ENTERED THE RING'); }
    player.vel.x = player.vel.y = player.vel.z = 0; player.onGround = true; Object.assign(player.prev, player.pos);
  }

  // Plum clinch. holder 'player': we have the bot's head (knee / elbow for bonus damage, bot struggles free over time).
  // holder 'bot': the bot has us; tap jab + cross (alternating is worth more) to fill the escape bar before it knees us up.
  function toggleClinch() {
    if (versus) { toast('NO CLINCH ONLINE YET', 'hot'); return; }
    if (clinch) { if (clinch.holder === 'player') endClinch('release'); return; }
    const dx = bot.x - player.pos.x, dz = bot.z - player.pos.z, d = Math.hypot(dx, dz);
    const front = d > 0.01 && (dx * -Math.sin(player.yaw) + dz * -Math.cos(player.yaw)) / d > 0.55;
    if (bot.ko || !front || d > 1.8 || !player.onGround) { toast('NO CLINCH RANGE', 'hot'); return; }
    if (stamina < 12) { toast('NO STAMINA', 'hot'); return; }
    stamina -= 12; stamDelay = 0.8;
    if ((bot.attack && bot.f.u < 0.7) || (bot.def && bot.def.type === 'evade')) { toast('CLINCH FAILED', 'hot'); return; }
    startClinch('player');
  }
  function startClinch(holder) {
    if (clinch) return;
    const dx = bot.x - player.pos.x, dz = bot.z - player.pos.z, d = Math.hypot(dx, dz) || 1;
    clinch = { holder, t: 0, meter: 0, last: null, dirx: dx / d, dirz: dz / d, nextKnee: 1.0, kneeAt: null };
    player.vel.x = player.vel.z = 0;
    bot.locked = true; bot.attack = null; bot.queue.length = 0; bot.def = null; bot.react = null; bot._counter = null; bot.f.anim = null;
    vm.setHolds({ clinch: holder === 'player' ? 'hold' : 'held' });
    $('clinch').classList.remove('hidden');
    toast(holder === 'player' ? 'PLUM CLINCH' : 'BOT HAS THE PLUM — TAP ' + codeLabel(binds.jab[0]).toUpperCase() + ' + ' + codeLabel(binds.cross[0]).toUpperCase(), 'hot');
  }
  function endClinch(why) {
    if (!clinch) return;
    clinch = null; vm.setHolds({ clinch: null });
    bot.locked = false; bot.f.base = STANCE; bot.f.anim = null; $('clinch').classList.add('hidden');
    const dx = bot.x - player.pos.x, dz = bot.z - player.pos.z, d = Math.hypot(dx, dz) || 1, nx = dx / d, nz = dz / d;
    bot.cool = 1.0; bot._counter = null;
    if (why === 'escaped') { toast('ESCAPED!', 'hot'); bot.kbx += nx * 4; bot.kbz += nz * 4; bot.stagger(); player.vel.x -= nx * 2; player.vel.z -= nz * 2; stamina = Math.max(0, stamina - 8); }
    else if (why === 'bot-released') { toast('BOT RELEASED', 'hot'); bot.kbx += nx * 1.5; bot.kbz += nz * 1.5; player.vel.x -= nx * 4; player.vel.z -= nz * 4; }
    else if (why === 'broke') { toast('BOT BROKE FREE', 'hot'); bot.kbx += nx * 3.5; bot.kbz += nz * 3.5; bot.cool = 0.5; }
    else if (why === 'release') { toast('RELEASED'); bot.kbx += nx * 3; bot.kbz += nz * 3; }
    else if (why === 'exhausted') { toast('OUT OF STAMINA', 'hot'); bot.kbx += nx * 3; bot.kbz += nz * 3; }
  }
  function updateClinch(dt) {
    const c = clinch; c.t += dt;
    if (bot.ko) { endClinch('release'); return; }
    // hold the bot at arm's length in front of the player, both facing each other
    const R = MAP.RING;
    bot.x = Math.max(R.cx - R.hx + 0.4, Math.min(R.cx + R.hx - 0.4, player.pos.x + c.dirx * 0.82));
    bot.z = Math.max(R.cz - R.hz + 0.4, Math.min(R.cz + R.hz - 0.4, player.pos.z + c.dirz * 0.82));
    const bx = player.pos.x - bot.x, bz = player.pos.z - bot.z;
    bot.facing = Math.atan2(-bx, -bz);
    const want = Math.atan2(bot.x - player.pos.x, bot.z - player.pos.z) + Math.PI;   // yaw that looks at the bot
    let dyaw = want - player.yaw; dyaw = Math.atan2(Math.sin(dyaw), Math.cos(dyaw)); player.yaw += dyaw * Math.min(1, dt * 7);
    bot.f.base = c.holder === 'player' ? BCL.held : BCL.hold;
    const label = $('clinchLabel'), fill = $('clinchFill');
    if (c.holder === 'player') {
      stamina = Math.max(0, stamina - 6 * dt); stamDelay = 0.6;
      c.meter += dt * (17 + bot.skill * 6);
      label.textContent = 'PLUM · BOT STRUGGLING  (knee / elbow to wear it down · ' + codeLabel(binds.clinch[0]) + ' to release)'; fill.style.background = '#ff7a2e';
      if (stamina <= 0) endClinch('exhausted'); else if (c.meter >= 100) endClinch('broke');
    } else {
      c.meter = Math.max(0, c.meter - 18 * dt);
      c.nextKnee -= dt;
      if (c.nextKnee <= 0) { c.nextKnee = 1.2; c.kneeAt = c.t + 0.4; bot.f.play(BCL.knee); }
      if (c.kneeAt && c.t >= c.kneeAt) { c.kneeAt = null; toast('-7 HP · KNEE', 'hit'); damagePlayer(7); c.meter *= 0.8; }
      label.textContent = 'ESCAPE: TAP ' + codeLabel(binds.jab[0]).toUpperCase() + ' + ' + codeLabel(binds.cross[0]).toUpperCase() + ' FAST'; fill.style.background = '#6fd3ff';
      if (clinch && c.meter >= 100) endClinch('escaped'); else if (clinch && c.t > 6) endClinch('bot-released');
    }
    if (clinch) fill.style.width = Math.min(100, c.meter) + '%';
  }
  function damagePlayer(n) {
    hurtFlash = training() ? 0.35 : 1; shake = Math.max(shake, 0.4); combo = 0;
    if (training()) return;                                       // training: hits show up but never hurt
    hp -= n;
    if (versus) { if (hp <= 0 && vsKO <= 0) { hp = 0; vsKO = 3.4; vsScore.opp++; NET.send({ t: 'ko' }); toast('YOU WERE KO\'D', 'hit'); vsHud(); } return; }
    if (hp <= 0) { toast('KO', 'hit'); hp = 100; stamina = 100; endClinch(); bot.reset(); player.respawn(MAP.spawns[zoneIdx]); }
  }

  // ---------- online versus (two players over a WebRTC data channel; see net.js) ----------
  // Each browser runs its own player. The other player is shown on the bot's body (bot.mode = 'remote'), driven by ~20 Hz state
  // messages plus move-start events. The attacker says "I landed X"; the defender decides hit / blocked / checked against its own
  // guard and replies, so blocks and ducks are judged by the person who actually did them.
  const REMOTE_MOVE = { jab: 'jab', cross: 'cross', jabB: 'jabB', crossB: 'crossB', legkick: 'legkick', midkick: 'midkick', highkick: 'highkick', knee: 'knee' };
  function remoteMove(name, side) {
    if (REMOTE_MOVE[name]) return REMOTE_MOVE[name];
    if (name === 'hook' || name === 'elbow') return side === 'L' ? 'lhook' : 'rhook';
    if (name === 'hookB') return side === 'L' ? 'lhookB' : 'rhook';
    if (name === 'teep') return side === 'L' ? 'teep' : 'rteep';
    return null;
  }
  const vsSpawn = host => { const R = MAP.RING; return { x: R.cx, y: R.y, z: R.cz + (host ? 2.6 : -2.6), yaw: host ? 0 : Math.PI }; };
  function vsHud() {
    const box = $('vsBox'); box.classList.toggle('hidden', !versus);
    if (versus) box.textContent = 'ROOM ' + NET.code() + '   YOU ' + vsScore.me + ' – ' + vsScore.opp + ' OPPONENT';
  }
  function vsStrike(name, side, def, A, fx, fz) {
    if (bot.ko || vsKO > 0) return;
    const bx = bot.x - player.pos.x, bz = bot.z - player.pos.z, d = Math.hypot(bx, bz);
    if (d < 0.01 || (bx * fx + bz * fz) / d < 0.62 || d - bot.f.cur[22] > def.reach + 0.45) return;      // whiff
    const dmg = A.dmg * (0.65 + 0.35 * Math.min(1, stamina / 45));
    NET.send({ t: 'hit', a: { type: A.type || name, side, level: A.level, dmg, name }, dx: bx / d, dz: bz / d, d });
  }
  function vsRound() {                                              // new round: both back to their corners, full health
    const host = NET.role() === 'host', o = vsSpawn(!host);
    hp = 100; stamina = 100; vsKO = 0; hurtFlash = 0;
    player.respawn(vsSpawn(host));
    bot.ko = false; bot.hp = 100; bot.f.anim = null; bot.f.base = STANCE; bot.f.cur = STANCE.slice();
    Object.assign(bot.remote, { x: o.x, y: o.y, z: o.z, yaw: o.yaw, hold: null, crouch: false });
    bot.x = o.x; bot.y = o.y; bot.z = o.z; bot.facing = o.yaw;
    vsHud(); toast('FIGHT!', 'hot');
  }
  function startVersus() {
    versus = true; vsScore.me = vsScore.opp = 0; vsSendT = 0;
    endClinch(); bot.reset(); bot.mode = 'remote'; bot.noDamage = true; bot.locked = false;
    renderTrain(); $('prompt').textContent = ''; $('telegraph').style.opacity = 0;
    vsRound(); toast('CONNECTED — ' + (NET.role() === 'host' ? 'YOU HOST' : 'YOU JOINED'), 'hot');
    $('vsStatus').textContent = 'Connected to room ' + NET.code() + ' — click to play'; $('vsLeave').classList.remove('hidden');
  }
  function endVersus(msg) {
    if (!versus) return;
    versus = false; vsKO = 0; vsHud(); applyBotSettings(); resetFight(); goZone(zoneIdx);
    toast(msg || 'LEFT THE MATCH', 'hot');
    $('vsStatus').textContent = msg || ''; $('vsLeave').classList.add('hidden');
  }
  function vsTick(dt) {
    if (vsKO > 0) { vsKO -= dt; if (vsKO <= 0) vsRound(); }
    vsSendT -= dt;
    if (vsSendT <= 0) {
      vsSendT = 0.05;
      const h = vm.holds; let hold = null;
      if (h.longGuard) hold = { type: 'long' }; else if (h.block) hold = { type: 'block' };
      else if (h.check) hold = { type: 'check', level: h.check, side: h.checkSide === 'L' ? 'L' : 'R' };
      const r3 = v => Math.round(v * 1000) / 1000;
      NET.send({ t: 's', x: r3(player.pos.x), y: r3(player.pos.y), z: r3(player.pos.z), yaw: r3(player.yaw), h: hold, c: player.crouched || player.sliding ? 1 : 0, hp: Math.max(0, Math.round(hp)), st: Math.round(stamina) });
    }
  }
  function onNet(m) {
    if (!versus || !m) return;
    switch (m.t) {
      case 's': { const r = bot.remote; r.x = m.x; r.y = m.y; r.z = m.z; r.yaw = m.yaw; r.hold = m.h || null; r.crouch = !!m.c; bot.hp = m.hp; bot.stam = m.st; break; }
      case 'mv': { const k = remoteMove(m.n, m.s); if (k && !bot.ko) bot.f.play(BMOVES[k]); break; }
      case 'hit': {
        if (vsKO > 0) { NET.send({ t: 'res', r: 'miss' }); break; }
        const res = avoided(m.a) ? 'dodged' : incoming(m.a, m.dx, m.dz, m.d, 1);
        if (res === 'checked') bot.f.play(BSTAGGER);
        NET.send({ t: 'res', r: res, n: m.a.name });
        break;
      }
      case 'res': {
        if (m.r === 'hit') { bot.f.flash = 1; bot.f.play(BFLINCH); toast('HIT · ' + (m.n || '').toUpperCase(), 'hit'); shake = Math.max(shake, 0.25); }
        else if (m.r === 'blocked') toast('BLOCKED', 'hot');
        else if (m.r === 'checked') { toast('CHECKED', 'hot'); const dx = player.pos.x - bot.x, dz = player.pos.z - bot.z, d = Math.hypot(dx, dz) || 1; player.vel.x += dx / d * 3; player.vel.z += dz / d * 3; }
        else if (m.r === 'dodged') toast('DODGED', 'hot');
        break;
      }
      case 'ko': if (vsKO <= 0) { vsScore.me++; vsKO = 3.4; bot.ko = true; bot.f.play(BKO); toast('KO!', 'hot'); vsHud(); } break;
    }
  }
  NET.onMessage = onNet;
  NET.onOpen = () => startVersus();
  NET.onClose = () => endVersus('OPPONENT LEFT');
  NET.onStatus = s => { $('vsStatus').textContent = s; };
  $('vsHost').onclick = () => { if (!NET.supported()) { $('vsStatus').textContent = 'Online play library failed to load (offline?)'; return; } NET.host(); };
  $('vsJoin').onclick = () => { if (!NET.supported()) { $('vsStatus').textContent = 'Online play library failed to load (offline?)'; return; } NET.join($('vsCode').value); };
  $('vsLeave').onclick = () => { NET.leave(); endVersus('LEFT THE MATCH'); };

  // ---------- input events ----------
  let rebinding = null, rebindEnd = 0;
  function press(code) { for (const id of actionsFor(code)) handle(id); }
  function setBind(code) {
    const { id, slot } = rebinding; rebinding = null; rebindEnd = performance.now();
    for (const k in binds) for (let i = 0; i < 2; i++) if (binds[k][i] === code && !(k === id && i === slot)) binds[k][i] = null;   // one code, one action
    binds[id][slot] = code; saveBinds(); renderBinds(); renderHelp();
  }
  addEventListener('keydown', e => {
    if (e.target && e.target.tagName === 'INPUT' && e.target.type === 'text') return;     // typing a room code
    if (rebinding) { e.preventDefault(); if (e.code === 'Escape') { rebinding = null; rebindEnd = performance.now(); renderBinds(); } else setBind(e.code); return; }
    if (isBound(e.code)) e.preventDefault();
    if (e.repeat) return;
    keys[e.code] = true;
    if (locked) press(e.code);
  });
  addEventListener('keyup', e => { keys[e.code] = false; });
  addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
  addEventListener('contextmenu', e => e.preventDefault());
  addEventListener('mousedown', e => {
    const code = 'Mouse' + e.button;
    if (rebinding) { e.preventDefault(); setBind(code); return; }
    if (e.button >= 1) e.preventDefault();
    if (!locked) return;
    keys[code] = true; press(code);
  });
  let wheelT = 0;                                                  // one scroll gesture = one action (free-spin wheels / trackpads fire bursts)
  addEventListener('wheel', e => {
    const code = e.deltaY > 0 ? 'WheelDown' : e.deltaY < 0 ? 'WheelUp' : null; if (!code) return;
    if (rebinding) { e.preventDefault(); setBind(code); return; }
    if (!locked) return;
    e.preventDefault();
    const now = performance.now(), fresh = now - wheelT > 90; wheelT = now;
    if (fresh) press(code);
  }, { passive: false });
  addEventListener('mouseup', e => { const code = 'Mouse' + e.button; keys[code] = false; if (e.button >= 3) e.preventDefault(); });
  addEventListener('auxclick', e => { if (e.button >= 1) e.preventDefault(); });
  addEventListener('mousemove', e => {
    if (!locked) return;
    const s = 0.0022 * settings.sens;
    player.yaw -= e.movementX * s; player.pitch = Math.max(-1.5, Math.min(1.5, player.pitch - e.movementY * s));
  });

  const canvas = $('c'), overlay = $('overlay');
  overlay.addEventListener('click', e => {
    if (e.target.closest('.settings, #binds') || rebinding || performance.now() - rebindEnd < 400) return;
    canvas.requestPointerLock && canvas.requestPointerLock();
  });
  canvas.addEventListener('click', () => { if (!locked) canvas.requestPointerLock(); });
  document.addEventListener('pointerlockchange', () => {
    locked = document.pointerLockElement === canvas; overlay.classList.toggle('hidden', locked);
    if (!locked) for (const k in keys) keys[k] = false;
  });

  // settings UI: sliders + rebindable controls
  const sens = $('sens'), fov = $('fov'), auto = $('auto');
  sens.value = settings.sens; fov.value = settings.fov; auto.checked = settings.autoSprint;
  const syncLabels = () => { $('sensv').textContent = (+sens.value).toFixed(2); $('fovv').textContent = fov.value; };
  syncLabels();
  sens.oninput = () => { settings.sens = +sens.value; syncLabels(); saveSettings(); };
  fov.oninput = () => { settings.fov = +fov.value; syncLabels(); saveSettings(); };
  auto.onchange = () => { settings.autoSprint = auto.checked; saveSettings(); };
  $('modeSel').onchange = e => setMode(e.target.value);
  $('diffSel').onchange = e => setDifficulty(e.target.value);
  $('trainSel').onchange = e => setTrainBot(e.target.value);
  applyBotSettings();

  function renderBinds() {
    const box = $('binds'); box.innerHTML = ''; let group = '';
    const note = document.createElement('div'); note.style.cssText = 'grid-column:1/-1;font-size:11px'; note.textContent = 'Click a slot, then press a key, mouse button (side buttons work) or scroll the wheel. Right-click a slot to clear it. Esc cancels.'; box.appendChild(note);
    for (const a of ACTIONS) {
      if (a.group !== group) { group = a.group; const h = document.createElement('div'); h.style.cssText = 'grid-column:1/-1;color:var(--acc);letter-spacing:.12em;font-size:11px;margin-top:6px;text-transform:uppercase'; h.textContent = group; box.appendChild(h); }
      const l = document.createElement('div'); l.textContent = a.label; box.appendChild(l);
      for (let slot = 0; slot < 2; slot++) {
        const b = document.createElement('button');
        const waiting = rebinding && rebinding.id === a.id && rebinding.slot === slot;
        b.textContent = waiting ? 'press a key…' : codeLabel(binds[a.id][slot]); if (waiting) b.className = 'wait';
        b.onclick = ev => { ev.stopPropagation(); rebinding = { id: a.id, slot }; renderBinds(); };
        b.oncontextmenu = ev => { ev.preventDefault(); binds[a.id][slot] = null; saveBinds(); renderBinds(); renderHelp(); };
        box.appendChild(b);
      }
    }
  }
  $('bindToggle').onclick = () => { const open = $('binds').classList.toggle('hidden'); $('bindReset').classList.toggle('hidden', open); if (!open) renderBinds(); };
  $('bindReset').onclick = () => { binds = JSON.parse(JSON.stringify(DEFAULT_BINDS)); saveBinds(); renderBinds(); renderHelp(); };
  renderHelp();

  function readInput() {
    const I = player.input;
    I.fwd = (isDown('fwd') ? 1 : 0) - (isDown('back') ? 1 : 0); I.side = (isDown('right') ? 1 : 0) - (isDown('left') ? 1 : 0);
    I.jump = isDown('jump'); I.crouch = isDown('crouch');
    const shift = isDown('walk');
    I.sprint = settings.autoSprint ? !shift : shift;
    // combat holds
    vm.setHolds({
      block: isDown('blockL') ? 'L' : isDown('blockR') ? 'R' : null, longGuard: isDown('longGuard'),
      check: isDown('checkLow') ? 'low' : isDown('checkMid') ? 'mid' : isDown('checkHigh') ? 'high' : null,
    });
    if (clinch || (versus && vsKO > 0)) { I.fwd = I.side = 0; I.jump = false; }
  }

  // ---------- loop ----------
  let last = performance.now(), acc = 0, fpsT = 0, frames = 0;
  const hud = { speed: $('speed'), state: $('state'), peak: $('peak'), act: $('action'), bar: $('bar'), fps: $('fps') };

  // the bot is a solid cylinder: shove the player out of it
  function pushOutOfBot() {
    if (bot.ko || clinch) return;
    const dx = player.pos.x - bot.x, dz = player.pos.z - bot.z, d = Math.hypot(dx, dz), min = 0.85;
    if (d < min && d > 0.001 && player.pos.y < bot.y + 1.5) { const o = (min - d) / d; player.pos.x += dx * o; player.pos.z += dz * o; }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    let dt = Math.min(0.1, (now - last) / 1000); last = now;
    frames++; fpsT += dt; if (fpsT > 0.5) { hud.fps.textContent = Math.round(frames / fpsT) + ' fps'; frames = 0; fpsT = 0; }
    if (locked) {
      readInput();
      // ring rules: inside the ropes nobody out-runs the bot; clinched = rooted
      const R = MAP.RING, inRing = Math.abs(player.pos.x - R.cx) < R.hx + 0.6 && Math.abs(player.pos.z - R.cz) < R.hz + 0.6 && player.pos.y < R.y + 0.9;
      // the bot can't move while it swings or guards, so neither can you at full pace
      player.speedCap = clinch ? 0 : inRing ? BOT_SPEED * (vm.busy ? 0.4 : vm.holds.block || vm.holds.longGuard || vm.holds.check ? 0.65 : 1) : null;
      if (inRing !== inRingPrev) { inRingPrev = inRing; if (inRing) toast('RING · SPEED MATCHED TO BOT'); }
      // stamina comes back after a short pause (slower while guarding)
      stamDelay = Math.max(0, stamDelay - dt);
      if (!clinch && stamDelay <= 0) stamina = Math.min(100, stamina + (vm.holds.block || vm.holds.longGuard || vm.holds.check ? 5 : 11) * dt);
      bot.playerStamina = stamina;
      if (training()) stamina = 100;                                   // training: unlimited stamina
      // ring entrance prompt
      const G = MAP.GATE, insideRing = Math.abs(player.pos.x - R.cx) < R.hx && Math.abs(player.pos.z - R.cz) < R.hz && player.pos.y < R.y + 0.9;
      gateMode = !versus && !clinch && Math.hypot(player.pos.x - G.x, player.pos.z - G.z) < 4.2 ? (insideRing ? 'exit' : 'enter') : null;
      $('prompt').textContent = gateMode ? '[' + bindLabel('interact') + ']  ' + (gateMode === 'exit' ? 'EXIT RING' : 'ENTER RING') : '';
      if (clinch) updateClinch(dt);
      if (lean) stepLean(dt);
      acc += dt;
      while (acc >= DT) { player.step(DT); acc -= DT; MAP.update(DT, player); pushOutOfBot(); }
      bot.update(dt, player);
    } else { acc = 0; if (versus) bot.update(dt, player); }      // online: the opponent keeps moving while this player is paused
    if (versus) vsTick(dt);
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
    const la = lean ? lean.amt : 0;                                // lean back tips the view up, a slip rolls it to the side
    camera.rotation.x = player.pitch + k.pitch + (player.mantle ? -0.08 : 0) + (lean && lean.kind === 'back' ? 0.22 * la : 0);
    camera.rotation.z = camRoll + k.roll - (lean && lean.kind === 'slip' ? lean.dir * 0.1 * la : 0);
    if (shake > 0.001) { // hit reaction
      camera.rotation.x += (Math.random() - 0.5) * shake * 0.08; camera.rotation.y += (Math.random() - 0.5) * shake * 0.08; camera.rotation.z += (Math.random() - 0.5) * shake * 0.06;
      shake *= Math.exp(-8 * dt);
    }
    renderer.render(scene, camera);

    // HUD
    peak = Math.max(peak, sp);
    hud.speed.textContent = sp.toFixed(1);
    hud.state.textContent = player.state();
    hud.peak.textContent = 'TOP ' + peak.toFixed(1);
    hud.bar.style.width = Math.min(100, sp / 20 * 100) + '%';
    hud.bar.className = sp > 11 ? 'fast' : '';
    $('aim').textContent = 'KICK ' + { low: 'LEGS', mid: 'BODY', high: 'HEAD' }[kickLevel()] + ' · PUNCH ' + (aimHeight() < 1.15 ? 'BODY' : 'HEAD');
    hud.act.textContent = vm.label;
    hud.act.style.opacity = vm.label ? 1 : 0;
    $('hpYou').style.width = Math.max(0, hp) + '%'; $('hpBot').style.width = Math.max(0, bot.hp) + '%';
    $('stYou').style.width = stamina + '%'; $('stYou').classList.toggle('low', stamina < 20);
    $('stBot').style.width = bot.stam + '%'; $('stBot').classList.toggle('low', bot.stam < 20);
    hurtFlash = Math.max(0, hurtFlash - dt * 2.5); $('hurt').style.opacity = hurtFlash * 0.55;
    teleT -= dt; $('telegraph').style.opacity = teleT > 0 ? Math.min(1, teleT * 3) : 0;
  }
  requestAnimationFrame(frame);

  window.game = { NET, vsScore, isVersus: () => versus, vsStrike, player, vm, MAP, bot, settings, goZone, setMode, setDifficulty, setTrainBot, useGate, gate: () => gateMode, tr, startClinch, endClinch, toggleClinch, handle, binds: () => binds, state: () => ({ hp, stamina, clinch }), setStamina: v => { stamina = v; }, setHp: v => { hp = v; }, step: n => { for (let i = 0; i < n; i++) player.step(DT); }, setLocked: v => { locked = v; }, lean: () => lean, advance: dt => { time += dt; if (lean) stepLean(dt); } };
})();
