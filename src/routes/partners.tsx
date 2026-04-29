import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { LocationCard, type ParkingItem } from "@/components/LocationCard";
import { CATEGORIES } from "@/lib/categories";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/partners")({
  head: () => ({
    meta: [
      { title: "Parceiros — THEPT" },
      { name: "description", content: "Restaurantes, clínicas, shoppings e entretenimento parceiros com vagas garantidas." },
    ],
  }),
  component: PartnersPage,
});

const TABS = [
  { key: "all", label: "Todos" },
  { key: "restaurant", label: "Restaurantes" },
  { key: "clinic", label: "Clínicas" },
  { key: "hospital", label: "Hospitais" },
  { key: "shopping", label: "Shoppings" },
  { key: "entertainment", label: "Entretenimento" },
];

function PartnersPage() {
  const [items, setItems] = useState<ParkingItem[]>([]);
  const [tab, setTab] = useState("all");

  useEffect(() => {
    supabase.from("parking_locations").select("*").order("rating", { ascending: false }).then(({ data }) => {
      setItems((data ?? []) as ParkingItem[]);
    });
  }, []);

  const filtered = tab === "all" ? items : items.filter((i) => i.category === tab);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
          Locais <span className="text-gradient">parceiros</span>
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Restaurantes, clínicas, shoppings e mais — todos com vagas vinculadas e reserva direto pelo app.
        </p>

        <div className="mt-8 flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "rounded-full border px-4 py-2 text-sm transition-all",
                tab === t.key
                  ? "border-primary bg-primary text-primary-foreground shadow-glow"
                  : "border-border/60 bg-surface text-muted-foreground hover:border-primary/40 hover:text-foreground"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {filtered.map((it) => <LocationCard key={it.id} item={it} />)}
        </div>
      </section>
    </div>
  );
}
