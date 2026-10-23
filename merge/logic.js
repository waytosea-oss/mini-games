/* ===== 一合到底 · 规则内核（纯逻辑，浏览器与 Node 共用） ===== */
(function (root) {
'use strict';
const CAP = 10, ROWS = 11, NT = 34;
// 牌阶：一筒…九筒(0-8) 一条…九条(9-17) 一万…九万(18-26) 東南西北(27-30) 中發白(31-33)
const NUM = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];
const HON = ['東', '南', '西', '北', '中', '發', '白'];
function tileName(t) {
  if (t < 9) return NUM[t] + '筒'; if (t < 18) return NUM[t - 9] + '条'; if (t < 27) return NUM[t - 18] + '万';
  return ['东风', '南风', '西风', '北风', '红中', '发财', '白板'][t - 27];
}
// 关卡目标（合出此牌即过关）
const GOALS = [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33];
// 行的初始状态：0-3 里程碑行（合出对应牌后永久解锁），4-8 开放，9 临时解锁行，10 金币永久解锁行
const MILE = { 3: 2, 2: 5, 1: 8, 0: 12 }; // 行号 → 需要合出的牌阶
const TEMP_ROW = 9, BUY_ROW = 10;
function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function newState() {
  const rows = [];
  for (let i = 0; i < ROWS; i++) rows.push({ t: [], st: (i >= 4 && i <= 8) ? 'open' : (i === TEMP_ROW ? 'temp' : (i === BUY_ROW ? 'buy' : 'mile')), exp: false });
  return { rows, top: 0, stage: 0, score: 0, merges: 0, deals: 0, coins: 0, tempFree: true };
}
const isOpen = r => r.st === 'open' || r.st === 'tempOn';
function topTier(r) { return r.t.length ? r.t[r.t.length - 1] : -1; }
function runLen(r) { const n = r.t.length; if (!n) return 0; const v = r.t[n - 1]; let k = 1; while (k < n && r.t[n - 1 - k] === v) k++; return k; }
function canMove(s, a, b) {
  if (a === b) return 0; const A = s.rows[a], B = s.rows[b];
  if (!isOpen(A) || !isOpen(B) || !A.t.length) return 0;
  const v = topTier(A); if (B.t.length && topTier(B) !== v) return 0;
  return Math.min(runLen(A), CAP - B.t.length);
}
function move(s, a, b) {
  const n = canMove(s, a, b); if (!n) return 0;
  const A = s.rows[a], B = s.rows[b];
  const moved = A.t.splice(A.t.length - n, n); B.t.push(...moved);
  expire(s); return n;
}
function expire(s) { for (const r of s.rows) if (r.st === 'tempOn' && r.exp && !r.t.length) { r.st = 'temp'; r.exp = false; } }
function full10(r) { return r.t.length === CAP && r.t.every(v => v === r.t[0]) && r.t[0] < NT - 1; }
function mergeable(s) { const o = []; s.rows.forEach((r, i) => { if (isOpen(r) && full10(r)) o.push(i); }); return o; }
// 合成：每行 10 张同牌 → 2 张下一阶（白板为最高阶）
function merge(s) {
  const res = [];
  for (const i of mergeable(s)) {
    const r = s.rows[i], from = r.t[0], to = from + 1;
    r.t = [to, to]; s.merges++; s.score += (to + 1) * 10; s.coins += 2 + Math.floor(to / 3);
    const newTop = to > s.top; if (newTop) s.top = to;
    res.push({ row: i, from, to, newTop });
  }
  const unl = []; // 里程碑解锁
  s.rows.forEach((r, i) => { if (r.st === 'mile' && MILE[i] !== undefined && s.top >= MILE[i]) { r.st = 'open'; unl.push(i); } });
  return { res, unl };
}
function freeSpace(s) { let f = 0; for (const r of s.rows) if (isOpen(r)) f += CAP - r.t.length; return f; }
function dealWindow(s) { const hi = s.top; const lo = Math.max(0, hi - (s.top >= 4 ? 4 : 3)); return [lo, hi]; }
// 发牌：每个有空位的行补 1~3 张
function deal(s, rnd) {
  rnd = rnd || Math.random;
  const [lo, hi] = dealWindow(s); const span = hi - lo + 1;
  const pick = () => { // 偏向低阶，越低越多
    let tot = 0; const w = []; for (let k = 0; k < span; k++) { const q = (k === span - 1 && span > 1) ? 0.6 : span - k + 1; w.push(q); tot += q; }
    let x = rnd() * tot; for (let k = 0; k < span; k++) { x -= w[k]; if (x <= 0) return lo + k; } return lo;
  };
  const out = [];
  s.rows.forEach((r, i) => {
    if (!isOpen(r) || (r.st === 'tempOn' && r.exp)) return; const free = CAP - r.t.length; if (free <= 0) return;
    let c = [1, 2, 2, 3, 3][Math.floor(rnd() * 5)]; c = Math.min(c, free);
    const same = rnd() < 0.55; let v = pick();
    const tp = topTier(r); if (tp >= lo && tp <= hi && rnd() < 0.4) v = tp;
    for (let k = 0; k < c; k++) { const t = (same || k === 0) ? v : pick(); r.t.push(t); out.push({ row: i, idx: r.t.length - 1, t }); }
  });
  if (out.length) s.deals++;
  return out;
}
function stuck(s) { return freeSpace(s) === 0 && mergeable(s).length === 0; }
function anyMove(s) { for (let a = 0; a < ROWS; a++) for (let b = 0; b < ROWS; b++) if (canMove(s, a, b)) return true; return false; }
// 道具：消除——清掉牌桌上最低阶的所有牌
function lowestTier(s) { let m = 99; for (const r of s.rows) if (isOpen(r)) for (const v of r.t) if (v < m) m = v; return m === 99 ? -1 : m; }
function clearLowest(s) {
  const m = lowestTier(s); if (m < 0) return [];
  const out = []; s.rows.forEach((r, i) => { if (!isOpen(r)) return; r.t.forEach((v, k) => { if (v === m) out.push({ row: i, idx: k, t: v }); }); r.t = r.t.filter(v => v !== m); });
  expire(s); return out;
}
// 道具：理牌——同一行内按牌阶整理（相同牌聚拢到右侧）
function sortRows(s) { for (const r of s.rows) if (isOpen(r)) { const c = {}; for (const v of r.t) c[v] = (c[v] || 0) + 1; r.t.sort((a, b) => (c[a] - c[b]) || (b - a)); } }
// 机器人：评估一步
function botStep(s) {
  if (mergeable(s).length) return { type: 'merge' };
  let best = null, bs = -1e9;
  for (let a = 0; a < ROWS; a++) for (let b = 0; b < ROWS; b++) {
    const n = canMove(s, a, b); if (!n) continue;
    const A = s.rows[a], B = s.rows[b], run = runLen(A);
    let sc;
    if (B.t.length) {
      const rb = runLen(B);
      if (n < run && B.t.length + n < CAP) continue;           // 只挪一半且凑不满 → 不划算
      if (rb < run || (rb === run && a < b)) { if (!(n === run && A.t.length === run)) continue; } // 小并入大，避免来回挪
      sc = 100 + rb + n + (A.t.length === n ? 8 : 0) + (B.t.length + n === CAP ? 40 : 0);
    } else { if (A.t.length === run || run < 3) continue; sc = 20 + run; }
    if (sc > bs) { bs = sc; best = { type: 'move', a, b }; }
  }
  if (best && bs > 0) return best;
  if (freeSpace(s) > 0) return { type: 'deal' };
  if (best) return best;
  return null;
}
const API = { CAP, ROWS, NT, GOALS, MILE, TEMP_ROW, BUY_ROW, tileName, newState, isOpen, topTier, runLen, canMove, move, mergeable, merge, deal, freeSpace, stuck, anyMove, lowestTier, clearLowest, sortRows, dealWindow, botStep, mulberry, expire };
if (typeof module !== 'undefined') module.exports = API; else root.LOGIC = API;
})(this);
