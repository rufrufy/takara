export function jakartaDateTime(iso:string=new Date().toISOString()):{date:string;time:string} {
  const value=new Date(iso);
  if(Number.isNaN(value.getTime()))throw new Error('Tanggal transaksi tidak valid.');
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(value);
  const get=(type:string)=>parts.find(p=>p.type===type)!.value;
  return {date:get('year')+'-'+get('month')+'-'+get('day'),time:get('hour')+':'+get('minute')};
}
export function jakartaDateTimeToISO(date:string,time:string):string {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^\d{2}:\d{2}$/.test(time))throw new Error('Isi tanggal dan jam transaksi yang valid.');
  const value=new Date(date+'T'+time+':00+07:00');
  if(Number.isNaN(value.getTime()))throw new Error('Tanggal atau jam tidak valid.');
  const actual=jakartaDateTime(value.toISOString());
  if(actual.date!==date||actual.time!==time)throw new Error('Tanggal atau jam tidak valid.');
  return value.toISOString();
}
