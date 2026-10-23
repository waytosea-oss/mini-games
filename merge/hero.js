/* 封面主角动画：AI 生成的透明底序列帧（24fps · 120 帧无缝循环）+ 实时画布粒子
 * 与「花瓣消消」小蜜蜂、「魔法药水铺」小女巫同一套流程：WebP 精灵表（不支持时回退 PNG），
 * 精灵表就绪前先画首帧静态图占位；主角画在 #menu 内独立的小画布上，只在标题页可见时运行。 */
(function () {
'use strict';
const C = {"dir":"assets/tile/","name":"tile","nSheets":5,"fw":374,"fh":458,"cols":6,"per":24,"n":120,"fps":24,"body":[14,58,335,451],"gnd":450,"maxParts":70,"box":"mHero","z":-1,"above":"#mSub","below":"#mRoad","pad":[0.3,0.05,0.03],"sway":0.03,"bob":1.5,"shadowA":0.3,"glow":"#ffe08a","glowA":0.35,"tiles":[{"x":-0.13,"y":0.3,"w":0.2,"ph":0,"face":[1,3],"rot":-0.18},{"x":1.1,"y":0.24,"w":0.19,"ph":1.15,"face":[2,3],"rot":0.16},{"x":1.15,"y":0.7,"w":0.16,"ph":2.3,"face":[7,2],"rot":0.1}],"bot":[450,450,450,450,450,450,450,450,450,450,448,442,432,423,418,418,423,433,443,449,450,450,450,449,445,437,428,421,418,421,429,440,447,450,450,450,450,446,440,430,424,421,424,430,440,447,450,450,450,448,443,435,428,424,425,431,440,447,450,450,450,448,443,434,426,420,419,423,431,440,447,450,450,450,449,447,442,437,435,437,443,448,450,450,450,450,450,450,450,450,450,450,450,450,450,450,450,450,450,450,450,450,450,450,450,450,450,450,450,450,450,450,450,450,450,450,450,450,450,450],"ing":[200,83,200,83,200,84,200,84,199,85,199,88,197,93,197,98,198,99,201,94,203,85,205,72,205,60,203,51,198,47,193,47,188,52,183,62,180,75,180,89,182,99,187,102,192,99,198,90,202,80,203,68,203,58,201,52,198,50,193,52,189,59,186,71,186,84,188,95,193,99,198,98,202,92,204,81,205,69,204,58,202,52,197,50,192,53,187,60,183,72,181,86,181,98,185,102,191,99,197,89,202,77,206,66,208,59,208,55,206,57,203,60,191,63,187,76,183,89,190,102,191,100,193,89,194,77,195,64,194,55,192,51,190,50,188,54,186,62,184,76,185,91,188,102,192,105,197,100,200,92,203,82,205,74,205,65,202,62,199,63,196,71,194,82,192,93,190,101,189,101,189,96,190,90,190,87,191,85,195,78,200,72,205,68,207,69,206,75,203,80,202,85,201,84,202,84,202,84,202,84,202,84,202,84,201,83,201,83,201,83,201,83,201,83,201,83,200,83,200,83,200,83,200,83,200,83,200,83,200,83,200,83,200,83,200,83,200,83,200,83],"coin":[309,256,310,256,310,256,310,256,310,255,309,256,309,260,309,265,310,266,312,260,313,248,315,231,314,217,313,205,310,198,308,196,306,199,304,209,304,223,304,239,305,252,307,258,309,257,311,248,310,236,310,221,309,207,309,195,310,197,308,200,307,211,303,219,305,234,306,250,308,259,311,261,313,255,314,242,313,226,312,211,309,201,306,197,303,199,302,207,301,218,301,234,301,247,302,254,304,252,306,242,308,229,310,216,310,206,310,204,310,206,311,214,311,223,309,238,307,252,306,260,306,256,306,243,305,226,304,209,304,207,305,202,306,203,307,200,307,209,307,226,307,244,307,258,308,263,309,259,310,250,310,238,310,229,309,220,306,213,304,210,303,217,304,233,305,253,307,260,309,260,315,251,314,248,313,244,311,247,316,248,321,251,321,251,322,252,323,252,324,253,326,252,328,251,330,248,321,254,312,260,302,268,303,266,305,265,307,263,309,262,311,260,312,258,312,256,311,255,310,255,309,256,309,256,309,256,309,256,309,256,309,256,309,256,309,256,309,256,309,256]};
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
/* 白板小麻将：元宝金光上升、金币翻转闪光、两侧迷你麻将牌漂浮翻面（牌面 ↔ 翡翠牌背）并带金色流光 */
const FACES = new Image(); FACES.src = 'assets/faces.webp';
function rr(x, X, Y, w, h, r) { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath(); }
function drawTile(x, T, cx, cy, w, sx, t) {
  const h = w * 4 / 3, d = w * .14, back = sx < 0, aw = Math.max(.04, Math.abs(sx));
  x.save(); x.translate(cx, cy); x.rotate(T.rot + Math.sin(t * 1.1 + T.ph) * .08); x.scale(aw, 1);
  x.globalAlpha = .22; x.fillStyle = '#000'; rr(x, -w / 2 + 2, -h / 2 + d + 4, w, h, w * .16); x.fill(); x.globalAlpha = 1;
  x.fillStyle = '#17a85c'; rr(x, -w / 2, -h / 2 + d, w, h, w * .16); x.fill();
  if (back) { const g = x.createLinearGradient(0, -h / 2, 0, h / 2); g.addColorStop(0, '#5fe0a0'); g.addColorStop(1, '#0f8a52'); x.fillStyle = g; rr(x, -w / 2, -h / 2, w, h, w * .16); x.fill();
    x.strokeStyle = 'rgba(255,255,255,.45)'; x.lineWidth = w * .05; rr(x, -w * .34, -h * .36, w * .68, h * .72, w * .1); x.stroke(); }
  else { const g = x.createLinearGradient(0, -h / 2, 0, h / 2); g.addColorStop(0, '#fffdf4'); g.addColorStop(1, '#efe4c8'); x.fillStyle = g; rr(x, -w / 2, -h / 2, w, h, w * .16); x.fill();
    if (FACES.complete && FACES.naturalWidth) x.drawImage(FACES, T.face[0] * 120, T.face[1] * 160, 120, 160, -w * .43, -h * .42, w * .86, h * .84); }
  x.lineWidth = Math.max(1, w * .03); x.strokeStyle = 'rgba(120,90,30,.35)'; rr(x, -w / 2, -h / 2, w, h, w * .16); x.stroke();
  const sh = T.shine; if (sh > 0 && sh < 1) { x.save(); rr(x, -w / 2, -h / 2, w, h, w * .16); x.clip(); x.globalCompositeOperation = 'lighter'; const yy = (-1.2 + 2.4 * sh) * h, g = x.createLinearGradient(0, yy - h * .25, w * .3, yy + h * .25); g.addColorStop(0, 'rgba(255,215,90,0)'); g.addColorStop(.5, 'rgba(255,225,120,.75)'); g.addColorStop(1, 'rgba(255,215,90,0)'); x.fillStyle = g; x.fillRect(-w, yy - h * .3, w * 2, h * .6); x.restore(); }
  x.restore();
}
const THEME = {
  back(S) { this.tiles(S, 0); },
  tiles(S, front) {
    const { t, L, u } = S;
    for (const T of C.tiles) { if (!!T.front !== !!front) continue;
      const per = 3.4, q = ((t + T.ph) % per) / per, fl = q < .22 ? q / .22 : 0;
      const ang = fl ? (fl < .5 ? 2 * fl * fl : 1 - Math.pow(-2 * fl + 2, 2) / 2) * Math.PI * 2 : 0;
      T.shine = q > .2 && q < .42 ? (q - .2) / .22 : -1;
      const cx = L.bx + T.x * L.bw, cy = L.by + T.y * L.bh + Math.sin(t * 1.4 + T.ph * 2) * 4 * u - (fl ? Math.sin(fl * Math.PI) * 10 * u : 0);
      drawTile(ctx, T, cx, cy, T.w * L.bw, Math.cos(ang), t);
      const key = 'tf' + T.face; if (q > .2 && q < .24 && !T.burst) { T.burst = 1; for (let i = 0; i < 5; i++) { const a = rnd(0, 6.28); emit({ k: 'spark', c: pick(['#ffd54a', '#fff2a8', '#ffffff']), x: cx + Math.cos(a) * T.w * L.bw * .55, y: cy + Math.sin(a) * T.w * L.bw * .7, vx: Math.cos(a) * 22 * u, vy: Math.sin(a) * 22 * u, s: rnd(.22, .36) * u, max: rnd(.45, .7), tw: 1 }); } } else if (q > .5) T.burst = 0;
    }
  },
  front(S) {
    const { f, dt, u, P } = S;
    this.tiles(S, 1);
    const [ix, iy] = P(C.ing[f * 2], C.ing[f * 2 + 1]), [kx, ky] = P(C.coin[f * 2], C.coin[f * 2 + 1]);
    if (cool('ing', dt, 4)) emit({ k: pick(['star', 'spark', 'spark']), c: pick(['#ffd54a', '#ffe68a', '#fff4c2', '#ffb938']), x: ix + rnd(-26, 26) * u, y: iy + rnd(-8, 6) * u, vx: rnd(-8, 8) * u, vy: rnd(-38, -22) * u, drag: .4, wob: 8 * u, s: rnd(.22, .4) * u, max: rnd(.8, 1.3), vr: rnd(-1.5, 1.5), tw: 1 });
    const kv = H.pk ? Math.hypot(kx - H.pk[0], ky - H.pk[1]) / Math.max(dt, .001) : 0; H.pk = [kx, ky];
    if ((kv > 70 * u ? cool('coinF', dt, 9) : cool('coin', dt, 1.2))) emit({ k: 'spark', c: pick(['#ffe27a', '#ffffff', '#ffc93c']), x: kx + rnd(-8, 8) * u, y: ky + rnd(-8, 8) * u, vx: rnd(-10, 10) * u, vy: rnd(-16, -4) * u, s: rnd(.25, .45) * u, max: rnd(.4, .7), tw: 1, vr: 2 });
  }
};

window.__hero = H;
load(); kick();
})();
