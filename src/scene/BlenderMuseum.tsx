import {Suspense,useEffect,useMemo,useRef,useState} from 'react';
import {Canvas,useFrame,useThree} from '@react-three/fiber';
import {OrbitControls,useGLTF,ContactShadows,MeshReflectorMaterial} from '@react-three/drei';
import type {OrbitControls as OrbitType} from 'three-stdlib';
import {CanvasTexture,SRGBColorSpace,Vector3,PerspectiveCamera,Mesh,PointLight,ACESFilmicToneMapping,PMREMGenerator,MeshStandardMaterial} from 'three';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {portraitPath,type Person} from '../data/repository';
import {workHistoryText,displayName} from '../data/catalog.mjs';
import {PHONE} from './device';
import GalleryHeader from './GalleryHeader';
export type TourStop='lobby'|'gallery'|'left'|'right';
const url=import.meta.env.BASE_URL+'models/museum-signage-v2.glb';
export function Texture({person,label=false}:{person:Person;label?:boolean}){
 const invalidate=useThree(s=>s.invalidate);
 const disposal=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
 const map=useMemo(()=>{const c=document.createElement('canvas');const k=label&&PHONE?.5:1;c.width=(label?768:384)*k;c.height=(label?160:512)*k;const ctx=c.getContext('2d')!;ctx.scale(k,k);   // 18/11: phone labels at half size (memory)
 ctx.fillStyle=label?'#182c42':'#eee6d6';ctx.fillRect(0,0,c.width,c.height);ctx.textAlign='center';ctx.fillStyle=label?'#ffe3a2':'#60778a';ctx.font=label?'700 38px "Noto Sans"':'700 36px "Noto Sans"';ctx.fillText(label?displayName(person):person.id,c.width/2,label?63:260,c.width-24);if(label){ctx.font='400 28px "Noto Sans"';ctx.fillText(person.id+' · '+workHistoryText(person),c.width/2,118,c.width-20);}const t=new CanvasTexture(c);t.colorSpace=SRGBColorSpace;return t;},[person,label]);
 useEffect(()=>{if(label)return;const c=map.image as HTMLCanvasElement,ctx=c.getContext('2d')!;let active=true,fallback=false;const img=new Image();img.onload=()=>{if(!active)return;ctx.fillStyle='#eee6d6';ctx.fillRect(0,0,384,512);const s=Math.min(384/img.width,512/img.height);ctx.drawImage(img,(384-img.width*s)/2,(512-img.height*s)/2,img.width*s,img.height*s);map.needsUpdate=true;invalidate();};img.onerror=()=>{if(!fallback){fallback=true;img.src=import.meta.env.BASE_URL+'portraits/default.jpg';}};img.src=portraitPath(person);return ()=>{active=false;img.onload=null;img.onerror=null;};},[map,person,label,invalidate]);
 useEffect(()=>{clearTimeout(disposal.current);return ()=>{disposal.current=setTimeout(()=>map.dispose(),0);};},[map]);
 return <meshBasicMaterial map={map} toneMapped={false}/>;
}
export function Portrait({person,index,onSelect}:{person:Person;index:number;onSelect:(id:string)=>void}){
 const [hover,setHover]=useState(false);const x=(index%6-2.5)*2.7,y=index<6?2.66:1.12;
 useEffect(()=>()=>{document.body.style.cursor='';},[]);
 return <group position={[x,y,-5.535]} onClick={e=>{e.stopPropagation();if(e.delta<6)onSelect(person.id);}} onPointerOver={e=>{e.stopPropagation();setHover(true);document.body.style.cursor='pointer';}} onPointerOut={()=>{setHover(false);document.body.style.cursor='';}}>
 <mesh><planeGeometry args={[.78,1.04]}/><Texture person={person}/></mesh>
 <mesh position={[0,-.84,.18]}><planeGeometry args={[1.13,.215]}/><Texture person={person} label/></mesh>
 {hover&&<mesh position={[0,0,.008]}><planeGeometry args={[.95,1.27]}/><meshBasicMaterial color="#ffcc66" transparent opacity={.20} depthWrite={false}/></mesh>}
 </group>;
}
export function Room({people,onReady}:{people:Person[];onReady:()=>void}){
 const gltf=useGLTF(url);
 const room=useMemo(()=>{const clone=gltf.scene.clone(true);clone.traverse(o=>{
   if(/^(Portrait_|Mat_|Name_|ID_)/.test(o.name))o.visible=false;
   if(o.name.startsWith('Frame_GV')){const slot=Number(o.name.slice(-3))-1;o.visible=slot<people.length;}
   if(o instanceof PointLight){o.intensity*=.006;o.castShadow=false;}
   if(o instanceof Mesh){o.castShadow=false;o.receiveShadow=true;}
 });return clone;},[gltf.scene,people.length]);
 useEffect(()=>{onReady();},[room]);
 return <><primitive object={room} dispose={null}/><GalleryHeader/></>;
}
export function GalleryEnvironment(){
 const {gl,scene,invalidate}=useThree();
 useEffect(()=>{const generator=new PMREMGenerator(gl);const environment=new RoomEnvironment();const target=generator.fromScene(environment,.04);const previous=scene.environment;scene.environment=target.texture;scene.environmentIntensity=.38;invalidate();return ()=>{scene.environment=previous;target.dispose();environment.dispose();generator.dispose();};},[gl,scene,invalidate]);
 return null;
}
function GalleryFloor({effects}:{effects:boolean}){
 const size=useThree(s=>s.size);const gltf=useGLTF(url);
 const floor=useMemo(()=>{let material:MeshStandardMaterial|undefined;gltf.scene.traverse(o=>{if(o instanceof Mesh){const mats=Array.isArray(o.material)?o.material:[o.material];material??=mats.find(m=>m.name==='Cream stone floor') as MeshStandardMaterial|undefined;}});return material;},[gltf.scene]);
 if(!effects||size.width<700)return null;
 return <mesh rotation={[-Math.PI/2,0,0]} position={[0,.0025,0]}><planeGeometry args={[18,12]}/><MeshReflectorMaterial map={floor?.map} color="#bcb19a" resolution={256} blur={[140,70]} mixBlur={1} mixStrength={.5} roughness={.4} metalness={.12} mirror={.22} depthScale={0} minDepthThreshold={.9} maxDepthThreshold={1}/></mesh>;
}
const positions:Record<TourStop,{eye:[number,number,number];target:[number,number,number]}>={
 lobby:{eye:[0,2.25,5.4],target:[0,1.9,-5.7]},
 gallery:{eye:[0,2.12,2.5],target:[0,1.92,-5.7]},
 left:{eye:[-5.3,2.05,-.25],target:[-5.3,1.9,-5.6]},
 right:{eye:[5.3,2.05,-.25],target:[5.3,1.9,-5.6]}
};
function Tour({stop,revision,effects}:{stop:TourStop;revision:number;effects:boolean}){
 const controls=useRef<OrbitType>(null);const {camera,size,invalidate}=useThree();const transition=useRef(false);const desired=useRef(positions[stop]);
 useEffect(()=>{if(camera instanceof PerspectiveCamera){camera.fov=size.width/size.height<1.1?101:70;camera.updateProjectionMatrix();invalidate();}},[size,camera,invalidate]);
 useEffect(()=>{desired.current=positions[stop];if(effects&&!matchMedia('(prefers-reduced-motion: reduce)').matches){transition.current=true;invalidate();}else{camera.position.set(...desired.current.eye);controls.current?.target.set(...desired.current.target);controls.current?.update();invalidate();}},[stop,revision,effects,camera,invalidate]);
 useFrame((_,dt)=>{if(!transition.current||!controls.current)return;const s=desired.current;const eye=new Vector3(...s.eye),target=new Vector3(...s.target);const t=1-Math.exp(-dt*5);camera.position.lerp(eye,t);controls.current.target.lerp(target,t);controls.current.update();if(camera.position.distanceTo(eye)<.012){transition.current=false;camera.position.copy(eye);controls.current.target.copy(target);controls.current.update();}invalidate();});
 return <OrbitControls ref={controls} makeDefault enablePan={false} minDistance={2.5} maxDistance={11.5} minPolarAngle={1.43} maxPolarAngle={1.72} minAzimuthAngle={-.50} maxAzimuthAngle={.50} enableDamping dampingFactor={.10} onStart={()=>{transition.current=false;}}/>;
}
function Guard({count,onLost}:{count:number;onLost:()=>void}){const gl=useThree(s=>s.gl);useEffect(()=>{const c=gl.domElement;c.setAttribute('aria-label','Phòng Blender 18 × 12 × 4 mét, '+count+' ảnh giáo viên tương tác');const lost=()=>onLost();c.addEventListener('webglcontextlost',lost);return ()=>c.removeEventListener('webglcontextlost',lost);},[gl,count,onLost]);return null;}
export default function MuseumScene({people,onSelect,stop,revision,onReady,onLost,effects=true}:{people:Person[];onSelect:(id:string)=>void;onModule:(n:number)=>void;stop:TourStop;revision:number;title:string;onReady:()=>void;onLost:()=>void;effects?:boolean}){
  return <Canvas frameloop="demand" dpr={[1,1.5]} camera={{position:[0,2.25,5.4],fov:70,near:.05,far:50}} gl={{antialias:true,powerPreference:'low-power',toneMapping:ACESFilmicToneMapping,toneMappingExposure:.95}} fallback={<p>Thiết bị không hỗ trợ WebGL. Chọn Danh sách 2D.</p>}>
 <color attach="background" args={['#b2a184']}/><ambientLight intensity={.28}/><hemisphereLight args={['#ffefd7','#534334',.65]}/>
 <directionalLight position={[0,3.4,3]} color="#ffe3b5" intensity={.8}/>
 <GalleryEnvironment/>
 <Suspense fallback={null}><Room people={people} onReady={onReady}/><GalleryFloor effects={effects}/>{people.map((person,index)=><Portrait key={person.id} person={person} index={index} onSelect={onSelect}/>)}</Suspense>
 <Tour stop={stop} revision={revision} effects={effects}/><Guard count={people.length} onLost={onLost}/>
 </Canvas>;
}

