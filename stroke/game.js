/* 一笔绘山海 · 主程序
   玩法：按住山石一笔画完所有山径（欧拉路径）。章节新奇遇：云桥（走两遍）、单行溪（顺水）、白泽（最后唤醒）。
   画过的山径会“长出”山峦、松树与桃花，整幅山海随一笔渐次成画。 */
'use strict';
const $ = KIT.$, cv = $('cv'), ctx = cv.getContext('2d');
let W = 0, H = 0, DPR = 1, TIME = 0, SAFE_T = 0, SAFE_B = 0;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a) * t, ease = t => 1 - Math.pow(1 - t, 3);
const R = (a, b) => a + Math.random() * (b - a), pick = a => a[(Math.random() * a.length) | 0];
const SAVE_KEY = 'stroke_save_v1';
const S = KIT.load(SAVE_KEY, { unlocked: 1, stars: [], best: [], hints: 3, music: true, sfx: true, seen: {}, cur: null, plays: 0 });
const CH_THEME = [ // 章节：底色薄雾、墨色、点缀色、新机制
  { veil: [236, 244, 232], ink: '#173c37', glow: '#5fe0c4', deco: ['peak', 'pine', 'peach'], tag: '山径初绘' },
  { veil: [246, 236, 240], ink: '#3a2440', glow: '#ff9fc6', deco: ['peach', 'cloud', 'peak'], tag: '云桥要走两遍' },
  { veil: [228, 240, 248], ink: '#14304a', glow: '#6cc6ff', deco: ['reed', 'peak', 'pine'], tag: '溪流只能顺水' },
  { veil: [248, 242, 226], ink: '#3a2a10', glow: '#ffd36a', deco: ['pine', 'peak', 'snow'], tag: '白泽最后唤醒' },
  { veil: [226, 226, 244], ink: '#1e1a40', glow: '#b8a8ff', deco: ['peak', 'peach', 'cloud'], tag: '诸般奇遇齐聚' }];
const INTRO = {
  0: { t: '一笔绘山海', d: '按住一块<b>山石</b>不松手，沿着山径一路画下去。<br>每条山径都要画到，<b>画过的路不能再走</b>。' },
  4: { t: '起笔有讲究', d: '数一数每块山石连着几条路：<b>岔路为单数</b>的山石，<br>一笔画只能从它们<b>起笔或收笔</b>。' },
  6: { t: '新奇遇 · 云桥', d: '云雾凝成的<b>云桥</b>要走<b>两遍</b>：<br>第一遍化作彩虹，第二遍才落墨成路。' },
  12: { t: '新奇遇 · 单行溪', d: '溪水只往一个方向流，<br>沿着<b>水纹箭头</b>才能渡过，逆流过不去。' },
  18: { t: '新奇遇 · 白泽', d: '神兽<b>白泽</b>在山中酣睡。路可以从它身边经过，<br>但这一笔必须<b>停在白泽身边收笔</b>，才能唤醒它。' },
  24: { t: '归墟 · 诸奇遇齐聚', d: '云桥、溪流、白泽同时出现。<br>动笔前先找找<b>单数岔路</b>和<b>溪流方向</b>。' } };

/* ---------- 资源 ---------- */
const IMG = {}; const SRC = { bg: 'assets/bg.jpg', logo: 'assets/logo.webp', beast: 'assets/beast.webp', birdS: 'assets/bird/bird_static.webp' };
const BIRD = { n: 120, fps: 24, cols: 6, rows: 4, per: 24, fw: 360, fh: 376, body: [17, 9, 355, 370], sheets: [], ok: false, t: 0 };
function loadAll(done) {
  const keys = Object.keys(SRC); let left = keys.length + 5, tot = left;
  const tickL = () => { left--; $('loadBar').style.width = (100 * (tot - left) / tot) + '%'; if (left === 0) done(); };
  keys.forEach(k => { const im = new Image(); im.onload = im.onerror = tickL; im.src = SRC[k]; IMG[k] = im; });
  for (let i = 0; i < 5; i++) {
    const im = new Image(); let tried = false;
    im.onload = () => { try { const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; c.getContext('2d').drawImage(im, 0, 0); BIRD.sheets[i] = c; } catch (e) { BIRD.sheets[i] = im; } if (BIRD.sheets.filter(Boolean).length === 5) BIRD.ok = true; tickL(); };
    im.onerror = () => { if (!tried) { tried = true; im.src = 'assets/bird/bird_' + i + '.png'; } else tickL(); };
    im.src = 'assets/bird/bird_' + i + '.webp';
  }
}
function drawBird(cx, cy, h, flip, t, alpha) { // cx,cy = 身体中心；h = 身高（px）
  const B = BIRD.body, k = h / (B[3] - B[1]);
  ctx.save(); ctx.translate(cx, cy); if (flip) ctx.scale(-1, 1); if (alpha != null) ctx.globalAlpha = alpha;
  const ox = (B[0] + B[2]) / 2 * k, oy = (B[1] + B[3]) / 2 * k;
  if (BIRD.ok) { const f = Math.floor(t * BIRD.fps) % BIRD.n, j = f % BIRD.per; ctx.drawImage(BIRD.sheets[(f / BIRD.per) | 0], (j % BIRD.cols) * BIRD.fw, ((j / BIRD.cols) | 0) * BIRD.fh, BIRD.fw, BIRD.fh, -ox, -oy, BIRD.fw * k, BIRD.fh * k); }
  else if (IMG.birdS.naturalWidth) ctx.drawImage(IMG.birdS, -ox, -oy, BIRD.fw * k, BIRD.fh * k);
  ctx.restore();
}
/* ---------- 预渲染贴图 ---------- */
const SPR = {};
function hexA(h, a) { const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; }
function glow(col) { const k = 'g' + col; if (SPR[k]) return SPR[k]; const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, hexA(col, .55)); g.addColorStop(.4, hexA(col, .18)); g.addColorStop(1, hexA(col, 0)); x.fillStyle = g; x.fillRect(0, 0, 128, 128); return (SPR[k] = c); }
function sparkSpr(col) { const k = 's' + col; if (SPR[k]) return SPR[k]; const S2 = 48, m = 24, c = document.createElement('canvas'); c.width = c.height = S2; const x = c.getContext('2d'); const g = x.createRadialGradient(m, m, 0, m, m, m); g.addColorStop(0, hexA(col, .5)); g.addColorStop(1, hexA(col, 0)); x.fillStyle = g; x.fillRect(0, 0, S2, S2);
  const ray = (r, w, cl) => { x.fillStyle = cl; x.beginPath(); x.moveTo(m, m - r); x.quadraticCurveTo(m + w, m - w, m + r, m); x.quadraticCurveTo(m + w, m + w, m, m + r); x.quadraticCurveTo(m - w, m + w, m - r, m); x.quadraticCurveTo(m - w, m - w, m, m - r); x.fill(); };
  ray(20, 2.5, col); ray(9, 1.5, '#fff'); return (SPR[k] = c); }
