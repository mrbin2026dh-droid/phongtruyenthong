import test from 'node:test';
import assert from 'node:assert/strict';
import {exhibitSlots,legacySlotsV1} from '../src/data/exhibitSlots.mjs';
import {teacherSegments} from '../src/data/arrangeByDept.mjs';
import {migrateSlotsV1} from '../src/data/slotMigration.mjs';
import {layoutHall,fitHallStops,PHONE_WALL_DISTANCE} from '../src/scene/hallLayout.mjs';

test('17/11 (A+): saved positions move to the 103-position wall in the same reading order; leaders stay',()=>{
 const oldOrder=teacherSegments(legacySlotsV1()).flatMap(s=>s.cells),newOrder=teacherSegments().flatMap(s=>s.cells);
 assert.equal(oldOrder.length,96);assert.equal(newOrder.length,100);
 const people=oldOrder.filter((_,i)=>i%3!==1).map((slot,i)=>({id:'T'+i,displaySlot:slot}));
 people.push({id:'HT',displaySlot:'principal-001'},{id:'none',displaySlot:''});
 const moved=migrateSlotsV1(people);
 const seq=list=>list.filter(p=>p.displaySlot.startsWith('teacher')).sort((a,b)=>{const o=list===people?oldOrder:newOrder;return o.indexOf(a.displaySlot)-o.indexOf(b.displaySlot);}).map(p=>p.id);
 assert.deepEqual(seq(moved),seq(people),'same order along the walls');
 assert.equal(moved.find(p=>p.id==='HT').displaySlot,'principal-001');assert.equal(moved.find(p=>p.id==='none').displaySlot,'');
 assert.ok(moved.every(p=>!p.displaySlot||exhibitSlots().some(s=>s.slotId===p.displaySlot)));
});

test('17/11 (A+): phones see each portrait bay row by row from 1.2 m (upper row, then “-low” lower row)',()=>{
 const stops=layoutHall([]).stops,phone=fitHallStops(stops,2.16,true);
 const bays=stops.filter(s=>s.group==='teacher');
 for(const s of bays){
  const up=phone.find(p=>p.id===s.id),low=phone.find(p=>p.id===s.id+'-low');
  assert.ok(up&&low,'two views per bay');assert.equal(phone.indexOf(low),phone.indexOf(up)+1,'lower row right after the upper row');
  assert.deepEqual(up.eye,low.eye,'same place, only the camera tilts');assert.ok(up.target[1]>2.5&&low.target[1]<1.5);
  assert.ok(Math.hypot(up.eye[0]-up.target[0],up.eye[2]-up.target[2])<=1.9+1e-9);
 }
 assert.ok(phone.filter(p=>p.row==='low').length===bays.length);
 assert.equal(fitHallStops(stops,2.16,false).length,stops.length,'computers unchanged');
 assert.equal(PHONE_WALL_DISTANCE,1.2);
});
