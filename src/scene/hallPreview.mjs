import {attachExhibitSlots,exhibitSlots,exhibitZone} from '../data/exhibitSlots.mjs';
// View-only mock records fill vacant positions. Never written into the catalog.
export function hallPreview(people,enabled=true){
 if(!enabled)return {people,added:[]};
 const added=[],definitions=exhibitSlots();
 const roles={principal:'Hiệu trưởng',deputy:'Phó Hiệu trưởng',teacher:'Giáo viên',staff:'Nhân viên'};
 const labels={principal:'Hiệu trưởng minh họa',deputy:'Phó hiệu trưởng minh họa',teacher:'Giáo viên minh họa',staff:'Nhân viên minh họa'};
 for(const zone of Object.keys(roles)){
  const count=people.filter(p=>exhibitZone(p)===zone).length,capacity=definitions.filter(s=>s.group===zone).length;
  for(let i=count;i<capacity;i++)added.push({id:'DEMO-'+zone.toUpperCase()+'-'+String(i+1).padStart(3,'0'),name:labels[zone]+' '+String(i+1).padStart(2,'0'),role:roles[zone],dept:'Dữ liệu minh họa',group:['principal','deputy'].includes(zone)?'management':zone,status:'Đang công tác',birthYear:null,description:'Hồ sơ chỉ dùng để xem bố cục. Không phải nhân sự hoặc nhiệm kỳ thật của nhà trường.',image:'',photoRatio:.75,startYear:2026,endYear:null,workHistory:[{id:'demo-work',startYear:2026,endYear:null,role:roles[zone]}]});
 }
 const assigned=attachExhibitSlots([...people,...added]),addedIds=new Set(added.map(p=>p.id));
 return {people:assigned,added:assigned.filter(p=>addedIds.has(p.id))};
}
