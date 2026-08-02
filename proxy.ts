import { NextRequest, NextResponse } from "next/server";
import { jwtVerify, createRemoteJWKSet } from "jose";

const PROTECTED_PREFIXES = [
  "/real-interview",
  "/mock-interview",
  "/resume",
  "/admin",
];

const FIREBASE_PROJECT_ID =
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "copilotx-ai";

const FIREBASE_JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com")
);

function redirectToAuth(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = "/";
  url.searchParams.set("auth", "required");
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  if (!isProtected) return NextResponse.next();

  const sessionCookie = request.cookies.get("coopilotx_session");
  if (!sessionCookie?.value) return redirectToAuth(request, pathname);

  try {
    await jwtVerify(sessionCookie.value, FIREBASE_JWKS, {
      issuer: "https://securetoken.google.com/" + FIREBASE_PROJECT_ID,
      audience: FIREBASE_PROJECT_ID,
    });
  } catch {
    const response = redirectToAuth(request, pathname);
    response.cookies.delete("coopilotx_session");
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)",
  ],
};
