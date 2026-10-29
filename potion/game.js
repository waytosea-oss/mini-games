/* ===== 魔法药水铺 · 主程序（Canvas 渲染 + 交互 + 动画） ===== */
(() => {
'use strict';
const Q = new URLSearchParams(location.search);
const DBG = { level: +Q.get('level') || 0, bot: Q.has('bot'), unlock: Q.has('unlock'), speed: Math.max(.25, +Q.get('speed') || 1) };
const $ = id => document.getElementById(id);
const cv = $('cv'), ctx = cv.getContext('2d');
const FONT = '"PingFang SC","Hiragino Sans GB","Microsoft YaHei","Noto Sans CJK SC","Noto Sans SC",sans-serif';
const HID = PL.HID;
let W = 0, H = 0, DPR = 1, SAT = 0, SAB = 0;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const easeOut = t => 1 - Math.pow(1 - t, 3);
const easeBack = t => { const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const bounce = t => { const n = 7.5625, d = 2.75; if (t < 1 / d) return n * t * t; if (t < 2 / d) return n * (t -= 1.5 / d) * t + .75; if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + .9375; return n * (t -= 2.625 / d) * t + .984375; };
const rnd = (a, b) => a + Math.random() * (b - a);

/* ---------- 颜色 ---------- */
const PAL = [
  ['火焰', '#ff3b4e', '#ffa0a8', '#9e1028'],
  ['深海', '#2f6bff', '#9cbcff', '#13309a'],
  ['阳光', '#ffd030', '#fff3a8', '#b88200'],
  ['森林', '#46d22e', '#b8f7a0', '#1c7210'],
  ['星辰', '#9a45ff', '#d6b0ff', '#4e14a0'],
  ['爱心', '#ff5cc8', '#ffb8e8', '#a81a78'],
  ['南瓜', '#ff8a1a', '#ffcf98', '#a84800'],
  ['人鱼', '#20d8d8', '#a8fff8', '#087a84'],
  ['月光', '#eef2ff', '#ffffff', '#8890c4'],
];
const hexA = (h, a) => { const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };

/* ---------- 存档 ---------- */
const SKEY = 'potionShop_v1';
const DEF = { unlocked: 1, stars: [], coins: 100, props: { add: 2, undo: 5, reveal: 2, hint: 3 }, music: true, sfx: true, tut: {} };
let S;
try { S = Object.assign({}, DEF, JSON.parse(localStorage.getItem(SKEY) || '{}')); S.props = Object.assign({}, DEF.props, S.props || {}); S.tut = S.tut || {}; } catch (e) { S = JSON.parse(JSON.stringify(DEF)); }
if (DBG.unlock) S.unlocked = LEVELS.length;
const save = () => { try { localStorage.setItem(SKEY, JSON.stringify(S)); } catch (e) { } };
const PRICE = { add: 100, undo: 40, reveal: 60, hint: 50 };
const PNAME = { add: '空瓶', undo: '时光倒流', reveal: '光明咒', hint: '提示' };

/* ---------- 图片 ---------- */
const CUST = [
  { k: 'c_elf', name: '精灵小莉' }, { k: 'c_dwarf', name: '矮人铁锤' }, { k: 'c_dragon', name: '小龙阿焰' },
  { k: 'c_cat', name: '黑猫墨墨' }, { k: 'c_ghost', name: '幽灵啵啵', float: 1 }, { k: 'c_mush', name: '蘑菇菇' },
];
const SRC = { shop: 'assets/shop.jpg', wall: 'assets/wall.jpg', witch: 'assets/witch.webp', ic_add: 'assets/ic_flask.webp', ic_undo: 'assets/ic_undo.webp', ic_reveal: 'assets/ic_reveal.webp', ic_hint: 'assets/ic_hint.webp' };
CUST.forEach(c => SRC[c.k] = 'assets/' + c.k + '.webp');
const IMG = {};

/* ---------- 瓶型几何（面积法计算液面） ---------- */
function profile(shape) {
  const P = [];
  const ell = (y0, h0, y1, h1, n) => { for (let k = 1; k <= n; k++) { const a = k / n * Math.PI / 2; P.push([y0 + (y1 - y0) * Math.sin(a), h1 + (h0 - h1) * Math.cos(a)]); } };
  if (shape === 'tube') {
    const r = .4; for (let k = 0; k <= 10; k++) { const a = k / 10 * Math.PI / 2; P.push([r - r * Math.cos(a), r * Math.sin(a)]); }
    P.push([2.44, .4], [2.52, .42], [2.57, .47], [2.66, .47]);
    return { P, fillY: 2.3, top: 2.66, lipHW: .47, bodyTop: 2.3, neck: 0 };
  }
  if (shape === 'vial') {
    P.push([0, .38], [.012, .43], [.035, .46], [.08, .48], [1.8, .48]); ell(1.8, .48, 2.16, .2, 7);
    P.push([2.5, .2], [2.53, .26], [2.62, .26]);
    return { P, fillY: 2.02, top: 2.62, lipHW: .26, bodyTop: 1.8, neck: 2.16 };
  }
  if (shape === 'pear') {
    P.push([0, .3], [.03, .4], [.1, .47], [.22, .51], [.45, .53], [.75, .52], [1.1, .48], [1.5, .42], [1.82, .36]); ell(1.82, .36, 2.12, .19, 6);
    P.push([2.48, .19], [2.51, .25], [2.6, .25]);
    return { P, fillY: 2.0, top: 2.6, lipHW: .25, bodyTop: 1.75, neck: 2.12 };
  }
  // 坩埚（宽口水晶坩埚，单位 = fw）
  P.push([0, .5], [.05, .66], [.14, .8], [.3, .91], [.52, .98], [.8, 1.0], [1.08, .98], [1.3, .92], [1.42, .86], [1.5, .87], [1.58, .9]);
  return { P, fillY: 1.42, top: 1.58, lipHW: .9, bodyTop: 1.3, neck: 0 };
}
const PROF = {}; ['tube', 'vial', 'pear', 'cau'].forEach(s => PROF[s] = profile(s));
const GEO = new Map();
function polyArea(p) { let a = 0; for (let i = 0, n = p.length; i < n; i++) { const [x1, y1] = p[i], [x2, y2] = p[(i + 1) % n]; a += x1 * y2 - x2 * y1; } return Math.abs(a) / 2; }
function clipHP(p, nx, ny, d) { // 保留 nx*x+ny*y <= d
  const out = []; const n = p.length; if (!n) return out;
  for (let i = 0; i < n; i++) {
    const A = p[i], B = p[(i + 1) % n];
    const da = nx * A[0] + ny * A[1] - d, db = nx * B[0] + ny * B[1] - d;
    if (da <= 0) out.push(A);
    if ((da < 0 && db > 0) || (da > 0 && db < 0)) { const t = da / (da - db); out.push([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t]); }
  }
  return out;
}
// 高度函数（世界坐标里向上为正）：h = -(sinθ·x + cosθ·y)
const below = (p, th, Hh) => clipHP(p, -Math.sin(th), -Math.cos(th), Hh);
const above = (p, th, Hh) => clipHP(p, Math.sin(th), Math.cos(th), -Hh);
function getGeo(shape, fw, cap) {
  const key = shape + '|' + fw.toFixed(2) + '|' + cap;
  let g = GEO.get(key); if (g) return g;
  const pr = PROF[shape], P = pr.P, gl = fw * (shape === 'cau' ? .07 : .06);
  const right = P.map(([y, h]) => [h * fw, -y * fw]);
  const poly = right.concat(right.slice().reverse().map(([x, y]) => [-x, y]));
  const oR = P.map(([y, h], i) => [h * fw + gl, -y * fw + (i === 0 ? gl : 0)]);
  const outer = oR.concat(oR.slice().reverse().map(([x, y]) => [-x, y]));
  const capA = polyArea(below(poly, 0, pr.fillY * fw));
  const maxHW = Math.max(...P.map(q => q[1])) * fw;
  g = { id: key, shape, fw, cap, poly, outer, ua: capA / cap, top: pr.top * fw, lipX: pr.lipHW * fw, lipHW: pr.lipHW * fw, fillY: pr.fillY * fw, bodyTop: pr.bodyTop * fw, neck: pr.neck * fw, maxHW, gl, P,
    hwAt(hpx) { const y = hpx / fw; for (let i = 1; i < P.length; i++) if (P[i][0] >= y) { const [y0, h0] = P[i - 1], [y1, h1] = P[i]; return (h0 + (h1 - h0) * (y - y0) / Math.max(1e-6, y1 - y0)) * fw; } return P[P.length - 1][1] * fw; } };
  GEO.set(key, g); return g;
}
const LC = new Map();
function hRange(p, th) { let mn = 1e9, mx = -1e9; const s = Math.sin(th), c = Math.cos(th); for (const [x, y] of p) { const h = -(s * x + c * y); if (h < mn) mn = h; if (h > mx) mx = h; } return [mn, mx]; }
function levelOf(g, th, area) {
  const k = g.id + '|' + th.toFixed(3) + '|' + area.toFixed(1);
  const cv0 = LC.get(k); if (cv0 !== undefined) return cv0;
  let [lo, hi] = hRange(g.poly, th);
  if (area <= 0) { LC.set(k, lo); return lo; }
  for (let i = 0; i < 22; i++) { const m = (lo + hi) / 2; if (polyArea(below(g.poly, th, m)) < area) lo = m; else hi = m; }
  const v = (lo + hi) / 2; if (LC.size > 9000) LC.clear(); LC.set(k, v); return v;
}
function tiltFor(g, area, dir) { // 让液面刚好到达瓶口的最小倾角
  const lip = [dir * g.lipX, -g.top];
  const f = th => levelOf(g, th, area) - (-(Math.sin(th) * lip[0] + Math.cos(th) * lip[1]));
  let lo = 0, hi = 2.35;
  if (f(dir * hi) < 0) return dir * hi;
  for (let i = 0; i < 15; i++) { const m = (lo + hi) / 2; if (f(dir * m) >= 0) hi = m; else lo = m; }
  return dir * hi;
}

/* ---------- 绘图小工具 ---------- */
function path(c, pts) { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); }
function rr(c, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function star(c, x, y, r, r2, n = 5, rot = -Math.PI / 2) { c.beginPath(); for (let i = 0; i < n * 2; i++) { const a = rot + i * Math.PI / n, rr2 = i % 2 ? r2 : r; c.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); } c.closePath(); }
function sparkle(c, x, y, r, col, a = 1) { c.save(); c.globalAlpha *= a; c.fillStyle = col; c.beginPath(); c.moveTo(x, y - r); c.quadraticCurveTo(x, y, x + r, y); c.quadraticCurveTo(x, y, x, y + r); c.quadraticCurveTo(x, y, x - r, y); c.quadraticCurveTo(x, y, x, y - r); c.fill(); c.restore(); }
function goldGrad(c, x0, y0, x1, y1) { const g = c.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, '#fff3b0'); g.addColorStop(.35, '#f2c14e'); g.addColorStop(.7, '#b07818'); g.addColorStop(1, '#ffe48a'); return g; }
function text(c, s, x, y, size, col, o = {}) {
  c.font = `${o.w || 900} ${size}px ${FONT}`; c.textAlign = o.al || 'center'; c.textBaseline = o.bl || 'middle';
  if (o.st) { c.lineJoin = 'round'; c.lineWidth = o.sw || size * .22; c.strokeStyle = o.st; c.strokeText(s, x, y); }
  c.fillStyle = col; c.fillText(s, x, y);
}

/* ---------- 药瓶绘制 ---------- */
let TIME = 0;
function liqGrad(c, g, base, light, dark) {
  const w = g.maxHW, gr = c.createLinearGradient(-w, 0, w, 0);
  gr.addColorStop(0, dark); gr.addColorStop(.22, base); gr.addColorStop(.4, light); gr.addColorStop(.62, base); gr.addColorStop(1, dark); return gr;
}
function drawLiquid(c, g, layers, ths, o) {
  let total = 0; for (const L of layers) total += L.a;
  if (total <= 0.001) return { top: levelOf(g, ths, 0), total: 0 };
  let cum = 0, H0 = levelOf(g, ths, 0); const tops = [];
  for (let j = 0; j < layers.length; j++) {
    const Ly = layers[j]; cum += Ly.a;
    const H1 = levelOf(g, ths, cum * g.ua);
    tops.push(H1);
    const band = above(below(g.poly, ths, H1), ths, H0 - .3);
    if (band.length >= 3) {
      path(c, band);
      if (Ly.v & HID) {
        c.fillStyle = liqGrad(c, g, '#3a2360', '#5c3f8e', '#160a28'); c.fill();
        // 紫雾漩涡 + 问号
        let cx = 0, cy = 0; for (const q of band) { cx += q[0]; cy += q[1]; } cx /= band.length; cy /= band.length;
        c.save(); path(c, band); c.clip();
        for (let k = 0; k < 3; k++) { const a = TIME * (.8 + k * .3) + k * 2; c.fillStyle = `rgba(190,150,255,${.10 + k * .03})`; c.beginPath(); c.ellipse(cx + Math.cos(a) * g.fw * .18, cy + Math.sin(a * 1.3) * (H1 - H0) * .2, g.fw * .28, (H1 - H0) * .25, a, 0, 7); c.fill(); }
        c.restore();
        if (H1 - H0 > g.fw * .22) text(c, '?', cx, cy + 1, Math.min(g.fw * .42, (H1 - H0) * .8), '#e6d4ff', { st: '#1a0a30', sw: 3 });
      } else {
        const p = PAL[Ly.v & 15]; c.fillStyle = liqGrad(c, g, p[1], p[2], p[3]); c.fill();
      }
    }
    H0 = H1;
  }
  const top = tops[tops.length - 1];
  // 内部荧光
  const liq = below(g.poly, ths, top);
  if (liq.length >= 3) {
    c.save(); path(c, liq); c.clip();
    c.globalCompositeOperation = 'lighter';
    const rg = c.createRadialGradient(-g.maxHW * .2, -top * .45, 0, -g.maxHW * .2, -top * .45, g.fw * 1.1);
    rg.addColorStop(0, 'rgba(255,255,255,.22)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = rg; c.fillRect(-g.maxHW * 2, -g.top - 10, g.maxHW * 4, g.top + 20);
    c.globalCompositeOperation = 'source-over';
    // 层间细缝
    for (let j = 0; j < tops.length - 1; j++) { const s = above(below(g.poly, ths, tops[j] + .7), ths, tops[j] - .7); if (s.length >= 3) { path(c, s); c.fillStyle = 'rgba(20,0,40,.28)'; c.fill(); } }
    // 气泡
    if (o.bub && Math.abs(ths) < .05) for (const b of o.bub) {
      if (b.h > top - b.r) continue; const hw = g.hwAt(b.h) * .78;
      c.beginPath(); c.arc(b.x * hw, -b.h, b.r, 0, 7); c.fillStyle = 'rgba(255,255,255,.22)'; c.fill(); c.strokeStyle = 'rgba(255,255,255,.65)'; c.lineWidth = 1; c.stroke();
    }
    c.restore();
    // 液面高光（弯月面）
    const tl = layers[layers.length - 1];
    const surf = above(below(g.poly, ths, top), ths, top - Math.max(2, g.fw * .07));
    if (surf.length >= 3) { path(c, surf); c.fillStyle = (tl.v & HID) ? 'rgba(170,140,230,.6)' : hexA(PAL[tl.v & 15][2], .9); c.fill(); }
  }
  // 揭示闪光
  if (o.rev && o.rev.t < .7) {
    const k = o.rev.idx; let cu = 0, a0 = 0, a1 = 0;
    for (const Ly of layers) { cu += Ly.a; }
    a0 = k * g.ua; a1 = (k + 1) * g.ua;
    const h0 = levelOf(g, ths, a0), h1 = levelOf(g, ths, a1);
    const b = above(below(g.poly, ths, h1), ths, h0);
    if (b.length >= 3) { path(c, b); c.fillStyle = `rgba(255,255,255,${.85 * (1 - o.rev.t / .7)})`; c.fill(); }
  }
  return { top, total };
}
function drawFlask(c, g, layers, o = {}) {
  const fw = g.fw, th = o.th || 0, ths = th + (o.phi || 0), cau = g.shape === 'cau';
  // 光晕
  if (o.glow > .01) {
    c.save(); c.globalCompositeOperation = 'lighter';
    const cy = -g.top * .45, R = fw * (cau ? 1.9 : 1.25);
    const rg = c.createRadialGradient(0, cy, 0, 0, cy, R * 1.25);
    rg.addColorStop(0, hexA(o.glowCol, .5 * o.glow)); rg.addColorStop(.55, hexA(o.glowCol, .18 * o.glow)); rg.addColorStop(1, hexA(o.glowCol, 0));
    c.scale(1, cau ? 1 : 1.45); c.fillStyle = rg; c.beginPath(); c.arc(0, cy / (cau ? 1 : 1.45), R * 1.25, 0, 7); c.fill(); c.restore();
  }
  if (cau) drawCauldronBack(c, g);
  if (o.sel || o.hint) {
    path(c, g.outer); c.lineJoin = 'round';
    c.strokeStyle = o.hint ? `rgba(80,255,240,${.45 + .3 * Math.sin(TIME * 8)})` : 'rgba(255,214,90,.75)'; c.lineWidth = fw * .2; c.stroke();
  }
  // 后玻璃
  path(c, g.outer); c.fillStyle = 'rgba(14,4,30,.62)'; c.fill();
  const bg = c.createLinearGradient(-g.maxHW, 0, g.maxHW, 0);
  bg.addColorStop(0, 'rgba(170,200,255,.16)'); bg.addColorStop(.5, 'rgba(170,200,255,.03)'); bg.addColorStop(1, 'rgba(170,200,255,.12)');
  c.fillStyle = bg; c.fill();
  const r = drawLiquid(c, g, layers, ths, o);
  // 冰封
  if (o.ice > 0) {
    path(c, g.outer); const ig = c.createLinearGradient(0, 0, 0, -g.top);
    ig.addColorStop(0, 'rgba(200,240,255,.72)'); ig.addColorStop(1, 'rgba(230,248,255,.55)'); c.fillStyle = ig; c.fill();
    c.save(); path(c, g.outer); c.clip(); c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 1.3;
    const sd = g.id.length; for (let k = 0; k < 7; k++) { const y0 = -g.top * ((k * .137 + sd * .01) % 1), x0 = ((k * .61) % 1 - .5) * g.maxHW * 2; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x0 + fw * .18, y0 - fw * .12); c.lineTo(x0 + fw * .08, y0 - fw * .3); c.moveTo(x0 + fw * .18, y0 - fw * .12); c.lineTo(x0 + fw * .34, y0 - fw * .08); c.stroke(); }
    c.restore();
  }
  // 前玻璃
  path(c, g.outer); c.lineJoin = 'round'; c.strokeStyle = 'rgba(230,238,255,.78)'; c.lineWidth = Math.max(1.4, fw * .035); c.stroke();
  const hx = -g.maxHW * .62;
  if (!cau) {
    c.lineCap = 'round';
    let gr = c.createLinearGradient(0, -fw * .3, 0, -g.bodyTop); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.3, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,.1)');
    c.strokeStyle = gr; c.lineWidth = fw * .075; c.beginPath(); c.moveTo(hx, -fw * .35); c.lineTo(hx, -g.bodyTop + fw * .05); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.18)'; c.lineWidth = fw * .04; c.beginPath(); c.moveTo(g.maxHW * .66, -fw * .5); c.lineTo(g.maxHW * .66, -g.bodyTop * .8); c.stroke();
    c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.arc(hx + fw * .02, -g.bodyTop + fw * .25, fw * .045, 0, 7); c.fill();
    // 金色瓶口/瓶颈环
    const lw = g.lipHW + g.gl + fw * .03, lh = fw * .12;
    c.fillStyle = goldGrad(c, -lw, 0, lw, 0); rr(c, -lw, -g.top - lh * .3, lw * 2, lh, lh * .4); c.fill(); c.strokeStyle = '#5a3200'; c.lineWidth = 1; c.stroke();
    if (g.neck) { const nw = g.lipHW * .8 + g.gl + fw * .03; c.fillStyle = goldGrad(c, -nw, 0, nw, 0); rr(c, -nw, -g.neck - fw * .1, nw * 2, fw * .09, fw * .04); c.fill(); }
    if (g.shape === 'vial') { c.fillStyle = goldGrad(c, -g.maxHW, 0, g.maxHW, 0); rr(c, -g.maxHW - g.gl - 1, -fw * .07, (g.maxHW + g.gl + 1) * 2, fw * .09, fw * .04); c.fill(); }
    if (g.shape === 'pear') { c.save(); c.translate(0, -fw * .15); c.fillStyle = goldGrad(c, -fw * .1, 0, fw * .1, 0); star(c, 0, 0, fw * .09, fw * .04); c.fill(); c.restore(); }
  } else drawCauldronFront(c, g);
  // 软木塞
  if (o.cork >= 0 && !cau) {
    const t = clamp(o.cork / .45, 0, 1), dy = (1 - bounce(t)) * -fw * 1.4;
    const cw = g.lipHW * 1.7, ch = fw * .34, cy = -g.top - ch * .55 + dy;
    c.save(); c.globalAlpha = clamp(o.cork * 6, 0, 1);
    const cg = c.createLinearGradient(-cw / 2, 0, cw / 2, 0); cg.addColorStop(0, '#8a5226'); cg.addColorStop(.4, '#e3ad6e'); cg.addColorStop(1, '#7a4418');
    c.fillStyle = cg; c.beginPath(); c.moveTo(-cw / 2, cy); c.lineTo(cw / 2, cy); c.lineTo(cw * .42, cy + ch); c.lineTo(-cw * .42, cy + ch); c.closePath(); c.fill();
    c.fillStyle = 'rgba(80,40,10,.5)'; for (let k = 0; k < 4; k++) { c.beginPath(); c.arc(-cw * .25 + k * cw * .17, cy + ch * (.3 + (k % 2) * .35), 1, 0, 7); c.fill(); }
    if (t >= 1) { const w = clamp((o.cork - .45) / .3, 0, 1); c.fillStyle = goldGrad(c, -cw / 2, 0, cw / 2, 0); c.save(); c.translate(0, cy - fw * .02); c.scale(w, w); star(c, 0, 0, fw * .16, fw * .07); c.fill(); c.strokeStyle = '#7a4a00'; c.lineWidth = 1; c.stroke(); c.restore(); }
    c.restore();
  }
  return r;
}
function drawCauldronBack(c, g) {
  const fw = g.fw, w = g.maxHW;
  c.fillStyle = '#1c1426';
  for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * w * .55, -fw * .2); c.lineTo(s * w * .78, fw * .14); c.lineTo(s * w * .62, fw * .14); c.lineTo(s * w * .4, -fw * .1); c.closePath(); c.fill(); }
}
function drawCauldronFront(c, g) {
  const fw = g.fw, w = g.maxHW, top = g.top;
  // 铁箍 + 金色符文带
  const rim = c.createLinearGradient(0, -top - fw * .14, 0, -top + fw * .12);
  rim.addColorStop(0, '#6a6680'); rim.addColorStop(.5, '#2a2638'); rim.addColorStop(1, '#14101e');
  c.fillStyle = rim; rr(c, -g.lipHW - g.gl - fw * .12, -top - fw * .13, (g.lipHW + g.gl + fw * .12) * 2, fw * .24, fw * .12); c.fill();
  c.strokeStyle = 'rgba(255,255,255,.25)'; c.lineWidth = 1; c.stroke();
  c.fillStyle = goldGrad(c, -w, 0, w, 0); rr(c, -w - g.gl, -fw * .62, (w + g.gl) * 2, fw * .07, fw * .03); c.fill();
  for (let k = -2; k <= 2; k++) { c.save(); c.translate(k * w * .36, -fw * .585); c.fillStyle = '#5a2d8a'; star(c, 0, 0, fw * .07, fw * .03, 4, 0); c.fill(); c.restore(); }
  // 把手
  c.strokeStyle = '#3a3448'; c.lineWidth = fw * .07;
  for (const s of [-1, 1]) { c.beginPath(); c.arc(s * (g.lipHW + g.gl + fw * .16), -top + fw * .05, fw * .13, s > 0 ? -1.4 : Math.PI - 1.7, s > 0 ? 1.7 : Math.PI + 1.4); c.stroke(); }
  c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.ellipse(-w * .55, -fw * .95, fw * .07, fw * .22, .3, 0, 7); c.fill();
}

