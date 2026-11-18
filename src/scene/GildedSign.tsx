import {useEffect,useMemo} from 'react';
import {PHONE} from './device';
import {BoxGeometry,CanvasTexture,MeshBasicMaterial,MeshStandardMaterial,SRGBColorSpace} from 'three';

/** One line of a gilded sign: text, cap size and centre as fractions of the face height, letter spacing (px). */
export type SignLine={text:string;size:number;cy:number;spacing?:number};
export type SignSpec={lines:SignLine[];rule?:number;frame:{w:number;h:number;d:number};face:{w:number;h:number}};

/** 16/11: the school's signs share the “Tiên học lễ, hậu học văn” style — walnut frame, deep-teal face, thin gold
 * double rule, gilded Noto Serif capitals (drawn at 4096 px: ~880 px per metre, no blur glow → crisp edges). */
export function gildedSignTexture({lines,rule,face}:SignSpec){
 const W=4096,H=Math.round(W*face.h/face.w),c=document.createElement('canvas'),k=PHONE?.5:1;c.width=W*k;c.height=Math.round(H*k);   // 18/11: phones draw at half size (memory)
 const g=c.getContext('2d')!;g.scale(k,k);
 let seed=20261116;const rand=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
 g.fillStyle='#17383e';g.fillRect(0,0,W,H);
 for(let i=0;i<9000;i++){g.fillStyle=`rgba(255,255,255,${.01+rand()*.025})`;g.fillRect(rand()*W,rand()*H,1+rand()*2,1);}
 const gold=g.createLinearGradient(0,0,0,H);gold.addColorStop(0,'#fff1c8');gold.addColorStop(.5,'#e5c786');gold.addColorStop(1,'#ba9659');
 g.strokeStyle='#bda36b';g.lineWidth=7;g.strokeRect(22,22,W-44,H-44);g.lineWidth=2.5;g.strokeRect(40,40,W-80,H-80);
 g.textAlign='center';g.textBaseline='alphabetic';
 for(const {text,size,cy,spacing=0} of lines){
  let s=Math.round(H*size);const font=()=>`700 ${s}px "Noto Serif"`;g.font=font();try{(g as any).letterSpacing=spacing+'px';}catch{/* older canvas */}
  while(g.measureText(text).width>W-260&&s>20){s--;g.font=font();}
  const m=g.measureText(text),y=H*cy+(m.actualBoundingBoxAscent-m.actualBoundingBoxDescent)/2;
  // engraved depth: a crisp offset shadow (no blur), then the gilded face
  g.fillStyle='rgba(4,24,28,.65)';g.fillText(text,W/2+2,y+3);g.fillStyle=gold;g.fillText(text,W/2,y);
  try{(g as any).letterSpacing='0px';}catch{/* older canvas */}
 }
 if(rule!==undefined){const y=H*rule;g.fillStyle='#bda36b';g.fillRect(W*.30,y-1.5,W*.17,3);g.fillRect(W*.53,y-1.5,W*.17,3);g.save();g.translate(W/2,y);g.rotate(Math.PI/4);g.fillRect(-8,-8,16,16);g.restore();}
 const t=new CanvasTexture(c);t.colorSpace=SRGBColorSpace;t.anisotropy=16;return t;
}

const cube=new BoxGeometry(1,1,1);
/** The sign hangs on a wall: local +z points away from the wall. Frame back face on the wall (z 0), gold lip and face
 * in front of it — every layer ≥ 1 cm apart (no z-fighting with the baked wall). */
export default function GildedSign({spec,position,rotation=0}:{spec:SignSpec;position:[number,number,number];rotation?:number}){
 const parts=useMemo(()=>{
  const map=gildedSignTexture(spec);
  return {map,face:new MeshBasicMaterial({map,color:'#f4eee2',toneMapped:false}),
   wood:new MeshStandardMaterial({color:'#4f362a',roughness:.5}),gold:new MeshStandardMaterial({color:'#bda36b',roughness:.35,metalness:.5})};
 },[spec]);
 useEffect(()=>()=>{parts.map.dispose();parts.face.dispose();parts.wood.dispose();parts.gold.dispose();},[parts]);
 const {frame,face:f}=spec,z0=.005;
 return <group position={position} rotation={[0,rotation,0]}>
  <mesh geometry={cube} material={parts.wood} scale={[frame.w,frame.h,frame.d]} position={[0,0,z0+frame.d/2]}/>
  <mesh geometry={cube} material={parts.gold} scale={[f.w+.03,f.h+.03,.01]} position={[0,0,z0+frame.d+.005]}/>
  <mesh material={parts.face} position={[0,0,z0+frame.d+.02]}><planeGeometry args={[f.w,f.h]}/></mesh>
 </group>;
}
