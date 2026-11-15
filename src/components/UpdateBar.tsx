import {useSyncExternalStore} from 'react';
import {applyUpdate,dismissUpdate,getPwa,subscribePwa} from '../data/pwa';
import '../pwa.css';

/** P3 (16/11): a new version of the app is waiting. Shown outside the 3D room only, so a visit is never reloaded midway. */
export default function UpdateBar(){
 const {needRefresh}=useSyncExternalStore(subscribePwa,getPwa);
 if(!needRefresh)return null;
 return <div className="update-bar" role="status">
  <span><b>Đã có nội dung mới</b> Cập nhật để xem bản mới nhất.</span>
  <button type="button" className="update-bar-go" onClick={()=>void applyUpdate()}>Cập nhật</button>
  <button type="button" className="update-bar-later" onClick={dismissUpdate}>Để sau</button>
 </div>;
}
