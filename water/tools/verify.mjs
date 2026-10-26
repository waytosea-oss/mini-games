/* Prove every Rivulet level: the authored solution fills the glass,
   and the starting position does not. Run: node water/tools/verify.mjs [--high] [--only N] */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { create } = require('../sim.js');
const { LEVELS } = require('../levels.js');

const argv = process.argv.slice(2);
const preset = argv.includes('--high') ? 'high' : 'low';
const only = argv.includes('--only') ? +argv[argv.indexOf('--only') + 1] : 0;
const sec = preset === 'high' ? 9 : 8;
const dt = 1 / (preset === 'high' ? 72 : 50);

function play(level, solved) {
  const sim = create(level, { preset: preset });
  if (solved) sim.applySolution();
  let best = 0, wonAt = null;
  for (let t = 0; t < sec; t += dt) {
    sim.step(dt);
    if (sim.fill > best) best = sim.fill;
    if (sim.won) { wonAt = t; break; }
  }
  return { best: best, wonAt: wonAt, sim: sim };
}

let fail = 0, n = 0;
const t0 = Date.now();
for (const level of LEVELS) {
  if (only && level.id !== only) continue;
  n++;
  const sol = play(level, true);
  const raw = play(level, false);
  const solOk = sol.wonAt != null;
  const rawOk = raw.wonAt == null && raw.best < 0.42;
  if (!solOk || !rawOk) {
    fail++;
    console.log('FAIL', level.id, level.chapter, level.name,
      'SOL', sol.wonAt != null ? 'WON ' + sol.wonAt.toFixed(2) : 'fill ' + sol.best.toFixed(2),
      'RAW', raw.wonAt != null ? 'WON ' + raw.wonAt.toFixed(2) : 'fill ' + raw.best.toFixed(2));
    if (!solOk) console.log(sol.sim.debugGrid());
    else console.log(raw.sim.debugGrid());
  } else {
    console.log('ok', String(level.id).padStart(2, ' '), level.chapter.padEnd(6, ' '), level.name.padEnd(16, ' '), 'in', sol.wonAt.toFixed(2) + 's');
  }
}
console.log((fail ? 'FAILED ' + fail + '/' + n : 'ALL ' + n + ' PASS'), preset, (Date.now() - t0) + 'ms');
process.exit(fail ? 1 : 0);
