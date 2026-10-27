/* 游戏屋 · 标题页合规块与公司署名 + 通关互推（common/brand.js）
   用法：<link rel="stylesheet" href="../common/brand.css"><script src="../common/brand.js" data-screen="menu" data-game="gems"></script>
   - 在 data-screen 指定的标题页底部挂「适龄提示 8+ · 健康游戏忠告 · 上海启格广告有限公司 + Trigger 字标」
   - CPL.promo(host) 在通关面板里放一条其他游戏的小横幅（轮换） */
(function (W) {
  'use strict';
  var D = document, me = D.currentScript, base = (me && me.src) ? me.src.replace(/[^\/]*$/, '') : '../common/';
  var GAME = (me && me.getAttribute('data-game')) || '', SCR = (me && me.getAttribute('data-screen')) || 'menu', TONE = (me && me.getAttribute('data-tone')) || '';
  var LIST = [
    ['shooter', '星际雷霆', '驾驶战机，闯 8 大星域'],
    ['gems', '宝石大盗', '妙手神偷，撬开宝库'],
    ['petals', '花瓣消消', '收集花瓣，拼出花篮'],
    ['grab', '夜市撸串王', '烤串摆摊，手快有串'],
    ['potion', '魔法药水铺', '倒药水，配出同色瓶'],
    ['diff', '火眼金睛', '找不同，考考眼力'],
    ['parking', '快挪车', '挪开车辆，疏通车场'],
    ['merge', '摘星合合', '合成星星，越合越亮'],
    ['virus', '健康小卫士', '小卫士守护健康'],
    ['stroke', '一笔绘山海', '一笔画出山海奇景']
  ];
  var AGE = '<svg viewBox="0 0 64 86" aria-hidden="true"><rect x="1.5" y="1.5" width="61" height="83" rx="7" fill="#fff" stroke="#1d1d1d" stroke-width="3"/>' +
    '<rect x="6" y="6" width="52" height="56" rx="4" fill="#4caf3e"/>' +
    '<text x="29" y="40" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="700" font-size="30" fill="#fff">8</text>' +
    '<text x="45.5" y="30" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="700" font-size="17" fill="#fff">+</text>' +
    '<text x="32" y="56" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="10" letter-spacing=".5" fill="#fff">CADPA</text>' +
    '<text x="32" y="78" text-anchor="middle" font-family="PingFang SC,Microsoft YaHei,Noto Sans CJK SC,sans-serif" font-weight="700" font-size="12.5" fill="#1d1d1d">适龄提示</text></svg>';
  var CPL = W.CPL = { list: LIST, base: base, age: AGE };
  CPL.html = function (tone) {
    return '<div class="cpl-row"><span class="cpl-age" role="img" aria-label="CADPA 8+ 适龄提示">' + AGE + '</span>' +
      '<div class="cpl-hn"><b>健康游戏忠告</b><span>抵制不良游戏，拒绝盗版游戏。注意自我保护，谨防受骗上当。</span><span>适度游戏益脑，沉迷游戏伤身。合理安排时间，享受健康生活。</span></div></div>' +
      '<div class="cpl-co"><img src="' + base + (tone === 'light' ? 'logo-trigger-dot.png' : 'logo-trigger-dot-white.png') + '" alt="Trigger"><span>上海启格广告有限公司</span></div>';
  };
  CPL.mount = function (host, tone) {
    if (typeof host === 'string') host = D.getElementById(host); if (!host || host.querySelector('.cpl')) return;
    var c = D.createElement('div'); c.className = 'cpl' + (tone === 'light' ? ' light' : ''); c.innerHTML = CPL.html(tone);
    if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
    host.appendChild(c); host.classList.add('has-cpl');
    if (host.id) { var st = D.createElement('style'); st.textContent = '#' + host.id + '{padding-bottom:calc(var(--cpl-h,80px) + 4px)!important;box-sizing:border-box}'; D.head.appendChild(st); }
    var last = 0, fit = function () { var h = Math.ceil(c.offsetHeight); if (h > 0 && h !== last) { last = h; host.style.setProperty('--cpl-h', h + 'px'); try { W.dispatchEvent(new Event('resize')); } catch (e) { } } };
    if (W.ResizeObserver) new ResizeObserver(fit).observe(c);
    fit(); W.addEventListener('resize', fit); setTimeout(fit, 60);
    return c;
  };
  /* 互推：按「本游戏 + 次数」轮换，跳过本游戏 */
  CPL.pick = function () {
    var n = 0; try { n = +localStorage.getItem('th_xp_n') || 0; localStorage.setItem('th_xp_n', n + 1); } catch (e) { }
    var others = LIST.filter(function (x) { return x[0] !== GAME; }), at = 0;
    for (var i = 0; i < LIST.length; i++) if (LIST[i][0] === GAME) at = i;
    return others[(at + n) % others.length];
  };
  CPL.promo = function (host, opt) {
    opt = opt || {}; if (typeof host === 'string') host = D.getElementById(host); if (!host) return;
    var old = host.querySelector('.xpromo'); if (old) old.remove();
    var g = CPL.pick(), a = D.createElement('a');
    a.className = 'xpromo' + (opt.dark ? ' dark' : ''); a.href = '../' + g[0] + '/';
    a.innerHTML = '<img src="../hub/icons/' + g[0] + '-s.webp" alt=""><span class="xt"><small>游戏屋 · 再玩一款</small><b>' + g[1] + '</b><i>' + g[2] + '</i></span><span class="xg">去玩</span>';
    a.addEventListener('click', function (e) { e.stopPropagation(); try { W.GT && W.GT.ev('xpromo', { to: g[0] }); } catch (_) { } try { W.KIT && W.KIT.saveFn && W.KIT.saveFn(); } catch (_) { } try { if (W.CPL.onLeave) W.CPL.onLeave(); } catch (_) { } });
    if (opt.before) host.insertBefore(a, opt.before); else host.appendChild(a);
    return a;
  };
  var boot = function () { if (SCR) CPL.mount(SCR, TONE); };
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', boot); else boot();
})(window);
