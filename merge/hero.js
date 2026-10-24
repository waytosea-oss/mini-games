/* 封面主角「小星星」：纯画布实时绘制的临时动画吉祥物（无外部图片）。
 * 圆润五角星身体 + 眨眼 + 弹跳挤压 + 环绕小行星与星尘；只在标题页可见时运行。 */
(function () {
'use strict';
const $ = id => document.getElementById(id);
const menu = $('menu'), box = $('mHero');
if (!menu || !box) return;
const cv = document.createElement('canvas'); cv.setAttribute('aria-hidden', 'true');
cv.style.cssText = 'display:block;width:100%;height:100%;visibility:visible;pointer-events:none';
box.appendChild(cv);
const ctx = cv.getContext('2d');
const TAU = Math.PI * 2, rnd = (a, b) => a + Math.random() * (b - a);
let W = 0, H = 0, DPR = 1, t = 0, last = 0, raf = 0, blinkAt = 2;
const dust = [];
function size() {
  DPR = Math.min(2, window.devicePixelRatio || 1);
  W = box.clientWidth; H = box.clientHeight; if (!W || !H) return false;
  if (cv.width !== Math.round(W * DPR)) { cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR); }
  return true;
}
function star(x, cx, cy, ro, ri, rot) { x.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? ri : ro, a = rot - Math.PI / 2 + i * Math.PI / 5; x.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } x.closePath(); }
function spark(x, cx, cy, r) { x.beginPath(); for (let i = 0; i < 8; i++) { const a = -Math.PI / 2 + i * Math.PI / 4, q = i % 2 ? r * .28 : r; x.lineTo(cx + Math.cos(a) * q, cy + Math.sin(a) * q); } x.closePath(); }
function draw(dt) {
  t += dt; const x = ctx; x.setTransform(DPR, 0, 0, DPR, 0, 0); x.clearRect(0, 0, W, H);
  const u = Math.min(W, H / 1.22), cx = W / 2, gy = H * .93;
  // 弹跳：每 1.8 秒一跳，落地挤压
  const ph = (t % 1.8) / 1.8; let hop = 0, sq = 0;
  if (ph < .5) { const q = ph / .5; hop = Math.sin(q * Math.PI) * u * .12; sq = q < .12 ? (1 - q / .12) * .1 : 0; } else { const q = (ph - .5) / .5; sq = q < .15 ? Math.sin(q / .15 * Math.PI) * .12 : 0; hop = Math.sin(q * TAU) * u * .006; }
  const R = u * .4, cy = gy - R * 1.02 - hop;
  // 背光
  let g = x.createRadialGradient(cx, cy, R * .2, cx, cy, Math.min(R * 1.9, W / 2, cy)); g.addColorStop(0, 'rgba(255,226,140,.45)'); g.addColorStop(1, 'rgba(255,226,140,0)'); x.fillStyle = g; x.fillRect(0, 0, W, H);
  // 地面投影
  x.fillStyle = `rgba(10,4,40,${.35 - hop / u})`; x.beginPath(); x.ellipse(cx, gy, R * (.8 - hop / u), R * .13, 0, 0, TAU); x.fill();
  // 环绕小行星（身后半圈）
  const oa = t * 1.3; const orb = (front) => { const a = oa, px = cx + Math.cos(a) * R * 1.35, py = cy - R * .1 + Math.sin(a) * R * .35; if ((Math.sin(a) > 0) !== front) return;
    x.save(); x.translate(px, py); const r = R * .16; g = x.createRadialGradient(-r * .3, -r * .3, r * .1, 0, 0, r); g.addColorStop(0, '#e6d2ff'); g.addColorStop(1, '#7a4ae0'); x.fillStyle = g; x.beginPath(); x.arc(0, 0, r, 0, TAU); x.fill();
    x.strokeStyle = '#ffd6f0'; x.lineWidth = r * .25; x.beginPath(); x.ellipse(0, 0, r * 1.7, r * .5, -.4, 0, TAU); x.stroke(); x.restore(); };
  orb(false);
  // 身体
  x.save(); x.translate(cx, cy + R * .05); x.rotate(Math.sin(t * 2.2) * .07); x.scale(1 + sq, 1 - sq);
  x.lineJoin = 'round';
  star(x, 0, 0, R, R * .55, 0); x.strokeStyle = '#7a3c08'; x.lineWidth = R * .34; x.stroke();
  g = x.createLinearGradient(0, -R, 0, R); g.addColorStop(0, '#fff6b8'); g.addColorStop(.45, '#ffd23f'); g.addColorStop(1, '#f29a0e');
  star(x, 0, 0, R, R * .55, 0); x.strokeStyle = g; x.lineWidth = R * .2; x.stroke(); x.fillStyle = g; x.fill();
  x.fillStyle = 'rgba(255,255,255,.6)'; x.beginPath(); x.ellipse(-R * .2, -R * .42, R * .2, R * .09, -.5, 0, TAU); x.fill();
  // 脸
  const bl = t > blinkAt ? Math.max(.08, Math.abs(Math.cos((t - blinkAt) * 18))) : 1; if (t > blinkAt + .18) blinkAt = t + rnd(2, 4);
  for (const s of [-1, 1]) { x.fillStyle = '#2a1608'; x.beginPath(); x.ellipse(s * R * .2, R * .02, R * .075, R * .11 * bl, 0, 0, TAU); x.fill();
    if (bl > .5) { x.fillStyle = '#fff'; x.beginPath(); x.arc(s * R * .2 + R * .025, -R * .03, R * .03, 0, TAU); x.fill(); }
    x.fillStyle = 'rgba(255,110,130,.55)'; x.beginPath(); x.ellipse(s * R * .36, R * .17, R * .085, R * .05, 0, 0, TAU); x.fill(); }
  x.strokeStyle = '#2a1608'; x.lineWidth = R * .045; x.lineCap = 'round'; x.beginPath(); x.arc(0, R * .13, R * .09, .2, Math.PI - .2); x.stroke();
  x.restore();
  orb(true);
  // 星尘：从身边飘起
  if (Math.random() < dt * 9 && dust.length < 40) dust.push({ x: cx + rnd(-R, R), y: cy + rnd(-R * .4, R * .6), vy: -rnd(12, 30), life: 0, max: rnd(1.2, 2.2), r: rnd(2, 5), c: ['#fff6c8', '#d9ccff', '#ffd1f0', '#ffffff'][(Math.random() * 4) | 0] });
  for (let i = dust.length - 1; i >= 0; i--) { const d = dust[i]; d.life += dt; if (d.life > d.max) { dust.splice(i, 1); continue; } d.y += d.vy * dt; const a = Math.sin(d.life / d.max * Math.PI);
    x.globalAlpha = a; x.fillStyle = d.c; spark(x, d.x, d.y, d.r * (.7 + .3 * Math.sin(d.life * 9))); x.fill(); }
  x.globalAlpha = 1;
}
function visible() { return menu.classList.contains('on') && !document.hidden; }
function loop(ts) { raf = 0; if (!visible()) return; const dt = last ? Math.min(.05, (ts - last) / 1000) : 0; last = ts; if (size()) draw(dt); raf = requestAnimationFrame(loop); }
function kick() { if (!raf && visible()) { last = 0; raf = requestAnimationFrame(loop); } }
new MutationObserver(kick).observe(menu, { attributes: true, attributeFilter: ['class'] });
document.addEventListener('visibilitychange', kick); window.addEventListener('resize', kick);
window.__hero = { draw: (dt) => { if (size()) draw(dt); } };
kick();
})();
