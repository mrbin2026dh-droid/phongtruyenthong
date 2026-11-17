import {useEffect,useRef} from 'react';
import type {MutableRefObject} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import {dprFor,motionDelta,nextLevel,stillDpr,STILL_DELAY} from './quality.mjs';

export type QualityControl={choice:string;level:string;onLevel:(level:string)=>void;record?:MutableRefObject<number[]|null>};

/** GĐ4: applies the render resolution for the current quality level; in "Tự động" it measures FPS
 * only while the visitor is moving (the scene renders on demand) and steps the level up/down.
 * When `record` holds an array (benchmark), every moving frame time is appended to it. */
export default function PerfProbe({choice,level,onLevel,record}:QualityControl){
 const setDpr=useThree(s=>s.setDpr),invalidate=useThree(s=>s.invalidate);
 const live=useRef({choice,level,onLevel});live.current={choice,level,onLevel};
 const win=useRef({sum:0,n:0,streak:0});
 // moving: the level's resolution (smooth); standing still: one sharp frame at the screen's resolution
 const still=useRef(false),timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
 const sharpen=()=>{still.current=true;setDpr(stillDpr(live.current.level,window.devicePixelRatio||1));invalidate();};
 useEffect(()=>{setDpr(dprFor(level,window.devicePixelRatio||1));still.current=false;win.current={sum:0,n:0,streak:win.current.streak};invalidate();
  clearTimeout(timer.current);timer.current=setTimeout(sharpen,STILL_DELAY);return()=>clearTimeout(timer.current);},[level,setDpr,invalidate]);
 // 17/11 (user: “giật lag” near the slide screen): only CAMERA motion counts. The slide screen animates on its own
 // (frames rendered while the camera stands still): those frames must not drop the sharp still resolution (a canvas
 // resize + blur every 7 s) nor be measured as the visitor's frame rate.
 const lastCam=useRef<number[]>([]);
 useFrame(({camera},dt)=>{
  const now=[...camera.position.toArray(),...camera.quaternion.toArray(),(camera as any).fov??0],prev=lastCam.current;lastCam.current=now;
  const cameraMoved=prev.length===now.length&&now.some((v,i)=>Math.abs(v-prev[i])>1e-5);
  if(!cameraMoved||!motionDelta(dt))return;
  if(still.current){still.current=false;setDpr(dprFor(live.current.level,window.devicePixelRatio||1));}
  clearTimeout(timer.current);timer.current=setTimeout(sharpen,STILL_DELAY);
  record?.current?.push(dt);
  const l=live.current;if(l.choice!=='auto')return;
  const w=win.current;w.sum+=dt;w.n++;
  if(w.n<90)return;
  const r=nextLevel(l.level,w.n/w.sum,w.streak);w.sum=0;w.n=0;w.streak=r.highStreak;
  if(r.level!==l.level)l.onLevel(r.level);
 });
 return null;
}
