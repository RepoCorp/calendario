import test from 'node:test';
import assert from 'node:assert/strict';
import {createDust,dustPosition,timeline,phaseAt,advanceGlobe} from './snowGlobeMagic.js';
test('dust returns exactly to the base and star forms progressively',()=>{
 const particles=createDust(300), settings={formation:5,swirl:1}, phases=timeline(5);
 let earlier=0,later=0;
 for(const p of particles){
  const start=dustPosition(p,0,settings),end=dustPosition(p,phases.end,settings);
  assert.deepEqual(start,end);assert.ok(start.y>.82 && start.y<.91);
  earlier+=dustPosition(p,6,settings).hot;later+=dustPosition(p,9,settings).hot;
  for(let t=0;t<phases.end;t+=.1){const q=dustPosition(p,t,settings);assert.ok(Number.isFinite(q.x)&&Number.isFinite(q.y));}
 }
 assert.ok(earlier<later*.5);assert.ok(later>150);
 assert.equal(phaseAt(0),'En calma');assert.equal(phaseAt(11),'Estrella');
});
test('all phase transitions remain continuous and count is bounded by configuration',()=>{
 const dust=createDust(600);assert.equal(dust.length,600);
 for(const p of dust.slice(0,40))for(const t of Object.values(timeline(5))){
 const a=dustPosition(p,t-.0001),b=dustPosition(p,t+.0001);
 assert.ok(Math.hypot(a.x-b.x,a.y-b.y)<.001);
 }
});

test('all figures keep the same dust and motion while changing only formation targets',()=>{
 const star=createDust(1800);
 for(const figure of ['snowflake','reindeer','bell','heart']){
   const dust=createDust(1800,figure);
   assert.equal(dust.length,star.length);
   assert.ok(dust.some((p,i)=>p.targetX!==star[i].targetX));
   for(let i=0;i<dust.length;i++){
     const p=dust[i];
     assert.deepEqual(dustPosition(p,0),dustPosition(star[i],0));
     assert.ok(Math.hypot(p.targetX-.5,p.targetY-.5)<.478);
     assert.ok(Number.isFinite(p.targetX)&&Number.isFinite(p.targetY));
   }
 }
});

test('sustained shaking holds free motion until quiet, then forms and resets',()=>{
 const e={time:0,motionTime:0,active:true,paused:false,shakingUntil:20700};
 const dust=createDust(20);
 for(let i=0;i<1200;i++)advanceGlobe(e,1/60,i*1000/60);
 assert.equal(e.time,timeline().swirl);
 assert.ok(e.motionTime>19);
 for(const p of dust)assert.equal(dustPosition(p,e.time,{motionTime:e.motionTime}).hot,0);
 const a=dustPosition(dust[0],e.time,{motionTime:e.motionTime});
 advanceGlobe(e,.05,20500);
 const b=dustPosition(dust[0],e.time,{motionTime:e.motionTime});
 assert.ok(Math.hypot(a.x-b.x,a.y-b.y)>.0001);
 for(let i=0;i<360;i++)advanceGlobe(e,1/60,20701+i*1000/60);
 assert.ok(dust.some(p=>dustPosition(p,e.time,{motionTime:e.motionTime}).hot>.9));
 for(let i=0;i<1200;i++)advanceGlobe(e,1/60,27000+i*1000/60);
 assert.equal(e.active,false);assert.equal(e.time,0);
});
