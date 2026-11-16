// Prefer an installed Vietnamese voice; never substitute a different language.
export function vietnameseVoice(voices){
 const available=Array.from(voices||[]).filter(v=>/^vi(?:-|$)/i.test(String(v.lang||'').replaceAll('_','-')));
 return available.find(v=>v.localService)||available[0]||null;
}
export function hallNarration(stop,{displayed=127,mockCount=31}={}){
 const disclosure=' Nội dung và hồ sơ hiện là dữ liệu minh họa, chờ nhà trường phê duyệt.';
 // 16/11: the statue now stands in a recessed niche in the foyer (H2), first thing visitors meet
 if(stop?.group==='statue')return 'Đây là tượng nhà giáo Chu Văn An, người thầy tiêu biểu của dân tộc, đặt trong hốc tường trang trọng ở sảnh, đón người đến thăm phòng truyền thống. Tượng được dựng phác thảo theo ảnh mẫu.';
 if(stop?.group==='memory')return (stop.title+'. '+stop.description+'. Các hiện vật trong tủ là minh họa, chưa phải thành tích được xác nhận.').replaceAll('..','.');
 const lines={principal:'Đây là khu Ban Giám hiệu trên mảng tường chính diện: Hiệu trưởng ở giữa, hai Phó Hiệu trưởng ở hai bên.',deputy:'Đây là khu Ban Giám hiệu: hai Phó Hiệu trưởng ở hai bên Hiệu trưởng trên mảng tường chính diện.',teacher:'Đây là khu các thế hệ nhà giáo. Mỗi người có một hồ sơ gốc; các lần công tác được ghi trong cùng hồ sơ.',staff:'Đây là khu đội ngũ nhân viên, ghi nhận những đóng góp đồng hành cùng hoạt động của nhà trường.'};
 if(lines[stop?.group])return lines[stop.group]+' Chạm chân dung để đọc đầy đủ hồ sơ.'+disclosure;
 return 'Mời tham quan phòng truyền thống. Hành trình bắt đầu ở toàn cảnh, ghé khu kỷ vật rồi đi một vòng các khu chân dung. '+displayed+' chân dung gồm '+(displayed-mockCount)+' hồ sơ mẫu và '+mockCount+' mẫu bổ sung để xem bố cục. Có thể dùng sơ đồ hoặc cần điều khiển để tự khám phá.'+disclosure;
}
