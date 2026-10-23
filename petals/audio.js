/* ===== 花瓣消消· 原创音频引擎（WebAudio 实时合成，无外部音频素材） ===== */
const SND = (() => {
  let ac = null, master, musicBus, sfxBus, comp, verb, verbIn, noiseBuf;
  let musicOn = true, sfxOn = true, playing = false, timer = null, nextT = 0, step = 0, loop = 0;
  const BPM = 132, S16 = 60 / BPM / 2; // 3/4 圆舞曲，每步一个八分音符
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
  /* ---------- BGM：《花园圆舞曲》 F 大调 3/4 · 马林巴 + 拨弦 + 长笛 + 鸟鸣彩蛋 ---------- */
  const CH = { F: [53, 57, 60], C: [48, 52, 55], Dm: [50, 53, 57], Bb: [46, 50, 53], Am: [45, 48, 52], Gm: [43, 46, 50], C7: [48, 52, 58] };
  const PROG = ['F', 'C', 'Dm', 'Bb', 'F', 'C', 'Bb', 'C', 'Dm', 'Am', 'Bb', 'F', 'Gm', 'C', 'F', 'C7'];
  const MEL = [
    [[0, 72, 2], [2, 77, 2], [4, 76, 1], [5, 74, 1]], [[0, 72, 4], [4, 67, 2]], [[0, 69, 2], [2, 74, 2], [4, 72, 1], [5, 70, 1]], [[0, 69, 4], [4, 65, 2]],
    [[0, 72, 2], [2, 77, 2], [4, 81, 2]], [[0, 79, 3], [3, 77, 1], [4, 76, 2]], [[0, 74, 2], [2, 77, 2], [4, 74, 1], [5, 72, 1]], [[0, 72, 6]],
    [[0, 81, 2], [2, 79, 1], [3, 77, 1], [4, 74, 2]], [[0, 76, 4], [4, 72, 2]], [[0, 74, 2], [2, 77, 2], [4, 82, 2]], [[0, 81, 4], [4, 77, 2]],
    [[0, 79, 2], [2, 77, 2], [4, 74, 2]], [[0, 76, 2], [2, 79, 2], [4, 82, 2]], [[0, 81, 2], [2, 79, 1], [3, 76, 1], [4, 77, 2]], [[0, 77, 6]]];
  function marimba(m, t, v = 1) { const f = mtof(m); osc('sine', f, t, .38, .11 * v, musicBus, { a: .002 }); osc('sine', f * 3.98, t, .05, .035 * v, musicBus, { a: .001 }); osc('triangle', f * 2, t, .1, .02 * v, musicBus); }
  function pizz(m, t, v = 1) { osc('triangle', mtof(m), t, .28, .3 * v, musicBus, { lp: 1200, lpTo: 300, a: .003 }); osc('sine', mtof(m), t, .35, .16 * v, musicBus); }
  function flute(m, t, dur, v = 1) {
    const f = mtof(m);
    osc('sine', f, t, dur + .1, .15 * v, musicBus, { a: .05, vib: 5, send: true });
    osc('sine', f * 2, t, dur * .8, .015 * v, musicBus, { a: .06 });
    noise(t, Math.min(.12, dur), .02 * v, musicBus, 'bandpass', f * 2, 2, { a: .02 });
  }
  function celesta(m, t, v = 1) { osc('sine', mtof(m), t, .6, .05 * v, musicBus, { send: true }); osc('sine', mtof(m) * 4, t, .09, .012 * v, musicBus); }
  function shaker(t, acc) { noise(t, .04, acc ? .05 : .025, musicBus, 'highpass', 8000, .7); }
  function bird(t) { for (let i = 0; i < 3; i++) { const n = osc('sine', 2600, t + i * .09, .07, .05, musicBus); n.frequency.setValueAtTime(2300, t + i * .09); n.frequency.exponentialRampToValueAtTime(3600, t + i * .09 + .05); } }
  function sched(s, t) {
    const bar = Math.floor(s / 6) % 16, st = s % 6, ch = CH[PROG[bar]], intro = loop === 0 && bar < 1;
    if (st === 0) pizz(ch[0] - 12, t); if (st === 3 && bar % 2 === 1) pizz(ch[2] - 12, t, .6);
    if (st === 2 || st === 4) ch.forEach((n, i) => marimba(n + 12, t + i * .008, .55));
    if (!intro) shaker(t, st === 0);
    if (!intro) for (const [p, m, l] of MEL[bar]) if (p === st) { flute(m, t, l * S16 * .92, loop % 2 ? .85 : 1); if (loop % 2) marimba(m + 12, t, .35); }
    if (loop % 2 === 1 && st % 2 === 1) celesta(ch[(st >> 1) % 3] + 24, t, .7);
    if ((bar === 3 || bar === 11) && st === 4) bird(t);
  }
  function tick() {
    if (!playing) return;
    while (nextT < now() + .15) { sched(step, nextT); nextT += S16; step++; if (step % 96 === 0) loop++; }
  }
  function startMusic() { init(); if (!ac || playing) return; playing = true; nextT = now() + .08; step = 0; loop = 0; timer = setInterval(tick, 40); }
  function stopMusic() { playing = false; clearInterval(timer); timer = null; }
  function setMusic(on) { musicOn = on; if (musicBus) musicBus.gain.setTargetAtTime(on ? .4 : 0, now(), .05); }
  function setSfx(on) { sfxOn = on; if (sfxBus) sfxBus.gain.setTargetAtTime(on ? .95 : 0, now(), .03); }
  /* ---------- 音效 ---------- */
  const B = () => sfxBus;
  const PENTA = [72, 74, 76, 79, 81, 84, 86, 88, 91, 93, 96];
  let lastTink = 0;
  const fx = {
    click() { const t = now(); osc('sine', 880, t, .06, .22, B(), { to: 1320 }); osc('triangle', 1760, t, .03, .07, B()); },
    tap() { const t = now(); osc('sine', 660, t, .07, .3, B(), { to: 990, tt: .04 }); noise(t, .03, .12, B(), 'bandpass', 2500, 2); },
    place() { const t = now(); noise(t, .2, .12, B(), 'bandpass', 900, 1.5, { to: 3200, a: .03 }); osc('sine', 440, t + .16, .12, .28, B(), { to: 880, tt: .05 }); osc('triangle', 1320, t + .18, .06, .06, B()); },
    tink(frac) { // 收集花瓣：五声音阶叮叮，随装满程度上行
      const t = now(); if (t - lastTink < .065) return; lastTink = t;
      const m = PENTA[Math.min(PENTA.length - 1, Math.floor(frac * 8) + ((Math.random() * 3) | 0))];
      osc('sine', mtof(m), t, .16, .07, B(), { a: .002 }); osc('sine', mtof(m) * 2.76, t, .04, .02, B());
    },
    full(tier = 1) { const t = now(); const b = 76 + tier * 2; [0, 4, 7, 12].forEach((iv, i) => { osc('triangle', mtof(b + iv), t + i * .045, .3, .13, B()); osc('sine', mtof(b + iv + 12), t + i * .045, .4, .05, B(), { send: true }); }); noise(t + .1, .4, .05, B(), 'highpass', 7000, .7, { a: .05 }); },
    merge() { const t = now(); [65, 69, 72, 77, 81, 84, 89].forEach((m, i) => osc('triangle', mtof(m), t + i * .04, .22, .11, B())); noise(t, .5, .1, B(), 'bandpass', 1500, 2, { to: 7000, a: .1 }); osc('sine', mtof(89), t + .3, .6, .08, B(), { vib: 7 }); },
    reveal() { const t = now(); osc('sine', 500, t, .14, .25, B(), { to: 1400, tt: .1 }); [84, 88, 91].forEach((m, i) => osc('sine', mtof(m), t + .08 + i * .05, .2, .07, B())); },
    thaw() { const t = now(); for (let i = 0; i < 5; i++) noise(t + i * .03, .04, .22, B(), 'highpass', 4000 + i * 600, 2); osc('sine', 1800, t + .1, .3, .06, B(), { to: 2600 }); },
    snip() { const t = now(); for (const dt of [0, .12]) { noise(t + dt, .05, .35, B(), 'bandpass', 5000, 4); osc('square', 1200, t + dt, .03, .06, B(), { lp: 4000 }); } [79, 86].forEach((m, i) => osc('sine', mtof(m), t + .25 + i * .07, .25, .1, B())); },
    bee() { const t = now(); const n = osc('sawtooth', 190, t, .9, .07, B(), { lp: 1400, a: .05 }); const l = ac.createOscillator(), lg = ac.createGain(); l.frequency.value = 22; lg.gain.value = 18; l.connect(lg); lg.connect(n.frequency); l.start(t); l.stop(t + 1); n.frequency.linearRampToValueAtTime(260, t + .5); [84, 88, 91, 96].forEach((m, i) => osc('sine', mtof(m), t + .55 + i * .06, .25, .08, B())); },
    shuffle() { const t = now(); noise(t, .55, .2, B(), 'bandpass', 500, 2, { to: 4000, a: .1 }); for (let i = 0; i < 8; i++) osc('sine', mtof(72 + [0, 4, 7, 12][i % 4] + Math.floor(i / 4) * 12), t + .05 + i * .055, .16, .07, B()); },
    slot() { const t = now(); osc('sine', 300, t, .12, .35, B(), { to: 120 }); noise(t, .05, .2, B(), 'lowpass', 1500, 1); [79, 84].forEach((m, i) => osc('triangle', mtof(m), t + .1 + i * .08, .25, .12, B())); },
    deny() { const t = now(); osc('square', 220, t, .08, .08, B(), { lp: 900 }); osc('square', 180, t + .09, .1, .08, B(), { lp: 900 }); },
    star(i) { const t = now(); const m = [79, 84, 88][i] || 88; osc('triangle', mtof(m), t, .35, .2, B()); osc('sine', mtof(m + 12), t, .4, .08, B()); noise(t, .2, .06, B(), 'highpass', 7000); },
    win() { const t = now(); const seq = [[0, 65], [.12, 69], [.24, 72], [.36, 77], [.55, 81]]; for (const [dt, m] of seq) { osc('triangle', mtof(m), t + dt, .3, .18, B()); osc('sine', mtof(m + 12), t + dt, .35, .06, B(), { send: true }); }
      [53, 57, 60, 65].forEach(m => osc('triangle', mtof(m + 12), t + .55, 1.1, .08, B())); bird(t + .9); },
    fail() { const t = now(); [[0, 72], [.25, 70], [.5, 69], [.75, 67]].forEach(([dt, m], i) => osc('triangle', mtof(m - 12), t + dt, i === 3 ? .8 : .25, .18, B(), { vib: i === 3 ? 5 : 0 })); },
  };
  function play(name, ...a) { if (!ac || !sfxOn) return; try { fx[name] && fx[name](...a); } catch (e) { } }
  return { unlock, startMusic, stopMusic, setMusic, setSfx, play, get ctx() { return ac; }, get playing() { return playing; } };
})();
