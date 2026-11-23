/* 慢信号台。封面与对局使用 12fps 图集，锚点取第零帧质心。 */
(function () {
  'use strict';

  var L = window.SlowSignal;
  var A = window.SlowAudio;
  var CLIPS = {
    tune: {
      fw: 374, fh: 456, cols: 6, rows: 4, n: 24,
      ax: 203.83467725405836, ay: 260.20060985225825,
      sheet: 'anim/b30-mascot-sheet-tune.webp',
      still: 'anim/b30-mascot-still-tune.png'
    },
    signal: {
      fw: 479, fh: 506, cols: 6, rows: 4, n: 24,
      ax: 237.84375781348535, ay: 262.2245519955503,
      sheet: 'anim/b30-mascot-sheet-signal.webp',
      still: 'anim/b30-mascot-still-signal.png'
    },
    listen: {
      fw: 352, fh: 454, cols: 6, rows: 4, n: 24,
      ax: 163.8478022567503, ay: 258.21007200075593,
      sheet: 'anim/b30-mascot-sheet-listen.webp',
      still: 'anim/b30-mascot-still-listen.png'
    }
  };
  var LAND = {
    lighthouse: [254.48554153522608, 451.762267788293],
    dock: [276.483550295858, 464.956449704142],
    bridge: [309.46032847559565, 464.13393476752253]
  };
  var TEAM_ANCHOR = {
    boat: {
      idle: [230.97126795752655, 338.2204871955028],
      depart: [230.97126795752655, 338.2204871955028],
      route: [230.97126795752655, 338.2204871955028],
      return: [280.02873204247345, 338.2204871955028]
    },
    cart: {
      idle: [257.2325447201385, 358.8522792844778],
      depart: [257.2325447201385, 358.8522792844778],
      route: [257.2325447201385, 358.8522792844778],
      return: [253.7674552798615, 358.8522792844778]
    }
  };
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var state = L.fresh();
  var painting = false;
  var toastTimer = 0;
  var fxTimer = 0;
  var uncertainFrame = 0;
  var sawEnding = false;
  var mapRect = { x: 0, y: 0, w: 1, h: 1 };

  function $(id) { return document.getElementById(id); }

  function land() { return window.innerWidth > window.innerHeight; }

  function persist() {
    state.screen = $('screen-play').hidden ? 'cover' : (state.ended ? 'ending' : 'play');
    try { localStorage.setItem(L.SAVE_KEY, L.serialize(state)); } catch (err) { /* 隐私模式忽略 */ }
  }

  function loadSave() {
    try {
      var raw = localStorage.getItem(L.SAVE_KEY);
      if (!raw) return null;
      return L.hydrate(raw);
    } catch (err) {
      return null;
    }
  }

  function hasProgress(s) {
    return !!(s && (s.tick > 0 || s.heard.lamp || s.ended || (s.tree && s.tree.nodes.length > 1)));
  }

  function Sprite(el) {
    this.el = el;
    this.inner = document.createElement('div');
    this.inner.className = 'sheet';
    el.appendChild(this.inner);
    this.frame = 0;
    this.acc = 0;
    this.name = 'tune';
    this.loop = true;
    this.broken = false;
  }
  Sprite.prototype.play = function (name, loop) {
    if (this.name === name && this.loop === !!loop && !this.broken) return;
    this.name = name;
    this.loop = loop !== false;
    this.frame = 0;
    this.acc = 0;
    this.broken = false;
    this.draw();
  };
  Sprite.prototype.tick = function (dt) {
    if (reduce) { this.draw(); return; }
    var clip = CLIPS[this.name];
    this.acc += dt;
    var step = 1000 / 12;
    var guard = 0;
    while (this.acc >= step && guard < 6) {
      this.acc -= step;
      this.frame += 1;
      guard += 1;
      if (this.frame >= clip.n) {
        if (this.loop) this.frame = 0;
        else {
          this.frame = 0;
          if (this.name === 'signal') this.play('listen', true);
          return;
        }
      }
    }
    this.draw();
  };
  Sprite.prototype.draw = function () {
    var clip = CLIPS[this.name] || CLIPS.tune;
    var el = this.el;
    var w = el.clientWidth;
    var h = el.clientHeight;
    if (w < 2 || h < 2) return;
    var frame = reduce ? 0 : this.frame;
    var src = (reduce || this.broken) ? clip.still : clip.sheet;
    var scale = Math.min(w / clip.fw, h / clip.fh) * 0.98;
    var dw = clip.fw * scale;
    var dh = clip.fh * scale;
    var px = w * 0.5;
    var py = h * 0.58;
    var ox = px - clip.ax * scale;
    var oy = py - clip.ay * scale;
    if (ox < 0) ox = 0;
    if (oy < 0) oy = 0;
    if (ox + dw > w) ox = Math.max(0, w - dw);
    if (oy + dh > h) oy = Math.max(0, h - dh);
    var node = this.inner;
    node.style.left = ox + 'px';
    node.style.top = oy + 'px';
    node.style.width = dw + 'px';
    node.style.height = dh + 'px';
    node.style.backgroundRepeat = 'no-repeat';
    node.style.backgroundImage = "url('" + src + "')";
    if (reduce || this.broken) {
      node.style.backgroundSize = dw + 'px ' + dh + 'px';
      node.style.backgroundPosition = '0 0';
      return;
    }
    var col = frame % clip.cols;
    var row = Math.floor(frame / clip.cols);
    node.style.backgroundSize = (dw * clip.cols) + 'px ' + (dh * clip.rows) + 'px';
    node.style.backgroundPosition = (-col * dw) + 'px ' + (-row * dh) + 'px';
  };

  var coverSprite = new Sprite($('cover-mascot'));
  var playSprite = new Sprite($('play-mascot'));
  coverSprite.play('tune', true);

  function preloadSheets() {
    Object.keys(CLIPS).forEach(function (name) {
      var img = new Image();
      img.onerror = function () {
        if (coverSprite.name === name) coverSprite.broken = true;
        if (playSprite.name === name) playSprite.broken = true;
      };
      img.src = CLIPS[name].sheet;
    });
  }
  preloadSheets();

  function syncOrient() {
    var isLand = land();
    document.documentElement.classList.toggle('land', isLand);
    $('cover-bg').src = isLand ? 'b30-cover-16x9-bg.webp' : 'b30-cover-3x4-bg.webp';
    $('scene-bg').src = isLand ? 'scene/b30-scene-landscape.webp' : 'scene/b30-scene-portrait.webp';
  }

  function toast(text) {
    var node = $('toast');
    node.hidden = false;
    node.textContent = text;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { node.hidden = true; }, 2400);
  }

  function burst(kind) {
    var el = $('fx');
    if (fxTimer) clearInterval(fxTimer);
    var i = 0;
    el.hidden = false;
    el.src = 'fx/b30-fx-' + kind + '-00.png';
    if (reduce) {
      setTimeout(function () { el.hidden = true; }, 400);
      return;
    }
    fxTimer = setInterval(function () {
      i += 1;
      if (i >= 8) {
        clearInterval(fxTimer);
        el.hidden = true;
        return;
      }
      el.src = 'fx/b30-fx-' + kind + '-0' + i + '.png';
    }, 1000 / 12);
  }

  function applyMusic() {
    document.querySelectorAll('[data-music]').forEach(function (btn) {
      btn.setAttribute('aria-pressed', state.music ? 'true' : 'false');
      btn.textContent = state.music ? '乐' : '静';
    });
    A.setEnabled(state.music);
  }

  function showCover() {
    $('screen-play').hidden = true;
    $('screen-cover').hidden = false;
    $('btn-continue').hidden = !hasProgress(state);
    coverSprite.play('tune', true);
    syncOrient();
    coverSprite.draw();
    state.screen = 'cover';
  }

  function showPlay() {
    $('screen-cover').hidden = true;
    $('screen-play').hidden = false;
    state.screen = state.ended ? 'ending' : 'play';
    if (playSprite.name !== 'signal') playSprite.play(state.focus ? 'listen' : 'tune', true);
    syncOrient();
    render();
  }

  function restart() {
    var music = state.music;
    state = L.fresh();
    state.music = music;
    state.screen = 'play';
    sawEnding = false;
    closeOverlays();
    showPlay();
    persist();
  }

  function closeOverlays() {
    ['overlay-log', 'overlay-tree', 'overlay-pause', 'overlay-ending'].forEach(function (id) {
      $(id).hidden = true;
    });
    A.setPaused(false);
  }

  function reasonText(reason) {
    if (reason === 'busy') return '这支还在路上，不能直接派去别处。召回要另付圆点，也不会立刻出现在新的地方。';
    if (reason === 'unheard') return '先把这段声音听清楚。';
    if (reason === 'closed') return '这一处已经有了结果。';
    if (reason === 'place') return '先在地图上点一个形状。';
    if (reason === 'again') return '这句话已经问过，日志里可以再看。';
    if (reason === 'ended') return '这一夜已经收束。';
    return '这一步还不能做。';
  }

  function afterAction(res, kind) {
    if (!res || res.ok === false) {
      toast(reasonText(res && res.reason));
      if (res && res.reason === 'busy') A.sfx('deny');
      render();
      return;
    }
    if (kind) A.sfx(kind);
    if (kind === 'dispatch') burst('dispatch');
    if (state.ended && !sawEnding) {
      sawEnding = true;
      burst('close');
      A.sfx('close');
    }
    persist();
    render();
  }

  function onKnob(fromDrag) {
    var sig = L.signalAt(state.knob, state);
    var wave = $('wave');
    wave.src = sig.mode === 'lock'
      ? 'ui/b30-ui-wave-lock.png'
      : (sig.mode === 'noisy' ? 'ui/b30-ui-wave-noisy.png' : 'ui/b30-ui-wave-silent.png');
    $('knob').style.transform = 'rotate(' + (state.knob * 280 - 140) + 'deg)';
    $('knob-wrap').setAttribute('aria-valuenow', String(Math.round(state.knob * 100) / 100));
    if (sig.mode === 'lock') {
      var heard = L.hear(state, sig.callId);
      if (heard.fresh) {
        playSprite.play('signal', false);
        burst('lock');
        A.sfx('lock');
        persist();
        if (!painting) render();
        return;
      }
      if (playSprite.name !== 'signal') playSprite.play('listen', true);
      $('subtitle').textContent = L.subtitle(state, state.focus);
    } else if (!fromDrag || playSprite.name !== 'tune') {
      if (!fromDrag) playSprite.play('tune', true);
      else playSprite.play('tune', true);
      $('subtitle').textContent = sig.mode === 'noisy'
        ? '杂音里有人声，还没落进清楚的一段。'
        : '这一段很安静。';
    }
  }

  function nudge(delta) {
    state.knob = Math.max(0, Math.min(1, state.knob + delta));
    onKnob(false);
    persist();
  }

  function placeBox(node, ax, ay, draw, x, y) {
    var s = draw / 512;
    node.style.width = draw + 'px';
    node.style.height = draw + 'px';
    node.style.left = (mapRect.x + x * mapRect.w - ax * s) + 'px';
    node.style.top = (mapRect.y + y * mapRect.h - ay * s) + 'px';
  }

  function imgNode(src, cls) {
    var image = document.createElement('img');
    image.alt = '';
    image.src = src;
    image.className = cls || '';
    return image;
  }

  function hitNode(label, x, y, picked, onClick) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'hit' + (picked ? ' picked' : '');
    btn.setAttribute('aria-label', label);
    btn.style.left = (mapRect.x + x * mapRect.w - 24) + 'px';
    btn.style.top = (mapRect.y + y * mapRect.h - 24) + 'px';
    btn.addEventListener('click', onClick);
    return btn;
  }

  function renderMap() {
    var stage = $('map-stage');
    var sw = stage.clientWidth;
    var sh = stage.clientHeight;
    var scale = Math.min(sw / 1600, sh / 1200);
    var w = 1600 * scale;
    var h = 1200 * scale;
    mapRect = { x: (sw - w) / 2, y: (sh - h) / 2, w: w, h: h };
    var map = $('map-img');
    map.style.left = mapRect.x + 'px';
    map.style.top = mapRect.y + 'px';
    map.style.width = w + 'px';
    map.style.height = h + 'px';
    var root = $('tokens');
    root.textContent = '';
    var landDraw = Math.max(64, mapRect.w * 0.2);
    var teamDraw = Math.max(48, mapRect.w * 0.15);
    var routeDraw = Math.max(56, mapRect.w * 0.26);
    ['lighthouse', 'dock', 'bridge'].forEach(function (id) {
      var place = L.PLACES[id];
      var token = document.createElement('div');
      token.className = 'token';
      token.appendChild(imgNode('props/b30-landmark-' + id + '.png'));
      placeBox(token, LAND[id][0], LAND[id][1], landDraw, place.x, place.y);
      root.appendChild(token);
      root.appendChild(hitNode(place.label, place.x, place.y, state.selectedPlace === id, function () {
        choosePlace(id);
      }));
    });
    ['lamp', 'line', 'echo'].forEach(function (id) {
      var mode = L.pinMode(state, id);
      if (mode === 'hidden' || mode === 'done') return;
      if (mode === 'uncertain') {
        var guess = L.PLACES['guess-' + id];
        var range = document.createElement('div');
        range.className = 'range';
        range.appendChild(imgNode('props/b30-pin-range.png'));
        placeBox(range, 256, 256, Math.max(52, mapRect.w * 0.16), guess.x, guess.y);
        root.appendChild(range);
        var pin = document.createElement('div');
        pin.className = 'pin';
        pin.appendChild(imgNode('props/b30-pin-unverified.png'));
        placeBox(pin, 256, 430, Math.max(40, mapRect.w * 0.1), guess.x, guess.y);
        root.appendChild(pin);
        if (!reduce && state.focus === id) {
          var fx = imgNode('fx/b30-fx-uncertain-0' + uncertainFrame + '.png', 'fx-uncertain');
          var cx = mapRect.x + guess.x * mapRect.w;
          var cy = mapRect.y + guess.y * mapRect.h;
          fx.style.left = (cx - 36) + 'px';
          fx.style.top = (cy - 36) + 'px';
          root.appendChild(fx);
        }
        root.appendChild(hitNode(guess.label, guess.x, guess.y, state.selectedPlace === guess.id, function () {
          choosePlace(guess.id);
        }));
      } else {
        var truth = L.PLACES[L.CALLS[id].place];
        var solid = document.createElement('div');
        solid.className = 'pin';
        solid.appendChild(imgNode('props/b30-pin-verified.png'));
        placeBox(solid, 256, 430, Math.max(40, mapRect.w * 0.1), truth.x, truth.y);
        root.appendChild(solid);
      }
    });
    ['boat', 'cart'].forEach(function (id) {
      var team = state.teams[id];
      if (team.state !== 'idle' && team.dest && L.PLACES[team.dest]) {
        var from = L.HOMES[id];
        var dest = L.PLACES[team.dest];
        var midX = (from.x + dest.x) / 2;
        var midY = (from.y + dest.y) / 2;
        var dots = team.routeDots || L.routeDots(id, team.dest) || 2;
        var kind = dots >= 3 ? 'long' : (dots === 2 ? 'mid' : 'short');
        var route = document.createElement('div');
        route.className = 'route';
        route.appendChild(imgNode('props/b30-route-' + kind + '.png'));
        placeBox(route, 255.1, 256.47, routeDraw, midX, midY);
        var ang = Math.atan2((dest.y - from.y) * mapRect.h, (dest.x - from.x) * mapRect.w);
        route.style.transform = 'rotate(' + (ang * 180 / Math.PI) + 'deg)';
        route.style.transformOrigin = '50% 50%';
        root.appendChild(route);
      }
      var pos = L.teamXY(team);
      var phase = team.state || 'idle';
      var anchor = TEAM_ANCHOR[id][phase];
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'token' + (state.selectedTeam === id ? ' picked' : '');
      btn.setAttribute('aria-label', L.teamName(id) + L.phaseName(phase));
      btn.appendChild(imgNode('props/b30-team-' + id + '-' + phase + '.png'));
      placeBox(btn, anchor[0], anchor[1], teamDraw, pos.x, pos.y);
      btn.addEventListener('click', function () { chooseTeam(id); });
      root.appendChild(btn);
    });
  }

  function chooseTeam(id) {
    var before = state.tick;
    L.selectTeam(state, id);
    if (state.tick !== before) return;
    render();
    persist();
  }

  function choosePlace(id) {
    var before = state.tick;
    L.selectPlace(state, id);
    if (id.indexOf('guess-') === 0) {
      var callId = id.slice(6);
      if (state.heard[callId]) state.focus = callId;
    } else {
      ['lamp', 'line', 'echo'].forEach(function (callId) {
        if (L.CALLS[callId].place === id && state.heard[callId] && state.calls[callId].status === 'open') {
          state.focus = callId;
        }
      });
    }
    if (state.tick !== before) return;
    render();
    persist();
  }

  function cardButton(kind, title, dots, onClick) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'reply ' + (kind === 'ask' ? 'ask' : 'dispatch');
    var row = document.createElement('span');
    row.className = 'row';
    var mark = imgNode(kind === 'wait' || kind === 'ask' || kind === 'dispatch' || kind === 'recall'
      ? 'ui/b30-ui-mark-action.png'
      : 'ui/b30-ui-mark-log.png');
    mark.className = 'mark';
    row.appendChild(mark);
    if (dots) {
      var cost = imgNode('ui/b30-ui-cost-' + dots + '.png');
      cost.className = 'cost';
      row.appendChild(cost);
    }
    if (kind === 'dispatch' || kind === 'recall') row.appendChild(imgNode('ui/b30-ui-icon-confirm.png', 'mark'));
    btn.appendChild(row);
    var text = document.createElement('span');
    text.className = 'reply-text';
    text.textContent = title;
    btn.appendChild(text);
    btn.addEventListener('click', onClick);
    return btn;
  }

  function renderCards() {
    var box = $('cards');
    box.textContent = '';
    var focus = state.focus;
    var teamId = state.selectedTeam;
    if (teamId && state.teams[teamId].state !== 'idle') {
      var recallPreview = L.previewRecall(state, teamId);
      box.appendChild(cardButton('recall', '召回' + L.teamName(teamId), recallPreview.dots, function () {
        afterAction(L.recall(state, teamId), 'dispatch');
      }));
    } else if (teamId && state.selectedPlace && focus && state.calls[focus].status === 'open') {
      var preview = L.previewDispatch(state, teamId, state.selectedPlace);
      var place = L.PLACES[state.selectedPlace];
      var title = L.teamName(teamId) + '前往' + (place ? place.short : '那个形状');
      box.appendChild(cardButton('dispatch', title, preview.dots || 1, function () {
        afterAction(L.dispatch(state, teamId, state.selectedPlace, focus), 'dispatch');
      }));
    }
    if (focus && state.heard[focus] && state.calls[focus].status === 'open') {
      L.CALLS[focus].questions.forEach(function (q) {
        var preview = L.previewAsk(state, focus, q.id);
        if (!preview.ok) return;
        box.appendChild(cardButton('ask', q.text, preview.dots, function () {
          afterAction(L.ask(state, focus, q.id), 'ask');
        }));
      });
    }
    if (state.heard.lamp) {
      box.appendChild(cardButton('wait', '守在台前', 1, function () {
        afterAction(L.wait(state), 'ask');
      }));
    }
  }

  function renderMeters() {
    var p = Math.max(0, Math.min(1, state.tick / L.NIGHT));
    $('hand-long').style.transform = 'rotate(' + (p * 360) + 'deg)';
    $('hand-short').style.transform = 'rotate(' + (-70 + p * 200) + 'deg)';
    var band = L.arcBand(state.tick);
    $('arc-fill').src = 'ui/b30-ui-time-fill-' + band + '.png';
    ['boat', 'cart'].forEach(function (id) {
      var team = state.teams[id];
      var busy = team.state !== 'idle';
      $('pip-' + id + '-mark').src = busy ? 'ui/b30-ui-team-busy.png' : 'ui/b30-ui-team-idle.png';
      $('pip-' + id + '-phase').textContent = L.phaseName(team.state);
      $('pip-' + id).classList.toggle('picked', state.selectedTeam === id);
    });
  }

  function renderLog() {
    var data = L.readLog(state);
    var list = $('log-list');
    list.textContent = '';
    if (!data.entries.length) {
      var empty = document.createElement('p');
      empty.textContent = '日志还是空的。听清一段之后，话会记在这里。';
      list.appendChild(empty);
      return;
    }
    data.entries.forEach(function (row) {
      var line = document.createElement('div');
      line.className = 'log-row';
      var icon = imgNode(row.kind === 'log' ? 'ui/b30-ui-mark-log.png' : 'ui/b30-ui-mark-action.png');
      var text = document.createElement('p');
      text.textContent = row.text;
      line.appendChild(icon);
      line.appendChild(text);
      list.appendChild(line);
    });
  }

  function renderTree() {
    var list = $('tree-list');
    list.textContent = '';
    state.tree.nodes.forEach(function (node) {
      var status = L.nodeStatus(state, node.id);
      var row = document.createElement('div');
      row.className = 'tree-row';
      var icon = imgNode('ui/b30-ui-node-' + (status === 'current' ? 'current' : status === 'chosen' ? 'chosen' : 'untraveled') + '.png', 'glyph');
      var label = document.createElement('p');
      label.textContent = node.label;
      row.appendChild(icon);
      row.appendChild(label);
      if (node.key && node.id !== state.tree.cursor) {
        var jump = document.createElement('button');
        jump.type = 'button';
        jump.className = 'icon-btn';
        jump.setAttribute('aria-label', '跳回' + node.label);
        jump.appendChild(imgNode('ui/b30-ui-icon-jumpback.png'));
        jump.addEventListener('click', function () {
          var res = L.jumpTo(state, node.id);
          if (!res.ok) return;
          state = res.state;
          sawEnding = !!state.ended;
          closeOverlays();
          showPlay();
          persist();
          toast('已回到这个节点。');
        });
        row.appendChild(jump);
      }
      list.appendChild(row);
    });
    var ghost = document.createElement('div');
    ghost.className = 'tree-row';
    ghost.appendChild(imgNode('ui/b30-ui-node-empty.png', 'glyph'));
    var next = document.createElement('p');
    next.textContent = '接下来';
    ghost.appendChild(next);
    list.appendChild(ghost);
  }

  function renderEnding() {
    var overlay = $('overlay-ending');
    if (!state.ended || !state.ending) {
      overlay.hidden = true;
      return;
    }
    if (!$('overlay-log').hidden || !$('overlay-tree').hidden || !$('overlay-pause').hidden) {
      overlay.hidden = true;
      return;
    }
    overlay.hidden = false;
    $('end-title').textContent = state.ending.title;
    var box = $('end-lines');
    box.textContent = '';
    state.ending.lines.forEach(function (line) {
      var p = document.createElement('p');
      p.textContent = line;
      box.appendChild(p);
    });
  }

  function render() {
    if (painting) return;
    painting = true;
    $('coach').textContent = L.coach(state);
    onKnob(false);
    renderMap();
    renderCards();
    renderMeters();
    renderEnding();
    painting = false;
    playSprite.draw();
  }

  function openLog() {
    var before = state.tick;
    renderLog();
    if (state.tick !== before) toast('日志不该推动时间。');
    $('overlay-log').hidden = false;
    A.setPaused(true);
  }

  function openTree() {
    renderTree();
    $('overlay-ending').hidden = true;
    $('overlay-tree').hidden = false;
  }

  document.getElementById('btn-start').addEventListener('click', function () {
    A.arm();
    restart();
  });
  $('btn-continue').addEventListener('click', function () {
    A.arm();
    var saved = loadSave();
    if (saved) state = saved;
    showPlay();
  });
  $('btn-log').addEventListener('click', openLog);
  $('btn-tree').addEventListener('click', openTree);
  $('btn-pause').addEventListener('click', function () {
    $('overlay-pause').hidden = false;
    A.setPaused(true);
  });
  $('btn-resume').addEventListener('click', function () {
    $('overlay-pause').hidden = true;
    A.setPaused(false);
  });
  $('btn-restart').addEventListener('click', function () {
    A.arm();
    restart();
  });
  $('btn-close-chapter').addEventListener('click', function () {
    if (state.ended) return;
    L.closeChapter(state, 'early');
    sawEnding = true;
    burst('close');
    A.sfx('close');
    $('overlay-tree').hidden = true;
    persist();
    render();
  });
  $('btn-end-tree').addEventListener('click', openTree);
  $('btn-end-root').addEventListener('click', function () {
    var res = L.jumpTo(state, 'root');
    if (!res.ok) return;
    state = res.state;
    sawEnding = false;
    closeOverlays();
    showPlay();
    persist();
  });
  $('btn-end-restart').addEventListener('click', function () {
    A.arm();
    restart();
  });
  document.querySelectorAll('[data-close]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      $(btn.getAttribute('data-close')).hidden = true;
      A.setPaused(false);
      renderEnding();
    });
  });
  document.querySelectorAll('[data-music]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      A.arm();
      state.music = !state.music;
      applyMusic();
      persist();
    });
  });
  $('pip-boat').addEventListener('click', function () { chooseTeam('boat'); });
  $('pip-cart').addEventListener('click', function () { chooseTeam('cart'); });
  $('btn-knob-down').addEventListener('click', function () { nudge(-0.04); });
  $('btn-knob-up').addEventListener('click', function () { nudge(0.04); });

  var dragging = false;
  var wrap = $('knob-wrap');
  function aim(event) {
    var rect = wrap.getBoundingClientRect();
    var ang = Math.atan2(event.clientY - (rect.top + rect.height / 2), event.clientX - (rect.left + rect.width / 2));
    var deg = ang * 180 / Math.PI;
    var norm = (deg + 220) / 280;
    state.knob = Math.max(0, Math.min(1, norm));
    onKnob(true);
  }
  wrap.addEventListener('pointerdown', function (event) {
    dragging = true;
    A.arm();
    if (wrap.setPointerCapture) wrap.setPointerCapture(event.pointerId);
    aim(event);
  });
  wrap.addEventListener('pointermove', function (event) {
    if (!dragging) return;
    aim(event);
  });
  function endDrag() {
    if (!dragging) return;
    dragging = false;
    persist();
  }
  wrap.addEventListener('pointerup', endDrag);
  wrap.addEventListener('pointercancel', endDrag);
  wrap.addEventListener('keydown', function (event) {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') { event.preventDefault(); nudge(-0.03); }
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') { event.preventDefault(); nudge(0.03); }
  });

  document.addEventListener('pointerdown', function () { A.arm(); }, { passive: true });
  document.addEventListener('visibilitychange', function () {
    A.setHidden(document.hidden);
  });
  window.addEventListener('resize', function () {
    syncOrient();
    if (!$('screen-play').hidden) renderMap();
    coverSprite.draw();
    playSprite.draw();
  });

  setInterval(function () {
    uncertainFrame = (uncertainFrame + 1) % 8;
    document.querySelectorAll('.fx-uncertain').forEach(function (node) {
      node.src = 'fx/b30-fx-uncertain-0' + uncertainFrame + '.png';
    });
  }, 1000 / 12);

  var last = performance.now();
  function loop(now) {
    var dt = Math.min(80, now - last);
    last = now;
    coverSprite.tick(dt);
    playSprite.tick(dt);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  var saved = loadSave();
  if (saved && (saved.screen === 'play' || saved.screen === 'ending')) {
    state = saved;
    applyMusic();
    showPlay();
  } else {
    if (saved) state = saved;
    applyMusic();
    showCover();
  }

  window.__slow = {
    get state() { return state; },
    setKnob: function (value) {
      state.knob = value;
      onKnob(false);
      persist();
    },
    logic: L
  };
})();
