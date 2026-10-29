/* ===== 宝石大盗 · 撬个宝石  主程序 ===== */
(() => {
'use strict';
const Q = new URLSearchParams(location.search);
const DEBUG = { level: +Q.get('level') || 0, bot: Q.has('bot'), unlock: Q.has('unlock'), speed: +Q.get('speed') || 1 };
const cv = document.getElementById('cv'), ctx = cv.getContext('2d');
const $ = id => document.getElementById(id);
const FONT = '"PingFang SC","Hiragino Sans GB","Microsoft YaHei","Noto Sans CJK SC","Noto Sans SC",sans-serif';
const TAU = Math.PI * 2, rnd = (a, b) => a + Math.random() * (b - a), clamp = (v, a, b) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a) * t;
const easeOut = t => 1 - Math.pow(1 - t, 3), easeIn = t => t * t * t, easeBack = t => { const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const { BW, BH } = GEN;

/* ---------- 宝石 ---------- */
const GEMS = [
  { k: 'ruby', name: '红宝石', col: '#ff2a48', dk: '#7a0418', lt: '#ff9aa8' },
  { k: 'sapphire', name: '蓝宝石', col: '#2f6dff', dk: '#0a1f6e', lt: '#9ec0ff' },
  { k: 'emerald', name: '祖母绿', col: '#1fc25a', dk: '#05501e', lt: '#9af0b8' },
  { k: 'amethyst', name: '紫水晶', col: '#9b4dff', dk: '#3a0e7a', lt: '#d4b0ff' },
  { k: 'topaz', name: '黄玉', col: '#ffb21a', dk: '#7a4400', lt: '#ffe08a' },
  { k: 'diamond', name: '钻石', col: '#dff0ff', dk: '#4a6a8a', lt: '#ffffff' },
  { k: 'pink', name: '粉钻', col: '#ff5aa0', dk: '#7a0a40', lt: '#ffb8d6' },
  { k: 'aqua', name: '海蓝宝', col: '#25d4f0', dk: '#05566a', lt: '#a8f4ff' },
  { k: 'pearl', name: '珍珠', col: '#f4eee6', dk: '#7a6a5a', lt: '#ffffff' },
];
const MAT = {
  wood: { img: 'm_wood', tint: null, rim: ['#ffe9a0', '#d9a03a', '#7a4a10'], name: '木雕板' },
  gold: { img: 'm_gold', tint: null, rim: ['#fff4c0', '#c88a1a', '#5a3200'], name: '金饰板' },
  marble: { img: 'm_marble', tint: null, rim: ['#fff4c0', '#d6a640', '#6a4a10'], name: '大理石' },
  jade: { img: 'm_jade', tint: null, rim: ['#fff4c0', '#d6a640', '#5a3a08'], name: '翡翠石' },
  ruby: { img: 'm_marble', tint: 'rgba(190,20,50,.78)', rim: ['#fff4c0', '#e0b050', '#5a1a08'], name: '红玛瑙' },
  night: { img: 'm_marble', tint: 'rgba(30,40,150,.82)', rim: ['#fff4c0', '#e0b050', '#1a1040'], name: '青金石', fleck: 1 },
};
const IMG = {};
const ASSETS = ['bg.jpg', 'mascot.webp', 'logo.webp', 'ic_slot.webp', 'ic_clear.webp', 'ic_bomb.webp', 'm_wood.jpg', 'm_gold.jpg', 'm_marble.jpg', 'm_jade.jpg', ...GEMS.map(g => 'g_' + g.k + '.webp')];

/* ---------- 存档 ---------- */
const SKEY = 'gem_thief_v1';
let save = { unlocked: 1, stars: {}, props: { slot: 2, clear: 2, bomb: 2 }, music: true, sfx: true, tut: {}, cleared: {} };
try { const s = JSON.parse(localStorage.getItem(SKEY)); if (s && s.props) save = Object.assign(save, s); } catch (e) { }
const persist = () => { try { localStorage.setItem(SKEY, JSON.stringify(save)); } catch (e) { } };
if (DEBUG.unlock) save.unlocked = GEN.COUNT;
const PROPS = [
  { k: 'slot', name: '加宝位', img: 'ic_slot', tip: '托盘多一个宝位' },
  { k: 'clear', name: '清空托盘', img: 'ic_clear', tip: '托盘宝石收进口袋' },
  { k: 'bomb', name: '炸开石板', img: 'ic_bomb', tip: '点一块板子炸开' },
];

/* ---------- 布局 ---------- */
let W = 0, H = 0, DPR = 1, L = {};
function layout() {
  DPR = Math.min(2, window.devicePixelRatio || 1);
  W = window.innerWidth; H = window.innerHeight;
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  const sp = getComputedStyle($('safe'));
  const st = parseFloat(sp.paddingTop) || 0, sb = parseFloat(sp.paddingBottom) || 0;
  const GW = Math.min(W, 480), gx = (W - GW) / 2;
  L = { GW, gx, st, sb };
  L.top = st + 8; L.topH = 44;
  const short = H < 720;
  L.chH = clamp(H * 0.115, 74, 100); L.chW = L.chH * 1.22;
  L.chY = L.top + L.topH + 6;
  const gap = Math.min(26, GW * 0.06);
  L.chest = [0, 1].map(i => ({ x: gx + GW / 2 + (i ? gap / 2 : -gap / 2 - L.chW), y: L.chY, w: L.chW, h: L.chH }));
  L.qY = L.chY + L.chH + (short ? 4 : 8); L.qH = 18;
  L.slot = Math.min(42, (GW - 16 - 16 - 48) / 7.84); L.sGap = L.slot * 0.14;
  L.trayY = L.qY + L.qH + (short ? 4 : 8); L.trayH = L.slot + 14;
  L.trayW = L.slot * 7 + L.sGap * 6 + 16; const pr = Math.min(22, L.slot * 0.55);
  L.trayX = gx + (GW - L.trayW - 8 - pr * 2) / 2;
  L.pouch = { x: L.trayX + L.trayW + 8 + pr, y: L.trayY + L.trayH / 2, r: pr };
  const propsH = clamp(H * 0.1, 66, 84);
  L.propsY = H - sb - propsH - 6; L.propsH = propsH;
  const areaTop = L.trayY + L.trayH + 8, areaBot = L.propsY - 6;
  const aw = GW - 12, ah = areaBot - areaTop;
  L.bs = Math.min(aw / BW, ah / BH);
  L.bx = gx + (GW - BW * L.bs) / 2; L.by = areaTop + (ah - BH * L.bs) / 2;
  const bw = Math.min(100, GW / 3 - 16);
  L.props = PROPS.map((p, i) => ({ k: p.k, x: gx + GW / 2 + (i - 1) * (bw + 16) - bw / 2, y: L.propsY, w: bw, h: propsH }));
  L.pauseBtn = { x: gx + 10, y: L.top, w: 44, h: 44 };
  bgCache = null; spriteCache = {}; chestCache = {};
  if (G.panels) for (const p of G.panels) p.spr = null;
}
const b2s = (x, y) => [L.bx + x * L.bs, L.by + y * L.bs];
const s2b = (x, y) => [(x - L.bx) / L.bs, (y - L.by) / L.bs];
const slotPos = i => [L.trayX + 8 + L.slot / 2 + i * (L.slot + L.sGap), L.trayY + L.trayH / 2];
const sockPos = (si, k) => { const c = L.chest[si]; const bodyY = c.y + c.h * 0.42, bodyH = c.h * 0.58; return [c.x + c.w * (0.22 + k * 0.28), bodyY + bodyH * 0.5]; };

/* ---------- 画布工具 ---------- */
function mk(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }
function rr(x, c, y, w, h, r) { x.beginPath(); x.moveTo(c + r, y); x.arcTo(c + w, y, c + w, y + h, r); x.arcTo(c + w, y + h, c, y + h, r); x.arcTo(c, y + h, c, y, r); x.arcTo(c, y, c + w, y, r); x.closePath(); }
function polyPath(x, P, ox = 0, oy = 0, k = 1) { x.beginPath(); P.forEach((p, i) => i ? x.lineTo(ox + p[0] * k, oy + p[1] * k) : x.moveTo(ox + p[0] * k, oy + p[1] * k)); x.closePath(); }
function star4(x, cx, cy, r, rot = 0) { x.beginPath(); for (let i = 0; i < 8; i++) { const a = rot + i * Math.PI / 4, rr2 = i % 2 ? r * 0.22 : r; x.lineTo(cx + Math.cos(a) * rr2, cy + Math.sin(a) * rr2); } x.closePath(); }
function goldGrad(x, y0, y1, c = ['#fff6c8', '#ffd24a', '#c27a0e', '#7a4200']) { const g = x.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, c[0]); g.addColorStop(0.35, c[1]); g.addColorStop(0.75, c[2]); g.addColorStop(1, c[3]); return g; }
function text(s, x, y, size, fill, stroke, sw = 4, align = 'center', weight = 900) {
  ctx.font = `${weight} ${size}px ${FONT}`; ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  if (stroke) { ctx.lineWidth = sw; ctx.strokeStyle = stroke; ctx.strokeText(s, x, y); }
  ctx.fillStyle = fill; ctx.fillText(s, x, y);
}

/* ---------- 背景 ---------- */
let bgCache = null;
function drawBg() {
  if (!bgCache) {
    const c = mk(W * DPR, H * DPR), x = c.getContext('2d'), im = IMG.bg;
    const s = Math.max(c.width / im.width, c.height / im.height);
    x.drawImage(im, (c.width - im.width * s) / 2, (c.height - im.height * s) / 2, im.width * s, im.height * s);
    // 顶部 HUD 区域压暗 + 中央柔光
    let g = x.createLinearGradient(0, 0, 0, c.height); g.addColorStop(0, 'rgba(14,6,24,.78)'); g.addColorStop(0.32, 'rgba(14,6,24,.25)'); g.addColorStop(0.75, 'rgba(14,6,24,.05)'); g.addColorStop(1, 'rgba(14,6,24,.55)');
    x.fillStyle = g; x.fillRect(0, 0, c.width, c.height);
    g = x.createRadialGradient(c.width / 2, (L.by + BH * L.bs / 2) * DPR, 10, c.width / 2, (L.by + BH * L.bs / 2) * DPR, c.width * 0.8);
    g.addColorStop(0, 'rgba(255,190,90,.10)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, c.width, c.height);
    bgCache = c;
  }
  ctx.drawImage(bgCache, 0, 0, W, H);
}

/* ---------- 板子精灵 ---------- */
let spriteCache = {}, chestCache = {};
const PAD = 14;
function panelSprite(p) {
  if (p.spr) return p.spr;
  const k = L.bs * DPR, bb = p.bb, GR = G.lv.cfg.GR;
  const w = (bb[2] - bb[0] + PAD * 2) * k, h = (bb[3] - bb[1] + PAD * 2) * k;
  const c = mk(w, h), x = c.getContext('2d');
  const ox = (PAD - bb[0]) * k, oy = (PAD - bb[1]) * k;
  const m = MAT[p.mat];
  // 投影
  x.save(); x.shadowColor = 'rgba(0,0,0,.6)'; x.shadowBlur = 9 * k; x.shadowOffsetY = 5 * k; polyPath(x, p.poly, ox, oy, k); x.fillStyle = '#000'; x.fill(); x.restore();
  // 外框（深色描边 + 金边）
  polyPath(x, p.poly, ox, oy, k); x.lineJoin = 'round';
  x.lineWidth = 7.5 * k; x.strokeStyle = '#1c0a04'; x.stroke();
  // 材质
  x.save(); polyPath(x, p.poly, ox, oy, k); x.clip();
  const tex = IMG[m.img]; const ts = 260 * k / tex.width * (p.mat === 'gold' ? 0.8 : 1);
  const pat = x.createPattern(tex, 'repeat'); if (pat.setTransform && window.DOMMatrix) pat.setTransform(new DOMMatrix([ts * Math.cos(p.id), ts * Math.sin(p.id), -ts * Math.sin(p.id), ts * Math.cos(p.id), (p.id * 37) % 200, (p.id * 53) % 200]));
  x.fillStyle = pat; x.fillRect(0, 0, w, h);
  if (m.tint) { x.globalCompositeOperation = 'multiply'; x.fillStyle = m.tint; x.fillRect(0, 0, w, h); x.globalCompositeOperation = 'source-over'; }
  if (m.fleck) { x.fillStyle = '#ffd86a'; for (let i = 0; i < w * h / (900 * k * k); i++) { x.globalAlpha = Math.random() * 0.8; x.fillRect(Math.random() * w, Math.random() * h, 1.2 * k, 1.2 * k); } x.globalAlpha = 1; }
  // 光泽：左上亮右下暗
  let g = x.createLinearGradient(ox + bb[0] * k, oy + bb[1] * k, ox + bb[2] * k, oy + bb[3] * k);
  g.addColorStop(0, 'rgba(255,255,255,.28)'); g.addColorStop(0.45, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,.32)');
  x.fillStyle = g; x.fillRect(0, 0, w, h);
  // 内斜角
  x.beginPath(); x.rect(-w, -h, w * 3, h * 3); p.poly.slice().reverse().forEach((q, i) => i ? x.lineTo(ox + q[0] * k, oy + q[1] * k) : x.moveTo(ox + q[0] * k, oy + q[1] * k)); x.closePath();
  x.shadowColor = 'rgba(255,250,220,.7)'; x.shadowBlur = 3 * k; x.shadowOffsetX = 2.5 * k; x.shadowOffsetY = 2.5 * k; x.fillStyle = '#000'; x.fill('evenodd');
  x.shadowColor = 'rgba(0,0,0,.65)'; x.shadowOffsetX = -3 * k; x.shadowOffsetY = -3 * k; x.fill('evenodd');
  x.restore();
  // 金边
  polyPath(x, p.poly, ox, oy, k);
  x.lineWidth = 4.2 * k; x.strokeStyle = goldGrad(x, oy + bb[1] * k, oy + bb[3] * k, [m.rim[0], m.rim[1], m.rim[2], m.rim[2]]); x.stroke();
  x.lineWidth = 1.2 * k; x.strokeStyle = 'rgba(255,255,230,.75)'; x.save(); x.translate(-0.8 * k, -0.8 * k); x.stroke(); x.restore();
  // 内饰虚线
  if (p.mat === 'gold' || p.mat === 'wood') {
    x.save(); polyPath(x, p.poly, ox, oy, k); x.clip(); x.lineWidth = 10 * k; x.strokeStyle = 'rgba(60,30,0,.0)'; x.restore();
  }
  // 宝石托座（空洞 + 金环）
  for (const gi of p.gems) {
    const gm = G.gems[gi]; const sx = ox + gm.x * k, sy = oy + gm.y * k, r = GR * 0.86 * k;
    let gg = x.createRadialGradient(sx - r * 0.2, sy - r * 0.3, r * 0.1, sx, sy, r);
    gg.addColorStop(0, '#2a1608'); gg.addColorStop(0.7, '#0e0602'); gg.addColorStop(1, '#3a2410');
    x.beginPath(); x.arc(sx, sy, r, 0, TAU); x.fillStyle = gg; x.fill();
    x.lineWidth = 3 * k; x.strokeStyle = goldGrad(x, sy - r, sy + r, ['#fff6c8', '#f2c040', '#a8660a', '#5a3000']); x.stroke();
    x.beginPath(); x.arc(sx, sy, r + 2 * k, Math.PI * 1.05, Math.PI * 1.6); x.lineWidth = 1.2 * k; x.strokeStyle = 'rgba(255,255,230,.8)'; x.stroke();
  }
  p.spr = { c, ox: bb[0] - PAD, oy: bb[1] - PAD, w: w / k, h: h / k };
  return p.spr;
}

/* ---------- 宝箱 ---------- */
function chestBody(ci, w, h) {
  const key = ci + '_' + Math.round(w) + '_' + Math.round(h);
  if (chestCache[key]) return chestCache[key];
  const k = DPR, pad = 10, c = mk((w + pad * 2) * k, (h + pad * 2) * k), x = c.getContext('2d'); x.scale(k, k); x.translate(pad, pad);
  const gem = GEMS[ci];
  const by = h * 0.42, bh = h * 0.58;
  // 阴影
  x.save(); x.shadowColor = 'rgba(0,0,0,.6)'; x.shadowBlur = 10; x.shadowOffsetY = 5; rr(x, 0, by, w, bh, 10); x.fillStyle = '#000'; x.fill(); x.restore();
  // 箱体木纹
  rr(x, 0, by, w, bh, 10); let g = x.createLinearGradient(0, by, 0, by + bh); g.addColorStop(0, '#8a4a1e'); g.addColorStop(1, '#4a2008'); x.fillStyle = g; x.fill();
  x.lineWidth = 3; x.strokeStyle = '#1e0a02'; x.stroke();
  // 丝绒面板（宝石色）
  rr(x, w * 0.06, by + bh * 0.14, w * 0.88, bh * 0.72, 8);
  g = x.createLinearGradient(0, by, 0, by + bh); g.addColorStop(0, gem.col); g.addColorStop(1, gem.dk); x.fillStyle = g; x.fill();
  x.save(); x.clip(); x.globalAlpha = 0.18; for (let i = 0; i < 40; i++) { x.fillStyle = i % 2 ? '#fff' : '#000'; x.fillRect(Math.random() * w, by + Math.random() * bh, 1, 1); } x.globalAlpha = 1;
  g = x.createLinearGradient(0, by, 0, by + bh); g.addColorStop(0, 'rgba(255,255,255,.35)'); g.addColorStop(0.4, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, by, w, bh); x.restore();
  x.lineWidth = 2.5; x.strokeStyle = goldGrad(x, by, by + bh); x.stroke();
  // 金色包角
  x.fillStyle = goldGrad(x, by, by + bh);
  for (const [cx, cy, sx, sy] of [[0, by, 1, 1], [w, by, -1, 1], [0, by + bh, 1, -1], [w, by + bh, -1, -1]]) {
    x.beginPath(); x.moveTo(cx, cy + sy * 4); x.quadraticCurveTo(cx, cy, cx + sx * 4, cy); x.lineTo(cx + sx * 16, cy); x.lineTo(cx, cy + sy * 16); x.closePath(); x.fill(); x.strokeStyle = '#3a1a02'; x.lineWidth = 1.2; x.stroke();
  }
  // 托座
  for (let s = 0; s < 3; s++) {
    const sx = w * (0.22 + s * 0.28), sy = by + bh * 0.5, r = Math.min(w * 0.12, bh * 0.3);
    x.beginPath(); x.arc(sx, sy, r, 0, TAU); x.fillStyle = 'rgba(0,0,0,.45)'; x.fill();
    x.lineWidth = 2.5; x.strokeStyle = goldGrad(x, sy - r, sy + r); x.stroke();
    // 幽灵宝石
    const im = IMG['g_' + gem.k]; const s2 = r * 1.5 / Math.max(im.width, im.height);
    x.globalAlpha = 0.28; x.drawImage(im, sx - im.width * s2 / 2, sy - im.height * s2 / 2, im.width * s2, im.height * s2); x.globalAlpha = 1;
  }
  chestCache[key] = { c, pad };
  return chestCache[key];
}
function drawLid(x0, y0, w, h, ci, t) { // t:0 开 → 1 合
  const gem = GEMS[ci]; const by = y0 + h * 0.42; const lh = h * 0.40;
  ctx.save();
  if (t < 0.5) { // 打开：内衬朝前
    const s = 1 - t * 2; const hh = lh * s;
    ctx.beginPath(); ctx.moveTo(x0 + 3, by); ctx.lineTo(x0 + w * 0.06, by - hh); ctx.lineTo(x0 + w * 0.94, by - hh); ctx.lineTo(x0 + w - 3, by); ctx.closePath();
    let g = ctx.createLinearGradient(0, by - hh, 0, by); g.addColorStop(0, '#5a2a0e'); g.addColorStop(1, '#2a1004'); ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#1e0a02'; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x0 + w * 0.1, by - 2); ctx.lineTo(x0 + w * 0.13, by - hh + 5 * s); ctx.lineTo(x0 + w * 0.87, by - hh + 5 * s); ctx.lineTo(x0 + w * 0.9, by - 2); ctx.closePath();
    g = ctx.createLinearGradient(0, by - hh, 0, by); g.addColorStop(0, gem.dk); g.addColorStop(1, gem.col); ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = goldGrad(ctx, by - hh, by); ctx.stroke();
    // 盖内徽记
    if (s > 0.3) { const im = IMG['g_' + gem.k]; const sz = Math.min(hh * 0.62, w * 0.3); const sc = sz / Math.max(im.width, im.height); ctx.globalAlpha = 0.95; ctx.drawImage(im, x0 + w / 2 - im.width * sc / 2, by - hh * 0.55 - im.height * sc / 2, im.width * sc, im.height * sc); ctx.globalAlpha = 1; }
  } else { // 合上：拱顶外壳
    const s = (t - 0.5) * 2; const hh = lh * 0.75 * s;
    ctx.beginPath(); ctx.moveTo(x0, by + 2); ctx.lineTo(x0, by - hh * 0.45); ctx.quadraticCurveTo(x0 + w / 2, by - hh * 1.35, x0 + w, by - hh * 0.45); ctx.lineTo(x0 + w, by + 2); ctx.closePath();
    let g = ctx.createLinearGradient(0, by - hh, 0, by); g.addColorStop(0, '#b0602a'); g.addColorStop(1, '#5a2808'); ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#1e0a02'; ctx.stroke();
    ctx.lineWidth = 4; ctx.strokeStyle = goldGrad(ctx, by - hh, by);
    for (const fx of [0.22, 0.78]) { ctx.beginPath(); ctx.moveTo(x0 + w * fx, by); ctx.lineTo(x0 + w * fx, by - hh * (0.62 + 0.3 * (1 - Math.abs(fx - 0.5) * 2))); ctx.stroke(); }
    // 锁扣
    rr(ctx, x0 + w / 2 - 7, by - 6, 14, 14, 3); ctx.fillStyle = goldGrad(ctx, by - 6, by + 8); ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#3a1a02'; ctx.stroke();
    ctx.fillStyle = '#2a1004'; ctx.beginPath(); ctx.arc(x0 + w / 2, by, 2, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

/* ---------- 游戏状态 ---------- */
const G = { state: 'menu', t: 0, n: 1, parts: [], texts: [], fly: [], tools: [], pouch: [] };
window.G = G;
function startLevel(n) {
  n = clamp(n, 1, GEN.COUNT); try{GT.lv(n)}catch(_e){}
  const lv = GEN.genLevel(n);
  G.n = n; G.lv = lv; G.state = 'play'; G.t = 0; G.over = false;
  G.panels = lv.panels.map(p => Object.assign({}, p, { gems: p.gems.slice(), left: p.gems.length, alive: true, fall: null, spr: null, intro: 0.12 + p.id * 0.045, flash: 0, wob: 0 }));
  G.gems = lv.gems.map(g => Object.assign({}, g, { st: 'on', shake: 0, pop: 0 }));
  G.qi = 2;
  G.chests = [0, 1].map(i => ({ c: lv.queue[i], f: 0, res: 0, st: 'arrive', t: -0.25 - i * 0.12, items: [] }));
  G.trayCap = lv.cfg.cap; G.tray = new Array(7).fill(-1);
  G.pouch = []; G.fly = []; G.parts = []; G.texts = []; G.tools = [];
  G.used = 0; G.combo = 0; G.lastChest = -9; G.shakeT = 0; G.bombMode = false; G.trayWarn = 0; G.revived = 0;
  G.idle = 0; G.hint = null; G.tutStep = 0; G.trayTip = false;
  G.total = G.gems.length; G.got = 0;
  for (const p of G.panels) p.spr = null;
  showScr(null);
  SND.duck(false);
  if (n === 1 && !save.tut.l1) G.tut = 1; else G.tut = 0;
  if (n === 4 && !save.tut.props) setTimeout(() => { if (G.state === 'play' && G.n === 4) { toast('道具来帮忙：加宝位 · 清空托盘 · 炸开石板', 2600); save.tut.props = 1; persist(); } }, 1600);
}
const isFree = g => { for (const q of g.cov) if (G.panels[q].alive && G.panels[q].left > 0) return false; return true; };
function activeChest(c) { for (let i = 0; i < 2; i++) { const ch = G.chests[i]; if (ch && ch.st === 'idle' && ch.c === c && ch.res < 3) return i; } return -1; }
function freeTraySlot() { for (let i = 0; i < G.trayCap; i++) if (G.tray[i] < 0) return i; return -1; }
function trayCount() { let n = 0; for (let i = 0; i < G.trayCap; i++) if (G.tray[i] >= 0) n++; return n; }

/* ---------- 撬宝石 ---------- */
function tryPry(g) {
  if (G.state !== 'play' || G.intro) return;
  if (!isFree(g)) {
    g.shake = 0.35; SND.play('deny'); vib(15);
    for (const q of g.cov) if (G.panels[q].alive) G.panels[q].flash = 0.6;
    if (G.n <= 3) toast('被上面的板子压住啦，先撬上面的！', 1400);
    return;
  }
  const ci = activeChest(g.c);
  let target;
  if (ci >= 0) { G.chests[ci].res++; target = { kind: 'chest', i: ci, k: G.chests[ci].res - 1 }; }
  else {
    const s = freeTraySlot();
    if (s < 0) { g.shake = 0.35; SND.play('warn'); G.trayWarn = 1; toast('托盘满了！先撬同色宝石或用道具', 1500); vib(30); return; }
    G.tray[s] = g.id; target = { kind: 'tray', i: s };
    if (!G.trayTip && G.n <= 3 && !save.tut.tray) { G.trayTip = true; save.tut.tray = 1; persist(); setTimeout(() => toast('颜色不对的宝石先放进丝绒托盘，塞满就失手哦', 2400), 500); }
  }
  g.st = 'pry'; g.t = 0; g.target = target; G.idle = 0; G.hint = null;
  const p = G.panels[g.p]; p.left--;
  if (p.left === 0) panelFall(p, g); else if (p.left === 1) p.wob = 1;
  SND.play('pry', 0.9 + Math.random() * 0.2); vib(10);
  const [sx, sy] = b2s(g.x, g.y);
  G.tools.push({ x: sx, y: sy, t: 0, dir: Math.random() < 0.5 ? -1 : 1 });
  for (let i = 0; i < 8; i++) part('chip', sx, sy, { vx: rnd(-90, 90), vy: rnd(-160, -40), life: 0.5, col: MAT[p.mat].rim[1] });
  if (G.tut) { G.tutStep++; if (G.tutStep >= 3) { G.tut = 0; save.tut.l1 = 1; persist(); } }
}
function panelFall(p, g) {
  // 摆动：最后一颗宝石的位置决定扭矩
  const dx = g ? g.x - p.cx : rnd(-20, 20);
  p.fall = { t: 0, vx: rnd(-30, 30) - dx * 0.4, vy: -120, w: (dx > 0 ? -1 : 1) * rnd(1.4, 2.6), x: 0, y: 0, a: 0, s: 1 };
  p.alive = false;
  setTimeout(() => SND.play('fall', p.mat === 'marble' || p.mat === 'jade' ? 1 : 0), 120);
}
function landGem(g) {
  const T = g.target;
  if (T.kind === 'chest') {
    const ch = G.chests[T.i]; ch.f++; ch.items.push(g.id); g.st = 'chest'; g.slot = T.i; g.k = T.k; g.pop = 1;
    G.got++;
    SND.play('socket', T.k, G.combo);
    const [sx, sy] = sockPos(T.i, T.k);
    for (let i = 0; i < 10; i++) part('spark', sx, sy, { vx: rnd(-120, 120), vy: rnd(-140, 60), life: rnd(.35, .7), col: GEMS[g.c].lt });
    part('ring', sx, sy, { life: 0.35, col: GEMS[g.c].lt, r: 6 });
    if (ch.f >= 3) { ch.st = 'close'; ch.t = 0; }
  } else if (T.kind === 'tray') {
    g.st = 'tray'; g.slot = T.i; g.pop = 1; SND.play('tray');
    const [sx, sy] = slotPos(T.i); part('ring', sx, sy, { life: 0.3, col: '#ffd6f0', r: 4 });
    if (trayCount() >= G.trayCap - 1) { G.trayWarn = 1; SND.play('warn'); }
  } else if (T.kind === 'pouch') {
    g.st = 'pouch'; G.pouch.push(g.id); SND.play('tray');
  }
}
function chestStep(i, dt) {
  const ch = G.chests[i]; if (!ch) return;
  ch.t += dt;
  if (ch.st === 'arrive' && ch.t >= 0.32) { ch.st = 'idle'; ch.t = 0; feedChest(i); }
  else if (ch.st === 'close' && ch.t >= 0.42) {
    ch.st = 'leave'; ch.t = 0; SND.play('fly');
    const c = L.chest[i];
    for (let k = 0; k < 18; k++) part('spark', c.x + c.w / 2 + rnd(-c.w / 2, c.w / 2), c.y + c.h * 0.5 + rnd(-20, 20), { vx: rnd(-60, 60), vy: rnd(-200, -40), life: rnd(.4, .9), col: '#ffe9a0' });
  }
  else if (ch.st === 'leave' && ch.t >= 0.38) {
    for (const id of ch.items) G.gems[id].st = 'gone';
    if (G.qi < G.lv.queue.length) G.chests[i] = { c: G.lv.queue[G.qi++], f: 0, res: 0, st: 'arrive', t: 0, items: [] };
    else G.chests[i] = null;
    if (G.chests[i]) SND.play('arrive');
    checkEnd();
  }
  if (ch.st === 'close' && ch.t >= 0.2 && !ch.clicked) {
    ch.clicked = 1; const now = G.t; G.combo = now - G.lastChest < 2.6 ? G.combo + 1 : 0; G.lastChest = now;
    SND.play('chest', G.combo);
    const c = L.chest[i];
    if (G.combo >= 1) { floatText(c.x + c.w / 2, c.y + c.h + 6, '连击 ×' + (G.combo + 1), '#ffe27a'); SND.play('combo', G.combo); }
  }
}
function feedChest(i) { // 新宝箱到位：托盘/口袋里的同色宝石自动飞入
  const ch = G.chests[i];
  for (let s = 0; s < G.trayCap && ch.res < 3; s++) {
    const id = G.tray[s]; if (id < 0) continue; const g = G.gems[id]; if (g.st !== 'tray' || g.c !== ch.c) continue;
    G.tray[s] = -1; ch.res++; const [x, y] = slotPos(s); launch(g, x, y, { kind: 'chest', i, k: ch.res - 1 }, 0.36);
  }
  for (let j = G.pouch.length - 1; j >= 0 && ch.res < 3; j--) {
    const g = G.gems[G.pouch[j]]; if (g.c !== ch.c) continue;
    G.pouch.splice(j, 1); ch.res++; launch(g, L.pouch.x, L.pouch.y, { kind: 'chest', i, k: ch.res - 1 }, 0.4);
  }
}
function launch(g, x, y, target, dur = 0.42) {
  g.st = 'fly'; g.target = target;
  const [tx, ty] = targetPos(target);
  G.fly.push({ g, x0: x, y0: y, t: 0, dur, cx: (x + tx) / 2 + rnd(-40, 40), cy: Math.min(y, ty) - 60 - Math.abs(x - tx) * 0.15, spin: rnd(-1, 1) * 6 });
}
function targetPos(T) { if (T.kind === 'chest') return sockPos(T.i, T.k); if (T.kind === 'tray') return slotPos(T.i); return [L.pouch.x, L.pouch.y]; }
function checkEnd() {
  if (G.state !== 'play') return;
  if (G.got >= G.total && G.chests.every(c => !c || c.st === 'idle' && c.f === 0 || c === null)) {
    if (G.chests.every(c => c === null)) win();
  }
}
function busy() { return G.fly.length || G.gems.some(g => g.st === 'pry') || G.chests.some(c => c && c.st !== 'idle'); }
function checkStuck() {
  if (G.state !== 'play' || busy()) return;
  if (trayCount() < G.trayCap) return;
  // 托盘塞满（且没有宝石能从托盘送进宝箱）→ 失败
  for (let s = 0; s < G.trayCap; s++) { const id = G.tray[s]; if (id >= 0 && activeChest(G.gems[id].c) >= 0) return; }
  if (G.pouch.some(id => activeChest(G.gems[id].c) >= 0)) return;
  fail();
}

/* ---------- 道具 ---------- */
function useProp(k, fromRevive) {
  if (G.state !== 'play' && !fromRevive) return false;
  if (save.props[k] <= 0) { toast('道具用完啦，过关可以获得新道具', 1600); SND.play('deny'); return false; }
  if (k === 'slot') {
    if (G.trayCap >= 7) { toast('托盘已经最大啦', 1200); return false; }
    G.trayCap++; SND.play('addslot');
    const [x, y] = slotPos(G.trayCap - 1); for (let i = 0; i < 14; i++) part('spark', x, y, { vx: rnd(-140, 140), vy: rnd(-160, 60), life: rnd(.4, .8), col: '#9effa0' });
    floatText(x, y - 30, '+1 宝位', '#9effa0');
  } else if (k === 'clear') {
    let n = 0;
    for (let s = 0; s < G.trayCap; s++) { const id = G.tray[s]; if (id < 0 || G.gems[id].st !== 'tray') continue; G.tray[s] = -1; const [x, y] = slotPos(s); launch(G.gems[id], x, y, { kind: 'pouch' }, 0.35 + n * 0.05); n++; }
    if (!n) { toast('托盘是空的，不用清', 1200); return false; }
    SND.play('clear'); floatText(L.pouch.x, L.pouch.y - 34, '收进口袋', '#ffd6f0');
  } else if (k === 'bomb') {
    G.bombMode = !G.bombMode; SND.play('click');
    if (G.bombMode) toast('点击一块板子把它炸开！', 1600);
    return false; // 实际消耗在点击板子时
  }
  save.props[k]--; G.used++; persist();
  return true;
}
function bombPanel(p) {
  G.bombMode = false; save.props.bomb--; G.used++; persist();
  SND.play('fuse');
  p.boom = 0.55; // 引信
  setTimeout(() => {
    if (!G.panels || !p.alive) return;
    SND.play('boom'); vib(60); G.shakeT = 0.45;
    const [cx, cy] = b2s(p.cx, p.cy);
    for (let i = 0; i < 40; i++) part('chip', cx + rnd(-30, 30), cy + rnd(-30, 30), { vx: rnd(-420, 420), vy: rnd(-520, 120), life: rnd(.6, 1.1), col: MAT[p.mat].rim[1], sz: rnd(3, 8) });
    for (let i = 0; i < 26; i++) part('smoke', cx + rnd(-40, 40), cy + rnd(-40, 40), { vx: rnd(-60, 60), vy: rnd(-90, -20), life: rnd(.7, 1.3), sz: rnd(16, 34) });
    part('flash', cx, cy, { life: 0.3, r: 120 });
    for (const gi of p.gems) {
      const g = G.gems[gi]; if (g.st !== 'on') continue;
      const ci = activeChest(g.c); const [x, y] = b2s(g.x, g.y);
      if (ci >= 0) { G.chests[ci].res++; launch(g, x, y, { kind: 'chest', i: ci, k: G.chests[ci].res - 1 }, 0.55); }
      else launch(g, x, y, { kind: 'pouch' }, 0.6);
    }
    p.left = 0; p.alive = false; p.fall = { t: 0, vx: 0, vy: -200, w: rnd(-3, 3), x: 0, y: 0, a: 0, s: 1, boom: 1 };
  }, 520);
}

/* ---------- 粒子 / 飘字 ---------- */
function part(type, x, y, o = {}) { if (G.parts.length > 400) return; G.parts.push(Object.assign({ type, x, y, vx: 0, vy: 0, t: 0, life: 0.6, rot: rnd(0, TAU), vr: rnd(-8, 8), sz: rnd(3, 6) }, o)); }
function floatText(x, y, s, col) { const hw = s.length * 11 + 8; x = clamp(x, L.gx + hw, L.gx + L.GW - hw); G.texts.push({ x, y, s, col, t: 0 }); }
let toastT = null;
function toast(s, ms = 1500) { const e = $('toast'); e.textContent = s; e.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => e.classList.remove('on'), ms); }
function vib(ms) { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { } }

/* ---------- 更新 ---------- */
function update(dt) {
  G.t += dt;
  if (G.state === 'play' || G.state === 'won' || G.state === 'fail') {
    G.intro = G.panels.some(p => p.intro > 0);
    for (const p of G.panels) {
      if (p.intro > -1) p.intro -= dt;
      if (p.flash > 0) p.flash -= dt;
      if (p.boom > 0) p.boom -= dt;
      if (p.fall) {
        const f = p.fall; f.t += dt; f.vy += 1500 * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.a += f.w * dt; f.s = Math.max(0.6, 1 - f.t * 0.35);
      }
    }
    for (const g of G.gems) {
      if (g.shake > 0) g.shake -= dt;
      if (g.pop > 0) g.pop -= dt * 3;
      if (g.st === 'pry') {
        g.t += dt;
        if (g.t >= 0.16) { const [x, y] = b2s(g.x, g.y); launch(g, x, y - 8, g.target, 0.42); }
      }
    }
    for (let i = G.fly.length - 1; i >= 0; i--) {
      const f = G.fly[i]; f.t += dt / f.dur;
      if (Math.random() < 0.6) { const [x, y] = flyPos(f); part('trail', x, y, { life: 0.35, col: GEMS[f.g.c].lt, sz: rnd(2, 4) }); }
      if (f.t >= 1) { G.fly.splice(i, 1); landGem(f.g); }
    }
    for (let i = 0; i < 2; i++) chestStep(i, dt);
    for (let i = G.tools.length - 1; i >= 0; i--) { G.tools[i].t += dt; if (G.tools[i].t > 0.32) G.tools.splice(i, 1); }
    // 口袋里的宝石：如有匹配宝箱立即送达
    if (G.pouch.length) for (let i = 0; i < 2; i++) { const ch = G.chests[i]; if (ch && ch.st === 'idle' && G.pouch.some(id => G.gems[id].c === ch.c)) feedChest(i); }
    // 托盘里也可能有刚到的宝箱需要的宝石（宝箱先到、宝石后落）
    for (let i = 0; i < 2; i++) { const ch = G.chests[i]; if (ch && ch.st === 'idle' && ch.res < 3) for (let s = 0; s < G.trayCap; s++) { const id = G.tray[s]; if (id >= 0 && G.gems[id].st === 'tray' && G.gems[id].c === ch.c) { feedChest(i); break; } } }
    if (G.trayWarn > 0) G.trayWarn -= dt * 0.8;
    if (G.shakeT > 0) G.shakeT -= dt;
    // 自由宝石闪光
    if (Math.random() < dt * 5) { const fr = G.gems.filter(g => g.st === 'on' && isFree(g)); if (fr.length) { const g = fr[Math.floor(Math.random() * fr.length)]; const [x, y] = b2s(g.x, g.y); part('glint', x + rnd(-6, 6), y + rnd(-6, 6), { life: 0.6, sz: rnd(6, 10) }); } }
    if (G.state === 'play') {
      G.idle += dt;
      if ((G.tut || (G.n <= 5 && G.idle > 7)) && !G.hint && !busy()) G.hint = botPick();
      checkStuck(); checkEnd();
    }
  }
  for (let i = G.parts.length - 1; i >= 0; i--) {
    const p = G.parts[i]; p.t += dt; if (p.t >= p.life) { G.parts.splice(i, 1); continue; }
    p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
    if (p.type === 'chip' || p.type === 'confetti') p.vy += 900 * dt * (p.type === 'confetti' ? 0.3 : 1);
    if (p.type === 'spark') { p.vx *= 0.94; p.vy = p.vy * 0.94 + 120 * dt; }
  }
  for (let i = G.texts.length - 1; i >= 0; i--) { G.texts[i].t += dt; if (G.texts[i].t > 1.1) G.texts.splice(i, 1); }
}
function flyPos(f) {
  const [tx, ty] = targetPos(f.g.target); const t = easeOut(clamp(f.t, 0, 1)) * 0.85 + clamp(f.t, 0, 1) * 0.15, u = 1 - t;
  return [u * u * f.x0 + 2 * u * t * f.cx + t * t * tx, u * u * f.y0 + 2 * u * t * f.cy + t * t * ty];
}

/* ---------- 绘制 ---------- */
function drawGem(c, x, y, size, alpha = 1, rot = 0) {
  const im = IMG['g_' + GEMS[c].k]; const s = size / Math.max(im.width, im.height);
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y); if (rot) ctx.rotate(rot);
  ctx.drawImage(im, -im.width * s / 2, -im.height * s / 2, im.width * s, im.height * s); ctx.restore();
}
function drawProngs(x, y, r) {
  ctx.fillStyle = '#ffd44a'; ctx.strokeStyle = '#5a3000'; ctx.lineWidth = 1;
  for (let i = 0; i < 4; i++) { const a = Math.PI / 4 + i * Math.PI / 2; const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r; ctx.beginPath(); ctx.arc(px, py, r * 0.16, 0, TAU); ctx.fill(); ctx.stroke(); }
}
function drawPanel(p) {
  const spr = panelSprite(p); const s = L.bs;
  let dx = 0, dy = 0, a = 0, sc = 1, al = 1;
  if (p.intro > 0) { const t = clamp(1 - p.intro / 0.5, 0, 1); dy = -(1 - easeBack(t)) * 160; al = clamp(t * 3, 0, 1); if (t <= 0) return; }
  if (p.fall) { dx = p.fall.x; dy = p.fall.y; a = p.fall.a; sc = p.fall.s; al = clamp(1 - p.fall.t * 0.8, 0, 1); if (al <= 0) return; }
  let wob = 0; if (p.left === 1 && p.alive && !p.fall) wob = Math.sin(G.t * 5 + p.id) * 0.025;
  if (p.boom > 0) { dx += rnd(-2, 2); dy += rnd(-2, 2); }
  const [cx, cy] = b2s(p.cx, p.cy);
  ctx.save(); ctx.globalAlpha = al;
  ctx.translate(cx + dx * s, cy + dy * s); if (a || wob) ctx.rotate(a + wob); if (sc !== 1) ctx.scale(sc, sc);
  if (p.fall) ctx.filter = 'none';
  ctx.drawImage(spr.c, (spr.ox - p.cx) * s, (spr.oy - p.cy) * s, spr.w * s, spr.h * s);
  if (p.fall) { ctx.globalCompositeOperation = 'source-atop'; }
  // 宝石
  const GR = G.lv.cfg.GR * s;
  for (const gi of p.gems) {
    const g = G.gems[gi]; if (g.st !== 'on' && g.st !== 'pry') continue;
    let gx = (g.x - p.cx) * s, gy = (g.y - p.cy) * s, size = GR * 1.9;
    if (g.shake > 0) gx += Math.sin(g.shake * 60) * 3 * (g.shake / 0.35);
    if (g.st === 'pry') { const t = g.t / 0.16; gy -= 6 * t; size *= 1 + 0.3 * t; }
    // 投影
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(gx + 1, gy + GR * 0.35, GR * 0.75, GR * 0.4, 0, 0, TAU); ctx.fill();
    drawGem(g.c, gx, gy, size);
    if (g.st === 'on') drawProngs(gx, gy, GR * 0.82);
  }
  if (p.flash > 0) { ctx.globalCompositeOperation = 'source-over'; polyPath(ctx, p.poly.map(q => [(q[0] - p.cx) * s, (q[1] - p.cy) * s])); ctx.lineWidth = 4; ctx.strokeStyle = `rgba(255,60,60,${clamp(p.flash, 0, 0.6) * 1.6})`; ctx.stroke(); }
  if (G.bombMode && p.alive) { polyPath(ctx, p.poly.map(q => [(q[0] - p.cx) * s, (q[1] - p.cy) * s])); ctx.lineWidth = 3; ctx.setLineDash([8, 6]); ctx.lineDashOffset = -G.t * 30; ctx.strokeStyle = 'rgba(255,140,40,.95)'; ctx.stroke(); ctx.setLineDash([]); }
  if (p.boom > 0) { const t = 1 - p.boom / 0.55; ctx.fillStyle = `rgba(255,${200 - t * 150},60,${t * 0.5})`; polyPath(ctx, p.poly.map(q => [(q[0] - p.cx) * s, (q[1] - p.cy) * s])); ctx.fill(); }
  ctx.restore();
}
function drawHUD() {
  const pb = L.pauseBtn;
  // 暂停
  ctx.save(); ctx.beginPath(); ctx.arc(pb.x + 22, pb.y + 22, 20, 0, TAU);
  let g = ctx.createRadialGradient(pb.x + 16, pb.y + 14, 2, pb.x + 22, pb.y + 22, 22); g.addColorStop(0, '#c08aff'); g.addColorStop(1, '#4a1890'); ctx.fillStyle = g; ctx.fill();
  ctx.lineWidth = 2.5; ctx.strokeStyle = '#ffe08a'; ctx.stroke(); ctx.fillStyle = '#fff'; rr(ctx, pb.x + 15, pb.y + 13, 5, 18, 2); ctx.fill(); rr(ctx, pb.x + 24, pb.y + 13, 5, 18, 2); ctx.fill(); ctx.restore();
  // 关卡缎带
  const cx = L.gx + L.GW / 2, y = L.top + 22, w = 120;
  ctx.save(); ctx.fillStyle = '#5a0a2a'; ctx.beginPath(); ctx.moveTo(cx - w / 2 - 16, y - 8); ctx.lineTo(cx - w / 2 + 4, y - 8); ctx.lineTo(cx - w / 2 + 4, y + 12); ctx.lineTo(cx - w / 2 - 16, y + 12); ctx.lineTo(cx - w / 2 - 8, y + 2); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(cx + w / 2 + 16, y - 8); ctx.lineTo(cx + w / 2 - 4, y - 8); ctx.lineTo(cx + w / 2 - 4, y + 12); ctx.lineTo(cx + w / 2 + 16, y + 12); ctx.lineTo(cx + w / 2 + 8, y + 2); ctx.closePath(); ctx.fill();
  rr(ctx, cx - w / 2, y - 16, w, 30, 12); g = ctx.createLinearGradient(0, y - 16, 0, y + 14); g.addColorStop(0, '#ff6a8e'); g.addColorStop(1, '#b8123e'); ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#ffe08a'; ctx.stroke(); ctx.restore();
  text(`第 ${G.n} 关`, cx, y - 1, 17, '#fff', '#6a0a24', 4);
  // 进度
  const px = L.gx + L.GW - 14, pw = Math.min(96, L.GW * 0.25);
  const prog = G.got / G.total;
  ctx.save(); rr(ctx, px - pw, y - 9, pw, 16, 8); ctx.fillStyle = 'rgba(20,6,30,.75)'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#c8962a'; ctx.stroke();
  if (prog > 0) { rr(ctx, px - pw + 2, y - 7, (pw - 4) * prog, 12, 6); g = ctx.createLinearGradient(px - pw, 0, px, 0); g.addColorStop(0, '#ff4f7b'); g.addColorStop(0.5, '#ffd34a'); g.addColorStop(1, '#4fe0ff'); ctx.fillStyle = g; ctx.fill(); }
  ctx.restore();
  text(`进度 ${Math.round(prog * 100)}%`, px - pw / 2, y + 17, 11, '#ffe9b0', '#2a0a3a', 3, 'center', 800);
}
function drawChests() {
  for (let i = 0; i < 2; i++) {
    const ch = G.chests[i], c = L.chest[i];
    // 底座光
    ctx.save(); ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(c.x + c.w / 2, c.y + c.h + 2, c.w * 0.55, 7, 0, 0, TAU); ctx.fill(); ctx.restore();
    if (!ch) continue;
    let ox = 0, oy = 0, sc = 1, al = 1, lid = 0;
    if (ch.st === 'arrive') { const t = clamp(ch.t / 0.32, 0, 1); if (ch.t < 0) continue; ox = (1 - easeBack(t)) * (i ? 1 : -1) * (c.w + 40); al = t; }
    if (ch.st === 'close') lid = clamp(ch.t / 0.24, 0, 1);
    if (ch.st === 'leave') { lid = 1; const t = clamp(ch.t / 0.38, 0, 1); oy = -easeIn(t) * (c.y + c.h + 20); sc = 1 - t * 0.3; al = 1 - t * 0.5; }
    const body = chestBody(ch.c, c.w, c.h);
    ctx.save(); ctx.globalAlpha = al; ctx.translate(c.x + c.w / 2 + ox, c.y + c.h / 2 + oy); ctx.scale(sc, sc);
    if (ch.st === 'close' && ch.t > 0.24) { const k = Math.sin((ch.t - 0.24) / 0.18 * Math.PI) * 0.06; ctx.scale(1 + k, 1 - k); }
    const x0 = -c.w / 2, y0 = -c.h / 2;
    if (lid < 0.5) drawLid(x0, y0, c.w, c.h, ch.c, lid);
    ctx.drawImage(body.c, x0 - body.pad, y0 - body.pad, c.w + body.pad * 2, c.h + body.pad * 2);
    // 已装宝石
    for (const id of ch.items) { const g = G.gems[id]; const [sx, sy] = sockPos(i, g.k); const pop = g.pop > 0 ? 1 + Math.sin(g.pop * Math.PI) * 0.35 : 1; drawGem(g.c, sx - c.x - c.w / 2, sy - c.y - c.h / 2, Math.min(c.w * 0.24, c.h * 0.36) * pop); }
    if (lid >= 0.5) drawLid(x0, y0, c.w, c.h, ch.c, lid);
    ctx.restore();
  }
  // 后续队列
  const rest = G.lv.queue.slice(G.qi, G.qi + 6), cx = L.gx + L.GW / 2, y = L.qY + L.qH / 2;
  const n = Math.max(1, rest.length), w = rest.length ? n * 22 + 54 : 120;
  ctx.save(); rr(ctx, cx - w / 2, y - 10, w, 20, 10); ctx.fillStyle = 'rgba(20,6,30,.6)'; ctx.fill(); ctx.restore();
  if (rest.length) text('后续', cx - w / 2 + 22, y, 11, '#e9c98c', null, 0, 'center', 800);
  else text('最后的宝箱啦！', cx, y, 11, '#ffe27a', null, 0, 'center', 800);
  rest.forEach((c, k) => drawGem(c, cx - w / 2 + 50 + k * 22, y, 16, 1 - k * 0.1));
  const more = G.lv.queue.length - G.qi - rest.length; if (more > 0) text('+' + more, cx + w / 2 + 14, y, 11, '#e9c98c', null, 0, 'center', 800);
}
function drawTray() {
  const x = L.trayX, y = L.trayY, w = L.trayW, h = L.trayH;
  const warn = G.trayWarn > 0 || trayCount() >= G.trayCap;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4;
  rr(ctx, x, y, w, h, h / 2); ctx.fillStyle = goldGrad(ctx, y, y + h); ctx.fill(); ctx.shadowColor = 'transparent';
  rr(ctx, x + 3, y + 3, w - 6, h - 6, h / 2 - 3); let g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#6a1a5a'); g.addColorStop(1, '#2a0626'); ctx.fillStyle = g; ctx.fill();
  if (warn) { const a = 0.35 + Math.sin(G.t * 10) * 0.25; ctx.lineWidth = 3; ctx.strokeStyle = `rgba(255,60,80,${a})`; rr(ctx, x - 2, y - 2, w + 4, h + 4, h / 2 + 2); ctx.stroke(); }
  ctx.restore();
  for (let i = 0; i < 7; i++) {
    const [sx, sy] = slotPos(i), r = L.slot / 2;
    ctx.save();
    if (i < G.trayCap) {
      ctx.beginPath(); ctx.arc(sx, sy, r * 0.88, 0, TAU); g = ctx.createRadialGradient(sx, sy - r * 0.3, 1, sx, sy, r); g.addColorStop(0, '#1a0418'); g.addColorStop(1, '#4a1040'); ctx.fillStyle = g; ctx.fill();
      ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,210,120,.55)'; ctx.stroke();
    } else {
      ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.arc(sx, sy, r * 0.8, 0, TAU); ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fill();
      // 锁
      ctx.strokeStyle = '#d8b060'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(sx, sy - 3, 5, Math.PI, 0); ctx.stroke(); ctx.fillStyle = '#d8b060'; rr(ctx, sx - 7, sy - 3, 14, 11, 2); ctx.fill();
      ctx.fillStyle = '#3a1a02'; ctx.fillRect(sx - 1, sy + 1, 2, 4);
    }
    ctx.restore();
    const id = G.tray[i]; if (id >= 0 && G.gems[id].st === 'tray') { const gm = G.gems[id]; const pop = gm.pop > 0 ? 1 + Math.sin(gm.pop * Math.PI) * 0.3 : 1; drawGem(gm.c, sx, sy, L.slot * 0.78 * pop); }
  }
  // 口袋
  const P = L.pouch; const r = P.r;
  ctx.save(); ctx.translate(P.x, P.y + 2);
  ctx.fillStyle = '#5a3412'; ctx.strokeStyle = '#1e0a02'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-r * 0.45, -r * 0.55); ctx.quadraticCurveTo(-r * 1.05, r * 0.1, -r * 0.7, r * 0.75); ctx.quadraticCurveTo(0, r * 1.05, r * 0.7, r * 0.75); ctx.quadraticCurveTo(r * 1.05, r * 0.1, r * 0.45, -r * 0.55); ctx.closePath();
  g = ctx.createLinearGradient(0, -r, 0, r); g.addColorStop(0, '#a0602a'); g.addColorStop(1, '#4a2208'); ctx.fillStyle = g; ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(0, -r * 0.6, r * 0.5, r * 0.16, 0, 0, TAU); ctx.fillStyle = '#2a1004'; ctx.fill(); ctx.strokeStyle = '#ffd24a'; ctx.lineWidth = 2; ctx.stroke();
  if (G.pouch.length) { ctx.beginPath(); ctx.arc(r * 0.6, -r * 0.65, 9, 0, TAU); ctx.fillStyle = '#ff3b5c'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#fff'; ctx.stroke(); text(String(G.pouch.length), r * 0.6, -r * 0.65, 11, '#fff'); }
  ctx.beginPath(); ctx.arc(0, r * 0.2, r * 0.22, 0, TAU); ctx.fillStyle = '#ffd24a'; ctx.fill(); ctx.fillStyle = '#7a3a0a'; ctx.beginPath(); ctx.arc(0, r * 0.2, r * 0.1, 0, TAU); ctx.fill();
  ctx.restore();
}
function drawProps() {
  for (const b of L.props) {
    const pr = PROPS.find(p => p.k === b.k), n = save.props[b.k];
    const active = b.k === 'bomb' && G.bombMode;
    ctx.save();
    const by = b.y + 4;
    rr(ctx, b.x, by + 4, b.w, b.h - 8, 18); ctx.fillStyle = active ? '#a04a00' : '#2a0c46'; ctx.fill();
    rr(ctx, b.x, by, b.w, b.h - 10, 18); let g = ctx.createLinearGradient(0, by, 0, by + b.h); g.addColorStop(0, active ? '#ffd27a' : '#b884ff'); g.addColorStop(1, active ? '#ff8a1f' : '#5a1fa0'); ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = 2.5; ctx.strokeStyle = '#ffe08a'; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(b.x + b.w * 0.3, by + 9, b.w * 0.2, 4, -0.15, 0, TAU); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fill();
    const im = IMG[pr.img]; const sz = (b.h - 30); const sc = sz / Math.max(im.width, im.height);
    const bounce = active ? Math.sin(G.t * 12) * 3 : 0;
    ctx.drawImage(im, b.x + b.w / 2 - im.width * sc / 2, by + 3 + bounce, im.width * sc, im.height * sc);
    text(pr.name, b.x + b.w / 2, by + b.h - 20, 13, '#fff', '#3a0d66', 3.5);
    // 角标
    ctx.beginPath(); ctx.arc(b.x + b.w - 6, by + 4, 11, 0, TAU); ctx.fillStyle = n > 0 ? '#ff3b5c' : '#3fbf2c'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke();
    text(n > 0 ? String(n) : '+', b.x + b.w - 6, by + 4.5, 12, '#fff');
    ctx.restore();
  }
}
function drawTool(t) {
  const k = clamp(t.t / 0.32, 0, 1); const a = (-0.9 + Math.sin(k * Math.PI) * 0.9) * t.dir;
  ctx.save(); ctx.translate(t.x + 10 * t.dir, t.y + 12); ctx.rotate(a); ctx.globalAlpha = k > 0.75 ? (1 - k) * 4 : 1;
  // 金色撬棍
  ctx.lineCap = 'round'; ctx.lineWidth = 7; ctx.strokeStyle = '#3a1a02';
  ctx.beginPath(); ctx.moveTo(0, 26); ctx.lineTo(0, -8); ctx.quadraticCurveTo(0, -18, -9 * t.dir, -16); ctx.stroke();
  ctx.lineWidth = 4.5; ctx.strokeStyle = '#ffcc33'; ctx.stroke();
  ctx.lineWidth = 1.5; ctx.strokeStyle = '#fff8c0'; ctx.beginPath(); ctx.moveTo(-1, 22); ctx.lineTo(-1, -6); ctx.stroke();
  ctx.restore();
}
function drawParts() {
  for (const p of G.parts) {
    const k = p.t / p.life;
    ctx.save(); ctx.globalAlpha = 1 - k;
    if (p.type === 'spark' || p.type === 'glint') {
      ctx.fillStyle = p.col || '#fff'; const s = p.type === 'glint' ? p.sz * Math.sin(k * Math.PI) : p.sz * (1 - k * 0.5);
      if (p.type === 'glint') { ctx.globalAlpha = 0.95; ctx.fillStyle = '#fff'; ctx.shadowColor = '#fff'; ctx.shadowBlur = 6; }
      star4(ctx, p.x, p.y, s * 1.4, p.type === 'glint' ? 0 : p.rot); ctx.fill();
    } else if (p.type === 'trail') { ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(p.x, p.y, p.sz * (1 - k), 0, TAU); ctx.fill(); }
    else if (p.type === 'chip') { ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.col; ctx.fillRect(-p.sz / 2, -p.sz / 3, p.sz, p.sz * 0.66); }
    else if (p.type === 'ring') { ctx.globalAlpha = (1 - k) * 0.9; ctx.lineWidth = 3 * (1 - k) + 0.5; ctx.strokeStyle = p.col; ctx.beginPath(); ctx.arc(p.x, p.y, p.r + k * 26, 0, TAU); ctx.stroke(); }
    else if (p.type === 'smoke') { ctx.globalAlpha = (1 - k) * 0.5; ctx.fillStyle = '#6a5a50'; ctx.beginPath(); ctx.arc(p.x, p.y, p.sz * (0.6 + k), 0, TAU); ctx.fill(); }
    else if (p.type === 'flash') { const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * (0.5 + k)); g.addColorStop(0, 'rgba(255,240,180,.95)'); g.addColorStop(1, 'rgba(255,120,20,0)'); ctx.fillStyle = g; ctx.fillRect(p.x - p.r * 2, p.y - p.r * 2, p.r * 4, p.r * 4); }
    else if (p.type === 'confetti') { ctx.globalAlpha = 1; drawGem(p.c, p.x, p.y, p.sz, k > 0.8 ? (1 - k) * 5 : 1, p.rot); }
    ctx.restore();
  }
  for (const t of G.texts) { const k = t.t / 1.1; ctx.save(); ctx.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1; const sc = k < 0.15 ? easeBack(k / 0.15) : 1; ctx.translate(t.x, t.y - k * 30); ctx.scale(sc, sc); text(t.s, 0, 0, 20, t.col, '#3a0a2a', 5); ctx.restore(); }
}
function drawHint() {
  const g = G.hint; if (!g || g.st !== 'on' || G.state !== 'play') { G.hint = null; return; }
  const [x, y] = b2s(g.x, g.y); const k = (G.t * 1.6) % 1;
  ctx.save(); ctx.strokeStyle = 'rgba(255,240,150,' + (1 - k) + ')'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, G.lv.cfg.GR * L.bs * (1 + k * 0.8), 0, TAU); ctx.stroke();
  // 手指
  const bob = Math.sin(G.t * 6) * 6; ctx.translate(x + 14, y + 18 + bob); ctx.rotate(-0.5);
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#3a1a3a'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(-5, -18); ctx.quadraticCurveTo(0, -24, 5, -18); ctx.lineTo(5, 0); ctx.lineTo(14, 2); ctx.quadraticCurveTo(20, 4, 18, 12); ctx.lineTo(14, 26); ctx.lineTo(-8, 26); ctx.lineTo(-14, 8); ctx.quadraticCurveTo(-14, 2, -5, 4); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
  if (G.tut) {
    const msgs = ['点一下没被挡住的宝石，把它撬出来！', '宝石会飞进同色宝箱，集齐 3 颗就合上', '板子上的宝石撬光，板子就会掉下去'];
    const m = msgs[Math.min(G.tutStep, 2)];
    const by = L.by - 2; ctx.save(); ctx.font = `800 14px ${FONT}`; const tw = ctx.measureText(m).width + 28;
    rr(ctx, L.gx + L.GW / 2 - tw / 2, by, tw, 30, 15); ctx.fillStyle = 'rgba(255,248,225,.95)'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#c8962a'; ctx.stroke(); ctx.restore();
    text(m, L.gx + L.GW / 2, by + 15, 14, '#5a1a3a', null, 0, 'center', 800);
  }
}
function render() {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  drawBg();
  if (!G.panels || G.state === 'menu') return;
  ctx.save();
  if (G.shakeT > 0) ctx.translate(rnd(-1, 1) * G.shakeT * 18, rnd(-1, 1) * G.shakeT * 18);
  // 掉落的板子在下层
  for (const p of G.panels) if (p.fall) drawPanel(p);
  for (const p of G.panels) if (p.alive) drawPanel(p);
  for (const t of G.tools) drawTool(t);
  ctx.restore();
  drawHUD(); drawChests(); drawTray(); drawProps();
  // 飞行宝石
  for (const f of G.fly) { const [x, y] = flyPos(f); const t = clamp(f.t, 0, 1); const sz = G.lv.cfg.GR * L.bs * 1.9 * (1 + Math.sin(t * Math.PI) * 0.45) * lerp(1, f.g.target.kind === 'tray' ? L.slot * 0.78 / (G.lv.cfg.GR * L.bs * 1.9) : 0.9, t); drawGem(f.g.c, x, y, sz, 1, Math.sin(t * Math.PI) * 0.4 * Math.sign(f.spin)); }
  drawParts(); drawHint();
}

