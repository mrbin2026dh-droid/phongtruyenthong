// Entrance door motion (pure; tests/door.test.mjs).
export const DOOR_OPEN_ANGLE=1.5;   // radians, leaves swing outwards along the corridor walls
export const DOOR_SECONDS=1.8;      // full opening time

/** Leaf rotation for side −1 (left) / +1 (right) at openness 0…1, eased in and out. */
export function doorAngle(side,openness){
 const t=Math.max(0,Math.min(1,openness)),eased=t*t*(3-2*t);
 return side*DOOR_OPEN_ANGLE*eased;
}

/** Advance openness linearly towards the target over DOOR_SECONDS. */
export function doorStep(value,target,dt){
 const step=Math.max(0,dt)/DOOR_SECONDS;
 return target>value?Math.min(target,value+step):Math.max(target,value-step);
}

/** How long the camera waits before walking in (doors must be wide enough first). */
export function entryDelayMs({reducedMotion=false,bench=false,effects=true}={}){
 return reducedMotion||bench||!effects?0:Math.round(DOOR_SECONDS*1000*.85);
}
