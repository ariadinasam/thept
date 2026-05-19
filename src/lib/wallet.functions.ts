import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const SPECIAL = z.enum(["pcd", "elderly", "pregnant"]);

export const topUpWallet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ amount: z.number().positive().max(10000) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    const { data: w, error: rErr } = await supabaseAdmin
      .from("wallets")
      .select("balance")
      .eq("user_id", userId)
      .maybeSingle();
    if (rErr) throw new Error(rErr.message);

    const current = Number(w?.balance ?? 0);
    const next = +(current + data.amount).toFixed(2);

    const { error } = await supabaseAdmin
      .from("wallets")
      .update({ balance: next })
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { balance: next };
  });

export const reserveAndDebit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        locationId: z.string().uuid(),
        durationHours: z.number().int().min(1).max(24),
        specialPermissions: z.array(SPECIAL).optional().default([]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const userId = context.userId;

    const [
      { data: loc, error: lErr },
      { data: prof, error: pErr },
      { data: wal, error: wErr },
    ] = await Promise.all([
      supabaseAdmin
        .from("parking_locations")
        .select("price_per_hour, available_spots")
        .eq("id", data.locationId)
        .maybeSingle(),
      supabaseAdmin
        .from("profiles")
        .select("permission_documents")
        .eq("id", userId)
        .maybeSingle(),
      supabaseAdmin
        .from("wallets")
        .select("balance")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);
    if (lErr) throw new Error(lErr.message);
    if (pErr) throw new Error(pErr.message);
    if (wErr) throw new Error(wErr.message);
    if (!loc) throw new Error("Local não encontrado");
    if (Number(loc.available_spots) <= 0)
      throw new Error("Sem vagas disponíveis no momento");

    const docs = (prof?.permission_documents ?? {}) as Record<string, string>;
    const missing = data.specialPermissions.filter((k) => !docs[k]);
    if (missing.length)
      throw new Error(
        `Documentação faltando para vaga especial: ${missing.join(", ")}. Envie pelo perfil.`,
      );

    const total = +(data.durationHours * Number(loc.price_per_hour)).toFixed(2);
    const balance = Number(wal?.balance ?? 0);
    if (balance < total)
      throw new Error(
        `Saldo insuficiente. Saldo: R$ ${balance.toFixed(2)}, total: R$ ${total.toFixed(2)}.`,
      );

    const { error: rErr } = await supabaseAdmin.from("reservations").insert({
      user_id: userId,
      location_id: data.locationId,
      start_time: new Date().toISOString(),
      duration_hours: data.durationHours,
      total_price: total, // trigger re-validates
      status: "confirmed",
    });
    if (rErr) throw new Error(rErr.message);

    const newBalance = +(balance - total).toFixed(2);
    const { error: uErr } = await supabaseAdmin
      .from("wallets")
      .update({ balance: newBalance })
      .eq("user_id", userId);
    if (uErr) throw new Error(uErr.message);

    return { balance: newBalance, total };
  });
