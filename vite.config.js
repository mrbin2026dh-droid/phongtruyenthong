import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { cpSync, createReadStream,appendFileSync,mkdirSync,writeFileSync,readFileSync,existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { buildPublication, writePublication, existingPhotoFiles } from './scripts/publishData.mjs';

// GĐ4 benchmark results may come from a phone on the same Wi-Fi (private address ranges only).
function privateClient(addr=''){const a=String(addr).replace(/^::ffff:/,'');return a==='::1'||/^127\./.test(a)||/^10\./.test(a)||/^192\.168\./.test(a)||/^172\.(1[6-9]|2\d|3[01])\./.test(a);}

// Cách 1 — admin “Xuất bản lên website” (dev server only, this computer only).
// Writes public/data (catalog.json + photos), then commits and pushes ONLY that folder to GitHub.
const ROOT=fileURLToPath(new URL('.',import.meta.url)).replace(/[\\/]$/,'');
const loopback=addr=>['127.0.0.1','::1','::ffff:127.0.0.1'].includes(addr);
function git(args){return new Promise(resolve=>execFile('git',args,{cwd:ROOT,timeout:120000,windowsHide:true},(err,stdout,stderr)=>resolve({ok:!err,out:String(stdout||'')+String(stderr||'')})));}
async function pushPublication(){
 if(!(await git(['rev-parse','--is-inside-work-tree'])).ok)return {state:'no-repo',message:'Đã lưu trên máy. Chưa kết nối GitHub (thư mục website chưa là kho Git) — xem HUONG-DAN-QUAN-TRI.md mục “Lần đầu”.'};
 const add=await git(['add','--','public/data']);if(!add.ok)return {state:'error',message:'Không thêm được tệp vào Git: '+add.out.slice(0,300)};
 const staged=await git(['diff','--cached','--quiet','--','public/data']);
 if(staged.ok)return {state:'nothing',message:'Không có thay đổi mới để đưa lên GitHub.'};
 const stamp=new Date().toLocaleString('vi-VN',{timeZone:'Asia/Bangkok'});
 const commit=await git(['commit','-m','Cập nhật dữ liệu phòng truyền thống ('+stamp+')','--','public/data']);
 if(!commit.ok)return {state:'error',message:'Không tạo được bản ghi Git: '+commit.out.slice(0,300)};
 if(!(await git(['remote'])).out.trim())return {state:'no-remote',message:'Đã lưu và ghi vào Git trên máy, nhưng chưa có kho GitHub (remote) để đưa lên.'};
 const push=await git(['push']);
 return push.ok?{state:'pushed',message:'Đã đưa lên GitHub.'}:{state:'error',message:'Đã lưu trên máy nhưng chưa đưa lên GitHub được (kiểm tra mạng/đăng nhập GitHub): '+push.out.slice(0,300)};
}
function localAdmin(server){
 server.middlewares.use((req,res,next)=>{
  if(req.url?.split('?')[0]!=='/__local-admin/publish')return next();
  const fail=(code,error)=>{res.statusCode=code;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({error}));};
  if(!loopback(req.socket.remoteAddress)||req.method!=='POST')return fail(403,'Chỉ xuất bản được từ chính máy quản trị.');
  const origin=req.headers.origin;if(!origin||origin!=='http://'+req.headers.host)return fail(403,'Yêu cầu không hợp lệ.');
  let body='';req.on('data',chunk=>{body+=chunk;if(body.length>200e6)req.destroy();});
  req.on('end',async()=>{
   try{
    const input=JSON.parse(body);if(input.consent!==true)throw new Error('Cần xác nhận các thầy cô đã đồng ý công khai.');
    const before=existingPhotoFiles(ROOT),publication=buildPublication(input.people||[],before);
    writePublication(ROOT,publication);
    const gitResult=await pushPublication();
    res.setHeader('Content-Type','application/json');
    res.end(JSON.stringify({written:publication.catalog.people.length,photos:publication.files.size,removedPhotos:publication.removed.length,git:gitResult,published:{people:publication.catalog.people}}));
   }catch(err){fail(400,err instanceof Error?err.message:'Không xuất bản được.');}
  });
 });
}

