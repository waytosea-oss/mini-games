// 星际雷霆 — 核心：画布、资源、存档、工具
'use strict';
const Q = new URLSearchParams(location.search);
const DEBUG = {
  level: +Q.get('level') || 0, god: Q.has('god'), bot: Q.has('bot'), boss: Q.has('boss'), unlock: Q.has('unlock'),
  ship: Q.get('ship'), evo: Q.get('evo'), power: Q.get('power'), coins: Q.get('coins'), mute: Q.has('mute'), fps: Q.has('fps'),
  t: +Q.get('t') || 0, reset: Q.has('reset'),
};
const TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a = 1, b) => b === undefined ? Math.random() * a : a + Math.random() * (b - a);
const rndi = (a, b) => Math.floor(rnd(a, b + 1));
const pick = (arr) => arr[(Math.random() * arr.length) | 0];
function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, w | 0); c.height = Math.max(1, h | 0); return c; }

// ---------- canvas ----------
const cv = document.getElementById('game');
const ctx = cv.getContext('2d', { alpha: false });
const wrap = document.getElementById('wrap');
let W = 360, H = 640, SC = 1, DPR = 1, CW = 360, CH = 640, safeTop = 0, safeBot = 0;
function resize() {
  const vw = window.innerWidth, vh = window.innerHeight;
  CW = Math.min(vw, Math.round(vh * 0.62)); CH = vh;
  DPR = Math.min(window.devicePixelRatio || 1, 2.5);
  W = 360; H = Math.round(360 * CH / CW);
  cv.width = Math.round(CW * DPR); cv.height = Math.round(CH * DPR);
  cv.style.width = CW + 'px'; cv.style.height = CH + 'px';
  wrap.style.width = CW + 'px'; wrap.style.height = CH + 'px';
  SC = cv.width / W;
  const probe = document.getElementById('safe');
  if (probe) { const cs = getComputedStyle(probe); safeTop = parseFloat(cs.paddingTop) * W / CW || 0; safeBot = parseFloat(cs.paddingBottom) * W / CW || 0; }
  document.documentElement.style.setProperty('--u', (CW / 360) + 'px');
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 200));

// ---------- assets ----------
const IMG = {};
const ASSET_LIST = ['title.jpg', 'bg1.jpg', 'bg2.jpg', 'bg3.jpg', 'bg4.jpg', 'bg5.jpg',
  'boss1.png', 'boss2.png', 'boss3.png', 'boss4.png', 'boss5.png'];
['falcon', 'lancer', 'viper'].forEach(s => [0, 1, 2].forEach(i => ASSET_LIST.push(`ship_${s}_${i}.png`)));
for (let s = 1; s <= 5; s++) for (let i = 0; i < 4; i++) ASSET_LIST.push(`e${s}_${i}.png`);
function loadAssets(onProg) {
  let done = 0;
  const fontP = (window.FontFace ? new FontFace('PS2P', 'url(assets/ps2p.woff)').load().then(f => { document.fonts.add(f); }).catch(() => {}) : Promise.resolve());
  return Promise.all([fontP, ...ASSET_LIST.map(n => new Promise((res) => {
    const im = new Image();
    im.onload = () => { IMG[n.replace(/\.(png|jpg)$/, '')] = im; done++; onProg(done / ASSET_LIST.length); res(); };
    im.onerror = () => { console.warn('asset fail', n); done++; res(); };
    im.src = 'assets/' + n;
  }))]);
}

