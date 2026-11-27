/* 慢信号台规则自检。node logic.test.js */
var assert = require('assert');
var L = require('./logic.js');

var passed = [];
function check(name, fn) {
  fn();
  passed.push(name);
}

check('教学路径可以听清、询问、派遣并抵达高塔', function () {
  var s = L.fresh();
  s.knob = 0.18;
  var sig = L.signalAt(s.knob, s);
  assert.strictEqual(sig.mode, 'lock');
  assert.strictEqual(sig.callId, 'lamp');
  var heard = L.hear(s, 'lamp');
  assert.strictEqual(heard.fresh, true);
  assert.strictEqual(s.tick, 0);
  assert.strictEqual(L.pinMode(s, 'lamp'), 'uncertain');
  var asked = L.ask(s, 'lamp', 'spin');
  assert.strictEqual(asked.dots, 1);
  assert.strictEqual(s.tick, 1);
  assert.strictEqual(s.calls.lamp.verified, true);
  assert.strictEqual(L.pinMode(s, 'lamp'), 'verified');
  var sent = L.dispatch(s, 'cart', 'lighthouse', 'lamp');
  assert.strictEqual(sent.ok, true);
  assert.strictEqual(sent.dots, 1);
  assert.strictEqual(s.teams.cart.state, 'depart');
  assert.notStrictEqual(s.teams.cart.state, 'idle');
  L.wait(s);
  assert.strictEqual(s.calls.lamp.status, 'resolved');
  assert.ok(s.calls.lamp.note.indexOf('琥珀木板车') >= 0);
});

check('阅读日志不推进时间，询问与派遣会推进', function () {
  var s = L.fresh();
  L.hear(s, 'lamp');
  var before = s.tick;
  var log = L.readLog(s);
  assert.strictEqual(log.tick, before);
  assert.strictEqual(s.tick, before);
  assert.ok(log.entries.length >= 1);
  L.ask(s, 'lamp', 'fog');
  assert.strictEqual(s.tick, before + 1);
  var mid = s.tick;
  L.dispatch(s, 'cart', 'lighthouse', 'lamp');
  assert.ok(s.tick > mid);
});

check('点选队伍和地点只是预览，不推进时间', function () {
  var s = L.fresh();
  L.hear(s, 'lamp');
  var t = s.tick;
  L.selectTeam(s, 'cart');
  L.selectPlace(s, 'lighthouse');
  var preview = L.previewDispatch(s, 'cart', 'lighthouse');
  assert.strictEqual(preview.ok, true);
  assert.strictEqual(preview.dots, 1);
  assert.strictEqual(s.tick, t);
  assert.strictEqual(s.teams.cart.state, 'idle');
});

check('占用中的队伍不能改派到新地点', function () {
  var s = L.fresh();
  L.hear(s, 'lamp');
  L.dispatch(s, 'cart', 'lighthouse', 'lamp');
  var tick = s.tick;
  var dest = s.teams.cart.dest;
  var again = L.dispatch(s, 'cart', 'dock', 'lamp');
  assert.strictEqual(again.ok, false);
  assert.strictEqual(again.reason, 'busy');
  assert.strictEqual(s.tick, tick);
  assert.strictEqual(s.teams.cart.dest, dest);
  assert.strictEqual(s.teams.cart.dest, 'lighthouse');
  assert.notStrictEqual(s.teams.cart.state, 'idle');
});

check('召回有公开时间成本，且不会出现在新地点', function () {
  var s = L.fresh();
  L.hear(s, 'lamp');
  L.dispatch(s, 'boat', 'lighthouse', 'lamp');
  assert.strictEqual(s.teams.boat.dest, 'lighthouse');
  assert.strictEqual(s.teams.boat.state, 'depart');
  var tick = s.tick;
  var preview = L.previewRecall(s, 'boat');
  assert.strictEqual(preview.ok, true);
  assert.ok(preview.dots >= 1 && preview.dots <= 3);
  assert.strictEqual(s.tick, tick);
  L.selectPlace(s, 'dock');
  var back = L.recall(s, 'boat');
  assert.strictEqual(back.ok, true);
  assert.ok(back.dots >= 1 && back.dots <= 3);
  assert.ok(s.tick >= tick + preview.dots);
  assert.strictEqual(back.dest, 'lighthouse');
  assert.notStrictEqual(back.dest, 'dock');
  assert.strictEqual(back.state, 'return');
  assert.strictEqual(back.idle, false);
  assert.strictEqual(s.calls.lamp.status, 'open');
});

check('不确定坐标在询问后变为已核实，行动写入事件树', function () {
  var s = L.fresh();
  L.hear(s, 'lamp');
  assert.strictEqual(L.pinMode(s, 'lamp'), 'uncertain');
  var nodes = s.tree.nodes.length;
  L.ask(s, 'lamp', 'spin');
  assert.strictEqual(L.pinMode(s, 'lamp'), 'verified');
  assert.ok(s.tree.nodes.length > nodes);
  var last = s.tree.nodes[s.tree.nodes.length - 1];
  assert.ok(s.snaps[last.id]);
  assert.strictEqual(s.snaps[last.id].tick, s.tick);
  assert.strictEqual(L.nodeStatus(s, 'root'), 'chosen');
  assert.strictEqual(L.nodeStatus(s, last.id), 'current');
});

