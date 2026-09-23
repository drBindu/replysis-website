/**
 * The rupee prices are not conversions. $9.99 is about Rs 955, which nobody in
 * India pays for a top-up.
 *
 * Credits are also the cheap half of this product: a pack buys answers, not
 * listening time, and an answer costs about seventeen paise to serve. Five
 * thousand credits cost us Rs 170, so even Rs 899 keeps roughly seventy
 * percent after Stripe. That is why these can be priced for the market far more
 * aggressively than the plans, which carry the expensive listening hours.
 */
export const CREDIT_PACKS = [
  { id: "500", credits: 500, price: 9.99, inr: 149, label: "Quick boost", env: "STRIPE_CREDITS_500_PRICE" },
  { id: "1500", credits: 1500, price: 24.99, inr: 349, label: "Interview sprint", env: "STRIPE_CREDITS_1500_PRICE" },
  { id: "5000", credits: 5000, price: 69.99, inr: 899, label: "Best value", env: "STRIPE_CREDITS_5000_PRICE" },
] as const;

export type CreditPackId = (typeof CREDIT_PACKS)[number]["id"];

export function creditPackById(id: unknown) {
  return CREDIT_PACKS.find(pack => pack.id === id);
}
