import {findPath,segmentWalkable,isWalkable} from './hallLayout.mjs';
export const WALK_SPEED=1.35;
const mix=(a,b,t)=>a.map((v,k)=>v+(b[k]-v)*t);
const length=(a,b)=>Math.hypot(...a.map((v,k)=>b[k]-v));
export function dampValue(value,target,lambda,dt){return target+(value-target)*Math.exp(-lambda*Math.max(0,dt));}
export function presentationTurnStep(angle,dt){return Math.min(.85*Math.max(0,dt),Math.max(0,angle)*(1-Math.exp(-3.5*Math.max(0,dt))));}
export function regionAt(point,count){return 0;}
/** 16/11 (user): visitors walk freely in the foyer before the door opens — the closed leaves block the doorway
 * (EntranceDoors keeps this in sync with the door). Only manual steps are gated; planned routes run after it opens. */
export const DOOR_GATE={closed:false};
export function positionAllowed(point){return isWalkable(point)&&!(DOOR_GATE.closed&&point[2]<=8.9);}
export function slideStep(position,delta,count,loadedRooms){
 // Substeps prevent tunnelling during a low frame rate or long key hold.
 let p=position.slice();const steps=Math.max(1,Math.ceil(Math.hypot(delta[0],delta[2])/.06));
 for(let i=0;i<steps;i++){
  const dx=delta[0]/steps,dz=delta[2]/steps;
  const full=[p[0]+dx,p[1],p[2]+dz];
  if(positionAllowed(full,count,loadedRooms))p=full;
  else{
   const x=[p[0]+dx,p[1],p[2]];if(positionAllowed(x,count,loadedRooms))p=x;
   const z=[p[0],p[1],p[2]+dz];if(positionAllowed(z,count,loadedRooms))p=z;
  }
 }
 return p;
}
export function routeFromPosition(plan,position,to){
 if(!plan.nodes[to])throw new Error('Unknown hall destination');
 if(segmentWalkable(position,plan.nodes[to].eye))return {nodes:[plan.nodes[to]],points:[position.slice(),plan.nodes[to].eye],destination:plan.nodes[to]};
 let nearest='',distance=Infinity;
 for(const n of Object.values(plan.nodes)){const d=length(position,n.eye);if(d<distance&&segmentWalkable(position,n.eye,plan.count)){nearest=n.id;distance=d;}}
 if(!nearest)throw new Error('No safe connection from current visitor position');
 const graph=findPath(plan,nearest,to);
 const points=[position.slice(),...graph.map(n=>n.eye)];
 return {nodes:graph,points:points.filter((p,i)=>i===0||length(p,points[i-1])>.001),destination:plan.nodes[to]};
}
export function roundedPath(points,count){
 if(points.length<2)return {points:points.map(p=>p.slice()),distances:[0],total:0,roundedCorners:0};
 const out=[points[0]],append=p=>{if(length(out.at(-1),p)>.0001)out.push(p);};
 let roundedCorners=0;
 for(let i=1;i<points.length-1;i++){
  const a=points[i-1],b=points[i],c=points[i+1],ab=length(a,b),bc=length(b,c);
  let accepted=false;
  for(const radius of [.65,.4,.2]){
   const d=Math.min(radius,ab*.32,bc*.32);if(d<.03)continue;
   const before=mix(b,a,d/ab),after=mix(b,c,d/bc),samples=[];
   for(let j=0;j<=18;j++){const t=j/18;samples.push(mix(mix(before,b,t),mix(b,after,t),t));}
   const check=[out.at(-1),...samples,c];
   if(check.slice(1).every((p,j)=>segmentWalkable(check[j],p,count))){
    append(before);samples.slice(1).forEach(append);roundedCorners++;accepted=true;break;
   }
  }
  if(!accepted)append(b);
 }
 append(points.at(-1));
 const distances=[0];for(let i=1;i<out.length;i++)distances.push(distances[i-1]+length(out[i-1],out[i]));
 return {points:out,distances,total:distances.at(-1)||0,roundedCorners};
}
export function samplePath(path,distance){
 const d=Math.max(0,Math.min(path.total,distance));if(path.points.length<2)return path.points[0]?.slice()||[0,1.7,0];
 let low=1,high=path.distances.length-1;
 while(low<high){const m=(low+high)>>1;if(path.distances[m]<d)low=m+1;else high=m;}
 const span=path.distances[low]-path.distances[low-1];
 return mix(path.points[low-1],path.points[low],span?(d-path.distances[low-1])/span:0);
}
export function cornerSpeed(path,distance,maxSpeed){
 const a=samplePath(path,distance),b=samplePath(path,distance+.22),c=samplePath(path,distance+.65);
 const u=[b[0]-a[0],b[2]-a[2]],v=[c[0]-b[0],c[2]-b[2]],lu=Math.hypot(...u),lv=Math.hypot(...v);
 if(lu<.001||lv<.001)return maxSpeed;
 const angle=Math.acos(Math.max(-1,Math.min(1,(u[0]*v[0]+u[1]*v[1])/(lu*lv))));
 return Math.min(maxSpeed,Math.max(.55,1.0/(angle/.45+.001)));
}

