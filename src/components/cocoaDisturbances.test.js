import test from 'node:test';
import assert from 'node:assert/strict';
import { createCocoaDisturbances } from './cocoaDisturbances.js';
const neutral = { roll: 0, pitch: 0 };
const advance = (game, seconds, input = neutral) => {
  for (let i = 0; i < Math.round(seconds * 120); i++) game.step(input, 1 / 120);
};

test('a completed push retains momentum and keeps tipping during recovery', () => {
  const game = createCocoaDisturbances();
  game.settings.recovery = 100;
  let active = false;
  for (let i = 0; i < 120 * 6; i++) {
    const s = game.step(neutral, 1 / 120);
    const pushing = Math.hypot(s.disturbanceRoll, s.disturbancePitch) > 0.001;
    if (active && !pushing) break;
    active ||= pushing;
  }
  assert.ok(active);
  const before = Math.hypot(game.state.roll, game.state.pitch);
  assert.ok(Math.hypot(game.state.velocityRoll, game.state.velocityPitch) > 5);
  advance(game, 1);
  assert.ok(Math.hypot(game.state.roll, game.state.pitch) > before + 5);
});

test('neutral input cannot center a tilted stationary mug', () => {
  const game = createCocoaDisturbances();
  game.settings.strength = 0;
  game.state.roll = 18;
  game.state.pitch = -12;
  advance(game, 10);
  assert.equal(game.state.roll, 18);
  assert.equal(game.state.pitch, -12);
});

test('a modest counter-tilt brakes capped spin before another six degrees of travel', () => {
  const game = createCocoaDisturbances();
  game.settings.strength = 0;
  game.state.velocityRoll = game.settings.maxAngularVelocity;
  let brakingTime = 0;
  while (game.state.velocityRoll > 0 && brakingTime < 1) {
    game.step({ roll: -8, pitch: 0 }, 1 / 120);
    brakingTime += 1 / 120;
  }
  assert.ok(brakingTime < 0.4, `Braking took ${brakingTime}s`);
  assert.ok(game.state.roll < 6, `Travelled another ${game.state.roll}°`);
  assert.ok(game.state.velocityRoll <= 0);
  advance(game, 0.25, { roll: -8, pitch: 0 });
  assert.ok(game.state.velocityRoll < -15, 'Holding the counter-tilt reverses the spin');
});

test('small counter-tilts recover against disturbances without knowing their force', () => {
  const game = createCocoaDisturbances();
  game.state.roll = 18;
  game.state.pitch = -12;
  game.state.velocityRoll = 12;
  game.state.velocityPitch = -8;
  const observations = [];
  let input = neutral;
  for (let i = 0; i < 120 * 65; i++) {
    const s = game.state;
    observations.push({ ...s });
    // Only visible pose/spin, observed 100 ms ago, with corrections at 10 Hz.
    // Commands stay within 8°; no disturbance-force cancellation oracle.
    const seen = observations[Math.max(0, observations.length - 13)];
    if (i % 12 === 0) {
      input = {
        roll: Math.max(-8, Math.min(8, -0.7 * seen.roll - 0.5 * seen.velocityRoll)),
        pitch: Math.max(-8, Math.min(8, -0.7 * seen.pitch - 0.5 * seen.velocityPitch)),
      };
    }
    game.step(input, 1 / 120);
    if (i === 120 * 2) assert.ok(Math.hypot(s.roll, s.pitch) < 2, 'Recovers the initial lean');
    if (i > 120 * 5) assert.ok(Math.hypot(s.roll, s.pitch) < 5, 'Retains control as pushes grow');
  }
});

test('combined tilt cannot become horizontal and opposite torque recovers from its limit', () => {
  const game = createCocoaDisturbances();
  game.settings.strength = 0;
  for (let i = 0; i < 120 * 4; i++) {
    const s = game.step({ roll: 28, pitch: 28 }, 1 / 120);
    // For the mug's x/z Euler rotations, its up axis has this vertical component.
    const upright = Math.cos(s.roll * Math.PI / 180) * Math.cos(s.pitch * Math.PI / 180);
    assert.ok(upright >= Math.cos(Math.PI / 3) - 1e-9);
  }
  assert.ok(Math.abs(Math.hypot(game.state.roll, game.state.pitch) - 60) < 1e-9);
  advance(game, 0.5, { roll: -8, pitch: -8 });
  assert.ok(Math.hypot(game.state.roll, game.state.pitch) < 49);
  assert.ok(game.state.velocityRoll < 0 && game.state.velocityPitch < 0);
});

test('the tilt stop removes outward spin while preserving tangential motion', () => {
  const game = createCocoaDisturbances();
  game.settings.strength = 0;
  game.state.roll = 60;
  game.state.velocityRoll = 10;
  game.state.velocityPitch = 10;
  const s = game.step(neutral, 1 / 120);
  assert.ok(Math.abs(Math.hypot(s.roll, s.pitch) - 60) < 1e-9);
  assert.ok(Math.abs(s.roll * s.velocityRoll + s.pitch * s.velocityPitch) < 1e-9);
  assert.ok(s.velocityPitch > 9, 'Tangential spin is retained');
});

