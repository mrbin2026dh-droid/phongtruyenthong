// 15/11 (user report: the door screen appeared while the room was still loading — floating doors/frames).
// Tracks the heavy assets so the tour only reveals the scene when everything is in memory:
// the baked room GLB, the statue GLB and every portrait image currently requested.

const ready=new Set<string>();
let images=0,version=0;
const subs=new Set<()=>void>();
// Notify after the current render/task: images are registered while a component renders (HallPhoto’s cache),
// and React forbids updating other components during render.
let queued=false;
const notify=()=>{version++;if(queued)return;queued=true;queueMicrotask(()=>{queued=false;subs.forEach(fn=>fn());});};

export function markAssetReady(name:string){if(!ready.has(name)){ready.add(name);notify();}}
export function isAssetReady(name:string){return ready.has(name);}

/** Call when an image starts loading; call the returned function once it has loaded or failed. */
export function imageStarted(){
 images++;notify();let done=false;
 return ()=>{if(done)return;done=true;images--;notify();};
}
export function pendingImages(){return images;}

/** All required assets for the first view are loaded. */
export function sceneAssetsLoaded(required:string[]){return images===0&&required.every(n=>ready.has(n));}

export function subscribeAssets(fn:()=>void){subs.add(fn);return()=>{subs.delete(fn);};}
export function assetsVersion(){return version;}
