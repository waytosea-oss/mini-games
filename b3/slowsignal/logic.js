/* 慢信号台 · 虚构海岸一夜的规则。
   阅读日志不推进剧情时间。回复与派遣才推进。
   占用中的队伍不能在同一次行动里改到新地点。 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SlowSignal = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var NIGHT = 8;
  var SAVE_KEY = 'slowsignal_save_v1';

  var PLACES = {
    lighthouse: { id: 'lighthouse', x: 0.835, y: 0.34, label: '右侧岬角的高塔', short: '高塔' },
    dock: { id: 'dock', x: 0.20, y: 0.40, label: '左侧海湾的栈桥', short: '栈桥' },
    bridge: { id: 'bridge', x: 0.50, y: 0.50, label: '中部溪流上的桥', short: '溪桥' },
    'guess-lamp': { id: 'guess-lamp', x: 0.70, y: 0.48, label: '高塔外的不确定范围', short: '不确定范围', guess: true },
    'guess-line': { id: 'guess-line', x: 0.30, y: 0.55, label: '海湾里的不确定范围', short: '不确定范围', guess: true },
    'guess-echo': { id: 'guess-echo', x: 0.47, y: 0.62, label: '溪水里的不确定范围', short: '不确定范围', guess: true }
  };

  var HOMES = {
    boat: { x: 0.34, y: 0.73 },
    cart: { x: 0.60, y: 0.70 }
  };

  var ROUTE = {
    boat: { dock: 1, bridge: 3, lighthouse: 3 },
    cart: { lighthouse: 1, bridge: 1, dock: 2 }
  };

  var CALLS = {
    lamp: {
      id: 'lamp',
      who: '守塔人阿岚',
      title: '雾里的灯',
      place: 'lighthouse',
      good: 'cart',
      band: 0.18,
      half: 0.06,
      garbled: '守塔人阿岚：「……岬角……灯停了……雾很大……我还在上面。」',
      clear: '守塔人阿岚：「人在塔里，灯不转了。雾贴着岬角过来，没有人下到水边。」',
      questions: [
        { id: 'spin', text: '灯架还转得动吗？', reveal: '阿岚：「转不动，卡在塔座上。人没有出海。」', verifies: true },
        { id: 'fog', text: '雾往哪边涌？', reveal: '阿岚：「雾贴着右侧岬角走，高处就是这座塔。」', verifies: true }
      ],
      goodNote: '琥珀木板车沿旱路登上岬角，灯重新转了起来。雾还没散尽，后来的人能看见这束光。',
      badTeam: '靛蓝木船停在岬角下面的水湾，上不了高塔，灯还停着。',
      missPlace: {
        boat: '靛蓝木船在海里绕着那圈范围走，高塔上的灯还停着。',
        cart: '琥珀木板车在岸上绕着那圈范围走，高塔上的灯还停着。'
      },
      late: '夜色已经沉下去，高塔的灯没有亮。',
      untouched: '高塔的灯一直停着，雾还覆在岬角上。',
      enRoute: '收束时，前往高塔的人还在路上，灯没有亮。'
    },
    line: {
      id: 'line',
      who: '码头守夜老槐',
      title: '松了的缆',
      place: 'dock',
      good: 'boat',
      band: 0.50,
      half: 0.06,
      garbled: '码头守夜老槐：「……缆松了……小船撞着桩……潮还在涨……」',
      clear: '码头守夜老槐：「旧码头外桩的缆松了，小船一下一下撞着桩。人在栈桥上，没有落水。」',
      questions: [
        { id: 'pile', text: '是哪一根桩？', reveal: '老槐：「最外面那根，就在左侧海湾的栈桥尽头。」', verifies: true },
        { id: 'tide', text: '潮水还在涨吗？', reveal: '老槐：「还在涨。人站在栈桥上，没有落水。」', verifies: true }
      ],
      goodNote: '靛蓝木船靠上栈桥外桩，把松掉的缆重新挽牢。小船还在桩边。',
      badTeam: '琥珀木板车停在栈桥上，够不着水里的缆。',
      missPlace: {
        boat: '靛蓝木船在海湾里打了个转，没有靠上外桩，缆还松着。',
        cart: '琥珀木板车停在岸边的范围里，外桩上的缆还松着。'
      },
      late: '潮水涨过了桩，小船不在原处了。',
      untouched: '外桩的缆一直松着，小船还在撞桩。',
      enRoute: '收束时，前往栈桥的人还在路上，缆还松着。'
    },
    echo: {
      id: 'echo',
      who: '过桥货郎小禾',
      title: '桥下的回声',
      place: 'bridge',
      good: 'cart',
      band: 0.82,
      half: 0.06,
      garbled: '过桥货郎小禾：「……桥……底下……有人喊……狗在叫……」',
      clear: '过桥货郎小禾：「人在桥面上。轮子卡进桥缝，狗在桥头叫，回声掉进溪里。没有人落水。」',
      questions: [
        { id: 'where', text: '你在桥上，还是在水里？', reveal: '小禾：「在桥面上。轮子卡着，人没有下去。」', verifies: true },
        { id: 'rail', text: '看得见桥栏吗？', reveal: '小禾：「栏杆就在手边，溪水在下面。」', verifies: true }
      ],
      goodNote: '琥珀木板车停在桥面，把卡进缝里的轮子抬了出来。狗安静了。货郎在桥上等了不少时候。',
      badTeam: '靛蓝木船挤进溪口的浅滩，桥面上的轮子仍卡着。',
      missPlace: {
        boat: '靛蓝木船在溪水的范围里转了一圈，没有上到桥面。',
        cart: '琥珀木板车停在溪边的范围里，没有上到桥面，轮子还卡着。'
      },
      late: '货郎自己把轮子摇松，人已经离开，溪里只剩回声。',
      untouched: '桥上的轮子一直卡着，回声还在溪里。',
      enRoute: '收束时，前往溪桥的人还在路上，轮子还卡着。'
    }
  };

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function callBlank() {
    return { verified: false, status: 'open', note: '', asked: {} };
  }

  function teamBlank(id) {
    return {
      id: id,
      state: 'idle',
      dest: null,
      callId: null,
      routeDots: 0,
      stepsDone: 0,
      stepsNeeded: 0,
      outcomeApplied: false,
      progress: 0
    };
  }

  function fresh() {
    var state = {
      tick: 0,
      knob: 0.34,
      heard: { lamp: false, line: false, echo: false },
      calls: { lamp: callBlank(), line: callBlank(), echo: callBlank() },
      teams: { boat: teamBlank('boat'), cart: teamBlank('cart') },
      log: [],
      focus: null,
      selectedTeam: null,
      selectedPlace: null,
      music: true,
      seq: 1,
      sent: false,
      ended: false,
      ending: null,
      screen: 'cover',
      tree: { nodes: [], cursor: 'root' },
      snaps: {}
    };
    state.tree.nodes.push({ id: 'root', parent: null, label: '入夜', kind: 'start', key: true });
    state.snaps.root = slim(state);
    return state;
  }

  function slim(state) {
    return {
      tick: state.tick,
      knob: state.knob,
      heard: clone(state.heard),
      calls: clone(state.calls),
      teams: clone(state.teams),
      log: clone(state.log),
      focus: state.focus,
      selectedTeam: state.selectedTeam,
      selectedPlace: state.selectedPlace,
      music: state.music,
      seq: state.seq,
      sent: state.sent,
      ended: false,
      ending: null
    };
  }

  function teamName(id) {
    return id === 'boat' ? '靛蓝木船' : '琥珀木板车';
  }

  function phaseName(st) {
    if (st === 'depart') return '出发';
    if (st === 'route') return '途中';
    if (st === 'return') return '返程';
    return '待命';
  }

  function placeOf(id) {
    return PLACES[id] || null;
  }

  function routeDots(teamId, placeId) {
    if (!placeId || !PLACES[placeId]) return 0;
    if (PLACES[placeId].guess) return 2;
    var row = ROUTE[teamId];
    return row && row[placeId] ? row[placeId] : 0;
  }

  function recallCost(team) {
    if (!team || team.state === 'idle') return 0;
    if (team.outcomeApplied) return 1;
    if (team.routeDots >= 3) return 3;
    if (team.routeDots === 2) return 2;
    return 1;
  }

  function bandOpen(state, id) {
    if (id === 'lamp') return true;
    if (id === 'line') return !!state.heard.lamp;
    if (id === 'echo') return !!state.heard.line || !!state.sent;
    return false;
  }

  function signalAt(knob, state) {
    var best = null;
    var bestD = 99;
    Object.keys(CALLS).forEach(function (id) {
      if (!bandOpen(state, id)) return;
      if (state.calls[id].status === 'missed') return;
      var d = Math.abs(knob - CALLS[id].band);
      if (d < bestD) {
        bestD = d;
        best = id;
      }
    });
    if (!best || bestD > 0.16) return { mode: 'silent', callId: null, distance: bestD };
    if (bestD > CALLS[best].half) return { mode: 'noisy', callId: best, distance: bestD };
    return { mode: 'lock', callId: best, distance: bestD };
  }

  function pushNode(state, label, kind) {
    var id = 'n' + state.seq;
    state.seq += 1;
    state.tree.nodes.push({
      id: id,
      parent: state.tree.cursor,
      label: label,
      kind: kind,
      key: true
    });
    state.tree.cursor = id;
    state.snaps[id] = slim(state);
    state.snaps[id].ended = state.ended;
    state.snaps[id].ending = state.ending ? clone(state.ending) : null;
    return id;
  }

  function addLog(state, kind, text, callId) {
    state.log.push({ kind: kind, text: text, callId: callId || null });
  }

  function teamGoingTo(state, callId) {
    var found = null;
    Object.keys(state.teams).forEach(function (id) {
      var team = state.teams[id];
      if (team.callId === callId && team.state !== 'idle' && !team.outcomeApplied) found = team;
    });
    return found;
  }

  function judge(state, team) {
    var spec = CALLS[team.callId];
    var call = state.calls[team.callId];
    var right = team.dest === spec.place;
    var late = state.tick >= NIGHT;
    if (!right) {
      return { status: 'open', note: spec.missPlace[team.id] };
    }
    if (team.id !== spec.good) {
      return { status: 'open', note: spec.badTeam };
    }
    if (late) return { status: 'missed', note: spec.late };
    var prefix = call.verified ? '' : '当时坐标还是空心钉，这一趟直接点中了地标。';
    return { status: 'resolved', note: prefix + spec.goodNote };
  }

  function applyJudge(state, team, result) {
    var call = state.calls[team.callId];
    if (!call || call.status === 'missed') return;
    if (result.status === 'open') {
      if (call.status === 'open') call.note = result.note;
    } else {
      call.status = result.status;
      call.note = result.note;
    }
    addLog(state, 'note', result.note, team.callId);
  }

  function advanceTeam(state, team) {
    if (team.state === 'idle') return;
    if (!team.outcomeApplied) {
      team.stepsDone += 1;
      if (team.stepsDone < team.stepsNeeded) {
        team.state = 'route';
        team.progress = team.stepsDone / (team.stepsNeeded + 1);
        return;
      }
      var result = judge(state, team);
      applyJudge(state, team, result);
      team.outcomeApplied = true;
      team.state = 'return';
      team.progress = 1;
      return;
    }
    team.state = 'idle';
    team.progress = 0;
    team.dest = null;
    team.callId = null;
    team.routeDots = 0;
    team.stepsDone = 0;
    team.stepsNeeded = 0;
    team.outcomeApplied = false;
  }

  function advanceAll(state, exceptId) {
    Object.keys(state.teams).forEach(function (id) {
      if (id === exceptId) return;
      advanceTeam(state, state.teams[id]);
    });
  }

  function maybeClose(state) {
    if (state.ended) return;
    var all = ['lamp', 'line', 'echo'].every(function (id) {
      return state.calls[id].status === 'resolved';
    });
    if (state.tick >= NIGHT || all) closeChapter(state, all ? 'done' : 'night');
  }

  function closeChapter(state, reason) {
    if (state.ended) return state.ending;
    ['lamp', 'line', 'echo'].forEach(function (id) {
      var call = state.calls[id];
      var spec = CALLS[id];
      if (call.status !== 'open') return;
      call.status = 'missed';
      if (teamGoingTo(state, id)) call.note = spec.enRoute;
      else if (!call.note) call.note = spec.untouched;
    });
    state.ended = true;
    state.ending = explain(state, reason);
    pushNode(state, '收束夜班', 'end');
    return state.ending;
  }

  function explain(state) {
    var a = state.calls.lamp.status;
    var b = state.calls.line.status;
    var c = state.calls.echo.status;
    var title = '有人到了，有人还在等';
    if (a === 'resolved' && b === 'resolved' && c === 'resolved') title = '三处都有人抵达';
    else if (a !== 'resolved' && b === 'resolved' && c !== 'resolved') title = '桩上的缆挽住了';
    else if (a === 'resolved' && b !== 'resolved' && c === 'resolved') title = '光回来了，缆还松着';
    else if (a === 'resolved' && c !== 'resolved') title = '高塔亮了，桥上还等着';
    else if (a !== 'resolved') title = '雾还停在岬角';
    var lines = [
      state.calls.lamp.note || CALLS.lamp.untouched,
      state.calls.line.note || CALLS.line.untouched,
      state.calls.echo.note || CALLS.echo.untouched,
      '靛蓝木船走水路，琥珀木板车走旱路。人还在路上时，不能把他们直接挪到另一处，召回要另付圆点。',
      '询问和派遣推着这一夜往前，翻开日志则停在原处。事件树里可以跳回关键节点。'
    ];
    if (title === '三处都有人抵达') {
      lines.push('三处都有人抵达，可后一处的人在夜里等了许久。等待留在这一夜里，没有被抹掉。');
    } else {
      lines.push('这一夜没有一封把所有等待都抹平的收束。结果来自听清的话、点过的形状，以及圆点花在哪一支队伍上。');
    }
    return { title: title, lines: lines, reason: a + ':' + b + ':' + c };
  }

  function hear(state, callId) {
    if (state.ended) return { ok: false, reason: 'ended', tick: state.tick };
    if (!CALLS[callId] || !bandOpen(state, callId)) return { ok: false, reason: 'closed', tick: state.tick };
    state.focus = callId;
    if (state.heard[callId]) return { ok: true, fresh: false, tick: state.tick };
    var before = state.tick;
    state.heard[callId] = true;
    addLog(state, 'log', CALLS[callId].garbled, callId);
    pushNode(state, '听清' + CALLS[callId].title, 'hear');
    return { ok: true, fresh: true, tick: state.tick, unchanged: state.tick === before };
  }

  function readLog(state) {
    return { tick: state.tick, entries: state.log.map(function (row) { return clone(row); }) };
  }

  function ask(state, callId, qid) {
    if (state.ended) return { ok: false, reason: 'ended' };
    var spec = CALLS[callId];
    if (!spec || !state.heard[callId]) return { ok: false, reason: 'unheard' };
    var call = state.calls[callId];
    var q = null;
    spec.questions.forEach(function (item) { if (item.id === qid) q = item; });
    if (!q) return { ok: false, reason: 'question' };
    if (call.asked[qid]) return { ok: false, reason: 'again', tick: state.tick };
    var before = state.tick;
    advanceAll(state, null);
    state.tick += 1;
    if (call.status !== 'open') {
      addLog(state, 'note', '这句话发出去时，那一处已经有了结果。', callId);
      pushNode(state, '询问晚了一步', 'ask');
      maybeClose(state);
      return { ok: true, dots: state.tick - before, late: true, tick: state.tick };
    }
    call.asked[qid] = true;
    if (q.verifies) call.verified = true;
    addLog(state, 'ask', q.text + q.reveal, callId);
    pushNode(state, '询问：' + q.text, 'ask');
    maybeClose(state);
    return { ok: true, dots: state.tick - before, tick: state.tick, verified: call.verified };
  }

  function previewAsk(state, callId, qid) {
    var call = state.calls[callId];
    if (!call || call.asked[qid] || call.status !== 'open' || !state.heard[callId]) {
      return { ok: false, dots: 0 };
    }
    return { ok: true, dots: 1 };
  }

  function beginTrip(team, dots, placeId, callId) {
    team.state = 'depart';
    team.dest = placeId;
    team.callId = callId;
    team.routeDots = dots;
    team.stepsDone = 1;
    team.stepsNeeded = dots;
    team.outcomeApplied = false;
    team.progress = 0.22;
  }

  function dispatch(state, teamId, placeId, callId) {
    if (state.ended) return { ok: false, reason: 'ended' };
    var team = state.teams[teamId];
    if (!team) return { ok: false, reason: 'team' };
    if (team.state !== 'idle') {
      return { ok: false, reason: 'busy', dots: recallCost(team), tick: state.tick, dest: team.dest };
    }
    if (!state.heard[callId] || !CALLS[callId]) return { ok: false, reason: 'unheard' };
    if (state.calls[callId].status !== 'open') return { ok: false, reason: 'closed' };
    var dots = routeDots(teamId, placeId);
    if (!dots) return { ok: false, reason: 'place' };
    var before = state.tick;
    advanceAll(state, teamId);
    if (team.state !== 'idle') {
      return { ok: false, reason: 'busy', dots: recallCost(team), tick: state.tick, dest: team.dest };
    }
    state.tick += dots;
    state.sent = true;
    beginTrip(team, dots, placeId, callId);
    var pl = PLACES[placeId];
    addLog(state, 'note', teamName(teamId) + '出发，前往' + pl.label + '。人还在路上。', callId);
    pushNode(state, '派遣' + teamName(teamId) + '前往' + pl.label, 'dispatch');
    maybeClose(state);
    return {
      ok: true,
      dots: state.tick - before,
      tick: state.tick,
      state: team.state,
      dest: team.dest
    };
  }

  function previewDispatch(state, teamId, placeId) {
    var team = state.teams[teamId];
    if (!team) return { ok: false, reason: 'team', dots: 0 };
    if (team.state !== 'idle') return { ok: false, reason: 'busy', dots: recallCost(team), dest: team.dest };
    var dots = routeDots(teamId, placeId);
    if (!dots) return { ok: false, reason: 'place', dots: 0 };
    return { ok: true, reason: 'ready', dots: dots };
  }

  function recall(state, teamId) {
    if (state.ended) return { ok: false, reason: 'ended' };
    var team = state.teams[teamId];
    if (!team || team.state === 'idle') return { ok: false, reason: 'idle', tick: state.tick };
    var dots = recallCost(team);
    var dest = team.dest;
    var arrived = team.outcomeApplied;
    var before = state.tick;
    advanceAll(state, teamId);
    state.tick += dots;
    if (!arrived) {
      addLog(state, 'note', '召回了' + teamName(teamId) + '。这一趟还没有抵达，呼叫仍敞着。', team.callId);
    } else {
      addLog(state, 'note', teamName(teamId) + '正在折返。这一步只把人接回来，不会出现在新的地方。', team.callId);
    }
    team.state = 'return';
    team.outcomeApplied = true;
    team.dest = dest;
    team.progress = 0.42;
    team.stepsDone = team.stepsNeeded;
    pushNode(state, '召回' + teamName(teamId), 'recall');
    maybeClose(state);
    return {
      ok: true,
      dots: state.tick - before,
      tick: state.tick,
      state: team.state,
      dest: team.dest,
      idle: team.state === 'idle'
    };
  }

  function previewRecall(state, teamId) {
    var team = state.teams[teamId];
    if (!team || team.state === 'idle') return { ok: false, dots: 0, reason: 'idle' };
    return { ok: true, dots: recallCost(team), reason: 'recall', dest: team.dest };
  }

  function wait(state) {
    if (state.ended) return { ok: false, reason: 'ended' };
    var before = state.tick;
    advanceAll(state, null);
    state.tick += 1;
    addLog(state, 'note', '守在台前，听着夜色自己往前走。', null);
    pushNode(state, '守在台前', 'wait');
    maybeClose(state);
    return { ok: true, dots: state.tick - before, tick: state.tick };
  }

  function selectTeam(state, teamId) {
    var before = state.tick;
    if (state.teams[teamId]) state.selectedTeam = teamId;
    return { tick: state.tick, unchanged: state.tick === before };
  }

  function selectPlace(state, placeId) {
    var before = state.tick;
    if (PLACES[placeId]) state.selectedPlace = placeId;
    return { tick: state.tick, unchanged: state.tick === before };
  }

  function pinMode(state, callId) {
    if (!state.heard[callId]) return 'hidden';
    if (state.calls[callId].status !== 'open') return 'done';
    if (state.calls[callId].verified) return 'verified';
    return 'uncertain';
  }

  function isAncestor(state, nodeId, cursorId) {
    var guard = 0;
    var cur = cursorId;
    while (cur && guard < 64) {
      if (cur === nodeId) return true;
      var node = null;
      state.tree.nodes.forEach(function (item) { if (item.id === cur) node = item; });
      if (!node) return false;
      cur = node.parent;
      guard += 1;
    }
    return false;
  }

  function nodeStatus(state, nodeId) {
    if (nodeId === state.tree.cursor) return 'current';
    if (isAncestor(state, nodeId, state.tree.cursor)) return 'chosen';
    return 'untraveled';
  }

  function jumpTo(state, nodeId) {
    var snap = state.snaps[nodeId];
    if (!snap) return { ok: false, reason: 'missing' };
    var tree = state.tree;
    var snaps = state.snaps;
    var music = state.music;
    var screen = 'play';
    var next = fresh();
    next.tick = snap.tick;
    next.knob = snap.knob;
    next.heard = clone(snap.heard);
    next.calls = clone(snap.calls);
    next.teams = clone(snap.teams);
    next.log = clone(snap.log);
    next.focus = snap.focus;
    next.selectedTeam = snap.selectedTeam;
    next.selectedPlace = snap.selectedPlace;
    next.music = music;
    next.seq = snap.seq;
    next.sent = snap.sent;
    next.ended = !!snap.ended;
    next.ending = snap.ending ? clone(snap.ending) : null;
    next.tree = tree;
    next.snaps = snaps;
    next.tree.cursor = nodeId;
    next.screen = next.ended ? 'ending' : screen;
    return { ok: true, state: next };
  }

  function coach(state) {
    if (state.ended) return '这一夜已经收束。可以跳回关键节点，或再值一夜。';
    if (!state.heard.lamp) return '转动旋钮，让波形落入清楚的一段。这些呼叫都是虚构的。';
    var lamp = state.calls.lamp;
    if (lamp.status === 'open' && !lamp.verified && !lamp.asked.spin && !lamp.asked.fog) {
      return '话已经记进日志。打开日志不消耗时间。问一句之前，先看卡上的圆点。';
    }
    if (lamp.status === 'open' && lamp.verified && state.teams.cart.state === 'idle' && state.teams.boat.state === 'idle') {
      return '实心钉落在右侧岬角的高塔。点琥珀木板车，再点高塔，然后确认。';
    }
    if (lamp.status === 'open' && state.teams.boat.dest === 'lighthouse' && state.teams.boat.state !== 'idle') {
      return '木船在水湾边上，上不了塔座。召回要另付圆点，不会立刻出现在高塔上。';
    }
    if (lamp.status === 'resolved' && !state.heard.line && !state.heard.echo) {
      return '高塔的结果已经记下。把旋钮转到下一段清楚的声音。';
    }
    if (state.heard.line && state.calls.line.status === 'open' && !state.calls.line.verified) {
      return '栈桥那边还是空心钉。可以先问是哪一根桩，也可以直接点左侧海湾的栈桥。';
    }
    if (state.heard.echo && state.calls.echo.status === 'open' && !state.calls.echo.verified) {
      return '回声像从水里冒出来。先问人在桥上还是在水里，再决定派哪一种外形。';
    }
    var bits = [];
    if (state.teams.boat.state !== 'idle') bits.push('靛蓝木船正' + phaseName(state.teams.boat.state));
    if (state.teams.cart.state !== 'idle') bits.push('琥珀木板车正' + phaseName(state.teams.cart.state));
    if (bits.length) return bits.join('，') + '。要改去别处，先召回。';
    return '点一支待命的队伍，再点地图上的形状。确认前先看圆点。';
  }

  function subtitle(state, callId) {
    if (!callId || !state.heard[callId]) return '';
    var spec = CALLS[callId];
    var call = state.calls[callId];
    if (call.status !== 'open' && call.note) return call.note;
    if (!call.verified) return spec.garbled;
    var text = spec.clear;
    spec.questions.forEach(function (q) {
      if (call.asked[q.id]) text = q.reveal;
    });
    return text;
  }

  function teamXY(team) {
    var home = HOMES[team.id];
    if (team.state === 'idle' || !team.dest || !PLACES[team.dest]) return { x: home.x, y: home.y };
    var dest = PLACES[team.dest];
    var p = team.progress;
    if (team.state === 'return') {
      var back = 1 - p;
      return {
        x: dest.x + (home.x - dest.x) * back,
        y: dest.y + (home.y - dest.y) * back
      };
    }
    return {
      x: home.x + (dest.x - home.x) * p,
      y: home.y + (dest.y - home.y) * p
    };
  }

  function exportState(state) {
    return {
      v: 1,
      key: SAVE_KEY,
      tick: state.tick,
      knob: state.knob,
      heard: state.heard,
      calls: state.calls,
      teams: state.teams,
      log: state.log,
      focus: state.focus,
      selectedTeam: state.selectedTeam,
      selectedPlace: state.selectedPlace,
      music: state.music,
      seq: state.seq,
      sent: state.sent,
      ended: state.ended,
      ending: state.ending,
      screen: state.screen,
      tree: state.tree,
      snaps: state.snaps
    };
  }

  function serialize(state) {
    return JSON.stringify(exportState(state));
  }

  function hydrate(raw) {
    var data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    var state = fresh();
    if (!data || data.v !== 1) return state;
    state.tick = data.tick || 0;
    state.knob = typeof data.knob === 'number' ? data.knob : 0.34;
    state.heard = data.heard || state.heard;
    state.calls = data.calls || state.calls;
    state.teams = data.teams || state.teams;
    state.log = data.log || [];
    state.focus = data.focus || null;
    state.selectedTeam = data.selectedTeam || null;
    state.selectedPlace = data.selectedPlace || null;
    state.music = data.music !== false;
    state.seq = data.seq || 1;
    state.sent = !!data.sent;
    state.ended = !!data.ended;
    state.ending = data.ending || null;
    state.screen = data.screen || 'cover';
    state.tree = data.tree || state.tree;
    state.snaps = data.snaps || state.snaps;
    return state;
  }

  function arcBand(tick) {
    var p = tick / NIGHT;
    if (p < 0.34) return 'full';
    if (p < 0.67) return 'mid';
    return 'low';
  }

  return {
    NIGHT: NIGHT,
    SAVE_KEY: SAVE_KEY,
    PLACES: PLACES,
    HOMES: HOMES,
    CALLS: CALLS,
    fresh: fresh,
    teamName: teamName,
    phaseName: phaseName,
    placeOf: placeOf,
    routeDots: routeDots,
    recallCost: recallCost,
    bandOpen: bandOpen,
    signalAt: signalAt,
    hear: hear,
    readLog: readLog,
    ask: ask,
    previewAsk: previewAsk,
    dispatch: dispatch,
    previewDispatch: previewDispatch,
    recall: recall,
    previewRecall: previewRecall,
    wait: wait,
    selectTeam: selectTeam,
    selectPlace: selectPlace,
    pinMode: pinMode,
    nodeStatus: nodeStatus,
    jumpTo: jumpTo,
    closeChapter: closeChapter,
    coach: coach,
    subtitle: subtitle,
    teamXY: teamXY,
    exportState: exportState,
    serialize: serialize,
    hydrate: hydrate,
    arcBand: arcBand,
    explain: explain
  };
});
