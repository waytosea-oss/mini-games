/* 封面主角动画：AI 生成的透明底序列帧（24fps · 120 帧无缝循环）+ 实时画布粒子
 * 与「花瓣消消」小蜜蜂、「魔法药水铺」小女巫同一套流程：WebP 精灵表（不支持时回退 PNG），
 * 精灵表就绪前先画首帧静态图占位；主角画在 #menu 内独立的小画布上，只在标题页可见时运行。 */
(function () {
'use strict';
const C = {"dir":"assets/cop/","name":"cop","nSheets":5,"fw":364,"fh":520,"cols":6,"per":24,"n":120,"fps":24,"body":[25,25,355,511],"gnd":511,"maxParts":70,"box":"mHero","z":-1,"above":"#mLogo","below":"#bPlay","pad":[0.32,0.06,0.03],"sway":0.025,"bob":0,"shadowA":0.38,"glow":"#fff4c0","glowA":0.32,"whMouth":200,"bot":[511,511,511,511,511,511,511,511,511,511,511,511,511,511,511,511,511,511,511,511,511,511,511,511,511,511,511,511,511,511,511,511,511,511,511,511,511,511,511,511,511,511,511,511,511,511,511,511,511,511,511,511,511,511,510,510,510,511,511,511,511,507,503,499,499,498,500,503,508,510,511,511,511,511,511,511,511,511,511,511,511,511,511,511,511,511,511,511,511,511,511,511,511,511,511,511,511,511,511,511,511,511,511,511,511,511,511,511,511,511,511,511,511,511,511,511,511,511,511,511],"wh":[278,225,278,225,278,226,278,226,279,226,279,226,279,227,280,227,280,228,280,229,280,230,280,230,280,231,279,231,278,232,277,232,276,232,274,231,272,229,270,227,267,225,264,222,261,220,258,218,256,218,255,218,253,218,252,218,252,219,251,219,251,220,251,220,250,221,251,222,251,223,251,223,251,224,251,223,250,221,250,217,249,213,247,207,245,200,243,193,243,189,241,186,240,186,239,187,239,188,239,187,239,187,240,187,240,189,242,196,245,205,247,216,249,223,251,227,253,228,255,225,256,219,255,208,254,198,252,189,252,186,251,185,250,185,248,185,246,184,243,186,243,191,243,199,244,207,246,218,247,226,248,233,249,235,249,233,249,229,248,222,247,215,246,206,244,197,243,191,242,189,242,190,241,193,242,198,243,204,246,214,249,224,253,232,256,237,260,238,265,237,269,235,271,232,273,229,275,226,276,224,277,224,277,224,278,225,278,225,278,225,278,225,278,225,278,225,278,225,278,225,278,225,278,225,278,225,278,225,278,225,278,225,278,225,278,225,278,225,278,225],"hand":[66,200,64,201,61,202,59,203,58,204,62,202,72,199,85,195,98,194,106,190,109,187,109,186,105,188,91,191,74,193,59,197,56,200,62,199,75,196,92,190,103,186,108,183,108,186,104,187,96,189,79,191,67,195,60,199,64,199,79,198,92,197,108,199,112,200,109,199,97,198,82,199,70,202,63,206,65,207,75,206,121,200,165,192,202,183,202,176,200,171,163,167,124,165,83,166,71,169,59,176,51,183,51,191,56,195,71,200,119,202,167,206,206,208,211,212,213,212,215,208,214,202,176,192,135,182,90,174,76,172,62,174,53,177,50,180,52,182,63,185,76,190,123,193,163,197,202,203,206,212,208,218,209,219,173,221,134,220,90,217,77,212,64,206,54,201,50,194,53,190,64,186,76,186,122,185,162,188,200,194,199,200,197,205,164,212,131,218,96,221,90,215,85,210,80,205,76,201,72,198,70,197,67,198,67,198,66,199,66,199,66,200,66,200,66,200,66,200,66,200,66,200,66,200,66,200,66,200,66,200,66,200,66,200,66,200,66,200,66,200]};
const $ = id => document.getElementById(id);
const menu = $('menu'), box = $(C.box);
if (!menu || !box) return;
const cv = document.createElement('canvas'); cv.className = 'heroCv'; cv.setAttribute('aria-hidden', 'true');
cv.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;z-index:' + C.z;
box.parentNode.insertBefore(cv, box);
const ctx = cv.getContext('2d');
const H = { sheets: [], ok: false, st: null, t: 0, last: 0, parts: [], L: null, raf: 0, cd: {}, pf: -1 };
const rnd = (a, b) => a + Math.random() * (b - a), pick = a => a[(Math.random() * a.length) | 0];
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
function hexA(h, a) { const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; }
/* ---- 载入：WebP 精灵表 → PNG 回退；解码一次后转画布，避免每帧重复解码大图 ---- */
function load() {
  const st = new Image(); st.onload = () => { H.st = st; kick(); }; st.src = C.dir + C.name + '_static.webp';
  let left = C.nSheets, failed = false;
  for (let i = 0; i < C.nSheets; i++) {
    const im = new Image(); let tried = false;
    im.onload = () => {
      try { const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; c.getContext('2d').drawImage(im, 0, 0); H.sheets[i] = c; } catch (e) { H.sheets[i] = im; }
      if (--left === 0 && !failed) { H.ok = true; H.t = 0; kick(); }
    };
    im.onerror = () => { if (!tried) { tried = true; im.src = C.dir + C.name + '_' + i + '.png'; } else failed = true; };
    im.src = C.dir + C.name + '_' + i + '.webp';
  }
}
/* ---- 预渲染发光精灵（按颜色缓存） ---- */
const SPR = {};
function sparkPath(x, cx, cy, r, w) { x.beginPath(); x.moveTo(cx, cy - r); x.quadraticCurveTo(cx + w, cy - w, cx + r, cy); x.quadraticCurveTo(cx + w, cy + w, cx, cy + r); x.quadraticCurveTo(cx - w, cy + w, cx - r, cy); x.quadraticCurveTo(cx - w, cy - w, cx, cy - r); x.closePath(); }
function spr(kind, col) {
  const key = kind + col; if (SPR[key]) return SPR[key];
  const S = 64, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d'), m = S / 2;
  if (kind === 'glow') { const g = x.createRadialGradient(m, m, 0, m, m, m); g.addColorStop(0, hexA(col, .55)); g.addColorStop(.45, hexA(col, .17)); g.addColorStop(1, hexA(col, 0)); x.fillStyle = g; x.fillRect(0, 0, S, S); }
  else {
    const g = x.createRadialGradient(m, m, 0, m, m, m); g.addColorStop(0, hexA(col, .5)); g.addColorStop(.35, hexA(col, .16)); g.addColorStop(1, hexA(col, 0)); x.fillStyle = g; x.fillRect(0, 0, S, S);
    if (kind === 'spark') { sparkPath(x, m, m, 18, 2.6); x.fillStyle = col; x.fill(); sparkPath(x, m, m, 8, 1.4); x.fillStyle = '#ffffff'; x.fill(); }
    else if (kind === 'star') { x.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 6.2 : 14; x.lineTo(m + Math.cos(a) * r, m + Math.sin(a) * r); } x.closePath(); x.fillStyle = col; x.fill(); x.beginPath(); x.arc(m - 1, m - 2, 3, 0, 7); x.fillStyle = '#fffbe6'; x.fill(); }
    else { x.fillStyle = '#ffffff'; x.beginPath(); x.arc(m, m, 4, 0, 7); x.fill(); }
  }
  return (SPR[key] = c);
}
/* ---- 布局：画布夹在上方元素（标志/副标题）与下方按钮之间，绝不覆盖标志、按钮与左上角返回胶囊 ---- */
function layout() {
  const bw = box.offsetWidth, bh = box.offsetHeight; if (!bw || !bh) return null;
  const bx = box.offsetLeft, by = box.offsetTop, mw = menu.clientWidth;
  const up = document.querySelector(C.above), dn = document.querySelector(C.below);
  const top0 = up ? up.offsetTop + up.offsetHeight + 2 : 0, bot0 = dn ? dn.offsetTop - 4 : menu.clientHeight;
  const x0 = Math.max(0, Math.floor(bx - bw * C.pad[0])), x1 = Math.min(mw, Math.ceil(bx + bw * (1 + C.pad[0])));
  const y0 = Math.max(top0, Math.floor(by - bh * C.pad[1])), y1 = Math.min(bot0, Math.ceil(by + bh * (1 + C.pad[2])));
  const DPR = Math.min(2, window.devicePixelRatio || 1);
  const L = { bx: bx - x0, by: by - y0, bw, bh, k: bw / C.fw, w: x1 - x0, h: Math.max(1, y1 - y0), DPR, x0, y0, u: bw / 200 };
  cv.style.left = x0 + 'px'; cv.style.top = y0 + 'px'; cv.style.width = L.w + 'px'; cv.style.height = L.h + 'px';
  const W = Math.round(L.w * DPR), Hh = Math.round(L.h * DPR); if (cv.width !== W) cv.width = W; if (cv.height !== Hh) cv.height = Hh;
  return L;
}
let rc = 0;
function on() { return menu.classList.contains('on') && !document.hidden; }
function tick(now) {
  H.raf = 0; if (!on()) { H.last = 0; return; }
  if (!H.L || ++rc % 30 === 0) H.L = layout();
  if (H.L) draw(now / 1000);
  H.raf = requestAnimationFrame(tick);
}
function kick() { if (!H.raf && on()) H.raf = requestAnimationFrame(tick); }
new MutationObserver(() => { H.L = null; kick(); }).observe(menu, { attributes: true, attributeFilter: ['class'] });
document.addEventListener('visibilitychange', kick);
window.addEventListener('resize', () => { H.L = null; kick(); });
/* ---- 每帧 ---- */
function draw(now) {
  const dt = H.last ? Math.min(.05, now - H.last) : .016; H.last = now; H.t += dt;
  const L = H.L, k = L.k, t = now;
  if (!H.ok && !H.st) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); return; }
  const f = H.ok ? Math.floor(H.t * C.fps) % C.n : 0;
  // 悬停漂移：轻微摇摆（以脚底为轴）+ 可选上下浮动
  const sway = Math.sin(t * 1.1) * C.sway + Math.sin(t * 2.3) * C.sway * .3, bob = (Math.sin(t * 1.6) * .8 + Math.sin(t * 3.2) * .2) * C.bob * L.u;
  const B = C.body, pivx = L.bx + (B[0] + B[2]) / 2 * k, pivy = L.by + B[3] * k;
  const ca = Math.cos(sway), sa = Math.sin(sway);
  // 帧坐标 → 画布坐标（含摇摆与浮动）
  const P = (fx, fy) => { const x = L.bx + fx * k - pivx, y = L.by + fy * k - pivy; return [pivx + x * ca - y * sa, pivy + x * sa + y * ca + bob]; };
  const S = { f, t, dt, k, L, P, u: L.u, bob, pivx, pivy };
  ctx.setTransform(L.DPR, 0, 0, L.DPR, 0, 0); ctx.clearRect(0, 0, L.w, L.h);
  // 地面柔影：跳起/浮起时变淡变小
  const gnd = C.gnd * k + L.by, lift = (C.gnd - C.bot[f]) * k - bob, sh = clamp(1 - lift / (L.bh * .35), .35, 1);
  const shw = (B[2] - B[0]) * k * .78 * (.7 + .3 * sh);
  ctx.save(); ctx.globalAlpha = C.shadowA * sh; ctx.drawImage(spr('glow', '#000000'), pivx - shw / 2, gnd - shw * .1, shw, shw * .2); ctx.restore();
  THEME.back && THEME.back(S);
  // 身后光晕（呼吸）
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const gw = (B[2] - B[0]) * k * 1.45, pu = .75 + .25 * Math.sin(t * 2.2);
  ctx.globalAlpha = C.glowA * pu; ctx.drawImage(spr('glow', C.glow), pivx - gw / 2, L.by + (B[1] + B[3]) / 2 * k - gw * .55 + bob, gw, gw * 1.05);
  ctx.restore();
  // 主角本体
  ctx.save(); ctx.translate(pivx, pivy + bob); ctx.rotate(sway); ctx.translate(-pivx, -pivy);
  if (H.ok) { const j = f % C.per, sh_ = H.sheets[(f / C.per) | 0]; ctx.drawImage(sh_, (j % C.cols) * C.fw, ((j / C.cols) | 0) * C.fh, C.fw, C.fh, L.bx, L.by, C.fw * k, C.fh * k); }
  else ctx.drawImage(H.st, L.bx, L.by, C.fw * k, C.fh * k);
  ctx.restore();
  THEME.front(S);
  // 粒子
  const PS = H.parts;
  ctx.save();
  for (let i = PS.length - 1; i >= 0; i--) {
    const p = PS[i]; p.life += dt; if (p.life > p.max) { PS.splice(i, 1); continue; }
    if (p.upd) p.upd(p, dt); else { p.vy += (p.g || 0) * dt; p.vx *= (1 - (p.drag || 1.2) * dt); p.x += (p.vx + (p.wob ? Math.sin(p.life * 5 + p.ph) * p.wob : 0)) * dt; p.y += p.vy * dt; p.rot += (p.vr || 0) * dt; }
    const a = Math.min(1, p.life / (p.fin || .12)) * Math.min(1, (p.max - p.life) / (p.fout || .45)) * (p.tw ? .65 + .35 * Math.sin(p.life * 14 + p.ph) : 1);
    ctx.globalAlpha = a; ctx.globalCompositeOperation = p.add === false ? 'source-over' : 'lighter';
    ctx.setTransform(L.DPR, 0, 0, L.DPR, 0, 0); ctx.translate(p.x, p.y); ctx.rotate(p.rot || 0);
    if (p.draw) p.draw(ctx, p); else { const sz = 64 * p.s * (1 - .35 * p.life / p.max); ctx.drawImage(spr(p.k, p.c), -sz / 2, -sz / 2, sz, sz); }
  }
  ctx.restore();
  H.pf = f;
}
function emit(p) { if (H.parts.length < (C.maxParts || 60)) { p.life = 0; p.ph = p.ph == null ? Math.random() * 6 : p.ph; p.rot = p.rot || 0; H.parts.push(p); } }
function cool(key, dt, rate) { H.cd[key] = (H.cd[key] || 0) - dt * rate; if (H.cd[key] <= 0) { H.cd[key] += 1; return true; } return false; }
const T = (arr, f, d) => [arr[f * d], arr[f * d + 1], arr[f * d + 2]];
/* 交警：吹哨（声波弧线 + 跳动音符）、挥手（金色闪光）、蹦跳落地（扬尘） */
const LAND = new Set(); for (let f = 0; f < C.n; f++) { const b = C.bot, p = b[(f + C.n - 1) % C.n], nx = b[(f + 1) % C.n]; let mn = 1e9; for (let i = 1; i <= 8; i++) mn = Math.min(mn, b[(f - i + C.n) % C.n]); if (b[f] >= p && b[f] > nx - 0.01 && b[f] - mn > 4) LAND.add(f); }
function drawArc(x, p) { const r = (6 + p.life * 34) * p.sc, a = .75; x.lineCap = 'round'; for (const [w, c] of [[4.6, 'rgba(13,74,150,.55)'], [2.4, '#ffffff']]) { x.lineWidth = w * p.sc; x.strokeStyle = c; x.beginPath(); x.arc(0, 0, r, -a, a); x.stroke(); } }
function drawNote(x, p) { const s = p.sc * 1.05; x.scale(s, s); x.lineWidth = 2.4; x.strokeStyle = 'rgba(10,60,130,.85)'; x.fillStyle = p.c;
  x.beginPath(); x.ellipse(0, 0, 4.6, 3.4, -.45, 0, 7); x.fill(); x.stroke();
  x.beginPath(); x.moveTo(4, -1); x.lineTo(4, -15); x.quadraticCurveTo(9, -12, 10, -6); x.stroke();
  x.lineWidth = 1.3; x.strokeStyle = p.c; x.beginPath(); x.moveTo(4, -1.5); x.lineTo(4, -14.5); x.stroke(); }
