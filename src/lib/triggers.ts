// Движок связей "фактор дня → головная боль".
//
// Три вещи, которые тут делаются честно и ради которых всё это написано:
//  1. Знаменатель — только отмеченные дни. День, который пользователь не
//     открывал, не считается ни днём без фактора, ни днём без боли.
//  2. Сдвиг. Часть факторов (короткий сон, алкоголь) бьёт не в тот же день, а
//     на следующий, поэтому каждая пара считается на лаге 0 и лаге 1 отдельно,
//     а в вывод идёт та, где разница больше. Для лага 1 день-исход тоже обязан
//     быть отмеченным, иначе исход неизвестен.
//  3. Сцепленность. Если два фактора почти всегда отмечены вместе, разделить их
//     по этим данным нельзя — и приложение говорит это прямо, вместо того чтобы
//     показать один из них как "находку".

import { addDays, type DayIso } from "./dates.ts";
import {
  jaccard,
  newcombeDifference,
  wilsonInterval,
  type Interval,
} from "./statsMath.ts";

export type Lag = 0 | 1;

export type FactorFinding = {
  factorKey: string;
  lag: Lag;
  exposedDays: number;
  exposedPainDays: number;
  unexposedDays: number;
  unexposedPainDays: number;
  exposedRate: number;
  unexposedRate: number;
  exposedInterval: Interval;
  unexposedInterval: Interval;
  difference: number;
  differenceInterval: Interval;
  /** Интервал разницы не накрывает ноль — направление связи в этих данных устойчиво. */
  separated: boolean;
};

export type FactorResult =
  | { status: "finding"; factorKey: string; finding: FactorFinding }
  | { status: "needsMoreData"; factorKey: string; exposedDays: number; missingDays: number };

export type AnalysisInput = {
  loggedDays: DayIso[];
  factorsByDay: Map<DayIso, string[]>;
  painDays: Set<DayIso>;
};

export const MIN_EXPOSED_DAYS = 4;
export const MIN_UNEXPOSED_DAYS = 4;
export const MIN_LOGGED_DAYS = 14;

function computeFinding(factorKey: string, lag: Lag, input: AnalysisInput): FactorFinding | null {
  const logged = new Set(input.loggedDays);
  let exposedDays = 0;
  let exposedPainDays = 0;
  let unexposedDays = 0;
  let unexposedPainDays = 0;

  for (const day of input.loggedDays) {
    const outcomeDay = lag === 0 ? day : addDays(day, 1);
    if (!logged.has(outcomeDay)) continue; // исход неизвестен — пара не считается
    const exposed = (input.factorsByDay.get(day) ?? []).includes(factorKey);
    const pain = input.painDays.has(outcomeDay);
    if (exposed) {
      exposedDays += 1;
      if (pain) exposedPainDays += 1;
    } else {
      unexposedDays += 1;
      if (pain) unexposedPainDays += 1;
    }
  }

  if (exposedDays < MIN_EXPOSED_DAYS || unexposedDays < MIN_UNEXPOSED_DAYS) return null;

  const exposedRate = exposedPainDays / exposedDays;
  const unexposedRate = unexposedPainDays / unexposedDays;
  const differenceInterval = newcombeDifference(
    exposedPainDays,
    exposedDays,
    unexposedPainDays,
    unexposedDays
  );

  return {
    factorKey,
    lag,
    exposedDays,
    exposedPainDays,
    unexposedDays,
    unexposedPainDays,
    exposedRate,
    unexposedRate,
    exposedInterval: wilsonInterval(exposedPainDays, exposedDays),
    unexposedInterval: wilsonInterval(unexposedPainDays, unexposedDays),
    difference: exposedRate - unexposedRate,
    differenceInterval,
    separated: differenceInterval.low > 0 || differenceInterval.high < 0,
  };
}

// Для каждого фактора берётся лаг с большей по модулю разницей. Это осознанный
// размен: так находка не теряется из-за того, что эффект сдвинут на день, но
// цена — два взгляда на одни данные вместо одного, поэтому порог надёжности
// (MIN_EXPOSED_DAYS) не опускается ниже, чем есть.
export function analyzeFactor(factorKey: string, input: AnalysisInput): FactorResult {
  const candidates = ([0, 1] as Lag[])
    .map((lag) => computeFinding(factorKey, lag, input))
    .filter((finding): finding is FactorFinding => finding !== null);

  if (candidates.length === 0) {
    const exposedDays = input.loggedDays.filter((day) =>
      (input.factorsByDay.get(day) ?? []).includes(factorKey)
    ).length;
    return {
      status: "needsMoreData",
      factorKey,
      exposedDays,
      missingDays: Math.max(1, MIN_EXPOSED_DAYS - exposedDays),
    };
  }

  const best = candidates.reduce((winner, candidate) =>
    Math.abs(candidate.difference) > Math.abs(winner.difference) ? candidate : winner
  );
  return { status: "finding", factorKey, finding: best };
}

export function analyzeFactors(factorKeys: string[], input: AnalysisInput): FactorResult[] {
  const used = new Set<string>();
  for (const day of input.loggedDays) {
    for (const key of input.factorsByDay.get(day) ?? []) used.add(key);
  }
  return factorKeys
    .filter((key) => used.has(key))
    .map((key) => analyzeFactor(key, input))
    .sort((a, b) => {
      if (a.status === "finding" && b.status === "finding") {
        const bySeparation = Number(b.finding.separated) - Number(a.finding.separated);
        if (bySeparation !== 0) return bySeparation;
        return Math.abs(b.finding.difference) - Math.abs(a.finding.difference);
      }
      if (a.status === "finding") return -1;
      if (b.status === "finding") return 1;
      return b.exposedDays - a.exposedDays;
    });
}

export type EntangledPair = {
  factorA: string;
  factorB: string;
  overlap: number; // коэффициент Жаккара, 0..1
  sharedDays: number;
};

export const ENTANGLED_THRESHOLD = 0.6;

export function entangledPairs(
  input: AnalysisInput,
  threshold = ENTANGLED_THRESHOLD
): EntangledPair[] {
  const sets = new Map<string, Set<string>>();
  for (const day of input.loggedDays) {
    for (const key of input.factorsByDay.get(day) ?? []) {
      if (!sets.has(key)) sets.set(key, new Set());
      sets.get(key)!.add(day);
    }
  }
  const keys = [...sets.keys()].filter((key) => (sets.get(key)?.size ?? 0) >= MIN_EXPOSED_DAYS);
  const pairs: EntangledPair[] = [];
  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      const a = sets.get(keys[i])!;
      const b = sets.get(keys[j])!;
      const overlap = jaccard(a, b);
      if (overlap < threshold) continue;
      let shared = 0;
      for (const day of a) if (b.has(day)) shared += 1;
      pairs.push({ factorA: keys[i], factorB: keys[j], overlap, sharedDays: shared });
    }
  }
  return pairs.sort((a, b) => b.overlap - a.overlap);
}

export type Readiness = {
  loggedDays: number;
  ready: boolean;
  missingDays: number;
};

export function readiness(loggedDays: DayIso[]): Readiness {
  return {
    loggedDays: loggedDays.length,
    ready: loggedDays.length >= MIN_LOGGED_DAYS,
    missingDays: Math.max(0, MIN_LOGGED_DAYS - loggedDays.length),
  };
}
