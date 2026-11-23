/* 无头自检：规则、五关可通、乐句时长。node b3/gravipost/selfcheck.js */
'use strict';

var path = require('path');
var sim = require(path.join(__dirname, 'sim.js'));
var levels = require(path.join(__dirname, 'levels.js'));
var audio = require(path.join(__dirname, 'audio.js'));

var failed = 0;
function assert(cond, msg) {
  if (!cond) {
    failed += 1;
    console.error('FAIL ' + msg);
  } else console.log('ok   ' + msg);
}

function room(rows) {
  return levels.build({
    id: 'room',
    name: 'room',
    blurb: '',
    intro: '',
    mailbox: 'square',
    label: '葡萄紫方盒',
    doorTime: 3,
    medalPower: 30,
    open: rows.join('').indexOf('m') < 0 && rows.join('').indexOf('M') < 0,
    rows: rows
  });
}

function run(state, seconds, dt) {
  var n = Math.round(seconds / (dt || 1 / 60));
  var i;
  for (i = 0; i < n; i++) {
    sim.step(state, dt || 1 / 60);
    if (state.phase === 'win') break;
  }
  return state;
}

function micro() {
  var st, integ, fills;

  st = sim.create(room(['#####', '#...#', '#.s.#', '#...#', '#####']), null, 'mid');
  st.x = 3.55;
  st.y = 2.5;
  st.vx = 2.4;
  st.vy = 0;
  run(st, 1.2);
  assert(st.integrity === 100, '低速撞墙不掉完好度，当前 ' + st.integrity);
  assert(st.camera === 0, '镜头角保持 0');

  st = sim.create(room(['#####', '#...#', '#.s.#', '#...#', '#####']), null, 'mid');
  st.x = 2.2;
  st.y = 2.5;
  st.vx = 11;
  st.vy = 0;
  integ = st.integrity;
  run(st, 1.2);
  assert(st.integrity < integ, '高速撞墙掉完好度 ' + integ + ' → ' + st.integrity);
  assert(st.hits >= 1, '高速碰撞计入次数');

  st = sim.create(room(['#####', '#ppp#', '#.s.#', '#####']), null, 'mid');
  st.x = 3.55;
  st.y = 1.5;
  st.vx = 11;
  st.vy = 0;
  run(st, 1.0);
  assert(st.integrity === 100, '踩在软垫上高速撞墙不掉完好度，当前 ' + st.integrity);

  st = sim.create(room(['#####', '#u.s#', '#####']), null, 'mid');
  st.power = 30;
  st.x = 2.2;
  st.y = 1.5;
  st.vx = -3;
  run(st, 1.5);
  assert(st.power === 100 && st.fills === 1, '第一次经过补给补满，fills=' + st.fills + ' power=' + st.power);
  fills = st.fills;
  st.power = 25;
  st.x = 3.2;
  st.vx = 0;
  st.vy = 0;
  run(st, 0.4);
  st.vx = -3;
  run(st, 1.5);
  assert(st.fills === fills && st.power === 25, '离开再经过不再补充 power=' + st.power + ' fills=' + st.fills);
  st.x = 1.5;
  st.power = 10;
  run(st, 2);
  assert(st.fills === 1 && st.power === 10, '停在补给上不续杯 power=' + st.power);

  st = sim.create(room(['#####', '#.m.#', '#.s.#', '#####']), null, 'mid');
  st.x = 2.5;
  st.y = 1.5;
  st.vx = 6;
  st.vy = 0;
  st.gravOn = false;
  run(st, 0.45);
  assert(st.phase !== 'win', '高速穿过信箱不算送达');

  st = sim.create(room(['#####', '#.m.#', '#.s.#', '#####']), null, 'mid');
  st.x = 2.5;
  st.y = 1.45;
  st.vx = 0;
  st.vy = 0;
  st.gravOn = false;
  run(st, 1.2);
  assert(st.phase === 'win', '在信箱里停稳才送达');

  var pitLevel = levels.LEVELS[1];
  st = sim.create(pitLevel, null, 'mid');
  var pitStartX = st.x;
  var pitStartY = st.y;
  st.x = 1.5;
  st.y = 9.5;
  sim.step(st, 1 / 60);
  assert(Math.abs(st.snapshot.x - 1.5) < 0.01, '经过西侧检查点后快照在西侧 ' + st.snapshot.x.toFixed(2));
  st.x = 8.5;
  st.y = 8.5;
  sim.step(st, 1 / 60);
  assert(st.phase === 'fail', '未重开时坐坑失败');
  run(st, 1.2);
  assert(Math.abs(st.x - 1.5) < 0.01 && Math.abs(st.y - 9.5) < 0.01, '未重开时坐坑仍回西侧检查点 ' + st.x.toFixed(2) + ',' + st.y.toFixed(2));

  st = sim.create(pitLevel, null, 'mid');
  st.x = 1.5;
  st.y = 9.5;
  sim.step(st, 1 / 60);
  sim.restart(st);
  assert(Math.abs(st.x - pitStartX) < 0.01 && Math.abs(st.y - pitStartY) < 0.01, '重开回到本关起点 ' + st.x.toFixed(2) + ',' + st.y.toFixed(2));
  assert(Math.abs(st.snapshot.x - pitStartX) < 0.01 && Math.abs(st.snapshot.y - pitStartY) < 0.01, '重开后失败快照改回起点');
  assert(st.snapshot !== st.startSnap && st.snapshot.seenCp !== st.startSnap.seenCp && st.snapshot.usedSupply !== st.startSnap.usedSupply, '重开快照与起点不共享对象');
  assert(!st.seenCp['1,9'], '重开后西侧检查点记为未经过');
  st.x = 8.5;
  st.y = 8.5;
  sim.step(st, 1 / 60);
  assert(st.phase === 'fail' && st.failReason === 'pit', '重开后坐坑进入失败');
  run(st, 1.2);
  assert(st.phase === 'play' && Math.abs(st.x - pitStartX) < 0.01 && Math.abs(st.y - pitStartY) < 0.01, '重开后坐坑回到起点 ' + st.x.toFixed(2) + ',' + st.y.toFixed(2));

  st = sim.create(room(['#####', '#o..#', '#.s.#', '#####']), null, 'mid');
  var homeX = st.x;
  var homeY = st.y;
  st.x = 1.5;
  st.y = 1.5;
  sim.step(st, 1 / 60);
  assert(st.phase === 'fail' && st.failReason === 'pit', '落坑进入失败');
  run(st, 1.2);
  assert(Math.abs(st.x - homeX) < 0.01 && Math.abs(st.y - homeY) < 0.01, '落坑回到检查点');
  assert(st.phase === 'play', '回到检查点后可继续');

  st = sim.create(room(['#######', '#m....#', '#d....#', '#b....#', '#s....#', '#######']), null, 'mid');
  assert(sim.isSolid(st, 1.5, 2.5), '没压按钮时门格是墙');
  st.x = 1.5;
  st.y = 3.5;
  sim.step(st, 1 / 60);
  assert(st.doorOpen && !sim.isSolid(st, 1.5, 2.5), '压住按钮后门格打开');
  st.x = 5.2;
  st.y = 3.5;
  run(st, 3.4);
  assert(!st.doorOpen && sim.isSolid(st, 1.5, 2.5), '离开按钮后倒计时结束，门重新关上');

  st = sim.create(room(['#########', '#.......#', '#...s...#', '#.......#', '#########']), null, 'mid');
  st.vx = 6;
  st.vy = 0.2;
  st.gravOn = true;
  st.gAngle = 0;
  st.gTarget = 0;
  sim.setFinger(st, null);
  var before = sim.speedOf(st);
  run(st, 0.35);
  assert(sim.speedOf(st) > before * 0.7, '松开转盘不把速度清零 ' + before.toFixed(2) + ' → ' + sim.speedOf(st).toFixed(2));
  assert(st.camera === 0, '转向重力时镜头仍是 0');

  st = sim.create(room(['#########', '#.......#', '#...s...#', '#.......#', '#########']), null, 'mid');
  st.vx = 8;
  st.vy = 0;
  st.power = 100;
  st.brake = true;
  run(st, 0.45);
  assert(sim.speedOf(st) < 3.5, '刹车能在预期时间内减速，速度 ' + sim.speedOf(st).toFixed(2));
  assert(st.power < 100 - 6, '刹车持续耗电，动力 ' + st.power.toFixed(1));

  st = sim.create(room(['#########', '#.......#', '#...s...#', '#.......#', '#########']), null, 'mid');
  st.vx = 8;
  st.power = 0;
  st.brake = true;
  run(st, 0.35);
  assert(sim.speedOf(st) > 6.5, '没电时刹车不生效，速度 ' + sim.speedOf(st).toFixed(2));

  st = sim.create(room(['#####', '#...#', '#.s.#', '#...#', '#####']), null, 'mid');
  st.integrity = 8;
  st.x = 2.2;
  st.vx = 11;
  var sx = st.snapshot.x;
  run(st, 2);
  assert(st.phase === 'play', '撞碎后已回到可玩');
  assert(Math.abs(st.x - sx) < 0.2, '完好度归零回到检查点 x=' + st.x.toFixed(2));
  assert(st.integrity > 8, '回到检查点时恢复当时的完好度 ' + st.integrity);
}

