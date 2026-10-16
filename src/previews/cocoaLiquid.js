// Fixed-step spring/height-field approximation, independent of rendering and input.
export function createCocoaLiquid() {
  const size = 33;
  const extent = 1;
  const spacing = 2 * extent / (size - 1);
  const height = new Float32Array(size * size);
  const velocity = new Float32Array(height.length);
  const active = new Uint8Array(height.length);
  const slope = { x: 0, z: 0, vx: 0, vz: 0 };
  let previousX = 0;
  let previousZ = 0;
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      active[j * size + i] = Math.hypot(i * spacing - extent, j * spacing - extent) <= 0.98;
    }
  }
  const settings = { inertia: 0.3, amplitude: 1, damping: 2.4 };

  function step(dt, targetX, targetZ) {
    const frequency = 2 / settings.inertia;
    const forceX = Math.max(-5, Math.min(5, (targetX - previousX) / dt));
    const forceZ = Math.max(-5, Math.min(5, (targetZ - previousZ) / dt));
    previousX = targetX;
    previousZ = targetZ;
    for (const axis of ['x', 'z']) {
      const target = axis === 'x' ? targetX : targetZ;
      const speed = `v${axis}`;
      slope[speed] += ((target - slope[axis]) * frequency ** 2 - (frequency * 0.9 + settings.damping) * slope[speed]) * dt;
      slope[axis] += slope[speed] * dt;
    }
    // Coupled springs propagate disturbances across the surface; reflecting walls
    // keep wave energy inside the cup. No perpetual decorative oscillation.
    for (let j = 1; j < size - 1; j++) {
      for (let i = 1; i < size - 1; i++) {
        const n = j * size + i;
        if (!active[n]) continue;
        const laplacian =
          (active[n - 1] ? height[n - 1] : height[n]) +
          (active[n + 1] ? height[n + 1] : height[n]) +
          (active[n - size] ? height[n - size] : height[n]) +
          (active[n + size] ? height[n + size] : height[n]) - 4 * height[n];
        const x = i * spacing - extent;
        const z = j * spacing - extent;
        const edge = (x * x + z * z) ** 2;
        const impulse = (forceX * x + forceZ * z) * edge * 1.8;
        velocity[n] += (laplacian * 0.8 / spacing ** 2 - height[n] * 5 - settings.damping * velocity[n] + impulse) * dt;
      }
    }
    for (let n = 0; n < height.length; n++) {
      height[n] += velocity[n] * dt;
    }
  }

  function sample(x, z) {
    const gx = Math.max(0, Math.min(size - 1.001, (x + extent) / spacing));
    const gz = Math.max(0, Math.min(size - 1.001, (z + extent) / spacing));
    const i = Math.floor(gx);
    const j = Math.floor(gz);
    let value = 0;
    let weight = 0;
    for (let dz = 0; dz <= 1; dz++) {
      for (let dx = 0; dx <= 1; dx++) {
        const n = (j + dz) * size + i + dx;
        const w = (dx ? gx - i : 1 - gx + i) * (dz ? gz - j : 1 - gz + j);
        if (active[n]) { value += height[n] * w; weight += w; }
      }
    }
    return slope.x * x + slope.z * z + (weight ? value / weight : 0) * settings.amplitude;
  }

  function reset() {
    height.fill(0);
    velocity.fill(0);
    Object.assign(slope, { x: 0, z: 0, vx: 0, vz: 0 });
    previousX = previousZ = 0;
  }
  return { settings, step, sample, reset };
}
