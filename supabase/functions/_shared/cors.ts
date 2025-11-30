/**
 * Build strict CORS headers for a given request origin.
 *
 * Security: Do NOT use wildcard origins for authenticated requests.
 * Only allow known front-end origins in production; include localhost in dev.
 */
function getAllowedOrigins(): string[] {
  const defaults = [
    "https://tarkovtracker.org",
    "https://www.tarkovtracker.org"
  ]
  const extra = Deno.env.get("SUPABASE_ALLOWED_ORIGINS")
    ?.split(",")
    .map((s) => s.trim())
    .filter(Boolean) ?? []
  const isDev = (Deno.env.get("NODE_ENV") ?? Deno.env.get("ENV")) === "development"
  const local = isDev ? ["http://localhost:3000", "http://127.0.0.1:3000"] : []
  // De-duplicate while preserving order
  const set = new Set<string>([...defaults, ...extra, ...local])
  return Array.from(set)
}
/**
 * Compute CORS headers for a request.
 * - Echoes Origin when it's in the allowlist
 * - Adds proper Vary header for caches
 */
export function corsHeadersFor(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin")
  const allowed = getAllowedOrigins()
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    Vary: "Origin"
  }
  if (origin && allowed.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin
  }
  return headers
}
// Backward-compat export to avoid immediate runtime breakage in places where
// a Request object is not available. This intentionally does NOT include an
// origin and should only be used for pre-flight responses that aren't
// security-sensitive. Prefer using corsHeadersFor(req) everywhere.
export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  Vary: "Origin"
}
