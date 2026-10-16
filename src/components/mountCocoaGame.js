import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createCocoaLiquid } from '../previews/cocoaLiquid.js';
import { createCocoaSpill } from '../previews/cocoaSpill.js';
import { createCocoaDisturbances, COCOA_GAME_TUNING } from './cocoaDisturbances.js';
import { createCocoaOrientation } from './cocoaOrientation.js';
import { COCOA_INITIAL_FILL, cocoaAttemptFinished, cocoaSpillProgress, cocoaRemainingAllowance } from './cocoaChallenge.js';

export function mountCocoaGame(host, ui, onStats = () => {}) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  } catch {
    ui.querySelector('#error').hidden = false;
    return () => {};
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  renderer.setClearColor(0x000000, 0);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 60);
  // Presentation only: enlarge and lower the view without scaling the simulation.
  camera.zoom = 1.2;
  const cameraTarget = new THREE.Vector3(0.2, 1.05, 0);
  const liquid = createCocoaLiquid();
  const input = { roll: 0, pitch: 0 };
  const disturbances = createCocoaDisturbances(COCOA_GAME_TUNING);
  let started = false;
  let paused = false;
  let lastStats = 0;
  const abort = new AbortController();
  const listen = (target, name, handler) => target?.addEventListener(name, handler, { signal: abort.signal });

  // A small procedural studio environment supplies broad ceramic reflections.
  const studio = new RoomEnvironment();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(studio, 0.07);
  scene.environment = environment.texture;
  scene.environmentIntensity = 0.65;
  studio.dispose();
  pmrem.dispose();

  scene.add(new THREE.HemisphereLight('#fff2d7', '#477d6c', 1.4));
  const key = new THREE.DirectionalLight('#fff0d8', 3.2);
  key.position.set(-3, 6, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -4;
  key.shadow.camera.right = 4;
  key.shadow.camera.top = 4;
  key.shadow.camera.bottom = -4;
  key.shadow.camera.near = 0.1;
  key.shadow.camera.far = 15;
  key.shadow.normalBias = 0.025;
  key.shadow.bias = -0.0002;
  key.shadow.radius = 4;
  scene.add(key);
  const fill = new THREE.DirectionalLight('#c6e5ff', 1.1);
  fill.position.set(4, 3, -3);
  scene.add(fill);

  const red = new THREE.MeshPhysicalMaterial({
    color: '#b92235', roughness: 0.29, metalness: 0,
    clearcoat: 0.65, clearcoatRoughness: 0.24,
  });
  const cream = new THREE.MeshPhysicalMaterial({
    color: '#fff0d5', roughness: 0.32, clearcoat: 0.45, clearcoatRoughness: 0.28,
  });
  const cocoa = new THREE.MeshPhysicalMaterial({
    color: '#482013', roughness: 0.21, metalness: 0,
    clearcoat: 0.8, clearcoatRoughness: 0.16,
  });

  function mesh(geometry, material, parent = scene) {
    const object = new THREE.Mesh(geometry, material);
    object.castShadow = true;
    object.receiveShadow = true;
    parent.add(object);
    return object;
  }
  function lathe(profile, material, parent = scene) {
    const curve = new THREE.SplineCurve(profile.map(([r, y]) => new THREE.Vector2(r, y)));
    const object = mesh(new THREE.LatheGeometry(curve.getPoints(100), 80), material, parent);
    object.userData.profile = curve.getPoints(400);
    return object;
  }

  const mug = new THREE.Group();
  mug.position.y = 0.12;
  scene.add(mug);
  // Closed, thick ceramic shell, including its inner wall and rolled rim.
  const shell = lathe([
    [0, 0.035], [0.66, 0.035], [0.81, 0.07], [0.9, 0.19],
    [0.98, 0.46], [1.065, 1.3], [1.085, 1.95],
    [1.083, 2.055], [1.055, 2.095], [1.005, 2.105],
    [0.966, 2.075], [0.957, 2.02], [0.96, 1.93],
    [0.935, 1.3], [0.86, 0.51], [0.76, 0.29], [0, 0.27],
  ], cream, mug);
  const innerWall = shell.userData.profile.slice(275).filter(point => point.y >= 0.3).sort((a, b) => a.y - b.y);
  function innerRadius(y) {
    for (let i = 1; i < innerWall.length; i++) {
      if (innerWall[i].y >= y) {
        const low = innerWall[i - 1];
        const high = innerWall[i];
        const t = THREE.MathUtils.clamp((y - low.y) / (high.y - low.y), 0, 1);
        return THREE.MathUtils.lerp(low.x, high.x, t) - 0.002;
      }
    }
    return innerWall.at(-1).x - 0.002;
  }
  // Matching exterior profile ends below the cream lip.
  lathe([
    [0.67, 0.034], [0.812, 0.068], [0.903, 0.19],
    [0.983, 0.46], [1.068, 1.3], [1.088, 1.95],
    [1.087, 1.977],
  ], red, mug);

  // Open outer arc: the old full torus crossed the inner wall, and spherical
  // attachment pieces produced bumps. Both ends now terminate within the shell.
  const handlePath = new THREE.CubicBezierCurve3(
    new THREE.Vector3(1.04, 1.70, 0),
    new THREE.Vector3(2.12, 1.96, 0),
    new THREE.Vector3(2.12, 0.34, 0),
    new THREE.Vector3(1.00, 0.60, 0),
  );
  mesh(new THREE.TubeGeometry(handlePath, 64, 0.15, 20, false), red, mug);

  const star = new THREE.Shape();
  for (let i = 0; i < 10; i += 1) {
    const angle = Math.PI / 2 + i * Math.PI / 5;
    const radius = i % 2 === 0 ? 0.21 : 0.105;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) star.moveTo(x, y); else star.lineTo(x, y);
  }
  star.closePath();
  const starGeometry = new THREE.ExtrudeGeometry(star, {
    depth: 0.007, bevelEnabled: true, bevelSize: 0.009,
    bevelThickness: 0.006, bevelSegments: 2, steps: 1,
  });
  for (const angle of [-0.58, 0, 0.58]) {
    const ornament = mesh(starGeometry, cream, mug);
    ornament.position.set(Math.sin(angle) * 1.06, angle === 0 ? 1.12 : 1.0, Math.cos(angle) * 1.06);
    ornament.rotation.y = angle;
    if (angle !== 0) ornament.scale.setScalar(0.72);
  }
  const dotGeometry = new THREE.SphereGeometry(0.035, 12, 8);
  for (const angle of [-0.82, -0.3, 0.3, 0.82]) {
    const dot = mesh(dotGeometry, cream, mug);
    dot.position.set(Math.sin(angle) * 1.04, 0.73, Math.cos(angle) * 1.04);
    dot.scale.y = 0.9;
  }

  // A polar grid keeps even the animated surface entirely inside the inner wall.
  const liquidGeometry = new THREE.BufferGeometry();
  const positions = [0, 0, 0];
  const indices = [];
  const rings = 18;
  const segments = 64;
  const radius = 0.95;
  for (let ring = 1; ring <= rings; ring += 1) {
    for (let segment = 0; segment < segments; segment += 1) {
      const angle = segment / segments * Math.PI * 2;
      positions.push(radius * ring / rings * Math.cos(angle), 0, radius * ring / rings * Math.sin(angle));
    }
  }
  for (let segment = 0; segment < segments; segment += 1) {
    indices.push(0, 1 + (segment + 1) % segments, 1 + segment);
  }
  for (let ring = 1; ring < rings; ring += 1) {
    const inner = 1 + (ring - 1) * segments;
    const outer = inner + segments;
    for (let segment = 0; segment < segments; segment += 1) {
      const next = (segment + 1) % segments;
      indices.push(inner + segment, inner + next, outer + segment);
      indices.push(inner + next, outer + next, outer + segment);
    }
  }
  liquidGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  liquidGeometry.setIndex(indices);
  liquidGeometry.computeVertexNormals();
  const chocolate = mesh(liquidGeometry, cocoa, mug);
  chocolate.castShadow = false;
  chocolate.frustumCulled = false;
  liquidGeometry.attributes.position.setUsage(THREE.DynamicDrawUsage);
  const spill = createCocoaSpill(scene, mug, cocoa, { landingY: -4 });
  const spillContinuous = ui.querySelector('#spill-continuous');
  const spillMagenta = ui.querySelector('#spill-magenta');
  const spillRate = ui.querySelector('#spill-rate');
  listen(spillMagenta, 'change', () => spill.setDebug(spillMagenta.checked));
  const outletWeights = new Float32Array(spill.outletCount);
  const outletAngles = new Float32Array(spill.outletCount);

  let fillLevel = COCOA_INITIAL_FILL;
  let rimReached = false;
  let sensorActive = false;
  const orientationInput = createCocoaOrientation();
  let lastOrientation = null;
  let accelerationX = 0;
  let accelerationZ = 0;
  let drag = null;
  let preset = null;
  let accumulator = 0;
  let previousTime = null;
  const status = ui.querySelector('#liquid-status');
  const rollControl = ui.querySelector('#tilt-roll');
  const pitchControl = ui.querySelector('#tilt-pitch');
  const inverse = new THREE.Quaternion();
  const gravity = new THREE.Vector3();
  const cue = ui.querySelector('#disturbance-cue');
  for (const property of ['strength', 'frequency', 'recovery', 'damping', 'maxAngularVelocity']) {
    listen(ui.querySelector(`#disturbance-${property}`), 'input', event => { disturbances.settings[property] = Number(event.target.value); });
  }
  const clampTilt = value => THREE.MathUtils.clamp(value, -28, 28);
  function syncTiltControls() {
    if (rollControl) rollControl.value = input.roll;
    if (pitchControl) pitchControl.value = input.pitch;
  }
  function manualInput() {
    started = true;
    sensorActive = false;
    preset = null;
    accelerationX = accelerationZ = 0;
  }
  for (const [control, axis] of [[rollControl, 'roll'], [pitchControl, 'pitch']]) {
    listen(control, 'input', () => { manualInput(); input[axis] = Number(control.value); });
  }
  for (const property of ['inertia', 'amplitude', 'damping']) {
    listen(ui.querySelector(`#${property}`), 'input', event => {
      liquid.settings[property] = Number(event.target.value);
    });
  }
  listen(renderer.domElement, 'pointerdown', event => {
    if (!event.isPrimary || event.button !== 0) return;
    // A phone touch must not silently switch off already-authorized sensors.
    if (sensorActive) return;
    manualInput();
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, ...input };
    renderer.domElement.setPointerCapture(event.pointerId);
  });
  listen(renderer.domElement, 'pointermove', event => {
    if (!drag || drag.id !== event.pointerId) return;
    input.roll = clampTilt(drag.roll + (event.clientX - drag.x) * 0.17);
    input.pitch = clampTilt(drag.pitch + (event.clientY - drag.y) * 0.17);
    syncTiltControls();
  });
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    listen(renderer.domElement, name, event => {
      if (drag?.id === event.pointerId) drag = null;
    });
  }
  function reset() {
    preset = null;
    drag = null;
    orientationInput.reset();
    if (lastOrientation) orientationInput.read(lastOrientation, window.screen.orientation?.angle ?? window.orientation ?? 0);
    input.roll = input.pitch = 0;
    accelerationX = accelerationZ = 0;
    mug.rotation.set(0, 0, 0);
    mug.position.y = 0.12;
    fillLevel = COCOA_INITIAL_FILL;
    rimReached = false;
    disturbances.reset();
    liquid.reset();
    spill.reset();
    if (spillContinuous) spillContinuous.checked = false;
    syncTiltControls();
    accumulator = 0; previousTime = null;
    onStats({ elapsed: 0, spill: 0 });
  }
  listen(ui.querySelector('#reset-cup'), 'click', reset);
  ui.querySelectorAll('[data-motion]').forEach(button => {
    listen(button, 'click', () => {
      manualInput();
      reset();
      preset = { type: button.dataset.motion, start: performance.now() / 1000 };
    });
  });

  const sensorButton = ui.querySelector('#enable-sensors');
  const sensorStatus = ui.querySelector('#sensor-status');
  async function activateSensors(automatic = false) {
    if (sensorButton.disabled || abort.signal.aborted) return;
    if (sensorActive) {
      orientationInput.reset();
      if (lastOrientation) orientationInput.read(lastOrientation, window.screen.orientation?.angle ?? window.orientation ?? 0);
      input.roll = input.pitch = 0;
      syncTiltControls();
      return;
    }
    if (!window.isSecureContext) {
      sensorStatus.textContent = 'Los sensores requieren HTTPS (o localhost).';
      return;
    }
    if (!window.DeviceOrientationEvent) {
      sensorStatus.textContent = 'Este navegador no ofrece sensores de orientación.';
      return;
    }
    sensorButton.disabled = true;
    try {
      // Attempt immediately on opening; a button retries in a user gesture
      // on browsers that reject permission requests without one.
      const orientationRequest = typeof DeviceOrientationEvent.requestPermission === 'function'
        ? DeviceOrientationEvent.requestPermission() : Promise.resolve('granted');
      const motionRequest = typeof window.DeviceMotionEvent?.requestPermission === 'function'
        ? DeviceMotionEvent.requestPermission() : Promise.resolve('granted');
      const [orientation, motion] = await Promise.allSettled([orientationRequest, motionRequest]);
      if (abort.signal.aborted) return;
      if (orientation.status !== 'fulfilled' || orientation.value !== 'granted') throw new Error('permission');
      preset = null;
      orientationInput.reset();
      lastOrientation = null;
      input.roll = input.pitch = 0;
      sensorActive = true;
      sensorStatus.textContent = motion.status === 'fulfilled' && motion.value === 'granted'
        ? 'Esperando datos de orientación…' : 'Movimiento no autorizado; usando orientación.';
    } catch {
      if (abort.signal.aborted) return;
      sensorStatus.textContent = automatic
        ? 'Toca «Activar movimiento» para permitir el acceso a los sensores.'
        : 'No se autorizó la orientación. Puedes volver a intentar o arrastrar la taza.';
    } finally {
      sensorButton.disabled = false;
    }
  }
  listen(sensorButton, 'click', () => activateSensors());
  // Skip a discarded Strict Mode mount, but do not wait for a touch to request.
  queueMicrotask(() => { if (!abort.signal.aborted) void activateSensors(true); });
  const screenAngle = () => THREE.MathUtils.degToRad(window.screen.orientation?.angle ?? window.orientation ?? 0);
  listen(window, 'deviceorientation', event => {
    if (!sensorActive || !Number.isFinite(event.beta) || !Number.isFinite(event.gamma)) return;
    started = true;
    lastOrientation = { alpha: event.alpha, beta: event.beta, gamma: event.gamma };
    Object.assign(input, orientationInput.read(lastOrientation, window.screen.orientation?.angle ?? window.orientation ?? 0));
    sensorStatus.textContent = '';
    syncTiltControls();
  });
  listen(window, 'devicemotion', event => {
    if (!sensorActive) return;
    const { x, y } = event.acceleration ?? {};
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    const angle = screenAngle();
    accelerationX = THREE.MathUtils.clamp(x * Math.cos(angle) + y * Math.sin(angle), -4, 4);
    accelerationZ = THREE.MathUtils.clamp(y * Math.cos(angle) - x * Math.sin(angle), -4, 4);
  });
  listen(window, 'orientationchange', () => { orientationInput.reset(); input.roll = input.pitch = 0; });

  function step(dt, seconds) {
    if (preset) {
      const elapsed = seconds - preset.start;
      if (preset.type === 'slow') {
        input.roll = 10 * Math.sin(Math.min(elapsed / 8, 1) * Math.PI * 2);
        input.pitch = 5 * Math.sin(Math.min(elapsed / 8, 1) * Math.PI * 2);
        if (elapsed >= 8) preset = null;
      } else if (preset.type === 'sudden') {
        input.roll = elapsed < 0.4 ? 0 : 16;
        input.pitch = 0;
        if (elapsed > 0.6) preset = null;
      } else {
        input.roll = elapsed < 3 ? (Math.floor(elapsed / 0.35) % 2 ? -14 : 14) : 0;
        input.pitch = elapsed < 3 ? 5 * Math.sin(elapsed * 6) : 0;
        if (elapsed >= 3) preset = null;
      }
      syncTiltControls();
    }
    const finished = cocoaAttemptFinished(fillLevel);
    const pose = started && !finished ? disturbances.step(input, dt) : disturbances.state;
    mug.rotation.x = THREE.MathUtils.degToRad(pose.pitch);
    mug.rotation.z = -THREE.MathUtils.degToRad(pose.roll);
    // Rotate about the floating mug's center, without bobbing on an absent saucer.
    mug.position.set(0, 1.17, 0).sub(new THREE.Vector3(0, 1.05, 0).applyQuaternion(mug.quaternion));
    cue.style.setProperty('--cue-x', `${pose.disturbanceRoll * 1.7}px`);
    cue.style.setProperty('--cue-y', `${pose.disturbancePitch * 1.7}px`);
    cue.style.opacity = String(Math.min(0.7, Math.hypot(pose.disturbanceRoll, pose.disturbancePitch) / 20));
    inverse.copy(mug.quaternion).invert();
    gravity.set(-accelerationX, -9.81, accelerationZ).applyQuaternion(inverse);
    const vertical = Math.min(-1, gravity.y);
    liquid.step(dt, -gravity.x / vertical, -gravity.z / vertical);
    // Only liquid actually reaching the perimeter can leave the cup. Interior
    // wave crests no longer silently lower the fill level.
    outletWeights.fill(0);
    let maxOverflow = 0;
    let totalWeight = 0;
    for (let segment = 0; segment < segments; segment++) {
      const angle = segment / segments * Math.PI * 2;
      const rimRadius = innerRadius(2.075);
      const depth = Math.max(0, fillLevel + liquid.sample(rimRadius * Math.cos(angle), rimRadius * Math.sin(angle)) - 2.075);
      const outlet = Math.floor(segment / segments * spill.outletCount);
      const weight = depth ** 1.5;
      if (weight > outletWeights[outlet]) {
        outletWeights[outlet] = weight;
        outletAngles[outlet] = angle;
      }
      maxOverflow = Math.max(maxOverflow, depth);
    }
    for (const weight of outletWeights) totalWeight += weight;
    if (totalWeight > 0) {
      // Drain only what the visible stream carries now: no queued chocolate
      // that keeps pouring from a stale rim after the cup has moved.
      const heightLost = Math.min(maxOverflow * (1 - Math.exp(-12 * dt)), 0.32 * dt / (Math.PI * radius ** 2), cocoaRemainingAllowance(fillLevel));
      const volumeLost = Math.PI * radius ** 2 * heightLost;
      fillLevel -= heightLost;
      rimReached = true;
      for (let i = 0; i < spill.outletCount; i++) {
        if (outletWeights[i] > 0) spill.addVolume(i, volumeLost * outletWeights[i] / totalWeight, outletAngles[i]);
      }
    }
    if (spillContinuous?.checked) {
      // Isolated rendering fixture: a known front-facing rim point, no sensors
      // and no synthetic changes to the liquid simulation or fill level.
      spill.addVolume(4, Number(spillRate.value) * dt, Math.PI / 2);
    }
    spill.step(dt);
    accelerationX *= Math.exp(-dt * 5);
    accelerationZ *= Math.exp(-dt * 5);
  }

  function updateSurface() {
    const attribute = liquidGeometry.attributes.position;
    attribute.setXYZ(0, 0, fillLevel + liquid.sample(0, 0), 0);
    for (let segment = 0; segment < segments; segment++) {
      const angle = segment / segments * Math.PI * 2;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      let edgeRadius = radius;
      for (let iteration = 0; iteration < 4; iteration++) {
        edgeRadius = innerRadius(Math.min(2.075, fillLevel + liquid.sample(edgeRadius * cos, edgeRadius * sin)));
      }
      // At steep angles the free surface meets the cup floor before its side.
      // Shorten that radial strip instead of drawing chocolate through the base.
      if (fillLevel + liquid.sample(edgeRadius * cos, edgeRadius * sin) < 0.28) {
        let low = 0, high = edgeRadius;
        for (let iteration = 0; iteration < 10; iteration++) {
          const middle = (low + high) / 2;
          if (fillLevel + liquid.sample(middle * cos, middle * sin) < 0.28) high = middle;
          else low = middle;
        }
        edgeRadius = low;
      }
      for (let ring = 1; ring <= rings; ring++) {
        const r = edgeRadius * ring / rings;
        const x = r * cos;
        const z = r * sin;
        const surfaceY = fillLevel + liquid.sample(x, z);
        // At an overflowing edge the surface bends into the pour, instead of
        // hanging above the ceramic while the finite outflow drains it.
        const edgeBlend = THREE.MathUtils.smoothstep(ring / rings, 0.82, 1);
        const y = THREE.MathUtils.clamp(surfaceY - Math.max(0, surfaceY - 2.075) * edgeBlend, 0.28, 2.075);
        const containedRadius = Math.min(r, innerRadius(y));
        attribute.setXYZ(1 + (ring - 1) * segments + segment, containedRadius * cos, y, containedRadius * sin);
      }
    }
    attribute.needsUpdate = true;
    liquidGeometry.computeVertexNormals();
    if (status) status.textContent = `${input.roll.toFixed(1)}° / ${input.pitch.toFixed(1)}° · ${rimReached ? 'Chocolate derramado · reiniciar para rellenar' : 'Chocolate contenido'}`;
    sensorButton.setAttribute('aria-pressed', String(sensorActive));
    sensorButton.hidden = sensorActive;
    sensorButton.textContent = 'Activar movimiento';
  }

  function resize() {
    const width = host.clientWidth;
    const height = host.clientHeight;
    camera.aspect = width / height;
    camera.setViewOffset(width, height, 0, -height * 0.12, width, height);
    camera.updateProjectionMatrix();
    const direction = new THREE.Vector3(2.8, 3.5, 6.5).normalize();
    camera.position.copy(cameraTarget).addScaledVector(direction, Math.max(7.8, 5.6 / camera.aspect));
    camera.lookAt(cameraTarget);
    renderer.setSize(width, height);
  }
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();

  listen(document, 'visibilitychange', () => { paused = document.hidden; previousTime = null; accumulator = 0; });
  renderer.setAnimationLoop(time => {
    if (paused) return;
    const seconds = time / 1000;
    accumulator += previousTime === null ? 0 : Math.min((time - previousTime) / 1000, 0.05);
    previousTime = time;
    while (accumulator >= 1 / 120) {
      step(1 / 120, seconds);
      accumulator -= 1 / 120;
    }
    updateSurface();
    spill.render();
    renderer.render(scene, camera);
    if (time - lastStats > 100) {
      lastStats = time;
      onStats({ elapsed: disturbances.state.elapsed, spill: cocoaSpillProgress(fillLevel) });
    }
  });

  return () => {
    renderer.setAnimationLoop(null);
    observer.disconnect();
    abort.abort();
    spill.dispose();
    const geometries = new Set();
    const materials = new Set();
    scene.traverse(object => {
      if (object.geometry) geometries.add(object.geometry);
      if (object.material) materials.add(object.material);
    });
    geometries.forEach(geometry => geometry.dispose());
    materials.forEach(material => material.dispose());
    environment.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  };
}
