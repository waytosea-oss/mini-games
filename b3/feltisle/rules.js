/* 方寸生态的规则。纯逻辑，不碰页面。平顶六角，size 为中心到顶点。 */
(function (global) {
  'use strict';

  var SIZE = 236;
  var SQRT3 = Math.sqrt(3);
  var DIRS = [
    [0, -1],
    [1, -1],
    [1, 0],
    [0, 1],
    [-1, 1],
    [-1, 0]
  ];

  var TILES = {
    'water-straight': { biome: 'water', rivers: [0, 3], file: 'props/b29-tile-water-straight.png' },
    'water-meander': { biome: 'water', rivers: [0, 3], file: 'props/b29-tile-water-meander.png' },
    'water-turn60': { biome: 'water', rivers: [0, 1], file: 'props/b29-tile-water-turn60.png' },
    'water-turn120': { biome: 'water', rivers: [0, 2], file: 'props/b29-tile-water-turn120.png' },
    'wetland-straight': { biome: 'wetland', rivers: [0, 3], file: 'props/b29-tile-wetland-straight.png' },
    'wetland-meander': { biome: 'wetland', rivers: [0, 3], file: 'props/b29-tile-wetland-meander.png' },
    'wetland-turn60': { biome: 'wetland', rivers: [0, 1], file: 'props/b29-tile-wetland-turn60.png' },
    'wetland-turn120': { biome: 'wetland', rivers: [0, 2], file: 'props/b29-tile-wetland-turn120.png' },
    'forest-solid': { biome: 'forest', rivers: [], file: 'props/b29-tile-forest-solid.png' },
    'forest-stream': { biome: 'forest', rivers: [0, 3], file: 'props/b29-tile-forest-stream.png' },
    'forest-turn120': { biome: 'forest', rivers: [0, 2], file: 'props/b29-tile-forest-turn120.png' },
    'grass-solid': { biome: 'grass', rivers: [], file: 'props/b29-tile-grass-solid.png' },
    'grass-stream': { biome: 'grass', rivers: [0, 3], file: 'props/b29-tile-grass-stream.png' },
    'grass-turn120': { biome: 'grass', rivers: [0, 2], file: 'props/b29-tile-grass-turn120.png' },
    'start-damaged': { biome: 'start', rivers: [], file: 'props/b29-tile-start-damaged.png', fixed: true }
  };

  var GOALS = {
    tutorial: {
      id: 'tutorial',
      forest: 2,
      edges: 1,
      shore: 2,
      biomes: 3,
      maxBiome: 6,
      speciesNeed: 3,
      tileLimit: 8,
      bonusEach: 2,
      bonusTimes: 0,
      shoreStretch: 99
    },
    main: {
      id: 'main',
      forest: 4,
      edges: 3,
      shore: 4,
      biomes: 4,
      maxBiome: 5,
      speciesNeed: 3,
      tileLimit: 15,
      bonusEach: 2,
      bonusTimes: 2,
      shoreStretch: 6
    }
  };

  var GUIDE = [
    { id: 'forest-solid', q: 1, r: 0, rot: 0 },
    { id: 'forest-solid', q: 0, r: 1, rot: 0 },
    { id: 'forest-solid', q: -1, r: 1, rot: 0 },
    { id: 'forest-solid', q: 1, r: 1, rot: 0 },
    { id: 'grass-solid', q: 1, r: -1, rot: 0 },
    { id: 'grass-solid', q: -1, r: 0, rot: 0 },
    { id: 'grass-solid', q: 0, r: 2, rot: 0 },
    { id: 'water-straight', q: 2, r: 1, rot: 0 },
    { id: 'water-straight', q: 2, r: 0, rot: 0 },
    { id: 'wetland-straight', q: 2, r: 2, rot: 0 },
    { id: 'water-meander', q: 3, r: 1, rot: 0 }
  ];

  var TUTOR_SCRIPT = [
    { id: 'forest-solid', q: 1, r: 0, rot: 0 },
    { id: 'forest-solid', q: 0, r: 1, rot: 0 },
    { id: 'grass-solid', q: 1, r: -1, rot: 0 },
    { id: 'water-straight', q: 2, r: 0, rot: 0 },
    { id: 'water-straight', q: 2, r: -1, rot: 0 }
  ];

  var FLOOD = ['grass-solid', 'water-straight', 'wetland-straight', 'forest-stream', 'grass-stream', 'water-meander'];
  var TURNS = ['water-turn60', 'wetland-turn120', 'forest-turn120', 'grass-turn120', 'water-turn120', 'wetland-turn60'];

  var TUTOR_OFFERS = [
    ['forest-solid', 'grass-solid', 'water-straight'],
    ['forest-solid', 'grass-solid', 'water-meander'],
    ['grass-solid', 'forest-solid', 'wetland-straight'],
    ['water-straight', 'wetland-straight', 'grass-solid'],
    ['water-straight', 'wetland-meander', 'water-turn60']
  ];

  var TUTOR_HINTS = [
    '点一张林地，再点残岛旁边的空位。',
    '再放一块林地，两块要彼此贴住。',
    '草地贴住林地，林缘种才会来。长按物种可以看栖地。',
    '水系先点旋转，让河口避开没有河的边，再确认放下。',
    '再接一块带水的地块，水岸连起来，接口要对齐。'
  ];

  function key(q, r) { return q + ',' + r; }

  function clamp01(v) { return Math.max(0, Math.min(1, v)); }

  function normRot(rot) { return ((rot % 6) + 6) % 6; }

  function tileOf(id) { return TILES[id] || null; }

  function hasRiver(id, rot, edge) {
    var tile = TILES[id];
    if (!tile) return false;
    var r = normRot(rot);
    var rivers = tile.rivers;
    for (var i = 0; i < rivers.length; i++) {
      if ((rivers[i] + r) % 6 === edge) return true;
    }
    return false;
  }

  function isShoreId(id) {
    var tile = TILES[id];
    if (!tile || tile.fixed) return false;
    if (tile.biome === 'water' || tile.biome === 'wetland') return true;
    return tile.rivers.length > 0;
  }

  function axialToPixel(q, r, size) {
    var s = size || SIZE;
    return { x: 1.5 * s * q, y: SQRT3 * s * (r + q / 2) };
  }

  function hexRound(q, r) {
    var s = -q - r;
    var rq = Math.round(q);
    var rr = Math.round(r);
    var rs = Math.round(s);
    var dq = Math.abs(rq - q);
    var dr = Math.abs(rr - r);
    var ds = Math.abs(rs - s);
    if (dq > dr && dq > ds) rq = -rr - rs;
    else if (dr > ds) rr = -rq - rs;
    return [rq, rr];
  }

  function pixelToAxial(x, y, size) {
    var s = size || SIZE;
    var q = x / (1.5 * s);
    var r = y / (SQRT3 * s) - q / 2;
    return hexRound(q, r);
  }

  function indexCells(cells) {
    var map = {};
    (cells || []).forEach(function (cell) {
      map[key(cell.q, cell.r)] = {
        q: cell.q,
        r: cell.r,
        id: cell.id,
        rot: normRot(cell.rot || 0)
      };
    });
    return map;
  }

  function neighbor(q, r, edge) {
    var d = DIRS[edge];
    return [q + d[0], r + d[1]];
  }

  function component(map, seeds, accept) {
    var best = [];
    var seen = {};
    seeds.forEach(function (seed) {
      var sk = key(seed.q, seed.r);
      if (seen[sk] || !accept(seed)) return;
      var queue = [seed];
      var group = [];
      seen[sk] = true;
      while (queue.length) {
        var cur = queue.pop();
        group.push(cur);
        for (var e = 0; e < 6; e++) {
          var nr = neighbor(cur.q, cur.r, e);
          var nk = key(nr[0], nr[1]);
          if (seen[nk]) continue;
          var next = map[nk];
          if (!next || !accept(next)) continue;
          seen[nk] = true;
          queue.push(next);
        }
      }
      if (group.length > best.length) best = group;
    });
    return best;
  }

  function centroidCell(group) {
    if (!group.length) return null;
    var sx = 0;
    var sy = 0;
    group.forEach(function (cell) {
      var p = axialToPixel(cell.q, cell.r, SIZE);
      sx += p.x;
      sy += p.y;
    });
    sx /= group.length;
    sy /= group.length;
    var best = group[0];
    var bestD = Infinity;
    group.forEach(function (cell) {
      var p = axialToPixel(cell.q, cell.r, SIZE);
      var d = (p.x - sx) * (p.x - sx) + (p.y - sy) * (p.y - sy);
      if (d < bestD) {
        bestD = d;
        best = cell;
      }
    });
    return { q: best.q, r: best.r };
  }

  function touches(aGroup, bGroup) {
    var set = {};
    bGroup.forEach(function (cell) { set[key(cell.q, cell.r)] = true; });
    for (var i = 0; i < aGroup.length; i++) {
      for (var e = 0; e < 6; e++) {
        var nr = neighbor(aGroup[i].q, aGroup[i].r, e);
        if (set[key(nr[0], nr[1])]) return true;
      }
    }
    return false;
  }

  function band(v) {
    if (v >= 0.72) return 'full';
    if (v >= 0.36) return 'mid';
    return 'low';
  }

  function evaluate(cells, goal) {
    var g = goal || GOALS.main;
    var map = indexCells(cells);
    var list = Object.keys(map).map(function (k) { return map[k]; });
    var counts = { water: 0, forest: 0, grass: 0, wetland: 0 };
    var breaks = 0;
    var joints = 0;
    var breakTiles = {};
    var edgePairs = 0;

    list.forEach(function (cell) {
      var tile = TILES[cell.id];
      if (!tile || tile.fixed) return;
      if (counts[tile.biome] !== undefined) counts[tile.biome] += 1;
    });

    list.forEach(function (cell) {
      for (var e = 0; e < 6; e++) {
        var nr = neighbor(cell.q, cell.r, e);
        var other = map[key(nr[0], nr[1])];
        if (!other) continue;
        if (key(cell.q, cell.r) > key(other.q, other.r)) continue;
        var a = hasRiver(cell.id, cell.rot, e);
        var b = hasRiver(other.id, other.rot, (e + 3) % 6);
        if (a || b) joints += 1;
        if (a !== b) {
          breaks += 1;
          breakTiles[key(cell.q, cell.r)] = true;
          breakTiles[key(other.q, other.r)] = true;
        }
        var ba = TILES[cell.id] && TILES[cell.id].biome;
        var bb = TILES[other.id] && TILES[other.id].biome;
        if ((ba === 'grass' && bb === 'forest') || (ba === 'forest' && bb === 'grass')) edgePairs += 1;
      }
    });

    var forests = list.filter(function (cell) { return TILES[cell.id] && TILES[cell.id].biome === 'forest'; });
    var shores = list.filter(function (cell) { return isShoreId(cell.id); });
    var forestGroup = component(map, forests, function (cell) { return TILES[cell.id] && TILES[cell.id].biome === 'forest'; });
    var shoreGroup = component(map, shores, function (cell) { return isShoreId(cell.id); });
    var forestSize = forestGroup.length;
    var shoreSize = shoreGroup.length;

    var raw = {
      forest: forestSize >= g.forest,
      edge: edgePairs >= g.edges,
      shore: shoreSize >= g.shore
    };

    var biomes = ['forest', 'grass', 'water', 'wetland'];
    var max = 0;
    var min = Infinity;
    var minName = 'grass';
    biomes.forEach(function (name) {
      var c = counts[name];
      if (c > max) max = c;
      if (c < min) {
        min = c;
        minName = name;
      }
    });
    var present = biomes.filter(function (name) { return counts[name] > 0; }).length;
    var suppressed = null;
    var species = { forest: raw.forest, edge: raw.edge, shore: raw.shore };
    if (max > g.maxBiome) {
      if (minName === 'forest') suppressed = 'forest';
      else if (minName === 'grass') suppressed = 'edge';
      else suppressed = 'shore';
      species[suppressed] = false;
    }

    var specCount = (species.forest ? 1 : 0) + (species.edge ? 1 : 0) + (species.shore ? 1 : 0);
    var integrity = breaks === 0 ? 1 : Math.max(0, 1 - breaks / Math.max(1, joints));
    var connect = clamp01(
      0.34 * integrity +
      0.22 * Math.min(1, forestSize / g.forest) +
      0.22 * Math.min(1, shoreSize / g.shore) +
      0.22 * Math.min(1, edgePairs / g.edges)
    );
    var diversity = clamp01(
      0.4 * Math.min(1, present / g.biomes) +
      0.3 * (max <= g.maxBiome ? 1 : Math.max(0, 1 - (max - g.maxBiome) / Math.max(1, g.maxBiome))) +
      0.3 * (specCount / g.speciesNeed)
    );
    var connectOk = breaks === 0 && forestSize >= g.forest && shoreSize >= g.shore && edgePairs >= g.edges;
    var diversityOk = present >= g.biomes && max <= g.maxBiome && specCount >= g.speciesNeed;

    var edgeStand = null;
    var edgeScore = -1;
    list.forEach(function (cell) {
      if (!TILES[cell.id] || TILES[cell.id].biome !== 'grass') return;
      var score = 0;
      for (var e = 0; e < 6; e++) {
        var nr = neighbor(cell.q, cell.r, e);
        var other = map[key(nr[0], nr[1])];
        if (other && TILES[other.id] && TILES[other.id].biome === 'forest') score += 1;
      }
      if (score > edgeScore) {
        edgeScore = score;
        edgeStand = { q: cell.q, r: cell.r };
      }
    });

    return {
      counts: counts,
      breaks: breaks,
      joints: joints,
      breakTiles: Object.keys(breakTiles),
      edgePairs: edgePairs,
      forestSize: forestSize,
      shoreSize: shoreSize,
      present: present,
      maxBiome: max,
      suppressed: suppressed,
      species: species,
      speciesRaw: raw,
      specCount: specCount,
      connect: connect,
      diversity: diversity,
      connectBand: band(connect),
      diversityBand: band(diversity),
      connectOk: connectOk,
      diversityOk: diversityOk,
      win: connectOk && diversityOk,
      linked: touches(forestGroup, shoreGroup),
      stands: {
        forest: species.forest ? centroidCell(forestGroup) : null,
        edge: species.edge ? edgeStand : null,
        shore: species.shore ? centroidCell(shoreGroup) : null
      }
    };
  }

  function legalCells(cells) {
    var map = indexCells(cells);
    var found = {};
    Object.keys(map).forEach(function (k) {
      var cell = map[k];
      for (var e = 0; e < 6; e++) {
        var nr = neighbor(cell.q, cell.r, e);
        var nk = key(nr[0], nr[1]);
        if (!map[nk]) found[nk] = { q: nr[0], r: nr[1] };
      }
    });
    return Object.keys(found).map(function (k) { return found[k]; });
  }

  function isLegal(cells, q, r) {
    return legalCells(cells).some(function (cell) { return cell.q === q && cell.r === r; });
  }

  function startCells() {
    return [{ q: 0, r: 0, id: 'start-damaged', rot: 0 }];
  }

  function guideProgress(cells) {
    var map = indexCells(cells);
    var n = 0;
    for (var i = 0; i < GUIDE.length; i++) {
      var g = GUIDE[i];
      var cell = map[key(g.q, g.r)];
      if (!cell || cell.id !== g.id) break;
      if (TILES[g.id].rivers.length && cell.rot !== g.rot) break;
      n += 1;
    }
    return n;
  }

  function tutorStep(ev) {
    var checks = [
      ev.counts.forest >= 1,
      ev.forestSize >= 2,
      ev.edgePairs >= 1,
      (ev.counts.water + ev.counts.wetland) >= 1 && ev.breaks === 0,
      ev.shoreSize >= 2 && ev.breaks === 0
    ];
    var step = 0;
    while (step < checks.length && checks[step]) step += 1;
    return step;
  }

  function uniqueOffers(list) {
    var out = [];
    list.forEach(function (id) {
      if (out.length < 3 && out.indexOf(id) < 0 && TILES[id] && !TILES[id].fixed) out.push(id);
    });
    return out;
  }

  function deal(mode, cells) {
    var goal = GOALS[mode] || GOALS.main;
    var ev = evaluate(cells, goal);
    if (mode === 'tutorial') {
      var step = tutorStep(ev);
      return {
        step: step,
        offers: TUTOR_OFFERS[Math.min(step, TUTOR_OFFERS.length - 1)].slice(),
        hint: ev.win ? '教学小岛稳住了。' : TUTOR_HINTS[Math.min(step, TUTOR_HINTS.length - 1)],
        done: step >= TUTOR_OFFERS.length,
        ev: ev
      };
    }
    var progress = guideProgress(cells);
    var placed = (cells || []).filter(function (cell) { return cell.id !== 'start-damaged'; }).length;
    var guideId = progress < GUIDE.length ? GUIDE[progress].id : FLOOD[placed % FLOOD.length];
    var offers = uniqueOffers([
      guideId,
      FLOOD[placed % FLOOD.length],
      TURNS[placed % TURNS.length],
      'wetland-straight',
      'grass-solid',
      'water-turn60'
    ]);
    var hint = progress === 0
      ? '从残岛边上开始。三张里选一块，贴到空位上。'
      : '新的一片要贴住已有的岛。放下前可以旋转，看河口能不能接上。';
    return { step: progress, offers: offers, hint: hint, done: progress >= GUIDE.length, ev: ev };
  }

  function migrationAward(before, after, flags, goal) {
    var f = { mig1: !!(flags && flags.mig1), mig2: !!(flags && flags.mig2) };
    var add = 0;
    var awards = [];
    if (!goal || goal.bonusTimes < 1) return { flags: f, bonusAdd: 0, awards: awards };
    var ready = after.species.forest && after.species.edge && after.species.shore && after.linked;
    var was = before.species.forest && before.species.edge && before.species.shore && before.linked;
    if (!f.mig1 && ready && !was) {
      f.mig1 = true;
      add += goal.bonusEach;
      awards.push('corridor');
    }
    var stretch = after.shoreSize >= goal.shoreStretch && after.breaks === 0;
    var stretchWas = before.shoreSize >= goal.shoreStretch && before.breaks === 0;
    if (f.mig1 && !f.mig2 && goal.bonusTimes >= 2 && stretch && !stretchWas) {
      f.mig2 = true;
      add += goal.bonusEach;
      awards.push('stretch');
    }
    return { flags: f, bonusAdd: add, awards: awards };
  }

  function placeAll(script, goal) {
    var cells = startCells();
    var flags = { mig1: false, mig2: false };
    var bonus = 0;
    var awards = [];
    script.forEach(function (step) {
      var before = evaluate(cells, goal);
      cells = cells.concat([{ q: step.q, r: step.r, id: step.id, rot: step.rot }]);
      var after = evaluate(cells, goal);
      var mig = migrationAward(before, after, flags, goal);
      flags = mig.flags;
      bonus += mig.bonusAdd;
      awards = awards.concat(mig.awards);
    });
    return { cells: cells, ev: evaluate(cells, goal), bonus: bonus, flags: flags, awards: awards };
  }

  function demandCopy(mode, kind) {
    if (mode === 'tutorial') {
      if (kind === 'forest') return '林栖种：两块林地要彼此贴住，连成一小片。';
      if (kind === 'edge') return '林缘种：草地贴住林地，站在这道边上。';
      return '水岸种：两块带水的地块连成水岸。水系、湿地，以及带溪流的林地和草地，都算水岸。';
    }
    if (kind === 'forest') return '林栖种：四块林地要连成一片。';
    if (kind === 'edge') return '林缘种：草地与林地至少贴住三条边。';
    return '水岸种：四块带水的地块连成水岸。任何一种栖地超过五块，会挤占最少的那种需求，对应的物种会离开。';
  }

  function replayLine(prev, cur) {
    var bits = [];
    if (!prev) prev = { breaks: 0, connect: 0, diversity: 0, species: { forest: false, edge: false, shore: false }, suppressed: null };
    if (cur.breaks > prev.breaks) bits.push('多了一处接不上的河口。');
    else if (cur.breaks < prev.breaks) bits.push('有一处河口重新对齐。');
    if (cur.connect > prev.connect + 0.04) bits.push('连通弧线往上走。');
    else if (cur.connect < prev.connect - 0.04) bits.push('连通弧线往下落。');
    if (cur.diversity > prev.diversity + 0.04) bits.push('多样性弧线往上走。');
    else if (cur.diversity < prev.diversity - 0.04) bits.push('多样性弧线往下落。');
    if (cur.species.forest && !prev.species.forest) bits.push('林栖种驻留。');
    if (cur.species.edge && !prev.species.edge) bits.push('林缘种驻留。');
    if (cur.species.shore && !prev.species.shore) bits.push('水岸种驻留。');
    if (!cur.species.shore && prev.species.shore) bits.push('水岸种离开了。');
    if (!cur.species.forest && prev.species.forest) bits.push('林栖种离开了。');
    if (!cur.species.edge && prev.species.edge) bits.push('林缘种离开了。');
    if (cur.suppressed && cur.suppressed !== prev.suppressed) bits.push('有一种栖地铺得太多，挤占了另一种需求。');
    if (!bits.length) bits.push('这一步的两条弧线几乎没动。');
    return bits.join('');
  }

  function selfCheck() {
    var errors = [];
    function assert(cond, msg) {
      if (!cond) errors.push(msg);
    }
    DIRS.forEach(function (d, edge) {
      var back = neighbor(d[0], d[1], (edge + 3) % 6);
      assert(back[0] === 0 && back[1] === 0, '边 ' + edge + ' 的对边没有回到原点');
      var dist = Math.hypot(axialToPixel(d[0], d[1], SIZE).x, axialToPixel(d[0], d[1], SIZE).y);
      assert(Math.abs(dist - SQRT3 * SIZE) < 0.01, '邻格间距不对 ' + edge);
      var round = pixelToAxial(axialToPixel(d[0], d[1], SIZE).x, axialToPixel(d[0], d[1], SIZE).y, SIZE);
      assert(round[0] === d[0] && round[1] === d[1], '轴向往返失败 ' + edge);
    });
    assert(Math.abs(2 * SIZE - 472) < 1, '宽度');
    assert(Math.abs(SQRT3 * SIZE - 408.7) < 1, '高度');

    var faced = startCells().concat([{ q: 0, r: 1, id: 'water-straight', rot: 0 }]);
    var broke = evaluate(faced, GOALS.main);
    assert(broke.breaks === 1, '直行河朝向受损底格应断流，实际 ' + broke.breaks);
    var turned = startCells().concat([{ q: 0, r: 1, id: 'water-straight', rot: 1 }]);
    var safe = evaluate(turned, GOALS.main);
    assert(safe.breaks === 0, '旋转后河口避开底格，实际断流 ' + safe.breaks);

    var pair = startCells().concat([
      { q: 2, r: 0, id: 'water-straight', rot: 0 },
      { q: 2, r: 1, id: 'water-straight', rot: 0 }
    ]);
    assert(evaluate(pair, GOALS.main).breaks === 0, '两条直行河南北相接不该断流');
    var mismatch = startCells().concat([
      { q: 2, r: 0, id: 'water-straight', rot: 0 },
      { q: 2, r: 1, id: 'water-straight', rot: 1 }
    ]);
    assert(evaluate(mismatch, GOALS.main).breaks >= 1, '旋转错开的河口应断流');

    var splitForest = startCells().concat([
      { q: 1, r: 0, id: 'forest-solid', rot: 0 },
      { q: 2, r: 0, id: 'forest-solid', rot: 0 },
      { q: -1, r: 0, id: 'forest-solid', rot: 0 },
      { q: -2, r: 1, id: 'forest-solid', rot: 0 }
    ]);
    var splitEv = evaluate(splitForest, GOALS.main);
    assert(splitEv.forestSize === 2, '分开的林地连通块应为 2，实际 ' + splitEv.forestSize);
    assert(!splitEv.species.forest, '未连成四块时林栖种不出现');

    var lonelyGrass = startCells().concat([
      { q: 1, r: 0, id: 'forest-solid', rot: 0 },
      { q: 1, r: 1, id: 'forest-solid', rot: 0 },
      { q: -1, r: 0, id: 'grass-solid', rot: 0 }
    ]);
    assert(evaluate(lonelyGrass, GOALS.main).edgePairs === 0, '草地没贴住林地时没有林缘');
    assert(!evaluate(lonelyGrass, GOALS.tutorial).species.edge, '教学里不相邻也不出现林缘种');

    var shortShore = startCells().concat([
      { q: 2, r: 0, id: 'water-straight', rot: 0 },
      { q: 2, r: 1, id: 'wetland-straight', rot: 0 },
      { q: 2, r: 2, id: 'water-meander', rot: 0 }
    ]);
    assert(evaluate(shortShore, GOALS.main).shoreSize === 3, '水岸长度');
    assert(!evaluate(shortShore, GOALS.main).species.shore, '正式岛三块水岸不够');
    assert(evaluate(shortShore, GOALS.tutorial).species.shore, '教学两块以上水岸应出现水岸种');

    var tutor = placeAll(TUTOR_SCRIPT, GOALS.tutorial);
    assert(tutor.ev.win, '教学脚本应能过关 ' + JSON.stringify({
      breaks: tutor.ev.breaks,
      forest: tutor.ev.forestSize,
      edges: tutor.ev.edgePairs,
      shore: tutor.ev.shoreSize,
      present: tutor.ev.present,
      species: tutor.ev.species
    }));
    assert(tutor.ev.species.forest && tutor.ev.species.edge && tutor.ev.species.shore, '教学三种栖地都要出现');
    assert(TUTOR_SCRIPT.length <= GOALS.tutorial.tileLimit, '教学片数');

    var main = placeAll(GUIDE, GOALS.main);
    assert(main.ev.breaks === 0, '正式岛脚本断流 ' + main.ev.breaks);
    assert(main.ev.forestSize >= 4, '正式岛林地 ' + main.ev.forestSize);
    assert(main.ev.edgePairs >= 3, '正式岛林缘 ' + main.ev.edgePairs);
    assert(main.ev.shoreSize >= 4, '正式岛水岸 ' + main.ev.shoreSize);
    assert(main.ev.present === 4, '正式岛四种栖地 ' + main.ev.present);
    assert(main.ev.maxBiome <= 5, '正式岛单栖地 ' + main.ev.maxBiome);
    assert(main.ev.win, '正式岛应在十五片内获胜，实际片数 ' + (GUIDE.length));
    assert(GUIDE.length <= 15, '胜利片数超过十五');
    assert(main.awards.indexOf('corridor') >= 0, '迁徙通道应奖励一次');
    assert(main.bonus === GOALS.main.bonusEach, '首次迁徙补片 ' + main.bonus);

    var floodedCells = main.cells.concat([
      { q: 1, r: 2, id: 'forest-solid', rot: 0 },
      { q: -1, r: 2, id: 'forest-solid', rot: 0 }
    ]);
    var flood = evaluate(floodedCells, GOALS.main);
    assert(flood.maxBiome > 5, '过度扩张样本');
    assert(flood.suppressed === 'shore', '过多林地应挤占水岸需求，实际 ' + flood.suppressed);
    assert(!flood.species.shore, '被挤占的水岸种离开');
    assert(flood.speciesRaw.shore, '几何上水岸仍在');
    assert(!flood.win, '单一栖地铺满不能获胜');

    var stretchCells = main.cells.concat([
      { q: 3, r: 0, id: 'water-straight', rot: 0 },
      { q: 3, r: 2, id: 'wetland-straight', rot: 0 }
    ]);
    var beforeStretch = evaluate(main.cells, GOALS.main);
    var afterStretch = evaluate(stretchCells, GOALS.main);
    var second = migrationAward(beforeStretch, afterStretch, main.flags, GOALS.main);
    assert(afterStretch.breaks === 0, '延长水岸不应断流 ' + afterStretch.breaks + ' 水岸 ' + afterStretch.shoreSize);
    assert(second.awards.indexOf('stretch') >= 0, '第二次迁徙应补片');
    var third = migrationAward(afterStretch, evaluate(stretchCells.concat([{ q: 4, r: 1, id: 'water-straight', rot: 0 }]), GOALS.main), second.flags, GOALS.main);
    assert(third.bonusAdd === 0, '迁徙奖励只有两次');
    assert(main.bonus + second.bonusAdd === 4, '补片合计四');

    var blob = startCells();
    for (var i = 0; i < 15; i++) blob = blob.concat([{ q: i + 1, r: 0, id: 'forest-solid', rot: 0 }]);
    var lost = evaluate(blob, GOALS.main);
    assert(!lost.win, '十五片林地不应获胜');
    assert(lost.present === 1, '单一栖地');

    var dealt = deal('main', startCells());
    assert(dealt.offers.length === 3, '三张候选');
    assert(dealt.offers.indexOf('start-damaged') < 0, '受损底格不可购买');
    assert(dealt.offers.indexOf('forest-solid') >= 0, '开局应提供林地');
    var tutorDeal = deal('tutorial', startCells());
    assert(tutorDeal.offers.length === 3, '教学三张候选');

    GUIDE.forEach(function (step, index) {
      var cells = startCells().concat(GUIDE.slice(0, index));
      assert(isLegal(cells, step.q, step.r), '引导第 ' + index + ' 步不相邻');
    });
    TUTOR_SCRIPT.forEach(function (step, index) {
      var cells = startCells().concat(TUTOR_SCRIPT.slice(0, index));
      assert(isLegal(cells, step.q, step.r), '教学第 ' + index + ' 步不相邻');
    });

    var line = replayLine(null, main.ev);
    assert(line.length > 0, '复盘语句');
    return { ok: errors.length === 0, errors: errors, main: { tiles: GUIDE.length, bonus: main.bonus, connect: main.ev.connect, diversity: main.ev.diversity }, tutorTiles: TUTOR_SCRIPT.length };
  }

  global.FELT_RULES = {
    SIZE: SIZE,
    SQRT3: SQRT3,
    DIRS: DIRS,
    TILES: TILES,
    GOALS: GOALS,
    GUIDE: GUIDE,
    TUTOR_SCRIPT: TUTOR_SCRIPT,
    key: key,
    normRot: normRot,
    axialToPixel: axialToPixel,
    pixelToAxial: pixelToAxial,
    hexRound: hexRound,
    evaluate: evaluate,
    legalCells: legalCells,
    isLegal: isLegal,
    startCells: startCells,
    guideProgress: guideProgress,
    deal: deal,
    migrationAward: migrationAward,
    placeAll: placeAll,
    demandCopy: demandCopy,
    replayLine: replayLine,
    band: band,
    isShoreId: isShoreId,
    hasRiver: hasRiver,
    selfCheck: selfCheck
  };
})(typeof window !== 'undefined' ? window : globalThis);
