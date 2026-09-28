// Пресеты: зоны головы, дневные факторы и препараты. Ввод здесь повторяющийся
// и структурный — печатать "Poor sleep" руками каждый вечер никто не будет, а
// без единых ключей статистика по факторам не сложится (две записи "stress" и
// "Stress" стали бы двумя разными факторами).

export type RegionKey =
  | "forehead"
  | "leftTemple"
  | "rightTemple"
  | "leftEye"
  | "rightEye"
  | "crown"
  | "backOfHead"
  | "neck";

export const REGIONS: { key: RegionKey; label: string; side: "left" | "right" | "center" }[] = [
  { key: "forehead", label: "Forehead", side: "center" },
  { key: "leftTemple", label: "Left temple", side: "left" },
  { key: "rightTemple", label: "Right temple", side: "right" },
  { key: "leftEye", label: "Behind left eye", side: "left" },
  { key: "rightEye", label: "Behind right eye", side: "right" },
  { key: "crown", label: "Top of head", side: "center" },
  { key: "backOfHead", label: "Back of head", side: "center" },
  { key: "neck", label: "Neck", side: "center" },
];

export function regionLabel(key: string): string {
  return REGIONS.find((region) => region.key === key)?.label ?? key;
}

export type FactorGroup = "Sleep & rest" | "Food & drink" | "Body & mind" | "Environment";

export type FactorPreset = { key: string; label: string; group: FactorGroup };

export const FACTORS: FactorPreset[] = [
  { key: "shortSleep", label: "Short sleep", group: "Sleep & rest" },
  { key: "brokenSleep", label: "Broken sleep", group: "Sleep & rest" },
  { key: "lateNight", label: "Late night", group: "Sleep & rest" },
  { key: "oversleep", label: "Slept in", group: "Sleep & rest" },
  { key: "skippedMeal", label: "Skipped a meal", group: "Food & drink" },
  { key: "lowWater", label: "Low water", group: "Food & drink" },
  { key: "alcohol", label: "Alcohol", group: "Food & drink" },
  { key: "extraCaffeine", label: "Extra caffeine", group: "Food & drink" },
  { key: "noCaffeine", label: "No caffeine", group: "Food & drink" },
  { key: "stress", label: "Stressful day", group: "Body & mind" },
  { key: "longScreen", label: "Long screen time", group: "Body & mind" },
  { key: "neckStrain", label: "Neck or jaw strain", group: "Body & mind" },
  { key: "hardExercise", label: "Hard exercise", group: "Body & mind" },
  { key: "period", label: "Period day", group: "Body & mind" },
  { key: "weatherShift", label: "Weather shift", group: "Environment" },
  { key: "brightLight", label: "Bright light", group: "Environment" },
  { key: "loudNoise", label: "Loud noise", group: "Environment" },
  { key: "strongSmell", label: "Strong smell", group: "Environment" },
  { key: "travel", label: "Travel", group: "Environment" },
];

export const FACTOR_GROUPS: FactorGroup[] = [
  "Sleep & rest",
  "Food & drink",
  "Body & mind",
  "Environment",
];

export function factorLabel(key: string): string {
  return FACTORS.find((factor) => factor.key === key)?.label ?? key;
}

export type MedPreset = { key: string; label: string };

// Названия, не дозировки: приложение — журнал, а не справочник по приёму.
export const MEDS: MedPreset[] = [
  { key: "ibuprofen", label: "Ibuprofen" },
  { key: "paracetamol", label: "Paracetamol" },
  { key: "aspirin", label: "Aspirin" },
  { key: "naproxen", label: "Naproxen" },
  { key: "triptan", label: "Triptan" },
  { key: "combined", label: "Combination tablet" },
  { key: "other", label: "Other" },
];

export function medLabel(key: string): string {
  return MEDS.find((med) => med.key === key)?.label ?? key;
}
