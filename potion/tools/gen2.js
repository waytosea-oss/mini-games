// 关卡扩展 31–60：保留 1–30 不动（玩家存档兼容），沿用 gen.js 的造关/求解/贪心评估，难度按目标曲线逐步上升
// 每关：加权 A* 求出参考解并逐步回放验证；easy = 贪心「人类式」随机玩家 60 局通关率（越低越难）
const P = require('../logic.js');
const fs = require('fs');
const OLD = require('../levels.js').slice(0, 30);
let seed = 1; const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const ri = n => Math.floor(rand() * n);
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = ri(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const ORDER = [0, 7, 2, 4, 3, 5, 6, 1, 8];
function spec(L) {
  const t = L - 31; // 0..29
  const s = { k: 9, d: t < 8 ? 2 : 3, e: 2, K: 3, h: Math.min(7, 3 + Math.floor(t / 5)), ice: [] };
  if (t % 3 === 1) s.ice.push(8 + (t % 4));
  if (t >= 14 && t % 3 !== 0) s.ice.push(11 + (t % 3));
  if (t % 4 === 2 && t < 18) s.c = 1;
  if (L % 5 === 0) { s.hard = 1; }
  if ((t >= 8 && t % 2 === 1) || t >= 20) s.e = 1;
  if (s.c && t >= 8) s.e = 1;
  return s;
}
function build(sp) {
  const cols = shuffle(ORDER.slice(0, sp.k).slice()), dbl = cols.slice(0, sp.d), units = [], orders = [];
  for (const c of cols) { units.push(c, c, c, c); orders.push(c); }
  for (const c of dbl) { units.push(c, c, c, c); orders.push(c); }
  shuffle(units);
  const tubes = []; for (let i = 0; i < units.length; i += 4) tubes.push({ u: units.slice(i, i + 4) });
  let triples = 0;
  for (const t of tubes) { if (t.u.every(v => v === t.u[0])) return null; for (let i = 0; i + 2 < 4; i++) if (t.u[i] === t.u[i + 1] && t.u[i] === t.u[i + 2]) triples++; }
  if (triples > Math.max(1, tubes.length / 6)) return null;
  const idx = shuffle([...Array(tubes.length).keys()]); let p = 0;
  for (let i = 0; i < (sp.h || 0); i++) tubes[idx[p++]].h = [1, 1, 1, 0];
  for (const n of (sp.ice || [])) tubes[idx[p++]].ice = n;
  for (let i = 0; i < sp.e; i++) tubes.push({ u: [] });
  if (sp.c) tubes.push({ u: [], kind: 1, cap: 8 });
  shuffle(orders);
  return { tubes, orders, K: sp.K };
}
function trySolve(lv, limit) { const s = P.mkState(lv); P.initCounter(s, lv.K); const sol = P.solve(s, limit, 2); return { sol, nodes: P.solve.nodes }; }
function greedy(lv, runs) {
  let ok = 0;
  for (let r = 0; r < runs; r++) {
    const s = P.mkState(lv); P.initCounter(s, lv.K); P.deliverAll(s); let last = null, steps = 0;
    while (!P.isWin(s) && steps < 200) {
      let ms = P.moves(s, true).filter(m => !(last && m[0] === last[1] && m[1] === last[0])); if (!ms.length) break;
      const sc = ms.map(([a, b]) => { const B = s.t[b]; let v = rand() * 2.2; if (B.u.length) v += 2; if (s.t[a].u.length === P.topRun(s.t[a])) v -= 1; return v; });
      let bi = 0; for (let i = 1; i < ms.length; i++) if (sc[i] > sc[bi]) bi = i;
      last = ms[bi]; P.pour(s, ms[bi][0], ms[bi][1]); P.deliverAll(s); steps++;
    }
    if (P.isWin(s)) ok++;
  }
  return ok / runs;
}
function verify(lv, sol) { const s = P.mkState(lv); P.initCounter(s, lv.K); P.deliverAll(s); for (const [a, b] of sol) { if (!P.canPour(s, a, b)) return false; P.pour(s, a, b); P.deliverAll(s); } return P.isWin(s); }
const out = OLD.slice(); const parOld = OLD[29].par;
for (let L = 31; L <= 60; L++) {
  const sp = spec(L); seed = 5000 + L * 7919;
  const cands = []; let tries = 0;
  while (cands.length < 60 && tries < 4000) {
    tries++; const lv = build(sp); if (!lv) continue;
    const r = trySolve(lv, 400000); if (!r.sol || !verify(lv, r.sol)) continue;
    lv.par = r.sol.length; lv.sol = r.sol; lv.nodes = r.nodes; lv.easy = greedy(lv, 80); lv.D = lv.par * (2 - lv.easy); cands.push(lv);
  }
  // 目标：参考步数从 L30 的水平平滑上升到 ~52，hard 关多 +3
  // 综合难度 D = 参考步数 ×（2 − 贪心通关率）；目标从第 30 关附近（≈66）线性升到 ≈99，每第 5 关（hard）+4%
  const tPar = (66 + (L - 30) * 1.1) * (sp.hard ? 1.04 : 1);
  cands.sort((a, b) => Math.abs(a.D - tPar) - Math.abs(b.D - tPar));
  const pick = cands[0];
  if (!pick) { console.log(L, 'NO CANDIDATE'); process.exit(1); }
  out.push(pick);
  console.log(L, 'D', pick.D.toFixed(1), 'par', pick.par, 'target', tPar.toFixed(1), 'easy', pick.easy.toFixed(2), 'tubes', pick.tubes.length, 'cands', cands.length, 'tries', tries);
}
const js = '/* 自动生成：tools/gen.js（1–30）+ tools/gen2.js（31–60）；每关均经求解器验证可解，sol 为参考解 */\nconst LEVELS = ' + JSON.stringify(out.map(l => ({ tubes: l.tubes, orders: l.orders, K: l.K, par: l.par, intro: l.intro, sol: l.sol }))) + ';\nif (typeof module !== "undefined") module.exports = LEVELS;\n';
fs.writeFileSync(__dirname + '/../levels.new.js', js);
console.log('done');
