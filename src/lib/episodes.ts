// Приступы как объекты предметной области: длительность, покрытые дни, серии
// дней без боли, разбивка по силе и зонам. Всё, что экраны показывают про
// "сколько/как долго/где", считается здесь, а не в JSX.

import {
  addDays,
  dayOf,
  diffDays,
  hourFraction,
  minutesBetween,
  nowStamp,
  type DayIso,
  type StampIso,
} from "./dates.ts";
import { median } from "./statsMath.ts";
import type { RegionKey } from "./presets.ts";

export type Dose = {
  id: string;
  medKey: string;
  takenAt: StampIso;
};

export type Attack = {
  id: string;
  day: DayIso;
  startedAt: StampIso;
  endedAt: StampIso | null;
  severity: number;
  note: string | null;
  regions: RegionKey[];
  doses: Dose[];
};

export type DayRecord = {
  day: DayIso;
  factors: string[];
};

export function isOngoing(attack: Attack): boolean {
  return attack.endedAt === null;
}

// Длительность считается только у закрытых приступов. У идущего приступа
// длительности ещё нет — это не "0 минут" и не "до сих пор", и подставлять
// туда текущее время в статистику нельзя: получилась бы растущая цифра,
// зависящая от момента открытия экрана.
export function durationMinutes(attack: Attack): number | null {
  if (!attack.endedAt) return null;
  return Math.max(0, minutesBetween(attack.startedAt, attack.endedAt));
}

export function ongoingMinutes(attack: Attack, now: StampIso = nowStamp()): number {
  return Math.max(0, minutesBetween(attack.startedAt, now));
}

// Приступ, начавшийся в 23:40 и закончившийся в 04:00, занимает два дня — и
// оба они должны считаться днями с болью, иначе календарь врёт.
export function coveredDays(attack: Attack): DayIso[] {
  const start = attack.day;
  const end = attack.endedAt ? dayOf(attack.endedAt) : start;
  const span = Math.max(0, diffDays(start, end));
  const days: DayIso[] = [];
  for (let i = 0; i <= span; i++) days.push(addDays(start, i));
  return days;
}

export function headacheDays(attacks: Attack[]): Set<DayIso> {
  const days = new Set<DayIso>();
  for (const attack of attacks) for (const day of coveredDays(attack)) days.add(day);
  return days;
}

export function attacksOnDay(attacks: Attack[], day: DayIso): Attack[] {
  return attacks
    .filter((attack) => coveredDays(attack).includes(day))
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt));
}

// Текущая серия дней без боли: считаем назад от сегодня, пока день чист.
// Сегодняшний день с болью обрывает серию на нуле.
export function currentFreeStreak(attacks: Attack[], today: DayIso): number {
  const days = headacheDays(attacks);
  let streak = 0;
  let cursor = today;
  while (!days.has(cursor) && streak < 3650) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

// Самая длинная серия чистых дней внутри отмеченного периода. Дни, которые
// пользователь вообще не открывал, серию не продлевают — иначе "рекорд" рос бы
// сам собой за время, пока приложением не пользовались.
export function longestFreeStreak(attacks: Attack[], loggedDays: DayIso[]): number {
  if (loggedDays.length === 0) return 0;
  const painDays = headacheDays(attacks);
  const sorted = [...loggedDays].sort();
  let best = 0;
  let run = 0;
  let previous: DayIso | null = null;
  for (const day of sorted) {
    const consecutive = previous !== null && diffDays(previous, day) === 1;
    if (painDays.has(day)) {
      run = 0;
    } else {
      run = consecutive ? run + 1 : 1;
      best = Math.max(best, run);
    }
    previous = day;
  }
  return best;
}

export type MonthSummary = {
  attacks: number;
  painDays: number;
  loggedDays: number;
  medianDurationMinutes: number | null;
  averageSeverity: number | null;
};

export function monthSummary(
  attacks: Attack[],
  loggedDays: DayIso[],
  monthPrefix: string
): MonthSummary {
  const inMonth = attacks.filter((attack) => attack.day.startsWith(monthPrefix));
  const painDays = new Set<DayIso>();
  for (const attack of inMonth) {
    for (const day of coveredDays(attack)) {
      if (day.startsWith(monthPrefix)) painDays.add(day);
    }
  }
  const durations = inMonth
    .map(durationMinutes)
    .filter((value): value is number => value !== null);
  const severities = inMonth.map((attack) => attack.severity);
  return {
    attacks: inMonth.length,
    painDays: painDays.size,
    loggedDays: loggedDays.filter((day) => day.startsWith(monthPrefix)).length,
    medianDurationMinutes: median(durations),
    averageSeverity: severities.length
      ? severities.reduce((sum, value) => sum + value, 0) / severities.length
      : null,
  };
}

export type WeekBucket = { label: string; value: number; startDay: DayIso };

// Дни с болью по неделям (не число приступов): два приступа в один день — это
// один плохой день, и сравнивать недели честнее именно по дням.
export function weeklyPainDays(attacks: Attack[], endDay: DayIso, weeks: number): WeekBucket[] {
  const painDays = headacheDays(attacks);
  const buckets: WeekBucket[] = [];
  for (let index = weeks - 1; index >= 0; index--) {
    const start = addDays(endDay, -7 * index - 6);
    let value = 0;
    for (let offset = 0; offset < 7; offset++) {
      if (painDays.has(addDays(start, offset))) value += 1;
    }
    buckets.push({ label: index === 0 ? "now" : `-${index}w`, value, startDay: start });
  }
  return buckets;
}

export type SeverityBand = { label: string; bandIndex: number; count: number };

export const SEVERITY_BANDS = ["1–2", "3–4", "5–6", "7–8", "9–10"];

export function severityBands(attacks: Attack[]): SeverityBand[] {
  const counts = [0, 0, 0, 0, 0];
  for (const attack of attacks) {
    const index = Math.min(4, Math.max(0, Math.ceil(attack.severity / 2) - 1));
    counts[index] += 1;
  }
  return counts.map((count, bandIndex) => ({
    label: SEVERITY_BANDS[bandIndex],
    bandIndex,
    count,
  }));
}

export type RegionShare = { region: RegionKey; count: number; intensity: number };

// Доля считается от САМОЙ ЧАСТОЙ зоны, а не от числа приступов: у одного
// приступа зон может быть несколько, и сумма долей не обязана давать 100%.
export function regionShares(attacks: Attack[]): RegionShare[] {
  const counts = new Map<RegionKey, number>();
  for (const attack of attacks) {
    for (const region of attack.regions) {
      counts.set(region, (counts.get(region) ?? 0) + 1);
    }
  }
  const max = Math.max(1, ...counts.values());
  return [...counts.entries()]
    .map(([region, count]) => ({ region, count, intensity: count / max }))
    .sort((a, b) => b.count - a.count);
}

export type DurationSummary = {
  completed: number;
  ongoing: number;
  medianMinutes: number | null;
  longestMinutes: number | null;
};

export function durationSummary(attacks: Attack[]): DurationSummary {
  const durations = attacks
    .map(durationMinutes)
    .filter((value): value is number => value !== null);
  return {
    completed: durations.length,
    ongoing: attacks.filter(isOngoing).length,
    medianMinutes: median(durations),
    longestMinutes: durations.length ? Math.max(...durations) : null,
  };
}

export function onsetHours(attacks: Attack[]): number[] {
  return attacks.map((attack) => hourFraction(attack.startedAt));
}
