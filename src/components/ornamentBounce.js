// Fixed logical world, seconds and world units/second; rendering never changes physics.
export const WORLD = { width: 360, height: 485 };
export const RADIUS = 11;
export const PADDLE_HALF = 40;
export const SEPARATION = 5;
export const STEP = 1 / 240;
export const DEFAULTS = { gravity: 430, restitution: .85, friction: .38, maxCloudSpeed: 650, minCloudY: 378, maxCloudY: 455 };
export const DROP_POINT = { x: 48, y: 180 };
export const TREE = { x: 15, y: 5, width: 330, height: 352 };
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

export function createWorld() {
  const cloud = { x: 90, y: 410, vx: 0, vy: 0 };
  return { cloud, target: { x: cloud.x, y: cloud.y }, ball: { ...DROP_POINT, vx: 0, vy: 0 }, active: false, bounces: 0, armed: true, separated: false, freeTime: 0 };
}
export function resetBall(s) {
  s.active = false; s.bounces = 0; s.armed = true; s.separated = false; s.freeTime = 0;
  s.ball = { ...DROP_POINT, vx: 0, vy: 0 };
}
export function launchBall(s) { resetBall(s); s.active = true; }
export function inTree(b) {
  const scale = TREE.height / 320;
  const t = (b.y - (13 + (66 - 13) * scale)) / (224 * scale);
  // Let a bauble hang just below the bottom branches without widening the tree.
  const hangingAllowance = RADIUS * 1.25;
  return t >= 0 && t <= 1 + hangingAllowance / (224 * scale)
    && Math.abs(b.x - (TREE.x + TREE.width / 2)) <= (12 + 89 * Math.min(t, 1)) * scale;
}
export function canPlace(s) {
  return s.active && s.bounces > 0 && s.separated && s.freeTime >= .035 && inTree(s.ball)
    && s.cloud.y - s.ball.y - RADIUS >= SEPARATION;
}

// Tangential transfer is limited by the normal collision impulse (Coulomb friction).
// The small rounded contact offset is proportional to that impulse, never a launch preset.
export function bounceVelocity(ball, cloud, offset, config) {
  const closing = ball.vy - cloud.vy;
  if (closing <= 0) return null;
  const normalImpulse = (1 + config.restitution) * closing;
  const slip = cloud.vx - ball.vx + offset * closing * .22;
  const tangentImpulse = clamp(slip * config.friction, -normalImpulse * config.friction, normalImpulse * config.friction);
  return { vx: clamp(ball.vx + tangentImpulse, -1400, 1400), vy: clamp((1 + config.restitution) * cloud.vy - config.restitution * ball.vy, -1800, 1800) };
}

export function stepWorld(s, config, dt = STEP) {
  const c = s.cloud, b = s.ball;
  const old = { x: c.x, y: c.y };
  // Exponential pointer following: velocity comes from actual clamped travel, not raw events.
  const minY = clamp(config.minCloudY, 330, 440);
  const maxY = clamp(config.maxCloudY, minY + 10, 463);
  const tx = clamp(s.target.x, 48, WORLD.width - 48);
  const ty = clamp(s.target.y, minY, maxY);
  const follow = 1 - Math.exp(-dt / .055);
  let dx = (tx - c.x) * follow, dy = (ty - c.y) * follow;
  const length = Math.hypot(dx, dy), limit = config.maxCloudSpeed * dt;
  if (length > limit) { dx *= limit / length; dy *= limit / length; }
  c.x += dx; c.y += dy; c.vx = dx / dt; c.vy = dy / dt;
  if (!s.active) return;

  const endX = b.x + b.vx * dt;
  const endY = b.y + b.vy * dt + .5 * config.gravity * dt * dt;
  const gap0 = old.y - b.y - RADIUS;
  const gap1 = c.y - endY - RADIUS;
  s.freeTime += dt;
  if (gap0 >= SEPARATION) { s.armed = true; s.separated = true; }
  // Swept top-plane test in the paddle's moving frame; sides/underside don't launch.
  if (gap0 >= -.001 && gap1 <= 0 && gap1 < gap0) {
    const fraction = clamp(gap0 / (gap0 - gap1), 0, 1);
    const hitX = b.x + (endX - b.x) * fraction;
    const paddleX = old.x + dx * fraction;
    if (Math.abs(hitX - paddleX) <= PADDLE_HALF + RADIUS * .3) {
      if (!s.armed) {
        // Catching the same contact before separation fails the attempt; never carry it.
        resetBall(s); return;
      }
      const hitVy = b.vy + config.gravity * dt * fraction;
      const velocity = bounceVelocity({ vx: b.vx, vy: hitVy }, c, clamp((hitX - paddleX) / PADDLE_HALF, -1, 1), config);
      if (velocity) {
        const remaining = dt * (1 - fraction);
        b.x = hitX + velocity.vx * remaining;
        b.y = old.y + dy * fraction - RADIUS - .02 + velocity.vy * remaining + .5 * config.gravity * remaining * remaining;
        b.vx = velocity.vx; b.vy = velocity.vy + config.gravity * remaining;
        s.bounces++; s.armed = false; s.separated = false; s.freeTime = remaining;
      } else { b.x = endX; b.y = endY; b.vy += config.gravity * dt; }
    } else { b.x = endX; b.y = endY; b.vy += config.gravity * dt; }
  } else { b.x = endX; b.y = endY; b.vy += config.gravity * dt; }
  if (b.x < RADIUS || b.x > WORLD.width - RADIUS) { b.x = clamp(b.x, RADIUS, WORLD.width - RADIUS); b.vx *= -.85; }
  if (b.y < RADIUS) { b.y = RADIUS; b.vy = Math.abs(b.vy) * .8; }
  if (b.y > WORLD.height + 35) resetBall(s);
}
