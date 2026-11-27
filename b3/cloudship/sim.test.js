/* 规则自检：教学可过，八回合可胜可败，位移预览与实战一致，补给结转且不生息。 */
var assert = require('assert');
var S = require('./sim.js');

function play(mode, actions) {
  var st = S.createRun(mode);
  S.beginTurn(st);
  var fights = [];
  actions.forEach(function (act, t) {
    (act.buys || []).forEach(function (b) {
      assert.strictEqual(S.buy(st, b.cls, b.q, b.r), true, 'buy ' + t);
    });
    (act.moves || []).forEach(function (m) {
      assert.strictEqual(S.moveShip(st, m.id, m.q, m.r), true, 'move ' + t);
    });
    (act.specs || []).forEach(function (s) {
      assert.strictEqual(S.spec(st, s.id, s.kind), true, 'spec ' + t);
    });
    if (act.wind) assert.strictEqual(S.setWind(st, act.wind.dir, act.wind.reach), true);
    var prev = S.preview(st).plans.map(function (p) {
      return p.id + ':' + p.q + ',' + p.r + ':' + (p.moved ? 1 : 0) + ':' + (p.anchored ? 1 : 0);
    }).join('|');
    var battle = S.fight(st);
    var land = battle.plans.map(function (p) {
      return p.id + ':' + p.q + ',' + p.r + ':' + (p.moved ? 1 : 0) + ':' + (p.anchored ? 1 : 0);
    }).join('|');
    assert.strictEqual(prev, land, 'displacement ' + mode + ' turn ' + t);
    fights.push({ supply: st.supply, hp: st.hp, outcome: st.outcome, broken: battle.broken, lost: battle.lost });
    if (st.phase === 'result') S.nextTurn(st);
  });
  return { state: st, fights: fights };
}

var teach = play('teach', [
  { buys: [{ cls: 'light', q: -2, r: 0 }] },
  { buys: [{ cls: 'heavy', q: -2, r: 0 }] },
  { moves: [{ id: 2, q: 1, r: 1 }], specs: [{ id: 2, kind: 'scout' }] },
  { moves: [{ id: 2, q: 0, r: 1 }] }
]);
assert.strictEqual(teach.state.outcome, 'win');
assert.ok(teach.state.hp > 0);
assert.strictEqual(teach.fights.length, 4);

var win = play('chapter', [
  { buys: [{ cls: 'light', q: -2, r: 1 }] },
  { buys: [{ cls: 'heavy', q: -2, r: 1 }] },
  { moves: [{ id: 2, q: -1, r: 2 }], specs: [{ id: 2, kind: 'scout' }] },
  { moves: [{ id: 2, q: -2, r: 2 }] },
  { moves: [{ id: 2, q: -1, r: 0 }] },
  { moves: [{ id: 2, q: 1, r: 1 }] },
  { moves: [{ id: 2, q: 0, r: 1 }] },
  { moves: [{ id: 1, q: -1, r: 2 }, { id: 2, q: 0, r: 2 }] }
]);
assert.strictEqual(win.state.outcome, 'win');
assert.ok(win.state.hp > 0);
assert.strictEqual(win.fights[7].broken, true);
assert.ok(win.state.headlines[7].indexOf('敌方旗舰') >= 0);

var dead = play('chapter', [
  { buys: [{ cls: 'light', q: 1, r: 0 }], moves: [{ id: 1, q: 0, r: 0 }] },
  { moves: [{ id: 2, q: 1, r: 0 }, { id: 1, q: 0, r: 0 }] },
  { moves: [{ id: 2, q: 1, r: 0 }, { id: 1, q: 0, r: 0 }] },
  { moves: [{ id: 2, q: 1, r: 0 }, { id: 1, q: 0, r: 0 }] },
  { moves: [{ id: 2, q: 1, r: 0 }, { id: 1, q: 0, r: 0 }] },
  { moves: [{ id: 2, q: 1, r: 0 }, { id: 1, q: 0, r: 0 }] },
  { moves: [{ id: 2, q: 1, r: 0 }, { id: 1, q: 0, r: 0 }] }
]);
assert.strictEqual(dead.state.outcome, 'lose');
assert.ok(dead.state.hp <= 0);

var hide = play('chapter', [{}, {}, {}, {}, {}, {}, {}, {}]);
assert.strictEqual(hide.state.outcome, 'failflag');
assert.ok(hide.state.hp > 0);

var carry = S.createRun('chapter');
S.beginTurn(carry);
assert.strictEqual(carry.supply, 5);
assert.strictEqual(S.buy(carry, 'light', -2, 1), true);
assert.strictEqual(carry.supply, 2);
S.fight(carry);
assert.strictEqual(carry.supply, 2);
S.nextTurn(carry);
assert.strictEqual(carry.supply, 7, '结转 2 再加本回合 5，不生息');
S.fight(carry);
S.nextTurn(carry);
assert.strictEqual(carry.supply, 13, '结转 7 再加 6');

var wind = S.createRun('chapter');
S.beginTurn(wind);
assert.strictEqual(S.setWind(wind, 1, 1), true);
assert.strictEqual(S.spendable(wind), 4);
assert.strictEqual(S.setWind(wind, 0, 1), true);
assert.strictEqual(S.spendable(wind), 5);
var locked = { dir: wind.wind.dir, reach: wind.wind.reach };
var first = S.preview(wind).plans.map(function (p) { return p.q + ',' + p.r; }).join('|');
S.fight(wind);
var second = wind.battle.plans.map(function (p) { return p.q + ',' + p.r; }).join('|');
assert.strictEqual(first, second);
assert.strictEqual(wind.battle.plans.length > 0, true);
assert.deepStrictEqual({ dir: locked.dir, reach: locked.reach }, { dir: 0, reach: 1 });

var again = S.createRun('teach');
S.beginTurn(again);
var snapSupply = again.supply;
S.buy(again, 'light', -2, 0);
S.fight(again);
assert.strictEqual(S.retryTurn(again), true);
assert.strictEqual(again.supply, snapSupply);
assert.strictEqual(again.ships.length, 1);
assert.strictEqual(again.phase, 'prep');

assert.strictEqual(S.MAX_SHIPS, 6);
assert.strictEqual(S.TEACH.length, 4);
assert.strictEqual(S.CHAPTER.length, 8);
assert.strictEqual(S.DIRS.length, 6);

console.log('sim ok', {
  teachHp: teach.state.hp,
  chapterHp: win.state.hp,
  deadTurn: dead.fights.length,
  hide: hide.state.outcome
});
