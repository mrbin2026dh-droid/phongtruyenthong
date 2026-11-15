import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';

test('Hall sound: licensed music file, starts on the door tap, ducks for the MC, toggle remembered',()=>{
 const audio=readFileSync(new URL('../src/scene/hallAudio.ts',import.meta.url),'utf8');
 const tour=readFileSync(new URL('../src/scene/HallTour.tsx',import.meta.url),'utf8');
 const lic=readFileSync(new URL('../ASSET_LICENSES.md',import.meta.url),'utf8');
 const size=statSync(new URL('../public/audio/nhac-nen-piano-strings.m4a',import.meta.url)).size;
 assert.ok(size>500e3&&size<3.5e6,'compressed music stays light: '+size);
 assert.ok(lic.includes('nhac-nen-piano-strings.m4a')&&lic.includes('Pixabay Content License'),'license recorded');
 const open=tour.slice(tour.indexOf(' function openDoor(){'),tour.indexOf(' function openDoor(){')+260);
 assert.ok(open.includes('// 15/11: the tap that opens the door also starts the music')&&open.includes('startHallSound();'),'music starts from the tap gesture');
 assert.ok(tour.includes('startHallSound();'),'start');assert.ok(tour.includes('duckHallMusic(Boolean(p.speaking))'),'ducks under MC');
 assert.ok(tour.includes('()=>stopHallSound()'),'stops when leaving the room');
 assert.ok(tour.includes('className="visitor-sound"'),'visible mute toggle');
 assert.match(audio,/localStorage\.getItem\(KEY\)!=='off'/);
 assert.ok(!/autoplay/i.test(tour+audio),'never autoplays');
});
