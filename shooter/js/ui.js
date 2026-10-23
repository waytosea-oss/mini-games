// 星际雷霆 — 界面 / 输入 / 主循环
'use strict';
const KEYS = new Set();
const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));
let FPS = 60, curScreen = 'scrLoad', mapSector = 0, hgShip = 'falcon', titleReady = false;

function show(id) {
  $$('.scr').forEach(e => { if (!e.classList.contains('ov')) e.classList.toggle('show', e.id === id); });
  curScreen = id;
}
function overlay(id, on) { $('#' + id).classList.toggle('show', on); }
let toastT = 0;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 1400); }
function fmt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
function updCoins() { $$('.cv').forEach(e => e.textContent = fmt(SAVE.coins)); }
function updToggles() {
  $$('.tog').forEach(b => b.classList.toggle('off', !SAVE[b.dataset.k]));
  Sound.setMusic(SAVE.music && !DEBUG.mute); Sound.setSfx(SAVE.sfx && !DEBUG.mute);
}
function tapSfx(f) { return (ev) => { Sound.unlock(); f(ev); }; }
function on(sel, f, snd = 'click') { const el = typeof sel === 'string' ? $(sel) : sel; el.addEventListener('click', (ev) => { Sound.unlock(); if (snd) Sound.sfx[snd](); f(ev); }); }

const UI = {
  onLevelStart() {
    ['scrPause', 'scrResult'].forEach(i => overlay(i, false));
    $$('.scr').forEach(e => { if (!e.classList.contains('ov')) e.classList.remove('show'); });
    curScreen = 'play';
    $('#hud').classList.remove('hide');
    $('#tut').classList.toggle('hide', !!SAVE.seenTut || DEBUG.bot);
    UI.hud();
  },
  hud() {
    if (!G) return;
    $('#bombN').textContent = G.bombs;
    $('#btnBomb').classList.toggle('empty', G.bombs <= 0);
  },
  result(r) {
    setTimeout(() => {
      $('#hud').classList.add('hide');
      const p = $('#scrResult .panel'); p.classList.toggle('lose', !r.win);
      $('#rTitle').textContent = r.win ? (r.n == 25 ? '最终胜利！' : '任务完成') : '任务失败';
      $('#rSub').textContent = `STAGE ${((r.n - 1) / 5 | 0) + 1}-${(r.n - 1) % 5 + 1}`;
      $('#rStars').style.display = r.win ? 'flex' : 'none';
      $$('#rStars i').forEach((s, i) => { s.className = ''; if (i < r.stars) setTimeout(() => { s.className = 'on'; Sound.sfx.star(i); }, 450 + i * 300); });
      const rows = [['得分', fmt(r.score)], ['击坠数', r.kills], ['拾取金币', `<i class="coin"></i>${fmt(r.coins)}`]];
      if (r.win) rows.push(['通关奖励', `<i class="coin"></i>${fmt(r.bonus)}`]);
      rows.push(['合计获得', `<i class="coin"></i>+${fmt(r.coins + r.bonus)}`]);
      $('#rRows').innerHTML = rows.map((x, i) => `<div class="rRow${i == rows.length - 1 ? ' tot' : ''}"><span>${x[0]}</span><b>${x[1]}</b></div>`).join('') +
        (!r.win ? '<div class="rRow"><span style="color:#8fa0d0;font-size:.85em">提示：金币已保存，可前往机库强化战机</span></div>' : '');
      const B = $('#rBtns'); B.innerHTML = '';
      const mk = (txt, cls, f) => { const b = document.createElement('button'); b.className = 'btn mid ' + cls; b.textContent = txt; on(b, f); return b; };
      if (r.win) {
        if (r.n == 25) B.appendChild(mk('观看结局', 'gold', () => { overlay('scrResult', false); showEnding(); }));
        else B.appendChild(mk('下一关', 'gold', () => go(r.n + 1)));
      } else B.appendChild(mk('再试一次', 'gold', () => go(r.n)));
      const row = document.createElement('div'); row.className = 'row2';
      row.appendChild(mk('星域地图', 'blue', () => { overlay('scrResult', false); openMap(); }));
      row.appendChild(mk('机库', 'green', () => { overlay('scrResult', false); openHangar('map'); }));
      B.appendChild(row);
      { const hb = mk('返回游戏屋', 'hubb', goHub); hb.id = 'rHub'; B.appendChild(hb); }
      overlay('scrResult', true);
    }, r.win ? 300 : 500);
  },
};
function go(n) { overlay('scrResult', false); STATE = 'play'; startLevel(n); }
function exitToMenu() { STATE = 'menu'; PAUSED = false; Sound.laser(false); $('#hud').classList.add('hide'); if (LV) menuBg = LV.s + 1; }