function control(state, wp) {
  var dx = wp.x - state.x;
  var dy = wp.y - state.y;
  var dist = Math.hypot(dx, dy);
  var speed = sim.speedOf(state);
  if (wp.settle) {
    sim.setFinger(state, Math.atan2(dy, dx));
    state.brake = speed > (dist < 1.15 ? 0.75 : 2.4);
    return dist;
  }
  sim.setFinger(state, Math.atan2(dy, dx));
  var brake = false;
  if (dist < 1.35 && speed > 2.1) brake = true;
  if (wp.brakeAt != null && dist < (wp.brakeDist || 2.6) && speed > wp.brakeAt) brake = true;
  var net = sim.CONST.BRAKE - sim.CONST.G;
  var stopD = (speed * speed) / (2 * net) + 0.35;
  if (speed > 3.4 && wallAhead(state, Math.min(stopD, 3.6))) brake = true;
  if (pitAhead(state)) brake = true;
  state.brake = brake;
  return dist;
}

function pitAhead(state) {
  var sp = sim.speedOf(state);
  if (sp < 0.25) return false;
  var ux = state.vx / sp;
  var uy = state.vy / sp;
  var i, c;
  for (i = 1; i <= 4; i++) {
    c = sim.cellAt(state.level, state.x + ux * 0.3 * i, state.y + uy * 0.3 * i);
    if (c && c.k === 'pit') return true;
  }
  return false;
}

