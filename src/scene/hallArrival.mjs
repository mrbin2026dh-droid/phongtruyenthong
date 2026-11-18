// A straight, unobstructed entry through the 4 m central doorway.
// Kept separate from the indoor navigation graph and its walking bounds.
// 16/11 (user, screenshot “H2”): the visit starts from the left side of the foyer looking across it — the entrance
// door on the left, the statue niche ahead, the schoolyard glazing on the right. Pose solved from that screenshot
// (niche centre, door jamb and glass corner bearings + niche width). The door is opened only by tapping the door.
// 18/11 (phương án A, sảnh sâu thêm 3 m): khung chờ lùi 1,75 m (z 12,6 — cách cửa ~4 m) để thấy trọn cửa, đỡ chật.
export const ARRIVAL_START=[-3.9,1.7,12.6];
/** Door leaves' centre on the facade — the “Chạm để mở cửa” label is attached here. */
export const DOOR_CENTER=[0,1.7,8.45];
/** Front face of the stone facade beside the door (foyer side). */
export const FACADE_Z=8.56;

/** 16/11 (user, H3): school sign centred above the door, between the portal soffit (3.465 m) and the ceiling (3.95 m). */
export const DOOR_SIGN={y:3.705,frame:{w:4.72,h:.44,d:.035},face:{w:4.6,h:.36}};

/** Where the visitor looks while waiting (yaw from +x towards +z): −9.5° on wide screens (door left, niche ahead,
 * glass right); −20° on portrait phones so the door — the only thing that opens it — stays in view.
 * 16/11 H2: pose solved from the user's screenshot landmarks (rms 12 px at 70°). */
export function arrivalFov(aspect){return aspect<1.1?78:70;}
// 18/11: from z 12.6 the door is at −47°, the statue-room portal −10°, the glass corner +27° → −10° keeps the three
// framed on wide screens; portrait phones turn −38° so the door (the only thing that opens it) stays well inside.
export function gateLook(aspect){const yaw=(aspect<1?-38:-10)*Math.PI/180;return [ARRIVAL_START[0]+5*Math.cos(yaw),1.6,ARRIVAL_START[2]+5*Math.sin(yaw)];}

export function arrivalRoute(destination){
 return {points:[ARRIVAL_START.slice(),destination.eye.slice()],destination};
}
