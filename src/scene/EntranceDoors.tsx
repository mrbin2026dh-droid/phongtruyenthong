import {useEffect,useMemo,useRef,useState} from 'react';
import type {MutableRefObject} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import {AdditiveBlending,BoxGeometry,CanvasTexture,Frustum,Group,Matrix4,MeshBasicMaterial,MeshStandardMaterial,Plane,PlaneGeometry,RepeatWrapping,SRGBColorSpace,Vector3} from 'three';
import {DOOR_JAMB,doorOffset,doorStep} from './doorMotion.mjs';
import {FACADE_Z,DOOR_SIGN,ARRIVAL_START,DOOR_CENTER} from './hallArrival.mjs';
import {Html} from '@react-three/drei';
import {DOOR_GATE} from './hallMotion.mjs';
import GildedSign,{type SignSpec} from './GildedSign';
import {PHONE} from './device';

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

/** 18/11 (người dùng: “icon dán thẳng lên cửa như cửa ngân hàng, dạng đẩy/kéo” thay nút bàn tay nổi): a brushed-brass
 * push plate on each leaf — open-palm icon, an arrow the way the leaf slides, “ĐẨY” engraved. Drawn once per leaf. */
const PALM=['M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2','M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2','M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8',
 'M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15'];
export const PUSH_PLATE={w:.26,h:.46,y:1.32,inset:1.50,z:.066};   // readable from the waiting spot (~3 m away)
function pushPlateTexture(side:number){
 const W=PHONE?170:340,H=Math.round(W*PUSH_PLATE.h/PUSH_PLATE.w),c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d')!,u=W/340;
 const r=26*u;g.beginPath();g.roundRect(2*u,2*u,W-4*u,H-4*u,r);g.clip();
 const metal=g.createLinearGradient(0,0,W,H);metal.addColorStop(0,'#f3dca2');metal.addColorStop(.45,'#cfae6a');metal.addColorStop(1,'#a8843f');g.fillStyle=metal;g.fillRect(0,0,W,H);
 for(let y=0;y<H;y+=2){g.fillStyle=`rgba(255,255,255,${.03+.04*((y*7919)%13)/13})`;g.fillRect(0,y,W,1);}   // brushed lines
 g.strokeStyle='rgba(70,48,18,.55)';g.lineWidth=4*u;g.beginPath();g.roundRect(12*u,12*u,W-24*u,H-24*u,r*.7);g.stroke();
 const ink='#1d3a3a';g.strokeStyle=ink;g.fillStyle=ink;g.lineCap='round';g.lineJoin='round';
 g.save();g.translate(W/2-84*u,70*u);g.scale(7*u,7*u);g.lineWidth=1.7;for(const d of PALM)g.stroke(new Path2D(d));g.restore();
 // arrow the way this leaf slides open (left leaf ←, right leaf →)
 const ay=H*.62,ax=W/2,len=90*u,dir=side;g.lineWidth=9*u;g.beginPath();g.moveTo(ax-dir*len/2,ay);g.lineTo(ax+dir*len/2,ay);g.stroke();
 g.beginPath();g.moveTo(ax+dir*len/2,ay);g.lineTo(ax+dir*(len/2-26*u),ay-22*u);g.moveTo(ax+dir*len/2,ay);g.lineTo(ax+dir*(len/2-26*u),ay+22*u);g.stroke();
 g.font=`700 ${Math.round(64*u)}px "Noto Sans",sans-serif`;g.textAlign='center';g.textBaseline='middle';g.fillText('ĐẨY',W/2,H*.83);
 const t=new CanvasTexture(c);t.colorSpace=SRGBColorSpace;t.anisotropy=8;return t;
}

/** 18/11 (người dùng): công tắc cửa trên mảng tường đá bên phải cửa, đối xứng với bảng THAM QUAN (cùng tâm 1,62 m).
 * Cửa đóng → “MỞ CỬA” (mũi tên ra hai bên); cửa mở → “ĐÓNG CỬA” (mũi tên khép vào). Vòng đèn vàng sáng khi bấm được. */
