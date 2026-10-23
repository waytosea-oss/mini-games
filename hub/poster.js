/* 「今日」动态海报：每张卡 = 静帧海报图（首屏/降级）+ 主角主题循环视频（H.264，静音内联）+ 少量实时主题粒子。
   只播放可见的卡；划走、页面切到后台或滚出屏幕即暂停；邻近卡片才开始加载视频。
   系统开启「减弱动态效果」或省流量模式时只显示静帧。 */
(function () {
  'use strict';
  var track = document.getElementById('track'); if (!track) return;
  var cards = [].slice.call(track.querySelectorAll('.story[data-g]'));
  var mqRM = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var conn = navigator.connection || {};
  function still() { return mqRM.matches || conn.saveData === true; }
  var DPR = Math.min(2, window.devicePixelRatio || 1);
  var rand = Math.random;
  function R(a, b) { return a + rand() * (b - a); }
  function pick(a) { return a[(rand() * a.length) | 0]; }

  /* ---------- 预渲染粒子贴图（种类 + 颜色缓存） ---------- */
  var SPR = {};
  function rgba(h, a) { var n = parseInt(h.slice(1), 16); return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')'; }
  function spr(k, col) {
    var key = k + col; if (SPR[key]) return SPR[key];
    var S = 64, m = 32, c = document.createElement('canvas'); c.width = c.height = S; var x = c.getContext('2d'), g;
    if (k === 'glow') { g = x.createRadialGradient(m, m, 0, m, m, m); g.addColorStop(0, rgba(col, .6)); g.addColorStop(.45, rgba(col, .18)); g.addColorStop(1, rgba(col, 0)); x.fillStyle = g; x.fillRect(0, 0, S, S); }
    else if (k === 'dot') { g = x.createRadialGradient(m, m, 0, m, m, m * .5); g.addColorStop(0, '#fff'); g.addColorStop(.3, rgba(col, .95)); g.addColorStop(1, rgba(col, 0)); x.fillStyle = g; x.fillRect(0, 0, S, S); }
    else if (k === 'spark') {
      g = x.createRadialGradient(m, m, 0, m, m, m * .7); g.addColorStop(0, rgba(col, .5)); g.addColorStop(1, rgba(col, 0)); x.fillStyle = g; x.fillRect(0, 0, S, S);
      var ray = function (r, w, cl) { x.fillStyle = cl; x.beginPath(); x.moveTo(m, m - r); x.quadraticCurveTo(m + w, m - w, m + r, m); x.quadraticCurveTo(m + w, m + w, m, m + r); x.quadraticCurveTo(m - w, m + w, m - r, m); x.quadraticCurveTo(m - w, m - w, m, m - r); x.fill(); };
      ray(m * .9, 3, col); ray(m * .42, 2, '#ffffff');
    }
    else if (k === 'bubble') { x.strokeStyle = rgba(col, .85); x.lineWidth = 3; x.beginPath(); x.arc(m, m, m * .55, 0, 7); x.stroke(); x.fillStyle = rgba(col, .14); x.fill(); x.fillStyle = 'rgba(255,255,255,.9)'; x.beginPath(); x.arc(m - 7, m - 7, 4, 0, 7); x.fill(); }
    else if (k === 'ring') { x.strokeStyle = col; x.lineWidth = 5; x.beginPath(); x.arc(m, m, m * .78, 0, 7); x.stroke(); x.strokeStyle = 'rgba(255,255,255,.7)'; x.lineWidth = 1.5; x.beginPath(); x.arc(m, m, m * .78, 0, 7); x.stroke(); }
    else if (k === 'smoke') { g = x.createRadialGradient(m, m, 0, m, m, m); g.addColorStop(0, rgba(col, .5)); g.addColorStop(.55, rgba(col, .2)); g.addColorStop(1, rgba(col, 0)); x.fillStyle = g; x.fillRect(0, 0, S, S); }
    else if (k === 'petal') {
      x.translate(m, m); g = x.createLinearGradient(0, -m * .8, 0, m * .8); g.addColorStop(0, '#ffffff'); g.addColorStop(.35, col); g.addColorStop(1, rgba(col, .9));
      x.fillStyle = g; x.beginPath(); x.moveTo(0, -m * .85); x.bezierCurveTo(m * .62, -m * .45, m * .5, m * .5, 0, m * .85); x.bezierCurveTo(-m * .5, m * .5, -m * .62, -m * .45, 0, -m * .85); x.fill();
      x.strokeStyle = 'rgba(255,255,255,.55)'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(0, -m * .6); x.lineTo(0, m * .6); x.stroke();
    }
    else if (k === 'px') { x.fillStyle = col; x.fillRect(18, 18, 28, 28); x.fillStyle = 'rgba(255,255,255,.6)'; x.fillRect(18, 18, 14, 14); }
    else if (k === 'cross') { g = x.createRadialGradient(m, m, 0, m, m, m); g.addColorStop(0, rgba(col, .35)); g.addColorStop(1, rgba(col, 0)); x.fillStyle = g; x.fillRect(0, 0, S, S); x.fillStyle = col; x.fillRect(m - 6, m - 18, 12, 36); x.fillRect(m - 18, m - 6, 36, 12); x.fillStyle = '#fff'; x.fillRect(m - 3, m - 13, 6, 26); x.fillRect(m - 13, m - 3, 26, 6); }
    return (SPR[key] = c);
  }

  /* ---------- 各游戏主题粒子（坐标、尺寸均为卡片宽高的比例） ---------- */
  // e: 发射器 {rate 每秒, max, make() 返回粒子}
  var CFG = {
    shooter: [ // 高速星流 + 三喷口像素火花
      { rate: 10, max: 16, make: function () { return { k: 'streak', c: '#cfe8ff', x: R(0, 1), y: -.08, vy: R(.9, 1.7), len: R(.03, .08), a: R(.25, .6), life: 1.6 }; } },
      { rate: 16, max: 24, make: function () { var n = pick([.402, .5, .597]); return { k: 'px', c: pick(['#9ff3ff', '#ffffff', '#4fc8ff']), x: n + R(-.012, .012), y: .745 + R(0, .02), vx: R(-.03, .03), vy: R(.18, .34), s: R(.016, .026), life: R(.35, .6), add: 1 }; } }
    ],
    potion: [ // 魔法星光缓缓上浮
      { rate: 5, max: 14, make: function () { return { k: 'spark', c: pick(['#ffe27a', '#e3b5ff', '#ffffff', '#ffd1f2']), x: R(.2, .8), y: R(.35, .8), vx: R(-.01, .01), vy: R(-.07, -.03), s: R(.035, .07), life: R(1.2, 2.2), tw: .5, add: 1 }; } },
      { rate: 1.6, max: 5, make: function () { return { k: 'glow', c: '#b36bff', x: R(.15, .85), y: R(.4, .85), vy: -.02, s: R(.14, .22), life: R(2, 3), a: .5, add: 1 }; } }
    ],
    grab: [ // 炭火火星 + 烤串烟雾
      { rate: 9, max: 20, make: function () { return { k: 'dot', c: pick(['#ffb347', '#ff7a2e', '#ffd27a']), x: R(.08, .92), y: R(.78, .92), vx: R(-.02, .02), vy: R(-.3, -.14), wob: .05, s: R(.018, .034), life: R(1.2, 2.4), tw: .35, add: 1 }; } },
      { rate: 1.3, max: 5, make: function () { return { k: 'smoke', c: '#f4efe8', x: R(.25, .75), y: R(.78, .86), vx: R(-.01, .01), vy: R(-.06, -.035), s: R(.16, .24), grow: 1.4, life: R(3, 4.2), a: .22 }; } }
    ],
    gems: [ // 金币堆里的宝石闪光
      { rate: 4, max: 8, make: function () { var side = rand() < .5; return { k: 'spark', c: pick(['#fff6c8', '#ffd75e', '#9ff3ff', '#ff9ad5', '#b4ff9a']), x: side ? R(.04, .3) : R(.7, .96), y: R(.55, .86), s: R(.04, .08), life: R(.7, 1.2), pulse: 1, add: 1 }; } },
      { rate: 2, max: 6, make: function () { return { k: 'dot', c: '#ffd75e', x: R(.15, .85), y: R(.6, .88), vy: R(-.05, -.02), s: R(.02, .03), life: R(1.4, 2.2), tw: .5, add: 1 }; } }
    ],
    petals: [ // 飘落的花瓣
      { rate: 1.8, max: 14, make: function () { return { k: 'petal', c: pick(['#ffb6c9', '#ff9fb8', '#ffc9d6', '#ffe1e8', '#f7a8d0']), x: R(-.05, 1.05), y: -.06, vx: R(-.02, .04), vy: R(.07, .12), wob: .06, rot: R(0, 6.3), vr: R(-1.6, 1.6), s: R(.035, .055), life: 12 }; } },
      { rate: 1.2, max: 4, make: function () { return { k: 'spark', c: '#fff2b0', x: R(.2, .8), y: R(.35, .75), s: R(.03, .05), life: R(.8, 1.3), pulse: 1, add: 1 }; } }
    ],
    virus: [ // 培养皿里的气泡 + 医疗十字
      { rate: 2.6, max: 12, make: function () { return { k: 'bubble', c: '#c9fbff', x: R(.05, .95), y: 1.04, vx: 0, vy: R(-.16, -.08), wob: .04, s: R(.03, .065), life: 9 }; } },
      { rate: .6, max: 3, make: function () { return { k: 'cross', c: pick(['#3fdc8f', '#ff6b8a']), x: pick([R(.1, .25), R(.75, .9)]), y: R(.45, .75), vy: -.03, s: R(.05, .07), life: R(1.6, 2.2), add: 0 }; } }
    ],
    diff: [ // 「找到啦」红圈 + 放大镜闪光
      { rate: .75, max: 2, make: function () { return { k: 'ring', c: '#ff4d4d', x: pick([R(.08, .26), R(.74, .92)]), y: R(.42, .8), s: R(.09, .13), life: 1.3, pop: 1 }; } },
      { rate: 2.5, max: 7, make: function () { return { k: 'spark', c: pick(['#fff6c8', '#ffe27a', '#ffffff']), x: R(.25, .75), y: R(.3, .7), s: R(.03, .055), life: R(.7, 1.1), pulse: 1, add: 1 }; } }
    ],
    parking: [ // 阳光光斑 + 哨声闪光
      { rate: 2.2, max: 9, make: function () { return { k: 'glow', c: pick(['#fffbe0', '#ffffff', '#e8ffb0']), x: R(0, 1), y: R(.4, .95), vx: R(-.01, .01), vy: R(-.05, -.02), s: R(.05, .1), life: R(2.4, 3.6), a: .7, add: 1 }; } },
      { rate: 1.6, max: 5, make: function () { return { k: 'spark', c: '#ffe680', x: R(.2, .8), y: R(.32, .62), s: R(.03, .05), life: R(.7, 1.1), pulse: 1, add: 1 }; } }
    ],
    merge: [ // 合成金光 + 小牌飘起
      { rate: 3, max: 9, make: function () { return { k: 'spark', c: pick(['#ffe27a', '#fff6c8', '#ffffff']), x: R(.2, .8), y: R(.35, .8), s: R(.035, .065), life: R(.7, 1.2), pulse: 1, add: 1 }; } },
      { rate: 1.5, max: 6, make: function () { return { k: 'dot', c: '#eaffd8', x: R(.08, .92), y: R(.7, .92), vy: R(-.09, -.05), wob: .03, s: R(.02, .03), life: R(2, 3), tw: .4, add: 1 }; } }
    ]
  };

  var ST = cards.map(function (el) {
    return { el: el, g: el.getAttribute('data-g'), v: el.querySelector('video.vid'), cv: el.querySelector('canvas.fx'), c: null,
      vis: false, near: false, parts: [], acc: [0, 0], w: 0, h: 0, playing: false };
  });

  /* ---------- 视频：邻近才加载，可见才播放 ---------- */
  function load(s) {
    if (s.v.getAttribute('src') || still()) return;
    s.v.muted = true; s.v.defaultMuted = true; s.v.setAttribute('muted', ''); s.v.preload = 'auto';
    s.v.src = s.v.getAttribute('data-src');
  }
  function play(s) {
    if (still()) return;
    load(s);
    var p; try { p = s.v.play(); } catch (e) { }
    if (p && p.catch) p.catch(function () { /* 自动播放被拦截：保持静帧 + 粒子，等用户首次触摸再试 */ });
  }
  function pause(s) { if (!s.v.paused) s.v.pause(); }
  ST.forEach(function (s) {
    s.v.addEventListener('playing', function () { s.v.classList.add('on'); });
    s.v.addEventListener('error', function () { s.v.classList.remove('on'); });
  });
  function sync() {
    var hid = document.hidden, rm = still();
    ST.forEach(function (s) {
      if (s.near && !rm) load(s);
      if (s.vis && !hid && !rm) play(s); else pause(s);
      if (rm) { s.v.classList.remove('on'); s.parts.length = 0; if (s.c) s.c.clearRect(0, 0, s.cv.width, s.cv.height); }
    });
    kick();
  }

  if ('IntersectionObserver' in window) {
    var ioV = new IntersectionObserver(function (es) {
      es.forEach(function (e) { var s = ST[cards.indexOf(e.target)]; s.vis = e.isIntersecting && e.intersectionRatio >= .2; });
      sync();
    }, { threshold: [0, .2, .5, 1] });
    var ioN = new IntersectionObserver(function (es) {
      es.forEach(function (e) { var s = ST[cards.indexOf(e.target)]; if (e.isIntersecting) s.near = true; });
      sync();
    }, { root: track, rootMargin: '0px 100% 0px 100%', threshold: 0 });
    cards.forEach(function (c) { ioV.observe(c); ioN.observe(c); });
  } else { ST.forEach(function (s, i) { s.vis = i === 0; s.near = i < 2; }); sync(); }

  document.addEventListener('visibilitychange', sync);
  window.addEventListener('pagehide', function () { ST.forEach(pause); });
  window.addEventListener('pageshow', sync);
  if (mqRM.addEventListener) mqRM.addEventListener('change', sync); else if (mqRM.addListener) mqRM.addListener(sync);
  // 微信 / 低电量模式等拦截自动播放时：在桥就绪或首次触摸时重试
  function retry() { ST.forEach(function (s) { if (s.vis && s.v.paused && !document.hidden) play(s); }); }
  document.addEventListener('WeixinJSBridgeReady', retry, false);
  if (window.WeixinJSBridge && WeixinJSBridge.invoke) { try { WeixinJSBridge.invoke('getNetworkType', {}, retry); } catch (e) { } }
  ['touchstart', 'pointerdown'].forEach(function (t) { document.addEventListener(t, retry, { passive: true, capture: true }); });

  /* ---------- 实时粒子（只画可见卡片） ---------- */
  var raf = 0, last = 0;
  function active() { if (document.hidden || still()) return false; for (var i = 0; i < ST.length; i++) if (ST[i].vis) return true; return false; }
  function kick() { if (!raf && active()) { last = 0; raf = requestAnimationFrame(tick); } }
  function fit(s) {
    var w = s.el.clientWidth, h = s.el.clientHeight; if (!w || !h) return false;
    if (w !== s.w || h !== s.h) { s.w = w; s.h = h; s.cv.width = Math.round(w * DPR); s.cv.height = Math.round(h * DPR); s.c = s.cv.getContext('2d'); }
    return true;
  }
  function draw(s, dt) {
    if (!fit(s)) return;
    var c = s.c, W = s.w, H = s.h, P = s.parts, em = CFG[s.g] || [];
    em.forEach(function (e, i) {
      s.acc[i] += dt * e.rate;
      while (s.acc[i] >= 1) { s.acc[i] -= 1; var n = 0; for (var j = 0; j < P.length; j++) if (P[j].e === i) n++; if (n < e.max) { var p = e.make(); p.e = i; p.t = 0; p.ph = rand() * 6.28; P.push(p); } }
    });
    c.setTransform(DPR, 0, 0, DPR, 0, 0); c.clearRect(0, 0, W, H);
    for (var i = P.length - 1; i >= 0; i--) {
      var p = P[i]; p.t += dt; if (p.t > p.life) { P.splice(i, 1); continue; }
      p.x += ((p.vx || 0) + (p.wob ? Math.sin(p.t * 2.2 + p.ph) * p.wob : 0)) * dt;
      p.y += (p.vy || 0) * dt; if (p.vr) p.rot += p.vr * dt;
      var u = p.t / p.life, a = (p.a == null ? 1 : p.a) * Math.min(1, p.t / .25) * Math.min(1, (p.life - p.t) / .5);
      if (p.tw) a *= (1 - p.tw) + p.tw * (.5 + .5 * Math.sin(p.t * 11 + p.ph));
      var sc = 1;
      if (p.pulse) { sc = Math.sin(u * Math.PI); a = (p.a == null ? 1 : p.a) * sc; }
      if (p.pop) { sc = .6 + .5 * Math.min(1, u * 4); a = Math.min(1, u * 5) * Math.min(1, (1 - u) * 2.5); }
      if (p.grow) sc = 1 + p.grow * u;
      // 标题区柔化：越靠近卡片顶部（文案处）越淡，保证文字清晰
      var yy = p.y; a *= Math.max(0, Math.min(1, (yy - .16) / .16));
      if (a <= .01) continue;
      var X = p.x * W, Y = p.y * H;
      c.globalAlpha = a; c.globalCompositeOperation = p.add ? 'lighter' : 'source-over';
      if (p.k === 'streak') { c.fillStyle = p.c; c.fillRect(Math.round(X), Math.round(Y - p.len * H), 1.5, Math.round(p.len * H)); continue; }
      var sz = p.s * W * 2 * sc, img = spr(p.k, p.c);
      c.imageSmoothingEnabled = p.k !== 'px';
      if (p.rot) { c.save(); c.translate(X, Y); c.rotate(p.rot); c.scale(Math.cos(p.t * 2 + p.ph) * .35 + .75, 1); c.drawImage(img, -sz / 2, -sz / 2, sz, sz); c.restore(); }
      else c.drawImage(img, X - sz / 2, Y - sz / 2, sz, sz);
    }
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  }
  function tick(now) {
    raf = 0; if (!active()) return;
    var dt = last ? Math.min(.05, (now - last) / 1000) : .016; last = now;
    ST.forEach(function (s) { if (s.vis) draw(s, dt); });
    raf = requestAnimationFrame(tick);
  }
  window.addEventListener('resize', function () { ST.forEach(function (s) { s.w = 0; }); });
  window.__poster = { st: ST, still: still };
  sync();
})();
