import { useEffect, useRef, useState } from 'react';
import { createFanMotion, clamp } from '../components/fanMotion';
import { renderFog, messageClear, createFogFlow, stepFogFlow } from '../components/fanFog';
import { paintFan, fanHit } from '../components/foldingFan';
import { requestFanPermission } from '../components/fanPermission';
import '../components/Day23Fan.css';

export default function Day23() {
  const stage=useRef(null),fog=useRef(null),fan=useRef(null),message=useRef(null);
  const engine=useRef({open:false,openness:0,energy:0,progress:0,target:0,drift:0,ready:false,width:1,height:1});
  const detector=useRef(createFanMotion()),gesture=useRef(null);
  const [open,setOpen]=useState(false),[complete,setComplete]=useState(false),[ready,setReady]=useState(false);
  const [gate,setGate]=useState(false),[feedback,setFeedback]=useState('');
  const sensorAllowed=useRef(false),alive=useRef(false);
  const cycle=event=>{
    const e=engine.current;
    if(!event || !e.open || e.openness<.9 || !e.ready)return;
    e.energy=Math.min(1.5,e.energy+event.intensity*.9);
    e.target=clamp(e.target+(.045+.025*event.intensity));
  };
  const cycleRef=useRef(cycle);cycleRef.current=cycle;
  useEffect(()=>{
    alive.current=true;
    requestFanPermission().then(result=>{
      if(!alive.current)return;
      sensorAllowed.current=result==='granted';
      setGate(result==='gesture');
      if(result==='denied')setFeedback('Movimiento no autorizado. Puedes mover el abanico con el dedo.');
    });
    let gravity=null,last=0;
    const motion=event=>{
      const e=engine.current;
      if(gesture.current)return;
      if(!sensorAllowed.current || !e.ready || !e.open || e.openness<.9){detector.current.reset();return;}
      const time=performance.now(),dt=last?Math.min(.1,(time-last)/1000):.016;last=time;
      let a=event.acceleration;
      if(!Number.isFinite(a?.z)){
        const g=event.accelerationIncludingGravity;if(!Number.isFinite(g?.z))return;
        if(!gravity)gravity={x:g.x||0,z:g.z};
        const f=1-Math.exp(-dt/.35);
        gravity.x+=((g.x||0)-gravity.x)*f;gravity.z+=(g.z-gravity.z)*f;
        a={x:(g.x||0)-gravity.x,z:g.z-gravity.z};
      }
      // Acceleration perpendicular to the screen; x is only used to reject
      // predominantly side-to-side shakes. Never count x as a fan cycle.
      if(Math.abs(a.z)>.48 && Math.abs(a.x||0)<Math.abs(a.z)*1.8+.6)
        e.energy=Math.max(e.energy,Math.min(1.5,Math.abs(a.z)*.4));
      cycleRef.current(detector.current.sample(a.z,time,a.x||0));
    };
    window.addEventListener('devicemotion',motion);
    const reset=()=>{detector.current.reset();gravity=null;last=0;};
    document.addEventListener('visibilitychange',reset);
    return()=>{alive.current=false;window.removeEventListener('devicemotion',motion);document.removeEventListener('visibilitychange',reset);};
  },[]);
  const enable=()=>{
    setGate(false);
    requestFanPermission(true).then(result=>{
      if(!alive.current)return;
      sensorAllowed.current=result==='granted';
      if(result!=='granted')setFeedback('Movimiento no autorizado. Puedes mover el abanico con el dedo.');
    });
  };
  useEffect(()=>{
    let disposed=false,frame,previous,painted=-1,paintedRock=-1,fogClock=0;
    const art=new Image(),scene=new Image();
    const loaded=image=>new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=reject;});
    const images=Promise.all([loaded(art),loaded(scene)]);
    art.src='/images/day23-fan-reference.png';scene.src='/images/day23-nativity.png';
    const fctx=fan.current.getContext('2d'),ctx=fog.current.getContext('2d');
    let buffer,flow,zone={x:.5,y:.17,width:.8,height:.18};
    const resize=()=>{
      const bounds=stage.current.getBoundingClientRect(),m=message.current.getBoundingClientRect();
      const e=engine.current;e.width=bounds.width;e.height=bounds.height;
      zone={x:(m.left+m.width/2-bounds.left)/bounds.width,y:(m.top+m.height/2-bounds.top)/bounds.height,width:m.width/bounds.width,height:m.height/bounds.height};
      const dpr=Math.min(devicePixelRatio||1,2);
      fan.current.width=Math.round(bounds.width*dpr);fan.current.height=Math.round(bounds.height*dpr);fctx.setTransform(dpr,0,0,dpr,0,0);
      fog.current.width=112;fog.current.height=Math.min(256,Math.round(112*bounds.height/bounds.width));
      buffer=ctx.createImageData(fog.current.width,fog.current.height);
      flow=createFogFlow(buffer.width,buffer.height,flow);
      renderFog(ctx,buffer,e.progress,e.drift,zone,flow);painted=-1;
    };
    const observer=new ResizeObserver(resize);observer.observe(stage.current);observer.observe(message.current);resize();
    images.then(()=>{if(disposed)return;engine.current.ready=true;setReady(true);}).catch(()=>{if(!disposed)setFeedback('No se pudieron cargar las imágenes. Recarga la página.');});
    const tick=now=>{
      const e=engine.current,dt=Math.min(.05,(now-(previous??now))/1000);previous=now;
      if(!document.hidden){
        e.openness+=(Number(e.open)-e.openness)*(1-Math.exp(-dt/.19));
        e.energy*=Math.exp(-dt*1.8);
        if(e.open && e.openness>.9)e.progress=Math.min(e.target,e.progress+dt*.11);
        e.drift+=dt*(.015+e.energy*.19);
        const rock=Math.sin(now*.009)*e.energy*e.openness;
        if(e.ready && (Math.abs(painted-e.openness)>.0004 || Math.abs(paintedRock-rock)>.002)){
          paintFan(fctx,art,e.width,e.height,e.openness,rock);painted=e.openness;paintedRock=rock;
        }
        if(now-fogClock>50){
          stepFogFlow(flow,Math.min(.08,(now-fogClock)/1000),e.energy);
          renderFog(ctx,buffer,e.progress,e.drift,zone,flow);fogClock=now;
          if(!e.completed && messageClear(e.progress,e.drift,zone,buffer)){e.completed=true;setComplete(true);}
        }
      }
      frame=requestAnimationFrame(tick);
    };
    frame=requestAnimationFrame(tick);
    return()=>{disposed=true;cancelAnimationFrame(frame);observer.disconnect();engine.current.ready=false;};
  },[]);
  const toggle=()=>{const e=engine.current;if(!e.ready)return;e.open=!e.open;setOpen(e.open);detector.current.reset();};
  const point=event=>{const r=stage.current.getBoundingClientRect();return{x:event.clientX-r.left,y:event.clientY-r.top};};
  const down=event=>{
    if(!event.isPrimary || event.button!==0 || !ready)return;
    const p=point(event),e=engine.current;if(!fanHit(p.x,p.y,e.width,e.height,e.openness))return;
    gesture.current={id:event.pointerId,start:p,last:p,time:event.timeStamp,travel:0};
    detector.current.reset();event.currentTarget.setPointerCapture(event.pointerId);
  };
  const move=event=>{
    const g=gesture.current;if(!g||g.id!==event.pointerId)return;
    const p=point(event),dt=Math.max(.008,(event.timeStamp-g.time)/1000);
    g.travel+=Math.hypot(p.x-g.last.x,p.y-g.last.y);
    if(engine.current.open && engine.current.openness>.9){
      const speed=(p.y-g.last.y)/dt;
      // Screen up/down is the touch equivalent of the fan's forward/back stroke.
      cycle(detector.current.sample(speed/100,event.timeStamp,(p.x-g.last.x)/dt/100));
      engine.current.energy=Math.max(engine.current.energy,Math.min(1,Math.abs(speed)/700));
    }
    g.last=p;g.time=event.timeStamp;
  };
  const up=(event,cancel=false)=>{
    const g=gesture.current;if(!g||g.id!==event.pointerId)return;
    gesture.current=null;detector.current.reset();
    if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);
    if(!cancel && g.travel<10)toggle();
  };
  return <main ref={stage} className="day23-fan-page" data-complete={complete}>
    <img className="day23-nativity" style={{visibility:ready?'visible':'hidden'}} src="/images/day23-nativity.png" alt="Pesebre navideño bajo un cielo estrellado" aria-hidden={!complete} draggable="false"/>
    <article ref={message} className="day23-message" style={{visibility:ready?'visible':'hidden'}} aria-hidden={!complete}>
      <h1>Un mensaje para ustedes</h1><p>Aquí irá el mensaje de diciembre 23.</p>
    </article>
    <canvas className="day23-fog" ref={fog} aria-hidden="true"/>
    <canvas className="day23-fan-canvas" ref={fan} aria-hidden="true"/>
    <button className="day23-fan-control" aria-label={open?'Cerrar el abanico':'Abrir el abanico'} aria-expanded={open} disabled={!ready}
      onPointerDown={down} onPointerMove={move} onPointerUp={e=>up(e)} onPointerCancel={e=>up(e,true)} onLostPointerCapture={e=>up(e,true)}
      onClick={e=>{if(e.detail===0)toggle();}}/>
    <p className="day23-date">Diciembre 23</p>
    {gate && <div className="day23-sensor-gate"><button onClick={enable}>Activar movimiento</button></div>}
    {feedback && <p className="day23-feedback" role="status">{feedback}</p>}
  </main>;
}
