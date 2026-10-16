export const HOLE = Object.freeze({ x: 72, y: 28 });
export const START = Object.freeze({ x: 16, y: 84 });
export const FIREFLY_RADIUS = 4;
export const OBSTACLES = Object.freeze([
  Object.freeze({ x: 31, y: 66, radius: 10, type: 'bauble', variant: 'red' }),
  Object.freeze({ x: 49, y: 35, radius: 9.5, type: 'bauble', variant: 'gold' }),
  Object.freeze({ x: 73, y: 62, radius: 8, type: 'star', rotation: 18 }),
]);

const ACCELERATION = 70;
const DAMPING = 2.6;
const MAX_SPEED = 30;
const STONE_BOUNCE = 0.18;
const CAPTURE_RADIUS = 5;
const CAPTURE_SPEED = 8;
const CAPTURE_TIME = 0.8;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const finite = (value) => (Number.isFinite(value) ? value : 0);

// Defaults describe an unrotated SVG/clip-path outline in a 100 × 100 box.
export function starVertices({ x = 50, y = 50, radius = 50, rotation = 0 } = {}) {
  return Array.from({ length: 10 }, (_, index) => {
    const angle = ((rotation - 90 + index * 36) * Math.PI) / 180;
    const length = radius * (index % 2 ? 0.5 : 1);
    return { x: x + Math.cos(angle) * length, y: y + Math.sin(angle) * length };
  });
}

function polygonProximity(x, y, vertices) {
  let inside = false;
  let nearest = { distance: Infinity, nx: 0, ny: 0 };
  for (let index = 0; index < vertices.length; index += 1) {
    const a = vertices[index];
    const b = vertices[(index + 1) % vertices.length];
    const ex = b.x - a.x;
    const ey = b.y - a.y;
    if ((a.y > y) !== (b.y > y) && x < a.x + ((y - a.y) * ex) / ey) inside = !inside;
    const along = clamp(((x - a.x) * ex + (y - a.y) * ey) / (ex * ex + ey * ey), 0, 1);
    const dx = x - a.x - ex * along;
    const dy = y - a.y - ey * along;
    const distance = Math.hypot(dx, dy);
    if (distance < nearest.distance) {
      const length = Math.hypot(ex, ey);
      nearest = { distance, nx: distance ? dx / distance : ey / length, ny: distance ? dy / distance : -ex / length };
    }
  }
  if (inside && nearest.distance) {
    return { distance: -nearest.distance, nx: -nearest.nx, ny: -nearest.ny };
  }
  return nearest;
}

function sweepPolygon(x, y, dx, dy, vertices) {
  const movement = dx * dx + dy * dy;
  if (!movement) return null;
  let hit = null;
  const consider = (time, nx, ny) => {
    if (time >= 0 && time <= 1 && (!hit || time < hit.time)) hit = { time, nx, ny };
  };
  for (let index = 0; index < vertices.length; index += 1) {
    const a = vertices[index];
    const b = vertices[(index + 1) % vertices.length];
    const ex = b.x - a.x;
    const ey = b.y - a.y;
    const length = Math.hypot(ex, ey);
    const nx = ey / length;
    const ny = -ex / length;
    const speed = dx * nx + dy * ny;
    if (speed < 0) {
      const time = (FIREFLY_RADIUS - ((x - a.x) * nx + (y - a.y) * ny)) / speed;
      const along = ((x + dx * time - a.x) * ex + (y + dy * time - a.y) * ey) / (length * length);
      if (along >= 0 && along <= 1) consider(time, nx, ny);
    }
    // Rounded vertex contacts plus offset edges form the expanded silhouette.
    const sx = x - a.x;
    const sy = y - a.y;
    const approach = sx * dx + sy * dy;
    const outside = sx * sx + sy * sy - FIREFLY_RADIUS * FIREFLY_RADIUS;
    const discriminant = approach * approach - movement * outside;
    if (approach < 0 && discriminant >= 0) {
      const time = (-approach - Math.sqrt(discriminant)) / movement;
      consider(time, (sx + dx * time) / FIREFLY_RADIUS, (sy + dy * time) / FIREFLY_RADIUS);
    }
  }
  return hit;
}

function deflectFromStar(start, target, star) {
  let { x, y, vx, vy } = target;
  let dx = x - start.x;
  let dy = y - start.y;
  if (Math.hypot(start.x - star.x, start.y - star.y) > star.radius + FIREFLY_RADIUS + Math.hypot(dx, dy)) {
    return { ...target, collided: false };
  }
  const vertices = starVertices(star);
  x = start.x;
  y = start.y;
  let collided = false;
  const deflect = (nx, ny) => {
    const inward = Math.min(0, dx * nx + dy * ny);
    dx -= (1 + STONE_BOUNCE) * inward * nx;
    dy -= (1 + STONE_BOUNCE) * inward * ny;
    const inwardSpeed = Math.min(0, vx * nx + vy * ny);
    vx -= (1 + STONE_BOUNCE) * inwardSpeed * nx;
    vy -= (1 + STONE_BOUNCE) * inwardSpeed * ny;
    collided = true;
  };
  const clearOverlap = () => {
    // At an inward corner, clearing one edge can also require clearing its neighbor.
    for (let count = 0; count < 12; count += 1) {
      const near = polygonProximity(x, y, vertices);
      if (near.distance >= FIREFLY_RADIUS) break;
      const correction = FIREFLY_RADIUS - near.distance + 0.001;
      x += near.nx * correction;
      y += near.ny * correction;
      deflect(near.nx, near.ny);
    }
  };
  clearOverlap();
  for (let count = 0; count < 4; count += 1) {
    const hit = sweepPolygon(x, y, dx, dy, vertices);
    if (!hit) {
      x += dx;
      y += dy;
      break;
    }
    x += dx * hit.time + hit.nx * 0.001;
    y += dy * hit.time + hit.ny * 0.001;
    dx *= 1 - hit.time;
    dy *= 1 - hit.time;
    deflect(hit.nx, hit.ny);
    clearOverlap();
  }
  clearOverlap();
  return { x, y, vx, vy, collided };
}

