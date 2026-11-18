import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {doorOffset,doorInnerEdge,doorStep,entryDelayMs,DOOR_JAMB,DOOR_LEAF,DOOR_SECONDS} from '../src/scene/doorMotion.mjs';
import {ARRIVAL_START} from '../src/scene/hallArrival.mjs';

test('Sliding doors: closed leaves meet at the centre, open leaves are fully past the jamb (inside the wall)',()=>{
 for(const side of [-1,1]){
  assert.equal(doorOffset(side,0),side*DOOR_LEAF);assert.equal(doorInnerEdge(side,0),0);
  assert.ok(Math.abs(doorInnerEdge(side,1))>DOOR_JAMB,'inner edge hidden at '+doorInnerEdge(side,1));
  assert.ok(Math.abs(doorInnerEdge(side,.1))<.1*DOOR_LEAF*.5,'starts slowly (eased)');
  assert.equal(doorOffset(side,2),doorOffset(side,1));
 }
 let v=0,t=0;while(v<1&&t<10){v=doorStep(v,1,1/60);t+=1/60;}assert.ok(Math.abs(t-DOOR_SECONDS)<.05);
 assert.ok(doorStep(.5,0,10)>.4,'a long idle gap must not jump the doors (demand frameloop)');
 assert.ok(doorStep(0,1,25)<.08,'first frame after waiting at the door moves only one frame step');
});

test('Visitor waits for the doors unless reduced motion, bench or effects off',()=>{
 assert.ok(entryDelayMs()>600&&entryDelayMs()<DOOR_SECONDS*1000);
 assert.equal(entryDelayMs({reducedMotion:true}),0);assert.equal(entryDelayMs({bench:true}),0);assert.equal(entryDelayMs({effects:false}),0);
});

test('Entry waits for a tap ON THE DOOR; the sign above it names the school; Về cổng vào closes the doors',()=>{
 const tour=readFileSync(new URL('../src/scene/HallTour.tsx',import.meta.url),'utf8');
 const doors=readFileSync(new URL('../src/scene/EntranceDoors.tsx',import.meta.url),'utf8');
 assert.ok(ARRIVAL_START[2]>8.9&&ARRIVAL_START[2]<13.3&&Math.abs(ARRIVAL_START[0])<4.1,'stands in the foyer (16/11: in front of the statue niche)');
 const has=(src,s)=>assert.ok(src.includes(s),'missing: '+s);
 has(tour,'if(benchOn)openDoor();else{setAtDoor(true);setManual(true);}');assert.ok(!tour.includes('seen)openDoor'),'no auto-open on repeat visits');
 assert.ok(!tour.includes('className="hall-door-prompt" onClick={openDoor}'),'16/11: no full-screen tap area opens the door (tapping the statue opened it)');
 has(tour,'onOpenDoor={openDoor}');
 has(doors,"<group onClick={e=>{if(!waiting||!onOpen||e.delta>8)return;e.stopPropagation();onOpen();}}");
 has(doors,'<Html position={DOOR_CENTER as [number,number,number]} center');has(doors,'className="door-open-label door-open-sr" onClick={onOpen}');has(doors,'material={m.plate}');   // 18/11: push plates on the leaves; the round button stays for keyboard/screen readers
 has(tour,"current==='gate'&&!atDoor){door.current.target=0;");
 has(doors,"export const DOOR_SIGN_LINES=['PHÒNG TRUYỀN THỐNG',");
 has(doors,'gl.localClippingEnabled=true');has(doors,'new Plane(new Vector3(-side,0,0),DOOR_JAMB)');
 assert.ok(!doors.includes('position={[doorOffset'),'leaf position is driven by useFrame only');
});

