const state = {
  trainings: [],
  meetings: [],
  missing: [],
  query: ""
};

const $ = (selector) => document.querySelector(selector);

const TIME_ZONE = "Asia/Jerusalem";

const liveDateFormatter = new Intl.DateTimeFormat("he-IL-u-ca-gregory", {
  timeZone: TIME_ZONE,
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric"
});

const liveTimeFormatter = new Intl.DateTimeFormat("he-IL-u-ca-gregory", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit"
});

const tableDateFormatter = new Intl.DateTimeFormat("he-IL-u-ca-gregory", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
});

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalize(value) {
  return String(value ?? "")
    .toLowerCase()
    .replaceAll("-", " ")
    .replaceAll("־", " ")
    .trim();
}

function dateFromIso(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [, year, month, day] = match;
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12, 0, 0));
}

function formatDateForDisplay(value, fallback = "") {
  const date = dateFromIso(value);
  if (!date) return fallback || String(value || "");
  return tableDateFormatter.format(date);
}

function formatMeetingDate(meeting) {
  const date = formatDateForDisplay(meeting.date, meeting.displayDate);
  return date || meeting.displayDate || "";
}

function formatDateForSort(value) {
  return String(value || "");
}

function updateLiveClock() {
  const now = new Date();
  const dateNode = $("#currentDateText");
  const timeNode = $("#currentTimeText");

  if (dateNode) {
    dateNode.textContent = liveDateFormatter.format(now);
  }

  if (timeNode) {
    timeNode.textContent = `שעה ${liveTimeFormatter.format(now)}`;
  }
}

function routeLabel(trainingId) {
  const training = state.trainings.find(item => item.id === trainingId);
  if (!training) return trainingId;
  return training.displayName || training.title || `${training.defaultStartTime}-${training.defaultEndTime}`;
}

function trainingTitle(trainingId) {
  const training = state.trainings.find(item => item.id === trainingId);
  return training ? (training.displayName || training.title) : trainingId;
}

function trainingMatches(training) {
  const q = normalize(state.query);
  if (!q) return true;

  const blob = normalize([
    training.id,
    training.displayName,
    training.officialNumber,
    training.officialNumberStatus,
    training.title,
    training.year,
    training.field,
    training.totalMeetings,
    training.totalAcademicHours,
    training.startDate,
    training.endDate,
    formatDateForDisplay(training.startDate),
    formatDateForDisplay(training.endDate),
    training.defaultStartTime,
    training.defaultEndTime,
    ...(training.topics || [])
  ].join(" "));

  return blob.includes(q);
}

function meetingMatches(meeting) {
  const q = normalize(state.query);
  if (!q) return true;

  const blob = normalize([
    meeting.trainingId,
    trainingTitle(meeting.trainingId),
    routeLabel(meeting.trainingId),
    meeting.meetingNumber,
    meeting.displayDate,
    meeting.date,
    formatMeetingDate(meeting),
    meeting.day,
    meeting.startTime,
    meeting.endTime,
    meeting.academicHours,
    meeting.topic
  ].join(" "));

  return blob.includes(q);
}

function missingMatches(item) {
  const q = normalize(state.query);
  if (!q) return true;

  const blob = normalize([
    item.trainingId,
    trainingTitle(item.trainingId),
    routeLabel(item.trainingId),
    item.field,
    item.status,
    item.note
  ].join(" "));

  return blob.includes(q);
}

function renderStats() {
  const visibleTrainings = state.trainings.filter(trainingMatches);
  const visibleMeetings = state.meetings.filter(meetingMatches);
  const totalHours = visibleTrainings.reduce((sum, item) => sum + Number(item.totalAcademicHours || 0), 0);
  const missingNumbers = visibleTrainings.filter(item => !item.officialNumber).length;

  const stats = [
    ["השתלמויות", visibleTrainings.length],
    ["מפגשים", visibleMeetings.length],
    ["שעות אקדמיות", totalHours],
    ["מספרי השתלמות חסרים", missingNumbers]
  ];

  $("#statsGrid").innerHTML = stats.map(([label, value]) => `
    <article class="summary-card">
      <strong>${escapeHtml(value)}</strong>
      <span>${escapeHtml(label)}</span>
    </article>
  `).join("");
}

