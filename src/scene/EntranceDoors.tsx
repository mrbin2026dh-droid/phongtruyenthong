import {useEffect,useMemo,useRef} from 'react';
import type {MutableRefObject} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import {BoxGeometry,CanvasTexture,CylinderGeometry,Frustum,Group,Matrix4,MeshBasicMaterial,MeshStandardMaterial,Plane,PlaneGeometry,RepeatWrapping,SRGBColorSpace,Vector3} from 'three';
import {DOOR_JAMB,doorOffset,doorStep} from './doorMotion.mjs';
import {FACADE_Z,PLAQUE} from './hallArrival.mjs';

/** Door state shared with HallTour: target 0 = closed, 1 = open; value animates towards target. */
export type DoorState={target:number;value:number};

/** School plaque on the stone facade right of the door (15/11: moved off the door leaves, which split it). */
export const DOOR_PLAQUE_LINES=['UBND XÃ ĐĂK HÀ','TRƯỜNG THCS CHU VĂN AN','PHÒNG TRUYỀN THỐNG'] as const;

const cube=new BoxGeometry(1,1,1),standoff=new CylinderGeometry(.018,.018,.03,16);
const rand=(()=>{let s=20261115;return ()=>{s=(s*16807)%2147483647;return s/2147483647;};})();

/** Polished black granite with gilded, slightly engraved lettering. 3072 px wide → about 2 px per mm. */
function plaqueTexture(){
 const W=3072,H=Math.round(W*PLAQUE.h/PLAQUE.w),c=document.createElement('canvas');c.width=W;c.height=H;
 const g=c.getContext('2d')!;
 g.fillStyle='#16191b';g.fillRect(0,0,W,H);
 for(let i=0;i<26000;i++){const v=40+rand()*55|0;g.fillStyle=`rgba(${v},${v+2},${v+4},${.25+rand()*.45})`;g.fillRect(rand()*W,rand()*H,1+rand()*2.5,1+rand()*2.5);}
 // Soft polished sheen (diagonal), as if lit by the spot above.
 const sheen=g.createLinearGradient(0,0,W,H);sheen.addColorStop(0,'rgba(255,245,225,.10)');sheen.addColorStop(.45,'rgba(255,245,225,.02)');sheen.addColorStop(1,'rgba(0,0,0,.18)');g.fillStyle=sheen;g.fillRect(0,0,W,H);
 const gold=g.createLinearGradient(0,H*.1,0,H*.9);gold.addColorStop(0,'#fbe6b0');gold.addColorStop(.5,'#ddb96d');gold.addColorStop(1,'#b48b45');
 g.strokeStyle=gold;g.lineWidth=7;g.strokeRect(64,64,W-128,H-128);g.lineWidth=2.5;g.strokeRect(92,92,W-184,H-184);
 g.textAlign='center';g.textBaseline='middle';
 const line=(text:string,font:(s:number)=>string,size:number,y:number,spacing=0)=>{
  let s=size;g.font=font(s);try{(g as any).letterSpacing=spacing+'px';}catch{/* older canvas */}
  while(g.measureText(text).width>W-300&&s>20){s--;g.font=font(s);}
  // Engraving: dark lower-right edge, light upper-left edge, then the gilded face.
  g.fillStyle='rgba(0,0,0,.75)';g.fillText(text,W/2+3,y+4);
  g.fillStyle='rgba(255,240,205,.35)';g.fillText(text,W/2-2,y-2);
  g.fillStyle=gold;g.fillText(text,W/2,y);
  try{(g as any).letterSpacing='0px';}catch{/* older canvas */}
 };
 const [l1,l2,l3]=DOOR_PLAQUE_LINES;
 line(l1,s=>`600 ${s}px "Noto Sans"`,122,H*.2,16);
 line(l2,s=>`700 ${s}px "Noto Serif"`,140,H*.38,4);
 const y=H*.5;g.fillStyle=gold;g.fillRect(W*.27,y-2,W*.19,4);g.fillRect(W*.54,y-2,W*.19,4);g.save();g.translate(W/2,y);g.rotate(Math.PI/4);g.fillRect(-11,-11,22,22);g.restore();
 line(l3,s=>`700 ${s}px "Noto Serif"`,340,H*.7,8);
 const t=new CanvasTexture(c);t.colorSpace=SRGBColorSpace;t.anisotropy=16;return t;
}