test('Anti-flicker: wall headings stay visible, portraits use hysteresis and keep the previous image while loading',()=>{
 const hall=readFileSync(new URL('../src/scene/HallScene.tsx',import.meta.url),'utf8');
 const photo=readFileSync(new URL('../src/scene/HallPhoto.tsx',import.meta.url),'utf8');
 assert.ok(!/ref\.current\.visible=full/.test(hall));assert.ok(hall.includes('return d<(cur>=1?8.5:6.5)?1:0;'),'near/far hysteresis kept (16/11 tiers)');
 assert.match(photo,/if\(target\.loaded\|\|!shown\.current\.e\.loaded\)shown\.current=/);
 assert.ok(hall.includes('<EntranceDoors door={p.door} waiting={Boolean(p.atDoor&&!p.intro)} onOpen={p.onOpenDoor} canClose={Boolean(p.canCloseDoor)} onClose={p.onCloseDoor}/>'));
 assert.ok(readFileSync(new URL('../src/scene/HallTour.tsx',import.meta.url),'utf8').includes("onCloseDoor={()=>go('gate')}"),'18/11: the wall switch takes the visitor back to the door, which closes');
 assert.ok(readFileSync(new URL('../src/scene/EntranceDoors.tsx',import.meta.url),'utf8').includes("mode={waiting&&onOpen?'open':canClose&&onClose?'close':'off'}"),'18/11: one switch opens a closed door and closes an open one');
 assert.ok(!/rotation=\{\[0,side\*1\.50,0\]\}/.test(hall),'static open leaves removed');
});

