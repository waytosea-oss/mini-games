/* Rivulet level book. Maps are 12×16, row 0 at the top.
   Every level carries a solution the simulator can apply; tools/verify.mjs
   refuses a build where that solution misses the cup or the start already wins. */
(function (root, factory) {
  var out = factory();
  if (typeof module === 'object' && module.exports) module.exports = out;
  else root.RIVULET = out;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var COLS = 12, ROWS = 16;
  var CHAPTERS = [
    { id: 'ink', name: 'First Streams', mechanic: 'Draw a gutter', from: 1, to: 10 },
    { id: 'plank', name: 'Sliding Gates', mechanic: 'Slide a gate', from: 11, to: 20 },
    { id: 'pipe', name: 'Elbow Pipes', mechanic: 'Turn a pipe', from: 21, to: 30 },
    { id: 'pin', name: 'Pull the Pin', mechanic: 'Pull a pin', from: 31, to: 40 },
    { id: 'valve', name: 'Floodgates', mechanic: 'Open a valve', from: 41, to: 45 },
    { id: 'sponge', name: 'Sponges', mechanic: 'Squeeze a sponge', from: 46, to: 50 },
    { id: 'steam', name: 'Kettle', mechanic: 'Route the steam', from: 51, to: 55 },
    { id: 'mix', name: 'Painted Water', mechanic: 'Mix two colors', from: 56, to: 60 },
    { id: 'mover', name: 'Clockwork', mechanic: 'Time a moving bridge', from: 61, to: 66 }
  ];
  var NAMES = {
    ink: ['First Drop', 'Little Ledge', 'Morning Pour', 'Bent Brook', 'Quiet Shelf', 'Second Bend', 'Long Slide', 'Tea for One', 'Garden Gutter', 'Last Ink'],
    plank: ['Shut Gate', 'Side Step', 'Cedar Sluice', 'Hold the Door', 'Mill Race', 'Left Latch', 'Right Latch', 'Low Gate', 'High Gate', 'Open Channel'],
    pipe: ['Turn Once', 'Upright', 'Wrong Elbow', 'Glass Joint', 'Spin the Bend', 'Vertical', 'Brass Neck', 'Align the Bore', 'Open Throat', 'True North'],
    pin: ['Pull It', 'One Peg', 'Stuck Hatch', 'Harbor Pin', 'Loose the Gate', 'Red Peg', 'Blue Peg', 'Drop the Bar', 'Unlatch', 'Free the Fall'],
    valve: ['Closed Tap', 'Brass Wheel', 'Let It Through', 'Sluice Gate', 'Open the Floor'],
    sponge: ['Dry Sponge', 'Give It a Squeeze', 'Thirsty', 'Wring It', 'Soft Plug'],
    steam: ['Kettle On', 'Lift the Lid', 'Cloud Gate', 'White River', 'Condenser'],
    mix: ['Two Taps', 'Make It Green', 'Yellow Meets Blue', 'Shared Bowl', 'Leaf Water'],
    mover: ['Tick Tock', 'The Gap', 'Wait for It', 'Pendulum', 'Clock Bridge', 'Last Gear']
  };
  function blank() {
    var g = [];
    for (var r = 0; r < ROWS; r++) {
      var s = '';
      for (var c = 0; c < COLS; c++) s += (r === 0 || c === 0 || c === COLS - 1) ? '#' : '.';
      g.push(s);
    }
    return g;
  }
  function set(g, c, r, ch) {
    c = c | 0;
    if (r < 0 || c < 0 || r >= ROWS || c >= COLS) return;
    var a = g[r].split(''); a[c] = ch; g[r] = a.join('');
  }
  function paintCup(g, c, r, iw, ih) {
    var y, x, k;
    for (y = 0; y < ih; y++) {
      set(g, c, r + y, '#'); set(g, c + iw + 1, r + y, '#');
      for (x = 1; x <= iw; x++) set(g, c + x, r + y, 'C');
    }
    for (x = 0; x < iw + 2; x++) set(g, c + x, r + ih, '#');
    for (k = 1; k <= 2; k++) set(g, c + iw + 1, r - k, '#');
  }
  function src(g, c, ch) {
    set(g, c, 1, ch || 'S'); set(g, c, 2, ch || 'S');
  }
  function walls(g, left, right, r0, r1) {
    for (var r = r0; r <= r1; r++) { set(g, left, r, '#'); set(g, right, r, '#'); }
  }
  function inkLen(pts) {
    var m = 0;
    for (var i = 1; i < pts.length; i++) {
      var dx = (pts[i][0] - pts[i - 1][0]) * 0.08, dy = (pts[i][1] - pts[i - 1][1]) * 0.08;
      m += Math.sqrt(dx * dx + dy * dy);
    }
    return m;
  }
  function base(partial) {
    partial.par = partial.par || [48, 22];
    partial.tank = partial.tank || 2.6;
    partial.need = partial.need == null ? 0.72 : partial.need;
    return partial;
  }

  var levels = [];
  function push(lv) { lv.id = levels.length + 1; levels.push(base(lv)); }

  /* ---------- 1–10 draw ---------- */
  var inkSpec = [
    [2, 6], [2, 5], [3, 6], [3, 7], [1, 5], [2, 7], [4, 7], [1, 6], [4, 6], [7, 1]
  ];
  inkSpec.forEach(function (pair, i) {
    var sc = pair[0], cupC = pair[1], dir = cupC >= sc ? 1 : -1;
    var g = blank();
    src(g, sc);
    paintCup(g, cupC, 11, 3, 2);
    var span = Math.abs((cupC + 1.5) - sc);
    var stroke = [
      [sc + (dir < 0 ? 0.9 : 0.15), 3.45],
      [sc + dir * span * 0.48, 6.15],
      [cupC + 1.35, 8.55],
      [cupC + 1.85, 10.25]
    ];
    var len = inkLen(stroke);
    push({
      name: NAMES.ink[i], chapter: 'ink',
      coach: i === 0 ? 'Drag a line. Water hugs fresh ink and runs downhill into the glass.' : '',
      hint: 'Draw one gentle slope from the falling stream into the mouth of the glass.',
      goal: 80, need: 0.75, tank: 2.8,
      par: i < 3 ? [55, 26] : [48, 22],
      ink: len * 1.9, ink2: len * 1.55, ink3: len * 1.22,
      map: g,
      solution: { ink: [stroke] }
    });
  });

  /* ---------- 11–20 sliding doors ---------- */
  for (var i = 0; i < 10; i++) {
    var sc = [3, 4, 5, 6, 7, 3, 4, 5, 6, 7][i];
    var row = i < 5 ? 8 : 6;
    var g = blank();
    src(g, sc);
    walls(g, sc - 1, sc + 2, 3, 14);
    paintCup(g, sc, 12, 2, 2);
    push({
      name: NAMES.plank[i], chapter: 'plank',
      coach: i === 0 ? 'Drag the gate sideways until the shaft is clear.' : '',
      hint: 'Slide the gate out of the shaft. Water only falls when the opening is clear.',
      goal: 70, need: 0.72, tank: 2.4,
      par: [42, 18],
      map: g,
      planks: [{ c0: sc + 0.5, r0: row, c1: sc + 5, r1: row, len: 4.2, thick: 3.2, ang: Math.PI / 2, t0: 0 }],
      solution: { planks: [1] }
    });
  }

  /* ---------- 21–30 pipes ---------- */
  for (var p = 0; p < 10; p++) {
    var scp = [3, 4, 5, 6, 7, 4, 5, 6, 3, 7][p];
    var pr = p < 5 ? 6 : 5;
    var g = blank();
    src(g, scp);
    walls(g, scp - 1, scp + 2, 3, 14);
    paintCup(g, scp, 12, 2, 2);
    push({
      name: NAMES.pipe[p], chapter: 'pipe',
      coach: p === 0 ? 'Tap the elbow until the bore runs straight down.' : '',
      hint: 'Tap the pipe to rotate it. Water passes only when the tunnel is vertical.',
      goal: 70, need: 0.7, tank: 2.4,
      par: [40, 16],
      map: g,
      pipes: [{ c: scp - 1, r: pr, rot: 2 }],
      solution: { pipes: [0] }
    });
  }

  /* ---------- 31–40 pins ---------- */
  for (var n = 0; n < 10; n++) {
    var scn = [3, 4, 5, 6, 7, 5, 4, 6, 3, 7][n];
    var pinR = n % 2 ? 6 : 8;
    var g = blank();
    src(g, scn);
    walls(g, scn - 1, scn + 2, 3, 14);
    paintCup(g, scn, 12, 2, 2);
    push({
      name: NAMES.pin[n], chapter: 'pin',
      coach: n === 0 ? 'Tap the pin. The hatch it holds will swing open.' : '',
      hint: 'Pull the pin that blocks the shaft. Leave any other latch alone.',
      goal: 70, need: 0.72, tank: 2.4,
      par: [40, 16],
      map: g,
      pins: [{ c: scn, r: pinR, w: 2, h: 2 }],
      solution: { pins: [true] }
    });
  }

  /* ---------- 41–45 valves ---------- */
  for (var v = 0; v < 5; v++) {
    var scv = [3, 4, 5, 6, 7][v];
    var g = blank();
    src(g, scv);
    walls(g, scv - 1, scv + 2, 3, 8);
    paintCup(g, scv, 11, 2, 2);
    push({
      name: NAMES.valve[v], chapter: 'valve',
      coach: v === 0 ? 'Tap the wheel to open the floor of the shaft.' : '',
      hint: 'Open the valve. Closed, the water only piles up and spills away.',
      goal: 60, need: 0.7, tank: 2.6,
      par: [40, 16],
      map: g,
      valves: [{ c: scv, r: 9, w: 2, h: 1, open: false }],
      solution: { valves: [true] }
    });
  }

  /* ---------- 46–50 sponges ---------- */
  for (var s = 0; s < 5; s++) {
    var scs = [3, 4, 5, 6, 7][s];
    var g = blank();
    src(g, scs);
    walls(g, scs - 1, scs + 2, 3, 10);
    paintCup(g, scs, 12, 2, 2);
    push({
      name: NAMES.sponge[s], chapter: 'sponge',
      coach: s === 0 ? 'Tap the sponge once so water can pass through it.' : '',
      hint: 'A dry sponge drinks the whole pour. Squeeze it and the stream falls through.',
      goal: 60, need: 0.7, tank: 2.6,
      par: [42, 18],
      map: g,
      sponges: [{ c: scs, r: 8, w: 2, h: 2, cap: 80 }],
      solution: { sponges: [true] }
    });
  }

  /* ---------- 51–55 steam ---------- */
  for (var h = 0; h < 5; h++) {
    var b = [2, 2, 3, 3, 4][h];
    var g = blank();
    set(g, b + 1, 2, 'S'); set(g, b + 1, 3, 'S');
    walls(g, b, b + 3, 4, 9);
    for (var c = b; c <= b + 3; c++) set(g, c, 9, '#');
    for (var r = 3; r <= 8; r++) set(g, b + 4, r, '#');
    paintCup(g, b + 5, 12, 2, 2);
    push({
      name: NAMES.steam[h], chapter: 'steam',
      coach: h === 0 ? 'Open the gate. Heat lifts the water; the cold coil turns it back into a stream.' : '',
      hint: 'Open the high gate so steam can drift across to the coil, then fall into the glass.',
      goal: 40, need: 0.55, tank: 3.5,
      par: [55, 28],
      map: g,
      heats: [{ c: b + 1, r: 7, w: 2, h: 2 }],
      condensers: [{ c: b + 5, r: 1, w: 2, h: 2 }],
      valves: [{ c: b + 4, r: 1, w: 1, h: 2, open: false }],
      solution: { valves: [true] }
    });
  }

  /* ---------- 56–60 color mix ---------- */
  for (var m = 0; m < 5; m++) {
    var bm = [2, 3, 3, 4, 4][m];
    var g = blank();
    set(g, bm + 1, 1, 'S'); set(g, bm + 1, 2, 'S');
    set(g, bm + 3, 1, 'A'); set(g, bm + 3, 2, 'A');
    walls(g, bm, bm + 4, 3, 8);
    for (var c2 = bm; c2 <= bm + 4; c2++) set(g, c2, 8, '#');
    set(g, bm + 2, 8, '.');
    paintCup(g, bm + 1, 11, 2, 2);
    push({
      name: NAMES.mix[m], chapter: 'mix',
      coach: m === 0 ? 'Pull the pin so blue and yellow share one bowl. Only green fills the glass.' : '',
      hint: 'The glass refuses pure blue or yellow. Pull the pin and let them mix before the outlet.',
      goal: 40, need: 0.55, tank: 3.8, cupColor: 3,
      par: [55, 28],
      map: g,
      pins: [{ c: bm + 2, r: 3, w: 1, h: 5 }],
      solution: { pins: [true] }
    });
  }

  /* ---------- 61–66 movers ---------- */
  for (var k = 0; k < 6; k++) {
    var scm = [3, 4, 5, 6, 4, 6][k];
    var g = blank();
    src(g, scm);
    walls(g, scm - 1, scm + 2, 3, 14);
    paintCup(g, scm, 12, 2, 2);
    push({
      name: NAMES.mover[k], chapter: 'mover',
      coach: k === 0 ? 'Open the valve. The bar keeps sliding — enough water still gets through.' : '',
      hint: 'Open the valve above the moving bar. You do not have to time it by hand.',
      goal: 50, need: 0.6, tank: 3.5,
      par: [60, 32],
      map: g,
      valves: [{ c: scm, r: 6, w: 2, h: 1, open: false }],
      movers: [{ c: scm, r: 9, w: 2.4, h: 0.7, axis: 'x', amp: 1.6, speed: 1.3, phase: k * 0.4 }],
      solution: { valves: [true] }
    });
  }

  if (levels.length !== 66) throw new Error('expected 66 levels, got ' + levels.length);
  return { LEVELS: levels, CHAPTERS: CHAPTERS, COLS: COLS, ROWS: ROWS };
});
