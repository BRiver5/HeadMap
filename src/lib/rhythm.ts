// Ритм приступов: время суток и день недели.
//
// Время суток считается круговой статистикой (см. statsMath), день недели —
// долями с интервалами Уилсона. Выделять "самый плохой день недели" по голому
// максимуму нельзя: при семи корзинах какая-то всегда окажется максимальной
// даже на случайных данных. Поэтому день попадает в вывод только если нижняя
// граница его интервала лежит выше общей доли болевых дней — то есть этот день
// выделяется не просто "на глаз", а с запасом по неопределённости.

import { weekdayIndex, type DayIso } from "./dates.ts";
import {
  circularHourSummary,
  wilsonInterval,
  type CircularSummary,
  type Interval,
} from "./statsMath.ts";

export const MIN_ATTACKS_FOR_CLOCK = 5;
export const MIN_DAYS_PER_WEEKDAY = 3;

export type OnsetClock = {
  summary: CircularSummary | null;
  bins: number[]; // 24 корзины по часам
  reliable: boolean;
  peakWindow: { fromHour: number; toHour: number } | null;
};

export function onsetClock(hours: number[]): OnsetClock {
  const bins = new Array(24).fill(0) as number[];
  for (const hour of hours) {
    const index = Math.min(23, Math.max(0, Math.floor(hour)));
    bins[index] += 1;
  }
  const summary = circularHourSummary(hours);
  const reliable = hours.length >= MIN_ATTACKS_FOR_CLOCK && (summary?.concentration ?? 0) >= 0.3;
  const peakWindow =
    reliable && summary
      ? {
          fromHour: (Math.floor(summary.meanHour) + 22) % 24,
          toHour: (Math.floor(summary.meanHour) + 2) % 24,
        }
      : null;
  return { summary, bins, reliable, peakWindow };
}

export type WeekdayRate = {
  weekday: number; // 0 = понедельник
  loggedDays: number;
  painDays: number;
  rate: number;
  interval: Interval;
  enoughData: boolean;
};

export type WeekdayAnalysis = {
  rates: WeekdayRate[];
  overallRate: number;
  standout: WeekdayRate | null;
};

export function weekdayAnalysis(loggedDays: DayIso[], painDays: Set<DayIso>): WeekdayAnalysis {
  const logged = new Array(7).fill(0) as number[];
  const pain = new Array(7).fill(0) as number[];

  for (const day of loggedDays) {
    const index = weekdayIndex(day);
    logged[index] += 1;
    if (painDays.has(day)) pain[index] += 1;
  }

  const totalLogged = logged.reduce((sum, value) => sum + value, 0);
  const totalPain = pain.reduce((sum, value) => sum + value, 0);
  const overallRate = totalLogged > 0 ? totalPain / totalLogged : 0;

  const rates: WeekdayRate[] = logged.map((count, weekday) => ({
    weekday,
    loggedDays: count,
    painDays: pain[weekday],
    rate: count > 0 ? pain[weekday] / count : 0,
    interval: wilsonInterval(pain[weekday], count),
    enoughData: count >= MIN_DAYS_PER_WEEKDAY,
  }));

  const candidates = rates.filter((entry) => entry.enoughData && entry.interval.low > overallRate);
  const standout = candidates.sort((a, b) => b.rate - a.rate)[0] ?? null;

  return { rates, overallRate, standout };
}