// ---------- image processing ----------
function whiteOf(img, col = '#fff') {
  const c = mkCanvas(img.width, img.height), x = c.getContext('2d');
  x.drawImage(img, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = col; x.fillRect(0, 0, c.width, c.height);
  return c;
}
function recolor(img, o) {
  const c = mkCanvas(img.width, img.height), x = c.getContext('2d');
  x.drawImage(img, 0, 0);
  if (!o || (!o.hue && !o.tint && !o.bri)) return c;
  const d = x.getImageData(0, 0, c.width, c.height), p = d.data;
  const a = (o.hue || 0) * Math.PI / 180, co = Math.cos(a), si = Math.sin(a);
  const m = [0.213 + co * 0.787 - si * 0.213, 0.715 - co * 0.715 - si * 0.715, 0.072 - co * 0.072 + si * 0.928,
    0.213 - co * 0.213 + si * 0.143, 0.715 + co * 0.285 + si * 0.140, 0.072 - co * 0.072 - si * 0.283,
    0.213 - co * 0.213 - si * 0.787, 0.715 - co * 0.715 + si * 0.715, 0.072 + co * 0.928 + si * 0.072];
  const sat = o.sat || 1, bri = o.bri || 1, tk = o.tintK || 0, tc = o.tint || [1, 1, 1];
  for (let i = 0; i < p.length; i += 4) {
    if (!p[i + 3]) continue;
    let r = p[i], g = p[i + 1], b = p[i + 2];
    let R = r * m[0] + g * m[1] + b * m[2], G = r * m[3] + g * m[4] + b * m[5], B = r * m[6] + g * m[7] + b * m[8];
    const L = 0.3 * R + 0.59 * G + 0.11 * B;
    R = L + (R - L) * sat; G = L + (G - L) * sat; B = L + (B - L) * sat;
    if (tk) { R = R * (1 - tk) + L * tc[0] * tk; G = G * (1 - tk) + L * tc[1] * tk; B = B * (1 - tk) + L * tc[2] * tk; }
    p[i] = R * bri; p[i + 1] = G * bri; p[i + 2] = B * bri;
  }
  x.putImageData(d, 0, 0);
  return c;
}
function orb(col, r, opt = {}) {
  const s = Math.ceil(r * 2 * 2.4) + 2, c = mkCanvas(s * 2, s * 2), x = c.getContext('2d'), h = s;
  x.scale(2, 2);
  const g = x.createRadialGradient(h / 2, h / 2, 0, h / 2, h / 2, h / 2);
  g.addColorStop(0, col); g.addColorStop(0.4, col + 'aa'); g.addColorStop(1, col + '00');
  x.fillStyle = g; x.fillRect(0, 0, h, h);
  x.fillStyle = opt.ring || col; x.beginPath(); x.arc(h / 2, h / 2, r, 0, TAU); x.fill();
  x.fillStyle = '#fff'; x.beginPath(); x.arc(h / 2, h / 2, r * 0.58, 0, TAU); x.fill();
  return { c, s: h };
}
function needle(col, w, l) {
  const s = Math.ceil(l * 1.6), c = mkCanvas(s * 2, s * 2), x = c.getContext('2d'), h = s;
  x.scale(2, 2); x.translate(h / 2, h / 2);
  const g = x.createRadialGradient(0, 0, 0, 0, 0, h / 2); g.addColorStop(0, col + 'cc'); g.addColorStop(1, col + '00');
  x.fillStyle = g; x.beginPath(); x.ellipse(0, 0, l * 0.8, w * 1.4, 0, 0, TAU); x.fill();
  x.fillStyle = col; x.beginPath(); x.ellipse(0, 0, l / 2, w / 2, 0, 0, TAU); x.fill();
  x.fillStyle = '#fff'; x.beginPath(); x.ellipse(0, 0, l / 2 * 0.7, w / 2 * 0.5, 0, 0, TAU); x.fill();
  return { c, s: h };
}
function softGlow(col, s = 64) {
  const c = mkCanvas(s, s), x = c.getContext('2d');
  const g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, col); g.addColorStop(0.3, col + '88'); g.addColorStop(1, col + '00');
  x.fillStyle = g; x.fillRect(0, 0, s, s); return c;
}
// pixel explosion frames
function genExplosion(seed, N, S, palette) {
  const R = mulberry(seed), blobs = [];
  for (let i = 0; i < 16; i++) blobs.push({ a: R() * TAU, d: R() * 0.32, r: 0.12 + R() * 0.16, v: 0.6 + R() * 0.7 });
  const frames = [];
  const pal = palette || ['#ffffff', '#fff6b0', '#ffd23f', '#ff9a1f', '#f25a1d', '#b8321c', '#5a2a2a', '#2e2230'];
  for (let f = 0; f < N; f++) {
    const t = f / (N - 1), c = mkCanvas(S, S), x = c.getContext('2d');
    const e = 1 - Math.pow(1 - t, 2.2);
    for (let pass = 0; pass < 3; pass++) {
      for (const b of blobs) {
        const dist = b.d * e * b.v * S + (pass == 0 ? 0 : 0);
        const cx = S / 2 + Math.cos(b.a) * dist, cy = S / 2 + Math.sin(b.a) * dist - t * S * 0.06;
        let rr = S * b.r * (0.5 + e * 0.9) * (pass == 0 ? 1 : pass == 1 ? 0.68 : 0.36);
        const life = t * 1.25 + (pass == 0 ? 0.15 : pass == 1 ? 0.05 : -0.05) + b.d * 0.4;
        if (t > 0.6) rr *= 1 - (t - 0.6) * 1.6;
        if (rr <= 0.4) continue;
        const ci = clamp(Math.floor(life * pal.length), 0, pal.length - 1);
        x.fillStyle = pal[ci];
        x.beginPath(); x.arc(cx, cy, rr, 0, TAU); x.fill();
      }
    }
    // hard pixel alpha
    const d = x.getImageData(0, 0, S, S), p = d.data;
    for (let i = 3; i < p.length; i += 4) p[i] = p[i] > 110 ? 255 : 0;
    x.putImageData(d, 0, 0);
    frames.push(c);
  }
  return frames;
}

