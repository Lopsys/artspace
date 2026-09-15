export type Role = "professional" | "client";
export type Branch = "tattoo" | "barber" | "piercing";
export type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "present"
  | "no_show"
  | "rescheduled";

export const BRANCH_LABEL: Record<Branch, string> = {
  tattoo: "Tatuagem",
  barber: "Barbearia",
  piercing: "Piercing",
};

export const STATUS_LABEL: Record<AppointmentStatus, string> = {
  scheduled: "Agendado",
  confirmed: "Confirmado",
  present: "Presente",
  no_show: "Faltou",
  rescheduled: "Remarcou",
};

export const OCCUPIED_STATUSES: AppointmentStatus[] = [
  "scheduled",
  "confirmed",
  "present",
];

export interface Profile {
  id: string;
  name: string;
  phone: string;
  cpf: string;
  email: string;
  role: Role;
  isAdmin: boolean;
  password: string;
}

export interface Procedure {
  id: string;
  professionalId: string;
  branch: Branch;
  name: string;
  durationMinutes: number;
  priceCents: number;
  archived: boolean;
}

export interface AvailabilityRule {
  id: string;
  professionalId: string;
  weekday: number;
  start: string;
  end: string;
  slotMinutes: number;
}

export interface AvailabilityBlock {
  id: string;
  professionalId: string;
  date: string;
  reason: string;
}

export interface Appointment {
  id: string;
  clientId: string;
  professionalId: string;
  procedureId: string;
  startsAt: string;
  endsAt: string;
  priceCents: number;
  status: AppointmentStatus;
}

export interface StudioState {
  profiles: Profile[];
  branches: { professionalId: string; branch: Branch }[];
  procedures: Procedure[];
  availabilityRules: AvailabilityRule[];
  availabilityBlocks: AvailabilityBlock[];
  appointments: Appointment[];
}

export type Flash = { type: "ok" | "error" | "info"; message: string } | null;
