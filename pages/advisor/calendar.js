import Head from "next/head";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import AdvisorHeader from "../../components/AdvisorHeader";

// ─── Google Calendar helpers ────────────────────────────────────────────────
function toGoogleCalendarUrl(event) {
  const start = (event.startAt || "").replace(/[-:]/g, "").replace("T", "T").slice(0, 15) + "00";
  const end = (event.endAt || event.startAt || "").replace(/[-:]/g, "").replace("T", "T").slice(0, 15) + "00";
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title || "",
    dates: `${start}/${end}`,
    details: event.description || "",
    ctz: "Asia/Jerusalem",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function generateICS(events) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//FINZO PRO//Calendar//HE",
    "CALSCALE:GREGORIAN",
  ];
  for (const ev of events) {
    const start = (ev.startAt || "").replace(/[-:]/g, "").slice(0, 15) + "00";
    const end = (ev.endAt || ev.startAt || "").replace(/[-:]/g, "").slice(0, 15) + "00";
    lines.push("BEGIN:VEVENT");
    lines.push(`DTSTART;TZID=Asia/Jerusalem:${start}`);
    lines.push(`DTEND;TZID=Asia/Jerusalem:${end}`);
    lines.push(`SUMMARY:${(ev.title || "").replace(/\n/g, "\\n")}`);
    if (ev.description) lines.push(`DESCRIPTION:${ev.description.replace(/\n/g, "\\n")}`);
    lines.push(`UID:${ev.id}@finzo.co.il`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

function downloadICS(events) {
  const ics = generateICS(events);
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "finzo-calendar.ics";
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Hebrew locale data ─────────────────────────────────────────────────────
const HE_DAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
const HE_DAYS_SHORT = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];
const HE_MONTHS = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
];

// ─── Event type config ───────────────────────────────────────────────────────
const EVENT_TYPES = {
  meeting: { label: "פגישה", dot: "bg-violet-500", pill: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300" },
  task: { label: "משימה", dot: "bg-amber-500", pill: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
  reminder: { label: "תזכורת", dot: "bg-sky-500", pill: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300" },
  bank_followup: { label: "מעקב בנק", dot: "bg-emerald-500", pill: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
};

// ─── Date helpers ────────────────────────────────────────────────────────────
function toDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function addDays(d, n) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function startOfWeek(d) {
  const r = new Date(d);
  r.setDate(r.getDate() - r.getDay());
  return r;
}

function formatTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
}

// ─── API helpers ─────────────────────────────────────────────────────────────
async function apiFetch(url, opts) {
  const res = await fetch(url, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts && opts.headers) },
  });
  if (res.status === 401) {
    window.location.href = "/advisor/login";
    return null;
  }
  if (!res.ok) throw new Error("API error " + res.status);
  if (res.status === 204) return null;
  return res.json();
}

// ─── Icons ───────────────────────────────────────────────────────────────────
function ChevronRight() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}
function ChevronLeft() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}
function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
function XIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

