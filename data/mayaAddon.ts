/**
 * The mock interview with Maya (owner, 2026-10-26).
 *
 * Two ways to have it, each with a clear, generous number (owner: "not unlimited but not too limited, and I don't want
 * to lose money"):
 * - the Maya add-on on Pro or Max: +$10 a month, 20 interviews;
 * - the Practice plan on its own: $14.99 a month, 20 interviews plus 100 live interview answers.
 * Every account also gets ONE free interview of 3 questions first.
 *
 * Worst case cost (every interview used, 15 minutes each, Simli about 1 cent a minute): add-on about $3.50 of $10,
 * Practice about $5.70 of $14.99. India pays less and gets half the numbers.
 *
 * Stripe: products "Mock interview with Maya" (STRIPE_MAYA_*) and "Replysis Mock Interview" (STRIPE_MOCK_*), price ids
 * in the server env; each has monthly USD, INR, GBP, CAD, AUD and a one-time INR price for India months paid once.
 */
export const MAYA_ADDON = {
  usd: 10,
  inr: 399,
  local: { gbp: 7.99, cad: 13.99, aud: 14.99 } as Record<string, number>,
  /** Live Maya interviews a month with the add-on. */
  interviews: 20,
  /** India pays Rs 399, about 40 percent of $10. */
  interviewsIndia: 10,
  /** Every account may try Maya once, free: this many questions, and a short live session. */
  tasteQuestions: 3,
  tasteSeconds: 360,
};

export const MOCK_PLAN = {
  usd: 14.99,
  inr: 499,
  local: { gbp: 11.99, cad: 19.99, aud: 21.99 } as Record<string, number>,
  /** Live Maya interviews a month on the plan. */
  interviews: 20,
  interviewsIndia: 10,
  /** Live interview answers a month (credits, 5 an answer) and listening minutes for them. */
  credits: 500,
  creditsIndia: 250,
  audioMinutes: 120,
  audioMinutesIndia: 60,
};

/**
 * Free interviews a day across everyone (owner, 2026-10-26: "what if no one pays and all use free"). About 11 cents each
 * (6 minutes of Simli and the AI), so at most about $33 a month even if nobody pays. After that: "try tomorrow".
 */
export const FREE_TASTES_PER_DAY = 10;

/**
 * Only a started interview counts (owner, 2026-10-26: "start interview, one off, not sessions"): refreshing a page or a
 * connection that fails never uses one up. This number only stops abuse of the connection itself (a script opening
 * sessions without interviews); nobody practising ever reaches it.
 */
export const MAYA_CONNECTIONS_PER_DAY = 40;
