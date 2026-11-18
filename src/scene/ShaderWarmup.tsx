// 18/11 (đo trên điện thoại giả lập, CPU chậm 6×): đứng hình 0,3–1,2 s khi đi trong phòng — hồ sơ CPU cho thấy
// getProgramInfoLog ≈ 1 s: mỗi loại vật liệu lần đầu lọt vào khung nhìn thì trình duyệt phải dịch chương trình vẽ (shader)
// NGAY LÚC ĐÓ và three.js đứng chờ để kiểm lỗi. Sửa theo khuyến nghị của three.js:
// 1) dịch sẵn mọi shader của cảnh trong lúc chờ (renderer.compileAsync — song song, không chặn khi máy hỗ trợ
//    KHR_parallel_shader_compile), làm lại mỗi khi có thêm vật thể/ảnh (sceneAssets đổi phiên bản), có giãn cách;
// 2) bản công khai tắt kiểm lỗi shader đồng bộ (debug.checkShaderErrors) — chỉ bật khi phát triển.
import {useEffect,useSyncExternalStore} from 'react';
import {useThree} from '@react-three/fiber';
import {subscribeAssets,assetsVersion} from './sceneAssets';

export const WARMUP_DELAY_MS=400;
export default function ShaderWarmup(){
 const gl=useThree(s=>s.gl),scene=useThree(s=>s.scene),camera=useThree(s=>s.camera),invalidate=useThree(s=>s.invalidate);
 useEffect(()=>{gl.debug.checkShaderErrors=Boolean(import.meta.env.DEV);
  if(import.meta.env.DEV||import.meta.env.MODE==='video')(window as any).__museumRenderer=gl;   // QA only (đo hiệu năng / quay video)
 },[gl]);
 const version=useSyncExternalStore(subscribeAssets,assetsVersion);
 useEffect(()=>{let alive=true;
  const id=setTimeout(()=>{const r=gl as any;
   Promise.resolve(r.compileAsync?r.compileAsync(scene,camera):r.compile(scene,camera)).then(()=>{if(alive)invalidate();}).catch(()=>undefined);},WARMUP_DELAY_MS);
  return()=>{alive=false;clearTimeout(id);};},[version,gl,scene,camera,invalidate]);
 return null;
}
