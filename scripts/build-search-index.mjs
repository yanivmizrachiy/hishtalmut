import fs from "node:fs";

const trainings = JSON.parse(fs.readFileSync("data/trainings.json", "utf8"));
const meetings = JSON.parse(fs.readFileSync("data/meetings.json", "utf8"));

const index = [];

for (const training of trainings) {
  index.push({
    type: "training",
    trainingId: training.id,
    title: training.title,
    keywords: [
      training.id,
      training.officialNumber || "מספר חסר",
      training.title,
      training.year,
      training.field,
      training.status,
      training.startDate,
      training.endDate,
      ...(training.topics || [])
    ].join(" ")
  });
}

for (const meeting of meetings) {
  index.push({
    type: "meeting",
    trainingId: meeting.trainingId,
    title: `מפגש ${meeting.meetingNumber} - ${meeting.topic}`,
    keywords: [
      meeting.trainingId,
      meeting.meetingNumber,
      meeting.date,
      meeting.displayDate,
      meeting.day,
      meeting.startTime,
      meeting.endTime,
      meeting.academicHours,
      meeting.topic
    ].join(" ")
  });
}

fs.writeFileSync("data/search-index.json", JSON.stringify(index, null, 2), "utf8");
console.log("SEARCH_INDEX_BUILT");