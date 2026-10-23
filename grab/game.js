/* ===== 夜市撸串王 · 抓串串  主程序 ===== */
(() => {
'use strict';
const { Engine, Bodies, Body, Composite, Query, Sleeping, Vertices } = Matter;
const Q = new URLSearchParams(location.search);
const DEBUG = { level: +Q.get('level') || 0, bot: Q.has('bot'), speed: +Q.get('speed') || 1, unlock: Q.has('unlock') };
const cv = document.getElementById('cv'), ctx = cv.getContext('2d');
const $ = id => document.getElementById(id);
const FONT = '"PingFang SC","Hiragino Sans GB","Microsoft YaHei","Noto Sans CJK SC","Noto Sans SC",sans-serif';
const TAU = Math.PI * 2, rnd = (a, b) => a + Math.random() * (b - a), clamp = (v, a, b) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a) * t;
const easeOut = t => 1 - Math.pow(1 - t, 3), easeBack = t => { const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

/* ---------- 物品 ---------- */
const TYPES = [
  { key: 'lambskewer', name: '羊肉串', f: 1.0 }, { key: 'corn', name: '烤玉米', f: 0.92 }, { key: 'wing', name: '烤鸡翅', f: 0.82 },
  { key: 'sausage', name: '烤红肠', f: 0.95 }, { key: 'mushroom', name: '烤香菇', f: 0.66 }, { key: 'shrimp', name: '烤大虾', f: 0.78 },
  { key: 'chive', name: '烤韭菜', f: 0.9 }, { key: 'bun', name: '烤馒头片', f: 0.92 }, { key: 'eggplant', name: '烤茄子', f: 0.88 },
  { key: 'squid', name: '烤鱿鱼', f: 0.95 }, { key: 'oyster', name: '蒜蓉生蚝', f: 0.78 }, { key: 'pepper', name: '烤青椒', f: 0.95 },
  { key: 'heart', name: '烤鸡心', f: 1.0 }, { key: 'lamb', name: '小羊', f: 0.68, lamb: true }
];
const LAMB = TYPES.length - 1;
const IMG = {};
const R_WALL = 160; // 世界坐标：烤架内半径
const MAXL = 9, WALLCAT = 1 << 15;

/* ---------- 存档 ---------- */
const SKEY = 'yeshi_luchuan_v1';
let save = { unlocked: 1, stars: {}, best: {}, props: { out: 3, mag: 3, shuf: 3 }, music: true, sfx: true, lambs: 0, lambDone: {}, star3Done: {}, money: 0 };
try { const s = JSON.parse(localStorage.getItem(SKEY)); if (s && s.props) save = Object.assign(save, s); } catch (e) { }
const persist = () => { try { localStorage.setItem(SKEY, JSON.stringify(save)); } catch (e) { } };
if (DEBUG.unlock) save.unlocked = 30;

/* ---------- 关卡 ---------- */
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function levelCfg(n) {
  const nTypes = Math.min(13, 2 + n);
  const triples = n === 1 ? 3 : Math.min(36, Math.round(3 + n * 1.12));
  const lambT = n < 2 ? 0 : n >= 15 ? 2 : 1;
  const items = triples * 3 + lambT * 3;
  const perItem = Math.max(2.15, 2.9 - n * 0.025);
  const time = Math.round((25 + items * perItem) / 5) * 5;
  const S = items <= 24 ? 96 : items <= 45 ? 90 : items <= 70 ? 84 : items <= 95 ? 78 : 74;
  return { n, nTypes, triples, lambT, items, time, S, newType: n >= 2 && nTypes <= 13 && Math.min(13, 1 + n) < nTypes ? TYPES[nTypes - 1] : null };
}

/* ---------- 画布与布局 ---------- */
let W = 0, H = 0, DPR = 1, L = {};
function layout() {
  DPR = Math.min(2, window.devicePixelRatio || 1);
  W = window.innerWidth; H = window.innerHeight;
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  const sp = getComputedStyle($('safe'));
  const st = parseFloat(sp.paddingTop) || 0, sb = parseFloat(sp.paddingBottom) || 0;
  const GW = Math.min(W, 480), gx = (W - GW) / 2;
  L = { GW, gx, st, sb };
  L.top = st + 8; L.topH = 48;
  L.info = L.top + L.topH + 6; L.infoH = 30;
  const propsH = Math.min(92, H * 0.11);
  L.propsY = H - sb - propsH - 8; L.propsH = propsH;
  const slotGap = 5, pad = 12;
  L.slot = Math.min(56, (GW - pad * 2 - 16 - slotGap * 6) / 7);
  L.trayH = L.slot + 18; L.trayW = L.slot * 7 + slotGap * 6 + 18;
  L.trayX = gx + (GW - L.trayW) / 2; L.trayY = L.propsY - L.trayH - 12;
  L.slotGap = slotGap;
  const areaTop = L.info + L.infoH + 4, areaBot = L.trayY - 8;
  const Rp = Math.min(GW * 0.55, (areaBot - areaTop) / 2 * 1.06);
  L.Rp = Rp; L.gcx = gx + GW / 2; L.gcy = (areaTop + areaBot) / 2;
  L.ws = Rp * 0.80 / R_WALL; // 世界→屏幕
  const bw = Math.min(96, GW / 3 - 18);
  L.props = ['out', 'mag', 'shuf'].map((k, i) => ({ k, x: gx + GW / 2 + (i - 1) * (bw + 22) - bw / 2, y: L.propsY + 4, w: bw, h: propsH - 10 }));
  L.pauseBtn = { x: gx + 12, y: L.top, w: 46, h: 46 };
  spriteCache = {}; bgCache = null;
}
const slotX = i => L.trayX + 9 + L.slot / 2 + i * (L.slot + L.slotGap);
const slotY = () => L.trayY + L.trayH / 2;
const w2s = (x, y) => [L.gcx + x * L.ws, L.gcy + y * L.ws];
const s2w = (x, y) => [(x - L.gcx) / L.ws, (y - L.gcy) / L.ws];

/* ---------- 精灵预渲染 ---------- */
let spriteCache = {}, masks = {};
function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }
function buildMask(t) {
  const im = IMG[TYPES[t].key];
  try { const c = mkCanvas(im.width, im.height), x = c.getContext('2d'); x.drawImage(im, 0, 0); const d = x.getImageData(0, 0, c.width, c.height).data; const m = new Uint8Array(c.width * c.height); for (let i = 0; i < m.length; i++) m[i] = d[i * 4 + 3]; masks[t] = { w: c.width, h: c.height, m }; } catch (e) { masks[t] = null; }
}
// 返回 {shade:[canvas*6], hl, shadow, pad, k(屏幕px/源px)}
function sprites(t, S) {
  const key = t + '_' + S;
  if (spriteCache[key]) return spriteCache[key];
  const im = IMG[TYPES[t].key]; const meta = ITEM_META[TYPES[t].key];
  const k = S * TYPES[t].f * L.ws / 300; // 屏幕 css px / 源 px
  const res = k * DPR * 1.15; // 渲染分辨率（源px→画布px）
  const w = meta.w * res, h = meta.h * res, pad = Math.ceil(10 * DPR);
  const out = { shade: [], k, res, pad, w: meta.w, h: meta.h };
  for (let s = 0; s < 6; s++) {
    const c = mkCanvas(w + pad * 2, h + pad * 2), x = c.getContext('2d');
    x.drawImage(im, pad, pad, w, h);
    if (s > 0) { x.globalCompositeOperation = 'source-atop'; x.fillStyle = `rgba(28,12,4,${[0, .16, .3, .42, .52, .6][s]})`; x.fillRect(0, 0, c.width, c.height); }
    out.shade.push(c);
  }
  { // 高亮：金色描边光晕
    const c = mkCanvas(w + pad * 2, h + pad * 2), x = c.getContext('2d');
    x.shadowColor = 'rgba(255,226,90,1)'; x.shadowBlur = 7 * DPR;
    for (let i = 0; i < 3; i++) x.drawImage(im, pad, pad, w, h);
    x.shadowBlur = 0; x.drawImage(im, pad, pad, w, h);
    x.globalCompositeOperation = 'source-atop'; x.fillStyle = 'rgba(255,240,200,.16)'; x.fillRect(0, 0, c.width, c.height);
    out.hl = c;
  }
  { // 投影
    const c = mkCanvas(w + pad * 2, h + pad * 2), x = c.getContext('2d');
    x.filter && (x.filter = 'none');
    const t2 = mkCanvas(w, h), y = t2.getContext('2d'); y.drawImage(im, 0, 0, w, h); y.globalCompositeOperation = 'source-in'; y.fillStyle = '#000'; y.fillRect(0, 0, w, h);
    x.shadowColor = 'rgba(0,0,0,0.75)'; x.shadowBlur = 6 * DPR; x.shadowOffsetX = 0; x.shadowOffsetY = 0;
    x.globalAlpha = 0.55; x.drawImage(t2, pad, pad);
    out.shadow = c;
  }
  spriteCache[key] = out; return out;
}

/* ---------- 物理 ---------- */
let engine = null, walls = [];
function newEngine() {
  engine = Engine.create({ enableSleeping: true });
  engine.gravity.x = 0; engine.gravity.y = 0; engine.gravity.scale = 0;
  engine.positionIterations = 8; engine.velocityIterations = 6;
  walls = [];
  const N = 40, Rw = R_WALL;
  for (let i = 0; i < N; i++) {
    const a = i / N * TAU, len = TAU * (Rw + 20) / N + 6;
    walls.push(Bodies.rectangle(Math.cos(a) * (Rw + 20), Math.sin(a) * (Rw + 20), 40, len, { isStatic: true, angle: a, collisionFilter: { category: WALLCAT, mask: 0xffff }, friction: 0.1 }));
  }
  Composite.add(engine.world, walls);
}
let uid = 0;
function makeItem(t, x, y, ang, layer, S) {
  const meta = ITEM_META[TYPES[t].key];
  const kw = S * TYPES[t].f / 300; // 世界单位/源px
  const verts = meta.hull.map(p => ({ x: p[0] * kw, y: p[1] * kw }));
  const c = Vertices.centre(verts);
  const body = Bodies.fromVertices(x, y, [verts], { frictionAir: 0.14, friction: 0.25, restitution: 0.04, density: 0.002, slop: 0.03, collisionFilter: { category: 1 << layer, mask: (1 << layer) | WALLCAT } });
  Body.setAngle(body, ang);
  const area = Math.abs(Vertices.area(verts));
  const far = meta.hull.reduce((b, p) => (p[0] * p[0] + p[1] * p[1] > b[0] * b[0] + b[1] * b[1] ? p : b), [0, 0]);
  const it = { id: ++uid, t, body, layer, vz: layer, off: { x: -c.x, y: -c.y }, kw, S, er: Math.sqrt(area / Math.PI), axis: { x: far[0] * kw - c.x, y: far[1] * kw - c.y }, born: uid, intro: 0 };
  body.plugin.item = it;
  return it;
}
function setLayer(it, l) {
  it.layer = l; it.body.collisionFilter.category = 1 << l; it.body.collisionFilter.mask = (1 << l) | WALLCAT; Sleeping.set(it.body, false);
}
function itemCenter(it) { // 精灵中心（世界）
  const b = it.body, ca = Math.cos(b.angle), sa = Math.sin(b.angle);
  return [b.position.x + it.off.x * ca - it.off.y * sa, b.position.y + it.off.x * sa + it.off.y * ca];
}
function layerR(l) { return Math.max(40, R_WALL * (1 - 0.15 * l) - 4); }
function physicsStep(dt) {
  for (const it of G.items) {
    const b = it.body; if (b.isSleeping) continue;
    const x = b.position.x, y = b.position.y, d = Math.hypot(x, y) || 1, Rk = layerR(it.layer);
    let a = 0.006 + (d > Rk ? (d - Rk) * 0.0035 : 0);
    Body.setVelocity(b, { x: b.velocity.x - x / d * a, y: b.velocity.y - y / d * a });
  }
  Engine.update(engine, dt);
}
function supportCheck() {
  const byL = [];
  for (const it of G.items) (byL[it.layer] = byL[it.layer] || []).push(it.body);
  let dropped = 0;
  const list = G.items.slice().sort((a, b) => a.layer - b.layer);
  for (const it of list) {
    if (it.layer === 0) continue;
    const below = byL[it.layer - 1] || [];
    const b = it.body, ca = Math.cos(b.angle), sa = Math.sin(b.angle);
    const p0 = b.position;
    const ax = (it.axis.x * ca - it.axis.y * sa) * 0.55, ay = (it.axis.x * sa + it.axis.y * ca) * 0.55;
    const hit = p => below.length && Query.point(below, p).length > 0;
    const c = hit(p0), e1 = hit({ x: p0.x + ax, y: p0.y + ay }), e2 = hit({ x: p0.x - ax, y: p0.y - ay });
    if (!(c || (e1 && e2) || ((e1 || e2) && Math.random() < 0.35))) {
      const arr = byL[it.layer]; arr.splice(arr.indexOf(b), 1);
      setLayer(it, it.layer - 1); (byL[it.layer] = byL[it.layer] || []).push(b);
      Body.setAngularVelocity(b, rnd(-0.03, 0.03)); dropped++;
    }
  }
  return dropped;
}
function wakeNear(x, y, r) { for (const it of G.items) { const b = it.body; if (Math.hypot(b.position.x - x, b.position.y - y) < r) Sleeping.set(b, false); } }

/* ---------- 堆叠生成 ---------- */
function placeItems(types, S, rng) {
  const placed = []; // per layer list of {x,y,er}
  const res = [];
  for (const t of types) {
    const kw = S * TYPES[t].f / 300; const meta = ITEM_META[TYPES[t].key];
    const er = Math.sqrt(Math.abs(Vertices.area(meta.hull.map(p => ({ x: p[0] * kw, y: p[1] * kw })))) / Math.PI);
    let done = false;
    for (let l = 0; l < MAXL && !done; l++) {
      const Rl = layerR(l) - er * 0.6; placed[l] = placed[l] || [];
      const tries = t === LAMB ? 60 : 36;
      for (let k = 0; k < tries; k++) {
        const r = Math.sqrt(rng()) * Math.max(10, Rl), a = rng() * TAU;
        const x = Math.cos(a) * r, y = Math.sin(a) * r;
        let ok = true;
        for (const p of placed[l]) { if (Math.hypot(p.x - x, p.y - y) < (p.er + er) * 0.84) { ok = false; break; } }
        if (ok) { placed[l].push({ x, y, er }); res.push({ t, x, y, a: rng() * TAU, l }); done = true; break; }
      }
    }
    if (!done) { const l = MAXL - 1; res.push({ t, x: (rng() - .5) * 40, y: (rng() - .5) * 40, a: rng() * TAU, l }); }
  }
  return res;
}
function settle(steps) {
  for (let i = 0; i < steps; i++) { physicsStep(1000 / 60); if (i % 12 === 0) supportCheck(); }
  for (const it of G.items) it.vz = it.layer;
}

/* ---------- 游戏状态 ---------- */
const G = window.G = {
  state: 'loading', level: 1, cfg: null, items: [], tray: [], flyers: [], parts: [], texts: [], banner: null,
  time: 0, timeMax: 0, score: 0, combo: 0, lastMatch: -9, lambs: 0, lambsTotal: 0, introT: 0, shuffleT: -1, pendingFail: false,
  press: null, groupId: 0, clock: 0, ended: false, revivedTime: false, endT: 0, shake: 0
};
function topLayer() { let m = 0; for (const it of G.items) if (it.layer > m) m = it.layer; return m; }

function startLevel(n) {
  n = clamp(n | 0, 1, 30);
  const cfg = levelCfg(n); G.cfg = cfg; G.level = n;
  newEngine(); spriteCache = {};
  G.items = []; G.tray = []; G.flyers = []; G.parts = []; G.texts = []; G.banner = null;
  G.score = 0; G.combo = 0; G.lastMatch = -9; G.lambs = 0; G.lambsTotal = cfg.lambT * 3; G.pendingFail = false; G.ended = false; G.revivedTime = false; G.press = null; G.shuffleT = -1;
  G.time = G.timeMax = cfg.time;
  const rng = mulberry(n * 7919 + 13);
  // 类型分配：每种至少一组
  const tri = []; for (let i = 0; i < cfg.triples; i++) tri.push(i < cfg.nTypes ? i : Math.floor(rng() * cfg.nTypes));
  let list = []; for (const t of tri) list.push(t, t, t);
  for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1));[list[i], list[j]] = [list[j], list[i]]; }
  const lambs = []; for (let i = 0; i < cfg.lambT * 3; i++) lambs.push(LAMB);
  list = lambs.concat(list);
  const pl = placeItems(list, cfg.S, rng);
  for (const p of pl) { const it = makeItem(p.t, p.x, p.y, p.a, p.l, cfg.S); G.items.push(it); Composite.add(engine.world, it.body); }
  settle(200);
  // 入场动画：自下而上逐个落下
  const order = G.items.slice().sort((a, b) => a.layer - b.layer || a.born - b.born);
  order.forEach((it, i) => it.intro = 0.15 + i * Math.min(0.025, 1.4 / order.length));
  G.introT = 0; G.introDur = 0.15 + order.length * Math.min(0.025, 1.4 / order.length) + 0.45;
  G.state = 'play';
  showScreen(null);
  SND.play('drop');
  setTimeout(() => { if (G.state === 'play' && G.level === n) SND.play('sizzle', 1.2, 0.25); }, 500);
  if (n === 2) G.banner = { text: '小羊混进串堆啦，凑齐3只有奖励！', t: 0, dur: 2.6, img: 'lamb', delay: 0.6 };
  else if (cfg.newType) G.banner = { text: '新菜上桌：' + cfg.newType.name, t: 0, dur: 2.2, img: cfg.newType.key, delay: 0.6 };
  else if (n === 1) G.banner = { text: '点最上面的串，凑3个就卖出！', t: 0, dur: 2.6, delay: 0.6 };
}

