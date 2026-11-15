import {useEffect,useMemo,useReducer,useRef} from 'react';
import {CanvasTexture,SRGBColorSpace} from 'three';
import {useThree} from '@react-three/fiber';
import {portraitPath,type Person} from '../data/repository';
type Entry={texture:CanvasTexture;users:number;loaded:boolean;cancel?:ReturnType<typeof setTimeout>;listeners:Set<()=>void>};
const cache=new Map<string,Entry>();
function entry(path:string,near:boolean){
 const key=path+'|'+near;if(cache.has(key))return cache.get(key)!;
 const canvas=document.createElement('canvas');canvas.width=near?600:96;canvas.height=near?900:144;
 const c=canvas.getContext('2d')!;c.fillStyle='#e8e1d3';c.fillRect(0,0,canvas.width,canvas.height);
 const texture=new CanvasTexture(canvas);texture.colorSpace=SRGBColorSpace;texture.anisotropy=8;
 const e:Entry={texture,users:0,loaded:false,listeners:new Set()};cache.set(key,e);
 const img=new Image();let fallback=false;
 // Cover-fit into the 2:3 (4×6) frame: a 3×4 photo loses ~11% at the sides only;
 // a taller photo keeps its top (30% of the overflow is taken above, 70% below the chin).
 img.onload=()=>{const scale=Math.max(canvas.width/img.width,canvas.height/img.height),w=img.width*scale,h=img.height*scale;c.fillStyle='#e8e1d3';c.fillRect(0,0,canvas.width,canvas.height);c.drawImage(img,(canvas.width-w)/2,(canvas.height-h)*.3,w,h);texture.needsUpdate=true;e.loaded=true;e.listeners.forEach(fn=>fn());};
 img.onerror=()=>{if(!fallback){fallback=true;img.src=import.meta.env.BASE_URL+'portraits/default.jpg';}else{e.loaded=true;e.listeners.forEach(fn=>fn());}};
 img.src=path;return e;
}
function retain(e:Entry,key:string,wake:()=>void){
 clearTimeout(e.cancel);e.users++;e.listeners.add(wake);
 return()=>{e.users--;e.listeners.delete(wake);e.cancel=setTimeout(()=>{if(e.users===0){e.texture.dispose();cache.delete(key);}},0);};
}
/** Shared image maps, small at a distance and full portrait size nearby.
 * Anti-flicker (14/11): when switching between the small and the sharp version, keep showing the
 * previous image until the new one has finished loading, so no blank beige frame flashes. */
export default function HallPhoto({person,near}:{person:Person;near:boolean}){
 const invalidate=useThree(s=>s.invalidate),path=portraitPath(person);
 const [,tick]=useReducer((n:number)=>n+1,0);
 const target=useMemo(()=>entry(path,near),[path,near]),targetKey=path+'|'+near;
 const shown=useRef<{e:Entry;key:string}>({e:target,key:targetKey});
 if(target.loaded||!shown.current.e.loaded)shown.current={e:target,key:targetKey};
 const display=shown.current;
 useEffect(()=>retain(target,targetKey,()=>{tick();invalidate();}),[target,targetKey,invalidate]);
 useEffect(()=>{invalidate();return retain(display.e,display.key,invalidate);},[display.e,display.key,invalidate]);
 return <meshBasicMaterial map={display.e.texture} toneMapped={false}/>;
}
