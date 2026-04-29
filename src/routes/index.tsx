import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, MapPin, Zap, Shield, Sparkles, Loader2 } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { LocationCard, type ParkingItem } from "@/components/LocationCard";
import { ParkingMap } from "@/components/ParkingMap";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { geocodeCep, geocodeText, isCep, type GeocodeResult, gpsLinks } from "@/lib/geocode";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "THEPT — Encontre vagas perto de você" },
      { name: "description", content: "Busque por endereço ou CEP e descubra estacionamentos disponíveis em tempo real." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<ParkingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [geoResults, setGeoResults] = useState<GeocodeResult[]>([]);
  const [center, setCenter] = useState<[number, number] | undefined>();
  const nav = useNavigate();

  useEffect(() => {
    supabase.from("parking_locations").select("*").order("available_spots", { ascending: false }).then(({ data }) => {
      setItems((data ?? []) as ParkingItem[]);
      setLoading(false);
    });
  }, []);

  const localFiltered = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter((i) => i.name.toLowerCase().includes(q) || i.address.toLowerCase().includes(q));
  }, [items, query]);

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setGeoResults([]);
    try {
      if (isCep(q)) {
        const r = await geocodeCep(q);
        if (!r) { toast.error("CEP não encontrado"); return; }
        setGeoResults([r]);
        setCenter([r.longitude, r.latitude]);
        toast.success("Endereço localizado");
      } else {
        const results = await geocodeText(q);
        if (results.length === 0) { toast.info("Nada encontrado para esta busca"); return; }
        setGeoResults(results);
        setCenter([results[0].longitude, results[0].latitude]);
      }
    } catch {
      toast.error("Falha ao buscar endereço");
    } finally {
      setSearching(false);
    }
  };

  const markers = localFiltered.map((i) => ({
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
            Digite o endereço, CEP ou nome do local. Reserve, pague e siga.
          </p>

          <form onSubmit={handleSearch} className="mx-auto mt-10 max-w-2xl">
            <div className="flex items-center gap-2 rounded-2xl border border-border/60 bg-surface-elevated p-2 shadow-elegant">
              <div className="flex flex-1 items-center gap-2 px-3">
                <Search className="h-5 w-5 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Endereço, CEP (01310-100) ou nome do lugar"
                  className="border-0 bg-transparent text-base focus-visible:ring-0"
                />
              </div>
              <Button type="submit" disabled={searching} className="bg-gradient-primary text-primary-foreground hover:opacity-90">
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buscar"}
              </Button>
            </div>
            <div className="mt-3 flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
              {["01310-100", "Av. Paulista", "Shopping Iguatemi", "Hospital"].map((s) => (
                <button type="button" key={s} onClick={() => setQuery(s)} className="rounded-full border border-border/60 bg-surface px-3 py-1 transition-colors hover:border-primary/40 hover:text-primary">
                  {s}
                </button>
              ))}
            </div>
          </form>
        </div>
      </section>

      {/* Geocoded results */}
      {geoResults.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
          <h2 className="font-display text-xl font-bold">Resultados da busca</h2>
          <p className="mt-1 text-sm text-muted-foreground">Endereços encontrados — abra no GPS.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {geoResults.map((r, i) => {
              const links = gpsLinks(r.latitude, r.longitude, r.name);
              return (
                <Card key={i} className="border-border/60 bg-gradient-card p-4">
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <div className="min-w-0">
                      <div className="font-medium">{r.name}</div>
                      <div className="text-xs text-muted-foreground">{r.address}</div>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button asChild size="sm" variant="outline" className="flex-1">
                      <a href={links.waze} target="_blank" rel="noopener noreferrer">Waze</a>
                    </Button>
                    <Button asChild size="sm" variant="outline" className="flex-1">
                      <a href={links.gmapsSearch} target="_blank" rel="noopener noreferrer">Google Maps</a>
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* Map + Results */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="font-display text-2xl font-bold">
                {localFiltered.length} {localFiltered.length === 1 ? "local parceiro" : "locais parceiros"}
              </h2>
              <Link to="/saved" className="text-xs text-primary hover:underline">Meus salvos →</Link>
            </div>
            <div className="space-y-3">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-32 animate-pulse rounded-2xl bg-surface" />
                ))
              ) : localFiltered.length === 0 ? (
                <div className="rounded-2xl border border-border/60 bg-surface p-8 text-center text-sm text-muted-foreground">
                  Nenhum parceiro encontrado para "{query}".<br />
                  Use a busca acima para localizar qualquer endereço pelo GPS.
                </div>
              ) : (
                localFiltered.map((it) => <LocationCard key={it.id} item={it} />)
              )}
            </div>
          </div>

          <div className="lg:sticky lg:top-20 lg:self-start">
            <ParkingMap markers={markers} center={center} className="h-[420px] w-full lg:h-[640px]" onMarkerClick={(id) => nav({ to: "/location/$id", params: { id } })} />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6">
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

      <Footer />
    </div>
  );
}