/* ---------- 命中检测 ---------- */
function drawOrder() { return G.items.slice().sort((a, b) => a.vz - b.vz || a.born - b.born); }
function itemScale(it) { return 1 + it.vz * 0.022; }
function hitTest(sx, sy) {
  const arr = drawOrder();
  for (let i = arr.length - 1; i >= 0; i--) {
    const it = arr[i]; if (G.introT < it.intro + 0.25) continue;
    const [cx, cy] = itemCenter(it); const [px, py] = w2s(cx, cy);
    const a = it.body.angle, sc = itemScale(it) * L.ws * it.kw; // 屏幕px / 源px
    const dx = sx - px, dy = sy - py, ca = Math.cos(-a), sa = Math.sin(-a);
    const lx = (dx * ca - dy * sa) / sc, ly = (dx * sa + dy * ca) / sc;
    const meta = ITEM_META[TYPES[it.t].key];
    const ux = lx + meta.w / 2, uy = ly + meta.h / 2;
    if (ux < 0 || uy < 0 || ux >= meta.w || uy >= meta.h) continue;
    const m = masks[it.t];
    if (m) { const mx = Math.floor(ux * m.w / meta.w), my = Math.floor(uy * m.h / meta.h); if (m.m[my * m.w + mx] > 90) return it; }
    else { const [wx, wy] = s2w(sx, sy); if (Vertices.contains(it.body.vertices, { x: wx, y: wy })) return it; }
  }
  return null;
}

