// 星际雷霆 — 游戏逻辑
'use strict';
const FX = {};
function capsule(col, w, l) {
  const s = Math.ceil(l + 10), c = mkCanvas(s * 2, s * 2), x = c.getContext('2d'); x.scale(2, 2);
  const h = s / 2;
  const g = x.createRadialGradient(h, h, 0, h, h, h); g.addColorStop(0, col + '99'); g.addColorStop(1, col + '00');
  x.fillStyle = g; x.beginPath(); x.ellipse(h, h, w * 1.4, l * 0.62, 0, 0, TAU); x.fill();
  x.fillStyle = col; x.beginPath(); x.ellipse(h, h, w / 2, l / 2, 0, 0, TAU); x.fill();
  x.fillStyle = '#fff'; x.beginPath(); x.ellipse(h, h - l * 0.08, w / 2 * 0.5, l / 2 * 0.72, 0, 0, TAU); x.fill();
  return { c, s };
}
function pixSprite(w, h, fn, scale = 1) {
  const c = mkCanvas(w, h), x = c.getContext('2d'); const d = x.createImageData(w, h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const col = fn(i, j); if (col) { const k = (j * w + i) * 4; d.data[k] = col[0]; d.data[k + 1] = col[1]; d.data[k + 2] = col[2]; d.data[k + 3] = 255; } }
  x.putImageData(d, 0, 0); return c;
}
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const FONT5 = { P: ['1110', '1001', '1001', '1110', '1000', '1000', '1000'], B: ['1110', '1001', '1001', '1110', '1001', '1001', '1110'] };
function badge(letter, c1, c2, c3) {
  const A = hex(c1), Bc = hex(c2), D = hex(c3), Wt = [255, 255, 255];
  return pixSprite(15, 15, (i, j) => {
    const dx = i - 7, dy = j - 7, r = Math.sqrt(dx * dx * 1 + dy * dy * 1.2);
    if (r > 7.2) return null;
    if (r > 6.1) return D;
    const L = FONT5[letter], lx = i - 5, ly = j - 4;
    if (lx >= 0 && lx < 4 && ly >= 0 && ly < 7 && L[ly][lx] == '1') return Wt;
    if (lx >= 1 && lx < 5 && ly >= 1 && ly < 8 && L[ly - 1] && L[ly - 1][lx - 1] == '1') return D;
    return (dx + dy < -3) ? Bc : A;
  });
}
function coinFrames() {
  const fr = [];
  [6, 4.6, 2, 4.6].forEach((rw, k) => {
    fr.push(pixSprite(13, 13, (i, j) => {
      const dx = (i - 6) / rw, dy = (j - 6) / 6; const r = dx * dx + dy * dy;
      if (r > 1.05) return null;
      if (r > 0.62) return k == 2 ? [200, 140, 20] : [184, 116, 12];
      if (rw > 3 && Math.abs(i - 6) <= 1 && j >= 3 && j <= 9) return [255, 250, 200];
      return (i + j < 10) ? [255, 236, 120] : [255, 196, 40];
    }));
  });
  return fr;
}
function buildFX() {
  const cols = { p: '#ff3d8b', o: '#ff8a1c', b: '#3dc5ff', g: '#8cff3d', v: '#c36bff', r: '#ff2a2a', y: '#ffe14a', w: '#e8f4ff' };
  FX.orb = {};
  for (const k in cols) { FX.orb[k + 's'] = orb(cols[k], 3.2); FX.orb[k + 'm'] = orb(cols[k], 4.6); FX.orb[k + 'l'] = orb(cols[k], 7.5); FX.orb[k + 'n'] = needle(cols[k], 4.2, 13); }
  FX.expl = [genExplosion(11, 18, 40), genExplosion(23, 18, 40), genExplosion(37, 20, 48)];
  FX.explBlue = [genExplosion(5, 16, 40, ['#ffffff', '#d8fbff', '#7fe9ff', '#2fb8ff', '#1b6fd1', '#183a8a', '#1a1f44', '#141428'])];
  FX.explGreen = [genExplosion(9, 16, 40, ['#ffffff', '#f0ffd0', '#c8ff4a', '#7ad926', '#3f8f1a', '#2a4a1a', '#1d261a', '#141a14'])];
  FX.glow = { w: softGlow('#ffffff'), c: softGlow('#4fd8ff'), o: softGlow('#ff9a3c'), r: softGlow('#ff3355'), g: softGlow('#9dff4a'),
    y: softGlow('#ffd23f'), p: softGlow('#ff4bd8'), v: softGlow('#b47cff'), k: softGlow('#2a1830') };
  FX.shot = { falcon: [capsule('#4fd8ff', 4, 15), capsule('#5fe9ff', 5, 17), capsule('#a6f6ff', 6, 20)],
    viper: capsule('#c8ff4a', 3.5, 13), side: capsule('#ffe36b', 3, 12), pulse: capsule('#ff6b8b', 4, 14), opt: capsule('#ffffff', 3, 10) };
  FX.items = { P: badge('P', '#ff4b2b', '#ffb03a', '#4a0e10'), B: badge('B', '#27b35a', '#8dff7a', '#0b3016') };
  FX.coin = coinFrames();
  // missile
  FX.missile = pixSprite(5, 11, (i, j) => {
    if (j < 2) return (i == 2) ? [255, 255, 255] : null;
    if (j < 8) return (i >= 1 && i <= 3) ? (i == 1 ? [220, 255, 160] : [150, 220, 60]) : null;
    return (i == 0 || i == 4) ? [90, 140, 40] : (i == 2 ? [255, 220, 120] : null);
  });
  // vignette
  const v = mkCanvas(180, 320), vx = v.getContext('2d');
  const g = vx.createRadialGradient(90, 160, 60, 90, 160, 200); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,10,0.55)');
  vx.fillStyle = g; vx.fillRect(0, 0, 180, 320); FX.vig = v;
  // player white versions
  FX.shipW = {};
  SHIPS.forEach(s => [0, 1, 2].forEach(i => FX.shipW[s.id + i] = whiteOf(IMG[`ship_${s.id}_${i}`])));
  // boss flash
  FX.bossW = {}; FX.bossR = {};
  for (let i = 1; i <= 5; i++) { FX.bossW[i] = whiteOf(IMG['boss' + i]); FX.bossR[i] = whiteOf(IMG['boss' + i], '#ff2020'); }
}

// ---------- state ----------
let STATE = 'loading';   // loading | menu | play
let PAUSED = false;
let G = null, P = null, LV = null, BOSS = null;
let enemies = [], pbs = [], ebs = [], items = [], parts = [], expls = [], later = [], hazards = [], floaters = [];
const stars = [];
for (let i = 0; i < 140; i++) stars.push({ x: rnd(360), y: rnd(900), l: i < 70 ? 0 : i < 115 ? 1 : 2, tw: rnd(TAU) });
let bgY = 0, shake = 0, flash = 0, flashCol = '#fff', hitStop = 0;

// 难度参数（首关 → 第 25 关）：d 波次强度、bs 敌弹速度、fire 射速增幅、hpm 敌机血量倍率（几何插值）
const CURVE = { d: [0, 5.0], bs: [100, 178], fire: 0.95, hpm: [1, 4.9], bossBump: 0.3 };
function startLevel(n) {
  n = clamp(n, 1, 25); try{GT.lv(n)}catch(_e){}
  const s = (n - 1) / 5 | 0, t = (n - 1) % 5;
  const ship = SHIPS.find(x => x.id === SAVE.sel) || SHIPS[0];
  const evo = SAVE.ships[ship.id].evo;
  // 难度曲线：按关卡进度 p 连续插值（原公式按星域重置，每个星域首关敌人血量骤降，形成锯齿）
  const p = (n - 1) / 24, C = CURVE, boss = t == 4 ? C.bossBump : 0;
  const d = C.d[0] + (C.d[1] - C.d[0]) * p + boss;
  LV = { n, s, t, d, tv: Math.min(t, 3), bg: IMG['bg' + (s + 1)],
    bs: C.bs[0] + (C.bs[1] - C.bs[0]) * p, fm: 1 / (1 + C.fire * p),
    hpm: C.hpm[0] * Math.pow(C.hpm[1] / C.hpm[0], p), cols: [['p', 'v'], ['o', 'y'], ['p', 'w'], ['o', 'r'], ['g', 'y']][s],
    variants: [], tl: genLevel(n), idx: 0 };
  for (let k = 0; k < 4; k++) {
    const im = recolor(IMG[`e${s + 1}_${k}`], TIER_FX[LV.tv]);
    const sc = TIER_SCALE[LV.tv] * 1.12;
    LV.variants.push({ img: im, white: whiteOf(im), w: im.width / 2 * sc, h: im.height / 2 * sc });
  }
  G = { lt: 0, time: 0, score: 0, coins: 0, kills: 0, deaths: 0, bombsUsed: 0,
    lives: 2 + SAVE.up.life, bombMax: 2 + SAVE.up.bomb, bombs: 2 + SAVE.up.bomb,
    power: clamp(1 + SAVE.up.pow + (DEBUG.power ? +DEBUG.power - 1 : 0), 1, 4),
    phase: 'intro', phaseT: 0, banner: null, bombT: 0, dropCount: 0, pDrops: 0, bDropped: false, endT: 0, wait: 0, bossBarT: 0, result: null };
  P = { x: W / 2, y: H + 60, ship, evo, inv: 3, alive: true, ctrl: false, fireT: 0, misT: 0, sideT: 0, optT: 0,
    bank: 0, lastX: W / 2, opts: [{ x: W / 2, y: H }, { x: W / 2, y: H }], beam: null, respawnT: 0, trail: 0 };
  enemies = []; pbs = []; ebs = []; items = []; parts = []; expls = []; later = []; hazards = []; BOSS = null;
  bgY = 0; shake = 0; flash = 0;
  STATE = 'play'; PAUSED = false;
  if (DEBUG.boss) { LV.tl = [{ t: 0.5, w: t == 4 ? 'boss' : 'mini' }]; }
  if (DEBUG.t) { LV.tl = LV.tl.filter(e => e.t >= DEBUG.t).map(e => ({ ...e, t: e.t - DEBUG.t + 1 })); }
  G.banner = { t: 0, dur: 2.6, kind: 'stage' };
  const m = SECTORS[s].music; Sound.play(m[0], m[1]);
  UI.onLevelStart();
}

