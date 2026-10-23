/* 封面主角：透明底序列帧精灵表（无缝循环）+ 悬浮、光晕与实时粒子。
   画在标题页内部的独立画布上（层级位于所有按钮/标志之下），只在标题页显示时运行。 */
(function () {
  'use strict';
  const DPR = Math.min(2, window.devicePixelRatio || 1);
  const CACHE = {};
  function hexA(h, a) { const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; }
  // 预渲染粒子精灵（按种类 + 颜色缓存）
  function spr(kind, col) {
    const key = kind + col; if (CACHE[key]) return CACHE[key];
    const S = 64, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d'), m = S / 2;
    if (kind === 'glow') {
      const g = x.createRadialGradient(m, m, 0, m, m, m); g.addColorStop(0, hexA(col, .55)); g.addColorStop(.45, hexA(col, .17)); g.addColorStop(1, hexA(col, 0)); x.fillStyle = g; x.fillRect(0, 0, S, S);
    } else if (kind === 'spark') { // 四芒星光
      const g = x.createRadialGradient(m, m, 0, m, m, m * .7); g.addColorStop(0, hexA(col, .5)); g.addColorStop(1, hexA(col, 0)); x.fillStyle = g; x.fillRect(0, 0, S, S);
      const ray = (r, w, cl) => { x.fillStyle = cl; x.beginPath(); x.moveTo(m, m - r); x.quadraticCurveTo(m + w, m - w, m + r, m); x.quadraticCurveTo(m + w, m + w, m, m + r); x.quadraticCurveTo(m - w, m + w, m - r, m); x.quadraticCurveTo(m - w, m - w, m, m - r); x.fill(); };
      ray(m * .9, 3, col); ray(m * .42, 2, '#ffffff');
    } else if (kind === 'dot') {
      const g = x.createRadialGradient(m, m, 0, m, m, m * .5); g.addColorStop(0, '#ffffff'); g.addColorStop(.3, hexA(col, .9)); g.addColorStop(1, hexA(col, 0)); x.fillStyle = g; x.fillRect(0, 0, S, S);
    } else if (kind === 'bubble') {
      x.strokeStyle = hexA(col, .85); x.lineWidth = 3; x.beginPath(); x.arc(m, m, m * .55, 0, 7); x.stroke();
      x.fillStyle = hexA(col, .16); x.fill(); x.fillStyle = 'rgba(255,255,255,.9)'; x.beginPath(); x.arc(m - m * .22, m - m * .22, m * .12, 0, 7); x.fill();
    } else if (kind === 'cross') { // 医疗十字
      const g = x.createRadialGradient(m, m, 0, m, m, m); g.addColorStop(0, hexA(col, .4)); g.addColorStop(1, hexA(col, 0)); x.fillStyle = g; x.fillRect(0, 0, S, S);
      x.fillStyle = col; const a = m * .18, b = m * .55; x.fillRect(m - a, m - b, a * 2, b * 2); x.fillRect(m - b, m - a, b * 2, a * 2);
      x.fillStyle = '#ffffff'; x.fillRect(m - a * .45, m - b * .7, a * .9, b * 1.4); x.fillRect(m - b * .7, m - a * .45, b * 1.4, a * .9);
    } else if (kind === 'smoke') {
      const g = x.createRadialGradient(m, m, 0, m, m, m); g.addColorStop(0, hexA(col, .55)); g.addColorStop(.5, hexA(col, .25)); g.addColorStop(1, hexA(col, 0)); x.fillStyle = g; x.fillRect(0, 0, S, S);
    } else if (kind === 'px') { // 像素方块（像素风）
      x.fillStyle = col; x.fillRect(16, 16, 32, 32); x.fillStyle = 'rgba(255,255,255,.55)'; x.fillRect(16, 16, 16, 16);
    }
    return (CACHE[key] = c);
  }

  function TitleMascot(o) {
    const M = o.meta, host = o.host, scr = o.screen;
    const cv = document.createElement('canvas'); cv.className = 'mascotFx';
    // 默认 z-index:-1 垫在标题页所有元素之下；若标题页有定位的背景层（o.after），则紧跟其后插入
    cv.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:' + (o.after ? 'auto' : '-1');
    if (o.after) o.after.parentNode.insertBefore(cv, o.after.nextSibling); else scr.insertBefore(cv, scr.firstChild);
    const c = cv.getContext('2d');
    const st = { sheets: [], ok: false, t: 0, tt: 0, last: 0, rc: 0, R: null, parts: [], prev: null, cw: 0, ch: 0, shown: false };
    // 载入精灵表：WebP 优先，失败回退 PNG；解码后转画布，避免每帧解码
    let left = M.sheets.length;
    M.sheets.forEach((nm, i) => {
      const im = new Image(); let tried = false;
      im.onload = () => { try { const k = document.createElement('canvas'); k.width = im.naturalWidth; k.height = im.naturalHeight; k.getContext('2d').drawImage(im, 0, 0); st.sheets[i] = k; } catch (e) { st.sheets[i] = im; } if (--left === 0) { st.ok = true; st.t = 0; } };
      im.onerror = () => { if (!tried) { tried = true; im.src = o.base + nm + '.png'; } };
      im.src = o.base + nm + '.webp';
    });
    function measure() {
      if (o.layout) o.layout();
      const sr = scr.getBoundingClientRect(), hr = host.getBoundingClientRect();
      let top = -1e4, bot = 1e4;
      if (o.clipTop) { const e = o.clipTop(); if (e) top = e.getBoundingClientRect().bottom - sr.top; }
      if (o.clipBottom) { const e = o.clipBottom(); if (e) bot = e.getBoundingClientRect().top - sr.top; }
      // 画布只覆盖主角所在的条带（省填充率）：上至副标题底、下至按钮顶
      const y0 = Math.max(0, Math.floor(Math.max(top, hr.top - sr.top - hr.height * .25))), y1 = Math.min(sr.height, Math.ceil(Math.min(bot, hr.bottom - sr.top + 30)));
      const w = Math.round(sr.width * DPR), h = Math.max(1, Math.round((y1 - y0) * DPR));
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
      cv.style.top = y0 + 'px'; cv.style.height = (y1 - y0) + 'px';
      st.R = { x: hr.left - sr.left, y: hr.top - sr.top, w: hr.width, h: hr.height, top, bot, sw: sr.width, sh: sr.height, y0 };
    }
    window.addEventListener('resize', () => { st.R = null; });
    const api = {
      spr, hexA, c, st,
      add(p) { if (st.parts.length < (o.maxParts || 60)) st.parts.push(Object.assign({ x: 0, y: 0, vx: 0, vy: 0, g: 0, drag: 1, s: 1, rot: 0, vr: 0, life: 0, max: 1, ph: Math.random() * 6, tw: 0, grow: 0, add: true, wob: 0 }, p)); },
      glow(col, x, y, w, h, a) { c.globalAlpha = a; c.drawImage(spr('glow', col), x - w / 2, y - h / 2, w, h); }
    };
    function frame() {
      requestAnimationFrame(frame);
      if (!scr.getClientRects().length || document.hidden) { st.last = 0; return; }
      if (o.enabled && !o.enabled()) { // 例如换了别的皮肤：交还给原静态图
        if (st.shown) { st.shown = false; host.style.visibility = ''; c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cv.width, cv.height); st.parts.length = 0; }
        if (o.onToggle && st.en !== false) o.onToggle(st.en = false); return;
      }
      if (o.onToggle && st.en !== true) o.onToggle(st.en = true);
      const now = performance.now() / 1000, dt = st.last ? Math.min(.05, now - st.last) : .016; st.last = now;
      if (!st.R || ++st.rc % 30 === 0) measure();
      const R = st.R; if (!R.w || !R.h) { st.R = null; return; }
      const stat = host.complete && host.naturalWidth > 0;
      if (!st.ok && !stat) return;
      if (!st.shown) { st.shown = true; host.style.visibility = 'hidden'; } // 画布接管后隐藏占位图（保留布局）
      st.t += dt; st.tt += dt; const t = st.tt;
      // 帧适配：按宿主盒 contain，底部对齐、水平居中
      const k = Math.min(R.w / M.fw, R.h / M.fh), dw = M.fw * k, dh = M.fh * k;
      const ox = R.x + (R.w - dw) / 2, oy = R.y + R.h - dh;
      const f = st.ok ? Math.floor(st.t * M.fps) % M.n : 0;
      const bob = o.bob === false ? 0 : Math.sin(t * 1.7) * 3.2 + Math.sin(t * 3.4) * .8;
      const sway = o.sway || 0, rot = Math.sin(t * 1.1) * (o.rot || .012), dx = Math.sin(t * .85) * sway;
      const ax = ox + dw / 2, ay = oy + dh; // 绕脚底摆动
      const S = { t, dt, f, k, u: dw / 300, ox, oy, dw, dh, R, bob, dx, rot, ok: st.ok,
        map(px, py) { const lx = px * k - dw / 2, ly = py * k - dh, ca = Math.cos(rot), sa = Math.sin(rot); return [ax + dx + lx * ca - ly * sa, ay + bob + lx * sa + ly * ca]; },
        track() { const a = M.track; if (!a) return null; return this.map(a[f * 2], a[f * 2 + 1]); } };
      c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cv.width, cv.height);
      c.setTransform(DPR, 0, 0, DPR, 0, -R.y0 * DPR);
      c.save();
      if (o.back) { c.save(); o.back(api, S); c.restore(); }
      // 主角本体
      c.save(); c.translate(ax + dx, ay + bob); c.rotate(rot); c.imageSmoothingEnabled = !o.pixel;
      if (st.ok) { const j = f % (M.cols * M.rows), sh = st.sheets[(f / (M.cols * M.rows)) | 0]; c.drawImage(sh, (j % M.cols) * M.fw, ((j / M.cols) | 0) * M.fh, M.fw, M.fh, -dw / 2, -dh, dw, dh); }
      else c.drawImage(host, -dw / 2, -dh, dw, dh);
      c.restore();
      if (o.front) { c.save(); o.front(api, S); c.restore(); }
      // 粒子
      const P = st.parts;
      for (let i = P.length - 1; i >= 0; i--) {
        const p = P[i]; p.life += dt; if (p.life > p.max) { P.splice(i, 1); continue; }
        p.vy += p.g * dt; const dr = Math.max(0, 1 - p.drag * dt); p.vx *= dr; p.vy *= dr;
        p.x += (p.vx + (p.wob ? Math.sin(p.life * 4 + p.ph) * p.wob : 0)) * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
        const tw = p.tw ? (1 - p.tw) + p.tw * Math.sin(p.life * 13 + p.ph) : 1;
        const a = Math.min(1, p.life / (p.fin || .12)) * Math.min(1, (p.max - p.life) / (p.fout || .4)) * tw * (p.a == null ? 1 : p.a);
        if (a <= 0) continue;
        const sz = 64 * p.s * (1 + p.grow * p.life / p.max);
        c.globalCompositeOperation = p.add ? 'lighter' : 'source-over'; c.globalAlpha = a;
        c.imageSmoothingEnabled = p.k !== 'px';
        if (p.rot) { c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.drawImage(spr(p.k, p.c), -sz / 2, -sz / 2, sz, sz); c.restore(); }
        else { const px = p.k === 'px' ? Math.round(p.x) : p.x - sz / 2, py = p.k === 'px' ? Math.round(p.y) : p.y - sz / 2; c.drawImage(spr(p.k, p.c), p.k === 'px' ? px - sz / 2 : px, p.k === 'px' ? py - sz / 2 : py, sz, sz); }
      }
      c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
      c.restore();
    }
    requestAnimationFrame(frame);
    return api;
  }
  window.TitleMascot = TitleMascot;
})();
