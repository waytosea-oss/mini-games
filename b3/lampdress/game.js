/* 灯影换装 B3-23 · lampdress · 20261127a
   局内 11 件仍共用现有 6 张材质／配件精灵表。LOOK 用裁切、染色和轮廓把它们分开。
   罗恩正式单件立绘的替换点：clothKey() 会优先用已加载的 sheets['item-'+id]，
   否则回退材质表 + LOOK。循环乐替换 art/music/bgm.ogg 与 bgm.mp3（约 80 秒，无缝）。
   封面循环接缝、衣架模特与折纸封面的统一，仍等正式美术，不阻塞这一版。 */
(function () {
  'use strict';
  var SAVE_KEY = 'lampdress_save_v1';
  var SAVE_OLD = 'lampdress_waytosea_save_v1';
  var ART_DIR = 'art';
  var ART_VER = '20261127a';
  var TRI_SH = 0.82, TRI_WA = 0.55;
  var DEF = { v: 2, sound: true, seenHelp: false, unlocked: 1, lastLv: 1, stars: {}, best: {}, seenCoach: {}, album: [], freeOn: false, daily: null };
  function loadSave() {
    var cur = null, old = null;
    try { cur = localStorage.getItem(SAVE_KEY); } catch (e) {}
    try { old = localStorage.getItem(SAVE_OLD); } catch (e) {}
    var data;
    if (cur) data = PK.load(SAVE_KEY, DEF);
    else if (old) data = PK.load(SAVE_OLD, DEF);
    else data = PK.load(SAVE_KEY, DEF);
    if (!data.stars) data.stars = {};
    if (!data.best) data.best = {};
    if (!data.seenCoach) data.seenCoach = {};
    if (!data.album) data.album = [];
    if (Array.isArray(data.unlocked)) {
      var arr = data.unlocked, n = 1;
      if (arr[1]) n = Math.max(n, 7);
      if (arr[2]) n = Math.max(n, 13);
      if (arr[3]) data.freeOn = true;
      data.unlocked = n;
    }
    if (data.unlocked == null) data.unlocked = 1;
    if ((data.v || 1) < 2) {
      if (data.lastLv === 2) data.lastLv = 7;
      if (data.lastLv === 3) data.lastLv = 13;
      if (data.lastLv === 4) { data.freeOn = true; data.lastLv = 13; }
      data.v = 2;
    }
    return data;
  }
  var S = loadSave();
  function save() { return persistSave(false); }
  function persistSave(keepAlbum) {
    var album = (S.album || []).slice();
    var tries = keepAlbum ? [album.length] : [20, 16, 12, 8, 6, 4, 3, 2, 1];
    var i, n, ok;
    for (i = 0; i < tries.length; i++) {
      n = Math.max(0, Math.min(album.length, tries[i]));
      S.album = album.slice(-n);
      try { ok = PK.save(SAVE_KEY, S); } catch (e) { ok = false; }
      if (ok) return true;
    }
    S.album = album.slice(-8).map(function (e) {
      return { t: e.t, level: e.level, tint: e.tint };
    });
    try { ok = PK.save(SAVE_KEY, S); } catch (e) { ok = false; }
    if (ok) return true;
    if (album.length) {
      var last = album[album.length - 1];
      S.album = [{ t: last.t, level: last.level, tint: last.tint }];
    } else S.album = [];
    try { return !!PK.save(SAVE_KEY, S); } catch (e) { return false; }
  }
  save();

  var GARMENTS = [
    { id: 'innerSheer', name: '透光内衬', layer: 'inner', mat: 'sheer', shoulder: 0.36, waist: 0.58, kSide: 0.20, kLow: 0.05, kHigh: -0.02, kCenter: 0.05, wSide: 0.04, wLow: -0.04, wHigh: 0.02, wCenter: 0, color: '#f2c8d8' },
    { id: 'innerSolid', name: '实色底衫', layer: 'inner', mat: 'solid', shoulder: 0.40, waist: 0.52, kSide: 0.12, kLow: 0.02, kHigh: 0.02, kCenter: 0.04, wSide: 0.06, wLow: 0.02, wHigh: 0.03, wCenter: -0.02, color: '#c07098' },
    { id: 'midCut', name: '镂空肩片', layer: 'mid', mat: 'cutout', shoulder: 0.62, waist: 0.47, kSide: 1.55, kLow: 0.35, kHigh: 0.20, kCenter: 0.24, wSide: 0.10, wLow: -0.28, wHigh: -0.08, wCenter: -0.02, color: '#e8a0c0' },
    { id: 'midSolid', name: '实色马甲', layer: 'mid', mat: 'solid', shoulder: 0.56, waist: 0.62, kSide: 0.35, kLow: 0.05, kHigh: 0.10, kCenter: 0.06, wSide: 0.45, wLow: 0.05, wHigh: -0.05, wCenter: 0.02, color: '#a05080' },
    { id: 'outerWide', name: '宽肩外套', layer: 'outer', mat: 'solid', shoulder: 0.70, waist: 0.78, kSide: 1.20, kLow: 0.10, kHigh: 0.05, kCenter: 0.08, wSide: 0.55, wLow: 0.08, wHigh: 0.05, wCenter: 0.02, color: '#703058' },
    { id: 'outerSheer', name: '薄纱外罩', layer: 'outer', mat: 'sheer', shoulder: 0.55, waist: 0.60, kSide: 0.55, kLow: 0.70, kHigh: -0.05, kCenter: 0.08, wSide: 0.12, wLow: -0.45, wHigh: 0.10, wCenter: 0, color: '#f0d0e0' },
    { id: 'outerCut', name: '几何斗篷', layer: 'outer', mat: 'cutout', shoulder: 0.58, waist: 0.50, kSide: 1.70, kLow: 0.28, kHigh: 0.50, kCenter: 0.28, wSide: 0.10, wLow: -0.10, wHigh: -0.32, wCenter: -0.03, color: '#904878' },
    { id: 'accShoulder', name: '肩饰', layer: 'acc', mat: 'solid', slot: 'shoulder', shoulder: 0.045, waist: 0, kSide: 0.16, kLow: 0.02, kHigh: 0.03, kCenter: 0.02, wSide: 0.01, wLow: 0, wHigh: 0, wCenter: 0, color: '#d090b0' },
    { id: 'accBelt', name: '收腰带', layer: 'acc', mat: 'solid', slot: 'belt', shoulder: 0, waist: -0.13, kSide: 0, kLow: 0, kHigh: 0, kCenter: 0, wSide: 0.03, wLow: -0.06, wHigh: -0.04, wCenter: -0.01, color: '#603040' },
    { id: 'accCapeL', name: '左披肩', layer: 'acc', mat: 'sheer', slot: 'capeL', shoulder: 0.018, waist: 0.003, kSide: 0.05, kLow: 0.01, kHigh: 0.01, kCenter: 0.01, wSide: 0.012, wLow: 0, wHigh: 0, wCenter: 0, color: '#e8b8d0' },
    { id: 'accCapeR', name: '右披肩', layer: 'acc', mat: 'sheer', slot: 'capeR', shoulder: 0.018, waist: 0.003, kSide: 0.05, kLow: 0.01, kHigh: 0.01, kCenter: 0.01, wSide: 0.012, wLow: 0, wHigh: 0, wCenter: 0, color: '#e7c98a' }
  ];
  var GBY = {};
  GARMENTS.forEach(function (g) { GBY[g.id] = g; });
  var COLORS = ['#f2c8d8', '#e8a0c0', '#c07098', '#904878', '#f0d0e0', '#d4a0c0', '#b080a0', '#ffe8f0'];
  var SITES = [
    { id: 'tri', name: '剪影工坊', tag: '入门' },
    { id: 'sym', name: '对称工坊', tag: '进阶' },
    { id: 'stack', name: '层叠工坊', tag: '挑战' }
  ];
  function mk(id, site, name, need, goal, extra) {
    extra = extra || {};
    return { id: id, site: site, name: name, free: !!extra.free, need: need, goal: goal, coach: extra.coach || [], coachT: extra.coachT || '', lampOff: !!extra.lampOff, lamp: extra.lamp || '' };
  }
  var LEVELS = [
    mk(1, 0, '三角剪影', { triangle: true, sheer: 1 }, '宽肩收腰，保留1层透光（灯要离开起点）', { lamp: 'teach', coachT: '先开分层', coach: ['打开分层，内层放透光内衬', '中层放镂空肩片，也可以拖到别的层', '把灯拖离起点，肩影变宽后再拍照'] }),
    mk(2, 0, '肩线练习', { triangle: true }, '侧光下做出宽肩收腰', { lamp: 'wide' }),
    mk(3, 0, '一层透光', { sheer: 1, layers: 2 }, '低灯下至少两层，并露出一层透光', { lamp: 'low' }),
    mk(4, 0, '收腰加点', { triangle: true, sheer: 1, belt: true }, '侧光三角，再系上收腰带', { lamp: 'wide', coachT: '腰带', coach: ['侧光下镂空肩片可做三角剪影', '再在配件里系上收腰带'] }),
    mk(5, 0, '宽肩加饰', { triangle: true, accMin: 1 }, '侧光三角，并至少一件配件', { lamp: 'wide' }),
    mk(6, 0, '剪影考核', { triangle: true, sheer: 1, layers: 3 }, '三层齐备、侧光三角、保留透光', { lamp: 'wide', coachT: '考核', coach: ['内中外都要穿上', '用镂空或薄纱留出至少一层透光', '灯要拖到侧面，起点灯位过不了'] }),
    mk(7, 1, '对称斗篷', { symmetric: true, cape: true }, '左右披肩对称，灯回正中', { lamp: 'center', lampOff: true, coachT: '对称', coach: ['左右披肩都要装上', '把灯拖回舞台正中', '外层实色会挡住披肩的透光'] }),
    mk(8, 1, '灯位回正', { cape: true, symmetric: true }, '双披肩，灯拖回中央', { lamp: 'center', lampOff: true }),
    mk(9, 1, '对称透光', { symmetric: true, cape: true, sheer: 1 }, '灯在正中的对称斗篷，并露出透光', { lamp: 'center', lampOff: true }),
    mk(10, 1, '对称三角', { symmetric: true, cape: true, triangle: true }, '灯在正中，同时做出三角轮廓', { lamp: 'center', lampOff: true }),
    mk(11, 1, '披肩三层', { cape: true, layers: 3 }, '三层齐备，侧光下左右披肩都在', { lamp: 'wide' }),
    mk(12, 1, '对称考核', { symmetric: true, cape: true, sheer: 1, layers: 2 }, '灯回正中，双披肩，并保留透光', { lamp: 'center', lampOff: true, coachT: '考核', coach: ['左右披肩，灯位回到正中', '再留一层透光或镂空'] }),
    mk(13, 2, '层叠透光', { sheer: 2, layers: 3 }, '低灯下三层齐备，且可见两层透光', { lamp: 'low', coachT: '层叠', coach: ['内中外都穿上', '至少两层用透光或镂空', '把灯放低，透光才会被读出'] }),
    mk(14, 2, '透光三角', { sheer: 2, layers: 3, triangle: true }, '低灯下两层透光，再收出三角', { lamp: 'low' }),
    mk(15, 2, '透光披肩', { sheer: 2, layers: 3, cape: true }, '低灯下两层透光，再戴上左右披肩', { lamp: 'low' }),
    mk(16, 2, '三条件', { layers: 3, triangle: true, sheer: 1, belt: true }, '高灯侧光：三层、三角、透光，再系腰带', { lamp: 'high' }),
    mk(17, 2, '全场对称', { sheer: 2, layers: 3, symmetric: true, cape: true }, '灯回正中：层叠透光加上对称斗篷', { lamp: 'center', lampOff: true }),
    mk(18, 2, '灯影终考', { sheer: 2, layers: 3, triangle: true, cape: true }, '高灯侧光：三层、两层透光、三角与双披肩', { lamp: 'high', coachT: '终考', coach: ['内中外用透光或镂空组合', '戴上左右披肩', '把灯抬高并稍偏，结构全绿再拍照'] })
  ];
  var FREE = mk(0, 3, '自由造型', {}, '自由创作，拍照即可收藏', { free: true, coach: ['无结构失败', '随意搭配后拍照收藏'] });

  var state = 'menu', lvPick = 1, paused = false, won = false, dailyMode = false, freeMode = false;
  var level = null, outfit = { inner: null, mid: null, outer: null, acc: [] }, editLayer = 'inner';
  var lampX = 0.55, lampY = 0.28, dragLamp = false, tint = COLORS[0], photoFails = 0, edgeAssist = false, heard = false;
  var pose = 'idle', poseT = 0, winHold = 0, fxList = [];
  var cv, ctx, W = 390, H = 844, DPR = 1, raf = 0, lastTs = 0, animT = 0, msgT = 0;
  var imgs = {}, sheets = {}, meta = {};
  var artReadyFlag = false;
  var audio = null;
  var bgmBuffer = null, bgmSrc = null, bgmOffset = 0, bgmStartedAt = 0, bgmPlaying = false, bgmPromise = null, bgmUseMp3 = false;
  var reduceMotion = false;
  try {
    var motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    reduceMotion = !!(motionQuery && motionQuery.matches);
    if (motionQuery && motionQuery.addEventListener) {
      motionQuery.addEventListener('change', function () {
        reduceMotion = !!(motionQuery && motionQuery.matches);
        if (reduceMotion) pauseCover();
      });
    }
  } catch (e) {}

  function withVer(src) {
    if (!src || src.indexOf('v=') >= 0) return src;
    return src + (src.indexOf('?') >= 0 ? '&' : '?') + 'v=' + ART_VER;
  }
  function shanghaiDate() {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  }
  function levelById(id) {
    if (id === 0) return FREE;
    for (var i = 0; i < LEVELS.length; i++) if (LEVELS[i].id === id) return LEVELS[i];
    return LEVELS[0];
  }
  function siteUnlocked(s) {
    if (s <= 0) return true;
    if (s === 1) return (S.unlocked || 1) >= 7 || !!(S.stars && S.stars[1]);
    if (s === 2) return (S.unlocked || 1) >= 13 || !!(S.stars && S.stars[7]) || !!S.freeOn;
    return !!S.freeOn || (S.unlocked || 1) >= 14 || !!(S.stars && S.stars[13]);
  }
  function levelUnlocked(id) {
    if (id === 0) return !!S.freeOn || (S.unlocked || 1) >= 14 || !!(S.stars && S.stars[13]);
    var L = levelById(id);
    if (!siteUnlocked(L.site)) return false;
    if (id === 1 || (S.unlocked || 1) >= id) return true;
    var first = LEVELS.find(function (x) { return x.site === L.site; });
    if (first && first.id === id) return true;
    return !!(S.stars && S.stars[id]);
  }
  function starCount(ok, fails) {
    if (!ok) return 0;
    if (fails <= 0) return 3;
    if (fails <= 2) return 2;
    return 1;
  }
  function totalStars() {
    var n = 0;
    LEVELS.forEach(function (L) { n += (S.stars && S.stars[L.id]) || 0; });
    return { n: n, max: LEVELS.length * 3 };
  }
  function dailyPick() {
    var d = shanghaiDate(), h = 0, i;
    for (i = 0; i < d.length; i++) h = (h * 33 + d.charCodeAt(i)) >>> 0;
    var pool = LEVELS.filter(function (L) { return levelUnlocked(L.id); });
    if (!pool.length) pool = [LEVELS[0]];
    return pool[h % pool.length];
  }

  function ensureAudio() { if (audio) return audio; audio = PK.audio({ vol: 0.85, music: 0.2 }); audio.init(); return audio; }
  function unlockAudio() { var A = ensureAudio(); if (A) A.unlock(); }
  function setSoundUI() {
    ['mSnd', 'pSnd'].forEach(function (id) { var b = PK.$(id); if (b) b.textContent = S.sound ? '声' : '静'; });
    if (audio) audio.set(!!S.sound);
  }
  function toggleSound() { S.sound = !S.sound; save(); heard = true; unlockAudio(); setSoundUI(); if (S.sound) startBgm(); else pauseBgm(); }
  function sfx(k) {
    if (!S.sound) return; var A = ensureAudio(); if (!A) return; A.unlock(); var t = A.t();
    if (k === 'click') A.tone(700, t, 0.04, 0.04, 'sine');
    else if (k === 'wear') A.tone(420, t, 0.1, 0.05, 'triangle');
    else if (k === 'photo') { A.noise(t, 0.08, 0.08, 3000, 0.3, 'highpass'); A.tone(880, t, 0.12, 0.05, 'sine'); }
    else if (k === 'ok') { A.tone(523, t, 0.1, 0.05, 'sine'); A.tone(784, t + 0.1, 0.16, 0.06, 'sine', { verb: 1 }); }
    else if (k === 'win') { A.tone(440, t, 0.12, 0.06, 'sine', { verb: 1 }); A.tone(659, t + 0.12, 0.22, 0.07, 'sine', { verb: 1 }); }
    else if (k === 'bad') A.tone(180, t, 0.2, 0.05, 'sawtooth', { to: 90 });
  }
  function bgmUrl() {
    if (bgmUseMp3) return ART_DIR + '/music/bgm.mp3';
    var probe = document.createElement('audio');
    var ogg = probe.canPlayType ? probe.canPlayType('audio/ogg; codecs="vorbis"') : '';
    if (ogg === 'probably' || ogg === 'maybe') return ART_DIR + '/music/bgm.ogg';
    bgmUseMp3 = true;
    return ART_DIR + '/music/bgm.mp3';
  }
  function startBgm() {
    if (!S.sound || !heard || bgmPlaying) return;
    var A = ensureAudio(); if (!A) return;
    A.unlock();
    var ac = A.init(); if (!ac) return;
    var arm = function () {
      if (!S.sound || !heard || bgmPlaying || !bgmBuffer) return;
      if (ac.state === 'suspended') { try { ac.resume(); } catch (e) {} }
      var src = ac.createBufferSource();
      src.buffer = bgmBuffer;
      src.loop = true;
      src.connect(A.music || A.out);
      var off = bgmBuffer.duration ? (bgmOffset % bgmBuffer.duration) : 0;
      try { src.start(0, off); } catch (e) { return; }
      bgmSrc = src;
      bgmStartedAt = ac.currentTime;
      bgmPlaying = true;
    };
    if (bgmBuffer) { arm(); return; }
    if (bgmPromise) return;
    bgmPromise = fetch(withVer(bgmUrl())).then(function (r) {
      if (!r.ok) throw new Error('bgm');
      return r.arrayBuffer();
    }).then(function (ab) {
      return ac.decodeAudioData(ab);
    }).then(function (buf) {
      bgmBuffer = buf;
      arm();
    }).catch(function () {
      bgmPromise = null;
      if (!bgmUseMp3) { bgmUseMp3 = true; startBgm(); }
    });
  }
  function pauseBgm() {
    if (!bgmPlaying || !bgmSrc) { bgmPlaying = false; return; }
    var ac = audio && audio.init ? audio.init() : null;
    if (ac) bgmOffset += Math.max(0, ac.currentTime - bgmStartedAt);
    try { bgmSrc.stop(); } catch (e) {}
    try { bgmSrc.disconnect(); } catch (e2) {}
    bgmSrc = null;
    bgmPlaying = false;
  }
  function firstHear() {
    if (heard) return;
    heard = true;
    unlockAudio();
    if (S.sound) startBgm();
  }
  var coverWasPlaying = false;
  function pauseCover() {
    var v = PK.$('coverVid');
    if (!v) return;
    coverWasPlaying = !v.paused && !v.ended;
    try { v.pause(); } catch (e) {}
  }
  function resumeCover() {
    if (reduceMotion) return;
    var v = PK.$('coverVid');
    var menu = PK.$('menu');
    if (!v || !coverWasPlaying || !menu || !menu.classList.contains('on')) return;
    var p = v.play(); if (p && p.catch) p.catch(function () {});
  }
  function loadImg(src) {
    return new Promise(function (res) { var im = new Image(); im.onload = function () { res(im); }; im.onerror = function () { res(null); }; im.src = withVer(src); });
  }

  var playSet = [];
  var bgCache = { key: '', canvas: null, box: { x: 0, y: 0, w: 390, h: 844 } };
  function registerPlay(im) {
    if (!im) return;
    var w = im.naturalWidth || im.width, h = im.naturalHeight || im.height;
    if (!w || !h) return;
    playSet.push({ im: im, w: w, h: h, ar: w / h });
  }
  function pickPlayImg() {
    if (!playSet.length) return null;
    var target = W / H, best = null, bestScore = 1e9;
    for (var i = 0; i < playSet.length; i++) {
      var p = playSet[i];
      var score = Math.abs(p.ar - target);
      if (p.w + 8 >= W || p.h + 8 >= H) score -= 0.02;
      score -= Math.min(p.w, 2400) / 2e6;
      if (score < bestScore) { bestScore = score; best = p; }
    }
    return best;
  }
  var play2880Busy = false;
  function maybeLoadPlay2880() {
    if (imgs.play2880 || play2880Busy) return;
    var dpr = window.devicePixelRatio || 1;
    if (dpr < 2) return;
    if (Math.max(W, window.innerWidth || 0) < 1000) return;
    play2880Busy = true;
    loadImg(ART_DIR + '/bg/play-2880x1800.webp').then(function (im) {
      imgs.play2880 = im;
      if (im && (im.naturalWidth || im.width) >= 2000) {
        registerPlay(im);
        bgCache.key = '';
      }
    });
  }
  function stageBox() { return bgCache.box || { x: 0, y: 0, w: W, h: H }; }
  function ensureStageBg(fallback) {
    var pick = pickPlayImg();
    var img = pick && pick.im;
    var dpr = DPR || 1;
    var key = W + 'x' + H + '@' + dpr + ':' + (img && ((img.naturalWidth || img.width) + ':' + (img.src || '')));
    if (bgCache.key === key && bgCache.canvas) return bgCache;
    var c = document.createElement('canvas');
    c.width = Math.max(1, Math.floor(W * dpr));
    c.height = Math.max(1, Math.floor(H * dpr));
    var g = c.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    var box = { x: 0, y: 0, w: W, h: H };
    if (!img) {
      g.fillStyle = fallback;
      g.fillRect(0, 0, W, H);
    } else {
      var iw = pick.w, ih = pick.h;
      var same = Math.abs(iw / ih - W / H) < 0.012;
      if (same) {
        g.drawImage(img, 0, 0, W, H);
        box = { x: 0, y: 0, w: W, h: H };
      } else {
        var cover = Math.max(W / iw, H / ih);
        var cw = iw * cover, ch = ih * cover, cx = (W - cw) / 2, cy = (H - ch) / 2;
        g.save();
        g.filter = 'blur(28px)';
        g.drawImage(img, cx - 48, cy - 48, cw + 96, ch + 96);
        g.filter = 'none';
        g.fillStyle = 'rgba(8,4,10,0.46)';
        g.fillRect(0, 0, W, H);
        var vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.22, W / 2, H / 2, Math.hypot(W, H) * 0.56);
        vg.addColorStop(0, 'rgba(0,0,0,0)');
        vg.addColorStop(0.55, 'rgba(0,0,0,0.12)');
        vg.addColorStop(1, 'rgba(0,0,0,0.58)');
        g.fillStyle = vg;
        g.fillRect(0, 0, W, H);
        g.restore();
        var fit = Math.min(W / iw, H / ih);
        var dw = iw * fit, dh = ih * fit, dx = (W - dw) / 2, dy = (H - dh) / 2;
        g.drawImage(img, dx, dy, dw, dh);
        box = { x: dx, y: dy, w: dw, h: dh };
      }
    }
    bgCache = { key: key, canvas: c, box: box };
    return bgCache;
  }
  function drawStageBg(fallback) {
    var c = ensureStageBg(fallback);
    ctx.drawImage(c.canvas, 0, 0, W, H);
    return c.box;
  }
  function loadSheet(key, folder, file, fallback) {
    return Promise.all([
      loadImg(ART_DIR + '/' + folder + '/' + file + '.webp'),
      fetch(withVer(ART_DIR + '/' + folder + '/' + file + '.json')).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; })
    ]).then(function (pair) {
      sheets[key] = pair[0];
      meta[key] = pair[1] || fallback;
    });
  }
  function bootArt() {
    var list = [
      ['play', ART_DIR + '/bg/play-390x844.webp'],
      ['play2x', ART_DIR + '/bg/play-780x1688.webp'],
      ['play1440', ART_DIR + '/bg/play-1440x900.webp'],
      ['lamp', ART_DIR + '/props/lamp.webp'],
      ['silFrame', ART_DIR + '/props/silhouette-frame.webp']
    ];
    var charFb = { fw: 280, fh: 480, cols: 4, rows: 3, n: 12, fps: 10, loop: true, anchor: { x: 140, y: 450 } };
    var poseFb = { fw: 280, fh: 480, cols: 4, rows: 3, n: 12, fps: 12, loop: false, anchor: { x: 140, y: 450 } };
    var fxFb = { fw: 512, fh: 512, cols: 4, rows: 3, n: 12, fps: 16, loop: false, anchor: { x: 256, y: 256 } };
    var chars = ['mannequin', 'cloth-solid', 'cloth-sheer', 'cloth-cutout', 'acc-shoulder', 'acc-belt', 'acc-cape'];
    return Promise.all(list.map(function (p) { return loadImg(p[1]).then(function (im) { imgs[p[0]] = im; }); })).then(function () {
      playSet = [];
      registerPlay(imgs.play);
      registerPlay(imgs.play2x);
      if (imgs.play1440 && (imgs.play1440.naturalWidth || imgs.play1440.width) >= 1000) registerPlay(imgs.play1440);
      bgCache.key = '';
      return Promise.all(chars.map(function (name) { return loadSheet(name, 'char', name, charFb); }).concat([
        loadSheet('mannequin-win', 'char', 'mannequin-win', poseFb),
        loadSheet('mannequin-fail', 'char', 'mannequin-fail', poseFb),
        loadSheet('fxPhoto', 'fx', 'photo', fxFb),
        loadSheet('fxOk', 'fx', 'ok-struct', fxFb)
      ]));
    });
  }
  var artBooted = null;
  function ensureArt() {
    if (!artBooted) artBooted = bootArt().then(function () { artReadyFlag = true; armCover(); });
    return artBooted;
  }
  function sheetFrame(name, t0, once) {
    var m = meta[name] || { n: 12, fps: 10, loop: true };
    if (reduceMotion && m.loop !== false && !once) return 0;
    var fps = m.fps || 10, n = m.n || 12;
    var fi = Math.floor(t0 * fps);
    if (once || m.loop === false) fi = Math.min(n - 1, Math.max(0, fi));
    else fi = ((fi % n) + n) % n;
    return fi;
  }
  function spawnFx(key, x, y) {
    var m = meta[key] || { n: 12, fps: 16 };
    fxList.push({ key: key, x: x, y: y, t: 0, life: (m.n || 12) / (m.fps || 16) });
  }
  function poseDuration(name) {
    var m = meta[name] || { n: 12, fps: 12 };
    return (m.n || 12) / (m.fps || 12);
  }
  var coverArmed = false;
  function armCover() {
    var v = PK.$('coverVid'), img = PK.$('coverImg');
    if (!v || coverArmed) return;
    coverArmed = true;
    v.muted = true; v.defaultMuted = true; v.playsInline = true; v.loop = true;
    v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
    if (reduceMotion) {
      try { v.pause(); } catch (e) {}
      v.removeAttribute('src');
      v.style.display = 'none';
      if (img) img.style.opacity = '1';
      return;
    }
    v.autoplay = true;
    v.setAttribute('autoplay', '');
    if (!v.getAttribute('src') && !v.src) v.src = withVer(ART_DIR + '/cover/cover.mp4');
    var show = function () {
      if (reduceMotion) { try { v.pause(); } catch (e) {} v.style.display = 'none'; if (img) img.style.opacity = '1'; return; }
      v.style.display = 'block';
      if (img) img.style.opacity = '0';
      var p = v.play(); if (p && p.catch) p.catch(function () {});
    };
    v.addEventListener('canplay', show, { once: true });
    v.addEventListener('error', function () { if (img) img.style.opacity = '1'; v.style.display = 'none'; });
  }

  function setMsg(t, dur) { var el = PK.$('playMsg'); if (el) el.textContent = t || ''; msgT = dur || 2.2; }
  function setCoach(t) { var el = PK.$('coach'); if (!el) return; if (!t) { el.classList.remove('on'); el.textContent = ''; return; } el.textContent = t; el.classList.add('on'); }
  function wornList() {
    var a = [];
    if (outfit.inner) a.push(outfit.inner);
    if (outfit.mid) a.push(outfit.mid);
    if (outfit.outer) a.push(outfit.outer);
    return a.concat(outfit.acc);
  }
  function lampMetrics(x, y) {
    var side = Math.abs(x - 0.5);
    return {
      side: side,
      low: Math.max(0, y - 0.27),
      high: Math.max(0, 0.27 - y),
      center: Math.max(0, 1 - side / 0.045)
    };
  }
  function zoneOk(kind, x, y) {
    var side = Math.abs(x - 0.5);
    if (kind === 'teach') return side >= 0.12 && y >= 0.24 && y <= 0.33;
    if (kind === 'wide') return side >= 0.14 && side <= 0.24 && y >= 0.24 && y <= 0.33;
    if (kind === 'low') return y >= 0.36 && side >= 0.08 && side <= 0.20;
    if (kind === 'high') return y <= 0.20 && side >= 0.10 && side <= 0.18;
    if (kind === 'center') return side <= 0.04 && y >= 0.22 && y <= 0.34;
    return true;
  }
  function lightReads(x, y) {
    var side = Math.abs(x - 0.5);
    if (side <= 0.04 && y >= 0.22 && y <= 0.34) return true;
    if (side >= 0.12 && y >= 0.24 && y <= 0.33) return true;
    if (y >= 0.36) return true;
    if (y <= 0.20) return true;
    return false;
  }
  function projectPiece(g, x, y) {
    var m = lampMetrics(x, y);
    return {
      sh: g.shoulder + (g.kSide || 0) * m.side + (g.kLow || 0) * m.low + (g.kHigh || 0) * m.high + (g.kCenter || 0) * m.center,
      wa: g.waist + (g.wSide || 0) * m.side + (g.wLow || 0) * m.low + (g.wHigh || 0) * m.high + (g.wCenter || 0) * m.center
    };
  }
  function lampLabel(kind) {
    if (kind === 'teach') return '灯位';
    if (kind === 'wide') return '侧光';
    if (kind === 'low') return '低灯';
    if (kind === 'high') return '高灯';
    if (kind === 'center') return '灯位正中';
    return '灯位';
  }
  function evalStruct() {
    var shoulder = 0.30, waist = 0.72, sheerVis = 0, layers = 0;
    var hasL = false, hasR = false, hasBelt = false;
    var coverSolid = false;
    var reads = lightReads(lampX, lampY);
    ['outer', 'mid', 'inner'].forEach(function (L) {
      var g = outfit[L]; if (!g) return;
      layers += 1;
      var p = projectPiece(g, lampX, lampY);
      if (p.sh > shoulder) shoulder = p.sh;
      var wAdj = p.wa + (g.mat === 'solid' && L !== 'inner' ? 0.04 : 0);
      if (wAdj < waist) waist = wAdj;
      var sheerLike = g.mat === 'sheer' || g.mat === 'cutout';
      if (sheerLike && reads && (g.mat === 'cutout' || !coverSolid)) sheerVis += 1;
      if (g.mat === 'solid') coverSolid = true;
      if (g.mat === 'cutout') coverSolid = false;
    });
    outfit.acc.forEach(function (g) {
      var p = projectPiece(g, lampX, lampY);
      shoulder += p.sh; waist += p.wa;
      if (g.slot === 'capeL') hasL = true;
      if (g.slot === 'capeR') hasR = true;
      if (g.slot === 'belt') hasBelt = true;
    });
    var triangle = shoulder >= TRI_SH && waist <= TRI_WA;
    var centered = zoneOk('center', lampX, lampY);
    var symmetric = centered && hasL && hasR;
    var checks = [];
    var need = (level && level.need) || {};
    if (need.triangle) checks.push({ ok: triangle, name: '三角轮廓' });
    if (need.sheer != null) checks.push({ ok: sheerVis >= need.sheer, name: '透光×' + need.sheer });
    if (need.symmetric && !(need.cape && level && level.lamp === 'center')) checks.push({ ok: symmetric, name: '对称斗篷' });
    if (need.cape) checks.push({ ok: hasL && hasR, name: '双披肩' });
    if (need.layers) checks.push({ ok: layers >= need.layers, name: (need.layers === 3 ? '三层齐备' : '层数×' + need.layers) });
    if (need.belt) checks.push({ ok: hasBelt, name: '收腰带' });
    if (need.accMin) checks.push({ ok: outfit.acc.length >= need.accMin, name: '配件×' + need.accMin });
    if (level && level.lamp) checks.push({ ok: zoneOk(level.lamp, lampX, lampY), name: lampLabel(level.lamp) });
    if (level && level.free) checks = [{ ok: true, name: '自由创作' }];
    var pass = checks.every(function (c) { return c.ok; });
    return { shoulder: shoulder, waist: waist, sheerVis: sheerVis, layers: layers, triangle: triangle, symmetric: symmetric, checks: checks, pass: pass, acc: outfit.acc.length, hasBelt: hasBelt };
  }

  function updateHud() {
    var st = evalStruct();
    PK.$('accPill').textContent = '配件 ' + st.acc + '／3';
    var done = st.checks.filter(function (c) { return c.ok; }).length;
    PK.$('structPill').textContent = (level && level.free) ? '自由模式' : ('结构 ' + done + '／' + st.checks.length);
    PK.$('structPill').classList.toggle('ok', st.pass);
    PK.$('structPill').classList.toggle('bad', !st.pass && !(level && level.free));
  }
  function renderMenu() {
    if (dailyMode) { freeMode = false; lvPick = dailyPick().id; }
    else if (freeMode && levelUnlocked(0)) lvPick = 0;
    else {
      lvPick = S.lastLv || 1;
      if (lvPick === 0 && !levelUnlocked(0)) lvPick = 1;
      if (lvPick !== 0 && !levelUnlocked(lvPick)) lvPick = 1;
    }
    var ts = totalStars();
    if (PK.$('resStars')) PK.$('resStars').textContent = '灯影星章 ' + ts.n + '／' + ts.max;
    if (PK.$('modeFree')) {
      PK.$('modeFree').classList.toggle('on', !dailyMode && !freeMode);
      PK.$('modeDaily').classList.toggle('on', dailyMode);
    }
    var siteBox = PK.$('siteList');
    if (siteBox) {
      siteBox.innerHTML = '';
      SITES.forEach(function (s, i) {
        var open = siteUnlocked(i);
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'isl' + (open ? '' : ' lock') + (!freeMode && lvPick !== 0 && levelById(lvPick).site === i ? ' on' : '');
        var got = 0;
        LEVELS.forEach(function (L) { if (L.site === i) got += (S.stars && S.stars[L.id]) || 0; });
        b.innerHTML = '<b>' + s.name + '</b><em>' + (open ? got + '／18' : '未解锁') + '</em>';
        b.onclick = function () {
          if (!open) { PK.toast('先完成上一间工坊'); return; }
          var first = LEVELS.find(function (L) { return L.site === i; });
          lvPick = first.id; S.lastLv = lvPick; dailyMode = false; freeMode = false; save(); renderMenu(); sfx('click');
        };
        siteBox.appendChild(b);
      });
      var fb = document.createElement('button');
      fb.type = 'button';
      var fopen = levelUnlocked(0);
      fb.className = 'isl' + (fopen ? '' : ' lock') + (freeMode || lvPick === 0 ? ' on' : '');
      fb.innerHTML = '<b>自由台</b><em>' + (fopen ? '只收藏' : '未解锁') + '</em>';
      fb.onclick = function () {
        if (!fopen) { PK.toast('完成层叠透光后开放自由造型'); return; }
        freeMode = true; dailyMode = false; lvPick = 0; S.lastLv = 0; save(); renderMenu(); sfx('click');
      };
      siteBox.appendChild(fb);
    }
    var map = PK.$('lvMap');
    if (map) {
      map.innerHTML = '';
      if (freeMode || lvPick === 0) {
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'hnode on';
        b.innerHTML = '<b>自由</b><span class="hnm">自由造型</span>';
        map.appendChild(b);
      } else {
        var site = levelById(lvPick).site;
        LEVELS.filter(function (L) { return L.site === site; }).forEach(function (L) {
          var open = levelUnlocked(L.id);
          var btn = document.createElement('button');
          btn.type = 'button';
          var st = (S.stars && S.stars[L.id]) || 0;
          btn.className = 'hnode' + (open ? '' : ' lock') + (L.id === lvPick ? ' on' : '') + (st ? ' done' : '');
          var stars = '';
          for (var i = 1; i <= 3; i++) stars += '<i' + (st >= i ? ' class="on"' : '') + '></i>';
          btn.innerHTML = '<b>第' + L.id + '题</b><span class="hnm">' + L.name + '</span><span class="hstars">' + stars + '</span>';
          btn.onclick = function () {
            if (!open) { PK.toast('按顺序解锁本工坊'); return; }
            lvPick = L.id; S.lastLv = lvPick; dailyMode = false; freeMode = false; save(); renderMenu(); sfx('click');
          };
          map.appendChild(btn);
        });
      }
    }
    var L = levelById(lvPick);
    if (PK.$('mMeta')) PK.$('mMeta').textContent = L.free ? '自由创作 · 不打分' : '结构题 · 不打美丑分';
    if (PK.$('bPlay')) PK.$('bPlay').textContent = (dailyMode ? '今日一题 · ' : (L.free ? '进入 · ' : '上台 · ')) + L.name;
    if (PK.$('goalLine')) PK.$('goalLine').textContent = '目标：' + L.goal;
  }

  function lampHint(kind) {
    if (kind === 'teach') return '拖灯离开起点，肩影才会变宽';
    if (kind === 'wide') return '把灯拖到侧面，肩影才会拉开';
    if (kind === 'low') return '把灯放低，透光层才会被读出';
    if (kind === 'high') return '把灯抬高并稍偏，腰影才会收住';
    if (kind === 'center') return '把灯拖回舞台正中';
    return '拖灯看剪影';
  }
  function spawnLevel(id) {
    level = levelById(id);
    outfit = { inner: null, mid: null, outer: null, acc: [] };
    editLayer = 'inner'; tint = COLORS[0]; photoFails = 0;
    lampX = level.lampOff ? 0.72 : 0.55;
    lampY = level.lampOff ? 0.30 : 0.28;
    won = false; paused = false; state = 'play'; pose = 'idle'; poseT = 0; winHold = 0; fxList = [];
    updateHud(); setCoach((level.coach && level.coach[0]) || ''); setMsg(level.goal, 2.5);
    var hb = document.querySelector('#play .hintBar');
    if (hb) hb.textContent = (level.free ? '自由造型，灯位只改变剪影' : lampHint(level.lamp)) + ' · 对比窗可开目标边缘';
    PK.show('play'); resize();
    try { ensureArt(); } catch (e) {}
    try { preloadResultArt(); } catch (e) {}
    try { unlockAudio(); startBgm(); } catch (e) {}
    sfx('click');
  }

  function wear(g, dest) {
    if (!g) return;
    if (g.slot || g.layer === 'acc') {
      if (outfit.acc.length >= 3 && !outfit.acc.some(function (a) { return a.slot === g.slot; })) { PK.toast('配件槽已满'); return; }
      outfit.acc = outfit.acc.filter(function (a) { return a.slot !== g.slot; });
      outfit.acc.push(Object.assign({}, g, { color: tint }));
    } else {
      dest = dest || g.layer;
      if (dest !== 'inner' && dest !== 'mid' && dest !== 'outer') { PK.toast('服装请放入内、中或外层'); return; }
      ['inner', 'mid', 'outer'].forEach(function (L) {
        if (outfit[L] && outfit[L].id === g.id) outfit[L] = null;
      });
      outfit[dest] = Object.assign({}, g, { color: tint, layer: dest });
    }
    sfx('wear'); updateHud();
    var st = evalStruct();
    if (st.pass) setMsg('结构已达标，可以拍照', 1.8);
    else setMsg(st.checks.filter(function (c) { return !c.ok; }).map(function (c) { return c.name; }).join(' · ') || '', 1.6);
    if (level && level.coach && level.coach[1]) setCoach(level.coach[1]);
  }


  var RESULT_PACKS = [
    { id: '390x844', w: 390, h: 844, land: false,
      bg: 'bg/result-390x844.webp', bg2: 'bg/result-780x1688.webp',
      frame: 'props/result-frame-390x844.webp', frame2: 'props/result-frame-780x1688.webp',
      windows: { front: { x: 35, y: 111, w: 149, h: 186, r: 3 }, silhouette: { x: 206, y: 111, w: 149, h: 186, r: 3 } },
      captions: { front: { x: 27, y: 297, w: 165, h: 29 }, silhouette: { x: 198, y: 297, w: 165, h: 29 } },
      titleBox: { x: 0, y: 0, w: 390, h: 103 } },
    { id: '390x694', w: 390, h: 694, land: false,
      bg: 'bg/result-390x694.webp', bg2: 'bg/result-780x1387.webp',
      frame: 'props/result-frame-390x694.webp', frame2: 'props/result-frame-780x1387.webp',
      windows: { front: { x: 35, y: 111, w: 149, h: 186, r: 3 }, silhouette: { x: 206, y: 111, w: 149, h: 186, r: 3 } },
      captions: { front: { x: 27, y: 297, w: 165, h: 29 }, silhouette: { x: 198, y: 297, w: 165, h: 29 } },
      titleBox: { x: 0, y: 0, w: 390, h: 103 } },
    { id: '1440x900', w: 1440, h: 900, land: true,
      bg: 'bg/result-1440x900.webp', bg2: 'bg/result-2880x1800.webp',
      frame: 'props/result-frame-1440x900.webp', frame2: 'props/result-frame-2880x1800.webp',
      windows: { front: { x: 488, y: 60, w: 213, h: 266, r: 4 }, silhouette: { x: 739, y: 60, w: 213, h: 266, r: 4 } },
      captions: { front: { x: 476, y: 326, w: 237, h: 42 }, silhouette: { x: 727, y: 326, w: 237, h: 42 } },
      titleBox: { x: 430, y: 0, w: 580, h: 48 } }
  ];
  var sessionShot = { front: null, sil: null, frontImg: null, silImg: null };
  var resultPack = null, resultBox = null, resultPreload = {};

  function pickResultPack(vw, vh) {
    var land = vw / Math.max(1, vh) >= 1.15;
    var list = RESULT_PACKS.filter(function (p) { return p.land === land; });
    if (!list.length) list = RESULT_PACKS;
    var ar = vw / Math.max(1, vh), best = list[0], bestD = 99, i, d;
    for (i = 0; i < list.length; i++) {
      d = Math.abs(list[i].w / list[i].h - ar);
      if (d < bestD) { bestD = d; best = list[i]; }
    }
    return best;
  }
  function placedImageBox(vw, vh, iw, ih, contain) {
    var s = contain ? Math.min(vw / iw, vh / ih) : Math.max(vw / iw, vh / ih);
    var dw = iw * s, dh = ih * s;
    return { x: (vw - dw) / 2, y: contain ? (vh - dh) / 2 : 0, w: dw, h: dh, s: s };
  }
  function packFiles(pack) {
    var use2 = (window.devicePixelRatio || 1) >= 1.5;
    return {
      bg: ART_DIR + '/' + (use2 && pack.bg2 ? pack.bg2 : pack.bg),
      frame: ART_DIR + '/' + (use2 && pack.frame2 ? pack.frame2 : pack.frame)
    };
  }
  function setImgSrc(el, src) {
    if (!el || !src) return;
    var v = withVer(src);
    if (el.getAttribute('src') !== v) el.setAttribute('src', v);
  }
  function preloadResultArt() {
    var r = document.getElementById('result');
    var vw = (r && r.clientWidth) || window.innerWidth || W;
    var vh = (r && r.clientHeight) || window.innerHeight || H;
    var pack = pickResultPack(vw, vh);
    var files = packFiles(pack);
    [files.bg, files.frame].forEach(function (src) {
      if (resultPreload[src]) return;
      var im = new Image();
      im.src = withVer(src);
      resultPreload[src] = im;
    });
  }
  function canvasToDataURL(c) {
    var u;
    try {
      u = c.toDataURL('image/webp', 0.8);
      if (u && u.indexOf('image/webp') >= 0 && u.length > 64) return u;
    } catch (e) {}
    try { return c.toDataURL('image/jpeg', 0.82); } catch (e2) { return ''; }
  }
  function captureFrontStudio(outW, outH) {
    var c = document.createElement('canvas');
    c.width = outW; c.height = outH;
    var g = c.getContext('2d');
    var box = stageBox();
    var wx = box.x + SIL_WIN.x * box.w;
    var wallW = Math.max(48, wx - box.x - 8);
    var wallH = wallW * (outH / outW);
    var wallX = box.x;
    var wallY = box.y + box.h * 0.14;
    if (wallY + wallH > box.y + box.h * 0.78) wallY = Math.max(box.y, box.y + box.h * 0.78 - wallH);
    if (bgCache.canvas) {
      g.drawImage(bgCache.canvas, wallX * DPR, wallY * DPR, wallW * DPR, wallH * DPR, 0, 0, outW, outH);
    } else {
      g.fillStyle = '#7a4a62'; g.fillRect(0, 0, outW, outH);
    }
    var topPad = outH * 0.018, botPad = outH * 0.0;
    var sc = (outH - topPad - botPad) / 428;
    var old = ctx; ctx = g;
    drawOutfit(outW / 2, topPad + 450 * sc, sc, false);
    ctx = old;
    return c;
  }
  function captureSilStudio(outW, outH) {
    var c = document.createElement('canvas');
    c.width = outW; c.height = outH;
    var g = c.getContext('2d');
    var box = stageBox();
    var wx = box.x + SIL_WIN.x * box.w, wy = box.y + SIL_WIN.y * box.h;
    var ww = SIL_WIN.w * box.w, wh = SIL_WIN.h * box.h;
    var ix = ww * 0.08, iy = wh * 0.08;
    if (bgCache.canvas) {
      var sx = (wx + ix) * DPR, sy = (wy + iy) * DPR;
      var sw = Math.max(1, (ww - ix * 2) * DPR), sh = Math.max(1, (wh - iy * 2) * DPR);
      var scale = Math.max(outW / sw, outH / sh);
      var dw = sw * scale, dh = sh * scale;
      g.drawImage(bgCache.canvas, sx, sy, sw, sh, (outW - dw) / 2, (outH - dh) / 2, dw, dh);
    } else {
      g.fillStyle = '#4a3050'; g.fillRect(0, 0, outW, outH);
    }
    var topPad = outH * 0.018;
    var sc = (outH - topPad) / 428;
    var old = ctx; ctx = g;
    drawOutfit(outW / 2, topPad + 450 * sc, sc, true);
    ctx = old;
    return c;
  }
  function captureSessionPhotos() {
    var outW = 298, outH = 372;
    var front = captureFrontStudio(outW, outH);
    var sil = captureSilStudio(outW, outH);
    return { front: canvasToDataURL(front), sil: canvasToDataURL(sil) };
  }
  function loadShotImg(dataUrl, slot) {
    sessionShot[slot + 'Img'] = null;
    if (!dataUrl) return;
    var im = new Image();
    im.onload = function () { sessionShot[slot + 'Img'] = im; paintResultPhotos(); };
    im.onerror = function () { sessionShot[slot + 'Img'] = null; };
    im.src = dataUrl;
  }
  function roundRectPath(g, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }
  function drawCoverPhoto(g, img, x, y, w, h, r, dpr) {
    if (!img) return;
    g.save();
    roundRectPath(g, x, y, w, h, r);
    g.clip();
    var iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    if (!iw || !ih) { g.restore(); return; }
    var s = Math.max(w / iw, h / ih);
    var dw = iw * s, dh = ih * s;
    g.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
    g.restore();
  }
  function placeCap(el, rec, s) {
    if (!el || !rec) return;
    el.style.left = (rec.x * s) + 'px';
    el.style.top = (rec.y * s) + 'px';
    el.style.width = (rec.w * s) + 'px';
    el.style.height = (rec.h * s) + 'px';
    el.style.fontSize = Math.max(11, Math.round(rec.h * s * 0.46)) + 'px';
  }
  function paintResultPhotos() {
    if (!resultPack || !resultBox) return;
    var art = PK.$('resultArt');
    if (!art || !art.classList.contains('on')) return;
    var pack = resultPack, box = resultBox, s = box.s;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    ['front', 'silhouette'].forEach(function (k) {
      var win = pack.windows[k];
      var cvEl = PK.$(k === 'front' ? 'photoFront' : 'photoSil');
      if (!cvEl || !win) return;
      var cssW = win.w * s, cssH = win.h * s;
      cvEl.style.left = (win.x * s) + 'px';
      cvEl.style.top = (win.y * s) + 'px';
      cvEl.style.width = cssW + 'px';
      cvEl.style.height = cssH + 'px';
      cvEl.width = Math.max(1, Math.round(cssW * dpr));
      cvEl.height = Math.max(1, Math.round(cssH * dpr));
      var g = cvEl.getContext('2d');
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, cssW, cssH);
      var img = k === 'front' ? sessionShot.frontImg : sessionShot.silImg;
      drawCoverPhoto(g, img, 0, 0, cssW, cssH, win.r * s, dpr);
    });
  }
  function layoutResult() {
    var root = PK.$('result');
    if (!root || !root.classList.contains('on')) return;
    var vw = root.clientWidth || window.innerWidth || W;
    var vh = root.clientHeight || window.innerHeight || H;
    var pack = pickResultPack(vw, vh);
    var ar = vw / Math.max(1, vh);
    var land = ar >= 1.15;
    var contain = land || (ar > (pack.w / pack.h) * 1.18);
    var box = placedImageBox(vw, vh, pack.w, pack.h, contain);
    resultPack = pack; resultBox = box;
    if (root) root.classList.toggle('fitContain', !!contain);
    var files = packFiles(pack);
    setImgSrc(PK.$('resultBlur'), files.bg);
    setImgSrc(PK.$('resultCover'), files.bg);
    setImgSrc(PK.$('resultFrame'), files.frame);
    var art = PK.$('resultArt');
    var hasShot = !!(sessionShot.front || sessionShot.sil);
    if (art) {
      art.classList.toggle('on', hasShot);
      art.style.left = box.x + 'px';
      art.style.top = box.y + 'px';
      art.style.width = box.w + 'px';
      art.style.height = box.h + 'px';
    }
    root.classList.toggle('noShot', !hasShot);
    placeCap(PK.$('capFront'), pack.captions.front, box.s);
    placeCap(PK.$('capSil'), pack.captions.silhouette, box.s);
    var cap = pack.captions.front;
    var frameBottom = box.y + (cap.y + cap.h) * box.s;
    var head = PK.$('rHeadBox');
    var headH = 0;
    if (head) {
      var tb = pack.titleBox;
      var hx = box.x + tb.x * box.s, hy = box.y + tb.y * box.s;
      var hw = tb.w * box.s, hh = tb.h * box.s;
      var landHead = !!(hasShot && pack.land);
      if (!hasShot) {
        head.style.left = '0px'; head.style.top = 'max(12px, env(safe-area-inset-top))';
        head.style.width = '100%'; head.style.height = 'auto';
        headH = 0;
      } else if (landHead) {
        headH = 58;
        head.style.left = box.x + 'px';
        head.style.top = Math.round(frameBottom + 6) + 'px';
        head.style.width = box.w + 'px';
        head.style.height = headH + 'px';
        hh = headH;
      } else {
        head.style.left = hx + 'px';
        head.style.top = hy + 'px';
        head.style.width = hw + 'px';
        head.style.height = Math.max(36, hh) + 'px';
      }
      var fs = hasShot ? Math.max(16, Math.min(28, hh * 0.38)) : 26;
      if (landHead) fs = 26;
      if (hh < 52 && hasShot && !landHead) fs = Math.max(16, Math.min(22, hh * 0.48));
      if (PK.$('rTitle')) PK.$('rTitle').style.fontSize = fs + 'px';
      if (PK.$('rSub')) {
        PK.$('rSub').style.fontSize = Math.max(11, Math.round(fs * 0.48)) + 'px';
        PK.$('rSub').style.marginTop = (hh < 46 && !landHead ? '1px' : '4px');
      }
    }
    var body = document.querySelector('#result .rBody');
    if (body) {
      var topPad = 16;
      if (hasShot) {
        topPad = Math.round(frameBottom + (pack.land ? headH + 10 : 12));
      }
      body.style.paddingTop = Math.max(16, topPad) + 'px';
    }
    paintResultPhotos();
  }


  function levelTitle(id) {
    var L = levelById(id);
    return L ? L.name : '收藏';
  }
  function formatAlbumDate(ts) {
    try {
      var month = '', day = '';
      new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Shanghai', month: 'numeric', day: 'numeric' }).formatToParts(new Date(ts)).forEach(function (p) {
        if (p.type === 'month') month = p.value;
        if (p.type === 'day') day = p.value;
      });
      return (month && day) ? (month + '月' + day + '日') : '';
    } catch (e) { return ''; }
  }
  function fillThumb(wrap, src, ph) {
    if (!wrap) return;
    wrap.innerHTML = '';
    if (src) {
      var im = document.createElement('img');
      im.alt = '';
      im.src = src;
      wrap.appendChild(im);
    } else {
      var s = document.createElement('span');
      s.className = 'albumPh';
      s.textContent = ph || '暂无照片';
      wrap.appendChild(s);
    }
  }
  function openAlbumView(entry) {
    if (!entry) return;
    var L = levelById(entry.level);
    if (PK.$('albumViewTitle')) PK.$('albumViewTitle').textContent = levelTitle(entry.level);
    if (PK.$('albumViewSub')) {
      PK.$('albumViewSub').textContent = (L && L.free ? '自由造型' : (L ? L.name : '')) + (entry.t ? ' · ' + formatAlbumDate(entry.t) : '');
    }
    fillThumb(PK.$('viewFrontWrap'), entry.front, '暂无照片');
    fillThumb(PK.$('viewSilWrap'), entry.sil, '暂无照片');
    if (PK.$('albumView')) PK.$('albumView').hidden = false;
  }
  function closeAlbumView() { if (PK.$('albumView')) PK.$('albumView').hidden = true; }
  function closeAlbum() {
    closeAlbumView();
    if (PK.$('albumModal')) PK.$('albumModal').hidden = true;
  }
  function openAlbum() {
    var list = (S.album || []).slice().reverse();
    var grid = PK.$('albumGrid'), meta = PK.$('albumMeta');
    if (meta) meta.textContent = list.length ? ('共 ' + list.length + ' 张') : '尚无收藏';
    if (grid) {
      grid.innerHTML = '';
      if (!list.length) {
        var empty = document.createElement('div');
        empty.className = 'albumPh';
        empty.style.gridColumn = '1 / -1';
        empty.textContent = '通关拍照后会出现在这里。';
        grid.appendChild(empty);
      }
      list.forEach(function (entry) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'albumItem';
        var thumbs = document.createElement('div');
        thumbs.className = 'albumThumbs';
        var a = document.createElement('div'); a.className = 'albumThumb';
        var b = document.createElement('div'); b.className = 'albumThumb';
        fillThumb(a, entry.front, '暂无照片');
        fillThumb(b, entry.sil, '暂无照片');
        thumbs.appendChild(a); thumbs.appendChild(b);
        var lab = document.createElement('div'); lab.className = 'albumLab'; lab.textContent = levelTitle(entry.level);
        var dt = document.createElement('div'); dt.className = 'albumDate'; dt.textContent = formatAlbumDate(entry.t);
        btn.appendChild(thumbs); btn.appendChild(lab); btn.appendChild(dt);
        btn.onclick = function () { openAlbumView(entry); sfx('click'); };
        grid.appendChild(btn);
      });
    }
    if (PK.$('albumModal')) PK.$('albumModal').hidden = false;
  }
  function paintStructCard(ok, st) {
    var nOk = st.checks.filter(function (c) { return c.ok; }).length;
    var n = st.checks.length;
    if (PK.$('rStructCount')) PK.$('rStructCount').textContent = n ? (nOk + '／' + n) : '';
    var pills = PK.$('rPills');
    if (pills) {
      pills.innerHTML = '';
      st.checks.forEach(function (c) {
        var el = document.createElement('span');
        el.className = 'rPill' + (c.ok ? '' : ' bad');
        el.textContent = (c.ok ? '达 · ' : '未 · ') + c.name;
        pills.appendChild(el);
      });
    }
    var meta = PK.$('rMeta');
    if (meta) {
      if (level.free) meta.textContent = '已收入相册。颜色不打分。';
      else meta.textContent = '配件 ' + st.acc + '／3 · 配色由你决定，不计分' + (ok ? '　试拍失败 ' + photoFails + ' 次' : '');
    }
  }

  function paintResult(ok) {
    var shots = null;
    if (ok) {
      try { shots = captureSessionPhotos(); } catch (e) { shots = null; }
    }
    sessionShot.front = shots && shots.front || null;
    sessionShot.sil = shots && shots.sil || null;
    sessionShot.frontImg = sessionShot.silImg = null;
    state = 'result'; setCoach('');
    var st = evalStruct();
    var stv = 0;
    if (ok) {
      if (!level.free) {
        stv = starCount(true, photoFails);
        S.stars[level.id] = Math.max(S.stars[level.id] || 0, stv);
        S.best[level.id] = Math.max(S.best[level.id] || 0, stv);
        if ((S.unlocked || 1) < level.id + 1) S.unlocked = level.id + 1;
        if (level.id === 13) S.freeOn = true;
      }
      var entry = { t: Date.now(), level: level.id, tint: tint };
      if (sessionShot.front) entry.front = sessionShot.front;
      if (sessionShot.sil) entry.sil = sessionShot.sil;
      S.album = (S.album || []).concat([entry]).slice(-20);
      save(); sfx('win');
      PK.$('rTitle').textContent = level.free ? '造型已收藏' : '双联照已收藏';
      PK.$('rSub').textContent = level.free ? '自由创作完成' : (level.name + ' · 结构条件全部满足');
      var nxt = null;
      if (!level.free) {
        if (level.id === 1) nxt = { name: '对称工坊', desc: '左右披肩与灯位' };
        else if (level.id === 7) nxt = { name: '层叠工坊', desc: '多层透光挑战' };
        else if (level.id === 13) nxt = { name: '自由造型', desc: '无失败只收藏' };
        else if (level.id < 18) nxt = { name: levelById(level.id + 1).name, desc: '下一题已开放' };
      }
      var un = PK.$('rUnlock');
      if (un) {
        un.classList.toggle('hide', !nxt);
        if (nxt) {
          if (PK.$('uName')) PK.$('uName').textContent = nxt.name;
          if (PK.$('uDesc')) PK.$('uDesc').textContent = nxt.desc;
        }
      }
    } else {
      sfx('bad');
      PK.$('rTitle').textContent = '结构未达标';
      PK.$('rSub').textContent = '调整层与灯位再试';
      if (PK.$('rUnlock')) PK.$('rUnlock').classList.add('hide');
    }
    var starBox = PK.$('rStars');
    if (starBox) {
      starBox.innerHTML = '';
      if (!level.free) {
        for (var i = 1; i <= 3; i++) {
          var el = document.createElement('i');
          if (i <= stv) el.className = 'on';
          starBox.appendChild(el);
        }
      }
    }
    paintStructCard(ok, st);
    if (PK.$('bAgain')) PK.$('bAgain').textContent = ok && !level.free && level.id < 18 ? '下一题' : (level.free ? '再做一版' : '再上一题');
    var uIcon = PK.$('uIcon');
    if (uIcon && !uIcon.getAttribute('src')) setImgSrc(uIcon, ART_DIR + '/props/unlock-free.webp');
    PK.show('result');
    if (sessionShot.front) loadShotImg(sessionShot.front, 'front');
    if (sessionShot.sil) loadShotImg(sessionShot.sil, 'sil');
    layoutResult();
  }

  function tryPhoto() {
    var st = evalStruct();
    var pos = stagePos();
    spawnFx('fxPhoto', pos.x, pos.y - 180 * pos.sc);
    if (!level.free && !st.pass) {
      photoFails += 1;
      sfx('bad');
      pose = 'fail'; poseT = 0;
      PK.toast('结构未满足：' + st.checks.filter(function (c) { return !c.ok; }).map(function (c) { return c.name; }).join('、'));
      return;
    }
    sfx('photo'); endGame(true);
  }
  function endGame(ok) {
    if (!ok) { paintResult(false); return; }
    won = true;
    pose = 'win'; poseT = 0;
    winHold = Math.max(1.15, poseDuration('mannequin-win'));
    spawnFx('fxOk', stagePos().x, stagePos().y - 200 * stagePos().sc);
    setCoach('');
  }

  function stageScale() {
    var b = stageBox();
    var sc = 1.4 * Math.min(b.w, b.h) / 520;
    var floorY = b.y + 0.83 * b.h;
    var maxSc = (floorY - b.y - Math.max(72, b.h * 0.08)) / 450;
    if (sc > maxSc) sc = maxSc;
    return sc;
  }
  function stagePos() {
    var b = stageBox();
    return { x: b.x + 0.32 * b.w, y: b.y + 0.83 * b.h, sc: stageScale(), box: b };
  }
  /* 金窗位置：相对 play 原图（390×844）比例，落在 contain 后的舞台矩形内 */
  var SIL_WIN = { x: 0.523, y: 0.206, w: 0.454, h: 0.476 };
  function drawSheet(name, x, y, sc, t0, once, silhouette, clip) {
    var im = sheets[name], m = meta[name];
    if (!im || !m) return false;
    var fw = m.fw || 280, fh = m.fh || 480;
    var ax = (m.anchor && m.anchor.x != null) ? m.anchor.x : 140;
    var ay = (m.anchor && m.anchor.y != null) ? m.anchor.y : 450;
    var fi = sheetFrame(name, t0, once);
    var col = fi % (m.cols || 4), row = Math.floor(fi / (m.cols || 4));
    var sx = col * fw, sy = row * fh, sw = fw, sh = fh;
    var dx = x - ax * sc, dy = y - ay * sc, dw = fw * sc, dh = fh * sc;
    if (clip === 'L') { sw = fw / 2; dw = dw / 2; }
    if (clip === 'R') { sx += fw / 2; sw = fw / 2; dx += dw / 2; dw = dw / 2; }
    ctx.save();
    if (silhouette) { ctx.filter = 'brightness(0)'; ctx.globalAlpha = 0.92; }
    ctx.drawImage(im, sx, sy, sw, sh, dx, dy, dw, dh);
    ctx.restore();
    ctx.filter = 'none';
    ctx.globalAlpha = 1;
    return true;
  }
  function mannequinKey() {
    if (pose === 'win' && sheets['mannequin-win']) return 'mannequin-win';
    if (pose === 'fail' && sheets['mannequin-fail']) return 'mannequin-fail';
    return 'mannequin';
  }
  function clothKey(g) {
    if (g && sheets['item-' + g.id]) return 'item-' + g.id;
    if (g.slot === 'belt') return 'acc-belt';
    if (g.slot === 'capeL' || g.slot === 'capeR') return 'acc-cape';
    if (g.slot === 'shoulder') return 'acc-shoulder';
    if (g.mat === 'sheer') return 'cloth-sheer';
    if (g.mat === 'cutout') return 'cloth-cutout';
    return 'cloth-solid';
  }
  /* 占位轮廓。正式单件表接上后，LOOK 只保留染色；mask 不再裁共享表。 */
  var LOOK = {
    innerSheer: { mask: 'slip', alpha: 0.72, sx: 0.92, sy: 1, dyeAmt: 0.22, seam: true },
    innerSolid: { mask: 'column', alpha: 1, sx: 0.92, sy: 0.96, dyeAmt: 0.48, seam: true },
    midCut: { mask: 'shoulders', alpha: 1, sx: 1.04, sy: 0.9, dy: -8, dyeAmt: 0.18, holes: true },
    midSolid: { mask: 'vest', alpha: 1, sx: 0.96, sy: 0.86, dy: -8, dyeAmt: 0.5, buttons: true },
    outerWide: { mask: 'full', alpha: 1, sx: 1.04, sy: 1, dyeAmt: 0.38 },
    outerSheer: { mask: 'full', alpha: 0.7, sx: 1.02, sy: 1.02, dyeAmt: 0.12, stripes: true },
    outerCut: { mask: 'cloak', alpha: 0.96, sx: 1.02, sy: 1, dyeAmt: 0.32, holes: true },
    accShoulder: { mask: 'full', alpha: 1, sx: 1, sy: 1, dyeAmt: 0.12, gems: true },
    accBelt: { mask: 'full', alpha: 1, sx: 1.02, sy: 1, dyeAmt: 0.22, buckle: true },
    accCapeL: { mask: 'full', alpha: 0.92, sx: 1, sy: 1, dyeAmt: 0.16, cape: 'L' },
    accCapeR: { mask: 'full', alpha: 0.92, sx: 1, sy: 1, dyeAmt: 0.42, cape: 'R' }
  };
  var scratch = null;
  function scratchCanvas(fw, fh) {
    if (!scratch) scratch = document.createElement('canvas');
    if (scratch.width !== fw) scratch.width = fw;
    if (scratch.height !== fh) scratch.height = fh;
    return scratch;
  }
  function traceMask(g2, kind, fw, fh) {
    var cx = fw / 2;
    g2.beginPath();
    if (kind === 'slip') g2.rect(cx - 26, 78, 52, 340);
    else if (kind === 'column') g2.rect(cx - 46, 64, 92, 360);
    else if (kind === 'shoulders') { g2.rect(cx - 118, 48, 236, 128); g2.rect(cx - 34, 150, 68, 78); }
    else if (kind === 'vest') g2.rect(cx - 64, 118, 128, 176);
    else if (kind === 'cloak') {
      g2.moveTo(cx, 42); g2.lineTo(cx + 124, 150); g2.lineTo(cx + 74, 430); g2.lineTo(cx - 74, 430); g2.lineTo(cx - 124, 150); g2.closePath();
    } else g2.rect(0, 0, fw, fh);
  }
  function drawMotif(g2, g, look, fw, fh, silhouette) {
    var cx = fw / 2;
    var dye = silhouette ? '#14060e' : (g.color || '#e8a0c0');
    g2.globalCompositeOperation = 'source-atop';
    g2.globalAlpha = silhouette ? 0.95 : 0.9;
    g2.fillStyle = dye;
    g2.strokeStyle = dye;
    g2.lineWidth = 6;
    if (look.stripes) {
      g2.globalAlpha = silhouette ? 0.35 : 0.4;
      for (var y = 150; y < 340; y += 22) g2.fillRect(cx - 70, y, 140, 5);
    }
    if (look.seam) { g2.globalAlpha = 0.85; g2.fillRect(cx - 3, 140, 6, 180); }
    if (look.buttons) {
      g2.beginPath(); g2.arc(cx, 180, 7, 0, Math.PI * 2); g2.arc(cx, 214, 7, 0, Math.PI * 2); g2.fill();
    }
    if (look.gems) {
      g2.globalAlpha = 1;
      g2.beginPath(); g2.arc(cx - 62, 112, 8, 0, Math.PI * 2); g2.arc(cx + 62, 112, 8, 0, Math.PI * 2); g2.fill();
    }
    if (look.buckle) { g2.globalAlpha = 1; g2.fillStyle = silhouette ? '#14060e' : '#f0d8c0'; g2.fillRect(cx - 7, 208, 14, 16); }
    if (look.cape === 'L') { g2.globalAlpha = 0.8; g2.fillRect(48, 150, 16, 180); }
    if (look.cape === 'R') { g2.globalAlpha = 0.8; g2.fillRect(fw - 64, 150, 16, 180); }
    g2.globalAlpha = 1;
  }
  function blitGarment(g, x, y, sc, silhouette, clipSide) {
    if (!g) return;
    var look = LOOK[g.id] || { mask: 'full', alpha: 1, sx: 1, sy: 1, dyeAmt: 0.4 };
    var name = clothKey(g);
    var im = sheets[name], m = meta[name] || { fw: 280, fh: 480, cols: 4, n: 12, anchor: { x: 140, y: 450 } };
    var fw = m.fw || 280, fh = m.fh || 480;
    if (!im) {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(sc, sc);
      ctx.translate(-fw / 2, -fh + 30);
      ctx.fillStyle = silhouette ? '#14060e' : (g.color || '#e8a0c0');
      ctx.globalAlpha = silhouette ? 0.9 : (look.alpha || 1);
      traceMask(ctx, look.mask, fw, fh);
      ctx.fill();
      ctx.restore();
      return;
    }
    var scv = scratchCanvas(fw, fh);
    var g2 = scv.getContext('2d');
    g2.setTransform(1, 0, 0, 1, 0, 0);
    g2.globalAlpha = 1;
    g2.globalCompositeOperation = 'source-over';
    g2.clearRect(0, 0, fw, fh);
    var fi = sheetFrame(name, animT, false);
    var col = fi % (m.cols || 4), row = Math.floor(fi / (m.cols || 4));
    var sx = col * fw, sy = row * fh, sw = fw, sh = fh, dx = 0, dw = fw;
    if (clipSide === 'L') { sw = fw / 2; dw = fw / 2; }
    if (clipSide === 'R') { sx += fw / 2; sw = fw / 2; dx = fw / 2; dw = fw / 2; }
    g2.drawImage(im, sx, sy, sw, sh, dx, 0, dw, fh);
    g2.globalCompositeOperation = 'destination-in';
    g2.fillStyle = '#fff';
    traceMask(g2, look.mask, fw, fh);
    g2.fill();
    if (look.holes) {
      g2.globalCompositeOperation = 'destination-out';
      g2.beginPath();
      g2.arc(fw / 2 - 52, 96, 16, 0, Math.PI * 2);
      g2.arc(fw / 2 + 52, 96, 16, 0, Math.PI * 2);
      if (look.mask === 'cloak') g2.moveTo(fw / 2 + 22, 210), g2.arc(fw / 2, 210, 22, 0, Math.PI * 2);
      g2.fill();
    }
    if (!silhouette && look.dyeAmt) {
      g2.globalCompositeOperation = 'source-atop';
      g2.globalAlpha = look.dyeAmt;
      g2.fillStyle = g.color || '#e8a0c0';
      g2.fillRect(0, 0, fw, fh);
      g2.globalAlpha = 1;
    }
    drawMotif(g2, g, look, fw, fh, silhouette);
    var ax = (m.anchor && m.anchor.x != null) ? m.anchor.x : 140;
    var ay = (m.anchor && m.anchor.y != null) ? m.anchor.y : 450;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(look.sx || 1, look.sy || 1);
    ctx.translate(0, (look.dy || 0) * sc);
    ctx.globalAlpha = silhouette ? (look.alpha < 0.7 ? 0.58 : 0.92) : (look.alpha == null ? 1 : look.alpha);
    if (silhouette) ctx.filter = 'brightness(0)';
    ctx.drawImage(scv, -ax * sc, -ay * sc, fw * sc, fh * sc);
    ctx.restore();
    ctx.filter = 'none';
    ctx.globalAlpha = 1;
  }
  function drawOutfit(x, y, sc, silhouette) {
    var mk = mannequinKey();
    var once = mk !== 'mannequin';
    var t0 = once ? poseT : animT;
    if (!drawSheet(mk, x, y, sc, t0, once, silhouette, null)) {
      ctx.save();
      ctx.fillStyle = silhouette ? '#11040e' : '#e8d0d8';
      ctx.beginPath(); ctx.arc(x, y - 200 * sc, 22 * sc, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(x - 36 * sc, y - 180 * sc, 72 * sc, 160 * sc);
      ctx.restore();
    }
    ['inner', 'mid', 'outer'].forEach(function (L) {
      if (outfit[L]) blitGarment(outfit[L], x, y, sc, silhouette, null);
    });
    var hasL = outfit.acc.some(function (a) { return a.slot === 'capeL'; });
    var hasR = outfit.acc.some(function (a) { return a.slot === 'capeR'; });
    outfit.acc.forEach(function (g) {
      if (g.slot === 'capeR' && hasL) return;
      if (g.slot === 'capeL' && hasR) {
        blitGarment(g, x, y, sc, silhouette, 'L');
        var right = null;
        outfit.acc.forEach(function (a) { if (a.slot === 'capeR') right = a; });
        if (right) blitGarment(right, x, y, sc, silhouette, 'R');
        return;
      }
      var clip = null;
      if (g.slot === 'capeL') clip = 'L';
      if (g.slot === 'capeR') clip = 'R';
      blitGarment(g, x, y, sc, silhouette, clip);
    });
  }
  function drawEdgeAssist(wx, wy, ww, wh) {
    if (!edgeAssist || !level || level.free) return;
    var need = level.need || {};
    var cx = wx + ww * 0.5;
    var top = wy + wh * 0.18;
    var mid = wy + wh * 0.46;
    var bot = wy + wh * 0.78;
    ctx.save();
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 5]);
    ctx.strokeStyle = 'rgba(255, 214, 160, 0.95)';
    ctx.fillStyle = 'rgba(255, 214, 160, 0.12)';
    if (need.triangle) {
      var sw = ww * 0.34, nw = ww * 0.16;
      ctx.beginPath();
      ctx.moveTo(cx - sw, top);
      ctx.lineTo(cx + sw, top);
      ctx.lineTo(cx + nw, mid);
      ctx.lineTo(cx + nw * 0.85, bot);
      ctx.lineTo(cx - nw * 0.85, bot);
      ctx.lineTo(cx - nw, mid);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.strokeRect(cx - ww * 0.22, top, ww * 0.44, bot - top);
    }
    if (need.sheer) {
      ctx.strokeStyle = 'rgba(186, 230, 255, 0.95)';
      var n = need.sheer;
      for (var i = 0; i < n; i++) ctx.strokeRect(cx - ww * 0.12 + i * 5, top + 18 + i * 10, ww * 0.24 - i * 10, (bot - top) - 28 - i * 12);
    }
    if (need.symmetric || need.cape || (level && level.lamp === 'center')) {
      ctx.beginPath(); ctx.moveTo(cx, top - 8); ctx.lineTo(cx, bot + 8); ctx.stroke();
    }
    if (need.cape) {
      ctx.beginPath(); ctx.moveTo(cx - ww * 0.2, top + 8); ctx.lineTo(cx - ww * 0.36, mid); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx + ww * 0.2, top + 8); ctx.lineTo(cx + ww * 0.36, mid); ctx.stroke();
    }
    ctx.restore();
  }
  function placeEdgeButton() {
    var b = PK.$('bEdge'); if (!b) return;
    var box = stageBox();
    var x = box.x + (SIL_WIN.x + SIL_WIN.w) * box.w - 8;
    var y = box.y + SIL_WIN.y * box.h + 8;
    var bw = b.offsetWidth || 96;
    b.style.left = Math.max(8, Math.round(x - bw)) + 'px';
    b.style.top = Math.round(y) + 'px';
  }
  function drawFxItem(f) {
    var im = sheets[f.key], m = meta[f.key];
    if (!im || !m) return;
    var fi = sheetFrame(f.key, f.t, true);
    var col = fi % (m.cols || 4), row = Math.floor(fi / (m.cols || 4));
    var S = Math.min(W, H) / 900;
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.drawImage(im, col * m.fw, row * m.fh, m.fw, m.fh, -m.anchor.x * S, -m.anchor.y * S, m.fw * S, m.fh * S);
    ctx.restore();
  }

  function draw() {
    if (state !== 'play') return;
    ctx.clearRect(0, 0, W, H);
    var box = drawStageBg('#4a2040');

    var pos = stagePos();
    var mx = pos.x, my = pos.y, sc = pos.sc;

    drawOutfit(mx, my, sc, false);

    var wx = box.x + SIL_WIN.x * box.w, wy = box.y + SIL_WIN.y * box.h, ww = SIL_WIN.w * box.w, wh = SIL_WIN.h * box.h;
    /* play 背景已带深紫玻璃金边窗。不再画程序 fillRect／描边／「剪影」字，也不把 480×540 的框景叠上去（宽高比不同会在金窗里再套一框）。剪影直接画在窗内。框景道具已加载，仅作背景缺失时的后备。 */
    if (!imgs.play && imgs.silFrame) {
      var fh = ww * 540 / 480;
      var fy = wy + Math.max(0, (wh - fh) / 2);
      ctx.drawImage(imgs.silFrame, wx, fy, ww, fh);
    }
    var ssc = Math.min((ww * 0.82) / 280, (wh * 0.88) / 480);
    var st = evalStruct();
    var widen = 0.78 + Math.min(0.5, Math.max(0, st.shoulder - 0.45) * 0.75);
    var sxx = wx + ww / 2 + (lampX - 0.5) * ww * 0.62;
    var syy = wy + wh - (480 - 450) * ssc - Math.max(8, wh * 0.04) + (lampY - 0.28) * wh * 0.12;
    ctx.save();
    ctx.translate(sxx, syy);
    ctx.translate(0, -210 * ssc);
    ctx.scale(widen, 1 - Math.max(0, lampY - 0.30) * 0.28);
    ctx.translate(0, 210 * ssc);
    drawOutfit(0, 0, ssc, true);
    ctx.restore();
    drawEdgeAssist(wx, wy, ww, wh);

    var lx = box.x + lampX * box.w, ly = box.y + lampY * box.h;
    if (imgs.lamp) ctx.drawImage(imgs.lamp, lx - 24, ly - 24, 48, 48);
    else { ctx.fillStyle = '#ffe8a0'; ctx.beginPath(); ctx.arc(lx, ly, 16, 0, Math.PI * 2); ctx.fill(); }
    ctx.strokeStyle = 'rgba(255,230,160,.45)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(mx, my - 200 * sc); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(sxx, syy - 180 * ssc); ctx.stroke();

    fxList.forEach(drawFxItem);

    st.checks.forEach(function (c, i) {
      ctx.fillStyle = c.ok ? 'rgba(120,200,140,.85)' : 'rgba(200,80,90,.75)';
      ctx.fillRect(14, H * 0.12 + i * 22, 132, 18);
      ctx.fillStyle = '#fff'; ctx.font = '11px sans-serif';
      ctx.fillText((c.ok ? '达 ' : '未 ') + c.name, 20, H * 0.12 + i * 22 + 13);
    });
    placeEdgeButton();
  }

  function loop(ts) {
    raf = requestAnimationFrame(loop);
    var dt = Math.min(0.05, (ts - lastTs) / 1000 || 0.016); lastTs = ts;
    if (state === 'play' && !paused) {
      if (!reduceMotion) animT += dt; if (msgT > 0) msgT -= dt;
      if (pose !== 'idle') poseT += dt;
      if (pose === 'fail' && poseT >= poseDuration('mannequin-fail')) { pose = 'idle'; poseT = 0; }
      fxList.forEach(function (f) { f.t += dt; });
      fxList = fxList.filter(function (f) { return f.t < f.life; });
      if (won && winHold > 0) {
        winHold -= dt;
        if (winHold <= 0) paintResult(true);
      }
      draw();
    }
  }
  function resize() {
    var playEl = PK.$('play');
    var r = playEl ? playEl.getBoundingClientRect() : { width: 0, height: 0 };
    if (r.width >= 32 && r.height >= 32) {
      W = Math.max(320, Math.floor(r.width)); H = Math.max(480, Math.floor(r.height));
      DPR = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.floor(W * DPR); cv.height = Math.floor(H * DPR);
      cv.style.width = W + 'px'; cv.style.height = H + 'px';
      if (ctx) ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      bgCache.key = '';
      ensureStageBg('#4a2040');
      maybeLoadPlay2880();
    }
    if (state === 'result') layoutResult();
    if (state === 'play') placeEdgeButton();
  }

  function paintThumb(canvas, g) {
    if (!canvas || !g) return;
    var gtx = canvas.getContext('2d');
    var prev = ctx;
    ctx = gtx;
    gtx.setTransform(1, 0, 0, 1, 0, 0);
    gtx.clearRect(0, 0, canvas.width, canvas.height);
    gtx.fillStyle = 'rgba(255,255,255,.05)';
    gtx.fillRect(0, 0, canvas.width, canvas.height);
    blitGarment(g, canvas.width / 2, canvas.height - 2, canvas.height / 520, false, g.slot === 'capeL' ? 'L' : (g.slot === 'capeR' ? 'R' : null));
    ctx = prev;
  }
  function fillWardrobe() {
    var box = PK.$('wardrobe'); box.innerHTML = '';
    var list = GARMENTS.filter(function (g) {
      if (editLayer === 'acc') return !!g.slot;
      return !g.slot;
    }).slice().sort(function (a, b) {
      var ah = a.layer === editLayer ? 0 : 1;
      var bh = b.layer === editLayer ? 0 : 1;
      if (ah !== bh) return ah - bh;
      return a.name.localeCompare(b.name, 'zh');
    });
    var matName = { solid: '实色', sheer: '透光', cutout: '镂空' };
    list.forEach(function (g) {
      var b = document.createElement('button');
      b.type = 'button';
      var worn = g.slot ? outfit.acc.some(function (a) { return a.id === g.id; }) : ['inner', 'mid', 'outer'].some(function (L) { return outfit[L] && outfit[L].id === g.id; });
      b.className = 'witem' + (worn ? ' on' : '');
      var thumb = document.createElement('canvas');
      thumb.className = 'wthumb';
      thumb.width = 54; thumb.height = 72;
      var text = document.createElement('div');
      var title = document.createElement('div'); title.className = 't'; title.textContent = g.name;
      var sub = document.createElement('div'); sub.className = 's';
      var note = (!g.slot && g.layer !== editLayer) ? ' · 可放入本层' : '';
      sub.textContent = (matName[g.mat] || '') + note;
      text.appendChild(title); text.appendChild(sub);
      b.appendChild(thumb); b.appendChild(text);
      paintThumb(thumb, g);
      var startX = 0, startY = 0, moved = false;
      b.addEventListener('pointerdown', function (e) {
        startX = e.clientX; startY = e.clientY; moved = false;
        try { b.setPointerCapture(e.pointerId); } catch (err) {}
      });
      b.addEventListener('pointermove', function (e) {
        if (Math.abs(e.clientX - startX) + Math.abs(e.clientY - startY) > 14) moved = true;
      });
      b.addEventListener('pointerup', function (e) {
        if (!moved) return;
        var hit = document.elementFromPoint(e.clientX, e.clientY);
        var tab = hit && hit.closest ? hit.closest('.lt') : null;
        b.dataset.dragged = '1';
        if (!tab) return;
        var dest = tab.getAttribute('data-l');
        editLayer = dest;
        [].forEach.call(document.querySelectorAll('.lt'), function (x) { x.classList.toggle('on', x === tab); });
        if (g.slot) {
          if (dest === 'acc') wear(g);
          else PK.toast('配饰放进配件槽');
        } else if (dest === 'acc') PK.toast('服装请放入内、中或外层');
        else wear(g, dest);
        setTimeout(fillWardrobe, 0);
      });
      b.onclick = function () {
        if (b.dataset.dragged === '1') { b.dataset.dragged = ''; return; }
        if (g.slot) { if (editLayer !== 'acc') { PK.toast('配饰放进配件槽'); return; } wear(g); }
        else { if (editLayer === 'acc') { PK.toast('服装请放入内、中或外层'); return; } wear(g, editLayer); }
        PK.$('layerModal').hidden = true;
      };
      box.appendChild(b);
    });
  }
  function fillSwatches() {
    var box = PK.$('swatches'); box.innerHTML = '';
    COLORS.forEach(function (c) {
      var b = document.createElement('button'); b.className = 'sw'; b.type = 'button'; b.style.background = c;
      b.onclick = function () {
        tint = c;
        ['inner', 'mid', 'outer'].forEach(function (L) { if (outfit[L]) outfit[L].color = c; });
        outfit.acc.forEach(function (a) { a.color = c; });
        sfx('click'); PK.$('colorModal').hidden = true;
      };
      box.appendChild(b);
    });
  }

  function goNextOrAgain() {
    if (won && level && !level.free && (S.stars && S.stars[level.id]) && level.id < 18) {
      var nxt = level.id + 1;
      if (levelUnlocked(nxt) || (S.unlocked || 1) >= nxt) {
        lvPick = nxt; S.lastLv = nxt; save(); spawnLevel(nxt); return;
      }
    }
    spawnLevel(level ? level.id : lvPick);
  }

  function bind() {
    cv = PK.$('cv'); ctx = cv.getContext('2d');
    PK.init({
      game: 'lampdress',
      save: save,
      onHide: function () { pauseBgm(); pauseCover(); },
      onShow: function () { if (heard && S.sound) startBgm(); resumeCover(); }
    });
    document.addEventListener('pointerdown', firstHear, true);
    document.addEventListener('keydown', firstHear, true);
    window.addEventListener('pagehide', function () { pauseBgm(); pauseCover(); });
    PK.$('mHub').onclick = function () {
      try { save(); } catch (e) {}
      location.href = '../index.html';
    };
    renderMenu(); setSoundUI(); fillSwatches();
    setTimeout(function () { ensureArt(); }, 1500);
    armCover();
    PK.$('mSnd').onclick = toggleSound;
    if (PK.$('pSnd')) PK.$('pSnd').onclick = toggleSound;
    function closeHelp() { PK.$('helpModal').hidden = true; S.seenHelp = true; save(); }
    PK.$('mHelp').onclick = function () { PK.$('helpModal').hidden = false; };
    PK.$('helpX').onclick = closeHelp; PK.$('helpOk').onclick = closeHelp;
    if (PK.$('modeFree')) PK.$('modeFree').onclick = function () { dailyMode = false; freeMode = false; renderMenu(); sfx('click'); };
    if (PK.$('modeDaily')) PK.$('modeDaily').onclick = function () { dailyMode = true; freeMode = false; renderMenu(); sfx('click'); };
    PK.$('bPlay').onclick = function () {
      try { unlockAudio(); sfx('click'); } catch (e) {}
      if (!S.seenHelp) {
        PK.$('helpModal').hidden = false;
        PK.$('helpOk').onclick = function () { closeHelp(); spawnLevel(lvPick); };
        return;
      }
      spawnLevel(lvPick);
    };
    PK.$('pBack').onclick = PK.$('pPause').onclick = function () { PK.$('pauseModal').hidden = false; paused = true; };
    PK.$('bResume').onclick = function () { PK.$('pauseModal').hidden = true; paused = false; };
    PK.$('bRestart').onclick = function () { PK.$('pauseModal').hidden = true; spawnLevel(level ? level.id : lvPick); };
    PK.$('bQuit').onclick = function () { PK.$('pauseModal').hidden = true; paused = false; state = 'menu'; PK.show('menu'); renderMenu(); };
    PK.$('bLayer').onclick = function () { fillWardrobe(); PK.$('layerModal').hidden = false; sfx('click'); };
    PK.$('layerX').onclick = function () { PK.$('layerModal').hidden = true; };
    [].forEach.call(document.querySelectorAll('.lt'), function (el) {
      el.onclick = function () {
        editLayer = el.getAttribute('data-l');
        [].forEach.call(document.querySelectorAll('.lt'), function (x) { x.classList.toggle('on', x === el); });
        fillWardrobe(); sfx('click');
      };
    });
    PK.$('bClearLayer').onclick = function () {
      if (editLayer === 'acc') outfit.acc = [];
      else outfit[editLayer] = null;
      updateHud(); sfx('click');
    };
    PK.$('bColor').onclick = function () { PK.$('colorModal').hidden = false; sfx('click'); };
    PK.$('colorX').onclick = function () { PK.$('colorModal').hidden = true; };
    if (PK.$('bEdge')) PK.$('bEdge').onclick = function () {
      edgeAssist = !edgeAssist;
      PK.$('bEdge').classList.toggle('on', edgeAssist);
      PK.$('bEdge').setAttribute('aria-pressed', edgeAssist ? 'true' : 'false');
      PK.$('bEdge').textContent = edgeAssist ? '边缘开' : '目标边缘';
      sfx('click');
    };
    PK.$('bPhoto').onclick = tryPhoto;
    PK.$('bAgain').onclick = goNextOrAgain;
    if (PK.$('bAlbum')) PK.$('bAlbum').onclick = function () { openAlbum(); sfx('click'); };
    if (PK.$('albumX')) PK.$('albumX').onclick = function () { closeAlbum(); };
    if (PK.$('albumViewX')) PK.$('albumViewX').onclick = function () { closeAlbumView(); };
    if (PK.$('albumView')) PK.$('albumView').addEventListener('click', function (e) {
      if (e.target === PK.$('albumView')) closeAlbumView();
    });
    PK.$('bMenu').onclick = function () { closeAlbum(); state = 'menu'; PK.show('menu'); renderMenu(); };
    cv.addEventListener('pointerdown', function (e) {
      if (state !== 'play' || paused) return;
      unlockAudio();
      var rect = cv.getBoundingClientRect();
      var px = (e.clientX - rect.left) * (W / rect.width), py = (e.clientY - rect.top) * (H / rect.height);
      var box = stageBox();
      if (Math.hypot(px - (box.x + lampX * box.w), py - (box.y + lampY * box.h)) < 40) {
        dragLamp = true; cv.setPointerCapture(e.pointerId); setCoach((level.coach && (level.coach[2] || level.coach[1])) || ''); return;
      }
    });
    cv.addEventListener('pointermove', function (e) {
      if (!dragLamp) return;
      var rect = cv.getBoundingClientRect();
      var box = stageBox();
      var px = (e.clientX - rect.left) * (W / rect.width), py = (e.clientY - rect.top) * (H / rect.height);
      lampX = Math.max(0.30, Math.min(0.78, (px - box.x) / Math.max(1, box.w)));
      lampY = Math.max(0.14, Math.min(0.46, (py - box.y) / Math.max(1, box.h)));
      updateHud();
    });
    cv.addEventListener('pointerup', function () { dragLamp = false; });
    window.addEventListener('resize', resize);
    lastTs = performance.now(); raf = requestAnimationFrame(loop);
  }
  bind();

  var SOLVED = {
    0: { lamp: [0.50, 0.28], wear: [['innerSheer', 'inner'], ['midCut', 'mid']] },
    1: { lamp: [0.34, 0.28], wear: [['innerSheer', 'inner'], ['midCut', 'mid']] },
    2: { lamp: [0.34, 0.28], wear: [['midCut', 'mid']] },
    3: { lamp: [0.38, 0.40], wear: [['innerSheer', 'inner'], ['midCut', 'mid']] },
    4: { lamp: [0.34, 0.28], wear: [['innerSheer', 'inner'], ['midCut', 'mid'], ['accBelt']] },
    5: { lamp: [0.34, 0.28], wear: [['midCut', 'mid'], ['accShoulder']] },
    6: { lamp: [0.34, 0.28], wear: [['innerSheer', 'inner'], ['midCut', 'mid'], ['outerSheer', 'outer']] },
    7: { lamp: [0.50, 0.28], wear: [['accCapeL'], ['accCapeR']] },
    8: { lamp: [0.50, 0.28], wear: [['accCapeL'], ['accCapeR']] },
    9: { lamp: [0.50, 0.28], wear: [['innerSheer', 'inner'], ['accCapeL'], ['accCapeR']] },
    10: { lamp: [0.50, 0.28], wear: [['midCut', 'mid'], ['accCapeL'], ['accCapeR']] },
    11: { lamp: [0.34, 0.28], wear: [['innerSheer', 'inner'], ['midSolid', 'mid'], ['outerWide', 'outer'], ['accCapeL'], ['accCapeR']] },
    12: { lamp: [0.50, 0.28], wear: [['innerSheer', 'inner'], ['midCut', 'mid'], ['accCapeL'], ['accCapeR']] },
    13: { lamp: [0.38, 0.40], wear: [['innerSheer', 'inner'], ['midCut', 'mid'], ['outerSheer', 'outer']] },
    14: { lamp: [0.38, 0.40], wear: [['innerSheer', 'inner'], ['midCut', 'mid'], ['outerSheer', 'outer']] },
    15: { lamp: [0.38, 0.40], wear: [['innerSheer', 'inner'], ['midCut', 'mid'], ['outerSheer', 'outer'], ['accCapeL'], ['accCapeR']] },
    16: { lamp: [0.36, 0.18], wear: [['innerSheer', 'inner'], ['midCut', 'mid'], ['outerSheer', 'outer'], ['accBelt']] },
    17: { lamp: [0.50, 0.28], wear: [['innerSheer', 'inner'], ['midCut', 'mid'], ['outerSheer', 'outer'], ['accCapeL'], ['accCapeR']] },
    18: { lamp: [0.36, 0.18], wear: [['innerSheer', 'inner'], ['midCut', 'mid'], ['outerSheer', 'outer'], ['accCapeL'], ['accCapeR']] }
  };
  var ALT = {
    6: { lamp: [0.34, 0.28], wear: [['innerSolid', 'inner'], ['midSolid', 'mid'], ['outerCut', 'outer'], ['accBelt']] },
    1: { lamp: [0.66, 0.28], wear: [['innerSolid', 'inner'], ['outerCut', 'outer'], ['accBelt']] }
  };
  function applyWear(spec) {
    outfit = { inner: null, mid: null, outer: null, acc: [] };
    (spec.wear || []).forEach(function (w) {
      var g = GBY[w[0]];
      wear(g, w[1] || (g && g.layer));
    });
    if (spec.lamp) { lampX = spec.lamp[0]; lampY = spec.lamp[1]; }
    updateHud();
    return evalStruct();
  }
  function autoSolve(id) {
    spawnLevel(id);
    var spec = SOLVED[id];
    if (!spec) { updateHud(); return evalStruct(); }
    return applyWear(spec);
  }

  window.LampDress = {
    version: ART_VER,
    saveKey: SAVE_KEY,
    saveOld: SAVE_OLD,
    artDir: ART_DIR,
    ready: true,
    levels: LEVELS,
    startLevel: function (id) { spawnLevel(id === 0 ? 0 : (id || lvPick)); },
    getState: function () {
      var st = level ? evalStruct() : {};
      return { state: state, level: level && level.id, pass: !!st.pass, checks: st.checks, lamp: { x: lampX, y: lampY }, unlocked: S.unlocked, freeOn: !!S.freeOn, fails: photoFails, album: (S.album && S.album.length) || 0, hasShot: !!(sessionShot.front || sessionShot.sil), edge: edgeAssist, version: ART_VER, bgm: bgmPlaying, heard: heard, outfit: { inner: outfit.inner && outfit.inner.id, mid: outfit.mid && outfit.mid.id, outer: outfit.outer && outfit.outer.id, acc: outfit.acc.map(function (a) { return a.id; }) } };
    },
    _win: function () { endGame(true); },
    _solve: autoSolve,
    _apply: function (id, alt) { spawnLevel(id); return applyWear((alt && ALT[id]) || SOLVED[id]); },
    _setLamp: function (x, y) { lampX = x; lampY = y; updateHud(); return evalStruct(); },
    _layoutResult: layoutResult,
    _openAlbum: openAlbum,
    artReady: function () { return !!artReadyFlag; },
    bgmDuration: function () { return bgmBuffer ? bgmBuffer.duration : 0; },
    reduced: function () { return !!reduceMotion; }
  };
})();
