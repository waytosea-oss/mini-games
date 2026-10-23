/* ===== 魔法药水铺 · 规则引擎 + 求解器（游戏、关卡生成器、提示共用同一套规则） ===== */
(function (root) {
'use strict';
// 单位液体: 低4位=颜色, 16=神秘(未揭示)
const HID = 16;
const col = v => v & 15;
function mkState(lv) {
  return {
    t: lv.tubes.map(t => ({ cap: t.cap || 4, kind: t.kind || 0, ice: t.ice || 0, seal: 0, u: t.u.map((c, i) => c | ((t.h && i < t.u.length - 1 && t.h[i]) ? HID : 0)) })),
    orders: lv.orders.slice(), counter: [], qi: 0, moves: 0
  };
}
function initCounter(s, k) { s.counter = []; for (let i = 0; i < k; i++) s.counter.push(s.qi < s.orders.length ? s.orders[s.qi++] : -1); }
function clone(s) { return { t: s.t.map(t => ({ cap: t.cap, kind: t.kind, ice: t.ice, seal: t.seal, u: t.u.slice() })), orders: s.orders, counter: s.counter.slice(), qi: s.qi, moves: s.moves }; }
function topRun(t) {
  const n = t.u.length; if (!n) return 0; const c = t.u[n - 1]; let k = 1;
  while (k < n && t.u[n - 1 - k] === c) k++; // 神秘层数值不同(带HID位)，自然截断
  return k;
}
function usable(t) { return !t.seal && t.ice <= 0; }
function canPour(s, a, b) {
  if (a === b) return false; const A = s.t[a], B = s.t[b];
  if (!A || !B || !usable(A) || !usable(B) || !A.u.length || B.u.length >= B.cap) return false;
  return !B.u.length || B.u[B.u.length - 1] === A.u[A.u.length - 1];
}
function pour(s, a, b) {
  const A = s.t[a], B = s.t[b], c = A.u[A.u.length - 1];
  const n = Math.min(topRun(A), B.cap - B.u.length);
  for (let i = 0; i < n; i++) { A.u.pop(); B.u.push(c); }
  const ev = { a, b, n, c, revealed: -1, thawed: [], sealed: -1 };
  if (A.u.length && (A.u[A.u.length - 1] & HID)) { A.u[A.u.length - 1] &= 15; ev.revealed = A.u.length - 1; }
  for (let i = 0; i < s.t.length; i++) { const t = s.t[i]; if (t.ice > 0) { t.ice--; if (t.ice === 0) ev.thawed.push(i); } }
  if (B.kind === 0 && B.u.length === B.cap && B.u.every(v => v === c)) { B.seal = c + 1; ev.sealed = b; }
  s.moves++;
  return ev;
}
// 处理交付：封好的药水若柜台有人要，就交出去，瓶子换成空瓶，下一位顾客上前。返回事件列表
function deliverOne(s) {
  for (let i = 0; i < s.t.length; i++) {
    const t = s.t[i]; if (!t.seal) continue;
    const slot = s.counter.indexOf(t.seal - 1);
    if (slot < 0) continue;
    const c = t.seal - 1; t.seal = 0; t.u = [];
    const nc = s.qi < s.orders.length ? s.orders[s.qi++] : -1;
    s.counter[slot] = nc;
    return { tube: i, slot, c, next: nc };
  }
  return null;
}
function deliverAll(s) { const out = []; let e; while ((e = deliverOne(s))) out.push(e); return out; }
function isWin(s) { return s.qi >= s.orders.length && s.counter.every(c => c < 0) && s.t.every(t => !t.seal); }
function moves(s, prune) {
  const out = [];
  for (let a = 0; a < s.t.length; a++) {
    const A = s.t[a]; if (!A.u.length || !usable(A)) continue;
    const run = topRun(A), uniform = run === A.u.length;
    let emptyTried = false;
    for (let b = 0; b < s.t.length; b++) {
      if (!canPour(s, a, b)) continue;
      const B = s.t[b];
      if (prune) {
        if (!B.u.length) {
          if (uniform && A.kind === B.kind && A.cap === B.cap) continue; // 整瓶同色倒进同型空瓶 = 无意义
          if (emptyTried && B.kind === 0) continue; emptyTried = B.kind === 0 ? true : emptyTried;
        }
      }
      out.push([a, b]);
    }
  }
  return out;
}
function key(s) {
  const parts = s.t.map(t => t.kind + '' + t.cap + (t.ice > 0 ? 'i' + t.ice : '') + (t.seal ? 's' + t.seal : '') + ':' + t.u.join(','));
  parts.sort();
  return parts.join('|') + '#' + s.counter.slice().sort().join(',') + '@' + s.qi;
}
function heur(s) {
  let h = 0;
  for (const t of s.t) {
    const n = t.u.length; if (!n) continue;
    let seg = 1; for (let i = 1; i < n; i++) if (t.u[i] !== t.u[i - 1]) seg++;
    h += seg; if (t.kind === 1) h += 1; // 坩埚里的东西最终都要倒出
    if (t.ice > 0) h += 1;
    if (t.seal) h += 1;
  }
  h += (s.orders.length - s.qi) + s.counter.filter(c => c >= 0).length;
  return h;
}
// 加权 A*：返回走法序列（[a,b]...）或 null
function solve(s0, limit = 300000, w = 2) {
  const start = clone(s0); deliverAll(start);
  if (isWin(start)) return [];
  const heap = []; const push = (n) => { heap.push(n); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p].f <= heap[i].f) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = i * 2 + 1, r = l + 1; let m = i; if (l < heap.length && heap[l].f < heap[m].f) m = l; if (r < heap.length && heap[r].f < heap[m].f) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
  const seen = new Map(); seen.set(key(start), 0);
  push({ s: start, g: 0, f: w * heur(start), path: null });
  let nodes = 0;
  while (heap.length) {
    const nd = pop(); nodes++;
    if (nodes > limit) return null;
    for (const [a, b] of moves(nd.s, true)) {
      const s = clone(nd.s); pour(s, a, b); deliverAll(s);
      const g = nd.g + 1;
      const path = { m: [a, b], prev: nd.path };
      if (isWin(s)) { const out = []; for (let p = path; p; p = p.prev) out.push(p.m); solve.nodes = nodes; return out.reverse(); }
      const k = key(s); const og = seen.get(k);
      if (og !== undefined && og <= g) continue;
      seen.set(k, g);
      push({ s, g, f: g + w * heur(s), path });
    }
  }
  solve.nodes = nodes;
  return null;
}
const API = { HID, col, mkState, initCounter, clone, topRun, usable, canPour, pour, deliverOne, deliverAll, isWin, moves, key, heur, solve };
if (typeof module !== 'undefined') module.exports = API; else root.PL = API;
})(this);
