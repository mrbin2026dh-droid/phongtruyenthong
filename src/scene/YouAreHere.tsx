import {useEffect,useRef} from 'react';
import type {MutableRefObject} from 'react';
import type {VisitorPose} from './HallController';
import {mapPoint} from './wayfindingMath.mjs';

/** C: "Bạn đang ở đây" dot with a view cone, refreshed while the map is open. */
export default function YouAreHere({pose}:{pose:MutableRefObject<VisitorPose>}){
 const el=useRef<HTMLSpanElement>(null);
 useEffect(()=>{let raf=0;const tick=()=>{const p=mapPoint(pose.current),e=el.current;
  if(e){e.style.left=p.left+'%';e.style.top=p.top+'%';e.style.setProperty('--heading',p.heading+'rad');}
  raf=requestAnimationFrame(tick);};tick();return()=>cancelAnimationFrame(raf);},[pose]);
 return <span ref={el} className="hall-you" role="img" aria-label="Bạn đang ở đây"><span className="hall-you-cone"/><span className="hall-you-dot"/><span className="hall-you-label">Bạn đang ở đây</span></span>;
}
