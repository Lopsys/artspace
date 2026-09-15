import { describe, expect, it } from "vitest";
import { generateSlots, weekStartMonday, findOverlap, intervalsOverlap, isDayBlocked, revenueByMonth } from "@/features/studio/rules";
import type { Appointment } from "@/shared/lib/types";

describe("intervalsOverlap", () => {
  it("detects partial overlap of different durations", () => {
    const tattooStart = new Date("2026-09-14T14:00:00");
    const tattooEnd = new Date("2026-09-14T17:00:00");
    const cutStart = new Date("2026-09-14T15:00:00");
    const cutEnd = new Date("2026-09-14T15:45:00");
    expect(intervalsOverlap(tattooStart, tattooEnd, cutStart, cutEnd)).toBe(true);
  });

  it("allows back-to-back appointments", () => {
    const aStart = new Date("2026-09-14T14:00:00");
    const aEnd = new Date("2026-09-14T15:00:00");
    const bStart = new Date("2026-09-14T15:00:00");
    const bEnd = new Date("2026-09-14T16:00:00");
    expect(intervalsOverlap(aStart, aEnd, bStart, bEnd)).toBe(false);
  });
});

describe("findOverlap", () => {
  const base: Appointment = {
    id: "1",
    clientId: "c",
    professionalId: "maycom",
    procedureId: "p",
    startsAt: "2026-09-14T14:00:00.000Z",
    endsAt: "2026-09-14T17:00:00.000Z",
    priceCents: 45000,
    status: "confirmed",
  };

  it("ignores no_show and rescheduled", () => {
    expect(
      findOverlap(
        [{ ...base, status: "no_show" }],
        "maycom",
        new Date("2026-09-14T14:30:00.000Z"),
        new Date("2026-09-14T15:00:00.000Z"),
      ),
    ).toBeUndefined();
  });
});

describe("isDayBlocked", () => {
  it("is isolated per professional", () => {
    const blocks = [
      { id: "b", professionalId: "maycom", date: "2026-09-14", reason: "Folga" },
    ];
    expect(isDayBlocked(blocks, "maycom", "2026-09-14")).toBe(true);
    expect(isDayBlocked(blocks, "larisse", "2026-09-14")).toBe(false);
  });
});

describe("revenueByMonth", () => {
  it("sums only present appointments", () => {
    const now = new Date();
    const iso = new Date(now.getFullYear(), now.getMonth(), 10).toISOString();
    const rows = revenueByMonth(
      [
        {
          id: "1",
          clientId: "c",
          professionalId: "p",
          procedureId: "x",
          startsAt: iso,
          endsAt: iso,
          priceCents: 8000,
          status: "present",
        },
        {
          id: "2",
          clientId: "c",
          professionalId: "p",
          procedureId: "x",
          startsAt: iso,
          endsAt: iso,
          priceCents: 9000,
          status: "no_show",
        },
      ],
      6,
    );
    const current = rows[rows.length - 1];
    expect(current.cents).toBe(8000);
  });
});

describe("generateSlots", () => {
  const professionalId = "maycom";
  const rules = [
    {
      id: "r",
      professionalId,
      weekday: 1,
      start: "09:00",
      end: "12:00",
      slotMinutes: 30,
    },
  ];
  const now = new Date("2026-09-14T08:00:00-03:00");

  it("builds slots that fit the duration inside the grade", () => {
    const slots = generateSlots({
      professionalId,
      durationMinutes: 60,
      fromDate: "2026-09-14",
      dayCount: 1,
      rules,
      blocks: [],
      appointments: [],
      now,
    });
    expect(slots.map((item) => item.startsAt)).toEqual([
      "2026-09-14T12:00:00.000Z",
      "2026-09-14T12:30:00.000Z",
      "2026-09-14T13:00:00.000Z",
      "2026-09-14T13:30:00.000Z",
      "2026-09-14T14:00:00.000Z",
    ]);
  });

  it("skips blocked days and occupied windows", () => {
    const busy: Appointment = {
      id: "1",
      clientId: "c",
      professionalId,
      procedureId: "p",
      startsAt: "2026-09-14T12:00:00.000Z",
      endsAt: "2026-09-14T13:00:00.000Z",
      priceCents: 7000,
      status: "confirmed",
    };
    const blocked = generateSlots({
      professionalId,
      durationMinutes: 60,
      fromDate: "2026-09-14",
      dayCount: 1,
      rules,
      blocks: [{ id: "b", professionalId, date: "2026-09-14", reason: "Folga" }],
      appointments: [],
      now,
    });
    expect(blocked).toEqual([]);

    const remaining = generateSlots({
      professionalId,
      durationMinutes: 60,
      fromDate: "2026-09-14",
      dayCount: 1,
      rules,
      blocks: [],
      appointments: [busy],
      now,
    });
    expect(remaining[0]?.startsAt).toBe("2026-09-14T13:00:00.000Z");
  });

  it("returns no slots on a weekday without grade", () => {
    const slots = generateSlots({
      professionalId,
      durationMinutes: 30,
      fromDate: "2026-09-13",
      dayCount: 1,
      rules,
      blocks: [],
      appointments: [],
      now: new Date("2026-09-13T08:00:00-03:00"),
    });
    expect(slots).toEqual([]);
  });
});

describe("weekStartMonday", () => {
  it("snaps midweek and Sunday to Monday", () => {
    expect(weekStartMonday("2026-09-15")).toBe("2026-09-14");
    expect(weekStartMonday("2026-09-13")).toBe("2026-09-07");
    expect(weekStartMonday("2026-09-14")).toBe("2026-09-14");
  });
});
