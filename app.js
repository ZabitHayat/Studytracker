
const KEY = "bds68Tracker_v2";
let plan, state;
let timer = null, timerStart = 0, timerElapsed = 0;

const $ = id => document.getElementById(id);

async function init() {
  try {
    const response = await fetch("./plan.json");
    if (!response.ok) throw new Error("Could not load plan.json");
    plan = await response.json();

    state = JSON.parse(localStorage.getItem(KEY) || "null") || {
      day: 1,
      completed: {},
      custom: [],
      studySeconds: 0,
      examDate: "",
      reminderTime: "19:00",
      dark: false,
      lastNotification: ""
    };

    state.day = Math.max(1, Math.min(23, Number(state.day) || 1));
    state.completed ||= {};
    state.custom ||= [];

    populateSubjects();

    if ($("examDate")) $("examDate").value = state.examDate || "";
    if ($("reminderTime"))
      $("reminderTime").value = state.reminderTime || "19:00";

    render();
    renderCountdown();

    setInterval(renderCountdown, 1000);
    setInterval(checkReminder, 30000);

  } catch (error) {
    console.error(error);
    if ($("tasks")) {
      $("tasks").innerHTML =
        '<div class="task"><div class="task-main">' +
        '<b>Unable to load topics.</b>' +
        '<div class="task-meta">Check that plan.json is in the same folder as index.html and app.js.</div>' +
        '</div></div>';
    }
  }
}

function save() {
  localStorage.setItem(KEY, JSON.stringify(state));
}

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;",
    '"': "&quot;", "'": "&#39;"
  })[c]);
}

function masterTasks() {
  return Object.entries(plan.days).flatMap(([day, tasks]) =>
    tasks.map((task, index) => ({
      ...task,
      id: task.id || `day${day}_task${index}`,
      day: Number(day),
      block: "Block III"
    }))
  );
}

function allTasks() {
  return [...masterTasks(), ...state.custom];
}

function isDone(task) {
  return !!state.completed[task.id];
}

function populateSubjects() {
  const subjects = plan.subjects ||
    [...new Set(masterTasks().map(t => t.subject))];

  if ($("subjectSelect")) {
    $("subjectSelect").innerHTML =
      '<option value="">All subjects</option>' +
      subjects.map(s => `<option value="${esc(s)}">${esc(s)}</option>`).join("");

    $("subjectSelect").onchange = render;
  }

  if ($("addSubject")) {
    $("addSubject").innerHTML =
      subjects.map(s => `<option value="${esc(s)}">${esc(s)}</option>`).join("");
  }
}

function render() {
  document.body.classList.toggle("dark", !!state.dark);

  if ($("dayTitle"))
    $("dayTitle").textContent = `Day ${state.day} / 23`;

  if ($("blockBadge")) $("blockBadge").textContent = "Block III";

  if ($("todayText"))
    $("todayText").textContent = `High-yield plan • Day ${state.day}`;

  renderTasks();
  renderStats();
  renderSubjects();
  renderBacklogs();
  renderWeek();
  fillTimerTasks();
}

function renderTasks() {
  const selected = $("subjectSelect")?.value || "";

  const tasks = allTasks().filter(task =>
    task.day === state.day &&
    (!selected || task.subject === selected)
  );

  if (!$("tasks")) return;

  if (!tasks.length) {
    $("tasks").innerHTML =
      '<div class="task"><div class="task-main">' +
      '<b>No topics found for this day.</b>' +
      '<div class="task-meta">Check your plan.json file or add a custom topic.</div>' +
      '</div></div>';
    return;
  }

  $("tasks").innerHTML = tasks.map(task => `
    <div class="task ${isDone(task) ? "done" : ""}">
      <input type="checkbox"
        ${isDone(task) ? "checked" : ""}
        onchange="toggleTask('${esc(task.id)}')">

      <div class="task-main">
        <div class="task-title">${esc(task.topic)}</div>
        <div class="task-meta">
          ${esc(task.subject)} · ${task.minutes || 60} min
          ${task.sourceDay ? ` · Original Day ${task.sourceDay}` : ""}
        </div>
      </div>

      <span class="priority">${esc(task.priority || "High")}</span>
    </div>
  `).join("");
}

function toggleTask(id) {
  state.completed[id] = !state.completed[id];
  save();
  render();
  toast(state.completed[id] ? "Topic completed ✓" : "Topic reopened");
}

