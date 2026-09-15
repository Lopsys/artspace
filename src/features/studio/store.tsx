"use client";

import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { onlyDigits } from "@/shared/lib/format";
import type {
  Appointment,
  AppointmentStatus,
  Branch,
  Flash,
  Procedure,
  Profile,
  StudioState,
} from "@/shared/lib/types";
import {
  SESSION_COOKIE,
  SESSION_STORAGE_KEY,
  STORAGE_KEY,
  createSeedState,
  proceduresForBranches,
} from "@/features/studio/seed";
import {
  archiveOrDeleteProcedure,
  appointmentWindow,
  createProfessionalRemote,
  deleteAppointment as deleteAppointmentRemote,
  insertAppointment,
  insertReschedule,
  loadStudio,
  signInProfessional,
  signOutProfessional,
  toggleAvailabilityBlock,
  updateAppointmentStatus,
  upsertAvailabilityRule,
  upsertClientRow,
  upsertProcedure,
} from "@/features/studio/supabase-api";
import {
  branchesOf,
  findClientByCpf,
  findOverlap,
  isDayBlocked,
} from "@/features/studio/rules";
import { isSupabaseConfigured } from "@/shared/lib/supabase/env";

type Result =
  | { ok: true; message?: string; kind?: "professional" | "client" | null }
  | { ok: false; message: string };

interface StudioContextValue {
  ready: boolean;
  state: StudioState;
  session: Profile | null;
  accountKind: "professional" | "client" | null;
  flash: Flash;
  clearFlash: () => void;
  login: (email: string, password: string) => Promise<Result>;
  logout: () => void;
  branchesOf: (professionalId: string) => Branch[];
  upsertClient: (input: {
    name: string;
    phone: string;
    cpf: string;
    email: string;
  }) => { profile: Profile; reused: boolean } | { error: string };
  createAppointment: (input: {
    professionalId: string;
    client: {
      name: string;
      phone: string;
      cpf: string;
      email: string;
    };
    procedureId: string;
    startsAt: string;
  }) => Promise<Result>;
  setAppointmentStatus: (
    appointmentId: string,
    status: Exclude<AppointmentStatus, "rescheduled">,
  ) => Promise<Result>;
  rescheduleAppointment: (
    appointmentId: string,
    startsAt: string,
  ) => Promise<Result>;
  deleteAppointment: (appointmentId: string) => Promise<Result>;
  saveProcedure: (
    input: Omit<Procedure, "id" | "archived"> & { id?: string },
  ) => Promise<Result>;
  archiveProcedure: (procedureId: string) => Promise<Result>;
  saveAvailabilityRule: (input: {
    professionalId: string;
    weekday: number;
    start: string;
    end: string;
    slotMinutes: number;
  }) => Promise<Result>;
  toggleDayBlock: (
    professionalId: string,
    date: string,
    reason?: string,
  ) => Promise<Result>;
  createProfessional: (input: {
    name: string;
    email: string;
    phone: string;
    cpf: string;
    password: string;
    branches: Branch[];
    isAdmin?: boolean;
  }) => Promise<Result>;
}

const StudioContext = createContext<StudioContextValue | null>(null);

function uid(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function writeSessionCookie(id: string | null) {
  if (typeof document === "undefined") return;
  if (id) {
    document.cookie = `${SESSION_COOKIE}=${id}; path=/; max-age=2592000; samesite=lax`;
    localStorage.setItem(SESSION_STORAGE_KEY, id);
  } else {
    document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0`;
    localStorage.removeItem(SESSION_STORAGE_KEY);
  }
}

function readSessionId() {
  if (typeof window === "undefined") return null;
  return (
    localStorage.getItem(SESSION_STORAGE_KEY) ??
    document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${SESSION_COOKIE}=`))
      ?.split("=")[1] ??
    null
  );
}

