import {clamp,smooth} from './fanMotion.js';
function hash(x,y){let n=Math.imul(x,374761393)^Math.imul(y,668265263);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967296;}
function noise(x,y){const ix=Math.floor(x),iy=Math.floor(y),u=smooth(x-ix),v=smooth(y-iy);return (hash(ix,iy)*(1-u)+hash(ix+1,iy)*u)*(1-v)+(hash(ix,iy+1)*(1-u)+hash(ix+1,iy+1)*u)*v;}
export function fogDensity(x,y,progress,drift,message) {
  if(progress<=0)return 1;if(progress>=1)return 0;
  const cloud=noise(x*4+drift,y*5-drift*.3)*.65+noise(x*11-drift*.6,y*13)*.25+noise(x*23,y*25+drift)*.1;
  // A wide organic elliptical density hill, with no rectangular region or seam.
  const dx=(x-message.x)/(message.width*.9),dy=(y-message.y)/(message.height*1.15);
  const hill=Math.exp(-(dx*dx+dy*dy)*(.7+cloud*.5));
  const delay=clamp(.06+cloud*.22+hill*.56,0,.88);
  return 1-smooth((progress-delay)/(1-delay));
}
export function renderFog(ctx,buffer,progress,drift,message,flow) {
  const {width,height,data}=buffer;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const nx=x/width,ny=y/height,base=fogDensity(nx,ny,progress,drift,message);
    // Slowly drift through the transported field even between fan strokes.
    const density=flow?read(flow.density,width,height,
      clamp(x+Math.sin(drift*.7+ny*3)*1.8,0,width-1),
      clamp(y+Math.cos(drift*.6+nx*2)*1.2,0,height-1)):.8;
    const dx=(nx-message.x)/(message.width*.9),dy=(ny-message.y)/(message.height*1.15);
    const wx=dx+.24*(noise(nx*6+drift*.2,ny*8)-.5);
    const wy=dy+.3*(noise(nx*5+9,ny*7-drift*.15)-.5);
    const hill=Math.exp(-(wx*wx+wy*wy)*(.7+.3*noise(nx*7,ny*9)));
    // Protect the text with the same seamless density hill, while the rest of
    // the field is physically transported. No independent patch or mask.
    const protectedFog=base*smooth(hill);
    const transported=1-smooth(progress/(.12+.88*clamp(density)));
    const a=progress<=0?1:progress>=1?0:Math.max(protectedFog,transported);
    const edge=flow?Math.abs(density-flow.density[y*width+Math.max(0,x-1)]):0;
    const shade=smooth(clamp((density-.18)*1.4+edge*2));
    const i=(y*width+x)*4;
    data[i]=112+shade*119;data[i+1]=116+shade*113;data[i+2]=123+shade*101;data[i+3]=Math.round(a*255);
  }
  ctx.putImageData(buffer,0,0);
}
export function messageClear(progress,drift,message,buffer) {
  if(buffer){
    const {width,height,data}=buffer;
    const left=Math.max(0,Math.floor((message.x-message.width/2)*width));
    const right=Math.min(width-1,Math.ceil((message.x+message.width/2)*width));
    const top=Math.max(0,Math.floor((message.y-message.height/2)*height));
    const bottom=Math.min(height-1,Math.ceil((message.y+message.height/2)*height));
    for(let y=top;y<=bottom;y++)for(let x=left;x<=right;x++)
      if(data[(y*width+x)*4+3]>6)return false;
    return true;
  }
  for(let y=-.5;y<=.5;y+=.125)for(let x=-.5;x<=.5;x+=.125)
    if(fogDensity(message.x+x*message.width,message.y+y*message.height,progress,drift,message)>.025)return false;
  return true;
}

function read(field,width,height,x,y) {
  if(x<0||x>width-1||y<0||y>height-1)return 0;
  const ix=Math.floor(x),iy=Math.floor(y),u=x-ix,v=y-iy;
  const a=field[iy*width+ix],b=field[iy*width+Math.min(width-1,ix+1)];
  const c=field[Math.min(height-1,iy+1)*width+ix],d=field[Math.min(height-1,iy+1)*width+Math.min(width-1,ix+1)];
  return (a+(b-a)*u)*(1-v)+(c+(d-c)*u)*v;
}
// Broad overlapping banks, domain-warped to avoid recognizable ellipse edges.
function mistBanks(x,y,aspect){
  const px=x+.18*(noise(x*3,y*aspect*3)-.5);
  const py=y+.09*(noise(x*4+8,y*aspect*4)-.5);
  let mist=0;
  for(let i=0;i<11;i++){
    const cx=hash(i,12)*1.3-.15,cy=hash(i,31)*1.3-.15;
    const rx=.18+hash(i,47)*.32,ry=(.22+hash(i,53)*.42)/aspect;
    const dx=(px-cx)/rx,dy=(py-cy)/ry;
    mist+=(.5+hash(i,67)*.7)*Math.exp(-(dx*dx+dy*dy)*1.4);
  }
  return .16+.78*(1-Math.exp(-mist*1.5))+.06*noise(px*13,py*aspect*13);
}
export function createFogFlow(width,height,previous) {
  const density=new Float32Array(width*height);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++) {
    const nx=x/width,ny=y/height;
    density[y*width+x]=previous?read(previous.density,previous.width,previous.height,nx*(previous.width-1),ny*(previous.height-1)):
      mistBanks(nx,ny,height/width);
  }
  return {width,height,density,next:new Float32Array(width*height),time:0};
}
// Semi-Lagrangian transport: wind carries the existing cloud field upward and
// outward. Alternating vortices curl and stretch it, leaving winding clear lanes.
export function stepFogFlow(flow,dt,intensity) {
  const {width,height,density,next}=flow;
  dt=Math.min(.08,Math.max(0,dt));flow.time+=dt;
  if(dt===0 || intensity<=0)return;
  const wind=clamp(intensity,0,1.5),t=flow.time;
  const vortices=[
    {x:.26+.08*Math.sin(t*.47),y:.78-(t*.075% .9),spin:1},
    {x:.74+.08*Math.cos(t*.41),y:.9-(t*.065% .95),spin:-1},
    {x:.5+.13*Math.sin(t*.3),y:.5-(t*.045% .7),spin:1},
  ];
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const nx=x/(width-1),ny=y/(height-1);
    let vx=(nx-.5)*wind*.16,vy=-wind*(.2+.14*(1-ny));
    for(const eddy of vortices){
      const dx=nx-eddy.x,dy=ny-eddy.y,r2=dx*dx+dy*dy;
      const strength=eddy.spin*wind*.032*Math.exp(-r2*5)/(r2+.018);
      vx-=dy*strength;vy+=dx*strength;
    }
    const sx=x-vx*width*dt,sy=y-vy*height*dt;
    // A tiny diffusion term softens stretched filaments, without flattening them.
    const center=read(density,width,height,sx,sy);
    const surround=(read(density,width,height,sx-.6,sy)+read(density,width,height,sx+.6,sy))/2;
    const diffusion=1-Math.exp(-dt*.6);
    next[y*width+x]=center*(1-diffusion)+surround*diffusion;
  }
  flow.density=next;flow.next=density;
}