// ---------- title ----------
function openTitle() {
  exitToMenu(); show('scrTitle'); updToggles();
  $('#tHi').textContent = SAVE.hi ? '最高分 ' + String(SAVE.hi).padStart(8, '0') : '';
  Sound.play('menu');
}
// ---------- map ----------
const NODE_POS = [[70, 380], [210, 330], [92, 262], [222, 196], [150, 128]];
function openMap(sec) {
  exitToMenu(); show('scrMap'); updCoins();
  mapSector = sec != null ? sec : Math.min(4, (SAVE.maxLevel - 1) / 5 | 0);
  renderMap(); Sound.play('menu');
}
function renderMap(dir) {
  const s = mapSector, S = SECTORS[s], card = $('#secCard');
  card.style.setProperty('--sc', S.col);
  card.classList.remove('swL', 'swR'); void card.offsetWidth; if (dir) card.classList.add(dir < 0 ? 'swL' : 'swR');
  card.querySelector('.secBg').style.backgroundImage = `url(assets/bg${s + 1}.jpg)`;
  card.querySelector('.secNo').textContent = `SECTOR ${s + 1}`;
  card.querySelector('.secName').textContent = S.name;
  card.querySelector('.secEn').textContent = S.en;
  card.querySelector('.secPath path').setAttribute('d', 'M' + NODE_POS.map(p => p.join(' ')).join(' L'));
  const nd = card.querySelector('.nodes'); nd.innerHTML = '';
  let tot = 0;
  NODE_POS.forEach((p, i) => {
    const n = s * 5 + i + 1, st = SAVE.stars[n] || 0, lock = n > SAVE.maxLevel; tot += st;
    const b = document.createElement('button');
    b.className = 'node' + (i == 4 ? ' boss' : '') + (lock ? ' lock' : '') + (n == SAVE.maxLevel && !SAVE.stars[n] ? ' cur' : '');
    b.style.left = (p[0] / 300 * 100) + '%'; b.style.top = (p[1] / 420 * 100) + '%';
    b.innerHTML = (i == 4 ? `<img src="assets/boss${s + 1}.png" alt=""><b>BOSS</b>` : (lock ? '' : `${s + 1}-${i + 1}`)) +
      (lock ? '' : `<div class="st">${[0, 1, 2].map(k => `<span class="${k < st ? 'on' : 'no'}">★</span>`).join('')}</div>`);
    b.addEventListener('click', () => { Sound.unlock(); if (lock) { Sound.sfx.deny(); toast('请先通关前一关卡'); return; } Sound.sfx.click(); startLevel(n); });
    nd.appendChild(b);
  });
  card.querySelector('.secStars').innerHTML = `<span class="sg">★</span> ${tot} / 15`;
  $('#secPrev').classList.toggle('dim', s == 0); $('#secNext').classList.toggle('dim', s == 4);
  $('#secDots').innerHTML = SECTORS.map((_, i) => `<i class="${i == s ? 'on' : ''}"></i>`).join('');
  const sh = SHIPS.find(x => x.id === SAVE.sel), ev = SAVE.ships[sh.id].evo;
  $('#shipChip').innerHTML = `<img src="assets/ship_${sh.id}_${ev}.png" alt=""><div>${sh.name}<em>${EVO_NAMES[ev]}</em></div>`;
}
function mapStep(d) { const n = clamp(mapSector + d, 0, 4); if (n === mapSector) return; mapSector = n; Sound.sfx.click(); renderMap(d); }
// swipe on map card
(function () { let sx = null; const c = $('#secCard');
  c.addEventListener('pointerdown', e => sx = e.clientX);
  c.addEventListener('pointerup', e => { if (sx != null && Math.abs(e.clientX - sx) > 50) mapStep(e.clientX < sx ? 1 : -1); sx = null; });
})();