function renderStats() {
  const tasks = allTasks();
  const completed = tasks.filter(isDone).length;
  const total = tasks.length;
  const percent = total ? Math.round(completed / total * 100) : 0;
  const today = tasks.filter(t => t.day === state.day);
  const todayPercent = today.length
    ? Math.round(today.filter(isDone).length / today.length * 100)
    : 0;
  const backlog = getBacklogs().length;

  if ($("completedStat")) $("completedStat").textContent = completed;
  if ($("daysStat")) $("daysStat").textContent = "23";
  if ($("overallPct")) $("overallPct").textContent = percent + "%";
  if ($("todayPct")) $("todayPct").textContent = todayPercent + "%";
  if ($("backlogCount")) $("backlogCount").textContent = backlog;
  if ($("navBacklogCount")) $("navBacklogCount").textContent = backlog;
  if ($("backlogHint"))
    $("backlogHint").textContent = backlog
      ? "Needs your attention" : "Nothing overdue";

  if ($("studyTime"))
    $("studyTime").textContent =
      `${Math.floor(state.studySeconds / 3600)}h ` +
      `${Math.floor(state.studySeconds % 3600 / 60)}m`;

  if ($("overallDonut")) {
    $("overallDonut").style.background =
      `conic-gradient(var(--purple) ${percent * 3.6}deg, #e9e8f4 ${percent * 3.6}deg 360deg)`;
  }

  if ($("legendDone")) $("legendDone").textContent = percent + "%";
  if ($("legendDoing")) $("legendDoing").textContent = "0%";
  if ($("legendPending"))
    $("legendPending").textContent = (100 - percent) + "%";

  if ($("p3")) $("p3").textContent = percent + "%";
  if ($("b3")) $("b3").style.width = percent + "%";
}

function renderSubjects() {
  if (!$("subjectProgress")) return;

  const subjects = plan.subjects ||
    [...new Set(allTasks().map(t => t.subject))];

  $("subjectProgress").innerHTML = subjects.map(subject => {
    const tasks = allTasks().filter(t => t.subject === subject);
    const percent = tasks.length
      ? Math.round(tasks.filter(isDone).length / tasks.length * 100)
      : 0;

    return `
      <div class="subject-line">
        <div class="line-top">
          <span>${esc(subject)}</span>
          <b>${percent}%</b>
        </div>
        <div class="bar"><i style="width:${percent}%"></i></div>
      </div>
    `;
  }).join("");
}

function getBacklogs() {
  return allTasks()
    .filter(t => t.day < state.day && !isDone(t))
    .sort((a, b) => a.day - b.day);
}

function renderBacklogs() {
  if (!$("backlogs")) return;

  const tasks = getBacklogs();

  $("backlogs").innerHTML = tasks.length
    ? tasks.slice(0, 10).map(t => `
        <div class="backlog-item">
          <b>Day ${t.day} — ${esc(t.topic)}</b>
          <div class="task-meta">
            ${esc(t.subject)} · ${esc(t.priority || "High")} priority
          </div>
        </div>
      `).join("") +
      (tasks.length > 10
        ? `<div class="task-meta">+ ${tasks.length - 10} more tasks</div>`
        : "")
    : '<div class="backlog-item">All clear 🎉 No overdue tasks.</div>';
}

function renderWeek() {
  if (!$("weekGrid")) return;

  const start = Math.floor((state.day - 1) / 7) * 7 + 1;
  const end = Math.min(23, start + 6);

  $("weekGrid").innerHTML = Array.from(
    { length: end - start + 1 }, (_, i) => {
      const day = start + i;
      const tasks = allTasks().filter(t => t.day === day);
      const percent = tasks.length
        ? Math.round(tasks.filter(isDone).length / tasks.length * 100)
        : 0;

      return `
        <div class="daybox">
          <strong>Day ${day}</strong>
          <span>${percent}%</span>
          <small>${percent === 100 ? "✓ Complete" :
            percent ? "In progress" : "Pending"}</small>
        </div>
      `;
    }
  ).join("");
}

function fillTimerTasks() {
  if (!$("timerTask")) return;

  const tasks = allTasks().filter(t => t.day === state.day);

  $("timerTask").innerHTML = tasks.map(t =>
    `<option value="${esc(t.id)}">${esc(t.topic)}</option>`
  ).join("");
}

function timerDisplay(seconds) {
  const h = String(Math.floor(seconds / 3600)).padStart(2, "0");
  const m = String(Math.floor(seconds % 3600 / 60)).padStart(2, "0");
  const s = String(seconds % 60).padStart(2, "0");

  if ($("timer")) $("timer").textContent = `${h}:${m}:${s}`;
}

function startTimer() {
  if (timer) return;

  timerStart = Date.now() - timerElapsed * 1000;

  timer = setInterval(() => {
    timerDisplay(Math.floor((Date.now() - timerStart) / 1000));
  }, 1000);

  toast("Study timer started");
}

function pauseTimer() {
  if (!timer) return;

  timerElapsed = Math.floor((Date.now() - timerStart) / 1000);
  clearInterval(timer);
  timer = null;
  toast("Timer paused");
}

function finishTimer() {
  pauseTimer();

  if (!timerElapsed) return;

  state.studySeconds += timerElapsed;
  timerElapsed = 0;
  timerStart = 0;

  timerDisplay(0);
  save();
  render();
  toast("Study time saved ✓");
}

function addTask() {
  const topic = $("addTopic")?.value.trim();
  if (!topic) {
    toast("Enter a topic name");
    return;
  }

  state.custom.push({
    id: "custom-" + Date.now(),
    day: state.day,
    block: "Block III",
    subject: $("addSubject")?.value || "Custom",
    topic,
    priority: $("addPriority")?.value || "High",
    minutes: Number($("addMinutes")?.value) || 60
  });

  $("addTopic").value = "";
  save();
  render();
  toast("Topic added ✓");
}

