// A cached collision field shared by all flakes. Rebuilt only when the revealed
// coverage changes. The coverage grid tracks the solid brush center, so include
// its 15px feather and about 12px for flake arms. The extra clearance used for
// the completed crown must not create a wide invisible rim around small patches.
const PATCH_PADDING = 27;
const COMPLETED_PADDING = 42;
const ROLL_FRICTION = 0.022;
export function buildSnowBoundary(cells, columns, width, height, completed = false) {
  if (!cells.length) return null;
  const rows = cells.length / columns;
  const cellWidth = width / columns;
  const cellHeight = height / rows;
  const boundaryPadding = completed ? COMPLETED_PADDING : PATCH_PADDING;
  // A shallow elliptical crown rounds into the sides without changing the art.
  // Raise the center 8px, but retain the edge height from before the steeper-edge trial.
  const crownDepth = Math.min(36, height * 0.12) + 8;
  const crownLift = 11;
  const crownAt = (x) => {
    const u = Math.max(-1, Math.min(1, 2 * x / width - 1));
    const arc = Math.sqrt(Math.max(0, 1 - u * u));
    return {
      y: crownDepth * (1 - arc) - crownLift,
      slope: 2 * crownDepth * u / (width * Math.max(0.001, arc)),
    };
  };
  const padX = Math.ceil(boundaryPadding / cellWidth) + 1;
  const padY = Math.ceil(boundaryPadding / cellHeight) + 1;
  const cols = columns + padX * 2;
  const totalRows = rows + padY * 2;
  const occupied = new Uint8Array(cols * totalRows);
  for (let i = 0; i < cells.length; i += 1) {
    if (!completed && !cells[i].covered) continue;
    const cx = i % columns + padX;
    const cy = Math.floor(i / columns) + padY;
    for (let dy = -padY + 1; dy < padY; dy += 1) {
      for (let dx = -padX + 1; dx < padX; dx += 1) {
        if (Math.hypot(dx * cellWidth, dy * cellHeight) <= boundaryPadding) {
          occupied[(cy + dy) * cols + cx + dx] = 1;
        }
      }
    }
  }
  // Restrict the message itself, not the narrow visible space beside it.
  // A flake's center can pass immediately outside either border, even when
  // most of its arms are cropped by the screen edge.
  for (let i = 0; i < occupied.length; i += 1) {
    const col = i % cols;
    if (col < padX || col >= padX + columns) occupied[i] = 0;
  }
  // Smooth the occupied field itself, not just its normals: otherwise a smooth
  // tangent still runs into invisible grid steps. Cache this when reveal changes.
  const kernel = [1, 4, 6, 4, 1];
  const horizontal = new Float32Array(occupied.length);
  const density = new Float32Array(occupied.length);
  for (let row = 0; row < totalRows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      for (let k = -2; k <= 2; k += 1) {
        const source = Math.max(0, Math.min(cols - 1, col + k));
        horizontal[row * cols + col] += occupied[row * cols + source] * kernel[k + 2] / 16;
      }
    }
  }
  for (let row = 0; row < totalRows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      for (let k = -2; k <= 2; k += 1) {
        const source = Math.max(0, Math.min(totalRows - 1, row + k));
        density[row * cols + col] += horizontal[source * cols + col] * kernel[k + 2] / 16;
      }
    }
  }
  const sampleDensity = (x, y) => {
    const gx = x / cellWidth + padX - .5;
    const gy = y / cellHeight + padY - .5;
    const col = Math.floor(gx);
    const row = Math.floor(gy);
    if (col < 0 || row < 0 || col + 1 >= cols || row + 1 >= totalRows) return 0;
    const fx = gx - col;
    const fy = gy - row;
    const top = density[row * cols + col] * (1 - fx) + density[row * cols + col + 1] * fx;
    const bottom = density[(row + 1) * cols + col] * (1 - fx) + density[(row + 1) * cols + col + 1] * fx;
    return top * (1 - fy) + bottom * fy;
  };
  const nearest = new Int32Array(occupied.length).fill(-1);
  const queue = new Int32Array(occupied.length);
  let tail = 0;
  for (let i = 0; i < occupied.length; i += 1) {
    if (!occupied[i]) { nearest[i] = i; queue[tail++] = i; }
  }
  for (let head = 0; head < tail; head += 1) {
    const index = queue[head];
    const x = index % cols;
    const y = Math.floor(index / cols);
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        if ((!dx && !dy) || x + dx < 0 || x + dx >= cols || y + dy < 0 || y + dy >= totalRows) continue;
        const next = (y + dy) * cols + x + dx;
        if (nearest[next] !== -1) continue;
        nearest[next] = nearest[index];
        queue[tail++] = next;
      }
    }
  }
  // Refine the flood's diagonal ties using actual distance. A flat horizontal
  // edge must produce an upward normal, not a zigzag of diagonal directions.
  for (const direction of [1, -1]) {
    for (let n = 0; n < occupied.length; n += 1) {
      const i = direction === 1 ? n : occupied.length - 1 - n;
      if (!occupied[i]) continue;
      const x = i % cols;
      const y = Math.floor(i / cols);
      const distance = (target) => ((target % cols - x) * cellWidth) ** 2
        + ((Math.floor(target / cols) - y) * cellHeight) ** 2;
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (x + dx < 0 || x + dx >= cols || y + dy < 0 || y + dy >= totalRows) continue;
          const candidate = nearest[(y + dy) * cols + x + dx];
          if (distance(candidate) < distance(nearest[i])) nearest[i] = candidate;
        }
      }
    }
  }
  return {
    escape(x, y) {
      if (x < 0 || x >= width) return null;
      const crown = crownAt(x);
      if (y < crown.y) return null;
      const col = Math.floor(x / cellWidth) + padX;
      const row = Math.floor(y / cellHeight) + padY;
      if (col < 0 || col >= cols || row < 0 || row >= totalRows) return null;
      const index = row * cols + col;
      const amount = sampleDensity(x, y);
      if (amount < .4) return null;
      const dx = (sampleDensity(x - 1, y) - sampleDensity(x + 1, y)) / 2;
      const dy = (sampleDensity(x, y - 1) - sampleDensity(x, y + 1)) / 2;
      const gradientLength = Math.hypot(dx, dy);
      const patchDepth = gradientLength > .0001 ? (amount - .4) / gradientLength : Infinity;
      const crownDistance = (y - crown.y) / Math.hypot(crown.slope, 1);
      if (y <= crownDepth + cellHeight && crownDistance <= patchDepth) {
        const length = Math.hypot(crown.slope, 1);
        return { x, y: crown.y - 0.1, nx: crown.slope / length, ny: -1 / length };
      }
      if (gradientLength > .0001) {
        const nx = dx / gradientLength;
        const ny = dy / gradientLength;
        return { x: x + nx * (patchDepth + .1), y: y + ny * (patchDepth + .1), nx, ny };
      }
      // Deep inside a newly revealed area, retain gradual escape until the
      // flake reaches the smooth contour. Never snap to this target position.
      const target = nearest[index];
      const escapeX = (target % cols - col) * cellWidth;
      const escapeY = (Math.floor(target / cols) - row) * cellHeight;
      const length = Math.hypot(escapeX, escapeY) || 1;
      return {
        x: (target % cols - padX + 0.5) * cellWidth,
        y: (Math.floor(target / cols) - padY + 0.5) * cellHeight,
        nx: escapeX / length,
        ny: escapeY / length,
      };
    },
  };
}

