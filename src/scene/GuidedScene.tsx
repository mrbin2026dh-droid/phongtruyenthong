import {Suspense,useEffect,useMemo,useState} from 'react';
import type {MutableRefObject} from 'react';
import VisitorController from './VisitorController';
import type {NavigationInput} from './VisitorController';
import {Canvas,useFrame,useThree} from '@react-three/fiber';
import MuseumSign from './MuseumSign';
import FloorGuidance from './FloorGuidance';
import {Vector3,Quaternion,Matrix4,PerspectiveCamera,ACESFilmicToneMapping} from 'three';
import {Room,Portrait,GalleryEnvironment} from './BlenderMuseum';
import {roomPlacement,localToWorld,findPath,roomForNode} from './tourPlan.mjs';
import type {Person} from '../data/repository';
import {GROUPS} from '../data/catalog.mjs';
export type GalleryRoom={id:string;groupId:string;groupName:string;title:string;people:Person[]};
export type Plan=ReturnType<typeof import('./tourPlan.mjs').createPlan>;
export type TourCommand={serial:number;from:string;to:string};
type Props={plan:Plan;command:TourCommand;rooms:GalleryRoom[];current:string;moving:boolean;effects:boolean;paused:boolean;onArrive:(id:string)=>void;onMotion:(value:boolean)=>void;onSelect:(id:string)=>void;onGo:(id:string)=>void;onModule:(id:number)=>void;onReady:()=>void;onLost:()=>void;input:MutableRefObject<NavigationInput>;onRegion:(id:string)=>void};
function Cuboid({p,s,color='#4e2e1a'}:{p:[number,number,number];s:[number,number,number];color?:string}){
 return <mesh position={p}><boxGeometry args={s}/><meshStandardMaterial color={color} roughness={.65}/></mesh>;
}
function Lobby({rooms,onModule,onReady,onGo,moving}:{rooms:GalleryRoom[];onModule:(id:number)=>void;onReady:()=>void;onGo:(id:string)=>void;moving:boolean}){
 const empty=useMemo<Person[]>(()=>[],[]);
 return <group><Room people={empty} onReady={onReady}/>
  {GROUPS.map((g,i)=>{const x=(i-1)*4.8,index=rooms.findIndex(r=>r.groupId===g.id);return <group key={g.id} position={[x,2.18,-5.28]}><MuseumSign title={g.name} subtitle={g.id==='management'?'Dấu ấn lãnh đạo':g.id==='teacher'?'Các thế hệ nối tiếp':'Đồng hành và cống hiến'} action={()=>{if(!moving&&index>=0)onGo('room-'+index);}}/></group>;})}
  {[-1,1].map((side,i)=><group key={side} position={[side*8.65,2.05,1.8]} rotation={[0,-side*Math.PI/2,0]}><MuseumSign title={i===0?'Tôn vinh giáo viên':'Tôn vinh học sinh'} subtitle="Đang xây dựng" width={2.6} height={.82} action={()=>{if(!moving)onModule(i+2);}}/></group>)}
 </group>;
}
function Corridor({count,onGo,moving,visibleRooms}:{count:number;onGo:(id:string)=>void;moving:boolean;visibleRooms:number[]}){
 const rows=Math.ceil(count/2),end=18+(rows-1)*22+10,len=end-6;
 const [nearRow,setNearRow]=useState(0);
 useFrame(({camera})=>{const row=Math.max(0,Math.floor((camera.position.z-7)/22));if(row!==nearRow)setNearRow(row);});
 const nearRows=Array.from({length:rows},(_,i)=>i).filter(row=>Math.abs(row-nearRow)<=2);
 return <group>
  <Cuboid p={[0,-.10,(end+6)/2]} s={[4,.20,len]} color="#8e7b5b"/>
  <Cuboid p={[0,4.1,(end+6)/2]} s={[4,.2,len]} color="#eee0c5"/>
  <Cuboid p={[0,.005,(end+6)/2]} s={[1.6,.015,len]} color="#173e43"/>
  {/* Short wall pieces leave a real opening at each crossing. */}
  {nearRows.map(row=>{const z=18+row*22,start=row===0?6:z-20.5,l=z-1.5-start;return <group key={row}>
   {[-1,1].map(side=><group key={side}><Cuboid p={[side*2.1,2,(start+z-1.5)/2]} s={[.2,4,l]} color="#b29b75"/><Cuboid p={[side*1.97,3.65,(start+z-1.5)/2]} s={[.08,.16,l]} color="#a47d3e"/></group>)}
   <Cuboid p={[0,3.88,z-3]} s={[1.5,.06,.35]} color="#ecd4a4"/>
   <pointLight position={[0,3.5,z-3]} intensity={28} color="#ffe3b3" distance={20} decay={2}/>
  </group>;})}
  {Array.from({length:count},(_,i)=>i).filter(i=>Math.abs(Math.floor(i/2)-nearRow)<=2).map(i=>{const r=roomPlacement(i);return <group key={i}>
   <Cuboid p={[r.side*5.5,-.1,r.z]} s={[7,.2,3]} color="#8e7b5b"/><Cuboid p={[r.side*5.5,4.1,r.z]} s={[7,.2,3]} color="#e7d7b9"/>
   {!visibleRooms.includes(i)&&<Cuboid p={[r.side*9.1,1.4,r.z]} s={[.14,2.8,2.8]} color="#64452a"/>}
   {[-1,1].map(s=><Cuboid key={s} p={[r.side*5.5,2,r.z+s*1.6]} s={[7,4,.2]} color="#ad956f"/>)}
  </group>;})}
  <Cuboid p={[0,2,end+.1]} s={[4.2,4,.2]} color="#b29b75"/>
 </group>;
}
function Guard({onLost}:{onLost:()=>void}){const gl=useThree(s=>s.gl);useEffect(()=>{const c=gl.domElement;c.setAttribute('aria-label','Bảo tàng 3D: sảnh, hành lang và các phòng có cửa nối thông');const fn=()=>onLost();c.addEventListener('webglcontextlost',fn);return ()=>c.removeEventListener('webglcontextlost',fn);},[gl,onLost]);return null;}
export default function GuidedScene(props:Props){
 const {plan,command,rooms,current,moving,effects,paused,onArrive,onMotion,onSelect,onGo,onModule,onReady,onLost,input,onRegion}=props;
 const currentRoom=roomForNode(current),targetRoom=roomForNode(command.to);
 const [entrance]=useState(()=>plan.nodes[command.from].eye as [number,number,number]);
 const visibleRooms=[...new Set([currentRoom,targetRoom])].filter(i=>i>=0&&i<plan.count);
 return <Canvas frameloop="demand" dpr={[1,1.5]} camera={{position:entrance,fov:62,near:.05,far:120}} gl={{antialias:true,powerPreference:'low-power',toneMapping:ACESFilmicToneMapping,toneMappingExposure:.90}}>
  <color attach="background" args={['#534839']}/><ambientLight intensity={.25}/><hemisphereLight args={['#fff0dd','#4a3827',.65]}/><directionalLight position={[0,4,3]} intensity={.7} color="#ffe3bf"/>
  <GalleryEnvironment/>
  <Suspense fallback={null}>
   <Lobby rooms={rooms} onModule={onModule} onReady={onReady} onGo={onGo} moving={moving}/>
   <Corridor count={plan.count} moving={moving} onGo={onGo} visibleRooms={visibleRooms}/>
   {visibleRooms.filter(i=>rooms[i]).map(i=>{const r=roomPlacement(i),slice=rooms[i].people;return <group key={i} position={[r.x,0,r.z]} rotation={[0,r.yaw,0]}>
    <Room people={slice} onReady={onReady}/>
    {slice.map((p,index)=><Portrait key={p.id} person={p} index={index} onSelect={id=>{if(!moving)onSelect(id);}}/>)}
   </group>;})}
  </Suspense>
  <FloorGuidance plan={plan} loadedRooms={visibleRooms} disabled={moving||paused} onGo={onGo}/>
  <VisitorController plan={plan} command={command} paused={paused} effects={effects} onArrive={onArrive} onMotion={onMotion} input={input} loadedRooms={visibleRooms} onRegion={onRegion}/><Guard onLost={onLost}/>
 </Canvas>;
}