// User-supplied photos stay outside public and the build; loopback preview only.
// 15/11: admin photo tool (thay áo) — MediaPipe model + wasm served ONLY by the dev server, ONLY to this computer.
// Files stay outside public/, so they are never part of the GitHub Pages site.
const TOOL_FILES={
 'selfie_multiclass_256x256.tflite':['tools-models/selfie_multiclass_256x256.tflite','application/octet-stream'],
 'vision_wasm_internal.js':['node_modules/@mediapipe/tasks-vision/wasm/vision_wasm_internal.js','text/javascript'],
 'vision_wasm_internal.wasm':['node_modules/@mediapipe/tasks-vision/wasm/vision_wasm_internal.wasm','application/wasm'],
 'vision_wasm_nosimd_internal.js':['node_modules/@mediapipe/tasks-vision/wasm/vision_wasm_nosimd_internal.js','text/javascript'],
 'vision_wasm_nosimd_internal.wasm':['node_modules/@mediapipe/tasks-vision/wasm/vision_wasm_nosimd_internal.wasm','application/wasm'],
};
function localTools(server){
 server.middlewares.use((req,res,next)=>{
  const p=req.url?.split('?')[0]||'';if(!p.startsWith('/__local-tools/'))return next();
  const a=String(req.socket.remoteAddress||'').replace(/^::ffff:/,'');
  if(!(a==='::1'||a.startsWith('127.'))||req.method!=='GET'){res.statusCode=403;res.end();return;}
  const hit=TOOL_FILES[p.slice('/__local-tools/'.length)];if(!hit){res.statusCode=404;res.end();return;}
  res.setHeader('Content-Type',hit[1]);res.setHeader('Cache-Control','no-store');
  createReadStream(fileURLToPath(new URL('./'+hit[0],import.meta.url))).on('error',()=>{res.statusCode=404;res.end();}).pipe(res);
 });
}

