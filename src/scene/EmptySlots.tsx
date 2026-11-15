import {useEffect,useMemo,useState} from 'react';
import {CanvasTexture,SRGBColorSpace} from 'three';

/** Admin only: every free wall position shows a dashed "+ Thêm ảnh" card that opens the editor. */
function cardTexture(lead:boolean,hover:boolean){
 const c=document.createElement('canvas');c.width=300;c.height=450;const g=c.getContext('2d')!;
 g.fillStyle=hover?'rgba(255,248,230,.92)':'rgba(255,250,240,.72)';g.fillRect(0,0,300,450);
 g.setLineDash([16,10]);g.lineWidth=8;g.strokeStyle=hover?'#b8862e':'#c9a560';g.strokeRect(10,10,280,430);
 g.setLineDash([]);g.fillStyle=hover?'#8a5f1c':'#a8823f';g.font='300 150px "Noto Sans"';g.textAlign='center';g.textBaseline='middle';g.fillText('+',150,190);
 g.font='700 34px "Noto Sans"';g.fillText('Thêm ảnh',150,300);g.font='600 22px "Noto Sans"';g.fillStyle='#7d6a4a';g.fillText(lead?'Ban Giám hiệu':'Ô trống',150,345);
 const t=new CanvasTexture(c);t.colorSpace=SRGBColorSpace;t.anisotropy=8;return t;
}

function Card({slot,onEmpty}:{slot:any;onEmpty:(slotId:string)=>void}){
 const [hover,setHover]=useState(false),lead=slot.group==='principal'||slot.group==='deputy';
 const map=useMemo(()=>cardTexture(lead,hover),[lead,hover]);
 useEffect(()=>()=>{map.dispose();document.body.style.cursor='';},[map]);
 const w=lead?(slot.height-.07)/1.5:slot.width-.06,h=w*1.5;
 return <group position={[slot.x,slot.y,slot.z]} rotation={[0,slot.yaw,0]}>
  <mesh position={[0,0,.02]} onClick={e=>{e.stopPropagation();if(e.delta<6)onEmpty(slot.slotId);}}
   onPointerOver={e=>{e.stopPropagation();setHover(true);document.body.style.cursor='pointer';}} onPointerOut={()=>{setHover(false);document.body.style.cursor='';}}>
   <planeGeometry args={[w,h]}/><meshBasicMaterial map={map} transparent toneMapped={false}/>
  </mesh>
 </group>;
}

export default function EmptySlots({slots,onEmpty,disabled}:{slots:any[];onEmpty:(slotId:string)=>void;disabled:boolean}){
 if(disabled||!slots.length)return null;
 return <>{slots.map(s=><Card key={s.slotId} slot={s} onEmpty={onEmpty}/>)}</>;
}
