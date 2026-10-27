const SIM = require('../sim.js');
const fs = require('fs');
const PICS = JSON.parse(fs.readFileSync(__dirname + '/pics.json'));
const W = 96, H = 96;
const lerp = (a, b, t) => a + (b - a) * t;
function params(L) { // L 0..29
  const t = L / 29;
  return {
    avgCap: Math.round(lerp(1000, 300, Math.pow(t, 0.75))),
    C: L < 2 ? 3 : 4,
    slots: L >= 24 ? 7 : 6,
    swaps: process.env.NOSW ? 0 : L < 2 ? 0 : lerp(0.1, 0.6, t),
    win: Math.round(2 + t * 4),
    hid: L < 5 ? 0 : lerp(0.15, 0.45, (L - 5) / 24),
    frost: L < 8 ? 0 : L < 16 ? 1 : L < 24 ? 2 : 3,
    lock: L < 12 ? 0 : L < 22 ? 1 : 2,
  };
}
function split(n, avg, r) {
  let k = Math.max(1, Math.round(n / avg)); if (n > 120 && k === 1 && n > avg * 1.4) k = 2;
  const w = []; for (let i = 0; i < k; i++) w.push(0.7 + r() * 0.6);
  const sw = w.reduce((a, b) => a + b, 0); const out = []; let acc = 0;
  for (let i = 0; i < k - 1; i++) { const v = Math.max(60, Math.round(n * w[i] / sw / 10) * 10); out.push(v); acc += v; }
  out.push(n - acc); if (out[out.length - 1] < 40 && out.length > 1) { const l = out.pop(); out[out.length - 1] += l; }
  return out;
}
function oracleOrder(lv, baskets, seed) {
  const k = lv.cols.length;
  const cols = []; for (let c = 0; c < k; c++) cols.push(baskets.filter(b => b.c === c));
  const L2 = Object.assign({}, lv, { slots: 99, columns: cols });
  const s = SIM.create(L2, seed); const order = []; const tapT = {}, fullT = {}; let done = 0; const doneAt = {};
  for (let t = 0; t < 60 * 600 && !SIM.won(s); t++) {
    const { exp } = SIM.analyse(s);
    for (let c = 0; c < k; c++) {
      if (exp[c] > 0 && !s.belt.some(b => b && b.c === c && b.need > 0 && b.st !== 'ghost') && s.columns[c].length) {
        const id = s.columns[c][0].id; SIM.tap(s, c); order.push(id); tapT[id] = s.tick; doneAt[id] = done;
      }
    }
    SIM.step(s);
    for (const e of s.ev) if (e.t === 'full') { fullT[s.belt[e.si].id] = s.tick; done++; }
    s.ev.length = 0;
  }
  order.tapT = tapT; order.fullT = fullT; order.doneAt = doneAt;
  return order; // ids are 1..n in creation order of cols (per colour)
}
function runBot(lv, seed, weak) {
  const s = SIM.create(lv, seed); let cd = 0, maxOcc = 0, t = 0;
  for (; t < 60 * 900; t++) {
    if (cd > 0) cd--;
    else {
      let m = -1;
      if (weak) {
        const free = SIM.freeCount(s); const idle = s.tick - s.lastTake > 20 && !s.moved;
        if (free >= 2 || (idle && free >= 1)) { const opts = s.columns.map((c, i) => i).filter(i => SIM.canTap(s, i)); if (opts.length && (s.r() < 0.08 || idle)) m = opts[(s.r() * opts.length) | 0]; }
      } else m = SIM.botMove(s);
      if (m >= 0) { SIM.tap(s, m); cd = 10; }
    }
    SIM.step(s); s.ev.length = 0;
    maxOcc = Math.max(maxOcc, s.cap - SIM.freeCount(s));
    if (SIM.won(s)) return { win: true, t, maxOcc, merges: s.merges, placed: s.placed };
    if (SIM.lost(s)) return { win: false, t, maxOcc, left: s.left, merges: s.merges };
  }
  return { win: false, t, timeout: true, left: s.left };
}
function build(L, seed) {
  const P = PICS[L], p = params(L), r = SIM.rng(seed * 7919 + L * 31 + 1);
  const grid = Uint8Array.from(P.grid); const k = P.cols.length;
  const cnt = new Array(k).fill(0); for (const v of grid) cnt[v - 1]++;
  let baskets = []; let id = 1;
  for (let c = 0; c < k; c++) for (const cap of split(cnt[c], p.avgCap * (c === 0 ? 1 : 1), r)) baskets.push({ c, cap, id: id++ });
  // ids in sim are assigned per column order; oracle cols are per colour so ids follow colour-major order == our ids
  const lv0 = { W, H, grid, cols: P.cols, slots: p.slots, columns: [] };
  const order = oracleOrder(lv0, baskets, seed + 1);
  let seq = order.map(i => baskets[i - 1]);
  // perturb
  const n = seq.length, sw = Math.round(n * p.swaps);
  for (let i = 0; i < sw; i++) { const a = p.C + ((r() * (n - p.C)) | 0), b = Math.min(n - 1, Math.max(p.C, a + ((r() * 2 - 1) * p.win) | 0)); [seq[a], seq[b]] = [seq[b], seq[a]]; }
  seq = seq.map(b => ({ c: b.c, cap: b.cap, id: b.id }));
  const tapT = order.tapT, fullT = order.fullT, doneAt = order.doneAt;
  const C = p.C;
  for (let i = C; i < n; i++) if (r() < p.hid) seq[i].hid = 1;
  let fr = p.frost, guard = 0;
  while (fr > 0 && guard++ < 80) {
    const i = C + ((r() * Math.max(1, n * 0.7 - C)) | 0); if (i >= n || seq[i].frost) continue;
    const avail = doneAt[seq[i].id] - 1; if (avail < 2) continue;
    seq[i].frost = Math.min(avail, 2 + ((r() * 3) | 0)); fr--;
  }
  let lk = p.lock; guard = 0;
  while (lk > 0 && guard++ < 200) {
    const j = Math.floor(n * (0.3 + r() * 0.5)); if (j >= n || seq[j].lock || seq[j].frost || seq[j].key) continue;
    const cand = [];
    for (let kk = 0; kk < j - 1; kk++) { const q = seq[kk]; if (q.lock || q.key || q.frost || kk % C === j % C) continue; if (fullT[q.id] < tapT[seq[j].id] - 120) cand.push(kk); }
    if (!cand.length) continue;
    const kk = cand[(r() * cand.length) | 0]; seq[j].lock = 1; seq[kk].key = 1; lk--;
  }
  const columns = []; for (let i = 0; i < C; i++) columns.push([]);
  seq.forEach((b, i) => columns[i % C].push(b));
  return { W, H, grid, cols: P.cols, slots: p.slots, columns, name: P.name, pic: P.pic, n };
}
module.exports={build,runBot,params,oracleOrder,PICS};
if (require.main === module) {
const out = []; const only = process.argv[2] ? +process.argv[2] : -1;
for (let L = 0; L < 30; L++) {
  if (only >= 0 && L !== only) continue;
  let ok = null;
  for (let seed = 1; seed < 40 && !ok; seed++) {
    const lv = build(L, seed);
    const rs = [1, 2, 3].map(sd => runBot(lv, sd));
    if (rs.every(x => x.win)) {
      const wk = [11, 12, 13, 14, 15, 16].map(sd => runBot(lv, sd, true)).filter(x => x.win).length;
      const tight = [1, 2].map(sd => runBot(Object.assign({}, lv, { slots: lv.slots - 1 }), sd)).filter(x => x.win).length;
      const wantTight = L >= 11;
      if (!wantTight || tight < 2 || seed > 25) ok = { lv, rs, wk, seed, tight };
    } else if (seed < 3) console.log('  L' + (L + 1) + ' seed' + seed + ' fail', JSON.stringify(rs.map(x => [x.win, x.left, x.maxOcc])));
  }
  if (!ok) { console.log('L' + (L + 1) + ' NO SOLUTION'); continue; }
  const { lv, rs, wk, seed } = ok;
  console.log(`L${L + 1} ${lv.name} cols=${lv.cols.length} baskets=${lv.n} seed=${seed} t=${rs.map(x => (x.t / 60).toFixed(0)).join('/')}s occ=${rs.map(x => x.maxOcc)} merges=${rs.map(x => x.merges)} weakWin=${wk}/6 win5=${ok.tight}/2`);
  out.push({ name: lv.name, pic: lv.pic, cols: lv.cols, slots: lv.slots, grid: SIM.encodeGrid(lv.grid), columns: lv.columns.map(col => col.map(b => [b.c, b.cap, (b.hid ? 1 : 0) | (b.lock ? 2 : 0) | (b.key ? 4 : 0), b.frost || 0])) });
}
if (only < 0) fs.writeFileSync(__dirname + '/../levels.js', '/* 花瓣消消 · 30 关数据（tools/gen.js 生成，每关均经机器人验证可通关） */\nconst LEVELS=' + JSON.stringify(out) + ';\nif(typeof module!=="undefined")module.exports=LEVELS;\n');
}
