const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

export const COCOA_GAME_TUNING = Object.freeze({ strength: 1.5, frequency: .5, recovery: .1,
  damping: 0, maxAngularVelocity: 10, angularRampDelay: 20, angularRampSeconds: 40, angularRampEnd: 60,
  gentleSeconds: 20, gentleTorque: .35, gentleRecovery: 1.2 });

export function cocoaAngularSpeedLimit(settings, elapsed) {
  const start = Math.max(0, settings.maxAngularVelocity);
  if (!settings.angularRampSeconds) return start;
  const progress = clamp(Math.max(0, elapsed - (settings.angularRampDelay || 0)) / settings.angularRampSeconds, 0, 1);
  return start + (Math.max(start, settings.angularRampEnd) - start) * progress;
}

export function createCocoaDisturbances(overrides = {}) {
  // Torque is expressed as angular acceleration (deg/s²) for unit inertia.
  // A modest 8° counter-tilt can arrest capped spin in about 0.4 s, rather
  // than letting the mug travel another 17° before the player can reverse it.
  const settings = { strength: 1, frequency: 1, recovery: 1.1, damping: 0.28, maxAngularVelocity: 32, playerTorque: 10, ...overrides };
  const state = { elapsed: 0, roll: 0, pitch: 0, velocityRoll: 0, velocityPitch: 0, disturbanceRoll: 0, disturbancePitch: 0 };
  let phase = 0;
  let resting = 3;
  let pulse = null;
  let seed = 9147;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  function integrate(input, dt) {
    state.elapsed += dt;
    const gentle = settings.gentleSeconds
      ? 1 - clamp((state.elapsed - settings.gentleSeconds) / (settings.angularRampSeconds || 40), 0, 1)
      : 0;
    const progress = clamp((state.elapsed - (settings.gentleSeconds || 3)) / 75, 0, 1);
    if (!pulse) {
      resting -= dt * settings.frequency;
      if (resting <= 0) {
        // Some pushes favor one axis; others act diagonally on both.
        const angle = random() * Math.PI * 2;
        pulse = {
          angle,
          amplitude: (7 + progress * 31) * (0.8 + random() * 0.4),
          duration: (2.2 - progress * 1.0) * (0.8 + random() * 0.4),
        };
        phase = 0;
      }
    }
    state.disturbanceRoll = state.disturbancePitch = 0;
    if (pulse) {
      phase = Math.min(1, phase + dt / pulse.duration);
      const magnitude = pulse.amplitude * settings.strength * (1 - gentle * (1 - (settings.gentleTorque ?? 1))) * Math.sin(Math.PI * phase) ** 2;
      state.disturbanceRoll = Math.cos(pulse.angle) * magnitude;
      state.disturbancePitch = Math.sin(pulse.angle) * magnitude;
      if (phase >= 1) {
        pulse = null;
        resting = (settings.recovery + gentle * (settings.gentleRecovery || 0)) * (2.2 - progress * 1.9) * (0.8 + random() * 0.4);
      }
    }
    // No orientation target or centering spring: neutral input only damps spin.
    const damping = Math.max(0, settings.damping);
    const decay = Math.exp(-damping * dt);
    const response = damping > 0 ? (1 - decay) / damping : dt;
    for (const [axis, velocity, torque] of [
      ['roll', 'velocityRoll', 'disturbanceRoll'],
      ['pitch', 'velocityPitch', 'disturbancePitch'],
    ]) {
      const acceleration = state[torque] + clamp(input[axis], -28, 28) * settings.playerTorque;
      state[velocity] = state[velocity] * decay + acceleration * response;
    }
    const speed = Math.hypot(state.velocityRoll, state.velocityPitch);
    const limit = cocoaAngularSpeedLimit(settings, state.elapsed);
    if (speed > limit) {
      state.velocityRoll *= limit / speed;
      state.velocityPitch *= limit / speed;
    }
    for (const [axis, velocity] of [['roll', 'velocityRoll'], ['pitch', 'velocityPitch']]) {
      state[axis] += state[velocity] * dt;
    }
    // Bound both angles together: independent axis limits allowed diagonal
    // poses almost horizontal to gravity. This keeps actual 3D tilt at ≤60°.
    // At the stop, only outward spin is lost; tangent/inward momentum survives.
    const tilt = Math.hypot(state.roll, state.pitch);
    if (tilt > 60) {
      const normalRoll = state.roll / tilt;
      const normalPitch = state.pitch / tilt;
      state.roll = normalRoll * 60;
      state.pitch = normalPitch * 60;
      const outwardSpeed = state.velocityRoll * normalRoll + state.velocityPitch * normalPitch;
      if (outwardSpeed > 0) {
        state.velocityRoll -= outwardSpeed * normalRoll;
        state.velocityPitch -= outwardSpeed * normalPitch;
      }
    }
  }
  function step(input, dt) {
    // Bound integration steps so torque remains smooth at lower frame rates.
    let remaining = Math.max(0, dt);
    while (remaining > 1e-9) {
      const slice = Math.min(remaining, 1 / 120);
      integrate(input, slice);
      remaining -= slice;
    }
    return state;
  }
  function reset() {
    for (const key of Object.keys(state)) state[key] = 0;
    phase = 0;
    resting = 3;
    pulse = null;
    seed = 9147;
  }
  return { settings, state, step, reset };
}
