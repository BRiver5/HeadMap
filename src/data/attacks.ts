// Доступ к приступам. Собирает объект Attack целиком (зоны + приёмы), потому
// что вся аналитика в src/lib работает с полной записью, а не с плоской
// строкой таблицы.

import { getDb } from "../db/client";
import { generateId } from "../lib/id";
import { nowStamp, type DayIso, type StampIso } from "../lib/dates";
import type { Attack, Dose } from "../lib/episodes";
import type { RegionKey } from "../lib/presets";

type AttackRow = {
  id: string;
  day: string;
  started_at: string;
  ended_at: string | null;
  severity: number;
  note: string | null;
};

type RegionRow = { attack_id: string; region: string };
type DoseRow = { id: string; attack_id: string; med_key: string; taken_at: string };

export type AttackInput = {
  id?: string;
  startedAt: StampIso;
  endedAt: StampIso | null;
  severity: number;
  note: string | null;
  regions: RegionKey[];
  doses: { medKey: string; takenAt: StampIso }[];
};

async function hydrate(rows: AttackRow[]): Promise<Attack[]> {
  if (rows.length === 0) return [];
  const db = await getDb();
  const ids = rows.map((row) => `'${row.id}'`).join(",");
  const regions = await db.getAllAsync<RegionRow>(
    `SELECT attack_id, region FROM attack_regions WHERE attack_id IN (${ids});`
  );
  const doses = await db.getAllAsync<DoseRow>(
    `SELECT id, attack_id, med_key, taken_at FROM doses WHERE attack_id IN (${ids}) ORDER BY taken_at;`
  );

  const regionsByAttack = new Map<string, RegionKey[]>();
  for (const row of regions) {
    const list = regionsByAttack.get(row.attack_id) ?? [];
    list.push(row.region as RegionKey);
    regionsByAttack.set(row.attack_id, list);
  }

  const dosesByAttack = new Map<string, Dose[]>();
  for (const row of doses) {
    const list = dosesByAttack.get(row.attack_id) ?? [];
    list.push({ id: row.id, medKey: row.med_key, takenAt: row.taken_at });
    dosesByAttack.set(row.attack_id, list);
  }

  return rows.map((row) => ({
    id: row.id,
    day: row.day,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    severity: row.severity,
    note: row.note,
    regions: regionsByAttack.get(row.id) ?? [],
    doses: dosesByAttack.get(row.id) ?? [],
  }));
}

export async function listAttacks(): Promise<Attack[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<AttackRow>(
    "SELECT id, day, started_at, ended_at, severity, note FROM attacks ORDER BY started_at DESC;"
  );
  return hydrate(rows);
}

export async function saveAttack(input: AttackInput): Promise<string> {
  const db = await getDb();
  const id = input.id ?? generateId();
  const day = input.startedAt.slice(0, 10) as DayIso;

  await db.withTransactionAsync(async () => {
    if (input.id) {
      await db.runAsync(
        "UPDATE attacks SET day = ?, started_at = ?, ended_at = ?, severity = ?, note = ? WHERE id = ?;",
        [day, input.startedAt, input.endedAt, input.severity, input.note, id]
      );
      await db.runAsync("DELETE FROM attack_regions WHERE attack_id = ?;", [id]);
      await db.runAsync("DELETE FROM doses WHERE attack_id = ?;", [id]);
    } else {
      await db.runAsync(
        "INSERT INTO attacks (id, day, started_at, ended_at, severity, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?);",
        [id, day, input.startedAt, input.endedAt, input.severity, input.note, nowStamp()]
      );
    }

    for (const region of input.regions) {
      await db.runAsync("INSERT INTO attack_regions (attack_id, region) VALUES (?, ?);", [
        id,
        region,
      ]);
    }

    for (const dose of input.doses) {
      await db.runAsync(
        "INSERT INTO doses (id, attack_id, med_key, taken_at, day) VALUES (?, ?, ?, ?, ?);",
        [generateId(), id, dose.medKey, dose.takenAt, dose.takenAt.slice(0, 10)]
      );
    }

    // День с приступом автоматически считается отмеченным: пользователь его
    // точно "просмотрел", и без этого он не попал бы в знаменатель анализа.
    await db.runAsync("INSERT OR IGNORE INTO day_logs (day, logged_at) VALUES (?, ?);", [
      day,
      nowStamp(),
    ]);
  });

  return id;
}

export async function deleteAttack(id: string): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync("DELETE FROM attack_regions WHERE attack_id = ?;", [id]);
    await db.runAsync("DELETE FROM doses WHERE attack_id = ?;", [id]);
    await db.runAsync("DELETE FROM attacks WHERE id = ?;", [id]);
  });
}
