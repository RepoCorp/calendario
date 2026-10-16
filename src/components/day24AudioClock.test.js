import test from 'node:test';
import assert from 'node:assert/strict';
import { sampleAudioClock } from './day24AudioClock.js';
test('output timestamps compensate latency once and preserve the original tap time',()=>{
 const context={currentTime:10.12,baseLatency:.02,outputLatency:.1,
 getOutputTimestamp:()=>({contextTime:10,performanceTime:5000})};
 const immediate=sampleAudioClock(context,5000,5000);
 assert.equal(immediate.at,10);assert.equal(immediate.correctionMs,120);
 assert.equal(immediate.method,'output');
 const delayed=sampleAudioClock({...context,currentTime:10.17},5000,5050);
 assert.equal(delayed.at,10);assert.equal(delayed.eventDelayMs,50);
});
test('estimated clock identifies its correction and rejects startup timestamps',()=>{
 const context={currentTime:10.12,baseLatency:.02,outputLatency:.1,
 getOutputTimestamp:()=>({contextTime:0,performanceTime:0})};
 const r=sampleAudioClock(context,5000,5000);
 assert.ok(Math.abs(r.at-10)<1e-9);assert.equal(r.method,'estimated');
 assert.equal(r.correctionMs,120);
});
