import test from 'node:test';
import assert from 'node:assert/strict';
import { isSparklerHeart } from './sparklerHeart.js';
const heart = Array.from({ length: 121 }, (_, i) => {
  const t = i * Math.PI * 2 / 120;
  return { x: .5 + .022 * 16 * Math.sin(t) ** 3, y: .5 - .022 * (13 * Math.cos(t) - 5 * Math.cos(2*t) - 2*Math.cos(3*t) - Math.cos(4*t)) };
});
const recognizes = paths => isSparklerHeart(paths.map(points => ({points})), 390, 390);
test('hearts work in either direction and in separate half strokes', () => {
  assert.ok(recognizes([heart]));
  assert.ok(recognizes([[...heart].reverse()]));
  assert.ok(recognizes([heart.slice(0, 61), heart.slice(60)]));
});
test('hand-drawn variation and pauses do not prevent recognition', () => {
  assert.ok(recognizes([heart.map((p,i) => ({x:p.x + Math.sin(i*2)*.008, y:p.y + Math.cos(i*3)*.008}))]));
  assert.ok(recognizes([heart.flatMap(p => [p,p,p])]));
});
test('circle, open half heart, line, tiny heart, and empty input do not reveal', () => {
  assert.equal(recognizes([Array.from({length:121},(_,i)=>({x:.5+.3*Math.cos(i*Math.PI/60),y:.5+.3*Math.sin(i*Math.PI/60)}))]),false);
  assert.equal(recognizes([heart.slice(0,60)]),false);
  assert.equal(recognizes([heart.map((_,i)=>({x:i/120,y:i/120}))]),false);
  assert.equal(recognizes([heart.map(p=>({x:p.x*.05,y:p.y*.05}))]),false);
  assert.equal(recognizes([]),false);
});

test('uneven lobes, a leaning heart and previous failed attempts are accepted', () => {
  const uneven = heart.map(p => ({x:p.x, y:p.y + (p.x-.5)*.26}));
  assert.ok(recognizes([uneven]));
  const angle = .38;
  const tilted = heart.map(p => ({x:.5+(p.x-.5)*Math.cos(angle)-(p.y-.5)*Math.sin(angle),y:.5+(p.x-.5)*Math.sin(angle)+(p.y-.5)*Math.cos(angle)}));
  assert.ok(recognizes([tilted]));
  assert.ok(recognizes([[{x:.1,y:.1},{x:.2,y:.2}], uneven]));
});