/* ---------- 游戏状态 ---------- */
let mode = 'load', G = null, paused = false;
const LY = { counterY: 200, st: 0 };
const PARTS = [], FLOATS = [], MOTES = [];
for (let i = 0; i < 26; i++) MOTES.push({ x: Math.random(), y: Math.random(), s: rnd(.6, 1.8), v: rnd(.008, .025), ph: rnd(0, 7), c: Math.random() < .5 ? '#c9a0ff' : '#7ff6ea' });
function seeded(n) { let s = n * 9301 + 49297; return () => (s = (s * 9301 + 49297) % 233280) / 233280; }
const SHAPES = ['vial', 'tube', 'pear'];
function newVT(i, t, lvIdx) {
  return { x: 0, y: 0, tx: 0, ty: 0, init: false, lift: 0, sel: false, shake: 0, phi: 0, vphi: 0, cork: t.seal ? 1 : -1, busy: false, bub: [], rev: null, pop: 1, appear: -i * .045,
    shape: t.kind === 1 ? 'cau' : SHAPES[(i * 7 + lvIdx * 3) % 3], iceFlash: 0, glow: 0 };
}
function startLevel(idx) {
  idx = clamp(idx, 0, LEVELS.length - 1); try{GT.lv(idx+1)}catch(_e){}
  const lv = LEVELS[idx], s = PL.mkState(lv); PL.initCounter(s, lv.K);
  const r = seeded(idx + 7), order = [0, 1, 2, 3, 4, 5]; for (let i = 5; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  G = { idx, lv, s, K: lv.K, vt: s.t.map((t, i) => newVT(i, t, idx)), vs: s.counter.map((c, i) => ({ q: c >= 0 ? i : -1, c, phase: 'enter', t: -.25 - i * .22, pend: null })),
    custOrder: order, pours: [], flying: [], undo: [], sel: -1, hint: null, added: 0, ended: false, endT: 0, botT: .8, plan: null, tutPlan: null, tutSeal: false, failShown: false, msgT: 0, startT: 0 };
  PARTS.length = 0; FLOATS.length = 0;
  mode = 'play'; paused = false;
  showScreen(null);
  layout(true);
  SND.play('bell');
  const intro = lv.intro;
  if (intro && !S.tut[intro]) setTimeout(() => showIntro(intro), 450);
}
const isHard = idx => (idx + 1) % 5 === 0 && idx > 0;
function tutActive() { return G && G.idx === 0 && !S.tut.l1 && !DBG.bot; }

/* ---------- 布局 ---------- */
function layout(snap) {
  const st = SAT; LY.st = st;
  LY.counterY = st + 50 + clamp(H * .15, 104, 150);
  LY.propsH = 86 + SAB; LY.propsY = H - LY.propsH;
  LY.areaTop = LY.counterY + 34 + (tutActive() ? 64 : 4); LY.areaBot = LY.propsY - 4;
  LY.hud = { pause: { x: 32, y: st + 28, r: 21 }, restart: { x: W - 32, y: st + 28, r: 21 } };
  const pw = Math.min(W, 440), px0 = (W - pw) / 2;
  LY.props = ['add', 'undo', 'reveal', 'hint'].map((k, i) => ({ k, x: px0 + pw * (i + .5) / 4, y: LY.propsY + 40, r: 27 }));
  if (!G) return;
  const t = G.s.t, n = t.length, U = t.map(q => q.kind === 1 ? 2.45 : 1.34);
  const ah = LY.areaBot - LY.areaTop;
  let best = null;
  for (let R = 1; R <= 4 && R <= n; R++) {
    // 均衡分行（前面行多放）
    const rows = []; let i = 0; const total = U.reduce((a, b) => a + b, 0);
    for (let r = 0; r < R; r++) { const target = (total - rows.flat().reduce((a, k) => a + U[k], 0)) / (R - r); const row = []; let w = 0; while (i < n && (row.length === 0 || w + U[i] / 2 <= target + .01 || r === R - 1)) { row.push(i); w += U[i]; i++; } if (row.length) rows.push(row); }
    const maxW = Math.max(...rows.map(rw => rw.reduce((a, k) => a + U[k], 0)));
    const fw = Math.min(62, (W - 20) / maxW, (ah / rows.length - 36) / 2.75);
    if (!best || fw > best.fw + .5) best = { fw, rows };
  }
  const fw = Math.floor(best.fw * 2) / 2; LY.fw = fw;
  const rows = best.rows, blockH = fw * 2.66 + 36;
  const gapIn = Math.min(fw * .5, Math.max(4, (ah - rows.length * blockH) / (rows.length + 1)));
  const tot = rows.length * blockH + (rows.length - 1) * gapIn;
  const y0 = LY.areaTop + (ah - tot) / 2;
  LY.shelves = [];
  rows.forEach((row, r) => {
    const base = y0 + r * (blockH + gapIn) + blockH - 12;
    const rw = row.reduce((a, k) => a + U[k], 0) * fw;
    let x = (W - rw) / 2;
    for (const k of row) { const v = G.vt[k]; v.tx = x + U[k] * fw / 2; v.ty = base; v.g = getGeo(v.shape, v.shape === 'cau' ? fw : fw, t[k].cap); if (snap || !v.init) { v.x = v.tx; v.y = v.ty; v.init = true; } x += U[k] * fw; }
    LY.shelves.push({ y: base, x0: (W - rw) / 2 - 8, x1: (W + rw) / 2 + 8 });
  });
}
function resize() {
  DPR = Math.min(2, window.devicePixelRatio || 1);
  W = window.innerWidth; H = window.innerHeight;
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  const cs = getComputedStyle($('safe')); SAT = parseFloat(cs.paddingTop) || 0; SAB = parseFloat(cs.paddingBottom) || 0;
  layout(true);
}
window.addEventListener('resize', resize);

/* ---------- 液体显示层 ---------- */
function dispLayers(i) {
  const t = G.s.t[i], raw = t.u.map(v => ({ v, a: 1 }));
  for (const p of G.pours) {
    if (p.b === i) { let rem = p.n * (1 - p.prog); for (let k = raw.length - 1; k >= 0 && rem > 0; k--) { const d = Math.min(raw[k].a, rem); raw[k].a -= d; rem -= d; } }
    if (p.a === i) { if (p.ev.revealed >= 0 && !p.revDone && raw[p.ev.revealed]) raw[p.ev.revealed].v |= HID; raw.push({ v: p.c, a: p.n * (1 - p.prog) }); }
  }
  const out = [];
  for (const L of raw) { if (L.a <= .0005) continue; const last = out[out.length - 1]; if (last && last.v === L.v && !(L.v & HID)) last.a += L.a; else out.push({ v: L.v, a: L.a }); }
  return out;
}

/* ---------- 操作 ---------- */
function snapshot() { return { s: PL.clone(G.s), qs: G.vs.map(v => v.q) }; }
function animBusy() { return G.pours.length || G.flying.length || G.vt.some((v, i) => G.s.t[i].seal && v.cork < .8) || G.vs.some(v => v.phase !== 'idle' && v.phase !== 'gone'); }
function doMove(a, b) {
  const s = G.s, A = s.t[a];
  if (!PL.canPour(s, a, b) || G.vt[a].busy || G.vt[b].busy) return false;
  G.undo.push(snapshot()); if (G.undo.length > 60) G.undo.shift();
  const c = A.u[A.u.length - 1];
  const vA = G.vt[a], vB = G.vt[b], cau = A.kind === 1;
  const preArea = dispLayers(a).reduce((x, L) => x + L.a, 0);
  const ev = PL.pour(s, a, b);
  let dir = vB.tx >= vA.tx ? 1 : -1;
  if (Math.abs(vB.tx - vA.tx) < 4) dir = vB.tx < W / 2 ? -1 : 1;
  if (dir === 1 && vB.tx < LY.fw * 2.2) dir = -1;
  if (dir === -1 && vB.tx > W - LY.fw * 2.2) dir = 1;
  const p = { a, b, c, n: ev.n, ev, t: 0, prog: 0, dir, cau, pre: preArea, Ta: cau ? .12 : .24, Tp: .16 * ev.n + .3, Tb: cau ? .1 : .26, revDone: false, done1: false, lift0: vA.lift };
  p.lip0 = { x: vA.x + dir * vA.g.lipX, y: vA.y - vA.lift - vA.g.top };
  p.th0 = cau ? 0 : tiltFor(vA.g, preArea * vA.g.ua, dir);
  G.pours.push(p);
  vA.busy = vB.busy = true; vA.sel = false; G.sel = -1; G.hint = null; G.plan = G.plan && G.plan.length && G.plan[0][0] === a && G.plan[0][1] === b ? G.plan.slice(1) : null;
  setTimeout(() => cau ? SND.play('magicPour', p.Tp / DBG.speed) : SND.play('pour', p.Tp / DBG.speed, (s.t[b].u.length - ev.n) / s.t[b].cap, s.t[b].u.length / s.t[b].cap), p.Ta * 1000 / DBG.speed);
  // 冰层
  for (let i = 0; i < s.t.length; i++) { if (ev.thawed.includes(i)) { shatter(i); } else if (s.t[i].ice > 0) G.vt[i].iceFlash = 1; }
  if (ev.thawed.length) SND.play('shatter'); else if (s.t.some(t => t.ice > 0)) SND.play('crack');
  return true;
}
function shatter(i) {
  const v = G.vt[i]; for (let k = 0; k < 22; k++) PARTS.push({ x: v.x + rnd(-1, 1) * v.g.maxHW, y: v.y - rnd(0, v.g.top), vx: rnd(-140, 140), vy: rnd(-260, -40), g: 700, life: rnd(.5, .9), t: 0, s: rnd(2, 5), col: '#dff6ff', type: 'shard', rot: rnd(0, 6), vr: rnd(-10, 10) });
}
function burst(x, y, col, n = 14, sp = 160) { for (let k = 0; k < n; k++) { const a = rnd(0, 6.28), v = rnd(sp * .3, sp); PARTS.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, g: 120, life: rnd(.5, 1), t: 0, s: rnd(3, 7), col, type: 'spark' }); } }
function floatText(s, x, y, col = '#ffe066') { FLOATS.push({ s, x, y, t: 0, col }); }
let toastT = null;
function toast(s, ms = 1600) { const el = $('toast'); el.textContent = s; el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), ms); }

