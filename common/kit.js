/* 游戏屋 · 新游戏通用脚本（common/kit.js）—— 存档、返回游戏屋、统计、提示条、面板、星级、选关、Web Audio 合成、震动。
   依赖：../track.js（可选，缺失时统计调用自动变空操作）。已上线的 9 款游戏不引用本文件。
   用法见 _template/。 */
(function (W) {
  'use strict';
  var D = document, $ = function (id) { return D.getElementById(id); };
  var GT = function () { return W.GT || { ev: function () { }, title: function () { }, lv: function () { }, win: function () { }, fail: function () { }, quit: function () { }, pause: function () { }, hub: function () { }, sound: function () { } }; };
  var KIT = { $: $, game: '', saveFn: null };
  /* ---- 存档 ---- */
  KIT.load = function (key, def) { try { var s = localStorage.getItem(key); if (s) { var o = JSON.parse(s); for (var k in def) if (!(k in o)) o[k] = def[k]; return o; } } catch (e) { } return JSON.parse(JSON.stringify(def)); };
  KIT.save = function (key, obj) { try { localStorage.setItem(key, JSON.stringify(obj)); } catch (e) { } };
  /* ---- 游戏屋「最近玩过」（hub 读取 th_recent） ---- */
  KIT.recent = function (id) { try { var a = JSON.parse(localStorage.getItem('th_recent') || '[]').filter(function (x) { return x && x.g !== id; }); a.unshift({ g: id, t: Date.now() }); localStorage.setItem('th_recent', JSON.stringify(a.slice(0, 12))); } catch (e) { } };
  /* ---- 初始化：返回按钮、离开自动存档 ---- */
  KIT.init = function (o) {
    KIT.game = o.game; KIT.saveFn = o.save || function () { };
    KIT.recent(o.game);
    (o.hubButtons || []).forEach(function (id) { var b = $(id); if (b) b.addEventListener('click', KIT.goHub); });
    var bye = function () { try { KIT.saveFn(); } catch (e) { } };
    W.addEventListener('pagehide', bye); D.addEventListener('visibilitychange', function () { if (D.hidden) { bye(); if (o.onHide) o.onHide(); } });
  };
  KIT.goHub = function (e) { if (e && e.stopPropagation) e.stopPropagation(); try { KIT.saveFn(); } catch (_) { } try { KIT.sfx && KIT.sfx.click && KIT.sfx.click(); } catch (_) { } try { GT().hub(e && e.currentTarget && e.currentTarget.id); } catch (_) { } setTimeout(function () { location.href = '../'; }, 60); };
  KIT.gt = GT;
  /* ---- 屏幕切换 / 提示条 / 震动 ---- */
  KIT.show = function (id) { [].forEach.call(D.querySelectorAll('.scr'), function (s) { s.classList.toggle('on', s.id === id); }); };
  KIT.hideAll = function () { KIT.show(null); };
  var tt = 0; KIT.toast = function (msg, ms) { var t = $('toast'); if (!t) return; t.textContent = msg; t.classList.add('on'); clearTimeout(tt); tt = setTimeout(function () { t.classList.remove('on'); }, ms || 1500); };
  KIT.vibOn = true; KIT.vib = function (p) { if (!KIT.vibOn) return; try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) { } };
  /* ---- 星级 ---- */
  KIT.stars = function (el, n) { if (typeof el === 'string') el = $(el); var s = el.children; for (var i = 0; i < s.length; i++) { s[i].classList.remove('on'); void s[i].offsetWidth; if (i < n) s[i].classList.add('on'); } };
  /* ---- 选关网格：groups=[{title, from, to}]，unlocked(i)、stars(i)，onPick(i) ---- */
  KIT.levelGrid = function (host, o) {
    if (typeof host === 'string') host = $(host); host.innerHTML = '';
    (o.groups || [{ title: '', from: 1, to: o.count }]).forEach(function (g) {
      if (g.title) { var h = D.createElement('div'); h.className = 'lvgroup'; h.innerHTML = g.title; host.appendChild(h); }
      var grid = D.createElement('div'); grid.className = 'grid'; host.appendChild(grid);
      for (var i = g.from - 1; i < g.to; i++) (function (i) {
        var b = D.createElement('button'), un = o.unlocked(i), st = o.stars(i);
        b.className = 'lv' + (un ? '' : ' lock') + (i === o.current ? ' cur' : '') + (o.cls ? ' ' + (o.cls(i) || '') : '');
        b.innerHTML = un ? (i + 1) + '<span class="s">' + '★★★'.slice(0, st) + '<i style="opacity:.3;font-style:normal">' + '★★★'.slice(st) + '</i></span>' : '<svg width="22" height="22" viewBox="0 0 24 24"><path d="M7 10V7a5 5 0 0 1 10 0v3h1v11H6V10zm2 0h6V7a3 3 0 0 0-6 0z" fill="currentColor"/></svg>';
        b.setAttribute('aria-label', '第 ' + (i + 1) + ' 关');
        b.addEventListener('click', function () { if (un) o.onPick(i); else if (o.onLocked) o.onLocked(i); });
        grid.appendChild(b);
      })(i);
    });
  };
  /* ---- Web Audio 合成小工具：KIT.audio() 返回 {init, unlock, ac(), osc, noise, mtof, sfxBus, musicBus, verb, setMusic, setSfx} ---- */
  KIT.audio = function (opt) {
    opt = opt || {}; var A = { musicOn: true, sfxOn: true }, ac = null, noiseBuf;
    A.mtof = function (m) { return 440 * Math.pow(2, (m - 69) / 12); };
    A.init = function () {
      if (ac) return ac; var AC = W.AudioContext || W.webkitAudioContext; if (!AC) return null; ac = new AC();
      var comp = ac.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.connect(ac.destination);
      A.master = ac.createGain(); A.master.gain.value = .9; A.master.connect(comp);
      A.musicBus = ac.createGain(); A.musicBus.gain.value = A.musicOn ? (opt.music || .4) : 0; A.musicBus.connect(A.master);
      A.sfxBus = ac.createGain(); A.sfxBus.gain.value = A.sfxOn ? (opt.sfx || .95) : 0; A.sfxBus.connect(A.master);
      noiseBuf = ac.createBuffer(1, ac.sampleRate * 1.5, ac.sampleRate); var d = noiseBuf.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      A.verb = ac.createGain(); A.verb.gain.value = opt.verb == null ? .3 : opt.verb;
      [[.31, .34], [.23, .24]].forEach(function (p) { var dl = ac.createDelay(1.5); dl.delayTime.value = p[0]; var fb = ac.createGain(); fb.gain.value = p[1]; var lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600; A.verb.connect(dl); dl.connect(lp); lp.connect(fb); fb.connect(dl); lp.connect(A.master); });
      return ac;
    };
    A.ac = function () { return ac; };
    A.now = function () { return ac ? ac.currentTime : 0; };
    A.unlock = function () { A.init(); if (!ac) return; if (ac.state === 'suspended') ac.resume(); var b = ac.createBuffer(1, 1, 22050), s = ac.createBufferSource(); s.buffer = b; s.connect(ac.destination); s.start(0); };
    function env(g, t, a, peak, dcy) { g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(.0001, t + a + dcy); }
    A.osc = function (type, f, t, dur, vol, dest, o) {
      o = o || {}; if (!ac) return; var n = ac.createOscillator(), g = ac.createGain(); n.type = type; n.frequency.setValueAtTime(f, t);
      if (o.to) n.frequency.exponentialRampToValueAtTime(o.to, t + (o.tt || dur)); if (o.det) n.detune.value = o.det;
      env(g, t, o.a || .004, vol, dur); var src = n;
      if (o.lp) { var f2 = ac.createBiquadFilter(); f2.type = o.ft || 'lowpass'; f2.frequency.setValueAtTime(o.lp, t); if (o.lpTo) f2.frequency.exponentialRampToValueAtTime(o.lpTo, t + dur); f2.Q.value = o.q || 1; n.connect(f2); src = f2; }
      if (o.vib) { var l = ac.createOscillator(), lg = ac.createGain(); l.frequency.value = o.vib; lg.gain.value = f * (o.vd || .012); l.connect(lg); lg.connect(n.frequency); l.start(t + (o.vdl || .08)); l.stop(t + dur + .1); }
      src.connect(g); g.connect(dest || A.sfxBus); if (o.send) { var sg = ac.createGain(); sg.gain.value = o.send === true ? 1 : o.send; g.connect(sg); sg.connect(A.verb); }
      n.start(t); n.stop(t + dur + (o.a || .004) + .06); return n;
    };
    A.noise = function (t, dur, vol, dest, type, f, q, o) {
      o = o || {}; if (!ac) return; var s = ac.createBufferSource(); s.buffer = noiseBuf; var fl = ac.createBiquadFilter(); fl.type = type || 'bandpass'; fl.frequency.setValueAtTime(f || 3000, t); fl.Q.value = q || 1;
      if (o.to) fl.frequency.exponentialRampToValueAtTime(o.to, t + dur);
      var g = ac.createGain(); env(g, t, o.a || .002, vol, dur); s.connect(fl); fl.connect(g); g.connect(dest || A.sfxBus); if (o.send) g.connect(A.verb); s.start(t, Math.random() * .8); s.stop(t + dur + .05);
    };
    A.setMusic = function (on) { A.musicOn = on; if (A.musicBus) A.musicBus.gain.setTargetAtTime(on ? (opt.music || .4) : 0, ac.currentTime, .05); try { GT().sound('music', on); } catch (e) { } };
    A.setSfx = function (on) { A.sfxOn = on; if (A.sfxBus) A.sfxBus.gain.setTargetAtTime(on ? (opt.sfx || .95) : 0, ac.currentTime, .03); try { GT().sound('sfx', on); } catch (e) { } };
    return A;
  };
  W.KIT = KIT;
})(window);
