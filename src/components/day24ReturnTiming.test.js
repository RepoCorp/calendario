import test from 'node:test';
import assert from 'node:assert/strict';
import {createReturnTiming,recordReturnTiming} from './day24ReturnTiming.js';
const round={beat:.5,muteAt:4,returnAt:8};
test('opening mean freezes through silence and first return remains distinct from closest tap',()=>{
 const s=createReturnTiming();
 for(const at of [.45,.95,1.45,1.95])recordReturnTiming(s,at,round);
 assert.ok(Math.abs(s.meanMs+50)<1e-9);assert.equal(s.count,4);
 recordReturnTiming(s,5.1,round);recordReturnTiming(s,7.95,round);
 assert.equal(s.count,4);assert.equal(s.firstReturn,null);
 recordReturnTiming(s,8.02,round);
 assert.ok(Math.abs(s.firstReturn.rawMs-20)<1e-9);
 assert.ok(Math.abs(s.firstReturn.adjustedMs-70)<1e-9);
 recordReturnTiming(s,8.5,round);
 assert.ok(Math.abs(s.firstReturn.rawMs-20)<1e-9);
});
test('no opening taps means raw timing only, and a new round has no inherited baseline',()=>{
 const s=createReturnTiming();recordReturnTiming(s,8.1,round);
 assert.equal(s.firstReturn.adjustedMs,null);assert.equal(s.firstReturn.baselineMs,null);
 assert.equal(createReturnTiming().count,0);assert.equal(createReturnTiming().firstReturn,null);
});
test('pre-start and duplicate opening events do not distort the reference',()=>{
 const s=createReturnTiming();
 for(const at of [-.1,.45,.46,.95])recordReturnTiming(s,at,round);
 assert.equal(s.count,2);assert.ok(Math.abs(s.meanMs+50)<1e-9);
});

test('gradual lateness is tracked through a whole beat instead of wrapping to zero',()=>{
 const s=createReturnTiming();
 for(const at of [.5,1,1.5,2,2.5,3,3.5])recordReturnTiming(s,at,round);
 for(const at of [4.1,4.7,5.3,5.9,6.5,7.1])recordReturnTiming(s,at,round);
 assert.ok(Math.abs(s.drift.totalMs-600)<1e-8);
 assert.equal(s.drift.skipped,0);assert.equal(s.drift.uncertain,false);
});
test('skipping a full beat preserves the established drift',()=>{
 const s=createReturnTiming();
 for(const at of [.5,1,1.5,2,2.5,3,3.5,4.05,4.55,5.55,6.05])recordReturnTiming(s,at,round);
 assert.ok(Math.abs(s.drift.totalMs-50)<1e-8);
 assert.equal(s.drift.skipped,1);assert.equal(s.drift.uncertain,false);
});
test('gradual anticipation unwraps negatively and long gaps are marked uncertain',()=>{
 const s=createReturnTiming();
 for(const at of [.5,1,1.5,2,2.5,3,3.5])recordReturnTiming(s,at,round);
 for(const at of [4,4.4,4.8,5.2,5.6,6,6.4])recordReturnTiming(s,at,round);
 assert.ok(Math.abs(s.drift.totalMs+600)<1e-8);
 recordReturnTiming(s,9.4,round);assert.equal(s.drift.uncertain,true);
 assert.ok(Math.abs(s.drift.totalMs+600)<1e-8);
});
