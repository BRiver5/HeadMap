// Настройки приложения в таблице key/value. Значения простые и читаются на
// старте один раз — отдельная таблица на каждую настройку тут была бы лишней.

import { getDb } from "../db/client";
import type { SchemePreference } from "../store/uiStore";

export type AppSettings = {
  schemePreference: SchemePreference;
  reminderEnabled: boolean;
  reminderHour: number;
  reminderMinute: number;
  /** Личный ориентир пользователя по числу дней с приёмом за 30 дней. */
  medicationDayLimit: number;
};

export const DEFAULT_SETTINGS: AppSettings = {
  schemePreference: "light",
  reminderEnabled: false,
  reminderHour: 21,
  reminderMinute: 0,
  medicationDayLimit: 10,
};

type SettingRow = { key: string; value: string };

export async function loadSettings(): Promise<AppSettings> {
  const db = await getDb();
  const rows = await db.getAllAsync<SettingRow>("SELECT key, value FROM settings;");
  const map = new Map(rows.map((row) => [row.key, row.value]));

  const scheme = map.get("schemePreference");
  const parsedScheme: SchemePreference =
    scheme === "dark" || scheme === "system" || scheme === "light"
      ? scheme
      : DEFAULT_SETTINGS.schemePreference;

  const readNumber = (key: keyof AppSettings, fallback: number): number => {
    const raw = map.get(key);
    const parsed = raw === undefined ? NaN : Number(raw);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  return {
    schemePreference: parsedScheme,
    reminderEnabled: map.get("reminderEnabled") === "1",
    reminderHour: readNumber("reminderHour", DEFAULT_SETTINGS.reminderHour),
    reminderMinute: readNumber("reminderMinute", DEFAULT_SETTINGS.reminderMinute),
    medicationDayLimit: readNumber("medicationDayLimit", DEFAULT_SETTINGS.medicationDayLimit),
  };
}

export async function saveSetting(key: keyof AppSettings, value: string | number | boolean) {
  const db = await getDb();
  const stored = typeof value === "boolean" ? (value ? "1" : "0") : String(value);
  await db.runAsync("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?);", [key, stored]);
}
