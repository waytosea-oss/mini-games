/* ===== 夜市撸串王 · 原创音频引擎（WebAudio 实时合成） ===== */
const SND = (() => {
  let ac = null, master, musicBus, sfxBus, comp, delay, delayFb, delayWet, noiseBuf;
  let musicOn = true, sfxOn = true, musicPlaying = false, schedTimer = null;
  let nextTime = 0, step = 0, loop = 0;
  const BPM = 124, SPB = 60 / BPM / 4; // 16th
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  function init() {
    if (ac) return;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ac = new AC();
    comp = ac.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.2;
    master = ac.createGain(); master.gain.value = 0.9; master.connect(comp); comp.connect(ac.destination);
    musicBus = ac.createGain(); musicBus.gain.value = musicOn ? 0.42 : 0; musicBus.connect(master);
    sfxBus = ac.createGain(); sfxBus.gain.value = sfxOn ? 0.9 : 0; sfxBus.connect(master);
    delay = ac.createDelay(1); delay.delayTime.value = SPB * 3; delayFb = ac.createGain(); delayFb.gain.value = 0.28; delayWet = ac.createGain(); delayWet.gain.value = 0.22;
    const dlp = ac.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 2600;
    delay.connect(dlp); dlp.connect(delayFb); delayFb.connect(delay); dlp.connect(delayWet); delayWet.connect(musicBus);
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 1.5, ac.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  function unlock() {
    init(); if (!ac) return;
    if (ac.state === 'suspended') ac.resume();
    // iOS: play silent buffer
    const b = ac.createBuffer(1, 1, 22050), s = ac.createBufferSource(); s.buffer = b; s.connect(ac.destination); s.start(0);
  }
  const now = () => ac ? ac.currentTime : 0;
  function env(g, t, a, peak, dcy, sus = 0.0001) {
    g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(Math.max(sus, 0.0001), t + a + dcy);
  }
  function osc(type, f, t, dur, vol, dest, opt = {}) {
    const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.setValueAtTime(f, t);
    if (opt.slideTo) o.frequency.exponentialRampToValueAtTime(opt.slideTo, t + (opt.slideT || dur));
    if (opt.detune) o.detune.value = opt.detune;
    env(g, t, opt.a || 0.005, vol, dur);
    let node = o;
    if (opt.lp) { const f2 = ac.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.setValueAtTime(opt.lp, t); if (opt.lpTo) f2.frequency.exponentialRampToValueAtTime(opt.lpTo, t + dur); f2.Q.value = opt.q || 1; o.connect(f2); node = f2; }
    node.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.05);
    return o;
  }
  function noise(t, dur, vol, dest, type = 'bandpass', freq = 3000, q = 1, opt = {}) {
    const s = ac.createBufferSource(); s.buffer = noiseBuf; const f = ac.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (opt.fTo) f.frequency.exponentialRampToValueAtTime(opt.fTo, t + dur);
    const g = ac.createGain(); env(g, t, opt.a || 0.002, vol, dur);
    s.connect(f); f.connect(g); g.connect(dest); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
    return g;
  }
  /* ---------- 音乐：夜市小调（C 大调五声，I-vi-IV-V） ---------- */
  const CH = { C: [48, 52, 55], Am: [45, 48, 52], F: [41, 45, 48], G: [43, 47, 50], Em: [40, 43, 47], Dm: [38, 41, 45] };
  const PROG = ['C', 'Am', 'F', 'G', 'F', 'G', 'Em', 'Am', 'C', 'Am', 'F', 'G', 'F', 'G', 'C', 'C'];
  const MEL = [
    [[0, 76, 2], [2, 79, 2], [4, 81, 2], [6, 79, 1], [7, 76, 3], [10, 74, 2], [12, 72, 2], [14, 74, 2]],
    [[0, 76, 3], [3, 72, 1], [4, 69, 4], [10, 72, 2], [12, 74, 2], [14, 76, 2]],
    [[0, 81, 2], [2, 84, 2], [4, 86, 3], [7, 84, 1], [8, 81, 2], [10, 79, 2], [12, 76, 4]],
    [[0, 74, 2], [2, 76, 2], [4, 79, 4], [8, 74, 2], [10, 72, 1], [11, 74, 1], [12, 79, 4]],
    [[0, 84, 2], [2, 81, 1], [3, 84, 1], [4, 86, 4], [8, 88, 2], [10, 86, 2], [12, 84, 2], [14, 81, 2]],
    [[0, 79, 3], [3, 81, 1], [4, 79, 2], [6, 76, 2], [8, 74, 4], [12, 79, 2], [14, 81, 2]],
    [[0, 79, 2], [2, 76, 2], [4, 74, 2], [6, 72, 2], [8, 74, 2], [10, 76, 2], [12, 79, 2], [14, 76, 2]],
    [[0, 72, 4], [4, 76, 2], [6, 74, 2], [8, 72, 6], [14, 69, 2]],
    [[0, 72, 1], [1, 74, 1], [2, 76, 2], [4, 79, 2], [6, 76, 2], [8, 81, 4], [12, 79, 2], [14, 76, 2]],
    [[0, 76, 2], [2, 74, 2], [4, 72, 2], [6, 69, 2], [8, 72, 4], [12, 74, 4]],
    [[0, 81, 3], [3, 79, 1], [4, 81, 2], [6, 84, 2], [8, 86, 4], [12, 84, 2], [14, 86, 2]],
    [[0, 88, 4], [4, 86, 2], [6, 84, 2], [8, 86, 4], [12, 79, 4]],
    [[0, 84, 2], [2, 86, 2], [4, 88, 2], [6, 86, 2], [8, 84, 2], [10, 81, 2], [12, 79, 2], [14, 81, 2]],
    [[0, 84, 4], [4, 81, 2], [6, 79, 2], [8, 76, 2], [10, 79, 2], [12, 74, 4]],
    [[0, 76, 2], [2, 79, 2], [4, 81, 2], [6, 84, 2], [8, 81, 2], [10, 79, 2], [12, 76, 2], [14, 74, 2]],
    [[0, 72, 6], [8, 84, 2], [10, 79, 2], [12, 72, 4]]
  ];
  function lead(m, t, dur, vel) {
    const f = mtof(m);
    // 拨弦（古筝/琵琶感）：三角+方波，快速滤波包络，轻微滑音
    const g = ac.createGain(); env(g, t, 0.004, 0.22 * vel, Math.min(0.9, dur + 0.25));
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 2; lp.frequency.setValueAtTime(5200, t); lp.frequency.exponentialRampToValueAtTime(900, t + 0.35);
    const o1 = ac.createOscillator(); o1.type = 'triangle'; o1.frequency.setValueAtTime(f * 0.985, t); o1.frequency.exponentialRampToValueAtTime(f, t + 0.04);
    const o2 = ac.createOscillator(); o2.type = 'square'; o2.frequency.setValueAtTime(f * 2, t); const g2 = ac.createGain(); g2.gain.value = 0.18;
    o1.connect(lp); o2.connect(g2); g2.connect(lp); lp.connect(g); g.connect(musicBus); g.connect(delay);
    o1.start(t); o2.start(t); o1.stop(t + dur + 0.4); o2.stop(t + dur + 0.4);
  }
  function marimba(m, t, vel) {
    const f = mtof(m);
    osc('sine', f, t, 0.35, 0.16 * vel, musicBus);
    osc('sine', f * 4, t, 0.06, 0.05 * vel, musicBus);
  }
  function bass(m, t, dur) {
    const f = mtof(m);
    osc('triangle', f, t, dur, 0.42, musicBus, { lp: 900, lpTo: 300 });
    osc('sine', f / 2, t, dur * 0.8, 0.22, musicBus);
  }
  function stab(ch, t) {
    for (const n of CH[ch]) osc('square', mtof(n + 12), t, 0.09, 0.035, musicBus, { lp: 2200, lpTo: 700 });
  }
  function kick(t) { osc('sine', 150, t, 0.22, 0.75, musicBus, { slideTo: 45, slideT: 0.12 }); noise(t, 0.02, 0.15, musicBus, 'highpass', 3000); }
  function snare(t) { noise(t, 0.16, 0.32, musicBus, 'bandpass', 2200, 0.8); osc('triangle', 220, t, 0.08, 0.2, musicBus, { slideTo: 140 }); }
  function hat(t, open) { noise(t, open ? 0.18 : 0.04, open ? 0.12 : 0.09, musicBus, 'highpass', 8000, 0.7); }
  function block(t, hi) { osc('sine', hi ? 1250 : 880, t, 0.06, 0.18, musicBus); osc('square', hi ? 2500 : 1760, t, 0.012, 0.03, musicBus); }
  function scheduleStep(s, t) {
    const bar = Math.floor(s / 16) % 16, st = s % 16, ch = PROG[bar];
    const intro = loop === 0 && bar < 2 && false;
    // drums
    if (st === 0 || st === 8 || (st === 11 && bar % 2 === 1)) kick(t);
    if (st === 4 || st === 12) snare(t);
    if (st % 2 === 0) hat(t, st === 14); else if (bar >= 8) hat(t, false);
    if (st === 3 || st === 7 || st === 10) block(t, st === 10);
    if (bar === 15 && st >= 12) snare(t + 0.0);
    // bass
    const root = CH[ch][0] - 12, fifth = root + 7;
    const bpat = { 0: root, 3: root, 6: fifth, 8: root + 12, 10: root, 12: fifth, 14: root + 9 };
    if (bpat[st] !== undefined) bass(bpat[st], t, SPB * 1.8);
    // offbeat stabs
    if (st % 4 === 2) stab(ch, t);
    // melody
    for (const [ps, m, len] of MEL[bar]) if (ps === st) {
      if (loop % 2 === 0) lead(m, t, len * SPB, 1); else { lead(m, t, len * SPB, 0.8); marimba(m - 12, t, 0.9); }
    }
    // 高音装饰（第二遍）
    if (loop % 2 === 1 && st % 4 === 0 && bar % 4 === 3) marimba(CH[ch][2] + 24, t, 0.6);
  }
  function scheduler() {
    if (!ac || !musicPlaying) return;
    while (nextTime < ac.currentTime + 0.12) {
      scheduleStep(step, nextTime);
      nextTime += SPB; step++;
      if (step >= 16 * 16) { step = 0; loop++; }
    }
  }
  function startMusic() {
    init(); if (!ac || musicPlaying) return;
    musicPlaying = true; nextTime = ac.currentTime + 0.08;
    schedTimer = setInterval(scheduler, 25); scheduler();
  }
  function stopMusic() { musicPlaying = false; if (schedTimer) clearInterval(schedTimer); schedTimer = null; }
  function setMusic(on) { musicOn = on; if (musicBus) musicBus.gain.setTargetAtTime(on ? 0.42 : 0, ac.currentTime, 0.05); }
  function setSfx(on) { sfxOn = on; if (sfxBus) sfxBus.gain.setTargetAtTime(on ? 0.9 : 0, ac.currentTime, 0.02); }
  function duck(on) { if (musicBus && musicOn) musicBus.gain.setTargetAtTime(on ? 0.12 : 0.42, ac.currentTime, 0.15); }
  /* ---------- 音效 ---------- */
  const S = {};
  S.click = () => { const t = now(); osc('sine', 660, t, 0.07, 0.3, sfxBus, { slideTo: 990 }); };
  S.pick = (pitch = 1) => { const t = now(); osc('sine', 420 * pitch, t, 0.12, 0.45, sfxBus, { slideTo: 1100 * pitch, slideT: 0.08 }); osc('triangle', 1600 * pitch, t, 0.03, 0.12, sfxBus); noise(t, 0.05, 0.12, sfxBus, 'bandpass', 5000, 2); };
  S.land = (i = 0) => { const t = now(); osc('sine', 520 + i * 30, t, 0.08, 0.3, sfxBus, { slideTo: 300 }); noise(t, 0.03, 0.12, sfxBus, 'bandpass', 1800, 3); };
  S.sizzle = (dur = 0.7, vol = 0.3) => {
    const t = now(); const g = noise(t, dur, vol, sfxBus, 'highpass', 4200, 0.6, { a: 0.02 });
    for (let i = 0; i < 14; i++) { const tt = t + Math.random() * dur * 0.85; noise(tt, 0.012, 0.25 * Math.random() + 0.08, sfxBus, 'bandpass', 2500 + Math.random() * 5000, 4); }
  };
  S.coin = (k = 0) => { const t = now() + 0.02; const b = 1 + k * 0.06; osc('square', 1318 * b, t, 0.07, 0.12, sfxBus, { lp: 6000 }); osc('square', 1976 * b, t + 0.07, 0.35, 0.12, sfxBus, { lp: 6000 }); osc('sine', 3951 * b, t + 0.07, 0.3, 0.06, sfxBus); };
  S.cash = () => { // 收银机：叮+嚓
    const t = now(); noise(t, 0.08, 0.3, sfxBus, 'bandpass', 3500, 1.2); osc('triangle', 2093, t + 0.06, 0.6, 0.22, sfxBus); osc('sine', 2637, t + 0.06, 0.5, 0.15, sfxBus); osc('sine', 4186, t + 0.06, 0.25, 0.06, sfxBus);
  };
  S.match = (combo = 0) => {
    const t = now(); const base = [72, 76, 79, 84].map(m => m + Math.min(combo, 6) * 2);
    base.forEach((m, i) => osc('triangle', mtof(m), t + i * 0.045, 0.25, 0.22, sfxBus));
    S.sizzle(0.55, 0.22); setTimeout(S.cash, 120);
  };
  S.baa = () => { // 小羊“咩~”
    const t = now(); const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(560, t); o.frequency.linearRampToValueAtTime(620, t + 0.12); o.frequency.linearRampToValueAtTime(500, t + 0.65);
    const lfo = ac.createOscillator(); lfo.frequency.value = 9; const lg = ac.createGain(); lg.gain.setValueAtTime(5, t); lg.gain.linearRampToValueAtTime(38, t + 0.5); lfo.connect(lg); lg.connect(o.frequency);
    const f1 = ac.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = 1100; f1.Q.value = 3; const f2 = ac.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = 2600; f2.Q.value = 4;
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.9, t + 0.05); g.gain.setValueAtTime(0.8, t + 0.45); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.75);
    o.connect(f1); o.connect(f2); f1.connect(g); f2.connect(g); g.connect(sfxBus); o.start(t); lfo.start(t); o.stop(t + 0.8); lfo.stop(t + 0.8);
  };
  S.whoosh = () => { const t = now(); noise(t, 0.35, 0.35, sfxBus, 'bandpass', 600, 1.5, { fTo: 4000, a: 0.08 }); };
  S.magnet = () => { const t = now(); const o = osc('sine', 200, t, 0.6, 0.35, sfxBus, { slideTo: 1200, slideT: 0.5 }); osc('square', 100, t, 0.5, 0.05, sfxBus, { slideTo: 600, lp: 1500 }); };
  S.shuffle = () => { const t = now(); S.whoosh(); noise(t + 0.15, 0.4, 0.3, sfxBus, 'lowpass', 1200, 1); for (let i = 0; i < 8; i++) osc('sine', 300 + Math.random() * 500, t + 0.3 + i * 0.03, 0.05, 0.15, sfxBus); setTimeout(() => S.sizzle(0.5, 0.25), 450); };
  S.warn = () => { const t = now(); osc('square', 330, t, 0.12, 0.12, sfxBus, { lp: 1500 }); osc('square', 330, t + 0.16, 0.12, 0.12, sfxBus, { lp: 1500 }); };
  S.tick = () => { const t = now(); osc('sine', 1800, t, 0.03, 0.18, sfxBus); };
  S.deny = () => { const t = now(); osc('square', 180, t, 0.15, 0.12, sfxBus, { lp: 900 }); };
  S.drop = () => { const t = now(); for (let i = 0; i < 6; i++) osc('sine', 250 + Math.random() * 200, t + i * 0.05 + Math.random() * 0.03, 0.06, 0.12, sfxBus, { slideTo: 120 }); S.sizzle(1.0, 0.2); };
  S.fail = () => { // 悲伤长号 wah-wah-wah-waaah
    const t = now(); const notes = [55, 54, 53, 52];
    notes.forEach((m, i) => {
      const st = t + i * 0.42, dur = i === 3 ? 1.2 : 0.36;
      const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(mtof(m + 12), st);
      if (i === 3) { const l = ac.createOscillator(); l.frequency.value = 6; const lg = ac.createGain(); lg.gain.value = 8; l.connect(lg); lg.connect(o.frequency); l.start(st); l.stop(st + dur + 0.1); }
      const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 6; f.frequency.setValueAtTime(400, st); f.frequency.linearRampToValueAtTime(1400, st + 0.12); f.frequency.linearRampToValueAtTime(500, st + dur);
      const g = ac.createGain(); g.gain.setValueAtTime(0.0001, st); g.gain.linearRampToValueAtTime(0.35, st + 0.04); g.gain.setValueAtTime(0.3, st + dur - 0.08); g.gain.exponentialRampToValueAtTime(0.0001, st + dur);
      o.connect(f); f.connect(g); g.connect(sfxBus); o.start(st); o.stop(st + dur + 0.05);
    });
  };
  S.win = () => {
    const t = now(); [60, 64, 67, 72, 76, 79, 84].forEach((m, i) => { osc('triangle', mtof(m), t + i * 0.07, 0.3, 0.22, sfxBus); osc('square', mtof(m), t + i * 0.07, 0.08, 0.05, sfxBus, { lp: 3000 }); });
    [72, 76, 79, 84].forEach(m => osc('triangle', mtof(m), t + 0.55, 1.1, 0.13, sfxBus));
    for (let i = 0; i < 8; i++) setTimeout(() => S.coin(i % 4), 650 + i * 70);
  };
  S.star = (i) => { const t = now(); osc('triangle', mtof(79 + i * 5), t, 0.4, 0.3, sfxBus); osc('sine', mtof(91 + i * 5), t, 0.3, 0.12, sfxBus); noise(t, 0.2, 0.08, sfxBus, 'highpass', 7000); };
  S.bonus = () => { const t = now(); [72, 79, 84, 88, 91].forEach((m, i) => osc('sine', mtof(m), t + i * 0.06, 0.25, 0.2, sfxBus)); };
  const play = (name, ...a) => { if (!ac || !sfxOn || ac.state !== 'running') return; try { S[name](...a); } catch (e) { } };
  return { unlock, startMusic, stopMusic, setMusic, setSfx, play, duck, get ctx() { return ac; } };
})();
