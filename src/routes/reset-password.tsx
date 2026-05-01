import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { MapPin, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Nova senha — THEPT" }] }),
  component: ResetPasswordPage,
});

interface PwdCheck { label: string; ok: boolean }
function checkPassword(pwd: string): PwdCheck[] {
  return [
    { label: "Pelo menos 8 caracteres", ok: pwd.length >= 8 },
    { label: "Uma letra maiúscula", ok: /[A-Z]/.test(pwd) },
    { label: "Uma letra minúscula", ok: /[a-z]/.test(pwd) },
    { label: "Um número", ok: /\d/.test(pwd) },
  ];
}

function translateAuthError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("pwned") || m.includes("compromised") || m.includes("breach"))
    return "Esta senha apareceu em vazamentos públicos. Escolha uma diferente.";
  if (m.includes("same password") || m.includes("should be different"))
    return "A nova senha precisa ser diferente da atual.";
  if (m.includes("weak password")) return "Senha muito fraca.";
  if (m.includes("expired")) return "O link expirou. Solicite um novo.";
  return msg;
}

function ResetPasswordPage() {
  const nav = useNavigate();
  const [ready, setReady] = useState(false);
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Supabase recovery links arrive as a hash fragment that the browser client
    // parses automatically, emitting a PASSWORD_RECOVERY event.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const checks = checkPassword(pwd);
  const allOk = checks.every((c) => c.ok);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!allOk) return toast.error("A senha não atende aos requisitos.");
    if (pwd !== confirm) return toast.error("As senhas não conferem.");
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setSaving(false);
    if (error) return toast.error(translateAuthError(error.message));
    toast.success("Senha redefinida! Você já está conectado.");
    nav({ to: "/" });
  };

  return (
    <div className="bg-hero flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
            <MapPin className="h-7 w-7 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <h1 className="font-display text-3xl font-bold">Definir nova senha</h1>
          <p className="mt-2 text-sm text-muted-foreground">Escolha uma senha forte para a sua conta.</p>
        </div>

        <div className="rounded-2xl border border-border/60 bg-gradient-card p-6 shadow-elegant">
          {!ready ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Validando link de recuperação...
            </p>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <Label htmlFor="np">Nova senha</Label>
                <Input id="np" type="password" required value={pwd} onChange={(e) => setPwd(e.target.value)} />
                <ul className="mt-2 space-y-1 rounded-lg bg-surface/60 p-3 text-xs">
                  {checks.map((c) => (
                    <li key={c.label} className={`flex items-center gap-2 ${c.ok ? "text-primary" : "text-muted-foreground"}`}>
                      {c.ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                      {c.label}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <Label htmlFor="cp">Confirmar senha</Label>
                <Input id="cp" type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              </div>
              <Button type="submit" disabled={saving || !allOk} className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90">
                {saving ? "Salvando..." : "Salvar nova senha"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