// ---------- hangar ----------
let hgFrom = 'title';
function openHangar(from) { hgFrom = from || 'title'; exitToMenu(); show('scrHangar'); hgShip = SAVE.sel; renderHangar(); updCoins(); Sound.play('menu'); }
function renderHangar(pop) {
  const sh = SHIPS.find(x => x.id === hgShip), st = SAVE.ships[sh.id], own = st.own, ev = st.evo;
  const scr = $('#scrHangar'); scr.style.setProperty('--c', sh.col);
  $('#hgTabs').innerHTML = SHIPS.map(s => `<button class="tab${s.id === hgShip ? ' on' : ''}${SAVE.ships[s.id].own ? '' : ' lock'}" data-id="${s.id}" style="--c:${s.col}">${SAVE.sel === s.id ? '<span class="badge">出战</span>' : ''}<img src="assets/ship_${s.id}_${SAVE.ships[s.id].evo}.png" alt=""><div>${s.name}</div></button>`).join('');
  $$('#hgTabs .tab').forEach(t => t.addEventListener('click', () => { Sound.sfx.click(); hgShip = t.dataset.id; renderHangar(); }));
  const img = $('#hgShip'); img.src = `assets/ship_${sh.id}_${ev}.png`;
  const im = IMG[`ship_${sh.id}_${ev}`]; const scale = 1.0;
  img.style.width = `calc(var(--u) * ${(im ? im.width : 128) / 2 * scale * 1.5})`;
  img.classList.toggle('lock', !own); img.classList.remove('pop'); if (pop) { void img.offsetWidth; img.classList.add('pop'); }
  $('#hgTag').textContent = own ? EVO_NAMES[ev] : 'LOCKED';
  $('#hgName').textContent = sh.name; $('#hgStyle').textContent = sh.style;
  $('#hgDesc').textContent = sh.desc;
  const names = ['火力', '范围', '机动'], cur = sh.stats[ev], nxt = sh.stats[Math.min(2, ev + 1)];
  $('#hgStats').innerHTML = names.map((n, i) => `<div class="stat"><span>${n}</span><div class="bar">${[0, 1, 2, 3, 4, 5].map(k => `<i class="${k < cur[i] ? 'on' : (own && ev < 2 && k < nxt[i] ? 'nx' : '')}"></i>`).join('')}</div></div>`).join('');
  $('#hgEvos').innerHTML = [0, 1, 2].map(i => `<div class="evo${own && i <= ev ? ' on' : ''}"><img src="assets/ship_${sh.id}_${i}.png" alt="">${EVO_NAMES[i]}</div>`).join('');
  const main = $('#hgMain'), sel = $('#hgSel');
  if (!own) { main.innerHTML = `购买战机<span class="pr"><i class="coin sm"></i> ${fmt(sh.price)}</span>`; main.className = 'btn gold mid' + (SAVE.coins < sh.price ? ' dis' : ''); main.dataset.act = 'buy'; }
  else if (ev < 2) { const c = sh.evoCost[ev + 1]; main.innerHTML = `进化至 ${EVO_NAMES[ev + 1]}<span class="pr"><i class="coin sm"></i> ${fmt(c)}</span>`; main.className = 'btn gold mid' + (SAVE.coins < c ? ' dis' : ''); main.dataset.act = 'evo'; }
  else { main.innerHTML = '已满级<span class="pr">MAX</span>'; main.className = 'btn mid dis'; main.dataset.act = ''; }
  sel.style.display = own ? '' : 'none';
  sel.innerHTML = SAVE.sel === sh.id ? '出战中 ✓' : '选择出战'; sel.className = 'btn mid ' + (SAVE.sel === sh.id ? 'dis' : 'green');
  const icons = { life: '❤️', bomb: '💣', pow: '🔥' };
  $('#hgUps').innerHTML = UPGRADES.map(u => { const lv = SAVE.up[u.id], max = lv >= u.max, c = u.cost[lv];
    return `<div class="up"><div class="ic">${icons[u.id]}</div><div class="tx"><b>${u.name}</b><span class="pips">${[0, 1].map(k => `<i class="${k < lv ? 'on' : ''}"></i>`).join('')}</span><p>${u.desc}（当前 +${lv}）</p></div>
      <button class="btn sm ${max ? 'dis' : SAVE.coins >= c ? 'gold' : 'dis'}" data-up="${u.id}">${max ? 'MAX' : '<i class="coin sm"></i> ' + fmt(c)}</button></div>`; }).join('');
  $$('#hgUps [data-up]').forEach(b => b.addEventListener('click', () => buyUp(b.dataset.up)));
  updCoins();
}
function buyUp(id) {
  const u = UPGRADES.find(x => x.id === id), lv = SAVE.up[id];
  if (lv >= u.max) { Sound.sfx.deny(); return; }
  if (SAVE.coins < u.cost[lv]) { Sound.sfx.deny(); toast('金币不足'); return; }
  SAVE.coins -= u.cost[lv]; SAVE.up[id]++; writeSave(); Sound.sfx.buy(); toast(`${u.name} 强化成功！`); renderHangar();
}
function hgMainAct() {
  const sh = SHIPS.find(x => x.id === hgShip), st = SAVE.ships[sh.id], act = $('#hgMain').dataset.act;
  if (act === 'buy') {
    if (SAVE.coins < sh.price) { Sound.sfx.deny(); toast('金币不足'); return; }
    SAVE.coins -= sh.price; st.own = true; SAVE.sel = sh.id; writeSave(); Sound.sfx.buy(); toast(`获得新战机：${sh.name}`); renderHangar(true);
  } else if (act === 'evo') {
    const c = sh.evoCost[st.evo + 1];
    if (SAVE.coins < c) { Sound.sfx.deny(); toast('金币不足'); return; }
    SAVE.coins -= c; st.evo++; writeSave(); Sound.sfx.evolve(); toast(`${sh.name} 进化为 ${EVO_NAMES[st.evo]}！`); renderHangar(true);
  } else Sound.sfx.deny();
}
function showEnding() {
  exitToMenu(); show('scrEnd'); Sound.play('ending');
  const tot = Object.values(SAVE.stars).reduce((a, b) => a + b, 0);
  $('#eScore').innerHTML = `HI-SCORE ${String(SAVE.hi).padStart(8, '0')}<br>STARS <span class="sg">★</span> ${tot} / 75`;
}

