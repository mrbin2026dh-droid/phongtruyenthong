import {useMemo} from 'react';
import type {MutableRefObject} from 'react';
import {useFrame} from '@react-three/fiber';
import {BoxGeometry,Group,MeshStandardMaterial} from 'three';
import {doorAngle,doorStep} from './doorMotion.mjs';

/** Door state shared with HallTour: target 0 = closed, 1 = open; value animates towards target. */
export type DoorState={target:number;value:number};

const cube=new BoxGeometry(1,1,1);
const wood=new MeshStandardMaterial({color:'#4f362a',roughness:.55,metalness:0});
const teal=new MeshStandardMaterial({color:'#193c44',roughness:.75});
const brass=new MeshStandardMaterial({color:'#c9a560',roughness:.32,metalness:.75});

function Leaf({side}:{side:number}){
 // Hinge at x = ±2.02: each leaf is 2.02 m so the two leaves meet exactly at the centre (no gap).
 const c=-side*1.01;
 const part=(p:[number,number,number],s:[number,number,number],m:MeshStandardMaterial)=><mesh position={p} scale={s} geometry={cube} material={m} castShadow={false}/>;
 return <>
  {/* 3.34 m tall: reaches the lintel (3.36 m) so no gap shows above the closed doors. */}
  {part([c,1.67,0],[2.02,3.34,.08],wood)}
  {[-1,1].map(f=><group key={f}>
   {part([c,1.86,f*.047],[1.62,2.5,.016],teal)}
   {part([c,1.86+1.25,f*.057],[1.66,.018,.01],brass)}{part([c,1.86-1.25,f*.057],[1.66,.018,.01],brass)}
   {part([c-.83,1.86,f*.057],[.018,2.52,.01],brass)}{part([c+.83,1.86,f*.057],[.018,2.52,.01],brass)}
   {part([-side*1.88,1.45,f*.09],[.03,.42,.05],brass)}
  </group>)}
 </>;
}

/** Two-leaf entrance door that opens outwards (towards the corridor) on the first entry.
 * Doors are not part of the baked shell, so they can move. */
export default function EntranceDoors({door}:{door?:MutableRefObject<DoorState>}){
 const leaves=useMemo(()=>({left:new Group(),right:new Group()}),[]);
 useFrame(({invalidate},dt)=>{
  const d=door?.current;const value=d?d.value:1;
  if(d&&d.value!==d.target){d.value=doorStep(d.value,d.target,dt);invalidate();}
  leaves.left.rotation.y=doorAngle(-1,value);leaves.right.rotation.y=doorAngle(1,value);
 });
 return <>{[[-1,leaves.left],[1,leaves.right]].map(([side,g])=><primitive key={String(side)} object={g as Group} position={[(side as number)*2.02,0,8.15]}><Leaf side={side as number}/></primitive>)}</>;
}