/** Walnut grain for the door leaves (vertical), drawn once. */
function grainTexture(){
 const W=512,H=2048,c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d')!;
 g.fillStyle='#4e3527';g.fillRect(0,0,W,H);
 for(let i=0;i<260;i++){
  const x0=rand()*W,amp=2+rand()*9,freq=.002+rand()*.004,ph=rand()*6,dark=rand()<.6;
  g.strokeStyle=dark?`rgba(38,24,16,${.12+rand()*.28})`:`rgba(120,86,60,${.08+rand()*.18})`;g.lineWidth=.6+rand()*2.6;
  g.beginPath();for(let y=0;y<=H;y+=16){const x=x0+Math.sin(y*freq+ph)*amp;y?g.lineTo(x,y):g.moveTo(x,y);}g.stroke();
 }
 const t=new CanvasTexture(c);t.colorSpace=SRGBColorSpace;t.anisotropy=8;t.wrapS=t.wrapT=RepeatWrapping;return t;
}

/** Fine woven texture for the teal fabric panels. */
function fabricTexture(){
 const N=256,c=document.createElement('canvas');c.width=c.height=N;const g=c.getContext('2d')!;
 g.fillStyle='#1b3e46';g.fillRect(0,0,N,N);
 for(let i=0;i<N;i+=2){g.fillStyle=`rgba(0,0,0,${.05+rand()*.06})`;g.fillRect(0,i,N,1);g.fillStyle=`rgba(255,255,255,${.015+rand()*.03})`;g.fillRect(i,0,1,N);}
 const t=new CanvasTexture(c);t.colorSpace=SRGBColorSpace;t.wrapS=t.wrapT=RepeatWrapping;t.repeat.set(6,9);t.anisotropy=8;return t;
}

/** One material set per leaf: each clips away whatever has slid past its jamb (into the wall). */
function leafMaterials(side:number,grain:CanvasTexture,fabric:CanvasTexture){
 // Right leaf keeps x ≤ jamb, left leaf keeps x ≥ −jamb.
 const clippingPlanes=[new Plane(new Vector3(-side,0,0),DOOR_JAMB)];
 return {
  wood:new MeshStandardMaterial({map:grain,color:'#ffffff',roughness:.5,metalness:0,clippingPlanes}),
  teal:new MeshStandardMaterial({map:fabric,color:'#ffffff',roughness:.85,clippingPlanes}),
  brass:new MeshStandardMaterial({color:'#c9a560',roughness:.3,metalness:.8,clippingPlanes}),
 };
}

// Position is owned by useFrame (not a JSX prop), so a re-render can never snap the doors shut.
const leafGroup=(side:number)=>{const g=new Group();g.position.set(doorOffset(side,0),0,8.15);return g;};

function Leaf({side,m}:{side:number;m:ReturnType<typeof leafMaterials>}){
 // Group origin = the leaf's outer (hinge-side) edge; the leaf extends 2.02 m towards the centre.
 const c=-side*1.01;
 const part=(p:[number,number,number],s:[number,number,number],mat:MeshStandardMaterial)=><mesh position={p} scale={s} geometry={cube} material={mat} castShadow={false}/>;
 return <>
  {/* 3.34 m tall: reaches the lintel (3.36 m) so no gap shows above the closed doors. */}
  {part([c,1.67,0],[2.02,3.34,.08],m.wood)}
  {[-1,1].map(f=><group key={f}>
   {part([c,1.86,f*.047],[1.62,2.5,.016],m.teal)}
   {part([c,1.86+1.25,f*.057],[1.66,.018,.01],m.brass)}{part([c,1.86-1.25,f*.057],[1.66,.018,.01],m.brass)}
   {part([c-.83,1.86,f*.057],[.018,2.52,.01],m.brass)}{part([c+.83,1.86,f*.057],[.018,2.52,.01],m.brass)}
   {/* Vertical pull next to the meeting edge (sliding door). */}
   {part([-side*1.88,1.45,f*.09],[.03,.42,.05],m.brass)}
  </group>)}
 </>;
}

/** Granite plaque on 4 brass standoffs, 3 cm proud of the stone facade (no z-fighting with the bake). */
function FacadePlaque({face}:{face:MeshBasicMaterial}){
 const edge=useMemo(()=>new MeshStandardMaterial({color:'#1a1d1f',roughness:.35}),[]),brass=useMemo(()=>new MeshStandardMaterial({color:'#c9a560',roughness:.3,metalness:.8}),[]);
 useEffect(()=>()=>{edge.dispose();brass.dispose();},[edge,brass]);
 const z0=FACADE_Z+.03,{x,y,w,h}=PLAQUE;
 return <group position={[x,y,0]}>
  {[[-1,-1],[1,-1],[-1,1],[1,1]].map(([sx,sy])=><mesh key={sx+','+sy} geometry={standoff} material={brass} rotation={[Math.PI/2,0,0]} position={[sx*(w/2-.09),sy*(h/2-.09),FACADE_Z+.015]}/>)}
  <mesh geometry={cube} material={edge} scale={[w,h,.03]} position={[0,0,z0+.015]}/>
  <mesh material={face} position={[0,0,z0+.0305]}><planeGeometry args={[w,h]}/></mesh>
 </group>;
}

