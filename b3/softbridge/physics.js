/* 软桥救援：固定步长的二维梁索。同一设计、同一种子，步长批次不同也得到同一结果。 */
(function (root) {
  'use strict';

  var SEED = 20261123;
  var DT = 1 / 240;
  var G = 9.8;
  var SPAN = 8;
  var BUDGET = 100;
  var NODE_CAP = 8;
  var GEL_RATE = 5;
  var CABLE_RATE = 2;
  var MIN_LEN = 0.85;
  var MAX_LEN = 9.2;
  var MIN_GAP = 0.72;

  var GEL_K = 1800;
  var GEL_C = 36;
  var CABLE_K = 3600;
  var CABLE_C = 22;
  var BEND_K = 36;
  var BEND_C = 8;
  var GEL_STRAIN = 0.2;
  var CABLE_STRAIN = 0.34;
  var DISP_LIMIT = 0.6;
  var NODE_FORCE = 1200;
  var HURT_TIME = 0.09;
  var SNAP_RATIO = 1.72;

  var BEASTS = [
    { id: 'light', name: '芽芽', tag: '轻', load: 16, speed: 1.2 },
    { id: 'mid', name: '奶团', tag: '中', load: 40, speed: 0.96 },
    { id: 'heavy', name: '蜜石', tag: '重', load: 74, speed: 0.7 }
  ];

  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shoreNode(id, x, y, role, name) {
    return { id: id, x: x, y: y, fixed: true, role: role, name: name };
  }

  function freshDesign() {
    return {
      seed: SEED,
      budget: BUDGET,
      budgetMax: BUDGET,
      nodeSeq: 1,
      gelSeq: 0,
      cableSeq: 0,
      nodes: [
        shoreNode('LD', 0, 0, 'deck', '左岸锚'),
        shoreNode('LH', -1.35, 1.5, 'high', '左高锚'),
        shoreNode('RD', SPAN, 0, 'deck', '右岸锚'),
        shoreNode('RH', SPAN + 1.35, 1.5, 'high', '右高锚')
      ],
      members: []
    };
  }

  function cloneDesign(d) {
    return JSON.parse(JSON.stringify(d));
  }

  function nodeById(d, id) {
    for (var i = 0; i < d.nodes.length; i++) if (d.nodes[i].id === id) return d.nodes[i];
    return null;
  }

  function memberById(d, id) {
    for (var i = 0; i < d.members.length; i++) if (d.members[i].id === id) return d.members[i];
    return null;
  }

  function dist(ax, ay, bx, by) {
    var dx = ax - bx;
    var dy = ay - by;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function costOf(kind, len) {
    var rate = kind === 'gel' ? GEL_RATE : CABLE_RATE;
    return Math.max(1, Math.round(len * rate));
  }

  function freeCount(d) {
    var n = 0;
    for (var i = 0; i < d.nodes.length; i++) if (!d.nodes[i].fixed) n++;
    return n;
  }

  function placeReason(d, x, y, ignoreId) {
    if (x < -1.95 || x > SPAN + 1.95 || y < -2.35 || y > 3.35) return '这里出了搭建范围';
    if (x <= 0.02 && y < -0.04) return '这块是岸壁岩体';
    if (x >= SPAN - 0.02 && y < -0.04) return '这块是岸壁岩体';
    if (!ignoreId && freeCount(d) >= NODE_CAP) return '节点已经放满';
    for (var i = 0; i < d.nodes.length; i++) {
      var n = d.nodes[i];
      if (n.id === ignoreId) continue;
      if (dist(n.x, n.y, x, y) < MIN_GAP) return '离别的锚点太近';
    }
    return '';
  }

  function hasMember(d, a, b) {
    for (var i = 0; i < d.members.length; i++) {
      var m = d.members[i];
      if ((m.a === a && m.b === b) || (m.a === b && m.b === a)) return true;
    }
    return false;
  }

  function makeMember(d, a, b, kind, cost, tested) {
    var len = dist(a.x, a.y, b.x, b.y);
    var seq = kind === 'gel' ? ++d.gelSeq : ++d.cableSeq;
    var m = {
      id: kind + seq,
      a: a.id,
      b: b.id,
      kind: kind,
      cost: cost,
      tested: !!tested,
      rest: len,
      name: (kind === 'gel' ? '胶梁 ' : '拉索 ') + seq
    };
    d.members.push(m);
    return m;
  }

  function linkNodes(d, a, b, kind) {
    if (!a || !b || a.id === b.id) return { ok: false, reason: '需要两个锚点' };
    if (hasMember(d, a.id, b.id)) return { ok: false, reason: '这两点已经连过' };
    var len = dist(a.x, a.y, b.x, b.y);
    if (len < MIN_LEN) return { ok: false, reason: '这一段太短' };
    if (len > MAX_LEN) return { ok: false, reason: '这一段太长，中间需要节点' };
    var cost = costOf(kind, len);
    if (cost > d.budget) return { ok: false, reason: '预算不够铺这一段', cost: cost };
    d.budget -= cost;
    var m = makeMember(d, a, b, kind, cost, false);
    return { ok: true, member: m, cost: cost, refund: 0 };
  }

  function nearestNode(d, x, y, ignoreId, radius) {
    var best = null;
    var bestD = radius;
    for (var i = 0; i < d.nodes.length; i++) {
      var n = d.nodes[i];
      if (n.id === ignoreId) continue;
      var dd = dist(n.x, n.y, x, y);
      if (dd <= bestD) {
        bestD = dd;
        best = n;
      }
    }
    return best;
  }

  function projectMember(d, m, x, y) {
    var a = nodeById(d, m.a);
    var b = nodeById(d, m.b);
    var dx = b.x - a.x;
    var dy = b.y - a.y;
    var L2 = dx * dx + dy * dy || 1e-6;
    var t = ((x - a.x) * dx + (y - a.y) * dy) / L2;
    var u = Math.max(0, Math.min(1, t));
    var px = a.x + dx * u;
    var py = a.y + dy * u;
    return { t: u, x: px, y: py, dist: dist(px, py, x, y), len: Math.sqrt(L2) };
  }

  function hitMember(d, x, y, radius) {
    var best = null;
    for (var i = 0; i < d.members.length; i++) {
      var m = d.members[i];
      var p = projectMember(d, m, x, y);
      if (p.t < 0.14 || p.t > 0.86) continue;
      if (p.dist > radius) continue;
      if (p.len * p.t < MIN_LEN || p.len * (1 - p.t) < MIN_LEN) continue;
      if (!best || p.dist < best.dist) best = { member: m, t: p.t, x: p.x, y: p.y, dist: p.dist };
    }
    return best;
  }

  function splitMember(d, hit) {
    var m = hit.member;
    var a = nodeById(d, m.a);
    var b = nodeById(d, m.b);
    var why = placeReason(d, hit.x, hit.y, null);
    if (why) return { ok: false, reason: why };
    var id = 'N' + d.nodeSeq++;
    var node = { id: id, x: hit.x, y: hit.y, fixed: false, role: 'free', name: '节点 ' + id.slice(1) };
    var c1 = Math.max(1, Math.round(m.cost * hit.t));
    var c2 = Math.max(1, m.cost - c1);
    var tested = m.tested;
    var kind = m.kind;
    d.nodes.push(node);
    d.members = d.members.filter(function (item) { return item.id !== m.id; });
    var left = makeMember(d, a, node, kind, c1, tested);
    var right = makeMember(d, node, b, kind, c2, tested);
    left.rest = dist(a.x, a.y, node.x, node.y);
    right.rest = dist(node.x, node.y, b.x, b.y);
    return { ok: true, node: node, left: left, right: right };
  }

  function tryBuild(d, fromId, x, y, kind) {
    var from = nodeById(d, fromId);
    if (!from) return { ok: false, reason: '没有这个锚点' };
    if (kind !== 'gel' && kind !== 'cable') return { ok: false, reason: '先选胶梁或拉索' };
    var snapped = nearestNode(d, x, y, fromId, 0.78);
    if (snapped) return linkNodes(d, from, snapped, kind);
    var hit = hitMember(d, x, y, 0.48);
    if (hit && hit.member.a !== fromId && hit.member.b !== fromId) {
      var snap = cloneDesign(d);
      var split = splitMember(d, hit);
      if (!split.ok) return split;
      var linked = linkNodes(d, from, split.node, kind);
      if (!linked.ok) {
        d.nodes = snap.nodes;
        d.members = snap.members;
        d.budget = snap.budget;
        d.nodeSeq = snap.nodeSeq;
        d.gelSeq = snap.gelSeq;
        d.cableSeq = snap.cableSeq;
        return linked;
      }
      linked.split = true;
      linked.node = split.node;
      return linked;
    }
    var len = dist(from.x, from.y, x, y);
    if (len < MIN_LEN) return { ok: false, reason: '这一段太短' };
    if (len > MAX_LEN) return { ok: false, reason: '这一段太长，中间需要节点' };
    var why = placeReason(d, x, y, null);
    if (why) return { ok: false, reason: why };
    var cost = costOf(kind, len);
    if (cost > d.budget) return { ok: false, reason: '预算不够铺这一段', cost: cost };
    var id = 'N' + d.nodeSeq++;
    var node = { id: id, x: x, y: y, fixed: false, role: 'free', name: '节点 ' + id.slice(1) };
    d.nodes.push(node);
    d.budget -= cost;
    var m = makeMember(d, from, node, kind, cost, false);
    return { ok: true, member: m, node: node, cost: cost, refund: 0 };
  }

  function pruneNodes(d) {
    var used = {};
    for (var i = 0; i < d.members.length; i++) {
      used[d.members[i].a] = true;
      used[d.members[i].b] = true;
    }
    d.nodes = d.nodes.filter(function (n) { return n.fixed || used[n.id]; });
  }

  function removeMember(d, id) {
    var m = memberById(d, id);
    if (!m) return { ok: false, reason: '没有这根材料' };
    var refund = m.tested ? Math.floor(m.cost * 0.5) : m.cost;
    d.budget += refund;
    if (d.budget > d.budgetMax) d.budget = d.budgetMax;
    d.members = d.members.filter(function (item) { return item.id !== id; });
    pruneNodes(d);
    return { ok: true, refund: refund, tested: !!m.tested, name: m.name, full: !m.tested };
  }

  function moveNode(d, id, x, y) {
    var n = nodeById(d, id);
    if (!n) return { ok: false, reason: '没有这个节点' };
    if (n.fixed) return { ok: false, reason: '岸上的锚不能拖走' };
    var why = placeReason(d, x, y, id);
    if (why) return { ok: false, reason: why };
    var updates = [];
    var delta = 0;
    for (var i = 0; i < d.members.length; i++) {
      var m = d.members[i];
      if (m.a !== id && m.b !== id) continue;
      var a = nodeById(d, m.a);
      var b = nodeById(d, m.b);
      var ax = m.a === id ? x : a.x;
      var ay = m.a === id ? y : a.y;
      var bx = m.b === id ? x : b.x;
      var by = m.b === id ? y : b.y;
      var len = dist(ax, ay, bx, by);
      if (len < MIN_LEN || len > MAX_LEN) return { ok: false, reason: '挪过去以后，有的梁长度不合适' };
      var nc = costOf(m.kind, len);
      delta += nc - m.cost;
      updates.push({ m: m, cost: nc, rest: len });
    }
    if (delta > d.budget) return { ok: false, reason: '预算不够把梁拉到这里' };
    n.x = x;
    n.y = y;
    d.budget -= delta;
    for (var u = 0; u < updates.length; u++) {
      updates[u].m.cost = updates[u].cost;
      updates[u].m.rest = updates[u].rest;
    }
    return { ok: true, delta: delta };
  }

  function markTested(d) {
    for (var i = 0; i < d.members.length; i++) d.members[i].tested = true;
  }

  function segCount(len) {
    return Math.max(3, Math.min(7, Math.round(len / 1.2)));
  }

  function startRun(design) {
    var rng = mulberry32(design.seed || SEED);
    var nodes = [];
    var index = {};
    for (var i = 0; i < design.nodes.length; i++) {
      var src = design.nodes[i];
      var n = {
        id: src.id,
        x: src.x,
        y: src.y,
        x0: src.x,
        y0: src.y,
        vx: 0,
        vy: 0,
        fx: 0,
        fy: 0,
        fixed: !!src.fixed,
        role: src.role || 'free',
        name: src.name,
        mass: src.fixed ? 0 : 0.62,
        internal: false,
        ratio: 0,
        sumAbs: 0,
        maxSum: 0
      };
      index[n.id] = n;
      nodes.push(n);
    }
    var members = [];
    var seq = 0;
    for (var m = 0; m < design.members.length; m++) {
      var srcM = design.members[m];
      var a = index[srcM.a];
      var b = index[srcM.b];
      if (!a || !b) continue;
      var len = dist(a.x, a.y, b.x, b.y);
      var nSeg = segCount(Math.max(len, srcM.rest || len));
      var chain = [a.id];
      for (var s = 1; s < nSeg; s++) {
        var t = s / nSeg;
        var id = srcM.id + '~' + s;
        var node = {
          id: id,
          x: a.x + (b.x - a.x) * t,
          y: a.y + (b.y - a.y) * t,
          x0: a.x + (b.x - a.x) * t,
          y0: a.y + (b.y - a.y) * t,
          vx: 0,
          vy: 0,
          fx: 0,
          fy: 0,
          fixed: false,
          role: 'inner',
          name: srcM.name,
          mass: srcM.kind === 'gel' ? 0.16 : 0.045,
          internal: true,
          owner: srcM.id,
          ratio: 0,
          sumAbs: 0,
          maxSum: 0
        };
        index[id] = node;
        nodes.push(node);
        chain.push(id);
      }
      chain.push(b.id);
      members.push({
        id: srcM.id,
        a: srcM.a,
        b: srcM.b,
        kind: srcM.kind,
        name: srcM.name,
        rest: srcM.rest || len,
        segRest: (srcM.rest || len) / nSeg,
        chain: chain,
        k: srcM.kind === 'gel' ? GEL_K : CABLE_K,
        c: srcM.kind === 'gel' ? GEL_C : CABLE_C,
        ratio: 0,
        peak: 0,
        peakT: 0.5,
        peakMode: 'pull',
        sag: 0,
        tension: 0,
        strain: 0,
        hurt: 0,
        broken: false,
        axial: 0,
        maxDisp: 0,
        maxStrainAbs: 0
      });
      seq++;
    }
    var walk = walkSet(members);
    return {
      seed: design.seed || SEED,
      rng: rng,
      nodes: nodes,
      index: index,
      members: members,
      walk: walk,
      beastIndex: 0,
      beast: spawnBeast(0),
      arrived: 0,
      stood: [],
      phase: members.length ? 'run' : 'run',
      time: 0,
      fail: null,
      peak: 0,
      peakMember: null,
      hold: 0,
      steps: 0,
      _seq: seq
    };
  }

  function spawnBeast(index) {
    var spec = BEASTS[index];
    return {
      id: spec.id,
      name: spec.name,
      tag: spec.tag,
      load: spec.load,
      speed: spec.speed,
      x: -0.35,
      y: 0,
      vy: 0,
      mode: 'walk',
      support: null,
      walkFrame: 0
    };
  }

  function walkSet(members) {
    var adj = {};
    function add(id) { if (!adj[id]) adj[id] = []; }
    for (var i = 0; i < members.length; i++) {
      var m = members[i];
      if (m.kind !== 'gel' || m.broken) continue;
      add(m.a);
      add(m.b);
      adj[m.a].push(m.b);
      adj[m.b].push(m.a);
    }
    var seen = {};
    var q = ['LD'];
    seen.LD = true;
    for (var qi = 0; qi < q.length; qi++) {
      var list = adj[q[qi]] || [];
      for (var k = 0; k < list.length; k++) {
        if (!seen[list[k]]) {
          seen[list[k]] = true;
          q.push(list[k]);
        }
      }
    }
    var reachRight = !!seen.RD;
    return { seen: seen, reachRight: reachRight };
  }

  function findSupport(state, x, footY) {
    if (x <= 0.06) return { y: 0, ground: 'left' };
    if (x >= SPAN - 0.04 && state.walk.reachRight) return { y: 0, ground: 'right' };
    var best = null;
    for (var i = 0; i < state.members.length; i++) {
      var m = state.members[i];
      if (m.kind !== 'gel' || m.broken) continue;
      if (!state.walk.seen[m.a] && !state.walk.seen[m.b]) continue;
      var chain = m.chain;
      for (var s = 0; s < chain.length - 1; s++) {
        var a = state.index[chain[s]];
        var b = state.index[chain[s + 1]];
        var dx = b.x - a.x;
        if (Math.abs(dx) < 0.12) continue;
        var slope = Math.abs((b.y - a.y) / dx);
        if (slope > 1.4) continue;
        var minX = a.x < b.x ? a.x : b.x;
        var maxX = a.x > b.x ? a.x : b.x;
        if (x < minX - 0.02 || x > maxX + 0.02) continue;
        var u = (x - a.x) / dx;
        if (u < -0.02 || u > 1.02) continue;
        var y = a.y + (b.y - a.y) * u;
        if (y > footY + 0.62) continue;
        if (!best || y > best.y) {
          best = { y: y, u: Math.max(0, Math.min(1, u)), member: m, seg: s, ia: chain[s], ib: chain[s + 1], ground: null };
        }
      }
    }
    return best;
  }

  function whereText(t) {
    if (t < 0.33) return '靠近左端';
    if (t > 0.67) return '靠近右端';
    return '跨中';
  }

  function applyForces(state) {
    var nodes = state.nodes;
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      n.fx = 0;
      n.fy = 0;
      n.sumAbs = 0;
      if (!n.fixed) n.fy -= n.mass * G;
    }
    for (var m = 0; m < state.members.length; m++) {
      var mem = state.members[m];
      if (mem.broken) continue;
      var chain = mem.chain;
      var maxAxial = 0;
      var maxT = 0.5;
      var maxMode = 'pull';
      var maxStrain = 0;
      for (var s = 0; s < chain.length - 1; s++) {
        var a = state.index[chain[s]];
        var b = state.index[chain[s + 1]];
        var dx = b.x - a.x;
        var dy = b.y - a.y;
        var L = Math.sqrt(dx * dx + dy * dy) || 1e-6;
        var ext = L - mem.segRest;
        var usable = mem.kind === 'cable' ? Math.max(0, ext) : ext;
        var strain = usable / mem.segRest;
        var F = mem.k * usable;
        var inv = 1 / L;
        var rv = ((b.vx - a.vx) * dx + (b.vy - a.vy) * dy) * inv;
        var damp = mem.c * rv;
        var mag = F + damp;
        if (mem.kind === 'cable' && ext <= 0) mag = 0;
        var fx = mag * dx * inv;
        var fy = mag * dy * inv;
        if (!a.fixed) { a.fx += fx; a.fy += fy; }
        if (!b.fixed) { b.fx -= fx; b.fy -= fy; }
        var absF = Math.abs(F);
        a.sumAbs += absF;
        b.sumAbs += absF;
        var t = (s + 0.5) / (chain.length - 1);
        var rawStrain = Math.abs(ext) / mem.segRest;
        if (rawStrain > mem.maxStrainAbs) mem.maxStrainAbs = rawStrain;
        var aRatio = mem.kind === 'cable'
          ? Math.max(0, ext) / mem.segRest / CABLE_STRAIN
          : Math.abs(ext) / mem.segRest / GEL_STRAIN;
        if (aRatio > maxAxial) {
          maxAxial = aRatio;
          maxT = t;
          maxMode = ext >= 0 ? 'pull' : 'push';
          maxStrain = ext / mem.segRest;
        }
      }
      if (mem.kind === 'gel') {
        var A = state.index[mem.a];
        var B = state.index[mem.b];
        for (var k = 1; k < chain.length - 1; k++) {
          var node = state.index[chain[k]];
          var t = k / (chain.length - 1);
          var tx = A.x + (B.x - A.x) * t;
          var ty = A.y + (B.y - A.y) * t;
          node.fx += BEND_K * (tx - node.x) - BEND_C * node.vx;
          node.fy += BEND_K * (ty - node.y) - BEND_C * node.vy;
          var disp = dist(node.x, node.y, node.x0, node.y0);
          if (disp > mem.maxDisp) mem.maxDisp = disp;
          var dRatio = disp / DISP_LIMIT;
          if (dRatio > maxAxial) {
            maxAxial = dRatio;
            maxT = t;
            maxMode = 'sag';
            maxStrain = (dist(A.x, A.y, B.x, B.y) - mem.rest) / mem.rest;
          }
        }
      }
      var sag = 0;
      var A2 = state.index[mem.a];
      var B2 = state.index[mem.b];
      for (var p = 1; p < chain.length - 1; p++) {
        var nn = state.index[chain[p]];
        var tt = p / (chain.length - 1);
        var cy = A2.y + (B2.y - A2.y) * tt;
        var drop = cy - nn.y;
        if (drop > sag) sag = drop;
      }
      mem.hotT = maxT;
      mem.hotMode = maxMode;
      mem.ratio = maxAxial;
      for (var ci = 0; ci < chain.length; ci++) {
        var cn = state.index[chain[ci]];
        if (cn.sumAbs > (cn.maxSum || 0)) cn.maxSum = cn.sumAbs;
      }
      mem.sag = sag;
      mem.strain = maxStrain;
      mem.tension = maxMode === 'pull' ? maxAxial : 0;
      mem.axial = maxMode;
      if (maxAxial > mem.peak) {
        mem.peak = maxAxial;
        mem.peakT = maxT;
        mem.peakMode = maxMode;
      }
      if (maxAxial > state.peak) {
        state.peak = maxAxial;
        state.peakMember = mem.id;
      }
    }
    var beast = state.beast;
    if (beast && beast.mode === 'walk' && beast.support && beast.support.member && !beast.support.ground) {
      var sup = beast.support;
      var na = state.index[sup.ia];
      var nb = state.index[sup.ib];
      var w = beast.load;
      if (na && !na.fixed) na.fy -= w * (1 - sup.u);
      if (nb && !nb.fixed) nb.fy -= w * sup.u;
    }
  }

  function integrate(state) {
    for (var i = 0; i < state.nodes.length; i++) {
      var n = state.nodes[i];
      if (n.fixed) {
        n.vx = 0;
        n.vy = 0;
        continue;
      }
      var ax = n.fx / n.mass;
      var ay = n.fy / n.mass;
      n.vx += ax * DT;
      n.vy += ay * DT;
      n.vx *= 0.9985;
      n.vy *= 0.9985;
      var sp = Math.sqrt(n.vx * n.vx + n.vy * n.vy);
      if (sp > 14) {
        n.vx = n.vx / sp * 14;
        n.vy = n.vy / sp * 14;
      }
      n.x += n.vx * DT;
      n.y += n.vy * DT;
      if ((n.role === 'free' || n.role === 'inner') && n.x <= 0.05 && n.y < 0) {
        n.y = 0;
        if (n.vy < 0) n.vy = 0;
      }
      if ((n.role === 'free' || n.role === 'inner') && n.x >= SPAN - 0.05 && n.y < 0) {
        n.y = 0;
        if (n.vy < 0) n.vy = 0;
      }
    }
  }

  function evaluateBreak(state) {
    var worst = null;
    for (var i = 0; i < state.members.length; i++) {
      var m = state.members[i];
      if (m.broken) continue;
      if (m.ratio > 1) m.hurt += DT * (0.35 + (m.ratio - 1));
      else m.hurt = Math.max(0, m.hurt - DT * 0.45);
      if (m.hurt > HURT_TIME || m.ratio > SNAP_RATIO) {
        if (!worst || m.ratio > worst.ratio) {
          worst = {
            type: 'member',
            ratio: m.ratio,
            member: m,
            t: m.hotT != null ? m.hotT : m.peakT,
            mode: m.hotMode || m.axial || m.peakMode
          };
        }
      }
    }
    for (var n = 0; n < state.nodes.length; n++) {
      var node = state.nodes[n];
      if (node.fixed || node.internal) continue;
      if (node.sumAbs > (node.maxSum || 0)) node.maxSum = node.sumAbs;
      node.ratio = node.sumAbs / NODE_FORCE;
      if (node.ratio > 1) node.hurt = (node.hurt || 0) + DT * (0.35 + (node.ratio - 1));
      else node.hurt = Math.max(0, (node.hurt || 0) - DT * 0.45);
      if ((node.hurt > HURT_TIME || node.ratio > SNAP_RATIO) && (!worst || node.ratio > worst.ratio)) {
        worst = { type: 'node', ratio: node.ratio, node: node, t: 0.5, mode: 'pull' };
      }
    }
    if (!worst) return null;
    if (worst.type === 'member') {
      worst.member.broken = true;
      var endA = state.index[worst.member.a];
      var endB = state.index[worst.member.b];
      var px = endA.x + (endB.x - endA.x) * worst.t;
      var py = endA.y + (endB.y - endA.y) * worst.t;
      return {
        type: 'member',
        memberId: worst.member.id,
        name: worst.member.name,
        kind: worst.member.kind,
        t: worst.t,
        where: whereText(worst.t),
        mode: worst.mode,
        x: px,
        y: py,
        ratio: worst.ratio,
        beast: state.beast ? state.beast.name : ''
      };
    }
    return {
      type: 'node',
      memberId: worst.node.id,
      name: worst.node.name,
      kind: 'node',
      t: 0.5,
      where: '这个节点上',
      mode: 'pull',
      x: worst.node.x,
      y: worst.node.y,
      ratio: worst.ratio,
      beast: state.beast ? state.beast.name : ''
    };
  }

  function advanceBeast(state) {
    if (state.hold > 0) {
      state.hold -= DT;
      if (state.hold <= 0) {
        if (state.beastIndex >= BEASTS.length) {
          state.phase = 'win';
          state.beast = null;
          return;
        }
        state.beast = spawnBeast(state.beastIndex);
      }
      return;
    }
    var beast = state.beast;
    if (!beast) return;
    if (beast.mode === 'fall') {
      beast.vy -= G * DT;
      beast.y += beast.vy * DT;
      beast.x += beast.speed * DT * 0.35;
      if (beast.y < -3.45) {
        state.phase = 'fail';
        state.fail = {
          type: 'fall',
          name: beast.name,
          beast: beast.name,
          x: beast.x,
          y: beast.y,
          where: beast.x < SPAN * 0.33 ? '靠近左岸' : beast.x > SPAN * 0.67 ? '靠近右岸' : '峡谷中段'
        };
      }
      return;
    }
    var nx = beast.x + beast.speed * DT;
    var support = findSupport(state, nx, beast.y);
    if (!support || support.y < beast.y - 1.2) {
      beast.mode = 'fall';
      beast.vy = 0;
      beast.support = null;
      return;
    }
    beast.x = nx;
    beast.y = support.y;
    beast.support = support;
    beast.walkFrame = Math.floor(state.time * 7);
    if (support.ground === 'right' && nx >= SPAN + 0.15) {
      state.stood.push({
        id: beast.id,
        name: beast.name,
        x: SPAN + 0.42 + state.arrived * 0.78,
        y: 0
      });
      state.arrived += 1;
      state.beastIndex += 1;
      state.hold = 0.42;
      beast.mode = 'done';
      beast.support = null;
      if (state.beastIndex >= BEASTS.length) state.hold = 0.05;
    }
  }

  function step(state) {
    if (state.phase !== 'run') return state.fail;
    state.walk = walkSet(state.members);
    applyForces(state);
    integrate(state);
    var broke = evaluateBreak(state);
    if (broke) {
      state.phase = 'fail';
      state.fail = broke;
      state.time += DT;
      state.steps += 1;
      return broke;
    }
    advanceBeast(state);
    state.time += DT;
    state.steps += 1;
    return null;
  }

  function fingerprint(state) {
    var parts = [String(state.seed), state.phase, 's' + state.steps];
    for (var i = 0; i < state.nodes.length; i++) {
      var n = state.nodes[i];
      parts.push(n.id + '@' + n.x.toFixed(4) + ',' + n.y.toFixed(4));
    }
    parts.push('beast:' + (state.beast ? state.beast.id + ':' + state.beast.x.toFixed(4) + ',' + state.beast.y.toFixed(4) + ':' + state.beast.mode : 'none'));
    parts.push('arr' + state.arrived);
    parts.push(state.fail ? state.fail.type + ':' + (state.fail.memberId || state.fail.name) + ':' + (state.fail.where || '') : 'ok');
    parts.push('peak' + state.peak.toFixed(4));
    return parts.join('|');
  }

  function runToEnd(design, maxSeconds) {
    var state = startRun(design);
    var limit = Math.round((maxSeconds || 46) / DT);
    while (state.phase === 'run' && state.steps < limit) step(state);
    return state;
  }

  function starsFor(peak, budget, budgetMax) {
    var used = 1 - budget / budgetMax;
    if (used < 0) used = 0;
    if (used > 1) used = 1;
    var safety = (1 - peak) / 0.55;
    if (safety < 0) safety = 0;
    if (safety > 1) safety = 1;
    var eff = 1 - Math.abs(used - 0.55) / 0.75;
    if (eff < 0) eff = 0;
    if (eff > 1) eff = 1;
    var score = 0.72 * safety + 0.28 * eff;
    var n = 1;
    if (peak <= 0.72 && used <= 0.9) n = 3;
    else if (peak <= 0.86) n = 2;
    else n = 1;
    if (peak > 0.86) n = 1;
    return { stars: n, score: score, safety: safety, efficiency: eff, peak: peak, used: used };
  }

  function quoteRatio(ratio) {
    var p = Math.round(Math.max(0, Math.min(1.4, ratio)) * 10);
    var words = ['几乎没吃力', '很轻', '还轻', '大约三成', '不到一半', '大约一半', '过了一半', '大约七成', '吃紧', '快到限度', '贴着限度'];
    if (p > 10) return '超过限度';
    return words[p];
  }

  function tune(partial) {
    if (!partial) return {
      GEL_K: GEL_K, GEL_C: GEL_C, CABLE_K: CABLE_K, CABLE_C: CABLE_C,
      BEND_K: BEND_K, GEL_STRAIN: GEL_STRAIN, CABLE_STRAIN: CABLE_STRAIN,
      DISP_LIMIT: DISP_LIMIT, NODE_FORCE: NODE_FORCE
    };
    if (partial.GEL_K != null) GEL_K = partial.GEL_K;
    if (partial.GEL_C != null) GEL_C = partial.GEL_C;
    if (partial.CABLE_K != null) CABLE_K = partial.CABLE_K;
    if (partial.CABLE_C != null) CABLE_C = partial.CABLE_C;
    if (partial.BEND_K != null) BEND_K = partial.BEND_K;
    if (partial.GEL_STRAIN != null) GEL_STRAIN = partial.GEL_STRAIN;
    if (partial.CABLE_STRAIN != null) CABLE_STRAIN = partial.CABLE_STRAIN;
    if (partial.DISP_LIMIT != null) DISP_LIMIT = partial.DISP_LIMIT;
    if (partial.NODE_FORCE != null) NODE_FORCE = partial.NODE_FORCE;
    if (partial.loads) {
      for (var i = 0; i < BEASTS.length; i++) if (partial.loads[i] != null) BEASTS[i].load = partial.loads[i];
    }
  }

  root.SoftPhysics = {
    SEED: SEED,
    DT: DT,
    SPAN: SPAN,
    BUDGET: BUDGET,
    NODE_CAP: NODE_CAP,
    BEASTS: BEASTS,
    GEL_RATE: GEL_RATE,
    CABLE_RATE: CABLE_RATE,
    tune: tune,
    freshDesign: freshDesign,
    cloneDesign: cloneDesign,
    nodeById: nodeById,
    memberById: memberById,
    costOf: costOf,
    tryBuild: tryBuild,
    removeMember: removeMember,
    moveNode: moveNode,
    markTested: markTested,
    placeReason: placeReason,
    startRun: startRun,
    step: step,
    runToEnd: runToEnd,
    fingerprint: fingerprint,
    starsFor: starsFor,
    quoteRatio: quoteRatio,
    whereText: whereText,
    hitMember: hitMember,
    mulberry32: mulberry32
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
