// Сравнение препаратов по СОБСТВЕННОМУ журналу и счётчик дней приёма.
//
// Главная методическая проблема этой темы — цензурирование. Если приступ ещё
// идёт (или пользователь просто не отметил окончание), время до облегчения по
// нему неизвестно, и молча считать его "длинным" нельзя, как нельзя и
// выбросить его без следа: таблетка, после которой боль тянулась дальше, —
// это как раз самый информативный случай. Поэтому такие приступы считаются
// отдельно и показываются рядом с медианой числом, а не растворяются в ней.
//
// Вторая проблема — атрибуция. Если за приступ приняты два разных препарата,
// отнести облегчение к одному из них нельзя, и такие приступы в сравнение не
// идут вообще (но тоже пересчитываются, чтобы цифра не выглядела взявшейся из
// воздуха).

import { minutesBetween, type DayIso, type StampIso } from "./dates.ts";
import { median } from "./statsMath.ts";
import { durationMinutes, type Attack } from "./episodes.ts";

export const MIN_DOSES_FOR_COMPARISON = 3;
export const EARLY_DOSE_CUTOFF_MINUTES = 30;

export type MedComparison = {
  medKey: string;
  usedInAttacks: number;
  comparable: number; // закрытые приступы, где этот препарат был единственным
  censored: number; // принят, но приступ не закрыт — время неизвестно
  mixed: number; // в приступе были и другие препараты
  medianReliefMinutes: number | null;
  medianAttackMinutes: number | null;
  reliable: boolean;
};

function firstDoseOf(attack: Attack, medKey: string): StampIso | null {
  const times = attack.doses
    .filter((dose) => dose.medKey === medKey)
    .map((dose) => dose.takenAt)
    .sort();
  return times[0] ?? null;
}

function medKeysOf(attack: Attack): Set<string> {
  return new Set(attack.doses.map((dose) => dose.medKey));
}

export function compareMeds(attacks: Attack[]): MedComparison[] {
  const keys = new Set<string>();
  for (const attack of attacks) for (const dose of attack.doses) keys.add(dose.medKey);

  const comparisons: MedComparison[] = [];
  for (const medKey of keys) {
    const withMed = attacks.filter((attack) => medKeysOf(attack).has(medKey));
    const relief: number[] = [];
    const total: number[] = [];
    let censored = 0;
    let mixed = 0;

    for (const attack of withMed) {
      if (medKeysOf(attack).size > 1) {
        mixed += 1;
        continue;
      }
      const dose = firstDoseOf(attack, medKey);
      const attackMinutes = durationMinutes(attack);
      if (!dose || attackMinutes === null || !attack.endedAt) {
        censored += 1;
        continue;
      }
      relief.push(Math.max(0, minutesBetween(dose, attack.endedAt)));
      total.push(attackMinutes);
    }

    comparisons.push({
      medKey,
      usedInAttacks: withMed.length,
      comparable: relief.length,
      censored,
      mixed,
      medianReliefMinutes: median(relief),
      medianAttackMinutes: median(total),
      reliable: relief.length >= MIN_DOSES_FOR_COMPARISON,
    });
  }

  return comparisons.sort((a, b) => {
    const byReliability = Number(b.reliable) - Number(a.reliable);
    if (byReliability !== 0) return byReliability;
    return b.usedInAttacks - a.usedInAttacks;
  });
}

export type TimingSplit = {
  earlyCount: number;
  lateCount: number;
  earlyMedianMinutes: number | null;
  lateMedianMinutes: number | null;
  reliable: boolean;
  differenceMinutes: number | null;
};

// Раннее против позднего приёма: не "какая таблетка", а "как быстро принята".
// Сравниваются только закрытые приступы с ровно одним препаратом — по той же
// причине, что и выше.
export function earlyVsLateDosing(
  attacks: Attack[],
  cutoffMinutes = EARLY_DOSE_CUTOFF_MINUTES
): TimingSplit {
  const early: number[] = [];
  const late: number[] = [];

  for (const attack of attacks) {
    if (!attack.endedAt || attack.doses.length === 0) continue;
    if (medKeysOf(attack).size > 1) continue;
    const dose = [...attack.doses].sort((a, b) => a.takenAt.localeCompare(b.takenAt))[0];
    const delay = minutesBetween(attack.startedAt, dose.takenAt);
    if (delay < 0) continue;
    const relief = Math.max(0, minutesBetween(dose.takenAt, attack.endedAt));
    if (delay <= cutoffMinutes) early.push(relief);
    else late.push(relief);
  }

  const earlyMedian = median(early);
  const lateMedian = median(late);
  const reliable =
    early.length >= MIN_DOSES_FOR_COMPARISON && late.length >= MIN_DOSES_FOR_COMPARISON;

  return {
    earlyCount: early.length,
    lateCount: late.length,
    earlyMedianMinutes: earlyMedian,
    lateMedianMinutes: lateMedian,
    reliable,
    differenceMinutes:
      earlyMedian !== null && lateMedian !== null ? lateMedian - earlyMedian : null,
  };
}

export type MedicationDays = {
  windowDays: number;
  daysWithMedication: number;
  perMed: { medKey: string; days: number }[];
};

// Счётчик дней с приёмом за скользящее окно. Это именно счётчик: приложение
// показывает число и личный ориентир, который пользователь задал сам в
// Settings, и не даёт никаких рекомендаций по приёму.
export function medicationDays(
  attacks: Attack[],
  windowStartDay: DayIso,
  windowEndDay: DayIso,
  windowDays: number
): MedicationDays {
  const daysAll = new Set<DayIso>();
  const perMedDays = new Map<string, Set<DayIso>>();

  for (const attack of attacks) {
    for (const dose of attack.doses) {
      const day = dose.takenAt.slice(0, 10);
      if (day < windowStartDay || day > windowEndDay) continue;
      daysAll.add(day);
      if (!perMedDays.has(dose.medKey)) perMedDays.set(dose.medKey, new Set());
      perMedDays.get(dose.medKey)!.add(day);
    }
  }

  return {
    windowDays,
    daysWithMedication: daysAll.size,
    perMed: [...perMedDays.entries()]
      .map(([medKey, days]) => ({ medKey, days: days.size }))
      .sort((a, b) => b.days - a.days),
  };
}
