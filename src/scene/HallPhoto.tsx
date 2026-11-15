import {useEffect,useMemo,useReducer,useRef} from 'react';
import {CanvasTexture,SRGBColorSpace,ShaderChunk} from 'three';
import {useThree} from '@react-three/fiber';
import {portraitPath,type Person} from '../data/repository';
import {imageStarted} from './sceneAssets';
type Entry={texture:CanvasTexture;users:number;loaded:boolean;cancel?:ReturnType<typeof setTimeout>;listeners:Set<()=>void>};
const cache=new Map<string,Entry>();
/** Texture tiers (2:3): 0 far 96×144 · 1 near 600×900 · 2 close 900×1350 = the admin upload size (16/11: standing
 * right in front of a frame the photo covers ~1000 screen px — the 600 px copy was magnified and looked soft). */
export type PhotoTier=0|1|2;
export const TIER_SIZE:[number,number][]=[[96,144],[600,900],[900,1350]];
function entry(path:string,tier:PhotoTier){
 const key=path+'|'+tier;if(cache.has(key))return cache.get(key)!;
 const canvas=document.createElement('canvas');[canvas.width,canvas.height]=TIER_SIZE[tier];
 const c=canvas.getContext('2d')!;c.fillStyle='#e8e1d3';c.fillRect(0,0,canvas.width,canvas.height);
 const texture=new CanvasTexture(canvas);texture.colorSpace=SRGBColorSpace;texture.anisotropy=8;
 const e:Entry={texture,users:0,loaded:false,listeners:new Set()};cache.set(key,e);
 // 16/11: entry() runs during render — register the pending image after the render, never inside it
 // (it used to flip the asset store mid-render: React warning + reflection probes re-captured).
 const img=new Image();let fallback=false,settled=false,release:(()=>void)|null=null;
 queueMicrotask(()=>{if(!settled)release=imageStarted();});
 const finished=()=>{settled=true;release?.();release=null;};
 // Cover-fit into the 2:3 (4×6) frame: a 3×4 photo loses ~11% at the sides only;
 // a taller photo keeps its top (30% of the overflow is taken above, 70% below the chin).
 img.onload=()=>{finished();c.imageSmoothingEnabled=true;c.imageSmoothingQuality="high";const scale=Math.max(canvas.width/img.width,canvas.height/img.height),w=img.width*scale,h=img.height*scale;c.fillStyle='#e8e1d3';c.fillRect(0,0,canvas.width,canvas.height);c.drawImage(img,(canvas.width-w)/2,(canvas.height-h)*.3,w,h);texture.needsUpdate=true;e.loaded=true;e.listeners.forEach(fn=>fn());};
 img.onerror=()=>{if(!fallback){fallback=true;img.src=import.meta.env.BASE_URL+'portraits/default.jpg';}else{finished();e.loaded=true;e.listeners.forEach(fn=>fn());}};
 img.src=path;return e;
}
/** 16/11 (photos looked soft): a sharp portrait is drawn 2–4× smaller than its 600 px texture, and trilinear
 * mipmapping then blends in the next, blurrier level. A small negative LOD bias keeps the finer level. */
export const PHOTO_LOD_BIAS=-0.6;
const sharpen=(shader:{fragmentShader:string})=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',ShaderChunk.map_fragment.replace('texture2D( map, vMapUv )','texture2D( map, vMapUv, '+PHOTO_LOD_BIAS.toFixed(2)+' )'));};
function retain(e:Entry,key:string,wake:()=>void){
 clearTimeout(e.cancel);e.users++;e.listeners.add(wake);
 return()=>{e.users--;e.listeners.delete(wake);e.cancel=setTimeout(()=>{if(e.users===0){e.texture.dispose();cache.delete(key);}},0);};
}
/** Shared image maps, small at a distance and full portrait size nearby.
 * Anti-flicker (14/11): when switching between the small and the sharp version, keep showing the
 * previous image until the new one has finished loading, so no blank beige frame flashes. */
export default function HallPhoto({person,tier}:{person:Person;tier:PhotoTier}){
 const invalidate=useThree(s=>s.invalidate),path=portraitPath(person);
 const [,tick]=useReducer((n:number)=>n+1,0);
 const target=useMemo(()=>entry(path,tier),[path,tier]),targetKey=path+'|'+tier;
 const shown=useRef<{e:Entry;key:string}>({e:target,key:targetKey});
 if(target.loaded||!shown.current.e.loaded)shown.current={e:target,key:targetKey};
 const display=shown.current;
 useEffect(()=>retain(target,targetKey,()=>{tick();invalidate();}),[target,targetKey,invalidate]);
 useEffect(()=>{invalidate();return retain(display.e,display.key,invalidate);},[display.e,display.key,invalidate]);
 const sharp=!display.key.endsWith('|0');
 return sharp
  ?<meshBasicMaterial key="sharp" map={display.e.texture} toneMapped={false} onBeforeCompile={sharpen} customProgramCacheKey={()=>'photo-lod-bias'}/>
  :<meshBasicMaterial key="far" map={display.e.texture} toneMapped={false}/>;
}
