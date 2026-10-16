// Each slice uses the original photographic artwork. All rotations share the
// same physical rivet; every rigid slat includes its rounded end below the pin.
export const FAN_BLADES=19;
export function fanPose(width,height,open,rock=0) {
  return {x:width*.5,y:height*.94,radius:Math.min(height*.72,width*.95),scaleX:1,scaleY:1,open};
}
export function bladeAngle(index,open){
  const closed=-25+index*4/(FAN_BLADES-1);
  const opened=-75+index*150/(FAN_BLADES-1);
  return closed+(opened-closed)*open;
}
export const SLAT_END={halfWidth:19,belowPivot:48};
function slatPath(ctx){
  const half=4.8*Math.PI/180;
  ctx.beginPath();ctx.moveTo(-19,27);
  ctx.lineTo(-22,-200);ctx.lineTo(-Math.sin(half)*780,-Math.cos(half)*780);
  ctx.arc(0,0,780,-Math.PI/2-half,-Math.PI/2+half);
  ctx.lineTo(22,-200);ctx.lineTo(19,27);
  ctx.bezierCurveTo(19,55,-19,55,-19,27);ctx.closePath();
}
export function paintFan(ctx,image,width,height,open,rock) {
  ctx.clearRect(0,0,width,height);
  const p=fanPose(width,height,open,rock);
  ctx.save();ctx.translate(p.x,p.y);ctx.scale(p.scaleX,p.scaleY);
  const ratio=p.radius/780;
  for(let i=0;i<FAN_BLADES;i++){
    const original=(-75+i*150/(FAN_BLADES-1))*Math.PI/180;
    ctx.save();ctx.rotate(bladeAngle(i,open)*Math.PI/180);ctx.scale(ratio,ratio);
    slatPath(ctx);ctx.clip();
    // This textured shaft and rounded tail are one rigid piece, through the pin.
    ctx.drawImage(image,749,620,38,150,-23,-260,46,310);
    ctx.save();ctx.beginPath();ctx.rect(-800,-800,1600,600);ctx.clip();
    ctx.rotate(-original);ctx.drawImage(image,-768,-850,1536,1024);ctx.restore();
    slatPath(ctx);ctx.strokeStyle='rgba(65,28,8,.23)';ctx.lineWidth=.65/ratio;ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
  // Round photographic rivet, without carrying a square of source background.
  ctx.save();ctx.beginPath();ctx.arc(p.x,p.y-1,10,0,Math.PI*2);ctx.clip();
  ctx.drawImage(image,750,829,36,36,p.x-10,p.y-11,20,20);ctx.restore();
}
export function fanHit(x,y,width,height,open) {
  const p=fanPose(width,height,open),dx=(x-p.x)/p.scaleX,dy=y-p.y;
  const radius=Math.hypot(dx,dy),angle=Math.atan2(dx,-dy)*180/Math.PI;
  return radius<28 || radius<p.radius+10 && angle>=bladeAngle(0,open)-6 && angle<=bladeAngle(FAN_BLADES-1,open)+6;
}
