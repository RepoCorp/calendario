export const clamp = (x,a=0,b=1) => Math.max(a,Math.min(b,x));
export const smooth = x => {x=clamp(x);return x*x*(3-2*x);};
// z is normal to the phone screen: forward/backward, never sideways x.
export function createFanMotion() {
  let filtered=0,lastTime=null,lastSign=0,lastTurn=0,turns=0,start=0,peak=0;
  const reset=()=>{filtered=0;lastTime=null;lastSign=0;lastTurn=0;turns=0;start=0;peak=0;};
  function sample(z,time,side=0) {
    if(!Number.isFinite(z)||!Number.isFinite(time))return null;
    const dt=lastTime===null?.016:clamp((time-lastTime)/1000,.001,.1);lastTime=time;
    if(time-lastTurn>1800 && lastSign){lastSign=0;turns=0;peak=0;}
    filtered+=(clamp(z,-8,8)-filtered)*(1-Math.exp(-dt/.065));
    if(Math.abs(filtered)<.48 || Math.abs(side)>Math.abs(z)*1.8+.6)return null;
    const sign=Math.sign(filtered);peak=Math.max(peak,Math.abs(filtered));
    if(!lastSign){lastSign=sign;lastTurn=start=time;return null;}
    if(sign===lastSign || time-lastTurn<140)return null;
    lastSign=sign;lastTurn=time;turns++;
    if(turns<2)return null;
    const duration=(time-start)/1000;start=time;turns=0;
    if(duration<.3||duration>3.2){peak=0;return null;}
    const intensity=clamp(.35+peak*.16+.15/duration,.35,1);
    peak=0;return {intensity,duration};
  }
  return {sample,reset};
}
