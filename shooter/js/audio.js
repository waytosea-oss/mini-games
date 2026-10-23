// 星际雷霆 — WebAudio 合成音乐与音效（原创）
'use strict';
const Sound = (() => {
  let ac = null, master, musicBus, sfxBus, comp, noiseBuf, delayIn;
  let musicOn = true, sfxOn = true;
  let waves = {};
  let cur = null;           // current song player
  let timer = null;
  const last = {};
  function init() {
    if (ac) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try { ac = new AC(); } catch (e) { return false; }
    comp = ac.createDynamicsCompressor();
    comp.threshold.value = -12; comp.knee.value = 10; comp.ratio.value = 5;
    comp.attack.value = 0.003; comp.release.value = 0.2;
    comp.connect(ac.destination);
    master = ac.createGain(); master.gain.value = 0.9; master.connect(comp);
    musicBus = ac.createGain(); musicBus.gain.value = musicOn ? 0.62 : 0; musicBus.connect(master);
    sfxBus = ac.createGain(); sfxBus.gain.value = sfxOn ? 0.85 : 0; sfxBus.connect(master);
    // echo for music leads
    delayIn = ac.createGain(); delayIn.gain.value = 1;
    const d = ac.createDelay(1); d.delayTime.value = 0.3;
    const fb = ac.createGain(); fb.gain.value = 0.32;
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600;
    const wet = ac.createGain(); wet.gain.value = 0.28;
    delayIn.connect(d); d.connect(lp); lp.connect(fb); fb.connect(d); lp.connect(wet); wet.connect(musicBus);
    // noise
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 1.5, ac.sampleRate);
    const ch = noiseBuf.getChannelData(0);
    for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
    // pulse waves
    const pulse = (duty) => {
      const n = 48, re = new Float32Array(n), im = new Float32Array(n);
      for (let k = 1; k < n; k++) re[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
      return ac.createPeriodicWave(re, im);
    };
    waves.p25 = pulse(0.25); waves.p12 = pulse(0.125); waves.p50 = pulse(0.5);
    document.addEventListener('visibilitychange', () => {
      if (!ac) return;
      if (document.hidden) ac.suspend(); else ac.resume();
    });
    return true;
  }
  function unlock() {
    if (!init()) return;
    if (ac.state !== 'running') ac.resume();
    const b = ac.createBuffer(1, 1, 22050), s = ac.createBufferSource();
    s.buffer = b; s.connect(ac.destination); s.start(0);
  }
  function setMusic(on) { musicOn = on; if (musicBus) musicBus.gain.setTargetAtTime(on ? 0.62 : 0, ac.currentTime, 0.05); }
  function setSfx(on) { sfxOn = on; if (sfxBus) sfxBus.gain.setTargetAtTime(on ? 0.85 : 0, ac.currentTime, 0.02); }
  const ok = () => ac && ac.state === 'running';
  const throttle = (k, gap) => { const t = performance.now(); if (last[k] && t - last[k] < gap) return false; last[k] = t; return true; };
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

  // ---------- primitive voices ----------
  function osc(o) {
    const t = (o.when != null ? o.when : ac.currentTime);
    const g = ac.createGain();
    const os = ac.createOscillator();
    if (waves[o.type]) os.setPeriodicWave(waves[o.type]); else os.type = o.type || 'square';
    os.frequency.setValueAtTime(o.f, t);
    if (o.f2) {
      if (o.lin) os.frequency.linearRampToValueAtTime(o.f2, t + (o.slide || o.dur));
      else os.frequency.exponentialRampToValueAtTime(Math.max(1, o.f2), t + (o.slide || o.dur));
    }
    if (o.detune) os.detune.value = o.detune;
    const v = o.vol || 0.2, a = o.a || 0.004, dur = o.dur, rel = o.rel != null ? o.rel : 0.04;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(v, t + a);
    if (o.sus != null) { g.gain.setTargetAtTime(v * o.sus, t + a, (o.dec || 0.08)); g.gain.setValueAtTime(v * o.sus, t + dur); }
    else g.gain.exponentialRampToValueAtTime(Math.max(0.0001, v * 0.3), t + dur);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + rel);
    let node = os;
    if (o.vib) {
      const l = ac.createOscillator(), lg = ac.createGain();
      l.frequency.value = o.vib; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(o.f * 0.012, t + 0.25);
      l.connect(lg); lg.connect(os.frequency); l.start(t); l.stop(t + dur + rel + 0.05);
    }
    if (o.lp) {
      const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(o.lp, t); f.Q.value = o.q || 1;
      if (o.lp2) f.frequency.exponentialRampToValueAtTime(o.lp2, t + dur);
      node.connect(f); node = f;
    }
    node.connect(g);
    g.connect(o.dest || sfxBus);
    if (o.send) g.connect(delayIn);
    os.start(t); os.stop(t + dur + rel + 0.05);
    return g;
  }
  function noise(o) {
    const t = (o.when != null ? o.when : ac.currentTime);
    const s = ac.createBufferSource(); s.buffer = noiseBuf;
    if (o.rate) s.playbackRate.value = o.rate;
    const f = ac.createBiquadFilter(); f.type = o.ft || 'lowpass';
    f.frequency.setValueAtTime(o.f || 3000, t); f.Q.value = o.q || 0.8;
    if (o.f2) f.frequency.exponentialRampToValueAtTime(o.f2, t + o.dur);
    const g = ac.createGain(); const v = o.vol || 0.2;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + (o.a || 0.003));
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    s.connect(f); f.connect(g); g.connect(o.dest || sfxBus);
    s.start(t, Math.random() * 0.5); s.stop(t + o.dur + 0.05);
  }

  // ---------- SFX ----------
  const sfx = {
    shot() { if (!ok() || !throttle('shot', 85)) return;
      osc({ type: 'p25', f: 1400 + Math.random() * 120, f2: 500, dur: 0.045, vol: 0.035, rel: 0.01 }); },
    missile() { if (!ok() || !throttle('mis', 140)) return;
      noise({ ft: 'bandpass', f: 3000, f2: 700, q: 2, dur: 0.18, vol: 0.09 });
      osc({ type: 'sawtooth', f: 300, f2: 900, dur: 0.12, vol: 0.025, lp: 2000 }); },
    hit() { if (!ok() || !throttle('hit', 55)) return;
      noise({ ft: 'highpass', f: 2500, dur: 0.035, vol: 0.06 });
      osc({ type: 'square', f: 300 + Math.random() * 80, f2: 120, dur: 0.03, vol: 0.03 }); },
    ping() { if (!ok() || !throttle('ping', 90)) return;
      osc({ type: 'triangle', f: 2600, f2: 2400, dur: 0.06, vol: 0.06 }); },
    boomS() { if (!ok() || !throttle('bs', 40)) return;
      noise({ f: 4000, f2: 150, dur: 0.32, vol: 0.22 });
      osc({ type: 'square', f: 220, f2: 40, dur: 0.18, vol: 0.09, lp: 1200 }); },
    boomM() { if (!ok() || !throttle('bm', 60)) return;
      noise({ f: 3000, f2: 90, dur: 0.6, vol: 0.32 });
      osc({ type: 'sine', f: 140, f2: 35, dur: 0.45, vol: 0.32 });
      osc({ type: 'square', f: 180, f2: 30, dur: 0.3, vol: 0.08, lp: 900 }); },
    boomL() { if (!ok() || !throttle('bl', 120)) return;
      noise({ f: 2500, f2: 60, dur: 1.4, vol: 0.45 });
      noise({ ft: 'bandpass', f: 900, f2: 120, q: 1.5, dur: 0.9, vol: 0.25 });
      osc({ type: 'sine', f: 110, f2: 25, dur: 1.1, vol: 0.5 }); },
    power() { if (!ok()) return; const t = ac.currentTime;
      [72, 76, 79, 84, 88].forEach((m, i) => osc({ type: 'p25', f: mtof(m), dur: 0.07, vol: 0.09, when: t + i * 0.045 }));
      osc({ type: 'triangle', f: mtof(96), dur: 0.25, vol: 0.06, when: t + 0.22, vib: 9 }); },
    coin() { if (!ok() || !throttle('coin', 45)) return; const t = ac.currentTime, k = (Math.random() * 3) | 0;
      osc({ type: 'p50', f: mtof(83 + k), dur: 0.05, vol: 0.05, when: t });
      osc({ type: 'p50', f: mtof(88 + k), dur: 0.12, vol: 0.05, when: t + 0.05 }); },
    bombItem() { if (!ok()) return; const t = ac.currentTime;
      [60, 67, 72, 79].forEach((m, i) => osc({ type: 'p12', f: mtof(m), dur: 0.09, vol: 0.1, when: t + i * 0.06 })); },
    bomb() { if (!ok()) return; const t = ac.currentTime;
      noise({ f: 300, f2: 6000, dur: 0.45, vol: 0.25, a: 0.4, when: t });
      noise({ f: 5000, f2: 40, dur: 2.2, vol: 0.55, when: t + 0.42 });
      osc({ type: 'sine', f: 90, f2: 22, dur: 1.8, vol: 0.6, when: t + 0.42 });
      osc({ type: 'sawtooth', f: 200, f2: 1800, dur: 0.42, vol: 0.06, lp: 3000, when: t }); },
    die() { if (!ok()) return; const t = ac.currentTime;
      osc({ type: 'square', f: 900, f2: 50, dur: 0.8, vol: 0.12, lp: 3000, lp2: 300 });
      noise({ f: 3000, f2: 80, dur: 1.2, vol: 0.45, when: t + 0.05 });
      osc({ type: 'sine', f: 120, f2: 28, dur: 0.9, vol: 0.45, when: t + 0.05 }); },
    warning() { if (!ok()) return; const t = ac.currentTime;
      for (let i = 0; i < 6; i++) {
        osc({ type: 'sawtooth', f: 620, f2: 420, dur: 0.38, vol: 0.09, lp: 2200, when: t + i * 0.45, sus: 0.9 });
        osc({ type: 'square', f: 310, f2: 210, dur: 0.38, vol: 0.05, lp: 1500, when: t + i * 0.45, sus: 0.9 });
      } },
    click() { if (!ok()) return; osc({ type: 'p25', f: 1200, f2: 1800, dur: 0.04, vol: 0.08 }); },
    back() { if (!ok()) return; osc({ type: 'p25', f: 900, f2: 500, dur: 0.05, vol: 0.07 }); },
    deny() { if (!ok()) return; const t = ac.currentTime;
      osc({ type: 'square', f: 180, dur: 0.08, vol: 0.08, lp: 1200, when: t });
      osc({ type: 'square', f: 140, dur: 0.14, vol: 0.08, lp: 1200, when: t + 0.1 }); },
    buy() { if (!ok()) return; const t = ac.currentTime;
      [76, 79, 84].forEach((m, i) => osc({ type: 'p50', f: mtof(m), dur: 0.08, vol: 0.08, when: t + i * 0.07 }));
      osc({ type: 'p25', f: mtof(88), dur: 0.3, vol: 0.08, when: t + 0.21, vib: 7 }); },
    evolve() { if (!ok()) return; const t = ac.currentTime;
      osc({ type: 'sawtooth', f: 200, f2: 1600, dur: 0.6, vol: 0.06, lp: 4000, when: t });
      noise({ ft: 'bandpass', f: 800, f2: 8000, q: 3, dur: 0.6, vol: 0.12, when: t });
      [[72, 76, 79], [74, 78, 81], [76, 80, 83, 88]].forEach((ch, i) => ch.forEach(m =>
        osc({ type: 'p25', f: mtof(m), dur: i == 2 ? 0.6 : 0.12, vol: 0.05, when: t + 0.6 + i * 0.14, vib: i == 2 ? 6 : 0 }))); },
    phase() { if (!ok()) return; const t = ac.currentTime;
      osc({ type: 'sawtooth', f: 80, f2: 400, dur: 0.5, vol: 0.12, lp: 1500, when: t });
      noise({ f: 2000, f2: 100, dur: 0.8, vol: 0.3, when: t }); },
    charge() { if (!ok()) return;
      osc({ type: 'sawtooth', f: 120, f2: 900, dur: 0.9, vol: 0.07, lp: 2500, slide: 0.9 }); },
    beam() { if (!ok()) return;
      noise({ ft: 'bandpass', f: 600, q: 0.7, dur: 1.0, vol: 0.25 });
      osc({ type: 'sawtooth', f: 70, dur: 1.0, vol: 0.12, lp: 600, sus: 0.8 }); },
    star(i) { if (!ok()) return; osc({ type: 'p25', f: mtof(79 + i * 5), dur: 0.18, vol: 0.09, vib: 6 }); },
  };
  // continuous laser hum (Lancer)
  let hum = null;
  function laser(on) {
    if (!ok()) return;
    if (on && !hum) {
      const t = ac.currentTime;
      const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.045, t + 0.06);
      const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1400; f.Q.value = 4;
      const o1 = ac.createOscillator(); o1.type = 'sawtooth'; o1.frequency.value = 220;
      const o2 = ac.createOscillator(); o2.type = 'square'; o2.frequency.value = 331;
      const l = ac.createOscillator(); l.frequency.value = 14; const lg = ac.createGain(); lg.gain.value = 500;
      l.connect(lg); lg.connect(f.frequency);
      o1.connect(f); o2.connect(f); f.connect(g); g.connect(sfxBus);
      o1.start(); o2.start(); l.start();
      hum = { g, o: [o1, o2, l] };
    } else if (!on && hum) {
      const h = hum; hum = null; const t = ac.currentTime;
      h.g.gain.cancelScheduledValues(t); h.g.gain.setTargetAtTime(0.0001, t, 0.03);
      h.o.forEach(o => o.stop(t + 0.2));
    }
  }

  // ---------- Music tracker ----------
  const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function nm(s) { const m = /^([A-G])(#|b)?(-?\d)$/.exec(s); if (!m) return null;
    return NOTE[m[1]] + (m[2] == '#' ? 1 : m[2] == 'b' ? -1 : 0) + (+m[3] + 1) * 12; }
  // "E5:4 .:2 G5:2" -> step array of {m,len}|null
  function mel(str, bars) {
    const steps = new Array(bars * 16).fill(null); let i = 0;
    str.trim().split(/\s+/).forEach(tok => {
      const [n, l] = tok.split(':'); const len = +(l || 1);
      if (n !== '.' && i < steps.length) steps[i] = { m: nm(n), len };
      i += len;
    });
    return steps;
  }
  function chord(sym) {
    const m = /^([A-G])(#|b)?(m|dim|7|sus)?$/.exec(sym);
    const root = NOTE[m[1]] + (m[2] == '#' ? 1 : m[2] == 'b' ? -1 : 0);
    const iv = m[3] == 'm' ? [0, 3, 7] : m[3] == 'dim' ? [0, 3, 6] : m[3] == '7' ? [0, 4, 7, 10] : m[3] == 'sus' ? [0, 5, 7] : [0, 4, 7];
    return { root, iv };
  }
  const DRUMS = {
    soft:  { k: 'x.......x.......', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.', o: '' },
    rock:  { k: 'x.....x.x.......', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.', o: '..............x.' },
    drive: { k: 'x...x...x...x...', s: '....x.......x..x', h: 'xxxxxxxxxxxxxxxx', o: '..x...x...x...x.' },
    funk:  { k: 'x.....x...x..x..', s: '....x.......x...', h: 'xxxxxxxxxxxxxxxx', o: '' },
    boss:  { k: 'x.x.x.x.x.x.x.xx', s: '....x.......x.x.', h: 'x.xxx.xxx.xxx.xx', o: '' },
    ice:   { k: 'x.........x.....', s: '....x.......x...', h: '..x...x...x...x.', o: 'x.......x.......' },
  };
  const SONGS = {
    menu: { bpm: 100, bars: 8, chords: 'Am F C G Am F G E', bass: 'walk', arp: 'up', pad: true, drums: 'soft',
      lead: 'E5:6 D5:2 C5:4 B4:2 C5:2 A4:8 .:4 C5:2 D5:2 E5:6 G5:2 E5:4 D5:2 C5:2 D5:8 .:4 B4:2 D5:2 E5:6 D5:2 C5:4 E5:2 A5:2 A5:6 G5:2 F5:4 E5:2 F5:2 G5:4 F5:2 E5:2 D5:4 B4:4 G#4:8 B4:4 E5:4',
      leadType: 'p25', drumsFromBar: 2 },
    stageA: { bpm: 150, bars: 16, chords: 'Em C D B Em C Am B C D Em Em C D B B', bass: 'pump', arp: 'up', drums: 'drive',
      lead: 'E5:3 E5:1 G5:2 E5:2 B5:4 A5:2 G5:2 E5:6 D5:2 C5:2 D5:2 E5:4 F#5:3 F#5:1 A5:2 F#5:2 D6:4 C6:2 B5:2 B5:8 A5:2 G5:2 F#5:2 D#5:2 ' +
            'E5:3 E5:1 G5:2 B5:2 E6:4 D6:2 B5:2 C6:4 B5:2 G5:2 E5:4 G5:2 A5:2 A5:3 G5:1 F#5:2 E5:2 C5:4 E5:2 A5:2 B5:6 .:2 D#5:4 F#5:4 ' +
            'G5:8 E5:4 G5:4 A5:8 F#5:4 D5:4 B5:12 A5:2 G5:2 E5:8 .:4 B4:2 E5:2 G5:6 A5:2 G5:4 E5:4 F#5:6 G5:2 A5:4 D6:4 D#6:8 B5:4 F#5:4 B5:8 .:8' },
    stageB: { bpm: 140, bars: 16, chords: 'Dm Bb C Am Dm Bb Gm A Bb C Dm Dm Gm A Dm A', bass: 'funk', arp: 'updown', drums: 'funk',
      lead: 'D5:2 .:1 D5:1 F5:2 A5:2 G5:2 F5:2 E5:2 F5:2 D5:6 .:2 Bb4:2 C5:2 D5:4 E5:2 .:1 E5:1 G5:2 C6:2 Bb5:2 A5:2 G5:2 E5:2 A5:8 .:4 E5:2 G5:2 ' +
            'F5:2 .:1 F5:1 A5:2 D6:2 C6:2 A5:2 F5:2 A5:2 Bb5:4 A5:2 F5:2 D5:4 F5:4 G5:4 Bb5:4 D6:4 C6:2 Bb5:2 A5:8 C#6:4 E6:4 ' +
            'F5:8 D5:4 F5:4 G5:8 E5:4 C5:4 A5:4 G5:2 F5:2 E5:4 F5:4 D5:12 .:4 Bb5:6 A5:2 G5:4 D5:4 C#5:6 E5:2 A5:4 G5:4 F5:4 E5:2 D5:2 A5:4 F5:4 E5:8 A4:8' },
    stageC: { bpm: 128, bars: 8, chords: 'F#m D A E F#m D Bm C#', bass: 'pump', arp: 'sparkle', pad: true, drums: 'ice',
      lead: 'C#6:4 B5:2 A5:2 F#5:6 E5:2 F#5:4 A5:4 D6:6 C#6:2 E6:8 C#6:4 A5:4 B5:8 G#5:4 E5:4 F#5:2 G#5:2 A5:4 C#6:4 F#6:4 E6:4 D6:4 A5:4 F#5:4 D6:4 C#6:2 B5:2 A5:4 F#5:4 G#5:8 F5:4 C#5:4' },
    boss: { bpm: 168, bars: 8, chords: 'Cm Cm Ab Bb Cm Cm Db G', bass: 'boss', arp: 'up', drums: 'boss',
      lead: 'C5:2 C5:2 Eb5:2 C5:2 G5:4 F#5:2 G5:2 Ab5:2 G5:2 F5:2 Eb5:2 D5:4 Eb5:2 D5:2 C5:2 C5:2 Eb5:2 Ab5:2 C6:4 Bb5:2 Ab5:2 Bb5:8 D6:4 F6:4 ' +
            'G5:2 G5:2 C6:2 G5:2 Eb6:4 D6:2 C6:2 B5:2 C6:2 D6:2 Eb6:2 D6:4 C6:2 B5:2 Db6:4 C6:2 Bb5:2 Ab5:4 F5:4 G5:4 B5:4 D6:4 G6:4', leadType: 'sawtooth' },
    clear: { bpm: 150, bars: 3, once: true, chords: 'C F G', bass: 'hold', arp: 'none', drums: null,
      lead: 'G4:2 C5:2 E5:2 G5:2 C6:4 .:4 A5:2 C6:2 F6:4 .:2 E6:2 D6:2 C6:2 D6:16' },
    over: { bpm: 90, bars: 2, once: true, chords: 'Am Fm', bass: 'hold', arp: 'none', drums: null,
      lead: 'E5:3 D#5:3 D5:3 C#5:3 C5:4 Ab4:8 .:8' },
    ending: { bpm: 112, bars: 8, chords: 'C G Am F C G F C', bass: 'walk', arp: 'up', pad: true, drums: 'soft',
      lead: 'E5:4 G5:4 C6:6 B5:2 B5:4 A5:4 G5:8 A5:4 C6:4 E6:6 D6:2 C6:8 .:4 A5:4 G5:4 E5:4 C5:4 E5:4 D5:8 B4:8 F5:4 A5:4 C6:4 F6:4 E6:16' },
  };
  function buildSong(s) {
    const ch = s.chords.split(' ').map(chord);
    return { s, ch, lead: mel(s.lead, s.bars) };
  }
  const built = {};
  function play(name, transpose = 0, speed = 1) {
    if (!init()) return;
    const prevName = cur && cur.name;
    if (prevName === name && cur.tr === transpose) return;
    stopMusic();
    const song = built[name] || (built[name] = buildSong(SONGS[name]));
    const g = ac.createGain(); g.gain.value = 1; g.connect(musicBus);
    cur = { name, song, g, step: 0, t: ac.currentTime + 0.08, tr: transpose, spd: speed };
    if (!timer) timer = setInterval(sched, 25);
  }
  function stopMusic() {
    if (!cur) return;
    const c = cur; cur = null;
    if (ac) { c.g.gain.setTargetAtTime(0.0001, ac.currentTime, 0.08); setTimeout(() => { try { c.g.disconnect(); } catch (e) {} }, 800); }
  }
  function sched() {
    if (!cur || !ac || ac.state !== 'running') return;
    const c = cur, S = c.song.s, stepDur = 60 / (S.bpm * c.spd) / 4, total = S.bars * 16;
    if (c.t < ac.currentTime - 0.2) c.t = ac.currentTime + 0.05;
    while (c.t < ac.currentTime + 0.15) {
      if (c.step >= total) { if (S.once) { stopAfter(c); return; } c.step = 0; }
      playStep(c, c.step, c.t, stepDur);
      c.step++; c.t += stepDur;
    }
  }
  function stopAfter(c) { setTimeout(() => { if (cur === c) cur = null; }, 1500); c.step = 1e9; }
  function playStep(c, st, t, sd) {
    const S = c.song.s, bar = st >> 4, s16 = st & 15, chd = c.song.ch[bar % c.song.ch.length], tr = c.tr, dest = c.g;
    const root = chd.root + tr;
    // lead
    const L = c.song.lead[st];
    if (L && L.m != null) {
      const f = mtof(L.m + tr), dur = L.len * sd * 0.92;
      const lt = S.leadType || 'p25';
      const lv = lt === 'sawtooth' ? 0.05 : 0.075;
      osc({ type: lt, f, dur, vol: lv, sus: 0.7, dec: 0.1, rel: 0.06, vib: dur > 0.3 ? 5.5 : 0, dest, send: true, when: t, lp: lt === 'sawtooth' ? 3200 : 0 });
      osc({ type: 'p12', f: f * 1.003, dur, vol: lv * 0.45, sus: 0.6, rel: 0.05, dest, when: t, detune: 8 });
    }
    // bass
    const bm = 36 + ((root % 12) + 12) % 12; // C2..B2
    const B = (m, len, v = 0.16) => osc({ type: 'triangle', f: mtof(m), dur: len * sd * 0.9, vol: v, rel: 0.03, dest, when: t }) &&
      osc({ type: 'sawtooth', f: mtof(m), dur: len * sd * 0.6, vol: v * 0.35, lp: 700, lp2: 200, rel: 0.02, dest, when: t });
    switch (S.bass) {
      case 'pump': if (s16 % 2 == 0) B(s16 % 4 == 0 ? bm : bm + 12, 2); break;
      case 'walk': if (s16 % 4 == 0) B([bm, bm + 7, bm + 12, bm + 7][s16 / 4], 4, 0.15); break;
      case 'funk': { const p = 'x..x..x.x.x..x.x'; if (p[s16] == 'x') B(s16 == 6 || s16 == 13 ? bm + 12 : (s16 == 10 ? bm + 7 : bm), 1.5, 0.17); } break;
      case 'boss': B(s16 % 8 == 6 ? bm + 12 : (s16 % 8 == 7 ? bm + 10 : bm), 1, 0.15); break;
      case 'hold': if (s16 == 0) B(bm, 16, 0.12); break;
    }
    // arp
    const iv = chd.iv;
    if (S.arp !== 'none') {
      let m = null;
      if (S.arp === 'up' && s16 % 2 == 0) { const k = (s16 / 2) % iv.length; m = 72 + ((root % 12) + 12) % 12 + iv[k] - 12 + (s16 >= 8 ? 12 : 0); }
      if (S.arp === 'updown') { const seq = [0, 1, 2, 1]; const k = seq[s16 % 4] % iv.length; if (s16 % 2 == 0 || S.bpm < 150) m = 60 + ((root % 12) + 12) % 12 + iv[k] + 12; }
      if (S.arp === 'sparkle') { const k = s16 % iv.length; m = 72 + ((root % 12) + 12) % 12 + iv[k] + (s16 % 8 >= 4 ? 12 : 0); }
      if (m != null) osc({ type: 'p50', f: mtof(m), dur: sd * 0.7, vol: S.arp === 'sparkle' ? 0.028 : 0.03, rel: 0.02, dest, when: t, send: S.arp === 'sparkle' });
    }
    if (S.pad && s16 == 0) iv.forEach((x, i) => osc({ type: 'sawtooth', f: mtof(60 + ((root % 12) + 12) % 12 + x), dur: 16 * sd, vol: 0.018, a: 0.3, sus: 0.8, rel: 0.4, lp: 1100, dest, when: t, detune: i * 5 - 5 }));
    // drums
    if (S.drums && bar >= (S.drumsFromBar || 0)) {
      const D = DRUMS[S.drums];
      if (D.k[s16] == 'x') { osc({ type: 'sine', f: 160, f2: 42, dur: 0.14, vol: 0.42, rel: 0.02, dest, when: t }); }
      if (D.s[s16] == 'x') { noise({ ft: 'bandpass', f: 1900, q: 0.6, dur: 0.14, vol: 0.2, dest, when: t }); osc({ type: 'triangle', f: 220, f2: 140, dur: 0.07, vol: 0.12, dest, when: t }); }
      if (D.h[s16] == 'x') noise({ ft: 'highpass', f: 7500, dur: 0.035, vol: s16 % 4 == 0 ? 0.06 : 0.035, dest, when: t });
      if (D.o && D.o[s16] == 'x') noise({ ft: 'highpass', f: 6500, dur: 0.16, vol: 0.045, dest, when: t });
      // crash on section start
      if (s16 == 0 && bar % 8 == 0) noise({ ft: 'highpass', f: 4000, dur: 0.9, vol: 0.06, dest, when: t });
    }
  }
  return { init, unlock, setMusic, setSfx, sfx, laser, play, stopMusic, get musicOn() { return musicOn; }, get sfxOn() { return sfxOn; }, get ctx() { return ac; } };
})();
