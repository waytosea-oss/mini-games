/* ===== 一合到底 · 麻将合成  主程序 ===== */
(() => {
'use strict';
const Q = new URLSearchParams(location.search);
const DEBUG = { bot: Q.has('bot'), stage: Q.has('stage') ? +Q.get('stage') : -1, speed: +Q.get('speed') || 1, notut: Q.has('notut'), reset: Q.has('reset'), fill: Q.has('fill'), coins: +Q.get('coins') || 0, autostart: Q.has('play') };
const LG = window.LOGIC;
const cv = document.getElementById('cv'), ctx = cv.getContext('2d');
const $ = id => document.getElementById(id);
const FONT = '"PingFang SC","Hiragino Sans GB","Microsoft YaHei","Noto Sans CJK SC","Noto Sans SC",sans-serif';
const TAU = Math.PI * 2, rnd = (a, b) => a + Math.random() * (b - a), clamp = (v, a, b) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a) * t;
const easeOut = t => 1 - Math.pow(1 - t, 3), easeInOut = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2, easeBack = t => { const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const LBL = { deal: [0, 0, 275, 154], merge: [0, 158, 275, 154], goal: [0, 316, 234, 73], temp: [0, 393, 270, 84], undo: [0, 481, 140, 79], clear: [0, 564, 140, 79], rank: [0, 647, 154, 62], sort: [0, 713, 140, 79] };
const IMG = {};
const ASSETS = ['faces.webp', 'labels.webp'];
const COST = { temp: 120, buy: 300, undo: 20, clear: 80 };

/* ---------- 存档 ---------- */
const SKEY = 'yiheddaodi_v1';
let save = { st: null, cp: null, coins: 60, props: { undo: 3, clear: 2 }, best: { score: 0, top: 0 }, runs: [], music: true, sfx: true, tut: false, runId: 1 };
try { const s = JSON.parse(localStorage.getItem(SKEY)); if (s && s.props && !DEBUG.reset) save = Object.assign(save, s); } catch (e) { }
const persist = () => { try { localStorage.setItem(SKEY, JSON.stringify(save)); } catch (e) { } };
if (DEBUG.coins) save.coins = DEBUG.coins;
if (DEBUG.notut || DEBUG.bot) save.tut = true;
const clone = o => JSON.parse(JSON.stringify(o));

/* ---------- 游戏状态 ---------- */
const G = { mode: 'load', s: null, sel: null, flyers: [], parts: [], floats: [], mfx: [], hid: [], pop: [], ufx: [], timers: [], hist: [], time: 0, shake: 0, banner: null, press: {}, tut: -1, warned: false, over: false, winT: -1, idle: 0 };
function resetVis() { G.flyers = []; G.parts = []; G.floats = []; G.mfx = []; G.hid = new Array(LG.ROWS).fill(0); G.pop = new Array(LG.ROWS).fill(-9); G.ufx = new Array(LG.ROWS).fill(-9); G.timers = []; G.sel = null; G.banner = null; G.over = false; G.winT = -1; }
const after = (sec, fn) => G.timers.push({ at: G.time + sec, fn });

/* ---------- 布局 ---------- */
let W = 0, H = 0, DPR = 1, L = {};
function layout() {
  DPR = Math.min(2, window.devicePixelRatio || 1);
  W = window.innerWidth; H = window.innerHeight;
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  const sp = getComputedStyle($('safe'));
  const st = parseFloat(sp.paddingTop) || 0, sb = parseFloat(sp.paddingBottom) || 0;
  const GW = Math.min(W, 460), gx = (W - GW) / 2;
  L = { GW, gx, st, sb };
  const short = H < 700;
  L.top = st + (short ? 6 : 10); L.h1 = short ? 38 : 42;
  L.trackY = L.top + L.h1 + (short ? 6 : 10); L.trackH = short ? 56 : 68;
  L.btnH = clamp(H * 0.072, 48, 62); L.btnY = H - sb - L.btnH - (short ? 10 : 16);
  const fr = 9; L.fr = fr;
  const bTop = L.trackY + L.trackH + (short ? 6 : 10), bBot = L.btnY - (short ? 10 : 14);
  L.bTop = bTop; L.bBot = bBot;
  const n = LG.ROWS, gap = short ? 3 : 4;
  const innerH = bBot - bTop - fr * 2 - 8;
  let rh = (innerH - gap * (n - 1)) / n;
  let th = rh - (short ? 4 : 7);
  let tw = th / 1.3;
  const maxTw = (GW - 24 - fr * 2 - 16 - 9 * 1.5) / 10;
  if (tw > maxTw) { tw = maxTw; th = tw * 1.3; }
  tw = Math.floor(tw); th = Math.floor(tw * 1.3);
  L.tw = tw; L.th = th; L.tg = Math.max(1, Math.round(tw * 0.04)); L.rh = rh; L.rgap = gap;
  L.rowW = tw * 10 + L.tg * 9 + 14;
  L.bw = L.rowW + fr * 2 + 8; L.bx = gx + (GW - L.bw) / 2; L.bh = bBot - bTop;
  L.rx = L.bx + fr + 4; L.ry0 = bTop + fr + 4;
  const bw2 = Math.min(170, (GW - 48) / 2);
  L.bDeal = { x: gx + GW / 2 - 8 - bw2, y: L.btnY, w: bw2, h: L.btnH };
  L.bMerge = { x: gx + GW / 2 + 8, y: L.btnY, w: bw2, h: L.btnH };
  const h1 = L.h1;
  L.bPause = { x: gx + 10, y: L.top, w: h1, h: h1 };
  L.coin = { x: gx + 10 + h1 + 8, y: L.top + h1 * 0.14, w: Math.min(96, GW * 0.24), h: h1 * 0.72 };
  L.bRank = { x: gx + GW - 10 - h1, y: L.top, w: h1, h: h1 };
  const pw = Math.min(78, GW * 0.19);
  L.bClear = { x: L.bRank.x - 10 - pw, y: L.top + h1 * 0.1, w: pw, h: h1 * 0.8 };
  L.bUndo = { x: L.bClear.x - 8 - pw, y: L.top + h1 * 0.1, w: pw, h: h1 * 0.8 };
  bgCache = null; tileCache = {}; lockCache = null;
}
const rowY = i => L.ry0 + i * (L.rh + L.rgap);
const tileX = k => L.rx + 7 + k * (L.tw + L.tg);
const tileY = i => rowY(i) + (L.rh - L.th) / 2;

/* ---------- 绘图工具 ---------- */
function rr(c, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function mk(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w * DPR)); c.height = Math.max(1, Math.ceil(h * DPR)); const x = c.getContext('2d'); x.scale(DPR, DPR); return [c, x]; }
let tileCache = {};
// 麻将牌：绿色牌背在上方露出一条（俯视角），象牙牌面，柔和投影 + 斜面高光
function tileSprite(t, w, h, back) {
  const key = (back ? 'b' : t) + '_' + w + '_' + h; if (tileCache[key]) return tileCache[key];
  const p = Math.ceil(w * 0.22); const [c, x] = mk(w + p * 2, h + p * 2); const ox = p, oy = p;
  const R = w * 0.16;
  // 投影
  x.save(); x.shadowColor = 'rgba(0,18,8,.55)'; x.shadowBlur = w * 0.18; x.shadowOffsetY = h * 0.06; x.shadowOffsetX = w * 0.04;
  rr(x, ox, oy, w, h, R); x.fillStyle = '#0b5a34'; x.fill(); x.restore();
  // 牌背（翡翠绿）
  let g = x.createLinearGradient(0, oy, 0, oy + h); g.addColorStop(0, '#5fe0a0'); g.addColorStop(0.18, '#1fa865'); g.addColorStop(1, '#0a5a32');
  rr(x, ox, oy, w, h, R); x.fillStyle = g; x.fill();
  x.strokeStyle = 'rgba(0,50,25,.8)'; x.lineWidth = 1; rr(x, ox + .5, oy + .5, w - 1, h - 1, R); x.stroke();
  if (back) {
    x.globalAlpha = .35; x.strokeStyle = '#c8ffe2'; x.lineWidth = w * 0.05; rr(x, ox + w * .18, oy + h * .14, w * .64, h * .72, w * .1); x.stroke();
    x.beginPath(); x.arc(ox + w / 2, oy + h / 2, w * .16, 0, TAU); x.stroke(); x.globalAlpha = 1;
    g = x.createLinearGradient(0, oy, 0, oy + h * 0.4); g.addColorStop(0, 'rgba(255,255,255,.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    rr(x, ox + 2, oy + 1.5, w - 4, h * 0.4, R); x.fillStyle = g; x.fill();
    return (tileCache[key] = { c, p });
  }
  // 象牙夹层
  const fy = oy + h * 0.15;
  rr(x, ox + 0.5, fy, w - 1, h - (fy - oy) - 0.5, R * 0.9); x.fillStyle = '#d8c79a'; x.fill();
  // 牌面
  g = x.createLinearGradient(ox, fy, ox + w * 0.4, oy + h); g.addColorStop(0, '#fffffa'); g.addColorStop(0.55, '#fbf5e4'); g.addColorStop(1, '#ecdfbd');
  rr(x, ox + 0.8, fy + 1.4, w - 1.6, h - (fy - oy) - h * 0.075, R * 0.85); x.fillStyle = g; x.fill();
  // 斜面高光
  x.strokeStyle = 'rgba(255,255,255,.95)'; x.lineWidth = 1.1; rr(x, ox + 1.6, fy + 2.2, w - 3.2, h - (fy - oy) - h * 0.075 - 1.6, R * 0.8); x.stroke();
  // 牌面图案
  const fw = w * 0.86, fh = h * 0.74, cw = 120, ch = 160;
  const sc = Math.min(fw / cw, fh / ch);
  const dw = cw * sc, dh = ch * sc, dx = ox + (w - dw) / 2, dy = fy + 1.4 + (h - (fy - oy) - h * 0.075 - dh) / 2;
  if (IMG.faces) { x.imageSmoothingQuality = 'high'; x.drawImage(IMG.faces, (t % 10) * cw, Math.floor(t / 10) * ch, cw, ch, dx, dy, dw, dh); }
  return (tileCache[key] = { c, p });
}
function drawTile(t, x, y, w, h, o) {
  const sp = tileSprite(t, Math.round(w), Math.round(h), o && o.back);
  const s = (o && o.s) || 1; const sx = (o && o.sx) || 1;
  if (o && o.a !== undefined) ctx.globalAlpha = o.a;
  if (s !== 1 || sx !== 1 || (o && o.rot)) {
    ctx.save(); ctx.translate(x + w / 2, y + h / 2); if (o.rot) ctx.rotate(o.rot); ctx.scale(s * sx, s);
    ctx.drawImage(sp.c, -w / 2 - sp.p, -h / 2 - sp.p, w + sp.p * 2, h + sp.p * 2); ctx.restore();
  } else ctx.drawImage(sp.c, x - sp.p, y - sp.p, w + sp.p * 2, h + sp.p * 2);
  if (o && o.a !== undefined) ctx.globalAlpha = 1;
}
function tileCanvas(t, w) { // 独立小画布（DOM 面板用）
  const h = Math.round(w * 1.3); const sp = tileSprite(t, w, h); const c = document.createElement('canvas');
  c.width = (w + sp.p * 2) * DPR; c.height = (h + sp.p * 2) * DPR; c.style.width = (w + sp.p * 2) + 'px'; c.style.height = (h + sp.p * 2) + 'px';
  c.getContext('2d').drawImage(sp.c, 0, 0); return c;
}
function label(k, cx, cy, h, a) { const m = LBL[k]; if (!IMG.labels) return; const w = h * m[2] / m[3]; if (a !== undefined) ctx.globalAlpha = a; ctx.drawImage(IMG.labels, m[0], m[1], m[2], m[3], cx - w / 2, cy - h / 2, w, h); ctx.globalAlpha = 1; return w; }
function coinIcon(c, x, y, r) { // 铜钱
  const g = c.createRadialGradient(x - r * .35, y - r * .4, r * .1, x, y, r); g.addColorStop(0, '#fff6c0'); g.addColorStop(.5, '#f3c23a'); g.addColorStop(1, '#a8700c');
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.strokeStyle = '#7a4a06'; c.lineWidth = r * .14; c.stroke();
  c.strokeStyle = 'rgba(122,74,6,.6)'; c.lineWidth = r * .08; c.beginPath(); c.arc(x, y, r * .72, 0, TAU); c.stroke();
  c.fillStyle = '#7a4a06'; c.fillRect(x - r * .26, y - r * .26, r * .52, r * .52); c.fillStyle = '#ffe9a0'; c.fillRect(x - r * .26, y - r * .26, r * .52, r * .1);
}
function crown(c, x, y, s) {
  c.save(); c.translate(x, y); c.scale(s, s);
  const g = c.createLinearGradient(0, -14, 0, 10); g.addColorStop(0, '#fff3b0'); g.addColorStop(.5, '#f6c234'); g.addColorStop(1, '#b8740c');
  c.beginPath(); c.moveTo(-16, 8); c.lineTo(-19, -9); c.lineTo(-8, -1); c.lineTo(0, -15); c.lineTo(8, -1); c.lineTo(19, -9); c.lineTo(16, 8); c.closePath();
  c.fillStyle = g; c.fill(); c.strokeStyle = '#6a3a04'; c.lineWidth = 2; c.lineJoin = 'round'; c.stroke();
  c.fillStyle = '#d8302a'; c.beginPath(); c.arc(0, 1, 3.6, 0, TAU); c.fill(); c.fillStyle = '#2a7ad8'; c.beginPath(); c.arc(-9, 3, 2.4, 0, TAU); c.arc(9, 3, 2.4, 0, TAU); c.fill();
  c.fillStyle = '#fff3b0'; for (const [a, b] of [[-19, -9], [0, -15], [19, -9]]) { c.beginPath(); c.arc(a, b, 2.6, 0, TAU); c.fill(); c.stroke(); }
  c.restore();
}
let lockCache = null;
function lockIcon(x, y, s) {
  if (!lockCache) {
    const [c, g] = mk(40, 44);
    g.lineCap = 'round'; g.strokeStyle = '#8a95a0'; g.lineWidth = 5; g.beginPath(); g.arc(20, 17, 9, Math.PI, 0); g.lineTo(29, 22); g.moveTo(11, 17); g.lineTo(11, 22); g.stroke();
    g.strokeStyle = '#dfe6ec'; g.lineWidth = 1.6; g.beginPath(); g.arc(20, 17, 9, Math.PI * 1.1, Math.PI * 1.6); g.stroke();
    const gr = g.createLinearGradient(0, 20, 0, 42); gr.addColorStop(0, '#d8dee4'); gr.addColorStop(.5, '#9aa4ae'); gr.addColorStop(1, '#5c6670');
    rr(g, 6, 20, 28, 21, 5); g.fillStyle = gr; g.fill(); g.strokeStyle = '#2c333a'; g.lineWidth = 1.6; g.stroke();
    g.fillStyle = '#2c333a'; g.beginPath(); g.arc(20, 29, 3.4, 0, TAU); g.fill(); g.fillRect(18.6, 30, 2.8, 6);
    g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(9, 22.5, 22, 2);
    lockCache = c;
  }
  ctx.drawImage(lockCache, x - 20 * s, y - 22 * s, 40 * s, 44 * s);
}

/* ---------- 背景：翡翠绒面 + 金色回纹框 ---------- */
let bgCache = null, menuCache = null;
function keyPattern(c, x, y, len, sz, horiz) { // 回纹带
  c.beginPath();
  const n = Math.floor(len / (sz * 2));
  for (let i = 0; i < n; i++) {
    const o = i * sz * 2;
    const P = [[0, 1], [0, 0], [1.6, 0], [1.6, .8], [.5, .8], [.5, .35], [1.1, .35]];
    P.forEach(([a, b], k) => { const px = horiz ? x + o + a * sz : x + b * sz, py = horiz ? y + b * sz : y + o + a * sz; k ? c.lineTo(px, py) : c.moveTo(px, py); });
  }
  c.stroke();
}
function buildBg() {
  const [c, x] = mk(W, H);
  // 绒面
  let g = x.createRadialGradient(W / 2, H * 0.42, 20, W / 2, H * 0.45, Math.max(W, H) * 0.75);
  g.addColorStop(0, '#1d8a5c'); g.addColorStop(0.55, '#0f6442'); g.addColorStop(1, '#062e1f');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  // 绒毛噪点
  const n = Math.floor(W * H / 18);
  for (let i = 0; i < n; i++) { x.fillStyle = Math.random() < .5 ? 'rgba(255,255,255,.035)' : 'rgba(0,0,0,.05)'; x.fillRect(Math.random() * W, Math.random() * H, 1, 1); }
  // 暗纹：祥云团花
  x.globalAlpha = 0.06; x.strokeStyle = '#bff5d8'; x.lineWidth = 1.4;
  for (let yy = 30; yy < H; yy += 90) for (let xx = (yy / 90 % 2) * 45; xx < W + 40; xx += 90) {
    x.beginPath(); x.arc(xx, yy, 12, Math.PI * .2, Math.PI * 1.8); x.stroke(); x.beginPath(); x.arc(xx + 8, yy - 3, 6, Math.PI, Math.PI * 2.4); x.stroke(); x.beginPath(); x.arc(xx - 9, yy + 2, 5, 0, Math.PI * 1.3); x.stroke();
  }
  x.globalAlpha = 1;
  // 外侧回纹边（左右）
  x.strokeStyle = 'rgba(233,196,106,.22)'; x.lineWidth = 1.6;
  keyPattern(x, 4, 0, H, 7, false); keyPattern(x, W - 16, 0, H, 7, false);
  { const [mc, mx] = mk(W, H); mx.drawImage(c, 0, 0, W, H); menuCache = mc; }
  // 牌桌框
  const { bx, bTop, bw, bh, fr } = L;
  x.save(); x.shadowColor = 'rgba(0,0,0,.6)'; x.shadowBlur = 16; x.shadowOffsetY = 6;
  rr(x, bx, bTop, bw, bh, 14); x.fillStyle = '#3a2408'; x.fill(); x.restore();
  g = x.createLinearGradient(bx, bTop, bx + bw, bTop + bh); g.addColorStop(0, '#fff0b0'); g.addColorStop(.25, '#d9a440'); g.addColorStop(.5, '#f8dc86'); g.addColorStop(.75, '#b9822a'); g.addColorStop(1, '#f3d27a');
  rr(x, bx, bTop, bw, bh, 14); x.fillStyle = g; x.fill();
  rr(x, bx + 3, bTop + 3, bw - 6, bh - 6, 12); x.strokeStyle = 'rgba(90,50,8,.7)'; x.lineWidth = 1.2; x.stroke();
  // 框上回纹
  x.strokeStyle = 'rgba(110,64,10,.75)'; x.lineWidth = 1.2;
  keyPattern(x, bx + 16, bTop + 2.5, bw - 32, 3.4, true); keyPattern(x, bx + 16, bTop + bh - 6.5, bw - 32, 3.4, true);
  keyPattern(x, bx + 2.5, bTop + 16, bh - 32, 3.4, false); keyPattern(x, bx + bw - 6.5, bTop + 16, bh - 32, 3.4, false);
  // 内面：深绿绒
  g = x.createLinearGradient(0, bTop, 0, bTop + bh); g.addColorStop(0, '#0b4a31'); g.addColorStop(1, '#083826');
  rr(x, bx + fr, bTop + fr, bw - fr * 2, bh - fr * 2, 8); x.fillStyle = g; x.fill();
  x.strokeStyle = 'rgba(0,0,0,.5)'; x.lineWidth = 2; x.stroke();
  // 角花
  for (const [cx, cy] of [[bx + 7, bTop + 7], [bx + bw - 7, bTop + 7], [bx + 7, bTop + bh - 7], [bx + bw - 7, bTop + bh - 7]]) {
    x.fillStyle = '#c9302c'; x.beginPath(); x.arc(cx, cy, 5.5, 0, TAU); x.fill(); x.strokeStyle = '#6a3a04'; x.lineWidth = 1.5; x.stroke();
    x.fillStyle = '#ffe9a0'; x.beginPath(); x.arc(cx - 1.3, cy - 1.5, 1.8, 0, TAU); x.fill();
  }
  // 行槽
  for (let i = 0; i < LG.ROWS; i++) {
    const y = rowY(i);
    rr(x, L.rx, y, L.rowW, L.rh, 6); x.fillStyle = 'rgba(0,0,0,.2)'; x.fill();
    x.strokeStyle = 'rgba(160,240,200,.13)'; x.lineWidth = 1; rr(x, L.rx + .5, y + .5, L.rowW - 1, L.rh - 1, 6); x.stroke();
    x.fillStyle = 'rgba(190,255,220,.14)';
    for (let k = 1; k < 10; k++) { const px = tileX(k) - L.tg / 2; x.fillRect(px - .5, y + L.rh / 2 - 3, 1, 6); x.fillRect(px - 3, y + L.rh / 2 - .5, 6, 1); }
  }
  // 底部按钮区域台面
  g = x.createLinearGradient(0, L.btnY - 8, 0, H); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.25)'); x.fillStyle = g; x.fillRect(0, L.btnY - 8, W, H);
  // 目标轨道底板
  const ty = L.trackY, th = L.trackH, tx = L.gx + 8, tw = L.GW - 16;
  rr(x, tx, ty, tw, th, 12); x.fillStyle = 'rgba(0,30,18,.45)'; x.fill(); x.strokeStyle = 'rgba(233,196,106,.35)'; x.lineWidth = 1.2; x.stroke();
  bgCache = c;
}

/* ---------- 粒子 ---------- */
function burst(x, y, n, cols, spd = 220, size = 4, life = .7) {
  for (let i = 0; i < n; i++) { const a = rnd(0, TAU), v = rnd(.3, 1) * spd; G.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - spd * .2, g: 420, life: rnd(.6, 1) * life, t: 0, col: cols[i % cols.length], s: rnd(.6, 1.2) * size, k: Math.random() < .5 ? 'spark' : 'dot', r: rnd(0, TAU) }); }
}
function ring(x, y, r, col, life = .5, w = 4) { G.parts.push({ x, y, r0: r * .2, r1: r, k: 'ring', life, t: 0, col, w }); }
function floatText(x, y, s, col = '#fff3c4', size = 22) { G.floats.push({ x, y, s, col, size, t: 0 }); }
const toastEl = $('toast'); let toastT = 0;
function toast(s, sec = 1.6) { toastEl.textContent = s; toastEl.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('on'), sec * 1000); }

