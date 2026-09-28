// Статистическое ядро приложения. Здесь нет ни React, ни SQLite — только
// чистые функции, чтобы выводы на экране Insights можно было проверить тестами,
// а не "на глаз по графику".
//
// Почему именно интервалы, а не голые проценты: при 6 записях "головная боль в
// 50% дней с коротким сном" и "в 20% остальных" — это шум, а не находка.
// Интервал Уилсона честно показывает, насколько широк разброс при таком N, а
// метод Ньюкомба переносит это на РАЗНИЦУ двух долей — только она и выносится
// в вывод.

export type Interval = { low: number; high: number };

// Доверительный интервал Уилсона для доли (95%, z = 1.96). Выбран вместо
// нормального приближения именно потому, что не разваливается на маленьких
// выборках и у краёв (0 и 1 успехов) — а тут почти всегда маленькие выборки.
export function wilsonInterval(successes: number, total: number, z = 1.96): Interval {
  if (total <= 0) return { low: 0, high: 1 };
  const p = successes / total;
  const z2 = z * z;
  const denominator = 1 + z2 / total;
  const center = p + z2 / (2 * total);
  const margin = z * Math.sqrt((p * (1 - p) + z2 / (4 * total)) / total);
  return {
    low: Math.max(0, (center - margin) / denominator),
    high: Math.min(1, (center + margin) / denominator),
  };
}

// Интервал для разницы двух долей методом Ньюкомба (square-and-add на двух
// интервалах Уилсона). Прямое нормальное приближение для разницы при N=8
// давало бы интервалы, вылезающие за [-1, 1].
export function newcombeDifference(
  successesA: number,
  totalA: number,
  successesB: number,
  totalB: number
): Interval {
  const pA = totalA > 0 ? successesA / totalA : 0;
  const pB = totalB > 0 ? successesB / totalB : 0;
  const a = wilsonInterval(successesA, totalA);
  const b = wilsonInterval(successesB, totalB);
  const diff = pA - pB;
  const low = diff - Math.sqrt((pA - a.low) ** 2 + (b.high - pB) ** 2);
  const high = diff + Math.sqrt((a.high - pA) ** 2 + (pB - b.low) ** 2);
  return { low: Math.max(-1, low), high: Math.min(1, high) };
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

// Коэффициент Жаккара — доля совпадения двух множеств дней. Нужен, чтобы
// поймать сцепленные факторы: если "Alcohol" и "Late night" отмечены почти
// всегда вместе, никакой анализ не скажет, какой из них при чём — и приложение
// обязано сказать это прямо, а не выбрать один и сделать вид, что разобралось.
export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const value of a) if (b.has(value)) intersection += 1;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export type CircularSummary = {
  meanHour: number;
  concentration: number; // 0..1, длина результирующего вектора
  count: number;
};

// Среднее время суток нельзя считать обычным средним: 23:30 и 00:30 дали бы
// полдень. Поэтому часы переводятся в углы на круге, усредняются как векторы,
// и длина результирующего вектора заодно показывает, насколько плотно
// сгруппированы приступы (1 — все в один час, 0 — равномерно по суткам).
export function circularHourSummary(hours: number[]): CircularSummary | null {
  if (hours.length === 0) return null;
  let sumSin = 0;
  let sumCos = 0;
  for (const hour of hours) {
    const angle = (hour / 24) * 2 * Math.PI;
    sumSin += Math.sin(angle);
    sumCos += Math.cos(angle);
  }
  const avgSin = sumSin / hours.length;
  const avgCos = sumCos / hours.length;
  const concentration = Math.sqrt(avgSin * avgSin + avgCos * avgCos);
  let angle = Math.atan2(avgSin, avgCos);
  if (angle < 0) angle += 2 * Math.PI;
  return {
    meanHour: (angle / (2 * Math.PI)) * 24,
    concentration,
    count: hours.length,
  };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}
