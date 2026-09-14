export function trialDisplay(endsAt:string|null,status:string,startedAt:string|null,now=Date.now()){
 if(status!=='trialing')return null;
 const start=startedAt?Date.parse(startedAt):endsAt?Date.parse(endsAt)-3*86400000:NaN;
 if(!Number.isFinite(start))return '3 Tage Testphase';
 const day=Math.max(1,Math.min(3,Math.floor((now-start)/86400000)+1));
 const ended=endsAt&&Date.parse(endsAt)<=now;
 return `3 Tage Testphase · ${day}/3${ended?' · beendet':''}`;
}
