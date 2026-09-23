import { open, type Reader, type CityResponse } from "maxmind";

/**
 * Where the person paying actually is, decided on the server.
 *
 * India pays a different price for the same plan - Rs 299 against $29.99 - so
 * the country is the difference between full price and a ninety percent
 * discount. That decision cannot be made in the browser: a timezone is a
 * setting, and anyone who changed theirs would buy Pro for the price of a
 * coffee. The browser may choose what currency to *display*; only this decides
 * what is charged.
 *
 * The lookup is a memory-mapped MaxMind database already on the host for the
 * analytics report, mounted read-only into the container. No network call, no
 * third-party service in the payment path, and nothing to go down.
 *
 * Every failure answers "not India", which charges the normal price. Being
 * wrong that way costs a discount that was never owed; being wrong the other
 * way gives one away to the world.
 */

const DB_PATH = process.env.GEOIP_DB_PATH || "/app/geoip/GeoLite2-Country.mmdb";

let readerPromise: Promise<Reader<CityResponse> | null> | null = null;

function reader(): Promise<Reader<CityResponse> | null> {
  if (!readerPromise) {
    readerPromise = open<CityResponse>(DB_PATH).catch((error) => {
      // Logged once, not per request: a missing database would otherwise fill
      // the log with the same line on every checkout.
      console.error(
        `[geo] No country database at ${DB_PATH}; every buyer will be charged the default currency.`,
        (error as Error)?.message ?? "unknown"
      );
      return null;
    });
  }
  return readerPromise;
}

/**
 * The client address, taken from what nginx forwards rather than the socket,
 * which is always the proxy itself.
 *
 * X-Forwarded-For can carry a list when there are several proxies; the first
 * entry is the original client. It is also client-settable, so a header from
 * outside could claim anything. That is survivable here only because nginx
 * overwrites both headers on the way in; if the site is ever put behind another
 * proxy, this needs revisiting.
 */
function clientIp(headers: Headers): string | null {
  // X-Real-IP first, because nginx sets it to $remote_addr on every location
  // that serves this site, overwriting anything the client sent. The same
  // config overwrites X-Forwarded-For rather than appending to it, so both are
  // trustworthy here and neither can be forged from outside. The container's
  // own port is not open to the internet, so there is no way around nginx.
  //
  // If this site is ever put behind a second proxy or a CDN, that stops being
  // true and this needs revisiting: a forged header would be a ninety percent
  // discount.
  const real = headers.get("x-real-ip");
  if (real) return real.trim();

  const forwarded = headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  return first || null;
}

/** The ISO country code for this request, or null when it cannot be known. */
export async function countryOf(headers: Headers): Promise<string | null> {
  const ip = clientIp(headers);
  if (!ip) return null;

  try {
    const db = await reader();
    if (!db) return null;
    return db.get(ip)?.country?.iso_code ?? null;
  } catch {
    // A malformed address reaches here. Not India.
    return null;
  }
}

export async function isIndia(headers: Headers): Promise<boolean> {
  return (await countryOf(headers)) === "IN";
}
