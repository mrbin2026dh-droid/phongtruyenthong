// 15/11 (việc 1): visitors on slow phones must never be stuck on “Đang tải…” with nothing to do.
// Pure helpers (tested in tests/loadWatch.test.mjs) for the loading screens.

/** After this long the loading screen offers “Thử lại” and “Xem danh sách ảnh”. */
export const SLOW_MS=20000;
/** No asset finished for this long = the download is probably stuck (shown as “gián đoạn”). */
export const STALL_MS=25000;

/** 17/11 (người dùng: “loading nhanh quá, cho người xem kịp quan sát” tranh tri ân): màn hình tải
 * hiện ít nhất chừng này dù mạng nhanh; luôn có nút “Vào tham quan” khi đã tải xong. */
export const MIN_SHOW_MS=8000;
/** Phần trăm hiển thị: không vượt tiến độ thật, và chạy đều tới 100 % trong MIN_SHOW_MS (không nhảy 0 → 99 ngay). */
export function shownProgress(real,elapsedMs,done){
 const cap=Math.floor(100*Math.max(0,elapsedMs)/MIN_SHOW_MS);
 return Math.max(0,Math.min(done?100:Math.min(99,real),cap,100));
}

/** 0–99 % (100 is never shown: the scene appears instead). The room model is the largest download,
 * so it weighs more than one portrait: room 40 · statue 15 · portraits 45 (statue 40 · portraits 60 without the room). */
export function loadProgress({needRoom,roomReady,statueReady,imagesDone,imagesTotal}){
 const w=needRoom?{room:40,statue:15,images:45}:{room:0,statue:40,images:60};
 const img=imagesTotal>0?Math.min(1,imagesDone/imagesTotal):0;
 const v=(needRoom&&roomReady?w.room:0)+(statueReady?w.statue:0)+w.images*img;
 return Math.max(0,Math.min(99,Math.floor(v)));
}

/** What the visitor is waiting for, in plain words. */
export function loadStage({needRoom,roomReady,statueReady,imagesDone,imagesTotal}){
 if(needRoom&&!roomReady)return 'Đang tải mô hình phòng';
 if(!statueReady)return 'Đang tải tượng Chu Văn An';
 if(imagesTotal>imagesDone)return 'Đang tải ảnh chân dung ('+imagesDone+'/'+imagesTotal+')';
 return 'Đang dựng không gian 3D';
}

/** True when the browser can create a WebGL context (the 3D room needs it). Releases the test context. */
export function webglAvailable(doc){
 try{
  const c=doc.createElement('canvas');
  const gl=c.getContext('webgl2')||c.getContext('webgl');
  if(!gl)return false;
  gl.getExtension?.('WEBGL_lose_context')?.loseContext();
  return true;
 }catch{return false;}
}