test('A pause caused by a hidden tab is lifted when the visitor comes back; a manual pause is kept',()=>{
 const tour=readFileSync(new URL('../src/scene/HallTour.tsx',import.meta.url),'utf8');
 assert.match(tour,/if\(document\.hidden\)\{autoPaused\.current=true;setPause\(true\)/);
 assert.match(tour,/else if\(autoPaused\.current\)\{autoPaused\.current=false;setPause\(false\);\}/);
 assert.match(tour,/\(\)=>\{autoPaused\.current=false;if\(automatic\|\|moving\)setPause/);
});

test('Portraits fill their frames: 3D leadership photo covers the brass opening; profile image uses cover',()=>{
 const hall=readFileSync(new URL('../src/scene/HallScene.tsx',import.meta.url),'utf8');
 const css=readFileSync(new URL('../src/style.css',import.meta.url),'utf8');
 // 16/11: the old rule left the photo up to 1.4 cm short of the opening (gap) — superseded by tests/photoFit.test.mjs
 assert.ok(hall.includes("photoSize(slot.width||.55,slot.height||.735)"),"shared photo/frame size rule");
 assert.match(css,/\.profile img\{width:100%;aspect-ratio:2\/3;object-fit:cover;/);
});

test('Frames are 2.2 cm deep with the photo set inside them; doors reach the lintel',()=>{
 const hall=readFileSync(new URL('../src/scene/HallScene.tsx',import.meta.url),'utf8');
 const doors=readFileSync(new URL('../src/scene/EntranceDoors.tsx',import.meta.url),'utf8');
 assert.ok(hall.includes('local.makeScale(w,h,.022);local.setPosition(x,y,.011);'));
 assert.ok(hall.includes('<mesh position={[0,0,principal ? .016 : .015]}>'),'photo sits inside the bars (front face z .022)');
 assert.ok(hall.includes("metalness:.35,roughness:.48"));
 assert.ok(doors.includes('[2.02,3.34,.08]'));
});

test('Waiting at the door can never show an empty frame (user report 15/11)',()=>{
 const tour=readFileSync(new URL('../src/scene/HallTour.tsx',import.meta.url),'utf8');
 const ctl=readFileSync(new URL('../src/scene/HallController.tsx',import.meta.url),'utf8');
 const doors=readFileSync(new URL('../src/scene/EntranceDoors.tsx',import.meta.url),'utf8');
 assert.ok(tour.includes('controlsLocked={automatic||(atDoor&&intro&&effects)||doorOpening}'),'16/11: foyer walkable — locked only during the opening shot and the door turn');
 assert.ok(!tour.includes('className="hall-intro"'),'16/11: no mode chooser at all');
 assert.ok(ctl.includes('if(!atDoor||motion.current.running)return;if(intro)startIntro();else{pan.current.active=false;frameDoor();}'),'gate pose re-asserted');assert.ok(ctl.includes("addEventListener('museum-door-reframe',fn)"),'dev reframe hook');
 assert.ok(ctl.includes('Number.isFinite(camera.position.x+camera.position.y+camera.position.z'),'NaN safety net');
 assert.ok(!doors.includes('11.11'),'temporary end wall removed (the baked foyer has its own end wall)');
 assert.ok(doors.includes('d.target===0&&d.value===0&&performance.now()-t0<15000)invalidate();'),'refresh frames while waiting');
});

test('Foyer: school sign above the door; the visit starts at the H2 view — door left, statue niche ahead, glass right (16/11)',async()=>{
 const {gateLook,arrivalFov,DOOR_SIGN,ARRIVAL_START,DOOR_CENTER}=await import('../src/scene/hallArrival.mjs');
 const {MONUMENT,isWalkable}=await import('../src/scene/hallLayout.mjs');
 const doors=readFileSync(new URL('../src/scene/EntranceDoors.tsx',import.meta.url),'utf8');
 const {y,frame}=DOOR_SIGN;
 assert.ok(y-frame.h/2>3.465+.01&&y+frame.h/2<3.95-.02,'16/11 (H3): sign fits between the portal soffit and the ceiling');
 assert.ok(frame.w>4.42&&frame.w<2*2.21+.6,'sign spans the door portal, centred (x = 0)');
 assert.ok(!/FacadePlaque|plaqueTexture|UBND XÃ/.test(doors),'the plaque right of the door is gone');
 assert.ok(doors.includes("'PHÒNG TRUYỀN THỐNG','TRƯỜNG THCS CHU VĂN AN – ĐĂK HÀ – QUẢNG NGÃI'"),'sign text (user, 16/11)');
 const sign=readFileSync(new URL('../src/scene/GildedSign.tsx',import.meta.url),'utf8');
 assert.ok(doors.includes('<GildedSign spec={DOOR_SIGN_SPEC} position={[0,DOOR_SIGN.y,FACADE_Z]}/>'),'door sign uses the shared gilded sign');
 assert.ok(sign.includes('700 ${s}px "Noto Serif"')&&sign.includes("#17383e")&&sign.includes('const W=4096'),'motto style: gilded serif on deep teal, 4096 px');
 assert.ok(isWalkable(ARRIVAL_START)&&ARRIVAL_START[0]<-3,'waits on the left side of the foyer');
 const bearing=(aspect,p)=>{const t=gateLook(aspect),yaw=Math.atan2(t[2]-ARRIVAL_START[2],t[0]-ARRIVAL_START[0]);let b=Math.atan2(p[2]-ARRIVAL_START[2],p[0]-ARRIVAL_START[0])-yaw;return Math.atan2(Math.sin(b),Math.cos(b));};
 const half=(a,v)=>Math.atan(Math.tan(v/2*Math.PI/180)*a);
 const niche=[MONUMENT.niche.wallX,1.4,MONUMENT.z],glass=[4.54,1.5,13.6];
 assert.equal(arrivalFov(1.6),70,'H2 was solved at 70° (rms 12 px)');assert.equal(arrivalFov(.57),78);
 for(const [a,v] of [[1.19,70],[1.6,70],[2.2,70],[2.5,70]]){
  for(const [n,p] of [['door',DOOR_CENTER],['niche',niche],['glass corner',glass]])assert.ok(Math.abs(bearing(a,p))<half(a,v),n+' in view at '+a);
  assert.ok(bearing(a,DOOR_CENTER)<0&&bearing(a,glass)>bearing(a,niche),'door left, niche, glass right');
 }
 for(const a of [.46,.57])assert.ok(Math.abs(bearing(a,DOOR_CENTER))<half(a,arrivalFov(a))*.7,'portrait phone: the door and its label sit well inside the frame');
 assert.ok(doors.includes('probe=useMemo(()=>new Vector3(...DOOR_CENTER),[])'),'dev guard watches the door');
});

test('Root cause of the blank door screen: the full-scene tap overlay stays transparent on hover/focus',()=>{
 const css=readFileSync(new URL('../src/hall.css',import.meta.url),'utf8');
 const style=readFileSync(new URL('../src/style.css',import.meta.url),'utf8');
 assert.ok(style.includes('button:hover,.button:hover{background:#eee1c9}'),'global hover style exists (the culprit)');
 const rule=css.slice(css.indexOf('.hall-scene .hall-door-prompt,'));
 for(const st of [':hover',':focus',':focus-visible',':active'])assert.ok(rule.split('{')[0].includes('.hall-scene .hall-door-prompt'+st),'covers '+st);
 assert.ok(/\{[^}]*background:transparent;box-shadow:none;outline:none/.test(rule),'see-through in every state');
});

test('Scene is revealed only after the room, statue and all portraits have loaded (user report 15/11, image 2)',()=>{
 const tour=readFileSync(new URL('../src/scene/HallTour.tsx',import.meta.url),'utf8');
 const photo=readFileSync(new URL('../src/scene/HallPhoto.tsx',import.meta.url),'utf8');
 const baked=readFileSync(new URL('../src/scene/BakedHall.tsx',import.meta.url),'utf8');
 const statue=readFileSync(new URL('../src/scene/ChuVanAnStatue.tsx',import.meta.url),'utf8');
 assert.ok(tour.includes("bakedEnabled()?['baked','statue']:['statue']"));
 assert.ok(tour.includes('if(!sceneReady||!(assetsLoaded||(assetTimeout&&modelsReady))||revealed.current)return;'),'waits for assets (30 s safety skips portraits only, 15/11)');
 assert.ok(photo.includes('queueMicrotask(()=>{if(!settled)release=imageStarted();});')&&photo.includes('img.onload=()=>{finished();'),'portraits counted (registered after render, 16/11)');
 {const probes=readFileSync(new URL('../src/scene/RoomProbes.tsx',import.meta.url),'utf8'),hall=readFileSync(new URL('../src/scene/HallScene.tsx',import.meta.url),'utf8');
  assert.ok(probes.includes('if(!loaded||captured.current)return;'),'probes captured once, not on every later portrait load (BGH flicker 16/11)');
  assert.ok(photo.includes('PHOTO_LOD_BIAS=-0.6')&&photo.includes('c.imageSmoothingQuality="high"'),'sharp portraits: LOD bias + high-quality downscale');
  assert.ok(hall.includes('useState<PhotoTier>(principal?2:0)')&&hall.includes('if(principal)return;'),'Ban Giám hiệu portraits always sharp');}
 assert.ok(baked.includes("markAssetReady('baked')")&&statue.includes("markAssetReady('statue')"));
});

test('Walking sticks are always offered inside the room; touching one switches to walking mode (image 3)',()=>{
 const tour=readFileSync(new URL('../src/scene/HallTour.tsx',import.meta.url),'utf8');
 const sticks=readFileSync(new URL('../src/scene/TwinSticks.tsx',import.meta.url),'utf8');
 assert.ok(tour.includes('{ready&&!p.paused&&<TwinSticks input={input} onEngage={engageStick}/>}'),'16/11 (user): always on screen — foyer, door, walking, presentation');
 assert.ok(tour.includes("const engageStick=()=>{if(atDoor&&intro&&effects){window.dispatchEvent(new Event('museum-intro-skip'));return;}if(doorOpening||arriving)return;enterManual();};"),'touch: skip the opening shot / take over; ignored while the door opens');
 const ctl=readFileSync(new URL('../src/scene/HallController.tsx',import.meta.url),'utf8');
 assert.ok(ctl.includes('const k=live.current.controlsLocked?0:1;')&&ctl.includes('const f=k*n.forward+'),'sticks inert while controls are locked');
 assert.ok(!tour.includes('{manual&&!moving&&!p.paused&&!panel&&<TwinSticks'),'no longer hidden behind the Tự bước button');
 assert.ok(sticks.includes('onEngage?.();'));
});

test('Establishing shot: look over the schoolyard, then turn to the door; skippable; off for reduced motion',()=>{
 const ctl=readFileSync(new URL('../src/scene/HallController.tsx',import.meta.url),'utf8');
 const tour=readFileSync(new URL('../src/scene/HallTour.tsx',import.meta.url),'utf8');
 assert.ok(ctl.includes('INTRO_LOOK:[number,number,number]=[.8,.9,22]')&&ctl.includes('camera.quaternion.slerpQuaternions(p.from,p.to,e)')&&ctl.includes('const INTRO_PAN=3.6;'),'yard → statue straight on (16/11)');
 assert.ok(ctl.includes("window.dispatchEvent(new Event('museum-intro-done'))")&&ctl.includes("addEventListener('museum-intro-skip',skip)"));
 assert.ok(tour.includes('useState(()=>!reducedMotion())')&&tour.includes('intro={atDoor&&intro&&effects}'));
 assert.ok(ctl.includes('p.t=(performance.now()-p.start)/1000-p.hold')&&ctl.includes('if(t>=p.dur){if(p.intro)endIntro();')&&ctl.includes('setTimeout(()=>endIntro(),(INTRO_HOLD+INTRO_PAN+1.5)*1000)'),'intro ends on time even in a throttled tab');
});

test('Loading screen cannot get stuck: the reveal timer survives later asset changes; asset events never fire during render',()=>{
 const tour=readFileSync(new URL('../src/scene/HallTour.tsx',import.meta.url),'utf8');
 const assets=readFileSync(new URL('../src/scene/sceneAssets.ts',import.meta.url),'utf8');
 assert.ok(tour.includes('revealTimer.current=setTimeout(reveal,')&&!tour.includes('return()=>clearTimeout(timer);},[sceneReady,assetsLoaded,assetTimeout]);'));
 assert.ok(tour.includes('useEffect(()=>()=>clearTimeout(revealTimer.current),[]);'),'only unmount cancels it');
 assert.ok(assets.includes('setTimeout(()=>{queued=false;subs.forEach(fn=>fn());},0)'),'17/11: subscribers notified once per macrotask, after render and outside React’s sync flush (no update-depth loop)');
});

test('16/11 (user): the visit always opens in manual mode — no auto/explore chooser; ▶ still starts the presentation',()=>{
 const tour=readFileSync(new URL('../src/scene/HallTour.tsx',import.meta.url),'utf8');
 assert.ok(!tour.includes('className="hall-intro"'),'no “Trình diễn tự động / Tự khám phá” chooser');
 assert.ok(!tour.includes('setChooseMode(true)'),'never re-shown (gate, re-entry)');
 assert.ok(tour.includes("const entered=arriving&&id==='entrance'")&&tour.includes('if(entered){setCommand(c=>({serial:c.serial+1,from:id,to:id,manual:true}));setManual(true);}'),'arriving through the door turns Tự bước on');
 assert.ok(tour.includes("'Trình diễn tự động',automatic||moving"),'▶ keeps the automatic presentation');
});

test('16/11 (user): statue room — sign over the portal, clean teal backdrop, crisp gilded titles',async()=>{
 const scene=readFileSync(new URL('../src/scene/HallScene.tsx',import.meta.url),'utf8');
 const {STATUE_ROOM:R}=await import('../src/scene/hallLayout.mjs');
 assert.ok(scene.includes("{text:'PHÒNG TRƯNG BÀY TƯỢNG PHÁC THẢO'")&&scene.includes("{text:'THẦY GIÁO CHU VĂN AN'"),'sign text');
 const y=3.32,h=.46;assert.ok(y-h/2>R.opening.height+.14+.1&&y+h/2<3.95-.2,'between the portal head (2.94 m) and the foyer ceiling');
 assert.ok(scene.includes('<GildedSign spec={STATUE_SIGN_SPEC} position={[R.opening.wallX,3.32,M.z]} rotation={-Math.PI/2}/>'),'on the foyer face of the wall, facing the foyer');
 // layers in front of the baked teal face (x1 − 0.06): fabric 8 mm, titles 18 mm — never coplanar
 assert.ok(scene.includes('<mesh position={[R.x1-.068,1.62,M.z]}')&&scene.includes('<group position={[R.x1-.078,2.62,M.z]}'));
 assert.ok(!/TealBackdrop[\s\S]{0,1500}rand\(\)/.test(scene),'no random noise in the backdrop (regular weave only)');
 assert.ok(scene.includes('text="VẠN THẾ SƯ BIỂU" width={2.0} height={.26} light centered hires'),'title drawn at 4096 px, no glow');
});

test('16/11 (user): manual walking (Tự bước) from the foyer — the closed door blocks the doorway, opens from anywhere',async()=>{
 const tour=readFileSync(new URL('../src/scene/HallTour.tsx',import.meta.url),'utf8');
 const ctl=readFileSync(new URL('../src/scene/HallController.tsx',import.meta.url),'utf8');
 const doors=readFileSync(new URL('../src/scene/EntranceDoors.tsx',import.meta.url),'utf8');
 assert.ok(tour.includes('else{setAtDoor(true);setManual(true);}')&&tour.includes('setAtDoor(true);setManual(true);window'),'Tự bước on at first arrival and back at the gate');
 assert.ok(tour.includes('controlsLocked={automatic||(atDoor&&intro&&effects)||doorOpening}'),'foyer controls unlocked (except the opening shot / door turning)');
 assert.ok(tour.includes('aria-pressed={manual} disabled={p.paused||!ready||doorOpening}'),'Tự bước button enabled in the foyer');
 assert.ok(doors.includes('DOOR_GATE.closed=Boolean(d&&d.target===0);')&&doors.includes('e.delta>8'),'door state gates walking; a look-drag over the door does not open it');
 assert.ok(ctl.includes("routeFromPosition(plan,here,command.from==='arrival'?'entrance':command.to)"),'walks in from wherever the visitor stands');
 const {DOOR_GATE,slideStep}=await import('../src/scene/hallMotion.mjs');
 DOOR_GATE.closed=true;
 const stop=slideStep([0,1.7,9.3],[0,0,-1.5],0,[]);assert.ok(stop[2]>8.9,'closed door: cannot walk through');
 const side=slideStep([0,1.7,11.1],[1.0,0,0],0,[]);assert.ok(side[0]>.9,'free to walk across the foyer');
 DOOR_GATE.closed=false;
 const through=slideStep([0,1.7,9.3],[0,0,-1.5],0,[]);assert.ok(through[2]<8.9,'open door: walk through');
});

test('17/11: floor stop markers and the control dock step aside while the visitor moves',()=>{
 const tour=readFileSync(new URL('../src/scene/HallTour.tsx',import.meta.url),'utf8');
 const scene=readFileSync(new URL('../src/scene/HallScene.tsx',import.meta.url),'utf8');
 const way=readFileSync(new URL('../src/scene/Wayfinding.tsx',import.meta.url),'utf8');
 assert.ok(tour.includes('hideMarkers={navBusy||!markersOn}')&&tour.includes('setTimeout(()=>setMarkersOn(false),6000)'),'markers hide while moving and 6 s after stopping');
 assert.ok(scene.includes('||Boolean(p.hideMarkers)}/>'),'HallScene passes hideMarkers to StopMarkers');
 assert.ok(way.includes('.sort((a,b)=>a.d-b.d).slice(0,3)'),'only the 3 nearest stops');
 assert.ok(tour.includes("'visitor-controls'+(dockHidden?' is-hidden':'')"),'dock slides away while moving');
 assert.ok(!readFileSync(new URL('../src/scene/EntranceDoors.tsx',import.meta.url),'utf8').includes('>Chạm để mở cửa</button>'),'door shows an icon, not text');
});
