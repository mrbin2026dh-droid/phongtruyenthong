import {useRef,useState} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import {Vector3,Shape,DoubleSide,Mesh,Raycaster} from 'three';
import {floorGuideCandidates} from './floorGuides.mjs';
import type {Plan} from './GuidedScene';
const chevron=new Shape();chevron.moveTo(-.12,-.025);chevron.lineTo(0,.10);chevron.lineTo(.12,-.025);chevron.lineTo(.085,-.06);chevron.lineTo(0,.025);chevron.lineTo(-.085,-.06);chevron.closePath();
function Stop({at,onGo}:{at:number[];onGo:()=>void}){
 const [hover,setHover]=useState(false);
 const {scene,camera}=useThree(),ray=useRef(new Raycaster());
 const arrow=useRef<Mesh>(null);
 useFrame(({camera})=>{if(arrow.current)arrow.current.rotation.z=-Math.atan2(at[0]-camera.position.x,-(at[2]-camera.position.z));});
 function navigate(){
  const target=new Vector3(at[0],.05,at[2]),direction=target.clone().sub(camera.position),distance=direction.length();
  ray.current.set(camera.position,direction.normalize());ray.current.near=.05;ray.current.far=Math.max(.05,distance-.08);
  const blocked=ray.current.intersectObjects(scene.children,true).some(hit=>{
   let parent=hit.object;
   while(parent){if(!parent.visible||parent.userData.floorGuide)return false;parent=parent.parent!;}
   const material=(hit.object as Mesh).material;
   if(material&&!Array.isArray(material)&&material.transparent&&material.opacity<.05)return false;
   return true;
  });
  if(!blocked)onGo();
 }
 return <group userData={{floorGuide:true}} position={[at[0],.047,at[2]]} rotation={[-Math.PI/2,0,0]} onClick={e=>{e.stopPropagation();if(e.delta<6)navigate();}} onPointerOver={e=>{e.stopPropagation();setHover(true);}} onPointerOut={()=>setHover(false)}>
  {/* Generous invisible hit area; discreet visible floor mark, depth tested. */}
  <mesh><circleGeometry args={[.48,32]}/><meshBasicMaterial transparent opacity={0} depthWrite={false} side={DoubleSide}/></mesh>
  <mesh><circleGeometry args={[hover ? .31:.26,40]}/><meshBasicMaterial color="#173b48" transparent opacity={hover ? .5:.25} depthWrite={false} side={DoubleSide}/></mesh>
  <mesh position={[0,0,.001]}><ringGeometry args={[hover ? .29:.24,hover ? .32:.265,48]}/><meshBasicMaterial color="#ffffff" transparent opacity={hover ? .95:.7} depthWrite={false} side={DoubleSide}/></mesh>
  <mesh ref={arrow} position={[0,0,.002]}><shapeGeometry args={[chevron]}/><meshBasicMaterial color="#ffffff" transparent opacity={hover?1:.85} depthWrite={false} side={DoubleSide}/></mesh>
 </group>;
}
export default function FloorGuidance({plan,loadedRooms,disabled,onGo}:{plan:Plan;loadedRooms:number[];disabled:boolean;onGo:(id:string)=>void}){
 const [stops,setStops]=useState<Array<{id:string;eye:number[]}>>([]),last=useRef(''),forward=useRef(new Vector3());
 useFrame(({camera},dt)=>{
  camera.getWorldDirection(forward.current);
  const next=disabled?[]:floorGuideCandidates(plan,camera.position.toArray(),forward.current.toArray(),loadedRooms);
  const key=next.map(n=>n.id).join('|');
  if(key!==last.current){last.current=key;setStops(next);}
 });
 return <group>{!disabled&&stops.map(stop=><Stop key={stop.id} at={stop.eye} onGo={()=>onGo(stop.id)}/>)}</group>;
}
