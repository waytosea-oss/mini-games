/* 软桥救援。拖锚点搭桥，试载，暂停看热力图，失败只收回这一次测试。 */
(function () {
  'use strict';

  var P = window.SoftPhysics;
  var AUDIO = window.SOFT_AUDIO;
  var KEY = 'softbridge_save_v1';

  var CLIPS = {
    squash: { src: 'assets/anim/b04-mascot-sheet-squash.webp', still: 'assets/anim/b04-mascot-still-squash.png', fw: 404, fh: 412, cols: 6, n: 24, fps: 12, ax: 206.6751970696203, ay: 214.28743608388498 },
    cable: { src: 'assets/anim/b04-mascot-sheet-cable.webp', still: 'assets/anim/b04-mascot-still-cable.png', fw: 362, fh: 499, cols: 6, n: 24, fps: 12, ax: 196.67837178139405, ay: 192.2921175902058 },
    lean: { src: 'assets/anim/b04-mascot-sheet-lean.webp', still: 'assets/anim/b04-mascot-still-lean.png', fw: 426, fh: 440, cols: 6, n: 24, fps: 12, ax: 218.6765325131569, ay: 218.28827534904988 }
  };

  var BEAST_ART = {
    light: { idle: 'assets/props/b04-beast-light-idle.png', walk: 'assets/props/b04-beast-light-walk.png', ax: 255, ay: 485 },
    mid: { idle: 'assets/props/b04-beast-mid-idle.png', walk: 'assets/props/b04-beast-mid-walk.png', ax: 255, ay: 485 },
    heavy: { idle: 'assets/props/b04-beast-heavy-idle.png', walk: 'assets/props/b04-beast-heavy-walk.png', ax: 256.5, ay: 486 }
  };

  var GEL_CAP = { rest: 173, safe: 165, warn: 154, danger: 146 };
  var CABLE_ANCHOR = {
    'taut-safe': [62, 128.5, 707, 128.5],
    'taut-warn': [59, 127.5, 710, 127.5],
    'taut-danger': [72, 127.5, 695, 127.5],
    slack: [45, 128, 723, 128],
    'slack-span': [66, 192, 702, 192]
  };

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var images = {};
  var design = P.freshDesign();
  var mode = 'cover';
  var sim = null;
  var kind = 'gel';
  var tool = 'link';
  var selected = null;
  var heatmap = false;
  var land = document.documentElement.classList.contains('land');
  var tut = 0;
  var bestStars = 0;
  var cleared = false;
  var drag = null;
  var fx = null;
  var hoverClip = null;
  var leanLeft = 0;
  var mascotFrame = 0;
  var mascotAcc = 0;
  var viewW = 1;
  var viewH = 1;
  var acc = 0;
  var lastT = 0;
  var ramp = null;
  var playStarted = false;

  function img(src) {
    if (!images[src]) {
      var el = new Image();
      el.src = src;
      images[src] = el;
    }
    return images[src];
  }

  function ready(el) {
    return el && el.complete && el.naturalWidth > 0;
  }

  function view() {
    if (land) return { originX: 0.385, originY: 0.45, ppm: 54, W: 1920, H: 1080 };
    return { originX: 0.285, originY: 0.485, ppm: 64, W: 1080, H: 1920 };
  }

  function ppm() {
    var v = view();
    return v.ppm * (viewW / v.W);
  }

  function toCanvas(x, y) {
    var v = view();
    return {
      x: (v.originX + x * v.ppm / v.W) * viewW,
      y: (v.originY - y * v.ppm / v.H) * viewH
    };
  }

  function toWorld(px, py) {
    var v = view();
    return {
      x: (px / viewW - v.originX) * v.W / v.ppm,
      y: (v.originY - py / viewH) * v.H / v.ppm
    };
  }

  function $(id) { return document.getElementById(id); }

  function say(text) { $('banner').textContent = text; }

  function period(text) {
    if (!text) return '';
    return /[。！？]$/.test(text) ? text : text + '。';
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        v: 1,
        design: design,
        heatmap: heatmap,
        kind: kind,
        tool: tool,
        tut: tut,
        music: AUDIO.wanted(),
        bestStars: bestStars,
        cleared: cleared
      }));
    } catch (err) { /* 存档写不进去时仍可继续这一局 */ }
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return false;
      var data = JSON.parse(raw);
      if (!data || !data.design || !data.design.nodes || !data.design.members) return false;
      design = data.design;
      if (typeof design.budget !== 'number') design.budget = P.BUDGET;
      heatmap = !!data.heatmap;
      kind = data.kind === 'cable' ? 'cable' : 'gel';
      tool = data.tool === 'move' ? 'move' : 'link';
      tut = data.tut || 0;
      bestStars = data.bestStars || 0;
      cleared = !!data.cleared;
      if (data.music === false) AUDIO.setWanted(false);
      return true;
    } catch (err) {
      return false;
    }
  }

  function armAudio() {
    AUDIO.arm();
    syncMusic();
  }

  function syncMusic() {
    var on = AUDIO.wanted();
    ['cover-music', 'play-music'].forEach(function (id) {
      var btn = $(id);
      if (!btn) return;
      btn.textContent = on ? '乐' : '静';
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  function toggleMusic() {
    armAudio();
    AUDIO.toggle();
    syncMusic();
    save();
  }

  function applyOrient() {
    var next = window.innerWidth > window.innerHeight;
    land = next;
    document.documentElement.classList.toggle('land', land);
    var cover = $('cover-bg');
    if (cover) {
      cover.src = land
        ? 'assets/cover/b04-cover-16x9-bg.webp'
        : 'assets/cover/b04-cover-3x4-bg.webp';
    }
    if (playStarted) {
      $('scene').src = land
        ? 'assets/scene/b04-scene-landscape.webp'
        : 'assets/scene/b04-scene-portrait.webp';
    }
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

  function drawSheet(ctx, clip, frame, x, y, scale) {
    var source = reduceMotion ? img(clip.still) : img(clip.src);
    if (!ready(source)) return;
    var dw = clip.fw * scale;
    var dh = clip.fh * scale;
    var sx = 0;
    var sy = 0;
    var sw = clip.fw;
    var sh = clip.fh;
    if (!reduceMotion) {
      var col = frame % clip.cols;
      var row = Math.floor(frame / clip.cols);
      sx = col * clip.fw;
      sy = row * clip.fh;
    }
    ctx.drawImage(source, sx, sy, sw, sh, x - clip.ax * scale, y - clip.ay * scale, dw, dh);
  }

  function mascotClip() {
    if (leanLeft > 0) return CLIPS.lean;
    if (hoverClip === 'cable') return CLIPS.cable;
    return CLIPS.squash;
  }

  function drawMascot(ctx, x, y, scale) {
    drawSheet(ctx, mascotClip(), mascotFrame, x, y, scale);
  }

  function preloadPlay() {
    img(CLIPS.cable.src);
    img(CLIPS.lean.src);
    $('budget-track').src = 'assets/ui/b04-budget-track.png';
    $('budget-frame').src = 'assets/ui/b04-budget-frame.png';
    $('icon-play').src = 'assets/ui/b04-btn-play.png';
    $('icon-pause').src = 'assets/ui/b04-btn-pause.png';
    $('icon-reset').src = 'assets/ui/b04-btn-reset.png';
    [

      'assets/scene/b04-scene-portrait.webp',
      'assets/scene/b04-scene-landscape.webp',
      'assets/props/b04-node-empty.png',
      'assets/props/b04-node-selected.png',
      'assets/props/b04-node-overload.png',
      'assets/props/b04-anchor-shore.png',
      'assets/overlays/b04-heatmap-ramp.png',
      'assets/fx/b04-fx-break-sheet.png',
      'assets/fx/b04-fx-win-sheet.png',
      'assets/props/b04-cable-taut-safe.png',
      'assets/props/b04-cable-taut-warn.png',
      'assets/props/b04-cable-taut-danger.png',
      'assets/props/b04-cable-slack.png',
      'assets/props/b04-cable-slack-span.png'
    ].forEach(img);
    ['rest', 'safe', 'warn', 'danger'].forEach(function (state) {
      img('assets/props/b04-gel-' + state + '-cap-l.png');
      img('assets/props/b04-gel-' + state + '-mid.png');
      img('assets/props/b04-gel-' + state + '-cap-r.png');
    });
    Object.keys(BEAST_ART).forEach(function (id) {
      img(BEAST_ART[id].idle);
      img(BEAST_ART[id].walk);
    });
    var rampImg = img('assets/overlays/b04-heatmap-ramp.png');
    rampImg.onload = function () {
      try {
        var c = document.createElement('canvas');
        c.width = rampImg.naturalWidth;
        c.height = rampImg.naturalHeight;
        var g = c.getContext('2d');
        g.drawImage(rampImg, 0, 0);
        ramp = g.getImageData(0, 0, c.width, 1).data;
        ramp.width = c.width;
      } catch (err) { ramp = null; }
    };
  }

  function rampColor(u) {
    if (!ramp) return 'rgba(224,90,74,0.0)';
    var x = Math.max(0, Math.min(ramp.width - 1, Math.round(u * (ramp.width - 1))));
    var i = x * 4;
    return 'rgba(' + ramp[i] + ',' + ramp[i + 1] + ',' + ramp[i + 2] + ',0.8)';
  }

  function nodeOf(id) {
    if (sim && mode !== 'edit') return sim.index[id] || null;
    return P.nodeById(design, id);
  }

  function pointsOf(member) {
    if (sim && mode !== 'edit') {
      var sm = null;
      for (var i = 0; i < sim.members.length; i++) if (sim.members[i].id === member.id) sm = sim.members[i];
      if (sm) {
        var pts = [];
        for (var c = 0; c < sm.chain.length; c++) pts.push(sim.index[sm.chain[c]]);
        return { pts: pts, sim: sm };
      }
    }
    return { pts: [P.nodeById(design, member.a), P.nodeById(design, member.b)], sim: null };
  }

  function gelState(ratio, editing) {
    if (editing || ratio < 0.12) return 'rest';
    if (ratio < 0.46) return 'safe';
    if (ratio < 0.74) return 'warn';
    return 'danger';
  }

  function cableLook(sm, editing) {
    if (editing || !sm) return 'taut-safe';
    if (sm.sag > 0.18 && sm.ratio < 0.22) return sm.sag > 0.45 ? 'slack-span' : 'slack';
    if (sm.ratio < 0.46) return 'taut-safe';
    if (sm.ratio < 0.75) return 'taut-warn';
    return 'taut-danger';
  }

  function drawImage(ctx, image, dx, dy, dw, dh) {
    if (!ready(image)) return;
    ctx.drawImage(image, dx, dy, dw, dh);
  }

  function drawAnchored(ctx, image, ax1, ay1, ax2, ay2, x1, y1, x2, y2) {
    if (!ready(image)) return;
    var p1x = x1;
    var p1y = y1;
    var p2x = x2;
    var p2y = y2;
    if (p2x < p1x || (p2x === p1x && p2y < p1y)) {
      var sx = p1x; p1x = p2x; p2x = sx;
      var sy = p1y; p1y = p2y; p2y = sy;
    }
    var dx = p2x - p1x;
    var dy = p2y - p1y;
    var len = Math.sqrt(dx * dx + dy * dy) || 1;
    var src = ax2 - ax1 || 1;
    var scale = len / src;
    ctx.save();
    ctx.translate(p1x, p1y);
    ctx.rotate(Math.atan2(dy, dx));
    ctx.scale(scale, scale);
    ctx.drawImage(image, -ax1, -ay1);
    ctx.restore();
  }

  function drawMember(ctx, member) {
    var pack = pointsOf(member);
    var pts = pack.pts.filter(Boolean);
    if (pts.length < 2) return;
    var editing = mode === 'edit';
    var ratio = pack.sim ? pack.sim.ratio : 0;
    var selectedOn = selected === member.id;
    if (selectedOn) {
      ctx.save();
      ctx.strokeStyle = 'rgba(127,200,180,0.85)';
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.beginPath();
      var s0 = toCanvas(pts[0].x, pts[0].y);
      ctx.moveTo(s0.x, s0.y);
      for (var s = 1; s < pts.length; s++) {
        var sp = toCanvas(pts[s].x, pts[s].y);
        ctx.lineTo(sp.x, sp.y);
      }
      ctx.stroke();
      ctx.restore();
    }
    if (member.kind === 'cable' || (pack.sim && pack.sim.kind === 'cable')) {
      var look = cableLook(pack.sim, editing);
      var file = look.indexOf('slack') === 0
        ? 'assets/props/b04-cable-' + look + '.png'
        : 'assets/props/b04-cable-' + look + '.png';
      var an = CABLE_ANCHOR[look];
      var a = pts[0];
      var b = pts[pts.length - 1];
      var pa = toCanvas(a.x, a.y);
      var pb = toCanvas(b.x, b.y);
      drawAnchored(ctx, img(file), an[0], an[1], an[2], an[3], pa.x, pa.y, pb.x, pb.y);
    } else {
      var state = gelState(ratio, editing);
      var thick = (GEL_CAP[state] / GEL_CAP.rest) * (1 - Math.min(0.28, ratio * 0.2));
      var base = Math.max(12, 18 * thick * (ppm() / 64));
      var capL = img('assets/props/b04-gel-' + state + '-cap-l.png');
      var mid = img('assets/props/b04-gel-' + state + '-mid.png');
      var capR = img('assets/props/b04-gel-' + state + '-cap-r.png');
      var skip = -1;
      if (pack.sim && pack.sim.broken) skip = Math.round((pack.sim.hotT || 0.5) * (pts.length - 2));
      for (var i = 0; i < pts.length - 1; i++) {
        if (i === skip) continue;
        var ca = toCanvas(pts[i].x, pts[i].y);
        var cb = toCanvas(pts[i + 1].x, pts[i + 1].y);
        var dx = cb.x - ca.x;
        var dy = cb.y - ca.y;
        var len = Math.sqrt(dx * dx + dy * dy) || 1;
        var capW = Math.min(base * 0.46, len * 0.28);
        ctx.save();
        ctx.translate(ca.x, ca.y);
        ctx.rotate(Math.atan2(dy, dx));
        if (i === 0 && ready(capL)) ctx.drawImage(capL, 0, -base / 2, capW, base);
        var x0 = i === 0 ? capW * 0.62 : -1;
        var x1 = i === pts.length - 2 ? len - capW * 0.62 : len + 1;
        if (ready(mid)) ctx.drawImage(mid, x0, -base / 2, Math.max(1, x1 - x0), base);
        if (i === pts.length - 2 && ready(capR)) ctx.drawImage(capR, len - capW, -base / 2, capW, base);
        ctx.restore();
      }
    }
    if (heatmap && pack.sim && !editing) {
      ctx.save();
      ctx.strokeStyle = rampColor(Math.max(0, Math.min(1, pack.sim.ratio)));
      ctx.globalAlpha = 0.72;
      ctx.lineWidth = Math.max(6, 10 * (ppm() / 64));
      ctx.lineCap = 'round';
      ctx.beginPath();
      var h0 = toCanvas(pts[0].x, pts[0].y);
      ctx.moveTo(h0.x, h0.y);
      for (var h = 1; h < pts.length; h++) {
        var hp = toCanvas(pts[h].x, pts[h].y);
        ctx.lineTo(hp.x, hp.y);
      }
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawNodeSprite(ctx, node, art, worldSize) {
    var anchor = art === 'shore'
      ? [256.4, 255.7]
      : art === 'selected'
        ? [253.7, 266.2]
        : art === 'overload'
          ? [253.9, 266.9]
          : [251.4, 268.7];
    var file = art === 'shore'
      ? 'assets/props/b04-anchor-shore.png'
      : 'assets/props/b04-node-' + art + '.png';
    var image = img(file);
    if (!ready(image)) return;
    var p = toCanvas(node.x, node.y);
    var size = worldSize * ppm();
    var scale = size / 512;
    ctx.drawImage(image, p.x - anchor[0] * scale, p.y - anchor[1] * scale, 512 * scale, 512 * scale);
  }

  function drawBeast(ctx, id, x, y, walking) {
    var spec = BEAST_ART[id];
    if (!spec) return;
    var image = img(walking ? spec.walk : spec.idle);
    if (!ready(image)) image = img(spec.idle);
    if (!ready(image)) return;
    var p = toCanvas(x, y);
    var scale = (1.72 * ppm()) / 512;
    ctx.drawImage(image, p.x - spec.ax * scale, p.y - spec.ay * scale, 512 * scale, 512 * scale);
  }

  function drawFx(ctx) {
    if (!fx) return;
    var age = (performance.now() - fx.t0) / 1000;
    var frame = Math.floor(age * 12);
    if (frame >= 8) {
      if (fx.kind === 'break' && mode === 'fail') frame = 7;
      else { fx = null; return; }
    }
    var sheet = img(fx.kind === 'win' ? 'assets/fx/b04-fx-win-sheet.png' : 'assets/fx/b04-fx-break-sheet.png');
    if (!ready(sheet)) return;
    var col = frame % 4;
    var row = Math.floor(frame / 4);
    var p = toCanvas(fx.x, fx.y);
    var size = 1.35 * ppm();
    ctx.drawImage(sheet, col * 512, row * 512, 512, 512, p.x - size / 2, p.y - size / 2, size, size);
  }

  function reachesRight() {
    var adj = { LD: [] };
    design.members.forEach(function (m) {
      if (m.kind !== 'gel') return;
      if (!adj[m.a]) adj[m.a] = [];
      if (!adj[m.b]) adj[m.b] = [];
      adj[m.a].push(m.b);
      adj[m.b].push(m.a);
    });
    var seen = { LD: true };
    var q = ['LD'];
    for (var i = 0; i < q.length; i++) {
      (adj[q[i]] || []).forEach(function (n) {
        if (!seen[n]) { seen[n] = true; q.push(n); }
      });
    }
    return !!seen.RD;
  }

  function ghostTarget() {
    var free = design.nodes.filter(function (n) { return !n.fixed; });
    if (!design.members.length) return { x: 4, y: 0.2, from: 'LD' };
    if (!reachesRight()) {
      var from = free.length ? free[free.length - 1].id : 'LD';
      return { x: P.SPAN, y: 0, from: from, snap: 'RD' };
    }
    var cables = design.members.some(function (m) { return m.kind === 'cable'; });
    if (!cables && free.length) {
      var mid = free.slice().sort(function (a, b) { return Math.abs(a.x - 4) - Math.abs(b.x - 4); })[0];
      return { x: mid.x, y: mid.y, from: 'LH', snap: mid.id };
    }
    return null;
  }

  function drawGhost(ctx, now) {
    if (mode !== 'edit' || tut > 4) return;
    var g = ghostTarget();
    if (!g) return;
    var pulse = 0.5 + 0.5 * Math.sin(now / 280);
    var p = toCanvas(g.x, g.y);
    ctx.save();
    ctx.strokeStyle = 'rgba(95,175,154,' + (0.45 + pulse * 0.4) + ')';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 16 + pulse * 8, 0, Math.PI * 2);
    ctx.stroke();
    if (g.from) {
      var from = P.nodeById(design, g.from);
      if (from) {
        var a = toCanvas(from.x, from.y);
        ctx.setLineDash([7, 7]);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function renderBoard() {
    var canvas = $('board');
    if (!canvas || $('screen-play').hidden) return;
    var box = resizeCanvas(canvas);
    viewW = box.w;
    viewH = box.h;
    var ctx = box.ctx;
    ctx.clearRect(0, 0, viewW, viewH);
    var cables = [];
    var gels = [];
    design.members.forEach(function (m) {
      if (m.kind === 'cable') cables.push(m);
      else gels.push(m);
    });
    cables.forEach(function (m) { drawMember(ctx, m); });
    gels.forEach(function (m) { drawMember(ctx, m); });
    design.nodes.forEach(function (n) {
      var live = nodeOf(n.id) || n;
      if (n.fixed) drawNodeSprite(ctx, live, 'shore', n.role === 'high' ? 1.05 : 1.12);
    });
    design.nodes.forEach(function (n) {
      if (n.fixed) return;
      var live = nodeOf(n.id) || n;
      var art = 'empty';
      if (selected === n.id) art = 'selected';
      if (sim && live.ratio > 0.82) art = 'overload';
      drawNodeSprite(ctx, live, art, 0.96);
    });
    if (sim && sim.beast && sim.beast.mode !== 'done') {
      drawBeast(ctx, sim.beast.id, sim.beast.x, sim.beast.y, sim.beast.mode === 'walk' && (sim.beast.walkFrame % 2 === 0));
    }
    if (sim && sim.stood) {
      sim.stood.forEach(function (b) { drawBeast(ctx, b.id, b.x, b.y, false); });
    }
    drawFx(ctx);
    if (drag && drag.type === 'link') {
      var from = P.nodeById(design, drag.id);
      if (from) {
        var a = toCanvas(from.x, from.y);
        var b = toCanvas(drag.x, drag.y);
        ctx.save();
        ctx.strokeStyle = drag.bad ? '#e05a4a' : (kind === 'gel' ? '#7ec8b4' : '#e8d5aa');
        ctx.setLineDash([5, 6]);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        ctx.font = '14px "WenQuanYi Micro Hei", sans-serif';
        ctx.fillStyle = '#3e3e3a';
        ctx.fillText(drag.label || '', b.x + 8, b.y - 8);
        ctx.restore();
      }
    }
    drawGhost(ctx, performance.now());
    var spot = land ? { x: viewW * 0.12, y: viewH * 0.58 } : { x: viewW * 0.14, y: viewH * 0.72 };
    var scale = (land ? viewW * 0.11 : viewW * 0.2) / CLIPS.squash.fw;
    drawMascot(ctx, spot.x, spot.y, scale);
    if (sim && sim.fail && (mode === 'fail' || mode === 'paused')) {
      var pin = toCanvas(sim.fail.x, sim.fail.y);
      ctx.save();
      ctx.strokeStyle = '#e05a4a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(pin.x, pin.y, 18, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  function renderCover() {
    var canvas = $('cover-actor');
    if (!canvas || $('screen-cover').hidden) return;
    var box = resizeCanvas(canvas);
    var ctx = box.ctx;
    ctx.clearRect(0, 0, box.w, box.h);
    var spot = land ? { x: box.w * 0.2, y: box.h * 0.7 } : { x: box.w * 0.3, y: box.h * 0.76 };
    var scale = (land ? box.w * 0.16 : box.w * 0.34) / CLIPS.squash.fw;
    drawMascot(ctx, spot.x, spot.y, scale);
  }

  function beastStatus() {
    if (!sim || !sim.beast || sim.beast.mode === 'done') return '';
    var spec = null;
    for (var i = 0; i < P.BEASTS.length; i++) if (P.BEASTS[i].id === sim.beast.id) spec = P.BEASTS[i];
    if (!spec) return '';
    return '正在过桥：' + spec.name + '（' + spec.tag + '）。';
  }

  function updateQueue() {
    var box = $('queue');
    var arrived = {};
    if (sim && sim.stood) sim.stood.forEach(function (b) { arrived[b.id] = true; });
    var active = sim && sim.beast && sim.beast.mode !== 'done' ? sim.beast.id : '';
    box.innerHTML = '';
    P.BEASTS.forEach(function (b) {
      var slot = document.createElement('div');
      slot.className = 'slot' + (arrived[b.id] ? ' done' : '') + (active === b.id ? ' now' : '');
      var image = document.createElement('img');
      image.src = BEAST_ART[b.id].idle;
      image.alt = '';
      var label = document.createElement('small');
      label.textContent = b.tag;
      slot.appendChild(image);
      slot.appendChild(label);
      box.appendChild(slot);
    });
  }

  function updateBudget() {
    var pct = Math.max(0, Math.min(1, design.budget / design.budgetMax));
    var clip = $('fillclip');
    var fill = $('fillimg');
    clip.style.width = (pct * 100) + '%';
    var full = $('budget').clientWidth || 200;
    fill.style.width = full + 'px';
    fill.src = pct <= 0.3 ? 'assets/ui/b04-budget-fill-low.png' : 'assets/ui/b04-budget-fill-full.png';
    $('budget-num').textContent = '余 ' + design.budget;
    $('btn-gel').classList.toggle('on', kind === 'gel');
    $('btn-cable').classList.toggle('on', kind === 'cable');
    $('btn-tool').textContent = tool === 'move' ? '挪动' : '连结';
    $('btn-tool').classList.toggle('on', tool === 'move');
    var heat = $('heat-img');
    heat.src = heatmap ? 'assets/ui/b04-btn-heatmap-on.png' : 'assets/ui/b04-btn-heatmap-off.png';
    $('btn-heat').setAttribute('aria-pressed', heatmap ? 'true' : 'false');
    $('btn-tutor').hidden = tut >= 3 || mode === 'win';
  }

  function updateInspect() {
    var box = $('inspect');
    if (mode === 'win') { box.hidden = true; return; }
    var member = selected ? P.memberById(design, selected) : null;
    if (!member) { box.hidden = true; return; }
    var sm = null;
    if (sim) {
      for (var i = 0; i < sim.members.length; i++) if (sim.members[i].id === member.id) sm = sim.members[i];
    }
    var line = member.name + '，长约 ' + member.rest.toFixed(1) + '，费用 ' + member.cost + '。';
    if (sm) {
      var look = member.kind === 'cable' ? cableLook(sm, false) : gelState(sm.ratio, false);
      var slack = String(look).indexOf('slack') === 0;
      line += slack
        ? '索垂下来了，这一段没有在受拉。'
        : (sm.hotMode === 'push' ? '正在受压。' : '正在受拉。');
      line += '吃力程度：' + P.quoteRatio(sm.ratio) + '。';
    } else if (!member.tested) {
      line += '还没试载，拆掉会退回全部费用。';
    } else {
      line += '已经试载过，拆掉只退回一半。';
    }
    $('inspect-copy').textContent = line;
    $('btn-remove').hidden = mode !== 'edit';
    box.hidden = false;
  }

  function showResult(stars, copy) {
    $('result').hidden = false;
    $('result-title').textContent = '三只都到对岸了';
    var holder = $('stars');
    holder.innerHTML = '';
    for (var i = 0; i < 3; i++) {
      var dot = document.createElement('i');
      dot.className = 'star' + (i < stars ? ' on' : '');
      holder.appendChild(dot);
    }
    $('result-copy').textContent = copy;
  }

  function hideResult() { $('result').hidden = true; }

  function starCopy(info) {
    if (info.stars >= 3) return '受力留有余地，材料也没有铺满。这版桥又稳又克制。';
    if (info.used > 0.9) return '桥很稳，材料铺得偏满。拆掉多余的一根，还能把用量收回来。';
    if (info.stars === 2) return '桥能把三只都送过去。余量或用量还有一处偏紧。';
    return '勉强过桥。有的材料已经贴着断裂的边缘，再省也不会更安全。';
  }

  function failCopy(f) {
    if (!f) return '这一次没有过去。';
    if (f.type === 'fall') return f.name + ' 在' + f.where + '踩空了。脚下没有还连着岸的胶梁，这一次试载停在这里。';
    if (f.type === 'node') return f.name + ' 裂开了。四周的拉扯超过了这个节点能咬住的限度。';
    if (f.kind === 'cable') return f.name + ' 在' + f.where + '绷断了。这段拉力超过了拉索的限度。';
    var how = f.mode === 'push' ? '压力' : (f.mode === 'sag' ? '下沉' : '拉力');
    var extra = f.mode === 'sag' ? '这一段被拉开以后沉了下去，超过了这根胶梁的限度。' : ('这里的' + how + '超过了这根胶梁的限度。');
    return f.name + ' 在' + f.where + '断了。' + extra;
  }

  function tutorLine() {
    if (tut <= 0) return '芽芽最轻，奶团居中，蜜石最重。它们会按这个顺序过桥。';
    if (tut === 1) return '选中胶梁，从岸上的锚点拖进峡谷，松手就放下节点。拉索只受拉，受压时会垂下来。';
    return '点试载看它们走。可以暂停看热力图。重置只收回这一次测试，桥还在。';
  }

  function refreshCopy() {
    updateBudget();
    updateQueue();
    updateInspect();
    if (mode === 'edit') {
      if (tut < 3) say(tutorLine());
      else if (!$('banner').textContent) say('桥还停在你放下的样子。改完可以再试载。');
    } else if (mode === 'run') {
      say(beastStatus() || '试载开始了。');
    }
  }

  function enterPlay(fresh) {
    armAudio();
    playStarted = true;
    preloadPlay();
    if (fresh) {
      design = P.freshDesign();
      tut = 0;
      selected = null;
    }
    sim = null;
    mode = 'edit';
    fx = null;
    hideResult();
    $('screen-cover').hidden = true;
    $('screen-play').hidden = false;
    applyOrient();
    say(fresh ? tutorLine() : '上次的桥还在。试载不会停在一半，可以从这版再试。');
    save();
    refreshCopy();
  }

  function startTest() {
    if (mode === 'paused') { mode = 'run'; return; }
    if (!design.members.length) {
      say('先拉一根胶梁，小兽才有路走。');
      return;
    }
    P.markTested(design);
    sim = P.startRun(design);
    mode = 'run';
    selected = null;
    fx = null;
    hideResult();
    acc = 0;
    save();
    say(beastStatus());
    refreshCopy();
  }

  function pauseTest() {
    if (mode === 'run') {
      mode = 'paused';
      say('已暂停。打开热力图，能看见每段吃力的深浅。' + (beastStatus() ? beastStatus() : ''));
    } else if (mode === 'paused') {
      mode = 'run';
      say(beastStatus());
    }
    refreshCopy();
  }

  function resetTest() {
    if (mode === 'edit') {
      say('这一版还没在试载里。桥就停在你放下的样子。');
      return;
    }
    sim = null;
    mode = 'edit';
    fx = null;
    hideResult();
    say('测试收回了。这版桥还在，改完可以再试。');
    refreshCopy();
    save();
  }

  function onFail() {
    mode = 'fail';
    var f = sim.fail;
    if (f && typeof f.x === 'number') fx = { kind: 'break', x: f.x, y: f.y, t0: performance.now() };
    say(failCopy(f));
    AUDIO.sting('break');
    refreshCopy();
  }

  function onWin() {
    mode = 'win';
    var info = P.starsFor(sim.peak, design.budget, design.budgetMax);
    if (info.stars > bestStars) bestStars = info.stars;
    cleared = true;
    tut = Math.max(tut, 3);
    var end = sim.stood && sim.stood.length ? sim.stood[sim.stood.length - 1] : { x: P.SPAN, y: 0 };
    fx = { kind: 'win', x: end.x, y: end.y + 0.4, t0: performance.now() };
    say('芽芽、奶团、蜜石都走到对岸了。');
    showResult(info.stars, starCopy(info));
    AUDIO.sting('win');
    save();
    refreshCopy();
  }

  function removeSelected() {
    if (mode !== 'edit' || !selected) return;
    var back = P.removeMember(design, selected);
    if (!back.ok) { say(period(back.reason)); return; }
    selected = null;
    say(back.full
      ? '拆除' + back.name + '，退回全部预算 ' + back.refund + '。'
      : '拆除' + back.name + '。这根已经试载过，只退回一半，' + back.refund + '。');
    save();
    refreshCopy();
  }

  function pickNode(w, radius) {
    var best = null;
    var bestD = radius;
    for (var i = 0; i < design.nodes.length; i++) {
      var n = design.nodes[i];
      var live = nodeOf(n.id) || n;
      var d = Math.hypot(live.x - w.x, live.y - w.y);
      if (d <= bestD) { bestD = d; best = n; }
    }
    return best;
  }

  function pickMember(w) {
    var best = null;
    var bestD = 0.42;
    for (var i = 0; i < design.members.length; i++) {
      var m = design.members[i];
      var pack = pointsOf(m);
      var pts = pack.pts;
      for (var s = 0; s < pts.length - 1; s++) {
        var a = pts[s];
        var b = pts[s + 1];
        if (!a || !b) continue;
        var dx = b.x - a.x;
        var dy = b.y - a.y;
        var L2 = dx * dx + dy * dy || 1e-6;
        var t = Math.max(0, Math.min(1, ((w.x - a.x) * dx + (w.y - a.y) * dy) / L2));
        var px = a.x + dx * t;
        var py = a.y + dy * t;
        var dist = Math.hypot(px - w.x, py - w.y);
        if (dist < bestD) { bestD = dist; best = m; }
      }
    }
    return best;
  }

  function pointerPos(ev) {
    var rect = $('board').getBoundingClientRect();
    return toWorld(ev.clientX - rect.left, ev.clientY - rect.top);
  }

  function mascotHit(ev) {
    var rect = $('board').getBoundingClientRect();
    var x = ev.clientX - rect.left;
    var y = ev.clientY - rect.top;
    var spot = land ? { x: viewW * 0.12, y: viewH * 0.58 } : { x: viewW * 0.14, y: viewH * 0.72 };
    return Math.hypot(x - spot.x, y - spot.y) < Math.max(48, viewW * 0.08);
  }

  function previewDrag() {
    if (!drag || drag.type !== 'link') return;
    var from = P.nodeById(design, drag.id);
    if (!from) return;
    var snapped = null;
    var best = 0.78;
    design.nodes.forEach(function (n) {
      if (n.id === drag.id) return;
      var d = Math.hypot(n.x - drag.x, n.y - drag.y);
      if (d < best) { best = d; snapped = n; }
    });
    var tx = snapped ? snapped.x : drag.x;
    var ty = snapped ? snapped.y : drag.y;
    var len = Math.hypot(from.x - tx, from.y - ty);
    var cost = P.costOf(kind, len);
    drag.bad = len < 0.85 || len > 9.2 || (!snapped && cost > design.budget);
    drag.label = drag.bad ? (len < 0.85 ? '太短' : cost > design.budget ? '预算不够' : '太长') : ('约 ' + cost);
  }

  function commitDrag() {
    if (!drag) return;
    if (drag.type === 'move') {
      var moved = P.moveNode(design, drag.id, drag.x, drag.y);
      say(moved.ok ? '节点挪好了。' : period(moved.reason));
      if (moved.ok && tut < 2) tut = 2;
    } else if (drag.type === 'link') {
      var len = 0;
      var from = P.nodeById(design, drag.id);
      if (from) len = Math.hypot(from.x - drag.x, from.y - drag.y);
      if (len < 0.28) {
        selected = drag.id;
      } else {
        var built = P.tryBuild(design, drag.id, drag.x, drag.y, kind);
        if (!built.ok) say(period(built.reason));
        else {
          selected = built.member.id;
          if (tut < 2) tut = 2;
          say(built.member.name + ' 放好了，用掉 ' + built.cost + '。还没试载的话，拆掉会全部退回。');
        }
      }
    }
    drag = null;
    save();
    refreshCopy();
  }

  function onPointerDown(ev) {
    armAudio();
    if (mode === 'win') return;
    var w = pointerPos(ev);
    if (mascotHit(ev) && !pickNode(w, 0.7)) {
      img(CLIPS.lean.src);
      leanLeft = 24;
      hoverClip = null;
      ev.preventDefault();
      return;
    }
    if (mode !== 'edit') {
      var look = pickMember(w) || pickNode(w, 0.7);
      selected = look ? look.id : null;
      updateInspect();
      return;
    }
    var node = pickNode(w, Math.max(0.7, 28 / ppm()));
    if (tool === 'move' && node && !node.fixed) {
      drag = { type: 'move', id: node.id, x: node.x, y: node.y };
      $('board').setPointerCapture(ev.pointerId);
      ev.preventDefault();
      return;
    }
    if (node) {
      drag = { type: 'link', id: node.id, x: w.x, y: w.y, label: '' };
      $('board').setPointerCapture(ev.pointerId);
      ev.preventDefault();
      return;
    }
    var member = pickMember(w);
    selected = member ? member.id : null;
    updateInspect();
  }

  function onPointerMove(ev) {
    if (!drag) {
      if (mascotHit(ev) && leanLeft <= 0) {
        img(CLIPS.cable.src);
        hoverClip = 'cable';
      }
      else if (leanLeft <= 0) hoverClip = null;
      return;
    }
    var w = pointerPos(ev);
    drag.x = w.x;
    drag.y = w.y;
    previewDrag();
  }

  function onPointerUp(ev) {
    if (!drag) return;
    var w = pointerPos(ev);
    drag.x = w.x;
    drag.y = w.y;
    commitDrag();
  }

  function frame(t) {
    var dt = Math.min(0.05, lastT ? (t - lastT) / 1000 : 0);
    lastT = t;
    if (!reduceMotion) {
      mascotAcc += dt;
      var clip = mascotClip();
      var step = 1 / clip.fps;
      while (mascotAcc >= step) {
        mascotAcc -= step;
        mascotFrame = (mascotFrame + 1) % clip.n;
        if (leanLeft > 0) {
          leanLeft -= 1;
          if (leanLeft <= 0) mascotFrame = 0;
        }
      }
    }
    if (mode === 'run' && sim) {
      acc += dt;
      var guard = 0;
      while (acc >= P.DT && guard < 16 && sim.phase === 'run') {
        P.step(sim);
        acc -= P.DT;
        guard++;
      }
      if (sim.phase === 'fail') onFail();
      else if (sim.phase === 'win') onWin();
      else say(beastStatus());
      updateQueue();
    }
    renderCover();
    renderBoard();
    requestAnimationFrame(frame);
  }

  function bind() {
    $('cover-music').addEventListener('click', toggleMusic);
    $('play-music').addEventListener('click', toggleMusic);
    $('btn-start').addEventListener('click', function () { enterPlay(true); });
    $('btn-continue').addEventListener('click', function () { enterPlay(false); });
    $('btn-gel').addEventListener('click', function () { kind = 'gel'; save(); refreshCopy(); });
    $('btn-cable').addEventListener('click', function () { kind = 'cable'; save(); refreshCopy(); });
    $('btn-tool').addEventListener('click', function () {
      tool = tool === 'move' ? 'link' : 'move';
      say(tool === 'move' ? '挪动模式。岸上的锚拖不走，只能挪你放下的节点。' : '连结模式。从锚点拖出去，松手接上新的一段。');
      save();
      refreshCopy();
    });
    $('btn-play').addEventListener('click', function () { armAudio(); startTest(); });
    $('btn-pause').addEventListener('click', pauseTest);
    $('btn-reset').addEventListener('click', resetTest);
    $('btn-heat').addEventListener('click', function () {
      heatmap = !heatmap;
      say(heatmap ? '热力图开了。薄荷是安全，暖蜜是吃紧，珊瑚红是快断了。' : '热力图关了。胶梁和拉索仍会用颜色和长短表示吃力。');
      save();
      refreshCopy();
    });
    $('btn-remove').addEventListener('click', removeSelected);
    $('btn-tutor').addEventListener('click', function () {
      tut = Math.min(3, tut + 1);
      say(tut >= 3 ? '教学先收到这里。桥可以随时改，试载可以重复。' : tutorLine());
      save();
      refreshCopy();
    });
    $('btn-tweak').addEventListener('click', function () { resetTest(); });
    $('btn-retry').addEventListener('click', function () { startTest(); });
    var board = $('board');
    board.addEventListener('pointerdown', onPointerDown);
    board.addEventListener('pointermove', onPointerMove);
    board.addEventListener('pointerup', onPointerUp);
    board.addEventListener('pointercancel', function () { drag = null; });
    board.addEventListener('pointerleave', function () { if (leanLeft <= 0) hoverClip = null; });
    window.addEventListener('keydown', function (ev) {
      if (ev.repeat) return;
      if (ev.code === 'Space') { ev.preventDefault(); if (mode === 'run' || mode === 'paused') pauseTest(); else if (mode === 'edit' || mode === 'fail') startTest(); }
    });
    window.addEventListener('resize', function () { applyOrient(); });
    document.addEventListener('visibilitychange', function () { AUDIO.visibility(document.hidden); });
    window.addEventListener('pointerdown', armAudio, { once: false });
  }

  function boot() {
    img(CLIPS.squash.src);
    var had = load();
    if (had && design.members && design.members.length) $('btn-continue').hidden = false;
    applyOrient();
    syncMusic();
    bind();
    requestAnimationFrame(frame);
    window.SOFT_DEBUG = {
      design: function () { return design; },
      mode: function () { return mode; },
      sim: function () { return sim; },
      enter: function () { enterPlay(!had); },
      buildTruss: function () {
        if (mode === 'cover') enterPlay(true);
        design = P.freshDesign();
        var r = P.tryBuild(design, 'LD', 4, 0.2, 'gel');
        P.tryBuild(design, r.node.id, P.SPAN, 0, 'gel');
        P.tryBuild(design, 'LH', r.node.x, r.node.y, 'cable');
        P.tryBuild(design, 'RH', r.node.x, r.node.y, 'cable');
        mode = 'edit';
        sim = null;
        save();
        refreshCopy();
        return design.budget;
      },
      buildSingle: function () {
        if (mode === 'cover') enterPlay(true);
        design = P.freshDesign();
        P.tryBuild(design, 'LD', P.SPAN, 0, 'gel');
        mode = 'edit';
        sim = null;
        save();
        refreshCopy();
      },
      play: startTest,
      reset: resetTest,
      remove: removeSelected,
      select: function (id) { selected = id; updateInspect(); }
    };
  }

  boot();
})();
