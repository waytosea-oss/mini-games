// 星际雷霆 — 渲染
'use strict';
const PS = 1.0; // player sprite scale
const CJK = '"PingFang SC","Hiragino Sans GB","Microsoft YaHei","Noto Sans CJK SC","Source Han Sans SC",sans-serif';
let menuBg = 1;
function drawBG(bg, dark) {
  const bh = bg.height * W / bg.width;
  let yy = (bgY % bh) - bh;
  while (yy < H) { ctx.drawImage(bg, 0, yy, W, bh + 0.5); yy += bh; }
  if (dark) { ctx.fillStyle = `rgba(4,4,16,${dark})`; ctx.fillRect(0, 0, W, H); }
  const spd = [14, 34, 90], cols = ['#6f7fb0', '#c8d4ff', '#ffffff'];
  const streak = STATE === 'play' && G && G.phase === 'clear' ? Math.min(1, G.phaseT) : 0;
  for (const s of stars) {
    const y = (s.y + bgY * spd[s.l] / 26) % (H + 20) - 10;
    const tw = s.l == 0 ? 0.5 + 0.5 * Math.sin(s.tw + bgY * 0.08) : 1;
    ctx.globalAlpha = (s.l == 0 ? 0.6 : s.l == 1 ? 0.75 : 0.9) * tw;
    ctx.fillStyle = cols[s.l];
    const sz = s.l == 0 ? 1 : s.l == 1 ? 1.3 : 1.8;
    ctx.fillRect(s.x, y, sz, sz + (s.l == 2 ? 1.5 : 0) + streak * (s.l + 1) * 14);
  }
  ctx.globalAlpha = 1;
}
function dimg(im, x, y, w, h) { ctx.drawImage(im, x - w / 2, y - h / 2, w, h); }
function glowAt(g, x, y, s, a = 1) { ctx.globalAlpha = a; ctx.drawImage(g, x - s / 2, y - s / 2, s, s); ctx.globalAlpha = 1; }
function textOut(txt, x, y, font, fill, stroke = '#000', lw = 3, align = 'center') {
  ctx.font = font; ctx.textAlign = align; ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round'; ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.strokeText(txt, x, y);
  ctx.fillStyle = fill; ctx.fillText(txt, x, y);
}
function render(dt) {
  ctx.setTransform(SC, 0, 0, SC, 0, 0);
  ctx.imageSmoothingEnabled = false;
  if (STATE !== 'play') { bgY += dt * 18; drawBG(IMG['bg' + menuBg] || IMG.bg1, 0.35); ctx.drawImage(FX.vig, 0, 0, W, H); return; }
  let sx = 0, sy = 0; if (shake > 0) { sx = rnd(-shake, shake) * 0.6; sy = rnd(-shake, shake) * 0.6; }
  ctx.save(); ctx.translate(sx, sy);
  drawBG(LV.bg, SECTORS[LV.s].dark);
  if (BOSS) drawBoss();
  drawEnemies();
  drawHazards();
  drawPlayerShots();
  drawPlayer();
  ctx.imageSmoothingEnabled = false;
  for (const x of expls) { const i = Math.min(x.fr.length - 1, Math.floor(x.t / x.dur * x.fr.length)); dimg(x.fr[i], x.x, x.y, x.size, x.size); }
  drawItems();
  drawEnemyBullets();
  drawParticles();
  ctx.restore();
  ctx.drawImage(FX.vig, 0, 0, W, H);
  drawHUD();
  drawBanner();
  if (flash > 0) { ctx.globalAlpha = Math.min(1, flash); ctx.fillStyle = flashCol; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
  if (G.bombT > 1.2) { ctx.globalAlpha = (G.bombT - 1.2) * 0.6; ctx.fillStyle = '#fff4c0'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
}
function drawEnemies() {
  for (const e of enemies) {
    if (e.part) continue;
    if (e.type == 3 || e.mini || LV.tv == 3) { ctx.globalCompositeOperation = 'lighter'; glowAt(e.mini ? FX.glow.r : FX.glow.v, e.x, e.y, e.w * 1.5, 0.25 + 0.1 * Math.sin(G.time * 6)); ctx.globalCompositeOperation = 'source-over'; }
    dimg(e.img, e.x, e.y, e.w, e.h);
    if (e.flash > 0) { ctx.globalAlpha = 0.8; dimg(e.white, e.x, e.y, e.w, e.h); ctx.globalAlpha = 1; }
    else if (e.hp < e.maxhp * 0.35 && e.type >= 2 && Math.sin(G.time * 30) > 0.3) { ctx.globalAlpha = 0.25; dimg(e.white, e.x, e.y, e.w, e.h); ctx.globalAlpha = 1; }
  }
}
function drawBoss() {
  const b = BOSS;
  dimg(b.img, b.x, b.y, b.w, b.h);
  if (b.phase == 3 && b.dieT == 0) { ctx.globalAlpha = 0.18 + 0.14 * Math.sin(G.time * 10); dimg(FX.bossR[b.s + 1], b.x, b.y, b.w, b.h); ctx.globalAlpha = 1; }
  if (b.flash > 0 || (b.dieT > 0 && Math.sin(G.time * 40) > 0)) { ctx.globalAlpha = 0.45; dimg(FX.bossW[b.s + 1], b.x, b.y, b.w, b.h); ctx.globalAlpha = 1; }
  for (const w of b.wrecks) {
    const x = b.x + w.ox, y = b.y + w.oy;
    glowAt(FX.glow.k, x, y, w.r * 3.2, 0.95);
    ctx.globalCompositeOperation = 'lighter'; glowAt(FX.glow.o, x + rnd(-2, 2), y + rnd(-2, 2), w.r * (1.4 + Math.random() * 0.5), 0.55); ctx.globalCompositeOperation = 'source-over';
    if (Math.random() < 0.3) parts.push({ x: x + rnd(-6, 6), y, vx: rnd(-8, 8), vy: rnd(30, 60), life: 0.8, max: 0.8, size: rnd(3, 6), col: pick(['#555', '#444', '#ff8a1c']) });
  }
  const c = b.core;
  if (!c.dead) {
    ctx.globalCompositeOperation = 'lighter';
    if (c.inv) {
      ctx.strokeStyle = `rgba(120,220,255,${0.35 + 0.25 * Math.sin(G.time * 8)})`; ctx.lineWidth = 2;
      ctx.beginPath(); for (let i = 0; i <= 6; i++) { const a = i / 6 * TAU + G.time * 0.8; const rr = c.r * 1.25; i ? ctx.lineTo(c.x + Math.cos(a) * rr, c.y + Math.sin(a) * rr) : ctx.moveTo(c.x + Math.cos(a) * rr, c.y + Math.sin(a) * rr); } ctx.stroke();
    } else glowAt(FX.glow.r, c.x, c.y, c.r * 3.2 * (1 + 0.15 * Math.sin(G.time * 9)), 0.55);
    ctx.globalCompositeOperation = 'source-over';
  }
}
function drawHazards() {
  for (const hz of hazards) {
    if (hz.t < hz.warn) {
      const a = 0.35 + 0.35 * Math.sin(hz.t * 30);
      ctx.fillStyle = `rgba(255,60,60,${a})`; ctx.fillRect(hz.x - 1, hz.y0, 2, H);
      ctx.strokeStyle = `rgba(255,80,80,${a * 0.6})`; ctx.setLineDash([6, 6]); ctx.lineWidth = 1; ctx.strokeRect(hz.x - hz.w / 2, hz.y0, hz.w, H); ctx.setLineDash([]);
      textOut('!', hz.x, hz.y0 + 30 + Math.sin(hz.t * 20) * 3, '12px PS2P', '#ff4040', '#300', 3);
    } else {
      const k = hz.t - hz.warn, open = Math.min(1, k * 8) * Math.min(1, (hz.dur - k) * 6), w = hz.w * open * (1 + Math.random() * 0.12);
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(255,120,40,0.35)'; ctx.fillRect(hz.x - w * 0.9, hz.y0, w * 1.8, H);
      ctx.fillStyle = 'rgba(255,190,90,0.85)'; ctx.fillRect(hz.x - w / 2, hz.y0, w, H);
      ctx.fillStyle = '#fff'; ctx.fillRect(hz.x - w * 0.22, hz.y0, w * 0.44, H);
      glowAt(FX.glow.o, hz.x, hz.y0, w * 4, 0.9);
      ctx.globalCompositeOperation = 'source-over';
    }
  }
}
function drawPlayerShots() {
  ctx.imageSmoothingEnabled = true;
  ctx.globalCompositeOperation = 'lighter';
  for (const b of pbs) {
    if (b.mis) continue;
    const s = b.spr.s;
    if (Math.abs(b.a) > 0.03) { ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.a); ctx.drawImage(b.spr.c, -s / 2, -s / 2, s, s); ctx.restore(); }
    else ctx.drawImage(b.spr.c, b.x - s / 2, b.y - s / 2, s, s);
  }
  // lancer beam
  const bm = P.beam;
  if (bm && P.alive && G.phase !== 'clear') {
    const top = bm.end, len = bm.y - top, w = bm.w * (0.92 + Math.random() * 0.16);
    ctx.fillStyle = 'rgba(255,40,90,0.28)'; ctx.fillRect(bm.x - w * 1.2, top, w * 2.4, len);
    ctx.fillStyle = 'rgba(255,90,140,0.85)'; ctx.fillRect(bm.x - w / 2, top, w, len);
    ctx.fillStyle = 'rgba(255,220,235,0.95)'; ctx.fillRect(bm.x - w * 0.22, top, w * 0.44, len);
    // moving pixel bands
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    const off = (G.time * 600) % 16;
    for (let y = bm.y - off; y > top; y -= 16) ctx.fillRect(bm.x - w / 2, y - 4, w, 4);
    glowAt(FX.glow.p, bm.x, bm.y, w * 4.5, 0.9);
    if (bm.hit) glowAt(FX.glow.w, bm.x, top, w * 4 + Math.random() * 10, 0.9);
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.imageSmoothingEnabled = false;
  for (const b of pbs) { if (!b.mis) continue; ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.a + Math.PI / 2); ctx.drawImage(FX.missile, -3.5, -7.5, 7, 15); ctx.restore(); }
}
function drawPlayer() {
  const p = P; if (!p.alive) return;
  if (p.inv > 0 && G.phase !== 'clear' && Math.floor(G.time * 14) % 2 == 0) return;
  const im = shipImg(), w = im.width / 2 * PS, h = im.height / 2 * PS;
  // options
  if (p.evo >= 2 && G.phase !== 'clear') {
    const oi = IMG[`ship_${p.ship.id}_0`];
    for (const o of p.opts) {
      ctx.globalCompositeOperation = 'lighter'; glowAt(FX.glow[p.ship.id === 'falcon' ? 'c' : p.ship.id === 'lancer' ? 'p' : 'g'], o.x, o.y, 30 + Math.sin(G.time * 12) * 4, 0.7); ctx.globalCompositeOperation = 'source-over';
      dimg(oi, o.x, o.y, oi.width / 2 * 0.42, oi.height / 2 * 0.42);
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(o.x, o.y, 10, G.time * 5, G.time * 5 + 2); ctx.stroke();
    }
  }
  ctx.globalCompositeOperation = 'lighter';
  const ec = p.ship.id === 'falcon' ? FX.glow.c : p.ship.id === 'lancer' ? FX.glow.o : FX.glow.g;
  glowAt(ec, p.x, p.y + h * 0.42, w * 0.9 + Math.random() * 6, 0.85);
  ctx.globalCompositeOperation = 'source-over';
  const sx = 1 - Math.abs(p.bank) * 0.16;
  ctx.save(); ctx.translate(p.x, p.y); ctx.scale(sx, 1);
  ctx.drawImage(im, -w / 2, -h / 2, w, h);
  if (p.inv > 0 && G.phase !== 'clear') { ctx.globalAlpha = 0.35; ctx.drawImage(FX.shipW[p.ship.id + p.evo], -w / 2, -h / 2, w, h); ctx.globalAlpha = 1; }
  ctx.restore();
  // hitbox core
  if (p.ctrl) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(p.x, p.y, 2.4, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(255,60,120,0.9)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(p.x, p.y, 3.6, 0, TAU); ctx.stroke(); }
}
function drawItems() {
  ctx.imageSmoothingEnabled = false;
  for (const it of items) {
    if (it.t === 'C') { const f = FX.coin[Math.floor((G.time * 10 + it.x) % 4)]; dimg(f, it.x, it.y, 15, 15); continue; }
    const blink = it.age > 7 && Math.floor(it.age * 8) % 2;
    if (blink) continue;
    ctx.globalCompositeOperation = 'lighter'; glowAt(it.t === 'P' ? FX.glow.o : FX.glow.g, it.x, it.y, 44 + Math.sin(G.time * 10) * 6, 0.6); ctx.globalCompositeOperation = 'source-over';
    dimg(FX.items[it.t], it.x, it.y + Math.sin(it.age * 6) * 1.5, 26, 26);
  }
}
function drawEnemyBullets() {
  ctx.imageSmoothingEnabled = true;
  for (const b of ebs) {
    const s = b.spr.s;
    if (b.k[1] === 'n') { ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(Math.atan2(b.vy, b.vx)); ctx.drawImage(b.spr.c, -s / 2, -s / 2, s, s); ctx.restore(); }
    else ctx.drawImage(b.spr.c, b.x - s / 2, b.y - s / 2, s, s);
  }
  ctx.imageSmoothingEnabled = false;
}
function drawParticles() {
  for (const p of parts) {
    const a = clamp(p.life / p.max, 0, 1);
    if (p.txt) { ctx.globalAlpha = Math.min(1, a * 2); textOut(p.txt, p.x, p.y, '8px PS2P', p.col, '#000', 3); ctx.globalAlpha = 1; continue; }
    if (p.ring) { const k = 1 - a, r = p.r0 + (p.r1 - p.r0) * (1 - Math.pow(1 - k, 3)); ctx.globalAlpha = a; ctx.strokeStyle = p.col; ctx.lineWidth = 1 + a * 5; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; continue; }
    if (p.add) ctx.globalCompositeOperation = 'lighter';
    if (p.g) { glowAt(p.glow, p.x, p.y, p.size * (1.4 - a * 0.4), a); }
    else if (p.spark) { ctx.globalAlpha = a; ctx.strokeStyle = p.col; ctx.lineWidth = p.size * 0.7; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.035, p.y - p.vy * 0.035); ctx.stroke(); }
    else { ctx.globalAlpha = a; ctx.fillStyle = p.col; const s = p.size; ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s); }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }
}
function drawHUD() {
  const t = safeTop;
  const g = ctx.createLinearGradient(0, 0, 0, t + 44); g.addColorStop(0, 'rgba(0,0,10,0.75)'); g.addColorStop(1, 'rgba(0,0,10,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, t + 44);
  textOut('SCORE', 10, t + 12, '6px PS2P', '#ff6b9d', '#000', 2, 'left');
  textOut(String(G.score).padStart(8, '0'), 10, t + 24, '9px PS2P', '#ffffff', '#000', 3, 'left');
  textOut(`STAGE ${LV.s + 1}-${LV.t + 1}`, W / 2, t + 12, '6px PS2P', SECTORS[LV.s].col, '#000', 2);
  // coins
  dimg(FX.coin[0], W / 2 - 14, t + 25, 11, 11);
  textOut(String(G.coins), W / 2 - 6, t + 25.5, '8px PS2P', '#ffd84a', '#000', 3, 'left');
  // bottom-left: lives / bombs / power
  const by = H - 16 - safeBot;
  const li = IMG[`ship_${P.ship.id}_0`];
  for (let i = 0; i < Math.max(0, G.lives); i++) dimg(li, 14 + i * 15, by - 30, li.width / 2 * 0.36, li.height / 2 * 0.36);
  textOut('POW', 8, by - 12, '6px PS2P', '#ffb03a', '#000', 2, 'left');
  for (let i = 0; i < 4; i++) { ctx.fillStyle = '#000'; ctx.fillRect(30 + i * 11, by - 16, 10, 8); ctx.fillStyle = i < G.power ? (G.power == 4 ? (Math.sin(G.time * 12) > 0 ? '#fff' : '#ffb03a') : '#ff7a2a') : '#3a2a3a'; ctx.fillRect(31 + i * 11, by - 15, 8, 6); }
  // boss / mini bar
  const tgt = BOSS && !BOSS.entering ? 'boss' : (G.mini ? 'mini' : null);
  if (tgt) {
    G.bossBarT = Math.min(1, G.bossBarT + G.dt * 1.2);
    const frac = tgt === 'boss' ? bossHpFrac() : Math.max(0, G.mini.hp / G.mini.maxhp);
    const x0 = 12, w = W - 24, y = t + 54;
    textOut(tgt === 'boss' ? SECTORS[LV.s].boss : '精英战舰', x0, y - 2, `bold 10px ${CJK}`, '#ffd0d0', '#200', 3, 'left');
    ctx.fillStyle = '#000'; ctx.fillRect(x0 - 1, y + 5, w + 2, 8);
    ctx.fillStyle = '#3a0a14'; ctx.fillRect(x0, y + 6, w, 6);
    const gw = w * frac * G.bossBarT;
    const gg = ctx.createLinearGradient(x0, 0, x0 + w, 0); gg.addColorStop(0, '#ff2a4a'); gg.addColorStop(0.6, '#ff8a2a'); gg.addColorStop(1, '#ffe14a');
    ctx.fillStyle = gg; ctx.fillRect(x0, y + 6, gw, 6);
    ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillRect(x0, y + 6, gw, 2);
    ctx.fillStyle = '#000'; for (let i = 1; i < 20; i++) ctx.fillRect(x0 + w * i / 20, y + 6, 1, 6);
    if (tgt === 'boss') { const ph = BOSS.phase; textOut(ph >= 3 ? 'RAGE' : ph == 2 ? 'CORE' : 'ARMOR', W - 12, y - 2, '6px PS2P', ph >= 3 ? '#ff4040' : '#9ff3ff', '#000', 2, 'right'); }
  }
  if (DEBUG.fps) textOut(String(Math.round(FPS)) + 'fps e' + enemies.length + ' b' + ebs.length, W - 10, H - 6 - safeBot, '6px PS2P', '#0f0', '#000', 2, 'right');
}
function drawBanner() {
  const b = G.banner; if (!b) return;
  const k = b.t / b.dur, ina = Math.min(1, b.t * 4), outa = Math.min(1, (b.dur - b.t) * 4), a = Math.min(ina, outa);
  const cy = H * 0.42;
  if (b.kind === 'stage') {
    ctx.globalAlpha = a * 0.75; ctx.fillStyle = '#000'; ctx.fillRect(0, cy - 34, W, 68);
    ctx.globalAlpha = a; ctx.fillStyle = SECTORS[LV.s].col; ctx.fillRect(0, cy - 34, W * ina, 2); ctx.fillRect(W * (1 - ina), cy + 32, W, 2);
    const off = (1 - ina) * 80;
    textOut(`STAGE ${LV.s + 1}-${LV.t + 1}`, W / 2 - off, cy - 12, '16px PS2P', '#ffe14a', '#5a1a00', 4);
    textOut(`第${LV.s + 1}星区 · ${SECTORS[LV.s].name}` + (LV.t == 4 ? ' · 决战' : ''), W / 2 + off, cy + 15, `bold 14px ${CJK}`, '#ffffff', '#000', 4);
    ctx.globalAlpha = 1;
  } else if (b.kind === 'warning' || b.kind === 'mini') {
    const red = b.kind === 'warning';
    const pulse = 0.55 + 0.45 * Math.sin(b.t * 10);
    ctx.globalAlpha = a * 0.25 * pulse; ctx.fillStyle = red ? '#ff0000' : '#ff8800'; ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = a;
    for (const yy of [cy - 46, cy + 34]) {
      ctx.fillStyle = '#000'; ctx.fillRect(0, yy, W, 12);
      ctx.fillStyle = red ? '#ff2a2a' : '#ffaa22';
      const off = (b.t * 60) % 24; for (let x = -24 + off; x < W; x += 24) { ctx.beginPath(); ctx.moveTo(x, yy + 12); ctx.lineTo(x + 12, yy); ctx.lineTo(x + 20, yy); ctx.lineTo(x + 8, yy + 12); ctx.fill(); }
    }
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, cy - 34, W, 68);
    textOut(red ? 'WARNING' : 'CAUTION', W / 2, cy - 10, '22px PS2P', pulse > 0.5 ? (red ? '#ff3b3b' : '#ffb02a') : '#ffffff', '#300', 5);
    textOut(red ? `巨型敌舰「${SECTORS[LV.s].boss}」接近中` : '精英战舰来袭！', W / 2, cy + 18, `bold 13px ${CJK}`, '#fff', '#000', 4);
    ctx.globalAlpha = 1;
  } else if (b.kind === 'phase') {
    ctx.globalAlpha = a; textOut(b.text, W / 2, cy, `bold 22px ${CJK}`, '#ff5050', '#200', 5); ctx.globalAlpha = 1;
  }
}
