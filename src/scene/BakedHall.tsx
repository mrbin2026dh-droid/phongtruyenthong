import {useEffect,useMemo} from 'react';
import {useGLTF} from '@react-three/drei';
import {useThree} from '@react-three/fiber';
import {Mesh,MeshBasicMaterial,MeshStandardMaterial,SRGBColorSpace,Texture} from 'three';

const param=()=>{try{return new URLSearchParams(location.search).get('scene');}catch{return null;}};

/** GĐ3 (14/11, user-approved look): the Cycles-baked room is the default.
 * ?scene=classic forces the older hand-built boxes; ?scene=mobile forces the light variant. */
export function bakedEnabled(){return param()!=='classic';}

/** Phones/tablets or low-memory devices get the 2048 px variant (floor 4096 → 2048, ≈ 70 MB less GPU memory). */
export function bakedVariant(){
 const p=param();if(p==='mobile')return 'hall-baked-mobile.glb';if(p==='baked')return 'hall-baked.glb';
 try{
  const nav=navigator as Navigator&{deviceMemory?:number};
  const small=Math.min(screen.width,screen.height)<900&&matchMedia('(pointer: coarse)').matches;
  if(small||(nav.deviceMemory!==undefined&&nav.deviceMemory<=4))return 'hall-baked-mobile.glb';
 }catch{/* default to full quality */}
 return 'hall-baked.glb';
}

/** Four meshes (floor / walls / ceiling / details), each with one tone-mapped lightmap that already
 * contains material colour + light. Shown unlit, so it costs 4 draw calls and no real-time lights. */
export default function BakedHall(){
 const file=useMemo(bakedVariant,[]);
 const gltf=useGLTF(import.meta.env.BASE_URL+'models/'+file,false,true);
 const gl=useThree(s=>s.gl),invalidate=useThree(s=>s.invalidate);
 const {model,materials}=useMemo(()=>{
  const model=gltf.scene.clone(true),materials:MeshBasicMaterial[]=[];
  model.traverse(o=>{if(!(o instanceof Mesh))return;
   const map=(o.material as MeshStandardMaterial).map as Texture|null;
   if(map){map.colorSpace=SRGBColorSpace;map.anisotropy=Math.min(8,gl.capabilities.getMaxAnisotropy());map.needsUpdate=true;}
   // The bake is already AgX tone-mapped in Blender: do not tone-map it again.
   const m=new MeshBasicMaterial({map,toneMapped:false});materials.push(m);o.material=m;
   o.castShadow=false;o.receiveShadow=false;o.userData.bakedShell=true;
  });
  return {model,materials};
 },[gltf.scene,gl]);
 useEffect(()=>{invalidate();return()=>materials.forEach(m=>m.dispose());},[materials,invalidate]);
 return <primitive object={model}/>;
}