// ---------- level generation ----------
function genLevel(n) {
  const s = (n - 1) / 5 | 0, t = (n - 1) % 5, R = mulberry(n * 7919 + 13);
  const ev = []; let time = 2.4;
  const dur = t == 4 ? 26 : 40 + s * 4 + t * 6;
  const pool = ['vee', 'snake', 'swoop', 'rain', 'side'];
  if (n >= 2) pool.push('hover', 'pincer');
  if (t >= 1 || s >= 1) pool.push('heavy', 'column', 'hover');
  if (s >= 2) pool.push('pincer', 'heavy', 'swarm');
  if (s >= 3) pool.push('cross', 'swarm');
  let prev = '';
  const first = ['snake', 'vee'][(R() * 2) | 0];
  ev.push({ t: time, w: first, r: R() }); time += WAVES[first].len; prev = first;
  while (time < dur) {
    let w; do { w = pool[(R() * pool.length) | 0]; } while (w === prev);
    ev.push({ t: time, w, r: R() }); prev = w;
    const L = WAVES[w].len;
    if (R() < 0.3 + 0.06 * t + 0.05 * s && L < 6) { const w2 = ['vee', 'snake', 'swoop', 'side'][(R() * 4) | 0]; if (w2 !== w) ev.push({ t: time + L * 0.45, w: w2, r: R() }); }
    time += L * (0.8 - 0.04 * t - 0.025 * s) + 0.3;
  }
  ev.push({ t: time + 1.5, w: t == 4 ? 'boss' : (t >= 2 ? 'mini' : 'end') });
  if (t < 2) ev.push({ t: time + 1.6, w: 'end' });
  else if (t < 4) ev.push({ t: time + 1.7, w: 'end' });
  return ev.sort((a, b) => a.t - b.t);
}
function after(delay, fn) { later.push({ at: G.time + delay, fn }); }

