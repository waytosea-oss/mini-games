/* 游戏屋 · 玩法统计（无第三方依赖；说明见站点根目录 privacy.html）
   浏览器端只发送：随机访客 ID、会话 ID、设备/系统/浏览器大类、手机型号与系统版本（仅支持 UA-CH 的浏览器）、屏幕尺寸与像素比、
   触屏、CPU 核数/内存档位、语言、来源域名与 utm/from 参数、游戏内事件。不发送完整 User-Agent 字符串。
   服务端用请求自带的 IP 在内存中查出城市级地区与运营商大类，IP 本身不入库（仅以加盐哈希做短时限流）。
   不弹任何提示；localStorage gt_off=1（「关闭统计」）或浏览器“请勿跟踪”时完全不发送。任何异常都被吞掉，绝不影响游戏。
   开发自测：网址加 ?test=1 会把本设备标记为测试（看板默认排除），?test=0 取消。 */
(function () {
  'use strict';
  var W = window, D = document, L = location, N = navigator;
  if (W.GT && W.GT._v) return;
  var noop = function () {};
  var GT = W.GT = { _v: 1, ev: noop, title: noop, lv: noop, win: noop, fail: noop, quit: noop, revive: noop, pause: noop, hub: noop, sound: noop, flush: noop };
  try {
    var EP = 'https://trigger-tech.fun/games/api/collect.php';
    var GAMES = ['shooter', 'virus', 'grab', 'gems', 'parking', 'diff', 'petals', 'potion', 'merge', 'stroke'];
    var IDLE = 60000, SESSION = 30 * 60000;
    if (N.doNotTrack === '1' || W.doNotTrack === '1' || N.globalPrivacyControl === true) return;   // 尊重“请勿跟踪”/GPC
    var lsOff = null; try { lsOff = W.localStorage && W.localStorage.getItem('gt_off'); } catch (e) {}
    if (lsOff === '1') return;                                    // 用户已「关闭统计」
    var now = function () { return new Date().getTime(); };
    var ls = {}, ss = {};
    try { ls = W.localStorage || {}; } catch (e) {}
    try { ss = W.sessionStorage || {}; } catch (e) {}
    var get = function (s, k) { try { return s.getItem ? s.getItem(k) : null; } catch (e) { return null; } };
    var set = function (s, k, v) { try { if (s.setItem) s.setItem(k, v); } catch (e) {} };
    var del = function (s, k) { try { if (s.removeItem) s.removeItem(k); } catch (e) {} };
    var rid = function (n) {
      var a = [], i, c = W.crypto || W.msCrypto;
      try { var u = new Uint8Array(n); c.getRandomValues(u); for (i = 0; i < n; i++) a.push(u[i]); }
      catch (e) { for (i = 0; i < n; i++) a.push(Math.floor(Math.random() * 256)); }
      return a.map(function (b) { return (b < 16 ? '0' : '') + b.toString(16); }).join('');
    };
    var qs = {};
    try { L.search.replace(/^\?/, '').split('&').forEach(function (kv) { if (!kv) return; var i = kv.indexOf('='); var k = decodeURIComponent(i < 0 ? kv : kv.slice(0, i)); qs[k] = i < 0 ? '' : decodeURIComponent(kv.slice(i + 1).replace(/\+/g, ' ')); }); } catch (e) {}
    var cut = function (s, n) { s = s == null ? '' : String(s); return s.length > n ? s.slice(0, n) : s; };

    if (qs.test === '1') set(ls, 'gt_test', '1'); else if (qs.test === '0') del(ls, 'gt_test');
    var segs = L.pathname.replace(/index\.html?$/, '').split('/').filter(Boolean);
    var last = segs[segs.length - 1] || '', page = GAMES.indexOf(last) >= 0 ? last : 'hub';
    var t = now();

    /* 访客与会话 */
    var vid = get(ls, 'gt_vid'); if (!vid || vid.length !== 32) { vid = rid(16); set(ls, 'gt_vid', vid); }
    var sid = get(ls, 'gt_sid'), sn = +get(ls, 'gt_sn') || 0;
    if (!sid || t - (+get(ls, 'gt_last') || 0) > SESSION) { sid = rid(12); sn++; set(ls, 'gt_sid', sid); set(ls, 'gt_sn', String(sn)); }
    var touch = function () { set(ls, 'gt_last', String(now())); };
    touch();

    /* 环境（只取大类） */
    var ua = N.userAgent || '';
    var wx = /MicroMessenger/i.test(ua) ? 1 : 0;
    var tp = N.maxTouchPoints || 0;
    var dev = /iPad|Tablet|PlayBook|Silk/i.test(ua) || (/Macintosh/.test(ua) && tp > 1) || (/Android/i.test(ua) && !/Mobi/i.test(ua)) ? 'tablet'
      : /Mobi|iPhone|iPod|Android|HarmonyOS|Windows Phone/i.test(ua) ? 'phone' : 'desktop';
    var os = /HarmonyOS|OpenHarmony/i.test(ua) ? 'HarmonyOS' : /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && tp > 1) ? 'iOS' : /Android/i.test(ua) ? 'Android'
      : /Windows/i.test(ua) ? 'Windows' : /Mac OS X|Macintosh/i.test(ua) ? 'macOS' : /CrOS/.test(ua) ? 'ChromeOS' : /Linux/i.test(ua) ? 'Linux' : 'other';
    var br = wx ? 'WeChat' : /\bQQ\//i.test(ua) ? 'QQ' : /MQQBrowser|QQBrowser/i.test(ua) ? 'QQBrowser' : /UCBrowser|UCWEB/i.test(ua) ? 'UC' : /Quark/i.test(ua) ? 'Quark'
      : /baiduboxapp|BaiduBrowser|baidubrowser/i.test(ua) ? 'Baidu' : /DingTalk/i.test(ua) ? 'DingTalk' : /AlipayClient/i.test(ua) ? 'Alipay' : /Weibo/i.test(ua) ? 'Weibo'
      : /HuaweiBrowser/i.test(ua) ? 'Huawei' : /MiuiBrowser|XiaoMi/i.test(ua) ? 'Xiaomi' : /HeyTapBrowser|OppoBrowser/i.test(ua) ? 'OPPO' : /VivoBrowser/i.test(ua) ? 'vivo'
      : /SamsungBrowser/i.test(ua) ? 'Samsung' : /Edg(e|A|iOS)?\//.test(ua) ? 'Edge' : /Firefox|FxiOS/.test(ua) ? 'Firefox' : /CriOS|Chrome\//.test(ua) ? 'Chrome'
      : /Safari\//.test(ua) && /Version\//.test(ua) ? 'Safari' : 'other';
    var refHost = '', refPage = '';
    try { if (D.referrer) { var a = D.createElement('a'); a.href = D.referrer; refHost = a.hostname || ''; if (refHost === L.hostname) { var rs = a.pathname.replace(/index\.html?$/, '').split('/').filter(Boolean), rl = rs[rs.length - 1] || ''; refPage = GAMES.indexOf(rl) >= 0 ? rl : 'hub'; refHost = ''; } } } catch (e) {}
    var utm = cut([qs.utm_source, qs.utm_medium, qs.utm_campaign].filter(function (x) { return x; }).join('/'), 80);
    /* v2 版本标记：写进 utm 字段（服务端原样保存），便于在统计里区分 games-v2 */
    utm = cut('bjsj' + (utm ? '|' + utm : ''), 80);
    var ctx = {
      host: cut(L.hostname, 60), page: page, dev: dev, os: os, br: br, wx: wx, lang: cut(N.language || '', 12),
      sw: (W.screen && screen.width) || 0, sh: (W.screen && screen.height) || 0, ref: cut(refHost, 80), utm: utm, from: cut(qs.from || '', 40),
      sn: sn, test: get(ls, 'gt_test') === '1' ? 1 : 0,
      /* 设备细节：UA 交给服务端解析型号；屏幕 DPR / 触屏 / 核数 / 内存只用于机型分组，不做指纹 */
      dpr: Math.round((W.devicePixelRatio || 1) * 100) / 100, tch: tp > 0 ? 1 : 0,
      hc: N.hardwareConcurrency || 0, dm: N.deviceMemory || 0
    };
    /* Android Chrome 等：通过 UA-CH 取真实型号 / 系统版本（不支持的浏览器忽略；结果在本次会话内缓存） */
    try {
      var uch = get(ss, 'gt_uach');
      if (uch) { uch = JSON.parse(uch); ctx.m = uch.m; ctx.pfv = uch.pfv; }
      else if (N.userAgentData && N.userAgentData.getHighEntropyValues) {
        N.userAgentData.getHighEntropyValues(['model', 'platformVersion']).then(function (h) {
          ctx.m = cut(h.model || '', 40); ctx.pfv = cut(h.platformVersion || '', 20);
          set(ss, 'gt_uach', JSON.stringify({ m: ctx.m, pfv: ctx.pfv }));
        }).catch(noop);
      }
    } catch (e) {}

    /* 发送：批量、即发即忘 */
    var Q = [], seq = 0, timer = 0, pv = rid(6);
    var send = function (body) {
      try { if (N.sendBeacon && N.sendBeacon(EP, new Blob([body], { type: 'text/plain' }))) return; } catch (e) {}
      try { if (W.fetch) { W.fetch(EP, { method: 'POST', body: body, keepalive: true, mode: 'no-cors', credentials: 'omit', headers: { 'Content-Type': 'text/plain' } }).catch(noop); return; } } catch (e) {}
      try { var x = new XMLHttpRequest(); x.open('POST', EP, true); x.setRequestHeader('Content-Type', 'text/plain'); x.send(body); } catch (e) {}
    };
    var flush = function () {
      try {
        clearTimeout(timer); timer = 0;
        while (Q.length && !OFF) send(JSON.stringify({ v: 1, vid: vid, sid: sid, pv: pv, c: ctx, e: Q.splice(0, 40) }));
      } catch (e) {}
    };
    var push = function (n, p) {
      try {
        if (OFF) return;
        Q.push({ n: n, t: now(), q: ++seq, p: p || {} }); touch();
        if (Q.length >= 25) flush(); else if (!timer) timer = setTimeout(flush, 4000);
      } catch (e) {}
    };

    /* 活跃时长：页面可见且 60 秒内有操作才计时 */
    var act = 0, lastTick = t, lastIn = t, t0 = t, hidAt = 0;
    var tick = function () {
      var n = now(), dt = n - lastTick; lastTick = n;
      if (!D.hidden && n - lastIn < IDLE) act += Math.min(dt, 10000);
    };
    var onIn = function () { var n = now(); if (n - lastIn >= IDLE) lastTick = n; lastIn = n; };
    ['pointerdown', 'touchstart', 'keydown', 'wheel', 'scroll', 'mousemove'].forEach(function (k) { try { W.addEventListener(k, onIn, { passive: true, capture: true }); } catch (e) {} });
    setInterval(function () { try { tick(); } catch (e) {} }, 5000);
    var hbN = 0;
    setInterval(function () { try { if (!D.hidden && now() - lastIn < IDLE) { tick(); push('heartbeat', { act: act, n: ++hbN }); } } catch (e) {} }, 60000);

    /* 关卡状态 */
    var cur = { lv: 0, t0: 0, on: 0, hid: 0 }, lastEnd = '';
    var lvMs = function () { return cur.t0 ? Math.max(0, now() - cur.t0 - cur.hid - (hidAt ? now() - hidAt : 0)) : null; };
    var ext = function (p, x) { if (x && typeof x === 'object') for (var k in x) if (x.hasOwnProperty(k) && x[k] != null && typeof x[k] !== 'object') p[k] = typeof x[k] === 'string' ? cut(x[k], 40) : x[k]; return p; };
    var safe = function (f) { return function () { try { return f.apply(null, arguments); } catch (e) {} }; };
    GT.ev = safe(function (n, p) { push(cut(n, 24), ext({}, p)); });
    GT.title = safe(function (via) { push('title_start', via ? { via: cut(via, 12) } : {}); });
    GT.lv = safe(function (n, x) {
      if (cur.on) push('level_quit', { lv: cur.lv, ms: lvMs(), why: 'restart' });
      cur = { lv: +n || 0, t0: now(), on: 1, hid: 0 }; lastEnd = '';
      push('level_start', ext({ lv: cur.lv }, x));
    });
    var end = function (name, n, x) {
      var p = ext({ lv: +n || cur.lv, ms: lvMs() }, x);
      cur.on = 0; lastEnd = name === 'level_win' ? 'win' : 'fail'; push(name, p); flush();
    };
    GT.win = safe(function (n, x) { end('level_win', n, x); });
    GT.fail = safe(function (n, x) { end('level_fail', n, x); });
    GT.quit = safe(function (why) { if (cur.on) { cur.on = 0; push('level_quit', { lv: cur.lv, ms: lvMs(), why: cut(why || 'menu', 20) }); } });
    GT.revive = safe(function (how) { cur.on = 1; lastEnd = ''; push('revive', { lv: cur.lv, how: cut(how || '', 20) }); });
    GT.pause = safe(function () { push('pause', { lv: cur.on ? cur.lv : 0, ms: cur.on ? lvMs() : null, auto: (D.hidden || (D.hasFocus && !D.hasFocus())) ? 1 : 0 }); });
    var HUBF = { btnHub: 'title', mHub: 'title', bHub0: 'title', pHub: 'pause', bHubP: 'pause', wHub: 'win', bHubW: 'win', fHub: 'fail', bHubL: 'fail', endHub: 'end', bHubE: 'end' };
    GT.hub = safe(function (from) { push('back_to_hub', { from: HUBF[from] || (!cur.on && lastEnd) || cut(from || 'other', 20), lv: cur.lv, inLv: cur.on, ms: cur.on ? lvMs() : null }); flush(); });
    GT.sound = safe(function (k, on) { push('sound', { k: cut(k, 10), on: on ? 1 : 0 }); });
    GT.flush = safe(flush);
    var OFF = false;
    GT.off = safe(function () {
      OFF = true; Q.length = 0; clearTimeout(timer);
      set(ls, 'gt_off', '1'); ['gt_vid', 'gt_sid', 'gt_sn', 'gt_last', 'gt_test'].forEach(function (k) { del(ls, k); }); del(ss, 'gt_uach'); del(ss, 'gt_nav');
      for (var k in GT) if (typeof GT[k] === 'function' && k !== 'off') GT[k] = noop;
    });

    /* 来源判断 */
    var navType = '';
    try { var ne = performance.getEntriesByType && performance.getEntriesByType('navigation')[0]; navType = ne ? ne.type : (performance.navigation ? ['navigate', 'reload', 'back_forward'][performance.navigation.type] || '' : ''); } catch (e) {}
    var src = navType === 'reload' ? 'reload' : navType === 'back_forward' ? 'back' : refPage ? (refPage === 'hub' ? 'hub' : 'game') : refHost ? 'referral' : (qs.from || utm) ? 'campaign' : 'direct';
    var pvp = { src: src, nav: navType };
    if (page !== 'hub') {
      var nav = null; try { nav = JSON.parse(get(ss, 'gt_nav') || 'null'); } catch (e) {}
      del(ss, 'gt_nav');
      var op = { src: src };
      if (nav && nav.g === page && t - nav.t < 30000) { op.src = nav.sec; op.pos = nav.pos; }
      push('page_view', pvp); push('game_open', op);
    } else {
      push('page_view', pvp);
      /* 游戏屋点击：海报 / 卡片 / 列表 / 标签栏 */
      D.addEventListener('click', function (e) {
        try {
          var el = e.target, a = null;
          while (el && el !== D) { if (el.tagName === 'A' && /(^|\s)(story|game|li)(\s|$)/.test(el.className || '') || (el.tagName === 'A' && el.parentNode && el.parentNode.id === 'tabbar')) { a = el; break; } el = el.parentNode; }
          if (!a) return;
          var cls = a.className || '', sec = /\bstory\b/.test(cls) ? 'poster' : /\bgame\b/.test(cls) ? 'card' : /\bli\b/.test(cls) ? 'list' : 'tab';
          var sib = [].slice.call(a.parentNode.children).filter(function (x) { return x.tagName === 'A'; });
          var pos = sib.indexOf(a) + 1, href = a.getAttribute('href') || '', g = href.replace(/[#?].*$/, '').replace(/\/$/, '').split('/').pop();
          if (GAMES.indexOf(g) < 0) g = '';
          push('hub_click', { sec: sec, pos: pos, g: g || cut(a.getAttribute('data-s') || href, 20) });
          if (g) set(ss, 'gt_nav', JSON.stringify({ g: g, sec: sec, pos: pos, t: now() }));
          flush();
        } catch (er) {}
      }, true);
    }

    /* 离开 / 切后台 */
    var left = false;
    D.addEventListener('visibilitychange', function () {
      try {
        if (D.hidden) { tick(); hidAt = now(); push('heartbeat', { act: act, hide: 1 }); flush(); }
        else { if (hidAt && cur.on) cur.hid += now() - hidAt; hidAt = 0; lastTick = lastIn = now(); }
      } catch (e) {}
    });
    W.addEventListener('pagehide', function () {
      try {
        if (left) return; left = true; tick();
        var p = { act: act, tot: now() - t0 };
        if (cur.on) { p.lv = cur.lv; p.inLv = 1; p.ms = lvMs(); }
        push('page_leave', p); flush();
      } catch (e) {}
    });
    W.addEventListener('pageshow', function (e) {
      try { if (e.persisted && left) { left = false; pv = rid(6); t0 = lastTick = lastIn = now(); act = 0; hbN = 0; push('page_view', { src: 'back', nav: 'bfcache' }); } } catch (er) {}
    });
  } catch (e) {}
})();
