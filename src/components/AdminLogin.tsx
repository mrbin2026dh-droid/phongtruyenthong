import {useState} from 'react';
import Dialog from './Dialog';
import {createPasscode,hasPasscode,signIn} from '../data/adminAuth';

/** Sign-in (or first-time passcode creation) for the on-wall admin mode. */
export default function AdminLogin({onClose}:{onClose:()=>void}){
 const first=!hasPasscode();
 const [pass,setPass]=useState(''),[again,setAgain]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function submit(e:React.FormEvent){
  e.preventDefault();setError('');
  if(first&&pass!==again){setError('Hai lần nhập mật khẩu chưa khớp.');return;}
  setBusy(true);
  try{if(first)await createPasscode(pass);else await signIn(pass);onClose();}
  catch(err){setError(err instanceof Error?err.message:'Không đăng nhập được.');}
  finally{setBusy(false);}
 }
 return <Dialog title={first?'Tạo mật khẩu quản trị':'Đăng nhập quản trị'} onClose={onClose}>
  <form className="admin-login" onSubmit={submit}>
   <p>{first?'Lần đầu dùng chế độ quản trị trên máy này: đặt một mật khẩu (ít nhất 6 ký tự). Không dùng lại mật khẩu quan trọng khác.':'Nhập mật khẩu quản trị để chỉnh ảnh và thông tin trực tiếp trên tường.'}</p>
   <label>Mật khẩu<input type="password" autoComplete={first?'new-password':'current-password'} value={pass} onChange={e=>setPass(e.target.value)} autoFocus required minLength={first?6:1}/></label>
   {first&&<label>Nhập lại mật khẩu<input type="password" autoComplete="new-password" value={again} onChange={e=>setAgain(e.target.value)} required/></label>}
   {error&&<p role="alert" className="form-error">{error}</p>}
   <p className="fine">Mật khẩu và dữ liệu chỉ lưu trên trình duyệt của máy này; đây chưa phải tài khoản trực tuyến. Quên mật khẩu thì phải xóa dữ liệu trang web của trình duyệt để đặt lại.</p>
   <div className="admin-actions"><button type="submit" className="gold" disabled={busy}>{first?'Tạo và đăng nhập':'Đăng nhập'}</button><button type="button" onClick={onClose}>Hủy</button></div>
  </form>
 </Dialog>;
}
