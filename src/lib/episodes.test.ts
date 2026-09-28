import { test } from "node:test";
import assert from "node:assert/strict";
import {
  coveredDays,
  currentFreeStreak,
  durationMinutes,
  durationSummary,
  headacheDays,
  longestFreeStreak,
  regionShares,
  severityBands,
  weeklyPainDays,
  type Attack,
} from "./episodes.ts";
import type { RegionKey } from "./presets.ts";

function attack(
  id: string,
  startedAt: string,
  endedAt: string | null,
  severity = 5,
  regions: RegionKey[] = []
): Attack {
  return {
    id,
    day: startedAt.slice(0, 10),
    startedAt,
    endedAt,
    severity,
    note: null,
    regions,
    doses: [],
  };
}

test("приступ через полночь занимает оба дня", () => {
  const night = attack("1", "2026-09-10T23:40", "2026-09-11T04:00");
  assert.deepEqual(coveredDays(night), ["2026-09-10", "2026-09-11"]);
  assert.equal(durationMinutes(night), 260);
});

test("у идущего приступа длительности нет, а не ноль", () => {
  assert.equal(durationMinutes(attack("1", "2026-09-10T09:00", null)), null);
  const summary = durationSummary([
    attack("1", "2026-09-10T09:00", null),
    attack("2", "2026-09-11T09:00", "2026-09-11T12:00"),
    attack("3", "2026-09-12T09:00", "2026-09-12T10:00"),
  ]);
  assert.equal(summary.ongoing, 1);
  assert.equal(summary.completed, 2);
  assert.equal(summary.medianMinutes, 120); // медиана из 180 и 60, идущий приступ не участвует
  assert.equal(summary.longestMinutes, 180);
});

test("серия чистых дней обрывается сегодняшней болью", () => {
  const attacks = [attack("1", "2026-09-20T10:00", "2026-09-20T14:00")];
  assert.equal(currentFreeStreak(attacks, "2026-09-23"), 3);
  assert.equal(currentFreeStreak(attacks, "2026-09-20"), 0);
});

test("рекорд чистых дней не растёт за время, пока дни не отмечались", () => {
  const attacks = [attack("1", "2026-09-01T10:00", "2026-09-01T12:00")];
  // отмечены 2-4 сентября, потом провал, потом 20-21 сентября
  const logged = ["2026-09-01", "2026-09-02", "2026-09-03", "2026-09-04", "2026-09-20", "2026-09-21"];
  assert.equal(longestFreeStreak(attacks, logged), 3);
});

test("недельные корзины считают дни с болью, а не приступы", () => {
  const attacks = [
    attack("1", "2026-09-21T08:00", "2026-09-21T10:00"),
    attack("2", "2026-09-21T18:00", "2026-09-21T20:00"),
    attack("3", "2026-09-24T08:00", "2026-09-24T09:00"),
  ];
  const buckets = weeklyPainDays(attacks, "2026-09-27", 2);
  assert.deepEqual(
    buckets.map((bucket) => bucket.value),
    [0, 2]
  );
});

test("полосы силы боли режутся по парам, зоны считаются от самой частой", () => {
  const attacks = [
    attack("1", "2026-09-01T08:00", null, 2, ["forehead", "leftTemple"]),
    attack("2", "2026-09-02T08:00", null, 7, ["forehead"]),
    attack("3", "2026-09-03T08:00", null, 10, ["neck"]),
  ];
  assert.deepEqual(
    severityBands(attacks).map((band) => band.count),
    [1, 0, 0, 1, 1]
  );
  const shares = regionShares(attacks);
  assert.equal(shares[0].region, "forehead");
  assert.equal(shares[0].count, 2);
  assert.equal(shares[0].intensity, 1);
  assert.equal(headacheDays(attacks).size, 3);
});
