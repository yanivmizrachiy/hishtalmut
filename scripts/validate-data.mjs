import fs from "node:fs";

const trainings = JSON.parse(fs.readFileSync("data/trainings.json", "utf8"));
const meetings = JSON.parse(fs.readFileSync("data/meetings.json", "utf8"));
const missing = JSON.parse(fs.readFileSync("data/missing-data.json", "utf8"));

if (!Array.isArray(trainings) || trainings.length === 0) {
  throw new Error("No trainings found");
}

if (!Array.isArray(meetings) || meetings.length === 0) {
  throw new Error("No meetings found");
}

for (const training of trainings) {
  if (!training.id) throw new Error("Training missing id");
  if (!training.title) throw new Error(`Training ${training.id} missing title`);
  if (!Number.isFinite(Number(training.totalMeetings))) throw new Error(`Training ${training.id} missing totalMeetings`);
  if (!Number.isFinite(Number(training.totalAcademicHours))) throw new Error(`Training ${training.id} missing totalAcademicHours`);
  if (training.id === "missing-official-number" && training.officialNumber !== null) {
    throw new Error("Official number must remain null until real number is provided");
  }
}

for (const meeting of meetings) {
  if (!meeting.trainingId) throw new Error("Meeting missing trainingId");
  if (!meeting.meetingNumber) throw new Error("Meeting missing meetingNumber");
  if (!meeting.date) throw new Error("Meeting missing date");
  if (!meeting.startTime || !meeting.endTime) throw new Error("Meeting missing time");
  if (!meeting.topic) throw new Error("Meeting missing topic");
}

if (!Array.isArray(missing)) {
  throw new Error("Missing-data file must be an array");
}

console.log("VALIDATION_OK");