declare const Deno: {
  env: {
    get(key: string): string | undefined
  }
}

declare module "@supabase/supabase-js" {
  export type SupabaseClient = any
  export function createClient(
    url: string,
    key: string
  ): SupabaseClient
}

declare module "https://deno.land/std@0.168.0/http/server.ts" {
  export function serve(
    handler: (req: Request) => Response | Promise<Response>
  ): void
}
declare module "std/http/server" {
  export function serve(
    handler: (req: Request) => Response | Promise<Response>
  ): void
}

declare module "https://esm.sh/@supabase/supabase-js@2" {
  export * from "@supabase/supabase-js"
}
declare module "shared/auth" {
  export function authenticateUser(req: Request): Promise<any>
  export function handleCorsPrefligh(req: Request): Response | null
  export function validateMethod(req: Request, allowed: string[]): Response | null
  export function createErrorResponse(error: string | Error, status?: number, req?: Request): Response
  export function createSuccessResponse(data: unknown, status?: number, req?: Request): Response
}
