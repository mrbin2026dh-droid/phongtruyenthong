// Finite presentation: never wrap automatically after the closing view.
export function nextPresentationStop(stops,current){
 if(current==='gate')return stops[0]||null;
 const index=stops.findIndex(s=>s.id===current);
 return index<0?stops[0]||null:stops[index+1]||null;
}
export function presentationDwell(stop){return Math.max(0,stop?.dwell??8000);}
