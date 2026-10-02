"use server";

import { revalidatePath } from "next/cache";

import { resolveAccess } from "@/lib/access";
import { defaultCurrencyForMarket, type HoldingInput } from "@/lib/portfolio";
import { createClient } from "@/lib/supabase/server";

async function requireGrantedUser() {
  const access = await resolveAccess();
  if (!access?.accessGranted) {
    throw new Error("Access required");
  }
  return access;
}

function normalizeInput(input: HoldingInput): HoldingInput | { error: string } {
  const symbol = input.symbol.trim().toUpperCase();
  if (!symbol) return { error: "Symbol is required." };
  if (!Number.isFinite(input.quantity) || input.quantity < 0) {
    return { error: "Quantity must be zero or positive." };
  }
  if (input.avg_cost != null && (!Number.isFinite(input.avg_cost) || input.avg_cost < 0)) {
    return { error: "Average cost must be zero or positive." };
  }
  const market = input.market;
  const currency = input.currency || defaultCurrencyForMarket(market);
  if (market === "US" && currency !== "USD") {
    return { error: "US holdings must use USD." };
  }
  if (market === "IN" && currency !== "INR") {
    return { error: "India holdings must use INR." };
  }
  return {
    symbol,
    name: input.name?.trim() || null,
    market,
    currency,
    quantity: input.quantity,
    avg_cost: input.avg_cost ?? null,
    notes: input.notes?.trim() || null,
  };
}

export async function upsertHolding(
  input: HoldingInput,
  id?: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const access = await requireGrantedUser();
    const normalized = normalizeInput(input);
    if ("error" in normalized) return { ok: false, error: normalized.error };

    const supabase = await createClient();
    if (id) {
      const { error } = await supabase
        .from("holdings")
        .update(normalized)
        .eq("id", id)
        .eq("user_id", access.user.id);
      if (error) return { ok: false, error: error.message };
    } else {
      const { error } = await supabase.from("holdings").upsert(
        {
          user_id: access.user.id,
          ...normalized,
        },
        { onConflict: "user_id,symbol,market" },
      );
      if (error) return { ok: false, error: error.message };
    }
    revalidatePath("/app/holdings");
    revalidatePath("/app");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to save holding" };
  }
}

export async function deleteHolding(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const access = await requireGrantedUser();
    const supabase = await createClient();
    const { error } = await supabase
      .from("holdings")
      .delete()
      .eq("id", id)
      .eq("user_id", access.user.id);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/app/holdings");
    revalidatePath("/app");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to delete holding" };
  }
}

export async function importNormalizedHoldings(
  rows: HoldingInput[],
): Promise<{ ok: true; imported: number } | { ok: false; error: string }> {
  try {
    const access = await requireGrantedUser();
    if (!rows.length) return { ok: false, error: "No holdings to import." };

    const prepared = [];
    for (const row of rows) {
      const normalized = normalizeInput(row);
      if ("error" in normalized) {
        return { ok: false, error: `${row.symbol}: ${normalized.error}` };
      }
      prepared.push({ user_id: access.user.id, ...normalized });
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from("holdings")
      .upsert(prepared, { onConflict: "user_id,symbol,market" });
    if (error) return { ok: false, error: error.message };
    revalidatePath("/app/holdings");
    revalidatePath("/app");
    return { ok: true, imported: prepared.length };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to import holdings" };
  }
}
