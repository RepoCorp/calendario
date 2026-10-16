// Persistent photographic exposure. No clocks, random globals or retained canvas
// state: replay the original seed/index pairs after resizing or changing modes.
export const EXPOSURE_LIMITS = Object.freeze({ spacing: 2, samples: 1024, sparks: 240 });

export function seededRandom(seed) {
  let state = 2166136261;
  for (const char of String(seed)) state = Math.imul(state ^ char.charCodeAt(0), 16777619);
  return () => {
    state += 0x6d2b79f5;
    let n = Math.imul(state ^ (state >>> 15), 1 | state);
    n ^= n + Math.imul(n ^ (n >>> 7), 61 | n);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
}

const finite = (n, fallback = 0) => Number.isFinite(n) ? n : fallback;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

export function planExposureSegment(from, to, { width, height, seed = 1, index = 0 }) {
  width = Math.max(0, finite(width));
  height = Math.max(0, finite(height));
  const a = { x: clamp(finite(from.x), 0, 1) * width, y: clamp(finite(from.y), 0, 1) * height };
  const b = { x: clamp(finite(to.x), 0, 1) * width, y: clamp(finite(to.y), 0, 1) * height };
  const dx = b.x - a.x, dy = b.y - a.y;
  const distance = Math.hypot(dx, dy);
  const empty = { core: [], sparks: [], grains: [] };
  if (!width || !height) return empty;
  // Exposure energy increases with time spent per pixel, including stationary dwell.
  const initial = distance === 0 && finite(from.t) === finite(to.t);
  const elapsed = clamp(finite(to.t) - finite(from.t), 0, 250);
  if (!initial && elapsed === 0 && distance < .15) return empty;
  const energy = initial ? .65 : clamp(.32 + elapsed / (Math.max(distance, 2) * 5), .32, 4);
  const dwellSamples = distance < .15 ? Math.ceil(elapsed / 12) : 1;
  const random = seededRandom(`${seed}:${index}`);
  const steps = Math.min(EXPOSURE_LIMITS.samples, Math.max(dwellSamples, 1, Math.ceil(distance / EXPOSURE_LIMITS.spacing)));
  const nx = distance ? -dy / distance : 0, ny = distance ? dx / distance : 1;
  const core = [], sparks = [], grains = [];
  const makeSpark = (origin, burst = false) => {
    if (sparks.length >= EXPOSURE_LIMITS.sparks) return;
    const angle = random() * Math.PI * 2;
    const length = burst ? 12 + random() ** 1.6 * 42 : 2 + random() ** 2 * 24;
    const vx = Math.cos(angle) * length, vy = Math.sin(angle) * length;
    const bend = .4 + length * (.035 + random() * .13);
    const start = { x: origin.x + (random() - .5) * 2, y: origin.y + (random() - .5) * 2 };
    sparks.push({
      start,
      control: { x: start.x + vx * .52, y: start.y + vy * .52 },
      end: { x: start.x + vx, y: start.y + vy + bend },
      width: .35 + random() * .65,
      alpha: .4 + random() * .55,
      hot: random() < .4,
    });
  };
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const roughness = i === 0 || i === steps ? 0 : (random() - .5) * .85;
    const p = { x: a.x + dx * u + nx * roughness, y: a.y + dy * u + ny * roughness };
    core.push(p);
    if (i === 0 && !initial) continue;
    const density = Math.min(2.2 * Math.sqrt(energy), 190 / steps);
    for (let j = 0; j < Math.floor(density); j++) makeSpark(p);
    if (random() < density % 1 || initial) makeSpark(p);
    // Rare local combustion clusters, with independently sampled directions,
    // lengths and offsets; never a regularly spaced radial star.
    if (random() < .035) {
      const count = 3 + Math.floor(random() * 5);
      for (let j = 0; j < count; j++) makeSpark(p, true);
    }
    for (let g = 0; g < 2 && grains.length < EXPOSURE_LIMITS.sparks; g++) {
      const angle = random() * Math.PI * 2, spread = 2 + random() ** 1.5 * 27;
      grains.push({ x: p.x + Math.cos(angle) * spread, y: p.y + Math.sin(angle) * spread,
        radius: .25 + random() * .5, alpha: .35 + random() * .6 });
    }
  }
  return { core, sparks, grains, energy };
}

function traceCore(ctx, points) {
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  // A zero-length first touch needs a tiny mark with round caps.
  if (points.every(p => p.x === points[0].x && p.y === points[0].y)) {
    ctx.lineTo(points[0].x + .12, points[0].y);
  }
}

export function paintExposureSegment(ctx, from, to, options) {
  const plan = planExposureSegment(from, to, options);
  if (!plan.core.length) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = Math.min(1, plan.energy);
  ctx.shadowBlur = 0;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  traceCore(ctx, plan.core);
  // Low-energy nested strokes provide a delicate bloom without a soft blob or
  // a costly shadow pass per particle. The white filament stays subpixel-thin.
  for (const [width, color] of [[7, 'rgba(255,128,18,.07)'], [3.3, 'rgba(255,168,40,.27)'], [1.15, 'rgba(255,247,215,.97)']]) {
    ctx.lineWidth = width * (1 + Math.max(0, plan.energy - 1) * .22);
    ctx.strokeStyle = color;
    ctx.stroke();
  }
  ctx.globalAlpha = Math.min(1, Math.sqrt(plan.energy));
  for (const spark of plan.sparks) {
    const { start: a, control: c, end: b } = spark;
    ctx.strokeStyle = spark.hot ? `rgba(255,231,169,${spark.alpha})` : `rgba(255,167,57,${spark.alpha})`;
    let previous = a;
    for (let part = 1; part <= 3; part++) {
      const t = part / 3, s = 1 - t;
      const p = { x: s * s * a.x + 2 * s * t * c.x + t * t * b.x,
        y: s * s * a.y + 2 * s * t * c.y + t * t * b.y };
      ctx.beginPath();
      ctx.moveTo(previous.x, previous.y);
      ctx.lineTo(p.x, p.y);
      ctx.lineWidth = spark.width * (1.15 - part * .24);
      ctx.stroke();
      previous = p;
    }
  }
  for (const grain of plan.grains) {
    ctx.fillStyle = `rgba(255,197,101,${grain.alpha})`;
    ctx.beginPath();
    ctx.arc(grain.x, grain.y, grain.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
