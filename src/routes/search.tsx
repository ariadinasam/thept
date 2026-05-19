import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { ArrowLeft, MapPin, Navigation, Clock, Sparkles } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ParkingMap } from "@/components/ParkingMap";
import { LocationCard, type ParkingItem } from "@/components/LocationCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { gpsLinks } from "@/lib/geocode";
import { useAuth } from "@/hooks/useAuth";
import { availabilityStatus } from "@/lib/categories";
import { toast } from "sonner";

const searchSchema = z.object({
  q: z.string().optional(),
  lat: z.coerce.number(),
  lng: z.coerce.number(),
  name: z.string().optional(),
  address: z.string().optional(),
});

export const Route = createFileRoute("/search")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Resultado da busca — THEPT" },
      { name: "description", content: "Veja vagas disponíveis perto do endereço buscado e reserve em segundos." },
    ],
  }),
  component: SearchResult,
});

function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

function SearchResult() {
  const { lat, lng, name, address } = Route.useSearch();
  const { user } = useAuth();
  const nav = useNavigate();
  const [items, setItems] = useState<ParkingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [reserveOpen, setReserveOpen] = useState(false);
  const [hours, setHours] = useState("1");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("parking_locations").select("*").then(({ data }) => {
      setItems((data ?? []) as ParkingItem[]);
      setLoading(false);
    });
  }, []);

  const nearby = useMemo(() => {
    return items
      .map((i) => ({ ...i, distanceKm: distanceKm({ lat, lng }, { lat: Number(i.latitude), lng: Number(i.longitude) }) }))
      .filter((i) => i.distanceKm <= 15)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 8);
  }, [items, lat, lng]);

  const closestAvailable = useMemo(() => nearby.find((n) => n.available_spots > 0) ?? nearby[0], [nearby]);
  const selected = useMemo(
    () => nearby.find((n) => n.id === selectedId) ?? closestAvailable,
    [nearby, selectedId, closestAvailable],
  );

  const markers = nearby.map((i) => ({
    id: i.id, lat: Number(i.latitude), lng: Number(i.longitude),
    name: i.name, available: i.available_spots, price: i.price_per_hour,
  }));

  const links = gpsLinks(lat, lng, name);
  const openGps = (url: string) => window.open(url, "_blank", "noopener,noreferrer");

  const reserve = async () => {
    if (!user) return nav({ to: "/auth" });
    if (!selected) return;
    const h = Number(hours) || 1;
    try {
      const res = await reserveAndDebit({
        data: { locationId: selected.id, durationHours: h },
      });
      toast.success(`Vaga reservada em ${selected.name}! R$ ${res.total.toFixed(2)} debitado.`);
      setReserveOpen(false);
      nav({ to: "/wallet" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao reservar");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Link to="/" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Nova busca
        </Link>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <Badge variant="outline" className="mb-2 border-primary/30 text-primary text-xs">
              <Sparkles className="h-3 w-3" /> Endereço buscado
            </Badge>
            <h1 className="font-display text-3xl font-bold leading-tight sm:text-4xl">{name || "Endereço"}</h1>
            <p className="mt-1 flex items-start gap-1 text-sm text-muted-foreground">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" /> {address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`}
            </p>

            {selected ? (
              <Card className="mt-6 border-primary/30 bg-gradient-card p-5 shadow-card">
                <div className="text-xs uppercase tracking-wide text-primary">Estacionamento mais próximo</div>
                <div className="mt-1 font-display text-xl font-bold">{selected.name}</div>
                <p className="text-xs text-muted-foreground">{selected.address}</p>
                <div className="mt-3 grid grid-cols-3 gap-3">
                  <div>
                    <div className="text-xs text-muted-foreground">Vagas</div>
                    <div className="font-display text-lg font-bold">{selected.available_spots}/{selected.total_spots}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Preço/h</div>
                    <div className="font-display text-lg font-bold text-primary">R${selected.price_per_hour}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Distância</div>
                    <div className="font-display text-lg font-bold">
                      {("distanceKm" in selected) && (selected as any).distanceKm < 1
                        ? `${Math.round((selected as any).distanceKm * 1000)} m`
                        : `${(selected as any).distanceKm?.toFixed(1)} km`}
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <Badge className={`border ${
                    availabilityStatus(selected.available_spots, selected.total_spots).tone === "destructive"
                      ? "bg-destructive/15 text-destructive border-destructive/30"
                      : availabilityStatus(selected.available_spots, selected.total_spots).tone === "warning"
                        ? "bg-warning/15 text-warning border-warning/30"
                        : "bg-primary/15 text-primary border-primary/30"
                  }`}>
                    {availabilityStatus(selected.available_spots, selected.total_spots).label}
                  </Badge>
                </div>
              </Card>
            ) : (
              <Card className="mt-6 border-border/60 bg-surface p-5 text-sm text-muted-foreground">
                {loading ? "Buscando estacionamentos…" : "Nenhum estacionamento parceiro próximo encontrado."}
              </Card>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Dialog open={reserveOpen} onOpenChange={setReserveOpen}>
                <DialogTrigger asChild>
                  <Button
                    size="lg"
                    disabled={!selected || selected.available_spots === 0}
                    className="flex-1 bg-gradient-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
                  >
                    <Clock className="h-4 w-4" />
                    {!selected ? "Sem vagas" : selected.available_spots === 0 ? "Sem vagas" : "Reservar vaga"}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Reservar em {selected?.name}</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Duração (horas)</Label>
                      <Input type="number" min="1" max="24" value={hours} onChange={(e) => setHours(e.target.value)} />
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-border/60 bg-surface p-4">
                      <span className="text-sm text-muted-foreground">Total</span>
                      <span className="font-display text-2xl font-bold text-primary">
                        R$ {((Number(hours) || 0) * (selected?.price_per_hour ?? 0)).toFixed(2)}
                      </span>
                    </div>
                    <Button onClick={reserve} className="w-full bg-gradient-primary text-primary-foreground" size="lg">
                      Confirmar reserva
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Button variant="outline" size="lg" className="sm:flex-1" onClick={() => openGps(links.waze)}>
                <Navigation className="h-4 w-4" /> Waze
              </Button>
              <Button variant="outline" size="lg" className="sm:flex-1" onClick={() => openGps(links.gmapsSearch)}>
                <MapPin className="h-4 w-4" /> Google Maps
              </Button>
            </div>
          </div>

          <ParkingMap
            markers={markers}
            center={[lng, lat]}
            searchPin={{ lat, lng, label: name }}
            className="h-96 w-full lg:h-full"
            onMarkerClick={(id) => setSelectedId(id)}
          />
        </div>

        <div className="mt-10">
          <h2 className="mb-4 font-display text-2xl font-bold">Estacionamentos próximos</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-32 animate-pulse rounded-2xl bg-surface" />)
            ) : nearby.length === 0 ? (
              <div className="md:col-span-2 rounded-2xl border border-border/60 bg-surface p-8 text-center text-sm text-muted-foreground">
                Nenhum parceiro encontrado nesta região.
              </div>
            ) : (
              nearby.map((it) => {
                const d = (it as any).distanceKm as number;
                const status = availabilityStatus(it.available_spots, it.total_spots);
                return (
                  <div key={it.id} className="relative">
                    <LocationCard item={it} />
                    <Badge variant="outline" className="absolute right-3 top-3 border-primary/30 bg-background/90 text-xs">
                      {d < 1 ? `${Math.round(d * 1000)} m` : `${d.toFixed(1)} km`} · {status.label}
                    </Badge>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
