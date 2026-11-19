import {Component,Suspense,lazy,useEffect,useMemo,useRef,useState,useSyncExternalStore} from 'react';
import type {ReactNode} from 'react';
import {catalog,portraitPath,samplePortraitMode,adminAvailable,type Person} from './data/repository';
import {GROUPS,STATUSES,findPeople,sortPeople,workHistoryText,displayName,roleText} from './data/catalog.mjs';
import Dialog from './components/Dialog';
// Admin pages exist only on the local dev server (cách 1); the public build is read-only.
const PeopleAdmin=import.meta.env.DEV?lazy(()=>import('./components/PeopleAdmin')):null;
const AdminLogin=import.meta.env.DEV?lazy(()=>import('./components/AdminLogin')):null;
import {isAdmin,subscribeAdmin} from './data/adminAuth';
import Welcome from './components/Welcome';
import VisitLoading from './components/VisitLoading';
import {isStaleModuleError} from './data/sceneFailure.mjs';
import {webglAvailable} from './data/loadWatch.mjs';
import {vietnameseVoice} from './data/narration.mjs';
import {enterImmersive} from './data/immersive';
import {startHallSound} from './scene/hallAudio';
import {track} from './data/analytics';
import {MC_ENABLED} from './data/features';
import {inAppBrowser,platformOf} from './data/browserEnv.mjs';
import OpenInBrowser from './components/OpenInBrowser';
import UpdateBar from './components/UpdateBar';
// 16/11 (user): the public site (GitHub) shows only the welcome card and the 3D visit. The local admin machine keeps everything.
const minimal=!adminAvailable;
const GuidedTour=lazy(()=>import('./scene/GuidedTour'));
class SceneBoundary extends Component<{children:ReactNode;onList:()=>void},{failed:boolean;message:string}>{
 state={failed:false,message:''};static getDerivedStateFromError(error:unknown){return {failed:true,message:error instanceof Error?error.message:String(error)};}
 componentDidCatch(error:Error,info:{componentStack?:string|null}){
  console.error('Museum scene failed',error,info.componentStack);
  if(['127.0.0.1','localhost','[::1]'].includes(location.hostname))void fetch('/__local-preview/scene-error',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({time:new Date().toISOString(),message:error.message,stack:error.stack,componentStack:info.componentStack})}).catch(()=>{});
 }
 render(){const stale=isStaleModuleError(this.state.message);return this.state.failed?<section className="fallback" role="alert"><h2>{stale?'Trang đang dùng phiên bản mã đã cũ':'Cảnh 3D gặp lỗi'}</h2><p>{stale?'Một tệp dựng cảnh đã được thay trong lần cập nhật website. Tải lại trang để nhận bộ mã mới; hồ sơ đã lưu trên trình duyệt vẫn được giữ.':'Đây có thể là lỗi dựng cảnh hoặc khởi tạo WebGL; chưa thể kết luận thiết bị không hỗ trợ.'}</p><p><strong>Chi tiết: </strong>{this.state.message||'Chưa có thông tin lỗi.'}</p><div className="fallback-actions"><button onClick={()=>window.location.reload()}>{stale?'Tải lại bản mới':'Thử tải lại trang'}</button><button className="gold" onClick={this.props.onList}>Xem danh sách ảnh</button></div><p>Danh sách ảnh và hồ sơ xem được ngay, không cần không gian 3D.</p></section>:this.props.children;}
}
const greeting='Xin kính chào quý thầy cô và quý khách. Mời tham quan khu cán bộ quản lý, các thế hệ nhà giáo và đội ngũ nhân viên. Mỗi người có một hồ sơ, ghi lại các đợt công tác tại trường. Đây là dữ liệu giả lập.';
function Photo({p}:{p:Person}){return <img src={portraitPath(p)} alt={'Chân dung '+displayName(p)} onError={e=>{e.currentTarget.onerror=null;e.currentTarget.src=import.meta.env.BASE_URL+'portraits/default.jpg';}}/>;}
export default function PeopleApp(){
 const snapshot=useSyncExternalStore(catalog.subscribe,catalog.getSnapshot),people=snapshot.people;
 const [view,setView]=useState<'home'|'room'|'list'|'admin'>('home'),[personId,setPerson]=useState<string|null>(null),[module,setModule]=useState<number|null>(null),[query,setQuery]=useState(''),[group,setGroup]=useState('all'),[dept,setDept]=useState('all'),[status,setStatus]=useState('all'),[sort,setSort]=useState('service'),[page,setPage]=useState(1),[caption,setCaption]=useState(greeting),[speaking,setSpeaking]=useState(false);
 const person=people.find(p=>p.id===personId);
 const admin=useSyncExternalStore(subscribeAdmin,isAdmin),[adminLogin,setAdminLogin]=useState(false);
 const speechRun=useRef(0);
 // 15/11 (việc 1): check WebGL before mounting the room — without it the visitor goes to the photo list instead.
 const webgl=useMemo(()=>view!=='room'||webglAvailable(document),[view]);
 const matching=(findPeople(people,query) as Person[]).filter(p=>(group==='all'||p.group===group)&&(dept==='all'||p.dept===dept)&&(status==='all'||p.status===status));
 const found=GROUPS.flatMap(g=>sortPeople(matching.filter(p=>p.group===g.id),sort)) as Person[];
 const pages=Math.max(1,Math.ceil(found.length/12)),currentPage=Math.min(page,pages);
 function silence(){speechRun.current++;window.speechSynthesis?.cancel();setSpeaking(false);}
 function navigate(v:typeof view){if(v==='list')track('tra-cuu');silence();setView(v);window.scrollTo({top:0,behavior:'auto'});}
 function speak(text:string){silence();setCaption(text);if(!window.speechSynthesis){setCaption(text+' Thiết bị chưa hỗ trợ giọng đọc; mời đọc phụ đề.');return;}const voice=vietnameseVoice(window.speechSynthesis.getVoices());if(!voice){setCaption(text+' Chưa có giọng tiếng Việt trên thiết bị; mời đọc phụ đề.');return;}const run=speechRun.current,u=new SpeechSynthesisUtterance(text);u.voice=voice;u.lang='vi-VN';u.rate=.92;u.onend=()=>{if(run===speechRun.current)setSpeaking(false);};u.onerror=()=>{if(run===speechRun.current){setSpeaking(false);setCaption(text+' Không phát được âm thanh; mời đọc phụ đề.');}};setSpeaking(true);window.speechSynthesis.speak(u);}
 useEffect(()=>()=>window.speechSynthesis?.cancel(),[]);
 useEffect(()=>{document.body.classList.toggle('public-site',minimal);},[]);
 /** The visitor's tap on “Bắt đầu tham quan”: fullscreen + landscape on phones, unlock the music, open the room. */
 // 17/11 (người dùng): nhạc mở ngay khi bấm “Bắt đầu tham quan” (chạy suốt màn chờ), không đợi vào phòng mới mở
 function startVisit(){void enterImmersive();startHallSound();track('bat-dau-tham-quan');navigate('room');}
 // 16/11: link opened inside Zalo/Facebook on a phone → offer Chrome (Android) / Safari or Chrome (iPhone) first.
 // “Ở lại” is remembered for this tab only.
 const [openIn,setOpenIn]=useState(()=>{
  // preview on a computer: ?xem-thu=zalo-android or ?xem-thu=zalo-ios shows this screen as Zalo would
  const demo=new URLSearchParams(location.search).get('xem-thu');
  if(demo==='zalo-android'||demo==='zalo-ios')return {app:'Zalo',platform:(demo==='zalo-ios'?'ios':'android') as 'android'|'ios'};
  if(!minimal)return null;const ua=navigator.userAgent,app=inAppBrowser(ua),platform=platformOf(ua,navigator.maxTouchPoints);
  if(!app||platform==='other')return null;
  try{if(sessionStorage.getItem('ptt-o-lai-trinh-duyet')==='1')return null;}catch{/* storage blocked: still offer */}
  return {app,platform:platform as 'android'|'ios'};
 });
 if(openIn)return <OpenInBrowser app={openIn.app} platform={openIn.platform} onStay={()=>{try{sessionStorage.setItem('ptt-o-lai-trinh-duyet','1');}catch{/* fine */}setOpenIn(null);}}/>;
 return <><header><div className="brand"><span className="emblem">▤</span><div><b>PHÒNG TRUYỀN THỐNG</b><small>NHÀ TRƯỜNG ẢO 3D</small></div></div>{/* 17/11 (người dùng): bỏ menu Trang chủ/Tham quan 3D/Tra cứu và nhãn “Dữ liệu giả lập” ở mọi máy; chỉ quản trị viên đã đăng nhập còn nút Quản trị hồ sơ */}
 <nav aria-label="Điều hướng chính">{!minimal&&adminAvailable&&admin&&<button className={view==='admin'?'active':''} onClick={()=>navigate('admin')}>Quản trị hồ sơ</button>}</nav></header>
 <main className={view==='room'?'museum-view':view==='home'?'welcome-host':undefined}>{(view==='list'||view==='admin')&&<section className="intro"><div><p className="eyebrow">LƯU GIỮ KÝ ỨC · KẾT NỐI CÁC THẾ HỆ</p><h1>{view==='list'?'Đội ngũ qua các thế hệ':'Quản trị hồ sơ chung'}</h1><p>Mỗi người một hồ sơ · Ghi nhận mọi đợt công tác tại trường</p></div>{minimal&&view==='list'?<div className="list-back"><button className="gold" onClick={()=>navigate('room')}>Vào tham quan 3D</button><button onClick={()=>navigate('home')}>Trang đầu</button></div>:<div className="counts"><b>{people.length}</b><span>HỒ SƠ<br/>PHÂN HỆ 01</span></div>}</section>}
 {samplePortraitMode&&view!=='home'&&<p className="sample-photo-note">Xem thử ảnh thẻ · Cùng một ảnh được lặp để kiểm tra khung hình; tên và hồ sơ vẫn là dữ liệu giả lập.</p>}
 {snapshot.storageError&&<p role="alert" className="form-error">{snapshot.storageError}</p>}
 {view==='list'&&<div className="toolbar"><label>Thứ tự danh sách<select aria-label="Thứ tự danh sách" value={sort} onChange={e=>{setSort(e.target.value);setPage(1);}}><option value="service">Năm bắt đầu công tác · trước đến sau</option><option value="birth">Năm sinh · lớn tuổi đến trẻ</option></select></label><span className="period-note">{sort==='birth'?'Danh sách theo tuổi; thiếu năm sinh xếp cuối. Không tự đổi vị trí ảnh trong phòng.':'Danh sách theo năm đầu công tác. Vị trí ảnh trong phòng được giữ cố định.'}</span></div>}
 {view==='home'&&<Welcome minimal={minimal} count={people.length} onEnter={startVisit} onModule={setModule} onList={()=>navigate('list')} onGreeting={()=>speaking?silence():speak(greeting)} speaking={speaking} caption={caption}/>}
 {view==='room'&&!webgl&&<section className="fallback" role="alert"><h2>Thiết bị chưa mở được không gian 3D</h2><p>Trình duyệt này không hỗ trợ đồ họa 3D (WebGL) hoặc đang tắt tăng tốc phần cứng. Bạn vẫn xem được đầy đủ ảnh và hồ sơ ở dạng danh sách.</p><div className="fallback-actions"><button className="gold" onClick={()=>navigate('list')}>Xem danh sách ảnh</button><button onClick={()=>window.location.reload()}>Thử lại</button></div></section>}
 {view==='room'&&webgl&&<SceneBoundary onList={()=>navigate('list')}><Suspense fallback={<VisitLoading onList={()=>navigate('list')}/>}><GuidedTour people={people} sort={sort} onSelect={id=>{silence();track('xem-ho-so');setPerson(id);}} onModule={setModule} onList={()=>navigate('list')} onNarrate={speak} onSilence={silence} caption={caption} speaking={speaking} paused={Boolean(personId||module)}/></Suspense></SceneBoundary>}
 {view==='list'&&<><div className="filters"><label>Tìm hồ sơ<input aria-label="Tìm hồ sơ" placeholder="Họ tên, mã hoặc chuyên môn…" value={query} onChange={e=>{setQuery(e.target.value);setPage(1);}}/></label><label>Khu trưng bày<select aria-label="Lọc khu trưng bày" value={group} onChange={e=>{setGroup(e.target.value);setPage(1);}}><option value="all">Tất cả</option>{GROUPS.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select></label><label>Tổ / bộ phận<select aria-label="Lọc tổ bộ phận" value={dept} onChange={e=>{setDept(e.target.value);setPage(1);}}><option value="all">Tất cả</option>{[...new Set(people.map(p=>p.dept))].sort().map(d=><option key={d}>{d}</option>)}</select></label><label>Trạng thái<select aria-label="Lọc trạng thái" value={status} onChange={e=>{setStatus(e.target.value);setPage(1);}}><option value="all">Tất cả</option>{STATUSES.map(s=><option key={s}>{s}</option>)}</select></label><p>{found.length} kết quả</p></div><div className="people-grid">{found.slice((currentPage-1)*12,currentPage*12).map(p=><button className="person-card" key={p.id} onClick={()=>{silence();setPerson(p.id);}}><Photo p={p}/><span className="person-id">{p.id}</span><b>{displayName(p)}</b><span>{roleText(p.role)} · {p.dept}</span><span>{workHistoryText(p)}</span><em>Xem hồ sơ →</em></button>)}</div>{!found.length&&<p className="empty">Không tìm thấy hồ sơ phù hợp.</p>}<div className="pager"><button disabled={currentPage<=1} onClick={()=>setPage(currentPage-1)}>← Trang trước</button><span>Trang {currentPage}/{pages}</span><button disabled={currentPage>=pages} onClick={()=>setPage(currentPage+1)}>Trang sau →</button></div></>}
 {view==='admin'&&adminAvailable&&PeopleAdmin&&(admin?<Suspense fallback={null}><PeopleAdmin people={people} storageError={snapshot.storageError}/></Suspense>:<section className="admin-info"><h2>Khu vực quản trị</h2><p>Chỉ quản trị viên được chỉnh sửa hồ sơ.</p><button className="gold" onClick={()=>setAdminLogin(true)}>Đăng nhập quản trị</button></section>)}
 {AdminLogin&&adminLogin&&<Suspense fallback={null}><AdminLogin onClose={()=>setAdminLogin(false)}/></Suspense>}
 {(view==='list'||view==='admin')&&!minimal&&<section className="modules" aria-label="Ba phân hệ"><button className="module-card available" onClick={()=>navigate('room')}><span>01 · ĐANG THỬ NGHIỆM</span><h3>CBQL – Giáo viên – Nhân viên</h3><p>Những người đã và đang công tác tại trường</p><b>Vào tham quan →</b></button>{[2,3].map(n=><button className="module-card" key={n} onClick={()=>setModule(n)}><span>0{n} · ĐANG XÂY DỰNG</span><h3>Tôn vinh {n===2?'giáo viên':'học sinh'} xuất sắc</h3><p>Khu vực giới thiệu — chưa triển khai</p><b>Xem thông báo →</b></button>)}</section>}
 {MC_ENABLED&&(view==='list'||view==='admin')&&!minimal&&<aside className="mc"><div><b>MC · Lời dẫn thử nghiệm</b><p role="status">{caption}</p></div><button onClick={()=>speaking?silence():speak(greeting)}>{speaking?'Tắt âm thanh':'Nghe lời chào'}</button></aside>}</main>
 {view!=='room'&&!minimal&&<footer><i>Tự hào quá khứ — Kiến tạo tương lai</i></footer>}
 {view!=='room'&&<UpdateBar/>}
 {module&&<Dialog title="Phân hệ đang xây dựng" onClose={()=>setModule(null)}><p>Khu vực “Tôn vinh {module===2?'giáo viên':'học sinh'} xuất sắc” hiện đang xây dựng. Vui lòng quay lại sau.</p><button className="gold" onClick={()=>setModule(null)}>Đã hiểu</button></Dialog>}
 {/* 17/11 (người dùng): hồ sơ là thật — bỏ ghi chú “giả lập”, mã hồ sơ, dòng trống; trình bày lại gọn, trang trọng */}
 {person&&<Dialog title={displayName(person)} onClose={()=>{silence();setPerson(null);}}><div className="profile profile-v2">
  <div className="profile-photo"><Photo p={person}/></div>
  <div className="profile-body">
   <p className="profile-role">{roleText(person.role)}{person.dept&&person.dept!=='Chưa phân tổ'?' · '+person.dept:''}</p>
   <dl>{([['Chức danh',roleText(person.role)],['Tổ / bộ phận',person.dept!=='Chưa phân tổ'?person.dept:''],['Năm sinh',person.birthYear??''],['Thời gian công tác',person.workHistory.map(h=>h.startYear+' – '+(h.endYear??(person.status==='Đang công tác'?'nay':'…'))+(person.workHistory.length>1?' · '+(h.role||person.role):'')).join(String.fromCharCode(10))],['Trạng thái',person.status]] as [string,string|number][]).filter(([,v])=>v!==''&&v!==null).map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
   {person.description&&<p className="profile-desc">{person.description}</p>}
   {MC_ENABLED&&<button className="profile-listen" onClick={()=>speak(person.name+'. '+person.role+'. Công tác: '+workHistoryText(person)+'. '+person.description)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>Nghe MC giới thiệu</button>}
  </div>
 </div></Dialog>}
 </>;
}
