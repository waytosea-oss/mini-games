/* 云端攀行的循环电子乐。四段乐句，约 77 秒回到句首。首次手势之后才出声。 */
(function (global) {
  'use strict';

  var BPM = 100;
  var STEP = 60 / BPM / 4;
  var LOOP = 512;
  var PHRASES = 4;

  var D2 = 73.42;
  var A2 = 110;
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
      if (beat === 8) add(A2, 0.28, 0.04, 'triangle');
      if (beat % 4 === 2) {
        var high = [D4, F4, A4, G4, F4, E4, D4, C4];
        add(high[(bar + Math.floor(beat / 4)) % high.length], 0.16, 0.022, 'sine');
      }
      if (beat === 4 || beat === 12) add(0, 0.03, 0.012, 'hat');
    } else if (phrase === 1) {
      var roots = [D3, F3, C4 / 2, G3, D3, A2, F3, C4 / 2];
      if (beat === 0) add(roots[bar], 0.4, 0.06, 'sine');
      if (beat === 0 || beat === 10) add(roots[bar] * 2, 0.18, 0.016, 'triangle');
      if (beat % 2 === 0) {
        var walk = [A3, C4, D4, F4, G4, F4, D4, C4];
        add(walk[Math.floor(step / 2) % walk.length], 0.12, 0.02, 'sine');
      }
      if (beat % 4 === 3) add(0, 0.028, 0.01, 'hat');
    } else if (phrase === 2) {
      if (beat === 0) add(F3, 0.36, 0.058, 'sine');
      if (beat === 8) add(C4 / 2, 0.24, 0.04, 'triangle');
      if (beat === 6 || beat === 14) {
        var mist = [C5, A4, G4, F4, E4, D4, F4, A4];
        add(mist[bar], 0.18, 0.018, 'sine');
      }
      if (bar % 2 === 0 && beat === 4) add(D4, 0.22, 0.02, 'triangle');
      if (beat % 2 === 1) add(0, 0.025, beat === 7 ? 0.016 : 0.008, 'hat');
    } else {
      var lift = [D3, A2, F3, G3, D3, C4 / 2, A2, D3];
      if (beat === 0) {
        add(lift[bar], 0.44, 0.062, 'sine');
        add(D4, 0.3, 0.018, 'sine');
        add(A3, 0.3, 0.012, 'triangle');
      }
      if (beat === 8) add(D5, 0.16, 0.016, 'sine');
      if (beat === 3 || beat === 11) {
        var lead = [F4, A4, C5, D5, C5, A4, G4, F4];
        add(lead[bar], 0.14, 0.02, 'sine');
      }
      if (beat === 12) add(D2 * 2, 0.2, 0.03, 'triangle');
      if (beat === 2 || beat === 6) add(0, 0.04, 0.011, 'hat');
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
    filter.frequency.setValueAtTime(6200, time);
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
  var held = false;
  var timer = 0;
  var step = 0;
  var nextTime = 0;

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
    if (ctx.state === 'suspended') ctx.resume();
    return true;
  }

  function schedule() {
    if (!ctx || !wanted || !started || held) return;
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
    if (!ctx || !wanted || !started || held) return;
    if (timer) return;
    if (nextTime < ctx.currentTime) nextTime = ctx.currentTime + 0.05;
    timer = setInterval(schedule, 80);
    schedule();
  }

  function stopScheduler() {
    if (timer) clearInterval(timer);
    timer = 0;
  }

  function sync() {
    if (!started) return;
    if (!ensure()) return;
    if (wanted && !held) startScheduler();
    else stopScheduler();
    if (held && ctx && ctx.state === 'running') ctx.suspend();
    if (!held && wanted && ctx && ctx.state === 'suspended') ctx.resume();
  }

  var api = {
    seconds: LOOP * STEP,
    phrases: PHRASES,
    phrasePrint: phrasePrint,
    setWanted: function (on) {
      wanted = !!on;
      sync();
    },
    wanted: function () { return wanted; },
    arm: function () {
      if (!ensure()) return false;
      started = true;
      sync();
      return true;
    },
    toggle: function () {
      wanted = !wanted;
      if (!ensure()) return wanted;
      started = true;
      sync();
      return wanted;
    },
    gate: function (opts) {
      held = !!(opts && (opts.hidden || opts.paused));
      if (opts && typeof opts.wanted === 'boolean') wanted = opts.wanted;
      sync();
    },
    state: function () {
      return {
        seconds: LOOP * STEP,
        phrases: PHRASES,
        scheduling: !!timer,
        started: started,
        wanted: wanted,
        held: held,
        ctx: ctx ? ctx.state : 'none'
      };
    }
  };

  global.CLOUDCLIMB_AUDIO = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