/* ---------- 新开局 / 存取 ---------- */
function freshState() {
  const s = LG.newState();
  // 开局：两行各 5 张一筒（教学：挪过去凑满 10 张）
  s.rows[6].t = [0, 0, 0, 0, 0]; s.rows[8].t = [0, 0, 0, 0, 0];
  if (save.tut) { s.rows[4].t = [0, 0]; s.rows[5].t = [0, 0, 0]; s.rows[7].t = [0]; }
  return s;
}
function newGame() {
  recordRun();
  G.s = freshState(); save.st = G.s; save.cp = clone(G.s); save.runId = (save.runId || 1) + 1; G.hist = []; persist();
}
function recordRun() {
  const s = save.st; if (!s || s.score <= 0) return;
  save.runs = (save.runs || []).filter(r => r.id !== save.runId);
  save.runs.push({ id: save.runId, score: s.score, top: s.top, stage: s.stage, d: Date.now() });
  save.runs.sort((a, b) => b.score - a.score); save.runs = save.runs.slice(0, 12);
}
function debugFill() {
  const s = G.s; const st = DEBUG.stage >= 0 ? DEBUG.stage : 4; s.stage = st; s.top = st ? LG.GOALS[st - 1] + 1 : 1;
  for (const i in LG.MILE) if (s.top >= LG.MILE[i]) s.rows[i].st = 'open';
  const [lo, hi] = LG.dealWindow(s);
  s.rows.forEach(r => { if (!LG.isOpen(r)) return; r.t = []; const n = Math.floor(rnd(3, 9)); let v = Math.floor(rnd(lo, hi + 1)); for (let k = 0; k < n; k++) { if (Math.random() < .35) v = Math.floor(rnd(lo, hi + 1)); r.t.push(v); } });
  // 一行差 1 张就满、一行可合成
  const open = s.rows.map((r, i) => i).filter(i => LG.isOpen(s.rows[i]));
  s.rows[open[1]].t = new Array(10).fill(lo + 1);
  s.rows[open[3]].t = [lo, lo + 2, ...new Array(6).fill(hi)];
  s.rows[open[4]].t = [hi, hi];
  s.score = 1200 * (st + 1); save.cp = clone(s);
}

