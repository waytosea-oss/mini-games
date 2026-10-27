// 关卡生成器：随机装瓶 → 加权A*求解验证（带订单/冰冻/神秘层/坩埚规则）→ 按难度挑选 → 输出 levels.js
const P = require('../logic.js');
const fs = require('fs');
let seed = 12345; const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const ri = n => Math.floor(rand() * n);
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = ri(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
// k种颜色, d种双份, e空瓶, c坩埚, h神秘瓶数, ice冰冻计数, K柜台, hard
const SPEC = [
  null,
  { hand: 1 },
  { k: 3, d: 0, e: 2, K: 2 },
  { k: 3, d: 1, e: 2, K: 2 },
  { k: 4, d: 0, e: 2, K: 3 },
  { k: 4, d: 1, e: 2, K: 3, hard: 1 },
  { k: 5, d: 0, e: 2, K: 3 },
  { k: 5, d: 1, e: 2, K: 3 },
  { k: 4, d: 1, e: 2, h: 2, K: 3, intro: 'hid' },
  { k: 5, d: 1, e: 2, h: 3, K: 3 },
  { k: 5, d: 1, e: 1, h: 1, K: 3, hard: 1 },
  { k: 6, d: 1, e: 2, h: 3, K: 3 },
  { k: 5, d: 1, e: 2, ice: [5], K: 3, intro: 'ice' },
  { k: 6, d: 1, e: 2, ice: [6], K: 3 },
  { k: 6, d: 1, e: 2, h: 2, ice: [7], K: 3 },
  { k: 6, d: 1, e: 1, h: 2, K: 3, hard: 1 },
  { k: 6, d: 1, e: 1, c: 1, K: 3, intro: 'cau' },
  { k: 7, d: 0, e: 1, c: 1, h: 2, K: 3 },
  { k: 7, d: 1, e: 2, ice: [6, 9], K: 3 },
  { k: 7, d: 1, e: 2, h: 4, K: 3 },
  { k: 7, d: 1, e: 1, h: 2, ice: [6], K: 3, hard: 1 },
  { k: 8, d: 0, e: 1, c: 1, h: 2, K: 3 },
  { k: 8, d: 1, e: 2, h: 3, ice: [7], K: 3 },
  { k: 8, d: 2, e: 2, h: 3, K: 3 },
  { k: 9, d: 1, e: 2, h: 4, K: 3 },
  { k: 9, d: 1, e: 1, c: 1, h: 3, K: 3, hard: 1 },
  { k: 9, d: 1, e: 2, h: 3, ice: [6, 10], K: 3 },
  { k: 9, d: 2, e: 2, h: 4, K: 3 },
  { k: 9, d: 2, e: 2, h: 3, ice: [9], K: 3 },
  { k: 9, d: 2, e: 1, c: 1, h: 3, ice: [8], K: 3 },
  { k: 9, d: 2, e: 1, h: 4, ice: [8], K: 3, hard: 1 },
];
// 颜色引入顺序（前期用对比最强的）
const ORDER = [0, 7, 2, 4, 3, 5, 6, 1, 8];
function build(sp) {
  const cols = shuffle(ORDER.slice(0, sp.k).slice());
  const dbl = cols.slice(0, sp.d);
  const units = []; const orders = [];
  for (const c of cols) { units.push(c, c, c, c); orders.push(c); }
  for (const c of dbl) { units.push(c, c, c, c); orders.push(c); }
  shuffle(units);
  const tubes = [];
  for (let i = 0; i < units.length; i += 4) tubes.push({ u: units.slice(i, i + 4) });
  // 拒绝：已有整瓶同色或者三连同色过多
  let triples = 0;
  for (const t of tubes) {
    if (t.u.every(v => v === t.u[0])) return null;
    for (let i = 0; i + 2 < 4; i++) if (t.u[i] === t.u[i + 1] && t.u[i] === t.u[i + 2]) triples++;
  }
  if (triples > Math.max(1, tubes.length / 5)) return null;
  const filled = tubes.length;
  const idx = shuffle([...Array(filled).keys()]);
  let p = 0;
  for (let i = 0; i < (sp.h || 0); i++) { tubes[idx[p++]].h = [1, 1, 1, 0]; }
  for (const n of (sp.ice || [])) { tubes[idx[p++]].ice = n; }
  for (let i = 0; i < sp.e; i++) tubes.push({ u: [] });
  if (sp.c) tubes.push({ u: [], kind: 1, cap: 8 });
  shuffle(orders);
  // 第一位顾客要的别跟开局就快完成的冲突：无所谓，交给求解器
  return { tubes, orders, K: sp.K };
}
function trySolve(lv, limit) {
  const s = P.mkState(lv); P.initCounter(s, lv.K);
  const t0 = Date.now(); const sol = P.solve(s, limit, 2);
  return { sol, nodes: P.solve.nodes, ms: Date.now() - t0 };
}
function greedy(lv, runs) {
  let ok = 0;
  for (let r = 0; r < runs; r++) {
    const s = P.mkState(lv); P.initCounter(s, lv.K); P.deliverAll(s);
    let last = null, steps = 0;
    while (!P.isWin(s) && steps < 160) {
      let ms = P.moves(s, true).filter(m => !(last && m[0] === last[1] && m[1] === last[0]));
      if (!ms.length) break;
      // 人类式贪心：优先能合并到同色的，其次随机
      const sc = ms.map(([a, b]) => { const B = s.t[b]; let v = rand() * 2.2; if (B.u.length) v += 2; if (s.t[a].u.length === P.topRun(s.t[a])) v -= 1; return v; });
      let bi = 0; for (let i = 1; i < ms.length; i++) if (sc[i] > sc[bi]) bi = i;
      last = ms[bi]; P.pour(s, ms[bi][0], ms[bi][1]); P.deliverAll(s); steps++;
    }
    if (P.isWin(s)) ok++;
  }
  return ok / runs;
}
function verify(lv, sol) {
  const s = P.mkState(lv); P.initCounter(s, lv.K); P.deliverAll(s);
  for (const [a, b] of sol) { if (!P.canPour(s, a, b)) return false; P.pour(s, a, b); P.deliverAll(s); }
  return P.isWin(s);
}
const out = [];
for (let L = 1; L <= 30; L++) {
  const sp = SPEC[L];
  if (sp.hand) {
    const lv = { tubes: [{ u: [4, 4, 2, 2] }, { u: [2, 2, 4, 4] }, { u: [] }], orders: [2, 4], K: 2 };
    const r = trySolve(lv, 1e5); lv.par = r.sol.length; lv.sol = r.sol; out.push(lv); console.log(L, 'hand par', lv.par); continue;
  }
  seed = 1000 + L * 7919;
  const cands = []; let tries = 0;
  const want = sp.hard ? 14 : 8;
  while (cands.length < want && tries < 3000) {
    tries++;
    const lv = build(sp); if (!lv) continue;
    const r = trySolve(lv, 250000);
    if (!r.sol) continue;
    if (!verify(lv, r.sol)) { console.log('VERIFY FAIL'); continue; }
    // 难度：解长 + 独立倒法检查(弱化求解w=1 节点数)
    lv.par = r.sol.length; lv.sol = r.sol; lv.nodes = r.nodes; lv.easy = greedy(lv, 60);
    cands.push(lv);
  }
  const target = 0.92 - 0.75 * (L - 1) / 29;
  cands.sort((a, b) => Math.abs(a.easy - target) - Math.abs(b.easy - target));
  let pick = cands[0];
  if (sp.hard) { const t2 = Math.max(0, target - 0.32); pick = cands.slice().sort((a, b) => Math.abs(a.easy - t2) - Math.abs(b.easy - t2))[0]; }
  if (sp.intro) pick.intro = sp.intro;
  out.push(pick);
  console.log(L, 'easy', pick.easy.toFixed(2), 'range', Math.min(...cands.map(c=>c.easy)).toFixed(2), Math.max(...cands.map(c=>c.easy)).toFixed(2), 'tubes', pick.tubes.length, 'par', pick.par, 'nodes', pick.nodes, 'cands', cands.length, 'tries', tries);
}
const js = '/* 自动生成：tools/gen.js（每关均经求解器验证可解，sol 为参考解） */\nconst LEVELS = ' + JSON.stringify(out.map(l => ({ tubes: l.tubes, orders: l.orders, K: l.K, par: l.par, intro: l.intro, sol: l.sol }))) + ';\nif (typeof module !== "undefined") module.exports = LEVELS;\n';
fs.writeFileSync(__dirname + '/../levels.js', js);
