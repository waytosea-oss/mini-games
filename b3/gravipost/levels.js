/* 五条短迷宫。字符即砖：墙、软垫、坑、补给、检查点、门、按钮、信箱、坡道、上层。 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GPLevels = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var META = {
    '#': ['wall', 0],
    '.': ['floor', 0],
    'p': ['pad', 0],
    'o': ['pit', 0],
    'u': ['supply', 0],
    'c': ['checkpoint', 0],
    's': ['start', 0],
    'b': ['button', 0],
    'd': ['door', 0],
    'm': ['goal', 0],
    'H': ['upper', 1],
    'T': ['stair', 0],
    'B': ['button', 1],
    'D': ['door', 1],
    'M': ['goal', 1]
  };

  function build(def) {
    var rows = def.rows;
    var w = rows[0].length;
    var grid = [];
    var y, x, ch, meta, cell;
    var level = {
      id: def.id,
      name: def.name,
      blurb: def.blurb,
      intro: def.intro,
      mailbox: def.mailbox,
      label: def.label,
      doorTime: def.doorTime,
      medalPower: def.medalPower,
      magnets: def.magnets || [],
      showBridge: !!def.showBridge,
      cols: w,
      rows: rows.length,
      grid: grid,
      start: null,
      buttons: [],
      goals: [],
      doors: [],
      supplies: [],
      checkpoints: []
    };
    for (y = 0; y < rows.length; y++) {
      if (rows[y].length !== w) throw new Error(def.id + ' row ' + y + ' width ' + rows[y].length);
      grid[y] = [];
      for (x = 0; x < w; x++) {
        ch = rows[y].charAt(x);
        meta = META[ch];
        if (!meta) throw new Error(def.id + ' bad ' + ch);
        cell = { x: x, y: y, k: meta[0], z: meta[1], ch: ch };
        grid[y][x] = cell;
        if (cell.k === 'start') level.start = { x: x + 0.5, y: y + 0.5, z: 0 };
        if (cell.k === 'button') level.buttons.push(cell);
        if (cell.k === 'goal') level.goals.push(cell);
        if (cell.k === 'door') level.doors.push(cell);
        if (cell.k === 'supply') level.supplies.push(cell);
        if (cell.k === 'checkpoint') level.checkpoints.push(cell);
      }
    }
    if (!level.start) throw new Error(def.id + ' missing start');
    if (!level.goals.length && !def.open) throw new Error(def.id + ' missing goal');
    return level;
  }

  var LEVELS = [
    build({
      id: 'straight',
      name: '直道试送',
      blurb: '直道、软垫、一扇门。先把惯性滚熟。',
      intro: '拨左侧转盘，重力会转向。松手以后，圆包裹仍顺着惯性滚动。',
      mailbox: 'square',
      label: '葡萄紫方盒',
      doorTime: 4.2,
      medalPower: 36,
      rows: [
        '#########',
        '##mmm####',
        '##...####',
        '##ppp####',
        '##...####',
        '##ddd####',
        '##bbb####',
        '##...####',
        '##...####',
        '##...####',
        '##.c.####',
        '##.s.####',
        '#########'
      ]
    }),
    build({
      id: 'pit',
      name: '拐角坑沿',
      blurb: '先拐到西侧走廊，回收坑占着东边。',
      intro: '朝北直冲会掉进回收坑。先把重力拨向西，再沿着西侧走廊往北。',
      mailbox: 'cylinder',
      label: '桃色圆筒',
      doorTime: 3.2,
      medalPower: 46,
      rows: [
        '###########',
        '#mmm#######',
        '#...#######',
        '#pp.#######',
        '#...#######',
        '#...#######',
        '#...#######',
        '#..oooooo##',
        '#.......oo#',
        '#c......s##',
        '###########'
      ]
    }),
    build({
      id: 'supply',
      name: '省电绕行',
      blurb: '刹车会持续耗电，补给座只有第一次经过会补满。',
      intro: '按住刹车会持续掉动力。东端的补给座只有第一次经过会补满，停在上面不会再补。',
      mailbox: 'hex',
      label: '铬六角管',
      doorTime: 3.2,
      medalPower: 48,
      rows: [
        '###########',
        '#mmm#######',
        '#...#######',
        '#.........#',
        '#.........#',
        '#.........#',
        '#######...#',
        '#######c..#',
        '#######...#',
        '#s.....uuu#',
        '###########'
      ]
    }),
    build({
      id: 'magnet',
      name: '磁场弯道',
      blurb: '圆磁场往回收坑拉，方磁场往东推。',
      intro: '西侧圆磁场会把包裹拉向回收坑。先偏到东侧，方磁场会顺着往东送一程。',
      mailbox: 'square',
      label: '葡萄紫方盒',
      doorTime: 3.2,
      medalPower: 52,
      magnets: [
        { type: 'circle', cx: 3.05, cy: 5.5, r: 2.65, strength: 62 },
        { type: 'square', x: 6.15, y: 4.05, w: 3.3, h: 3.2, ax: 3.1, ay: 0 }
      ],
      rows: [
        '###########',
        '##mmm######',
        '#.........#',
        '#.........#',
        '#oooo##...#',
        '#oooo##...#',
        '#oooo##...#',
        '#.........#',
        '#.........#',
        '##..c..####',
        '##..s..####',
        '###########'
      ]
    }),
    build({
      id: 'bridge',
      name: '双层栈桥',
      blurb: '从东侧坡道走上栈桥，再压圆钮开门。',
      intro: '下层朝北是回收坑。先到东侧缺口，走上坡道，到上层之后再压圆钮。',
      mailbox: 'hex',
      label: '铬六角管',
      doorTime: 5.4,
      medalPower: 86,
      showBridge: true,
      rows: [
        '###########',
        '##MMM######',
        '##HHH######',
        '##DDD######',
        '##BBBHHHH##',
        '###TTT....#',
        '###ooo....#',
        '#.........#',
        '#.........#',
        '#...c.....#',
        '#...s.....#',
        '###########'
      ]
    })
  ];

  return { LEVELS: LEVELS, build: build };
});
