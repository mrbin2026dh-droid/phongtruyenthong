// Entrance door motion (pure; tests/door.test.mjs).
// 15/11: sliding pocket doors. Each 2.02 m leaf slides sideways into the wall; the part that has
// passed the jamb line (|x| = DOOR_JAMB) is clipped away, so it looks as if it disappears into the wall.
export const DOOR_LEAF=2.02;        // leaf width; the two leaves meet at x = 0
export const DOOR_JAMB=2.03;        // inner face of the wooden jamb
export const DOOR_SLIDE=2.08;       // travel: inner edge ends 5 cm beyond the jamb (fully hidden)
export const DOOR_SECONDS=1.4;      // full opening time
/** 16/11: turn from the statue to the door before the leaves open (ms). */
export const FACE_DOOR_MS=1100;

const ease=t=>{const v=Math.max(0,Math.min(1,t));return v*v*(3-2*v);};

/** Hinge-side (outer) edge x of the leaf on side −1 (left) / +1 (right) at openness 0…1. */
export function doorOffset(side,openness){return side*(DOOR_LEAF+DOOR_SLIDE*ease(openness));}

/** Inner (meeting) edge x of a leaf; |x| ≥ DOOR_JAMB means the leaf is completely inside the wall. */
export function doorInnerEdge(side,openness){return doorOffset(side,openness)-side*DOOR_LEAF;}

/** Advance openness linearly towards the target over DOOR_SECONDS.
 * dt is capped: with frameloop="demand" the first frame after a long idle wait reports the whole
 * idle time as dt, which used to open the doors in a single frame (15/11 bug: no visible animation). */
export const DOOR_MAX_DT=.1;
export function doorStep(value,target,dt){
 const step=Math.min(Math.max(0,dt),DOOR_MAX_DT)/DOOR_SECONDS;
 return target>value?Math.min(target,value+step):Math.max(target,value-step);
}

/** How long the camera waits before gliding in (doors must be wide enough first). */
export function entryDelayMs({reducedMotion=false,bench=false,effects=true}={}){
 return reducedMotion||bench||!effects?0:Math.round(DOOR_SECONDS*1000*.7);
}
