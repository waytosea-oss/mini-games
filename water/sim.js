/* Rivulet — 2.5D particle water (CPU PBF-lite / Clavet relaxation).
   Same family of solver as the fluid lab: predict positions, grid-hash neighbors,
   pressure + near-pressure relaxation, then collide with an invisible solid model
   aligned to the painted board. Rendering lives in fluid.js; this file is pure
   simulation so Node can prove every level is solvable.
   World: x right, y up, meters. Board is COLS*CELL by ROWS*CELL. Row 0 in level
   maps is the top. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.WaterSim = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var CELL = 0.08, COLS = 12, ROWS = 16;
  var BW = COLS * CELL, BH = ROWS * CELL;
  var RAD = 0.0054, HH = 0.0162, IHH = 1 / HH;
  var GRAV = -9.4;
  var FINE = 4, FS = CELL / FINE, FW = COLS * FINE, FH = ROWS * FINE;
  var MAXN = 1600;
  var HMASK = 4095;
  var MAXNB = 22;
  var K_ST = 8.5, K_NEAR = 24, RHO0 = 2.45, XSPH = 0.08;
  var PRESETS = {
    low: { name: 'Low', sub: 50, maxN: 560, rate: 250, radMul: 1.34 },
    high: { name: 'High', sub: 72, maxN: 1200, rate: 460, radMul: 1 }
  };
  var MIX = { '0,1': 3, '1,0': 3, '1,2': 4, '2,1': 4, '0,2': 5, '2,0': 5 };

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function hypot(x, y) { return Math.sqrt(x * x + y * y); }

  function toWorld(c, r) { return { x: c * CELL, y: (ROWS - r) * CELL }; }

  function create(level, opt) {
    opt = opt || {};
    var preset = PRESETS[opt.preset] || PRESETS.high;
    var rateMul = opt.rateMul || 1;
    var P = {
      n: 0,
      x: new Float32Array(MAXN), y: new Float32Array(MAXN), z: new Float32Array(MAXN),
      vx: new Float32Array(MAXN), vy: new Float32Array(MAXN), vz: new Float32Array(MAXN),
      ox: new Float32Array(MAXN), oy: new Float32Array(MAXN),
      age: new Float32Array(MAXN), cid: new Uint8Array(MAXN), steam: new Uint8Array(MAXN),
      rho: new Float32Array(MAXN)
    };
    var hStart = new Int32Array(HMASK + 2), hOf = new Int32Array(MAXN), sorted = new Int32Array(MAXN);
    var CI = new Int32Array(MAXN), CJ = new Int32Array(MAXN);
    var nbI = new Int32Array(MAXN * MAXNB), nbQ = new Float32Array(MAXN * MAXNB), nbN = new Uint8Array(MAXN);
    var PR = new Float32Array(MAXN), PN = new Float32Array(MAXN);

    var base = new Uint8Array(COLS * ROWS);
    var cup = new Uint8Array(COLS * ROWS);
    var map = level.map;
    for (var r = 0; r < ROWS; r++) {
      var row = map[r] || '';
      for (var c = 0; c < COLS; c++) {
        var ch = row[c] || '.';
        var i = r * COLS + c;
        if (ch === '#') base[i] = 1;
        else if (ch === 'C') cup[i] = 1;
      }
    }
    var dyn = new Uint8Array(COLS * ROWS);
    var fineBase = new Uint8Array(FW * FH);
    var fineHard = new Uint8Array(FW * FH);
    var fineInk = new Uint8Array(FW * FH);
    var inkRev = 1, inkBuilt = 0;

    function sourcesOf(ch, cid) {
      var list = [];
      for (var r = 0; r < ROWS; r++) {
        var row = map[r] || '';
        for (var c = 0; c < COLS; c++) if (row[c] === ch) list.push({ c: c, r: r, cid: cid });
      }
      if (!list.length) return null;
      var sx = 0, sy = 0, top = 99;
      for (var k = 0; k < list.length; k++) {
        sx += list[k].c + 0.5; sy += (ROWS - list[k].r - 0.5);
        if (list[k].r < top) top = list[k].r;
      }
      sx = sx / list.length * CELL;
      var yTop = (ROWS - top) * CELL - RAD * 2;
      return { x: sx, y: yTop, cid: cid };
    }
    var sources = [];
    var s0 = sourcesOf('S', 0); if (s0) sources.push(s0);
    var s1 = sourcesOf('A', 1); if (s1) sources.push(s1);
    var s2 = sourcesOf('B', 2); if (s2) sources.push(s2);

    var strokes = [];
    var curStroke = null;
    var seed = ((level.id || 1) * 10007 + 11) >>> 0;
    var rng = mulberry32(seed);
    var emitAcc = sources.map(function () { return 0; });
    var time = 0, playTime = 0, playing = false;
    var inCup = 0, fill = 0, won = false, winTime = 0, stars = 0;
    var splash = 0, absorbPulse = 0;
    var goal = Math.max(28, Math.round((level.goal || 120) * (preset.rate / PRESETS.high.rate)));
    var budget = Math.max(goal + 8, Math.round(goal * (level.tank || 2.55)));
    var emitted = 0;
    var hold0 = !!opt.holdPour;
    var hold = hold0;

    var planks = (level.planks || []).map(function (p) {
      return { c0: p.c0, r0: p.r0, c1: p.c1, r1: p.r1, len: p.len, thick: p.thick || 0.48, ang: p.ang, t: p.t0, t0: p.t0 };
    });
    var pipes = (level.pipes || []).map(function (p) { return { c: p.c, r: p.r, rot: p.rot | 0 }; });
    var pins = (level.pins || []).map(function (p) { return { c: p.c, r: p.r, w: p.w, h: p.h, open: 0 }; });
    var valves = (level.valves || []).map(function (v) { return { c: v.c, r: v.r, w: v.w, h: v.h, open: !!v.open }; });
    var sponges = (level.sponges || []).map(function (s) {
      return { c: s.c, r: s.r, w: s.w, h: s.h, cap: Math.max(8, Math.round((s.cap || 40) * (preset.rate / PRESETS.high.rate))), held: 0, latch: !!s.latch };
    });
    var heats = level.heats || [];
    var condensers = level.condensers || [];
    var flaps = level.flaps || [];
    var movers = (level.movers || []).map(function (m) {
      return { c: m.c, r: m.r, w: m.w, h: m.h, axis: m.axis || 'x', amp: m.amp, speed: m.speed, phase: m.phase || 0 };
    });
    var history = [];

    function stampCell(mask, c, rTop) {
      if (c < 0 || rTop < 0 || c >= COLS || rTop >= ROWS) return;
      var fy0 = (ROWS - 1 - rTop) * FINE, fx0 = c * FINE;
      for (var iy = 0; iy < FINE; iy++) for (var ix = 0; ix < FINE; ix++) mask[(fy0 + iy) * FW + fx0 + ix] = 1;
    }
    function stampCircle(mask, x, y, rad) {
      var c0 = Math.floor((x - rad) / FS), c1 = Math.floor((x + rad) / FS);
      var r0 = Math.floor((y - rad) / FS), r1 = Math.floor((y + rad) / FS);
      var r2 = rad * rad;
      for (var cy = r0; cy <= r1; cy++) for (var cx = c0; cx <= c1; cx++) {
        if (cx < 0 || cy < 0 || cx >= FW || cy >= FH) continue;
        var px = (cx + 0.5) * FS - x, py = (cy + 0.5) * FS - y;
        if (px * px + py * py <= r2) mask[cy * FW + cx] = 1;
      }
    }
    function stampOBB(mask, pose) {
      var ca = Math.cos(pose.ang), sa = Math.sin(pose.ang);
      var rad = Math.hypot(pose.hx, pose.hy) + FS;
      var c0 = Math.floor((pose.cx - rad) / FS), c1 = Math.floor((pose.cx + rad) / FS);
      var r0 = Math.floor((pose.cy - rad) / FS), r1 = Math.floor((pose.cy + rad) / FS);
      for (var cy = r0; cy <= r1; cy++) for (var cx = c0; cx <= c1; cx++) {
        if (cx < 0 || cy < 0 || cx >= FW || cy >= FH) continue;
        var px = (cx + 0.5) * FS - pose.cx, py = (cy + 0.5) * FS - pose.cy;
        var lx = px * ca + py * sa, ly = -px * sa + py * ca;
        if (Math.abs(lx) <= pose.hx + 0.012 && Math.abs(ly) <= pose.hy + 0.012) mask[cy * FW + cx] = 1;
      }
    }
    for (var br = 0; br < ROWS; br++) for (var bc = 0; bc < COLS; bc++) if (base[br * COLS + bc]) stampCell(fineBase, bc, br);
    function inRect(c, r, R) { return c >= R.c && r >= R.r && c < R.c + R.w && r < R.r + R.h; }
    function worldCell(x, y) {
      var c = Math.floor(x / CELL), r = ROWS - 1 - Math.floor(y / CELL);
      return { c: c, r: r };
    }

    function pipeCells(p, into) {
      var rot = ((p.rot % 4) + 4) % 4;
      var mask = [
        [1, 0, 1, 1, 0, 1, 1, 0, 1],
        [1, 0, 1, 1, 0, 0, 1, 1, 1],
        [1, 1, 1, 0, 0, 0, 1, 1, 1],
        [1, 0, 1, 0, 0, 1, 1, 1, 1]
      ][rot];
      for (var k = 0; k < 9; k++) if (mask[k]) into.push([p.c + (k % 3), p.r + ((k / 3) | 0)]);
    }

    function rebuildInk() {
      if (inkBuilt === inkRev) return;
      fineInk.fill(0);
      var rad = 0.034;
      for (var s = 0; s < strokes.length; s++) {
        var pts = strokes[s].pts;
        for (var k = 1; k < pts.length; k++) {
          var ax = pts[k - 1].x, ay = pts[k - 1].y, bx = pts[k].x, by = pts[k].y;
          var L = hypot(bx - ax, by - ay), n = Math.max(1, Math.ceil(L / 0.012));
          for (var t = 0; t <= n; t++) stampCircle(fineInk, ax + (bx - ax) * t / n, ay + (by - ay) * t / n, rad);
        }
        if (pts.length === 1) stampCircle(fineInk, pts[0].x, pts[0].y, rad);
      }
      inkBuilt = inkRev;
    }
    function rebuildFine() {
      rebuildDyn();
      fineHard.set(fineBase);
      for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) if (dyn[r * COLS + c]) stampCell(fineHard, c, r);
      for (var p = 0; p < planks.length; p++) stampOBB(fineHard, plankPose(planks[p], planks[p].t));
      for (var m = 0; m < movers.length; m++) stampOBB(fineHard, moverPose(movers[m], time));
      rebuildInk();
    }
    function blocked(mask, x, y) {
      var fx = Math.floor(x / FS), fy = Math.floor(y / FS);
      if (fx < 0 || fy < 0 || fx >= FW || fy >= FH) return false;
      return mask[fy * FW + fx] === 1;
    }
    function rebuildDyn() {
      dyn.fill(0);
      var mark = function (c, r) { if (c >= 0 && r >= 0 && c < COLS && r < ROWS) dyn[r * COLS + c] = 1; };
      for (var i = 0; i < pipes.length; i++) {
        var cells = []; pipeCells(pipes[i], cells);
        for (var k = 0; k < cells.length; k++) mark(cells[k][0], cells[k][1]);
      }
      for (var p = 0; p < pins.length; p++) if (pins[p].open < 0.5) {
        var pin = pins[p];
        for (var y = 0; y < pin.h; y++) for (var x = 0; x < pin.w; x++) mark(pin.c + x, pin.r + y);
      }
      for (var v = 0; v < valves.length; v++) if (!valves[v].open) {
        var valve = valves[v];
        for (var y2 = 0; y2 < valve.h; y2++) for (var x2 = 0; x2 < valve.w; x2++) mark(valve.c + x2, valve.r + y2);
      }
      for (var s = 0; s < sponges.length; s++) if (!sponges[s].latch && sponges[s].held >= sponges[s].cap) {
        var sp = sponges[s];
        for (var y3 = 0; y3 < sp.h; y3++) for (var x3 = 0; x3 < sp.w; x3++) mark(sp.c + x3, sp.r + y3);
      }
    }

    function hsh(i, j) { return (Math.imul(i, 73856093) ^ Math.imul(j, 19349663)) & HMASK; }
    function buildGrid() {
      hStart.fill(0);
      for (var i = 0; i < P.n; i++) {
        var a = Math.floor(P.x[i] * IHH), b = Math.floor(P.y[i] * IHH);
        CI[i] = a; CJ[i] = b;
        var h = hsh(a, b); hOf[i] = h; hStart[h + 1]++;
      }
      for (var h = 0; h <= HMASK; h++) hStart[h + 1] += hStart[h];
      var fillH = hStart.slice(0, HMASK + 1);
      for (var i2 = 0; i2 < P.n; i2++) sorted[fillH[hOf[i2]]++] = i2;
    }
    function relax(dt) {
      var dt2 = dt * dt, H2 = HH * HH;
      buildGrid();
      for (var i = 0; i < P.n; i++) {
        if (P.steam[i]) { nbN[i] = 0; P.rho[i] = 0; PR[i] = 0; PN[i] = 0; continue; }
        var xi = P.x[i], yi = P.y[i], ci = CI[i], cj = CJ[i];
        var rho = 0, rhoN = 0, cnt = 0, baseI = i * MAXNB;
        for (var dj = -1; dj <= 1; dj++) for (var di = -1; di <= 1; di++) {
          var h = hsh(ci + di, cj + dj);
          for (var s = hStart[h], e = hStart[h + 1]; s < e; s++) {
            var j = sorted[s]; if (j === i || P.steam[j]) continue;
            var dx = P.x[j] - xi, dy = P.y[j] - yi, r2 = dx * dx + dy * dy;
            if (r2 >= H2 || r2 < 1e-12) continue;
            var q = 1 - Math.sqrt(r2) * IHH;
            rho += q * q; rhoN += q * q * q;
            if (cnt < MAXNB && j > i) {
              nbI[baseI + cnt] = j; nbQ[baseI + cnt] = q; cnt++;
              var key = P.cid[i] + ',' + P.cid[j], mix = MIX[key];
              if (mix != null && q > 0.42) { P.cid[i] = mix; P.cid[j] = mix; }
            }
          }
        }
        nbN[i] = cnt; P.rho[i] = rho;
        PR[i] = K_ST * (rho - RHO0); PN[i] = K_NEAR * rhoN;
      }
      for (var i2 = 0; i2 < P.n; i2++) {
        var cnt2 = nbN[i2]; if (!cnt2) continue;
        var b2 = i2 * MAXNB;
        for (var k = 0; k < cnt2; k++) {
          var j2 = nbI[b2 + k], q2 = nbQ[b2 + k];
          var dx2 = P.x[j2] - P.x[i2], dy2 = P.y[j2] - P.y[i2];
          var r = (1 - q2) * HH || 1e-6;
          var pr = 0.5 * (PR[i2] + PR[j2]), pn = 0.5 * (PN[i2] + PN[j2]);
          var D = dt2 * (pr * q2 + pn * q2 * q2) * 0.5 / r;
          if (D > 0.045) D = 0.045; else if (D < -0.045) D = -0.045;
          P.x[j2] += dx2 * D; P.y[j2] += dy2 * D;
          P.x[i2] -= dx2 * D; P.y[i2] -= dy2 * D;
          var wx = (P.vx[j2] - P.vx[i2]) * q2 * XSPH * 0.5;
          var wy = (P.vy[j2] - P.vy[i2]) * q2 * XSPH * 0.5;
          P.vx[i2] += wx; P.vy[i2] += wy; P.vx[j2] -= wx; P.vy[j2] -= wy;
        }
      }
    }

    function circleRect(cx, cy, rad, rx, ry, rw, rh) {
      var qx = Math.max(rx, Math.min(cx, rx + rw));
      var qy = Math.max(ry, Math.min(cy, ry + rh));
      var dx = cx - qx, dy = cy - qy, d2 = dx * dx + dy * dy;
      if (d2 > rad * rad) return null;
      if (d2 < 1e-10) {
        var dl = cx - rx, dr = rx + rw - cx, db = cy - ry, dt = ry + rh - cy;
        var m = Math.min(dl, dr, db, dt);
        if (m === dl) return { nx: -1, ny: 0, depth: rad + dl };
        if (m === dr) return { nx: 1, ny: 0, depth: rad + dr };
        if (m === db) return { nx: 0, ny: -1, depth: rad + db };
        return { nx: 0, ny: 1, depth: rad + dt };
      }
      var d = Math.sqrt(d2);
      return { nx: dx / d, ny: dy / d, depth: rad - d };
    }
    function respond(i, hit, gutter) {
      P.x[i] += hit.nx * hit.depth;
      P.y[i] += hit.ny * hit.depth;
      var vn = P.vx[i] * hit.nx + P.vy[i] * hit.ny;
      if (vn < 0) {
        P.vx[i] -= 1.04 * vn * hit.nx;
        P.vy[i] -= 1.04 * vn * hit.ny;
      }
      P.vx[i] *= 0.986; P.vy[i] *= 0.986;
      if (gutter && hit.ux != null) {
        var gx = hit.ux, gy = hit.uy;
        if (gy > 0) { gx = -gx; gy = -gy; }
        if (gy < -0.08) { P.vx[i] += gx * 7.5 * hit.dt; P.vy[i] += gy * 7.5 * hit.dt; }
      }
    }
    function collideMask(i, mask) {
      for (var pass = 0; pass < 2; pass++) {
        var x = P.x[i], y = P.y[i];
        var fx = Math.floor(x / FS), fy = Math.floor(y / FS);
        var best = null, bd = 0;
        for (var dy = -2; dy <= 2; dy++) for (var dx = -2; dx <= 2; dx++) {
          var cx = fx + dx, cy = fy + dy;
          if (cx < 0 || cy < 0 || cx >= FW || cy >= FH) continue;
          if (mask[cy * FW + cx] !== 1) continue;
          var hit = circleRect(x, y, RAD, cx * FS, cy * FS, FS, FS);
          if (hit && hit.depth > bd) { best = hit; bd = hit.depth; }
        }
        if (!best) break;
        respond(i, best, false);
      }
    }
    function segmentFree(mask, ox, oy, x, y) {
      var dist = hypot(x - ox, y - oy);
      var n = Math.max(1, Math.ceil(dist / (FS * 0.65)));
      for (var s = 1; s <= n; s++) {
        var t = s / n;
        if (blocked(mask, ox + (x - ox) * t, oy + (y - oy) * t)) return false;
      }
      return true;
    }
    function sweep(i, mask) {
      var ox = P.ox[i], oy = P.oy[i], x = P.x[i], y = P.y[i];
      if (segmentFree(mask, ox, oy, x, y)) return;
      if (segmentFree(mask, ox, oy, x, oy)) { P.y[i] = oy; P.vy[i] *= -0.05; return; }
      if (segmentFree(mask, ox, oy, ox, y)) { P.x[i] = ox; P.vx[i] *= -0.05; return; }
      P.x[i] = ox; P.y[i] = oy;
    }
    function plankPose(p, t) {
      var a = toWorld(p.c0, p.r0), b = toWorld(p.c1, p.r1);
      var cx = a.x + (b.x - a.x) * t, cy = a.y + (b.y - a.y) * t;
      var ang = p.ang != null ? p.ang : Math.atan2(b.y - a.y, b.x - a.x);
      return { cx: cx, cy: cy, ang: ang, hx: p.len * CELL * 0.5, hy: p.thick * CELL * 0.5 };
    }
    function moverPose(m, t) {
      var wob = Math.sin(t * m.speed + m.phase) * m.amp;
      var cc = m.c + 0.5 + (m.axis === 'x' ? wob : 0);
      var rr = m.r + 0.5 + (m.axis === 'y' ? wob : 0);
      var w = toWorld(cc, rr);
      return { cx: w.x, cy: w.y, ang: 0, hx: m.w * CELL * 0.5, hy: m.h * CELL * 0.5 };
    }
    function collideOBB(i, pose) {
      var ca = Math.cos(pose.ang), sa = Math.sin(pose.ang);
      var dx = P.x[i] - pose.cx, dy = P.y[i] - pose.cy;
      var lx = dx * ca + dy * sa, ly = -dx * sa + dy * ca;
      var hit = circleRect(lx, ly, RAD, -pose.hx, -pose.hy, pose.hx * 2, pose.hy * 2);
      if (!hit) return;
      var nx = hit.nx * ca - hit.ny * sa, ny = hit.nx * sa + hit.ny * ca;
      respond(i, { nx: nx, ny: ny, depth: hit.depth }, false);
    }
    function capsulesOf(stroke) {
      var out = [];
      var pts = stroke.pts;
      for (var i = 1; i < pts.length; i++) out.push([pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y]);
      return out;
    }
    function guideInk(i, dt) {
      if (!strokes.length || P.steam[i]) return;
      var best = 0.07, tx = 0, ty = 0, ux = 0, uy = 0, found = false;
      for (var s = 0; s < strokes.length; s++) {
        var pts = strokes[s].pts;
        for (var k = 1; k < pts.length; k++) {
          var ax = pts[k - 1].x, ay = pts[k - 1].y, bx = pts[k].x, by = pts[k].y;
          var abx = bx - ax, aby = by - ay, L2 = abx * abx + aby * aby || 1e-8;
          var t = ((P.x[i] - ax) * abx + (P.y[i] - ay) * aby) / L2;
          if (t < 0) t = 0; else if (t > 1) t = 1;
          var qx = ax + abx * t, qy = ay + aby * t;
          var dx = P.x[i] - qx, dy = P.y[i] - qy, d = hypot(dx, dy);
          if (d < best) { best = d; tx = qx - P.x[i]; ty = qy - P.y[i]; ux = abx; uy = aby; found = true; }
        }
      }
      if (!found) return;
      var pull = (0.07 - best) * 36;
      var dl = hypot(tx, ty) || 1;
      P.vx[i] += tx / dl * pull * dt;
      P.vy[i] += ty / dl * pull * dt;
      var ul = hypot(ux, uy) || 1; ux /= ul; uy /= ul;
      if (uy > 0) { ux = -ux; uy = -uy; }
      if (uy < -0.12) { P.vx[i] += ux * 4.2 * dt; P.vy[i] += uy * 4.2 * dt; }
    }
    function collideFlaps(i) {
      if (P.steam[i]) return;
      for (var f = 0; f < flaps.length; f++) {
        var fl = flaps[f];
        var y = (ROWS - fl.r - 0.35) * CELL;
        var x0 = fl.c * CELL, x1 = (fl.c + fl.w) * CELL;
        if (P.x[i] < x0 || P.x[i] > x1) continue;
        if (P.oy[i] >= y - 0.002 && P.y[i] < y + RAD && P.vy[i] <= 0.35) {
          P.y[i] = y + RAD;
          if (P.vy[i] < 0) P.vy[i] *= -0.04;
          P.vx[i] *= 0.99;
        }
      }
    }

    function zoneAt(list, c, r) {
      for (var i = 0; i < list.length; i++) if (inRect(c, r, list[i])) return list[i];
      return null;
    }

    function kill(i) {
      var j = --P.n;
      if (i === j) return;
      P.x[i] = P.x[j]; P.y[i] = P.y[j]; P.z[i] = P.z[j];
      P.vx[i] = P.vx[j]; P.vy[i] = P.vy[j]; P.vz[i] = P.vz[j];
      P.ox[i] = P.ox[j]; P.oy[i] = P.oy[j];
      P.age[i] = P.age[j]; P.cid[i] = P.cid[j]; P.steam[i] = P.steam[j]; P.rho[i] = P.rho[j];
    }

    function emit(dt) {
      if (hold) return;
      var sp = 1.55;
      for (var s = 0; s < sources.length; s++) {
        var src = sources[s];
        if (emitted >= budget) continue;
        emitAcc[s] += preset.rate * rateMul * dt * (sources.length > 1 ? 0.72 : 1);
        var n = Math.floor(emitAcc[s]); emitAcc[s] -= n;
        for (var k = 0; k < n && emitted < budget && P.n < preset.maxN && P.n < MAXN; k++) {
          emitted++;
          var f = (k + 0.5) / Math.max(1, n);
          var back = (1 - f) * dt;
          var i = P.n++;
          var jx = (rng() - 0.5) * 0.014;
          P.x[i] = src.x + jx;
          P.y[i] = src.y - sp * back;
          P.z[i] = 0.012 + rng() * 0.02;
          P.vx[i] = jx * 3;
          P.vy[i] = -sp;
          P.vz[i] = 0;
          P.ox[i] = P.x[i]; P.oy[i] = P.y[i];
          P.age[i] = 0; P.cid[i] = src.cid; P.steam[i] = 0; P.rho[i] = 0;
        }
      }
    }

    function step(dt) {
      if (dt > 0.05) dt = 0.05;
      if (won) dt = Math.min(dt, 0.02);
      var sub = 1 / preset.sub;
      var acc = step._acc || 0;
      acc += dt;
      var guard = 0;
      while (acc >= sub - 1e-9 && guard < 5) { substep(sub); acc -= sub; guard++; }
      if (guard === 5) acc = 0;
      step._acc = acc;
      time += dt;
      if (playing && !won) playTime += dt;
      for (var i = 0; i < pins.length; i++) if (pins[i].open > 0 && pins[i].open < 1) pins[i].open = Math.min(1, pins[i].open + dt * 2.2);
    }
    function substep(dt) {
      rebuildDyn();
      emit(dt);
      var n = P.n;
      for (var i = 0; i < n; i++) {
        if (P.steam[i]) {
          P.vy[i] += 16 * dt;
          if (condensers.length) {
            var tx = 0;
            for (var c = 0; c < condensers.length; c++) tx += (condensers[c].c + condensers[c].w * 0.5) * CELL;
            tx /= condensers.length;
            P.vx[i] += (tx > P.x[i] ? 1 : -1) * 3.4 * dt;
          }
        } else { P.vy[i] += GRAV * dt; guideInk(i, dt); }
        var drag = P.steam[i] ? 0.35 : 0.12;
        var dmp = 1 - drag * dt;
        P.vx[i] *= dmp; P.vy[i] *= dmp;
        P.ox[i] = P.x[i]; P.oy[i] = P.y[i];
        P.x[i] += P.vx[i] * dt; P.y[i] += P.vy[i] * dt;
        P.age[i] += dt;
      }
      relax(dt);
      for (var i2 = 0; i2 < P.n; i2++) {
        P.vx[i2] = (P.x[i2] - P.ox[i2]) / dt;
        P.vy[i2] = (P.y[i2] - P.oy[i2]) / dt;
        var sp2 = P.vx[i2] * P.vx[i2] + P.vy[i2] * P.vy[i2];
        if (sp2 > 9) { var s = 3 / Math.sqrt(sp2); P.vx[i2] *= s; P.vy[i2] *= s; }
      }
      rebuildFine();
      var prevCup = inCup;
      inCup = 0;
      for (var i3 = P.n - 1; i3 >= 0; i3--) {
        sweep(i3, fineHard);
        collideMask(i3, fineHard);
        if (!P.steam[i3]) { sweep(i3, fineInk); collideMask(i3, fineInk); collideFlaps(i3); }
        var wc = worldCell(P.x[i3], P.y[i3]);
        if (!P.steam[i3] && zoneAt(heats, wc.c, wc.r)) {
          P.steam[i3] = 1; P.vy[i3] = Math.abs(P.vy[i3]) + 1.4; P.vx[i3] *= 0.3;
        }
        if (P.steam[i3] && zoneAt(condensers, wc.c, wc.r)) {
          P.steam[i3] = 0; P.vy[i3] = -0.55; P.vx[i3] *= 0.4;
        }
        if (!P.steam[i3]) {
          var spg = null;
          for (var s = 0; s < sponges.length; s++) if (!sponges[s].latch && sponges[s].held < sponges[s].cap && inRect(wc.c, wc.r, sponges[s])) { spg = sponges[s]; break; }
          if (spg) { spg.held++; absorbPulse++; kill(i3); continue; }
        }
        if (P.x[i3] < -0.02 || P.x[i3] > BW + 0.02 || P.y[i3] < -0.03 || P.y[i3] > BH + 0.08 || P.age[i3] > 14) { kill(i3); continue; }
        if (wc.c >= 0 && wc.r >= 0 && wc.c < COLS && wc.r < ROWS && cup[wc.r * COLS + wc.c]) {
          var ok = level.cupColor == null || P.cid[i3] === level.cupColor;
          if (ok && !P.steam[i3]) inCup++;
          else if (!ok) { kill(i3); continue; }
        }
      }
      fill = clamp(inCup / goal, 0, 1);
      if (inCup > prevCup + 2) splash += inCup - prevCup;
      var need = level.need == null ? 0.78 : level.need;
      if (!won && fill >= need && time > 0.35) {
        won = true; winTime = playTime;
        stars = scoreStars();
      } else if (won) {
        var ns = scoreStars();
        if (ns > stars) stars = ns;
      }
    }

    function inkUsed() {
      var m = 0;
      for (var s = 0; s < strokes.length; s++) {
        var pts = strokes[s].pts;
        for (var i = 1; i < pts.length; i++) m += hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
      }
      return m;
    }
    function scoreStars() {
      var u = inkUsed(), bud = level.ink || 0;
      var inkOk3 = !bud || u <= (level.ink3 == null ? bud : level.ink3) + 1e-4;
      var inkOk2 = !bud || u <= (level.ink2 == null ? bud : level.ink2) + 1e-4;
      var t3 = (level.par && level.par[1]) || 22;
      var t2 = (level.par && level.par[0]) || 40;
      if (fill >= 0.96 && inkOk3 && playTime <= t3) return 3;
      if (fill >= 0.86 && inkOk2 && playTime <= t2) return 2;
      return 1;
    }

    function pushHist() {
      history.push(JSON.stringify({
        strokes: strokes,
        planks: planks.map(function (p) { return p.t; }),
        pipes: pipes.map(function (p) { return p.rot; }),
        pins: pins.map(function (p) { return p.open; }),
        valves: valves.map(function (v) { return v.open; }),
        sponges: sponges.map(function (s) { return s.latch; })
      }));
      if (history.length > 40) history.shift();
    }
    function resetWater() {
      P.n = 0; emitted = 0; emitAcc = sources.map(function () { return 0; });
      rng = mulberry32(seed);
      time = 0; step._acc = 0; inCup = 0; fill = 0; won = false; winTime = 0; stars = 0; splash = 0;
      for (var s = 0; s < sponges.length; s++) { sponges[s].held = 0; }
      inkRev++;
    }
    function restore(raw) {
      var o = JSON.parse(raw);
      strokes = o.strokes;
      for (var i = 0; i < planks.length; i++) planks[i].t = o.planks[i];
      for (var k = 0; k < pipes.length; k++) pipes[k].rot = o.pipes[k];
      for (var p = 0; p < pins.length; p++) pins[p].open = o.pins[p];
      for (var v = 0; v < valves.length; v++) valves[v].open = o.valves[v];
      for (var s = 0; s < sponges.length; s++) sponges[s].latch = !!(o.sponges && o.sponges[s]);
      resetWater();
    }

    function applySolution() {
      var sol = level.solution || {};
      strokes = [];
      (sol.ink || []).forEach(function (line) {
        var pts = line.map(function (p) { return toWorld(p[0], p[1]); });
        if (pts.length >= 2) strokes.push({ pts: resample(pts) });
      });
      (sol.planks || []).forEach(function (t, i) { if (planks[i]) planks[i].t = t; });
      (sol.pipes || []).forEach(function (rot, i) { if (pipes[i]) pipes[i].rot = rot; });
      (sol.pins || []).forEach(function (on, i) { if (pins[i] && on) pins[i].open = 1; });
      (sol.valves || []).forEach(function (on, i) { if (valves[i]) valves[i].open = !!on; });
      (sol.sponges || []).forEach(function (on, i) { if (sponges[i] && on) sponges[i].latch = true; });
      resetWater();
    }

    function resample(pts) {
      var out = [pts[0]], acc = 0, stepL = 0.028;
      for (var i = 1; i < pts.length; i++) {
        var ax = out[out.length - 1].x, ay = out[out.length - 1].y;
        var bx = pts[i].x, by = pts[i].y;
        var dx = bx - ax, dy = by - ay, L = hypot(dx, dy);
        if (L < 1e-5) continue;
        var d = stepL - acc;
        while (d <= L) {
          var t = d / L;
          out.push({ x: ax + dx * t, y: ay + dy * t });
          ax = out[out.length - 1].x; ay = out[out.length - 1].y;
          dx = bx - ax; dy = by - ay; L = hypot(dx, dy); d = stepL; acc = 0;
        }
        acc += L;
      }
      var last = pts[pts.length - 1];
      var q = out[out.length - 1];
      if (hypot(q.x - last.x, q.y - last.y) > 0.01) out.push({ x: last.x, y: last.y });
      return out;
    }

    function inkLeft() {
      var bud = level.ink || 0;
      if (!bud) return 0;
      return Math.max(0, bud - inkUsed());
    }

    var api = {
      P: P, level: level, preset: preset, CELL: CELL, COLS: COLS, ROWS: ROWS, BW: BW, BH: BH, RAD: RAD,
      sources: sources, base: base, cup: cup,
      get strokes() { return strokes; },
      get planks() { return planks; }, get pipes() { return pipes; }, get pins() { return pins; },
      get valves() { return valves; }, get sponges() { return sponges; },
      get heats() { return heats; }, get condensers() { return condensers; },
      get flaps() { return flaps; }, get movers() { return movers; },
      get time() { return time; }, get playTime() { return playTime; },
      get fill() { return fill; }, get inCup() { return inCup; }, get goal() { return goal; },
      get won() { return won; }, get stars() { return stars || (won ? scoreStars() : 0); },
      get winTime() { return winTime; },
      get inkUsed() { return inkUsed(); }, get inkLeft() { return inkLeft(); },
      get splash() { return splash; }, takeSplash: function () { var s = splash; splash = 0; return s; },
      takeAbsorb: function () { var s = absorbPulse; absorbPulse = 0; return s; },
      step: step,
      resetWater: resetWater,
      restart: function () { strokes = []; history = [];
        for (var i = 0; i < planks.length; i++) planks[i].t = planks[i].t0;
        for (var k = 0; k < pipes.length; k++) pipes[k].rot = (level.pipes[k].rot | 0);
        for (var p = 0; p < pins.length; p++) pins[p].open = 0;
        for (var v = 0; v < valves.length; v++) valves[v].open = !!level.valves[v].open;
        for (var s = 0; s < sponges.length; s++) sponges[s].latch = !!level.sponges[s].latch;
        playTime = 0; playing = false; hold = hold0; resetWater();
      },
      releasePour: function () { hold = false; },
      holdPour: function () { hold = true; },
      get pouring() { return !hold; },
      exportState: function () {
        return {
          strokes: strokes.map(function (s) { return s.pts.map(function (p) { return { x: p.x, y: p.y }; }); }),
          planks: planks.map(function (p) { return p.t; }),
          pipes: pipes.map(function (p) { return p.rot; }),
          pins: pins.map(function (p) { return p.open; }),
          valves: valves.map(function (v) { return v.open; }),
          sponges: sponges.map(function (s) { return s.latch; }),
          playTime: playTime, pouring: !hold
        };
      },
      importState: function (st) {
        strokes = (st.strokes || []).map(function (pts) { return { pts: pts.map(function (p) { return { x: p.x, y: p.y }; }) }; });
        for (var i = 0; i < planks.length; i++) planks[i].t = st.planks && st.planks[i] != null ? st.planks[i] : planks[i].t0;
        for (var k = 0; k < pipes.length; k++) if (st.pipes && st.pipes[k] != null) pipes[k].rot = st.pipes[k];
        for (var p = 0; p < pins.length; p++) pins[p].open = st.pins && st.pins[p] ? st.pins[p] : 0;
        for (var v = 0; v < valves.length; v++) if (st.valves && st.valves[v] != null) valves[v].open = !!st.valves[v];
        for (var s = 0; s < sponges.length; s++) sponges[s].latch = !!(st.sponges && st.sponges[s]);
        hold = st.pouring ? false : hold0;
        playTime = st.playTime || 0;
        playing = playTime > 0 || strokes.length > 0;
        history = [];
        resetWater();
      },
      markPlaying: function () { playing = true; },
      applySolution: applySolution,
      posePlank: function (i) { return plankPose(planks[i], planks[i].t); },
      poseMover: function (i) { return moverPose(movers[i], time); },
      pipeCells: function (i) { var c = []; pipeCells(pipes[i], c); return c; },
      dyn: dyn, rebuildDyn: rebuildDyn,
      inkLeftRatio: function () { var b = level.ink || 0; return b ? inkLeft() / b : 1; },
      beginStroke: function (x, y) {
        if (!(level.ink > 0) || inkLeft() <= 0.02) return false;
        pushHist();
        curStroke = { pts: [{ x: x, y: y }] };
        strokes.push(curStroke);
        inkRev++;
        playing = true;
        return true;
      },
      extendStroke: function (x, y) {
        if (!curStroke) return false;
        var pts = curStroke.pts, last = pts[pts.length - 1];
        var dx = x - last.x, dy = y - last.y, L = hypot(dx, dy);
        if (L < 0.018) return true;
        if (inkUsed() + L > (level.ink || 0) + 1e-4) {
          var allow = (level.ink || 0) - inkUsed();
          if (allow <= 0.004) return false;
          var t = allow / L;
          pts.push({ x: last.x + dx * t, y: last.y + dy * t });
          inkRev++;
          return false;
        }
        pts.push({ x: x, y: y });
        inkRev++;
        return true;
      },
      endStroke: function () {
        if (!curStroke) return;
        if (curStroke.pts.length < 2) strokes.pop();
        else curStroke.pts = resample(curStroke.pts);
        curStroke = null;
        inkRev++;
        playing = true;
      },
      cancelStroke: function () { curStroke = null; },
      undo: function () {
        if (!history.length) return false;
        restore(history.pop());
        playing = true;
        return true;
      },
      canUndo: function () { return history.length > 0; },
      setPlank: function (i, t) {
        if (!planks[i]) return;
        pushHist(); planks[i].t = clamp(t, 0, 1); resetWater(); playing = true;
      },
      nudgePlank: function (i, t) { if (planks[i]) planks[i].t = clamp(t, 0, 1); },
      commitPlank: function () { resetWater(); playing = true; },
      prepDrag: function () { pushHist(); },
      rotatePipe: function (i) {
        if (!pipes[i]) return;
        pushHist(); pipes[i].rot = (pipes[i].rot + 1) % 4; resetWater(); playing = true;
      },
      pullPin: function (i) {
        if (!pins[i] || pins[i].open > 0) return;
        pushHist(); pins[i].open = 0.01; resetWater(); playing = true;
      },
      squeeze: function (i) {
        if (!sponges[i] || sponges[i].latch) return;
        pushHist(); sponges[i].latch = true; resetWater(); playing = true;
      },
      toggleValve: function (i) {
        if (!valves[i]) return;
        pushHist(); valves[i].open = !valves[i].open; resetWater(); playing = true;
      },
      probe: function (x, y) { rebuildFine(); return blocked(fineHard, x, y) ? 1 : 0; },
      debugGrid: function () {
        var g = [];
        for (var r = 0; r < ROWS; r++) g.push(new Array(COLS).fill(0));
        for (var i = 0; i < P.n; i++) {
          var c = Math.floor(P.x[i] / CELL), rb = Math.floor(P.y[i] / CELL), mr = ROWS - 1 - rb;
          if (mr >= 0 && mr < ROWS && c >= 0 && c < COLS) g[mr][c]++;
        }
        rebuildDyn();
        var lines = [];
        for (var r2 = 0; r2 < ROWS; r2++) {
          var s = '';
          for (var c2 = 0; c2 < COLS; c2++) {
            var ch = (map[r2] || '')[c2] || '.';
            if (dyn[r2 * COLS + c2]) ch = 'X';
            if (g[r2][c2] > 0) ch = g[r2][c2] > 9 ? '*' : String(Math.min(9, g[r2][c2]));
            s += ch;
          }
          lines.push(s);
        }
        return lines.join('\n');
      }
    };
    return api;
  }

  return {
    create: create, PRESETS: PRESETS, CELL: CELL, COLS: COLS, ROWS: ROWS, BW: BW, BH: BH, RAD: RAD,
    toWorld: toWorld
  };
});
