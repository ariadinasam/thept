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
import { Handshake } from "lucide-react";
import { z } from "zod";

export const Route = createFileRoute("/partner")({
  head: () => ({ meta: [{ title: "Seja Parceiro — THEPT" }] }),
  component: PartnerPage,
});

const schema = z.object({
  business_name: z.string().trim().min(2).max(120),
  contact_name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  address: z.string().trim().max(255).optional().or(z.literal("")),
  category: z.string().trim().max(60).optional().or(z.literal("")),
  message: z.string().trim().max(1000).optional().or(z.literal("")),
});

function PartnerPage() {
  const [form, setForm] = useState({ business_name: "", contact_name: "", email: "", phone: "", address: "", category: "", message: "" });
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) return toast.error("Verifique os campos preenchidos.");
    setSubmitting(true);
    const { error } = await supabase.from("partner_applications").insert(parsed.data);
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Recebemos seu cadastro! Entraremos em contato em breve.");
    setForm({ business_name: "", contact_name: "", email: "", phone: "", address: "", category: "", message: "" });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Handshake className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold">Seja parceiro</h1>
            <p className="text-sm text-muted-foreground">Cadastre seu estabelecimento e atraia mais clientes.</p>
          </div>
        </div>

        <Card className="border-border/60 bg-gradient-card p-6">
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label>Nome do estabelecimento *</Label>
              <Input required maxLength={120} value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Responsável *</Label>
                <Input required maxLength={120} value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
              </div>
              <div>
                <Label>E-mail *</Label>
                <Input type="email" required maxLength={255} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Telefone</Label>
                <Input maxLength={30} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(11) 99999-9999" />
              </div>
              <div>
                <Label>Categoria</Label>
                <Input maxLength={60} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Restaurante, clínica..." />
              </div>
            </div>
            <div>
              <Label>Endereço</Label>
              <Input maxLength={255} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div>
              <Label>Mensagem</Label>
              <Textarea maxLength={1000} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Quantas vagas tem? Conte-nos sobre seu estabelecimento..." rows={4} />
            </div>
            <Button type="submit" disabled={submitting} className="w-full bg-gradient-primary text-primary-foreground" size="lg">
              {submitting ? "Enviando..." : "Enviar cadastro"}
            </Button>
          </form>
        </Card>
      </section>
      <Footer />
    </div>
  );
}
