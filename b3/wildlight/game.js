/* 野光图鉴。第一人称观察拍照。林中用六态鸟静帧，封面用默认展尾精灵表。 */
(function () {
  'use strict';

  var SAVE_KEY = 'wildlight_save_v1';
  var QA = /[?&]qa=1/.test(location.search);
  var REDUCE = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var AUDIO = window.WILD_AUDIO;

  var PRE = 1400;
  var ACT = 7000;
  var IDLE = 1000;
  var CYCLE = PRE + ACT + IDLE;
  var FOCUS_NEED = 720;

  var CLIPS = {
    fan: {
      src: 'assets/anim/b26-mascot-sheet-fan.webp',
      still: 'assets/anim/b26-mascot-still-fan.png',
      fw: 480, fh: 404, cols: 6, n: 24, fps: 12,
      ax: 219.53502207956697, ay: 228.4650618545479
    },
    look: {
      src: 'assets/anim/b26-mascot-sheet-look.webp',
      still: 'assets/anim/b26-mascot-still-look.png',
      fw: 378, fh: 358, cols: 6, n: 24, fps: 12,
      ax: 184.522378451043, ay: 181.47002406471665
    },
    hop: {
      src: 'assets/anim/b26-mascot-sheet-hop.webp',
      still: 'assets/anim/b26-mascot-still-hop.png',
      fw: 396, fh: 458, cols: 6, n: 24, fps: 12,
      ax: 196.51949918610623, ay: 282.46011291941784
    }
  };

  var BIRD = {
    idle: { src: 'assets/props/b26-bird-idle.png', ax: 256.5, ay: 407.96, box: [156, 74, 357, 437] },
    drink: { src: 'assets/props/b26-bird-drink.png', ax: 256.5, ay: 357.64, box: [78, 135, 435, 377] },
    display: { src: 'assets/props/b26-bird-display.png', ax: 256, ay: 402.16, box: [47, 82, 465, 430] },
    feed: { src: 'assets/props/b26-bird-feed.png', ax: 255.5, ay: 359.32, box: [34, 133, 477, 379] },
    preen: { src: 'assets/props/b26-bird-preen.png', ax: 256, ay: 370.24, box: [81, 120, 431, 392] },
    startle: { src: 'assets/props/b26-bird-startle.png', ax: 256, ay: 382, box: [26, 106, 486, 406] }
  };

  var PERCH = {
    portrait: { nx: 0.5, ny: 0.615 },
    shade: { nx: 0.67, ny: 0.445 },
    landscape: { nx: 0.64, ny: 0.64 }
  };

  var PHASE_NAME = ['晨光', '午间', '暮色'];
  var GOAL = ['drink', 'display', 'feed'];
  var GOAL_NAME = { drink: '饮水', display: '展羽', feed: '喂食' };
  var GUIDE_NOTE = {
    drink: '晨光里先望水，再低头喝。拍到之后，这里记为溪岸晨光。',
    display: '午间先理羽，再展开尾羽。拍到之后，这里记为林中午间。',
    feed: '暮色放下叶杯，它会来啄食。拍到之后，这里记为暮色石台。'
  };

  var REASON = {
    away: '它避开了，这张没有主体。',
    focus: '对焦还没锁上，这张不算。',
    blocked: '树干挡住了主体。',
    tail: '只拍到尾羽，主体没入框。',
    out: '主体没入框。',
    pre: '前兆还在，行为还没开始。',
    idle: '它还停着，等行为出现再拍。'
  };

  function $(id) { return document.getElementById(id); }

  var stage = $('stage');
  var cover = $('screen-cover');
  var play = $('screen-play');
  var coverBg = $('cover-bg');
  var coverActor = $('cover-actor');
  var enterLine = $('enter-line');
  var btnStart = $('btn-start');
  var btnContinue = $('btn-continue');
  var btnReset = $('btn-reset');
  var coverMusic = $('cover-music');
  var playMusic = $('play-music');
  var world = $('world');
  var look = $('look');
  var focusFrame = $('focus-frame');
  var focusRing = $('focus-ring');
  var filmEl = $('film');
  var filmClip = $('film-clip');
  var filmFill = $('film-fill');
  var behaviors = $('behaviors');
  var phaseChip = $('phase-chip');
  var banner = $('banner');
  var omen = $('omen');
  var omenImg = $('omen-img');
  var omenText = $('omen-text');
  var photos = $('photos');
  var shutterBtn = $('shutter');
  var shutterImg = $('shutter-img');
  var distRing = $('dist-ring');
  var distLabel = $('dist-label');
  var btnLure = $('btn-lure');
  var panelTutor = $('panel-tutor');
  var panelCamp = $('panel-camp');
  var panelGuide = $('panel-guide');
  var panelDone = $('panel-done');
  var guideList = $('guide-list');

  var sheets = {};
  var stills = {};
  var coverClip = 'fan';
  var hopUntil = 0;
  var entering = false;
  var playAssetsReady = false;
  var img = {};
  var rims = { empty: '', filled: '' };
  var layout = { w: 0, h: 0, land: false, narrow: false, vf: { x: 0, y: 0, w: 1, h: 1 } };
  var saidAt = 0;
  var lastHint = '';
  var ptr = null;
  var lastTick = 0;
  var playing = false;
  var coverTimer = 0;

  var state = {};

  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

  function fresh() {
    state.gaze = -0.84;
    state.phase = 0;
    state.clock = 360;
    state.film = 3;
    state.lureReady = true;
    state.lureDown = false;
    state.found = {};
    state.photos = {};
    state.focus = 0;
    state.focusT = 0;
    state.focusGaze = -0.84;
    state.lockLeft = 0;
    state.absent = false;
    state.fright = 0;
    state.lastSafe = 'shade';
    state.tutor = false;
    state.celebrated = false;
    state.music = true;
    state.fx = null;
    state.shotLock = 0;
  }

  function save() {
    var data = {
      v: 1,
      found: state.found,
      photos: state.photos,
      film: state.film,
      phase: state.phase,
      lureReady: state.lureReady,
      lureDown: state.lureDown,
      music: state.music,
      tutor: state.tutor,
      celebrated: state.celebrated
    };
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch (err) {
      data.photos = {};
      try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch (err2) { /* 配额不足时放弃缩略图 */ }
    }
  }

  function load() {
    try {
      var raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      var data = JSON.parse(raw);
      if (!data || data.v !== 1) return false;
      state.found = data.found || {};
      state.photos = data.photos || {};
      state.film = clamp(data.film | 0, 0, 3);
      state.phase = ((data.phase | 0) % 3 + 3) % 3;
      state.lureReady = data.lureReady !== false;
      state.lureDown = !!data.lureDown;
      state.music = data.music !== false;
      state.tutor = !!data.tutor;
      state.celebrated = !!data.celebrated;
      state.clock = PRE - 700;
      return true;
    } catch (err) {
      return false;
    }
  }

  function hasSave() {
    try { return !!localStorage.getItem(SAVE_KEY); } catch (err) { return false; }
  }

  function syncMusic() {
    var on = !!(AUDIO && AUDIO.wanted());
    coverMusic.setAttribute('aria-pressed', on ? 'true' : 'false');
    playMusic.setAttribute('aria-pressed', on ? 'true' : 'false');
  }

  function gesture() {
    if (AUDIO) AUDIO.arm();
  }

  function postOf(g) {
    if (g >= 0.42) return 'close';
    if (g < -0.22) return 'shade';
    return 'bank';
  }

  function snapGaze(g) {
    if (g < -0.62) return -0.84;
    if (g < -0.22) return -0.4;
    if (g < 0.42) return 0.06;
    return 0.74;
  }

  function sceneKey() {
    if (layout.land) return 'landscape';
    var post = postOf(state.gaze);
    var safe = post === 'close' ? state.lastSafe : post;
    return safe === 'bank' ? 'portrait' : 'shade';
  }

  function setGaze(g) {
    g = clamp(g, -1, 1);
    var prev = postOf(state.gaze);
    state.gaze = g;
    var next = postOf(g);
    if (next !== 'close') state.lastSafe = next;
    if (prev !== 'close' && next === 'close') beginFright();
    if (prev === 'close' && next !== 'close') recover();
    if (state.focus === 2 && Math.abs(g - state.focusGaze) > 0.05) state.focus = 0;
  }

  function beginFright() {
    state.focus = 0;
    if (state.absent) return;
    state.fright = 560;
    var view = worldView();
    if (view) spawnFx('startlefx', view.feet.x, view.feet.y - 10, birdSize() * 1.15);
    say('靠得太近，它暂时避开了。退回观察位就会回来。');
    if (AUDIO) AUDIO.sting('flee');
  }

  function recover() {
    var was = state.absent || state.fright > 0;
    state.absent = false;
    state.fright = 0;
    state.clock = PRE - 800;
    if (was) say('它回到观察位了。');
  }

  function cycleSlot() {
    var t = ((state.clock % CYCLE) + CYCLE) % CYCLE;
    if (t < PRE) return 'pre';
    if (t < PRE + ACT) return 'act';
    return 'idle';
  }

  function currentPose() {
    if (state.fright > 0) return 'startle';
    if (state.absent) return null;
    var slot = cycleSlot();
    if (state.phase === 0) return slot === 'act' ? 'drink' : 'idle';
    if (state.phase === 1) {
      if (slot === 'act') return 'display';
      if (slot === 'pre') return 'preen';
      return 'idle';
    }
    if (!state.lureDown) return 'idle';
    return slot === 'act' ? 'feed' : 'idle';
  }

  function allFound() {
    return !!(state.found.drink && state.found.display && state.found.feed);
  }

  function say(text) {
    banner.textContent = text;
    saidAt = performance.now();
    lastHint = '';
  }

  function panelOpen() {
    return !panelTutor.hidden || !panelCamp.hidden || !panelGuide.hidden || !panelDone.hidden;
  }

  function coreBox(id, box) {
    var x0 = box[0], y0 = box[1], x1 = box[2], y1 = box[3];
    var w = x1 - x0, h = y1 - y0;
    if (id === 'drink' || id === 'feed') return [x0 + w * 0.46, y0 + h * 0.1, x1 - w * 0.03, y1 - h * 0.08];
    if (id === 'display') return [x0 + w * 0.3, y0 + h * 0.28, x1 - w * 0.3, y1 - h * 0.06];
    return [x0 + w * 0.2, y0 + h * 0.12, x1 - w * 0.16, y1 - h * 0.12];
  }

  function spriteRect(box, anchor, feet, size) {
    var s = size / 512;
    return {
      x: feet.x + (box[0] - anchor.ax) * s,
      y: feet.y + (box[1] - anchor.ay) * s,
      w: (box[2] - box[0]) * s,
      h: (box[3] - box[1]) * s
    };
  }

  function rectIntersect(a, b) {
    if (!a || !b) return { x: 0, y: 0, w: 0, h: 0 };
    var x0 = Math.max(a.x, b.x);
    var y0 = Math.max(a.y, b.y);
    var x1 = Math.min(a.x + a.w, b.x + b.w);
    var y1 = Math.min(a.y + a.h, b.y + b.h);
    return { x: x0, y: y0, w: Math.max(0, x1 - x0), h: Math.max(0, y1 - y0) };
  }

  function area(r) { return r ? Math.max(0, r.w) * Math.max(0, r.h) : 0; }

  function insetRect(r, p) {
    var mx = r.w * p, my = r.h * p;
    return { x: r.x + mx, y: r.y + my, w: Math.max(1, r.w - mx * 2), h: Math.max(1, r.h - my * 2) };
  }

  function birdSize() {
    var post = postOf(state.gaze);
    var mul = post === 'shade' ? 0.74 : post === 'close' ? 1.18 : 1;
    return Math.max(72, layout.vf.h * 0.4 * mul);
  }

  function targetFeet() {
    var vf = layout.vf;
    var post = postOf(state.gaze);
    var edge = post === 'shade' && state.gaze < -0.62;
    var tail = birdSize() * 0.36;
    return {
      x: edge ? vf.x + vf.w * 0.95 + tail * 0.55 : vf.x + vf.w * (post === 'shade' ? 0.55 : 0.48),
      y: vf.y + vf.h * (layout.land ? 0.78 : 0.68)
    };
  }

  function fitCamera(image, sw, sh, perch, target) {
    var zoom = 1.08;
    var best = null;
    for (var i = 0; i < 10; i++) {
      var scale = Math.max(sw / image.w, sh / image.h) * zoom;
      var dw = image.w * scale;
      var dh = image.h * scale;
      var maxX = Math.max(1, dw - sw);
      var maxY = Math.max(1, dh - sh);
      var panX = clamp((perch.nx * dw - target.x) / maxX, 0, 1);
      var panY = clamp((perch.ny * dh - target.y) / maxY, 0, 1);
      var x = -maxX * panX;
      var y = -maxY * panY;
      var sx = x + perch.nx * dw;
      var sy = y + perch.ny * dh;
      best = { x: x, y: y, dw: dw, dh: dh, sx: sx, sy: sy, err: Math.abs(sx - target.x) + Math.abs(sy - target.y) };
      if (best.err < 10) break;
      zoom += 0.1;
    }
    return best;
  }

  function worldView() {
    var key = sceneKey();
    var image = img[key];
    var sw = world.clientWidth;
    var sh = world.clientHeight;
    if (!image || !image.w || !sw || !sh) return null;
    var cam = fitCamera(image, sw, sh, PERCH[key], targetFeet());
    cam.key = key;
    cam.image = image;
    cam.feet = { x: cam.sx, y: cam.sy };
    cam.trunk = key === 'shade' ? cam.x + 0.32 * cam.dw : -9999;
    return cam;
  }

  function framingOf(pose) {
    if (!pose || state.absent) return 'out';
    var spec = BIRD[pose];
    var view = worldView();
    if (!view || !spec) return 'out';
    var size = birdSize();
    var drop = view.key === 'landscape' ? size * 0.06 : 0;
    var feet = { x: view.feet.x, y: view.feet.y + drop };
    var content = spriteRect(spec.box, spec, feet, size);
    var core = spriteRect(coreBox(pose, spec.box), spec, feet, size);
    var vf = insetRect(layout.vf, 0.05);
    var open = { x: view.trunk, y: -4000, w: 12000, h: 12000 };
    var visCore = rectIntersect(rectIntersect(core, vf), open);
    var coreA = area(core);
    if (coreA > 1 && area(visCore) / coreA >= 0.62) return 'in';
    var visContent = rectIntersect(rectIntersect(content, vf), open);
    if (area(visContent) > 20) {
      var ccx = core.x + core.w / 2;
      if (view.key === 'shade' && ccx < view.trunk) return 'blocked';
      return 'tail';
    }
    return 'out';
  }

  function computeHint() {
    if (state.film <= 0) return '胶片用完了。回营地补充后再拍。';
    var post = postOf(state.gaze);
    if (post === 'close' || state.absent || state.fright > 0) {
      return '靠得太近，它暂时避开了。退回观察位就会回来。';
    }
    var pose = currentPose();
    var slot = cycleSlot();
    var frame = framingOf(pose);
    if (frame === 'blocked') return '树干挡住了主体，再拖一点。';
    if (frame === 'tail') return '这个角度只看得到尾羽，再拖一点。';
    if (frame === 'out') return '主体不在取景框里，拖动画面把它带进来。';
    if (state.phase === 2 && !state.lureDown) return '放下叶杯，暮色里它会过来啄食。';
    if (slot === 'pre' && state.phase === 0) return '它在望水，接着会低头喝。';
    if (slot === 'pre' && state.phase === 1) return '它在理羽，接着会展开尾羽。';
    if (slot === 'pre' && state.phase === 2) return '小虫聚到叶杯上了，接着会啄食。';
    if (pose === 'drink') return state.focus === 2 ? '它在喝水，可以按快门。' : '它在喝水。按住画面对焦。';
    if (pose === 'display') return state.focus === 2 ? '尾羽展开了，可以按快门。' : '尾羽展开了。按住画面对焦。';
    if (pose === 'feed') return state.focus === 2 ? '它在啄食，可以按快门。' : '它在啄食。按住画面对焦。';
    return '拖动画面换观察位，或快进时间。';
  }

  function place(el, x, y, w, h) {
    el.style.left = Math.round(x) + 'px';
    el.style.top = Math.round(y) + 'px';
    el.style.right = 'auto';
    el.style.width = Math.round(Math.max(8, w)) + 'px';
    el.style.height = Math.round(Math.max(8, h)) + 'px';
  }

  function layoutNow() {
    var W = stage.clientWidth;
    var H = stage.clientHeight;
    var land = W > H;
    document.documentElement.classList.toggle('land', land);
    layout.w = W;
    layout.h = H;
    layout.land = land;
    layout.narrow = !land && W / H < 0.52;
    if (land) layoutLand(W, H);
    else layoutPort(W, H, layout.narrow);
    var ring = Math.min(96, Math.min(layout.vf.w, layout.vf.h) * 0.22);
    place(focusRing, layout.vf.x + layout.vf.w - ring - 10, layout.vf.y + 28, ring, ring);
    place(focusFrame, layout.vf.x, layout.vf.y, layout.vf.w, layout.vf.h);
    place(banner, layout.vf.x + 10, layout.vf.y + layout.vf.h - 48, layout.vf.w - 20, 40);
    paintFilm();
  }

  function layoutPort(W, H, narrow) {
    var m = narrow ? Math.round(W * 0.12) : Math.round(W * 0.07);
    var edge = 10;
    place(playMusic, W - edge - 44, 8, 44, 36);
    var filmW = Math.max(108, Math.min(168, W * 0.34));
    place(filmEl, m, 50, filmW, 28);
    var behW = narrow ? Math.min(156, W - m - filmW - 16) : 210;
    place(behaviors, W - m - behW, 46, behW, 50);
    var vfTop = 102;
    var vfH = Math.round(H * (narrow ? 0.4 : 0.44));
    var vf = { x: m, y: vfTop, w: W - m * 2, h: vfH };
    layout.vf = vf;
    place(phaseChip, vf.x + 8, vf.y + 6, 72, 20);
    var toolsY = vf.y + vf.h + 8;
    place($('tools'), m, toolsY, W - m * 2, 52);
    var bottomTop = toolsY + 60;
    var bottomH = H - bottomTop - 12;
    var slotH = bottomH / 3;
    var slotW = slotH * 0.8;
    var maxSlotW = narrow ? W * 0.22 : W * 0.24;
    if (slotW > maxSlotW) {
      slotW = maxSlotW;
      slotH = Math.min(slotH, slotW / 0.8);
    }
    var photoH = slotH * 3;
    place(photos, m, bottomTop + (bottomH - photoH) / 2, slotW, photoH);
    var dist = Math.min(84, bottomH * 0.46);
    var distX = W - m - dist;
    var shut = Math.min(118, bottomH * 0.62);
    var gapL = m + slotW + 10;
    var gapR = distX - 10;
    if (shut > gapR - gapL) shut = Math.max(72, gapR - gapL);
    var shutX = gapL + Math.max(0, (gapR - gapL - shut) / 2);
    var shutY = bottomTop + (bottomH - shut) / 2;
    place(shutterBtn, shutX, shutY, shut, shut);
    place($('distance'), distX, bottomTop + (bottomH - dist) / 2, dist, dist);
  }

  function layoutLand(W, H) {
    var vf = {
      x: Math.round(W * 0.03),
      y: Math.round(H * 0.08),
      w: Math.round(W * 0.64),
      h: Math.round(H * 0.84)
    };
    layout.vf = vf;
    var rx = Math.round(W * 0.72);
    var rw = Math.round(W * 0.97) - rx;
    place(playMusic, rx + rw - 44, 8, 44, 36);
    place(filmEl, rx, 50, rw, 32);
    place(behaviors, rx, 88, rw, 52);
    place(phaseChip, rx, 142, rw, 20);
    var photoTop = 166;
    var photoH = Math.round(H * 0.26);
    place(photos, rx, photoTop, rw, photoH);
    var toolsTop = photoTop + photoH + 8;
    place($('tools'), rx, toolsTop, rw, 54);
    var shut = Math.min(108, H * 0.18);
    var shutTop = toolsTop + 62;
    if (shutTop + shut + 78 > H - 8) {
      shut = Math.max(72, H - 86 - shutTop);
    }
    place(shutterBtn, rx + (rw - shut) / 2, shutTop, shut, shut);
    var dist = Math.min(70, rw * 0.36);
    place($('distance'), rx + (rw - dist) / 2, Math.min(H - dist - 8, shutTop + shut + 6), dist, dist);
  }

  function paintFilm() {
    var w = filmEl.clientWidth || 120;
    var h = filmEl.clientHeight || 30;
    filmFill.style.width = w + 'px';
    filmFill.style.height = h + 'px';
    if (state.film <= 0) {
      filmClip.style.width = '0px';
      filmEl.setAttribute('aria-label', '胶片用完了');
      return;
    }
    if (state.film === 1) {
      if (filmFill.getAttribute('data-k') !== 'low') {
        filmFill.src = 'assets/ui/b26-film-fill-low.png';
        filmFill.setAttribute('data-k', 'low');
      }
      filmClip.style.width = w + 'px';
      filmEl.setAttribute('aria-label', '胶片不多了');
    } else {
      if (filmFill.getAttribute('data-k') !== 'full') {
        filmFill.src = 'assets/ui/b26-film-fill-full.png';
        filmFill.setAttribute('data-k', 'full');
      }
      filmClip.style.width = Math.round(w * state.film / 3) + 'px';
      filmEl.setAttribute('aria-label', '胶片还够');
    }
  }

  function paintChrome() {
    phaseChip.textContent = PHASE_NAME[state.phase];
    var nodes = behaviors.children;
    for (var i = 0; i < GOAL.length; i++) {
      var el = nodes[i];
      el.classList.toggle('got', !!state.found[GOAL[i]]);
      el.classList.toggle('now', state.phase === i);
    }
    var post = postOf(state.gaze);
    distLabel.textContent = post === 'close' ? '过近' : post === 'shade' ? '树荫' : '溪岸';
    var ringSrc = post === 'close' ? 'assets/overlays/b26-ring-close.png' : 'assets/overlays/b26-ring-safe.png';
    if (distRing.getAttribute('data-k') !== ringSrc) {
      distRing.src = ringSrc;
      distRing.setAttribute('data-k', ringSrc);
    }
    btnLure.classList.toggle('off', !state.lureReady || state.lureDown);
    var frameSrc = 'assets/ui/b26-ui-focus-soft.png';
    var ring = '';
    if (state.focus === 2) {
      frameSrc = 'assets/ui/b26-ui-focus-lock.png';
      ring = 'assets/ui/b26-ui-focus-progress-03.png';
    } else if (state.focus === 1) {
      var step = Math.min(3, Math.floor(state.focusT / (FOCUS_NEED / 4)));
      ring = 'assets/ui/b26-ui-focus-progress-0' + step + '.png';
      frameSrc = step >= 2 ? 'assets/ui/b26-ui-focus-sharp.png' : 'assets/ui/b26-ui-focus-soft.png';
    }
    if (focusFrame.getAttribute('data-k') !== frameSrc) {
      focusFrame.src = frameSrc;
      focusFrame.setAttribute('data-k', frameSrc);
    }
    if (ring) {
      focusRing.hidden = false;
      if (focusRing.getAttribute('data-k') !== ring) {
        focusRing.src = ring;
        focusRing.setAttribute('data-k', ring);
      }
    } else {
      focusRing.hidden = true;
    }
    world.classList.toggle('soft', state.focus !== 2 && !REDUCE);
    paintSlots();
    paintFilm();
    var pose = currentPose();
    var kind = omenKind();
    if (kind) {
      omen.hidden = false;
      var src = 'assets/ui/b26-ui-icon-' + kind + '.png';
      if (omenImg.getAttribute('data-k') !== src) {
        omenImg.src = src;
        omenImg.setAttribute('data-k', src);
      }
      omenText.textContent = kind === 'lookwater' ? '望水' : kind === 'preen' ? '理羽' : '聚食';
    } else {
      omen.hidden = true;
    }
    stage.dataset.pose = pose || 'none';
    stage.dataset.framing = framingOf(pose);
    stage.dataset.film = String(state.film);
    stage.dataset.post = post;
    stage.dataset.phase = String(state.phase);
    stage.dataset.absent = state.absent ? '1' : '0';
    stage.dataset.focus = String(state.focus);
    stage.dataset.slot = cycleSlot();
    stage.dataset.found = GOAL.filter(function (k) { return state.found[k]; }).join(',');
    stage.dataset.lure = state.lureDown ? '1' : '0';
    stage.dataset.fright = state.fright > 0 ? '1' : '0';
  }

  function omenKind() {
    if (state.absent || state.fright > 0) return null;
    if (cycleSlot() !== 'pre') return null;
    if (state.phase === 0) return 'lookwater';
    if (state.phase === 1) return 'preen';
    if (state.phase === 2 && state.lureDown) return 'feed';
    return null;
  }

  function paintSlots() {
    var slots = photos.children;
    for (var i = 0; i < GOAL.length; i++) {
      var key = GOAL[i];
      var pic = slots[i].querySelector('.pic');
      var rim = slots[i].querySelector('.rim');
      if (state.photos[key]) {
        pic.hidden = false;
        if (pic.getAttribute('data-k') !== key + state.photos[key].length) {
          pic.src = state.photos[key];
          pic.setAttribute('data-k', key + state.photos[key].length);
        }
        if (rims.filled) rim.src = rims.filled;
      } else {
        pic.hidden = true;
        if (rims.empty) rim.src = rims.empty;
      }
    }
  }

  function placeOmen(view) {
    if (omen.hidden || !view) return;
    var pose = currentPose() || 'idle';
    var spec = BIRD[pose];
    var size = birdSize();
    var headY = view.feet.y - (spec.ay - spec.box[1]) * (size / 512) - 6;
    var x = clamp(view.feet.x - 28, layout.vf.x + 4, layout.vf.x + layout.vf.w - 76);
    var y = clamp(headY - 52, layout.vf.y + 4, layout.vf.y + layout.vf.h - 78);
    omen.style.left = Math.round(x) + 'px';
    omen.style.top = Math.round(y) + 'px';
  }

  function drawAnchored(ctx, image, ax, ay, px, py, size) {
    if (!image) return;
    var s = size / 512;
    ctx.drawImage(image, px - ax * s, py - ay * s, size, size);
  }

  function drawWorld(ctx) {
    var sw = world.clientWidth;
    var sh = world.clientHeight;
    ctx.clearRect(0, 0, sw, sh);
    ctx.fillStyle = '#18201C';
    ctx.fillRect(0, 0, sw, sh);
    var view = worldView();
    if (!view) return null;
    ctx.drawImage(view.image, view.x, view.y, view.dw, view.dh);
    var overlay = null;
    if (state.phase === 0) overlay = img[layout.land ? 'hazeL' : 'hazeP'];
    if (state.phase === 2) overlay = img[layout.land ? 'duskL' : 'duskP'];
    if (overlay && overlay.w) ctx.drawImage(overlay, view.x, view.y, view.dw, view.dh);
    var post = postOf(state.gaze);
    var feet = view.feet;
    var size = birdSize();
    if (view.key === 'landscape') {
      drawAnchored(ctx, img.stone, 256.5, 118, feet.x, feet.y + 8, Math.max(168, size * 0.95));
    } else if (post === 'shade') {
      drawAnchored(ctx, img.stone, 256.91, 398, feet.x, feet.y + 4, 78);
    }
    if (state.phase === 0 && view.key === 'portrait') {
      drawAnchored(ctx, img.prints, 254.4, 260.73, feet.x - 16, feet.y + 18, 168);
    }
    var pose = currentPose();
    var lureLeft = state.phase === 2;
    var lureX = feet.x + size * (lureLeft ? -0.42 : 0.34);
    var lureY = feet.y + (lureLeft ? -size * 0.16 : 4);
    if (state.lureDown) {
      drawAnchored(ctx, img.lure, 244.92, 394, lureX, lureY, 96);
    }
    if (pose) {
      var spec = BIRD[pose];
      var birdImg = img[pose];
      if (birdImg) {
        var s = size / 512;
        var drop = view.key === 'landscape' ? size * 0.06 : 0;
        ctx.save();
        if (view.key === 'shade') {
          ctx.beginPath();
          ctx.rect(view.trunk, -200, sw + 400, sh + 400);
          ctx.clip();
        }
        ctx.drawImage(birdImg, feet.x - spec.ax * s, feet.y + drop - spec.ay * s, size, size);
        ctx.restore();
      }
    }
    if (state.phase === 0 || state.phase === 2) {
      var bob = Math.sin(performance.now() / 280) * 12;
      var ix = state.lureDown ? lureX : feet.x - 28;
      var iy = (state.lureDown ? feet.y - 36 : feet.y - 48) + bob;
      drawAnchored(ctx, img.insects, 252.38, 249.95, ix, iy, 200);
    }
    if (state.fx && img[state.fx.kind]) {
      var frames = img[state.fx.kind];
      var f = Math.min(7, Math.floor(state.fx.t / 55));
      if (frames[f]) drawAnchored(ctx, frames[f], 256, 256, state.fx.x, state.fx.y, state.fx.size);
    }
    return view;
  }

  function spawnFx(kind, x, y, size) {
    state.fx = { kind: kind, t: 0, x: x, y: y, size: size };
  }

  function capture(view) {
    try {
      var dpr = world.width / Math.max(1, world.clientWidth);
      var vf = layout.vf;
      var c = document.createElement('canvas');
      c.width = 168;
      c.height = 216;
      var g = c.getContext('2d');
      g.drawImage(world, vf.x * dpr, vf.y * dpr, vf.w * dpr, vf.h * dpr, 0, 0, 168, 216);
      return c.toDataURL('image/jpeg', 0.72);
    } catch (err) {
      return '';
    }
  }

  function shoot() {
    gesture();
    if (performance.now() < state.shotLock) return;
    state.shotLock = performance.now() + 260;
    var view = worldView();
    var center = view ? view.feet : { x: layout.vf.x + layout.vf.w / 2, y: layout.vf.y + layout.vf.h / 2 };
    spawnFx('flash', layout.vf.x + layout.vf.w / 2, layout.vf.y + layout.vf.h / 2, layout.vf.w * 0.72);
    if (AUDIO) AUDIO.sting('shot');
    if (state.film <= 0) {
      say('胶片用完了。回营地补充后再拍。');
      return;
    }
    state.film -= 1;
    var pose = currentPose();
    var frame = framingOf(pose);
    var slot = cycleSlot();
    var reason = null;
    if (state.absent || state.fright > 0 || pose === 'startle' || !pose) reason = 'away';
    else if (state.focus !== 2) reason = 'focus';
    else if (frame === 'blocked') reason = 'blocked';
    else if (frame === 'tail') reason = 'tail';
    else if (frame !== 'in') reason = 'out';
    else if (pose === 'preen' || (pose === 'idle' && slot === 'pre')) reason = 'pre';
    else if (pose !== 'drink' && pose !== 'display' && pose !== 'feed') reason = 'idle';
    if (reason) {
      say(REASON[reason]);
      save();
      return;
    }
    var already = !!state.found[pose];
    state.found[pose] = true;
    var heldFx = state.fx;
    state.fx = null;
    var painted = drawWorld(resizeCanvas(world));
    var shot = capture(painted || view);
    state.fx = heldFx;
    if (shot) state.photos[pose] = shot;
    spawnFx('ok', center.x, center.y - birdSize() * 0.35, birdSize() * 1.05);
    if (AUDIO) AUDIO.sting('ok');
    say(already ? '这一页已经收过了。' : (GOAL_NAME[pose] + '收进图鉴了。'));
    save();
    if (!already && allFound() && !state.celebrated) {
      state.celebrated = true;
      save();
      panelDone.hidden = false;
    }
  }

  function skipTime() {
    gesture();
    state.phase = (state.phase + 1) % 3;
    state.clock = PRE - 650;
    say(PHASE_NAME[state.phase] + '到了。');
    save();
  }

  function placeLure() {
    gesture();
    if (!state.lureReady || state.lureDown) {
      say('叶杯这一轮已经放过了。');
      return;
    }
    if (postOf(state.gaze) === 'close' || state.absent) {
      say('先退回观察位，再放下叶杯。');
      return;
    }
    state.lureDown = true;
    state.lureReady = false;
    if (state.phase === 2) state.clock = PRE - 650;
    say('叶杯放下了。暮色里它会过来啄食。');
    save();
  }

  function refill() {
    state.film = 3;
    state.lureReady = true;
    state.lureDown = false;
    save();
    panelCamp.hidden = true;
    say('胶片补上了。可以再拍。');
  }

  function renderGuide() {
    guideList.innerHTML = '';
    GOAL.forEach(function (key) {
      var row = document.createElement('div');
      row.className = 'guide-row';
      var thumb = document.createElement('img');
      thumb.alt = '';
      if (state.photos[key]) thumb.src = state.photos[key];
      else thumb.style.background = '#2F5A38';
      var copy = document.createElement('div');
      var title = document.createElement('b');
      title.textContent = GOAL_NAME[key];
      var note = document.createElement('div');
      note.textContent = state.found[key] ? GUIDE_NOTE[key] : '还没拍到。';
      copy.appendChild(title);
      copy.appendChild(note);
      row.appendChild(thumb);
      row.appendChild(copy);
      guideList.appendChild(row);
    });
  }

  function autoHint() {
    if (panelOpen()) return;
    var hint = computeHint();
    var held = lastHint === '' && banner.textContent && banner.textContent !== hint && performance.now() - saidAt < 1600;
    if (held) return;
    banner.textContent = hint;
    lastHint = hint;
  }

  function update(dt) {
    var heldPose = currentPose();
    var holdPose = state.focus === 2 && (heldPose === 'drink' || heldPose === 'display' || heldPose === 'feed');
    if (!panelOpen() && !holdPose) state.clock += dt;
    if (state.fright > 0) {
      state.fright -= dt;
      if (state.fright <= 0) {
        state.fright = 0;
        if (postOf(state.gaze) === 'close') state.absent = true;
      }
    }
    if (state.fx) {
      state.fx.t += dt;
      if (state.fx.t >= 8 * 55) state.fx = null;
    }
    if (ptr && !ptr.drag && performance.now() - ptr.t > 150 && state.focus !== 2) {
      if (state.focus !== 1) {
        state.focus = 1;
        state.focusT = 0;
      }
    }
    if (state.focus === 1) {
      state.focusT += dt;
      if (state.focusT >= FOCUS_NEED) {
        state.focus = 2;
        state.focusT = FOCUS_NEED;
        state.focusGaze = state.gaze;
        state.lockLeft = 5600;
        say('对焦锁上了，可以按快门。');
      }
    } else if (state.focus === 2) {
      state.lockLeft -= dt;
      if (state.lockLeft <= 0) state.focus = 0;
    }
    autoHint();
  }

  function tick(now) {
    if (!playing) return;
    var dt = lastTick ? Math.min(48, now - lastTick) : 16;
    lastTick = now;
    update(dt);
    var g = resizeCanvas(world);
    var view = drawWorld(g);
    paintChrome();
    placeOmen(view);
    requestAnimationFrame(tick);
  }

  function resizeCanvas(canvas) {
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var w = canvas.clientWidth;
    var h = canvas.clientHeight;
    var bw = Math.max(1, Math.round(w * dpr));
    var bh = Math.max(1, Math.round(h * dpr));
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw;
      canvas.height = bh;
    }
    var g = canvas.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    return g;
  }

  function loadOne(src, done) {
    var image = new Image();
    image.onload = function () {
      image.w = image.naturalWidth;
      image.h = image.naturalHeight;
      done(image);
    };
    image.onerror = function () { done(null); };
    image.src = src;
  }

  function ensureClip(name) {
    if (sheets[name] || stills[name]) return;
    loadOne(CLIPS[name].src, function (image) {
      if (image) sheets[name] = image;
      else loadOne(CLIPS[name].still, function (still) { stills[name] = still; });
    });
  }

  function drawCover() {
    var w = coverActor.clientWidth;
    var h = coverActor.clientHeight;
    if (!w || !h) return;
    var g = resizeCanvas(coverActor);
    g.clearRect(0, 0, w, h);
    var clipName = coverClip;
    var image = REDUCE ? stills[clipName] : (sheets[clipName] || stills[clipName]);
    if (!image) {
      clipName = 'fan';
      image = REDUCE ? (stills.fan || sheets.fan) : (sheets.fan || stills.fan);
    }
    if (!image) return;
    var clip = CLIPS[clipName];
    var land = w > h;
    var scale = (land ? h * 0.62 : h * 0.44) / clip.fh;
    var dw = clip.fw * scale;
    var dh = clip.fh * scale;
    var px = w * (land ? 0.24 : 0.34);
    var py = h * (land ? 0.68 : 0.76);
    var dx = px - clip.ax * scale;
    var dy = py - clip.ay * scale;
    if (REDUCE || image === stills[clipName]) {
      g.drawImage(image, dx, dy, dw, dh);
      return;
    }
    var frame = Math.floor(performance.now() / (1000 / clip.fps)) % clip.n;
    var col = frame % clip.cols;
    var row = Math.floor(frame / clip.cols);
    g.drawImage(image, col * clip.fw, row * clip.fh, clip.fw, clip.fh, dx, dy, dw, dh);
  }

  function coverLoop() {
    if (cover.hidden) return;
    if (!entering && hopUntil && performance.now() > hopUntil && coverClip === 'hop') coverClip = 'fan';
    drawCover();
    coverTimer = requestAnimationFrame(coverLoop);
  }

  function punchRim(image) {
    var c = document.createElement('canvas');
    c.width = image.w;
    c.height = image.h;
    var g = c.getContext('2d');
    g.drawImage(image, 0, 0);
    var data = g.getImageData(0, 0, c.width, c.height);
    var px = data.data;
    for (var i = 0; i < px.length; i += 4) {
      if (px[i + 2] > 160 && px[i] > 200 && px[i + 1] > 180) px[i + 3] = 0;
    }
    g.putImageData(data, 0, 0);
    return c.toDataURL('image/png');
  }

  function ensurePlayAssets(done) {
    if (playAssetsReady) { done(); return; }
    var files = {
      portrait: 'assets/scene/b26-scene-portrait.webp',
      shade: 'assets/scene/b26-scene-shade.webp',
      landscape: 'assets/scene/b26-scene-landscape.webp',
      hazeP: 'assets/overlays/b26-overlay-haze-portrait.png',
      hazeL: 'assets/overlays/b26-overlay-haze-landscape.png',
      duskP: 'assets/overlays/b26-overlay-dusk-portrait.png',
      duskL: 'assets/overlays/b26-overlay-dusk-landscape.png',
      ringSafe: 'assets/overlays/b26-ring-safe.png',
      ringClose: 'assets/overlays/b26-ring-close.png',
      stone: 'assets/props/b26-mark-stone.png',
      prints: 'assets/props/b26-clue-footprints.png',
      insects: 'assets/props/b26-clue-insects.png',
      lure: 'assets/props/b26-lure-leaf.png',
      idle: BIRD.idle.src,
      drink: BIRD.drink.src,
      display: BIRD.display.src,
      feed: BIRD.feed.src,
      preen: BIRD.preen.src,
      startle: BIRD.startle.src,
      slotEmpty: 'assets/ui/b26-ui-photo-slot-empty.png',
      slotFilled: 'assets/ui/b26-ui-photo-slot-filled.png'
    };
    var keys = Object.keys(files);
    var left = keys.length + 24;
    function mark() { if (--left === 0) finish(); }
    keys.forEach(function (key) {
      loadOne(files[key], function (image) { img[key] = image; mark(); });
    });
    ['flash', 'ok', 'startlefx'].forEach(function (kind) {
      var folder = kind === 'startlefx' ? 'startle' : kind;
      img[kind === 'startlefx' ? 'startlefx' : kind] = [];
      for (var i = 0; i < 8; i++) {
        (function (index) {
          var name = index < 10 ? '0' + index : String(index);
          loadOne('assets/fx/b26-fx-' + folder + '-' + name + '.png', function (image) {
            img[kind][index] = image;
            mark();
          });
        })(i);
      }
    });
    function finish() {
      if (img.slotEmpty) rims.empty = punchRim(img.slotEmpty);
      if (img.slotFilled) rims.filled = punchRim(img.slotFilled);
      playAssetsReady = true;
      done();
    }
  }

  function showPlay() {
    bootUi();
    cover.hidden = true;
    play.hidden = false;
    playing = true;
    layoutNow();
    if (!state.tutor && !QA) panelTutor.hidden = false;
    else say(computeHint());
    save();
    lastTick = 0;
    requestAnimationFrame(tick);
  }

  function enterGame(mode) {
    gesture();
    if (mode === 'continue') {
      fresh();
      load();
    } else if (mode === 'reset') {
      try { localStorage.removeItem(SAVE_KEY); } catch (err) {}
      fresh();
    } else {
      fresh();
    }
    if (AUDIO) AUDIO.setWanted(state.music);
    syncMusic();
    entering = true;
    coverClip = 'hop';
    hopUntil = 0;
    ensureClip('hop');
    enterLine.hidden = false;
    var began = performance.now();
    ensurePlayAssets(function () {
      var wait = REDUCE ? 0 : Math.max(0, 900 - (performance.now() - began));
      setTimeout(function () {
        entering = false;
        enterLine.hidden = true;
        showPlay();
      }, wait);
    });
  }

  function refreshCoverButtons() {
    var saved = hasSave();
    btnStart.hidden = saved;
    btnContinue.hidden = !saved;
    btnReset.hidden = !saved;
  }

  function bootUi() {
    $('film-track').src = 'assets/ui/b26-film-track.png';
    $('film-frame').src = 'assets/ui/b26-film-frame.png';
    filmFill.src = 'assets/ui/b26-film-fill-full.png';
    filmFill.setAttribute('data-k', 'full');
    $('icon-drink').src = 'assets/ui/b26-ui-icon-drink.png';
    $('icon-display').src = 'assets/ui/b26-ui-icon-display.png';
    $('icon-feed').src = 'assets/ui/b26-ui-icon-feed.png';
    $('icon-lure').src = 'assets/props/b26-lure-leaf.png';
    $('icon-skip').src = 'assets/ui/b26-ui-icon-skiptime.png';
    $('icon-guide').src = 'assets/ui/b26-ui-icon-guide.png';
    $('icon-camp').src = 'assets/overlays/b26-ring-safe.png';
    shutterImg.src = 'assets/ui/b26-ui-shutter-idle.png';
    focusFrame.src = 'assets/ui/b26-ui-focus-soft.png';
    distRing.src = 'assets/overlays/b26-ring-safe.png';
  }

  function bind() {
    document.addEventListener('pointerdown', function () { gesture(); });
    coverMusic.addEventListener('click', onMusic);
    playMusic.addEventListener('click', onMusic);
    btnStart.addEventListener('click', function () { enterGame('new'); });
    btnContinue.addEventListener('click', function () { enterGame('continue'); });
    btnReset.addEventListener('click', function () { enterGame('reset'); });
    $('btn-tutor').addEventListener('click', function () {
      state.tutor = true;
      panelTutor.hidden = true;
      say(computeHint());
      save();
    });
    $('btn-camp').addEventListener('click', function () { panelCamp.hidden = false; });
    $('btn-camp-close').addEventListener('click', function () { panelCamp.hidden = true; });
    $('btn-refill').addEventListener('click', refill);
    $('btn-guide').addEventListener('click', function () { renderGuide(); panelGuide.hidden = false; });
    $('btn-guide-close').addEventListener('click', function () { panelGuide.hidden = true; });
    $('btn-done-guide').addEventListener('click', function () {
      panelDone.hidden = true;
      renderGuide();
      panelGuide.hidden = false;
    });
    $('btn-done-close').addEventListener('click', function () { panelDone.hidden = true; });
    $('btn-skip').addEventListener('click', skipTime);
    btnLure.addEventListener('click', placeLure);
    var shutterDown = false;
    shutterBtn.addEventListener('pointerdown', function (e) {
      e.stopPropagation();
      shutterDown = true;
      shutterImg.src = 'assets/ui/b26-ui-shutter-pressed.png';
    });
    shutterBtn.addEventListener('pointerup', function () {
      shutterImg.src = 'assets/ui/b26-ui-shutter-idle.png';
      if (!shutterDown) return;
      shutterDown = false;
      shoot();
    });
    shutterBtn.addEventListener('pointerleave', function () {
      shutterImg.src = 'assets/ui/b26-ui-shutter-idle.png';
    });
    shutterBtn.addEventListener('pointercancel', function () {
      shutterDown = false;
      shutterImg.src = 'assets/ui/b26-ui-shutter-idle.png';
    });
    look.addEventListener('pointerdown', function (e) {
      if (panelOpen()) return;
      if (e.cancelable) e.preventDefault();
      look.setPointerCapture(e.pointerId);
      ptr = { id: e.pointerId, x: e.clientX, y: e.clientY, last: e.clientX, drag: false, t: performance.now() };
      look.classList.add('dragging');
    });
    look.addEventListener('pointermove', function (e) {
      if (!ptr || ptr.id !== e.pointerId) return;
      var dx = e.clientX - ptr.x;
      if (!ptr.drag && Math.abs(dx) + Math.abs(e.clientY - ptr.y) > 12) {
        ptr.drag = true;
        state.focus = 0;
      }
      if (ptr.drag) {
        var sens = 1.9 / Math.max(320, stage.clientWidth);
        setGaze(state.gaze + (e.clientX - ptr.last) * sens);
        ptr.last = e.clientX;
      }
    });
    function endPtr(e) {
      if (!ptr || (e && ptr.id !== e.pointerId)) return;
      if (ptr.drag) setGaze(snapGaze(state.gaze));
      else if (state.focus === 1) state.focus = 0;
      ptr = null;
      look.classList.remove('dragging');
    }
    look.addEventListener('pointerup', endPtr);
    look.addEventListener('pointercancel', endPtr);
    coverActor.addEventListener('pointerenter', function () {
      if (entering || coverClip === 'hop') return;
      coverClip = 'look';
      ensureClip('look');
    });
    coverActor.addEventListener('pointerleave', function () {
      if (entering || coverClip === 'hop') return;
      coverClip = 'fan';
    });
    coverActor.addEventListener('pointerdown', function () {
      if (entering) return;
      coverClip = 'hop';
      hopUntil = performance.now() + 2000;
      ensureClip('hop');
    });
    window.addEventListener('resize', function () {
      if (!cover.hidden) {
        var land = innerWidth > innerHeight;
        coverBg.src = land ? 'assets/cover/b26-cover-16x9-bg.webp' : 'assets/cover/b26-cover-3x4-bg.webp';
      }
      if (playing) layoutNow();
    });
    document.addEventListener('visibilitychange', function () {
      if (AUDIO) AUDIO.visibility(document.hidden);
    });
    coverBg.addEventListener('error', function () {
      if (coverBg.getAttribute('data-fell')) return;
      coverBg.setAttribute('data-fell', '1');
      coverBg.src = innerWidth > innerHeight ? 'assets/cover/b26-cover-16x9.webp' : 'assets/cover/b26-cover-3x4.webp';
      coverActor.hidden = true;
    });
  }

  function onMusic(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!AUDIO) return;
    state.music = AUDIO.toggle();
    syncMusic();
    if (playing) save();
  }

  fresh();
  bind();
  refreshCoverButtons();
  ensureClip('fan');
  if (REDUCE) {
    ['fan', 'look', 'hop'].forEach(function (name) {
      loadOne(CLIPS[name].still, function (image) { stills[name] = image; });
    });
  }
  if (AUDIO) AUDIO.setWanted(true);
  syncMusic();
  coverLoop();

  if (QA) {
    window.WILDLIGHT = {
      setGaze: setGaze,
      snap: function () { setGaze(snapGaze(state.gaze)); },
      lock: function () { state.focus = 2; state.focusGaze = state.gaze; state.lockLeft = 9000; },
      unlock: function () { state.focus = 0; },
      skip: skipTime,
      placeLure: placeLure,
      shoot: function () { state.shotLock = 0; shoot(); },
      refill: refill,
      setPhase: function (p) { state.phase = ((p % 3) + 3) % 3; state.clock = PRE - 650; },
      setClock: function (ms) { state.clock = ms; },
      setFilm: function (n) { state.film = n; },
      view: worldView,
      framing: framingOf,
      pose: currentPose,
      save: save,
      state: function () { return state; }
    };
  }
})();
