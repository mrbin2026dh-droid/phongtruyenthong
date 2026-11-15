import {useEffect,useMemo,useRef} from 'react';
import {CanvasTexture,SRGBColorSpace} from 'three';

/** Physical frieze in front of the column capitals; never an HTML overlay. */
export default function GalleryHeader(){
 const disposal=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
 const map=useMemo(()=>{
  const canvas=document.createElement('canvas');canvas.width=2048;canvas.height=90;
  const ctx=canvas.getContext('2d')!;ctx.fillStyle='#183444';ctx.fillRect(0,0,2048,90);
  ctx.strokeStyle='#cfac64';ctx.lineWidth=2;ctx.strokeRect(6,5,2036,80);
  ctx.font='700 54px "Noto Serif"';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#f1d69b';
  ctx.fillText('PHÒNG TRUYỀN THỐNG',1024,47,1920);
  const texture=new CanvasTexture(canvas);texture.colorSpace=SRGBColorSpace;return texture;
 },[]);
 useEffect(()=>{clearTimeout(disposal.current);return()=>{disposal.current=setTimeout(()=>map.dispose(),0);};},[map]);
 return <group position={[0,3.66,-5.08]}>
  <mesh><boxGeometry args={[10.7,.51,.08]}/><meshStandardMaterial color="#826334" metalness={.45} roughness={.45}/></mesh>
  <mesh position={[0,0,.045]}><planeGeometry args={[10.62,.465]}/><meshBasicMaterial map={map} toneMapped={false}/></mesh>
 </group>;
}
