import {useEffect,useRef} from 'react';
import {useFrame,useThree} from '@react-three/fiber';

/** Developer overlay, enabled only with ?stats=1. Numbers describe the previous rendered frame. */
export const statsEnabled=()=>{try{return new URLSearchParams(location.search).get('stats')==='1'||new URLSearchParams(location.search).get('bench')==='1';}catch{return false;}};

export type SceneStatsSample={fps:number;calls:number;triangles:number;geometries:number;textures:number;programs:number;dpr:number;frames:number};

export default function SceneStats(){
 const gl=useThree(s=>s.gl),scene=useThree(s=>s.scene),camera=useThree(s=>s.camera);
 useEffect(()=>{
  const w=window as any;w.__scene=scene;w.__camera=camera;
  // QA: render one frame at a chosen size and return a JPEG data URL (only with ?stats=1).
  w.__snapshot=(width=1600,height=1000)=>{
   const size=gl.getSize(new (camera.position.constructor as any)()),ratio=gl.getPixelRatio(),cam=camera as any,aspect=cam.aspect;
   gl.setPixelRatio(1);gl.setSize(width,height,false);cam.aspect=width/height;cam.updateProjectionMatrix();
   gl.render(scene,camera);const url=gl.domElement.toDataURL('image/jpeg',.9);
   gl.setPixelRatio(ratio);gl.setSize(size.x,size.y,false);cam.aspect=aspect;cam.updateProjectionMatrix();gl.render(scene,camera);
   return url;
  };
  return()=>{delete w.__scene;delete w.__camera;delete w.__snapshot;};
 },[scene,gl,camera]);
 const box=useRef<HTMLPreElement|null>(null),times=useRef<number[]>([]),frames=useRef(0);
 useEffect(()=>{
  const el=document.createElement('pre');el.setAttribute('aria-hidden','true');
  Object.assign(el.style,{position:'fixed',left:'8px',bottom:'8px',zIndex:'9999',margin:'0',padding:'6px 8px',font:'11px/1.35 monospace',color:'#fff',background:'#000b',borderRadius:'4px',pointerEvents:'none',whiteSpace:'pre'});
  document.body.appendChild(el);box.current=el;
  return()=>{el.remove();box.current=null;delete (window as any).__sceneStats;};
 },[]);
 useFrame(()=>{
  const now=performance.now(),t=times.current;t.push(now);while(t.length&&now-t[0]>1000)t.shift();frames.current++;
  const i=gl.info,sample:SceneStatsSample={fps:t.length,calls:i.render.calls,triangles:i.render.triangles,geometries:i.memory.geometries,textures:i.memory.textures,programs:i.programs?.length??0,dpr:gl.getPixelRatio(),frames:frames.current};
  (window as any).__sceneStats=sample;
  if(box.current)box.current.textContent=`FPS ${sample.fps} (khung đã vẽ ${sample.frames})\nDraw calls ${sample.calls}\nTam giác ${sample.triangles.toLocaleString('vi')}\nGeometry ${sample.geometries} · Texture ${sample.textures}\nShader ${sample.programs} · DPR ${sample.dpr}`;
 });
 return null;
}
