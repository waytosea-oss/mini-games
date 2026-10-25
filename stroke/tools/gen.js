// 一笔绘山海 · 关卡生成 + 求解验证 + 难度测量
// 用法：node tools/gen.js            → 写 levels.js 与 tools/metrics.json
//      node tools/gen.js --report    → 只打印每关指标
const fs = require('fs'), path = require('path');
const LG = require('../logic.js');
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const CH = [
  { name: '青丘', from: 1, to: 6 }, { name: '云梦', from: 7, to: 12 }, { name: '弱水', from: 13, to: 18 },
  { name: '昆仑', from: 19, to: 24 }, { name: '归墟', from: 25, to: 30 }];
// 每关参数：网格、边数区间、云桥数、单行溪数、白泽、目标难度
function spec(n) {
  const c = n <= 6 ? 0 : n <= 12 ? 1 : n <= 18 ? 2 : n <= 24 ? 3 : 4, k = n - CH[c].from; // k: 章内序号 0..5
  const S = [
    () => ({ g: [[3, 3], [3, 3], [3, 4], [4, 4], [4, 4], [4, 4]][k], E: [[4, 5], [6, 7], [8, 9], [9, 10], [10, 12], [11, 13]][k], dbl: 0, one: 0, beast: 0 }),
    () => ({ g: [[3, 4], [4, 4], [4, 4], [4, 5], [4, 5], [4, 5]][k], E: [[7, 8], [9, 11], [11, 12], [12, 14], [13, 15], [14, 16]][k], dbl: [1, 1, 2, 2, 3, 3][k], one: 0, beast: 0 }),
    () => ({ g: [[4, 4], [4, 4], [4, 5], [4, 5], [4, 5], [5, 5]][k], E: [[9, 10], [11, 12], [12, 14], [14, 15], [15, 17], [16, 18]][k], dbl: [0, 0, 1, 1, 1, 2][k], one: [2, 3, 3, 4, 4, 5][k], beast: 0 }),
    () => ({ g: [[4, 4], [4, 5], [4, 5], [5, 5], [5, 5], [5, 5]][k], E: [[10, 11], [12, 13], [14, 15], [15, 17], [16, 18], [18, 20]][k], dbl: [0, 1, 1, 1, 2, 2][k], one: [0, 1, 2, 3, 3, 4][k], beast: 1 }),
    () => ({ g: [[5, 5], [5, 5], [5, 6], [5, 6], [5, 6], [5, 6]][k], E: [[17, 19], [19, 21], [20, 22], [22, 24], [23, 26], [25, 28]][k], dbl: [2, 2, 3, 3, 3, 4][k], one: [3, 4, 4, 5, 5, 6][k], beast: [0, 1, 1, 1, 1, 1][k] }),
  ];
  const p = S[c](); p.ch = c; p.k = k;
  // 目标难度（-log2 随机通关率）：平滑上升，章首教学关回落
  p.target = 0.4 + (n - 1) * 0.30 - (k === 0 && n > 1 ? 1.1 : 0);
  return p;
}
function cross(p1, p2, p3, p4) { // 线段严格相交（共端点不算）
  const d = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  if ([p1, p2].some(a => a === p3 || a === p4)) return false;
  const d1 = d(p3, p4, p1), d2 = d(p3, p4, p2), d3 = d(p1, p2, p3), d4 = d(p1, p2, p4);
  return d1 * d2 < 0 && d3 * d4 < 0;
}
function build(n, sp, R) {
  const [C, Rw] = sp.g, idx = (x, y) => y * C + x, lat = [];
  for (let y = 0; y < Rw; y++) for (let x = 0; x < C; x++) lat.push([x + (R() - .5) * .34, y + (R() - .5) * .34]);
  const cand = [];
  for (let y = 0; y < Rw; y++) for (let x = 0; x < C; x++) for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [-1, 1]]) { const X = x + dx, Y = y + dy; if (X < 0 || X >= C || Y >= Rw) continue; cand.push([idx(x, y), idx(X, Y)]); }
  const E = sp.E[0] + Math.floor(R() * (sp.E[1] - sp.E[0] + 1));
  const used = new Map(), deg = lat.map(() => 0), trail = [];
  let cur = Math.floor(R() * lat.length); const start = cur; const visited = new Set([cur]); let dblLeft = sp.dbl;
  const ek = (a, b) => a < b ? a + ',' + b : b + ',' + a;
  for (let s = 0; s < E; s++) {
    const opts = [];
    for (const [a, b] of cand) {
      if (a !== cur && b !== cur) continue; const to = a === cur ? b : a, key = ek(a, b), u = used.get(key);
      if (u) { if (dblLeft > 0 && u.c === 1 && s > 1 && trail[trail.length - 1].key !== key) opts.push({ to, key, a, b, w: 1.2, re: 1 }); continue; }
      if (deg[to] >= 5 || deg[cur] >= 6) continue;
      let bad = false; for (const [k2, v] of used) if (cross(lat[a], lat[b], lat[v.a], lat[v.b])) { bad = true; break; }
      if (bad) continue;
      const diag = a % C !== b % C && Math.floor(a / C) !== Math.floor(b / C);
      opts.push({ to, key, a, b, w: (visited.has(to) ? 2.2 : 1) * (diag ? .7 : 1) });
    }
    if (!opts.length) return null;
    let tw = opts.reduce((q, o) => q + o.w, 0), r = R() * tw, o = opts[0];
    for (const op of opts) { r -= op.w; if (r <= 0) { o = op; break; } }
    if (o.re) { used.get(o.key).c = 2; dblLeft--; }
    else { used.set(o.key, { a: o.a, b: o.b, c: 1, dir: [cur, o.to] }); deg[o.a]++; deg[o.b]++; }
    trail.push({ key: o.key, from: cur, to: o.to }); cur = o.to; visited.add(cur);
  }
  if (dblLeft > 0) return null;
  // 只保留出现过的节点，重新编号；坐标归一到 0~1
  const nodes = [...visited], map = new Map(nodes.map((v, i) => [v, i]));
  const xs = nodes.map(v => lat[v][0]), ys = nodes.map(v => lat[v][1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const pts = nodes.map(v => [+((lat[v][0] - x0) / Math.max(1e-6, x1 - x0)).toFixed(3), +((lat[v][1] - y0) / Math.max(1e-6, y1 - y0)).toFixed(3)]);
  const keys = [...used.keys()], singles = keys.filter(k => used.get(k).c === 1);
  // 单行溪：从走过一遍的边中随机挑，方向沿生成路线（保证有解）
  const oneSet = new Set(); const pool = singles.slice(); for (let i = 0; i < sp.one && pool.length; i++) oneSet.add(pool.splice(Math.floor(R() * pool.length), 1)[0]);
  if (oneSet.size < sp.one) return null;
  const e = keys.map(k => { const u = used.get(k); if (oneSet.has(k)) return [map.get(u.dir[0]), map.get(u.dir[1]), 2]; return [map.get(u.a), map.get(u.b), u.c === 2 ? 1 : 0]; });
  const L = { pts, e, beast: sp.beast ? map.get(cur) : -1, w: +((x1 - x0) || 1).toFixed(3), h: +((y1 - y0) || 1).toFixed(3) };
  if (sp.beast && LG.adj(L)[L.beast].length < 2) return null; // 白泽只连一条边太直白
  return L;
}
function measure(L, R, runs = 2500) {
  const sol = LG.solve(L, 400000); if (!sol) return null;
  const starts = LG.goodStarts(L, 400000), nodes = L.pts.length, A = LG.adj(L);
  const odd = A.filter((a, v) => a.reduce((q, i) => q + LG.need(L.e[i][2]), 0) % 2).length;
  let ok = 0, br = 0, bn = 0;
  for (let r = 0; r < runs; r++) {
    const rem = LG.init(L); let cur = Math.floor(R() * nodes);
    for (;;) { const ms = LG.moves(L, rem, cur); if (!ms.length) break; br += ms.length; bn++; const m = ms[Math.floor(R() * ms.length)]; rem[m[0]]--; cur = m[1]; }
    if (LG.done(L, rem, cur)) ok++;
  }
  const p = (ok + .5) / (runs + 1), steps = L.e.reduce((q, e) => q + LG.need(e[2]), 0);
  return { nodes, edges: L.e.length, steps, odd, starts: starts.length, branch: +(br / Math.max(1, bn)).toFixed(2), p: +p.toFixed(4), D: +(-Math.log2(p)).toFixed(2), dbl: L.e.filter(e => e[2] === 1).length, one: L.e.filter(e => e[2] === 2).length, beast: L.beast >= 0 ? 1 : 0, sol };
}
const out = [], met = [];
for (let n = 1; n <= 30; n++) {
  const sp = spec(n), R = rng(1000 + n * 7919); let best = null;
  for (let t = 0; t < 900 && (!best || t < 160); t++) {
    const L = build(n, sp, R); if (!L) continue;
    const m = measure(L, R, 600); if (!m) continue;
    if (sp.beast && m.starts === L.pts.length) continue;
    const s = Math.abs(m.D - sp.target) + (n === 1 && m.odd ? 5 : 0);
    if (!best || s < best.s) best = { s, L, m };
  }
  const m = measure(best.L, rng(n), 4000); best.L.par = Math.round(6 + m.steps * 2.4 + m.D * 3);
  delete best.L._adj; out.push(best.L);
  met.push(Object.assign({ n, ch: CH[sp.ch].name, target: +sp.target.toFixed(2) }, m, { sol: undefined, par: best.L.par, solution: [m.sol.start].concat(m.sol.path.map(s => s[1])) }));
  console.log(n, CH[sp.ch].name, 'N', m.nodes, 'E', m.edges, 'steps', m.steps, 'odd', m.odd, 'starts', m.starts, 'br', m.branch, 'dbl', m.dbl, 'one', m.one, 'beast', m.beast, 'p', m.p, 'D', m.D, 'target', sp.target.toFixed(2), 'par', best.L.par);
}
if (!process.argv.includes('--report')) {
  const P = path.join(__dirname, '..');
  fs.writeFileSync(P + '/levels.js', '/* 一笔绘山海 · 30 关（tools/gen.js 生成并经求解器验证，勿手改） */\nconst CHAPTERS = ' + JSON.stringify(CH) + ';\nconst LEVELS = ' + JSON.stringify(out) + ';\n');
  fs.writeFileSync(__dirname + '/metrics.json', JSON.stringify(met, null, 1));
}
