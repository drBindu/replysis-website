export const CREDIT_PACKS = [
  { id: "500", credits: 500, price: 9.99, label: "Quick boost", env: "STRIPE_CREDITS_500_PRICE" },
  { id: "1500", credits: 1500, price: 24.99, label: "Interview sprint", env: "STRIPE_CREDITS_1500_PRICE" },
  { id: "5000", credits: 5000, price: 69.99, label: "Best value", env: "STRIPE_CREDITS_5000_PRICE" },
] as const;

export type CreditPackId = (typeof CREDIT_PACKS)[number]["id"];

export function creditPackById(id: unknown) {
  return CREDIT_PACKS.find(pack => pack.id === id);
}