function tap(x, y) {
  if (mode !== 'play' || paused || !G) return;
  const hd = LY.hud;
  if (Math.hypot(x - hd.pause.x, y - hd.pause.y) < 28) { SND.play('click'); openPause(); return; }
  if (Math.hypot(x - hd.restart.x, y - hd.restart.y) < 28) { SND.play('click'); startLevel(G.idx); return; }
  for (const b of LY.props) if (Math.hypot(x - b.x, y - b.y) < 34) { useProp(b.k); return; }
  if (G.ended) return;
  const i = hitTube(x, y);
  if (i < 0) { if (G.sel >= 0) { G.vt[G.sel].sel = false; G.sel = -1; SND.play('drop'); } return; }
  tapTube(i);
}
function hitTube(x, y) {
  let best = -1, bd = 1e9;
  G.vt.forEach((v, i) => {
    const hw = v.g.maxHW + LY.fw * .22;
    if (x > v.tx - hw && x < v.tx + hw && y > v.ty - v.g.top - LY.fw * .6 && y < v.ty + 14) { const d = Math.abs(x - v.tx); if (d < bd) { bd = d; best = i; } }
  });
  return best;
}
function why(i) {
  const t = G.s.t[i];
  if (t.ice > 0) { toast(`冰封中！再倒 ${t.ice} 次药水就会融化`); SND.play('bad'); G.vt[i].shake = 1; return true; }
  if (t.seal) { toast('这瓶已经封好啦，等顾客来取～'); SND.play('bad'); G.vt[i].shake = 1; return true; }
  return false;
}
function tapTube(i) {
  const s = G.s, v = G.vt[i], t = s.t[i];
  if (v.busy) return;
  if (G.sel < 0) {
    if (why(i)) return;
    if (!t.u.length) { v.shake = .6; SND.play('drop'); return; }
    G.sel = i; v.sel = true; v.vphi += .9; SND.play('pick'); return;
  }
  const a = G.sel;
  if (a === i) { v.sel = false; G.sel = -1; v.vphi -= .6; SND.play('drop'); return; }
  if (PL.canPour(s, a, i)) { doMove(a, i); return; }
  if (why(i)) return;
  if (t.u.length && PL.usable(t)) { G.vt[a].sel = false; G.sel = i; v.sel = true; v.vphi += .9; SND.play('pick'); return; }
  v.shake = 1; SND.play('bad');
  if (t.u.length >= t.cap) toast('这个瓶子已经满啦'); else toast('只能倒在同色药水上面哦');
}
function consume(k) {
  if (S.props[k] > 0) { S.props[k]--; save(); return true; }
  if (S.coins >= PRICE[k]) { S.coins -= PRICE[k]; save(); toast(`花费 ${PRICE[k]} 金币，使用「${PNAME[k]}」`); return true; }
  toast('金币不够啦～完成订单可以赚金币'); SND.play('bad'); return false;
}
function useProp(k) {
  if (!G || G.ended) return;
  const s = G.s;
  if (k === 'add') {
    if (G.added >= 2) { toast('每关最多加 2 个空瓶'); SND.play('bad'); return; }
    if (!consume(k)) return;
    G.added++; const t = { cap: 4, kind: 0, ice: 0, seal: 0, u: [] }; s.t.push(t);
    for (const u of G.undo) u.s.t.push({ cap: 4, kind: 0, ice: 0, seal: 0, u: [] });
    const v = newVT(s.t.length - 1, t, G.idx); v.shape = 'tube'; v.appear = 0; v.pop = 0; G.vt.push(v); layout(false);
    v.x = v.tx; v.y = v.ty; SND.play('addflask'); burst(v.tx, v.ty - LY.fw, '#c9a0ff', 18); G.plan = null; G.hint = null; G.failShown = false;
    return;
  }
  if (k === 'undo') {
    if (animBusy()) { toast('等药水倒完再倒流哦'); return; }
    if (!G.undo.length) { toast('还没有可以倒流的步骤'); SND.play('bad'); return; }
    if (!consume(k)) return;
    restore(G.undo.pop()); SND.play('undo'); G.failShown = false; return;
  }
  if (k === 'reveal') {
    const has = s.t.some(t => t.u.some(x => x & HID));
    if (!has) { toast('没有神秘药水需要照亮'); SND.play('bad'); return; }
    if (!consume(k)) return;
    s.t.forEach((t, i) => t.u.forEach((x, j) => { if (x & HID) { t.u[j] = x & 15; const v = G.vt[i]; burst(v.x, v.y - levelOf(v.g, 0, (j + .5) * v.g.ua), PAL[x & 15][1], 10, 120); v.rev = { idx: j, t: 0 }; } }));
    for (const u of G.undo) u.s.t.forEach(t => { t.u = t.u.map(x => (x & HID) ? (x & 15) : x); });
    SND.play('reveal'); G.plan = null; return;
  }
  if (k === 'hint') {
    if (G.hint) return;
    toast('女巫正在占卜…', 700);
    setTimeout(() => {
      const sol = PL.solve(s, 120000);
      if (!sol) { toast('这局好像走不通了，试试时光倒流或加空瓶', 2200); SND.play('bad'); return; }
      if (!sol.length) return;
      if (!consume(k)) return;
      G.hint = sol[0]; G.plan = sol; SND.play('hint');
      if (G.sel >= 0) { G.vt[G.sel].sel = false; G.sel = -1; }
    }, 60);
  }
}
function restore(snap) {
  G.s = snap.s; G.sel = -1; G.hint = null; G.plan = null;
  G.vt.forEach((v, i) => { v.sel = false; v.cork = G.s.t[i].seal ? 1 : -1; v.vphi += .8; });
  G.vs.forEach((v, i) => { const c = G.s.counter[i], q = snap.qs[i]; if (v.q !== q || v.c !== c) { v.q = q; v.c = c; v.phase = c >= 0 ? 'enter' : 'gone'; v.t = 0; v.pend = null; } });
}

