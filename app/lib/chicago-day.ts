/**
 * A calendar day in Chicago time (CST/CDT), as YYYY-MM-DD. The admin page counts visitors by the owner's own day,
 * not by UTC, whose day starts at 6 or 7 PM in Chicago (owner, 2026-10-16).
 */
const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit" });

export function chicagoDay(at: Date | number = Date.now()): string {
  return fmt.format(typeof at === "number" ? new Date(at) : at);
}

/** The Chicago day `n` days before today. Steps by calendar day, so a daylight saving change cannot skip or repeat one. */
export function chicagoDaysAgo(n: number): string {
  const [y, m, d] = chicagoDay().split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d - n)).toISOString().slice(0, 10);
}
