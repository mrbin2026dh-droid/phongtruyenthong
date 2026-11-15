// Liên kết chỉ giữ mã và vai trò lịch sử, không sao chép hồ sơ gốc.
export function normalize(seed) {
  const people = seed.people.map(({periods, ...p}, i) => ({...p, photoRatio:i % 2 ? 2/3 : 3/4}));
  const memberships = seed.people.flatMap((p,sortOrder) => p.periods.map(periodId => ({id:`${periodId}_${p.id}`,periodId,personId:p.id,roleInPeriod:p.role,sortOrder})));
  return {people,periods:seed.periods,memberships};
}
export function listMembers(data, periodId) {
  const byId = new Map(data.people.map(p=>[p.id,p]));
  return data.memberships.filter(m=>m.periodId===periodId).map(m=>({membership:m,person:byId.get(m.personId)})).filter(m=>m.person);
}
export function workYears(p) {return `${p.startYear} – ${p.endYear ?? (p.status==='Đang công tác'?'nay':'chưa xác định năm kết thúc')}`;}