/* ---------- 操作 ---------- */
const busy = () => G.flyers.length > 0 || G.mfx.length > 0 || G.over || G.winT >= 0;
function snapshot() { G.hist.push(clone(G.s)); if (G.hist.length > 12) G.hist.shift(); }
function tilePos(row, idx) { return { x: tileX(idx), y: tileY(row) }; }
function selectRow(i) {
  const r = G.s.rows[i]; if (!r.t.length) { SND.deny(); return; }
  G.sel = { row: i, n: LG.runLen(r), t0: G.time }; SND.select(); vib(8);
}
function tapRow(i) {
  const s = G.s, r = s.rows[i];
  if (!LG.isOpen(r)) return tapLocked(i);
  if (G.sel) {
    const a = G.sel.row;
    if (a === i) { G.sel = null; SND.deselect(); return; }
    if (LG.canMove(s, a, i)) { doMove(a, i); return; }
    if (r.t.length) { selectRow(i); return; }
    G.sel = null; SND.deny(); return;
  }
  if (!r.t.length) { SND.deny(); return; }
  selectRow(i);
}
function doMove(a, b) {
  const s = G.s, n = LG.canMove(s, a, b); if (!n) return;
  snapshot();
  const A = s.rows[a], st = A.t.length - n, ds = s.rows[b].t.length, ts = A.t.slice(st);
  const lift = G.sel ? 5 : 0;
  LG.move(s, a, b); G.sel = null;
  G.hid[b] += n;
  for (let k = 0; k < n; k++) {
    const f = tilePos(a, st + k), to = tilePos(b, ds + k);
    G.flyers.push({ t: ts[k], x0: f.x, y0: f.y - lift, x1: to.x, y1: to.y, t0: G.time + k * 0.035, dur: clamp(0.18 + Math.abs(b - a) * 0.018, 0.2, 0.36), row: b, arc: -Math.min(40, 12 + Math.abs(b - a) * 4), land: () => { SND.clack(0.75 + Math.random() * .2, 0.95 + Math.random() * .1); } });
  }
  SND.swoosh(); afterAction();
}
function doDeal() {
  if (busy()) return; const s = G.s;
  if (LG.freeSpace(s) === 0 || !s.rows.some(r => LG.isOpen(r) && !(r.st === 'tempOn' && r.exp) && r.t.length < LG.CAP)) { if (LG.stuck(s)) { G.over = true; showFail(); return; } SND.deny(); toast('没有空位了，先挪牌或合成'); shakeBtn('deal'); return; }
  snapshot(); G.sel = null;
  const out = LG.deal(s);
  const sx = L.bDeal.x + L.bDeal.w / 2 - L.tw / 2, sy = L.bDeal.y;
  out.forEach((o, i) => { G.hid[o.row]++; const to = tilePos(o.row, o.idx);
    G.flyers.push({ t: o.t, x0: sx + rnd(-6, 6), y0: sy, x1: to.x, y1: to.y, t0: G.time + i * 0.028, dur: 0.34 + (LG.ROWS - o.row) * 0.012, row: o.row, arc: -30, flip: 1, land: () => SND.clack(0.5, 1 + Math.random() * .08) }); });
  SND.shuffle(Math.min(16, out.length + 4)); vib(10);
  if (G.tut === 3) tutNext();
  afterAction();
}
function doMerge() {
  if (busy()) return; const s = G.s; const rows = LG.mergeable(s);
  if (!rows.length) { SND.deny(); shakeBtn('merge'); toast('一行凑满 10 张相同的牌才能合成'); return; }
  G.sel = null; G.hist = [];
  const before = rows.map(i => s.rows[i].t.slice());
  const r = LG.merge(s); save.coins += s.coins; const gotCoins = s.coins; s.coins = 0;
  let newTop = false;
  r.res.forEach((m, k) => {
    G.mfx.push({ row: m.row, from: m.from, to: m.to, t0: G.time + k * 0.12, n: 10, newTop: m.newTop });
    G.hid[m.row] = 2; if (m.newTop) newTop = m.to;
  });
  SND.shuffle(8);
  after(0.5, () => { SND.merge(r.res[0].to); vib(25); });
  after(0.55, () => { floatText(L.bMerge.x + L.bMerge.w / 2, L.bMerge.y - 10, '+' + gotCoins, '#ffe27a', 18); SND.coin(); });
  if (newTop !== false) after(0.85, () => { G.banner = { t: newTop, t0: G.time }; SND.newTier(); });
  r.unl.forEach(i => after(1.1, () => { G.ufx[i] = G.time; SND.unlock(); burst(L.rx + L.rowW / 2, rowY(i) + L.rh / 2, 30, ['#ffe27a', '#fff', '#7dffb8'], 260); }));
  if (G.tut === 2) tutNext();
  after(0.7, () => { save.best.score = Math.max(save.best.score, s.score); save.best.top = Math.max(save.best.top, s.top); persist(); checkGoal(); });
}
function checkGoal() {
  const s = G.s; const goal = LG.GOALS[s.stage];
  if (goal !== undefined && s.top >= goal) { G.winT = G.time; after(newBannerWait(), () => showWin()); }
}
const newBannerWait = () => G.banner ? 1.6 : 0.6;
function afterAction() {
  save.st = G.s; persist();
  after(0.5, () => {
    if (busy()) return;
    const s = G.s;
    if (LG.stuck(s)) { G.over = true; after(0.4, showFail); return; }
    const f = LG.freeSpace(s);
    if (f <= 6 && !G.warned && !LG.mergeable(s).length) { G.warned = true; toast('空位不多了，小心牌桌被塞满'); }
    if (f > 12) G.warned = false;
  });
}
function doUndo() {
  if (busy()) return;
  if (!G.hist.length) { SND.deny(); toast('没有可以撤销的操作'); return; }
  if (!payProp('undo')) return;
  G.s = G.hist.pop(); save.st = G.s; G.sel = null; G.hid.fill(0); persist(); SND.shuffle(5); toast('已撤销上一步', 1);
}
function doClear(fromFail) {
  if (busy() && !fromFail) return; const s = G.s;
  const m = LG.lowestTier(s); if (m < 0) { SND.deny(); return; }
  if (!payProp('clear')) return false;
  snapshot();
  const out = LG.clearLowest(s);
  out.forEach((o, i) => { const p = tilePos(o.row, o.idx); after(i * 0.02, () => { burst(p.x + L.tw / 2, p.y + L.th / 2, 5, ['#fff', '#ffe27a', '#bfffe0'], 140, 3, .5); }); });
  ring(W / 2, (L.bTop + L.bBot) / 2, W * .6, 'rgba(255,240,180,.7)', .6, 6);
  SND.merge(1); vib(20); toast('消除了全部「' + LG.tileName(m) + '」');
  G.hist = []; afterAction(); return true;
}
function payProp(k) {
  if (save.props[k] > 0) { save.props[k]--; persist(); return true; }
  if (save.coins >= COST[k]) { save.coins -= COST[k]; persist(); SND.coin(); return true; }
  SND.deny(); toast('铜钱不够啦（需要 ' + COST[k] + '）'); return false;
}
function tapLocked(i) {
  const s = G.s, r = s.rows[i];
  if (r.st === 'temp') {
    const free = s.tempFree;
    ask('临时解锁', free ? '本关可以<b>免费</b>临时解锁这一行！<br>过关后这一行清空就会重新锁上。' : '花费 <b>' + COST.temp + '</b> 铜钱临时解锁这一行<br>（你有 ' + save.coins + ' 铜钱）', free ? '免费解锁' : '解锁', () => {
      if (!free) { if (save.coins < COST.temp) { toast('铜钱不够啦'); SND.deny(); return; } save.coins -= COST.temp; } else s.tempFree = false;
      r.st = 'tempOn'; r.exp = false; G.ufx[i] = G.time; SND.unlock(); persist(); G.over = false;
    });
  } else if (r.st === 'buy') {
    ask('永久解锁', '花费 <b>' + COST.buy + '</b> 铜钱永久解锁这一行<br>（你有 ' + save.coins + ' 铜钱）', '解锁', () => {
      if (save.coins < COST.buy) { toast('铜钱不够啦，多合成攒铜钱'); SND.deny(); return; }
      save.coins -= COST.buy; r.st = 'open'; G.ufx[i] = G.time; SND.unlock(); persist(); G.over = false;
    });
  } else { SND.deny(); toast('合出「' + LG.tileName(LG.MILE[i]) + '」后自动解锁'); }
}
let askCb = null;
function ask(title, html, ok, cb) { $('aTitle').textContent = title; $('aInfo').innerHTML = html; $('aOk').textContent = ok; askCb = cb; show('ask'); G.mode = 'ask'; }
$('aOk').onclick = () => { SND.tap(); hide('ask'); G.mode = 'play'; const c = askCb; askCb = null; if (c) c(); if (G.failOpen) { G.failOpen = false; afterAction(); } };
$('aNo').onclick = () => { SND.tap(); hide('ask'); G.mode = 'play'; askCb = null; if (G.failOpen) { G.failOpen = false; showFail(); } };
let shakeB = { k: '', t: -9 };
function shakeBtn(k) { shakeB = { k, t: G.time }; }
let userTapped = false; addEventListener("pointerdown", () => userTapped = true, { capture: true });
function vib(ms) { if (!userTapped || DEBUG.bot) return; try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { } }

