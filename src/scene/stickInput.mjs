// Radial dead zone: no drift near centre, no faster diagonals.
export function stickVector(dx,dy,radius,deadZone=.14){
 if(!Number.isFinite(dx+dy+radius)||radius<=0)return {x:0,y:0,px:0,py:0};
 const length=Math.hypot(dx,dy),clamped=Math.min(length,radius),ratio=clamped/radius;
 if(length===0||ratio<=deadZone)return {x:0,y:0,px:0,py:0};
 const magnitude=(ratio-deadZone)/(1-deadZone);
 return {x:dx/length*magnitude,y:dy/length*magnitude,px:dx/length*clamped,py:dy/length*clamped};
}
export function writeStick(input,kind,vector){
 if(kind==='move'){input.forward=vector.y===0?0:-vector.y;input.strafe=vector.x;}
 else{input.turn=vector.x===0?0:-vector.x;input.look=vector.y===0?0:-vector.y;}
}
export function resetStick(input,kind){writeStick(input,kind,{x:0,y:0});}
