/* 重力邮局物理。镜头角永远是 0，变的只有重力向量。 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GPSim = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var CONST = {
    R: 0.27,
    G: 9.6,
    ROLL: 0.4,
    BRAKE: 30,
    DRAIN: 18,
    WARN: 5.05,
    HURT: 7.15,
    MAXV: 11,
    REST: 0.58,
    REST_T: 0.7,
    PAD: 4.4,
    HIT_CD: 0.45,
    CP_R: 0.92,
    SUB: 1 / 120
  };

  var SENS = {
    low: { finger: 2.15, turn: 1.02 },
    mid: { finger: 5.1, turn: 2.2 },
    high: { finger: 10.4, turn: 4.25 }
  };

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function hypot(x, y) { return Math.sqrt(x * x + y * y); }
  function angDiff(a, b) {
    var d = b - a;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
  }
  function approach(cur, target, rate, dt) {
    var d = angDiff(cur, target);
    var max = rate * dt;
    if (Math.abs(d) <= max) return target;
    return cur + Math.sign(d) * max;
  }

  function cellAt(level, x, y) {
    var cx = Math.floor(x);
    var cy = Math.floor(y);
    if (cx < 0 || cy < 0 || cy >= level.rows || cx >= level.cols) return null;
    return level.grid[cy][cx];
  }

  function forEachTouch(state, fn) {
    var r = state.r;
    var x0 = Math.floor(state.x - r);
    var x1 = Math.floor(state.x + r);
    var y0 = Math.floor(state.y - r);
    var y1 = Math.floor(state.y + r);
    var y, x, c, qx, qy, dx, dy;
    for (y = y0; y <= y1; y++) {
      for (x = x0; x <= x1; x++) {
        c = cellAt(state.level, x + 0.5, y + 0.5);
        qx = clamp(state.x, x, x + 1);
        qy = clamp(state.y, y, y + 1);
        dx = state.x - qx;
        dy = state.y - qy;
        if (dx * dx + dy * dy <= r * r + 1e-6) fn(c, x, y);
      }
    }
  }

  function overlapsKind(state, kind) {
    var hit = false;
    forEachTouch(state, function (c) {
      if (c && c.k === kind) hit = true;
    });
    return hit;
  }

  function overlapsZ(state, z) {
    var hit = false;
    forEachTouch(state, function (c) {
      if (c && c.z === z && c.k !== 'wall') hit = true;
    });
    return hit;
  }

  function isSolid(state, x, y) {
    var c = cellAt(state.level, x, y);
    if (!c) return true;
    if (c.k === 'wall') return true;
    if (c.k === 'door' && !state.doorOpen) return true;
    if (c.z === 1 && state.z === 0 && !overlapsKind(state, 'stair')) return true;
    if (c.z === 0 && state.z === 1 && c.k !== 'stair' && c.k !== 'pit') return true;
    return false;
  }

  function capture(state, x, y, z) {
    return {
      x: x,
      y: y,
      z: z || 0,
      power: state.power,
      integrity: state.integrity,
      powerUsed: state.powerUsed,
      hits: state.hits,
      usedSupply: Object.assign({}, state.usedSupply),
      seenCp: Object.assign({}, state.seenCp)
    };
  }

  function applySnap(state, snap) {
    state.x = snap.x;
    state.y = snap.y;
    state.z = snap.z || 0;
    state.vx = 0;
    state.vy = 0;
    state.power = snap.power;
    state.integrity = snap.integrity;
    state.powerUsed = snap.powerUsed;
    state.hits = snap.hits;
    state.usedSupply = Object.assign({}, snap.usedSupply);
    state.seenCp = Object.assign({}, snap.seenCp);
    state.gravOn = false;
    state.finger = null;
    state.brake = false;
    state.doorOpen = false;
    state.doorTimer = null;
    state.buttonDown = false;
    state.settle = 0;
    state.hitCd = 0;
    state.warned = false;
    state.supplyTouch = {};
    state.phase = 'play';
    state.failT = 0;
    state.failReason = '';
    state.maxImpact = 0;
  }

  function create(level, saved, sens) {
    var s = sens && SENS[sens] ? sens : 'mid';
    var state = {
      level: level,
      x: level.start.x,
      y: level.start.y,
      z: level.start.z || 0,
      vx: 0,
      vy: 0,
      r: CONST.R,
      gravOn: false,
      gAngle: -Math.PI / 2,
      gTarget: -Math.PI / 2,
      finger: null,
      fingerRate: SENS[s].finger,
      turnRate: SENS[s].turn,
      sens: s,
      brake: false,
      power: 100,
      integrity: 100,
      powerUsed: 0,
      hits: 0,
      hitCd: 0,
      settle: 0,
      phase: 'play',
      failT: 0,
      failReason: '',
      doorOpen: false,
      doorTimer: null,
      buttonDown: false,
      usedSupply: {},
      supplyTouch: {},
      seenCp: { start: true },
      events: [],
      camera: 0,
      onPad: false,
      speed: 0,
      warned: false,
      fills: 0,
      maxImpact: 0,
      framePad: false,
      time: 0,
      snapshot: null,
      startSnap: null
    };
    state.startSnap = capture(state, level.start.x, level.start.y, level.start.z || 0);
    state.snapshot = capture(state, level.start.x, level.start.y, level.start.z || 0);
    if (saved && typeof saved.x === 'number') {
      state.startSnap = {
        x: level.start.x,
        y: level.start.y,
        z: level.start.z || 0,
        power: 100,
        integrity: 100,
        powerUsed: 0,
        hits: 0,
        usedSupply: {},
        seenCp: { start: true }
      };
      applySnap(state, saved);
      state.snapshot = capture(state, state.x, state.y, state.z);
    }
    return state;
  }

  function setFinger(state, angle) {
    if (angle == null || !isFinite(angle)) {
      state.finger = null;
      return;
    }
    if (!state.gravOn) {
      state.gravOn = true;
      state.gAngle = angle;
      state.gTarget = angle;
    }
    state.finger = angle;
  }

  function setBrake(state, on) { state.brake = !!on; }

  function setSens(state, name) {
    if (!SENS[name]) return;
    state.sens = name;
    state.fingerRate = SENS[name].finger;
    state.turnRate = SENS[name].turn;
  }

  function restart(state) {
    applySnap(state, state.startSnap);
    state.fills = 0;
    state.snapshot = capture(state, state.x, state.y, state.z);
    state.events = ['restart'];
  }

  function fail(state, reason) {
    if (state.phase === 'fail' || state.phase === 'win') return;
    state.phase = 'fail';
    state.failReason = reason;
    state.failT = 0.92;
    state.brake = false;
    state.events.push(reason === 'pit' ? 'pit' : 'break');
  }

  function resolve(state) {
    var iter, y, x, c, qx, qy, dx, dy, dist, nx, ny, pen, vn, impact, rest, speed;
    var maxImpact = 0;
    var y0, y1, x0, x1, left, right, top, bot, minEdge;
    for (iter = 0; iter < 5; iter++) {
      y0 = Math.floor(state.y - state.r);
      y1 = Math.floor(state.y + state.r);
      x0 = Math.floor(state.x - state.r);
      x1 = Math.floor(state.x + state.r);
      for (y = y0; y <= y1; y++) {
        for (x = x0; x <= x1; x++) {
          if (!isSolid(state, x + 0.5, y + 0.5)) continue;
          qx = clamp(state.x, x, x + 1);
          qy = clamp(state.y, y, y + 1);
          dx = state.x - qx;
          dy = state.y - qy;
          dist = hypot(dx, dy);
          if (dist >= state.r && dist > 1e-8) continue;
          if (dist <= 1e-8) {
            left = state.x - x;
            right = (x + 1) - state.x;
            top = state.y - y;
            bot = (y + 1) - state.y;
            minEdge = Math.min(left, right, top, bot);
            if (minEdge === left) { nx = -1; ny = 0; pen = state.r + left; }
            else if (minEdge === right) { nx = 1; ny = 0; pen = state.r + right; }
            else if (minEdge === top) { nx = 0; ny = -1; pen = state.r + top; }
            else { nx = 0; ny = 1; pen = state.r + bot; }
          } else {
            nx = dx / dist;
            ny = dy / dist;
            pen = state.r - dist;
          }
          state.x += nx * (pen + 1e-4);
          state.y += ny * (pen + 1e-4);
          vn = state.vx * nx + state.vy * ny;
          if (vn < 0) {
            impact = -vn;
            if (impact > maxImpact) maxImpact = impact;
            rest = state.framePad ? 0.05 : (impact > CONST.HURT ? 0.38 : 0.12);
            state.vx -= (1 + rest) * vn * nx;
            state.vy -= (1 + rest) * vn * ny;
            speed = hypot(state.vx, state.vy);
            if (impact < 2.4 && speed < 1.35) {
              state.vx *= 0.5;
              state.vy *= 0.5;
            }
          }
        }
      }
    }
    return maxImpact;
  }

  function updateZ(state) {
    var c = cellAt(state.level, state.x, state.y);
    if (!c || c.k === 'pit' || c.k === 'wall') return;
    if (c.z === 1) state.z = 1;
    else if (c.k === 'stair') state.z = overlapsZ(state, 1) ? 1 : 0;
    else state.z = 0;
  }

  function magnets(state, dt) {
    var list = state.level.magnets || [];
    var i, m, dx, dy, d, k;
    for (i = 0; i < list.length; i++) {
      m = list[i];
      if (m.type === 'circle') {
        dx = m.cx - state.x;
        dy = m.cy - state.y;
        d = hypot(dx, dy);
        if (d < m.r && d > 0.06) {
          k = m.strength * (1 - d / m.r);
          state.vx += (dx / d) * k * dt;
          state.vy += (dy / d) * k * dt;
        }
      } else if (state.x >= m.x && state.x <= m.x + m.w && state.y >= m.y && state.y <= m.y + m.h) {
        state.vx += m.ax * dt;
        state.vy += m.ay * dt;
      }
    }
  }

  function integrate(state, dt) {
    var ax = 0;
    var ay = 0;
    var speed, drop, use, sp, impact, c;
    if (state.finger != null) {
      state.gTarget = approach(state.gTarget, state.finger, state.fingerRate, dt);
    }
    if (state.gravOn) {
      state.gAngle = approach(state.gAngle, state.gTarget, state.turnRate, dt);
      ax += Math.cos(state.gAngle) * CONST.G;
      ay += Math.sin(state.gAngle) * CONST.G;
    }
    state.vx += ax * dt;
    state.vy += ay * dt;
    magnets(state, dt);
    speed = hypot(state.vx, state.vy);
    if (speed > 0) {
      drop = Math.min(speed, CONST.ROLL * dt);
      state.vx -= state.vx / speed * drop;
      state.vy -= state.vy / speed * drop;
      speed -= drop;
    }
    state.framePad = overlapsKind(state, 'pad');
    if (state.framePad && speed > 0) {
      drop = Math.min(speed, CONST.PAD * dt);
      state.vx -= state.vx / speed * drop;
      state.vy -= state.vy / speed * drop;
      speed -= drop;
    }
    if (state.brake && state.power > 0) {
      use = Math.min(dt, state.power / CONST.DRAIN);
      if (speed > 0.02) {
        drop = Math.min(speed, CONST.BRAKE * use);
        state.vx -= state.vx / speed * drop;
        state.vy -= state.vy / speed * drop;
      }
      state.power -= CONST.DRAIN * use;
      state.powerUsed += CONST.DRAIN * use;
      if (state.power < 0.001) state.power = 0;
    }
    sp = hypot(state.vx, state.vy);
    if (sp > CONST.MAXV) {
      state.vx *= CONST.MAXV / sp;
      state.vy *= CONST.MAXV / sp;
    }
    state.x += state.vx * dt;
    state.y += state.vy * dt;
    state.framePad = overlapsKind(state, 'pad');
    impact = resolve(state);
    if (impact > state.maxImpact) state.maxImpact = impact;
    updateZ(state);
    c = cellAt(state.level, state.x, state.y);
    if (c && c.k === 'pit') fail(state, 'pit');
  }

  function claimSupply(state, x, y) {
    var stack = [[x, y]];
    var guard = 0;
    var p, key, cell;
    while (stack.length && guard < 80) {
      guard += 1;
      p = stack.pop();
      key = p[0] + ',' + p[1];
      if (state.usedSupply[key]) continue;
      cell = cellAt(state.level, p[0] + 0.5, p[1] + 0.5);
      if (!cell || cell.k !== 'supply') continue;
      state.usedSupply[key] = true;
      stack.push([p[0] + 1, p[1]], [p[0] - 1, p[1]], [p[0], p[1] + 1], [p[0], p[1] - 1]);
    }
  }

  function triggers(state, dt) {
    var touching = {};
    var pressed = false;
    var inGoal = false;
    var sp = hypot(state.vx, state.vy);
    var cps, i, cp, dx, dy, key, c;
    state.speed = sp;
    state.onPad = state.framePad;
    forEachTouch(state, function (cell) {
      if (!cell) return;
      if (cell.k === 'supply') touching[cell.x + ',' + cell.y] = true;
      if (cell.k === 'button') pressed = true;
      if (cell.k === 'goal' && state.z === cell.z) inGoal = true;
    });
    c = cellAt(state.level, state.x, state.y);
    if (c && c.k === 'goal' && state.z === c.z) inGoal = true;
    Object.keys(touching).forEach(function (k) {
      if (!state.supplyTouch[k] && !state.usedSupply[k]) {
        var parts = k.split(',');
        claimSupply(state, parseInt(parts[0], 10), parseInt(parts[1], 10));
        state.power = 100;
        state.fills += 1;
        state.events.push('supply');
      }
    });
    state.supplyTouch = touching;
    cps = state.level.checkpoints || [];
    for (i = 0; i < cps.length; i++) {
      cp = cps[i];
      dx = state.x - (cp.x + 0.5);
      dy = state.y - (cp.y + 0.5);
      if (dx * dx + dy * dy <= CONST.CP_R * CONST.CP_R) {
        key = cp.x + ',' + cp.y;
        if (!state.seenCp[key]) {
          state.seenCp[key] = true;
          state.snapshot = capture(state, cp.x + 0.5, cp.y + 0.5, cp.z || 0);
          state.events.push('checkpoint');
        }
      }
    }
    if (pressed) {
      if (!state.doorOpen) state.events.push('door-open');
      state.doorOpen = true;
      state.doorTimer = null;
      state.buttonDown = true;
    } else {
      state.buttonDown = false;
      if (state.doorOpen && state.doorTimer == null && (state.level.doors || []).length) {
        state.doorTimer = state.level.doorTime;
      }
    }
    if (state.doorTimer != null) {
      state.doorTimer -= dt;
      if (state.doorTimer <= 0) {
        state.doorTimer = null;
        state.doorOpen = false;
        state.events.push('door-close');
        c = cellAt(state.level, state.x, state.y);
        if (c && c.k === 'door' && state.level.buttons.length) {
          var b = state.level.buttons[0];
          state.x = b.x + 0.5;
          state.y = b.y + 0.5;
          state.vx = 0;
          state.vy = 0;
        }
      }
    }
    if (state.maxImpact > CONST.HURT && !state.framePad && state.hitCd <= 0) {
      var dmg = Math.min(40, Math.round(14 + (state.maxImpact - CONST.HURT) * 4.6));
      state.integrity = Math.max(0, state.integrity - dmg);
      state.hits += 1;
      state.hitCd = CONST.HIT_CD;
      state.events.push('hit');
      if (state.integrity <= 0) {
        fail(state, 'break');
        return;
      }
    }
    if (sp > CONST.WARN && !state.warned) {
      state.warned = true;
      state.events.push('warn');
    } else if (sp < CONST.WARN * 0.82) state.warned = false;
    if (state.framePad && !state.padWas) state.events.push('pad');
    state.padWas = !!state.framePad;
    if (inGoal && sp < 3.1) {
      var bed = Math.min(sp, 36 * dt);
      if (sp > 0.0001) {
        state.vx -= state.vx / sp * bed;
        state.vy -= state.vy / sp * bed;
        sp = hypot(state.vx, state.vy);
        state.speed = sp;
      }
    }
    if (inGoal && sp < CONST.REST) {
      state.settle += dt;
      if (state.settle >= CONST.REST_T) {
        state.phase = 'win';
        state.vx = 0;
        state.vy = 0;
        state.events.push('win');
      }
    } else state.settle = 0;
    if (state.brake && state.power <= 0 && sp > 1.2) state.events.push('nopower');
  }

  function step(state, dt) {
    state.events = [];
    state.camera = 0;
    if (state.phase === 'win') return;
    if (state.phase === 'fail') {
      state.failT -= dt;
      if (state.failT <= 0) {
        applySnap(state, state.snapshot);
        state.events.push('restored');
      }
      return;
    }
    dt = clamp(dt, 0, 0.033);
    state.time += dt;
    state.hitCd = Math.max(0, state.hitCd - dt);
    state.maxImpact = 0;
    state.framePad = false;
    var left = dt;
    while (left > 1e-5) {
      var h = Math.min(CONST.SUB, left);
      integrate(state, h);
      if (state.phase === 'fail') return;
      left -= h;
    }
    triggers(state, dt);
  }

  function speedOf(state) { return hypot(state.vx, state.vy); }

  return {
    CONST: CONST,
    SENS: SENS,
    create: create,
    step: step,
    setFinger: setFinger,
    setBrake: setBrake,
    setSens: setSens,
    restart: restart,
    isSolid: isSolid,
    speedOf: speedOf,
    cellAt: cellAt
  };
});