// ---------- save ----------
const SAVE_KEY = 'starthunder_save_v1';
const DEFAULT_SAVE = () => ({ coins: 0, maxLevel: 1, stars: {}, best: {}, hi: 0,
  ships: { falcon: { own: true, evo: 0 }, lancer: { own: false, evo: 0 }, viper: { own: false, evo: 0 } },
  sel: 'falcon', up: { life: 0, bomb: 0, pow: 0 }, music: true, sfx: true, seenTut: false });
let SAVE = DEFAULT_SAVE();
function loadSave() {
  try { if (DEBUG.reset) localStorage.removeItem(SAVE_KEY);
    const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); if (s) SAVE = Object.assign(DEFAULT_SAVE(), s); } catch (e) {}
  if (DEBUG.unlock) { SAVE.maxLevel = 25; Object.values(SAVE.ships).forEach(s => s.own = true); }
  if (DEBUG.coins) SAVE.coins = +DEBUG.coins;
  if (DEBUG.ship && SAVE.ships[DEBUG.ship]) { SAVE.sel = DEBUG.ship; SAVE.ships[DEBUG.ship].own = true; }
  if (DEBUG.evo) SAVE.ships[SAVE.sel].evo = clamp(+DEBUG.evo, 0, 2);
}
function writeSave() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(SAVE)); } catch (e) {} }

// ---------- data ----------
const SECTORS = [
  { name: '海盗星域', en: 'PIRATE NEBULA', boss: '掠夺者母舰', col: '#b47cff', music: ['stageA', 0], dark: 0.12 },
  { name: '陨石风暴带', en: 'ASTEROID STORM', boss: '熔岩巨像', col: '#ff9a3c', music: ['stageB', 0], dark: 0.1 },
  { name: '冰晶星云', en: 'CRYSTAL NEBULA', boss: '冰晶女王', col: '#6fe3ff', music: ['stageC', 0], dark: 0.22 },
  { name: '钢铁要塞', en: 'IRON FORTRESS', boss: '泰坦要塞', col: '#ffc23c', music: ['stageA', 2], dark: 0.38 },
  { name: '虫巢深渊', en: 'HIVE ABYSS', boss: '虫巢母皇', col: '#ff4b6e', music: ['stageB', -2], dark: 0.12 },
];
const SHIPS = [
  { id: 'falcon', name: '疾风号', en: 'FALCON', style: '散射型', col: '#4fd8ff', price: 0, evoCost: [0, 500, 1500],
    desc: '扇形散射弹幕，覆盖面广，攻守兼备的新手首选。', stats: [[2, 4, 4], [3, 5, 4], [4, 6, 5]] },
  { id: 'lancer', name: '赤霄号', en: 'LANCER', style: '激光型', col: '#ff4b6e', price: 800, evoCost: [0, 700, 2000],
    desc: '聚焦贯穿激光，单体伤害最强，专克巨型敌舰。', stats: [[4, 1, 3], [5, 2, 3], [6, 3, 4]] },
  { id: 'viper', name: '翠影号', en: 'VIPER', style: '追踪型', col: '#9dff4a', price: 1500, evoCost: [0, 900, 2400],
    desc: '自动追踪导弹蜂群，无需瞄准，灵活机动。', stats: [[3, 3, 5], [4, 4, 5], [5, 5, 6]] },
];
const EVO_NAMES = ['MK-I', 'MK-II', 'MK-III'];
const UPGRADES = [
  { id: 'life', name: '机体装甲', desc: '初始生命 +1', max: 2, cost: [400, 1200] },
  { id: 'bomb', name: '炸弹仓', desc: '初始炸弹 +1', max: 2, cost: [300, 900] },
  { id: 'pow', name: '火控系统', desc: '初始火力 +1', max: 2, cost: [500, 1500] },
];
const TIER_FX = [null,
  { hue: 55, sat: 1.15, tint: [0.7, 1.05, 1.35], tintK: 0.28, bri: 1.05 },
  { hue: -75, sat: 1.25, tint: [1.45, 0.62, 0.55], tintK: 0.32, bri: 1.05 },
  { hue: 150, sat: 1.3, tint: [1.45, 1.15, 0.42], tintK: 0.36, bri: 1.1 }];
const TIER_SCALE = [1, 1.1, 1.2, 1.32];
