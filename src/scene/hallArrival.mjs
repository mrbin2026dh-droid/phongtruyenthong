// A straight, unobstructed entry through the 4 m central doorway.
// Kept separate from the indoor navigation graph and its walking bounds.
export const ARRIVAL_START=[0,1.7,10.4];
export function arrivalRoute(destination){
 return {points:[ARRIVAL_START.slice(),destination.eye.slice()],destination};
}
