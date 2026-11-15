import {useState} from 'react';
import VirtualHost from './VirtualHost';
type Props={count:number;onEnter:()=>void;onModule:(id:number)=>void;onList:()=>void;onGreeting:()=>void;speaking:boolean;caption:string};
function Emblem({kind}:{kind:'people'|'trophy'|'cap'|'book'|'arrow'|'sound'|'devices'}){
 const p={viewBox:'0 0 48 48',fill:'none',stroke:'currentColor',strokeWidth:1.8,strokeLinecap:'round' as const,strokeLinejoin:'round' as const,'aria-hidden':true as const};
 return <svg {...p}>{kind==='people'?<><circle cx="24" cy="13" r="6"/><circle cx="9" cy="17" r="4"/><circle cx="39" cy="17" r="4"/><path d="M13 39V31a11 11 0 0 1 22 0v8ZM2 36v-8a7 7 0 0 1 10-6M46 36v-8a7 7 0 0 0-10-6"/></>:kind==='trophy'?<><path d="M15 7h18v13a9 9 0 0 1-18 0ZM24 29v9M16 41h16M15 11H7v5a9 9 0 0 0 10 9M33 11h8v5a9 9 0 0 1-10 9"/><path d="m24 12 2 4 4 .5-3 3 .8 4-3.8-2-3.8 2 .8-4-3-3 4-.5Z"/></>:kind==='cap'?<><path d="m3 17 21-9 21 9-21 9ZM11 22v11c8 6 18 6 26 0V22M43 18v17M40 39h6l-3-6Z"/></>:kind==='book'?<><path d="M24 10v31M5 8c8-1 14 1 19 5 5-4 11-6 19-5v29c-8-1-14 1-19 5-5-4-11-6-19-5ZM10 17l8 2M10 23l8 2M30 19l8-2M30 25l8-2"/></>:kind==='arrow'?<path d="M9 24h30M29 14l10 10-10 10"/>:kind==='sound'?<><path d="M7 19h7l10-8v26l-10-8H7ZM31 17a10 10 0 0 1 0 14M36 11a18 18 0 0 1 0 26"/></>:<><rect x="4" y="7" width="29" height="23" rx="3"/><path d="M18 31v8M10 40h16"/><rect x="32" y="20" width="12" height="23" rx="2"/></>}</svg>;
}
export default function Welcome({count,onEnter,onModule,onList,onGreeting,speaking,caption}:Props){
 const [showCaption,setShowCaption]=useState(false);
 const [schoolPhoto,setSchoolPhoto]=useState(['localhost','127.0.0.1','[::1]'].includes(window.location.hostname));
 return <div className="welcome-page">
  <section className="welcome-hero" aria-labelledby="welcome-title">
   <div className="welcome-intro">
    <h1 id="welcome-title">Phòng truyền thống<br/><span>nhà trường 3D</span></h1>
    <p className="welcome-lead">Gặp lại những gương mặt đã góp phần làm nên truyền thống nhà trường, qua một hành trình khám phá không gian 3D.</p>
    <div className="welcome-ornament" aria-hidden="true"><span/>✦<span/></div>
    <button className="welcome-start" onClick={onEnter}><Emblem kind="book"/><span>Bắt đầu tham quan</span><Emblem kind="arrow"/></button>
    <VirtualHost active={showCaption} caption={caption} speaking={speaking} onPlay={()=>{setShowCaption(true);onGreeting();}} onStop={()=>{if(speaking)onGreeting();setShowCaption(false);}}/>
   </div>
   <figure className="welcome-campus">
    <img src={schoolPhoto?'/__local-preview/school-campus.jpg':import.meta.env.BASE_URL+'welcome/welcome-architecture.png'} alt={schoolPhoto?'Toàn cảnh khuôn viên trường từ trên cao, các dãy nhà mái đỏ bao quanh sân trường và cây xanh':'Phối cảnh phòng truyền thống minh họa dựng bằng Blender'} width="2048" height="1152" fetchPriority="high" onError={()=>{if(schoolPhoto)setSchoolPhoto(false);}}/>
   </figure>
  </section>
  <section className="welcome-choices" aria-label="Chọn phân hệ tham quan">
   <article className="welcome-choice welcome-open"><div className="welcome-choice-head"><div className="welcome-choice-icon"><Emblem kind="people"/></div><div><span className="welcome-choice-number">PHÂN HỆ 01</span><h2>CBQL – Giáo viên<br/>– Nhân viên</h2></div></div><p>Những người đã và đang công tác tại trường. Mỗi người một hồ sơ, lưu lại các đợt công tác.</p><button onClick={onEnter}><span>Vào tham quan</span><Emblem kind="arrow"/></button><span className="welcome-choice-motif" aria-hidden="true"><Emblem kind="people"/></span></article>
   <article className="welcome-choice welcome-planned"><div className="welcome-choice-head"><div className="welcome-choice-icon"><Emblem kind="trophy"/></div><div><span className="welcome-choice-number">PHÂN HỆ 02</span><h2>Tôn vinh giáo viên<br/>xuất sắc</h2></div></div><span className="welcome-status">ĐANG XÂY DỰNG</span><p>Không gian dành cho những đóng góp tiêu biểu trong sự nghiệp giáo dục.</p><button onClick={()=>onModule(2)} aria-label="Xem thông báo phân hệ Tôn vinh giáo viên xuất sắc">Xem giới thiệu <Emblem kind="arrow"/></button><span className="welcome-choice-motif" aria-hidden="true"><Emblem kind="trophy"/></span></article>
   <article className="welcome-choice welcome-planned"><div className="welcome-choice-head"><div className="welcome-choice-icon"><Emblem kind="cap"/></div><div><span className="welcome-choice-number">PHÂN HỆ 03</span><h2>Tôn vinh học sinh<br/>xuất sắc</h2></div></div><span className="welcome-status">ĐANG XÂY DỰNG</span><p>Không gian ghi nhận tinh thần học tập, rèn luyện và những thành tích nổi bật.</p><button onClick={()=>onModule(3)} aria-label="Xem thông báo phân hệ Tôn vinh học sinh xuất sắc">Xem giới thiệu <Emblem kind="arrow"/></button><span className="welcome-choice-motif" aria-hidden="true"><Emblem kind="cap"/></span></article>
  </section>
  <section className="welcome-facts" aria-label="Thông tin bản tham quan"><div><Emblem kind="people"/><p><b>{count} hồ sơ mẫu</b><span>Đội ngũ qua các thế hệ</span></p></div><div><Emblem kind="devices"/><p><b>Chuột và cảm ứng</b><span>Tự bước hoặc đi theo lối dẫn</span></p></div><button onClick={onList}><Emblem kind="book"/><p><b>Tra cứu nhanh</b><span>Tìm kiếm và xem hồ sơ 2D</span></p><Emblem kind="arrow"/></button></section>
  <p className="welcome-sample-note">Bản trải nghiệm thử · Hồ sơ nhân sự giả lập{schoolPhoto?' · Ảnh khuôn viên do người dùng cung cấp':''}</p>
 </div>;
}
