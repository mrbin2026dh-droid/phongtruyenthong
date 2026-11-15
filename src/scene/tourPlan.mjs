// All coordinates are metres, Three.js Y-up. Navigation is a walkable graph,
// not an orbit around a wall. Repeated galleries occupy distinct world positions.
export const EYE_HEIGHT=1.7;
export const ROOM_SPACING=22;
export function roomPlacement(index) {
 return {index,side:index%2===0?-1:1,x:index%2===0?-15:15,z:18+Math.floor(index/2)*ROOM_SPACING,yaw:index%2===0?Math.PI/2:-Math.PI/2};
}
export function localToWorld(index,p) {
 const r=roomPlacement(index),c=Math.cos(r.yaw),s=Math.sin(r.yaw);
 return [r.x+c*p[0]+s*p[2],p[1],r.z-s*p[0]+c*p[2]];
}
export function worldToLocal(index,p) {
 const r=roomPlacement(index),dx=p[0]-r.x,dz=p[2]-r.z,c=Math.cos(r.yaw),s=Math.sin(r.yaw);
 return [c*dx-s*dz,p[1],s*dx+c*dz];
}
function clearRoom(x,z) {
 if(Math.abs(x)<1.12&&z>=5.4&&z<=6.85)return true; // 3m doorway with clearance.
 if(Math.abs(x)>7.75||z< -4.7||z>5.45)return false;
 // Expanded obstacles (visitor body radius ~0.3m), including book and benches.
 const obstacles=[[-1.36,1.36,1.46,4.08],[-5.75,-2.25,.06,1.02],[2.25,5.75,.06,1.02],[-7.4,-4.2,1.95,3.7]];
 return !obstacles.some(([a,b,c,d])=>x>=a&&x<=b&&z>=c&&z<=d);
}
export function isWalkable(point,count) {
 const [x,y,z]=point;if(!Number.isFinite(x+y+z)||y<1.3||y>2.4)return false;
 if(clearRoom(x,z))return true;
 const end=18+Math.floor((Math.max(1,count)-1)/2)*ROOM_SPACING+10;
 if(Math.abs(x)<=1.65&&z>=6.3&&z<=end)return true;
 for(let i=0;i<count;i++){
  const r=roomPlacement(i);
  if(Math.abs(z-r.z)<=1.13&&x*r.side>=1.5&&x*r.side<=9.6)return true;
  const p=worldToLocal(i,point);if(clearRoom(p[0],p[2]))return true;
 }
 return false;
}
export function segmentWalkable(a,b,count) {
 const steps=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[2]-a[2])/.08));
 for(let j=0;j<=steps;j++){const t=j/steps;if(!isWalkable(a.map((v,k)=>v+(b[k]-v)*t),count))return false;}
 return true;
}
export function createPlan(count) {
 if(!Number.isFinite(count)||count<0)throw new Error('Invalid room count');
 count=Math.max(1,Math.ceil(count));
 /** @type {Record<string,{id:string,eye:number[],target:number[]}>} */
 const nodes={};
 /** @type {Record<string,string[]>} */
 const edges={};
 const add=(id,eye,target)=>{nodes[id]={id,eye,target};edges[id]=[];};
 const connect=(a,b)=>{if(!segmentWalkable(nodes[a].eye,nodes[b].eye,count))throw new Error('Unsafe navigation edge: '+a+' → '+b);edges[a].push(b);edges[b].push(a);};
 add('lobby',[-2,EYE_HEIGHT,4.5],[0,1.85,-5.5]);
 add('lobby-door',[0,EYE_HEIGHT,6.65],[0,EYE_HEIGHT,11]);
 add('hall-start',[0,EYE_HEIGHT,8],[0,EYE_HEIGHT,18]);
 connect('lobby','lobby-door');connect('lobby-door','hall-start');
 add('lobby-aisle',[-2,EYE_HEIGHT,3.7],[-2,EYE_HEIGHT,1.3]);
 add('lobby-left',[-2,EYE_HEIGHT,1.3],[0,1.85,-5.5]);
 add('lobby-right',[3,EYE_HEIGHT,-1.2],[0,1.85,-5.5]);
 connect('lobby','lobby-aisle');connect('lobby-aisle','lobby-left');
 connect('lobby-left','lobby-right');
 for(let row=0;row<Math.ceil(count/2);row++){
  const z=18+row*ROOM_SPACING;
  add('hall-'+row,[0,EYE_HEIGHT,z],[0,EYE_HEIGHT,z+8]);
  connect(row===0?'hall-start':'hall-'+(row-1),'hall-'+row);
 }
 for(let i=0;i<count;i++){
  const r=roomPlacement(i),row=Math.floor(i/2),prefix='room-'+i;
  add(prefix+'-branch',[r.side*5,EYE_HEIGHT,r.z],[r.side*11,EYE_HEIGHT,r.z]);
  add(prefix+'-door',localToWorld(i,[0,EYE_HEIGHT,6.6]),localToWorld(i,[0,EYE_HEIGHT,3]));
  add(prefix+'-entry',localToWorld(i,[0,EYE_HEIGHT,5.05]),localToWorld(i,[-2,EYE_HEIGHT,4.5]));
  add(prefix+'-bypass',localToWorld(i,[-2,EYE_HEIGHT,4.5]),localToWorld(i,[-2,EYE_HEIGHT,1.3]));
  add(prefix+'-aisle',localToWorld(i,[-2,EYE_HEIGHT,1.3]),localToWorld(i,[0,EYE_HEIGHT,0]));
  add(prefix,localToWorld(i,[0,EYE_HEIGHT,0]),localToWorld(i,[0,1.85,-5.5]));
  add(prefix+'-left',localToWorld(i,[-5.35,EYE_HEIGHT,-2.4]),localToWorld(i,[-5.35,1.85,-5.5]));
  add(prefix+'-right',localToWorld(i,[5.35,EYE_HEIGHT,-2.4]),localToWorld(i,[5.35,1.85,-5.5]));
  connect('hall-'+row,prefix+'-branch');connect(prefix+'-branch',prefix+'-door');
  connect(prefix+'-door',prefix+'-entry');connect(prefix+'-entry',prefix+'-bypass');
  connect(prefix+'-bypass',prefix+'-aisle');connect(prefix+'-aisle',prefix);
  connect(prefix,prefix+'-left');connect(prefix,prefix+'-right');
 }
 return {count,nodes,edges};
}
export function findPath(plan,from,to) {
 if(!plan.nodes[from]||!plan.nodes[to])throw new Error('Unknown tour destination');
 const queue=[from],previous=new Map([[from,null]]);
 for(let n=0;n<queue.length;n++){const id=queue[n];if(id===to)break;for(const next of plan.edges[id])if(!previous.has(next)){previous.set(next,id);queue.push(next);}}
 if(!previous.has(to))throw new Error('Unreachable tour destination');
 const route=[];for(let p=to;p!==null;p=previous.get(p))route.unshift(plan.nodes[p]);
 return route;
}
export function roomForNode(id){const match=/^room-(\d+)/.exec(id);return match?Number(match[1]):-1;}