/* ---------- 输入 ---------- */
function hitProp(x, y) { for (const b of L.props) if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b.k; return null; }
function onTap(x, y) {
  if (G.state !== 'play') return;
  const pb = L.pauseBtn; if (x < pb.x + pb.w + 6 && y < pb.y + pb.h + 6 && x > pb.x - 6) { pause(); return; }
  const pk = hitProp(x, y); if (pk) { SND.play('click'); useProp(pk); return; }
  // 锁住的托盘位
  for (let i = G.trayCap; i < 7; i++) { const [sx, sy] = slotPos(i); if (Math.hypot(x - sx, y - sy) < L.slot * 0.6) { useProp('slot'); return; } }
  const [bx, by] = s2b(x, y);
  // 最上层命中的板子
  let top = -1; for (const p of G.panels) if (p.alive && GEN.pip(bx, by, p.poly)) top = Math.max(top, p.id);
  if (G.bombMode) { if (top >= 0) bombPanel(G.panels[top]); else { G.bombMode = false; } return; }
  const GR = G.lv.cfg.GR; let best = null, bd = 1e9;
  for (const g of G.gems) { if (g.st !== 'on' || g.p < top) continue; const d = Math.hypot(g.x - bx, g.y - by); if (d < GR * 1.35 && d < bd) { bd = d; best = g; } }
  if (best) tryPry(best);
}
let tStart = null;
cv.addEventListener('pointerdown', e => { e.preventDefault(); onTap(e.clientX, e.clientY); }, { passive: false });
document.addEventListener('touchmove', e => { if (e.target === cv) e.preventDefault(); }, { passive: false });

