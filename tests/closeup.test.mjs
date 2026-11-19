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

test('19/11 (người dùng): ← sang người bên TRÁI, → sang người bên PHẢI như người xem nhìn thấy, trên mọi bức tường',async()=>{
 const {closeupNeighbor}=await import('../src/scene/hallLayout.mjs');
 const slots=exhibitSlots();
 // the visitor's right hand facing each wall (camera right = forward × up)
 const right={back:[1,0],right:[0,1],front:[-1,0],left:[0,-1]};
 const pos=s=>s.x*right[s.wall][0]+s.z*right[s.wall][1];
 for(const wall of ['back','right','front','left']){
  const row=slots.filter(s=>s.group==='teacher'&&s.wall===wall&&s.y>2).sort((a,b)=>pos(a)-pos(b));
  if(row.length<3)continue;
  const mid=row[Math.floor(row.length/2)];
  const r=closeupNeighbor(slots,mid,1),l=closeupNeighbor(slots,mid,-1);
  assert.equal(r.wall,wall);assert.equal(l.wall,wall);assert.ok(pos(r)>pos(mid)&&pos(l)<pos(mid),wall+': → right, ← left');
  assert.ok(Math.abs(r.y-mid.y)<.3&&Math.abs(l.y-mid.y)<.3,'same row');
 }
 // the leadership: deputy · principal · deputy (left → right as the visitor faces the back wall)
 const hp=slots.find(s=>s.group==='principal');
 assert.ok(closeupNeighbor(slots,hp,1).x>hp.x&&closeupNeighbor(slots,hp,-1).x<hp.x);
 // turning a corner: the right end of the back wall continues on the right wall
 const back=slots.filter(s=>s.group==='teacher'&&s.wall==='back'&&s.y>2).sort((a,b)=>a.x-b.x);
 assert.equal(closeupNeighbor(slots,back.at(-1),1).wall,'right');
});

