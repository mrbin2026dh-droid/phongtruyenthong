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

test('Entry waits for a tap ON THE DOOR; the plaque names the school; Về cổng vào closes the doors',()=>{
 const tour=readFileSync(new URL('../src/scene/HallTour.tsx',import.meta.url),'utf8');
 const doors=readFileSync(new URL('../src/scene/EntranceDoors.tsx',import.meta.url),'utf8');
 assert.ok(ARRIVAL_START[2]>8.9&&ARRIVAL_START[2]<13.3&&Math.abs(ARRIVAL_START[0])<4.1,'stands in the foyer (16/11: in front of the statue niche)');
 const has=(src,s)=>assert.ok(src.includes(s),'missing: '+s);
 has(tour,'if(benchOn)openDoor();else setAtDoor(true);');assert.ok(!tour.includes('seen)openDoor'),'no auto-open on repeat visits');
 assert.ok(!tour.includes('className="hall-door-prompt" onClick={openDoor}'),'16/11: no full-screen tap area opens the door (tapping the statue opened it)');
 has(tour,'onOpenDoor={openDoor}');
 has(doors,"<group onClick={e=>{if(!waiting||!onOpen)return;e.stopPropagation();onOpen();}}");
 has(doors,'<Html position={DOOR_CENTER as [number,number,number]} center');has(doors,'className="door-open-label" onClick={onOpen}');
 has(tour,"current==='gate'&&!atDoor){door.current.target=0;");
 has(doors,"['UBND XÃ ĐĂK HÀ','TRƯỜNG THCS CHU VĂN AN','PHÒNG TRUYỀN THỐNG']");
 has(doors,'gl.localClippingEnabled=true');has(doors,'new Plane(new Vector3(-side,0,0),DOOR_JAMB)');
 assert.ok(!doors.includes('position={[doorOffset'),'leaf position is driven by useFrame only');
});

test('Anti-flicker: wall headings stay visible, portraits use hysteresis and keep the previous image while loading',()=>{
 const hall=readFileSync(new URL('../src/scene/HallScene.tsx',import.meta.url),'utf8');
 const photo=readFileSync(new URL('../src/scene/HallPhoto.tsx',import.meta.url),'utf8');
 assert.ok(!/ref\.current\.visible=full/.test(hall));assert.ok(hall.includes('return d<(cur>=1?8.5:6.5)?1:0;'),'near/far hysteresis kept (16/11 tiers)');
 assert.match(photo,/if\(target\.loaded\|\|!shown\.current\.e\.loaded\)shown\.current=/);
 assert.ok(hall.includes('<EntranceDoors door={p.door} waiting={Boolean(p.atDoor&&!p.intro)} onOpen={p.onOpenDoor}/>'));
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
 assert.ok(tour.includes('controlsLocked={automatic||atDoor}'),'keys / drag / wheel locked while at the door');
 assert.ok(tour.includes('!doorOpening&&!arriving&&!moving&&'),'mode chooser waits until the visitor has arrived');
 assert.ok(ctl.includes('if(!atDoor||motion.current.running)return;if(intro)startIntro();else{pan.current.active=false;frameDoor();}'),'gate pose re-asserted');assert.ok(ctl.includes("addEventListener('museum-door-reframe',fn)"),'dev reframe hook');
 assert.ok(ctl.includes('Number.isFinite(camera.position.x+camera.position.y+camera.position.z'),'NaN safety net');
 assert.ok(!doors.includes('11.11'),'temporary end wall removed (the baked foyer has its own end wall)');
 assert.ok(doors.includes('d.target===0&&d.value===0&&performance.now()-t0<15000)invalidate();'),'refresh frames while waiting');
});

test('Foyer: plaque on the facade; the visit starts at the H2 view — door left, statue niche ahead, glass right (16/11)',async()=>{
 const {gateLook,arrivalFov,PLAQUE,ARRIVAL_START,DOOR_CENTER}=await import('../src/scene/hallArrival.mjs');
 const {MONUMENT,isWalkable}=await import('../src/scene/hallLayout.mjs');
 const doors=readFileSync(new URL('../src/scene/EntranceDoors.tsx',import.meta.url),'utf8');
 assert.ok(PLAQUE.x-PLAQUE.w/2>2.21+.05&&PLAQUE.x+PLAQUE.w/2<4.54-.05,'plaque fits on the right facade panel (x 2.21–4.54)');
 assert.ok(!/plaqueHalf|repeat\.set\(\.5,1\)/.test(doors),'no split plaque on the sliding leaves');
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
 assert.ok(tour.includes('{ready&&!atDoor&&!doorOpening&&!arriving&&!moving&&!p.paused&&!panel&&!closeup&&<TwinSticks input={input} onEngage={enterManual}/>}'),'also hidden during a portrait close-up (16/11)');
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
 assert.ok(tour.includes('revealTimer.current=setTimeout(()=>{')&&!tour.includes('return()=>clearTimeout(timer);},[sceneReady,assetsLoaded,assetTimeout]);'));
 assert.ok(tour.includes('useEffect(()=>()=>clearTimeout(revealTimer.current),[]);'),'only unmount cancels it');
 assert.ok(assets.includes('queueMicrotask('),'subscribers are notified after render');
});
