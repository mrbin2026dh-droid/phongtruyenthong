// 19/11 (người dùng): bấm bục góp ý → hộp thoại của web (không phải hộp thông báo của trình duyệt) hỏi
// “Bạn có muốn góp ý cho nhà trường không?” với Có / Không; chọn Có mới hiện mã QR Zalo. Không hiện số điện thoại.
// Hiển thị đủ trên mọi thiết bị: rộng tối đa 420 px, co theo màn hình (để lề 16 px), tiêu đề tự xuống dòng cân đối.
import {useEffect,useRef,useState} from 'react';

/** The lectern's medallion icon (speech bubble, three dots), gold on deep teal. */
function BubbleIcon(){
 return <svg viewBox="0 0 64 64" width="64" height="64" aria-hidden="true">
  <circle cx="32" cy="32" r="31" fill="#17383e"/><circle cx="32" cy="32" r="29" fill="none" stroke="#c9a560" strokeWidth="2"/><circle cx="32" cy="32" r="25.5" fill="none" stroke="#c9a560" strokeWidth=".8"/>
  <path d="M22 19h20a5 5 0 0 1 5 5v13a5 5 0 0 1-5 5H29.5l-7.5 6.5.8-6.5H22a5 5 0 0 1-5-5V24a5 5 0 0 1 5-5z" fill="none" stroke="#e6c98a" strokeWidth="2.6" strokeLinejoin="round"/>
  <circle cx="24.5" cy="30.5" r="2.2" fill="#e6c98a"/><circle cx="32" cy="30.5" r="2.2" fill="#e6c98a"/><circle cx="39.5" cy="30.5" r="2.2" fill="#e6c98a"/>
 </svg>;
}

export default function FeedbackDialog({url,qr,onClose}:{url:string;qr:string;onClose:()=>void}){
 const ref=useRef<HTMLDialogElement>(null),yes=useRef<HTMLButtonElement>(null);
 const [step,setStep]=useState<'ask'|'qr'>('ask');
 const touch=(()=>{try{return matchMedia('(pointer:coarse)').matches;}catch{return false;}})();
 useEffect(()=>{const d=ref.current!;d.showModal();yes.current?.focus();return()=>d.close();},[]);
 return <dialog ref={ref} className="feedback-dialog" aria-labelledby="feedback-title"
  onCancel={e=>{e.preventDefault();onClose();}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
  <div className="feedback-card">
   <button type="button" className="feedback-close" aria-label="Đóng" onClick={onClose}>×</button>
   <div className="feedback-icon"><BubbleIcon/></div>
   {step==='ask'?<>
    <h1 id="feedback-title">Bạn có muốn góp ý cho nhà trường không?</h1>
    <div className="feedback-actions">
     <button type="button" className="feedback-no" onClick={onClose}>Không</button>
     <button type="button" ref={yes} className="feedback-yes" onClick={()=>setStep('qr')}>Có</button>
    </div>
   </>:<>
    <h1 id="feedback-title">Góp ý qua Zalo</h1>
    <img className="feedback-qr-img" src={qr} width={220} height={220} alt="Mã QR Zalo của nhà trường"/>
    <p className="feedback-hint">Mở Zalo trên điện thoại, quét mã để nhắn cho nhà trường.</p>
    <a className="feedback-yes" href={url} target="_blank" rel="noopener noreferrer">{touch?'Mở Zalo':'Mở Zalo web'}</a>
   </>}
  </div>
 </dialog>;
}
