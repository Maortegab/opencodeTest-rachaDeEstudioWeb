const STORAGE_KEY = "studyStreak.sessions";
const MAX_MINUTES = 1440;

const el = {
  form: document.getElementById("session-form"),
  topic: document.getElementById("topic"),
  minutes: document.getElementById("minutes"),
  topicError: document.getElementById("topic-error"),
  minutesError: document.getElementById("minutes-error"),
  success: document.getElementById("form-success"),
  todayDate: document.getElementById("today-date"),
  streakNumber: document.getElementById("streak-number"),
  streakStatus: document.getElementById("streak-status"),
  statTotalTime: document.getElementById("stat-total-time"),
  statTotalDays: document.getElementById("stat-total-days"),
  statBestStreak: document.getElementById("stat-best-streak"),
  statWeekTime: document.getElementById("stat-week-time"),
  sessionsBody: document.getElementById("sessions-body"),
  sessionsEmpty: document.getElementById("sessions-empty"),
  clearAll: document.getElementById("clear-all"),
};

function toDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function shiftDays(dateKey, delta) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + delta);
  return toDateKey(date);
}

function weekStartKey(dateKey) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const offset = (new Date(y, m - 1, d).getDay() + 6) % 7;
  return shiftDays(dateKey, -offset);
}

function loadSessions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (s) =>
        s &&
        typeof s.topic === "string" &&
        Number.isFinite(s.minutes) &&
        typeof s.date === "string"
    );
  } catch {
    return [];
  }
}

function saveSessions(sessions) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

function calculateStats(sessions) {
  const days = [...new Set(sessions.map((s) => s.date))].sort();
  const today = toDateKey(new Date());
  const yesterday = shiftDays(today, -1);

  let streak = 0;
  let cursor = days.includes(today) ? today : days.includes(yesterday) ? yesterday : null;
  while (cursor && days.includes(cursor)) {
    streak += 1;
    cursor = shiftDays(cursor, -1);
  }
  const alive = days.includes(today);

  let best = 0;
  let run = 0;
  for (let i = 0; i < days.length; i += 1) {
    run = i > 0 && days[i] === shiftDays(days[i - 1], 1) ? run + 1 : 1;
    if (run > best) best = run;
  }

  const totalMinutes = sessions.reduce((sum, s) => sum + s.minutes, 0);

  const weekStart = weekStartKey(today);
  const weekMinutes = sessions
    .filter((s) => s.date >= weekStart && s.date <= today)
    .reduce((sum, s) => sum + s.minutes, 0);

  return { streak, best, alive, today, weekStart, weekMinutes, totalMinutes, totalDays: days.length };
}

function formatMinutes(minutes) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

function formatDate(dateKey) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function streakMessage(stats) {
  if (stats.totalDays === 0) return "Sin registros todavía. Empieza hoy.";
  if (!stats.alive) return "Racha en riesgo: no hay registro hoy. Estudia para continuarla.";
  if (stats.streak === 1) return "Racha iniciada. Vuelve mañana para mantenerla.";
  return `Racha viva: ${stats.streak} días consecutivos.`;
}

function renderStats(stats) {
  el.streakNumber.textContent = stats.streak;
  el.streakStatus.textContent = streakMessage(stats);
  el.statTotalTime.textContent = formatMinutes(stats.totalMinutes);
  el.statTotalDays.textContent = stats.totalDays;
  el.statBestStreak.textContent = stats.best === 1 ? "1 día" : `${stats.best} días`;
  el.statWeekTime.textContent = formatMinutes(stats.weekMinutes);
}

function renderSessions(sessions, today) {
  el.sessionsEmpty.hidden = sessions.length > 0;
  el.sessionsBody.replaceChildren();

  const sorted = [...sessions].sort((a, b) =>
    a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date)
  );

  for (const session of sorted) {
    const tr = document.createElement("tr");

    const tdDate = document.createElement("td");
    tdDate.className = "table__date";
    tdDate.textContent = formatDate(session.date);
    if (session.date === today) {
      const badge = document.createElement("span");
      badge.className = "table__today";
      badge.textContent = "hoy";
      tdDate.append(badge);
    }

    const tdTopic = document.createElement("td");
    tdTopic.textContent = session.topic;

    const tdMinutes = document.createElement("td");
    tdMinutes.className = "table__num";
    tdMinutes.textContent = session.minutes;

    tr.append(tdDate, tdTopic, tdMinutes);
    el.sessionsBody.append(tr);
  }
}

function render() {
  const sessions = loadSessions();
  const stats = calculateStats(sessions);
  renderStats(stats);
  renderSessions(sessions, stats.today);
  el.todayDate.textContent = formatDate(stats.today);
  el.clearAll.hidden = sessions.length === 0;
}

function showError(input, errorEl, message) {
  input.setAttribute("aria-invalid", "true");
  errorEl.textContent = message;
  errorEl.hidden = false;
}

function clearError(input, errorEl) {
  input.removeAttribute("aria-invalid");
  errorEl.hidden = true;
}

function validate() {
  let valid = true;
  clearError(el.topic, el.topicError);
  clearError(el.minutes, el.minutesError);

  const topic = el.topic.value.trim();
  if (topic === "") {
    showError(el.topic, el.topicError, "Escribe el tema que estudiaste.");
    valid = false;
  } else if (topic.length > 80) {
    showError(el.topic, el.topicError, "El tema no puede superar los 80 caracteres.");
    valid = false;
  }

  const rawMinutes = el.minutes.value.trim();
  const minutes = Number(rawMinutes);
  if (rawMinutes === "" || !Number.isFinite(minutes)) {
    showError(el.minutes, el.minutesError, "Ingresa los minutos estudiados.");
    valid = false;
  } else if (!Number.isInteger(minutes) || minutes < 1) {
    showError(el.minutes, el.minutesError, "Los minutos deben ser un número entero mayor que 0.");
    valid = false;
  } else if (minutes > MAX_MINUTES) {
    showError(el.minutes, el.minutesError, `El máximo es ${MAX_MINUTES} minutos (24 h).`);
    valid = false;
  }

  return { valid, topic, minutes };
}

el.form.addEventListener("submit", (event) => {
  event.preventDefault();
  el.success.hidden = true;

  const { valid, topic, minutes } = validate();
  if (!valid) {
    const firstInvalid = el.form.querySelector('[aria-invalid="true"]');
    if (firstInvalid) firstInvalid.focus();
    return;
  }

  const sessions = loadSessions();
  sessions.push({
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    topic,
    minutes,
    date: toDateKey(new Date()),
    createdAt: new Date().toISOString(),
  });
  saveSessions(sessions);

  el.form.reset();
  el.topic.focus();
  el.success.textContent = `Guardado: ${formatMinutes(minutes)} de ${topic}.`;
  el.success.hidden = false;
  render();
});

el.clearAll.addEventListener("click", () => {
  if (!confirm("¿Borrar todas las sesiones y reiniciar la racha?")) return;
  saveSessions([]);
  el.success.hidden = true;
  render();
});

el.topic.addEventListener("input", () => clearError(el.topic, el.topicError));
el.minutes.addEventListener("input", () => clearError(el.minutes, el.minutesError));

render();
