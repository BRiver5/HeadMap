import { test } from "node:test";
import assert from "node:assert/strict";
import {
  analyzeFactor,
  analyzeFactors,
  entangledPairs,
  readiness,
  type AnalysisInput,
} from "./triggers.ts";
import { lastDays } from "./dates.ts";

function buildInput(
  days: string[],
  factorDays: Record<string, string[]>,
  pain: string[]
): AnalysisInput {
  const factorsByDay = new Map<string, string[]>();
  for (const day of days) {
    const factors = Object.entries(factorDays)
      .filter(([, factorDaysList]) => factorDaysList.includes(day))
      .map(([key]) => key);
    factorsByDay.set(day, factors);
  }
  return { loggedDays: days, factorsByDay, painDays: new Set(pain) };
}

const DAYS = lastDays("2026-09-27", 20);

test("фактор с 3 отметками не выносится как находка — не хватает данных", () => {
  const input = buildInput(DAYS, { alcohol: DAYS.slice(0, 3) }, DAYS.slice(0, 3));
  const result = analyzeFactor("alcohol", input);
  assert.equal(result.status, "needsMoreData");
  if (result.status === "needsMoreData") {
    assert.equal(result.exposedDays, 3);
    assert.equal(result.missingDays, 1);
  }
});

test("чистая связь на лаге 0 отделяется от нуля", () => {
  // 8 дней со стрессом — все с болью, 12 дней без стресса — все без боли
  const stressDays = DAYS.slice(0, 8);
  const input = buildInput(DAYS, { stress: stressDays }, stressDays);
  const result = analyzeFactor("stress", input);
  assert.equal(result.status, "finding");
  if (result.status !== "finding") return;
  assert.equal(result.finding.lag, 0);
  assert.equal(result.finding.exposedRate, 1);
  assert.equal(result.finding.unexposedRate, 0);
  assert.equal(result.finding.separated, true);
  assert.ok(result.finding.differenceInterval.low > 0);
});

test("эффект, сдвинутый на сутки, ловится лагом 1, а не теряется", () => {
  // короткий сон в дни 0..5, боль — строго на следующий день
  const sleepDays = DAYS.slice(0, 6);
  const painDays = sleepDays.map((day) => {
    const index = DAYS.indexOf(day);
    return DAYS[index + 1];
  });
  const input = buildInput(DAYS, { shortSleep: sleepDays }, painDays);
  const result = analyzeFactor("shortSleep", input);
  assert.equal(result.status, "finding");
  if (result.status !== "finding") return;
  assert.equal(result.finding.lag, 1);
  assert.ok(result.finding.difference > 0.5);
});

test("шумная связь не объявляется устойчивой", () => {
  // 6 дней с фактором: 3 с болью; 14 без фактора: 6 с болью — почти одно и то же
  const factorDays = DAYS.slice(0, 6);
  const pain = [...DAYS.slice(0, 3), ...DAYS.slice(6, 12)];
  const input = buildInput(DAYS, { brightLight: factorDays }, pain);
  const result = analyzeFactor("brightLight", input);
  assert.equal(result.status, "finding");
  if (result.status !== "finding") return;
  assert.equal(result.finding.separated, false);
  assert.ok(result.finding.differenceInterval.low < 0);
  assert.ok(result.finding.differenceInterval.high > 0);
});

test("сцепленные факторы находятся и не выдаются за два независимых вывода", () => {
  const nights = DAYS.slice(0, 6);
  const input = buildInput(DAYS, { alcohol: nights, lateNight: nights }, nights);
  const pairs = entangledPairs(input);
  assert.equal(pairs.length, 1);
  assert.equal(pairs[0].overlap, 1);
  assert.equal(pairs[0].sharedDays, 6);
});

test("в список идут только реально отмечавшиеся факторы, находки — первыми", () => {
  const stressDays = DAYS.slice(0, 8);
  const input = buildInput(
    DAYS,
    { stress: stressDays, travel: DAYS.slice(10, 12) },
    stressDays
  );
  const results = analyzeFactors(["stress", "travel", "period"], input);
  assert.deepEqual(
    results.map((result) => result.factorKey),
    ["stress", "travel"]
  );
  assert.equal(results[0].status, "finding");
  assert.equal(results[1].status, "needsMoreData");
});

test("готовность к анализу считается по отмеченным дням", () => {
  assert.equal(readiness(DAYS.slice(0, 5)).ready, false);
  assert.equal(readiness(DAYS.slice(0, 5)).missingDays, 9);
  assert.equal(readiness(DAYS).ready, true);
});