/* ---------- 机器人 ---------- */
function botPick() {
  const fr = G.gems.filter(g => g.st === 'on' && isFree(g)); if (!fr.length) return null;
  const nextIdx = c => { const q = G.lv.queue; for (let i = G.qi; i < q.length; i++) if (q[i] === c) return i - G.qi; return 99; };
  let best = null, bs = -1e9;
  for (const g of fr) {
    const ci = activeChest(g.c); let s = ci >= 0 ? 1000 + G.chests[ci].res * 5 : -nextIdx(g.c) * 12;
    // 宝箱正在换：同色先等
    if (ci < 0) for (const ch of G.chests) if (ch && ch.st !== 'idle' && ch.st !== 'arrive' && G.lv.queue[G.qi] === g.c) s += 4;
    if (G.panels[g.p].left === 1) s += 30;
    if (s > bs) { bs = s; best = g; }
  }
  return best;
}
let botT = 0;
function botTick(dt) {
  if (!DEBUG.bot || G.state !== 'play' || G.intro) return;
  botT -= dt; if (botT > 0) return;
  if (busy() && G.fly.length > 1) return;
  const g = botPick(); if (!g) return;
  if (activeChest(g.c) < 0 && G.chests.some(c => c && c.st !== 'idle')) return; // 等宝箱换好
  if (activeChest(g.c) < 0 && freeTraySlot() < 0) { if (save.props.clear > 0) useProp('clear'); return; }
  tryPry(g); botT = 0.32;
}

