// 15/11: sound for the 3D hall (see 05-HUONG-DAN-AI/AM-THANH-DE-XUAT.md).
// Layers: background music (Pixabay, licensed in ASSET_LICENSES.md), a very soft synthesized room tone,
// and a synthesized wooden sliding-door sound. Nothing plays before the visitor's first tap
// (browsers block it anyway); music ducks while the MC speaks; the choice is remembered per browser.

const KEY='museum-sound';
const MUSIC_URL=import.meta.env.BASE_URL+'audio/nhac-nen-piano-strings.m4a?v='+__ASSET_V__;
const MUSIC_LEVEL=.34,DUCKED=.09,ROOM_LEVEL=.010;

type Engine={ctx:AudioContext;music:HTMLAudioElement;musicGain:GainNode;room:GainNode;master:GainNode};
let engine:Engine|null=null,ducked=false;
const listeners=new Set<()=>void>();

export function soundEnabled(){try{return localStorage.getItem(KEY)!=='off';}catch{return true;}}
export function subscribeSound(fn:()=>void){listeners.add(fn);return()=>{listeners.delete(fn);};}

function brownNoise(ctx:AudioContext,seconds:number){
 const b=ctx.createBuffer(1,Math.round(ctx.sampleRate*seconds),ctx.sampleRate),d=b.getChannelData(0);let last=0;
 for(let i=0;i<d.length;i++){last=(last+.02*(Math.random()*2-1))/1.02;d[i]=last*3.2;}
 return b;
}

function build():Engine|null{
 if(engine)return engine;
 const AC=window.AudioContext||(window as any).webkitAudioContext;if(!AC)return null;
 const ctx:AudioContext=new AC();const master=ctx.createGain();master.gain.value=soundEnabled()?1:0;master.connect(ctx.destination);
 const music=new Audio(MUSIC_URL);music.loop=true;music.preload='auto';music.crossOrigin='anonymous';
 const musicGain=ctx.createGain();musicGain.gain.value=0;ctx.createMediaElementSource(music).connect(musicGain).connect(master);
 // Room tone: looping brown noise, low-passed — the faint "air" of a quiet hall.
 const room=ctx.createGain();room.gain.value=0;const src=ctx.createBufferSource();src.buffer=brownNoise(ctx,4);src.loop=true;
 const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=320;src.connect(lp).connect(room).connect(master);src.start();
 engine={ctx,music,musicGain,room,master};
 document.addEventListener('visibilitychange',()=>{if(!engine)return;if(document.hidden)engine.music.pause();else if(engine.musicGain.gain.value>0)void engine.music.play().catch(()=>{});});
 return engine;
}

const ramp=(p:AudioParam,v:number,ctx:AudioContext,s=1.2)=>{const t=ctx.currentTime;p.cancelScheduledValues(t);p.setValueAtTime(p.value,t);p.linearRampToValueAtTime(v,t+s);};

/** Call from a tap/click handler (user gesture): starts music + room tone with a slow fade-in. */
export function startHallSound(){
 const e=build();if(!e)return;void e.ctx.resume().catch(()=>{});
 void e.music.play().catch(()=>{});
 ramp(e.musicGain.gain,ducked?DUCKED:MUSIC_LEVEL,e.ctx,3);ramp(e.room.gain,ROOM_LEVEL,e.ctx,3);
}

/** Any later tap can unlock audio that was started without a gesture (e.g. a repeat visit auto-opens the door). */
export function resumeHallSound(){if(engine&&engine.ctx.state!=='running')startHallSound();}

export function stopHallSound(){
 if(!engine)return;const e=engine;ramp(e.musicGain.gain,0,e.ctx,.6);ramp(e.room.gain,0,e.ctx,.6);
 setTimeout(()=>{e.music.pause();},700);
}

/** Lower the music while the MC narrates. */
export function duckHallMusic(on:boolean){ducked=on;if(engine&&engine.musicGain.gain.value>0)ramp(engine.musicGain.gain,on?DUCKED:MUSIC_LEVEL,engine.ctx,.5);}

export function setSoundEnabled(on:boolean){
 try{localStorage.setItem(KEY,on?'on':'off');}catch{/* private mode */}
 if(on)startHallSound();if(engine)ramp(engine.master.gain,on?1:0,engine.ctx,.4);
 listeners.forEach(fn=>fn());
}

/** Heavy wooden leaves rolling on a track: band-passed noise that glides down, then a soft stop knock. */
export function doorSound(seconds=1.4){
 const e=build();if(!e||e.ctx.state!=='running')return;const {ctx}=e,t=ctx.currentTime;
 const src=ctx.createBufferSource();src.buffer=brownNoise(ctx,seconds+.4);
 const bp=ctx.createBiquadFilter();bp.type='bandpass';bp.Q.value=1.1;bp.frequency.setValueAtTime(420,t);bp.frequency.exponentialRampToValueAtTime(170,t+seconds);
 const g=ctx.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.55,t+.18);g.gain.setValueAtTime(.55,t+seconds*.7);g.gain.linearRampToValueAtTime(0,t+seconds);
 src.connect(bp).connect(g).connect(e.master);src.start(t);src.stop(t+seconds+.4);
 // Soft knock when the leaves reach the stop.
 const o=ctx.createOscillator(),k=ctx.createGain();o.type='sine';o.frequency.setValueAtTime(95,t+seconds);o.frequency.exponentialRampToValueAtTime(55,t+seconds+.25);
 k.gain.setValueAtTime(0,t+seconds-.01);k.gain.linearRampToValueAtTime(.35,t+seconds+.01);k.gain.exponentialRampToValueAtTime(.001,t+seconds+.35);
 o.connect(k).connect(e.master);o.start(t+seconds-.02);o.stop(t+seconds+.4);
}
