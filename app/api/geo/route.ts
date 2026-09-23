import { NextResponse } from "next/server";
import { countryOf } from "@/app/lib/buyer-country";

/**
 * The country this request came from, so the pricing page can show the right
 * currency.
 *
 * Display only. What a card is charged is decided again inside the checkout
 * route, from the same address, and that decision is the one that counts. This
 * endpoint exists so the page does not have to guess from a timezone, which is
 * a setting anybody can change.
 *
 * Nothing here is personal: a two-letter country code, not an address, and no
 * IP is returned or stored. It is not cached, because the answer depends on who
 * is asking.
 */
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const country = await countryOf(req.headers);

  // Whether the rupee top-up prices exist in Stripe yet.
  //
  // The page must never show a price the checkout will not charge, and these
  // three are created by hand in the Dashboard. Reporting it from the server
  // means the display switches on by itself the moment the keys are set, and
  // stays on dollars until then, with no code change and no window where the
  // card says one number and the receipt says another.
  const rupeePacks = Boolean(
    process.env.STRIPE_CREDITS_500_PRICE_INR &&
    process.env.STRIPE_CREDITS_1500_PRICE_INR &&
    process.env.STRIPE_CREDITS_5000_PRICE_INR
  );

  return NextResponse.json(
    { country, rupeePacks },
    { headers: { "Cache-Control": "no-store" } }
  );
}