// ---------- movers ----------
const M = {
  straight: (vx, vy) => (e, dt) => { e.x += vx * dt; e.y += vy * dt; },
  sine: (x0, vy, A, w, ph = 0) => (e, dt) => { e.y += vy * dt; e.x = x0 + A * Math.sin(e.age * w + ph); },
  bez: (p, dur, out) => (e, dt) => {
    if (e.age < dur) { const t = e.age / dur, u = 1 - t;
      e.x = u * u * u * p[0] + 3 * u * u * t * p[2] + 3 * u * t * t * p[4] + t * t * t * p[6];
      e.y = u * u * u * p[1] + 3 * u * u * t * p[3] + 3 * u * t * t * p[5] + t * t * t * p[7];
    } else { e.x += out[0] * dt; e.y += out[1] * dt; }
  },
  hover: (ty, hold, exitVy, sway = 14) => (e, dt) => {
    if (e.age < 1.4) e.y += (ty - e.y) * Math.min(1, dt * 2.6);
    else if (e.age < 1.4 + hold) e.x += Math.cos(e.age * 1.1 + e.id) * sway * dt;
    else { e.vyx = (e.vyx || 0) + exitVy * dt * 1.2; e.y += clamp(e.vyx, -Math.abs(exitVy), Math.abs(exitVy)) * dt; }
  },
  dive: (spd, delay) => (e, dt) => {
    if (e.age < delay) { e.y += 60 * dt; return; }
    if (!e.dv) { const a = Math.atan2(P.y - e.y, P.x - e.x); e.dv = [Math.cos(a) * spd, Math.sin(a) * spd]; }
    e.x += e.dv[0] * dt; e.y += e.dv[1] * dt;
  },
};
// ---------- enemy fire patterns ----------
function aim(x, y) { return Math.atan2(P.y - y, P.x - x); }
function eShot(x, y, a, spd, kind, o) {
  const sz = kind[1];
  const b = { x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, k: kind, spr: FX.orb[kind] || FX.orb.ps, r: sz == 's' ? 2.8 : sz == 'm' ? 4 : sz == 'l' ? 6.4 : 2.8, a, age: 0, grazed: false };
  if (o) Object.assign(b, o);
  ebs.push(b); return b;
}
function fan(x, y, n, spread, spd, kind, base) {
  const a0 = base === undefined ? aim(x, y) : base;
  for (let i = 0; i < n; i++) eShot(x, y, a0 + (n == 1 ? 0 : spread * (i / (n - 1) - 0.5)), spd, kind);
}
function ringShot(x, y, n, spd, kind, off = 0, o) { for (let i = 0; i < n; i++) eShot(x, y, off + TAU * i / n, spd, kind, o); }
function canFire(e) { return e.y > 8 && e.y < P.y - 70 && e.x > 4 && e.x < W - 4 && P.alive && G.phase !== 'clear' && G.phase !== 'bossDie'; }
const SHOOT = {
  t0: (e) => fan(e.x, e.y + 6, 1, 0, LV.bs * 0.95, LV.cols[0] + 's'),
  t1: (e) => { const n = 1 + Math.min(2, (LV.d / 1.6) | 0); fan(e.x, e.y + 8, n, 0.3, LV.bs * 1.05, LV.cols[0] + 'm'); },
  t1burst: (e) => { for (let i = 0; i < 3; i++) after(i * 0.12, () => { if (!e.dead && canFire(e)) fan(e.x, e.y + 8, 1, 0, LV.bs * 1.25, LV.cols[0] + 'n'); }); },
  t2: (e) => { const n = 5 + Math.min(4, (LV.d / 1.2) | 0); e.alt = !e.alt;
    if (e.alt || LV.d < 1) fan(e.x, e.y + 10, n, 0.9 + n * 0.04, LV.bs * 0.9, LV.cols[1] + 'm');
    else ringShot(e.x, e.y, 10 + (LV.d * 2 | 0), LV.bs * 0.8, LV.cols[0] + 's', rnd(TAU)); },
  t3: (e) => { e.k3 = (e.k3 || 0) + 1;
    if (e.k3 % 2) ringShot(e.x, e.y, 14 + (LV.d * 3 | 0), LV.bs * 0.85, LV.cols[1] + 'm', e.k3 * 0.2);
    else for (let i = 0; i < 5; i++) after(i * 0.1, () => { if (!e.dead && canFire(e)) fan(e.x, e.y + 14, 3, 0.35, LV.bs * 1.3, LV.cols[0] + 'n'); }); },
  mini: (e) => { e.k3 = (e.k3 || 0) + 1; const m = e.k3 % 3, x = e.x, y = e.y;
    if (m == 0) { ringShot(x, y, 20 + (LV.d * 3 | 0), LV.bs * 0.85, LV.cols[1] + 'm', e.k3 * 0.13); after(0.35, () => !e.dead && ringShot(e.x, e.y, 20 + (LV.d * 3 | 0), LV.bs * 0.7, LV.cols[0] + 's', e.k3 * 0.13 + 0.15)); }
    else if (m == 1) { for (let i = 0; i < 16; i++) after(i * 0.07, () => { if (!e.dead) { const a = Math.PI / 2 + Math.sin(i * 0.5) * 0.9; eShot(e.x - 20, e.y + 10, a, LV.bs * 1.1, LV.cols[0] + 'n'); eShot(e.x + 20, e.y + 10, Math.PI - a + 0, LV.bs * 1.1, LV.cols[0] + 'n'); } }); }
    else { for (let i = 0; i < 4; i++) after(i * 0.25, () => !e.dead && canFire(e) && fan(e.x, e.y + 14, 7, 1.1, LV.bs * 1.0, LV.cols[1] + 'l')); } },
};
let EID = 0;
function spawnEnemy(type, x, y, mover, o = {}) {
  const v = LV.variants[type], sc = o.scale || 1;
  const hpBase = [2.2, 6, 30, 95][type] * LV.hpm * (o.hpMul || 1);
  const e = { id: ++EID, type, x, y, mover, age: 0, hp: hpBase, maxhp: hpBase, img: v.img, white: v.white, w: v.w * sc, h: v.h * sc,
    r: v.w * sc * (type == 0 ? 0.42 : 0.36), flash: 0, fireT: o.fireDelay != null ? o.fireDelay : rnd(0.5, 1.3), fireI: (o.fireI || 2) * LV.fm,
    shoot: o.shoot === undefined ? null : o.shoot, score: [120, 250, 900, 3000][type] * (1 + LV.s * 0.5), group: o.group || null, dead: false,
    mini: !!o.mini, drop: o.drop || null, rot: 0 };
  enemies.push(e); return e;
}
function group(n, drop) { return { n, killed: 0, drop }; }
const WAVES = {
  vee: { len: 3.6, spawn(r) { const cx = 70 + r * (W - 140), n = 5, g = group(n, 'P');
    const sh = LV.d >= 0.6 ? SHOOT.t0 : null;
    for (let i = 0; i < n; i++) { const k = i - 2; after(Math.abs(k) * 0.16, () => spawnEnemy(0, cx + k * 26, -24, M.sine(cx + k * 26, 125 + LV.d * 6, 10, 2.4, k), { group: g, shoot: sh, fireI: 3.2 })); } } },
  snake: { len: 3.8, spawn(r) { const left = r < 0.5, x0 = left ? 90 : W - 90, g = group(7, 'P');
    const sh = LV.d >= 0.9 ? SHOOT.t0 : null;
    for (let i = 0; i < 7; i++) after(i * 0.22, () => spawnEnemy(0, x0, -24, M.sine(x0, 135 + LV.d * 6, 62, 2.2), { group: g, shoot: sh, fireI: 3.6 })); } },
  swoop: { len: 4.0, spawn(r) { const L = r < 0.5, g = group(5, 'C');
    for (let i = 0; i < 5; i++) after(i * 0.3, () => {
      const p = L ? [-20, 60, W * 0.8, 40, W * 0.9, H * 0.4, W * 0.35, H * 0.5] : [W + 20, 60, W * 0.2, 40, W * 0.1, H * 0.4, W * 0.65, H * 0.5];
      spawnEnemy(1, p[0], p[1], M.bez(p, 2.6, [L ? -150 : 150, 140]), { group: g, shoot: SHOOT.t1, fireI: 2.4, fireDelay: 1.0 + rnd(0.4) }); }); } },
  side: { len: 4.2, spawn(r) { const y0 = 90 + r * 90;
    for (let i = 0; i < 4; i++) { const L = i % 2 == 0; after(i * 0.45, () => spawnEnemy(1, L ? -20 : W + 20, y0 + i * 18, M.bez(L ? [-20, y0, W * 0.5, y0 - 40, W * 0.7, y0 + 60, W * 0.5, H + 60] : [W + 20, y0, W * 0.5, y0 - 40, W * 0.3, y0 + 60, W * 0.5, H + 60], 4.2, [0, 140]), { shoot: SHOOT.t1burst, fireI: 2.2, fireDelay: 0.9 })); } } },
  hover: { len: 6.2, spawn(r) { const xs = r < 0.5 ? [0.28, 0.72] : [0.2, 0.5, 0.8].slice(0, LV.d > 1.5 ? 3 : 2);
    xs.forEach((fx, i) => after(i * 0.4, () => spawnEnemy(2, W * fx, -40, M.hover(110 + i * 22 + safeTop, 4.2 + LV.d * 0.3, 90), { shoot: SHOOT.t2, fireI: 1.7, fireDelay: 1.3, drop: i == 0 ? 'P' : 'C' }))); } },
  heavy: { len: 8.5, spawn(r) { spawnEnemy(3, W * (0.35 + r * 0.3), -60, M.hover(140 + safeTop, 6.5, 70, 22), { shoot: SHOOT.t3, fireI: 1.5, fireDelay: 1.6, drop: 'PB' }); } },
  rain: { len: 4.2, spawn(r) { const R = mulberry((r * 1e6) | 0);
    for (let i = 0; i < 10; i++) after(i * 0.32, () => spawnEnemy(0, 24 + R() * (W - 48), -24, M.straight((R() - 0.5) * 30, 170 + LV.d * 8), { shoot: LV.d > 1.8 ? SHOOT.t0 : null, fireI: 4 })); } },
  pincer: { len: 4.0, spawn(r) { const g = group(6, 'C');
    for (let i = 0; i < 6; i++) { const L = i % 2 == 0; after((i >> 1) * 0.35, () => spawnEnemy(1, L ? 30 + (i >> 1) * 30 : W - 30 - (i >> 1) * 30, -24, M.dive(200 + LV.d * 10, 0.9), { group: g, shoot: SHOOT.t1, fireI: 9, fireDelay: 0.6 })); } } },
  column: { len: 5.0, spawn(r) { const g = group(8, 'P');
    for (let i = 0; i < 8; i++) { const x = i % 2 ? W * 0.27 : W * 0.73; after(i * 0.28, () => spawnEnemy(0, x, -24, M.straight(0, 150), { group: g, shoot: LV.d > 1.2 ? SHOOT.t0 : null, fireI: 3 })); }
    after(1.2, () => spawnEnemy(2, W / 2, -40, M.hover(130 + safeTop, 2.4, 110), { shoot: SHOOT.t2, fireI: 1.5, fireDelay: 1.3 })); } },
  swarm: { len: 5.0, spawn(r) { const g = group(12, 'P');
    for (let i = 0; i < 12; i++) after(i * 0.12, () => { const L = i % 2 == 0, x0 = L ? -20 : W + 20, y0 = 60 + (i >> 1) * 14;
      spawnEnemy(0, x0, y0, M.bez([x0, y0, W / 2, y0 + 200, L ? W + 40 : -40, y0 + 120, L ? W + 40 : -40, y0 - 40], 3.2, [0, -100]), { group: g, shoot: SHOOT.t0, fireI: 2.6 }); }); } },
  cross: { len: 5.5, spawn(r) {
    for (let i = 0; i < 2; i++) after(i * 0.6, () => spawnEnemy(2, i ? W + 40 : -40, 150 + safeTop, M.bez(i ? [W + 40, 150, W * 0.6, 130, W * 0.4, 170, -60, 150] : [-40, 150, W * 0.4, 130, W * 0.6, 170, W + 60, 150], 5, [0, 0]), { shoot: SHOOT.t2, fireI: 1.4, fireDelay: 1 })); } },
  mini: { len: 1, spawn() {
    const e = spawnEnemy(3, W / 2, -90, M.hover(150 + safeTop, 9999, 0, 40), { scale: 1.55, hpMul: 9 * (LV.t == 3 ? 1.3 : 1), shoot: SHOOT.mini, fireI: 2.0, fireDelay: 2, mini: true, drop: 'PB' });
    e.r *= 0.9; G.mini = e; G.bossBarT = 0; Sound.sfx.warning(); G.banner = { t: 0, dur: 2.2, kind: 'mini' }; } },
  boss: { len: 1, spawn() { G.phase = 'warning'; G.phaseT = 0; G.banner = { t: 0, dur: 3.2, kind: 'warning' }; Sound.stopMusic(); Sound.sfx.warning(); } },
  end: { len: 1, spawn() {} },
};

