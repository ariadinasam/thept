import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Car, Accessibility, Upload, FileCheck2, Lock, Trash2, Heart, Camera, Mail, User as UserIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Perfil — THEPT" }] }),
  component: ProfilePage,
});

const PERMISSIONS = [
  { key: "pcd", label: "PCD" },
  { key: "elderly", label: "Idoso" },
  { key: "pregnant", label: "Gestante" },
];

type DocsMap = Record<string, string>; // permission key -> storage path

function ProfilePage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ full_name: "", phone: "", car_plate: "", car_model: "", special_permissions: [] as string[], avatar_url: "" });
  const [docs, setDocs] = useState<DocsMap>({});
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [pwd, setPwd] = useState({ next: "", confirm: "" });
  const [pwdSaving, setPwdSaving] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth" });
  }, [loading, user, nav]);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data) {
        setForm({
          full_name: data.full_name ?? "", phone: data.phone ?? "",
          car_plate: data.car_plate ?? "", car_model: data.car_model ?? "",
          special_permissions: data.special_permissions ?? [],
          avatar_url: (data as { avatar_url?: string | null }).avatar_url ?? "",
        });
        setDocs((data.permission_documents ?? {}) as DocsMap);
      }
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
    const { error } = await supabase.from("profiles").update({ ...form, permission_documents: docs }).eq("id", user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Perfil atualizado!");
  };

  const uploadDoc = async (key: string, file: File) => {
    if (!user) return;
    if (file.size > 5 * 1024 * 1024) return toast.error("Arquivo muito grande (máx 5MB).");
    setUploadingKey(key);
    const ext = file.name.split(".").pop() || "pdf";
    const path = `${user.id}/${key}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("permission-docs").upload(path, file, { upsert: true });
    setUploadingKey(null);
    if (error) return toast.error(error.message);

    // Remove previous doc for this key
    if (docs[key]) {
      await supabase.storage.from("permission-docs").remove([docs[key]]);
    }
    const next = { ...docs, [key]: path };
    setDocs(next);
    await supabase.from("profiles").update({ permission_documents: next }).eq("id", user.id);
    toast.success("Comprovante enviado!");
  };

  const removeDoc = async (key: string) => {
    if (!user || !docs[key]) return;
    await supabase.storage.from("permission-docs").remove([docs[key]]);
    const next = { ...docs };
    delete next[key];
    setDocs(next);
    await supabase.from("profiles").update({ permission_documents: next }).eq("id", user.id);
    toast.success("Comprovante removido");
  };

  const changePassword = async () => {
    if (pwd.next.length < 6) return toast.error("Senha deve ter ao menos 6 caracteres.");
    if (pwd.next !== pwd.confirm) return toast.error("Senhas não conferem.");
    setPwdSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pwd.next });
    setPwdSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Senha alterada com sucesso!");
    setPwd({ next: "", confirm: "" });
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
          <p className="text-sm text-muted-foreground">
            Marque as permissões e envie um comprovante (PDF ou imagem, máx. 5MB) para validação.
          </p>
          <div className="space-y-3">
            {PERMISSIONS.map((p) => {
              const checked = form.special_permissions.includes(p.key);
              const hasDoc = !!docs[p.key];
              return (
                <div key={p.key} className="rounded-xl border border-border/60 bg-surface p-3">
                  <label className="flex cursor-pointer items-center gap-3">
                    <Checkbox checked={checked} onCheckedChange={() => togglePerm(p.key)} />
                    <span className="flex-1 text-sm font-medium">{p.label}</span>
                    {hasDoc && (
                      <span className="inline-flex items-center gap-1 text-xs text-primary">
                        <FileCheck2 className="h-3.5 w-3.5" /> Comprovante enviado
                      </span>
                    )}
                  </label>
                  {checked && (
                    <div className="mt-3 flex items-center gap-2 border-t border-border/40 pt-3">
                      <input
                        id={`doc-${p.key}`}
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) uploadDoc(p.key, f);
                          e.target.value = "";
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={uploadingKey === p.key}
                        onClick={() => document.getElementById(`doc-${p.key}`)?.click()}
                      >
                        <Upload className="h-3.5 w-3.5" />
                        {uploadingKey === p.key ? "Enviando..." : hasDoc ? "Substituir" : "Enviar comprovante"}
                      </Button>
                      {hasDoc && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeDoc(p.key)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        <Button onClick={save} disabled={saving} className="mt-6 w-full bg-gradient-primary text-primary-foreground hover:opacity-90">
          {saving ? "Salvando..." : "Salvar alterações"}
        </Button>

        <Card className="mt-8 space-y-4 border-border/60 bg-gradient-card p-6">
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            <h2 className="font-display text-lg font-semibold">Alterar senha</h2>
          </div>
          <div>
            <Label>Nova senha</Label>
            <Input type="password" value={pwd.next} onChange={(e) => setPwd({ ...pwd, next: e.target.value })} placeholder="Mínimo 6 caracteres" />
          </div>
          <div>
            <Label>Confirmar nova senha</Label>
            <Input type="password" value={pwd.confirm} onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })} />
          </div>
          <Button onClick={changePassword} disabled={pwdSaving} variant="outline" className="w-full">
            {pwdSaving ? "Alterando..." : "Alterar senha"}
          </Button>
        </Card>

        <Link to="/saved" className="mt-6 flex items-center justify-center gap-2 text-sm text-primary hover:underline">
          <Heart className="h-4 w-4" /> Ver meus locais salvos
        </Link>
      </section>
      <Footer />
    </div>
  );
}
