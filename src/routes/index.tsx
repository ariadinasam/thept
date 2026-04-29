import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, MapPin, Zap, Shield, Sparkles } from "lucide-react";
import { Header } from "@/components/Header";
import { LocationCard, type ParkingItem } from "@/components/LocationCard";
import { ParkingMap } from "@/components/ParkingMap";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "THEPT — Encontre vagas perto de você" },
      { name: "description", content: "Busque por endereço e descubra estacionamentos disponíveis em tempo real." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<ParkingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const nav = useNavigate();

  useEffect(() => {
    supabase.from("parking_locations").select("*").order("available_spots", { ascending: false }).then(({ data }) => {
      setItems((data ?? []) as ParkingItem[]);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter((i) => i.name.toLowerCase().includes(q) || i.address.toLowerCase().includes(q));
  }, [items, query]);

  const markers = filtered.map((i) => ({
    id: i.id, lat: Number(i.latitude), lng: Number(i.longitude),
    name: i.name, available: i.available_spots, price: i.price_per_hour,
  }));

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="bg-hero relative overflow-hidden">
        <div className="mx-auto max-w-5xl px-4 py-20 text-center sm:px-6 sm:py-28">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Vagas em tempo real
          </div>
          <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight sm:text-7xl">
            Tem vaga <span className="text-gradient">lá</span>?
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
            Digite o endereço e descubra na hora se há estacionamento disponível. Reserve, pague e siga.
          </p>

          <div className="mx-auto mt-10 max-w-2xl">
            <div className="flex items-center gap-2 rounded-2xl border border-border/60 bg-surface-elevated p-2 shadow-elegant">
              <div className="flex flex-1 items-center gap-2 px-3">
                <Search className="h-5 w-5 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Para onde você vai? Ex: Av. Paulista"
                  className="border-0 bg-transparent text-base focus-visible:ring-0"
                />
              </div>
              <Button className="bg-gradient-primary text-primary-foreground hover:opacity-90">
                Buscar
              </Button>
            </div>
            <div className="mt-3 flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
              {["Av. Paulista", "Shopping Iguatemi", "Hospital", "Restaurantes"].map((s) => (
                <button key={s} onClick={() => setQuery(s)} className="rounded-full border border-border/60 bg-surface px-3 py-1 transition-colors hover:border-primary/40 hover:text-primary">
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Map + Results */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="font-display text-2xl font-bold">
                {filtered.length} {filtered.length === 1 ? "local" : "locais"}
              </h2>
              <span className="text-xs text-muted-foreground">Atualizado agora</span>
            </div>
            <div className="space-y-3">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-32 animate-pulse rounded-2xl bg-surface" />
                ))
              ) : filtered.length === 0 ? (
                <div className="rounded-2xl border border-border/60 bg-surface p-8 text-center text-sm text-muted-foreground">
                  Nenhum local encontrado para "{query}"
                </div>
              ) : (
                filtered.map((it) => <LocationCard key={it.id} item={it} />)
              )}
            </div>
          </div>

          <div className="lg:sticky lg:top-20 lg:self-start">
            <ParkingMap markers={markers} className="h-[420px] w-full lg:h-[640px]" onMarkerClick={(id) => nav({ to: "/location/$id", params: { id } })} />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { icon: Zap, title: "Tempo real", desc: "Disponibilidade atualizada constantemente." },
            { icon: MapPin, title: "Navegação integrada", desc: "Abra no Waze ou Google Maps em um toque." },
            { icon: Shield, title: "Vagas especiais", desc: "Cadastre permissões PCD, idoso e gestante." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-2xl border border-border/60 bg-gradient-card p-6 shadow-card">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-display text-lg font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
