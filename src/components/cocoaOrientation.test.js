import test from 'node:test';
import assert from 'node:assert/strict';
import { createCocoaOrientation } from './cocoaOrientation.js';
const near = (a, b) => assert.ok(Math.abs(a - b) < .01, `${a} != ${b}`);
test('small phone movement remains effective from a tilted holding position', () => {
  const sensor = createCocoaOrientation();
  sensor.read({ alpha: 35, beta: 70, gamma: 0 });
  const right = sensor.read({ alpha: 35, beta: 70, gamma: 8 });
  near(right.roll, 8); near(right.pitch, 0);
  const forward = sensor.read({ alpha: 35, beta: 78, gamma: 0 });
  near(forward.roll, 0); near(forward.pitch, 8);
});
test('equivalent Euler representations near upright do not create a false tilt', () => {
  const sensor = createCocoaOrientation();
  sensor.read({ alpha: 0, beta: 89, gamma: 0 });
  const crossed = sensor.read({ alpha: 180, beta: 89, gamma: 180 });
  near(crossed.roll, 0); near(crossed.pitch, 2);
});
test('landscape maps the same movement into screen axes and recalibration is neutral', () => {
  const sensor = createCocoaOrientation();
  sensor.read({ beta: 40, gamma: 0 });
  const value = sensor.read({ beta: 40, gamma: 10 }, 90);
  near(value.roll, 0); near(value.pitch, -10);
  sensor.reset();
  const neutral = sensor.read({ beta: 40, gamma: 10 }, 90);
  near(neutral.roll, 0); near(neutral.pitch, 0);
});
test('invalid sensor readings are ignored', () => {
  assert.equal(createCocoaOrientation().read({ beta: null, gamma: 0 }), null);
});
