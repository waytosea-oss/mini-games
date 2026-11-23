/* 重力邮局。镜头固定，玩家只改重力向量，并按住刹车。 */
(function () {
  'use strict';

  var SAVE_KEY = 'gravipost_save_v1';
  var CLIPS = {
    tilt: {
      src: 'assets/anim/b05-mascot-sheet-tilt.webp',
      still: 'assets/anim/b05-mascot-still-tilt.png',
      fw: 368, fh: 382, ax: 171.66665818398113, ay: 207.90467419125326
    },
    bounce: {
      src: 'assets/anim/b05-mascot-sheet-bounce.webp',
      still: 'assets/anim/b05-mascot-still-bounce.png',
      fw: 338, fh: 460, ax: 171.665212534453, ay: 285.9170797357869
    },
    brake: {
      src: 'assets/anim/b05-mascot-sheet-brake.webp',
      still: 'assets/anim/b05-mascot-still-brake.png',
      fw: 322, fh: 408, ax: 157.66591798860952, ay: 234.9130173635227
    }
  };
  var AN = {
    floor: [253.39, 252.01],
    straight: [245.33, 256.72],
    corner: [255.75, 260.94],
    curve: [255.89, 240.7],
    padTile: [252.03, 251.47],
    pitTile: [253.65, 251.82],
    intact: [255.22, 282.78],
    scratched: [256.23, 283.87],
    broken: [256.29, 283.86],
    square: [248.15, 253.85],
    cylinder: [254.17, 253.04],
    hex: [255.57, 252.57],
    settled: [262.28, 251.54],
    gateC: [251.87, 254.67],
    gateO: [254.62, 254.51],
    btnU: [256.11, 264.78],
    btnD: [255.11, 257.85],
    cp: [255.63, 254.65],
    supU: [257.89, 284.82],
    supD: [262.18, 262.17],
    pit: [256.93, 256.64],
    wh: [263.6, 269.54],
    magC: [255.81, 255.59],
    magS: [253.28, 257.3],
    token: [228.03, 252.92],
    arc: [256, 256],
    speed: [115.2, 128]
  };

  var $ = function (id) { return document.getElementById(id); };
  var save = loadSave();
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var sim = null;
  var levelIndex = 0;
  var images = {};
  var imagesReady = false;
  var raf = 0;
  var last = 0;
  var hiddenPause = false;
  var dialId = null;
  var brakeHeld = false;
  var keys = {};
  var coach = '';
  var coachUntil = 0;
  var seenTip = {};
  var fx = [];
  var trail = [];
  var won = false;
  var debug = /(?:\?|&)debug=1(?:&|$)/.test(location.search);
  var layout = { chrome: 0, tileTop: 0 };
  var paused = false;
  var clipName = 'tilt';
  var clipFrame = 0;
  var clipHold = 0;
  var hovering = false;
  var spriteAcc = 0;

  function loadSave() {
    var base = {
      v: 1,
      sens: 'mid',
      music: true,
      cleared: [false, false, false, false, false],
      medals: [0, 0, 0, 0, 0],
      unlocked: 0,
      active: null
    };
    try {
      var raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return base;
      var data = JSON.parse(raw);
      if (!data || data.v !== 1) return base;
      base.sens = data.sens && GPSim.SENS[data.sens] ? data.sens : 'mid';
      base.music = data.music !== false;
      base.unlocked = Math.max(0, Math.min(4, data.unlocked || 0));
      for (var i = 0; i < 5; i++) {
        base.cleared[i] = !!(data.cleared && data.cleared[i]);
        base.medals[i] = Math.max(0, Math.min(3, (data.medals && data.medals[i]) || 0));
      }
      if (data.active && typeof data.active.level === 'number') base.active = data.active;
      return base;
    } catch (err) {
      return base;
    }
  }

  function writeSave() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (err) { /* 隐私模式忽略 */ }
  }

  function medalCount(level, hits, powerUsed) {
    if (hits <= 0 && powerUsed <= level.medalPower) return 3;
    if (hits <= 2 && powerUsed <= level.medalPower + 36) return 2;
    return 1;
  }

  function show(id) {
    ['screen-cover', 'screen-levels', 'screen-play'].forEach(function (name) {
      $(name).hidden = name !== id;
    });
  }

  function syncMusicButtons() {
    var on = GPAudio.wanted();
    document.querySelectorAll('[data-music]').forEach(function (btn) {
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  function syncSens() {
    document.querySelectorAll('[data-sens]').forEach(function (btn) {
      btn.setAttribute('aria-pressed', btn.getAttribute('data-sens') === save.sens ? 'true' : 'false');
    });
    var label = { low: '稳', mid: '适中', high: '灵' }[save.sens] || '适中';
    $('btn-sens').textContent = label;
    if (sim) GPSim.setSens(sim, save.sens);
  }

  function orient() {
    var land = innerWidth > innerHeight;
    document.documentElement.classList.toggle('land', land);
    var cover = $('cover-bg');
    cover.src = land ? 'assets/cover/b05-cover-16x9-bg.webp' : 'assets/cover/b05-cover-3x4-bg.webp';
    if (!$('screen-play').hidden) {
      var scene = $('scene-bg');
      var nextScene = land ? 'assets/scene/b05-scene-landscape.webp' : 'assets/scene/b05-scene-portrait.webp';
      if (scene.getAttribute('src') !== nextScene) scene.src = nextScene;
    }
    layoutSprites();
  }

  function paintSprite(el, clip, frame) {
    if (!el) return;
    var box = el.clientWidth || 96;
    var scale = (box * 0.92) / clip.fw;
    var dw = clip.fw * scale;
    var dh = clip.fh * scale;
    el.style.aspectRatio = clip.fw + ' / ' + clip.fh;
    el.style.backgroundImage = 'url("' + (reduce ? clip.still : clip.src) + '")';
    var ox = (box - dw) / 2 + (clip.fw / 2 - clip.ax) * scale;
    var oy = ((el.clientHeight || dh) - dh) / 2 + (clip.fh / 2 - clip.ay) * scale;
    if (reduce) {
      el.style.backgroundSize = dw + 'px ' + dh + 'px';
      el.style.backgroundPosition = ox + 'px ' + oy + 'px';
      return;
    }
    var col = frame % 6;
    var row = Math.floor(frame / 6);
    el.style.backgroundSize = (dw * 6) + 'px ' + (dh * 4) + 'px';
    el.style.backgroundPosition = (ox - col * dw) + 'px ' + (oy - row * dh) + 'px';
  }

  function layoutSprites() {
    paintSprite($('cover-mascot'), CLIPS[clipName], clipFrame);
    paintSprite($('levels-mascot'), CLIPS[clipName], clipFrame);
  }

  function setClip(name, holdFrames) {
    if (!CLIPS[name]) return;
    clipName = name;
    clipFrame = 0;
    clipHold = holdFrames || 0;
    layoutSprites();
  }

  function loadImages(done) {
    if (imagesReady) { done(); return; }
    var files = {
      floor: 'assets/tiles/b05-tile-floor.png',
      straight: 'assets/tiles/b05-tile-wall-straight.png',
      corner: 'assets/tiles/b05-tile-wall-corner.png',
      curve: 'assets/tiles/b05-tile-wall-curve.png',
      padTile: 'assets/tiles/b05-tile-pad.png',
      pitTile: 'assets/tiles/b05-tile-pit.png',
      intact: 'assets/props/b05-parcel-intact.png',
      scratched: 'assets/props/b05-parcel-scratched.png',
      broken: 'assets/props/b05-parcel-broken.png',
      square: 'assets/props/b05-mailbox-square.png',
      cylinder: 'assets/props/b05-mailbox-cylinder.png',
      hex: 'assets/props/b05-mailbox-hex.png',
      settled: 'assets/props/b05-mailbox-settled.png',
      gateC: 'assets/props/b05-gate-closed.png',
      gateO: 'assets/props/b05-gate-open.png',
      btnU: 'assets/props/b05-button-up.png',
      btnD: 'assets/props/b05-button-down.png',
      cp: 'assets/props/b05-checkpoint.png',
      supU: 'assets/props/b05-supply-unused.png',
      supD: 'assets/props/b05-supply-used.png',
      pit: 'assets/props/b05-pit.png',
      wh: 'assets/props/b05-warehouse-twolevel.png',
      magC: 'assets/overlays/b05-overlay-magnetic-circle.png',
      magS: 'assets/overlays/b05-overlay-magnetic-square.png',
      token: 'assets/props/b05-gravity-arrow-token.png',
      speed: 'assets/ui/b05-ui-speed-cue.png',
      arc0: 'assets/props/b05-countdown-arc-00.png',
      arc1: 'assets/props/b05-countdown-arc-01.png',
      arc2: 'assets/props/b05-countdown-arc-02.png',
      arc3: 'assets/props/b05-countdown-arc-03.png',
      arc4: 'assets/props/b05-countdown-arc-04.png',
      seg: 'assets/props/b05-countdown-segments.png',
      impact: 'assets/fx/b05-fx-impact-sheet.png',
      deliver: 'assets/fx/b05-fx-deliver-sheet.png',
      padfx: 'assets/fx/b05-fx-pad-sheet.png'
    };
    var keys = Object.keys(files);
    var left = keys.length;
    keys.forEach(function (key) {
      var img = new Image();
      img.onload = img.onerror = function () {
        left -= 1;
        if (left <= 0) { imagesReady = true; done(); }
      };
      img.src = files[key];
      images[key] = img;
    });
  }

  function renderLevelList() {
    var root = $('level-list');
    root.innerHTML = '';
    GPLevels.LEVELS.forEach(function (level, i) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'level';
      btn.disabled = i > save.unlocked;
      var medal = save.medals[i] || 0;
      var medalText = medal === 3 ? '三枚' : medal === 2 ? '两枚' : medal === 1 ? '一枚' : '';
      btn.innerHTML = '<b>' + level.name + '</b><small>' + (btn.disabled ? '先送完上一单。' : level.blurb) + '</small><span class="dots">' + medalText + '</span>';
      btn.addEventListener('click', function () { if (!btn.disabled) startLevel(i, false); });
      root.appendChild(btn);
    });
  }

  function refreshCover() {
    var resume = save.active && typeof save.active.level === 'number';
    $('btn-start').textContent = resume ? '继续运送' : (save.unlocked > 0 ? '继续下一单' : '开始运送');
  }

  function startLevel(index, useActive) {
    levelIndex = index;
    var level = GPLevels.LEVELS[index];
    var snap = null;
    if (useActive && save.active && save.active.level === index && save.active.snap) snap = save.active.snap;
    sim = GPSim.create(level, snap, save.sens);
    won = false;
    coach = level.intro;
    coachUntil = 0;
    seenTip = {};
    fx = [];
    trail = [];
    $('win-panel').hidden = true;
    $('toast').hidden = true;
    $('order-label').textContent = '本单：' + level.label;
    show('screen-play');
    orient();
    loadImages(function () { resizeCanvas(); });
    resizeCanvas();
    if (!raf) loop(performance.now());
  }

  function snapshotActive() {
    if (!sim || won) return;
    save.active = {
      level: levelIndex,
      snap: {
        x: sim.snapshot.x,
        y: sim.snapshot.y,
        z: sim.snapshot.z,
        power: sim.snapshot.power,
        integrity: sim.snapshot.integrity,
        powerUsed: sim.snapshot.powerUsed,
        hits: sim.snapshot.hits,
        usedSupply: sim.snapshot.usedSupply,
        seenCp: sim.snapshot.seenCp
      }
    };
    writeSave();
  }

  function resizeCanvas() {
    var zone = $('maze-zone');
    var canvas = $('maze');
    var w = zone.clientWidth;
    var h = zone.clientHeight;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.max(2, Math.floor(w * dpr));
    canvas.height = Math.max(2, Math.floor(h * dpr));
  }

  function blit(ctx, img, ax, ay, x, y, drawW) {
    if (!img || !img.complete || !img.naturalWidth) return;
    var s = drawW / img.naturalWidth;
    ctx.drawImage(img, x - ax * s, y - ay * s, img.naturalWidth * s, img.naturalHeight * s);
  }

  function sheet(ctx, img, frame, x, y, size) {
    if (!img || !img.complete || !img.naturalWidth) return;
    var col = frame % 4;
    var row = Math.floor(frame / 4);
    ctx.drawImage(img, col * 512, row * 512, 512, 512, x - size / 2, y - size / 2, size, size);
  }

  function openOf(level, x, y, dx, dy) {
    var nx = x + dx;
    var ny = y + dy;
    if (ny < 0 || nx < 0 || ny >= level.rows || nx >= level.cols) return false;
    return level.grid[ny][nx].k !== 'wall';
  }

  function wallGeom(level, x, y) {
    var N = openOf(level, x, y, 0, -1);
    var E = openOf(level, x, y, 1, 0);
    var S = openOf(level, x, y, 0, 1);
    var W = openOf(level, x, y, -1, 0);
    var n = (N ? 1 : 0) + (E ? 1 : 0) + (S ? 1 : 0) + (W ? 1 : 0);
    if (n === 1) {
      if (S) return { key: 'straight', rot: 0 };
      if (W) return { key: 'straight', rot: Math.PI / 2 };
      if (N) return { key: 'straight', rot: Math.PI };
      return { key: 'straight', rot: -Math.PI / 2 };
    }
    if (n === 2 && ((N && E) || (E && S) || (S && W) || (W && N))) {
      if (S && E) return { key: 'corner', rot: 0 };
      if (S && W) return { key: 'corner', rot: Math.PI / 2 };
      if (N && W) return { key: 'corner', rot: Math.PI };
      return { key: 'corner', rot: -Math.PI / 2 };
    }
    if (n === 0) {
      var SE = openOf(level, x, y, 1, 1);
      var SW = openOf(level, x, y, -1, 1);
      var NE = openOf(level, x, y, 1, -1);
      var NW = openOf(level, x, y, -1, -1);
      if (SE && !SW && !NE && !NW) return { key: 'corner', rot: 0 };
      if (SW && !SE && !NE && !NW) return { key: 'corner', rot: Math.PI / 2 };
      if (NW && !SE && !SW && !NE) return { key: 'corner', rot: Math.PI };
      if (NE && !SE && !SW && !NW) return { key: 'corner', rot: -Math.PI / 2 };
      return null;
    }
    if (S) return { key: 'straight', rot: 0 };
    if (E) return { key: 'straight', rot: -Math.PI / 2 };
    if (N) return { key: 'straight', rot: Math.PI };
    if (W) return { key: 'straight', rot: Math.PI / 2 };
    return { key: 'straight', rot: 0 };
  }

  function cluster(cells) {
    if (!cells.length) return null;
    var sx = 0;
    var sy = 0;
    var minX = 99;
    var maxX = 0;
    var minY = 99;
    var maxY = 0;
    cells.forEach(function (c) {
      sx += c.x + 0.5;
      sy += c.y + 0.5;
      if (c.x < minX) minX = c.x;
      if (c.x > maxX) maxX = c.x;
      if (c.y < minY) minY = c.y;
      if (c.y > maxY) maxY = c.y;
    });
    return {
      x: sx / cells.length,
      y: sy / cells.length,
      minX: minX,
      maxX: maxX,
      minY: minY,
      maxY: maxY,
      n: cells.length
    };
  }

  function drawRotated(ctx, img, anchor, x, y, drawW, rot) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot || 0);
    blit(ctx, img, anchor[0], anchor[1], 0, 0, drawW);
    ctx.restore();
  }

  function render() {
    var canvas = $('maze');
    var ctx = canvas.getContext('2d');
    var level = sim.level;
    var dpr = canvas.width / Math.max(1, $('maze-zone').clientWidth);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var w = canvas.width / dpr;
    var h = canvas.height / dpr;
    ctx.fillStyle = '#1a1228';
    ctx.fillRect(0, 0, w, h);
    var toolsEl = document.querySelector('.maze-tools');
    var coachEl = $('coach');
    var chrome = 12;
    if (toolsEl) chrome = Math.max(chrome, toolsEl.offsetTop + toolsEl.offsetHeight + 8);
    if (coachEl && coachEl.textContent) chrome = Math.max(chrome, coachEl.offsetTop + coachEl.offsetHeight + 8);
    var cell = Math.min(w / level.cols, (h - chrome) / level.rows);
    var ox = (w - cell * level.cols) / 2;
    var oy = chrome + Math.max(0, (h - chrome - cell * level.rows) / 2);
    layout.chrome = chrome;
    layout.tileTop = oy;
    function px(x) { return ox + x * cell; }
    function py(y) { return oy + y * cell; }

    var y, x, c, g, box;
    for (y = 0; y < level.rows; y++) {
      for (x = 0; x < level.cols; x++) {
        c = level.grid[y][x];
        if (c.k === 'wall') continue;
        blit(ctx, images.floor, AN.floor[0], AN.floor[1], px(x + 0.5), py(y + 0.5), cell * 1.78);
        if (c.k === 'pad') blit(ctx, images.padTile, AN.padTile[0], AN.padTile[1], px(x + 0.5), py(y + 0.5), cell * 1.7);
        if (c.k === 'pit') blit(ctx, images.pitTile, AN.pitTile[0], AN.pitTile[1], px(x + 0.5), py(y + 0.5), cell * 1.35);
        if (c.k === 'upper') blit(ctx, images.floor, AN.floor[0], AN.floor[1], px(x + 0.5), py(y + 0.42), cell * 1.2);
      }
    }
    if (level.showBridge) {
      var ups = [];
      for (y = 0; y < level.rows; y++) {
        for (x = 0; x < level.cols; x++) {
          c = level.grid[y][x];
          if (c.k === 'upper' || c.k === 'stair') ups.push(c);
        }
      }
      box = cluster(ups);
      if (box && images.wh && images.wh.complete && images.wh.naturalWidth) {
        var bw = (box.maxX - box.minX + 1) * cell;
        var bh = (box.maxY - box.minY + 1) * cell;
        ctx.save();
        ctx.globalAlpha = 0.92;
        ctx.drawImage(images.wh, px(box.minX), py(box.minY), bw, bh);
        ctx.restore();
      }
    }
    (level.magnets || []).forEach(function (m) {
      if (m.type === 'circle') {
        blit(ctx, images.magC, AN.magC[0], AN.magC[1], px(m.cx), py(m.cy), m.r * 2 * cell * (512 / 342));
      } else if (images.magS && images.magS.complete && images.magS.naturalWidth) {
        ctx.save();
        ctx.globalAlpha = 0.8;
        ctx.drawImage(images.magS, px(m.x), py(m.y), m.w * cell, m.h * cell);
        ctx.restore();
      }
    });
    level.checkpoints.forEach(function (cp) {
      blit(ctx, images.cp, AN.cp[0], AN.cp[1], px(cp.x + 0.5), py(cp.y + 0.5), cell * 1.15);
    });
    level.supplies.forEach(function (s) {
      var used = sim.usedSupply[s.x + ',' + s.y];
      var key = used ? 'supD' : 'supU';
      blit(ctx, images[key], AN[key][0], AN[key][1], px(s.x + 0.5), py(s.y + 0.5), cell * 1.05);
    });
    var buttons = cluster(level.buttons);
    if (buttons) {
      var bkey = sim.buttonDown ? 'btnD' : 'btnU';
      blit(ctx, images[bkey], AN[bkey][0], AN[bkey][1], px(buttons.x), py(buttons.y), cell * 1.7);
    }
    var doors = cluster(level.doors);
    if (doors) {
      var gkey = sim.doorOpen ? 'gateO' : 'gateC';
      blit(ctx, images[gkey], AN[gkey][0], AN[gkey][1], px(doors.x), py(doors.y), cell * Math.max(1.4, doors.n * 0.95));
      if (sim.doorTimer != null && level.doorTime) {
        var remain = Math.max(0, sim.doorTimer / level.doorTime);
        var idx = Math.min(4, Math.floor((1 - remain) * 5));
        ctx.save();
        ctx.globalAlpha = 0.9;
        blit(ctx, images.seg, AN.arc[0], AN.arc[1], px(doors.x), py(doors.y), cell * 1.5);
        blit(ctx, images['arc' + idx], AN.arc[0], AN.arc[1], px(doors.x), py(doors.y), cell * 1.5);
        ctx.restore();
      }
    }
    var goals = cluster(level.goals);
    if (goals) {
      var mkey = level.mailbox;
      if (won && mkey === 'square') mkey = 'settled';
      blit(ctx, images[mkey], AN[mkey][0], AN[mkey][1], px(goals.x), py(goals.y), cell * 2.05);
    }
    for (y = 0; y < level.rows; y++) {
      for (x = 0; x < level.cols; x++) {
        if (level.grid[y][x].k !== 'wall') continue;
        g = wallGeom(level, x, y);
        if (!g) continue;
        drawRotated(ctx, images[g.key], AN[g.key], px(x + 0.5), py(y + 0.5), cell * 2.15, g.rot);
      }
    }
    if (sim.gravOn) {
      drawRotated(ctx, images.token, AN.token, px(level.cols - 1.15), py(1.15), cell * 1.15, sim.gAngle);
    }
    trail.forEach(function (p, i) {
      ctx.globalAlpha = (i + 1) / trail.length * 0.35;
      ctx.fillStyle = '#e8a88a';
      ctx.beginPath();
      ctx.arc(px(p.x), py(p.y), cell * 0.12, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    if (sim.speed > GPSim.CONST.WARN) {
      var ang = Math.atan2(sim.vy, sim.vx);
      var len = cell * (2.1 + Math.min(1.4, (sim.speed - GPSim.CONST.WARN) * 0.18));
      ctx.save();
      ctx.translate(px(sim.x), py(sim.y));
      ctx.rotate(ang - Math.PI);
      var sc = len / 768;
      ctx.drawImage(images.speed, -AN.speed[0] * sc, -AN.speed[1] * sc, 768 * sc, 256 * sc);
      ctx.restore();
    }
    fx.forEach(function (f) {
      var sheetImg = f.kind === 'hit' ? images.impact : (f.kind === 'pad' ? images.padfx : images.deliver);
      sheet(ctx, sheetImg, f.frame, px(f.x), py(f.y), cell * 1.8);
    });
    if (!(won && level.mailbox === 'square')) {
      var pkey = 'intact';
      if (sim.failReason === 'break' || sim.integrity <= 28) pkey = 'broken';
      else if (sim.integrity <= 62) pkey = 'scratched';
      var fall = sim.phase === 'fail' && sim.failReason === 'pit' ? (1 - sim.failT / 0.92) : 0;
      var parcelW = cell * 1.7 * (1 - fall * 0.65);
      ctx.save();
      ctx.globalAlpha = 1 - fall * 0.45;
      blit(ctx, images[pkey], AN[pkey][0], AN[pkey][1], px(sim.x), py(sim.y + fall * 0.2), parcelW);
      ctx.restore();
    }
    if (debug) {
      ctx.strokeStyle = 'rgba(232,168,138,.35)';
      for (y = 0; y < level.rows; y++) {
        for (x = 0; x < level.cols; x++) {
          if (GPSim.isSolid(sim, x + 0.5, y + 0.5)) {
            ctx.strokeRect(px(x) + 2, py(y) + 2, cell - 4, cell - 4);
          }
        }
      }
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  function setMeter(id, value, fullSrc, lowSrc) {
    var root = $(id);
    var pct = Math.max(0, Math.min(100, value));
    var clip = root.querySelector('.fillclip');
    var img = clip.querySelector('img');
    clip.style.width = pct + '%';
    img.style.width = root.clientWidth + 'px';
    img.style.height = '100%';
    var low = pct <= 35;
    var next = low ? lowSrc : fullSrc;
    if (img.getAttribute('src') !== next) img.src = next;
    root.setAttribute('aria-valuenow', String(Math.round(pct)));
    root.classList.toggle('low', low);
  }

  function say(text) {
    coach = text;
    $('coach').textContent = text;
  }

  function tip(id, text) {
    if (seenTip[id]) return;
    seenTip[id] = true;
    say(text);
  }

  function handleEvents() {
    var freshPad = false;
    sim.events.forEach(function (ev) {
      if (ev === 'hit') {
        GPAudio.sfx('hit');
        fx.push({ kind: 'hit', x: sim.x, y: sim.y, frame: 0, life: 0 });
        tip('hit', '这一下很快，完好度下降了。提前刹车，或者让软垫接住。');
      } else if (ev === 'pad') {
        freshPad = true;
      } else if (ev === 'supply') {
        GPAudio.sfx('supply');
        tip('supply', '补给已补满。再停在这里，不会第二次补充。');
      } else if (ev === 'door-open') {
        GPAudio.sfx('door-open');
        tip('door', '门开了。离开圆钮之后，圆环会收缩，门再关上。');
      } else if (ev === 'door-close') GPAudio.sfx('door-close');
      else if (ev === 'checkpoint') {
        GPAudio.sfx('checkpoint');
        snapshotActive();
        tip('cp', '检查点记下了。掉落或破裂会回到这里。');
      } else if (ev === 'warn') {
        GPAudio.sfx('warn');
        tip('warn', '拖影亮起来了。再快去撞铬墙，完好度会下降。');
      } else if (ev === 'pit') {
        GPAudio.sfx('pit');
        $('toast').hidden = false;
        $('toast').textContent = '掉进回收坑了，回到最近的检查点。';
      } else if (ev === 'break') {
        GPAudio.sfx('break');
        $('toast').hidden = false;
        $('toast').textContent = '包裹裂开了，回到最近的检查点。';
      } else if (ev === 'restored') {
        $('toast').hidden = true;
        snapshotActive();
      } else if (ev === 'win') onWin();
      else if (ev === 'nopower') tip('nopower', '动力用尽，刹车停了。去找还亮着的补给座。');
    });
    if (freshPad && sim.onPad) {
      GPAudio.sfx('pad');
      fx.push({ kind: 'pad', x: sim.x, y: sim.y, frame: 0, life: 0 });
      tip('pad', '桃色软垫只作缓冲，完好度保持不变。');
    }
  }

  function onWin() {
    if (won) return;
    won = true;
    GPAudio.sfx('win');
    fx.push({ kind: 'win', x: sim.x, y: sim.y, frame: 0, life: 0 });
    var level = sim.level;
    var medals = medalCount(level, sim.hits, sim.powerUsed);
    save.cleared[levelIndex] = true;
    save.medals[levelIndex] = Math.max(save.medals[levelIndex] || 0, medals);
    if (levelIndex + 1 > save.unlocked) save.unlocked = Math.min(4, levelIndex + 1);
    save.active = levelIndex < 4 ? { level: levelIndex + 1, snap: null } : null;
    writeSave();
    var words = ['', '一枚奖章', '两枚奖章', '三枚奖章'];
    $('win-title').textContent = level.name;
    $('win-kicker').textContent = words[medals];
    $('win-stats').textContent = '碰撞 ' + sim.hits + ' 次，动力用去 ' + Math.round(sim.powerUsed) + '。';
    var row = $('win-medals');
    row.innerHTML = '';
    for (var i = 0; i < 3; i++) {
      var dot = document.createElement('i');
      if (i < medals) dot.className = 'on';
      row.appendChild(dot);
    }
    $('btn-next').hidden = levelIndex >= 4;
    $('win-panel').hidden = false;
    $('toast').hidden = true;
  }

  function applyInput() {
    if (!sim || sim.phase !== 'play' || won) {
      if (sim) sim.brake = false;
      return;
    }
    var kx = 0;
    var ky = 0;
    if (keys.ArrowLeft || keys.KeyA) kx -= 1;
    if (keys.ArrowRight || keys.KeyD) kx += 1;
    if (keys.ArrowUp || keys.KeyW) ky -= 1;
    if (keys.ArrowDown || keys.KeyS) ky += 1;
    if (dialId == null && (kx || ky)) GPSim.setFinger(sim, Math.atan2(ky, kx));
    else if (dialId == null) GPSim.setFinger(sim, null);
    sim.brake = brakeHeld || !!keys.Space;
  }

  function loop(now) {
    raf = requestAnimationFrame(loop);
    var dt = Math.min(0.033, (now - last) / 1000 || 0);
    last = now;
    spriteAcc += dt;
    if (!reduce && spriteAcc >= 1 / 12) {
      spriteAcc = 0;
      clipFrame = (clipFrame + 1) % 24;
      if (clipHold) {
        clipHold -= 1;
        if (clipHold <= 0) setClip(hovering ? 'bounce' : 'tilt', hovering ? 0 : 0);
      }
      layoutSprites();
    }
    if (paused || !sim || hiddenPause || $('screen-play').hidden) return;
    applyInput();
    if (!won && sim.phase !== 'win') GPSim.step(sim, dt);
    GPAudio.roll(sim.speed || 0);
    handleEvents();
    if (sim.phase === 'play') {
      trail.push({ x: sim.x, y: sim.y });
      if (trail.length > 14) trail.shift();
      if (sim.gravOn && !seenTip.roll && sim.speed > 1.4) {
        tip('roll', '松手以后包裹还会滚。靠近信箱再按住右侧刹车。');
      }
    }
    fx = fx.filter(function (f) {
      f.life += dt;
      f.frame = Math.min(7, Math.floor(f.life * 16));
      return f.life < 0.5;
    });
    setMeter('meter-integrity', sim.integrity, 'assets/ui/b05-integrity-fill-full.png', 'assets/ui/b05-integrity-fill-low.png');
    setMeter('meter-power', sim.power, 'assets/ui/b05-power-fill-full.png', 'assets/ui/b05-power-fill-low.png');
    var deg = (sim.gAngle + Math.PI / 2) * 180 / Math.PI;
    $('dial-arrow').style.transform = 'rotate(' + deg + 'deg)';
    $('brake-img').src = sim.brake ? 'assets/ui/b05-ui-brake-held.png' : 'assets/ui/b05-ui-brake-idle.png';
    $('brake').setAttribute('aria-pressed', sim.brake ? 'true' : 'false');
    $('coach').textContent = coach;
    render();
  }

  function dialAngle(ev) {
    var rect = $('dial').getBoundingClientRect();
    var dx = ev.clientX - (rect.left + rect.width / 2);
    var dy = ev.clientY - (rect.top + rect.height / 2);
    if (Math.hypot(dx, dy) < rect.width * 0.14) return null;
    return Math.atan2(dy, dx);
  }

  function bind() {
    document.addEventListener('pointerdown', function () {
      GPAudio.arm();
    }, { once: false });
    document.querySelectorAll('[data-music]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        save.music = GPAudio.toggle();
        GPAudio.setWanted(save.music);
        syncMusicButtons();
        writeSave();
      });
    });
    document.querySelectorAll('[data-sens]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        save.sens = btn.getAttribute('data-sens');
        syncSens();
        writeSave();
      });
    });
    $('btn-sens').addEventListener('click', function () {
      var order = ['low', 'mid', 'high'];
      save.sens = order[(order.indexOf(save.sens) + 1) % 3];
      syncSens();
      writeSave();
    });
    $('btn-start').addEventListener('click', function () {
      if (save.active && typeof save.active.level === 'number') startLevel(save.active.level, !!save.active.snap);
      else startLevel(Math.min(save.unlocked, 4), false);
    });
    $('btn-cover-levels').addEventListener('click', function () {
      renderLevelList();
      show('screen-levels');
    });
    $('btn-levels-cover').addEventListener('click', function () {
      refreshCover();
      show('screen-cover');
    });
    $('btn-list').addEventListener('click', function () {
      renderLevelList();
      show('screen-levels');
    });
    $('btn-restart').addEventListener('click', function () {
      if (!sim) return;
      GPSim.restart(sim);
      won = false;
      coach = sim.level.intro;
      seenTip = {};
      $('win-panel').hidden = true;
      $('toast').hidden = true;
      save.active = { level: levelIndex, snap: null };
      writeSave();
    });
    $('btn-next').addEventListener('click', function () {
      if (levelIndex < 4) startLevel(levelIndex + 1, false);
    });
    $('btn-again').addEventListener('click', function () { startLevel(levelIndex, false); });
    $('btn-win-list').addEventListener('click', function () {
      renderLevelList();
      show('screen-levels');
    });
    var dial = $('dial');
    dial.addEventListener('pointerdown', function (ev) {
      dialId = ev.pointerId;
      dial.setPointerCapture(ev.pointerId);
      var ang = dialAngle(ev);
      if (ang != null && sim) GPSim.setFinger(sim, ang);
      ev.preventDefault();
    });
    dial.addEventListener('pointermove', function (ev) {
      if (dialId !== ev.pointerId || !sim) return;
      var ang = dialAngle(ev);
      if (ang != null) GPSim.setFinger(sim, ang);
    });
    function endDial(ev) {
      if (dialId !== ev.pointerId) return;
      dialId = null;
    }
    dial.addEventListener('pointerup', endDial);
    dial.addEventListener('pointercancel', endDial);
    var brake = $('brake');
    brake.addEventListener('pointerdown', function (ev) {
      brakeHeld = true;
      brake.setPointerCapture(ev.pointerId);
      ev.preventDefault();
    });
    function endBrake(ev) {
      if (brake.hasPointerCapture && brake.hasPointerCapture(ev.pointerId)) brakeHeld = false;
      brakeHeld = false;
    }
    brake.addEventListener('pointerup', endBrake);
    brake.addEventListener('pointercancel', endBrake);
    window.addEventListener('keydown', function (ev) {
      keys[ev.code] = true;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].indexOf(ev.code) >= 0) ev.preventDefault();
    });
    window.addEventListener('keyup', function (ev) { keys[ev.code] = false; });
    window.addEventListener('resize', function () {
      orient();
      if (!$('screen-play').hidden) resizeCanvas();
    });
    document.addEventListener('visibilitychange', function () {
      hiddenPause = document.hidden;
      GPAudio.visibility(document.hidden);
    });
    window.addEventListener('pagehide', snapshotActive);
    var coverM = $('cover-mascot');
    coverM.addEventListener('pointerenter', function () { hovering = true; if (!clipHold) setClip('bounce'); });
    coverM.addEventListener('pointerleave', function () { hovering = false; if (!clipHold) setClip('tilt'); });
    coverM.addEventListener('click', function () { setClip('brake', 24); });
    $('levels-mascot').addEventListener('click', function () { setClip('brake', 24); });
  }

  GPAudio.setWanted(save.music !== false);
  syncMusicButtons();
  syncSens();
  refreshCover();
  orient();
  bind();
  layoutSprites();
  raf = requestAnimationFrame(loop);
  window.__GP = {
    get sim() { return sim; },
    get save() { return save; },
    startLevel: startLevel,
    medalCount: medalCount,
    pause: function (v) { paused = !!v; },
    get layout() { return layout; },
    errors: []
  };
  window.addEventListener('error', function (ev) {
    window.__GP.errors.push(String(ev.message || ev.error || 'error'));
  });
})();
