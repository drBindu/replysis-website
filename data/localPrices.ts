/**
 * Plans in local currency for the UK, Canada and Australia (owner, 2026-10-22). Round local prices, not a live
 * conversion: Pro stays under LockedIn AI's $49.99 in every market. The Stripe price ids live in the server env
 * (STRIPE_PRO_MONTHLY_PRICE_GBP and so on); a country is only offered its currency when both of its ids are set,
 * so the page can never show a price the checkout will not charge.
 */
export type LocalPlanPrices = { currency: "gbp" | "cad" | "aud"; symbol: string; pro: number; max: number };

export const LOCAL_PRICES: Record<string, LocalPlanPrices> = {
  GB: { currency: "gbp", symbol: "£",   pro: 27.99, max: 62.99 },
  CA: { currency: "cad", symbol: "CA$", pro: 47.99, max: 109.99 },
  AU: { currency: "aud", symbol: "A$",  pro: 52.99, max: 119.99 },
};

/** The env names that hold the monthly Stripe price ids for this currency. */
export const localPriceEnv = (plan: "pro" | "max", currency: string) =>
  `STRIPE_${plan.toUpperCase()}_MONTHLY_PRICE_${currency.toUpperCase()}`;
