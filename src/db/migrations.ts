import type { SQLiteDatabase } from "expo-sqlite";

// Каждая миграция — одна ступень схемы. Не редактируй уже выпущенную миграцию —
// добавляй новую в конец массива. PRAGMA user_version хранит номер последней
// применённой ступени, миграции применяются последовательно от текущего значения.
//
// Ключевая деталь модели: day_logs — это отдельная сущность "день просмотрен",
// а не побочный эффект приступа. Без неё статистика по триггерам не считается
// вообще: чтобы сказать "после коротких ночей приступы чаще", нужны и дни с
// фактором БЕЗ приступа тоже, то есть знаменатель. Дни, которые пользователь
// не отмечал, в анализ не попадают ни в числитель, ни в знаменатель.
const migrations: string[] = [
  `
  CREATE TABLE IF NOT EXISTS attacks (
    id TEXT PRIMARY KEY NOT NULL,
    day TEXT NOT NULL,                 -- YYYY-MM-DD, локальный день начала
    started_at TEXT NOT NULL,          -- YYYY-MM-DDTHH:mm, локальное время
    ended_at TEXT,                     -- NULL = приступ ещё идёт
    severity INTEGER NOT NULL,         -- 1..10
    note TEXT,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_attacks_day ON attacks (day);

  CREATE TABLE IF NOT EXISTS attack_regions (
    attack_id TEXT NOT NULL,
    region TEXT NOT NULL,
    PRIMARY KEY (attack_id, region)
  );

  CREATE TABLE IF NOT EXISTS doses (
    id TEXT PRIMARY KEY NOT NULL,
    attack_id TEXT NOT NULL,
    med_key TEXT NOT NULL,
    taken_at TEXT NOT NULL,            -- YYYY-MM-DDTHH:mm
    day TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_doses_attack ON doses (attack_id);

  CREATE TABLE IF NOT EXISTS day_logs (
    day TEXT PRIMARY KEY NOT NULL,
    logged_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS day_factors (
    day TEXT NOT NULL,
    factor_key TEXT NOT NULL,
    PRIMARY KEY (day, factor_key)
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );
  `,
];

export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version;");
  const currentVersion = row?.user_version ?? 0;

  for (let i = currentVersion; i < migrations.length; i++) {
    await db.execAsync(migrations[i]);
    await db.execAsync(`PRAGMA user_version = ${i + 1};`);
  }
}
