/* 封面主角动画：AI 生成的透明底序列帧（24fps · 120 帧无缝循环）+ 实时画布粒子
 * 与「花瓣消消」小蜜蜂、「魔法药水铺」小女巫同一套流程：WebP 精灵表（不支持时回退 PNG），
 * 精灵表就绪前先画首帧静态图占位；主角画在 #menu 内独立的小画布上，只在标题页可见时运行。 */
(function () {
'use strict';
const C = {"dir":"assets/detective/","name":"detective","nSheets":5,"fw":308,"fh":501,"cols":6,"per":24,"n":120,"fps":24,"body":[8,32,258,494],"gnd":494,"maxParts":70,"box":"mHero","z":"auto","above":"#mTag","below":"#bPlay","pad":[0.35,0.1,0.03],"sway":0.03,"bob":0,"shadowA":0.3,"glow":"#9fe3ff","glowA":0.3,"bot":[494,494,494,494,494,494,494,494,494,494,494,494,494,494,494,494,494,494,494,494,494,494,494,494,494,494,494,494,494,494,494,494,494,494,494,494,494,494,494,494,494,494,494,494,494,494,494,494,494,494,494,494,494,494,494,494,494,494,494,494,494,494,494,494,494,494,494,494,494,494,494,494,494,494,494,494,494,494,494,494,494,493,489,480,466,453,442,438,444,459,477,489,494,494,494,494,494,494,494,494,494,494,494,494,494,494,494,494,494,494,494,494,494,494,494,494,494,494,494,494],"lens":[89,207,57,89,207,57,88,207,57,88,207,55,89,208,54,90,208,54,90,209,56,91,208,57,93,208,57,96,207,57,102,207,55,108,207,54,113,206,51,115,205,53,119,204,53,121,204,53,123,204,52,123,204,52,120,204,51,117,205,51,113,206,51,109,208,54,104,208,54,98,209,54,93,209,53,88,208,56,83,207,55,79,205,55,77,203,53,76,202,55,76,200,55,78,198,55,81,196,55,85,194,53,90,193,55,95,192,53,100,193,56,104,193,55,108,194,57,112,196,57,115,199,58,116,201,56,116,203,55,115,204,52,112,205,54,109,206,55,105,207,56,101,208,53,97,208,53,93,209,56,90,209,58,88,209,55,87,209,55,87,209,55,87,210,57,87,210,57,87,209,57,88,210,57,88,210,57,87,211,58,87,211,58,87,211,58,87,211,57,87,211,57,87,211,57,88,211,57,88,210,57,88,209,57,88,207,57,89,206,57,90,205,57,92,204,57,94,206,56,95,209,56,96,213,54,97,220,53,96,225,53,95,229,53,94,230,54,92,225,52,90,216,54,88,200,55,87,183,57,87,166,55,86,155,55,86,148,53,86,145,53,87,147,51,87,151,53,86,160,56,86,171,57,86,188,58,87,205,58,88,219,57,90,230,56,93,234,54,94,236,53,93,232,52,93,228,51,91,221,52,90,216,52,90,212,53,90,211,54,90,209,55,89,208,55,89,207,55,88,207,57,88,207,57,88,207,57,88,207,57,88,207,57,88,207,57,88,207,57,88,207,57,88,207,57,89,207,57,89,207,57,89,207,57,89,207,57,89,207,57]};
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
/* 小侦探：放大镜扫光（裁在镜片内）、镜框闪烁、金色「搜寻」涟漪 */
function drawRing(x, p) { const q = p.life / p.max, r = p.r0 * (1.02 + q * .8); x.lineWidth = (2.6 - q * 1.6) * p.sc; x.strokeStyle = '#ffd56a'; x.beginPath(); x.arc(0, 0, r, 0, 7); x.stroke(); x.lineWidth = 1 * p.sc; x.strokeStyle = 'rgba(160,230,255,.8)'; x.beginPath(); x.arc(0, 0, r * .93, 0, 7); x.stroke(); }
const THEME = { front(S) {
  const { f, t, dt, u, P, k } = S;
  const lx = C.lens[f * 3], ly = C.lens[f * 3 + 1], lr = C.lens[f * 3 + 2] * k;
  const [cx, cy] = P(lx, ly); H.lc = [cx, cy, lr];
  const gp = (t % 3.2) / 3.2;
  if (gp < .32) { const q = gp / .32, r = lr; ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r * .84, 0, 7); ctx.clip(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(cx, cy); ctx.rotate(-.75);
    const x = (-1.4 + 2.8 * q) * r, g = ctx.createLinearGradient(x - r * .32, 0, x + r * .32, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.5, 'rgba(255,255,255,.5)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(x - r * .32, -r * 1.3, r * .64, r * 2.6); ctx.restore(); }
  if (gp > .3 && gp < .33 && cool('flash', dt, 60)) emit({ k: 'spark', c: '#ffffff', x: cx + lr * .5, y: cy - lr * .55, vx: 0, vy: 0, s: .7 * u, max: .45, fin: .06, fout: .35, vr: 1.5 });
  if (cool('rip', dt, .6)) emit({ x: cx, y: cy, r0: lr, sc: u, max: 1.3, fin: .06, fout: .9, draw: drawRing, upd: p => { p.x = H.lc[0]; p.y = H.lc[1]; p.r0 = H.lc[2]; } });
  if (cool('tw', dt, 6)) { const a = rnd(0, 6.28), rr = lr * rnd(1.05, 1.3); emit({ k: 'spark', c: pick(['#ffe27a', '#ffffff', '#8fe3ff', '#ffb347']), x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr, vx: Math.cos(a) * 14 * u, vy: Math.sin(a) * 14 * u - 6 * u, s: rnd(.2, .38) * u, max: rnd(.5, .9), tw: 1 }); }
  if (cool('amb', dt, 1.1)) { const a = rnd(0, 6.28); emit({ k: 'dot', c: '#bfefff', x: S.pivx + Math.cos(a) * S.L.bw * .5, y: S.L.by + S.L.bh * (.45 + Math.sin(a) * .35), vx: 0, vy: -10 * u, s: rnd(.25, .4) * u, max: rnd(.8, 1.2), tw: 1 }); }
} };

window.__hero = H;
load(); kick();
})();
