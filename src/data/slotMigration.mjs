// 17/11 (A+): the wall changed from 99 to 103 positions (side walls 16 → 13 columns, 8 new columns on the entrance wall).
// Saved positions (published data, the admin's working copy) are moved to the new wall in the SAME reading order
// (back wall left→right, left wall, right wall, entrance wall; top cell then bottom in each column), so tổ blocks stay
// together and “Tổ văn phòng” stays last. Ban Giám hiệu positions do not change. Pure; tests/slotMigration.test.mjs.
import {exhibitSlots,legacySlotsV1} from './exhibitSlots.mjs';
import {teacherSegments} from './arrangeByDept.mjs';
const order=slots=>teacherSegments(slots).flatMap(s=>s.cells);
export function migrateSlotsV1(people){
 const from=order(legacySlotsV1()),to=order(exhibitSlots()),index=new Map(from.map((id,i)=>[id,i]));
 return people.map(p=>{const i=index.get(p.displaySlot);return i===undefined?p:{...p,displaySlot:to[i]||''};});
}
