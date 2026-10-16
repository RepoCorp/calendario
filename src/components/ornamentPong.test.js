import test from 'node:test';
import assert from 'node:assert/strict';
import { createPong, startServe, stepPong, aiDifficulty, predictArrivalX, PONG_CONFIG, RADIUS, WORLD, STEP, PONG_START } from './ornamentPong.js';

const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);
const stillAi = { ...PONG_CONFIG, aiStartSpeed: 0, aiEndSpeed: 0 };
function playing() { const s = createPong(() => .5); s.phase = 'playing'; return s; }
function run(s, seconds, config = PONG_CONFIG) {
  for (let i = 0; i < Math.round(seconds / STEP); i++) stepPong(s, STEP, config);
  return s;
}
function hitPlayer(targetY = 420, targetX = 180) {
  const s = playing(); s.target = { x: targetX, y: targetY };
  s.ball = { x: 180, y: 420 - RADIUS - .1, vx: 0, vy: 300 };
  stepPong(s, STEP, stillAi); return s;
}

test('stationary rebound uses incoming velocity and restitution, with no gravity', () => {
  const s = hitPlayer(); near(s.ball.vy, -255); assert.equal(s.hits, 1);
  const before = s.ball.vy; run(s, .1, stillAi); near(s.ball.vy, before);
});
test('upward and downward actual paddle motion strengthens and weakens rebound', () => {
  const up = hitPlayer(400), still = hitPlayer(), down = hitPlayer(430);
  assert.ok(up.ball.vy < still.ball.vy && still.ball.vy < down.ball.vy);
  near(up.ball.vy, 1.85 * up.player.vy - .85 * 300);
  near(down.ball.vy, 1.85 * down.player.vy - .85 * 300);
});
test('side movement transfers signed friction while an escaping paddle cannot strike', () => {
  assert.ok(hitPlayer(420, 250).ball.vx > 0);
  assert.ok(hitPlayer(420, 110).ball.vx < 0);
  const s = playing(); s.ball = { x: 180, y: 408.9, vx: 0, vy: 10 }; s.target.y = 440;
  stepPong(s); assert.equal(s.hits, 0); near(s.ball.vy, 10);
});
test('upper paddle is the signed mirror of the lower paddle', () => {
  const bottom = hitPlayer(); const top = playing();
  top.ball = { x: 180, y: 65 + RADIUS + .1, vx: 0, vy: -300 };
  stepPong(top, STEP, stillAi); near(top.ball.vy, -bottom.ball.vy); near(top.ball.vx, bottom.ball.vx);
  assert.equal(top.hits, 1);
});
test('upper forward stroke mirrors the lower upward stroke including side transfer', () => {
  const bottom = hitPlayer(400, 210), top = playing();
  top.aiClock = 10; top.aiTarget = { x: 210, y: 85 };
  top.ball = { x: 180, y: 65 + RADIUS + .1, vx: 0, vy: -300 };
  stepPong(top, STEP, { ...PONG_CONFIG, aiStartSpeed: 650 });
  near(top.ball.vy, -bottom.ball.vy); near(top.ball.vx, bottom.ball.vx);
  assert.equal(top.hits, 1);
});
test('relative swept collision catches a fast moving ball and a moving paddle', () => {
  const s = playing(); s.ball = { x: 180, y: 407, vx: 0, vy: 1100 };
  s.target.y = 400; stepPong(s, STEP, stillAi);
  assert.equal(s.hits, 1); assert.ok(s.ball.y < s.player.y - RADIUS);
  assert.ok(Math.hypot(s.ball.vx, s.ball.vy) <= PONG_CONFIG.maxBallSpeed + 1e-6);
});
test('separation rearms contact; an unseparated contact gets no repeated impulse or carrying', () => {
  const s = hitPlayer(); assert.equal(s.armed.player, false);
  run(s, .04, stillAi); assert.equal(s.armed.player, true); assert.equal(s.hits, 1);
  s.armed.player = false; s.ball = { x: 180, y: s.player.y - RADIUS - .1, vx: 0, vy: 100 };
  stepPong(s, STEP, stillAi); near(s.ball.vy, 100); assert.equal(s.hits, 1);
  assert.ok(s.ball.y > s.player.y - RADIUS);
});
test('side wall rebound applies .85 restitution and consumes remaining flight', () => {
  const s = playing(); s.ball = { x: WORLD.width - RADIUS - .1, y: 220, vx: 500, vy: 15 };
  stepPong(s); near(s.ball.vx, -425); near(s.ball.vy, 15); assert.ok(s.ball.x < WORLD.width - RADIUS);
});
test('a miss scores once only after crossing the boundary and pauses at the starting point', () => {
  const s = playing(); s.ball = { x: 20, y: WORLD.height + RADIUS - .1, vx: 0, vy: 200 };
  stepPong(s); assert.deepEqual(s.scores, { player: 0, ai: 1 }); assert.equal(s.lastScorer, 'ai');
  assert.equal(s.phase, 'ready'); near(s.ball.x, 180); near(s.ball.y, PONG_START.y);
  run(s, 1); assert.equal(s.scores.ai, 1); near(s.ball.vy, 0);
});
test('player releases a falling serve from rest after every point', () => {
  const s = createPong(() => .5);
  assert.equal(startServe(s), true); assert.equal(startServe(s), false);
  assert.equal(s.phase, 'playing'); near(s.ball.vy, 0); near(s.ball.y, PONG_START.y);
  run(s, .1); assert.ok(s.ball.vy > 0); assert.ok(s.ball.y > PONG_START.y); near(s.ball.vx, 0);
  s.ball.y = -RADIUS; stepPong(s); assert.equal(s.phase, 'ready');
  startServe(s); near(s.ball.vy, 0); assert.equal(s.scores.player, 1);
  run(s, .6, stillAi); assert.equal(s.hits, 1); assert.ok(s.ball.vy < 0); assert.equal(s.servingDrop, false);
  const rebound = s.ball.vy; run(s, .1, stillAi); near(s.ball.vy, rebound);
});
test('first to five waits at the starting point; the next cloud touch starts a new match', () => {
  const s = playing(); s.scores = { player: 4, ai: 4 }; s.ball.y = -RADIUS;
  stepPong(s); assert.equal(s.winner, 'player'); assert.equal(s.phase, 'over');
  near(s.ball.y, PONG_START.y); near(s.ball.vy, 0);
  const before = JSON.stringify(s); run(s, 1); assert.equal(JSON.stringify(s), before);
  assert.equal(startServe(s), true); assert.deepEqual(s.scores, { player: 0, ai: 0 });
  assert.equal(s.winner, null); assert.equal(s.phase, 'playing'); near(s.ball.vy, 0); assert.equal(s.servingDrop, true);
});
test('AI prediction includes dissipative wall bounces', () => {
  near(predictArrivalX({ x: 300, y: 276, vx: 100, vy: -200 }, 76), 349 - 51 * .85);
  near(predictArrivalX({ x: 100, y: 276, vx: 0, vy: -200 }, 76), 100);
});
test('AI gets faster, more accurate, and more reactive as the match advances', () => {
  const s = createPong(); const first = aiDifficulty(s); s.scores = { player: 4, ai: 4 };
  const last = aiDifficulty(s); assert.ok(last.speed > first.speed); assert.ok(last.error < first.error);
  assert.ok(last.reaction < first.reaction); near(last.speed, PONG_CONFIG.maxPaddleSpeed);
});
test('both paddles obey mirrored bands and speed bounds without teleporting', () => {
  const s = playing(); s.target = { x: 999, y: -999 }; s.scores = { player: 4, ai: 4 };
  for (let i = 0; i < 480; i++) {
    stepPong(s);
    for (const p of [s.player, s.ai]) {
      assert.ok(Math.hypot(p.vx, p.vy) <= PONG_CONFIG.maxPaddleSpeed + 1e-6);
      assert.ok(p.x >= 48 && p.x <= 312);
    }
    assert.ok(s.ai.y >= 45 && s.ai.y <= 85); assert.ok(s.player.y >= 400 && s.player.y <= 440);
  }
});
test('AI commits delayed targets and moves toward an approaching ball for its stroke', () => {
  const s = playing(); s.ball = { x: 200, y: 100, vx: 0, vy: -200 }; stepPong(s);
  assert.equal(s.aiTarget.y, PONG_CONFIG.aiMaxY); assert.ok(s.ai.vy > 0);
  const target = s.aiTarget.x; s.ball.x = 300; stepPong(s); near(s.aiTarget.x, target);
});