/** Two-leaf sliding entrance door + the school plaque. Closed while the visitor waits in the foyer;
 * opens on a tap. Doors and plaque are not part of the baked shell, so they stay sharp and can move. */
export default function EntranceDoors({door}:{door?:MutableRefObject<DoorState>}){
 const gl=useThree(s=>s.gl),invalidate=useThree(s=>s.invalidate);
 // While the visitor waits at the closed door nothing moves, so the demand frameloop would stop drawing:
 // keep a few refresh frames so late textures (baked room, plaque font) always appear.
 useEffect(()=>{const t0=performance.now();const id=setInterval(()=>{const d=door?.current;if(d&&d.target===0&&d.value===0&&performance.now()-t0<15000)invalidate();},400);return()=>clearInterval(id);},[door,invalidate]);
 useEffect(()=>{gl.localClippingEnabled=true;},[gl]);
 const parts=useMemo(()=>{
  const grain=grainTexture(),fabric=fabricTexture(),plaque=plaqueTexture();
  const face=new MeshBasicMaterial({map:plaque,color:'#f1ebdf',toneMapped:false});
  return {grain,fabric,plaque,face,left:{g:leafGroup(-1),m:leafMaterials(-1,grain,fabric)},right:{g:leafGroup(1),m:leafMaterials(1,grain,fabric)}};
 },[]);
 useEffect(()=>()=>{for(const t of [parts.grain,parts.fabric,parts.plaque])t.dispose();parts.face.dispose();for(const s of [parts.left,parts.right])for(const mat of Object.values(s.m))mat.dispose();},[parts]);
 // Dev-only evidence for the 15/11 "blank screen at the door" report: if the plaque is ever out of view
 // while the visitor waits, log the camera state and ask the controller to re-frame the door.
 const reported=useRef(false),waitStart=useRef(0),frustum=useMemo(()=>new Frustum(),[]),probe=useMemo(()=>new Vector3(PLAQUE.x,PLAQUE.y,FACADE_Z),[]),mat=useMemo(()=>new Matrix4(),[]);
 useFrame(({camera,invalidate},dt)=>{
  const d=door?.current;const value=d?d.value:1;
  if(d&&d.value!==d.target){const was=d.value;d.value=doorStep(d.value,d.target,dt);invalidate();
   // fully open: the hall reflection probe re-captures (it was taken with the doors closed)
   if(was<1&&d.value>=1)window.dispatchEvent(new Event('museum-doors-open'));}
  parts.left.g.position.x=doorOffset(-1,value);parts.right.g.position.x=doorOffset(1,value);
  // Fully open leaves are entirely inside the wall: skip drawing them.
  parts.left.g.visible=parts.right.g.visible=value<.999;
  const waiting=Boolean(d&&d.target===0&&d.value===0&&camera.position.z>11.5);
  if(!waiting)waitStart.current=0;else if(!waitStart.current)waitStart.current=performance.now();
  // Check only after 1.5 s of waiting, with fresh matrices (the first frames still carry the previous pose: false alarms).
  // (the establishing shot looks away from the door on purpose: no check while it runs)
  if(import.meta.env.DEV&&waiting&&!(window as any).__museumIntro&&performance.now()-waitStart.current>1500){
   camera.updateMatrixWorld();camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
   frustum.setFromProjectionMatrix(mat.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
   if(!frustum.containsPoint(probe)){
    if(!reported.current){reported.current=true;void fetch('/__local-preview/scene-error',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({time:new Date().toISOString(),message:'door-out-of-view',stack:JSON.stringify({pos:camera.position.toArray(),quat:camera.quaternion.toArray(),fov:(camera as any).fov,aspect:(camera as any).aspect})})}).catch(()=>{});}
    window.dispatchEvent(new Event('museum-door-reframe'));
   }
  }
 });
 return <>
  <FacadePlaque face={parts.face}/>
  {([[-1,parts.left],[1,parts.right]] as const).map(([side,s])=><primitive key={side} object={s.g}><Leaf side={side} m={s.m}/></primitive>)}
 </>;
}
