// Отмеченные дни и факторы дня. Это половина модели данных приложения:
// приступы отвечают на "что было", а дни — на "сколько всего дней под
// наблюдением", без чего ни одна доля на экране Insights не имеет смысла.

import { getDb } from "../db/client";
import { nowStamp, type DayIso } from "../lib/dates";

type DayRow = { day: string };
type FactorRow = { day: string; factor_key: string };

export async function listLoggedDays(): Promise<DayIso[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<DayRow>("SELECT day FROM day_logs ORDER BY day;");
  return rows.map((row) => row.day);
}

export async function listFactorsByDay(): Promise<Map<DayIso, string[]>> {
  const db = await getDb();
  const rows = await db.getAllAsync<FactorRow>("SELECT day, factor_key FROM day_factors;");
  const map = new Map<DayIso, string[]>();
  for (const row of rows) {
    const list = map.get(row.day) ?? [];
    list.push(row.factor_key);
    map.set(row.day, list);
  }
  return map;
}

export async function getDayFactors(day: DayIso): Promise<string[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<FactorRow>(
    "SELECT day, factor_key FROM day_factors WHERE day = ?;",
    [day]
  );
  return rows.map((row) => row.factor_key);
}

// Сохранение факторов дня всегда отмечает день как просмотренный — в том
// числе когда список пуст. "Сегодня ничего из списка не было" — это полноценная
// запись, а не отсутствие записи: именно такие дни и образуют контрольную
// группу в анализе.
export async function saveDayFactors(day: DayIso, factorKeys: string[]): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync("INSERT OR IGNORE INTO day_logs (day, logged_at) VALUES (?, ?);", [
      day,
      nowStamp(),
    ]);
    await db.runAsync("DELETE FROM day_factors WHERE day = ?;", [day]);
    for (const key of factorKeys) {
      await db.runAsync("INSERT INTO day_factors (day, factor_key) VALUES (?, ?);", [day, key]);
    }
  });
}

export async function clearAllData(): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.execAsync(
      "DELETE FROM attack_regions; DELETE FROM doses; DELETE FROM attacks; DELETE FROM day_factors; DELETE FROM day_logs;"
    );
  });
}
