'use strict';
// Movement test map. Pure data (solids/pads/spawns) is built by layout() so the
// physics can run without THREE; build(scene) turns it into meshes.
//
// Solids:  box  {x0,x1,z0,z1,y0,y1}
//          ramp {x0,x1,z0,z1,y0,y1,axis:'x'|'z',up:+1|-1}  surface rises from y0 to y1 toward +axis (up=1) or -axis (up=-1)
const MAP = (function () {
  const solids = [], pads = [], spawns = [], labels = [], bags = [], decor = [], ropes = [];
  // The movement test course (ledges, slide hill, canyon, tower...) is switched off: the map is just the ring, the bot
  // and the heavy bags. Run the headless sim with MAP_FULL=1 to bring the full course (and its old coordinates) back.
  const FULL = typeof process !== 'undefined' && !!(process.env && process.env.MAP_FULL);
  const HALF = FULL ? 90 : 46;
  const RING = FULL ? { cx: -66, cz: -62, hx: 7.5, hz: 7.5, y: 0.3 } : { cx: 0, cz: -34, hx: 7.5, hz: 7.5, y: 0.3 }; // fighting area (bot stays inside)

  const GATE = { x: RING.cx + RING.hx, z: RING.cz + RING.hz };   // the ring's entrance / exit corner (south-east)

  const C = { floor: 0x394150, wall: 0x2b3140, ledge: 0xe8833a, tall: 0x3fa7a0, ramp: 0x6a7fd1, pillar: 0x8b93a7, slab: 0xc9505a, tower: 0x7a5fb0 };

  function box(cx, cz, w, d, y0, y1, color, label) {
    solids.push({ kind: 'box', x0: cx - w / 2, x1: cx + w / 2, z0: cz - d / 2, z1: cz + d / 2, y0, y1, color });
    if (label) labels.push({ x: cx, y: y1 + 0.6, z: cz, text: label });
  }
  function ramp(x0, x1, z0, z1, y0, y1, axis, up, color) {
    solids.push({ kind: 'ramp', x0, x1, z0, z1, y0, y1, axis, up, color });
  }

  function layout() {
    // boundary walls
    box(0, -HALF - 1, 2 * HALF + 4, 2, 0, 24, C.wall);
    box(0, HALF + 1, 2 * HALF + 4, 2, 0, 24, C.wall);
    box(-HALF - 1, 0, 2, 2 * HALF, 0, 24, C.wall);
    box(HALF + 1, 0, 2, 2 * HALF, 0, 24, C.wall);

    if (FULL) spawns.push({ name: 'Spawn plaza', x: 0, z: 0, yaw: 0 });
    // you start just outside the ring's entrance corner, facing the ring
    else spawns.push({ name: 'Ring entrance', x: GATE.x + 2.6, z: GATE.z + 2.6, yaw: Math.PI / 4 });

    if (FULL) courseLayout();
    ringLayout();
    // --- Heavy bags (combat sandbox) ---
    [-6, -2, 2, 6].forEach(x => bags.push({ x, z: -9, ax: 0, az: 0, vx: 0, vz: 0, flash: 0, dent: 0, dv: 0, dy: 0, dirx: 0, dirz: 1 }));
    // overhead beam on two posts that the long bags hang from
    decor.push({ x0: -8, x1: 8, z0: -9.1, z1: -8.9, y0: 3.2, y1: 3.32, color: 0x5b616d });
    for (const px of [-8, 8]) decor.push({ x0: px - 0.07, x1: px + 0.07, z0: -9.07, z1: -8.93, y0: 0, y1: 3.32, color: 0x5b616d });
    if (!FULL) spawns.push({ name: 'Long bags', x: 0, z: -2, yaw: 0 });
  }

  function courseLayout() {
    // --- Ledge / mantle course (east of spawn). Heights are labelled. ---
    [0.6, 1.0, 1.4, 1.8, 2.2, 2.6, 3.0].forEach((h, i) => box(12 + i * 5, -6, 3, 3, 0, h, C.ledge, h.toFixed(1) + 'm'));
    [3.5, 4.5, 5.5].forEach((h, i) => box(14 + i * 7, -14, 4, 4, 0, h, C.ledge, h.toFixed(1) + 'm'));
    spawns.push({ name: 'Ledge course', x: 7, z: -6, yaw: -Math.PI / 2 });

    // --- Staircase (west of spawn) ---
    for (let i = 0; i < 10; i++) box(-14, -4 - i * 1.2, 4, 1.2, 0, 0.35 * (i + 1), C.pillar);
    box(-14, -4 - 10 * 1.2 - 2, 6, 4, 0, 3.5, C.pillar, '3.5m');

    // --- Slide hill: up ramp, plateau, steeper drop ---
    ramp(-8, 8, -50, -24, 0, 7, 'z', -1, C.ramp);
    box(0, -57, 16, 14, 0, 7, C.ramp, 'plateau 7m');
    ramp(-8, 8, -88, -64, 0, 7, 'z', 1, C.ramp);
    // gentle side hills for slope-slide practice
    ramp(12, 26, -40, -30, 0, 3, 'x', 1, C.ramp); // short side hill for slope-slide practice
    spawns.push({ name: 'Slide hill', x: 0, z: -18, yaw: 0 });

    // --- Wall bounce canyon ---
    box(28, -42, 1, 40, 0, 14, C.tall);
    box(36, -42, 1, 40, 0, 14, C.tall);
    spawns.push({ name: 'Wall canyon', x: 32, z: -20, yaw: 0 });

    // --- Tower with climbing ledges ---
    box(52, -40, 6, 20, 0, 12, C.tower, '12m');
    [2.4, 4.8, 7.2, 9.6].forEach((h, i) => box(47.5, -33.5 - i * 4, 3, 3, 0, h, C.ledge, h.toFixed(1) + 'm'));
    spawns.push({ name: 'Tower climb', x: 46, z: -26, yaw: 0 });

    // --- Low bridge: slide / crouch under ---
    box(-24, -38, 8, 24, 1.25, 2.2, C.slab, 'clearance 1.25m');
    box(-27.6, -49, 0.8, 0.8, 0, 1.25, C.slab);
    box(-20.4, -49, 0.8, 0.8, 0, 1.25, C.slab);
    box(-27.6, -27, 0.8, 0.8, 0, 1.25, C.slab);
    box(-20.4, -27, 0.8, 0.8, 0, 1.25, C.slab);
    spawns.push({ name: 'Low bridge', x: -24, z: -12, yaw: 0 });

    // --- Pillar field (strafe / tap-strafe practice) ---
    for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) box(-50 + i * 5 + (j % 2) * 2.5, 10 + j * 5, 1.2, 1.2, 0, 7, C.pillar);
    spawns.push({ name: 'Pillar field', x: -42, z: 38, yaw: 0 });

    // --- Open runway for bunny hop / speed tests (+z side) ---
    spawns.push({ name: 'Bhop runway', x: 0, z: 85, yaw: 0 });

    // --- Jump pads ---
    pads.push({ x: 0, z: 14, r: 1.8, vy: 17, fx: 0, fz: 0, color: 0x3ff0ff });
    pads.push({ x: 0, z: -16, r: 1.8, vy: 13, fx: 0, fz: -13, color: 0xffd23f });
    pads.push({ x: 30, z: 6, r: 1.8, vy: 21, fx: 0, fz: 0, color: 0x3ff0ff });
  }

  function ringLayout() {
    // --- Sparring ring (bot lives here). Platform is solid; ropes are solid up to the top rope. ---
    box(RING.cx, RING.cz, 2 * RING.hx + 1, 2 * RING.hz + 1, 0, RING.y, 0x3a4256);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) decor.push({ x0: RING.cx + sx * RING.hx - 0.12, x1: RING.cx + sx * RING.hx + 0.12, z0: RING.cz + sz * RING.hz - 0.12, z1: RING.cz + sz * RING.hz + 0.12, y0: RING.y, y1: RING.y + 1.7, color: sx === 1 && sz === 1 ? 0x2fbf6a : 0xdddddd });
    // entrance corner: green post plus floor pads inside and outside, with a sign
    decor.push({ x0: GATE.x - 2.1, x1: GATE.x - 0.3, z0: GATE.z - 2.1, z1: GATE.z - 0.3, y0: RING.y, y1: RING.y + 0.02, color: 0x2fbf6a });
    decor.push({ x0: GATE.x + 0.5, x1: GATE.x + 2.3, z0: GATE.z + 0.5, z1: GATE.z + 2.3, y0: 0, y1: 0.02, color: 0x2fbf6a });
    labels.push({ x: GATE.x, y: RING.y + 2.5, z: GATE.z, text: 'ENTER / EXIT' });
    // Ropes: invisible thin barriers up to the top rope. They block walking but can be jumped over (not stood
    // on or mantled, see player.js). The ring is fully enclosed.
    const WT = 0.12, WH = 1.45;
    const wall = (x0, x1, z0, z1) => solids.push({ kind: 'box', x0, x1, z0, z1, y0: 0, y1: RING.y + WH, hidden: true, rope: true });
    wall(RING.cx - RING.hx - WT, RING.cx + RING.hx + WT, RING.cz - RING.hz - WT, RING.cz - RING.hz + WT);
    wall(RING.cx - RING.hx - WT, RING.cx - RING.hx + WT, RING.cz - RING.hz, RING.cz + RING.hz);
    wall(RING.cx + RING.hx - WT, RING.cx + RING.hx + WT, RING.cz - RING.hz, RING.cz + RING.hz);
    wall(RING.cx - RING.hx - WT, RING.cx + RING.hx + WT, RING.cz + RING.hz - WT, RING.cz + RING.hz + WT);
    for (const h of [0.75, 1.1, 1.45]) {
      const y = RING.y + h, c = h === 1.1 ? 0xeeeeee : 0xc23a3a;
      const x0 = RING.cx - RING.hx, x1 = RING.cx + RING.hx, z0 = RING.cz - RING.hz, z1 = RING.cz + RING.hz;
      // each rope: end points + outward direction (taut; it bows only where something presses on it)
      ropes.push({ ax: x0, az: z0, bx: x1, bz: z0, ox: 0, oz: -1, y, color: c });
      ropes.push({ ax: x0, az: z0, bx: x0, bz: z1, ox: -1, oz: 0, y, color: c });
      ropes.push({ ax: x1, az: z0, bx: x1, bz: z1, ox: 1, oz: 0, y, color: c });
      ropes.push({ ax: x0, az: z1, bx: x1, bz: z1, ox: 0, oz: 1, y, color: c });
    }
    spawns.push({ name: 'Inside the ring', x: GATE.x - 1.3, z: GATE.z - 1.3, y: RING.y, yaw: Math.PI / 4 });
  }

  // ---------- geometry queries (used by physics) ----------
  function overlap(s, x, z, r) { return x + r > s.x0 && x - r < s.x1 && z + r > s.z0 && z - r < s.z1; }
  // highest surface of solid s inside the footprint [x±r, z±r] (assumes overlap)
  function topOver(s, x, z, r) {
    if (s.kind === 'box') return s.y1;
    const lo = s.axis === 'x' ? s.x0 : s.z0, hi = s.axis === 'x' ? s.x1 : s.z1;
    const a0 = s.axis === 'x' ? x - r : z - r, a1 = s.axis === 'x' ? x + r : z + r;
    const p = s.up > 0 ? Math.min(a1, hi) : Math.max(a0, lo);
    let t = (p - lo) / (hi - lo); t = t < 0 ? 0 : t > 1 ? 1 : t;
    if (s.up < 0) t = 1 - t;
    return s.y0 + t * (s.y1 - s.y0);
  }
  // upward normal of the surface of s (unit vector)
  function normalOf(s) {
    if (s.kind === 'box') return { x: 0, y: 1, z: 0 };
    const len = s.axis === 'x' ? s.x1 - s.x0 : s.z1 - s.z0;
    const g = s.up * (s.y1 - s.y0) / len;
    const n = Math.hypot(g, 1);
    return s.axis === 'x' ? { x: -g / n, y: 1 / n, z: 0 } : { x: 0, y: 1 / n, z: -g / n };
  }

  // ---------- rendering ----------
  function tileTexture(THREE, size, draw, repeat) {
    const c = document.createElement('canvas'); c.width = c.height = size;
    draw(c.getContext('2d'), size);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
    if (repeat) t.repeat.set(repeat, repeat);
    return t;
  }
  function setBoxUV(geo, w, h, d) {
    const uv = geo.attributes.uv, s = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let f = 0; f < 6; f++) for (let v = 0; v < 4; v++) {
      const i = f * 4 + v; uv.setXY(i, uv.getX(i) * s[f][0], uv.getY(i) * s[f][1]);
    }
  }
  function labelSprite(THREE, text) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 64;
    const g = c.getContext('2d'); g.font = 'bold 34px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(0, 8, 256, 48); g.fillStyle = '#fff'; g.fillText(text, 128, 33);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthWrite: false, fog: false }));
    sp.scale.set(2.4, 0.6, 1); return sp;
  }

  function build(THREE, scene) {
    scene.background = new THREE.Color(0x9fb8d6);
    scene.fog = new THREE.Fog(0x9fb8d6, 40, 170);
    scene.add(new THREE.HemisphereLight(0xdfeaff, 0x40485a, 0.95));
    const sun = new THREE.DirectionalLight(0xffffff, 0.8); sun.position.set(30, 60, 20); scene.add(sun);

    const floorTex = tileTexture(THREE, 512, (g, s) => {
      g.fillStyle = '#2f3644'; g.fillRect(0, 0, s, s);
      g.strokeStyle = '#3d4658'; g.lineWidth = 2;
      for (let i = 0; i < 10; i++) { const p = i * s / 10; g.beginPath(); g.moveTo(p, 0); g.lineTo(p, s); g.moveTo(0, p); g.lineTo(s, p); g.stroke(); }
      g.strokeStyle = '#7f8db0'; g.lineWidth = 5; g.strokeRect(0, 0, s, s);
    }, (2 * HALF) / 10);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(2 * HALF, 2 * HALF), new THREE.MeshLambertMaterial({ map: floorTex }));
    floor.rotation.x = -Math.PI / 2; scene.add(floor);

    const panelTex = tileTexture(THREE, 128, (g, s) => {
      g.fillStyle = '#fff'; g.fillRect(0, 0, s, s); g.strokeStyle = '#c8c8c8'; g.lineWidth = 4; g.strokeRect(0, 0, s, s);
    });
    const edgeMat = new THREE.LineBasicMaterial({ color: 0x0d0f14 });
    const matCache = {};
    const mat = c => matCache[c] || (matCache[c] = new THREE.MeshLambertMaterial({ color: c, map: panelTex }));

    for (const s of solids) {
      if (s.hidden) continue;
      let mesh;
      if (s.kind === 'box') {
        const w = s.x1 - s.x0, h = s.y1 - s.y0, d = s.z1 - s.z0;
        const geo = new THREE.BoxGeometry(w, h, d); setBoxUV(geo, w, h, d);
        mesh = new THREE.Mesh(geo, mat(s.color));
        mesh.position.set((s.x0 + s.x1) / 2, (s.y0 + s.y1) / 2, (s.z0 + s.z1) / 2);
      } else {
        const L = (s.axis === 'x' ? s.x1 - s.x0 : s.z1 - s.z0), W = (s.axis === 'x' ? s.z1 - s.z0 : s.x1 - s.x0), H = s.y1 - s.y0;
        const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(L, 0);
        if (s.up > 0) sh.lineTo(L, H); else sh.lineTo(0, H);
        sh.closePath();
        const geo = new THREE.ExtrudeGeometry(sh, { depth: W, bevelEnabled: false });
        mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: s.color, side: THREE.DoubleSide }));
        if (s.axis === 'x') mesh.position.set(s.x0, s.y0, s.z0);
        else { mesh.position.set(s.x1, s.y0, s.z0); mesh.rotation.y = -Math.PI / 2; }
      }
      mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, 20), edgeMat));
      scene.add(mesh);
    }
    for (const d of decor) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(d.x1 - d.x0, d.y1 - d.y0, d.z1 - d.z0), new THREE.MeshLambertMaterial({ color: d.color }));
      m.position.set((d.x0 + d.x1) / 2, (d.y0 + d.y1) / 2, (d.z0 + d.z1) / 2); scene.add(m);
    }
    // Ropes are taut at rest and only bend (and wobble back) where something presses on them.
    const ropeMat = {};
    for (const r of ropes) {
      r.len = Math.hypot(r.bx - r.ax, r.bz - r.az); r.amp = 0; r.av = 0; r.s0 = r.len / 2; r.drawn = NaN;
      r.THREE = THREE; r.mat = ropeMat[r.color] || (ropeMat[r.color] = new THREE.MeshLambertMaterial({ color: r.color }));
      r.mesh = new THREE.Mesh(new THREE.BufferGeometry(), r.mat); scene.add(r.mesh); rebuildRope(r);
    }
    for (const l of labels) { const sp = labelSprite(THREE, l.text); sp.position.set(l.x, l.y, l.z); scene.add(sp); }

    for (const p of pads) {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(p.r, p.r, 0.12, 32), new THREE.MeshBasicMaterial({ color: p.color }));
      m.position.set(p.x, 0.06, p.z); scene.add(m);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(p.r * 0.7, 0.07, 8, 32), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      ring.rotation.x = Math.PI / 2; ring.position.set(p.x, 0.16, p.z); scene.add(ring);
    }

    // heavy bags
    for (const b of bags) {
      // Long (banana) bag: ~2.1 m, slightly tapered, rounded ends, taped bands, hanging on a chain to just above the floor
      const pivot = new THREE.Group(); pivot.position.set(b.x, 3.2, b.z);
      const steel = new THREE.MeshLambertMaterial({ color: 0x8a8f99 }), tape = new THREE.MeshLambertMaterial({ color: 0x16181d }), trimM = new THREE.MeshLambertMaterial({ color: 0xe8c23a });
      const CH = 0.9, BL = 2.1, BR = 0.2;
      const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, CH, 6), steel); chain.position.y = -CH / 2;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.014, 6, 14), steel); ring.position.y = -CH; ring.rotation.x = Math.PI / 2;
      b.mat = new THREE.MeshLambertMaterial({ color: 0xa8322a, emissive: 0x000000 });
      const body = new THREE.Mesh(new THREE.CylinderGeometry(BR * 0.9, BR, BL, 22, 28), b.mat); body.position.y = -CH - BL / 2;
      b.body = body; b.orig = body.geometry.attributes.position.array.slice();       // kept so the dent can be rebuilt from the undeformed shape each frame
      const capT = new THREE.Mesh(new THREE.SphereGeometry(BR * 0.9, 18, 10), b.mat); capT.scale.y = 0.45; capT.position.y = -CH;
      const capB = new THREE.Mesh(new THREE.SphereGeometry(BR, 18, 10), b.mat); capB.scale.y = 0.5; capB.position.y = -CH - BL;
      pivot.add(chain, ring, body, capT, capB);
      for (const [f, m] of [[0.08, tape], [0.3, trimM], [0.5, tape], [0.7, trimM], [0.92, tape]]) {   // straps / tape bands
        const r = BR * (0.9 + 0.1 * f) + 0.008, band = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.045, 22), m);
        band.position.y = -CH - BL * f; pivot.add(band);
      }
      scene.add(pivot); b.pivot = pivot;
    }
  }

  // rope shape: straight between the posts, pushed along its outward normal by r.amp around r.s0 (metres along the rope)
  function rebuildRope(r) {
    const T = r.THREE, pts = [], N = 28, ux = (r.bx - r.ax) / r.len, uz = (r.bz - r.az) / r.len;
    for (let i = 0; i <= N; i++) {
      const s = r.len * i / N, g = Math.exp(-Math.pow((s - r.s0) / 1.4, 2)) * Math.sin(Math.PI * i / N) ** 0.5, d = r.amp * g;
      pts.push(new T.Vector3(r.ax + ux * s + r.ox * d, r.y - Math.abs(d) * 0.12, r.az + uz * s + r.oz * d));
    }
    const geo = new T.TubeGeometry(new T.CatmullRomCurve3(pts), 48, 0.03, 8);
    r.mesh.geometry.dispose(); r.mesh.geometry = geo; r.drawn = r.amp;
  }

  // pl: player (pos, vel, height) – a rope the player is pressed against bows away from them, then springs back
  function updateRopes(dt, pl) {
    for (const r of ropes) {
      if (!r.mesh) continue;
      let target = 0;
      if (pl) {
        const px = pl.pos.x, pz = pl.pos.z, ux = (r.bx - r.ax) / r.len, uz = (r.bz - r.az) / r.len;
        const s = (px - r.ax) * ux + (pz - r.az) * uz, d = (px - r.ax) * r.ox + (pz - r.az) * r.oz;   // d > 0: player outside the ring
        if (s > -0.3 && s < r.len + 0.3 && Math.abs(d) < 0.62 && pl.pos.y < r.y + 0.05 && pl.pos.y + 1.5 > r.y) {
          const away = d < 0 ? -1 : 1;                                       // player inside (-1): rope bows outward (+amp); outside: inward
          const into = Math.max(0, (pl.vel.x * r.ox + pl.vel.z * r.oz) * -away);
          r.s0 += (Math.max(0, Math.min(r.len, s)) - r.s0) * Math.min(1, dt * 20);
          target = -away * Math.min(0.32, 0.07 + (0.62 - Math.abs(d)) * 0.5 + into * 0.03);
        }
      }
      r.av += (-80 * (r.amp - target) - 6 * r.av) * dt; r.amp += r.av * dt;   // underdamped spring -> wobble on release
      if (!target && Math.abs(r.amp) < 0.002 && Math.abs(r.av) < 0.02) { r.amp = 0; r.av = 0; }
      if (Math.abs(r.amp - r.drawn) > 0.002 || (r.amp === 0 && r.drawn !== 0)) rebuildRope(r);
    }
  }

  // push the vertices facing the strike inward (away from the player) around the impact height
  function dentBag(b) {
    b.dirty = false;
    const pos = b.body.geometry.attributes.position, o = b.orig, cy = b.dy - b.body.position.y;   // impact height in the body's own space
    for (let i = 0; i < pos.count; i++) {
      const x = o[i * 3], y = o[i * 3 + 1], z = o[i * 3 + 2], r = Math.hypot(x, z) || 1;
      const facing = Math.max(0, -(x / r * b.dirx + z / r * b.dirz)), g = Math.exp(-Math.pow((y - cy) / 0.3, 2));
      const d = b.dent * g * facing * (r > 0.05 ? 1 : 0);
      pos.setXYZ(i, x + b.dirx * d, y, z + b.dirz * d);
    }
    pos.needsUpdate = true; b.body.geometry.computeVertexNormals();
  }

  function update(dt, pl) {
    updateRopes(dt, pl);
    for (const b of bags) {
      // long bag = slow pendulum (~2 s period) with moderate damping, settles in about 4 s
      b.vx += (-10 * b.ax - 1.5 * b.vx) * dt; b.vz += (-10 * b.az - 1.5 * b.vz) * dt;
      b.ax += b.vx * dt; b.az += b.vz * dt;
      b.flash = Math.max(0, b.flash - dt * 4);
      // impact dent: a local spring that caves the surface the strike hit, then rebounds
      if (b.dent !== 0 || b.dv !== 0) {
        b.dv += (-220 * b.dent - 12 * b.dv) * dt; b.dent = Math.max(-0.03, Math.min(0.12, b.dent + b.dv * dt));
        if (Math.abs(b.dent) < 0.0008 && Math.abs(b.dv) < 0.01) { b.dent = 0; b.dv = 0; b.dirty = true; }
        else b.dirty = true;
      }
      if (b.pivot) {
        b.pivot.rotation.x = b.ax; b.pivot.rotation.z = b.az;
        b.mat.emissive.setRGB(b.flash * 0.6, b.flash * 0.45, b.flash * 0.1);
        if (b.dirty && b.body) dentBag(b);
      }
    }
  }

  // An attack "lands" at the start of its active window. Bags swing away from the player.
  // hitY = world height of the strike (so the dent lands where it hit)
  function hitBags(px, pz, dirx, dirz, reach, impulse, hitY) {
    let hit = false;
    for (const b of bags) {
      const dx = b.x - px, dz = b.z - pz, dist = Math.hypot(dx, dz);
      if (dist > reach + 0.4 || dist < 0.01) continue;
      if ((dx * dirx + dz * dirz) / dist < 0.82) continue;
      const k = impulse * 0.45;      // swing scale: a hard kick throws the bag ~25 degrees
      b.vx += (-dz / dist) * k; // rotation.x swings the bag toward -z
      b.vz += (dx / dist) * k;
      b.dirx = dx / dist; b.dirz = dz / dist; b.dy = (hitY == null ? 1.3 : hitY) - 3.2;   // pivot is at y 3.2
      b.dv += impulse * 0.3; b.dirty = true;
      b.flash = 1; hit = true;
    }
    return hit;
  }

  layout();
  return { solids, pads, spawns, bags, decor, ropes, RING, GATE, HALF, overlap, topOver, normalOf, build, update, hitBags };
})();
if (typeof module !== 'undefined') module.exports = MAP;
