/* 云端攀行的固定规则。距离用「视口高度的比例」，因为岩壁按高度铺满视口。
   吸附只在已经够得到的抓点里生效，不会把超远点拉进手里。 */
(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.CLOUDCLIMB_RULES = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var LIMBS = ['hand_l', 'hand_r', 'foot_l', 'foot_r'];
  var HANDS = { hand_l: 1, hand_r: 1 };
  var MODE_ASPECT = { portrait: 1080 / 1920, landscape: 1920 / 1080 };

  /* 手比脚够得远。两个常数对横竖两套坐标都用同一把尺。 */
  var HAND_REACH = 0.23;
  var FOOT_REACH = 0.185;
  var SNAP = 0.064;
  var INSTALL_REACH = 0.105;
  var MOVE_BASE = 6.5;
  var MOVE_PER_DIST = 72;
  var MOVE_UP = 2;
  var RELEASE_COST = 6;
  var FALL_LOSS = 36;
  var FALL_LOSS_ASSIST = 12;
  var FALL_FLOOR = 30;
  var FALL_FLOOR_ASSIST = 58;

  /* 教学岩壁，原点左上，与 b27-meta.json 的 teaching_layout 一致。
     foot:false 的抓点只给手，承重在数据里写死。 */
  var LAYOUTS = {
    portrait: {
      holds: [
        [0.38, 0.78], [0.52, 0.74], [0.42, 0.68], [0.58, 0.64],
        [0.36, 0.60], [0.50, 0.55], [0.62, 0.50], [0.44, 0.46],
        [0.56, 0.40], [0.42, 0.34], [0.54, 0.28], [0.48, 0.22]
      ],
      rests: [[0.30, 0.58], [0.68, 0.42]],
      installs: [[0.46, 0.70], [0.40, 0.52], [0.58, 0.34]],
      start: [0.50, 0.90],
      ridge: [0.50, 0.16]
    },
    landscape: {
      holds: [
        [0.16, 0.80], [0.28, 0.76], [0.20, 0.70], [0.34, 0.66],
        [0.14, 0.60], [0.26, 0.55], [0.38, 0.50], [0.22, 0.46],
        [0.34, 0.40], [0.20, 0.34], [0.32, 0.28], [0.26, 0.22]
      ],
      rests: [[0.10, 0.58], [0.44, 0.42]],
      installs: [[0.22, 0.72], [0.18, 0.52], [0.36, 0.34]],
      start: [0.18, 0.90],
      ridge: [0.30, 0.12]
    }
  };

  var HOLD_FOOT = [true, false, true, false, true, true, true, false, true, false, true, true];
  var HOLD_COLOR = ['red', 'green', 'blue', 'purple'];

  function layoutOf(mode) {
    var src = LAYOUTS[mode] || LAYOUTS.portrait;
    return {
      mode: src === LAYOUTS.landscape ? 'landscape' : 'portrait',
      holds: src.holds,
      rests: src.rests,
      installs: src.installs,
      start: src.start,
      ridge: src.ridge,
      aspect: MODE_ASPECT[src === LAYOUTS.landscape ? 'landscape' : 'portrait']
    };
  }

  function dist(a, b, mode) {
    var aspect = MODE_ASPECT[mode] || MODE_ASPECT.portrait;
    var dx = (a[0] - b[0]) * aspect;
    var dy = a[1] - b[1];
    return Math.hypot(dx, dy);
  }

  function cloneLimbs(limbs) {
    var out = {};
    LIMBS.forEach(function (name) {
      var src = limbs[name];
      out[name] = { kind: src.kind, id: src.id };
    });
    return out;
  }

  function freshState(mode) {
    return {
      mode: mode === 'landscape' ? 'landscape' : 'portrait',
      limbs: {
        hand_l: { kind: 'free' },
        hand_r: { kind: 'free' },
        foot_l: { kind: 'ledge', id: 'start' },
        foot_r: { kind: 'ledge', id: 'start' }
      },
      stamina: 100,
      installs: [null, null, null],
      assist: false,
      moves: 0,
      restHold: 0,
      usedClips: 0
    };
  }

  function pointOf(layout, attachment) {
    if (!attachment || attachment.kind === 'free') return null;
    if (attachment.kind === 'hold') return layout.holds[attachment.id];
    if (attachment.kind === 'ridge') return layout.ridge;
    if (attachment.kind === 'ledge') {
      if (attachment.id === 'start') return layout.start;
      return layout.rests[attachment.id];
    }
    return null;
  }

  function isGrip(attachment) {
    return !!attachment && attachment.kind !== 'free';
  }

  function gripCount(limbs, except) {
    var n = 0;
    LIMBS.forEach(function (name) {
      if (name === except) return;
      if (isGrip(limbs[name])) n += 1;
    });
    return n;
  }

  function gripPoints(layout, limbs, except) {
    var pts = [];
    LIMBS.forEach(function (name) {
      if (name === except) return;
      if (!isGrip(limbs[name])) return;
      var p = pointOf(layout, limbs[name]);
      if (p) pts.push(p);
    });
    return pts;
  }

  function centroid(pts) {
    var x = 0;
    var y = 0;
    pts.forEach(function (p) { x += p[0]; y += p[1]; });
    return [x / pts.length, y / pts.length];
  }

  function torso(layout, limbs) {
    var pts = gripPoints(layout, limbs, null);
    if (!pts.length) return layout.start.slice();
    return centroid(pts);
  }

  function reachLimit(limb) {
    return HANDS[limb] ? HAND_REACH : FOOT_REACH;
  }

  function sameAttach(a, b) {
    if (!a || !b) return false;
    return a.kind === b.kind && a.id === b.id;
  }

  function occupied(limbs, target, except) {
    var hit = null;
    LIMBS.forEach(function (name) {
      if (name === except) return;
      if (sameAttach(limbs[name], target)) hit = name;
    });
    return hit;
  }

  function feetOn(limbs, kind, id) {
    var n = 0;
    ['foot_l', 'foot_r'].forEach(function (name) {
      var a = limbs[name];
      if (a.kind === kind && a.id === id) n += 1;
    });
    return n;
  }

  function stableRest(limbs) {
    return feetOn(limbs, 'ledge', 0) === 2 || feetOn(limbs, 'ledge', 1) === 2;
  }

  function stableStart(limbs) {
    return feetOn(limbs, 'ledge', 'start') === 2;
  }

  function feetOnAnyLedge(limbs) {
    var n = 0;
    ['foot_l', 'foot_r'].forEach(function (name) {
      if (limbs[name].kind === 'ledge') n += 1;
    });
    return n;
  }

  /* 评估一次换位。超距、承重、占用、最后一处抓握都在这里否决。 */
  function evaluate(state, limb, target, weather) {
    var layout = layoutOf(state.mode);
    var current = state.limbs[limb];
    if (sameAttach(current, target)) return { ok: false, reason: 'same' };
    if (gripCount(state.limbs, limb) < 1) return { ok: false, reason: 'last' };
    if (target.kind === 'free') {
      if (state.stamina - RELEASE_COST < 1) return { ok: false, reason: 'stamina', cost: RELEASE_COST };
      return { ok: true, reason: 'ok', cost: RELEASE_COST, dist: 0, point: null };
    }
    var dest = pointOf(layout, target);
    if (!dest) return { ok: false, reason: 'kind' };
    if (target.kind === 'ledge' && HANDS[limb]) return { ok: false, reason: 'kind' };
    if (target.kind === 'hold') {
      if (!HANDS[limb] && !HOLD_FOOT[target.id]) return { ok: false, reason: 'load' };
      if (occupied(state.limbs, target, limb)) return { ok: false, reason: 'occupied' };
    }
    if (target.kind === 'ledge' && occupied(state.limbs, target, limb) && HANDS[limb]) {
      return { ok: false, reason: 'occupied' };
    }
    var others = gripPoints(layout, state.limbs, limb);
    if (!others.length) return { ok: false, reason: 'last' };
    var origin = centroid(others);
    var gap = dist(origin, dest, state.mode);
    if (gap > reachLimit(limb) + 1e-6) return { ok: false, reason: 'reach', dist: gap };
    var from = pointOf(layout, current) || origin;
    var upward = dest[1] < from[1] - 0.008;
    var cost = MOVE_BASE + gap * MOVE_PER_DIST + (upward ? MOVE_UP : 0);
    if (weather && weather.dusk === 'on') cost += 3;
    if (weather && weather.wind === 'on') cost *= 1.18;
    var summit = target.kind === 'ridge';
    if (!summit && state.stamina - cost < 1) return { ok: false, reason: 'stamina', cost: cost, dist: gap };
    if (summit && state.stamina - cost < 0) return { ok: false, reason: 'stamina', cost: cost, dist: gap };
    return { ok: true, reason: 'ok', cost: cost, dist: gap, point: dest };
  }

  function applyMove(state, limb, target) {
    var verdict = evaluate(state, limb, target, state.weather || null);
    if (!verdict.ok) return verdict;
    state.limbs[limb] = target.kind === 'free' ? { kind: 'free' } : { kind: target.kind, id: target.id };
    state.stamina = Math.max(0, state.stamina - verdict.cost);
    state.moves += 1;
    if (!stableRest(state.limbs)) state.restHold = 0;
    return verdict;
  }

  function holdClass(state, limb, holdId, weather) {
    var target = { kind: 'hold', id: holdId };
    var current = state.limbs[limb];
    if (sameAttach(current, target)) return 'current';
    var verdict = evaluate(state, limb, target, weather);
    if (verdict.ok) return 'reachable';
    if (verdict.reason === 'reach') return 'far';
    if (verdict.reason === 'load') return 'weak';
    if (verdict.reason === 'occupied') return 'busy';
    if (verdict.reason === 'stamina') return 'tired';
    if (verdict.reason === 'last') return 'locked';
    return 'far';
  }

  /* 只在可达抓点里挑离指针最近、且进入吸附半径的那个。 */
  function snapHold(state, limb, pointer, weather) {
    var layout = layoutOf(state.mode);
    var best = null;
    var bestD = SNAP + 1;
    layout.holds.forEach(function (p, id) {
      if (holdClass(state, limb, id, weather) !== 'reachable') return;
      var gap = dist(pointer, p, state.mode);
      if (gap < bestD) {
        bestD = gap;
        best = { kind: 'hold', id: id, dist: gap, point: p };
      }
    });
    if (!best || best.dist > SNAP) return null;
    var ridgeGap = dist(pointer, layout.ridge, state.mode);
    if (ridgeGap < best.dist && ridgeGap <= SNAP) {
      var ridgeTry = evaluate(state, limb, { kind: 'ridge' }, weather);
      if (ridgeTry.ok) return { kind: 'ridge', dist: ridgeGap, point: layout.ridge };
    }
    return best;
  }

  function snapTarget(state, limb, pointer, weather) {
    var layout = layoutOf(state.mode);
    var hold = snapHold(state, limb, pointer, weather);
    var best = hold;
    function consider(target, point) {
      var verdict = evaluate(state, limb, target, weather);
      if (!verdict.ok) return;
      var gap = dist(pointer, point, state.mode);
      if (gap > SNAP) return;
      if (!best || gap < best.dist) best = { kind: target.kind, id: target.id, dist: gap, point: point };
    }
    if (!HANDS[limb]) {
      consider({ kind: 'ledge', id: 'start' }, layout.start);
      layout.rests.forEach(function (p, id) { consider({ kind: 'ledge', id: id }, p); });
    }
    consider({ kind: 'ridge' }, layout.ridge);
    return best && best.dist <= SNAP ? best : null;
  }

  function nearestClip(state) {
    var layout = layoutOf(state.mode);
    var body = torso(layout, state.limbs);
    var best = -1;
    var bestD = Infinity;
    state.installs.forEach(function (snap, i) {
      if (!snap) return;
      var gap = dist(body, layout.installs[i], state.mode);
      if (gap < bestD) {
        bestD = gap;
        best = i;
      }
    });
    return best;
  }

  function installRange(state, index) {
    var layout = layoutOf(state.mode);
    var spot = layout.installs[index];
    var pts = gripPoints(layout, state.limbs, null);
    if (!pts.length) pts = [layout.start];
    var best = Infinity;
    pts.forEach(function (p) {
      var gap = dist(p, spot, state.mode);
      if (gap < best) best = gap;
    });
    return best;
  }

  function canInstall(state, index) {
    if (index < 0 || index > 2) return false;
    if (state.installs[index]) return false;
    return installRange(state, index) <= INSTALL_REACH;
  }

  function placeInstall(state, index) {
    if (!canInstall(state, index)) return false;
    state.installs[index] = {
      limbs: cloneLimbs(state.limbs),
      stamina: state.stamina,
      restHold: state.restHold
    };
    state.usedClips += 1;
    return true;
  }

  function applyFall(state) {
    var index = nearestClip(state);
    var loss = state.assist ? FALL_LOSS_ASSIST : FALL_LOSS;
    var floor = state.assist ? FALL_FLOOR_ASSIST : FALL_FLOOR;
    if (index >= 0) {
      var snap = state.installs[index];
      state.limbs = cloneLimbs(snap.limbs);
      state.restHold = 0;
      state.stamina = Math.max(floor, snap.stamina - loss);
      return { where: 'clip', index: index, stamina: state.stamina };
    }
    var keepAssist = state.assist;
    var clips = state.installs.map(function (snap) {
      return snap ? { limbs: cloneLimbs(snap.limbs), stamina: snap.stamina, restHold: snap.restHold } : null;
    });
    var used = state.usedClips;
    var next = freshState(state.mode);
    next.assist = keepAssist;
    next.installs = clips;
    next.usedClips = used;
    next.stamina = Math.max(floor, 100 - loss);
    state.limbs = next.limbs;
    state.stamina = next.stamina;
    state.restHold = 0;
    state.moves = 0;
    return { where: 'start', index: -1, stamina: state.stamina };
  }

  function drainPerSec(state, weather) {
    if (stableRest(state.limbs) || stableStart(state.limbs)) return 0;
    var supported = feetOnAnyLedge(state.limbs) >= 1;
    var rate = supported ? 1.15 : 2.35;
    if (weather && weather.haze === 'on') rate *= 1.18;
    if (weather && weather.wind === 'on') rate *= 1.4;
    return rate;
  }

  function regenPerSec(state) {
    if (!stableRest(state.limbs)) return 0;
    if (state.restHold < 0.55) return 0;
    return 16;
  }

  function tick(state, dt, weather) {
    if (dt <= 0) return { fell: false, regen: false };
    if (stableRest(state.limbs)) state.restHold += dt;
    else state.restHold = 0;
    var before = state.stamina;
    if (stableRest(state.limbs)) state.stamina = Math.min(100, state.stamina + regenPerSec(state) * dt);
    else state.stamina = Math.max(0, state.stamina - drainPerSec(state, weather) * dt);
    var fell = false;
    if (state.stamina <= 0 && !stableRest(state.limbs) && !stableStart(state.limbs)) fell = true;
    return { fell: fell, regen: state.stamina > before + 0.01, drain: state.stamina < before - 0.01 };
  }

  function minGripY(state) {
    var layout = layoutOf(state.mode);
    var y = layout.start[1];
    LIMBS.forEach(function (name) {
      var p = pointOf(layout, state.limbs[name]);
      if (p && p[1] < y) y = p[1];
    });
    return y;
  }

  function stance(limbs) {
    if (stableRest(limbs)) return 'rest';
    if (stableStart(limbs)) return 'start';
    if (feetOnAnyLedge(limbs) >= 1) return 'easing';
    return 'hang';
  }

  function poseName(limbs, draggingLimb) {
    if (draggingLimb === 'hand_l' || draggingLimb === 'hand_r') return 'reach';
    var hands = 0;
    ['hand_l', 'hand_r'].forEach(function (name) {
      if (isGrip(limbs[name])) hands += 1;
    });
    if ((stableRest(limbs) || stableStart(limbs)) && hands === 0) return 'stand';
    if (hands === 2 && feetOnAnyLedge(limbs) === 0) {
      var feetOnHolds = 0;
      ['foot_l', 'foot_r'].forEach(function (name) {
        if (limbs[name].kind === 'hold') feetOnHolds += 1;
      });
      if (feetOnHolds === 0) return 'hang';
    }
    return 'default';
  }

  function limbLabel(limb) {
    return { hand_l: '左手', hand_r: '右手', foot_l: '左脚', foot_r: '右脚' }[limb] || '';
  }

  return {
    LIMBS: LIMBS,
    HAND_REACH: HAND_REACH,
    FOOT_REACH: FOOT_REACH,
    SNAP: SNAP,
    INSTALL_REACH: INSTALL_REACH,
    FALL_LOSS: FALL_LOSS,
    FALL_LOSS_ASSIST: FALL_LOSS_ASSIST,
    HOLD_FOOT: HOLD_FOOT,
    HOLD_COLOR: HOLD_COLOR,
    layoutOf: layoutOf,
    dist: dist,
    freshState: freshState,
    cloneLimbs: cloneLimbs,
    pointOf: pointOf,
    torso: torso,
    evaluate: evaluate,
    applyMove: applyMove,
    holdClass: holdClass,
    snapTarget: snapTarget,
    nearestClip: nearestClip,
    canInstall: canInstall,
    installRange: installRange,
    placeInstall: placeInstall,
    applyFall: applyFall,
    tick: tick,
    drainPerSec: drainPerSec,
    regenPerSec: regenPerSec,
    minGripY: minGripY,
    stance: stance,
    poseName: poseName,
    stableRest: stableRest,
    stableStart: stableStart,
    limbLabel: limbLabel,
    reachLimit: reachLimit
  };
});
