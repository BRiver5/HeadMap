import { test } from "node:test";
import assert from "node:assert/strict";
import { compareMeds, earlyVsLateDosing, medicationDays } from "./medication.ts";
import type { Attack } from "./episodes.ts";

function attack(
  id: string,
  startedAt: string,
  endedAt: string | null,
  doses: { medKey: string; takenAt: string }[]
): Attack {
  return {
    id,
    day: startedAt.slice(0, 10),
    startedAt,
    endedAt,
    severity: 6,
    note: null,
    regions: [],
    doses: doses.map((dose, index) => ({ id: `${id}-${index}`, ...dose })),
  };
}

test("незакрытый приступ уходит в цензурированные, а не портит медиану", () => {
  const attacks = [
    attack("1", "2026-09-01T09:00", "2026-09-01T11:00", [
      { medKey: "ibuprofen", takenAt: "2026-09-01T09:30" },
    ]),
    attack("2", "2026-09-02T09:00", "2026-09-02T10:30", [
      { medKey: "ibuprofen", takenAt: "2026-09-02T09:30" },
    ]),
    attack("3", "2026-09-03T09:00", null, [{ medKey: "ibuprofen", takenAt: "2026-09-03T09:15" }]),
  ];
  const [ibuprofen] = compareMeds(attacks);
  assert.equal(ibuprofen.usedInAttacks, 3);
  assert.equal(ibuprofen.comparable, 2);
  assert.equal(ibuprofen.censored, 1);
  assert.equal(ibuprofen.medianReliefMinutes, 75);
  assert.equal(ibuprofen.reliable, false); // 2 < MIN_DOSES_FOR_COMPARISON
});

test("приступ с двумя разными препаратами не приписывается ни одному", () => {
  const attacks = [
    attack("1", "2026-09-01T09:00", "2026-09-01T12:00", [
      { medKey: "ibuprofen", takenAt: "2026-09-01T09:30" },
      { medKey: "triptan", takenAt: "2026-09-01T10:30" },
    ]),
  ];
  const comparisons = compareMeds(attacks);
  assert.equal(comparisons.length, 2);
  for (const comparison of comparisons) {
    assert.equal(comparison.mixed, 1);
    assert.equal(comparison.comparable, 0);
    assert.equal(comparison.medianReliefMinutes, null);
  }
});

test("медиана облегчения считается от приёма, а не от начала приступа", () => {
  const attacks = [1, 2, 3].map((index) =>
    attack(`${index}`, `2026-09-0${index}T08:00`, `2026-09-0${index}T11:00`, [
      { medKey: "triptan", takenAt: `2026-09-0${index}T10:00` },
    ])
  );
  const [triptan] = compareMeds(attacks);
  assert.equal(triptan.medianReliefMinutes, 60);
  assert.equal(triptan.medianAttackMinutes, 180);
  assert.equal(triptan.reliable, true);
});

test("ранний и поздний приём сравниваются только при трёх случаях с каждой стороны", () => {
  const early = [1, 2, 3].map((index) =>
    attack(`e${index}`, `2026-09-0${index}T08:00`, `2026-09-0${index}T09:30`, [
      { medKey: "ibuprofen", takenAt: `2026-09-0${index}T08:15` },
    ])
  );
  const late = [4, 5].map((index) =>
    attack(`l${index}`, `2026-09-0${index}T08:00`, `2026-09-0${index}T13:00`, [
      { medKey: "ibuprofen", takenAt: `2026-09-0${index}T10:00` },
    ])
  );
  assert.equal(earlyVsLateDosing([...early, ...late]).reliable, false);

  const thirdLate = attack("l6", "2026-09-06T08:00", "2026-09-06T13:00", [
    { medKey: "ibuprofen", takenAt: "2026-09-06T10:00" },
  ]);
  const split = earlyVsLateDosing([...early, ...late, thirdLate]);
  assert.equal(split.reliable, true);
  assert.equal(split.earlyCount, 3);
  assert.equal(split.lateCount, 3);
  assert.equal(split.earlyMedianMinutes, 75);
  assert.equal(split.lateMedianMinutes, 180);
  assert.equal(split.differenceMinutes, 105);
});

test("дни приёма считаются днями, а не таблетками, и только внутри окна", () => {
  const attacks = [
    attack("1", "2026-09-10T09:00", "2026-09-10T11:00", [
      { medKey: "ibuprofen", takenAt: "2026-09-10T09:30" },
      { medKey: "ibuprofen", takenAt: "2026-09-10T10:30" },
    ]),
    attack("2", "2026-09-11T09:00", "2026-09-11T11:00", [
      { medKey: "triptan", takenAt: "2026-09-11T09:30" },
    ]),
    attack("3", "2026-08-01T09:00", "2026-08-01T11:00", [
      { medKey: "ibuprofen", takenAt: "2026-08-01T09:30" },
    ]),
  ];
  const summary = medicationDays(attacks, "2026-09-01", "2026-09-30", 30);
  assert.equal(summary.daysWithMedication, 2);
  assert.deepEqual(summary.perMed, [
    { medKey: "ibuprofen", days: 1 },
    { medKey: "triptan", days: 1 },
  ]);
});