check('可以跳回关键节点并恢复时间与队伍', function () {
  var s = L.fresh();
  L.hear(s, 'lamp');
  L.ask(s, 'lamp', 'spin');
  L.dispatch(s, 'cart', 'lighthouse', 'lamp');
  assert.ok(s.tick > 0);
  assert.notStrictEqual(s.teams.cart.state, 'idle');
  var jumped = L.jumpTo(s, 'root');
  assert.strictEqual(jumped.ok, true);
  s = jumped.state;
  assert.strictEqual(s.tick, 0);
  assert.strictEqual(s.teams.cart.state, 'idle');
  assert.strictEqual(s.heard.lamp, false);
  assert.strictEqual(s.tree.cursor, 'root');
  assert.ok(s.tree.nodes.length > 1);
  var later = s.tree.nodes.filter(function (n) { return n.id !== 'root'; })[0];
  assert.strictEqual(L.nodeStatus(s, later.id), 'untraveled');
});

check('至少两种可解释结局', function () {
  var good = L.fresh();
  L.hear(good, 'lamp');
  L.ask(good, 'lamp', 'spin');
  L.dispatch(good, 'cart', 'lighthouse', 'lamp');
  L.hear(good, 'line');
  L.ask(good, 'line', 'pile');
  assert.strictEqual(good.calls.lamp.status, 'resolved');
  L.dispatch(good, 'boat', 'dock', 'line');
  L.hear(good, 'echo');
  L.ask(good, 'echo', 'where');
  assert.strictEqual(good.calls.line.status, 'resolved');
  L.dispatch(good, 'cart', 'bridge', 'echo');
  L.wait(good);
  assert.strictEqual(good.calls.echo.status, 'resolved');
  assert.strictEqual(good.ended, true);
  assert.strictEqual(good.ending.title, '三处都有人抵达');
  assert.ok(good.ending.lines.length >= 4);

  var bad = L.fresh();
  L.hear(bad, 'lamp');
  L.dispatch(bad, 'boat', 'lighthouse', 'lamp');
  L.wait(bad);
  L.wait(bad);
  L.wait(bad);
  assert.strictEqual(bad.calls.lamp.status, 'open');
  assert.ok(bad.calls.lamp.note.indexOf('水湾') >= 0);
  L.closeChapter(bad, 'early');
  assert.notStrictEqual(bad.ending.title, good.ending.title);
  assert.strictEqual(bad.ending.title, '雾还停在岬角');
  assert.ok(bad.ending.lines.join('').indexOf('灯') >= 0);
});

check('存档往返后能继续', function () {
  var s = L.fresh();
  L.hear(s, 'lamp');
  L.ask(s, 'lamp', 'spin');
  s.screen = 'play';
  s.music = false;
  var raw = L.serialize(s);
  assert.ok(raw.indexOf(L.SAVE_KEY) >= 0);
  var back = L.hydrate(raw);
  assert.strictEqual(back.tick, s.tick);
  assert.strictEqual(back.calls.lamp.verified, true);
  assert.strictEqual(back.screen, 'play');
  assert.strictEqual(back.music, false);
  assert.strictEqual(back.tree.cursor, s.tree.cursor);
  var jumped = L.jumpTo(back, 'root');
  assert.strictEqual(jumped.state.tick, 0);
});

check('木船去溪桥会进浅滩，板车才能完成桥上的事', function () {
  var s = L.fresh();
  L.hear(s, 'lamp');
  L.dispatch(s, 'cart', 'lighthouse', 'lamp');
  assert.strictEqual(s.sent, true);
  assert.strictEqual(L.bandOpen(s, 'echo'), true);
  L.hear(s, 'echo');
  L.ask(s, 'echo', 'where');
  L.dispatch(s, 'boat', 'bridge', 'echo');
  L.wait(s);
  L.wait(s);
  assert.strictEqual(s.calls.echo.status, 'open');
  assert.ok(s.calls.echo.note.indexOf('浅滩') >= 0);
  assert.strictEqual(s.teams.boat.state, 'return');
});

check('时间成本只有一到三，琥珀弧随时间变档', function () {
  assert.strictEqual(L.routeDots('cart', 'lighthouse'), 1);
  assert.strictEqual(L.routeDots('cart', 'dock'), 2);
  assert.strictEqual(L.routeDots('boat', 'lighthouse'), 3);
  assert.strictEqual(L.routeDots('boat', 'guess-lamp'), 2);
  assert.strictEqual(L.arcBand(0), 'full');
  assert.strictEqual(L.arcBand(4), 'mid');
  assert.strictEqual(L.arcBand(7), 'low');
});

check('重复听清与重复询问不推进时间', function () {
  var s = L.fresh();
  L.hear(s, 'lamp');
  var t = s.tick;
  L.hear(s, 'lamp');
  assert.strictEqual(s.tick, t);
  L.ask(s, 'lamp', 'spin');
  var t2 = s.tick;
  var again = L.ask(s, 'lamp', 'spin');
  assert.strictEqual(again.ok, false);
  assert.strictEqual(s.tick, t2);
});

console.log('slowsignal logic self-check: ' + passed.length + ' passed');
passed.forEach(function (name) { console.log('  ok  ' + name); });
