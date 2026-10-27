/* ===== 快挪车！· 音频引擎（WebAudio 实时合成，无外部音频素材） ===== */
const SND = (() => {
  let ac = null, master, musicBus, sfxBus, comp, verb, verbIn, noiseBuf;
  let musicOn = true, sfxOn = true, playing = false, timer = null, nextT = 0, step = 0, loop = 0;
  const BPM = 116, S16 = 60 / BPM / 4;
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  function init() {
    if (ac) return;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ac = new AC();
    comp = ac.createDynamicsCompressor(); comp.threshold.value = -12; comp.ratio.value = 4; comp.attack.value = .003; comp.release.value = .18;
    master = ac.createGain(); master.gain.value = .9; master.connect(comp); comp.connect(ac.destination);
    musicBus = ac.createGain(); musicBus.gain.value = musicOn ? .4 : 0; musicBus.connect(master);
    sfxBus = ac.createGain(); sfxBus.gain.value = sfxOn ? .95 : 0; sfxBus.connect(master);
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 1.5, ac.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    // 简易混响（slapback + 短尾）
    verbIn = ac.createGain(); verbIn.gain.value = .25;
    const dl = ac.createDelay(1); dl.delayTime.value = S16 * 3; const fb = ac.createGain(); fb.gain.value = .3; const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400;
    verbIn.connect(dl); dl.connect(lp); lp.connect(fb); fb.connect(dl); lp.connect(musicBus);
  }
  function unlock() {
    init(); if (!ac) return;
    if (ac.state === 'suspended') ac.resume();
    const b = ac.createBuffer(1, 1, 22050), s = ac.createBufferSource(); s.buffer = b; s.connect(ac.destination); s.start(0);
  }
  const now = () => ac.currentTime;
  function env(g, t, a, peak, dcy) { g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(.0001, t + a + dcy); }
  function osc(type, f, t, dur, vol, dest, o = {}) {
    const n = ac.createOscillator(), g = ac.createGain(); n.type = type; n.frequency.setValueAtTime(f, t);
    if (o.to) n.frequency.exponentialRampToValueAtTime(o.to, t + (o.tt || dur));
    if (o.det) n.detune.value = o.det;
    env(g, t, o.a || .004, vol, dur); let src = n;
    if (o.lp) { const f2 = ac.createBiquadFilter(); f2.type = o.ft || 'lowpass'; f2.frequency.setValueAtTime(o.lp, t); if (o.lpTo) f2.frequency.exponentialRampToValueAtTime(o.lpTo, t + dur); f2.Q.value = o.q || 1; n.connect(f2); src = f2; }
    if (o.vib) { const l = ac.createOscillator(), lg = ac.createGain(); l.frequency.value = o.vib; lg.gain.value = f * .012; l.connect(lg); lg.connect(n.frequency); l.start(t + .08); l.stop(t + dur + .1); }
    src.connect(g); g.connect(dest); if (o.send) g.connect(verbIn); n.start(t); n.stop(t + dur + .06); return n;
  }
  function noise(t, dur, vol, dest, type = 'bandpass', f = 3000, q = 1, o = {}) {
    const s = ac.createBufferSource(); s.buffer = noiseBuf; const fl = ac.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, t); fl.Q.value = q;
    if (o.to) fl.frequency.exponentialRampToValueAtTime(o.to, t + dur);
    const g = ac.createGain(); env(g, t, o.a || .002, vol, dur); s.connect(fl); fl.connect(g); g.connect(dest); s.start(t, Math.random() * .8); s.stop(t + dur + .05);
  }
  /* ---------- BGM：《早高峰小调》 G 大调 · 轻快尤克里里 + 口哨 + 喇叭彩蛋 ---------- */
  const CH = { G: [55, 59, 62], D: [50, 54, 57], Em: [52, 55, 59], C: [48, 52, 55], Am: [45, 48, 52], Bm: [47, 50, 54] };
  const PROG = ['G', 'D', 'Em', 'C', 'G', 'D', 'C', 'D', 'Em', 'C', 'G', 'D', 'Am', 'C', 'D', 'D'];
  // [16分位置, midi, 长度]
  const MEL = [
    [[0, 74, 2], [2, 76, 2], [4, 79, 3], [7, 76, 1], [8, 74, 2], [10, 71, 2], [12, 74, 4]],
    [[0, 73, 2], [2, 74, 2], [4, 76, 2], [6, 78, 2], [8, 81, 3], [11, 78, 1], [12, 76, 4]],
    [[0, 79, 2], [2, 78, 2], [4, 76, 2], [6, 74, 2], [8, 71, 3], [11, 74, 1], [12, 76, 4]],
    [[0, 72, 2], [2, 74, 2], [4, 76, 2], [6, 79, 2], [8, 76, 6]],
    [[0, 74, 2], [2, 76, 2], [4, 79, 3], [7, 76, 1], [8, 79, 2], [10, 83, 2], [12, 81, 4]],
    [[0, 78, 2], [2, 76, 2], [4, 74, 2], [6, 76, 2], [8, 78, 3], [11, 81, 1], [12, 78, 4]],
    [[0, 76, 3], [3, 74, 1], [4, 72, 2], [6, 76, 2], [8, 79, 4], [12, 76, 2], [14, 74, 2]],
    [[0, 74, 6], [8, 69, 2], [10, 71, 2], [12, 74, 4]],
    [[0, 83, 2], [2, 81, 2], [4, 79, 2], [6, 76, 2], [8, 79, 4], [12, 83, 4]],
    [[0, 84, 3], [3, 83, 1], [4, 81, 2], [6, 79, 2], [8, 76, 4], [12, 79, 4]],
    [[0, 79, 2], [2, 81, 2], [4, 83, 2], [6, 86, 2], [8, 83, 3], [11, 81, 1], [12, 79, 4]],
    [[0, 81, 2], [2, 79, 2], [4, 78, 2], [6, 79, 2], [8, 81, 6]],
    [[0, 81, 3], [3, 79, 1], [4, 76, 2], [6, 72, 2], [8, 76, 4], [12, 81, 4]],
    [[0, 79, 3], [3, 76, 1], [4, 72, 2], [6, 76, 2], [8, 79, 4], [12, 84, 4]],
    [[0, 81, 2], [2, 83, 2], [4, 81, 2], [6, 78, 2], [8, 74, 4], [12, 78, 4]],
    [[0, 79, 4], [4, 81, 2], [6, 78, 2], [8, 79, 8]]
  ];
  function uke(m, t, v = 1) { // 尤克里里拨弦
    const f = mtof(m);
    osc('triangle', f, t, .32, .09 * v, musicBus, { lp: 3800, lpTo: 900, q: 2 });
    osc('square', f, t, .06, .02 * v, musicBus, { lp: 2500 });
  }
  function strum(ch, t, v = 1, up = false) {
    const ns = CH[ch].map(n => n + 12).concat([CH[ch][0] + 24]); if (up) ns.reverse();
    ns.forEach((n, i) => uke(n, t + i * .012, v));
  }
  function whistle(m, t, dur, v = 1) { // 口哨主旋律
    const f = mtof(m);
    const n = osc('sine', f * 1.03, t, dur + .12, .17 * v, musicBus, { a: .025, vib: 5.5, send: true });
    n.frequency.exponentialRampToValueAtTime(f, t + .05);
    osc('sine', f * 2, t, dur * .7, .018 * v, musicBus, { a: .03 });
  }
  function glock(m, t, v = 1) { osc('sine', mtof(m), t, .5, .07 * v, musicBus, { send: true }); osc('sine', mtof(m) * 4.02, t, .08, .02 * v, musicBus); }
  function bass(m, t, dur) { osc('triangle', mtof(m), t, dur, .38, musicBus, { lp: 700, lpTo: 260 }); osc('sine', mtof(m), t, dur * .9, .2, musicBus); }
  function kick(t) { osc('sine', 140, t, .2, .7, musicBus, { to: 45, tt: .12 }); }
  function snare(t) { noise(t, .14, .26, musicBus, 'bandpass', 1900, .8); noise(t, .05, .12, musicBus, 'highpass', 6000); osc('triangle', 200, t, .06, .14, musicBus, { to: 130 }); }
  function clap(t) { for (let i = 0; i < 3; i++) noise(t + i * .011, .07 + (i === 2 ? .08 : 0), .18, musicBus, 'bandpass', 1400, 1.4); }
  function shaker(t, acc) { noise(t, .045, acc ? .07 : .04, musicBus, 'highpass', 7500, .7); }
  function toot(t) { // 音乐里的“嘀嘀”汽车喇叭彩蛋（调内 D+F#）
    for (const [dt, m] of [[0, 62], [S16 * 2, 62]]) { osc('square', mtof(m), t + dt, .09, .045, musicBus, { lp: 1800 }); osc('square', mtof(m + 4), t + dt, .09, .035, musicBus, { lp: 1800 }); }
  }
  function sched(s, t) {
    const bar = Math.floor(s / 16) % 16, st = s % 16, ch = PROG[bar], intro = loop === 0 && bar < 1;
    if (!intro) {
      if (st === 0 || st === 8 || (st === 10 && bar % 4 === 3)) kick(t);
      if (st === 4 || st === 12) { snare(t); if (bar >= 8) clap(t); }
      if (st % 2 === 0) shaker(t, st % 4 === 2); else if (bar >= 8) shaker(t, false);
    }
    const r = CH[ch][0] - 12; const bp = { 0: r, 6: r + 7, 8: r + 12, 10: r + 7, 14: r + 2 };
    if (!intro && bp[st] !== undefined) bass(bp[st], t, S16 * 1.7);
    if (st === 0 || st === 6 || st === 8 || st === 12 || st === 14) strum(ch, t, st === 0 ? 1 : .75, st === 6 || st === 14);
    if (!intro) for (const [p, m, l] of MEL[bar]) if (p === st) { whistle(m, t, l * S16 * .95, loop % 2 ? .85 : 1); if (loop % 2) glock(m + 12, t, .55); }
    if (bar === 7 && st === 12) toot(t);
    if (bar === 15 && st === 8) toot(t);
  }
  function tick() {
    if (!playing) return;
    while (nextT < now() + .15) { sched(step, nextT); nextT += S16; step++; if (step % 256 === 0) loop++; }
  }
  function startMusic() { init(); if (!ac || playing) return; playing = true; nextT = now() + .08; step = 0; loop = 0; timer = setInterval(tick, 40); }
  function stopMusic() { playing = false; clearInterval(timer); timer = null; }
  function setMusic(on) { musicOn = on; if (musicBus) musicBus.gain.setTargetAtTime(on ? .4 : 0, now(), .05); }
  function setSfx(on) { sfxOn = on; if (sfxBus) sfxBus.gain.setTargetAtTime(on ? .95 : 0, now(), .03); }
  /* ---------- 音效 ---------- */
  const B = () => sfxBus;
  const fx = {
    click() { const t = now(); osc('sine', 880, t, .06, .25, B(), { to: 1320 }); osc('triangle', 1760, t, .03, .08, B()); },
    pop() { const t = now(); osc('sine', 520, t, .1, .3, B(), { to: 1100, tt: .06 }); },
    honk(p = 1) { // 嘀——卡通喇叭
      const t = now(); const f1 = 392 * p, f2 = 494 * p;
      for (const f of [f1, f2]) { osc('square', f, t, .16, .07, B(), { lp: 2200, a: .01 }); osc('sawtooth', f, t, .16, .04, B(), { lp: 1500, a: .01 }); }
    },
    honk2(p = 1) { const t = now(); for (const dt of [0, .17]) for (const f of [415 * p, 523 * p]) osc('square', f, t + dt, .12, .065, B(), { lp: 2400, a: .008 }); },
    go(len = 2) { // 起步：引擎轰 + 轮胎吱 + 呼啸
      const t = now(); const base = len === 3 ? 55 : len === 1 ? 110 : 75;
      osc('sawtooth', base, t, .45, .2, B(), { to: base * 3.2, tt: .35, lp: 600, lpTo: 2200 });
      osc('square', base * .5, t, .3, .1, B(), { to: base * 1.6, lp: 400 });
      noise(t, .28, .16, B(), 'bandpass', 3200, 9, { to: 2400 });
      noise(t + .12, .4, .2, B(), 'bandpass', 900, 1.2, { to: 2600, a: .08 });
    },
    bump() { // 撞车：闷响 + 金属
      const t = now();
      osc('sine', 150, t, .25, .8, B(), { to: 45, tt: .2 });
      noise(t, .18, .5, B(), 'lowpass', 1400, .7);
      osc('square', 1180, t, .07, .07, B(), { lp: 4000 }); osc('square', 1567, t + .01, .09, .05, B(), { lp: 4000 });
      noise(t + .02, .25, .12, B(), 'bandpass', 5200, 3);
    },
    angry() { const t = now() + .08; for (const f of [233, 277]) { osc('square', f, t, .42, .07, B(), { lp: 1600, a: .01 }); osc('sawtooth', f * 1.005, t, .42, .04, B(), { lp: 1200 }); } },
    ticket() { const t = now(); noise(t, .06, .4, B(), 'lowpass', 900, 1); osc('sine', 90, t, .12, .5, B(), { to: 50 }); noise(t + .07, .18, .1, B(), 'highpass', 3500, .6, { a: .05 }); },
    combo(n) { const t = now(); const sc = [72, 74, 76, 79, 81, 84, 86, 88, 91]; const b = sc[Math.min(sc.length - 1, n - 2)]; [0, 4, 7].forEach((iv, i) => osc('triangle', mtof(b + iv), t + i * .05, .22, .14, B(), { send: false })); osc('sine', mtof(b + 12), t + .15, .3, .08, B()); },
    exit() { const t = now(); noise(t, .35, .12, B(), 'bandpass', 600, 1, { to: 3000, a: .05 }); },
    locked() { const t = now(); osc('square', 180, t, .08, .12, B(), { lp: 900 }); osc('square', 140, t + .09, .1, .12, B(), { lp: 900 }); },
    unlock() { const t = now(); osc('square', 900, t, .04, .1, B(), { lp: 3000 }); noise(t, .05, .2, B(), 'bandpass', 4000, 3); [76, 83, 88].forEach((m, i) => osc('sine', mtof(m), t + .08 + i * .06, .25, .14, B())); },
    tow() { const t = now(); for (let i = 0; i < 9; i++) noise(t + i * .045, .02, .2, B(), 'bandpass', 2500 + i * 120, 4); osc('sawtooth', 90, t + .35, .5, .12, B(), { to: 260, lp: 800 }); noise(t + .4, .5, .14, B(), 'bandpass', 700, 1, { to: 2800, a: .1 }); },
    shuffle() { const t = now(); noise(t, .6, .2, B(), 'bandpass', 500, 2, { to: 4000, a: .1 }); for (let i = 0; i < 8; i++) osc('sine', mtof(76 + (i % 4) * 3 + Math.floor(i / 4) * 12), t + .05 + i * .06, .18, .07, B()); },
    flip() { const t = now(); noise(t, .35, .22, B(), 'bandpass', 2800, 10, { to: 3600 }); osc('sawtooth', 80, t, .3, .12, B(), { to: 160, lp: 600 }); },
    hint() { const t = now(); [84, 88, 91, 96].forEach((m, i) => osc('sine', mtof(m), t + i * .07, .3, .1, B())); },
    coin() { const t = now(); osc('square', 988, t, .07, .08, B(), { lp: 5000 }); osc('square', 1319, t + .07, .25, .08, B(), { lp: 5000 }); },
    star(i) { const t = now(); const m = [79, 84, 88][i] || 88; osc('triangle', mtof(m), t, .35, .2, B()); osc('sine', mtof(m + 12), t, .4, .08, B()); noise(t, .2, .06, B(), 'highpass', 7000); },
    win() { const t = now(); const seq = [[0, 67], [.11, 72], [.22, 76], [.33, 79], [.5, 84]]; for (const [dt, m] of seq) { osc('square', mtof(m), t + dt, .2, .07, B(), { lp: 3000 }); osc('triangle', mtof(m), t + dt, .3, .16, B()); }
      [60, 64, 67, 72].forEach(m => osc('triangle', mtof(m), t + .5, .9, .1, B())); for (const dt of [.95, 1.12]) for (const f of [523, 659]) osc('square', f, t + dt, .12, .05, B(), { lp: 2500 }); },
    fail() { const t = now(); [[0, 67], [.28, 66], [.56, 65], [.84, 64]].forEach(([dt, m], i) => osc('sawtooth', mtof(m - 12), t + dt, i === 3 ? .8 : .26, .12, B(), { lp: 1100, vib: i === 3 ? 6 : 0 })); },
    whistle() { const t = now(); const n = osc('sine', 2200, t, .35, .16, B(), { vib: 28 }); n.frequency.setValueAtTime(2200, t); n.frequency.linearRampToValueAtTime(2600, t + .1); },
  };
  function play(name, ...a) { if (!ac || !sfxOn) return; try { fx[name] && fx[name](...a); } catch (e) { } }
  return { unlock, startMusic, stopMusic, setMusic, setSfx, play, get ctx() { return ac; }, get playing() { return playing; } };
})();