// ---------- pause ----------
function pause(on_) {
  if (STATE !== 'play' || (G && G.result)) return;
  PAUSED = on_; overlay('scrPause', on_); updToggles();
  if (on_) { Sound.laser(false); KEYS.clear(); drag = null; try{GT.pause()}catch(_e){} }
}

// ---------- back to hub ----------
function goHub(ev) {
  if (ev && ev.stopPropagation) ev.stopPropagation();
  try { writeSave(); } catch (e) {}
  try { Sound.laser(false); } catch (e) {}
  try{GT.hub(ev&&ev.currentTarget&&ev.currentTarget.id)}catch(_e){}
  location.href = '../';
}

// ---------- wiring ----------
on('#btnStart', () => { try{GT.title()}catch(_e){} openMap(); });
on('#btnHangar1', () => openHangar('title'));
on('#btnHangar2', () => openHangar('map'));
on('#mapBack', () => openTitle(), 'back');
on('#hgBack', () => hgFrom === 'map' ? openMap() : openTitle(), 'back');
on('#secPrev', () => mapStep(-1), null); on('#secNext', () => mapStep(1), null);
on('#hgMain', hgMainAct, null);
on('#hgSel', () => { if (SAVE.sel === hgShip) return; SAVE.sel = hgShip; writeSave(); toast('已切换出战战机'); renderHangar(); });
on('#endBack', () => openMap(4));
$$('.tog').forEach(b => on(b, () => { SAVE[b.dataset.k] = !SAVE[b.dataset.k]; writeSave(); updToggles(); try{GT.sound(b.dataset.k,SAVE[b.dataset.k])}catch(_e){} }));
on('#btnPause', () => pause(true));
on('#pResume', () => pause(false));
on('#pRestart', () => { overlay('scrPause', false); startLevel(LV.n); });
on('#btnHub', goHub, 'back');
on('#pHub', goHub, 'back');
on('#endHub', goHub, 'back');
on('#pQuit', () => { try{GT.quit('menu')}catch(_e){} overlay('scrPause', false); Sound.laser(false); openMap(LV.s); });
$('#btnBomb').addEventListener('pointerdown', (e) => { e.stopPropagation(); e.preventDefault(); Sound.unlock(); if (G && G.bombs <= 0) Sound.sfx.deny(); else bomb(); });
$('#btnPause').addEventListener('pointerdown', (e) => e.stopPropagation());
$('#scrTitle').addEventListener('click', () => {
  Sound.unlock();
  if (!titleReady) { titleReady = true; $('#tTap').classList.add('hide'); $('.tMenu').classList.add('on'); Sound.sfx.click(); Sound.play('menu'); }
});

