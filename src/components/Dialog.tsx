import {useEffect,useRef} from 'react';
import type {ReactNode} from 'react';
export default function Dialog({title,onClose,children}:{title:string;onClose:()=>void;children:ReactNode}){
  const ref=useRef<HTMLDialogElement>(null);
  useEffect(()=>{const d=ref.current!;d.showModal();return ()=>d.close();},[]);
  return <dialog ref={ref} onCancel={e=>{e.preventDefault();onClose();}} onClick={e=>{if(e.target===e.currentTarget)onClose();}} aria-labelledby="dialog-title"><div className="dialog-content"><button className="close" onClick={onClose} aria-label="Đóng">×</button><p className="eyebrow">PHÒNG TRUYỀN THỐNG</p><h2 id="dialog-title">{title}</h2>{children}</div></dialog>;
}
