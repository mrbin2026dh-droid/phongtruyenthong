// Shared by the admin “Xuất bản” dialog (browser) and scripts/publishData.mjs (Node). Pure.
/** What changes compared with the currently published catalog. */
export function summarize(previous=[],next=[]){
 const before=new Map(previous.map(p=>[p.id,p])),after=new Map(next.map(p=>[p.id,p]));
 const added=next.filter(p=>!before.has(p.id)).map(p=>p.id),removed=previous.filter(p=>!after.has(p.id)).map(p=>p.id);
 const photo=[],info=[];
 const strip=v=>JSON.stringify({...v,image:undefined,startYear:undefined,endYear:undefined});
 for(const p of next){const o=before.get(p.id);if(!o)continue;
  if((o.image||'')!==(p.image||''))photo.push(p.id);
  if(strip(o)!==strip(p))info.push(p.id);}
 return {added,removed,photo,info,total:next.length,changed:added.length+removed.length+photo.length+info.length>0};
}