/* ---------- 新手引导 ---------- */
function tutStart() { G.tut = 0; }
function tutNext() { G.tut++; if (G.tut >= 4) { G.tut = -1; save.tut = true; persist(); toast('把相同的牌挪到一起，凑满 10 张就合成！', 2.6); } }
function tutTarget() {
  if (G.tut === 0) return { kind: 'row', row: 8, text: '点击选择' };
  if (G.tut === 1) return { kind: 'row', row: 6, text: '放到这一行' };
  if (G.tut === 2) return { kind: 'btn', b: L.bMerge, text: '凑满10张，点合成' };
  if (G.tut === 3) return { kind: 'btn', b: L.bDeal, text: '牌少了就发牌' };
  return null;
}

/* ---------- 输入 ---------- */
const hit = (b, x, y, pad = 0) => b && x >= b.x - pad && x <= b.x + b.w + pad && y >= b.y - pad && y <= b.y + b.h + pad;
function onDown(e) {
  e.preventDefault(); SND.unlock();
  if (G.mode !== 'play') return;
  const x = e.clientX, y = e.clientY; G.idle = 0;
  if (hit(L.bPause, x, y, 6)) { pressed('pause'); SND.tap(); pause(); return; }
  if (hit(L.bRank, x, y, 6)) { pressed('rank'); SND.tap(); openRank(); return; }
  const tt = G.tut >= 0 ? tutTarget() : null;
  if (hit(L.bUndo, x, y, 4)) { if (tt) return; pressed('undo'); doUndo(); return; }
  if (hit(L.bClear, x, y, 4)) { if (tt) return; pressed('clear'); doClear(); return; }
  if (hit(L.bDeal, x, y, 4)) { if (tt && tt.b !== L.bDeal) return; pressed('deal'); doDeal(); return; }
  if (hit(L.bMerge, x, y, 4)) { if (tt && tt.b !== L.bMerge) return; pressed('merge'); doMerge(); return; }
  if (busy()) return;
  for (let i = 0; i < LG.ROWS; i++) {
    const ry = rowY(i);
    if (x >= L.rx - 6 && x <= L.rx + L.rowW + 6 && y >= ry - L.rgap / 2 && y <= ry + L.rh + L.rgap / 2) {
      if (tt) { if (tt.kind !== 'row' || tt.row !== i) return; }
      tapRow(i);
      if (tt && G.tut === 0 && G.sel) tutNext(); else if (tt && G.tut === 1 && !G.sel) tutNext();
      return;
    }
  }
  if (G.sel) { G.sel = null; SND.deselect(); }
}
function pressed(k) { G.press[k] = G.time; }
cv.addEventListener('pointerdown', onDown, { passive: false });
cv.addEventListener('touchstart', e => e.preventDefault(), { passive: false });
document.addEventListener('gesturestart', e => e.preventDefault());

