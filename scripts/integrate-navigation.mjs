import fs from 'node:fs';
let s=fs.readFileSync('src/scene/GuidedScene.tsx','utf8');
s=s.replace("import {Suspense,useEffect,useMemo,useRef} from 'react';","import {Suspense,useEffect,useMemo} from 'react';\nimport type {MutableRefObject} from 'react';\nimport VisitorController from './VisitorController';\nimport type {NavigationInput} from './VisitorController';");
const start=s.indexOf('function CameraWalk('),end=s.indexOf('function Guard(',start);
if(start<0||end<0)throw Error('Old camera boundaries missing');
s=s.slice(0,start)+s.slice(end);
s=s.replace('onReady:()=>void;onLost:()=>void};','onReady:()=>void;onLost:()=>void;input:MutableRefObject<NavigationInput>;onRegion:(id:string)=>void};');
s=s.replace('onGo,onModule,onReady,onLost}=props','onGo,onModule,onReady,onLost,input,onRegion}=props');
s=s.replace(/    <Html center position=\{\[0,3\.58,-5\.48\]\}.*?<\/Html>\n/,'');
s=s.replace('>{label}</button></Html>',' aria-label={label} title={label} data-label={label}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 14 5-5 5 5" fill="none" stroke="currentColor" strokeWidth="2"/></svg></button></Html>');
s=s.replace('<CameraWalk plan={plan} command={command} paused={paused} effects={effects} onArrive={onArrive} onMotion={onMotion}/>','<VisitorController plan={plan} command={command} paused={paused} effects={effects} onArrive={onArrive} onMotion={onMotion} input={input} loadedRooms={visibleRooms} onRegion={onRegion}/>');
fs.writeFileSync('src/scene/GuidedScene.tsx',s,'utf8');
s=fs.readFileSync('src/scene/GuidedTour.tsx','utf8');
s=s.replace("import {repository,type Period}","import NavigationDock from './NavigationDock';\nimport {neutralInput} from './VisitorController';\nimport {repository,type Period}");
s=s.replace(' const host=useRef<HTMLElement>(null);',' const host=useRef<HTMLElement>(null);\n const input=useRef(neutralInput());\n const [tourPaused,setTourPaused]=useState(false),[mapOpen,setMapOpen]=useState(false);');
s=s.replace('paused={paused} onArrive=', 'paused={paused||tourPaused} input={input} onRegion={setCurrent} onArrive=');
const badgeStart=s.indexOf('   <div className="scene-label">'),badgeEnd=s.indexOf('\n   <button className="fullscreen-button"',badgeStart);
s=s.slice(0,badgeStart)+`   <div className="location-chip" aria-live="polite"><span className={moving?'location-dot walking':'location-dot'}/><span>{!ready?'Đang tải…':moving?'Đang tham quan':room<0?(current.startsWith('hall')?'Hành lang':'Sảnh chính'):'Phòng '+(room+1)}</span><span className="location-period">{period.name} · {period.years}</span></div>`+s.slice(badgeEnd);
s=s.replace('   <div className="scene-help">{moving?\'Đang đi theo lối tham quan an toàn…\':\'Kéo / vuốt để nhìn quanh · Nhấn điểm trên sàn để đi · Nhấn ảnh để mở hồ sơ\'}</div>',`   <NavigationDock input={input} ready={ready} moving={moving} paused={tourPaused} room={room} canPrevious={room>0} canNext={room+1<count} onHome={()=>go('lobby')} onPrevious={()=>go('room-'+(room-1))} onNext={()=>go('room-'+(room+1))} onStart={()=>go('room-0')} onPause={()=>setTourPaused(v=>!v)} onMap={()=>setMapOpen(v=>!v)}/>
   {tourPaused&&<div className="tour-pause-badge" role="status">Đang tạm dừng</div>}
   {mapOpen&&<aside className="mini-room-map"><div><b>Sơ đồ tham quan</b><button aria-label="Đóng sơ đồ" onClick={()=>setMapOpen(false)}>×</button></div><button disabled={moving} onClick={()=>{go('lobby');setMapOpen(false);}}>Sảnh chính</button><div className="mini-map-rooms">{Array.from({length:count},(_,i)=><button key={i} disabled={moving} aria-current={room===i?'location':undefined} onClick={()=>{go('room-'+i);setMapOpen(false);}}>Phòng {i+1}</button>)}</div><small>Nhấn để đi theo lối dẫn đến phòng.</small></aside>}`);
s=s.replace('const go=(to:string)=>{if(moving||!ready||!plan.nodes[to])return;setMoving','const go=(to:string)=>{if(moving||!ready||!plan.nodes[to])return;setTourPaused(false);setMoving');
fs.writeFileSync('src/scene/GuidedTour.tsx',s,'utf8');