// ---------- boss ----------
const BOSSDEF = [
  { sc: 0.9, ty: 150, parts: [{ x: -82, y: -37, r: 22, f: 0.11 }, { x: 82, y: -37, r: 22, f: 0.11 }, { x: -65, y: 62, r: 17, f: 0.08 }, { x: 66, y: 62, r: 17, f: 0.08 }], core: { x: 0, y: -19, r: 26 } },
  { sc: 0.95, ty: 130, parts: [{ x: -100, y: 25, r: 28, f: 0.14 }, { x: 100, y: 25, r: 28, f: 0.14 }], core: { x: 0, y: -15, r: 28 } },
  { sc: 0.92, ty: 150, parts: [{ x: -114, y: 40, r: 24, f: 0.12 }, { x: 115, y: 40, r: 24, f: 0.12 }, { x: 0, y: -90, r: 20, f: 0.08 }], core: { x: 0, y: -27, r: 22 } },
  { sc: 1.0, ty: 140, parts: [{ x: -111, y: 7, r: 26, f: 0.12 }, { x: 111, y: 7, r: 26, f: 0.12 }, { x: 0, y: -80, r: 18, f: 0.07 }], core: { x: 0, y: 68, r: 26 } },
  { sc: 0.95, ty: 140, parts: [{ x: -123, y: 15, r: 26, f: 0.12 }, { x: 124, y: 15, r: 26, f: 0.12 }, { x: 0, y: -85, r: 18, f: 0.08 }], core: { x: 0, y: -12, r: 30 } },
];
function spawnBoss() {
  const s = LV.s, D = BOSSDEF[s], img = IMG['boss' + (s + 1)];
  const total = (800 + 750 * s);
  const b = { s, D, img, w: img.width / 2 * D.sc, h: img.height / 2 * D.sc, x: W / 2, y: -img.height / 2 * D.sc, ty: D.ty + safeTop,
    total, phase: 0, t: 0, pt: 0, cd: {}, flash: 0, red: 0, wrecks: [], entering: true, spin: 0, dieT: 0, sway: 0 };
  b.parts = D.parts.map((p, i) => { const e = mkPart(b, p.x, p.y, p.r, total * p.f, false); e.pi = i; return e; });
  const coreHp = total * (1 - D.parts.reduce((a, p) => a + p.f, 0));
  b.core = mkPart(b, D.core.x, D.core.y, D.core.r, coreHp, true);
  BOSS = b; G.phase = 'boss'; G.bossBarT = 0;
  const m = s == 4 ? ['boss', 2, 1.04] : ['boss', [0, -2, 3, 1, 2][s], 1];
  Sound.play(m[0], m[1], m[2]);
}
function mkPart(b, ox, oy, r, hp, core) {
  const e = { id: ++EID, part: true, core, boss: b, ox: ox * b.D.sc, oy: oy * b.D.sc, x: 0, y: 0, r: r * b.D.sc, hp, maxhp: hp, flash: 0, dead: false, type: 9, age: 0, inv: core, score: core ? 50000 : 8000 };
  enemies.push(e); return e;
}
function every(b, k, iv, first = 0) { if (b.cd[k] === undefined) b.cd[k] = first; b.cd[k] -= G.dt; if (b.cd[k] <= 0) { b.cd[k] += iv; return true; } return false; }
function bossHpFrac() { const b = BOSS; if (!b) return 0; let h = b.core.hp > 0 ? b.core.hp : 0; b.parts.forEach(p => h += Math.max(0, p.hp)); return h / b.total; }
function partAlive(i) { return BOSS.parts[i] && !BOSS.parts[i].dead; }
function updateBoss(dt) {
  const b = BOSS; b.t += dt; b.pt += dt; b.flash = Math.max(0, b.flash - dt); b.red = Math.max(0, b.red - dt);
  if (b.dieT > 0) { // dying sequence
    b.dieT += dt;
    if (Math.random() < dt * 14) { boom(b.x + rnd(-b.w * 0.4, b.w * 0.4), b.y + rnd(-b.h * 0.35, b.h * 0.35), rnd(30, 70), 0); shake = Math.max(shake, 5); }
    b.y += dt * 8; b.x += Math.sin(b.t * 40) * 0.6;
    if (b.dieT > 2.8) bossFinalBlast();
    return;
  }
  if (b.entering) { b.y += (b.ty - b.y) * Math.min(1, dt * 1.1); if (b.y > b.ty - 3) b.entering = false; }
  const anyPart = b.parts.some(p => !p.dead);
  if (b.phase == 0 && !b.entering) { b.phase = 1; b.pt = 0; }
  if (b.phase == 1 && !anyPart) { b.phase = 2; b.pt = 0; b.core.inv = false; phaseShift('核心暴露！'); }
  if (b.phase == 2 && b.core.hp < b.core.maxhp * 0.45) { b.phase = 3; b.pt = 0; phaseShift('狂暴模式！'); }
  // motion
  const amp = b.phase == 3 ? 62 : 38, sp = b.phase == 3 ? 0.62 : 0.4;
  if (!b.entering) { b.sway += dt * sp; b.x = W / 2 + Math.sin(b.sway) * amp; b.y = b.ty + Math.sin(b.sway * 2.1) * 10; }
  for (const p of [...b.parts, b.core]) { p.x = b.x + p.ox; p.y = b.y + p.oy; }
  if (b.entering || !P.alive) return;
  BRAIN[b.s](b, dt);
}
function phaseShift(txt) {
  Sound.sfx.phase(); shake = 12; flash = 0.35; flashCol = '#ffffff';
  ebs.forEach(e => { addSpark(e.x, e.y, '#fff', 2); }); ebs.length = 0;
  G.banner = { t: 0, dur: 1.6, kind: 'phase', text: txt };
}
const C = () => LV.cols;
const BRAIN = [
  // 1 掠夺者母舰
  (b) => { const bs = LV.bs, c = C();
    if (b.phase == 1) {
      [0, 1].forEach(i => { if (partAlive(i) && every(b, 't' + i, 1.25, 0.6 + i * 0.6)) { const p = b.parts[i]; fan(p.x, p.y + 10, 3, 0.36, bs * 1.05, c[0] + 'm'); after(0.15, () => !p.dead && fan(p.x, p.y + 10, 3, 0.36, bs * 1.15, c[0] + 'm')); } });
      [2, 3].forEach(i => { if (partAlive(i) && every(b, 'c' + i, 0.13, 1)) { const p = b.parts[i]; const on = (b.t % 3) < 1.5; if (on) eShot(p.x, p.y + 10, Math.PI / 2 + (i == 2 ? 0.25 : -0.25) + Math.sin(b.t * 3) * 0.25, bs * 1.25, c[1] + 'n'); } });
      if (every(b, 'r', 3.2, 2)) ringShot(b.core.x, b.core.y, 16, bs * 0.8, c[1] + 's', b.t);
    } else {
      const rage = b.phase == 3;
      if ((b.pt % 4.5) < 3 && every(b, 'sp', rage ? 0.075 : 0.1)) { b.spin += rage ? 0.24 : 0.19; const arms = rage ? 3 : 2; for (let k = 0; k < arms; k++) eShot(b.core.x, b.core.y, b.spin + TAU * k / arms, bs * 0.95, c[1] + 's'); }
      if (every(b, 'rg', rage ? 1.6 : 2.4, 1)) ringShot(b.core.x, b.core.y, rage ? 22 : 16, bs * 0.8, c[0] + 'm', rnd(TAU));
      if (every(b, 'af', rage ? 1.5 : 2.2, 0.5)) fan(b.core.x, b.core.y + 20, rage ? 7 : 5, 0.7, bs * 1.2, c[0] + 'n');
    } },
  // 2 熔岩巨像
  (b) => { const bs = LV.bs, c = C();
    if (b.phase == 1) {
      [0, 1].forEach(i => { if (partAlive(i) && every(b, 'd' + i, 1.7, 0.5 + i * 0.85)) { const p = b.parts[i]; fan(p.x, p.y + 20, 5, 0.8, bs * 0.85, c[0] + 'l'); } });
      if (every(b, 'rain', 0.42, 1)) eShot(rnd(20, W - 20), -10, Math.PI / 2 + rnd(-0.15, 0.15), bs * rnd(0.9, 1.2), c[1] + 'm');
      if (every(b, 'eye', 2.8, 1.5)) for (let i = 0; i < 6; i++) after(i * 0.07, () => fan(b.core.x, b.core.y, 1, 0, bs * 1.5, c[1] + 'n'));
    } else {
      const rage = b.phase == 3;
      if (every(b, 'rain', rage ? 0.22 : 0.32, 0.5)) eShot(rnd(20, W - 20), -10, Math.PI / 2 + rnd(-0.15, 0.15), bs * rnd(0.9, 1.25), c[1] + 'm');
      if (every(b, 'eye', rage ? 1.6 : 2.2, 0.5)) for (let i = 0; i < 8; i++) after(i * 0.06, () => b.dieT == 0 && fan(b.core.x, b.core.y, 3, 0.25, bs * 1.55, c[1] + 'n'));
      if (every(b, 'ring', rage ? 1.8 : 2.6, 1.2)) { ringShot(b.core.x, b.core.y + 30, 14, bs * 0.75, c[0] + 'l', rnd(TAU)); if (rage) after(0.3, () => b.dieT == 0 && ringShot(b.core.x, b.core.y + 30, 14, bs * 0.95, c[0] + 'm', rnd(TAU))); }
    } },
  // 3 冰晶女王
  (b) => { const bs = LV.bs, c = C();
    if (b.phase == 1) {
      [0, 1].forEach(i => { if (partAlive(i) && every(b, 'a' + i, 0.11, 1 + i * 0.05)) { const p = b.parts[i]; if ((b.t % 4) < 2.6) { const a = Math.PI / 2 + Math.sin(b.t * 2.2 + i * Math.PI) * 0.75; eShot(p.x, p.y + 20, a, bs * 1.15, c[0] + 'n'); } } });
      if (partAlive(2) && every(b, 'h', 2.2, 1)) { const p = b.parts[2]; [-1, 0, 1].forEach(k => eShot(p.x, p.y, Math.PI / 2 + k * 0.5, bs * 0.7, c[1] + 'l', { split: 0.9, splitN: 8 })); }
      if (every(b, 'r', 3.0, 2)) ringShot(b.core.x, b.core.y, 12, bs * 0.7, c[1] + 's', rnd(TAU));
    } else {
      const rage = b.phase == 3;
      if (every(b, 'fl', rage ? 0.08 : 0.1)) { b.spin += 0.13; const n = 5; const dir = ((b.pt / 3) | 0) % 2 ? -1 : 1; for (let k = 0; k < n; k++) eShot(b.core.x, b.core.y, b.spin * dir + TAU * k / n, bs * 0.85, c[0] + 's'); if (rage) for (let k = 0; k < n; k++) eShot(b.core.x, b.core.y, -b.spin * dir + TAU * k / n + 0.3, bs * 0.7, c[1] + 's'); }
      if (every(b, 'sp', rage ? 1.8 : 2.6, 1)) [-1, 1].forEach(k => eShot(b.core.x, b.core.y, aim(b.core.x, b.core.y) + k * 0.4, bs * 0.8, c[1] + 'l', { split: 0.8, splitN: rage ? 10 : 8 }));
    } },
  // 4 泰坦要塞
  (b) => { const bs = LV.bs, c = C();
    if (b.phase == 1) {
      [0, 1].forEach(i => { if (partAlive(i) && every(b, 's' + i, 0.12, 1)) { const p = b.parts[i]; const ang = b.t * (i ? -1.7 : 1.7); eShot(p.x, p.y, ang, bs * 0.9, c[0] + 's'); eShot(p.x, p.y, ang + Math.PI, bs * 0.9, c[0] + 's'); } });
      if (partAlive(2) && every(b, 'm', 2.6, 1.5)) { const p = b.parts[2]; [-1, 1].forEach(k => eShot(p.x + k * 12, p.y, -Math.PI / 2 + k * 0.6, bs * 0.9, c[1] + 'm', { homing: 1.6, turn: 2.2 })); }
      if (every(b, 'f', 2.4, 2)) fan(b.core.x, b.core.y + 20, 5, 0.6, bs * 1.1, c[1] + 'm');
    } else {
      const rage = b.phase == 3;
      if (every(b, 'beam', rage ? 3.6 : 4.8, 1)) { Sound.sfx.charge(); const xs = rage ? [P.x, clamp(P.x - 90, 20, W - 20), clamp(P.x + 90, 20, W - 20)] : [P.x];
        xs.forEach((x, i) => hazards.push({ x, w: i ? 22 : 34, t: 0, warn: 1.0, dur: 1.1, y0: b.core.y + 30 })); after(1.0, () => Sound.sfx.beam()); }
      if (every(b, 'f', rage ? 1.3 : 1.8, 0.6)) fan(b.core.x, b.core.y + 20, rage ? 9 : 7, 1.2, bs * 1.0, c[0] + 'm');
      if (every(b, 'm', rage ? 2.2 : 3.2, 2)) [-1, 1].forEach(k => eShot(b.x + k * 60, b.y, -Math.PI / 2 + k * 0.7, bs * 0.9, c[1] + 'm', { homing: 1.8, turn: 2.4 }));
      if (rage && every(b, 'rr', 2.4, 1)) ringShot(b.core.x, b.core.y, 20, bs * 0.8, c[1] + 's', rnd(TAU));
    } },
  // 5 虫巢母皇
  (b) => { const bs = LV.bs, c = C();
    if (b.phase == 1) {
      [0, 1].forEach(i => { if (partAlive(i) && every(b, 'w' + i, 1.5, 0.6 + i * 0.75)) { const p = b.parts[i]; for (let k = 0; k < 7; k++) after(k * 0.06, () => !p.dead && eShot(p.x, p.y + 20, Math.PI / 2 + (k - 3) * 0.18 * (i ? -1 : 1), bs * (0.8 + k * 0.06), c[0] + 'm')); } });
      if (partAlive(2) && every(b, 'e', 1.2, 1)) { const p = b.parts[2]; fan(p.x, p.y, 3, 0.3, bs * 1.4, c[1] + 'n'); }
      if (every(b, 'spawn', 4.5, 3)) for (let k = 0; k < 4; k++) after(k * 0.2, () => spawnEnemy(0, b.x + (k % 2 ? -1 : 1) * 40, b.y + 40, M.dive(170, 0.8), { shoot: null }));
      if (every(b, 'sp', 0.16, 2)) { b.spin += 0.31; eShot(b.core.x, b.core.y, b.spin, bs * 0.8, c[1] + 's'); eShot(b.core.x, b.core.y, b.spin + Math.PI, bs * 0.8, c[1] + 's'); }
    } else {
      const rage = b.phase == 3;
      if (every(b, 'sp', rage ? 0.07 : 0.09)) { b.spin += 0.2; const arms = 4; for (let k = 0; k < arms; k++) eShot(b.core.x, b.core.y + 10, b.spin + TAU * k / arms, bs * 0.85, c[0] + 's'); }
      if (every(b, 'rg', rage ? 1.5 : 2.2, 1)) ringShot(b.core.x, b.core.y, rage ? 24 : 18, bs * 0.75, c[1] + 'm', rnd(TAU));
      if (every(b, 'spl', rage ? 2.4 : 3.4, 1.6)) eShot(b.core.x, b.core.y, aim(b.core.x, b.core.y), bs * 0.75, c[1] + 'l', { split: 0.9, splitN: 12 });
      if (every(b, 'spawn', rage ? 4 : 6, 3)) for (let k = 0; k < 4; k++) after(k * 0.2, () => spawnEnemy(0, b.x + (k % 2 ? -1 : 1) * 50, b.y + 40, M.dive(180, 0.8), { shoot: null }));
    } },
];
function bossFinalBlast() {
  const b = BOSS;
  for (let i = 0; i < 14; i++) boom(b.x + rnd(-b.w * 0.45, b.w * 0.45), b.y + rnd(-b.h * 0.4, b.h * 0.4), rnd(50, 110), 2);
  shockwave(b.x, b.y, 260, '#fff');
  Sound.sfx.boomL(); setTimeout(() => Sound.sfx.boomL(), 180);
  flash = 1; flashCol = '#ffffff'; shake = 22;
  for (let i = 0; i < 26 + LV.s * 4; i++) dropItem('C', b.x + rnd(-80, 80), b.y + rnd(-50, 50), 5);
  for (let i = 0; i < 40; i++) addDebris(b.x, b.y, 180);
  G.score += 50000 * (1 + LV.s);
  enemies = enemies.filter(e => !e.part);
  BOSS = null;
  G.phase = 'clear'; G.phaseT = 0;
}

