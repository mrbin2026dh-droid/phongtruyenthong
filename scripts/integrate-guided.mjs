import fs from 'node:fs';
const path='src/App.tsx';
let s=fs.readFileSync(path,'utf8');
s=s.replace("const Museum=lazy(()=>import('./scene/MuseumScene'));","const GuidedTour=lazy(()=>import('./scene/GuidedTour'));");
const start=s.indexOf(" {view==='room'&&<>"),end=s.indexOf(" {view==='periods'&&",start);
if(start<0||end<0)throw Error('Room boundaries not found');
s=s.slice(0,start)+` {view==='room'&&<SceneBoundary onFail={()=>setFailed(true)}><Suspense fallback={<p className="loading">Đang chuẩn bị hành trình tham quan…</p>}><GuidedTour key={periodId} period={period} onPeriod={selectPeriod} onSelect={openPerson} onModule={setModule} onList={()=>navigate('list')} paused={Boolean(personId||module)}/></Suspense></SceneBoundary>}
`+s.slice(end);
s=s.replace("view==='room'?sample.length","view==='room'?members.length").replace("view==='room'?'KHUNG ẢNH MẪU'","view==='room'?'HỒ SƠ THEO THỜI KỲ'");
fs.writeFileSync(path,s,'utf8');
let b=fs.readFileSync('src/scene/BlenderMuseum.tsx','utf8');
b=b.replaceAll('bold 42px Georgia','700 38px "Noto Sans"').replaceAll('bold 36px system-ui','700 36px "Noto Sans"').replaceAll("'28px system-ui'",`'400 28px "Noto Sans"'`);
fs.writeFileSync('src/scene/BlenderMuseum.tsx',b,'utf8');

