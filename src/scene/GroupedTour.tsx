import {Suspense,lazy,useMemo,useRef,useState} from 'react';
import {createPlan,roomForNode} from './tourPlan.mjs';
import type {TourCommand,GalleryRoom} from './GuidedScene';
import VisitorDock,{TourIcon} from './VisitorDock';
import {neutralInput} from './VisitorController';
import {GROUPS,galleryRooms} from '../data/catalog.mjs';
import type {Person} from '../data/repository';
const Scene=lazy(()=>import('./GuidedScene'));
export default function GroupedTour({people,sort,onSelect,onModule,onList,onNarrate,onSilence,caption,speaking,paused}:{people:Person[];sort:string;onSelect:(id:string)=>void;onModule:(id:number)=>void;onList:()=>void;onNarrate:(text:string)=>void;onSilence:()=>void;caption:string;speaking:boolean;paused:boolean}){
 const rooms=useMemo(()=>galleryRooms(people,sort) as GalleryRoom[],[people,sort]),count=rooms.length,plan=useMemo(()=>createPlan(Math.max(1,count)),[count]);
 const entrance=count>0?'room-0':'lobby';
 const [current,setCurrent]=useState(entrance),[moving,setMoving]=useState(false),[ready,setReady]=useState(false),[effects,setEffects]=useState(true),[failed,setFailed]=useState(false),[tourPaused,setTourPaused]=useState(false),[panelOpen,setPanelOpen]=useState(false),[showCaption,setShowCaption]=useState(false);
 const [command,setCommand]=useState<TourCommand>({serial:0,from:entrance,to:entrance});
 const host=useRef<HTMLElement>(null),input=useRef(neutralInput());
 const room=roomForNode(current),active=rooms[room];
 const go=(to:string)=>{if(moving||!ready||!plan.nodes[to])return;setTourPaused(false);setMoving(to!==current);setCommand(c=>({serial:c.serial+1,from:current,to}));};
 const arrived=(id:string)=>{setCurrent(id);setMoving(false);};
 function audio(){if(showCaption){onSilence();setShowCaption(false);}else{setShowCaption(true);onNarrate(active?'Mời tham quan '+active.groupName+'. Phòng này có '+active.people.length+' hồ sơ giả lập.':'Mời tham quan cán bộ quản lý, các thế hệ nhà giáo và đội ngũ nhân viên. Đây là dữ liệu mẫu.');}}
 return <div className="guided-tour immersive-tour">
  <section className="scene-shell guided-scene" ref={host} aria-label="Không gian tham quan 3D" data-panel-open={panelOpen}>
   <div className="location-chip" aria-live="polite"><span className={moving?'location-dot walking':'location-dot'}/><span>{!ready?'Đang tải…':moving?(tourPaused?'Tạm dừng':'Đang di chuyển'):room<0?(current.startsWith('hall')?'Hành lang':'Sảnh chính'):'Phòng '+(room+1)}</span><span className="location-period">{active?.groupName||'Phòng truyền thống'}</span></div>
   <button className="visitor-fullscreen" title="Toàn màn hình" aria-label="Toàn màn hình" onClick={()=>{if(document.fullscreenElement)void document.exitFullscreen();else void host.current?.requestFullscreen();}}><TourIcon name="fullscreen"/></button>
   <Suspense fallback={<p className="loading">Đang chuẩn bị không gian…</p>}>
    <Scene plan={plan} command={command} rooms={rooms} current={current} moving={moving} effects={effects} paused={paused||tourPaused} input={input} onRegion={setCurrent} onArrive={arrived} onMotion={setMoving} onSelect={onSelect} onGo={go} onModule={onModule} onReady={()=>{setReady(true);setFailed(false);}} onLost={()=>{setFailed(true);setReady(false);}}/>
   </Suspense>
   {command.serial===0&&!panelOpen&&!paused&&ready&&<div className="floor-discovery-hint">Chạm vòng tròn trên sàn để bước tới</div>}
   <VisitorDock input={input} rooms={rooms} room={room} ready={ready&&count>0} moving={moving} paused={tourPaused} blocked={paused} effects={effects} speaking={showCaption} caption={showCaption?caption:''} onGo={go} onStart={()=>go('room-0')} onPause={()=>setTourPaused(v=>!v)} onEffects={()=>setEffects(v=>!v)} onList={onList} onAudio={audio} onFullscreen={()=>{if(document.fullscreenElement)void document.exitFullscreen();else void host.current?.requestFullscreen();}} onSelect={onSelect} onPanel={setPanelOpen} onModule={onModule}/>
   {failed&&<p className="visitor-error" role="alert">Mất WebGL. Mở Danh sách hồ sơ để tiếp tục.</p>}
  </section>
 </div>;
}
