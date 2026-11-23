/* 节点自检：规则、可解路线、音乐长度。浏览器不加载这个文件。 */
'use strict';

var assert = require('assert');
var rules = require('./rules.js');
var audio = require('./audio.js');

function fail(msg) {
  console.error('FAIL ' + msg);
  process.exitCode = 1;
}

function approxPath(mode, refill) {
  var best = new Map();
  var start = rules.freshState(mode);
  var startKey = keyOf(start.limbs);
  best.set(startKey, { stamina: start.stamina, moves: 0, rests: 0, prev: null, limbs: start.limbs });
  var heap = [{ key: startKey, stamina: start.stamina }];
  var seenWin = null;
  var expanded = 0;
  while (heap.length && expanded < 80000) {
    heap.sort(function (a, b) { return b.stamina - a.stamina; });
    var item = heap.shift();
    var node = best.get(item.key);
    if (!node || item.stamina < node.stamina - 0.01) continue;
    expanded += 1;
    if (won(node.limbs)) {
      seenWin = node;
      break;
    }
    rules.LIMBS.forEach(function (limb) {
      targets(mode, limb).forEach(function (target) {
        var state = rules.freshState(mode);
        state.limbs = rules.cloneLimbs(node.limbs);
        state.stamina = node.stamina;
        state.weather = null;
        var verdict = rules.applyMove(state, limb, target);
        if (!verdict.ok) return;
        var rests = node.rests;
        if (rules.stableRest(state.limbs)) {
          if (!refill) return;
          state.stamina = 100;
          rests += 1;
        }
        var key = keyOf(state.limbs);
        var prev = best.get(key);
        if (prev && prev.stamina >= state.stamina - 0.01) return;
        best.set(key, {
          stamina: state.stamina,
          moves: node.moves + 1,
          rests: rests,
          prev: { key: item.key, limb: limb, target: target },
          limbs: rules.cloneLimbs(state.limbs)
        });
        heap.push({ key: key, stamina: state.stamina });
      });
    });
  }
  return { win: seenWin, expanded: expanded, states: best.size };
}

function keyOf(limbs) {
  return rules.LIMBS.map(function (name) {
    var a = limbs[name];
    return name + ':' + a.kind + ':' + (a.id === undefined ? '' : a.id);
  }).join('|');
}

function won(limbs) {
  return rules.LIMBS.some(function (name) { return limbs[name].kind === 'ridge'; });
}

function targets(mode, limb) {
  var layout = rules.layoutOf(mode);
  var list = [{ kind: 'ridge' }];
  var hand = limb.indexOf('hand') === 0;
  if (hand) list.push({ kind: 'free' });
  layout.holds.forEach(function (_, id) { list.push({ kind: 'hold', id: id }); });
  if (!hand) {
    list.push({ kind: 'ledge', id: 'start' });
    layout.rests.forEach(function (_, id) { list.push({ kind: 'ledge', id: id }); });
  }
  return list;
}

function countFarAtStart(mode, limb) {
  var state = rules.freshState(mode);
  var layout = rules.layoutOf(mode);
  var far = 0;
  var near = 0;
  layout.holds.forEach(function (_, id) {
    var klass = rules.holdClass(state, limb, id, null);
    if (klass === 'far') far += 1;
    if (klass === 'reachable') near += 1;
  });
  return { far: far, near: near };
}

