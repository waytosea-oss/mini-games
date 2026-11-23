/* 倒影街区通路。三档机位锁定后才生效，亮线与可走使用同一套判定。 */
(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.MT_LEVEL = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var VIEWS = ['front', 'right', 'left'];
  var VIEW_NAME = { front: '正面', right: '右侧', left: '左侧' };

  /* 坐标是底图归一化位置，原点左上。p 竖图，l 横图。脚底落在路面上。 */
  var NODES = {
    wharf: { name: '西码头', at: {
      front: { p: [0.19, 0.515], l: [0.30, 0.605] },
      right: { p: [0.07, 0.495], l: [0.15, 0.58] },
      left: { p: [0.32, 0.605], l: [0.50, 0.72] }
    }},
    lip: { name: '桥头', at: {
      front: { p: [0.32, 0.505], l: [0.38, 0.58] },
      right: { p: [0.20, 0.485], l: [0.26, 0.57] },
      left: { p: [0.50, 0.55], l: [0.56, 0.62] }
    }},
    gap1: { name: '桥心', at: {
      front: { p: [0.44, 0.47], l: [0.46, 0.55] },
      right: { p: [0.33, 0.47], l: [0.34, 0.56] },
      left: { p: [0.58, 0.47], l: [0.56, 0.53] }
    }},
    gap2: { name: '中转平台', at: {
      front: { p: [0.53, 0.478], l: [0.54, 0.555] },
      right: { p: [0.46, 0.495], l: [0.43, 0.555] },
      left: { p: [0.70, 0.445], l: [0.64, 0.51] }
    }},
    lane: { name: '巷口', at: {
      front: { p: [0.48, 0.40], l: [0.52, 0.38] },
      right: { p: [0.54, 0.53], l: [0.50, 0.62] },
      left: { p: [0.55, 0.36], l: [0.50, 0.32] }
    }},
    prom: { name: '崖台信箱', letter: 'coral', at: {
      front: { p: [0.755, 0.54], l: [0.65, 0.63] },
      right: { p: [0.60, 0.595], l: [0.56, 0.70] },
      left: { p: [0.96, 0.46], l: [0.80, 0.50] }
    }},
    post: { name: '巷尾', at: {
      front: { p: [0.26, 0.405], l: [0.34, 0.42] },
      right: { p: [0.78, 0.40], l: [0.72, 0.38] },
      left: { p: [0.40, 0.42], l: [0.38, 0.48] }
    }},
    ford: { name: '湿石', at: {
      front: { p: [0.72, 0.555], l: [0.62, 0.625] },
      right: { p: [0.56, 0.64], l: [0.52, 0.74] },
      left: { p: [0.80, 0.46], l: [0.69, 0.55] }
    }},
    haven: { name: '码头信箱', letter: 'lake', at: {
      front: { p: [0.82, 0.38], l: [0.76, 0.40] },
      right: { p: [0.74, 0.40], l: [0.68, 0.46] },
      left: { p: [0.90, 0.455], l: [0.75, 0.54] }
    }}
  };

  /*
   * views：该机位里这条路怎么画。open 可走，broken 画出断开的亮线，hide 不画。
   * tide 不符时，本来会 open 的路改画成 broken，避免亮线连着却走不过。
   */
  var EDGES = [
    { id: 'dock', a: 'wharf', b: 'lip', tide: 'any', role: 'street',
      views: { front: 'open', right: 'open', left: 'open' } },
    { id: 'reflect-a', a: 'lip', b: 'gap1', tide: 'high', role: 'reflect',
      views: { front: 'broken', right: 'hide', left: 'open' } },
    { id: 'reflect-b', a: 'gap1', b: 'gap2', tide: 'high', role: 'reflect',
      views: { front: 'broken', right: 'hide', left: 'open' } },
    { id: 'segment', a: 'gap2', b: 'lane', tide: 'any', role: 'street',
      views: { front: 'hide', right: 'open', left: 'hide' } },
    { id: 'to-prom', a: 'lane', b: 'prom', tide: 'any', role: 'street',
      views: { front: 'hide', right: 'open', left: 'hide' } },
    { id: 'spur', a: 'lane', b: 'post', tide: 'any', role: 'post',
      views: { front: 'open', right: 'hide', left: 'hide' } },
    { id: 'ford-a', a: 'prom', b: 'ford', tide: 'low', role: 'ford',
      views: { front: 'open', right: 'hide', left: 'hide' } },
    { id: 'ford-b', a: 'ford', b: 'haven', tide: 'low', role: 'ford',
      views: { front: 'hide', right: 'hide', left: 'open' } }
  ];

  function edgeState(edge, view, tide) {
    var slot = edge.views[view];
    if (!slot || slot === 'hide') return 'hide';
    if (edge.tide !== 'any' && edge.tide !== tide) return 'broken';
    return slot;
  }

  /* 教学揭晓：第一封送到之前不画出湿石；走过巷口之后才画出明信片支路。揭晓后的亮线仍与可走一致。 */
  function shownState(edge, state) {
    var st = edgeState(edge, state.view, state.tide);
    if (st === 'hide') return null;
    if (edge.role === 'ford' && !state.coral) return null;
    if (edge.role === 'post' && !state.seenLane) return null;
    return st;
  }

  function glowEdges(state) {
    var list = [];
    for (var i = 0; i < EDGES.length; i++) {
      var st = shownState(EDGES[i], state);
      if (st) list.push({ edge: EDGES[i], state: st });
    }
    return list;
  }

  function adj(view, tide) {
    var map = {};
    for (var i = 0; i < EDGES.length; i++) {
      var e = EDGES[i];
      var st = edgeState(e, view, tide);
      if (st === 'hide') continue;
      if (!map[e.a]) map[e.a] = [];
      if (!map[e.b]) map[e.b] = [];
      map[e.a].push({ id: e.b, state: st, edge: e });
      map[e.b].push({ id: e.a, state: st, edge: e });
    }
    return map;
  }

  function bfs(from, goal, map) {
    var q = [from];
    var prev = {};
    prev[from] = null;
    var guard = 0;
    while (q.length && guard < 40) {
      guard++;
      var cur = q.shift();
      if (cur === goal) break;
      var nexts = map[cur] || [];
      for (var i = 0; i < nexts.length; i++) {
        var n = nexts[i];
        if (Object.prototype.hasOwnProperty.call(prev, n.id)) continue;
        prev[n.id] = { from: cur, state: n.state, edge: n.edge };
        q.push(n.id);
      }
    }
    if (!Object.prototype.hasOwnProperty.call(prev, goal)) return null;
    var nodes = [goal];
    var states = [];
    var edges = [];
    var c = goal;
    while (c !== from) {
      var p = prev[c];
      nodes.push(p.from);
      states.push(p.state);
      edges.push(p.edge);
      c = p.from;
    }
    nodes.reverse();
    states.reverse();
    edges.reverse();
    return { nodes: nodes, states: states, edges: edges };
  }

  function planRoute(from, goal, view, tide) {
    if (!NODES[from] || !NODES[goal]) return { nodes: [from], kind: 'none' };
    if (from === goal) return { nodes: [from], kind: 'here' };
    var found = bfs(from, goal, adj(view, tide));
    if (!found) return { nodes: [from], kind: 'none' };
    var stop = found.nodes.length - 1;
    var reason = null;
    var edge = null;
    for (var i = 0; i < found.states.length; i++) {
      if (found.states[i] !== 'open') {
        stop = i;
        edge = found.edges[i];
        reason = edge.tide !== 'any' && edge.tide !== tide ? 'tide' : 'view';
        break;
      }
    }
    var nodes = found.nodes.slice(0, stop + 1);
    var kind = nodes[nodes.length - 1] === goal ? 'arrive' : 'break';
    return { nodes: nodes, kind: kind, reason: reason, edge: edge };
  }

  function edgeOpen(a, b, view, tide) {
    for (var i = 0; i < EDGES.length; i++) {
      var e = EDGES[i];
      var hit = (e.a === a && e.b === b) || (e.a === b && e.b === a);
      if (hit) return edgeState(e, view, tide) === 'open';
    }
    return false;
  }

  function breakCopy(edge, view, tide) {
    if (!edge) return '亮线在这里断开，笺仔停在断口前。';
    if (edge.role === 'reflect' && view !== 'left') return '正面拱桥中间断开，倒影两端还没对齐。';
    if (edge.role === 'reflect' && tide !== 'high') return '潮水退了，倒影桥托不住。';
    if (edge.role === 'ford' && tide !== 'low') return '潮水还盖着湿石，这段先过不去。';
    if (edge.role === 'ford') return '这一档里湿石还没接上。';
    return '亮线在这里断开，笺仔停在断口前。';
  }

  function dirTo(from, to) {
    var i = VIEWS.indexOf(from);
    if (i < 0) return 0;
    if (VIEWS[(i + 1) % 3] === to) return 1;
    if (VIEWS[(i + 2) % 3] === to) return -1;
    return 0;
  }

  function coach(s) {
    if (s.coral && s.lake) {
      return s.postcard
        ? '两封信笺都放到信箱里了，空白明信片也收在怀里。'
        : '两封信笺都放到信箱里了。';
    }
    if (!s.coral) {
      if (s.tide === 'low') return '倒影桥要高潮才连得上。点潮汐闸，把潮水抬回去。';
      if (s.view !== 'left' && (s.node === 'wharf' || s.node === 'lip')) return '拱桥中间的亮线是断的。点罗盘左半边，转到左侧。';
      if (s.view === 'left' && s.node !== 'gap2') return '倒影桥的亮线连上了。点中转平台，走过去。';
      if (s.node === 'gap2' && s.view !== 'right') return '转到右侧，亮线会接上崖台信箱。';
      if (s.node === 'lane' && s.view !== 'right') return '巷口这一档接不上崖台。转到右侧。';
      if (s.view === 'right' && s.node !== 'prom') return '点崖台上的信箱，把珊瑚封信笺送过去。';
    } else if (!s.lake) {
      if (s.tide === 'high') return '湖蓝封要走低潮湿石。点潮汐闸，让潮水退去。';
      if (s.node === 'prom' && s.view !== 'front') return '转到正面，湿石上的亮线会连起来。';
      if (s.view === 'front' && s.node === 'prom') return '点亮着的湿石，走下去。';
      if (s.node === 'ford' && s.view !== 'left') return '转到左侧，湿石才接得上码头信箱。';
      if (s.view === 'left' && s.node === 'ford') return '亮线连着码头信箱。点它，送出湖蓝封。';
      if (s.node !== 'haven') return '顺着亮线走向码头信箱。';
    }
    return '点亮线连着的路面。断掉的亮线走不过去。';
  }

  function hintTarget(s) {
    if (s.coral && s.lake) return null;
    if (!s.coral) {
      if (s.tide === 'low') return { type: 'tide' };
      if (s.view !== 'left' && (s.node === 'wharf' || s.node === 'lip')) return { type: 'turn', dir: dirTo(s.view, 'left') };
      if (s.view === 'left' && s.node !== 'gap2') return { type: 'node', id: 'gap2' };
      if ((s.node === 'gap2' || s.node === 'lane') && s.view !== 'right') return { type: 'turn', dir: dirTo(s.view, 'right') };
      if (s.view === 'right' && s.node !== 'prom') return { type: 'node', id: 'prom' };
    } else if (!s.lake) {
      if (s.tide === 'high') return { type: 'tide' };
      if (s.node === 'prom' && s.view !== 'front') return { type: 'turn', dir: dirTo(s.view, 'front') };
      if (s.view === 'front' && s.node === 'prom') return { type: 'node', id: 'ford' };
      if (s.node === 'ford' && s.view !== 'left') return { type: 'turn', dir: dirTo(s.view, 'left') };
      if (s.view === 'left' && s.node !== 'haven') return { type: 'node', id: 'haven' };
      if (s.node !== 'haven') return { type: 'node', id: 'haven' };
    }
    return null;
  }

  function applyArrival(s, node) {
    var next = {
      node: node,
      coral: s.coral,
      lake: s.lake,
      postcard: s.postcard,
      seenLane: s.seenLane || node === 'lane'
    };
    var event = null;
    if (node === 'post' && !s.postcard) {
      next.postcard = true;
      event = 'postcard';
    }
    if (node === 'prom' && !s.coral) {
      next.coral = true;
      event = 'coral';
    }
    if (node === 'haven' && !s.lake) {
      next.lake = true;
      event = 'lake';
    }
    next.event = event;
    next.cleared = next.coral && next.lake;
    return next;
  }

  /* 从开局出发，只靠转场、潮汐和可走边，能否把两封信都送到。旋转不改变所在平台。 */
  function reachableWin() {
    var start = { node: 'wharf', view: 'front', tide: 'high', coral: false, lake: false };
    var q = [start];
    var seen = {};
    var guard = 0;
    while (q.length && guard < 5000) {
      guard++;
      var s = q.pop();
      var key = s.node + '|' + s.view + '|' + s.tide + '|' + (s.coral ? 1 : 0) + '|' + (s.lake ? 1 : 0);
      if (seen[key]) continue;
      seen[key] = 1;
      if (s.coral && s.lake) return { ok: true, states: Object.keys(seen).length };
      var vi = VIEWS.indexOf(s.view);
      q.push({ node: s.node, view: VIEWS[(vi + 1) % 3], tide: s.tide, coral: s.coral, lake: s.lake });
      q.push({ node: s.node, view: VIEWS[(vi + 2) % 3], tide: s.tide, coral: s.coral, lake: s.lake });
      q.push({ node: s.node, view: s.view, tide: s.tide === 'high' ? 'low' : 'high', coral: s.coral, lake: s.lake });
      var map = adj(s.view, s.tide);
      var nexts = map[s.node] || [];
      for (var i = 0; i < nexts.length; i++) {
        if (nexts[i].state !== 'open') continue;
        var arrived = applyArrival(s, nexts[i].id);
        q.push({
          node: arrived.node,
          view: s.view,
          tide: s.tide,
          coral: arrived.coral,
          lake: arrived.lake
        });
      }
    }
    return { ok: false, states: Object.keys(seen).length };
  }

  function spot(id, view, ori) {
    var n = NODES[id];
    if (!n) return [0.5, 0.5];
    return n.at[view][ori === 'l' ? 'l' : 'p'];
  }

  return {
    VIEWS: VIEWS,
    VIEW_NAME: VIEW_NAME,
    NODES: NODES,
    EDGES: EDGES,
    edgeState: edgeState,
    shownState: shownState,
    glowEdges: glowEdges,
    planRoute: planRoute,
    edgeOpen: edgeOpen,
    breakCopy: breakCopy,
    coach: coach,
    hintTarget: hintTarget,
    applyArrival: applyArrival,
    reachableWin: reachableWin,
    dirTo: dirTo,
    spot: spot
  };
});