function renderTrainingsTable() {
  const rows = state.trainings.filter(trainingMatches);

  $("#trainingsTable").innerHTML = rows.length ? rows.map(training => `
    <tr>
      <td><strong>${escapeHtml(training.displayName || training.title)}</strong></td>
      <td>${escapeHtml(training.officialNumber || "חסר")}</td>
      <td>${escapeHtml(training.year)}</td>
      <td>${escapeHtml(training.field)}</td>
      <td>${escapeHtml(training.totalMeetings)}</td>
      <td>${escapeHtml(training.totalAcademicHours)}</td>
      <td>${escapeHtml(formatDateForDisplay(training.startDate))}</td>
      <td>${escapeHtml(formatDateForDisplay(training.endDate))}</td>
      <td>${escapeHtml(training.defaultStartTime)}-${escapeHtml(training.defaultEndTime)}</td>
    </tr>
  `).join("") : `<tr><td colspan="9">לא נמצא מידע מתאים בטבלאות.</td></tr>`;
}

function renderMeetingsTable() {
  const rows = state.meetings
    .filter(meetingMatches)
    .slice()
    .sort((a, b) => {
      const dateCompare = formatDateForSort(a.date).localeCompare(formatDateForSort(b.date));
      if (dateCompare !== 0) return dateCompare;
      const timeCompare = String(a.startTime).localeCompare(String(b.startTime));
      if (timeCompare !== 0) return timeCompare;
      return Number(a.meetingNumber || 0) - Number(b.meetingNumber || 0);
    });

  $("#meetingsTable").innerHTML = rows.length ? rows.map(meeting => `
    <tr>
      <td><strong>${escapeHtml(routeLabel(meeting.trainingId))}</strong></td>
      <td>${escapeHtml(meeting.meetingNumber)}</td>
      <td>${escapeHtml(formatMeetingDate(meeting))}</td>
      <td>${escapeHtml(meeting.day)}</td>
      <td>${escapeHtml(meeting.startTime)}-${escapeHtml(meeting.endTime)}</td>
      <td>${escapeHtml(meeting.academicHours)}</td>
      <td>${escapeHtml(meeting.topic)}</td>
    </tr>
  `).join("") : `<tr><td colspan="7">לא נמצא מפגש מתאים בטבלאות.</td></tr>`;
}

function renderMissingTable() {
  const rows = state.missing.filter(missingMatches);

  $("#missingTable").innerHTML = rows.length ? rows.map(item => `
    <tr>
      <td>${escapeHtml(routeLabel(item.trainingId))}</td>
      <td>${escapeHtml(item.field)}</td>
      <td>${escapeHtml(item.status)}</td>
      <td>${escapeHtml(item.note)}</td>
    </tr>
  `).join("") : `<tr><td colspan="4">אין נתון חסר מתאים לחיפוש.</td></tr>`;
}

function render() {
  renderStats();
  renderTrainingsTable();
  renderMeetingsTable();
  renderMissingTable();
}

async function loadData() {
  const [trainings, meetings, missing] = await Promise.all([
    fetch("data/trainings.json").then(response => response.json()),
    fetch("data/meetings.json").then(response => response.json()),
    fetch("data/missing-data.json").then(response => response.json())
  ]);

  state.trainings = trainings;
  state.meetings = meetings;
  state.missing = missing;
  render();
}

$("#globalSearch").addEventListener("input", event => {
  state.query = event.target.value;
  render();
});

updateLiveClock();
setInterval(updateLiveClock, 1000);

loadData().catch(error => {
  console.error(error);
  document.body.insertAdjacentHTML("beforeend", '<div class="error-box">שגיאה בטעינת הנתונים.</div>');
});