export function rollFromSnowContact(field, collision, _viewport, incoming = { vx: 0, vy: 0 }, step = 1) {
  const tx = -collision.ny;
  const ty = collision.nx;
  // The caller integrates gravity before contact. Project that velocity onto
  // the tangent: gravity contributes more on a steep slope and none on a crest.
  // Retain signed momentum, including a brief uphill slide after a finger push.
  const speed = (incoming.vx * tx + incoming.vy * ty) * Math.exp(-ROLL_FRICTION * step);
  const vx = tx * speed;
  const vy = ty * speed;
  const separation = collision.inside ? 1.2 : 0.04;
  const movement = {
    x: vx * step + collision.nx * separation,
    y: vy * step + collision.ny * separation,
  };
  if (!collision.inside && collideWithSnowBoundary(field, collision.x, collision.y,
    collision.x + movement.x, collision.y + movement.y)) {
    // Try a shorter step along the same tangent, never an alternating kick.
    for (const fraction of [0.5, 0.25, 0.125]) {
      const dx = movement.x * fraction;
      const dy = movement.y * fraction;
      if (!collideWithSnowBoundary(field, collision.x, collision.y, collision.x + dx, collision.y + dy)) {
        return { x: collision.x + dx, y: collision.y + dy, vx, vy };
      }
    }
    return { x: collision.x, y: collision.y, vx: 0, vy: 0, blocked: true };
  }

  return {
    x: collision.x + movement.x,
    y: collision.y + movement.y,
    // Separation only prevents overlap; it must not become an outward impulse.
    vx,
    vy,
    blocked: Math.abs(speed) < 0.002 && !collision.inside,
  };
}

