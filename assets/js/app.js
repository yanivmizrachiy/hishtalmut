const state = {
  trainings: [],
  meetings: [],
  missing: [],
  query: ""
};

const $ = (selector) => document.querySelector(selector);

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

function meetingRouteLabel(trainingId) {
  const t = state.trainings.find(item => item.id === trainingId);
  if (!t) return trainingId;
  return `${t.defaultStartTime}-${t.defaultEndTime}`;
}

function trainingMatches(t) {
  const q = normalize(state.query);
  if (!q) return true;
  const blob = normalize([
    t.id,
    t.officialNumber,
    t.officialNumberStatus,
    t.title,
    t.year,
    t.field,
    t.totalMeetings,
    t.totalAcademicHours,
    t.startDate,
    t.endDate,
    t.defaultStartTime,
    t.defaultEndTime,
    ...(t.topics || [])
  ].join(" "));
  return blob.includes(q);
}

function meetingMatches(m) {
  const q = normalize(state.query);
  if (!q) return true;
  const t = state.trainings.find(item => item.id === m.trainingId);
  const blob = normalize([
    m.trainingId,
    t?.title,
    m.meetingNumber,
    m.displayDate,
    m.date,
    m.day,
    m.startTime,
    m.endTime,
    m.academicHours,
    m.topic
  ].join(" "));
  return blob.includes(q);
}

function renderStats() {
  const visibleTrainings = state.trainings.filter(trainingMatches);
  const visibleMeetings = state.meetings.filter(meetingMatches);

  const totalTrainings = visibleTrainings.length;
  const totalMeetings = visibleMeetings.length;
  const totalHours = visibleTrainings.reduce((sum, t) => sum + Number(t.totalAcademicHours || 0), 0);
  const missingOfficialNumbers = visibleTrainings.filter(t => !t.officialNumber).length;

  $("#statsGrid").innerHTML = [
    ["השתלמויות", totalTrainings],
    ["מפגשים", totalMeetings],
    ["שעות אקדמיות", totalHours],
    ["מספרי השתלמות חסרים", missingOfficialNumbers]
  ].map(([label, value]) => `
    <article class="stat-card">
      <strong>${escapeHtml(value)}</strong>
      <span>${escapeHtml(label)}</span>
    </article>
  `).join("");
}

function renderTrainings() {
  const list = state.trainings.filter(trainingMatches);

  $("#trainingsList").innerHTML = list.length ? list.map(t => `
    <article class="training-card">
      <h3>${escapeHtml(t.title)}</h3>
      <div class="meta-grid">
        <div class="meta-item"><b>מספר השתלמות</b>${escapeHtml(t.officialNumber || "חסר")}</div>
        <div class="meta-item"><b>שנה</b>${escapeHtml(t.year)}</div>
        <div class="meta-item"><b>תחום</b>${escapeHtml(t.field)}</div>
        <div class="meta-item"><b>מפגשים</b>${escapeHtml(t.totalMeetings)}</div>
        <div class="meta-item"><b>שעות אקדמיות</b>${escapeHtml(t.totalAcademicHours)}</div>
        <div class="meta-item"><b>תאריכים</b>${escapeHtml(t.startDate)} עד ${escapeHtml(t.endDate)}</div>
        <div class="meta-item"><b>שעות</b>${escapeHtml(t.defaultStartTime)}-${escapeHtml(t.defaultEndTime)}</div>
      </div>
    </article>
  `).join("") : `<div class="empty">לא נמצא מידע מתאים בטבלאות.</div>`;
}

function renderMeetings() {
  const list = state.meetings.filter(meetingMatches);

  $("#meetingsTable").innerHTML = list.length ? list.map(m => `
    <tr>
      <td>${escapeHtml(meetingRouteLabel(m.trainingId))}</td>
      <td>${escapeHtml(m.meetingNumber)}</td>
      <td>${escapeHtml(m.displayDate)}</td>
      <td>${escapeHtml(m.day)}</td>
      <td>${escapeHtml(m.startTime)}-${escapeHtml(m.endTime)}</td>
      <td>${escapeHtml(m.academicHours)}</td>
      <td>${escapeHtml(m.topic)}</td>
    </tr>
  `).join("") : `<tr><td colspan="7">לא נמצא מפגש מתאים בטבלאות.</td></tr>`;
}

function renderMissing() {
  const q = normalize(state.query);
  const list = state.missing.filter(item => {
    if (!q) return true;
    const t = state.trainings.find(training => training.id === item.trainingId);
    return normalize([item.field, item.status, item.note, t?.title].join(" ")).includes(q);
  });

  $("#missingList").innerHTML = list.length ? list.map(item => `
    <article class="missing-card">
      <h3>${escapeHtml(item.field)}</h3>
      <p>${escapeHtml(item.note)}</p>
    </article>
  `).join("") : `<div class="empty">אין נתון חסר מתאים לחיפוש.</div>`;
}

function render() {
  renderStats();
  renderTrainings();
  renderMeetings();
  renderMissing();
}

async function loadData() {
  const [trainings, meetings, missing] = await Promise.all([
    fetch("data/trainings.json").then(r => r.json()),
    fetch("data/meetings.json").then(r => r.json()),
    fetch("data/missing-data.json").then(r => r.json())
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

loadData().catch(error => {
  console.error(error);
  document.body.insertAdjacentHTML("beforeend", '<div class="empty">שגיאה בטעינת הנתונים.</div>');
});