/* ---------- 胜负 ---------- */
function win() {
  if (G.state !== 'play') return;
  G.state = 'won';
  const stars = G.used === 0 ? 3 : G.used <= 2 ? 2 : 1; try{GT.win(G.n,{stars:stars,props:G.used,gems:G.total})}catch(_e){}
  const first = !save.cleared[G.n];
  save.stars[G.n] = Math.max(save.stars[G.n] || 0, stars); save.cleared[G.n] = 1;
  if (G.n >= save.unlocked && G.n < GEN.COUNT) save.unlocked = G.n + 1;
  let reward = null;
  if (first) { reward = PROPS[(G.n - 1) % 3]; save.props[reward.k]++; }
  persist();
  SND.play('win'); SND.duck(true);
  for (let i = 0; i < 70; i++) part('confetti', L.gx + rnd(0, L.GW), rnd(-200, -20), { vx: rnd(-40, 40), vy: rnd(120, 320), life: rnd(1.8, 2.8), c: Math.floor(rnd(0, 9)), sz: rnd(14, 24), vr: rnd(-4, 4) });
  setTimeout(() => {
    $('wTitle').textContent = ['满载而归！', '干得漂亮！', '神偷出手！'][stars - 1];
    const ss = $('wStars').children; for (let i = 0; i < 3; i++) { ss[i].className = ''; }
    showScr('win');
    for (let i = 0; i < stars; i++) setTimeout(() => { ss[i].className = 'on'; SND.play('star', i); }, 250 + i * 260);
    $('wInfo').innerHTML = `第 <b>${G.n}</b> 关 · 撬出 <b>${G.total}</b> 颗宝石<br>${G.used ? `使用道具 <b>${G.used}</b> 次` : '<b>零道具</b>完美通关！'}`;
    $('wReward').innerHTML = reward ? `<div class="reward"><img src="assets/${reward.img}.webp" alt="">首通奖励：${reward.name} +1</div>` : '';
    $('wNext').style.display = G.n < GEN.COUNT ? '' : 'none';
    if (G.n >= GEN.COUNT) $('wInfo').innerHTML += '<br>🏆 恭喜！你已洗劫整座宝库！';
  }, 1200);
}
function fail() {
  if (G.state !== 'play') return;
  G.state = 'fail'; SND.play('fail'); SND.duck(true); try{GT.fail(G.n,{r:'full',got:G.got,gems:G.total})}catch(_e){}
  setTimeout(() => {
    showScr('fail');
    $('fInfo').innerHTML = `丝绒托盘塞满啦！先撬能直接装箱的宝石哦<br>已撬出 <b>${G.got}</b> / ${G.total} 颗`;
    const rv = $('fRevive');
    const k = save.props.clear > 0 ? 'clear' : (save.props.slot > 0 && G.trayCap < 7) ? 'slot' : null;
    if (k) { rv.style.display = ''; rv.textContent = `用「${PROPS.find(p => p.k === k).name}」继续 ×${save.props[k]}`; rv.onclick = () => { SND.play('click'); showScr(null); G.state = 'play'; SND.duck(false); useProp(k, true); G.revived++; try{GT.revive(k)}catch(_e){} }; }
    else rv.style.display = 'none';
  }, 900);
}

