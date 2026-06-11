import { NextResponse } from "next/server";

const COOKIE_NAME = "finzo_access";
const TOKEN_SUFFIX = ":finzo-access-v1";

// Paths that always bypass the lock
const BYPASS_PREFIXES = [
  "/api/",
  "/advisor",
  "/unlock",
  "/_next/",
  "/favicon",
  "/robots.txt",
  "/sitemap.xml",
];

async function deriveToken(password) {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(password + TOKEN_SUFFIX));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function middleware(request) {
  const lockEnabled =
    process.env.SITE_LOCK_ENABLED === "true" ||
    process.env.SITE_LOCK_ENABLE === "true";
  console.log("[site-lock] lockEnabled:", lockEnabled);
  if (!lockEnabled) return NextResponse.next();

  const { pathname } = request.nextUrl;

  if (BYPASS_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const password = process.env.SITE_LOCK_PASSWORD;
  console.log("[site-lock] passwordEnvExists:", !!password);
  if (!password) return NextResponse.next();

  const expected = await deriveToken(password);
  const cookie = request.cookies.get(COOKIE_NAME)?.value;
  const cookieValid = cookie === expected;
  console.log("[site-lock] cookieValid:", cookieValid);

  if (cookieValid) return NextResponse.next();

  const lockUrl = new URL("/unlock", request.url);
  const dest = pathname + (request.nextUrl.search || "");
  if (dest !== "/") lockUrl.searchParams.set("next", dest);
  return NextResponse.redirect(lockUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico).*)"],
};
