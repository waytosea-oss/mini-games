/* ===== 花瓣消消 · 核心模拟（浏览器与 Node 共用，固定 60Hz 步进） ===== */
(function (root) {
'use strict';
const PAL = [
  ['red', '#e8394a', '玫红'], ['wine', '#a8203c', '酒红'], ['pink', '#ff86b8', '樱粉'], ['blush', '#ffc2d4', '浅粉'], ['orange', '#ff8a1c', '橙'],
  ['yellow', '#ffd43a', '金黄'], ['cream', '#fbe6b4', '奶油'], ['lime', '#8bd64a', '嫩绿'], ['green', '#2f9142', '深绿'], ['mint', '#c2f0d0', '薄荷'],
  ['sky', '#92d2ff', '天蓝'], ['blue', '#2f72e6', '湛蓝'], ['navy', '#1f2c60', '藏青'], ['purple', '#9b5ae2', '紫罗兰'], ['lav', '#dccbf7', '薰衣草'],
  ['white', '#fdfbf6', '雪白'], ['brown', '#8c5a2e', '棕'], ['tan', '#dba868', '驼'], ['black', '#2a2232', '墨黑']];
function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
function decodeGrid(str, n) { const g = new Uint8Array(n); let i = 0; const re = /([a-z])(\d*)/g; let m; while ((m = re.exec(str))) { const c = m[1].charCodeAt(0) - 96, k = m[2] ? +m[2] : 1; g.fill(c, i, i + k); i += k; } return g; }
function encodeGrid(g) { let s = '', i = 0; while (i < g.length) { let j = i; while (j < g.length && g[j] === g[i]) j++; s += String.fromCharCode(96 + g[i]) + (j - i > 1 ? (j - i) : ''); i = j; } return s; }
const T_PLACE = 16, T_MERGE = 22, T_DONE = 30;
/* lv: {W,H,grid(Uint8 1..k local colour idx+1), cols:[global idx], slots, columns:[[ {c,cap,hid,frost,lock,key} ]]} */
function create(lv, seed) {
  const W = lv.W, H = lv.H, N = W * H, r = rng(seed || 12345);
  const g = new Uint8Array(lv.grid), v = new Uint8Array(N);
  for (let i = 0; i < N; i++) v[i] = (r() * 256) | 0;
  const remain = new Array(lv.cols.length).fill(0);
  for (let i = 0; i < N; i++) if (g[i]) remain[g[i] - 1]++;
  let id = 1;
  const columns = lv.columns.map(col => col.map(b => ({ id: id++, c: b.c, cap: b.cap, need: b.cap, hid: !!b.hid, frost: b.frost || 0, lock: !!b.lock, key: !!b.key, tier: 1 })));
  return { W, H, g, v, r, remain, total: N - 0, left: remain.reduce((a, b) => a + b, 0), cols: lv.cols, cap: lv.slots, belt: new Array(lv.slots).fill(null),
    columns, tick: 0, moved: 0, took: 0, idle: 0, ev: [], merges: 0, done: 0, placed: 0, stuck: 0, botCd: 0, lastTake: 0 };
}
function gravity(s) {
  const { W, H, g, v, r } = s; let moved = 0;
  const flip = s.tick & 1;
  for (let y = H - 2; y >= 0; y--) {
    const row = y * W, nrow = row + W, ltr = ((y + s.tick) & 1) === 0;
    for (let k = 0; k < W; k++) {
      const x = ltr ? k : W - 1 - k, i = row + x;
      const c = g[i]; if (!c) continue;
      if (!g[nrow + x]) { g[nrow + x] = c; v[nrow + x] = v[i]; g[i] = 0; moved++; continue; }
      const d = r() < 0.5 ? -1 : 1;
      let x2 = x + d;
      if (x2 >= 0 && x2 < W && !g[nrow + x2] && !g[row + x2]) { g[nrow + x2] = c; v[nrow + x2] = v[i]; g[i] = 0; moved++; continue; }
      x2 = x - d;
      if (x2 >= 0 && x2 < W && !g[nrow + x2] && !g[row + x2]) { g[nrow + x2] = c; v[nrow + x2] = v[i]; g[i] = 0; moved++; }
    }
  }
  return moved;
}
function freeSlot(s) { for (let i = 0; i < s.cap; i++) if (!s.belt[i]) return i; return -1; }
function freeCount(s) { let n = 0; for (let i = 0; i < s.cap; i++) if (!s.belt[i]) n++; return n; }
function canTap(s, ci) { const col = s.columns[ci]; if (!col || !col.length) return false; const b = col[0]; return !b.frost && !b.lock; }
function tap(s, ci) {
  if (!canTap(s, ci)) return -1;
  const si = freeSlot(s); if (si < 0) return -1;
  const b = s.columns[ci].shift(); b.hid = false;
  if (s.columns[ci][0]) { const nb = s.columns[ci][0]; if (nb.hid) { nb.hid = false; s.ev.push({ t: 'reveal', ci }); } }
  s.belt[si] = { id: b.id, c: b.c, cap: b.cap, need: b.need, tier: b.tier, key: b.key, st: 'fly', t: T_PLACE, from: ci, got: 0 };
  s.placed++; s.stuck = 0;
  s.ev.push({ t: 'place', si, ci, id: b.id });
  return si;
}
function addSlot(s) { s.cap++; s.belt.push(null); s.stuck = 0; }
function checkMerge(s) {
  const by = {};
  for (let i = 0; i < s.cap; i++) { const b = s.belt[i]; if (b && (b.st === 'idle' || b.st === 'fly') && b.need > 0) (by[b.c] = by[b.c] || []).push(i); }
  for (const c in by) if (by[c].length >= 3) {
    const [a, b2, d] = by[c].slice(0, 3); const A = s.belt[a], B = s.belt[b2], D = s.belt[d];
    const need = A.need + B.need + D.need, cap = A.cap + B.cap + D.cap;
    s.belt[a] = { id: A.id, c: A.c, cap, need, tier: Math.min(3, Math.max(A.tier, B.tier, D.tier) + 1), key: A.key || B.key || D.key, st: 'merge', t: T_MERGE, got: A.got + B.got + D.got };
    s.belt[b2] = { st: 'ghost', t: T_MERGE, c: B.c, to: a, id: B.id, need: 0 }; s.belt[d] = { st: 'ghost', t: T_MERGE, c: D.c, to: a, id: D.id, need: 0 };
    s.merges++; s.ev.push({ t: 'merge', into: a, from: [b2, d], c: A.c, tier: s.belt[a].tier });
    return true;
  }
  return false;
}
function onFull(s, si) {
  const b = s.belt[si]; b.st = 'done'; b.t = T_DONE; s.done++;
  s.ev.push({ t: 'full', si, c: b.c, tier: b.tier, key: b.key });
  for (const col of s.columns) for (const q of col) { if (q.frost > 0) { q.frost--; if (!q.frost) s.ev.push({ t: 'thaw', id: q.id }); } if (b.key && q.lock) { q.lock = false; s.ev.push({ t: 'unlock', id: q.id }); } }
}
const RATE = [0, 4, 6, 8];
function absorb(s) {
  const { W, H, g } = s, base = (H - 1) * W; let took = 0;
  for (let si = 0; si < s.cap; si++) {
    const b = s.belt[si]; if (!b || b.st !== 'idle' || b.need <= 0) continue;
    const cc = b.c + 1; let n = Math.min(RATE[b.tier], b.need);
    const off = (s.r() * W) | 0;
    for (let k = 0; k < W && n > 0; k++) {
      const x = (off + k * 37) % W, i = base + x;
      if (g[i] === cc) { g[i] = 0; n--; b.need--; b.got++; took++; s.remain[b.c]--; s.left--; s.ev.push({ t: 'take', si, x, y: H - 1, c: b.c, v: s.v[i] }); }
    }
    if (b.need <= 0) onFull(s, si);
  }
  return took;
}
function step(s) {
  s.tick++;
  // timers
  for (let i = 0; i < s.cap; i++) {
    const b = s.belt[i]; if (!b) continue;
    if (b.st === 'fly' || b.st === 'merge') { if (--b.t <= 0) b.st = 'idle'; }
    else if (b.st === 'ghost') { if (--b.t <= 0) s.belt[i] = null; }
    else if (b.st === 'done') { if (--b.t <= 0) { s.belt[i] = null; s.ev.push({ t: 'leave', si: i }); } }
  }
  checkMerge(s);
  const m1 = gravity(s), m2 = gravity(s);
  s.moved = m1 + m2;
  s.took = absorb(s);
  if (s.took) s.lastTake = s.tick;
  // stuck detection
  const busy = s.belt.some(b => b && b.st !== 'idle');
  if (!busy && !s.moved && !s.took && s.left > 0) {
    const anyTap = s.columns.some((c, i) => canTap(s, i));
    if (freeSlot(s) < 0 || !anyTap) s.stuck++; else s.stuck = 0;
  } else s.stuck = 0;
  return s;
}
function won(s) { return s.left <= 0 && !s.belt.some(b => b && b.st !== 'done' && b.st !== 'ghost' && b.need > 0); }
function lost(s) { return s.stuck > 20; }
/* ---------- 机器人：同一套逻辑供关卡验证与 ?bot 演示 ---------- */
function analyse(s) {
  const { W, H, g } = s, k = s.cols.length;
  const exp = new Array(k).fill(0), depth = new Array(k).fill(1e9);
  const base = (H - 1) * W;
  for (let x = 0; x < W; x++) { const c = g[base + x]; if (c) exp[c - 1]++; }
  for (let x = 0; x < W; x++) { for (let y = H - 1; y >= 0; y--) { const c = g[y * W + x]; if (!c) break; const d = H - 1 - y; if (d < depth[c - 1]) depth[c - 1] = d; } }
  // 更准确：每列自下而上第一个出现该色的高度（只考虑实心堆）
  return { exp, depth };
}
function botPick(s) {
  const free = freeCount(s);
  const k = s.cols.length, beltN = new Array(k).fill(0), beltNeed = new Array(k).fill(0);
  let busy = false;
  for (const b of s.belt) if (b && b.st !== 'ghost' && b.st !== 'done' && b.need > 0) { beltN[b.c]++; beltNeed[b.c] += b.need; if (b.st !== 'idle') busy = true; }
  const { exp, depth } = analyse(s);
  const idle = !busy && s.tick - s.lastTake > 20 && s.moved === 0;
  let best = -1, bs = -1e9;
  for (let ci = 0; ci < s.columns.length; ci++) {
    if (!canTap(s, ci)) continue;
    const col = s.columns[ci], b = col[0], c = b.c;
    let sc;
    if (beltN[c] === 2) sc = 1000;
    else if (exp[c] > 0 && beltNeed[c] === 0) sc = 500 + exp[c];
    else if (exp[c] > 0) sc = 200 + (beltN[c] === 1 ? 20 : 0);
    else if (beltN[c] === 1) sc = free >= 3 ? 150 : 40;
    else sc = 60 - Math.min(depth[c], 50);
    const nx = col[1];
    if (nx && !nx.frost && !nx.lock && !nx.hid) {
      if (beltN[nx.c] === 2 || (beltN[nx.c] === 1 && c === nx.c)) sc += 60;
      else if (exp[nx.c] > 0 && beltNeed[nx.c] === 0) sc += 45;
    }
    if (b.key) sc += 35;
    if (sc > bs) { bs = sc; best = ci; }
  }
  return { best, bs, free, idle };
}
function botMove(s) {
  const { best, bs, free, idle } = botPick(s);
  if (free <= 0 || best < 0) return -1;
  if (bs >= 1000) return best;
  if (free >= 2 && bs >= 500) return best;
  if (free >= 3 && bs >= 150) return best;
  if (idle && free >= 2) return best;
  if (idle && free === 1 && (bs >= 200 || s.tick - s.lastTake > 90)) return best;
  return -1;
}
/* ---------- 道具 ---------- */
function beeFill(s, si) {
  const b = s.belt[si]; if (!b || b.st === 'ghost' || b.st === 'done' || b.need <= 0) return false;
  const { W, H, g } = s, cc = b.c + 1; let n = b.need; const out = [];
  for (let y = H - 1; y >= 0 && n > 0; y--) for (let x = 0; x < W && n > 0; x++) { const i = y * W + x; if (g[i] === cc) { g[i] = 0; n--; out.push(i); } }
  const got = b.need - n; b.need = n; b.got += got; s.remain[b.c] -= got; s.left -= got;
  s.ev.push({ t: 'bee', si, cells: out, c: b.c });
  if (b.need <= 0) { if (b.st !== 'idle') b.st = 'idle'; onFull(s, si); }
  s.stuck = 0; return true;
}
function shuffleQueue(s) {
  const pos = [], pool = [];
  s.columns.forEach((col, ci) => col.forEach((b, k) => { if (!b.frost && !b.lock && !b.key) { pos.push([ci, k]); pool.push(b); } }));
  if (pool.length < 2) return false;
  const { exp } = analyse(s); const onBelt = new Array(s.cols.length).fill(0);
  for (const b of s.belt) if (b && b.need > 0 && b.st !== 'ghost') onBelt[b.c]++;
  for (let i = pool.length - 1; i > 0; i--) { const j = (s.r() * (i + 1)) | 0; [pool[i], pool[j]] = [pool[j], pool[i]]; }
  const useful = b => (onBelt[b.c] === 2 ? 3 : 0) + (exp[b.c] > 0 && !onBelt[b.c] ? 2 : 0) + (exp[b.c] > 0 ? 1 : 0);
  pool.sort((a, b) => useful(b) - useful(a));
  pos.sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  pos.forEach(([ci, k], i) => { s.columns[ci][k] = pool[i]; });
  for (const col of s.columns) if (col[0] && col[0].hid) col[0].hid = false;
  s.stuck = 0; s.ev.push({ t: 'shuffle' }); return true;
}
const API = { PAL, rng, create, step, tap, canTap, addSlot, freeSlot, freeCount, won, lost, botMove, analyse, decodeGrid, encodeGrid, onFull, RATE, botPick, beeFill, shuffleQueue, T_PLACE, T_MERGE, T_DONE };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.SIM = API;
})(typeof window !== 'undefined' ? window : globalThis);
