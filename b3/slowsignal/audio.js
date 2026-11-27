/* 慢信号台的夜班循环。首次手势之后才出声，切到后台就停下。 */
(function (global) {
  'use strict';

  var BPM = 76;
  var STEP = 60 / BPM / 4;
  var PHRASES = 6;
  var BAR = 16;
  var PHRASE = BAR * 4;

  var D2 = 73.42;
  var A2 = 110;
  var C3 = 130.81;
  var D3 = 146.83;
  var E3 = 164.81;
  var G3 = 196;
  var A3 = 220;
  var C4 = 261.63;
  var D4 = 293.66;
  var E4 = 329.63;
  var G4 = 392;
  var A4 = 440;
  var C5 = 523.25;

  function eventsForStep(step) {
    var phrase = Math.floor(step / PHRASE) % PHRASES;
    var bar = Math.floor(step / BAR) % 4;
    var beat = step % BAR;
    var ev = [];
    function add(freq, dur, peak, wave) {
      ev.push({ f: freq, dur: dur, peak: peak, wave: wave || 'sine' });
    }
    if (phrase === 0) {
      if (beat === 0) add(D2, 0.7, 0.05, 'sine');
      if (beat === 8) add(A2, 0.4, 0.03, 'triangle');
      if (beat === 4 || beat === 12) add([D4, A3, G3, E3][bar], 0.22, 0.02, 'sine');
    } else if (phrase === 1) {
      if (beat === 0) add([A2, G3, E3, D3][bar] / 2, 0.6, 0.05, 'sine');
      if (beat % 8 === 2) add([E4, G4, A4, C5][bar], 0.18, 0.018, 'triangle');
      if (beat === 10) add(A3, 0.16, 0.016, 'sine');
    } else if (phrase === 2) {
      if (beat === 0 || beat === 8) add(E3 / 2, 0.5, 0.045, 'sine');
      if (beat === 6) add(C4, 0.2, 0.02, 'sine');
      if (beat === 14) add(D4, 0.24, 0.018, 'triangle');
    } else if (phrase === 3) {
      var roots = [D3, C3, A2, G3];
      if (beat === 0) add(roots[bar] / 2, 0.55, 0.05, 'triangle');
      if (beat === 4 || beat === 12) add(roots[bar], 0.2, 0.02, 'sine');
      if (beat === 8) add(A4, 0.16, 0.014, 'sine');
    } else if (phrase === 4) {
      if (beat === 0) add(A2, 0.8, 0.046, 'sine');
      if (beat % 4 === 0) add([A3, C4, D4, E4, G4, E4, D4, C4][bar * 2 + (beat / 4) % 2], 0.14, 0.016, 'sine');
    } else {
      if (beat === 0) {
        add(D2, 0.9, 0.05, 'sine');
        add(A3, 0.4, 0.014, 'triangle');
      }
      if (beat === 8) add(C4, 0.22, 0.016, 'sine');
      if (beat === 12) add(D4, 0.28, 0.018, 'sine');
    }
    return ev;
  }

  var ctx = null;
  var musicGain = null;
  var wanted = true;
  var started = false;
  var hidden = false;
  var paused = false;
  var timer = 0;
  var step = 0;
  var nextTime = 0;

  function audible() {
    return wanted && started && !hidden && !paused;
  }

  function ensure() {
    var AC = global.AudioContext || global.webkitAudioContext;
    if (!AC) return false;
    if (!ctx) {
      ctx = new AC();
      musicGain = ctx.createGain();
      musicGain.gain.value = 0.75;
      var filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 1800;
      musicGain.connect(filter);
      filter.connect(ctx.destination);
    }
    return true;
  }

  function tone(freq, time, dur, peak, wave) {
    if (!ctx || peak <= 0) return;
    var o = ctx.createOscillator();
    o.type = wave || 'sine';
    o.frequency.setValueAtTime(Math.max(40, freq), time);
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(peak, time + Math.min(0.04, dur * 0.4));
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    o.connect(g);
    g.connect(musicGain);
    o.start(time);
    o.stop(time + dur + 0.03);
  }

  function playStep(when) {
    eventsForStep(step).forEach(function (ev) {
      tone(ev.f, when, ev.dur, ev.peak, ev.wave);
    });
  }

  function schedule() {
    if (!audible() || !ctx) return;
    var horizon = ctx.currentTime + 0.35;
    while (nextTime < horizon) {
      playStep(nextTime);
      nextTime += STEP;
      step += 1;
    }
  }

  function kick() {
    if (!ensure()) return;
    if (ctx.state === 'suspended') ctx.resume().catch(function () {});
    if (!timer) {
      nextTime = ctx.currentTime + 0.08;
      timer = global.setInterval(schedule, 120);
      schedule();
    }
  }

  function stop() {
    if (timer) {
      global.clearInterval(timer);
      timer = 0;
    }
  }

  function arm() {
    started = true;
    if (audible()) kick();
    else stop();
  }

  function setEnabled(on) {
    wanted = !!on;
    if (audible()) kick();
    else stop();
  }

  function setHidden(on) {
    hidden = !!on;
    if (audible()) kick();
    else stop();
  }

  function setPaused(on) {
    paused = !!on;
    if (audible()) kick();
    else stop();
  }

  function sfx(kind) {
    if (!wanted || !ensure()) return;
    if (ctx.state === 'suspended') ctx.resume().catch(function () {});
    var now = ctx.currentTime + 0.01;
    if (kind === 'lock') {
      tone(523.25, now, 0.18, 0.05, 'sine');
      tone(784, now + 0.08, 0.22, 0.03, 'triangle');
    } else if (kind === 'dispatch') {
      tone(196, now, 0.2, 0.05, 'triangle');
      tone(146.83, now + 0.1, 0.24, 0.04, 'sine');
    } else if (kind === 'ask') {
      tone(440, now, 0.08, 0.03, 'sine');
    } else if (kind === 'deny') {
      tone(110, now, 0.16, 0.04, 'triangle');
    } else if (kind === 'close') {
      tone(220, now, 0.4, 0.04, 'sine');
      tone(329.63, now + 0.12, 0.36, 0.03, 'sine');
    }
  }

  global.SlowAudio = {
    arm: arm,
    setEnabled: setEnabled,
    setHidden: setHidden,
    setPaused: setPaused,
    sfx: sfx
  };
})(window);
