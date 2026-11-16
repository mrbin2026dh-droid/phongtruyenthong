import {useEffect,useMemo,useRef} from 'react';
import type {MutableRefObject} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import {BoxGeometry,CanvasTexture,Frustum,Group,Matrix4,MeshBasicMaterial,MeshStandardMaterial,Plane,PlaneGeometry,RepeatWrapping,SRGBColorSpace,Vector3} from 'three';
import {DOOR_JAMB,doorOffset,doorStep} from './doorMotion.mjs';
import {FACADE_Z,DOOR_SIGN,ARRIVAL_START,DOOR_CENTER} from './hallArrival.mjs';
import {Html} from '@react-three/drei';

/** Door state shared with HallTour: target 0 = closed, 1 = open; value animates towards target. */
export type DoorState={target:number;value:number};

/** 16/11 (user, H3/H4): the school's name sits on a sign centred ABOVE the door (the plaque right of the door is gone),
 * in the same style as the “Tiên học lễ, hậu học văn” motto: walnut frame, deep-teal face, gilded serif capitals.
 * Two lines: one 60-letter line would be ~6 px tall on a phone, the big title line stays readable from the foyer. */
export const DOOR_SIGN_LINES=['PHÒNG TRUYỀN THỐNG','TRƯỜNG THCS CHU VĂN AN – ĐĂK HÀ – QUẢNG NGÃI'] as const;
const cube=new BoxGeometry(1,1,1);
const rand=(()=>{let s=20261115;return ()=>{s=(s*16807)%2147483647;return s/2147483647;};})();

/** Sign face: teal ground, thin gold double rule, two gilded lines. ~880 px per metre. */
function signTexture(){
 const {w,h}=DOOR_SIGN.face,W=4096,H=Math.round(W*h/w),c=document.createElement('canvas');c.width=W;c.height=H;
 const g=c.getContext('2d')!;
 g.fillStyle='#17383e';g.fillRect(0,0,W,H);
 for(let i=0;i<9000;i++){g.fillStyle=`rgba(255,255,255,${.01+rand()*.025})`;g.fillRect(rand()*W,rand()*H,1+rand()*2,1);}
 const gold=g.createLinearGradient(0,0,0,H);gold.addColorStop(0,'#fff1c8');gold.addColorStop(.5,'#e5c786');gold.addColorStop(1,'#ba9659');
 g.strokeStyle='#bda36b';g.lineWidth=7;g.strokeRect(22,22,W-44,H-44);g.lineWidth=2.5;g.strokeRect(40,40,W-80,H-80);
 g.textAlign='center';g.textBaseline='alphabetic';
 const line=(text:string,size:number,cy:number,spacing:number)=>{
  let s=size;const font=()=>`700 ${s}px "Noto Serif"`;g.font=font();try{(g as any).letterSpacing=spacing+'px';}catch{/* older canvas */}
  while(g.measureText(text).width>W-260&&s>20){s--;g.font=font();}
  const m=g.measureText(text),y=cy+(m.actualBoundingBoxAscent-m.actualBoundingBoxDescent)/2;
  g.fillStyle='rgba(4,24,28,.65)';g.fillText(text,W/2+2,y+3);g.fillStyle=gold;g.fillText(text,W/2,y);
  try{(g as any).letterSpacing='0px';}catch{/* older canvas */}
 };
 const [l1,l2]=DOOR_SIGN_LINES;
 line(l1,Math.round(H*.40),H*.36,10);
 const y=H*.6;g.fillStyle='#bda36b';g.fillRect(W*.30,y-1.5,W*.17,3);g.fillRect(W*.53,y-1.5,W*.17,3);g.save();g.translate(W/2,y);g.rotate(Math.PI/4);g.fillRect(-8,-8,16,16);g.restore();
 line(l2,Math.round(H*.205),H*.79,6);
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

/** Sign above the door: walnut frame 4 cm off the stone (above the 3.465 m portal soffit, below the 3.95 m ceiling),
 * gold lip, teal face — every layer ≥ 1 cm apart (no z-fighting with the baked facade). */
function DoorSign({face}:{face:MeshBasicMaterial}){
 const wood=useMemo(()=>new MeshStandardMaterial({color:'#4f362a',roughness:.5}),[]),gold=useMemo(()=>new MeshStandardMaterial({color:'#bda36b',roughness:.35,metalness:.5}),[]);
 useEffect(()=>()=>{wood.dispose();gold.dispose();},[wood,gold]);
 const {y,frame,face:f}=DOOR_SIGN,z0=FACADE_Z+.005;
 return <group position={[0,y,0]}>
  <mesh geometry={cube} material={wood} scale={[frame.w,frame.h,frame.d]} position={[0,0,z0+frame.d/2]}/>
  <mesh geometry={cube} material={gold} scale={[f.w+.03,f.h+.03,.01]} position={[0,0,z0+frame.d+.005]}/>
  <mesh material={face} position={[0,0,z0+frame.d+.02]}><planeGeometry args={[f.w,f.h]}/></mesh>
 </group>;
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
  const grain=grainTexture(),fabric=fabricTexture(),sign=signTexture();
  const face=new MeshBasicMaterial({map:sign,color:'#f4eee2',toneMapped:false});
  return {grain,fabric,sign,face,left:{g:leafGroup(-1),m:leafMaterials(-1,grain,fabric)},right:{g:leafGroup(1),m:leafMaterials(1,grain,fabric)}};
 },[]);
 useEffect(()=>()=>{for(const t of [parts.grain,parts.fabric,parts.sign])t.dispose();parts.face.dispose();for(const s of [parts.left,parts.right])for(const mat of Object.values(s.m))mat.dispose();},[parts]);
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
  <DoorSign face={parts.face}/>
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