// 18/11 (lần 3, người dùng: “quá mỏng, không ai để ý” — chỉ 11–17 px ở khung chờ): bằng bảng THAM QUAN 0,62 × 0,30 m
// (đối xứng hai bên cửa) + vòng đèn nhấp nháy nhẹ khi cửa đang đóng (SWITCH_PULSE).
export const DOOR_SWITCH={x:3.375,y:1.62,w:.62,h:.30};
/** pulse of the glow while the door waits to be opened: period (s) and emissive range */
export const SWITCH_PULSE={period:1.8,low:.4,high:1.15};
function switchFaceTexture(open:boolean){
 const W=PHONE?480:960,H=Math.round(W*DOOR_SWITCH.h/DOOR_SWITCH.w),c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d')!,u=W/480;
 const bg=g.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#14191c');bg.addColorStop(1,'#07090a');g.fillStyle=bg;g.fillRect(0,0,W,H);
 const sh=g.createLinearGradient(0,0,W*.6,H);sh.addColorStop(0,'rgba(255,255,255,.10)');sh.addColorStop(.5,'rgba(255,255,255,0)');g.fillStyle=sh;g.fillRect(0,0,W,H);
 // icon in a glowing ring on the left
 const cx=H*.5+14*u,cy=H/2,r=H*.36;g.lineWidth=5*u;g.strokeStyle='#e9c47c';g.shadowColor='rgba(255,190,90,.9)';g.shadowBlur=16*u;
 g.beginPath();g.arc(cx,cy,r,0,Math.PI*2);g.stroke();g.shadowBlur=0;
 g.strokeStyle='#f3dcaa';g.lineWidth=5*u;g.lineCap='round';g.lineJoin='round';const k=r/118;
 for(const s of [-1,1])g.strokeRect(s<0?cx-30*k:cx+4*k,cy-60*k,26*k,120*k);
 for(const s of [-1,1]){const a=cx+s*92*k,b2=cx+s*44*k,[from,to]=open?[b2,a]:[a,b2];
  g.beginPath();g.moveTo(from,cy);g.lineTo(to,cy);g.stroke();const d=Math.sign(to-from);
  g.beginPath();g.moveTo(to-d*18*k,cy-15*k);g.lineTo(to,cy);g.lineTo(to-d*18*k,cy+15*k);g.stroke();}
 // label on the right
 g.font=`700 ${Math.round(46*u)}px "Noto Sans",sans-serif`;g.textAlign='center';g.textBaseline='middle';g.fillStyle='#e6c98a';
 (g as any).letterSpacing=Math.round(5*u)+'px';g.fillText(open?'MỞ CỬA':'ĐÓNG CỬA',(cx+r+W)/2+2*u,cy+2*u);(g as any).letterSpacing='0px';
 const t=new CanvasTexture(c);t.colorSpace=SRGBColorSpace;t.anisotropy=8;return t;
}
function DoorSwitch({mode,onPress}:{mode:'open'|'close'|'off';onPress:(m:'open'|'close')=>void}){
 const invalidate=useThree(s=>s.invalidate);
 const faces=useMemo(()=>({open:switchFaceTexture(true),close:switchFaceTexture(false)}),[]);
 const mats=useMemo(()=>({plate:new MeshStandardMaterial({color:'#c9a560',roughness:.32,metalness:.8}),
  face:new MeshStandardMaterial({map:faces.close,roughness:.18,metalness:.1,emissive:'#ffffff',emissiveMap:faces.close,emissiveIntensity:.25})}),[faces]);
 useEffect(()=>()=>{faces.open.dispose();faces.close.dispose();mats.plate.dispose();mats.face.dispose();},[faces,mats]);
 const pad=useRef<Group>(null);
 const [shown,setShown]=useState<'open'|'close'>('close');
 useEffect(()=>{if(mode!=='off')setShown(mode);},[mode]);
 useEffect(()=>{const t=shown==='open'?faces.open:faces.close;mats.face.map=t;mats.face.emissiveMap=t;mats.face.emissiveIntensity=mode==='off'?.12:.55;mats.face.needsUpdate=true;invalidate();},[shown,mode,faces,mats,invalidate]);
 // B: while the door is closed and can be opened, the switch breathes (≈30 fps, only then — the room stays on demand frames)
 const halo=useMemo(()=>new MeshBasicMaterial({color:'#ffc46a',transparent:true,opacity:0,blending:AdditiveBlending,depthWrite:false,toneMapped:false}),[]);
 useEffect(()=>()=>halo.dispose(),[halo]);
 useEffect(()=>{if(mode!=='open'){halo.opacity=0;invalidate();return;}let raf=0,last=0;const t0=performance.now();
  const tick=(now:number)=>{raf=requestAnimationFrame(tick);if(now-last<33)return;last=now;
   const k=.5-.5*Math.cos((now-t0)/1000*2*Math.PI/SWITCH_PULSE.period);
   mats.face.emissiveIntensity=SWITCH_PULSE.low+(SWITCH_PULSE.high-SWITCH_PULSE.low)*k;halo.opacity=.06+.16*k;invalidate();};
  raf=requestAnimationFrame(tick);return()=>{cancelAnimationFrame(raf);halo.opacity=0;};},[mode,mats,halo,invalidate]);
 const S=DOOR_SWITCH;
 const press=(e:any)=>{e.stopPropagation();if(mode==='off')return;if(pad.current){pad.current.position.z=-.004;invalidate();setTimeout(()=>{if(pad.current){pad.current.position.z=0;invalidate();}},180);}onPress(mode);};
 return <group position={[S.x,S.y,FACADE_Z+.006]}>
  <mesh position={[0,0,.001]} material={halo}><planeGeometry args={[S.w*1.6,S.h*2.2]}/></mesh>
  <mesh position={[0,0,.004]} material={mats.plate}><boxGeometry args={[S.w+.03,S.h+.03,.008]}/></mesh>
  <group ref={pad}><mesh position={[0,0,.0095]} material={mats.face} onClick={press}
   onPointerOver={()=>{if(mode!=='off')document.body.style.cursor='pointer';}} onPointerOut={()=>{document.body.style.cursor='';}}><boxGeometry args={[S.w,S.h,.004]}/></mesh></group>
 </group>;
}

