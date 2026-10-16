// Shchedryk, bars 13–20: quarter, eighth, eighth, quarter in each bar.
// https://s9.imslp.org/files/imglnks/usimg/9/9b/IMSLP818766-PMLP308563-Leontovych_-_Shchedryk_SATB_2022-10-30.pdf
const LOW_MOTIF = [466.16, 440, 466.16, 392]; // Bb4, A4, Bb4, G4
const HIGH_MOTIF = [587.33, 523.25, 587.33, 466.16]; // D5, C5, D5, Bb4

export const BELL_MELODY = [
  ...Array.from({ length: 4 }, () => LOW_MOTIF).flat(),
  ...Array.from({ length: 4 }, () => HIGH_MOTIF).flat(),
];

const BAR_RHYTHM = [2, 1, 1, 2];
export const BELL_REQUIRED_NOTES = BAR_RHYTHM.length * 4;
const FIRST_LONG_MIN_MS = 100;
const SHORT_MIN_MS = 25;
const SHORT_MAX_RATIO = 0.75;
const LONG_MIN_RATIO = 0.35;

export function createBellRhythm() {
  return { count: 0, anchorMs: null, shortMaxMs: 0, nextIndex: null, complete: false };
}

function beginAtBar(noteIndex, durationMs) {
  if (noteIndex % BAR_RHYTHM.length !== 0 || durationMs < FIRST_LONG_MIN_MS) {
    return createBellRhythm();
  }

  return {
    count: 1,
    anchorMs: durationMs,
    shortMaxMs: 0,
    nextIndex: (noteIndex + 1) % BELL_MELODY.length,
    complete: false,
  };
}

// Each bar's first long hold sets the child's pace; pauses do not count.
// Only progress resets on an error. The caller keeps advancing the melody.
export function advanceBellRhythm(state, event = {}) {
  if (state.complete) return state;

  const { noteIndex, durationMs } = event ?? {};
  if (!Number.isSafeInteger(noteIndex) || noteIndex < 0
    || !Number.isFinite(durationMs) || durationMs < 0) {
    return createBellRhythm();
  }

  // Accept either a global note counter or an index already wrapped at 32.
  const index = noteIndex % BELL_MELODY.length;
  if (state.count === 0 || index !== state.nextIndex) {
    return beginAtBar(index, durationMs);
  }

  const isLong = BAR_RHYTHM[index % BAR_RHYTHM.length] === 2;
  const startsBar = index % BAR_RHYTHM.length === 0;
  // Both long holds must be distinguishable from the short ones. Measuring
  // the ending against this bar's actual shorts allows natural tempo variation.
  // Long holds remain uncapped; the next bar freely establishes a fresh pace.
  const minimumMs = startsBar ? FIRST_LONG_MIN_MS
    : isLong ? Math.max(state.anchorMs * LONG_MIN_RATIO, state.shortMaxMs / SHORT_MAX_RATIO) : SHORT_MIN_MS;
  const maximumMs = isLong ? Infinity : state.anchorMs * SHORT_MAX_RATIO;
  if (durationMs < minimumMs || durationMs > maximumMs) {
    // A new bar can immediately establish a new pace after a failed attempt.
    return beginAtBar(index, durationMs);
  }

  const count = state.count + 1;
  return {
    count,
    anchorMs: startsBar ? durationMs : state.anchorMs,
    shortMaxMs: startsBar ? 0 : isLong ? state.shortMaxMs : Math.max(state.shortMaxMs, durationMs),
    nextIndex: (index + 1) % BELL_MELODY.length,
    complete: count === BELL_REQUIRED_NOTES,
  };
}
