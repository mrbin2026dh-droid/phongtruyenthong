import {Suspense,useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {Canvas,useFrame,useThree} from '@react-three/fiber';
import {BoxGeometry,InstancedMesh,Matrix4,MeshStandardMaterial,SRGBColorSpace,CanvasTexture,ACESFilmicToneMapping,Object3D,Group,Vector3} from 'three';

import {Texture,GalleryEnvironment} from './BlenderMuseum';
import HallController from './HallController';
import HallPhoto,{type PhotoTier} from './HallPhoto';
import ChuVanAnStatue from './ChuVanAnStatue';
import SceneStats,{statsEnabled} from './SceneStats';
import StaticInstancer,{boxMaterial} from './StaticInstancer';
import BakedHall,{bakedEnabled} from './BakedHall';
import {HALL,BENCHES,MONUMENT,CABINETS,CABINET_NICHE,cabinetWallPieces} from './hallLayout.mjs';
import type {MutableRefObject} from 'react';
import type {NavigationInput} from './VisitorController';
import type {VisitorPose,RouteState} from './HallController';
import {StopMarkers,RouteDots} from './Wayfinding';
import PerfProbe from './PerfProbe';
import EntranceDoors from './EntranceDoors';
import FoyerView from './FoyerView';
import RoomProbes from './RoomProbes';
import PostFX from './PostFX';
import EmptySlots from './EmptySlots';
import type {DoorState} from './EntranceDoors';
import type {QualityControl} from './PerfProbe';

type Props={layout:any;plan:any;command:any;atDoor?:boolean;intro?:boolean;paused:boolean;effects:boolean;input:MutableRefObject<NavigationInput>;onArrive:(id:string)=>void;onMotion:(v:boolean)=>void;onSelect:(id:string)=>void;onGo:(id:string)=>void;onReady:()=>void;onLost:()=>void;moving:boolean;controlsLocked?:boolean;pose?:MutableRefObject<VisitorPose>;route?:MutableRefObject<RouteState>;quality?:QualityControl;door?:MutableRefObject<DoorState>;emptySlots?:any[];onEmpty?:(slotId:string)=>void};

const cube=new BoxGeometry(1,1,1);
// Portrait frames (15/11): satin brass, less mirror-like, so every frame reads the same tone from any angle.
const brass=new MeshStandardMaterial({color:'#c4a062',metalness:.35,roughness:.48});
const woodGrain=(()=>{const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d')!;const data=ctx.createImageData(256,256);for(let y=0;y<256;y++)for(let x=0;x<256;x++){const n=185+18*Math.sin(x*.19+Math.sin(y*.016)*2)+7*Math.sin(x*.91+y*.018);const i=(y*256+x)*4;data.data[i]=data.data[i+1]=data.data[i+2]=n;data.data[i+3]=255;}ctx.putImageData(data,0,0);const t=new CanvasTexture(c);t.colorSpace=SRGBColorSpace;return t;})();

const WOOD=['#493328','#69513b','#5e3e2c','#80633d','#4f362a','#644631','#563b2c'];
function Box({p,s,color,metal=0}:{p:number[];s:number[];color:string;metal?:number}){
  // Shared material + userData flag: StaticInstancer can batch identical boxes into one draw call.
  return <mesh userData={{staticBox:true}} receiveShadow castShadow={color!=='#dbd3c2'&&s[1]>.1&&p[1]<4.1&&Math.max(s[0],s[2])<4} position={p as [number,number,number]} geometry={cube} scale={s as [number,number,number]} material={boxMaterial(color,metal,WOOD.includes(color)?woodGrain:undefined)}/>;
}

function Inscription({text,width=5,height=.38,light=false,centered=false,fontReference}:{text:string;width?:number;height?:number;light?:boolean;centered?:boolean;fontReference?:string}){
 const map=useMemo(()=>{
  const c=document.createElement('canvas');c.width=width>10?4096:2048;c.height=Math.round(c.width*height/width);const ctx=c.getContext('2d')!;
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
 },[text,width,height,light,centered,fontReference]);
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

function Frames({slots}:{slots:any[]}){
 const ref=useRef<InstancedMesh>(null);
 useLayoutEffect(()=>{if(!ref.current)return;const m=new Matrix4(),local=new Matrix4(),base=new Matrix4();let n=0;
 for(const s of slots){base.makeRotationY(s.yaw);base.setPosition(s.x,s.y,s.z);
  const fw=s.width||.55,fh=s.height||.735;
  const b=FRAME_BAR;for(const [x,y,w,h] of [[-(fw-b)/2,0,b,fh],[(fw-b)/2,0,b,fh],[0,(fh-b)/2,fw,b],[0,-(fh-b)/2,fw,b]]){
   // 2.2 cm deep bars standing on the wall (z 0…0.022); the photo sits inside them, like a real frame.
   local.makeScale(w,h,.022);local.setPosition(x,y,.011);m.multiplyMatrices(base,local);ref.current.setMatrixAt(n++,m);
  }
 }ref.current.instanceMatrix.needsUpdate=true;ref.current.computeBoundingSphere();},[slots]);
 return <instancedMesh ref={ref} args={[cube,brass,slots.length*4]} frustumCulled={false}/>;
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
  {principal&&<>
   <Box p={[0,-.06,-.06]} s={[slot.width+.22,slot.height+.47,.07]} color="#563b2c"/>
   <mesh position={[0,0,.008]}><planeGeometry args={[slot.width-.025,slot.height-.025]}/><meshStandardMaterial color="#eee5d4" roughness={.9}/></mesh>
   {[-1,1].flatMap(sign=>[
    <Box key={'portrait-side'+sign} p={[sign*(slot.width/2+.035),0,.018]} s={[.025,slot.height+.12,.055]} color="#bda36b" metal={.5}/>,
    <Box key={'portrait-edge'+sign} p={[0,sign*(slot.height/2+.045),.018]} s={[slot.width+.095,.025,.055]} color="#bda36b" metal={.5}/>
   ])}
   <Box p={[0,slot.height/2+.19,.09]} s={[.40,.035,.14]} color="#a88a55" metal={.5}/>
   <mesh position={[0,slot.height/2+.166,.10]} rotation={[Math.PI/2,0,0]}><planeGeometry args={[.31,.07]}/><meshBasicMaterial color="#fff0cc"/></mesh>
  </>}
  {/* 15/11: Ban Giám hiệu photo fills the whole brass opening (no cream margin). It sits just behind the
      front face of the 2.8 cm frame bars (z .03 < .0345) so the bars neatly cover its 4–5 mm overlap. */}
  <mesh position={[0,0,principal ? .016 : .015]}><planeGeometry args={photoSize(slot.width||.55,slot.height||.735)}/><HallPhoto person={slot.person} tier={tier}/></mesh>
  <mesh position={[0,-(slot.height/2+.12),principal ? .065 : .04]}><planeGeometry args={[principal ? slot.width+.10 : .69,principal ? .19 : .14375]}/><Texture person={slot.person} label/></mesh>
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
function ZoneNames({layout}:{layout:any}){return <>{layout.signs.map((s:any)=><WallSign key={s.id} sign={s}/>)}</>;}
function MonumentReservation({baked=false}:{baked?:boolean}){return <group position={[MONUMENT.x,0,MONUMENT.z]}>
 {!baked&&<><Box p={[0,.08,0]} s={[1.34,.16,1.34]} color="#493328"/>
 <Box p={[0,.49,0]} s={[MONUMENT.width,.66,MONUMENT.depth]} color="#233e44"/>
 <Box p={[0,.85,0]} s={[1.2,.06,1.2]} color="#bda36b" metal={.4}/></>}
 <group position={[0,.5,.561]}><Inscription text="CHU VĂN AN" width={.95} height={.16} light/></group>
 <group position={[0,.31,.562]}><Inscription text="TƯỢNG PHÁC THẢO THEO ẢNH MẪU" width={1.02} height={.10} light/></group>
 <Suspense fallback={null}><ChuVanAnStatue/></Suspense>
 </group>;}

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
 const targets=useMemo(()=>[-1.6,0,1.6].map(x=>{const t=new Object3D();t.position.set(x,1.9,-7.70);return t;}),[]);
 return <>{targets.map((target,i)=><group key={i}><primitive object={target}/><spotLight position={[target.position.x,3.1,-6.7]} target={target} color="#ffebcc" intensity={5} distance={4} angle={.48} penumbra={.85} decay={2}/></group>)}</>;
}


function Ready({onReady,onLost}:{onReady:()=>void;onLost:()=>void}){const gl=useThree(s=>s.gl);useEffect(()=>{gl.domElement.setAttribute('aria-label','Một phòng 24 × 16 mét, khu kỷ vật và bốn khu chân dung');onReady();const fn=()=>onLost();gl.domElement.addEventListener('webglcontextlost',fn);return()=>gl.domElement.removeEventListener('webglcontextlost',fn);},[gl]);return null;}

export default function HallScene(p:Props){
 const baked=bakedEnabled();
 return <Canvas shadows={!baked} frameloop="demand" dpr={[1,1.5]} camera={{position:[0,1.7,-2.7],fov:62,near:.05,far:55}} gl={{antialias:true,powerPreference:'low-power',toneMapping:ACESFilmicToneMapping,toneMappingExposure:1}} fallback={<p>Nếu cảnh 3D không hiển thị, mở Tra cứu để xem hồ sơ.</p>}>
  <color attach="background" args={['#e2d7c1']}/><ambientLight intensity={.3}/><hemisphereLight args={['#fff5e8','#655548',.8]}/><directionalLight position={[2,3.95,3]} intensity={1.6} color="#fff3df" castShadow={!baked} shadow-mapSize={[1024,1024]} shadow-camera-left={-16} shadow-camera-right={16} shadow-camera-top={13} shadow-camera-bottom={-13} shadow-camera-far={35} shadow-bias={-.0001} shadow-normalBias={.025}/>
  <pointLight position={[0,3.6,-6.3]} intensity={16} distance={9} color="#ffe8bc" decay={2}/>
  <pointLight position={[-8,3.7,0]} intensity={12} distance={12} color="#fff0d4" decay={2}/><pointLight position={[8,3.7,0]} intensity={12} distance={12} color="#fff0d4" decay={2}/>

  <GalleryEnvironment/>{baked&&<Suspense fallback={null}><BakedHall/></Suspense>}<StaticInstancer><Architecture baked={baked}/><MonumentReservation baked={baked}/><MemoryCabinets baked={baked}/></StaticInstancer><PrincipalLamps/><Frames slots={p.layout.slots}/><ZoneNames layout={p.layout}/>
  {p.layout.slots.map((slot:any)=><Photo key={slot.person.id} slot={slot} onSelect={id=>{if(!p.moving&&!p.paused)p.onSelect(id);}}/>)}
  <StopMarkers stops={p.layout.stops} onGo={p.onGo} disabled={p.moving||p.paused||Boolean(p.controlsLocked)}/>
  {p.emptySlots&&p.onEmpty&&<EmptySlots slots={p.emptySlots} onEmpty={p.onEmpty} disabled={p.moving||p.paused}/>}
  {p.route&&<RouteDots route={p.route}/>}
  <HallController plan={p.plan} command={p.command} atDoor={Boolean(p.atDoor)} intro={Boolean(p.intro)} paused={p.paused} effects={p.effects} input={p.input} loadedRooms={[0]} onArrive={p.onArrive} onMotion={p.onMotion} onRegion={()=>{}} controlsLocked={p.controlsLocked} pose={p.pose} route={p.route}/>
  <Ready onReady={p.onReady} onLost={p.onLost}/>
  {statsEnabled()&&<SceneStats/>}
  {p.quality&&<PerfProbe {...p.quality}/>}
  {/* 15/11 Bước 1: real-room reflection probes + post-processing (quality-gated) */}
  {baked&&<RoomProbes level={p.quality?.level||'high'}/>}
  {baked&&p.quality&&p.quality.level!=='low'&&<PostFX level={p.quality.level}/>}
  <EntranceDoors door={p.door}/>
  {baked&&<FoyerView/>}
 </Canvas>;
}



