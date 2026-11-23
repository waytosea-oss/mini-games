/* 云舰棋局规则。纯函数，开战前后共用同一套位移，风在开战时不再重抽。 */
(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.CLOUD_SIM = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var DIRS = [
    { id: 0, q: 1, r: 0, name: '东' },
    { id: 1, q: 0, r: 1, name: '东南' },
    { id: 2, q: -1, r: 1, name: '西南' },
    { id: 3, q: -1, r: 0, name: '西' },
    { id: 4, q: 0, r: -1, name: '西北' },
    { id: 5, q: 1, r: -1, name: '东北' }
  ];

  var COST = { light: 3, heavy: 4, flag: 0 };
  var SPEC_COST = 2;
  var MAX_SHIPS = 6;
  var RADIUS = 2;

  function cells() {
    var out = [];
    for (var q = -RADIUS; q <= RADIUS; q++) {
      for (var r = -RADIUS; r <= RADIUS; r++) {
        if (Math.max(Math.abs(q), Math.abs(r), Math.abs(-q - r)) <= RADIUS) out.push({ q: q, r: r });
      }
    }
    return out;
  }

  var BOARD = cells();
  var BOARD_SET = {};
  BOARD.forEach(function (c) { BOARD_SET[c.q + ',' + c.r] = true; });

  function key(q, r) { return q + ',' + r; }
  function onBoard(q, r) { return !!BOARD_SET[key(q, r)]; }

  function distance(a, b) {
    var dq = a.q - b.q;
    var dr = a.r - b.r;
    return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
  }

  function cubeRound(fq, fr) {
    var x = fq;
    var z = fr;
    var y = -x - z;
    var rx = Math.round(x);
    var ry = Math.round(y);
    var rz = Math.round(z);
    var xd = Math.abs(rx - x);
    var yd = Math.abs(ry - y);
    var zd = Math.abs(rz - z);
    if (xd > yd && xd > zd) rx = -ry - rz;
    else if (yd > zd) ry = -rx - rz;
    else rz = -rx - ry;
    return { q: rx, r: rz };
  }

  function line(a, b) {
    var dist = distance(a, b);
    var out = [];
    var prev = '';
    for (var i = 0; i <= dist; i++) {
      var t = dist === 0 ? 0 : i / dist;
      var c = cubeRound(a.q + (b.q - a.q) * t, a.r + (b.r - a.r) * t);
      var k = key(c.q, c.r);
      if (k !== prev) {
        out.push(c);
        prev = k;
      }
    }
    return out;
  }

  function dirById(id) { return DIRS[((id % 6) + 6) % 6]; }

  function proj(q, r, dir) {
    var dq = dir.q;
    var dr = dir.r;
    var ds = -dq - dr;
    var y = -q - r;
    return q * dq + y * ds + r * dr;
  }

  function windRanks(dir) {
    var map = {};
    var queue = [];
    BOARD.forEach(function (c) {
      if (!onBoard(c.q - dir.q, c.r - dir.r)) {
        map[key(c.q, c.r)] = 0;
        queue.push(c);
      }
    });
    var qi = 0;
    while (qi < queue.length) {
      var c = queue[qi++];
      var dq = c.q + dir.q;
      var dr = c.r + dir.r;
      var k = key(dq, dr);
      if (!onBoard(dq, dr) || map[k] != null) continue;
      map[k] = map[key(c.q, c.r)] + 1;
      queue.push({ q: dq, r: dr });
    }
    return map;
  }

  function cloudSet(level) {
    var s = {};
    (level.clouds || []).forEach(function (c) { s[key(c[0], c[1])] = true; });
    return s;
  }

  function coverSet(level) {
    var s = {};
    (level.covers || []).forEach(function (c) { s[key(c[0], c[1])] = true; });
    return s;
  }

  function colWord(q) {
    if (q === 0) return '中';
    if (q === -1) return '西内';
    if (q === -2) return '西外';
    if (q === 1) return '东内';
    return '东外';
  }

  function placeName(q, r) {
    var row = r >= 2 ? '后排' : r === 1 ? '前排' : r === 0 ? '中线' : r === -1 ? '远前' : '远后';
    return row + colWord(q);
  }

  function clsName(cls) {
    if (cls === 'heavy') return '重舰';
    if (cls === 'flag') return '旗舰';
    return '轻舰';
  }

  function rangeOf(u) {
    var base = u.cls === 'heavy' ? 1 : 2;
    return u.spec === 'scout' ? base + 1 : base;
  }

  function baseDamage(u) {
    if (u.side === 'enemy') {
      if (u.cls === 'heavy') return 2;
      return 1;
    }
    return u.cls === 'heavy' ? 3 : 2;
  }

  function cloneUnit(u) {
    return {
      id: u.id,
      side: u.side,
      cls: u.cls,
      q: u.q,
      r: u.r,
      spec: u.spec || null,
      hurt: !!u.hurt,
      hp: u.hp || 0
    };
  }

  function resolveWind(units, wind, level) {
    var dir = dirById(wind.dir);
    var ranks = windRanks(dir);
    var clouds = cloudSet(level);
    var plans = units.map(function (u) {
      var stay = {
        id: u.id, side: u.side, cls: u.cls, spec: u.spec || null, hurt: !!u.hurt,
        q: u.q, r: u.r, fromQ: u.q, fromR: u.r, moved: false, anchored: false, blocked: false
      };
      if (u.cls !== 'light') return stay;
      var rank = ranks[key(u.q, u.r)];
      if (rank == null || rank >= wind.reach) return stay;
      var uq = u.q - dir.q;
      var ur = u.r - dir.r;
      var anchor = null;
      for (var i = 0; i < units.length; i++) {
        var o = units[i];
        if (o.q === uq && o.r === ur && (o.cls === 'heavy' || o.cls === 'flag')) anchor = o;
      }
      if (anchor) {
        stay.anchored = true;
        stay.anchorId = anchor.id;
        return stay;
      }
      var dq = u.q + dir.q;
      var dr = u.r + dir.r;
      if (!onBoard(dq, dr) || clouds[key(dq, dr)]) return stay;
      stay.q = dq;
      stay.r = dr;
      stay.moved = true;
      return stay;
    });

    var stayed = {};
    plans.forEach(function (p) {
      if (!p.moved) stayed[key(p.q, p.r)] = (stayed[key(p.q, p.r)] || 0) + 1;
    });
    var incoming = {};
    plans.forEach(function (p) {
      if (!p.moved) return;
      var k = key(p.q, p.r);
      if (!incoming[k]) incoming[k] = [];
      incoming[k].push(p);
    });
    plans.forEach(function (p) {
      if (!p.moved) return;
      var k = key(p.q, p.r);
      if (stayed[k] || incoming[k].length > 1) {
        p.q = p.fromQ;
        p.r = p.fromR;
        p.moved = false;
        p.blocked = true;
      }
    });
    return plans;
  }

  function occupiedMap(units) {
    var m = {};
    units.forEach(function (u) { m[key(u.q, u.r)] = u; });
    return m;
  }

  function hasLos(a, b, units, level) {
    var path = line(a, b);
    var clouds = cloudSet(level);
    var occ = occupiedMap(units);
    for (var i = 1; i < path.length - 1; i++) {
      var k = key(path[i].q, path[i].r);
      if (clouds[k]) return false;
      if (occ[k]) return false;
    }
    return true;
  }

  function isCovered(target, units, level, wind) {
    var covers = coverSet(level);
    if (covers[key(target.q, target.r)]) return true;
    var dir = dirById(wind.dir);
    var uq = target.q - dir.q;
    var ur = target.r - dir.r;
    for (var i = 0; i < units.length; i++) {
      var u = units[i];
      if (u.side !== target.side) continue;
      if (u.spec === 'escort' && !(u.q === target.q && u.r === target.r) && distance(u, target) === 1) return true;
      if (u.spec === 'escort' && u.id === target.id) return true;
      if ((u.cls === 'heavy' || u.cls === 'flag') && u.q === uq && u.r === ur) return true;
    }
    return false;
  }

  function pickTarget(attacker, units, level, wind) {
    var range = rangeOf(attacker);
    var cands = [];
    units.forEach(function (u) {
      if (u.side === attacker.side) return;
      var dist = distance(attacker, u);
      if (dist < 1 || dist > range) return;
      if (!hasLos(attacker, u, units, level)) return;
      cands.push(u);
    });
    if (!cands.length) return null;
    if (attacker.spec === 'scout') {
      var flag = null;
      cands.forEach(function (u) { if (u.cls === 'flag') flag = u; });
      if (flag) return flag;
    }
    cands.sort(function (a, b) {
      var ca = isCovered(a, units, level, wind) ? 1 : 0;
      var cb = isCovered(b, units, level, wind) ? 1 : 0;
      if (ca !== cb) return ca - cb;
      var da = distance(attacker, a);
      var db = distance(attacker, b);
      if (da !== db) return da - db;
      var fa = a.cls === 'flag' ? 0 : 1;
      var fb = b.cls === 'flag' ? 0 : 1;
      if (fa !== fb) return fa - fb;
      if (a.q !== b.q) return a.q - b.q;
      return a.r - b.r;
    });
    return cands[0];
  }

  function planBattle(units, wind, level, playerHp) {
    var plans = resolveWind(units.map(cloneUnit), wind, level);
    var moved = plans.map(cloneUnit);
    var enemyMax = 0;
    units.forEach(function (u) {
      if (u.side === 'enemy' && u.cls === 'flag') enemyMax = u.hp;
    });
    var ehp = enemyMax;
    var php = playerHp;
    var volleys = [];
    var silenced = {};
    for (var v = 0; v < 2; v++) {
      var order = moved.slice().sort(function (a, b) {
        var rd = rangeOf(b) - rangeOf(a);
        if (rd) return rd;
        if (a.q !== b.q) return a.q - b.q;
        if (a.r !== b.r) return a.r - b.r;
        return a.id < b.id ? -1 : 1;
      });
      var shots = [];
      order.forEach(function (u) {
        if (silenced[u.id]) return;
        var tgt = pickTarget(u, moved, level, wind);
        if (!tgt) return;
        var covered = isCovered(tgt, moved, level, wind);
        var dmg = baseDamage(u) - (covered ? 1 : 0);
        if (dmg < 0) dmg = 0;
        shots.push({
          from: u.id,
          to: tgt.id,
          side: u.side,
          targetSide: tgt.side,
          dmg: dmg,
          covered: covered,
          q: tgt.q,
          r: tgt.r,
          fq: u.q,
          fr: u.r,
          tcls: tgt.cls,
          acls: u.cls
        });
      });
      var pD = 0;
      var eD = 0;
      silenced = {};
      shots.forEach(function (s) {
        if (s.targetSide === 'own') pD += s.dmg;
        else if (s.tcls === 'flag') eD += s.dmg;
        else silenced[s.to] = true;
      });
      php -= pD;
      ehp -= eD;
      var hitIds = {};
      shots.forEach(function (s) { if (s.targetSide === 'own') hitIds[s.to] = true; });
      moved.forEach(function (u) { if (hitIds[u.id]) u.hurt = true; });
      volleys.push({ shots: shots, pD: pD, eD: eD, php: php, ehp: ehp });
      if (php <= 0 || ehp <= 0) break;
    }
    return {
      plans: plans,
      units: moved,
      volleys: volleys,
      php: php,
      ehp: ehp,
      lost: php <= 0,
      broken: ehp <= 0 && php > 0
    };
  }

  function couldShootFlag(unit, units, level) {
    var flag = null;
    units.forEach(function (u) { if (u.side === 'enemy' && u.cls === 'flag') flag = u; });
    if (!flag || unit.side !== 'own') return false;
    if (distance(unit, flag) > rangeOf(unit)) return false;
    return hasLos(unit, flag, units, level);
  }

  function explain(before, battle, level, wind) {
    var notes = [];
    var stars = { wind: false, anchor: false, cover: false };
    var dir = dirById(wind.dir);
    var beforeBy = {};
    before.forEach(function (u) { beforeBy[u.id] = u; });
    var afterBy = {};
    battle.units.forEach(function (u) { afterBy[u.id] = u; });

    battle.plans.forEach(function (p) {
      if (p.side !== 'own' || p.cls !== 'light') return;
      var after = afterBy[p.id];
      var prev = beforeBy[p.id];
      if (!after || !prev) return;
      if (p.moved) {
        var beforeShot = couldShootFlag(prev, before, level);
        var afterShot = couldShootFlag(after, battle.units, level);
        var flag = null;
        battle.units.forEach(function (u) { if (u.side === 'enemy' && u.cls === 'flag') flag = u; });
        var closer = flag && distance(after, flag) < distance(prev, flag);
        if (afterShot && !beforeShot) {
          stars.wind = true;
          notes.push(dir.name + '风把' + placeName(p.fromQ, p.fromR) + '的轻舰推到' + placeName(p.q, p.r) + '，这一格打得着敌方旗舰，原格够不着。');
        } else if (afterShot && closer) {
          stars.wind = true;
          notes.push(dir.name + '风把' + placeName(p.fromQ, p.fromR) + '的轻舰推近到' + placeName(p.q, p.r) + '，离敌方旗舰更近。');
        } else {
          notes.push(dir.name + '风把' + placeName(p.fromQ, p.fromR) + '的轻舰推到' + placeName(p.q, p.r) + '。');
        }
      }
      if (p.anchored) {
        var ghost = cloneUnit(prev);
        ghost.q = prev.q + dir.q;
        ghost.r = prev.r + dir.r;
        var ghostUnits = before.map(function (u) { return u.id === prev.id ? ghost : cloneUnit(u); });
        var stayedShot = couldShootFlag(prev, before, level);
        var blownOff = !onBoard(ghost.q, ghost.r) || cloudSet(level)[key(ghost.q, ghost.r)];
        var blownShot = !blownOff && couldShootFlag(ghost, ghostUnits, level);
        if (stayedShot && !blownShot) {
          stars.anchor = true;
          notes.push('重舰守在' + placeName(prev.q, prev.r) + '的上风，轻舰留在原格，仍然打得着敌方旗舰。');
        } else if (blownOff) {
          stars.anchor = true;
          notes.push('重舰守在上风，' + placeName(prev.q, prev.r) + '的轻舰没有被' + dir.name + '风推出棋盘。');
        } else {
          stars.anchor = true;
          notes.push('重舰守在' + placeName(prev.q - dir.q, prev.r - dir.r) + '，' + placeName(prev.q, prev.r) + '的轻舰没有被' + dir.name + '风推走。');
        }
      }
    });

    var reduced = 0;
    battle.volleys.forEach(function (volley) {
      volley.shots.forEach(function (s) {
        if (s.targetSide === 'own' && s.covered) reduced += 1;
      });
    });
    if (reduced > 0) {
      stars.cover = true;
      notes.push('护航或背风让敌舰有 ' + reduced + ' 发打在有掩护的舰上，每发少 1 点。');
    }

    var starCount = (stars.wind ? 1 : 0) + (stars.anchor ? 1 : 0) + (stars.cover ? 1 : 0);
    var headline = '';
    var prefer = ['打得着敌方旗舰', '更近', '上风', '掩护'];
    for (var pi = 0; pi < prefer.length && !headline; pi++) {
      for (var i = 0; i < notes.length; i++) {
        if (notes[i].indexOf(prefer[pi]) >= 0) { headline = notes[i]; break; }
      }
    }
    if (!headline && notes.length) headline = notes[0];
    if (!headline) headline = '这一回合的站位没有把风或锚点用在旗舰身上。';
    return { starCount: starCount, stars: stars, notes: notes, headline: headline };
  }

  var TEACH = [
    {
      grant: 4,
      wind: { dir: 0, reach: 1 },
      clouds: [],
      covers: [],
      hint: '短距东风只推最西边一列。买一艘轻舰，拖到中线西外。开战前，预测格会标出它被推到的位置。',
      enemies: [
        { cls: 'flag', q: 0, r: -1, hp: 2 }
      ]
    },
    {
      grant: 5,
      wind: { dir: 0, reach: 3 },
      clouds: [],
      covers: [],
      hint: '这阵东风加长了。把重舰放在轻舰的西侧当锚，轻舰会留在原格。没有锚的话，它会被继续往东推。',
      enemies: [
        { cls: 'light', q: 1, r: -1 },
        { cls: 'flag', q: 0, r: -1, hp: 8 }
      ]
    },
    {
      grant: 5,
      wind: { dir: 4, reach: 2 },
      clouds: [],
      covers: [[0, 1]],
      hint: '西北风会把后排的轻舰往前送。把轻舰挪到前排东内，再点它加上望远镜。只有打中敌方旗舰才会击破它。',
      enemies: [
        { cls: 'heavy', q: -1, r: -1 },
        { cls: 'flag', q: 2, r: -2, hp: 2 }
      ]
    },
    {
      grant: 6,
      wind: { dir: 5, reach: 2 },
      clouds: [],
      covers: [[0, 1]],
      hint: '东北风、中距。把轻舰放到前排中，让风把它推进能看见练习旗舰的格子。打穿这艘旗舰，教学就结束。',
      enemies: [
        { cls: 'heavy', q: -1, r: -1 },
        { cls: 'flag', q: 2, r: -2, hp: 2 }
      ]
    }
  ];

  var CHAPTER = [
    {
      grant: 5,
      wind: { dir: 0, reach: 1 },
      clouds: [[-2, 0], [2, 0]],
      covers: [[-1, 1], [0, 1]],
      hint: '远侧已经列好预设敌阵。短距东风只动最西边。先看落点，再花补给。',
      enemies: [
        { cls: 'light', q: 1, r: -1 },
        { cls: 'flag', q: 0, r: -1, hp: 4 }
      ]
    },
    {
      grant: 5,
      wind: { dir: 0, reach: 3 },
      clouds: [[-2, 0], [2, 0]],
      covers: [[-1, 1], [0, 1]],
      hint: '长距东风会把轻舰往东推。把重舰放在轻舰西侧，锚住它。',
      enemies: [
        { cls: 'light', q: 2, r: -1 },
        { cls: 'light', q: -1, r: -1 },
        { cls: 'flag', q: 0, r: -1, hp: 4 }
      ]
    },
    {
      grant: 6,
      wind: { dir: 4, reach: 2 },
      clouds: [[-2, 0], [2, 0]],
      covers: [[-1, 1], [0, 1]],
      hint: '西北风把近侧轻舰往远侧送。敌方重舰挡在中路，东侧才看得到旗舰。',
      enemies: [
        { cls: 'heavy', q: 0, r: -1 },
        { cls: 'light', q: -1, r: -1 },
        { cls: 'flag', q: 2, r: -2, hp: 4 }
      ]
    },
    {
      grant: 6,
      wind: { dir: 5, reach: 2 },
      clouds: [[-2, 0], [2, 0]],
      covers: [[-1, 1], [0, 1]],
      hint: '东北风、中距。护航盾会让挨着它的己方舰少挨打。侦察仍会先找旗舰。',
      enemies: [
        { cls: 'heavy', q: -1, r: -1 },
        { cls: 'light', q: 0, r: -1 },
        { cls: 'flag', q: 2, r: -2, hp: 4 }
      ]
    },
    {
      grant: 7,
      wind: { dir: 3, reach: 2 },
      clouds: [[-2, 0], [2, 0]],
      covers: [[-1, 1], [0, 1]],
      hint: '西风从东边推回来。想留在射程里的轻舰，要有重舰守在它东侧。',
      enemies: [
        { cls: 'heavy', q: 0, r: -1 },
        { cls: 'light', q: 1, r: -1 },
        { cls: 'flag', q: -1, r: -1, hp: 4 }
      ]
    },
    {
      grant: 7,
      wind: { dir: 4, reach: 2 },
      clouds: [[-2, 0], [2, 0]],
      covers: [[-1, 1], [0, 1]],
      hint: '西北风又起。旗舰在远侧东外，中路有重舰挡视线。',
      enemies: [
        { cls: 'heavy', q: 0, r: -1 },
        { cls: 'light', q: -1, r: -1 },
        { cls: 'flag', q: 2, r: -2, hp: 4 }
      ]
    },
    {
      grant: 8,
      wind: { dir: 1, reach: 2 },
      clouds: [[-2, 0], [2, 0]],
      covers: [[-1, 1], [0, 1]],
      hint: '东南风把太靠北的轻舰推回近侧。站在会被推离旗舰的格子上，这一回合就打不穿。',
      enemies: [
        { cls: 'light', q: -1, r: -1 },
        { cls: 'light', q: 1, r: -1 },
        { cls: 'heavy', q: 2, r: -1 },
        { cls: 'flag', q: 0, r: -2, hp: 4 }
      ]
    },
    {
      grant: 8,
      wind: { dir: 5, reach: 2 },
      clouds: [[-2, 0], [2, 0]],
      covers: [[-1, 1], [0, 1]],
      hint: '最后一阵东北风。敌方旗舰在远侧东外。把轻舰放进预测落点能看见它的格子。',
      enemies: [
        { cls: 'heavy', q: 0, r: -1 },
        { cls: 'light', q: -1, r: -1 },
        { cls: 'flag', q: 2, r: -2, hp: 4 }
      ]
    }
  ];

  function levelsOf(mode) { return mode === 'teach' ? TEACH : CHAPTER; }

  function windCost(base, now) {
    var dd = Math.min((now.dir - base.dir + 6) % 6, (base.dir - now.dir + 6) % 6);
    return dd * 1 + Math.abs(now.reach - base.reach) * 2;
  }

  function spendable(state) {
    return state.supply - windCost(state.baseWind, state.wind);
  }

  function freshEnemies(level, occupied) {
    var used = {};
    Object.keys(occupied).forEach(function (k) { used[k] = true; });
    var list = [];
    var n = 0;
    level.enemies.forEach(function (e) {
      var q = e.q;
      var r = e.r;
      if (used[key(q, r)] || !onBoard(q, r)) {
        var found = null;
        for (var rad = 0; rad <= 4 && !found; rad++) {
          BOARD.forEach(function (c) {
            if (found) return;
            if (c.r >= 0) return;
            if (distance(c, { q: e.q, r: e.r }) !== rad) return;
            if (used[key(c.q, c.r)]) return;
            if (cloudSet(level)[key(c.q, c.r)]) return;
            found = c;
          });
        }
        if (!found) return;
        q = found.q;
        r = found.r;
      }
      used[key(q, r)] = true;
      n += 1;
      list.push({
        id: -n,
        side: 'enemy',
        cls: e.cls,
        q: q,
        r: r,
        spec: null,
        hurt: false,
        hp: e.cls === 'flag' ? e.hp : 0
      });
    });
    return list;
  }

  function bumpShips(ships, level) {
    var clouds = cloudSet(level);
    var used = {};
    ships.forEach(function (s) {
      if (s.cls === 'flag') return;
      if (!clouds[key(s.q, s.r)] && onBoard(s.q, s.r)) used[key(s.q, s.r)] = true;
    });
    ships.forEach(function (s) {
      var bad = !onBoard(s.q, s.r) || clouds[key(s.q, s.r)];
      if (!bad) {
        used[key(s.q, s.r)] = true;
        return;
      }
      var found = null;
      for (var rad = 0; rad <= 5 && !found; rad++) {
        BOARD.forEach(function (c) {
          if (found) return;
          if (c.r < 0) return;
          if (clouds[key(c.q, c.r)]) return;
          if (used[key(c.q, c.r)]) return;
          if (distance(c, s) !== rad) return;
          found = c;
        });
      }
      if (found) {
        s.q = found.q;
        s.r = found.r;
        used[key(s.q, s.r)] = true;
      }
    });
  }

  function createRun(mode) {
    var maxHp = mode === 'teach' ? 18 : 24;
    return {
      mode: mode,
      turn: 0,
      phase: 'prep',
      supply: 0,
      hp: maxHp,
      maxHp: maxHp,
      ships: [{ id: 1, side: 'own', cls: 'flag', q: 0, r: 2, spec: null, hurt: false }],
      enemies: [],
      wind: { dir: 0, reach: 1 },
      baseWind: { dir: 0, reach: 1 },
      nextId: 2,
      stars: [],
      headlines: [],
      report: '',
      outcome: null,
      snapshot: null
    };
  }

  function beginTurn(state) {
    var levels = levelsOf(state.mode);
    if (state.turn >= levels.length) return state;
    var level = levels[state.turn];
    state.supply += level.grant;
    state.wind = { dir: level.wind.dir, reach: level.wind.reach };
    state.baseWind = { dir: level.wind.dir, reach: level.wind.reach };
    bumpShips(state.ships, level);
    var occ = {};
    state.ships.forEach(function (s) { occ[key(s.q, s.r)] = true; });
    state.enemies = freshEnemies(level, occ);
    state.phase = 'prep';
    state.report = '';
    state.snapshot = JSON.stringify({
      supply: state.supply,
      hp: state.hp,
      ships: state.ships,
      nextId: state.nextId
    });
    return state;
  }

  function levelNow(state) {
    return levelsOf(state.mode)[state.turn];
  }

  function canPlace(state, q, r, ignoreId) {
    var level = levelNow(state);
    if (!onBoard(q, r)) return false;
    if (r < 0) return false;
    if (cloudSet(level)[key(q, r)]) return false;
    for (var i = 0; i < state.ships.length; i++) {
      var s = state.ships[i];
      if (s.id === ignoreId) continue;
      if (s.q === q && s.r === r) return false;
    }
    return true;
  }

  function buy(state, cls, q, r) {
    if (state.phase !== 'prep') return false;
    if (cls !== 'light' && cls !== 'heavy') return false;
    if (state.ships.length >= MAX_SHIPS) return false;
    if (!canPlace(state, q, r, null)) return false;
    if (spendable(state) < COST[cls]) return false;
    state.supply -= COST[cls];
    state.ships.push({
      id: state.nextId++,
      side: 'own',
      cls: cls,
      q: q,
      r: r,
      spec: null,
      hurt: false
    });
    return true;
  }

  function moveShip(state, id, q, r) {
    if (state.phase !== 'prep') return false;
    var ship = null;
    state.ships.forEach(function (s) { if (s.id === id) ship = s; });
    if (!ship) return false;
    if (ship.q === q && ship.r === r) return true;
    if (!canPlace(state, q, r, id)) return false;
    ship.q = q;
    ship.r = r;
    return true;
  }

  function sell(state, id) {
    if (state.phase !== 'prep') return false;
    var idx = -1;
    state.ships.forEach(function (s, i) { if (s.id === id) idx = i; });
    if (idx < 0) return false;
    var ship = state.ships[idx];
    if (ship.cls === 'flag') return false;
    state.supply += COST[ship.cls] + (ship.spec ? SPEC_COST : 0);
    state.ships.splice(idx, 1);
    return true;
  }

  function spec(state, id, kind) {
    if (state.phase !== 'prep') return false;
    if (kind !== 'escort' && kind !== 'scout') return false;
    var ship = null;
    state.ships.forEach(function (s) { if (s.id === id) ship = s; });
    if (!ship || ship.spec) return false;
    if (spendable(state) < SPEC_COST) return false;
    state.supply -= SPEC_COST;
    ship.spec = kind;
    return true;
  }

  function setWind(state, dir, reach) {
    if (state.phase !== 'prep') return false;
    dir = ((dir % 6) + 6) % 6;
    reach = Math.max(1, Math.min(3, reach | 0));
    var cost = windCost(state.baseWind, { dir: dir, reach: reach });
    if (cost > state.supply) return false;
    state.wind = { dir: dir, reach: reach };
    return true;
  }

  function allUnits(state) {
    return state.ships.map(cloneUnit).concat(state.enemies.map(cloneUnit));
  }

  function preview(state) {
    var level = levelNow(state);
    var units = allUnits(state);
    var plans = resolveWind(units, state.wind, level);
    return { plans: plans, ranks: windRanks(dirById(state.wind.dir)), level: level };
  }

  function carrySupply(state) {
    return state.supply - windCost(state.baseWind, state.wind);
  }

  function fight(state) {
    if (state.phase !== 'prep') return null;
    var level = levelNow(state);
    var reserved = windCost(state.baseWind, state.wind);
    state.supply -= reserved;
    var before = allUnits(state);
    var battle = planBattle(before, state.wind, level, state.hp);
    var info = explain(before, battle, level, state.wind);
    state.hp = battle.php;
    var own = [];
    battle.units.forEach(function (u) {
      if (u.side === 'own') own.push(cloneUnit(u));
    });
    state.ships = own;
    state.enemies = [];
    state.stars.push(info.starCount);
    state.headlines.push(info.headline);
    var levels = levelsOf(state.mode);
    var last = state.turn >= levels.length - 1;
    var lines = info.notes.slice();
    if (battle.lost) {
      lines.push('己方旗舰耐久归零，这一局到这里结束。');
      state.outcome = 'lose';
      state.phase = 'end';
    } else if (battle.broken && last) {
      lines.push('敌方旗舰被击破，己方耐久还剩 ' + state.hp + '。');
      state.outcome = 'win';
      state.phase = 'end';
    } else if (last && !battle.broken) {
      lines.push('八个回合走完了，敌方旗舰还在。要击破它，同时把己方耐久留在零以上。');
      state.outcome = 'failflag';
      state.phase = 'end';
    } else if (battle.broken) {
      lines.push('敌方旗舰这一回合被击破，后面的齐射没有打出来。耐久还剩 ' + state.hp + '。');
      state.phase = 'result';
    } else {
      lines.push('敌方旗舰还在，伤害已经记在己方耐久上，还剩 ' + state.hp + '。');
      state.phase = 'result';
    }
    lines.push('补给结余 ' + state.supply + '，结转到下回合，不生息。');
    state.report = lines.join('');
    state.battle = {
      plans: battle.plans,
      volleys: battle.volleys,
      broken: battle.broken,
      lost: battle.lost,
      starCount: info.starCount,
      headline: info.headline
    };
    return state.battle;
  }

  function nextTurn(state) {
    if (state.phase !== 'result') return false;
    state.turn += 1;
    state.battle = null;
    beginTurn(state);
    return true;
  }

  function retryTurn(state) {
    if (!state.snapshot) return false;
    var snap = JSON.parse(state.snapshot);
    state.supply = snap.supply;
    state.hp = snap.hp;
    state.ships = snap.ships;
    state.nextId = snap.nextId;
    state.outcome = null;
    state.phase = 'prep';
    state.battle = null;
    state.report = '';
    if (state.stars.length > state.turn) {
      state.stars.pop();
      state.headlines.pop();
    }
    var level = levelNow(state);
    state.wind = { dir: level.wind.dir, reach: level.wind.reach };
    state.baseWind = { dir: level.wind.dir, reach: level.wind.reach };
    var occ = {};
    state.ships.forEach(function (s) { occ[key(s.q, s.r)] = true; });
    state.enemies = freshEnemies(level, occ);
    return true;
  }

  function enemySummary(enemies) {
    return enemies.map(function (e) {
      return clsName(e.cls) + '在' + placeName(e.q, e.r);
    }).join('，');
  }

  return {
    DIRS: DIRS,
    COST: COST,
    SPEC_COST: SPEC_COST,
    MAX_SHIPS: MAX_SHIPS,
    BOARD: BOARD,
    TEACH: TEACH,
    CHAPTER: CHAPTER,
    key: key,
    onBoard: onBoard,
    distance: distance,
    line: line,
    dirById: dirById,
    windRanks: windRanks,
    placeName: placeName,
    clsName: clsName,
    rangeOf: rangeOf,
    resolveWind: resolveWind,
    hasLos: hasLos,
    planBattle: planBattle,
    explain: explain,
    createRun: createRun,
    beginTurn: beginTurn,
    levelNow: levelNow,
    buy: buy,
    moveShip: moveShip,
    sell: sell,
    spec: spec,
    setWind: setWind,
    preview: preview,
    fight: fight,
    nextTurn: nextTurn,
    retryTurn: retryTurn,
    spendable: spendable,
    carrySupply: carrySupply,
    windCost: windCost,
    enemySummary: enemySummary,
    allUnits: allUnits,
    cloudSet: cloudSet,
    coverSet: coverSet
  };
});