export function StudioProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<StudioState>(createSeedState);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [accountKind, setAccountKind] = useState<"professional" | "client" | null>(
    null,
  );
  const [flash, setFlash] = useState<Flash>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      if (isSupabaseConfigured()) {
        const loaded = await loadStudio();
        if (cancelled) return;
        if (!loaded.ok) {
          setFlash({ type: "error", message: loaded.message });
        } else {
          setState(loaded.state);
          setSessionId(loaded.sessionId);
          setAccountKind(loaded.kind);
        }
        setReady(true);
        return;
      }

      let next = createSeedState();
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) next = JSON.parse(raw) as StudioState;
      } catch {
        next = createSeedState();
      }
      const session = readSessionId();
      startTransition(() => {
        if (cancelled) return;
        setState(next);
        setSessionId(session);
        setReady(true);
      });
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready || isSupabaseConfigured()) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [ready, state]);

  const session = useMemo(
    () => state.profiles.find((profile) => profile.id === sessionId) ?? null,
    [state.profiles, sessionId],
  );

  const show = useCallback((next: Flash) => setFlash(next), []);
  const clearFlash = useCallback(() => setFlash(null), []);

  const refreshCloud = useCallback(async () => {
    const loaded = await loadStudio();
    if (!loaded.ok) {
      show({ type: "error", message: loaded.message });
      return loaded;
    }
    setState(loaded.state);
    setSessionId(loaded.sessionId);
    setAccountKind(loaded.kind);
    return loaded;
  }, [show]);

  const login = useCallback(
    async (email: string, password: string): Promise<Result> => {
      if (isSupabaseConfigured()) {
        const result = await signInProfessional(email, password);
        if (!result.ok) return result;
        if (result.kind === "client") {
          setAccountKind("client");
          setSessionId(null);
          return result;
        }
        const loaded = await refreshCloud();
        return loaded.ok
          ? { ok: true, kind: "professional" as const }
          : loaded;
      }
      const user = state.profiles.find(
        (profile) =>
          profile.email.toLowerCase() === email.trim().toLowerCase() &&
          profile.password === password &&
          profile.role === "professional",
      );
      if (!user) {
        return { ok: false, message: "E-mail ou senha inválidos." };
      }
      setSessionId(user.id);
      setAccountKind("professional");
      writeSessionCookie(user.id);
      return { ok: true };
    },
    [refreshCloud, state.profiles],
  );

  const logout = useCallback(() => {
    if (isSupabaseConfigured()) {
      void signOutProfessional();
    }
    setSessionId(null);
    setAccountKind(null);
    writeSessionCookie(null);
  }, []);

  const upsertClient = useCallback(
    (input: {
      name: string;
      phone: string;
      cpf: string;
      email: string;
    }) => {
      const cpf = onlyDigits(input.cpf);
      if (cpf.length !== 11) return { error: "CPF precisa ter 11 dígitos." };
      if (!input.name.trim()) return { error: "Informe o nome do cliente." };

      const existing = findClientByCpf(state, cpf);
      if (existing) return { profile: existing, reused: true };

      const taken = state.profiles.some(
        (profile) => onlyDigits(profile.cpf) === cpf,
      );
      if (taken) return { error: "Este CPF já pertence a um profissional." };

      const profile: Profile = {
        id: uid("cli"),
        name: input.name.trim(),
        phone: onlyDigits(input.phone),
        cpf,
        email: input.email.trim().toLowerCase(),
        role: "client",
        isAdmin: false,
        password: "",
      };

      setState((current) => ({
        ...current,
        profiles: [...current.profiles, profile],
      }));

      return { profile, reused: false };
    },
    [state],
  );

  const createAppointment = useCallback(
    async (input: {
      professionalId: string;
      client: {
        name: string;
        phone: string;
        cpf: string;
        email: string;
      };
      procedureId: string;
      startsAt: string;
    }): Promise<Result> => {
      const procedure = state.procedures.find(
        (item) => item.id === input.procedureId && !item.archived,
      );
      if (!procedure) return { ok: false, message: "Procedimento inválido." };
      if (procedure.professionalId !== input.professionalId) {
        return {
          ok: false,
          message: "Este procedimento não pertence a esse profissional.",
        };
      }

      const window = appointmentWindow(input.startsAt, procedure.durationMinutes);
      if (Number.isNaN(window.start.getTime())) {
        return { ok: false, message: "Horário inválido." };
      }

      if (isDayBlocked(state.availabilityBlocks, input.professionalId, window.date)) {
        return { ok: false, message: "Esse intervalo não está livre." };
      }

      if (
        findOverlap(
          state.appointments,
          input.professionalId,
          window.start,
          window.end,
        )
      ) {
        return { ok: false, message: "Esse intervalo não está livre." };
      }

      if (isSupabaseConfigured()) {
        const clientResult = await upsertClientRow(input.client);
        if ("error" in clientResult) {
          return { ok: false, message: clientResult.error };
        }
        const inserted = await insertAppointment({
          professionalId: input.professionalId,
          clientId: clientResult.profile.id,
          procedureId: procedure.id,
          startsAt: window.startsAt,
          endsAt: window.endsAt,
          priceCents: procedure.priceCents,
        });
        if (!inserted.ok) return inserted;
        await refreshCloud();
        const message = clientResult.reused
          ? "Cliente já cadastrado — horário encaixado."
          : "Horário encaixado.";
        show({ type: "ok", message });
        return { ok: true, message };
      }

      const clientResult = upsertClient(input.client);
      if ("error" in clientResult) {
        return {
          ok: false,
          message: clientResult.error ?? "Não foi possível salvar o cliente.",
        };
      }

      const appointment: Appointment = {
        id: uid("apt"),
        clientId: clientResult.profile.id,
        professionalId: input.professionalId,
        procedureId: procedure.id,
        startsAt: window.startsAt,
        endsAt: window.endsAt,
        priceCents: procedure.priceCents,
        status: "scheduled",
      };

      setState((current) => ({
        ...current,
        appointments: [...current.appointments, appointment],
      }));

      const message = clientResult.reused
        ? "Cliente já cadastrado — horário encaixado."
        : "Horário encaixado.";
      show({ type: "ok", message });
      return { ok: true, message };
    },
    [refreshCloud, show, state, upsertClient],
  );

  const setAppointmentStatus = useCallback(
    async (
      appointmentId: string,
      status: Exclude<AppointmentStatus, "rescheduled">,
    ): Promise<Result> => {
      const current = state.appointments.find((item) => item.id === appointmentId);
      if (!current) return { ok: false, message: "Atendimento não encontrado." };

      if (isSupabaseConfigured()) {
        const result = await updateAppointmentStatus(appointmentId, status);
        if (!result.ok) return result;
        await refreshCloud();
        return { ok: true };
      }

      setState((prev) => ({
        ...prev,
        appointments: prev.appointments.map((item) =>
          item.id === appointmentId ? { ...item, status } : item,
        ),
      }));

      return { ok: true };
    },
    [refreshCloud, state.appointments],
  );

  const rescheduleAppointment = useCallback(
    async (appointmentId: string, startsAt: string): Promise<Result> => {
      const current = state.appointments.find((item) => item.id === appointmentId);
      if (!current) return { ok: false, message: "Atendimento não encontrado." };

      const procedure = state.procedures.find(
        (item) => item.id === current.procedureId,
      );
      if (!procedure) {
        return { ok: false, message: "Procedimento do atendimento sumiu." };
      }

      const window = appointmentWindow(startsAt, procedure.durationMinutes);
      if (Number.isNaN(window.start.getTime())) {
        return { ok: false, message: "Informe a nova data e hora." };
      }

      if (isDayBlocked(state.availabilityBlocks, current.professionalId, window.date)) {
        return { ok: false, message: "Esse intervalo não está livre." };
      }

      if (
        findOverlap(
          state.appointments,
          current.professionalId,
          window.start,
          window.end,
          current.id,
        )
      ) {
        return { ok: false, message: "Esse intervalo não está livre." };
      }

      if (isSupabaseConfigured()) {
        const result = await insertReschedule({
          oldId: current.id,
          professionalId: current.professionalId,
          clientId: current.clientId,
          procedureId: current.procedureId,
          startsAt: window.startsAt,
          endsAt: window.endsAt,
          priceCents: current.priceCents,
        });
        if (!result.ok) return result;
        await refreshCloud();
        show({ type: "ok", message: "Horário remarcado." });
        return result;
      }

      const next: Appointment = {
        ...current,
        id: uid("apt"),
        startsAt: window.startsAt,
        endsAt: window.endsAt,
        status: "scheduled",
      };

      setState((prev) => ({
        ...prev,
        appointments: prev.appointments
          .map((item) =>
            item.id === appointmentId
              ? { ...item, status: "rescheduled" as const }
              : item,
          )
          .concat(next),
      }));

      show({ type: "ok", message: "Horário remarcado." });
      return { ok: true, message: "Horário remarcado." };
    },
    [refreshCloud, show, state],
  );

  const deleteAppointment = useCallback(
    async (appointmentId: string): Promise<Result> => {
      const current = state.appointments.find((item) => item.id === appointmentId);
      if (!current) return { ok: false, message: "Atendimento não encontrado." };

      if (isSupabaseConfigured()) {
        const result = await deleteAppointmentRemote(appointmentId);
        if (!result.ok) return result;
        await refreshCloud();
        show({ type: "ok", message: "Horário excluído." });
        return result;
      }

      setState((prev) => ({
        ...prev,
        appointments: prev.appointments.filter((item) => item.id !== appointmentId),
      }));
      show({ type: "ok", message: "Horário excluído." });
      return { ok: true, message: "Horário excluído." };
    },
    [refreshCloud, show, state.appointments],
  );

  const saveProcedure = useCallback(
    async (
      input: Omit<Procedure, "id" | "archived"> & { id?: string },
    ): Promise<Result> => {
      if (!input.name.trim()) {
        return { ok: false, message: "Informe o nome do procedimento." };
      }
      if (input.durationMinutes <= 0 || input.priceCents <= 0) {
        return {
          ok: false,
          message: "Duração e preço precisam ser maiores que zero.",
        };
      }

      const owned = branchesOf(state, input.professionalId);
      if (!owned.includes(input.branch)) {
        return {
          ok: false,
          message: "Este profissional não atua nesse ramo.",
        };
      }

      if (isSupabaseConfigured()) {
        const result = await upsertProcedure({
          id: input.id ?? "",
          professionalId: input.professionalId,
          name: input.name,
          branch: input.branch,
          durationMinutes: input.durationMinutes,
          priceCents: input.priceCents,
        });
        if (!result.ok) return result;
        await refreshCloud();
        show({ type: "ok", message: "Procedimento salvo." });
        return result;
      }

      setState((prev) => {
        if (input.id) {
          return {
            ...prev,
            procedures: prev.procedures.map((item) =>
              item.id === input.id
                ? {
                    ...item,
                    name: input.name.trim(),
                    branch: input.branch,
                    durationMinutes: input.durationMinutes,
                    priceCents: input.priceCents,
                  }
                : item,
            ),
          };
        }

        return {
          ...prev,
          procedures: [
            ...prev.procedures,
            {
              id: uid("proc"),
              professionalId: input.professionalId,
              branch: input.branch,
              name: input.name.trim(),
              durationMinutes: input.durationMinutes,
              priceCents: input.priceCents,
              archived: false,
            },
          ],
        };
      });

      show({ type: "ok", message: "Procedimento salvo." });
      return { ok: true, message: "Procedimento salvo." };
    },
    [refreshCloud, show, state],
  );

  const archiveProcedure = useCallback(
    async (procedureId: string): Promise<Result> => {
      const now = Date.now();
      const blocked = state.appointments.some(
        (item) =>
          item.procedureId === procedureId &&
          new Date(item.startsAt).getTime() > now &&
          (item.status === "scheduled" || item.status === "confirmed"),
      );

      if (isSupabaseConfigured()) {
        const result = await archiveOrDeleteProcedure(procedureId, blocked);
        if (!result.ok) return result;
        await refreshCloud();
        show({ type: "ok", message: result.message ?? "Procedimento atualizado." });
        return result;
      }

      if (blocked) {
        setState((prev) => ({
          ...prev,
          procedures: prev.procedures.map((item) =>
            item.id === procedureId ? { ...item, archived: true } : item,
          ),
        }));
        return {
          ok: true,
          message: "Há horários futuros — procedimento arquivado.",
        };
      }

      setState((prev) => ({
        ...prev,
        procedures: prev.procedures.filter((item) => item.id !== procedureId),
      }));
      return { ok: true, message: "Procedimento removido." };
    },
    [refreshCloud, show, state.appointments],
  );

  const saveAvailabilityRule = useCallback(
    async (input: {
      professionalId: string;
      weekday: number;
      start: string;
      end: string;
      slotMinutes: number;
    }): Promise<Result> => {
      if (input.start >= input.end) {
        return { ok: false, message: "O fim precisa ser depois do início." };
      }

      if (isSupabaseConfigured()) {
        const result = await upsertAvailabilityRule(input);
        if (!result.ok) return result;
        await refreshCloud();
        return result;
      }

      setState((prev) => {
        const existing = prev.availabilityRules.find(
          (item) =>
            item.professionalId === input.professionalId &&
            item.weekday === input.weekday,
        );

        if (existing) {
          return {
            ...prev,
            availabilityRules: prev.availabilityRules.map((item) =>
              item.id === existing.id ? { ...item, ...input } : item,
            ),
          };
        }

        return {
          ...prev,
          availabilityRules: [
            ...prev.availabilityRules,
            { id: uid("rule"), ...input },
          ],
        };
      });

      return { ok: true, message: "Grade atualizada." };
    },
    [refreshCloud],
  );

  const toggleDayBlock = useCallback(
    async (
      professionalId: string,
      date: string,
      reason = "Folga",
    ): Promise<Result> => {
      if (isSupabaseConfigured()) {
        const result = await toggleAvailabilityBlock(
          professionalId,
          date,
          reason,
        );
        if (!result.ok) return result;
        await refreshCloud();
        return result;
      }
      setState((prev) => {
        const existing = prev.availabilityBlocks.find(
          (item) =>
            item.professionalId === professionalId && item.date === date,
        );

        if (existing) {
          return {
            ...prev,
            availabilityBlocks: prev.availabilityBlocks.filter(
              (item) => item.id !== existing.id,
            ),
          };
        }

        return {
          ...prev,
          availabilityBlocks: [
            ...prev.availabilityBlocks,
            { id: uid("block"), professionalId, date, reason },
          ],
        };
      });

      return { ok: true };
    },
    [refreshCloud],
  );

  const createProfessional = useCallback(
    async (input: {
      name: string;
      email: string;
      phone: string;
      cpf: string;
      password: string;
      branches: Branch[];
      isAdmin?: boolean;
    }): Promise<Result> => {
      if (!input.name.trim() || !input.email.trim()) {
        return { ok: false, message: "Nome e e-mail são obrigatórios." };
      }
      if (input.branches.length === 0) {
        return { ok: false, message: "Escolha ao menos um ramo." };
      }

      const cpf = onlyDigits(input.cpf);
      if (cpf.length !== 11) {
        return { ok: false, message: "CPF precisa ter 11 dígitos." };
      }

      if (isSupabaseConfigured()) {
        const result = await createProfessionalRemote(input);
        if (!result.ok) return result;
        await refreshCloud();
        show({ type: "ok", message: result.message ?? "Profissional criado." });
        return result;
      }

      if (
        state.profiles.some(
          (profile) => profile.email.toLowerCase() === input.email.toLowerCase(),
        )
      ) {
        return { ok: false, message: "Este e-mail já está em uso." };
      }

      if (state.profiles.some((profile) => onlyDigits(profile.cpf) === cpf)) {
        return { ok: false, message: "Este CPF já está em uso." };
      }

      const id = uid("pro");
      const profile: Profile = {
        id,
        name: input.name.trim(),
        email: input.email.trim().toLowerCase(),
        phone: onlyDigits(input.phone),
        cpf,
        role: "professional",
        isAdmin: Boolean(input.isAdmin),
        password: input.password || "artspace123",
      };

      setState((prev) => ({
        ...prev,
        profiles: [...prev.profiles, profile],
        branches: [
          ...prev.branches,
          ...input.branches.map((branch) => ({
            professionalId: id,
            branch,
          })),
        ],
        availabilityRules: [
          ...prev.availabilityRules,
          ...[1, 2, 3, 4, 5, 6].map((weekday) => ({
            id: uid("rule"),
            professionalId: id,
            weekday,
            start: "09:00",
            end: "19:00",
            slotMinutes: 30,
          })),
        ],
        procedures: [
          ...prev.procedures,
          ...proceduresForBranches(input.branches).map((item) => ({
            id: uid("proc"),
            professionalId: id,
            branch: item.branch,
            name: item.name,
            durationMinutes: item.durationMinutes,
            priceCents: item.priceCents,
            archived: false,
          })),
        ],
      }));

      show({ type: "ok", message: "Profissional criado." });
      return { ok: true, message: "Profissional criado." };
    },
    [refreshCloud, show, state.profiles],
  );

  const value = useMemo<StudioContextValue>(
    () => ({
      ready,
      state,
      session,
      accountKind,
      flash,
      clearFlash,
      login,
      logout,
      branchesOf: (professionalId) => branchesOf(state, professionalId),
      upsertClient,
      createAppointment,
      setAppointmentStatus,
      rescheduleAppointment,
      deleteAppointment,
      saveProcedure,
      archiveProcedure,
      saveAvailabilityRule,
      toggleDayBlock,
      createProfessional,
    }),
    [
      archiveProcedure,
      accountKind,
      clearFlash,
      createAppointment,
      createProfessional,
      deleteAppointment,
      flash,
      login,
      logout,
      ready,
      rescheduleAppointment,
      saveAvailabilityRule,
      saveProcedure,
      session,
      setAppointmentStatus,
      state,
      toggleDayBlock,
      upsertClient,
    ],
  );

  return (
    <StudioContext.Provider value={value}>{children}</StudioContext.Provider>
  );
}

export function useStudio() {
  const context = useContext(StudioContext);
  if (!context) {
    throw new Error("useStudio precisa estar dentro de StudioProvider");
  }
  return context;
}

export function useFlashReporter() {
  const { flash, clearFlash } = useStudio();
  return { flash, clearFlash };
}
