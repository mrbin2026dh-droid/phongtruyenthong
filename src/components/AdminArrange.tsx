import {useMemo,useState} from 'react';
import Dialog from './Dialog';
import {catalog,type Person} from '../data/repository';
import {arrangeByDept,deptGroups} from '../data/arrangeByDept.mjs';

const WALL:Record<string,string>={back:'Tường chính (BGH)',left:'Tường trái',right:'Tường phải',front:'Tường cửa vào'};
const segName=(wall:string,seg:number)=>wall==='back'?(seg===0?'Tường chính – bên trái BGH':'Tường chính – bên phải BGH'):WALL[wall];

/** 17/11 (user): “Sắp xếp theo tổ” on the admin computer. Step 1: check / merge / rename the tổ (spelling variants are already
 * merged). Step 2: preview where each tổ goes. Apply = one save; “Hoàn tác” puts the previous wall back. Publish as usual. */
export default function AdminArrange({onClose,onDone}:{onClose:()=>void;onDone:(msg:string)=>void}){
 const people=catalog.getSnapshot().people as Person[];
 const groups=useMemo(()=>deptGroups(people),[people]);
 const [names,setNames]=useState<Record<string,string>>(()=>Object.fromEntries(groups.map(g=>[g.key,g.name])));
 const [into,setInto]=useState<Record<string,string>>({});
 const [error,setError]=useState(''),[undo,setUndo]=useState<Person[]|null>(null),[busy,setBusy]=useState(false);
 // final name per spelling key: a merged group takes the name of the group it joins
 const finalNames=useMemo(()=>Object.fromEntries(groups.map(g=>{let k=g.key,seen=0;while(into[k]&&seen++<groups.length)k=into[k];return [g.key,(names[k]||'').trim()||g.name];})),[groups,names,into]);
 const result=useMemo(()=>arrangeByDept(people,finalNames),[people,finalNames]);
 const office=groups.filter(g=>/van phong/.test(g.key)).reduce((n,g)=>n+g.count,0);
 const bySeg=new Map<string,{name:string;count:number}[]>();
 for(const p of result.plan)for(const part of p.parts){const k=segName(part.wall,part.seg);if(!bySeg.has(k))bySeg.set(k,[]);bySeg.get(k)!.push({name:p.name,count:part.count});}

 function apply(){
  setError('');setBusy(true);
  try{const before=catalog.arrange(result.slot,result.rename);setUndo(before);
   onDone('Đã sắp xếp '+result.teachers+' giáo viên theo '+result.plan.length+' tổ · chưa xuất bản');}
  catch(err){setError(err instanceof Error?err.message:'Không sắp xếp được.');}finally{setBusy(false);}
 }
 function revert(){if(!undo)return;try{catalog.restorePeople(undo);setUndo(null);onDone('Đã hoàn tác sắp xếp theo tổ.');}catch(err){setError(err instanceof Error?err.message:'Không hoàn tác được.');}}

 return <Dialog title="Sắp xếp giáo viên theo tổ" onClose={onClose}>
  <div className="admin-arrange">
   {!undo?<>
    <p className="fine">Bước 1 · Kiểm tra tên tổ. Các cách viết khác nhau (hoa/thường, dấu gạch) đã được gộp sẵn. Nếu hai tổ thật ra là một
     (ví dụ “Ngoại ngữ” và “Tiếng Anh”), chọn <b>Gộp vào</b>. Có thể sửa tên tổ cho đúng; tên này hiện trên biển dưới mỗi tổ.</p>
    <table className="admin-arrange-table"><thead><tr><th>Tổ</th><th>Số GV</th><th>Gộp vào</th></tr></thead><tbody>
     {groups.map(g=><tr key={g.key}>
      <td><input value={names[g.key]??''} disabled={Boolean(into[g.key])} onChange={e=>setNames(n=>({...n,[g.key]:e.target.value}))} aria-label={'Tên tổ '+g.name} maxLength={60}/>
       {g.variants.length>1&&<small>Gộp từ: {g.variants.join(' · ')}</small>}</td>
      <td className="num">{g.count}</td>
      <td><select value={into[g.key]||''} onChange={e=>setInto(m=>({...m,[g.key]:e.target.value}))} aria-label={'Gộp tổ '+g.name+' vào'}>
       <option value="">— giữ riêng —</option>{groups.filter(o=>o.key!==g.key&&!into[o.key]).map(o=><option key={o.key} value={o.key}>{names[o.key]||o.name}</option>)}
      </select></td>
     </tr>)}
    </tbody></table>
    {office>0&&<p className="fine"><b>Tổ văn phòng</b> ({office} người: toàn bộ nhân viên và người ghi tổ “Văn phòng”) luôn xếp <b>cuối dãy</b> — cuối tường phải, gần lối ra.</p>}
    <p className="fine">Bước 2 · Xem trước ({result.teachers}/{result.capacity} chỗ). Trong mỗi tổ: tổ trưởng → tổ phó → theo năm vào trường.
     Giáo viên và nhân viên chung một dãy liền mạch; tổ có số người lẻ dùng chung một cột với tổ kế bên. Không xét nam/nữ.</p>
    <ul className="admin-arrange-plan">{[...bySeg.entries()].map(([seg,list])=><li key={seg}><b>{seg}:</b> {list.map(x=>x.name+' ('+x.count+')').join(' · ')}</li>)}</ul>
    {result.split.length>0&&<p className="fine">Tổ phải chia làm 2 khối vì không vừa trọn một mảng tường: <b>{result.split.join(', ')}</b> (đã chọn thứ tự cắt ít nhất).</p>}
    {result.rename.size>0&&<p className="fine">{result.rename.size} hồ sơ sẽ được ghi lại tên tổ thống nhất — bảng Xuất bản sẽ tính là “sửa thông tin”.</p>}
    {result.unplaced.length>0&&<p className="form-error">Còn {result.unplaced.length} người chưa có chỗ (khu giáo viên đã đầy).</p>}
    {error&&<p role="alert" className="form-error">{error}</p>}
    <div className="admin-actions"><button className="gold" onClick={apply} disabled={busy}>Sắp xếp lên tường</button><button onClick={onClose}>Hủy</button></div>
   </>:<>
    <p>Đã sắp xếp xong. Đóng hộp này để xem trên tường; có thể chỉnh từng người bằng <b>Đổi chỗ…</b>. Nhớ bấm <b>Xuất bản lên website</b> khi đã ưng ý.</p>
    {error&&<p role="alert" className="form-error">{error}</p>}
    <div className="admin-actions"><button className="gold" onClick={onClose}>Xem trên tường</button><button onClick={revert}>Hoàn tác</button></div>
   </>}
  </div>
 </Dialog>;
}