test('both-axis speed is bounded and restart repeats the forces', () => {
  const game = createCocoaDisturbances();
  const course = [];
  let simultaneous = false;
  for (let i = 0; i < 120 * 70; i++) {
    const s = game.step({ roll: 28, pitch: 28 }, 1 / 120);
    assert.ok(Math.hypot(s.velocityRoll, s.velocityPitch) <= game.settings.maxAngularVelocity + 1e-9);
    simultaneous ||= Math.abs(s.disturbanceRoll) > 5 && Math.abs(s.disturbancePitch) > 5;
    course.push([s.disturbanceRoll, s.disturbancePitch]);
  }
  assert.ok(simultaneous);
  game.reset();
  assert.equal(game.state.velocityRoll, 0);
  assert.equal(game.state.velocityPitch, 0);
  for (const expected of course) {
    const s = game.step(neutral, 1 / 120);
    assert.deepEqual([s.disturbanceRoll, s.disturbancePitch], expected);
  }
});

test('30 and 120 Hz produce the same integrated motion', () => {
  const slow = createCocoaDisturbances();
  const fast = createCocoaDisturbances();
  for (let i = 0; i < 30 * 20; i++) slow.step(neutral, 1 / 30);
  advance(fast, 20);
  for (const key of Object.keys(fast.state)) assert.ok(Math.abs(fast.state[key] - slow.state[key]) < 1e-8, key);
});


test('opening is calm, then pushes strengthen and become more frequent', () => {
  const game = createCocoaDisturbances();
  advance(game, 2.9);
  assert.equal(game.state.roll, 0);
  assert.equal(game.state.pitch, 0);
  const early = { peak: 0, pushes: 0 }, late = { peak: 0, pushes: 0 };
  let pushing = false;
  for (let i = 0; i < 120 * 100; i++) {
    const s = game.step(neutral, 1 / 120);
    const strength = Math.hypot(s.disturbanceRoll, s.disturbancePitch);
    const window = s.elapsed < 23 ? early : s.elapsed >= 80 && s.elapsed < 100 ? late : null;
    if (window) { window.peak = Math.max(window.peak, strength); if (strength > .001 && !pushing) window.pushes++; }
    pushing = strength > .001;
  }
  assert.ok(early.peak < 18);
  assert.ok(late.peak > early.peak * 2);
  assert.ok(late.pushes > early.pushes);
});

test('game holds a gentle speed ceiling until reveal then ramps, including after restart', async () => {
  const {COCOA_GAME_TUNING,cocoaAngularSpeedLimit} = await import('./cocoaDisturbances.js');
  const game=createCocoaDisturbances(COCOA_GAME_TUNING);
  assert.equal(game.settings.strength,1.5);
  assert.equal(game.settings.frequency,.5);
  assert.equal(game.settings.recovery,.1);
  assert.equal(game.settings.damping,0);
  assert.equal(cocoaAngularSpeedLimit(game.settings,0),10);
  assert.equal(cocoaAngularSpeedLimit(game.settings,10),10);
  assert.equal(cocoaAngularSpeedLimit(game.settings,20),10);
  advance(game,20,{roll:28,pitch:28});
  assert.ok(Math.hypot(game.state.velocityRoll,game.state.velocityPitch)<=10+1e-9);
  assert.equal(cocoaAngularSpeedLimit(game.settings,40),35);
  assert.equal(cocoaAngularSpeedLimit(game.settings,60),60);
  game.reset();
  assert.equal(cocoaAngularSpeedLimit(game.settings,game.state.elapsed),10);
});

test('game opening has softer pushes and recovery gaps before post-reveal escalation', async () => {
 const {COCOA_GAME_TUNING}=await import('./cocoaDisturbances.js');
 const game=createCocoaDisturbances(COCOA_GAME_TUNING);
 let earlyPeak=0,latePeak=0,earlyPushes=0,latePushes=0,wasPushing=false;
 for(let i=0;i<120*80;i++){
  const s=game.step(neutral,1/120),force=Math.hypot(s.disturbanceRoll,s.disturbancePitch),pushing=force>.001;
  if(s.elapsed<=20){earlyPeak=Math.max(earlyPeak,force);if(pushing&&!wasPushing)earlyPushes++;}
  if(s.elapsed>=60){latePeak=Math.max(latePeak,force);if(pushing&&!wasPushing)latePushes++;}
  wasPushing=pushing;
 }
 assert.ok(earlyPeak<5, `Opening peak ${earlyPeak}`);
 assert.ok(earlyPushes<=3, `Opening pushes ${earlyPushes}`);
 assert.ok(latePeak>earlyPeak*4);
 assert.ok(latePushes>earlyPushes);
});
