import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeadersFor } from "../_shared/cors.ts"

const supabaseUrl = Deno.env.get("SUPABASE_URL")!
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeadersFor(req) })
  }

  try {
    // Only allow DELETE method
    if (req.method !== "DELETE") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { 
          status: 405, 
          headers: { ...corsHeadersFor(req), "Content-Type": "application/json" }
        }
      )
    }

    // Get authorization header to verify user identity
    const authHeader = req.headers.get("Authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid authorization header" }),
        { 
          status: 401, 
          headers: { ...corsHeadersFor(req), "Content-Type": "application/json" }
        }
      )
    }

    // Get token from request body
    const { tokenId } = await req.json()
    if (!tokenId) {
      return new Response(
        JSON.stringify({ error: "Token ID is required" }),
        { 
          status: 400, 
          headers: { ...corsHeadersFor(req), "Content-Type": "application/json" }
        }
      )
    }

    // Create Supabase client with service role key for admin operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify user JWT token
    const token = authHeader.replace("Bearer ", "")
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication token" }),
        { 
          status: 401, 
          headers: { ...corsHeadersFor(req), "Content-Type": "application/json" }
        }
      )
    }

    // Delete the token (only if it belongs to the authenticated user)
    const { error: deleteError } = await supabase
      .from("api_tokens")
      .delete()
      .eq("token_id", tokenId)
      .eq("user_id", user.id)

    if (deleteError) {
      console.error("Token deletion failed:", deleteError)
      return new Response(
        JSON.stringify({ error: "Failed to revoke token" }),
        { 
          status: 500, 
          headers: { ...corsHeadersFor(req), "Content-Type": "application/json" }
        }
      )
    }

    return new Response(
      JSON.stringify({ success: true, message: "Token revoked successfully" }),
      { 
        status: 200, 
        headers: { ...corsHeadersFor(req), "Content-Type": "application/json" }
      }
    )

  } catch (error) {
    console.error("Token revoke error:", error)
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { 
        status: 500, 
        headers: { ...corsHeadersFor(req), "Content-Type": "application/json" }
      }
    )
  }
})
