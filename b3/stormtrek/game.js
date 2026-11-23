/* 风暴牌旅
 * 六节点远征。晴、雨、风共用一条气候轨，数字随天气立刻改写。
 * 雨路：降雨压点火，雨囊和护盾扛迅猛，雨灭浇火，雷暴补伤害。
 * 晴风路：晴天火把，风天风帆。晴天对上劫匪要留护盾。
 * 失败只留图鉴，不累计攻击。
 */
(function (global) {
  'use strict';

  var SAVE_KEY = 'stormtrek_save_v1';
  var MAX_HP = 36;
  var REPAIR = 10;
  var BOSS_HP = 56;
  var SCORPION_HP = 34;
  var RAIDER_HP = 30;
  var WOLF_HP = 16;
  var SUN_IGNITE = 4;
  var RAIN_IGNITE = 5;
  var TORCH_SUN = 7;
  var STORM_DMG = 6;

  var CLIMATE_NAME = { sun: '晴', rain: '雨', wind: '风' };
  var INTENT_NAME = { ignite: '点火', rush: '迅猛', guard: '防御', doused: '已浇灭' };
  var ENEMY_NAME = { wolf: '岩狼', scorpion: '沙岩蝎', raider: '劫匪', boss: '风暴头狼' };

  var CARDS = {
    sun: { name: '晴路', cost: 1, target: 'weather', climate: 'sun', rule: '把气候改为晴。火把与车轮会变强，雨势散去。', drag: '拖到气候轨上打出。' },
    rain: { name: '降雨', cost: 1, target: 'weather', climate: 'rain', rule: '把气候改为雨。点火会被压低，车轮变慢，护盾更厚。', drag: '拖到气候轨上打出。' },
    wind: { name: '劲风', cost: 1, target: 'weather', climate: 'wind', rule: '把气候改为风。迅猛会被吹偏，风帆可以一边推进一边挡伤。', drag: '拖到气候轨上打出。' },
    veil: { name: '云隐晴', cost: 1, target: 'weather', climate: 'sun', thin: true, rule: '把气候改为晴，并铺上薄云。这一回合双方的火焰伤害减半，下一回合薄云散去，晴仍留着。', drag: '拖到气候轨上打出。' },
    storm: { name: '雷暴', cost: 2, target: 'weather', climate: 'rain', storm: true, rule: '费用 2。把气候改为雨，立刻造成 6 点伤害，并获得 3 点护盾。', drag: '拖到气候轨上打出。' },
    flask: { name: '雨囊', cost: 1, target: 'caravan', rule: '雨中获得 8 点护盾，并溅出 3 点伤害。其他气候只获得 3 点护盾。', drag: '拖到商队身上打出。' },
    shield: { name: '护盾', cost: 1, target: 'caravan', rule: '获得护盾。晴为 5，雨为 8，风为 7。敌方结算之后护盾会散去。', drag: '拖到商队身上打出。' },
    wheel: { name: '车轮', cost: 1, target: 'enemy', rule: '推进并造成伤害。晴为 5，雨为 4，风为 5。风中额外抽 1 张牌。', drag: '拖到敌人身上打出。' },
    douse: { name: '雨灭火种', cost: 1, target: 'enemy', rule: '造成少量伤害。若敌人下一步是点火，浇灭它，这一步不再造成伤害。雨中伤害为 4，其他气候为 2。', drag: '拖到敌人身上打出。' },
    sail: { name: '风帆', cost: 1, target: 'enemy', rule: '风中造成 7 点伤害并获得 5 点护盾。其他气候造成 3 点伤害。', drag: '拖到敌人身上打出。' },
    torch: { name: '晴日火把', cost: 1, target: 'enemy', rule: '晴天造成 7 点伤害。薄云下造成 4 点。其他气候只造成 2 点。', drag: '拖到敌人身上打出。' },
    lantern: { name: '风灯', cost: 1, target: 'caravan', rule: '获得 2 点护盾并抽 2 张牌。风中改为抽 3 张。', drag: '拖到商队身上打出。' }
  };
  var CARD_ORDER = ['sun', 'rain', 'wind', 'veil', 'storm', 'flask', 'shield', 'wheel', 'douse', 'sail', 'torch', 'lantern'];

  var STARTERS = {
    balanced: ['sun', 'rain', 'wind', 'shield', 'shield', 'wheel', 'douse', 'lantern', 'flask', 'torch'],
    rain: ['rain', 'rain', 'flask', 'douse', 'douse', 'shield', 'shield', 'wheel', 'wheel', 'lantern'],
    sunwind: ['sun', 'veil', 'torch', 'torch', 'wind', 'sail', 'shield', 'shield', 'wheel', 'lantern']
  };
  var STARTER_NAME = { balanced: '均衡商队', rain: '雨路商队', sunwind: '晴风商队' };
  var STARTER_BLURB = {
    balanced: '晴雨风各一张，适合先把意图和气候轨认熟。',
    rain: '两张降雨、两张雨灭，靠压火和厚盾走完这一程。',
    sunwind: '两张火把和风帆。晴天输出，风天攻防一起做。'
  };

  var PATTERNS = {
    wolf: [
      { kind: 'guard', n: 4 },
      { kind: 'rush', n: 5 },
      { kind: 'guard', n: 4 },
      { kind: 'rush', n: 5 },
      { kind: 'ignite', n: 4 }
    ],
    scorpion: [
      { kind: 'rush', n: 8 },
      { kind: 'guard', n: 6 },
      { kind: 'ignite', n: 7 },
      { kind: 'rush', n: 8 }
    ],
    raider: [
      { kind: 'ignite', n: 8 },
      { kind: 'rush', n: 7 },
      { kind: 'ignite', n: 9 },
      { kind: 'guard', n: 5 }
    ],
    boss: [
      { kind: 'guard', n: 8 },
      { kind: 'ignite', n: 9 },
      { kind: 'rush', n: 11 },
      { kind: 'ignite', n: 9 },
      { kind: 'rush', n: 10 }
    ]
  };

  var NODES = [
    { type: 'battle', enemy: 'wolf', name: '潮沙岩狼', title: '教学 · 潮沙', climate: 'rain', hp: WOLF_HP, tutorial: true },
    { type: 'battle', enemy: 'scorpion', name: '沙岩蝎', title: '晴脊 · 沙岩蝎', climate: 'sun', hp: SCORPION_HP },
    { type: 'camp', name: '修篷营地', title: '营地 · 修篷' },
    { type: 'battle', enemy: 'raider', name: '火把劫匪', title: '风口 · 劫匪', climate: 'wind', hp: RAIDER_HP },
    { type: 'camp', name: '夜歇营地', title: '营地 · 夜歇' },
    { type: 'battle', enemy: 'boss', name: '风暴头狼', title: '终点 · 风暴头狼', climate: 'rain', hp: BOSS_HP, goal: true }
  ];

  var UNITS = {
    wagon: { file: 'b06-unit-wagon.png', w: 2048, h: 1024, ax: 1024.5, ay: 1010 },
    camel: { file: 'b06-unit-camel.png', w: 1536, h: 1024, ax: 767.5, ay: 1010 },
    'walker-a': { file: 'b06-unit-walker-a.png', w: 1024, h: 1536, ax: 512.5, ay: 1523 },
    'walker-b': { file: 'b06-unit-walker-b.png', w: 1024, h: 1536, ax: 513, ay: 1523 },
    'walker-c': { file: 'b06-unit-walker-c.png', w: 1024, h: 1536, ax: 512.5, ay: 1523 },
    'enemy-rockwolf': { file: 'b06-unit-enemy-rockwolf.png', w: 1536, h: 1024, ax: 768.5, ay: 1011 },
    'enemy-raider': { file: 'b06-unit-enemy-raider.png', w: 1024, h: 1536, ax: 512.5, ay: 1522 },
    'enemy-scorpion': { file: 'b06-unit-enemy-scorpion.png', w: 1536, h: 1024, ax: 768.5, ay: 1011 }
  };

  var ANIMS = {
    'flame-sway': { fw: 443, fh: 420, cols: 6, rows: 4, n: 24, fps: 12, ax: 238.8, ay: 238.6, sheet: 'assets/anim/b06-mascot-sheet-flame-sway.webp', still: 'assets/anim/b06-mascot-still-flame-sway.png' },
    'card-raise': { fw: 453, fh: 412, cols: 6, rows: 4, n: 24, fps: 12, ax: 248.8, ay: 202.6, sheet: 'assets/anim/b06-mascot-sheet-card-raise.webp', still: 'assets/anim/b06-mascot-still-card-raise.png' },
    'wind-brush': { fw: 480, fh: 418, cols: 6, rows: 4, n: 24, fps: 12, ax: 275.8, ay: 202.7, sheet: 'assets/anim/b06-mascot-sheet-wind-brush.webp', still: 'assets/anim/b06-mascot-still-wind-brush.png' }
  };
  var COVERS = {
    portrait: { imgW: 864, imgH: 1152, bbox: { x: 72, y: 455, w: 720, h: 691 } },
    landscape: { imgW: 1280, imgH: 720, bbox: { x: 53, y: 179, w: 560, h: 537 } }
  };

  function rngNext(rng) {
    var a = rng.s | 0;
    a = (a + 0x6D2B79F5) | 0;
    rng.s = a;
    var t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function shuffle(list, rng) {
    var a = list.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rngNext(rng) * (i + 1));
      var tmp = a[i];
      a[i] = a[j];
      a[j] = tmp;
    }
    return a;
  }

  function counts(deck) {
    var m = {};
    deck.forEach(function (id) { m[id] = (m[id] || 0) + 1; });
    return m;
  }

  function shieldValue(climate) {
    if (climate === 'rain') return 8;
    if (climate === 'wind') return 7;
    return 5;
  }
  function wheelValue(climate) {
    if (climate === 'sun') return 5;
    if (climate === 'rain') return 4;
    return 5;
  }
  function torchValue(climate, thin) {
    if (climate === 'sun') return thin ? 4 : TORCH_SUN;
    return 2;
  }
  function sailHit(climate) { return climate === 'wind' ? 7 : 3; }
  function sailBlock(climate) { return climate === 'wind' ? 5 : 0; }
  function douseValue(climate) { return climate === 'rain' ? 4 : 2; }
  function nowNumber(id, battle) {
    var c = battle.climate;
    if (id === 'shield') return String(shieldValue(c));
    if (id === 'wheel') return String(wheelValue(c));
    if (id === 'torch') return String(torchValue(c, battle.thin));
    if (id === 'sail') return String(sailHit(c));
    if (id === 'douse') return String(douseValue(c));
    if (id === 'flask') return c === 'rain' ? '8' : '3';
    if (id === 'lantern') return c === 'wind' ? '抽3' : '抽2';
    if (id === 'storm') return String(STORM_DMG);
    if (CARDS[id] && CARDS[id].climate) return CLIMATE_NAME[CARDS[id].climate];
    return '';
  }

  function adjusted(enemyId, raw, climate, thin) {
    var n = raw.n;
    var kind = raw.kind;
    if (kind === 'guard') {
      if (climate === 'rain') n += 2;
      else if (climate === 'sun') n = Math.max(2, n - 1);
    } else if (kind === 'ignite') {
      if (climate === 'rain') n = Math.max(1, n - RAIN_IGNITE);
      else if (climate === 'sun') n += SUN_IGNITE;
      else if (climate === 'wind') n = Math.max(1, n - 1);
      if (thin) n = Math.max(1, Math.round(n / 2));
    } else if (kind === 'rush') {
      if (climate === 'rain') {
        if (enemyId === 'wolf' || enemyId === 'boss') n += 2;
        else if (enemyId === 'scorpion') n -= 2;
        else n -= 1;
      } else if (climate === 'sun') {
        if (enemyId === 'scorpion' || enemyId === 'raider') n += 2;
        else n -= 1;
      } else if (climate === 'wind') n -= 3;
      n = Math.max(2, n);
    }
    return { kind: kind, n: n };
  }

  function shownIntent(battle) {
    if (!battle) return { kind: 'guard', n: 0 };
    if (battle.cancelled) return { kind: 'doused', n: 0 };
    var pat = PATTERNS[battle.enemyId];
    var raw = pat[battle.patternAt % pat.length];
    return adjusted(battle.enemyId, raw, battle.climate, battle.thin);
  }

  function intentIf(battle, climate, thin) {
    if (battle.cancelled) return { kind: 'doused', n: 0 };
    var pat = PATTERNS[battle.enemyId];
    var raw = pat[battle.patternAt % pat.length];
    return adjusted(battle.enemyId, raw, climate, thin);
  }

  function previewSentence(battle, cardId) {
    var card = CARDS[cardId];
    if (!card || card.target !== 'weather') return '';
    var now = shownIntent(battle);
    var fut = intentIf(battle, card.climate, !!card.thin);
    var bits = ['若打出' + card.name + '，气候变为' + CLIMATE_NAME[card.climate]];
    if (card.thin) bits.push('这一回合有薄云');
    if (now.kind !== 'doused') bits.push(INTENT_NAME[fut.kind] + '由 ' + now.n + ' 改到 ' + fut.n);
    bits.push('护盾由 ' + shieldValue(battle.climate) + ' 改到 ' + shieldValue(card.climate));
    bits.push('火把由 ' + torchValue(battle.climate, battle.thin) + ' 改到 ' + torchValue(card.climate, !!card.thin));
    return bits.join('，') + '。';
  }

  function drawN(run, n, notes) {
    var b = run.battle;
    var shuffled = false;
    for (var i = 0; i < n; i++) {
      if (!b.draw.length) {
        if (!b.discard.length) break;
        b.draw = shuffle(b.discard, run.rng);
        b.discard = [];
        shuffled = true;
      }
      if (!b.draw.length) break;
      b.hand.push(b.draw.pop());
    }
    if (shuffled && notes) notes.push('牌库已洗匀。');
  }

  function damageEnemy(battle, amount, notes, label, fx) {
    var left = amount;
    if (battle.enemyBlock > 0 && left > 0) {
      var blocked = Math.min(battle.enemyBlock, left);
      battle.enemyBlock -= blocked;
      left -= blocked;
    }
    battle.enemyHp -= left;
    if (battle.enemyHp < 0) battle.enemyHp = 0;
    notes.push(label + '造成 ' + amount + ' 点伤害。');
    if (fx) fx.amount = (fx.amount || 0) + amount;
    if (fx) fx.enemy = true;
  }

  function applyCard(run, id, notes, fx) {
    var b = run.battle;
    var card = CARDS[id];
    if (card.target === 'weather') {
      b.climate = card.climate;
      b.thin = !!card.thin;
      b.stormy = !!card.storm;
      notes.push(card.name + '打出，气候现在是' + CLIMATE_NAME[card.climate] + (card.thin ? '，带着薄云。' : '。'));
      fx.weather = true;
      if (card.storm) {
        damageEnemy(b, STORM_DMG, notes, '雷暴', fx);
        b.block += 3;
        notes.push('商队获得 3 点护盾。');
      }
      return;
    }
    if (id === 'shield') {
      var sn = shieldValue(b.climate);
      b.block += sn;
      notes.push('护盾展开，获得 ' + sn + ' 点。');
      return;
    }
    if (id === 'flask') {
      if (b.climate === 'rain') {
        b.block += 8;
        notes.push('雨囊鼓起，获得 8 点护盾。');
        damageEnemy(b, 3, notes, '雨水', fx);
      } else {
        b.block += 3;
        notes.push('雨囊只挤出 3 点护盾。');
      }
      return;
    }
    if (id === 'wheel') {
      damageEnemy(b, wheelValue(b.climate), notes, '车轮', fx);
      if (b.climate === 'wind') {
        drawN(run, 1, notes);
        notes.push('风把下一张牌送入手中。');
      }
      return;
    }
    if (id === 'torch') {
      damageEnemy(b, torchValue(b.climate, b.thin), notes, '火把', fx);
      return;
    }
    if (id === 'sail') {
      damageEnemy(b, sailHit(b.climate), notes, '风帆', fx);
      var sb = sailBlock(b.climate);
      if (sb) {
        b.block += sb;
        notes.push('风帆挡下 ' + sb + ' 点。');
      }
      return;
    }
    if (id === 'douse') {
      var intent = shownIntent(b);
      damageEnemy(b, douseValue(b.climate), notes, '雨灭火种', fx);
      if (intent.kind === 'ignite') {
        b.cancelled = true;
        notes.push('点火被浇灭，这一步不会打过来。');
      }
      return;
    }
    if (id === 'lantern') {
      b.block += 2;
      var draw = b.climate === 'wind' ? 3 : 2;
      drawN(run, draw, notes);
      notes.push('风灯照路，获得 2 点护盾，抽 ' + draw + ' 张。');
    }
  }

  function discover(meta, id) {
    if (!meta.gallery) meta.gallery = [];
    if (meta.gallery.indexOf(id) < 0) meta.gallery.push(id);
  }
  function unlock(meta) {
    if (!meta.starters) meta.starters = ['balanced'];
    ['rain', 'sunwind'].forEach(function (id) {
      if (meta.starters.indexOf(id) < 0) meta.starters.push(id);
    });
  }
  function record(meta, run) {
    if (run.recorded) return;
    run.recorded = true;
    meta.lastSeed = run.seed >>> 0;
    meta.lastStarter = run.starter;
    meta.best = Math.max(meta.best || 0, run.node + (run.phase === 'victory' ? 1 : 0));
    if (run.phase === 'victory') {
      meta.wins = (meta.wins || 0) + 1;
      unlock(meta);
    }
  }

  function freshMeta() {
    return { gallery: [], starters: ['balanced'], wins: 0, best: 0, lastSeed: 1, lastStarter: 'balanced', coach: 0 };
  }

  function newRun(meta, starter, seed) {
    if (!STARTERS[starter]) starter = 'balanced';
    var s = seed >>> 0;
    if (!s) s = 1;
    var deck = STARTERS[starter].slice();
    deck.forEach(function (id) { discover(meta, id); });
    meta.lastSeed = s;
    meta.lastStarter = starter;
    return {
      seed: s,
      rng: { s: s | 0 },
      starter: starter,
      hp: MAX_HP,
      maxHp: MAX_HP,
      deck: deck,
      node: 0,
      phase: 'map',
      reward: null,
      rewardPick: null,
      campChoice: null,
      campCard: null,
      battle: null,
      log: '六个节点。先走过教学这一场。',
      recorded: false,
      lastHit: null
    };
  }

  function offerReward(run) {
    var have = counts(run.deck);
    function ok(id) { return (have[id] || 0) < 2; }
    var route = ['storm', 'sail', 'veil', 'torch', 'douse', 'flask', 'wheel', 'lantern'].filter(ok);
    var weather = ['sun', 'rain', 'wind', 'veil', 'storm'].filter(ok);
    var picks = [];
    function take(pool) {
      var avail = pool.filter(function (id) { return picks.indexOf(id) < 0; });
      if (!avail.length) return;
      picks.push(avail[Math.floor(rngNext(run.rng) * avail.length)]);
    }
    take(route);
    take(weather);
    var guard = 0;
    while (picks.length < 3 && guard < 12) {
      guard += 1;
      var rest = CARD_ORDER.filter(function (id) { return picks.indexOf(id) < 0 && ok(id); });
      if (!rest.length) rest = CARD_ORDER.filter(function (id) { return picks.indexOf(id) < 0; });
      if (!rest.length) break;
      picks.push(rest[Math.floor(rngNext(run.rng) * rest.length)]);
    }
    return picks;
  }

  function winBattle(meta, run, notes) {
    var node = NODES[run.node];
    run.battle = null;
    notes.push(node.name + '被击退。');
    run.log = notes.join('');
    meta.best = Math.max(meta.best || 0, run.node + 1);
    if (node.goal) {
      run.phase = 'victory';
      run.log = '商队穿过了终点，远征完成。图鉴留在这台设备上，下一程仍从起始牌组出发。';
      record(meta, run);
      return { ok: true, end: 'victory' };
    }
    run.reward = offerReward(run);
    run.rewardPick = null;
    run.phase = 'reward';
    return { ok: true, end: 'reward' };
  }

  function playCard(meta, run, handIndex) {
    if (!run || run.phase !== 'battle' || !run.battle) return { ok: false, reason: '现在不能出牌。' };
    var b = run.battle;
    var id = b.hand[handIndex];
    if (!id) return { ok: false, reason: '没有这张牌。' };
    var card = CARDS[id];
    if (b.ap < card.cost) return { ok: false, reason: '行动点不够。' };
    b.ap -= card.cost;
    b.hand.splice(handIndex, 1);
    b.discard.push(id);
    var notes = [];
    var fx = {};
    applyCard(run, id, notes, fx);
    if (b.enemyHp <= 0) {
      b.enemyHp = 0;
      var won = winBattle(meta, run, notes);
      won.fx = fx;
      return won;
    }
    run.log = notes.join('');
    return { ok: true, fx: fx };
  }

  function endTurn(meta, run) {
    if (!run || run.phase !== 'battle' || !run.battle) return { ok: false, reason: '现在没有回合。' };
    var b = run.battle;
    while (b.hand.length) b.discard.push(b.hand.pop());
    b.enemyBlock = 0;
    var intent = shownIntent(b);
    var notes = [];
    var hpBefore = run.hp;
    var hit = 0;
    if (intent.kind === 'rush' || intent.kind === 'ignite') {
      var blocked = Math.min(b.block, intent.n);
      hit = intent.n - blocked;
      run.hp -= hit;
      if (run.hp < 0) run.hp = 0;
      notes.push('敌方' + INTENT_NAME[intent.kind] + '，预告的 ' + intent.n + ' 点落到商队身上。');
      if (blocked) notes.push('护盾挡住 ' + blocked + ' 点。');
      if (hit) notes.push('商队承受 ' + hit + ' 点。');
      else notes.push('商队没有掉耐久。');
    } else if (intent.kind === 'guard') {
      b.enemyBlock = intent.n;
      notes.push('敌方防御，获得 ' + intent.n + ' 点护盾。');
    } else {
      notes.push('火种已灭，敌方这一步没有出手。');
    }
    run.lastHit = { kind: intent.kind, n: intent.n, hit: hit, hpBefore: hpBefore, hpAfter: run.hp };
    b.block = 0;
    b.cancelled = false;
    b.patternAt += 1;
    b.stormy = false;
    if (run.hp <= 0) {
      run.hp = 0;
      run.phase = 'defeat';
      run.battle = null;
      run.log = notes.join('') + '耐久耗尽，这一程停在这里。';
      record(meta, run);
      return { ok: true, end: 'defeat', playerDmg: hit };
    }
    b.turn += 1;
    b.thin = false;
    b.ap = 3;
    drawN(run, 5, notes);
    run.log = notes.join('');
    return { ok: true, playerDmg: hit };
  }

  function startBattle(run, node) {
    var deck = run.deck.slice();
    var hand = [];
    if (node.tutorial) {
      ['shield', 'wheel', 'rain', 'lantern', 'shield'].forEach(function (id) {
        var i = deck.indexOf(id);
        if (i >= 0) hand.push(deck.splice(i, 1)[0]);
      });
    }
    var draw = shuffle(deck, run.rng);
    while (hand.length < 5 && draw.length) hand.push(draw.pop());
    run.battle = {
      enemyId: node.enemy,
      enemyHp: node.hp,
      enemyMax: node.hp,
      enemyBlock: 0,
      patternAt: 0,
      cancelled: false,
      climate: node.climate,
      thin: false,
      stormy: !!node.goal,
      block: 0,
      ap: 3,
      draw: draw,
      discard: [],
      hand: hand,
      turn: 1,
      tutorial: !!node.tutorial
    };
    run.phase = 'battle';
    run.log = node.tutorial
      ? '右上角是岩狼的下一步。点开车轮，拖到它身上。'
      : node.name + '拦住了商队。下一步已经写在右上角。';
  }

  function enterNode(meta, run) {
    if (!run || run.phase !== 'map') return { ok: false, reason: '现在不在路线上。' };
    var node = NODES[run.node];
    if (!node) return { ok: false, reason: '没有下一站。' };
    if (node.type === 'camp') {
      run.phase = 'camp';
      run.campChoice = null;
      run.campCard = null;
      run.log = '可以修车，或从牌组移出一张。两件不能一起确认。';
      return { ok: true };
    }
    startBattle(run, node);
    return { ok: true };
  }

  function advanceNode(meta, run) {
    run.node += 1;
    run.reward = null;
    run.rewardPick = null;
    run.campChoice = null;
    run.campCard = null;
    meta.best = Math.max(meta.best || 0, run.node);
    if (run.node >= 1) unlock(meta);
    if (run.node >= NODES.length) {
      run.phase = 'victory';
      record(meta, run);
      return { ok: true, end: 'victory' };
    }
    run.phase = 'map';
    run.log = '下一站：' + NODES[run.node].title + '。';
    return { ok: true, end: 'map' };
  }

  function takeReward(meta, run, index) {
    if (!run || run.phase !== 'reward') return { ok: false, reason: '现在没有奖励。' };
    if (index >= 0) {
      var id = run.reward[index];
      if (!id) return { ok: false, reason: '没有这张牌。' };
      run.deck.push(id);
      discover(meta, id);
      run.log = '带走了' + CARDS[id].name + '。';
    } else {
      run.log = '这一站的奖励留在了原地。';
    }
    return advanceNode(meta, run);
  }

  function chooseCamp(run, choice) {
    if (!run || run.phase !== 'camp') return { ok: false, reason: '现在不在营地。' };
    if (choice !== 'delete' && choice !== 'repair') return { ok: false, reason: '没有这个选项。' };
    run.campChoice = choice;
    if (choice !== 'delete') run.campCard = null;
    return { ok: true };
  }

  function confirmCamp(meta, run) {
    if (!run || run.phase !== 'camp') return { ok: false, reason: '现在不在营地。' };
    if (run.campChoice === 'repair') {
      var before = run.hp;
      run.hp = Math.min(run.maxHp, run.hp + REPAIR);
      run.log = '篷车修好了，耐久由 ' + before + ' 到 ' + run.hp + '。';
      return advanceNode(meta, run);
    }
    if (run.campChoice === 'delete') {
      if (run.deck.length <= 5) return { ok: false, reason: '至少留下五张牌。' };
      if (run.campCard == null || run.campCard < 0 || run.campCard >= run.deck.length) {
        return { ok: false, reason: '先选一张要移出的牌。' };
      }
      var id = run.deck[run.campCard];
      run.deck.splice(run.campCard, 1);
      run.campCard = null;
      run.log = '已移出一张' + CARDS[id].name + '。';
      return advanceNode(meta, run);
    }
    return { ok: false, reason: '先选定修车或删牌。' };
  }

  function can(battle, id) {
    var i = battle.hand.indexOf(id);
    if (i < 0) return -1;
    if (CARDS[id].cost > battle.ap) return -1;
    return i;
  }
  function incoming(battle) {
    var intent = shownIntent(battle);
    if (intent.kind === 'rush' || intent.kind === 'ignite') return intent.n;
    return 0;
  }
  function playAt(index) { return { type: 'play', index: index }; }

  function actRain(run) {
    var b = run.battle;
    var gap = incoming(b) - b.block;
    if (b.climate !== 'rain') {
      if (can(b, 'storm') >= 0 && b.enemyHp > 8) return playAt(can(b, 'storm'));
      if (can(b, 'rain') >= 0) return playAt(can(b, 'rain'));
    }
    if (shownIntent(b).kind === 'ignite' && can(b, 'douse') >= 0) return playAt(can(b, 'douse'));
    if (gap >= 3) {
      if (b.climate === 'rain' && can(b, 'flask') >= 0 && gap >= 6) return playAt(can(b, 'flask'));
      if (can(b, 'shield') >= 0) return playAt(can(b, 'shield'));
      if (b.climate === 'rain' && can(b, 'flask') >= 0) return playAt(can(b, 'flask'));
    }
    if (can(b, 'storm') >= 0 && b.enemyHp > 5 && gap < 8) return playAt(can(b, 'storm'));
    var order = ['wheel', 'douse', 'sail', 'lantern'];
    for (var i = 0; i < order.length; i++) {
      var idx = can(b, order[i]);
      if (idx >= 0) return playAt(idx);
    }
    if (can(b, 'torch') >= 0 && (b.climate === 'sun' || b.ap === 1)) return playAt(can(b, 'torch'));
    if (gap > 0 && can(b, 'shield') >= 0) return playAt(can(b, 'shield'));
    return { type: 'end' };
  }

  function actSun(run) {
    var b = run.battle;
    var id = b.enemyId;
    var gap = incoming(b) - b.block;
    var sail = can(b, 'sail');
    var torch = can(b, 'torch');
    var wantWind = id === 'boss' || id === 'raider' || id === 'wolf' || (sail >= 0 && id !== 'scorpion');
    if (id === 'scorpion' && torch >= 0) wantWind = false;
    if ((id === 'raider' || id === 'boss') && b.climate === 'sun') {
      if (can(b, 'wind') >= 0) return playAt(can(b, 'wind'));
      if (can(b, 'rain') >= 0) return playAt(can(b, 'rain'));
    }
    if (wantWind && b.climate !== 'wind' && can(b, 'wind') >= 0) return playAt(can(b, 'wind'));
    if (!wantWind && b.climate !== 'sun' && id !== 'raider') {
      if (shownIntent(b).kind === 'ignite' && gap > 4 && can(b, 'veil') >= 0) return playAt(can(b, 'veil'));
      if (can(b, 'sun') >= 0) return playAt(can(b, 'sun'));
    }
    if (gap >= 4) {
      if (b.climate === 'wind' && sail >= 0) return playAt(sail);
      if (can(b, 'shield') >= 0) return playAt(can(b, 'shield'));
    }
    if (b.climate === 'sun' && !b.thin && torch >= 0) return playAt(torch);
    if (b.climate === 'wind' && sail >= 0) return playAt(sail);
    if (can(b, 'wheel') >= 0) return playAt(can(b, 'wheel'));
    if (torch >= 0) return playAt(torch);
    if (can(b, 'lantern') >= 0) return playAt(can(b, 'lantern'));
    if (gap > 0 && can(b, 'shield') >= 0) return playAt(can(b, 'shield'));
    return { type: 'end' };
  }

  function actTutor(run) {
    var b = run.battle;
    var gap = incoming(b) - b.block;
    if (can(b, 'wheel') >= 0) return playAt(can(b, 'wheel'));
    if (b.climate === 'sun' && can(b, 'torch') >= 0) return playAt(can(b, 'torch'));
    if (can(b, 'douse') >= 0) return playAt(can(b, 'douse'));
    if (gap > 0 && can(b, 'shield') >= 0) return playAt(can(b, 'shield'));
    if (b.climate === 'rain' && gap > 0 && can(b, 'flask') >= 0) return playAt(can(b, 'flask'));
    if (can(b, 'lantern') >= 0) return playAt(can(b, 'lantern'));
    if (can(b, 'torch') >= 0) return playAt(can(b, 'torch'));
    if (can(b, 'sail') >= 0) return playAt(can(b, 'sail'));
    return { type: 'end' };
  }

  function actGreed(run) {
    var b = run.battle;
    if (b.climate !== 'sun') {
      if (can(b, 'sun') >= 0) return playAt(can(b, 'sun'));
      if (can(b, 'veil') >= 0) return playAt(can(b, 'veil'));
    }
    if (can(b, 'torch') >= 0) return playAt(can(b, 'torch'));
    if (can(b, 'wheel') >= 0) return playAt(can(b, 'wheel'));
    if (can(b, 'sail') >= 0) return playAt(can(b, 'sail'));
    if (can(b, 'douse') >= 0) return playAt(can(b, 'douse'));
    return { type: 'end' };
  }

  function campSmart(meta, run, mode) {
    if (run.hp <= 24) {
      chooseCamp(run, 'repair');
      return confirmCamp(meta, run);
    }
    var drop = mode === 'rain'
      ? ['torch', 'sail', 'veil', 'sun', 'wind', 'lantern']
      : ['flask', 'douse', 'rain', 'storm', 'lantern'];
    var have = counts(run.deck);
    var idx = -1;
    for (var i = 0; i < drop.length; i++) {
      if (have[drop[i]]) { idx = run.deck.indexOf(drop[i]); break; }
    }
    if (idx < 0 || run.deck.length <= 5) {
      chooseCamp(run, 'repair');
      return confirmCamp(meta, run);
    }
    chooseCamp(run, 'delete');
    run.campCard = idx;
    return confirmCamp(meta, run);
  }

  function pickReward(run, order) {
    var best = 0;
    var score = -1;
    run.reward.forEach(function (id, i) {
      var at = order.indexOf(id);
      var rank = at < 0 ? 0 : (order.length - at);
      if (rank > score) { score = rank; best = i; }
    });
    return best;
  }

  function expedition(opts) {
    var meta = freshMeta();
    var run = newRun(meta, opts.starter, opts.seed);
    var trace = [];
    var guard = 0;
    while (run.phase !== 'victory' && run.phase !== 'defeat' && guard < 500) {
      guard += 1;
      if (run.phase === 'map') {
        var entered = enterNode(meta, run);
        if (!entered.ok) break;
      } else if (run.phase === 'battle') {
        var tg = 0;
        while (run.phase === 'battle' && tg < 70) {
          tg += 1;
          var move = opts.act(run);
          var res;
          if (!move || move.type === 'end') res = endTurn(meta, run);
          else {
            res = playCard(meta, run, move.index);
            if (!res.ok) res = endTurn(meta, run);
          }
          if (run.battle) {
            var intent = shownIntent(run.battle);
            trace.push('n' + run.node + ' t' + run.battle.turn + ' hp' + run.hp + ' e' + run.battle.enemyHp + ' ' + run.battle.climate + ' ' + intent.kind + intent.n);
          }
          if (res && res.end) trace.push(res.end + ' hp' + run.hp);
        }
        if (run.phase === 'battle') {
          run.phase = 'defeat';
          run.log = '回合耗尽。';
        }
      } else if (run.phase === 'reward') {
        if (opts.skipReward) takeReward(meta, run, -1);
        else takeReward(meta, run, pickReward(run, opts.rewardOrder));
      } else if (run.phase === 'camp') {
        opts.camp(meta, run);
      } else break;
    }
    return { phase: run.phase, hp: run.hp, node: run.node, log: run.log, trace: trace.slice(-25), deck: run.deck.slice(), meta: meta };
  }

  function selfCheck() {
    var failures = [];
    var lines = [];
    function fail(msg) { failures.push(msg); }

    var r1 = { s: 11 | 0 };
    var seq = [rngNext(r1), rngNext(r1), rngNext(r1)];
    var saved = r1.s;
    var r2 = { s: saved };
    var more = [rngNext(r1), rngNext(r1)];
    var more2 = [rngNext(r2), rngNext(r2)];
    if (more.join(',') !== more2.join(',')) fail('随机种子无法按存档续上');
    if (seq[0] === seq[1] && seq[1] === seq[2]) fail('随机序列没有变化');

    var openA = opening(42);
    var openB = opening(42);
    var openC = opening(43);
    if (JSON.stringify(openA) !== JSON.stringify(openB)) fail('同一种子的起手不一致');
    if (JSON.stringify(openA.draw) === JSON.stringify(openC.draw)) fail('不同种子的牌库没有分开');
    if (openA.hand.join(',') !== 'shield,wheel,rain,lantern,shield') fail('教学起手与固定五张不一致');

    var tele = freshMeta();
    var tr = newRun(tele, 'balanced', 5);
    tr.node = 3;
    enterNode(tele, tr);
    var windN = shownIntent(tr.battle).n;
    tr.battle.hand = ['sun'];
    tr.battle.ap = 3;
    playCard(tele, tr, 0);
    var sunN = shownIntent(tr.battle).n;
    if (!(sunN > windN)) fail('晴天没有抬高劫匪的点火');
    var preview = shownIntent(tr.battle).n;
    endTurn(tele, tr);
    if (!tr.lastHit || tr.lastHit.n !== preview) fail('结算伤害和预告数字不一致');

    var veilMeta = freshMeta();
    var vr = newRun(veilMeta, 'balanced', 8);
    vr.node = 1;
    enterNode(veilMeta, vr);
    vr.battle.patternAt = 2;
    vr.battle.climate = 'sun';
    vr.battle.thin = false;
    var full = shownIntent(vr.battle).n;
    vr.battle.hand = ['veil'];
    vr.battle.ap = 3;
    playCard(veilMeta, vr, 0);
    var half = shownIntent(vr.battle).n;
    if (half >= full) fail('薄云没有压低火焰');
    var halfPreview = shownIntent(vr.battle).n;
    endTurn(veilMeta, vr);
    if (!vr.lastHit || vr.lastHit.n !== halfPreview) fail('薄云结算没有照预告');
    if (!vr.battle || vr.battle.thin) fail('薄云没有在下一回合散去');

    var douseMeta = freshMeta();
    var dr = newRun(douseMeta, 'balanced', 4);
    dr.node = 3;
    enterNode(douseMeta, dr);
    dr.battle.hand = ['douse'];
    dr.battle.ap = 1;
    dr.hp = MAX_HP;
    playCard(douseMeta, dr, 0);
    if (!dr.battle.cancelled || shownIntent(dr.battle).kind !== 'doused') fail('雨灭没有浇掉点火');
    endTurn(douseMeta, dr);
    if (!dr.lastHit || dr.lastHit.n !== 0 || dr.lastHit.hit !== 0) fail('浇灭之后仍然掉了耐久');

    var campMeta = freshMeta();
    var cr = newRun(campMeta, 'balanced', 2);
    cr.phase = 'camp';
    cr.node = 2;
    cr.hp = 20;
    var deckLen = cr.deck.length;
    chooseCamp(cr, 'repair');
    chooseCamp(cr, 'delete');
    if (cr.campChoice !== 'delete' || cr.campCard != null) fail('营地可以同时选中两件');
    if (confirmCamp(campMeta, cr).ok) fail('没选牌也能确认删牌');
    chooseCamp(cr, 'repair');
    var campRes = confirmCamp(campMeta, cr);
    if (!campRes.ok || cr.hp !== 30 || cr.deck.length !== deckLen) fail('修车把删牌也带上了');
    if (cr.phase !== 'map') fail('营地确认后没有回到路线');

    var rainOrder = ['storm', 'douse', 'flask', 'wheel', 'shield', 'rain', 'lantern', 'veil', 'sail', 'wind', 'sun', 'torch'];
    var sunOrder = ['sail', 'torch', 'veil', 'wind', 'sun', 'shield', 'wheel', 'lantern', 'storm', 'douse', 'flask', 'rain'];
    var greedOrder = ['torch', 'wheel', 'sun', 'sail', 'veil', 'storm', 'lantern', 'shield', 'wind', 'rain', 'douse', 'flask'];

    function runSet(name, opts, seeds) {
      var wins = 0;
      var lost = null;
      seeds.forEach(function (seed) {
        var result = expedition({
          starter: opts.starter,
          seed: seed,
          act: opts.act,
          rewardOrder: opts.rewardOrder,
          skipReward: !!opts.skipReward,
          camp: opts.camp
        });
        if (result.phase === 'victory' && result.hp > 0) wins += 1;
        else if (!lost) lost = result;
      });
      lines.push(name + ' ' + wins + '/' + seeds.length);
      return { wins: wins, lost: lost, total: seeds.length };
    }

    var seeds = [1, 2, 3, 4, 5, 6, 7, 8];
    [1, 2, 3, 4].forEach(function (seed) {
      var metaT = freshMeta();
      var runT = newRun(metaT, 'balanced', seed);
      enterNode(metaT, runT);
      var guardT = 0;
      while (runT.phase === 'battle' && guardT < 40) {
        guardT += 1;
        var moveT = actTutor(runT);
        if (!moveT || moveT.type === 'end') endTurn(metaT, runT);
        else if (!playCard(metaT, runT, moveT.index).ok) endTurn(metaT, runT);
      }
      if (runT.phase !== 'reward') fail('教学关种子 ' + seed + ' 没有打过');
      else if (runT.hp < 24) fail('教学关掉耐久过多：' + runT.hp);
    });
    lines.push('教学 4/4');

    var rain = runSet('雨路', {
      starter: 'rain', act: actRain, rewardOrder: rainOrder,
      camp: function (meta, run) { campSmart(meta, run, 'rain'); }
    }, seeds);
    if (rain.wins < 7) fail('雨路赢面不够 ' + rain.wins + (rain.lost ? ' ' + rain.lost.log : ''));

    var rainBare = runSet('雨路跳过奖励', {
      starter: 'rain', act: actRain, rewardOrder: rainOrder, skipReward: true,
      camp: function (meta, run) { campSmart(meta, run, 'rain'); }
    }, seeds);
    if (rainBare.wins < 6) fail('不拿奖励时雨路走不通');

    var sun = runSet('晴风', {
      starter: 'sunwind', act: actSun, rewardOrder: sunOrder,
      camp: function (meta, run) { campSmart(meta, run, 'sun'); }
    }, seeds);
    if (sun.wins < 7) fail('晴风路赢面不够 ' + sun.wins + (sun.lost ? ' ' + sun.lost.log : ''));

    var sunBare = runSet('晴风跳过奖励', {
      starter: 'sunwind', act: actSun, rewardOrder: sunOrder, skipReward: true,
      camp: function (meta, run) { campSmart(meta, run, 'sun'); }
    }, seeds);
    if (sunBare.wins < 6) fail('不拿奖励时晴风路走不通');

    var greed = runSet('只打伤害', {
      starter: 'sunwind', act: actGreed, rewardOrder: greedOrder,
      camp: function (meta, run) {
        chooseCamp(run, 'repair');
        confirmCamp(meta, run);
      }
    }, seeds);
    if (greed.wins > 2) fail('不挡伤的打法也能稳定通关');

    if (TORCH_SUN >= BOSS_HP || STORM_DMG >= BOSS_HP) fail('单卡伤害可以清掉终点');

    var dieMeta = freshMeta();
    var dieRun = newRun(dieMeta, 'balanced', 6);
    dieRun.node = 1;
    enterNode(dieMeta, dieRun);
    dieRun.hp = 1;
    dieRun.battle.block = 0;
    dieRun.battle.patternAt = 0;
    endTurn(dieMeta, dieRun);
    if (dieRun.phase !== 'defeat') fail('耐久归零没有进入失败');
    var gallery = dieMeta.gallery.slice();
    var again = newRun(dieMeta, 'balanced', 6);
    if (JSON.stringify(again.deck) !== JSON.stringify(STARTERS.balanced)) fail('失败后牌组被永久加攻');
    if (dieMeta.gallery.length < gallery.length) fail('失败后图鉴被清掉');

    var audio = (typeof STORM_AUDIO !== 'undefined') ? STORM_AUDIO : (global.STORM_AUDIO || null);
    if (!audio && typeof require === 'function') {
      try { require('./audio.js'); } catch (err) { audio = null; }
      audio = global.STORM_AUDIO || audio;
    }
    if (audio) {
      lines.push('音乐 ' + audio.seconds.toFixed(1) + ' 秒 / ' + audio.phrases + ' 乐句');
      if (audio.seconds < 60) fail('音乐短于 60 秒');
      if (audio.phrasePrint(0) === audio.phrasePrint(2) || audio.phrasePrint(1) === audio.phrasePrint(3)) fail('乐句没有变化');
    } else {
      fail('没有读到音乐');
    }

    if (rain.lost && rain.wins < 7) lines.push(rain.lost.trace.join(' | '));
    if (sun.lost && sun.wins < 7) lines.push(sun.lost.trace.join(' | '));
    return { ok: failures.length === 0, failures: failures, lines: lines };
  }

  function opening(seed) {
    var meta = freshMeta();
    var run = newRun(meta, 'balanced', seed);
    enterNode(meta, run);
    return { hand: run.battle.hand.slice(), draw: run.battle.draw.slice() };
  }

  var api = {
    SAVE_KEY: SAVE_KEY,
    CARDS: CARDS,
    NODES: NODES,
    STARTERS: STARTERS,
    selfCheck: selfCheck,
    newRun: newRun,
    shownIntent: shownIntent
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.STORMTREK = api;

  if (typeof document === 'undefined') {
    if (typeof module !== 'undefined' && require.main === module) {
      var report = selfCheck();
      console.log(report.lines.join('\n'));
      if (!report.ok) {
        console.log(report.failures.join('\n'));
        process.exit(1);
      }
      console.log('self-check ok');
    }
    return;
  }

  var save = null;
  var selected = -1;
  var pointer = null;
  var suppressClick = false;
  var endBusy = false;

  function noteCoach(step) {
    if (!save.meta) return;
    if ((save.meta.coach || 0) < step) save.meta.coach = step;
  }

  function releaseEndLock(btn) {
    setTimeout(function () {
      endBusy = false;
      if (btn) btn.disabled = false;
    }, 400);
  }
  var codexReturn = 'cover';
  var sprites = [];
  var coverVideoScale = 0.45;
  var REDUCE = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var sheetSrc = {};

  function $(id) { return document.getElementById(id); }

  function syncLand() {
    document.documentElement.classList.toggle('land', window.innerWidth > window.innerHeight);
  }

  function createSave() {
    return { v: 1, music: true, meta: freshMeta(), run: null };
  }

  function loadSave() {
    try {
      var raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return createSave();
      var data = JSON.parse(raw);
      if (!data || data.v !== 1 || !data.meta) return createSave();
      if (!data.meta.starters) data.meta.starters = ['balanced'];
      if (!data.meta.gallery) data.meta.gallery = [];
      return data;
    } catch (err) {
      return createSave();
    }
  }

  function persist() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (err) {}
  }

  function armImages(id) {
    var root = document.getElementById(id);
    if (!root) return;
    root.querySelectorAll('img[data-src]').forEach(function (img) {
      if (!img.getAttribute('src')) img.src = img.getAttribute('data-src');
    });
  }

  function show(id) {
    armImages(id);
    document.querySelectorAll('.screen').forEach(function (el) {
      if (el.id === 'modal-deck') return;
      el.hidden = el.id !== id;
    });
    document.body.setAttribute('data-screen', id);
  }

  function syncMusic() {
    var on = save.music !== false;
    document.querySelectorAll('[data-music]').forEach(function (b) {
      b.textContent = on ? '乐' : '静';
      b.classList.toggle('off', !on);
      b.setAttribute('aria-label', on ? '关闭音乐' : '打开音乐');
    });
  }

  function cardSrc(id) { return 'assets/cards/b06-card-' + id + '.png'; }

  function hpMarkup(ratio, low, label) {
    var r = Math.max(0, Math.min(1, ratio));
    var src = low ? 'assets/ui/b06-ui-hp-fill-low.png' : 'assets/ui/b06-ui-hp-fill.png';
    return '<div class="hpbar" style="--r:' + r + '"><img class="hp-fill" alt="" src="' + src + '"><img class="hp-frame" alt="" src="assets/ui/b06-ui-hp-frame.png"><span class="hp-label">' + label + '</span></div>';
  }

  function begin(starter) {
    var seed = (Date.now() ^ ((Math.random() * 0x100000000) >>> 0)) >>> 0;
    if (!seed) seed = 1;
    save.run = newRun(save.meta, starter, seed);
    save.meta.coach = 0;
    $('starter-pick').hidden = true;
    $('result-starters').hidden = true;
    persist();
    render();
  }

  function retrySeed() {
    var seed = (save.run && save.run.seed) || save.meta.lastSeed || 1;
    var starter = (save.run && save.run.starter) || save.meta.lastStarter || 'balanced';
    save.run = newRun(save.meta, starter, seed);
    save.meta.coach = 0;
    persist();
    render();
  }

  function render() {
    syncLand();
    syncMusic();
    var run = save.run;
    if (!run) { show('screen-cover'); renderCover(); return; }
    if (run.phase === 'map') { show('screen-map'); renderMap(); return; }
    if (run.phase === 'battle') { show('screen-battle'); renderBattle(); return; }
    if (run.phase === 'reward') { show('screen-reward'); renderReward(); return; }
    if (run.phase === 'camp') { show('screen-camp'); renderCamp(); return; }
    if (run.phase === 'victory' || run.phase === 'defeat') { show('screen-result'); renderResult(); return; }
    show('screen-cover');
    renderCover();
  }

  function renderCover() {
    var actions = $('cover-actions');
    var run = save.run;
    var mid = run && (run.phase === 'map' || run.phase === 'battle' || run.phase === 'reward' || run.phase === 'camp');
    actions.innerHTML = '';
    function add(label, cls, fn) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = cls;
      b.textContent = label;
      b.addEventListener('click', fn);
      actions.appendChild(b);
    }
    if (mid) add('继续远征', 'btn-gold', function () { render(); });
    add(mid ? '新的一程' : '开始远征', mid ? 'btn' : 'btn-gold', function () { openStarter('cover'); });
    add('图鉴', 'btn', function () {
      codexReturn = 'cover';
      show('screen-codex');
      renderCodex();
    });
  }

  function openStarter(where) {
    var list = (save.meta && save.meta.starters) || ['balanced'];
    var mid = save.run && (save.run.phase === 'map' || save.run.phase === 'battle' || save.run.phase === 'reward' || save.run.phase === 'camp' || save.run.phase === 'victory' || save.run.phase === 'defeat');
    if (list.length === 1 && !mid) { begin(list[0]); return; }
    var host = $(where === 'result' ? 'result-starters' : 'starter-pick');
    host.hidden = false;
    host.innerHTML = '';
    list.forEach(function (id) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn';
      b.innerHTML = '<strong>' + STARTER_NAME[id] + '</strong><span class="muted">' + STARTER_BLURB[id] + '</span>';
      b.addEventListener('click', function () { begin(id); });
      host.appendChild(b);
    });
  }

  function renderMap() {
    var run = save.run;
    var node = NODES[run.node];
    $('map-seed').textContent = '种子 ' + (run.seed >>> 0).toString(16).toUpperCase() + ' · ' + STARTER_NAME[run.starter];
    var ratio = run.hp / run.maxHp;
    $('map-hp').innerHTML = hpMarkup(ratio, ratio <= 0.3, '商队 ' + run.hp + '／' + run.maxHp);
    $('map-log').textContent = (node ? node.title + '。' : '') + (run.log || '');
    var box = $('map-nodes');
    box.innerHTML = '';
    NODES.forEach(function (n, i) {
      var el = document.createElement('div');
      el.className = 'node' + (i === run.node ? ' is-current' : '') + (i < run.node ? ' is-cleared' : '');
      var icon = 'b06-ui-node-empty.png';
      if (i < run.node) icon = 'b06-ui-node-cleared.png';
      else if (i === run.node) icon = 'b06-ui-node-current.png';
      else if (n.type === 'camp') icon = 'b06-ui-node-camp.png';
      else if (n.goal) icon = 'b06-ui-node-goal.png';
      else icon = 'b06-ui-node-battle.png';
      el.innerHTML = '<img alt="" src="assets/ui/' + icon + '"><span>' + n.title + '</span>';
      box.appendChild(el);
    });
    $('btn-enter').textContent = node && node.type === 'camp' ? '进入营地' : '进入遭遇';
  }

  function paintAtmosphere(battle) {
    var land = document.documentElement.classList.contains('land');
    var orient = land ? '1920x1080' : '1080x1920';
    var bg = battle.stormy
      ? 'assets/bg/b06-bg-' + orient + '.webp'
      : 'assets/bg/b06-bg-' + battle.climate + '-' + orient + '.webp';
    var ovKey = battle.stormy ? 'rain' : battle.climate;
    var ov = 'assets/overlays/b06-overlay-' + ovKey + '-' + orient + '.png';
    if ($('battle-bg').getAttribute('src') !== bg) $('battle-bg').src = bg;
    if ($('battle-overlay').getAttribute('src') !== ov) $('battle-overlay').src = ov;
  }

  function paintIntent(intent, preview) {
    var kind = intent.kind === 'doused' ? 'guard' : intent.kind;
    var src = 'assets/ui/b06-ui-intent-' + kind + '-preview.png';
    if ($('intent-icon').getAttribute('src') !== src) $('intent-icon').src = src;
    $('intent-num').textContent = String(intent.n);
    $('intent-name').textContent = INTENT_NAME[intent.kind] || '意图';
    $('intent-zone').classList.toggle('is-previewing', !!preview);
  }

  function paintSlots(previewClimate) {
    var cur = save.run && save.run.battle ? save.run.battle.climate : '';
    ['sun', 'rain', 'wind'].forEach(function (id) {
      var slot = document.querySelector('.slot[data-slot="' + id + '"]');
      if (!slot.querySelector('img')) {
        slot.innerHTML = '<img alt="" src="assets/ui/b06-ui-weather-' + id + '.png">';
      }
      slot.classList.toggle('on', id === cur);
      slot.classList.toggle('preview', !!previewClimate && previewClimate === id && previewClimate !== cur);
    });
  }

  function paintUnits(battle) {
    var layer = $('units');
    layer.innerHTML = '';
    var w = window.innerWidth;
    var h = window.innerHeight;
    var land = w > h;
    var footY = (land ? 0.72 : 0.538) * h;
    var sc = h / (land ? 900 : 844);
    function put(id, xFrac, canvasH) {
      var spec = UNITS[id];
      var img = document.createElement('img');
      img.className = 'unit';
      img.alt = '';
      img.src = 'assets/units/' + spec.file;
      var ch = canvasH * sc;
      var s = ch / spec.h;
      img.style.width = (spec.w * s) + 'px';
      img.style.height = ch + 'px';
      img.style.left = (xFrac * w - spec.ax * s) + 'px';
      img.style.top = (footY - spec.ay * s) + 'px';
      layer.appendChild(img);
      return { x: xFrac * w, y: footY };
    }
    if (w < 520) {
      put('walker-a', 0.14, 150);
      put('wagon', 0.28, 92);
      put('walker-c', 0.44, 146);
    } else if (land) {
      put('walker-a', 0.07, 200);
      put('wagon', 0.16, 124);
      put('walker-b', 0.24, 190);
      put('camel', 0.32, 140);
      put('walker-c', 0.38, 188);
    } else {
      put('walker-a', 0.10, 200);
      put('wagon', 0.22, 124);
      put('walker-b', 0.32, 190);
      put('camel', 0.42, 146);
      put('walker-c', 0.50, 186);
    }
    var enemyArt = { wolf: 'enemy-rockwolf', scorpion: 'enemy-scorpion', raider: 'enemy-raider', boss: 'enemy-rockwolf' }[battle.enemyId];
    var eh = battle.enemyId === 'raider' ? 200 : (battle.enemyId === 'boss' ? 176 : 150);
    var foot = put(enemyArt, land ? 0.58 : 0.78, eh);
    var ratio = battle.enemyMax ? battle.enemyHp / battle.enemyMax : 0;
    $('enemy-plate').style.left = foot.x + 'px';
    $('enemy-plate').style.top = (foot.y - 4) + 'px';
    $('enemy-plate').innerHTML = '<p class="who">' + ENEMY_NAME[battle.enemyId] + '</p>' + hpMarkup(ratio, ratio <= 0.3, battle.enemyHp + '／' + battle.enemyMax);
  }

  function renderHand(battle) {
    var zone = $('hand');
    zone.innerHTML = '';
    var n = battle.hand.length;
    if (!n) return;
    var zoneW = zone.clientWidth || 320;
    var zoneH = zone.clientHeight || 160;
    var overlap = n > 5 ? 0.42 : 0.28;
    var cardW = zoneW / (1 + (1 - overlap) * (n - 1));
    var cardH = cardW * (1024 / 768);
    if (cardH > zoneH * 0.98) {
      cardH = zoneH * 0.98;
      cardW = cardH * (768 / 1024);
    }
    var pitch = n === 1 ? 0 : Math.min(cardW * (1 - overlap), (zoneW - cardW) / (n - 1));
    var total = cardW + pitch * (n - 1);
    var start = Math.max(0, (zoneW - total) / 2);
    battle.hand.forEach(function (id, i) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'card';
      btn.dataset.index = String(i);
      if (i === selected) btn.classList.add('is-selected');
      if (battle.tutorial && battle.turn === 1 && id === 'wheel' && selected < 0) btn.classList.add('is-hint');
      btn.style.width = cardW + 'px';
      btn.style.height = cardH + 'px';
      btn.style.left = (start + i * pitch) + 'px';
      btn.style.top = Math.max(0, (zoneH - cardH) / 2) + 'px';
      btn.style.zIndex = String(i + 1);
      btn.innerHTML = '<img alt="' + CARDS[id].name + '" src="' + cardSrc(id) + '"><span class="cost">' + CARDS[id].cost + '</span><span class="now">' + nowNumber(id, battle) + '</span>';
      btn.addEventListener('pointerdown', onCardDown);
      zone.appendChild(btn);
    });
  }

  function renderBattle() {
    var run = save.run;
    var b = run.battle;
    if (!b) return;
    if (selected >= b.hand.length) selected = -1;
    paintAtmosphere(b);
    var intent = shownIntent(b);
    paintIntent(intent, false);
    var ratio = run.hp / run.maxHp;
    var hpText = run.hp + '／' + run.maxHp + (b.block ? ' · 盾' + b.block : '');
    $('hp-zone').innerHTML = hpMarkup(ratio, ratio <= 0.3, hpText);
    var climate = CLIMATE_NAME[b.climate] + (b.thin ? ' · 薄云' : '') + (b.stormy ? ' · 雷暴' : '');
    $('weather-badge').innerHTML = '<img alt="" src="assets/ui/b06-ui-weather-' + b.climate + '.png"><div class="badge-copy"><strong>' + climate + '</strong></div>';
    paintSlots(null);
    paintUnits(b);
    renderHand(b);
    var pips = '';
    for (var i = 0; i < 3; i++) pips += '<i class="' + (i < b.ap ? 'on' : '') + '"></i>';
    $('piles').innerHTML = '行动 <span class="pips">' + pips + '</span><br>牌库 ' + b.draw.length + ' · 弃牌 ' + b.discard.length;
    var coachStep = (save.meta && save.meta.coach) || 0;
    var coach = '';
    if (b.tutorial) {
      var lines = [
        '右上角是岩狼的下一步。天气一变，数字会一起变。',
        '点开一张牌，可以读费用和效果。',
        '按住牌拖到目标上再松开。天气牌拖到气候轨，攻击牌拖到敌人身上。',
        '出完想出的牌，点结束回合。没用掉的牌会进入弃牌堆。'
      ];
      if (coachStep < lines.length) coach = lines[coachStep];
      if (b.turn >= 3 && b.enemyHp === b.enemyMax) coach = '车轮可以拖到岩狼身上。';
    }
    var openingLog = b.tutorial && coachStep === 0 && !!(run.log && run.log.indexOf('右上角是岩狼') === 0);
    $('battle-log').hidden = !run.log || openingLog;
    $('battle-log').textContent = run.log || '';
    $('coach').hidden = !coach;
    $('coach').textContent = coach;
    var inspect = $('inspect');
    if (selected >= 0 && b.hand[selected]) {
      var id = b.hand[selected];
      var card = CARDS[id];
      inspect.hidden = false;
      inspect.innerHTML = '<strong>' + card.name + ' · 费用 ' + card.cost + '</strong><p>' + card.rule + '</p><p>' + card.drag + '</p>';
      if (card.target === 'weather') {
        $('preview-banner').hidden = false;
        $('preview-banner').textContent = previewSentence(b, id);
        paintIntent(intentIf(b, card.climate, !!card.thin), true);
        paintSlots(card.climate);
      } else {
        $('preview-banner').hidden = true;
      }
    } else {
      inspect.hidden = true;
      $('preview-banner').hidden = true;
    }
    clearTargets();
  }

  function renderReward() {
    var run = save.run;
    var row = $('reward-row');
    row.innerHTML = '';
    (run.reward || []).forEach(function (id, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'reward-card' + (run.rewardPick === i ? ' is-on' : '');
      b.innerHTML = '<img alt="' + CARDS[id].name + '" src="' + cardSrc(id) + '"><span>' + CARDS[id].name + ' · ' + CARDS[id].cost + '</span>';
      b.addEventListener('click', function () {
        run.rewardPick = i;
        persist();
        renderReward();
      });
      row.appendChild(b);
    });
    var id = run.rewardPick != null ? run.reward[run.rewardPick] : null;
    $('reward-copy').textContent = id ? (CARDS[id].name + '。' + CARDS[id].rule) : '点一张牌读效果，再决定带不带走。';
    $('btn-take').disabled = run.rewardPick == null;
    if (!run.fxPlayed) {
      run.fxPlayed = true;
      playFx('reward', row);
    }
  }

  function renderCamp() {
    var run = save.run;
    var choice = run.campChoice;
    $('camp-repair').classList.toggle('is-on', choice === 'repair');
    $('camp-repair').classList.toggle('is-off', choice === 'delete');
    $('camp-delete').classList.toggle('is-on', choice === 'delete');
    $('camp-delete').classList.toggle('is-off', choice === 'repair');
    $('camp-log').textContent = run.log || '可以修车，或从牌组移出一张。两件不能一起确认。';
    var deck = $('camp-deck');
    deck.innerHTML = '';
    if (choice === 'delete') {
      run.deck.forEach(function (id, i) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'mini-card' + (run.campCard === i ? ' is-on' : '');
        b.innerHTML = '<img alt="' + CARDS[id].name + '" src="' + cardSrc(id) + '"><span>' + CARDS[id].name + '</span>';
        b.addEventListener('click', function () {
          run.campCard = i;
          renderCamp();
        });
        deck.appendChild(b);
      });
    }
    var ready = choice === 'repair' || (choice === 'delete' && run.campCard != null);
    $('btn-camp-ok').disabled = !ready;
  }

  function renderResult() {
    var run = save.run;
    var win = run.phase === 'victory';
    $('result-kicker').textContent = win ? '终点' : '这一程停下了';
    $('result-title').textContent = win ? '远征完成' : '商队没能穿过风暴';
    $('result-copy').textContent = win
      ? '商队穿过了终点。图鉴留在这台设备上。下一程仍从起始牌组出发，攻击不会越积越高。'
      : '耐久耗尽。图鉴已经记下。攻击不会永久变高，可以同一种子再走，也可以换一套起始牌。';
    $('result-starters').hidden = true;
  }

  function renderCodex() {
    var grid = $('codex-grid');
    grid.innerHTML = '';
    var known = {};
    (save.meta.gallery || []).forEach(function (id) { known[id] = true; });
    CARD_ORDER.forEach(function (id) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'codex-card' + (known[id] ? '' : ' locked');
      if (known[id]) {
        b.innerHTML = '<img alt="' + CARDS[id].name + '" src="' + cardSrc(id) + '"><span>' + CARDS[id].name + '</span>';
        b.addEventListener('click', function () {
          $('codex-copy').textContent = CARDS[id].name + '。费用 ' + CARDS[id].cost + '。' + CARDS[id].rule;
        });
      } else {
        b.innerHTML = '<img alt="" src="assets/cards/b06-card-back.png"><span>未遇见</span>';
      }
      grid.appendChild(b);
    });
  }

  function openDeck() {
    var run = save.run;
    if (!run) return;
    var list = $('deck-list');
    list.innerHTML = '';
    var have = counts(run.deck);
    CARD_ORDER.forEach(function (id) {
      if (!have[id]) return;
      var el = document.createElement('div');
      el.className = 'mini-card';
      el.innerHTML = '<img alt="' + CARDS[id].name + '" src="' + cardSrc(id) + '"><span>' + CARDS[id].name + ' × ' + have[id] + '</span>';
      list.appendChild(el);
    });
    $('modal-deck').hidden = false;
  }

  function clearTargets() {
    $('enemy-hit').classList.remove('ready');
    $('caravan-hit').classList.remove('ready');
    $('track').classList.remove('track-ready');
  }

  function zoneAt(x, y) {
    function inside(id) {
      var el = $(id);
      var r = el.getBoundingClientRect();
      return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    }
    if (inside('track')) return 'weather';
    if (inside('enemy-hit')) return 'enemy';
    if (inside('caravan-hit')) return 'caravan';
    return null;
  }

  function onCardDown(e) {
    if (!save.run || save.run.phase !== 'battle' || pointer) return;
    var index = Number(e.currentTarget.dataset.index);
    pointer = {
      index: index,
      id: save.run.battle.hand[index],
      sx: e.clientX,
      sy: e.clientY,
      x: e.clientX,
      y: e.clientY,
      moved: false,
      ghost: null
    };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  }

  function onPointerMove(e) {
    if (!pointer) return;
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    if (!pointer.moved && Math.hypot(e.clientX - pointer.sx, e.clientY - pointer.sy) > 10) {
      pointer.moved = true;
      var img = document.createElement('img');
      img.className = 'drag-ghost';
      img.alt = '';
      img.src = cardSrc(pointer.id);
      img.style.width = '96px';
      document.body.appendChild(img);
      pointer.ghost = img;
      var card = document.querySelector('.card[data-index="' + pointer.index + '"]');
      if (card) card.classList.add('is-dim');
      var need = CARDS[pointer.id].target;
      $('enemy-hit').classList.toggle('ready', need === 'enemy');
      $('caravan-hit').classList.toggle('ready', need === 'caravan');
      $('track').classList.toggle('track-ready', need === 'weather');
    }
    if (pointer.ghost) {
      pointer.ghost.style.left = pointer.x + 'px';
      pointer.ghost.style.top = pointer.y + 'px';
    }
    if (pointer.moved && CARDS[pointer.id].target === 'weather') {
      $('preview-banner').hidden = false;
      $('preview-banner').textContent = previewSentence(save.run.battle, pointer.id);
      var card = CARDS[pointer.id];
      paintIntent(intentIf(save.run.battle, card.climate, !!card.thin), true);
      paintSlots(card.climate);
    }
  }

  function onPointerUp() {
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    if (!pointer) return;
    var p = pointer;
    pointer = null;
    if (p.ghost) p.ghost.remove();
    clearTargets();
    if (!p.moved) {
      selected = selected === p.index ? -1 : p.index;
      if (selected >= 0) noteCoach(2);
      renderBattle();
      return;
    }
    suppressClick = true;
    setTimeout(function () { suppressClick = false; }, 0);
    var zone = zoneAt(p.x, p.y);
    var need = CARDS[p.id].target;
    if (zone === need) {
      var res = playCard(save.meta, save.run, p.index);
      if (!res.ok) {
        save.run.log = res.reason;
        renderBattle();
        return;
      }
      selected = -1;
      noteCoach(3);
      persist();
      render();
      juice(res);
      return;
    }
    save.run.log = need === 'weather' ? '天气牌要拖到气候轨上。' : (need === 'enemy' ? '这张牌要拖到敌人身上。' : '这张牌要拖到商队身上。');
    renderBattle();
  }

  function tryPlaySelected(target) {
    if (suppressClick || selected < 0 || !save.run || !save.run.battle) return;
    var id = save.run.battle.hand[selected];
    if (!id || CARDS[id].target !== target) return;
    var res = playCard(save.meta, save.run, selected);
    if (!res.ok) {
      save.run.log = res.reason;
      renderBattle();
      return;
    }
    selected = -1;
    noteCoach(3);
    persist();
    render();
    juice(res);
  }

  function juice(res) {
    if (!res || !res.fx) {
      if (res && res.playerDmg) floatText('－' + res.playerDmg, $('hp-zone'), true);
      return;
    }
    if (res.fx.weather) playFx('weather', $('track'));
    if (res.fx.enemy) {
      playFx('reward', $('enemy-hit'));
      if (res.fx.amount) floatText('－' + res.fx.amount, $('enemy-plate'), false);
    }
    if (res.playerDmg) floatText('－' + res.playerDmg, $('hp-zone'), true);
  }

  function playFx(kind, el) {
    if (REDUCE || !el) return;
    var rect = el.getBoundingClientRect();
    var img = document.createElement('img');
    img.className = 'fx';
    img.alt = '';
    img.style.left = (rect.left + rect.width / 2) + 'px';
    img.style.top = (rect.top + rect.height / 2) + 'px';
    var frame = 1;
    img.src = 'assets/fx/b06-fx-' + kind + '-' + frame + '.png';
    document.body.appendChild(img);
    var timer = setInterval(function () {
      frame += 1;
      if (frame > 8) { clearInterval(timer); img.remove(); return; }
      img.src = 'assets/fx/b06-fx-' + kind + '-' + frame + '.png';
    }, 100);
  }

  function floatText(text, el, hurt) {
    if (!el) return;
    var rect = el.getBoundingClientRect();
    var d = document.createElement('div');
    d.className = 'floater' + (hurt ? ' hurt' : '');
    d.textContent = text;
    d.style.left = (rect.left + rect.width / 2) + 'px';
    d.style.top = (rect.top + 4) + 'px';
    document.body.appendChild(d);
    setTimeout(function () { d.remove(); }, 800);
  }

  function placeCoverAnchor() {
    var stage = $('cover-stage');
    if (!stage || stage.offsetParent === null && $('screen-cover').hidden) return;
    var rect = stage.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    var land = rect.width > rect.height;
    var cover = land ? COVERS.landscape : COVERS.portrait;
    var s = Math.max(rect.width / cover.imgW, rect.height / cover.imgH);
    var drawnW = cover.imgW * s;
    var drawnH = cover.imgH * s;
    var ox = (rect.width - drawnW) / 2;
    var oy = (rect.height - drawnH) / 2;
    var per = cover.bbox.w / ANIMS['flame-sway'].fw;
    coverVideoScale = per * s;
    var ax = cover.bbox.x + ANIMS['flame-sway'].ax * per;
    var ay = cover.bbox.y + ANIMS['flame-sway'].ay * per;
    var host = $('cover-anchor');
    host.style.left = (ox + ax * s) + 'px';
    host.style.top = (oy + ay * s) + 'px';
    var next = land ? 'assets/cover/b06-cover-bg-16x9.webp' : 'assets/cover/b06-cover-bg-3x4.webp';
    var img = $('cover-bg');
    if (img.getAttribute('src') !== next) img.src = next;
  }

  function drawSprite(sp) {
    if (sp.host.offsetParent === null) return;
    var a = ANIMS[sp.anim];
    var scale = sp.scale();
    if (!scale) return;
    var w = a.fw * scale;
    var h = a.fh * scale;
    sp.sheet.style.width = w + 'px';
    sp.sheet.style.height = h + 'px';
    sp.sheet.style.left = (-a.ax * scale) + 'px';
    sp.sheet.style.top = (-a.ay * scale) + 'px';
    if (sp.hit) {
      sp.hit.style.width = (170 * scale) + 'px';
      sp.hit.style.height = (210 * scale) + 'px';
      sp.hit.style.left = (-85 * scale) + 'px';
      sp.hit.style.top = (-100 * scale) + 'px';
    }
    var src = REDUCE ? a.still : (sheetSrc[sp.anim] || a.sheet);
    sp.sheet.style.backgroundImage = 'url("' + src + '")';
    if (REDUCE || src === a.still) {
      sp.sheet.style.backgroundSize = w + 'px ' + h + 'px';
      sp.sheet.style.backgroundPosition = '0 0';
      return;
    }
    var col = sp.frame % a.cols;
    var row = Math.floor(sp.frame / a.cols);
    sp.sheet.style.backgroundSize = (w * a.cols) + 'px ' + (h * a.rows) + 'px';
    sp.sheet.style.backgroundPosition = (-col * w) + 'px ' + (-row * h) + 'px';
  }

  function mountSprite(host, scaleFn) {
    if (!host || host.dataset.ready) return;
    host.dataset.ready = '1';
    var sheet = document.createElement('div');
    sheet.className = 'sprite-sheet';
    sheet.setAttribute('role', 'img');
    sheet.setAttribute('aria-label', '风灯');
    var hit = document.createElement('div');
    hit.className = 'sprite-hit';
    hit.setAttribute('aria-label', '风灯');
    host.appendChild(sheet);
    host.appendChild(hit);
    var sp = { host: host, sheet: sheet, hit: hit, scale: scaleFn, anim: 'flame-sway', frame: 0, acc: 0, lock: null, hover: false };
    function use(name) {
      if (sp.anim === name && !sp.lock) return;
      sp.anim = name;
      sp.frame = 0;
      sp.acc = 0;
    }
    hit.addEventListener('pointerenter', function () {
      sp.hover = true;
      if (!sp.lock) use('card-raise');
    });
    hit.addEventListener('pointerleave', function () {
      sp.hover = false;
      if (!sp.lock) use('flame-sway');
    });
    hit.addEventListener('pointerdown', function (e) {
      e.stopPropagation();
      sp.lock = 'wind-brush';
      use('wind-brush');
    });
    sprites.push(sp);
    var probe = new Image();
    probe.onload = function () { sheetSrc['flame-sway'] = ANIMS['flame-sway'].sheet; };
    probe.onerror = function () { sheetSrc['flame-sway'] = ANIMS['flame-sway'].still; };
    probe.src = ANIMS['flame-sway'].sheet;
  }

  var lastFrame = 0;
  function frame(now) {
    if (!lastFrame) lastFrame = now;
    var dt = now - lastFrame;
    lastFrame = now;
    if (!$('screen-cover').hidden) placeCoverAnchor();
    sprites.forEach(function (sp) {
      var a = ANIMS[sp.anim];
      if (!REDUCE) {
        sp.acc += dt;
        var spf = 1000 / a.fps;
        while (sp.acc >= spf) {
          sp.acc -= spf;
          sp.frame = (sp.frame + 1) % a.n;
          if (sp.lock && sp.frame === 0) {
            sp.lock = null;
            sp.anim = sp.hover ? 'card-raise' : 'flame-sway';
          }
        }
      }
      drawSprite(sp);
    });
    requestAnimationFrame(frame);
  }

  function bind() {
    document.querySelectorAll('[data-music]').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        save.music = STORM_AUDIO.toggle();
        persist();
        syncMusic();
      });
    });
    document.addEventListener('pointerdown', function (e) {
      if (e.target.closest && e.target.closest('[data-music]')) return;
      STORM_AUDIO.arm();
    }, true);
    document.addEventListener('visibilitychange', function () {
      STORM_AUDIO.visibility(document.hidden);
    });
    window.addEventListener('resize', function () {
      syncLand();
      if (pointer) return;
      if (save.run && save.run.phase === 'battle') renderBattle();
    });
    $('btn-enter').addEventListener('click', function () {
      enterNode(save.meta, save.run);
      persist();
      render();
    });
    $('btn-end').addEventListener('click', function () {
      if (endBusy) return;
      if (!save.run || save.run.phase !== 'battle') return;
      endBusy = true;
      var btn = $('btn-end');
      btn.disabled = true;
      var preview = shownIntent(save.run.battle);
      var res = endTurn(save.meta, save.run);
      if (res.ok && res.playerDmg == null && preview && save.run.lastHit && save.run.lastHit.n !== preview.n && save.run.phase === 'battle') {
        save.run.log = '预告和结算没有对上。';
      }
      selected = -1;
      noteCoach(4);
      persist();
      render();
      juice(res);
      releaseEndLock(btn);
    });
    $('enemy-hit').addEventListener('click', function () { tryPlaySelected('enemy'); });
    $('caravan-hit').addEventListener('click', function () { tryPlaySelected('caravan'); });
    $('track').addEventListener('click', function () { tryPlaySelected('weather'); });
    $('btn-take').addEventListener('click', function () {
      var res = takeReward(save.meta, save.run, save.run.rewardPick);
      if (!res.ok) return;
      persist();
      render();
    });
    $('btn-skip').addEventListener('click', function () {
      takeReward(save.meta, save.run, -1);
      persist();
      render();
    });
    $('camp-repair').addEventListener('click', function () {
      chooseCamp(save.run, 'repair');
      renderCamp();
    });
    $('camp-delete').addEventListener('click', function () {
      chooseCamp(save.run, 'delete');
      renderCamp();
    });
    $('btn-camp-ok').addEventListener('click', function () {
      var res = confirmCamp(save.meta, save.run);
      if (!res.ok) { save.run.log = res.reason; renderCamp(); return; }
      persist();
      render();
    });
    $('btn-map-cover').addEventListener('click', function () {
      show('screen-cover');
      renderCover();
    });
    $('btn-deck').addEventListener('click', openDeck);
    $('btn-deck-close').addEventListener('click', function () { $('modal-deck').hidden = true; });
    $('btn-map-codex').addEventListener('click', function () {
      codexReturn = 'map';
      show('screen-codex');
      renderCodex();
    });
    $('btn-result-codex').addEventListener('click', function () {
      codexReturn = 'result';
      show('screen-codex');
      renderCodex();
    });
    $('btn-codex-back').addEventListener('click', function () {
      if (codexReturn === 'map') { show('screen-map'); renderMap(); }
      else if (codexReturn === 'result') { show('screen-result'); renderResult(); }
      else { show('screen-cover'); renderCover(); }
    });
    $('btn-retry-seed').addEventListener('click', retrySeed);
    $('btn-new-run').addEventListener('click', function () { openStarter('result'); });
    window.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        $('modal-deck').hidden = true;
        selected = -1;
        if (save.run && save.run.phase === 'battle') renderBattle();
      }
    });
  }

  function setupShot(mode) {
    if (mode === 'battle' || mode === 'reward' || mode === 'camp' || mode === 'map') {
      save.run = newRun(save.meta, 'balanced', 7);
      if (mode !== 'map') {
        enterNode(save.meta, save.run);
      }
      if (mode === 'reward') {
        save.run.battle.enemyHp = 0;
        winBattle(save.meta, save.run, ['教学结束。']);
      }
      if (mode === 'camp') {
        save.run.phase = 'map';
        save.run.node = 2;
        enterNode(save.meta, save.run);
      }
    }
    render();
  }

  var testErrors = [];
  window.addEventListener('error', function (ev) {
    if (ev.target && ev.target !== window && ev.target.src) testErrors.push(ev.target.src);
    else if (ev.message) testErrors.push(String(ev.message));
  }, true);

  function boot() {
    syncLand();
    save = loadSave();
    bind();
    mountSprite($('cover-anchor'), function () { return coverVideoScale; });
    mountSprite($('result-anchor'), function () {
      var box = $('result-box');
      var h = box && box.clientHeight ? box.clientHeight : 220;
      return (h * 0.86) / ANIMS['flame-sway'].fh;
    });
    STORM_AUDIO.setWanted(save.music !== false);
    var q = new URLSearchParams(location.search);
    if (q.get('shot')) setupShot(q.get('shot'));
    else render();
    syncMusic();
    if (q.get('autotest') === '1') setTimeout(startAutotest, 40);
    if (q.get('autotest') === 'resume') setTimeout(resumeAutotest, 40);
    requestAnimationFrame(frame);
  }

  function startAutotest() {
    var out = $('autotest');
    out.hidden = false;
    try {
      var report = selfCheck();
      if (!report.ok) {
        out.textContent = 'FAIL ' + report.failures.join('；');
        return;
      }
      localStorage.removeItem(SAVE_KEY);
      save = createSave();
      save.run = newRun(save.meta, 'balanced', 7);
      enterNode(save.meta, save.run);
      var before = save.run.battle.enemyHp;
      render();
      requestAnimationFrame(function () {
        var card = document.querySelector('.card');
        var wheel = null;
        document.querySelectorAll('.card').forEach(function (el) {
          if (el.querySelector('img') && el.querySelector('img').alt === '车轮') wheel = el;
        });
        card = wheel || card;
        var enemy = $('enemy-hit');
        var a = card.getBoundingClientRect();
        var b = enemy.getBoundingClientRect();
        var sx = a.left + a.width / 2;
        var sy = a.top + a.height / 2;
        var tx = b.left + b.width / 2;
        var ty = b.top + b.height / 2;
        function fire(type, x, y) {
          card.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 1, pointerType: 'mouse' }));
        }
        fire('pointerdown', sx, sy);
        window.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: tx, clientY: ty, pointerId: 1, pointerType: 'mouse' }));
        window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: tx, clientY: ty, pointerId: 1, pointerType: 'mouse' }));
        if (!save.run.battle || save.run.battle.enemyHp >= before) {
          out.textContent = 'FAIL 拖拽没有造成伤害';
          return;
        }
        var snap = JSON.stringify({
          hp: save.run.hp,
          enemy: save.run.battle.enemyHp,
          hand: save.run.battle.hand,
          draw: save.run.battle.draw,
          discard: save.run.battle.discard,
          climate: save.run.battle.climate,
          ap: save.run.battle.ap,
          seed: save.run.seed
        });
        sessionStorage.setItem('stormtrek_snap', snap);
        persist();
        sessionStorage.setItem('stormtrek_autotest', 'resume');
        location.replace(location.pathname + '?autotest=resume');
      });
    } catch (err) {
      out.textContent = 'FAIL ' + (err && err.stack || err);
    }
  }

  function resumeAutotest() {
    var out = $('autotest');
    out.hidden = false;
    var snap = sessionStorage.getItem('stormtrek_snap');
    var now = JSON.stringify({
      hp: save.run.hp,
      enemy: save.run.battle.enemyHp,
      hand: save.run.battle.hand,
      draw: save.run.battle.draw,
      discard: save.run.battle.discard,
      climate: save.run.battle.climate,
      ap: save.run.battle.ap,
      seed: save.run.seed
    });
    if (snap !== now) {
      out.textContent = 'FAIL 刷新后存档不一致';
      sessionStorage.removeItem('stormtrek_autotest');
      return;
    }
    var galleryBefore = save.meta.gallery.slice();
    save.run.hp = 1;
    save.run.battle.block = 0;
    save.run.battle.cancelled = false;
    save.run.battle.patternAt = 1;
    endTurn(save.meta, save.run);
    if (save.run.phase !== 'defeat') {
      out.textContent = 'FAIL 没有进入失败';
      return;
    }
    if (save.meta.gallery.length < galleryBefore.length) {
      out.textContent = 'FAIL 图鉴丢失';
      return;
    }
    var again = newRun(save.meta, 'balanced', save.meta.lastSeed || 7);
    if (JSON.stringify(again.deck) !== JSON.stringify(STARTERS.balanced)) {
      out.textContent = 'FAIL 失败后牌组被加强';
      return;
    }
    save.run = null;
    persist();
    setTimeout(function () {
      var bad = performance.getEntriesByType('resource').filter(function (r) {
        return r.responseStatus && r.responseStatus >= 400;
      }).map(function (r) { return r.responseStatus + ' ' + r.name; });
      var imgBad = testErrors.filter(function (src) { return src && String(src).indexOf('assets/') >= 0; });
      sessionStorage.removeItem('stormtrek_autotest');
      sessionStorage.removeItem('stormtrek_snap');
      if (bad.length || imgBad.length) {
        out.textContent = 'FAIL 资源 ' + bad.concat(imgBad).join(' | ');
        return;
      }
      out.textContent = 'OK 自检、拖拽、刷新、失败恢复';
    }, 400);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(typeof window !== 'undefined' ? window : globalThis);
