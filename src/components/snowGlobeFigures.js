export const GLOBE_FIGURES = [
  { id:'star', label:'Estrella' }, { id:'snowflake', label:'Copo de nieve' },
  { id:'reindeer', label:'Reno' }, { id:'bell', label:'Campana' }, { id:'heart', label:'Corazón' },
];
const point = (x,y) => ({x,y});
const polygon = coords => coords.map(([x,y])=>point(x,y));
const heart = Array.from({length:160},(_,i)=>{
  const t=i*Math.PI*2/160;
  return point(.5+.021*16*Math.sin(t)**3,.46-.022*(13*Math.cos(t)-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t)));
});
const bell = polygon([[.22,.72],[.28,.67],[.31,.61],[.33,.4],[.35,.32],[.4,.26],[.46,.23],[.54,.23],[.6,.26],[.65,.32],[.67,.4],[.69,.61],[.72,.67],[.78,.72],[.69,.74],[.31,.74]]);
// One continuous leaping silhouette; separate branching paths keep antlers fine.
const deer = polygon([[.24,.49],[.3,.46],[.47,.47],[.54,.43],[.57,.35],[.6,.28],
 [.58,.23],[.61,.22],[.65,.27],[.7,.28],[.72,.31],[.79,.32],[.8,.35],[.77,.38],
 [.69,.37],[.66,.42],[.65,.49],[.68,.51],[.75,.48],[.8,.5],[.8,.57],[.76,.6],
 [.73,.58],[.75,.53],[.68,.56],[.62,.56],[.6,.59],[.69,.63],[.7,.69],[.66,.7],
 [.65,.66],[.55,.63],[.49,.59],[.37,.6],[.31,.65],[.24,.72],[.19,.78],[.15,.77],
 [.17,.73],[.22,.68],[.27,.59],[.21,.61],[.16,.66],[.12,.67],[.11,.64],[.19,.55],
 [.22,.52],[.17,.46],[.18,.42],[.21,.45]]);
const antlers = [
 [[.64,.29],[.59,.18],[.51,.14],[.48,.08]],
 [[.59,.18],[.6,.09],[.58,.06]], [[.55,.16],[.54,.08]],
 [[.66,.28],[.7,.19],[.72,.11],[.7,.07]],
 [[.7,.19],[.77,.15],[.78,.1]], [[.72,.13],[.75,.09]],
];
const ellipse=(cx,cy,rx,ry)=>Array.from({length:48},(_,i)=>point(cx+Math.cos(i*Math.PI/24)*rx,cy+Math.sin(i*Math.PI/24)*ry));
function geometry(id) {
  if(id==='heart')return {fill:heart,paths:[{points:heart,closed:true}]};
  if(id==='bell')return {fill:bell,paths:[{points:bell,closed:true},
    {points:ellipse(.5,.2,.035,.045),closed:true},{points:ellipse(.5,.767,.04,.04),closed:true},
    {points:polygon([[.26,.7],[.5,.715],[.74,.7]])}]};
  if(id==='reindeer') {
    const fit=points=>points.map(p=>point(.5+(p.x-.5)*.92,.47+(p.y-.47)*.92));
    const body=fit(deer);
    return {fill:body,paths:[{points:body,closed:true},...antlers.map(p=>({points:fit(polygon(p))}))]};
  }
  const paths=[];
  for(let i=0;i<6;i++) {
    const angle=i*Math.PI/3-Math.PI/2;
    const at=(along,side=0)=>point(.5+Math.cos(angle)*along-Math.sin(angle)*side,.47+Math.sin(angle)*along+Math.cos(angle)*side);
    paths.push({points:[at(0),at(.35)]});
    for(const r of [.18,.27])for(const side of [-1,1])paths.push({points:[at(r+.055,side*.05),at(r)]});
  }
  return {paths};
}
function inside(p, poly) {
  let result=false;
  for(let i=0,j=poly.length-1;i<poly.length;j=i++) {
    const a=poly[i],b=poly[j];
    if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)result=!result;
  }
  return result;
}
export function figureSampler(id,random) {
  const {paths,fill}=geometry(id), segments=[];let total=0;
  for(const path of paths)for(let i=0;i<path.points.length-(path.closed?0:1);i++) {
    const a=path.points[i],b=path.points[(i+1)%path.points.length];
    total+=Math.hypot(b.x-a.x,b.y-a.y);segments.push({a,b,end:total});
  }
  return ()=>{
    if(fill && random()<.3)for(let tries=0;tries<100;tries++){
      const p=point(.1+random()*.8,.06+random()*.78);if(inside(p,fill))return p;
    }
    const d=random()*total, segment=segments.find(s=>s.end>=d)||segments.at(-1),u=random();
    return point(segment.a.x+(segment.b.x-segment.a.x)*u+(random()-.5)*.007,
      segment.a.y+(segment.b.y-segment.a.y)*u+(random()-.5)*.007);
  };
}
