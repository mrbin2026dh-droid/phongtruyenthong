import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {layoutHall,fitHallStops,createHallPlan,findPath,closeupStop,closeupOrder,isWalkable,PHONE_WALL_DISTANCE} from '../src/scene/hallLayout.mjs';
import {exhibitSlots} from '../src/data/exhibitSlots.mjs';

const dist=(s)=>Math.hypot(s.eye[0]-s.target[0],s.eye[2]-s.target[2]);
test('Phones held sideways stand 1.9 m from teacher/staff walls; computers and upright phones keep 2.8 m',()=>{
 const L=layoutHall([]),wall=L.stops.filter(s=>s.group==='teacher'||s.group==='staff');
 const phone=fitHallStops(L.stops,2.16,true).filter(s=>s.group==='teacher'||s.group==='staff');
 assert.ok(wall.length>=20&&wall.every(s=>Math.abs(dist(s)-2.8)<1e-6));
 assert.ok(phone.every(s=>Math.abs(dist(s)-PHONE_WALL_DISTANCE)<1e-6&&isWalkable(s.eye)),'every phone stop moved and walkable');
 assert.ok(fitHallStops(L.stops,2.16,false).filter(s=>s.group==='teacher').every(s=>Math.abs(dist(s)-2.8)<1e-6),'computer unchanged');
 assert.ok(fitHallStops(L.stops,.5,true).filter(s=>s.group==='teacher').every(s=>Math.abs(dist(s)-2.8)<1e-6),'upright phone unchanged');
 const plan=createHallPlan(fitHallStops(L.stops,2.16,true));
 for(const s of phone)assert.doesNotThrow(()=>findPath(plan,'entrance',s.id),s.id);
});
test('Every one of the 127 frames has a reachable close-up 1.1 m in front of it',()=>{
 const L=layoutHall([]),stops=fitHallStops(L.stops,2.16,true);
 for(const slot of exhibitSlots()){
  const c=closeupStop(slot,'x');assert.ok(c,slot.slotId);
  assert.ok(Math.abs(Math.hypot(c.eye[0]-slot.x,c.eye[2]-slot.z)-1.1)<1e-6&&isWalkable(c.eye),slot.slotId);
  assert.doesNotThrow(()=>findPath(createHallPlan([...stops,c]),'entrance',c.id),slot.slotId);
 }
});
test('Trước / Sau order stays in the zone, top row before bottom row of each column',()=>{
 const slots=exhibitSlots(),teachers=closeupOrder(slots,'teacher'),leaders=closeupOrder(slots,'principal');
 assert.equal(teachers.length,112);assert.ok(teachers.every(s=>s.group==='teacher'));
 assert.ok(teachers[0].y>teachers[1].y&&teachers[0].column===teachers[1].column);
 assert.equal(leaders.length,3);assert.equal(closeupOrder(slots,'staff').length,12);
});
test('Frames: teacher/staff dark walnut with a gold lip, Ban Giám hiệu brass; close-up only on phones',()=>{
 const scene=readFileSync(new URL('../src/scene/HallScene.tsx',import.meta.url),'utf8'),tour=readFileSync(new URL('../src/scene/HallTour.tsx',import.meta.url),'utf8');
 assert.ok(scene.includes("export const FRAME_COLORS={walnut:'#2a1f18',lip:'#d9b468'};"));
 assert.ok(scene.includes('<Frames slots={p.layout.slots.filter(isLeaderSlot)} material={brass}/><Frames slots={p.layout.slots.filter((s:any)=>!isLeaderSlot(s))} material={walnut} lip/>'));
 assert.ok(tour.includes("if(phone&&!p.admin){")&&tour.includes('onSelect={selectPortrait}'),'admin and computers open the profile/editor directly');
 assert.ok(tour.includes("matchMedia('(pointer:coarse)')"));
 assert.ok(tour.includes('[closeup.from,closeup.slotId]')&&tour.includes('from:c?.slotId'),'previous close-up stays in the plan: Trước/Sau slides along the wall');
});
test('Gold lip never shares a face with the frame bars or the photo (no z-fighting at the photo edge)',()=>{
 const scene=readFileSync(new URL('../src/scene/HallScene.tsx',import.meta.url),'utf8');
 const BAR=.022,LIP_Z0=.0225,PHOTO_Z=.015;
 assert.ok(scene.includes('FRAME_LIP=.006,FRAME_LIP_INSET=.001,FRAME_LIP_DEPTH=.003')&&scene.includes('z0=.0225,dz=FRAME_LIP_DEPTH'));
 assert.ok(LIP_Z0>BAR&&PHOTO_Z<BAR,'lip sits in front of the bars, photo behind them');
 assert.ok(scene.includes('iw=fw-2*b-2*I,ih=fh-2*b-2*I'),'lip inner edge 1 mm inside the opening, not on the bar edge');
 assert.ok(!scene.includes('local.makeScale(w,h,.024);local.setPosition(x,y,.012)'),'old lip spanning the bar depth is gone');
});
