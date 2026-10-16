import { bounceVelocity, WORLD, RADIUS, PADDLE_HALF, STEP, SEPARATION } from './ornamentBounce.js';

export { WORLD, RADIUS, PADDLE_HALF, STEP };
export const PONG_CONFIG = {
  restitution: .85, friction: .38, maxPaddleSpeed: 650, maxBallSpeed: 1200,
  followTime: .055, serveGravity: 430, winningScore: 5,
  playerMinY: 400, playerMaxY: 440, aiMinY: 45, aiMaxY: 85,
  aiStartSpeed: 280, aiEndSpeed: 650, aiStartReaction: .34, aiEndReaction: .12,
  aiStartError: 48, aiEndError: 14,
};
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const mix = (a, b, t) => a + (b - a) * t;
export const PONG_START = { x: WORLD.width / 2, y: 365 };
const restingBall = () => ({ ...PONG_START, vx: 0, vy: 0 });

export function createPong(random = Math.random) {
  return {
    player: { x: 180, y: 420, vx: 0, vy: 0 }, ai: { x: 180, y: 65, vx: 0, vy: 0 },
    target: { x: 180, y: 420 }, aiTarget: { x: 180, y: 65 }, ball: restingBall(),
    scores: { player: 0, ai: 0 }, phase: 'ready', servingDrop: false,
    lastScorer: null, winner: null, aiClock: 0,
    armed: { player: true, ai: true }, hits: 0, random,
  };
}

// Release from rest: gravity drops the serve onto the player's cloud.
// After its first bounce, normal gravity-free Pong flight resumes.
export function startServe(s, config = PONG_CONFIG) {
  if (s.phase !== 'ready' && s.phase !== 'over') return false;
  if (s.phase === 'over') { s.scores = { player: 0, ai: 0 }; s.winner = null; }
  s.ball = restingBall(); s.armed = { player: true, ai: true };
  s.phase = 'playing'; s.aiClock = 0; s.lastScorer = null;
  s.servingDrop = true;
  return true;
}

export function aiDifficulty(s, config = PONG_CONFIG) {
  const progress = clamp((s.scores.player + s.scores.ai) / (2 * (config.winningScore - 1)), 0, 1);
  return {
    speed: Math.min(config.maxPaddleSpeed, mix(config.aiStartSpeed, config.aiEndSpeed, progress)),
    reaction: mix(config.aiStartReaction, config.aiEndReaction, progress),
    error: mix(config.aiStartError, config.aiEndError, progress),
  };
}

// Predict a free flight with the same dissipative wall rebounds as the real ball.
export function predictArrivalX(ball, y) {
  let remaining = (y - ball.y) / ball.vy;
  if (!Number.isFinite(remaining) || remaining <= 0) return WORLD.width / 2;
  let x = ball.x, vx = ball.vx;
  for (let i = 0; i < 32 && remaining > 0; i++) {
    if (Math.abs(vx) < .001) break;
    const wall = vx > 0 ? WORLD.width - RADIUS : RADIUS;
    const time = Math.max(0, (wall - x) / vx);
    if (time >= remaining) return clamp(x + vx * remaining, RADIUS, WORLD.width - RADIUS);
    x = wall; remaining -= time; vx *= -.85;
  }
  return clamp(x + vx * remaining, RADIUS, WORLD.width - RADIUS);
}

function movePaddle(p, target, minY, maxY, speed, config, dt) {
  const old = { x: p.x, y: p.y };
  const follow = 1 - Math.exp(-dt / config.followTime);
  let dx = (clamp(target.x, 48, WORLD.width - 48) - p.x) * follow;
  let dy = (clamp(target.y, minY, maxY) - p.y) * follow;
  const length = Math.hypot(dx, dy), limit = speed * dt;
  if (length > limit) { dx *= limit / length; dy *= limit / length; }
  p.x += dx; p.y += dy; p.vx = dx / dt; p.vy = dy / dt;
  return old;
}

function score(s, scorer, config) {
  s.scores[scorer]++; s.lastScorer = scorer;
  s.ball = restingBall(); s.servingDrop = false;
  s.armed = { player: true, ai: true };
  s.winner = s.scores[scorer] >= config.winningScore ? scorer : null;
  s.phase = s.winner ? 'over' : 'ready';
}

function capBall(b, config) {
  const speed = Math.hypot(b.vx, b.vy);
  if (speed > config.maxBallSpeed) {
    b.vx *= config.maxBallSpeed / speed; b.vy *= config.maxBallSpeed / speed;
  }
}

