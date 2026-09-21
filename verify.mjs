import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const noop = () => {};
const context = new Proxy({}, { get: (_, key) => key === 'createRadialGradient' ? () => ({ addColorStop: noop }) : noop, set: () => true });
const nodes = new Map();
const node = key => {
  if (!nodes.has(key)) nodes.set(key, { textContent: '', dataset: {}, setAttribute: noop, getContext: () => context, setPointerCapture: noop, click() { this.onclick?.(); } });
  return nodes.get(key);
};
const scenes = ['encounter', 'binary', 'collapse'].map(scene => ({ dataset: { scene }, setAttribute: noop }));
const sandbox = vm.createContext({
  document: { querySelector: node, querySelectorAll: () => scenes },
  innerWidth: 1440, innerHeight: 900, devicePixelRatio: 1,
  matchMedia: () => ({ matches: false }), addEventListener: noop,
  requestAnimationFrame: noop, setTimeout: noop, console,
});
vm.runInContext(script, sandbox);
const run = code => vm.runInContext(code, sandbox);
for (const scene of ['encounter', 'binary', 'collapse']) {
  run(`init('${scene}'); grav=2; for(let n=0;n<1200;n++) step(.025);`);
  assert(run('[...x,...y,...vx,...vy].every(Number.isFinite)'), `${scene}: nonfinite state`);
  assert(run('elapsed > 29.9'), `${scene}: clock stalled`);
  run('px.set(x); py.set(y); draw();');
  console.log(`${scene}: 30 simulated units at maximum gravity, all 6,000 tracers finite`);
}
run("init('binary'); grav=1;");
const energy = () => run('cores.reduce((sum,c)=>sum+c.m*(c.vx*c.vx+c.vy*c.vy)/2,0)-cores[0].m*cores[1].m/Math.sqrt((cores[0].x-cores[1].x)**2+(cores[0].y-cores[1].y)**2+225)');
const initial = energy();
run('for(let n=0;n<2400;n++) step(.025)');
const drift = Math.abs((energy() - initial) / initial);
assert(drift < .0001, `Core energy drift: ${drift}`);
console.log(`Binary core relative energy drift: ${drift.toExponential(2)}`);
run('pointer.active=true;pointer.x=0;pointer.y=0;for(let n=0;n<100;n++)step(.025);pointer.repel=true;for(let n=0;n<100;n++)step(.025)');
assert(run('[...x,...y,...vx,...vy].every(Number.isFinite)'));
node('#pause').onclick(); assert(run('paused'));
node('#pause').onclick(); assert(!run('paused'));
node('#speed').oninput({ target: { value: '3' } }); assert.equal(run('speed'), 3);
node('#gravity').oninput({ target: { value: '.3' } }); assert.equal(run('grav'), .3);
node('#reset').onclick(); assert.equal(run('elapsed'), 0);
scenes[2].onclick(); assert.equal(run('scene'), 'collapse');
assert(!html.includes(String.fromCharCode(8212)));
console.log('Attract, repel, pause, resume, sliders, reset, scene selection, and punctuation checks passed.');