function petalSpr(col) { const k = 'p' + col; if (SPR[k]) return SPR[k]; const c = document.createElement('canvas'); c.width = c.height = 40; const x = c.getContext('2d'); x.translate(20, 20); const g = x.createLinearGradient(0, -16, 0, 16); g.addColorStop(0, '#fff'); g.addColorStop(.4, col); g.addColorStop(1, col); x.fillStyle = g; x.beginPath(); x.moveTo(0, -17); x.bezierCurveTo(13, -9, 10, 10, 0, 17); x.bezierCurveTo(-10, 10, -13, -9, 0, -17); x.fill(); return (SPR[k] = c); }
function inkSpr() { if (SPR.ink) return SPR.ink; const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(10,30,28,.85)'); g.addColorStop(.5, 'rgba(10,30,28,.35)'); g.addColorStop(1, 'rgba(10,30,28,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return (SPR.ink = c); }
// 祥云（几段圆弧卷云）
function cloudSpr(v) { const k = 'c' + v; if (SPR[k]) return SPR[k]; const c = document.createElement('canvas'); c.width = 260; c.height = 110; const x = c.getContext('2d');
  x.fillStyle = 'rgba(255,255,250,.92)'; x.strokeStyle = 'rgba(120,150,145,.55)'; x.lineWidth = 3;
  const blobs = v ? [[60, 70, 30], [100, 52, 38], [150, 60, 32], [190, 72, 26], [125, 80, 30]] : [[70, 66, 28], [110, 50, 34], [160, 58, 36], [205, 72, 24], [130, 80, 34]];
  x.beginPath(); blobs.forEach(b => { x.moveTo(b[0] + b[2], b[1]); x.arc(b[0], b[1], b[2], 0, 7); }); x.fill();
  blobs.forEach(b => { x.beginPath(); x.arc(b[0], b[1], b[2] * .62, Math.PI * .9, Math.PI * 2.1); x.stroke(); });
  return (SPR[k] = c); }
/* ---------- 布局 ---------- */
function resize() {
  DPR = Math.min(2, window.devicePixelRatio || 1); W = innerWidth; H = innerHeight;
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR); ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  const sd = getComputedStyle(document.documentElement); SAFE_T = 0; SAFE_B = 0;
  if (G.L) layout();
}
const G = { idx: 0, L: null, rem: null, path: [], moves: [], pts: [], state: 'menu', t: 0, hints: 0, anims: [], parts: [], deco: [], shake: 0, hintE: -1, hintN: -1, hintT: 0, bird: { x: 0, y: 0, fx: 0, fy: 0, tx: 0, ty: 0, k: 1, flip: false }, winT: 0, bump: {} };
function layout() {
  const L = G.L, top = Math.max(118, H * .15) + 12, bot = H - Math.max(110, H * .13) - 10, side = Math.max(38, W * .1);
  const aw = Math.min(W - side * 2, 560), ah = bot - top;
  const ux = Math.max(1, L.w), uy = Math.max(1, L.h), spX = Math.min(aw / ux, 150), spY = Math.min(ah / uy, spX * 1.45, 170), sp = Math.min(spX, spY);
  const gw = ux * spX, gh = uy * spY, ox = (W - gw) / 2, oy = top + (ah - gh) / 2;
  G.sp = sp; G.pts = L.pts.map(p => [ox + p[0] * (L.w ? gw : 0) + (L.w ? 0 : gw / 2), oy + p[1] * gh]);
  G.nodeR = clamp(sp * .16, 13, 19);
  if (G.path.length) { const p = G.pts[G.path[G.path.length - 1]]; G.bird.x = G.bird.tx = p[0]; G.bird.y = G.bird.ty = p[1]; }
  G.deco.forEach(d => placeDeco(d));
}
/* ---------- 关卡流程 ---------- */
function startLevel(i, resume) {
  G.idx = i; G.L = LEVELS[i]; G.ch = CHAPTERS.findIndex(c => i + 1 >= c.from && i + 1 <= c.to); G.th = CH_THEME[G.ch];
  G.gen = (G.gen || 0) + 1; G.rem = LOGIC.init(G.L); G.path = []; G.moves = []; G.anims = []; G.parts = []; G.deco = []; G.hints = 0; G.time = 0; G.hintE = -1; G.hintN = -1; G.winT = 0; G.awake = 0; G.stuck = false;
  layout();
  if (resume && resume.idx === i && resume.moves && resume.moves.length) {
    G.path = [resume.start]; G.time = resume.time || 0; G.hints = resume.hints || 0;
    for (const e of resume.moves) { const to = LOGIC.step(G.L, G.rem, G.path[G.path.length - 1], e); if (to < 0) break; G.rem[e]--; G.moves.push(e); G.path.push(to); addDeco(e, true); }
    const p = G.pts[G.path[G.path.length - 1]]; Object.assign(G.bird, { x: p[0], y: p[1], tx: p[0], ty: p[1] });
  } else { const c = centroid(); Object.assign(G.bird, { x: c[0], y: c[1] - 40, tx: c[0], ty: c[1] - 40 }); }
  G.state = 'play'; KIT.show(null); $('hud').classList.add('on'); hud();
  try { KIT.gt().lv(i + 1); } catch (e) { }
  const intro = INTRO[i]; if (intro && !S.seen[i]) { S.seen[i] = 1; save(); showIntro(intro); }
}
function centroid() { let x = 0, y = 0; G.pts.forEach(p => { x += p[0]; y += p[1]; }); return [x / G.pts.length, y / G.pts.length]; }
function cur() { return G.path.length ? G.path[G.path.length - 1] : -1; }
function stepsTotal() { return G.L.e.reduce((q, e) => q + LOGIC.need(e[2]), 0); }
function stepsDone() { return G.moves.length; }
function hud() {
  if (!G.L) return;
  $('hTitle').textContent = `第 ${G.idx + 1} 关 · ${CHAPTERS[G.ch].name}`;
  $('hInk').textContent = `墨迹 ${stepsDone()}/${stepsTotal()}`;
  const t = Math.floor(G.time); $('hTime').textContent = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
  $('hHintN').textContent = S.hints; $('hHint').classList.toggle('dis', S.hints <= 0);
  $('hUndo').classList.toggle('dis', !G.moves.length);
}
function save() {
  if (G.state === 'play' && G.L && G.moves.length) S.cur = { idx: G.idx, start: G.path[0], moves: G.moves.slice(), time: G.time, hints: G.hints };
  else if (G.state !== 'play' && G.state !== 'pause' && G.state !== 'fail') S.cur = S.cur && S.cur.idx === G.idx && G.state !== 'win' ? S.cur : (G.state === 'win' ? null : S.cur);
  KIT.save(SAVE_KEY, S);
}
/* ---------- 走笔 ---------- */
function edgeKind(e) { return ['path', 'cloud', 'stream'][G.L.e[e][2]]; }
function tryMove(to) {
  const c = cur(); if (c < 0 || G.state !== 'play') return false;
  // 优先选剩余次数多的边（云桥先走），其次普通边
  const ms = LOGIC.moves(G.L, G.rem, c).filter(m => m[1] === to);
  if (!ms.length) return false;
  ms.sort((a, b) => G.rem[b[0]] - G.rem[a[0]]);
  doMove(ms[0][0], to); return true;
}
function doMove(e, to) {
  const from = cur(); G.rem[e]--; G.moves.push(e); G.path.push(to);
  const kind = edgeKind(e), p0 = G.pts[from], p1 = G.pts[to];
  G.anims.push({ e, t: 0, from, to, second: G.L.e[e][2] === 1 && G.rem[e] === 0 });
  hop(p1, p0);
  SND.play('step', G.moves.length - 1, to === G.L.beast && LOGIC.left(G.rem) === 0 ? 'beast' : kind === 'path' ? '' : kind);
  KIT.vib(12);
  splash(p1[0], p1[1], 10, G.th.glow); inkDrop(p1[0], p1[1]);
  if (G.rem[e] === 0) addDeco(e);
  G.hintE = -1; G.hintN = -1;
  if (LOGIC.done(G.L, G.rem, to)) { win(); }
  else if (!LOGIC.moves(G.L, G.rem, to).length) stuck();
  hud(); save();
}
function hop(p1, p0) { const b = G.bird; b.fx = b.x; b.fy = b.y; b.tx = p1[0]; b.ty = p1[1]; b.hop = 0; if (p0) b.flip = p1[0] < p0[0]; }
function undo(silent) {
  if (!G.moves.length || (G.state !== 'play' && G.state !== 'fail')) return;
  const e = G.moves.pop(); G.path.pop(); G.rem[e]++;
  if (G.rem[e] === 1) G.deco = G.deco.filter(d => d.e !== e);
  G.anims = G.anims.filter(a => a.e !== e || a.t >= 1);
  const c = cur(); if (c >= 0) hop(G.pts[c], null);
  if (G.moves.length === 0 && !silent) { /* 起点保留 */ }
  if (!silent) { SND.play('back'); KIT.vib(8); }
  if (G.state === 'fail') { G.state = 'play'; KIT.show(null); $('hud').classList.add('on'); }
  G.stuck = false; hud(); save();
}
function restart() { G.state = 'play'; KIT.show(null); const i = G.idx; S.cur = null; startLevel(i); SND.play('back'); }
function stuck() {
  G.stuck = true; G.shake = .35; SND.play('stuck'); KIT.vib([30, 40, 30]);
  const allDone = LOGIC.left(G.rem) === 0;
  try { KIT.gt().fail(G.idx + 1, { r: allDone ? 'beast' : 'dead', left: LOGIC.left(G.rem), hints: G.hints }); } catch (e) { }
  setTimeout(() => {
    if (!G.stuck || G.state !== 'play') return;
    G.state = 'fail'; $('fTitle').textContent = allDone ? '白泽还在睡' : '墨尽于此';
    $('fInfo').innerHTML = allDone ? '山径都画完了，可这一笔<b>没有停在白泽身边</b>。<br>换个起笔试试？' : `还剩 <b>${LOGIC.left(G.rem)}</b> 段山径没画到，前面已无路可走。<br>撤一步，或请青鸟指路。`;
    $('fHint').textContent = `指路（${S.hints}）`;
    KIT.show('fail');
  }, 750);
}
/* ---------- 提示 ---------- */
function hint() {
  if (G.state !== 'play' && G.state !== 'fail') return;
  if (S.hints <= 0) { KIT.toast('指路用完啦，三星过关可再得'); SND.play('bump'); return; }
  if (G.state === 'fail') { G.state = 'play'; KIT.show(null); $('hud').classList.add('on'); }
  let sol = null;
  if (!G.path.length) { const s = LOGIC.solve(G.L, 300000); if (s) { G.path = [s.start]; const p = G.pts[s.start]; hop(p, null); sol = s.path; SND.play('start'); } }
  else {
    sol = LOGIC.solveFrom(G.L, G.rem, cur(), 300000);
    while (!sol && G.moves.length) { undo(true); sol = LOGIC.solveFrom(G.L, G.rem, cur(), 300000); }
    if (!sol && !G.moves.length) { const s = LOGIC.solve(G.L, 300000); G.path = [s.start]; hop(G.pts[s.start], null); sol = s.path; }
  }
  if (!sol || !sol.length) return;
  S.hints--; G.hints++; G.hintE = sol[0][0]; G.hintN = sol[0][1]; G.hintT = 0; G.stuck = false;
  SND.play('hint'); KIT.vib(10); hud(); save();
}
/* ---------- 胜利 ---------- */
function win() {
  G.state = 'winanim'; G.winT = 0; G.stuck = false;
  const par = G.L.par, st = G.hints === 0 && G.time <= par ? 3 : (G.hints <= 1 && G.time <= par * 2) ? 2 : 1;
  const prev = S.stars[G.idx] || 0; let bonus = 0;
  if (st === 3 && prev < 3) bonus++;
  if (G.idx + 1 === CHAPTERS[G.ch].to && !S.best[G.idx]) bonus += 2;
  S.stars[G.idx] = Math.max(prev, st); S.best[G.idx] = S.best[G.idx] ? Math.min(S.best[G.idx], G.time) : G.time;
  S.unlocked = Math.max(S.unlocked, Math.min(LEVELS.length, G.idx + 2)); S.hints = Math.min(9, S.hints + bonus); S.cur = null; S.plays++;
  G.result = { st, bonus };
  try { KIT.gt().win(G.idx + 1, { stars: st, hints: G.hints, steps: stepsTotal(), par }); } catch (e) { }
  SND.play('win'); KIT.vib([20, 30, 20, 30, 60]);
  const gen = G.gen, L0 = G.L, later = (f, ms) => setTimeout(() => { if (G.gen === gen && G.L === L0) f(); }, ms);
  if (G.L.beast >= 0) later(() => { G.awake = TIME; SND.play('wake'); const p = G.pts[G.L.beast]; burst(p[0], p[1] - 20, 40, ['#ffffff', '#ffe27a', '#9ff5e2']); KIT.vib(40); }, 650);
  G.path.forEach((v, k) => later(() => { const p = G.pts[v]; if (p) splash(p[0], p[1], 8, '#ffe27a'); }, k * 45));
  save(); hud();
  later(showWin, G.L.beast >= 0 ? 2100 : 1600);
}
function showWin() {
  const r = G.result, t = Math.round(G.time);
  $('wTitle').textContent = ['', '山海入画', '妙笔生花', '神来之笔'][r.st] + '！';
  $('wInfo').innerHTML = `用时 <b>${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}</b>（三星目标 ${G.L.par} 秒内、不用指路）<br>指路 <b>${G.hints}</b> 次` + (r.bonus ? `<br>获得指路 <b>+${r.bonus}</b>（现有 ${S.hints}）` : '');
  $('wNext').style.display = G.idx + 1 < LEVELS.length ? '' : 'none';
  G.state = 'win'; $('hud').classList.remove('on'); KIT.show('win'); KIT.stars('wStars', r.st);
  for (let i = 0; i < r.st; i++) setTimeout(() => SND.play('star', i), 180 + i * 180);
}
/* ---------- 山径长出风景 ---------- */
function addDeco(e, instant) {
  const L = G.L, ed = L.e[e], kinds = G.th.deco, h = (ed[0] * 31 + ed[1] * 17 + e * 7) % 97;
  const d = { e, kind: kinds[h % kinds.length], side: h % 2 ? 1 : -1, s: .8 + (h % 5) * .08, t: instant ? 1 : 0, f: .3 + (h % 4) * .12 };
  placeDeco(d); G.deco.push(d);
}
function placeDeco(d) {
  const ed = G.L.e[d.e], a = G.pts[ed[0]], b = G.pts[ed[1]]; if (!a || !b) return;
  const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
  const off = G.sp * .2 * d.side; d.x = a[0] + dx * d.f + nx * off; d.y = a[1] + dy * d.f + ny * off; d.size = G.sp * .26 * d.s;
}
function drawDeco(d, dt) {
  d.t = Math.min(1, d.t + dt * 2.2); const k = d.t < 1 ? ease(d.t) * (1 + .25 * Math.sin(d.t * Math.PI)) : 1, s = d.size * k; if (s < 1) return;
  const x = d.x, y = d.y; ctx.save(); ctx.translate(x, y);
  if (d.kind === 'peak' || d.kind === 'snow') { // 青绿小山
    const g = ctx.createLinearGradient(0, -s, 0, s * .3); g.addColorStop(0, d.kind === 'snow' ? '#ffffff' : '#3e8f7e'); g.addColorStop(.45, d.kind === 'snow' ? '#9fc8c0' : '#2a6a5e'); g.addColorStop(1, 'rgba(40,90,80,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-s * .9, s * .3); ctx.quadraticCurveTo(-s * .35, -s * .2, -s * .1, -s); ctx.quadraticCurveTo(s * .05, -s * .7, s * .2, -s * .65); ctx.quadraticCurveTo(s * .5, -s * .1, s * .9, s * .3); ctx.fill();
    ctx.strokeStyle = 'rgba(20,50,45,.55)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-s * .1, -s); ctx.quadraticCurveTo(-s * .2, -s * .4, -s * .45, s * .1); ctx.stroke();
  } else if (d.kind === 'pine') {
    ctx.strokeStyle = '#4a3020'; ctx.lineWidth = Math.max(1.5, s * .08); ctx.beginPath(); ctx.moveTo(0, s * .3); ctx.quadraticCurveTo(s * .1, -s * .3, -s * .05, -s * .8); ctx.stroke();
    ctx.fillStyle = '#1f5a46'; [[-.05, -.8, .42], [.12, -.45, .5], [-.12, -.15, .55]].forEach(([px, py, r]) => { ctx.beginPath(); ctx.ellipse(px * s, py * s, r * s, r * s * .32, -.1, 0, 7); ctx.fill(); });
    ctx.fillStyle = 'rgba(160,220,190,.35)'; ctx.beginPath(); ctx.ellipse(.1 * s, -.5 * s, .3 * s, .08 * s, -.1, 0, 7); ctx.fill();
  } else if (d.kind === 'peach') {
    ctx.strokeStyle = '#5a3a2a'; ctx.lineWidth = Math.max(1.2, s * .06); ctx.beginPath(); ctx.moveTo(-s * .5, s * .3); ctx.quadraticCurveTo(0, -s * .1, s * .5, -s * .6); ctx.moveTo(0, 0); ctx.lineTo(-s * .1, -s * .55); ctx.stroke();
    [[.5, -.6], [-.1, -.55], [.15, -.25], [-.35, .05], [.3, -.4]].forEach(([px, py], i) => { const r = s * (.13 + (i % 2) * .04); ctx.fillStyle = i % 2 ? '#ffb3c8' : '#ff8fb0'; ctx.beginPath(); for (let k2 = 0; k2 < 5; k2++) { const an = k2 * 1.2566 + TIME * .2; ctx.moveTo(px * s, py * s); ctx.arc(px * s + Math.cos(an) * r * .55, py * s + Math.sin(an) * r * .55, r * .55, 0, 7); } ctx.fill(); ctx.fillStyle = '#fff2a0'; ctx.beginPath(); ctx.arc(px * s, py * s, r * .22, 0, 7); ctx.fill(); });
  } else if (d.kind === 'reed') {
    ctx.strokeStyle = '#2d5a48'; ctx.lineWidth = Math.max(1.2, s * .05);
    for (let i = -2; i <= 2; i++) { const sw = Math.sin(TIME * 1.6 + i) * s * .06; ctx.beginPath(); ctx.moveTo(i * s * .12, s * .3); ctx.quadraticCurveTo(i * s * .15, -s * .3, i * s * .2 + sw, -s * (.7 + Math.abs(i) * -.08)); ctx.stroke(); }
    ctx.fillStyle = '#9a7a4a'; for (let i = -1; i <= 1; i += 2) { ctx.beginPath(); ctx.ellipse(i * s * .2 + Math.sin(TIME * 1.6 + i) * s * .06, -s * .72, s * .05, s * .14, 0, 0, 7); ctx.fill(); }
  } else if (d.kind === 'cloud') {
    const im = cloudSpr(d.side > 0 ? 1 : 0), w2 = s * 2.2; ctx.globalAlpha = .9; ctx.drawImage(im, -w2 / 2 + Math.sin(TIME * .6 + d.f * 9) * s * .1, -w2 * .25, w2, w2 * 110 / 260);
  }
  ctx.restore();
}
/* ---------- 粒子 ---------- */
function splash(x, y, n, col) { for (let i = 0; i < n; i++) { const a = R(0, 6.28), v = R(40, 150); G.parts.push({ k: 'spark', c: pick([col, '#ffffff', '#ffe9a0']), x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30, life: R(.4, .8), t: 0, s: R(10, 20), g: 120 }); } }
function burst(x, y, n, cols) { for (let i = 0; i < n; i++) { const a = R(0, 6.28), v = R(80, 300); G.parts.push({ k: i % 3 ? 'spark' : 'petal', c: pick(cols), x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 80, life: R(.8, 1.6), t: 0, s: R(12, 24), g: 200, rot: R(0, 6), vr: R(-6, 6) }); } }
function inkDrop(x, y) { for (let i = 0; i < 5; i++) { const a = R(0, 6.28), d = R(6, 20); G.parts.push({ k: 'ink', x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, vx: 0, vy: 0, life: R(.5, .9), t: 0, s: R(10, 22), g: 0 }); } }
function drawParts(dt) {
  for (let i = G.parts.length - 1; i >= 0; i--) {
    const p = G.parts[i]; p.t += dt; if (p.t > p.life) { G.parts.splice(i, 1); continue; }
    p.vy += (p.g || 0) * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= .985; if (p.vr) p.rot += p.vr * dt;
    const u = p.t / p.life, a = Math.min(1, (1 - u) * 2);
    if (p.k === 'ink') { ctx.globalAlpha = a * .5; const s = p.s * (1 + u * .8); ctx.drawImage(inkSpr(), p.x - s / 2, p.y - s / 2, s, s); continue; }
    ctx.globalAlpha = a;
    if (p.k === 'petal') { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(1, .6 + .4 * Math.cos(p.t * 5)); ctx.drawImage(petalSpr(p.c), -p.s / 2, -p.s / 2, p.s, p.s); ctx.restore(); }
    else { ctx.globalCompositeOperation = 'lighter'; const s = p.s * (1 - u * .4); ctx.drawImage(sparkSpr(p.c), p.x - s / 2, p.y - s / 2, s, s); ctx.globalCompositeOperation = 'source-over'; }
  }
  ctx.globalAlpha = 1;
}
/* ---------- 背景：山水底图 + 宣纸薄雾 + 浮云 + 金尘 ---------- */
const AMB = { clouds: [], dust: [] };
for (let i = 0; i < 5; i++) AMB.clouds.push({ x: Math.random(), y: R(.08, .9), s: R(.5, 1.1), v: R(.006, .016) * (i % 2 ? 1 : -1), a: R(.35, .7), k: i % 2 });
for (let i = 0; i < 26; i++) AMB.dust.push({ x: Math.random(), y: Math.random(), v: R(.008, .025), ph: R(0, 6.28), s: R(2, 5) });
function drawBg(dt, veil) {
  const im = IMG.bg;
  if (im && im.naturalWidth) { const k = Math.max(W / im.naturalWidth, H / im.naturalHeight) * 1.04, iw = im.naturalWidth * k, ih = im.naturalHeight * k; const px = Math.sin(TIME * .05) * 6; ctx.drawImage(im, (W - iw) / 2 + px, (H - ih) / 2, iw, ih); }
  else { ctx.fillStyle = '#dfe8dc'; ctx.fillRect(0, 0, W, H); }
  if (veil) { const c = veil.col, g = ctx.createRadialGradient(W / 2, H * .5, 0, W / 2, H * .5, Math.max(W, H) * .75); g.addColorStop(0, `rgba(${c},${veil.a})`); g.addColorStop(.7, `rgba(${c},${veil.a * .85})`); g.addColorStop(1, `rgba(${c},${veil.a * .55})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
  for (const c of AMB.clouds) { c.x += c.v * dt; if (c.x > 1.3) c.x = -.3; if (c.x < -.3) c.x = 1.3; const w = Math.min(W, 520) * .55 * c.s; ctx.globalAlpha = c.a * (veil ? .55 : 1); ctx.drawImage(cloudSpr(c.k), c.x * W - w / 2, c.y * H, w, w * 110 / 260); }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'lighter';
  for (const d of AMB.dust) { d.y -= d.v * dt; if (d.y < -.02) { d.y = 1.02; d.x = Math.random(); } const a = .35 + .35 * Math.sin(TIME * 2 + d.ph); ctx.globalAlpha = a; const s = d.s * 4; ctx.drawImage(glow('#ffe9a0'), d.x * W + Math.sin(TIME * .7 + d.ph) * 10 - s / 2, d.y * H - s / 2, s, s); }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}
/* ---------- 山径绘制 ---------- */
function curveOf(e) { // 每条边轻微弯曲，像毛笔线；用确定性偏移
  const ed = G.L.e[e], a = G.pts[ed[0]], b = G.pts[ed[1]], dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
  const bend = (((ed[0] * 13 + ed[1] * 7) % 7) - 3) / 3 * len * .05;
  return { a, b, c: [(a[0] + b[0]) / 2 - dy / len * bend, (a[1] + b[1]) / 2 + dx / len * bend], len };
}
function qpt(C, t) { const u = 1 - t; return [u * u * C.a[0] + 2 * u * t * C.c[0] + t * t * C.b[0], u * u * C.a[1] + 2 * u * t * C.c[1] + t * t * C.b[1]]; }
function strokeCurve(C, t0, t1, rev) { ctx.beginPath(); const n = 18; for (let i = 0; i <= n; i++) { let t = t0 + (t1 - t0) * i / n; if (rev) t = 1 - t; const p = qpt(C, t); i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); } ctx.stroke(); }
function brush(C, prog, rev, ink, w, glowCol, gold) { // 墨线：外发光 + 浓墨 + 飞白高光
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = hexA(glowCol, .28); ctx.lineWidth = w * 2.6; strokeCurve(C, 0, prog, rev); ctx.restore();
  ctx.strokeStyle = gold ? '#7a5410' : ink; ctx.lineWidth = w; strokeCurve(C, 0, prog, rev);
  ctx.strokeStyle = gold ? 'rgba(255,226,122,.95)' : hexA(glowCol, .55); ctx.lineWidth = w * .38; strokeCurve(C, .04, prog * .96, rev);
  ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = w * .12; strokeCurve(C, .1, prog * .8, rev);
}
function drawEdges(dt) {
  const L = G.L, th = G.th, w = clamp(G.sp * .085, 6, 11);
  for (let e = 0; e < L.e.length; e++) {
    const ed = L.e[e], C = curveOf(e), need = LOGIC.need(ed[2]), done = need - G.rem[e];
    const an = G.anims.find(a => a.e === e && a.t < 1), animRev = an && an.from === ed[1];
    // 未画：虚线山径 / 云桥 / 溪流
    if (G.rem[e] > 0) {
      if (ed[2] === 1 && done === 0) { // 云桥
        ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = w * 2.2; strokeCurve(C, 0, 1);
        ctx.strokeStyle = 'rgba(150,170,190,.7)'; ctx.lineWidth = 2; ctx.setLineDash([2, 7]); strokeCurve(C, .08, .92); ctx.setLineDash([]);
        for (let k = 1; k < 4; k++) { const p = qpt(C, k / 4); const r = w * (1.1 + .2 * Math.sin(TIME * 2 + k + e)); ctx.fillStyle = 'rgba(255,255,255,.96)'; ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, 7); ctx.fill(); ctx.strokeStyle = 'rgba(140,165,180,.65)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(p[0], p[1], r * .6, 3, 6); ctx.stroke(); }
        drawBadge(qpt(C, .5), '×2', '#7a8fb0');
      } else if (ed[2] === 1 && done === 1 && !(an && !an.second)) { // 第一遍：彩虹
        const g = ctx.createLinearGradient(C.a[0], C.a[1], C.b[0], C.b[1]); ['#ff9a9a', '#ffd27a', '#9ff59a', '#8fd8ff', '#c9a8ff'].forEach((c, i) => g.addColorStop(i / 4, c));
        ctx.save(); ctx.globalAlpha = .9; ctx.strokeStyle = g; ctx.lineWidth = w * 1.1; ctx.lineCap = 'round'; strokeCurve(C, 0, 1); ctx.restore();
        ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = w * .3; strokeCurve(C, .05, .95); drawBadge(qpt(C, .5), '×1', '#b07ad8');
      } else if (ed[2] === 2) { // 单行溪
        ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(70,150,210,.55)'; ctx.lineWidth = w * 2; strokeCurve(C, 0, 1);
        ctx.strokeStyle = 'rgba(190,235,255,.9)'; ctx.lineWidth = w * .5; strokeCurve(C, 0, 1);
        const n = Math.max(2, Math.round(C.len / 34));
        for (let k = 0; k < n; k++) { const t = ((k + TIME * .9) / n) % 1; if (t < .1 || t > .9) continue; const p = qpt(C, t), q = qpt(C, Math.min(1, t + .02)), an2 = Math.atan2(q[1] - p[1], q[0] - p[0]); ctx.save(); ctx.translate(p[0], p[1]); ctx.rotate(an2); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(-5, -6); ctx.lineTo(3, 0); ctx.lineTo(-5, 6); ctx.stroke(); ctx.restore(); }
      } else if (ed[2] === 0 || (ed[2] === 1 && done === 0)) { // 普通未画
        ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(255,252,240,.75)'; ctx.lineWidth = w * 1.5; strokeCurve(C, 0, 1);
        ctx.strokeStyle = hexA(th.ink, .45); ctx.lineWidth = w * .45; ctx.setLineDash([w * .9, w * 1.1]); strokeCurve(C, 0, 1); ctx.setLineDash([]);
      }
    }
    // 已画（含动画）
    if (done > 0) {
      const prog = an ? ease(an.t) : 1, rev = an ? animRev : false;
      if (ed[2] === 1 && done === 1) { // 第一遍彩虹的展开动画
        if (an) { const g = ctx.createLinearGradient(C.a[0], C.a[1], C.b[0], C.b[1]); ['#ff9a9a', '#ffd27a', '#9ff59a', '#8fd8ff', '#c9a8ff'].forEach((c, i) => g.addColorStop(i / 4, c)); ctx.strokeStyle = g; ctx.lineWidth = w * 1.1; ctx.lineCap = 'round'; ctx.strokeStyle = g; strokeCurve(C, 0, prog, rev); }
      } else {
        if (an && an.second) { /* 底下保持彩虹 */ const g = ctx.createLinearGradient(C.a[0], C.a[1], C.b[0], C.b[1]); ['#ff9a9a', '#ffd27a', '#9ff59a', '#8fd8ff', '#c9a8ff'].forEach((c, i) => g.addColorStop(i / 4, c)); ctx.strokeStyle = g; ctx.lineWidth = w * 1.1; strokeCurve(C, 0, 1); }
        const gold = G.state === 'winanim' || G.state === 'win' ? (G.winT * 1.6 > G.moves.indexOf(e) / G.moves.length) : false;
        brush(C, prog, rev, ed[2] === 2 ? '#123a5a' : th.ink, w * (ed[2] === 1 ? 1.25 : 1), ed[2] === 2 ? '#6cc6ff' : th.glow, gold);
        if (ed[2] === 2 && !an) { const p = qpt(C, .5), q = qpt(C, .52), a2 = Math.atan2(q[1] - p[1], q[0] - p[0]); ctx.save(); ctx.translate(p[0], p[1]); ctx.rotate(a2); ctx.fillStyle = '#bfe8ff'; ctx.beginPath(); ctx.moveTo(-4, -5); ctx.lineTo(5, 0); ctx.lineTo(-4, 5); ctx.fill(); ctx.restore(); }
      }
      if (an) { const p = qpt(C, rev ? 1 - prog : prog); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(glow(th.glow), p[0] - 22, p[1] - 22, 44, 44); ctx.restore(); }
    }
    if (an) an.t += dt / .16;
  }
  // 提示：闪烁的金色引导线
  if (G.hintE >= 0) {
    G.hintT += dt; const C = curveOf(G.hintE), ed = L.e[G.hintE], rev = ed[0] !== cur(); const a = .55 + .45 * Math.sin(G.hintT * 8);
    ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = '#ffd34a'; ctx.lineWidth = w * 1.6; ctx.lineCap = 'round'; ctx.setLineDash([w * .8, w * .9]); ctx.lineDashOffset = -G.hintT * 40 * (rev ? -1 : 1); strokeCurve(C, 0, 1); ctx.restore(); ctx.setLineDash([]);
  }
}
function drawBadge(p, txt, col) { ctx.save(); ctx.font = '900 11px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(p[0] - 13, p[1] - 9, 26, 18, 9) : ctx.rect(p[0] - 13, p[1] - 9, 26, 18); ctx.fill(); ctx.stroke(); ctx.fillStyle = col; ctx.fillText(txt, p[0], p[1] + .5); ctx.restore(); }
/* ---------- 山石与白泽 ---------- */
function drawNodes() {
  const L = G.L, r = G.nodeR, c = cur(), legal = c >= 0 && G.state === 'play' ? new Set(LOGIC.moves(L, G.rem, c).map(m => m[1])) : null;
  G.pts.forEach((p, v) => {
    const used = LOGIC.adj(L)[v].every(e => G.rem[e] === 0), isCur = v === c, bump = G.bump[v] && TIME - G.bump[v] < .3 ? Math.sin((TIME - G.bump[v]) * 60) * 3 : 0;
    const x = p[0] + bump, y = p[1];
    if (legal && legal.has(v)) { const a = .45 + .3 * Math.sin(TIME * 5); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a; ctx.drawImage(glow(G.th.glow), x - r * 2.4, y - r * 2.4, r * 4.8, r * 4.8); ctx.restore(); }
    if (G.hintN === v || (G.hintE >= 0 && !G.moves.length && v === c)) { ctx.save(); ctx.strokeStyle = '#ffd34a'; ctx.lineWidth = 3; ctx.globalAlpha = .6 + .4 * Math.sin(TIME * 8); ctx.beginPath(); ctx.arc(x, y, r * 1.55 + Math.sin(TIME * 8) * 2, 0, 7); ctx.stroke(); ctx.restore(); }
    // 石头：投影 + 青玉/宣纸渐变 + 墨圈
    ctx.fillStyle = 'rgba(10,30,28,.28)'; ctx.beginPath(); ctx.ellipse(x + 1, y + r * .55, r * 1.05, r * .45, 0, 0, 7); ctx.fill();
    const g = ctx.createRadialGradient(x - r * .35, y - r * .4, r * .1, x, y, r * 1.1);
    if (used) { g.addColorStop(0, '#fff8d8'); g.addColorStop(.6, '#e9c66a'); g.addColorStop(1, '#a87a22'); }
    else { g.addColorStop(0, '#ffffff'); g.addColorStop(.55, '#d9efe6'); g.addColorStop(1, '#8fb8aa'); }
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    ctx.strokeStyle = G.th.ink; ctx.lineWidth = 2.6; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, r * .62, 3.6, 5.2); ctx.stroke();
    if (isCur) { ctx.strokeStyle = '#d8452e'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, r + 4 + Math.sin(TIME * 6) * 1.5, 0, 7); ctx.stroke(); }
    if (v === G.path[0] && G.path.length > 1) { ctx.fillStyle = '#d8452e'; ctx.beginPath(); ctx.arc(x, y, r * .3, 0, 7); ctx.fill(); }
  });
  if (L.beast >= 0) drawBeast();
}
function drawBeast() {
  const p = G.pts[G.L.beast], im = IMG.beast; if (!im.naturalWidth) return;
  const awake = G.awake ? TIME - G.awake : -1, bw = G.nodeR * 5.6, bh = bw * im.naturalHeight / im.naturalWidth;
  let sc = 1 + Math.sin(TIME * 1.8) * .02, jy = 0;
  if (awake >= 0) { jy = -Math.abs(Math.sin(Math.min(awake, 1.2) * Math.PI * 2.5)) * 18 * Math.max(0, 1 - awake / 1.6); sc = 1 + .12 * Math.max(0, 1 - awake); }
  const x = p[0], y = p[1] - bh * .18 + jy;
  ctx.save();
  if (awake >= 0) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .7; ctx.drawImage(glow('#ffe9a0'), x - bw, y - bw, bw * 2, bw * 2); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
  ctx.translate(x, y); ctx.scale(sc, sc); ctx.drawImage(im, -bw / 2, -bh / 2, bw, bh); ctx.restore();
  if (awake < 0) { ctx.save(); ctx.font = '900 ' + Math.round(G.sp * .14) + 'px sans-serif'; ctx.fillStyle = 'rgba(40,70,90,.7)'; for (let k = 0; k < 3; k++) { const t = (TIME * .6 + k / 3) % 1; ctx.globalAlpha = Math.sin(t * Math.PI); ctx.fillText('z', x + bw * .3 + t * 14, y - bh * .3 - t * 26); } ctx.restore(); }
}
/* ---------- 青鸟：停在笔尖 ---------- */
function drawBirdHead(dt) {
  const b = G.bird; if (b.hop != null && b.hop < 1) { b.hop = Math.min(1, b.hop + dt / .2); const t = ease(b.hop); b.x = lerp(b.fx, b.tx, t); b.y = lerp(b.fy, b.ty, t) - Math.sin(b.hop * Math.PI) * 16; } else { b.x = b.tx; b.y = b.ty; }
  const h = clamp(G.sp * .62, 52, 78), started = G.path.length > 0;
  const by = b.y - h * .5 - G.nodeR * .4 + (started ? 0 : Math.sin(TIME * 2) * 6);
  ctx.fillStyle = 'rgba(10,30,28,.2)'; ctx.beginPath(); ctx.ellipse(b.x, b.y + G.nodeR * .3, h * .28, h * .08, 0, 0, 7); ctx.fill();
  drawBird(b.x, by, h, b.flip, BIRD.t, started ? 1 : .92);
  if (!started && G.state === 'play') { ctx.save(); ctx.font = '800 14px sans-serif'; ctx.textAlign = 'center'; const txt = '按住一块山石开始画'; const tw = ctx.measureText(txt).width + 24; const y2 = by - h * .62; ctx.fillStyle = 'rgba(255,250,235,.92)'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(b.x - tw / 2, y2 - 15, tw, 28, 14) : ctx.rect(b.x - tw / 2, y2 - 15, tw, 28); ctx.fill(); ctx.strokeStyle = G.th.ink; ctx.lineWidth = 1.5; ctx.stroke(); ctx.fillStyle = G.th.ink; ctx.fillText(txt, b.x, y2 + 4); ctx.restore(); }
}
/* ---------- 输入 ---------- */
let drag = false, lastNear = -1;
function nodeAt(x, y, rr) { let best = -1, bd = 1e9; G.pts.forEach((p, v) => { const d = Math.hypot(p[0] - x, p[1] - y); if (d < bd) { bd = d; best = v; } }); return bd <= (rr || Math.max(G.nodeR * 1.9, G.sp * .36)) ? best : -1; }
function pos(e) { return [e.clientX, e.clientY]; }
cv.addEventListener('pointerdown', e => {
  SND.unlock(); if (G.state !== 'play') return; const [x, y] = pos(e); const v = nodeAt(x, y);
  try { cv.setPointerCapture(e.pointerId); } catch (_) { }
  if (v < 0) return;
  if (!G.path.length || (G.moves.length === 0 && v !== cur())) { G.path = [v]; G.hintE = -1; const p = G.pts[v]; hop(p, null); SND.play('start'); KIT.vib(10); splash(p[0], p[1], 12, G.th.glow); drag = true; lastNear = v; hud(); return; }
  if (v === cur()) { drag = true; lastNear = v; return; }
  if (!tryMove(v)) { badMove(v); } else { drag = true; lastNear = v; }
});
cv.addEventListener('pointermove', e => {
  if (!drag || G.state !== 'play') return; const [x, y] = pos(e); const v = nodeAt(x, y, Math.max(G.nodeR * 1.5, G.sp * .3));
  if (v < 0 || v === lastNear) { if (v < 0) lastNear = -1; return; }
  lastNear = v; if (v === cur()) return;
  if (tryMove(v)) return;
  // 往回拖：撤销上一步
  if (G.path.length >= 2 && v === G.path[G.path.length - 2]) { undo(); return; }
  badMove(v);
});
['pointerup', 'pointercancel'].forEach(t => cv.addEventListener(t, () => { drag = false; lastNear = -1; }));
function badMove(v) { const c = cur(); if (c < 0) return; const adjE = LOGIC.adj(G.L)[c].some(e => (G.L.e[e][0] === v || G.L.e[e][1] === v)); if (!adjE) return; G.bump[v] = TIME; SND.play('bump'); KIT.vib(20);
  const e = LOGIC.adj(G.L)[c].find(e2 => G.L.e[e2][0] === v || G.L.e[e2][1] === v); const ed = G.L.e[e];
  KIT.toast(G.rem[e] === 0 ? '这条路已经画过啦' : ed[2] === 2 ? '溪水只能顺流而下' : '此路不通', 1000); }
/* ---------- 主循环 ---------- */
let last = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = last ? Math.min(.05, (now - last) / 1000) : .016; last = now; TIME += dt; BIRD.t += dt;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  const inGame = G.L && (G.state === 'play' || G.state === 'winanim' || G.state === 'win' || G.state === 'fail' || G.state === 'pause');
  if (G.state === 'play' && G.path.length && !G.stuck) { G.time += dt; if ((TIME * 4 | 0) !== ((TIME - dt) * 4 | 0)) hud(); }
  if (G.state === 'winanim') G.winT += dt;
  let sx = 0, sy = 0; if (G.shake > 0) { G.shake -= dt; sx = R(-5, 5) * G.shake * 2; sy = R(-4, 4) * G.shake * 2; }
  ctx.save(); ctx.translate(sx, sy);
  if (inGame) {
    const v = G.th.veil; drawBg(dt, { col: v.join(','), a: .62 });
    G.deco.forEach(d => drawDeco(d, dt));
    drawEdges(dt); drawNodes(); drawBirdHead(dt); drawParts(dt);
    if (G.state === 'winanim') { const a = Math.max(0, .5 - Math.abs(G.winT - .4)) ; if (a > 0) { ctx.fillStyle = `rgba(255,248,220,${a})`; ctx.fillRect(0, 0, W, H); } if (Math.random() < .5) { const p = G.pts[G.path[(Math.random() * G.path.length) | 0]]; burst(p[0], p[1], 2, ['#ffb3c8', '#ffe27a', '#9ff5e2', '#ffffff']); } }
  } else { drawBg(dt, null); drawMenuBird(dt); drawParts(dt); }
  ctx.restore();
}
function drawMenuBird(dt) {
  if (G.state !== 'menu') return; const el = $('mHero'); const r = el.getBoundingClientRect(); if (!r.width) return;
  const h = r.height, cx = r.left + r.width / 2, cy = r.top + h / 2 + Math.sin(TIME * 1.5) * 5;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .55 + .15 * Math.sin(TIME * 2); ctx.drawImage(glow('#9ff5e2'), cx - h * .8, cy - h * .8, h * 1.6, h * 1.6); ctx.restore();
  ctx.fillStyle = 'rgba(10,30,28,.25)'; ctx.beginPath(); ctx.ellipse(cx, r.bottom - 4, h * .3, h * .05, 0, 0, 7); ctx.fill();
  drawBird(cx, cy, h * .96, false, BIRD.t);
  if (Math.random() < dt * 6) G.parts.push({ k: Math.random() < .4 ? 'petal' : 'spark', c: pick(['#ffe27a', '#9ff5e2', '#ffb3c8', '#ffffff']), x: cx + R(-h * .5, h * .5), y: cy + R(-h * .4, h * .3), vx: R(-20, 20), vy: R(-50, -20), life: R(1.2, 2.2), t: 0, s: R(8, 16), g: 10, rot: R(0, 6), vr: R(-3, 3) });
}
/* ---------- 界面 ---------- */
function totalStars() { return S.stars.reduce((q, s) => q + (s || 0), 0); }
function showMenu() { G.state = 'menu'; $('hud').classList.remove('on'); G.parts = []; KIT.show('menu'); $('mStat').textContent = `已点亮 ★ ${totalStars()} / ${LEVELS.length * 3} · 指路 ${S.hints} 次`; $('bPlay').textContent = S.cur ? '继 续 绘 卷' : (S.unlocked > 1 ? '继 续 绘 卷' : '开 始 绘 卷'); }
function showLevels() {
  G.state = 'levels'; KIT.show('levels'); $('lvTot').textContent = `已点亮 ★ ${totalStars()} / ${LEVELS.length * 3}`;
  KIT.levelGrid('lvList', { count: LEVELS.length, current: Math.min(S.unlocked, LEVELS.length) - 1,
    groups: CHAPTERS.map((c, i) => ({ title: `${c.name}<small>${CH_THEME[i].tag}</small>`, from: c.from, to: c.to })),
    unlocked: i => i < S.unlocked, stars: i => S.stars[i] || 0, cls: i => 'c' + CHAPTERS.findIndex(c => i + 1 >= c.from && i + 1 <= c.to),
    onPick: i => { SND.play('click'); startLevel(i, S.cur); }, onLocked: () => { SND.play('bump'); KIT.toast('先完成前面的关卡'); } });
  try { KIT.gt().title('levels'); } catch (e) { }
}
function showIntro(it) {
  G.state = 'pause'; $('iTitle').textContent = it.t; $('iText').innerHTML = it.d; drawIntro(G.idx); KIT.show('intro');
}
function drawIntro(i) { // 小插图：用游戏内同款元素画一段示意
  const c = $('introC'), x = c.getContext('2d'); x.clearRect(0, 0, c.width, c.height);
  x.fillStyle = 'rgba(255,250,235,.92)'; x.beginPath(); x.roundRect ? x.roundRect(0, 0, 480, 300, 26) : x.rect(0, 0, 480, 300); x.fill();
  const P = [[90, 210], [240, 80], [390, 210], [240, 250]]; x.lineCap = 'round';
  const line = (a, b, st, w) => { x.strokeStyle = st; x.lineWidth = w; x.beginPath(); x.moveTo(a[0], a[1]); x.lineTo(b[0], b[1]); x.stroke(); };
  if (i === 6) { line(P[0], P[1], '#173c37', 14); line(P[1], P[2], 'rgba(255,255,255,1)', 30); line(P[1], P[2], 'rgba(150,170,190,.8)', 3); const g = x.createLinearGradient(P[2][0], P[2][1], P[0][0], P[0][1]); ['#ff9a9a', '#ffd27a', '#9ff59a', '#8fd8ff', '#c9a8ff'].forEach((cc, k) => g.addColorStop(k / 4, cc)); line(P[2], P[3], g, 16); line(P[3], P[0], 'rgba(23,60,55,.4)', 6); }
  else if (i === 12) { line(P[0], P[1], '#173c37', 14); line(P[1], P[2], 'rgba(70,150,210,.6)', 24); line(P[1], P[2], 'rgba(190,235,255,1)', 6); for (let k = 1; k < 4; k++) { const t = k / 4, px = lerp(P[1][0], P[2][0], t), py = lerp(P[1][1], P[2][1], t); x.save(); x.translate(px, py); x.rotate(Math.atan2(P[2][1] - P[1][1], P[2][0] - P[1][0])); x.strokeStyle = '#fff'; x.lineWidth = 4; x.beginPath(); x.moveTo(-8, -9); x.lineTo(5, 0); x.lineTo(-8, 9); x.stroke(); x.restore(); } line(P[2], P[3], 'rgba(23,60,55,.4)', 6); }
  else { line(P[0], P[1], '#173c37', 14); line(P[1], P[2], '#173c37', 14); line(P[2], P[3], 'rgba(23,60,55,.4)', 6); line(P[3], P[0], 'rgba(23,60,55,.4)', 6); line(P[1], P[3], 'rgba(23,60,55,.4)', 6); }
  P.forEach(p => { const g = x.createRadialGradient(p[0] - 8, p[1] - 8, 2, p[0], p[1], 24); g.addColorStop(0, '#fff'); g.addColorStop(1, '#8fb8aa'); x.fillStyle = g; x.beginPath(); x.arc(p[0], p[1], 20, 0, 7); x.fill(); x.strokeStyle = '#173c37'; x.lineWidth = 4; x.stroke(); });
  if (i === 18 && IMG.beast.naturalWidth) x.drawImage(IMG.beast, 300, 120, 170, 130);
  if (i === 4) { x.font = '900 26px sans-serif'; x.fillStyle = '#d8452e'; x.fillText('3', P[0][0] - 8, P[0][1] + 50); x.fillText('3', P[2][0] - 8, P[2][1] + 50); }
  if (BIRD.ok || IMG.birdS.naturalWidth) { const im = BIRD.ok ? BIRD.sheets[0] : IMG.birdS; x.drawImage(im, 0, 0, BIRD.fw, BIRD.fh, P[2][0] - 40, P[2][1] - 92, 80, 84); }
}
function pause() { if (G.state !== 'play') return; G.state = 'pause'; KIT.show('pause'); try { KIT.gt().pause(); } catch (e) { } save(); }
function resume() { G.state = 'play'; KIT.show(null); $('hud').classList.add('on'); }
function syncToggles() { ['tMusic', 'pMusic'].forEach(id => $(id).classList.toggle('off', !S.music)); ['tSfx', 'pSfx'].forEach(id => $(id).classList.toggle('off', !S.sfx)); }
function bind(id, f) { $(id).addEventListener('click', e => { SND.unlock(); f(e); }); }
bind('bPlay', () => { SND.play('click'); SND.startMusic(); try { KIT.gt().title('play'); } catch (e) { } if (S.cur && S.cur.idx < LEVELS.length) startLevel(S.cur.idx, S.cur); else startLevel(Math.min(S.unlocked, LEVELS.length) - 1); });
bind('bLevels', () => { SND.play('click'); SND.startMusic(); showLevels(); });
bind('lvBack', () => { SND.play('click'); showMenu(); });
bind('hPause', () => { SND.play('click'); pause(); });
bind('hUndo', () => undo());
bind('hRestart', () => restart());
bind('hHint', () => hint());
bind('pResume', () => { SND.play('click'); resume(); });
bind('pRestart', () => restart());
bind('pQuit', () => { SND.play('click'); try { KIT.gt().quit('menu'); } catch (e) { } save(); $('hud').classList.remove('on'); showLevels(); });
bind('iOk', () => { SND.play('click'); resume(); });
bind('wRetry', () => { S.cur = null; startLevel(G.idx); });
bind('wMenu', () => { SND.play('click'); showLevels(); });
bind('wNext', () => { SND.play('click'); startLevel(G.idx + 1); });
bind('fUndo', () => undo());
bind('fHint', () => hint());
bind('fRetry', () => restart());
const tgMusic = () => { S.music = !S.music; SND.setMusic(S.music); if (S.music) SND.startMusic(); syncToggles(); save(); };
const tgSfx = () => { S.sfx = !S.sfx; SND.setSfx(S.sfx); syncToggles(); save(); };
bind('tMusic', tgMusic); bind('pMusic', tgMusic); bind('tSfx', tgSfx); bind('pSfx', tgSfx);
KIT.init({ game: 'stroke', save, hubButtons: ['mHub', 'pHub', 'wHub', 'fHub'], onHide: () => { if (G.state === 'play') pause(); } });
addEventListener('resize', resize); resize();
SND.A.musicOn = S.music; SND.A.sfxOn = S.sfx; syncToggles();
requestAnimationFrame(frame);
loadAll(() => { setTimeout(showMenu, 150); });
// 自动化测试接口
window.__stroke = { G, S, LEVELS, start: startLevel, move: tryMove, startAt: v => { G.path = [v]; hop(G.pts[v], null); hud(); }, solve: () => LOGIC.solve(G.L, 400000), pts: () => G.pts, hint };
