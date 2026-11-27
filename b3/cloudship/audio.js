/* 云舰棋局的循环电子乐。四段乐句，约 96 秒回到句首。首次手势之后才出声。 */
(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.CLOUD_AUDIO = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var BPM = 80;
  var STEP = 60 / BPM / 4;
  var LOOP = 512;
  var PHRASES = 4;

  var D2 = 73.42;
  var F2 = 87.31;
  var G2 = 98.0;
  var A2 = 110.0;
  var C3 = 130.81;
  var D3 = 146.83;
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

  function eventsForStep(step) {
    var phrase = Math.floor(step / 128) % PHRASES;
    var bar = Math.floor(step / 16) % 8;
    var beat = step % 16;
    var ev = [];
    function add(freq, dur, peak, wave) {
      ev.push({ f: freq, dur: dur, peak: peak, wave: wave || 'sine' });
    }

    if (phrase === 0) {
      if (beat === 0) add(D2, 0.5, 0.055, 'sine');
      if (beat === 8) add(A2, 0.24, 0.03, 'triangle');
      if (beat % 4 === 0) {
        var arp = [D4, F4, A4, G4, F4, D4, C4, A3];
        add(arp[(bar + beat / 4) % arp.length], 0.18, 0.024, 'sine');
      }
      if (beat === 4 || beat === 12) add(0, 0.04, 0.01, 'hat');
    } else if (phrase === 1) {
      var roots = [D2, F2, C3 / 2, G2, D2, A2, F2, C3 / 2];
      if (beat === 0) add(roots[bar], 0.4, 0.06, 'sine');
      if (beat === 0 || beat === 8) add(roots[bar] * 2, 0.16, 0.016, 'triangle');
      if (beat % 2 === 0) {
        var run = [A3, D4, F4, G4, A4, G4, F4, D4];
        add(run[Math.floor(step / 2) % run.length], 0.12, 0.022, 'sine');
      }
      if (beat % 2 === 1) add(0, 0.03, 0.011, 'hat');
    } else if (phrase === 2) {
      if (beat === 0 || beat === 8) add(G2, 0.34, 0.05, 'sine');
      if (beat === 12) add(D3, 0.16, 0.028, 'triangle');
      if (beat % 4 === 0) {
        var mist = [D4, A3, C4, G3, F3, A3, D4, C4];
        add(mist[bar], 0.2, 0.02, 'triangle');
      }
      if (beat % 2 === 0) add(0, 0.035, beat % 4 === 0 ? 0.016 : 0.008, 'hat');
      if (bar % 2 === 1 && beat === 6) add(F4, 0.12, 0.018, 'sine');
    } else {
      var lift = [A2, D2, F2, G2, A2, C3 / 2, D2, A2];
      if (beat === 0) {
        add(lift[bar], 0.44, 0.058, 'sine');
        add(D4, 0.26, 0.018, 'sine');
        add(A4, 0.26, 0.012, 'triangle');
      }
      if (beat === 8) add(F4, 0.18, 0.016, 'sine');
      if (beat === 6 || beat === 14) {
        var lead = [D5, A4, G4, F4, E4, F4, A4, D5];
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

  var g = typeof globalThis !== 'undefined' ? globalThis : this;
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
    var AC = g.AudioContext || g.webkitAudioContext;
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
    }
  };
});