/* ---------- 更新 ---------- */
function custPos(i) { return { x: W * (2 * i + 1) / (2 * G.K), y: LY.counterY + 12 }; }
function update(dt) {
  TIME += dt;
  for (const m of MOTES) { m.y -= m.v * dt; if (m.y < -.02) { m.y = 1.02; m.x = Math.random(); } }
  for (let i = PARTS.length - 1; i >= 0; i--) { const p = PARTS[i]; p.t += dt; if (p.t >= p.life) { PARTS.splice(i, 1); continue; } p.vy += (p.g || 0) * dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.vr) p.rot += p.vr * dt; if (p.home) { const k = Math.min(1, dt * 7); p.x += (p.home.x - p.x) * k * (p.t / p.life) * 2; p.y += (p.home.y - p.y) * k * (p.t / p.life) * 2; } }
  for (let i = FLOATS.length - 1; i >= 0; i--) { FLOATS[i].t += dt; if (FLOATS[i].t > 1.1) FLOATS.splice(i, 1); }
  if (mode !== 'play' || !G || paused) return;
  const s = G.s;
  // 瓶子动画
  G.vt.forEach((v, i) => {
    v.x += (v.tx - v.x) * Math.min(1, dt * 12); v.y += (v.ty - v.y) * Math.min(1, dt * 12);
    const tl = v.sel ? LY.fw * .42 : 0; v.lift += (tl - v.lift) * Math.min(1, dt * 18);
    v.shake = Math.max(0, v.shake - dt * 2.5);
    v.vphi += (-70 * v.phi - 5 * v.vphi) * dt; v.phi += v.vphi * dt; v.phi = clamp(v.phi, -.3, .3);
    v.appear += dt; v.pop = Math.min(1, v.pop + dt * 2.2);
    v.iceFlash = Math.max(0, v.iceFlash - dt * 2);
    if (v.rev) { v.rev.t += dt; if (v.rev.t > 1) v.rev = null; }
    const t = s.t[i];
    const tg = t.seal ? 1 : 0; v.glow += (tg - v.glow) * Math.min(1, dt * 3);
    if (t.seal && v.cork >= 0 && v.cork < 2) { const c0 = v.cork; v.cork += dt; if (c0 < .45 && v.cork >= .45) { SND.play('done'); burst(v.x, v.y - v.g.top * .5, PAL[t.seal - 1][2], 22, 200); } }
    // 气泡
    if (t.u.length && Math.random() < dt * (t.seal ? 3 : 1.1) && v.bub.length < 6) v.bub.push({ x: rnd(-1, 1), h: rnd(2, 8), r: rnd(1.2, 2.8) * LY.fw / 50, v: rnd(16, 34) });
    for (let k = v.bub.length - 1; k >= 0; k--) { const b = v.bub[k]; b.h += b.v * dt; b.x += Math.sin(TIME * 3 + k) * dt * .3; if (b.h > v.g.top) v.bub.splice(k, 1); }
  });
  // 倒水动画
  for (let k = G.pours.length - 1; k >= 0; k--) {
    const p = G.pours[k]; p.t += dt;
    const T1 = p.Ta, T2 = p.Ta + p.Tp, T3 = T2 + p.Tb;
    p.prog = clamp((p.t - T1) / p.Tp, 0, 1);
    if (p.t > T1 && p.t < T2) {
      const vB = G.vt[p.b], ePt = streamEnd(p);
      if (Math.random() < dt * 40) PARTS.push({ x: ePt.x + rnd(-3, 3), y: ePt.y, vx: rnd(-60, 60), vy: rnd(-150, -50), g: 600, life: rnd(.25, .45), t: 0, s: rnd(1.5, 3.2), col: PAL[p.c][2], type: 'drop' });
      if (Math.random() < dt * 12) PARTS.push({ x: ePt.x + rnd(-8, 8), y: ePt.y - rnd(0, 20), vx: rnd(-20, 20), vy: rnd(-60, -20), g: 0, life: rnd(.4, .8), t: 0, s: rnd(2, 4), col: '#fff6c8', type: 'spark' });
      vB.vphi += (Math.random() - .5) * 14 * dt;
      if (Math.random() < dt * 14) vB.bub.push({ x: rnd(-.6, .6), h: rnd(2, 10), r: rnd(1.5, 3.2) * LY.fw / 50, v: rnd(30, 60) });
    }
    if (!p.done1 && p.t >= T2) {
      p.done1 = true; p.revDone = true;
      const vB = G.vt[p.b], vA = G.vt[p.a]; vB.busy = false; vB.vphi += -p.dir * 2.2;
      if (p.ev.sealed === p.b) { vB.cork = 0; setTimeout(() => SND.play('cork'), 60); }
      if (p.ev.revealed >= 0) { vA.rev = { idx: p.ev.revealed, t: 0 }; SND.play('peek'); burst(vA.x, vA.y - levelOf(vA.g, 0, (p.ev.revealed + .5) * vA.g.ua), '#e0c8ff', 10, 90); }
    }
    if (p.t >= T3) { G.vt[p.a].busy = false; G.vt[p.a].vphi += p.dir * 2.5; G.pours.splice(k, 1); }
  }
  // 交付
  s.t.forEach((t, i) => {
    const v = G.vt[i];
    if (!t.seal || v.cork < .8 || v.busy) return;
    const c = t.seal - 1; let slot = -1;
    for (let j = 0; j < G.K; j++) if (s.counter[j] === c && G.vs[j].phase === 'idle' && G.vs[j].c === c) { slot = j; break; }
    if (slot < 0) return;
    t.seal = 0; t.u = []; const next = s.qi < s.orders.length ? s.orders[s.qi++] : -1; s.counter[slot] = next;
    const cp = custPos(slot);
    G.flying.push({ c, x0: v.x, y0: v.y - v.g.top * .6, x1: cp.x - 6, y1: LY.counterY - 30, t: 0, dur: .55, slot });
    G.vs[slot].phase = 'await'; G.vs[slot].pend = { next, q: next >= 0 ? s.qi - 1 : -1 };
    v.cork = -1; v.pop = 0; v.glow = 0; v.bub.length = 0;
    SND.play('poof'); burst(v.x, v.y - v.g.top * .4, '#ffffff', 10, 90);
    G.plan = null;
  });
  for (let k = G.flying.length - 1; k >= 0; k--) {
    const f = G.flying[k]; f.t += dt;
    if (f.t >= f.dur) {
      G.flying.splice(k, 1); const vs = G.vs[f.slot]; vs.phase = 'happy'; vs.t = 0;
      SND.play('deliver'); const cp = custPos(f.slot);
      burst(cp.x, LY.counterY - 50, PAL[f.c][1], 16, 170);
      for (let n = 0; n < 6; n++) PARTS.push({ x: cp.x + rnd(-20, 20), y: LY.counterY - 40, vx: rnd(-90, 90), vy: rnd(-220, -120), g: 300, life: .9, t: 0, s: 7, col: '#ffd34a', type: 'coin', home: { x: 71, y: LY.st + 28 } });
      for (let n = 0; n < 4; n++) PARTS.push({ x: cp.x + rnd(-24, 24), y: LY.counterY - 70, vx: rnd(-30, 30), vy: rnd(-90, -50), g: -20, life: 1.1, t: 0, s: rnd(6, 9), col: '#ff6fb0', type: 'heart' });
      floatText('+10', cp.x, LY.counterY - 96);
      setTimeout(() => SND.play('coin'), 380);
    }
  }
  // 顾客
  G.vs.forEach((v, i) => {
    v.t += dt;
    if (v.phase === 'enter' && v.t > .5) { v.phase = 'idle'; }
    if (v.phase === 'enter' && v.t >= 0 && v.t - dt < 0 && G.startT > .3) SND.play('bell');
    if (v.phase === 'happy' && v.t > .7) { v.phase = 'leave'; v.t = 0; }
    if (v.phase === 'leave' && v.t > .38) { const pd = v.pend; v.pend = null; if (pd && pd.next >= 0) { v.q = pd.q; v.c = pd.next; v.phase = 'enter'; v.t = 0; SND.play('bell'); } else { v.phase = 'gone'; v.c = -1; v.q = -1; } }
  });
  G.startT += dt;
  // 胜负
  if (!G.ended) {
    const idle = !animBusy();
    if (idle && PL.isWin(s)) { G.ended = true; G.endT = 0; G.hint = null; }
    else if (idle && !G.failShown && PL.moves(s, false).length === 0) { G.failShown = true; setTimeout(() => { if (G && !G.ended && mode === 'play') openFail(); }, 700); }
  } else { G.endT += dt; if (G.endT > .9 && !G.winShown) { G.winShown = true; openWin(); } }
  // 机器人
  if (DBG.bot && !G.ended && !paused) {
    G.botT -= dt;
    if (G.botT <= 0 && !animBusy()) {
      if (!G.plan || !G.plan.length || !PL.canPour(s, G.plan[0][0], G.plan[0][1])) G.plan = PL.solve(s, 400000);
      if (G.plan && G.plan.length) { const [a, b] = G.plan[0]; doMove(a, b); }
      G.botT = .25;
    }
  }
  if (tutActive() && !animBusy() && (!G.tutPlan || !G.tutPlan.length || !PL.canPour(s, G.tutPlan[0][0], G.tutPlan[0][1]))) G.tutPlan = PL.solve(s, 20000);
  if (tutActive() && G.tutPlan && G.pours.length && G.tutPlan.length && G.pours[G.pours.length - 1].a === G.tutPlan[0][0] && G.pours[G.pours.length - 1].b === G.tutPlan[0][1]) G.tutPlan = G.tutPlan.slice(1);
  if (s.t.some(t => t.seal)) G.tutSeal = true;
}
function streamEnd(p) {
  const vB = G.vt[p.b], la = dispLayers(p.b).reduce((x, L) => x + L.a, 0);
  return { x: vB.x - p.dir * vB.g.lipX * (p.cau ? 0 : .15), y: vB.y - levelOf(vB.g, 0, la * vB.g.ua) };
}
// 源瓶倾倒的姿态
function pourPose(p) {
  const vA = G.vt[p.a], vB = G.vt[p.b], g = vA.g;
  const T1 = p.Ta, T2 = p.Ta + p.Tp;
  const tgt = { x: vB.x - p.dir * Math.max(vB.g.lipX * .35, LY.fw * .12), y: vB.y - vB.g.top - LY.fw * (vB.g.shape === 'cau' ? .55 : .42) };
  const rest = { x: vA.x + p.dir * g.lipX, y: vA.y - vA.g.top - (p.t < T1 ? p.lift0 : 0) };
  let th, pv;
  const remA = dispLayers(p.a).reduce((x, L) => x + L.a, 0) * g.ua;
  const thPour = tiltFor(g, remA, p.dir) + p.dir * .07;
  if (p.t < T1) { const e = ease(p.t / T1); pv = { x: lerp(p.lip0.x, tgt.x, e), y: lerp(p.lip0.y, tgt.y, e) - Math.sin(e * Math.PI) * LY.fw * .5 }; th = lerp(0, p.th0, e); }
  else if (p.t < T2) { pv = tgt; th = thPour; }
  else { const e = ease(clamp((p.t - T2) / p.Tb, 0, 1)); pv = { x: lerp(tgt.x, rest.x, e), y: lerp(tgt.y, rest.y, e) - Math.sin(e * Math.PI) * LY.fw * .4 }; th = lerp(thPour, 0, e); }
  return { pv, th };
}