function drawPuff(x, p) { const q = p.life / p.max, r = p.r * (.5 + q * .9); const g = x.createRadialGradient(0, 0, 0, 0, 0, r); g.addColorStop(0, 'rgba(255,250,235,.55)'); g.addColorStop(1, 'rgba(255,250,235,0)'); x.fillStyle = g; x.beginPath(); x.ellipse(0, 0, r, r * .55, 0, 0, 7); x.fill(); }
const THEME = { front(S) {
  const { f, dt, u, P, L } = S;
  const [wx, wy] = P(C.wh[f * 2], C.wh[f * 2 + 1]), [hx, hy] = P(C.hand[f * 2], C.hand[f * 2 + 1]);
  const hv = H.ph ? Math.hypot(hx - H.ph[0], hy - H.ph[1]) / Math.max(dt, .001) : 0; H.ph = [hx, hy];
  if (C.wh[f * 2 + 1] < C.whMouth) {
    if (cool('arc', dt, 4.5)) emit({ x: wx + 8 * u, y: wy, vx: 26 * u, vy: rnd(-8, 2) * u, drag: .3, max: .75, fin: .05, fout: .45, sc: u, rot: rnd(-.25, .1), draw: drawArc, add: false });
    if (cool('note', dt, 2.4)) emit({ x: wx + rnd(10, 22) * u, y: wy - rnd(4, 14) * u, vx: rnd(14, 30) * u, vy: rnd(-34, -22) * u, drag: .2, wob: 10 * u, max: rnd(1.1, 1.5), fout: .5, sc: u * rnd(.85, 1.15), rot: rnd(-.3, .3), vr: rnd(-.5, .5), c: pick(['#ffe066', '#ffffff', '#ff9f43', '#7fd3ff']), draw: drawNote, add: false });
  }
  if (hv > 90 * u && cool('hand', dt, 7)) emit({ k: 'spark', c: pick(['#fff3a0', '#ffffff', '#ffd23f', '#9fe6ff']), x: hx + rnd(-14, 14) * u, y: hy + rnd(-14, 10) * u, vx: rnd(-14, 14) * u, vy: rnd(-26, -8) * u, s: rnd(.22, .4) * u, max: rnd(.45, .8), tw: 1 });
  if (cool('amb', dt, 1.3)) { const a = rnd(0, 6.28); emit({ k: 'spark', c: pick(['#fff3a0', '#ffffff', '#9fe6ff']), x: S.pivx + Math.cos(a) * L.bw * .52, y: L.by + L.bh * (.42 + Math.sin(a) * .34), vx: 0, vy: -8 * u, s: rnd(.18, .3) * u, max: rnd(.7, 1.1), tw: 1 }); }
  if (f !== H.pf && LAND.has(f)) { const gy = L.by + C.gnd * S.k, w = (C.body[2] - C.body[0]) * S.k; for (let i = 0; i < 4; i++) { const sd = i < 2 ? -1 : 1; emit({ x: S.pivx + sd * w * rnd(.12, .3), y: gy - 2 * u, vx: sd * rnd(18, 34) * u, vy: rnd(-10, -3) * u, drag: 2.5, max: rnd(.5, .7), fin: .04, fout: .4, r: rnd(9, 14) * u, draw: drawPuff, add: false }); } }
} };

window.__hero = H;
load(); kick();
})();
