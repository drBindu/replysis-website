/**
 * Referral links (owner, 2026-10-17): a user shares replysis.com/?ref=CODE. When a friend signs up through it, both get
 * free answers. The reward is added on the server only, once per new account, with a cap per referrer.
 */
/** Credits added to each side. 25 credits is 5 answers (an answer is 5 credits). */
export const REFERRAL_REWARD_CREDITS = 25;
/** The most friends one person can be rewarded for, so a farm of throwaway accounts cannot mint answers without end. */
export const REFERRAL_MAX_REWARDS = 10;
/** Only a new account can claim a referral: its profile must be this young. */
export const REFERRAL_NEW_ACCOUNT_HOURS = 48;
/** Letters and digits with no 0, 1, I, L, O or U, so a code reads out loud and survives a screenshot. */
export const REFERRAL_ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";
export const REFERRAL_CODE_LENGTH = 8;

export const isReferralCode = (value: unknown): value is string =>
  typeof value === "string" && new RegExp(`^[${REFERRAL_ALPHABET}]{${REFERRAL_CODE_LENGTH}}$`).test(value);

export const answersFromCredits = (credits: number) => Math.floor(credits / 5);
