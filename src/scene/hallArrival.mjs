// A straight, unobstructed entry through the 4 m central doorway.
// Kept separate from the indoor navigation graph and its walking bounds.
// 16/11 (user): the visit starts facing the statue of Chu Văn An in its niche (H2, foyer right wall), straight on,
// 2.6 m away. Tapping “mở cửa” turns to the door and walks in. Must match MONUMENT / STATUE_STOP in hallLayout.mjs
// (kept as literals here: hallLayout imports this file). Was [0,1.7,12.3] facing the door.
export const ARRIVAL_START=[2.3,1.7,11.1];
export const STATUE_LOOK=[4.92,1.55,11.1];

/** Facade plaque right of the door (web units; facade face at z 8.56). */
export const FACADE_Z=8.56;
export const PLAQUE={x:3.375,y:1.75,w:1.6,h:1.05};

/** Where the visitor looks while waiting: straight at the statue, on every screen shape. */
export function gateLook(_aspect){return STATUE_LOOK.slice();}

export function arrivalRoute(destination){
 return {points:[ARRIVAL_START.slice(),destination.eye.slice()],destination};
}
