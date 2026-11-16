// A straight, unobstructed entry through the 4 m central doorway.
// Kept separate from the indoor navigation graph and its walking bounds.
// 16/11 (user, screenshot “H2”): the visit starts from the left side of the foyer looking across it — the entrance
// door on the left, the statue niche ahead, the schoolyard glazing on the right. Pose solved from that screenshot
// (niche centre, door jamb and glass corner bearings + niche width). The door is opened only by tapping the door.
export const ARRIVAL_START=[-3.9,1.7,10.85];
export const STATUE_LOOK=[4.92,1.55,11.1];
/** Door leaves' centre on the facade — the “Chạm để mở cửa” label is attached here. */
export const DOOR_CENTER=[0,1.7,8.45];

/** Facade plaque right of the door (web units; facade face at z 8.56). */
export const FACADE_Z=8.56;
export const PLAQUE={x:3.375,y:1.75,w:1.6,h:1.05};

/** Where the visitor looks while waiting (yaw from +x towards +z): −5° on wide screens (door left, niche ahead,
 * glass right); −15° on portrait phones so the door — the only thing that opens it — stays in view. */
/** 16/11 H2: pose solved from the user's screenshot landmarks (rms 12 px at 70°). */
export function arrivalFov(aspect){return aspect<1.1?78:70;}
export function gateLook(aspect){const yaw=(aspect<1?-20:-9.5)*Math.PI/180;return [ARRIVAL_START[0]+5*Math.cos(yaw),1.6,ARRIVAL_START[2]+5*Math.sin(yaw)];}

export function arrivalRoute(destination){
 return {points:[ARRIVAL_START.slice(),destination.eye.slice()],destination};
}
