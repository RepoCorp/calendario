// Map a pointer timestamp to the audio output clock. Keep diagnostics alongside
// the value so device-specific latency errors can be investigated, not calibrated
// away from a player's taps.
export function sampleAudioClock(context, performanceMs, now, resumedAt = 0) {
  const raw = context.currentTime + (performanceMs - now) / 1000;
  const stamp = context.getOutputTimestamp?.();
  const outputTimestamp = Number.isFinite(stamp?.contextTime) && stamp.contextTime > 0
    && Number.isFinite(stamp?.performanceTime) && stamp.performanceTime > resumedAt;
  const baseLatency = context.baseLatency || 0;
  const outputLatency = context.outputLatency || 0;
  const at = outputTimestamp
    ? stamp.contextTime + (performanceMs - stamp.performanceTime) / 1000
    : raw - baseLatency - outputLatency;
  return { at, raw, method: outputTimestamp ? 'output' : 'estimated',
    correctionMs: Math.round((raw - at) * 1000),
    eventDelayMs: Math.round(now - performanceMs),
    baseLatencyMs: Math.round(baseLatency * 1000), outputLatencyMs: Math.round(outputLatency * 1000) };
}
