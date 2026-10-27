/* 一笔绘山海 · 音频（Web Audio 实时合成，无外部音频素材）
   每画一段山径弹一声古筝（D 宫五声音阶，随笔数升高）；云桥是风铃，溪流是水滴；BGM 为箫 + 古筝分解 + 低音磬。 */
const SND = (() => {
  const A = KIT.audio({ music: .38, sfx: .95, verb: .34 });
  const PENTA = [0, 2, 4, 7, 9];
  const note = i => 62 + PENTA[((i % 5) + 5) % 5] + 12 * Math.floor(i / 5); // D4 起
  // 古筝：锯齿 + 低通快速收拢 + 按音滑落，外加泛音
  function zheng(m, t, v = 1, dur = 1.4, bend = true) {
    const f = A.mtof(m);
    A.osc('sawtooth', f * (bend ? 1.012 : 1), t, dur, .09 * v, A.sfxBus, { to: f, tt: .08, lp: f * 7, lpTo: f * 1.6, q: 2, send: .55 });
    A.osc('triangle', f, t, dur * 1.1, .12 * v, A.sfxBus, { send: .4 });
    A.osc('sine', f * 2, t, dur * .5, .05 * v, A.sfxBus);
    A.noise(t, .03, .05 * v, A.sfxBus, 'highpass', 4000, .7);
  }
  function mzheng(m, t, v = 1, dur = 1.2) { const f = A.mtof(m); A.osc('sawtooth', f, t, dur, .045 * v, A.musicBus, { lp: f * 5, lpTo: f * 1.4, q: 1.5, send: .5 }); A.osc('triangle', f, t, dur, .07 * v, A.musicBus, { send: .3 }); }
  function xiao(m, t, dur, v = 1) { const f = A.mtof(m); A.osc('sine', f, t, dur, .085 * v, A.musicBus, { a: .12, vib: 5, vd: .008, vdl: .25, send: .7 }); A.osc('triangle', f * 2, t, dur, .012 * v, A.musicBus, { a: .15 }); A.noise(t, dur * .8, .012 * v, A.musicBus, 'bandpass', f * 2, 6, { a: .1 }); }
  function qing(m, t, v = 1) { const f = A.mtof(m); [1, 2.76, 5.4].forEach((k, i) => A.osc('sine', f * k, t, 2.6 / (i + 1), .07 * v / (i + 1), A.musicBus, { send: .6 })); }
  /* BGM：72 BPM，D 宫，四小节循环两段 */
  const BPM = 72, S8 = 60 / BPM / 2;
  const PROG = [50, 47, 43, 45, 50, 55, 45, 50]; // 低音根音
  const MEL = [[[0, 74, 3], [3, 76, 1], [4, 78, 4]], [[0, 81, 3], [3, 78, 1], [4, 76, 4]], [[0, 74, 2], [2, 71, 2], [4, 69, 4]], [[0, 71, 3], [3, 74, 1], [4, 76, 4]],
    [[0, 78, 2], [2, 81, 2], [4, 83, 4]], [[0, 81, 3], [3, 78, 1], [4, 76, 4]], [[0, 74, 3], [3, 71, 1], [4, 69, 4]], [[0, 74, 8]]];
  let playing = false, timer = null, nextT = 0, step = 0;
  function sched(s, t) {
    const bar = Math.floor(s / 8) % 8, st = s % 8, r = PROG[bar];
    if (st === 0) { A.osc('sine', A.mtof(r - 12), t, S8 * 7, .16, A.musicBus, { a: .05 }); if (bar % 4 === 0) qing(r + 24, t, .6); }
    const arp = [r, r + 7, r + 12, r + 16, r + 19, r + 16, r + 12, r + 7]; mzheng(arp[st] + 12, t, st % 2 ? .55 : .8, 1);
    const loop = Math.floor(s / 64);
    if (loop > 0 || bar >= 2) for (const [p, m, l] of MEL[bar]) if (p === st) xiao(m + (loop % 2 ? 12 : 0) * 0, t, l * S8 * 1.05, loop % 2 ? .7 : .9);
  }
  function tick() { const ac = A.ac(); if (!playing || !ac) return; while (nextT < ac.currentTime + .2) { sched(step, nextT); nextT += S8; step++; } }
  const fx = {
    click() { const t = A.now(); A.osc('sine', 1046, t, .08, .16, A.sfxBus, { to: 1568 }); },
    start() { const t = A.now(); zheng(62, t, .9); A.noise(t, .25, .05, A.sfxBus, 'bandpass', 900, .8, { to: 300 }); },
    step(i, kind) {
      const t = A.now(), m = note(Math.min(i, 17));
      zheng(m, t, 1);
      if (kind === 'cloud') { [0, .06, .12].forEach((d, k) => A.osc('sine', A.mtof(m + 24 + PENTA[k + 1]), t + d, .7, .05, A.sfxBus, { send: .8 })); }
      if (kind === 'stream') { for (let k = 0; k < 3; k++) A.osc('sine', 700 + k * 260, t + k * .05, .09, .07, A.sfxBus, { to: 1500 + k * 300, tt: .07 }); }
      if (kind === 'beast') { A.osc('sine', 110, t, .6, .18, A.sfxBus, { to: 70 }); }
    },
    back() { const t = A.now(); A.osc('triangle', 520, t, .18, .1, A.sfxBus, { to: 300 }); A.noise(t, .12, .04, A.sfxBus, 'lowpass', 1200, .5); },
    bump() { const t = A.now(); A.osc('square', 150, t, .08, .07, A.sfxBus, { lp: 600 }); A.osc('sine', 95, t, .12, .2, A.sfxBus); },
    stuck() { const t = A.now(); [62, 61, 57].forEach((m, k) => zheng(m - 12, t + k * .14, .7, 1, false)); A.osc('sine', 80, t, .7, .2, A.sfxBus, { to: 55 }); },
    hint() { const t = A.now(); [86, 90, 93].forEach((m, k) => A.osc('sine', A.mtof(m), t + k * .07, .9, .07, A.sfxBus, { send: .9 })); },
    win() { const t = A.now(); for (let i = 0; i < 12; i++) zheng(note(i), t + i * .055, .75, 1.6); qing(62, t + .75, 1.2); qing(74, t + .9, .8); },
    wake() { const t = A.now(); A.noise(t, .9, .12, A.sfxBus, 'bandpass', 300, .7, { to: 900 }); A.osc('sawtooth', 98, t, .8, .06, A.sfxBus, { lp: 500, to: 147 }); [81, 86, 90].forEach((m, k) => A.osc('sine', A.mtof(m), t + .35 + k * .09, 1.1, .06, A.sfxBus, { send: 1 })); },
    star(i) { const t = A.now(); A.osc('triangle', A.mtof(79 + i * 5), t, .5, .12, A.sfxBus, { send: .6 }); A.osc('sine', A.mtof(91 + i * 5), t, .3, .05, A.sfxBus); },
  };
  return {
    unlock: A.unlock, play(k, ...a) { try { if (!A.ac()) A.init(); if (fx[k]) fx[k](...a); } catch (e) { } },
    startMusic() { A.init(); if (!A.ac() || playing) return; playing = true; nextT = A.now() + .1; step = 0; timer = setInterval(tick, 50); },
    stopMusic() { playing = false; clearInterval(timer); },
    setMusic: on => A.setMusic(on), setSfx: on => A.setSfx(on), A,
  };
})();
