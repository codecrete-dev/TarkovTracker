import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders } from "./cors.ts"

const supabaseUrl = Deno.env.get("SUPABASE_URL")!
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

/**
 * Response type for authentication errors
 */
export interface AuthErrorResponse {
  error: string
  status: number
}

/**
 * Successful authentication result
 */
export interface AuthSuccess {
  user: {
    id: string
    email?: string
  }
  supabase: SupabaseClient
}

/**
 * Validate authorization header and authenticate user
 *
 * @param req - The incoming HTTP request
 * @returns AuthSuccess if authentication successful, AuthErrorResponse otherwise
 */
export async function authenticateUser(
  req: Request
): Promise<AuthSuccess | AuthErrorResponse> {
  // Get authorization header to verify user identity
  const authHeader = req.headers.get("Authorization")
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      error: "Missing or invalid authorization header",
      status: 401
    }
  }

  // Create Supabase client with service role key for admin operations
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Verify user JWT token
  const token = authHeader.replace("Bearer ", "")
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)

  if (authError || !user) {
    return {
      error: "Invalid authentication token",
      status: 401
    }
  }

  return {
    user: {
      id: user.id,
      email: user.email
    },
    supabase
  }
}

/**
 * Create a standardized error response
 *
 * @param error - Error message or object
 * @param status - HTTP status code (default: 500)
 * @returns HTTP Response with JSON error
 */
export function createErrorResponse(error: string | Error, status = 500): Response {
  const errorMessage = typeof error === "string" ? error : error.message

  return new Response(
    JSON.stringify({ error: errorMessage }),
    {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    }
  )
}

/**
 * Create a standardized success response
 *
 * @param data - Response data
 * @param status - HTTP status code (default: 200)
 * @returns HTTP Response with JSON data
 */
export function createSuccessResponse(data: unknown, status = 200): Response {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    }
  )
}

/**
 * Handle CORS preflight requests
 *
 * @param req - The incoming HTTP request
 * @returns Response if OPTIONS request, null otherwise
 */
export function handleCorsPrefligh(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }
  return null
}

/**
 * Validate HTTP method
 *
 * @param req - The incoming HTTP request
 * @param allowedMethods - Array of allowed HTTP methods
 * @returns null if valid, error Response if invalid
 */
export function validateMethod(req: Request, allowedMethods: string[]): Response | null {
  if (!allowedMethods.includes(req.method)) {
    return createErrorResponse(
      `Method not allowed. Allowed methods: ${allowedMethods.join(", ")}`,
      405
    )
  }
  return null
}

/**
 * Validate required fields in request body
 *
 * @param body - Request body object
 * @param requiredFields - Array of required field names
 * @returns null if valid, error Response if missing fields
 */
export function validateRequiredFields(
  body: Record<string, unknown>,
  requiredFields: string[]
): Response | null {
  const missingFields = requiredFields.filter(field => !body[field])

  if (missingFields.length > 0) {
    return createErrorResponse(
      `Missing required fields: ${missingFields.join(", ")}`,
      400
    )
  }

  return null
}
