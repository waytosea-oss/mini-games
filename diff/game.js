/* ===== 火眼金睛 · 经典找茬 ===== */
(() => {
'use strict';
const $ = id => document.getElementById(id);
const Q = new URLSearchParams(location.search);
const DBG = { level: +Q.get('level') || 0, bot: Q.has('bot'), unlock: Q.has('unlock') };
const IW = 1152, IH = 864, MAX_H = 5; let TOTAL_T = 300;
const LV = window.LEVELS, CHS = window.POOLS;
const bid = i => (LV[i] && LV[i].b) || i + 1; // 31–60 题复用 1–30 题原图（b=原图编号），只换 5 处更细微的改动
/* ---------- 星级题库：同档随机抽图，抽完一轮才重复 ---------- */
const BAND_START = []; { let a = 0; CHS.forEach(b => { BAND_START.push(a); a += b.slots; }); }
const NSLOT = CHS.reduce((a, b) => a + b.slots, 0);
/* ---------- 图标 ---------- */
const IC = {
  music: '<svg class="i" viewBox="0 0 24 24"><path fill="currentColor" d="M9 18.5a3 3 0 1 1-2-2.83V5l12-2v12.5a3 3 0 1 1-2-2.83V7.1L9 8.6z"/></svg>',
  sfx: '<svg class="i" viewBox="0 0 24 24"><path fill="currentColor" d="M3 9h4l5-4v14l-5-4H3z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round"/></svg>',
  pause: '<svg class="i" viewBox="0 0 24 24"><rect x="6" y="5" width="4.2" height="14" rx="1.6" fill="currentColor"/><rect x="13.8" y="5" width="4.2" height="14" rx="1.6" fill="currentColor"/></svg>',
  zoom: '<svg viewBox="0 0 24 24"><circle cx="10" cy="10" r="6.2" fill="#e8f6ff" stroke="currentColor" stroke-width="2.6"/><path d="M14.6 14.6l5.4 5.4" stroke="#e0201a" stroke-width="3.6" stroke-linecap="round"/><path d="M7.2 8.4a3.4 3.4 0 0 1 2.4-2" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/></svg>',
  zoomout: '<svg viewBox="0 0 24 24"><circle cx="10" cy="10" r="6.2" fill="#e8f6ff" stroke="currentColor" stroke-width="2.6"/><path d="M14.6 14.6l5.4 5.4" stroke="#e0201a" stroke-width="3.6" stroke-linecap="round"/><path d="M7 10h6" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
  bulb: '<svg viewBox="0 0 24 24"><path d="M12 2.5a6.8 6.8 0 0 0-4 12.3c.7.5 1 1.2 1 2V18h6v-1.2c0-.8.4-1.5 1-2A6.8 6.8 0 0 0 12 2.5z" fill="#fff6a0" stroke="#a65a00" stroke-width="1.8"/><rect x="9" y="18.6" width="6" height="2.6" rx="1.2" fill="#8a8fa8"/><path d="M9.5 7.5a3.2 3.2 0 0 1 2.5-1.6" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/></svg>',
  clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="8.4" fill="#fff" stroke="currentColor" stroke-width="2.4"/><path d="M12 8.5V13l3 2" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" fill="none"/><rect x="9.5" y="1.8" width="5" height="2.6" rx="1" fill="currentColor"/></svg>',
  heart: '<svg viewBox="0 0 24 24"><path d="M12 21s-7.8-4.7-9.6-9.7C1.2 7.9 3.5 4.5 7 4.5c2.1 0 3.6 1.2 5 3 1.4-1.8 2.9-3 5-3 3.5 0 5.8 3.4 4.6 6.8C19.8 16.3 12 21 12 21z" fill="#ff3d5a" stroke="#fff" stroke-width="1.8"/><path d="M6.5 8.2c.6-1 1.5-1.5 2.4-1.5" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".85"/></svg>',
  heartOff: '<svg viewBox="0 0 24 24"><path d="M12 21s-7.8-4.7-9.6-9.7C1.2 7.9 3.5 4.5 7 4.5c2.1 0 3.6 1.2 5 3 1.4-1.8 2.9-3 5-3 3.5 0 5.8 3.4 4.6 6.8C19.8 16.3 12 21 12 21z" fill="rgba(0,0,0,.28)" stroke="rgba(255,255,255,.6)" stroke-width="1.6"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" stroke="#fff" stroke-width="3.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  x: '<svg viewBox="0 0 44 44"><path d="M10 10l24 24M34 10L10 34" stroke="#fff" stroke-width="11" stroke-linecap="round"/><path d="M10 10l24 24M34 10L10 34" stroke="#ff2d3a" stroke-width="6.5" stroke-linecap="round"/></svg>',
  hand: '<svg viewBox="0 0 64 64"><path d="M24 6c3 0 5 2 5 5v17l3-1c2.6-.6 4.8.6 5.4 2.6l.4 1.4 2.6-.6c2.6-.5 4.6.8 5.2 2.9l.3 1 2-.4c3-.5 5.6 1.4 5.6 4.6V48c0 6-5 11-11 11H34c-4 0-7-2-9-5L14 38c-1.6-2.4-1-5.2 1.2-6.6 2.2-1.4 4.6-.8 6 1l2.8 3.6V11c0-3 0 0 0 0z" fill="#ffe0c2" stroke="#7a3a10" stroke-width="3" stroke-linejoin="round"/><path d="M19 11a5 5 0 0 1 10 0" stroke="#7a3a10" stroke-width="3" fill="none"/></svg>',
  timeup: '<svg viewBox="0 0 84 84"><circle cx="42" cy="46" r="32" fill="#fff" stroke="#e0402e" stroke-width="6"/><path d="M42 26v20l12 8" stroke="#e0402e" stroke-width="6" stroke-linecap="round" fill="none"/><rect x="33" y="4" width="18" height="9" rx="3" fill="#e0402e"/></svg>',
  broken: '<svg viewBox="0 0 84 84"><path d="M42 76S12 58 6 38C2 24 11 10 25 10c8 0 13 5 17 11 4-6 9-11 17-11 14 0 23 14 19 28-6 20-36 38-36 38z" fill="#ff3d5a" stroke="#fff" stroke-width="4"/><path d="M42 21l-6 14 10 8-8 14 4 12" stroke="#fff" stroke-width="5" fill="none" stroke-linejoin="round"/></svg>'
};
/* ---------- 存档 ---------- */
const SKEY = 'hyjj_save_v1';
let SV = { unlocked: 1, stars: {}, best: {}, hints: 3, music: true, sfx: true, tut: false, h3: {}, seen: {}, pick: {} };
try { Object.assign(SV, JSON.parse(localStorage.getItem(SKEY) || '{}')); } catch (e) { }
const save = () => { try { localStorage.setItem(SKEY, JSON.stringify(SV)); } catch (e) { } };
if (!SV.seen || typeof SV.seen !== 'object') SV.seen = {}; if (!SV.pick || typeof SV.pick !== 'object') SV.pick = {};
// 抽图：从该档未看过的图里随机取一张；本档全看过后清空重来（避开刚玩过的那张）
function drawImg(band) {
  const ids = CHS[band].ids, seen = (SV.seen[band] || []).filter(x => ids.includes(x));
  let left = ids.filter(x => !seen.includes(x));
  if (!left.length) { const last = seen[seen.length - 1]; SV.seen[band] = []; left = ids.filter(x => x !== last); if (!left.length) left = ids.slice(); }
  const id = Q.get('img') && ids.includes(+Q.get('img')) ? +Q.get('img') : left[Math.floor(Math.random() * left.length)];
  (SV.seen[band] = SV.seen[band] || []).push(id); save(); return id;
}
if (DBG.unlock) SV.unlocked = NSLOT;
/* ---------- 通用 ---------- */
let curScr = 'load';
function show(id) {
  document.querySelectorAll('.scr').forEach(s => { if (s.id !== id) s.classList.remove('on'); });
  $(id).classList.add('on'); curScr = id;
}
let toastT = 0;
function toast(msg, ms = 1500) { const t = $('toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), ms); }
let userAct = false; document.addEventListener('pointerdown', e => { if (e.isTrusted) userAct = true; }, true);
const vib = ms => { if (!userAct) return; try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { } };
let audioOK = false;
function firstTouch() { if (audioOK) return; audioOK = true; SND.unlock(); SND.setMusic(SV.music); SND.setSfx(SV.sfx); SND.startMusic(); }
document.addEventListener('pointerdown', firstTouch, true);
document.addEventListener('touchend', firstTouch, true);
function tap(el, fn) { el.addEventListener('click', e => { e.stopPropagation(); firstTouch(); SND.play('click'); fn(e); }); }
function setToggles() {
  for (const id of ['mMusic', 'pMusic']) { $(id).innerHTML = IC.music; $(id).classList.toggle('off', !SV.music); }
  for (const id of ['mSfx', 'pSfx']) { $(id).innerHTML = IC.sfx; $(id).classList.toggle('off', !SV.sfx); }
}
const togM = () => { SV.music = !SV.music; try{GT.sound('music',SV.music)}catch(_e){} SND.setMusic(SV.music); save(); setToggles(); };
const togS = () => { SV.sfx = !SV.sfx; try{GT.sound('sfx',SV.sfx)}catch(_e){} SND.setSfx(SV.sfx); save(); setToggles(); };
['mMusic', 'pMusic'].forEach(i => tap($(i), togM)); ['mSfx', 'pSfx'].forEach(i => tap($(i), togS));
$('gPause').innerHTML = IC.pause;
$('tZoom').querySelector('.ico').outerHTML = IC.zoom;
$('tHint').querySelector('.ico').outerHTML = IC.bulb;
$('hand').innerHTML = IC.hand;
const pad = n => String(n).padStart(2, '0');
const chOf = i => { let b = 0; while (b + 1 < CHS.length && i >= BAND_START[b + 1]) b++; return b; };
const totalStars = () => Object.values(SV.stars).reduce((a, b) => a + b, 0);
/* ---------- 加载 ---------- */
function loadImg(src) { return new Promise(r => { const im = new Image(); im.onload = () => r(im); im.onerror = () => r(im); im.src = src; }); }
async function boot() {
  const list = ['assets/logo.webp', ...LV.map((_, i) => `assets/th/${pad(bid(i))}.webp`)];
  let n = 0;
  await Promise.all(list.map(s => loadImg(s).then(() => { n++; $('lbar').style.width = (n / list.length * 100) + '%'; })));
  // 背景马赛克
  const ms = $('mosaic'); let h = '';
  const order = [3, 18, 25, 9, 14, 0, 21, 27, 6, 12, 23, 29, 1, 16, 19, 10, 28, 4];
  for (let k = 0; k < 2; k++) for (const i of order) h += `<img src="assets/th/${pad(bid(i))}.webp" alt="">`;
  ms.innerHTML = h;
  setToggles();
  if (DBG.level) { startLevel(Math.min(NSLOT, DBG.level) - 1); return; }
  showMenu();
}
function showMenu() {
  show('menu');
  const st = totalStars();
  G.next = 1; while (G.next < SV.unlocked && SV.stars[G.next]) G.next++;
  $('mStat').textContent = `已获得 ★ ${st} / ${NSLOT * 3}　·　提示 ${SV.hints} 次`;
  $('bPlay').textContent = totalStars() > 0 ? `继续 · 第${G.next}关` : '开始游戏';
}
tap($('bPlay'), () => { try{GT.title('play')}catch(_e){} startLevel((G.next || 1) - 1); });
tap($('bLevels'), () => { try{GT.title('levels')}catch(_e){} showLevels(); });
tap($('lvBack'), showMenu);
/* ---------- 选关 ---------- */
function showLevels() {
  show('levels');
  $('lvTot').textContent = `★ ${totalStars()} / ${NSLOT * 3}`;
  let h = '';
  CHS.forEach((c, ci) => {
    const b0 = BAND_START[ci]; let got = 0; for (let k = 0; k < c.slots; k++) got += SV.stars[b0 + k + 1] || 0;
    h += `<div class="chap"><span class="cb" style="background:linear-gradient(${c.c[0]},${c.c[1]})">${c.n}</span><small>★ ${got}/${c.slots * 3}　·　题库 ${c.ids.length} 张随机出题</small></div><div class="lvgrid">`;
    for (let k = 0; k < c.slots; k++) {
      const i = b0 + k, id = i + 1, lock = id > SV.unlocked, s = SV.stars[id] || 0, pk = SV.pick[id];
      h += `<div class="lv${lock ? ' lock' : ''}${id === SV.unlocked && !SV.stars[id] ? ' cur' : ''}" data-i="${i}">${pk ? `<img src="assets/th/${pad(bid(pk - 1))}.webp" alt="">` : `<span class="mys" style="background:linear-gradient(${c.c[0]},${c.c[1]})">?</span>`}<span class="no">${id}</span><div class="st">${[0, 1, 2].map(j => `<i class="${j < s ? 'on' : ''}"></i>`).join('')}</div></div>`;
    }
    h += '</div>';
  });
  $('lvList').innerHTML = h;
  $('lvList').querySelectorAll('.lv').forEach(el => tap(el, () => {
    const i = +el.dataset.i;
    if (i + 1 > SV.unlocked) { toast('先通过前一关才能解锁哦'); return; }
    startLevel(i);
  }));
  const cur = $('lvList').querySelector('.lv.cur'); if (cur) setTimeout(() => cur.scrollIntoView({ block: 'center' }), 30);
}
/* ---------- 游戏状态 ---------- */
const G = { i: 0, lv: null, found: [], miss: 0, hearts: MAX_H, t: TOTAL_T, run: false, pause: false, lock: 0, z: { s: 1, x: 0, y: 0 }, W: 0, H: 0, hintEls: [], lastFound: 0, combo: 0, loaded: false, token: 0 };
const paneA = $('paneA'), paneB = $('paneB'), stA = $('stA'), stB = $('stB');
function layout() {
  const vw = innerWidth, vh = innerHeight;
  const hud = $('hud').offsetHeight || 64, tools = $('tools').offsetHeight || 64, strip = 40;
  const avail = vh - hud - tools - strip - 8;
  let W = Math.min(vw - 14, 560), H = W * 0.75;
  if (H * 2 > avail) { H = Math.floor(avail / 2); W = Math.floor(H * 4 / 3); }
  W = Math.floor(W); H = Math.floor(W * 0.75);
  G.W = W - 6; G.H = H - 6; // 去掉边框
  for (const p of [paneA, paneB]) { p.style.width = W + 'px'; p.style.height = H + 'px'; }
  clampZ(); applyZ();
}
addEventListener('resize', () => { if (curScr === 'game' || $('game').classList.contains('on')) layout(); });
function buildStage(st, lv, idx, withB) {
  const L = LV[idx]; let h = `<img class="base" src="assets/lv/${pad(bid(idx))}a.webp" alt="">`;
  if (withB) L.d.forEach((d, k) => { h += `<img src="assets/lv/${pad(idx + 1)}p${k}.webp" alt="" style="left:${d.p[0] / IW * 100}%;top:${d.p[1] / IH * 100}%;width:${d.s[0] / IW * 100}%;height:${d.s[1] / IH * 100}%">`; });
  h += `<svg class="ov" viewBox="0 0 ${IW} ${IH}" preserveAspectRatio="none"></svg>`;
  st.innerHTML = h; return st.querySelector('svg');
}
const ringR = d => Math.max(d.r * IW, 30) + 8;
function drawRing(svg, d, anim, k) {
  const R = ringR(d), cx = d.x * IW, cy = d.y * IH, C = 2 * Math.PI * R;
  const ns = 'http://www.w3.org/2000/svg';
  const g = document.createElementNS(ns, 'g');
  const mk = (col, w) => { const c = document.createElementNS(ns, 'circle'); c.setAttribute('cx', cx); c.setAttribute('cy', cy); c.setAttribute('r', R); c.setAttribute('class', 'ring' + (anim ? ' draw' : '')); c.setAttribute('stroke', col); c.setAttribute('stroke-width', w); if (anim) { c.style.strokeDasharray = C; c.style.strokeDashoffset = C; } c.setAttribute('transform', `rotate(-90 ${cx} ${cy})`); g.appendChild(c); };
  mk('#ffffff', 15); mk('#1fbf4a', 8.5);
  svg.appendChild(g);
}
function setHearts(lostIdx) {
  let h = ''; for (let k = 0; k < MAX_H; k++) h += k < G.hearts ? IC.heart : IC.heartOff;
  $('gHearts').innerHTML = h;
  if (lostIdx !== undefined) { const s = $('gHearts').children[lostIdx]; if (s) { s.innerHTML; s.classList.add('lost'); } }
}
function setQs() {
  let h = ''; for (let k = 0; k < 5; k++) h += k < G.found.length ? `<div class="q ok">${IC.check}</div>` : '<div class="q">？</div>';
  $('qs').innerHTML = h; $('gFound').textContent = G.found.length;
  // 只让最新一个播放弹出动画
  $('qs').querySelectorAll('.q.ok').forEach((q, k) => { if (k !== G.found.length - 1 || !G._qanim) q.style.animation = 'none'; });
  G._qanim = false;
}
function setHint() { $('hintN').textContent = SV.hints; $('tHint').classList.toggle('empty', SV.hints <= 0); }
function fmt(t) { t = Math.max(0, Math.ceil(t)); return Math.floor(t / 60) + ':' + pad(t % 60); }
function setTimer() { const el = $('gTimer'); el.innerHTML = IC.clock + '<span>' + fmt(G.t) + '</span>'; el.classList.toggle('warn', G.t <= 30); }
async function startLevel(i, keep) {
  G.token++; const tok = G.token;
  const band = chOf(i), BD = CHS[band];
  // 重玩同一关沿用同一张图；新开一关从题库随机抽
  const img = (keep && G.i === i && G.img) ? G.img : drawImg(band);
  G.img = img; SV.pick[i + 1] = img; save();
  TOTAL_T = BD.time; G.band = band;
  G.i = i; G.lv = LV[img - 1]; G.found = []; G.miss = 0; G.hearts = MAX_H; G.t = TOTAL_T; G.run = false; G.pause = false; G.lock = 0; G.combo = 0; G.lastFound = 0; G.z = { s: 1, x: 0, y: 0 }; G.hintEls = []; G.hintUsed = 0;
  ['pause', 'win', 'fail', 'menu', 'levels', 'load'].forEach(s => $(s).classList.remove('on'));
  const g = $('game'); g.classList.add('on'); curScr = 'game';
  const c = CHS[chOf(i)].c; g.style.background = `radial-gradient(ellipse at 50% 0%, ${c[0]} 0%, ${c[1]} 70%, ${shade(c[1])} 100%)`;
  $('gName').textContent = `第${i + 1}关 · ${G.lv.n}`;
  setHearts(); setQs(); setHint(); setTimer(); $('tZoom').classList.remove('on'); $('tZoom').querySelector('svg').outerHTML = IC.zoom; $('tZoom').querySelector('.lb').textContent = '放大';
  layout();
  G.svgA = buildStage(stA, G.lv, img - 1, false); G.svgB = buildStage(stB, G.lv, img - 1, true);
  applyZ();
  // 等待图片
  const spins = [paneA, paneB].map(p => { const s = document.createElement('div'); s.className = 'spin'; p.appendChild(s); return s; });
  const imgs = [...stA.querySelectorAll('img'), ...stB.querySelectorAll('img')];
  await Promise.all(imgs.map(im => im.complete ? 0 : new Promise(r => { im.onload = im.onerror = r; })));
  spins.forEach(s => s.remove());
  if (tok !== G.token) return;
  G.run = true; G.lastTick = performance.now(); try{GT.lv(i+1,{img:img,pool:band+1})}catch(_e){}
  if (i === 0 && !SV.tut && !DBG.bot) showTut();
  if (DBG.bot) runBot(tok);
  // 预载下一关
}
function shade(hex) { const n = parseInt(hex.slice(1), 16); const r = (n >> 16) * .55 | 0, g = ((n >> 8) & 255) * .55 | 0, b = (n & 255) * .55 | 0; return `rgb(${r},${g},${b})`; }
/* ---------- 教程 ---------- */
function showTut() {
  const t = $('tut'); t.classList.add('on');
  const rb = paneB.getBoundingClientRect(), ra = paneA.getBoundingClientRect();
  const box = t.querySelector('.tutbox'); box.style.top = (rb.top + 10) + 'px';
  // 指向第一个（最大的）不同
  const d = [...G.lv.d].sort((a, b) => b.r - a.r)[0];
  const hx = ra.left + 3 + d.x * G.W, hy = ra.top + 3 + d.y * G.H;
  const hd = $('hand'); hd.style.left = hx + 'px'; hd.style.top = hy + 'px';
}
function hideTut() { if ($('tut').classList.contains('on')) { $('tut').classList.remove('on'); SV.tut = true; save(); } }
/* ---------- 缩放/平移 ---------- */
function clampZ() {
  const z = G.z; z.s = Math.max(1, Math.min(4, z.s));
  z.x = Math.min(0, Math.max(G.W - G.W * z.s, z.x)); z.y = Math.min(0, Math.max(G.H - G.H * z.s, z.y));
}
function applyZ() { const z = G.z, tr = `translate3d(${z.x}px,${z.y}px,0) scale(${z.s})`; stA.style.transform = tr; stB.style.transform = tr; }
function zoomTo(s, px, py, anim) {
  const z = G.z, u = (px - z.x) / z.s, v = (py - z.y) / z.s;
  z.s = s; z.x = px - u * s; z.y = py - v * s; clampZ();
  if (anim) { for (const st of [stA, stB]) { st.style.transition = 'transform .32s cubic-bezier(.2,.8,.3,1)'; setTimeout(() => st.style.transition = '', 340); } }
  applyZ();
  const on = G.z.s > 1.05; $('tZoom').classList.toggle('on', on); $('tZoom').querySelector('svg').outerHTML = on ? IC.zoomout : IC.zoom; $('tZoom').querySelector('.lb').textContent = on ? '还原' : '放大';
}
tap($('tZoom'), () => {
  if (!G.run) return;
  if (G.z.s > 1.05) { zoomTo(1, G.W / 2, G.H / 2, true); SND.play('zoom', false); }
  else { const h = G.hintEls[0] && G.lv.d[G.hintEls[0].k]; zoomTo(2.2, h ? h.x * G.W : G.W / 2, h ? h.y * G.H : G.H / 2, true); if (h) { const z = G.z; z.x = G.W / 2 - h.x * G.W * z.s; z.y = G.H / 2 - h.y * G.H * z.s; clampZ(); applyZ(); } SND.play('zoom', true); toast('拖动可移动画面，双指可缩放', 1300); }
});
const ptrs = new Map(); let gest = null;
function local(pane, e) { const r = pane.getBoundingClientRect(); return { x: e.clientX - r.left - 3, y: e.clientY - r.top - 3 }; }
for (const pane of [paneA, paneB]) {
  pane.addEventListener('pointerdown', e => {
    e.preventDefault(); firstTouch(); hideTut();
    try { pane.setPointerCapture(e.pointerId); } catch (er) { }
    const p = local(pane, e); ptrs.set(e.pointerId, { ...p, pane, t: performance.now(), sx: p.x, sy: p.y });
    if (ptrs.size === 1) gest = { type: 'tap', id: e.pointerId, z0: { ...G.z }, moved: false };
    else if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; gest = { type: 'pinch', d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, m0: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, z0: { ...G.z } }; }
  });
  pane.addEventListener('pointermove', e => {
    const P = ptrs.get(e.pointerId); if (!P || !gest) return;
    const p = local(P.pane, e); P.x = p.x; P.y = p.y;
    if (gest.type === 'tap' || gest.type === 'pan') {
      const dx = p.x - P.sx, dy = p.y - P.sy;
      if (!gest.moved && Math.hypot(dx, dy) > 9) { gest.moved = true; gest.type = 'pan'; }
      if (gest.type === 'pan' && G.z.s > 1) { G.z.x = gest.z0.x + dx; G.z.y = gest.z0.y + dy; clampZ(); applyZ(); }
    } else if (gest.type === 'pinch' && ptrs.size >= 2) {
      const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y), m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const s = Math.max(1, Math.min(4, gest.z0.s * d / gest.d0));
      const u = (gest.m0.x - gest.z0.x) / gest.z0.s, v = (gest.m0.y - gest.z0.y) / gest.z0.s;
      G.z.s = s; G.z.x = m.x - u * s; G.z.y = m.y - v * s; clampZ(); applyZ();
      const on = G.z.s > 1.05; $('tZoom').classList.toggle('on', on);
    }
  });
  const end = e => {
    const P = ptrs.get(e.pointerId); if (!P) return; ptrs.delete(e.pointerId);
    if (gest && gest.type === 'tap' && gest.id === e.pointerId && e.type === 'pointerup' && performance.now() - P.t < 600) guess(P.pane, P.sx, P.sy);
    if (ptrs.size === 0) { if (gest && gest.type === 'pinch') { const on = G.z.s > 1.05; $('tZoom').querySelector('svg').outerHTML = on ? IC.zoomout : IC.zoom; $('tZoom').querySelector('.lb').textContent = on ? '还原' : '放大'; } gest = null; }
    else if (gest && gest.type === 'pinch') { gest = { type: 'pan-after', z0: { ...G.z } }; }
  };
  pane.addEventListener('pointerup', end); pane.addEventListener('pointercancel', end);
}
/* ---------- 判定 ---------- */
function guess(pane, x, y) {
  if (!G.run || G.pause) return;
  const now = performance.now(); if (now < G.lock) return;
  const z = G.z, u = (x - z.x) / z.s / G.W, v = (y - z.y) / z.s / G.H;
  if (u < 0 || u > 1 || v < 0 || v > 1) return;
  let best = -1, bs = 1e9;
  G.lv.d.forEach((d, k) => {
    if (G.found.includes(k)) return;
    const dist = Math.hypot((u - d.x) * G.W, (v - d.y) * G.H) * z.s;
    const rr = Math.max(d.r * G.W, 15) * z.s + 11;
    if (dist <= rr && dist / rr < bs) { bs = dist / rr; best = k; }
  });
  // 点到已找到的地方：忽略
  if (best < 0) {
    const onFound = G.found.some(k => { const d = G.lv.d[k]; return Math.hypot((u - d.x) * G.W, (v - d.y) * G.H) * z.s <= Math.max(d.r * G.W, 15) * z.s + 11; });
    if (onFound) return;
    wrong(pane, x, y); return;
  }
  found(best);
}
function screenPt(pane, d) { const r = pane.getBoundingClientRect(), z = G.z; return { x: r.left + 3 + z.x + d.x * G.W * z.s, y: r.top + 3 + z.y + d.y * G.H * z.s }; }
function found(k) {
  const d = G.lv.d[k]; G.found.push(k); G._qanim = true;
  clearHint(k);
  drawRing(G.svgA, d, true, k); drawRing(G.svgB, d, true, k);
  SND.play('found', G.found.length - 1); vib(18);
  for (const p of [paneA, paneB]) { const s = screenPt(p, d); burst(s.x, s.y, 16); }
  const now = performance.now();
  if (G.lastFound && now - G.lastFound < 5000) { G.combo++; } else G.combo = 0;
  G.lastFound = now;
  const sb = screenPt(paneB, d);
  const words = ['找到啦！', '好眼力！', '太棒了！', '厉害！', '火眼金睛！'];
  popText(G.combo > 0 ? `连击 ×${G.combo + 1}` : words[Math.min(G.found.length - 1, 4)], sb.x, sb.y - 20, G.combo > 0 ? '#ffe14a' : '#fff');
  if (G.combo > 0) setTimeout(() => SND.play('combo', G.combo * 2), 120);
  setQs();
  if (G.found.length >= G.lv.d.length) { G.run = false; setTimeout(winLevel, 1100); }
}
function wrong(pane, x, y) {
  G.lock = performance.now() + 450;
  G.miss++; G.hearts--; const lostIdx = G.hearts;
  const xm = document.createElement('div'); xm.className = 'xmark'; xm.innerHTML = IC.x; xm.style.left = (x + 3) + 'px'; xm.style.top = (y + 3) + 'px'; pane.appendChild(xm); setTimeout(() => xm.remove(), 720);
  // 另一张图同位置也闪一个
  const other = pane === paneA ? paneB : paneA; const x2 = xm.cloneNode(true); x2.style.opacity = .55; other.appendChild(x2); setTimeout(() => x2.remove(), 720);
  pane.classList.remove('shake'); void pane.offsetWidth; pane.classList.add('shake');
  SND.play('wrong'); setTimeout(() => SND.play('heart'), 120); vib([40, 40, 40]);
  setHearts(lostIdx);
  G.combo = 0;
  if (G.hearts <= 0) { G.run = false; setTimeout(() => failLevel('heart'), 700); }
}
/* ---------- 提示 ---------- */
function clearHint(k) { G.hintEls = G.hintEls.filter(h => { if (k === undefined || h.k === k) { h.els.forEach(e => e.remove()); return false; } return true; }); }
function useHint(free) {
  if (!G.run || G.pause) return;
  if (G.hintEls.length) { toast('提示已经亮起啦，快看黄圈！'); return; }
  if (!free && SV.hints <= 0) { toast('提示用完啦！三星通关可获得提示'); SND.play('wrong'); return; }
  const left = G.lv.d.map((d, k) => k).filter(k => !G.found.includes(k)); if (!left.length) return;
  const k = left[Math.floor(Math.random() * left.length)], d = G.lv.d[k];
  if (!free) { SV.hints--; save(); setHint(); }
  G.hintUsed++;
  SND.play('hint');
  const ns = 'http://www.w3.org/2000/svg', R = Math.max(ringR(d) + 14, 58), els = [];
  for (const svg of [G.svgA, G.svgB]) {
    const c = document.createElementNS(ns, 'circle'); c.setAttribute('cx', d.x * IW); c.setAttribute('cy', d.y * IH); c.setAttribute('r', R);
    c.setAttribute('fill', 'rgba(255,236,90,.22)'); c.setAttribute('stroke', '#ffe14a'); c.setAttribute('stroke-width', 13); c.setAttribute('stroke-dasharray', '30 16'); c.setAttribute('class', 'hintc');
    svg.appendChild(c); els.push(c);
  }
  G.hintEls.push({ k, els });
  // 若已放大，平移到提示处
  if (G.z.s > 1.05) { const z = G.z; z.x = G.W / 2 - d.x * G.W * z.s; z.y = G.H / 2 - d.y * G.H * z.s; clampZ(); for (const st of [stA, stB]) { st.style.transition = 'transform .35s'; setTimeout(() => st.style.transition = '', 360); } applyZ(); }
  for (const p of [paneA, paneB]) { const s = screenPt(p, d); burst(s.x, s.y, 10, ['#fff7a0', '#ffe14a', '#fff']); }
}
tap($('tHint'), () => useHint(false));
/* ---------- 计时 ---------- */
let lastSec = 999;
function loop(ts) {
  requestAnimationFrame(loop);
  if (G.run && !G.pause) {
    const dt = Math.min(0.25, (ts - (G.lastTick || ts)) / 1000); G.t -= dt;
    const sec = Math.ceil(G.t);
    if (sec !== lastSec) { lastSec = sec; setTimer(); if (sec <= 10 && sec > 0) SND.play('tick'); }
    if (G.t <= 0) { G.t = 0; setTimer(); G.run = false; failLevel('time'); }
  }
  G.lastTick = ts;
  stepFx(ts);
}
requestAnimationFrame(loop);
/* ---------- 暂停 ---------- */
function pauseGame() { if (!G.run || G.pause) return; G.pause = true; try{GT.pause()}catch(_e){} $('pause').classList.add('on'); SND.duck(true); }
function resume() { G.pause = false; $('pause').classList.remove('on'); SND.duck(false); }
tap($('gPause'), pauseGame);
tap($('pResume'), resume);
tap($('pRestart'), () => { resume(); startLevel(G.i, true); });
tap($('pLevels'), () => { try{GT.quit('menu')}catch(_e){} resume(); G.run = false; G.token++; $('game').classList.remove('on'); showLevels(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { pauseGame(); if (SND.ctx) SND.ctx.suspend && SND.ctx.suspend(); } else if (SND.ctx && audioOK) SND.ctx.resume(); });
/* ---------- 结算 ---------- */
function starsFor() { const used = TOTAL_T - G.t, B = CHS[G.band || 0]; let s = 3; if (G.miss >= 2 || used > B.s2) s = 2; if (G.miss >= 4 || used > B.s1) s = 1; return s; }
function winLevel() {
  const id = G.i + 1, s = starsFor(), used = Math.round(TOTAL_T - G.t); try{GT.win(id,{stars:s,miss:G.miss,hints:G.hintUsed,used:used,img:G.img})}catch(_e){}
  const prev = SV.stars[id] || 0; SV.stars[id] = Math.max(prev, s);
  if (!SV.best[id] || used < SV.best[id]) SV.best[id] = used;
  let reward = '';
  if (s === 3 && !SV.h3[id]) { SV.h3[id] = 1; SV.hints++; reward = '三星奖励：提示 +1'; }
  const newUnlock = id + 1 > SV.unlocked && id < NSLOT; if (id + 1 > SV.unlocked) SV.unlocked = Math.min(NSLOT, id + 1);
  save();
  zoomTo(1, G.W / 2, G.H / 2, true);
  SND.play('win'); SND.duck(true); setTimeout(() => SND.duck(false), 2600);
  confetti();
  $('win').classList.add('on');
  // 图片
  const w = $('wImgs'); w.innerHTML = '<div class="wp"><div class="stage" id="wA"></div></div><div class="wp"><div class="stage" id="wB"></div></div>';
  const sa = buildStage($('wA'), G.lv, G.img - 1, false), sb = buildStage($('wB'), G.lv, G.img - 1, true);
  G.lv.d.forEach(d => { drawRing(sa, d, false); drawRing(sb, d, false); });
  const ss = $('wStars').children; for (let k = 0; k < 3; k++) { ss[k].className = ''; }
  for (let k = 0; k < s; k++) setTimeout(() => { ss[k].className = 'on'; SND.play('star', k); }, 450 + k * 280);
  $('wInfo').innerHTML = `用时 <b>${fmt(used)}</b>　·　失误 <b>${G.miss}</b> 次${prev && s > prev ? '　·　<b>新纪录！</b>' : ''}`;
  const rw = $('wReward'); rw.classList.toggle('on', !!reward); rw.innerHTML = reward ? IC.bulb.replace('<svg', '<svg width="20" height="20"') + reward : '';
  $('wNext').textContent = id >= NSLOT ? '全部通关！' : '下一关';
  if (newUnlock) setTimeout(() => SND.play('unlock'), 1400);
}
tap($('wNext'), () => { $('win').classList.remove('on'); if (G.i + 1 >= NSLOT) { G.token++; $('game').classList.remove('on'); showLevels(); toast(`恭喜！全部 ${NSLOT} 关已通关！`, 2200); } else startLevel(G.i + 1); });
tap($('wRetry'), () => { $('win').classList.remove('on'); startLevel(G.i); });
tap($('wLevels'), () => { $('win').classList.remove('on'); G.token++; $('game').classList.remove('on'); showLevels(); });
function failLevel(why) {
  G.run = false; clearHint(); try{GT.fail(G.i+1,{r:why,found:G.found.length,miss:G.miss,img:G.img})}catch(_e){}
  SND.play('fail'); SND.duck(true); setTimeout(() => SND.duck(false), 2400);
  $('fTitle').textContent = why === 'time' ? '时间到！' : '机会用完啦！';
  $('fIco').innerHTML = why === 'time' ? IC.timeup : IC.broken;
  $('fInfo').innerHTML = `已找到 <b>${G.found.length}</b> / 5 处不同<br>${why === 'time' ? '别着急，慢慢看，放大镜能帮你！' : '点错会扣爱心，看准了再点哦～'}`;
  $('fail').classList.add('on');
}
tap($('fRetry'), () => { $('fail').classList.remove('on'); startLevel(G.i, true); });
tap($('fLevels'), () => { $('fail').classList.remove('on'); G.token++; $('game').classList.remove('on'); showLevels(); });
// 返回 Tilo 游戏屋：先存档再离开
function goHub(e) { save(); try{GT.hub(e&&e.currentTarget&&e.currentTarget.id)}catch(_e){} location.href = '../'; }
/* 北京时间交付版：无返回游戏屋 */
/* ---------- 特效 ---------- */
const FX = []; const fxEl = $('fx');
function burst(x, y, n, cols) {
  cols = cols || ['#ffe14a', '#ffffff', '#5cf08a', '#ff8ad0', '#7fd4ff'];
  for (let k = 0; k < n; k++) {
    const e = document.createElement('div'); e.className = 'pt';
    const sz = 5 + Math.random() * 7, star = Math.random() < .45, c = cols[k % cols.length];
    e.style.width = e.style.height = sz + 'px';
    e.style.background = star ? 'none' : c; e.style.borderRadius = '50%';
    if (star) e.innerHTML = `<svg width="${sz * 2}" height="${sz * 2}" viewBox="0 0 20 20" style="margin:-${sz / 2}px"><path d="M10 0l2.6 7.4L20 10l-7.4 2.6L10 20l-2.6-7.4L0 10l7.4-2.6z" fill="${c}"/></svg>`;
    fxEl.appendChild(e);
    const a = Math.random() * Math.PI * 2, sp = 120 + Math.random() * 220;
    FX.push({ e, x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, life: 0, max: .6 + Math.random() * .35, g: 380, rot: Math.random() * 360 });
  }
}
function confetti() {
  const cols = ['#ff3d5a', '#ffd23f', '#3fbf2c', '#3a8cff', '#c06aff', '#ff8a2a'];
  for (let k = 0; k < 80; k++) {
    const e = document.createElement('div'); e.className = 'pt'; const w = 7 + Math.random() * 6;
    e.style.width = w + 'px'; e.style.height = (w * .5) + 'px'; e.style.background = cols[k % cols.length]; e.style.borderRadius = '2px';
    fxEl.appendChild(e);
    const x = innerWidth * (k % 2 ? 0.1 : 0.9), a = (k % 2 ? -1 : 1) * (Math.PI * 0.08 + Math.random() * Math.PI * 0.32) - Math.PI / 2 * (k % 2 ? -1 : 1) * 0;
    const ang = k % 2 ? -Math.PI / 2 + Math.random() * 0.9 : -Math.PI / 2 - Math.random() * 0.9;
    const sp = 500 + Math.random() * 450;
    FX.push({ e, x, y: innerHeight * 0.75, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, life: 0, max: 2.2 + Math.random(), g: 520, rot: Math.random() * 360, vr: (Math.random() - .5) * 900, drag: 1.6 });
  }
}
let lastFx = 0;
function stepFx(ts) {
  const dt = Math.min(0.05, (ts - (lastFx || ts)) / 1000); lastFx = ts;
  for (let k = FX.length - 1; k >= 0; k--) {
    const p = FX[k]; p.life += dt;
    if (p.life >= p.max) { p.e.remove(); FX.splice(k, 1); continue; }
    if (p.drag) { p.vx -= p.vx * p.drag * dt; p.vy -= p.vy * p.drag * dt * .5; }
    p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += (p.vr || 200) * dt;
    const o = 1 - Math.max(0, (p.life - p.max * .6) / (p.max * .4));
    p.e.style.transform = `translate3d(${p.x}px,${p.y}px,0) rotate(${p.rot}deg)`; p.e.style.opacity = o;
  }
}
function popText(txt, x, y, col) {
  const e = document.createElement('div'); e.className = 'pop'; e.textContent = txt; e.style.left = x + 'px'; e.style.top = y + 'px'; e.style.color = col || '#fff';
  document.body.appendChild(e); setTimeout(() => e.remove(), 950);
}
/* ---------- 自动演示 ?bot ---------- */
function runBot(tok) {
  const L = G.lv, order = L.d.map((d, k) => k);
  const tapAt = (pane, u, v) => { if (tok !== G.token) return; guess(pane, G.z.x + u * G.W * G.z.s, G.z.y + v * G.H * G.z.s); };
  let t = 900;
  // 一次误点：选一个远离所有不同的点
  let wu = 0.5, wv = 0.5, bestD = 0;
  for (let a = 0.1; a < 0.95; a += 0.1) for (let b = 0.1; b < 0.95; b += 0.1) { const m = Math.min(...L.d.map(d => Math.hypot(a - d.x, (b - d.y) * .75))); if (m > bestD) { bestD = m; wu = a; wv = b; } }
  setTimeout(() => tapAt(paneA, wu, wv), t); t += 1300;
  order.forEach((k, j) => {
    if (j === 2) { setTimeout(() => { if (tok === G.token) useHint(true); }, t); t += 1500; }
    setTimeout(() => { if (tok !== G.token) return; const hk = G.hintEls[0] ? G.hintEls[0].k : k; const d = L.d[G.found.includes(hk) ? k : hk]; if (!G.found.includes(G.lv.d.indexOf(d))) tapAt(j % 2 ? paneB : paneA, d.x, d.y); else { const r = order.find(q => !G.found.includes(q)); if (r !== undefined) tapAt(paneA, L.d[r].x, L.d[r].y); } }, t);
    t += 1300;
  });
  // 兜底：补齐
  setTimeout(() => { if (tok !== G.token) return; L.d.forEach((d, k) => { if (!G.found.includes(k)) tapAt(paneA, d.x, d.y); }); }, t + 200);
}
document.addEventListener('gesturestart', e => e.preventDefault());
window.__G = G;
window.__T = { n: NSLOT, start: i => startLevel(i), win: () => { for (let k = 0; k < G.lv.d.length; k++) if (!G.found.includes(k)) found(k); }, img: () => G.img };
window.__dbg = { hint: () => useHint(true), find: k => found(k), wrong: (u, v) => guess(paneA, G.z.x + u * G.W * G.z.s, G.z.y + v * G.H * G.z.s), zoom: (s, u, v) => zoomTo(s, u * G.W, v * G.H, false) };
boot();
})();
