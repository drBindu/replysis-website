/**
 * The mock interview with Maya is an add-on to Pro or Max (owner, 2026-10-26: "if they select including mock interview
 * they cost $10 more"). Live Maya is billed to us by Simli per minute (about $0.75 for a 15 minute interview), so the
 * add-on carries a monthly number of interviews that always leaves most of the $10.
 *
 * Stripe: product "Mock interview with Maya", price ids in the server env (STRIPE_MAYA_MONTHLY_PRICE and the _INR,
 * _GBP, _CAD, _AUD monthly ones, plus STRIPE_MAYA_ONCE_PRICE_INR for India plans paid once).
 */
export const MAYA_ADDON = {
  usd: 10,
  inr: 399,
  local: { gbp: 7.99, cad: 13.99, aud: 14.99 } as Record<string, number>,
  /** Live Maya interviews a month with the add-on. */
  interviews: 10,
  /** India pays Rs 399, about a third of $10, so it carries fewer interviews. */
  interviewsIndia: 5,
};
