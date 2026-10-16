import * as THREE from 'three';

// One connected stream: a wet rim section in mug space, followed by a
// world-space ballistic fall. No transparent overlays or disabled depth tests.
export function createCocoaSpill(scene, mug, chocolateMaterial, { landingY = 0.16 } = {}) {
  const outletCount = 16;
  const ringCount = 65;
  const sides = 12;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(ringCount * sides * 3);
  const indices = [];
  for (let ring = 0; ring < ringCount - 1; ring++) {
    for (let side = 0; side < sides; side++) {
      const a = ring * sides + side;
      const b = ring * sides + (side + 1) % sides;
      const c = a + sides;
      const d = b + sides;
      indices.push(a, b, c, b, d, c);
    }
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setIndex(indices);
  const debugMaterial = new THREE.MeshBasicMaterial({ color: '#ff00ff' });
  const stream = new THREE.Mesh(geometry, chocolateMaterial);
  stream.name = 'cocoa-overflow-stream';
  stream.frustumCulled = false;
  stream.visible = false;
  scene.add(stream);
  const volumes = new Float64Array(outletCount);
  const angles = new Float64Array(outletCount);
  const points = Array.from({ length: ringCount }, () => new THREE.Vector3());
  const times = new Float64Array(ringCount);
  const inverse = new THREE.Matrix4();
  const wetMatrix = new THREE.Matrix4();
  const start = new THREE.Vector3();
  const release = new THREE.Vector3();
  const direction = new THREE.Vector3();
  const releaseVelocity = new THREE.Vector3();
  const tangent = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const binormal = new THREE.Vector3();
  const local = new THREE.Vector3();
  const temp = new THREE.Vector3();
  const emissionPosition = new THREE.Vector3();
  const emissionVelocity = new THREE.Vector3();
  const emissionTangent = new THREE.Vector3();
  let angle = Math.PI / 2;
  let rate = 0;
  let lastRate = 0;
  let quiet = 10;
  let age = 0;
  let time = 0;
  // Emitted liquid keeps its world-space release position and velocity. Only
  // the still-wet head follows the mug; the falling tail cannot rotate with it.
  const history = Array.from({ length: 128 }, () => ({ time: -Infinity, position: new THREE.Vector3(), velocity: new THREE.Vector3(), tangent: new THREE.Vector3() }));
  let historyCursor = -1;
  const wetTime = 0.19;
  const maxFallTime = 0.8;
  const diagnostics = { rate: 0, visible: false, activeRings: 0, minClearance: 0 };

  function addVolume(index, volume, sourceAngle) {
    volumes[index] += volume;
    angles[index] = sourceAngle;
  }
  function step(dt) {
    time += dt;
    let total = 0;
    let strongest = 0;
    for (let i = 0; i < outletCount; i++) {
      total += volumes[i];
      if (volumes[i] > volumes[strongest]) strongest = i;
    }
    if (total > 0.00000001) {
      const nextAngle = angles[strongest];
      const delta = Math.atan2(Math.sin(nextAngle - angle), Math.cos(nextAngle - angle));
      // Never draw a bridge across unrelated opposite sides of the mug.
      if (quiet > 0.06 || Math.abs(delta) > 0.8) {
        age = 0;
        for (const sample of history) sample.time = -Infinity;
      }
      angle = nextAngle;
    }
    if (total > 0.00000001) {
      rate = total / dt;
      lastRate = rate;
      quiet = 0;
      age += dt;
      mug.updateWorldMatrix(true, false);
      wetMatrix.copy(mug.matrixWorld);
      const exitSpeed = Math.max(1.6, rate / (Math.PI * 0.05 ** 2));
      const width = Math.sqrt(rate / (Math.PI * exitSpeed));
      wetPath(wetTime, width, release);
      releaseVelocity.set(0, -1, 0).transformDirection(wetMatrix).multiplyScalar(0.23 / (wetTime * 0.45));
      direction.set(Math.cos(angle), 0, Math.sin(angle)).transformDirection(wetMatrix).multiplyScalar(0.2);
      direction.y -= exitSpeed;
      historyCursor = (historyCursor + 1) % history.length;
      const sample = history[historyCursor];
      sample.time = time;
      sample.position.copy(release); sample.velocity.copy(direction); sample.tangent.copy(releaseVelocity);
    } else {
      quiet += dt;
      age += dt;
      rate = 0;
    }
    volumes.fill(0);
  }

  // Smooth Bezier bridge over the rolled cream lip. The second part tracks
  // the actual outer radius, with only half a stream-width of wet contact.
  function wetPath(t, width, target) {
    const u = THREE.MathUtils.clamp(t / wetTime, 0, 1);
    let r, y;
    if (u <= 0.55) {
      const v = u / 0.55;
      const q = 1 - v;
      r = q ** 3 * 0.958 + 3 * q * q * v * 0.995 + 3 * q * v * v * 1.10 + v ** 3 * (1.09 + width * 0.9);
      y = q ** 3 * 2.075 + 3 * q * q * v * 2.18 + 3 * q * v * v * 2.17 + v ** 3 * 2.04;
    } else {
      const v = (u - 0.55) / 0.45;
      r = 1.09 + width * 0.9;
      y = 2.04 - 0.23 * v;
    }
    return target.set(Math.cos(angle) * r, y, Math.sin(angle) * r).applyMatrix4(wetMatrix);
  }
  function path(t, width, target) {
    if (t <= wetTime) return wetPath(t, width, target);
    const flight = t - wetTime;
    const emittedAt = time - flight;
    let sample = history[historyCursor];
    let newer = sample;
    for (let back = 0; back < history.length; back++) {
      const candidate = history[(historyCursor - back + history.length) % history.length];
      if (!Number.isFinite(candidate.time)) break;
      sample = candidate;
      if (candidate.time <= emittedAt) break;
      newer = candidate;
    }
    const blendHistory = newer.time === sample.time ? 0 : THREE.MathUtils.clamp((emittedAt - sample.time) / (newer.time - sample.time), 0, 1);
    emissionPosition.lerpVectors(sample.position, newer.position, blendHistory);
    emissionVelocity.lerpVectors(sample.velocity, newer.velocity, blendHistory);
    emissionTangent.lerpVectors(sample.tangent, newer.tangent, blendHistory);
    const blend = 0.08;
    const accelerationTime = Math.min(flight, blend);
    target.copy(emissionPosition).addScaledVector(emissionTangent, accelerationTime - accelerationTime ** 2 / (2 * blend));
    target.addScaledVector(emissionVelocity, accelerationTime ** 2 / (2 * blend) + Math.max(0, flight - blend));
    target.y -= 4.905 * flight * flight;
    // Keep falling chocolate outside the solid mug when it leans into the fall.
    local.copy(target).applyMatrix4(inverse);
    const radial = Math.hypot(local.x, local.z);
    const outer = 1.09 + width * 0.9;
    if (local.y > -0.08 && local.y < 2.04 && radial < outer && radial > 0.001) {
      const clearance = THREE.MathUtils.lerp(radial, outer, THREE.MathUtils.smoothstep(local.y, -0.08, 0.35));
      local.x *= clearance / radial;
      local.z *= clearance / radial;
      target.copy(local).applyMatrix4(mug.matrixWorld);
    }
    return target;
  }

  function render() {
    const pouring = quiet === 0;
    const flow = pouring ? rate : lastRate;
    stream.visible = flow > 0.00001 && quiet < maxFallTime;
    diagnostics.visible = stream.visible;
    diagnostics.rate = flow;
    if (!stream.visible) return;
    mug.updateWorldMatrix(true, false);
    inverse.copy(mug.matrixWorld).invert();
    const exitSpeed = Math.max(1.6, flow / (Math.PI * 0.05 ** 2));
    const width = Math.sqrt(flow / (Math.PI * exitSpeed));
    wetPath(wetTime, width, release);
    const beginning = pouring ? 0 : quiet;
    const end = Math.min(age, maxFallTime);
    if (beginning >= end) { stream.visible = false; return; }
    let count = 0;
    for (let i = 0; i < ringCount; i++) {
      const t = THREE.MathUtils.lerp(beginning, end, i / (ringCount - 1));
      path(t, width, points[i]);
      times[i] = t;
      count++;
      if (points[i].y <= landingY && t > wetTime) {
        if (i > 0) {
          const previous = points[i - 1];
          const fraction = THREE.MathUtils.clamp((previous.y - landingY) / (previous.y - points[i].y), 0, 1);
          points[i].lerpVectors(previous, points[i], fraction);
          times[i] = THREE.MathUtils.lerp(times[i - 1], t, fraction);
        }
        break;
      }
    }
    const attribute = geometry.attributes.position;
    // A stable radial reference prevents sudden twists near vertical tangents.
    start.set(-Math.sin(angle), 0, Math.cos(angle)).transformDirection(wetMatrix);
    for (let i = 0; i < count; i++) {
      tangent.copy(points[Math.min(count - 1, i + 1)]).sub(points[Math.max(0, i - 1)]).normalize();
      normal.copy(start).addScaledVector(tangent, -start.dot(tangent)).normalize();
      binormal.crossVectors(tangent, normal).normalize();
      const speed = times[i] <= wetTime ? exitSpeed : Math.sqrt(0.45 ** 2 + (exitSpeed + 9.81 * (times[i] - wetTime)) ** 2);
      let radius = Math.sqrt(flow / (Math.PI * speed));
      radius *= 1 + 0.055 * Math.sin(times[i] * 32 - time * 12);
      // Traveling pinches only in the free-falling tail form elongated drops
      // from the same tube, while the rim and wet section remain connected.
      const freeFall = THREE.MathUtils.smoothstep(release.y - points[i].y, 0.35, 1.0);
      const pinch = THREE.MathUtils.smoothstep(Math.sin((time - times[i]) * 40), -0.45, 0.25);
      radius *= THREE.MathUtils.lerp(1, pinch * 1.25, freeFall);
      if (i === count - 1) radius *= 0.12;
      if (!pouring && i === 0) radius *= 0.12;
      for (let side = 0; side < sides; side++) {
        const theta = side / sides * Math.PI * 2;
        const wetFlatten = THREE.MathUtils.lerp(0.65, 1, THREE.MathUtils.smoothstep(times[i], wetTime, wetTime + 0.08));
        temp.copy(points[i]).addScaledVector(normal, Math.cos(theta) * radius).addScaledVector(binormal, Math.sin(theta) * radius * wetFlatten);
        attribute.setXYZ(i * sides + side, temp.x, temp.y, temp.z);
      }
    }
    // Degenerate unused rings avoid stale normals without reallocating buffers.
    for (let i = count; i < ringCount; i++) {
      for (let side = 0; side < sides; side++) attribute.setXYZ(i * sides + side, points[count - 1].x, points[count - 1].y, points[count - 1].z);
    }
    geometry.setDrawRange(0, Math.max(0, count - 1) * sides * 6);
    attribute.needsUpdate = true;
    geometry.computeVertexNormals();
    diagnostics.activeRings = count;
  }
  function reset() {
    volumes.fill(0);
    rate = lastRate = age = 0;
    historyCursor = -1;
    for (const sample of history) sample.time = -Infinity;
    quiet = 10;
    stream.visible = false;
  }
  function setDebug(enabled) { stream.material = enabled ? debugMaterial : chocolateMaterial; }
  function dispose() { debugMaterial.dispose(); }
  return { outletCount, addVolume, step, render, reset, setDebug, dispose, diagnostics };
}
