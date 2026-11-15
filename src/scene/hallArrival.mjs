// A straight, unobstructed entry through the 4 m central doorway.
// Kept separate from the indoor navigation graph and its walking bounds.
// 15/11: the visitor waits 2.7 m in front of the closed doors (plaque and both leaves in view).
export const ARRIVAL_START=[0,1.7,10.85];
export function arrivalRoute(destination){
 return {points:[ARRIVAL_START.slice(),destination.eye.slice()],destination};
}