// ---------- player ----------
function updatePlayer(dt) {
  const p = P;
  if (!p.alive) {
    p.respawnT -= dt;
    if (p.respawnT <= 0) {
      if (G.lives < 0) { if (G.phase !== 'over') { G.phase = 'over'; G.phaseT = 0; } return; }
      p.alive = true; p.x = W / 2; p.y = H + 50; p.inv = 3; p.ctrl = false; G.bombs = Math.max(G.bombs, G.bombMax); UI.hud();
    }
    return;
  }
  p.inv = Math.max(0, p.inv - dt);
  if (G.phase === 'clear') { p.ctrl = false; p.beam = null; Sound.laser(false); p.y -= dt * (40 + G.phaseT * 420); p.bank *= 0.9; p.trail -= dt; if (p.trail <= 0) { p.trail = 0.02; parts.push({ x: p.x + rnd(-3, 3), y: p.y + shipH() * 0.42, vx: 0, vy: rnd(150, 250), life: 0.3, max: 0.3, size: 3, col: '#ffffff', add: true }); } return; }
  if (!p.ctrl) {
    const ty = H - 130 - safeBot;
    if (G.phase === 'clear') { p.y -= dt * (120 + G.phaseT * 500); return; }
    p.y += (ty - p.y) * Math.min(1, dt * 4); if (Math.abs(p.y - ty) < 3) { p.ctrl = true; }
  } else if (DEBUG.bot) botControl(dt);
  else if (KEYS.size) {
    const sp = 260 * dt; if (KEYS.has('ArrowLeft') || KEYS.has('a')) p.x -= sp; if (KEYS.has('ArrowRight') || KEYS.has('d')) p.x += sp;
    if (KEYS.has('ArrowUp') || KEYS.has('w')) p.y -= sp; if (KEYS.has('ArrowDown') || KEYS.has('s')) p.y += sp;
  }
  p.x = clamp(p.x, 14, W - 14); p.y = clamp(p.y, 30 + safeTop, H - 24 - safeBot);
  const vx = (p.x - p.lastX) / Math.max(dt, 0.001); p.lastX = p.x;
  p.bank = lerp(p.bank, clamp(vx / 500, -1, 1), Math.min(1, dt * 10));
  // options follow
  p.opts.forEach((o, i) => { const tx = p.x + (i ? 34 : -34), ty = p.y + 14; o.x = lerp(o.x, tx, Math.min(1, dt * 12)); o.y = lerp(o.y, ty, Math.min(1, dt * 12)); });
  // trail particles
  p.trail -= dt; if (p.trail <= 0) { p.trail = 0.03; const c = P.ship.id === 'falcon' ? '#7fe9ff' : P.ship.id === 'lancer' ? '#ffb15a' : '#b6ff6a'; parts.push({ x: p.x + rnd(-3, 3), y: p.y + shipH() * 0.42, vx: rnd(-10, 10), vy: rnd(90, 150), life: 0.25, max: 0.25, size: rnd(1.5, 3), col: c, add: true }); }
  if (G.phase === 'clear' || G.phase === 'over') { Sound.laser(false); p.beam = null; return; }
  fire(dt);
}
function shipImg() { return IMG[`ship_${P.ship.id}_${P.evo}`]; }
function shipH() { const im = shipImg(); return im.height / 2 * PS; }
function fire(dt) {
  const p = P, e = p.evo, pw = G.power, id = p.ship.id;
  p.fireT -= dt; p.misT -= dt; p.sideT -= dt; p.optT -= dt;
  const top = p.y - shipH() * 0.5;
  if (id === 'falcon') {
    if (p.fireT <= 0) { p.fireT += 0.075;
      const n = [3, 5, 5, 7][pw - 1], spr = [0.07, 0.16, 0.24, 0.34][pw - 1], dmg = 1 * (1 + 0.42 * e);
      for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + spr * (n == 1 ? 0 : i / (n - 1) - 0.5); pShot(p.x + (i - (n - 1) / 2) * 3, top, a, 640, dmg, FX.shot.falcon[e]); }
      if (e >= 1 && p.sideT <= 0) { p.sideT = 0.15; [-1, 1].forEach(k => pShot(p.x + k * 16, p.y - 4, -Math.PI / 2 + k * 0.02, 600, 0.9 * (1 + 0.3 * e), FX.shot.side)); }
      Sound.sfx.shot();
    }
  } else if (id === 'lancer') {
    p.beam = { w: [7, 10, 13, 16][pw - 1] + e * 3, dps: [28, 38, 50, 64][pw - 1] * (1 + 0.45 * e), x: p.x, y: top + 6 };
    Sound.laser(true);
    if (e >= 1 && p.sideT <= 0) { p.sideT = 0.16; [-1, 1].forEach(k => pShot(p.x + k * 14, p.y, -Math.PI / 2 + k * 0.12, 560, 1.4 * (1 + 0.3 * e), FX.shot.pulse)); }
  } else {
    if (p.fireT <= 0) { p.fireT += 0.1; const n = pw >= 3 ? 4 : 2, dmg = 0.9 * (1 + 0.38 * e);
      for (let i = 0; i < n; i++) pShot(p.x + (i - (n - 1) / 2) * 7, top, -Math.PI / 2, 600, dmg, FX.shot.viper); Sound.sfx.shot(); }
    if (p.misT <= 0) { p.misT = [0.62, 0.52, 0.44, 0.38][pw - 1]; const n = [2, 2, 4, 4][pw - 1] + (e >= 1 ? 2 : 0);
      for (let i = 0; i < n; i++) { const k = i % 2 ? 1 : -1, j = (i >> 1); missile(p.x + k * (10 + j * 8), p.y + 2, -Math.PI / 2 + k * (0.7 + j * 0.3), 3.4 * (1 + 0.4 * e)); }
      Sound.sfx.missile(); }
  }
  // options (MK-III)
  if (e >= 2 && p.optT <= 0) {
    p.optT = id === 'viper' ? 0.5 : 0.11;
    p.opts.forEach((o, i) => {
      if (id === 'viper') missile(o.x, o.y, -Math.PI / 2 + (i ? 0.5 : -0.5), 3);
      else pShot(o.x, o.y - 6, -Math.PI / 2, 620, id === 'lancer' ? 1.6 : 1.1, id === 'lancer' ? FX.shot.pulse : FX.shot.opt);
    });
  }
}
function pShot(x, y, a, spd, dmg, spr) { pbs.push({ x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, dmg, spr, a: a + Math.PI / 2, r: 5 }); }
function missile(x, y, a, dmg) { pbs.push({ x, y, vx: Math.cos(a) * 220, vy: Math.sin(a) * 220, dmg, mis: true, spd: 220, a, r: 5, age: 0, tgt: null }); }
function bomb() {
  if (STATE !== 'play' || PAUSED || !P.alive || G.bombs <= 0 || G.phase === 'clear' || G.phase === 'over' || G.bombT > 0) return;
  G.bombs--; G.bombsUsed++; G.bombT = 1.8; P.inv = Math.max(P.inv, 2.6);
  Sound.sfx.bomb(); shake = 16; flash = 0.6; flashCol = '#fff6d0';
  ebs.forEach(b => { if (Math.random() < 0.5) addSpark(b.x, b.y, '#ffe9a0', 2); }); ebs.length = 0;
  hazards.length = 0;
  for (let i = 0; i < 3; i++) setTimeout(() => shockwave(P.x, P.y, 420, i ? '#ffd23f' : '#ffffff'), i * 120);
  for (let i = 0; i < 12; i++) after(0.25 + i * 0.07, () => boom(rnd(30, W - 30), rnd(40, H * 0.7), rnd(40, 80), i % 3));
  after(0.35, () => enemies.forEach(e => { if (!e.dead && e.y > -20) damage(e, e.part ? (e.inv ? 0 : 60 + LV.s * 40) : 40 + 30 * LV.s, true); }));
  UI.hud();
}
function killPlayer() {
  if (P.inv > 0 || !P.alive || DEBUG.god) return;
  P.alive = false; P.respawnT = 1.8; P.beam = null; Sound.laser(false);
  G.deaths++; G.lives--;
  boom(P.x, P.y, 90, 2); shockwave(P.x, P.y, 160, '#9ff3ff'); for (let i = 0; i < 30; i++) addDebris(P.x, P.y, 160, '#cfe');
  Sound.sfx.die(); shake = 18; flash = 0.4; flashCol = '#ff5050'; hitStop = 0.08;
  if (G.power > 1) { G.power--; dropItem('P', P.x, P.y - 40); }
  setTimeout(() => { if (STATE === 'play') ebs.length = 0; }, 150);
  UI.hud();
}
// ---------- bot ----------
function botControl(dt) {
  let best = null, bestS = 1e9;
  let tx = W / 2; let near = null, nd = 1e9;
  for (const e of enemies) { if (e.inv || e.y < 0 || e.y > P.y - 40) continue; const d = Math.abs(e.x - P.x) + (e.part ? 0 : 0); if (d < nd) { nd = d; near = e; } }
  if (near) tx = near.x;
  for (let i = 0; i < 24; i++) {
    const a = i / 24 * TAU, rr = i < 8 ? 14 : i < 16 ? 30 : 50;
    const cx = clamp(P.x + Math.cos(a) * rr, 16, W - 16), cy = clamp(P.y + Math.sin(a) * rr, H * 0.55, H - 40 - safeBot);
    let sc = Math.abs(cx - tx) * 0.04 + Math.abs(cy - (H - 150)) * 0.03;
    for (const b of ebs) {
      for (const T of [0.08, 0.18, 0.3]) { const bx = b.x + b.vx * T, by = b.y + b.vy * T; const dx = bx - cx, dy = by - cy, d2 = dx * dx + dy * dy; if (d2 < 900) sc += 4000 / (d2 + 30); }
    }
    for (const e of enemies) { if (e.part) continue; const dx = e.x - cx, dy = e.y - cy, d2 = dx * dx + dy * dy; if (d2 < 2500) sc += 8000 / (d2 + 50); }
    for (const hz of hazards) if (Math.abs(cx - hz.x) < hz.w / 2 + 14) sc += 300;
    if (sc < bestS) { bestS = sc; best = [cx, cy]; }
  }
  const sp = 300 * dt; P.x += clamp(best[0] - P.x, -sp, sp); P.y += clamp(best[1] - P.y, -sp, sp);
  if (G.bombs > 0 && ebs.some(b => (b.x - P.x) ** 2 + (b.y - P.y) ** 2 < 200) && P.inv <= 0 && !DEBUG.god) bomb();
}

