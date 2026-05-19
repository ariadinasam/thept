import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { topUpWallet } from "@/lib/wallet.functions";
import { toast } from "sonner";
import { CreditCard, Plus, Wallet, Trash2, Loader2, QrCode, Banknote, Check } from "lucide-react";

export const Route = createFileRoute("/wallet")({
  head: () => ({ meta: [{ title: "Carteira — THEPT" }] }),
  component: WalletPage,
});

interface PaymentMethod {
  id: string; card_brand: string; last_four: string; cardholder_name: string; expiry: string; is_default: boolean;
}
interface Reservation {
  id: string; total_price: number; start_time: string; status: string; duration_hours: number;
  parking_locations: { name: string; address: string } | null;
}

function detectBrand(num: string) {
  const n = num.replace(/\s/g, "");
  if (n.startsWith("4")) return "Visa";
  if (/^5[1-5]/.test(n)) return "Mastercard";
  if (/^3[47]/.test(n)) return "Amex";
  if (n.startsWith("6")) return "Elo";
  return "Cartão";
}

function WalletPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [balance, setBalance] = useState(0);
  const [cards, setCards] = useState<PaymentMethod[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [open, setOpen] = useState(false);
  const [topupOpen, setTopupOpen] = useState(false);
  const [topupAmount, setTopupAmount] = useState("50");
  const [payMethod, setPayMethod] = useState<"pix" | "credit" | "debit" | "paypal">("pix");
  const [selectedCardId, setSelectedCardId] = useState<string>("");
  const [payStep, setPayStep] = useState<"select" | "processing" | "pix" | "paypal">("select");
  const [pixCode] = useState("00020126360014BR.GOV.BCB.PIX0114+5511999999999THEPT5204000053039865802BR5909THEPT LTD6009SAO PAULO62070503***6304A1B2");
  const [card, setCard] = useState({ number: "", name: "", expiry: "", cvv: "" });

  useEffect(() => { if (!loading && !user) nav({ to: "/auth" }); }, [loading, user, nav]);

  const refresh = async () => {
    if (!user) return;
    const [{ data: w }, { data: c }, { data: r }] = await Promise.all([
      supabase.from("wallets").select("balance").eq("user_id", user.id).maybeSingle(),
      supabase.from("payment_methods").select("*").eq("user_id", user.id).order("is_default", { ascending: false }),
      supabase.from("reservations").select("*, parking_locations(name, address)").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
    ]);
    if (w) setBalance(Number(w.balance));
    setCards((c ?? []) as PaymentMethod[]);
    setReservations((r ?? []) as unknown as Reservation[]);
  };

  useEffect(() => { refresh(); }, [user]);

  const addCard = async () => {
    if (!user) return;
    const num = card.number.replace(/\s/g, "");
    if (num.length < 13) return toast.error("Número de cartão inválido");
    const { error } = await supabase.from("payment_methods").insert({
      user_id: user.id,
      card_brand: detectBrand(num),
      last_four: num.slice(-4),
      cardholder_name: card.name,
      expiry: card.expiry,
      is_default: cards.length === 0,
    });
    if (error) return toast.error(error.message);
    toast.success("Cartão adicionado!");
    setOpen(false);
    setCard({ number: "", name: "", expiry: "", cvv: "" });
    refresh();
  };

  const removeCard = async (id: string) => {
    await supabase.from("payment_methods").delete().eq("id", id);
    refresh();
  };

  const resetTopup = () => {
    setPayStep("select");
    setTopupAmount("50");
    setSelectedCardId("");
  };

  const startPayment = async () => {
    const amount = Number(topupAmount);
    if (!amount || amount <= 0) return toast.error("Valor inválido");

    if (payMethod === "pix") {
      setPayStep("pix");
      return;
    }
    if (payMethod === "paypal") {
      setPayStep("paypal");
      return;
    }
    // credit / debit
    if (!selectedCardId) return toast.error("Selecione um cartão");
    setPayStep("processing");
    // Simula processamento de gateway de pagamento
    await new Promise((r) => setTimeout(r, 2200));
    // 95% de sucesso simulado
    const success = Math.random() > 0.05;
    if (!success) {
      toast.error("Pagamento recusado pelo emissor. Tente outro cartão.");
      setPayStep("select");
      return;
    }
    await creditBalance(amount);
  };

  const confirmPixPaid = async () => {
    setPayStep("processing");
    await new Promise((r) => setTimeout(r, 1800));
    await creditBalance(Number(topupAmount));
  };

  const confirmPaypalPaid = async () => {
    setPayStep("processing");
    await new Promise((r) => setTimeout(r, 2000));
    await creditBalance(Number(topupAmount));
  };

  const creditBalance = async (amount: number) => {
    if (!user) return;
    const { error } = await supabase.from("wallets").update({ balance: balance + amount }).eq("user_id", user.id);
    if (error) { toast.error(error.message); setPayStep("select"); return; }
    toast.success(`R$ ${amount.toFixed(2)} adicionado à carteira!`);
    setTopupOpen(false);
    resetTopup();
    refresh();
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="font-display text-3xl font-bold">Carteira digital</h1>

        <Card className="mt-6 overflow-hidden border-border/60 bg-gradient-primary p-6 text-primary-foreground shadow-glow">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm opacity-80">
                <Wallet className="h-4 w-4" /> Saldo disponível
              </div>
              <div className="mt-2 font-display text-4xl font-bold">R$ {balance.toFixed(2)}</div>
            </div>
            <Dialog open={topupOpen} onOpenChange={(o) => { setTopupOpen(o); if (!o) resetTopup(); }}>
              <DialogTrigger asChild>
                <Button variant="secondary" className="bg-background/20 text-primary-foreground hover:bg-background/30">
                  <Plus className="h-4 w-4" /> Recarregar
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {payStep === "select" && "Recarregar carteira"}
                    {payStep === "processing" && "Processando pagamento"}
                    {payStep === "pix" && "Pagar com PIX"}
                    {payStep === "paypal" && "Pagar com PayPal"}
                  </DialogTitle>
                </DialogHeader>

                {payStep === "select" && (
                  <div className="space-y-4">
                    <div>
                      <Label>Valor</Label>
                      <Input type="number" value={topupAmount} onChange={(e) => setTopupAmount(e.target.value)} />
                      <div className="mt-2 flex gap-2">
                        {[20, 50, 100, 200].map((v) => (
                          <Button key={v} type="button" variant="outline" size="sm" onClick={() => setTopupAmount(String(v))}>R${v}</Button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label className="mb-2 block">Forma de pagamento</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {([
                          { id: "pix", label: "PIX", icon: QrCode },
                          { id: "credit", label: "Crédito", icon: CreditCard },
                          { id: "debit", label: "Débito", icon: Banknote },
                          { id: "paypal", label: "PayPal", icon: Wallet },
                        ] as const).map((m) => {
                          const Icon = m.icon;
                          const active = payMethod === m.id;
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => setPayMethod(m.id)}
                              className={`flex items-center gap-2 rounded-xl border p-3 text-sm transition-colors ${active ? "border-primary bg-primary/10 text-primary" : "border-border/60 hover:border-primary/40"}`}
                            >
                              <Icon className="h-4 w-4" /> {m.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {(payMethod === "credit" || payMethod === "debit") && (
                      <div>
                        <Label className="mb-2 block">Cartão</Label>
                        {cards.length === 0 ? (
                          <div className="rounded-lg border border-dashed border-border/60 bg-surface p-3 text-center text-xs text-muted-foreground">
                            Cadastre um cartão abaixo antes de continuar.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {cards.map((c) => (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => setSelectedCardId(c.id)}
                                className={`flex w-full items-center justify-between rounded-lg border p-3 text-left text-sm transition-colors ${selectedCardId === c.id ? "border-primary bg-primary/10" : "border-border/60 hover:border-primary/40"}`}
                              >
                                <span>{c.card_brand} •••• {c.last_four}</span>
                                {selectedCardId === c.id && <Check className="h-4 w-4 text-primary" />}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <Button onClick={startPayment} className="w-full bg-gradient-primary text-primary-foreground">
                      Pagar R$ {Number(topupAmount || 0).toFixed(2)}
                    </Button>
                  </div>
                )}

                {payStep === "processing" && (
                  <div className="flex flex-col items-center justify-center gap-3 py-8">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Processando seu pagamento de forma segura…</p>
                  </div>
                )}

                {payStep === "pix" && (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-border/60 bg-surface p-4 text-center">
                      <div className="mx-auto flex h-40 w-40 items-center justify-center rounded-lg bg-foreground p-2">
                        <QrCode className="h-32 w-32 text-background" />
                      </div>
                      <p className="mt-3 text-xs text-muted-foreground">Escaneie o QR Code no app do seu banco</p>
                    </div>
                    <div>
                      <Label className="text-xs">PIX copia e cola</Label>
                      <div className="flex gap-2">
                        <Input readOnly value={pixCode} className="text-xs" />
                        <Button type="button" variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(pixCode); toast.success("Código copiado"); }}>Copiar</Button>
                      </div>
                    </div>
                    <p className="text-center text-sm font-semibold">Total: R$ {Number(topupAmount).toFixed(2)}</p>
                    <Button onClick={confirmPixPaid} className="w-full bg-gradient-primary text-primary-foreground">Já paguei</Button>
                  </div>
                )}

                {payStep === "paypal" && (
                  <div className="space-y-4 text-center">
                    <div className="rounded-xl border border-border/60 bg-surface p-6">
                      <div className="font-display text-2xl font-bold text-[#0070ba]">PayPal</div>
                      <p className="mt-2 text-xs text-muted-foreground">Você será redirecionado para concluir o pagamento de</p>
                      <p className="mt-1 font-display text-2xl font-bold">R$ {Number(topupAmount).toFixed(2)}</p>
                    </div>
                    <Button onClick={confirmPaypalPaid} className="w-full bg-[#0070ba] text-white hover:bg-[#005ea6]">Continuar para PayPal</Button>
                    <button onClick={() => setPayStep("select")} className="text-xs text-muted-foreground hover:underline">Cancelar</button>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </Card>

        <div className="mt-8 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">Cartões salvos</h2>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm"><Plus className="h-4 w-4" /> Adicionar</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo cartão de crédito</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Número do cartão</Label>
                  <Input value={card.number} onChange={(e) => setCard({ ...card, number: e.target.value })} placeholder="1234 5678 9012 3456" />
                </div>
                <div>
                  <Label>Nome impresso</Label>
                  <Input value={card.name} onChange={(e) => setCard({ ...card, name: e.target.value.toUpperCase() })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Validade</Label><Input value={card.expiry} onChange={(e) => setCard({ ...card, expiry: e.target.value })} placeholder="MM/AA" maxLength={5} /></div>
                  <div><Label>CVV</Label><Input value={card.cvv} onChange={(e) => setCard({ ...card, cvv: e.target.value })} maxLength={4} /></div>
                </div>
                <Button onClick={addCard} className="w-full bg-gradient-primary text-primary-foreground">Salvar cartão</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="mt-4 space-y-3">
          {cards.length === 0 ? (
            <Card className="border-dashed border-border/60 bg-surface p-8 text-center text-sm text-muted-foreground">
              Nenhum cartão cadastrado.
            </Card>
          ) : cards.map((c) => (
            <Card key={c.id} className="flex items-center justify-between border-border/60 bg-gradient-card p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-14 items-center justify-center rounded-lg bg-secondary text-primary">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-medium">{c.card_brand} •••• {c.last_four}</div>
                  <div className="text-xs text-muted-foreground">{c.cardholder_name} · {c.expiry}</div>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => removeCard(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </Card>
          ))}
        </div>

        <h2 className="mt-10 font-display text-xl font-semibold">Reservas recentes</h2>
        <div className="mt-4 space-y-3">
          {reservations.length === 0 ? (
            <Card className="border-dashed border-border/60 bg-surface p-8 text-center text-sm text-muted-foreground">
              Você ainda não fez reservas.
            </Card>
          ) : reservations.map((r) => (
            <Card key={r.id} className="flex items-center justify-between border-border/60 bg-gradient-card p-4">
              <div>
                <div className="font-medium">{r.parking_locations?.name ?? "Local"}</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(r.start_time).toLocaleString("pt-BR")} · {r.duration_hours}h
                </div>
              </div>
              <div className="text-right">
                <div className="font-display font-bold text-primary">R$ {Number(r.total_price).toFixed(2)}</div>
                <div className="text-xs uppercase text-muted-foreground">{r.status}</div>
              </div>
            </Card>
          ))}
        </div>
      </section>
      <Footer />
    </div>
  );
}
