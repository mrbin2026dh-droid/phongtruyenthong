import {useEffect,useMemo} from 'react';
import type {MutableRefObject} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import {BoxGeometry,CanvasTexture,Group,MeshBasicMaterial,MeshStandardMaterial,Plane,PlaneGeometry,SRGBColorSpace,Vector3} from 'three';
import {DOOR_JAMB,doorOffset,doorStep} from './doorMotion.mjs';

/** Door state shared with HallTour: target 0 = closed, 1 = open; value animates towards target. */
export type DoorState={target:number;value:number};

/** School plaque on the corridor face of the closed doors (split across the two leaves). */
export const DOOR_PLAQUE_LINES=['UBND XÃ ĐĂK HÀ','TRƯỜNG THCS CHU VĂN AN','PHÒNG TRUYỀN THỐNG'] as const;
const PLAQUE_W=1.8,PLAQUE_H=.66,PLAQUE_Y=2.6;

const cube=new BoxGeometry(1,1,1),plaqueHalf=new PlaneGeometry(PLAQUE_W/2,PLAQUE_H);

function plaqueTexture(){
 const W=2048,H=Math.round(W*PLAQUE_H/PLAQUE_W),c=document.createElement('canvas');c.width=W;c.height=H;
 const g=c.getContext('2d')!;
 const bg=g.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#143740');bg.addColorStop(1,'#0d2a31');g.fillStyle=bg;g.fillRect(0,0,W,H);
 g.strokeStyle='#c9a560';g.lineWidth=12;g.strokeRect(6,6,W-12,H-12);g.lineWidth=3;g.strokeRect(30,30,W-60,H-60);
 const gold=g.createLinearGradient(0,0,0,H);gold.addColorStop(0,'#fff0c4');gold.addColorStop(.55,'#e4c37f');gold.addColorStop(1,'#b8924f');
 g.fillStyle=gold;g.textAlign='center';g.textBaseline='middle';
 const line=(text:string,font:(s:number)=>string,size:number,y:number,spacing=0)=>{
  let s=size;g.font=font(s);try{(g as any).letterSpacing=spacing+'px';}catch{/* older canvas */}
  while(g.measureText(text).width>W-180&&s>20){s--;g.font=font(s);}
  g.fillText(text,W/2,y);try{(g as any).letterSpacing='0px';}catch{/* older canvas */}
 };
 const [l1,l2,l3]=DOOR_PLAQUE_LINES;
 line(l1,s=>`600 ${s}px "Noto Sans"`,52,H*.19,6);
 line(l2,s=>`700 ${s}px "Noto Serif"`,76,H*.37,2);
 const y=H*.515;g.fillRect(W*.3,y-1.5,W*.17,3);g.fillRect(W*.53,y-1.5,W*.17,3);g.save();g.translate(W/2,y);g.rotate(Math.PI/4);g.fillRect(-8,-8,16,16);g.restore();
 line(l3,s=>`700 ${s}px "Noto Serif"`,158,H*.75,4);
 const t=new CanvasTexture(c);t.colorSpace=SRGBColorSpace;t.anisotropy=8;return t;
}

/** One material set per leaf: each clips away whatever has slid past its jamb (into the wall). */
function leafMaterials(side:number,plaque:CanvasTexture){
 // Right leaf keeps x ≤ jamb, left leaf keeps x ≥ −jamb.
 const clippingPlanes=[new Plane(new Vector3(-side,0,0),DOOR_JAMB)];
 const map=plaque.clone();map.repeat.set(.5,1);map.offset.set(side<0?0:.5,0);map.needsUpdate=true;
 return {
  wood:new MeshStandardMaterial({color:'#4f362a',roughness:.55,metalness:0,clippingPlanes}),
  teal:new MeshStandardMaterial({color:'#193c44',roughness:.75,clippingPlanes}),
  brass:new MeshStandardMaterial({color:'#c9a560',roughness:.32,metalness:.75,clippingPlanes}),
  plaque:new MeshBasicMaterial({map,color:'#e2dccd',toneMapped:false,clippingPlanes}),
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
  {/* Corridor face (+z): this leaf's half of the school plaque, centred on the meeting line. */}
  <mesh geometry={plaqueHalf} material={m.plaque} position={[-side*(2.02-PLAQUE_W/4),PLAQUE_Y,.067]}/>
 </>;
}

/** Two-leaf sliding entrance door. Closed while the visitor waits in the corridor; opens on a tap.
 * Doors are not part of the baked shell, so they can move. */
export default function EntranceDoors({door}:{door?:MutableRefObject<DoorState>}){
 const gl=useThree(s=>s.gl);
 useEffect(()=>{gl.localClippingEnabled=true;},[gl]);
 const parts=useMemo(()=>{const plaque=plaqueTexture();return {plaque,left:{g:leafGroup(-1),m:leafMaterials(-1,plaque)},right:{g:leafGroup(1),m:leafMaterials(1,plaque)}};},[]);
 useEffect(()=>()=>{parts.plaque.dispose();for(const s of [parts.left,parts.right])for(const mat of Object.values(s.m)){(mat as any).map?.dispose?.();mat.dispose();}},[parts]);
 useFrame(({invalidate},dt)=>{
  const d=door?.current;const value=d?d.value:1;
  if(d&&d.value!==d.target){d.value=doorStep(d.value,d.target,dt);invalidate();}
  parts.left.g.position.x=doorOffset(-1,value);parts.right.g.position.x=doorOffset(1,value);
  // Fully open leaves are entirely inside the wall: skip drawing them.
  parts.left.g.visible=parts.right.g.visible=value<.999;
 });
 return <>{([[-1,parts.left],[1,parts.right]] as const).map(([side,s])=><primitive key={side} object={s.g}><Leaf side={side} m={s.m}/></primitive>)}</>;
}
