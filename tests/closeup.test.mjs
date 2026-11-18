import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {layoutHall,fitHallStops,createHallPlan,findPath,closeupStop,closeupOrder,isWalkable,PHONE_WALL_DISTANCE} from '../src/scene/hallLayout.mjs';
import {exhibitSlots} from '../src/data/exhibitSlots.mjs';

const dist=(s)=>Math.hypot(s.eye[0]-s.target[0],s.eye[2]-s.target[2]);
test('Phones held sideways stand 1.9 m from teacher/staff walls; computers and upright phones keep 2.8 m',()=>{
 const L=layoutHall([]),wall=L.stops.filter(s=>s.group==='teacher'||s.group==='staff');
 const phone=fitHallStops(L.stops,2.16,true).filter(s=>s.group==='teacher'||s.group==='staff');
 assert.ok(wall.length>=16&&wall.every(s=>Math.abs(dist(s)-2.8)<1e-6));
 assert.ok(phone.every(s=>Math.abs(dist(s)-PHONE_WALL_DISTANCE)<1e-6&&isWalkable(s.eye)),'every phone stop moved and walkable');
 assert.ok(fitHallStops(L.stops,2.16,false).filter(s=>s.group==='teacher').every(s=>Math.abs(dist(s)-2.8)<1e-6),'computer unchanged');
 assert.ok(fitHallStops(L.stops,.5,true).filter(s=>s.group==='teacher').every(s=>Math.abs(dist(s)-2.8)<1e-6),'upright phone unchanged');
 const plan=createHallPlan(fitHallStops(L.stops,2.16,true));
 for(const s of phone)assert.doesNotThrow(()=>findPath(plan,'entrance',s.id),s.id);
});
test('Every frame has a reachable close-up in front of it (1.1 m, scaled up for the larger Ban Giám hiệu frames)',()=>{
 const L=layoutHall([]),stops=fitHallStops(L.stops,2.16,true);
 for(const slot of exhibitSlots()){
  const c=closeupStop(slot,'x');assert.ok(c,slot.slotId);
  // 18/11: the distance grows with the frame (Ban Giám hiệu 1.5 m frames → 1.72 m), teachers stay at 1.1 m
  const want=1.1*Math.max(1,(slot.height||.96)/.96);
  assert.ok(Math.abs(Math.hypot(c.eye[0]-slot.x,c.eye[2]-slot.z)-want)<1e-6&&isWalkable(c.eye),slot.slotId);
  assert.doesNotThrow(()=>findPath(createHallPlan([...stops,c]),'entrance',c.id),slot.slotId);
 }
});
test('Trước / Sau order stays in the zone, top row before bottom row of each column',()=>{
 const slots=exhibitSlots(),teachers=closeupOrder(slots,'teacher'),leaders=closeupOrder(slots,'principal');
 assert.equal(teachers.length,100);assert.ok(teachers.every(s=>s.group==='teacher'));
 assert.ok(teachers[0].y>teachers[1].y&&teachers[0].column===teachers[1].column);
 assert.equal(leaders.length,3);assert.equal(closeupOrder(slots,'staff').length,0,'17/11: no separate staff zone');
});
test('Frames: teacher/staff dark walnut with a gold lip, Ban Giám hiệu profiled gilt; close-up only on phones',()=>{
 const scene=readFileSync(new URL('../src/scene/HallScene.tsx',import.meta.url),'utf8'),tour=readFileSync(new URL('../src/scene/HallTour.tsx',import.meta.url),'utf8');
 assert.ok(scene.includes("export const FRAME_COLORS={walnut:'#2a1f18',lip:'#d9b468'};"));
 assert.ok(scene.includes('<LeaderFrames slots={p.layout.slots.filter(isLeaderSlot)}/><Frames slots={p.layout.slots.filter((s:any)=>!isLeaderSlot(s))} material={walnut} lip/>'));
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

test('Ban Giám hiệu frame follows the referenced design (05-HUONG-DAN-AI/THIET-KE-KHU-BGH.md)',()=>{
 const scene=readFileSync(new URL('../src/scene/HallScene.tsx',import.meta.url),'utf8');
 const profile=JSON.parse(scene.match(/LEADER_PROFILE:\[number,number,number\]\[\]=(\[\[.*?\]\]);/)[1].replace(/([\[,])\./g,'$10.'));
 assert.equal(profile.length,3,'one frame, three stepped bands');
 for(let i=1;i<profile.length;i++)assert.ok(profile[i][0]>profile[i-1][1],'bands never share a face (no z-fighting)');
 assert.ok(Math.abs(profile.at(-1)[1]-.07)<1e-9,'7 cm moulding for a 1 m portrait (2–4 in guidance)');
 assert.ok(profile[2][2]>profile[0][2]&&profile[0][2]>profile[1][2],'outer rim proud, cove lowest: catches light like a real profile');
 assert.ok(scene.includes('PICTURE_LIGHT={length:.66,above:.16}'),'picture light 2/3 of the frame width, 16 cm above');
 assert.ok(scene.includes('PLAQUE={width:.60,height:.13,gap:.07}')&&scene.includes("x.fillStyle='#2a1f18'"),'brass plaque, dark engraved text');
 assert.ok(!scene.includes("key={'portrait-side'+sign}")&&!scene.includes('s={[slot.width+.22,slot.height+.47,.07]}'),'no second brass frame, no oversized backing board');
 assert.ok(scene.includes("LEADER_GOLD='#c9a560'"),'one gold tone');
 assert.ok(scene.includes('blending={AdditiveBlending}')&&scene.includes("x.globalCompositeOperation='destination-in'"),'warm light pool, every edge faded to zero');
 assert.ok(scene.includes('<mesh position={[0,ly-LIGHT_POOL.height/2,LEADER_BACK+.002]}>'),'pool starts at the lamp and only falls downwards (no halo above the lamp / behind the title)');
 const pool=scene.match(/LIGHT_POOL=\{width:([\d.]+),height:([\d.]+),opacity:([\d.]+)\}/);assert.ok(pool&&+pool[3]<=.4,'accent kept moderate (measured ≈3.7:1 over the fabric)');
});
