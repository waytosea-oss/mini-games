/* 一笔绘山海 · 规则与求解器（浏览器与 Node 共用）
   关卡 L = { pts:[[x,y]...]（0~1）, e:[[a,b,t]...], beast:-1|节点 }
   边类型 t：0 普通山径（走 1 遍）；1 云桥（走 2 遍：第 1 遍凝云成虹，第 2 遍落墨）；2 单行溪（只能 a→b）
   胜利：所有边剩余次数归零；有白泽（beast≥0）时最后一步必须停在白泽身边。 */
(function (root) {
  'use strict';
  function need(t) { return t === 1 ? 2 : 1; }
  function init(L) { return L.e.map(function (e) { return need(e[2]); }); }
  function adj(L) {
    if (L._adj) return L._adj;
    var A = L.pts.map(function () { return []; });
    L.e.forEach(function (e, i) { A[e[0]].push(i); A[e[1]].push(i); });
    return (L._adj = A);
  }
  // 从 cur 沿边 i 走，返回终点；不可走返回 -1
  function step(L, rem, cur, i) {
    var e = L.e[i]; if (!e || rem[i] <= 0) return -1;
    if (e[0] === cur) return e[1];
    if (e[1] === cur && e[2] !== 2) return e[0];
    return -1;
  }
  function moves(L, rem, cur) {
    var out = [], A = adj(L)[cur] || [];
    for (var k = 0; k < A.length; k++) { var to = step(L, rem, cur, A[k]); if (to >= 0) out.push([A[k], to]); }
    return out;
  }
  function left(rem) { var s = 0; for (var i = 0; i < rem.length; i++) s += rem[i]; return s; }
  // 剪枝：剩余边必须都与 cur 连通（忽略方向）
  function connected(L, rem, cur) {
    var A = adj(L), seen = {}, st = [cur], cnt = 0; seen[cur] = 1;
    while (st.length) {
      var v = st.pop(), a = A[v];
      for (var k = 0; k < a.length; k++) { var e = L.e[a[k]]; if (rem[a[k]] <= 0) continue; var w = e[0] === v ? e[1] : e[0]; if (!seen[w]) { seen[w] = 1; st.push(w); } }
    }
    for (var i = 0; i < rem.length; i++) if (rem[i] > 0 && !seen[L.e[i][0]]) return false;
    if (L.beast >= 0 && left(rem) > 0 && !seen[L.beast]) return false;
    return true;
  }
  function done(L, rem, cur) { return left(rem) === 0 && (L.beast < 0 || cur === L.beast); }
  // 深度优先求解：返回 [[边, 终点], ...] 或 null；budget 限制搜索步数
  function solveFrom(L, rem, cur, budget) {
    rem = rem.slice(); var path = [], b = { n: budget || 200000 };
    function dfs(c) {
      if (done(L, rem, c)) return true;
      if (--b.n < 0) return false;
      if (!connected(L, rem, c)) return false;
      var ms = moves(L, rem, c);
      // 启发：先走必须走两遍的云桥/单行溪之外的“桥”放后
      for (var k = 0; k < ms.length; k++) {
        var i = ms[k][0]; rem[i]--; path.push(ms[k]);
        if (dfs(ms[k][1])) return true;
        path.pop(); rem[i]++;
      }
      return false;
    }
    return dfs(cur) ? path : null;
  }
  function solve(L, budget) {
    var rem = init(L);
    for (var s = 0; s < L.pts.length; s++) { if (!adj(L)[s].length) continue; var p = solveFrom(L, rem, s, budget); if (p) return { start: s, path: p }; }
    return null;
  }
  // 哪些起点能完成
  function goodStarts(L, budget) {
    var rem = init(L), out = [];
    for (var s = 0; s < L.pts.length; s++) if (adj(L)[s].length && solveFrom(L, rem, s, budget)) out.push(s);
    return out;
  }
  var api = { need: need, init: init, adj: adj, step: step, moves: moves, left: left, done: done, solveFrom: solveFrom, solve: solve, goodStarts: goodStarts };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.LOGIC = api;
})(this);
