/* 软桥救援的循环电子乐。四段乐句，约 87 秒回到句首。首次手势之后才出声。 */
(function (global) {
  'use strict';

  var BPM = 88;
  var STEP = 60 / BPM / 4;
  var LOOP = 512;
  var PHRASES = 4;

  var A2 = 110;
  var C3 = 130.81;
  var E3 = 164.81;
  var G3 = 196;
  var A3 = 220;
  var B3 = 246.94;
  var C4 = 261.63;
  var D4 = 293.66;
  var E4 = 329.63;
  var G4 = 392;
  var A4 = 440;
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
      if (beat === 0) add(A2, 0.46, 0.06, 'sine');
      if (beat === 8) add(E3, 0.22, 0.03, 'triangle');
      if (beat % 4 === 0) {
        var arp = [E4, A4, C5, B4, G4, E4, D4, C4];
        add(arp[(bar + beat / 4) % arp.length], 0.16, 0.026, 'sine');
      }
      if (beat === 4 || beat === 12) add(0, 0.04, 0.01, 'hat');
    } else if (phrase === 1) {
      var roots = [A2, C3, G3, E3, A2, B3 / 2, C3, E3];
      if (beat === 0) add(roots[bar], 0.38, 0.065, 'sine');
      if (beat === 0 || beat === 8) add(roots[bar] * 2, 0.18, 0.018, 'triangle');
      if (beat % 2 === 0) {
        var run = [C4, E4, G4, A4, G4, E4, D4, C4];
        add(run[Math.floor(step / 2) % run.length], 0.12, 0.024, 'sine');
      }
      if (beat % 2 === 1) add(0, 0.03, 0.012, 'hat');
    } else if (phrase === 2) {
      if (beat === 0 || beat === 8) add(C3, 0.32, 0.07, 'sine');
      if (beat === 12) add(E3, 0.16, 0.04, 'triangle');
      if (beat % 4 === 0) {
        var mist = [E4, C4, G3, A3, B3, G3, E4, D4];
        add(mist[bar], 0.2, 0.022, 'triangle');
      }
      if (beat % 2 === 0) add(0, 0.035, beat % 4 === 0 ? 0.018 : 0.009, 'hat');
      if (bar % 2 === 1 && beat === 6) add(B4, 0.1, 0.02, 'sine');
    } else {
      var lift = [E3, A2, C3, G3, E3, A2, B3 / 2, E3];
      if (beat === 0) {
        add(lift[bar], 0.42, 0.062, 'sine');
        add(A4, 0.26, 0.02, 'sine');
        add(E4, 0.26, 0.014, 'triangle');
      }
      if (beat === 8) add(C5, 0.18, 0.016, 'sine');
      if (beat === 6 || beat === 14) {
        var lead = [E5, C5, B4, A4, G4, A4, C5, E5];
        add(lead[bar], 0.14, 0.018, 'sine');
      }
      if (beat === 2 || beat === 10) add(0, 0.045, 0.01, 'hat');
    }
    return ev;
  }

  function phrasePrint(phrase) {
    var bag = [];
    var start = phrase * 128;
    for (var i = 0; i < 32; i++) {
      eventsForStep(start + i).forEach(function (ev) {
        bag.push(ev.wave + ':' + Math.round(ev.f) + ':' + ev.peak);
      });
    }
    return bag.join('|');
  }

  var noiseBuf = null;
  function noise(ctx) {
    if (noiseBuf && noiseBuf.sampleRate === ctx.sampleRate) return noiseBuf;
    noiseBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.2), ctx.sampleRate);
    var data = noiseBuf.getChannelData(0);
    var n = 2166136261;
    for (var i = 0; i < data.length; i++) {
      n = Math.imul(n ^ (n >>> 15), 2246822519);
      data[i] = ((n >>> 0) / 4294967295) * 2 - 1;
    }
    return noiseBuf;
  }

  function tone(ctx, dest, freq, time, dur, peak, wave) {
    if (peak <= 0 || dur <= 0) return;
    var o = ctx.createOscillator();
    o.type = wave || 'sine';
    o.frequency.setValueAtTime(Math.max(40, freq), time);
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(peak, time + Math.min(0.03, dur * 0.4));
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
    filter.frequency.setValueAtTime(6800, time);
    var g = ctx.createGain();
    g.gain.setValueAtTime(Math.max(peak, 0.0002), time);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.04);
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

  function sting(kind) {
    if (!ctx || !wanted || !started) return;
    var now = ctx.currentTime + 0.02;
    if (kind === 'break') {
      tone(ctx, musicGain, 196, now, 0.18, 0.05, 'triangle');
      tone(ctx, musicGain, 146, now + 0.08, 0.22, 0.04, 'sine');
    } else if (kind === 'win') {
      tone(ctx, musicGain, 523, now, 0.2, 0.04, 'sine');
      tone(ctx, musicGain, 659, now + 0.12, 0.24, 0.035, 'sine');
      tone(ctx, musicGain, 784, now + 0.24, 0.32, 0.03, 'triangle');
    }
  }

  global.SOFT_AUDIO = {
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
    sting: sting,
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
})(typeof window !== 'undefined' ? window : globalThis);