// ---------- touch control: relative drag ----------
let drag = null;
const SENS = 1.25;
cv.addEventListener('pointerdown', (e) => {
  Sound.unlock();
  if (STATE !== 'play' || PAUSED) return;
  e.preventDefault();
  drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
  try { cv.setPointerCapture(e.pointerId); } catch (_) {}
  if (!SAVE.seenTut) { SAVE.seenTut = true; writeSave(); $('#tut').classList.add('hide'); }
});
cv.addEventListener('pointermove', (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  e.preventDefault();
  const k = W / CW * SENS, dx = (e.clientX - drag.x) * k, dy = (e.clientY - drag.y) * k;
  drag.x = e.clientX; drag.y = e.clientY;
  if (STATE === 'play' && !PAUSED && P && P.alive && P.ctrl && !DEBUG.bot) { P.x += dx; P.y += dy; }
});
const endDrag = (e) => { if (drag && e.pointerId === drag.id) drag = null; };
cv.addEventListener('pointerup', endDrag); cv.addEventListener('pointercancel', endDrag);
document.addEventListener('touchmove', (e) => { if (!e.target.closest || !e.target.closest('#scrHangar')) e.preventDefault(); }, { passive: false });
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('contextmenu', (e) => e.preventDefault());
window.addEventListener('keydown', (e) => {
  Sound.unlock();
  const k = e.key.length == 1 ? e.key.toLowerCase() : e.key;
  if (STATE === 'play') {
    if (k === 'x' || k === ' ') { bomb(); e.preventDefault(); return; }
    if (k === 'p' || k === 'Escape') { pause(!PAUSED); return; }
  }
  KEYS.add(k);
  if (k.startsWith('Arrow')) e.preventDefault();
});
window.addEventListener('keyup', (e) => { const k = e.key.length == 1 ? e.key.toLowerCase() : e.key; KEYS.delete(k); });
window.addEventListener('blur', () => { KEYS.clear(); if (STATE === 'play' && !PAUSED) pause(true); });
document.addEventListener('visibilitychange', () => { if (document.hidden && STATE === 'play' && !PAUSED) pause(true); });

// ---------- main loop ----------
let lastT = 0;
function loop(now) {
  requestAnimationFrame(loop);
  let dt = (now - lastT) / 1000; lastT = now;
  if (!(dt > 0)) return;
  if (dt > 0.05) dt = 0.05;
  FPS = lerp(FPS, 1 / dt, 0.05);
  if (STATE === 'play' && !PAUSED) {
    if (hitStop > 0) hitStop -= dt;
    else {
      // fixed-ish substeps for stability at low fps
      const n = dt > 0.026 ? 2 : 1;
      for (let i = 0; i < n; i++) { update(dt / n); if (STATE !== 'play') break; }
    }
    shake = Math.max(0, shake - dt * 45); flash = Math.max(0, flash - dt * 2.4);
  }
  if (STATE === 'loading') return;
  try { render(dt); } catch (err) { console.error(err); }
}

// ---------- boot ----------
(function boot() {
  resize(); loadSave(); updToggles();
  window.addEventListener('resize', () => { resize(); });
  loadAssets((p) => { $('#ldFill').style.width = (p * 100 | 0) + '%'; $('#ldTxt').textContent = '加载中 ' + (p * 100 | 0) + '%'; }).then(() => {
    buildFX();
    STATE = 'menu';
    requestAnimationFrame((t) => { lastT = t; loop(t); });
    if (DEBUG.level) { startLevel(DEBUG.level); return; }
    const h = location.hash.slice(1);
    if (h === 'hangar') { titleReady = true; openHangar('title'); }
    else if (h === 'map') { titleReady = true; openMap(); }
    else openTitle();
  });
})();
