'use strict';
/* 游戏屋新游戏模板：复制整个 _template/ 目录，改 GAME_ID、关卡数据和 draw()/onTap()。
   依赖 common/kit.js（存档、最近玩过、返回游戏屋、选关网格、星级、Web Audio）。 */
const GAME_ID = 'mygame';            // 同时加入 track.js 与服务器 collect.php 的 GAMES 白名单
const LEVELS = Array.from({ length: 30 }, (_, i) => ({ target: 3 + i }));
const $ = id => document.getElementById(id);
const S = KIT.load(GAME_ID + '_save_v1', { unlocked: 1, stars: [], sfx: true });
const save = () => KIT.save(GAME_ID + '_save_v1', S);
const A = KIT.audio({ sfx: .9 });
function beep(f, d) { const ac = A.init(); if (!ac || !S.sfx) return; const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = f; g.gain.setValueAtTime(.2, ac.currentTime); g.gain.exponentialRampToValueAtTime(.001, ac.currentTime + d); o.connect(g); g.connect(A.sfxBus); o.start(); o.stop(ac.currentTime + d); }

const cv = $('cv'), ctx = cv.getContext('2d'); let W = 0, H = 0;
function resize() { const r = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = W * r; cv.height = H * r; ctx.setTransform(r, 0, 0, r, 0, 0); }
addEventListener('resize', resize); resize();

const G = { idx: 0, score: 0, t: 0, state: 'menu' };
function start(i) { G.idx = i; G.score = 0; G.t = 0; G.state = 'play'; KIT.hideAll(); try { KIT.gt().lv(i + 1); } catch (e) { } }
function win() {
  G.state = 'win'; const st = G.t < 10 ? 3 : G.t < 20 ? 2 : 1;
  S.stars[G.idx] = Math.max(S.stars[G.idx] || 0, st); S.unlocked = Math.max(S.unlocked, G.idx + 2); save();
  try { KIT.gt().win(G.idx + 1, { stars: st }); } catch (e) { }
  $('wInfo').textContent = `用时 ${G.t.toFixed(1)} 秒`; KIT.show('win'); KIT.stars('wStars', st); beep(880, .4); KIT.vib([20, 40, 20]);
}
cv.addEventListener('pointerdown', () => { if (G.state !== 'play') return; G.score++; beep(440 + G.score * 40, .12); if (G.score >= LEVELS[G.idx].target) win(); });

let last = 0;
function frame(t) {
  const dt = Math.min(.05, (t - last) / 1000 || 0); last = t; if (G.state === 'play') G.t += dt;
  ctx.clearRect(0, 0, W, H);
  if (G.state === 'play') { ctx.fillStyle = '#fff'; ctx.font = '900 28px system-ui'; ctx.textAlign = 'center'; ctx.fillText(`第 ${G.idx + 1} 关：点击 ${G.score}/${LEVELS[G.idx].target}`, W / 2, H / 2); }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

function showLevels() {
  KIT.levelGrid('lvList', { count: LEVELS.length, unlocked: i => i < S.unlocked, stars: i => S.stars[i] || 0, current: S.unlocked - 1, onPick: start, onLocked: () => KIT.toast('先通过前一关') });
  KIT.show('levels');
}
$('bPlay').onclick = () => { A.init(); start(Math.min(S.unlocked, LEVELS.length) - 1); };
$('bLevels').onclick = showLevels; $('lvBack').onclick = () => KIT.show('menu');
$('wNext').onclick = () => G.idx + 1 < LEVELS.length ? start(G.idx + 1) : KIT.show('menu');
$('tSnd').onclick = () => { S.sfx = !S.sfx; $('tSnd').classList.toggle('off', !S.sfx); save(); };
$('tSnd').classList.toggle('off', !S.sfx);
KIT.init({ game: GAME_ID, save, hubButtons: ['mHub', 'wHub'] });
try { KIT.gt().title(); } catch (e) { }