/* ---------- 界面 ---------- */
const SCR = ['load', 'menu', 'levels', 'pause', 'win', 'fail'];
function showScr(id) { for (const s of SCR) $(s).classList.toggle('on', s === id); }
function pause() { if (G.state !== 'play') return; G.state = 'pause'; try{GT.pause()}catch(_e){} SND.play('click'); showScr('pause'); syncToggles(); }
function resume() { G.state = 'play'; showScr(null); }
function syncToggles() { for (const id of ['tMusic', 'pMusic']) $(id).classList.toggle('off', !save.music); for (const id of ['tSfx', 'pSfx']) $(id).classList.toggle('off', !save.sfx); }
function toggleMusic() { save.music = !save.music; try{GT.sound('music',save.music)}catch(_e){} persist(); SND.setMusic(save.music); if (save.music) { SND.unlock(); SND.startMusic(); } syncToggles(); }
function toggleSfx() { save.sfx = !save.sfx; try{GT.sound('sfx',save.sfx)}catch(_e){} persist(); SND.setSfx(save.sfx); syncToggles(); SND.play('click'); }
function menu() {
  G.state = 'menu'; G.panels = null; showScr('menu'); SND.duck(false);
  const tot = Object.values(save.stars).reduce((a, b) => a + b, 0);
  $('mStat').textContent = `已解锁 ${save.unlocked}/${GEN.COUNT} 关 · ★${tot}/${GEN.COUNT * 3}`;
  $('bPlay').textContent = save.unlocked > 1 ? `继续行动 · 第${save.unlocked}关` : '开始行动';
  syncToggles();
}
function levels() {
  showScr('levels'); const gr = $('grid'); gr.innerHTML = '';
  const tot = Object.values(save.stars).reduce((a, b) => a + b, 0); $('lvTot').textContent = `★ ${tot} / ${GEN.COUNT * 3}`;
  for (let i = 1; i <= GEN.COUNT; i++) {
    const b = document.createElement('button'); const lock = i > save.unlocked; const s = save.stars[i] || 0;
    b.className = 'lv' + (lock ? ' lock' : '') + (i === save.unlocked ? ' cur' : '');
    b.innerHTML = lock ? '🔒' : `${i}<span class="s">${'★'.repeat(s)}${'☆'.repeat(3 - s)}</span>`;
    b.onclick = () => { if (lock) { SND.play('deny'); toast('先通过前面的关卡'); return; } SND.play('click'); startLevel(i); };
    gr.appendChild(b);
  }
  const cur = gr.querySelector('.lv.cur'); if (cur) setTimeout(() => cur.scrollIntoView({ block: 'center' }), 30);
}
$('bPlay').onclick = () => { SND.play('click'); try{GT.title('play')}catch(_e){} startLevel(save.unlocked); };
$('bLevels').onclick = () => { SND.play('click'); try{GT.title('levels')}catch(_e){} levels(); };
$('lvBack').onclick = () => { SND.play('click'); menu(); };
$('tMusic').onclick = $('pMusic').onclick = toggleMusic;
$('tSfx').onclick = $('pSfx').onclick = toggleSfx;
$('pResume').onclick = () => { SND.play('click'); resume(); };
$('pRestart').onclick = () => { SND.play('click'); startLevel(G.n); };
$('pQuit').onclick = () => { SND.play('click'); try{GT.quit('menu')}catch(_e){} levels(); G.state = 'menu'; G.panels = null; };
$('wNext').onclick = () => { SND.play('click'); startLevel(G.n + 1); };
$('wRetry').onclick = () => { SND.play('click'); startLevel(G.n); };
$('wMenu').onclick = () => { SND.play('click'); G.panels = null; G.state = 'menu'; levels(); };
$('fRetry').onclick = () => { SND.play('click'); startLevel(G.n); };
$('fMenu').onclick = () => { SND.play('click'); G.panels = null; G.state = 'menu'; levels(); };
// 返回 Tilo 游戏屋：先存档再离开
function goHub(e) { if (e) e.stopPropagation(); persist(); try { SND.play('click'); } catch (_) { } try{GT.hub(e&&e.currentTarget&&e.currentTarget.id)}catch(_e){} location.href = '../'; }
/* 北京时间交付版：无返回游戏屋 */

