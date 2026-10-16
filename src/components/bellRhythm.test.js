import assert from 'node:assert/strict';
import test from 'node:test';
import { BELL_MELODY, advanceBellRhythm, createBellRhythm } from './bellRhythm.js';

const EMPTY = { count: 0, anchorMs: null, shortMaxMs: 0, nextIndex: null, complete: false };
const fourBars = (long = 400) => Array.from({ length: 4 }, () => [long, long / 2, long / 2, long]).flat();

function play(durations, { start = 0, wrap = false, state = createBellRhythm() } = {}) {
  return durations.reduce((previous, durationMs, offset) => advanceBellRhythm(previous, {
    noteIndex: wrap ? (start + offset) % BELL_MELODY.length : start + offset,
    durationMs,
  }), state);
}

test('the melody contains four low bars followed by four high bars', () => {
  assert.equal(BELL_MELODY.length, 32);
  for (let bar = 0; bar < 8; bar += 1) {
    assert.deepEqual(BELL_MELODY.slice(bar * 4, bar * 4 + 4), bar < 4
      ? [466.16, 440, 466.16, 392]
      : [587.33, 523.25, 587.33, 466.16]);
  }
});

test('new attempts start empty without sharing mutable state', () => {
  assert.deepEqual(createBellRhythm(), EMPTY);
  assert.notStrictEqual(createBellRhythm(), createBellRhythm());
});

test('only the sixteenth note completes four bars at diverse independent paces', () => {
  for (const long of [100, 400, 900, 5000, 60000]) {
    let state = createBellRhythm();
    const durations = fourBars(long);
    durations.forEach((durationMs, noteIndex) => {
      state = advanceBellRhythm(state, { noteIndex, durationMs });
      assert.equal(state.count, noteIndex + 1);
      assert.equal(state.anchorMs, long);
      assert.equal(state.complete, noteIndex === 15);
    });
  }
});

test('generous short and long variation includes both tolerance boundaries', () => {
  const state = play([1000, 25, 750, 1000, 1800, 25, 450, 630]);
  assert.equal(state.count, 8);
  assert.equal(state.anchorMs, 1800);
  assert.equal(state.complete, false);
});

test('fast playing accepts brief taps but filters accidental contact', () => {
  assert.equal(play(Array.from({ length: 2 }, () => [100, 25, 75, 100, 100, 25, 50, 100]).flat()).complete, true);
  assert.deepEqual(play([100, 24]), EMPTY);
});

test('the first long requires only 100 ms and has no upper limit', () => {
  assert.deepEqual(play([99.99]), EMPTY);
  assert.equal(play([100]).count, 1);
  assert.equal(play([3600000]).anchorMs, 3600000);
});

test('equal-duration holds cannot complete the challenge', () => {
  let state = createBellRhythm();
  for (let noteIndex = 0; noteIndex < 40; noteIndex += 1) {
    state = advanceBellRhythm(state, { noteIndex, durationMs: 400 });
    assert.equal(state.complete, false);
    assert.ok(state.count <= 1);
  }
});

test('short holds outside their range clear progress', () => {
  for (const short of [0, 24, 301, 400]) {
    assert.deepEqual(play([400, short]), EMPTY);
    assert.deepEqual(play([400, 200, short]), EMPTY);
  }
});

test('a clearly too-brief final long clears progress, but holding longer is fine', () => {
  for (const long of [0, 139]) {
    assert.deepEqual(play([400, 200, 200, long]), EMPTY);
  }
  assert.equal(play([400, 200, 200, 10000]).count, 4);
});

test('a failure ignores the rest of that bar and permits the next bar', () => {
  let state = play([400, 400]);
  assert.deepEqual(state, EMPTY);
  state = play([200, 400], { start: 2, state });
  assert.deepEqual(state, EMPTY);
  state = play(fourBars(), { start: 4, state });
  assert.equal(state.complete, true);
});

test('the next bar establishes a fresh pace without losing earned lights', () => {
  let state = play([400, 200, 200, 400, 900]);
  assert.deepEqual(state, { count: 5, anchorMs: 900, shortMaxMs: 0, nextIndex: 5, complete: false });
  state = play([450, 450, 900], { start: 5, state });
  assert.equal(state.count, 8);
  assert.equal(state.complete, false);
  assert.equal(play(Array.from({ length: 2 }, () => [900, 300, 350, 500, 120, 50, 70, 100]).flat()).complete, true);
  assert.deepEqual(play([400, 200, 200, 400, 99]), EMPTY);
});

