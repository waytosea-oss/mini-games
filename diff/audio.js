/* ===== 火眼金睛 · 音频引擎（WebAudio 实时合成，无任何外部音频素材） ===== */
const SND = (() => {
  let ac = null, master, musicBus, sfxBus, comp, delay, delayFb, delayWet, noiseBuf;
  let musicOn = true, sfxOn = true, musicPlaying = false, schedTimer = null;
  let nextTime = 0, step = 0, loop = 0;
  const BPM = 112, SPB = 60 / BPM / 4;
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  const MV = 0.36;
  function init() {
    if (ac) return;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ac = new AC();
    comp = ac.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.2;
    master = ac.createGain(); master.gain.value = 0.9; master.connect(comp); comp.connect(ac.destination);
    musicBus = ac.createGain(); musicBus.gain.value = musicOn ? MV : 0; musicBus.connect(master);
    sfxBus = ac.createGain(); sfxBus.gain.value = sfxOn ? 0.9 : 0; sfxBus.connect(master);
    delay = ac.createDelay(1); delay.delayTime.value = SPB * 3; delayFb = ac.createGain(); delayFb.gain.value = 0.3; delayWet = ac.createGain(); delayWet.gain.value = 0.25;
    const dlp = ac.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 3000;
    delay.connect(dlp); dlp.connect(delayFb); delayFb.connect(delay); dlp.connect(delayWet); delayWet.connect(musicBus);
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 1.5, ac.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  function unlock() {
    init(); if (!ac) return;
    if (ac.state === 'suspended') ac.resume();
    const b = ac.createBuffer(1, 1, 22050), s = ac.createBufferSource(); s.buffer = b; s.connect(ac.destination); s.start(0);
  }
  const now = () => ac ? ac.currentTime : 0;
  function env(g, t, a, peak, dcy, sus = 0.0001) {
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(Math.max(sus, 0.0001), t + a + dcy);
  }
  function osc(type, f, t, dur, vol, dest, opt = {}) {
    const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.setValueAtTime(f, t);
    if (opt.slideTo) o.frequency.exponentialRampToValueAtTime(opt.slideTo, t + (opt.slideT || dur));
    if (opt.detune) o.detune.value = opt.detune;
    env(g, t, opt.a || 0.005, vol, dur);
    let node = o;
    if (opt.lp) { const f2 = ac.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.setValueAtTime(opt.lp, t); if (opt.lpTo) f2.frequency.exponentialRampToValueAtTime(opt.lpTo, t + dur); f2.Q.value = opt.q || 1; o.connect(f2); node = f2; }
    node.connect(g); g.connect(dest); if (opt.send) g.connect(delay); o.start(t); o.stop(t + dur + 0.08);
    return o;
  }
  function noise(t, dur, vol, dest, type = 'bandpass', freq = 3000, q = 1, opt = {}) {
    const s = ac.createBufferSource(); s.buffer = noiseBuf; const f = ac.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (opt.fTo) f.frequency.exponentialRampToValueAtTime(opt.fTo, t + dur);
    const g = ac.createGain(); env(g, t, opt.a || 0.002, vol, dur);
    s.connect(f); f.connect(g); g.connect(dest); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  }
  /* ---------- 音乐：《小侦探散步》 F 大调，俏皮拨奏 + 马林巴 + 走路贝斯 ---------- */
  // 和弦（根音 MIDI）
  const CH = { F: [41, 45, 48, 52], Dm: [38, 45, 50, 53], Bb: [46, 50, 53, 57], C: [36, 43, 48, 52], Gm: [43, 46, 50, 53], A7: [45, 49, 52, 55], C7: [36, 46, 48, 52] };
  const PROG = ['F', 'Dm', 'Gm', 'C7', 'F', 'Dm', 'Bb', 'C', 'Dm', 'A7', 'Dm', 'C7', 'Bb', 'C', 'F', 'C7'];
  // 旋律 [16分位置, midi, 长度]
  const MEL = [
    [[0, 72, 1], [2, 69, 1], [3, 72, 1], [4, 77, 2], [8, 76, 1], [10, 74, 1], [12, 72, 3]],
    [[0, 69, 1], [2, 70, 1], [3, 69, 1], [4, 65, 2], [8, 62, 2], [12, 65, 2], [14, 69, 1]],
    [[0, 70, 2], [3, 74, 1], [4, 79, 2], [7, 77, 1], [8, 74, 2], [12, 70, 2]],
    [[0, 72, 1], [1, 74, 1], [2, 72, 1], [3, 70, 1], [4, 67, 2], [8, 64, 1], [10, 67, 1], [12, 72, 3]],
    [[0, 77, 1], [2, 76, 1], [3, 77, 1], [4, 81, 2], [8, 79, 1], [10, 77, 1], [12, 76, 1], [14, 77, 1]],
    [[0, 74, 3], [4, 69, 1], [6, 74, 1], [8, 77, 2], [12, 74, 2]],
    [[0, 74, 1], [2, 77, 1], [4, 82, 2], [7, 81, 1], [8, 79, 1], [10, 77, 1], [12, 74, 2]],
    [[0, 72, 2], [4, 76, 1], [5, 77, 1], [6, 79, 2], [12, 84, 2]],
    [[0, 81, 1], [2, 77, 1], [4, 74, 2], [8, 77, 1], [9, 76, 1], [10, 74, 1], [12, 69, 2]],
    [[0, 73, 1], [2, 76, 1], [4, 79, 2], [8, 81, 1], [10, 79, 1], [12, 76, 2], [14, 73, 1]],
    [[0, 74, 2], [3, 77, 1], [4, 81, 2], [8, 86, 2], [12, 81, 1], [14, 77, 1]],
    [[0, 79, 1], [1, 81, 1], [2, 79, 1], [3, 77, 1], [4, 76, 2], [8, 72, 1], [10, 76, 1], [12, 79, 2]],
    [[0, 82, 2], [3, 81, 1], [4, 79, 1], [6, 77, 1], [8, 74, 2], [12, 77, 2]],
    [[0, 79, 2], [3, 77, 1], [4, 76, 1], [6, 74, 1], [8, 72, 2], [12, 76, 1], [14, 79, 1]],
    [[0, 77, 3], [4, 72, 1], [6, 69, 1], [8, 65, 2], [12, 69, 1], [13, 72, 1], [14, 77, 1]],
    [[0, 76, 1], [2, 79, 1], [4, 82, 1], [6, 79, 1], [8, 76, 2], [12, 72, 2]]
  ];
  function pluck(m, t, dur, vel) { // 拨弦（小提琴拨奏感）
    const f = mtof(m), g = ac.createGain(); env(g, t, 0.003, 0.2 * vel, Math.min(0.5, dur + 0.15));
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 3; lp.frequency.setValueAtTime(4200, t); lp.frequency.exponentialRampToValueAtTime(700, t + 0.25);
    const o1 = ac.createOscillator(); o1.type = 'triangle'; o1.frequency.setValueAtTime(f, t);
    const o2 = ac.createOscillator(); o2.type = 'sawtooth'; o2.frequency.setValueAtTime(f * 1.003, t); const g2 = ac.createGain(); g2.gain.value = 0.25;
    o1.connect(lp); o2.connect(g2); g2.connect(lp); lp.connect(g); g.connect(musicBus); g.connect(delay);
    o1.start(t); o2.start(t); o1.stop(t + dur + 0.5); o2.stop(t + dur + 0.5);
  }
  function marimba(m, t, vel) { const f = mtof(m); osc('sine', f, t, 0.4, 0.17 * vel, musicBus); osc('sine', f * 4, t, 0.05, 0.05 * vel, musicBus); osc('sine', f * 10, t, 0.015, 0.02 * vel, musicBus); }
  function glock(m, t, vel) { const f = mtof(m); osc('sine', f, t, 0.6, 0.07 * vel, musicBus, { send: 1 }); osc('sine', f * 2.76, t, 0.2, 0.025 * vel, musicBus); }
  function bass(m, t, dur) { const f = mtof(m); osc('triangle', f, t, dur, 0.4, musicBus, { lp: 800, lpTo: 260 }); osc('sine', f, t, dur * 0.9, 0.2, musicBus); }
  function kick(t) { osc('sine', 130, t, 0.18, 0.55, musicBus, { slideTo: 45, slideT: 0.1 }); }
  function snap(t) { noise(t, 0.07, 0.28, musicBus, 'bandpass', 2600, 1.4); noise(t + 0.006, 0.05, 0.15, musicBus, 'highpass', 5000, 1); }
  function shaker(t, v) { noise(t, 0.035, 0.06 * v, musicBus, 'highpass', 7500, 0.8); }
  function scheduleStep(s, t) {
    const bar = Math.floor(s / 16) % 16, st = s % 16, ch = CH[PROG[bar]];
    if (st === 0 || st === 8 || (st === 10 && bar % 4 === 3)) kick(t);
    if (st === 4 || st === 12) snap(t);
    shaker(t, st % 2 === 0 ? 1 : 0.55);
    // 走路贝斯：根-五-八-经过音
    const r = ch[0] - 12 + (ch[0] < 40 ? 12 : 0);
    const walk = { 0: r, 4: r + 7, 8: r + 12, 12: r + 7 + (bar % 2 ? 2 : -1) };
    if (walk[st] !== undefined) bass(walk[st], t, SPB * 3.2);
    // 反拍和弦（马林巴）
    if (st === 2 || st === 6 || st === 10 || st === 14) { marimba(ch[1] + 12, t, 0.55); marimba(ch[2] + 12, t, 0.5); }
    for (const [ps, m, len] of MEL[bar]) if (ps === st) {
      pluck(m, t, len * SPB, loop % 2 ? 0.85 : 1);
      if (loop % 2 === 1) glock(m + 12, t, 0.9);
    }
  }
  function scheduler() {
    if (!ac || !musicPlaying) return;
    while (nextTime < ac.currentTime + 0.12) { scheduleStep(step, nextTime); nextTime += SPB; step++; if (step >= 256) { step = 0; loop++; } }
  }
  function startMusic() { init(); if (!ac || musicPlaying) return; musicPlaying = true; nextTime = ac.currentTime + 0.08; schedTimer = setInterval(scheduler, 25); scheduler(); }
  function stopMusic() { musicPlaying = false; if (schedTimer) clearInterval(schedTimer); schedTimer = null; }
  function setMusic(on) { musicOn = on; if (musicBus) musicBus.gain.setTargetAtTime(on ? MV : 0, ac.currentTime, 0.05); }
  function setSfx(on) { sfxOn = on; if (sfxBus) sfxBus.gain.setTargetAtTime(on ? 0.9 : 0, ac.currentTime, 0.02); }
  function duck(on) { if (musicBus && musicOn) musicBus.gain.setTargetAtTime(on ? 0.1 : MV, ac.currentTime, 0.15); }
  /* ---------- 音效 ---------- */
  const S = {};
  S.click = () => { const t = now(); osc('sine', 700, t, 0.06, 0.28, sfxBus, { slideTo: 1050 }); osc('triangle', 1400, t, 0.02, 0.08, sfxBus); };
  S.found = (k = 0) => { // 叮咚 + 闪光 + 上行琶音（随找到数升高）
    const t = now(), b = [0, 2, 4, 5, 7, 9][Math.min(k, 5)];
    osc('triangle', mtof(79 + b), t, 0.14, 0.3, sfxBus); osc('triangle', mtof(86 + b), t + 0.08, 0.5, 0.3, sfxBus);
    osc('sine', mtof(98 + b), t + 0.08, 0.35, 0.1, sfxBus); osc('sine', mtof(91 + b), t + 0.16, 0.4, 0.08, sfxBus);
    for (let i = 0; i < 6; i++) osc('sine', 2400 + Math.random() * 3000, t + 0.1 + i * 0.035, 0.05, 0.05, sfxBus);
    noise(t, 0.12, 0.08, sfxBus, 'highpass', 8000);
  };
  S.pop = () => { const t = now(); osc('sine', 300, t, 0.09, 0.4, sfxBus, { slideTo: 900, slideT: 0.06 }); };
  S.wrong = () => { // 嗡——双响蜂鸣
    const t = now(); osc('square', 150, t, 0.16, 0.16, sfxBus, { lp: 1100 }); osc('sawtooth', 154, t, 0.16, 0.1, sfxBus, { lp: 900 });
    osc('square', 118, t + 0.17, 0.24, 0.16, sfxBus, { lp: 900 }); osc('sawtooth', 121, t + 0.17, 0.24, 0.1, sfxBus, { lp: 800 });
  };
  S.heart = () => { const t = now(); osc('sine', 520, t + 0.05, 0.25, 0.2, sfxBus, { slideTo: 200 }); noise(t + 0.05, 0.12, 0.12, sfxBus, 'bandpass', 1500, 2); };
  S.hint = () => { const t = now(); [72, 76, 79, 83, 86, 91].forEach((m, i) => osc('sine', mtof(m), t + i * 0.05, 0.35, 0.13, sfxBus, { send: 1 })); noise(t, 0.6, 0.12, sfxBus, 'highpass', 6000, 0.7, { a: 0.2 }); };
  S.zoom = (inn = true) => { const t = now(); noise(t, 0.2, 0.18, sfxBus, 'bandpass', inn ? 500 : 2500, 2, { fTo: inn ? 2500 : 500, a: 0.05 }); };
  S.tick = () => { const t = now(); osc('sine', 1500, t, 0.04, 0.15, sfxBus); osc('sine', 3000, t, 0.015, 0.05, sfxBus); };
  S.combo = (n) => { const t = now(); [0, 4, 7, 12].forEach((d, i) => osc('square', mtof(76 + d + n), t + i * 0.04, 0.12, 0.06, sfxBus, { lp: 4000 })); };
  S.star = (i) => { const t = now(); osc('triangle', mtof(79 + i * 5), t, 0.4, 0.3, sfxBus); osc('sine', mtof(91 + i * 5), t, 0.3, 0.12, sfxBus); noise(t, 0.2, 0.08, sfxBus, 'highpass', 7000); };
  S.win = () => {
    const t = now(); [65, 69, 72, 77, 81, 84, 89].forEach((m, i) => { osc('triangle', mtof(m), t + i * 0.07, 0.3, 0.2, sfxBus); osc('square', mtof(m), t + i * 0.07, 0.08, 0.04, sfxBus, { lp: 3000 }); });
    [77, 81, 84, 89].forEach(m => osc('triangle', mtof(m), t + 0.55, 1.2, 0.12, sfxBus, { send: 1 }));
    noise(t + 0.5, 0.8, 0.1, sfxBus, 'highpass', 6000, 0.6, { a: 0.1 });
  };
  S.fail = () => {
    const t = now(); [55, 54, 53, 52].forEach((m, i) => {
      const st = t + i * 0.42, dur = i === 3 ? 1.1 : 0.36;
      const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(mtof(m + 12), st);
      const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 6; f.frequency.setValueAtTime(400, st); f.frequency.linearRampToValueAtTime(1400, st + 0.12); f.frequency.linearRampToValueAtTime(500, st + dur);
      const g = ac.createGain(); g.gain.setValueAtTime(0.0001, st); g.gain.linearRampToValueAtTime(0.3, st + 0.04); g.gain.setValueAtTime(0.26, st + dur - 0.08); g.gain.exponentialRampToValueAtTime(0.0001, st + dur);
      o.connect(f); f.connect(g); g.connect(sfxBus); o.start(st); o.stop(st + dur + 0.05);
    });
  };
  S.whoosh = () => { const t = now(); noise(t, 0.3, 0.25, sfxBus, 'bandpass', 700, 1.5, { fTo: 3500, a: 0.06 }); };
  S.unlock = () => { const t = now(); [84, 88, 91, 96].forEach((m, i) => osc('sine', mtof(m), t + i * 0.06, 0.3, 0.15, sfxBus)); };
  const play = (name, ...a) => { if (!ac || !sfxOn || ac.state !== 'running') return; try { S[name](...a); } catch (e) { } };
  return { unlock, startMusic, stopMusic, setMusic, setSfx, play, duck, get ctx() { return ac; } };
})();
