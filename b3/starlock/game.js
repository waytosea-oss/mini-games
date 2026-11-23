(function () {
  'use strict';

  var SAVE_KEY = 'starlock_save_v1';
  var DIR = ['正上（12点）', '右上', '正右（3点）', '右下', '正下（6点）', '左下', '正左（9点）', '左上'];
  var SHORT_DIR = ['正上', '右上', '正右', '右下', '正下', '左下', '正左', '左上'];
  var MUSIC_STEP = 60 / 96 / 4;
  var MUSIC_LOOP = 512;

  function mod(n, m) { return ((n % m) + m) % m; }
  function dirName(slot) { return DIR[mod(slot, 8)]; }
  function gapOf(ring, rot) { return mod(rot, ring.n); }

  function R(p) {
    return {
      id: p.id, name: p.name, scale: p.scale, rot: p.rot, exit: p.exit == null ? 4 : p.exit, n: 8
    };
  }

  var CHAPTERS = [
    { id: 1, name: '三环入门', levels: [1, 2, 3], blurb: '认识缺口、卡扣和出口。三只环先共用下方的出口。' },
    { id: 2, name: '卡扣顺序', levels: [4, 5, 6], blurb: '有的环要等另一只环转到指定刻度，通道才打开。' },
    { id: 3, name: '侧向出口', levels: [7, 8], blurb: '有的环从侧面抽离。先看清箭头在哪一边。' },
    { id: 4, name: '星核试炼', levels: [9, 10], blurb: '出口、卡扣和锁转条件会叠在一起。' }
  ];

  var LEVELS = [
    {
      id: 1, chapter: 1, name: '让开卡扣',
      tip: '内环的箭头是灰的。外环的卡扣压在出口上。',
      brief: '先把外环转开一格，再抽出里面的环。',
      corePin: true,
      rings: [
        R({ id: 'outer', name: '外环', scale: 1, rot: 4 }),
        R({ id: 'mid', name: '中环', scale: 0.7, rot: 4 }),
        R({ id: 'inner', name: '内环', scale: 0.44, rot: 4 })
      ],
      locks: [],
      blocks: [
        { target: 'inner', by: 'outer', gapIs: 4 },
        { target: 'mid', by: 'outer', gapIs: 4 }
      ]
    },
    {
      id: 2, chapter: 1, name: '对准刻度',
      tip: '八个刻度会吸附。转错了就点撤销，退回一步。',
      brief: '把缺口转到正下方，再点亮起的箭头。',
      corePin: false,
      rings: [
        R({ id: 'outer', name: '外环', scale: 1, rot: 1 }),
        R({ id: 'mid', name: '中环', scale: 0.7, rot: 6 }),
        R({ id: 'inner', name: '内环', scale: 0.44, rot: 3 })
      ],
      locks: [],
      blocks: [
        { target: 'inner', by: 'outer', gapIs: 4 },
        { target: 'inner', by: 'mid', gapIs: 4 }
      ]
    },
    {
      id: 3, chapter: 1, name: '由内而外',
      tip: '星核会拽紧外面的环。里面还有环时，外面的环抽不动。',
      brief: '先取内环，再取中环，最后取外环。',
      corePin: true,
      rings: [
        R({ id: 'outer', name: '外环', scale: 1, rot: 6 }),
        R({ id: 'mid', name: '中环', scale: 0.7, rot: 2 }),
        R({ id: 'inner', name: '内环', scale: 0.44, rot: 3 })
      ],
      locks: [],
      blocks: [{ target: 'inner', by: 'outer', gapIs: 4 }]
    },
    {
      id: 4, chapter: 2, name: '等它转到',
      tip: '内环要等外环的缺口转到正左，才转得动。',
      brief: '先挪开中环的卡扣，再让外环转到正左。',
      corePin: true,
      rings: [
        R({ id: 'outer', name: '外环', scale: 1, rot: 7, exit: 4 }),
        R({ id: 'mid', name: '中环', scale: 0.7, rot: 4, exit: 4 }),
        R({ id: 'inner', name: '内环', scale: 0.44, rot: 3, exit: 4 })
      ],
      locks: [{ target: 'inner', by: 'outer', gap: 6 }],
      blocks: [{ target: 'inner', by: 'mid', gapIs: 4 }]
    },
    {
      id: 5, chapter: 2, name: '打开通道',
      tip: '中环的缺口转到正右，内环的通道才打开。',
      brief: '通道没打开时，文字会点名挡住的那只环。',
      corePin: true,
      rings: [
        R({ id: 'outer', name: '外环', scale: 1, rot: 1, exit: 4 }),
        R({ id: 'mid', name: '中环', scale: 0.7, rot: 0, exit: 4 }),
        R({ id: 'inner', name: '内环', scale: 0.44, rot: 4, exit: 4 })
      ],
      locks: [],
      blocks: [
        { target: 'inner', by: 'mid', unlessGap: 2 },
        { target: 'inner', by: 'outer', gapIs: 4 }
      ]
    },
    {
      id: 6, chapter: 2, name: '叠好再抽',
      tip: '先看谁挡住出口，再看谁还转不动。',
      brief: '外环转到正右，中环才转得动。',
      corePin: true,
      rings: [
        R({ id: 'outer', name: '外环', scale: 1, rot: 1, exit: 4 }),
        R({ id: 'mid', name: '中环', scale: 0.7, rot: 6, exit: 4 }),
        R({ id: 'inner', name: '内环', scale: 0.44, rot: 4, exit: 4 })
      ],
      locks: [{ target: 'mid', by: 'outer', gap: 2 }],
      blocks: [
        { target: 'inner', by: 'mid', unlessGap: 2 },
        { target: 'inner', by: 'outer', gapIs: 4 },
        { target: 'mid', by: 'outer', gapIs: 4 }
      ]
    },
    {
      id: 7, chapter: 3, name: '侧边出口',
      tip: '内环的出口在正右，不在正下。',
      brief: '看箭头的位置，不要默认都从下方抽。',
      corePin: true,
      rings: [
        R({ id: 'outer', name: '外环', scale: 1, rot: 6, exit: 4 }),
        R({ id: 'mid', name: '中环', scale: 0.7, rot: 2, exit: 4 }),
        R({ id: 'inner', name: '内环', scale: 0.44, rot: 0, exit: 2 })
      ],
      locks: [],
      blocks: [{ target: 'inner', by: 'outer', gapIs: 2 }]
    },
    {
      id: 8, chapter: 3, name: '侧门让路',
      tip: '中环转到正上，内环才转得动。中环自己的出口也在正上。',
      brief: '侧面的出口同样要等卡扣让开。',
      corePin: true,
      rings: [
        R({ id: 'outer', name: '外环', scale: 1, rot: 6, exit: 4 }),
        R({ id: 'mid', name: '中环', scale: 0.7, rot: 2, exit: 0 }),
        R({ id: 'inner', name: '内环', scale: 0.44, rot: 1, exit: 2 })
      ],
      locks: [{ target: 'inner', by: 'mid', gap: 0 }],
      blocks: [
        { target: 'inner', by: 'outer', gapIs: 2 },
        { target: 'inner', by: 'mid', unlessGap: 0 }
      ]
    },
    {
      id: 9, chapter: 4, name: '两道出口',
      tip: '内环从正右出去。中环要等外环转到正左，才转得动。',
      brief: '一条出口在侧面，一条在下方。',
      corePin: true,
      rings: [
        R({ id: 'outer', name: '外环', scale: 1, rot: 5, exit: 4 }),
        R({ id: 'mid', name: '中环', scale: 0.7, rot: 0, exit: 4 }),
        R({ id: 'inner', name: '内环', scale: 0.44, rot: 0, exit: 2 })
      ],
      locks: [{ target: 'mid', by: 'outer', gap: 6 }],
      blocks: [
        { target: 'inner', by: 'mid', unlessGap: 2 },
        { target: 'inner', by: 'outer', gapIs: 2 }
      ]
    },
    {
      id: 10, chapter: 4, name: '星核终锁',
      tip: '先分清每只环的出口，再看卡扣压着谁。',
      brief: '三只环的出口不在同一侧。',
      corePin: true,
      rings: [
        R({ id: 'outer', name: '外环', scale: 1, rot: 7, exit: 4 }),
        R({ id: 'mid', name: '中环', scale: 0.7, rot: 2, exit: 6 }),
        R({ id: 'inner', name: '内环', scale: 0.44, rot: 1, exit: 2 })
      ],
      locks: [
        { target: 'mid', by: 'outer', gap: 0 },
        { target: 'inner', by: 'mid', gap: 6 }
      ],
      blocks: [
        { target: 'inner', by: 'outer', gapIs: 2 },
        { target: 'mid', by: 'outer', gapIs: 6 }
      ]
    }
  ];

  function byId(level, id) {
    for (var i = 0; i < level.rings.length; i++) if (level.rings[i].id === id) return level.rings[i];
    return null;
  }
  function makeState(level) {
    var rots = {}, out = {};
    level.rings.forEach(function (r) { rots[r.id] = r.rot; out[r.id] = false; });
    return { rots: rots, out: out };
  }
  function cloneState(state) {
    var rots = {}, out = {};
    Object.keys(state.rots).forEach(function (k) { rots[k] = state.rots[k]; out[k] = !!state.out[k]; });
    return { rots: rots, out: out };
  }
  function keyOf(level, state) {
    return level.rings.map(function (r) { return state.out[r.id] ? 'x' : String(state.rots[r.id]); }).join('.');
  }
  function isWon(level, state) {
    return level.rings.every(function (r) { return state.out[r.id]; });
  }

  function inspectRotate(level, state, id, dir) {
    var ring = byId(level, id);
    if (!ring || state.out[id]) {
      return { ok: false, type: 'out', text: (ring ? ring.name : '这只环') + '已经抽离，不能再转。' };
    }
    for (var i = 0; i < level.locks.length; i++) {
      var lock = level.locks[i];
      if (lock.target !== id || state.out[lock.by]) continue;
      var by = byId(level, lock.by);
      if (gapOf(by, state.rots[lock.by]) !== lock.gap) {
        return {
          ok: false, type: 'lock', byId: by.id,
          text: ring.name + '现在转不动。要先让' + by.name + '的缺口转到' + dirName(lock.gap) + '。'
        };
      }
    }
    var dest = mod(state.rots[id] + dir, ring.n);
    return { ok: true, dest: dest, text: ring.name + '转到' + dirName(dest) + '。' };
  }

  function tryRotate(level, state, id, dir) {
    var info = inspectRotate(level, state, id, dir);
    if (!info.ok) return info;
    var next = cloneState(state);
    next.rots[id] = info.dest;
    return { ok: true, state: next, text: info.text };
  }

  function inspectExtract(level, state, id) {
    var ring = byId(level, id);
    if (!ring || state.out[id]) {
      return { ok: false, type: 'out', text: (ring ? ring.name : '这只环') + '已经抽离。' };
    }
    var gap = gapOf(ring, state.rots[id]);
    if (gap !== ring.exit) {
      return {
        ok: false, type: 'gap',
        text: ring.name + '的缺口在' + dirName(gap) + '，出口在' + dirName(ring.exit) + '。'
      };
    }
    if (level.corePin) {
      var smaller = level.rings.filter(function (r) { return !state.out[r.id] && r.scale < ring.scale; });
      smaller.sort(function (a, b) { return a.scale - b.scale; });
      if (smaller.length) {
        return {
          ok: false, type: 'pin', byId: smaller[0].id,
          text: ring.name + '还不能抽出。星核还牵着' + smaller[0].name + '，' + ring.name + '被拽紧。'
        };
      }
    }
    for (var i = 0; i < level.blocks.length; i++) {
      var rule = level.blocks[i];
      if (rule.target !== id || state.out[rule.by]) continue;
      var by = byId(level, rule.by);
      var g = gapOf(by, state.rots[rule.by]);
      if (rule.gapIs != null && g === rule.gapIs) {
        return {
          ok: false, type: 'block', byId: by.id,
          text: ring.name + '还不能抽出。' + by.name + '的卡扣压在' + dirName(g) + '的出口上。'
        };
      }
      if (rule.unlessGap != null && g !== rule.unlessGap) {
        return {
          ok: false, type: 'block', byId: by.id,
          text: ring.name + '还不能抽出。要等' + by.name + '的缺口转到' + dirName(rule.unlessGap) + '，通道才打开。'
        };
      }
    }
    return { ok: true, text: ring.name + '的缺口已经对准出口，可以抽离。' };
  }

  function tryExtract(level, state, id) {
    var info = inspectExtract(level, state, id);
    if (!info.ok) return info;
    var next = cloneState(state);
    next.out[id] = true;
    return { ok: true, state: next, text: info.text };
  }

  function canTurn(level, state, id) {
    return inspectRotate(level, state, id, 1).ok || inspectRotate(level, state, id, -1).ok;
  }

  function solve(level, startState) {
    var start = startState ? cloneState(startState) : makeState(level);
    var q = [start];
    var prev = new Map();
    var k0 = keyOf(level, start);
    prev.set(k0, null);
    var guard = 0;
    while (q.length) {
      var s = q.shift();
      var k = keyOf(level, s);
      if (isWon(level, s)) {
        var ops = [];
        var cur = k;
        while (prev.get(cur)) {
          ops.push(prev.get(cur).op);
          cur = prev.get(cur).from;
        }
        ops.reverse();
        return ops;
      }
      if (++guard > 20000) return null;
      for (var ri = 0; ri < level.rings.length; ri++) {
        var ring = level.rings[ri];
        if (s.out[ring.id]) continue;
        for (var d = 0; d < 2; d++) {
          var dir = d === 0 ? 1 : -1;
          var turned = tryRotate(level, s, ring.id, dir);
          if (!turned.ok) continue;
          var nk = keyOf(level, turned.state);
          if (prev.has(nk)) continue;
          prev.set(nk, { from: k, op: { op: 'rot', id: ring.id, dir: dir } });
          q.push(turned.state);
        }
        var ex = tryExtract(level, s, ring.id);
        if (!ex.ok) continue;
        var ek = keyOf(level, ex.state);
        if (prev.has(ek)) continue;
        prev.set(ek, { from: k, op: { op: 'out', id: ring.id } });
        q.push(ex.state);
      }
    }
    return null;
  }

  function replay(level, ops, startState) {
    var s = startState ? cloneState(startState) : makeState(level);
    for (var i = 0; i < ops.length; i++) {
      var op = ops[i];
      var n = op.op === 'rot' ? tryRotate(level, s, op.id, op.dir) : tryExtract(level, s, op.id);
      if (!n.ok) return null;
      s = n.state;
    }
    return isWon(level, s) ? s : null;
  }

  function buildLens(level, state) {
    var before = JSON.stringify(state);
    var ops = solve(level, state);
    if (JSON.stringify(state) !== before) {
      return { kind: 'err', current: '观察没有完成。', next: '环的角度没有被改动。', claims: [] };
    }
    if (!ops) {
      return { kind: 'none', current: '这一局面可以重开后再看。', next: '重开会把这一关转回最初的角度。', claims: [] };
    }
    if (!ops.length) {
      return { kind: 'done', current: '还在场上的环已经可以抽离。', next: '按亮起的箭头继续即可。', claims: [] };
    }
    if (ops[0].op === 'out') {
      var ready = inspectExtract(level, state, ops[0].id);
      var ring0 = byId(level, ops[0].id);
      if (!ready.ok) return { kind: 'err', current: '观察和机关不一致。', next: '可以重开本关。', claims: [] };
      return {
        kind: 'out', id: ops[0].id, claims: [{ type: 'extract', id: ops[0].id }],
        current: ring0.name + '的卡扣已经对准出口。',
        next: '现在就可以抽离' + ring0.name + '。抽离不会转动其他环。'
      };
    }
    var n = 0;
    while (n < ops.length && n < 3 && ops[n].op === 'rot' && ops[n].id === ops[0].id && ops[n].dir === ops[0].dir) n++;
    var sim = cloneState(state);
    for (var i = 0; i < n; i++) {
      var step = tryRotate(level, sim, ops[0].id, ops[0].dir);
      if (!step.ok) return { kind: 'err', current: '这一步转不过去。', next: '剖面镜不采用这一步。', claims: [] };
      sim = step.state;
    }
    var claims = [];
    level.rings.forEach(function (r) {
      if (sim.out[r.id]) return;
      if (!inspectExtract(level, state, r.id).ok && inspectExtract(level, sim, r.id).ok) claims.push({ type: 'extract', id: r.id });
      if (!canTurn(level, state, r.id) && canTurn(level, sim, r.id)) claims.push({ type: 'turn', id: r.id });
    });
    var mover = byId(level, ops[0].id);
    var dirWord = ops[0].dir > 0 ? '顺时针' : '逆时针';
    var fact;
    if (claims.length) {
      fact = claims.map(function (c) {
        var name = byId(level, c.id).name;
        return c.type === 'extract' ? (name + '可以抽离') : (name + '可以转动');
      }).join('，') + '。';
    } else {
      fact = mover.name + '的缺口会到' + dirName(gapOf(mover, sim.rots[mover.id])) + '。';
    }
    return {
      kind: 'rot',
      ringId: ops[0].id,
      dir: ops[0].dir,
      steps: n,
      claims: claims,
      current: mover.name + '的卡扣现在在' + dirName(gapOf(mover, state.rots[ops[0].id])) + '。',
      next: '若把' + mover.name + dirWord + '转 ' + n + ' 格，' + fact
    };
  }

  function verifyNote(level, state, note) {
    if (!note || note.kind === 'err' || note.kind === 'none') throw new Error('剖面镜没有给出可用观察：' + level.id);
    if (note.kind === 'done') return;
    if (note.kind === 'out') {
      if (!inspectExtract(level, state, note.id).ok) throw new Error('剖面镜把不能抽的环说成可以抽：' + level.id);
      if (note.next.indexOf(byId(level, note.id).name) < 0) throw new Error('剖面镜文案没有点名：' + level.id);
      return;
    }
    var sim = cloneState(state);
    for (var i = 0; i < note.steps; i++) {
      var turned = tryRotate(level, sim, note.ringId, note.dir);
      if (!turned.ok) throw new Error('剖面镜预告的转动并不合法：' + level.id);
      sim = turned.state;
    }
    note.claims.forEach(function (c) {
      if (note.next.indexOf(byId(level, c.id).name) < 0) throw new Error('剖面镜文案和结论不一致：' + level.id);
      if (c.type === 'extract' && !inspectExtract(level, sim, c.id).ok) throw new Error('剖面镜抽离结论不成立：' + level.id);
      if (c.type === 'turn' && !canTurn(level, sim, c.id)) throw new Error('剖面镜转动结论不成立：' + level.id);
    });
  }

  function prepare() {
    LEVELS.forEach(function (lv) {
      var ops = solve(lv);
      if (!ops || !replay(lv, ops)) throw new Error('关卡 ' + lv.id + ' 没有合法拆法');
      lv._ops = ops;
      lv._turns = ops.filter(function (op) { return op.op === 'rot'; }).length;
      var note = buildLens(lv, makeState(lv));
      verifyNote(lv, makeState(lv), note);
    });
  }

  var ROOTS = [
    [73.42, 73.42, 110, 110, 98, 98, 73.42, 73.42],
    [73.42, 87.31, 98, 110, 73.42, 87.31, 98, 110],
    [61.74, 61.74, 82.41, 82.41, 110, 98, 73.42, 73.42],
    [73.42, 110, 98, 73.42, 82.41, 98, 110, 73.42]
  ];
  var DOR = [293.66, 329.63, 369.99, 440, 493.88, 587.33, 659.25, 739.99];
  var MIN = [246.94, 293.66, 329.63, 369.99, 440, 493.88, 587.33, 659.25];
  var PAT = [0, 2, 4, 7, 4, 2, 3, 1];
  var noiseMap = typeof WeakMap === 'function' ? new WeakMap() : null;

  function tone(ctx, dest, freq, time, dur, peak, type) {
    var o = ctx.createOscillator();
    var g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, time);
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), time + Math.min(0.03, dur * 0.35));
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    o.connect(g);
    g.connect(dest);
    o.start(time);
    o.stop(time + dur + 0.03);
  }

  function hat(ctx, dest, time, peak) {
    var buf = noiseMap && noiseMap.get(ctx);
    if (!buf) {
      buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.2), ctx.sampleRate);
      var data = buf.getChannelData(0);
      for (var i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      if (noiseMap) noiseMap.set(ctx, buf);
    }
    var src = ctx.createBufferSource();
    src.buffer = buf;
    var filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(6200, time);
    var g = ctx.createGain();
    g.gain.setValueAtTime(Math.max(peak, 0.0002), time);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.045);
    src.connect(filter);
    filter.connect(g);
    g.connect(dest);
    src.start(time);
    src.stop(time + 0.05);
  }

  function playStep(ctx, dest, step, time) {
    var phrase = Math.floor(step / 128) % 4;
    var bar = Math.floor(step / 16) % 8;
    var beat = step % 16;
    var scale = phrase === 2 ? MIN : DOR;
    var root = ROOTS[phrase][bar];
    if (beat === 0) tone(ctx, dest, root, time, 0.34, phrase === 2 ? 0.09 : 0.11, 'sine');
    if (beat === 8) tone(ctx, dest, root * 1.5, time, 0.22, 0.06, 'triangle');
    if (phrase === 3 && beat === 12) tone(ctx, dest, root * 2, time, 0.16, 0.05, 'sine');
    var arpOn = phrase === 2 ? beat % 4 === 0 : true;
    if (arpOn) {
      var idx = PAT[step % 8] % scale.length;
      var oct = phrase === 1 && bar % 2 === 0 ? 2 : 1;
      tone(ctx, dest, scale[idx] * oct, time, phrase === 2 ? 0.2 : 0.11, phrase === 2 ? 0.03 : 0.042, phrase === 2 ? 'triangle' : 'sine');
    }
    if ((phrase === 1 || phrase === 3) && beat % 4 === 0) {
      var m = PAT[(step + 3) % 8] % scale.length;
      tone(ctx, dest, scale[m] * (phrase === 3 ? 1 : 0.5), time, 0.32, 0.028, 'sine');
    }
    if (beat % 4 === 2 && phrase !== 2) hat(ctx, dest, time, phrase === 3 ? 0.03 : 0.016);
    if (beat === 0 && bar % 2 === 0) {
      var absBar = Math.floor(step / 16);
      if (absBar <= 30) {
        tone(ctx, dest, root * 2, time, MUSIC_STEP * 30, phrase === 2 ? 0.02 : 0.026, 'sine');
        tone(ctx, dest, root * 3, time, MUSIC_STEP * 30, 0.012, 'triangle');
      }
    }
  }

  var api = {
    SAVE_KEY: SAVE_KEY,
    LEVELS: LEVELS,
    CHAPTERS: CHAPTERS,
    prepare: prepare,
    solve: solve,
    replay: replay,
    buildLens: buildLens,
    verifyNote: verifyNote,
    inspectExtract: inspectExtract,
    inspectRotate: inspectRotate,
    tryRotate: tryRotate,
    tryExtract: tryExtract,
    makeState: makeState,
    isWon: isWon,
    byId: byId,
    dirName: dirName,
    musicSeconds: MUSIC_LOOP * MUSIC_STEP,
    playStep: playStep
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;

  function runNodeTests() {
    prepare();
    var bad = 0;
    LEVELS.forEach(function (lv) {
      console.log('L' + lv.id + ' turns=' + lv._turns + ' ops=' + lv._ops.length);
      var seen = new Map();
      var q = [makeState(lv)];
      seen.set(keyOf(lv, q[0]), q[0]);
      while (q.length) {
        var s = q.shift();
        lv.rings.forEach(function (ring) {
          if (s.out[ring.id]) return;
          [1, -1].forEach(function (dir) {
            var n = tryRotate(lv, s, ring.id, dir);
            if (!n.ok) return;
            var k = keyOf(lv, n.state);
            if (!seen.has(k)) { seen.set(k, n.state); q.push(n.state); }
          });
          var ex = tryExtract(lv, s, ring.id);
          if (!ex.ok) return;
          var ek = keyOf(lv, ex.state);
          if (!seen.has(ek)) { seen.set(ek, ex.state); q.push(ex.state); }
        });
      }
      seen.forEach(function (s) {
        if (isWon(lv, s)) return;
        if (!solve(lv, s)) {
          bad++;
          console.log('trap', lv.id, keyOf(lv, s));
        }
      });
      var snap = JSON.stringify(makeState(lv));
      var note = buildLens(lv, makeState(lv));
      if (JSON.stringify(makeState(lv)) !== snap) bad++;
      verifyNote(lv, makeState(lv), note);
    });
    var l1 = inspectExtract(LEVELS[0], makeState(LEVELS[0]), 'inner');
    if (l1.ok || l1.text.indexOf('外环') < 0) {
      console.log('L1 blocker text', l1.text);
      bad++;
    }
    if (bad) {
      console.error('self-check failed', bad);
      process.exit(1);
    }
    console.log('levels ok, music seconds', api.musicSeconds.toFixed(2));
  }

  if (typeof window === 'undefined') {
    if (typeof require !== 'undefined' && require.main === module) runNodeTests();
    return;
  }

  var save = null;
  var session = {};
  var canvas, ctx2d;
  var view = { w: 0, h: 0, R: 0, cx: 0, cy: 0 };
  var pointers = new Map();
  var drag = null;
  var pinch = null;
  var rulesReturn = 'home';
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var Music = { ctx: null, musicGain: null, sfxGain: null, timer: 0, step: 0, nextTime: 0, started: false };

  function $(id) { return document.getElementById(id); }
  function levelById(id) { return LEVELS[id - 1]; }
  function currentLevel() { return levelById(session.levelId); }
  function chapterById(id) {
    for (var i = 0; i < CHAPTERS.length; i++) if (CHAPTERS[i].id === id) return CHAPTERS[i];
    return CHAPTERS[0];
  }
  function chapterOf(levelId) {
    for (var i = 0; i < CHAPTERS.length; i++) {
      if (CHAPTERS[i].levels.indexOf(levelId) >= 0) return CHAPTERS[i];
    }
    return CHAPTERS[0];
  }
  function live() { return { rots: session.rots, out: session.out }; }
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
  function slotAngle(slot) { return -Math.PI / 2 + (slot / 8) * Math.PI * 2; }

  function defaultSave() {
    return {
      v: 1, music: true, sfx: true, seenCover: false, screen: 'cover',
      cleared: {}, coach: {}, prefs: { gap: true, handles: true, view: 'front', zoom: 1 }, resume: null
    };
  }
  function loadSave() {
    try {
      var raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return defaultSave();
      var d = JSON.parse(raw);
      if (!d || typeof d !== 'object' || d.v !== 1) return defaultSave();
      var base = defaultSave();
      base.music = d.music !== false;
      base.sfx = d.sfx !== false;
      base.seenCover = !!d.seenCover;
      base.screen = d.screen === 'play' || d.screen === 'win' || d.screen === 'home' || d.screen === 'cover' ? d.screen : 'home';
      base.cleared = d.cleared && typeof d.cleared === 'object' ? d.cleared : {};
      base.coach = d.coach && typeof d.coach === 'object' ? d.coach : {};
      if (d.prefs && typeof d.prefs === 'object') {
        if (typeof d.prefs.gap === 'boolean') base.prefs.gap = d.prefs.gap;
        if (typeof d.prefs.handles === 'boolean') base.prefs.handles = d.prefs.handles;
        if (d.prefs.view === 'section' || d.prefs.view === 'front') base.prefs.view = d.prefs.view;
        if (typeof d.prefs.zoom === 'number') base.prefs.zoom = d.prefs.zoom;
      }
      if (d.resume && typeof d.resume === 'object') base.resume = d.resume;
      return base;
    } catch (err) {
      return defaultSave();
    }
  }
  function persist() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (err) { /* quota */ }
  }

  function capture() {
    return {
      levelId: session.levelId,
      rots: Object.assign({}, session.rots),
      out: Object.assign({}, session.out),
      turns: session.turns,
      lensLeft: session.lensLeft,
      lensNote: session.lensNote,
      history: JSON.parse(JSON.stringify(session.history || [])),
      order: (session.order || []).slice(),
      selected: session.selected,
      gap: session.gap,
      handles: session.handles,
      view: session.view,
      zoom: session.zoom,
      tray: !!session.tray,
      won: !!session.won
    };
  }
  function restoreResume(data) {
    if (!data || !levelById(data.levelId)) return false;
    var level = levelById(data.levelId);
    var rots = {}, out = {};
    for (var i = 0; i < level.rings.length; i++) {
      var ring = level.rings[i];
      var rv = data.rots && data.rots[ring.id];
      var ov = data.out && data.out[ring.id];
      if (typeof rv !== 'number' || rv < 0 || rv > 7) return false;
      rots[ring.id] = rv;
      out[ring.id] = !!ov;
    }
    session.levelId = data.levelId;
    session.rots = rots;
    session.out = out;
    session.turns = typeof data.turns === 'number' ? data.turns : 0;
    session.lensLeft = data.lensLeft === 0 ? 0 : 1;
    session.lensNote = data.lensNote && data.lensNote.current ? data.lensNote : null;
    session.history = Array.isArray(data.history) ? data.history : [];
    session.order = Array.isArray(data.order) ? data.order.filter(function (id) { return !!byId(level, id); }) : [];
    session.selected = byId(level, data.selected) ? data.selected : 'inner';
    session.gap = data.gap !== false;
    session.handles = data.handles !== false;
    session.view = data.view === 'section' ? 'section' : 'front';
    session.zoom = clamp(typeof data.zoom === 'number' ? data.zoom : 1, 0.85, 1.45);
    session.tray = !!data.tray;
    session.won = !!data.won;
    session.restartArm = false;
    session.msg = '';
    session.msgUntil = 0;
    session.fx = null;
    return true;
  }

  function saveProgress() {
    if (!session.levelId) return;
    save.resume = capture();
    save.screen = session.won ? 'win' : 'play';
    save.prefs.gap = session.gap;
    save.prefs.handles = session.handles;
    save.prefs.view = session.view;
    save.prefs.zoom = session.zoom;
    persist();
  }

  function pushHistory() {
    session.history.push({
      rots: Object.assign({}, session.rots),
      out: Object.assign({}, session.out),
      turns: session.turns,
      order: session.order.slice()
    });
    if (session.history.length > 60) session.history.splice(1, 1);
  }

  function setMsg(text, ms) {
    session.msg = text;
    session.msgUntil = performance.now() + (ms || 2400);
    var el = $('status-line');
    if (el) el.textContent = text;
  }

  function maybeAdvanceCoach() {
    var id = session.levelId;
    if (save.coach[id]) return;
    if (id === 1) {
      if (session.order.length > 0) save.coach[1] = 1;
    } else if (session.turns > 0 || session.order.length > 0) {
      save.coach[id] = 1;
    }
  }

  function afterAction() {
    maybeAdvanceCoach();
    saveProgress();
    renderUI();
  }

  function rotate(id, dir) {
    if (!session.levelId || session.won || anyModal()) return false;
    var level = currentLevel();
    var res = tryRotate(level, live(), id, dir);
    if (!res.ok) {
      setMsg(res.text);
      sfx('deny');
      session.flashId = res.byId || id;
      session.flashUntil = performance.now() + 700;
      renderUI();
      return false;
    }
    pushHistory();
    session.rots = res.state.rots;
    session.turns += 1;
    setMsg(res.text, 1200);
    sfx('tick');
    afterAction();
    return true;
  }

  function extract(id) {
    if (!session.levelId || session.won || anyModal()) return false;
    var level = currentLevel();
    var res = tryExtract(level, live(), id);
    if (!res.ok) {
      session.selected = id;
      setMsg(res.text);
      sfx('deny');
      session.flashId = res.byId || id;
      session.flashUntil = performance.now() + 800;
      renderUI();
      return false;
    }
    pushHistory();
    session.rots = res.state.rots;
    session.out = res.state.out;
    session.order = session.order.concat([id]);
    session.selected = id;
    var ang = slotAngle(byId(level, id).exit);
    session.fx = { id: id, t0: performance.now(), ang: ang };
    setMsg(byId(level, id).name + '已抽离。');
    sfx('extract');
    if (isWon(level, live())) onWin();
    else afterAction();
    return true;
  }

  function undo() {
    if (!session.levelId || anyModal()) return;
    if (!session.history.length) {
      setMsg('没有可以撤销的步骤。');
      sfx('deny');
      return;
    }
    var prev = session.history.pop();
    session.rots = prev.rots;
    session.out = prev.out;
    session.turns = prev.turns;
    session.order = prev.order.slice();
    session.won = false;
    session.fx = null;
    $('modal-result').hidden = true;
    save.screen = 'play';
    setMsg('已撤销上一步。');
    sfx('tick');
    saveProgress();
    renderUI();
  }

  function onWin() {
    if (session.won) return;
    session.won = true;
    save.coach[session.levelId] = 1;
    var prev = save.cleared[session.levelId];
    var best = session.turns;
    if (prev && typeof prev.best === 'number') best = Math.min(prev.best, session.turns);
    save.cleared[session.levelId] = { best: best };
    save.screen = 'win';
    save.resume = capture();
    persist();
    sfx('win');
    if (!reduceMotion) burst();
    var token = session.levelId + ':' + session.turns + ':' + session.order.join(',');
    session._winToken = token;
    setTimeout(function () {
      if (session._winToken === token && session.won && save.screen === 'win') openResult();
    }, 560);
    renderUI();
  }

  function beginLevel(id, force) {
    ensureArt();
    var now = Date.now();
    if (!force && session._arm && now - session._arm < 400) return false;
    session._arm = now;
    var level = levelById(id);
    if (!level) return;
    var st = makeState(level);
    session.levelId = id;
    session.rots = st.rots;
    session.out = st.out;
    session.turns = 0;
    session.lensLeft = 1;
    session.lensNote = null;
    session.history = [];
    session.order = [];
    session.selected = 'inner';
    session.won = false;
    session.restartArm = false;
    session.gap = save.prefs.gap !== false;
    session.handles = save.prefs.handles !== false;
    session.view = save.prefs.view === 'section' ? 'section' : 'front';
    session.zoom = clamp(save.prefs.zoom || 1, 0.85, 1.45);
    session.tray = false;
    session.msg = '';
    session.msgUntil = 0;
    session.fx = null;
    session.flashId = null;
    closeModals();
    save.screen = 'play';
    save.seenCover = true;
    save.resume = capture();
    persist();
    show('play');
    renderUI();
    return true;
  }

  function resetLevel() {
    var id = session.levelId;
    if (!beginLevel(id, true)) return;
    setMsg('这一关已重开，其他关的进度还在。');
  }

  function goHome() {
    closeModals();
    if (session.won) save.resume = null;
    else if (session.levelId) save.resume = capture();
    save.screen = 'home';
    save.seenCover = true;
    persist();
    renderHome();
    show('home');
  }

  function isLevelOpen(id) {
    if (id <= 1) return true;
    return !!(save.cleared[id - 1]);
  }
  function nextUncleared() {
    for (var i = 1; i <= 10; i++) if (!save.cleared[i]) return i;
    return 0;
  }

  function show(name) {
    ['cover', 'home', 'chapter', 'play'].forEach(function (s) {
      $('screen-' + s).hidden = s !== name;
    });
  }
  function closeModals() {
    ['modal-lens', 'modal-result', 'modal-pause', 'modal-rules'].forEach(function (id) { $(id).hidden = true; });
  }
  function anyModal() {
    return ['modal-lens', 'modal-result', 'modal-pause', 'modal-rules'].some(function (id) { return !$(id).hidden; });
  }

  function coachText() {
    var id = session.levelId;
    if (!id || save.coach[id] || session.won) return '';
    if (id === 1) {
      var moved = session.rots.outer !== 4;
      if (!moved && session.order.length === 0) return '内环的箭头是灰的。外环的卡扣压在出口上。点外环，把它转开一格。';
      if (session.order.length === 0) return '卡扣已经让开。点内环亮起的箭头，先把内环抽出。';
      return '';
    }
    return currentLevel().tip || '';
  }

  function statusText() {
    if (session.msg && performance.now() < session.msgUntil) return session.msg;
    var level = currentLevel();
    if (!level) return '';
    if (session.won) return '星核已经释放。';
    var ex = inspectExtract(level, live(), session.selected);
    if (ex.ok || ex.type === 'block' || ex.type === 'pin' || ex.type === 'gap') {
      if (ex.type === 'gap') {
        var rot1 = inspectRotate(level, live(), session.selected, 1);
        if (!rot1.ok && rot1.type === 'lock') return rot1.text;
        var rot2 = inspectRotate(level, live(), session.selected, -1);
        if (!rot2.ok && rot2.type === 'lock' && !rot1.ok) return rot2.text;
      }
      if (!(ex.type === 'gap' && ex.ok)) {
        if (ex.type !== 'gap') return ex.text;
      }
    }
    for (var i = 0; i < level.locks.length; i++) {
      var lock = level.locks[i];
      if (lock.by !== session.selected || session.out[lock.target]) continue;
      if (gapOf(byId(level, lock.by), session.rots[lock.by]) !== lock.gap) {
        return byId(level, lock.target).name + '要等' + byId(level, lock.by).name + '的缺口转到' + dirName(lock.gap) + '才能转动。';
      }
    }
    return ex.text;
  }

  function statusLine() {
    var line = statusText();
    if (session.view !== 'section') return line;
    var level = currentLevel();
    if (!level) return line;
    var bits = [];
    level.rings.forEach(function (ring) {
      if (session.out[ring.id]) return;
      bits.push(ring.name + SHORT_DIR[mod(gapOf(ring, session.rots[ring.id]), 8)]);
    });
    if (!bits.length) return line;
    return line + '剖面：' + bits.join('，') + '。';
  }

  function renderUI() {
    var level = currentLevel();
    if (!level) return;
    var ch = chapterOf(level.id);
    $('play-sub').textContent = '第' + ch.id + '章 · ' + ch.name;
    $('play-name').textContent = '第' + level.id + '关 · ' + level.name;
    var done = level.rings.filter(function (r) { return session.out[r.id]; }).length;
    $('chip-out').innerHTML = '<span>已脱锁</span><b>' + done + ' / ' + level.rings.length + '</b>';
    $('chip-turns').innerHTML = '<span>已转动</span><b>' + session.turns + '</b>';
    $('chip-undo').innerHTML = '<span>撤销</span><b>单步</b>';
    $('chip-lens').innerHTML = '<span>剖面镜</span><b>' + session.lensLeft + '</b>';
    var coach = $('coach');
    var tip = coachText();
    coach.hidden = !tip;
    if (tip) $('coach-text').textContent = tip;
    $('tray').hidden = !session.tray;
    renderTray();
    $('btn-gap').classList.toggle('on', !!session.gap);
    $('btn-gap').setAttribute('aria-pressed', session.gap ? 'true' : 'false');
    $('btn-handle').classList.toggle('on', !!session.handles);
    $('btn-handle').setAttribute('aria-pressed', session.handles ? 'true' : 'false');
    $('btn-tray').classList.toggle('on', !!session.tray);
    $('btn-tray').setAttribute('aria-pressed', session.tray ? 'true' : 'false');
    $('btn-view').textContent = session.view === 'section' ? '正视' : '剖面';
    $('btn-view').style.backgroundImage = 'url("assets/ui/' + (session.view === 'section' ? 'view-front.webp' : 'view-section.webp') + '")';
    var selName = byId(level, session.selected).name;
    $('btn-ccw').setAttribute('aria-label', '逆时针转动' + selName);
    $('btn-cw').setAttribute('aria-label', '顺时针转动' + selName);
    $('btn-restart').textContent = session.restartArm ? '确定重开' : '重开本关';
    syncAudioButtons();
    ensureArrows();
    var line = statusLine();
    if ($('status-line').textContent !== line) $('status-line').textContent = line;
  }

  function renderTray() {
    var ul = $('tray-list');
    var level = currentLevel();
    ul.innerHTML = '';
    if (!session.order.length) {
      var empty = document.createElement('li');
      empty.textContent = '这一局还没有环离开星核。';
      ul.appendChild(empty);
      return;
    }
    session.order.forEach(function (id, index) {
      var li = document.createElement('li');
      var pip = document.createElement('i');
      pip.className = 'pip';
      var span = document.createElement('span');
      span.textContent = byId(level, id).name + ' · 第 ' + (index + 1) + ' 个抽离';
      li.appendChild(pip);
      li.appendChild(span);
      ul.appendChild(li);
    });
  }

  function ensureArrows() {
    var level = currentLevel();
    var stage = $('stage');
    level.rings.forEach(function (ring) {
      var b = $('arrow-' + ring.id);
      if (!b) {
        b = document.createElement('button');
        b.type = 'button';
        b.id = 'arrow-' + ring.id;
        b.className = 'exit-arrow';
        b.dataset.ring = ring.id;
        stage.appendChild(b);
        b.addEventListener('click', function () { extract(ring.id); });
      }
      b.textContent = '';
    });
    var handle = $('ring-handle');
    if (!handle) {
      handle = document.createElement('button');
      handle.type = 'button';
      handle.id = 'ring-handle';
      handle.className = 'ring-handle';
      handle.setAttribute('aria-label', '旋转手柄');
      stage.appendChild(handle);
    }
  }

  function renderHome() {
    var btn = $('btn-continue');
    if (save.resume && save.resume.levelId && !save.resume.won) btn.textContent = '继续第' + save.resume.levelId + '关';
    else if (!nextUncleared()) btn.textContent = '再玩第 1 关';
    else btn.textContent = '开始第' + nextUncleared() + '关';
    var list = $('chapter-list');
    list.innerHTML = '';
    CHAPTERS.forEach(function (ch) {
      var open = isLevelOpen(ch.levels[0]);
      var cleared = ch.levels.filter(function (id) { return !!save.cleared[id]; }).length;
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'row-btn';
      b.dataset.chapter = String(ch.id);
      b.disabled = !open;
      var left = document.createElement('span');
      var name = document.createElement('b');
      name.textContent = '第' + ch.id + '章 · ' + ch.name;
      var small = document.createElement('small');
      small.textContent = open ? ch.blurb : '先完成上一章。';
      left.appendChild(name);
      left.appendChild(small);
      var meta = document.createElement('span');
      meta.className = 'meta';
      meta.textContent = cleared + ' / ' + ch.levels.length;
      b.appendChild(left);
      b.appendChild(meta);
      list.appendChild(b);
    });
    syncAudioButtons();
  }

  function openChapter(id) {
    var ch = chapterById(id);
    if (!isLevelOpen(ch.levels[0])) {
      renderHome();
      return;
    }
    session.chapterView = id;
    $('chapter-kicker').textContent = '第' + ch.id + '章';
    $('chapter-sub').textContent = ch.name;
    $('chapter-title').textContent = ch.name;
    $('chapter-blurb').textContent = ch.blurb;
    var journey = $('journey');
    journey.innerHTML = '';
    CHAPTERS.forEach(function (item) {
      var b = document.createElement('button');
      b.type = 'button';
      b.dataset.chapter = String(item.id);
      if (item.id === ch.id) b.className = 'on';
      b.disabled = !isLevelOpen(item.levels[0]);
      var n = document.createElement('div');
      n.className = 'n';
      n.textContent = String(item.id);
      var small = document.createElement('small');
      small.textContent = item.name;
      b.appendChild(n);
      b.appendChild(small);
      journey.appendChild(b);
    });
    var nextId = 0;
    for (var i = 0; i < ch.levels.length; i++) {
      if (isLevelOpen(ch.levels[i]) && !save.cleared[ch.levels[i]]) { nextId = ch.levels[i]; break; }
    }
    if (!nextId) nextId = ch.levels[0];
    $('btn-chapter-start').textContent = save.cleared[nextId] ? '再拆第' + nextId + '关' : '开始第' + nextId + '关';
    $('btn-chapter-start').dataset.level = String(nextId);
    var levels = $('level-list');
    levels.innerHTML = '';
    ch.levels.forEach(function (lid) {
      var lv = levelById(lid);
      var open = isLevelOpen(lid);
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'row-btn';
      b.dataset.level = String(lid);
      b.disabled = !open;
      var left = document.createElement('span');
      var name = document.createElement('b');
      name.textContent = '第' + lid + '关 · ' + lv.name;
      var small = document.createElement('small');
      small.textContent = open ? lv.brief : '先完成上一关。';
      left.appendChild(name);
      left.appendChild(small);
      var meta = document.createElement('span');
      meta.className = 'meta';
      meta.textContent = save.cleared[lid] ? ('最少 ' + save.cleared[lid].best + ' 次') : (open ? '未拆开' : '未开启');
      b.appendChild(left);
      b.appendChild(meta);
      levels.appendChild(b);
    });
    show('chapter');
  }

  function renderCover() {
    var btn = $('btn-enter');
    if (save.resume && save.resume.levelId && (save.screen === 'play' || save.screen === 'win')) btn.textContent = '继续拆锁';
    else btn.textContent = '进入天文台';
  }

  function openResult() {
    var level = currentLevel();
    var ch = chapterOf(level.id);
    var last = ch.levels[ch.levels.length - 1] === level.id;
    var next = level.id < 10 ? level.id + 1 : 0;
    $('result-title').textContent = last ? '本章完成' : '本关完成';
    $('result-sub').textContent = '三只环都已脱锁，星核释放。';
    $('stat-rings').textContent = level.rings.length + ' / ' + level.rings.length;
    $('stat-turns').textContent = String(session.turns);
    var best = save.cleared[level.id] ? save.cleared[level.id].best : session.turns;
    $('stat-extra').textContent = '这一关不限转动次数。你最少用过 ' + best + ' 次转动。';
    var btn = $('btn-next');
    if (!next) btn.hidden = true;
    else {
      btn.hidden = false;
      btn.dataset.level = String(next);
      btn.textContent = chapterOf(next).id !== ch.id ? '进入下一章' : '进入下一关';
    }
    var card = $('result-unlock');
    if (last && next) {
      var nch = chapterOf(next);
      card.hidden = false;
      $('unlock-badge').textContent = String(nch.id);
      $('unlock-name').textContent = '第' + nch.id + '章 · ' + nch.name;
      $('unlock-blurb').textContent = nch.blurb;
    } else card.hidden = true;
    $('modal-result').hidden = false;
  }

  function renderLens() {
    var box = $('lens-read');
    var use = $('btn-lens-use');
    var note = session.lensNote;
    if (session.lensLeft > 0 && !note) {
      $('lens-lead').textContent = '透视卡扣所在的刻度。确认之后才会消耗这一次，环的角度保持不变。';
      box.innerHTML = '';
      use.disabled = false;
      use.textContent = '查看剖面';
      return;
    }
    if (!note) {
      $('lens-lead').textContent = '这一关的剖面镜已经用完。重开本关可以再看一次。';
      box.innerHTML = '';
      use.disabled = true;
      use.textContent = '已经用完';
      return;
    }
    $('lens-lead').textContent = '这一关的剖面镜已经用完。下面是刚才确认过的观察，环并没有因此转动。';
    box.innerHTML = '';
    var wrap = document.createElement('div');
    wrap.className = 'compare';
    var a = document.createElement('div');
    var ah = document.createElement('b');
    ah.textContent = '当前';
    var ap = document.createElement('span');
    ap.textContent = note.current;
    a.appendChild(ah);
    a.appendChild(ap);
    var b = document.createElement('div');
    b.className = 'after';
    var bh = document.createElement('b');
    bh.textContent = note.kind === 'out' ? '可以抽离' : '若按观察去转';
    var bp = document.createElement('span');
    bp.textContent = note.next;
    b.appendChild(bh);
    b.appendChild(bp);
    wrap.appendChild(a);
    wrap.appendChild(b);
    box.appendChild(wrap);
    use.disabled = true;
    use.textContent = '已经用完';
  }

  function openLens() {
    if (!session.levelId || session.won) return;
    var img = $('lens-img');
    if (!img.getAttribute('src')) {
      img.onerror = function () {
        if (img.getAttribute('data-fell')) return;
        img.setAttribute('data-fell', '1');
        img.src = 'assets/props/loupe.png';
      };
      img.src = 'assets/props/loupe.webp';
    }
    renderLens();
    $('modal-lens').hidden = false;
  }
  function confirmLens() {
    if (session._lensLock) return;
    session._lensLock = true;
    try {
      if (session.lensLeft <= 0 || session.lensNote) {
        renderLens();
        setMsg('这一关的剖面镜已经用完。重开本关可以再看一次。');
        return;
      }
      var level = currentLevel();
      var before = JSON.stringify(live());
      var note = buildLens(level, live());
      if (JSON.stringify(live()) !== before) return;
      try { verifyNote(level, live(), note); } catch (err) { note = { kind: 'err', current: '这次观察没有采用。', next: '环的角度保持原样。', claims: [] }; }
      session.lensLeft = 0;
      session.lensNote = note;
      saveProgress();
      renderLens();
      renderUI();
    } finally {
      session._lensLock = false;
    }
  }

  function openRules(from) {
    rulesReturn = from;
    $('modal-pause').hidden = true;
    $('modal-rules').hidden = false;
  }
  function closeRules() {
    $('modal-rules').hidden = true;
    if (rulesReturn === 'pause') $('modal-pause').hidden = false;
  }
  function openPause() {
    if ($('screen-play').hidden) return;
    session.restartArm = false;
    $('btn-restart').textContent = '重开本关';
    syncAudioButtons();
    $('modal-pause').hidden = false;
  }

  function syncAudioButtons() {
    document.querySelectorAll('[data-music]').forEach(function (b) {
      b.textContent = save.music ? '乐' : '静';
      b.classList.toggle('off', !save.music);
      b.setAttribute('aria-label', save.music ? '关闭音乐' : '打开音乐');
    });
    var pm = $('btn-pause-music');
    var ps = $('btn-pause-sfx');
    if (pm) pm.textContent = '音乐：' + (save.music ? '开' : '关');
    if (ps) ps.textContent = '音效：' + (save.sfx ? '开' : '关');
  }

  function armAudio(startIfWanted) {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try {
      if (!Music.ctx) {
        var ctx = new AC();
        var musicGain = ctx.createGain();
        musicGain.gain.value = 0.9;
        musicGain.connect(ctx.destination);
        var sfxGain = ctx.createGain();
        sfxGain.gain.value = 0.8;
        sfxGain.connect(ctx.destination);
        Music.ctx = ctx;
        Music.musicGain = musicGain;
        Music.sfxGain = sfxGain;
      }
      if (Music.ctx.state === 'suspended') Music.ctx.resume();
      Music.started = true;
      if (startIfWanted && save.music) startScheduler();
      return true;
    } catch (err) {
      return false;
    }
  }
  function startScheduler() {
    if (!Music.ctx || !save.music) return;
    if (Music.timer) return;
    if (Music.nextTime < Music.ctx.currentTime) Music.nextTime = Music.ctx.currentTime + 0.06;
    Music.timer = setInterval(scheduleMusic, 90);
    scheduleMusic();
  }
  function stopScheduler() {
    if (Music.timer) clearInterval(Music.timer);
    Music.timer = 0;
  }
  function scheduleMusic() {
    if (!Music.ctx || !save.music) return;
    var horizon = Music.ctx.currentTime + 0.3;
    var guard = 0;
    while (Music.nextTime < horizon && guard < 8) {
      playStep(Music.ctx, Music.musicGain, Music.step, Music.nextTime);
      Music.step = (Music.step + 1) % MUSIC_LOOP;
      Music.nextTime += MUSIC_STEP;
      guard++;
    }
  }
  function sfx(kind) {
    if (!save.sfx || !Music.ctx) return;
    var t = Music.ctx.currentTime;
    var dest = Music.sfxGain;
    if (kind === 'tick') tone(Music.ctx, dest, 740, t, 0.045, 0.05, 'sine');
    else if (kind === 'deny') tone(Music.ctx, dest, 168, t, 0.12, 0.06, 'triangle');
    else if (kind === 'extract') {
      tone(Music.ctx, dest, 520, t, 0.1, 0.05, 'sine');
      tone(Music.ctx, dest, 784, t + 0.06, 0.14, 0.045, 'sine');
    } else if (kind === 'win') {
      [523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) {
        tone(Music.ctx, dest, f, t + i * 0.07, 0.18, 0.05, 'sine');
      });
    }
  }
  function onVis() {
    if (document.hidden) {
      Music.pausedByHide = !!Music.timer || (Music.ctx && Music.ctx.state === 'running');
      stopScheduler();
      if (Music.ctx && Music.ctx.state === 'running') Music.ctx.suspend();
    } else if (Music.pausedByHide && Music.started) {
      Music.pausedByHide = false;
      if (Music.ctx) {
        Music.ctx.resume().then(function () {
          Music.nextTime = Music.ctx.currentTime + 0.06;
          if (save.music) startScheduler();
        }).catch(function () {});
      }
    }
  }

  function burst() {
    session.sparks = [];
    for (var i = 0; i < 22; i++) {
      session.sparks.push({
        a: Math.random() * Math.PI * 2,
        v: 30 + Math.random() * 90,
        life: 700 + Math.random() * 400,
        born: performance.now(),
        color: i % 2 ? '#f4ddb0' : '#8fd8cc'
      });
    }
  }

  var RING_SPEC = {
    outer: { body: 'rings/bronze-outer', glow: 'rings/glow-outer', ghost: 'rings/out-outer', cut: 'rings/section-outer', rOut: 492, rIn: 408 },
    mid: { body: 'rings/peacock-mid', glow: 'rings/glow-mid', ghost: 'rings/out-mid', cut: 'rings/section-mid', rOut: 384, rIn: 308 },
    inner: { body: 'rings/darksteel-inner', glow: 'rings/glow-inner', ghost: 'rings/out-inner', cut: 'rings/section-inner', rOut: 284, rIn: 216 }
  };
  var PICS = {};

  function loadPic(key, path) {
    var img = new Image();
    img.onload = function () { PICS[key] = img; };
    img.onerror = function () {
      if (img.getAttribute('data-fell')) return;
      img.setAttribute('data-fell', '1');
      img.src = path.replace('.webp', '.png');
    };
    img.src = path;
  }

  var artReady = false;
  function ensureArt() {
    if (artReady) return;
    artReady = true;
    loadArt();
  }

  function loadArt() {
    Object.keys(RING_SPEC).forEach(function (id) {
      var spec = RING_SPEC[id];
      ['body', 'glow', 'ghost', 'cut'].forEach(function (part) {
        loadPic(id + '-' + part, 'assets/' + spec[part] + '.webp');
      });
    });
    loadPic('ready', 'assets/rings/ready.webp');
    loadPic('core', 'assets/props/core-locked.webp');
    loadPic('coreFree', 'assets/props/core-released.webp');
    loadPic('handle', 'assets/ui/handle.webp');
    loadPic('latch', 'assets/ui/latch.webp');
    for (var i = 1; i <= 8; i++) loadPic('fx' + i, 'assets/fx/release-' + i + '.webp');
  }

  function layout() {
    var w = canvas.clientWidth;
    var h = canvas.clientHeight;
    view.w = w;
    view.h = h;
    var portrait = h >= w;
    var well = portrait ? { cx: 0.493, cy: 0.535, r: 0.418 } : { cx: 0.5, cy: 0.515, r: 0.402 };
    view.cx = w * well.cx;
    view.cy = h * well.cy;
    var wellR = Math.min(w, h) * well.r;
    var reserve = portrait ? Math.max(118, h * 0.16) : Math.max(86, h * 0.22);
    var down = (h - reserve) - view.cy;
    var up = view.cy - (portrait ? h * 0.27 : h * 0.12);
    var side = Math.min(view.cx - w * (portrait ? 0.06 : 0.26), w * (portrait ? 0.94 : 0.74) - view.cx);
    var fit = Math.min(down, up, side) - 34;
    view.R = Math.max(36, Math.min(wellR * 0.78, fit));
    view.s = view.R / 492;
  }
  function fitCanvas() {
    if (!canvas) return false;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var w = canvas.clientWidth;
    var h = canvas.clientHeight;
    if (w < 2 || h < 2) return false;
    var pw = Math.round(w * dpr), ph = Math.round(h * dpr);
    if (canvas.width !== pw || canvas.height !== ph) {
      canvas.width = pw;
      canvas.height = ph;
    }
    layout();
    session.zoom = clamp(session.zoom, 0.85, zoomLimit());
    ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
    return true;
  }
  function zoomLimit() {
    if (!view.w || !view.R) return 1.2;
    var room = Math.min(view.cx - 12, view.w - view.cx - 12, view.cy - 36, view.h - view.cy - 12);
    return clamp((room - 4) / view.R, 1, 1.22);
  }
  function applyZoom(z) {
    session.zoom = clamp(z, 0.85, zoomLimit());
    save.prefs.zoom = session.zoom;
  }
  function toWorld(px, py) {
    return {
      x: view.cx + (px - view.cx) / session.zoom,
      y: view.cy + (py - view.cy) / session.zoom
    };
  }
  function toScreen(wx, wy) {
    return {
      x: view.cx + (wx - view.cx) * session.zoom,
      y: view.cy + (wy - view.cy) * session.zoom
    };
  }

  function blitRing(img, cx, cy, slots, alpha) {
    if (!img || !img.complete || !img.naturalWidth) return false;
    ctx2d.save();
    ctx2d.translate(cx, cy);
    ctx2d.rotate(slots * Math.PI / 4);
    ctx2d.globalAlpha = alpha == null ? 1 : alpha;
    ctx2d.drawImage(img, -512 * view.s, -512 * view.s, 1024 * view.s, 1024 * view.s);
    ctx2d.restore();
    return true;
  }

  function draw(now) {
    if (!fitCanvas()) return;
    var level = currentLevel();
    if (!level) return;
    ctx2d.clearRect(0, 0, view.w, view.h);
    ctx2d.save();
    ctx2d.translate(view.cx, view.cy);
    ctx2d.scale(session.zoom, session.zoom);
    ctx2d.translate(-view.cx, -view.cy);
    drawMarks();
    level.rings.forEach(function (ring) { drawOneRing(level, ring, now); });
    var outer0 = byId(level, 'outer');
    if (level.id === 1 && !save.coach[1] && outer0 && session.rots.outer === outer0.rot && !session.out.outer) {
      ctx2d.save();
      ctx2d.translate(view.cx, view.cy);
      ctx2d.strokeStyle = 'rgba(236, 196, 98, 0.9)';
      ctx2d.setLineDash([7, 6]);
      ctx2d.lineWidth = 2;
      ctx2d.beginPath();
      ctx2d.arc(0, 0, view.R + 8, 0, Math.PI * 2);
      ctx2d.stroke();
      ctx2d.restore();
    }
    drawLatch(level);
    drawHandleArt(level);
    drawCore(now);
    ctx2d.restore();
    placeControls(level);
  }

  function drawMarks() {
    ctx2d.save();
    ctx2d.fillStyle = '#f6f1e6';
    ctx2d.font = '13px "WenQuanYi Micro Hei","PingFang SC",sans-serif';
    ctx2d.textAlign = 'center';
    ctx2d.textBaseline = 'middle';
    [['上', 0], ['右', 2], ['下', 4], ['左', 6]].forEach(function (pair) {
      var a = slotAngle(pair[1]);
      ctx2d.fillText(pair[0], view.cx + Math.cos(a) * (view.R + 16), view.cy + Math.sin(a) * (view.R + 16));
    });
    ctx2d.restore();
  }

  function drawOneRing(level, ring, now) {
    var spec = RING_SPEC[ring.id];
    if (!spec) return;
    var rot = session.rots[ring.id];
    var slots = gapOf(ring, rot);
    var flying = session.fx && session.fx.id === ring.id;
    var k = 0;
    var flyAng = 0;
    if (flying) {
      flyAng = session.fx.ang;
      k = Math.min(1, (now - session.fx.t0) / 460);
      if (k >= 1) {
        session.fx = null;
        flying = false;
      }
    }
    if (session.out[ring.id] && !flying) return;
    var cx = view.cx;
    var cy = view.cy;
    if (flying) {
      cx += Math.cos(flyAng) * view.R * 0.72 * k;
      cy += Math.sin(flyAng) * view.R * 0.72 * k;
    }
    var alpha = flying ? 1 - k * 0.35 : 1;
    var legal = inspectExtract(level, live(), ring.id).ok;
    if (legal && !flying) blitRing(PICS.ready, view.cx, view.cy, 0, 0.95);
    var body = session.view === 'section' ? PICS[ring.id + '-cut'] : (flying ? PICS[ring.id + '-ghost'] : PICS[ring.id + '-body']);
    if (!blitRing(body, cx, cy, slots, alpha)) {
      ctx2d.save();
      ctx2d.translate(cx, cy);
      ctx2d.strokeStyle = '#b88440';
      ctx2d.lineWidth = Math.max(10, (spec.rOut - spec.rIn) * view.s * 0.7);
      ctx2d.beginPath();
      var a0 = slotAngle(slots);
      ctx2d.arc(0, 0, ((spec.rOut + spec.rIn) / 2) * view.s, a0 + 0.32, a0 + Math.PI * 2 - 0.32);
      ctx2d.stroke();
      ctx2d.restore();
    }
    if (session.gap && !flying) blitRing(PICS[ring.id + '-glow'], cx, cy, slots, 0.95);
    if (session.selected === ring.id && !flying) {
      ctx2d.save();
      ctx2d.translate(cx, cy);
      ctx2d.strokeStyle = 'rgba(236, 196, 98, 0.95)';
      ctx2d.lineWidth = 2;
      ctx2d.beginPath();
      ctx2d.arc(0, 0, spec.rOut * view.s + 3, 0, Math.PI * 2);
      ctx2d.stroke();
      ctx2d.restore();
    }
    if (session.flashId === ring.id && performance.now() < session.flashUntil) {
      ctx2d.save();
      ctx2d.translate(cx, cy);
      ctx2d.strokeStyle = '#e59a8c';
      ctx2d.lineWidth = 4;
      ctx2d.beginPath();
      ctx2d.arc(0, 0, spec.rOut * view.s + 2, slotAngle(slots) - 0.32, slotAngle(slots) + 0.32);
      ctx2d.stroke();
      ctx2d.restore();
    }
  }

  function drawLatch(level) {
    if (!PICS.latch || !session.selected) return;
    var ex = inspectExtract(level, live(), session.selected);
    if (!ex || ex.type !== 'block' || !ex.byId) return;
    var by = byId(level, ex.byId);
    if (!by || session.out[by.id]) return;
    var spec = RING_SPEC[by.id];
    var ang = slotAngle(gapOf(by, session.rots[by.id]));
    var rad = ((spec.rOut + spec.rIn) / 2) * view.s;
    var sc = Math.max(28, view.R * 0.16) / 512;
    ctx2d.save();
    ctx2d.translate(view.cx + Math.cos(ang) * rad, view.cy + Math.sin(ang) * rad);
    ctx2d.rotate(ang + Math.PI / 2);
    ctx2d.drawImage(PICS.latch, -256 * sc, -256 * sc, 512 * sc, 512 * sc);
    ctx2d.restore();
  }

  function drawHandleArt(level) {
    if (!session.handles || !PICS.handle) return;
    var ring = byId(level, session.selected);
    if (!ring || session.out[ring.id]) return;
    var spec = RING_SPEC[ring.id];
    var hang = slotAngle(gapOf(ring, session.rots[ring.id])) + 2.15;
    var x = view.cx + Math.cos(hang) * spec.rOut * view.s;
    var y = view.cy + Math.sin(hang) * spec.rOut * view.s;
    var sc = Math.max(54, view.R * 0.22) / 512;
    ctx2d.save();
    ctx2d.translate(x, y);
    ctx2d.rotate(hang + Math.PI / 2);
    ctx2d.drawImage(PICS.handle, -256 * sc, -471 * sc, 512 * sc, 512 * sc);
    ctx2d.restore();
  }

  function drawCore(now) {
    var locked = PICS.core;
    var freed = PICS.coreFree;
    var dia = 216 * view.s * 2 * 0.62;
    var img = session.won && freed ? freed : locked;
    if (img) {
      var grow = session.won ? 1.08 : 1;
      ctx2d.save();
      ctx2d.globalAlpha = 1;
      ctx2d.drawImage(img, view.cx - dia * grow / 2, view.cy - dia * grow / 2, dia * grow, dia * grow);
      ctx2d.restore();
    } else {
      ctx2d.save();
      ctx2d.translate(view.cx, view.cy);
      ctx2d.fillStyle = '#d7f4ff';
      ctx2d.beginPath();
      ctx2d.arc(0, 0, dia * 0.28, 0, Math.PI * 2);
      ctx2d.fill();
      ctx2d.restore();
    }
    if (session.won) {
      var frame = 1 + (Math.floor(now / (1000 / 12)) % 8);
      var fx = PICS['fx' + frame];
      if (fx) {
        var box = dia * 2.4;
        ctx2d.drawImage(fx, view.cx - box / 2, view.cy - box / 2, box, box);
      }
    }
  }

  function placeControls(level) {
    var groups = {};
    level.rings.forEach(function (ring) {
      var btn = $('arrow-' + ring.id);
      if (!btn) return;
      if (session.out[ring.id]) {
        btn.hidden = true;
        return;
      }
      btn.hidden = false;
      var ex = inspectExtract(level, live(), ring.id);
      btn.disabled = !ex.ok;
      btn.classList.toggle('ready', !!ex.ok);
      btn.setAttribute('aria-label', ex.ok ? ('抽出' + ring.name) : (ring.name + '的出口还不能用。' + ex.text));
      var key = String(ring.exit);
      if (!groups[key]) groups[key] = [];
      groups[key].push(ring);
    });
    var actions = document.querySelector('#screen-play .action-row');
    var maxY = view.h - 30;
    if (actions && canvas) {
      var ar = actions.getBoundingClientRect();
      var sr = canvas.getBoundingClientRect();
      if (ar.height > 2 && (ar.top - sr.top) > view.h * 0.55) maxY = Math.min(maxY, ar.top - sr.top - 26);
    }
    var placed = [];
    Object.keys(groups).forEach(function (key) {
      var rings = groups[key].sort(function (a, b) { return b.scale - a.scale; });
      var base = slotAngle(Number(key));
      var n = rings.length;
      var dirx = Math.cos(base);
      var diry = Math.sin(base);
      var px = -diry;
      var py = dirx;
      rings.forEach(function (ring, index) {
        var along = (index - (n - 1) / 2) * 76;
        var rad = view.R + 44;
        var s = toScreen(view.cx + dirx * rad + px * along, view.cy + diry * rad + py * along);
        placed.push({ el: $('arrow-' + ring.id), x: s.x, y: s.y });
      });
    });
    function park(p) {
      p.x = clamp(p.x, 28, view.w - 28);
      p.y = clamp(p.y, 28, maxY);
      if (p.x < 64 && p.y < 64) p.x = 64;
      if (p.x > view.w - 64 && p.y < 112) p.y = 112;
      var dx = p.x - view.cx;
      var dy = p.y - view.cy;
      var dist = Math.hypot(dx, dy) || 1;
      var minR = view.R * session.zoom + 30;
      if (dist < minR) {
        p.x = view.cx + (dx / dist) * minR;
        p.y = Math.min(maxY, view.cy + (dy / dist) * minR);
      }
    }
    for (var pass = 0; pass < 8; pass++) {
      for (var i = 0; i < placed.length; i++) {
        for (var j = i + 1; j < placed.length; j++) {
          var a = placed[i];
          var b = placed[j];
          var dx = b.x - a.x;
          var dy = b.y - a.y;
          var dist = Math.hypot(dx, dy) || 0.01;
          if (dist >= 64) continue;
          var push = (64 - dist) / 2;
          a.x -= (dx / dist) * push;
          a.y -= (dy / dist) * push;
          b.x += (dx / dist) * push;
          b.y += (dy / dist) * push;
        }
      }
      placed.forEach(park);
    }
    placed.forEach(function (p) {
      var ang = Math.atan2(p.y - view.cy, p.x - view.cx);
      p.el.style.left = p.x + 'px';
      p.el.style.top = p.y + 'px';
      p.el.style.transform = 'translate(-50%, -50%) rotate(' + ((ang * 180 / Math.PI) + 90) + 'deg)';
    });
    var handle = $('ring-handle');
    var selected = byId(level, session.selected);
    if (!handle || !selected || session.out[selected.id] || !session.handles) {
      if (handle) handle.hidden = true;
      placeChrome();
      return;
    }
    handle.hidden = false;
    var spec = RING_SPEC[selected.id];
    var hang = slotAngle(gapOf(selected, session.rots[selected.id])) + 2.15;
    var hr = spec.rOut * view.s + 18;
    var hp = { x: 0, y: 0 };
    var blocked = true;
    for (var attempt = 0; attempt < 8; attempt++) {
      hp = toScreen(view.cx + Math.cos(hang) * hr, view.cy + Math.sin(hang) * hr);
      blocked = false;
      for (var ai = 0; ai < placed.length; ai++) {
        if (Math.hypot(placed[ai].x - hp.x, placed[ai].y - hp.y) < 64) blocked = true;
      }
      if (!blocked) break;
      hang += 0.55;
    }
    if (blocked) {
      handle.hidden = true;
      placeChrome();
      return;
    }
    handle.style.left = clamp(hp.x, 30, view.w - 30) + 'px';
    handle.style.top = clamp(hp.y, 30, Math.max(30, maxY)) + 'px';
    handle.setAttribute('aria-label', '转动' + selected.name + '的手柄');
    placeChrome();
  }

  function placeChrome() {
    var box = document.querySelector('#screen-play .stage-ui.left');
    if (!box || !canvas) return;
    if (view.h < view.w) {
      box.style.top = '';
      box.style.bottom = '';
      box.style.left = '';
      return;
    }
    var tool = document.querySelector('#screen-play .tool-row');
    var sr = canvas.getBoundingClientRect();
    var h = box.offsetHeight || 44;
    var w = box.offsetWidth || 54;
    var y = view.h - 180;
    if (tool && tool.getBoundingClientRect().height > 2) {
      y = tool.getBoundingClientRect().top - sr.top - 10 - h;
    }
    function overlaps(x, y0) {
      var a = { l: x, t: y0, r: x + w, b: y0 + h };
      var nodes = document.querySelectorAll('#screen-play .exit-arrow, #screen-play .tool-row button, #screen-play .action-row button, #screen-play .stage-ui.right button');
      for (var i = 0; i < nodes.length; i++) {
        var el = nodes[i];
        if (el.hidden) continue;
        var r = el.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) continue;
        var b = { l: r.left - sr.left, t: r.top - sr.top, r: r.right - sr.left, b: r.bottom - sr.top };
        if (Math.min(a.r, b.r) - Math.max(a.l, b.l) > 0 && Math.min(a.b, b.b) - Math.max(a.t, b.t) > 0) return true;
      }
      return false;
    }
    var x = 8;
    var guard = 0;
    while (overlaps(x, y) && y > 56 && guard < 12) {
      y -= 12;
      guard += 1;
    }
    box.style.left = x + 'px';
    box.style.bottom = 'auto';
    box.style.top = Math.max(56, y) + 'px';
  }

  function hitRing(wx, wy) {
    var level = currentLevel();
    var list = level.rings.slice().sort(function (a, b) {
      return RING_SPEC[b.id].rOut - RING_SPEC[a.id].rOut;
    });
    var d = Math.hypot(wx - view.cx, wy - view.cy) / (view.s || 1);
    for (var i = 0; i < list.length; i++) {
      var ring = list[i];
      if (session.out[ring.id]) continue;
      var spec = RING_SPEC[ring.id];
      if (d >= spec.rIn - 16 && d <= spec.rOut + 18) return ring.id;
    }
    return null;
  }
  function localPoint(e) {
    var rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function onPointerDown(e) {
    if ($('screen-play').hidden || session.won) return;
    if (e.target.closest && e.target.closest('.stage-ui')) return;
    var p = localPoint(e);
    pointers.set(e.pointerId, p);
    if (pointers.size >= 2) {
      drag = null;
      var pts = Array.from(pointers.values());
      pinch = { dist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1, zoom: session.zoom };
      return;
    }
    if (e.target.classList && e.target.classList.contains('exit-arrow')) return;
    fitCanvas();
    var world = toWorld(p.x, p.y);
    var id = null;
    if (e.target.id === 'ring-handle') id = session.selected;
    else id = hitRing(world.x, world.y);
    if (!id) return;
    session.selected = id;
    renderUI();
    var ring = byId(currentLevel(), id);
    drag = { id: id, last: Math.atan2(world.y - view.cy, world.x - view.cx), accum: 0, x: p.x, y: p.y, pointer: e.pointerId };
    try { $('stage').setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
  }
  function onPointerMove(e) {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, localPoint(e));
    if (pointers.size >= 2) {
      drag = null;
      if (!pinch) return;
      var pts = Array.from(pointers.values());
      var dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1;
      applyZoom(pinch.zoom * (dist / pinch.dist));
      return;
    }
    if (!drag || drag.pointer !== e.pointerId) return;
    var p = pointers.get(e.pointerId);
    var world = toWorld(p.x, p.y);
    var ang = Math.atan2(world.y - view.cy, world.x - view.cx);
    var delta = ang - drag.last;
    if (delta > Math.PI) delta -= Math.PI * 2;
    if (delta < -Math.PI) delta += Math.PI * 2;
    drag.last = ang;
    drag.accum += delta;
    var arc = Math.PI * 2 / 8;
    if (drag.accum > arc * 0.42) {
      rotate(drag.id, 1);
      drag.accum = 0;
      drag.last = ang;
    } else if (drag.accum < -arc * 0.42) {
      rotate(drag.id, -1);
      drag.accum = 0;
      drag.last = ang;
    }
  }
  function onPointerUp(e) {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) {
      if (pinch) persist();
      pinch = null;
    }
    if (drag && drag.pointer === e.pointerId) drag = null;
  }

  var MASCOT = {
    turn: { webp: 'assets/mascot/ring-turn.webp', png: 'assets/mascot/ring-turn.png', fw: 382, fh: 374, cols: 6, n: 24, ax: 188, ay: 197, frames: null },
    float: { webp: 'assets/mascot/float-sparkle.webp', png: 'assets/mascot/float-sparkle.png', fw: 380, fh: 492, cols: 6, n: 24, ax: 186, ay: 315, frames: [0, 1, 2, 3, 4, 5, 6, 7, 16, 17, 18, 19, 20, 21, 22, 23] },
    spin: { webp: 'assets/mascot/spark-spin.webp', png: 'assets/mascot/spark-spin.png', fw: 416, fh: 374, cols: 6, n: 24, ax: 190, ay: 197, frames: null }
  };
  var mascotOrder = ['turn', 'float', 'spin'];
  var mascotName = 'turn';
  var mascotImgs = {};

  function mascotClip() { return MASCOT[mascotName]; }

  function loadMascot(name) {
    if (mascotImgs[name] || mascotImgs['@' + name]) return;
    mascotImgs['@' + name] = 1;
    var clip = MASCOT[name];
    var img = new Image();
    img.onload = function () { mascotImgs[name] = img; paintMascot(); };
    img.onerror = function () {
      if (img.getAttribute('data-fell')) return;
      img.setAttribute('data-fell', '1');
      img.src = clip.png;
    };
    img.src = clip.webp;
  }

  function mountSprites() {
    var nodes = document.querySelectorAll('.hero-sprite');
    loadMascot('turn');
    nodes.forEach(function (el) {
      el.addEventListener('pointerenter', function () {
        if (mascotName === 'turn') { loadMascot('float'); mascotName = 'float'; paintMascot(); }
      });
      el.addEventListener('pointerleave', function () { if (mascotName === 'float') { mascotName = 'turn'; paintMascot(); } });
      el.addEventListener('click', function (e) {
        e.stopPropagation();
        var i = mascotOrder.indexOf(mascotName);
        mascotName = mascotOrder[(i + 1) % mascotOrder.length];
        loadMascot(mascotName);
        paintMascot();
      });
    });
    paintMascot();
    setInterval(function () { mascotTick += 1; paintMascot(); }, 1000 / 12);
    window.addEventListener('resize', function () { paintMascot(); });
  }

  var mascotTick = 0;
  function paintMascot() {
    var clip = mascotClip();
    var img = mascotImgs[mascotName];
    var frames = clip.frames || [];
    var count = frames.length || clip.n;
    var step = reduceMotion ? 0 : (mascotTick % count);
    var frame = frames.length ? frames[step] : step;
    var col = frame % clip.cols;
    var row = Math.floor(frame / clip.cols);
    document.querySelectorAll('.hero-sprite').forEach(function (el) {
      var host = el.parentElement;
      if (!host) return;
      var wide = host.clientWidth / Math.max(1, host.clientHeight) > 1.15 && host.classList.contains('lg');
      var ref = MASCOT.turn;
      var scale;
      var ax;
      var ay;
      if (host.classList.contains('lg')) {
        if (wide) {
          scale = host.clientHeight * 0.62 / ref.fh;
          ax = host.clientWidth * 0.28;
          ay = host.clientHeight * 0.64;
        } else {
          scale = host.clientWidth * 0.78 / ref.fw;
          ax = host.clientWidth * 0.50;
          ay = host.clientHeight * 0.70;
        }
      } else {
        scale = host.clientHeight * 0.92 / ref.fh;
        ax = host.clientWidth * 0.5;
        ay = host.clientHeight * 0.62;
      }
      el.style.width = (clip.fw * scale) + 'px';
      el.style.height = (clip.fh * scale) + 'px';
      el.style.left = (ax - clip.ax * scale) + 'px';
      el.style.top = (ay - clip.ay * scale) + 'px';
      if (reduceMotion) {
        el.style.backgroundImage = 'url("assets/mascot/still-ring-turn.png")';
        el.style.backgroundSize = (clip.fw * scale) + 'px ' + (clip.fh * scale) + 'px';
        el.style.backgroundPosition = '0 0';
        return;
      }
      if (!img) return;
      el.style.backgroundImage = 'url("' + img.src + '")';
      el.style.backgroundSize = (clip.fw * clip.cols * scale) + 'px ' + (clip.fh * 4 * scale) + 'px';
      el.style.backgroundPosition = (-col * clip.fw * scale) + 'px ' + (-row * clip.fh * scale) + 'px';
    });
  }

  function bind() {
    canvas = $('cv');
    ctx2d = canvas.getContext('2d');
    $('btn-enter').addEventListener('click', function () {
      save.seenCover = true;
      armAudio(true);
      if (save.resume && save.resume.levelId && (save.screen === 'play' || save.screen === 'win') && restoreResume(save.resume)) {
        show('play');
        renderUI();
        if (save.screen === 'win' && session.won) openResult();
        return;
      }
      save.screen = 'home';
      persist();
      renderHome();
      show('home');
    });
    $('btn-continue').addEventListener('click', function () {
      if (save.resume && save.resume.levelId && !save.resume.won && restoreResume(save.resume)) {
        save.screen = 'play';
        persist();
        show('play');
        renderUI();
        return;
      }
      var n = nextUncleared() || 1;
      if (!isLevelOpen(n)) n = 1;
      beginLevel(n);
    });
    $('chapter-list').addEventListener('click', function (e) {
      var b = e.target.closest('[data-chapter]');
      if (!b || b.disabled) return;
      openChapter(Number(b.dataset.chapter));
    });
    $('journey').addEventListener('click', function (e) {
      var b = e.target.closest('[data-chapter]');
      if (!b || b.disabled) return;
      openChapter(Number(b.dataset.chapter));
    });
    $('btn-chapter-back').addEventListener('click', function () { renderHome(); show('home'); });
    $('btn-chapter-start').addEventListener('click', function () {
      beginLevel(Number($('btn-chapter-start').dataset.level));
    });
    $('level-list').addEventListener('click', function (e) {
      var b = e.target.closest('[data-level]');
      if (!b || b.disabled) return;
      beginLevel(Number(b.dataset.level));
    });
    $('btn-back').addEventListener('click', openPause);
    $('btn-pause').addEventListener('click', openPause);
    $('btn-resume').addEventListener('click', function () { $('modal-pause').hidden = true; });
    $('btn-restart').addEventListener('click', function () {
      if (!session.restartArm) {
        session.restartArm = true;
        $('btn-restart').textContent = '确定重开';
        return;
      }
      $('modal-pause').hidden = true;
      resetLevel();
    });
    $('btn-pause-home').addEventListener('click', goHome);
    $('btn-result-home').addEventListener('click', goHome);
    $('btn-next').addEventListener('click', function () {
      var id = Number($('btn-next').dataset.level);
      if (id) beginLevel(id);
    });
    $('btn-ccw').addEventListener('click', function () { rotate(session.selected, -1); });
    $('btn-cw').addEventListener('click', function () { rotate(session.selected, 1); });
    $('btn-undo').addEventListener('click', undo);
    $('chip-undo').addEventListener('click', undo);
    $('btn-lens').addEventListener('click', openLens);
    $('chip-lens').addEventListener('click', openLens);
    $('btn-lens-use').addEventListener('click', confirmLens);
    $('btn-lens-close').addEventListener('click', function () { $('modal-lens').hidden = true; });
    $('btn-gap').addEventListener('click', function () {
      session.gap = !session.gap;
      save.prefs.gap = session.gap;
      saveProgress();
      renderUI();
    });
    $('btn-handle').addEventListener('click', function () {
      session.handles = !session.handles;
      save.prefs.handles = session.handles;
      saveProgress();
      renderUI();
    });
    $('btn-tray').addEventListener('click', function () {
      session.tray = !session.tray;
      renderUI();
    });
    $('chip-out').addEventListener('click', function () {
      session.tray = !session.tray;
      renderUI();
    });
    $('chip-turns').addEventListener('click', function () {
      setMsg('这一关不限时间，也不限转动次数。目前转了 ' + session.turns + ' 次。');
    });
    $('btn-view').addEventListener('click', function () {
      session.view = session.view === 'section' ? 'front' : 'section';
      save.prefs.view = session.view;
      saveProgress();
      renderUI();
    });
    $('btn-zoom-in').addEventListener('click', function () {
      applyZoom(session.zoom + 0.08);
      persist();
    });
    $('btn-zoom-out').addEventListener('click', function () {
      applyZoom(session.zoom - 0.08);
      persist();
    });
    $('btn-home-rules').addEventListener('click', function () { openRules('home'); });
    $('btn-pause-rules').addEventListener('click', function () { openRules('pause'); });
    $('btn-rules-close').addEventListener('click', closeRules);
    $('btn-pause-music').addEventListener('click', function () {
      save.music = !save.music;
      persist();
      armAudio(false);
      if (save.music) startScheduler();
      else stopScheduler();
      syncAudioButtons();
    });
    $('btn-pause-sfx').addEventListener('click', function () {
      save.sfx = !save.sfx;
      persist();
      syncAudioButtons();
    });
    document.querySelectorAll('[data-music]').forEach(function (b) {
      b.addEventListener('click', function () {
        save.music = !save.music;
        persist();
        armAudio(false);
        if (save.music) startScheduler();
        else stopScheduler();
        syncAudioButtons();
      });
    });
    document.addEventListener('pointerdown', function (e) {
      if (e.target.closest && e.target.closest('[data-music]')) return;
      armAudio(true);
    }, true);
    var stage = $('stage');
    stage.addEventListener('pointerdown', onPointerDown);
    stage.addEventListener('pointermove', onPointerMove);
    stage.addEventListener('pointerup', onPointerUp);
    stage.addEventListener('pointercancel', onPointerUp);
    canvas.addEventListener('wheel', function (e) {
      if ($('screen-play').hidden) return;
      e.preventDefault();
      applyZoom(session.zoom * (e.deltaY > 0 ? 0.94 : 1.06));
      persist();
    }, { passive: false });
    window.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (!$('modal-rules').hidden) { closeRules(); return; }
        if (!$('modal-lens').hidden) { $('modal-lens').hidden = true; return; }
        if (!$('modal-pause').hidden) { $('modal-pause').hidden = true; return; }
        if (!$('screen-play').hidden && !session.won) openPause();
        return;
      }
      if ($('screen-play').hidden || anyModal() || session.won) return;
      if (e.key === 'ArrowLeft' || e.key === 'a') rotate(session.selected, -1);
      if (e.key === 'ArrowRight' || e.key === 'd') rotate(session.selected, 1);
      if (e.key === 'Enter') {
        var ex = inspectExtract(currentLevel(), live(), session.selected);
        if (ex.ok) extract(session.selected);
      }
      if (e.key === 'z' || e.key === 'Z') undo();
    });
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('resize', function () {
      if (!$('screen-play').hidden) renderUI();
    });
  }

  function frame(now) {
    if (!$('screen-play').hidden && session.levelId) {
      draw(now || performance.now());
      var line = statusLine();
      if ($('status-line').textContent !== line) $('status-line').textContent = line;
    }
    requestAnimationFrame(frame);
  }

  function showFatal(err) {
    var pre = document.createElement('pre');
    pre.textContent = String(err && err.stack || err);
    pre.style.cssText = 'position:fixed;inset:8px;z-index:99;background:#2a0c0c;color:#fff;padding:12px;overflow:auto;white-space:pre-wrap';
    document.body.appendChild(pre);
  }

  function boot() {
    try {
      prepare();
    } catch (err) {
      showFatal(err);
      return;
    }
    save = loadSave();
    bind();
    mountSprites();
    renderCover();
    if ((save.screen === 'play' || save.screen === 'win') && save.resume && restoreResume(save.resume)) {
      ensureArt();
      show('play');
      renderUI();
      if (save.screen === 'win' && session.won) openResult();
    } else if (save.seenCover) {
      save.screen = 'home';
      renderHome();
      show('home');
    } else {
      show('cover');
    }
    syncAudioButtons();
    requestAnimationFrame(frame);
  }

  api.profileMusic = function () {
    var seconds = 80;
    var ctx = new OfflineAudioContext(1, Math.floor(44100 * seconds), 44100);
    var dest = ctx.createGain();
    dest.gain.value = 1;
    dest.connect(ctx.destination);
    for (var i = 0; i < MUSIC_LOOP; i++) playStep(ctx, dest, i, i * MUSIC_STEP);
    return ctx.startRendering().then(function (buf) {
      var data = buf.getChannelData(0);
      var chunk = Math.floor(data.length / 4);
      var rms = [];
      var peak = 0;
      for (var i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i]));
      for (var c = 0; c < 4; c++) {
        var sum = 0;
        for (var j = 0; j < chunk; j++) {
          var v = data[c * chunk + j];
          sum += v * v;
        }
        rms.push(Math.sqrt(sum / chunk));
      }
      return { seconds: buf.duration, rms: rms, peak: peak };
    });
  };
  api.getSave = function () { return save; };
  api.getSession = function () { return session; };
  api.layoutBox = function () {
    return { w: view.w, h: view.h, R: view.R, cx: view.cx, cy: view.cy, zoom: session.zoom };
  };
  api.audioState = function () {
    return {
      state: Music.ctx ? Music.ctx.state : 'none',
      scheduling: !!Music.timer,
      started: !!Music.started
    };
  };
  api.beginLevel = beginLevel;
  api.rotate = rotate;
  api.extract = extract;
  api.undo = undo;
  api.resetLevel = resetLevel;
  window.STARLOCK = api;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
