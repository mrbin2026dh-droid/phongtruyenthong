// 15/11 (user report: the door screen appeared while the room was still loading — floating doors/frames).
// Tracks the heavy assets so the tour only reveals the scene when everything is in memory:
// the baked room GLB, the statue GLB and every portrait image currently requested.

const ready=new Set<string>();
let images=0,version=0,imagesTotal=0,imagesDone=0;
const subs=new Set<()=>void>();
// Notify after the current render/task: images are registered while a component renders (HallPhoto’s cache),
// and React forbids updating other components during render.
let queued=false;
// 17/11 (console: “Maximum update depth exceeded” while ~130 portraits start loading): a microtask notify runs inside
// React's own sync flush, so each wave of new images re-rendered the tour in the same nested chain (> 50 → error).
// One notification per macrotask coalesces the wave and keeps every update outside the commit chain.
const notify=()=>{version++;if(queued)return;queued=true;setTimeout(()=>{queued=false;subs.forEach(fn=>fn());},0);};

export function markAssetReady(name:string){if(!ready.has(name)){ready.add(name);notify();}}
export function isAssetReady(name:string){return ready.has(name);}

/** Call when an image starts loading; call the returned function once it has loaded or failed. */
export function imageStarted(){
 images++;imagesTotal++;notify();let done=false;
 return ()=>{if(done)return;done=true;images--;imagesDone++;notify();};
}
export function pendingImages(){return images;}

/** All required assets for the first view are loaded. */
export function sceneAssetsLoaded(required:string[]){return images===0&&required.every(n=>ready.has(n));}

/** 15/11 (việc 1): progress for the loading screen — named assets + every image started so far.
 * Returned as a string so useSyncExternalStore gets a stable snapshot: "readyNamed/required/imagesDone/imagesTotal". */
export function assetProgressKey(required:string[]){return required.filter(n=>ready.has(n)).length+'/'+required.length+'/'+imagesDone+'/'+imagesTotal;}

export function subscribeAssets(fn:()=>void){subs.add(fn);return()=>{subs.delete(fn);};}
export function assetsVersion(){return version;}
