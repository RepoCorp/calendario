import test from 'node:test';
import assert from 'node:assert/strict';
import { COCOA_INITIAL_FILL, COCOA_END_FILL, cocoaSpillProgress, cocoaRemainingAllowance, cocoaAttemptFinished } from './cocoaChallenge.js';
test('spill allowance ends the attempt while most of the chocolate remains', () => {
  assert.equal(cocoaSpillProgress(COCOA_INITIAL_FILL), 0);
  assert.ok(Math.abs(cocoaSpillProgress((COCOA_INITIAL_FILL + COCOA_END_FILL) / 2) - 50) < 1e-8);
  assert.equal(cocoaAttemptFinished(COCOA_INITIAL_FILL), false);
  assert.equal(cocoaAttemptFinished(COCOA_END_FILL), true);
  assert.ok(Math.abs(cocoaSpillProgress(COCOA_END_FILL) - 100) < 1e-8);
  assert.equal(cocoaSpillProgress(.55), 100);
  assert.ok(COCOA_END_FILL > 1.5);
});
test('a final spill cannot drain past the budget and reset has the full allowance', () => {
  let fill = COCOA_END_FILL + .01;
  fill -= Math.min(.08, cocoaRemainingAllowance(fill));
  assert.ok(cocoaAttemptFinished(fill));
  assert.equal(cocoaRemainingAllowance(fill), 0);
  assert.ok(cocoaRemainingAllowance(COCOA_INITIAL_FILL) > .29);
});
