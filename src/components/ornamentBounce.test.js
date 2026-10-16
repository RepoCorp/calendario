import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, launchBall, stepWorld, bounceVelocity, canPlace, DEFAULTS, STEP, RADIUS, SEPARATION, DROP_POINT, resetBall } from './ornamentBounce.js';
const run = (s, seconds, config = DEFAULTS) => { for (let i = 0; i < Math.round(seconds / STEP); i++) stepWorld(s, config); return s; };
const near = (a, b, tolerance = 1e-6) => assert.ok(Math.abs(a - b) < tolerance, `${a} != ${b}`);

test('elastic stationary paddle preserves restitution, without a launch-height preset', () => {
  near(bounceVelocity({ vx: 0, vy: 200 }, { vx: 0, vy: 0 }, 0, DEFAULTS).vy, -170);
  near(bounceVelocity({ vx: 0, vy: 400 }, { vx: 0, vy: 0 }, 0, DEFAULTS).vy, -340);
});
test('upward/downward paddle produces stronger/weaker physical rebounds', () => {
  const ball = { vx: 0, vy: 300 };
  const stationary = bounceVelocity(ball, { vx: 0, vy: 0 }, 0, DEFAULTS);
  const upward = bounceVelocity(ball, { vx: 0, vy: -100 }, 0, DEFAULTS);
  const downward = bounceVelocity(ball, { vx: 0, vy: 100 }, 0, DEFAULTS);
  near(upward.vy, -440); near(downward.vy, -70);
  assert.ok(upward.vy ** 2 > stationary.vy ** 2 && stationary.vy ** 2 > downward.vy ** 2);
  assert.equal(bounceVelocity(ball, { vx: 0, vy: 400 }, 0, DEFAULTS), null);
});
test('tangential transfer follows horizontal movement and is friction limited', () => {
  const right = bounceVelocity({ vx: 0, vy: 200 }, { vx: 100, vy: 0 }, 0, DEFAULTS);
  assert.ok(right.vx > 0 && right.vx < 100);
  near(bounceVelocity({ vx: 0, vy: 200 }, { vx: 100, vy: 0 }, 0, { ...DEFAULTS, friction: 0 }).vx, 0);
  assert.ok(bounceVelocity({ vx: 0, vy: 200 }, { vx: 0, vy: 0 }, -.8, DEFAULTS).vx < 0);
});
test('stationary repeated bounces separate and lose height naturally', () => {
  const s = createWorld(); launchBall(s);
  s.ball.x = s.cloud.x;
  let previousCount = 0, minima = [], min = Infinity;
  for (let i = 0; i < 2400; i++) {
    stepWorld(s, DEFAULTS);
    if (s.bounces > previousCount) { if (previousCount) minima.push(min); min = Infinity; previousCount = s.bounces; }
    if (s.bounces) min = Math.min(min, s.ball.y);
    if (s.bounces === 4) break;
  }
  assert.equal(s.bounces, 4); assert.ok(minima[1] > minima[0]);
});
test('swept collision catches fast downward ball without penetration', () => {
  const s = createWorld(); launchBall(s); s.ball.y = 393; s.ball.vy = 1600;
  stepWorld(s, DEFAULTS);
  assert.equal(s.bounces, 1); assert.ok(s.ball.vy < 0); assert.ok(s.ball.y + RADIUS < s.cloud.y);
});
test('fast upward drag is bounded and strikes at the moving plane', () => {
  const s = createWorld(); launchBall(s); s.ball.y = 397; s.ball.vy = 100; s.target.y = 340;
  stepWorld(s, DEFAULTS);
  assert.equal(s.bounces, 1); assert.ok(s.ball.vy < -800);
  assert.ok(Math.hypot(s.cloud.vx, s.cloud.vy) <= DEFAULTS.maxCloudSpeed + 1e-6);
});
test('descending paddle moving away cannot cause a bounce', () => {
  const s = createWorld(); launchBall(s); s.ball.y = 398; s.ball.vy = 50; s.target.y = 455;
  stepWorld(s, DEFAULTS); assert.equal(s.bounces, 0);
});
test('same contact cannot receive another impulse or be carried', () => {
  const s = createWorld(); launchBall(s); s.armed = false; s.bounces = 1;
  s.ball.y = s.cloud.y - RADIUS - .1; s.ball.vy = 100;
  stepWorld(s, DEFAULTS); assert.equal(s.active, false); assert.equal(s.bounces, 0);
});
test('placement requires a real bounce, free flight, separation, and the tree', () => {
  const s = createWorld(); launchBall(s); s.ball = { x: 230, y: 200, vx: 10, vy: -100 };
  assert.equal(canPlace(s), false);
  s.bounces = 1; s.freeTime = .1; assert.equal(canPlace(s), false);
  s.separated = true; assert.equal(canPlace(s), true);
  s.ball.x = 30; assert.equal(canPlace(s), false);
  s.ball = { x: 230, y: s.cloud.y - RADIUS - SEPARATION + 1 }; assert.equal(canPlace(s), false);
});
test('cloud remains below tree and horizontal drag cannot teleport it', () => {
  const s = createWorld(); s.target = { x: 2000, y: -2000 }; run(s, 2);
  near(s.cloud.x, 312, .01); near(s.cloud.y, DEFAULTS.minCloudY, .01);
  assert.ok(Number.isFinite(s.cloud.vx) && Number.isFinite(s.cloud.vy));
});
test('controlled upward strokes permit successive higher bounces', () => {
  const s = createWorld(); launchBall(s);
  s.ball.x = s.cloud.x;
  let prior = 0, upwardHits = 0;
  for (let i = 0; i < 2400 && s.active; i++) {
    s.target.y = s.ball.vy > 0 && s.ball.y > DEFAULTS.minCloudY - 5 ? DEFAULTS.minCloudY : DEFAULTS.maxCloudY;
    stepWorld(s, DEFAULTS);
    if (s.bounces > prior) { if (s.cloud.vy < -10) upwardHits++; prior = s.bounces; }
  }
  assert.ok(upwardHits >= 2, `Only ${upwardHits} upward hits`);
});


test('drop point stays fixed while moving the cloud, on reset and on launch', () => {
  const s = createWorld();
  s.target = { x: 280, y: 450 }; run(s, 1);
  assert.deepEqual(s.ball, { ...DROP_POINT, vx: 0, vy: 0 });
  launchBall(s); run(s, .2); resetBall(s);
  assert.deepEqual(s.ball, { ...DROP_POINT, vx: 0, vy: 0 });
  launchBall(s);
  assert.deepEqual(s.ball, { ...DROP_POINT, vx: 0, vy: 0 });
});
