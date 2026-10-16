export function createReturnTiming() {
  return { count: 0, meanMs: 0, lastOpeningTap: -Infinity, firstReturn: null, drift: null };
}
// Keep the opening reference independent of the all-taps debug average. Silence
// and later taps must never change the baseline used for this round.
export function recordReturnTiming(state, at, { beat, muteAt, returnAt }) {
  if (at >= 0 && at < muteAt && at - state.lastOpeningTap >= beat * .45) {
    const nearest = Math.round(at / beat) * beat;
    const offsetMs = (at - nearest) * 1000;
    state.count++;
    state.meanMs += (offsetMs - state.meanMs) / state.count;
    state.lastOpeningTap = at;
  }
  if (at >= muteAt && state.count) {
    if (!state.drift) {
      const phase = beatOffset(state.lastOpeningTap, beat, state.meanMs);
      state.drift = { at: state.lastOpeningTap, phaseMs: phase, totalMs: phase,
        skipped: 0, uncertain: false };
    }
    trackDrift(state.drift, at, beat, state.meanMs);
  }
  // Deliberately the first tap AT OR AFTER return, not the closest tap on
  // either side. Leave the game's existing closest-beat score untouched.
  if (at >= returnAt && state.firstReturn === null) {
    const rawMs = (at - returnAt) * 1000;
    state.firstReturn = { rawMs, adjustedMs: state.count ? rawMs - state.meanMs : null,
      baselineMs: state.count ? state.meanMs : null, count: state.count,
      nearestMs: beatOffset(at, beat, state.meanMs),
      beatFromReturn: Math.round((at - state.meanMs / 1000) / beat) - Math.round(returnAt / beat),
      driftMs: state.drift?.totalMs ?? null, uncertain: state.drift?.uncertain ?? true };
  }
  return state;
}

function wrap(value, period) {
  return value - Math.round(value / period) * period;
}
function beatOffset(at, beat, baselineMs) {
  return wrap(at * 1000 - baselineMs, beat * 1000);
}
// Phase unwrapping: follow small changes in offset rather than counting taps.
// An exact skipped beat changes the gap but not the phase or accumulated drift.
function trackDrift(drift, at, beat, baselineMs) {
  const gap = at - drift.at;
  if (gap < beat * .45) return;
  const period = beat * 1000;
  const phase = beatOffset(at, beat, baselineMs);
  const change = wrap(phase - drift.phaseMs, period);
  drift.totalMs += change;
  drift.skipped += Math.max(0, Math.round((gap * 1000 - change) / period) - 1);
  // Whole-cycle changes during a long gap are unobservable. Keep this a
  // best-effort estimate, never silently claim certainty about lost beats.
  drift.uncertain ||= gap > beat * 2.5 || Math.abs(change) > period * .35;
  drift.at = at;
  drift.phaseMs = phase;
}
