/** Offline-only image preparation. Does not upload or contact a service. */
export async function readPortraitFile(file:File){
 if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Chọn ảnh JPEG, PNG hoặc WebP.');
 if(file.size>10*1024*1024)throw new Error('Ảnh vượt 10 MB. Hãy chọn bản ảnh nhẹ hơn.');
 const url=URL.createObjectURL(file);
 try{
  const img=new Image();img.src=url;await img.decode();
  if(!img.naturalWidth||!img.naturalHeight)throw new Error('Không đọc được kích thước ảnh.');
  const scale=Math.min(1,900/img.naturalHeight,900/img.naturalWidth),canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
  const ctx=canvas.getContext('2d')!;ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
  return {image:canvas.toDataURL('image/jpeg',.88),ratio:img.naturalWidth/img.naturalHeight,width:img.naturalWidth,height:img.naturalHeight};
 }finally{URL.revokeObjectURL(url);}
}

/** Admin upload (15/11): resize to at most 900×1350 px and store as JPEG Blob for IndexedDB.
 * The full photo is kept (no crop); the wall frame crops it to 2:3 when drawing. */
export async function preparePortraitBlob(file:File){
 if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Chọn ảnh JPEG, PNG hoặc WebP.');
 if(file.size>15*1024*1024)throw new Error('Ảnh vượt 15 MB. Hãy chọn bản ảnh nhẹ hơn.');
 const url=URL.createObjectURL(file);
 try{
  const img=new Image();img.src=url;await img.decode();
  const w=img.naturalWidth,h=img.naturalHeight;if(!w||!h)throw new Error('Không đọc được kích thước ảnh.');
  const scale=Math.min(1,900/w,1350/h),canvas=document.createElement('canvas');
  canvas.width=Math.round(w*scale);canvas.height=Math.round(h*scale);
  const ctx=canvas.getContext('2d')!;ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
  const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Không nén được ảnh.')),'image/jpeg',.9));
  return {blob,width:w,height:h,small:Math.min(w,h*2/3)<400};
 }finally{URL.revokeObjectURL(url);}
}
