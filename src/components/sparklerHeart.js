// Compare an evenly sampled outline, not pointer event density: pauses and
// drawing direction must not change recognition. Separate strokes stay separate.
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function normalize(points) {
  const xs = points.map(p => p.x), ys = points.map(p => p.y);
  const left = Math.min(...xs), top = Math.min(...ys);
  const width = Math.max(...xs) - left, height = Math.max(...ys) - top;
  return { width, height, points: points.map(p => ({ x: (p.x - left) / width, y: (p.y - top) / height })) };
}
function sample(strokes, spacing) {
  const points = [];
  for (const stroke of strokes) {
    if (!stroke.length) continue;
    points.push(stroke[0]);
    let remaining = spacing;
    for (let i = 1; i < stroke.length; i++) {
      let a = stroke[i - 1];
      const b = stroke[i];
      let length = distance(a, b);
      while (length >= remaining) {
        const u = remaining / length;
        a = { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
        points.push(a);
        length = distance(a, b);
        remaining = spacing;
      }
      remaining -= length;
    }
    points.push(stroke.at(-1));
  }
  return points;
}
const template = normalize(Array.from({ length: 160 }, (_, i) => {
  const t = i * Math.PI * 2 / 160;
  return { x: 16 * Math.sin(t) ** 3, y: -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) };
})).points;
const meanNearest = (a, b) => a.reduce((sum, p) => sum + Math.min(...b.map(q => distance(p, q))), 0) / a.length;

function matchesHeart(paths) {
  const raw = paths.flat();
  if (raw.length < 8) return false;
  const bounds = normalize(raw);
  if (bounds.width < 30 || bounds.height < 30 || bounds.width / bounds.height < .45 || bounds.width / bounds.height > 1.9) return false;
  const sampled = sample(paths, Math.max(bounds.width, bounds.height) / 65);
  const stride = Math.max(1, Math.ceil(sampled.length / 320));
  const reduced = sampled.filter((_, i) => i % stride === 0);
  // A hand-drawn heart may lean and have lobes of different heights. Undo a
  // modest lean before comparing; never demand a perfectly centered notch.
  for (const degrees of [0, -12, 12, -24, 24, -36, 36]) {
    const angle = degrees * Math.PI / 180, c = Math.cos(angle), s = Math.sin(angle);
    const points = normalize(reduced.map(p => ({ x: p.x*c-p.y*s, y: p.x*s+p.y*c }))).points;
    const topAt = (low, high) => Math.min(...points.filter(p => p.x >= low && p.x <= high).map(p => p.y));
    let hasCleft = false;
    for (const x of [.35, .4, .45, .5, .55, .6, .65]) {
      const cleft = topAt(x-.045, x+.045);
      const left = topAt(.08, x-.09), right = topAt(x+.09, .92);
      if (Number.isFinite(cleft) && cleft < .5 && cleft - Math.max(left, right) > .035) hasCleft = true;
    }
    if (hasCleft && meanNearest(points, template) < .105 && meanNearest(template, points) < .105) return true;
  }
  return false;
}

export function isSparklerHeart(strokes, width, height) {
  const paths = strokes.map(s => s.points.map(p => ({ x: p.x * width, y: p.y * height })));
  // A failed attempt or stray touch must not invalidate a later heart in the
  // same capture. Also accept a heart drawn as two or three separate arcs.
  for (let end = paths.length; end > 0; end--) {
    for (let count = 1; count <= Math.min(3, end); count++) {
      if (matchesHeart(paths.slice(end-count, end))) return true;
    }
  }
  return false;
}