function wallAhead(state, dist) {
  var sp = sim.speedOf(state);
  if (sp < 0.35) return false;
  var ux = state.vx / sp;
  var uy = state.vy / sp;
  var t;
  for (t = 0.28; t <= dist; t += 0.22) {
    if (sim.isSolid(state, state.x + ux * t, state.y + uy * t)) return true;
  }
  return false;
}

function playRoute(levelIndex, sens, route) {
  var level = levels.LEVELS[levelIndex];
  var state = sim.create(level, null, sens || 'mid');
  var wp = 0;
  var guard = 0;
  var fails = 0;
  var dt = 1 / 60;
  var seenFail = false;
  while (state.time < 50 && guard < 50 * 60) {
    guard += 1;
    if (state.phase === 'win') break;
    if (state.phase === 'fail') {
      if (!seenFail) fails += 1;
      seenFail = true;
      sim.step(state, dt);
      continue;
    }
    seenFail = false;
    var target = route[Math.min(wp, route.length - 1)];
    var dist = control(state, target);
    sim.step(state, dt);
    if (dist < (target.reach || 0.85)) {
      if (wp < route.length - 1) wp += 1;
    }
  }
  return { state: state, wp: wp, fails: fails };
}

function dump(level, state) {
  var y, x, row, c;
  console.error('--- ' + level.id + ' ball ' + state.x.toFixed(2) + ',' + state.y.toFixed(2) +
    ' v ' + state.vx.toFixed(2) + ',' + state.vy.toFixed(2) +
    ' z ' + state.z + ' ph ' + state.phase + ' hit ' + state.hits + ' pow ' + state.powerUsed.toFixed(1));
  for (y = 0; y < level.rows; y++) {
    row = '';
    for (x = 0; x < level.cols; x++) {
      c = level.grid[y][x];
      if (Math.floor(state.x) === x && Math.floor(state.y) === y) row += '@';
      else row += c.ch;
    }
    console.error(row);
  }
}

