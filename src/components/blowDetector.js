const BLOW_RMS_THRESHOLD = 0.085;
const BLOW_FLATNESS_THRESHOLD = 0.48;
const BLOW_CLIP_RATIO_THRESHOLD = 0.012;
const BLOW_SUSTAIN_MS = 400;
const BLOW_COOLDOWN_MS = 900;

// Each microphone session owns its timing state; days share the accepted detection rules.
export function createBlowDetector({
  rmsThreshold = BLOW_RMS_THRESHOLD,
  sustainMs = BLOW_SUSTAIN_MS,
  cooldownMs = BLOW_COOLDOWN_MS,
} = {}) {
  let lastBlow = 0;
  let blowStartedAt = 0;

  return {
    sample(buffer, frequencyBuffer, now) {
      let sum = 0;
      let clippedSamples = 0;
      for (let index = 0; index < buffer.length; index += 1) {
        const centered = (buffer[index] - 128) / 128;
        sum += centered * centered;
        if (Math.abs(centered) > 0.96) clippedSamples += 1;
      }

      const rms = Math.sqrt(sum / buffer.length);
      const clipRatio = clippedSamples / buffer.length;

      // Airflow creates a sustained, broadband noise burst; speech is usually more tonal.
      let magnitudeSum = 0;
      let logMagnitudeSum = 0;
      const startBin = Math.max(1, Math.floor(frequencyBuffer.length * 0.03));
      const endBin = Math.floor(frequencyBuffer.length * 0.42);
      const binCount = endBin - startBin;

      for (let index = startBin; index < endBin; index += 1) {
        const magnitude = frequencyBuffer[index] / 255;
        magnitudeSum += magnitude;
        logMagnitudeSum += Math.log(magnitude + 0.0001);
      }

      const averageMagnitude = magnitudeSum / binCount;
      const spectralFlatness = Math.exp(logMagnitudeSum / binCount) / (averageMagnitude + 0.0001);
      const hasBlowShape =
        rms >= rmsThreshold &&
        (spectralFlatness >= BLOW_FLATNESS_THRESHOLD || clipRatio >= BLOW_CLIP_RATIO_THRESHOLD);

      if (hasBlowShape && blowStartedAt === 0) {
        blowStartedAt = now;
      }

      if (!hasBlowShape) {
        blowStartedAt = 0;
      }

      const confirmed =
        hasBlowShape &&
        now - blowStartedAt >= sustainMs &&
        now - lastBlow > cooldownMs;

      if (confirmed) {
        lastBlow = now;
        blowStartedAt = 0;
      }

      return { isBlowing: hasBlowShape, confirmed };
    },

    reset() {
      lastBlow = 0;
      blowStartedAt = 0;
    },
  };
}
