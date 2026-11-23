/* 行囊远征的循环电子乐。四段乐句，步伐放慢，约 101 秒回到句首。
 * 首次手势之后才出声，切到后台会暂停。
 */
(function (global) {
  'use strict';

  var BPM = 76;
  var STEP = 60 / BPM / 4;
  var LOOP = 512;
  var PHRASES = 4;

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
  var C5 = 523.25;
  var D5 = 587.33;
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
      if (beat === 0) add(A2, 0.5, 0.06, 'sine');
      if (beat === 8) add(E3, 0.28, 0.035, 'triangle');
      if (beat % 4 === 2) {
        var walk = [A3, C4, D4, E4, D4, C4, A3, G3];
        add(walk[bar], 0.18, 0.026, 'sine');
      }
      if (beat === 12) add(0, 0.03, 0.008, 'hat');
    } else if (phrase === 1) {
      var roots = [F3, C3, G3, D3, F3, A2, C3, G3];
      if (beat === 0) add(roots[bar] / 2, 0.42, 0.065, 'sine');
      if (beat % 2 === 0) {
        var lift = [A4, G4, E4, D4, C4, D4, F4, G4];
        add(lift[(bar + beat / 2) % lift.length], 0.12, 0.022, 'triangle');
      }
      if (beat === 4 || beat === 12) add(C5, 0.16, 0.016, 'sine');
      if (beat % 4 === 2) add(0, 0.028, 0.012, 'hat');
    } else if (phrase === 2) {
      if (beat === 0 || beat === 8) add(D3, 0.36, 0.07, 'sine');
      if (beat === 6) add(A2, 0.22, 0.04, 'triangle');
      if (beat % 8 === 4) {
        var low = [D4, A3, F3, E3, D4, C4, A3, G3];
        add(low[bar], 0.24, 0.02, 'triangle');
      }
      if (bar % 2 === 0 && beat === 14) add(F4, 0.1, 0.018, 'sine');
      if (beat === 0) add(0, 0.04, 0.01, 'hat');
    } else {
      if (beat === 0) {
        add(A2, 0.48, 0.055, 'sine');
        add(E4, 0.32, 0.02, 'sine');
      }
      if (beat === 8) add(D4, 0.26, 0.024, 'triangle');
      if (beat === 6 || beat === 14) {
        var open = [A4, E5, D5, C5, A4, G4, E4, D5];
        add(open[bar], 0.18, 0.02, 'sine');
      }
      if (beat % 4 === 0) add(C4, 0.08, 0.012, 'triangle');
      if (beat === 10) add(0, 0.05, 0.009, 'hat');
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
    for (var i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return noiseBuf;
  }

  function tone(ctx, dest, freq, time, dur, peak, wave) {
    if (peak <= 0 || dur <= 0) return;
    var osc = ctx.createOscillator();
    osc.type = wave || 'sine';
    osc.frequency.setValueAtTime(Math.max(40, freq), time);
    var gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(peak, time + Math.min(0.04, dur * 0.35));
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(time);
    osc.stop(time + dur + 0.02);
  }

  function hat(ctx, dest, time, peak) {
    var src = ctx.createBufferSource();
    src.buffer = noise(ctx);
    var filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(6200, time);
    var gain = ctx.createGain();
    gain.gain.setValueAtTime(Math.max(peak, 0.0002), time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.045);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
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

  global.PACK_AUDIO = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