// ─── Add/Edit Modal ──────────────────────────────────────────────────────────
function EventModal({ event, initialDate, onClose, onSave, onDelete, saving }) {
  const isEdit = Boolean(event);
  const [title, setTitle] = useState(event ? event.title : "");
  const [date, setDate] = useState(event ? event.startAt.slice(0, 10) : initialDate || toDateKey(new Date()));
  const [startTime, setStartTime] = useState(event ? event.startAt.slice(11, 16) : "09:00");
  const [endTime, setEndTime] = useState(event && event.endAt ? event.endAt.slice(11, 16) : "10:00");
  const [eventType, setEventType] = useState(event ? event.eventType : "meeting");
  const [notes, setNotes] = useState(event ? event.description || "" : "");

  function buildPayload() {
    if (!title.trim()) return null;
    return {
      title: title.trim(),
      startAt: `${date}T${startTime}:00`,
      endAt: `${date}T${endTime}:00`,
      eventType,
      description: notes.trim() || undefined,
    };
  }

  function handleSubmit(e) {
    e.preventDefault();
    const payload = buildPayload();
    if (payload) onSave(payload, false);
  }

  function handleSaveAndGoogle(e) {
    e.preventDefault();
    const payload = buildPayload();
    if (payload) onSave(payload, true);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
            {isEdit ? "עריכת אירוע" : "אירוע חדש"}
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
            <XIcon />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">כותרת</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-violet-500"
              required
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">תאריך</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-violet-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">שעת התחלה</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">שעת סיום</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">סוג אירוע</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(EVENT_TYPES).map(([key, cfg]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setEventType(key)}
                  className={`rounded-xl border px-3 py-2 text-sm font-bold transition-all ${
                    eventType === key
                      ? cfg.pill + " border-transparent ring-2 ring-violet-500"
                      : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <span className={`inline-block w-2 h-2 rounded-full ${cfg.dot} ml-1.5`} />
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">הערות</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-violet-500 resize-none"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-xl bg-violet-700 dark:bg-violet-600 text-white font-black py-2.5 text-sm hover:bg-violet-800 dark:hover:bg-violet-700 transition disabled:opacity-50"
            >
              {saving ? "שומר..." : isEdit ? "עדכון" : "הוספה"}
            </button>
            <button
              type="button"
              onClick={handleSaveAndGoogle}
              disabled={saving}
              className="rounded-xl border border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-400 font-bold px-3 py-2.5 text-sm hover:bg-sky-100 dark:hover:bg-sky-900/40 transition disabled:opacity-50 flex items-center gap-1"
              title="שמור והוסף ליומן Google"
            >
              📅 Google
            </button>
            {isEdit && onDelete && (
              <button
                type="button"
                onClick={onDelete}
                disabled={saving}
                className="rounded-xl border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 font-bold px-3 py-2.5 text-sm hover:bg-rose-50 dark:hover:bg-rose-900/30 transition disabled:opacity-50"
              >
                <TrashIcon />
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Month View ──────────────────────────────────────────────────────────────
function MonthView({ year, month, events, today, onDayClick }) {
  const firstDay = new Date(year, month, 1);
  const startDay = firstDay.getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const eventsByDate = useMemo(() => {
    const map = {};
    events.forEach((ev) => {
      const key = ev.startAt.slice(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push(ev);
    });
    return map;
  }, [events]);

  const cells = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <>
      {/* Desktop grid */}
      <div className="hidden md:block">
        <div className="grid grid-cols-7 mb-2">
          {HE_DAYS.map((d) => (
            <div key={d} className="text-center text-xs font-bold text-slate-400 dark:text-slate-500 py-2">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          {cells.map((day, i) => {
            if (day === null) return <div key={"e" + i} className="min-h-[90px] bg-slate-50 dark:bg-slate-950 border-b border-l border-slate-200 dark:border-slate-800" />;
            const dateKey = toDateKey(new Date(year, month, day));
            const dayEvents = eventsByDate[dateKey] || [];
            const isToday = isSameDay(new Date(year, month, day), today);
            return (
              <button
                key={day}
                onClick={() => onDayClick(new Date(year, month, day))}
                className={`min-h-[90px] p-2 text-right border-b border-l border-slate-200 dark:border-slate-800 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors ${
                  isToday ? "bg-violet-50 dark:bg-violet-900/20" : "bg-white dark:bg-slate-900"
                }`}
              >
                <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold ${
                  isToday ? "bg-violet-700 dark:bg-violet-600 text-white" : "text-slate-900 dark:text-slate-100"
                }`}>
                  {day}
                </span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {dayEvents.slice(0, 3).map((ev) => (
                    <span key={ev.id} className={`block w-full truncate text-xs px-1.5 py-0.5 rounded ${EVENT_TYPES[ev.eventType]?.pill || "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"}`}>
                      {ev.title}
                    </span>
                  ))}
                  {dayEvents.length > 3 && (
                    <span className="text-xs text-slate-400 dark:text-slate-500 font-bold">+{dayEvents.length - 3}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile list */}
      <div className="md:hidden space-y-2">
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
          const dateKey = toDateKey(new Date(year, month, day));
          const dayEvents = eventsByDate[dateKey] || [];
          const isToday = isSameDay(new Date(year, month, day), today);
          return (
            <button
              key={day}
              onClick={() => onDayClick(new Date(year, month, day))}
              className={`w-full flex items-start gap-3 p-3 rounded-xl border transition-colors ${
                isToday
                  ? "border-violet-300 dark:border-violet-700 bg-violet-50 dark:bg-violet-900/20"
                  : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              <div className="flex flex-col items-center min-w-[40px]">
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500">{HE_DAYS_SHORT[new Date(year, month, day).getDay()]}</span>
                <span className={`text-lg font-black ${isToday ? "text-violet-700 dark:text-violet-400" : "text-slate-900 dark:text-slate-100"}`}>{day}</span>
              </div>
              <div className="flex-1 flex flex-wrap gap-1">
                {dayEvents.length === 0 && <span className="text-xs text-slate-400 dark:text-slate-500">—</span>}
                {dayEvents.map((ev) => (
                  <span key={ev.id} className="flex items-center gap-1 text-xs font-bold text-slate-700 dark:text-slate-300">
                    <span className={`w-2 h-2 rounded-full ${EVENT_TYPES[ev.eventType]?.dot || "bg-slate-400"}`} />
                    {ev.title}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
}

// ─── Week View ───────────────────────────────────────────────────────────────
function WeekView({ weekStart, events, today, onDayClick }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const eventsByDate = useMemo(() => {
    const map = {};
    events.forEach((ev) => {
      const key = ev.startAt.slice(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push(ev);
    });
    return map;
  }, [events]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
      {days.map((day) => {
        const key = toDateKey(day);
        const dayEvents = eventsByDate[key] || [];
        const isToday = isSameDay(day, today);
        return (
          <button
            key={key}
            onClick={() => onDayClick(day)}
            className={`rounded-xl border p-3 text-right min-h-[120px] transition-colors ${
              isToday
                ? "border-violet-300 dark:border-violet-700 bg-violet-50 dark:bg-violet-900/20"
                : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800"
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-black ${
                isToday ? "bg-violet-700 dark:bg-violet-600 text-white" : "text-slate-900 dark:text-slate-100"
              }`}>
                {day.getDate()}
              </span>
              <span className="text-xs font-bold text-slate-400 dark:text-slate-500">{HE_DAYS[day.getDay()]}</span>
            </div>
            <div className="space-y-1">
              {dayEvents.map((ev) => (
                <div key={ev.id} className={`text-xs font-bold px-2 py-1 rounded-lg truncate ${EVENT_TYPES[ev.eventType]?.pill || "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"}`}>
                  <span className="text-slate-400 dark:text-slate-500 ml-1">{formatTime(ev.startAt)}</span>
                  {ev.title}
                </div>
              ))}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ─── Day View ────────────────────────────────────────────────────────────────
function DayView({ date, events, onAddClick, onEventClick }) {
  const hours = Array.from({ length: 14 }, (_, i) => i + 7); // 07:00–20:00
  const dateKey = toDateKey(date);
  const dayEvents = events.filter((ev) => ev.startAt.slice(0, 10) === dateKey);

  function getEventsForHour(h) {
    return dayEvents.filter((ev) => {
      const startHour = new Date(ev.startAt).getHours();
      return startHour === h;
    });
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
        <h3 className="font-black text-slate-900 dark:text-slate-100">
          {HE_DAYS[date.getDay()]}, {date.getDate()} {HE_MONTHS[date.getMonth()]}
        </h3>
        <button
          onClick={onAddClick}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-700 dark:bg-violet-600 text-white text-xs font-black hover:bg-violet-800 dark:hover:bg-violet-700 transition"
        >
          <PlusIcon /> הוספה
        </button>
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {hours.map((h) => {
          const hourEvents = getEventsForHour(h);
          return (
            <div key={h} className="flex min-h-[52px]">
              <div className="w-16 shrink-0 text-left text-xs font-bold text-slate-400 dark:text-slate-500 p-2 border-l border-slate-200 dark:border-slate-800">
                {String(h).padStart(2, "0")}:00
              </div>
              <div className="flex-1 p-1.5 space-y-1">
                {hourEvents.map((ev) => (
                  <button
                    key={ev.id}
                    onClick={() => onEventClick(ev)}
                    className={`w-full text-right rounded-lg px-3 py-2 text-xs font-bold transition hover:opacity-80 ${EVENT_TYPES[ev.eventType]?.pill || "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"}`}
                  >
                    <span className="text-slate-400 dark:text-slate-500 ml-2">{formatTime(ev.startAt)}–{formatTime(ev.endAt)}</span>
                    {ev.title}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────
export default function CalendarPage() {
  const today = useMemo(() => new Date(), []);
  const [view, setView] = useState("month"); // month | week | day
  const [currentDate, setCurrentDate] = useState(today);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editEvent, setEditEvent] = useState(null);
  const [modalDate, setModalDate] = useState(null);
  const [saving, setSaving] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const weekStart = startOfWeek(currentDate);

  // Compute fetch range based on view
  const fetchRange = useMemo(() => {
    if (view === "month") {
      const from = new Date(year, month, 1);
      const to = new Date(year, month + 1, 0);
      return { from: toDateKey(from), to: toDateKey(to) };
    }
    if (view === "week") {
      return { from: toDateKey(weekStart), to: toDateKey(addDays(weekStart, 6)) };
    }
    return { from: toDateKey(currentDate), to: toDateKey(currentDate) };
  }, [view, year, month, weekStart, currentDate]);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`/api/advisor/calendar?from=${fetchRange.from}&to=${fetchRange.to}`);
      if (data) setEvents(Array.isArray(data) ? data : data.events || []);
    } catch (_) {
      // silent
    } finally {
      setLoading(false);
    }
  }, [fetchRange.from, fetchRange.to]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  // Navigation
  function goNext() {
    if (view === "month") setCurrentDate(new Date(year, month + 1, 1));
    else if (view === "week") setCurrentDate(addDays(weekStart, 7));
    else setCurrentDate(addDays(currentDate, 1));
  }
  function goPrev() {
    if (view === "month") setCurrentDate(new Date(year, month - 1, 1));
    else if (view === "week") setCurrentDate(addDays(weekStart, -7));
    else setCurrentDate(addDays(currentDate, -1));
  }
  function goToday() { setCurrentDate(today); }

  function handleDayClick(d) {
    setCurrentDate(d);
    setView("day");
  }

  function openAddModal(date) {
    setEditEvent(null);
    setModalDate(date ? toDateKey(date) : toDateKey(currentDate));
    setModalOpen(true);
  }

  function openEditModal(ev) {
    setEditEvent(ev);
    setModalDate(null);
    setModalOpen(true);
  }

  async function handleSave(payload, addToGoogle = false) {
    setSaving(true);
    try {
      if (editEvent) {
        await apiFetch(`/api/advisor/calendar`, {
          method: "PATCH",
          body: JSON.stringify({ id: editEvent.id, ...payload }),
        });
      } else {
        await apiFetch(`/api/advisor/calendar`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      if (addToGoogle) {
        const googleUrl = toGoogleCalendarUrl({ ...payload, title: payload.title });
        window.open(googleUrl, "_blank", "noopener,noreferrer");
      }
      setModalOpen(false);
      setEditEvent(null);
      await fetchEvents();
    } catch (_) {
      // silent
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!editEvent) return;
    setSaving(true);
    try {
      await apiFetch(`/api/advisor/calendar`, {
        method: "DELETE",
        body: JSON.stringify({ id: editEvent.id }),
      });
      setModalOpen(false);
      setEditEvent(null);
      await fetchEvents();
    } catch (_) {
      // silent
    } finally {
      setSaving(false);
    }
  }

  // Title for header
  const headerTitle = useMemo(() => {
    if (view === "month") return `${HE_MONTHS[month]} ${year}`;
    if (view === "week") {
      const end = addDays(weekStart, 6);
      if (weekStart.getMonth() === end.getMonth()) {
        return `${weekStart.getDate()}–${end.getDate()} ${HE_MONTHS[weekStart.getMonth()]} ${year}`;
      }
      return `${weekStart.getDate()} ${HE_MONTHS[weekStart.getMonth()]} – ${end.getDate()} ${HE_MONTHS[end.getMonth()]} ${year}`;
    }
    return `${HE_DAYS[currentDate.getDay()]}, ${currentDate.getDate()} ${HE_MONTHS[currentDate.getMonth()]} ${year}`;
  }, [view, month, year, weekStart, currentDate]);

  const viewBtnClass = (v) =>
    `px-4 py-2 text-xs font-black rounded-xl transition ${
      view === v
        ? "bg-violet-700 dark:bg-violet-600 text-white"
        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
    }`;

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Head>
        <title>יומן | FINZO PRO</title>
      </Head>
      <AdvisorHeader active="/advisor/calendar" />

      <main className="max-w-7xl mx-auto px-4 py-6 pb-28 md:pb-8">
        {/* Top bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <button onClick={goPrev} className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition">
              <ChevronRight />
            </button>
            <h1 className="text-xl font-black text-slate-900 dark:text-slate-100">{headerTitle}</h1>
            <button onClick={goNext} className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition">
              <ChevronLeft />
            </button>
            <button onClick={goToday} className="px-3 py-2 rounded-xl text-xs font-bold text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-800 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition">
              היום
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1">
              <button className={viewBtnClass("day")} onClick={() => setView("day")}>יום</button>
              <button className={viewBtnClass("week")} onClick={() => setView("week")}>שבוע</button>
              <button className={viewBtnClass("month")} onClick={() => setView("month")}>חודש</button>
            </div>
            <button
              onClick={() => downloadICS(events)}
              disabled={events.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 text-xs font-black hover:bg-slate-50 dark:hover:bg-slate-800 transition disabled:opacity-40"
              title="ייצוא ל-Google Calendar / Apple Calendar"
            >
              📅 ייצוא .ics
            </button>
            <button
              onClick={() => openAddModal(currentDate)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-700 dark:bg-violet-600 text-white text-xs font-black hover:bg-violet-800 dark:hover:bg-violet-700 transition"
            >
              <PlusIcon /> אירוע חדש
            </button>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-violet-200 dark:border-violet-800 border-t-violet-600 rounded-full animate-spin" />
          </div>
        )}

        {/* Views */}
        {!loading && view === "month" && (
          <MonthView year={year} month={month} events={events} today={today} onDayClick={handleDayClick} />
        )}
        {!loading && view === "week" && (
          <WeekView weekStart={weekStart} events={events} today={today} onDayClick={handleDayClick} />
        )}
        {!loading && view === "day" && (
          <DayView
            date={currentDate}
            events={events}
            onAddClick={() => openAddModal(currentDate)}
            onEventClick={openEditModal}
          />
        )}
      </main>

      {/* Modal */}
      {modalOpen && (
        <EventModal
          event={editEvent}
          initialDate={modalDate}
          onClose={() => { setModalOpen(false); setEditEvent(null); }}
          onSave={handleSave}
          onDelete={editEvent ? handleDelete : undefined}
          saving={saving}
        />
      )}

      {/* Mobile bottom nav */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-4 py-3 flex gap-2">
        <Link href="/advisor" className="flex-1 text-center text-xs font-black text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-xl py-2.5">ראשי</Link>
        <Link href="/advisor/my-leads" className="flex-1 text-center text-xs font-black text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-xl py-2.5">הלידים שלי</Link>
        <Link href="/advisor/leads" className="flex-1 text-center text-xs font-black text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-xl py-2.5">שוק</Link>
      </div>
    </div>
  );
}
