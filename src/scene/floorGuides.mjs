// Only known safe graph stops are offered. A marker never invents a route through furniture.
export function floorGuideCandidates(plan,position,forward,loadedRooms){
 const distance=p=>Math.hypot(p[0]-position[0],p[2]-position[2]);
 const possible=Object.values(plan.nodes).filter(node=>{
  if(!/^(lobby-(aisle|left|right)|lobby-door|hall-\d+|room-\d+(-branch|-entry|-left|-right)?)$/.test(node.id))return false;
  const match=/^room-(\d+)/.exec(node.id);
  if(match&&!node.id.endsWith('-branch')&&!loadedRooms.includes(Number(match[1])))return false;
  const d=distance(node.eye);if(d<1.3||d>13)return false;
  const dot=((node.eye[0]-position[0])*forward[0]+(node.eye[2]-position[2])*forward[2])/d;
  return dot>0.15;
 }).sort((a,b)=>distance(a.eye)-distance(b.eye));
 const kept=[];
 for(const node of possible){
  if(kept.every(other=>Math.hypot(other.eye[0]-node.eye[0],other.eye[2]-node.eye[2])>2.2))kept.push(node);
  if(kept.length===4)break;
 }
 return kept;
}