function localPortrait(server){
 server.middlewares.use((req,res,next)=>{
  // Dev-only: save a ?bench=1 report (JSON ≤ 64 KB) to local-preview/bench/. Same-origin, private network only.
  if(req.url?.split('?')[0]==='/__local-preview/bench'){
   if(!privateClient(req.socket.remoteAddress)||req.method!=='POST'){res.statusCode=403;res.end();return;}
   const origin=req.headers.origin;
   if(origin&&origin!=='http://'+req.headers.host){res.statusCode=403;res.end();return;}
   let body='';req.on('data',chunk=>{body+=chunk;if(body.length>65536)req.destroy();});
   req.on('end',()=>{try{const data=JSON.parse(body);if(!data||typeof data!=='object'||!data.summary)throw 0;
    const dir=fileURLToPath(new URL('./local-preview/bench/',import.meta.url));mkdirSync(dir,{recursive:true});
    const name='bench-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json';
    writeFileSync(dir+name,JSON.stringify({...data,client:String(req.socket.remoteAddress||'')},null,1));res.statusCode=204;}catch{res.statusCode=400;}res.end();});return;
  }
  // Dev-only QA helper: save a canvas snapshot (JPEG data URL) to local-preview/snapshots/<name>.jpg.
  // Loopback + same-origin only; used by AI sessions to inspect the scene at full resolution.
  if(req.url?.split('?')[0]==='/__local-preview/snapshot'){
   if(!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress)||req.method!=='POST'){res.statusCode=403;res.end();return;}
   const origin=req.headers.origin;
   if(origin&&origin!=='http://'+req.headers.host){res.statusCode=403;res.end();return;}
   let body='';req.on('data',chunk=>{body+=chunk;if(body.length>12e6)req.destroy();});
   req.on('end',()=>{try{const {name,data}=JSON.parse(body);const safe=String(name||'snapshot').replace(/[^a-z0-9_-]/gi,'').slice(0,60)||'snapshot';
    const m=/^data:image\/jpeg;base64,(.+)$/.exec(String(data||''));if(!m)throw 0;
    const dir=fileURLToPath(new URL('./local-preview/snapshots/',import.meta.url));mkdirSync(dir,{recursive:true});
    writeFileSync(dir+safe+'.jpg',Buffer.from(m[1],'base64'));res.statusCode=204;}catch{res.statusCode=400;}res.end();});return;
  }
  if(req.url?.split('?')[0]==='/__local-preview/scene-error'){
   if(!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress)||req.method!=='POST'){res.statusCode=403;res.end();return;}
   const origin=req.headers.origin;
   if(origin&&origin!=='http://'+req.headers.host){res.statusCode=403;res.end();return;}
   let body='';req.on('data',chunk=>{body+=chunk;if(body.length>32768)req.destroy();});
   req.on('end',()=>{try{const input=JSON.parse(body);const entry={time:String(input.time||'').slice(0,80),message:String(input.message||'').slice(0,4000),stack:String(input.stack||'').slice(0,12000),componentStack:String(input.componentStack||'').slice(0,12000)};mkdirSync(fileURLToPath(new URL('./local-preview',import.meta.url)),{recursive:true});appendFileSync(fileURLToPath(new URL('./local-preview/scene-errors.jsonl',import.meta.url)),JSON.stringify(entry)+'\n');res.statusCode=204;}catch{res.statusCode=400;}res.end();});return;
  }
  const files={'/__local-preview/portrait.jpg':'portrait.jpg','/__local-preview/school-campus.jpg':'school-campus.jpg'};
  const file=files[req.url?.split('?')[0]];
  if(!file)return next();
  if(!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress)){res.statusCode=403;res.end();return;}
  if(!['GET','HEAD'].includes(req.method)){res.statusCode=405;res.end();return;}
  const stream=createReadStream(fileURLToPath(new URL('./local-preview/'+file,import.meta.url)));
  stream.on('error',()=>{if(!res.headersSent)res.statusCode=404;res.end();});
  res.setHeader('Content-Type','image/jpeg');res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method==='HEAD'){stream.destroy();res.end();}else stream.pipe(res);
 });
}
// 16/11: phones kept an old hall-baked-mobile.glb in cache after an update (no glass wall / stairs). Same file
// names on GitHub Pages → add a content hash of the heavy assets to their URLs, so a new upload is always fetched.
const ASSETS=['models/hall-baked.glb','models/hall-baked-mobile.glb','models/chu-van-an-seated-web-v3.glb','textures/san-truong-qua-kinh.webp','audio/nhac-nen-piano-strings.m4a'];
const assetHash=createHash('md5');for(const a of ASSETS){const f=fileURLToPath(new URL('./public/'+a,import.meta.url));if(existsSync(f))assetHash.update(readFileSync(f));}
const ASSET_V=assetHash.digest('hex').slice(0,10);


