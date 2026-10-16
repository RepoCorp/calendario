import { useEffect, useRef, useState } from 'react';
import { createDust, renderDust, timeline, phaseAt, advanceGlobe } from '../components/snowGlobeMagic';
import '../components/Day15Globe.css';
import { GLOBE_FIGURES } from '../components/snowGlobeFigures';

export default function Day15() {
  const canvas=useRef(null), engine=useRef({time:0,active:false,paused:false,figureIndex:-1,motionTime:0,shakingUntil:0});
  const [loaded,setLoaded]=useState(false), [time,setTime]=useState(0), [paused,setPaused]=useState(false);
  const [settings,setSettings]=useState({count:1800,glow:1,swirl:1,formation:5,boundary:false});
  const [figure,setFigure]=useState('star');
  const figureRef=useRef('star');
  const config=useRef(settings);config.current=settings;
  const [permission,setPermission]=useState('');
  const permissionRequest=useRef(null), mounted=useRef(true);
  const trigger=()=>{const e=engine.current;if(!loaded||e.active)return;const choices=GLOBE_FIGURES.map((_,i)=>i).filter(i=>i!==e.figureIndex);e.figureIndex=choices[Math.floor(Math.random()*choices.length)]??0;figureRef.current=GLOBE_FIGURES[e.figureIndex].id;setFigure(figureRef.current);e.time=0;e.motionTime=0;e.active=true;e.paused=false;setPaused(false);};
  const triggerRef=useRef(trigger);triggerRef.current=trigger;
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  const touchGlobe=()=>{
    trigger();
    if(typeof window.DeviceMotionEvent?.requestPermission==='function' && !permissionRequest.current) {
      permissionRequest.current=window.DeviceMotionEvent.requestPermission().then(result=>{
        if(mounted.current && result!=='granted') setPermission('Movimiento no autorizado. Puedes tocar el globo.');
      }).catch(()=>{if(mounted.current)setPermission('No se pudo activar el movimiento. Puedes tocar el globo.');});
    }
  };
  useEffect(()=>{
    let gravity=null, lastPeak=0, lastTrigger=0;
    const motion=event=>{
      const raw=event.accelerationIncludingGravity;
      let a=event.acceleration;
      if(a?.x==null && raw?.x!=null) {
        if(!gravity)gravity={x:raw.x,y:raw.y,z:raw.z};
        a={x:raw.x-gravity.x,y:raw.y-gravity.y,z:raw.z-gravity.z};
        for(const k of ['x','y','z'])gravity[k]+=(raw[k]-gravity[k])*.15;
      }
      if(a?.x==null)return;
      const now=performance.now(), strength=Math.hypot(a.x,a.y,a.z);
      if(engine.current.active && strength>3.5)engine.current.shakingUntil=now+700;
      if(strength>13 && now-lastPeak>100) {
        if(lastPeak && now-lastPeak<650 && now-lastTrigger>1800) {triggerRef.current();engine.current.shakingUntil=now+700;lastTrigger=now;lastPeak=0;}
        else lastPeak=now;
      }
    };
    window.addEventListener('devicemotion',motion);
    return()=>window.removeEventListener('devicemotion',motion);
  },[]);
  useEffect(()=>{
    if(!loaded)return;
    const el=canvas.current,ctx=el.getContext('2d');if(!ctx)return;
    let drawnFigure=figureRef.current, particles=createDust(config.current.count,drawnFigure), count=config.current.count, frame, previous, report=0, size=1;
    const resize=()=>{size=el.getBoundingClientRect().width;const dpr=Math.min(devicePixelRatio||1,2);el.width=el.height=Math.round(size*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);};
    const observer=new ResizeObserver(resize);observer.observe(el);resize();
    const animate=now=>{
      const dt=Math.min((now-(previous??now))/1000,.05);previous=now;
      const e=engine.current,c=config.current;
      if(count!==c.count || drawnFigure!==figureRef.current){count=c.count;drawnFigure=figureRef.current;particles=createDust(count,drawnFigure);}
      if(!document.hidden)advanceGlobe(e,dt,now,c.formation);
      renderDust(ctx,particles,e.time,{...c,motionTime:e.motionTime},size);
      if(now-report>100){setTime(e.time);report=now;}
      frame=requestAnimationFrame(animate);
    };
    frame=requestAnimationFrame(animate);
    return()=>{cancelAnimationFrame(frame);observer.disconnect();};
  },[loaded]);
  const set=(key,value)=>setSettings(s=>({...s,[key]:value}));
  return <main className="day15-enchanted">
    <div className="day15-message-space" aria-hidden="true"/>
    <div className="day15-artwork">
      <img className="day15-background" src="/images/day15-snow-globe.png" alt="Globo de nieve navideño sobre una mesa, junto a una ventana" onLoad={()=>setLoaded(true)} draggable="false"/>
      {loaded && <><canvas className="day15-dust" ref={canvas} aria-hidden="true"/>
        <img className="day15-reflections" src="/images/day15-snow-globe.png" alt="" aria-hidden="true" draggable="false"/>
        <button className="day15-touch" aria-label="Agitar el globo encantado" onClick={touchGlobe}/></>}
    </div>
    <p className="day15-date">Diciembre 15</p>
    {permission && <p className="day15-permission" role="status">{permission}</p>}
  </main>;
}
