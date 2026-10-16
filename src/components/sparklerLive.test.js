import test from 'node:test';
import assert from 'node:assert/strict';
import { createSparks, emitAlong, emitBurst, stepSparks, MAX_SPARKS } from './sparklerLive.js';
import { seededRandom } from './sparklerExposure.js';

test('fast movement distributes sparks across the complete segment', () => {
  const s = createSparks(seededRandom(1));
  emitAlong(s, { x: 10, y: 20 }, { x: 310, y: 620 });
  assert.ok(s.particles.some(p => p.x < 20));
  assert.ok(s.particles.some(p => p.x > 300));
  assert.ok(s.particles.every(p => Math.abs(p.y - (20 + (p.x - 10) * 2)) < 1e-8));
});
test('sustained burning respects the particle budget and all sparks expire after release', () => {
  const s = createSparks(seededRandom(2));
  for (let i = 0; i < 200; i++) { emitAlong(s, { x: 20, y: 20 }, { x: 300, y: 300 }, .05); emitBurst(s, { x: 20, y: 20 }); }
  assert.equal(s.particles.length, MAX_SPARKS);
  for (let i = 0; i < 30; i++) stepSparks(s, .05);
  assert.equal(s.particles.length, 0);
});
test('gravity and drag alter free flight without nonfinite positions', () => {
  const s = createSparks(seededRandom(3)); emitBurst(s, { x: 50, y: 50 });
  const p = s.particles[0], vx = p.vx, vy = p.vy;
  stepSparks(s, .01);
  assert.ok(Math.abs(p.vx) < Math.abs(vx));
  assert.ok(Math.abs(p.vy - (vy * Math.exp(-.018) + 1.7)) < 1e-8);
  assert.ok(s.particles.every(q => Number.isFinite(q.x) && Number.isFinite(q.y)));
});
