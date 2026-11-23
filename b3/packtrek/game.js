/* 行囊远征
 * 营地里整理背包，选一条路，确认后锁包并自动走完这一段。
 * 邻接顺序：取暖，供能，触发。用尽的物件离开格子，不会自动补满。
 */
(function () {
  'use strict';

  var SAVE_KEY = 'packtrek_save_v1';
  var SIM = window.PACK_SIM;
  var AUDIO = window.PACK_AUDIO;
  var REDUCE = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var ANIMS = {
    'glow-pulse': { fw: 382, fh: 460, cols: 6, rows: 4, n: 24, fps: 12, ax: 187.8747077177767, ay: 262.6752218692243, sheet: 'assets/anim/b07-mascot-sheet-glow-pulse.webp', still: 'assets/anim/b07-mascot-still-glow-pulse.png' },
    'clasp-nod': { fw: 374, fh: 468, cols: 6, rows: 4, n: 24, fps: 12, ax: 184.8809699457282, ay: 272.6603478964234, sheet: 'assets/anim/b07-mascot-sheet-clasp-nod.webp', still: 'assets/anim/b07-mascot-still-clasp-nod.png' },
    'warm-wisp': { fw: 372, fh: 616, cols: 6, rows: 4, n: 24, fps: 12, ax: 183.87830825724453, ay: 419.65958706380457, sheet: 'assets/anim/b07-mascot-sheet-warm-wisp.webp', still: 'assets/anim/b07-mascot-still-warm-wisp.png' }
  };

  var COVERS = {
    portrait: { imgW: 864, imgH: 1152, bbox: { x: 60, y: 735, w: 329, h: 400 }, bg: 'assets/cover/b07-cover-bg-3x4.webp' },
    landscape: { imgW: 1280, imgH: 720, bbox: { x: 26, y: 153, w: 461, h: 560 }, bg: 'assets/cover/b07-cover-bg-16x9.webp' }
  };

  var GRIDS = {
    tutorial: { art: 'assets/grid/b07-grid-4x4.webp', imgW: 1024, imgH: 1024, inner: { x: 130, y: 187, w: 805, h: 764 }, cols: 4, rows: 4, ovW: 1280 / 1024, ovH: 1536 / 1024 },
    trek: { art: 'assets/grid/b07-grid-5x6.webp', imgW: 1280, imgH: 1536, inner: { x: 130, y: 187, w: 1006, h: 1142 }, cols: 5, rows: 6, ovW: 1, ovH: 1 }
  };

  var COACH = {
    tutorial: [
      '先选路。平路最稳。点背包里的物件可以旋转，拖它换格子，或拖回备品。',
      '薄霜要让火把贴住保温袋。按住「预览」，看橙色的取暖箭头。',
      '泥路要让斧头贴住罗盘。绳卷很沉，这一段留在备品里更轻松。',
      '出发前看预计的补给和耐久。用尽的东西不会自己回来。'
    ],
    trek: [
      '两条路先看预告。暖炉、食物、罗盘和斧头，靠得近才有用。',
      '深霜会压低负重上限。没贴着暖炉的煤，拿掉往往更轻。',
      '矿石可以留下，也可以放弃。留下会让后面的路更沉。',
      '走完这一段时，补给和耐久都还在，才算抵达。'
    ]
  };

  var HELP = [
    '一格只能放一件。脚印重叠，或伸出背包，就不能出发。',
    '点一下背包里的物件，顺时针转 90 度。暖炉、保温袋、干粮袋、搪瓷杯、罗盘转脚印时，画面仍朝上。',
    '按住「预览」，能看见邻接箭头，以及这一段的预计结果。',
    '点「出发」之后，这一段不能再改背包。',
    '食物按路段吃掉，工具被触发才减耐久。用尽的物件腾出格子，不会自动补满。',
    '邻接顺序固定：取暖，供能，触发。出发前会写明谁受益。',
    '四段都走完，补给和耐久都还剩下，才算抵达。否则撤退，并写明是哪一段没准备好。',
    '有的东西拿掉，队伍反而更稳。负重、霉变和没被暖到的金属，都会拖后腿。'
  ];

  var meta = loadMeta();
  var run = null;
  var selected = null;
  var stashOpen = false;
  var peekOn = false;
  var coverScale = 0.4;
  var sprites = [];
  var sheetSrc = {};
  var playTimer = 0;
  var toastTimer = 0;
  var ptr = null;
  var holdTimer = 0;
  var armed = false;

  function $(id) { return document.getElementById(id); }

  function loadMeta() {
    try {
      var raw = localStorage.getItem(SAVE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (err) { /* 坏档就当新的 */ }
    return { music: true, tutorialCleared: false, trekCleared: false, run: null };
  }

  function save() {
    meta.run = run ? SIM.clone(run) : null;
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(meta)); } catch (err) { /* 隐私模式可能写不进 */ }
  }

  function syncLand() {
    document.documentElement.classList.toggle('land', window.innerWidth > window.innerHeight);
  }

  function itemSrc(it) {
    var def = SIM.ITEMS[it.id];
    if (!def) return '';
    if (def.upright || !it.rot) return 'assets/items/b07-item-' + it.id + '.png';
    return 'assets/items/b07-item-' + it.id + '-r' + (it.rot * 90) + '.png';
  }

  function spawn(id) {
    var def = SIM.ITEMS[id];
    return {
      uid: run.nextUid++,
      id: id,
      rot: 0,
      c: null,
      r: null,
      charges: def.charges == null ? null : def.charges,
      dur: def.dur == null ? null : def.dur
    };
  }

  function gridSpec() {
    return GRIDS[(run && run.mode) || 'trek'];
  }

  function currentEncounter() {
    if (!run || run.route == null) return null;
    var pair = SIM.segmentChoices(run.mode, Math.min(run.segment, 3));
    return pair[run.route === 'b' ? 1 : 0];
  }

  function bgFor(kind) {
    var land = document.documentElement.classList.contains('land');
    if (kind === 'ice') return land ? 'assets/bg/b07-bg-ice-1920x1080.webp' : 'assets/bg/b07-bg-ice-1080x1920.webp';
    if (kind === 'mud') return land ? 'assets/bg/b07-bg-mud-1920x1080.webp' : 'assets/bg/b07-bg-mud-1080x1920.webp';
    return land ? 'assets/bg/b07-bg-1920x1080.webp' : 'assets/bg/b07-bg-1080x1920.webp';
  }

  function toast(text) {
    var el = $('toast');
    el.textContent = text;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.hidden = true; }, 1600);
  }

  function setMusicButtons() {
    var on = AUDIO.wanted();
    document.querySelectorAll('[data-music]').forEach(function (btn) {
      btn.classList.toggle('off', !on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  function armAudio() {
    if (armed) return;
    armed = true;
    AUDIO.setWanted(meta.music !== false);
    AUDIO.arm();
    setMusicButtons();
  }

  function toggleMusic(event) {
    event.stopPropagation();
    if (!armed) {
      armed = true;
      AUDIO.setWanted(meta.music !== false);
    }
    meta.music = AUDIO.toggle();
    AUDIO.arm();
    save();
    setMusicButtons();
  }

  function mountSprite(host, scaleFn, getAnim) {
    if (!host || host.dataset.ready) return;
    host.dataset.ready = '1';
    var sheet = document.createElement('div');
    sheet.className = 'sprite-sheet';
    sheet.setAttribute('role', 'img');
    sheet.setAttribute('aria-label', '暖囊');
    var hit = document.createElement('div');
    hit.className = 'sprite-hit';
    hit.setAttribute('aria-label', '暖囊');
    host.appendChild(sheet);
    host.appendChild(hit);
    var sp = { host: host, sheet: sheet, hit: hit, scale: scaleFn, anim: 'glow-pulse', frame: 0, acc: 0, lock: null, hover: false, base: getAnim || function () { return 'glow-pulse'; } };
    function use(name) {
      if (sp.anim === name) return;
      sp.anim = name;
      sp.frame = 0;
      sp.acc = 0;
      ensureSheet(name);
    }
    hit.addEventListener('pointerenter', function () {
      sp.hover = true;
      if (!sp.lock) use('clasp-nod');
    });
    hit.addEventListener('pointerleave', function () {
      sp.hover = false;
      if (!sp.lock) use(sp.base());
    });
    hit.addEventListener('pointerdown', function (event) {
      event.stopPropagation();
      armAudio();
      sp.lock = 'warm-wisp';
      use('warm-wisp');
    });
    sprites.push(sp);
    ensureSheet('glow-pulse');
  }

  function ensureSheet(name) {
    if (sheetSrc[name]) return;
    var probe = new Image();
    probe.onload = function () { sheetSrc[name] = ANIMS[name].sheet; };
    probe.onerror = function () { sheetSrc[name] = ANIMS[name].still; };
    probe.src = ANIMS[name].sheet;
  }

  function drawSprite(sp) {
    if (sp.host.offsetParent === null && sp.host.id !== 'result-anchor') return;
    var anim = ANIMS[sp.anim];
    var scale = sp.scale();
    if (!scale) return;
    var w = anim.fw * scale;
    var h = anim.fh * scale;
    sp.sheet.style.width = w + 'px';
    sp.sheet.style.height = h + 'px';
    sp.sheet.style.left = (-anim.ax * scale) + 'px';
    sp.sheet.style.top = (-anim.ay * scale) + 'px';
    sp.hit.style.width = (150 * scale) + 'px';
    sp.hit.style.height = (170 * scale) + 'px';
    sp.hit.style.left = (-75 * scale) + 'px';
    sp.hit.style.top = (-70 * scale) + 'px';
    var src = REDUCE ? anim.still : (sheetSrc[sp.anim] || anim.sheet);
    sp.sheet.style.backgroundImage = 'url("' + src + '")';
    if (REDUCE || src === anim.still) {
      sp.sheet.style.backgroundSize = w + 'px ' + h + 'px';
      sp.sheet.style.backgroundPosition = '0 0';
      return;
    }
    var col = sp.frame % anim.cols;
    var row = Math.floor(sp.frame / anim.cols);
    sp.sheet.style.backgroundSize = (w * anim.cols) + 'px ' + (h * anim.rows) + 'px';
    sp.sheet.style.backgroundPosition = (-col * w) + 'px ' + (-row * h) + 'px';
  }

  function placeCoverAnchor() {
    var stage = $('cover-stage');
    if (!stage || $('screen-cover').hidden) return;
    var rect = stage.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    var land = rect.width > rect.height;
    var cover = land ? COVERS.landscape : COVERS.portrait;
    var fit = Math.max(rect.width / cover.imgW, rect.height / cover.imgH);
    var drawnW = cover.imgW * fit;
    var drawnH = cover.imgH * fit;
    var ox = (rect.width - drawnW) / 2;
    var oy = (rect.height - drawnH) / 2;
    var per = cover.bbox.w / ANIMS['glow-pulse'].fw;
    coverScale = per * fit;
    var host = $('cover-anchor');
    host.style.left = (ox + (cover.bbox.x + ANIMS['glow-pulse'].ax * per) * fit) + 'px';
    host.style.top = (oy + (cover.bbox.y + ANIMS['glow-pulse'].ay * per) * fit) + 'px';
    var img = $('cover-bg');
    if (img.getAttribute('src') !== cover.bg) img.src = cover.bg;
  }

  var lastFrame = 0;
  function frame(now) {
    if (!lastFrame) lastFrame = now;
    var dt = Math.min(64, now - lastFrame);
    lastFrame = now;
    placeCoverAnchor();
    sprites.forEach(function (sp) {
      var anim = ANIMS[sp.anim];
      if (!REDUCE) {
        sp.acc += dt;
        var spf = 1000 / anim.fps;
        while (sp.acc >= spf) {
          sp.acc -= spf;
          sp.frame = (sp.frame + 1) % anim.n;
          if (sp.lock && sp.frame === 0) {
            sp.lock = null;
            sp.anim = sp.hover ? 'clasp-nod' : sp.base();
            sp.frame = 0;
          }
        }
      }
      drawSprite(sp);
    });
    if (!$('result-layer').hidden) drawFx();
    requestAnimationFrame(frame);
  }

  var fxTick = 0;
  var fxName = 'victory';
  function drawFx() {
    if (REDUCE) return;
    fxTick += 1;
    if (fxTick % 6 !== 0) return;
    var img = $('fx-frame');
    var n = (Math.floor(fxTick / 6) % 8) + 1;
    img.src = 'assets/fx/b07-fx-' + fxName + '-' + n + '.png';
  }

  function showCover() {
    $('screen-cover').hidden = false;
    $('screen-play').hidden = true;
    $('result-layer').hidden = true;
    $('loot-layer').hidden = true;
    renderCover();
  }

  function renderCover() {
    var box = $('cover-actions');
    box.innerHTML = '';
    if (meta.run && meta.run.phase !== 'victory') {
      box.appendChild(gold('继续这一趟', function () { enterRun(meta.run); }));
    }
    box.appendChild(gold('暖囊初途', function () { askStart('tutorial'); }));
    box.appendChild(gold('四段远征', function () { askStart('trek'); }));
    var help = document.createElement('button');
    help.type = 'button';
    help.className = 'btn';
    help.textContent = '怎么玩';
    help.addEventListener('click', function () { openHelp(); });
    box.appendChild(help);
    if (meta.tutorialCleared || meta.trekCleared) {
      var note = document.createElement('p');
      note.className = 'sub';
      var bits = [];
      if (meta.tutorialCleared) bits.push('初途已抵达');
      if (meta.trekCleared) bits.push('四段已抵达');
      note.textContent = bits.join('，') + '。';
      box.appendChild(note);
    }
  }

  function gold(text, fn) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-gold';
    btn.textContent = text;
    btn.addEventListener('click', function () { armAudio(); fn(); });
    return btn;
  }

  function askStart(mode) {
    if (!meta.run || meta.run.phase === 'victory') {
      begin(mode);
      return;
    }
    $('ask-title').textContent = mode === 'tutorial' ? '重开初途' : '重开远征';
    $('ask-copy').textContent = '当前进度会换成新的一趟。';
    $('ask-layer').hidden = false;
    $('ask-yes').onclick = function () { $('ask-layer').hidden = true; begin(mode); };
    $('ask-no').onclick = function () { $('ask-layer').hidden = true; };
  }

  function begin(mode) {
    run = SIM.createRun(mode);
    selected = null;
    stashOpen = window.innerWidth > window.innerHeight;
    peekOn = false;
    meta.run = null;
    enterRun(run);
  }

  function primePlayArt() {
    document.querySelectorAll('[data-src]').forEach(function (img) {
      if (!img.getAttribute('src')) img.src = img.getAttribute('data-src');
    });
  }

  function enterRun(saved) {
    primePlayArt();
    run = SIM.clone(saved);
    if (run.phase === 'resolve') {
      if (run.snapshot) {
        var snap = SIM.clone(run.snapshot);
        snap.phase = 'camp';
        snap.playback = null;
        run = snap;
      } else run.phase = 'camp';
    }
    $('screen-cover').hidden = true;
    $('screen-play').hidden = false;
    if (window.innerWidth > window.innerHeight) stashOpen = true;
    save();
    render();
  }

  function layoutBoard() {
    if (!run || $('screen-play').hidden) return;
    var zone = $('zone-grid').getBoundingClientRect();
    var spec = gridSpec();
    if (!zone.width || !zone.height) return;
    var scale = Math.min(zone.width / spec.imgW, zone.height / spec.imgH);
    var board = $('board');
    board.style.width = (spec.imgW * scale) + 'px';
    board.style.height = (spec.imgH * scale) + 'px';
    var box = $('cell-box');
    box.style.left = (spec.inner.x * scale) + 'px';
    box.style.top = (spec.inner.y * scale) + 'px';
    box.style.width = (spec.inner.w * scale) + 'px';
    box.style.height = (spec.inner.h * scale) + 'px';
    var frost = $('ov-frost');
    var mud = $('ov-mud');
    [frost, mud].forEach(function (img) {
      img.style.width = (spec.ovW * 100) + '%';
      img.style.height = (spec.ovH * 100) + '%';
    });
    var cells = $('cells');
    cells.style.gridTemplateColumns = 'repeat(' + spec.cols + ', 1fr)';
    cells.style.gridTemplateRows = 'repeat(' + spec.rows + ', 1fr)';
  }

  function render() {
    if (!run) return;
    syncLand();
    var enc = currentEncounter();
    var spec = gridSpec();
    $('board-art').src = spec.art;
    $('play-bg').src = bgFor(enc ? enc.bg : 'camp');
    $('ov-frost').classList.toggle('on', !!(enc && enc.ice > 0));
    $('ov-mud').classList.toggle('on', !!(enc && enc.mud > 0));
    $('screen-play').classList.toggle('is-locked', run.phase !== 'camp');
    renderMeters();
    renderBadges(enc);
    renderEncounter(enc);
    renderNodes();
    renderForecast(enc);
    renderPicks(enc);
    renderTools();
    renderCells();
    renderPieces();
    renderArrows(enc);
    renderStash();
    renderPeek(enc);
    renderBanner();
    layoutBoard();
    $('loot-layer').hidden = run.phase !== 'loot';
    if (run.phase === 'loot') renderLoot(enc);
    var showResult = run.phase === 'victory' || run.phase === 'retreat';
    $('result-layer').hidden = !showResult;
    if (showResult) renderResult();
    if (run.phase === 'resolve') ensurePlayback();
  }

  function renderMeters() {
    paintMeter('supply', run.supply, '补给');
    paintMeter('durability', run.durability, '耐久');
  }

  function paintMeter(kind, value, label) {
    var ratio = Math.max(0, Math.min(1, value / 100));
    var clip = $(kind + '-meter').querySelector('.meter-clip');
    clip.style.setProperty('--r', String(ratio));
    var fill = $(kind + '-fill');
    var low = ratio < 0.3;
    var next = 'assets/ui/b07-ui-' + kind + (low ? '-fill-low.png' : '-fill.png');
    if (fill.getAttribute('src') !== next) fill.src = next;
    $(kind + '-label').textContent = label + ' ' + Math.round(value);
  }

  function renderBadges(enc) {
    var box = $('badges');
    box.innerHTML = '';
    if (!enc) return;
    var keys = enc.badges.slice();
    if (run.phase === 'camp') {
      var weight = 0;
      run.pack.forEach(function (it) { weight += SIM.ITEMS[it.id].w; });
      if (weight > enc.threshold && keys.indexOf('encumbrance') < 0) keys.push('encumbrance');
    }
    keys.forEach(function (key) {
      var img = document.createElement('img');
      img.src = 'assets/ui/b07-ui-badge-' + key + '.png';
      img.alt = badgeName(key);
      box.appendChild(img);
    });
  }

  function badgeName(key) {
    return { ice: '霜', mud: '泥', shortage: '短缺', fatigue: '疲劳', encumbrance: '负重' }[key] || '';
  }

  function renderEncounter(enc) {
    var art = $('enc-art');
    if (enc && enc.art) {
      art.hidden = false;
      art.src = 'assets/encounters/b07-enc-' + enc.art + '.webp';
    } else {
      art.hidden = true;
      art.removeAttribute('src');
    }
    var cap = $('enc-caption');
    if (!enc) cap.textContent = '先看两条路的预告，再选一条。';
    else {
      var extra = '';
      if (run.phase === 'camp' && SIM.validate(run).ok) {
        extra = SIM.resolve(run, enc).log.filter(function (row) {
          return (row.phase === 'harm' || row.phase === 'end') && row.kind === 'bad';
        }).map(function (row) { return row.text; }).join('');
      }
      cap.textContent = '第 ' + (run.segment + 1) + ' 段 · ' + enc.name + '。' + enc.blurb + extra;
    }
  }

  function renderNodes() {
    var box = $('nodes');
    box.innerHTML = '';
    for (var i = 0; i < 4; i++) {
      var img = document.createElement('img');
      img.className = 'node' + (i === run.segment ? ' now' : '');
      var file = 'empty';
      if (i < run.segment) file = 'cleared';
      else if (i === run.segment) file = run.phase === 'camp' ? 'camp' : 'current';
      else if (i === 3) file = 'goal';
      else file = 'encounter';
      img.src = 'assets/ui/b07-ui-node-' + file + '.png';
      img.alt = '第 ' + (i + 1) + ' 段';
      box.appendChild(img);
    }
  }

  function previewOf(enc) {
    if (!enc || run.phase !== 'camp') return null;
    return SIM.resolve(run, enc);
  }

  function renderForecast(enc) {
    var el = $('forecast');
    if (run.phase === 'resolve' && run.playback) {
      var line = run.playback.log[Math.max(0, run.playback.index - 1)];
      el.textContent = line ? line.text : '这一段开始走了。';
      return;
    }
    if (!enc) {
      el.textContent = run.banner || coachLine();
      return;
    }
    var view = SIM.validate(run);
    if (!view.ok) {
      el.textContent = view.reason + '，现在不能出发。';
      return;
    }
    var preview = previewOf(enc);
    if (!preview) {
      el.textContent = run.banner || coachLine();
      return;
    }
    var end = preview.log.filter(function (row) { return row.phase === 'end'; }).pop();
    el.textContent = end ? '预计：' + end.text : coachLine();
  }

  function coachLine() {
    var list = COACH[run.mode] || COACH.trek;
    return list[Math.min(run.segment, list.length - 1)];
  }

  function renderPicks() {
    var box = $('route-picks');
    box.innerHTML = '';
    if (run.phase !== 'camp') return;
    var pair = SIM.segmentChoices(run.mode, run.segment);
    pair.forEach(function (enc, index) {
      var side = index === 0 ? 'a' : 'b';
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'route-choice' + (run.route === side ? ' on' : '');
      var title = document.createElement('b');
      title.textContent = enc.name;
      var sub = document.createElement('small');
      var bits = [];
      if (enc.ice) bits.push('霜 ' + enc.ice);
      if (enc.mud) bits.push('泥 ' + enc.mud);
      bits.push('消耗 ' + enc.supply);
      sub.textContent = bits.join('，');
      btn.appendChild(title);
      btn.appendChild(sub);
      btn.addEventListener('click', function () {
        if (run.phase !== 'camp') return;
        run.route = side;
        save();
        render();
      });
      box.appendChild(btn);
    });
  }

  function renderTools() {
    var box = $('tool-row');
    box.innerHTML = '';
    if (run.phase === 'resolve') {
      box.appendChild(textBtn(run.playback && run.playback.speed === 2 ? '原速' : '加快', function () { toggleSpeed(); }));
      box.appendChild(textBtn('跳过', function () { skipPlayback(); }));
      box.appendChild(textBtn('回放', function () { replay(); }));
      return;
    }
    if (run.phase !== 'camp') return;
    box.appendChild(imgBtn('assets/ui/b07-ui-btn-rotate.png', '旋转', function () { rotateSelected(); }));
    box.appendChild(imgBtn('assets/ui/b07-ui-btn-remove.png', '卸下', function () { stashSelected(); }));
    box.appendChild(textBtn(stashOpen ? '收起' : '备品', function () {
      stashOpen = !stashOpen;
      renderStash();
    }));
    var hold = textBtn('预览', function () {});
    hold.addEventListener('pointerdown', function (event) {
      event.preventDefault();
      peekOn = true;
      renderPeek(currentEncounter());
      renderArrows(currentEncounter());
    });
    hold.addEventListener('pointerup', endPeek);
    hold.addEventListener('pointercancel', endPeek);
    hold.addEventListener('pointerleave', function (event) {
      if (event.buttons) endPeek();
    });
    box.appendChild(hold);
    var go = imgBtn('assets/ui/b07-ui-btn-confirm.png', '出发', function () { confirmDepart(); });
    var enc = currentEncounter();
    var valid = enc && SIM.validate(run).ok;
    go.disabled = !valid;
    box.appendChild(go);
  }

  function textBtn(label, fn) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn';
    btn.textContent = label;
    btn.addEventListener('click', fn);
    return btn;
  }

  function imgBtn(src, label, fn) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'img-btn';
    var img = document.createElement('img');
    img.src = src;
    img.alt = '';
    var span = document.createElement('span');
    span.textContent = label;
    btn.appendChild(img);
    btn.appendChild(span);
    btn.addEventListener('click', fn);
    return btn;
  }

  function endPeek() {
    peekOn = false;
    renderPeek(currentEncounter());
    renderArrows(currentEncounter());
  }

  function renderCells() {
    var spec = gridSpec();
    var mask = SIM.MASKS[run.mode];
    var box = $('cells');
    box.innerHTML = '';
    for (var r = 0; r < spec.rows; r++) {
      for (var c = 0; c < spec.cols; c++) {
        var cell = document.createElement('div');
        cell.className = 'cell' + (mask[r][c] ? '' : ' block');
        cell.dataset.c = String(c);
        cell.dataset.r = String(r);
        box.appendChild(cell);
      }
    }
  }

  function packForView() {
    if (run.phase === 'resolve' && run.snapshot) return run.snapshot.pack;
    return run.pack;
  }

  function renderPieces() {
    var spec = gridSpec();
    var box = $('pieces');
    box.innerHTML = '';
    var gone = goneSet();
    packForView().forEach(function (it) {
      if (it.c == null) return;
      var fp = SIM.footprint(it.id, it.rot);
      var size = SIM.bounds(fp);
      var piece = document.createElement('button');
      piece.type = 'button';
      piece.className = 'piece';
      if (selected === it.uid) piece.classList.add('on');
      if (gone[it.uid]) piece.classList.add('dim');
      piece.style.left = (it.c / spec.cols * 100) + '%';
      piece.style.top = (it.r / spec.rows * 100) + '%';
      piece.style.width = (size.w / spec.cols * 100) + '%';
      piece.style.height = (size.h / spec.rows * 100) + '%';
      var img = document.createElement('img');
      img.src = itemSrc(it);
      img.alt = SIM.ITEMS[it.id].name;
      piece.appendChild(img);
      var left = it.charges != null ? it.charges : it.dur;
      if (left != null) {
        var count = document.createElement('span');
        count.className = 'count';
        count.textContent = String(left);
        piece.appendChild(count);
      }
      piece.addEventListener('pointerdown', function (event) { onPointerDown(event, it.uid); });
      box.appendChild(piece);
    });
  }

  function goneSet() {
    var map = {};
    if (!(run.phase === 'resolve' && run.playback)) return map;
    var log = run.playback.log;
    var upto = run.playback.index;
    for (var i = 0; i < upto && i < log.length; i++) {
      if (log[i].event === 'gone' && log[i].uid) map[log[i].uid] = true;
    }
    return map;
  }

  function renderArrows(enc) {
    var box = $('arrows');
    box.innerHTML = '';
    var spec = gridSpec();
    var arrows = [];
    if (peekOn && run.phase === 'camp' && enc && SIM.validate(run).ok) arrows = SIM.resolve(run, enc).arrows;
    arrows.forEach(function (arrow) {
      var img = document.createElement('img');
      img.className = 'arrow';
      img.alt = '';
      img.src = 'assets/ui/b07-ui-arrow-' + arrow.type + '-' + arrow.dir + '-preview.png';
      var left = arrow.c;
      var top = arrow.r;
      if (arrow.dir === 'up') { left += 0.5; }
      if (arrow.dir === 'down') { left += 0.5; top += 1; }
      if (arrow.dir === 'left') { top += 0.5; }
      if (arrow.dir === 'right') { left += 1; top += 0.5; }
      img.style.left = (left / spec.cols * 100) + '%';
      img.style.top = (top / spec.rows * 100) + '%';
      img.style.width = (1 / spec.cols * 70) + '%';
      box.appendChild(img);
    });
  }

  function renderPeek(enc) {
    var el = $('peek');
    if (!peekOn || run.phase !== 'camp' || !enc) {
      el.hidden = true;
      return;
    }
    var view = SIM.validate(run);
    el.hidden = false;
    if (!view.ok) {
      el.innerHTML = '<h3>还不能出发</h3><p>' + view.reason + '</p>';
      return;
    }
    var preview = SIM.resolve(run, enc);
    var who = {};
    preview.beneficiaries.forEach(function (row) {
      who[row.phase + row.name] = row;
    });
    var lines = Object.keys(who).map(function (key) {
      var row = who[key];
      var phase = row.phase === 'heat' ? '取暖' : row.phase === 'energy' ? '供能' : '触发';
      return '<li>' + phase + '：' + row.name + '，' + row.why + '</li>';
    }).join('');
    var harm = preview.log.filter(function (row) {
      return row.phase === 'harm' || row.phase === 'end' || row.phase === 'food' || row.phase === 'weight';
    }).map(function (row) {
      return '<p class="log-line ' + row.kind + '">' + row.text + '</p>';
    }).join('');
    el.innerHTML = '<h3>' + enc.name + ' 的预计</h3><ul>' + (lines || '<li>这一摆法没有邻接受益。</li>') + '</ul>' + harm;
  }

  function renderStash() {
    var tray = $('stash-tray');
    var show = stashOpen && run.phase === 'camp';
    tray.hidden = !show;
    if (!show) return;
    tray.innerHTML = '';
    var close = textBtn('收起备品', function () { stashOpen = false; renderStash(); });
    tray.appendChild(close);
    run.stash.forEach(function (it) {
      var chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip' + (selected === it.uid ? ' on' : '');
      var img = document.createElement('img');
      img.src = itemSrc(it);
      img.alt = '';
      var name = document.createElement('span');
      name.textContent = SIM.ITEMS[it.id].name;
      var sub = document.createElement('small');
      sub.textContent = '负重 ' + SIM.ITEMS[it.id].w;
      chip.appendChild(img);
      chip.appendChild(name);
      chip.appendChild(sub);
      chip.addEventListener('pointerdown', function (event) { onPointerDown(event, it.uid); });
      tray.appendChild(chip);
    });
  }

  function renderBanner() {
    var el = $('banner');
    el.hidden = true;
  }

  function renderLoot(enc) {
    var id = enc && enc.loot;
    var def = id && SIM.ITEMS[id];
    $('loot-title').textContent = enc ? enc.name : '战利品';
    $('loot-copy').textContent = def
      ? '可以留下' + def.name + '。' + def.blurb
      : '这里没有要带的东西。';
    var box = $('loot-item');
    box.innerHTML = '';
    if (def) {
      var img = document.createElement('img');
      img.src = 'assets/items/b07-item-' + id + '.png';
      img.alt = def.name;
      var text = document.createElement('p');
      text.textContent = def.name + '，负重 ' + def.w + '。';
      box.appendChild(img);
      box.appendChild(text);
    }
  }

  function renderResult() {
    var win = run.phase === 'victory';
    fxName = win ? 'victory' : 'retreat';
    $('fx-frame').src = 'assets/fx/b07-fx-' + fxName + '-1.png';
    $('result-kicker').textContent = win ? '抵达' : '撤退';
    $('result-title').textContent = win ? (run.mode === 'tutorial' ? '初途走完了' : '四段走完了') : '这一段还没准备好';
    $('result-copy').textContent = run.banner || '';
    sprites.forEach(function (sp) {
      if (sp.host.id !== 'result-anchor') return;
      var name = win ? 'warm-wisp' : 'clasp-nod';
      sp.base = function () { return name; };
      if (!sp.lock && sp.anim !== name) {
        sp.anim = name;
        sp.frame = 0;
        ensureSheet(name);
      }
    });
    var box = $('result-actions');
    box.innerHTML = '';
    if (!win) {
      box.appendChild(gold('回到营地再整', function () { restoreCamp(); }));
    } else {
      box.appendChild(gold(run.mode === 'tutorial' ? '去四段远征' : '再走一趟', function () {
        begin(run.mode === 'tutorial' ? 'trek' : run.mode);
      }));
    }
    box.appendChild(textBtn('回封面', function () { showCover(); }));
  }

  function onPointerDown(event, uid) {
    if (!SIM.canEdit(run)) return;
    event.preventDefault();
    armAudio();
    var found = SIM.findItem(run, uid);
    if (!found) return;
    selected = uid;
    ptr = {
      uid: uid,
      x: event.clientX,
      y: event.clientY,
      dragged: false,
      held: false,
      local: grabLocal(found.item, event.clientX, event.clientY)
    };
    clearTimeout(holdTimer);
    holdTimer = setTimeout(function () {
      if (ptr && ptr.uid === uid && !ptr.dragged) {
        ptr.held = true;
        peekOn = true;
        renderPeek(currentEncounter());
        renderArrows(currentEncounter());
      }
    }, 450);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  }

  function grabLocal(item, x, y) {
    if (item.c == null) {
      var size = SIM.bounds(SIM.footprint(item.id, item.rot));
      return { c: Math.floor((size.w - 1) / 2), r: Math.floor((size.h - 1) / 2) };
    }
    var at = cellAt(x, y);
    if (!at) return { c: 0, r: 0 };
    return { c: Math.max(0, at.c - item.c), r: Math.max(0, at.r - item.r) };
  }

  function cellAt(x, y) {
    var rect = $('cell-box').getBoundingClientRect();
    var spec = gridSpec();
    if (!rect.width || x < rect.left || y < rect.top || x > rect.right || y > rect.bottom) return null;
    var c = Math.floor((x - rect.left) / rect.width * spec.cols);
    var r = Math.floor((y - rect.top) / rect.height * spec.rows);
    if (c < 0 || r < 0 || c >= spec.cols || r >= spec.rows) return null;
    return { c: c, r: r };
  }

  function onPointerMove(event) {
    if (!ptr) return;
    var dx = event.clientX - ptr.x;
    var dy = event.clientY - ptr.y;
    if (!ptr.dragged && Math.hypot(dx, dy) > 10) {
      ptr.dragged = true;
      ptr.held = false;
      clearTimeout(holdTimer);
      if (peekOn) endPeek();
      showGhost(ptr.uid);
    }
    if (ptr.dragged) {
      moveGhost(event.clientX, event.clientY);
      highlight(event.clientX, event.clientY);
    }
  }

  function onPointerUp(event) {
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    clearTimeout(holdTimer);
    if (!ptr) return;
    var info = ptr;
    ptr = null;
    removeGhost();
    clearHighlight();
    if (info.held && !info.dragged) {
      endPeek();
      renderPieces();
      return;
    }
    if (info.dragged) {
      drop(info, event.clientX, event.clientY);
      return;
    }
    var found = SIM.findItem(run, info.uid);
    if (!found) return;
    if (found.where === 'pack') {
      var turned = SIM.tryRotate(run, info.uid);
      if (!turned.ok) toast(turned.reason);
      else if (turned.upright) toast('这件保持立面，占格跟着转。');
    }
    save();
    render();
  }

  function drop(info, x, y) {
    if (!SIM.canEdit(run)) return;
    var at = cellAt(x, y);
    if (!at) {
      var stashed = SIM.tryStash(run, info.uid);
      if (!stashed.ok) toast(stashed.reason);
      save();
      render();
      return;
    }
    var originC = at.c - info.local.c;
    var originR = at.r - info.local.r;
    var placed = SIM.tryPlace(run, info.uid, originC, originR);
    if (!placed.ok) toast(placed.reason);
    save();
    render();
  }

  function showGhost(uid) {
    var found = SIM.findItem(run, uid);
    if (!found) return;
    var ghost = document.createElement('img');
    ghost.id = 'drag-ghost';
    ghost.className = 'drag-ghost';
    ghost.src = itemSrc(found.item);
    ghost.alt = '';
    ghost.style.width = '72px';
    document.body.appendChild(ghost);
  }

  function moveGhost(x, y) {
    var ghost = $('drag-ghost');
    if (!ghost) return;
    ghost.style.left = x + 'px';
    ghost.style.top = y + 'px';
  }

  function removeGhost() {
    var ghost = $('drag-ghost');
    if (ghost) ghost.remove();
  }

  function highlight(x, y) {
    clearHighlight();
    if (!ptr) return;
    var found = SIM.findItem(run, ptr.uid);
    if (!found) return;
    var at = cellAt(x, y);
    if (!at) return;
    var originC = at.c - ptr.local.c;
    var originR = at.r - ptr.local.r;
    var check = SIM.placement(run, found.item, originC, originR, found.item.uid);
    var cells = check.ok ? check.cells : SIM.footprint(found.item.id, found.item.rot).map(function (p) {
      return [originC + p[0], originR + p[1]];
    });
    cells.forEach(function (p) {
      var el = document.querySelector('.cell[data-c="' + p[0] + '"][data-r="' + p[1] + '"]');
      if (el) el.classList.add(check.ok ? 'ok' : 'bad');
    });
  }

  function clearHighlight() {
    document.querySelectorAll('.cell.ok, .cell.bad').forEach(function (el) {
      el.classList.remove('ok', 'bad');
    });
  }

  function rotateSelected() {
    if (!SIM.canEdit(run) || selected == null) {
      toast('先点一件东西。');
      return;
    }
    var turned = SIM.tryRotate(run, selected);
    if (!turned.ok) toast(turned.reason);
    else if (turned.upright) toast('这件保持立面，占格跟着转。');
    save();
    render();
  }

  function stashSelected() {
    if (!SIM.canEdit(run) || selected == null) {
      toast('先点一件东西。');
      return;
    }
    var moved = SIM.tryStash(run, selected);
    if (!moved.ok) toast(moved.reason);
    save();
    render();
  }

  function confirmDepart() {
    if (!run || run.phase !== 'camp') return;
    var enc = currentEncounter();
    if (!enc) {
      toast('先选一条路。');
      return;
    }
    var view = SIM.validate(run);
    if (!view.ok) {
      toast(view.reason + '，不能出发。');
      return;
    }
    run.snapshot = SIM.clone(run);
    run.phase = 'resolve';
    run.banner = '';
    var result = SIM.resolve(run.snapshot, enc);
    run.playback = { log: result.log, index: 0, result: result, speed: 1, enc: enc };
    save();
    render();
  }

  function ensurePlayback() {
    if (playTimer) return;
    if (!run.playback) return;
    stepPlayback();
  }

  function stepPlayback() {
    clearTimeout(playTimer);
    playTimer = 0;
    if (!run || run.phase !== 'resolve' || !run.playback) return;
    var play = run.playback;
    if (play.index >= play.log.length) {
      finishPlayback();
      return;
    }
    play.index += 1;
    renderPieces();
    renderForecast(play.enc);
    var delay = play.speed >= 3 ? 40 : play.speed === 2 ? 280 : 720;
    playTimer = setTimeout(stepPlayback, delay);
  }

  function toggleSpeed() {
    if (!run.playback) return;
    run.playback.speed = run.playback.speed === 2 ? 1 : 2;
    renderTools();
  }

  function skipPlayback() {
    if (!run.playback) return;
    run.playback.speed = 3;
    run.playback.index = run.playback.log.length;
    clearTimeout(playTimer);
    playTimer = 0;
    finishPlayback();
  }

  function replay() {
    if (!run || !run.playback) return;
    clearTimeout(playTimer);
    playTimer = 0;
    run.phase = 'resolve';
    run.playback.index = 0;
    run.playback.speed = 1;
    render();
  }

  function finishPlayback() {
    clearTimeout(playTimer);
    playTimer = 0;
    if (!run || !run.playback) return;
    var result = run.playback.result;
    var enc = run.playback.enc;
    if (!result.ok) {
      run.phase = 'retreat';
      var why = [];
      if (result.fail.supply) why.push('补给耗尽');
      if (result.fail.durability) {
        var bits = [];
        if (result.fail.ice) bits.push('霜伤 ' + result.fail.ice);
        if (result.fail.mud) bits.push('泥伤 ' + result.fail.mud);
        if (result.fail.fatigue) bits.push('疲劳 ' + result.fail.fatigue);
        why.push('耐久耗尽' + (bits.length ? '，关键原因是' + bits.join('，') : ''));
      }
      run.banner = '在「' + enc.name + '」准备不足。' + why.join('。') + '。背包还停在出发前，可以重新整理。';
      save();
      render();
      return;
    }
    run.supply = result.supply;
    run.durability = result.durability;
    run.pack = result.pack;
    run.stash = result.stash;
    if (enc.loot) {
      run.phase = 'loot';
      run.pendingLoot = enc.loot;
      save();
      render();
      return;
    }
    advance();
  }

  function advance() {
    if (run.segment >= 3) {
      run.phase = 'victory';
      run.banner = '补给还剩 ' + run.supply + '，耐久还剩 ' + run.durability + '。';
      if (run.mode === 'tutorial') meta.tutorialCleared = true;
      else meta.trekCleared = true;
      save();
      render();
      return;
    }
    run.segment += 1;
    run.phase = 'camp';
    run.route = null;
    run.playback = null;
    run.banner = '这一段走完了。下一程可以重新装箱。';
    selected = null;
    save();
    render();
  }

  function keepLoot() {
    if (run.phase !== 'loot') return;
    if (run.pendingLoot) run.stash.push(spawn(run.pendingLoot));
    run.pendingLoot = null;
    advance();
  }

  function abandonLoot() {
    if (run.phase !== 'loot') return;
    run.pendingLoot = null;
    run.banner = '放弃了这一件，包里更轻。';
    advance();
  }

  function restoreCamp() {
    if (!run.snapshot) {
      run.phase = 'camp';
      render();
      return;
    }
    var banner = run.banner;
    var snap = SIM.clone(run.snapshot);
    snap.phase = 'camp';
    snap.banner = banner;
    snap.playback = null;
    snap.route = null;
    run = snap;
    selected = null;
    save();
    render();
  }

  function openHelp() {
    var list = $('help-rules');
    list.innerHTML = '';
    HELP.forEach(function (line) {
      var li = document.createElement('li');
      li.textContent = line;
      list.appendChild(li);
    });
    $('help-layer').hidden = false;
  }

  function boot() {
    syncLand();
    AUDIO.setWanted(meta.music !== false);
    setMusicButtons();
    document.querySelectorAll('[data-music]').forEach(function (btn) {
      btn.addEventListener('click', toggleMusic);
    });
    document.addEventListener('pointerdown', function (event) {
      var node = event.target && event.target.nodeType === 1 ? event.target : event.target && event.target.parentElement;
      if (node && node.closest && node.closest('[data-music]')) return;
      armAudio();
    });
    document.addEventListener('visibilitychange', function () {
      AUDIO.visibility(document.hidden);
    });
    window.addEventListener('resize', function () {
      syncLand();
      layoutBoard();
      if (run) renderForecast(currentEncounter());
    });
    $('btn-help').addEventListener('click', openHelp);
    $('btn-help-close').addEventListener('click', function () { $('help-layer').hidden = true; });
    $('btn-keep').addEventListener('click', keepLoot);
    $('btn-abandon').addEventListener('click', abandonLoot);
    mountSprite($('cover-anchor'), function () { return coverScale; }, function () { return 'glow-pulse'; });
    mountSprite($('live-anchor'), function () { return document.documentElement.classList.contains('land') ? 0.1 : 0.12; }, function () { return 'glow-pulse'; });
    mountSprite($('result-anchor'), function () { return 0.34; }, function () { return 'warm-wisp'; });
    var params = new URLSearchParams(location.search);
    if (params.get('check') === '1') {
      runCheck();
      return;
    }
    showCover();
    requestAnimationFrame(frame);
  }

  function runCheck() {
    var report = SIM.runSelfCheck();
    var lines = report.lines.map(function (line) { return 'OK ' + line; });
    report.failures.forEach(function (line) { lines.push('FAIL ' + line); });
    lines.push('音乐 ' + AUDIO.seconds.toFixed(1) + ' 秒 / ' + AUDIO.phrases + ' 乐句');
    if (AUDIO.seconds < 60) lines.push('FAIL 音乐短于 60 秒');
    if (AUDIO.phrasePrint(0) === AUDIO.phrasePrint(1) || AUDIO.phrasePrint(2) === AUDIO.phrasePrint(3) || AUDIO.phrasePrint(0) === AUDIO.phrasePrint(2)) {
      lines.push('FAIL 乐句没有变化');
    } else lines.push('OK 乐句有变化');
    lines.push(report.ok ? 'SELF-CHECK PASS' : 'SELF-CHECK FAIL');
    var out = $('check-out');
    out.hidden = false;
    out.textContent = lines.join('\n');
    requestAnimationFrame(frame);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
