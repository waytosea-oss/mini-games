/* ===== 宝石大盗 · 关卡生成 + 可解性求解器（浏览器/Node 共用） ===== */
const GEN = (() => {
'use strict';
const TAU = Math.PI * 2;
const BW = 360, BH = 440;
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
/* ---------- 形状（多边形，局部坐标，中心 0,0） ---------- */
function roundPoly(pts, r, seg = 5) {
  const out = [], n = pts.length;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n];
    const d1x = p0[0] - p1[0], d1y = p0[1] - p1[1], d2x = p2[0] - p1[0], d2y = p2[1] - p1[1];
    const l1 = Math.hypot(d1x, d1y), l2 = Math.hypot(d2x, d2y);
    const rr = Math.min(r, l1 * 0.45, l2 * 0.45);
    const a = [p1[0] + d1x / l1 * rr, p1[1] + d1y / l1 * rr], b = [p1[0] + d2x / l2 * rr, p1[1] + d2y / l2 * rr];
    for (let k = 0; k <= seg; k++) { const t = k / seg, u = 1 - t; out.push([u * u * a[0] + 2 * u * t * p1[0] + t * t * b[0], u * u * a[1] + 2 * u * t * p1[1] + t * t * b[1]]); }
  }
  return out;
}
function regular(n, R, rot = 0) { const p = []; for (let i = 0; i < n; i++) { const a = rot + i / n * TAU; p.push([Math.cos(a) * R, Math.sin(a) * R]); } return p; }
const SHAPES = {
  rect: (w, h) => roundPoly([[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]], Math.min(w, h) * 0.18),
  plank: (w, h) => roundPoly([[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]], h * 0.5, 8),
  circle: (w) => regular(44, w / 2),
  hex: (w) => roundPoly(regular(6, w / 2, Math.PI / 6), w * 0.1),
  oct: (w) => roundPoly(regular(8, w / 2, Math.PI / 8), w * 0.07),
  tri: (w) => roundPoly(regular(3, w * 0.58, -Math.PI / 2).map(p => [p[0], p[1] + w * 0.1]), w * 0.16, 7),
  rhombus: (w, h) => roundPoly([[0, -h / 2], [w / 2, 0], [0, h / 2], [-w / 2, 0]], w * 0.12),
  flower: (w) => { const p = []; for (let i = 0; i < 56; i++) { const a = i / 56 * TAU; const r = w / 2 * (0.84 + 0.16 * Math.cos(4 * a)); p.push([Math.cos(a) * r, Math.sin(a) * r]); } return p; },
  shield: (w, h) => roundPoly([[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h * 0.08], [0, h / 2], [-w / 2, h * 0.08]], w * 0.14, 6),
  arch: (w, h) => { const p = [[w / 2, h / 2], [-w / 2, h / 2]]; for (let i = 0; i <= 20; i++) { const a = Math.PI + i / 20 * Math.PI; p.push([Math.cos(a) * w / 2, -h / 2 + w / 2 + Math.sin(a) * w / 2]); } return roundPoly(p, 10, 4); },
  cross: (w) => { const a = w / 2, b = w * 0.19; return roundPoly([[-b, -a], [b, -a], [b, -b], [a, -b], [a, b], [b, b], [b, a], [-b, a], [-b, b], [-a, b], [-a, -b], [-b, -b]], b * 0.6, 4); },
};
const MATS = ['wood', 'gold', 'marble', 'jade', 'ruby', 'night'];
/* ---------- 几何 ---------- */
function pip(x, y, P) { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const a = P[i], b = P[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; }
function segDist(px, py, a, b) { const dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy; let t = l ? ((px - a[0]) * dx + (py - a[1]) * dy) / l : 0; t = t < 0 ? 0 : t > 1 ? 1 : t; return Math.hypot(px - a[0] - t * dx, py - a[1] - t * dy); }
function edgeDist(x, y, P) { let m = 1e9; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const d = segDist(x, y, P[j], P[i]); if (d < m) m = d; } return m; }
function circleHits(x, y, r, P, bb) { if (bb && (x + r < bb[0] || x - r > bb[2] || y + r < bb[1] || y - r > bb[3])) return false; return pip(x, y, P) || edgeDist(x, y, P) < r; }
function bbox(P) { let a = 1e9, b = 1e9, c = -1e9, d = -1e9; for (const p of P) { if (p[0] < a) a = p[0]; if (p[1] < b) b = p[1]; if (p[0] > c) c = p[0]; if (p[1] > d) d = p[1]; } return [a, b, c, d]; }
function polyArea(P) { let s = 0; for (let i = 0, j = P.length - 1; i < P.length; j = i++) s += (P[j][0] + P[i][0]) * (P[j][1] - P[i][1]); return Math.abs(s / 2); }
function polysOverlap(A, B, ba, bb) { if (ba[2] < bb[0] || bb[2] < ba[0] || ba[3] < bb[1] || bb[3] < ba[1]) return 0; let n = 0, k = 0; for (let x = Math.max(ba[0], bb[0]); x < Math.min(ba[2], bb[2]); x += 8) for (let y = Math.max(ba[1], bb[1]); y < Math.min(ba[3], bb[3]); y += 8) { if (pip(x, y, A) && pip(x, y, B)) n++; k++; } return n * 64; }
/* ---------- 难度曲线 ---------- */
function cfg(n) {
  const C = [2, 3, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 15, 16, 16, 17, 17, 18][n - 1];
  const K = Math.min(9, [2, 2, 3, 3, 4, 4, 4, 5, 5, 5, 5, 6, 6, 6, 6, 7, 7, 7, 7, 7, 8, 8, 8, 8, 8, 9, 9, 9, 9, 9][n - 1]);
  const G = C * 3;
  const GR = G <= 27 ? 17 : G <= 36 ? 16 : G <= 45 ? 15 : 14.2;
  const per = n <= 2 ? 2 : n <= 6 ? 2.3 : n <= 14 ? 2.45 : 2.6;
  const P = Math.max(3, Math.round(G / per));
  const cap = 5;
  const peak = n <= 1 ? 1 : n <= 3 ? 2 : n <= 8 ? 3 : 4; // 求解器最大托盘占用上限（留余量）
  const swaps = n <= 1 ? 0 : Math.round(4 + n * 2.2);
  const win = n <= 3 ? 4 : n <= 10 ? 7 : n <= 20 ? 10 : 13;
  const mats = n <= 2 ? ['wood', 'gold'] : n <= 5 ? ['wood', 'gold', 'marble'] : n <= 9 ? ['wood', 'gold', 'marble', 'jade'] : MATS;
  return { n, C, K, G, GR, P, cap, peak, swaps, win, mats };
}
/* ---------- 生成 ---------- */
function genLayout(c, rnd) {
  const GR = c.GR, minD = GR * 2 + 3, margin = GR + 5;
  const panels = [], gems = [];
  const shapeTypes = c.n <= 2 ? ['rect', 'plank', 'circle'] : c.n <= 6 ? ['rect', 'plank', 'circle', 'hex', 'shield'] : Object.keys(SHAPES);
  // 每块板宝石数
  const counts = []; let left = c.G;
  for (let i = 0; i < c.P; i++) counts.push(1); left -= c.P;
  while (left > 0) { const i = Math.floor(rnd() * c.P); if (counts[i] < 4) { counts[i]++; left--; } }
  counts.sort(() => rnd() - 0.5);
  for (let i = 0; i < c.P; i++) {
    const k = counts[i]; let ok = false;
    for (let tries = 0; tries < 60 && !ok; tries++) {
      let type = shapeTypes[Math.floor(rnd() * shapeTypes.length)];
      if (k >= 3 && (type === 'circle' && rnd() < .5)) type = 'rect';
      const base = GR * 2 + 10;
      let w, h;
      if (type === 'plank') { w = base * (k >= 3 ? 3.3 : k === 2 ? 2.5 : 1.6) + rnd() * 30; h = base * 1.05 + rnd() * 6; }
      else if (type === 'rect' || type === 'shield' || type === 'arch' || type === 'rhombus') { w = base * (k >= 3 ? 2.3 : 1.8) + rnd() * 26; h = base * (k >= 3 ? 2.0 : k === 2 ? 1.25 : 1.2) + rnd() * 24; if (type === 'rhombus') { w *= 1.35; h *= 1.45; } if (type === 'arch') h = Math.max(h, w * 0.95); if (type === 'shield') h *= 1.25; }
      else { w = base * (k >= 3 ? 2.35 : k === 2 ? 2.0 : 1.4) + rnd() * 22; if (type === 'tri') w *= 1.3; if (type === 'cross') w *= 1.25; }
      const local = SHAPES[type](w, h);
      const rot = [0, 0, Math.PI / 2, Math.PI / 4, -Math.PI / 4, Math.PI / 6, -Math.PI / 6, Math.PI / 12, -Math.PI / 12][Math.floor(rnd() * 9)];
      // 位置：倾向与已有板子重叠
      let cx, cy;
      if (panels.length && rnd() < 0.82) { const o = panels[Math.floor(rnd() * panels.length)]; const a = rnd() * TAU, d = 30 + rnd() * 70; cx = o.cx + Math.cos(a) * d; cy = o.cy + Math.sin(a) * d; }
      else { cx = 50 + rnd() * (BW - 100); cy = 50 + rnd() * (BH - 100); }
      const cs = Math.cos(rot), sn = Math.sin(rot);
      const poly = local.map(([x, y]) => [cx + x * cs - y * sn, cy + x * sn + y * cs]);
      const bb = bbox(poly);
      if (bb[0] < 4 || bb[1] < 4 || bb[2] > BW - 4 || bb[3] > BH - 4) continue;
      // 候选宝石位
      const cand = [];
      for (let x = bb[0] + margin; x <= bb[2] - margin; x += 6) for (let y = bb[1] + margin; y <= bb[3] - margin; y += 6) {
        if (!pip(x, y, poly) || edgeDist(x, y, poly) < margin) continue;
        let md = 1e9; for (const g of gems) { const d = Math.hypot(g.x - x, g.y - y); if (d < md) md = d; }
        if (md < minD) continue;
        cand.push([x, y, md]);
      }
      if (cand.length < k) continue;
      // 最远点采样
      const pick = [];
      let first = cand[Math.floor(rnd() * cand.length)];
      if (k > 1) { let best = -1; for (const p of cand) { const d = Math.hypot(p[0] - cx, p[1] - cy); if (d > best) { best = d; first = p; } } }
      pick.push(first);
      while (pick.length < k) {
        let best = null, bd = -1;
        for (const p of cand) { let md = 1e9; for (const q of pick) md = Math.min(md, Math.hypot(p[0] - q[0], p[1] - q[1])); if (md > bd) { bd = md; best = p; } }
        if (bd < minD) break; pick.push(best);
      }
      if (pick.length < k) continue;
      // 不能过度遮挡：新板子不能完全盖住下面的板
      const area = polyArea(poly);
      let bad = false;
      for (const o of panels) { const ov = polysOverlap(poly, o.poly, bb, o.bb); if (ov > o.area * 0.8) { bad = true; break; } }
      if (bad) continue;
      const id = panels.length;
      const mat = c.mats[Math.floor(rnd() * c.mats.length)];
      panels.push({ id, type, poly, bb, cx, cy, rot, area, mat, gems: [] });
      for (const p of pick) { const g = { id: gems.length, p: id, x: p[0], y: p[1], c: 0, cov: [] }; gems.push(g); panels[id].gems.push(g.id); }
      ok = true;
    }
    if (!ok) return null;
  }
  // 覆盖关系
  for (const g of gems) for (const q of panels) if (q.id > g.p && circleHits(g.x, g.y, GR * 0.92, q.poly, q.bb)) g.cov.push(q.id);
  { // 内容居中
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const p of panels) { x0 = Math.min(x0, p.bb[0]); y0 = Math.min(y0, p.bb[1]); x1 = Math.max(x1, p.bb[2]); y1 = Math.max(y1, p.bb[3]); }
    const dx = Math.round(BW / 2 - (x0 + x1) / 2), dy = Math.round(BH / 2 - (y0 + y1) / 2);
    if (dx || dy) {
      for (const p of panels) { p.poly = p.poly.map(([x, y]) => [x + dx, y + dy]); p.bb = [p.bb[0] + dx, p.bb[1] + dy, p.bb[2] + dx, p.bb[3] + dy]; p.cx += dx; p.cy += dy; }
      for (const g of gems) { g.x += dx; g.y += dy; }
    }
  }
  return { panels, gems };
}
/* ---------- 求解器 / 机器人 ---------- */
function simulate(lv, cap, opt = {}) {
  // 返回 {ok, peak, order}
  const G = lv.gems.length, alive = new Uint8Array(G).fill(1), pcount = lv.panels.map(p => p.gems.length);
  const queue = lv.queue; let qi = 2; const act = [{ c: queue[0], f: 0 }, { c: queue[1], f: 0 }];
  const tray = []; let peak = 0; const order = []; let left = G;
  const free = g => { for (const q of lv.gems[g].cov) if (pcount[q] > 0) return false; return true; };
  const nextIdx = c => { for (let i = qi; i < queue.length; i++) if (queue[i] === c) return i - qi; return 99; };
  const deliver = (slot) => {
    while (act[slot] && act[slot].f >= 3) {
      act[slot] = qi < queue.length ? { c: queue[qi++], f: 0 } : null;
      if (act[slot]) for (let i = tray.length - 1; i >= 0 && act[slot].f < 3; i--) if (tray[i] === act[slot].c) { tray.splice(i, 1); act[slot].f++; }
    }
  };
  while (left > 0) {
    let best = -1, bs = -1e9, toChest = false;
    for (let g = 0; g < G; g++) {
      if (!alive[g] || !free(g)) continue;
      const gm = lv.gems[g], c = gm.c;
      const match = act.some(a => a && a.c === c && a.f < 3);
      let s = (match ? 1000 : 0);
      if (pcount[gm.p] === 1) s += 30; // 板子掉落 → 解锁
      if (match) { const a = act.find(a => a && a.c === c && a.f < 3); s += a.f * 5; }
      else s -= nextIdx(c) * 12 + (tray.filter(x => x === c).length ? -8 : 0);
      if (opt.rnd) s += opt.rnd() * opt.noise;
      if (s > bs) { bs = s; best = g; toChest = match; }
    }
    if (best < 0) return { ok: false, peak, order, why: 'stuck' };
    const gm = lv.gems[best]; alive[best] = 0; left--; pcount[gm.p]--; order.push(best);
    if (toChest) { const si = act.findIndex(a => a && a.c === gm.c && a.f < 3); act[si].f++; deliver(si); }
    else { if (tray.length >= cap) return { ok: false, peak, order, why: 'tray' }; tray.push(gm.c); peak = Math.max(peak, tray.length); }
  }
  return { ok: tray.length === 0, peak, order };
}
function genLevel(n, salt = 0) {
  const c = cfg(n);
  for (let attempt = 0; attempt < 400; attempt++) {
    const rnd = mulberry(n * 9973 + attempt * 131 + salt * 7 + 17);
    const lay = genLayout(c, rnd);
    if (!lay) continue;
    // 自顶向下的随机拆除顺序
    const G = lay.gems.length, pcount = lay.panels.map(p => p.gems.length), alive = new Array(G).fill(true), order = [];
    let initialFree = 0;
    for (const g of lay.gems) if (!g.cov.length) initialFree++;
    if (initialFree < Math.min(3, G) || (c.n > 3 && initialFree > G * 0.62)) continue;
    while (order.length < G) {
      const fr = []; for (let g = 0; g < G; g++) if (alive[g] && lay.gems[g].cov.every(q => pcount[q] === 0)) fr.push(g);
      const g = fr[Math.floor(rnd() * fr.length)]; alive[g] = false; pcount[lay.gems[g].p]--; order.push(g);
    }
    // 宝箱颜色队列
    const pal = []; const allC = [0, 1, 2, 3, 4, 5, 6, 7].sort(() => rnd() - 0.5).slice(0, Math.min(8, c.K)); if (c.K >= 9) allC.push(8);
    for (let i = 0; i < c.C; i++) pal.push(allC[i % c.K]);
    for (let s = 0; s < 200; s++) { pal.sort(() => rnd() - 0.5); let ok = true; for (let i = 1; i < pal.length; i++) if (pal[i] === pal[i - 1]) { ok = false; break; } if (ok) break; }
    const lv = { n, cfg: c, panels: lay.panels, gems: lay.gems, queue: pal };
    order.forEach((g, j) => lay.gems[g].c = pal[Math.floor(j / 3)]);
    // 打乱 + 验证
    let r = simulate(lv, c.cap); if (!r.ok || r.peak > c.peak) continue;
    let done = 0;
    for (let s = 0; s < c.swaps * 4 && done < c.swaps; s++) {
      const i = Math.floor(rnd() * G), j = Math.min(G - 1, i + 1 + Math.floor(rnd() * c.win));
      const a = lay.gems[order[i]], b = lay.gems[order[j]]; if (a.c === b.c) continue;
      [a.c, b.c] = [b.c, a.c];
      const r2 = simulate(lv, c.cap);
      if (r2.ok && r2.peak <= c.peak) { done++; r = r2; } else [a.c, b.c] = [b.c, a.c];
    }
    lv.botPeak = r.peak; lv.solution = r.order; lv.attempt = attempt;
    return lv;
  }
  return null;
}
return { BW, BH, cfg, genLevel, simulate, pip, circleHits, edgeDist, bbox, MATS };
})();
if (typeof module !== 'undefined') module.exports = GEN;
