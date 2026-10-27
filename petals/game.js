/* ===== 花瓣消消 · 春日花园  主程序 ===== */
(() => {
'use strict';
const $ = id => document.getElementById(id);
const Q = new URLSearchParams(location.search);
const DEBUG = { level: +Q.get('level') || 0, bot: Q.has('bot'), unlock: Q.has('unlock'), speed: +Q.get('speed') || 1 };
const GW = 96, GH = 96, MAXSLOT = 9;
const PALRGB = SIM.PAL.map(p => { const h = p[1]; return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; });
const isLight = c => { const [r, g, b] = PALRGB[c]; return r * .3 + g * .59 + b * .11 > 175; };
const rgb = (c, f = 1, a = 1) => { const [r, g, b] = PALRGB[c]; const k = v => Math.max(0, Math.min(255, Math.round(f >= 1 ? v + (255 - v) * (f - 1) : v * f))); return `rgba(${k(r)},${k(g)},${k(b)},${a})`; };
/* ---------- 存档 ---------- */
const SKEY = 'petals_save_v1';
let save = { max: 1, stars: {}, props: { slot: 2, bee: 2, shuffle: 2 }, music: true, sfx: true, tut: {} };
try { const o = JSON.parse(localStorage.getItem(SKEY)); if (o) save = Object.assign(save, o); } catch (e) { }
const persist = () => { try { localStorage.setItem(SKEY, JSON.stringify(save)); } catch (e) { } };
if (DEBUG.unlock) save.max = LEVELS.length;
/* ---------- 画布与布局 ---------- */
const cv = $('cv'); let ctx = cv.getContext('2d');
let W = 0, H = 0, DPR = 1, LY = {};
function layout() {
  DPR = Math.min(2, window.devicePixelRatio || 1);
  W = window.innerWidth; H = window.innerHeight;
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  const sf = getComputedStyle($('safe')); const st = parseFloat(sf.paddingTop) || 0, sb = parseFloat(sf.paddingBottom) || 0;
  const top = st + 58, propsTop = H - sb - 94;
  const avail = propsTop - top - 6;
  const u = Math.max(.62, Math.min(W / 390, avail / 700, 1.25));
  const bsz0 = 50 * u, beltZone = bsz0 * 1.32 + 24, qNeed = 212 * u;
  const P = Math.floor(Math.max(150, Math.min(W - 40, 420, avail - 26 - beltZone - qNeed)));
  const f = Math.round(8 * u);
  const py = top + 6 + f, px = Math.round((W - P) / 2);
  const beltBase = py + P + f + 12 + bsz0 * 1.32;
  LY = { u, top, propsTop, P, px, py, f, gs: P / GW, beltBase, qTop: beltBase + 26 * u, st, sb };
  buildPicLayer();
  if (G.s) buildTiles();
}
/* ---------- 资源 ---------- */
const IMG = {};
const ASSETS = ['bg.jpg', 'mascot.webp', 'basket.webp', 'ic_slot.webp', 'ic_bee.webp', 'ic_shuffle.webp', 'logo.webp'];
function loadAll(cb) {
  let n = 0;
  ASSETS.forEach(a => { const im = new Image(); im.onload = im.onerror = () => { n++; $('lbar').style.width = (n / ASSETS.length * 100) + '%'; if (n === ASSETS.length) cb(); }; im.src = 'assets/' + a; IMG[a.split('.')[0]] = im; });
}
/* 着色花篮缓存 */
const basketCache = {};
function tintedBasket(c) {
  if (basketCache[c] !== undefined) return basketCache[c];
  const im = IMG.basket, w = im.naturalWidth, h = im.naturalHeight;
  const k = document.createElement('canvas'); k.width = w; k.height = h; const x = k.getContext('2d');
  x.drawImage(im, 0, 0);
  if (c >= 0) {
    const d = x.getImageData(0, 0, w, h), p = d.data, [r, g, b] = PALRGB[c];
    const light = isLight(c);
    for (let i = 0; i < p.length; i += 4) {
      if (!p[i + 3]) continue;
      const L = (p[i] * .3 + p[i + 1] * .59 + p[i + 2] * .11) / 255;
      const m = light ? (.55 + .6 * L) : (.42 + .85 * L);
      p[i] = Math.min(255, r * m); p[i + 1] = Math.min(255, g * m); p[i + 2] = Math.min(255, b * m);
    }
    x.putImageData(d, 0, 0);
  }
  return (basketCache[c] = k);
}
/* 花瓣小精灵（飞行粒子） */
const petalSpr = {};
function petalSprite(c) {
  if (petalSpr[c]) return petalSpr[c];
  const s = 24, k = document.createElement('canvas'); k.width = k.height = s; const x = k.getContext('2d');
  x.translate(s / 2, s / 2);
  x.beginPath(); x.moveTo(0, -10); x.bezierCurveTo(8, -7, 8, 6, 0, 10); x.bezierCurveTo(-8, 6, -8, -7, 0, -10); x.closePath();
  const gr = x.createLinearGradient(-8, -10, 8, 10); gr.addColorStop(0, rgb(c, 1.35)); gr.addColorStop(.6, rgb(c)); gr.addColorStop(1, rgb(c, .8));
  x.fillStyle = gr; x.fill(); x.strokeStyle = rgb(c, .7, .6); x.lineWidth = 1; x.stroke();
  x.beginPath(); x.moveTo(0, -7); x.quadraticCurveTo(1.5, 0, 0, 7); x.strokeStyle = rgb(c, 1.5, .55); x.lineWidth = 1.2; x.stroke();
  return (petalSpr[c] = k);
}
/* 花瓣堆（篮中） */
const heapCache = {};
function heapSprite(c) {
  if (heapCache[c]) return heapCache[c];
  const w = 120, h = 60, k = document.createElement('canvas'); k.width = w; k.height = h; const x = k.getContext('2d');
  const r = SIM.rng(c * 99 + 7), spr = petalSprite(c);
  x.save(); x.beginPath(); x.ellipse(w / 2, h, w / 2 - 2, h - 2, 0, Math.PI, 0); x.closePath(); x.fillStyle = rgb(c, .82); x.fill(); x.clip();
  for (let i = 0; i < 90; i++) { const a = r() * Math.PI, rr = Math.sqrt(r()); const px = w / 2 + Math.cos(a) * rr * (w / 2), py = h - Math.sin(a) * rr * (h - 4); x.save(); x.translate(px, py); x.rotate(r() * 6.28); const sc = .55 + r() * .45; x.scale(sc, sc); x.globalAlpha = .75 + r() * .25; x.drawImage(spr, -12, -12); x.restore(); }
  x.restore();
  return (heapCache[c] = k);
}
/* ---------- 画面花瓣层（离屏、按格增量重绘） ---------- */
let picCv = null, picCtx = null, picImg = null, picBuf = null, T = 6, tiles = null, prevG = null;
function buildPicLayer() { T = Math.max(3, Math.round(LY.gs * DPR)); }
function buildTiles() {
  const s = G.s; if (!s) return;
  picCv = document.createElement('canvas'); picCv.width = GW * T; picCv.height = GH * T; picCtx = picCv.getContext('2d');
  picImg = picCtx.createImageData(GW * T, GH * T); picBuf = new Uint32Array(picImg.data.buffer);
  const tk = document.createElement('canvas'); tk.width = tk.height = T; const tx = tk.getContext('2d', { willReadFrequently: true });
  tiles = [];
  s.cols.forEach((gc, li) => {
    const arr = [];
    for (let v = 0; v < 8; v++) {
      tx.clearRect(0, 0, T, T);
      const sh = [.95, 1.03, .99, 1.07, .92, 1.01, 1.05, .97][v];
      tx.fillStyle = rgb(gc, sh * .88); tx.fillRect(0, 0, T, T);
      tx.save(); tx.translate(T / 2, T / 2); tx.rotate([.4, 1.3, 2.2, 2.9, .9, 1.8, 2.6, .1][v]);
      tx.beginPath(); tx.moveTo(-T * .5, 0); tx.quadraticCurveTo(0, -T * .62, T * .5, 0); tx.quadraticCurveTo(0, T * .5, -T * .5, 0); tx.fillStyle = rgb(gc, sh); tx.fill();
      tx.beginPath(); tx.ellipse(-T * .05, -T * .12, T * .22, T * .08, 0, 0, 6.283); tx.fillStyle = rgb(gc, sh * 1.14, .7); tx.fill();
      tx.restore();
      arr.push(new Uint32Array(tx.getImageData(0, 0, T, T).data.buffer.slice(0)));
    }
    tiles.push(arr);
  });
  prevG = new Int16Array(GW * GH).fill(-1);
}
function updatePic() {
  const s = G.s, g = s.g, v = s.v, RW = GW * T;
  let y0 = GH, y1 = -1;
  for (let y = 0; y < GH; y++) {
    const row = y * GW;
    for (let x = 0; x < GW; x++) {
      const i = row + x, c = g[i], key = c ? (c << 4) | (v[i] & 7) : 0;
      if (prevG[i] === key) continue;
      prevG[i] = key; if (y < y0) y0 = y; if (y > y1) y1 = y;
      let o = y * T * RW + x * T;
      if (!c) { for (let ty = 0; ty < T; ty++, o += RW) picBuf.fill(0, o, o + T); }
      else { const t = tiles[c - 1][v[i] & 7]; let k = 0; for (let ty = 0; ty < T; ty++, o += RW) for (let tx = 0; tx < T; tx++) picBuf[o + tx] = t[k++]; }
    }
  }
  if (y1 >= 0) picCtx.putImageData(picImg, 0, 0, 0, y0 * T, RW, (y1 - y0 + 1) * T);
}
/* 关卡缩略图 */
const thumbCache = {};
function thumb(li) {
  if (thumbCache[li]) return thumbCache[li];
  const L = LEVELS[li], g = SIM.decodeGrid(L.grid, GW * GH);
  const k = document.createElement('canvas'); k.width = GW; k.height = GH; const x = k.getContext('2d');
  const d = x.createImageData(GW, GH);
  for (let i = 0; i < g.length; i++) { const [r, gg, b] = PALRGB[L.cols[g[i] - 1]]; d.data[i * 4] = r; d.data[i * 4 + 1] = gg; d.data[i * 4 + 2] = b; d.data[i * 4 + 3] = 255; }
  x.putImageData(d, 0, 0);
  return (thumbCache[li] = k);
}
/* ---------- 游戏状态 ---------- */
const G = { scr: 'load', s: null, li: 0, paused: false, acc: 0, used: 0, revived: false, bee: null, beeMode: false, over: false, winT: -1, botCd: 0, total: 1, anim: {}, fx: [], shake: 0, tutStep: 0, qAnim: 0, slotGlow: 0, lastT: 0, time: 0, mergedOnce: false };
function lvObj(li) {
  const L = LEVELS[li];
  return { W: GW, H: GH, grid: SIM.decodeGrid(L.grid, GW * GH), cols: L.cols, slots: L.slots, columns: L.columns.map(col => col.map(b => ({ c: b[0], cap: b[1], hid: !!(b[2] & 1), lock: !!(b[2] & 2), key: !!(b[2] & 4), frost: b[3] }))) };
}
function startLevel(li) {
  try{GT.lv(li+1)}catch(_e){}
  G.li = li; G.s = SIM.create(lvObj(li), 1000 + li); G.s.cols = LEVELS[li].cols;
  G.total = G.s.left; G.used = 0; G.revived = false; G.over = false; G.winT = -1; G.paused = false; G.beeMode = false; G.bee = null;
  G.fx = []; G.anim = {}; P.n = 0; G.qAnim = 0; G.slotGlow = 0; G.botCd = 30; G.acc = 0; G.mergedOnce = false; G.tutStep = 0;
  buildTiles();
  $('hLv').textContent = '第 ' + (li + 1) + ' 关'; $('hName').textContent = LEVELS[li].name + ' · ' + LEVELS[li].columns.reduce((a, c) => a + c.length, 0) + ' 个花篮';
  showScr('game'); updProps(); updHud(); hideTut();
  setMode(false);
  // 新机制介绍 / 教学
  const has = k => LEVELS[li].columns.some(col => col.some(b => k === 'hid' ? (b[2] & 1) : k === 'lock' ? (b[2] & 2) : k === 'frost' ? b[3] > 0 : 0));
  const intro = ['hid', 'frost', 'lock'].find(k => has(k) && !save.tut['f_' + k]);
  if (intro && !DEBUG.bot) showFeat(intro);
  else startTut();
}
function startTut() {
  if (DEBUG.bot) return;
  const li = G.li;
  if (li === 0 && !save.tut.t1) { G.tutStep = 1; showTut('点击下方最前排的<b>花篮</b>，把它送上<b>传送带</b>吧～', true); }
  else if (li === 1 && !save.tut.t2) { G.tutStep = 10; showTut('试试点击<b>三个相同颜色</b>的花篮进行<b>合并</b>，大花篮收集更快！', true); }
  else if (li === 2 && !save.tut.t3) { G.tutStep = 20; showTut('篮位不够用时，试试下方的道具：<b>加篮位</b>、<b>蜜蜂采蜜</b>、<b>换一换</b>'); setTimeout(() => { if (G.tutStep === 20) { hideTut(); G.tutStep = 0; save.tut.t3 = 1; persist(); } }, 5200); document.querySelectorAll('.prop').forEach(p => { p.classList.remove('nudge'); void p.offsetWidth; p.classList.add('nudge'); }); }
}
/* ---------- 位置计算 ---------- */
function slotPos(i) {
  const cap = G.s.cap, sp = Math.min(56 * LY.u, (W - 28) / cap);
  return { x: W / 2 + (i - (cap - 1) / 2) * sp, y: LY.beltBase, sz: sp * .9 };
}
function colInfo() {
  const C = G.s.columns.length, cw = Math.min((W - 16) / C, 104 * LY.u);
  const qh = LY.propsTop - LY.qTop;
  const fb = Math.min(cw * .78, 76 * LY.u, (qh - 30 * LY.u) / 3.3);
  return { C, cw, fb };
}
function qPos(ci, k) { // 第 ci 列第 k 个花篮：底部中心 + 尺寸
  const { C, cw, fb } = colInfo();
  const x = W / 2 + (ci - (C - 1) / 2) * cw;
  const sc = [1, .86, .74, .64][Math.min(3, k)];
  let y = LY.qTop + fb * 1.32;
  for (let j = 1; j <= k; j++) y += fb * [0, .96, .8, .62][Math.min(3, j)];
  return { x, y, sz: fb * sc };
}
function findQ(id) { const s = G.s; for (let ci = 0; ci < s.columns.length; ci++) { const k = s.columns[ci].findIndex(b => b.id === id); if (k >= 0) return qPos(ci, k); } return null; }
/* ---------- 粒子（类型化数组） ---------- */
const PMAX = 700;
const P = { n: 0, x0: new Float32Array(PMAX), y0: new Float32Array(PMAX), cx: new Float32Array(PMAX), cy: new Float32Array(PMAX), si: new Int8Array(PMAX), t: new Float32Array(PMAX), d: new Float32Array(PMAX), rot: new Float32Array(PMAX), vr: new Float32Array(PMAX), c: new Uint8Array(PMAX), sc: new Float32Array(PMAX) };
function spawnPetal(x, y, si, c, delay = 0) {
  if (P.n >= PMAX) return;
  const i = P.n++, sp = slotPos(si);
  P.x0[i] = x; P.y0[i] = y; P.si[i] = si; P.c[i] = c; P.t[i] = -delay; P.d[i] = .42 + Math.random() * .3;
  const mx = (x + sp.x) / 2, my = (y + sp.y) / 2; const sw = (Math.random() - .5) * 160 * LY.u;
  P.cx[i] = mx + sw; P.cy[i] = Math.min(y, sp.y - sp.sz) - 20 - Math.random() * 50 * LY.u;
  P.rot[i] = Math.random() * 6.28; P.vr[i] = (Math.random() - .5) * 14; P.sc[i] = .45 + Math.random() * .35;
}
function stepParticles(dt) {
  let j = 0;
  for (let i = 0; i < P.n; i++) {
    P.t[i] += dt; P.rot[i] += P.vr[i] * dt;
    if (P.t[i] >= P.d[i]) continue;
    if (i !== j) { P.x0[j] = P.x0[i]; P.y0[j] = P.y0[i]; P.cx[j] = P.cx[i]; P.cy[j] = P.cy[i]; P.si[j] = P.si[i]; P.t[j] = P.t[i]; P.d[j] = P.d[i]; P.rot[j] = P.rot[i]; P.vr[j] = P.vr[i]; P.c[j] = P.c[i]; P.sc[j] = P.sc[i]; }
    j++;
  }
  P.n = j;
}
function drawParticles() {
  const cols = G.s.cols;
  for (let i = 0; i < P.n; i++) {
    if (P.t[i] < 0) continue;
    const u = P.t[i] / P.d[i], e = u * u * (3 - 2 * u), sp = slotPos(P.si[i]);
    const tx = sp.x, ty = sp.y - sp.sz * .95;
    const a = 1 - e, x = a * a * P.x0[i] + 2 * a * e * P.cx[i] + e * e * tx, y = a * a * P.y0[i] + 2 * a * e * P.cy[i] + e * e * ty;
    const sc = P.sc[i] * LY.u * (1 - .4 * e) * DPR * .6;
    const co = Math.cos(P.rot[i]) * sc, si = Math.sin(P.rot[i]) * sc;
    ctx.setTransform(co, si, -si, co, x * DPR, y * DPR);
    ctx.drawImage(petalSprite(cols[P.c[i]]), -12, -12);
  }
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
/* ---------- 特效 ---------- */
function burst(x, y, gc, n = 14, spd = 140) { for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, v = spd * (.4 + Math.random() * .8) * LY.u; G.fx.push({ k: 'p', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, t: 0, d: .6 + Math.random() * .5, c: gc, r: Math.random() * 6, vr: (Math.random() - .5) * 10, s: .5 + Math.random() * .6 }); } }
function sparkle(x, y, n = 8) { for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, v = (60 + Math.random() * 120) * LY.u; G.fx.push({ k: 's', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, d: .5 + Math.random() * .4, s: 4 + Math.random() * 5 }); } }
function ring(x, y, col, r0 = 10, r1 = 60) { G.fx.push({ k: 'r', x, y, t: 0, d: .45, col, r0: r0 * LY.u, r1: r1 * LY.u }); }
function txtPop(x, y, s, col = '#fff') { G.fx.push({ k: 't', x, y, t: 0, d: 1, s, col }); }
function drawFx(dt) {
  const out = [];
  for (const f of G.fx) {
    f.t += dt; if (f.t >= f.d) continue; out.push(f);
    const u = f.t / f.d;
    if (f.k === 'p') { f.vy += 260 * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.r += f.vr * dt; ctx.save(); ctx.globalAlpha = 1 - u * u; ctx.translate(f.x, f.y); ctx.rotate(f.r); const sc = f.s * LY.u * .7; ctx.scale(sc, sc); ctx.drawImage(petalSprite(f.c), -12, -12); ctx.restore(); }
    else if (f.k === 's') { f.x += f.vx * dt; f.y += f.vy * dt; f.vx *= .96; f.vy *= .96; star4(f.x, f.y, f.s * (1 - u) * LY.u, `rgba(255,250,220,${1 - u})`); }
    else if (f.k === 'r') { ctx.beginPath(); ctx.arc(f.x, f.y, f.r0 + (f.r1 - f.r0) * Math.sqrt(u), 0, 6.283); ctx.strokeStyle = f.col; ctx.globalAlpha = 1 - u; ctx.lineWidth = 5 * (1 - u) * LY.u + 1; ctx.stroke(); ctx.globalAlpha = 1; }
    else if (f.k === 't') { const y = f.y - 40 * Math.sqrt(u) * LY.u; ctx.globalAlpha = u < .7 ? 1 : (1 - u) / .3; ctx.font = `900 ${Math.round(20 * LY.u)}px sans-serif`; ctx.textAlign = 'center'; ctx.lineWidth = 5; ctx.strokeStyle = '#a02860'; ctx.strokeText(f.s, f.x, y); ctx.fillStyle = f.col; ctx.fillText(f.s, f.x, y); ctx.globalAlpha = 1; }
  }
  G.fx = out;
}
function star4(x, y, r, col) { ctx.beginPath(); ctx.moveTo(x, y - r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.quadraticCurveTo(x, y, x, y + r); ctx.quadraticCurveTo(x, y, x - r, y); ctx.quadraticCurveTo(x, y, x, y - r); ctx.fillStyle = col; ctx.fill(); }
/* ---------- 绘制：背景 / 飘落花瓣 ---------- */
const amb = []; for (let i = 0; i < 16; i++) amb.push({ x: Math.random(), y: Math.random(), s: .5 + Math.random() * .7, v: .02 + Math.random() * .03, r: Math.random() * 6, w: Math.random() * 6, c: [2, 3, 3, 15, 14][i % 5] });
function drawBg(dt) {
  const im = IMG.bg;
  if (im && im.naturalWidth) { const s = Math.max(W / im.naturalWidth, H / im.naturalHeight); const w = im.naturalWidth * s, h = im.naturalHeight * s; ctx.drawImage(im, (W - w) / 2, (H - h) / 2, w, h); }
  else { ctx.fillStyle = '#fbe3ec'; ctx.fillRect(0, 0, W, H); }
}
function drawAmb(dt, a = 1) {
  for (const p of amb) {
    p.y += p.v * dt; p.w += dt * 1.3; p.r += dt * .8; if (p.y > 1.05) { p.y = -.05; p.x = Math.random(); }
    const x = (p.x + Math.sin(p.w) * .03) * W, y = p.y * H;
    ctx.save(); ctx.globalAlpha = .8 * a; ctx.translate(x, y); ctx.rotate(p.r); ctx.scale(p.s * .9, p.s * .7); ctx.drawImage(petalSprite(p.c), -12, -12); ctx.restore();
  }
}
/* ---------- 绘制：花篮 ---------- */
function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function drawBasket(x, yb, sz, b, o = {}) {
  // b: {c(local), need, cap, got, tier, hid, frost, lock, key}
  const gc = b.hid ? -1 : G.s.cols[b.c];
  const im = tintedBasket(gc), h = sz * 1.32, w = sz;
  const y = yb - h;
  ctx.save();
  if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;
  // 阴影
  ctx.beginPath(); ctx.ellipse(x, yb - 1, w * .42, w * .09, 0, 0, 6.283); ctx.fillStyle = 'rgba(70,20,40,.22)'; ctx.fill();
  ctx.drawImage(im, x - w / 2, y, w, h);
  // 花瓣堆
  if (!b.hid) {
    const fill = o.fill !== undefined ? o.fill : .32;
    const hw = w * .74, hh = hw * .5 * (.3 + .7 * fill);
    const my = y + h * .5;
    ctx.drawImage(heapSprite(gc), x - hw / 2, my - hh + hw * .04, hw, hh);
  } else drawBud(x, y + h * .5, w);
  if (o.dim) { ctx.globalAlpha = (o.alpha ?? 1) * o.dim; ctx.globalCompositeOperation = 'source-atop'; }
  ctx.restore();
  if (o.dim) { ctx.save(); ctx.globalAlpha = o.dim; ctx.beginPath(); ctx.ellipse(x, y + h * .66, w * .48, h * .36, 0, 0, 6.283); ctx.restore(); }
  // 数量徽章
  if (!b.hid && o.count !== false) {
    const n = o.n !== undefined ? o.n : b.need, fs = Math.max(10, Math.round(sz * .27));
    const ty = y + h * .76;
    ctx.font = `900 ${fs}px "Arial Rounded MT Bold","PingFang SC",sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const tw = ctx.measureText(n).width + fs * .7;
    ctx.globalAlpha = o.alpha ?? 1;
    rr(x - tw / 2, ty - fs * .62, tw, fs * 1.24, fs * .62); ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.fill();
    ctx.lineWidth = Math.max(1.5, sz * .03); ctx.strokeStyle = rgb(gc, .7); ctx.stroke();
    ctx.fillStyle = rgb(gc, isLight(gc) ? .55 : .85); ctx.fillText(n, x, ty + 1);
    ctx.globalAlpha = 1;
  }
  if (b.hid && o.count !== false) { const fs = Math.round(sz * .34); ctx.font = `900 ${fs}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 4; ctx.strokeStyle = '#7a4a1e'; ctx.strokeText('?', x, y + h * .74); ctx.fillStyle = '#fff'; ctx.fillText('?', x, y + h * .74); }
  if (b.tier > 1) drawBow(x, y + h * .52, w, b.tier);
  if (b.key) drawScissors(x + w * .36, y + h * .38, w * .32);
  if (b.frost > 0) drawFrost(x, y, w, h, b.frost);
  if (b.lock) drawVines(x, y, w, h);
}
function drawBud(x, y, w) {
  ctx.save(); ctx.translate(x, y - w * .08);
  const s = w / 60; ctx.scale(s, s);
  ctx.fillStyle = '#5bb85c'; for (const a of [-.9, .9]) { ctx.save(); ctx.rotate(a); ctx.beginPath(); ctx.ellipse(0, -10, 6, 14, 0, 0, 6.283); ctx.fill(); ctx.restore(); }
  const gr = ctx.createLinearGradient(0, -26, 0, 4); gr.addColorStop(0, '#ffd1e3'); gr.addColorStop(1, '#ff6fa6');
  ctx.beginPath(); ctx.moveTo(0, -28); ctx.bezierCurveTo(14, -20, 14, 2, 0, 4); ctx.bezierCurveTo(-14, 2, -14, -20, 0, -28); ctx.fillStyle = gr; ctx.fill();
  ctx.strokeStyle = '#e04c88'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(0, -24); ctx.quadraticCurveTo(5, -10, 0, 2); ctx.stroke();
  ctx.fillStyle = '#4aa64f'; ctx.beginPath(); ctx.moveTo(-10, 2); ctx.quadraticCurveTo(0, -8, 10, 2); ctx.quadraticCurveTo(0, 8, -10, 2); ctx.fill();
  ctx.restore();
}
function drawBow(x, y, w, tier) {
  ctx.save(); ctx.translate(x, y); const s = w / 60; ctx.scale(s, s);
  const col = tier >= 3 ? ['#fff3a0', '#ffb300', '#b86e00'] : ['#ffe0ee', '#ff6fa6', '#b02a63'];
  for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(d * 14, -14, d * 26, -4, d * 20, 8); ctx.bezierCurveTo(d * 14, 12, d * 6, 4, 0, 0); const g = ctx.createLinearGradient(0, -10, 0, 10); g.addColorStop(0, col[0]); g.addColorStop(1, col[1]); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = col[2]; ctx.lineWidth = 1.5; ctx.stroke(); }
  ctx.beginPath(); ctx.arc(0, 1, 5, 0, 6.283); ctx.fillStyle = col[1]; ctx.fill(); ctx.stroke();
  if (tier >= 3) { star4(0, -14, 7, '#fffbe0'); }
  ctx.restore();
}
function drawScissors(x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s / 24, s / 24);
  ctx.beginPath(); ctx.arc(0, 0, 13, 0, 6.283); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#f0508f'; ctx.lineWidth = 2.5; ctx.stroke();
  ctx.rotate(-.6); ctx.strokeStyle = '#7a8a9a'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-2, -2); ctx.lineTo(8, -8); ctx.moveTo(-2, 2); ctx.lineTo(8, 8); ctx.stroke();
  ctx.strokeStyle = '#f0508f'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(-6, -4, 3.4, 0, 6.283); ctx.stroke(); ctx.beginPath(); ctx.arc(-6, 4, 3.4, 0, 6.283); ctx.stroke();
  ctx.restore();
}
function drawFrost(x, y, w, h, n) {
  ctx.save();
  const bx = x - w * .52, by = y + h * .18, bw = w * 1.04, bh = h * .84;
  rr(bx, by, bw, bh, w * .18);
  const g = ctx.createLinearGradient(bx, by, bx + bw, by + bh); g.addColorStop(0, 'rgba(235,250,255,.88)'); g.addColorStop(.5, 'rgba(170,225,255,.72)'); g.addColorStop(1, 'rgba(120,190,245,.85)');
  ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(bx + bw * .15, by + bh * .2); ctx.lineTo(bx + bw * .4, by + bh * .1); ctx.moveTo(bx + bw * .12, by + bh * .35); ctx.lineTo(bx + bw * .3, by + bh * .3); ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.stroke();
  // 雪花
  ctx.translate(x, by + bh * .5); const s = w / 60;
  ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2 * s; for (let i = 0; i < 6; i++) { ctx.rotate(Math.PI / 3); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -20 * s); ctx.moveTo(0, -12 * s); ctx.lineTo(5 * s, -17 * s); ctx.moveTo(0, -12 * s); ctx.lineTo(-5 * s, -17 * s); ctx.stroke(); }
  ctx.font = `900 ${Math.round(w * .4)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 5; ctx.strokeStyle = '#2f72e6'; ctx.strokeText(n, 0, 2); ctx.fillStyle = '#fff'; ctx.fillText(n, 0, 2);
  ctx.restore();
}
function drawVines(x, y, w, h) {
  ctx.save(); ctx.lineCap = 'round';
  const s = w / 60;
  for (const [a, b2, c2, d] of [[-.55, .25, .55, .95], [.55, .2, -.55, .9]]) {
    ctx.beginPath(); ctx.moveTo(x + a * w, y + b2 * h); ctx.bezierCurveTo(x, y + (b2 + .3) * h, x, y + (d - .3) * h, x + c2 * w, y + d * h);
    ctx.strokeStyle = '#2e7d32'; ctx.lineWidth = 7 * s; ctx.stroke(); ctx.strokeStyle = '#66bb6a'; ctx.lineWidth = 4 * s; ctx.stroke();
  }
  ctx.fillStyle = '#43a047';
  for (const [lx, ly, ang] of [[-.3, .38, -.6], [.32, .5, .7], [-.25, .75, .5], [.28, .8, -.4]]) { ctx.save(); ctx.translate(x + lx * w, y + ly * h); ctx.rotate(ang); ctx.beginPath(); ctx.ellipse(0, 0, 8 * s, 4 * s, 0, 0, 6.283); ctx.fill(); ctx.restore(); }
  // 锁花
  ctx.translate(x, y + h * .58); ctx.scale(s, s);
  ctx.beginPath(); ctx.arc(0, 0, 13, 0, 6.283); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#2e7d32'; ctx.lineWidth = 2.5; ctx.stroke();
  ctx.rotate(-.6); ctx.strokeStyle = '#7a8a9a'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(-2, -2); ctx.lineTo(8, -8); ctx.moveTo(-2, 2); ctx.lineTo(8, 8); ctx.stroke();
  ctx.strokeStyle = '#f0508f'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(-6, -4, 3.2, 0, 6.283); ctx.stroke(); ctx.beginPath(); ctx.arc(-6, 4, 3.2, 0, 6.283); ctx.stroke();
  ctx.restore();
}
/* ---------- 绘制：画框 / 传送带 / 队列 ---------- */
function drawFrame() {
  const { px, py, P: S, f } = LY;
  ctx.save();
  ctx.shadowColor = 'rgba(120,30,70,.35)'; ctx.shadowBlur = 18 * LY.u; ctx.shadowOffsetY = 6 * LY.u;
  rr(px - f, py - f, S + f * 2, S + f * 2, f * 1.8); ctx.fillStyle = '#fff'; ctx.fill();
  ctx.restore();
  rr(px - f, py - f, S + f * 2, S + f * 2, f * 1.8); ctx.lineWidth = 3; ctx.strokeStyle = '#ffb3d0'; ctx.stroke();
  rr(px - 2, py - 2, S + 4, S + 4, f); ctx.fillStyle = '#fbf3ea'; ctx.fill();
  ctx.save(); rr(px - 2, py - 2, S + 4, S + 4, f); ctx.clip();
  // 温室玻璃格
  ctx.strokeStyle = 'rgba(214,180,150,.25)'; ctx.lineWidth = 1;
  for (let i = 1; i < 6; i++) { const t = px + S * i / 6; ctx.beginPath(); ctx.moveTo(t, py); ctx.lineTo(t, py + S); ctx.stroke(); const v = py + S * i / 6; ctx.beginPath(); ctx.moveTo(px, v); ctx.lineTo(px + S, v); ctx.stroke(); }
  if (picCv) { ctx.imageSmoothingEnabled = true; ctx.drawImage(picCv, px, py, S, S); }
  // 胜利时重现原画
  if (G.winT >= 0) { const a = Math.min(1, G.winT / .9); ctx.globalAlpha = a; ctx.imageSmoothingEnabled = false; ctx.drawImage(thumb(G.li), px, py, S, S); ctx.imageSmoothingEnabled = true; ctx.globalAlpha = 1; const sx = px - S + (S * 3) * Math.min(1, G.winT / 1.2); const gr = ctx.createLinearGradient(sx - 40, py, sx + 40, py + S); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.5, 'rgba(255,255,255,.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = gr; ctx.fillRect(px, py, S, S); }
  // 玻璃反光
  const gl = ctx.createLinearGradient(px, py, px + S * .6, py + S * .6); gl.addColorStop(0, 'rgba(255,255,255,.18)'); gl.addColorStop(.5, 'rgba(255,255,255,0)'); ctx.fillStyle = gl; ctx.fillRect(px, py, S, S);
  ctx.restore();
  // 角花
  for (const [cx, cy, s] of [[px - f * .4, py - f * .4, 1], [px + S + f * .4, py - f * .4, .8]]) flower(cx, cy, 11 * LY.u * s, '#ff8fbb', '#ffe066');
  // 底部收集槽
  const gy = py + S + f * .5;
  ctx.fillStyle = '#7cc47f';
  for (let i = 0; i < 9; i++) { const lx = px + S * (i + .5) / 9; ctx.save(); ctx.translate(lx, gy + 2); ctx.rotate(i % 2 ? .5 : -.5); ctx.beginPath(); ctx.ellipse(0, 0, 7 * LY.u, 3 * LY.u, 0, 0, 6.283); ctx.fill(); ctx.restore(); }
}
function flower(x, y, r, pc, cc) { ctx.save(); ctx.translate(x, y); ctx.fillStyle = pc; for (let i = 0; i < 5; i++) { ctx.rotate(1.2566); ctx.beginPath(); ctx.ellipse(0, -r * .6, r * .42, r * .6, 0, 0, 6.283); ctx.fill(); } ctx.beginPath(); ctx.arc(0, 0, r * .34, 0, 6.283); ctx.fillStyle = cc; ctx.fill(); ctx.restore(); }
let tread = 0;
function drawBelt(dt) {
  const s = G.s, cap = s.cap, a = slotPos(0), b = slotPos(cap - 1), sp = cap > 1 ? b.x - slotPosX1() : 50;
  const half = Math.min(56 * LY.u, (W - 28) / cap) / 2;
  const x0 = a.x - half - 6, x1 = b.x + half + 6, y = LY.beltBase - 8 * LY.u, h = 18 * LY.u;
  const moving = s.belt.some(q => q && q.st === 'idle' && q.need > 0) && s.took > 0;
  if (moving) tread += dt * 40;
  ctx.save();
  rr(x0, y, x1 - x0, h, h / 2); const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#f6d9a8'); g.addColorStop(.5, '#e2b277'); g.addColorStop(1, '#b97f45'); ctx.fillStyle = g; ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = '#8a5a2b'; ctx.stroke();
  ctx.clip(); ctx.strokeStyle = 'rgba(120,70,30,.35)'; ctx.lineWidth = 2;
  for (let xx = x0 - 20 + (tread % 14); xx < x1 + 20; xx += 14) { ctx.beginPath(); ctx.moveTo(xx, y + 2); ctx.lineTo(xx - 5, y + h - 2); ctx.stroke(); }
  ctx.restore();
  // 藤蔓装饰
  ctx.strokeStyle = '#4caf50'; ctx.lineWidth = 2.5 * LY.u; ctx.beginPath();
  for (let xx = x0 + 6; xx <= x1 - 6; xx += 4) { const yy = y + h + 3 * LY.u + Math.sin(xx * .08) * 2.5 * LY.u; xx === x0 + 6 ? ctx.moveTo(xx, yy) : ctx.lineTo(xx, yy); } ctx.stroke();
  // 槽位
  for (let i = 0; i < cap; i++) {
    const p = slotPos(i);
    ctx.beginPath(); ctx.ellipse(p.x, p.y - 2, p.sz * .4, p.sz * .12, 0, 0, 6.283);
    ctx.fillStyle = s.belt[i] ? 'rgba(255,255,255,.25)' : 'rgba(255,255,255,.65)'; ctx.fill();
    if (!s.belt[i]) { ctx.setLineDash([4, 3]); ctx.strokeStyle = '#c9457f'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.setLineDash([]); }
    if (G.slotGlow > 0 && i === cap - 1) { ring(p.x, p.y - p.sz * .5, '#fff', 8, 40); }
  }
  if (G.slotGlow > 0) G.slotGlow = 0;
  // 篮位计数
  const used = s.belt.filter(Boolean).length;
  const lx = x1 - 2, ly = y - LY.beltBase + LY.py + LY.P + LY.f + 12; // 标签放在画框下右侧
  ctx.font = `800 ${Math.round(12 * LY.u)}px sans-serif`; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  const txt = `篮位 ${used}/${cap}`; const tw = ctx.measureText(txt).width + 14;
  rr(lx - tw, LY.py + LY.P + LY.f + 4, tw, 18 * LY.u, 9 * LY.u); ctx.fillStyle = used >= cap ? '#f0508f' : 'rgba(255,255,255,.9)'; ctx.fill();
  ctx.fillStyle = used >= cap ? '#fff' : '#c9457f'; ctx.fillText(txt, lx - 7, LY.py + LY.P + LY.f + 4 + 9 * LY.u);
}
function slotPosX1() { return slotPos(Math.max(0, G.s.cap - 2)).x; }
function drawBeltBaskets() {
  const s = G.s;
  // 先画幽灵（合并飞入）
  for (let i = 0; i < s.cap; i++) {
    const b = s.belt[i]; if (!b) continue; const p = slotPos(i);
    if (b.st === 'ghost') { const t = 1 - b.t / SIM.T_MERGE, q = slotPos(b.to), e = t * t; const x = p.x + (q.x - p.x) * e, y = p.y - Math.sin(t * Math.PI) * 30 * LY.u; drawBasket(x, y, p.sz * (1 - .3 * e), { c: b.c, need: 0, tier: 1 }, { alpha: 1 - e * .7, count: false, fill: .6 }); }
  }
  for (let i = 0; i < s.cap; i++) {
    const b = s.belt[i]; if (!b || b.st === 'ghost') continue; const p = slotPos(i);
    let x = p.x, y = p.y, sz = p.sz * [1, 1, 1.12, 1.22][b.tier], alpha = 1;
    const fill = Math.min(1, b.got / b.cap);
    if (b.st === 'fly') {
      const t = 1 - b.t / SIM.T_PLACE, e = 1 - (1 - t) * (1 - t);
      const q = qPos(b.from, 0); x = q.x + (p.x - q.x) * e; y = q.y + (p.y - q.y) * e - Math.sin(t * Math.PI) * 50 * LY.u; sz = q.sz + (sz - q.sz) * e;
    } else if (b.st === 'merge') { const t = 1 - b.t / SIM.T_MERGE; sz *= 1 + .25 * Math.sin(t * Math.PI); }
    else if (b.st === 'done') { const t = 1 - b.t / SIM.T_DONE; y -= t * t * 70 * LY.u; sz *= 1 + .15 * Math.sin(Math.min(1, t * 2) * Math.PI); alpha = 1 - Math.max(0, (t - .55) / .45); }
    const an = G.anim[b.id]; if (an && an.sh > 0) x += Math.sin(an.sh * 40) * 4 * an.sh;
    drawBasket(x, y, sz, b, { fill: b.st === 'done' ? 1 : .15 + fill * .85, alpha, n: Math.max(0, b.need) });
    if (G.beeMode && b.st !== 'done' && b.need > 0) { ctx.save(); ctx.globalAlpha = .5 + .5 * Math.sin(G.time * 8); ctx.beginPath(); ctx.ellipse(x, y - sz * .6, sz * .62, sz * .78, 0, 0, 6.283); ctx.strokeStyle = '#ffe066'; ctx.lineWidth = 3; ctx.stroke(); ctx.restore(); }
  }
}
function drawQueue(dt) {
  const s = G.s, { C, fb } = colInfo();
  for (let ci = 0; ci < C; ci++) {
    const col = s.columns[ci];
    const show = Math.min(col.length, 3);
    for (let k = show - 1; k >= 0; k--) {
      const b = col[k], p = qPos(ci, k);
      let sz = p.sz, x = p.x;
      if (G.qAnim > 0) { const t = Math.max(0, Math.min(1, (G.qAnim - k * .08 - ci * .04) / .3)); sz *= .4 + .6 * (1 - Math.sin(t * Math.PI) * .6); }
      const an = G.anim[b.id]; if (an && an.sh > 0) x += Math.sin(an.sh * 40) * 5 * an.sh;
      if (an && an.pop > 0) sz *= 1 + .3 * Math.sin(an.pop * Math.PI);
      drawBasket(x, p.y, sz, b, { alpha: k === 0 ? 1 : k === 1 ? .82 : .62, fill: .35 });
    }
    if (col.length > 3) { const p = qPos(ci, 3); ctx.font = `900 ${Math.round(13 * LY.u)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; const t = '+' + (col.length - 3); const tw = ctx.measureText(t).width + 12; rr(p.x - tw / 2, p.y - 18 * LY.u, tw, 18 * LY.u, 9 * LY.u); ctx.fillStyle = 'rgba(160,40,96,.8)'; ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillText(t, p.x, p.y - 9 * LY.u); }
    if (!col.length) { const p = qPos(ci, 0); ctx.beginPath(); ctx.ellipse(p.x, p.y - 4, fb * .36, fb * .1, 0, 0, 6.283); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fill(); }
  }
  for (const id in G.anim) { const a = G.anim[id]; if (a.sh > 0) a.sh = Math.max(0, a.sh - dt * 2.2); if (a.pop > 0) a.pop = Math.max(0, a.pop - dt * 2.5); }
  if (G.qAnim > 0) G.qAnim = Math.max(0, G.qAnim - dt);
}
function drawQueuePanel() {
  const { u, qTop, propsTop } = LY;
  const x = 8, y = qTop - 10 * u, w = W - 16, h = propsTop - y + 4;
  ctx.save(); rr(x, y, w, h, 22 * u); const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, 'rgba(255,248,252,.72)'); g.addColorStop(1, 'rgba(255,228,240,.55)'); ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.stroke(); ctx.restore();
}
/* ---------- 小蜜蜂（道具动画 + 待机飞行） ---------- */
function drawBee(dt) {
  const im = IMG.ic_bee; if (!im || !im.naturalWidth) return;
  if (G.bee) {
    const b = G.bee; b.t += dt; const p = slotPos(b.si); const u = Math.min(1, b.t / .7), e = 1 - (1 - u) * (1 - u);
    const x = b.x0 + (p.x - b.x0) * e + Math.sin(u * 9) * 20 * (1 - u), y = b.y0 + (p.y - p.sz * 1.4 - b.y0) * e - Math.sin(u * Math.PI) * 60;
    const s = 64 * LY.u; ctx.drawImage(im, x - s / 2, y - s / 2 + Math.sin(G.time * 20) * 2, s, s * im.naturalHeight / im.naturalWidth);
    if (b.t >= .7 && !b.done) { b.done = true; SIM.beeFill(G.s, b.si); handleEvents(); }
    if (b.t > 1.4) G.bee = null;
    return;
  }
  // 待机：画框右上角的小蜜蜂
  const m = IMG.mascot; if (!m || !m.naturalWidth) return;
  const s = 44 * LY.u, x = LY.px + s * .05 + Math.sin(G.time * 1.3) * 4, y = LY.py + LY.P + LY.f + s * .2 + Math.sin(G.time * 2.6) * 3;
  ctx.drawImage(m, x - s / 2, y - s / 2, s, s * m.naturalHeight / m.naturalWidth);
}
/* ---------- 事件处理 ---------- */
let tinkCount = 0;
function handleEvents() {
  const s = G.s, gs = LY.gs; let takes = 0;
  for (const e of s.ev) {
    switch (e.t) {
      case 'take': { takes++; if ((takes & 1) === 0 || P.n < 300) spawnPetal(LY.px + (e.x + .5) * gs, LY.py + (e.y + .5) * gs, e.si, e.c); const b = s.belt[e.si]; if (b && ++tinkCount % 6 === 0) SND.play('tink', Math.min(1, b.got / b.cap)); break; }
      case 'bee': { const n = e.cells.length, step = Math.max(1, Math.floor(n / 260)); for (let k = 0; k < n; k += step) { const i = e.cells[k]; spawnPetal(LY.px + ((i % GW) + .5) * gs, LY.py + (Math.floor(i / GW) + .5) * gs, e.si, e.c, Math.random() * .35); } SND.play('bee'); break; }
      case 'place': SND.play('place'); break;
      case 'merge': { const p = slotPos(e.into); setTimeout(() => { burst(p.x, p.y - p.sz * .7, s.cols[e.c], 18, 180); sparkle(p.x, p.y - p.sz * .7, 10); ring(p.x, p.y - p.sz * .6, '#fff', 10, 70); txtPop(p.x, p.y - p.sz * 1.2, '合并！', '#ffe066'); }, 330); SND.play('merge'); onMergeTut(); break; }
      case 'full': { const p = slotPos(e.si); burst(p.x, p.y - p.sz * .8, s.cols[s.belt[e.si].c], 12, 150); sparkle(p.x, p.y - p.sz, 7); SND.play('full', e.tier); if (e.key) { txtPop(p.x, p.y - p.sz * 1.3, '咔嚓！', '#fff'); } break; }
      case 'reveal': { const p = qPos(e.ci, 0); burst(p.x, p.y - p.sz * .6, s.cols[s.columns[e.ci][0].c], 10, 120); ring(p.x, p.y - p.sz * .6, '#fff', 6, 50); SND.play('reveal'); G.anim[s.columns[e.ci][0].id] = { pop: 1 }; break; }
      case 'thaw': { const p = findQ(e.id); if (p) { sparkle(p.x, p.y - p.sz * .6, 12); ring(p.x, p.y - p.sz * .6, '#bfe8ff', 6, 50); } SND.play('thaw'); break; }
      case 'unlock': { const p = findQ(e.id); if (p) { burst(p.x, p.y - p.sz * .6, 8 + 0, 10, 120); ring(p.x, p.y - p.sz * .6, '#8bd64a', 6, 50); } SND.play('snip'); break; }
    }
  }
  s.ev.length = 0;
}
/* ---------- 点击 ---------- */
function doTap(ci, fromBot) {
  const s = G.s, col = s.columns[ci]; if (!col.length) return false;
  const b = col[0];
  if (b.frost) { G.anim[b.id] = { sh: 1 }; SND.play('deny'); if (!fromBot) toast(`冰封中：再装满 ${b.frost} 个花篮就融化`); return false; }
  if (b.lock) { G.anim[b.id] = { sh: 1 }; SND.play('deny'); if (!fromBot) toast('藤蔓锁：装满带剪刀的花篮才能剪开'); return false; }
  const si = SIM.tap(s, ci);
  if (si < 0) { G.anim[b.id] = { sh: 1 }; SND.play('deny'); if (!fromBot) toast('篮位满啦！等花篮装满，或用道具加篮位'); return false; }
  SND.play('tap'); handleEvents();
  if (G.tutStep === 1) { G.tutStep = 2; showTut('花篮会自动收集画面<b>最底层</b>的同色花瓣，装满就会飞走～'); setTimeout(() => { if (G.tutStep === 2) { G.tutStep = 3; showTut('把整幅花画的花瓣<b>全部收集</b>就过关啦！'); setTimeout(() => { if (G.tutStep === 3) { hideTut(); G.tutStep = 0; save.tut.t1 = 1; persist(); } }, 3200); } }, 3200); }
  return true;
}
function onMergeTut() { if (G.tutStep === 10) { G.tutStep = 11; showTut('太棒了！三个同色花篮合并成了<b>大花篮</b>，收集更快、还腾出了篮位！'); setTimeout(() => { hideTut(); G.tutStep = 0; save.tut.t2 = 1; persist(); }, 3600); } }
function pointer(e) {
  if (G.scr !== 'game' || G.paused || G.over || G.winT >= 0) return;
  SND.unlock();
  const t = e.touches ? e.touches[0] : e; const x = t.clientX, y = t.clientY;
  const s = G.s;
  if (G.beeMode) {
    for (let i = 0; i < s.cap; i++) { const b = s.belt[i]; if (!b || b.st === 'ghost' || b.st === 'done' || b.need <= 0) continue; const p = slotPos(i); if (Math.abs(x - p.x) < p.sz * .6 && y > p.y - p.sz * 1.45 && y < p.y + 10) { useBee(i); return; } }
    return;
  }
  const { C } = colInfo();
  for (let ci = 0; ci < C; ci++) { if (!s.columns[ci].length) continue; const p = qPos(ci, 0); if (Math.abs(x - p.x) < Math.max(p.sz * .6, 30) && y > p.y - p.sz * 1.4 && y < p.y + 12) { doTap(ci); return; } }
}
if (window.PointerEvent) cv.addEventListener('pointerdown', pointer); else cv.addEventListener('touchstart', e => { e.preventDefault(); pointer(e); }, { passive: false });
/* ---------- 道具 ---------- */
function updProps() {
  document.querySelectorAll('.prop').forEach(el => { const k = el.dataset.p, n = save.props[k]; const em = el.querySelector('em'); em.textContent = n > 0 ? n : '+'; em.className = n > 0 ? '' : 'buy'; el.classList.toggle('act', k === 'bee' && G.beeMode); });
}
function setMode(on) { G.beeMode = on; $('mode').classList.toggle('on', on); updProps(); }
function useProp(k) {
  if (G.scr !== 'game' || G.paused || G.over || G.winT >= 0) return;
  SND.unlock();
  if (save.props[k] <= 0) { SND.play('deny'); toast('道具用完啦～ 过关可获得新的道具'); return; }
  const s = G.s;
  if (k === 'slot') {
    if (s.cap >= MAXSLOT) { toast('篮位已经最多啦'); return; }
    SIM.addSlot(s); save.props.slot--; G.used++; G.slotGlow = 1; SND.play('slot'); const p = slotPos(s.cap - 1); sparkle(p.x, p.y - 20, 12); txtPop(p.x, p.y - 50 * LY.u, '+1 篮位', '#fff');
  } else if (k === 'bee') {
    if (G.beeMode) { setMode(false); return; }
    if (G.bee) return;
    if (!s.belt.some(b => b && b.st !== 'ghost' && b.st !== 'done' && b.need > 0)) { toast('传送带上还没有花篮哦'); return; }
    setMode(true); return;
  } else if (k === 'shuffle') {
    if (!SIM.shuffleQueue(s)) { toast('没有可以换的花篮啦'); return; }
    save.props.shuffle--; G.used++; G.qAnim = .6; SND.play('shuffle'); handleEvents();
  }
  persist(); updProps();
}
function useBee(si) {
  const el = document.querySelector('.prop[data-p=bee]').getBoundingClientRect();
  G.bee = { si, t: 0, x0: el.left + el.width / 2, y0: el.top, done: false };
  save.props.bee--; G.used++; persist(); setMode(false); SND.play('click');
}
document.querySelectorAll('.prop').forEach(el => el.addEventListener('click', () => useProp(el.dataset.p)));
$('modeX').onclick = () => setMode(false);
/* ---------- HUD / 提示 ---------- */
function updHud() { const s = G.s; const pct = Math.floor((1 - s.left / G.total) * 100); $('hPct').textContent = pct + '%'; $('hBar').style.width = pct + '%'; }
let toastT = 0; function toast(t) { const el = $('toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), 1700); }
function showTut(html, hand) { $('tutTxt').innerHTML = html; const t = $('tut'); t.style.top = Math.round(LY.py + LY.P * .04) + 'px'; t.style.bottom = 'auto'; t.classList.add('on'); G.hand = !!hand; }
function hideTut() { $('tut').classList.remove('on'); G.hand = false; $('hand').style.display = 'none'; }
function placeHand() {
  const h = $('hand');
  if (!G.hand || G.scr !== 'game' || G.paused) { h.style.display = 'none'; return; }
  const pk = SIM.botPick(G.s); if (pk.best < 0 || pk.free <= 0) { h.style.display = 'none'; return; }
  const p = qPos(pk.best, 0); h.style.display = 'block'; h.style.left = (p.x - 10) + 'px'; h.style.top = (p.y - p.sz * .55) + 'px';
}
/* ---------- 新机制介绍 ---------- */
function showFeat(kind) {
  const info = {
    hid: ['花苞盲篮', '盖着<b>花苞</b>的花篮看不出颜色，<br>排到<b>最前排</b>时就会绽放、露出颜色！'],
    frost: ['冰封花篮', '被<b>冰块</b>冻住的花篮暂时不能点，<br>每<b>装满一个</b>花篮，冰就融化一层！'],
    lock: ['藤蔓锁', '缠着<b>藤蔓</b>的花篮被锁住了，<br>把带<b>小剪刀</b>的花篮装满，就能剪开藤蔓！'] }[kind];
  $('ftTitle').textContent = info[0]; $('ftInfo').innerHTML = info[1];
  const imgs = [kind];
  if (kind === 'lock') imgs.push('key');
  $('ftImgs').innerHTML = '';
  for (const kk of imgs) { const im = new Image(); im.src = featImage(kk); $('ftImgs').appendChild(im); }
  G.paused = true; showScr('feat', true);
  $('ftOk').onclick = () => { SND.play('click'); save.tut['f_' + kind] = 1; persist(); G.paused = false; showScr('game'); startTut(); };
}
function featImage(kind) {
  const k = document.createElement('canvas'); const s = 2; k.width = 110 * s; k.height = 120 * s; const c2 = k.getContext('2d'); c2.scale(s, s);
  const saved = ctx; ctx = c2;
  const b = { c: 0, need: 80, cap: 80, tier: 1, hid: kind === 'hid', frost: kind === 'frost' ? 3 : 0, lock: kind === 'lock', key: kind === 'key' };
  drawBasket(55, 114, 80, b, { fill: .35 }); ctx = saved;
  return k.toDataURL();
}
/* ---------- 屏幕切换 ---------- */
const SCR = ['load', 'menu', 'levels', 'pause', 'win', 'fail', 'feat'];
function showScr(n, overlay) {
  if (!overlay) G.scr = n;
  SCR.forEach(k => $(k).classList.toggle('on', k === n));
  const ing = n === 'game' || !!overlay;
  $('hud').classList.toggle('on', ing); $('props').classList.toggle('on', !!(ing && n === 'game' || (overlay && n === 'feat')));
  if (n !== 'game') { $('mode').classList.remove('on'); }
  if (n === 'menu') { BEE.r = null; $('mStat').textContent = `已收藏 ${Object.keys(save.stars).length}/${LEVELS.length} 幅花画 · ★${Object.values(save.stars).reduce((a, b) => a + b, 0)}`; }
}
function toMenu() { G.s = null; hideTut(); showScr('menu'); }
function showLevels() {
  const g = $('grid'); g.innerHTML = '';
  const tot = Object.values(save.stars).reduce((a, b) => a + b, 0);
  $('lvTot').textContent = `已收藏 ${Object.keys(save.stars).length} 幅 · ★ ${tot}/${LEVELS.length * 3}`;
  LEVELS.forEach((L, i) => {
    const b = document.createElement('button'); b.className = 'lv';
    const st = save.stars[i + 1] || 0, locked = i + 1 > save.max;
    if (locked) { b.classList.add('lock'); b.innerHTML = `<svg width="22" height="26" viewBox="0 0 22 26"><rect x="2" y="11" width="18" height="13" rx="3" fill="#fff"/><path d="M6 11V8a5 5 0 0 1 10 0v3" stroke="#fff" stroke-width="3" fill="none"/></svg><div class="s">${i + 1}</div>`; }
    else if (st) { b.classList.add('done'); const c = document.createElement('canvas'); c.width = GW; c.height = GH; c.getContext('2d').drawImage(thumb(i), 0, 0); b.appendChild(c); b.insertAdjacentHTML('beforeend', `<b>${i + 1}</b><div class="s">${'<i>★</i>'.repeat(st)}${'☆'.repeat(3 - st)}</div>`); }
    else { b.innerHTML = `${i + 1}<div class="s">${L.name}</div>`; if (i + 1 === save.max) b.classList.add('cur'); }
    b.onclick = () => { SND.unlock(); SND.play('click'); if (locked) { toast('先完成前面的花画吧'); return; } startLevel(i); };
    g.appendChild(b);
  });
  showScr('levels');
  const cur = g.children[Math.min(save.max, LEVELS.length) - 1]; if (cur) setTimeout(() => cur.scrollIntoView({ block: 'center' }), 30);
}
/* ---------- 胜负 ---------- */
function onWin() {
  G.over = true; G.winT = 0; SND.play('win'); try{GT.win(G.li+1,{stars:G.used===0?3:G.used<=2?2:1,props:G.used})}catch(_e){}
  const p = { x: LY.px + LY.P / 2, y: LY.py + LY.P / 2 };
  for (let i = 0; i < 6; i++) setTimeout(() => { const c = G.s ? G.s.cols[(Math.random() * G.s.cols.length) | 0] : 2; burst(p.x + (Math.random() - .5) * LY.P, p.y + (Math.random() - .5) * LY.P * .6, c, 16, 220); sparkle(p.x + (Math.random() - .5) * LY.P, p.y + (Math.random() - .5) * LY.P, 8); }, i * 160);
  setTimeout(showWin, 1700);
}
function showWin() {
  if (G.scr !== 'game') return;
  const li = G.li, stars = G.used === 0 ? 3 : G.used <= 2 ? 2 : 1;
  const first = !save.stars[li + 1];
  save.stars[li + 1] = Math.max(save.stars[li + 1] || 0, stars);
  if (li + 2 > save.max) save.max = Math.min(LEVELS.length, li + 2);
  let rw = '';
  if (first) { const k = ['slot', 'bee', 'shuffle'][li % 3]; const n = stars === 3 ? 2 : 1; save.props[k] += n; rw = `<div class="reward"><img src="assets/ic_${k}.webp">${{ slot: '加篮位', bee: '蜜蜂采蜜', shuffle: '换一换' }[k]} +${n}</div>`; }
  persist(); updProps();
  const sp = $('wStars').children; for (let i = 0; i < 3; i++) { sp[i].className = ''; if (i < stars) setTimeout(() => { sp[i].className = 'on'; SND.play('star', i); }, 300 + i * 260); }
  const tc = $('wThumb').getContext('2d'); tc.imageSmoothingEnabled = false; tc.clearRect(0, 0, 192, 192); tc.drawImage(thumb(li), 0, 0, 192, 192);
  $('wTitle').textContent = li + 1 === LEVELS.length ? '全部花画完成！' : '花画完成！';
  $('wInfo').innerHTML = `收藏了一幅《<b>${LEVELS[li].name}</b>》` + (G.used ? `<br>使用道具 ${G.used} 次` : '<br>没用道具，<b>完美！</b>');
  $('wReward').innerHTML = rw;
  $('wNext').style.display = li + 1 < LEVELS.length ? '' : 'none';
  showScr('win', true);
}
function onFail() {
  G.over = true; SND.play('fail'); try{GT.fail(G.li+1,{r:'stuck',left:Math.round(G.s.left/G.total*100)})}catch(_e){}
  setTimeout(() => {
    if (G.scr !== 'game') return;
    $('fInfo').innerHTML = `传送带上的花篮收不到花瓣了<br>还剩 <b>${Math.max(1, Math.round(G.s.left / G.total * 100))}%</b> 的花瓣没收集`;
    const fr = $('fRevive');
    if (G.s.cap < MAXSLOT && (save.props.slot > 0 || !G.revived)) { fr.style.display = ''; fr.textContent = save.props.slot > 0 ? '用「加篮位」继续' : '免费加 1 个篮位继续'; }
    else if (save.props.bee > 0) { fr.style.display = ''; fr.textContent = '请小蜜蜂帮忙继续'; }
    else fr.style.display = 'none';
    showScr('fail', true);
  }, 700);
}
$('fRevive').onclick = () => {
  SND.play('click'); const s = G.s;
  showScr('game'); G.over = false; s.stuck = 0; try{GT.revive('prop')}catch(_e){}
  if (s.cap < MAXSLOT && (save.props.slot > 0 || !G.revived)) { if (save.props.slot > 0) save.props.slot--; else G.revived = true; SIM.addSlot(s); G.used++; G.slotGlow = 1; SND.play('slot'); }
  else if (save.props.bee > 0) { setMode(true); }
  persist(); updProps();
};
$('fRetry').onclick = () => { SND.play('click'); startLevel(G.li); };
$('fMenu').onclick = () => { SND.play('click'); showLevels(); G.s = null; };
$('wRetry').onclick = () => { SND.play('click'); startLevel(G.li); };
$('wMenu').onclick = () => { SND.play('click'); G.s = null; showLevels(); };
$('wNext').onclick = () => { SND.play('click'); startLevel(Math.min(LEVELS.length - 1, G.li + 1)); };
$('hPause').onclick = () => { if (G.scr !== 'game' || G.over) return; SND.play('click'); G.paused = true; try{GT.pause()}catch(_e){} $('pInfo').innerHTML = `第 ${G.li + 1} 关 ·《${LEVELS[G.li].name}》`; syncTg(); showScr('pause', true); };
$('pResume').onclick = () => { SND.play('click'); G.paused = false; showScr('game'); };
$('pRestart').onclick = () => { SND.play('click'); startLevel(G.li); };
$('pQuit').onclick = () => { SND.play('click'); try{GT.quit('menu')}catch(_e){} G.s = null; hideTut(); showLevels(); };
$('bPlay').onclick = () => { SND.unlock(); SND.play('click'); try{GT.title('play')}catch(_e){} if (save.music) SND.startMusic(); startLevel(Math.min(save.max, LEVELS.length) - 1); };
$('bLevels').onclick = () => { SND.unlock(); SND.play('click'); try{GT.title('levels')}catch(_e){} if (save.music) SND.startMusic(); showLevels(); };
$('lvBack').onclick = () => { SND.play('click'); showScr('menu'); };
// 返回 Tilo 游戏屋：先存档再离开
function goHub(e) { if (e) e.stopPropagation(); persist(); try { SND.play('click'); } catch (_) { } try{GT.hub(e&&e.currentTarget&&e.currentTarget.id)}catch(_e){} location.href = '../'; }
for (const id of ['mHub', 'pHub', 'wHub', 'fHub']) $(id).onclick = goHub;
function syncTg() { for (const id of ['mMusic', 'pMusic']) $(id).classList.toggle('off', !save.music); for (const id of ['mSfx', 'pSfx']) $(id).classList.toggle('off', !save.sfx); }
function tgMusic() { SND.unlock(); save.music = !save.music; try{GT.sound('music',save.music)}catch(_e){} SND.setMusic(save.music); if (save.music) SND.startMusic(); persist(); syncTg(); }
function tgSfx() { SND.unlock(); save.sfx = !save.sfx; try{GT.sound('sfx',save.sfx)}catch(_e){} SND.setSfx(save.sfx); persist(); syncTg(); SND.play('click'); }
$('mMusic').onclick = $('pMusic').onclick = tgMusic; $('mSfx').onclick = $('pSfx').onclick = tgSfx;
document.addEventListener('pointerdown', () => { SND.unlock(); if (save.music && !SND.playing && G.scr !== 'load') SND.startMusic(); }, { capture: true });
document.addEventListener('visibilitychange', () => { if (document.hidden && G.scr === 'game' && !G.over && !G.paused) $('hPause').onclick(); });
/* ---------- 封面蜜蜂：透明底序列帧（24fps · 96 帧无缝循环） ---------- */
const BEE = { fw: 436, fh: 477, cols: 6, per: 24, n: 96, fps: 24, body: [56, 63, 380, 451], basket: [305, 350], sheets: [], ok: false, t: 0, petals: [], cd: .6 };
function loadBee() {
  let left = 4, failed = false;
  for (let i = 0; i < 4; i++) {
    const im = new Image(); let tried = false;
    im.onload = () => {
      // 解码一次后转成画布，避免每帧重复解码大图（低端机/软件渲染下尤为明显）
      try { const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; c.getContext('2d').drawImage(im, 0, 0); BEE.sheets[i] = c; } catch (e) { }
      if (--left === 0 && !failed) { BEE.ok = true; BEE.t = 0; }
    };
    im.onerror = () => { if (!tried) { tried = true; im.src = 'assets/bee/bee_' + i + '.png'; } else failed = true; }; // 不支持 WebP 的老设备回退 PNG
    im.src = 'assets/bee/bee_' + i + '.webp'; BEE.sheets[i] = im;
  }
}
const BEE_PC = [2, 3, 3, 15, 14, 2];
function drawTitleBee(dt) {
  if (!BEE.r || (BEE.rc = (BEE.rc || 0) + 1) % 30 === 0 || BEE.rw !== W) { const el = $('mBee'); if (!el) return; BEE.r = el.getBoundingClientRect(); BEE.rw = W; }
  const r = BEE.r; if (!r.width) { BEE.r = null; return; }
  const t = G.time; BEE.t += dt;
  const bw = r.width * 1.1, k = bw / (BEE.body[2] - BEE.body[0]);
  const dx = Math.sin(t * .83) * 7 + Math.sin(t * 2.1) * 2, dy = Math.sin(t * 1.27) * 6 + Math.sin(t * 3.3) * 1.5, rot = Math.sin(t * .9) * .035;
  const cx = r.left + r.width / 2 + dx, cy = r.top + r.height * .55 + dy;
  const bcx = (BEE.body[0] + BEE.body[2]) / 2 * k, bcy = (BEE.body[1] + BEE.body[3]) / 2 * k;
  // 地面柔影：飞高时变淡变小
  const sy = r.bottom + r.height * .08, ss = 1 - dy * .02;
  if (!BEE.shadow) { const k2 = document.createElement('canvas'); k2.width = k2.height = 64; const x2 = k2.getContext('2d'), g2 = x2.createRadialGradient(32, 32, 0, 32, 32, 32); g2.addColorStop(0, 'rgba(40,70,20,.3)'); g2.addColorStop(1, 'rgba(40,70,20,0)'); x2.fillStyle = g2; x2.fillRect(0, 0, 64, 64); BEE.shadow = k2; }
  const shw = bw * .84 * ss; ctx.globalAlpha = Math.max(0, Math.min(1, ss)); ctx.drawImage(BEE.shadow, r.left + r.width / 2 + dx * .6 - shw / 2, sy - shw * .11, shw, shw * .22); ctx.globalAlpha = 1;
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot);
  if (BEE.ok) {
    const f = Math.floor(BEE.t * BEE.fps) % BEE.n, j = f % BEE.per;
    ctx.drawImage(BEE.sheets[(f / BEE.per) | 0], (j % BEE.cols) * BEE.fw, ((j / BEE.cols) | 0) * BEE.fh, BEE.fw, BEE.fh, -bcx, -bcy, BEE.fw * k, BEE.fh * k);
  } else if (IMG.mascot && IMG.mascot.naturalWidth) { // 序列帧未就绪前：首帧同姿势的静态图
    const m = IMG.mascot, w = bw * m.naturalWidth / (m.naturalWidth - 8), h = w * m.naturalHeight / m.naturalWidth; ctx.drawImage(m, -w / 2, -h / 2, w, h);
  }
  ctx.restore();
  // 实时花瓣：从花篮里飘出、随风摇摆落下
  const ca = Math.cos(rot), sa = Math.sin(rot), bx = (BEE.basket[0] * k - bcx), by = (BEE.basket[1] * k - bcy);
  const ox = cx + bx * ca - by * sa, oy = cy + bx * sa + by * ca;
  if ((BEE.cd -= dt) <= 0 && BEE.petals.length < 18) {
    BEE.cd = .28 + Math.random() * .3;
    BEE.petals.push({ x: ox + (Math.random() - .5) * bw * .18, y: oy, vx: -10 + Math.random() * 46, vy: -40 - Math.random() * 40, r: Math.random() * 6, vr: (Math.random() - .5) * 4, w: Math.random() * 6, s: .55 + Math.random() * .45, c: BEE_PC[(Math.random() * BEE_PC.length) | 0], life: 0, max: 2.6 + Math.random() * 1.4 });
  }
  for (let i = BEE.petals.length - 1; i >= 0; i--) {
    const p = BEE.petals[i]; p.life += dt; if (p.life > p.max) { BEE.petals.splice(i, 1); continue; }
    p.vy = Math.min(55, p.vy + 70 * dt); p.vx *= (1 - .6 * dt); p.w += dt * 2.4; p.r += p.vr * dt;
    p.x += (p.vx + Math.sin(p.w) * 22) * dt; p.y += p.vy * dt;
    const a = Math.min(1, p.life / .25) * Math.min(1, (p.max - p.life) / .8);
    ctx.save(); ctx.globalAlpha = .95 * a; ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.scale(p.s * (.55 + .45 * Math.abs(Math.cos(p.w * .7))), p.s * .75); ctx.drawImage(petalSprite(p.c), -12, -12); ctx.restore();
  }
}
/* ---------- 主循环 ---------- */
function frame(ts) {
  requestAnimationFrame(frame);
  const now = ts / 1000, dt = Math.min(.05, G.lastT ? now - G.lastT : .016); G.lastT = now; G.time += dt;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  drawBg(dt);
  if (G.s && (G.scr === 'game')) {
    const s = G.s;
    if (!G.paused && !G.over) {
      G.acc += dt * DEBUG.speed; let n = 0;
      while (G.acc >= 1 / 60 && n < 6 * DEBUG.speed) {
        G.acc -= 1 / 60; n++;
        if (DEBUG.bot && --G.botCd <= 0) { const m = SIM.botMove(s); if (m >= 0) { doTap(m, true); G.botCd = 10; } else G.botCd = 2; }
        SIM.step(s); handleEvents();
        if (SIM.won(s)) { onWin(); break; }
        if (SIM.lost(s)) { if (DEBUG.bot && s.cap < MAXSLOT) { SIM.addSlot(s); s.stuck = 0; } else { onFail(); break; } }
      }
      if (G.acc > .2) G.acc = 0;
      updHud();
    } else if (G.winT >= 0) G.winT += dt;
    updatePic();
    drawFrame();
    drawQueuePanel();
    drawBelt(dt);
    drawQueue(dt);
    drawBeltBaskets();
    stepParticles(G.paused ? 0 : dt); drawParticles();
    drawFx(dt);
    drawBee(dt);
    placeHand();
  } else {
    drawAmb(dt);
    ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fillRect(0, 0, W, H);
    if (G.scr === 'menu') drawTitleBee(dt);
  }
}
/* ---------- 启动 ---------- */
window.addEventListener('resize', () => { layout(); });
SND.setMusic(save.music); SND.setSfx(save.sfx); syncTg();
loadAll(() => {
  layout(); loadBee();
  setTimeout(() => {
    if (DEBUG.level) { startLevel(Math.max(0, Math.min(LEVELS.length - 1, DEBUG.level - 1))); }
    else showScr('menu');
  }, 250);
});
requestAnimationFrame(frame);
window.__G = G; window.__SIM = SIM; window.__pos = { q: (ci) => { const p = qPos(ci, 0); return { x: p.x, y: p.y - p.sz * .5 }; }, slot: (i) => { const p = slotPos(i); return { x: p.x, y: p.y - p.sz * .5 }; } };
window.__T = { n: LEVELS.length, start: n => startLevel(n - 1), win: () => onWin() };
})();