/** One material set per leaf: each clips away whatever has slid past its jamb (into the wall). */
function leafMaterials(side:number,grain:CanvasTexture,fabric:CanvasTexture){
 // Right leaf keeps x ≤ jamb, left leaf keeps x ≥ −jamb.
 const clippingPlanes=[new Plane(new Vector3(-side,0,0),DOOR_JAMB)];
 return {
  wood:new MeshStandardMaterial({map:grain,color:'#ffffff',roughness:.5,metalness:0,clippingPlanes}),
  teal:new MeshStandardMaterial({map:fabric,color:'#ffffff',roughness:.85,clippingPlanes}),
  brass:new MeshStandardMaterial({color:'#c9a560',roughness:.3,metalness:.8,clippingPlanes}),
  plate:new MeshStandardMaterial({map:pushPlateTexture(side),roughness:.35,metalness:.35,emissive:'#f0d18d',emissiveIntensity:0,clippingPlanes}),
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
  {/* 18/11: push plate on the foyer face (+z), between the pull and the panel centre */}
  <mesh position={[-side*PUSH_PLATE.inset,PUSH_PLATE.y,PUSH_PLATE.z]} material={m.plate}><planeGeometry args={[PUSH_PLATE.w,PUSH_PLATE.h]}/></mesh>
 </>;
}

/** Two-leaf sliding entrance door + the school sign above it. Closed while the visitor waits in the foyer;
 * opens on a tap. Doors and sign are not part of the baked shell, so they stay sharp and can move. */
export default function EntranceDoors({door,waiting=false,onOpen,canClose=false,onClose}:{door?:MutableRefObject<DoorState>;waiting?:boolean;onOpen?:()=>void;canClose?:boolean;onClose?:()=>void}){
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
 useEffect(()=>()=>{for(const t of [parts.grain,parts.fabric])t.dispose();for(const s of [parts.left,parts.right]){s.m.plate.map?.dispose();for(const mat of Object.values(s.m))mat.dispose();}},[parts]);
 // 18/11: while the visitor waits, the push plates breathe softly (an invitation to tap) — ~15 redraws/s, door only
 useEffect(()=>{if(!waiting)return;const id=setInterval(()=>invalidate(),66);return()=>clearInterval(id);},[waiting,invalidate]);
 // Dev-only evidence for the 15/11 "blank screen at the door" report: if the door is ever out of view
 // while the visitor waits, log the camera state and ask the controller to re-frame the door.
 const reported=useRef(false),waitStart=useRef(0),frustum=useMemo(()=>new Frustum(),[]),probe=useMemo(()=>new Vector3(...DOOR_CENTER),[]),mat=useMemo(()=>new Matrix4(),[]);
 useFrame(({camera,invalidate},dt)=>{
  const d=door?.current;const value=d?d.value:1;
  DOOR_GATE.closed=Boolean(d&&d.target===0);
  if(d&&d.value!==d.target){const was=d.value;d.value=doorStep(d.value,d.target,dt);invalidate();
   // fully open: the hall reflection probe re-captures (it was taken with the doors closed)
   if(was<1&&d.value>=1)window.dispatchEvent(new Event('museum-doors-open'));}
  parts.left.g.position.x=doorOffset(-1,value);parts.right.g.position.x=doorOffset(1,value);
  // Fully open leaves are entirely inside the wall: skip drawing them.
  parts.left.g.visible=parts.right.g.visible=value<.999;
  // 16/11: the visitor waits at the H2 pose: watch that the door (the only thing that opens it) stays in view
  const waiting=Boolean(d&&d.target===0&&d.value===0&&Math.hypot(camera.position.x-ARRIVAL_START[0],camera.position.z-ARRIVAL_START[2])<.3);
  // 18/11: the push plates breathe softly while the closed door waits for a tap
  {const glow=d&&d.target===0&&d.value===0?.18+.18*Math.sin(performance.now()/420):0;parts.left.m.plate.emissiveIntensity=parts.right.m.plate.emissiveIntensity=glow;}
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
  <DoorSwitch mode={waiting&&onOpen?'open':canClose&&onClose?'close':'off'} onPress={m=>{if(m==='open')onOpen?.();else onClose?.();}}/>
  {/* 16/11 (user): only the door opens the door — tap a leaf or the label attached to it (not the whole screen). */}
  <group onClick={e=>{if(!waiting||!onOpen||e.delta>8)return;e.stopPropagation();onOpen();}}
   onPointerOver={()=>{if(waiting)document.body.style.cursor='pointer';}} onPointerOut={()=>{document.body.style.cursor='';}}>
   {([[-1,parts.left],[1,parts.right]] as const).map(([side,s])=><primitive key={side} object={s.g}><Leaf side={side} m={s.m}/></primitive>)}
  </group>
  {waiting&&onOpen&&<Html position={DOOR_CENTER as [number,number,number]} center zIndexRange={[12,0]}>
   {/* 17/11 (người dùng): biểu tượng bàn tay + vòng sáng lan tỏa thay cho chữ (kiểu điểm chạm của các tour 3D) */}
   <button type="button" className="door-open-label door-open-sr" onClick={onOpen} aria-label="Chạm vào cửa để mở cửa vào phòng truyền thống" title="Chạm để mở cửa">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 14a8 8 0 0 1-8 8"/><path d="M18 11v-1a2 2 0 0 0-2-2a2 2 0 0 0-2 2"/><path d="M14 10V9a2 2 0 0 0-2-2a2 2 0 0 0-2 2v1"/><path d="M10 9.5V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v10"/><path d="M18 11a2 2 0 1 1 4 0v3a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/></svg>
   </button>
  </Html>}
 </>;
}
