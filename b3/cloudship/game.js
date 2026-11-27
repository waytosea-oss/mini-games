/* 云舰棋局画面。规则在 sim.js，这里只负责排布、拖放和演出。 */
(function () {
  'use strict';

  var S = window.CLOUD_SIM;
  var A = window.CLOUD_AUDIO;
  var SAVE = 'cloudship_save_v1';
  var DEBUG = /(?:\?|&)debug=1(?:&|$)/.test(location.search);
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var STEP_X = 456;
  var STEP_Y = 308;
  var REACH = ['', '短', '中', '长'];

  var SHIP = {
    'own-light': { src: 'assets/props/b08-ship-light.png', ax: 256, ay: 336.64 },
    'own-light-d': { src: 'assets/props/b08-ship-light-damaged.png', ax: 256, ay: 343.36 },
    'own-heavy': { src: 'assets/props/b08-ship-heavy.png', ax: 256, ay: 341.9 },
    'own-heavy-d': { src: 'assets/props/b08-ship-heavy-damaged.png', ax: 255.5, ay: 350.64 },
    'own-flag': { src: 'assets/props/b08-ship-flagship.png', ax: 255.5, ay: 354 },
    'own-flag-d': { src: 'assets/props/b08-ship-flagship-damaged.png', ax: 256, ay: 357.36 },
    'enemy-light': { src: 'assets/props/b08-ship-enemy-light.png', ax: 256.5, ay: 337.98 },
    'enemy-heavy': { src: 'assets/props/b08-ship-enemy-heavy.png', ax: 256, ay: 357.36 },
    'enemy-flag': { src: 'assets/props/b08-ship-enemy-flagship.png', ax: 256, ay: 365.42 }
  };

  var CLIPS = {
    wind: { fw: 358, fh: 422, cols: 6, n: 24, ax: 146.131, ay: 242.744, src: 'assets/anim/b08-mascot-sheet-wind.webp' },
    gleam: { fw: 290, fh: 412, cols: 6, n: 24, ax: 152.101, ay: 234.772, src: 'assets/anim/b08-mascot-sheet-gleam.webp' },
    land: { fw: 298, fh: 424, cols: 6, n: 24, ax: 156.12, ay: 228.783, src: 'assets/anim/b08-mascot-sheet-land.webp' }
  };

  var $ = function (id) { return document.getElementById(id); };
  var screenCover = $('screen-cover');
  var screenPlay = $('screen-play');
  var coverBg = $('cover-bg');
  var coverActor = $('cover-actor');
  var coverWait = $('cover-wait');
  var sceneImg = $('scene');
  var board = $('board');
  var hintEl = $('hint');
  var bannerEl = $('banner');
  var turnEl = $('turn-label');
  var windName = $('wind-name');
  var rose = $('rose');
  var roseBg = $('rose-bg');
  var rosePtr = $('rose-ptr');
  var sheet = $('sheet');
  var sheetTitle = $('sheet-title');
  var report = $('report');
  var reportTitle = $('report-title');
  var reportCopy = $('report-copy');
  var starsEl = $('stars');
  var btnContinue = $('btn-continue');
  var btnEscort = $('btn-escort');
  var btnScout = $('btn-scout');
  var btnSell = $('btn-sell');
  var btnNext = $('btn-next');
  var btnRetry = $('btn-retry');
  var btnRestart = $('btn-restart');
  var btnBattle = $('btn-battle');
  var btnSlow = $('btn-slow');
  var btnEnd = $('btn-end');

  var state = null;
  var review = [];
  var slowOn = false;
  var armed = null;
  var selected = null;
  var drag = null;
  var hover = null;
  var anim = { on: false };
  var atlasReady = false;
  var pendingEnter = null;
  var entering = false;
  var clipName = 'wind';
  var clipFrame = 0;
  var clipAcc = 0;
  var clipLast = 0;
  var landDone = null;
  var mascotHit = null;
  var flashText = '';
  var flashUntil = 0;
  var lastBanner = null;
  var IMG = {};
  var sheets = {};

  function loadImage(src) {
    return new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { resolve(null); };
      img.src = src;
    });
  }

  function setSrc(img, src) {
    if (!img || img.getAttribute('src') === src) return;
    img.src = src;
  }

  function landMode() {
    return window.innerWidth > window.innerHeight;
  }

  function syncOrient() {
    var land = landMode();
    document.documentElement.classList.toggle('land', land);
    setSrc(coverBg, land ? 'assets/cover/b08-cover-16x9-bg.webp' : 'assets/cover/b08-cover-3x4-bg.webp');
    setSrc(sceneImg, land ? 'assets/scene/b08-scene-landscape.webp' : 'assets/scene/b08-scene-portrait.webp');
  }

  function fitCanvas(canvas) {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = canvas.clientWidth || 1;
    var h = canvas.clientHeight || 1;
    var pw = Math.max(1, Math.round(w * dpr));
    var ph = Math.max(1, Math.round(h * dpr));
    if (canvas.width !== pw || canvas.height !== ph) {
      canvas.width = pw;
      canvas.height = ph;
    }
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    return { ctx: ctx, w: w, h: h };
  }

  function hexLocal(q, r) {
    return { x: (q + r / 2) * STEP_X, y: r * STEP_Y };
  }

  function cubeRound(fq, fr) {
    var x = fq;
    var z = fr;
    var y = -x - z;
    var rx = Math.round(x);
    var ry = Math.round(y);
    var rz = Math.round(z);
    var xd = Math.abs(rx - x);
    var yd = Math.abs(ry - y);
    var zd = Math.abs(rz - z);
    if (xd > yd && xd > zd) rx = -ry - rz;
    else if (yd > zd) ry = -rx - rz;
    else rz = -rx - ry;
    return { q: rx, r: rz };
  }

  function metrics(w, h) {
    var minX = 1e9;
    var maxX = -1e9;
    var minY = 1e9;
    var maxY = -1e9;
    S.BOARD.forEach(function (c) {
      var p = hexLocal(c.q, c.r);
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    });
    var land = landMode();
    var top = land ? (window.innerHeight <= 520 ? 64 : 44) : 72;
    var bot = 8;
    var padX = STEP_X * 0.7;
    var padY = STEP_Y * 0.76;
    var worldW = (maxX - minX) + padX * 2;
    var worldH = (maxY - minY) + padY * 2;
    var scale = Math.min(w / worldW, Math.max(1, h - top - bot) / worldH);
    return {
      scale: scale,
      ox: (w - worldW * scale) / 2 - minX * scale + padX * scale,
      oy: top + (Math.max(0, h - top - bot) - worldH * scale) / 2 - minY * scale + padY * scale,
      minX: minX,
      maxX: maxX,
      minY: minY,
      maxY: maxY
    };
  }

  function toScreen(m, q, r) {
    var p = hexLocal(q, r);
    return { x: m.ox + p.x * m.scale, y: m.oy + p.y * m.scale };
  }

  function pickCell(m, px, py) {
    var x = (px - m.ox) / m.scale;
    var y = (py - m.oy) / m.scale;
    var r = y / STEP_Y;
    var q = x / STEP_X - r / 2;
    var c = cubeRound(q, r);
    if (!S.onBoard(c.q, c.r)) return null;
    return c;
  }

  function localPoint(canvas, e) {
    var r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function prepPhase() {
    return state && state.phase === 'prep' && !anim.on;
  }

  function legal(q, r, ignoreId) {
    if (!state || !S.onBoard(q, r) || r < 0) return false;
    var level = S.levelNow(state);
    if (!level || S.cloudSet(level)[q + ',' + r]) return false;
    for (var i = 0; i < state.ships.length; i++) {
      var s = state.ships[i];
      if (s.id === ignoreId) continue;
      if (s.q === q && s.r === r) return false;
    }
    return true;
  }

  function shipById(id) {
    if (!state) return null;
    for (var i = 0; i < state.ships.length; i++) {
      if (state.ships[i].id === id) return state.ships[i];
    }
    return null;
  }

  function shownSupply() {
    if (!state) return 0;
    if (state.phase === 'prep' && !anim.on) return Math.max(0, S.spendable(state));
    return Math.max(0, state.supply);
  }

  function shownHp() {
    if (anim.on) return Math.max(0, anim.hpShow);
    return state ? Math.max(0, state.hp) : 0;
  }

  function paintBar(zone, clip, img, ratio, source) {
    if (!zone || !clip || !img) return;
    var w = zone.clientWidth || 1;
    clip.style.width = (Math.max(0, Math.min(1, ratio)) * 100) + '%';
    img.style.width = w + 'px';
    if (source && img.getAttribute('src') !== source) img.src = source;
  }

  function paintBars() {
    if (!state) return;
    var hpRatio = state.maxHp ? shownHp() / state.maxHp : 0;
    paintBar($('dura'), $('dura-clip'), $('dura-fill'), hpRatio, hpRatio < 0.34
      ? 'assets/ui/b08-durability-fill-low.png'
      : 'assets/ui/b08-durability-fill-full.png');
    $('dura-num').textContent = '耐久 ' + Math.round(shownHp());
    var spend = shownSupply();
    var sRatio = Math.min(1, spend / 12);
    paintBar($('supply'), $('supply-clip'), $('supply-fill'), sRatio, sRatio < 0.34
      ? 'assets/ui/b08-supply-fill-low.png'
      : 'assets/ui/b08-supply-fill-full.png');
    $('supply-num').textContent = '可花 ' + spend;
  }

  function setBanner(text) {
    if (text === lastBanner) return;
    lastBanner = text;
    bannerEl.textContent = text || '';
  }

  function flash(text) {
    flashText = text;
    flashUntil = performance.now() + 1700;
    setBanner(text);
  }

  function syncMusicButtons() {
    var on = A.wanted();
    ['cover-music', 'play-music'].forEach(function (id) {
      var el = $(id);
      el.setAttribute('aria-pressed', on ? 'true' : 'false');
      el.textContent = on ? '乐' : '静';
    });
  }

  function persist() {
    if (!state) return;
    var data = {
      v: 1,
      mode: state.mode,
      turn: state.turn,
      phase: state.phase,
      supply: state.supply,
      hp: state.hp,
      maxHp: state.maxHp,
      ships: state.ships,
      enemies: state.enemies,
      wind: state.wind,
      baseWind: state.baseWind,
      nextId: state.nextId,
      stars: state.stars,
      headlines: state.headlines,
      report: state.report,
      outcome: state.outcome,
      snapshot: state.snapshot,
      review: review,
      music: A.wanted(),
      slow: slowOn
    };
    try { localStorage.setItem(SAVE, JSON.stringify(data)); } catch (err) { /* 存不下就只留在这一局里 */ }
  }

  function readSave() {
    try {
      var data = JSON.parse(localStorage.getItem(SAVE) || 'null');
      if (!data || data.v !== 1) return null;
      if (data.mode !== 'teach' && data.mode !== 'chapter') return null;
      if (!Array.isArray(data.ships) || !data.ships.length) return null;
      if (typeof data.turn !== 'number' || typeof data.hp !== 'number') return null;
      if (!data.wind || !data.baseWind) return null;
      return data;
    } catch (err) {
      return null;
    }
  }

  function applySave(data) {
    state = {
      mode: data.mode,
      turn: data.turn,
      phase: data.phase || 'prep',
      supply: data.supply,
      hp: data.hp,
      maxHp: data.maxHp,
      ships: data.ships,
      enemies: data.enemies || [],
      wind: data.wind,
      baseWind: data.baseWind,
      nextId: data.nextId || 2,
      stars: data.stars || [],
      headlines: data.headlines || [],
      report: data.report || '',
      outcome: data.outcome || null,
      snapshot: data.snapshot || null
    };
    review = data.review || [];
    slowOn = !!data.slow;
    if (data.music === false) A.setWanted(false);
  }

  function totalTurns() {
    return state && state.mode === 'teach' ? S.TEACH.length : S.CHAPTER.length;
  }

  function hideReport() {
    report.hidden = true;
  }

  function showReport() {
    if (!state || (state.phase !== 'result' && state.phase !== 'end')) {
      hideReport();
      return;
    }
    report.hidden = false;
    var win = state.outcome === 'win';
    var lose = state.outcome === 'lose';
    var fail = state.outcome === 'failflag';
    reportTitle.textContent = win ? '云海走通' : lose ? '旗舰沉了' : fail ? '旗舰还在' : '这一回合';
    btnNext.hidden = state.phase === 'end';
    btnRetry.hidden = !state.snapshot;
    var n = state.stars.length > state.turn ? state.stars[state.turn] : 0;
    starsEl.textContent = '';
    for (var i = 0; i < 3; i++) {
      var pip = document.createElement('i');
      if (i < n) pip.className = 'on';
      starsEl.appendChild(pip);
    }
    reportCopy.textContent = state.report || '';
  }

  function closeSheet() {
    selected = null;
    sheet.hidden = true;
  }

  function openSheet(id) {
    var ship = shipById(id);
    if (!ship || !prepPhase()) return;
    selected = id;
    sheet.hidden = false;
    var named = S.clsName(ship.cls);
    if (ship.cls === 'flag') sheetTitle.textContent = '旗舰可以选一次专精。';
    else if (ship.spec) sheetTitle.textContent = named + '已经有专精。';
    else sheetTitle.textContent = '给' + named + '选一次专精。';
    var locked = !!ship.spec;
    btnEscort.hidden = locked;
    btnScout.hidden = locked;
    btnSell.hidden = ship.cls === 'flag';
    btnEscort.disabled = shownSupply() < S.SPEC_COST;
    btnScout.disabled = shownSupply() < S.SPEC_COST;
  }

  function syncHud() {
    if (!state) return;
    paintBars();
    var reach = REACH[state.wind.reach] || '短';
    var cost = prepPhase() ? S.windCost(state.baseWind, state.wind) : 0;
    windName.textContent = S.dirById(state.wind.dir).name + ' · ' + reach + (cost ? ' · 花 ' + cost : '');
    rosePtr.style.transform = 'rotate(' + (state.wind.dir * 60 + 90) + 'deg)';
    rose.setAttribute('aria-label', '风向' + windName.textContent + '。点左半圈逆时针，点右半圈顺时针。');
    var reaches = document.querySelectorAll('#reaches button');
    for (var i = 0; i < reaches.length; i++) {
      reaches[i].classList.toggle('on', Number(reaches[i].getAttribute('data-reach')) === state.wind.reach);
    }
    turnEl.textContent = '回合 ' + (state.turn + 1) + ' / ' + totalTurns();
    var spend = shownSupply();
    var full = state.ships.length >= S.MAX_SHIPS;
    var can = prepPhase();
    document.querySelector('[data-cls="light"]').disabled = !can || full || spend < S.COST.light;
    document.querySelector('[data-cls="heavy"]').disabled = !can || full || spend < S.COST.heavy;
    document.querySelector('[data-cls="light"]').classList.toggle('armed', armed === 'light');
    document.querySelector('[data-cls="heavy"]').classList.toggle('armed', armed === 'heavy');
    btnBattle.disabled = !can;
    btnEnd.disabled = !can;
    btnSlow.setAttribute('aria-pressed', slowOn ? 'true' : 'false');
    var now = performance.now();
    if (now < flashUntil) setBanner(flashText);
    else if (anim.on) setBanner('交战进行中。');
    else if (state.phase === 'prep') setBanner('预设敌阵：' + S.enemySummary(state.enemies) + '。对手是本机预设敌阵。');
    else setBanner('');
    var level = S.levelNow(state);
    hintEl.hidden = !can || !level;
    if (level && can) hintEl.textContent = '回合 ' + (state.turn + 1) + ' / ' + totalTurns() + '。' + level.hint;
    if (selected && !shipById(selected)) closeSheet();
  }

  function displayPlans() {
    if (!state) return [];
    if (anim.on) return anim.plans;
    if (state.phase !== 'prep') return [];
    var units = S.allUnits(state);
    if (drag && drag.moved && drag.cell) {
      if (drag.kind === 'ship') {
        units.forEach(function (u) {
          if (u.id === drag.id) {
            u.q = drag.cell.q;
            u.r = drag.cell.r;
          }
        });
      } else {
        units.push({
          id: -999,
          side: 'own',
          cls: drag.cls,
          q: drag.cell.q,
          r: drag.cell.r,
          spec: null,
          hurt: false
        });
      }
    }
    return S.resolveWind(units, state.wind, S.levelNow(state));
  }

  function hurtNow(plan) {
    if (!anim.on) return !!plan.hurt;
    var hurt = !!plan.hurt;
    if (anim.shot == null || anim.shot < 0) return hurt;
    for (var i = 0; i <= anim.shot && i < anim.flat.length; i++) {
      var shot = anim.flat[i];
      if (shot.to === plan.id && shot.targetSide === 'own' && (i < anim.shot || anim.u > 0.2)) hurt = true;
    }
    return hurt;
  }

  function anchorOf(m, plan) {
    var dest = anim.on && anim.phase !== 'move';
    if (anim.on && anim.phase === 'move' && plan.moved) {
      var a = toScreen(m, plan.fromQ, plan.fromR);
      var b = toScreen(m, plan.q, plan.r);
      var u = anim.u;
      var e = u * u * (3 - 2 * u);
      return { x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e };
    }
    if (dest || (state.phase !== 'prep' && !anim.on)) return toScreen(m, plan.q, plan.r);
    return toScreen(m, plan.fromQ, plan.fromR);
  }

  function blit(ctx, img, ax, ay, x, y, scale, alpha) {
    if (!img || !img.width) return;
    ctx.save();
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    ctx.drawImage(img, x - ax * scale, y - ay * scale, img.width * scale, img.height * scale);
    ctx.restore();
  }

  function blitRot(ctx, img, ax, ay, x, y, scale, rot, alpha) {
    if (!img || !img.width) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    ctx.drawImage(img, -ax * scale, -ay * scale, img.width * scale, img.height * scale);
    ctx.restore();
  }

  function blitFx(ctx, img, frame, x, y, scale) {
    if (!img || !img.width) return;
    var col = frame % 4;
    var row = Math.floor(frame / 4);
    ctx.drawImage(img, col * 512, row * 512, 512, 512, x - 256 * scale, y - 256 * scale, 512 * scale, 512 * scale);
  }

  function spriteFor(plan, hurt) {
    var key = plan.side + '-' + plan.cls + (plan.side === 'own' && hurt ? '-d' : '');
    return SHIP[key] || SHIP['own-light'];
  }

  function resultUnits() {
    var list = [];
    if (!state) return list;
    state.ships.forEach(function (s) {
      list.push({
        id: s.id, side: 'own', cls: s.cls, q: s.q, r: s.r, fromQ: s.q, fromR: s.r,
        spec: s.spec, hurt: s.hurt, moved: false
      });
    });
    review.forEach(function (s) {
      list.push({
        id: s.id, side: 'enemy', cls: s.cls, q: s.q, r: s.r, fromQ: s.q, fromR: s.r,
        spec: null, hurt: false, moved: false
      });
    });
    return list;
  }

  function drawBoard() {
    if (screenPlay.hidden || !state) return;
    var box = fitCanvas(board);
    var ctx = box.ctx;
    var m = metrics(box.w, box.h);
    var level = S.levelNow(state);
    if (!level) return;
    var plans = state.phase === 'prep' || anim.on ? displayPlans() : resultUnits();
    var step = STEP_X * m.scale;
    var tileScale = step / 450;
    var shipScale = step * 0.92 / 444;
    var arrowScale = step * 0.98 / 230;
    var bubbleScale = step * 1.22 / 430;
    var badgeScale = step * 0.46 / 150;
    var fxScale = step * 1.35 / 512;
    var clouds = S.cloudSet(level);
    var covers = S.coverSet(level);

    var dest = {};
    var origin = {};
    plans.forEach(function (p) {
      if (!p.moved) return;
      if (!(state.phase === 'prep' || (anim.on && anim.phase === 'move'))) return;
      dest[p.q + ',' + p.r] = true;
      origin[p.fromQ + ',' + p.fromR] = true;
    });

    var cx = (toScreen(m, 0, 0).x);
    var top = toScreen(m, 0, -2);
    var bot = toScreen(m, 0, 2);
    ctx.fillStyle = 'rgba(236, 242, 246, 0.46)';
    ctx.beginPath();
    ctx.ellipse(cx, (top.y + bot.y) / 2, step * 3.35, (bot.y - top.y) * 0.62, 0, 0, Math.PI * 2);
    ctx.fill();

    var cells = S.BOARD.slice().sort(function (a, b) {
      if (a.r !== b.r) return a.r - b.r;
      return a.q - b.q;
    });
    cells.forEach(function (c) {
      var k = c.q + ',' + c.r;
      var img = IMG.tileOwn;
      if (clouds[k]) img = IMG.tileCloud;
      else if (dest[k]) img = IMG.tilePredict;
      else if (covers[k]) img = IMG.tileCover;
      else if (origin[k]) img = IMG.tileWind;
      else if (c.r < 0) img = IMG.tileEnemy;
      var p = toScreen(m, c.q, c.r);
      blit(ctx, img, 255, 255, p.x, p.y, tileScale, 1);
      var hot = hover && hover.q === c.q && hover.r === c.r;
      if (hot) blit(ctx, IMG.tileHighlight, 255, 255, p.x, p.y, tileScale, 0.72);
      if (DEBUG) {
        ctx.fillStyle = '#1c2430';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(S.placeName(c.q, c.r), p.x, p.y + 4);
      }
    });

    var drawList = plans.map(function (p) {
      var pos = anchorOf(m, p);
      return { plan: p, pos: pos };
    }).sort(function (a, b) { return a.pos.y - b.pos.y; });

    function hullY(spec, y) {
      return y + (spec.ay - 255) * shipScale;
    }
    drawList.forEach(function (item) {
      var p = item.plan;
      if (drag && drag.kind === 'ship' && drag.moved && !drag.cell && p.id === drag.id) return;
      var hurt = hurtNow(p);
      var spec = spriteFor(p, hurt);
      var img = IMG[spec.src];
      var sy = hullY(spec, item.pos.y);
      blit(ctx, img, spec.ax, spec.ay, item.pos.x, sy, shipScale, p.id === -999 ? 0.86 : 1);
      if (p.spec === 'escort') blit(ctx, IMG.bubble, 256.19, 256.54, item.pos.x, sy - step * 0.02, bubbleScale, 0.72);
      if (p.spec === 'escort' || p.spec === 'scout') {
        var badge = p.spec === 'escort' ? IMG.badgeEscort : IMG.badgeScout;
        var bax = p.spec === 'escort' ? 127.85 : 116.93;
        var bay = p.spec === 'escort' ? 122.55 : 125.9;
        blit(ctx, badge, bax, bay, item.pos.x + step * 0.26, sy - step * 0.12, badgeScale, 1);
      }
    });

    if (state.phase === 'prep' && !anim.on) {
      plans.forEach(function (p) {
        if (!p.moved) return;
        var spec = spriteFor(p, p.hurt);
        var at = toScreen(m, p.q, p.r);
        blit(ctx, IMG[spec.src], spec.ax, spec.ay, at.x, hullY(spec, at.y), shipScale, 0.4);
      });
    }

    var showArrow = state.phase === 'prep' || (anim.on && anim.phase === 'move');
    if (showArrow) {
      var reach = state.wind.reach;
      var arrow = reach >= 3 ? IMG.arrowLong : reach === 2 ? IMG.arrowMid : IMG.arrowShort;
      var ax = reach >= 3 ? 255.51 : reach === 2 ? 259.25 : 244.06;
      var ay = reach >= 3 ? 119.9 : reach === 2 ? 121.87 : 117.35;
      var rot = (state.wind.dir * 60 + 30) * Math.PI / 180;
      var fade = anim.on ? Math.max(0, 1 - anim.u) : 1;
      plans.forEach(function (p) {
        if (!p.moved) return;
        var a = toScreen(m, p.fromQ, p.fromR);
        var b = toScreen(m, p.q, p.r);
        blitRot(ctx, arrow, ax, ay, (a.x + b.x) / 2, (a.y + b.y) / 2, arrowScale, rot, 0.95 * fade);
      });
    }

    if (drag && drag.moved && !drag.cell) {
      var pt = localPoint(board, { clientX: drag.x, clientY: drag.y });
      var cls = drag.kind === 'ship' ? (shipById(drag.id) || {}).cls : drag.cls;
      var spec = SHIP['own-' + (cls || 'light')];
      if (spec) blit(ctx, IMG[spec.src], spec.ax, spec.ay, pt.x, hullY(spec, pt.y), shipScale, 0.75);
    }

    if (anim.on && anim.phase === 'move') {
      var f = Math.min(7, Math.floor(anim.u * 8));
      plans.forEach(function (p) {
        if (!p.moved) return;
        var pos = anchorOf(m, p);
        blitFx(ctx, IMG.fxWind, f, pos.x, pos.y - step * 0.1, fxScale);
      });
    }
    if (anim.on && anim.phase === 'shot' && anim.flat[anim.shot]) {
      var shot = anim.flat[anim.shot];
      var sp = toScreen(m, shot.q, shot.r);
      blitFx(ctx, IMG.fxHit, Math.min(7, Math.floor(anim.u * 8)), sp.x, sp.y, fxScale);
    }
    if (anim.on && anim.phase === 'win' && anim.flag) {
      var fp = toScreen(m, anim.flag.q, anim.flag.r);
      blitFx(ctx, IMG.fxWin, Math.min(7, Math.floor(anim.u * 8)), fp.x, fp.y, fxScale * 1.15);
    }
  }

  function motion(ms) {
    if (reduce) return 40;
    return slowOn ? ms * 2.4 : ms;
  }

  function tickAnim(now) {
    if (!anim.on) return;
    var moveMs = motion(700);
    var shotMs = motion(420);
    var winMs = motion(680);
    var t = now - anim.t0;
    if (t < moveMs) {
      anim.phase = 'move';
      anim.u = t / moveMs;
      anim.shot = -1;
      return;
    }
    var after = t - moveMs;
    var i = Math.floor(after / shotMs);
    if (i < anim.flat.length) {
      anim.phase = 'shot';
      anim.shot = i;
      anim.u = (after - i * shotMs) / shotMs;
      if (anim.u > 0.35) anim.hpShow = anim.flat[i].php;
      return;
    }
    var rest = after - anim.flat.length * shotMs;
    anim.hpShow = state.hp;
    if (anim.broken && rest < winMs) {
      anim.phase = 'win';
      anim.u = rest / winMs;
      return;
    }
    anim.on = false;
    showReport();
    syncHud();
  }

  function startBattle() {
    if (!prepPhase()) return;
    closeSheet();
    armed = null;
    drag = null;
    var hp0 = state.hp;
    var battle = S.fight(state);
    if (!battle) return;
    review = battle.plans.filter(function (p) { return p.side === 'enemy'; }).map(function (p) {
      return { id: p.id, side: 'enemy', cls: p.cls, q: p.q, r: p.r };
    });
    var flat = [];
    var hp = hp0;
    var flag = null;
    battle.plans.forEach(function (p) {
      if (p.side === 'enemy' && p.cls === 'flag') flag = { q: p.q, r: p.r };
    });
    battle.volleys.forEach(function (v) {
      v.shots.forEach(function (s) {
        if (s.targetSide === 'own') hp -= s.dmg;
        flat.push({ q: s.q, r: s.r, to: s.to, targetSide: s.targetSide, php: Math.max(0, hp), tcls: s.tcls });
      });
    });
    anim = {
      on: true,
      t0: performance.now(),
      phase: 'move',
      u: 0,
      shot: -1,
      plans: battle.plans,
      flat: flat,
      broken: battle.broken,
      hpShow: hp0,
      flag: flag
    };
    persist();
    syncHud();
  }

  function enterPlay() {
    screenCover.hidden = true;
    screenPlay.hidden = false;
    syncOrient();
    syncHud();
    if (state && state.phase !== 'prep') showReport();
    else hideReport();
  }

  function beginRun(mode) {
    state = S.createRun(mode);
    S.beginTurn(state);
    review = [];
    slowOn = mode === 'teach';
    armed = null;
    selected = null;
    drag = null;
    anim = { on: false };
    closeSheet();
    persist();
    enterPlay();
  }

  function resumeRun() {
    var data = readSave();
    if (!data) return;
    applySave(data);
    armed = null;
    selected = null;
    drag = null;
    anim = { on: false };
    closeSheet();
    syncMusicButtons();
    enterPlay();
  }

  function queueEnter(fn) {
    if (entering) return;
    if (!atlasReady) {
      pendingEnter = fn;
      coverWait.textContent = '云图还在铺开。';
      return;
    }
    entering = true;
    coverWait.textContent = '';
    if (reduce || !sheets.land) {
      entering = false;
      fn();
      return;
    }
    clipName = 'land';
    clipFrame = 0;
    clipAcc = 0;
    landDone = function () {
      entering = false;
      landDone = null;
      clipName = 'wind';
      fn();
    };
  }

  function drawCover(now) {
    if (screenCover.hidden) return;
    var box = fitCanvas(coverActor);
    var ctx = box.ctx;
    var clip = CLIPS[clipName] || CLIPS.wind;
    var img = sheets[clipName] || sheets.wind;
    if (!img) return;
    if (!clipLast) clipLast = now;
    var dt = Math.min(80, now - clipLast);
    clipLast = now;
    if (!reduce) {
      clipAcc += dt;
      var step = 1000 / 12;
      while (clipAcc >= step) {
        clipAcc -= step;
        clipFrame += 1;
        if (clipFrame >= clip.n) {
          clipFrame = 0;
          if (clipName === 'land' && landDone) {
            var done = landDone;
            landDone = null;
            done();
            return;
          }
          if (clipName === 'gleam') clipName = 'wind';
        }
      }
    } else {
      clipFrame = 0;
    }
    var use = CLIPS[clipName] || clip;
    var art = sheets[clipName] || img;
    var target = landMode() ? Math.min(box.h * 0.42, 380) : Math.min(box.h * 0.34, 300);
    var scale = target / 422;
    var x = landMode() ? box.w * 0.22 : box.w * 0.36;
    var y = landMode() ? box.h * 0.72 : box.h * 0.8;
    var dw = use.fw * scale;
    var dh = use.fh * scale;
    var left = x - use.ax * scale;
    var top = y - use.ay * scale;
    var col = clipFrame % use.cols;
    var row = Math.floor(clipFrame / use.cols);
    ctx.drawImage(art, col * use.fw, row * use.fh, use.fw, use.fh, left, top, dw, dh);
    var rect = coverActor.getBoundingClientRect();
    mascotHit = { l: rect.left + left, t: rect.top + top, r: rect.left + left + dw, b: rect.top + top + dh };
  }

  function frame(now) {
    drawCover(now);
    tickAnim(now);
    if (!screenPlay.hidden) {
      if (anim.on) paintBars();
      drawBoard();
    }
    requestAnimationFrame(frame);
  }

  function bindStaticImages() {
    setSrc($('dura-track'), 'assets/ui/b08-durability-track.png');
    setSrc($('dura-frame'), 'assets/ui/b08-durability-frame.png');
    setSrc($('dura-fill'), 'assets/ui/b08-durability-fill-full.png');
    setSrc($('supply-track'), 'assets/ui/b08-supply-track.png');
    setSrc($('supply-frame'), 'assets/ui/b08-supply-frame.png');
    setSrc($('supply-fill'), 'assets/ui/b08-supply-fill-full.png');
    setSrc(roseBg, 'assets/ui/b08-ui-wind-rose.png');
    setSrc(rosePtr, 'assets/ui/b08-ui-wind-pointer.png');
    roseBg.style.transform = 'rotate(-30deg)';
    setSrc($('reach-1'), 'assets/props/b08-wind-arrow-short.png');
    setSrc($('reach-2'), 'assets/props/b08-wind-arrow-mid.png');
    setSrc($('reach-3'), 'assets/props/b08-wind-arrow-long.png');
    setSrc($('icon-battle'), 'assets/ui/b08-ui-btn-battle.png');
    setSrc($('icon-slow'), 'assets/ui/b08-ui-btn-slow.png');
    setSrc($('icon-end'), 'assets/ui/b08-ui-btn-endprep.png');
    setSrc($('icon-escort'), 'assets/props/b08-badge-escort.png');
    setSrc($('icon-scout'), 'assets/props/b08-badge-scout.png');
    setSrc($('card-light'), 'assets/props/b08-ship-light.png');
    setSrc($('card-heavy'), 'assets/props/b08-ship-heavy.png');
    var frames = document.querySelectorAll('.card .frame');
    for (var i = 0; i < frames.length; i++) setSrc(frames[i], 'assets/ui/b08-ui-card-frame.png');
  }

  function loadAtlas() {
    var jobs = [];
    function take(key, src) {
      jobs.push(loadImage(src).then(function (img) { IMG[key] = img; }));
    }
    take('tileOwn', 'assets/tiles/b08-tile-hex-own.png');
    take('tileEnemy', 'assets/tiles/b08-tile-hex-enemy.png');
    take('tileCloud', 'assets/tiles/b08-tile-hex-cloud.png');
    take('tileCover', 'assets/tiles/b08-tile-hex-cover.png');
    take('tileWind', 'assets/tiles/b08-tile-hex-wind.png');
    take('tilePredict', 'assets/tiles/b08-tile-hex-predict.png');
    take('tileHighlight', 'assets/tiles/b08-tile-hex-highlight.png');
    Object.keys(SHIP).forEach(function (k) { take(SHIP[k].src, SHIP[k].src); });
    take('arrowShort', 'assets/props/b08-wind-arrow-short.png');
    take('arrowMid', 'assets/props/b08-wind-arrow-mid.png');
    take('arrowLong', 'assets/props/b08-wind-arrow-long.png');
    take('bubble', 'assets/overlays/b08-overlay-escort-bubble.png');
    take('badgeEscort', 'assets/props/b08-badge-escort.png');
    take('badgeScout', 'assets/props/b08-badge-scout.png');
    take('fxHit', 'assets/fx/b08-fx-hit-sheet.png');
    take('fxWind', 'assets/fx/b08-fx-wind-sheet.png');
    take('fxWin', 'assets/fx/b08-fx-win-sheet.png');
    ['gleam', 'land'].forEach(function (name) {
      jobs.push(loadImage(CLIPS[name].src).then(function (img) { if (img) sheets[name] = img; }));
    });
    return Promise.all(jobs);
  }

  document.addEventListener('pointerdown', function () { A.arm(); });
  document.addEventListener('visibilitychange', function () { A.visibility(document.hidden); });

  $('cover-music').addEventListener('click', function () {
    A.toggle();
    syncMusicButtons();
    if (state) persist();
  });
  $('play-music').addEventListener('click', function () {
    A.toggle();
    syncMusicButtons();
    if (state) persist();
  });

  $('btn-teach').addEventListener('click', function () { queueEnter(function () { beginRun('teach'); }); });
  $('btn-chapter').addEventListener('click', function () { queueEnter(function () { beginRun('chapter'); }); });
  btnContinue.addEventListener('click', function () { queueEnter(resumeRun); });

  screenCover.addEventListener('pointerdown', function (e) {
    if (e.target.closest('button, a')) return;
    if (reduce || entering || !mascotHit) return;
    if (e.clientX < mascotHit.l || e.clientX > mascotHit.r || e.clientY < mascotHit.t || e.clientY > mascotHit.b) return;
    if (clipName === 'land' || !sheets.gleam) return;
    clipName = 'gleam';
    clipFrame = 0;
    clipAcc = 0;
  });

  rose.addEventListener('click', function (e) {
    if (!prepPhase()) return;
    var rect = rose.getBoundingClientRect();
    var dir = state.wind.dir + (e.clientX < rect.left + rect.width / 2 ? -1 : 1);
    if (!S.setWind(state, dir, state.wind.reach)) flash('补给不够改风。');
    else persist();
    syncHud();
  });

  $('reaches').addEventListener('click', function (e) {
    var btn = e.target.closest('button');
    if (!btn || !prepPhase()) return;
    var reach = Number(btn.getAttribute('data-reach'));
    if (!S.setWind(state, state.wind.dir, reach)) flash('补给不够改风。');
    else persist();
    syncHud();
  });

  btnBattle.addEventListener('click', startBattle);
  btnEnd.addEventListener('click', startBattle);
  btnSlow.addEventListener('click', function () {
    slowOn = !slowOn;
    btnSlow.setAttribute('aria-pressed', slowOn ? 'true' : 'false');
    if (state) persist();
  });

  btnEscort.addEventListener('click', function () {
    if (!selected) return;
    if (!S.spec(state, selected, 'escort')) flash('补给不够。');
    else persist();
    openSheet(selected);
    syncHud();
  });
  btnScout.addEventListener('click', function () {
    if (!selected) return;
    if (!S.spec(state, selected, 'scout')) flash('补给不够。');
    else persist();
    openSheet(selected);
    syncHud();
  });
  btnSell.addEventListener('click', function () {
    if (!selected) return;
    if (S.sell(state, selected)) {
      persist();
      closeSheet();
      syncHud();
    }
  });

  btnNext.addEventListener('click', function () {
    if (!state || !S.nextTurn(state)) return;
    review = [];
    anim = { on: false };
    closeSheet();
    hideReport();
    persist();
    syncHud();
  });
  btnRetry.addEventListener('click', function () {
    if (!state || !S.retryTurn(state)) return;
    review = [];
    anim = { on: false };
    closeSheet();
    hideReport();
    persist();
    syncHud();
  });
  btnRestart.addEventListener('click', function () {
    if (!state) return;
    beginRun(state.mode);
  });

  function holdPointer(e) {
    if (e.cancelable) e.preventDefault();
    var stage = document.getElementById('stage');
    if (stage.setPointerCapture) {
      try { stage.setPointerCapture(e.pointerId); } catch (err) { /* 指针已经松开 */ }
    }
  }

  document.querySelector('.cards').addEventListener('pointerdown', function (e) {
    var btn = e.target.closest('.card');
    if (!btn || btn.disabled || !prepPhase()) return;
    holdPointer(e);
    drag = {
      kind: 'new',
      cls: btn.getAttribute('data-cls'),
      sx: e.clientX,
      sy: e.clientY,
      x: e.clientX,
      y: e.clientY,
      moved: false,
      cell: null
    };
  });

  board.addEventListener('pointerdown', function (e) {
    if (!state || anim.on) return;
    holdPointer(e);
    var m = metrics(board.clientWidth, board.clientHeight);
    var pt = localPoint(board, e);
    var cell = pickCell(m, pt.x, pt.y);
    hover = cell;
    if (!prepPhase()) return;
    if (armed && cell) {
      if (legal(cell.q, cell.r, null) && S.buy(state, armed, cell.q, cell.r)) {
        armed = null;
        persist();
        syncHud();
      } else flash('补给不够，或这一格放不下。');
      return;
    }
    var hit = null;
    if (cell) {
      state.ships.forEach(function (s) {
        if (s.q === cell.q && s.r === cell.r) hit = s;
      });
    }
    if (hit) {
      drag = {
        kind: 'ship',
        id: hit.id,
        sx: e.clientX,
        sy: e.clientY,
        x: e.clientX,
        y: e.clientY,
        moved: false,
        cell: { q: hit.q, r: hit.r }
      };
      return;
    }
    closeSheet();
  });

  board.addEventListener('pointermove', function (e) {
    if (screenPlay.hidden || !state) return;
    var m = metrics(board.clientWidth, board.clientHeight);
    hover = pickCell(m, localPoint(board, e).x, localPoint(board, e).y);
  });

  document.addEventListener('pointermove', function (e) {
    if (!drag) return;
    drag.x = e.clientX;
    drag.y = e.clientY;
    if (Math.abs(drag.x - drag.sx) + Math.abs(drag.y - drag.sy) > 8) drag.moved = true;
    var m = metrics(board.clientWidth, board.clientHeight);
    var pt = localPoint(board, e);
    var cell = pickCell(m, pt.x, pt.y);
    var ignore = drag.kind === 'ship' ? drag.id : null;
    drag.cell = cell && legal(cell.q, cell.r, ignore) ? cell : null;
    hover = cell;
  });

  document.addEventListener('pointercancel', function () {
    if (!drag) return;
    drag = null;
  });

  document.addEventListener('pointerup', function () {
    if (!drag) return;
    var d = drag;
    drag = null;
    if (!prepPhase()) return;
    if (!d.moved && d.kind === 'new') {
      armed = armed === d.cls ? null : d.cls;
      closeSheet();
      syncHud();
      return;
    }
    if (!d.moved && d.kind === 'ship') {
      openSheet(d.id);
      syncHud();
      return;
    }
    if (d.kind === 'new' && d.cell && S.buy(state, d.cls, d.cell.q, d.cell.r)) {
      armed = null;
      persist();
    } else if (d.kind === 'new' && d.moved) {
      flash('补给不够，或这一格放不下。');
    }
    if (d.kind === 'ship' && d.moved && d.cell) {
      S.moveShip(state, d.id, d.cell.q, d.cell.r);
      persist();
    } else if (d.kind === 'ship' && d.moved) {
      flash('这一格放不下。');
    }
    syncHud();
  });

  window.addEventListener('resize', syncOrient);

  syncOrient();
  syncMusicButtons();
  btnContinue.hidden = !readSave();
  var saved = readSave();
  if (saved && saved.music === false) {
    A.setWanted(false);
    syncMusicButtons();
  }

  loadImage(CLIPS.wind.src).then(function (img) {
    if (img) sheets.wind = img;
    coverWait.textContent = '点一下，云舰就醒。';
    bindStaticImages();
    return loadAtlas();
  }).then(function () {
    atlasReady = true;
    if (pendingEnter) {
      var fn = pendingEnter;
      pendingEnter = null;
      queueEnter(fn);
    }
  });

  if (DEBUG) {
    window.__cloud = {
      get state() { return state; },
      get review() { return review; },
      center: function (q, r) {
        var m = metrics(board.clientWidth, board.clientHeight);
        var p = toScreen(m, q, r);
        var rect = board.getBoundingClientRect();
        return { x: rect.left + p.x, y: rect.top + p.y };
      },
      preview: function () {
        return S.preview(state).plans.map(function (p) {
          return p.id + ':' + p.q + ',' + p.r + ':' + (p.moved ? 1 : 0);
        }).join('|');
      },
      battle: function () {
        if (!state.battle) return '';
        return state.battle.plans.map(function (p) {
          return p.id + ':' + p.q + ',' + p.r + ':' + (p.moved ? 1 : 0);
        }).join('|');
      }
    };
  }

  requestAnimationFrame(frame);
})();
