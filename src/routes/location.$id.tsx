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
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { reserveAndDebit } from "@/lib/wallet.functions";
import { availabilityStatus, getCategory } from "@/lib/categories";
import { toast } from "sonner";
import { ArrowLeft, MapPin, Navigation, Star, Heart, Clock, Accessibility, Wallet, AlertCircle } from "lucide-react";

const SPECIAL_OPTIONS = [
  { key: "pcd", label: "PCD" },
  { key: "elderly", label: "Idoso" },
  { key: "pregnant", label: "Gestante" },
];

export const Route = createFileRoute("/location/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Estacionamento ${params.id} — Reserve no THEPT` },
      { name: "description", content: "Veja disponibilidade, preço por hora e reserve sua vaga neste estacionamento em Fortaleza-CE." },
      { property: "og:title", content: "Reserve sua vaga — THEPT" },
      { property: "og:description", content: "Disponibilidade em tempo real e reserva direta pelo app." },
    ],
  }),
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
  const [balance, setBalance] = useState<number>(0);
  const [specialDocs, setSpecialDocs] = useState<Record<string, string>>({});
  const [selectedSpecial, setSelectedSpecial] = useState<string[]>([]);
  const [reserving, setReserving] = useState(false);

  useEffect(() => {
    supabase.from("parking_locations").select("*").eq("id", id).maybeSingle().then(({ data }) => setLoc(data as Loc | null));
    if (user) {
      supabase.from("saved_locations").select("id").eq("user_id", user.id).eq("location_id", id).maybeSingle()
        .then(({ data }) => setSaved(!!data));
      supabase.from("wallets").select("balance").eq("user_id", user.id).maybeSingle()
        .then(({ data }) => { if (data) setBalance(Number(data.balance)); });
      supabase.from("profiles").select("permission_documents").eq("id", user.id).maybeSingle()
        .then(({ data }) => setSpecialDocs(((data?.permission_documents ?? {}) as Record<string, string>)));
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

  const toggleSpecial = (k: string) => {
    setSelectedSpecial((s) => s.includes(k) ? s.filter((x) => x !== k) : [...s, k]);
  };

  const reserve = async () => {
    if (!user || !loc) return nav({ to: "/auth" });
    const h = Number(hours) || 1;

    // Pre-check (UX) — server enforces these authoritatively
    const missingDocs = selectedSpecial.filter((k) => !specialDocs[k]);
    if (missingDocs.length > 0) {
      const labels = missingDocs.map((k) => SPECIAL_OPTIONS.find((o) => o.key === k)?.label ?? k).join(", ");
      return toast.error(`Não é possível reservar vaga especial (${labels}). Envie a documentação no seu perfil.`);
    }

    setReserving(true);
    try {
      const res = await reserveAndDebit({
        data: {
          locationId: loc.id,
          durationHours: h,
          specialPermissions: selectedSpecial as ("pcd" | "elderly" | "pregnant")[],
        },
      });
      setBalance(Number(res.balance));
      toast.success(`Vaga reservada! R$ ${res.total.toFixed(2)} debitado da carteira.`);
      setReserveOpen(false);
      nav({ to: "/wallet" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao reservar");
    } finally {
      setReserving(false);
    }
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
              <Button variant="ghost" size="icon" onClick={toggleSave} aria-label={saved ? "Remover dos favoritos" : "Salvar nos favoritos"}>
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
                <DialogContent className="max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle>Reservar em {loc.name}</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="reserve-hours">Duração (horas)</Label>
                      <Input id="reserve-hours" type="number" min="1" max="24" value={hours} onChange={(e) => setHours(e.target.value)} />
                    </div>

                    <div>
                      <Label className="mb-2 block">Vaga especial (opcional)</Label>
                      <div className="space-y-2">
                        {SPECIAL_OPTIONS.map((opt) => {
                          const checked = selectedSpecial.includes(opt.key);
                          const hasDoc = !!specialDocs[opt.key];
                          return (
                            <label key={opt.key} className="flex cursor-pointer items-center gap-3 rounded-lg border border-border/60 bg-surface p-3 text-sm">
                              <Checkbox checked={checked} onCheckedChange={() => toggleSpecial(opt.key)} />
                              <span className="flex-1">{opt.label}</span>
                              {checked && !hasDoc && (
                                <span className="inline-flex items-center gap-1 text-xs text-destructive">
                                  <AlertCircle className="h-3.5 w-3.5" /> Sem documento
                                </span>
                              )}
                            </label>
                          );
                        })}
                      </div>
                      {selectedSpecial.some((k) => !specialDocs[k]) && (
                        <p className="mt-2 flex items-start gap-1 text-xs text-destructive">
                          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          Não é possível reservar vaga especial sem o comprovante.{" "}
                          <Link to="/profile" className="underline">Enviar documentação</Link>
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-border/60 bg-surface p-4">
                      <span className="text-sm text-muted-foreground">Total</span>
                      <span className="font-display text-2xl font-bold text-primary">
                        R$ {((Number(hours) || 0) * loc.price_per_hour).toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between rounded-lg bg-surface/60 px-3 py-2 text-xs">
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <Wallet className="h-3.5 w-3.5" /> Saldo na carteira
                      </span>
                      <span className={balance < (Number(hours) || 0) * loc.price_per_hour ? "font-semibold text-destructive" : "font-semibold text-foreground"}>
                        R$ {balance.toFixed(2)}
                      </span>
                    </div>

                    <Button onClick={reserve} disabled={reserving} className="w-full bg-gradient-primary text-primary-foreground" size="lg">
                      {reserving ? "Processando..." : "Confirmar e debitar da carteira"}
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