test('uneven playing and changing pace still pass with clear long-short contrast', () => {
  assert.equal(play(Array.from({ length: 2 }, () => [600, 420, 80, 580, 300, 210, 60, 290]).flat()).complete, true);
});

test('near-constant holds that passed the loose trial no longer pass', () => {
  for (const scale of [0.3, 1, 3]) {
    const durations = Array.from({ length: 8 }, () => [400, 370, 360, 390].map(ms => ms * scale)).flat();
    assert.deepEqual(play(durations), EMPTY);
  }
});

test('small jitter around an even pace cannot count as a rhythm', () => {
  let seed = 42;
  for (const pace of [150, 400, 1000]) {
    let state = createBellRhythm();
    for (let noteIndex = 0; noteIndex < 128; noteIndex += 1) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const durationMs = pace * (0.9 + (seed / 2 ** 32) * 0.2);
      state = advanceBellRhythm(state, { noteIndex, durationMs });
      assert.equal(state.complete, false);
      assert.ok(state.count <= 1);
    }
  }
});

test('the final long is compared with the longer of the two actual short holds', () => {
  assert.deepEqual(play([600, 400, 80, 240]), EMPTY);
  assert.deepEqual(play([600, 80, 400, 240]), EMPTY);
  assert.equal(play([600, 400, 80, 540]).count, 4);
  assert.equal(play([600, 80, 400, 540]).count, 4);
});

test('skipped or repeated note indices interrupt the attempt', () => {
  const state = play([400, 200]);
  assert.deepEqual(advanceBellRhythm(state, { noteIndex: 3, durationMs: 400 }), EMPTY);
  assert.deepEqual(advanceBellRhythm(state, { noteIndex: 1, durationMs: 200 }), EMPTY);
  assert.deepEqual(advanceBellRhythm(state, { noteIndex: 4, durationMs: 800 }), {
    count: 1, anchorMs: 800, shortMaxMs: 0, nextIndex: 5, complete: false,
  });
});

test('an attempt may start at any bar, including pitch changes and the loop wrap', () => {
  for (const start of [0, 4, 8, 12, 16, 20, 24, 28, 60]) {
    for (const wrap of [false, true]) {
      const state = play(fourBars(), { start, wrap });
      assert.equal(state.complete, true, `start ${start}, wrap ${wrap}`);
      assert.equal(state.count, 16);
      assert.equal(state.nextIndex, (start + 16) % 32);
    }
  }
});

test('an attempt cannot begin halfway through a bar', () => {
  for (const start of [1, 2, 3, 13, 14, 15, 29, 30, 31]) {
    assert.deepEqual(play([400], { start }), EMPTY);
  }
});

test('completion persists through later playing, mistakes, and invalid events', () => {
  const complete = play(fourBars());
  for (const event of [
    { noteIndex: 8, durationMs: 1 },
    { noteIndex: 19, durationMs: 100000 },
    { noteIndex: NaN, durationMs: NaN },
    null,
  ]) {
    assert.strictEqual(advanceBellRhythm(complete, event), complete);
  }
  assert.equal(complete.count, 16);
});

test('a mistake in the fourth bar resets progress before a fresh four-bar attempt', () => {
  const almost = play(fourBars().slice(0, 13));
  assert.equal(almost.count, 13);
  const failed = advanceBellRhythm(almost, { noteIndex: 13, durationMs: 600 });
  assert.deepEqual(failed, EMPTY);
  assert.equal(play(fourBars(), { start: 16, state: failed }).complete, true);
});

test('invalid durations and note indices clear an unfinished attempt', () => {
  const state = play([400]);
  for (const durationMs of [-1, NaN, Infinity, -Infinity, undefined, null, '400']) {
    assert.deepEqual(advanceBellRhythm(state, { noteIndex: 1, durationMs }), EMPTY);
    assert.deepEqual(advanceBellRhythm(state, { noteIndex: 4, durationMs }), EMPTY);
  }
  for (const noteIndex of [-1, 0.5, NaN, Infinity, undefined, null, '4']) {
    assert.deepEqual(advanceBellRhythm(state, { noteIndex, durationMs: 400 }), EMPTY);
  }
  assert.deepEqual(advanceBellRhythm(state), EMPTY);
  assert.deepEqual(advanceBellRhythm(state, null), EMPTY);
});

test('advancing does not mutate the supplied state or event', () => {
  const state = Object.freeze(play([400]));
  const event = Object.freeze({ noteIndex: 1, durationMs: 200 });
  const next = advanceBellRhythm(state, event);
  assert.equal(state.count, 1);
  assert.equal(next.count, 2);
  assert.notStrictEqual(next, state);
});
