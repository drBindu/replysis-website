import type { LocalPlanPrices } from "../../data/localPrices";
import { MAYA_ADDON, MOCK_PLAN } from "../../data/mayaAddon";

/**
 * The monthly plan prices the site shows. They must equal the live Stripe prices the checkout charges
 * (STRIPE_PRO_MONTHLY_PRICE, STRIPE_MAX_MONTHLY_PRICE and their _INR prices, checked read only 2026-11-07).
 * Local currencies (UK, Canada, Australia) are in data/localPrices.ts.
 */
export const PLAN_USD = { pro: 34.99, max: 79.99 } as const;
export const PLAN_INR = { pro: 699, max: 1299 } as const;

export type ShownPrices = {
  pro: string;
  max: string;
  practice: string;
  maya: string;
  /** How long one payment lasts: India pays once for a month, everywhere else is a monthly subscription. */
  per: "for 1 month" | "a month";
};

/**
 * What a visitor is shown, in the currency the checkout will charge them. India and the local currency come from
 * /api/geo, which reads the same address the checkout reads, so the page and the receipt always agree. Dollars until
 * it answers, which is the safe default.
 */
export function shownPrices(india: boolean, local: LocalPlanPrices | null): ShownPrices {
  if (india) {
    return { pro: `₹${PLAN_INR.pro}`, max: `₹${PLAN_INR.max}`, practice: `₹${MOCK_PLAN.inr}`, maya: `₹${MAYA_ADDON.inr}`, per: "for 1 month" };
  }
  if (local) {
    return {
      pro: `${local.symbol}${local.pro}`,
      max: `${local.symbol}${local.max}`,
      practice: `${local.symbol}${MOCK_PLAN.local[local.currency]}`,
      maya: `${local.symbol}${MAYA_ADDON.local[local.currency]}`,
      per: "a month",
    };
  }
  return { pro: `$${PLAN_USD.pro}`, max: `$${PLAN_USD.max}`, practice: `$${MOCK_PLAN.usd}`, maya: `$${MAYA_ADDON.usd}`, per: "a month" };
}
