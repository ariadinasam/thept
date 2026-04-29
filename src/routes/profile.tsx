import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Car, Accessibility } from "lucide-react";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Perfil — THEPT" }] }),
  component: ProfilePage,
});

const PERMISSIONS = [
  { key: "pcd", label: "PCD" },
  { key: "elderly", label: "Idoso" },
  { key: "pregnant", label: "Gestante" },
];

function ProfilePage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ full_name: "", phone: "", car_plate: "", car_model: "", special_permissions: [] as string[] });

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth" });
  }, [loading, user, nav]);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data) setForm({
        full_name: data.full_name ?? "", phone: data.phone ?? "",
        car_plate: data.car_plate ?? "", car_model: data.car_model ?? "",
        special_permissions: data.special_permissions ?? [],
      });
    });
  }, [user]);

  const togglePerm = (k: string) => {
    setForm((f) => ({
      ...f,
      special_permissions: f.special_permissions.includes(k)
        ? f.special_permissions.filter((p) => p !== k)
        : [...f.special_permissions, k],
    }));
  };

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update(form).eq("id", user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Perfil atualizado!");
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <h1 className="font-display text-3xl font-bold">Meu perfil</h1>
        <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>

        <Card className="mt-6 space-y-5 border-border/60 bg-gradient-card p-6">
          <div>
            <Label>Nome completo</Label>
            <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </div>
          <div>
            <Label>Telefone</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(11) 99999-9999" />
          </div>
        </Card>

        <Card className="mt-4 space-y-5 border-border/60 bg-gradient-card p-6">
          <div className="flex items-center gap-2">
            <Car className="h-5 w-5 text-primary" />
            <h2 className="font-display text-lg font-semibold">Meu veículo</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Placa</Label>
              <Input value={form.car_plate} onChange={(e) => setForm({ ...form, car_plate: e.target.value.toUpperCase() })} placeholder="ABC1D23" maxLength={7} />
            </div>
            <div>
              <Label>Modelo</Label>
              <Input value={form.car_model} onChange={(e) => setForm({ ...form, car_model: e.target.value })} placeholder="Honda Civic" />
            </div>
          </div>
        </Card>

        <Card className="mt-4 space-y-4 border-border/60 bg-gradient-card p-6">
          <div className="flex items-center gap-2">
            <Accessibility className="h-5 w-5 text-primary" />
            <h2 className="font-display text-lg font-semibold">Vagas especiais</h2>
          </div>
          <p className="text-sm text-muted-foreground">Marque as permissões para liberar vagas reservadas no app.</p>
          <div className="space-y-3">
            {PERMISSIONS.map((p) => (
              <label key={p.key} className="flex cursor-pointer items-center gap-3 rounded-xl border border-border/60 bg-surface p-3 transition-colors hover:border-primary/40">
                <Checkbox checked={form.special_permissions.includes(p.key)} onCheckedChange={() => togglePerm(p.key)} />
                <span className="text-sm font-medium">{p.label}</span>
              </label>
            ))}
          </div>
        </Card>

        <Button onClick={save} disabled={saving} className="mt-6 w-full bg-gradient-primary text-primary-foreground hover:opacity-90">
          {saving ? "Salvando..." : "Salvar alterações"}
        </Button>
      </section>
    </div>
  );
}
