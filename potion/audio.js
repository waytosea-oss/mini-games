/* ===== 魔法药水铺 · 音频引擎（WebAudio 实时合成，无外部音频素材） ===== */
const SND = (() => {
  let ac = null, master, musicBus, sfxBus, comp, verbIn, noiseBuf;
  let musicOn = true, sfxOn = true, playing = false, timer = null, nextT = 0, step = 0, loop = 0;
  const BPM = 132, S8 = 60 / BPM / 2; // 3/4 圆舞曲，每小节 6 个八分音符
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  function init() {
    if (ac) return;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ac = new AC();
    comp = ac.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.attack.value = .003; comp.release.value = .2;
    master = ac.createGain(); master.gain.value = .9; master.connect(comp); comp.connect(ac.destination);
    musicBus = ac.createGain(); musicBus.gain.value = musicOn ? .42 : 0; musicBus.connect(master);
    sfxBus = ac.createGain(); sfxBus.gain.value = sfxOn ? .95 : 0; sfxBus.connect(master);
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 1.5, ac.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    // 梦幻回声（双延迟 + 低通）—— 音乐和魔法音效共用
    verbIn = ac.createGain(); verbIn.gain.value = .3;
    const mk = (t, fbv) => { const dl = ac.createDelay(1.5); dl.delayTime.value = t; const fb = ac.createGain(); fb.gain.value = fbv; const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600; verbIn.connect(dl); dl.connect(lp); lp.connect(fb); fb.connect(dl); lp.connect(master); };
    mk(S8 * 3, .32); mk(S8 * 2 + .013, .22);
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
    if (o.vib) { const l = ac.createOscillator(), lg = ac.createGain(); l.frequency.value = o.vib; lg.gain.value = f * (o.vd || .012); l.connect(lg); lg.connect(n.frequency); l.start(t + (o.vdl || .08)); l.stop(t + dur + .1); }
    src.connect(g); g.connect(dest); if (o.send) { const sg = ac.createGain(); sg.gain.value = o.send === true ? 1 : o.send; g.connect(sg); sg.connect(verbIn); }
    n.start(t); n.stop(t + dur + .06); return n;
  }
  function noise(t, dur, vol, dest, type = 'bandpass', f = 3000, q = 1, o = {}) {
    const s = ac.createBufferSource(); s.buffer = noiseBuf; const fl = ac.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, t); fl.Q.value = q;
    if (o.to) fl.frequency.exponentialRampToValueAtTime(o.to, t + dur);
    const g = ac.createGain(); env(g, t, o.a || .002, vol, dur); s.connect(fl); fl.connect(g); g.connect(dest); if (o.send) g.connect(verbIn); s.start(t, Math.random() * .8); s.stop(t + dur + .05);
  }
  /* ---------- BGM：《月光药铺圆舞曲》 D 小调 3/4 · 八音盒 + 拨弦 + 竖琴 + 巴松“嘭嚓嚓” ---------- */
  const CH = { Dm: [50, 53, 57], Gm: [55, 58, 62], C: [48, 52, 55], F: [53, 57, 60], Bb: [46, 50, 53], A7: [45, 49, 55], A: [45, 49, 52] };
  const PROG = ['Dm', 'Gm', 'C', 'F', 'Bb', 'Gm', 'A7', 'Dm', 'F', 'C', 'Dm', 'A', 'Bb', 'C', 'A7', 'Dm'];
  const MEL = [
    [[0, 74, 3], [3, 76, 1], [4, 77, 2]], [[0, 79, 2], [2, 77, 2], [4, 74, 2]], [[0, 76, 3], [3, 74, 1], [4, 72, 2]], [[0, 69, 4], [4, 72, 2]],
    [[0, 74, 3], [3, 77, 1], [4, 74, 2]], [[0, 70, 2], [2, 74, 2], [4, 79, 2]], [[0, 76, 2], [2, 73, 2], [4, 69, 2]], [[0, 74, 5]],
    [[0, 81, 3], [3, 79, 1], [4, 77, 2]], [[0, 76, 2], [2, 79, 2], [4, 84, 2]], [[0, 81, 3], [3, 77, 1], [4, 74, 2]], [[0, 73, 2], [2, 76, 2], [4, 81, 2]],
    [[0, 82, 3], [3, 81, 1], [4, 79, 2]], [[0, 79, 2], [2, 76, 2], [4, 72, 2]], [[0, 73, 2], [2, 76, 2], [4, 79, 2]], [[0, 74, 4]],
  ];
  function musicbox(m, t, v = 1, dur = .9) { const f = mtof(m); osc('sine', f, t, dur, .11 * v, musicBus, { send: .6 }); osc('sine', f * 3.01, t, .25, .025 * v, musicBus); osc('triangle', f * 2, t, .12, .02 * v, musicBus); }
  function celesta(m, t, dur, v = 1) { const f = mtof(m); osc('triangle', f, t, dur + .2, .07 * v, musicBus, { a: .01, send: .5, lp: 3200 }); osc('sine', f * 2, t, dur * .6, .05 * v, musicBus, { a: .01 }); }
  function pizz(m, t, v = 1) { osc('triangle', mtof(m), t, .22, .12 * v, musicBus, { lp: 2000, lpTo: 500, q: 3 }); }
  function harp(m, t, v = 1) { osc('triangle', mtof(m), t, .7, .05 * v, musicBus, { lp: 3000, lpTo: 900, send: .4 }); osc('sine', mtof(m) * 2, t, .3, .015 * v, musicBus); }
  function bassoon(m, t, dur) { osc('square', mtof(m), t, dur, .07, musicBus, { lp: 520, q: 2, a: .02 }); osc('triangle', mtof(m), t, dur, .18, musicBus, { lp: 400 }); }
  function pad(ch, t, dur) { for (const n of CH[ch]) { osc('sawtooth', mtof(n + 12), t, dur, .012, musicBus, { lp: 900, a: .25, det: 7 }); osc('sawtooth', mtof(n + 12), t, dur, .012, musicBus, { lp: 900, a: .25, det: -7 }); } }
  function chime(t) { noise(t, .3, .03, musicBus, 'highpass', 8000, .5, { send: true }); }
  function sched(s, t) {
    const bar = Math.floor(s / 6) % 16, st = s % 6, ch = PROG[bar], intro = loop === 0 && bar < 2;
    const tri = CH[ch];
    // 嘭-嚓-嚓
    if (st === 0) bassoon(tri[0] - 12, t, S8 * 1.6);
    if (!intro && (st === 2 || st === 4)) { pizz(tri[1] + 12, t, .8); pizz(tri[2] + 12, t + .005, .7); }
    if (st === 0) pad(ch, t, S8 * 6);
    // 竖琴分解
    if (loop % 2 === 1 || bar >= 8) { const arp = [tri[0] + 24, tri[1] + 24, tri[2] + 24, tri[0] + 36, tri[2] + 24, tri[1] + 24]; harp(arp[st], t, .7); }
    if (!intro) for (const [p, m, l] of MEL[bar]) if (p === st) { musicbox(m, t, loop % 2 ? .8 : 1, l * S8 * 1.6); if (loop % 2 || bar >= 8) celesta(m + 12, t, l * S8 * .9, .5); }
    if (bar % 4 === 3 && st === 5) chime(t);
  }
  function tick() { if (!playing) return; while (nextT < now() + .15) { sched(step, nextT); nextT += S8; step++; if (step % 96 === 0) loop++; } }
  function startMusic() { init(); if (!ac || playing) return; playing = true; nextT = now() + .08; step = 0; loop = 0; timer = setInterval(tick, 40); }
  function stopMusic() { playing = false; clearInterval(timer); timer = null; }
  function setMusic(on) { musicOn = on; if (musicBus) musicBus.gain.setTargetAtTime(on ? .42 : 0, now(), .05); }
  function setSfx(on) { sfxOn = on; if (sfxBus) sfxBus.gain.setTargetAtTime(on ? .95 : 0, now(), .03); }
  /* ---------- 音效 ---------- */
  const B = () => sfxBus;
  const fx = {
    click() { const t = now(); osc('sine', 880, t, .06, .22, B(), { to: 1320 }); osc('triangle', 1760, t, .03, .06, B()); },
    pick() { const t = now(); osc('sine', 2350, t, .18, .16, B()); osc('sine', 3520, t, .1, .06, B()); osc('sine', 600, t, .08, .12, B(), { to: 900 }); },
    drop() { const t = now(); osc('sine', 1900, t, .14, .12, B()); osc('sine', 700, t, .07, .1, B(), { to: 480 }); },
    bad() { const t = now(); osc('sine', 330, t, .12, .3, B(), { to: 220 }); osc('triangle', 1250, t, .05, .06, B()); noise(t, .05, .12, B(), 'lowpass', 900, 1); },
    // 倒水：咕噜气泡 + 渐升的“灌瓶”共鸣
    pour(dur = .6, fill0 = .2, fill1 = .9) {
      const t = now();
      const s = ac.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
      const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 6;
      bp.frequency.setValueAtTime(380 + fill0 * 900, t); bp.frequency.linearRampToValueAtTime(380 + fill1 * 1100, t + dur);
      const g = ac.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(.32, t + .06); g.gain.setValueAtTime(.32, t + dur - .08); g.gain.exponentialRampToValueAtTime(.0001, t + dur + .05);
      s.connect(bp); bp.connect(g); g.connect(B()); s.start(t); s.stop(t + dur + .1);
      noise(t, dur, .05, B(), 'highpass', 5000, .5);
      for (let k = 0, tt = t + .03; tt < t + dur; k++, tt += .035 + Math.random() * .05) { const f = 300 + Math.random() * 500 + fill1 * 300; osc('sine', f, tt, .05, .09, B(), { to: f * 2.3, tt: .04 }); }
    },
    magicPour(dur = .7) { const t = now(); for (let i = 0; i < 9; i++) osc('sine', mtof(84 + [0, 3, 7, 10, 12, 15, 19, 22, 24][i]), t + i * dur / 10, .2, .05, B(), { send: true }); fx.pour(dur, .2, .7); },
    cork() { const t = now(); osc('sine', 420, t, .09, .45, B(), { to: 1400, tt: .05 }); noise(t, .03, .3, B(), 'highpass', 2500, .8); osc('sine', 180, t + .03, .1, .2, B(), { to: 90 }); },
    done() { const t = now(); [74, 78, 81, 86, 90].forEach((m, i) => { osc('triangle', mtof(m), t + .05 + i * .06, .5, .1, B(), { send: true }); osc('sine', mtof(m + 12), t + .05 + i * .06, .25, .04, B()); }); noise(t + .1, .5, .05, B(), 'highpass', 9000, .5, { a: .1 }); },
    bell() { const t = now(); for (const [dt, f] of [[0, 1568], [.13, 1319]]) { osc('sine', f, t + dt, .7, .1, B(), { send: .5 }); osc('sine', f * 2.76, t + dt, .2, .03, B()); osc('sine', f * 5.4, t + dt, .08, .015, B()); } },
    deliver() { const t = now(); osc('square', 988, t, .07, .06, B(), { lp: 5000 }); osc('square', 1319, t + .07, .25, .06, B(), { lp: 5000 });
      const n = osc('triangle', 520, t + .1, .22, .14, B(), { lp: 2400 }); n.frequency.setValueAtTime(520, t + .1); n.frequency.exponentialRampToValueAtTime(980, t + .2); n.frequency.exponentialRampToValueAtTime(760, t + .3); },
    coin() { const t = now(); osc('square', 1568, t, .05, .04, B(), { lp: 6000 }); osc('square', 2093, t + .05, .12, .04, B(), { lp: 6000 }); },
    reveal() { const t = now(); for (let i = 0; i < 7; i++) osc('sine', mtof(79 + i * 2 + (i % 2) * 3), t + i * .05, .5, .06, B(), { send: true }); noise(t, .6, .08, B(), 'bandpass', 3000, 2, { to: 9000, a: .2 }); },
    peek() { const t = now(); osc('sine', 1400, t, .2, .06, B(), { to: 2100, send: true }); },
    crack() { const t = now(); for (let i = 0; i < 6; i++) noise(t + i * .025, .03, .25, B(), 'bandpass', 3000 + Math.random() * 4000, 4); osc('sine', 3200, t, .06, .05, B()); },
    shatter() { const t = now(); noise(t, .4, .35, B(), 'highpass', 3000, .7); for (let i = 0; i < 10; i++) osc('sine', 2500 + Math.random() * 3500, t + Math.random() * .25, .12, .05, B()); osc('sine', 200, t, .15, .3, B(), { to: 80 }); },
    undo() { const t = now(); noise(t, .35, .18, B(), 'bandpass', 3500, 2, { to: 500, a: .2 }); [88, 84, 81, 76].forEach((m, i) => osc('sine', mtof(m), t + .08 + i * .06, .25, .07, B(), { send: true })); },
    addflask() { const t = now(); noise(t, .3, .25, B(), 'bandpass', 800, 1.2, { to: 3000, a: .05 }); [72, 79, 84, 88].forEach((m, i) => osc('triangle', mtof(m), t + .1 + i * .05, .3, .1, B(), { send: true })); },
    hint() { const t = now(); for (const [dt, f] of [[0, 392], [.24, 370]]) { const n = osc('sine', f, t + dt, .2, .22, B(), { a: .03, vib: 9, vd: .02 }); n.frequency.setValueAtTime(f * .92, t + dt); n.frequency.linearRampToValueAtTime(f, t + dt + .06); } [88, 91, 96].forEach((m, i) => osc('sine', mtof(m), t + .5 + i * .07, .3, .06, B(), { send: true })); },
    star(i) { const t = now(); const m = [79, 84, 88][i] || 88; osc('triangle', mtof(m), t, .4, .18, B(), { send: true }); osc('sine', mtof(m + 12), t, .4, .07, B()); noise(t, .2, .05, B(), 'highpass', 7000); },
    win() { const t = now(); const seq = [[0, 74], [.12, 78], [.24, 81], [.36, 86], [.55, 90]]; for (const [dt, m] of seq) { osc('triangle', mtof(m), t + dt, .4, .14, B(), { send: true }); osc('sine', mtof(m - 12), t + dt, .3, .08, B()); }
      for (let i = 0; i < 12; i++) osc('triangle', mtof(74 + [0, 4, 7, 12, 16, 19, 24, 28, 31, 36, 40, 43][i] - 12), t + .7 + i * .035, .5, .05, B(), { send: true });
      [62, 66, 69, 74].forEach(m => osc('triangle', mtof(m), t + .7, 1.2, .07, B())); },
    fail() { const t = now(); [[0, 69], [.3, 68], [.6, 67], [.9, 62]].forEach(([dt, m], i) => osc('triangle', mtof(m), t + dt, i === 3 ? .9 : .3, .14, B(), { lp: 1600, vib: i === 3 ? 5 : 0, send: true })); },
    poof() { const t = now(); noise(t, .25, .2, B(), 'lowpass', 1200, 1, { to: 300 }); osc('sine', 300, t, .2, .15, B(), { to: 900 }); },
  };
  function play(name, ...a) { if (!ac || !sfxOn) return; try { fx[name] && fx[name](...a); } catch (e) { (window.__sndErr = window.__sndErr || []).push(name + ':' + e.message); } }
  return { unlock, startMusic, stopMusic, setMusic, setSfx, play, get ctx() { return ac; }, get playing() { return playing; } };
})();
