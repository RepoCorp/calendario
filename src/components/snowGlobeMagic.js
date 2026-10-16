import { figureSampler, GLOBE_FIGURES } from './snowGlobeFigures.js';
const TAU = Math.PI * 2;
export const smooth = x => { x = Math.max(0, Math.min(1,x)); return x*x*(3-2*x); };
const mix = (a,b,t) => a+(b-a)*t;
export function timeline(formation=5) {
  return { rise:2.4, swirl:5.2, formed:5.2+formation, hold:8.4+formation, dissolve:12.4+formation, end:15.4+formation };
}
export function phaseAt(t, formation=5, figure='star') {
  const p=timeline(formation);
  if(t===0 || t>=p.end) return 'En calma';
  if(t<p.rise) return 'Ascenso';
  if(t<p.swirl) return 'Remolino';
  if(t<p.formed) return 'Formación';
  if(t<p.hold) return GLOBE_FIGURES.find(f=>f.id===figure)?.label || 'Estrella';
  if(t<p.dissolve) return 'Disolución';
  return 'Descenso';
}
export function createDust(count=1800, figure='star') {
  let seed=1525;
  const rand=()=>{ seed=(Math.imul(seed,1664525)+1013904223)>>>0; return seed/4294967296; };
  let targetSeed=2215;
  const targetRandom=()=>{targetSeed=(Math.imul(targetSeed,1664525)+1013904223)>>>0;return targetSeed/4294967296;};
  const targetFor=figure==='star'?null:figureSampler(figure,targetRandom);
  const vertices=Array.from({length:10},(_,i)=>{const a=i*Math.PI/5-Math.PI/2,r=i%2?.145:.335;return {x:.5+Math.cos(a)*r,y:.47+Math.sin(a)*r};});
  return Array.from({length:count},(_,i)=>{
    const edge=Math.floor(rand()*10),u=rand(),a=vertices[edge],b=vertices[(edge+1)%10];
    const inset=rand()<.76?1:Math.sqrt(rand());
    const particle = { homeX:.5+(rand()+rand()-1)*.325, homeY:.866+(rand()+rand()-1)*.018,
      targetX:.5+(mix(a.x,b.x,u)-.5)*inset+(rand()-.5)*.008,
      targetY:.47+(mix(a.y,b.y,u)-.47)*inset+(rand()-.5)*.008,
      angle:rand()*TAU, radius:.06+Math.sqrt(rand())*.35, speed:.65+rand()*.6,
      offset:rand(), delay:rand()*.55, size:.48+rand()**2*1.1,
      bright:.5+rand()*.5, shape:i%5!==0, phase:rand()*TAU };
    if(targetFor){const target=targetFor();particle.targetX=target.x;particle.targetY=target.y;}
    return particle;
  });
}
export function dustPosition(p,t,{formation=5,swirl=1,motionTime=t}={}) {
  const times=timeline(formation);
  const idle=t<=0 || t>=times.end;
  const spin=motionTime*.85*swirl+p.radius*19+(p.offset>.5?Math.PI:0)+.24*Math.sin(motionTime*p.speed+p.phase);
  const spiral={x:.5+Math.cos(spin)*p.radius*(.8+.13*Math.sin(motionTime+p.phase)),
    y:.49+Math.sin(spin)*p.radius*.82+.035*Math.sin(motionTime*1.7+p.phase)};
  // Independent phases and rates keep shaken dust drifting without a shared orbit.
  const floating={
    x:.5+Math.cos(p.angle)*p.radius*.72+.055*Math.sin(motionTime*p.speed*.8+p.phase),
    y:.49+Math.sin(p.angle)*p.radius*.72+.065*Math.sin(motionTime*p.speed*.63+p.offset*TAU),
  };
  const spiralBlend=smooth((t-times.rise)/(times.swirl-times.rise));
  const free={x:mix(floating.x,spiral.x,spiralBlend),y:mix(floating.y,spiral.y,spiralBlend)};
  const rise=idle?0:smooth((t-p.delay)/(times.rise-p.delay));
  let x=mix(p.homeX,free.x,rise),y=mix(p.homeY,free.y,rise);
  const form=p.shape?smooth(((t-times.swirl)/formation-p.delay)/.45):0;
  const dissolve=smooth((t-times.hold-p.delay)/3.3);
  const attraction=form*(1-dissolve);
  // Curved approach fades out as each independently delayed grain joins the star.
  const bend=Math.sin(attraction*Math.PI)*.055;
  x=mix(x,p.targetX+Math.sin(t*1.3+p.phase)*.0018,attraction)+Math.sin(spin+1)*bend;
  y=mix(y,p.targetY+Math.cos(t+p.phase)*.0018,attraction)+Math.cos(spin)*bend;
  const settle=smooth((t-times.dissolve-p.delay)/2.4);
  x=mix(x,p.homeX,settle);y=mix(y,p.homeY,settle);
  if(idle) {x=p.homeX;y=p.homeY;}
  return {x,y,hot:idle?0:attraction};
}
export function renderDust(ctx,particles,t,settings,size) {
  ctx.clearRect(0,0,size,size);
  ctx.save();ctx.beginPath();ctx.arc(size*.5,size*.5,size*.478,0,TAU);ctx.clip();
  ctx.beginPath();ctx.rect(0,0,size,size*.9);ctx.clip();
  ctx.globalCompositeOperation='lighter';
  for(const p of particles) {
    const q=dustPosition(p,t,settings),x=q.x*size,y=q.y*size;
    const twinkle=.8+.2*Math.sin(t*3+p.phase);
    const a=p.bright*twinkle, r=p.size*size/310;
    if(p.bright>.83) {
      ctx.fillStyle=`rgba(255,158,35,${a*.12*settings.glow})`;
      ctx.beginPath();ctx.arc(x,y,r*4,0,TAU);ctx.fill();
    }
    ctx.fillStyle=`rgba(255,${Math.round(175+65*p.bright)},${Math.round(65+120*p.bright)},${Math.min(1,a*(.8+q.hot*.3))})`;
    ctx.fillRect(x-r*.5,y-r*.5,r,r);
    if(q.hot>.9 && p.offset>.985) {
      const flare=(.4+.6*Math.max(0,Math.sin(t*2+p.phase)))*size/310;
      ctx.strokeStyle=`rgba(255,236,181,${a*.65})`;ctx.lineWidth=.5;
      ctx.beginPath();ctx.moveTo(x-3*flare,y);ctx.lineTo(x+3*flare,y);ctx.moveTo(x,y-4*flare);ctx.lineTo(x,y+4*flare);ctx.stroke();
    }
  }
  ctx.restore();
  if(settings.boundary) {ctx.strokeStyle='#72e2e2';ctx.lineWidth=1;ctx.beginPath();ctx.arc(size*.5,size*.5,size*.478,0,TAU);ctx.stroke();}
}

// Hold before the spiral while shaking; the independent floating clock keeps moving.
export function advanceGlobe(e,dt,now,formation=5){
  if(!e.active || e.paused)return;
  e.motionTime=(e.motionTime||0)+dt;
  const p=timeline(formation);
  if(now<(e.shakingUntil||0))e.time=e.time>p.rise?Math.max(p.rise,e.time-dt*8):Math.min(p.rise,e.time+dt*3);
  else e.time+=dt;
  if(e.time>=p.end){e.time=0;e.active=false;e.motionTime=0;}
}
