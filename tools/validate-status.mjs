import fs from 'node:fs';

const filePath = new URL('../data/status.json', import.meta.url);
const raw = fs.readFileSync(filePath, 'utf8');
const rows = JSON.parse(raw);

if (!Array.isArray(rows)) {
  throw new Error('data/status.json must contain an array');
}

const errors = [];

for (const [index, row] of rows.entries()) {
  if (!row || typeof row !== 'object') {
    errors.push(`row ${index + 1}: must be an object`);
    continue;
  }

  if (!row.trainingId) errors.push(`row ${index + 1}: missing trainingId`);
  if (!row.kind) errors.push(`row ${index + 1}: missing kind`);
  if (!row.status) errors.push(`row ${index + 1}: missing status`);

  const hasMeetingNumber = row.meetingNumber === undefined || row.meetingNumber === null || Number.isFinite(Number(row.meetingNumber));
  if (!hasMeetingNumber) errors.push(`row ${index + 1}: meetingNumber must be numeric when present`);
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log(`STATUS_SCHEMA_OK rows=${rows.length}`);
