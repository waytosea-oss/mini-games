/* 重力邮局循环电子乐。五段乐句，约 100 秒后回到句首。首次手势之后才出声。 */
(function (global) {
  'use strict';

  var BPM = 96;
  var STEP = 60 / BPM / 4;
  var LOOP = 640;
  var PHRASES = 5;

  var A2 = 110.0;
  var C3 = 130.81;
  var D3 = 146.83;
  var E3 = 164.81;
  var F3 = 174.61;
  var G3 = 196.0;
  var A3 = 220.0;
  var C4 = 261.63;
  var D4 = 293.66;
  var E4 = 329.63;
  var F4 = 349.23;
  var G4 = 392.0;
  var A4 = 440.0;
  var B4 = 493.88;
  var C5 = 523.25;
  var E5 = 659.25;

  function eventsForStep(step) {
    var phrase = Math.floor(step / 128) % PHRASES;
    var bar = Math.floor(step / 16) % 8;
    var beat = step % 16;
    var ev = [];
    function add(freq, dur, peak, wave) {
      ev.push({ f: freq, dur: dur, peak: peak, wave: wave || 'sine' });
    }
    if (phrase === 0) {
      if (beat === 0) add(A2, 0.38, 0.07, 'sine');
      if (beat === 8) add(E3, 0.22, 0.04, 'triangle');
      if (beat % 4 === 0) {
        var arp = [A3, C4, E4, A4, G4, E4, C4, A3];
        add(arp[(bar + beat / 4) % arp.length], 0.16, 0.028, 'sine');
      }
      if (beat === 4 || beat === 12) add(0, 0.04, 0.012, 'hat');
    } else if (phrase === 1) {
      var roots = [F3, A2, C3, G3, F3, E3, A2, C3];
      if (beat === 0) add(roots[bar] / 2, 0.36, 0.072, 'sine');
      if (beat % 2 === 0) {
        var run = [F4, A4, C5, A4, G4, F4, E4, C4];
        add(run[(bar + beat / 2) % run.length], 0.12, 0.026, 'triangle');
      }
      if (beat === 6 || beat === 14) add(C5, 0.08, 0.018, 'sine');
      if (beat % 2 === 1) add(0, 0.03, 0.013, 'hat');
    } else if (phrase === 2) {
      if (beat === 0 || beat === 8) add(E3 / 2, 0.42, 0.08, 'sine');
      if (beat === 12) add(B4, 0.14, 0.02, 'sine');
      if (beat % 4 === 2) {
        var bell = [E4, G4, B4, E5, D4, G4, A4, E4];
        add(bell[bar], 0.22, 0.022, 'triangle');
      }
      if (beat % 4 === 0) add(0, 0.05, beat === 0 ? 0.016 : 0.01, 'hat');
    } else if (phrase === 3) {
      var walk = [A2, C3, E3, G3, F3, E3, D3, C3];
      if (beat === 0 || beat === 8) add(walk[bar], 0.28, 0.07, 'triangle');
      if (beat === 4 || beat === 12) add(walk[(bar + 3) % walk.length] * 2, 0.16, 0.03, 'sine');
      if (beat % 4 === 0) add(A3, 0.1, 0.016, 'sine');
      if (beat === 2 || beat === 10) add(E4, 0.12, 0.02, 'sine');
      if (beat % 2 === 0) add(0, 0.028, 0.011, 'hat');
    } else {
      if (beat === 0) {
        add(A2, 0.46, 0.075, 'sine');
        add(E4, 0.32, 0.02, 'sine');
        add(A4, 0.32, 0.016, 'triangle');
      }
      if (beat === 8) {
        add(E3, 0.24, 0.05, 'triangle');
        add(C5, 0.18, 0.018, 'sine');
      }
      if (beat === 6 || beat === 14) {
        var lead = [C5, B4, A4, G4, A4, C5, E5, D4];
        add(lead[bar], 0.14, 0.02, 'sine');
      }
      if (beat === 2 || beat === 6 || beat === 10 || beat === 14) add(0, 0.045, 0.012, 'hat');
    }
    return ev;
  }

  function phrasePrint(phrase) {
    var bag = [];
    var start = phrase * 128;
    var i;
    for (i = 0; i < 32; i++) {
      eventsForStep(start + i).forEach(function (ev) {
        bag.push(ev.wave + ':' + Math.round(ev.f) + ':' + ev.peak);
      });
    }
    return bag.join('|');
  }

  var noiseBuf = null;
  function noise(ctx) {
    if (noiseBuf && noiseBuf.sampleRate === ctx.sampleRate) return noiseBuf;
    noiseBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.25), ctx.sampleRate);
    var data = noiseBuf.getChannelData(0);
    var i;
    for (i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return noiseBuf;
  }

  function tone(ctx, dest, freq, time, dur, peak, wave) {
    if (peak <= 0 || dur <= 0) return;
    var o = ctx.createOscillator();
    o.type = wave || 'sine';
    o.frequency.setValueAtTime(Math.max(40, freq), time);
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(peak, time + Math.min(0.03, dur * 0.35));
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    o.connect(g);
    g.connect(dest);
    o.start(time);
    o.stop(time + dur + 0.02);
  }

  function hat(ctx, dest, time, peak) {
    var src = ctx.createBufferSource();
    src.buffer = noise(ctx);
    var filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(6500, time);
    var g = ctx.createGain();
    g.gain.setValueAtTime(Math.max(peak, 0.0002), time);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.045);
    src.connect(filter);
    filter.connect(g);
    g.connect(dest);
    src.start(time);
    src.stop(time + 0.05);
  }

  function playStep(ctx, dest, step, time) {
    eventsForStep(step).forEach(function (ev) {
      if (ev.wave === 'hat') hat(ctx, dest, time, ev.peak);
      else tone(ctx, dest, ev.f, time, ev.dur, ev.peak, ev.wave);
    });
  }

  var ctx = null;
  var musicGain = null;
  var filter = null;
  var wanted = true;
  var started = false;
  var timer = 0;
  var step = 0;
  var nextTime = 0;
  var hiddenPause = false;
  var rollOsc = null;
  var rollGain = null;
  var lastWarn = 0;

  function ensure() {
    var AC = global.AudioContext || global.webkitAudioContext;
    if (!AC) return false;
    if (!ctx) {
      ctx = new AC();
      filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 2200;
      musicGain = ctx.createGain();
      musicGain.gain.value = 0.8;
      musicGain.connect(filter);
      filter.connect(ctx.destination);
      rollOsc = ctx.createOscillator();
      rollOsc.type = 'triangle';
      rollOsc.frequency.value = 90;
      rollGain = ctx.createGain();
      rollGain.gain.value = 0;
      var rollFilter = ctx.createBiquadFilter();
      rollFilter.type = 'lowpass';
      rollFilter.frequency.value = 520;
      rollOsc.connect(rollFilter);
      rollFilter.connect(rollGain);
      rollGain.connect(ctx.destination);
      rollOsc.start();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return true;
  }

  function schedule() {
    if (!ctx || !wanted || !started) return;
    var horizon = ctx.currentTime + 0.35;
    var guard = 0;
    while (nextTime < horizon && guard < 8) {
      playStep(ctx, musicGain, step, nextTime);
      step = (step + 1) % LOOP;
      nextTime += STEP;
      guard++;
    }
  }

  function startScheduler() {
    if (!ctx || !wanted || !started) return;
    if (timer) return;
    if (nextTime < ctx.currentTime) nextTime = ctx.currentTime + 0.05;
    timer = setInterval(schedule, 80);
    schedule();
  }

  function stopScheduler() {
    if (timer) clearInterval(timer);
    timer = 0;
  }

  function blip(freq, dur, peak, wave) {
    if (!ctx || !started) return;
    tone(ctx, ctx.destination, freq, ctx.currentTime, dur, peak, wave);
  }

  var api = {
    seconds: LOOP * STEP,
    phrases: PHRASES,
    phrasePrint: phrasePrint,
    setWanted: function (on) { wanted = !!on; },
    wanted: function () { return wanted; },
    arm: function () {
      if (!ensure()) return false;
      started = true;
      if (wanted) startScheduler();
      return true;
    },
    toggle: function () {
      wanted = !wanted;
      if (!ensure()) return wanted;
      started = true;
      if (wanted) startScheduler();
      else stopScheduler();
      return wanted;
    },
    visibility: function (hidden) {
      if (!ctx) return;
      if (hidden) {
        hiddenPause = true;
        stopScheduler();
        if (ctx.state === 'running') ctx.suspend();
      } else if (hiddenPause) {
        hiddenPause = false;
        if (wanted && started) {
          ctx.resume();
          startScheduler();
        }
      }
    },
    roll: function (speed) {
      if (!rollGain || !ctx) return;
      var g = Math.max(0, Math.min(0.05, (speed - 0.5) * 0.006));
      rollGain.gain.setTargetAtTime(g, ctx.currentTime, 0.06);
      rollOsc.frequency.setTargetAtTime(70 + Math.min(speed, 14) * 14, ctx.currentTime, 0.06);
    },
    sfx: function (name) {
      if (!ensure() || !started) return;
      var now = ctx.currentTime;
      if (name === 'hit') {
        hat(ctx, ctx.destination, now, 0.08);
        blip(180, 0.18, 0.06, 'triangle');
      } else if (name === 'pad') {
        blip(520, 0.12, 0.035, 'sine');
        blip(780, 0.1, 0.02, 'sine');
      } else if (name === 'supply') {
        blip(660, 0.12, 0.04, 'sine');
        blip(880, 0.16, 0.03, 'sine');
      } else if (name === 'door-open') {
        blip(240, 0.16, 0.04, 'triangle');
        blip(360, 0.18, 0.03, 'sine');
      } else if (name === 'door-close') {
        blip(300, 0.1, 0.035, 'triangle');
        blip(140, 0.16, 0.04, 'sine');
      } else if (name === 'warn') {
        if (now - lastWarn < 0.45) return;
        lastWarn = now;
        blip(880, 0.08, 0.03, 'sine');
      } else if (name === 'checkpoint') {
        blip(520, 0.1, 0.03, 'sine');
      } else if (name === 'win') {
        blip(523, 0.12, 0.04, 'sine');
        blip(659, 0.14, 0.035, 'sine');
        blip(784, 0.2, 0.03, 'triangle');
      } else if (name === 'break' || name === 'pit') {
        blip(140, 0.28, 0.05, 'triangle');
        hat(ctx, ctx.destination, now, 0.05);
      }
    },
    state: function () {
      return {
        seconds: LOOP * STEP,
        phrases: PHRASES,
        scheduling: !!timer,
        started: started,
        wanted: wanted,
        ctx: ctx ? ctx.state : 'none'
      };
    }
  };

  global.GPAudio = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
