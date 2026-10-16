import test from 'node:test';
import assert from 'node:assert/strict';
import {writeMetronome} from './day24Metronome.js';
test('diagnostic clicks start at every scored beat without a 100ms onset delay',()=>{
 for(const sampleRate of [44100,48000]){
  const samples=new Float32Array(sampleRate*4);
  writeMetronome(samples,sampleRate,120,3.5);
  for(let beat=0;beat<7;beat++){
   const start=Math.round(beat*.5*sampleRate);
   assert.ok(samples.slice(start,start+Math.round(.002*sampleRate)).some(v=>Math.abs(v)>.1));
   assert.ok(samples.slice(start+Math.round(.03*sampleRate),start+Math.round(.49*sampleRate)).every(v=>v===0));
  }
  assert.ok(samples.slice(Math.round(3.5*sampleRate)).every(v=>v===0));
 }
});