// PWA P1–P2 (15/11, 05-HUONG-DAN-AI/KE-HOACH-PWA.md): installable app + works offline after the first visit.
// The service worker exists only in the production build (GitHub Pages); the admin computer runs the dev server
// (QUAN-TRI.cmd) where vite-plugin-pwa does nothing, so admin pages are never cached.
const pwa=VitePWA({
 injectRegister:false,              // registered in src/main.tsx, production only
 // P3 KILL-SWITCH: if a published version ever breaks visitors' phones, set selfDestroying:true and push once —
 // every phone removes the service worker and its caches and loads straight from GitHub again. Set back to false later.
 selfDestroying:false,
 registerType:'prompt',             // a new version waits until every tab of the app is closed (update bar = P3)
 includeAssets:['icons/apple-touch-icon-180.png'],   // manifest icons are added automatically
 manifest:{
  id:'./',start_url:'./?nguon=app',scope:'./',
  name:'Phòng truyền thống nhà trường 3D',short_name:'Phòng truyền thống',
  description:'Tham quan phòng truyền thống 3D: chân dung cán bộ, giáo viên, nhân viên qua các thế hệ.',
  lang:'vi',dir:'ltr',categories:['education'],
  display:'fullscreen',display_override:['fullscreen','standalone'],
  orientation:'any',                 // the welcome page stays usable upright; “Bắt đầu tham quan” locks landscape
  background_color:'#122d38',theme_color:'#0e2546',
  icons:[
   {src:'icons/icon-192.png',sizes:'192x192',type:'image/png',purpose:'any'},
   {src:'icons/icon-512.png',sizes:'512x512',type:'image/png',purpose:'any'},
   {src:'icons/icon-maskable-512.png',sizes:'512x512',type:'image/png',purpose:'maskable'}
  ],
  screenshots:[{src:'welcome/welcome-architecture-1600.webp',sizes:'1600x900',type:'image/webp',form_factor:'wide',label:'Phòng truyền thống 3D'}]
 },
 workbox:{
  cacheId:'ptt',
  // first install: take control of the open page at once, so the 3D models loaded in the FIRST visit are cached too.
  // Updates still wait (no skipWaiting) until all tabs are closed.
  clientsClaim:true,
  // app shell: code, styles, fonts (woff2 only), MC picture, icons — about 1 MB, versioned by file hash
  globPatterns:['**/*.{js,css,html,svg,woff2}','mc/*.png'],
  globIgnores:['**/node_modules/**'],
  maximumFileSizeToCacheInBytes:3*1024*1024,
  navigateFallback:'index.html',
  navigateFallbackDenylist:[/\/__/,/\/data\//],
  cleanupOutdatedCaches:true,
  runtimeCaching:[
   // published data: newest first (admin “Xuất bản”), cached copy when offline or after 3 s without network
   {urlPattern:({url})=>url.pathname.endsWith('/data/catalog.json'),handler:'NetworkFirst',
    options:{cacheName:'ptt-du-lieu',networkTimeoutSeconds:3,cacheableResponse:{statuses:[200]}}},
   // teacher photos: file names carry a content hash, a changed photo is a new URL
   {urlPattern:({url})=>url.pathname.includes('/data/photos/'),handler:'CacheFirst',
    options:{cacheName:'ptt-anh-giao-vien',expiration:{maxEntries:400},cacheableResponse:{statuses:[200]}}},
   // 3D models and the schoolyard texture: ?v= content hash in the URL, old versions dropped by maxEntries
   {urlPattern:({url})=>/\/(models|textures)\//.test(url.pathname),handler:'CacheFirst',
    options:{cacheName:'ptt-mo-hinh',expiration:{maxEntries:8},cacheableResponse:{statuses:[200]}}},
   // music is streamed with Range requests (206, not cacheable); served from cache only once a full copy exists (P6)
   {urlPattern:({url})=>url.pathname.includes('/audio/'),handler:'CacheFirst',
    options:{cacheName:'ptt-am-thanh',rangeRequests:true,expiration:{maxEntries:3},cacheableResponse:{statuses:[200]}}},
   {urlPattern:({url})=>/\/(welcome|portraits)\//.test(url.pathname),handler:'StaleWhileRevalidate',
    options:{cacheName:'ptt-anh-trang',expiration:{maxEntries:20},cacheableResponse:{statuses:[200]}}}
  ]
 }
});

export default defineConfig({define:{__ASSET_V__:JSON.stringify(ASSET_V)},base:process.env.VITE_BASE_PATH || './',server:{headers:{'Cache-Control':'no-store'}},preview:{headers:{'Cache-Control':'no-store'}},plugins:[pwa,{name:'local-admin-publish',apply:'serve',configureServer:localAdmin},{name:'local-admin-tools',apply:'serve',configureServer:localTools},{name:'local-portrait-preview',configureServer:localPortrait,configurePreviewServer:localPortrait}],build:{emptyOutDir:true,target:'es2022',chunkSizeWarningLimit:1200}});
