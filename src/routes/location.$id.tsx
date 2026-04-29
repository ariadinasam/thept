import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ParkingMap } from "@/components/ParkingMap";
import { gpsLinks } from "@/lib/geocode";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { availabilityStatus, getCategory } from "@/lib/categories";
import { toast } from "sonner";
import { ArrowLeft, MapPin, Navigation, Star, Heart, Clock, Accessibility } from "lucide-react";

export const Route = createFileRoute("/location/$id")({
  component: LocationDetail,
});

interface Loc {
  id: string; name: string; address: string; latitude: number; longitude: number;
  category: string; available_spots: number; total_spots: number; price_per_hour: number;
  has_special_spots: boolean; rating: number | null;
}

function LocationDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [loc, setLoc] = useState<Loc | null>(null);
  const [saved, setSaved] = useState(false);
  const [hours, setHours] = useState("1");
  const [reserveOpen, setReserveOpen] = useState(false);

  useEffect(() => {
    supabase.from("parking_locations").select("*").eq("id", id).maybeSingle().then(({ data }) => setLoc(data as Loc | null));
    if (user) {
      supabase.from("saved_locations").select("id").eq("user_id", user.id).eq("location_id", id).maybeSingle()
        .then(({ data }) => setSaved(!!data));
    }
  }, [id, user]);

  const toggleSave = async () => {
    if (!user) return nav({ to: "/auth" });
    if (saved) {
      await supabase.from("saved_locations").delete().eq("user_id", user.id).eq("location_id", id);
      setSaved(false);
      toast.success("Removido dos favoritos");
    } else {
      await supabase.from("saved_locations").insert({ user_id: user.id, location_id: id });
      setSaved(true);
      toast.success("Salvo nos favoritos!");
    }
  };

  const reserve = async () => {
    if (!user || !loc) return nav({ to: "/auth" });
    const h = Number(hours) || 1;
    const total = h * loc.price_per_hour;
    const { error } = await supabase.from("reservations").insert({
      user_id: user.id, location_id: loc.id,
      start_time: new Date().toISOString(),
      duration_hours: h, total_price: total, status: "confirmed",
    });
    if (error) return toast.error(error.message);
    toast.success(`Vaga reservada! R$ ${total.toFixed(2)}`);
    setReserveOpen(false);
    nav({ to: "/wallet" });
  };

  if (!loc) {
    return (
      <div className="min-h-screen bg-background"><Header /><div className="mx-auto max-w-5xl p-8"><div className="h-96 animate-pulse rounded-2xl bg-surface" /></div></div>
    );
  }

  const cat = getCategory(loc.category);
  const Icon = cat.icon;
  const status = availabilityStatus(loc.available_spots, loc.total_spots);
  const isFull = loc.available_spots === 0;
  const links = gpsLinks(Number(loc.latitude), Number(loc.longitude), loc.name);
  const openGps = (url: string) => window.open(url, "_blank", "noopener,noreferrer");

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <Link to="/" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>

        <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <div>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <Badge variant="outline" className="mb-2 border-border/60 text-xs">{cat.label}</Badge>
                  <h1 className="font-display text-3xl font-bold leading-tight sm:text-4xl">{loc.name}</h1>
                  <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" /> {loc.address}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={toggleSave}>
                <Heart className={`h-5 w-5 ${saved ? "fill-destructive text-destructive" : ""}`} />
              </Button>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3">
              <Card className="border-border/60 bg-gradient-card p-4">
                <div className="text-xs text-muted-foreground">Vagas</div>
                <div className="mt-1 font-display text-2xl font-bold">{loc.available_spots}<span className="text-sm font-normal text-muted-foreground">/{loc.total_spots}</span></div>
              </Card>
              <Card className="border-border/60 bg-gradient-card p-4">
                <div className="text-xs text-muted-foreground">Preço/hora</div>
                <div className="mt-1 font-display text-2xl font-bold text-primary">R${loc.price_per_hour}</div>
              </Card>
              <Card className="border-border/60 bg-gradient-card p-4">
                <div className="text-xs text-muted-foreground">Avaliação</div>
                <div className="mt-1 flex items-center gap-1 font-display text-2xl font-bold">
                  <Star className="h-5 w-5 fill-warning text-warning" />{loc.rating ?? "-"}
                </div>
              </Card>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-2">
              <Badge className={`border ${status.tone === "destructive" ? "bg-destructive/15 text-destructive border-destructive/30" : status.tone === "warning" ? "bg-warning/15 text-warning border-warning/30" : "bg-primary/15 text-primary border-primary/30"}`}>
                <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse mr-1" />
                {status.label}
              </Badge>
              {loc.has_special_spots && (
                <Badge variant="outline" className="border-border/60"><Accessibility className="h-3 w-3" /> Vagas PCD</Badge>
              )}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Dialog open={reserveOpen} onOpenChange={setReserveOpen}>
                <DialogTrigger asChild>
                  <Button disabled={isFull} className="flex-1 bg-gradient-primary text-primary-foreground hover:opacity-90 disabled:opacity-50" size="lg">
                    <Clock className="h-4 w-4" /> {isFull ? "Sem vagas" : "Reservar vaga"}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Reservar em {loc.name}</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Duração (horas)</Label>
                      <Input type="number" min="1" max="24" value={hours} onChange={(e) => setHours(e.target.value)} />
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-border/60 bg-surface p-4">
                      <span className="text-sm text-muted-foreground">Total</span>
                      <span className="font-display text-2xl font-bold text-primary">
                        R$ {((Number(hours) || 0) * loc.price_per_hour).toFixed(2)}
                      </span>
                    </div>
                    <Button onClick={reserve} className="w-full bg-gradient-primary text-primary-foreground" size="lg">
                      Confirmar reserva
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Button type="button" variant="outline" className="sm:flex-1" size="lg" onClick={() => openGps(links.waze)}>
                <Navigation className="h-4 w-4" /> Waze
              </Button>
              <Button type="button" variant="outline" className="sm:flex-1" size="lg" onClick={() => openGps(links.gmapsSearch)}>
                <MapPin className="h-4 w-4" /> Google Maps
              </Button>
            </div>
          </div>

          <ParkingMap
            markers={[{ id: loc.id, lat: Number(loc.latitude), lng: Number(loc.longitude), name: loc.name, available: loc.available_spots, price: loc.price_per_hour }]}
            center={[Number(loc.longitude), Number(loc.latitude)]}
            className="h-80 w-full lg:h-full"
          />
        </div>
      </section>
      <Footer />
    </div>
  );
}