// ---------- damage / fx ----------
function damage(e, d, noSfx) {
  if (e.dead) return;
  if (e.inv) { if (!noSfx) Sound.sfx.ping(); return; }
  e.hp -= d; e.flash = 0.06;
  if (e.part) { e.boss.flash = 0.05; }
  if (e.hp <= 0) killEnemy(e);
  else if (!noSfx) Sound.sfx.hit();
}
function killEnemy(e) {
  e.dead = true; G.kills++;
  G.score += Math.round(e.score);
  if (e.part) {
    const b = e.boss;
    if (e.core) { b.dieT = 0.001; Sound.sfx.boomL(); shake = 14; ebs.length = 0; hazards.length = 0; b.core.dead = true; return; }
    boom(e.x, e.y, 80, 2); shockwave(e.x, e.y, 90, '#ffcf6a'); Sound.sfx.boomM(); shake = 10;
    b.wrecks.push({ ox: e.ox, oy: e.oy, r: e.r });
    for (let i = 0; i < 4; i++) dropItem('C', e.x, e.y, 3);
    if (Math.random() < 0.6) dropItem('P', e.x, e.y);
    G.score += 8000;
    return;
  }
  const big = e.type >= 2 || e.mini;
  const sz = e.mini ? 120 : [42, 54, 80, 110][e.type];
  const set = LV.s == 2 ? FX.explBlue : LV.s == 4 ? FX.explGreen : null;
  boom(e.x, e.y, sz, e.type >= 2 ? 2 : (Math.random() * 2) | 0, set);
  if (big) { shockwave(e.x, e.y, sz * 1.1, '#ffd890'); shake = Math.max(shake, e.mini ? 14 : 6 + e.type * 2); Sound.sfx[e.mini ? 'boomL' : 'boomM'](); for (let i = 0; i < 3 + e.type * 3; i++) after(i * 0.07, () => boom(e.x + rnd(-e.w / 3, e.w / 3), e.y + rnd(-e.h / 3, e.h / 3), rnd(30, 55), 1, set)); }
  else Sound.sfx.boomS();
  for (let i = 0; i < 6 + e.type * 5; i++) addDebris(e.x, e.y, 120 + e.type * 30);
  // drops
  const cn = e.mini ? 22 : [Math.random() < 0.35 ? 1 : 0, Math.random() < 0.6 ? 1 : 0, 4, 8][e.type];
  for (let i = 0; i < cn; i++) dropItem('C', e.x, e.y, e.type >= 2 ? 2 : 1);
  if (e.drop) { if (e.drop.includes('P') && (G.power < 4 || Math.random() < 0.5)) dropItem('P', e.x, e.y); if (e.drop.includes('B') && (!G.bDropped || e.mini)) { dropItem('B', e.x + 12, e.y); G.bDropped = true; } }
  if (e.group) { e.group.killed++; if (e.group.killed >= e.group.n) {
    if (e.group.drop === 'P' && G.power < 4) dropItem('P', e.x, e.y); else for (let i = 0; i < 5; i++) dropItem('C', e.x, e.y, 2);
    popText(e.x, e.y - 14, '+' + (1000 * (1 + LV.s)), '#ffe14a'); G.score += 1000 * (1 + LV.s); } }
  if (e.mini) { G.mini = null; ebs.length = 0; flash = 0.5; flashCol = '#fff'; }
}
function boom(x, y, size, v = 0, set) { const fr = (set || FX.expl)[Math.min(v, (set || FX.expl).length - 1)];
  expls.push({ x, y, size, fr, t: 0, dur: 0.55 + size / 400 });
  parts.push({ x, y, glow: FX.glow.o, size: size * 1.6, life: 0.25, max: 0.25, add: true, g: true });
  for (let i = 0; i < 6; i++) addSpark(x, y, pick(['#fff3b0', '#ffb347', '#ff7a2a']), 1 + size / 60); }
