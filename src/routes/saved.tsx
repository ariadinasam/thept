import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { LocationCard, type ParkingItem } from "@/components/LocationCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Heart, Search } from "lucide-react";

export const Route = createFileRoute("/saved")({
  head: () => ({ meta: [{ title: "Locais salvos — THEPT" }] }),
  component: SavedPage,
});

function SavedPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [items, setItems] = useState<ParkingItem[]>([]);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [available, setAvailable] = useState<ParkingItem[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  useEffect(() => { if (!loading && !user) nav({ to: "/auth" }); }, [loading, user, nav]);

  const refresh = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("saved_locations")
      .select("location_id, parking_locations(*)")
      .eq("user_id", user.id);
    const list = (data ?? []).map((row: any) => row.parking_locations).filter(Boolean) as ParkingItem[];
    setItems(list);
    setSavedIds(new Set(list.map((l) => l.id)));
  };

  useEffect(() => { refresh(); }, [user]);

  const openAdd = async () => {
    setOpen(true);
    if (available.length === 0) {
      const { data } = await supabase.from("parking_locations").select("*");
      setAvailable((data ?? []) as ParkingItem[]);
    }
  };

  const toggleSave = async (id: string) => {
    if (!user) return;
    if (savedIds.has(id)) {
      await supabase.from("saved_locations").delete().eq("user_id", user.id).eq("location_id", id);
      toast.success("Removido dos salvos");
    } else {
      const { error } = await supabase.from("saved_locations").insert({ user_id: user.id, location_id: id });
      if (error) return toast.error(error.message);
      toast.success("Adicionado aos salvos!");
    }
    refresh();
  };

  const filteredAvail = available.filter((a) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return a.name.toLowerCase().includes(q) || a.address.toLowerCase().includes(q);
  });

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold">Locais salvos</h1>
            <p className="mt-1 text-sm text-muted-foreground">Seus parceiros favoritos para acesso rápido.</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openAdd} size="lg" className="bg-gradient-primary text-primary-foreground hover:opacity-90">
                <Plus className="h-4 w-4" /> Adicionar
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[80vh] overflow-hidden">
              <DialogHeader><DialogTitle>Adicionar local salvo</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar parceiro..." className="pl-9" />
                </div>
                <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
                  {filteredAvail.map((a) => {
                    const isSaved = savedIds.has(a.id);
                    return (
                      <Card key={a.id} className="flex items-center justify-between border-border/60 bg-surface p-3">
                        <div className="min-w-0">
                          <div className="truncate font-medium">{a.name}</div>
                          <div className="truncate text-xs text-muted-foreground">{a.address}</div>
                        </div>
                        <Button size="sm" variant={isSaved ? "outline" : "default"} onClick={() => toggleSave(a.id)} className={isSaved ? "" : "bg-gradient-primary text-primary-foreground"}>
                          {isSaved ? "Remover" : "Salvar"}
                        </Button>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="mt-6 space-y-3">
          {items.length === 0 ? (
            <Card className="border-dashed border-border/60 bg-surface p-10 text-center">
              <Heart className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">Você ainda não salvou nenhum local.</p>
              <Button onClick={openAdd} className="mt-4 bg-gradient-primary text-primary-foreground">
                <Plus className="h-4 w-4" /> Adicionar local
              </Button>
            </Card>
          ) : (
            items.map((item) => <LocationCard key={item.id} item={item} />)
          )}
        </div>
      </section>
      <Footer />
    </div>
  );
}
