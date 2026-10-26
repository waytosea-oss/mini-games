/* Rivulet — guide a real particle stream into the glass. */
(function () {
  'use strict';
  var LEVELS = window.RIVULET.LEVELS;
  var CHAPTERS = window.RIVULET.CHAPTERS;
  var CELL = WaterSim.CELL, COLS = WaterSim.COLS, ROWS = WaterSim.ROWS;
  var BW = WaterSim.BW, BH = WaterSim.BH;
  var params = new URLSearchParams(location.search);
  var SAVE_KEY = 'rivulet-v1';

  var bg = document.getElementById('bg');
  var fx = document.getElementById('fx');
  var g = bg.getContext('2d');
  var o = fx.getContext('2d');
  var view = { x: 40, y: 80, bw: 300, bh: 400, W: 800, H: 600 };
  var screen = 'boot';
  var save = loadSave();
  if (params.get('unlock') === '1') save.unlocked = 66;
  var qualityMode = save.quality || 'auto';
  var sim = null, level = null, demo = false;
  var paused = false, winLock = false, failLock = false;
  var sawWater = false, dry = 0, winHold = 0, coachOn = false;
  var drag = null, last = performance.now(), hudTick = 0;
  var cache = null, cacheKey = '';
  var sparks = [];
  var booted = false, fluidWait = performance.now();
  var pendingQ = null;
  var COLORS = ['#3a94f0', '#f0c431', '#e45b86', '#3cbe6a', '#f08a32', '#8a62e0'];
  var COLOR_NAME = ['blue', 'yellow', 'rose', 'green', 'orange', 'violet'];
  var SKY = {
    ink: ['#9fd4ee', '#f6e2c4'], plank: ['#8ec8b8', '#f3e6c8'], pipe: ['#a9c4ee', '#f7e7cf'],
    pin: ['#f0c9b8', '#f6e6cf'], valve: ['#d9c8a4', '#efe6d2'], sponge: ['#f2d2a2', '#f7efe0'],
    steam: ['#c9d4e4', '#f3efe8'], mix: ['#e7c6ea', '#f8efd8'], mover: ['#b7c7d6', '#efe6d4']
  };

  function loadSave() {
    var blank = { v: 1, stars: [], best: [], unlocked: 1, sound: true, music: true, quality: 'auto' };
    try {
      var raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return blank;
      var o = JSON.parse(raw);
      if (!o || o.v !== 1) return blank;
      o.unlocked = Math.max(1, Math.min(66, o.unlocked || 1));
      o.stars = o.stars || [];
      o.best = o.best || [];
      if (o.sound == null) o.sound = true;
      if (o.music == null) o.music = true;
      if (!o.quality) o.quality = 'auto';
      return o;
    } catch (e) { return blank; }
  }
  function persist() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {}
  }
  function starCount() {
    var n = 0;
    for (var i = 0; i < LEVELS.length; i++) n += save.stars[i] || 0;
    return n;
  }
  function recent() {
    try {
      var a = JSON.parse(localStorage.getItem('th_recent') || '[]').filter(function (x) { return x && x.g !== 'water'; });
      a.unshift({ g: 'water', t: Date.now() });
      localStorage.setItem('th_recent', JSON.stringify(a.slice(0, 12)));
    } catch (e) {}
  }
  function track(name, a, b) {
    try { if (window.GT && typeof GT[name] === 'function') GT[name](a, b); } catch (e) {}
  }

  function show(name) {
    screen = name;
    document.body.dataset.screen = name;
    ['boot', 'title', 'select'].forEach(function (id) {
      document.getElementById(id).classList.toggle('on', id === name);
    });
    if (name !== 'play') closeModals();
  }
  function closeModals() {
    ['pause', 'win', 'fail', 'hint'].forEach(function (id) { document.getElementById(id).classList.remove('on'); });
  }
  function toastStars() {
    var t = starCount() + ' / ' + (LEVELS.length * 3) + ' stars';
    document.getElementById('starSum').textContent = t;
    document.getElementById('starSum2').textContent = t;
  }
  function qualityLabel() {
    if (qualityMode === 'auto') {
      var q = window.FLUID && FLUID.ok ? FLUID.quality : devicePreset();
      return 'Auto · ' + (q === 'low' ? 'Low' : 'High');
    }
    return qualityMode === 'low' ? 'Low' : 'High';
  }
  function devicePreset() {
    var mem = navigator.deviceMemory || 4, cores = navigator.hardwareConcurrency || 4;
    return (mem <= 2 || cores <= 2) ? 'low' : 'high';
  }
  function effectivePreset() {
    if (qualityMode === 'low') return 'low';
    if (qualityMode === 'high') return 'high';
    if (window.FLUID && FLUID.ok) return FLUID.quality;
    return devicePreset();
  }
  function applyQualityUI() {
    var label = qualityLabel();
    document.getElementById('tQual').textContent = label;
    document.getElementById('btnQuality').textContent = qualityMode === 'auto' ? 'Auto' : (qualityMode === 'low' ? 'Low' : 'High');
    if (window.FLUID && FLUID.ok) FLUID.setQuality(qualityMode);
  }
  function cycleQuality() {
    qualityMode = qualityMode === 'auto' ? 'low' : qualityMode === 'low' ? 'high' : 'auto';
    save.quality = qualityMode; persist();
    applyQualityUI();
    if (sim && !demo) {
      var snap = sim.exportState();
      rebuildSim(snap);
    } else if (demo) startDemo();
  }

  function layout() {
    var W = window.innerWidth, H = window.innerHeight;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (bg.width !== Math.round(W * dpr) || bg.height !== Math.round(H * dpr)) {
      bg.width = fx.width = Math.round(W * dpr);
      bg.height = fx.height = Math.round(H * dpr);
      cache = null;
    }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    o.setTransform(dpr, 0, 0, dpr, 0, 0);
    var portrait = H >= W * 0.92;
    var topH = portrait ? 86 : 64;
    var botH = portrait ? 92 : 70;
    if (!portrait && H < 520) { topH = 54; botH = 60; }
    var pad = 16;
    var availW = W - pad * 2;
    var availH = H - topH - botH;
    var bw = availW, bh = bw * (BH / BW);
    if (bh > availH) { bh = availH; bw = bh * (BW / BH); }
    view.W = W; view.H = H;
    view.bw = bw; view.bh = bh;
    view.x = (W - bw) / 2;
    view.y = topH + (availH - bh) / 2;
    if (screen === 'title') view.y = Math.max(12, (H - bh) * 0.06);
  }
  function worldToScreen(wx, wy) {
    return { x: view.x + (wx / BW) * view.bw, y: view.y + (1 - wy / BH) * view.bh };
  }
  function screenToWorld(sx, sy) {
    return { x: ((sx - view.x) / view.bw) * BW, y: (1 - (sy - view.y) / view.bh) * BH };
  }
  function cellRect(c, r, w, h) {
    w = w || 1; h = h || 1;
    var p = worldToScreen(c * CELL, (ROWS - r) * CELL);
    var q = worldToScreen((c + w) * CELL, (ROWS - r - h) * CELL);
    return { x: p.x, y: p.y, w: q.x - p.x, h: q.y - p.y };
  }
  function round(path, x, y, w, h, r) {
    if (path.beginPath) path.beginPath();
    r = Math.min(r, w / 2, h / 2);
    path.moveTo(x + r, y);
    path.arcTo(x + w, y, x + w, y + h, r);
    path.arcTo(x + w, y + h, x, y + h, r);
    path.arcTo(x, y + h, x, y, r);
    path.arcTo(x, y, x + w, y, r);
    path.closePath();
  }

  function skyOf() {
    var id = level && level.chapter || 'ink';
    return SKY[id] || SKY.ink;
  }
  function buildCache() {
    var key = (level ? level.id : 'demo') + '@' + bg.width + 'x' + bg.height;
    if (cache && cacheKey === key) return;
    cacheKey = key;
    cache = document.createElement('canvas');
    cache.width = bg.width; cache.height = bg.height;
    var c = cache.getContext('2d');
    var dpr = bg.width / view.W;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    var sky = skyOf();
    var grd = c.createLinearGradient(0, 0, 0, view.H);
    grd.addColorStop(0, sky[0]); grd.addColorStop(1, sky[1]);
    c.fillStyle = grd; c.fillRect(0, 0, view.W, view.H);
    var sun = c.createRadialGradient(view.W * 0.78, view.H * 0.16, 10, view.W * 0.78, view.H * 0.16, view.W * 0.28);
    sun.addColorStop(0, 'rgba(255,244,210,.95)'); sun.addColorStop(1, 'rgba(255,244,210,0)');
    c.fillStyle = sun; c.fillRect(0, 0, view.W, view.H);
    c.fillStyle = '#7eaf78';
    c.beginPath(); c.ellipse(view.W * 0.2, view.H * 0.92, view.W * 0.45, view.H * 0.18, 0, 0, 7); c.fill();
    c.fillStyle = '#4f8f62';
    c.beginPath(); c.ellipse(view.W * 0.72, view.H * 0.96, view.W * 0.5, view.H * 0.16, 0, 0, 7); c.fill();
    var bx = view.x - 18, by = view.y - 18, bw = view.bw + 36, bh = view.bh + 36;
    c.fillStyle = '#c9a27a'; round(c, bx + 8, by + 14, bw, bh, 28); c.fill();
    c.fillStyle = '#f4efe6'; round(c, bx, by, bw, bh, 26); c.fill();
    c.strokeStyle = '#e1d3bf'; c.lineWidth = 3; c.stroke();
    if (!level) return;
    var path = new Path2D();
    for (var r = 0; r < ROWS; r++) {
      var row = level.map[r] || '';
      for (var col = 0; col < COLS; col++) if (row[col] === '#') {
        var rc = cellRect(col, r, 1, 1);
        round(path, rc.x - 0.6, rc.y - 0.6, rc.w + 1.2, rc.h + 1.2, Math.min(5, rc.w * 0.2));
      }
    }
    c.fillStyle = '#3f78b4'; c.fill(path);
    c.save(); c.clip(path); c.fillStyle = 'rgba(255,255,255,.28)';
    c.fillRect(view.x, view.y, view.bw, 3); c.restore();
    drawSpouts(c);
    drawZones(c);
  }

  function mapCells(ch) {
    var list = [];
    if (!level) return list;
    for (var r = 0; r < ROWS; r++) {
      var row = level.map[r] || '';
      for (var c = 0; c < COLS; c++) if (row[c] === ch) list.push({ c: c, r: r });
    }
    return list;
  }
  function drawSpouts(c) {
    [['S', 0], ['A', 1], ['B', 2]].forEach(function (pair) {
      var cells = mapCells(pair[0]);
      if (!cells.length) return;
      var top = cells[0];
      cells.forEach(function (p) { if (p.r < top.r) top = p; });
      var rc = cellRect(top.c, top.r, 1, 1);
      c.fillStyle = '#d7b15a';
      round(c, rc.x - rc.w * 0.15, rc.y - rc.h * 0.05, rc.w * 1.3, rc.h * 0.55, 6); c.fill();
      c.fillStyle = COLORS[pair[1]];
      c.beginPath(); c.arc(rc.x + rc.w * 0.5, rc.y + rc.h * 0.72, Math.max(3, rc.w * 0.16), 0, 7); c.fill();
    });
  }
  function drawZones(c) {
    if (!sim) return;
    sim.heats.forEach(function (z) {
      var rc = cellRect(z.c, z.r, z.w, z.h);
      c.fillStyle = 'rgba(255,140,60,.28)'; round(c, rc.x, rc.y, rc.w, rc.h, 8); c.fill();
    });
    sim.condensers.forEach(function (z) {
      var rc = cellRect(z.c, z.r, z.w, z.h);
      c.strokeStyle = '#7fd0e8'; c.lineWidth = 3;
      c.beginPath();
      for (var i = 0; i < 4; i++) {
        var y = rc.y + rc.h * (0.2 + i * 0.18);
        c.moveTo(rc.x + 4, y); c.bezierCurveTo(rc.x + rc.w * 0.3, y - 6, rc.x + rc.w * 0.7, y + 6, rc.x + rc.w - 4, y);
      }
      c.stroke();
    });
  }
  function drawOBB(c, pose, fill, stroke) {
    var p = worldToScreen(pose.cx, pose.cy);
    var ppm = view.bw / BW;
    c.save(); c.translate(p.x, p.y); c.rotate(-pose.ang);
    c.fillStyle = fill; c.strokeStyle = stroke || 'rgba(0,0,0,.25)'; c.lineWidth = 2;
    var w = pose.hx * 2 * ppm, h = pose.hy * 2 * ppm;
    round(c, -w / 2, -h / 2, w, h, 6); c.fill(); c.stroke();
    c.restore();
  }
  function drawDynamic(c) {
    if (!sim) return;
    sim.pipes.forEach(function (p, i) {
      var cells = sim.pipeCells(i);
      var open = {};
      for (var r = 0; r < 3; r++) for (var col = 0; col < 3; col++) open[col + ',' + r] = true;
      cells.forEach(function (cr) { delete open[(cr[0] - p.c) + ',' + (cr[1] - p.r)]; });
      for (var rr = 0; rr < 3; rr++) for (var cc = 0; cc < 3; cc++) {
        var rc = cellRect(p.c + cc, p.r + rr, 1, 1);
        if (open[cc + ',' + rr]) {
          c.fillStyle = '#1d242c'; round(c, rc.x + 2, rc.y + 2, rc.w - 4, rc.h - 4, 5); c.fill();
        } else {
          c.fillStyle = '#d7b15a'; round(c, rc.x + 1, rc.y + 1, rc.w - 2, rc.h - 2, 5); c.fill();
          c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(rc.x + 3, rc.y + 2, rc.w * 0.4, 2);
        }
      }
    });
    sim.pins.forEach(function (p) {
      var rc = cellRect(p.c, p.r, p.w, p.h);
      var lift = (p.open || 0) * rc.h * 0.85;
      c.save(); c.globalAlpha = 1 - (p.open || 0) * 0.85;
      c.fillStyle = '#c4473a';
      round(c, rc.x + rc.w * 0.38, rc.y - lift, rc.w * 0.24, rc.h + 8, 6); c.fill();
      c.fillStyle = '#f0d48a';
      c.beginPath(); c.arc(rc.x + rc.w * 0.5, rc.y + 6 - lift, Math.max(4, rc.w * 0.16), 0, 7); c.fill();
      c.restore();
    });
    sim.valves.forEach(function (v) {
      var rc = cellRect(v.c, v.r, v.w, v.h);
      c.fillStyle = v.open ? 'rgba(255,255,255,.15)' : '#8d6a32';
      round(c, rc.x + 2, rc.y + rc.h * 0.2, rc.w - 4, rc.h * 0.6, 6); c.fill();
      c.strokeStyle = '#e6c56a'; c.lineWidth = 3;
      c.beginPath(); c.arc(rc.x + rc.w * 0.5, rc.y + rc.h * 0.5, Math.min(rc.w, rc.h) * 0.28, 0, 7); c.stroke();
      c.beginPath(); c.moveTo(rc.x + rc.w * 0.5, rc.y + rc.h * 0.5);
      var a = v.open ? 0.4 : -0.8;
      c.lineTo(rc.x + rc.w * 0.5 + Math.cos(a) * rc.w * 0.22, rc.y + rc.h * 0.5 + Math.sin(a) * rc.h * 0.22);
      c.stroke();
    });
    sim.sponges.forEach(function (s) {
      var rc = cellRect(s.c, s.r, s.w, s.h);
      c.fillStyle = s.latch ? 'rgba(244, 196, 120, .35)' : '#f0c14a';
      var inset = s.latch ? rc.h * 0.28 : 2;
      round(c, rc.x + 2, rc.y + inset, rc.w - 4, rc.h - inset * 2, 8); c.fill();
      c.fillStyle = 'rgba(255,255,255,.45)';
      for (var i = 0; i < 3; i++) c.fillRect(rc.x + 8 + i * rc.w * 0.28, rc.y + inset + 6, 4, 4);
    });
    for (var i = 0; i < sim.planks.length; i++) drawOBB(c, sim.posePlank(i), '#c9864a', '#6b4324');
    for (var m = 0; m < sim.movers.length; m++) drawOBB(c, sim.poseMover(m), '#d5dbe3', '#5c6a78');
    if (sim.strokes.length) {
      c.strokeStyle = '#2a241c'; c.lineCap = 'round'; c.lineJoin = 'round';
      c.lineWidth = Math.max(4, 0.068 * view.bw / BW);
      c.beginPath();
      sim.strokes.forEach(function (s) {
        s.pts.forEach(function (p, k) {
          var q = worldToScreen(p.x, p.y);
          if (k === 0) c.moveTo(q.x, q.y); else c.lineTo(q.x, q.y);
        });
      });
      c.stroke();
    }
  }

  function cupRect() {
    var c0 = 99, c1 = -1, r0 = 99, r1 = -1, n = 0;
    for (var r = 0; r < ROWS; r++) {
      var row = (level && level.map[r]) || '';
      for (var c = 0; c < COLS; c++) if (row[c] === 'C') {
        n++; if (c < c0) c0 = c; if (c > c1) c1 = c; if (r < r0) r0 = r; if (r > r1) r1 = r;
      }
    }
    if (!n) return null;
    return cellRect(c0, r0, c1 - c0 + 1, r1 - r0 + 1);
  }
  function drawOverlay(t) {
    o.clearRect(0, 0, view.W, view.H);
    if (sim) {
      var P = sim.P;
      for (var i = 0; i < P.n; i++) if (P.steam[i]) {
        var p = worldToScreen(P.x[i], P.y[i]);
        o.fillStyle = 'rgba(255,255,255,.45)';
        o.beginPath(); o.arc(p.x, p.y, 7 + (i % 3), 0, 7); o.fill();
      }
      if (!window.FLUID || !FLUID.ok) {
        var rad = Math.max(2.5, sim.RAD * sim.preset.radMul * (view.bw / BW) * 2.2);
        for (var j = 0; j < P.n; j++) if (!P.steam[j]) {
          var q = worldToScreen(P.x[j], P.y[j]);
          o.fillStyle = COLORS[P.cid[j]] || COLORS[0];
          o.globalAlpha = 0.55;
          o.beginPath(); o.arc(q.x, q.y, rad, 0, 7); o.fill();
        }
        o.globalAlpha = 1;
      }
    }
    var cup = level && cupRect();
    if (cup) {
      o.strokeStyle = 'rgba(255,255,255,.85)'; o.lineWidth = 3;
      round(o, cup.x, cup.y, cup.w, cup.h, 8); o.stroke();
      o.strokeStyle = 'rgba(180,210,220,.8)'; o.lineWidth = 1.5;
      o.beginPath(); o.moveTo(cup.x + 5, cup.y + 8); o.lineTo(cup.x + 5, cup.y + cup.h - 8); o.stroke();
      if (level.cupColor != null) {
        o.fillStyle = COLORS[level.cupColor];
        o.fillRect(cup.x + cup.w - 14, cup.y - 16, 12, 12);
      }
    }
    if (coachOn && level) drawHand(t);
    if (!demo && sim && level && level.ink && !sim.pouring) drawDrips(t);
    for (var s = sparks.length - 1; s >= 0; s--) {
      var sp = sparks[s]; sp.y += sp.vy; sp.x += sp.vx; sp.life -= 0.016; sp.vy += 0.05;
      if (sp.life <= 0) { sparks.splice(s, 1); continue; }
      o.globalAlpha = Math.max(0, sp.life);
      o.fillStyle = sp.c;
      o.beginPath(); o.arc(sp.x, sp.y, sp.r, 0, 7); o.fill();
    }
    o.globalAlpha = 1;
  }
  function drawDrips(t) {
    mapCells('S').concat(mapCells('A')).forEach(function (cell, n) {
      var rc = cellRect(cell.c, cell.r, 1, 1);
      var phase = (t / 500 + n) % 1;
      o.fillStyle = 'rgba(90,170,220,.75)';
      o.beginPath(); o.arc(rc.x + rc.w * 0.5, rc.y + rc.h * (0.8 + phase * 0.8), 3.5, 0, 7); o.fill();
    });
  }
  function drawHand(t) {
    var target = coachPoint();
    if (!target) return;
    var wob = Math.sin(t / 280) * 0.5 + 0.5;
    var x = target.x + (target.dx || 0) * wob;
    var y = target.y + (target.dy || 0) * wob;
    o.save(); o.translate(x, y);
    o.fillStyle = 'rgba(255,248,236,.95)';
    o.strokeStyle = '#2a3a44'; o.lineWidth = 2;
    round(o, -10, -6, 28, 36, 10); o.fill(); o.stroke();
    o.beginPath(); o.arc(4, -16, 8, 0, 7); o.fill(); o.stroke();
    o.restore();
  }
  function coachPoint() {
    if (!level || !sim) return null;
    if (level.chapter === 'ink') {
      var s = mapCells('S')[0]; if (!s) return null;
      var rc = cellRect(s.c, s.r + 1, 1, 1);
      return { x: rc.x, y: rc.y, dx: rc.w * 1.4, dy: rc.h * 2.2 };
    }
    if (sim.planks.length) {
      var pose = sim.posePlank(0), p = worldToScreen(pose.cx, pose.cy);
      return { x: p.x, y: p.y, dx: 70, dy: 0 };
    }
    var gdt = sim.valves[0] || sim.pins[0] || sim.sponges[0] || sim.pipes[0];
    if (!gdt) return null;
    var box = cellRect(gdt.c, gdt.r, gdt.w || 3, gdt.h || 3);
    return { x: box.x + box.w / 2, y: box.y + box.h / 2, dx: 0, dy: 8 };
  }

  function drawFrame(t) {
    layout();
    buildCache();
    g.drawImage(cache, 0, 0, view.W, view.H);
    if (sim) drawDynamic(g);
    drawOverlay(t);
    if (window.FLUID && FLUID.ok) {
      FLUID.setView(view, BW, BH);
      FLUID.setBackground(bg);
      FLUID.setRadius((sim ? sim.RAD * sim.preset.radMul : 0.006) * 3.05);
      FLUID.sync(sim ? sim.P : null);
      if (!FLUID._laid) { FLUID.setQuality(qualityMode); FLUID._laid = true; }
      FLUID.render(16);
    }
  }

  function makeSim(lv, preset, hold) {
    return WaterSim.create(lv, { preset: preset, holdPour: !!hold });
  }
  function rebuildSim(snap) {
    var preset = effectivePreset();
    var hold = level.chapter === 'ink';
    sim = makeSim(level, preset, hold && !(snap && snap.pouring));
    if (snap) sim.importState(snap);
    if (params.get('solve') === '1') { sim.applySolution(); sim.releasePour(); sim.markPlaying(); }
    sawWater = false; dry = 0; winHold = 0;
  }
  function startLevel(id) {
    demo = false; paused = false; winLock = false; failLock = false; drag = null;
    level = LEVELS[id - 1];
    cache = null;
    closeModals();
    show('play');
    coachOn = !!(level.coach && !(save.stars[id - 1] > 0) && params.get('solve') !== '1');
    var coach = document.getElementById('coach');
    coach.textContent = coachOn ? level.coach : '';
    coach.classList.toggle('hide', !coachOn);
    document.getElementById('lvNum').textContent = 'Level ' + id;
    document.getElementById('lvName').textContent = level.name;
    rebuildSim(null);
    track('lv', id, { ch: level.chapter });
    Ads.gameplayStart();
    updateHud(true);
  }
  function startDemo() {
    demo = true; level = LEVELS[0]; cache = null;
    sim = makeSim(level, effectivePreset(), false);
    sim.applySolution(); sim.releasePour();
    sawWater = false; winHold = 0; failLock = false; winLock = false;
  }
  function goTitle() {
    if (screen === 'play') { track('quit', 'menu'); Ads.gameplayStop(); }
    show('title'); toastStars(); applyQualityUI(); startDemo();
  }
  function goSelect() {
    if (screen === 'play') { track('quit', 'levels'); Ads.gameplayStop(); }
    demo = false; sim = null; level = null; cache = null;
    show('select'); renderSelect(); toastStars();
  }
  function renderSelect() {
    var host = document.getElementById('lvGrid');
    host.innerHTML = '';
    CHAPTERS.forEach(function (ch) {
      var h = document.createElement('div'); h.className = 'chap';
      h.innerHTML = '<b></b><span></span>';
      h.querySelector('b').textContent = ch.name;
      h.querySelector('span').textContent = ch.mechanic;
      host.appendChild(h);
      var grid = document.createElement('div'); grid.className = 'grid';
      for (var id = ch.from; id <= ch.to; id++) {
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'lvbtn';
        var stars = save.stars[id - 1] || 0;
        var locked = id > save.unlocked;
        if (locked) b.classList.add('lock');
        else if (stars) b.classList.add('done');
        b.innerHTML = '<span class="n"></span><span class="st"></span>';
        b.querySelector('.n').textContent = locked ? '' : String(id);
        b.querySelector('.st').textContent = locked ? '' : '★★★'.slice(0, stars);
        if (!locked) b.addEventListener('click', (function (n) { return function () { startLevel(n); }; })(id));
        grid.appendChild(b);
      }
      host.appendChild(grid);
    });
  }

  function onWin() {
    if (winLock || demo) return;
    winLock = true;
    var stars = sim.stars || 1;
    var id = level.id;
    save.stars[id - 1] = Math.max(save.stars[id - 1] || 0, stars);
    var bt = sim.winTime || sim.playTime;
    if (!save.best[id - 1] || bt < save.best[id - 1]) save.best[id - 1] = bt;
    save.unlocked = Math.max(save.unlocked, Math.min(66, id + 1));
    persist();
    track('win', id, { stars: stars });
    Ads.gameplayStop();
    SFX.win();
    burst(view.x + view.bw * 0.5, view.y + view.bh * 0.35);
    document.getElementById('winTitle').textContent = id === 66 ? 'Every stream is home' : 'Filled';
    document.getElementById('winFine').textContent = formatTime(bt) + (level.ink ? '  ·  ink ' + sim.inkUsed.toFixed(2) + ' m' : '');
    document.getElementById('bNext').textContent = id === 66 ? 'Levels' : 'Next';
    paintStars(stars);
    document.getElementById('win').classList.add('on');
    coachOn = false;
    document.getElementById('coach').classList.add('hide');
  }
  function paintStars(n) {
    var host = document.getElementById('winStars'); host.innerHTML = '';
    for (var i = 0; i < 3; i++) {
      var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      s.setAttribute('viewBox', '0 0 24 24');
      var p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      p.setAttribute('d', 'M12 2.6l2.7 5.6 6.2.8-4.5 4.3 1.1 6.1L12 16.8 6.5 19.4l1.1-6.1L3.1 9l6.2-.8z');
      p.setAttribute('fill', i < n ? '#e2a325' : '#d9d0c2');
      s.appendChild(p); host.appendChild(s);
    }
  }
  function burst(x, y) {
    for (var i = 0; i < 18; i++) {
      var a = Math.random() * 6.28, sp = 1.5 + Math.random() * 3.2;
      sparks.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 2, r: 2 + Math.random() * 3, life: 1, c: Math.random() < 0.5 ? '#7ec8e8' : '#f0d48a' });
    }
  }
  function onFail() {
    if (failLock || winLock || demo) return;
    failLock = true;
    track('fail', level.id, { fill: Math.round(sim.fill * 100) });
    Ads.gameplayStop();
    SFX.fail();
    document.getElementById('fail').classList.add('on');
  }
  function formatTime(t) {
    t = Math.max(0, t || 0);
    if (t < 10) return t.toFixed(1) + 's';
    var m = Math.floor(t / 60), s = Math.floor(t % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
  }
  function updateHud(force) {
    hudTick++;
    if (!force && hudTick % 4) return;
    if (!sim || demo) return;
    document.getElementById('fillBar').style.width = Math.round(sim.fill * 100) + '%';
    document.getElementById('fillTxt').textContent = Math.round(sim.fill * 100) + '%';
    document.getElementById('timeTxt').textContent = formatTime(sim.playTime);
    var ink = document.getElementById('inkTxt');
    ink.textContent = level && level.ink ? ('ink ' + Math.max(0, sim.inkLeft).toFixed(1)) : (level && level.cupColor != null ? COLOR_NAME[level.cupColor] : '');
    document.getElementById('btnUndo').disabled = !sim.canUndo();
  }

  function hitRect(rect, x, y) {
    var x0 = rect.c * CELL, x1 = (rect.c + rect.w) * CELL;
    var y1 = (ROWS - rect.r) * CELL, y0 = (ROWS - rect.r - rect.h) * CELL;
    return x >= x0 && x <= x1 && y >= y0 && y <= y1;
  }
  function hitOBB(pose, x, y) {
    var ca = Math.cos(pose.ang), sa = Math.sin(pose.ang);
    var dx = x - pose.cx, dy = y - pose.cy;
    var lx = dx * ca + dy * sa, ly = -dx * sa + dy * ca;
    return Math.abs(lx) <= pose.hx + 0.02 && Math.abs(ly) <= pose.hy + 0.02;
  }
  function pickGadget(x, y) {
    var i;
    for (i = 0; i < sim.pins.length; i++) if (sim.pins[i].open < 1 && hitRect(sim.pins[i], x, y)) return { type: 'pin', i: i };
    for (i = 0; i < sim.valves.length; i++) if (hitRect(sim.valves[i], x, y)) return { type: 'valve', i: i };
    for (i = 0; i < sim.sponges.length; i++) if (hitRect(sim.sponges[i], x, y)) return { type: 'sponge', i: i };
    for (i = 0; i < sim.pipes.length; i++) {
      var p = sim.pipes[i];
      if (x >= p.c * CELL && x <= (p.c + 3) * CELL && y <= (ROWS - p.r) * CELL && y >= (ROWS - p.r - 3) * CELL) return { type: 'pipe', i: i };
    }
    for (i = 0; i < sim.planks.length; i++) if (hitOBB(sim.posePlank(i), x, y)) return { type: 'plank', i: i };
    return null;
  }
  function insideBoard(sx, sy) {
    return sx >= view.x - 8 && sy >= view.y - 8 && sx <= view.x + view.bw + 8 && sy <= view.y + view.bh + 8;
  }
  function onDown(e) {
    if (screen !== 'play' || paused || winLock || failLock || demo) return;
    if (e.button != null && e.button !== 0) return;
    SFX.unlock();
    var rect = bg.getBoundingClientRect();
    var sx = e.clientX - rect.left, sy = e.clientY - rect.top;
    if (!insideBoard(sx, sy)) return;
    var w = screenToWorld(sx, sy);
    w.x = Math.max(0.02, Math.min(BW - 0.02, w.x));
    w.y = Math.max(0.02, Math.min(BH - 0.02, w.y));
    if (level.ink) {
      if (sim.beginStroke(w.x, w.y)) {
        drag = { type: 'ink', id: e.pointerId };
        coachOn = false; document.getElementById('coach').classList.add('hide');
        SFX.draw();
        bg.setPointerCapture(e.pointerId);
      }
      return;
    }
    var hit = pickGadget(w.x, w.y);
    if (!hit) return;
    coachOn = false; document.getElementById('coach').classList.add('hide');
    if (hit.type === 'plank') {
      sim.prepDrag();
      drag = { type: 'plank', i: hit.i, id: e.pointerId };
      bg.setPointerCapture(e.pointerId);
    } else if (hit.type === 'pipe') { sim.rotatePipe(hit.i); SFX.tap(); }
    else if (hit.type === 'pin') { sim.pullPin(hit.i); SFX.tap(); }
    else if (hit.type === 'valve') { sim.toggleValve(hit.i); SFX.tap(); }
    else if (hit.type === 'sponge') { sim.squeeze(hit.i); SFX.tap(); }
    e.preventDefault();
  }
  function onMove(e) {
    if (!drag || e.pointerId !== drag.id) return;
    var rect = bg.getBoundingClientRect();
    var w = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
    if (drag.type === 'ink') {
      var ok = sim.extendStroke(w.x, w.y);
      if (ok) SFX.draw();
    } else if (drag.type === 'plank') {
      var p = sim.planks[drag.i];
      var a = WaterSim.toWorld(p.c0, p.r0), b = WaterSim.toWorld(p.c1, p.r1);
      var dx = b.x - a.x, dy = b.y - a.y, L2 = dx * dx + dy * dy || 1;
      var t = ((w.x - a.x) * dx + (w.y - a.y) * dy) / L2;
      sim.nudgePlank(drag.i, t);
    }
  }
  function onUp(e) {
    if (!drag || e.pointerId !== drag.id) return;
    if (drag.type === 'ink') {
      sim.endStroke();
      if (sim.strokes.length) sim.releasePour();
      else sim.holdPour();
    } else if (drag.type === 'plank') sim.commitPlank();
    drag = null;
  }

  function nextAfterAd() {
    Ads.commercialBreak().then(function () {
      if (level.id >= 66) goSelect();
      else startLevel(level.id + 1);
    });
  }
  function doHint() {
    Ads.rewardedBreak().then(function (ok) {
      if (!ok) return;
      document.getElementById('hintText').textContent = level.hint || level.coach || 'Guide the water into the glass.';
      document.getElementById('fail').classList.remove('on');
      document.getElementById('hint').classList.add('on');
    });
  }
  function doSkip() {
    Ads.rewardedBreak().then(function (ok) {
      if (!ok) return;
      var id = level.id;
      save.unlocked = Math.max(save.unlocked, Math.min(66, id + 1));
      persist();
      document.getElementById('pause').classList.remove('on');
      if (id >= 66) goSelect();
      else startLevel(id + 1);
    });
  }

  function bind() {
    document.getElementById('bPlay').onclick = function () { SFX.unlock(); startLevel(Math.min(save.unlocked, 66)); };
    document.getElementById('bLevels').onclick = function () { goSelect(); };
    document.getElementById('bSelectBack').onclick = function () { goTitle(); };
    document.getElementById('tSound').onclick = function () {
      save.sound = !save.sound; persist(); syncAudio(); track('sound', 'sfx', save.sound);
    };
    document.getElementById('tMusic').onclick = function () {
      save.music = !save.music; persist(); syncAudio(); track('sound', 'music', save.music);
    };
    document.getElementById('tQual').onclick = cycleQuality;
    document.getElementById('btnQuality').onclick = cycleQuality;
    document.getElementById('btnPause').onclick = function () {
      if (winLock || failLock) return;
      paused = true; Ads.gameplayStop(); track('pause');
      document.getElementById('pause').classList.add('on');
    };
    document.getElementById('bResume').onclick = function () {
      paused = false; document.getElementById('pause').classList.remove('on'); Ads.gameplayStart();
    };
    document.getElementById('bPauseRetry').onclick = function () { document.getElementById('pause').classList.remove('on'); startLevel(level.id); };
    document.getElementById('bPauseLevels').onclick = goSelect;
    document.getElementById('bSkip').onclick = doSkip;
    document.getElementById('btnUndo').onclick = function () {
      if (!sim) return;
      sim.undo();
      if (level.ink) { if (sim.strokes.length) sim.releasePour(); else sim.holdPour(); }
      sawWater = false; dry = 0;
    };
    document.getElementById('btnRestart').onclick = function () { startLevel(level.id); };
    document.getElementById('btnHint').onclick = doHint;
    document.getElementById('bNext').onclick = function () {
      document.getElementById('win').classList.remove('on');
      if (level.id >= 66) goSelect(); else nextAfterAd();
    };
    document.getElementById('bWinRetry').onclick = function () { startLevel(level.id); };
    document.getElementById('bWinLevels').onclick = goSelect;
    document.getElementById('bFailRetry').onclick = function () { startLevel(level.id); };
    document.getElementById('bFailLevels').onclick = goSelect;
    document.getElementById('bFailHint').onclick = doHint;
    document.getElementById('bHintOk').onclick = function () {
      document.getElementById('hint').classList.remove('on');
      if (failLock) document.getElementById('fail').classList.add('on');
    };
    ['mHub', 'pHub', 'wHub', 'fHub'].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.onclick = function () { track('hub', id); location.href = '../'; };
    });
    bg.addEventListener('pointerdown', onDown);
    bg.addEventListener('pointermove', onMove);
    bg.addEventListener('pointerup', onUp);
    bg.addEventListener('pointercancel', onUp);
    window.addEventListener('keydown', function (e) {
      if (screen !== 'play') return;
      if (e.key === 'Escape') document.getElementById('btnPause').click();
      if (e.key === 'u' || e.key === 'U') document.getElementById('btnUndo').click();
      if (e.key === 'r' || e.key === 'R') document.getElementById('btnRestart').click();
    });
    window.addEventListener('resize', function () { cache = null; });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        SFX.suspend();
        if (screen === 'play' && !paused && !winLock && !failLock) Ads.gameplayStop();
      } else {
        SFX.resume();
        if (screen === 'play' && !paused && !winLock && !failLock) Ads.gameplayStart();
      }
    });
    if (window.FLUID) FLUID.onQuality(function (name) {
      if (qualityMode !== 'auto') return;
      pendingQ = name;
      applyQualityUI();
    });
    window.addEventListener('fluidready', function () {
      if (window.FLUID) FLUID.onQuality(function (name) {
        if (qualityMode !== 'auto') return;
        pendingQ = name;
        applyQualityUI();
      });
      applyQualityUI();
    });
  }
  function syncAudio() {
    SFX.setSound(save.sound);
    SFX.setMusic(save.music);
    document.getElementById('tSound').classList.toggle('off', !save.sound);
    document.getElementById('tMusic').classList.toggle('off', !save.music);
  }

  function frame(t) {
    var dt = Math.min(0.033, (t - last) / 1000); last = t;
    if (!booted && ((window.FLUID && FLUID.ok) || t - fluidWait > 1600)) {
      booted = true;
      Ads.loadingStop();
      recent();
      syncAudio();
      toastStars();
      applyQualityUI();
      var jump = +params.get('level');
      if (jump >= 1 && jump <= 66 && (jump <= save.unlocked || params.get('unlock') === '1')) startLevel(jump);
      else { show('title'); startDemo(); track('title', 'boot'); }
    }
    if (pendingQ && sim && !demo && screen === 'play') {
      var want = pendingQ; pendingQ = null;
      if (sim.preset.name.toLowerCase() !== want) rebuildSim(sim.exportState());
    }
    var running = sim && !document.hidden && !winLock && ((demo && screen === 'title') || (screen === 'play' && !paused && !failLock));
    if (running) {
      sim.step(dt);
      var splash = sim.takeSplash();
      if (splash) SFX.splash(splash);
      SFX.pour(sim.pouring && sim.P.n > 4, Math.min(1, sim.P.n / 80));
      if (sim.won && !winHold) winHold = t;
      if (demo && sim.won && winHold && t - winHold > 1600) startDemo();
      if (!demo && screen === 'play') {
        if (sim.P.n > 8) sawWater = true;
        if (sawWater && sim.pouring && sim.P.n === 0 && !sim.won) dry += dt; else dry = 0;
        if (sim.won && winHold && t - winHold > 500 && (sim.fill >= 0.98 || t - winHold > 1600)) onWin();
        else if (!sim.won && dry > 0.8) onFail();
        updateHud(false);
      }
    } else SFX.pour(false);
    if (booted) drawFrame(t);
    requestAnimationFrame(frame);
  }

  Ads.loadingStart();
  bind();
  requestAnimationFrame(frame);
})();