export function createFirefly() {
  return { ...START, vx: 0, vy: 0, hold: 0, caught: false };
}

export function orientationToTilt(beta, gamma, screenAngle = 0) {
  const radians = Math.PI / 180;
  const pitch = finite(beta) * radians;
  const roll = finite(gamma) * radians;
  const angle = finite(screenAngle) * radians;
  const x = Math.sin(roll) * Math.cos(pitch);
  const y = Math.sin(pitch);
  // Orientation angles describe counter-clockwise rotation of the device.
  return {
    x: x * Math.cos(angle) + y * Math.sin(angle),
    y: y * Math.cos(angle) - x * Math.sin(angle),
  };
}

export function stepFirefly(state, input, dt) {
  if (state.caught) {
    return { ...state, ...HOLE, vx: 0, vy: 0, hold: CAPTURE_TIME };
  }
  const seconds = clamp(finite(dt), 0, 0.05);
  if (!seconds) return { ...state };

  let ix = clamp(finite(input?.x), -1, 1);
  let iy = clamp(finite(input?.y), -1, 1);
  const inputLength = Math.max(1, Math.hypot(ix, iy));
  ix /= inputLength;
  iy /= inputLength;
  const decay = Math.exp(-DAMPING * seconds);
  const terminalX = (ACCELERATION * ix) / DAMPING;
  const terminalY = (ACCELERATION * iy) / DAMPING;
  // Integrate constant input and drag analytically for consistent frame rates.
  let x = state.x + terminalX * seconds + ((state.vx - terminalX) * (1 - decay)) / DAMPING;
  let y = state.y + terminalY * seconds + ((state.vy - terminalY) * (1 - decay)) / DAMPING;
  let vx = terminalX + (state.vx - terminalX) * decay;
  let vy = terminalY + (state.vy - terminalY) * decay;
  const speedScale = Math.max(1, Math.hypot(vx, vy) / MAX_SPEED);
  vx /= speedScale;
  vy /= speedScale;

  if (x < 5 || x > 95) {
    x = clamp(x, 5, 95);
    vx = x === 5 ? Math.abs(vx) * 0.25 : -Math.abs(vx) * 0.25;
  }
  if (y < 5 || y > 95) {
    y = clamp(y, 5, 95);
    vy = y === 5 ? Math.abs(vy) * 0.25 : -Math.abs(vy) * 0.25;
  }

  let collided = false;
  for (const stone of OBSTACLES) {
    if (stone.type === 'star') {
      const result = deflectFromStar(state, { x, y, vx, vy }, stone);
      ({ x, y, vx, vy } = result);
      collided ||= result.collided;
      continue;
    }
    const radius = stone.radius + FIREFLY_RADIUS;
    const sx = state.x - stone.x;
    const sy = state.y - stone.y;
    const dx = x - state.x;
    const dy = y - state.y;
    const outside = sx * sx + sy * sy - radius * radius;
    let nx;
    let ny;
    if (outside < 0) {
      // Recover an overlapping position without resetting the game.
      const distance = Math.hypot(x - stone.x, y - stone.y);
      nx = distance ? (x - stone.x) / distance : 1;
      ny = distance ? (y - stone.y) / distance : 0;
      x = stone.x + nx * (radius + 0.001);
      y = stone.y + ny * (radius + 0.001);
    } else {
      const movement = dx * dx + dy * dy;
      const approach = sx * dx + sy * dy;
      const discriminant = approach * approach - movement * outside;
      if (!movement || approach >= 0 || discriminant < 0) continue;
      const contact = (-approach - Math.sqrt(discriminant)) / movement;
      if (contact < 0 || contact > 1) continue;
      nx = (sx + dx * contact) / radius;
      ny = (sy + dy * contact) / radius;
      const remainderX = dx * (1 - contact);
      const remainderY = dy * (1 - contact);
      const inward = Math.min(0, remainderX * nx + remainderY * ny);
      // Sweep to the first contact, then retain the sliding part of the step.
      x = state.x + dx - (1 + STONE_BOUNCE) * inward * nx + 0.001 * nx;
      y = state.y + dy - (1 + STONE_BOUNCE) * inward * ny + 0.001 * ny;
    }
    const inwardSpeed = Math.min(0, vx * nx + vy * ny);
    vx -= (1 + STONE_BOUNCE) * inwardSpeed * nx;
    vy -= (1 + STONE_BOUNCE) * inwardSpeed * ny;
    collided = true;
  }

  const settled = !collided && Math.hypot(x - HOLE.x, y - HOLE.y) <= CAPTURE_RADIUS
    && Math.hypot(vx, vy) <= CAPTURE_SPEED;
  const hold = settled ? state.hold + seconds : 0;
  if (hold >= CAPTURE_TIME - 1e-9) {
    return { ...HOLE, vx: 0, vy: 0, hold: CAPTURE_TIME, caught: true };
  }
  return { x, y, vx, vy, hold, caught: false };
}
