// 18/11 (người dùng): video tham quan 3–4 phút để gửi giáo viên, học sinh và đăng fanpage trường.
// Chạy lại bất cứ lúc nào (không cần AI):  npm run quay-video        (thêm -- --nhanh để thử bản 640×360 trong vài phút)
//
// Cách làm: dựng bản web riêng `vite build --mode video` (giống hệt bản công khai, chỉ thêm móc đặt camera khi có ?video=1),
// mở bằng Chrome không giao diện có GPU, cho ĐỒNG HỒ của trang chạy theo từng khung hình (1/30 s — cửa trượt, đèn nhấp nháy,
// bộ đếm… đúng nhịp dù máy chậm), đặt camera theo kịch bản bên dưới, chụp từng khung và ghép bằng ffmpeg:
// MP4 H.264 1920×1080 30 hình/giây + nhạc nền của web (AAC) — đúng chuẩn Facebook / Zalo / YouTube.
// Bản ghi dùng dữ liệu đã xuất bản (public/data), hồ sơ trình duyệt tạm — không đụng dữ liệu máy quản trị, không tính lượt xem.
import {createRequire} from 'node:module';
import {spawn,spawnSync} from 'node:child_process';
import {existsSync,mkdirSync,rmSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {tmpdir} from 'node:os';

const WEB=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const OUT_DIR=resolve(WEB,'..','11-VIDEO-QUANG-BA');
const QUICK=process.argv.includes('--nhanh');
const [W,H]=QUICK?[640,360]:[1920,1080],FPS=30,PORT=4181;
const require=createRequire(join(process.env.APPDATA||'',  'npm/node_modules/'));
const {chromium}=require('playwright');
const FFMPEG=process.env.FFMPEG||[ 'ffmpeg',
 join(process.env.LOCALAPPDATA||'','Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-8.1-full_build/bin/ffmpeg.exe')]
 .find(f=>spawnSync(f,['-version']).status===0);
if(!FFMPEG)throw new Error('Không tìm thấy ffmpeg (đặt biến FFMPEG=đường dẫn ffmpeg.exe)');
const log=(...a)=>console.log(new Date().toLocaleTimeString('vi-VN'),...a);

// ───────────── Kịch bản (giây). cam = camera tự lướt; app = để web tự chạy (mở cửa, tự đi vào…) ─────────────
// pose: [mắt], [điểm nhìn], góc nhìn dọc (độ). 'here' = tư thế camera hiện tại.
const SWITCH=[3.375,1.62,8.57],COUNTER=[-3.375,1.62,8.59];
// 18/11 (lần 2, người dùng): có cảnh VUỐT màn hình cảm ứng (tivi), cảnh KHÓA (đóng) cửa bằng công tắc, và mỗi tổ bấm mở
// hồ sơ một người (tổ trưởng; Tổ Văn phòng: một nhân viên) để giáo viên biết cách xem.
// Vị trí lấy theo ảnh đang treo (public/data/catalog.json, 18/11) — xếp lại tường thì sửa các toạ độ TO_* bên dưới.
const NORMAL={back:[0,0,1],front:[0,0,-1],left:[1,0,0],right:[-1,0,0]};
/** Đến trước ảnh (cách 2 m, ngang tầm mắt), bấm mở hồ sơ, xem rồi đóng. */
const profile=(name,wall,pt,move=2.6)=>{const n=NORMAL[wall],eye=[pt[0]+n[0]*2,1.66,pt[2]+n[2]*2];
 return [{cam:[null,[eye,pt,54]],t:move},{hold:.6},{click:'centre',note:'hồ sơ '+name},{app:3.6},{press:'Escape'},{app:.7,keep:true}];};
const TO_NGU_VAN=[6.15,2.64,-7.86],TO_TOAN_TIN=[11.86,2.64,-6],TO_VAN_THE_MY=[11.86,1.44,2],TO_SU_DIA=[-11.86,1.44,-1],
 TO_TIENG_ANH=[-11.86,1.44,-2],TO_KHTN=[-4.35,1.44,-7.86],TO_VAN_PHONG=[-8.35,2.64,7.86];
const TV_SLIDES=11;   // số ảnh trình diễn đang có trên tivi (18/11) — thêm/bớt ảnh thì sửa số này
const SHOT=[
 // Sảnh: từ vách kính nhìn về cửa phòng, đi tới, liếc bảng THAM QUAN, dừng trước công tắc
 {cam:[[[0,1.7,16.2],[0,1.75,8.56],66],[[0,1.7,15.6],[0,1.75,8.56],66]],t:2},
 {cam:[null,[[0,1.7,13.2],[0,1.8,8.56],64]],t:5},
 {cam:[null,[[-1.0,1.68,11.4],COUNTER,52]],t:4},
 {hold:1.5},
 {cam:[null,[[1.4,1.66,11.2],SWITCH,50]],t:4.5},
 {hold:.8},
 {click:'centre',note:'bấm công tắc MỞ CỬA'},
 {app:9.5,note:'cửa trượt mở, web tự đưa vào phòng'},
 // Toàn cảnh rồi Ban Giám hiệu
 {cam:['here',[[0,1.85,6.6],[0,1.6,-7.8],70]],t:3.5},
 {cam:[null,[[0,1.72,-3.4],[0,1.85,-7.78],62]],t:6},
 // 18/11 (lần 3, người dùng): mở hồ sơ cả 3 người Ban Giám hiệu — Hiệu trưởng giữa, hai Phó Hiệu trưởng hai bên
 ...profile('Hiệu trưởng','back',[0,1.8,-7.73],2.5),
 ...profile('Phó Hiệu trưởng (trái)','back',[-1.486,1.8,-7.73],1.8),
 ...profile('Phó Hiệu trưởng (phải)','back',[1.486,1.8,-7.73],2.2),
 // Tường sau bên phải — Tổ Ngữ Văn
 {cam:[null,[[3.6,1.7,-4.4],[3.6,2.0,-7.86],62]],t:3},
 {cam:[null,[[8.4,1.7,-4.4],[8.4,2.0,-7.86],62]],t:5},
 ...profile('Tổ Ngữ Văn','back',TO_NGU_VAN),
 // Tường phải — Tổ Toán-Tin, Tổ Văn Thể Mỹ
 {cam:[null,[[8.6,1.7,-5.6],[11.86,2.0,-5.6],62]],t:3},
 ...profile('Tổ Toán-Tin','right',TO_TOAN_TIN),
 {cam:[null,[[8.6,1.7,-3],[11.86,2.0,-3],62]],t:2.5},
 {cam:[null,[[8.6,1.7,1],[11.86,2.0,1],62]],t:6},
 ...profile('Tổ Văn Thể Mỹ','right',TO_VAN_THE_MY),
 {cam:[null,[[8.6,1.7,4.8],[11.86,2.0,4.8],62]],t:4},
 // Tivi cảm ứng “Dấu ấn nhà trường”: vuốt qua lại, rồi chạm mở trình chiếu
 {cam:[null,[[7,1.72,3.4],[7,1.95,7.95],62]],t:4},
 {hold:1},
 // 18/11 (lần 3, người dùng): lướt hết tất cả ảnh trên tivi (11 ảnh → 11 lần vuốt, quay lại ảnh đầu) để tạo điểm nhấn
 ...Array.from({length:TV_SLIDES},(_,i)=>[{swipe:-.32,t:.5,note:i?undefined:`vuốt tivi qua ${TV_SLIDES} ảnh`},{app:1.35,keep:true}]).flat(),
 {tap:true,note:'chạm mở trình chiếu'},
 {app:5},{press:'Escape'},{app:.7,keep:true},
 // Sang tường trái — Tổ Sử-Địa, Tổ Tiếng Anh
 {cam:[null,[[1.5,1.9,2.5],[-11.86,1.9,-1],66]],t:4.5},
 {cam:[null,[[-8.4,1.7,4.8],[-11.86,2.0,4.8],62]],t:3.5},
 {cam:[null,[[-8.4,1.7,0.2],[-11.86,2.0,0.2],62]],t:6},
 ...profile('Tổ Sử-Địa','left',TO_SU_DIA),
 ...profile('Tổ Tiếng Anh','left',TO_TIENG_ANH,2),
 // Tường sau bên trái — Tổ KHTN
 {cam:[null,[[-8.4,1.7,-4.6],[-11.86,2.0,-4.6],62]],t:3.5},
 {cam:[null,[[-9.4,1.7,-4.4],[-9.4,2.0,-7.86],62]],t:3},
 {cam:[null,[[-6.0,1.7,-4.4],[-6.0,2.0,-7.86],62]],t:4},
 ...profile('Tổ KHTN','back',TO_KHTN),
 // Tường trước bên trái — Tổ Văn phòng
 {cam:[null,[[-6.1,1.7,4.4],[-6.1,2.0,7.86],62]],t:6},
 ...profile('Tổ Văn phòng','front',TO_VAN_PHONG),
 // Sơ đồ phòng (Bạn đang ở đây)
 {button:'Sơ đồ phòng chung',note:'mở sơ đồ'},
 {app:4.5},{button:'Đóng bảng điều khiển'},{app:.7,keep:true},
 // Ra sảnh, vào phòng tượng thầy Chu Văn An
 {cam:[null,[[0,1.7,5.6],[0,1.7,12],66]],t:4.5},
 {cam:[null,[[0.2,1.7,10.6],[6,1.6,12.1],66]],t:4},
 {cam:[null,[[3.7,1.65,12.1],[7.7,1.5,12.1],64]],t:4},
 {cam:[null,[[5.75,1.6,12.1],[7.7,1.55,12.1],62]],t:3.5},
 {hold:3.5},
 {cam:[null,[[6.0,1.6,12.4],[6.6,1.6,14.8],60]],t:3},
 {hold:3},
 // Ra sảnh, bấm công tắc ĐÓNG CỬA — hai cánh cửa khép lại
 {cam:[null,[[3.4,1.66,12.0],[0,1.7,8.56],62]],t:3.5},
 {cam:[null,[[1.4,1.66,11.2],SWITCH,50]],t:3},
 {hold:.8},
 {click:'centre',note:'bấm công tắc ĐÓNG CỬA'},
 {app:1.2,keep:true},
 {cam:[null,[[0.6,1.7,12.6],[0,1.75,8.56],60]],t:3},
 {hold:1.5},
 // Kết: nhìn qua vách kính ra sân trường
 {cam:[null,[[0.6,1.7,12.6],[0,1.8,16.86],68]],t:4.5},
 {hold:3},
];

// ───────────── Đồng hồ ảo: performance.now / Date.now / setTimeout / setInterval / rAF chạy theo khung hình ─────────────
const VIRTUAL_CLOCK=`(()=>{const rp=performance.now.bind(performance),rd=Date.now,rRaf=requestAnimationFrame.bind(window),rCaf=cancelAnimationFrame.bind(window),
 rST=setTimeout.bind(window),rCT=clearTimeout.bind(window),rSI=setInterval.bind(window),rCI=clearInterval.bind(window);
 let on=false,now=0,d0=0,seq=1e7;const raf=new Map(),timers=new Map();
 performance.now=()=>on?now:rp();Date.now=()=>on?d0+now:rd();
 window.requestAnimationFrame=cb=>{if(!on)return rRaf(cb);const i=++seq;raf.set(i,cb);return i;};
 window.cancelAnimationFrame=i=>{raf.has(i)?raf.delete(i):rCaf(i);};
 const add=(fn,ms,rep,args)=>{const i=++seq;timers.set(i,{fn,at:now+Math.max(0,+ms||0),ms:Math.max(1,+ms||0),rep,args});return i;};
 window.setTimeout=(fn,ms,...a)=>on&&typeof fn==='function'?add(fn,ms,false,a):rST(fn,ms,...a);
 window.setInterval=(fn,ms,...a)=>on&&typeof fn==='function'?add(fn,ms,true,a):rSI(fn,ms,...a);
 window.clearTimeout=i=>{timers.has(i)?timers.delete(i):rCT(i);};window.clearInterval=i=>{timers.has(i)?timers.delete(i):rCI(i);};
 window.__freeze=()=>{now=rp();d0=rd()-now;on=true;};
 window.__advance=ms=>{const end=now+ms;
  for(;;){let best=null;for(const [i,t] of timers)if(t.at<=end&&(!best||t.at<best[1].at))best=[i,t];if(!best)break;
   const [i,t]=best;now=Math.max(now,t.at);if(t.rep)t.at+=t.ms;else timers.delete(i);try{t.fn(...t.args);}catch(e){console.error(e);}}
  now=end;const cbs=[...raf.values()];raf.clear();for(const f of cbs){try{f(now);}catch(e){console.error(e);}}};
})();`;

// ───────────── Nội suy camera: vị trí theo đường cong mềm, hướng nhìn theo góc (không bị “giật” khi đổi khoảng cách) ─────────────
const ease=k=>k<=0?0:k>=1?1:.5-.5*Math.cos(Math.PI*k);
const angles=(e,t)=>{const dx=t[0]-e[0],dy=t[1]-e[1],dz=t[2]-e[2];return [Math.atan2(dx,-dz),Math.atan2(dy,Math.hypot(dx,dz))];};
const lerp=(a,b,k)=>a+(b-a)*k,lerpAng=(a,b,k)=>{let d=b-a;while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;return a+d*k;};
function poseAt(A,B,k){
 const e=A[0].map((v,i)=>lerp(v,B[0][i],k)),[ya,pa]=angles(A[0],A[1]),[yb,pb]=angles(B[0],B[1]);
 const y=lerpAng(ya,yb,k),p=lerp(pa,pb,k);return [e,[e[0]+Math.sin(y)*Math.cos(p),e[1]+Math.sin(p),e[2]-Math.cos(y)*Math.cos(p)],lerp(A[2],B[2],k)];
}

function run(cmd,args,opts={}){const r=spawnSync(cmd,args,{stdio:'inherit',shell:process.platform==='win32',cwd:WEB,...opts});if(r.status!==0)throw new Error(cmd+' '+args.join(' ')+' → '+r.status);}

async function main(){
 mkdirSync(OUT_DIR,{recursive:true});
 const tmp=join(tmpdir(),'quay-video-'+Date.now());mkdirSync(tmp);
 if(!process.argv.includes('--khong-dung')){log('Dựng bản web cho video…');run('npx',['vite','build','--mode','video','--outDir','dist-video','--emptyOutDir']);}
 log('Mở máy chủ xem trước…');
 const server=spawn('npx',['vite','preview','--outDir','dist-video','--host','127.0.0.1','--port',String(PORT),'--strictPort'],{cwd:WEB,shell:process.platform==='win32',stdio:'ignore'});
 const base=`http://127.0.0.1:${PORT}/`;
 for(let i=0;i<60;i++){try{if((await fetch(base)).ok)break;}catch{}await new Promise(r=>setTimeout(r,500));}
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=d3d11','--enable-gpu','--ignore-gpu-blocklist','--autoplay-policy=no-user-gesture-required']});
 let ff;
 try{
  const page=await browser.newPage({viewport:{width:W,height:H},deviceScaleFactor:1,reducedMotion:'no-preference'});
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.addInitScript(VIRTUAL_CLOCK);
  await page.goto(base+'?video=1',{waitUntil:'load',timeout:90000});
  await page.waitForTimeout(2500);
  await page.getByRole('button',{name:/Bắt đầu tham quan/}).first().waitFor({timeout:60000});await page.waitForTimeout(3000);
  await page.screenshot({path:join(tmp,'chao.png')});log('Đã chụp trang chào');
  await page.getByRole('button',{name:/Bắt đầu tham quan/}).first().click();
  const enter=page.getByRole('button',{name:/Vào tham quan/});await enter.waitFor({timeout:240000});
  await page.waitForTimeout(1500);await page.screenshot({path:join(tmp,'cho.png')});log('Đã chụp màn chờ');
  await enter.click();await page.waitForTimeout(2500);
  await page.evaluate(()=>window.dispatchEvent(new Event('museum-intro-skip')));
  await page.waitForFunction(()=>typeof window.__museumCamera==='function'&&typeof window.__museumPose==='function',null,{timeout:60000});
  await page.waitForTimeout(4000);   // ảnh, chữ, bóng đổ nạp xong
  await page.evaluate(()=>window.__freeze());

  // ffmpeg nhận từng khung JPEG qua ống dẫn → bản trung gian chất lượng cao
  const main=join(tmp,'canh.mp4');
  ff=spawn(FFMPEG,['-y','-loglevel','error','-f','image2pipe','-framerate',String(FPS),'-c:v','mjpeg','-i','-','-c:v','libx264','-preset','veryfast','-crf','12','-pix_fmt','yuv420p',main],{stdio:['pipe','inherit','inherit']});
  const box=await page.locator('canvas').first().boundingBox();
  let frames=0,pose=null;
  const frame=async()=>{
   await page.evaluate(ms=>window.__advance(ms),1000/FPS);
   const buf=await page.screenshot({type:'jpeg',quality:93});
   if(!ff.stdin.write(buf))await new Promise(r=>ff.stdin.once('drain',r));
   if(++frames%300===0)log(`${(frames/FPS).toFixed(0)} s video`);
  };
  const setPose=p=>page.evaluate(p=>window.__museumCamera(p[0],p[1],p[2]),p);
  const readPose=async()=>{const p=await page.evaluate(()=>window.__museumPose());return [p.eye,p.target,p.fov];};
  for(const s of SHOT){
   if(s.note)log(s.note);
   if(s.cam){
    const from=s.cam[0]==='here'?await readPose():s.cam[0]??pose,to=s.cam[1],n=Math.round(s.t*FPS);
    for(let i=1;i<=n;i++){pose=poseAt(from,to,ease(i/n));await setPose(pose);await frame();}
   }else if(s.hold){for(let i=0;i<Math.round(s.hold*FPS);i++){if(pose)await setPose(pose);await frame();}}
   else if(s.app){for(let i=0;i<Math.round(s.app*FPS);i++){if(s.keep&&pose)await setPose(pose);await frame();}if(!s.keep)pose=await readPose();}
   else if(s.click){await page.mouse.click(box.x+box.width/2,box.y+box.height/2);}
   else if(s.swipe||s.tap){
    // ngón tay ảo (chỉ có trong video): vòng tròn trắng mờ theo điểm chạm, để người xem thấy thao tác vuốt / chạm
    const cx=box.x+box.width/2,cy=box.y+box.height*.48,dx=(s.swipe||0)*box.width,n=Math.max(1,Math.round((s.t||.2)*FPS));
    const finger=(x,y,on)=>page.evaluate(([x,y,on])=>{let d=document.getElementById('video-finger');
     if(!d){d=document.createElement('div');d.id='video-finger';d.style.cssText='position:fixed;z-index:99999;width:64px;height:64px;margin:-32px 0 0 -32px;border-radius:50%;background:rgba(255,255,255,.42);border:3px solid rgba(255,255,255,.9);box-shadow:0 2px 14px rgba(0,0,0,.35);pointer-events:none;transition:none';document.body.appendChild(d);}
     d.style.left=x+'px';d.style.top=y+'px';d.style.opacity=on?'1':'0';},[x,y,on]);
    const x0=cx-dx/2;await page.mouse.move(x0,cy);await finger(x0,cy,true);for(let i=0;i<6;i++){await setPose(pose);await frame();}
    await page.mouse.down();
    for(let i=1;i<=n;i++){const x=x0+dx*ease(i/n);await page.mouse.move(x,cy);await finger(x,cy,true);await setPose(pose);await frame();}
    await page.mouse.up();for(let i=0;i<4;i++){await setPose(pose);await frame();}await finger(0,0,false);
   }
   else if(s.press){await page.keyboard.press(s.press);}
   else if(s.button){await page.getByRole('button',{name:s.button,exact:true}).first().click();}
  }
  ff.stdin.end();await new Promise(r=>ff.on('close',r));ff=null;
  log(`Đã quay ${frames} khung (${(frames/FPS).toFixed(1)} s).`,errors.length?'Lỗi trang: '+errors.slice(0,3).join(' | '):'Không có lỗi trang.');

  // Ghép: trang chào (5 s, đẩy nhẹ) → màn chờ (4 s) → cảnh 3D; nhạc nền của web, mở/tắt dần
  const total=5+4+frames/FPS-2,stamp=new Date().toISOString().slice(0,10);
  const out=join(OUT_DIR,`tham-quan-phong-truyen-thong-${stamp}${QUICK?'-thu':''}.mp4`);
  const still=(i,sec,zoom)=>`[${i}:v]scale=${W*2}:-2,zoompan=z='${zoom?`min(1+0.0004*on,1.06)`:'1'}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${sec*FPS}:s=${W}x${H}:fps=${FPS},format=yuv420p,setsar=1[s${i}]`;
  const graph=[still(0,5,true),still(1,4,false),`[2:v]fps=${FPS},format=yuv420p,setsar=1[m]`,
   `[s0][s1]xfade=transition=fade:duration=1:offset=4[a]`,`[a][m]xfade=transition=fade:duration=1:offset=7[b]`,
   `[b]fade=t=out:st=${(total-2).toFixed(2)}:d=2[v]`,
   `[3:a]atrim=0:${total.toFixed(2)},afade=t=in:d=1.5,afade=t=out:st=${(total-4).toFixed(2)}:d=4[au]`].join(';');
  log('Ghép video cuối…');
  run(FFMPEG,['-y','-loglevel','error','-loop','1','-i',join(tmp,'chao.png'),'-loop','1','-i',join(tmp,'cho.png'),'-i',main,
   '-stream_loop','-1','-i',join(WEB,'public/audio/nhac-nen-lien-mach.m4a'),'-filter_complex',graph,'-map','[v]','-map','[au]',
   '-c:v','libx264','-preset',QUICK?'veryfast':'slow','-crf','18','-profile:v','high','-pix_fmt','yuv420p','-r',String(FPS),
   '-c:a','aac','-b:a','192k','-ar','48000','-movflags','+faststart','-t',total.toFixed(2),out],{shell:false});
  log('XONG:',out);
 }finally{
  if(ff){try{ff.stdin.end();}catch{}}
  await browser.close();
  if(process.platform==='win32')spawnSync('taskkill',['/pid',String(server.pid),'/T','/F'],{stdio:'ignore'});else server.kill();
  rmSync(tmp,{recursive:true,force:true});
 }
}
main().catch(e=>{console.error(e);process.exit(1);});
