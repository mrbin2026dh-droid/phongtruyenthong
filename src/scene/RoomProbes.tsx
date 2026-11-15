import {useEffect,useRef,useSyncExternalStore} from 'react';
import {useThree} from '@react-three/fiber';
import {CubeCamera,HalfFloatType,LinearMipmapLinearFilter,PMREMGenerator,WebGLCubeRenderTarget,type Texture} from 'three';
import {PROBES,PROBE_UNIFORMS} from './probeShared.mjs';
import {sceneAssetsLoaded,subscribeAssets} from './sceneAssets';

/** Captures the two reflection probes once the room, statue and portraits are loaded (and again once the
 * entrance doors have opened, so the hall probe no longer sees closed doors). The hall capture also becomes
 * the scene environment: brass frames, doors and the statue reflect the real room. `level` = quality level. */
export default function RoomProbes({level}:{level:string}){
 const {gl,scene,invalidate}=useThree();
 const loaded=useSyncExternalStore(subscribeAssets,()=>sceneAssetsLoaded(['baked','statue']));
 const targets=useRef<{room:WebGLCubeRenderTarget;foyer:WebGLCubeRenderTarget;env?:Texture}|null>(null);
 // 16/11 (BGH flicker): capture ONCE after the first full load. Portraits that load later (near/far swaps while
 // walking) used to flip `loaded` and re-capture both probes + swap scene.environment — brass, mats and statue
 // changed brightness every time the visitor crossed a distance threshold.
 const captured=useRef(false),recapture=useRef<(()=>void)|null>(null);

 useEffect(()=>{PROBE_UNIFORMS.uReflect.value=level==='low'?0:1;invalidate();},[level,invalidate]);

 useEffect(()=>{
  if(!loaded||captured.current)return;
  const make=()=>{const t=new WebGLCubeRenderTarget(256,{type:HalfFloatType,generateMipmaps:true,minFilter:LinearMipmapLinearFilter});return t;};
  const t=targets.current??(targets.current={room:make(),foyer:make()});
  const capture=(which:'room'|'foyer')=>{
   const cam=new CubeCamera(.05,60,t[which]);cam.position.copy(PROBES[which].center);
   // never sample a cube while rendering into it (WebGL feedback loop): unbind both during the capture
   const prevEnv=scene.environment,rc=PROBE_UNIFORMS.uRoomCube.value,fc=PROBE_UNIFORMS.uFoyerCube.value;
   scene.environment=null;PROBE_UNIFORMS.uRoomCube.value=null;PROBE_UNIFORMS.uFoyerCube.value=null;
   cam.update(gl,scene);
   scene.environment=prevEnv;PROBE_UNIFORMS.uRoomCube.value=rc;PROBE_UNIFORMS.uFoyerCube.value=fc;
  };
  const run=()=>{
   captured.current=true;if(import.meta.env.DEV)(window as any).__probeCaptures++;
   capture('room');capture('foyer');
   PROBE_UNIFORMS.uRoomCube.value=t.room.texture;PROBE_UNIFORMS.uFoyerCube.value=t.foyer.texture;
   // the real hall as environment lighting for the live (non-baked) objects
   env();
   invalidate();
  };
  // let the first frames upload textures before capturing
  const id=setTimeout(run,300);
  const env=()=>{const pm=new PMREMGenerator(gl);const e=pm.fromCubemap(t.room.texture).texture;pm.dispose();t.env?.dispose();t.env=e;scene.environment=e;scene.environmentIntensity=.9;};
  if(import.meta.env.DEV)(window as any).__probeCaptures=0;
  recapture.current=()=>{if(import.meta.env.DEV)(window as any).__probeCaptures++;capture('room');env();invalidate();};
  return()=>clearTimeout(id);
 },[loaded,gl,scene,invalidate]);
 // once the doors are open the hall probe must not show them closed (independent of later portrait loads)
 useEffect(()=>{let id:ReturnType<typeof setTimeout>|undefined;const reopen=()=>{clearTimeout(id);id=setTimeout(()=>{if(captured.current)recapture.current?.();},200);};
  window.addEventListener('museum-doors-open',reopen);return()=>{clearTimeout(id);window.removeEventListener('museum-doors-open',reopen);};},[]);

 useEffect(()=>()=>{const t=targets.current;if(t){t.room.dispose();t.foyer.dispose();t.env?.dispose();}PROBE_UNIFORMS.uRoomCube.value=null;PROBE_UNIFORMS.uFoyerCube.value=null;},[]);
 return null;
}
