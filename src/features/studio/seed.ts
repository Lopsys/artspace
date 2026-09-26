import type { Branch, StudioState } from "@/shared/lib/types";

const MAYCOM = "pro-maycom";
const JHONATAS = "pro-jhonatas";
const JONH = "pro-jonh";
const LUCAS = "pro-lucas";
const LARISSE = "pro-larisse";

const DEMO_PASSWORD = "artspace123";

function weekdays(professionalId: string) {
  return [1, 2, 3, 4, 5, 6].map((weekday) => ({
    id: `${professionalId}-wd-${weekday}`,
    professionalId,
    weekday,
    start: "09:00",
    end: "19:00",
    slotMinutes: 30,
  }));
}

function procedure(
  id: string,
  professionalId: string,
  branch: Branch,
  name: string,
  durationMinutes: number,
  priceCents: number,
) {
  return {
    id,
    professionalId,
    branch,
    name,
    durationMinutes,
    priceCents,
    archived: false,
  };
}

export const BRANCH_PROCEDURES: Record<
  Branch,
  { name: string; durationMinutes: number; priceCents: number }[]
> = {
  tattoo: [
    { name: "Tattoo pequena", durationMinutes: 120, priceCents: 45000 },
    { name: "Tattoo média", durationMinutes: 180, priceCents: 80000 },
    { name: "Tattoo grande", durationMinutes: 240, priceCents: 120000 },
  ],
  barber: [
    { name: "Fade", durationMinutes: 45, priceCents: 8000 },
    { name: "Corte social", durationMinutes: 40, priceCents: 6000 },
    { name: "Barba + corte", durationMinutes: 60, priceCents: 9000 },
  ],
  piercing: [
    { name: "Lóbulo", durationMinutes: 30, priceCents: 12000 },
  ],
};

export function proceduresForBranches(branches: Branch[]) {
  const unique = [...new Set(branches)];
  return unique.flatMap((branch) =>
    BRANCH_PROCEDURES[branch].map((item) => ({ ...item, branch })),
  );
}

function catalogFor(professionalId: string, branches: Branch[]) {
  return proceduresForBranches(branches).map((item, index) =>
    procedure(
      `${professionalId}-${item.branch}-${index}`,
      professionalId,
      item.branch,
      item.name,
      item.durationMinutes,
      item.priceCents,
    ),
  );
}

export function createSeedState(): StudioState {
  return {
    profiles: [
      {
        id: MAYCOM,
        name: "Maycom Michel",
        phone: "11999990001",
        cpf: "00000000001",
        email: "maycom@artspace.com.br",
        role: "professional",
        isAdmin: true,
        password: DEMO_PASSWORD,
      },
      {
        id: JHONATAS,
        name: "Jhonatas",
        phone: "11999990002",
        cpf: "00000000002",
        email: "jhonatas@artspace.com.br",
        role: "professional",
        isAdmin: false,
        password: DEMO_PASSWORD,
      },
      {
        id: JONH,
        name: "Jonh Lenno",
        phone: "11999990003",
        cpf: "00000000003",
        email: "jonh@artspace.com.br",
        role: "professional",
        isAdmin: false,
        password: DEMO_PASSWORD,
      },
      {
        id: LUCAS,
        name: "Lucas Souza",
        phone: "11999990004",
        cpf: "00000000004",
        email: "lucas@artspace.com.br",
        role: "professional",
        isAdmin: false,
        password: DEMO_PASSWORD,
      },
      {
        id: LARISSE,
        name: "Larisse Ribeiro",
        phone: "11999990005",
        cpf: "00000000005",
        email: "larisse@artspace.com.br",
        role: "professional",
        isAdmin: false,
        password: DEMO_PASSWORD,
      },
    ],
    branches: [
      { professionalId: MAYCOM, branch: "tattoo" },
      { professionalId: MAYCOM, branch: "barber" },
      { professionalId: JHONATAS, branch: "tattoo" },
      { professionalId: JONH, branch: "barber" },
      { professionalId: LUCAS, branch: "barber" },
      { professionalId: LARISSE, branch: "piercing" },
    ],
    procedures: [
      ...catalogFor(MAYCOM, ["tattoo", "barber"]),
      ...catalogFor(JHONATAS, ["tattoo"]),
      ...catalogFor(JONH, ["barber"]),
      ...catalogFor(LUCAS, ["barber"]),
      ...catalogFor(LARISSE, ["piercing"]),
    ],
    availabilityRules: [
      ...weekdays(MAYCOM),
      ...weekdays(JHONATAS),
      ...weekdays(JONH),
      ...weekdays(LUCAS),
      ...weekdays(LARISSE),
    ],
    availabilityBlocks: [],
    appointments: [],
  };
}

export const STORAGE_KEY = "artspace.studio.v1";
export const SESSION_COOKIE = "artspace_session";
export const SESSION_STORAGE_KEY = "artspace.session";

export const PROFESSIONAL_BOOTSTRAP: Record<
  string,
  {
    name: string;
    phone: string;
    cpf: string;
    isAdmin: boolean;
    branches: Branch[];
    procedures: {
      branch: Branch;
      name: string;
      durationMinutes: number;
      priceCents: number;
    }[];
  }
> = {
  "maycom@artspace.com.br": {
    name: "Maycom Michel",
    phone: "11999990001",
    cpf: "00000000001",
    isAdmin: true,
    branches: ["tattoo", "barber"],
    procedures: proceduresForBranches(["tattoo", "barber"]),
  },
  "jhonatas@artspace.com.br": {
    name: "Jhonatas",
    phone: "11999990002",
    cpf: "00000000002",
    isAdmin: false,
    branches: ["tattoo"],
    procedures: proceduresForBranches(["tattoo"]),
  },
  "jonh@artspace.com.br": {
    name: "Jonh Lenno",
    phone: "11999990003",
    cpf: "00000000003",
    isAdmin: false,
    branches: ["barber"],
    procedures: proceduresForBranches(["barber"]),
  },
  "lucas@artspace.com.br": {
    name: "Lucas Souza",
    phone: "11999990004",
    cpf: "00000000004",
    isAdmin: false,
    branches: ["barber"],
    procedures: proceduresForBranches(["barber"]),
  },
  "larisse@artspace.com.br": {
    name: "Larisse Ribeiro",
    phone: "11999990005",
    cpf: "00000000005",
    isAdmin: false,
    branches: ["piercing"],
    procedures: proceduresForBranches(["piercing"]),
  },
};
