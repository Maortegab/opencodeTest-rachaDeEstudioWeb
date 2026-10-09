const STORAGE_KEY = "studyStreak.sessions";
const MAX_MINUTES = 1440;
const RIBBON_WEEKS = 5;
const RIBBON_DAYS = RIBBON_WEEKS * 7;

const el = {
  form: document.getElementById("session-form"),
  topic: document.getElementById("topic"),
  minutes: document.getElementById("minutes"),
  quickMinutes: document.getElementById("quick-minutes"),
  topicError: document.getElementById("topic-error"),
  minutesError: document.getElementById("minutes-error"),
  success: document.getElementById("form-success"),
  todayDate: document.getElementById("today-date"),
  streakPanel: document.getElementById("streak-panel"),
  streakNumber: document.getElementById("streak-number"),
  streakStatus: document.getElementById("streak-status"),
  ribbon: document.getElementById("ribbon"),
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
    const today = toDateKey(new Date());
    return parsed.filter(
      (s) =>
        s &&
        typeof s.topic === "string" &&
        typeof s.createdAt === "string" &&
        Number.isInteger(s.minutes) &&
        s.minutes >= 1 &&
        s.minutes <= MAX_MINUTES &&
        typeof s.date === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(s.date) &&
        s.date <= today
    );
  } catch {
    return [];
  }
}

function saveSessions(sessions) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

function calculateStats(allSessions, today) {
  const sessions = allSessions.filter((s) => s.date <= today);
  const days = [...new Set(sessions.map((s) => s.date))].sort();
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

  const lastDate = days.length > 0 ? days[days.length - 1] : null;
  let daysSinceLast = null;
  if (lastDate) {
    daysSinceLast = 0;
    let forward = lastDate;
    while (forward < today) {
      forward = shiftDays(forward, 1);
      daysSinceLast += 1;
    }
  }

  const weekStart = weekStartKey(today);
  const weekMinutes = sessions
    .filter((s) => s.date >= weekStart && s.date <= today)
    .reduce((sum, s) => sum + s.minutes, 0);

  const minutesByDay = new Map();
  for (const session of sessions) {
    minutesByDay.set(session.date, (minutesByDay.get(session.date) || 0) + session.minutes);
  }

  const windowStart = shiftDays(weekStart, -28);
  const cells = [];
  for (let i = 0; i < RIBBON_DAYS; i += 1) {
    const dateKey = shiftDays(windowStart, i);
    const minutes = minutesByDay.get(dateKey) || 0;
    cells.push({
      dateKey,
      minutes,
      level: heatLevel(minutes),
      future: dateKey > today,
      isToday: dateKey === today,
    });
  }

  return {
    streak,
    best,
    alive,
    today,
    weekStart,
    weekMinutes,
    totalMinutes,
    totalDays: days.length,
    daysSinceLast,
    cells,
  };
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

function cellTitle(dateKey, minutes) {
  return `${formatDate(dateKey)} · ${minutes > 0 ? formatMinutes(minutes) : "sin registro"}`;
}

function streakMessage(stats) {
  if (stats.totalDays === 0) return "Sin registros todavía. Empieza hoy.";
  if (stats.streak === 0) {
    const n = stats.daysSinceLast;
    return `Racha rota: tu último registro fue hace ${n} ${n === 1 ? "día" : "días"}. Empieza una nueva hoy.`;
  }
  if (!stats.alive) return "Racha en riesgo: hoy todavía no hay sesión. Se rompe si no estudias antes de medianoche.";
  if (stats.streak === 1) return "Racha iniciada. Vuelve mañana para mantenerla.";
  return `Racha viva: ${stats.streak} días consecutivos.`;
}

function heatLabel(stats) {
  let loggedDays = 0;
  let windowMinutes = 0;
  for (const cell of stats.cells) {
    if (cell.future) continue;
    if (cell.minutes > 0) {
      loggedDays += 1;
      windowMinutes += cell.minutes;
    }
  }
  const summary =
    loggedDays === 0
      ? `Sin actividad en las últimas ${RIBBON_WEEKS} semanas`
      : `Últimas ${RIBBON_WEEKS} semanas: ${loggedDays} ${
          loggedDays === 1 ? "día con sesión" : "días con sesión"
        }, ${formatMinutes(windowMinutes)}`;
  return `${summary}. ${streakMessage(stats)}`;
}

function streakState(stats) {
  if (stats.totalDays === 0) return "empty";
  return stats.alive ? "alive" : "risk";
}

function heatLevel(minutes) {
  if (minutes < 1) return 0;
  if (minutes < 30) return 1;
  if (minutes < 60) return 2;
  if (minutes < 120) return 3;
  return 4;
}

function renderHeatmap(stats) {
  const cells = [];
  stats.cells.forEach((descriptor, index) => {
    if (descriptor.future) return;
    const cell = document.createElement("li");
    cell.className = "ribbon__day";
    cell.dataset.row = String(index % 7);
    cell.dataset.col = String(Math.floor(index / 7));
    cell.title = cellTitle(descriptor.dateKey, descriptor.minutes);
    if (descriptor.level > 0) cell.dataset.level = String(descriptor.level);
    if (descriptor.isToday) cell.classList.add("is-today");
    cells.push(cell);
  });

  el.ribbon.replaceChildren(...cells);
  el.ribbon.setAttribute("aria-label", heatLabel(stats));
}

function renderStats(stats) {
  el.streakPanel.dataset.state = streakState(stats);
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
  const stats = calculateStats(sessions, toDateKey(new Date()));
  renderStats(stats);
  renderHeatmap(stats);
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
  el.success.textContent = `Guardado ${formatMinutes(minutes)} de ${topic}.`;
  el.success.hidden = false;
  render();
});

el.quickMinutes.addEventListener("click", (event) => {
  const chip = event.target.closest("[data-minutes]");
  if (!chip) return;
  el.minutes.value = chip.dataset.minutes;
  clearError(el.minutes, el.minutesError);
  el.minutes.focus();
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