/* ---------- 托盘 ---------- */
const activeCount = () => G.tray.filter(e => !e.group).length;
function canInput() { return G.state === 'play' && G.introT > G.introDur * 0.7 && G.shuffleT < 0 && !G.pendingFail && !G.ended; }
function pickItem(it, delay = 0, magnet = false) {
  if (activeCount() >= 7) { SND.play('deny'); return false; }
  const idx = G.items.indexOf(it); if (idx < 0) return false;
  G.items.splice(idx, 1);
  Composite.remove(engine.world, it.body);
  const [cx, cy] = itemCenter(it); const [sx, sy] = w2s(cx, cy);
  wakeNear(it.body.position.x, it.body.position.y, 140);
  for (const o of G.items) Sleeping.set(o.body, false);
  // 插入位置：同类后面
  let pos = G.tray.length;
  for (let i = G.tray.length - 1; i >= 0; i--) if (G.tray[i].t === it.t && !G.tray[i].group) { pos = i + 1; break; }
  const e = { t: it.t, state: 'fly', x: slotX(pos), y: slotY(), sc: 1, group: 0, clearT: 0, land: 0 };
  G.tray.splice(pos, 0, e);
  const same = G.tray.filter(o => o.t === it.t && !o.group);
  if (same.length >= 3) { const gid = ++G.groupId; same.slice(0, 3).forEach(o => o.group = gid); }
  else if (activeCount() >= 7) G.pendingFail = true;
  G.flyers.push({ e, sx, sy, sa: it.body.angle, ss: itemScale(it), t: -delay, dur: magnet ? 0.5 : 0.36, S: it.S, magnet });
  SND.play(magnet ? 'pick' : 'pick', 1 + same.length * 0.12);
  // 拿起时的小火星
  for (let i = 0; i < 6; i++) G.parts.push({ k: 'ember', x: sx + rnd(-15, 15), y: sy + rnd(-10, 10), vx: rnd(-40, 40), vy: rnd(-120, -40), life: 0, max: rnd(.4, .8), r: rnd(1.5, 3) });
  return true;
}
function trayUpdate(dt) {
  // 槽位目标
  G.tray.forEach((e, i) => { e.tx = slotX(i); });
  for (const e of G.tray) { if (e.state !== 'fly') e.x = lerp(e.x, e.tx, 1 - Math.pow(0.0005, dt)); e.land = Math.max(0, e.land - dt * 4); }
  // 飞行
  for (let i = G.flyers.length - 1; i >= 0; i--) {
    const f = G.flyers[i]; f.t += dt; if (f.t < 0) continue;
    if (f.back) { if (f.t >= f.dur) { G.flyers.splice(i, 1); landBack(f); } continue; }
    if (f.t >= f.dur) {
      G.flyers.splice(i, 1); f.e.state = 'in'; f.e.x = f.e.tx; f.e.land = 1;
      SND.play('land', G.tray.indexOf(f.e));
      for (let k = 0; k < 5; k++) G.parts.push({ k: 'smoke', x: f.e.x + rnd(-10, 10), y: slotY() - 10, vx: rnd(-10, 10), vy: rnd(-40, -20), life: 0, max: rnd(.5, .9), r: rnd(8, 14) });
    }
  }
  // 消除
  const groups = {};
  for (const e of G.tray) if (e.group) (groups[e.group] = groups[e.group] || []).push(e);
  for (const gid in groups) {
    const g = groups[gid];
    if (g.length === 3 && g.every(e => e.state === 'in' || e.state === 'clear')) {
      for (const e of g) { if (e.state === 'in') { e.state = 'clear'; e.clearT = 0; } e.clearT += dt; }
      const mid = g[1];
      for (const e of g) e.x = lerp(e.x, mid.x, 1 - Math.pow(0.0001, dt));
      if (g[0].clearT > 0.24) { G.tray = G.tray.filter(e => !g.includes(e)); onMatch(g[0].t, mid.x, slotY()); }
    }
  }
  // 失败/胜利判定
  if (!G.ended && G.flyers.length === 0 && !G.tray.some(e => e.group)) {
    if (activeCount() >= 7) endFail('full');
    else if (G.items.length === 0 && G.tray.length === 0) { G.ended = true; setTimeout(() => endWin(), 700); }
  }
}
function onMatch(t, x, y) {
  const tnow = G.clock;
  G.combo = (tnow - G.lastMatch < 4.5) ? G.combo + 1 : 0; G.lastMatch = tnow;
  const gain = (t === LAMB ? 50 : 12) * (1 + G.combo * 0.5) | 0;
  G.score += gain;
  SND.play('match', G.combo);
  burst(x, y, t === LAMB ? '#ffffff' : '#ffd34a', 26);
  for (let i = 0; i < 5; i++) G.parts.push({ k: 'coin', x, y, vx: rnd(-90, 90), vy: rnd(-320, -180), life: 0, max: 0.9, r: 9, rot: rnd(0, TAU) });
  G.texts.push({ text: '+¥' + gain, x, y: y - 30, life: 0, max: 1.1, col: '#ffe066', size: 22 });
  if (G.combo >= 1) G.texts.push({ text: '连击 ×' + (G.combo + 1), x: L.gcx, y: L.gcy - L.Rp * 0.35, life: 0, max: 1.1, col: '#fff1a8', size: 30 + Math.min(G.combo, 5) * 3, big: true });
  G.shake = 0.12;
  if (t === LAMB) {
    G.lambs += 3; G.time += 10;
    setTimeout(() => SND.play('baa'), 160);
    G.banner = { text: G.lambs >= G.lambsTotal ? '小羊全部抓到！+10秒 奖励道具' : '抓到小羊啦！+10秒', t: 0, dur: 2.0, img: 'lamb' };
    if (G.lambs >= G.lambsTotal) setTimeout(() => SND.play('bonus'), 500);
  }
}
function burst(x, y, col, n) {
  for (let i = 0; i < n; i++) { const a = rnd(0, TAU), s = rnd(80, 330); G.parts.push({ k: 'star', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60, life: 0, max: rnd(.45, .85), r: rnd(4, 9), col: Math.random() < .5 ? col : '#fff6d0', rot: rnd(0, TAU) }); }
  G.parts.push({ k: 'ring', x, y, life: 0, max: 0.4, r: 10 });
  for (let k = 0; k < 6; k++) G.parts.push({ k: 'smoke', x: x + rnd(-14, 14), y: y - 6, vx: rnd(-20, 20), vy: rnd(-70, -35), life: 0, max: rnd(.7, 1.1), r: rnd(10, 18) });
}

