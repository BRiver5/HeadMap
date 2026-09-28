import { test } from "node:test";
import assert from "node:assert/strict";
import { onsetClock, weekdayAnalysis } from "./rhythm.ts";
import { circularHourSummary, wilsonInterval, newcombeDifference, jaccard } from "./statsMath.ts";

test("среднее время суток считается по кругу, а не арифметически", () => {
  const summary = circularHourSummary([23.5, 0.5]);
  assert.ok(summary);
  assert.ok(Math.abs(summary!.meanHour - 0) < 0.001 || Math.abs(summary!.meanHour - 24) < 0.001);
  assert.ok(summary!.concentration > 0.99);
});

test("равномерно размазанные приступы не дают часового окна", () => {
  const clock = onsetClock([1, 5, 9, 13, 17, 21]);
  assert.equal(clock.reliable, false);
  assert.equal(clock.peakWindow, null);
  assert.equal(clock.bins.reduce((sum, value) => sum + value, 0), 6);
});

test("утренний кластер даёт окно вокруг среднего часа", () => {
  const clock = onsetClock([6.5, 7, 7.25, 6.75, 8]);
  assert.equal(clock.reliable, true);
  assert.ok(clock.summary!.meanHour > 6.5 && clock.summary!.meanHour < 7.5);
  assert.deepEqual(clock.peakWindow, { fromHour: 5, toHour: 9 });
});

test("день недели выделяется только с запасом по неопределённости", () => {
  // 4 понедельника подряд с болью против 20 других отмеченных дней без боли
  const mondays = ["2026-09-07", "2026-09-14", "2026-09-21", "2026-09-28"];
  const others = [
    "2026-09-08",
    "2026-09-09",
    "2026-09-10",
    "2026-09-11",
    "2026-09-12",
    "2026-09-13",
    "2026-09-15",
    "2026-09-16",
    "2026-09-17",
    "2026-09-18",
    "2026-09-19",
    "2026-09-20",
  ];
  const strong = weekdayAnalysis([...mondays, ...others], new Set(mondays));
  assert.ok(strong.standout);
  assert.equal(strong.standout!.weekday, 0);

  // те же данные, но боль только в один понедельник — выделения быть не должно
  const weak = weekdayAnalysis([...mondays, ...others], new Set([mondays[0]]));
  assert.equal(weak.standout, null);
});

test("интервалы Уилсона и Ньюкомба ведут себя как ожидается на краях", () => {
  const full = wilsonInterval(5, 5);
  assert.ok(full.low > 0.5 && full.high === 1);
  const empty = wilsonInterval(0, 0);
  assert.deepEqual(empty, { low: 0, high: 1 });
  const difference = newcombeDifference(5, 5, 0, 5);
  assert.ok(difference.low > 0);
  assert.ok(difference.high <= 1);
  assert.equal(jaccard(new Set(["a", "b"]), new Set(["b", "c"])), 1 / 3);
});
