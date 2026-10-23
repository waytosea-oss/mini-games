/* ===== 一合到底 · 原创音频引擎（WebAudio 实时合成，无外部音频文件） =====
   BGM《竹窗听雨》：D 宫五声调式，古筝（Karplus-Strong 拨弦合成）+ 竹笛 + 低音大阮 + 木鱼/堂鼓
   音效：象牙麻将牌碰撞（多层噪声+共振体）、洗牌、合成风铃、过关锣声 */
const SND = (() => {
  let ac = null, master, musicBus, sfxBus, comp, verbIn, noiseBuf;
  let musicOn = true, sfxOn = true, playing = false, timer = null, nextT = 0, step = 0, loop = 0;
  const BPM = 78, E8 = 60 / BPM / 2, MV = 0.5;
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  const ks = {}; // 拨弦缓存
  function init() {
    if (ac) return;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ac = new AC();
    comp = ac.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 3.5; comp.attack.value = 0.003; comp.release.value = 0.2;
    master = ac.createGain(); master.gain.value = 0.95; master.connect(comp); comp.connect(ac.destination);
    musicBus = ac.createGain(); musicBus.gain.value = musicOn ? MV : 0; musicBus.connect(master);
    sfxBus = ac.createGain(); sfxBus.gain.value = sfxOn ? 0.9 : 0; sfxBus.connect(master);
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 1.5, ac.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    // 合成混响：茶馆木质空间
    const verb = ac.createConvolver(), len = ac.sampleRate * 2.2, ir = ac.createBuffer(2, len, ac.sampleRate);
    for (let c = 0; c < 2; c++) { const x = ir.getChannelData(c); for (let i = 0; i < len; i++) x[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.6) * (i < 400 ? i / 400 : 1); }
    verb.buffer = ir; verbIn = ac.createGain(); verbIn.gain.value = 0.32; verbIn.connect(verb); const vo = ac.createGain(); vo.gain.value = 0.5; verb.connect(vo); vo.connect(master);
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
    env(g, t, o.a || 0.003, vol, dur);
    let node = n;
    if (o.lp) { const f2 = ac.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.setValueAtTime(o.lp, t); if (o.lpTo) f2.frequency.exponentialRampToValueAtTime(o.lpTo, t + dur); f2.Q.value = o.q || 1; n.connect(f2); node = f2; }
    if (o.vib) { const l = ac.createOscillator(), lg = ac.createGain(); l.frequency.value = o.vib; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * 0.012, t + Math.min(0.5, dur * 0.6)); l.connect(lg); lg.connect(n.frequency); l.start(t); l.stop(t + dur + 0.2); }
    node.connect(g); g.connect(dest); if (o.rv) g.connect(verbIn); n.start(t); n.stop(t + dur + (o.a || 0.003) + 0.08);
    return n;
  }
  function noise(t, dur, vol, dest, type = 'bandpass', f = 3000, q = 1, o = {}) {
    const s = ac.createBufferSource(); s.buffer = noiseBuf; const fl = ac.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, t); fl.Q.value = q;
    if (o.fTo) fl.frequency.exponentialRampToValueAtTime(o.fTo, t + dur);
    const g = ac.createGain(); env(g, t, o.a || 0.001, vol, dur);
    s.connect(fl); fl.connect(g); g.connect(dest); if (o.rv) g.connect(verbIn);
    s.start(t, Math.random() * 1.2); s.stop(t + dur + 0.1);
  }
  /* ---- Karplus-Strong 古筝拨弦 ---- */
  function ksBuf(m, bright) {
    const key = m + '_' + bright; if (ks[key]) return ks[key];
    const sr = ac.sampleRate, f = mtof(m), N = Math.round(sr / f), dur = m < 50 ? 2.6 : 2.0, len = Math.floor(sr * dur);
    const buf = ac.createBuffer(1, len, sr), d = buf.getChannelData(0), ring = new Float32Array(N);
    for (let i = 0; i < N; i++) ring[i] = (Math.random() * 2 - 1) * (0.6 + 0.4 * Math.sin(Math.PI * i / N)); // 指甲拨弦：中段更强
    let idx = 0, prev = 0; const damp = 0.4985 + bright * 0.0013;
    for (let i = 0; i < len; i++) {
      const cur = ring[idx], nx = ring[(idx + 1) % N]; const v = damp * (cur + nx);
      ring[idx] = v; d[i] = cur * 0.9 + prev * 0.1; prev = cur; idx = (idx + 1) % N;
    }
    // 起音更亮（指甲感）
    for (let i = 0; i < Math.min(len, 300); i++) d[i] *= 1 + (1 - i / 300) * 0.6;
    return (ks[key] = buf);
  }
  function zheng(m, t, vol, dest, o = {}) {
    const s = ac.createBufferSource(); s.buffer = ksBuf(m, o.bright || 0);
    const g = ac.createGain(); g.gain.value = vol;
    if (o.bend) { s.playbackRate.setValueAtTime(1, t); s.playbackRate.linearRampToValueAtTime(Math.pow(2, o.bend / 12), t + 0.18); }      // 按音上滑
    if (o.vib) { const l = ac.createOscillator(), lg = ac.createGain(); l.frequency.value = 5.2; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(0.012, t + 0.35); l.connect(lg); lg.connect(s.playbackRate); l.start(t); l.stop(t + 2.2); } // 揉弦
    const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 90;
    s.connect(hp); hp.connect(g); g.connect(dest || musicBus); if (o.rv !== 0) g.connect(verbIn);
    s.start(t); s.stop(t + 2.6);
  }
  /* ---- BGM ---- D 宫：D E F# A B */
  const PENT = [0, 2, 4, 7, 9];
  const deg = (n, base = 62) => base + 12 * Math.floor(n / 5) + PENT[((n % 5) + 5) % 5];
  // 旋律（每小节 8 个八分音符位置）：[位置, 五声级数, 时值]
  const MEL = [
    [[0, 5, 2], [2, 7, 1], [3, 8, 1], [4, 7, 3], [7, 6, 1]],
    [[0, 5, 3], [3, 4, 1], [4, 2, 2], [6, 3, 2]],
    [[0, 4, 2], [2, 5, 1], [3, 7, 1], [4, 8, 2], [6, 10, 2]],
    [[0, 9, 4], [4, 8, 1], [5, 7, 1], [6, 5, 2]],
    [[0, 7, 2], [2, 8, 2], [4, 10, 2], [6, 9, 1], [7, 8, 1]],
    [[0, 7, 3], [3, 5, 1], [4, 4, 2], [6, 5, 2]],
    [[0, 3, 1], [1, 4, 1], [2, 5, 2], [4, 7, 1], [5, 4, 1], [6, 2, 2]],
    [[0, 0 + 5, 6]],
  ];
  const BASS = [0, -3, 2, -1, 3, -2, 1, 0]; // 每小节根音（五声级数，低八度）
  function flute(m, t, dur, v, dest) {
    const f = mtof(m); dest = dest || musicBus;
    osc('sine', f, t, dur + 0.25, 0.085 * v, dest, { a: 0.06, vib: 5.4, rv: 1 });
    osc('triangle', f * 2, t, dur * 0.8, 0.012 * v, dest, { a: 0.08, rv: 1 });
    noise(t, Math.min(0.3, dur), 0.018 * v, dest, 'bandpass', f * 2, 4, { a: 0.04 });
  }
  function muyu(t, v) { osc('sine', 820, t, 0.07, 0.16 * v, musicBus, { to: 700 }); noise(t, 0.02, 0.05 * v, musicBus, 'bandpass', 1600, 6); }
  function tanggu(t, v) { osc('sine', 120, t, 0.35, 0.32 * v, musicBus, { to: 62, tt: 0.18 }); noise(t, 0.06, 0.06 * v, musicBus, 'lowpass', 400, 1); }
  function sched(s, t) {
    const bar = Math.floor(s / 8) % 8, st = s % 8, sec = loop % 4;
    // 古筝分解和弦（勾托抹托）
    const root = BASS[bar];
    const arp = [root, root + 2, root + 3, root + 5, root + 3, root + 2, root + 5, root + 7];
    if (sec !== 3 || st % 2 === 0) zheng(deg(arp[st], 50), t, st === 0 ? 0.42 : 0.27, musicBus, { bright: st === 0 ? 1 : 0 });
    // 低音大阮
    if (st === 0) zheng(deg(root, 38), t, 0.6, musicBus, { rv: 0 });
    if (st === 4 && bar % 2) zheng(deg(root + 3, 38), t, 0.4, musicBus, { rv: 0 });
    // 旋律：第1遍竹笛、第2遍古筝高音（带揉弦按音），第3遍两者
    for (const [p, n, len] of MEL[bar]) if (p === st) {
      const m = deg(n, 62);
      if (sec === 0 || sec === 2) flute(m + 12, t, len * E8, 1);
      if (sec === 1 || sec === 2) zheng(m, t, 0.5, musicBus, { vib: len >= 2, bright: 2, bend: (len >= 3 && n % 5 === 3) ? 2 : 0 });
      if (sec === 3 && p % 4 === 0) zheng(m, t, 0.35, musicBus, { vib: 1 });
    }
    // 打击：木鱼 + 堂鼓
    if (st === 0) tanggu(t, bar === 0 ? 1 : 0.6);
    if (st === 3 || st === 6) muyu(t, 0.7);
    if (st === 7 && bar % 2) muyu(t, 0.4);
    // 段落开头：古筝刮奏
    if (bar === 0 && st === 0 && loop > 0) gliss(t - 0.32, 62, 12, 0.2, musicBus);
  }
  function gliss(t, base, n, vol, dest, dt = 0.026, down = false) {
    for (let i = 0; i < n; i++) zheng(deg(down ? n - i : i, base), t + i * dt, vol * (0.6 + 0.4 * i / n), dest, { bright: 1 });
  }
  function tick() {
    if (!ac || !playing) return;
    while (nextT < ac.currentTime + 0.2) { sched(step, nextT); nextT += E8 * (step % 2 ? 0.94 : 1.06); step++; if (step >= 64) { step = 0; loop++; } }
  }
  function startMusic() { init(); if (!ac || playing) return; playing = true; nextT = ac.currentTime + 0.12; timer = setInterval(tick, 30); tick(); }
  function stopMusic() { playing = false; if (timer) clearInterval(timer); timer = null; }
  function setMusic(on) { musicOn = on; if (musicBus) musicBus.gain.setTargetAtTime(on ? MV : 0, ac.currentTime, 0.05); }
  function setSfx(on) { sfxOn = on; if (sfxBus) sfxBus.gain.setTargetAtTime(on ? 0.9 : 0, ac.currentTime, 0.02); }
  /* ---- 音效 ---- */
  const S = {
    // 麻将碰撞：硬质高频瞬态 + 两个象牙共振峰 + 桌面低频
    clack(v = 1, pitch = 1) {
      if (!ac) return; const t = now() + 0.002;
      noise(t, 0.012, 0.55 * v, sfxBus, 'highpass', 3200, 0.8);
      noise(t, 0.045, 0.35 * v, sfxBus, 'bandpass', 2300 * pitch, 7);
      osc('sine', 3100 * pitch * (0.97 + Math.random() * 0.06), t, 0.03, 0.12 * v, sfxBus);
      osc('sine', 1650 * pitch * (0.97 + Math.random() * 0.06), t, 0.05, 0.12 * v, sfxBus);
      osc('sine', 230, t, 0.06, 0.18 * v, sfxBus, { to: 140 });
    },
    select() { if (!ac) return; const t = now(); S.clack(0.55, 1.15); osc('sine', 1320, t + 0.02, 0.08, 0.05, sfxBus, { rv: 1 }); },
    deselect() { if (!ac) return; S.clack(0.35, 0.9); },
    deny() { if (!ac) return; const t = now(); osc('square', 180, t, 0.08, 0.06, sfxBus, { lp: 900 }); osc('square', 150, t + 0.09, 0.1, 0.06, sfxBus, { lp: 800 }); },
    shuffle(n = 10) { if (!ac) return; const t = now(); for (let i = 0; i < n; i++) { const tt = t + i * 0.035 + Math.random() * 0.012; noise(tt, 0.03, 0.18, sfxBus, 'bandpass', 2600 + Math.random() * 900, 3); } },
    swoosh() { if (!ac) return; noise(now(), 0.18, 0.1, sfxBus, 'bandpass', 900, 1, { fTo: 3200, a: 0.05 }); },
    merge(tier) {
      if (!ac) return; const t = now() + 0.02;
      // 风铃：非谐波分音
      const base = mtof(84 + (tier % 5));
      for (const [r, v, d] of [[1, 0.12, 1.4], [2.76, 0.05, 0.9], [5.4, 0.03, 0.5], [1.5, 0.05, 1.0]]) osc('sine', base * r, t + 0.02, d, v, sfxBus, { rv: 1 });
      gliss(t, 62 + (tier % 3) * 2, 9, 0.5, sfxBus, 0.03);
      noise(t, 0.4, 0.08, sfxBus, 'highpass', 6000, 0.7, { a: 0.05, rv: 1 });
    },
    pop() { if (!ac) return; const t = now(); osc('sine', 600, t, 0.12, 0.2, sfxBus, { to: 1400, tt: 0.06 }); S.clack(0.8, 1.05); },
    newTier() {
      if (!ac) return; const t = now() + 0.05;
      // 小锣 + 上行琶音
      osc('triangle', 330, t, 1.6, 0.18, sfxBus, { to: 300, tt: 1.5, rv: 1 }); osc('sine', 495, t, 1.4, 0.1, sfxBus, { rv: 1 }); noise(t, 0.6, 0.08, sfxBus, 'bandpass', 2400, 1.5, { rv: 1 });
      [0, 2, 4, 5, 7, 9].forEach((n, i) => zheng(deg(n, 74), t + 0.08 + i * 0.07, 0.6, sfxBus, { bright: 2 }));
    },
    coin() { if (!ac) return; const t = now(); osc('sine', 1975, t, 0.12, 0.09, sfxBus); osc('sine', 2637, t + 0.06, 0.25, 0.08, sfxBus, { rv: 1 }); },
    unlock() { if (!ac) return; const t = now(); noise(t, 0.03, 0.4, sfxBus, 'bandpass', 3000, 4); osc('square', 900, t + 0.02, 0.04, 0.05, sfxBus, { lp: 3000 }); gliss(t + 0.08, 62, 7, 0.45, sfxBus, 0.04); },
    win() {
      if (!ac) return; const t = now() + 0.05;
      // 大锣 + 古筝刮奏 + 五声号角
      osc('triangle', 110, t, 3.2, 0.3, sfxBus, { to: 98, tt: 3, rv: 1 }); osc('sine', 165, t, 2.6, 0.15, sfxBus, { rv: 1 }); osc('sine', 247, t, 2.2, 0.08, sfxBus, { rv: 1 });
      noise(t, 1.6, 0.1, sfxBus, 'bandpass', 1800, 1.2, { rv: 1, a: 0.01 });
      gliss(t + 0.1, 62, 14, 0.5, sfxBus, 0.03);
      [[0, 7], [0.3, 9], [0.45, 10], [0.6, 12], [1.0, 14]].forEach(([d, n]) => { zheng(deg(n, 62), t + 0.6 + d, 0.7, sfxBus, { bright: 2, vib: 1 }); flute(deg(n, 74), t + 0.6 + d, 0.35, 1.4, sfxBus); });
    },
    fail() { if (!ac) return; const t = now(); gliss(t, 62, 8, 0.45, sfxBus, 0.06, true); osc('triangle', 98, t + 0.5, 1.8, 0.22, sfxBus, { to: 80, rv: 1 }); },
    tap() { if (!ac) return; S.clack(0.4, 1.3); },
  };
  function flute2(m, t, dur, v) { flute(m, t, dur, v); }
  return Object.assign(S, { init, unlock, startMusic, stopMusic, setMusic, setSfx, get ctx() { return ac; }, flute: flute2 });
})();
