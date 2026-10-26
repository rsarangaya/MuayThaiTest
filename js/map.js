'use strict';
// Movement test map. Pure data (solids/pads/spawns) is built by layout() so the
// physics can run without THREE; build(scene) turns it into meshes.
//
// Solids:  box  {x0,x1,z0,z1,y0,y1}
//          ramp {x0,x1,z0,z1,y0,y1,axis:'x'|'z',up:+1|-1}  surface rises from y0 to y1 toward +axis (up=1) or -axis (up=-1)
const MAP = (function () {
  const solids = [], pads = [], spawns = [], labels = [], bags = [];
  const HALF = 90;

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

    spawns.push({ name: 'Spawn plaza', x: 0, z: 0, yaw: 0 });

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

    // --- Heavy bags (combat sandbox) ---
    [-6, -2, 2, 6].forEach(x => bags.push({ x, z: -9, ax: 0, az: 0, vx: 0, vz: 0, flash: 0 }));
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
    for (const l of labels) { const sp = labelSprite(THREE, l.text); sp.position.set(l.x, l.y, l.z); scene.add(sp); }

    for (const p of pads) {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(p.r, p.r, 0.12, 32), new THREE.MeshBasicMaterial({ color: p.color }));
      m.position.set(p.x, 0.06, p.z); scene.add(m);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(p.r * 0.7, 0.07, 8, 32), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      ring.rotation.x = Math.PI / 2; ring.position.set(p.x, 0.16, p.z); scene.add(ring);
    }

    // heavy bags
    for (const b of bags) {
      const pivot = new THREE.Group(); pivot.position.set(b.x, 3.6, b.z);
      const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.8, 6), new THREE.MeshLambertMaterial({ color: 0x888888 }));
      chain.position.y = -0.4;
      b.mat = new THREE.MeshLambertMaterial({ color: 0xb23a2e, emissive: 0x000000 });
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 1.6, 16), b.mat);
      body.position.y = -1.6;
      pivot.add(chain, body); scene.add(pivot); b.pivot = pivot;
    }
  }

  function update(dt) {
    for (const b of bags) {
      b.vx += (-26 * b.ax - 0.9 * b.vx) * dt; b.vz += (-26 * b.az - 0.9 * b.vz) * dt;
      b.ax += b.vx * dt; b.az += b.vz * dt;
      b.flash = Math.max(0, b.flash - dt * 4);
      if (b.pivot) {
        b.pivot.rotation.x = b.ax; b.pivot.rotation.z = b.az;
        b.mat.emissive.setRGB(b.flash * 0.6, b.flash * 0.45, b.flash * 0.1);
      }
    }
  }

  // An attack "lands" at the start of its active window. Bags swing away from the player.
  function hitBags(px, pz, dirx, dirz, reach, impulse) {
    let hit = false;
    for (const b of bags) {
      const dx = b.x - px, dz = b.z - pz, dist = Math.hypot(dx, dz);
      if (dist > reach + 0.4 || dist < 0.01) continue;
      if ((dx * dirx + dz * dirz) / dist < 0.82) continue;
      b.vx += (-dz / dist) * impulse; // rotation.x swings the bag toward -z
      b.vz += (dx / dist) * impulse;
      b.flash = 1; hit = true;
    }
    return hit;
  }

  layout();
  return { solids, pads, spawns, bags, HALF, overlap, topOver, normalOf, build, update, hitBags };
})();
if (typeof module !== 'undefined') module.exports = MAP;