/* ---------- 渲染 ---------- */
function coverDraw(im, x, y, w, h, ay = .5) { const s = Math.max(w / im.width, h / im.height), dw = im.width * s, dh = im.height * s; ctx.drawImage(im, x + (w - dw) / 2, y + (h - dh) * ay, dw, dh); }
function drawMotes(a = 1) {
  for (const m of MOTES) { const tw = .5 + .5 * Math.sin(TIME * 2 + m.ph); sparkle(ctx, m.x * W + Math.sin(TIME * .5 + m.ph) * 10, m.y * H, m.s * 2.4 * (0.6 + tw * .6), m.c, .55 * tw * a); }
}
function drawMenuBG() {
  coverDraw(IMG.shop, 0, 0, W, H, .5);
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(14,4,30,.55)'); g.addColorStop(.45, 'rgba(14,4,30,.15)'); g.addColorStop(1, 'rgba(14,4,30,.7)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); drawMotes();
}
function drawShop() {
  const im = IMG.shop, cy = LY.counterY;
  const s = Math.max(W / im.width, (cy + 10) / (im.height * .405)), dw = im.width * s;
  ctx.drawImage(im, (W - dw) / 2, cy - 4 - im.height * .405 * s, dw, im.height * s);
  // 墙
  ctx.save(); ctx.beginPath(); ctx.rect(0, cy, W, H - cy); ctx.clip();
  const wl = IMG.wall, s2 = Math.max(W / wl.width, (H - cy) / wl.height * 1.0);
  ctx.drawImage(wl, (W - wl.width * s2) / 2, H - wl.height * s2 + (SAB ? 0 : 10), wl.width * s2, wl.height * s2);
  ctx.fillStyle = 'rgba(12,4,26,.28)'; ctx.fillRect(0, cy, W, H - cy);
  ctx.restore();
  const vg = ctx.createRadialGradient(W / 2, H * .62, H * .2, W / 2, H * .62, H * .75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(6,0,16,.55)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
}
function drawCounter() {
  const y = LY.counterY;
  let g = ctx.createLinearGradient(0, y - 8, 0, y + 8); g.addColorStop(0, '#c48a52'); g.addColorStop(.4, '#8e5a2c'); g.addColorStop(1, '#5c3416');
  ctx.fillStyle = g; ctx.fillRect(0, y - 8, W, 16);
  ctx.fillStyle = 'rgba(255,230,180,.45)'; ctx.fillRect(0, y - 8, W, 1.5);
  g = ctx.createLinearGradient(0, y + 8, 0, y + 32); g.addColorStop(0, '#4a2810'); g.addColorStop(1, '#26120a');
  ctx.fillStyle = g; ctx.fillRect(0, y + 8, W, 24);
  ctx.fillStyle = goldGrad(ctx, 0, 0, W, 0); ctx.fillRect(0, y + 9, W, 2); ctx.fillRect(0, y + 29, W, 1.5);
  g = ctx.createLinearGradient(0, y + 32, 0, y + 46); g.addColorStop(0, 'rgba(0,0,0,.5)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, y + 32, W, 14);
  if (G) {
    const left = G.s.orders.length - G.s.qi;
    const t = left > 0 ? `✦ 还有 ${left} 位客人在排队 ✦` : '✦ 最后几位客人啦 ✦';
    text(ctx, t, W / 2, y + 20, 11.5, '#ffd98a', { w: 700 });
  }
}
function drawCustomers() {
  const top = LY.st + 54, bot = LY.counterY, band = bot - top;
  G.vs.forEach((v, i) => {
    if (v.q < 0 || v.phase === 'gone' || (v.phase === 'enter' && v.t < 0)) return;
    const cu = CUST[G.custOrder[v.q % 6]], im = IMG[cu.k];
    const slotW = W / G.K, h = Math.min(band * 1.0, slotW * .64 * im.height / im.width), w = h * im.width / im.height;
    const cp = custPos(i); let x = cp.x, y = bot + 14, a = 1, sc = 1, rot = 0;
    const side = i < (G.K - 1) / 2 ? -1 : 1;
    if (v.phase === 'enter') { const e = easeOut(clamp(v.t / .5, 0, 1)); x += side * (1 - e) * W * .35; a = e; y -= Math.abs(Math.sin(e * Math.PI * 2)) * 8 * (1 - e); }
    else if (v.phase === 'leave') { const e = ease(clamp(v.t / .38, 0, 1)); x += side * e * W * .35; a = 1 - e; }
    else if (v.phase === 'happy') { y -= Math.abs(Math.sin(v.t * 11)) * 14 * (1 - v.t / .7); sc = 1.05; rot = Math.sin(v.t * 14) * .05; }
    y += Math.sin(TIME * 2.2 + i * 1.7) * 2;
    if (cu.float) y -= 8 + Math.sin(TIME * 1.6 + i) * 5;
    ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sc, sc * (1 + Math.sin(TIME * 2.2 + i * 1.7) * .012));
    if (cu.float) ctx.globalAlpha = a * .95;
    ctx.drawImage(im, -w / 2, -h, w, h);
    ctx.restore();
    // 订单气泡
    if ((v.phase === 'idle' || v.phase === 'enter') && v.c >= 0) {
      const ready = G.s.t.some(t => t.seal === v.c + 1);
      const bw = 40, bh = 54; let bx = x + Math.min(w * .5 + 10, slotW / 2 - bw / 2 - 2), by = Math.min(y - h * .9 + 2, bot - bh - 14) - (ready ? Math.abs(Math.sin(TIME * 6)) * 4 : 0);
      bx = clamp(bx, bw / 2 + 4, W - bw / 2 - 4);
      ctx.save(); ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(0,0,0,.3)'; rr(ctx, bx - bw / 2 + 2, by + 3, bw, bh, 12); ctx.fill();
      ctx.fillStyle = '#fffaf0'; rr(ctx, bx - bw / 2, by, bw, bh, 12); ctx.fill();
      ctx.beginPath(); ctx.moveTo(bx - 8, by + bh - 1); ctx.lineTo(bx - 14, by + bh + 9); ctx.lineTo(bx + 2, by + bh - 1); ctx.fill();
      ctx.strokeStyle = ready ? '#ffb400' : '#6a3aa0'; ctx.lineWidth = 2; rr(ctx, bx - bw / 2, by, bw, bh, 12); ctx.stroke();
      ctx.translate(bx, by + 38);
      const g = getGeo('vial', 12, 4);
      drawFlask(ctx, g, [{ v: v.c, a: 4 }], { cork: 1.2, glow: ready ? .8 : 0, glowCol: PAL[v.c][1] });
      ctx.restore();
      text(ctx, PAL[v.c][0], bx, by + 46, 10, '#4a2070', { w: 800 });
    }
  });
}
function drawShelves() {
  for (const sh of LY.shelves) {
    const y = sh.y, x0 = Math.max(6, sh.x0), x1 = Math.min(W - 6, sh.x1);
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(x0 + 4, y + 10, x1 - x0 - 8, 8);
    const g = ctx.createLinearGradient(0, y, 0, y + 12); g.addColorStop(0, '#b47c48'); g.addColorStop(.3, '#83502a'); g.addColorStop(1, '#4a2a12');
    ctx.fillStyle = g; rr(ctx, x0, y, x1 - x0, 12, 3); ctx.fill();
    ctx.fillStyle = 'rgba(255,225,170,.5)'; ctx.fillRect(x0 + 2, y + .5, x1 - x0 - 4, 1.2);
    ctx.fillStyle = goldGrad(ctx, x0, 0, x1, 0); ctx.fillRect(x0 + 2, y + 9.5, x1 - x0 - 4, 1.2);
    ctx.fillStyle = '#3a200c';
    for (const bx of [x0 + 14, x1 - 14]) { ctx.beginPath(); ctx.moveTo(bx - 7, y + 12); ctx.lineTo(bx + 7, y + 12); ctx.lineTo(bx, y + 26); ctx.closePath(); ctx.fill(); }
  }
}
function tubeOpts(i) {
  const v = G.vt[i], t = G.s.t[i];
  const hint = G.hint && (G.hint[0] === i || (G.hint[1] === i && G.sel === G.hint[0]));
  return { phi: v.phi, sel: v.sel, hint: hint || (tutActive() && G.tutPlan && G.tutPlan.length && (G.sel < 0 ? G.tutPlan[0][0] === i : G.tutPlan[0][1] === i && G.sel === G.tutPlan[0][0])),
    glow: Math.max(v.glow * (.75 + .25 * Math.sin(TIME * 4 + i)), 0), glowCol: t.seal ? PAL[t.seal - 1][1] : '#ffffff', cork: t.seal ? v.cork : -1, ice: t.ice, bub: v.bub, rev: v.rev };
}
function drawTubeAt(i, x, y, th, pv) {
  const v = G.vt[i], t = G.s.t[i], g = v.g;
  ctx.save();
  if (pv) { ctx.translate(pv.x, pv.y); ctx.rotate(th); ctx.translate(-v.dirLip, g.top); }
  else {
    const ap = clamp(v.appear / .35, 0, 1), pp = v.pop;
    ctx.translate(x + Math.sin(TIME * 50) * 4 * v.shake, y);
    const sc = (ap < 1 ? easeBack(ap) : 1) * (pp < 1 ? .6 + .4 * easeBack(pp) : 1);
    ctx.scale(sc, sc); if (ap <= 0) { ctx.restore(); return; }
  }
  const o = tubeOpts(i); o.th = pv ? th : 0;
  drawFlask(ctx, g, dispLayers(i), o);
  ctx.restore();
  // 冰封计数徽章
  if (t.ice > 0 && !pv) {
    const bx = x, by = y - g.top - LY.fw * .35 - (v.lift || 0), r = Math.max(11, LY.fw * .24) * (1 + v.iceFlash * .25);
    const gr = ctx.createRadialGradient(bx - r * .3, by - r * .3, 1, bx, by, r); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#7fd0ff');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(bx, by, r, 0, 7); ctx.fill(); ctx.strokeStyle = '#2a6aa0'; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = 'rgba(42,106,160,.35)'; ctx.lineWidth = 1.2; for (let k = 0; k < 3; k++) { const a = k * Math.PI / 3; ctx.beginPath(); ctx.moveTo(bx + Math.cos(a) * r * .8, by + Math.sin(a) * r * .8); ctx.lineTo(bx - Math.cos(a) * r * .8, by - Math.sin(a) * r * .8); ctx.stroke(); }
    text(ctx, String(t.ice), bx, by + 1, r * 1.15, '#123e6a', { st: '#fff', sw: 3 });
  }
}
function drawStream(p) {
  if (p.t < p.Ta || p.t > p.Ta + p.Tp) return;
  const pose = pourPose(p), e = streamEnd(p), vB = G.vt[p.b], col = PAL[p.c];
  const local = p.t - p.Ta, head = clamp(local / .09, 0, 1), tail = clamp((local - (p.Tp - .09)) / .09, 0, 1);
  let P0, C, P1;
  let C2;
  if (p.cau) { const vA = G.vt[p.a], la = dispLayers(p.a).reduce((x, L) => x + L.a, 0); P0 = { x: vA.x, y: vA.y - levelOf(vA.g, 0, la * vA.g.ua) }; P1 = { x: vB.x, y: e.y }; const topY = Math.min(vA.y - vA.g.top, vB.y - vB.g.top) - LY.fw * 1.6; C = { x: P0.x + (P1.x - P0.x) * .15, y: topY }; C2 = { x: P1.x, y: vB.y - vB.g.top - LY.fw * 1.4 }; }
  else { P0 = pose.pv; P1 = e; C = { x: P0.x + p.dir * LY.fw * .12, y: P0.y + LY.fw * .05 }; C2 = { x: P1.x, y: P0.y + LY.fw * .4 }; }
  const pts = []; const u0 = tail, u1 = head;
  for (let k = 0; k <= 24; k++) { const u = lerp(u0, u1, k / 24), a = 1 - u; pts.push([a * a * a * P0.x + 3 * a * a * u * C.x + 3 * a * u * u * C2.x + u * u * u * P1.x, a * a * a * P0.y + 3 * a * a * u * C.y + 3 * a * u * u * C2.y + u * u * u * P1.y]); }
  const wd = LY.fw * (p.cau ? .16 : .13) * (p.n > 1 ? 1 : .85);
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const line = (w, s) => { ctx.strokeStyle = s; ctx.lineWidth = w; ctx.beginPath(); pts.forEach((q, k) => k ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.stroke(); };
  if (p.cau) { ctx.globalCompositeOperation = 'lighter'; line(wd * 2.6, hexA(col[1], .25)); ctx.globalCompositeOperation = 'source-over'; }
  line(wd + 2, col[3]); line(wd, col[1]);
  ctx.setLineDash([wd * 1.2, wd * 1.6]); ctx.lineDashOffset = -TIME * 260; line(wd * .38, hexA(col[2], .95)); ctx.setLineDash([]);
  ctx.restore();
  if (p.cau) for (let k = 0; k < 5; k++) { const q = pts[Math.floor(((TIME * 3 + k / 5) % 1) * 24)]; sparkle(ctx, q[0] + rnd(-6, 6), q[1] + rnd(-6, 6), rnd(3, 6), '#fff6c8'); }
}
function drawParts() {
  for (const p of PARTS) {
    const k = 1 - p.t / p.life;
    if (p.type === 'spark') sparkle(ctx, p.x, p.y, p.s * (.4 + k), p.col, k);
    else if (p.type === 'drop') { ctx.fillStyle = hexA(p.col, k); ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, 7); ctx.fill(); }
    else if (p.type === 'shard') { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.globalAlpha = k; ctx.fillStyle = '#e8f8ff'; ctx.strokeStyle = '#7fc8ff'; ctx.beginPath(); ctx.moveTo(0, -p.s); ctx.lineTo(p.s * .7, p.s * .6); ctx.lineTo(-p.s * .6, p.s * .4); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); }
    else if (p.type === 'coin') { ctx.save(); ctx.globalAlpha = Math.min(1, k * 2); ctx.translate(p.x, p.y); ctx.scale(Math.abs(Math.cos(p.t * 10)) * .8 + .2, 1); ctx.fillStyle = '#ffcf3a'; ctx.beginPath(); ctx.arc(0, 0, p.s, 0, 7); ctx.fill(); ctx.strokeStyle = '#8a4a00'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.fillStyle = '#fff3b0'; ctx.beginPath(); ctx.arc(-p.s * .3, -p.s * .3, p.s * .3, 0, 7); ctx.fill(); ctx.restore(); }
    else if (p.type === 'heart') { ctx.save(); ctx.globalAlpha = k; ctx.translate(p.x, p.y); const s = p.s / 10; ctx.scale(s, s); ctx.fillStyle = p.col; ctx.beginPath(); ctx.moveTo(0, 4); ctx.bezierCurveTo(-10, -4, -6, -12, 0, -6); ctx.bezierCurveTo(6, -12, 10, -4, 0, 4); ctx.fill(); ctx.restore(); }
  }
  for (const f of FLOATS) { const k = f.t / 1.1; ctx.save(); ctx.globalAlpha = 1 - k * k; text(ctx, f.s, f.x, f.y - k * 40, 22, f.col, { st: '#5a2000', sw: 5 }); ctx.restore(); }
}
function drawFlying() {
  for (const f of G.flying) {
    const e = ease(clamp(f.t / f.dur, 0, 1)), x = lerp(f.x0, f.x1, e), y = lerp(f.y0, f.y1, e) - Math.sin(e * Math.PI) * 90;
    ctx.save(); ctx.translate(x, y + 18); ctx.rotate(Math.sin(e * Math.PI) * .6); ctx.scale(1.4 - e * .4, 1.4 - e * .4);
    drawFlask(ctx, getGeo('vial', 14, 4), [{ v: f.c, a: 4 }], { cork: 1.2, glow: 1, glowCol: PAL[f.c][1] });
    ctx.restore();
    if (Math.random() < .5) PARTS.push({ x, y, vx: rnd(-20, 20), vy: rnd(-20, 20), g: 0, life: .4, t: 0, s: rnd(3, 5), col: PAL[f.c][2], type: 'spark' });
  }
}
function roundBtn(x, y, r, draw) {
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.arc(x, y + 3, r, 0, 7); ctx.fill();
  const g = ctx.createRadialGradient(x - r * .3, y - r * .4, 2, x, y, r); g.addColorStop(0, '#b47cff'); g.addColorStop(1, '#4a168a');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.strokeStyle = '#ffd36a'; ctx.lineWidth = 2.2; ctx.stroke(); draw();
}
function drawHUD() {
  const st = LY.st, hd = LY.hud;
  roundBtn(hd.pause.x, hd.pause.y, hd.pause.r, () => { ctx.fillStyle = '#fff'; rr(ctx, hd.pause.x - 7, hd.pause.y - 8, 5, 16, 2); ctx.fill(); rr(ctx, hd.pause.x + 2, hd.pause.y - 8, 5, 16, 2); ctx.fill(); });
  roundBtn(hd.restart.x, hd.restart.y, hd.restart.r, () => { const x = hd.restart.x, y = hd.restart.y; ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(x, y, 8, -.5, 4.3); ctx.stroke(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(x + 11, y - 9); ctx.lineTo(x + 9, y + 1); ctx.lineTo(x + 2, y - 6); ctx.closePath(); ctx.fill(); });
  // 关卡牌
  const pw = 146, ph = 46, px = W / 2 - pw / 2, py = st + 5;
  ctx.fillStyle = 'rgba(0,0,0,.35)'; rr(ctx, px + 2, py + 3, pw, ph, 16); ctx.fill();
  const g = ctx.createLinearGradient(0, py, 0, py + ph); g.addColorStop(0, 'rgba(70,30,120,.92)'); g.addColorStop(1, 'rgba(30,10,60,.92)');
  ctx.fillStyle = g; rr(ctx, px, py, pw, ph, 16); ctx.fill(); ctx.strokeStyle = '#e8b44a'; ctx.lineWidth = 2; ctx.stroke();
  text(ctx, `第 ${G.idx + 1} 关${isHard(G.idx) ? ' · 困难' : ''}`, W / 2, py + 16, 17, isHard(G.idx) ? '#ff9ae0' : '#ffe08a', { st: '#2a0a4a', sw: 4 });
  const t3 = Math.ceil(G.lv.par * 1.15) + 1;
  text(ctx, `步数 ${G.s.moves}  ·  三星 ≤ ${t3}`, W / 2, py + 35, 11.5, G.s.moves <= t3 ? '#c8fff4' : '#ffb0b0', { w: 700 });
  // 金币
  const delivered = G.s.qi - G.s.counter.filter(c => c >= 0).length;
  const coins = S.coins + (G.paid ? 0 : delivered * 10);
  const cx = 58, cy = st + 15, cw = Math.min(62, W / 2 - 75 - 58 - 4);
  ctx.fillStyle = 'rgba(20,6,40,.7)'; rr(ctx, cx, cy, cw, 26, 13); ctx.fill(); ctx.strokeStyle = 'rgba(255,211,106,.8)'; ctx.lineWidth = 1.5; ctx.stroke();
  const cg = ctx.createRadialGradient(cx + 11, cy + 10, 1, cx + 13, cy + 13, 11); cg.addColorStop(0, '#fff6c0'); cg.addColorStop(.5, '#ffcf3a'); cg.addColorStop(1, '#c47a00');
  ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(cx + 13, cy + 13, 10, 0, 7); ctx.fill(); ctx.strokeStyle = '#7a4200'; ctx.stroke();
  text(ctx, '¤', cx + 13, cy + 13.5, 11, '#8a4a00');
  text(ctx, String(coins), cx + 26 + (cw - 26) / 2 - 1, cy + 14, coins > 9999 ? 11 : 13, '#fff3c0', { w: 800 });
}
function drawProps() {
  const y0 = LY.propsY;
  const g = ctx.createLinearGradient(0, y0, 0, H); g.addColorStop(0, 'rgba(48,22,80,.96)'); g.addColorStop(1, 'rgba(18,6,34,.98)');
  ctx.fillStyle = g; ctx.fillRect(0, y0, W, H - y0);
  ctx.fillStyle = goldGrad(ctx, 0, 0, W, 0); ctx.fillRect(0, y0, W, 2.5);
  ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fillRect(0, y0 + 3, W, 1);
  const icons = { add: IMG.ic_add, undo: IMG.ic_undo, reveal: IMG.ic_reveal, hint: IMG.ic_hint };
  for (const b of LY.props) {
    const dis = (b.k === 'add' && G.added >= 2) || (b.k === 'reveal' && !G.s.t.some(t => t.u.some(x => x & HID))) || (b.k === 'undo' && !G.undo.length);
    ctx.save(); if (dis) ctx.globalAlpha = .45;
    const rg = ctx.createRadialGradient(b.x - 8, b.y - 10, 2, b.x, b.y, b.r); rg.addColorStop(0, '#6a3aa8'); rg.addColorStop(1, '#25103f');
    ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.beginPath(); ctx.arc(b.x, b.y + 3, b.r, 0, 7); ctx.fill();
    ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7); ctx.fill(); ctx.strokeStyle = goldGrad(ctx, b.x - b.r, b.y - b.r, b.x + b.r, b.y + b.r); ctx.lineWidth = 2.5; ctx.stroke();
    const im = icons[b.k], s = b.r * 1.55 / Math.max(im.width, im.height);
    const bob = b.k === 'hint' && G.hint == null ? Math.sin(TIME * 3) * 1.5 : 0;
    ctx.drawImage(im, b.x - im.width * s / 2, b.y - im.height * s / 2 + bob, im.width * s, im.height * s);
    text(ctx, PNAME[b.k], b.x, b.y + b.r + 11, 11.5, '#f2dcff', { w: 800, st: '#1a0830', sw: 3 });
    const n = S.props[b.k];
    if (n > 0) { ctx.fillStyle = '#2ec46a'; ctx.beginPath(); ctx.arc(b.x + b.r * .78, b.y - b.r * .7, 10, 0, 7); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); text(ctx, String(n), b.x + b.r * .78, b.y - b.r * .7 + 1, 12, '#fff'); }
    else { const tx = b.x + b.r * .62, ty = b.y - b.r * .72; ctx.fillStyle = '#ffcf3a'; rr(ctx, tx - 17, ty - 9, 34, 18, 9); ctx.fill(); ctx.strokeStyle = '#7a4200'; ctx.lineWidth = 1.5; ctx.stroke(); text(ctx, String(PRICE[b.k]), tx, ty + 1, 11, '#5a2a00'); }
    ctx.restore();
  }
}
function drawWand(x, y) {
  const b = Math.sin(TIME * 7) * 6;
  ctx.save(); ctx.translate(x + 14 + b * .5, y + 20 + b); ctx.rotate(-.6);
  ctx.fillStyle = 'rgba(0,0,0,.35)'; rr(ctx, -3, 2, 8, 46, 4); ctx.fill();
  const g = ctx.createLinearGradient(-4, 0, 4, 0); g.addColorStop(0, '#2a1438'); g.addColorStop(.5, '#6a3a80'); g.addColorStop(1, '#1a0828');
  ctx.fillStyle = g; rr(ctx, -4, 0, 8, 46, 4); ctx.fill(); ctx.fillStyle = goldGrad(ctx, -4, 0, 4, 0); ctx.fillRect(-4, 30, 8, 4); ctx.fillRect(-4, 4, 8, 3);
  ctx.fillStyle = goldGrad(ctx, -12, -12, 12, 12); star(ctx, 0, -6, 13, 6); ctx.fill(); ctx.strokeStyle = '#8a5000'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.restore();
  sparkle(ctx, x + rnd(-8, 8), y + rnd(-8, 8), rnd(3, 7), '#fff6c8', .8);
}
function drawTutorial() {
  if (!tutActive()) return;
  const y = LY.counterY + 40, h = 58, x = 10, w = W - 20;
  ctx.fillStyle = 'rgba(0,0,0,.35)'; rr(ctx, x + 2, y + 3, w, h, 16); ctx.fill();
  ctx.fillStyle = 'rgba(255,248,232,.96)'; rr(ctx, x, y, w, h, 16); ctx.fill(); ctx.strokeStyle = '#9a5ad8'; ctx.lineWidth = 2.5; ctx.stroke();
  const im = IMG.witch, ih = 74, iw = ih * im.width / im.height;
  ctx.drawImage(im, x - 2, y + h - ih + 4, iw, ih);
  let msg;
  if (G.tutSeal && !G.pours.length) msg = ['装满 4 层同色就会自动封瓶，', '送给想要它的顾客！继续加油～'];
  else if (G.sel < 0) msg = ['顾客想要同色魔药！点一下', '发光的瓶子，选中它～'];
  else if (G.tutPlan && G.tutPlan.length && G.sel === G.tutPlan[0][0]) msg = ['再点发光的目标瓶，', '把最上层药水倒进去！'];
  else msg = ['再点一下选中的瓶子', '可以放下它哦'];
  text(ctx, msg[0], x + iw + 4, y + 20, 14, '#4a1a70', { al: 'left', w: 800 });
  text(ctx, msg[1], x + iw + 4, y + 40, 14, '#4a1a70', { al: 'left', w: 800 });
  if (G.tutPlan && G.tutPlan.length && !G.pours.length) {
    const i = G.sel < 0 ? G.tutPlan[0][0] : G.tutPlan[0][1], v = G.vt[i];
    if (v) drawWand(v.x + LY.fw * .2, v.y - v.g.top * .5 - v.lift);
  }
}
function render() {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (mode !== 'play' || !G) { if (IMG.shop) drawMenuBG(); else { ctx.fillStyle = '#1a0b2e'; ctx.fillRect(0, 0, W, H); } if ($('menu').classList.contains('on')) drawTitleWitch(); return; }
  drawShop(); drawCustomers(); drawCounter(); drawMotes(.6); drawShelves();
  const active = new Set(G.pours.filter(p => !p.cau).map(p => p.a));
  G.vt.forEach((v, i) => {
    if (active.has(i)) return;
    const g = v.g; ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(v.x, v.y + 1, g.maxHW + 3, 4, 0, 0, 7); ctx.fill();
    drawTubeAt(i, v.x, v.y - v.lift, 0, null);
  });
  for (const p of G.pours) drawStream(p);
  for (const p of G.pours) { if (p.cau) continue; const v = G.vt[p.a], pose = pourPose(p); v.dirLip = p.dir * v.g.lipX; drawTubeAt(p.a, 0, 0, pose.th, pose.pv); }
  if (G.hint && !G.pours.length) { const i = G.sel === G.hint[0] ? G.hint[1] : G.hint[0], v = G.vt[i]; if (v) drawWand(v.x + LY.fw * .2, v.y - v.g.top * .5 - v.lift); }
  drawFlying(); drawParts(); drawHUD(); drawProps(); drawTutorial();
}

