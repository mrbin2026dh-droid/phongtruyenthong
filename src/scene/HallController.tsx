import {useEffect,useRef} from 'react';
import type {MutableRefObject} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import {Vector3,Quaternion,Matrix4,Euler,PerspectiveCamera} from 'three';
import {dampValue,presentationTurnStep,routeFromPosition,roundedPath,samplePath,cornerSpeed,slideStep,regionAt} from './hallMotion.mjs';
import {ARRIVAL_START,arrivalRoute} from './hallArrival.mjs';
import type {Plan,TourCommand} from './GuidedScene';

export type NavigationInput={forward:number;strafe:number;turn:number;look:number;zoom:number;speed:number;reset:number};
export const neutralInput=():NavigationInput=>({forward:0,strafe:0,turn:0,look:0,zoom:0,speed:1,reset:0});
/** Live visitor pose for the map's "Bạn đang ở đây" marker (x/z metres, yaw radians). */
export type VisitorPose={x:number;z:number;yaw:number};
/** Current walking route for the floor guide dots; null when not travelling. */
export type RouteState={points:number[][];distances:number[];total:number;travelled:number;serial:number}|null;
/** Keys typed into form fields or the on-screen sticks must not drive the camera. */
export function keyTargetIgnored(target:EventTarget|null){
 const el=target as HTMLElement|null;if(!el||!el.tagName)return false;
 return /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName)||el.isContentEditable||Boolean(el.closest?.('.thumbstick-base,dialog,.hall-panel'));
}

