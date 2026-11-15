// Export the authoritative hall geometry (slots, signs, cabinets, collision constants) for Blender.
// Usage: node scripts/export-hall-layout.mjs <out.json>
import {writeFileSync} from 'node:fs';
import {HALL,BENCHES,MONUMENT,CABINETS,CABINET_NICHE,cabinetWallPieces,layoutHall} from '../src/scene/hallLayout.mjs';
import {exhibitSlots} from '../src/data/exhibitSlots.mjs';
const out=process.argv[2]||'hall-layout.json';
const l=layoutHall([]);
const data={generated:new Date().toISOString(),units:'metres, three.js axes (+Y up, entrance at +Z)',hall:HALL,benches:BENCHES,monument:MONUMENT,cabinets:CABINETS,niche:CABINET_NICHE,wallPieces:cabinetWallPieces(),slots:exhibitSlots(),signs:l.signs,stops:l.stops.map(s=>({id:s.id,eye:s.eye,target:s.target}))};
writeFileSync(out,JSON.stringify(data,null,1));
console.log('wrote',out,data.slots.length,'slots',data.signs.length,'signs');
