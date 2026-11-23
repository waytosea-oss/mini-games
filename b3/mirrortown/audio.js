/* 倒影街区循环电子乐。四段乐句，约 74 秒后回到句首。首次手势之后才出声。 */
(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.MT_AUDIO = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var BPM = 78;
  var STEP = 60 / BPM / 4;
  var PHRASES = 4;
  var BARS = 6;
  var LOOP = PHRASES * BARS * 16;

  var E2 = 82.41;
  var A2 = 110.0;
  var C3 = 130.81;
  var D3 = 146.83;
  var E3 = 164.81;
  var G3 = 196.0;
  var A3 = 220.0;
  var C4 = 261.63;
  var D4 = 293.66;
  var E4 = 329.63;
  var G4 = 392.0;
  var A4 = 440.0;
  var B4 = 493.88;
  var C5 = 523.25;
  var E5 = 659.25;

  function eventsForStep(step) {
    var phrase = Math.floor(step / (BARS * 16)) % PHRASES;
    var bar = Math.floor(step / 16) % BARS;
    var beat = step % 16;
    var ev = [];
    function add(freq, dur, peak, wave) {
      ev.push({ f: freq, dur: dur, peak: peak, wave: wave || 'sine' });
    }

    if (phrase === 0) {
      if (beat === 0) add(A2, 0.55, 0.06, 'sine');
      if (beat === 8) add(E3, 0.28, 0.03, 'triangle');
      if (beat % 8 === 4) {
        var bell = [E4, G4, A4, E5, C5, A4];
        add(bell[bar % bell.length], 0.22, 0.022, 'sine');
      }
      if (beat === 12) add(0, 0.05, 0.01, 'hat');
    } else if (phrase === 1) {
      var roots = [A2, C3, D3, E3, A2, G3];
      if (beat === 0) add(roots[bar], 0.4, 0.065, 'sine');
      if (beat % 4 === 0) {
        var walk = [A3, C4, D4, E4, G4, A4, G4, E4];
        add(walk[(bar + beat / 4) % walk.length], 0.14, 0.026, 'triangle');
      }
      if (beat % 2 === 0) add(0, 0.03, beat % 4 === 0 ? 0.014 : 0.008, 'hat');
    } else if (phrase === 2) {
      if (beat === 0) add(E2, 0.48, 0.07, 'sine');
      if (beat === 8) add(A2, 0.24, 0.04, 'triangle');
      if (beat === 0 || beat === 10) {
        var low = [E4, D4, C4, A3, G3, E4];
        add(low[bar], 0.26, 0.02, 'sine');
      }
      if (bar % 2 === 1 && beat === 6) add(B4, 0.12, 0.016, 'triangle');
      if (beat === 4 || beat === 12) add(0, 0.04, 0.009, 'hat');
    } else {
      var tide = [A2, E2, A2, C3, D3, E2];
      if (beat === 0) {
        add(tide[bar], 0.42, 0.068, 'sine');
        add(A3, 0.3, 0.018, 'triangle');
      }
      if (beat % 4 === 2) {
        var rise = [C4, E4, G4, A4, C5, A4];
        add(rise[bar], 0.16, 0.024, 'sine');
      }
      if (beat === 14) add(E5, 0.18, 0.014, 'sine');
      if (beat === 0 || beat === 8) add(0, 0.05, 0.011, 'hat');
    }
    return ev;
  }

  function phrasePrint(phrase) {
    var bag = [];
    var start = phrase * BARS * 16;
    for (var i = 0; i < 24; i++) {
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
    for (var i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return noiseBuf;
  }

  function tone(ctx, dest, freq, time, dur, peak, wave) {
    if (peak <= 0 || dur <= 0) return;
    var o = ctx.createOscillator();
    o.type = wave || 'sine';
    o.frequency.setValueAtTime(Math.max(40, freq), time);
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(peak, time + Math.min(0.04, dur * 0.35));
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
    filter.frequency.setValueAtTime(5200, time);
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

  function ensure() {
    var AC = globalThis.AudioContext || globalThis.webkitAudioContext;
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

  return {
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
});
