import {useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import type {MutableRefObject} from 'react';
import {useFrame} from '@react-three/fiber';
import {Billboard} from '@react-three/drei';
import {CanvasTexture,InstancedMesh,MeshBasicMaterial,Object3D,Shape,ShapeGeometry,SRGBColorSpace} from 'three';
import {samplePath} from './hallMotion.mjs';
import {stopLabel,routeDotDistances,arrowYaw} from './wayfindingMath.mjs';
export {stopLabel};
import type {RouteState} from './HallController';

const GOLD='#d4b06a';

/** 17/11 (người dùng: “icon nhỏ, đẹp mắt”): a slim label — smaller text, thin gold rule, more transparent. */
function labelTexture(text:string){
 const c=document.createElement('canvas');c.width=512;c.height=80;const g=c.getContext('2d')!;
 g.font='600 30px "Noto Sans"';const w=Math.min(500,g.measureText(text).width+44);
 g.fillStyle='rgba(14,38,44,.72)';g.beginPath();g.roundRect((512-w)/2,14,w,52,26);g.fill();
 g.strokeStyle='rgba(212,176,106,.8)';g.lineWidth=2;g.stroke();
 g.fillStyle='#fff3d6';g.textAlign='center';g.textBaseline='middle';g.fillText(text,256,41,480);
 const t=new CanvasTexture(c);t.colorSpace=SRGBColorSpace;t.anisotropy=4;return t;
}

function StopMarker({stop,onGo}:{stop:any;onGo:(id:string)=>void}){
 const [hover,setHover]=useState(false);
 const label=useMemo(()=>labelTexture(stopLabel(stop)),[stop]);
 useEffect(()=>()=>{label.dispose();document.body.style.cursor='';},[label]);
 const s=hover?1.15:1;
 return <group position={[stop.eye[0],0,stop.eye[2]]}
  onClick={e=>{e.stopPropagation();if(e.delta<6)onGo(stop.id);}}
  onPointerOver={e=>{e.stopPropagation();setHover(true);document.body.style.cursor='pointer';}}
  onPointerOut={()=>{setHover(false);document.body.style.cursor='';}}>
  {/* 17/11: smaller, finer floor mark — a thin gold ring with a soft halo and a small dot (was a 0.72 m disc) */}
  <group rotation={[-Math.PI/2,0,0]} position={[0,.012,0]} scale={[s,s,s]}>
   <mesh><circleGeometry args={[.21,40]}/><meshBasicMaterial color="#0f2f36" transparent opacity={hover?.3:.16} depthWrite={false} toneMapped={false}/></mesh>
   <mesh position={[0,0,.001]}><ringGeometry args={[.15,.168,56]}/><meshBasicMaterial color={GOLD} transparent opacity={.9} depthWrite={false} toneMapped={false}/></mesh>
   <mesh position={[0,0,.002]}><circleGeometry args={[.038,24]}/><meshBasicMaterial color={GOLD} transparent opacity={.95} depthWrite={false} toneMapped={false}/></mesh>
  </group>
  <Billboard position={[0,.3,0]}>
   <mesh scale={hover?1.08:1}><planeGeometry args={[.74,.116]}/><meshBasicMaterial map={label} transparent depthWrite={false} toneMapped={false}/></mesh>
  </Billboard>
 </group>;
}

/** A: visible floor stops with zone names; 3 nearest within reach (17/11: was 5), hidden while travelling/walking and after a few idle seconds. */
export function StopMarkers({stops,onGo,disabled}:{stops:any[];onGo:(id:string)=>void;disabled:boolean}){
 const [visible,setVisible]=useState<string[]>([]);
 const candidates=useMemo(()=>stops.filter(s=>s.id!=='finish'),[stops]);
 useFrame(({camera})=>{
  const next=candidates.map(s=>({id:s.id,d:Math.hypot(camera.position.x-s.eye[0],camera.position.z-s.eye[2])}))
   .filter(v=>v.d>1.2&&v.d<12).sort((a,b)=>a.d-b.d).slice(0,3).map(v=>v.id).sort();
  if(next.join()!==visible.join())setVisible(next);
 });
 if(disabled)return null;
 return <>{candidates.filter(s=>visible.includes(s.id)).map(s=><StopMarker key={s.id} stop={s} onGo={onGo}/>)}</>;
}

const MAX_ARROWS=80,SPACING=.7;
/** Soft chevron “›” lying flat, pointing along local −Z (the walking direction after rotation). */
const arrowGeometry=(()=>{const sh=new Shape(),w=.17,l=.13,t=.05;
 sh.moveTo(-w,-l/2);sh.lineTo(0,l/2);sh.lineTo(w,-l/2);sh.lineTo(w-t*1.3,-l/2);sh.lineTo(0,l/2-t*1.9);sh.lineTo(-w+t*1.3,-l/2);sh.closePath();
 return new ShapeGeometry(sh);})();
/** B (14/11, revised 15/11): faint chevrons on the floor along the route, pointing the way; the ones
 * behind the visitor disappear and new ones fade in ahead. Replaces the dotted “footprint” trail. */
export function RouteDots({route}:{route:MutableRefObject<RouteState>}){
 const mesh=useRef<InstancedMesh>(null),material=useMemo(()=>new MeshBasicMaterial({color:'#d9a94f',transparent:true,opacity:.6,depthWrite:false,toneMapped:false}),[]);
 const built=useRef({serial:-1,distances:[] as number[]}),tmp=useMemo(()=>{const o=new Object3D();o.rotation.order='YXZ';return o;},[]);
 useEffect(()=>()=>material.dispose(),[material]);
 useLayoutEffect(()=>{if(mesh.current){mesh.current.count=0;mesh.current.frustumCulled=false;}},[]);
 useFrame(()=>{
  const m=mesh.current,r=route.current;if(!m)return;
  if(!r){if(m.count){m.count=0;built.current.serial=-1;}return;}
  if(built.current.serial!==r.serial)built.current={serial:r.serial,distances:routeDotDistances(r.total,SPACING,MAX_ARROWS)};
  const path={points:r.points,distances:r.distances,total:r.total};let n=0;
  for(const d of built.current.distances){
   if(d<r.travelled+.8)continue;
   const p=samplePath(path,d),q=samplePath(path,Math.min(r.total,d+.12));
   const dx=q[0]-p[0],dz=q[2]-p[2];if(Math.hypot(dx,dz)<1e-4)continue;
   tmp.position.set(p[0],.014,p[2]);tmp.rotation.set(-Math.PI/2,arrowYaw(dx,dz),0);
   const fade=Math.min(1,(d-r.travelled-.8)/.9);tmp.scale.setScalar(.75+.25*fade);tmp.updateMatrix();m.setMatrixAt(n++,tmp.matrix);
  }
  m.count=n;m.instanceMatrix.needsUpdate=true;
 });
 return <instancedMesh ref={mesh} args={[arrowGeometry,material,MAX_ARROWS]} renderOrder={1}/>;
}
