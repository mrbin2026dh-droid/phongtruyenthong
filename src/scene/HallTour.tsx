import {screenGrab} from './screenGrab';
import {useSyncExternalStore} from 'react';
import {Suspense,lazy,useMemo,useRef,useState,useEffect} from 'react';
import {layoutHall,createHallPlan,fitHallStops,closeupStop,closeupOrder,FRONT_SCREEN,baseStopId} from './hallLayout.mjs';
import {nextPresentationStop,presentationDwell} from './hallPresentation.mjs';
import {hallPreview} from './hallPreview.mjs';
import Dialog from '../components/Dialog';
// Admin tools are compiled only into the local dev server; the public build contains none of them.
const AdminLogin=import.meta.env.DEV?lazy(()=>import('../components/AdminLogin')):null;
const AdminSlotEditor=import.meta.env.DEV?lazy(()=>import('../components/AdminSlotEditor')):null;
const AdminPublish=import.meta.env.DEV?lazy(()=>import('../components/AdminPublish')):null;
const AdminArrange=import.meta.env.DEV?lazy(()=>import('../components/AdminArrange')):null;
const AdminGallery=import.meta.env.DEV?lazy(()=>import('../components/AdminGallery')):null;
import {isAdmin,signOut,subscribeAdmin} from '../data/adminAuth';
import {exhibitSlots} from '../data/exhibitSlots.mjs';
import HallLoading from './HallLoading';
import VirtualHost from '../components/VirtualHost';
import {hallNarration} from '../data/narration.mjs';
import {portraitPath,adminAvailable,publishedPeople,catalog,gallery,galleryURL} from '../data/repository';
import GalleryViewer from '../components/GalleryViewer';
import {GALLERY_CATS,captionLine} from '../data/gallery.mjs';
import {neutralInput} from './VisitorController';
import type {VisitorPose,RouteState} from './HallController';
import YouAreHere from './YouAreHere';
import BenchPanel,{deviceInfo} from './BenchPanel';
import type {BenchResult} from './BenchPanel';
import {QUALITY_CHOICES,QUALITY_LEVELS,initialLevel,benchRoute,benchSummary} from './quality.mjs';
import {bakedEnabled,bakedVariant} from './BakedHall';
import type {DoorState} from './EntranceDoors';
import {entryDelayMs,DOOR_SECONDS,FACE_DOOR_MS} from './doorMotion.mjs';
import {startHallSound,stopHallSound,resumeHallSound,duckHallMusic,doorSound,soundEnabled,setSoundEnabled,subscribeSound} from './hallAudio';
const DOOR_KEY='museum-door-opened';
import {statsEnabled} from './SceneStats';

const QUALITY_KEY='hall-quality-choice';
function storedChoice(){try{const v=localStorage.getItem(QUALITY_KEY);return QUALITY_CHOICES.some(c=>c.id===v)?v as string:'auto';}catch{return 'auto';}}
function startLevel(){try{const nav=navigator as Navigator&{deviceMemory?:number};return initialLevel({coarse:matchMedia('(pointer: coarse)').matches,smallScreen:Math.min(screen.width,screen.height)<900,deviceMemory:nav.deviceMemory});}catch{return 'high';}}
import TwinSticks from './TwinSticks';
import {isAssetReady,sceneAssetsLoaded,subscribeAssets} from './sceneAssets';
import {TourIcon} from './VisitorDock';
import type {Person} from '../data/repository';
import '../hall.css';

const Scene=lazy(()=>import('./HallScene'));

type Props={people:Person[];sort:string;onSelect:(id:string)=>void;onModule:(n:number)=>void;onList:()=>void;onNarrate:(text:string)=>void;onSilence:()=>void;caption:string;speaking:boolean;paused:boolean};
type AdminProps={onPublish?:()=>void;admin?:boolean;adminEmpties?:any[];onEmpty?:(slotId:string)=>void;onAdminLogin?:()=>void;adminMessage?:string;adminCounts?:string;adminMoving?:string;onCancelMove?:()=>void;onArrange?:()=>void;onClearPhotos?:()=>void;onUndoClear?:()=>void;onGalleryAdmin?:()=>void};