function renderCountdown() {
  if (!$("countdown")) return;

  if (!state.examDate) {
    $("countdown").textContent = "SET EXAM DATE";
    return;
  }

  const diff = new Date(state.examDate).getTime() - Date.now();

  if (diff <= 0) {
    $("countdown").textContent = "EXAM TIME";
    return;
  }

  const seconds = Math.floor(diff / 1000);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor(seconds % 86400 / 3600);
  const minutes = Math.floor(seconds % 3600 / 60);
  const secs = seconds % 60;

  $("countdown").textContent =
    `${days}d ${String(hours).padStart(2, "0")}h ` +
    `${String(minutes).padStart(2, "0")}m ` +
    `${String(secs).padStart(2, "0")}s`;
}

function saveSettings() {
  state.examDate = $("examDate")?.value || "";
  state.reminderTime = $("reminderTime")?.value || "19:00";
  save();
  renderCountdown();
  toast("Settings saved ✓");
}

async function enableNotifications() {
  if (!("Notification" in window)) {
    toast("Notifications are not supported by this browser");
    return;
  }

  const permission = await Notification.requestPermission();
  toast(permission === "granted"
    ? "Notifications enabled ✓"
    : "Please allow notifications in browser settings");
}

function checkReminder() {
  if (!("Notification" in window) ||
      Notification.permission !== "granted") return;

  const now = new Date();
  const time = [
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0")
  ].join(":");

  if (time !== (state.reminderTime || "19:00")) return;

  const today = now.toDateString();
  if (state.lastNotification === today) return;

  const backlog = getBacklogs();
  const pending = allTasks().filter(
    t => t.day === state.day && !isDone(t)
  );

  const message = backlog.length
    ? `You have ${backlog.length} backlog tasks to catch up on.`
    : pending.length
      ? `${pending.length} study tasks remain today.`
      : "Today's study tasks are complete. Great work!";

  new Notification("BDS Study Reminder", { body: message });
  state.lastNotification = today;
  save();
}

function weekendPlan() {
  const tasks = getBacklogs();

  showModal("Weekend Backlog Plan", tasks.length
    ? tasks.map(t => `
        <div class="backlog-item">
          <b>Day ${t.day} — ${esc(t.topic)}</b>
          <div class="task-meta">${esc(t.subject)} · ${esc(t.priority || "High")}</div>
        </div>
      `).join("")
    : "<p>No backlog. Use this time for MCQs and revision.</p>");
}

function laterRevision() {
  showModal("Later Revision Topics",
    (plan.laterRevision || []).map(t =>
      `<div class="backlog-item">${esc(t)}</div>`
    ).join(""));
}

function showModal(title, html) {
  if ($("modalTitle")) $("modalTitle").textContent = title;
  if ($("modalContent")) $("modalContent").innerHTML = html;
  if ($("modal")) $("modal").classList.remove("hidden");
}

function toast(message) {
  if (!$("toast")) return;
  $("toast").textContent = message;
  $("toast").classList.add("show");
  setTimeout(() => $("toast").classList.remove("show"), 2500);
}

function exportProgress() {
  const blob = new Blob([JSON.stringify(state, null, 2)], {
    type: "application/json"
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "bds-block-iii-progress.json";
  a.click();
  URL.revokeObjectURL(url);
}

function importProgress(file) {
  const reader = new FileReader();

  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result);
      if (!imported.completed || !Array.isArray(imported.custom)) {
        throw new Error("Invalid progress file");
      }

      state = { ...state, ...imported };
      save();
      render();
      toast("Progress imported ✓");
    } catch {
      toast("Invalid progress file");
    }
  };

  reader.readAsText(file);
}

$("prevBtn")?.addEventListener("click", () => {
  state.day = Math.max(1, state.day - 1);
  save();
  render();
});

$("nextBtn")?.addEventListener("click", () => {
  state.day = Math.min(23, state.day + 1);
  save();
  render();
});

$("startTimer")?.addEventListener("click", startTimer);
$("pauseTimer")?.addEventListener("click", pauseTimer);
$("finishTimer")?.addEventListener("click", finishTimer);
$("addBtn")?.addEventListener("click", addTask);
$("saveSettings")?.addEventListener("click", saveSettings);
$("notifBtn")?.addEventListener("click", enableNotifications);
$("weekendBtn")?.addEventListener("click", weekendPlan);
$("laterBtn")?.addEventListener("click", laterRevision);

$("themeBtn")?.addEventListener("click", () => {
  state.dark = !state.dark;
  save();
  render();
});

$("exportBtn")?.addEventListener("click", exportProgress);

$("importInput")?.addEventListener("change", e => {
  if (e.target.files[0]) importProgress(e.target.files[0]);
});

$("resetBtn")?.addEventListener("click", () => {
  if (confirm("Reset all study progress?")) {
    localStorage.removeItem(KEY);
    location.reload();
  }
});

$("closeModal")?.addEventListener("click", () =>
  $("modal")?.classList.add("hidden")
);

$("modal")?.addEventListener("click", e => {
  if (e.target.id === "modal") $("modal").classList.add("hidden");
});

init();
