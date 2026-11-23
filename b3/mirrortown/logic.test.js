/* node logic.test.js */
var assert = require('assert');
var L = require('./level.js');
var A = require('./audio.js');

function route(from, to, view, tide) {
  return L.planRoute(from, to, view, tide);
}

var frontBox = route('wharf', 'prom', 'front', 'high');
assert.strictEqual(frontBox.kind, 'none');
var front = route('wharf', 'gap2', 'front', 'high');
assert.strictEqual(front.kind, 'break');
assert.deepStrictEqual(front.nodes, ['wharf', 'lip']);
assert.strictEqual(front.edge.role, 'reflect');

var left = route('wharf', 'gap2', 'left', 'high');
assert.strictEqual(left.kind, 'arrive');
assert.deepStrictEqual(left.nodes, ['wharf', 'lip', 'gap1', 'gap2']);

var leftBox = route('wharf', 'prom', 'left', 'high');
assert.strictEqual(leftBox.kind, 'none');

var right = route('gap2', 'prom', 'right', 'high');
assert.strictEqual(right.kind, 'arrive');
assert.deepStrictEqual(right.nodes, ['gap2', 'lane', 'prom']);

var lowReflect = route('lip', 'gap2', 'left', 'low');
assert.strictEqual(lowReflect.kind, 'break');
assert.deepStrictEqual(lowReflect.nodes, ['lip']);
assert.strictEqual(lowReflect.reason, 'tide');

var ford = route('prom', 'ford', 'front', 'low');
assert.strictEqual(ford.kind, 'arrive');
var fordHigh = route('prom', 'ford', 'front', 'high');
assert.strictEqual(fordHigh.kind, 'break');
assert.deepStrictEqual(fordHigh.nodes, ['prom']);

var haven = route('ford', 'haven', 'left', 'low');
assert.strictEqual(haven.kind, 'arrive');
var havenFront = route('ford', 'haven', 'front', 'low');
assert.strictEqual(havenFront.kind, 'none');

assert.strictEqual(L.edgeOpen('wharf', 'lip', 'front', 'low'), true);
assert.strictEqual(L.edgeOpen('lip', 'gap1', 'front', 'high'), false);
assert.strictEqual(L.edgeOpen('lip', 'gap1', 'left', 'high'), true);

var arrived = L.applyArrival({ coral: false, lake: false, postcard: false, seenLane: false }, 'prom');
assert.strictEqual(arrived.coral, true);
assert.strictEqual(arrived.lake, false);
assert.strictEqual(arrived.event, 'coral');
var stay = L.applyArrival(arrived, 'prom');
assert.strictEqual(stay.event, null);

var card = L.applyArrival({ coral: false, lake: false, postcard: false, seenLane: true }, 'post');
assert.strictEqual(card.postcard, true);
assert.strictEqual(card.coral, false);

var win = L.reachableWin();
assert.strictEqual(win.ok, true, 'puzzle must be solvable');

function glowTrust(state) {
  var glows = L.glowEdges(state);
  glows.forEach(function (g) {
    var real = L.edgeState(g.edge, state.view, state.tide);
    assert.strictEqual(g.state, real, g.edge.id + ' glow drifted from rules');
    if (g.state === 'open') assert.strictEqual(real, 'open');
  });
  L.EDGES.forEach(function (e) {
    var real = L.edgeState(e, state.view, state.tide);
    if (real === 'hide') return;
    if (e.role === 'ford' && !state.coral) return;
    if (e.role === 'post' && !state.seenLane) return;
    var hit = glows.filter(function (g) { return g.edge.id === e.id; })[0];
    assert.ok(hit, 'missing glow ' + e.id);
    assert.strictEqual(hit.state, real);
  });
}

['front', 'right', 'left'].forEach(function (view) {
  ['high', 'low'].forEach(function (tide) {
    glowTrust({ view: view, tide: tide, coral: false, seenLane: false });
    glowTrust({ view: view, tide: tide, coral: true, seenLane: true });
  });
});

var early = L.glowEdges({ view: 'front', tide: 'high', coral: false, seenLane: false });
assert.ok(early.some(function (g) { return g.edge.role === 'reflect' && g.state === 'broken'; }));
assert.ok(!early.some(function (g) { return g.edge.role === 'ford'; }));

var late = L.glowEdges({ view: 'front', tide: 'low', coral: true, seenLane: true });
assert.ok(late.some(function (g) { return g.edge.id === 'ford-a' && g.state === 'open'; }));
assert.ok(late.some(function (g) { return g.edge.id === 'spur' && g.state === 'open'; }));

var texts = [];
['wharf', 'lip', 'gap2', 'lane', 'prom', 'ford'].forEach(function (node) {
  ['front', 'right', 'left'].forEach(function (view) {
    ['high', 'low'].forEach(function (tide) {
      var s = { node: node, view: view, tide: tide, coral: false, lake: false, postcard: false, seenLane: true };
      texts.push(L.coach(s));
      s.coral = true;
      texts.push(L.coach(s));
      s.lake = true;
      texts.push(L.coach(s));
    });
  });
});
L.EDGES.forEach(function (e) {
  texts.push(L.breakCopy(e, 'front', 'high'));
  texts.push(L.breakCopy(e, 'left', 'low'));
});
texts.forEach(function (t) {
  assert.ok(t && t.length > 0);
  assert.ok(!(t.indexOf('不是') !== -1 && t.indexOf('而是') !== -1), t);
});

assert.ok(A.seconds >= 60, 'bgm ' + A.seconds);
assert.strictEqual(A.phrases, 4);
var prints = [0, 1, 2, 3].map(A.phrasePrint);
prints.forEach(function (p, i) {
  assert.ok(p.length > 20, 'phrase ' + i);
  for (var j = 0; j < i; j++) assert.notStrictEqual(p, prints[j]);
});

assert.strictEqual(L.dirTo('front', 'left'), -1);
assert.strictEqual(L.dirTo('front', 'right'), 1);
assert.deepStrictEqual(L.hintTarget({ node: 'wharf', view: 'front', tide: 'high', coral: false, lake: false }), { type: 'turn', dir: -1 });
assert.deepStrictEqual(L.hintTarget({ node: 'lip', view: 'left', tide: 'high', coral: false, lake: false }), { type: 'node', id: 'gap2' });

console.log('mirrortown logic ok', 'winStates', win.states, 'bgm', A.seconds.toFixed(1) + 's');