export default function HallTour(p:Props){
 const [page,setPage]=useState(0),[demo,setDemo]=useState<Person|null>(null);
 const admin=useSyncExternalStore(subscribeAdmin,isAdmin);
 // Admin sees the real data with empty positions; visitors keep the layout preview.
 // Layout preview (DEMO fill) only while nothing has been published yet; never for the admin.
 const enabled=new URLSearchParams(window.location.search).get('preview')!=='off'&&!admin&&!publishedPeople;
 const [publish,setPublish]=useState(false),[arranging,setArranging]=useState(false);
 // 17/11: “Xóa tất cả ảnh” (xác nhận trước) + Hoàn tác cho tới khi rời trang
 const [galleryAdmin,setGalleryAdmin]=useState(false);
 const [confirmClear,setConfirmClear]=useState(false),[clearUndo,setClearUndo]=useState<Person[]|null>(null);
 const photoCount=p.people.filter(x=>x.image).length;
 const preview=useMemo(()=>hallPreview(p.people,enabled),[p.people,enabled]);
 const [login,setLogin]=useState(false),[editor,setEditor]=useState<{slot:{slotId:string;group:string};person?:Person}|null>(null),[adminMessage,setAdminMessage]=useState('');
 const layout=useMemo(()=>layoutHall(preview.people,p.sort,page),[preview,p.sort,page]);
 // 16/11 (user): “Đổi chỗ” — pick a portrait in its editor, then tap another portrait of the same zone (swap)
 // or an empty “+ Thêm ảnh” position (move). Saved in the local working copy like every other edit, until “Xuất bản”.
 const [mover,setMover]=useState<{id:string;name:string;slotId:string}|null>(null);
 useEffect(()=>{if(!mover)return;const esc=(e:KeyboardEvent)=>{if(e.key==='Escape')setMover(null);};document.addEventListener('keydown',esc);return()=>document.removeEventListener('keydown',esc);},[mover]);
 function moveTo(slotId:string){
  if(!mover)return;
  if(slotId===mover.slotId){setMover(null);setAdminMessage('Đã hủy đổi chỗ.');return;}
  try{const other=catalog.moveToSlot(mover.id,slotId);
   setAdminMessage((other?'Đã đổi chỗ '+mover.name+' ↔ '+other.name:'Đã chuyển '+mover.name+' sang ô '+slotId)+' · chưa xuất bản');setMover(null);}
  catch(err){setAdminMessage(err instanceof Error?err.message:'Không đổi chỗ được.');}
 }
 const select=(id:string)=>{
  if(admin&&mover){const slot=layout.slots.find((s:any)=>s.person.id===id);if(slot)moveTo(slot.slotId);return;}
  if(admin){const slot=layout.slots.find((s:any)=>s.person.id===id);if(slot){setEditor({slot:{slotId:slot.slotId,group:slot.group},person:slot.person});return;}}
  const sample=preview.added.find((v:Person)=>v.id===id);if(sample)setDemo(sample as Person);else p.onSelect(id);};
 const empties=useMemo(()=>admin?exhibitSlots().filter((d:any)=>!layout.slots.some((s:any)=>s.slotId===d.slotId)):[],[admin,layout]);
 // QA hook (dev + ?stats=1 only): open the wall editor for a slot without a 3D click.
 useEffect(()=>{if(!import.meta.env.DEV||!statsEnabled())return;(window as any).__adminOpenSlot=(id:string)=>onEmpty(id);return()=>{delete (window as any).__adminOpenSlot;};});
 // A slot that is already taken opens that person's editor (never a second person in one frame).
 const onEmpty=(slotId:string)=>{if(mover){moveTo(slotId);return;}const taken=layout.slots.find((s:any)=>s.slotId===slotId);if(taken){setEditor({slot:{slotId,group:taken.group},person:taken.person});return;}const d=exhibitSlots().find((x:any)=>x.slotId===slotId);if(d)setEditor({slot:{slotId,group:d.group}});};
 const counts=useMemo(()=>{const c=(g:string)=>layout.slots.filter((s:any)=>s.group===g).length,t=(g:string)=>exhibitSlots().filter((s:any)=>s.group===g).length;
  return 'HT '+c('principal')+'/'+t('principal')+' · PHT '+c('deputy')+'/'+t('deputy')+' · GV & NV '+c('teacher')+'/'+t('teacher');},[layout]);

 return <>
  <Visit
   // Stable key (15/11): saving a photo must not rebuild the scene (door replay, camera reset).
   key={'page-'+layout.page}
   {...p}
   onSelect={select}
   paused={p.paused||Boolean(demo)||login||Boolean(editor)||publish||arranging||confirmClear||galleryAdmin}
   onPublish={()=>setPublish(true)}
   onArrange={()=>{setMover(null);setArranging(true);}}
   onClearPhotos={()=>{setMover(null);setConfirmClear(true);}}
   onGalleryAdmin={()=>{setMover(null);setGalleryAdmin(true);}}
   onUndoClear={clearUndo?()=>{try{catalog.restorePeople(clearUndo);setClearUndo(null);setAdminMessage('Đã hoàn tác: ảnh đã trở lại · chưa xuất bản');}catch(err){setAdminMessage(err instanceof Error?err.message:'Không hoàn tác được.');}}:undefined}
   admin={admin}
   adminEmpties={empties}
   onEmpty={onEmpty}
   onAdminLogin={()=>setLogin(true)}
   adminMessage={adminMessage}
   adminCounts={counts}
   adminMoving={mover?.name}
   onCancelMove={()=>{setMover(null);setAdminMessage('Đã hủy đổi chỗ.');}}
   layout={layout}
   onPage={setPage}
   mockCount={preview.added.length}
  />
  {AdminGallery&&galleryAdmin&&<Suspense fallback={null}><AdminGallery onClose={()=>setGalleryAdmin(false)} onDone={msg=>setAdminMessage(msg)}/></Suspense>}
  {AdminArrange&&arranging&&<Suspense fallback={null}><AdminArrange onClose={()=>setArranging(false)} onDone={msg=>setAdminMessage(msg)}/></Suspense>}
  {AdminLogin&&login&&<Suspense fallback={null}><AdminLogin onClose={()=>setLogin(false)}/></Suspense>}
  {AdminPublish&&publish&&<Suspense fallback={null}><AdminPublish people={p.people} onClose={()=>setPublish(false)} onDone={msg=>setAdminMessage(msg)}/></Suspense>}
  {AdminSlotEditor&&editor&&<Suspense fallback={null}><AdminSlotEditor key={editor.slot.slotId+(editor.person?.id||'')} slot={editor.slot} person={editor.person} onClose={()=>setEditor(null)} onSaved={msg=>{setEditor(null);setAdminMessage(msg);}}
   onMove={editor.person?()=>{const e=editor;setEditor(null);setAdminMessage('');setMover({id:e.person!.id,name:e.person!.name,slotId:e.slot.slotId});}:undefined}/></Suspense>}
  {confirmClear&&<Dialog title="Xóa tất cả ảnh?" onClose={()=>setConfirmClear(false)}><div className="admin-clear"><p>Gỡ ảnh của <b>{photoCount}</b> người trên tường. Tên, chức vụ, tổ và vị trí giữ nguyên để tải ảnh mới lên.</p><p>Trang công khai chỉ thay đổi khi bấm “Xuất bản lên website”. Trước đó có thể Hoàn tác.</p><div className="admin-clear-actions"><button onClick={()=>setConfirmClear(false)}>Hủy</button><button className="danger" disabled={!photoCount} onClick={()=>{try{const before=catalog.clearPhotos();setClearUndo(before as Person[]);setAdminMessage('Đã xóa ảnh của '+photoCount+' người · chưa xuất bản');}catch(err){setAdminMessage(err instanceof Error?err.message:'Không xóa được ảnh.');}setConfirmClear(false);}}>Xóa tất cả ảnh</button></div></div></Dialog>}
  {demo&&<Dialog title="Hồ sơ minh họa bố cục" onClose={()=>setDemo(null)}><div className="profile"><div><img src={portraitPath(demo)} alt="Chân dung minh họa lặp để xem bố cục"/></div><div><p className="eyebrow">{demo.id}</p><h3>{demo.name}</h3><p>{demo.description}</p><p>Vị trí: {demo.displaySlot}</p><p>Ảnh chỉ dùng thử; không phải chân dung hiệu trưởng hay giáo viên thật được xác nhận.</p><button onClick={()=>setDemo(null)}>Đóng hồ sơ minh họa</button></div></div></Dialog>}
 </>;
}

