/* 行囊远征规则。
 * 邻接顺序固定：取暖 heat → 供能 energy → 触发 trigger。
 * 食物按路段消耗，工具按触发消耗耐久。用尽即离包，不自动补满。
 * 同一格一件。重叠或超出背包时不能确认出发。
 */
(function (global) {
  'use strict';

  var DIRS = [
    { name: 'up', dc: 0, dr: -1 },
    { name: 'down', dc: 0, dr: 1 },
    { name: 'left', dc: -1, dr: 0 },
    { name: 'right', dc: 1, dr: 0 }
  ];

  var MASKS = {
    tutorial: [
      [0, 1, 1, 1],
      [1, 1, 1, 1],
      [1, 1, 1, 1],
      [1, 1, 1, 1]
    ],
    trek: [
      [0, 1, 1, 1, 0],
      [1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1],
      [0, 1, 1, 1, 0]
    ]
  };

  function fp() {
    var cells = Array.prototype.slice.call(arguments);
    return cells;
  }

  var ITEMS = {
    stove: { name: '暖炉', group: 'heat', w: 3, dur: 3, upright: true, fp: fp([0, 0], [1, 0], [0, 1], [1, 1]),
      blurb: '暖到上下左右的格子。旁边有煤时这一段不耗耐久，否则耐久减一。' },
    torch: { name: '火把', group: 'heat', w: 1, dur: 4, fp: fp([0, 0], [0, 1]),
      blurb: '小幅取暖。每一段都会燃烧，耐久减一，燃尽后离开背包。' },
    coal: { name: '煤块', group: 'energy', w: 2, charges: 2, fp: fp([0, 0]),
      blurb: '贴着暖炉才供能，并消耗一份燃料。离了暖炉，只增加负重。' },
    bread: { name: '面包', group: 'food', w: 1, charges: 3, meal: 12, fp: fp([0, 0], [1, 0]),
      blurb: '每段吃一份，补给加十二。受暖再加八。' },
    ration: { name: '干粮袋', group: 'food', w: 4, charges: 4, meal: 26, upright: true, fp: fp([0, 0], [1, 0], [0, 1], [1, 1]),
      blurb: '每段吃一份。受暖时补给加二十六。没受暖会霉，只加八。又大又沉。' },
    flask: { name: '水壶', group: 'food', w: 1, charges: 3, meal: 8, fp: fp([0, 0], [0, 1]),
      blurb: '每段喝一口。泥路更解渴。结冰又没受暖时，水会变少。' },
    cup: { name: '搪瓷杯', group: 'food', w: 1, charges: 2, meal: 5, upright: true, fp: fp([0, 0]),
      blurb: '每段一饮。受暖后变成热饮，补给更高，并回复一点耐久。' },
    cozy: { name: '保温袋', group: 'warm', w: 2, upright: true, fp: fp([0, 0], [1, 0], [0, 1], [1, 1]),
      blurb: '受暖时大幅避寒。没受暖只有一半效果，而且占四格。' },
    bedroll: { name: '铺盖', group: 'warm', w: 2, fp: fp([0, 0], [0, 1], [0, 2]),
      blurb: '受暖时避寒，并让队伍耐久回复一点。细长，适合贴着热源。' },
    tarp: { name: '油布', group: 'warm', w: 1, fp: fp([0, 0], [1, 0]),
      blurb: '受暖时能挡泥，也挡一点霜。没受暖效果减半。' },
    hammer: { name: '锤子', group: 'tool', w: 2, dur: 4, metal: true, fp: fp([0, 0], [0, 1]),
      blurb: '被罗盘触发时修补队伍耐久。没触发就只算负重。金属没受暖会冻到旁边的食物。' },
    hatchet: { name: '斧头', group: 'tool', w: 2, dur: 4, metal: true, fp: fp([0, 0], [1, 0], [1, 1]),
      blurb: '被罗盘触发时开路，泥伤与霜伤都会下降。没触发就只算负重。' },
    sickle: { name: '镰刀', group: 'tool', w: 2, dur: 3, metal: true, fp: fp([0, 0], [0, 1], [1, 0]),
      blurb: '被罗盘触发时，冰路以外可以采到一点补给。冰路上触发，只白耗耐久。' },
    dagger: { name: '短刃', group: 'tool', w: 1, dur: 4, metal: true, fp: fp([0, 0], [0, 1]),
      blurb: '被罗盘触发时减轻疲劳。没受暖会冻到贴着的食物。' },
    pliers: { name: '钳子', group: 'tool', w: 2, dur: 4, metal: true, fp: fp([0, 0], [0, 1]),
      blurb: '被罗盘触发、又贴着另一件工具时，替那件工具保住一点耐久。' },
    rope: { name: '绳卷', group: 'tool', w: 5, dur: 4, fp: fp([0, 0], [1, 0], [0, 1], [1, 1]),
      blurb: '被罗盘触发时大幅减轻泥伤。不触发时是最沉的累赘，拿掉往往更轻松。' },
    compass: { name: '罗盘', group: 'trigger', w: 1, upright: true, fp: fp([0, 0]),
      blurb: '触发上下左右的工具。没有它，工具不会自己动手。' },
    potion: { name: '药瓶', group: 'energy', w: 1, charges: 1, fp: fp([0, 0]),
      blurb: '受暖后这一段喝下，回复耐久。没受暖就留着，只占重量。药草贴着它，回复更高。' },
    herbs: { name: '药草包', group: 'trigger', w: 1, charges: 2, fp: fp([0, 0]),
      blurb: '触发旁边的药瓶或食物。药瓶回复更高，食物补给更高，药草用掉一份。' },
    ore: { name: '矿石', group: 'loot', w: 4, fp: fp([0, 0]),
      blurb: '战利品。赶路时没有收益，负重却不小。留下它，下一段更累。' }
  };

  var TUTOR = [
    [
      enc('t-calm', '晨间平路', 'calm', null, 'camp', 10, 0, 0, 8, [], '路还平。食物会按这一段吃掉一份。'),
      enc('t-cut', '抄近的薄霜', 'ice', 'ice', 'ice', 10, 16, 0, 8, ['ice'], '近路有霜。火把要贴住保温袋。')
    ],
    [
      enc('t-frost', '薄霜坡', 'ice', 'ice', 'ice', 8, 14, 0, 8, ['ice'], '薄霜看保温袋有没有被火把暖到。'),
      enc('t-detour', '绕去浅泥', 'mud', 'mud', 'mud', 12, 0, 12, 8, ['mud'], '绕路是泥。斧头要挨着罗盘才会开路。')
    ],
    [
      enc('t-mud', '浅泥滩', 'mud', 'mud', 'mud', 12, 0, 14, 8, ['mud'], '浅泥里，被触发的斧头能开路。绳卷很沉，这段不必带。'),
      enc('t-frost2', '再遇薄霜', 'ice', 'ice', 'ice', 8, 18, 0, 8, ['ice', 'fatigue'], '又是霜。负重高过上限就会疲劳。')
    ],
    [
      enc('t-short', '归途', 'shortage', 'loot', 'camp', 14, 6, 0, 8, ['shortage', 'ice'], '最后一段口粮变少。受暖的食物更顶用。'),
      enc('t-herb', '药草坡', 'loot', 'loot', 'camp', 10, 0, 4, 12, ['mud'], '坡上有药草。走完可以选择带走。', 'herbs')
    ]
  ];

  var TREK = [
    [
      enc('frost-line', '霜线', 'ice', 'ice', 'ice', 10, 16, 0, 14, ['ice'], '霜从坡上下来。热源要贴住保暖的物件。'),
      enc('mud-line', '泥线', 'mud', 'mud', 'mud', 14, 0, 16, 14, ['mud'], '泥会拖住脚步。斧头或绳卷得挨着罗盘才开路。')
    ],
    [
      enc('deep-frost', '深霜', 'ice', 'ice', 'ice', 12, 26, 0, 12, ['ice', 'fatigue'], '深霜更冷，背得动的重量也更少。'),
      enc('bog', '泥泽', 'mud', 'mud', 'mud', 18, 0, 22, 14, ['mud', 'shortage'], '泥泽吃力，口粮也消耗得快。')
    ],
    [
      enc('shed', '荒棚', 'shortage', 'loot', 'camp', 20, 8, 0, 14, ['shortage', 'ice'], '棚里没有补给可拿，只能吃包里的。'),
      enc('vein', '矿脉', 'loot', 'loot', 'camp', 12, 0, 10, 14, ['mud'], '岩缝里有矿。走完可以选择留下或放弃。', 'ore')
    ],
    [
      enc('night-frost', '夜霜', 'ice', 'ice', 'ice', 14, 22, 0, 13, ['ice'], '最后一夜的霜。补给和耐久都得剩下。'),
      enc('home-mud', '归泥', 'mud', 'mud', 'mud', 16, 0, 18, 14, ['mud'], '回家的泥路。工具还在的话会轻松一些。')
    ]
  ];

  function enc(id, name, kind, art, bg, supply, ice, mud, threshold, badges, blurb, loot) {
    return {
      id: id, name: name, kind: kind, art: art, bg: bg,
      supply: supply, ice: ice, mud: mud, threshold: threshold,
      badges: badges, blurb: blurb, loot: loot || null
    };
  }

  function clone(obj) { return JSON.parse(JSON.stringify(obj)); }

  function maskFor(mode) { return MASKS[mode] || MASKS.trek; }

  function rowsOf(fpCells) {
    var R = 0;
    fpCells.forEach(function (p) { if (p[1] + 1 > R) R = p[1] + 1; });
    return R || 1;
  }

  function rotateCells(cells) {
    var R = rowsOf(cells);
    var next = cells.map(function (p) { return [R - 1 - p[1], p[0]]; });
    var minC = 99, minR = 99;
    next.forEach(function (p) {
      if (p[0] < minC) minC = p[0];
      if (p[1] < minR) minR = p[1];
    });
    return next.map(function (p) { return [p[0] - minC, p[1] - minR]; });
  }

  function footprint(id, rot) {
    var cells = ITEMS[id].fp.map(function (p) { return [p[0], p[1]]; });
    var n = ((rot || 0) % 4 + 4) % 4;
    for (var i = 0; i < n; i++) cells = rotateCells(cells);
    return cells;
  }

  function bounds(cells) {
    var w = 1, h = 1;
    cells.forEach(function (p) {
      if (p[0] + 1 > w) w = p[0] + 1;
      if (p[1] + 1 > h) h = p[1] + 1;
    });
    return { w: w, h: h };
  }

  function cellsOf(item) {
    return footprint(item.id, item.rot).map(function (p) {
      return [item.c + p[0], item.r + p[1]];
    });
  }

  function makeItem(id, uid, fields) {
    var def = ITEMS[id];
    var item = {
      uid: uid,
      id: id,
      rot: 0,
      c: null,
      r: null,
      charges: def.charges == null ? null : def.charges,
      dur: def.dur == null ? null : def.dur
    };
    if (id === 'bread' && fields && fields.tutorialBread) item.charges = 4;
    if (fields) {
      Object.keys(fields).forEach(function (k) { item[k] = fields[k]; });
    }
    return item;
  }

  function packItem(list, id, uidBox, c, r, rot, extra) {
    var fields = extra || {};
    fields.c = c;
    fields.r = r;
    fields.rot = rot || 0;
    var item = makeItem(id, uidBox.n++, fields);
    list.push(item);
    return item;
  }

  function stashItem(list, id, uidBox, extra) {
    list.push(makeItem(id, uidBox.n++, extra || null));
  }

  function createRun(mode) {
    var uid = { n: 1 };
    var pack = [];
    var stash = [];
    if (mode === 'tutorial') {
      packItem(pack, 'torch', uid, 1, 0, 0);
      packItem(pack, 'cup', uid, 2, 0, 0);
      packItem(pack, 'compass', uid, 3, 0, 0);
      packItem(pack, 'bread', uid, 0, 1, 1, { tutorialBread: true, charges: 4 });
      packItem(pack, 'hatchet', uid, 2, 1, 0);
      packItem(pack, 'cozy', uid, 1, 2, 0);
      stashItem(stash, 'tarp', uid);
      stashItem(stash, 'rope', uid);
      stashItem(stash, 'coal', uid);
    } else {
      packItem(pack, 'bread', uid, 1, 0, 0);
      packItem(pack, 'herbs', uid, 3, 0, 0);
      packItem(pack, 'cup', uid, 0, 1, 0);
      packItem(pack, 'stove', uid, 1, 1, 0);
      packItem(pack, 'coal', uid, 3, 1, 0);
      packItem(pack, 'flask', uid, 0, 2, 0);
      packItem(pack, 'cozy', uid, 3, 2, 0);
      packItem(pack, 'hatchet', uid, 1, 3, 3);
      packItem(pack, 'compass', uid, 2, 4, 0);
      ['torch', 'ration', 'potion', 'bedroll', 'tarp', 'hammer', 'sickle', 'dagger', 'pliers', 'rope', 'ore'].forEach(function (id) {
        stashItem(stash, id, uid);
      });
    }
    return {
      mode: mode,
      segment: 0,
      supply: mode === 'tutorial' ? 62 : 64,
      durability: mode === 'tutorial' ? 78 : 82,
      phase: 'camp',
      route: null,
      pack: pack,
      stash: stash,
      nextUid: uid.n,
      log: [],
      result: null,
      snapshot: null,
      loot: null
    };
  }

  function findItem(run, uid) {
    var i;
    for (i = 0; i < run.pack.length; i++) if (run.pack[i].uid === uid) return { item: run.pack[i], where: 'pack', index: i };
    for (i = 0; i < run.stash.length; i++) if (run.stash[i].uid === uid) return { item: run.stash[i], where: 'stash', index: i };
    return null;
  }

  function ownerMap(pack, ignoreUid) {
    var map = {};
    pack.forEach(function (it) {
      if (it.uid === ignoreUid || it.c == null) return;
      cellsOf(it).forEach(function (p) { map[p[0] + ',' + p[1]] = it; });
    });
    return map;
  }

  function placement(run, item, c, r, ignoreUid) {
    var mask = maskFor(run.mode);
    var local = footprint(item.id, item.rot);
    var map = ownerMap(run.pack, ignoreUid == null ? item.uid : ignoreUid);
    var cells = [];
    for (var i = 0; i < local.length; i++) {
      var cc = c + local[i][0];
      var rr = r + local[i][1];
      if (rr < 0 || cc < 0 || rr >= mask.length || cc >= mask[0].length) {
        return { ok: false, reason: '超出背包' };
      }
      if (!mask[rr][cc]) return { ok: false, reason: '这个角封住了，不能放' };
      var other = map[cc + ',' + rr];
      if (other) return { ok: false, reason: '和' + ITEMS[other.id].name + '重叠' };
      cells.push([cc, rr]);
    }
    return { ok: true, cells: cells };
  }

  function validate(run) {
    var seen = {};
    for (var i = 0; i < run.pack.length; i++) {
      var it = run.pack[i];
      var check = placement(run, it, it.c, it.r, it.uid);
      if (!check.ok) return check;
      for (var k = 0; k < check.cells.length; k++) {
        var key = check.cells[k].join(',');
        if (seen[key]) return { ok: false, reason: '有格子叠了两件' };
        seen[key] = true;
      }
    }
    return { ok: true, reason: '' };
  }

  function canEdit(run) { return run.phase === 'camp'; }

  function tryPlace(run, uid, c, r) {
    if (!canEdit(run)) return { ok: false, reason: '这一段已经出发，背包锁住了' };
    var found = findItem(run, uid);
    if (!found) return { ok: false, reason: '找不到这件东西' };
    var item = found.item;
    var check = placement(run, item, c, r, item.uid);
    if (!check.ok) return check;
    if (found.where === 'stash') {
      run.stash.splice(found.index, 1);
      run.pack.push(item);
    }
    item.c = c;
    item.r = r;
    return { ok: true, reason: '' };
  }

  function tryStash(run, uid) {
    if (!canEdit(run)) return { ok: false, reason: '这一段已经出发，背包锁住了' };
    var found = findItem(run, uid);
    if (!found) return { ok: false, reason: '找不到这件东西' };
    if (found.where === 'pack') {
      run.pack.splice(found.index, 1);
      found.item.c = null;
      found.item.r = null;
      run.stash.push(found.item);
    }
    return { ok: true, reason: '' };
  }

  function tryRotate(run, uid) {
    if (!canEdit(run)) return { ok: false, reason: '这一段已经出发，背包锁住了' };
    var found = findItem(run, uid);
    if (!found) return { ok: false, reason: '找不到这件东西' };
    var item = found.item;
    var prev = item.rot;
    item.rot = (item.rot + 1) % 4;
    if (found.where === 'pack') {
      var check = placement(run, item, item.c, item.r, item.uid);
      if (!check.ok) {
        item.rot = prev;
        return check;
      }
    }
    return { ok: true, reason: '', upright: !!ITEMS[item.id].upright, rot: item.rot };
  }

  function sameCells(a, b) {
    var as = a.map(function (p) { return p.join(','); }).sort().join('|');
    var bs = b.map(function (p) { return p.join(','); }).sort().join('|');
    return as === bs;
  }

  function segmentChoices(mode, index) {
    var table = mode === 'tutorial' ? TUTOR : TREK;
    return table[index];
  }

  function resolve(state, encounter) {
    var run = clone(state);
    var enc = encounter;
    var log = [];
    var arrows = [];
    var beneficiaries = [];
    var arrowSeen = {};

    function say(phase, text, kind, extra) {
      var row = { phase: phase, text: text, kind: kind || 'info' };
      if (extra) Object.keys(extra).forEach(function (k) { row[k] = extra[k]; });
      log.push(row);
    }

    function arrow(type, dir, c, r, uid) {
      var key = type + ':' + dir + ':' + c + ':' + r + ':' + uid;
      if (arrowSeen[key]) return;
      arrowSeen[key] = true;
      arrows.push({ type: type, dir: dir, c: c, r: r, uid: uid });
    }

    var pack = run.pack.filter(function (it) { return it.c != null; });
    var cellOwner = ownerMap(pack, null);

    function linksOf(it) {
      var found = {};
      var list = [];
      cellsOf(it).forEach(function (p) {
        DIRS.forEach(function (d) {
          var key = (p[0] + d.dc) + ',' + (p[1] + d.dr);
          var other = cellOwner[key];
          if (other && other.uid !== it.uid && !found[other.uid]) {
            found[other.uid] = true;
            list.push({ item: other, dir: d.name, fromC: p[0], fromR: p[1] });
          }
        });
      });
      return list;
    }

    var weight = 0;
    pack.forEach(function (it) { weight += ITEMS[it.id].w; });
    var excess = Math.max(0, weight - enc.threshold);
    say('weight', '负重 ' + weight + '，这一段上限 ' + enc.threshold + (excess ? '，超出 ' + excess + '。' : '，没有超出。'), excess ? 'bad' : 'good');

    var warmCells = {};
    var heatSources = pack.filter(function (it) {
      return ITEMS[it.id].group === 'heat' && it.dur > 0;
    });
    heatSources.forEach(function (src) {
      cellsOf(src).forEach(function (p) {
        DIRS.forEach(function (d) {
          var key = (p[0] + d.dc) + ',' + (p[1] + d.dr);
          if (cellOwner[key] && cellOwner[key].uid !== src.uid) warmCells[key] = src.uid;
        });
      });
    });

    function isWarmed(it) {
      return cellsOf(it).some(function (p) { return warmCells[p[0] + ',' + p[1]]; });
    }

    var fueled = {};
    var coalUsed = {};
    heatSources.forEach(function (src) {
      if (src.id !== 'stove') return;
      var coalLink = null;
      linksOf(src).forEach(function (link) {
        if (!coalLink && link.item.id === 'coal' && link.item.charges > 0 && !coalUsed[link.item.uid]) coalLink = link;
      });
      if (coalLink) {
        fueled[src.uid] = coalLink.item.uid;
        coalUsed[coalLink.item.uid] = src.uid;
      }
    });

    if (!heatSources.length) say('heat', '包里没有还燃着的热源。', 'bad');
    heatSources.forEach(function (src) {
      var names = [];
      pack.forEach(function (it) {
        if (it.uid === src.uid) return;
        var hit = cellsOf(it).some(function (p) { return warmCells[p[0] + ',' + p[1]] === src.uid; });
        if (hit) names.push(ITEMS[it.id].name);
      });
      names = names.filter(function (n, i) { return names.indexOf(n) === i; });
      if (names.length) {
        say('heat', ITEMS[src.id].name + '暖到了' + names.join('、') + '。', 'good');
        names.forEach(function (n) { beneficiaries.push({ phase: 'heat', name: n, why: '被' + ITEMS[src.id].name + '暖到' }); });
      } else {
        say('heat', ITEMS[src.id].name + '四周没有挨着的物件。', 'info');
      }
      cellsOf(src).forEach(function (p) {
        DIRS.forEach(function (d) {
          var other = cellOwner[(p[0] + d.dc) + ',' + (p[1] + d.dr)];
          if (other && other.uid !== src.uid) arrow('heat', d.name, p[0], p[1], other.uid);
        });
      });
      if (src.id === 'torch') {
        src.dur -= 1;
        say('heat', '火把烧了一截，耐久剩 ' + Math.max(0, src.dur) + '。', src.dur <= 0 ? 'bad' : 'info', { uid: src.uid });
      }
      if (src.id === 'stove') {
        if (fueled[src.uid]) say('heat', '暖炉旁边有煤，这一段先不耗暖炉耐久。', 'good');
        else {
          src.dur -= 1;
          say('heat', '暖炉没有挨着可用的煤，耐久剩 ' + Math.max(0, src.dur) + '。', 'bad', { uid: src.uid });
        }
      }
    });

    var shelter = 0;
    var mudCover = 0;
    var heal = 0;
    pack.forEach(function (it) {
      var warm = isWarmed(it);
      if (it.id === 'cozy') {
        var add = warm ? 12 : 5;
        shelter += add;
        say('heat', warm ? '保温袋受暖，避寒 ' + add + '。' : '保温袋没受暖，避寒只有 ' + add + '。', warm ? 'good' : 'bad', { uid: it.uid });
        beneficiaries.push({ phase: 'heat', name: '保温袋', why: warm ? '受暖，避寒更高' : '没受暖，避寒减半' });
      }
      if (it.id === 'bedroll') {
        var badd = warm ? 8 : 3;
        shelter += badd;
        if (warm) {
          heal += 4;
          say('heat', '铺盖受暖，避寒 ' + badd + '，队伍耐久＋4。', 'good', { uid: it.uid });
        } else {
          say('heat', '铺盖没受暖，避寒只有 ' + badd + '。', 'info', { uid: it.uid });
        }
      }
      if (it.id === 'tarp') {
        var tadd = warm ? 4 : 2;
        var madd = warm ? 8 : 3;
        shelter += tadd;
        mudCover += madd;
        say('heat', '油布' + (warm ? '受暖' : '没受暖') + '，避寒 ' + tadd + '，挡泥 ' + madd + '。', warm ? 'good' : 'info', { uid: it.uid });
      }
    });

    Object.keys(fueled).forEach(function (srcUid) {
      var coal = null;
      pack.forEach(function (it) { if (it.uid === fueled[srcUid]) coal = it; });
      if (!coal) return;
      coal.charges -= 1;
      say('energy', '煤块给暖炉供能，燃料剩 ' + coal.charges + '。', 'good', { uid: coal.uid });
      beneficiaries.push({ phase: 'energy', name: '暖炉', why: '得到煤块供能' });
      linksOf(coal).forEach(function (link) {
        if (link.item.uid === Number(srcUid) || String(link.item.uid) === String(srcUid)) {
          arrow('energy', link.dir, link.fromC, link.fromR, link.item.uid);
        }
      });
    });
    pack.forEach(function (it) {
      if (it.id === 'coal' && !coalUsed[it.uid]) {
        say('energy', '煤块没有贴着暖炉，这一段只增加负重。', 'bad', { uid: it.uid });
      }
    });

    var drunk = {};
    pack.forEach(function (it) {
      if (it.id !== 'potion' || !(it.charges > 0)) return;
      if (isWarmed(it)) {
        it.charges -= 1;
        heal += 12;
        drunk[it.uid] = true;
        say('energy', '喝下温热的药瓶，耐久＋12。', 'good', { uid: it.uid });
        beneficiaries.push({ phase: 'energy', name: '药瓶', why: '受暖后喝下' });
      } else {
        say('energy', '药瓶没有受暖，这一段先留着。', 'info', { uid: it.uid });
      }
    });

    var iceResist = 0;
    var mudResist = mudCover;
    var fatigueReduce = 0;
    var forage = 0;
    var mealBonus = {};
    var repair = {};
    var triggered = {};

    function applyTool(it, linkFromCompass) {
      var name = ITEMS[it.id].name;
      if (it.id === 'hatchet') {
        iceResist += 6;
        mudResist += 10;
        say('trigger', '罗盘触发斧头，霜伤减 6，泥伤减 10。', 'good', { uid: it.uid });
      } else if (it.id === 'sickle') {
        if (enc.ice > 0 && enc.mud <= 0) {
          say('trigger', '罗盘触发了镰刀。冰面上没有东西可采，耐久仍会减少。', 'bad', { uid: it.uid });
        } else {
          forage += 8;
          say('trigger', '罗盘触发镰刀，沿途采到补给 8。', 'good', { uid: it.uid });
        }
      } else if (it.id === 'hammer') {
        heal += 6;
        say('trigger', '罗盘触发锤子，队伍耐久＋6。', 'good', { uid: it.uid });
      } else if (it.id === 'dagger') {
        fatigueReduce += 5;
        say('trigger', '罗盘触发短刃，疲劳伤害减 5。', 'good', { uid: it.uid });
      } else if (it.id === 'rope') {
        mudResist += 14;
        if (enc.mud <= 0) say('trigger', '罗盘触发绳卷。这段没有泥泞，绳几乎没派上用场。', 'bad', { uid: it.uid });
        else say('trigger', '罗盘触发绳卷，泥伤减 14。', 'good', { uid: it.uid });
      } else if (it.id === 'pliers') {
        var other = null;
        linksOf(it).forEach(function (link) {
          if (!other && ITEMS[link.item.id].group === 'tool' && link.item.uid !== it.uid) other = link.item;
        });
        if (other) {
          repair[other.uid] = (repair[other.uid] || 0) + 1;
          say('trigger', '罗盘触发钳子，帮' + ITEMS[other.id].name + '保住 1 点耐久。', 'good', { uid: it.uid });
        } else {
          heal += 1;
          say('trigger', '钳子被触发，旁边没有别的工具，队伍耐久＋1。', 'info', { uid: it.uid });
        }
      }
      it.dur -= 1;
      say('trigger', name + '的耐久剩 ' + Math.max(0, it.dur) + '。', it.dur <= 0 ? 'bad' : 'info', { uid: it.uid });
      beneficiaries.push({ phase: 'trigger', name: name, why: '被罗盘触发' });
      if (linkFromCompass) arrow('trigger', linkFromCompass.dir, linkFromCompass.fromC, linkFromCompass.fromR, it.uid);
    }

    var compasses = pack.filter(function (it) { return it.id === 'compass'; });
    if (!compasses.length) say('trigger', '没有罗盘，工具不会自己动手。', 'info');
    compasses.forEach(function (comp) {
      var any = false;
      linksOf(comp).forEach(function (link) {
        var it = link.item;
        var group = ITEMS[it.id].group;
        if (group === 'tool' && it.dur > 0 && !triggered[it.uid]) {
          triggered[it.uid] = true;
          any = true;
          applyTool(it, link);
        } else if (group === 'food' && it.charges > 0) {
          mealBonus[it.uid] = (mealBonus[it.uid] || 0) + 3;
          any = true;
          say('trigger', '罗盘挨着' + ITEMS[it.id].name + '，这份食物的补给多 3。', 'good', { uid: it.uid });
          beneficiaries.push({ phase: 'trigger', name: ITEMS[it.id].name, why: '被罗盘照应' });
          arrow('trigger', link.dir, link.fromC, link.fromR, it.uid);
        }
      });
      if (!any) say('trigger', '罗盘四周没有能触发的物件。', 'info');
    });

    pack.forEach(function (it) {
      if (it.id !== 'herbs' || !(it.charges > 0)) return;
      var potionLink = null;
      var foodLink = null;
      linksOf(it).forEach(function (link) {
        if (!potionLink && link.item.id === 'potion' && (link.item.charges > 0 || drunk[link.item.uid])) potionLink = link;
        if (!foodLink && ITEMS[link.item.id].group === 'food' && link.item.charges > 0) {
          if (!foodLink || ITEMS[link.item.id].meal > ITEMS[foodLink.item.id].meal) foodLink = link;
        }
      });
      if (potionLink) {
        var pot = potionLink.item;
        if (drunk[pot.uid]) {
          heal += 6;
          it.charges -= 1;
          say('trigger', '药草让这一口温药更足，耐久再＋6。', 'good', { uid: it.uid });
        } else if (pot.charges > 0) {
          heal += 6;
          pot.charges -= 1;
          it.charges -= 1;
          say('trigger', '药草把没有暖过的药瓶调开，耐久＋6。', 'info', { uid: pot.uid });
        }
        beneficiaries.push({ phase: 'trigger', name: '药瓶', why: '被药草触发' });
        arrow('trigger', potionLink.dir, potionLink.fromC, potionLink.fromR, pot.uid);
      } else if (foodLink) {
        mealBonus[foodLink.item.uid] = (mealBonus[foodLink.item.uid] || 0) + 8;
        it.charges -= 1;
        say('trigger', '药草拌进' + ITEMS[foodLink.item.id].name + '，这份补给多 8。', 'good', { uid: foodLink.item.uid });
        beneficiaries.push({ phase: 'trigger', name: ITEMS[foodLink.item.id].name, why: '被药草拌过' });
        arrow('trigger', foodLink.dir, foodLink.fromC, foodLink.fromR, foodLink.item.uid);
      } else {
        say('trigger', '药草没有挨着食物或药瓶，这一段不动用。', 'info', { uid: it.uid });
      }
    });

    Object.keys(repair).forEach(function (uid) {
      var tool = null;
      pack.forEach(function (it) { if (String(it.uid) === String(uid)) tool = it; });
      if (!tool || tool.dur == null) return;
      tool.dur += repair[uid];
      var cap = ITEMS[tool.id].dur;
      if (tool.dur > cap) tool.dur = cap;
      say('trigger', ITEMS[tool.id].name + '被钳子补回后，耐久为 ' + tool.dur + '。', 'good', { uid: tool.uid });
    });

    var meals = 0;
    pack.forEach(function (it) {
      var def = ITEMS[it.id];
      if (def.group !== 'food' || !(it.charges > 0)) return;
      var warm = isWarmed(it);
      var meal = def.meal;
      var notes = [];
      if (it.id === 'ration') {
        if (warm) notes.push('受暖，干粮保持干燥');
        else { meal = 8; notes.push('没受暖，干粮霉了一部分'); }
      } else if (it.id === 'bread') {
        if (warm) { meal += 8; notes.push('受暖'); }
        else notes.push('没有受暖');
      } else if (it.id === 'flask') {
        if (enc.ice > 0 && !warm) { meal = 3; notes.push('霜里水变少'); }
        else {
          if (warm && enc.ice > 0) notes.push('受暖，水没有冻住');
          if (enc.mud > 0) { meal += 6; notes.push('泥路更解渴'); }
        }
      } else if (it.id === 'cup') {
        if (warm) { meal += 7; heal += 4; notes.push('热饮，耐久＋4'); }
        else notes.push('凉的');
      }
      if (mealBonus[it.uid]) {
        meal += mealBonus[it.uid];
        notes.push('邻接多了 ' + mealBonus[it.uid]);
      }
      var chiller = null;
      linksOf(it).forEach(function (link) {
        if (!chiller && ITEMS[link.item.id].metal && !isWarmed(link.item)) chiller = link.item;
      });
      if (chiller) {
        meal -= 8;
        notes.push(ITEMS[chiller.id].name + '没受暖，冻到了这份食物');
      }
      if (meal < 0) meal = 0;
      meals += meal;
      it.charges -= 1;
      say('food', def.name + '吃掉一份，补给＋' + meal + '。' + (notes.length ? notes.join('，') + '。' : '') + '还剩 ' + it.charges + ' 份。', 'info', { uid: it.uid, event: 'eat' });
    });
    meals += forage;
    var gain = meals;
    var nextS = run.supply + gain - enc.supply;
    var overflow = Math.max(0, nextS - 100);
    say('food', '补给进账 ' + gain + '，路段消耗 ' + enc.supply + '。', 'info');
    if (overflow) say('food', '补给装到顶，溢出 ' + overflow + '。多带的口粮没有留下。', 'bad');
    nextS = Math.max(0, Math.min(100, nextS));

    var iceDmg = Math.max(0, enc.ice - shelter - iceResist);
    var mudDmg = Math.max(0, enc.mud - mudResist);
    var fatigue = Math.max(0, excess * 3 - fatigueReduce);
    if (enc.ice > 0) {
      say('harm', '霜寒 ' + enc.ice + '，避寒 ' + shelter + '，工具抵消 ' + iceResist + '，实际削耐久 ' + iceDmg + '。', iceDmg ? 'bad' : 'good');
    }
    if (enc.mud > 0) {
      say('harm', '泥泞 ' + enc.mud + '，挡泥与开路抵消 ' + mudResist + '，实际削耐久 ' + mudDmg + '。', mudDmg ? 'bad' : 'good');
    }
    if (!enc.ice && !enc.mud) say('harm', '这段路没有霜，也没有泥。', 'good');
    say('harm', excess
      ? '超出负重 ' + excess + '，疲劳削耐久 ' + fatigue + '。'
      : '负重没有超出上限，没有疲劳伤害。', excess ? 'bad' : 'good');
    if (heal) say('harm', '这一段回复耐久 ' + heal + '。', 'good');

    var nextD = run.durability - iceDmg - mudDmg - fatigue + heal;
    nextD = Math.min(100, nextD);

    var removed = [];
    var kept = [];
    pack.forEach(function (it) {
      var dead = (it.charges != null && it.charges <= 0) || (it.dur != null && it.dur <= 0);
      if (dead) {
        removed.push(it);
        say('end', ITEMS[it.id].name + '用尽，格子空了出来，不会自动补上。', 'bad', { uid: it.uid, event: 'gone' });
      } else kept.push(it);
    });

    var supplyFail = nextS <= 0;
    var duraFail = nextD <= 0;
    if (supplyFail) say('end', '补给在「' + enc.name + '」耗尽。', 'bad');
    if (duraFail) {
      var bits = [];
      if (iceDmg) bits.push('霜伤 ' + iceDmg);
      if (mudDmg) bits.push('泥伤 ' + mudDmg);
      if (fatigue) bits.push('疲劳 ' + fatigue);
      say('end', '耐久在「' + enc.name + '」耗尽。' + (bits.length ? '关键原因：' + bits.join('，') + '。' : ''), 'bad');
    }
    if (!supplyFail && !duraFail) {
      say('end', '这一段走完。补给 ' + nextS + '，耐久 ' + Math.max(0, nextD) + '。', 'good');
    }

    return {
      ok: !supplyFail && !duraFail,
      supply: supplyFail ? 0 : nextS,
      durability: duraFail ? 0 : Math.max(0, nextD),
      pack: kept,
      stash: run.stash,
      log: log,
      arrows: arrows,
      beneficiaries: beneficiaries,
      weight: weight,
      excess: excess,
      removed: removed.map(function (it) { return it.id; }),
      fail: {
        supply: supplyFail,
        durability: duraFail,
        ice: iceDmg,
        mud: mudDmg,
        fatigue: fatigue,
        name: enc.name
      }
    };
  }

  function playthrough(mode, choices, mutate) {
    var run = createRun(mode);
    if (mutate) mutate(run);
    var logs = [];
    for (var i = 0; i < 4; i++) {
      var pair = segmentChoices(mode, i);
      var side = choices && choices[i] === 'b' ? 1 : 0;
      var encounter = pair[side];
      run.route = side === 1 ? 'b' : 'a';
      var result = resolve(run, encounter);
      logs.push({
        index: i,
        name: encounter.name,
        ok: result.ok,
        supply: result.supply,
        durability: result.durability,
        fail: result.fail,
        removed: result.removed,
        log: result.log
      });
      if (!result.ok) return { ok: false, at: i, name: encounter.name, logs: logs, run: run };
      run.supply = result.supply;
      run.durability = result.durability;
      run.pack = result.pack;
      run.segment = i + 1;
    }
    return { ok: true, logs: logs, run: run };
  }

  function phasesInOrder(log) {
    var rank = { weight: 0, heat: 1, energy: 2, trigger: 3, food: 4, harm: 5, end: 6 };
    var prev = -1;
    for (var i = 0; i < log.length; i++) {
      var r = rank[log[i].phase];
      if (r < prev) return false;
      prev = r;
    }
    return true;
  }

  function runSelfCheck() {
    var failures = [];
    var lines = [];
    function fail(msg) { failures.push(msg); }

    [['hatchet', 1, [[1, 0], [1, 1], [0, 1]]],
      ['hatchet', 2, [[1, 1], [0, 1], [0, 0]]],
      ['hatchet', 3, [[0, 1], [0, 0], [1, 0]]],
      ['sickle', 1, [[1, 0], [0, 0], [1, 1]]],
      ['sickle', 3, [[0, 1], [1, 1], [0, 0]]],
      ['bedroll', 1, [[2, 0], [1, 0], [0, 0]]],
      ['bedroll', 3, [[0, 0], [1, 0], [2, 0]]],
      ['torch', 1, [[1, 0], [0, 0]]]
    ].forEach(function (row) {
      if (!sameCells(footprint(row[0], row[1]), row[2])) fail(row[0] + ' 旋转 ' + row[1] + ' 脚印不对');
    });
    lines.push('脚印旋转与美术包一致');

    var tutorial = playthrough('tutorial', ['a', 'a', 'a', 'a']);
    if (!tutorial.ok) fail('教学默认摆法没有走完：' + (tutorial.name || '') + ' ' + JSON.stringify(tutorial.logs[tutorial.at] && tutorial.logs[tutorial.at].fail));
    else lines.push('教学四段可过，补给 ' + tutorial.run.supply + '，耐久 ' + tutorial.run.durability);

    var taught = playthrough('tutorial', ['b', 'b', 'b', 'a']);
    if (!taught.ok) fail('教学换路也应能过：' + taught.name);
    else lines.push('教学换路可过');

    if (!validate(createRun('tutorial')).ok) fail('教学初始背包不合法：' + validate(createRun('tutorial')).reason);
    if (!validate(createRun('trek')).ok) fail('远征初始背包不合法：' + validate(createRun('trek')).reason);

    var coalOn = playthrough('tutorial', ['a', 'a', 'a', 'a'], function (run) {
      var coal = run.stash.filter(function (it) { return it.id === 'coal'; })[0];
      var placed = tryPlace(run, coal.uid, 0, 3);
      if (!placed.ok) fail('教学煤块放不进去：' + placed.reason);
    });
    var coalOff = tutorial;
    if (!(coalOff.ok && coalOn.run.durability < coalOff.run.durability)) {
      fail('拿掉没处供能的煤，教学耐久没有更高：带煤 ' + (coalOn.ok ? coalOn.run.durability : '失败') + '，不带 ' + (coalOff.ok ? coalOff.run.durability : '失败'));
    } else lines.push('拿掉多余的煤更稳：带煤耐久 ' + coalOn.run.durability + '，不带 ' + coalOff.run.durability);

    var ropeSwap = createRun('tutorial');
    var cozy = ropeSwap.pack.filter(function (it) { return it.id === 'cozy'; })[0];
    var cozyC = cozy.c;
    var cozyR = cozy.r;
    tryStash(ropeSwap, cozy.uid);
    var rope = ropeSwap.stash.filter(function (it) { return it.id === 'rope'; })[0];
    var ropePut = tryPlace(ropeSwap, rope.uid, cozyC, cozyR);
    if (!ropePut.ok) fail('卸下保温袋后绳卷仍放不进：' + ropePut.reason);
    var withRope = resolve(ropeSwap, segmentChoices('tutorial', 1)[0]);
    var noRope = resolve(createRun('tutorial'), segmentChoices('tutorial', 1)[0]);
    if (!(noRope.durability > withRope.durability)) {
      fail('薄霜上拿掉绳卷、留住保温袋，耐久没有更高');
    } else lines.push('薄霜留保温袋、不带绳卷，耐久更高');

    var trek = playthrough('trek', ['a', 'b', 'b', 'b']);
    if (!trek.ok) fail('远征建议路线没有走完：第 ' + trek.at + ' 段 ' + trek.name + ' ' + JSON.stringify(trek.logs[trek.at].fail));
    else lines.push('远征建议路线可过，补给 ' + trek.run.supply + '，耐久 ' + trek.run.durability);

    var hoard = playthrough('trek', ['a', 'a', 'a', 'a'], function (run) {
      run.pack = [];
      var uid = { n: 50 };
      packItem(run.pack, 'ration', uid, 1, 1, 0);
      packItem(run.pack, 'stove', uid, 1, 3, 0);
      packItem(run.pack, 'rope', uid, 3, 1, 0);
      packItem(run.pack, 'ore', uid, 3, 0, 0);
      packItem(run.pack, 'cozy', uid, 3, 3, 0);
    });
    if (hoard.ok) fail('把大件塞满也能走完霜线，携行代价没有成立');
    else lines.push('塞满大件会在「' + hoard.name + '」准备不足');

    var chill = createRun('trek');
    chill.pack = [];
    chill.supply = 8;
    chill.durability = 40;
    var uid2 = { n: 80 };
    packItem(chill.pack, 'torch', uid2, 1, 1, 0);
    packItem(chill.pack, 'bread', uid2, 2, 1, 1);
    packItem(chill.pack, 'dagger', uid2, 3, 1, 0);
    var probe = enc('probe', '试探', 'calm', null, 'camp', 22, 0, 0, 20, [], '试');
    var withDagger = resolve(chill, probe);
    var bare = clone(chill);
    bare.pack = bare.pack.filter(function (it) { return it.id !== 'dagger'; });
    var without = resolve(bare, probe);
    if (withDagger.ok || !without.ok) {
      fail('拿掉冻食物的短刃应当转败为胜，带刃 ' + withDagger.ok + ' / ' + withDagger.supply + '，不带 ' + without.ok + ' / ' + without.supply);
    } else lines.push('拿掉短刃，食物不再被冻，补给够用');

    var coalRun = createRun('trek');
    var coal = coalRun.pack.filter(function (it) { return it.id === 'coal'; })[0];
    coal.c = 4;
    coal.r = 1;
    var deep = segmentChoices('trek', 1)[0];
    var coalBad = resolve(coalRun, deep);
    var coalGone = clone(coalRun);
    coalGone.pack = coalGone.pack.filter(function (it) { return it.id !== 'coal'; });
    var coalLess = resolve(coalGone, deep);
    if (!(coalLess.durability > coalBad.durability)) {
      fail('拿掉没贴炉的煤，耐久没有更高：' + coalLess.durability + ' vs ' + coalBad.durability);
    } else lines.push('没贴炉的煤拿掉后耐久更高');

    var overlap = createRun('tutorial');
    var bread = overlap.pack.filter(function (it) { return it.id === 'bread'; })[0];
    var blocked = tryPlace(overlap, bread.uid, 1, 0);
    if (blocked.ok) fail('重叠放置被接受了');
    else lines.push('重叠不能放下：' + blocked.reason);
    overlap.phase = 'resolve';
    var locked = tryRotate(overlap, bread.uid);
    if (locked.ok) fail('出发后仍能旋转');
    else lines.push('出发后背包锁住');

    var forced = createRun('tutorial');
    forced.pack[0].c = forced.pack[1].c;
    forced.pack[0].r = forced.pack[1].r;
    if (validate(forced).ok) fail('重叠背包仍能通过确认');
    else lines.push('重叠不能确认');

    var orderLog = resolve(createRun('trek'), segmentChoices('trek', 0)[0]).log;
    if (!phasesInOrder(orderLog)) fail('结算顺序应保持取暖、供能、触发');
    else lines.push('结算顺序：取暖，供能，触发');
    var seen = {};
    orderLog.forEach(function (row) { seen[row.phase] = true; });
    if (!seen.heat || !seen.energy || !seen.trigger) fail('三段邻接没有都出现');

    var spent = playthrough('tutorial', ['a', 'a', 'a', 'a']);
    var cupLeft = spent.ok && spent.run.pack.some(function (it) { return it.id === 'cup'; });
    if (cupLeft) fail('用尽的搪瓷杯还在包里');
    else lines.push('用尽的物件离包，没有自动补满');

    var names = Object.keys(ITEMS);
    if (names.length !== 20) fail('物品应有 20 件');
    else lines.push('物品 20 件');
    if (TUTOR.length !== 4 || TREK.length !== 4) fail('路段数量不对');
    var trekCards = 0;
    TREK.forEach(function (pair) { trekCards += pair.length; });
    if (trekCards !== 8) fail('远征遭遇应有 8 个');
    else lines.push('远征 8 个遭遇，两种格盘');

    var empty = createRun('tutorial');
    empty.pack = [];
    empty.supply = 8;
    var starved = resolve(empty, segmentChoices('tutorial', 3)[0]);
    if (starved.ok) fail('没有口粮仍走完了归途');
    else lines.push('补给不足会在「' + starved.fail.name + '」停下');

    return { ok: failures.length === 0, failures: failures, lines: lines };
  }

  var api = {
    ITEMS: ITEMS,
    MASKS: MASKS,
    TUTOR: TUTOR,
    TREK: TREK,
    DIRS: DIRS,
    clone: clone,
    footprint: footprint,
    bounds: bounds,
    cellsOf: cellsOf,
    createRun: createRun,
    findItem: findItem,
    placement: placement,
    validate: validate,
    canEdit: canEdit,
    tryPlace: tryPlace,
    tryStash: tryStash,
    tryRotate: tryRotate,
    segmentChoices: segmentChoices,
    resolve: resolve,
    playthrough: playthrough,
    runSelfCheck: runSelfCheck
  };

  global.PACK_SIM = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);

if (typeof require !== 'undefined' && require.main === module) {
  var report = module.exports.runSelfCheck();
  report.lines.forEach(function (line) { console.log('OK ' + line); });
  report.failures.forEach(function (line) { console.log('FAIL ' + line); });
  if (!report.ok) process.exit(1);
}
