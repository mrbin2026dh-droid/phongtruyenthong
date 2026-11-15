import {useEffect,useRef} from 'react';
import type {MutableRefObject} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import {dprFor,motionDelta,nextLevel} from './quality.mjs';

export type QualityControl={choice:string;level:string;onLevel:(level:string)=>void;record?:MutableRefObject<number[]|null>};

/** GĐ4: applies the render resolution for the current quality level; in "Tự động" it measures FPS
 * only while the visitor is moving (the scene renders on demand) and steps the level up/down.
 * When `record` holds an array (benchmark), every moving frame time is appended to it. */
export default function PerfProbe({choice,level,onLevel,record}:QualityControl){
 const setDpr=useThree(s=>s.setDpr),invalidate=useThree(s=>s.invalidate);
 const live=useRef({choice,level,onLevel});live.current={choice,level,onLevel};
 const win=useRef({sum:0,n:0,streak:0});
 useEffect(()=>{setDpr(dprFor(level,window.devicePixelRatio||1));win.current={sum:0,n:0,streak:win.current.streak};invalidate();},[level,setDpr,invalidate]);
 useFrame((_,dt)=>{
  if(!motionDelta(dt))return;
  record?.current?.push(dt);
  const l=live.current;if(l.choice!=='auto')return;
  const w=win.current;w.sum+=dt;w.n++;
  if(w.n<90)return;
  const r=nextLevel(l.level,w.n/w.sum,w.streak);w.sum=0;w.n=0;w.streak=r.highStreak;
  if(r.level!==l.level)l.onLevel(r.level);
 });
 return null;
}
