import test from 'node:test';
import assert from 'node:assert/strict';
import { createCocoaBalance, getCocoaSway, stepCocoaBalance } from './cocoaBalance.js';

function advance(state, seconds, input = () => ({ x: 0, y: 0 }), fps = 60) {
  for (let frame = 0; frame < Math.round(seconds * fps); frame += 1) {
    state = stepCocoaBalance(state, input(state.elapsed), 1 / fps);
  }
  return state;
}
const counterTilt = (time) => {
  const sway = getCocoaSway(time);
  return { x: -sway.x / 0.8, y: -sway.y / 0.8 };
};

test('stillness gives a visible warning before spilling, then cannot last forever', () => {
  const warning = advance(createCocoaBalance(), 4);
  assert.ok(warning.warning > 0);
  assert.equal(warning.spill, 0);
  const later = advance(warning, 2);
  assert.ok(later.spill > 0 && later.spill < 10);
  assert.equal(advance(later, 60).gameOver, true);
});

test('slow counter-tilts can balance the changing sway without losing chocolate', () => {
  const state = advance(createCocoaBalance(), 60, counterTilt);
  assert.equal(state.spill, 0);
  assert.equal(state.gameOver, false);
});

test('a brief large movement is forgiven and a sustained one spills gradually', () => {
  const brief = advance(createCocoaBalance(), 0.4, () => ({ x: 24, y: 0 }));
  assert.equal(advance(brief, 1).spill, 0);
  const sustained = advance(createCocoaBalance(), 1.5, () => ({ x: 24, y: 0 }));
  assert.ok(sustained.spill > 0 && sustained.spill < 12);
  const recovered = advance(sustained, 0.7, counterTilt);
  assert.equal(recovered.spillRate, 0);
  assert.ok(recovered.spill >= sustained.spill);
  assert.equal(advance(recovered, 3, counterTilt).spill, recovered.spill);
});

test('frame rates preserve loss timing and restart restores a fresh cup', () => {
  const at30 = advance(createCocoaBalance(), 15, undefined, 30);
  const at120 = advance(createCocoaBalance(), 15, undefined, 120);
  assert.ok(Math.abs(at30.spill - at120.spill) < 1);
  const lost = advance(createCocoaBalance(), 60);
  assert.equal(stepCocoaBalance(lost, { x: 0, y: 0 }, 1 / 60), lost);
  assert.equal(createCocoaBalance().spill, 0);
});