function routes() {
  var plans = [
    [
      { x: 4.5, y: 1.28, settle: true, reach: 0.45 }
    ],
    [
      { x: 1.6, y: 9.5, brakeAt: 6, brakeDist: 1.6, reach: 0.8 },
      { x: 2.2, y: 1.28, settle: true, reach: 0.45 }
    ],
    [
      { x: 8.5, y: 9.5, brakeAt: 3.4, brakeDist: 2.6, reach: 0.7 },
      { x: 8.5, y: 4.0, reach: 0.75 },
      { x: 2.5, y: 4.0, brakeAt: 3.6, brakeDist: 2.2, reach: 0.75 },
      { x: 2.2, y: 1.28, settle: true, reach: 0.4 }
    ],
    [
      { x: 5.6, y: 8.35, reach: 0.45 },
      { x: 8.4, y: 8.35, reach: 0.4 },
      { x: 8.4, y: 2.55, reach: 0.55 },
      { x: 3.5, y: 2.55, reach: 0.5 },
      { x: 3.5, y: 1.28, settle: true, reach: 0.4 }
    ],
    [
      { x: 7.4, y: 10.5, reach: 0.4 },
      { x: 7.4, y: 8.4, reach: 0.4 },
      { x: 7.4, y: 5.5, reach: 0.4 },
      { x: 4.5, y: 5.5, reach: 0.4 },
      { x: 4.5, y: 4.45, reach: 0.35 },
      { x: 3.5, y: 4.45, reach: 0.35 },
      { x: 3.5, y: 1.28, settle: true, reach: 0.4 }
    ]
  ];
  plans.forEach(function (route, i) {
    var result = playRoute(i, 'mid', route);
    var st = result.state;
    if (st.phase !== 'win') dump(levels.LEVELS[i], st);
    assert(st.phase === 'win', levels.LEVELS[i].name + ' 适中灵敏度可送达，失败 ' + result.fails + ' 次，碰撞 ' + st.hits + '，耗电 ' + st.powerUsed.toFixed(1));
    assert(result.fails === 0, levels.LEVELS[i].name + ' 示范路线不需要用掉检查点');
  });

  var gentle = playRoute(0, 'low', plans[0]);
  assert(gentle.state.phase === 'win', '教学关在「稳」灵敏度下也能送达');

  var naive = sim.create(levels.LEVELS[3], null, 'mid');
  naive.gravOn = true;
  naive.gAngle = -Math.PI / 2;
  naive.gTarget = -Math.PI / 2;
  sim.setFinger(naive, -Math.PI / 2);
  var fell = false;
  var n;
  for (n = 0; n < 420; n++) {
    sim.step(naive, 1 / 60);
    if (naive.failReason === 'pit') { fell = true; break; }
  }
  assert(fell, '磁场关朝北直冲会进回收坑');

  var pull = sim.create(levels.LEVELS[3], null, 'mid');
  pull.x = 4.35;
  pull.y = 7.45;
  pull.gravOn = false;
  var x0 = pull.x;
  run(pull, 0.7);
  assert(pull.x < x0 - 0.4 || pull.failReason === 'pit', '圆磁场会把旁边的包裹拉向回收坑，x ' + x0.toFixed(2) + ' → ' + pull.x.toFixed(2));
}

function music() {
  assert(audio.seconds > 60, '循环长于 60 秒，实际 ' + audio.seconds.toFixed(1));
  assert(audio.phrases >= 4, '至少四段乐句');
  var a = audio.phrasePrint(0);
  var b = audio.phrasePrint(1);
  var c = audio.phrasePrint(2);
  var d = audio.phrasePrint(3);
  assert(a !== b && b !== c && c !== d && a !== c, '乐句之间有变化');
}

micro();
routes();
music();
if (failed) {
  console.error(failed + ' failed');
  process.exit(1);
}
console.log('selfcheck passed');
