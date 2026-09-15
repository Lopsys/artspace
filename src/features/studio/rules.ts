import { addDays, addMinutes } from "date-fns";
import {
  OCCUPIED_STATUSES,
  type Appointment,
  type AvailabilityBlock,
  type AvailabilityRule,
  type StudioState,
} from "@/shared/lib/types";
import { onlyDigits } from "@/shared/lib/format";

const SAO_PAULO_OFFSET = "-03:00";

export function saoPauloDateString(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function atSaoPaulo(date: string, time: string) {
  const normalized = time.length >= 8 ? time.slice(0, 8) : `${time}:00`;
  return new Date(`${date}T${normalized}${SAO_PAULO_OFFSET}`);
}

export function weekdaySaoPaulo(date: string) {
  return atSaoPaulo(date, "12:00").getUTCDay();
}

export function weekStartMonday(date: string) {
  const weekday = weekdaySaoPaulo(date);
  const daysFromMonday = weekday === 0 ? 6 : weekday - 1;
  return saoPauloDateString(addDays(atSaoPaulo(date, "12:00"), -daysFromMonday));
}

export function intervalsOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
) {
  return aStart < bEnd && bStart < aEnd;
}

export function isDayBlocked(
  blocks: AvailabilityBlock[],
  professionalId: string,
  date: string,
) {
  return blocks.some(
    (block) =>
      block.professionalId === professionalId && block.date === date,
  );
}

export function findOverlap(
  appointments: Appointment[],
  professionalId: string,
  startsAt: Date,
  endsAt: Date,
  ignoreId?: string,
) {
  return appointments.find((item) => {
    if (item.professionalId !== professionalId) return false;
    if (ignoreId && item.id === ignoreId) return false;
    if (!OCCUPIED_STATUSES.includes(item.status)) return false;
    return intervalsOverlap(
      startsAt,
      endsAt,
      new Date(item.startsAt),
      new Date(item.endsAt),
    );
  });
}

export function findClientByCpf(state: StudioState, cpf: string) {
  const digits = onlyDigits(cpf);
  return state.profiles.find(
    (profile) =>
      profile.role === "client" && onlyDigits(profile.cpf) === digits,
  );
}

export function branchesOf(state: StudioState, professionalId: string) {
  return state.branches
    .filter((item) => item.professionalId === professionalId)
    .map((item) => item.branch);
}

export function generateSlots(input: {
  professionalId: string;
  durationMinutes: number;
  fromDate: string;
  dayCount: number;
  rules: AvailabilityRule[];
  blocks: AvailabilityBlock[];
  appointments: Appointment[];
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const slots: { startsAt: string; endsAt: string }[] = [];
  if (input.durationMinutes <= 0 || input.dayCount <= 0) return slots;

  const origin = atSaoPaulo(input.fromDate, "12:00");

  for (let index = 0; index < input.dayCount; index += 1) {
    const day = saoPauloDateString(addDays(origin, index));
    if (isDayBlocked(input.blocks, input.professionalId, day)) continue;

    const rule = input.rules.find(
      (item) =>
        item.professionalId === input.professionalId &&
        item.weekday === weekdaySaoPaulo(day),
    );
    if (!rule || rule.start >= rule.end) continue;

    const dayEnd = atSaoPaulo(day, rule.end);
    const step = Math.max(rule.slotMinutes, 5);
    let cursor = atSaoPaulo(day, rule.start);

    while (addMinutes(cursor, input.durationMinutes) <= dayEnd) {
      const end = addMinutes(cursor, input.durationMinutes);
      if (
        cursor > now &&
        !findOverlap(input.appointments, input.professionalId, cursor, end)
      ) {
        slots.push({
          startsAt: cursor.toISOString(),
          endsAt: end.toISOString(),
        });
      }
      cursor = addMinutes(cursor, step);
    }
  }

  return slots;
}

export function revenueByMonth(appointments: Appointment[], months: number) {
  const now = new Date();
  const buckets: { key: string; label: string; cents: number }[] = [];

  for (let i = months - 1; i >= 0; i -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const label = date.toLocaleDateString("pt-BR", {
      month: "short",
      year: "2-digit",
    });
    buckets.push({ key, label, cents: 0 });
  }

  for (const item of appointments) {
    if (item.status !== "present") continue;
    const date = new Date(item.startsAt);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const bucket = buckets.find((entry) => entry.key === key);
    if (bucket) bucket.cents += item.priceCents;
  }

  return buckets;
}
