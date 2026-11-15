import {useEffect,useMemo,useState} from 'react';
import {useThree} from '@react-three/fiber';
import {DoubleSide,MeshBasicMaterial,MirroredRepeatWrapping,SRGBColorSpace,TextureLoader,type Texture} from 'three';
import {imageStarted} from './sceneAssets';
import {PROBE_GLSL,PROBE_UNIFORMS} from './probeShared.mjs';

/** Glass that reflects the foyer (box-projected probe + fresnel): faint face-on, clearer at grazing angles. */
function glassMaterial(){
 const m=new MeshBasicMaterial({color:'#dfe9ec',transparent:true,opacity:.08,depthWrite:false,side:DoubleSide,toneMapped:false});
 m.onBeforeCompile=sh=>{
  Object.assign(sh.uniforms,PROBE_UNIFORMS);
  sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vGWorld;').replace('#include <project_vertex>','#include <project_vertex>\nvGWorld=(modelMatrix*vec4(transformed,1.0)).xyz;');
  sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vGWorld;'+PROBE_GLSL)
   .replace('#include <opaque_fragment>',`if(uReflect>0.5){
 vec3 V=normalize(vGWorld-cameraPosition),N=vec3(0.0,0.0,-1.0);
 float F=clamp(fresnel(V,N,0.05),0.0,0.6);
 vec3 refl=probeReflect(vGWorld-N*0.02,reflect(V,N),0.6);
 outgoingLight=mix(outgoingLight,refl,F/max(F+diffuseColor.a,0.001));
 diffuseColor.a=diffuseColor.a+F*0.55;
}
#include <opaque_fragment>`);
 };
 m.customProgramCacheKey=()=>'foyer-glass-probe';return m;
}

/** 15/11 (b): the foyer's glazed back wall (z 13.86, bronze frame baked in Blender) and the view down
 * onto the schoolyard. The photo is the school's own aerial shot, blurred on purpose (as seen through
 * glass, far away): buildings, flame tree and yard read clearly, no person is identifiable.
 * 15/11 (user: “còn mờ”): full 2048 px source, light sharpen + brighter; plane 60 m wide so ~1 texel ≈ 1 screen px.
 * At this aerial distance each person is a few pixels — faces are not recognisable. */
/** Plane width: the photo covers the central 60 m; mirrored copies extend it for oblique views. */
const YARD_W=150;
export const GLASS_Z=13.86,YARD_URL='textures/san-truong-qua-kinh.webp';

export default function FoyerView(){
 const invalidate=useThree(s=>s.invalidate);
 const [yard,setYard]=useState<Texture|null>(null);
 useEffect(()=>{
  const done=imageStarted();let alive=true;
  new TextureLoader().load(import.meta.env.BASE_URL+YARD_URL+'?v='+__ASSET_V__,t=>{t.colorSpace=SRGBColorSpace;t.anisotropy=8;
   // 15/11: wide plane, the photo mirrored at its sides — oblique views through the glass never reach an edge
   t.wrapS=MirroredRepeatWrapping;t.repeat.set(YARD_W/60,1);t.offset.set(-(YARD_W/60-1)/2,0);done();if(alive){setYard(t);invalidate();}else t.dispose();},undefined,()=>done());
  return()=>{alive=false;};
 },[invalidate]);
 useEffect(()=>()=>yard?.dispose(),[yard]);
 const mats=useMemo(()=>({
  // Very light tint + low opacity: reads as clean glass, keeps the view bright.
  glass:glassMaterial(),
  sky:new MeshBasicMaterial({color:'#cddde7',toneMapped:false}),   // pale daylight sky (cream read as a wall)
 }),[]);
 // 15/11 audit: the photo was 15 % clipped (+ bloom haze on its whites) → dimmed to #dcdcdc
 const yardMat=useMemo(()=>yard?new MeshBasicMaterial({map:yard,color:'#dcdcdc',toneMapped:false}):null,[yard]);
 useEffect(()=>()=>{mats.glass.dispose();mats.sky.dispose();},[mats]);
 useEffect(()=>()=>yardMat?.dispose(),[yardMat]);
 return <group>
  {/* Glass between the baked mullions. */}
  <mesh material={mats.glass} position={[0,1.975,GLASS_Z-.005]}><planeGeometry args={[9.2,3.85]}/></mesh>
  {/* Bright overcast backdrop behind everything (fills any edge of the view not covered by the photo). */}
  <mesh material={mats.sky} position={[0,8,60]} rotation={[0,Math.PI,0]}><planeGeometry args={[220,120]}/></mesh>
  {/* The schoolyard seen from upstairs: a large vertical picture 17 m beyond the glass, facing the foyer. */}
  {yardMat&&<mesh material={yardMat} position={[0,-3,31]} rotation={[0,Math.PI,0]}><planeGeometry args={[YARD_W,33.75]}/></mesh>}
 </group>;
}