function Visit(p:Props&AdminProps&{layout:any;onPage:(n:number)=>void;mockCount:number}){
 const {layout}=p;
 const [aspect,setAspect]=useState(1.6);
 // 16/11 (user: teacher photos too small on phones): phones stand closer to the portrait walls, and tapping a portrait
 // glides to a close-up of it (‹ Trước · Xem hồ sơ · Sau ›). Computers keep the wide view and open the profile directly.
 const phone=useMemo(()=>{try{return Math.min(screen.width,screen.height)<600&&matchMedia('(pointer:coarse)').matches;}catch{return false;}},[]);
 // `from` = the close-up we are leaving: kept in the plan so “Trước / Sau” slides along the wall instead of turning
 // towards the travel direction (moving to the photo below used to tip the view down to the floor).
 const [closeup,setCloseup]=useState<{slotId:string;back:string;from?:string}|null>(null);
 const closeupSlot=closeup?layout.slots.find((s:any)=>s.slotId===closeup.slotId):null;
 const closeupNodes=useMemo(()=>{if(!closeup)return [];
  return [closeup.from,closeup.slotId].filter(Boolean).map(id=>layout.slots.find((s:any)=>s.slotId===id)).filter(Boolean)
   .map((s:any)=>{const n=closeupStop({...s},s.person.name);return n?{...n,wall:s.wall}:null;}).filter(Boolean);},[closeup,layout]);
 // 17/11: phones visit each portrait bay row by row (“…-low” stops) — the presentation follows the fitted list
 const tourStops:any[]=useMemo(()=>fitHallStops(layout.stops,aspect,phone),[layout,aspect,phone]);
 const plan:any=useMemo(()=>createHallPlan([...tourStops,...closeupNodes]),[tourStops,closeupNodes]);
 const [command,setCommand]=useState<{serial:number;from:string;to:string;manual?:boolean;instant?:boolean}>({serial:0,from:'entrance',to:'entrance'}),[current,setCurrent]=useState('entrance'),[moving,setMoving]=useState(false),[pause,setPause]=useState(false),[manual,setManual]=useState(false),[panel,setPanel]=useState<'map'|'more'|null>(null),[ready,setReady]=useState(false),[failed,setFailed]=useState(false),[effects,setEffects]=useState(true),[voice,setVoice]=useState(false);
 const [automatic,setAutomatic]=useState(false),[complete,setComplete]=useState(false),[chooseMode,setChooseMode]=useState(false);
 const pose=useRef<VisitorPose>({x:0,z:9.1,yaw:0}),route=useRef<RouteState>(null);
 // GĐ4: quality choice (persisted per browser) and the level currently applied.
 const [qualityChoice,setQualityChoice]=useState(storedChoice),[qualityLevel,setQualityLevel]=useState(()=>{const c=storedChoice();return c==='auto'?startLevel():c;});
 const chooseQuality=(id:string)=>{setQualityChoice(id);if(id!=='auto')setQualityLevel(id);else setQualityLevel(startLevel());try{localStorage.setItem(QUALITY_KEY,id);}catch{/* private mode */}};
 // GĐ4: ?bench=1 walks a fixed route and reports FPS measured only while moving.
 const benchOn=useMemo(()=>{try{return new URLSearchParams(location.search).get('bench')==='1';}catch{return false;}},[]);
 const benchFrames=useRef<number[]|null>(null),benchStep=useRef(-1);
 const [benchResult,setBenchResult]=useState<BenchResult|null>(null);
 // Entrance doors: closed on arrival, open once per page load (instantly for reduced motion / bench).
 const autoPaused=useRef(false);
 const door=useRef<DoorState>({target:0,value:0}),[doorOpening,setDoorOpening]=useState(false);
 // 15/11: the visitor waits at the closed door and taps to open it (first visit in this tab session).
 const [atDoor,setAtDoor]=useState(false),walkTimer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
 useEffect(()=>()=>clearTimeout(walkTimer.current),[]);
 // QA hook (only with ?stats=1 / ?bench=1): lets a tester replay the door animation.
 useEffect(()=>{if(!statsEnabled())return;(window as any).__door=door;return()=>{delete (window as any).__door;};},[]);
 const reducedMotion=()=>{try{return matchMedia('(prefers-reduced-motion: reduce)').matches;}catch{return false;}};
 const input=useRef(neutralInput()),host=useRef<HTMLElement>(null),close=useRef<HTMLButtonElement>(null),trigger=useRef<HTMLElement|null>(null);
 const [sceneReady,setSceneReady]=useState(false),[arriving,setArriving]=useState(true);
 const openedAt=useRef(performance.now());
 const [hostOpen,setHostOpen]=useState(false);
 useEffect(()=>{if(!host.current)return;const observer=new ResizeObserver(([entry])=>setAspect(entry.contentRect.width/Math.max(1,entry.contentRect.height)));observer.observe(host.current);return()=>observer.disconnect();},[]);

 // 15/11: reveal the scene only when the room, the statue and all portraits are loaded (or after 30 s at worst).
 const required=useMemo(()=>bakedEnabled()?['baked','statue']:['statue'],[]);
 const assetsLoaded=useSyncExternalStore(subscribeAssets,()=>sceneAssetsLoaded(required));
 // 15/11 (việc 1): the 30 s timeout may skip slow PORTRAITS only — never reveal a scene without the room shell or
 // the statue (floating doors/frames). If those hang, HallLoading keeps offering “Thử lại” / “Xem danh sách ảnh”.
 const modelsReady=useSyncExternalStore(subscribeAssets,()=>required.every(isAssetReady));
 const [assetTimeout,setAssetTimeout]=useState(false);
 useEffect(()=>{if(!sceneReady)return;const t=setTimeout(()=>setAssetTimeout(true),30000);return()=>clearTimeout(t);},[sceneReady]);
 const revealed=useRef(false),revealTimer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
 useEffect(()=>()=>clearTimeout(revealTimer.current),[]);
 useEffect(()=>{if(!sceneReady||!(assetsLoaded||(assetTimeout&&modelsReady))||revealed.current)return;revealed.current=true;
  window.dispatchEvent(new Event('museum-navigation-input'));
  // 15/11 fix: the reveal timer must survive later asset-count changes (it used to be cleared by the next effect
  // run, which then returned early — the loading screen stayed forever). Only unmount cancels it.
  let done=false;
  const reveal=()=>{if(done)return;done=true;clearTimeout(revealTimer.current);
   setReady(true);
   // 15/11: always wait at the closed door (repeat visits used to auto-open — looked like a bug to the user)
   // 16/11 (user): manual walking (Tự bước) is on from the foyer onwards, not only inside the room
   if(benchOn)openDoor();else{setAtDoor(true);setManual(true);}
  };
  // 17/11 (user): the visitor enters ONLY by pressing “Vào tham quan” (revealNow) — no automatic reveal.
  // The bar still runs for MIN_SHOW_MS so the tri ân picture can be seen. Performance runs (?bench) still enter by themselves.
  revealNow.current=reveal;setLoadDone(true);
  if(benchOn)revealTimer.current=setTimeout(reveal,Math.max(400,700-(performance.now()-openedAt.current)));
  },[sceneReady,assetsLoaded,assetTimeout,modelsReady]);
 const revealNow=useRef<(()=>void)|null>(null);
 const [loadDone,setLoadDone]=useState(false),[loadingGone,setLoadingGone]=useState(false);
 // 17/11: “step into the picture” transition (VisitLoading .visit-loading-leaving, 1,6 s) over the first frames of the scene
 useEffect(()=>{if(!ready||loadingGone)return;const t=setTimeout(()=>setLoadingGone(true),1800);return()=>clearTimeout(t);},[ready,loadingGone]);
 // 17/11 (người dùng): thanh điều khiển tự trượt xuống khi đang di chuyển (cần, kéo nhìn, phím, đi tới điểm), hiện lại
 // sau 1,6 s đứng yên — như Matterport/Street View: giao diện lùi lại khi người xem đang nhìn cảnh.
 const [navBusy,setNavBusy]=useState(false);
 useEffect(()=>{let t:ReturnType<typeof setTimeout>|undefined;
  const busy=()=>{setNavBusy(true);clearTimeout(t);t=setTimeout(()=>setNavBusy(false),1600);};
  const poll=setInterval(()=>{const i=input.current;if(i.forward||i.strafe||i.turn||i.look)busy();},150);
  const key=(e:KeyboardEvent)=>{if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(e.key.toLowerCase()))busy();};
  const drag=(e:PointerEvent)=>{if(e.buttons&&e.target instanceof HTMLCanvasElement&&!screenGrab.active)busy();};
  window.addEventListener('keydown',key);window.addEventListener('pointermove',drag);
  return()=>{clearInterval(poll);clearTimeout(t);window.removeEventListener('keydown',key);window.removeEventListener('pointermove',drag);};},[]);
 const dockHidden=ready&&!panel&&(navBusy||(moving&&!automatic));
 // 17/11 (Phương án B): ảnh trình diễn khu tủ kỷ vật + bộ xem toàn màn hình khi chạm
 const gallerySnap=useSyncExternalStore(gallery.subscribe,gallery.getSnapshot);
 // 17/11 (A+): one large screen — activities first, then achievements, then documents
 // 17/11 (người dùng): while no picture is uploaded the screen shows the tri ân 20/11 mosaic (whole, never cropped);
 // the school's own pictures replace it as soon as one is added in “Ảnh trình diễn…”
 const galleryShow=useMemo(()=>{const list=GALLERY_CATS.flatMap((c:any)=>gallerySnap.items.filter(i=>i.cat===c.id)).map(i=>({id:i.id,url:galleryURL(i),caption:captionLine(i),fit:(i.cat==='activity'?'cover':'contain') as 'cover'|'contain'|'bare'})).filter(i=>i.url);
  return list.length?list:[{id:'tri-an-20-11',url:import.meta.env.BASE_URL+'tri-an/tri-an-thay-co-20-11.jpg',caption:'',fit:'bare' as const}];},[gallerySnap]);
 const [viewer,setViewer]=useState<{index:number}|null>(null);
 // 17/11 (người dùng): vòng tròn/nhãn điểm dừng trên sàn tự ẩn — hiện 6 s sau khi dừng lại hoặc chạm màn hình, rồi mờ đi
 const [markersOn,setMarkersOn]=useState(true),markerTimer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
 const showMarkers=()=>{setMarkersOn(true);clearTimeout(markerTimer.current);markerTimer.current=setTimeout(()=>setMarkersOn(false),6000);};
 useEffect(()=>{if(!navBusy&&!moving&&ready)showMarkers();},[navBusy,moving,ready]);
 useEffect(()=>{const tap=(e:PointerEvent)=>{if(e.target instanceof HTMLCanvasElement)showMarkers();};window.addEventListener('pointerup',tap);return()=>{window.removeEventListener('pointerup',tap);clearTimeout(markerTimer.current);};},[]);
 // Touching a stick = walk on my own (also interrupts the automatic presentation).
 const engageStick=()=>{if(atDoor&&intro&&effects){window.dispatchEvent(new Event('museum-intro-skip'));return;}if(doorOpening||arriving)return;enterManual();};
 const enterManual=()=>{if(manual&&!automatic)return;setAutomatic(false);setChooseMode(false);setComplete(false);setPanel(null);setPause(false);setArriving(false);setCommand(c=>({serial:c.serial+1,from:current,to:current,manual:true}));setManual(true);};
 // establishing shot over the schoolyard on the first arrival at the door (not for reduced motion / effects off)
 const [intro,setIntro]=useState(()=>!reducedMotion());
 useEffect(()=>{const done=()=>setIntro(false);window.addEventListener('museum-intro-done',done);return()=>window.removeEventListener('museum-intro-done',done);},[]);
 function openDoor(){
  setIntro(false);
  // 15/11: the tap that opens the door also starts the music (browsers only allow sound after a gesture).
  startHallSound();
  setAtDoor(false);setArriving(true);setChooseMode(false);try{sessionStorage.setItem(DOOR_KEY,'1');}catch{/* private mode */}
  const wait=entryDelayMs({reducedMotion:reducedMotion(),bench:benchOn,effects});
  if(!wait){door.current={target:1,value:1};setCommand(c=>({serial:c.serial+1,from:'arrival',to:'entrance',instant:benchOn}));return;}
  // Doors slide open first; the visitor glides in once the opening is wide enough.
  // 16/11: the visitor waits facing the statue — turn to the door first (FACE_DOOR_MS), then the leaves slide open
  // (with their sound) in full view, then the visitor walks in.
  setDoorOpening(true);window.dispatchEvent(new Event('museum-face-door'));
  clearTimeout(walkTimer.current);
  walkTimer.current=setTimeout(()=>{
   door.current.target=1;doorSound(DOOR_SECONDS);window.dispatchEvent(new Event('museum-navigation-input'));
   walkTimer.current=setTimeout(()=>{setDoorOpening(false);setCommand(c=>({serial:c.serial+1,from:'arrival',to:'entrance'}));},wait);
  },FACE_DOOR_MS);
 }
 // Back at the gate ("Về cổng vào"): the doors close and wait for the next tap.
 useEffect(()=>{if(ready&&!moving&&current==='gate'&&!atDoor){door.current.target=0;doorSound(DOOR_SECONDS);setAutomatic(false);setAtDoor(true);setManual(true);window.dispatchEvent(new Event('museum-navigation-input'));}},[ready,moving,current]);
 const skipEntry=()=>{clearTimeout(walkTimer.current);door.current={target:1,value:1};setDoorOpening(false);setPause(false);setCommand(c=>({...c,serial:Math.max(1,c.serial+1),from:'arrival',to:'entrance',instant:true}));};
 const active=layout.stops.find((s:any)=>s.id===baseStopId(current));
 const openCloseup=(slotId:string)=>{if(!ready||atDoor||p.paused||moving)return;
  setCloseup(c=>({slotId,back:c?.back??(current.startsWith('closeup:')?'entrance':current),from:c?.slotId}));
  setAutomatic(false);setChooseMode(false);setComplete(false);setPanel(null);setManual(false);setPause(false);
  setCommand(c=>({serial:c.serial+1,from:current,to:'closeup:'+slotId}));};
 const leaveCloseup=()=>{const back=closeup?.back||'entrance';setCloseup(null);setCommand(c=>({serial:c.serial+1,from:current,to:plan.nodes[back]?back:'entrance'}));};
 const stepCloseup=(dir:number)=>{if(!closeupSlot)return;const order=closeupOrder(layout.slots,closeupSlot.group);if(order.length<2)return;
  const i=order.findIndex((s:any)=>s.slotId===closeupSlot.slotId);openCloseup(order[(i+dir+order.length)%order.length].slotId);};
 const selectPortrait=(id:string)=>{
  if(phone&&!p.admin){const slot=layout.slots.find((s:any)=>s.person.id===id);if(slot&&closeup?.slotId!==slot.slotId){openCloseup(slot.slotId);return;}}
  p.onSelect(id);};
 // any other movement (presentation, map, walking on my own) ends the close-up
 useEffect(()=>{if(closeup&&(command.manual||!command.to.startsWith('closeup:')))setCloseup(null);},[command.serial]);
 const remaining=useRef(presentationDwell(active));
 useEffect(()=>{remaining.current=presentationDwell(active);},[current]);
 useEffect(()=>{
  if(!benchOn||benchResult||!ready||moving||arriving||atDoor)return;
  const stops=benchRoute(layout.stops);
  if(benchStep.current<0){benchFrames.current=[];benchStep.current=0;}
  else if(current===stops[benchStep.current])benchStep.current++;
  if(benchStep.current>=stops.length){
   const frames=benchFrames.current||[];benchFrames.current=null;
   setBenchResult({summary:benchSummary(frames),finishedAt:new Date().toISOString(),device:deviceInfo({qualityChoice,qualityLevel,sceneFile:bakedEnabled()?bakedVariant():'classic',stops:stops.length})});return;
  }
  const t=setTimeout(()=>go(stops[benchStep.current]),700);return()=>clearTimeout(t);
 },[benchOn,benchResult,ready,moving,arriving,atDoor,current]);
 useEffect(()=>{
  if(!automatic||!ready||atDoor||moving||pause||panel||hostOpen||p.paused||document.hidden)return;
  const next=nextPresentationStop(tourStops,current);
  if(!next){setAutomatic(false);setComplete(true);return;}
  const started=performance.now();
  const timer=setTimeout(()=>{remaining.current=0;setCommand(c=>({serial:c.serial+1,from:current,to:next.id}));},remaining.current);
  return()=>{clearTimeout(timer);remaining.current=Math.max(0,remaining.current-(performance.now()-started));};
 },[automatic,ready,atDoor,moving,pause,panel,hostOpen,p.paused,current,layout]);
 // Hidden tab → pause; visible again → resume ONLY if the system paused it (14/11 fix: the entry walk
 // used to stay stuck on "Đang tạm dừng" after the visitor switched tabs while the scene was loading).
 useEffect(()=>{const suspend=()=>{if(document.hidden){autoPaused.current=true;setPause(true);input.current=neutralInput();}else if(autoPaused.current){autoPaused.current=false;setPause(false);}};document.addEventListener('visibilitychange',suspend);window.addEventListener('blur',suspend);return()=>{document.removeEventListener('visibilitychange',suspend);window.removeEventListener('blur',suspend);};},[]);
 const sound=useSyncExternalStore(subscribeSound,soundEnabled);
 useEffect(()=>{duckHallMusic(Boolean(p.speaking));},[p.speaking]);
 useEffect(()=>()=>stopHallSound(),[]);
 useEffect(()=>{if(panel)close.current?.focus();const esc=(e:KeyboardEvent)=>{if(e.key==='Escape'){setPanel(null);setManual(false);trigger.current?.focus();}};document.addEventListener('keydown',esc);return()=>document.removeEventListener('keydown',esc);},[panel]);
 useEffect(()=>{if(p.paused){setManual(false);input.current=neutralInput();}},[p.paused]);

 // force: "Về cổng vào" may interrupt a walk or the presentation.
 const go=(id:string,force=false)=>{if(!ready||atDoor||(moving&&!force)||p.paused||!plan.nodes[id])return;setAutomatic(false);setChooseMode(false);setComplete(false);setPanel(null);setManual(false);setPause(false);setCommand(c=>({serial:c.serial+1,from:current,to:id}));};
 function start(fromHere=false){if(atDoor){openDoor();return;}setChooseMode(false);setComplete(false);setManual(false);setPause(false);setPanel(null);remaining.current=presentationDwell(active);setAutomatic(true);if((!fromHere&&current!=='entrance')||current==='finish')setCommand(c=>({serial:c.serial+1,from:current,to:'entrance'}));}
 const toggle=(next:'map'|'more',e:React.MouseEvent<HTMLButtonElement>)=>{trigger.current=e.currentTarget;setManual(false);setPanel(v=>v===next?null:next);};
 function full(){if(document.fullscreenElement)void document.exitFullscreen();else void host.current?.requestFullscreen();}
 function audio(){if(p.speaking){p.onSilence();setVoice(false);}else{setVoice(true);p.onNarrate(hallNarration(active,{displayed:layout.displayed,mockCount:p.mockCount}));}}

 const icon=(label:string,name:string,action:()=>void,disabled=false,active=false)=><button type="button" aria-label={label} title={label} onClick={action} className={active?'active':''} disabled={disabled||p.paused}><TourIcon name={name}/></button>;

 return <div className="guided-tour immersive-tour"><section ref={host} className={"scene-shell guided-scene hall-scene"+(closeup?" hall-closeup-on":"")} aria-label="Phòng trưng bày chung 3D" onPointerDown={resumeHallSound}>
  <div className="hall-version-bar">
   <div className="location-chip">
    <span className="location-dot"/>
    <span role="status">{failed?'Mất WebGL':!ready?'Đang tải…':atDoor?'Sảnh · Tượng nhà giáo Chu Văn An':pause?'Đang tạm dừng':moving?'Đang đến: '+plan.nodes[command.to]?.title:(closeup?'Xem cận chân dung':active?.title)||'Phòng trưng bày chung'}</span>
    {p.mockCount>0&&<span className="location-period">Ảnh minh họa</span>}
   </div>
  </div>

  <button className="visitor-fullscreen" aria-label="Toàn màn hình" onClick={full}><TourIcon name="fullscreen"/></button>
  <button className="visitor-sound" aria-label={sound?'Tắt nhạc nền':'Bật nhạc nền'} title={sound?'Tắt nhạc nền':'Bật nhạc nền'} aria-pressed={sound} onClick={()=>setSoundEnabled(!sound)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 17.5V5.5l10-2v12" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><circle cx="6.6" cy="17.5" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.7"/><circle cx="16.6" cy="15.5" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.7"/>{!sound&&<path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"/>}</svg></button>

  <Suspense fallback={null}>
   <Scene
    layout={layout}
    plan={plan}
    command={command}
    paused={p.paused||pause||Boolean(panel)||!ready||hostOpen||Boolean(viewer)}
    moving={moving}
    effects={effects}
    controlsLocked={automatic||(atDoor&&intro&&effects)||doorOpening}
    hideMarkers={navBusy||!markersOn}
    gallery={galleryShow}
    onGallery={(index:number)=>{setManual(false);setViewer({index});}}
    atDoor={atDoor}
    intro={atDoor&&intro&&effects}
    onOpenDoor={openDoor}
    input={input}
    pose={pose}
    route={route}
    quality={{choice:qualityChoice,level:qualityLevel,onLevel:setQualityLevel,record:benchFrames}}
    door={door}
    emptySlots={p.admin?p.adminEmpties:undefined}
    onEmpty={p.admin?p.onEmpty:undefined}
    onArrive={id=>{const entered=arriving&&id==='entrance';setCurrent(id);setMoving(false);setArriving(false);
     // 16/11 (user): “luôn luôn” the manual visit — after the door the visitor walks freely (Tự bước on, no mode chooser);
     // the ▶ button still starts the automatic presentation.
     if(entered){setCommand(c=>({serial:c.serial+1,from:id,to:id,manual:true}));setManual(true);}}}
    onMotion={setMoving}
    onSelect={selectPortrait}
    onGo={go}
    onReady={()=>setSceneReady(true)}
    onLost={()=>{setFailed(true);setReady(false);}}
   />
  </Suspense>

  {viewer&&<GalleryViewer title={FRONT_SCREEN.title} items={galleryShow} start={viewer.index} onClose={()=>setViewer(null)}/>}
  {!loadingGone&&!failed&&<HallLoading required={required} onList={p.onList} openedAt={openedAt.current} done={loadDone} leaving={ready} onEnter={()=>revealNow.current?.()}/>}
  {ready&&atDoor&&!panel&&(intro&&effects
   ?<button type="button" className="hall-door-prompt" onClick={()=>window.dispatchEvent(new Event('museum-intro-skip'))} aria-label="Bỏ qua cảnh mở đầu"><span className="hall-intro-skip">Chạm để bỏ qua</span></button>
   :null)}
  {ready&&arriving&&(moving||doorOpening)&&<button className="hall-skip-entry" onClick={skipEntry}>Bỏ qua đoạn vào cửa</button>}
  {/* 16/11: no “Trình diễn tự động / Tự khám phá” chooser any more — the visit opens in manual mode. */}
  {automatic&&!panel&&<div className="hall-progress">{pause?'Đang tạm dừng':'Trình diễn tự động'} · Điểm {Math.max(1,layout.stops.findIndex((s:any)=>s.id===baseStopId(moving?command.to:current))+1)}/{layout.stops.length}</div>}
  {complete&&!panel&&<div className="hall-progress" role="status">Đã hoàn thành một vòng tham quan</div>}
  {/* 15/11: the sticks are always offered once inside, so visitors never forget they can walk on their own. */}
  {/* 16/11 (user): the two sticks are ALWAYS on screen (foyer, door, walking, presentation) so visitors know they can walk.
    Touching one: skips the opening shot, takes over from a walk/presentation; ignored while the door turns/opens. */}
  {ready&&!p.paused&&<TwinSticks input={input} onEngage={engageStick}/>}

  {panel&&<div className="hall-panel-shade" onPointerDown={e=>{if(e.target===e.currentTarget)setPanel(null);}}><section className="hall-panel" aria-label={panel==='map'?'Sơ đồ phòng chung':'Tùy chọn tham quan'}><div className="visitor-panel-heading"><h2>{panel==='map'?'Một phòng · Năm khu':'Tùy chọn'}</h2><button ref={close} aria-label="Đóng bảng điều khiển" onClick={()=>{setPanel(null);trigger.current?.focus();}}><TourIcon name="close"/></button></div>
   {panel==='map'?<><div className="hall-plan" aria-label="Sơ đồ mặt bằng phòng 24 × 16 mét"><YouAreHere pose={pose}/><span className="hall-plan-entry">Lối vào</span><span className="hall-map-wall hall-map-left"/><span className="hall-map-wall hall-map-right"/>{layout.stops.filter((s:any,i:number,a:any[])=>s.group&&s.group!=='statue'&&!a.slice(0,i).some(v=>v.group===s.group)).map((s:any)=><button key={s.id} aria-label={'Đến '+s.title} title={s.title} className={current===s.id?'selected':''} style={{left:(s.eye[0]+12)/24*100+'%',top:(s.eye[2]+8)/16*100+'%'}} onClick={()=>go(s.id)} disabled={moving}>{({principal:'HT',deputy:'PHT',teacher:'GV',staff:'NV',memory:'KV'} as Record<string,string>)[s.group]}</button>)}</div><div className="hall-zone-list"><button disabled={moving} onClick={()=>go('statue')}><span>Tượng nhà giáo Chu Văn An</span><small>Phòng trưng bày nhỏ ở sảnh</small><TourIcon name="right"/></button><button disabled={moving} onClick={()=>go(FRONT_SCREEN.id)}><span>{FRONT_SCREEN.title}</span><TourIcon name="right"/></button>{layout.zones.map((z:any)=><button key={z.id} disabled={moving} onClick={()=>go((layout.stops.find((s:any)=>s.group===z.id)||layout.stops.find((s:any)=>s.id==='principal-0')).id)}><span>{z.name}</span><small>{z.people.length}/{z.capacity} vị trí</small><TourIcon name="right"/></button>)}</div></>:<div className="visitor-options"><button onClick={p.onList}><TourIcon name="search"/>Tìm hồ sơ</button><button disabled={moving} onClick={()=>go(nextPresentationStop(layout.stops,current)?.id||'entrance')}>Điểm tham quan tiếp</button><button disabled={moving} onClick={()=>start(true)}>Trình diễn từ điểm hiện tại</button><label><input type="checkbox" checked={!effects} onChange={()=>setEffects(v=>!v)}/>Giảm chuyển động</label><label>Chất lượng hình<select aria-label="Chất lượng hình" value={qualityChoice} onChange={e=>chooseQuality(e.target.value)}>{QUALITY_CHOICES.map(c=><option key={c.id} value={c.id}>{c.label}{c.id==='auto'&&qualityChoice==='auto'?' (đang: '+(QUALITY_LEVELS.find(l=>l.id===qualityLevel)?.label||'')+')':''}</option>)}</select></label><label>Tốc độ di chuyển<select aria-label="Tốc độ di chuyển" defaultValue="1" onChange={e=>{input.current.speed=Number(e.target.value);}}><option value=".75">Chậm</option><option value="1">Vừa</option></select></label><button onClick={()=>{input.current.reset++;window.dispatchEvent(new Event('museum-navigation-input'));setPanel(null);}}>Đặt lại góc nhìn</button><p className="hall-help">Kéo để nhìn quanh, cuộn hoặc chụm hai ngón để phóng to. Máy tính: W/A/S/D để đi.</p><button onClick={()=>p.onModule(2)}>Tôn vinh giáo viên · Đang xây dựng</button><button onClick={()=>p.onModule(3)}>Tôn vinh học sinh · Đang xây dựng</button>{import.meta.env.DEV&&adminAvailable&&(p.admin?<button className="admin-link" onClick={()=>{signOut();setPanel(null);}}>Đăng xuất quản trị</button>:<button className="admin-link" onClick={()=>{setPanel(null);p.onAdminLogin?.();}}>Quản trị viên: đăng nhập</button>)}</div>}
  </section></div>}

  {closeup&&closeupSlot&&!panel&&!p.paused&&<div className="hall-closeup" role="group" aria-label={'Xem cận chân dung '+closeupSlot.person.name}>
   <button type="button" className="hall-closeup-step" aria-label="Người trước" disabled={moving} onClick={()=>stepCloseup(-1)}><TourIcon name="left"/></button>
   <div className="hall-closeup-name"><b>{closeupSlot.person.name}</b><small>{closeupSlot.person.role}</small></div>
   <button type="button" className="hall-closeup-profile" onClick={()=>p.onSelect(closeupSlot.person.id)}>Xem hồ sơ</button>
   <button type="button" className="hall-closeup-step" aria-label="Người sau" disabled={moving} onClick={()=>stepCloseup(1)}><TourIcon name="right"/></button>
   <button type="button" className="hall-closeup-close" aria-label="Thoát xem cận" onClick={leaveCloseup}><TourIcon name="close"/></button>
  </div>}
  <div className={'visitor-controls'+(dockHidden?' is-hidden':'')}><nav className="visitor-dock hall-dock" aria-label="Điều hướng phòng chung">
   {icon('Về cổng vào','home',()=>go('gate',true),!ready||atDoor)}
   <button aria-label="Sơ đồ phòng chung" title="Sơ đồ phòng chung" aria-expanded={panel==='map'} disabled={atDoor} onClick={e=>toggle('map',e)}><TourIcon name="map"/></button>
   {icon(automatic?(pause?'Tiếp tục trình diễn':'Tạm dừng trình diễn'):moving?(pause?'Tiếp tục hành trình':'Tạm dừng hành trình'):'Trình diễn tự động',automatic||moving?(pause?'play':'pause'):'play',()=>{autoPaused.current=false;if(automatic||moving)setPause(v=>!v);else start();},!ready)}
   <button aria-label="Tự bước" title="Tự bước" aria-pressed={manual} disabled={p.paused||!ready||doorOpening} onClick={()=>{setAutomatic(false);setChooseMode(false);setComplete(false);setPanel(null);setPause(false);setArriving(false);setCommand(c=>({serial:c.serial+1,from:current,to:current,manual:true}));setManual(v=>!v);}}><TourIcon name="walk"/></button>
   {icon(p.speaking?'Tắt lời dẫn':'Nghe giới thiệu','sound',audio)}
   <button aria-label="Tùy chọn" title="Tùy chọn" aria-expanded={panel==='more'} onClick={e=>toggle('more',e)}><TourIcon name="more"/></button>
  </nav></div>
  {ready&&!moving&&(!manual||atDoor)&&!panel&&!p.paused&&!automatic&&!closeup&&<VirtualHost compact active={voice} speaking={p.speaking} caption={p.caption} onPlay={audio} onStop={()=>{p.onSilence();setVoice(false);}} onPanelChange={setHostOpen}/>}

  {p.admin&&layout.warnings.length>0&&<p className="hall-capacity-warning" role="alert">Có {layout.warnings.length} hồ sơ chưa có chỗ trong khu tương ứng. Hồ sơ vẫn được giữ; mở Tra cứu để xem đầy đủ.</p>}
  {failed&&<div className="visitor-error" role="alert"><p>Thiết bị vừa mất kết nối đồ họa 3D.</p><button type="button" onClick={()=>window.location.reload()}>Thử lại</button> <button type="button" onClick={p.onList}>Xem danh sách ảnh</button></div>}
  {import.meta.env.DEV&&p.admin&&ready&&<div className={'hall-admin-bar'+(p.adminMoving?' is-moving':'')} role="status"><b>Chế độ quản trị</b>{p.adminMoving
   ?<><span className="hall-admin-move">Đang đổi chỗ: <b>{p.adminMoving}</b> — bấm vào ảnh khác cùng khu để đổi chỗ, hoặc ô “+ Thêm ảnh” để chuyển sang.</span><button onClick={()=>p.onCancelMove?.()}>Hủy đổi chỗ</button></>
   :<span className="hall-admin-hint">Bấm vào ảnh để thay ảnh / sửa thông tin / đổi chỗ · Bấm ô “+ Thêm ảnh” để thêm người mới</span>}<span className="hall-admin-counts">{p.adminCounts}</span>{p.adminMessage&&<span className="hall-admin-msg">{p.adminMessage}</span>}<button onClick={()=>p.onArrange?.()}>Sắp xếp theo tổ…</button><button onClick={()=>p.onGalleryAdmin?.()}>Ảnh trình diễn…</button>{p.onUndoClear?<button onClick={p.onUndoClear}>Hoàn tác xóa ảnh</button>:<button className="danger" onClick={()=>p.onClearPhotos?.()}>Xóa tất cả ảnh</button>}<button className="gold" onClick={()=>p.onPublish?.()}>Xuất bản lên website</button><button onClick={()=>signOut()}>Đăng xuất</button></div>}
  {benchOn&&!benchResult&&ready&&<div className="hall-progress" role="status">{pause?'Đang tạm dừng — bấm ▶ để tiếp tục đo':'Đang đo hiệu năng… '+Math.max(0,benchStep.current)+'/'+benchRoute(layout.stops).length}</div>}
  {benchResult&&<BenchPanel result={benchResult} onClose={()=>setBenchResult(null)}/>}
 </section></div>;
}




