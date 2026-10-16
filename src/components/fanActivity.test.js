import test from 'node:test';
import assert from 'node:assert/strict';
import {createFanMotion} from './fanMotion.js';
import {fogDensity,messageClear,createFogFlow,stepFogFlow,renderFog} from './fanFog.js';
import {fanPose,bladeAngle} from './foldingFan.js';
const zone={x:.5,y:.17,width:.8,height:.17};
test('gentle forward/back cycles count, sideways shakes and noise do not',()=>{
 const run=(z,x=0)=>{const d=createFanMotion();let hits=0;for(let i=0;i<600;i++){const t=i/60,wave=Math.sin(t*Math.PI*3);if(d.sample(z*wave,i*1000/60,x*wave))hits++;}return hits;};
 assert.ok(run(1.4)>=8);assert.equal(run(.15),0);assert.equal(run(.6,4),0);
});
test('one push and very rapid vibration are not completed cycles',()=>{
 const d=createFanMotion();let hits=0;
 for(let i=0;i<120;i++)if(d.sample(i<60?1.5:0,i*16.67))hits++;
 assert.equal(hits,0);
 d.reset();for(let i=0;i<100;i++)if(d.sample(i%2?1:-1,i*5))hits++;
 assert.equal(hits,0);
});
test('fog fully conceals initially and clears message last, continuously',()=>{
 for(let x=0;x<=1;x+=.1)for(let y=0;y<=1;y+=.1){assert.equal(fogDensity(x,y,0,0,zone),1);assert.equal(fogDensity(x,y,1,0,zone),0);}
 assert.ok(fogDensity(.5,.17,.7,0,zone)>fogDensity(.5,.7,.7,0,zone));
 assert.equal(messageClear(.7,0,zone),false);assert.equal(messageClear(1,0,zone),true);
 for(let x=.1;x<.9;x+=.01)assert.ok(Math.abs(fogDensity(x,.17,.7,.5,zone)-fogDensity(x+.001,.17,.7,.5,zone))<.02);
});
test('fan pivot and rigid size remain fixed through opening and fanning',()=>{
 for(const open of [0,.25,.5,1])for(const rock of [-1,0,1]){
 const p=fanPose(390,844,open,rock);assert.equal(p.radius,370.5);assert.equal(p.scaleX,1);assert.equal(p.scaleY,1);assert.equal(p.x,195);assert.equal(p.y,844*.94);assert.ok(bladeAngle(0,open)>=-75);
 }
 assert.equal(bladeAngle(18,0),-21);assert.equal(bladeAngle(18,1),75);
});

test('wind transports fog without adding density and rests when wind stops',()=>{
 const flow=createFogFlow(40,70),initial=flow.density.slice();
 stepFogFlow(flow,0,1);assert.deepEqual(flow.density,initial);
 stepFogFlow(flow,.05,0);assert.deepEqual(flow.density,initial);
 for(let i=0;i<30;i++)stepFogFlow(flow,.05,1);
 assert.ok(flow.density.some((v,i)=>Math.abs(v-initial[i])>.1));
 assert.ok(flow.density.every(v=>Number.isFinite(v)&&v>=0&&v<=1.2));
 const still=flow.density.slice();stepFogFlow(flow,.05,0);assert.deepEqual(flow.density,still);
});
test('completion uses the rendered fog over the entire message',()=>{
 const flow=createFogFlow(40,70),buffer={width:40,height:70,data:new Uint8ClampedArray(40*70*4)};
 const ctx={putImageData(){}};
 renderFog(ctx,buffer,0,0,zone,flow);assert.equal(messageClear(1,0,zone,buffer),false);
 renderFog(ctx,buffer,1,0,zone,flow);assert.equal(messageClear(1,0,zone,buffer),true);
 buffer.data[(12*40+20)*4+3]=30;assert.equal(messageClear(1,0,zone,buffer),false);
});
