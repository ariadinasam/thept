import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, Instagram } from "lucide-react";
import { z } from "zod";

export const Route = createFileRoute("/contact")({
  head: () => ({ meta: [{ title: "Contato — THEPT" }] }),
  component: ContactPage,
});

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  subject: z.string().trim().max(120).optional().or(z.literal("")),
  message: z.string().trim().min(5).max(1000),
});

function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) return toast.error("Preencha nome, e-mail e mensagem.");
    setSubmitting(true);
    const { error } = await supabase.from("contact_messages").insert(parsed.data);
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Mensagem enviada! Responderemos em breve.");
    setForm({ name: "", email: "", subject: "", message: "" });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Mail className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold">Entre em contato</h1>
            <p className="text-sm text-muted-foreground">Dúvidas, sugestões ou suporte? Estamos aqui.</p>
          </div>
        </div>

        <Card className="border-border/60 bg-gradient-card p-6">
          <form onSubmit={submit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Nome *</Label>
                <Input required maxLength={120} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Label>E-mail *</Label>
                <Input type="email" required maxLength={255} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Assunto</Label>
              <Input maxLength={120} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
            </div>
            <div>
              <Label>Mensagem *</Label>
              <Textarea required maxLength={1000} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={5} />
            </div>
            <Button type="submit" disabled={submitting} className="w-full bg-gradient-primary text-primary-foreground" size="lg">
              {submitting ? "Enviando..." : "Enviar mensagem"}
            </Button>
          </form>
        </Card>

        <div className="mt-6 flex items-center justify-center">
          <a
            href="https://instagram.com/thept"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
          >
            <Instagram className="h-4 w-4" /> @thept
          </a>
        </div>
      </section>
      <Footer />
    </div>
  );
}
