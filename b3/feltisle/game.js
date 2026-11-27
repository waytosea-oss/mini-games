/* 方寸生态。平顶六角拼接，真动画按第零帧质心锚点播放。 */
(function () {
  'use strict';

  var SAVE_KEY = 'feltisle_save_v1';
  var R = FELT_RULES;
  var FPS = 12;
  var CLIPS = {
    place: { fw: 370, fh: 454, ax: 185.3894527699707, ay: 266.44488982577997 },
    look: { fw: 312, fh: 446, ax: 156.37941698401713, ay: 257.451873709154 },
    ripple: { fw: 338, fh: 432, ax: 167.39496861123249, ay: 252.42366314126593 }
  };
  var SPECIES = {
    forest: { ax: 251.10764806266417, ay: 435, appear: 'props/b29-species-forest-appear.png', idle: 'props/b29-species-forest-idle.png' },
    edge: { ax: 257.3060679662606, ay: 376.96, appear: 'props/b29-species-edge-appear.png', idle: 'props/b29-species-edge-idle.png' },
    shore: { ax: 252.70145639211862, ay: 449.2, appear: 'props/b29-species-shore-appear.png', idle: 'props/b29-species-shore-idle.png' }
  };
  var KIND_LABEL = { forest: '林栖种', edge: '林缘种', shore: '水岸种' };

  var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var tutorialCleared = false;
  var screenName = 'cover';
  var state = null;
  var lastCam = null;
  var drawnSpecies = [];
  var cardSig = '';
  var coverClip = 'place';
  var coverFrame = 0;
  var resultFrame = 0;
  var acc = 0;
  var lastTs = 0;
  var coverPos = { x: 0, y: 0, r: 40 };
  var sheets = {};
  var stills = {};
  var images = {};
  var dragging = null;
  var frames = 0;

  function $(id) { return document.getElementById(id); }

  function ready(source) {
    if (!source) return false;
    if (source instanceof HTMLCanvasElement) return source.width > 0;
    return source.complete && source.naturalWidth > 0;
  }

  function img(src) {
    if (images[src]) return images[src];
    var el = new Image();
    el.src = src;
    images[src] = el;
    return el;
  }

  function resizeCanvas(canvas) {
    var rect = canvas.getBoundingClientRect();
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var w = Math.max(1, Math.round(rect.width * dpr));
    var h = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx: ctx, w: rect.width, h: rect.height };
  }

  function keyImage(image) {
    var canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth || image.width;
    canvas.height = image.naturalHeight || image.height;
    var ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(image, 0, 0);
    try {
      var im = ctx.getImageData(0, 0, canvas.width, canvas.height);
      var d = im.data;
      for (var i = 0; i < d.length; i += 4) {
        var r = d[i];
        var g = d[i + 1];
        var b = d[i + 2];
        var a = d[i + 3];
        if (a < 8) {
          d[i + 3] = 0;
          continue;
        }
        var felt = g > r && g > 28;
        var lake = b > 90 && g > 45 && b >= g - 8 && g + 6 > r && b > r + 15;
        var sand = r > 145 && g > 95 && b < 180 && g > b + 18 && r + 8 > g && r > b + 30;
        if (felt || lake || sand) continue;
        var dist = Math.sqrt((r - 255) * (r - 255) + g * g + (b - 170) * (b - 170));
        var mag = r > 170 && b > 100 && g < 120 && r > g + 45 && b > g + 25;
        if (dist < 78 || (mag && g < 70)) {
          d[i + 3] = 0;
          continue;
        }
        if (mag || dist < 150) {
          var spill = Math.min(r, b) - g;
          if (spill > 18) {
            var keep = Math.max(0, 1 - spill / 200);
            d[i] = Math.round(r * keep + g * (1 - keep));
            d[i + 2] = Math.round(b * keep + g * (1 - keep));
            if (keep < 0.35) d[i + 3] = Math.round(a * keep);
          }
        }
      }
      ctx.putImageData(im, 0, 0);
    } catch (err) {
      return image;
    }
    return canvas;
  }

  function loadKeyed(src, fallback, slot, bag) {
    var el = new Image();
    el.onload = function () { bag[slot] = keyImage(el); };
    el.onerror = function () {
      if (!fallback || el.getAttribute('data-fell')) return;
      el.setAttribute('data-fell', '1');
      el.src = fallback;
    };
    el.src = src;
  }

  function bootSheets() {
    Object.keys(CLIPS).forEach(function (name) {
      loadKeyed(
        'assets/anim/b29-mascot-sheet-' + name + '.webp',
        'assets/anim/b29-mascot-sheet-' + name + '.png',
        name,
        sheets
      );
      loadKeyed(
        'assets/anim/b29-mascot-still-' + name + '.png',
        '',
        name,
        stills
      );
    });
  }

  function landNow() {
    return window.innerWidth > window.innerHeight;
  }

  function syncStage() {
    var land = landNow();
    document.documentElement.classList.toggle('land', land);
    var scene = land ? 'assets/scene/b29-scene-landscape.webp' : 'assets/scene/b29-scene-portrait.webp';
    var cover = land ? 'assets/cover/b29-cover-16x9-bg.webp' : 'assets/cover/b29-cover-3x4-bg.webp';
    if ($('scene').getAttribute('src') !== scene) $('scene').src = scene;
    if ($('cover-bg').getAttribute('src') !== cover) $('cover-bg').src = cover;
  }

  function cloneCells(cells) {
    return cells.map(function (cell) {
      return { q: cell.q, r: cell.r, id: cell.id, rot: cell.rot || 0 };
    });
  }

  function blank(mode) {
    return {
      mode: mode,
      cells: R.startCells(),
      selected: 0,
      rot: 0,
      aim: null,
      bonus: 0,
      mig1: false,
      mig2: false,
      canUndo: false,
      history: [],
      replay: -1,
      paused: false,
      result: null,
      appear: { forest: 0, edge: 0, shore: 0 },
      seen: { forest: false, edge: false, shore: false },
      fx: [],
      marks: [],
      note: '',
      noteUntil: 0
    };
  }

  function shownCells() {
    if (!state) return R.startCells();
    if (state.replay >= 0 && state.history[state.replay]) return state.history[state.replay].cells;
    return state.cells;
  }

  function goal() {
    return R.GOALS[state.mode] || R.GOALS.main;
  }

  function liveDeal() {
    return R.deal(state.mode, shownCells());
  }

  function bonusThrough(steps) {
    var g = goal();
    var cells = R.startCells();
    var flags = { mig1: false, mig2: false };
    var bonus = 0;
    var n = Math.min(steps, state.history.length);
    for (var i = 0; i < n; i++) {
      var before = R.evaluate(cells, g);
      cells = state.history[i].cells;
      var after = R.evaluate(cells, g);
      var mig = R.migrationAward(before, after, flags, g);
      flags = mig.flags;
      bonus += mig.bonusAdd;
    }
    return { bonus: bonus, flags: flags };
  }

  function recompute() {
    var prog = bonusThrough(state.history.length);
    state.bonus = prog.bonus;
    state.mig1 = prog.flags.mig1;
    state.mig2 = prog.flags.mig2;
    state.cells = state.history.length ? cloneCells(state.history[state.history.length - 1].cells) : R.startCells();
    var ev = R.evaluate(state.cells, goal());
    state.seen.forest = !!ev.species.forest;
    state.seen.edge = !!ev.species.edge;
    state.seen.shore = !!ev.species.shore;
  }

  function save() {
    var data = {
      v: 1,
      music: FELT_AUDIO.wanted(),
      tutorialCleared: tutorialCleared,
      screen: screenName,
      state: state ? {
        mode: state.mode,
        selected: state.selected,
        rot: state.rot,
        canUndo: state.canUndo,
        history: state.history.map(function (step) { return { cells: cloneCells(step.cells) }; }),
        result: state.result,
        marks: state.marks
      } : null
    };
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch (err) { /* 配额 */ }
  }

  function loadSave() {
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

  function applyMusic(on) {
    FELT_AUDIO.setWanted(on);
    var pressed = on ? 'true' : 'false';
    $('cover-music').setAttribute('aria-pressed', pressed);
    $('play-music').setAttribute('aria-pressed', pressed);
  }

  function showScreen(name) {
    screenName = name;
    $('screen-cover').hidden = name !== 'cover';
    $('screen-play').hidden = name !== 'play';
    save();
  }

  function startMode(mode) {
    state = blank(mode);
    cardSig = '';
    showScreen('play');
    syncStage();
    sync();
  }

  function restore(data) {
    tutorialCleared = !!data.tutorialCleared;
    applyMusic(data.music !== false);
    if (!data.state || !data.state.history) {
      showScreen('cover');
      return;
    }
    state = blank(data.state.mode || 'main');
    state.selected = data.state.selected || 0;
    state.rot = data.state.rot || 0;
    state.canUndo = !!data.state.canUndo;
    state.history = (data.state.history || []).map(function (step) {
      return { cells: cloneCells(step.cells) };
    });
    state.marks = data.state.marks || [];
    state.result = data.state.result || null;
    recompute();
    if (state.result === 'win' && state.mode === 'tutorial') tutorialCleared = true;
    cardSig = '';
    showScreen('play');
    sync();
  }

  function offersNow() {
    return liveDeal().offers;
  }

  function confirm() {
    if (!state || state.paused || state.replay >= 0 || state.result) return false;
    var offers = offersNow();
    var id = offers[state.selected];
    if (!id || !state.aim) return false;
    if (!R.isLegal(state.cells, state.aim.q, state.aim.r)) return false;
    var g = goal();
    var placed = state.cells.length - 1;
    if (placed >= g.tileLimit + state.bonus) return false;
    var before = R.evaluate(state.cells, g);
    var cell = { q: state.aim.q, r: state.aim.r, id: id, rot: R.normRot(state.rot) };
    var next = state.cells.concat([cell]);
    var after = R.evaluate(next, g);
    var mig = R.migrationAward(before, after, { mig1: state.mig1, mig2: state.mig2 }, g);
    state.cells = next;
    state.mig1 = mig.flags.mig1;
    state.mig2 = mig.flags.mig2;
    state.bonus += mig.bonusAdd;
    state.history.push({ cells: cloneCells(next) });
    state.canUndo = true;
    state.fx.push({ kind: 'place', q: cell.q, r: cell.r, t: 0 });
    if (after.breaks > before.breaks) {
      state.fx.push({ kind: 'broken', q: cell.q, r: cell.r, t: 0 });
      FELT_AUDIO.sting('break');
    } else if (after.joints > before.joints && after.breaks === 0) {
      state.fx.push({ kind: 'connect', q: cell.q, r: cell.r, t: 0 });
      FELT_AUDIO.sting('place');
    } else {
      FELT_AUDIO.sting('place');
    }
    var now = performance.now();
    ['forest', 'edge', 'shore'].forEach(function (kind) {
      if (after.species[kind] && !before.species[kind] && after.stands[kind]) {
        state.appear[kind] = now + 1400;
        state.seen[kind] = true;
        state.fx.push({ kind: 'appear', q: after.stands[kind].q, r: after.stands[kind].r, t: 0 });
        FELT_AUDIO.sting('appear');
      }
    });
    if (mig.awards.indexOf('stretch') >= 0) {
      state.note = '水岸又延长了一段，再补两片。补片到此为止。';
      state.marks.push({ q: cell.q, r: cell.r, kind: 'bonus' });
    } else if (mig.awards.indexOf('corridor') >= 0) {
      state.note = '迁徙通道接上了，补上两片。';
      state.marks.push({ q: cell.q, r: cell.r, kind: 'migration' });
    }
    if (mig.awards.length) state.noteUntil = now + 2800;
    state.aim = null;
    var remaining = g.tileLimit + state.bonus - (next.length - 1);
    if (after.win) {
      state.result = 'win';
      if (state.mode === 'tutorial') tutorialCleared = true;
      state.fx.push({ kind: 'win', q: cell.q, r: cell.r, t: 0 });
      FELT_AUDIO.sting('win');
      coverClip = 'ripple';
    } else if (remaining <= 0) {
      state.result = 'lose';
      coverClip = 'look';
    }
    save();
    sync();
    return true;
  }

  function undo() {
    if (!state || state.replay >= 0 || !state.history.length) return;
    if (state.mode === 'main' && !state.canUndo) return;
    state.history.pop();
    state.result = null;
    state.aim = null;
    state.paused = false;
    recompute();
    state.canUndo = state.mode === 'tutorial' && state.history.length > 0;
    save();
    sync();
  }

  function enterReplay() {
    if (!state || !state.history.length) return;
    state.replay = 0;
    state.paused = false;
    $('result').hidden = true;
    sync();
  }

  function stepReplay() {
    if (!state || state.replay < 0) {
      enterReplay();
      return;
    }
    if (state.replay < state.history.length - 1) state.replay += 1;
    sync();
  }

  function exitReplay() {
    if (!state) return;
    state.replay = -1;
    sync();
  }

  function shownMetrics() {
    var cells = shownCells();
    var ev = R.evaluate(cells, goal());
    if (state && state.replay < 0 && state.aim && !state.result) {
      var id = offersNow()[state.selected];
      if (id) return R.evaluate(cells.concat([{ q: state.aim.q, r: state.aim.r, id: id, rot: R.normRot(state.rot) }]), goal());
    }
    return ev;
  }

  function bannerText(ev, preview) {
    if (!state) return '';
    if (state.replay >= 0) {
      var prevCells = state.replay === 0 ? R.startCells() : state.history[state.replay - 1].cells;
      var prev = R.evaluate(prevCells, goal());
      var cur = R.evaluate(state.history[state.replay].cells, goal());
      return R.replayLine(prev, cur);
    }
    if (state.note && performance.now() < state.noteUntil && !state.aim) return state.note;
    if (state.aim && preview) {
      var bits = ['预览：'];
      if (preview.win) bits.push('这样放，两条弧线一起站住。');
      else if (preview.breaks > ev.breaks) bits.push('这样放，河口对不上。');
      else {
        if (preview.connect > ev.connect + 0.04) bits.push('连通弧线会往上走。');
        else if (preview.connect < ev.connect - 0.04) bits.push('连通弧线会往下落。');
        if (preview.diversity > ev.diversity + 0.04) bits.push('多样性弧线会往上走。');
        else if (preview.diversity < ev.diversity - 0.04) bits.push('多样性弧线会往下落。');
        if (preview.suppressed && preview.suppressed !== ev.suppressed) bits.push('这样放，会挤占另一种需求。');
        if (bits.length === 1) bits.push('两条弧线几乎不动。');
      }
      return bits.join('');
    }
    if (ev.suppressed) return '有一种栖地铺得太多，挤占了另一种需求。';
    return liveDeal().hint;
  }

  function syncCards(offers) {
    var host = $('cards');
    var sig = offers.join('|');
    if (cardSig !== sig) {
      cardSig = sig;
      host.innerHTML = '';
      offers.forEach(function (id, index) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'card';
        btn.dataset.index = String(index);
        var frame = document.createElement('img');
        frame.className = 'frame';
        frame.alt = '';
        frame.src = 'assets/ui/b29-ui-card-' + ['a', 'b', 'c'][index] + '.png';
        var tile = document.createElement('img');
        tile.className = 'tile';
        tile.alt = '';
        tile.src = 'assets/' + R.TILES[id].file;
        btn.appendChild(frame);
        btn.appendChild(tile);
        btn.addEventListener('pointerdown', onCardDown);
        host.appendChild(btn);
      });
    }
    var buttons = host.querySelectorAll('.card');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].classList.toggle('on', i === state.selected);
      buttons[i].style.setProperty('--rot', i === state.selected ? String(R.normRot(state.rot)) : '0');
      buttons[i].disabled = !!(state.replay >= 0 || state.paused || state.result);
    }
  }

  function ensureSpecies() {
    var dock = $('species-dock');
    if (dock.childElementCount) return;
    ['forest', 'edge', 'shore'].forEach(function (kind) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'species';
      btn.dataset.kind = kind;
      btn.setAttribute('aria-label', KIND_LABEL[kind]);
      var pic = document.createElement('img');
      pic.alt = '';
      btn.appendChild(pic);
      btn.addEventListener('pointerdown', function (ev) {
        ev.preventDefault();
        arm();
        startLong(kind, ev);
      });
      dock.appendChild(btn);
    });
  }

  function paintSpecies(ev) {
    ensureSpecies();
    ['forest', 'edge', 'shore'].forEach(function (kind) {
      var pic = $('species-dock').querySelector('[data-kind="' + kind + '"] img');
      var src = 'assets/ui/b29-ui-species-' + kind + '-' + (ev.species[kind] ? 'ok' : 'off') + '.png';
      if (pic.getAttribute('src') !== src) pic.src = src;
    });
  }

  function sync() {
    if (!state) return;
    var g = goal();
    var cells = shownCells();
    var ev = R.evaluate(cells, g);
    var preview = null;
    if (state.replay < 0 && state.aim && !state.result) {
      var id = offersNow()[state.selected];
      if (id) preview = R.evaluate(cells.concat([{ q: state.aim.q, r: state.aim.r, id: id, rot: R.normRot(state.rot) }]), g);
    }
    var show = preview || ev;
    $('hud-title').textContent = state.mode === 'tutorial' ? '教学' : '正式';
    $('banner').textContent = bannerText(ev, preview);
    syncCards(state.replay >= 0 ? offersNow() : offersNow());
    paintSpecies(show);
    drawGauge($('gauge-connect'), 'connect', show.connectBand);
    drawGauge($('gauge-diverse'), 'diversity', show.diversityBand);
    var placed = cells.length - 1;
    var bonus = state.replay >= 0 ? bonusThrough(state.replay + 1).bonus : state.bonus;
    state._remaining = g.tileLimit + bonus - placed;
    $('btn-confirm').disabled = !(state.aim && state.replay < 0 && !state.paused && !state.result);
    $('btn-rotate').disabled = !!(state.replay >= 0 || state.paused || state.result);
    $('btn-undo').disabled = !state.history.length || state.replay >= 0 || (state.mode === 'main' && !state.canUndo);
    $('btn-live').hidden = state.replay < 0;
    $('pause-veil').hidden = !state.paused;
    var box = $('result');
    if (state.result && state.replay < 0) {
      box.hidden = false;
      var win = state.result === 'win';
      $('result-title').textContent = win
        ? (state.mode === 'tutorial' ? '教学稳住了' : '小岛稳住了')
        : '这回还差一点';
      $('result-copy').textContent = win
        ? (state.mode === 'tutorial'
          ? '连通和多样性一起站住了。正式岛有十五片，迁徙接上还能再补几片。'
          : '十五片之内，连通和多样性一起站住了。')
        : '片数用完了，连通和多样性还没有同时站住。可以复盘每一步，再试一次。';
      $('btn-next').hidden = !(win && state.mode === 'tutorial');
    } else {
      box.hidden = true;
    }
    var saved = loadSave();
    $('btn-continue').hidden = !(saved && saved.state && saved.state.history && saved.state.history.length);
    renderNow();
  }

  function drawGauge(canvas, kind, bandName) {
    var view = resizeCanvas(canvas);
    var ctx = view.ctx;
    ctx.clearRect(0, 0, view.w, view.h);
    var fill = img('assets/ui/b29-ui-' + kind + '-fill-' + bandName + '.png');
    var frame = img('assets/ui/b29-ui-' + kind + '-frame.png');
    if (ready(fill)) ctx.drawImage(fill, 64, 56, 384, 308, 0, 0, view.w, view.h);
    if (ready(frame)) ctx.drawImage(frame, 64, 56, 384, 308, 0, 0, view.w, view.h);
  }

  function traceHex(ctx, x, y, size) {
    ctx.beginPath();
    for (var i = 0; i < 6; i++) {
      var ang = (Math.PI / 3) * i;
      var px = x + size * Math.cos(ang);
      var py = y + size * Math.sin(ang);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  function fitCamera(cells, w, h) {
    var extra = R.legalCells(cells);
    if (state && state.aim && state.replay < 0) extra = extra.concat([state.aim]);
    var all = cells.concat(extra);
    var minX = Infinity;
    var minY = Infinity;
    var maxX = -Infinity;
    var maxY = -Infinity;
    all.forEach(function (cell) {
      var p = R.axialToPixel(cell.q, cell.r, R.SIZE);
      minX = Math.min(minX, p.x - R.SIZE);
      maxX = Math.max(maxX, p.x + R.SIZE);
      minY = Math.min(minY, p.y - R.SQRT3 * R.SIZE / 2);
      maxY = Math.max(maxY, p.y + R.SQRT3 * R.SIZE / 2);
    });
    var topPad = 42;
    var bottomPad = 40;
    var sidePad = 16;
    var bw = Math.max(1, maxX - minX);
    var bh = Math.max(1, maxY - minY);
    var availW = Math.max(40, w - sidePad * 2);
    var availH = Math.max(40, h - topPad - bottomPad);
    var sc = Math.min(availW / bw, availH / bh);
    var cx = (minX + maxX) / 2;
    var cy = (minY + maxY) / 2;
    return {
      sc: sc,
      ox: w / 2 - cx * sc,
      oy: topPad + availH / 2 - cy * sc
    };
  }

  function toScreen(q, r, cam) {
    var p = R.axialToPixel(q, r, R.SIZE);
    return { x: p.x * cam.sc + cam.ox, y: p.y * cam.sc + cam.oy, s: R.SIZE * cam.sc };
  }

  function drawSprite(ctx, source, x, y, scale, rot) {
    if (!ready(source)) return;
    ctx.save();
    ctx.translate(x, y);
    if (rot) ctx.rotate(rot * Math.PI / 3);
    var w = source.width * scale;
    var h = source.height * scale;
    ctx.drawImage(source, -w / 2, -h / 2, w, h);
    ctx.restore();
  }

  function drawTile(ctx, id, x, y, scale, rot) {
    var tile = R.TILES[id];
    if (!tile) return;
    drawSprite(ctx, img('assets/' + tile.file), x, y, scale, rot || 0);
  }

  function drawPips(ctx, w, h, remaining) {
    var y = h - 28;
    var x = 10;
    var pw = w - 20;
    var ph = 22;
    var empty = img('assets/ui/b29-ui-pips-empty.png');
    var full = img('assets/ui/b29-ui-pips-full.png');
    var low = img('assets/ui/b29-ui-pips-low.png');
    if (remaining >= 15 && ready(full)) {
      ctx.drawImage(full, 31, 236, 450, 40, x, y, pw, ph);
      return;
    }
    if (remaining <= 0 && ready(empty)) {
      ctx.drawImage(empty, 31, 236, 450, 40, x, y, pw, ph);
      return;
    }
    if (remaining === 4 && ready(low)) {
      ctx.drawImage(low, 31, 236, 450, 40, x, y, pw, ph);
      return;
    }
    if (ready(empty)) ctx.drawImage(empty, 31, 236, 450, 40, x, y, pw, ph);
    if (ready(full) && remaining > 0) {
      var slots = Math.min(15, remaining);
      ctx.drawImage(full, 31, 236, 450 * slots / 15, 40, x, y, pw * slots / 15, ph);
    }
  }

  function renderBoard() {
    if (!state || $('screen-play').hidden) return;
    var canvas = $('board');
    var view = resizeCanvas(canvas);
    var ctx = view.ctx;
    var w = view.w;
    var h = view.h;
    ctx.clearRect(0, 0, w, h);
    var cells = shownCells();
    var cam = fitCamera(cells, w, h);
    lastCam = cam;
    var breakSet = {};
    R.evaluate(cells, goal()).breakTiles.forEach(function (k) { breakSet[k] = true; });
    var legal = {};
    if (state.replay < 0 && !state.result && !state.paused) {
      R.legalCells(cells).forEach(function (cell) { legal[R.key(cell.q, cell.r)] = cell; });
    }
    Object.keys(legal).forEach(function (k) {
      var cell = legal[k];
      var p = toScreen(cell.q, cell.r, cam);
      traceHex(ctx, p.x, p.y, p.s * 0.96);
      ctx.strokeStyle = 'rgba(184, 144, 72, 0.7)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });
    var ordered = cells.slice().sort(function (a, b) {
      return toScreen(a.q, a.r, cam).y - toScreen(b.q, b.r, cam).y;
    });
    var scale = cam.sc;
    ordered.forEach(function (cell) {
      var p = toScreen(cell.q, cell.r, cam);
      drawTile(ctx, cell.id, p.x, p.y, scale, cell.rot || 0);
      traceHex(ctx, p.x, p.y, p.s * 0.98);
      ctx.strokeStyle = 'rgba(90, 68, 36, 0.55)';
      ctx.lineWidth = Math.max(1, p.s * 0.025);
      ctx.stroke();
      if (breakSet[R.key(cell.q, cell.r)]) {
        drawSprite(ctx, img('assets/props/b29-tile-state-broken.png'), p.x, p.y, scale, 0);
      }
    });
    state.marks.forEach(function (mark) {
      var p = toScreen(mark.q, mark.r, cam);
      var file = mark.kind === 'bonus' ? 'assets/props/b29-mark-bonus.png' : 'assets/props/b29-mark-migration.png';
      drawSprite(ctx, img(file), p.x, p.y - p.s * 0.15, scale * 0.72, 0);
    });
    if (state.replay < 0 && state.aim && !state.result) {
      var id = offersNow()[state.selected];
      if (id) {
        var p = toScreen(state.aim.q, state.aim.r, cam);
        var ghost = cells.concat([{ q: state.aim.q, r: state.aim.r, id: id, rot: R.normRot(state.rot) }]);
        var preview = R.evaluate(ghost, goal());
        ctx.save();
        ctx.globalAlpha = 0.86;
        drawTile(ctx, id, p.x, p.y, scale, R.normRot(state.rot));
        ctx.restore();
        drawSprite(ctx, img('assets/props/b29-tile-state-preview.png'), p.x, p.y, scale, 0);
        drawSprite(ctx, img('assets/props/b29-tile-state-selected.png'), p.x, p.y, scale, 0);
        if (preview.breakTiles.indexOf(R.key(state.aim.q, state.aim.r)) >= 0) {
          drawSprite(ctx, img('assets/props/b29-tile-state-broken.png'), p.x, p.y, scale, 0);
        }
      }
    }
    drawnSpecies = [];
    var ev = R.evaluate(cells, goal());
    var now = performance.now();
    ['forest', 'edge', 'shore'].forEach(function (kind) {
      var stand = ev.stands[kind];
      if (!stand) return;
      var spec = SPECIES[kind];
      var p = toScreen(stand.q, stand.r, cam);
      var appearing = state.appear[kind] > now;
      var file = appearing ? spec.appear : spec.idle;
      var sp = scale * 0.78;
      var y = p.y + p.s * 0.08;
      var pic = img('assets/' + file);
      if (ready(pic)) ctx.drawImage(pic, p.x - spec.ax * sp, y - spec.ay * sp, 512 * sp, 512 * sp);
      drawnSpecies.push({ kind: kind, x: p.x, y: y - 20, r: Math.max(22, p.s * 0.55) });
    });
    state.fx.forEach(function (fx) {
      var frame = Math.max(0, Math.min(7, Math.floor(fx.t * FPS)));
      var p = toScreen(fx.q, fx.r, cam);
      var file = 'assets/fx/b29-fx-' + fx.kind + '-' + (frame < 10 ? '0' : '') + frame + '.png';
      drawSprite(ctx, img(file), p.x, p.y, scale, 0);
    });
    var remaining = state._remaining;
    if (remaining === undefined) {
      var bonus = state.replay >= 0 ? bonusThrough(state.replay + 1).bonus : state.bonus;
      remaining = goal().tileLimit + bonus - (cells.length - 1);
    }
    drawPips(ctx, w, h, remaining);
    if (state.bonus > 0 && state.replay < 0) {
      drawSprite(ctx, img('assets/props/b29-mark-bonus.png'), w - 28, h - 30, 0.08, 0);
    }
  }

  function drawActor(canvas, clipName, frame, mode) {
    if (!canvas || canvas.closest('.screen').hidden && mode === 'cover') return;
    var rect = canvas.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return;
    var view = resizeCanvas(canvas);
    var ctx = view.ctx;
    ctx.clearRect(0, 0, view.w, view.h);
    var clip = CLIPS[clipName];
    var source = reduce ? stills[clipName] : (sheets[clipName] || stills[clipName]);
    if (!ready(source)) return;
    var land = document.documentElement.classList.contains('land');
    var scale;
    var ax;
    var ay;
    if (mode === 'cover') {
      scale = (land ? view.h * 0.58 : view.h * 0.42) / clip.fh;
      ax = land ? view.w * 0.24 : view.w * 0.34;
      ay = land ? view.h * 0.7 : view.h * 0.76;
      coverPos = { x: ax, y: ay, r: clip.fh * scale * 0.32 };
    } else {
      scale = Math.min(view.w / clip.fw, view.h / clip.fh) * 0.92;
      ax = view.w / 2;
      ay = view.h * 0.58;
    }
    var sx = 0;
    var sy = 0;
    var sw = clip.fw;
    var sh = clip.fh;
    if (!reduce && source instanceof HTMLCanvasElement && source.width > clip.fw + 2) {
      var col = frame % 6;
      var row = Math.floor(frame / 6) % 4;
      sx = col * clip.fw;
      sy = row * clip.fh;
    } else {
      sw = source.width;
      sh = source.height;
    }
    ctx.drawImage(source, sx, sy, sw, sh, ax - clip.ax * scale, ay - clip.ay * scale, clip.fw * scale, clip.fh * scale);
  }

  function renderNow() {
    if (document.hidden) return;
    if (!$('screen-cover').hidden) drawActor($('cover-actor'), coverClip, coverFrame, 'cover');
    if (state && !$('screen-play').hidden) {
      renderBoard();
      var meters = shownMetrics();
      drawGauge($('gauge-connect'), 'connect', meters.connectBand);
      drawGauge($('gauge-diverse'), 'diversity', meters.diversityBand);
      if (!$('result').hidden) {
        drawActor($('result-actor'), state.result === 'win' ? 'ripple' : 'look', resultFrame, 'result');
      }
    }
  }

  function tick(ts) {
    if (!lastTs) lastTs = ts;
    var dt = Math.min(0.05, (ts - lastTs) / 1000);
    lastTs = ts;
    if (!document.hidden && !reduce) {
      acc += dt;
      var step = 1 / FPS;
      while (acc >= step) {
        acc -= step;
        coverFrame = (coverFrame + 1) % 24;
        resultFrame = (resultFrame + 1) % 24;
        if (state) {
          state.fx.forEach(function (fx) { fx.t += step; });
          state.fx = state.fx.filter(function (fx) { return fx.t < 8 / FPS; });
        }
      }
    }
    frames += 1;
    renderNow();
    requestAnimationFrame(tick);
  }

  function boardPoint(ev) {
    var rect = $('board').getBoundingClientRect();
    return {
      x: ev.clientX - rect.left,
      y: ev.clientY - rect.top,
      inside: ev.clientX >= rect.left && ev.clientX <= rect.right && ev.clientY >= rect.top && ev.clientY <= rect.bottom
    };
  }

  function pickCell(x, y) {
    if (!lastCam) return null;
    var wx = (x - lastCam.ox) / lastCam.sc;
    var wy = (y - lastCam.oy) / lastCam.sc;
    var ax = R.pixelToAxial(wx, wy, R.SIZE);
    return { q: ax[0], r: ax[1] };
  }

  function arm() {
    FELT_AUDIO.arm();
    applyMusic(FELT_AUDIO.wanted());
  }

  function onCardDown(ev) {
    if (!state || state.replay >= 0 || state.paused || state.result) return;
    arm();
    var index = Number(ev.currentTarget.dataset.index);
    if (index !== state.selected) {
      state.selected = index;
      state.rot = 0;
    }
    dragging = { pointerId: ev.pointerId };
    ev.currentTarget.setPointerCapture(ev.pointerId);
    ev.preventDefault();
    sync();
  }

  function startLong(kind, ev) {
    var x = ev.clientX;
    var y = ev.clientY;
    var timer = setTimeout(function () { openDemand(kind); }, 480);
    function cancel() {
      clearTimeout(timer);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', cancel);
      window.removeEventListener('pointercancel', cancel);
    }
    function move(e) {
      if (Math.hypot(e.clientX - x, e.clientY - y) > 16) cancel();
    }
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', cancel);
    window.addEventListener('pointercancel', cancel);
  }

  function openDemand(kind) {
    if (!state) return;
    var icon = kind === 'forest' ? 'woodland' : kind;
    $('demand-icon').src = 'assets/ui/b29-ui-need-' + icon + '.png';
    $('demand-copy').textContent = R.demandCopy(state.mode, kind);
    $('demand').hidden = false;
  }

  function bind() {
    $('icon-pause').src = 'assets/ui/b29-ui-icon-pause.png';
    $('icon-replay').src = 'assets/ui/b29-ui-icon-replay.png';
    $('icon-rotate').src = 'assets/ui/b29-ui-icon-rotate.png';
    $('demand-bg').src = 'assets/ui/b29-ui-panel-demand.png';

    document.addEventListener('pointerdown', function (ev) {
      if (ev.target.closest && ev.target.closest('.music')) return;
      arm();
    }, { passive: true });

    function onMusic(ev) {
      ev.stopPropagation();
      var on = FELT_AUDIO.toggle();
      applyMusic(on);
      save();
    }
    $('cover-music').addEventListener('click', onMusic);
    $('play-music').addEventListener('click', onMusic);

    $('btn-tutor').addEventListener('click', function () { startMode('tutorial'); });
    $('btn-main').addEventListener('click', function () { startMode('main'); });
    $('btn-continue').addEventListener('click', function () {
      var data = loadSave();
      if (data) restore(data);
    });
    $('btn-confirm').addEventListener('click', confirm);
    $('btn-rotate').addEventListener('click', function () {
      if (!state || state.replay >= 0 || state.paused || state.result) return;
      state.rot = R.normRot(state.rot + 1);
      sync();
    });
    $('btn-undo').addEventListener('click', undo);
    $('btn-replay').addEventListener('click', stepReplay);
    $('btn-replay-result').addEventListener('click', enterReplay);
    $('btn-live').addEventListener('click', exitReplay);
    $('btn-pause').addEventListener('click', function () {
      if (!state || state.result) return;
      state.paused = true;
      sync();
    });
    $('btn-resume').addEventListener('click', function () {
      if (!state) return;
      state.paused = false;
      sync();
    });
    $('btn-demand-close').addEventListener('click', function () { $('demand').hidden = true; });
    $('btn-retry').addEventListener('click', function () { if (state) startMode(state.mode); });
    $('btn-next').addEventListener('click', function () { startMode('main'); });
    $('btn-cover').addEventListener('click', function () {
      if (state) state.paused = false;
      showScreen('cover');
      coverClip = 'place';
      syncContinue();
    });

    $('board').addEventListener('pointerdown', function (ev) {
      if (!state || state.paused || state.result) return;
      arm();
      var p = boardPoint(ev);
      if (state.replay >= 0) return;
      for (var i = 0; i < drawnSpecies.length; i++) {
        var sp = drawnSpecies[i];
        if (Math.hypot(p.x - sp.x, p.y - sp.y) < sp.r) {
          startLong(sp.kind, ev);
          return;
        }
      }
      var cell = pickCell(p.x, p.y);
      if (!cell || !R.isLegal(state.cells, cell.q, cell.r)) return;
      if (state.aim && state.aim.q === cell.q && state.aim.r === cell.r) state.rot = R.normRot(state.rot + 1);
      else state.aim = { q: cell.q, r: cell.r };
      ev.preventDefault();
      sync();
    });

    window.addEventListener('pointermove', function (ev) {
      if (!dragging || !state) return;
      var p = boardPoint(ev);
      if (!p.inside) return;
      var cell = pickCell(p.x, p.y);
      if (cell && R.isLegal(state.cells, cell.q, cell.r)) {
        state.aim = { q: cell.q, r: cell.r };
        sync();
      }
    });
    window.addEventListener('pointerup', function () { dragging = null; });
    window.addEventListener('pointercancel', function () { dragging = null; });

    $('cover-actor').addEventListener('pointermove', function (ev) {
      var rect = $('cover-actor').getBoundingClientRect();
      var x = ev.clientX - rect.left;
      var y = ev.clientY - rect.top;
      coverClip = Math.hypot(x - coverPos.x, y - coverPos.y) < coverPos.r ? 'look' : 'place';
    });
    $('cover-actor').addEventListener('pointerleave', function () {
      if ($('screen-cover').hidden) return;
      coverClip = 'place';
    });

    document.addEventListener('visibilitychange', function () {
      FELT_AUDIO.visibility(document.hidden);
    });
    window.addEventListener('resize', function () {
      syncStage();
      if (state) sync();
    });
    window.addEventListener('keydown', function (ev) {
      if (!state || $('screen-play').hidden) return;
      if (ev.key === 'r' || ev.key === 'R') $('btn-rotate').click();
      if (ev.key === 'Enter') confirm();
      if (ev.key === 'z' || ev.key === 'Z' || ev.key === 'Backspace') undo();
    });
  }

  function syncContinue() {
    var data = loadSave();
    $('btn-continue').hidden = !(data && data.state && data.state.history && data.state.history.length);
  }

  function boot() {
    bootSheets();
    bind();
    syncStage();
    var data = loadSave();
    if (data) {
      tutorialCleared = !!data.tutorialCleared;
      applyMusic(data.music !== false);
    }
    syncContinue();
    requestAnimationFrame(tick);
  }

  window.FELT_DEBUG = {
    selfCheck: function () { return R.selfCheck(); },
    start: startMode,
    confirm: confirm,
    undo: undo,
    rotate: function () {
      if (!state) return;
      state.rot = R.normRot(state.rot + 1);
      sync();
    },
    aim: function (q, r) {
      if (!state) return false;
      if (!R.isLegal(state.cells, q, r)) return false;
      state.aim = { q: q, r: r };
      sync();
      return true;
    },
    select: function (index) {
      if (!state) return;
      state.selected = index;
      sync();
    },
    placeAt: function (id, q, r, rot) {
      if (!state) return { ok: false };
      var offers = offersNow();
      var index = offers.indexOf(id);
      if (index < 0) return { ok: false, offers: offers };
      state.selected = index;
      state.rot = rot || 0;
      if (!R.isLegal(state.cells, q, r)) return { ok: false, legal: false };
      state.aim = { q: q, r: r };
      var ok = confirm();
      var ev = R.evaluate(state.cells, goal());
      return { ok: ok, result: state.result, win: ev.win, breaks: ev.breaks, species: ev.species, remaining: state._remaining };
    },
    frames: function () { return frames; },
    render: function () { renderNow(); },
    cellPoint: function (q, r) {
      if (!lastCam) return null;
      var p = toScreen(q, r, lastCam);
      var rect = $('board').getBoundingClientRect();
      return { x: rect.left + p.x, y: rect.top + p.y, sx: p.x, sy: p.y };
    },
    snapshot: function () {
      if (!state) return { screen: screenName };
      var ev = R.evaluate(shownCells(), goal());
      return {
        screen: screenName,
        mode: state.mode,
        result: state.result,
        placed: state.cells.length - 1,
        remaining: state._remaining,
        bonus: state.bonus,
        breaks: ev.breaks,
        species: ev.species,
        win: ev.win,
        connect: ev.connect,
        diversity: ev.diversity,
        offers: offersNow(),
        rot: state.rot,
        replay: state.replay,
        music: FELT_AUDIO.wanted(),
        audio: FELT_AUDIO.state()
      };
    },
    saveRaw: function () { return localStorage.getItem(SAVE_KEY); },
    reload: function () {
      var data = loadSave();
      if (data) restore(data);
      return window.FELT_DEBUG.snapshot();
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