/* ---------- 道具 ---------- */
const PROP_NAMES = { out: '移出', mag: '凑齐', shuf: '打乱' };
function useProp(k) {
  if (!canInput()) return;
  if (save.props[k] <= 0) { toast('三星通关、抓齐小羊可获得道具'); SND.play('deny'); return; }
  let ok = false;
  if (k === 'out') ok = propOut(); else if (k === 'mag') ok = propMagnet(); else ok = propShuffle();
  if (ok) { save.props[k]--; persist(); G.propPulse = { k, t: 0 }; }
}
function propOut(force) {
  const es = G.tray.filter(e => e.state === 'in' && !e.group).slice(0, 3);
  if (!es.length) { toast('托盘是空的哦'); SND.play('deny'); return false; }
  SND.play('whoosh');
  const tl = Math.min(MAXL - 1, topLayer() + 1);
  es.forEach((e, i) => {
    G.tray.splice(G.tray.indexOf(e), 1);
    const a = rnd(0, TAU), r = rnd(0, 60);
    G.flyers.push({ back: true, t: -i * 0.06, dur: 0.45, sx: e.x, sy: slotY(), t2: e.t, wx: Math.cos(a) * r, wy: Math.sin(a) * r, layer: tl, S: G.cfg.S, ang: rnd(0, TAU) });
  });
  G.pendingFail = false;
  return true;
}
function landBack(f) {
  const it = makeItem(f.t2, f.wx, f.wy, f.ang, f.layer, f.S); it.intro = -1; it.vz = f.layer + 0.6;
  G.items.push(it); Composite.add(engine.world, it.body);
  SND.play('land', 0);
  const [sx, sy] = w2s(f.wx, f.wy); for (let k = 0; k < 4; k++) G.parts.push({ k: 'smoke', x: sx + rnd(-10, 10), y: sy, vx: rnd(-15, 15), vy: rnd(-40, -20), life: 0, max: .8, r: rnd(10, 16) });
}
function propMagnet() {
  const cnt = {}; for (const e of G.tray) if (!e.group) cnt[e.t] = (cnt[e.t] || 0) + 1;
  let best = -1, bc = 0;
  for (const t in cnt) { const avail = G.items.filter(i => i.t == t).length; if (cnt[t] > bc && avail >= 3 - cnt[t]) { bc = cnt[t]; best = +t; } }
  if (best < 0) { // 托盘为空：挑最上层的一种
    const vis = drawOrder().reverse(); for (const it of vis) if (G.items.filter(i => i.t === it.t).length >= 3) { best = it.t; bc = 0; break; }
  }
  if (best < 0) { toast('没有可凑齐的串'); return false; }
  const need = 3 - bc;
  if (activeCount() + need > 7) { toast('托盘空位不够'); SND.play('deny'); return false; }
  const cand = G.items.filter(i => i.t === best).sort((a, b) => b.vz - a.vz).slice(0, need);
  SND.play('magnet');
  cand.forEach((it, i) => pickItem(it, i * 0.09, true));
  return true;
}
function propShuffle() {
  if (G.items.length < 2) { toast('串太少啦'); return false; }
  G.shuffleT = 0; SND.play('shuffle'); G.shake = 0.35;
  return true;
}
function doShuffleTeleport() {
  const rng = Math.random;
  const list = G.items.map(i => i.t);
  for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1));[list[i], list[j]] = [list[j], list[i]]; }
  const pl = placeItems(list, G.cfg.S, rng);
  for (const it of G.items) Composite.remove(engine.world, it.body);
  G.items = [];
  for (const p of pl) { const it = makeItem(p.t, p.x, p.y, p.a, p.l, G.cfg.S); it.intro = -1; G.items.push(it); Composite.add(engine.world, it.body); }
  settle(90);
}

/* ---------- 结束 ---------- */
function starsFor() { const r = G.time / G.timeMax; return r >= 0.45 ? 3 : r >= 0.2 ? 2 : 1; }
function endWin() {
  if (G.state !== 'play') return;
  G.state = 'win';
  const n = G.level, st = starsFor();
  const prev = save.stars[n] || 0;
  save.stars[n] = Math.max(prev, st); save.best[n] = Math.max(save.best[n] || 0, G.score);
  save.money = (save.money || 0) + G.score;
  if (n >= save.unlocked && n < 30) save.unlocked = n + 1;
  const rewards = [];
  const give = () => { const ks = ['out', 'mag', 'shuf']; const k = ks[Math.floor(Math.random() * 3)]; save.props[k]++; rewards.push(k); };
  if (st === 3 && !save.star3Done[n]) { save.star3Done[n] = 1; give(); }
  if (G.lambsTotal && G.lambs >= G.lambsTotal && !save.lambDone[n]) { save.lambDone[n] = 1; give(); }
  save.lambs = (save.lambs || 0) + G.lambs;
  persist();
  SND.play('win');
  $('wTitle').textContent = n === 30 ? '夜市撸串王！' : ['收摊大吉！', '生意兴隆！', '卖爆啦！'][st - 1];
  const sp = $('wStars').children; for (let i = 0; i < 3; i++) { sp[i].className = ''; }
  for (let i = 0; i < st; i++) setTimeout(() => { sp[i].className = 'on'; SND.play('star', i); }, 380 + i * 280);
  $('wScore').textContent = '¥ ' + G.score;
  const tl = Math.ceil(G.time);
  $('wInfo').innerHTML = `剩余时间 <b>${Math.floor(tl / 60)}:${String(tl % 60).padStart(2, '0')}</b>` + (G.lambsTotal ? `　小羊 <b>${G.lambs}/${G.lambsTotal}</b>` : '');
  $('wReward').innerHTML = rewards.length ? rewards.map(k => `<span class="reward"><img src="assets/ic_${k === 'out' ? 'out' : k === 'mag' ? 'magnet' : 'shuffle'}.webp">${PROP_NAMES[k]} +1</span>`).join(' ') : '';
  $('wNext').style.display = n < 30 ? '' : 'none';
  confetti();
  setTimeout(() => showScreen('win'), 250);
}
function endFail(reason) {
  if (G.ended) return; G.ended = true; G.state = 'fail';
  SND.play('fail'); SND.duck(true); G.shake = 0.3;
  $('fTitle').textContent = reason === 'full' ? '托盘塞满啦！' : '时间到！收摊啦';
  $('fInfo').innerHTML = `还剩 <b>${G.items.length}</b> 串没卖完，别灰心～`;
  const rv = $('fRevive');
  if (reason === 'full' && save.props.out > 0) { rv.style.display = ''; rv.textContent = `用【移出】继续（剩${save.props.out}）`; rv.onclick = () => { SND.play('click'); revive('out'); }; }
  else if (reason === 'time' && !G.revivedTime) { rv.style.display = ''; rv.textContent = '加时 30 秒（每关1次）'; rv.onclick = () => { SND.play('click'); revive('time'); }; }
  else rv.style.display = 'none';
  setTimeout(() => { if (G.state === 'fail') showScreen('fail'); }, 900);
}
function revive(k) {
  showScreen(null); G.state = 'play'; G.ended = false; SND.duck(false);
  if (k === 'out') { G.pendingFail = false; save.props.out--; persist(); propOut(); }
  else { G.revivedTime = true; G.time += 30; }
}

/* ---------- 彩带 ---------- */
function confetti() { const cols = ['#ffd34a', '#ff6b4a', '#7ee06a', '#5ac8ff', '#ff8ad8', '#fff']; for (let i = 0; i < 90; i++) G.parts.push({ k: 'conf', x: L.gx + rnd(0, L.GW), y: rnd(-80, -10), vx: rnd(-40, 40), vy: rnd(120, 300), life: 0, max: rnd(2.2, 3.5), r: rnd(4, 8), col: cols[i % cols.length], rot: rnd(0, TAU), vr: rnd(-8, 8) }); }

/* ---------- 输入 ---------- */
function inRect(x, y, r) { return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h; }
let ptr = null;
cv.addEventListener('pointerdown', e => {
  e.preventDefault(); const x = e.clientX, y = e.clientY;
  if (G.state !== 'play') return;
  if (inRect(x, y, L.pauseBtn)) { SND.play('click'); pauseGame(); return; }
  for (const p of L.props) if (inRect(x, y, p)) { p.down = 0.12; SND.play('click'); useProp(p.k); return; }
  if (!canInput()) return;
  const it = hitTest(x, y); G.press = it; ptr = { id: e.pointerId, x, y };
  if (it) SND.play('click');
});
cv.addEventListener('pointermove', e => {
  if (!ptr || e.pointerId !== ptr.id || !canInput()) return;
  const it = hitTest(e.clientX, e.clientY); if (it !== G.press) { G.press = it; }
});
const up = e => {
  if (!ptr || e.pointerId !== ptr.id) return; ptr = null;
  const it = G.press; G.press = null;
  if (it && canInput() && G.items.includes(it)) pickItem(it);
};
cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', () => { ptr = null; G.press = null; });
document.addEventListener('touchmove', e => { if (e.target === cv) e.preventDefault(); }, { passive: false });
let unlocked = false;
const unlockAudio = () => { SND.unlock(); if (!unlocked) { unlocked = true; if (save.music) SND.startMusic(); } };
document.addEventListener('pointerdown', unlockAudio, true); document.addEventListener('touchend', unlockAudio, true);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { if (G.state === 'play') pauseGame(); SND.stopMusic(); try { SND.ctx && SND.ctx.suspend(); } catch (e) { } }
  else { try { SND.ctx && SND.ctx.resume(); } catch (e) { } if (save.music && unlocked) SND.startMusic(); }
});