test('19/11 (người dùng: iPhone cầm dọc xuống dòng xấu; nút nhạc/toàn màn hình to, thô)',()=>{
 const css=readFileSync(new URL('../src/portrait.css',import.meta.url),'utf8'),hall=readFileSync(new URL('../src/hall.css',import.meta.url),'utf8');
 assert.ok(readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8').includes("import './portrait.css';"));
 assert.ok(css.includes('@media (orientation:portrait) and (pointer:coarse) and (max-width:600px)')&&css.includes('.immersive-tour .guided-scene.hall-scene{height:calc(100dvh - 56px);min-height:0}')&&css.includes('header:has(+ main.museum-view){height:52px;'),'the 3D view fills an upright phone; slim tour header (19/11)');
 assert.ok(css.includes('.hall-scene:has(.hall-panel-shade) .thumbstick'),'thumbsticks never cover an open panel');
 assert.ok(css.includes('.immersive-tour .hall-closeup-name{order:-1;flex:1 0 100%'),'close-up bar: name above the buttons on a narrow phone');
 assert.ok(hall.includes('top:10px;width:34px;height:34px')&&hall.includes('border-radius:50%'),'small round glass buttons');
});

test('19/11 (rà soát): ▶ ở sảnh mở cửa rồi tự trình diễn; chức danh hiển thị thống nhất',async()=>{
 const t=readFileSync(new URL('../src/scene/HallTour.tsx',import.meta.url),'utf8');
 assert.ok(t.includes('if(atDoor){autoAfterEntry.current=true;openDoor();return;}')&&t.includes('if(entered&&autoAfterEntry.current){autoAfterEntry.current=false;start(true);}'));
 const {roleText}=await import('../src/data/catalog.mjs');
 assert.equal(roleText('Giáo Viên'),'Giáo viên');assert.equal(roleText('Nhân Viên'),'Nhân viên');assert.equal(roleText('Phó Hiệu trưởng'),'Phó Hiệu trưởng');assert.equal(roleText('Tổ trưởng'),'Tổ trưởng');
});

test('19/11 (người dùng: bảng tên GV lệch trái trên điện thoại): phone labels are drawn with the logical 768 × 160 size',()=>{
 const m=readFileSync(new URL('../src/scene/BlenderMuseum.tsx',import.meta.url),'utf8');
 assert.ok(m.includes('W=label?768:384,H=label?160:512;c.width=W*k;c.height=H*k;')&&m.includes('ctx.fillRect(0,0,W,H)')&&m.includes('W/2,label?63:260,W-24')&&m.includes(',W/2,118,W-20)'));
 assert.ok(!/c\.width\/2,label\?63/.test(m),'no physical-size centre');
});

test('19/11 (người dùng: thanh menu dưới to, thô): dải tròn kính mờ, nút 32 px (cảm ứng 38 px), biểu tượng 16 px',()=>{
 const hall=readFileSync(new URL('../src/hall.css',import.meta.url),'utf8');
 assert.ok(hall.includes('.immersive-tour .hall-scene .visitor-dock.hall-dock{gap:2px;padding:3px;border-radius:999px;'));
 assert.ok(hall.includes('.immersive-tour .hall-scene .hall-dock>button{width:32px;min-width:32px;height:32px;')&&hall.includes('.immersive-tour .hall-scene .hall-dock>button svg{width:16px;height:16px;'));
 assert.ok(hall.includes('@media (pointer:coarse){.immersive-tour .hall-scene .hall-dock>button{width:34px;'));
});

test('19/11 (người dùng, ghi nhớ): trình diễn tự động chỉ có cảnh — không ô tiến độ, không cần điều khiển',()=>{
 const t=readFileSync(new URL('../src/scene/HallTour.tsx',import.meta.url),'utf8'),l=readFileSync(new URL('../src/landscape.css',import.meta.url),'utf8');
 assert.ok(!t.includes("'Trình diễn tự động'} · Điểm"),'no “Trình diễn tự động · Điểm x/y” pill');
 assert.ok(t.includes('{ready&&!p.paused&&(!automatic||pause)&&<TwinSticks'),'thumbsticks hidden while the presentation runs');
 assert.ok(l.includes('.immersive-tour .hall-progress{font-size:11px;top:8px;bottom:auto}'),'a status pill never stretches top-to-bottom on a landscape phone');
});

test('19/11 (người dùng): tạm dừng trình diễn → cần điều khiển hiện lại; cần nhỏ hơn, đẩy nhẹ đã đi nhanh hơn',async()=>{
 const {stickVector}=await import('../src/scene/stickInput.mjs');
 const half=stickVector(0,-11,22);assert.ok(-half.y>.55&&-half.y<.65,'half way ≈ 60 % speed');
 assert.equal(Math.round(-stickVector(0,-22,22).y*100),100,'full deflection = full speed');
 assert.equal(stickVector(0,-2,22).y,0,'dead zone kept');
 const css=readFileSync(new URL('../src/portrait.css',import.meta.url),'utf8');
 assert.ok(css.includes('.thumbstick .thumbstick-base{width:76px;height:76px;min-width:76px;min-height:76px}'));
});

test('19/11 (rà chuẩn WCAG 2.2 / Apple HIG): màn cảm ứng vùng chạm 44 px (hình 34 px), nền kính đủ tương phản, ba chấm đặc, cần nổi rõ',()=>{
 const hall=readFileSync(new URL('../src/hall.css',import.meta.url),'utf8'),pc=readFileSync(new URL('../src/portrait.css',import.meta.url),'utf8');
 const dock=readFileSync(new URL('../src/scene/VisitorDock.tsx',import.meta.url),'utf8');
 assert.ok(hall.includes('position:relative;width:44px;min-width:44px;height:44px;min-height:44px;margin:-2px 0;background:transparent;filter:none}'),'44 px touch target');
 assert.ok(hall.includes('.immersive-tour .hall-scene .hall-dock>button::before{content:\'\';position:absolute;inset:5px;border-radius:50%;'),'34 px visible circle');
 assert.ok(hall.includes('background-color:rgba(12,30,40,.52)'),'darker glass: white icons ≥ 4.5:1 on a light ceiling');
 assert.ok(dock.includes("name==='more'&&[5,12,19].map(cx=><circle key={cx} cx={cx} cy=\"12\" r=\"1.9\" fill=\"currentColor\""),'solid dots');
 assert.ok(pc.includes('.thumbstick .thumbstick-base{background:rgba(12,30,40,.38);')&&pc.includes('.thumbstick-knob svg{stroke:#1f4048;stroke-width:1.8}'));
});
