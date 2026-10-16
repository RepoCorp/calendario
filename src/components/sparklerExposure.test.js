import test from 'node:test';
import assert from 'node:assert/strict';
import { EXPOSURE_LIMITS, planExposureSegment, paintExposureSegment } from './sparklerExposure.js';

const options = { width: 390, height: 550, seed: 'family', index: 12 };
const a = { x: .1, y: .2, t: 0 }, b = { x: .9, y: .8, t: 16 };

test('saved seed and segment index replay identical geometry without global randomness', () => {
  const first = planExposureSegment(a, b, options);
  planExposureSegment(b, a, { ...options, seed: 99 });
  assert.deepEqual(planExposureSegment(a, b, options), first);
  assert.notDeepEqual(planExposureSegment(a, b, { ...options, index: 13 }).sparks, first.sparks);
});

test('a sparse fast swipe interpolates its entire path at about two CSS pixels', () => {
  const plan = planExposureSegment(a, b, options);
  assert.deepEqual(plan.core[0], { x: 39, y: 110 });
  assert.deepEqual(plan.core.at(-1), { x: 351, y: 440 });
  for (let i = 1; i < plan.core.length; i++) {
    assert.ok(Math.hypot(plan.core[i].x - plan.core[i - 1].x, plan.core[i].y - plan.core[i - 1].y) < 2.2);
  }
});

test('slower movement deposits more light and holding still continues exposure', () => {
  const fast = planExposureSegment(a, b, options);
  const slow = planExposureSegment(a, { ...b, t: 240 }, options);
  assert.ok(slow.energy > fast.energy);
  const dwell = planExposureSegment(a, { ...a, t: 40 }, options);
  assert.ok(dwell.core.length && dwell.sparks.length);
  assert.ok(dwell.energy > slow.energy);
});

test('separate strokes never acquire an implicit joining segment', () => {
  planExposureSegment(a, b, options);
  const next = { x: .02, y: .96, t: 3000 };
  const plan = planExposureSegment(next, next, { ...options, index: 13 });
  assert.ok(plan.core.every(p => p.x === next.x * options.width && p.y === next.y * options.height));
});

test('extreme dimensions and timing cannot exceed particle budgets or produce nonfinite geometry', () => {
  for (const size of [0, 1, 1000000, Infinity]) {
    const plan = planExposureSegment({ x: -10, y: NaN, t: -Infinity }, { x: 10, y: 10, t: Infinity },
      { ...options, width: size, height: size });
    assert.ok(plan.core.length <= EXPOSURE_LIMITS.samples + 1);
    assert.ok(plan.sparks.length <= EXPOSURE_LIMITS.sparks);
    assert.ok(plan.grains.length <= EXPOSURE_LIMITS.sparks);
    const check = value => {
      if (typeof value === 'number') assert.ok(Number.isFinite(value));
      else if (value && typeof value === 'object') Object.values(value).forEach(check);
    };
    check(plan);
  }
});

test('painting replays identical canvas commands after other strokes and restores context', () => {
  const record = () => {
    const commands = [];
    const ctx = new Proxy({}, {
      get: (_, key) => (...args) => commands.push([key, ...args]),
      set: (_, key, value) => { commands.push([key, value]); return true; },
    });
    paintExposureSegment(ctx, a, b, options);
    return commands;
  };
  const first = record();
  planExposureSegment(b, a, options);
  assert.deepEqual(record(), first);
  assert.deepEqual(first[0], ['save']);
  assert.deepEqual(first.at(-1), ['restore']);
  assert.ok(first.some(c => c[0] === 'globalCompositeOperation' && c[1] === 'lighter'));
  assert.ok(!first.some(c => c[0] === 'shadowBlur' && c[1] > 0));
});
