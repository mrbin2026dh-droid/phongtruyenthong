// A straight, unobstructed entry through the 4 m central doorway.
// Kept separate from the indoor navigation graph and its walking bounds.
// 15/11 (foyer): the visitor waits in the 9.3 m foyer, 4.1 m in front of the closed doors,
// so the door, its stone-clad facade and the school plaque (right of the door) are all in view.
export const ARRIVAL_START=[0,1.7,12.3];

/** Facade plaque right of the door (web units; facade face at z 8.56). */
export const FACADE_Z=8.56;
export const PLAQUE={x:3.375,y:1.75,w:1.6,h:1.05};

/** Where the visitor looks while waiting at the door. Wide screens: door centred-left, plaque on the right.
 * Portrait phones (narrow view): turn towards the plaque so the school name is fully visible. */
export function gateLook(aspect){return aspect<1?[2.4,1.75,FACADE_Z]:[.7,1.75,FACADE_Z];}

export function arrivalRoute(destination){
 return {points:[ARRIVAL_START.slice(),destination.eye.slice()],destination};
}
