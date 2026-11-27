/* 云端攀行。封面用真动画精灵表，岩壁上用四态静帧，按锚点拖拽吸附。 */
(function () {
  'use strict';

  var RULES = window.CLOUDCLIMB_RULES;
  var AUDIO = window.CLOUDCLIMB_AUDIO;
  var SAVE_KEY = 'cloudclimb_save_v1';
  var REDUCE = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var CLIPS = {
    reach: { src: 'assets/anim/b27-mascot-sheet-reach.webp', still: 'assets/anim/b27-mascot-still-reach.png', fw: 392, fh: 444, ax: 222.6439917135615, ay: 232.70595165346208 },
    breath: { src: 'assets/anim/b27-mascot-sheet-breath.webp', still: 'assets/anim/b27-mascot-still-breath.png', fw: 346, fh: 438, ax: 176.64877628385207, ay: 226.72622541690853 },
    slip: { src: 'assets/anim/b27-mascot-sheet-slip.webp', still: 'assets/anim/b27-mascot-still-slip.png', fw: 370, fh: 436, ax: 178.6372445787732, ay: 222.73668652740545 }
  };

  var POSES = {
    default: {
      torso: [242.00666507020458, 252.83163958882514],
      hand_l: [325.2232567701939, 223.17765692675994],
      hand_r: [379.5719043389007, 166.77273740281183],
      foot_l: [212.07101990393525, 452.76],
      foot_r: [284.6438000994357, 436.24]
    },
    reach: {
      torso: [242.1683322465044, 246.42847023789446],
      hand_l: [326.3322339908247, 226.2161523482003],
      hand_r: [379.37036596290454, 70.8858279038864],
      foot_l: [169.941909972751, 460.84],
      foot_r: [276.3013150767032, 430.16]
    },
    hang: {
      torso: [258.8652467291592, 253.3779359166167],
      hand_l: [220.65552138557297, 54.05083399334518],
      hand_r: [341.93402796236245, 59.41441959804495],
      foot_l: [193.46392602660268, 480],
      foot_r: [284.93986475567135, 474.88]
    },
    stand: {
      torso: [257.97356621979156, 264.41803468918096],
      hand_l: [190.5663782327586, 308.1901099137931],
      hand_r: [353.92805943471365, 294.5447189071211],
      foot_l: [232.6868324723337, 462.52],
      foot_r: [306.2785528217719, 450]
    }
  };

  var HOLD_ANCHOR = {
    red: [237.16347901175382, 223.51999999999998],
    green: [214.03915542246486, 226.6],
    blue: [245.60838957961832, 226.01999999999998],
    purple: [238.4960220413437, 227.51999999999998],
    selected: [239.7931699206962, 225.34],
    reachable: [242.4335356543186, 219.62],
    unreachable: [233.9899501550528, 227.1]
  };
  var LEDGE_ANCHOR = {
    rest: [256, 134.51999999999998],
    start: [256.5, 136.8],
    ridge: [256, 147.32]
  };
  var CLIP_ANCHOR = {
    unused: [250.93821024431105, 257.67958478714485],
    installed: [254.42700170672887, 253.43368178211057],
    active: [255.21592925794187, 264.8431509848675]
  };
  var ROPE_ANCHOR = {
    short: [257.5051349085405, 250.3526269792766, 208],
    mid: [249.0906889651495, 243.717634824133, 277],
    long: [260.63638016693744, 256.01864345921376, 432]
  };
  var LIMB_DOT = { hand_l: '#e85a40', hand_r: '#c43c2c', foot_l: '#8a8a84', foot_r: '#4a4a46' };

  var el = {
    stage: document.getElementById('stage'),
    cover: document.getElementById('screen-cover'),
    play: document.getElementById('screen-play'),
    coverBg: document.getElementById('cover-bg'),
    coverActor: document.getElementById('cover-actor'),
    coverMusic: document.getElementById('cover-music'),
    start: document.getElementById('btn-start'),
    cont: document.getElementById('btn-continue'),
    scene: document.getElementById('scene'),
    haze: document.getElementById('ov-haze'),
    dusk: document.getElementById('ov-dusk'),
    wind: document.getElementById('ov-wind'),
    board: document.getElementById('board'),
    back: document.getElementById('play-back'),
    stamina: document.getElementById('stamina'),
    staminaCanvas: document.getElementById('stamina-canvas'),
    staminaNum: document.getElementById('stamina-num'),
    staminaRead: document.getElementById('stamina-read'),
    slots: document.getElementById('slots'),
    limbs: document.getElementById('limbs'),
    tools: document.getElementById('tools'),
    status: document.getElementById('status'),
    hint: document.getElementById('hint'),
    pause: document.getElementById('pause'),
    pauseCopy: document.getElementById('pause-copy'),
    result: document.getElementById('result'),
    resultTitle: document.getElementById('result-title'),
    resultCopy: document.getElementById('result-copy')
  };

  var imgs = {};
  var sheets = {};
  var assetsReady = false;
  var phase = 'cover';
  var state = null;
  var armed = 'hand_r';
  var drag = null;
  var fall = null;
  var bursts = [];
  var musicOn = true;
  var seenHint = false;
  var marks = { haze: 0, dusk: 0, wind: 0 };
  var announced = { haze: false, dusk: false, wind: false };
  var statusText = '';
  var statusUntil = 0;
  var latch = 'reach';
  var shown = 'reach';
  var coverFrame = 0;
  var coverAcc = 0;
  var lastNow = 0;
  var saveClock = 0;
  var hud = null;
  var limbScreen = {};
  var view = { w: 1, h: 1, rect: null };

  function $(id) { return document.getElementById(id); }

  function modeOf() {
    var w = el.stage.clientWidth || window.innerWidth;
    var h = el.stage.clientHeight || window.innerHeight;
    return w > h ? 'landscape' : 'portrait';
  }

  function layout() {
    return RULES.layoutOf(state ? state.mode : modeOf());
  }

  function fitScene(w, h, mode) {
    var sw = mode === 'landscape' ? 1920 : 1080;
    var sh = mode === 'landscape' ? 1080 : 1920;
    var scale = h / sh;
    var dw = sw * scale;
    return { x: (w - dw) / 2, y: 0, w: dw, h: h };
  }

  function toScreen(nx, ny) {
    var r = view.rect;
    return { x: r.x + nx * r.w, y: r.y + ny * r.h };
  }

  function fromScreen(x, y) {
    var r = view.rect;
    return [(x - r.x) / r.w, (y - r.y) / r.h];
  }

  function localPoint(e) {
    var b = el.board.getBoundingClientRect();
    return { x: e.clientX - b.left, y: e.clientY - b.top };
  }

  function readSave() {
    try {
      var raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (!data || data.v !== 1) return null;
      return data;
    } catch (err) {
      return null;
    }
  }

  function writeSave() {
    var data = {
      v: 1,
      music: musicOn,
      assist: !!(state && state.assist),
      seenHint: seenHint,
      active: phase === 'play' || phase === 'paused' || phase === 'fall' || phase === 'won',
      won: phase === 'won',
      limbs: state ? RULES.cloneLimbs(state.limbs) : null,
      stamina: state ? state.stamina : 100,
      restHold: state ? state.restHold : 0,
      installs: state ? state.installs : [null, null, null],
      usedClips: state ? state.usedClips : 0,
      moves: state ? state.moves : 0,
      marks: marks,
      announced: announced,
      armed: armed
    };
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch (err) { /* 隐私模式忽略 */ }
  }

  function applySave(data) {
    state = RULES.freshState(modeOf());
    if (!data || !data.limbs) return;
    state.limbs = data.limbs;
    state.stamina = data.stamina;
    state.restHold = data.restHold || 0;
    state.installs = data.installs || [null, null, null];
    state.usedClips = data.usedClips || 0;
    state.moves = data.moves || 0;
    state.assist = !!data.assist;
    marks = data.marks || { haze: 0, dusk: 0, wind: 0 };
    announced = data.announced || { haze: false, dusk: false, wind: false };
    armed = data.armed || 'hand_r';
    if (data.won) phase = 'won';
  }

  function refreshCover() {
    var data = readSave();
    if (data) {
      musicOn = data.music !== false;
      seenHint = !!data.seenHint;
    }
    var mid = data && data.active && !data.won && data.limbs;
    el.cont.hidden = !mid;
    el.start.textContent = mid ? '重新攀登' : (data && data.won ? '再攀一次' : '开始攀登');
    syncAudio();
  }

  function say(text, hold) {
    statusText = text;
    statusUntil = hold ? performance.now() + 2600 : 0;
    el.status.textContent = text;
  }

  function noun(limb) { return limb.indexOf('hand') === 0 ? '手' : '脚'; }

  function weatherAt(now) {
    if (!state) return { haze: 'off', dusk: 'off', wind: 'off' };
    var y = RULES.minGripY(state);
    function phase(key, limit) {
      if (y > limit) return 'off';
      if (!marks[key]) marks[key] = now || performance.now();
      return (now - marks[key] < 4500) ? 'preview' : 'on';
    }
    return { haze: phase('haze', 0.72), dusk: phase('dusk', 0.50), wind: phase('wind', 0.32) };
  }

  function noteWeather(w) {
    if (drag) return;
    if (performance.now() < statusUntil) return;
    var key = w.wind === 'on' ? 'wind' : w.dusk === 'on' ? 'dusk' : w.haze === 'on' ? 'haze' : '';
    if (!key || announced[key]) return;
    announced.haze = announced.haze || w.haze === 'on';
    announced.dusk = announced.dusk || w.dusk === 'on';
    announced.wind = announced.wind || w.wind === 'on';
    if (key === 'wind') say('风贴着岩壁吹，换手和悬挂都更费体力。', true);
    else if (key === 'dusk') say('暮色沉下来了，每次换手再多费一点体力。', true);
    else say('薄雾漫上来了，悬挂时体力掉得更快。', true);
  }

  function ambient(w) {
    if (performance.now() < statusUntil) return;
    var v = Math.round(state.stamina);
    var stance = RULES.stance(state.limbs);
    var head = stance === 'rest' ? '稳站休息台，体力恢复中。'
      : stance === 'start' ? '站在起点，体力先不恢复。'
      : stance === 'easing' ? '一脚在台上，掉得慢，仍在减少。'
      : '悬挂中，休息台才回体力。';
    var pick = armed ? '已选' + RULES.limbLabel(armed) + '。' : '';
    say(pick + head + '现在 ' + v + '。', false);
  }

  function reasonLine(reason, limb) {
    if (reason === 'last') return '至少留一处抓稳，再挪' + RULES.limbLabel(limb) + '。';
    if (reason === 'reach') return '这个落点超出固定距离。靠得再准也够不到。';
    if (reason === 'load') return '这只脚在这个抓点上站不稳。';
    if (reason === 'occupied') return '这里已经有一只手脚。';
    if (reason === 'stamina') return '够得到，这一下会把体力用尽。先去休息台。';
    if (reason === 'kind') return '这只' + noun(limb) + '不能放在这里。';
    return '这一下没有换成新落点。';
  }

  function otherGrips(limb) {
    var n = 0;
    RULES.LIMBS.forEach(function (name) {
      if (name !== limb && state.limbs[name].kind !== 'free') n += 1;
    });
    return n;
  }

  function syncAudio() {
    if (!AUDIO) return;
    AUDIO.setWanted(musicOn);
    AUDIO.gate({ hidden: document.hidden, paused: phase === 'paused', wanted: musicOn });
    el.coverMusic.setAttribute('aria-pressed', musicOn ? 'true' : 'false');
    var playMusic = $('btn-music');
    if (playMusic) playMusic.setAttribute('aria-pressed', musicOn ? 'true' : 'false');
    var pauseMusic = $('btn-pause-music');
    if (pauseMusic) pauseMusic.textContent = musicOn ? '音乐开着' : '音乐关着';
  }

  function toggleMusic() {
    if (AUDIO) AUDIO.arm();
    musicOn = AUDIO ? AUDIO.toggle() : !musicOn;
    syncAudio();
    writeSave();
  }

  function armAudio() {
    if (AUDIO) AUDIO.arm();
    syncAudio();
  }

  function loadImage(url) {
    return new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { resolve(null); };
      img.src = url;
    });
  }

  function ensureClip(name) {
    if (sheets[name]) return;
    var meta = CLIPS[name];
    var img = new Image();
    var still = REDUCE;
    img.onerror = function () {
      if (still) return;
      still = true;
      img.src = meta.still;
    };
    img.src = still ? meta.still : meta.src;
    sheets[name] = { img: img, meta: meta, still: function () { return still; } };
  }

  function loadPlayAssets() {
    if (assetsReady) return Promise.resolve();
    var files = {
      'hold-red': 'assets/props/b27-hold-red.png',
      'hold-green': 'assets/props/b27-hold-green.png',
      'hold-blue': 'assets/props/b27-hold-blue.png',
      'hold-purple': 'assets/props/b27-hold-purple.png',
      'hold-selected': 'assets/props/b27-hold-selected.png',
      'hold-reachable': 'assets/props/b27-hold-reachable.png',
      'hold-unreachable': 'assets/props/b27-hold-unreachable.png',
      'ledge-rest': 'assets/props/b27-ledge-rest.png',
      'ledge-start': 'assets/props/b27-ledge-start.png',
      'ledge-ridge': 'assets/props/b27-ledge-ridge.png',
      'clip-unused': 'assets/props/b27-carabiner-unused.png',
      'clip-installed': 'assets/props/b27-carabiner-installed.png',
      'clip-active': 'assets/props/b27-carabiner-active.png',
      'rope-short': 'assets/props/b27-rope-short.png',
      'rope-mid': 'assets/props/b27-rope-mid.png',
      'rope-long': 'assets/props/b27-rope-long.png',
      ring: 'assets/props/b27-ring-unreachable.png',
      'climber-default': 'assets/props/b27-climber-default.png',
      'climber-reach': 'assets/props/b27-climber-reach.png',
      'climber-hang': 'assets/props/b27-climber-hang.png',
      'climber-stand': 'assets/props/b27-climber-stand.png',
      'stamina-full': 'assets/ui/b27-ui-stamina-fill-full.png',
      'stamina-mid': 'assets/ui/b27-ui-stamina-fill-mid.png',
      'stamina-low': 'assets/ui/b27-ui-stamina-fill-low.png',
      'stamina-frame': 'assets/ui/b27-ui-stamina-frame.png',
      'limb-hand-l': 'assets/ui/b27-ui-limb-hand-l.png',
      'limb-hand-l-on': 'assets/ui/b27-ui-limb-hand-l-selected.png',
      'limb-hand-r': 'assets/ui/b27-ui-limb-hand-r.png',
      'limb-hand-r-on': 'assets/ui/b27-ui-limb-hand-r-selected.png',
      'limb-foot-l': 'assets/ui/b27-ui-limb-foot-l.png',
      'limb-foot-l-on': 'assets/ui/b27-ui-limb-foot-l-selected.png',
      'limb-foot-r': 'assets/ui/b27-ui-limb-foot-r.png',
      'limb-foot-r-on': 'assets/ui/b27-ui-limb-foot-r-selected.png',
      'slot-empty': 'assets/ui/b27-ui-slot-empty.png',
      'slot-filled': 'assets/ui/b27-ui-slot-filled.png',
      'icon-assist': 'assets/ui/b27-ui-icon-assist.png',
      'icon-pause': 'assets/ui/b27-ui-icon-pause.png'
    };
    var jobs = Object.keys(files).map(function (key) {
      return loadImage(files[key]).then(function (img) { if (img) imgs[key] = img; });
    });
    ['slip', 'catch', 'summit', 'chalk'].forEach(function (name) {
      for (var i = 0; i < 8; i++) {
        (function (frame) {
          var key = name + '-' + frame;
          var url = 'assets/fx/b27-fx-' + name + '-' + (frame < 10 ? '0' : '') + frame + '.png';
          jobs.push(loadImage(url).then(function (img) { if (img) imgs[key] = img; }));
        })(i);
      }
    });
    return Promise.all(jobs).then(function () {
      assetsReady = true;
      paintUiImages();
    });
  }

  function paintUiImages() {
    document.querySelectorAll('[data-art]').forEach(function (node) {
      var key = node.getAttribute('data-art');
      if (imgs[key]) node.src = imgs[key].src;
    });
  }

  function setSceneSources() {
    var land = state && state.mode === 'landscape';
    el.scene.src = land ? 'assets/scene/b27-scene-landscape.webp' : 'assets/scene/b27-scene-portrait.webp';
    el.haze.src = land ? 'assets/overlays/b27-overlay-haze-landscape.webp' : 'assets/overlays/b27-overlay-haze-portrait.webp';
    el.dusk.src = land ? 'assets/overlays/b27-overlay-dusk-landscape.webp' : 'assets/overlays/b27-overlay-dusk-portrait.webp';
    el.wind.src = land ? 'assets/overlays/b27-overlay-wind-landscape.webp' : 'assets/overlays/b27-overlay-wind-portrait.webp';
  }

  function place(node, x, y, w, h) {
    node.style.left = Math.round(x) + 'px';
    node.style.top = Math.round(y) + 'px';
    if (w != null) node.style.width = Math.round(w) + 'px';
    if (h != null) node.style.height = Math.round(h) + 'px';
  }

  function layoutHud() {
    var w = el.stage.clientWidth;
    var h = el.stage.clientHeight;
    var mode = state ? state.mode : modeOf();
    var rect = fitScene(w, h, mode);
    view.w = w;
    view.h = h;
    view.rect = rect;
    [el.scene, el.haze, el.dusk, el.wind].forEach(function (node) {
      place(node, rect.x, rect.y, rect.w, rect.h);
    });
    var left = Math.max(w * 0.10, rect.x > 0 ? rect.x + 8 : w * 0.10);
    var right = Math.min(w * 0.90, rect.x + rect.w - 8);
    var btn = 48;
    var gap = 8;
    var land = mode === 'landscape';
    if (!land) {
      var slotsW = btn * 3 + gap * 2;
      var staminaSize = Math.min(h * 0.115, right - left - slotsW - btn - gap * 2);
      staminaSize = Math.max(76, staminaSize);
      var slotX = right - slotsW;
      var topY = Math.max(8, h * 0.02);
      place(el.stamina, left, topY, staminaSize, staminaSize);
      place(el.slots, slotX, topY + Math.max(0, (staminaSize - btn) / 2), slotsW, btn);
      var gapX0 = left + staminaSize + gap;
      var gapX1 = slotX - gap;
      var music = $('btn-music');
      var assist = $('btn-assist');
      var pauseBtn = $('btn-pause');
      if (gapX1 - gapX0 >= btn) place(music, gapX0 + (gapX1 - gapX0 - btn) / 2, topY + (staminaSize - btn) / 2, btn, btn);
      place(el.back, left, topY + staminaSize + 6, null, 44);
      el.back.style.width = 'auto';
      var limbY = h - 10 - btn;
      var limbsW = btn * 4 + gap * 3;
      place(el.limbs, left, limbY, limbsW, btn);
      el.limbs.style.flexWrap = 'nowrap';
      var toolX = right - btn;
      place(pauseBtn, toolX, limbY, btn, btn);
      place(assist, toolX, limbY - btn - gap, btn, btn);
      if (gapX1 - gapX0 < btn) place(music, toolX, limbY - (btn + gap) * 2, btn, btn);
      place(el.status, left, limbY - 46, limbsW, null);
    } else {
      var colW = Math.min(300, Math.max(220, (right - left) * 0.34));
      var colX = right - colW;
      var limbBlock = btn * 2 + gap;
      var top = Math.max(16, h * 0.04);
      var arc = Math.min(120, colW);
      var afterArc = 8;
      var statusReserve = 92;
      var afterLimbs = 12;
      var afterSlots = 12;
      var stack = top + arc + afterArc + statusReserve + limbBlock + afterLimbs + btn + afterSlots + btn;
      if (stack > h - 8) {
        top = 8;
        afterArc = 6;
        statusReserve = 54;
        afterLimbs = 6;
        afterSlots = 6;
        var fixed = top + afterArc + statusReserve + limbBlock + afterLimbs + btn + afterSlots + btn;
        arc = Math.max(72, Math.min(arc, h - 8 - fixed));
      }
      var y = top;
      place(el.stamina, colX, y, arc, arc);
      y += arc + afterArc;
      place(el.status, colX, y, colW, null);
      y += statusReserve;
      place(el.limbs, colX, y, limbBlock, limbBlock);
      el.limbs.style.flexWrap = 'wrap';
      y += limbBlock + afterLimbs;
      place(el.slots, colX, y, btn * 3 + gap * 2, btn);
      y += btn + afterSlots;
      place($('btn-assist'), colX, y, btn, btn);
      place($('btn-pause'), colX + btn + gap, y, btn, btn);
      place($('btn-music'), colX + (btn + gap) * 2, y, btn, btn);
      place(el.back, left, 16, null, 44);
      el.back.style.width = 'auto';
    }
    hud = { left: left, right: right, btn: btn };
    resizeBoard();
  }

  function resizeBoard() {
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    [el.board, el.coverActor].forEach(function (canvas) {
      var w = canvas.clientWidth || view.w;
      var h = canvas.clientHeight || view.h;
      var pw = Math.round(w * dpr);
      var ph = Math.round(h * dpr);
      if (canvas.width !== pw || canvas.height !== ph) {
        canvas.width = pw;
        canvas.height = ph;
      }
    });
    var box = el.stamina.getBoundingClientRect();
    var sd = Math.min(2, window.devicePixelRatio || 1);
    var sw = Math.max(64, Math.round(box.width * sd));
    if (el.staminaCanvas.width !== sw) {
      el.staminaCanvas.width = sw;
      el.staminaCanvas.height = sw;
    }
  }

  function ctx2d(canvas) {
    var ctx = canvas.getContext('2d');
    var dpr = canvas.width / (canvas.clientWidth || view.w || 1);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return ctx;
  }

  function burst(name, point) {
    bursts.push({ name: name, point: point.slice(), t: 0 });
  }

  function drawCover(dt) {
    if (el.cover.hidden) return;
    ensureClip(shown);
    var pack = sheets[shown];
    if (!pack || !pack.img.naturalWidth) return;
    var ctx = ctx2d(el.coverActor);
    var w = el.coverActor.clientWidth;
    var h = el.coverActor.clientHeight;
    ctx.clearRect(0, 0, w, h);
    var meta = pack.meta;
    var land = modeOf() === 'landscape';
    var iw = land ? 1920 : 1080;
    var ih = land ? 1080 : 1440;
    var scale = Math.max(w / iw, h / ih);
    var dw = iw * scale;
    var dh = ih * scale;
    var dx = (w - dw) / 2;
    var dy = (h - dh) / 2;
    var anchor = land ? [0.22, 0.70] : [0.34, 0.74];
    var destH = Math.min(h * (land ? 0.62 : 0.46), w * 0.78);
    var fs = destH / meta.fh;
    if (!REDUCE && !pack.still()) {
      coverAcc += dt;
      var step = 1 / 12;
      while (coverAcc >= step) {
        coverAcc -= step;
        coverFrame = (coverFrame + 1) % 24;
      }
    }
    var frame = REDUCE || pack.still() ? 0 : coverFrame;
    var col = frame % 6;
    var row = Math.floor(frame / 6);
    var destX = dx + anchor[0] * dw;
    var destY = dy + anchor[1] * dh;
    if (REDUCE || pack.still()) {
      ctx.drawImage(pack.img, destX - meta.ax * fs, destY - meta.ay * fs, meta.fw * fs, meta.fh * fs);
    } else {
      ctx.drawImage(pack.img, col * meta.fw, row * meta.fh, meta.fw, meta.fh, destX - meta.ax * fs, destY - meta.ay * fs, meta.fw * fs, meta.fh * fs);
    }
  }

  function blit(ctx, img, ax, ay, world, size) {
    if (!img || !world) return;
    var p = toScreen(world[0], world[1]);
    var scale = size / img.width;
    ctx.drawImage(img, p.x - ax * scale, p.y - ay * scale, img.width * scale, img.height * scale);
  }

  function holdKey(id, klass) {
    if (klass === 'selected' || klass === 'current') return 'hold-selected';
    if (klass === 'reachable') return 'hold-reachable';
    if (klass === 'far' || klass === 'weak') return 'hold-unreachable';
    return 'hold-' + RULES.HOLD_COLOR[id % 4];
  }

  function anchorForHold(key) {
    if (key === 'hold-selected') return HOLD_ANCHOR.selected;
    if (key === 'hold-reachable') return HOLD_ANCHOR.reachable;
    if (key === 'hold-unreachable') return HOLD_ANCHOR.unreachable;
    return HOLD_ANCHOR[key.slice(5)];
  }

  function drawRope(ctx, a, b, kind) {
    var pa = toScreen(a[0], a[1]);
    var pb = toScreen(b[0], b[1]);
    var img = imgs['rope-' + kind];
    var spec = ROPE_ANCHOR[kind];
    if (!img) return;
    var distPx = Math.hypot(pb.x - pa.x, pb.y - pa.y);
    var scale = Math.max(0.16, Math.min(0.34, view.h * 0.00028));
    var len = spec[2] * scale;
    var n = Math.max(1, Math.round(distPx / Math.max(24, len)));
    var ang = Math.atan2(pb.y - pa.y, pb.x - pa.x);
    for (var i = 0; i < n; i++) {
      var t = (i + 0.5) / n;
      ctx.save();
      ctx.translate(pa.x + (pb.x - pa.x) * t, pa.y + (pb.y - pa.y) * t);
      ctx.rotate(ang);
      ctx.drawImage(img, -spec[0] * scale, -spec[1] * scale, img.width * scale, img.height * scale);
      ctx.restore();
    }
  }

  function climberTransform(poseName, dragLimb, dragWorld) {
    var pose = POSES[poseName];
    var lay = layout();
    var pairs = [];
    RULES.LIMBS.forEach(function (name) {
      var world = null;
      if (dragLimb === name && dragWorld) world = dragWorld;
      else world = RULES.pointOf(lay, state.limbs[name]);
      if (!world) return;
      pairs.push({ name: name, ax: pose[name][0], ay: pose[name][1], world: world });
    });
    if (!pairs.length) return null;
    var ax = 0;
    var ay = 0;
    var wx = 0;
    var wy = 0;
    pairs.forEach(function (p) { ax += p.ax; ay += p.ay; wx += p.world[0]; wy += p.world[1]; });
    ax /= pairs.length;
    ay /= pairs.length;
    wx /= pairs.length;
    wy /= pairs.length;
    var screen = toScreen(wx, wy);
    var size = Math.max(170, Math.min(view.h * 0.28, 320));
    var scale = size / 512;
    return {
      pose: pose,
      poseName: poseName,
      x: screen.x - ax * scale,
      y: screen.y - ay * scale,
      scale: scale,
      size: size
    };
  }

  function gripWorld(name) {
    return RULES.pointOf(layout(), state.limbs[name]);
  }

  function drawPlay(now) {
    if (el.play.hidden || !view.rect) return;
    var ctx = ctx2d(el.board);
    ctx.clearRect(0, 0, view.w, view.h);
    var lay = layout();
    var wth = weatherAt(now);
    var holdPx = Math.max(64, Math.min(view.h * 0.078, 96));
    var ledgePx = Math.max(120, Math.min(view.h * 0.16, 200));
    var clipPx = Math.max(108, Math.min(view.h * 0.13, 150));
    var showClass = armed && (phase === 'play' || phase === 'fall');
    var snap = null;
    if (drag && drag.moved && drag.norm) snap = RULES.snapTarget(state, drag.limb, drag.norm, wth);

    [['start', lay.start, 'ledge-start'], ['rest', lay.rests[0], 'ledge-rest'], ['rest', lay.rests[1], 'ledge-rest'], ['ridge', lay.ridge, 'ledge-ridge']].forEach(function (item) {
      var key = item[0] === 'ridge' ? 'ridge' : item[0] === 'start' ? 'start' : 'rest';
      blit(ctx, imgs[item[2]], LEDGE_ANCHOR[key][0], LEDGE_ANCHOR[key][1], item[1], ledgePx);
    });

    var clipIndex = state ? RULES.nearestClip(state) : -1;
    if (clipIndex >= 0) drawRope(ctx, lay.installs[clipIndex], RULES.torso(lay, state.limbs), ropeKind(lay.installs[clipIndex], RULES.torso(lay, state.limbs)));

    lay.installs.forEach(function (p, i) {
      var placed = state.installs[i];
      var key = !placed ? 'unused' : i === clipIndex ? 'active' : 'installed';
      var pulse = !placed && RULES.canInstall(state, i) ? 1 + 0.07 * Math.sin(now / 180) : 1;
      blit(ctx, imgs['clip-' + key], CLIP_ANCHOR[key][0], CLIP_ANCHOR[key][1], p, clipPx * pulse);
    });

    lay.holds.forEach(function (p, id) {
      var klass = 'idle';
      if (showClass) klass = RULES.holdClass(state, armed, id, wth);
      if (snap && snap.kind === 'hold' && snap.id === id) klass = 'selected';
      if (klass === 'far') blit(ctx, imgs.ring, 256, 256, p, holdPx * 1.65);
      var key = holdKey(id, klass);
      var anchor = anchorForHold(key);
      ctx.save();
      if (klass === 'tired') ctx.globalAlpha = 0.55;
      if (klass === 'busy') ctx.globalAlpha = 0.8;
      blit(ctx, imgs[key], anchor[0], anchor[1], p, holdPx);
      ctx.restore();
    });

    if (showClass) {
      var ridgeTry = RULES.evaluate(state, armed, { kind: 'ridge' }, wth);
      if (ridgeTry.ok || (snap && snap.kind === 'ridge')) {
        var rp = toScreen(lay.ridge[0], lay.ridge[1]);
        ctx.beginPath();
        ctx.arc(rp.x, rp.y, 18, 0, Math.PI * 2);
        ctx.strokeStyle = '#e0b15a';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    }

    var dragWorld = null;
    if (drag && drag.moved && drag.norm) {
      dragWorld = snap ? snap.point : clampReach(drag.limb, drag.norm);
      var from = gripWorld(drag.limb) || RULES.torso(lay, state.limbs);
      var a = toScreen(from[0], from[1]);
      var b = toScreen(dragWorld[0], dragWorld[1]);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = 'rgba(244, 241, 234, 0.9)';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    var pose = RULES.poseName(state.limbs, drag && drag.moved ? drag.limb : null);
    if (phase === 'fall' && fall && !fall.applied) pose = 'hang';
    var placed = climberTransform(pose, drag && drag.moved ? drag.limb : null, dragWorld);
    limbScreen = {};
    if (placed) {
      var body = imgs['climber-' + placed.poseName];
      if (body) ctx.drawImage(body, placed.x, placed.y, placed.size, placed.size);
      RULES.LIMBS.forEach(function (name) {
        limbScreen[name] = {
          x: placed.x + placed.pose[name][0] * placed.scale,
          y: placed.y + placed.pose[name][1] * placed.scale
        };
      });
    }

    RULES.LIMBS.forEach(function (name) {
      var world = gripWorld(name);
      if (!world) return;
      var p = toScreen(world[0], world[1]);
      ctx.beginPath();
      ctx.arc(p.x, p.y, name === armed ? 11 : 7, 0, Math.PI * 2);
      ctx.fillStyle = LIMB_DOT[name];
      ctx.fill();
      if (name === armed) {
        ctx.strokeStyle = '#e0b15a';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    });

    bursts = bursts.filter(function (fx) {
      fx.t += 1 / 12;
      var frame = Math.min(7, Math.floor(fx.t * 12));
      var img = imgs[fx.name + '-' + frame];
      if (img) blit(ctx, img, 256, 256, fx.point, Math.max(96, view.h * 0.14));
      return fx.t < 0.7;
    });

    drawStamina();
    paintSlots(clipIndex);
    paintLimbs();
    var alpha = {
      haze: overlayAlpha(wth.haze, now),
      dusk: overlayAlpha(wth.dusk, now),
      wind: overlayAlpha(wth.wind, now)
    };
    el.haze.style.opacity = String(alpha.haze);
    el.dusk.style.opacity = String(alpha.dusk);
    el.wind.style.opacity = String(alpha.wind);
  }

  function ropeKind(a, b) {
    var gap = RULES.dist(a, b, state.mode);
    if (gap < 0.12) return 'short';
    if (gap < 0.2) return 'mid';
    return 'long';
  }

  function clampReach(limb, pointer) {
    var lay = layout();
    var pts = [];
    RULES.LIMBS.forEach(function (name) {
      if (name === limb) return;
      var p = RULES.pointOf(lay, state.limbs[name]);
      if (p) pts.push(p);
    });
    if (!pts.length) return pointer;
    var ox = 0;
    var oy = 0;
    pts.forEach(function (p) { ox += p[0]; oy += p[1]; });
    ox /= pts.length;
    oy /= pts.length;
    var origin = [ox, oy];
    var gap = RULES.dist(origin, pointer, state.mode);
    var limit = RULES.reachLimit(limb);
    if (gap <= limit || gap < 1e-4) return pointer;
    var t = limit / gap;
    return [origin[0] + (pointer[0] - origin[0]) * t, origin[1] + (pointer[1] - origin[1]) * t];
  }

  function overlayAlpha(level, now) {
    if (level === 'off') return 0;
    if (level === 'preview') return 0.2 + 0.16 * (0.5 + 0.5 * Math.sin(now / 280));
    return 0.46;
  }

  function drawStamina() {
    var canvas = el.staminaCanvas;
    var ctx = canvas.getContext('2d');
    var s = canvas.width;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, s, s);
    var t = state ? Math.max(0, Math.min(1, state.stamina / 100)) : 0;
    var fill = t > 0.66 ? imgs['stamina-full'] : t > 0.33 ? imgs['stamina-mid'] : imgs['stamina-low'];
    var a0 = Math.PI * 0.78;
    var sweep = Math.PI * 1.28;
    if (fill && t > 0.01) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(s / 2, s / 2);
      ctx.arc(s / 2, s / 2, s * 0.5, a0, a0 + sweep * t, false);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(fill, 0, 0, s, s);
      ctx.restore();
    }
    if (imgs['stamina-frame']) ctx.drawImage(imgs['stamina-frame'], 0, 0, s, s);
    var n = state ? Math.round(state.stamina) : 0;
    el.staminaNum.textContent = String(n);
    var band = n >= 70 ? '体力还够' : n >= 40 ? '体力过半' : '体力见底';
    el.staminaRead.textContent = band + ' ' + n;
  }

  function paintSlots(active) {
    var buttons = el.slots.querySelectorAll('.slot');
    buttons.forEach(function (button, i) {
      var on = !!(state && state.installs[i]);
      var img = button.querySelector('img');
      var art = on ? imgs['slot-filled'] : imgs['slot-empty'];
      if (img && art) img.src = art.src;
      button.classList.toggle('on', i === active);
      button.setAttribute('aria-label', on ? '绳扣已装上' : '绳扣还空着');
    });
  }

  function paintLimbs() {
    el.limbs.querySelectorAll('.limb').forEach(function (button) {
      var name = button.getAttribute('data-limb');
      var on = name === armed;
      button.setAttribute('aria-pressed', on ? 'true' : 'false');
      var img = button.querySelector('img');
      var art = imgs['limb-' + name.replace('_', '-') + (on ? '-on' : '')];
      if (img && art) img.src = art.src;
    });
    var assist = $('btn-assist');
    if (assist) {
      assist.setAttribute('aria-pressed', state && state.assist ? 'true' : 'false');
      assist.classList.toggle('on', !!(state && state.assist));
    }
  }

  function playing() {
    return phase === 'play' && el.hint.hidden && el.pause.hidden && el.result.hidden;
  }

  function nearestExplain(norm, limb, wth) {
    var lay = layout();
    var best = null;
    var bestD = 0.075;
    lay.holds.forEach(function (p, id) {
      var d = RULES.dist(norm, p, state.mode);
      if (d < bestD) {
        bestD = d;
        best = RULES.holdClass(state, limb, id, wth);
      }
    });
    if (!best) return '松在了空处，这只' + noun(limb) + '还留在原地。';
    if (best === 'far') return '这个抓点超出固定距离。靠得再准也够不到。';
    if (best === 'weak') return '这只脚在这个抓点上站不稳。';
    if (best === 'busy') return '这里已经有一只手脚。';
    if (best === 'tired') return '够得到，可是这一下会把体力用尽。先去休息台，或换近一点的。';
    if (best === 'locked') return '至少留一处抓稳，再挪这只手脚。';
    return '松在了空处，这只' + noun(limb) + '还留在原地。';
  }

  function farFromWall(norm) {
    var lay = layout();
    var best = Infinity;
    lay.holds.forEach(function (p) { best = Math.min(best, RULES.dist(norm, p, state.mode)); });
    lay.rests.forEach(function (p) { best = Math.min(best, RULES.dist(norm, p, state.mode)); });
    best = Math.min(best, RULES.dist(norm, lay.ridge, state.mode));
    best = Math.min(best, RULES.dist(norm, lay.start, state.mode));
    return best > 0.075;
  }

  function commitDrag(info) {
    var wth = weatherAt(performance.now());
    var snap = RULES.snapTarget(state, info.limb, info.norm, wth);
    if (!snap) {
      var held = state.limbs[info.limb] && state.limbs[info.limb].kind !== 'free';
      if (held && info.norm && farFromWall(info.norm)) {
        var released = RULES.applyMove(state, info.limb, { kind: 'free' });
        if (released.ok) {
          say(RULES.limbLabel(info.limb) + '松开了。这一处放开，还留着别的抓点。现在 ' + Math.round(state.stamina) + '。', true);
          writeSave();
          return;
        }
        if (released.reason === 'stamina') {
          say('松开这一下会把体力用尽。这只' + noun(info.limb) + '先留在原地。', true);
          return;
        }
        say(reasonLine(released.reason, info.limb), true);
        return;
      }
      say(nearestExplain(info.norm, info.limb, wth), true);
      return;
    }
    var verdict = RULES.applyMove(state, info.limb, { kind: snap.kind, id: snap.id });
    if (!verdict.ok) {
      say(reasonLine(verdict.reason, info.limb), true);
      return;
    }
    if (snap.kind === 'hold' && snap.point) burst('chalk', snap.point);
    if (snap.kind === 'ridge') {
      win();
      return;
    }
    var name = RULES.limbLabel(info.limb);
    var v = Math.round(state.stamina);
    if (RULES.stableRest(state.limbs)) say(name + '站上休息台，体力会恢复。现在 ' + v + '。', true);
    else if (snap.kind === 'ledge' && snap.id === 'start') say(name + '回到起点。这里站得住，体力先不恢复。', true);
    else say(name + '换到新落点。连续换位消耗体力，现在 ' + v + '。', true);
    writeSave();
  }

  function tryInstall(index) {
    if (!playing()) return;
    if (state.installs[index]) {
      say('这枚绳扣已经装上，失足时可以回到这里。', true);
      return;
    }
    if (!RULES.canInstall(state, index)) {
      say('先爬到这个扣位旁边，再装绳扣。', true);
      return;
    }
    RULES.placeInstall(state, index);
    burst('chalk', layout().installs[index]);
    say('绳扣装好了。失足会回到最近的这一处。少装只是挑战。', true);
    writeSave();
  }

  function beginPointer(kind, payload, e) {
    if (e.button != null && e.button !== 0) return;
    armAudio();
    drag = {
      kind: kind,
      limb: payload.limb || armed,
      index: payload.index,
      x: payload.x,
      y: payload.y,
      norm: payload.norm,
      moved: false,
      pointer: e.pointerId
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  }

  function onMove(e) {
    if (!drag || e.pointerId !== drag.pointer) return;
    var p = localPoint(e);
    if (Math.hypot(p.x - drag.x, p.y - drag.y) > 12) drag.moved = true;
    drag.norm = fromScreen(p.x, p.y);
  }

  function onUp(e) {
    if (!drag || (e && e.pointerId != null && e.pointerId !== drag.pointer)) return;
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onUp);
    var info = drag;
    drag = null;
    if (!playing()) return;
    if (info.kind === 'limb') {
      armed = info.limb;
      if (!info.moved) {
        say('已选' + RULES.limbLabel(info.limb) + '。拖到亮着的抓点，松手抓住。', true);
        return;
      }
      commitDrag(info);
      return;
    }
    if (info.kind === 'clip' && !info.moved) tryInstall(info.index);
  }

  function onLimbDown(e) {
    if (!playing()) return;
    if (e.target.closest('a')) return;
    e.preventDefault();
    var limb = e.currentTarget.getAttribute('data-limb');
    if (otherGrips(limb) < 1) {
      say('至少留一处抓稳，再挪' + RULES.limbLabel(limb) + '。', true);
      return;
    }
    var p = localPoint(e);
    beginPointer('limb', { limb: limb, x: p.x, y: p.y, norm: fromScreen(p.x, p.y) }, e);
  }

  function onBoardDown(e) {
    if (!playing()) return;
    if (e.target.closest && e.target.closest('button, a')) return;
    e.preventDefault();
    var p = localPoint(e);
    var norm = fromScreen(p.x, p.y);
    var limb = hitLimb(p);
    if (limb) {
      if (otherGrips(limb) < 1) {
        say('至少留一处抓稳，再挪' + RULES.limbLabel(limb) + '。', true);
        return;
      }
      beginPointer('limb', { limb: limb, x: p.x, y: p.y, norm: norm }, e);
      return;
    }
    var clip = hitInstall(norm);
    if (clip >= 0) {
      beginPointer('clip', { index: clip, x: p.x, y: p.y, norm: norm }, e);
      return;
    }
    if (armed && nearGripTarget(norm)) beginPointer('limb', { limb: armed, x: p.x, y: p.y, norm: norm }, e);
  }

  function hitLimb(p) {
    var best = null;
    var bestD = 26;
    RULES.LIMBS.forEach(function (name) {
      var spot = limbScreen[name];
      if (spot) {
        var d = Math.hypot(p.x - spot.x, p.y - spot.y);
        if (d < bestD) { bestD = d; best = name; }
      }
      var world = gripWorld(name);
      if (world && view.rect) {
        var g = toScreen(world[0], world[1]);
        var d2 = Math.hypot(p.x - g.x, p.y - g.y);
        if (d2 < bestD) { bestD = d2; best = name; }
      }
    });
    return best;
  }

  function nearGripTarget(norm) {
    var lay = layout();
    var best = 1;
    lay.holds.forEach(function (p) { best = Math.min(best, RULES.dist(norm, p, state.mode)); });
    lay.rests.forEach(function (p) { best = Math.min(best, RULES.dist(norm, p, state.mode)); });
    best = Math.min(best, RULES.dist(norm, lay.ridge, state.mode));
    best = Math.min(best, RULES.dist(norm, lay.start, state.mode));
    return best <= 0.08;
  }

  function hitInstall(norm) {
    var lay = layout();
    var best = -1;
    var bestD = 0.055;
    lay.installs.forEach(function (p, i) {
      var d = RULES.dist(norm, p, state.mode);
      if (d < bestD) { bestD = d; best = i; }
    });
    return best;
  }

  function startFall() {
    phase = 'fall';
    fall = { t: 0, applied: false };
    burst('slip', RULES.torso(layout(), state.limbs));
    say('失足了。', true);
  }

  function stepFall(dt) {
    if (!fall) return;
    fall.t += dt;
    var lock = state.assist ? 0.42 : 0.82;
    if (!fall.applied && fall.t > lock * 0.42) {
      var info = RULES.applyFall(state);
      fall.applied = true;
      var lay = layout();
      var at = info.where === 'clip' ? lay.installs[info.index] : lay.start;
      burst('catch', at);
      if (info.where === 'start') {
        marks = { haze: 0, dusk: 0, wind: 0 };
        announced = { haze: false, dusk: false, wind: false };
      }
      var tail = state.assist ? '辅助少扣了一些。' : '';
      say(info.where === 'clip'
        ? '最近的绳扣接住了你。还剩体力 ' + Math.round(state.stamina) + '。' + tail
        : '没有可用绳扣，回到了起点。还剩体力 ' + Math.round(state.stamina) + '。' + tail, true);
      writeSave();
    }
    if (fall.t >= lock) {
      phase = 'play';
      fall = null;
    }
  }

  function win() {
    phase = 'won';
    burst('summit', layout().ridge);
    el.resultTitle.textContent = '到山脊了';
    el.resultCopy.textContent = '这一程用了 ' + state.usedClips + ' 枚绳扣。少装几枚是额外挑战，攀到山脊就已经成功。';
    el.result.hidden = false;
    writeSave();
    syncAudio();
  }

  function openPause() {
    if (phase !== 'play') return;
    phase = 'paused';
    el.pause.hidden = false;
    el.pauseCopy.textContent = '体力先停住。' + (state.assist ? '辅助开着，失足少扣体力。' : '辅助关着。');
    $('btn-pause-assist').textContent = state.assist ? '辅助开着' : '辅助关着';
    syncAudio();
    writeSave();
  }

  function closePause() {
    if (phase !== 'paused') return;
    phase = 'play';
    el.pause.hidden = true;
    syncAudio();
  }

  function toggleAssist() {
    state.assist = !state.assist;
    say(state.assist ? '辅助开着。失足时少扣一些体力。' : '辅助关着。失足会多扣一些体力。', true);
    if (!el.pause.hidden) {
      el.pauseCopy.textContent = '体力先停住。' + (state.assist ? '辅助开着，失足少扣体力。' : '辅助关着。');
      $('btn-pause-assist').textContent = state.assist ? '辅助开着' : '辅助关着';
    }
    writeSave();
  }

  function restart() {
    var assist = state ? state.assist : false;
    state = RULES.freshState(modeOf());
    state.assist = assist;
    marks = { haze: 0, dusk: 0, wind: 0 };
    announced = { haze: false, dusk: false, wind: false };
    armed = 'hand_r';
    phase = 'play';
    fall = null;
    drag = null;
    el.result.hidden = true;
    el.pause.hidden = true;
    say('回到起点。已选右手。亮点够得到，灰点超出固定距离。', true);
    syncAudio();
    writeSave();
  }

  function enterPlay(fromSave) {
    armAudio();
    el.cover.hidden = true;
    el.play.hidden = false;
    phase = 'loading';
    say('岩壁正在铺开。', false);
    document.documentElement.classList.toggle('land', modeOf() === 'landscape');
    loadPlayAssets().then(function () {
      if (fromSave) {
        var data = readSave();
        applySave(data);
        if (data && data.assist) state.assist = true;
      } else {
        var assist = state ? state.assist : !!(readSave() && readSave().assist);
        state = RULES.freshState(modeOf());
        state.assist = assist;
        armed = 'hand_r';
        marks = { haze: 0, dusk: 0, wind: 0 };
        announced = { haze: false, dusk: false, wind: false };
      }
      state.mode = modeOf();
      setSceneSources();
      layoutHud();
      phase = state && phase === 'won' ? 'won' : 'play';
      if (phase === 'won') {
        el.resultTitle.textContent = '到山脊了';
        el.resultCopy.textContent = '这一程用了 ' + state.usedClips + ' 枚绳扣。少装几枚是额外挑战，攀到山脊就已经成功。';
        el.result.hidden = false;
      } else if (!seenHint) {
        el.hint.hidden = false;
      } else {
        say('已选右手。亮着的抓点够得到，灰色的超出固定距离。', true);
      }
      writeSave();
    });
  }

  function loop(now) {
    var dt = lastNow ? Math.min(0.05, (now - lastNow) / 1000) : 0;
    lastNow = now;
    if (document.hidden) dt = 0;
    if (!el.cover.hidden) drawCover(dt);
    if (state && !el.play.hidden && phase !== 'loading') {
      if (state.mode !== modeOf()) {
        state.mode = modeOf();
        document.documentElement.classList.toggle('land', state.mode === 'landscape');
        setSceneSources();
        layoutHud();
      }
      if (playing()) {
        var wth = weatherAt(now);
        var tick = RULES.tick(state, dt, wth);
        if (tick.fell) startFall();
        else noteWeather(wth);
        if (!drag && phase === 'play') ambient(wth);
        saveClock += dt;
        if (saveClock > 2) { saveClock = 0; writeSave(); }
      } else if (phase === 'fall') {
        stepFall(dt);
      }
      drawPlay(now);
    }
    requestAnimationFrame(loop);
  }

  function buildControls() {
    var limbs = [
      ['hand_l', '左手', 'limb-hand-l'],
      ['hand_r', '右手', 'limb-hand-r'],
      ['foot_l', '左脚', 'limb-foot-l'],
      ['foot_r', '右脚', 'limb-foot-r']
    ];
    limbs.forEach(function (item) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'limb';
      button.setAttribute('data-limb', item[0]);
      button.setAttribute('aria-label', item[1]);
      button.setAttribute('aria-pressed', 'false');
      var img = document.createElement('img');
      img.alt = '';
      img.setAttribute('data-art', item[2]);
      button.appendChild(img);
      button.addEventListener('pointerdown', onLimbDown);
      el.limbs.appendChild(button);
    });
    for (var i = 0; i < 3; i++) {
      var slot = document.createElement('button');
      slot.type = 'button';
      slot.className = 'slot';
      slot.setAttribute('aria-label', '绳扣还空着');
      var simg = document.createElement('img');
      simg.alt = '';
      simg.setAttribute('data-art', 'slot-empty');
      slot.appendChild(simg);
      (function (index) {
        slot.addEventListener('click', function () {
          armAudio();
          tryInstall(index);
        });
      })(i);
      el.slots.appendChild(slot);
    }
    function tool(id, label, art, text) {
      var button = document.createElement('button');
      button.type = 'button';
      button.id = id;
      button.className = 'iconbtn';
      button.setAttribute('aria-label', label);
      if (art) {
        var img = document.createElement('img');
        img.alt = '';
        img.setAttribute('data-art', art);
        button.appendChild(img);
      } else {
        button.textContent = text;
      }
      el.tools.appendChild(button);
      return button;
    }
    tool('btn-assist', '辅助', 'icon-assist').addEventListener('click', function () {
      if (phase !== 'play' && phase !== 'paused') return;
      armAudio();
      toggleAssist();
    });
    tool('btn-pause', '暂停', 'icon-pause').addEventListener('click', function () {
      if (phase !== 'play') return;
      armAudio();
      openPause();
    });
    var music = tool('btn-music', '音乐', '', '乐');
    music.setAttribute('aria-pressed', 'true');
    music.addEventListener('click', function () {
      toggleMusic();
    });
  }

  function boot() {
    buildControls();
    var saved = readSave();
    if (saved) {
      musicOn = saved.music !== false;
      seenHint = !!saved.seenHint;
      if (saved.assist) {
        state = RULES.freshState(modeOf());
        state.assist = true;
      }
    }
    refreshCover();
    ensureClip('reach');
    el.coverBg.src = modeOf() === 'landscape'
      ? 'assets/cover/b27-cover-16x9-bg.webp'
      : 'assets/cover/b27-cover-3x4-bg.webp';
    layoutHud();

    el.coverMusic.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      e.stopPropagation();
      toggleMusic();
    });
    el.start.addEventListener('click', function () {
      armAudio();
      enterPlay(false);
    });
    el.cont.addEventListener('click', function () {
      armAudio();
      enterPlay(true);
    });
    $('btn-hint').addEventListener('click', function () {
      seenHint = true;
      el.hint.hidden = true;
      say('已选右手。亮着的抓点够得到，灰色的超出固定距离。', true);
      writeSave();
    });
    $('btn-resume').addEventListener('click', closePause);
    $('btn-restart').addEventListener('click', restart);
    $('btn-again').addEventListener('click', restart);
    $('btn-pause-assist').addEventListener('click', toggleAssist);
    $('btn-pause-music').addEventListener('click', toggleMusic);
    el.board.addEventListener('pointerdown', onBoardDown);
    el.cover.addEventListener('pointerover', function (e) {
      if (e.target.closest('button, a')) return;
      if (latch === 'reach') shown = 'breath';
      ensureClip(shown);
    });
    el.cover.addEventListener('pointerout', function (e) {
      if (el.cover.contains(e.relatedTarget)) return;
      shown = latch;
    });
    el.cover.addEventListener('click', function (e) {
      armAudio();
      if (e.target.closest('button, a')) return;
      latch = latch === 'reach' ? 'breath' : latch === 'breath' ? 'slip' : 'reach';
      shown = latch;
      coverFrame = 0;
      ensureClip(shown);
    });
    window.addEventListener('resize', function () {
      document.documentElement.classList.toggle('land', modeOf() === 'landscape');
      if (!el.cover.hidden) {
        el.coverBg.src = modeOf() === 'landscape'
          ? 'assets/cover/b27-cover-16x9-bg.webp'
          : 'assets/cover/b27-cover-3x4-bg.webp';
      }
      layoutHud();
    });
    document.addEventListener('visibilitychange', function () {
      syncAudio();
      if (document.hidden) writeSave();
    });
    window.addEventListener('pagehide', writeSave);
    requestAnimationFrame(loop);

    window.__cc = {
      rules: RULES,
      key: SAVE_KEY,
      get phase() { return phase; },
      get state() { return state; },
      get hud() { return hud; },
      get view() { return view; },
      weather: weatherAt,
      enter: enterPlay
    };
  }

  boot();
})();
