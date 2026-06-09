const $=s=>document.querySelector(s);
let data={trainings:[],teachingEvents:[],auditIssues:[]};
let text='';
const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
const has=(arr)=>!text||String(arr.join(' ')).toLowerCase().includes(text);
function draw(){
 const ts=data.trainings.filter(x=>has([x.officialNumber,x.name,x.year,x.field,x.defaultTime,x.sourceFile,x.notes]));
 const es=data.teachingEvents.filter(x=>has([x.officialNumber,x.trainingName,x.date,x.time,x.lessons,x.teachingStatus,x.eventStatus,x.dataIssue]));
 const as=data.auditIssues.filter(x=>has([x.severity,x.item,x.issue]));
 const lessons=es.reduce((s,x)=>s+Number(x.lessons||0),0);
 $('#summary').innerHTML=[['השתלמויות',ts.length],['מפגשים',es.length],['שיעורים',lessons],['בדיקות',as.length]].map(x=>`<article class="summary-card"><strong>${esc(x[1])}</strong><span>${esc(x[0])}</span></article>`).join('');
 $('#trainingsBody').innerHTML=ts.map(x=>`<tr><td>${esc(x.officialNumber)}</td><td><strong>${esc(x.name)}</strong></td><td>${esc(x.year)}</td><td>${esc(x.field)}</td><td>${esc(x.defaultTime)}</td><td>${esc(x.sourceFile)}</td><td>${esc(x.notes)}</td></tr>`).join('')||'<tr><td colspan="7">אין תוצאות</td></tr>';
 es.sort((a,b)=>String(a.isoDate||a.date).localeCompare(String(b.isoDate||b.date)));
 $('#eventsBody').innerHTML=es.map(x=>`<tr><td>${esc(x.officialNumber)}</td><td><strong>${esc(x.trainingName)}</strong></td><td>${esc(x.date)}</td><td>${esc(x.time)}</td><td>${esc(x.lessons)}</td><td>${esc(x.teachingStatus)}</td><td>${esc(x.eventStatus)}</td><td>${esc(x.dataIssue||'')}</td></tr>`).join('')||'<tr><td colspan="8">אין תוצאות</td></tr>';
 $('#auditBody').innerHTML=as.map(x=>`<tr><td>${esc(x.severity)}</td><td><strong>${esc(x.item)}</strong></td><td>${esc(x.issue)}</td></tr>`).join('')||'<tr><td colspan="3">אין תוצאות</td></tr>';
}
fetch('data/internal-ledger.json').then(r=>r.json()).then(j=>{data=j;$('#ledgerSearch').addEventListener('input',e=>{text=e.target.value.toLowerCase();draw()});draw()});