function run() {
  ['portrait', 'landscape'].forEach(function (mode) {
    var layout = rules.layoutOf(mode);
    assert.strictEqual(layout.holds.length, 12, mode + ' holds');
    assert.strictEqual(layout.rests.length, 2, mode + ' rests');
    assert.strictEqual(layout.installs.length, 3, mode + ' clips');
    var opened = countFarAtStart(mode, 'hand_r');
    if (opened.near < 1) fail(mode + ' 开局右手没有可及抓点');
    if (opened.far < 1) fail(mode + ' 开局没有超距抓点');
    console.log(mode + ' 开局右手 可及 ' + opened.near + ' 超距 ' + opened.far);

    var state = rules.freshState(mode);
    var only = rules.evaluate(state, 'foot_l', { kind: 'hold', id: 0 }, null);
    state.limbs.foot_r = { kind: 'free' };
    state.limbs.hand_l = { kind: 'free' };
    state.limbs.hand_r = { kind: 'free' };
    var last = rules.evaluate(state, 'foot_l', { kind: 'hold', id: 0 }, null);
    if (last.ok || last.reason !== 'last') fail(mode + ' 最后一处抓握被放行 ' + last.reason);
    if (!only.ok && only.reason === 'last') fail(mode + ' 双脚在起点时左脚无法试探');

    var release = rules.freshState(mode);
    release.limbs.hand_r = { kind: 'hold', id: 0 };
    release.stamina = 40;
    var letGo = rules.applyMove(release, 'hand_r', { kind: 'free' });
    if (!letGo.ok || release.limbs.hand_r.kind !== 'free') fail(mode + ' 手没有松开');
    if (Math.abs(release.stamina - 34) > 0.01) fail(mode + ' 松手耗体不是 6');
    var foot = rules.freshState(mode);
    foot.limbs.hand_r = { kind: 'hold', id: 0 };
    var letFoot = rules.applyMove(foot, 'foot_l', { kind: 'free' });
    if (!letFoot.ok || foot.limbs.foot_l.kind !== 'free') fail(mode + ' 脚没有松开');
    var lone = rules.freshState(mode);
    lone.limbs.foot_r = { kind: 'free' };
    lone.limbs.hand_l = { kind: 'free' };
    lone.limbs.hand_r = { kind: 'free' };
    var keep = rules.applyMove(lone, 'foot_l', { kind: 'free' });
    if (keep.ok || keep.reason !== 'last') fail(mode + ' 最后一处被松开');

    var pointer = layout.holds[0].slice();
    var snap = rules.snapTarget(rules.freshState(mode), 'hand_r', pointer, null);
    if (!snap || snap.kind !== 'hold' || snap.id !== 0) fail(mode + ' 吸附没有落到第 0 个可达点');

    var farHold = null;
    layout.holds.forEach(function (p, id) {
      if (rules.holdClass(rules.freshState(mode), 'hand_r', id, null) === 'far') farHold = p;
    });
    var cheated = rules.snapTarget(rules.freshState(mode), 'hand_r', farHold, null);
    if (cheated && cheated.kind === 'hold' && rules.holdClass(rules.freshState(mode), 'hand_r', cheated.id, null) === 'far') {
      fail(mode + ' 精确点中超远抓点仍被吸住');
    }

    var withRest = approxPath(mode, true);
    var noRest = approxPath(mode, false);
    console.log(mode + ' 有休息 展开 ' + withRest.expanded + ' 胜利 ' + !!withRest.win +
      (withRest.win ? ' 步数 ' + withRest.win.moves + ' 休息 ' + withRest.win.rests + ' 余体 ' + withRest.win.stamina.toFixed(1) : ''));
    console.log(mode + ' 无休息 展开 ' + noRest.expanded + ' 胜利 ' + !!noRest.win +
      (noRest.win ? ' 步数 ' + noRest.win.moves + ' 余体 ' + noRest.win.stamina.toFixed(1) : ''));
    if (!withRest.win) fail(mode + ' 经过休息台仍然到不了山脊');
    if (noRest.win) fail(mode + ' 不休息也能登顶，直上路线不够险');
  });

  var portrait = rules.freshState('portrait');
  portrait.restHold = 1;
  portrait.limbs.foot_l = { kind: 'ledge', id: 0 };
  portrait.limbs.foot_r = { kind: 'ledge', id: 0 };
  portrait.stamina = 40;
  var rested = rules.tick(portrait, 1, null);
  if (!rested.regen || portrait.stamina < 50) fail('稳站休息台没有回体力 ' + portrait.stamina);

  var hanging = rules.freshState('portrait');
  hanging.limbs.hand_l = { kind: 'hold', id: 0 };
  hanging.limbs.hand_r = { kind: 'hold', id: 2 };
  hanging.limbs.foot_l = { kind: 'hold', id: 4 };
  hanging.limbs.foot_r = { kind: 'hold', id: 5 };
  hanging.stamina = 40;
  var hung = rules.tick(hanging, 1, null);
  if (!hung.drain || hanging.stamina >= 40) fail('悬挂等待没有耗体');

  var easing = rules.freshState('portrait');
  easing.limbs.hand_r = { kind: 'hold', id: 0 };
  easing.limbs.foot_r = { kind: 'hold', id: 2 };
  easing.stamina = 80;
  var easeRate = rules.drainPerSec(easing, null);
  var hangRate = rules.drainPerSec(hanging, null);
  if (!(easeRate > 0 && easeRate < hangRate)) fail('有一只脚还在台上时，消耗应当减缓');

  var startStand = rules.freshState('portrait');
  var startTick = rules.tick(startStand, 2, null);
  if (startStand.stamina !== 100 || startTick.regen) fail('起点不应恢复体力，也不应掉体力');

  var climb = rules.freshState('portrait');
  var moved = rules.applyMove(climb, 'hand_r', { kind: 'hold', id: 0 });
  if (!moved.ok) fail('开局右手够不到第一抓点 ' + moved.reason);
  if (!rules.canInstall(climb, 0)) {
    /* 第一扣在第一抓点附近，允许再挪一只脚之后才进范围。 */
  }
  rules.applyMove(climb, 'foot_l', { kind: 'hold', id: 0 });
  if (climb.limbs.foot_l.kind === 'hold' && climb.limbs.hand_r.kind === 'hold' && climb.limbs.hand_r.id === 0) {
    fail('同一抓点承受了两只手脚');
  }

  var saved = rules.freshState('portrait');
  saved.limbs.hand_r = { kind: 'hold', id: 0 };
  saved.stamina = 88;
  if (!rules.canInstall(saved, 0)) fail('靠近第一扣位却不能安装');
  rules.placeInstall(saved, 0);
  saved.limbs.hand_l = { kind: 'hold', id: 2 };
  saved.limbs.foot_l = { kind: 'hold', id: 4 };
  saved.stamina = 50;
  var plain = JSON.parse(JSON.stringify(saved));
  plain.assist = false;
  var aided = JSON.parse(JSON.stringify(saved));
  aided.assist = true;
  /* applyFall 需要 methods，JSON 出来的是纯数据，重新套进 fresh 再覆盖。 */
  function hydrate(raw) {
    var s = rules.freshState('portrait');
    s.limbs = raw.limbs;
    s.stamina = raw.stamina;
    s.installs = raw.installs;
    s.assist = raw.assist;
    s.usedClips = raw.usedClips;
    return s;
  }
  var fellPlain = rules.applyFall(hydrate(plain));
  var fellAided = rules.applyFall(hydrate(aided));
  if (fellPlain.where !== 'clip' || fellAided.where !== 'clip') fail('最近绳扣没有接住');
  if (!(fellAided.stamina > fellPlain.stamina)) fail('辅助没有降低坠落惩罚 ' + fellPlain.stamina + ' / ' + fellAided.stamina);
  var back = hydrate(plain);
  back.installs = [null, null, null];
  var fellStart = rules.applyFall(back);
  if (fellStart.where !== 'start') fail('没有绳扣时应回起点');
  if (back.limbs.foot_l.kind !== 'ledge' || back.limbs.hand_r.kind !== 'free') fail('回起点后手脚没有复位');

  var summit = rules.freshState('portrait');
  summit.limbs.hand_l = { kind: 'hold', id: 11 };
  summit.limbs.hand_r = { kind: 'free' };
  summit.limbs.foot_l = { kind: 'hold', id: 10 };
  summit.limbs.foot_r = { kind: 'hold', id: 8 };
  summit.stamina = 80;
  var top = rules.evaluate(summit, 'hand_r', { kind: 'ridge' }, null);
  if (!top.ok) fail('山顶附近的手够不到山脊 ' + top.reason + ' ' + (top.dist || ''));

  if (!(audio.seconds >= 60)) fail('音乐短于 1 分钟 ' + audio.seconds);
  if (audio.phrases < 3) fail('乐句太少');
  var prints = [];
  for (var i = 0; i < audio.phrases; i++) prints.push(audio.phrasePrint(i));
  var unique = new Set(prints);
  if (unique.size !== audio.phrases) fail('乐句没有变化');
  console.log('音乐 ' + audio.seconds.toFixed(1) + ' 秒，乐句 ' + audio.phrases);

  if (process.exitCode) {
    console.error('自检未通过');
  } else {
    console.log('规则自检通过');
  }
}

run();