function tick(s, dt, config) {
  if (s.phase === 'over') return;
  const difficulty = aiDifficulty(s, config);
  s.aiClock -= dt;
  if (s.aiClock <= 0) {
    s.aiClock = difficulty.reaction;
    const incoming = s.phase === 'playing' && s.ball.vy < 0;
    const arrival = incoming ? predictArrivalX(s.ball, s.ai.y + RADIUS) : 180;
    s.aiTarget.x = clamp(arrival + (s.random() * 2 - 1) * difficulty.error, 48, 312);
    // Retreat while waiting, then move toward the ball for a physical forward stroke.
    const time = incoming ? (s.ai.y + RADIUS - s.ball.y) / s.ball.vy : Infinity;
    s.aiTarget.y = time < difficulty.reaction + .17 ? config.aiMaxY : config.aiMinY;
  }
  const oldPlayer = movePaddle(s.player, s.target, config.playerMinY, config.playerMaxY, config.maxPaddleSpeed, config, dt);
  const oldAi = movePaddle(s.ai, s.aiTarget, config.aiMinY, config.aiMaxY, difficulty.speed, config, dt);
  if (s.phase !== 'playing') return;
  const b = s.ball;
  if (b.y <= -RADIUS) { score(s, 'player', config); return; }
  if (b.y >= WORLD.height + RADIUS) { score(s, 'ai', config); return; }
  if (s.servingDrop) b.vy += config.serveGravity * dt;
  capBall(b, config);
  const paddles = [
    { key: 'player', p: s.player, old: oldPlayer, sign: 1 },
    { key: 'ai', p: s.ai, old: oldAi, sign: -1 },
  ];
  let elapsed = 0;
  // Resolve walls and moving paddle planes in time order, including leftover flight.
  for (let events = 0; events < 8 && elapsed < dt; events++) {
    const remaining = dt - elapsed;
    let hit = null, time = remaining + 1;
    const consider = (t, event) => { if (t >= -1e-9 && t <= remaining && t < time) { time = Math.max(0, t); hit = event; } };
    if (b.vx < 0) consider((RADIUS - b.x) / b.vx, { kind: 'wall' });
    if (b.vx > 0) consider((WORLD.width - RADIUS - b.x) / b.vx, { kind: 'wall' });
    if (b.vy < 0) consider((-RADIUS - b.y) / b.vy, { kind: 'score', scorer: 'player' });
    if (b.vy > 0) consider((WORLD.height + RADIUS - b.y) / b.vy, { kind: 'score', scorer: 'ai' });
    for (const item of paddles) {
      const { key, p, old, sign } = item;
      const py = old.y + p.vy * elapsed;
      const gap = sign * (py - b.y) - RADIUS;
      if (gap >= SEPARATION) s.armed[key] = true;
      const closing = sign * (b.vy - p.vy);
      if (!s.armed[key] || gap < -1e-6 || closing <= 0) continue;
      const t = Math.max(0, gap / closing);
      const offset = b.x + b.vx * t - (old.x + p.vx * (elapsed + t));
      if (Math.abs(offset) <= PADDLE_HALF + RADIUS * .3) consider(t, { kind: 'paddle', ...item, offset });
    }
    const travel = hit ? time : remaining;
    b.x += b.vx * travel; b.y += b.vy * travel; elapsed += travel;
    if (!hit) break;
    if (hit.kind === 'score') { score(s, hit.scorer, config); return; }
    if (hit.kind === 'wall') { b.vx *= -.85; continue; }
    const { sign, p, key, offset } = hit;
    const velocity = bounceVelocity({ vx: b.vx, vy: b.vy * sign }, { vx: p.vx, vy: p.vy * sign }, clamp(offset / PADDLE_HALF, -1, 1), config);
    if (velocity) {
      s.servingDrop = false;
      b.vx = velocity.vx; b.vy = velocity.vy * sign;
      b.y -= sign * .02; s.armed[key] = false; s.hits++; capBall(b, config);
    }
  }
}

// Substeps keep smoothing and reactions stable when callers provide frame deltas.
// Pausing is explicit: the caller stops stepping. Resume does not catch up wall time.
export function stepPong(s, dt = STEP, config = PONG_CONFIG) {
  if (!Number.isFinite(dt) || dt <= 0) return s;
  let remaining = Math.min(dt, .1);
  while (remaining > 1e-9) {
    const h = Math.min(STEP, remaining); tick(s, h, config); remaining -= h;
  }
  return s;
}