/* ---------- 屏幕/DOM ---------- */
function showScreen(id) { for (const s of ['menu', 'levels', 'pause', 'win', 'fail', 'load']) $(s).classList.toggle('on', s === id); }
let toastT = 0;
function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 1500); }
function pauseGame() {
  if (G.state !== 'play') return; G.state = 'paused'; SND.duck(true);
  $('pInfo').innerHTML = `第 <b>${G.level}</b> 关　剩余 <b>${G.items.length}</b> 串`;
  showScreen('pause');
}
function resume() { G.state = 'play'; SND.duck(false); showScreen(null); }
function syncToggles() {
  for (const id of ['mMusic', 'pMusic']) $(id).classList.toggle('off', !save.music);
  for (const id of ['mSfx', 'pSfx']) $(id).classList.toggle('off', !save.sfx);
}
function toggleMusic() { save.music = !save.music; persist(); SND.setMusic(save.music); if (save.music) { SND.unlock(); SND.startMusic(); } else SND.stopMusic(); syncToggles(); }
function toggleSfx() { save.sfx = !save.sfx; persist(); SND.setSfx(save.sfx); syncToggles(); SND.play('click'); }
function openMenu() {
  G.state = 'menu'; SND.duck(false);
  const tot = Object.values(save.stars).reduce((a, b) => a + b, 0);
  $('mStat').textContent = `已解锁 ${save.unlocked}/30 关 · ★${tot} · 累计营收 ¥${save.money || 0}`;
  $('bPlay').textContent = save.unlocked > 1 ? `继续营业 · 第${save.unlocked}关` : '开始营业';
  demoPile(); showScreen('menu');
}
function openLevels() {
  G.state = 'levels';
  const g = $('grid'); g.innerHTML = '';
  const tot = Object.values(save.stars).reduce((a, b) => a + b, 0);
  $('lvTot').textContent = `★ ${tot} / 90　　小羊收集 🐑 ${save.lambs || 0}`;
  for (let i = 1; i <= 30; i++) {
    const b = document.createElement('button'); const lock = i > save.unlocked; const s = save.stars[i] || 0;
    b.className = 'lv' + (lock ? ' lock' : '') + (i === save.unlocked ? ' cur' : '');
    b.innerHTML = lock ? '<svg width="22" height="26" viewBox="0 0 22 26"><rect x="2" y="11" width="18" height="14" rx="3" fill="#a8957f"/><path d="M6 11V8a5 5 0 0 1 10 0v3" stroke="#a8957f" stroke-width="3" fill="none"/></svg>' : `${i}<div class="s">${[0, 1, 2].map(k => k < s ? '<i>★</i>' : '☆').join('')}</div>`;
    b.onclick = () => { if (lock) { SND.play('deny'); toast('先通过前面的关卡哦'); return; } SND.play('click'); startLevel(i); };
    g.appendChild(b);
  }
  showScreen('levels');
  setTimeout(() => { const c = g.querySelector('.cur'); if (c && c.scrollIntoView) c.scrollIntoView({ block: 'center' }); }, 30);
}
function demoPile() {
  newEngine(); G.items = []; G.tray = []; G.flyers = []; G.parts = []; G.texts = []; G.banner = null; G.shuffleT = -1;
  const rng = mulberry(4242); const list = []; for (let i = 0; i < 40; i++) list.push(i === 3 || i === 17 ? LAMB : Math.floor(rng() * 13));
  const S = 72; G.cfg = { S };
  const pl = placeItems(list, S, rng);
  for (const p of pl) { const it = makeItem(p.t, p.x, p.y, p.a, p.l, S); it.intro = -1; G.items.push(it); Composite.add(engine.world, it.body); }
  settle(120); G.introT = 99; G.introDur = 0;
}
$('bPlay').onclick = () => { SND.play('click'); startLevel(save.unlocked); };
$('bLevels').onclick = () => { SND.play('click'); openLevels(); };
$('lvBack').onclick = () => { SND.play('click'); openMenu(); };
$('mMusic').onclick = $('pMusic').onclick = toggleMusic; $('mSfx').onclick = $('pSfx').onclick = toggleSfx;
$('pResume').onclick = () => { SND.play('click'); resume(); };
$('pRestart').onclick = () => { SND.play('click'); startLevel(G.level); };
$('pQuit').onclick = () => { SND.play('click'); openLevels(); };
$('wRetry').onclick = () => { SND.play('click'); startLevel(G.level); };
$('wMenu').onclick = () => { SND.play('click'); openLevels(); };
$('wNext').onclick = () => { SND.play('click'); startLevel(G.level + 1); };
$('fRetry').onclick = () => { SND.play('click'); SND.duck(false); startLevel(G.level); };
$('fMenu').onclick = () => { SND.play('click'); SND.duck(false); openLevels(); };
// 返回 Tilo 游戏屋：先存档再离开
function goHub(e) { if (e) e.stopPropagation(); persist(); try { SND.play('click'); } catch (_) { } location.href = '../'; }
for (const id of ['mHub', 'pHub', 'wHub', 'fHub']) $(id).onclick = goHub;

