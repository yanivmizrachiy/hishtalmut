const state = {
  trainings: [],
  meetings: [],
  missing: [],
  route: "home",
  query: ""
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const repoUrl = "https://github.com/yanivmizrachiy/hishtalmut";
const filesUrl = `${repoUrl}/tree/main/trainings/missing-official-number/attachments`;

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

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 2600);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast("הועתק ללוח");
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
    showToast("הועתק ללוח");
  }
}

function asCsv(rows) {
  return rows.map(row => row.map(cell => {
    const value = String(cell ?? "");
    return `"${value.replaceAll('"', '""')}"`;
  }).join(",")).join("\n");
}

function downloadCsv(filename, rows) {
  const csv = "\uFEFF" + asCsv(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  showToast("קובץ CSV ירד למחשב");
}

function trainingSummary(training) {
  const number = training.officialNumber || "חסר";
  return [
    `שם השתלמות: ${training.title}`,
    `מספר השתלמות: ${number}`,
    `סטטוס: ${training.status}`,
    `שנה: ${training.year}`,
    `תחום: ${training.field}`,
    `מספר מפגשים: ${training.totalMeetings}`,
    `שעות אקדמיות: ${training.totalAcademicHours}`,
    `טווח תאריכים: ${training.startDate} עד ${training.endDate}`,
    `שעות: ${training.defaultStartTime}-${training.defaultEndTime}`,
    `נושאים: ${training.topics.join(", ")}`
  ].join("\n");
}

function matchesQueryTraining(training) {
  const q = normalize(state.query);
  if (!q) return true;
  const blob = normalize([
    training.id,
    training.officialNumber,
    training.officialNumberStatus,
    training.title,
    training.year,
    training.field,
    training.status,
    training.startDate,
    training.endDate,
    training.defaultStartTime,
    training.defaultEndTime,
    ...(training.topics || [])
  ].join(" "));
  return blob.includes(q);
}

function matchesQueryMeeting(meeting) {
  const q = normalize(state.query);
  if (!q) return true;
  const training = state.trainings.find(t => t.id === meeting.trainingId);
  const blob = normalize([
    meeting.trainingId,
    meeting.meetingNumber,
    meeting.date,
    meeting.displayDate,
    meeting.day,
    meeting.startTime,
    meeting.endTime,
    meeting.academicHours,
    meeting.topic,
    training?.title
  ].join(" "));
  return blob.includes(q);
}

function setRoute(route) {
  state.route = route;
  $$(".view").forEach(view => view.classList.remove("active"));
  const active = $(`#view-${route}`);
  if (active) active.classList.add("active");

  $$("[data-route]").forEach(button => {
    button.classList.toggle("active", button.dataset.route === route);
  });

  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderStats() {
  const totalTrainings = state.trainings.length;
  const totalMeetings = state.meetings.length;
  const totalHours = state.trainings.reduce((sum, item) => sum + Number(item.totalAcademicHours || 0), 0);
  const missingCount = state.missing.length;

  $("#statsGrid").innerHTML = [
    ["📚", totalTrainings, "סה״כ השתלמויות"],
    ["📅", totalMeetings, "סה״כ מפגשים"],
    ["⏱️", totalHours, "שעות אקדמיות"],
    ["⚠️", missingCount, "נתונים חסרים"]
  ].map(([icon, value, label]) => `
    <article class="stat-card">
      <strong>${icon} ${value}</strong>
      <span>${label}</span>
    </article>
  `).join("");
}

function renderTrainings() {
  const list = state.trainings.filter(matchesQueryTraining);
  $("#trainingsList").innerHTML = list.length ? list.map(training => `
    <article class="training-card">
      <span class="badge ${training.officialNumber ? "" : "danger"}">
        מספר השתלמות: ${escapeHtml(training.officialNumber || "חסר")}
      </span>
      <h2>${escapeHtml(training.title)}</h2>
      <p>${escapeHtml(training.dataConfidence || "")}</p>

      <div class="meta-grid">
        <div class="meta-item"><b>שנה</b>${escapeHtml(training.year)}</div>
        <div class="meta-item"><b>תחום</b>${escapeHtml(training.field)}</div>
        <div class="meta-item"><b>מפגשים</b>${escapeHtml(training.totalMeetings)}</div>
        <div class="meta-item"><b>שעות אקדמיות</b>${escapeHtml(training.totalAcademicHours)}</div>
        <div class="meta-item"><b>תאריכים</b>${escapeHtml(training.startDate)} עד ${escapeHtml(training.endDate)}</div>
        <div class="meta-item"><b>שעות</b>${escapeHtml(training.defaultStartTime)}-${escapeHtml(training.defaultEndTime)}</div>
      </div>

      <div class="card-actions">
        <button class="premium-btn primary" data-action="open-meetings">📅 פתח מפגשים</button>
        <button class="premium-btn light" data-action="copy-summary" data-id="${escapeHtml(training.id)}">📋 העתק סיכום</button>
        <button class="premium-btn gold" data-action="export-one-training" data-id="${escapeHtml(training.id)}">⬇️ CSV</button>
      </div>
    </article>
  `).join("") : `<div class="empty">לא נמצאו השתלמויות לחיפוש הזה.</div>`;
}

function renderMeetings() {
  const list = state.meetings.filter(matchesQueryMeeting);
  $("#meetingsTable").innerHTML = list.length ? list.map(meeting => `
    <tr>
      <td>${escapeHtml(meeting.meetingNumber)}</td>
      <td>${escapeHtml(meeting.displayDate)}</td>
      <td>${escapeHtml(meeting.day)}</td>
      <td>${escapeHtml(meeting.startTime)}-${escapeHtml(meeting.endTime)}</td>
      <td>${escapeHtml(meeting.academicHours)}</td>
      <td>${escapeHtml(meeting.topic)}</td>
    </tr>
  `).join("") : `
    <tr>
      <td colspan="6">לא נמצאו מפגשים לחיפוש הזה.</td>
    </tr>
  `;
}

function renderFiles() {
  $("#filesList").innerHTML = `
    <article class="file-card">
      <span class="badge danger">אין קבצים מצורפים כרגע</span>
      <h2>קבצים ונספחים</h2>
      <p>לא צורפו קבצים מעבר לתמונה שממנה נשלף המידע. כאשר יתווספו קבצים, הם יישמרו בתיקיית attachments של ההשתלמות.</p>
      <div class="card-actions">
        <a class="premium-btn primary" href="${filesUrl}" target="_blank" rel="noopener">📁 פתח תיקיית קבצים בגיטאב</a>
      </div>
    </article>
  `;
}

function renderMissing() {
  $("#missingList").innerHTML = state.missing.length ? state.missing.map(item => `
    <article class="missing-card">
      <span class="badge danger">${escapeHtml(item.status)}</span>
      <h2>${escapeHtml(item.field)}</h2>
      <p>${escapeHtml(item.note)}</p>
    </article>
  `).join("") : `<div class="empty">אין נתונים חסרים.</div>`;
}

function render() {
  renderStats();
  renderTrainings();
  renderMeetings();
  renderFiles();
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

document.addEventListener("click", event => {
  const routeButton = event.target.closest("[data-route]");
  if (routeButton) {
    setRoute(routeButton.dataset.route);
    return;
  }

  const actionButton = event.target.closest("[data-action]");
  if (!actionButton) return;

  const action = actionButton.dataset.action;
  const id = actionButton.dataset.id;

  if (action === "clear-search") {
    state.query = "";
    $("#globalSearch").value = "";
    render();
  }

  if (action === "open-meetings") {
    setRoute("meetings");
  }

  if (action === "copy-summary") {
    const training = state.trainings.find(item => item.id === id);
    if (training) copyText(trainingSummary(training));
  }

  if (action === "export-one-training") {
    const training = state.trainings.find(item => item.id === id);
    const meetings = state.meetings.filter(item => item.trainingId === id);
    const rows = [
      ["מספר השתלמות", "שם", "שנה", "מפגש", "תאריך", "יום", "שעה", "שעות אקדמיות", "נושא"],
      ...meetings.map(m => [
        training?.officialNumber || "חסר",
        training?.title || "",
        training?.year || "",
        m.meetingNumber,
        m.displayDate,
        m.day,
        `${m.startTime}-${m.endTime}`,
        m.academicHours,
        m.topic
      ])
    ];
    downloadCsv("hishtalmut-training.csv", rows);
  }

  if (action === "export-meetings") {
    const rows = [
      ["מזהה השתלמות", "מפגש", "תאריך", "יום", "שעת התחלה", "שעת סיום", "שעות אקדמיות", "נושא"],
      ...state.meetings.map(m => [m.trainingId, m.meetingNumber, m.displayDate, m.day, m.startTime, m.endTime, m.academicHours, m.topic])
    ];
    downloadCsv("hishtalmut-meetings.csv", rows);
  }

  if (action === "export-trainings") {
    const rows = [
      ["מזהה", "מספר השתלמות", "שם", "שנה", "תחום", "סטטוס", "מפגשים", "שעות אקדמיות", "מתאריך", "עד תאריך"],
      ...state.trainings.map(t => [t.id, t.officialNumber || "חסר", t.title, t.year, t.field, t.status, t.totalMeetings, t.totalAcademicHours, t.startDate, t.endDate])
    ];
    downloadCsv("hishtalmut-trainings.csv", rows);
  }

  if (action === "copy-add-prompt") {
    copyText([
      "הוסף השתלמות אמיתית בלבד לריפו yanivmizrachiy/hishtalmut.",
      "אין להמציא נתונים.",
      "אם מספר השתלמות חסר, כתוב חסר.",
      "עדכן את data/trainings.json, data/meetings.json, data/missing-data.json, data/search-index.json.",
      "צור תיקייה חדשה תחת trainings לפי מספר ההשתלמות או מזהה זמני.",
      "עדכן README, RULES ו-STATE לפי הצורך.",
      "ודא שהאתר בעברית RTL ממשיך לעבוד."
    ].join("\n"));
  }
});

$("#globalSearch").addEventListener("input", event => {
  state.query = event.target.value;
  if (state.route === "home") setRoute("trainings");
  render();
});

loadData().catch(error => {
  console.error(error);
  showToast("שגיאה בטעינת הנתונים");
});