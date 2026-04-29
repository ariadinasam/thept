import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, MapPin, Zap, Shield, Sparkles, Loader2, Navigation } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { LocationCard, type ParkingItem } from "@/components/LocationCard";
import { ParkingMap } from "@/components/ParkingMap";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { geocodeCep, geocodeText, isCep, type GeocodeResult, gpsLinks } from "@/lib/geocode";
import { availabilityStatus } from "@/lib/categories";
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

// Haversine — km between two coords
function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

interface SearchHit extends GeocodeResult {
  nearby: Array<ParkingItem & { distanceKm: number }>;
}

function HomePage() {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<ParkingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [searchHit, setSearchHit] = useState<SearchHit | null>(null);
  const [center, setCenter] = useState<[number, number] | undefined>();
  const nav = useNavigate();

  useEffect(() => {
    supabase.from("parking_locations").select("*").order("available_spots", { ascending: false }).then(({ data }) => {
      setItems((data ?? []) as ParkingItem[]);
      setLoading(false);
    });
  }, []);

  const localFiltered = useMemo(() => {
    if (!query.trim() || searchHit) return items;
    const q = query.toLowerCase();
    return items.filter((i) => i.name.toLowerCase().includes(q) || i.address.toLowerCase().includes(q));
  }, [items, query, searchHit]);

  const findNearby = (lat: number, lng: number) => {
    return items
      .map((i) => ({ ...i, distanceKm: distanceKm({ lat, lng }, { lat: Number(i.latitude), lng: Number(i.longitude) }) }))
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 6);
  };

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const q = query.trim();
    if (!q) { setSearchHit(null); return; }
    setSearching(true);
    try {
      let result: GeocodeResult | null = null;
      if (isCep(q)) {
        result = await geocodeCep(q);
        if (!result) { toast.error("CEP não encontrado"); return; }
      } else {
        const results = await geocodeText(q);
        if (results.length === 0) { toast.info("Nada encontrado"); return; }
        result = results[0];
      }
      const nearby = findNearby(result.latitude, result.longitude);
      setSearchHit({ ...result, nearby });
      setCenter([result.longitude, result.latitude]);
      toast.success("Endereço localizado");
    } catch {
      toast.error("Falha ao buscar endereço");
    } finally {
      setSearching(false);
    }
  };

  const clearSearch = () => { setSearchHit(null); setQuery(""); setCenter(undefined); };

  const displayList = searchHit ? searchHit.nearby : localFiltered;
  const markers = displayList.map((i) => ({
    id: i.id, lat: Number(i.latitude), lng: Number(i.longitude),
    name: i.name, available: i.available_spots, price: i.price_per_hour,
  }));

  const searchPin = searchHit
    ? { lat: searchHit.latitude, lng: searchHit.longitude, label: searchHit.name }
    : undefined;

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
              {searchHit && (
                <button type="button" onClick={clearSearch} className="rounded-full border border-destructive/40 bg-destructive/10 px-3 py-1 text-destructive">
                  Limpar busca ✕
                </button>
              )}
            </div>
          </form>
        </div>
      </section>

      {/* Map first, then results below */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="font-display text-2xl font-bold">
            {searchHit ? "Sugestões perto do seu destino" : "Mapa de vagas"}
          </h2>
          <Link to="/saved" className="text-xs text-primary hover:underline">Meus salvos →</Link>
        </div>

        <ParkingMap
          markers={markers}
          center={center}
          searchPin={searchPin}
          className="h-[420px] w-full sm:h-[520px]"
          onMarkerClick={(id) => nav({ to: "/location/$id", params: { id } })}
        />

        {/* Searched address card — clickable, opens detailed search result */}
        {searchHit && (
          <Link
            to="/search"
            search={{
              q: query,
              lat: searchHit.latitude,
              lng: searchHit.longitude,
              name: searchHit.name,
              address: searchHit.address,
            }}
            className="group mt-6 block"
          >
            <Card className="border-primary/30 bg-primary/5 p-5 transition-all hover:border-primary/60 hover:shadow-glow">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <MapPin className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs uppercase tracking-wide text-primary">Endereço buscado · toque para ver vagas</div>
                  <div className="font-display text-base font-semibold">{searchHit.name}</div>
                  <div className="truncate text-xs text-muted-foreground">{searchHit.address}</div>
                </div>
                <Navigation className="h-5 w-5 text-primary transition-transform group-hover:translate-x-1" />
              </div>
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {searchHit.nearby.length > 0
                    ? `${searchHit.nearby.length} estacionamentos próximos`
                    : "Sem parceiros próximos cadastrados"}
                </span>
                <span className="font-semibold text-primary">Ver vagas e reservar →</span>
              </div>
            </Card>
          </Link>
        )}

        {/* Partners list (below the map) */}
        <div className="mt-8">
          <div className="mb-4 flex items-baseline justify-between">
            <h3 className="font-display text-xl font-bold">
              {searchHit
                ? `${displayList.length} ${displayList.length === 1 ? "estacionamento próximo" : "estacionamentos próximos"}`
                : `${displayList.length} ${displayList.length === 1 ? "local parceiro" : "locais parceiros"}`}
            </h3>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-32 animate-pulse rounded-2xl bg-surface" />
              ))
            ) : displayList.length === 0 ? (
              <div className="md:col-span-2 rounded-2xl border border-border/60 bg-surface p-8 text-center text-sm text-muted-foreground">
                Nenhum parceiro encontrado.
              </div>
            ) : (
              displayList.map((it) => {
                const distance = "distanceKm" in it ? (it as ParkingItem & { distanceKm: number }).distanceKm : null;
                const status = availabilityStatus(it.available_spots, it.total_spots);
                return (
                  <div key={it.id} className="relative">
                    <LocationCard item={it} />
                    {distance != null && (
                      <Badge variant="outline" className="absolute right-3 top-3 border-primary/30 bg-background/90 text-xs">
                        {distance < 1 ? `${Math.round(distance * 1000)} m` : `${distance.toFixed(1)} km`} · {status.label}
                      </Badge>
                    )}
                  </div>
                );
              })
            )}
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
