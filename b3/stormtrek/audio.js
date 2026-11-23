/* 风暴牌旅循环电子乐。四段乐句，约 83 秒后回到句首。首次手势之后才出声。 */
(function (global) {
  'use strict';

  var BPM = 92;
  var STEP = 60 / BPM / 4;
  var LOOP = 512;
  var PHRASES = 4;

  var D2 = 73.42;
  var C2 = 65.41;
  var F2 = 87.31;
  var G2 = 98.0;
  var A2 = 110.0;
  var D3 = 146.83;
  var F3 = 174.61;
  var G3 = 196.0;
  var A3 = 220.0;
  var C4 = 261.63;
  var D4 = 293.66;
  var F4 = 349.23;
  var G4 = 392.0;
  var A4 = 440.0;
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
      if (beat === 0) add(D2, 0.42, 0.07, 'sine');
      if (beat === 8) add(A2, 0.28, 0.045, 'triangle');
      if (beat % 4 === 0) {
        var arp = [D4, F4, A4, G4, F4, D4, C4, A3];
        add(arp[(bar + beat / 4) % arp.length], 0.16, 0.03, 'sine');
      }
      if (beat === 4 || beat === 12) add(0, 0.04, 0.012, 'hat');
    } else if (phrase === 1) {
      var roots = [D2, F2, C2, G2, D2, A2, F2, C2];
      if (beat === 0) add(roots[bar], 0.36, 0.075, 'sine');
      if (beat === 0) add(roots[bar] * 2, 0.22, 0.02, 'triangle');
      if (beat % 2 === 0) {
        var run = [A3, C4, D4, F4, G4, A4, G4, F4];
        add(run[Math.floor(step / 2) % run.length], 0.12, 0.028, 'sine');
      }
      if (beat % 2 === 1) add(0, 0.03, 0.014, 'hat');
    } else if (phrase === 2) {
      if (beat === 0 || beat === 8) add(C2, 0.3, 0.08, 'sine');
      if (beat === 12) add(F2, 0.18, 0.05, 'triangle');
      if (beat % 4 === 0) {
        var dark = [C4, F3, G3, A3, F3, D3, C4, G3];
        add(dark[bar], 0.2, 0.026, 'triangle');
      }
      if (beat % 2 === 0) add(0, 0.035, beat % 4 === 0 ? 0.02 : 0.01, 'hat');
      if (bar % 2 === 1 && beat === 0) add(G3, 0.09, 0.03, 'square');
    } else {
      var lift = [G2, D2, A2, F2, G2, C2, D2, G2];
      if (beat === 0) {
        add(lift[bar], 0.4, 0.07, 'sine');
        add(D4, 0.28, 0.022, 'sine');
        add(A4, 0.28, 0.016, 'triangle');
      }
      if (beat === 8) {
        add(F4, 0.2, 0.02, 'sine');
        add(C5, 0.2, 0.014, 'sine');
      }
      if (beat === 6 || beat === 14) {
        var lead = [D5, C5, A4, G4, F4, A4, C5, D5];
        add(lead[bar], 0.14, 0.02, 'sine');
      }
      if (beat === 2 || beat === 6 || beat === 10 || beat === 14) add(0, 0.05, 0.011, 'hat');
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
    filter.frequency.setValueAtTime(7000, time);
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
      musicGain.gain.value = 0.85;
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

  global.STORM_AUDIO = api;
})(typeof window !== 'undefined' ? window : globalThis);
