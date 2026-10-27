/* ===== 宝石大盗 · 音频引擎（WebAudio 实时合成，无外部音频文件） ===== */
const SND = (() => {
  let ac = null, master, musicBus, sfxBus, comp, verb, verbIn, noiseBuf;
  let musicOn = true, sfxOn = true, playing = false, timer = null, nextT = 0, step = 0, loop = 0;
  const BPM = 108, E8 = 60 / BPM / 2, SWING = 0.17; // 8分音符 + 摇摆
  const MV = 0.40;
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  function init() {
    if (ac) return;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ac = new AC();
    comp = ac.createDynamicsCompressor(); comp.threshold.value = -12; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.25;
    master = ac.createGain(); master.gain.value = 0.9; master.connect(comp); comp.connect(ac.destination);
    musicBus = ac.createGain(); musicBus.gain.value = musicOn ? MV : 0; musicBus.connect(master);
    sfxBus = ac.createGain(); sfxBus.gain.value = sfxOn ? 0.85 : 0; sfxBus.connect(master);
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 1.5, ac.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    // 简易混响（合成冲激响应）——宝库空间感
    verb = ac.createConvolver(); const len = ac.sampleRate * 1.6, ir = ac.createBuffer(2, len, ac.sampleRate);
    for (let c = 0; c < 2; c++) { const x = ir.getChannelData(c); for (let i = 0; i < len; i++) x[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
    verb.buffer = ir; verbIn = ac.createGain(); verbIn.gain.value = 0.28; verbIn.connect(verb); const vo = ac.createGain(); vo.gain.value = 0.55; verb.connect(vo); vo.connect(master);
  }
  function unlock() {
    init(); if (!ac) return;
    if (ac.state === 'suspended') ac.resume();
    const b = ac.createBuffer(1, 1, 22050), s = ac.createBufferSource(); s.buffer = b; s.connect(ac.destination); s.start(0);
  }
  const now = () => ac ? ac.currentTime : 0;
  function env(g, t, a, peak, dcy) { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dcy); }
  function osc(type, f, t, dur, vol, dest, o = {}) {
    const n = ac.createOscillator(), g = ac.createGain(); n.type = type; n.frequency.setValueAtTime(f, t);
    if (o.to) n.frequency.exponentialRampToValueAtTime(o.to, t + (o.tt || dur));
    if (o.det) n.detune.value = o.det;
    env(g, t, o.a || 0.004, vol, dur);
    let node = n;
    if (o.lp) { const f2 = ac.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.setValueAtTime(o.lp, t); if (o.lpTo) f2.frequency.exponentialRampToValueAtTime(o.lpTo, t + dur); f2.Q.value = o.q || 1; n.connect(f2); node = f2; }
    node.connect(g); g.connect(dest); if (o.rv) g.connect(verbIn); n.start(t); n.stop(t + dur + (o.a || 0.004) + 0.06);
    return n;
  }
  function noise(t, dur, vol, dest, type = 'bandpass', f = 3000, q = 1, o = {}) {
    const s = ac.createBufferSource(); s.buffer = noiseBuf; const fl = ac.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, t); fl.Q.value = q;
    if (o.fTo) fl.frequency.exponentialRampToValueAtTime(o.fTo, t + dur);
    const g = ac.createGain(); env(g, t, o.a || 0.002, vol, dur);
    s.connect(fl); fl.connect(g); g.connect(dest); if (o.rv) g.connect(verbIn);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.1);
  }
  /* ---------- BGM：《宝库潜行》 D 小调摇摆爵士（拨奏低音 + 钢片琴 + 颤音琴 + 响指） ---------- */
  const CH = { Dm: [62, 65, 69, 72], Gm: [62, 67, 70, 74], A7: [61, 64, 67, 69], Bb: [62, 65, 70, 74], C: [64, 67, 72, 76], Am: [60, 64, 69, 72], E7: [62, 64, 68, 71] };
  const ROOT = { Dm: 38, Gm: 43, A7: 45, Bb: 46, C: 48, Am: 45, E7: 40 };
  const PROG = ['Dm', 'Dm', 'Gm', 'A7', 'Dm', 'Bb', 'Gm', 'A7', 'Bb', 'C', 'Am', 'Dm', 'Gm', 'E7', 'A7', 'A7'];
  const MEL = [
    [[0, 62, 1], [1, 65, 1], [2, 69, 2], [5, 68, 1], [6, 69, 2]],
    [[0, 74, 3], [4, 72, 1], [5, 69, 1], [6, 65, 2]],
    [[0, 67, 1], [1, 70, 1], [2, 74, 2], [5, 73, 1], [6, 74, 2]],
    [[0, 76, 2], [2, 73, 1], [3, 69, 1], [4, 67, 2], [6, 64, 2]],
    [[0, 62, 1], [1, 65, 1], [2, 69, 2], [4, 74, 1], [5, 77, 1], [6, 76, 2]],
    [[0, 74, 2], [2, 70, 1], [3, 74, 1], [4, 77, 3]],
    [[0, 79, 1], [1, 77, 1], [2, 74, 1], [3, 70, 1], [4, 67, 2], [6, 70, 2]],
    [[0, 69, 4], [5, 61, 1], [6, 64, 1], [7, 67, 1]],
    [[0, 70, 2], [2, 74, 2], [4, 77, 2], [6, 74, 2]],
    [[0, 72, 2], [2, 76, 2], [4, 79, 2], [6, 76, 1], [7, 72, 1]],
    [[0, 69, 2], [2, 72, 1], [3, 76, 1], [4, 81, 3]],
    [[0, 77, 1], [1, 76, 1], [2, 74, 2], [4, 69, 4]],
    [[0, 70, 1], [1, 74, 1], [2, 79, 2], [4, 77, 1], [5, 74, 1], [6, 70, 2]],
    [[0, 68, 2], [2, 71, 2], [4, 74, 2], [6, 76, 1], [7, 74, 1]],
    [[0, 73, 1], [1, 76, 1], [2, 79, 1], [3, 81, 1], [4, 79, 2], [6, 76, 1], [7, 73, 1]],
    [[0, 74, 3], [4, 69, 1], [5, 70, 1], [6, 71, 1], [7, 73, 1]]
  ];
  function celesta(m, t, dur, v) {
    const f = mtof(m);
    osc('sine', f, t, Math.min(1.2, dur + 0.5), 0.2 * v, musicBus, { rv: 1 });
    osc('sine', f * 2, t, 0.35, 0.07 * v, musicBus, { rv: 1 });
    osc('sine', f * 4.01, t, 0.12, 0.035 * v, musicBus);
    osc('triangle', f, t, 0.08, 0.06 * v, musicBus, { lp: 4000 });
  }
  function vibes(ch, t) {
    for (const m of CH[ch]) { const n = osc('sine', mtof(m), t, 0.9, 0.045, musicBus, { a: 0.01, rv: 1 }); }
  }
  function pizz(m, t, dur) {
    const f = mtof(m);
    osc('triangle', f, t, Math.max(0.18, dur * 0.9), 0.5, musicBus, { lp: 1100, lpTo: 260, q: 3 });
    osc('sine', f, t, Math.max(0.2, dur), 0.25, musicBus);
    noise(t, 0.015, 0.05, musicBus, 'bandpass', 1400, 4);
  }
  function snap(t) { noise(t, 0.05, 0.28, musicBus, 'bandpass', 2600, 3, { rv: 1 }); noise(t, 0.012, 0.18, musicBus, 'highpass', 6000, 1); }
  function brush(t, v) { noise(t, 0.09, 0.05 * v, musicBus, 'highpass', 7000, 0.6, { a: 0.012 }); }
  function kick(t) { osc('sine', 110, t, 0.18, 0.4, musicBus, { to: 45, tt: 0.1 }); }
  function ride(t) { noise(t, 0.22, 0.04, musicBus, 'bandpass', 9000, 2); osc('square', 5274, t, 0.05, 0.006, musicBus); }
  function sched(s, t) {
    const bar = Math.floor(s / 8) % 16, st = s % 8, ch = PROG[bar];
    if (st % 2 === 1) t += E8 * SWING;
    // 鼓
    if (st === 0 || st === 4) kick(t);
    if (st === 2 || st === 6) snap(t);
    brush(t, st % 2 ? 0.7 : 1);
    if (st === 0 || st === 3 || st === 6) ride(t);
    // 行走低音（四分音符）
    if (st % 2 === 0) {
      const r = ROOT[ch], q = st / 2, nx = ROOT[PROG[(bar + 1) % 16]];
      const walk = [r, r + (ch === 'A7' || ch === 'C' || ch === 'E7' ? 4 : 3), r + 7, nx + (nx > r ? -1 : 1)];
      pizz(walk[q], t, E8 * 2);
    }
    // 颤音琴切分和弦
    if (st === 1 || (st === 4 && bar % 2 === 1)) vibes(ch, t);
    // 旋律（第2遍升八度+双音）
    for (const [p, m, len] of MEL[bar]) if (p === st) {
      celesta(m + (loop % 2 ? 12 : 0), t, len * E8, loop % 2 ? 0.75 : 1);
      if (loop % 2) celesta(m, t, len * E8, 0.45);
    }
    // 闪光点缀
    if (st === 7 && bar % 4 === 3) { for (let i = 0; i < 4; i++) osc('sine', mtof(86 + i * 3), t + i * 0.035, 0.18, 0.03, musicBus, { rv: 1 }); }
  }
  function tick() {
    if (!ac || !playing) return;
    while (nextT < ac.currentTime + 0.15) { sched(step, nextT); nextT += E8; step++; if (step >= 128) { step = 0; loop++; } }
  }
  function startMusic() { init(); if (!ac || playing) return; playing = true; nextT = ac.currentTime + 0.1; timer = setInterval(tick, 25); tick(); }
  function stopMusic() { playing = false; if (timer) clearInterval(timer); timer = null; }
  function setMusic(on) { musicOn = on; if (musicBus) musicBus.gain.setTargetAtTime(on ? MV : 0, ac.currentTime, 0.05); }
  function setSfx(on) { sfxOn = on; if (sfxBus) sfxBus.gain.setTargetAtTime(on ? 0.85 : 0, ac.currentTime, 0.02); }
  function duck(on) { if (musicBus && musicOn) musicBus.gain.setTargetAtTime(on ? 0.1 : MV, ac.currentTime, 0.15); }
  /* ---------- 音效 ---------- */
  const S = {};
  S.click = () => { const t = now(); osc('sine', 880, t, 0.06, 0.25, sfxBus, { to: 1320 }); osc('triangle', 2640, t, 0.03, 0.06, sfxBus); };
  S.pry = (p = 1) => { // 撬：金属撬棍嘎吱 + 啵！
    const t = now();
    const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(95, t); o.frequency.linearRampToValueAtTime(150, t + 0.09);
    const lf = ac.createOscillator(); lf.frequency.value = 55; const lg = ac.createGain(); lg.gain.value = 40; lf.connect(lg); lg.connect(o.frequency);
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1300; bp.Q.value = 5;
    const g = ac.createGain(); env(g, t, 0.01, 0.22, 0.1); o.connect(bp); bp.connect(g); g.connect(sfxBus); o.start(t); lf.start(t); o.stop(t + 0.15); lf.stop(t + 0.15);
    osc('square', 2400, t + 0.1, 0.02, 0.06, sfxBus, { lp: 5000 });
    osc('sine', 320 * p, t + 0.11, 0.12, 0.5, sfxBus, { to: 980 * p, tt: 0.07 });
    noise(t + 0.11, 0.05, 0.18, sfxBus, 'bandpass', 4200, 2);
  };
  S.socket = (i = 0, k = 0) => { // 宝石落座：水晶叮
    const t = now() + 0.005; const base = [84, 88, 91][i % 3] + Math.min(k, 6);
    osc('sine', mtof(base), t, 0.6, 0.26, sfxBus, { rv: 1 }); osc('sine', mtof(base) * 2.76, t, 0.25, 0.07, sfxBus, { rv: 1 });
    osc('triangle', mtof(base + 12), t, 0.06, 0.06, sfxBus); noise(t, 0.04, 0.08, sfxBus, 'highpass', 9000);
  };
  S.tray = () => { const t = now(); osc('sine', 210, t, 0.12, 0.4, sfxBus, { to: 120 }); noise(t, 0.07, 0.16, sfxBus, 'lowpass', 900, 0.7); osc('sine', mtof(79), t + 0.02, 0.18, 0.05, sfxBus); };
  S.chest = (k = 0) => { // 宝箱合盖：木头咚 + 锁扣咔 + 闪光琶音
    const t = now();
    osc('sine', 150, t, 0.18, 0.6, sfxBus, { to: 55 }); noise(t, 0.12, 0.3, sfxBus, 'lowpass', 700, 1);
    osc('square', 1800, t + 0.08, 0.025, 0.08, sfxBus, { lp: 4000 }); osc('square', 2600, t + 0.11, 0.02, 0.06, sfxBus, { lp: 5000 });
    const b = 72 + Math.min(k, 5) * 2;
    [0, 4, 7, 11, 14, 19].forEach((d, i) => osc('triangle', mtof(b + d), t + 0.14 + i * 0.045, 0.4, 0.13, sfxBus, { rv: 1 }));
    for (let i = 0; i < 6; i++) osc('sine', 3000 + Math.random() * 3500, t + 0.3 + i * 0.04, 0.08, 0.04, sfxBus, { rv: 1 });
  };
  S.fly = () => { const t = now(); noise(t, 0.4, 0.22, sfxBus, 'bandpass', 500, 1.4, { fTo: 5000, a: 0.06 }); };
  S.arrive = () => { const t = now(); osc('sine', 520, t, 0.15, 0.18, sfxBus, { to: 780 }); osc('sine', 1040, t + 0.08, 0.2, 0.1, sfxBus, { rv: 1 }); };
  S.fall = (mat = 0) => { // 石板/木板脱落
    const t = now(); noise(t, 0.5, 0.25, sfxBus, 'bandpass', 900, 1, { fTo: 180 });
    osc('triangle', 300, t, 0.45, 0.14, sfxBus, { to: 90 });
    setTimeout(() => { if (!ac) return; const t2 = now(); osc('sine', mat ? 180 : 120, t2, 0.25, 0.35, sfxBus, { to: 50 }); noise(t2, 0.18, 0.25, sfxBus, 'lowpass', mat ? 2400 : 1200, 1); for (let i = 0; i < 4; i++) osc('square', 900 + Math.random() * 1600, t2 + 0.03 + i * 0.04, 0.02, 0.03, sfxBus, { lp: 4000 }); }, 420);
  };
  S.deny = () => { const t = now(); osc('square', 150, t, 0.1, 0.12, sfxBus, { lp: 700 }); noise(t, 0.05, 0.18, sfxBus, 'bandpass', 1500, 3); osc('square', 120, t + 0.1, 0.1, 0.1, sfxBus, { lp: 600 }); };
  S.warn = () => { const t = now(); for (let i = 0; i < 2; i++) { osc('square', 880, t + i * 0.16, 0.1, 0.07, sfxBus, { lp: 2000 }); osc('square', 660, t + i * 0.16 + 0.08, 0.08, 0.06, sfxBus, { lp: 2000 }); } };
  S.addslot = () => { const t = now(); osc('sine', 260, t, 0.12, 0.4, sfxBus, { to: 520 }); [76, 81, 88].forEach((m, i) => osc('triangle', mtof(m), t + 0.1 + i * 0.07, 0.3, 0.15, sfxBus, { rv: 1 })); };
  S.clear = () => { const t = now(); noise(t, 0.5, 0.25, sfxBus, 'bandpass', 400, 1.5, { fTo: 6000, a: 0.1 }); [69, 72, 76, 79, 84, 88].forEach((m, i) => osc('sine', mtof(m), t + 0.15 + i * 0.05, 0.3, 0.14, sfxBus, { rv: 1 })); };
  S.fuse = () => { const t = now(); noise(t, 0.6, 0.18, sfxBus, 'highpass', 5000, 0.8, { a: 0.03 }); for (let i = 0; i < 10; i++) noise(t + Math.random() * 0.55, 0.01, 0.2, sfxBus, 'bandpass', 3000 + Math.random() * 5000, 5); };
  S.boom = () => {
    const t = now(); osc('sine', 120, t, 0.7, 0.9, sfxBus, { to: 28, tt: 0.5 }); noise(t, 0.9, 0.7, sfxBus, 'lowpass', 2200, 0.8, { fTo: 120, rv: 1 });
    noise(t, 0.08, 0.5, sfxBus, 'highpass', 2000, 0.7);
    for (let i = 0; i < 10; i++) osc('square', 600 + Math.random() * 1800, t + 0.2 + Math.random() * 0.6, 0.02, 0.05, sfxBus, { lp: 3500 });
  };
  S.star = (i) => { const t = now(); osc('triangle', mtof(79 + i * 4), t, 0.5, 0.28, sfxBus, { rv: 1 }); osc('sine', mtof(91 + i * 4), t, 0.4, 0.1, sfxBus, { rv: 1 }); noise(t, 0.2, 0.08, sfxBus, 'highpass', 8000); };
  S.win = () => {
    const t = now();
    [62, 66, 69, 74, 78, 81, 86].forEach((m, i) => { osc('triangle', mtof(m), t + i * 0.075, 0.35, 0.2, sfxBus, { rv: 1 }); osc('sine', mtof(m + 12), t + i * 0.075, 0.2, 0.06, sfxBus); });
    [74, 78, 81, 86].forEach(m => osc('triangle', mtof(m), t + 0.6, 1.3, 0.12, sfxBus, { rv: 1 }));
    for (let i = 0; i < 14; i++) osc('sine', 2500 + Math.random() * 4000, t + 0.6 + i * 0.06, 0.12, 0.05, sfxBus, { rv: 1 });
  };
  S.fail = () => { // 八音盒发条耗尽：音高渐降、越来越慢
    const t = now(); const seq = [81, 77, 74, 72, 69, 65, 62]; let tt = t;
    seq.forEach((m, i) => { const det = -i * 18; osc('sine', mtof(m), tt, 0.5, 0.22, sfxBus, { det, rv: 1 }); osc('sine', mtof(m) * 3, tt, 0.15, 0.04, sfxBus, { det }); tt += 0.13 + i * 0.045; });
    osc('sawtooth', 110, tt + 0.05, 0.6, 0.08, sfxBus, { to: 55, lp: 600 });
  };
  S.combo = (k) => { const t = now(); [0, 4, 7, 12].forEach((d, i) => osc('square', mtof(76 + k * 2 + d), t + i * 0.04, 0.12, 0.05, sfxBus, { lp: 5000 })); };
  S.sparkle = () => { const t = now(); for (let i = 0; i < 3; i++) osc('sine', 3500 + Math.random() * 3000, t + i * 0.05, 0.1, 0.035, sfxBus, { rv: 1 }); };
  const play = (n, ...a) => { if (!ac || !sfxOn || ac.state !== 'running') return; try { S[n](...a); } catch (e) { } };
  return { unlock, startMusic, stopMusic, setMusic, setSfx, play, duck, get ctx() { return ac; } };
})();