/* ---------- 绘制 ---------- */
function drawBtn(b, k, enabled, glow) {
  const pt = G.time - (G.press[k] || -9); const pr = pt < 0.12 ? 3 : 0;
  let sx = 0; if (shakeB.k === k && G.time - shakeB.t < 0.35) sx = Math.sin((G.time - shakeB.t) * 60) * 5 * (1 - (G.time - shakeB.t) / .35);
  const x = b.x + sx, y = b.y + pr, w = b.w, h = b.h;
  const cols = k === 'deal' ? ['#7fe0ff', '#1e9ad6', '#0c5d92', '#06304e'] : ['#8ff0b0', '#22b562', '#0c7a3c', '#06401e'];
  ctx.save();
  if (glow) { const p = .5 + .5 * Math.sin(G.time * 6); ctx.shadowColor = `rgba(255,226,120,${.6 + .4 * p})`; ctx.shadowBlur = 14 + 12 * p; }
  rr(ctx, x - 3, y - 3 + (pr ? 0 : 0), w + 6, h + 6 + 5 - pr, 14); ctx.fillStyle = '#4a2c06'; ctx.fill(); ctx.restore();
  let g = ctx.createLinearGradient(0, y - 3, 0, y + h + 3); g.addColorStop(0, '#fff2b8'); g.addColorStop(.5, '#d9a440'); g.addColorStop(1, '#8a5a12');
  rr(ctx, x - 3, y - 3, w + 6, h + 6, 14); ctx.fillStyle = g; ctx.fill();
  g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, cols[0]); g.addColorStop(.45, cols[1]); g.addColorStop(1, cols[2]);
  rr(ctx, x, y, w, h, 11); ctx.fillStyle = g; ctx.fill();
  // 祥云角饰
  ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.6;
  for (const [cx, dir] of [[x + 14, 1], [x + w - 14, -1]]) { ctx.beginPath(); ctx.arc(cx, y + h - 12, 6, Math.PI * (dir > 0 ? .5 : -.5) , Math.PI * (dir > 0 ? 2 : 1)); ctx.stroke(); ctx.beginPath(); ctx.arc(cx + dir * 9, y + h - 10, 4, Math.PI, TAU); ctx.stroke(); }
  g = ctx.createLinearGradient(0, y, 0, y + h * .5); g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  rr(ctx, x + 3, y + 2, w - 6, h * .45, 9); ctx.fillStyle = g; ctx.fill();
  label(k, x + w / 2, y + h / 2 + 1, h * 0.72);
  if (!enabled) { rr(ctx, x - 3, y - 3, w + 6, h + 6, 14); ctx.fillStyle = 'rgba(20,30,25,.45)'; ctx.fill(); }
  if (glow) { // 流光
    const sw = ((G.time * 0.8) % 1.6) * (w + 60) - 30; ctx.save(); rr(ctx, x, y, w, h, 11); ctx.clip();
    const lg = ctx.createLinearGradient(x + sw - 20, 0, x + sw + 20, 0); lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(.5, 'rgba(255,255,255,.55)'); lg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = lg; ctx.fillRect(x, y, w, h); ctx.restore();
  }
}
function pill(b, k, count, cost) {
  const pr = G.time - (G.press[k] || -9) < .12 ? 2 : 0; const x = b.x, y = b.y + pr, w = b.w, h = b.h;
  let g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#fff3c4'); g.addColorStop(.5, '#eebd52'); g.addColorStop(1, '#b77a1a');
  rr(ctx, x, y + 3 - pr, w, h, h / 2); ctx.fillStyle = '#5a3406'; ctx.fill();
  rr(ctx, x, y, w, h, h / 2); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = '#6a3a06'; ctx.lineWidth = 1.5; ctx.stroke();
  label(k, x + w / 2 - 4, y + h / 2, h * 0.78);
  // 角标
  const bx = x + w - 6, by = y + 2; ctx.fillStyle = count > 0 ? '#d8302a' : '#2a6a4a'; ctx.beginPath(); ctx.arc(bx, by, 9, 0, TAU); ctx.fill(); ctx.strokeStyle = '#fff3c4'; ctx.lineWidth = 1.6; ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.font = `800 ${count > 0 ? 11 : 9}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(count > 0 ? count : '+', bx, by + .5);
}
function drawHud() {
  const s = G.s;
  // 暂停
  const b = L.bPause; let g = ctx.createRadialGradient(b.x + b.w * .4, b.y + b.h * .35, 2, b.x + b.w / 2, b.y + b.h / 2, b.w / 2);
  g.addColorStop(0, '#4fd99a'); g.addColorStop(1, '#0b5a38');
  ctx.beginPath(); ctx.arc(b.x + b.w / 2, b.y + b.h / 2, b.w / 2, 0, TAU); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = '#f3d27a'; ctx.lineWidth = 2.5; ctx.stroke();
  ctx.fillStyle = '#fff6d8'; rr(ctx, b.x + b.w * .34, b.y + b.h * .3, b.w * .1, b.h * .4, 2); ctx.fill(); rr(ctx, b.x + b.w * .56, b.y + b.h * .3, b.w * .1, b.h * .4, 2); ctx.fill();
  // 铜钱
  const c = L.coin; rr(ctx, c.x, c.y, c.w, c.h, c.h / 2); ctx.fillStyle = 'rgba(0,25,14,.6)'; ctx.fill(); ctx.strokeStyle = 'rgba(243,210,122,.6)'; ctx.lineWidth = 1.2; ctx.stroke();
  coinIcon(ctx, c.x + c.h / 2, c.y + c.h / 2, c.h * 0.46);
  ctx.fillStyle = '#ffe9a0'; ctx.font = `800 ${Math.round(c.h * .52)}px ${FONT}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(save.coins, c.x + c.h + 4, c.y + c.h / 2 + 1);
  pill(L.bUndo, 'undo', save.props.undo); pill(L.bClear, 'clear', save.props.clear);
  // 排行榜：卷轴奖杯
  const r = L.bRank; const cx = r.x + r.w / 2;
  const pr = G.time - (G.press.rank || -9) < .12 ? 2 : 0;
  ctx.save(); ctx.translate(cx, r.y + r.h * .38 + pr);
  g = ctx.createLinearGradient(0, -12, 0, 12); g.addColorStop(0, '#fff3b0'); g.addColorStop(.6, '#f0b432'); g.addColorStop(1, '#9a5c08');
  ctx.beginPath(); ctx.moveTo(-10, -11); ctx.lineTo(10, -11); ctx.quadraticCurveTo(10, 5, 0, 6); ctx.quadraticCurveTo(-10, 5, -10, -11); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = '#5a3204'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.beginPath(); ctx.arc(-11, -5, 4.5, Math.PI * .5, Math.PI * 1.5); ctx.arc(11, -5, 4.5, Math.PI * 1.5, Math.PI * .5); ctx.stroke();
  ctx.fillStyle = g; ctx.fillRect(-2, 5, 4, 5); rr(ctx, -7, 9, 14, 4, 1.5); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#d8302a'; ctx.beginPath(); ctx.arc(0, -4, 3, 0, TAU); ctx.fill();
  ctx.restore();
  label('rank', cx, r.y + r.h * .86 + pr, r.h * 0.36);
  // 目标轨道
  drawTrack();
}
function drawTrack() {
  const s = G.s, st = s.stage, goal = LG.GOALS[st];
  const tx = L.gx + 8, tw = L.GW - 16, ty = L.trackY, th = L.trackH;
  const gw = th * 0.62; // 目标牌宽
  // 关卡牌匾
  ctx.fillStyle = '#ffe9a0'; ctx.font = `900 ${Math.round(th * .2)}px ${FONT}`; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillText(goal === undefined ? '一合到底' : `第 ${st + 1} 关`, tx + 10, ty + 6);
  ctx.fillStyle = 'rgba(255,240,200,.75)'; ctx.font = `700 ${Math.round(th * .16)}px ${FONT}`;
  ctx.fillText('分数 ' + s.score, tx + 10, ty + 8 + th * .22);
  if (goal === undefined) { ctx.fillText('已合出白板 · 无尽挑战', tx + 10, ty + 10 + th * .42); return; }
  const a = st ? LG.GOALS[st - 1] : 0;
  const steps = []; for (let t = a; t < goal; t++) steps.push(t);
  const x0 = tx + Math.min(96, tw * 0.25), x1 = tx + tw - gw - 26; const sw = th * 0.4, sh = sw * 1.3;
  const cy = ty + th * 0.55;
  // 进度线
  const n = steps.length; const px = k => x0 + (x1 - x0) * (n > 1 ? k / (n) : 0) + sw / 2;
  ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(px(0), cy); ctx.lineTo(x1 + 18, cy); ctx.stroke();
  const prog = clamp((s.top - a) / (goal - a), 0, 1);
  const lg = ctx.createLinearGradient(px(0), 0, x1, 0); lg.addColorStop(0, '#f3d27a'); lg.addColorStop(1, '#ffef9a');
  ctx.strokeStyle = lg; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(px(0), cy); ctx.lineTo(px(0) + (x1 + 18 - px(0)) * prog, cy); ctx.stroke();
  steps.forEach((t, k) => {
    const x = px(k) - sw / 2, y = cy - sh / 2; const got = s.top >= t;
    drawTile(t, x, y, sw, sh, { a: got ? 1 : 0.45 });
    if (got) { ctx.fillStyle = '#2fd07a'; ctx.beginPath(); ctx.arc(x + sw, y + sh, 6, 0, TAU); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x + sw - 3, y + sh); ctx.lineTo(x + sw - .5, y + sh + 2.5); ctx.lineTo(x + sw + 3, y + sh - 2.5); ctx.stroke(); }
  });
  // 目标牌 + 皇冠 + 光芒
  const gx = tx + tw - gw - 12, gh = gw * 1.3, gy = ty + th - gh - 6 + 4;
  ctx.save(); ctx.translate(gx + gw / 2, gy + gh / 2); ctx.rotate(G.time * .4);
  for (let i = 0; i < 12; i++) { ctx.rotate(TAU / 12); ctx.fillStyle = 'rgba(255,230,140,.16)'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-5, -gh * .9); ctx.lineTo(5, -gh * .9); ctx.fill(); }
  ctx.restore();
  drawTile(goal, gx, gy, gw, gh, { s: 1 + .03 * Math.sin(G.time * 3) });
  crown(ctx, gx + gw / 2, gy - 4, gw / 44);
  label('goal', gx + gw / 2, ty + th - 2, th * 0.2);
}
function drawRows() {
  const s = G.s;
  const mg = LG.mergeable(s);
  for (let i = 0; i < LG.ROWS; i++) {
    const r = s.rows[i], y = rowY(i), open = LG.isOpen(r);
    const uf = G.time - G.ufx[i];
    if (!open) {
      rr(ctx, L.rx, y, L.rowW, L.rh, 6); ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fill();
      if (r.st === 'temp') {
        const bw = Math.min(150, L.rowW * .45), bh = L.rh * .72, bx = L.rx + (L.rowW - bw) / 2, by = y + (L.rh - bh) / 2;
        const p = 1 + .03 * Math.sin(G.time * 4);
        ctx.save(); ctx.translate(bx + bw / 2, by + bh / 2); ctx.scale(p, p); ctx.translate(-bx - bw / 2, -by - bh / 2);
        let g = ctx.createLinearGradient(0, by, 0, by + bh); g.addColorStop(0, '#fff3c4'); g.addColorStop(.5, '#f2b53a'); g.addColorStop(1, '#c47a10');
        rr(ctx, bx, by + 2, bw, bh, bh / 2); ctx.fillStyle = '#6a3a06'; ctx.fill(); rr(ctx, bx, by, bw, bh, bh / 2); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = '#7a4206'; ctx.lineWidth = 1.4; ctx.stroke();
        const lw = label('temp', bx + bw / 2 + 8, by + bh / 2, bh * .74) || 0;
        if (s.tempFree) { ctx.fillStyle = '#d8302a'; rr(ctx, bx - 6, by - 6, 30, 15, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = `800 10px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('免费', bx + 9, by + 1.5); coinIcon(ctx, bx + bw / 2 - lw / 2 - 4, by + bh / 2, bh * .3); }
        else coinIcon(ctx, bx + bw / 2 - lw / 2 - 4, by + bh / 2, bh * .3);
        ctx.restore();
      } else {
        lockIcon(L.rx + L.rowW / 2, y + L.rh / 2, Math.min(1, L.rh / 50));
        ctx.font = `700 ${Math.round(clamp(L.rh * .26, 10, 13))}px ${FONT}`; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(255,240,200,.6)';
        if (r.st === 'mile') { ctx.textAlign = 'left'; ctx.fillText('合出', L.rx + L.rowW / 2 + 22, y + L.rh / 2); const tw2 = L.rh * .42; drawTile(LG.MILE[i], L.rx + L.rowW / 2 + 52, y + (L.rh - tw2 * 1.3) / 2, tw2, tw2 * 1.3); ctx.fillStyle = 'rgba(255,240,200,.6)'; ctx.fillText('解锁', L.rx + L.rowW / 2 + 58 + tw2, y + L.rh / 2); }
        else if (r.st === 'buy') { ctx.textAlign = 'left'; coinIcon(ctx, L.rx + L.rowW / 2 + 32, y + L.rh / 2, 7); ctx.fillText(COST.buy + ' 永久解锁', L.rx + L.rowW / 2 + 42, y + L.rh / 2); }
      }
      continue;
    }
    // 已开放：选中/可放置/可合成 高亮
    const sel = G.sel && G.sel.row === i;
    const canTo = G.sel && !sel && LG.canMove(s, G.sel.row, i);
    const isM = mg.includes(i) && !G.mfx.some(m => m.row === i);
    if (uf < 2) { const a = uf < 1.4 ? 1 : 1 - (uf - 1.4) / .6; ctx.save(); ctx.globalAlpha = a;
      rr(ctx, L.rx, y, L.rowW, L.rh, 6); ctx.fillStyle = `rgba(255,226,122,${.18 + .12 * Math.sin(uf * 10)})`; ctx.fill();
      rr(ctx, L.rx - 2, y - 2, L.rowW + 4, L.rh + 4, 8); ctx.strokeStyle = '#ffe27a'; ctx.lineWidth = 3 + 2 * Math.max(0, 1 - uf * 2); ctx.stroke();
      if (open && !r.t.length) { const sc = uf < .3 ? easeBack(uf / .3) : 1; ctx.translate(L.rx + L.rowW / 2, y + L.rh / 2); ctx.scale(sc, sc);
        ctx.font = `900 ${Math.round(L.rh * .36)}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#4a2600'; ctx.lineWidth = 5; ctx.strokeText('新的一行 已解锁！', 0, 0); ctx.fillStyle = '#ffe9a0'; ctx.fillText('新的一行 已解锁！', 0, 0); }
      ctx.restore(); }
    if (r.st === 'tempOn') { rr(ctx, L.rx, y, L.rowW, L.rh, 6); ctx.strokeStyle = 'rgba(255,200,80,.55)'; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.5; ctx.stroke(); ctx.setLineDash([]); }
    if (sel) { rr(ctx, L.rx, y, L.rowW, L.rh, 6); ctx.fillStyle = 'rgba(255,226,120,.12)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,226,120,.9)'; ctx.lineWidth = 2; ctx.stroke(); }
    if (canTo) { const p = .5 + .5 * Math.sin(G.time * 7); rr(ctx, L.rx, y, L.rowW, L.rh, 6); ctx.fillStyle = `rgba(120,255,180,${.08 + .07 * p})`; ctx.fill(); ctx.strokeStyle = `rgba(140,255,190,${.5 + .4 * p})`; ctx.lineWidth = 1.8; ctx.stroke(); }
    if (isM) { const p = .5 + .5 * Math.sin(G.time * 5); ctx.save(); ctx.shadowColor = '#ffd84a'; ctx.shadowBlur = 12 + 8 * p; rr(ctx, L.rx, y, L.rowW, L.rh, 6); ctx.strokeStyle = `rgba(255,220,90,${.7 + .3 * p})`; ctx.lineWidth = 2.5; ctx.stroke(); ctx.restore(); }
    const n = r.t.length - G.hid[i]; const ty = tileY(i);
    const run = sel ? G.sel.n : 0; const popT = G.time - G.pop[i];
    for (let k = 0; k < n; k++) {
      const lifted = sel && k >= r.t.length - run;
      let yy = ty, o = undefined;
      if (lifted) yy -= 5 + 2 * Math.sin((G.time - G.sel.t0) * 8 + k * .5);
      if (popT < 0.5) { const q = clamp(popT / 0.45, 0, 1); o = { s: easeBack(q) }; }
      drawTile(r.t[k], tileX(k), yy, L.tw, L.th, o);
      if (lifted) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; rr(ctx, tileX(k) + .5, yy + .5, L.tw - 1, L.th - 1, L.tw * .16); ctx.strokeStyle = 'rgba(255,220,100,.85)'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore(); }
    }
    if (isM) { // 流光扫过整行
      const sw = ((G.time * .9 + i * .13) % 1.4) / 1.4 * (L.rowW + 80) - 40;
      ctx.save(); rr(ctx, L.rx, y, L.rowW, L.rh, 6); ctx.clip(); ctx.globalCompositeOperation = 'lighter';
      const lg = ctx.createLinearGradient(L.rx + sw - 30, 0, L.rx + sw + 30, 0); lg.addColorStop(0, 'rgba(255,240,180,0)'); lg.addColorStop(.5, 'rgba(255,240,180,.35)'); lg.addColorStop(1, 'rgba(255,240,180,0)');
      ctx.fillStyle = lg; ctx.fillRect(L.rx, y, L.rowW, L.rh); ctx.restore();
    }
    // 可放置位置：落点幽灵牌
    if (canTo && G.flyers.length === 0) {
      const k = r.t.length; if (k < 10) { const p = .5 + .5 * Math.sin(G.time * 7); drawTile(s.rows[G.sel.row].t[s.rows[G.sel.row].t.length - 1], tileX(k), ty, L.tw, L.th, { a: .28 + .15 * p }); }
    }
  }
}
function drawMfx() {
  for (let j = G.mfx.length - 1; j >= 0; j--) {
    const m = G.mfx[j], e = G.time - m.t0; if (e < 0) { // 未开始：照常画旧牌
      for (let k = 0; k < 10; k++) drawTile(m.from, tileX(k), tileY(m.row), L.tw, L.th); continue; }
    const cx = tileX(4.5), ty = tileY(m.row);
    if (e < 0.48) {
      for (let k = 0; k < 10; k++) {
        const st = k * 0.022, q = clamp((e - st) / (0.4 - st), 0, 1), qq = easeInOut(q);
        const x = lerp(tileX(k), cx, qq), y = ty - Math.sin(q * Math.PI) * 10;
        drawTile(m.from, x, y, L.tw, L.th, { s: 1 - qq * .25, a: 1 - Math.max(0, q - .85) * 4 });
        if (q > 0 && q < 1 && Math.random() < .08) SND.clack(.25, 1.1);
      }
      if (e > 0.3) { const a = (e - .3) / .18; ctx.save(); ctx.globalCompositeOperation = 'lighter'; const rg = ctx.createRadialGradient(cx + L.tw / 2, ty + L.th / 2, 2, cx + L.tw / 2, ty + L.th / 2, L.tw * 2.2); rg.addColorStop(0, `rgba(255,250,210,${a})`); rg.addColorStop(1, 'rgba(255,220,120,0)'); ctx.fillStyle = rg; ctx.fillRect(cx - L.tw * 2, ty - L.th, L.tw * 5, L.th * 3); ctx.restore(); }
    } else if (!m.done) {
      m.done = true; G.hid[m.row] = 0; G.pop[m.row] = G.time;
      const px = cx + L.tw / 2, py = ty + L.th / 2;
      burst(px, py, m.newTop ? 46 : 28, ['#ffe27a', '#fff6d0', '#ff6a4a', '#7dffb8'], m.newTop ? 360 : 260, 4.5, .9);
      ring(px, py, L.tw * 4, 'rgba(255,230,140,.9)', .5, 5); ring(px, py, L.tw * 2.4, 'rgba(255,255,255,.9)', .35, 3);
      floatText(px, py - 16, '合成！' + LG.tileName(m.to), '#fff3c4', 20);
      G.shake = m.newTop ? 7 : 4;
    }
    if (m.done && e > 0.9) G.mfx.splice(j, 1);
  }
}
function drawFlyers() {
  for (let j = G.flyers.length - 1; j >= 0; j--) {
    const f = G.flyers[j]; const e = (G.time - f.t0) / f.dur;
    if (e < 0) { if (!f.flip) drawTile(f.t, f.x0, f.y0, L.tw, L.th); continue; }
    const q = clamp(e, 0, 1), qq = easeOut(q);
    const x = lerp(f.x0, f.x1, qq), y = lerp(f.y0, f.y1, qq) + Math.sin(q * Math.PI) * f.arc;
    if (f.flip) { const fl = Math.abs(Math.cos(q * Math.PI)); drawTile(f.t, x, y, L.tw, L.th, { sx: Math.max(.05, fl), back: q < .5, s: 1 + Math.sin(q * Math.PI) * .12 }); }
    else drawTile(f.t, x, y, L.tw, L.th, { s: 1 + Math.sin(q * Math.PI) * .1 });
    if (e >= 1) { G.flyers.splice(j, 1); G.hid[f.row] = Math.max(0, G.hid[f.row] - 1); if (f.land) f.land(); if (Math.random() < .5) burst(f.x1 + L.tw / 2, f.y1 + L.th, 2, ['rgba(255,255,255,.7)'], 60, 2, .3); }
  }
}
function drawParts(dt) {
  for (let i = G.parts.length - 1; i >= 0; i--) {
    const p = G.parts[i]; p.t += dt; const q = p.t / p.life; if (q >= 1) { G.parts.splice(i, 1); continue; }
    if (p.k === 'ring') { ctx.globalAlpha = 1 - q; ctx.strokeStyle = p.col; ctx.lineWidth = p.w * (1 - q); ctx.beginPath(); ctx.arc(p.x, p.y, lerp(p.r0, p.r1, easeOut(q)), 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; continue; }
    p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.r += dt * 6;
    ctx.globalAlpha = 1 - q * q; ctx.fillStyle = p.col;
    if (p.k === 'spark') { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); const s = p.s; ctx.beginPath(); ctx.moveTo(0, -s * 1.6); ctx.lineTo(s * .45, 0); ctx.lineTo(0, s * 1.6); ctx.lineTo(-s * .45, 0); ctx.closePath(); ctx.fill(); ctx.rotate(Math.PI / 2); ctx.fill(); ctx.restore(); }
    else if (p.k === 'paper') { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.scale(1, Math.cos(p.t * 9)); ctx.fillRect(-p.s, -p.s * .6, p.s * 2, p.s * 1.2); ctx.restore(); }
    else { ctx.beginPath(); ctx.arc(p.x, p.y, p.s * (1 - q * .5), 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1;
  }
  for (let i = G.floats.length - 1; i >= 0; i--) {
    const f = G.floats[i]; f.t += dt; if (f.t > 1.2) { G.floats.splice(i, 1); continue; }
    const q = f.t / 1.2; const s = f.t < .15 ? easeBack(f.t / .15) : 1;
    ctx.save(); ctx.translate(f.x, f.y - easeOut(q) * 40); ctx.scale(s, s); ctx.globalAlpha = 1 - Math.max(0, q - .6) / .4;
    ctx.font = `900 ${f.size}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    ctx.strokeStyle = '#4a2600'; ctx.lineWidth = 5; ctx.strokeText(f.s, 0, 0); ctx.fillStyle = f.col; ctx.fillText(f.s, 0, 0); ctx.restore();
  }
}
function drawBanner() {
  const b = G.banner; if (!b) return; const e = G.time - b.t0; if (e > 1.9) { G.banner = null; return; }
  const a = e < .2 ? e / .2 : e > 1.5 ? 1 - (e - 1.5) / .4 : 1;
  const cx = W / 2, cy = L.bTop + (L.bBot - L.bTop) * .64;
  ctx.save(); ctx.globalAlpha = a; { const bg = ctx.createLinearGradient(0, cy - 130, 0, cy + 130); bg.addColorStop(0, 'rgba(2,26,16,0)'); bg.addColorStop(.25, 'rgba(2,26,16,.78)'); bg.addColorStop(.75, 'rgba(2,26,16,.78)'); bg.addColorStop(1, 'rgba(2,26,16,0)'); ctx.fillStyle = bg; ctx.fillRect(0, cy - 130, W, 260);
    for (const yy of [cy - 98, cy + 98]) { const gl = ctx.createLinearGradient(0, 0, W, 0); gl.addColorStop(0, 'rgba(255,214,110,0)'); gl.addColorStop(.5, 'rgba(255,214,110,.9)'); gl.addColorStop(1, 'rgba(255,214,110,0)'); ctx.fillStyle = gl; ctx.fillRect(0, yy - 1, W, 2); } } ctx.restore();
  ctx.save(); ctx.globalAlpha = a; ctx.translate(cx, cy); ctx.rotate(e * .6);
  for (let i = 0; i < 16; i++) { ctx.rotate(TAU / 16); const lg = ctx.createLinearGradient(0, 0, 0, -150); lg.addColorStop(0, 'rgba(255,230,140,.5)'); lg.addColorStop(1, 'rgba(255,230,140,0)'); ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-14, -150); ctx.lineTo(14, -150); ctx.fill(); }
  ctx.restore();
  const s = e < .35 ? easeBack(e / .35) : 1; const tw = 66, th = tw * 1.3;
  ctx.save(); ctx.globalAlpha = a; drawTile(b.t, cx - tw / 2, cy - th / 2 - 8, tw, th, { s: s * (1 + .03 * Math.sin(e * 8)) });
  ctx.font = `900 24px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#4a2600'; ctx.lineWidth = 6;
  const t1 = '新牌 · ' + LG.tileName(b.t); ctx.strokeText(t1, cx, cy + th / 2 + 20); const lg = ctx.createLinearGradient(0, cy + th / 2 + 8, 0, cy + th / 2 + 32); lg.addColorStop(0, '#fffbe0'); lg.addColorStop(1, '#ffc94a'); ctx.fillStyle = lg; ctx.fillText(t1, cx, cy + th / 2 + 20);
  ctx.restore();
}
function drawTut() {
  const t = tutTarget(); if (!t || G.mode !== 'play' || busy()) return;
  let x, y, bx, by;
  if (t.kind === 'row') { const r = G.s.rows[t.row]; const k = Math.max(0, (t.row === 6 ? r.t.length : r.t.length - 1)); x = tileX(Math.min(9, k)) + L.tw * .6; y = tileY(t.row) + L.th * .7; }
  else { x = t.b.x + t.b.w * .6; y = t.b.y + t.b.h * .6; }
  // 气泡
  ctx.font = `900 16px ${FONT}`; const tw = ctx.measureText(t.text).width + 26; bx = clamp(x - tw / 2, 8, W - tw - 8); by = y - L.th - 46;
  if (t.kind === 'btn') by = t.b.y - 58;
  const bob = Math.sin(G.time * 5) * 3;
  let g = ctx.createLinearGradient(0, by, 0, by + 34); g.addColorStop(0, '#fffaf0'); g.addColorStop(1, '#f6e2b0');
  rr(ctx, bx, by + bob, tw, 34, 8); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = '#8a5a12'; ctx.lineWidth = 2; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(clamp(x, bx + 12, bx + tw - 12) - 7, by + 34 + bob); ctx.lineTo(clamp(x, bx + 12, bx + tw - 12), by + 44 + bob); ctx.lineTo(clamp(x, bx + 12, bx + tw - 12) + 7, by + 34 + bob); ctx.fillStyle = '#f6e2b0'; ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#6a3a06'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(t.text, bx + tw / 2, by + 17 + bob);
  // 手指
  const tap = (G.time * 1.4) % 1; const dy = tap < .3 ? -tap * 20 : tap < .45 ? -6 + (tap - .3) / .15 * 6 : 0;
  if (tap > .3 && tap < .7) { ctx.strokeStyle = `rgba(255,255,255,${.8 - (tap - .3) * 2})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 6 + (tap - .3) * 50, 0, TAU); ctx.stroke(); }
  hand(x, y + 4 + dy);
}
function hand(x, y) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(-.35); ctx.lineJoin = 'round';
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 2.2;
  ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(-4, 22); ctx.quadraticCurveTo(-14, 16, -15, 24); ctx.quadraticCurveTo(-6, 36, 0, 44); ctx.lineTo(20, 44); ctx.quadraticCurveTo(26, 34, 25, 24); ctx.lineTo(25, 18); ctx.quadraticCurveTo(25, 13, 20, 13); ctx.quadraticCurveTo(19, 9, 14, 10); ctx.quadraticCurveTo(12, 6, 7, 8); ctx.lineTo(6, 0); ctx.quadraticCurveTo(1, -6, -4, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(6, 8); ctx.lineTo(6, 20); ctx.moveTo(14, 10); ctx.lineTo(14, 21); ctx.moveTo(20, 13); ctx.lineTo(20, 22); ctx.stroke();
  ctx.restore();
}
function drawMenuBg() {
  // 标题背景：牌桌 + 漂浮麻将
  ctx.drawImage(menuCache || bgCache, 0, 0, W, H);
  // 标题后旋转金光
  const lg = $('mLogo'); let cy = H * .25; if (lg && lg.offsetHeight) { const r = lg.getBoundingClientRect(); cy = r.top + r.height * .5; }
  ctx.save(); ctx.translate(W / 2, cy); ctx.rotate(G.time * .12);
  for (let i = 0; i < 18; i++) { ctx.rotate(TAU / 18); const g = ctx.createLinearGradient(0, 0, 0, -H * .6); g.addColorStop(0, 'rgba(255,226,140,.16)'); g.addColorStop(1, 'rgba(255,226,140,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-W * .09, -H * .6); ctx.lineTo(W * .09, -H * .6); ctx.fill(); }
  ctx.restore();
  { const g = ctx.createRadialGradient(W / 2, cy, 10, W / 2, cy, W * .7); g.addColorStop(0, 'rgba(255,240,170,.22)'); g.addColorStop(1, 'rgba(255,240,170,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
  { const g = ctx.createRadialGradient(W / 2, H / 2, H * .3, W / 2, H / 2, H * .75); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,10,5,.55)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
  if (!G.deco) { G.deco = []; for (let i = 0; i < 14; i++) G.deco.push({ x: rnd(0, W), y: rnd(0, H), v: rnd(10, 26), r: rnd(-.6, .6), vr: rnd(-.3, .3), t: Math.floor(rnd(0, 34)), s: rnd(.7, 1.3) }); }
  for (const d of G.deco) { d.y -= d.v * G.dt; d.r += d.vr * G.dt; if (d.y < -80) { d.y = H + 60; d.x = rnd(0, W); d.t = Math.floor(rnd(0, 34)); } const w = 30 * d.s; drawTile(d.t, d.x, d.y, w, w * 1.3, { rot: d.r, a: .5 }); }
}
function render(dt) {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (!bgCache) buildBg();
  if (G.mode === 'menu' || G.mode === 'load' || !G.s) { drawMenuBg(); return; }
  let sx = 0, sy = 0; if (G.shake > 0) { sx = rnd(-1, 1) * G.shake; sy = rnd(-1, 1) * G.shake; G.shake = Math.max(0, G.shake - dt * 30); }
  ctx.save(); ctx.translate(sx, sy);
  ctx.drawImage(bgCache, 0, 0, W, H);
  // 牌桌快满：边框红光
  const f = LG.freeSpace(G.s);
  if (f <= 8 && !LG.mergeable(G.s).length) { const p = .5 + .5 * Math.sin(G.time * 5); ctx.save(); rr(ctx, L.bx + 2, L.bTop + 2, L.bw - 4, L.bh - 4, 13); ctx.strokeStyle = `rgba(255,70,50,${.35 + .4 * p})`; ctx.lineWidth = 4; ctx.shadowColor = '#ff3a2a'; ctx.shadowBlur = 16; ctx.stroke(); ctx.restore(); }
  drawRows(); drawMfx(); drawFlyers();
  ctx.restore();
  drawHud();
  const mg = LG.mergeable(G.s).length > 0 && !G.mfx.length;
  const canDeal = G.s.rows.some(r => LG.isOpen(r) && !(r.st === 'tempOn' && r.exp) && r.t.length < LG.CAP);
  drawBtn(L.bDeal, 'deal', canDeal, false); drawBtn(L.bMerge, 'merge', mg, mg);
  drawParts(dt); drawBanner(); drawTut();
}

/* ---------- 界面 ---------- */
const show = id => $(id).classList.add('on'), hide = id => $(id).classList.remove('on');
function syncToggles() {
  for (const id of ['tMusic', 'pMusic']) $(id).classList.toggle('off', !save.music);
  for (const id of ['tSfx', 'pSfx']) $(id).classList.toggle('off', !save.sfx);
  SND.setMusic(save.music); SND.setSfx(save.sfx);
}
function toggleMusic() { save.music = !save.music; try{GT.sound('music',save.music)}catch(_e){} persist(); syncToggles(); SND.unlock(); if (save.music) SND.startMusic(); SND.tap(); }
function toggleSfx() { save.sfx = !save.sfx; try{GT.sound('sfx',save.sfx)}catch(_e){} persist(); syncToggles(); SND.tap(); }
$('tMusic').onclick = toggleMusic; $('pMusic').onclick = toggleMusic; $('tSfx').onclick = toggleSfx; $('pSfx').onclick = toggleSfx;
function menu() {
  G.mode = 'menu'; ['pause', 'win', 'fail', 'ask', 'rankScr'].forEach(hide); show('menu');
  const has = save.st && (save.st.merges > 0 || save.st.deals > 0);
  $('bPlay').textContent = has ? `继续游戏 · 第 ${save.st.stage + 1} 关` : '开始游戏';
  $('bNew').style.display = has ? '' : 'none';
  const ms = $('mStat'); ms.innerHTML = '';
  const bt = save.best.top; ms.append('最大的牌 '); ms.append(tileCanvas(bt, 16)); ms.append(` ${LG.tileName(bt)} · 最高分 ${save.best.score}`);
}
function startPlay(fresh) {
  SND.unlock(); SND.startMusic();
  hide('menu');
  if (fresh || !save.st) newGame(); else { G.s = save.st; }
  G.hist = []; resetVis(); G.mode = 'play'; try{GT.lv(G.s.stage+1,{cont:(!fresh&&G.s.merges>0)?1:0})}catch(_e){}
  if (DEBUG.fill) { debugFill(); DEBUG.fill = false; }
  else if (DEBUG.stage >= 0) { G.s.stage = DEBUG.stage; G.s.top = DEBUG.stage ? LG.GOALS[DEBUG.stage - 1] : 0; save.cp = clone(G.s); DEBUG.stage = -1; }
  if (!save.tut) tutStart();
  // 进入时出牌动画
  G.s.rows.forEach((r, i) => { if (!LG.isOpen(r)) return; r.t.forEach((t, k) => { G.hid[i]++; G.flyers.push({ t, x0: W / 2 - L.tw / 2, y0: H + 20, x1: tileX(k), y1: tileY(i), t0: G.time + 0.15 + (i * 0.04 + k * 0.025), dur: 0.42, row: i, arc: -20, flip: 1, land: () => SND.clack(.35, 1.05) }); }); });
  if (G.flyers.length) SND.shuffle(10);
  after(1.2, () => { if (LG.stuck(G.s)) { G.over = true; showFail(); } });
}
$('bPlay').onclick = () => { SND.unlock(); SND.tap(); try{GT.title('play')}catch(_e){} startPlay(false); };
$('bNew').onclick = () => { SND.unlock(); SND.tap(); try{GT.title('new')}catch(_e){} ask('重新开局', '确定放弃当前进度，从<b>一筒</b>重新开始吗？<br>（最高纪录会保留）', '重新开局', () => { hide('menu'); startPlay(true); }); G.mode = 'menu'; };
function pause() { if (G.mode !== 'play') return; G.mode = 'paused'; try{GT.pause()}catch(_e){} show('pause'); }
$('pResume').onclick = () => { SND.tap(); hide('pause'); G.mode = 'play'; };
$('pRestart').onclick = () => { SND.tap(); hide('pause'); restartStage(); };
$('pQuit').onclick = () => { SND.tap(); try{GT.quit('menu')}catch(_e){} hide('pause'); save.st = G.s; persist(); menu(); };
function restartStage() {
  G.s = clone(save.cp || freshState()); save.st = G.s; persist(); G.hist = []; resetVis(); G.mode = 'play'; try{GT.lv(G.s.stage+1)}catch(_e){} SND.shuffle(12);
  G.s.rows.forEach((r, i) => { if (!LG.isOpen(r)) return; r.t.forEach((t, k) => { G.hid[i]++; G.flyers.push({ t, x0: W / 2 - L.tw / 2, y0: H + 20, x1: tileX(k), y1: tileY(i), t0: G.time + 0.1 + (i * 0.04 + k * 0.025), dur: 0.42, row: i, arc: -20, flip: 1 }); }); });
}
function showWin() {
  const s = G.s; const goal = LG.GOALS[s.stage]; const last = s.stage === LG.GOALS.length - 1; try{GT.win(s.stage+1,{score:s.score,top:s.top})}catch(_e){}
  G.mode = 'win'; SND.win(); vib(40); toastEl.classList.remove('on');
  for (let i = 0; i < 90; i++) G.parts.push({ x: rnd(0, W), y: rnd(-60, -10), vx: rnd(-40, 40), vy: rnd(60, 200), g: 60, life: rnd(2, 3.4), t: 0, col: ['#ffd84a', '#d8302a', '#2fd07a', '#fff3c4'][i % 4], s: rnd(3, 6), k: 'paper', r: rnd(0, TAU) });
  const reward = 40 + s.stage * 25;
  $('wTitle').textContent = last ? '一合到底！' : `第 ${s.stage + 1} 关 · 过关！`;
  const tb = $('wTiles'); tb.innerHTML = ''; const a = s.stage ? LG.GOALS[s.stage - 1] : 0;
  [a, goal].forEach((t, k) => { const c = tileCanvas(t, k ? 58 : 40); tb.append(c); if (!k) { const ar = document.createElement('span'); ar.textContent = '➜'; ar.style.cssText = 'font-size:26px;color:#c0391c;margin-bottom:30px;font-weight:900'; tb.append(ar); } });
  $('wInfo').innerHTML = last ? '从一筒一路合到了<b>白板</b>，真正的「一合到底」！<br>分数 <b>' + s.score + '</b>' : `合出了 <b>${LG.tileName(goal)}</b>！ 分数 <b>${s.score}</b><br>下一关目标：<b>${LG.tileName(LG.GOALS[s.stage + 1])}</b>`;
  $('wReward').innerHTML = `<div class="reward"><span class="coin"></span> 铜钱 <b>+${reward}</b>&nbsp;·&nbsp;撤销 <b>+1</b>&nbsp;·&nbsp;消除 <b>+1</b></div>`;
  save.coins += reward; save.props.undo++; save.props.clear++;
  s.stage++; s.tempFree = true; s.rows.forEach(r => { if (r.st === 'tempOn') r.exp = true; }); LG.expire(s);
  save.cp = clone(s); save.st = s; recordRun(); persist();
  $('wNext').textContent = last ? '继续无尽挑战' : '下一关';
  setTimeout(() => show('win'), 500);
}
$('wNext').onclick = () => { SND.tap(); hide('win'); G.mode = 'play'; try{GT.lv(G.s.stage+1)}catch(_e){} G.winT = -1; G.hist = []; afterAction(); };
function showFail() {
  if (G.mode !== 'play') { after(0.3, () => { if (G.over) showFail(); }); return; }
  G.mode = 'fail'; G.failOpen = false; SND.fail(); vib(60); try{GT.fail(G.s.stage+1,{r:'full',score:G.s.score,top:G.s.top})}catch(_e){}
  const s = G.s, m = LG.lowestTier(s);
  $('fInfo').innerHTML = `所有的行都塞满了，又凑不出 10 张同牌。<br>可以消除全部「<b>${LG.tileName(m)}</b>」腾出空位继续！`;
  $('fClearCost').innerHTML = save.props.clear > 0 ? `剩 ${save.props.clear} 次` : `<span class="coin"></span>${COST.clear}`;
  const tr = s.rows[LG.TEMP_ROW];
  $('fTemp').style.display = tr.st === 'temp' ? '' : 'none';
  $('fTempCost').innerHTML = s.tempFree ? '免费' : `<span class="coin"></span>${COST.temp}`;
  show('fail');
}
$('fClear').onclick = () => { SND.tap(); if (save.props.clear <= 0 && save.coins < COST.clear) { toast('铜钱不够啦'); SND.deny(); return; } hide('fail'); G.mode = 'play'; G.over = false; try{GT.revive('clear')}catch(_e){} doClear(true); };
$('fTemp').onclick = () => { SND.tap(); try{GT.revive('temp')}catch(_e){} hide('fail'); G.mode = 'play'; G.over = false; G.failOpen = true; tapLocked(LG.TEMP_ROW); };
$('fRetry').onclick = () => { SND.tap(); hide('fail'); restartStage(); };
$('fMenu').onclick = () => { SND.tap(); hide('fail'); restartStage(); G.flyers = []; G.hid.fill(0); menu(); };
// 返回 Tilo 游戏屋：先存档再离开（与「返回首页」保存方式一致）
function goHub(e) {
  if (e) e.stopPropagation();
  try {
    if (G.mode === 'fail') { G.s = clone(save.cp || freshState()); save.st = G.s; }
    else if (G.s && (G.mode === 'paused' || G.mode === 'play')) save.st = G.s;
  } catch (_) { }
  persist(); try { SND.tap(); } catch (_) { } try{GT.hub(e&&e.currentTarget&&e.currentTarget.id)}catch(_e){} location.href = '../';
}
for (const id of ['mHub', 'pHub', 'wHub', 'fHub']) $(id).onclick = goHub;
function openRank() {
  if (G.mode !== 'play') return; G.mode = 'rank'; recordRun(); persist();
  const tb = $('rankTbl'); tb.innerHTML = '';
  const runs = (save.runs || []).slice(0, 8);
  if (!runs.length) { tb.innerHTML = '<tr><td colspan="4" style="color:#8a6a40">还没有战绩，先合几张牌吧！</td></tr>'; }
  runs.forEach((r, i) => {
    const tr = document.createElement('tr'); if (r.id === save.runId) tr.className = 'me';
    const d = new Date(r.d); const td = (h) => { const e = document.createElement('td'); if (typeof h === 'string') e.innerHTML = h; else e.append(h); return e; };
    tr.append(td(['🥇', '🥈', '🥉'][i] || String(i + 1)));
    const tc = document.createElement('div'); tc.style.cssText = 'display:flex;align-items:center;gap:6px'; tc.append(tileCanvas(r.top, 18)); tc.append(LG.tileName(r.top)); tr.append(td(tc));
    tr.append(td(`<b style="color:#c0391c">${r.score}</b>`)); tr.append(td(`<span style="font-size:12px;color:#8a6a40">${d.getMonth() + 1}/${d.getDate()} · 第${r.stage + 1}关</span>`));
    tb.append(tr);
  });
  show('rankScr');
}
$('rClose').onclick = () => { SND.tap(); hide('rankScr'); G.mode = 'play'; };

/* ---------- 机器人（?bot 调试） ---------- */
let botT = 0;
function botTick(dt) {
  if (!DEBUG.bot) return;
  botT -= dt; if (botT > 0) return; botT = 0.22 / DEBUG.speed;
  if (G.mode === 'win') { $('wNext').click(); return; }
  if (G.mode === 'fail') { $('fClear').click(); return; }
  if (G.mode !== 'play' || busy()) return;
  const m = LG.botStep(G.s);
  if (!m) return;
  if (m.type === 'merge') doMerge();
  else if (m.type === 'deal') doDeal();
  else { if (!G.sel || G.sel.row !== m.a) { tapRow(m.a); botT = 0.15; G.botNext = m.b; return; } tapRow(m.b); }
}

/* ---------- 主循环 ---------- */
let last = performance.now();
function frame(t) {
  requestAnimationFrame(frame);
  let dt = Math.min(0.05, (t - last) / 1000); last = t; dt *= DEBUG.speed; G.dt = dt;
  if (G.mode === 'play' || G.mode === 'win' || G.mode === 'menu' || G.mode === 'load' || G.mode === 'fail') {
    G.time += dt;
    for (let i = G.timers.length - 1; i >= 0; i--) if (G.time >= G.timers[i].at) { const f = G.timers[i].fn; G.timers.splice(i, 1); f(); }
  }
  botTick(dt);
  render(dt);
}
window.addEventListener('resize', () => { layout(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { SND.stopMusic(); if (G.mode === 'play') pause(); } else if (save.music && G.mode !== 'load') SND.startMusic(); });
window.__G = G; window.__LG = LG; window.__L = () => L; window.__dbg = { pause: () => pause(), openRank: () => openRank(), doMerge: () => doMerge(), doDeal: () => doDeal(), showFail: () => showFail() }; window.__save = () => save;

/* ---------- 加载 ---------- */
function load() {
  layout(); requestAnimationFrame(frame);
  let n = 0; const done = () => { n++; $('loadBar').style.width = (n / ASSETS.length * 100) + '%'; if (n === ASSETS.length) setTimeout(ready, 250); };
  for (const a of ASSETS) { const im = new Image(); im.onload = () => { IMG[a.split('.')[0]] = im; done(); }; im.onerror = done; im.src = 'assets/' + a; }
}
function ready() {
  tileCache = {}; hide('load'); syncToggles();
  if (!G.s && save.st) G.s = null;
  if (DEBUG.autostart || DEBUG.bot || DEBUG.fill) { startPlay(DEBUG.reset || !save.st); return; }
  menu();
}
document.body.addEventListener('pointerdown', () => { SND.unlock(); if (save.music) SND.startMusic(); }, { once: true });
load();
})();
