// Работа с датами. Всё приложение живёт в ЛОКАЛЬНОМ времени: и день
// (YYYY-MM-DD), и отметка времени (YYYY-MM-DDTHH:mm) — без таймзон и без Z.
// toISOString() здесь намеренно не используется: он переводит в UTC, и
// приступ, начатый в 01:30, уезжал бы во вчерашний день на половине планеты.

export type DayIso = string; // YYYY-MM-DD
export type StampIso = string; // YYYY-MM-DDTHH:mm

function pad(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

export function toDay(date: Date): DayIso {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function toStamp(date: Date): StampIso {
  return `${toDay(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function todayIso(): DayIso {
  return toDay(new Date());
}

export function nowStamp(): StampIso {
  return toStamp(new Date());
}

export function parseDay(day: DayIso): Date {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(year, month - 1, date);
}

export function parseStamp(stamp: StampIso): Date {
  const [datePart, timePart = "00:00"] = stamp.split("T");
  const [year, month, date] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);
  return new Date(year, month - 1, date, hour, minute);
}

export function dayOf(stamp: StampIso): DayIso {
  return stamp.slice(0, 10);
}

export function timeOf(stamp: StampIso): string {
  return stamp.slice(11, 16);
}

export function addDays(day: DayIso, amount: number): DayIso {
  const date = parseDay(day);
  date.setDate(date.getDate() + amount);
  return toDay(date);
}

export function addMinutes(stamp: StampIso, amount: number): StampIso {
  const date = parseStamp(stamp);
  date.setMinutes(date.getMinutes() + amount);
  return toStamp(date);
}

export function diffDays(from: DayIso, to: DayIso): number {
  const ms = parseDay(to).getTime() - parseDay(from).getTime();
  return Math.round(ms / 86_400_000);
}

export function minutesBetween(from: StampIso, to: StampIso): number {
  return Math.round((parseStamp(to).getTime() - parseStamp(from).getTime()) / 60_000);
}

// Сколько часов прошло с начала суток — доля 0..24, для 24-часового циферблата
// в календаре. 07:30 → 7.5.
export function hourFraction(stamp: StampIso): number {
  const date = parseStamp(stamp);
  return date.getHours() + date.getMinutes() / 60;
}

// 0 = понедельник, 6 = воскресенье.
export function weekdayIndex(day: DayIso): number {
  return (parseDay(day).getDay() + 6) % 7;
}

export function lastDays(endDay: DayIso, count: number): DayIso[] {
  const days: DayIso[] = [];
  for (let i = count - 1; i >= 0; i--) days.push(addDays(endDay, -i));
  return days;
}

export function startOfMonth(day: DayIso): DayIso {
  return `${day.slice(0, 7)}-01`;
}

export function endOfMonth(day: DayIso): DayIso {
  const date = parseDay(day);
  return toDay(new Date(date.getFullYear(), date.getMonth() + 1, 0));
}

export function shiftMonth(day: DayIso, amount: number): DayIso {
  const date = parseDay(day);
  return toDay(new Date(date.getFullYear(), date.getMonth() + amount, 1));
}

export type MonthCell = { day: DayIso; inMonth: boolean };

// Сетка месяца с понедельника: всегда целые недели, поэтому первые/последние
// дни соседних месяцев тоже попадают в сетку (inMonth = false).
export function monthGrid(anchor: DayIso): MonthCell[] {
  const first = startOfMonth(anchor);
  const gridStart = addDays(first, -weekdayIndex(first));
  const last = endOfMonth(anchor);
  const gridEnd = addDays(last, 6 - weekdayIndex(last));
  const cells: MonthCell[] = [];
  for (let day = gridStart; ; day = addDays(day, 1)) {
    cells.push({ day, inMonth: day.slice(0, 7) === anchor.slice(0, 7) });
    if (day === gridEnd) break;
  }
  return cells;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEKDAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export const WEEKDAY_INITIALS = ["M", "T", "W", "T", "F", "S", "S"];

export function monthLabel(day: DayIso): string {
  const date = parseDay(day);
  return `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

export function weekdayName(day: DayIso): string {
  return WEEKDAY_NAMES[weekdayIndex(day)];
}

// 0 = понедельник. Нужно там, где день недели пришёл из статистики числом, а
// конкретной даты за ним уже нет.
export function weekdayNameByIndex(index: number): string {
  return WEEKDAY_NAMES[((index % 7) + 7) % 7];
}

export function weekdayShort(day: DayIso): string {
  return weekdayName(day).slice(0, 3);
}

export function dayLabel(day: DayIso): string {
  const date = parseDay(day);
  return `${weekdayShort(day)}, ${MONTH_NAMES[date.getMonth()].slice(0, 3)} ${date.getDate()}`;
}

export function shortDayLabel(day: DayIso): string {
  const date = parseDay(day);
  return `${MONTH_NAMES[date.getMonth()].slice(0, 3)} ${date.getDate()}`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${Math.max(0, Math.round(minutes))}m`;
  const hours = Math.floor(minutes / 60);
  const rest = Math.round(minutes % 60);
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

export function formatClockHour(hour: number): string {
  const whole = Math.floor(hour) % 24;
  const minutes = Math.round((hour - Math.floor(hour)) * 60);
  return `${pad(whole)}:${pad(minutes === 60 ? 0 : minutes)}`;
}
