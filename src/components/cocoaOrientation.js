import { Euler, Quaternion, Vector3, MathUtils } from 'three';

// Relative orientation avoids beta/gamma branch flips near an upright phone.
// Rotation around the screen's normal does not count as a corrective tilt.
export function createCocoaOrientation() {
  const euler = new Euler(0, 0, 0, 'ZXY');
  const baseline = new Quaternion();
  const current = new Quaternion();
  const relative = new Quaternion();
  const normal = new Vector3();
  let calibrated = false;
  function read({ alpha, beta, gamma }, screenDegrees = 0) {
    if (!Number.isFinite(beta) || !Number.isFinite(gamma)) return null;
    euler.set(MathUtils.degToRad(beta), MathUtils.degToRad(gamma), MathUtils.degToRad(Number.isFinite(alpha) ? alpha : 0), 'ZXY');
    current.setFromEuler(euler);
    if (!calibrated) { baseline.copy(current).invert(); calibrated = true; }
    relative.multiplyQuaternions(baseline, current);
    normal.set(0, 0, 1).applyQuaternion(relative);
    const x = MathUtils.radToDeg(Math.atan2(normal.x, normal.z));
    const y = -MathUtils.radToDeg(Math.atan2(normal.y, normal.z));
    const angle = MathUtils.degToRad(screenDegrees);
    return {
      roll: MathUtils.clamp(x * Math.cos(angle) + y * Math.sin(angle), -28, 28),
      pitch: MathUtils.clamp(y * Math.cos(angle) - x * Math.sin(angle), -28, 28),
    };
  }
  return { read, reset() { calibrated = false; } };
}