/* ---------- 封面小女巫：透明底序列帧（24fps · 120 帧无缝循环） ---------- */
const WITCH = { fw: 392, fh: 511, cols: 6, per: 24, n: 120, fps: 24, body: [12,  15,  345,  498], nSheets: 5,
  // 每帧魔杖星尖 / 药水瓶中心（精灵帧坐标，x,y 交错），用于实时星光粒子跟随
  tip: [329,179,331,181,334,183,337,184,340,184,342,182,342,175,339,165,334,152,327,138,319,125,308,115,299,108,293,106,291,107,294,112,300,120,309,130,319,142,329,156,338,168,343,177,347,182,347,180,345,174,341,163,334,150,326,137,316,125,306,115,298,108,292,105,290,105,293,110,299,118,309,128,319,140,328,153,335,164,341,172,343,175,344,173,342,166,337,155,329,143,320,130,310,119,300,111,293,107,291,108,293,114,301,123,311,134,322,146,332,159,339,170,344,177,347,178,346,174,342,165,334,153,324,140,314,127,306,117,299,110,297,107,298,108,303,113,310,121,317,130,325,141,331,150,336,157,339,162,340,162,338,157,334,150,327,140,319,130,309,122,301,115,293,108,288,104,285,103,285,104,287,107,291,113,296,120,301,129,306,139,313,149,319,157,324,165,327,170,327,174,328,177,329,177,329,178,329,179,328,179,328,178,328,178,327,178,327,178,327,178,327,178,327,178,327,178,327,178,327,178,327,178,327,178,327,178,327,178,327,178,327,178,327,178,327,178,327,178,327,178],
  flask: [47,263,48,265,49,266,49,268,50,269,50,270,49,270,48,270,48,269,46,267,46,265,45,263,45,262,45,261,46,260,47,261,49,262,50,264,52,266,53,269,54,271,54,274,54,277,54,279,53,280,52,280,50,279,48,277,47,274,46,271,46,268,45,266,46,264,46,262,47,262,49,263,51,265,52,268,53,271,54,274,54,277,53,278,52,279,51,278,49,276,48,273,46,270,45,266,45,263,45,261,46,261,47,262,49,264,51,267,53,270,54,274,54,277,54,279,54,280,52,280,51,279,49,277,47,274,46,270,45,267,45,264,45,263,46,263,48,263,50,265,52,268,53,271,54,275,55,277,54,280,54,281,53,282,51,281,50,280,48,279,46,276,45,273,44,271,44,269,45,267,45,266,47,266,48,267,50,267,52,268,53,269,54,270,54,270,54,270,53,270,52,269,50,268,48,267,47,266,46,265,45,264,44,264,44,263,44,263,45,262,45,262,46,262,46,262,47,262,47,262,48,263,48,263,48,263,47,263,47,263,47,263,47,263,46,263,47,263,47,263],
  sheets: [], ok: false, t: 0, parts: [], cdW: 0, cdF: .3, r: null, rc: 0, last: 0 };
