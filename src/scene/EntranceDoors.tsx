import {useEffect,useMemo,useRef} from 'react';
import type {MutableRefObject} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import {BoxGeometry,CanvasTexture,Frustum,Group,Matrix4,MeshStandardMaterial,Plane,PlaneGeometry,RepeatWrapping,SRGBColorSpace,Vector3} from 'three';
import {DOOR_JAMB,doorOffset,doorStep} from './doorMotion.mjs';
import {FACADE_Z,DOOR_SIGN,ARRIVAL_START,DOOR_CENTER} from './hallArrival.mjs';
import {Html} from '@react-three/drei';
import GildedSign,{type SignSpec} from './GildedSign';

/** Door state shared with HallTour: target 0 = closed, 1 = open; value animates towards target. */
export type DoorState={target:number;value:number};

/** 16/11 (user, H3/H4): the school's name sits on a sign centred ABOVE the door (the plaque right of the door is gone),
 * in the same style as the “Tiên học lễ, hậu học văn” motto: walnut frame, deep-teal face, gilded serif capitals.
 * Two lines: one 60-letter line would be ~6 px tall on a phone, the big title line stays readable from the foyer. */
export const DOOR_SIGN_LINES=['PHÒNG TRUYỀN THỐNG','TRƯỜNG THCS CHU VĂN AN – ĐĂK HÀ – QUẢNG NGÃI'] as const;
const cube=new BoxGeometry(1,1,1);
const rand=(()=>{let s=20261115;return ()=>{s=(s*16807)%2147483647;return s/2147483647;};})();

/** Spec for the shared gilded sign: big title line, a gold rule, the school line below. */
const DOOR_SIGN_SPEC:SignSpec={frame:DOOR_SIGN.frame,face:DOOR_SIGN.face,rule:.6,lines:[
 {text:DOOR_SIGN_LINES[0],size:.40,cy:.36,spacing:10},{text:DOOR_SIGN_LINES[1],size:.205,cy:.79,spacing:6}]};

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

/** Two-leaf sliding entrance door + the school sign above it. Closed while the visitor waits in the foyer;
 * opens on a tap. Doors and sign are not part of the baked shell, so they stay sharp and can move. */
export default function EntranceDoors({door,waiting=false,onOpen}:{door?:MutableRefObject<DoorState>;waiting?:boolean;onOpen?:()=>void}){
 const gl=useThree(s=>s.gl),invalidate=useThree(s=>s.invalidate);
 useEffect(()=>{if(!waiting)document.body.style.cursor='';},[waiting]);
 // While the visitor waits at the closed door nothing moves, so the demand frameloop would stop drawing:
 // keep a few refresh frames so late textures (baked room, sign font) always appear.
 useEffect(()=>{const t0=performance.now();const id=setInterval(()=>{const d=door?.current;if(d&&d.target===0&&d.value===0&&performance.now()-t0<15000)invalidate();},400);return()=>clearInterval(id);},[door,invalidate]);
 useEffect(()=>{gl.localClippingEnabled=true;},[gl]);
 const parts=useMemo(()=>{
  const grain=grainTexture(),fabric=fabricTexture();
  return {grain,fabric,left:{g:leafGroup(-1),m:leafMaterials(-1,grain,fabric)},right:{g:leafGroup(1),m:leafMaterials(1,grain,fabric)}};
 },[]);
 useEffect(()=>()=>{for(const t of [parts.grain,parts.fabric])t.dispose();for(const s of [parts.left,parts.right])for(const mat of Object.values(s.m))mat.dispose();},[parts]);
 // Dev-only evidence for the 15/11 "blank screen at the door" report: if the door is ever out of view
 // while the visitor waits, log the camera state and ask the controller to re-frame the door.
 const reported=useRef(false),waitStart=useRef(0),frustum=useMemo(()=>new Frustum(),[]),probe=useMemo(()=>new Vector3(...DOOR_CENTER),[]),mat=useMemo(()=>new Matrix4(),[]);
 useFrame(({camera,invalidate},dt)=>{
  const d=door?.current;const value=d?d.value:1;
  if(d&&d.value!==d.target){const was=d.value;d.value=doorStep(d.value,d.target,dt);invalidate();
   // fully open: the hall reflection probe re-captures (it was taken with the doors closed)
   if(was<1&&d.value>=1)window.dispatchEvent(new Event('museum-doors-open'));}
  parts.left.g.position.x=doorOffset(-1,value);parts.right.g.position.x=doorOffset(1,value);
  // Fully open leaves are entirely inside the wall: skip drawing them.
  parts.left.g.visible=parts.right.g.visible=value<.999;
  // 16/11: the visitor waits at the H2 pose: watch that the door (the only thing that opens it) stays in view
  const waiting=Boolean(d&&d.target===0&&d.value===0&&Math.hypot(camera.position.x-ARRIVAL_START[0],camera.position.z-ARRIVAL_START[2])<.3);
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
  <GildedSign spec={DOOR_SIGN_SPEC} position={[0,DOOR_SIGN.y,FACADE_Z]}/>
  {/* 16/11 (user): only the door opens the door — tap a leaf or the label attached to it (not the whole screen). */}
  <group onClick={e=>{if(!waiting||!onOpen)return;e.stopPropagation();onOpen();}}
   onPointerOver={()=>{if(waiting)document.body.style.cursor='pointer';}} onPointerOut={()=>{document.body.style.cursor='';}}>
   {([[-1,parts.left],[1,parts.right]] as const).map(([side,s])=><primitive key={side} object={s.g}><Leaf side={side} m={s.m}/></primitive>)}
  </group>
  {waiting&&onOpen&&<Html position={DOOR_CENTER as [number,number,number]} center zIndexRange={[12,0]}>
   <button type="button" className="door-open-label" onClick={onOpen} aria-label="Chạm vào cửa để mở cửa vào phòng truyền thống">Chạm để mở cửa</button>
  </Html>}
 </>;
}
