"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { revenueByMonth } from "@/features/studio/rules";
import { useStudio } from "@/features/studio/store";
import { formatBRL } from "@/shared/lib/format";
import { getSupabase } from "@/shared/lib/supabase/client";

export function FinanceChart() {
  const { state } = useStudio();
  const [spentCents, setSpentCents] = useState(0);
  const data = revenueByMonth(state.appointments, 6).map((item) => ({
    ...item,
    value: item.cents / 100,
  }));
  const total = data.reduce((sum, item) => sum + item.cents, 0);
  const monthKey = data.map((item) => item.key).join(",");

  useEffect(() => {
    const months = new Set(monthKey.split(",").filter(Boolean));
    void getSupabase()
      .from("expenses")
      .select("amount_cents, spent_on")
      .then(({ data: rows }: { data: Array<{ amount_cents: number; spent_on: string }> | null }) => {
        const spent = (rows ?? []).reduce((sum: number, row: { amount_cents: number; spent_on: string }) => {
          const key = String(row.spent_on).slice(0, 7);
          return months.has(key) ? sum + Number(row.amount_cents) : sum;
        }, 0);
        setSpentCents(spent);
      });
  }, [monthKey]);

  return (
    <section className="grid gap-6">
      <div>
        <p className="text-xs tracking-[0.25em] text-gold">ADMIN</p>
        <h1 className="font-serif text-3xl tracking-wide">Financeiro</h1>
        <p className="mt-2 text-sm text-muted">
          Soma dos atendimentos com status presente, de todos os profissionais. Gastos lançados no app entram no lucro.
        </p>
      </div>

      <div className="rounded-3xl border border-line bg-ink-soft p-5">
        <p className="text-sm text-muted">Faturamento no recorte</p>
        <p className="mt-1 font-serif text-4xl text-gold-bright">{formatBRL(total)}</p>
        <p className="mt-3 text-sm text-muted">Gastos {formatBRL(spentCents)}</p>
        <p className="text-sm text-cream">Lucro {formatBRL(total - spentCents)}</p>
        <div className="mt-8 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid stroke="#2a2318" vertical={false} />
              <XAxis dataKey="label" stroke="#9a8f7a" fontSize={12} />
              <YAxis stroke="#9a8f7a" fontSize={12} />
              <Tooltip
                cursor={{ fill: "#1c1814" }}
                contentStyle={{
                  background: "#14110e",
                  border: "1px solid #2a2318",
                  borderRadius: 12,
                  color: "#f4ede0",
                }}
                formatter={(value) => [
                  formatBRL(Number(value ?? 0) * 100),
                  "Presente",
                ]}
              />
              <Bar dataKey="value" fill="#c4a35a" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        {total === 0 && (
          <p className="mt-4 text-sm text-muted">
            Mês sem movimento aparece como zero. Marque um atendimento como
            presente para ver o gráfico subir.
          </p>
        )}
      </div>
    </section>
  );
}