const WITCH_STATIC = { w: 390, h: 560, body: [3, 3, 387, 557] }; // assets/witch.webp 与首帧同姿势，序列帧就绪前做占位
function loadWitch() {
  let left = WITCH.nSheets, failed = false;
  for (let i = 0; i < WITCH.nSheets; i++) {
    const im = new Image(); let tried = false;
    im.onload = () => {
      // 解码一次后转成画布，避免每帧重复解码大图
      try { const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; c.getContext('2d').drawImage(im, 0, 0); WITCH.sheets[i] = c; } catch (e) { }
      if (--left === 0 && !failed) { WITCH.ok = true; WITCH.t = 0; }
    };
    im.onerror = () => { if (!tried) { tried = true; im.src = 'assets/witch/witch_' + i + '.png'; } else failed = true; }; // 不支持 WebP 的老设备回退 PNG
    im.src = 'assets/witch/witch_' + i + '.webp'; WITCH.sheets[i] = im;
  }
}
// 预渲染发光精灵：四芒星光 / 五角星 / 柔光圆，按颜色缓存
const WSPR = {};
function wSprite(kind, col) {
  const key = kind + col; if (WSPR[key]) return WSPR[key];
  const S = 48, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d'), m = S / 2;
  const g = x.createRadialGradient(m, m, 0, m, m, m); g.addColorStop(0, hexA(col, .55)); g.addColorStop(.35, hexA(col, .18)); g.addColorStop(1, hexA(col, 0));
  x.fillStyle = g; x.fillRect(0, 0, S, S);
  if (kind === 'star') { star(x, m, m, 11, 4.6); x.fillStyle = col; x.fill(); star(x, m, m - 1, 5, 2.2); x.fillStyle = '#fffbe6'; x.fill(); }
  else if (kind === 'spark') { sparkle(x, m, m, 13, col); sparkle(x, m, m, 6, '#ffffff'); }
  else { x.fillStyle = '#ffffff'; x.beginPath(); x.arc(m, m, 3.2, 0, 7); x.fill(); }
  return (WSPR[key] = c);
}
function wGlow(col) {
  const key = 'glow' + col; if (WSPR[key]) return WSPR[key];
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, hexA(col, .5)); g.addColorStop(.45, hexA(col, .16)); g.addColorStop(1, hexA(col, 0)); x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  return (WSPR[key] = c);
}
const W_WAND = ['#ffe27a', '#ffe27a', '#fff6c8', '#ffb8ec', '#8ff8ea'], W_FLASK = ['#ff7ad8', '#ffb8ec', '#ff5cc8', '#e0a8ff'];
function drawTitleWitch() {
  const now = performance.now() / 1000, dt = WITCH.last ? Math.min(.05, now - WITCH.last) : .016; WITCH.last = now;
  if (!WITCH.r || ++WITCH.rc % 30 === 0 || WITCH.rw !== W || WITCH.rh !== H) { const el = $('mWitch'); if (!el) return; WITCH.r = el.getBoundingClientRect(); WITCH.rw = W; WITCH.rh = H; }
  const r = WITCH.r; if (!r.width) { WITCH.r = null; return; }
  const sm = IMG.witch; if (!WITCH.ok && !(sm && sm.naturalWidth)) return;
  WITCH.t += dt; const t = TIME;
  // 身体宽度略大于原静态图（×1.06）；轻柔悬浮 + 微摆
  const bw = r.width * (WITCH_STATIC.body[2] - WITCH_STATIC.body[0]) / WITCH_STATIC.w * 1.06;
  const dy = Math.sin(t * 1.55) * 4.5 + Math.sin(t * 3.1) * 1.2, dx = Math.sin(t * .8) * 2, rot = Math.sin(t * 1.1) * .018;
  const cx = r.left + r.width / 2 + dx, cy = r.top + r.height * .5 + dy;
  // 地面柔影：飘高时变淡变小
  const ss = 1 - dy * .025, shw = bw * .7 * ss;
  ctx.save(); ctx.globalAlpha = clamp(.9 * ss, 0, 1); ctx.drawImage(wGlow('#000000'), r.left + r.width / 2 - shw / 2, r.bottom + r.height * .02 - shw * .09, shw, shw * .18);
  // 魔法光晕：身后淡紫光、药水瓶粉光（呼吸）
  ctx.globalCompositeOperation = 'lighter';
  const gw = bw * 1.35, pu = .75 + .25 * Math.sin(t * 2.2);
  ctx.globalAlpha = .38 * pu; ctx.drawImage(wGlow('#a65aff'), cx - gw / 2, cy - gw * .55, gw, gw * 1.05);
  ctx.restore();
  // 女巫本体
  let k, bcx, bcy, f = 0;
  if (WITCH.ok) { f = Math.floor(WITCH.t * WITCH.fps) % WITCH.n; const B = WITCH.body; k = bw / (B[2] - B[0]); bcx = (B[0] + B[2]) / 2 * k; bcy = (B[1] + B[3]) / 2 * k; }
  else { const B = WITCH_STATIC.body; k = bw / (B[2] - B[0]); bcx = (B[0] + B[2]) / 2 * k; bcy = (B[1] + B[3]) / 2 * k; }
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot);
  if (WITCH.ok) { const j = f % WITCH.per; ctx.drawImage(WITCH.sheets[(f / WITCH.per) | 0], (j % WITCH.cols) * WITCH.fw, ((j / WITCH.cols) | 0) * WITCH.fh, WITCH.fw, WITCH.fh, -bcx, -bcy, WITCH.fw * k, WITCH.fh * k); }
  else ctx.drawImage(sm, -bcx, -bcy, WITCH_STATIC.w * k, WITCH_STATIC.h * k);
  ctx.restore();
  // 跟随动画的魔杖星尖、药水瓶位置（静态占位时用首帧位置）
  const ca = Math.cos(rot), sa = Math.sin(rot);
  const kk = WITCH.ok ? k : bw / (WITCH.body[2] - WITCH.body[0]), ox = (WITCH.body[0] + WITCH.body[2]) / 2 * kk, oy = (WITCH.body[1] + WITCH.body[3]) / 2 * kk;
  const P = (arr) => { const px = arr[f * 2] * kk - ox, py = arr[f * 2 + 1] * kk - oy; return [cx + px * ca - py * sa, cy + px * sa + py * ca]; };
  const [tx, ty] = P(WITCH.tip), [fx, fy] = P(WITCH.flask);
  const tvx = WITCH.ptx == null ? 0 : (tx - WITCH.ptx) / Math.max(dt, .001), tvy = WITCH.pty == null ? 0 : (ty - WITCH.pty) / Math.max(dt, .001); WITCH.ptx = tx; WITCH.pty = ty;
  const sp = Math.hypot(tvx, tvy), u = bw / 200; // u：按女巫尺寸缩放粒子
  // 药水瓶呼吸粉光 + 杖尖小光点
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const fg = bw * .5 * (.9 + .1 * Math.sin(t * 3.3)); ctx.globalAlpha = .55 + .2 * Math.sin(t * 3.3); ctx.drawImage(wGlow('#ff5cc8'), fx - fg / 2, fy - fg / 2, fg, fg);
  const tg = bw * .22 * (.85 + .15 * Math.sin(t * 7)); ctx.globalAlpha = .7; ctx.drawImage(wGlow('#fff2a8'), tx - tg / 2, ty - tg / 2, tg, tg);
  ctx.restore();
  // 发射：杖尖星光（挥动越快越多，沿轨迹拖尾），药水瓶冒出粉色闪光泡泡
  const PS = WITCH.parts;
  if ((WITCH.cdW -= dt * (1 + Math.min(4, sp / (60 * u)))) <= 0 && PS.length < 46) {
    WITCH.cdW = .11 + Math.random() * .1;
    const a = Math.random() * 6.283, v = (8 + Math.random() * 22) * u;
    PS.push({ x: tx + (Math.random() - .5) * 6 * u, y: ty + (Math.random() - .5) * 6 * u, vx: Math.cos(a) * v - tvx * .06, vy: Math.sin(a) * v - tvy * .06 - 6 * u, g: 14 * u, s: (.45 + Math.random() * .5) * u, rot: Math.random() * 6, vr: (Math.random() - .5) * 3, k: Math.random() < .42 ? 'star' : 'spark', c: W_WAND[(Math.random() * W_WAND.length) | 0], life: 0, max: .9 + Math.random() * .8, ph: Math.random() * 6 });
  }
  if ((WITCH.cdF -= dt) <= 0 && PS.length < 46) {
    WITCH.cdF = .16 + Math.random() * .2;
    const bub = Math.random() < .55;
    PS.push({ x: fx + (Math.random() - .5) * bw * .16, y: fy - bw * .02 + (Math.random() - .5) * bw * .1, vx: (Math.random() - .5) * 8 * u, vy: -(16 + Math.random() * 18) * u, g: -4 * u, s: (bub ? .5 + Math.random() * .6 : .35 + Math.random() * .4) * u, rot: 0, vr: (Math.random() - .5) * 2, k: bub ? 'dot' : 'spark', c: W_FLASK[(Math.random() * W_FLASK.length) | 0], life: 0, max: 1.1 + Math.random() * .9, ph: Math.random() * 6, wob: 1 });
  }
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = PS.length - 1; i >= 0; i--) {
    const p = PS[i]; p.life += dt; if (p.life > p.max) { PS.splice(i, 1); continue; }
    p.vy += p.g * dt; p.vx *= (1 - 1.2 * dt); p.x += (p.vx + (p.wob ? Math.sin(p.life * 5 + p.ph) * 6 * u : 0)) * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
    const tw = .65 + .35 * Math.sin(p.life * 14 + p.ph), a = Math.min(1, p.life / .12) * Math.min(1, (p.max - p.life) / .45) * tw;
    const sz = 48 * p.s * (p.k === 'dot' ? .7 : 1) * (1 - .35 * p.life / p.max);
    ctx.globalAlpha = a; ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.drawImage(wSprite(p.k, p.c), -sz / 2, -sz / 2, sz, sz);
  }
  ctx.restore();
}

