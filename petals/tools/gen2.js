// 花瓣消消 31–60 关：复用 30 幅图（水平镜像），参数在第 30 关基础上缓升；每关经机器人验证
const G = require('./gen.js'), SIM = require('../sim.js'), fs = require('fs');
const OLD = require('../levels.js');
const lerp = (a, b, t) => a + (b - a) * t;
const W = 96;
G.params = null;
let AVGK = 1;
// 新关卡图片顺序：先用色彩更多的 13–30 关图，再用 1–12 关的简单图（配更多花篮）
const PIC_ORDER = [...Array(18).keys()].map(i => i + 12).concat([...Array(12).keys()]);
function params2(L) { const t = (L - 30) / 29; return {
  avgCap: Math.round(lerp(290, 200, t) * AVGK), C: L >= 45 ? 5 : 4, slots: +(process.env.SL || 6),
  swaps: lerp(0.6, 0.75, t), win: Math.round(6 + t * 2), hid: lerp(0.45, 0.55, t),
  frost: L < 45 ? 3 : 4, lock: L < 45 ? 2 : 3 }; }
// 简单重写 build：镜像图片，替换参数
const src = fs.readFileSync(__dirname + '/gen.js', 'utf8').split('module.exports')[0]
  .replace("const P = PICS[L], p = params(L)", "const P0 = PICS[PIC_ORDER[L - 30]], P = Object.assign({}, P0, { grid: mirror(P0.grid) }), p = params2(L)")
  .replace("const SIM = require('../sim.js');", '').replace("const fs = require('fs');", '');
function mirror(g) { const o = []; for (let y = 0; y < 96; y++) for (let x = 0; x < 96; x++) o.push(g[y * 96 + 95 - x]); return o; }
eval(src.replace(/^const PICS[^\n]*\n/m, 'const PICS = G.PICS;\n'));
const out = []; let fails = 0;
const LA = +(process.env.A || 30), LB = +(process.env.B || 60);
for (let L = LA; L < LB; L++) {
  // 目标：弱机器人通关数从 3/6（31 关，接近 1–30 关后段）降到 0/6（60 关）；强机器人必须 3/3
  const target = Math.round(3 * (1 - (L - 30) / 29)); let ok = null, best = null;
  for (const k of (L >= 48 ? [0.6, 0.45, 0.35] : [1, 0.75, 0.55, 0.4])) { AVGK = k;
    for (let seed = 1; seed < 8 && !ok; seed++) {
      const lv = build(L, seed);
      const rs = [1, 2, 3].map(sd => runBot(lv, sd));
      if (!rs.every(x => x.win)) continue;
      const wk = [11, 12, 13, 14, 15, 16].map(sd => runBot(lv, sd, true)).filter(x => x.win).length;
      const c = { lv, rs, wk, seed, k }; if (!best || Math.abs(wk - target) < Math.abs(best.wk - target)) best = c;
      if (wk <= target + 1 && wk >= target - 1) ok = c;
    }
    if (ok) break; }
  ok = ok || best;
  if (!ok) { console.log('L' + (L + 1) + ' NO SOLUTION'); fails++; continue; }
  const { lv, rs, wk, seed } = ok;
  console.log(`L${L + 1} ${lv.name} baskets=${lv.n} seed=${seed} k=${ok.k} target=${target} t=${rs.map(x => (x.t / 60).toFixed(0)).join('/')}s weakWin=${wk}/6`);
  out.push({ name: lv.name + '·镜', pic: lv.pic, cols: lv.cols, slots: lv.slots, grid: SIM.encodeGrid(lv.grid), columns: lv.columns.map(col => col.map(b => [b.c, b.cap, (b.hid ? 1 : 0) | (b.lock ? 2 : 0) | (b.key ? 4 : 0), b.frost || 0])) });
}
if (process.env.PART) fs.writeFileSync(process.env.PART, JSON.stringify(out));
else if (!fails) fs.writeFileSync(__dirname + '/../levels.js', '/* 花瓣消消 · 60 关数据（1–30: tools/gen.js；31–60: tools/gen2.js，每关均经机器人验证可通关） */\nconst LEVELS=' + JSON.stringify(OLD.concat(out)) + ';\nif(typeof module!=="undefined")module.exports=LEVELS;\n');
