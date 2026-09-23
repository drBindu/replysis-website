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
  return NextResponse.json(
    { country },
    { headers: { "Cache-Control": "no-store" } }
  );
}