/* ---------- 界面 ---------- */
const SCREENS = ['load', 'menu', 'levels', 'pause', 'win', 'fail', 'intro'];
function showScreen(id) { for (const s of SCREENS) $(s).classList.toggle('on', s === id); }
function totalStars() { return S.stars.reduce((a, b) => a + (b || 0), 0); }
function openMenu() {
  mode = 'menu'; G = null; paused = false; showScreen('menu');
  $('mStat').textContent = `已收集 ★ ${totalStars()} / ${LEVELS.length * 3}　·　金币 ${S.coins}`;
  $('bPlay').textContent = S.unlocked > 1 ? `继 续 · 第 ${Math.min(S.unlocked, LEVELS.length)} 关` : '开 店 营 业';
}
function openLevels() {
  mode = 'menu'; G = null; showScreen('levels');
  $('lvTot').textContent = `★ ${totalStars()} / ${LEVELS.length * 3}　　金币 ${S.coins}`;
  const gd = $('grid'); gd.innerHTML = '';
  LEVELS.forEach((lv, i) => {
    const b = document.createElement('button'); const lock = i >= S.unlocked;
    b.className = 'lv' + (lock ? ' lock' : '') + (isHard(i) && !lock ? ' hard' : '') + (i === S.unlocked - 1 ? ' cur' : '');
    const st = S.stars[i] || 0;
    b.innerHTML = lock ? '<svg width="22" height="24" viewBox="0 0 22 24"><rect x="2" y="10" width="18" height="13" rx="3" fill="#8a7a9c"/><path d="M6 10V7a5 5 0 0 1 10 0v3" stroke="#8a7a9c" stroke-width="3" fill="none"/></svg>'
      : `${i + 1}<span class="s">${'★'.repeat(st)}${'<span style="color:#3a2050">★</span>'.repeat(3 - st)}</span>${isHard(i) ? '<span class="tag">难</span>' : lv.intro ? '<span class="tag" style="background:#1fb8a8">新</span>' : ''}`;
    b.onclick = () => { if (lock) { SND.play('bad'); toast('先完成前面的订单吧'); return; } SND.play('click'); startLevel(i); };
    gd.appendChild(b);
  });
  setTimeout(() => { const c = gd.querySelector('.cur'); if (c) c.scrollIntoView({ block: 'center' }); }, 30);
}
function openPause() { if (!G) return; paused = true; try{GT.pause()}catch(_e){} showScreen('pause'); syncToggles(); }
function stars() { const m = G.s.moves, par = G.lv.par; return m <= Math.ceil(par * 1.15) + 1 ? 3 : m <= par * 1.6 + 3 ? 2 : 1; }
function openWin() {
  const st = stars(), delivered = G.s.orders.length, bonus = [0, 10, 20, 30][st], tot = delivered * 10 + bonus; try{GT.win(G.idx+1,{stars:st,moves:G.s.moves,par:G.lv.par,props:G.added})}catch(_e){}
  S.coins += tot; G.paid = true; S.stars[G.idx] = Math.max(S.stars[G.idx] || 0, st); S.unlocked = Math.max(S.unlocked, Math.min(LEVELS.length, G.idx + 2));
  if (G.idx === 0) S.tut.l1 = 1; save();
  $('wTitle').textContent = ['', '顺利打烊！', '生意兴隆！', '完美出品！'][st];
  $('wInfo').innerHTML = `${delivered} 位客人都满意而归<br>用了 <b>${G.s.moves}</b> 步　·　三星目标 ≤ ${Math.ceil(G.lv.par * 1.15) + 1} 步`;
  $('wReward').innerHTML = `<span class="reward"><i class="coin"></i>订单 +${delivered * 10}　星级奖励 +${bonus}</span>`;
  const sp = $('wStars').children; for (let k = 0; k < 3; k++) { sp[k].classList.remove('on'); }
  showScreen('win'); SND.play('win');
  for (let k = 0; k < st; k++) setTimeout(() => { sp[k].classList.add('on'); SND.play('star', k); }, 500 + k * 280);
  $('wNext').style.display = G.idx < LEVELS.length - 1 ? '' : 'none';
  if (G.idx === LEVELS.length - 1) $('wInfo').innerHTML += `<br><b>全部 ${LEVELS.length} 关通关！你是最棒的魔药师！</b>`;
  for (let k = 0; k < 40; k++) PARTS.push({ x: rnd(0, W), y: rnd(-40, H * .3), vx: rnd(-40, 40), vy: rnd(40, 160), g: 60, life: rnd(1.5, 2.5), t: 0, s: rnd(4, 9), col: PAL[k % 9][1], type: 'spark' });
  if (DBG.bot) setTimeout(() => { if (mode === 'play' && G && G.idx < LEVELS.length - 1) startLevel(G.idx + 1); }, 1500 / DBG.speed);
}
function openFail() {
  paused = true; showScreen('fail'); SND.play('fail'); try{GT.fail(G.idx+1,{r:'nomove',moves:G.s.moves})}catch(_e){}
  $('fInfo').innerHTML = '没有能倒的药水了…<br>用 <b>时光倒流</b> 退一步，或者 <b>加个空瓶</b> 吧';
}
function drawIntroArt(kind) {
  const c = $('introC').getContext('2d'); c.setTransform(2, 0, 0, 2, 0, 0); c.clearRect(0, 0, 220, 150);
  const bg = c.createRadialGradient(110, 80, 10, 110, 80, 120); bg.addColorStop(0, '#3a1a64'); bg.addColorStop(1, '#16082a'); c.fillStyle = bg; rr(c, 0, 0, 220, 150, 16); c.fill();
  c.fillStyle = '#6a4020'; c.fillRect(20, 128, 180, 7);
  const save0 = TIME;
  if (kind === 'hid') {
    c.save(); c.translate(70, 128); drawFlask(c, getGeo('pear', 38, 4), [{ v: 16 | 1, a: 1 }, { v: 16 | 5, a: 1 }, { v: 16 | 3, a: 1 }, { v: 0, a: 1 }], {}); c.restore();
    c.save(); c.translate(150, 128); drawFlask(c, getGeo('pear', 38, 4), [{ v: 16 | 1, a: 1 }, { v: 16 | 5, a: 1 }, { v: 3, a: 1 }], { rev: { idx: 2, t: .3 } }); c.restore();
    c.fillStyle = '#ffd34a'; c.beginPath(); c.moveTo(100, 70); c.lineTo(116, 80); c.lineTo(100, 90); c.closePath(); c.fill();
  } else if (kind === 'ice') {
    c.save(); c.translate(110, 128); drawFlask(c, getGeo('vial', 40, 4), [{ v: 7, a: 2 }, { v: 2, a: 1 }, { v: 0, a: 1 }], { ice: 5 }); c.restore();
    c.fillStyle = '#bfe8ff'; c.beginPath(); c.arc(110, 14, 12, 0, 7); c.fill(); c.strokeStyle = '#2a6aa0'; c.lineWidth = 2; c.stroke(); text(c, '5', 110, 15, 15, '#123e6a');
  } else {
    c.save(); c.translate(110, 126); drawFlask(c, getGeo('cau', 50, 8), [{ v: 4, a: 2 }, { v: 7, a: 3 }, { v: 5, a: 1 }], { glow: .6, glowCol: '#9a45ff' }); c.restore();
    for (let k = 0; k < 6; k++) sparkle(c, 50 + k * 24, 30 + (k % 2) * 14, 5, '#fff6c8');
  }
}
const INTRO = {
  hid: ['神秘药水', '蒙着紫雾的 <b>？</b> 是神秘药水，<br>把上面的药水倒走它就会现出原色。<br>用 <b>光明咒</b> 可以一次照亮全部！'],
  ice: ['冰封药瓶', '冰封的瓶子暂时 <b>不能倒入或倒出</b>。<br>每倒一次药水，冰层就融化一点，<br>数字归零就解冻啦！'],
  cau: ['魔法大坩埚', '坩埚能装 <b>8 层</b> 药水，是超好用的中转站！<br>倒出时会变成魔法彩带飞进瓶子。<br>但坩埚 <b>不会封瓶</b>，药水最后要倒回瓶里。'],
};
function showIntro(kind) {
  if (!G || mode !== 'play' || DBG.bot) { S.tut[kind] = 1; save(); return; }
  paused = true; $('iTitle').textContent = INTRO[kind][0]; $('iText').innerHTML = INTRO[kind][1]; drawIntroArt(kind); showScreen('intro');
  $('iOk').onclick = () => { SND.play('click'); S.tut[kind] = 1; save(); paused = false; showScreen(null); };
}
function syncToggles() {
  for (const id of ['tMusic', 'pMusic']) $(id).classList.toggle('off', !S.music);
  for (const id of ['tSfx', 'pSfx']) $(id).classList.toggle('off', !S.sfx);
}
function toggleMusic() { S.music = !S.music; try{GT.sound('music',S.music)}catch(_e){} save(); SND.setMusic(S.music); if (S.music && !SND.playing) SND.startMusic(); syncToggles(); SND.play('click'); }
function toggleSfx() { S.sfx = !S.sfx; try{GT.sound('sfx',S.sfx)}catch(_e){} save(); SND.setSfx(S.sfx); syncToggles(); SND.play('click'); }
$('tMusic').onclick = $('pMusic').onclick = toggleMusic;
$('tSfx').onclick = $('pSfx').onclick = toggleSfx;
$('bPlay').onclick = () => { SND.play('click'); try{GT.title('play')}catch(_e){} startLevel(Math.min(S.unlocked, LEVELS.length) - 1); };
$('bLevels').onclick = () => { SND.play('click'); try{GT.title('levels')}catch(_e){} openLevels(); };
$('lvBack').onclick = () => { SND.play('click'); openMenu(); };
$('pResume').onclick = () => { SND.play('click'); paused = false; showScreen(null); };
$('pRestart').onclick = () => { SND.play('click'); startLevel(G.idx); };
$('pQuit').onclick = () => { SND.play('click'); try{GT.quit('menu')}catch(_e){} openLevels(); };
$('wNext').onclick = () => { SND.play('click'); startLevel(G.idx + 1); };
$('wRetry').onclick = () => { SND.play('click'); startLevel(G.idx); };
$('wMenu').onclick = () => { SND.play('click'); openLevels(); };
$('fRetry').onclick = () => { SND.play('click'); startLevel(G.idx); };
$('fMenu').onclick = () => { SND.play('click'); openLevels(); };
// 返回 Tilo 游戏屋：先存档再离开
function goHub(e) { if (e) e.stopPropagation(); save(); try { SND.play('click'); } catch (_) { } try{GT.hub(e&&e.currentTarget&&e.currentTarget.id)}catch(_e){} location.href = '../'; }
/* 北京时间交付版：无返回游戏屋 */
$('fUndo').onclick = () => { try{GT.revive('undo')}catch(_e){} paused = false; showScreen(null); G.failShown = false; useProp('undo'); if (!G.undo.length || G.failShown) { } };
$('fAdd').onclick = () => { try{GT.revive('add')}catch(_e){} paused = false; showScreen(null); G.failShown = false; useProp('add'); };

/* ---------- 输入 & 音频解锁 ---------- */
let audioOn = false;
function unlockAudio() {
  SND.unlock(); SND.setMusic(S.music); SND.setSfx(S.sfx);
  if (!audioOn) { audioOn = true; if (S.music) SND.startMusic(); }
}
document.addEventListener('pointerdown', unlockAudio, true);
document.addEventListener('touchend', unlockAudio, true);
cv.addEventListener('pointerdown', e => { e.preventDefault(); tap(e.clientX, e.clientY); });
document.addEventListener('visibilitychange', () => { const a = SND.ctx; if (!a) return; if (document.hidden) a.suspend(); else a.resume(); if (document.hidden && mode === 'play' && G && !G.ended && !paused) openPause(); });
document.addEventListener('gesturestart', e => e.preventDefault());

/* ---------- 主循环 ---------- */
let last = performance.now();
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000) * DBG.speed; last = now;
  update(dt); render();
  requestAnimationFrame(frame);
}
/* ---------- 加载 ---------- */
function boot() {
  resize();
  const keys = Object.keys(SRC); let done = 0;
  const bar = $('loadBar');
  return Promise.all(keys.map(k => new Promise(res => { const im = new Image(); im.onload = im.onerror = () => { done++; bar.style.width = (done / keys.length * 100) + '%'; res(); }; im.src = SRC[k]; IMG[k] = im; })));
}
boot().then(() => {
  syncToggles(); loadWitch();
  requestAnimationFrame(frame);
  setTimeout(() => {
    if (DBG.level) startLevel(DBG.level - 1); else openMenu();
  }, 250);
});
window.__potion = { get G() { return G; }, get S() { return S; }, startLevel, useProp, tap, doMove, LY, openMenu, openLevels, PARTS };
/* 自动化自检钩子（仅 ?selftest 时挂出） */
if (Q.has('selftest')) window.__T = { win: () => { if (G) { G.ended = true; G.winShown = true; openWin(); } }, start: i => startLevel(i), n: () => LEVELS.length };
})();
