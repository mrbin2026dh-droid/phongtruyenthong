import {useEffect,useMemo,useRef,useState} from 'react';
import {CanvasTexture,SRGBColorSpace} from 'three';
// A sign is real front-facing geometry: wall/furniture depth and perspective apply.
export default function MuseumSign({title,subtitle,action,width=3.5,height=.92}:{title:string;subtitle?:string;action:()=>void;width?:number;height?:number}){
 const [hover,setHover]=useState(false);
 const disposal=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
 const texture=useMemo(()=>{
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=270;
  const c=canvas.getContext('2d')!;c.clearRect(0,0,1024,270);
  c.fillStyle='#f3eddf';c.beginPath();c.roundRect(5,5,1014,260,22);c.fill();
  c.strokeStyle='#cab996';c.lineWidth=2;c.stroke();
  c.fillStyle='#ac8747';c.fillRect(38,72,5,125);
  c.textAlign='left';c.fillStyle='#233e4a';c.font='600 57px "Noto Sans"';
  const words=title.split(' '),lines:string[]=[];let line='';
  words.forEach(word=>{const next=line?line+' '+word:word;if(c.measureText(next).width>775&&line){lines.push(line);line=word;}else line=next;});if(line)lines.push(line);
  const start=lines.length>1?96:120;lines.forEach((line,i)=>c.fillText(line,77,start+i*67,790));
  c.font='400 30px "Noto Sans"';c.fillStyle='#7d735f';if(subtitle)c.fillText(subtitle,77,224,790);
  c.strokeStyle='#a78a56';c.lineWidth=4;c.beginPath();c.arc(933,134,34,0,Math.PI*2);c.stroke();
  c.beginPath();c.moveTo(918,134);c.lineTo(946,134);c.moveTo(937,124);c.lineTo(947,134);c.lineTo(937,144);c.stroke();
  const map=new CanvasTexture(canvas);map.colorSpace=SRGBColorSpace;return map;
 },[title,subtitle]);
 useEffect(()=>{clearTimeout(disposal.current);return ()=>{disposal.current=setTimeout(()=>texture.dispose(),0);};},[texture]);
 useEffect(()=>()=>{document.body.style.cursor='';},[]);
 return <mesh onClick={e=>{e.stopPropagation();if(e.delta<6)action();}} onPointerOver={e=>{e.stopPropagation();setHover(true);document.body.style.cursor='pointer';}} onPointerOut={()=>{setHover(false);document.body.style.cursor='';}}>
  <planeGeometry args={[width,height]}/><meshBasicMaterial transparent map={texture} color={hover?'#fff1cf':'white'} toneMapped={false}/>
 </mesh>;
}
