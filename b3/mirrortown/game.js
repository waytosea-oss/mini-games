/* 倒影街区。固定三档机位，图节点寻路，亮线与可走同一判定。 */
(function () {
  'use strict';

  var L = window.MT_LEVEL;
  var audio = window.MT_AUDIO;
  var SAVE_KEY = 'mirrortown_save_v1';

  var SHEETS = {
    nod: {
      url: 'assets/anim/b03-mascot-sheet-hat-nod.webp',
      still: 'assets/anim/b03-mascot-still-hat-nod.png',
      fw: 306, fh: 426, ax: 156.967, ay: 215.518, cols: 6, rows: 4, n: 24, fps: 12
    },
    letter: {
      url: 'assets/anim/b03-mascot-sheet-letter-show.webp',
      still: 'assets/anim/b03-mascot-still-letter-show.png',
      fw: 286, fh: 420, ax: 147.003, ay: 215.509, cols: 6, rows: 4, n: 24, fps: 12
    },
    ripple: {
      url: 'assets/anim/b03-mascot-sheet-ripple.webp',
      still: 'assets/anim/b03-mascot-still-ripple.png',
      fw: 420, fh: 478, ax: 204.969, ay: 215.505, cols: 6, rows: 4, n: 24, fps: 12
    }
  };

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var state = fresh(null);
  var walk = null;
  var turn = null;
  var sayUntil = 0;
  var sayText = '';
  var clearPlayed = false;
  var lockUntil = 0;
  var resetArm = 0;
  var holdTimer = 0;
  var holding = false;
  var rafLast = 0;
  var plateKey = '';
  var actorFace = '';
  var imgCache = {};
  var glowReady = false;

  var el = {
    cover: document.getElementById('screen-cover'),
    play: document.getElementById('screen-play'),
    coverBg: document.getElementById('cover-bg'),
    coverAnchor: document.getElementById('cover-anchor'),
    coverActions: document.getElementById('cover-actions'),
    zone: document.getElementById('zone-town'),
    wrap: document.getElementById('plate-wrap'),
    plate: document.getElementById('plate'),
    tide: document.getElementById('tide'),
    glow: document.getElementById('glow'),
    actor: document.getElementById('actor'),
    fx: document.getElementById('fx'),
    ring: document.getElementById('hint-ring'),
    pin: document.getElementById('pin-check'),
    compass: document.getElementById('compass'),
    compassImg: document.getElementById('compass-img'),
    coach: document.getElementById('coach'),
    letters: document.getElementById('letter-status'),
    tideStatus: document.getElementById('tide-status'),
    meta: document.getElementById('meta-line'),
    undo: document.getElementById('btn-undo'),
    letter: document.getElementById('btn-letter'),
    tideBtn: document.getElementById('btn-tide'),
    reset: document.getElementById('btn-reset'),
    imgUndo: document.getElementById('img-undo'),
    imgLetter: document.getElementById('img-letter'),
    imgTide: document.getElementById('img-tide'),
    closeup: document.getElementById('closeup'),
    closeKicker: document.getElementById('closeup-kicker'),
    closeLetter: document.getElementById('closeup-letter'),
    closeBox: document.getElementById('closeup-box'),
    closeCopy: document.getElementById('closeup-copy'),
    clear: document.getElementById('clear'),
    clearText: document.getElementById('clear-text'),
    clearAnchor: document.getElementById('clear-anchor')
  };
  var gctx = el.glow.getContext('2d');
  var coverPlayer = makePlayer(el.coverAnchor);
  var clearPlayer = makePlayer(el.clearAnchor, { slot: true });

  function fresh(best) {
    return {
      phase: 'cover',
      node: 'wharf',
      view: 'front',
      tide: 'high',
      coral: false,
      lake: false,
      postcard: false,
      steps: 0,
      turns: 0,
      undo: [],
      seenLane: false,
      best: best == null ? null : best,
      music: true
    };
  }

  function ori() {
    return window.innerWidth > window.innerHeight ? 'l' : 'p';
  }

  function loadSave() {
    try {
      var raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (!data || data.v !== 1 || !L.NODES[data.node]) return null;
      if (L.VIEWS.indexOf(data.view) < 0) return null;
      return data;
    } catch (err) {
      return null;
    }
  }

  function persist() {
    var data = {
      v: 1,
      phase: state.phase,
      node: state.node,
      view: state.view,
      tide: state.tide,
      coral: !!state.coral,
      lake: !!state.lake,
      postcard: !!state.postcard,
      steps: state.steps | 0,
      turns: state.turns | 0,
      undo: (state.undo || []).slice(-30),
      seenLane: !!state.seenLane,
      best: state.best,
      music: !!state.music
    };
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch (err) { /* 隐私模式忽略 */ }
  }

  function applySave(data) {
    state = fresh(data.best);
    state.phase = data.phase === 'clear' ? 'clear' : 'play';
    state.node = data.node;
    state.view = data.view;
    state.tide = data.tide === 'low' ? 'low' : 'high';
    state.coral = !!data.coral;
    state.lake = !!data.lake;
    state.postcard = !!data.postcard;
    state.steps = data.steps | 0;
    state.turns = data.turns | 0;
    state.undo = Array.isArray(data.undo) ? data.undo.filter(function (id) { return !!L.NODES[id]; }) : [];
    state.seenLane = !!data.seenLane;
    state.best = data.best == null ? null : data.best;
    state.music = data.music !== false;
  }

  function pokeAudio() {
    audio.setWanted(!!state.music);
    if (state.music) audio.arm();
  }

  function paintMusic() {
    var on = !!state.music && audio.wanted();
    document.querySelectorAll('[data-music]').forEach(function (btn) {
      btn.classList.toggle('off', !on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      btn.textContent = on ? '乐' : '静';
    });
  }

  function onMusic(ev) {
    ev.preventDefault();
    pokeAudio();
    if (!audio.state().started) audio.arm();
    var on = audio.toggle();
    state.music = on;
    paintMusic();
    persist();
  }

  function makePlayer(anchor, opts) {
    var node = document.createElement('div');
    node.className = 'sprite-sheet';
    anchor.appendChild(node);
    return {
      anchor: anchor,
      el: node,
      clip: 'nod',
      frame: 0,
      acc: 0,
      once: null,
      playing: true,
      slot: !!(opts && opts.slot)
    };
  }

  function spriteHeight(player) {
    if (player && player.slot) {
      var short = ori() === 'l' && window.innerHeight <= 520;
      return Math.round(Math.max(96, Math.min(132, window.innerHeight * (short ? 0.24 : 0.16))));
    }
    return Math.round(Math.max(200, Math.min(460, window.innerHeight * (ori() === 'l' ? 0.62 : 0.46))));
  }

  function drawSheet(player) {
    var spec = SHEETS[player.clip];
    var h = spriteHeight(player);
    var scale = h / spec.fh;
    var dw = spec.fw * scale;
    var dh = spec.fh * scale;
    player.el.style.width = dw + 'px';
    player.el.style.height = dh + 'px';
    if (player.slot) {
      var slotH = Math.round(h * 1.28);
      var anchorY = Math.round(slotH * 0.46);
      player.anchor.style.height = slotH + 'px';
      player.el.style.left = '50%';
      player.el.style.top = anchorY + 'px';
      player.el.style.transform = 'translate(' + (-spec.ax * scale) + 'px, ' + (-spec.ay * scale) + 'px)';
      player.el.style.pointerEvents = 'none';
    } else {
      player.el.style.left = (-spec.ax * scale) + 'px';
      player.el.style.top = (-spec.ay * scale) + 'px';
      player.el.style.transform = '';
    }
    if (reduceMotion) {
      player.el.style.backgroundImage = "url('" + spec.still + "')";
      player.el.style.backgroundSize = dw + 'px ' + dh + 'px';
      player.el.style.backgroundPosition = '0 0';
      return;
    }
    var col = player.frame % spec.cols;
    var row = Math.floor(player.frame / spec.cols);
    player.el.style.backgroundImage = "url('" + spec.url + "')";
    player.el.style.backgroundSize = (dw * spec.cols) + 'px ' + (dh * spec.rows) + 'px';
    player.el.style.backgroundPosition = (-col * dw) + 'px ' + (-row * dh) + 'px';
  }

  function setClip(player, name, once) {
    if (!SHEETS[name]) name = 'nod';
    player.clip = name;
    player.frame = 0;
    player.acc = 0;
    player.once = once || null;
    drawSheet(player);
  }

  function tickSheet(player, dt) {
    if (!player.playing || reduceMotion) return;
    var spec = SHEETS[player.clip];
    player.acc += dt;
    var step = 1000 / spec.fps;
    while (player.acc >= step) {
      player.acc -= step;
      player.frame += 1;
      if (player.frame >= spec.n) {
        if (player.once) {
          var cb = player.once;
          player.once = null;
          player.clip = 'nod';
          player.frame = 0;
          cb();
        } else {
          player.frame = 0;
        }
      }
    }
    drawSheet(player);
  }

  function showCover() {
    el.play.hidden = true;
    el.cover.hidden = false;
    coverPlayer.playing = true;
    clearPlayer.playing = false;
    layoutCover();
    var saved = loadSave();
    el.coverActions.innerHTML = '';
    if (saved && (saved.phase === 'play' || saved.phase === 'clear') && !(saved.coral && saved.lake && saved.phase === 'clear' && saved.node === 'wharf' && saved.steps === 0)) {
      var go = document.createElement('button');
      go.type = 'button';
      go.className = 'btn-main';
      go.textContent = saved.phase === 'clear' ? '看这次送达' : '继续送信';
      go.addEventListener('click', function () {
        pokeAudio();
        applySave(saved);
        enterPlay();
      });
      el.coverActions.appendChild(go);
    }
    var start = document.createElement('button');
    start.type = 'button';
    start.className = saved ? 'btn-ghost' : 'btn-main';
    start.textContent = saved ? '重新开始' : '开始送信';
    start.addEventListener('click', function () {
      pokeAudio();
      var best = state.best;
      var old = loadSave();
      if (old && old.best != null) best = old.best;
      state = fresh(best);
      state.phase = 'play';
      state.music = audio.wanted();
      enterPlay();
    });
    el.coverActions.appendChild(start);
    paintMusic();
  }

  function layoutCover() {
    var land = ori() === 'l';
    var next = land ? 'assets/cover/b03-cover-16x9-bg.webp' : 'assets/cover/b03-cover-3x4-bg.webp';
    if (el.coverBg.getAttribute('src') !== next) el.coverBg.src = next;
    drawSheet(coverPlayer);
  }

  function enterPlay() {
    el.cover.hidden = true;
    el.play.hidden = false;
    coverPlayer.playing = false;
    armArt();
    plateKey = '';
    fitPlate();
    paint();
    persist();
  }

  function armArt() {
    if (el.imgUndo.getAttribute('src')) return;
    el.imgUndo.src = 'assets/ui/b03-btn-undo.png';
    el.imgLetter.src = 'assets/ui/b03-btn-letter.png';
    el.pin.src = 'assets/props/b03-checkpoint.png';
    el.pin.hidden = false;
    ['open', 'broken', 'cap'].forEach(function (key) {
      var file = {
        open: 'assets/overlays/b03-glow-open-strip.png',
        broken: 'assets/overlays/b03-glow-broken-strip.png',
        cap: 'assets/overlays/b03-glow-cap.png'
      }[key];
      loadImg(file, function () {
        if (loadImg.got.open && loadImg.got.broken && loadImg.got.cap) {
          glowReady = true;
          drawGlow();
        }
      }, key);
    });
  }

  function loadImg(src, cb, key) {
    if (!loadImg.got) loadImg.got = {};
    if (imgCache[src] && imgCache[src].complete && imgCache[src].naturalWidth) {
      if (key) loadImg.got[key] = imgCache[src];
      if (cb) cb(imgCache[src]);
      return;
    }
    var img = imgCache[src] || new Image();
    imgCache[src] = img;
    img.onload = function () {
      if (key) loadImg.got[key] = img;
      if (cb) cb(img);
    };
    img.onerror = function () {
      console.error('素材没有载入', src);
      if (cb) cb(null);
    };
    if (!img.src) img.src = src;
  }

  function plateSrc() {
    if (state.view === 'front' && state.tide === 'low' && ori() === 'p') {
      return 'assets/town/b03-town-front-lowtide-portrait.webp';
    }
    var tag = ori() === 'p' ? 'portrait' : 'landscape';
    return 'assets/town/b03-town-' + state.view + '-' + tag + '.webp';
  }

  function tideSrc() {
    if (state.view === 'front' && state.tide === 'low' && ori() === 'p') return '';
    var tag = ori() === 'p' ? 'portrait' : 'landscape';
    return 'assets/overlays/b03-tide-' + state.tide + '-' + state.view + '-' + tag + '.png';
  }

  function fitPlate() {
    var zone = el.zone;
    var aspect = ori() === 'p' ? 1080 / 1920 : 1920 / 1080;
    var zw = zone.clientWidth;
    var zh = zone.clientHeight;
    if (!zw || !zh) return;
    var w, h;
    if (zw / zh > aspect) {
      h = zh;
      w = zh * aspect;
    } else {
      w = zw;
      h = zw / aspect;
    }
    el.wrap.style.width = Math.round(w) + 'px';
    el.wrap.style.height = Math.round(h) + 'px';
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    el.glow.width = Math.max(1, Math.round(w * dpr));
    el.glow.height = Math.max(1, Math.round(h * dpr));
    gctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function applyPlate() {
    var key = plateSrc() + '|' + tideSrc();
    if (key === plateKey) return;
    plateKey = key;
    el.plate.src = plateSrc();
    var tide = tideSrc();
    if (!tide) {
      el.tide.hidden = true;
    } else {
      el.tide.hidden = false;
      if (el.tide.getAttribute('src') !== tide) el.tide.src = tide;
    }
  }

  function drawGlow() {
    var w = el.wrap.clientWidth;
    var h = el.wrap.clientHeight;
    gctx.clearRect(0, 0, w, h);
    if (!w || !h || !glowReady) return;
    var openImg = loadImg.got.open;
    var brokenImg = loadImg.got.broken;
    var capImg = loadImg.got.cap;
    var thick = Math.max(14, w * 0.03);
    var list = L.glowEdges(state);
    list.forEach(function (g) {
      var a = L.spot(g.edge.a, state.view, ori());
      var b = L.spot(g.edge.b, state.view, ori());
      strokeStrip(g.state === 'open' ? openImg : brokenImg, a[0] * w, a[1] * h, b[0] * w, b[1] * h, thick, g.state === 'open');
    });
    if (capImg) {
      list.forEach(function (g) {
        [g.edge.a, g.edge.b].forEach(function (id) {
          var p = L.spot(id, state.view, ori());
          var s = thick * 1.15;
          gctx.drawImage(capImg, p[0] * w - s / 2, p[1] * h - s / 2, s, s);
        });
      });
    }
  }

  function strokeStrip(img, x1, y1, x2, y2, thick, tile) {
    if (!img) return;
    var dx = x2 - x1;
    var dy = y2 - y1;
    var len = Math.hypot(dx, dy);
    if (len < 2) return;
    gctx.save();
    gctx.translate(x1, y1);
    gctx.rotate(Math.atan2(dy, dx));
    if (tile) {
      var tileW = thick * (img.width / img.height);
      gctx.beginPath();
      gctx.rect(0, -thick / 2, len, thick);
      gctx.clip();
      for (var x = 0; x < len + tileW; x += tileW) {
        gctx.drawImage(img, x, -thick / 2, tileW, thick);
      }
    } else {
      gctx.drawImage(img, 0, -thick / 2, len, thick);
    }
    gctx.restore();
  }

  function renderActor() {
    var fromId = state.node;
    var toId = state.node;
    var t = 0;
    if (walk && walk.nodes[walk.index + 1]) {
      fromId = walk.nodes[walk.index];
      toId = walk.nodes[walk.index + 1];
      t = walk.t;
    }
    var pa = L.spot(fromId, state.view, ori());
    var pb = L.spot(toId, state.view, ori());
    var e = t * t * (3 - 2 * t);
    var x = pa[0] + (pb[0] - pa[0]) * e;
    var y = pa[1] + (pb[1] - pa[1]) * e;
    var dx = pb[0] - pa[0];
    var dy = pb[1] - pa[1];
    var face = 'front';
    var flip = 1;
    if (Math.hypot(dx, dy) > 0.004) {
      if (Math.abs(dx) > Math.abs(dy)) {
        face = 'side';
        flip = dx < 0 ? -1 : 1;
      } else if (dy < 0) face = 'back';
    }
    if (actorFace !== face) {
      actorFace = face;
      el.actor.src = 'assets/mascot/b03-mascot-iso-' + face + '.png';
    }
    el.actor.style.left = (x * 100) + '%';
    el.actor.style.top = (y * 100) + '%';
    el.actor.style.transform = 'translate(-50%, -95.96%) scaleX(' + flip + ')';
    var pin = L.spot('gap2', state.view, ori());
    el.pin.style.left = (pin[0] * 100) + '%';
    el.pin.style.top = (pin[1] * 100) + '%';
  }

  function paintRing() {
    if (state.phase === 'clear' || walk || turn) {
      el.ring.hidden = true;
      el.compass.classList.remove('nudge');
      el.tideBtn.classList.remove('hot');
      return;
    }
    var hint = L.hintTarget(state);
    el.compass.classList.toggle('nudge', !!(hint && hint.type === 'turn'));
    el.tideBtn.classList.toggle('hot', !!(hint && hint.type === 'tide'));
    if (!hint || hint.type !== 'node') {
      el.ring.hidden = true;
      return;
    }
    var plan = L.planRoute(state.node, hint.id, state.view, state.tide);
    if (plan.kind !== 'arrive') {
      el.ring.hidden = true;
      return;
    }
    var p = L.spot(hint.id, state.view, ori());
    el.ring.hidden = false;
    el.ring.style.left = (p[0] * 100) + '%';
    el.ring.style.top = (p[1] * 100) + '%';
  }

  function paintHud() {
    var viewName = L.VIEW_NAME[state.view];
    el.meta.textContent = viewName + ' · ' + (state.tide === 'high' ? '高潮' : '低潮') + ' · 步数 ' + state.steps + ' · 不限步';
    el.compassImg.src = 'assets/ui/b03-compass-' + state.view + '.png';
    el.compass.setAttribute('aria-label', '罗盘，当前' + viewName + '。左半边和右半边各转一档');
    el.imgTide.src = state.tide === 'low' ? 'assets/ui/b03-btn-tide-open.png' : 'assets/ui/b03-btn-tide.png';
    el.undo.disabled = !state.undo.length;
    el.letters.innerHTML = '';
    letterChip('coral', '珊瑚封', 'assets/props/b03-letter-coral.png');
    letterChip('lake', '湖蓝封', 'assets/props/b03-letter-lake.png');
    if (state.postcard) {
      var card = document.createElement('img');
      card.src = 'assets/ui/b03-icon-postcard.png';
      card.alt = '明信片已收下';
      card.style.width = '28px';
      el.letters.appendChild(card);
    }
    el.tideStatus.innerHTML = '';
    var gate = document.createElement('img');
    gate.src = 'assets/props/b03-tide-gate.png';
    gate.alt = '';
    var label = document.createElement('span');
    label.textContent = state.tide === 'high' ? '高潮' : '低潮';
    el.tideStatus.appendChild(gate);
    el.tideStatus.appendChild(label);
    if (performance.now() >= sayUntil) el.coach.textContent = L.coach(state);
    else el.coach.textContent = sayText;
    el.clear.hidden = state.phase !== 'clear';
    if (state.phase === 'clear') {
      el.closeup.hidden = true;
      if (!clearPlayed) {
        clearPlayed = true;
        clearPlayer.playing = true;
        setClip(clearPlayer, 'letter', function () { setClip(clearPlayer, 'nod'); });
      }
      var text = '两封信笺都放到了信箱里。这一程 ' + state.steps + ' 步，换了 ' + state.turns + ' 次机位。不限时，步数只作记录。';
      if (state.best != null) text += '这台设备上最少 ' + state.best + ' 步。';
      if (state.postcard) text += '空白明信片也收在怀里。';
      el.clearText.textContent = text;
    } else {
      clearPlayed = false;
      clearPlayer.playing = false;
    }
  }

  function letterChip(id, name, src) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'letter-btn' + (state[id] ? ' done' : '');
    btn.setAttribute('aria-label', name);
    var img = document.createElement('img');
    img.className = 'seal';
    img.src = src;
    img.alt = '';
    btn.appendChild(img);
    var span = document.createElement('span');
    span.textContent = name;
    btn.appendChild(span);
    if (state[id]) {
      var mark = document.createElement('img');
      mark.className = 'mark';
      mark.src = 'assets/ui/b03-icon-delivered.png';
      mark.alt = '';
      btn.appendChild(mark);
    }
    btn.addEventListener('click', function () { openLetter(id, false); });
    el.letters.appendChild(btn);
  }

  function paint() {
    document.documentElement.classList.toggle('land', ori() === 'l');
    applyPlate();
    drawGlow();
    renderActor();
    paintRing();
    paintHud();
  }

  function say(text) {
    sayText = text;
    sayUntil = performance.now() + 3400;
    el.coach.textContent = text;
  }

  function busy() {
    return !!(walk || turn || performance.now() < lockUntil || state.phase === 'clear');
  }

  function goTo(id) {
    if (!L.NODES[id] || busy()) return;
    pokeAudio();
    var plan = L.planRoute(state.node, id, state.view, state.tide);
    if (plan.kind === 'here') {
      if (L.NODES[id].letter) openLetter(L.NODES[id].letter, true);
      else say(L.NODES[id].name + '到了。');
      return;
    }
    if (plan.kind === 'none') {
      say(id === 'prom' || id === 'haven' ? '信箱还没和脚下连上。转到能接上的那一档。' : '这个机位里，脚下和那边还没有接上。');
      return;
    }
    if (plan.nodes.length < 2) {
      say(L.breakCopy(plan.edge, state.view, state.tide));
      return;
    }
    walk = {
      nodes: plan.nodes,
      index: 0,
      t: 0,
      paused: false,
      breakEdge: plan.kind === 'break' ? plan.edge : null
    };
    paintRing();
  }

  function commitStep() {
    var from = walk.nodes[walk.index];
    walk.index += 1;
    var to = walk.nodes[walk.index];
    state.undo.push(from);
    if (state.undo.length > 40) state.undo.shift();
    state.steps += 1;
    state.node = to;
    var done = walk.index >= walk.nodes.length - 1;
    var br = done ? walk.breakEdge : null;
    if (done) walk = null;
    var ev = L.applyArrival(state, to);
    state.coral = ev.coral;
    state.lake = ev.lake;
    state.postcard = ev.postcard;
    state.seenLane = ev.seenLane;
    if (ev.event === 'coral' || ev.event === 'lake') {
      playFx('stamp', to);
      if (!ev.cleared) {
        openLetter(ev.event, true);
        lockUntil = performance.now() + 680;
      }
    } else if (ev.event === 'postcard') {
      playFx('ripple', to);
      say('空白明信片收进怀里。绕一下也不耽误送信。');
    }
    if (ev.cleared) {
      state.phase = 'clear';
      el.closeup.hidden = true;
      if (state.best == null || state.steps < state.best) state.best = state.steps;
      say('两封信笺都放到信箱里了。');
    } else if (br) {
      say(L.breakCopy(br, state.view, state.tide));
    }
    persist();
    paint();
  }

  function advanceWalk(dt) {
    if (!walk || walk.paused) return;
    walk.t += dt / 560;
    if (walk.t >= 1) {
      walk.t = 1;
      renderActor();
      commitStep();
      return;
    }
    renderActor();
  }

  function beginTurn(dir) {
    if (turn || state.phase === 'clear') return;
    if (!dir) return;
    pokeAudio();
    if (walk) walk.paused = true;
    var i = L.VIEWS.indexOf(state.view);
    var next = L.VIEWS[(i + (dir > 0 ? 1 : 2)) % 3];
    turn = { next: next, t: 0, dur: reduceMotion ? 220 : 700, locked: false };
    state.turns += 1;
    el.plate.style.transition = 'opacity .2s linear';
    el.plate.style.opacity = '0.15';
    el.tide.style.opacity = '0.15';
  }

  function advanceTurn(dt) {
    if (!turn) return;
    turn.t += dt;
    if (!turn.locked && turn.t >= turn.dur * 0.42) {
      turn.locked = true;
      state.view = turn.next;
      if (walk) {
        var haltAt = L.haltIndexAfterView(walk.nodes, walk.index, state.view, state.tide);
        if (haltAt <= walk.index) {
          walk = null;
          say('机位变了，这一步停在平台上。');
        } else sayUntil = 0;
      } else sayUntil = 0;
      plateKey = '';
      paint();
      el.plate.style.opacity = '1';
      el.tide.style.opacity = '1';
    }
    if (turn.t >= turn.dur) {
      var resume = walk;
      turn = null;
      if (resume) resume.paused = false;
      el.plate.style.opacity = '1';
      el.tide.style.opacity = '1';
      persist();
      paint();
    }
  }

  function toggleTide() {
    if (walk || turn) {
      say('等笺仔停稳，再动潮汐。');
      return;
    }
    if (state.phase === 'clear') return;
    pokeAudio();
    state.tide = state.tide === 'high' ? 'low' : 'high';
    playFx('ripple', 'wharf');
    say(state.tide === 'low' ? '潮水退去，湿石露出来了。' : '潮水抬高，倒影桥被托住。');
    plateKey = '';
    persist();
    paint();
  }

  function doUndo() {
    if (walk || turn) {
      say('等笺仔停稳再撤回。');
      return;
    }
    if (!state.undo.length) {
      say('已经在这一程的起点。');
      return;
    }
    state.node = state.undo.pop();
    say('回到上一处平台。信件还在，撤回不扣任何东西。');
    persist();
    paint();
  }

  function doReset(force) {
    if (force !== true && Date.now() - resetArm > 2400) {
      resetArm = Date.now();
      say('再点一次重开，这一程从头送信。最少步数会留着。');
      return;
    }
    resetArm = 0;
    lockUntil = 0;
    var best = state.best;
    state = fresh(best);
    state.phase = 'play';
    state.music = audio.wanted();
    walk = null;
    turn = null;
    plateKey = '';
    clearPlayed = false;
    clearPlayer.playing = false;
    el.closeup.hidden = true;
    persist();
    paint();
    say('新的一程。笺仔站回西码头。');
  }

  function boxFile(letter, deliveredNow) {
    if (state[letter] || deliveredNow) return 'assets/props/b03-mailbox-delivered.png';
    return 'assets/props/b03-mailbox-waiting.png';
  }

  function openLetter(letter, deliveredNow) {
    var coral = letter === 'coral';
    el.closeKicker.textContent = coral ? '珊瑚封信笺' : '湖蓝封信笺';
    el.closeLetter.src = coral ? 'assets/props/b03-letter-coral.png' : 'assets/props/b03-letter-lake.png';
    el.closeBox.src = boxFile(letter, deliveredNow);
    if (deliveredNow) {
      el.closeCopy.textContent = coral
        ? '珊瑚封已经放进崖台信箱。人走到了信箱旁边，这一封才算送到。'
        : '湖蓝封已经放进码头信箱。人走到了信箱旁边，这一封才算送到。';
    } else if (state[letter]) {
      el.closeCopy.textContent = coral ? '珊瑚封已在崖台信箱里。' : '湖蓝封已在码头信箱里。';
    } else if (coral) {
      el.closeCopy.textContent = '珊瑚封要送到右侧崖台的信箱。正面拱桥中间是断的，左侧高潮时倒影桥才连上，再从右侧走完最后一段。';
    } else {
      el.closeCopy.textContent = '湖蓝封要送到左侧码头的信箱。先让潮水退去，正面走上湿石，再转到左侧。';
    }
    el.closeup.hidden = false;
    var target = coral ? 'prom' : 'haven';
    var p = L.spot(target, state.view, ori());
    el.ring.hidden = false;
    el.ring.style.left = (p[0] * 100) + '%';
    el.ring.style.top = (p[1] * 100) + '%';
  }

  function playFx(kind, nodeId) {
    var sheet = kind === 'stamp' ? 'assets/fx/b03-fx-stamp-sheet.png' : 'assets/fx/b03-fx-ripple-sheet.png';
    var p = L.spot(nodeId, state.view, ori());
    var size = Math.max(72, el.wrap.clientWidth * 0.18);
    el.fx.hidden = false;
    el.fx.style.width = size + 'px';
    el.fx.style.height = size + 'px';
    el.fx.style.left = (p[0] * 100) + '%';
    el.fx.style.top = (p[1] * 100) + '%';
    el.fx.style.backgroundImage = "url('" + sheet + "')";
    var i = 0;
    var timer = setInterval(function () {
      var col = i % 4;
      var row = Math.floor(i / 4);
      el.fx.style.backgroundSize = (size * 4) + 'px ' + (size * 2) + 'px';
      el.fx.style.backgroundPosition = (-col * size) + 'px ' + (-row * size) + 'px';
      i += 1;
      if (i >= 8) {
        clearInterval(timer);
        el.fx.hidden = true;
      }
    }, 70);
  }

  function localPoint(ev) {
    var r = el.wrap.getBoundingClientRect();
    return { x: ev.clientX - r.left, y: ev.clientY - r.top, w: r.width, h: r.height };
  }

  function distSeg(px, py, ax, ay, bx, by) {
    var dx = bx - ax;
    var dy = by - ay;
    var len2 = dx * dx + dy * dy;
    if (len2 < 1) return Math.hypot(px - ax, py - ay);
    var t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
    return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
  }

  function pick(p) {
    var best = null;
    var bestD = Math.max(28, Math.min(46, p.w * 0.08));
    Object.keys(L.NODES).forEach(function (id) {
      var s = L.spot(id, state.view, ori());
      var d = Math.hypot(s[0] * p.w - p.x, s[1] * p.h - p.y);
      if (d < bestD) {
        bestD = d;
        best = id;
      }
    });
    if (best) return best;
    var edgeD = 24;
    L.glowEdges(state).forEach(function (g) {
      var a = L.spot(g.edge.a, state.view, ori());
      var b = L.spot(g.edge.b, state.view, ori());
      var d = distSeg(p.x, p.y, a[0] * p.w, a[1] * p.h, b[0] * p.w, b[1] * p.h);
      if (d < edgeD) {
        edgeD = d;
        var da = Math.hypot(a[0] * p.w - p.x, a[1] * p.h - p.y);
        var db = Math.hypot(b[0] * p.w - p.x, b[1] * p.h - p.y);
        var id = da < db ? g.edge.a : g.edge.b;
        if (id === state.node) id = id === g.edge.a ? g.edge.b : g.edge.a;
        best = id;
      }
    });
    return best;
  }

  var ptr = null;
  el.wrap.addEventListener('pointerdown', function (ev) {
    pokeAudio();
    ptr = { x: ev.clientX, y: ev.clientY };
    try { el.wrap.setPointerCapture(ev.pointerId); } catch (err) { /* 旧浏览器忽略 */ }
  });
  el.wrap.addEventListener('pointerup', function (ev) {
    if (!ptr) return;
    var dx = ev.clientX - ptr.x;
    var dy = ev.clientY - ptr.y;
    ptr = null;
    if (Math.abs(dx) > 52 && Math.abs(dx) > Math.abs(dy) * 1.15) {
      beginTurn(dx < 0 ? 1 : -1);
      return;
    }
    if (Math.hypot(dx, dy) > 16) return;
    var id = pick(localPoint(ev));
    if (id) goTo(id);
    else say('点亮线上的路面。');
  });

  el.compass.addEventListener('click', function (ev) {
    var r = el.compass.getBoundingClientRect();
    beginTurn(ev.clientX - r.left < r.width / 2 ? -1 : 1);
  });
  el.tideBtn.addEventListener('click', toggleTide);
  el.undo.addEventListener('click', doUndo);
  el.reset.addEventListener('click', doReset);
  el.letter.addEventListener('pointerdown', function () {
    holding = false;
    holdTimer = setTimeout(function () {
      holding = true;
      var which = !state.coral ? 'coral' : 'lake';
      openLetter(which, false);
    }, 320);
  });
  function endHold() {
    clearTimeout(holdTimer);
    if (!holding) {
      var which = !state.coral ? 'coral' : 'lake';
      openLetter(which, false);
    }
  }
  el.letter.addEventListener('pointerup', endHold);
  el.letter.addEventListener('pointercancel', function () { clearTimeout(holdTimer); });
  document.getElementById('closeup-ok').addEventListener('click', function () {
    el.closeup.hidden = true;
    paintRing();
  });
  document.getElementById('btn-cover').addEventListener('click', function () {
    persist();
    showCover();
  });
  document.getElementById('btn-again').addEventListener('click', function () {
    doReset(true);
  });
  document.querySelectorAll('[data-music]').forEach(function (btn) {
    btn.addEventListener('click', onMusic);
  });
  document.addEventListener('pointerdown', function () { pokeAudio(); }, { passive: true });
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'ArrowLeft') beginTurn(-1);
    else if (ev.key === 'ArrowRight') beginTurn(1);
    else if (ev.key === 'Escape') el.closeup.hidden = true;
  });
  document.addEventListener('visibilitychange', function () {
    audio.visibility(document.hidden);
  });

  el.coverAnchor.addEventListener('pointerenter', function () { setClip(coverPlayer, 'letter'); });
  el.coverAnchor.addEventListener('pointerleave', function () { setClip(coverPlayer, 'nod'); });
  el.coverAnchor.addEventListener('click', function () {
    pokeAudio();
    setClip(coverPlayer, 'ripple');
  });

  window.addEventListener('resize', function () {
    document.documentElement.classList.toggle('land', ori() === 'l');
    if (!el.play.hidden) {
      plateKey = '';
      fitPlate();
      paint();
    } else layoutCover();
    drawSheet(coverPlayer);
    drawSheet(clearPlayer);
  });

  function frame(now) {
    var dt = rafLast ? Math.min(48, now - rafLast) : 16;
    rafLast = now;
    if (!el.cover.hidden) tickSheet(coverPlayer, dt);
    if (!el.play.hidden && state.phase === 'clear') tickSheet(clearPlayer, dt);
    if (!el.play.hidden) {
      if (turn) advanceTurn(dt);
      else advanceWalk(dt);
      if (sayUntil && performance.now() >= sayUntil) {
        sayUntil = 0;
        if (!el.closeup.hidden) { /* 保持弹层 */ }
        else el.coach.textContent = L.coach(state);
      }
    }
    requestAnimationFrame(frame);
  }

  window.__mt = {
    state: function () {
      return {
        phase: state.phase,
        node: state.node,
        view: state.view,
        tide: state.tide,
        coral: state.coral,
        lake: state.lake,
        postcard: state.postcard,
        steps: state.steps,
        turns: state.turns,
        undo: state.undo.slice(),
        seenLane: state.seenLane
      };
    },
    walking: function () { return !!walk; },
    turning: function () { return !!turn; },
    walkPaused: function () { return !!(walk && walk.paused); },
    go: goTo,
    turn: beginTurn,
    tide: toggleTide,
    undo: doUndo
  };

  audio.setWanted(true);
  var savedBoot = loadSave();
  if (savedBoot && savedBoot.music === false) {
    state.music = false;
    audio.setWanted(false);
  }
  setClip(coverPlayer, 'nod');
  if (savedBoot && (savedBoot.phase === 'play' || savedBoot.phase === 'clear')) {
    applySave(savedBoot);
    if (savedBoot.music === false) audio.setWanted(false);
    enterPlay();
  } else {
    showCover();
  }
  paintMusic();
  requestAnimationFrame(frame);
})();
