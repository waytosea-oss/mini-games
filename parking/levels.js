/* ===== 快挪车！· 关卡生成器（反向放置，保证有解） ===== */
(function (root) {
  const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // 0上 1右 2下 3左
  function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
  // ---- 形状 ----
  const SHAPES = {
    rect: () => true,
    round: (x, y, C, R) => { const cx = Math.min(x, C - 1 - x), cy = Math.min(y, R - 1 - y); return !(cx + cy < 1); },
    diamond: (x, y, C, R) => { const u = Math.abs((x + .5) / C - .5) * 2, v = Math.abs((y + .5) / R - .5) * 2; return u + v <= 1.18; },
    heart: (x, y, C, R) => { const u = ((x + .5) / C - .5) * 2, v = (y + .5) / R, k = R / C * 2; const lobe = s => (u - s * .5) ** 2 + ((v - .23) * k) ** 2 <= .34; return lobe(1) || lobe(-1) || (v >= .24 && Math.abs(u) <= 1.02 - (v - .24) / .74 * 1.05); },
    ring: (x, y, C, R) => { const u = (x + .5) / C - .5, v = (y + .5) / R - .5; return !(Math.abs(u) < .17 && Math.abs(v) < .14); },
    plus: (x, y, C, R) => { const u = Math.abs((x + .5) / C - .5), v = Math.abs((y + .5) / R - .5); return u < .2 || v < .17 || (u < .4 && v < .36); },
    hourglass: (x, y, C, R) => { const u = Math.abs((x + .5) / C - .5) * 2, v = Math.abs((y + .5) / R - .5) * 2; return u <= 0.35 + v * 0.75; },
    twin: (x, y, C, R) => { const v = (y + .5) / R; return !(Math.abs(v - .5) < .5 / R + .001 && Math.abs((x + .5) / C - .5) > .13); },
    arrow: (x, y, C, R) => { const u = Math.abs((x + .5) / C - .5) * 2, v = (y + .5) / R; return v < .45 ? u <= v / .45 * 1.05 : u < .62; },
    stairs: (x, y, C, R) => { const u = (x + .5) / C, v = (y + .5) / R; return Math.abs(u - v) < .62; },
    oval: (x, y, C, R) => { const u = ((x + .5) / C - .5) * 2, v = ((y + .5) / R - .5) * 2; return u * u + v * v <= 1.18; },
    letterP: (x, y, C, R) => { const u = (x + .5) / C, v = (y + .5) / R; if (u < .36) return true; if (v < .56) { return !(u > .36 && u < .72 && v > .18 && v < .4) && !(u > .86 && (v < .1 || v > .48)); } return false; },
  };
  // ---- 关卡参数表（30 关，平滑难度） ----
  // [cols, rows, shape, p3(大车), obstacles, reverse%, clamps, hard, tickets]
  const T = [
    [4, 4, 'rect', 0, 0, 0, 0, .0, 3],
    [5, 6, 'rect', 0, 0, 0, 0, .15, 3],
    [5, 7, 'round', 0, 0, 0, 0, .25, 3],
    [6, 7, 'rect', .18, 0, 0, 0, .3, 3],
    [6, 8, 'diamond', .15, 0, 0, 0, .35, 3],
    [6, 8, 'heart', .15, 0, 0, 0, .4, 3],
    [7, 8, 'rect', .18, 3, 0, 0, .4, 3],
    [7, 9, 'ring', .18, 2, 0, 0, .45, 3],
    [7, 9, 'oval', .2, 3, 0, 0, .5, 3],
    [7, 10, 'plus', .2, 2, .18, 0, .5, 3],
    [7, 10, 'round', .2, 3, .2, 0, .55, 4],
    [8, 10, 'heart', .2, 2, .2, 0, .55, 4],
    [8, 10, 'hourglass', .2, 3, .22, 0, .6, 4],
    [8, 11, 'rect', .22, 4, .2, 2, .6, 4],
    [8, 11, 'arrow', .22, 3, .22, 2, .62, 4],
    [8, 11, 'twin', .22, 3, .22, 2, .65, 4],
    [8, 12, 'diamond', .24, 3, .24, 2, .65, 4],
    [8, 12, 'letterP', .22, 2, .24, 2, .68, 4],
    [8, 12, 'ring', .24, 4, .25, 3, .7, 4],
    [9, 12, 'oval', .24, 4, .25, 3, .7, 4],
    [9, 12, 'stairs', .24, 3, .26, 3, .72, 5],
    [9, 12, 'heart', .25, 4, .26, 3, .74, 5],
    [9, 13, 'plus', .25, 4, .28, 3, .75, 5],
    [9, 13, 'round', .26, 5, .28, 3, .78, 5],
    [9, 13, 'hourglass', .26, 4, .3, 3, .8, 5],
    [9, 13, 'twin', .26, 5, .3, 4, .82, 5],
    [9, 13, 'arrow', .27, 5, .3, 4, .85, 5],
    [9, 13, 'letterP', .27, 4, .3, 4, .88, 5],
    [9, 13, 'ring', .28, 6, .32, 4, .9, 5],
    [9, 13, 'rect', .3, 6, .32, 5, .95, 5],
  ];
  const NAMES = ['新手上路', '小区车位', '圆角车场', '大巴来了', '菱形广场', '爱心车场', '路障出没', '环岛停车', '椭圆车场', '十字路口',
    '早高峰', '甜蜜堵车', '沙漏车场', '车轮锁', '箭头广场', '双子车场', '菱形迷阵', 'P字车场', '环岛高峰', '商场周末',
    '阶梯车场', '情人节', '十字大堵', '晚高峰', '沙漏迷局', '双子高峰', '箭头迷阵', '停车王P', '超级环岛', '终极大堵车'];
  function inGrid(C, R, x, y) { return x >= 0 && y >= 0 && x < C && y < R; }
  function cellsOf(x, y, d, len) { // (x,y)=车头格，向后延伸
    const [dx, dy] = DIRS[d], out = [];
    for (let i = 0; i < len; i++) out.push([x - dx * i, y - dy * i]);
    return out;
  }
  function pathLen(occ, C, R, fx, fy, d) { // 前方到出界有多少格；-1 表示被挡
    const [dx, dy] = DIRS[d]; let x = fx + dx, y = fy + dy, n = 0;
    while (inGrid(C, R, x, y)) { if (occ[y * C + x]) return -1; x += dx; y += dy; n++; }
    return n;
  }
  function generate(n, opt = {}) {
    const P = T[Math.min(T.length, Math.max(1, n)) - 1];
    const [C, R, shape, p3, nObs, pRev, nClamp, hard, tickets] = P;
    let best = null;
    for (let attempt = 0; attempt < 36; attempt++) {
      const r = rng(n * 7919 + attempt * 104729 + 17);
      const f = SHAPES[shape];
      const mask = new Uint8Array(C * R); let mc = 0;
      for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) if (f(x, y, C, R)) { mask[y * C + x] = 1; mc++; }
      const occ = new Int16Array(C * R); // 0 空，-1 障碍，>0 车 id
      const obs = [];
      // 障碍：放在内部格，避免边缘
      let tries = 0;
      while (obs.length < nObs && tries++ < 400) {
        const x = 1 + Math.floor(r() * (C - 2)), y = 1 + Math.floor(r() * (R - 2)), i = y * C + x;
        if (!mask[i] || occ[i]) continue;
        let near = false; for (const o of obs) if (Math.abs(o.x - x) + Math.abs(o.y - y) < 3) near = true;
        if (near) continue;
        occ[i] = -1; obs.push({ x, y, k: Math.floor(r() * 6) });
      }
      const cars = [];
      // 反向放置：每次放一辆“当前前方畅通”的车
      const free = []; for (let i = 0; i < C * R; i++) if (mask[i] && !occ[i]) free.push(i);
      let rounds = 0, singles = 0; const maxSingles = Math.round(mc * 0.05);
      while (rounds++ < 6) {
        // 打乱
        for (let i = free.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [free[i], free[j]] = [free[j], free[i]]; }
        if (rounds === 1 && hard > 0) { // 难：先放中心（出路长），再往外填 → 依赖链更深
          const ed = i => { const x = i % C, y = (i / C) | 0; return Math.min(x, y, C - 1 - x, R - 1 - y); };
          const key = new Map(free.map(i => [i, ed(i) * hard * 2 + r() * (3 - hard * 1.5)]));
          free.sort((a, b) => key.get(b) - key.get(a));
        }
        let placed = 0;
        for (const ci of free) {
          if (occ[ci]) continue;
          const x = ci % C, y = (ci / C) | 0;
          const lens = r() < p3 ? [3, 2] : [2];
          if (rounds >= 3 && n > 2 && singles < maxSingles) lens.push(1);
          let cand = [];
          for (const len of lens) for (let d = 0; d < 4; d++) {
            // (x,y) 作为车上某一格：尝试作为车头 / 车尾
            for (let off = 0; off < len; off++) {
              const [dx, dy] = DIRS[d]; const hx = x + dx * off, hy = y + dy * off;
              const cs = cellsOf(hx, hy, d, len);
              if (!cs.every(([a, b]) => inGrid(C, R, a, b) && mask[b * C + a] && !occ[b * C + a])) continue;
              const pl = pathLen(occ, C, R, hx, hy, d);
              if (pl < 0) continue;
              // 难度：hard 高 → 喜欢长出口路径（后面更容易被堵住）
              const score = (hard * pl - (1 - hard) * pl * 0.7) + r() * 2.2 + len * 1.2;
              cand.push({ hx, hy, d, len, cs, score });
            }
            if (cand.length && len > 1) break;
          }
          if (!cand.length) continue;
          cand.sort((a, b) => b.score - a.score);
          const c = cand[0]; const id = cars.length + 1;
          for (const [a, b] of c.cs) occ[b * C + a] = id;
          cars.push({ id, x: c.hx, y: c.hy, d: c.d, len: c.len, cells: c.cs }); if (c.len === 1) singles++;
          placed++;
        }
        if (!placed) break;
      }
      // L1：只保留少量车，好学
      if (n === 1) { /* 保持完整但车位小 */ }
      // 倒车 / 车型
      for (const c of cars) {
        c.rev = n >= 10 && c.len > 1 && r() < pRev;
        c.kind = c.len === 3 ? ['bus', 'firetruck', 'boxtruck'][Math.floor(r() * 3)] : c.len === 1 ? (r() < .5 ? 'micro' : 'scooter') : ['sedan', 'taxi', 'suv', 'police', 'icecream', 'beetle', 'sports', 'ambulance'][Math.floor(r() * 8)];
        c.clamp = 0;
      }
      // 车轮锁：只给早放置的车（反序移除时它们靠后），锁数 ≤ 其前面可移走的车数
      if (nClamp) {
        const N = cars.length; const pool = cars.slice(0, Math.floor(N * 0.45)).filter(c => c.len > 1);
        for (let k = 0; k < nClamp && pool.length; k++) {
          const c = pool.splice(Math.floor(r() * pool.length), 1)[0];
          const idx = c.id - 1; const maxN = N - idx - 1;
          c.clamp = Math.max(2, Math.min(maxN, 8, 3 + Math.floor(r() * (2 + n / 6))));
        }
      }
      const filled = cars.reduce((s, c) => s + c.len, 0) + obs.length;
      const freeNow = cars.filter(c => pathLen(occ, C, R, c.x, c.y, c.d) >= 0 && !c.clamp).length;
      const lv = { n, C, R, shape, mask, cars, obs, tickets, name: NAMES[n - 1] || ('第' + n + '关'), fill: filled / mc, freeNow };
      lv.depth = depth(lv);
      const target = 2 + hard * 9;
      lv.score = filled / mc * 8 - Math.abs(lv.depth - target) * 1.2 - freeNow / cars.length * (1 + hard * 6);
      if (!best || lv.score > best.score) best = lv;
      if (n === 1) break;
    }
    return best;
  }
  function depth(lv) { // 每轮移走所有当前可走的车，需要几轮
    const { C, R } = lv; const occ = new Int16Array(C * R);
    for (const o of lv.obs) occ[o.y * C + o.x] = -1;
    let cars = lv.cars.slice(); for (const c of cars) for (const [a, b] of c.cells) occ[b * C + a] = c.id;
    let removed = 0, d = 0;
    while (cars.length && d < 99) {
      const go = cars.filter(c => c.clamp <= removed && pathLen(occ, C, R, c.x, c.y, c.d) >= 0);
      if (!go.length) return 99;
      for (const c of go) for (const [a, b] of c.cells) occ[b * C + a] = 0;
      removed += go.length; cars = cars.filter(c => !go.includes(c)); d++;
    }
    return d;
  }
  // 贪心求解：单调性 → 只要有可走的车就走，最终能否清空
  function solve(lv) {
    const { C, R } = lv; const occ = new Int16Array(C * R);
    for (const o of lv.obs) occ[o.y * C + o.x] = -1;
    const cars = lv.cars.map(c => ({ ...c })); for (const c of cars) for (const [a, b] of c.cells) occ[b * C + a] = c.id;
    let removed = 0, order = [];
    while (cars.length) {
      const i = cars.findIndex(c => c.clamp <= removed && pathLen(occ, C, R, c.x, c.y, c.d) >= 0);
      if (i < 0) return null;
      const c = cars.splice(i, 1)[0]; for (const [a, b] of c.cells) occ[b * C + a] = 0; removed++; order.push(c.id);
    }
    return order;
  }
  root.LV = { DIRS, generate, solve, pathLen, cellsOf, T, NAMES, COUNT: T.length };
})(typeof window !== 'undefined' ? window : globalThis);
