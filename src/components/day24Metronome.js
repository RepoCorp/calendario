// Offline diagnostic track: sample-aligned clicks, no timers or animation clock.
export function writeMetronome(samples, sampleRate, tempoBpm, durationSeconds) {
  const beatSeconds = 60 / tempoBpm;
  const clickFrames = Math.round(sampleRate * .025);
  for (let beat = 0; beat * beatSeconds < durationSeconds; beat++) {
    const start = Math.round(beat * beatSeconds * sampleRate);
    for (let i = 0; i < clickFrames && start + i < samples.length; i++) {
      const t = i / sampleRate;
      const attack = Math.min(1, i / Math.max(1, sampleRate * .0005));
      samples[start + i] = .6 * attack * Math.exp(-t / .004)
        * Math.sin(2 * Math.PI * 1700 * t);
    }
  }
}