/* ---------- 音频解锁 ---------- */
let unlocked = false;
const unlockAudio = () => { SND.unlock(); SND.setMusic(save.music); SND.setSfx(save.sfx); if (!unlocked) { unlocked = true; if (save.music) SND.startMusic(); } };
document.addEventListener('pointerdown', unlockAudio, true); document.addEventListener('touchend', unlockAudio, true);
document.addEventListener('visibilitychange', () => { if (document.hidden) { SND.stopMusic(); if (G.state === 'play') pause(); } else if (save.music && unlocked) SND.startMusic(); });

/* ---------- 主循环 ---------- */
let last = 0, fpsA = 0, fpsN = 0;
function frame(ts) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (ts - last) / 1000 || 0) * DEBUG.speed; last = ts;
  fpsA += dt; fpsN++; if (fpsA > 1) { G.fps = Math.round(fpsN / fpsA); fpsA = 0; fpsN = 0; }
  if (G.state !== 'pause') { update(dt); botTick(dt); }
  render();
}
window.addEventListener('resize', () => { layout(); });

/* ---------- 加载 ---------- */
function load() {
  let done = 0;
  return Promise.all(ASSETS.map(f => new Promise(res => {
    const im = new Image(); im.onload = im.onerror = () => { done++; $('loadBar').style.width = (done / ASSETS.length * 100) + '%'; res(); };
    im.src = 'assets/' + f; IMG[f.replace(/\.(webp|jpg|png)$/, '')] = im;
  })));
}
layout();
load().then(() => {
  layout();
  if (DEBUG.level) startLevel(DEBUG.level); else menu();
  requestAnimationFrame(frame);
});
window.__T = { n: GEN.COUNT, start: startLevel, win: () => win() };
window.__dbg = {
  G, L: () => L, save: () => save,
  gemScreen: id => { const g = G.gems[id]; return b2s(g.x, g.y); },
  free: () => G.gems.filter(g => g.st === 'on' && isFree(g)).map(g => ({ id: g.id, c: g.c, xy: b2s(g.x, g.y), match: activeChest(g.c) >= 0 })),
  pick: () => { const g = botPick(); return g ? { id: g.id, xy: b2s(g.x, g.y) } : null; },
  useProp, startLevel,
};
})();
