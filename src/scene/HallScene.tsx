import {Suspense,useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {Canvas,useFrame,useThree} from '@react-three/fiber';
import {AdditiveBlending,BoxGeometry,InstancedMesh,Matrix4,MeshStandardMaterial,SRGBColorSpace,CanvasTexture,ACESFilmicToneMapping,Object3D,Group,Vector3} from 'three';

import {Texture,GalleryEnvironment} from './BlenderMuseum';
import {workHistoryText,displayName} from '../data/catalog.mjs';
import HallController from './HallController';
import HallPhoto,{type PhotoTier} from './HallPhoto';
import ChuVanAnStatue from './ChuVanAnStatue';
import SceneStats,{statsEnabled} from './SceneStats';
import StaticInstancer,{boxMaterial} from './StaticInstancer';
import BakedHall,{bakedEnabled} from './BakedHall';
import {HALL,BENCHES,MONUMENT,STATUE_ROOM,CABINETS,CABINET_NICHE,cabinetWallPieces} from './hallLayout.mjs';
import type {MutableRefObject} from 'react';
import type {NavigationInput} from './VisitorController';
import type {VisitorPose,RouteState} from './HallController';
import {StopMarkers,RouteDots} from './Wayfinding';
import GalleryDisplays from './GalleryDisplays';
import PerfProbe from './PerfProbe';
import EntranceDoors from './EntranceDoors';
import VisitCounter from './VisitCounter';
import GildedSign,{type SignSpec} from './GildedSign';
import {deptPlates} from '../data/arrangeByDept.mjs';
import FoyerView from './FoyerView';
import RoomProbes from './RoomProbes';
import PostFX from './PostFX';
import EmptySlots from './EmptySlots';
import type {DoorState} from './EntranceDoors';
import {PHONE} from './device';
import type {QualityControl} from './PerfProbe';

type Props={gallery?:import('./GalleryDisplays').DisplayItem[];onGallery?:(index:number)=>void;hideMarkers?:boolean;layout:any;plan:any;command:any;atDoor?:boolean;intro?:boolean;onOpenDoor?:()=>void;paused:boolean;effects:boolean;input:MutableRefObject<NavigationInput>;onArrive:(id:string)=>void;onMotion:(v:boolean)=>void;onSelect:(id:string)=>void;onGo:(id:string)=>void;onReady:()=>void;onLost:()=>void;moving:boolean;controlsLocked?:boolean;pose?:MutableRefObject<VisitorPose>;route?:MutableRefObject<RouteState>;quality?:QualityControl;door?:MutableRefObject<DoorState>;emptySlots?:any[];onEmpty?:(slotId:string)=>void};

const cube=new BoxGeometry(1,1,1);
// Portrait frames (15/11): satin brass, less mirror-like, so every frame reads the same tone from any angle.
const brass=new MeshStandardMaterial({color:'#c4a062',metalness:.35,roughness:.48});
// 16/11 (user: teacher frames vanished into the oak slats — measured contrast ≈1.4:1): teacher and staff frames are dark
// walnut (≈4:1 against the oak) with a thin gold lip along the opening; Ban Giám hiệu keeps brass on its dark panel.
export const FRAME_COLORS={walnut:'#2a1f18',lip:'#d9b468'};
const walnut=new MeshStandardMaterial({color:FRAME_COLORS.walnut,metalness:.08,roughness:.55});
const goldLip=new MeshStandardMaterial({color:FRAME_COLORS.lip,metalness:.55,roughness:.32});
export const FRAME_LIP=.006,FRAME_LIP_INSET=.001,FRAME_LIP_DEPTH=.003;
export const isLeaderSlot=(s:{group:string})=>s.group==='principal'||s.group==='deputy';

// 16/11 — Ban Giám hiệu redesigned from references (05-HUONG-DAN-AI/THIET-KE-KHU-BGH.md): ONE gilt frame per portrait
// (NPG: an over-broad frame upstages the portrait), 7 cm moulding for a 1 m picture (2–4″ guidance for large art), built
// as three stepped bands so it catches light like a real profile; a walnut sight edge ties it to the teacher frames
// (same two materials, roles swapped: walnut-on-oak there, gold-on-green here — walnut alone vanishes on the green, 1.3:1).
export const LEADER_GOLD='#c9a560',LEADER_GOLD_DEEP='#9a7a40';
const leaderGold=new MeshStandardMaterial({color:LEADER_GOLD,metalness:.6,roughness:.34});
/** bands measured outward from the photo opening: [from, to, front z]; .5 mm gaps so no two faces are ever coplanar */
export const LEADER_PROFILE:[number,number,number][]=[[0,.012,.036],[.0125,.058,.030],[.0585,.070,.044]];
export const LEADER_BACK=-.094,LEADER_MOULDING=.07,PICTURE_LIGHT={length:.66,above:.16},PLAQUE={width:.60,height:.13,gap:.07};
const leaderOpening=(s:any)=>[(s.width||1)/2-FRAME_BAR,(s.height||1.5)/2-FRAME_BAR];
function LeaderFrames({slots}:{slots:any[]}){
 const refs=[useRef<InstancedMesh>(null),useRef<InstancedMesh>(null),useRef<InstancedMesh>(null)];
 useLayoutEffect(()=>{const m=new Matrix4(),local=new Matrix4(),base=new Matrix4();
  LEADER_PROFILE.forEach(([from,to,z],band)=>{const mesh=refs[band].current;if(!mesh)return;let n=0;
   const depth=z-LEADER_BACK,zc=(z+LEADER_BACK)/2,w=to-from,mid=(from+to)/2;
   for(const s of slots){base.makeRotationY(s.yaw);base.setPosition(s.x,s.y,s.z);const [ew,eh]=leaderOpening(s);
    for(const [x,y,sx,sy] of [[-(ew+mid),0,w,2*(eh+to)],[ew+mid,0,w,2*(eh+to)],[0,eh+mid,2*(ew+from),w],[0,-(eh+mid),2*(ew+from),w]]){
     local.makeScale(sx,sy,depth);local.setPosition(x,y,zc);m.multiplyMatrices(base,local);mesh.setMatrixAt(n++,m);}
   }mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();});
 },[slots]);
 const count=Math.max(1,slots.length*4);
 // 17/11 (modern BGH, matching the teacher bays): a walnut frame like theirs, a thin gold line inside and outside it
 // so it still reads on the teal panel (walnut alone is 1.3:1 on the green) — no gilt moulding any more
 return <>{[leaderGold,walnut,leaderGold].map((mat,i)=><instancedMesh key={i} ref={refs[i]} args={[cube,mat,count]} count={slots.length*4} frustumCulled={false}/>)}</>;
}
/** soft drop shadow on the fabric so the frame floats a little off the wall */
const softShadow=(()=>{let t:CanvasTexture|null=null;return ()=>{if(t)return t;const c=document.createElement('canvas');c.width=128;c.height=192;const x=c.getContext('2d')!;
 x.filter='blur(10px)';x.fillStyle='rgba(0,0,0,1)';x.fillRect(22,26,84,140);t=new CanvasTexture(c);return t;};})();
/** warm pool of light cast by the picture light on the fabric (the baked fabric does not react to live lights).
 * 16/11 review of the user's screenshot: the first oval also rose ABOVE the lamp (a halo, and behind the title) —
 * a picture light only throws light downwards. Now the pool starts at the lamp and fades down and sideways; every edge
 * fades to zero. Measured peak ≈ 3.7:1 over the fabric (museum accent ≥ 3:1, < 10:1 dramatic) and the photos stay the
 * brightest thing with no clipped whites, so the strength is kept. */
const lightPool=(()=>{let t:CanvasTexture|null=null;return ()=>{if(t)return t;const c=document.createElement('canvas');c.width=256;c.height=256;const x=c.getContext('2d')!;
 // brightest at the top edge, gone by about the middle of the frame (a real picture light falls off fast)
 const g=x.createRadialGradient(128,6,0,128,6,170);g.addColorStop(0,'rgba(255,214,150,1)');g.addColorStop(.4,'rgba(255,200,130,.42)');g.addColorStop(1,'rgba(255,190,120,0)');
 x.fillStyle=g;x.fillRect(0,0,256,256);
 x.globalCompositeOperation='destination-in';   // soft start at the lamp, soft sides: no visible edge anywhere
 const v=x.createLinearGradient(0,0,0,256);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(.06,'rgba(0,0,0,1)');v.addColorStop(1,'rgba(0,0,0,1)');x.fillStyle=v;x.fillRect(0,0,256,256);
 const h=x.createLinearGradient(0,0,256,0);h.addColorStop(0,'rgba(0,0,0,0)');h.addColorStop(.3,'rgba(0,0,0,1)');h.addColorStop(.7,'rgba(0,0,0,1)');h.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=h;x.fillRect(0,0,256,256);
 t=new CanvasTexture(c);t.colorSpace=SRGBColorSpace;return t;};})();
/** pool plane: top edge at the lamp, reaching down over the upper part of the frame */
export const LIGHT_POOL={width:1.6,height:1.4,opacity:.26};   // 17/11: softer — the cove light, not a lamp per portrait
function LeaderDressing({slot}:{slot:any}){
 const [ew,eh]=leaderOpening(slot),top=eh+LEADER_MOULDING,L=PICTURE_LIGHT,ly=top+L.above,P=PLAQUE,py=-(top+P.gap+P.height/2);
 const plaque=useMemo(()=>{const c=document.createElement('canvas');c.width=1200;c.height=260;const x=c.getContext('2d')!;x.textAlign='center';x.fillStyle='#2a1f18';
  x.font='700 76px "Noto Serif"';x.fillText(displayName(slot.person),600,108,1120);x.font='500 44px "Noto Sans"';
  x.fillText([slot.person.role,workHistoryText(slot.person)].filter(Boolean).join(' · '),600,196,1120);
  const t=new CanvasTexture(c);t.colorSpace=SRGBColorSpace;t.anisotropy=8;return t;},[slot.person]);
 useEffect(()=>()=>plaque.dispose(),[plaque]);
 return <>
  <mesh position={[0,-.02,LEADER_BACK+.001]}><planeGeometry args={[2*(ew+LEADER_MOULDING)+.16,2*top+.2]}/><meshBasicMaterial map={softShadow()} transparent opacity={.45} depthWrite={false} color="#000"/></mesh>
  <mesh position={[0,ly-LIGHT_POOL.height/2,LEADER_BACK+.002]}><planeGeometry args={[LIGHT_POOL.width,LIGHT_POOL.height]}/><meshBasicMaterial map={lightPool()} transparent opacity={LIGHT_POOL.opacity} blending={AdditiveBlending} depthWrite={false} toneMapped={false}/></mesh>
  {/* 17/11: no brass picture lamps (a classical cue) — the panel is lit by the slim LED cove above it (baked) */}
  {/* brushed-brass name plaque, engraved dark text (6.9:1), name in mixed case — museum label practice */}
  <mesh position={[0,py,LEADER_BACK+.008]} material={leaderGold}><boxGeometry args={[P.width,P.height,.014]}/></mesh>
  <mesh position={[0,py,LEADER_BACK+.0156]}><planeGeometry args={[P.width-.03,P.height-.02]}/><meshBasicMaterial map={plaque} transparent toneMapped={false}/></mesh>
 </>;
}
const woodGrain=(()=>{const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d')!;const data=ctx.createImageData(256,256);for(let y=0;y<256;y++)for(let x=0;x<256;x++){const n=185+18*Math.sin(x*.19+Math.sin(y*.016)*2)+7*Math.sin(x*.91+y*.018);const i=(y*256+x)*4;data.data[i]=data.data[i+1]=data.data[i+2]=n;data.data[i+3]=255;}ctx.putImageData(data,0,0);const t=new CanvasTexture(c);t.colorSpace=SRGBColorSpace;return t;})();

const WOOD=['#493328','#69513b','#5e3e2c','#80633d','#4f362a','#644631','#563b2c'];
function Box({p,s,color,metal=0}:{p:number[];s:number[];color:string;metal?:number}){
  // Shared material + userData flag: StaticInstancer can batch identical boxes into one draw call.
  return <mesh userData={{staticBox:true}} receiveShadow castShadow={color!=='#dbd3c2'&&s[1]>.1&&p[1]<4.1&&Math.max(s[0],s[2])<4} position={p as [number,number,number]} geometry={cube} scale={s as [number,number,number]} material={boxMaterial(color,metal,WOOD.includes(color)?woodGrain:undefined)}/>;
}

function Inscription({text,width=5,height=.38,light=false,centered=false,fontReference,hires=false}:{text:string;width?:number;height?:number;light?:boolean;centered?:boolean;fontReference?:string;hires?:boolean}){
 const map=useMemo(()=>{
  const c=document.createElement('canvas');c.width=(width>10||hires?4096:2048)/(PHONE?2:1);c.height=Math.round(c.width*height/width);const ctx=c.getContext('2d')!;
  ctx.clearRect(0,0,c.width,c.height);ctx.font=`${light?700:600} ${Math.round(c.height*(light?.51:.54))}px "${light?'Noto Serif':'Noto Sans'}"`;
  ctx.textAlign='center';ctx.textBaseline='middle';
  if(light){const gold=ctx.createLinearGradient(0,0,0,c.height*.7);gold.addColorStop(0,'#fff1c8');gold.addColorStop(.5,'#e5c786');gold.addColorStop(1,'#ba9659');ctx.fillStyle=gold;ctx.shadowColor='#061e2580';ctx.shadowBlur=3;ctx.shadowOffsetY=2;}else ctx.fillStyle='#233e44';
  if(centered){
   let size=Math.round(c.height*.78);const font=()=>`${light?700:600} ${size}px "${light?'Noto Serif':'Noto Sans'}"`;
   ctx.font=font();while(Math.max(ctx.measureText(text).width,ctx.measureText(fontReference||text).width)>c.width-100&&size>12){size--;ctx.font=font();}
   ctx.textBaseline='alphabetic';const metrics=ctx.measureText(text);
   ctx.shadowBlur=0;ctx.shadowOffsetY=0;
   ctx.fillText(text,c.width/2,c.height/2+(metrics.actualBoundingBoxAscent-metrics.actualBoundingBoxDescent)/2);
  }else ctx.fillText(text,c.width/2,c.height*(light?.38:.47),c.width-70);
  ctx.shadowBlur=0;ctx.shadowOffsetY=0;ctx.fillStyle='#bda16c';
  if(!centered&&light){const y=c.height*.84;ctx.fillRect(c.width*.34,y,c.width*.13,1.5);ctx.fillRect(c.width*.53,y,c.width*.13,1.5);ctx.save();ctx.translate(c.width*.5,y);ctx.rotate(Math.PI/4);ctx.fillRect(-3,-3,6,6);ctx.restore();}
  else if(!centered)ctx.fillRect(c.width*.44,c.height*.92,c.width*.12,Math.max(2,c.height*.018));
  const t=new CanvasTexture(c);t.colorSpace=SRGBColorSpace;t.anisotropy=8;return t;
 },[text,width,height,light,centered,fontReference,hires]);
 const dispose=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
 useEffect(()=>{clearTimeout(dispose.current);return()=>{dispose.current=setTimeout(()=>map.dispose(),0);};},[map]);
 return <mesh><planeGeometry args={[width,height]}/><meshBasicMaterial map={map} transparent toneMapped={false} depthWrite={false}/></mesh>;
}

/** Inward-facing educational motto, centered above the entry lintel (kept live in the baked scene). */
function DoorMotto(){return <>
  <group position={[0,3.75,7.88]} rotation={[0,Math.PI,0]}>
   <Box p={[0,0,-.025]} s={[4.18,.50,.065]} color="#4f362a"/>
   <Box p={[0,0,.014]} s={[4.08,.414,.018]} color="#17383e"/>
   {[-1,1].map(side=><group key={'motto-frame'+side}>
    <Box p={[0,side*.222,.028]} s={[4.15,.018,.018]} color="#bda36b" metal={.4}/>
    <Box p={[side*2.066,0,.028]} s={[.018,.45,.018]} color="#bda36b" metal={.4}/>
    <Box p={[side*2.005,0,.030]} s={[.014,.27,.012]} color="#bda36b" metal={.4}/>
   </group>)}
   <group position={[0,0,.036]}><Inscription text="TIÊN HỌC LỄ HẬU HỌC VĂN" width={3.86} height={.35} light centered/></group>
  </group>
 </>;}

function Architecture({baked=false}:{baked?:boolean}){if(baked)return <DoorMotto/>;return <group>
  {/* Ban Giám hiệu panel: 5.4 m wide for 1 HT + 2 PHT (was 9.5 m for four principals). */}
  <Box p={[0,1.96,-7.96]} s={[5.4,3.22,.12]} color="#4f362a"/>
  <Box p={[0,1.98,-7.86]} s={[5.06,2.90,.07]} color="#17383e"/>
  <Box p={[0,.34,-7.81]} s={[5.7,.56,.30]} color="#4f362a"/>
  <Box p={[0,.65,-7.78]} s={[5.82,.06,.24]} color="#a88a55" metal={.4}/>
  <Box p={[0,3.58,-7.83]} s={[5.82,.13,.30]} color="#644631"/>
  <Box p={[0,3.48,-7.73]} s={[5.55,.028,.10]} color="#bda36b" metal={.5}/>
  {[-2.81,2.81].map(x=><group key={'principal-pier'+x}>
   <Box p={[x,1.96,-7.80]} s={[.22,3.42,.20]} color="#69513b"/>
   {[-.055,.055].map(dx=><Box key={dx} p={[x+dx,1.96,-7.68]} s={[.014,2.98,.016]} color="#b3955e" metal={.4}/>)}
   <Box p={[x,.26,-7.77]} s={[.42,.21,.30]} color="#a88a55" metal={.4}/>
   <Box p={[x,3.70,-7.77]} s={[.42,.12,.30]} color="#a88a55" metal={.4}/>
  </group>)}
  <Box p={[0,-.12,0]} s={[24.3,.24,16.3]} color="#d7cbb5"/>
  {<Box p={[0,4.28,0]} s={[24.3,.16,16.3]} color="#f5f0e6"/>}
  <Box p={[0,2.1,-8.08]} s={[24.3,4.2,.16]} color="#dbd3c2"/>
  {[-1,1].map(side=><group key={side}>
   <Box p={[side*12.08,2.1,0]} s={[.16,4.2,16.3]} color="#dbd3c2"/>
   {side===-1?<Box p={[-7,2.1,8.08]} s={[10,4.2,.16]} color="#dbd3c2"/>:cabinetWallPieces().map((piece:any,i:number)=><Box key={i} p={[piece.x,piece.y,8.08]} s={[piece.width,piece.height,.16]} color="#dbd3c2"/>)}
   <Box p={[side*12,.29,0]} s={[.10,.58,16]} color="#493328"/>
   <Box p={[side*12,3.92,0]} s={[.10,.12,16]} color="#b18d50"/>
   <Box p={[side*7,.29,8]} s={[10,.58,.10]} color="#493328"/>
  </group>)}
  <Box p={[0,.29,-8]} s={[24,.58,.10]} color="#493328"/>
  <Box p={[0,.63,-7.98]} s={[24,.028,.04]} color="#c2a05d" metal={.5}/>
  <Box p={[0,3.92,-8]} s={[24,.12,.10]} color="#b18d50"/>
  {<Box p={[0,3.87,8]} s={[24,.12,.10]} color="#b18d50"/>}
  {/* Shallow decorative trims only at corners */}
  {[-11.88,11.88].flatMap(x=>[-7.88,7.88].map(z=><Box key={x+','+z} p={[x,2.1,z]} s={[.12,4.2,.12]} color="#be9a5d"/>))}
  {[-8,-4,0,4,8].map(x=><group key={x}><Box p={[x,4.13,0]} s={[.065,.08,15.8]} color="#bca47a"/><Box p={[x,4.07,0]} s={[.035,.025,13]} color="#fff3d9"/></group>)}
  {[-4,0,4].map(z=><Box key={z} p={[0,4.14,z]} s={[23.8,.07,.055]} color="#bca47a"/>)}
  {/* Tile seams on floor */}
  {Array.from({length:23},(_,i)=>i-11).map(x=><Box key={'x'+x} p={[x,.002,0]} s={[.007,.003,16]} color="#c6baa4"/>)}
  {Array.from({length:15},(_,i)=>i-7).map(z=><Box key={'z'+z} p={[0,.002,z]} s={[24,.003,.007]} color="#c6baa4"/>)}
  <Box p={[0,.007,1.5]} s={[2.2,.012,12.2]} color="#627f78"/>
  {BENCHES.map(([x,z])=><group key={x}>
   <Box p={[x,.46,z]} s={[2.6,.13,.65]} color="#5e3e2c"/>
   {[-.9,.9].map(dx=><Box key={dx} p={[x+dx,.22,z]} s={[.16,.44,.52]} color="#283e43"/>)}
  </group>)}
  {/* Open doorway */}
  <Box p={[0,-.12,9.5]} s={[5.6,.24,3.1]} color="#d7cbb5"/>
  <Box p={[0,3.78,8.08]} s={[4,.84,.16]} color="#dbd3c2"/>
  <Box p={[0,3.48,8.18]} s={[4.34,.15,.22]} color="#69513b"/>
  <Box p={[0,3.39,8.31]} s={[4.34,.035,.04]} color="#bda36b" metal={.5}/>
  <DoorMotto/>
  {[-1,1].map(side=><group key={'entry'+side}>
   <Box p={[side*2.12,1.7,8.18]} s={[.18,3.4,.24]} color="#69513b"/>
   <Box p={[side*2.04,1.7,8.32]} s={[.03,3.36,.04]} color="#bda36b" metal={.5}/>
   <Box p={[side*2.75,1.8,9.605]} s={[.12,3.6,2.89]} color="#dbd3c2"/>
  </group>)}
  {<Box p={[0,3.65,9.5]} s={[5.6,.12,3.1]} color="#f5f0e6"/>}
 </group>;
}

function Frames({slots,material,lip=false}:{slots:any[];material:MeshStandardMaterial;lip?:boolean}){
 const ref=useRef<InstancedMesh>(null),lipRef=useRef<InstancedMesh>(null);
 useLayoutEffect(()=>{if(!ref.current)return;const m=new Matrix4(),local=new Matrix4(),base=new Matrix4();let n=0,k=0;
 for(const s of slots){base.makeRotationY(s.yaw);base.setPosition(s.x,s.y,s.z);
  const fw=s.width||.55,fh=s.height||.735;
  const b=FRAME_BAR;for(const [x,y,w,h] of [[-(fw-b)/2,0,b,fh],[(fw-b)/2,0,b,fh],[0,(fh-b)/2,fw,b],[0,-(fh-b)/2,fw,b]]){
   // 2.2 cm deep bars standing on the wall (z 0…0.022); the photo sits inside them, like a real frame.
   local.makeScale(w,h,.022);local.setPosition(x,y,.011);m.multiplyMatrices(base,local);ref.current.setMatrixAt(n++,m);
  }
  if(lip&&lipRef.current){
   // gold line on the inner edge of the bars, framing the photo. 16/11 (user: edges flickered): the first version shared
   // its inner side faces with the bars' (same plane, z 0….022) → z-fighting when seen at an angle. Now the lip is only
   // a thin strip ON the bars' front (z .022….025) and reaches 1 mm into the opening, so no face is ever coplanar.
   const L=FRAME_LIP,I=FRAME_LIP_INSET,iw=fw-2*b-2*I,ih=fh-2*b-2*I,z0=.0225,dz=FRAME_LIP_DEPTH;
   for(const [x,y,w,h] of [[-(iw+L)/2,0,L,ih+2*L],[(iw+L)/2,0,L,ih+2*L],[0,(ih+L)/2,iw,L],[0,-(ih+L)/2,iw,L]]){
    local.makeScale(w,h,dz);local.setPosition(x,y,z0+dz/2);m.multiplyMatrices(base,local);lipRef.current.setMatrixAt(k++,m);
   }
  }
 }ref.current.instanceMatrix.needsUpdate=true;ref.current.computeBoundingSphere();
 if(lipRef.current){lipRef.current.instanceMatrix.needsUpdate=true;lipRef.current.computeBoundingSphere();}},[slots,lip]);
 return <><instancedMesh ref={ref} args={[cube,material,Math.max(1,slots.length*4)]} count={slots.length*4} frustumCulled={false}/>
  {lip&&<instancedMesh ref={lipRef} args={[cube,goldLip,Math.max(1,slots.length*4)]} count={slots.length*4} frustumCulled={false}/>}</>;
}

/** 16/11 (user: “ảnh và khung chưa khít”, measured on real photos): the photo used to be 2–7 mm SMALLER than
 * the frame opening, so the slatted wall showed through a dark sliver. Now it is 6 mm larger on its tight
 * side (2:3 kept), so the 2.8 cm brass bars always overlap its edges, as in a real frame. */
export const FRAME_BAR=.028,PHOTO_OVERLAP=.006;
export function photoSize(fw:number,fh:number):[number,number]{
 const ow=fw-2*FRAME_BAR,oh=fh-2*FRAME_BAR,w=Math.max(ow+2*PHOTO_OVERLAP,(oh+2*PHOTO_OVERLAP)/1.5);return [w,w*1.5];
}

/** Distance tiers with hysteresis (no flip-flop while standing on a threshold). */
export function photoTier(cur:PhotoTier,d:number):PhotoTier{
 if(d<(cur===2?3:2.4))return 2;
 return d<(cur>=1?8.5:6.5)?1:0;
}

function Photo({slot,onSelect}:{slot:any;onSelect:(id:string)=>void}){
 const principal=slot.group==='principal'||slot.group==='deputy';const [tier,setTier]=useState<PhotoTier>(principal?2:0);const {camera}=useThree();
 // 16/11: the 3 Ban Giám hiệu portraits (1 m frames, the focal wall) always use the sharp version — no blurry
 // far copy and no visible swap while walking towards them.
 // teachers: far → near (6.5 m, back at 8.5) → close, full upload resolution (2.4 m, back at 3.0)
 useFrame(()=>{if(principal)return;const next=photoTier(tier,Math.hypot(camera.position.x-slot.x,camera.position.z-slot.z));if(next!==tier)setTier(next);});
 return <group position={[slot.x,slot.y,slot.z]} rotation={[0,slot.yaw,0]} onClick={e=>{e.stopPropagation();if(e.delta<6)onSelect(slot.person.id);}}>
  {principal&&<LeaderDressing slot={slot}/>}
  {/* 15/11: Ban Giám hiệu photo fills the whole brass opening (no cream margin). It sits just behind the
      front face of the 2.8 cm frame bars (z .03 < .0345) so the bars neatly cover its 4–5 mm overlap. */}
  <mesh position={[0,0,principal ? .016 : .015]}><planeGeometry args={photoSize(slot.width||.55,slot.height||.735)}/><HallPhoto person={slot.person} tier={tier}/></mesh>
  {!principal&&<mesh position={[0,-(slot.height/2+.12),.04]}><planeGeometry args={[.69,.14375]}/><Texture person={slot.person} label/></mesh>}
 </group>;
}

function WallSign({sign:s}:{sign:any}){
 const ref=useRef<Group>(null),point=useMemo(()=>new Vector3(),[]);
 useFrame(({camera})=>{
  if(!ref.current)return;
  // Anti-flicker (14/11): physical wall headings always stay visible. Hiding partly-framed headings
  // made them pop in and out while the presentation camera turned.
  ref.current.visible=true;void camera;void point;
 });
 return <group ref={ref} position={[s.x,s.y,s.z]} rotation={[0,s.yaw,0]}>
  {s.motto&&<>
   <Box p={[0,0,-.035]} s={[s.width+.14,.48,.055]} color="#4f362a"/>
   <Box p={[0,0,-.002]} s={[s.width+.07,.414,.015]} color="#17383e"/>
   {[-1,1].map(side=><group key={side}><Box p={[0,side*.222,.012]} s={[s.width+.12,.014,.014]} color="#bda36b" metal={.4}/><Box p={[side*(s.width/2+.05),0,.012]} s={[.014,.45,.014]} color="#bda36b" metal={.4}/></group>)}
  </>}
  <group position={[0,0,s.motto?.025:0]}><Inscription text={s.text} width={s.width} height={s.motto?.35:s.labelHeight??(s.id==='principal-sign'?.38:.28)} light={s.motto||s.id==='principal-sign'} centered={s.motto} fontReference={s.fontReference}/></group>
 </group>;
}
/** 17/11 (user: arrange by tổ): a slim teal plate with the tổ name under each block of ≥ 2 columns of one tổ, on the plaster
 * below the oak slats (slats end at 0.75 m; name plates at 0.83–0.97 m). Wall face is 0.14 m behind the frame plane:
 * plate 1.4 cm off the wall, gold rules and text in front of it — never coplanar with the baked wall. */
function DeptPlates({slots}:{slots:any[]}){
 const plates=useMemo(()=>deptPlates(slots.filter((s:any)=>s.group==='teacher')),[slots]);
 if(import.meta.env.DEV)(window as any).__deptPlates=plates;   // QA (admin computer only)
 const root=useRef<Group>(null);
 useEffect(()=>{if(import.meta.env.DEV)(window as any).__deptPlateRoot=root.current;});
 return <group ref={root}>{plates.map(pl=><group key={pl.wall+pl.x.toFixed(2)+pl.z.toFixed(2)} position={[pl.x,.615,pl.z]} rotation={[0,pl.yaw,0]}>
  <mesh position={[0,0,-.12]}><boxGeometry args={[pl.length,.115,.012]}/><meshStandardMaterial color="#17383e" roughness={.6}/></mesh>
  {[-1,1].map(sy=><mesh key={sy} position={[0,sy*.047,-.1125]}><planeGeometry args={[pl.length-.03,.004]}/><meshBasicMaterial color="#c9a560" toneMapped={false}/></mesh>)}
  <group position={[0,0,-.111]}><Inscription text={'TỔ '+String(pl.dept).toLocaleUpperCase('vi')} width={Math.max(.6,pl.length-.12)} height={.082} light centered/></group>
 </group>)}</group>;
}
function ZoneNames({layout}:{layout:any}){return <>{layout.signs.map((s:any)=><WallSign key={s.id} sign={s}/>)}</>;}
/** 16/11 (user: “tượng quá mờ… mở rộng ra như một phòng thu nhỏ trưng bày”): the statue stands in a small exhibition
 * room behind the foyer's right wall. Room shell, pedestal and their light are baked (hall-baked.glb); the statue,
 * the inscriptions and the short biography stay live (sharp text). A live warm key + fill light the bronze. */
export const STATUE_KEY:[number,number,number]=[5.45,3.05,10.25];
/** Short, well-documented facts only (Đại Việt sử ký toàn thư; school textbooks) — no invented quotations. */
export const STATUE_STORY=['Chu Văn An (1292 – 1370), quê làng Văn Thôn, Thanh Trì (Hà Nội).',
 'Nhà giáo tiêu biểu đời Trần, từng dạy ở Quốc Tử Giám.',
 'Dâng “Thất trảm sớ”, rồi về Chí Linh mở trường dạy học.',
 'Được hậu thế tôn vinh là “Vạn thế sư biểu”.'];
function StatueStory(){
 const W=1.25,H=.78,map=useMemo(()=>{
  const c=document.createElement('canvas');c.width=1600;c.height=Math.round(1600*H/W);const g=c.getContext('2d')!;
  g.fillStyle='#f1e9d9';g.fillRect(0,0,c.width,c.height);g.strokeStyle='#bda36b';g.lineWidth=5;g.strokeRect(26,26,c.width-52,c.height-52);
  g.textAlign='center';g.fillStyle='#17383e';g.font='700 92px "Noto Serif"';g.fillText('CHU VĂN AN',c.width/2,170);
  g.font='600 46px "Noto Sans"';g.fillStyle='#6b4f32';g.fillText('1292 – 1370',c.width/2,240);
  g.fillStyle='#bda36b';g.fillRect(c.width*.38,280,c.width*.24,4);
  g.textAlign='left';g.fillStyle='#2a1f18';g.font='400 44px "Noto Sans"';
  // wrap each fact (never squeeze letters): bullet, then indented continuation lines
  let y=370;const maxW=c.width-230;
  for(const t of STATUE_STORY){
   const words=t.split(' ');let line='';const lines:string[]=[];
   for(const w of words){const next=line?line+' '+w:w;if(g.measureText(next).width>maxW&&line){lines.push(line);line=w;}else line=next;}
   lines.push(line);
   g.fillText('•',96,y);lines.forEach((l,i)=>g.fillText(l,136,y+i*58));y+=lines.length*58+30;
  }
  const t=new CanvasTexture(c);t.colorSpace=SRGBColorSpace;t.anisotropy=8;return t;
 },[]);
 useEffect(()=>()=>map.dispose(),[map]);
 // on the room's left wall (z = z1, facing −z), between the portal and the statue
 return <group position={[5.95,1.6,STATUE_ROOM.z1]} rotation={[0,Math.PI,0]}>
  <Box p={[0,0,.02]} s={[W+.1,H+.1,.04]} color="#4f362a"/>
  <Box p={[0,0,.045]} s={[W+.02,H+.02,.01]} color="#bda36b" metal={.4}/>
  <mesh position={[0,0,.056]}><planeGeometry args={[W,H]}/><meshBasicMaterial map={map} toneMapped={false}/></mesh>
 </group>;
}
/** Statue-room portal sign (user, 16/11). The portal head ends at 2.94 m, the foyer ceiling is 3.95 m. */
export const STATUE_SIGN_SPEC:SignSpec={frame:{w:2.9,h:.46,d:.035},face:{w:2.78,h:.38},rule:.46,lines:[
 {text:'PHÒNG TRƯNG BÀY TƯỢNG PHÁC THẢO',size:.19,cy:.27,spacing:6},{text:'THẦY GIÁO CHU VĂN AN',size:.34,cy:.70,spacing:8}]};
/** Clean teal fabric for the statue backdrop: the bake's light falloff (bright wash at the top centre, darker lower
 * corners, a little warmer on the rim-light side) painted smoothly, with a regular fine weave instead of noise. */
function TealBackdrop(){
 const R=STATUE_ROOM,M=MONUMENT,W=2.5,map=useMemo(()=>{
  const N=PHONE?1024:2048,c=document.createElement('canvas');c.width=c.height=N;const g=c.getContext('2d')!;
  const v=g.createLinearGradient(0,0,0,N);v.addColorStop(0,'rgb(52,104,94)');v.addColorStop(.45,'rgb(33,81,70)');v.addColorStop(1,'rgb(19,55,47)');
  g.fillStyle=v;g.fillRect(0,0,N,N);
  const wash=g.createRadialGradient(N*.5,0,0,N*.5,0,N*.55);wash.addColorStop(0,'rgba(128,172,160,.75)');wash.addColorStop(.5,'rgba(80,130,118,.25)');wash.addColorStop(1,'rgba(80,130,118,0)');
  g.fillStyle=wash;g.fillRect(0,0,N,N);
  const rim=g.createRadialGradient(N*.95,N*.7,0,N*.95,N*.7,N*.5);rim.addColorStop(0,'rgba(120,150,130,.22)');rim.addColorStop(1,'rgba(120,150,130,0)');
  g.fillStyle=rim;g.fillRect(0,0,N,N);
  const corner=g.createRadialGradient(0,N,0,0,N,N*.6);corner.addColorStop(0,'rgba(5,20,18,.35)');corner.addColorStop(1,'rgba(5,20,18,0)');
  g.fillStyle=corner;g.fillRect(0,0,N,N);
  // woven felt: regular 2 px warp/weft, very low contrast (reads as fabric up close, flat from afar)
  for(let i=0;i<N;i+=2){g.fillStyle=i%4?'rgba(0,0,0,.05)':'rgba(255,255,255,.025)';g.fillRect(0,i,N,1);g.fillStyle=i%4?'rgba(255,255,255,.02)':'rgba(0,0,0,.03)';g.fillRect(i,0,1,N);}
  const t=new CanvasTexture(c);t.colorSpace=SRGBColorSpace;t.anisotropy=16;return t;
 },[]);
 useEffect(()=>()=>map.dispose(),[map]);
 return <mesh position={[R.x1-.068,1.62,M.z]} rotation={[0,-Math.PI/2,0]}><planeGeometry args={[W,W]}/><meshBasicMaterial map={map} toneMapped={false}/></mesh>;
}
function MonumentReservation({baked=false}:{baked?:boolean}){
 const M=MONUMENT,front=M.depth/2+.003,R=STATUE_ROOM;
 const key=useMemo(()=>{const t=new Object3D();t.position.set(M.x,1.45,M.z);return t;},[]);
 return <>
 <group position={[M.x,0,M.z]} rotation={[0,M.yaw,0]}>
  {!baked&&<><Box p={[0,.05,0]} s={[M.width+.2,.1,M.depth+.1]} color="#161514"/>
   <Box p={[0,(.1+M.pedestalHeight)/2,0]} s={[M.width,M.pedestalHeight-.1,M.depth]} color="#161514"/></>}
  <group position={[0,.56,front]}><Inscription text="CHU VĂN AN" width={.8} height={.15} light/></group>
  <group position={[0,.38,front]}><Inscription text="TƯỢNG PHÁC THẢO THEO ẢNH MẪU" width={.86} height={.085} light/></group>
  {/* ChuVanAnStatue places itself 0.89 m up = on the 0.88 m pedestal */}
  <Suspense fallback={null}><ChuVanAnStatue/></Suspense>
 </group>
 {/* 16/11 (user: is the teal sharp?): the baked teal carried ~5 % lightmap/webp grain — a clean live fabric layer
   (8 mm in front of the baked panel face at x1 − 0.06) replaces it; gilded titles 1 cm in front, drawn at 4096 px, no glow */}
 <TealBackdrop/>
 <group position={[R.x1-.078,2.62,M.z]} rotation={[0,-Math.PI/2,0]}><Inscription text="VẠN THẾ SƯ BIỂU" width={2.0} height={.26} light centered hires/></group>
 <group position={[R.x1-.078,2.36,M.z]} rotation={[0,-Math.PI/2,0]}><Inscription text="NGƯỜI THẦY CỦA MUÔN ĐỜI" width={1.5} height={.13} light centered hires/></group>
 {/* 16/11 (user): sign above the portal, same style as the school sign over the main door */}
 <GildedSign spec={STATUE_SIGN_SPEC} position={[R.opening.wallX,3.32,M.z]} rotation={-Math.PI/2}/>
 <StatueStory/>
 <primitive object={key}/>
 <spotLight position={STATUE_KEY} target={key} color="#ffe2b8" intensity={7} distance={6} angle={.5} penumbra={.8} decay={2}/>
 <pointLight position={[5.6,1.7,11.7]} color="#ffeedd" intensity={.8} distance={3} decay={2}/>
 </>;}

function MemoryCabinets({baked=false}:{baked?:boolean}){const n=CABINET_NICHE,mid=(n.bottom+n.top)/2,h=n.top-n.bottom;return <>{CABINETS.map((c:any,i:number)=><group key={c.id} position={[c.x,0,n.wallZ]} rotation={[0,Math.PI,0]}>
 {/* Actual recessed niche: wall is segmented around this opening. Baked scene: shell comes from hall-baked.glb. */}
 {!baked&&<>
 <Box p={[0,mid,-.46]} s={[n.width,h,.04]} color="#17383e"/>
 {[-1,1].map(side=><group key={side}>
  <Box p={[side*(n.width/2-.025),mid,-.23]} s={[.05,h,.48]} color="#69513b"/>
  <Box p={[side*(n.width/2-.012),mid,.025]} s={[n.frame,h+.04,.025]} color="#bda36b" metal={.5}/>
 </group>)}
 {[n.bottom,n.top].map(y=><group key={y}><Box p={[0,y,-.23]} s={[n.width,.05,.48]} color="#69513b"/><Box p={[0,y,.025]} s={[n.width+.015,n.frame,.025]} color="#bda36b" metal={.5}/></group>)}
 {[1.02,1.95].map(y=><Box key={y} p={[0,y,-.22]} s={[2.01,.025,.38]} color="#bda36b" metal={.3}/>)}
 <mesh position={[0,2.90,-.18]} rotation={[Math.PI/2,0,0]}><planeGeometry args={[1.85,.10]}/><meshBasicMaterial color="#fff1d4"/></mesh>
 <group position={[0,.31,-.25]}>
 {/* Static illustrative objects: no invented award, date or school document. */}
 {i===0?<>
  {[-.52,0,.52].map((x,j)=><group key={x} position={[x,1.15,.06]} rotation={[0,0,(j-1)*.06]}><Box p={[0,0,0]} s={[.33,.78,.19]} color={j===1?'#69513b':'#c5ae7d'}/><Box p={[0,.04,.103]} s={[.24,.57,.008]} color="#f0e8d7"/></group>)}
  <Box p={[0,2.13,.04]} s={[1.42,.65,.14]} color="#bda36b" metal={.3}/><Box p={[0,2.13,.12]} s={[1.29,.53,.012]} color="#eee4ce"/>
 </>:i===1?<>
  {[-.5,.5].map((x,j)=><group key={x}><Box p={[x,1.12,0]} s={[.62,.75,.14]} color="#bda36b" metal={.4}/><Box p={[x,1.12,.08]} s={[.51,.63,.01]} color={j?'#cbb484':'#e9dfc6'}/></group>)}
  <group position={[0,2.13,0]}><Box p={[0,0,0]} s={[.94,.64,.12]} color="#69513b"/><Box p={[0,0,.07]} s={[.82,.52,.012]} color="#eee4ce"/><mesh position={[0,.02,.083]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.15,.15,.025,32]}/><meshStandardMaterial color="#b89b64" metalness={.35} roughness={.55}/></mesh></group>
 </>:<>
  {[-.5,.5].map(x=><group key={x} position={[x,.72,0]}><Box p={[0,.05,0]} s={[.38,.10,.28]} color="#493328"/><mesh position={[0,.27,0]}><cylinderGeometry args={[.06,.08,.35,16]}/><meshStandardMaterial color="#b99a5c" metalness={.65} roughness={.3}/></mesh><mesh position={[0,.57,0]}><cylinderGeometry args={[.24,.08,.30,24]}/><meshStandardMaterial color="#c5a366" metalness={.65} roughness={.3}/></mesh></group>)}
  <Box p={[0,2.12,0]} s={[1.12,.67,.13]} color="#bda36b" metal={.4}/><Box p={[0,2.12,.075]} s={[.99,.54,.012]} color="#ece3cf"/>
 </>}
 </group>
 </>}
 <mesh position={[0,mid,.045]}><planeGeometry args={[2.01,h-.09]}/><meshStandardMaterial color="#e4eeee" transparent opacity={.07} roughness={.18} depthWrite={false}/></mesh>
 
 <group position={[0,.982,.075]}><Box p={[0,0,-.013]} s={[1.89,.205,.025]} color="#f1e9d9"/><Inscription text={c.title.toLocaleUpperCase('vi')} width={1.81} height={.17}/></group>
 
 </group>)}</>;}
function PrincipalLamps(){
 const targets=useMemo(()=>[-1.486,0,1.486].map(x=>{const t=new Object3D();t.position.set(x,1.9,-7.70);return t;}),[]);
 return <>{targets.map((target,i)=><group key={i}><primitive object={target}/><spotLight position={[target.position.x,3.1,-6.7]} target={target} color="#ffebcc" intensity={5} distance={4} angle={.48} penumbra={.85} decay={2}/></group>)}</>;
}


function Ready({onReady,onLost}:{onReady:()=>void;onLost:()=>void}){const gl=useThree(s=>s.gl);useEffect(()=>{gl.domElement.setAttribute('aria-label','Một phòng 24 × 16 mét, khu kỷ vật và bốn khu chân dung');onReady();const fn=()=>onLost();gl.domElement.addEventListener('webglcontextlost',fn);return()=>gl.domElement.removeEventListener('webglcontextlost',fn);},[gl]);return null;}

export default function HallScene(p:Props){
 const baked=bakedEnabled();
 return <Canvas shadows={!baked} frameloop="demand" dpr={[1,1.5]} camera={{position:[0,1.7,-2.7],fov:62,near:.05,far:55}} gl={{antialias:true,powerPreference:'low-power',toneMapping:ACESFilmicToneMapping,toneMappingExposure:1}} fallback={<p>Nếu cảnh 3D không hiển thị, mở Tra cứu để xem hồ sơ.</p>}>
  <color attach="background" args={['#e2d7c1']}/><ambientLight intensity={.3}/><hemisphereLight args={['#fff5e8','#655548',.8]}/><directionalLight position={[2,3.95,3]} intensity={1.6} color="#fff3df" castShadow={!baked} shadow-mapSize={[1024,1024]} shadow-camera-left={-16} shadow-camera-right={16} shadow-camera-top={13} shadow-camera-bottom={-13} shadow-camera-far={35} shadow-bias={-.0001} shadow-normalBias={.025}/>
  <pointLight position={[0,3.6,-6.3]} intensity={16} distance={9} color="#ffe8bc" decay={2}/>
  <pointLight position={[-8,3.7,0]} intensity={12} distance={12} color="#fff0d4" decay={2}/><pointLight position={[8,3.7,0]} intensity={12} distance={12} color="#fff0d4" decay={2}/>

  <GalleryEnvironment/>{baked&&<Suspense fallback={null}><BakedHall/></Suspense>}<StaticInstancer><Architecture baked={baked}/><MonumentReservation baked={baked}/><MemoryCabinets baked={baked}/></StaticInstancer>{p.gallery&&p.onGallery&&<GalleryDisplays items={p.gallery} onOpen={i=>{if(!p.moving&&!p.paused)p.onGallery!(i);}}/>}<PrincipalLamps/><LeaderFrames slots={p.layout.slots.filter(isLeaderSlot)}/><Frames slots={p.layout.slots.filter((s:any)=>!isLeaderSlot(s))} material={walnut} lip/><ZoneNames layout={p.layout}/><DeptPlates slots={p.layout.slots}/>
  {p.layout.slots.map((slot:any)=><Photo key={slot.person.id} slot={slot} onSelect={id=>{if(!p.moving&&!p.paused)p.onSelect(id);}}/>)}
  <StopMarkers stops={p.layout.stops} onGo={p.onGo} disabled={p.moving||p.paused||Boolean(p.controlsLocked)||Boolean(p.hideMarkers)}/>
  {p.emptySlots&&p.onEmpty&&<EmptySlots slots={p.emptySlots} onEmpty={p.onEmpty} disabled={p.moving||p.paused}/>}
  {p.route&&<RouteDots route={p.route}/>}
  <HallController plan={p.plan} command={p.command} atDoor={Boolean(p.atDoor)} intro={Boolean(p.intro)} paused={p.paused} effects={p.effects} input={p.input} loadedRooms={[0]} onArrive={p.onArrive} onMotion={p.onMotion} onRegion={()=>{}} controlsLocked={p.controlsLocked} pose={p.pose} route={p.route}/>
  <Ready onReady={p.onReady} onLost={p.onLost}/>
  {statsEnabled()&&<SceneStats/>}
  {p.quality&&<PerfProbe {...p.quality}/>}
  {/* 15/11 Bước 1: real-room reflection probes + post-processing (quality-gated) */}
  {baked&&<RoomProbes level={p.quality?.level||'high'}/>}
  {baked&&p.quality&&p.quality.level!=='low'&&<PostFX level={p.quality.level}/>}
  <EntranceDoors door={p.door} waiting={Boolean(p.atDoor&&!p.intro)} onOpen={p.onOpenDoor}/>
  {baked&&<VisitCounter/>}
  {baked&&<FoyerView/>}
 </Canvas>;
}



