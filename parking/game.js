/* ===== 快挪车！· 停车场大堵车 —— 主逻辑 ===== */
(() => {
'use strict';
const Q = new URLSearchParams(location.search);
const DEBUG = { level: +Q.get('level') || 0, bot: Q.has('bot'), unlock: Q.has('unlock'), speed: +Q.get('speed') || 1, notut: Q.has('notut') };
const $ = id => document.getElementById(id);
const DIRS = LV.DIRS, NLV = LV.COUNT;
const SKEY = 'kuainuoche_v1';
let save = { unlocked: 1, stars: {}, best: {}, props: { tow: 2, shuffle: 2, flip: 2, hint: 3 }, coins: 120, music: true, sfx: true, seen: {}, cleared: 0 };
try { const s = JSON.parse(localStorage.getItem(SKEY)); if (s && s.props) save = Object.assign(save, s); } catch (e) { }
const persist = () => { try { localStorage.setItem(SKEY, JSON.stringify(save)); } catch (e) { } };
if (DEBUG.unlock) save.unlocked = NLV;
const PRICE = { tow: 120, shuffle: 80, flip: 60, hint: 40 };
const PNAME = { tow: '拖车', shuffle: '重新停放', flip: '掉头', hint: '小提示' };
/* ---------- 资源 ---------- */
const KINDS2 = ['sedan', 'taxi', 'suv', 'police', 'icecream', 'beetle', 'sports', 'ambulance'], KINDS3 = ['bus', 'firetruck', 'boxtruck'], KINDS1 = ['micro', 'scooter'];
const OBS = ['cone', 'bollard', 'tree', 'bush', 'planter', 'barrel'];
const IMGS = {}; const LIST = [...KINDS2, ...KINDS3, ...KINDS1, ...OBS, 'clamp', 'mascot', 'ic_tow', 'ic_shuffle', 'ic_flip', 'ic_hint'].map(n => [n, 'assets/' + n + '.webp']).concat([['bg', 'assets/bg.jpg']]);
function loadAll(cb) {
  let done = 0;
  for (const [n, src] of LIST) {
    const im = new Image(); im.onload = im.onerror = () => { done++; $('lbar').style.width = (done / LIST.length * 100) + '%'; if (done === LIST.length) cb(); }; im.src = src; IMGS[n] = im;
  }
}
/* ---------- 画布 ---------- */
const cv = $('cv'), ctx = cv.getContext('2d');
let W = 0, H = 0, DPR = 1, SAFE_T = 0, SAFE_B = 0;
const safeEl = document.createElement('div'); safeEl.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom);visibility:hidden;pointer-events:none'; document.body.appendChild(safeEl);
function mk(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }
function resize() {
  W = window.innerWidth; H = window.innerHeight; DPR = Math.min(2, window.devicePixelRatio || 1);
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  const cs = getComputedStyle(safeEl); SAFE_T = parseFloat(cs.paddingTop) || 0; SAFE_B = parseFloat(cs.paddingBottom) || 0;
  bgCache = null; if (G.lv) layout();
}
/* ---------- 游戏状态 ---------- */
const G = window.G = { state: 'menu', lv: null, n: 1, cars: [], obs: [], occ: null, tickets: 0, maxTk: 3, removed: 0, total: 0, time: 0, combo: 0, lastExit: -9, maxCombo: 0, fx: [], texts: [], marks: [], shake: 0, mode: null, fps: 60, revived: false, propsUsed: 0, stuckWarned: false, tut: 0, hintCar: null, winT: 0, failT: 0 };
let L = { c: 40, ox: 0, oy: 0 };
let bgCache = null, boardCache = null, sprites = {};
function layout() {
  const lv = G.lv; const top = SAFE_T + 104, bot = SAFE_B + 108;
  const avW = W - 16, avH = H - top - bot;
  const c = Math.floor(Math.min(avW / (lv.C + .55), avH / (lv.R + .55), 66));
  L = { c, ox: Math.round((W - lv.C * c) / 2), oy: Math.round(top + (avH - lv.R * c) / 2), top, bot };
  buildSprites(); buildBoard(); bgCache = null;
}
/* 精灵缓存：按格子大小预缩放 + 柔和投影 */
function buildSprites() {
  sprites = {}; const c = L.c;
  const make = (name, maxL, maxW) => {
    const im = IMGS[name]; if (!im || !im.naturalWidth) return;
    const s = Math.min(maxL / im.naturalHeight, maxW / im.naturalWidth);
    const w = im.naturalWidth * s, h = im.naturalHeight * s;
    const cnv = mk(w * DPR, h * DPR), x = cnv.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(im, 0, 0, cnv.width, cnv.height);
    // 投影：剪影缩小再放大 = 低成本高斯
    const sm = mk(cnv.width / 6 + 4, cnv.height / 6 + 4), sx = sm.getContext('2d'); sx.drawImage(cnv, 2, 2, cnv.width / 6, cnv.height / 6); sx.globalCompositeOperation = 'source-in'; sx.fillStyle = '#0a2a10'; sx.fillRect(0, 0, sm.width, sm.height);
    const pad = 10 * DPR, sh = mk(cnv.width + pad * 2, cnv.height + pad * 2), shx = sh.getContext('2d'); shx.imageSmoothingQuality = 'high'; shx.drawImage(sm, pad - 2 * 6, pad - 2 * 6, sm.width * 6, sm.height * 6);
    sprites[name] = { cnv, w, h, sh, pad: pad / DPR };
  };
  for (const k of KINDS2) make(k, c * 1.84, c * .9);
  for (const k of KINDS3) make(k, c * 2.84, c * .96);
  for (const k of KINDS1) make(k, c * .9, c * .84);
  for (const k of OBS) make(k, c * (k === 'tree' ? 1.08 : .86), c * (k === 'tree' ? 1.08 : .86));
  make('clamp', c * .5, c * .5);
}
function rrPath(p, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); p.moveTo(x + r, y); p.arcTo(x + w, y, x + w, y + h, r); p.arcTo(x + w, y + h, x, y + h, r); p.arcTo(x, y + h, x, y, r); p.arcTo(x, y, x + w, y, r); p.closePath(); }
function buildBoard() {
  const lv = G.lv, c = L.c, pad = c * .6, C = lv.C, R = lv.R;
  const cnv = mk((C * c + pad * 2) * DPR, (R * c + pad * 2) * DPR), x = cnv.getContext('2d');
  x.scale(DPR, DPR); x.translate(pad, pad);
  const k = c * .2, curb = new Path2D(), asph = new Path2D();
  const m = (i, j) => i >= 0 && j >= 0 && i < C && j < R && lv.mask[j * C + i];
  for (let j = 0; j < R; j++) for (let i = 0; i < C; i++) if (m(i, j)) {
    rrPath(curb, i * c - k, j * c - k, c + k * 2, c + k * 2, k * 1.6);
    // 沥青：外角圆、内部无缝
    const r0 = c * .16; const l = !m(i - 1, j), rr = !m(i + 1, j), t = !m(i, j - 1), b = !m(i, j + 1);
    const x0 = i * c - .5, y0 = j * c - .5, w = c + 1, h = c + 1;
    asph.moveTo(x0 + (l && t ? r0 : 0), y0);
    if (rr && t) { asph.lineTo(x0 + w - r0, y0); asph.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + r0); } else asph.lineTo(x0 + w, y0);
    if (rr && b) { asph.lineTo(x0 + w, y0 + h - r0); asph.quadraticCurveTo(x0 + w, y0 + h, x0 + w - r0, y0 + h); } else asph.lineTo(x0 + w, y0 + h);
    if (l && b) { asph.lineTo(x0 + r0, y0 + h); asph.quadraticCurveTo(x0, y0 + h, x0, y0 + h - r0); } else asph.lineTo(x0, y0 + h);
    if (l && t) { asph.lineTo(x0, y0 + r0); asph.quadraticCurveTo(x0, y0, x0 + r0, y0); } else asph.lineTo(x0, y0);
    asph.closePath();
  }
  x.save(); x.shadowColor = 'rgba(10,50,10,.5)'; x.shadowBlur = c * .4 * DPR; x.shadowOffsetY = c * .14 * DPR; x.fillStyle = '#c9d0d8'; x.fill(curb); x.restore();
  let g = x.createLinearGradient(0, -k, 0, R * c + k); g.addColorStop(0, '#f4f6f8'); g.addColorStop(1, '#c4ccd5'); x.fillStyle = g; x.fill(curb);
  x.save(); x.translate(0, k * .35); x.fillStyle = '#9aa5b1'; x.fill(asph); x.restore();
  g = x.createLinearGradient(0, 0, 0, R * c); g.addColorStop(0, '#666d7a'); g.addColorStop(1, '#4f5562'); x.fillStyle = g; x.fill(asph);
  // 沥青颗粒
  x.save(); x.clip(asph);
  let sd = 1234; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < C * R * 26; i++) { const px = rnd() * C * c, py = rnd() * R * c, s = rnd() * 1.6 + .4; x.fillStyle = rnd() < .5 ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.1)'; x.fillRect(px, py, s, s); }
  // 油渍
  for (let i = 0; i < C * R / 6; i++) { const px = rnd() * C * c, py = rnd() * R * c; const rg = x.createRadialGradient(px, py, 0, px, py, c * .35); rg.addColorStop(0, 'rgba(20,22,30,.22)'); rg.addColorStop(1, 'rgba(20,22,30,0)'); x.fillStyle = rg; x.fillRect(px - c, py - c, c * 2, c * 2); }
  // 车位线
  x.lineCap = 'round';
  for (let j = 0; j < R; j++) for (let i = 0; i < C; i++) if (m(i, j)) {
    x.strokeStyle = 'rgba(255,255,255,.55)'; x.lineWidth = Math.max(1.5, c * .045);
    if (m(i + 1, j)) { x.beginPath(); x.moveTo((i + 1) * c, j * c + c * .16); x.lineTo((i + 1) * c, j * c + c * .84); x.stroke(); }
    x.strokeStyle = 'rgba(255,255,255,.3)';
    if (m(i, j + 1)) { x.beginPath(); x.moveTo(i * c + c * .22, (j + 1) * c); x.lineTo(i * c + c * .78, (j + 1) * c); x.stroke(); }
    if (rnd() < .1) { x.fillStyle = 'rgba(255,255,255,.16)'; x.font = `900 ${c * .5}px sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('P', i * c + c / 2, j * c + c / 2 + 1); }
  }
  // 内圈黄线（沿外缘）
  x.restore();
  x.save(); x.strokeStyle = '#ffd23f'; x.lineWidth = Math.max(2, c * .06); x.setLineDash([c * .22, c * .14]);
  for (let j = 0; j < R; j++) for (let i = 0; i < C; i++) if (m(i, j)) {
    const e = c * .07;
    if (!m(i, j - 1)) { x.beginPath(); x.moveTo(i * c + (m(i - 1, j) ? 0 : e), j * c + e); x.lineTo(i * c + c - (m(i + 1, j) ? 0 : e), j * c + e); x.stroke(); }
    if (!m(i, j + 1)) { x.beginPath(); x.moveTo(i * c + (m(i - 1, j) ? 0 : e), j * c + c - e); x.lineTo(i * c + c - (m(i + 1, j) ? 0 : e), j * c + c - e); x.stroke(); }
    if (!m(i - 1, j)) { x.beginPath(); x.moveTo(i * c + e, j * c + (m(i, j - 1) ? 0 : e)); x.lineTo(i * c + e, j * c + c - (m(i, j + 1) ? 0 : e)); x.stroke(); }
    if (!m(i + 1, j)) { x.beginPath(); x.moveTo(i * c + c - e, j * c + (m(i, j - 1) ? 0 : e)); x.lineTo(i * c + c - e, j * c + c - (m(i, j + 1) ? 0 : e)); x.stroke(); }
  }
  x.restore();
  // 障碍格：黄黑斜纹
  for (const o of G.obs) {
    x.save(); const p = new Path2D(); rrPath(p, o.x * c + c * .08, o.y * c + c * .08, c * .84, c * .84, c * .12); x.clip(p);
    x.fillStyle = '#ffcc1a'; x.fillRect(o.x * c, o.y * c, c, c); x.strokeStyle = '#2b2b2b'; x.lineWidth = c * .1;
    for (let d = -c; d < c * 2; d += c * .28) { x.beginPath(); x.moveTo(o.x * c + d, o.y * c); x.lineTo(o.x * c + d - c, o.y * c + c); x.stroke(); }
    x.restore(); x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(o.x * c + c * .08, o.y * c + c * .84, c * .84, c * .08);
  }
  boardCache = { cnv, pad };
}
function buildBg() {
  bgCache = mk(W * DPR, H * DPR); const x = bgCache.getContext('2d');
  const im = IMGS.bg; const s = Math.max(W / im.naturalWidth, H / im.naturalHeight);
  const w = im.naturalWidth * s, h = im.naturalHeight * s;
  x.scale(DPR, DPR); x.drawImage(im, (W - w) / 2, (H - h) / 2, w, h);
  // 顶/底轻微压暗，HUD 更清楚
  let g = x.createLinearGradient(0, 0, 0, SAFE_T + 110); g.addColorStop(0, 'rgba(10,40,80,.35)'); g.addColorStop(1, 'rgba(10,40,80,0)'); x.fillStyle = g; x.fillRect(0, 0, W, SAFE_T + 110);
  g = x.createLinearGradient(0, H - SAFE_B - 120, 0, H); g.addColorStop(0, 'rgba(10,40,80,0)'); g.addColorStop(1, 'rgba(10,40,80,.35)'); x.fillStyle = g; x.fillRect(0, H - SAFE_B - 120, W, SAFE_B + 120);
}
/* ---------- 关卡 ---------- */
function vCenter(v) { const [dx, dy] = DIRS[v.d]; const k = (v.len - 1) / 2; return [v.x - dx * k, v.y - dy * k]; }
function vScreen(v) { const [cx, cy] = vCenter(v); const [dx, dy] = DIRS[v.d]; return [L.ox + (cx + .5) * L.c + dx * v.off * L.c, L.oy + (cy + .5) * L.c + dy * v.off * L.c]; }
const angOf = v => v.d * Math.PI / 2;
function startLevel(n) {
  n = Math.max(1, Math.min(NLV, n)); G.n = n; try{GT.lv(n)}catch(_e){}
  const lv = LV.generate(n); G.lv = lv;
  G.cars = lv.cars.map(c => ({ ...c, cells: c.cells.map(p => p.slice()), off: 0, state: 'park', t: 0, shake: 0, ang: c.d * Math.PI / 2, spin: null, idle: Math.random() * 6, scale: 1, hint: 0 }));
  G.obs = lv.obs.map(o => ({ ...o, kind: OBS[o.k % OBS.length], shake: 0 }));
  G.occ = new Int16Array(lv.C * lv.R); for (const o of G.obs) G.occ[o.y * lv.C + o.x] = -1; for (const v of G.cars) for (const [a, b] of v.cells) G.occ[b * lv.C + a] = v.id;
  G.total = G.cars.length; G.removed = 0; G.tickets = 0; G.maxTk = lv.tickets; G.time = 0; G.combo = 0; G.maxCombo = 0; G.lastExit = -9;
  G.fx = []; G.texts = []; G.marks = []; G.shake = 0; G.mode = null; G.revived = false; G.propsUsed = 0; G.stuckWarned = false; G.hintCar = null; G.winT = 0; G.failT = 0;
  G.tut = (n === 1 && !DEBUG.notut && !DEBUG.bot) ? 1 : 0;
  G.state = 'play'; layout();
  showScr(null); $('hud').classList.add('on'); $('props').classList.add('on'); setMode(null);
  $('hLv').textContent = `第 ${n} 关`; $('hName').textContent = lv.name; updHud(); updProps();
  $('tut').classList.remove('on');
  // 新元素介绍
  const feat = FEATS[n];
  if (feat && !save.seen['f' + n] && !DEBUG.bot) { save.seen['f' + n] = 1; persist(); showFeat(feat); }
  else if (G.tut) tutStep();
  SND.play('whistle');
}
const FEATS = {
  3: { t: '道具来帮忙', imgs: ['ic_tow', 'ic_shuffle', 'ic_flip', 'ic_hint'], d: '<b>拖车</b>：直接拖走任意一辆车<br><b>重新停放</b>：所有车重新换个朝向（保证有解）<br><b>掉头</b>：让一辆车调转方向<br><b>小提示</b>：告诉你现在能开走哪辆' },
  4: { t: '大车驾到', imgs: ['bus', 'firetruck', 'boxtruck'], d: '校车、消防车、货车占 <b>3 格</b><br>块头大，挡路也更多，优先给它们腾地方！' },
  7: { t: '路障出没', imgs: ['cone', 'bollard', 'tree'], d: '雪糕筒、路桩、树木<b>永远挪不走</b><br>车头对着它们的车，要想办法换方向' },
  10: { t: '倒车出库', imgs: [], d: '车顶是<b>橙色箭头</b>的车会<b>倒着开</b>出去<br>看箭头，别看车头！', rev: true },
  14: { t: '车轮锁', imgs: ['clamp'], d: '被锁住的车动不了<br>车上数字 = 还要<b>先挪走几辆车</b>才会解锁' },
};
/* ---------- 交互 ---------- */
function carAt(px, py) {
  const lv = G.lv, c = L.c; const i = Math.floor((px - L.ox) / c), j = Math.floor((py - L.oy) / c);
  const look = (a, b) => (a >= 0 && b >= 0 && a < lv.C && b < lv.R) ? G.occ[b * lv.C + a] : 0;
  let id = look(i, j);
  if (id <= 0) { // 容错：点在缝隙处找最近的
    let best = null, bd = c * .45;
    for (const v of G.cars) { if (v.state === 'gone') continue; for (const [a, b] of v.cells) { const d = Math.hypot(L.ox + (a + .5) * c - px, L.oy + (b + .5) * c - py) - c * .5; if (d < bd) { bd = d; best = v; } } }
    return best && best.state === 'park' ? best : null;
  }
  return G.cars.find(v => v.id === id && v.state === 'park') || null;
}
function pathInfo(v) {
  const lv = G.lv; const [dx, dy] = DIRS[v.d]; let x = v.x + dx, y = v.y + dy, n = 0;
  while (x >= 0 && y >= 0 && x < lv.C && y < lv.R) { const o = G.occ[y * lv.C + x]; if (o) return { n, block: o, bx: x, by: y }; x += dx; y += dy; n++; }
  return { n, block: 0 };
}
const movable = v => v.state === 'park' && v.clamp <= 0 && !pathInfo(v).block;
function onDown(e) {
  if (G.state !== 'play') return;
  const px = e.clientX, py = e.clientY; const v = carAt(px, py);
  if (G.mode) { if (v) usePropOn(G.mode, v); return; }
  if (!v) return;
  tapCar(v);
}
cv.addEventListener('pointerdown', e => { e.preventDefault(); onDown(e); });
function tapCar(v) {
  if (v.clamp > 0) { v.shake = .4; SND.play('locked'); toast(`车轮锁住了：再挪走 ${v.clamp} 辆车解锁`); return; }
  const p = pathInfo(v); const lv = G.lv;
  v.t = 0; v.scale = 1.08;
  if (!p.block) {
    for (const [a, b] of v.cells) G.occ[b * lv.C + a] = 0;
    v.state = 'go'; v.spd = 4; SND.play('go', v.len); if (Math.random() < .45) setTimeout(() => SND.play('honk', .9 + Math.random() * .3), 120);
    const [sx, sy] = vScreen(v); const [dx, dy] = DIRS[v.d]; const back = v.len * L.c * .45 * (v.rev ? 1 : -1);
    for (let i = 0; i < 2; i++) puff(sx + dx * back + (Math.random() - .5) * L.c * .3, sy + dy * back + (Math.random() - .5) * L.c * .3, -dx * (v.rev ? -1 : 1), -dy * (v.rev ? -1 : 1));
    G.marks.push({ x: sx - dx * v.len * L.c * .3, y: sy - dy * v.len * L.c * .3, d: v.d, len: v.len, life: 1.6, w: L.c * .55 });
    // 计数 & 连击
    G.removed++; onRemoved();
    if (G.time - G.lastExit < 1.5) G.combo++; else G.combo = 1; G.lastExit = G.time; G.maxCombo = Math.max(G.maxCombo, G.combo);
    if (G.combo >= 2) { SND.play('combo', G.combo); G.texts = G.texts.filter(t => !t.combo); const t = { s: G.combo >= 8 ? `超神连挪 ×${G.combo}！` : G.combo >= 5 ? `疯狂连挪 ×${G.combo}！` : `连挪 ×${G.combo}`, x: W / 2, y: L.oy - 18, col: G.combo >= 8 ? '#ff5aa8' : G.combo >= 5 ? '#7dffb0' : '#ffd23f', sc: 1 + Math.min(.45, G.combo * .05), life: 1.1, max: 1.1, combo: 1 }; G.texts.push(t); }
    if (G.tut === 1) { G.tut = 2; tutStep(); } else if (G.tut === 2 && G.removed >= 3) { G.tut = 3; tutStep(); }
  } else {
    v.state = 'bump'; v.phase = 0; v.target = Math.max(.12, p.n + (p.n ? .12 : 0)); v.blocker = p.block; v.bx = p.bx; v.by = p.by;
    SND.play('go', v.len);
  }
  G.hintCar = null;
}
function onRemoved() {
  for (const v of G.cars) if (v.clamp > 0 && v.state === 'park') { v.clamp--; if (v.clamp === 0) { const [x, y] = vScreen(v); SND.play('unlock'); floatText('解锁！', x, y, '#7dffb0', 1); burst(x, y, '#ffd23f', 12); v.scale = 1.15; } }
  updHud();
}
function impact(v) {
  const [sx, sy] = vScreen(v); const [dx, dy] = DIRS[v.d]; const fx = sx + dx * v.len * L.c * .46, fy = sy + dy * v.len * L.c * .46;
  SND.play('bump'); SND.play('angry'); G.shake = .35;
  for (let i = 0; i < 10; i++) { const a = Math.random() * Math.PI * 2, s = 60 + Math.random() * 160; G.fx.push({ t: 'spark', x: fx, y: fy, vx: Math.cos(a) * s - dx * 60, vy: Math.sin(a) * s - dy * 60, life: .35 + Math.random() * .2, max: .5 }); }
  G.fx.push({ t: 'ring', x: fx, y: fy, life: .3, max: .3 });
  G.fx.push({ t: 'angry', x: sx, y: sy - L.c * .9, life: 1.1, max: 1.1, ref: v });
  if (v.blocker > 0) { const b = G.cars.find(c => c.id === v.blocker); if (b) { b.shake = .5; G.fx.push({ t: 'angry2', x: 0, y: 0, life: .9, max: .9, ref: b }); } }
  else { const o = G.obs.find(o => o.x === v.bx && o.y === v.by); if (o) o.shake = .5; }
  G.tickets++; G.combo = 0; updHud(true);
  const tk = $('hTk').querySelectorAll('.tk')[G.tickets - 1];
  if (tk) { const r = tk.getBoundingClientRect(); G.fx.push({ t: 'ticket', x: fx, y: fy, x0: fx, y0: fy, x1: r.left + r.width / 2, y1: r.top + r.height / 2, life: .7, max: .7 }); }
  setTimeout(() => SND.play('ticket'), 650);
  floatText('罚单 +1', fx, fy - L.c * .3, '#ff5a4a', 1.05);
  if (G.tut === 2 || G.tut === 1) { G.tut = 9; tutStep(); }
}
/* ---------- 道具 ---------- */
function setMode(m) {
  G.mode = m; document.querySelectorAll('.prop').forEach(b => b.classList.toggle('act', b.dataset.p === m));
  if (m) { $('modeTxt').textContent = m === 'tow' ? '点一辆车，拖车把它拖走' : '点一辆车，让它掉个头'; $('mode').classList.add('on'); } else $('mode').classList.remove('on');
}
$('modeX').onclick = () => { SND.play('click'); setMode(null); };
const busy = () => G.cars.some(v => v.state === 'bump' || v.state === 'tow' || v.spin);
document.querySelectorAll('.prop').forEach(b => b.addEventListener('click', () => {
  if (G.state !== 'play') return; const p = b.dataset.p;
  if (save.props[p] <= 0) { openBuy(p); return; }
  SND.play('click');
  if (p === 'tow' || p === 'flip') { setMode(G.mode === p ? null : p); return; }
  setMode(null);
  if (p === 'shuffle') { if (busy()) { toast('等车都停稳再重新停放'); return; } if (doShuffle()) { save.props.shuffle--; G.propsUsed++; persist(); updProps(); } }
  if (p === 'hint') { if (doHint()) { save.props.hint--; G.propsUsed++; persist(); updProps(); } }
}));
function usePropOn(m, v) {
  if (m === 'tow') {
    for (const [a, b] of v.cells) G.occ[b * G.lv.C + a] = 0;
    v.state = 'tow'; v.t = 0; SND.play('tow'); G.removed++; onRemoved(); save.props.tow--; G.propsUsed++;
  } else if (m === 'flip') {
    if (v.spin) return;
    const from = v.ang; setDir(v, (v.d + 2) % 4); v.spin = { from, to: from + Math.PI, t: 0, dur: .45 }; SND.play('flip'); save.props.flip--; G.propsUsed++;
    const [x, y] = vScreen(v); for (let i = 0; i < 5; i++) puff(x + (Math.random() - .5) * L.c, y + (Math.random() - .5) * L.c, 0, 0);
  }
  persist(); updProps(); setMode(null);
}
function setDir(v, nd) {
  if (nd === v.d) return;
  if (v.len > 1 && nd === (v.d + 2) % 4) { v.cells.reverse(); v.x = v.cells[0][0]; v.y = v.cells[0][1]; }
  v.d = nd;
}
function doShuffle() {
  // 贪心：反复挑一辆“某个合法朝向能开出去”的车，随机定向并假装移走 → 必然得到一个可解的朝向分配
  const lv = G.lv, occ = G.occ.slice(); const left = G.cars.filter(v => v.state === 'park');
  if (!left.length) return false;
  const plan = new Map(); let removed = 0; let pool = left.slice();
  const clear = (v, d, len, cells) => { const head = (len > 1 && d === (v.d + 2) % 4) ? cells[cells.length - 1] : cells[0]; const [dx, dy] = DIRS[d]; let x = head[0] + dx, y = head[1] + dy; while (x >= 0 && y >= 0 && x < lv.C && y < lv.R) { if (occ[y * lv.C + x]) return false; x += dx; y += dy; } return true; };
  while (pool.length) {
    const cands = [];
    for (const v of pool) { if (v.clamp > removed) continue; const opts = v.len === 1 ? [0, 1, 2, 3] : [v.d, (v.d + 2) % 4]; const ok = opts.filter(d => clear(v, d, v.len, v.cells)); if (ok.length) cands.push([v, ok]); }
    if (!cands.length) { toast('障碍太多，重新停放也救不了，试试拖车'); return false; }
    const [v, ok] = cands[Math.floor(Math.random() * cands.length)]; const d = ok[Math.floor(Math.random() * ok.length)];
    plan.set(v, d); for (const [a, b] of v.cells) occ[b * lv.C + a] = 0; pool = pool.filter(x => x !== v); removed++;
  }
  SND.play('shuffle');
  for (const [v, d] of plan) { const from = v.ang; setDir(v, d); let to = v.d * Math.PI / 2; while (to < from + Math.PI * 2 - .01) to += Math.PI * 2; v.spin = { from, to, t: -Math.random() * .15, dur: .7 }; }
  G.stuckWarned = false; return true;
}
function doHint() {
  const cand = G.cars.filter(movable);
  if (!cand.length) { toast('现在没有能直接开走的车，试试「重新停放」'); return false; }
  // 优先：能放出最多被挡车辆的
  G.hintCar = cand[Math.floor(Math.random() * Math.min(3, cand.length))]; G.hintCar.hint = 3.5; SND.play('hint'); return true;
}
function openBuy(p) {
  SND.play('click'); $('byImg').src = 'assets/ic_' + p + '.webp'; $('byTitle').textContent = '补充「' + PNAME[p] + '」';
  const ok = save.coins >= PRICE[p];
  $('byInfo').innerHTML = `「${PNAME[p]}」用完啦<br>花 <b>${PRICE[p]}</b> 金币买 1 个？<br>（你有 <b>${save.coins}</b> 金币）`;
  $('byYes').style.display = ok ? '' : 'none'; if (!ok) $('byInfo').innerHTML += '<br>金币不够，过关可以赚金币哦';
  G.buyP = p; G.prevState = G.state; G.state = 'buy'; showScr('buy');
}
$('byNo').onclick = () => { SND.play('click'); showScr(null); G.state = 'play'; };
$('byYes').onclick = () => { const p = G.buyP; if (save.coins >= PRICE[p]) { save.coins -= PRICE[p]; save.props[p]++; persist(); SND.play('coin'); } showScr(null); G.state = 'play'; updProps(); updHud(); };
/* ---------- HUD ---------- */
const TK_ON = '<svg class="tk used" viewBox="0 0 22 26"><path d="M2 2h18v22l-3-2-3 2-3-2-3 2-3-2-3 2z" fill="#ff5a4a" stroke="#9a1e10" stroke-width="1.6" stroke-linejoin="round"/><text x="11" y="15.5" font-size="10" font-weight="900" fill="#fff" text-anchor="middle" font-family="sans-serif">罚</text></svg>';
const TK_OFF = '<svg class="tk" viewBox="0 0 22 26"><path d="M2 2h18v22l-3-2-3 2-3-2-3 2-3-2-3 2z" fill="#eef3f8" stroke="#9fb2c6" stroke-width="1.6" stroke-dasharray="3 2" stroke-linejoin="round"/></svg>';
function updHud(tkAnim) {
  let s = '<span style="margin-right:2px">罚单</span>'; for (let i = 0; i < G.maxTk; i++) s += i < G.tickets ? TK_ON : TK_OFF; $('hTk').innerHTML = s;
  const left = G.cars.filter(v => v.state === 'park' || v.state === 'bump').length;
  $('hLeft').textContent = `剩 ${left} 辆`; $('hBar').style.width = ((G.total - left) / Math.max(1, G.total) * 100) + '%';
  $('hCoins').textContent = save.coins;
}
function updProps() { document.querySelectorAll('.prop').forEach(b => { const n = save.props[b.dataset.p]; const em = b.querySelector('em'); em.textContent = n > 0 ? n : '+'; em.classList.toggle('buy', n <= 0); }); }
let toastT = 0; function toast(s, ms = 1600) { const t = $('toast'); t.textContent = s; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), ms); }
/* ---------- 教程 ---------- */
function tutStep() {
  const t = $('tut'), x = $('tutTxt');
  if (G.tut === 1) { x.innerHTML = '欢迎来到停车场！<b>点一下</b>发光的车，<br>它会朝<b>箭头方向</b>开走～'; t.classList.add('on'); const v = G.cars.find(movable); G.hintCar = v; if (v) v.hint = 999; }
  else if (G.tut === 2) { x.innerHTML = '漂亮！前面<b>没车挡</b>才能开出去，<br>被挡住会<b>撞车吃罚单</b>哦！'; for (const v of G.cars) v.hint = 0; G.hintCar = null; }
  else if (G.tut === 9) { x.innerHTML = '哎呀撞车了！罚单满了就失败，<br>先把<b>挡路的车</b>挪走～'; setTimeout(() => { if (G.tut === 9) { G.tut = 3; tutStep(); } }, 3200); }
  else { t.classList.remove('on'); }
}
/* ---------- 特效 ---------- */
function puff(x, y, dx, dy) { G.fx.push({ t: 'puff', x, y, vx: dx * 40 + (Math.random() - .5) * 30, vy: dy * 40 + (Math.random() - .5) * 30 - 10, life: .7, max: .7, s: L.c * (.12 + Math.random() * .1) }); }
function burst(x, y, col, n) { for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, s = 80 + Math.random() * 180; G.fx.push({ t: 'star', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: .7, max: .7, col, r: Math.random() * 6 }); } }
function floatText(s, x, y, col, sc = 1) { G.texts.push({ s, x, y, col, sc, life: 1.1, max: 1.1 }); }
function confetti() { const cols = ['#ff5a4a', '#ffd23f', '#4cc22f', '#2e9bf0', '#ff5aa8', '#ffffff']; for (let i = 0; i < 120; i++) G.fx.push({ t: 'conf', x: Math.random() * W, y: -20 - Math.random() * H * .5, vx: (Math.random() - .5) * 60, vy: 120 + Math.random() * 160, life: 3.5, max: 3.5, col: cols[i % cols.length], r: Math.random() * 6, w: 6 + Math.random() * 6 }); }
/* ---------- 更新 ---------- */
function update(dt) {
  if (G.state !== 'play' && G.state !== 'won' && G.state !== 'lost') return;
  G.time += dt; const c = L.c;
  for (const v of G.cars) {
    v.scale += (1 - v.scale) * Math.min(1, dt * 12); if (v.shake > 0) v.shake -= dt; if (v.hint > 0 && v.hint < 900) v.hint -= dt;
    if (v.spin) { v.spin.t += dt; const k = Math.max(0, Math.min(1, v.spin.t / v.spin.dur)); const e = 1 - Math.pow(1 - k, 3); v.ang = v.spin.from + (v.spin.to - v.spin.from) * e; v.scale = 1 + Math.sin(k * Math.PI) * .15; if (k >= 1) { v.ang = v.d * Math.PI / 2; v.spin = null; } }
    if (v.state === 'go') {
      v.spd = Math.min(30, v.spd + 75 * dt); v.off += v.spd * dt; v.t += dt;
      if (v.t < .25 && Math.random() < dt * 14) { const [sx, sy] = vScreen(v); const [dx, dy] = DIRS[v.d]; const k = v.rev ? 1 : -1; puff(sx + dx * k * v.len * c * .5, sy + dy * k * v.len * c * .5, dx * k, dy * k); }
      const [sx, sy] = vScreen(v); if (sx < -c * 3 || sx > W + c * 3 || sy < -c * 3 || sy > H + c * 3) { v.state = 'gone'; updHud(); }
    } else if (v.state === 'bump') {
      v.t += dt;
      if (v.phase === 0) { v.off = Math.min(v.target, v.off + 13 * dt); if (v.off >= v.target) { v.phase = 1; v.t = 0; impact(v); } }
      else if (v.phase === 1) { const k = Math.min(1, v.t / .45); v.off = v.target * (1 - (1 - Math.pow(1 - k, 3))) + Math.sin(k * Math.PI) * -.05; if (k >= 1) { v.off = 0; v.state = 'park'; v.t = 0; if (G.tickets >= G.maxTk && G.state === 'play') loseGame('tickets'); } }
    } else if (v.state === 'tow') {
      v.t += dt; if (v.t > .45) { v.scale = 1 + Math.min(.25, (v.t - .45) * 1.2); v.lift = (v.t - .45); }
      if (v.t > 1.5) { v.state = 'gone'; updHud(); }
    } else if (v.state === 'park') {
      v.idle -= dt; if (v.idle < 0) { v.idle = 3 + Math.random() * 7; if (Math.random() < .5) v.shake = .18; }
    }
  }
  for (const o of G.obs) if (o.shake > 0) o.shake -= dt;
  for (const f of G.fx) { f.life -= dt; if (f.vx !== undefined) { f.x += f.vx * dt; f.y += f.vy * dt; } if (f.t === 'spark') { f.vx *= .9; f.vy *= .9; } if (f.t === 'puff') { f.vx *= .95; f.vy *= .95; } if (f.t === 'conf') { f.vx += Math.sin(G.time * 3 + f.r) * 40 * dt; f.r += dt * 5; } if (f.t === 'star') { f.vy += 300 * dt; } }
  G.fx = G.fx.filter(f => f.life > 0);
  for (const t of G.texts) { t.life -= dt; if (!t.combo) t.y -= 40 * dt; } G.texts = G.texts.filter(t => t.life > 0);
  for (const m of G.marks) m.life -= dt; G.marks = G.marks.filter(m => m.life > 0);
  if (G.shake > 0) G.shake -= dt;
  if (G.state === 'play') {
    const alive = G.cars.filter(v => v.state !== 'gone');
    if (!alive.length) winGame();
    else if (!busy() && !alive.some(v => v.state === 'go')) {
      const parked = alive.filter(v => v.state === 'park');
      if (parked.length === alive.length && !parked.some(v => v.clamp <= 0 && !pathInfo(v).block)) {
        // 可能只是被锁：锁靠移除计数解，如果没人能动就是死局
        if (!G.stuckWarned) {
          G.stuckWarned = true; const has = Object.keys(save.props).some(k => (k === 'tow' || k === 'shuffle' || k === 'flip') && save.props[k] > 0) || save.coins >= PRICE.flip;
          if (has) { toast('车全堵死啦！快用道具救场', 2400); document.querySelectorAll('.prop').forEach(b => { if (b.dataset.p !== 'hint') { b.classList.remove('nudge'); void b.offsetWidth; b.classList.add('nudge'); } }); }
          else setTimeout(() => loseGame('stuck'), 600);
        }
      }
    }
  }
  if (DEBUG.bot && G.state === 'play') bot(dt);
}
let botT = 0;
function bot(dt) {
  botT -= dt; if (botT > 0 || busy()) return; botT = .28;
  const v = G.cars.find(movable);
  if (v) tapCar(v);
  else if (G.cars.some(v => v.state === 'park')) { if (!G.cars.some(v => v.state === 'go')) { if (!doShuffle()) { const t = G.cars.find(v => v.state === 'park'); if (t) usePropOn('tow', t); } } }
}
/* ---------- 绘制 ---------- */
function drawCar(v) {
  const sp = sprites[v.kind]; if (!sp) return; const c = L.c;
  let [x, y] = vScreen(v);
  if (v.shake > 0) { x += Math.sin(G.time * 70 + v.id) * c * .05 * Math.min(1, v.shake * 4); y += Math.cos(G.time * 61 + v.id) * c * .03 * Math.min(1, v.shake * 4); }
  let sc = v.scale, lift = 0;
  if (v.state === 'tow') { lift = Math.max(0, v.t - .45); y -= lift * lift * H * 1.2; }
  const ang = v.ang + (v.rev ? Math.PI : 0);
  // 投影
  const so = c * (.06 + lift * .4);
  ctx.save(); ctx.translate(x + so, y + so * 1.5); ctx.rotate(ang); ctx.scale(sc, sc); ctx.globalAlpha = .38 * (1 - Math.min(.7, lift)); ctx.drawImage(sp.sh, -sp.w / 2 - sp.pad, -sp.h / 2 - sp.pad, sp.w + sp.pad * 2, sp.h + sp.pad * 2); ctx.restore();
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(sc, sc);
  // 提示光圈
  if (v.hint > 0) { const a = .55 + Math.sin(G.time * 8) * .35; ctx.save(); ctx.shadowColor = '#fff3a0'; ctx.shadowBlur = 16 * DPR; ctx.strokeStyle = `rgba(255,236,120,${a})`; ctx.lineWidth = c * .1; const p = new Path2D(); rrPath(p, -sp.w / 2 - c * .06, -sp.h / 2 - c * .06, sp.w + c * .12, sp.h + c * .12, c * .22); ctx.stroke(p); ctx.restore(); }
  ctx.drawImage(sp.cnv, -sp.w / 2, -sp.h / 2, sp.w, sp.h);
  // 刹车灯/倒车灯
  if (v.state === 'bump' && v.phase === 1) { ctx.fillStyle = 'rgba(255,40,40,.85)'; ctx.shadowColor = '#ff2020'; ctx.shadowBlur = 10 * DPR; ctx.beginPath(); ctx.arc(-sp.w * .3, sp.h * .47, c * .07, 0, 7); ctx.arc(sp.w * .3, sp.h * .47, c * .07, 0, 7); ctx.fill(); ctx.shadowBlur = 0; }
  ctx.restore();
  // 方向箭头（在“行驶方向”坐标系里画）
  if (v.state === 'park' || v.state === 'bump' || (v.state === 'go' && v.t < .15)) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(v.ang); ctx.scale(sc, sc);
    const s = c * (v.len === 1 ? .17 : .2); const yy = 0;
    ctx.beginPath(); ctx.moveTo(0, yy - s); ctx.lineTo(s * .95, yy + s * .15); ctx.lineTo(s * .38, yy + s * .15); ctx.lineTo(s * .38, yy + s * .85); ctx.lineTo(-s * .38, yy + s * .85); ctx.lineTo(-s * .38, yy + s * .15); ctx.lineTo(-s * .95, yy + s * .15); ctx.closePath();
    ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(1.6, c * .05); ctx.strokeStyle = v.rev ? '#7a2e00' : '#1d3557'; ctx.stroke();
    ctx.fillStyle = v.rev ? '#ff9a1a' : '#ffffff'; ctx.fill();
    ctx.restore();
  }
  // 车轮锁
  if (v.clamp > 0 && v.state === 'park') {
    const cs = sprites.clamp; if (cs) { ctx.save(); ctx.translate(x, y); ctx.rotate(v.ang); ctx.drawImage(cs.cnv, sp.w / 2 - cs.w * .55, sp.h * .12, cs.w, cs.h); ctx.restore(); }
    const r = c * .26; ctx.save(); ctx.translate(x, y); ctx.fillStyle = '#ff3b5c'; ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(2, c * .06); ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = `900 ${r * 1.25}px "PingFang SC",sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(v.clamp, 0, r * .08); ctx.restore();
  }
}
function drawObs(o) {
  const sp = sprites[o.kind]; if (!sp) return; const c = L.c; let x = L.ox + (o.x + .5) * c, y = L.oy + (o.y + .5) * c;
  if (o.shake > 0) x += Math.sin(G.time * 80) * c * .06 * o.shake * 2;
  ctx.globalAlpha = .35; ctx.drawImage(sp.sh, x - sp.w / 2 - sp.pad + c * .06, y - sp.h / 2 - sp.pad + c * .1, sp.w + sp.pad * 2, sp.h + sp.pad * 2); ctx.globalAlpha = 1;
  ctx.drawImage(sp.cnv, x - sp.w / 2, y - sp.h / 2 - c * .04, sp.w, sp.h);
}
function drawAngry(f, x, y, k, big) {
  const a = Math.min(1, f.life / .25), s = (big ? 1 : .8) * L.c * .42 * (1 + (1 - Math.min(1, (f.max - f.life) / .15)) * .5);
  ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y - (f.max - f.life) * 14);
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#1d3557'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(0, 0, s * 1.2, s, 0, 0, 7); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-s * .2, s * .9); ctx.lineTo(-s * .5, s * 1.4); ctx.lineTo(s * .2, s * .95); ctx.fillStyle = '#fff'; ctx.fill();
  // 怒气符号
  ctx.strokeStyle = '#ff2d2d'; ctx.lineWidth = s * .2; ctx.lineCap = 'round';
  for (let i = 0; i < 4; i++) { ctx.save(); ctx.rotate(i * Math.PI / 2 + Math.PI / 4); ctx.beginPath(); ctx.moveTo(s * .16, s * .5); ctx.quadraticCurveTo(s * .16, s * .16, s * .5, s * .16); ctx.stroke(); ctx.restore(); }
  ctx.restore();
}
function draw() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (!bgCache) buildBg();
  ctx.drawImage(bgCache, 0, 0);
  if (!G.lv || G.state === 'menu') return;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (G.shake > 0) { const s = G.shake * 14; ctx.translate((Math.random() - .5) * s, (Math.random() - .5) * s); }
  const c = L.c;
  if (boardCache) ctx.drawImage(boardCache.cnv, L.ox - boardCache.pad, L.oy - boardCache.pad, boardCache.cnv.width / DPR, boardCache.cnv.height / DPR);
  // 刹车痕
  for (const m of G.marks) { const [dx, dy] = DIRS[m.d]; const a = Math.min(.35, m.life * .3); ctx.strokeStyle = `rgba(20,20,26,${a})`; ctx.lineWidth = c * .1; ctx.lineCap = 'round'; const px = -dy, py = dx; for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(m.x + px * s * c * .26, m.y + py * s * c * .26); ctx.lineTo(m.x + px * s * c * .26 - dx * m.w, m.y + py * s * c * .26 - dy * m.w); ctx.stroke(); } }
  for (const o of G.obs) if (o.kind !== 'tree') drawObs(o);
  // 停放/撞车的先画，开走的车在上层
  const order = G.cars.filter(v => v.state === 'park' || v.state === 'bump');
  for (const v of order) drawCar(v);
  for (const o of G.obs) if (o.kind === 'tree') drawObs(o);
  for (const f of G.fx) if (f.t === 'puff') { const k = 1 - f.life / f.max; ctx.globalAlpha = (1 - k) * .55; ctx.fillStyle = '#f2f4f7'; ctx.beginPath(); ctx.arc(f.x, f.y, f.s * (1 + k * 1.5), 0, 7); ctx.fill(); }
  ctx.globalAlpha = 1;
  for (const v of G.cars) if (v.state === 'go') {
    // 速度线
    if (v.spd > 10) { const [x, y] = vScreen(v); const [dx, dy] = DIRS[v.d]; ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 2; for (let i = -1; i <= 1; i++) { const ox = -dy * i * c * .3, oy = dx * i * c * .3, b = v.len * c * .55; ctx.beginPath(); ctx.moveTo(x + ox - dx * b, y + oy - dy * b); ctx.lineTo(x + ox - dx * (b + c * .9), y + oy - dy * (b + c * .9)); ctx.stroke(); } }
    drawCar(v);
  }
  // 拖车钩
  for (const v of G.cars) if (v.state === 'tow') {
    const [x, y0] = vScreen(v); const lift = Math.max(0, v.t - .45); const y = y0 - lift * lift * H * 1.2;
    const hookY = v.t < .45 ? -40 + (y0 + 40) * (v.t / .45) : y;
    ctx.strokeStyle = '#2b2f36'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, -10); ctx.lineTo(x, hookY); ctx.stroke();
    ctx.strokeStyle = '#ffcc1a'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(x, hookY + 6, 7, Math.PI * 1.1, Math.PI * 2.2); ctx.stroke();
    if (v.t >= .45) drawCar(v);
  }
  // 粒子
  for (const f of G.fx) {
    const k = 1 - f.life / f.max;
    if (f.t === 'spark') { ctx.strokeStyle = `rgba(255,${200 - k * 120 | 0},60,${1 - k})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x - f.vx * .04, f.y - f.vy * .04); ctx.stroke(); }
    else if (f.t === 'ring') { ctx.strokeStyle = `rgba(255,255,255,${1 - k})`; ctx.lineWidth = 4 * (1 - k) + 1; ctx.beginPath(); ctx.arc(f.x, f.y, 6 + k * c * .9, 0, 7); ctx.stroke(); }
    else if (f.t === 'star') { ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.r + k * 6); ctx.globalAlpha = 1 - k; ctx.fillStyle = f.col; star5(ctx, 0, 0, 7 * (1 - k * .5)); ctx.restore(); }
    else if (f.t === 'conf') { ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.r); ctx.scale(1, Math.cos(f.r * 2)); ctx.globalAlpha = Math.min(1, f.life); ctx.fillStyle = f.col; ctx.fillRect(-f.w / 2, -3, f.w, 6); ctx.restore(); }
    else if (f.t === 'angry' || f.t === 'angry2') { if (f.ref) { const [x, y] = vScreen(f.ref); drawAngry(f, x + (f.t === 'angry2' ? c * .25 : 0), y - c * (f.ref.len * .25 + .55), k, f.t === 'angry'); } }
    else if (f.t === 'ticket') { const e = k * k * (3 - 2 * k); const x = f.x0 + (f.x1 - f.x0) * e, y = f.y0 + (f.y1 - f.y0) * e - Math.sin(k * Math.PI) * 80; ctx.save(); ctx.translate(x, y); ctx.rotate(k * 6); ctx.scale(1.4 - k * .6, 1.4 - k * .6); ctx.fillStyle = '#ff5a4a'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.rect(-9, -11, 18, 22); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#fff'; ctx.font = '900 10px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('罚', 0, 0); ctx.restore(); }
  }
  ctx.globalAlpha = 1;
  // 浮字
  for (const t of G.texts) {
    const k = 1 - t.life / t.max, pop = k < .15 ? .6 + k / .15 * .5 : 1.1 - Math.min(.1, (k - .15));
    ctx.save(); ctx.translate(t.x, t.y); ctx.scale(pop * t.sc, pop * t.sc); ctx.globalAlpha = Math.min(1, t.life * 3);
    ctx.font = `900 22px "PingFang SC","Noto Sans CJK SC",sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    ctx.lineWidth = 6; ctx.strokeStyle = '#1d3557'; ctx.strokeText(t.s, 0, 0); ctx.fillStyle = t.col; ctx.fillText(t.s, 0, 0); ctx.restore();
  }
  // 教程/提示指示箭头
  const hc = G.hintCar; if (hc && hc.state === 'park' && hc.hint > 0) {
    const [x, y] = vScreen(hc); const b = Math.sin(G.time * 7) * 6; const top = y - c * (hc.len * .5 + .55) + b;
    ctx.save(); ctx.translate(x, top); ctx.fillStyle = '#ffd23f'; ctx.strokeStyle = '#1d3557'; ctx.lineWidth = 3; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(0, 14); ctx.lineTo(-14, -2); ctx.lineTo(-6, -2); ctx.lineTo(-6, -18); ctx.lineTo(6, -18); ctx.lineTo(6, -2); ctx.lineTo(14, -2); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
    const r = (G.time * 1.2) % 1; ctx.strokeStyle = `rgba(255,236,120,${1 - r})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, c * (.4 + r * .8), 0, 7); ctx.stroke();
  }
}
function star5(x, cx, cy, r) { x.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .45 : r; x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } x.closePath(); x.fill(); }
/* ---------- 胜负 ---------- */
function winGame() {
  G.state = 'won'; setMode(null); $('tut').classList.remove('on');
  const stars = G.tickets === 0 ? 3 : G.tickets === 1 ? 2 : 1; G.lastStars = stars; try{GT.win(G.n,{stars:stars,tickets:G.tickets,cars:G.total,props:G.propsUsed,combo:G.maxCombo})}catch(_e){}
  const first = !save.stars[G.n];
  save.stars[G.n] = Math.max(save.stars[G.n] || 0, stars);
  if (G.n >= save.unlocked && G.n < NLV) save.unlocked = G.n + 1;
  const coins = 10 + stars * 10 + (first ? 20 : 0); save.coins += coins;
  let gift = '';
  if (first && G.n % 5 === 0) { for (const k in save.props) save.props[k]++; gift = '<br>🎁 通关礼包：每种道具 +1'; }
  persist();
  setTimeout(() => { confetti(); SND.play('win'); }, 250);
  setTimeout(() => {
    showScr('win'); const sp = $('wStars').children; for (let i = 0; i < 3; i++) { sp[i].className = ''; if (i < stars) setTimeout(() => { sp[i].className = 'on'; SND.play('star', i); }, 250 + i * 280); }
    $('wTitle').textContent = stars === 3 ? '完美挪车！' : stars === 2 ? '车场畅通！' : '总算挪完啦！';
    $('wInfo').innerHTML = `挪走 <b>${G.total}</b> 辆车 · 罚单 <b>${G.tickets}</b> 张<br>最高连挪 <b>×${Math.max(1, G.maxCombo)}</b> · 用时 <b>${Math.round(G.time)}</b> 秒${gift}`;
    $('wReward').innerHTML = `<div class="reward"><svg width="28" height="28" viewBox="0 0 32 32"><circle cx="16" cy="16" r="14" fill="#ffb300" stroke="#a85a00" stroke-width="2.5"/><circle cx="16" cy="16" r="10" fill="#ffd84a"/></svg>+${coins} 金币</div>`;
    $('wNext').style.display = G.n < NLV ? '' : 'none'; if (G.n >= NLV) $('wInfo').innerHTML += '<br><b>恭喜！你已经是挪车大师了！</b>';
    updHud();
  }, 1300);
}
function loseGame(why) {
  if (G.state !== 'play') return; G.state = 'lost'; try{GT.fail(G.n,{r:why,tickets:G.tickets})}catch(_e){} setMode(null); $('tut').classList.remove('on');
  setTimeout(() => {
    SND.play('fail'); showScr('fail');
    $('fTitle').textContent = why === 'stuck' ? '车全堵死啦！' : '罚单太多啦！';
    $('fInfo').innerHTML = why === 'stuck' ? '没有车能开走，道具和金币也用光了<br>换个顺序再试一次吧' : `已经吃了 <b>${G.tickets}</b> 张罚单<br>还剩 <b>${G.cars.filter(v => v.state !== 'gone').length}</b> 辆车没挪走`;
    const cost = 100; const can = why === 'tickets' && !G.revived;
    $('fRevive').style.display = can ? '' : 'none';
    $('fRevive').innerHTML = save.coins >= cost ? `交罚款，撤销 2 张<span class="cost">${cost} 金币</span>` : `金币不足（需 ${cost}）`;
    $('fRevive').disabled = save.coins < cost;
  }, 700);
}
$('fRevive').onclick = () => { if (save.coins < 100) return; save.coins -= 100; persist(); SND.play('coin'); G.revived = true; try{GT.revive('coins')}catch(_e){} G.tickets = Math.max(0, G.tickets - 2); G.state = 'play'; showScr(null); updHud(); toast('罚款已交，继续挪车！'); };
/* ---------- 界面 ---------- */
const SCRS = ['load', 'menu', 'levels', 'pause', 'win', 'fail', 'feat', 'buy'];
function showScr(id) { for (const s of SCRS) $(s).classList.toggle('on', s === id); }
function syncToggles() { for (const id of ['mMusic', 'pMusic']) $(id).classList.toggle('off', !save.music); for (const id of ['mSfx', 'pSfx']) $(id).classList.toggle('off', !save.sfx); }
function toggleMusic() { save.music = !save.music; try{GT.sound('music',save.music)}catch(_e){} persist(); SND.setMusic(save.music); if (save.music) { SND.unlock(); SND.startMusic(); } syncToggles(); }
function toggleSfx() { save.sfx = !save.sfx; try{GT.sound('sfx',save.sfx)}catch(_e){} persist(); SND.setSfx(save.sfx); syncToggles(); SND.play('click'); }
$('mMusic').onclick = $('pMusic').onclick = toggleMusic; $('mSfx').onclick = $('pSfx').onclick = toggleSfx;
function toMenu() {
  G.state = 'menu'; G.lv = null; $('hud').classList.remove('on'); $('props').classList.remove('on'); $('tut').classList.remove('on'); setMode(null);
  const tot = Object.values(save.stars).reduce((a, b) => a + b, 0);
  $('mStat').textContent = `已解锁 ${save.unlocked}/${NLV} 关 · ★ ${tot}/${NLV * 3} · 金币 ${save.coins}`;
  $('bPlay').textContent = save.unlocked > 1 ? `继续挪车 · 第 ${save.unlocked} 关` : '开始挪车';
  showScr('menu'); syncToggles();
}
function toLevels() {
  const g = $('grid'); g.innerHTML = ''; const tot = Object.values(save.stars).reduce((a, b) => a + b, 0);
  $('lvTot').textContent = `★ ${tot} / ${NLV * 3}　金币 ${save.coins}`;
  for (let i = 1; i <= NLV; i++) {
    const b = document.createElement('button'); const lock = i > save.unlocked, s = save.stars[i] || 0;
    b.className = 'lv' + (lock ? ' lock' : '') + (i === save.unlocked ? ' cur' : '') + (i % 10 === 0 ? ' boss' : '');
    b.innerHTML = lock ? `<svg width="22" height="26" viewBox="0 0 22 26"><rect x="2" y="11" width="18" height="13" rx="3" fill="#e3ecf5"/><path d="M6 11V8a5 5 0 0 1 10 0v3" stroke="#e3ecf5" stroke-width="3" fill="none"/></svg>` : `${i}<div class="s">${[0, 1, 2].map(k => k < s ? '<i>★</i>' : '☆').join('')}</div>`;
    b.onclick = () => { if (lock) { SND.play('locked'); toast('先通过前面的关卡吧'); return; } SND.play('click'); startLevel(i); };
    g.appendChild(b);
  }
  showScr('levels'); const cur = g.querySelector('.lv.cur'); if (cur) setTimeout(() => cur.scrollIntoView({ block: 'center' }), 30);
}
$('bPlay').onclick = () => { SND.play('click'); try{GT.title('play')}catch(_e){} startLevel(save.unlocked); };
$('bLevels').onclick = () => { SND.play('click'); try{GT.title('levels')}catch(_e){} toLevels(); };
$('lvBack').onclick = () => { SND.play('click'); toMenu(); };
function pauseGame() { if (G.state !== 'play') return; G.state = 'paused'; try{GT.pause()}catch(_e){} setMode(null); $('pInfo').innerHTML = `第 <b>${G.n}</b> 关 · ${G.lv.name}<br>罚单 <b>${G.tickets}/${G.maxTk}</b> · 剩余 <b>${G.cars.filter(v => v.state !== 'gone').length}</b> 辆`; showScr('pause'); syncToggles(); }
$('hPause').onclick = () => { SND.play('click'); pauseGame(); };
$('pResume').onclick = () => { SND.play('click'); showScr(null); G.state = 'play'; };
$('pRestart').onclick = () => { SND.play('click'); startLevel(G.n); };
$('pQuit').onclick = () => { SND.play('click'); try{GT.quit('menu')}catch(_e){} toLevels(); G.state = 'menu'; $('hud').classList.remove('on'); $('props').classList.remove('on'); };
$('wRetry').onclick = () => { SND.play('click'); startLevel(G.n); };
$('wMenu').onclick = () => { SND.play('click'); toLevels(); G.state = 'menu'; $('hud').classList.remove('on'); $('props').classList.remove('on'); };
$('wNext').onclick = () => { SND.play('click'); startLevel(G.n + 1); };
$('fRetry').onclick = () => { SND.play('click'); startLevel(G.n); };
$('fMenu').onclick = () => { SND.play('click'); toLevels(); G.state = 'menu'; $('hud').classList.remove('on'); $('props').classList.remove('on'); };
// 返回 Tilo 游戏屋：先存档再离开
function goHub(e) { if (e) e.stopPropagation(); persist(); try { SND.play('click'); } catch (_) { } try{GT.hub(e&&e.currentTarget&&e.currentTarget.id)}catch(_e){} location.href = '../'; }
for (const id of ['mHub', 'pHub', 'wHub', 'fHub']) $(id).onclick = goHub;
function showFeat(f) {
  G.state = 'feat'; $('ftTitle').textContent = f.t; $('ftInfo').innerHTML = f.d;
  $('ftImgs').innerHTML = f.rev ? `<img src="assets/sedan.webp" style="transform:rotate(180deg);height:96px"><svg width="60" height="60" viewBox="0 0 60 60"><path d="M30 8l20 22H38v22H22V30H10z" fill="#ff9a1a" stroke="#7a2e00" stroke-width="4" stroke-linejoin="round"/></svg>` : f.imgs.map(n => `<img src="assets/${n}.webp" style="${n.startsWith('ic_') ? 'height:62px' : 'height:100px'}">`).join('');
  showScr('feat');
}
$('ftOk').onclick = () => { SND.play('click'); showScr(null); G.state = 'play'; if (G.tut) tutStep(); };
/* ---------- 音频解锁 / 生命周期 ---------- */
let unlocked = false;
const unlockAudio = () => { SND.unlock(); SND.setMusic(save.music); SND.setSfx(save.sfx); if (!unlocked) { unlocked = true; if (save.music) SND.startMusic(); } };
document.addEventListener('pointerdown', unlockAudio, true); document.addEventListener('touchend', unlockAudio, true);
document.addEventListener('visibilitychange', () => { if (document.hidden) { pauseGame(); SND.stopMusic(); try { SND.ctx && SND.ctx.suspend(); } catch (e) { } } else { try { SND.ctx && SND.ctx.resume(); } catch (e) { } if (save.music && unlocked) SND.startMusic(); } });
window.addEventListener('resize', resize); window.addEventListener('orientationchange', () => setTimeout(resize, 200));
/* ---------- 主循环 ---------- */
let last = performance.now(), fpsAcc = 0, fpsN = 0;
function frame(t) {
  let dt = Math.min(.05, (t - last) / 1000); last = t; fpsAcc += dt; fpsN++; if (fpsAcc > 1) { G.fps = Math.round(fpsN / fpsAcc); fpsAcc = 0; fpsN = 0; }
  dt *= DEBUG.speed; update(dt); draw(); requestAnimationFrame(frame);
}
window.__T = window.__dbg = {
  L: () => L, movable: () => G.cars.filter(movable).map(v => { const [x, y] = vScreen(v); return { id: v.id, x, y }; }),
  blocked: () => G.cars.filter(v => v.state === 'park' && !movable(v) && v.clamp <= 0).map(v => { const [x, y] = vScreen(v); return { id: v.id, x, y }; }),
  cars: () => G.cars.filter(v => v.state === 'park').map(v => { const [x, y] = vScreen(v); return { id: v.id, x, y, clamp: v.clamp, rev: v.rev, kind: v.kind }; }),
  propBtn: p => { const r = document.querySelector(`.prop[data-p="${p}"]`).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; },
  start: startLevel, win: winGame, save: () => save,
};
resize(); updProps(); syncToggles();
loadAll(() => {
  resize(); $('ltxt').textContent = '准备就绪！';
  setTimeout(() => { if (DEBUG.level) startLevel(DEBUG.level); else toMenu(); }, 250);
  requestAnimationFrame(frame);
});
})();
