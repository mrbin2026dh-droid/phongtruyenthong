import {useEffect,useMemo} from 'react';
import {useGLTF} from '@react-three/drei';
import {markAssetReady} from './sceneAssets';
import {useFrame} from '@react-three/fiber';
import {Mesh,MeshStandardMaterial} from 'three';
/** Seated study repaired in Blender from the user's package; not an authenticated scan.
 * v3 = fixed-v2 compressed (EXT_meshopt_compression + KHR_mesh_quantization + EXT_texture_webp),
 * same 11 meshes/triangles/bounds. Master: 08-MO-HINH-3D/chu-van-an/web-fix-2026-10-30/. */
export default function ChuVanAnStatue(){
 const gltf=useGLTF(import.meta.env.BASE_URL+'models/chu-van-an-seated-web-v3.glb',false,true);
 const {model,materials}=useMemo(()=>{
  const model=gltf.scene.clone(true),materials=new Map<MeshStandardMaterial,MeshStandardMaterial>();
  model.traverse(o=>{if(o instanceof Mesh){
   o.castShadow=true;
   // The hall's 32 m / 1024 shadow map cannot resolve the statue's fine surface.
   // Keep its cast shadow on the pedestal/floor, avoid coarse self-shadow acne.
   o.receiveShadow=false;
   const copy=(m:MeshStandardMaterial)=>{if(!materials.has(m)){const clone=m.clone();clone.envMapIntensity=.85;materials.set(m,clone);}return materials.get(m)!;};
   o.material=Array.isArray(o.material)?o.material.map(copy):copy(o.material);
  }});
  return {model,materials:[...materials.values()]};
 },[gltf.scene]);
 useFrame(({scene})=>{
  // Explicit per-material environment: retain the room's reflection layout while
  // matching bronze studio brightness without increasing every wall/frame light.
  for(const material of materials)if(material.envMap!==scene.environment){material.envMap=scene.environment;material.needsUpdate=true;}
 });
 useEffect(()=>{markAssetReady('statue');return()=>{materials.forEach(m=>m.dispose());};},[materials]);
 // Source is 1.2 m tall, +Y up, +Z facing the entrance. Preserve the existing
 // 1.12 m display height and base footprint so the collision envelope stays valid.
 return <primitive object={model} position={[0,.89,0]} scale={1.12/1.2}/>;
}