/* ---------- 渲染 ---------- */
let smokeImg, glowImg, coinImg;
function makeFx() {
  smokeImg = mkCanvas(128, 128); let x = smokeImg.getContext('2d'); let g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(235,225,215,.55)'); g.addColorStop(.5, 'rgba(210,200,190,.22)'); g.addColorStop(1, 'rgba(200,190,180,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  glowImg = mkCanvas(128, 128); x = glowImg.getContext('2d'); g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,200,90,1)'); g.addColorStop(.3, 'rgba(255,120,30,.5)'); g.addColorStop(1, 'rgba(255,60,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  coinImg = mkCanvas(64, 64); x = coinImg.getContext('2d'); g = x.createLinearGradient(0, 4, 0, 60); g.addColorStop(0, '#fff3a0'); g.addColorStop(.5, '#ffc928'); g.addColorStop(1, '#d98a00');
  x.beginPath(); x.arc(32, 32, 28, 0, TAU); x.fillStyle = g; x.fill(); x.lineWidth = 4; x.strokeStyle = '#a65a00'; x.stroke();
  x.beginPath(); x.arc(32, 32, 20, 0, TAU); x.lineWidth = 2.5; x.strokeStyle = 'rgba(166,90,0,.6)'; x.stroke();
  x.fillStyle = '#9a4f00'; x.font = `900 28px ${FONT}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('¥', 32, 34);
}
function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function txt(s, x, y, size, fill, stroke, sw = 4, align = 'center', weight = 900) {
  ctx.font = `${weight} ${size}px ${FONT}`; ctx.textAlign = align; ctx.textBaseline = 'middle';
  if (stroke) { ctx.lineJoin = 'round'; ctx.lineWidth = sw; ctx.strokeStyle = stroke; ctx.strokeText(s, x, y); }
  ctx.fillStyle = fill; ctx.fillText(s, x, y);
}
let bgCache = null;
function buildBg() {
  bgCache = mkCanvas(W * DPR, H * DPR); const c = bgCache.getContext('2d'); c.setTransform(DPR, 0, 0, DPR, 0, 0);
  const im = IMG.bg; const s = Math.max(W / im.width, H / im.height); const w = im.width * s, h = im.height * s;
  c.drawImage(im, (W - w) / 2, Math.min(0, (H - h) * 0.3), w, h);
  let g = c.createRadialGradient(L.gcx, L.gcy, L.Rp * 0.6, L.gcx, L.gcy, Math.max(W, H) * 0.8); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(8,3,1,.55)'); c.fillStyle = g; c.fillRect(0, 0, W, H);
  g = c.createLinearGradient(0, L.trayY - 40, 0, H); g.addColorStop(0, 'rgba(15,6,2,0)'); g.addColorStop(.3, 'rgba(15,6,2,.55)'); g.addColorStop(1, 'rgba(15,6,2,.85)'); c.fillStyle = g; c.fillRect(0, L.trayY - 40, W, H);
  // 烤盘投影 + 烤盘
  const gi = IMG.grill, gs = L.Rp / 425, gw = gi.width * gs, gh = gi.height * gs;
  c.save(); c.shadowColor = 'rgba(0,0,0,.75)'; c.shadowBlur = 26; c.shadowOffsetY = L.Rp * 0.07; c.shadowOffsetX = 3;
  c.drawImage(gi, L.gcx - gw / 2, L.gcy - gh / 2, gw, gh); c.restore();
  c.drawImage(gi, L.gcx - gw / 2, L.gcy - gh / 2, gw, gh);
}
function drawBg() {
  if (!bgCache || bgCache.width !== Math.round(W * DPR) || bgCache.height !== Math.round(H * DPR)) buildBg();
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(bgCache, 0, 0); ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  const t = G.clock;
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 7; i++) {
    const x = L.gx + L.GW * (i + 0.5) / 7 + Math.sin(i * 7.3) * 12, y = L.st + 20 + Math.sin(i * 3.1) * 14 + 6;
    ctx.globalAlpha = 0.10 + 0.08 * Math.sin(t * 2.2 + i * 1.7); ctx.drawImage(glowImg, x - 40, y - 40, 80, 80);
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}
function drawGrill() {
  const t = G.clock; ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.20 + 0.08 * Math.sin(t * 1.7) + 0.04 * Math.sin(t * 5.3);
  ctx.drawImage(glowImg, L.gcx - L.Rp * 0.85, L.gcy - L.Rp * 0.85, L.Rp * 1.7, L.Rp * 1.7);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}
function drawItems(dt) {
  const arr = drawOrder(); const tl = topLayer();
  const shakeX = G.shake > 0 ? Math.sin(G.clock * 70) * G.shake * 14 : 0;
  let shufS = 1, shufY = 0, shufA = 1;
  if (G.shuffleT >= 0) { const st = G.shuffleT; if (st < 0.35) { const k = st / 0.35; shufS = 1 + 0.18 * Math.sin(k * Math.PI / 2); shufY = -40 * Math.sin(k * Math.PI / 2); shufA = 1 - k * 0.3; } else { const k = clamp((st - 0.35) / 0.5, 0, 1); shufS = 1.25 - 0.25 * easeBack(k); shufY = -30 * (1 - easeOut(k)); shufA = 0.7 + 0.3 * k; } }
  for (const it of arr) it.vz = lerp(it.vz, it.layer, 1 - Math.pow(0.02, dt));
  // 两遍：投影，再本体
  for (let pass = 0; pass < 2; pass++) {
    for (const it of arr) {
      const sp = sprites(it.t, it.S);
      let k = 1, yoff = 0, alpha = 1;
      if (it.intro >= 0) { const p = clamp((G.introT - it.intro) / 0.42, 0, 1); if (p <= 0) continue; k = 1 + (1 - easeOut(p)) * 0.9; yoff = -(1 - easeOut(p)) * 160; alpha = clamp(p * 2.5, 0, 1); if (p >= 1) it.intro = -1; }
      const [cx, cy] = itemCenter(it); let [px, py] = w2s(cx, cy);
      px = L.gcx + (px - L.gcx) * shufS + shakeX; py = L.gcy + (py - L.gcy) * shufS + yoff + shufY;
      const pressed = G.press === it;
      const sc = itemScale(it) * k * shufS * (pressed ? 1.1 : 1);
      const a = it.body.angle;
      const img = pass === 0 ? sp.shadow : (pressed ? sp.hl : sp.shade[clamp(Math.round((tl - it.vz) * 1.15), 0, 5)]);
      const fw = img.width / sp.res, fh = img.height / sp.res; // 源px
      const s2 = sp.k * sc;
      ctx.save(); ctx.globalAlpha = alpha * shufA;
      if (pass === 0) ctx.translate(px + 3 * sc, py + 6 * sc - yoff * 0.6); else ctx.translate(px, py);
      ctx.rotate(a); ctx.scale(s2, s2);
      ctx.drawImage(img, -fw / 2, -fh / 2, fw, fh);
      ctx.restore();
    }
  }
}
function drawTop() {
  // 暂停按钮
  const pb = L.pauseBtn; woodBtn(pb.x, pb.y, pb.w, pb.h, 14);
  ctx.fillStyle = '#fff3d6'; rr(pb.x + 15, pb.y + 13, 6, 20, 2); ctx.fill(); rr(pb.x + 25, pb.y + 13, 6, 20, 2); ctx.fill();
  // 关卡牌
  const cx = L.gx + L.GW / 2, w = 132, y = L.top;
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
  let g = ctx.createLinearGradient(0, y, 0, y + 46); g.addColorStop(0, '#d9452e'); g.addColorStop(1, '#a3221a'); ctx.fillStyle = g; rr(cx - w / 2, y, w, 46, 14); ctx.fill(); ctx.restore();
  ctx.strokeStyle = '#ffcf7a'; ctx.lineWidth = 2; rr(cx - w / 2 + 3, y + 3, w - 6, 40, 11); ctx.stroke();
  txt(`第 ${G.level} 关`, cx, y + 17, 17, '#fff6dc', '#6a1208', 4);
  // 进度条
  const tot = G.cfg.items, left = G.items.length + G.tray.length; const pr = 1 - left / tot;
  ctx.fillStyle = 'rgba(0,0,0,.35)'; rr(cx - 46, y + 31, 92, 7, 3.5); ctx.fill();
  ctx.fillStyle = '#ffd34a'; rr(cx - 46, y + 31, Math.max(7, 92 * pr), 7, 3.5); ctx.fill();
  // 计时
  const tw = 96, tx = L.gx + L.GW - tw - 12, low = G.time < 10;
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
  ctx.fillStyle = low ? (Math.sin(G.clock * 10) > 0 ? '#c4221a' : '#7a120c') : 'rgba(30,14,6,.85)'; rr(tx, y + 4, tw, 38, 19); ctx.fill(); ctx.restore();
  ctx.strokeStyle = low ? '#ffb0a0' : '#c98a4a'; ctx.lineWidth = 2; rr(tx, y + 4, tw, 38, 19); ctx.stroke();
  // 时钟图标
  const ix = tx + 20, iy = y + 23; ctx.fillStyle = '#fff3d6'; ctx.beginPath(); ctx.arc(ix, iy, 10, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#a3221a'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(ix, iy); ctx.lineTo(ix, iy - 6); ctx.moveTo(ix, iy); ctx.lineTo(ix + 4.5, iy + 2); ctx.stroke();
  const tsec = Math.max(0, Math.ceil(G.time));
  txt(`${Math.floor(tsec / 60)}:${String(tsec % 60).padStart(2, '0')}`, tx + 60, y + 24, 19, low ? '#fff' : '#ffe9b0', null, 0);
  // 信息行：营收 & 小羊
  const iy2 = L.info + L.infoH / 2;
  pill(L.gx + 12, L.info, 104, L.infoH);
  ctx.drawImage(coinImg, L.gx + 16, L.info + 3, L.infoH - 6, L.infoH - 6);
  txt('¥ ' + G.score, L.gx + 16 + L.infoH, iy2 + 1, 16, '#ffe066', null, 0, 'left');
  if (G.lambsTotal) {
    const lx = L.gx + L.GW - 116; pill(lx, L.info, 104, L.infoH);
    const li = IMG.lamb; ctx.drawImage(li, lx + 6, L.info + 1, (L.infoH - 2) * li.width / li.height, L.infoH - 2);
    txt(`小羊 ${G.lambs}/${G.lambsTotal}`, lx + 36, iy2 + 1, 14, G.lambs >= G.lambsTotal ? '#9dff7a' : '#fff', null, 0, 'left', 700);
  }
  txt(`剩余 ${G.items.length} 串`, L.gx + L.GW / 2, iy2 + 1, 14, 'rgba(255,233,200,.85)', 'rgba(0,0,0,.5)', 3, 'center', 700);
}
function pill(x, y, w, h) { ctx.fillStyle = 'rgba(25,10,4,.72)'; rr(x, y, w, h, h / 2); ctx.fill(); ctx.strokeStyle = 'rgba(255,190,110,.45)'; ctx.lineWidth = 1.5; ctx.stroke(); }
function woodBtn(x, y, w, h, r) {
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 4;
  ctx.fillStyle = '#6b340f'; rr(x, y + 3, w, h, r); ctx.fill(); ctx.restore();
  const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#f2a14a'); g.addColorStop(1, '#c2661c'); ctx.fillStyle = g; rr(x, y, w, h, r); ctx.fill();
  ctx.strokeStyle = 'rgba(255,230,180,.7)'; ctx.lineWidth = 1.5; rr(x + 2, y + 2, w - 4, h - 4, r - 2); ctx.stroke();
}
function drawTray() {
  const x = L.trayX, y = L.trayY, w = L.trayW, h = L.trayH;
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 6;
  let g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#a8692f'); g.addColorStop(.5, '#7d4519'); g.addColorStop(1, '#5a2e0f'); ctx.fillStyle = g; rr(x, y, w, h, 16); ctx.fill(); ctx.restore();
  ctx.strokeStyle = '#e0a868'; ctx.lineWidth = 2; rr(x + 1, y + 1, w - 2, h - 2, 15); ctx.stroke();
  // 木纹
  ctx.save(); rr(x, y, w, h, 16); ctx.clip(); ctx.strokeStyle = 'rgba(60,25,5,.25)'; ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(x, y + 6 + i * h / 5); ctx.bezierCurveTo(x + w * .3, y + 2 + i * h / 5, x + w * .6, y + 12 + i * h / 5, x + w, y + 5 + i * h / 5); ctx.stroke(); }
  ctx.restore();
  const n = activeCount(); const danger = n >= 5;
  for (let i = 0; i < 7; i++) {
    const sx = slotX(i) - L.slot / 2, sy = slotY() - L.slot / 2;
    g = ctx.createLinearGradient(0, sy, 0, sy + L.slot); g.addColorStop(0, '#2a1308'); g.addColorStop(1, '#4a2611'); ctx.fillStyle = g; rr(sx, sy, L.slot, L.slot, 10); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 2; rr(sx + 1, sy + 1, L.slot - 2, L.slot - 2, 9); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,200,140,.18)'; ctx.lineWidth = 1; rr(sx, sy + 1, L.slot, L.slot, 10); ctx.stroke();
    if (danger && i >= n) { ctx.strokeStyle = `rgba(255,70,50,${0.45 + 0.35 * Math.sin(G.clock * 8)})`; ctx.lineWidth = 2.5; rr(sx + 1, sy + 1, L.slot - 2, L.slot - 2, 9); ctx.stroke(); }
  }
  // 托盘中的物品
  for (const e of G.tray) {
    if (e.state === 'fly') continue;
    let sc = 1 + e.land * 0.18 * Math.sin(e.land * Math.PI);
    if (e.state === 'clear') sc *= 1 + Math.min(1, e.clearT / 0.24) * 0.25;
    drawTraySprite(e.t, e.x, slotY(), sc, e.state === 'clear' ? Math.min(1, e.clearT / 0.24) : 0);
  }
}
function drawTraySprite(t, x, y, sc, flash) {
  const sp = sprites(t, G.cfg.S || 72); const img = flash > 0 ? sp.hl : sp.shade[0];
  const fw = img.width / sp.res, fh = img.height / sp.res; // 源px
  const s = (L.slot * 1.02 / Math.max(sp.w, sp.h)) * sc * (TYPES[t].f < 0.8 ? 0.92 : 1.05);
  ctx.drawImage(img, x - fw * s / 2, y - fh * s / 2, fw * s, fh * s);
}
function drawProps(dt) {
  const icons = { out: IMG.ic_out, mag: IMG.ic_magnet, shuf: IMG.ic_shuffle };
  for (const p of L.props) {
    p.down = Math.max(0, (p.down || 0) - dt);
    const press = p.down > 0 ? 3 : 0, x = p.x, y = p.y + press, w = p.w, h = p.h - 6;
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4;
    ctx.fillStyle = '#b25a00'; rr(x, y + 6 - press, w, h, 20); ctx.fill(); ctx.restore();
    const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#fff2a8'); g.addColorStop(.45, '#ffd23f'); g.addColorStop(1, '#ffa818'); ctx.fillStyle = g; rr(x, y, w, h, 20); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.35)'; rr(x + 8, y + 4, w - 16, h * 0.32, 12); ctx.fill();
    const ic = icons[p.k]; const ih = h * 0.6, iw = ih * ic.width / ic.height;
    let bounce = 0; if (G.propPulse && G.propPulse.k === p.k) { G.propPulse.t += dt; bounce = Math.sin(Math.min(1, G.propPulse.t / 0.4) * Math.PI) * 0.25; }
    ctx.drawImage(ic, x + w / 2 - iw * (1 + bounce) / 2, y + 4 - ih * bounce / 2, iw * (1 + bounce), ih * (1 + bounce));
    txt(PROP_NAMES[p.k], x + w / 2, y + h - 12, 15, '#fff', '#8a3a00', 4);
    // 数量角标
    const c = save.props[p.k], bx = x + w - 6, by = y + 4;
    ctx.beginPath(); ctx.arc(bx, by, 12, 0, TAU); ctx.fillStyle = c > 0 ? '#e5342a' : '#34b233'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#fff'; ctx.stroke();
    txt(c > 0 ? String(c) : '+', bx, by + 1, c > 0 ? 14 : 18, '#fff', null, 0);
  }
}
function drawFlyers() {
  for (const f of G.flyers) {
    if (f.t < 0) continue;
    const p = clamp(f.t / f.dur, 0, 1), e = easeOut(p);
    if (f.back) {
      const [tx, ty] = w2s(f.wx, f.wy);
      const x = lerp(f.sx, tx, e), y = lerp(f.sy, ty, e) - Math.sin(p * Math.PI) * 120;
      const sp = sprites(f.t2, f.S); const img = sp.shade[0]; const s = sp.k * (1 + Math.sin(p * Math.PI) * 0.4);
      ctx.save(); ctx.translate(x, y); ctx.rotate(f.ang * p); ctx.scale(s, s); ctx.drawImage(img, -img.width / sp.res / 2, -img.height / sp.res / 2, img.width / sp.res, img.height / sp.res); ctx.restore();
      continue;
    }
    const tx = f.e.tx || slotX(G.tray.indexOf(f.e)), ty = slotY();
    const cx = (f.sx + tx) / 2 + (f.magnet ? 0 : (f.sx < tx ? -40 : 40)), cy = Math.min(f.sy, ty) - 110;
    const u = 1 - e; const x = u * u * f.sx + 2 * u * e * cx + e * e * tx, y = u * u * f.sy + 2 * u * e * cy + e * e * ty;
    const sp = sprites(f.e.t, f.S); const img = sp.shade[0];
    const s0 = sp.k * f.ss, s1 = (L.slot * 1.02 / Math.max(sp.w, sp.h)) * (TYPES[f.e.t].f < 0.8 ? 0.92 : 1.05);
    const s = lerp(s0, s1, e) * (1 + Math.sin(p * Math.PI) * 0.35);
    // 拖尾
    if (Math.random() < 0.6) G.parts.push({ k: 'ember', x, y, vx: rnd(-20, 20), vy: rnd(-30, 10), life: 0, max: .35, r: rnd(1.5, 3) });
    ctx.save(); ctx.translate(x, y); ctx.rotate(f.sa * (1 - e)); ctx.scale(s, s);
    ctx.drawImage(img, -img.width / sp.res / 2, -img.height / sp.res / 2, img.width / sp.res, img.height / sp.res); ctx.restore();
  }
}
function star4(x, y, r, rot) { ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = rot + i * Math.PI / 4, rr2 = i % 2 ? r * 0.38 : r; ctx.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); } ctx.closePath(); }
function drawParts(dt) {
  for (let i = G.parts.length - 1; i >= 0; i--) {
    const p = G.parts[i]; p.life += dt; if (p.life >= p.max) { G.parts.splice(i, 1); continue; }
    const k = p.life / p.max;
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.k === 'star') { p.vy += 500 * dt; p.vx *= 0.98; ctx.globalAlpha = 1 - k; ctx.fillStyle = p.col; star4(p.x, p.y, p.r * (1 - k * 0.5), p.rot + k * 3); ctx.fill(); }
    else if (p.k === 'ember') { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = (1 - k) * 0.9; ctx.drawImage(glowImg, p.x - p.r * 3, p.y - p.r * 3, p.r * 6, p.r * 6); ctx.globalCompositeOperation = 'source-over'; }
    else if (p.k === 'smoke') { const r = p.r * (1 + k * 1.5); ctx.globalAlpha = (1 - k) * 0.55; ctx.drawImage(smokeImg, p.x - r, p.y - r, r * 2, r * 2); }
    else if (p.k === 'ring') { ctx.globalAlpha = 1 - k; ctx.strokeStyle = '#fff3b0'; ctx.lineWidth = 4 * (1 - k) + 1; ctx.beginPath(); ctx.arc(p.x, p.y, 10 + k * 60, 0, TAU); ctx.stroke(); }
    else if (p.k === 'coin') { p.vy += 900 * dt; const sx = Math.abs(Math.cos(p.rot + p.life * 12)); ctx.globalAlpha = k > .7 ? (1 - k) / .3 : 1; ctx.drawImage(coinImg, p.x - p.r * sx, p.y - p.r, p.r * 2 * sx + 1, p.r * 2); }
    else if (p.k === 'conf') { p.rot += p.vr * dt; p.vx += Math.sin(p.life * 4 + p.r) * 30 * dt; ctx.globalAlpha = k > .8 ? (1 - k) / .2 : 1; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.col; ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2 * (0.4 + Math.abs(Math.sin(p.life * 6)))); ctx.restore(); }
    else if (p.k === 'wisp') { const r = p.r * (1 + k); ctx.globalAlpha = Math.sin(k * Math.PI) * 0.16; ctx.drawImage(smokeImg, p.x - r, p.y - r, r * 2, r * 2); }
  }
  ctx.globalAlpha = 1;
  for (let i = G.texts.length - 1; i >= 0; i--) {
    const t = G.texts[i]; t.life += dt; if (t.life >= t.max) { G.texts.splice(i, 1); continue; }
    const k = t.life / t.max; const sc = t.big ? (k < .15 ? easeBack(k / .15) : 1) : 1;
    ctx.globalAlpha = k > .7 ? (1 - k) / .3 : 1;
    ctx.save(); ctx.translate(t.x, t.y - k * 40); ctx.scale(sc, sc); if (t.big) { ctx.shadowColor = 'rgba(255,120,0,.9)'; ctx.shadowBlur = 16; } txt(t.text, 0, 0, t.size, t.col, t.big ? '#b22a00' : '#4a1500', t.big ? 7 : 5); ctx.restore();
  }
  ctx.globalAlpha = 1;
}
function ambient(dt) {
  // 炭火火星
  if (Math.random() < dt * 14) { const a = rnd(0, TAU), r = Math.sqrt(Math.random()) * L.Rp * 0.8; G.parts.push({ k: 'ember', x: L.gcx + Math.cos(a) * r, y: L.gcy + Math.sin(a) * r, vx: rnd(-12, 12), vy: rnd(-70, -30), life: 0, max: rnd(.8, 1.6), r: rnd(1.2, 2.6) }); }
  // 烟
  if (Math.random() < dt * 2.2) { const a = rnd(0, TAU), r = Math.sqrt(Math.random()) * L.Rp * 0.7; G.parts.push({ k: 'wisp', x: L.gcx + Math.cos(a) * r, y: L.gcy + Math.sin(a) * r, vx: rnd(-8, 8), vy: rnd(-40, -22), life: 0, max: rnd(2.2, 3.4), r: rnd(30, 55) }); }
}
function drawBanner(dt) {
  const b = G.banner; if (!b) return;
  if (b.delay > 0) { b.delay -= dt; return; }
  b.t += dt; if (b.t > b.dur) { G.banner = null; return; }
  const k = b.t / b.dur; const a = k < .12 ? k / .12 : k > .85 ? (1 - k) / .15 : 1; const s = k < .12 ? easeBack(k / .12) : 1;
  const y = L.gcy - L.Rp - 4 + (L.info + L.infoH - (L.gcy - L.Rp)) * 0 + L.Rp * 0.0; const by = Math.max(L.info + L.infoH + 26, L.gcy - L.Rp + 20);
  ctx.save(); ctx.globalAlpha = a; ctx.translate(L.gcx, by); ctx.scale(s, s);
  ctx.font = `900 17px ${FONT}`; const tw = ctx.measureText(b.text).width + (b.img ? 46 : 0) + 34;
  ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 3;
  const g = ctx.createLinearGradient(0, -20, 0, 20); g.addColorStop(0, '#ff8a4a'); g.addColorStop(1, '#d93a20'); ctx.fillStyle = g; rr(-tw / 2, -21, tw, 42, 21); ctx.fill();
  ctx.shadowColor = 'transparent'; ctx.strokeStyle = '#ffe0a0'; ctx.lineWidth = 2; rr(-tw / 2 + 2, -19, tw - 4, 38, 19); ctx.stroke();
  let tx = 0; if (b.img) { const im = IMG[b.img]; const ih = 38, iw = ih * im.width / im.height; ctx.drawImage(im, -tw / 2 + 12, -ih / 2 - 2, iw, ih); tx = 20; }
  txt(b.text, tx, 1, 17, '#fff', '#7a1a08', 4);
  ctx.restore();
}

/* ---------- 机器人（?bot 测试） ---------- */
let botT = 0;
function visibleCands() {
  const cands = [];
  for (const it of drawOrder().reverse()) {
    const [cx, cy] = itemCenter(it); const [sx, sy] = w2s(cx, cy);
    const pts = [[sx, sy]]; const ca = Math.cos(it.body.angle), sa = Math.sin(it.body.angle);
    for (const f of [0.35, -0.35]) pts.push([sx + (it.axis.x * ca - it.axis.y * sa) * f * L.ws, sy + (it.axis.x * sa + it.axis.y * ca) * f * L.ws]);
    for (const p of pts) if (hitTest(p[0], p[1]) === it) { cands.push({ it, p }); break; }
  }
  return cands;
}
function bot(dt) {
  botT -= dt; if (botT > 0 || !canInput()) return; botT = 0.33 / DEBUG.speed;
  const cnt = {}; for (const e of G.tray) if (!e.group) cnt[e.t] = (cnt[e.t] || 0) + 1;
  const act = activeCount();
  if (act >= 6 && save.props.out > 0) { useProp('out'); return; }
  const cands = visibleCands();
  if (!cands.length) return;
  const vis = {}; for (const c of cands) vis[c.it.t] = (vis[c.it.t] || 0) + 1;
  let best = null, bs = -1e9;
  for (const c of cands) {
    const t = c.it.t, have = cnt[t] || 0; let s = have * 100 + vis[t] * 10;
    if (have === 0 && act >= 5) s -= 500; if (have + vis[t] >= 3) s += 50;
    if (s > bs) { bs = s; best = c; }
  }
  G.press = best.it; pickItem(best.it); G.press = null;
}

/* ---------- 主循环 ---------- */
let last = performance.now(), acc = 0, tickSec = -1, frames = 0, fpsT = 0;
G.fps = 60;
function frame(now) {
  requestAnimationFrame(frame);
  let dt = Math.min(0.05, (now - last) / 1000); last = now; dt *= DEBUG.speed;
  frames++; fpsT += dt; if (fpsT > 1) { G.fps = frames / fpsT; frames = 0; fpsT = 0; }
  if (G.state === 'loading') return;
  const running = G.state === 'play' || G.state === 'menu' || G.state === 'levels' || G.state === 'win';
  if (running) {
    G.clock += dt;
    if (engine && G.items.length) { acc += dt; let n = 0; while (acc >= 1 / 60 && n < 4) { physicsStep(1000 / 60); acc -= 1 / 60; n++; } if (n === 4) acc = 0; }
    G.supT = (G.supT || 0) + dt; if (G.supT > 0.22 && engine) { G.supT = 0; supportCheck(); }
  }
  if (G.state === 'play') {
    G.introT += dt;
    if (G.shuffleT >= 0) { const p = G.shuffleT; G.shuffleT += dt; if (p < 0.35 && G.shuffleT >= 0.35) { doShuffleTeleport(); for (let i = 0; i < 14; i++) { const a = rnd(0, TAU), r = rnd(0, L.Rp * .6); G.parts.push({ k: 'smoke', x: L.gcx + Math.cos(a) * r, y: L.gcy + Math.sin(a) * r, vx: rnd(-30, 30), vy: rnd(-60, -20), life: 0, max: rnd(.6, 1), r: rnd(20, 36) }); } } if (G.shuffleT > 0.9) G.shuffleT = -1; }
    if (G.introT > G.introDur && !G.ended && !G.pendingFail) {
      G.time -= dt;
      const s = Math.ceil(G.time); if (s <= 10 && s !== tickSec && s > 0) { tickSec = s; SND.play('tick'); if (s === 10) G.banner = { text: '快收摊啦！抓紧时间！', t: 0, dur: 1.6 }; }
      if (G.time <= 0) { G.time = 0; endFail('time'); }
    }
    trayUpdate(dt);
    if (DEBUG.bot) bot(dt);
    // 托盘警告
    const ac = activeCount(); if (ac === 6 && G.warned !== G.tray.length) { G.warned = G.tray.length; SND.play('warn'); }
  }
  if (G.shake > 0) G.shake = Math.max(0, G.shake - dt);
  // 绘制
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  drawBg(); drawGrill();
  if (running || G.state === 'paused' || G.state === 'fail') ambient(G.state === 'paused' ? 0 : dt);
  drawItems(G.state === 'paused' ? 0 : dt);
  if (G.state !== 'menu' && G.state !== 'levels') {
    drawTop(); drawTray(); drawProps(dt); drawFlyers();
  }
  drawParts(G.state === 'paused' ? 0 : dt);
  if (G.state === 'play') drawBanner(dt);
  if (G.state === 'menu' || G.state === 'levels') { ctx.fillStyle = 'rgba(10,4,1,.35)'; ctx.fillRect(0, 0, W, H); }
}

/* ---------- 加载 ---------- */
function load() {
  const names = TYPES.map(t => t.key).concat(['grill', 'ic_out', 'ic_magnet', 'ic_shuffle']);
  const all = names.map(n => [n, 'assets/' + n + '.webp']).concat([['bg', 'assets/bg.jpg']]);
  let done = 0;
  return Promise.all(all.map(([n, src]) => new Promise(res => {
    const im = new Image(); im.onload = () => { IMG[n] = im; done++; $('lbar').style.width = (done / all.length * 100) + '%'; res(); }; im.onerror = () => { done++; res(); }; im.src = src;
  })));
}
window.addEventListener('resize', () => { layout(); });
layout(); makeFx(); requestAnimationFrame(frame);
load().then(() => {
  TYPES.forEach((t, i) => buildMask(i));
  syncToggles(); SND.setMusic(save.music); SND.setSfx(save.sfx);
  $('ltxt').textContent = '开张啦！';
  if (DEBUG.level) { startLevel(DEBUG.level); } else openMenu();
});
window.__dbg = { cands: () => visibleCands().map(c => ({ t: c.it.t, x: c.p[0], y: c.p[1] })), L: () => L, startLevel, useProp, pickItem, hitTest, openLevels, openMenu, pauseGame, levelCfg, save: () => save, endWin, endFail };
})();