export default function HallController({plan,command,paused,effects,input,loadedRooms,onArrive,onMotion,onRegion,controlsLocked=false,pose,route}:{plan:Plan;command:TourCommand;paused:boolean;effects:boolean;input:MutableRefObject<NavigationInput>;loadedRooms:number[];onArrive:(id:string)=>void;onMotion:(v:boolean)=>void;onRegion:(id:string)=>void;controlsLocked?:boolean;pose?:MutableRefObject<VisitorPose>;route?:MutableRefObject<RouteState>}){
 const {camera,gl,invalidate,size}=useThree();
 const motion=useRef({running:false,orienting:false,settling:false,wallTravel:false,distance:0,speed:0,path:roundedPath([[0,1.7,5.05]],1),to:'lobby',goal:[0,1.85,-5.5]});
 const view=useRef({yaw:0,pitch:0,targetYaw:0,targetPitch:0,fov:62,targetFov:62,vx:0,vz:0,region:-1,reset:0});
 const keys=useRef(new Set<string>()),drag=useRef<{id:number;x:number;y:number}|null>(null);
 const live=useRef({paused,effects,loadedRooms,onArrive,onMotion,onRegion,controlsLocked});live.current={paused,effects,loadedRooms,onArrive,onMotion,onRegion,controlsLocked};
 const initialized=useRef(false),lastRegion=useRef(-1),handled=useRef(0);
 const routeRef=useRef(route);routeRef.current=route;
 const pointers=useRef(new Map<number,{x:number;y:number}>()),pinch=useRef(0);
 const euler=useRef(new Euler());
 function readLook(){const e=new Euler().setFromQuaternion(camera.quaternion,'YXZ');view.current.yaw=view.current.targetYaw=e.y;view.current.pitch=view.current.targetPitch=e.x;}
 useEffect(()=>{if(!initialized.current){const entrance=plan.nodes.entrance;camera.position.fromArray(ARRIVAL_START);camera.lookAt(...entrance.target as [number,number,number]);readLook();initialized.current=true;invalidate();}},[camera,invalidate,plan]);
 useEffect(()=>{view.current.targetFov=size.width/size.height<1.1?78:62;invalidate();},[size,invalidate]);
 useEffect(()=>{if(paused||controlsLocked){keys.current.clear();input.current.forward=0;input.current.strafe=0;input.current.turn=0;input.current.look=0;view.current.vx=0;view.current.vz=0;drag.current=null;}if(paused)motion.current.speed=0;invalidate();},[paused,controlsLocked,invalidate,input]);
 useEffect(()=>{
  if(command.serial===0||handled.current===command.serial)return; // Resize must not replay entry.
  handled.current=command.serial;
  if((command as typeof command&{manual?:boolean}).manual){
   motion.current.running=false;motion.current.speed=0;motion.current.orienting=false;motion.current.settling=false;
   view.current.vx=0;view.current.vz=0;keys.current.clear();readLook();
   if(routeRef.current)routeRef.current.current=null;
   live.current.onMotion(false);invalidate();return;
  }
  const route=command.from==='arrival'?arrivalRoute(plan.nodes.entrance):routeFromPosition(plan,camera.position.toArray(),command.to);
  const path=roundedPath(route.points,plan.count),m=motion.current;
  m.to=command.to;m.goal=route.destination.target;m.path=path;m.distance=0;m.speed=0;m.settling=false;m.running=false;
  const origin=plan.nodes[command.from] as typeof route.destination;
  m.wallTravel=Boolean(origin?.wall&&origin.wall===route.destination.wall&&path.total<9);
  m.orienting=!m.wallTravel;
  view.current.vx=0;view.current.vz=0;keys.current.clear();
  if((command as typeof command&{instant?:boolean}).instant||!effects||matchMedia('(prefers-reduced-motion: reduce)').matches||path.total<.015){
   camera.position.fromArray(route.destination.eye);camera.lookAt(...route.destination.target as [number,number,number]);readLook();lastRegion.current=regionAt(camera.position.toArray(),plan.count);if(routeRef.current)routeRef.current.current=null;live.current.onMotion(false);live.current.onArrive(command.to);invalidate();return;
  }
  if(routeRef.current)routeRef.current.current={points:path.points,distances:path.distances,total:path.total,travelled:0,serial:command.serial};
  m.running=true;live.current.onMotion(true);invalidate();
 },[command.serial,plan,camera,invalidate]);
 useEffect(()=>{
  const c=gl.domElement;c.tabIndex=0;c.style.touchAction='none';
  const blocked=()=>live.current.paused||live.current.controlsLocked;
  const gap=()=>{const [p,q]=[...pointers.current.values()];return Math.hypot(p.x-q.x,p.y-q.y);};
  const down=(e:PointerEvent)=>{
   pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});
   if(blocked()||motion.current.running)return;
   c.focus({preventScroll:true});try{c.setPointerCapture(e.pointerId);}catch{/* pointer already released */}
   // Two fingers = pinch to zoom; never look-drag with a second finger.
   if(pointers.current.size>=2){drag.current=null;pinch.current=gap();return;}
   drag.current={id:e.pointerId,x:e.clientX,y:e.clientY};
  };
  const move=(e:PointerEvent)=>{
   if(pointers.current.has(e.pointerId))pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});
   if(pointers.current.size>=2&&pinch.current>0&&!blocked()){
    const d=gap();view.current.targetFov=Math.max(45,Math.min(84,view.current.targetFov*pinch.current/Math.max(1,d)));pinch.current=d;invalidate();return;
   }
   const p=drag.current;if(!p||p.id!==e.pointerId)return;view.current.targetYaw-=(e.clientX-p.x)*.0024;view.current.targetPitch=Math.max(-.60,Math.min(.60,view.current.targetPitch-(e.clientY-p.y)*.0024));p.x=e.clientX;p.y=e.clientY;invalidate();
  };
  const up=(e:PointerEvent)=>{pointers.current.delete(e.pointerId);if(pointers.current.size<2)pinch.current=0;if(drag.current?.id===e.pointerId)drag.current=null;};
  // Keyboard works without first clicking the scene (window level), except while typing in a field,
  // using the on-screen sticks or reading a panel/dialog.
  const keydown=(e:KeyboardEvent)=>{if(e.ctrlKey||e.metaKey||e.altKey||keyTargetIgnored(e.target))return;const k=e.key.toLowerCase();if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(k)&&!blocked()&&!motion.current.running){e.preventDefault();keys.current.add(k);invalidate();}};
  const keyup=(e:KeyboardEvent)=>{keys.current.delete(e.key.toLowerCase());invalidate();};
  const blur=()=>{keys.current.clear();drag.current=null;pointers.current.clear();pinch.current=0;input.current.forward=0;input.current.strafe=0;input.current.turn=0;input.current.look=0;input.current.zoom=0;view.current.vx=0;view.current.vz=0;};
  const wheel=(e:WheelEvent)=>{if(blocked())return;e.preventDefault();view.current.targetFov=Math.max(45,Math.min(84,view.current.targetFov+Math.max(-80,Math.min(80,e.deltaY))*.025));invalidate();};
  c.addEventListener('pointerdown',down);c.addEventListener('pointermove',move);c.addEventListener('pointerup',up);c.addEventListener('pointercancel',up);window.addEventListener('keydown',keydown);window.addEventListener('keyup',keyup);window.addEventListener('blur',blur);c.addEventListener('wheel',wheel,{passive:false});
  return ()=>{c.removeEventListener('pointerdown',down);c.removeEventListener('pointermove',move);c.removeEventListener('pointerup',up);c.removeEventListener('pointercancel',up);window.removeEventListener('keydown',keydown);window.removeEventListener('keyup',keyup);window.removeEventListener('blur',blur);c.removeEventListener('wheel',wheel);};
 },[camera,gl,invalidate,input]);

 useEffect(()=>{const wake=()=>invalidate();window.addEventListener('museum-navigation-input',wake);return ()=>window.removeEventListener('museum-navigation-input',wake);},[invalidate]);
 useFrame((_,rawDt)=>{
  if(pose){const e=euler.current.setFromQuaternion(camera.quaternion,'YXZ');pose.current.x=camera.position.x;pose.current.z=camera.position.z;pose.current.yaw=e.y;}
  if(live.current.paused)return;
  const dt=Math.min(rawDt,.05),m=motion.current,v=view.current,n=input.current;
  if(route?.current&&m.running&&!m.orienting)route.current.travelled=m.distance;
  let active=false;
  const turnTo=(q:Quaternion)=>{const angle=camera.quaternion.angleTo(q);camera.quaternion.rotateTowards(q,presentationTurnStep(angle,dt));};
  if(m.running){
   if(m.orienting){
    const ahead=new Vector3().fromArray(samplePath(m.path,Math.min(m.path.total,.8)));
    const q=new Quaternion().setFromRotationMatrix(new Matrix4().lookAt(camera.position,ahead,new Vector3(0,1,0)));
    turnTo(q);
    if(camera.quaternion.angleTo(q)<.12)m.orienting=false;
   }else if(!m.settling){
    const remaining=m.path.total-m.distance;
    const desired=Math.min(1.15*n.speed,Math.sqrt(2*.9*Math.max(0,remaining)),cornerSpeed(m.path,m.distance,1.15*n.speed));
    m.speed=dampValue(m.speed,desired,desired<m.speed?7:3.5,dt);
    const advance=Math.min(remaining,Math.max(.015,m.speed)*dt);
    m.distance+=advance;camera.position.fromArray(samplePath(m.path,m.distance));
    const ahead=new Vector3().fromArray(samplePath(m.path,Math.min(m.path.total,m.distance+.8)));
    if(ahead.distanceTo(camera.position)>.005){
     const q=new Quaternion().setFromRotationMatrix(new Matrix4().lookAt(camera.position,ahead,new Vector3(0,1,0)));
     const exhibit=new Quaternion().setFromRotationMatrix(new Matrix4().lookAt(camera.position,new Vector3(...m.goal as [number,number,number]),new Vector3(0,1,0)));
     const t=Math.max(0,Math.min(1,1-remaining/2.5));q.slerp(exhibit,m.wallTravel?1:t*t*(3-2*t));turnTo(q);
    }
    if(remaining<.012){camera.position.fromArray(samplePath(m.path,m.path.total));m.settling=true;}
   }else{
    const q=new Quaternion().setFromRotationMatrix(new Matrix4().lookAt(camera.position,new Vector3(...m.goal as [number,number,number]),new Vector3(0,1,0)));
    turnTo(q);
    if(camera.quaternion.angleTo(q)<.008){camera.quaternion.copy(q);readLook();m.running=false;m.speed=0;if(route)route.current=null;lastRegion.current=regionAt(camera.position.toArray(),plan.count);live.current.onMotion(false);live.current.onArrive(m.to);}
   }
   active=true;
  }else{
   const f=n.forward+(keys.current.has('w')||keys.current.has('arrowup')?1:0)-(keys.current.has('s')||keys.current.has('arrowdown')?1:0);
   const s=n.strafe+(keys.current.has('d')?1:0)-(keys.current.has('a')?1:0);
   const turn=n.turn+(keys.current.has('arrowleft')?1:0)-(keys.current.has('arrowright')?1:0);
   v.targetYaw+=turn*.85*dt;
   v.targetPitch=Math.max(-.60,Math.min(.60,v.targetPitch+n.look*.65*dt));
   if(n.reset!==v.reset){v.reset=n.reset;const node=plan.nodes[m.to]||plan.nodes.entrance;const q=new Quaternion().setFromRotationMatrix(new Matrix4().lookAt(camera.position,new Vector3(...node.target as [number,number,number]),new Vector3(0,1,0)));const e=new Euler().setFromQuaternion(q,'YXZ');v.targetYaw=v.yaw+Math.atan2(Math.sin(e.y-v.yaw),Math.cos(e.y-v.yaw));v.targetPitch=e.x;v.targetFov=size.width/size.height<1.1?78:62;}
   v.yaw=dampValue(v.yaw,v.targetYaw,10,dt);v.pitch=dampValue(v.pitch,v.targetPitch,10,dt);
   camera.quaternion.setFromEuler(new Euler(v.pitch,v.yaw,0,'YXZ'));
   const d=Math.max(1,Math.hypot(f,s)),speed=1.35*n.speed;
   const targetX=(-Math.sin(v.yaw)*f+Math.cos(v.yaw)*s)/d*speed,targetZ=(-Math.cos(v.yaw)*f-Math.sin(v.yaw)*s)/d*speed;
   v.vx=dampValue(v.vx,targetX,f||s?7:12,dt);v.vz=dampValue(v.vz,targetZ,f||s?7:12,dt);
   if(Math.hypot(v.vx,v.vz)>.003){
    const next=slideStep(camera.position.toArray(),[v.vx*dt,0,v.vz*dt],plan.count,live.current.loadedRooms);
    camera.position.fromArray(next);
    const region=regionAt(next,plan.count);
    if(region!==lastRegion.current){lastRegion.current=region;const row=Math.max(0,Math.min(Math.ceil(plan.count/2)-1,Math.round((next[2]-18)/22)));live.current.onRegion(region>=0?'room-'+region:next[2]<6.5?'lobby':'hall-'+row);}
   }
   active=Boolean(f||s||turn||n.look||Math.hypot(v.vx,v.vz)>.003||Math.abs(v.targetYaw-v.yaw)>.0002||Math.abs(v.targetPitch-v.pitch)>.0002);
  }
  v.targetFov=Math.max(45,Math.min(84,v.targetFov+n.zoom*24*dt));
  v.fov=dampValue(v.fov,v.targetFov,9,dt);
  if(camera instanceof PerspectiveCamera&&Math.abs(camera.fov-v.fov)>.005){camera.fov=v.fov;camera.updateProjectionMatrix();active=true;}
  if(n.zoom||active)invalidate();
 });
 return null;
}

