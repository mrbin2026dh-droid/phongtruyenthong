// GĐ4 — adaptive quality and on-device benchmark helpers (pure; tests/quality.test.mjs).

/** Render-resolution steps. "auto" moves between them from measured FPS while the visitor moves. */
export const QUALITY_LEVELS=[
 {id:'high',label:'Cao',dpr:1.5},
 {id:'medium',label:'Trung bình',dpr:1.15},
 {id:'low',label:'Tiết kiệm',dpr:.85}
];
export const QUALITY_CHOICES=[{id:'auto',label:'Tự động'},...QUALITY_LEVELS.map(({id,label})=>({id,label}))];

/** Device pixel ratio actually used: never above the screen's own ratio. */
export function dprFor(levelId,deviceDpr=1){
 const level=QUALITY_LEVELS.find(l=>l.id===levelId)||QUALITY_LEVELS[0];
 return Math.max(.75,Math.min(level.dpr,Math.max(1,deviceDpr)));
}

/** Start phones/tablets one step lower; desktops start high.
 * @param {{coarse?:boolean,smallScreen?:boolean,deviceMemory?:number}} [o] */
export function initialLevel({coarse=false,smallScreen=false,deviceMemory=undefined}={}){
 if((deviceMemory!==undefined&&deviceMemory<=2))return 'low';
 return coarse&&smallScreen?'medium':'high';
}

/** Only frame gaps that belong to continuous motion count (the scene renders on demand). */
export function motionDelta(dt){return dt>0&&dt<.25;}

/** Auto mode: step down below 30 FPS, step up only after a sustained 55+ FPS. */
export function nextLevel(current,avgFps,highStreak=0){
 const i=Math.max(0,QUALITY_LEVELS.findIndex(l=>l.id===current));
 if(avgFps<30&&i<QUALITY_LEVELS.length-1)return {level:QUALITY_LEVELS[i+1].id,highStreak:0};
 if(avgFps>=55){const streak=highStreak+1;if(streak>=3&&i>0)return {level:QUALITY_LEVELS[i-1].id,highStreak:0};return {level:current,highStreak:streak};}
 return {level:current,highStreak:0};
}

/** Summary of frame times (seconds) recorded while moving. */
export function benchSummary(deltas){
 const d=deltas.filter(motionDelta);
 if(!d.length)return {frames:0,avgFps:0,low1Fps:0,low5Fps:0,maxFrameMs:0,seconds:0};
 const total=d.reduce((a,b)=>a+b,0),sorted=[...d].sort((a,b)=>b-a);
 const pct=p=>{const n=Math.max(1,Math.ceil(d.length*p));const worst=sorted.slice(0,n);return worst.length/worst.reduce((a,b)=>a+b,0);};
 const r=v=>Math.round(v*10)/10;
 return {frames:d.length,avgFps:r(d.length/total),low1Fps:r(pct(.01)),low5Fps:r(pct(.05)),maxFrameMs:Math.round(sorted[0]*1000),seconds:r(total)};
}

/** Plain-language verdict for the school (Vietnamese). */
export function benchVerdict(s){
 if(!s.frames)return 'Chưa đo được (không có khung hình khi di chuyển).';
 if(s.avgFps>=50&&s.low5Fps>=30)return 'Rất mượt';
 if(s.avgFps>=30&&s.low5Fps>=20)return 'Mượt, dùng được';
 if(s.avgFps>=20)return 'Hơi giật — nên để chất lượng Tiết kiệm';
 return 'Giật — thiết bị yếu, nên dùng Tra cứu 2D';
}

/** Stops for the benchmark walk: overview → leadership → each wall → cabinets → gate. */
export function benchRoute(stops){
 const ids=stops.map(s=>s.id);const pick=re=>ids.filter(id=>re.test(id));
 const route=['principal-0',...pick(/^teacher-/).filter((_,i)=>i%2===0),...pick(/^staff-/).slice(0,1),...pick(/^memory-/).slice(0,1),'entrance'];
 return route.filter((id,i)=>ids.includes(id)&&route.indexOf(id)===i);
}
