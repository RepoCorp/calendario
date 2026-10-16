// Live sparks are transient; the recorded strokes and exposure renderer own no particles.
export const MAX_SPARKS = 1100;
const TAU = Math.PI * 2;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
export function createSparks(random = Math.random) {
  return { particles: [], cursor: 0, random };
}
function emit(s, x, y, burst = false) {
  const r = s.random;
  const needle = burst || r() < .1;
  const angle = r() * TAU;
  const speed = needle ? 170 + r() * 330 : 35 + r() ** .65 * 240;
  const life = needle ? .16 + r() * .37 : .055 + r() * .31;
  const p = {
    x, y, px: x, py: y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
    age: 0, life, width: needle ? .45 + r() * .65 : .25 + r() * .5,
    tail: needle ? .018 + r() * .025 : .003 + r() * .013,
    brightness: .45 + r() * .55,
  };
  if (s.particles.length < MAX_SPARKS) s.particles.push(p);
  else { s.particles[s.cursor % MAX_SPARKS] = p; s.cursor = (s.cursor + 1) % MAX_SPARKS; }
}
export function emitAlong(s, from, to, elapsed = 0) {
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  const count = Math.min(160, Math.ceil(distance * 1.4 + clamp(elapsed, 0, .05) * 620));
  for (let i = 0; i < count; i++) {
    const t = (i + s.random()) / count;
    emit(s, from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t);
  }
}
export function emitBurst(s, p) {
  const count = 9 + Math.floor(s.random() * 13);
  for (let i = 0; i < count; i++) emit(s, p.x, p.y, i < 3);
}
export function stepSparks(s, dt) {
  dt = clamp(dt, 0, .05);
  const drag = Math.exp(-1.8 * dt);
  let keep = 0;
  for (const p of s.particles) {
    p.age += dt;
    if (p.age >= p.life) continue;
    p.px = p.x; p.py = p.y;
    p.vx *= drag; p.vy = p.vy * drag + 170 * dt;
    p.x += p.vx * dt; p.y += p.vy * dt;
    s.particles[keep++] = p;
  }
  s.particles.length = keep;
}
export function paintSparks(ctx, s) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  for (const p of s.particles) {
    const cooling = p.age / p.life;
    ctx.globalAlpha = p.brightness * (1 - cooling) ** 1.25;
    ctx.strokeStyle = cooling < .13 ? '#fff8dc' : cooling < .48 ? '#ffd47a' : cooling < .77 ? '#ee9a31' : '#ae4514';
    ctx.lineWidth = p.width * (1 - cooling * .5);
    ctx.beginPath(); ctx.moveTo(p.x - p.vx * p.tail, p.y - p.vy * p.tail);
    ctx.lineTo(p.x, p.y); ctx.stroke();
  }
  ctx.restore();
}
export function createCoreSprite() {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const glow = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
  glow.addColorStop(0, '#fffde7'); glow.addColorStop(.055, '#fffbd5');
  glow.addColorStop(.14, 'rgba(255,205,91,.55)'); glow.addColorStop(.35, 'rgba(255,149,29,.13)');
  glow.addColorStop(1, 'rgba(255,120,0,0)');
  ctx.fillStyle = glow; ctx.fillRect(0, 0, 64, 64); return canvas;
}
export function paintCore(ctx, sprite, p, now) {
  const flicker = .88 + .1 * Math.sin(now * .097) + .09 * Math.sin(now * .173);
  const size = 30 * flicker;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  ctx.drawImage(sprite, p.x - size / 2, p.y - size / 2, size, size);
  ctx.fillStyle = '#fffef1'; ctx.beginPath(); ctx.arc(p.x, p.y, .9 + flicker * .55, 0, TAU); ctx.fill();
  ctx.restore();
}