export function touchesSnowBoundary(field, x, y) {
  if (!field) return false;
  for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
    if (field.escape(x + Math.cos(angle) * 3, y + Math.sin(angle) * 3)) return true;
  }
  return false;
}

export function canResumeSnowMotion(field, x, y) {
  const support = collideWithSnowBoundary(field, x, y, x, y + .75);
  if (!support || support.inside) return true;
  // A blocked flake may sleep, but a clear downhill tangent wakes it without
  // adding a kick. A genuinely level support can remain at rest.
  if (Math.abs(support.nx) < .015) return false;
  const direction = Math.sign(support.nx);
  const dx = -support.ny * direction * .35 + support.nx * .06;
  const dy = support.nx * direction * .35 + support.ny * .06;
  return !collideWithSnowBoundary(field, support.x, support.y, support.x + dx, support.y + dy);
}

export function trackSnowRest(previous, blocked, touching, x, y, now) {
  if (!blocked || !touching) return null;
  const anchor = previous && Math.hypot(x - previous.x, y - previous.y) < 0.75
    ? previous : { x, y, since: now };
  return { ...anchor, resting: now - anchor.since >= 400 };
}

export function collideWithSnowBoundary(field, fromX, fromY, toX, toY) {
  if (!field) return null;
  // Sweep the path, so a strong finger impulse cannot tunnel through a patch.
  const steps = Math.max(1, Math.ceil(Math.hypot(toX - fromX, toY - fromY) / 3));
  for (let step = 0; step <= steps; step += 1) {
    const x = fromX + (toX - fromX) * step / steps;
    const y = fromY + (toY - fromY) * step / steps;
    const escape = field.escape(x, y);
    if (!escape) continue;
    let safePortion = Math.max(0, step - 1) / steps;
    let contactPortion = step / steps;
    if (step > 0) {
      for (let refinement = 0; refinement < 8; refinement += 1) {
        const middle = (safePortion + contactPortion) / 2;
        if (field.escape(fromX + (toX - fromX) * middle, fromY + (toY - fromY) * middle)) contactPortion = middle;
        else safePortion = middle;
      }
    }
    const contact = field.escape(
      fromX + (toX - fromX) * contactPortion,
      fromY + (toY - fromY) * contactPortion,
    ) ?? escape;
    return {
      // Stop at the last safe point on the actual trajectory, never at the
      // distant grid-cell center used to determine the outward direction.
      x: fromX + (toX - fromX) * safePortion,
      y: fromY + (toY - fromY) * safePortion,
      inside: step === 0,
      nx: contact.nx,
      ny: contact.ny,
    };
  }
  return null;
}
