/* 方寸生态的循环电子乐。四段乐句，首次手势之后才出声，切到后台会停。 */
(function (global) {
  'use strict';

  var BPM = 92;
  var STEP = 60 / BPM / 4;
  var LOOP = 512;
  var PHRASES = 4;

  var D3 = 146.83;
  var F3 = 174.61;
  var G3 = 196;
  var A3 = 220;
  var C4 = 261.63;
  var D4 = 293.66;
  var E4 = 329.63;
  var F4 = 349.23;
  var G4 = 392;
  var A4 = 440;
  var C5 = 523.25;
  var D5 = 587.33;

  function eventsForStep(step) {
    var phrase = Math.floor(step / 128) % PHRASES;
    var bar = Math.floor(step / 16) % 8;
    var beat = step % 16;
    var ev = [];
    function add(freq, dur, peak, wave) {
      ev.push({ f: freq, dur: dur, peak: peak, wave: wave || 'sine' });
    }
    if (phrase === 0) {
      if (beat === 0) add(D3, 0.42, 0.055, 'sine');
      if (beat === 8) add(A3, 0.2, 0.028, 'triangle');
      if (beat % 4 === 0) {
        var arp = [D4, F4, A4, G4, F4, D4, C4, A3];
        add(arp[(bar + beat / 4) % arp.length], 0.16, 0.024, 'sine');
      }
      if (beat === 4 || beat === 12) add(0, 0.04, 0.01, 'hat');
    } else if (phrase === 1) {
      var roots = [D3, F3, C4 / 2, G3, D3, A3 / 2, F3, C4 / 2];
      if (beat === 0) add(roots[bar], 0.36, 0.06, 'sine');
      if (beat % 2 === 0) {
        var run = [A4, G4, F4, D4, F4, A4, C5, A4];
        add(run[Math.floor(step / 2) % run.length], 0.12, 0.02, 'triangle');
      }
      if (beat % 2 === 1) add(0, 0.03, 0.011, 'hat');
    } else if (phrase === 2) {
      if (beat === 0 || beat === 8) add(F3, 0.3, 0.05, 'sine');
      if (beat === 12) add(C4, 0.16, 0.03, 'triangle');
      if (beat % 4 === 0) {
        var mist = [D5, A4, F4, G4, A4, F4, D4, C4];
        add(mist[bar], 0.18, 0.018, 'sine');
      }
      if (beat % 2 === 0) add(0, 0.035, beat % 4 === 0 ? 0.016 : 0.008, 'hat');
    } else {
      var lift = [D3, A3 / 2, F3, G3, D3, C4 / 2, F3, A3 / 2];
      if (beat === 0) {
        add(lift[bar], 0.4, 0.058, 'sine');
        add(D4, 0.24, 0.016, 'triangle');
        add(A4, 0.24, 0.014, 'sine');
      }
      if (beat === 8) add(D5, 0.16, 0.016, 'sine');
      if (beat === 6 || beat === 14) {
        var lead = [F4, G4, A4, C5, A4, G4, F4, D4];
        add(lead[bar], 0.14, 0.018, 'sine');
      }
      if (beat === 2 || beat === 10) add(0, 0.04, 0.01, 'hat');
    }
    return ev;
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
    filter.frequency.setValueAtTime(6400, time);
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
      filter.frequency.value = 2400;
      musicGain = ctx.createGain();
      musicGain.gain.value = 0.78;
      musicGain.connect(filter);
      filter.connect(ctx.destination);
    }
    if (ctx.state === 'suspended' && !hiddenPause) ctx.resume();
    return true;
  }

  function schedule() {
    if (!ctx || !wanted || !started || hiddenPause) return;
    var horizon = ctx.currentTime + 0.35;
    var guard = 0;
    while (nextTime < horizon && guard < 8) {
      playStep(ctx, musicGain, step, nextTime);
      step = (step + 1) % LOOP;
      nextTime += STEP;
      guard += 1;
    }
  }

  function startScheduler() {
    if (!ctx || !wanted || !started || hiddenPause) return;
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
    if (!ctx || !wanted || !started || hiddenPause) return;
    var now = ctx.currentTime + 0.02;
    if (kind === 'break') {
      tone(ctx, musicGain, 196, now, 0.16, 0.045, 'triangle');
      tone(ctx, musicGain, 146, now + 0.08, 0.2, 0.035, 'sine');
    } else if (kind === 'win') {
      tone(ctx, musicGain, 523, now, 0.18, 0.04, 'sine');
      tone(ctx, musicGain, 659, now + 0.12, 0.22, 0.032, 'sine');
      tone(ctx, musicGain, 784, now + 0.24, 0.3, 0.028, 'triangle');
    } else if (kind === 'place') {
      tone(ctx, musicGain, 440, now, 0.08, 0.02, 'sine');
    } else if (kind === 'appear') {
      tone(ctx, musicGain, 523, now, 0.12, 0.03, 'sine');
      tone(ctx, musicGain, 659, now + 0.08, 0.14, 0.022, 'triangle');
    }
  }

  global.FELT_AUDIO = {
    seconds: LOOP * STEP,
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
      if (!ctx) {
        hiddenPause = !!hidden;
        return;
      }
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
        scheduling: !!timer,
        started: started,
        wanted: wanted,
        hidden: hiddenPause,
        ctx: ctx ? ctx.state : 'none'
      };
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
