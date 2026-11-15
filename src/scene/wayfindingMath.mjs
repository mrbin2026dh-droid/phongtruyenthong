// Pure helpers for wayfinding (floor stops, route dots, "Bạn đang ở đây"); unit-tested in tests/wayfinding.test.mjs (helpers: wayfindingMath.mjs).

/** Short floor label for a stop (zone + bay number), Vietnamese. */
export function stopLabel(s){
 if(s.id==='entrance')return 'Toàn cảnh';
 if(s.id==='principal-0')return 'Ban Giám hiệu';
 return String(s.title||'').replace(/^Các thế hệ /,'').replace(/^nhà giáo/,'Nhà giáo');
}

/** Map position (percent of the 24 × 16 m plan) and screen heading (radians, 0 = right) for a pose. */
export function mapPoint(pose){
 const left=Math.max(0,Math.min(100,(pose.x+12)/24*100)),top=Math.max(0,Math.min(100,(pose.z+8)/16*100));
 // Camera looks along (-sin yaw, -cos yaw) in x/z; on the plan +x is right and +z is down.
 const heading=Math.atan2(-Math.cos(pose.yaw),-Math.sin(pose.yaw));
 return {left,top,heading};
}

/** Distances along a route where guide dots sit: start .7 m ahead, stop .35 m before the end. */
export function routeDotDistances(total,spacing=.32,max=160){
 const out=[];for(let d=.7;d<total-.35&&out.length<max;d+=spacing)out.push(Math.round(d*1000)/1000);return out;
}

/** Yaw (radians, about +Y) that turns a flat arrow pointing along −Z towards the walking direction (dx, dz). */
export function arrowYaw(dx,dz){return Math.atan2(-dx,-dz);}
