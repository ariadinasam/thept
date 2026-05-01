import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { MapPin, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Entrar — THEPT" }] }),
  component: AuthPage,
});

function translateAuthError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login") || m.includes("invalid credentials")) return "E-mail ou senha incorretos.";
  if (m.includes("email not confirmed")) return "Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.";
  if (m.includes("user already registered") || m.includes("already been registered")) return "Este e-mail já está cadastrado. Tente entrar.";
  if (m.includes("password should be at least")) return "A senha precisa ter no mínimo 6 caracteres.";
  if (m.includes("pwned") || m.includes("compromised") || m.includes("breach")) return "Esta senha apareceu em vazamentos públicos. Escolha uma senha diferente e mais segura.";
  if (m.includes("weak password") || m.includes("password is too weak")) return "Senha muito fraca. Use letras, números e símbolos.";
  if (m.includes("rate limit") || m.includes("too many")) return "Muitas tentativas. Aguarde alguns instantes e tente novamente.";
  if (m.includes("invalid email")) return "E-mail inválido.";
  return msg;
}

interface PwdCheck { label: string; ok: boolean; }
function checkPassword(pwd: string): PwdCheck[] {
  return [
    { label: "Pelo menos 8 caracteres", ok: pwd.length >= 8 },
    { label: "Uma letra maiúscula", ok: /[A-Z]/.test(pwd) },
    { label: "Uma letra minúscula", ok: /[a-z]/.test(pwd) },
    { label: "Um número", ok: /\d/.test(pwd) },
    { label: "Um símbolo (!@#$...)", ok: /[^A-Za-z0-9]/.test(pwd) },
  ];
}

function AuthPage() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showRules, setShowRules] = useState(false);

  const checks = checkPassword(password);
  const allOk = checks.every((c) => c.ok);

  const onLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) return toast.error(translateAuthError(error.message));
    toast.success("Bem-vindo de volta!");
    nav({ to: "/" });
  };

  const onForgot = async () => {
    const target = email.trim();
    if (!target || !/^\S+@\S+\.\S+$/.test(target)) {
      return toast.error("Digite seu e-mail no campo acima e clique em 'Esqueci minha senha'.");
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(target, {
      redirectTo: window.location.origin + "/reset-password",
    });
    setLoading(false);
    if (error) return toast.error(translateAuthError(error.message));
    toast.success("Enviamos um link de recuperação para o seu e-mail.");
  };

  const onSignup = async (e: FormEvent) => {
    e.preventDefault();
    if (!allOk) {
      toast.error("Sua senha não atende aos requisitos de segurança.");
      setShowRules(true);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: email.trim(), password,
      options: { emailRedirectTo: window.location.origin, data: { full_name: name } },
    });
    setLoading(false);
    if (error) return toast.error(translateAuthError(error.message));
    toast.success("Conta criada! Verifique seu e-mail para confirmar.");
  };

  return (
    <div className="bg-hero flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
            <MapPin className="h-7 w-7 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <h1 className="font-display text-3xl font-bold">Bem-vindo ao THEPT</h1>
          <p className="mt-2 text-sm text-muted-foreground">Encontre vagas, reserve e pague em um só lugar.</p>
        </div>

        <div className="rounded-2xl border border-border/60 bg-gradient-card p-6 shadow-elegant">
          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Cadastrar</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={onLogin} className="space-y-4 pt-4">
                <div>
                  <Label htmlFor="le">E-mail</Label>
                  <Input id="le" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="lp">Senha</Label>
                  <Input id="lp" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button type="submit" disabled={loading} className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90">
                  {loading ? "Entrando..." : "Entrar"}
                </Button>
                <button
                  type="button"
                  onClick={onForgot}
                  className="block w-full text-center text-xs text-primary hover:underline"
                >
                  Esqueci minha senha
                </button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={onSignup} className="space-y-4 pt-4">
                <div>
                  <Label htmlFor="sn">Nome completo</Label>
                  <Input id="sn" required value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="se">E-mail</Label>
                  <Input id="se" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="sp">Senha</Label>
                  <Input
                    id="sp" type="password" required minLength={8} value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setShowRules(true)}
                  />
                  {(showRules || password.length > 0) && (
                    <ul className="mt-2 space-y-1 rounded-lg bg-surface/60 p-3 text-xs">
                      {checks.map((c) => (
                        <li key={c.label} className={`flex items-center gap-2 ${c.ok ? "text-primary" : "text-muted-foreground"}`}>
                          {c.ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                          {c.label}
                        </li>
                      ))}
                      <li className="pt-1 text-[11px] text-muted-foreground">
                        Senhas que apareceram em vazamentos públicos serão recusadas.
                      </li>
                    </ul>
                  )}
                </div>
                <Button type="submit" disabled={loading || !allOk} className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90">
                  {loading ? "Criando..." : "Criar conta"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
