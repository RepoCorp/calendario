// Shared simulation values drive the liquid, warning, and actual loss together.
export const COCOA_RIM_ANGLE = 7;
export const COCOA_OVERFLOW_DELAY = 0.7;
const MAX_SPILL_RATE = 12;
const INPUT_GAIN = 0.8;
const HAND_NOISE_DEGREES = 0.8;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function getCocoaSway(seconds) {
  const time = Math.max(0, seconds - 2);
  const ramp = Math.min(1, time / 3);
  const envelope = ramp * ramp * (3 - 2 * ramp);
  return {
    x: 10 * Math.sin(time * Math.PI / 7) * envelope,
    y: 3 * Math.sin(time * Math.PI / 14) * envelope,
  };
}

export function createCocoaBalance() {
  return {
    elapsed: 0,
    tilt: { x: 0, y: 0 },
    liquidTilt: { x: 0, y: 0 },
    overflowSeconds: 0,
    warning: 0,
    spillRate: 0,
    spill: 0,
    gameOver: false,
  };
}

export function stepCocoaBalance(current, input, deltaSeconds) {
  if (current.gameOver) return current;
  const dt = clamp(deltaSeconds, 0, 0.05);
  const elapsed = current.elapsed + dt;
  const follow = 1 - Math.exp(-dt / 0.14);
  const tilt = {
    x: current.tilt.x + (clamp(input.x || 0, -24, 24) - current.tilt.x) * follow,
    y: current.tilt.y + (clamp(input.y || 0, -24, 24) - current.tilt.y) * follow,
  };
  const inputMagnitude = Math.hypot(tilt.x, tilt.y);
  const sensitivity = INPUT_GAIN * Math.max(0, 1 - HAND_NOISE_DEGREES / (inputMagnitude || 1));
  const sway = getCocoaSway(elapsed);
  const liquidFollow = 1 - Math.exp(-dt / 0.22);
  const liquidTilt = {
    x: current.liquidTilt.x + (sway.x + tilt.x * sensitivity - current.liquidTilt.x) * liquidFollow,
    y: current.liquidTilt.y + (sway.y + tilt.y * sensitivity - current.liquidTilt.y) * liquidFollow,
  };
  const magnitude = Math.hypot(liquidTilt.x, liquidTilt.y);
  const overflowSeconds = magnitude > COCOA_RIM_ANGLE ? current.overflowSeconds + dt : 0;
  // Charge only the portion of this frame after the warning grace period.
  const spillingSeconds = Math.max(0, overflowSeconds - Math.max(current.overflowSeconds, COCOA_OVERFLOW_DELAY));
  const spillRate = overflowSeconds > COCOA_OVERFLOW_DELAY
    ? Math.min(MAX_SPILL_RATE, (magnitude - COCOA_RIM_ANGLE) * 2.4)
    : 0;
  const spill = Math.min(100, current.spill + spillRate * spillingSeconds);
  return {
    elapsed, tilt, liquidTilt, overflowSeconds,
    warning: clamp((magnitude - 3) / (COCOA_RIM_ANGLE - 3), 0, 1),
    spillRate: spill === 100 ? 0 : spillRate,
    spill,
    gameOver: spill === 100,
  };
}
