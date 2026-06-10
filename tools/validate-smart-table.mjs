import fs from 'node:fs';

const path = new URL('../data/smart-table.json', import.meta.url);
const data = JSON.parse(fs.readFileSync(path, 'utf8'));
const errors = [];

if (!Array.isArray(data.trainingRows)) errors.push('trainingRows must be an array');
if (!Array.isArray(data.eventRows)) errors.push('eventRows must be an array');
if (!Array.isArray(data.auditFindings)) errors.push('auditFindings must be an array');

const events = Array.isArray(data.eventRows) ? data.eventRows : [];
const lessons = events.reduce((sum, row) => sum + Number(row.lessons || 0), 0);

if (data.summary?.teachingEvents !== events.length) {
  errors.push(`summary.teachingEvents=${data.summary?.teachingEvents} but eventRows=${events.length}`);
}

if (Number(data.summary?.trackedLessons) !== lessons) {
  errors.push(`summary.trackedLessons=${data.summary?.trackedLessons} but counted=${lessons}`);
}

for (const [index, row] of events.entries()) {
  if (!row.number) errors.push(`event ${index + 1}: missing number`);
  if (!row.name) errors.push(`event ${index + 1}: missing name`);
  if (!row.date) errors.push(`event ${index + 1}: missing date`);
  if (!row.teaching) errors.push(`event ${index + 1}: missing teaching`);
  if (!row.paymentTracking) errors.push(`event ${index + 1}: missing paymentTracking`);
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log(`SMART_TABLE_OK trainings=${data.trainingRows.length} events=${events.length} lessons=${lessons}`);