function shockwave(x, y, r, col) { parts.push({ x, y, ring: true, r0: 6, r1: r, life: 0.45, max: 0.45, col }); }
function addSpark(x, y, col, sp = 1) { const a = rnd(TAU), v = rnd(60, 220) * sp; parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rnd(0.2, 0.5), max: 0.5, size: rnd(1.5, 2.5), col, add: true, spark: true, drag: 3 }); }
function addDebris(x, y, sp, col) { const a = rnd(TAU), v = rnd(30, sp); parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rnd(0.4, 1.0), max: 1.0, size: rnd(1.5, 3.5), col: col || pick(['#ffdd88', '#ff9944', '#999', '#666', '#ffffff']), drag: 1.5 }); }
function popText(x, y, txt, col) { parts.push({ x, y, txt, col, life: 1.0, max: 1.0, vy: -30, vx: 0 }); }
function dropItem(t, x, y, val = 1) {
  if (t === 'C') { const a = rnd(TAU), v = rnd(40, 140); items.push({ t, x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, age: 0, val: val * (1 + LV.s) }); }
  else items.push({ t, x, y, vx: (Math.random() < 0.5 ? -1 : 1) * 55, vy: -50, age: 0 });
}

// ---------- main update ----------
function update(dt) {
  G.dt = dt; G.time += dt; G.phaseT += dt;
  if (G.banner) { G.banner.t += dt; if (G.banner.t > G.banner.dur) G.banner = null; }
  if (G.phase !== 'warning') G.lt += dt;
  bgY += dt * (G.phase === 'clear' ? 90 : 26);
  // timeline
  if (G.phase === 'intro' && G.time > 0.8) G.phase = 'fight';
  if (G.phase === 'fight') {
    while (LV.idx < LV.tl.length && LV.tl[LV.idx].t <= G.lt) {
      const ev = LV.tl[LV.idx];
      if ((ev.w === 'end' || ev.w === 'mini' || ev.w === 'boss') && (enemies.some(e => !e.dead && (e.mini || e.type >= 2)) || G.mini)) { G.lt -= dt; break; }
      if (ev.w === 'end') { if (enemies.length === 0 && !G.mini && later.length === 0) { G.phase = 'clear'; G.phaseT = 0; } else { G.lt -= dt; break; } }
      else WAVES[ev.w].spawn(ev.r || 0);
      LV.idx++;
    }
  }
  if (G.phase === 'warning' && G.phaseT > 3.2) spawnBoss();
  for (let i = later.length - 1; i >= 0; i--) if (later[i].at <= G.time) { const f = later[i].fn; later.splice(i, 1); if (STATE === 'play' && G.phase !== 'over') f(); }
  updatePlayer(dt);
  if (BOSS) updateBoss(dt);
  if (G.bombT > 0) { G.bombT -= dt; ebs.length = 0; }
  // enemies
  for (const e of enemies) {
    if (e.dead || e.part) { if (e.part) e.flash = Math.max(0, e.flash - dt); continue; }
    e.age += dt; e.flash = Math.max(0, e.flash - dt);
    e.mover(e, dt);
    if (e.shoot && canFire(e)) { e.fireT -= dt; if (e.fireT <= 0) { e.fireT = e.fireI * rnd(0.85, 1.15); e.shoot(e); } }
    if (e.age > 2 && (e.y > H + 90 || e.y < -260 || e.x < -140 || e.x > W + 140)) e.dead = true, e.gone = true;
    if (P.alive && P.inv <= 0) { const dx = e.x - P.x, dy = e.y - P.y, rr = e.r * 0.7 + 4; if (dx * dx + dy * dy < rr * rr) { killPlayer(); damage(e, 20, true); } }
  }
  if (P.alive && P.inv <= 0 && BOSS && BOSS.dieT == 0) for (const pr of enemies) if (pr.part && !pr.dead) { const dx = pr.x - P.x, dy = pr.y - P.y, rr = pr.r * 0.8; if (dx * dx + dy * dy < rr * rr) killPlayer(); }
  enemies = enemies.filter(e => !e.dead || (e.part && !e.boss.dieT && false));
  // player bullets
  for (const b of pbs) {
    if (b.mis) { b.age += dt; b.spd = Math.min(560, b.spd + dt * 900);
      if (!b.tgt || b.tgt.dead) { let best = null, bd = 1e9; for (const e of enemies) { if (e.dead || e.inv || e.y < -10) continue; const d = (e.x - b.x) ** 2 + (e.y - b.y) ** 2; if (d < bd) { bd = d; best = e; } } b.tgt = best; }
      let a = b.a; if (b.tgt) { const ta = Math.atan2(b.tgt.y - b.y, b.tgt.x - b.x); let da = ((ta - a + Math.PI * 3) % TAU) - Math.PI; a += clamp(da, -9 * dt, 9 * dt); } else a += (((-Math.PI / 2) - a + Math.PI * 3) % TAU - Math.PI) * dt * 3;
      b.a = a; b.vx = Math.cos(a) * b.spd; b.vy = Math.sin(a) * b.spd;
      if (Math.random() < 0.7) parts.push({ x: b.x, y: b.y, vx: rnd(-10, 10), vy: rnd(-10, 10), life: 0.22, max: 0.22, size: 2.2, col: '#d7ff9a', add: true });
    }
    b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.y < -30 || b.y > H + 30 || b.x < -30 || b.x > W + 30 || (b.mis && b.age > 3)) { b.dead = true; continue; }
    for (const e of enemies) {
      if (e.dead || e.y < -20) continue;
      const dx = e.x - b.x, dy = e.y - b.y, rr = e.r + b.r;
      if (e.inv) { if (!b.pinged && dx * dx + dy * dy < rr * rr * 1.5) { b.pinged = true; if (Math.random() < 0.25) { addSpark(b.x, b.y, '#9ff3ff', 0.4); Sound.sfx.ping(); } } continue; }
      if (dx * dx + dy * dy < rr * rr) { damage(e, b.dmg); b.dead = true; addSpark(b.x, b.y - 4, b.mis ? '#d7ff9a' : '#bff6ff', 0.6);
        if (b.mis) boom(b.x, b.y, 22, 0, FX.explGreen); break; }
    }
  }
  pbs = pbs.filter(b => !b.dead);
  // lancer beam
  if (P.beam && P.alive) {
    const bm = P.beam; bm.x = P.x; bm.y = P.y - shipH() * 0.5 + 6; let hitE = null, hy = -40;
    for (const e of enemies) { if (e.dead || e.inv || e.y > bm.y || e.y < -10) continue; if (Math.abs(e.x - bm.x) < e.r + bm.w * 0.5 && e.y + e.r * 0.5 > hy) { hy = e.y + e.r * 0.5; hitE = e; } }
    bm.end = hitE ? hy : -40; bm.hit = hitE;
    if (hitE) { damage(hitE, bm.dps * dt, true); if (Math.random() < 0.6) addSpark(bm.x + rnd(-bm.w / 2, bm.w / 2), hy, pick(['#fff', '#ff8fb1', '#ffd0dd']), 0.9); if (hitE.inv) Sound.sfx.ping(); else Sound.sfx.hit(); }
  }
  // enemy bullets
  const pr = 2.6;
  for (const b of ebs) {
    b.age += dt;
    if (b.homing && b.age < b.homing && P.alive) { const ta = aim(b.x, b.y); let a = Math.atan2(b.vy, b.vx); let da = ((ta - a + Math.PI * 3) % TAU) - Math.PI; a += clamp(da, -b.turn * dt, b.turn * dt); const sp = Math.hypot(b.vx, b.vy); b.vx = Math.cos(a) * sp; b.vy = Math.sin(a) * sp; }
    if (b.split && b.age > b.split) { b.dead = true; ringShot(b.x, b.y, b.splitN, LV.bs * 0.8, b.k[0] + 's', rnd(TAU)); addSpark(b.x, b.y, '#fff', 1); continue; }
    b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.y > H + 20 || b.y < -40 || b.x < -20 || b.x > W + 20) { b.dead = true; continue; }
    if (P.alive && P.inv <= 0) { const dx = b.x - P.x, dy = b.y - P.y, rr = b.r + pr; if (dx * dx + dy * dy < rr * rr) { b.dead = true; killPlayer(); }
      else if (!b.grazed && dx * dx + dy * dy < 400) { b.grazed = true; G.score += 20; } }
  }
  ebs = ebs.filter(b => !b.dead);
  // hazards (beams)
  for (const hz of hazards) { hz.t += dt; if (hz.t > hz.warn && hz.t < hz.warn + hz.dur) { if (P.alive && P.inv <= 0 && Math.abs(P.x - hz.x) < hz.w / 2 + 2 && P.y > hz.y0) killPlayer(); if (Math.random() < 0.5) addSpark(hz.x + rnd(-hz.w / 2, hz.w / 2), rnd(hz.y0, H), '#ffd0a0', 1); } }
  hazards = hazards.filter(h => h.t < h.warn + h.dur && !(BOSS == null));
  // items
  for (const it of items) {
    it.age += dt;
    if (it.t === 'C') {
      if (it.age < 0.45 || !P.alive) { it.vx *= 1 - dt * 2.5; it.vy += 160 * dt; it.vy = Math.min(it.vy, 90); }
      else { const a = Math.atan2(P.y - it.y, P.x - it.x), sp = Math.min(700, 200 + it.age * 500); it.vx = lerp(it.vx, Math.cos(a) * sp, Math.min(1, dt * 8)); it.vy = lerp(it.vy, Math.sin(a) * sp, Math.min(1, dt * 8)); }
    } else {
      if (it.age < 0.5) it.vy += 120 * dt; else it.vy = it.vy < 0 ? Math.max(it.vy, -50) : 45;
      if (it.age > 0.6 && it.age < 9) { if (it.x < 14 && it.vx < 0) it.vx *= -1; if (it.x > W - 14 && it.vx > 0) it.vx *= -1; if (it.y < 20 + safeTop && it.vy < 0) it.vy = 45; if (it.y > H * 0.82 && it.vy > 0) it.vy = -45; }
    }
    it.x += it.vx * dt; it.y += it.vy * dt;
    if (it.y > H + 30 || it.x < -40 || it.x > W + 40) it.dead = true;
    if (P.alive && !it.dead) { const dx = it.x - P.x, dy = it.y - P.y, rr = it.t === 'C' ? 20 : 22; if (dx * dx + dy * dy < rr * rr) { it.dead = true; pickup(it); } }
  }
  items = items.filter(i => !i.dead);
  // particles & explosions
  for (const p of parts) { p.life -= dt; if (p.vx !== undefined) { if (p.drag) { p.vx *= 1 - p.drag * dt; p.vy *= 1 - p.drag * dt; } p.x += p.vx * dt; p.y += p.vy * dt; } }
  parts = parts.filter(p => p.life > 0);
  if (parts.length > 700) parts.splice(0, parts.length - 700);
  for (const x of expls) { x.t += dt; x.y += 20 * dt; }
  expls = expls.filter(x => x.t < x.dur);
  // end states
  if (G.phase === 'clear' && G.phaseT > 2.6 && !G.result) finishLevel(true);
  if (G.phase === 'over' && G.phaseT > 1.4 && !G.result) finishLevel(false);
}
function pickup(it) {
  if (it.t === 'C') { G.coins += it.val; Sound.sfx.coin(); parts.push({ x: it.x, y: it.y, glow: FX.glow.y, size: 18, life: 0.15, max: 0.15, add: true, g: true }); return; }
  if (it.t === 'P') { if (G.power < 4) { G.power++; popText(P.x, P.y - 30, G.power == 4 ? 'MAX POWER' : 'POWER UP', '#ffb03a'); } else { G.score += 5000; popText(P.x, P.y - 30, '+5000', '#ffe14a'); } Sound.sfx.power(); }
  if (it.t === 'B') { if (G.bombs < 6) G.bombs++; popText(P.x, P.y - 30, 'BOMB +1', '#8dff7a'); Sound.sfx.bombItem(); }
  shockwave(it.x, it.y, 40, '#fff'); UI.hud();
}
function finishLevel(win) {
  G.result = true; Sound.laser(false);
  const n = LV.n;
  const stars = win ? (G.deaths == 0 ? 3 : G.deaths == 1 ? 2 : 1) : 0;
  const bonus = win ? Math.round((60 + n * 18) * (1 + (stars - 1) * 0.25)) : 0;
  const coins = G.coins + bonus;
  SAVE.coins += coins;
  if (win) { SAVE.stars[n] = Math.max(SAVE.stars[n] || 0, stars); SAVE.maxLevel = Math.max(SAVE.maxLevel, Math.min(25, n + 1)); if (n == 25) SAVE.beat = true; }
  SAVE.best[n] = Math.max(SAVE.best[n] || 0, G.score); SAVE.hi = Math.max(SAVE.hi, G.score);
  writeSave();
  try{win?GT.win(n,{stars:stars,score:G.score,kills:G.kills,deaths:G.deaths}):GT.fail(n,{r:'dead',score:G.score,kills:G.kills})}catch(_e){}
  Sound.play(win ? 'clear' : 'over');
  UI.result({ win, n, stars, score: G.score, coins: G.coins, bonus, kills: G.kills });
}
