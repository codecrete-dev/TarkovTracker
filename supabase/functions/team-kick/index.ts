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
    // Only allow POST method
    if (req.method !== "POST") {
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

    // Get team and member data from request body
    const { teamId, memberId } = await req.json()
    if (!teamId || !memberId) {
      return new Response(
        JSON.stringify({ error: "Team ID and member ID are required" }),
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

    // Check if user is the team owner
    const { data: membership, error: membershipError } = await supabase
      .from("team_memberships")
      .select("role")
      .eq("team_id", teamId)
      .eq("user_id", user.id)
      .single()

    if (membershipError || !membership) {
      return new Response(
        JSON.stringify({ error: "Team not found or user not a member" }),
        { 
          status: 404, 
          headers: { ...corsHeadersFor(req), "Content-Type": "application/json" }
        }
      )
    }

    if (membership.role !== "owner") {
      return new Response(
        JSON.stringify({ error: "Only team owners can kick members" }),
        { 
          status: 403, 
          headers: { ...corsHeadersFor(req), "Content-Type": "application/json" }
        }
      )
    }

    // Cannot kick the owner
    if (memberId === user.id) {
      return new Response(
        JSON.stringify({ error: "Cannot kick yourself from the team" }),
        { 
          status: 400, 
          headers: { ...corsHeadersFor(req), "Content-Type": "application/json" }
        }
      )
    }

    // Check cooldown period (5 minutes between kicks)
    const { data: recentKicks, error: cooldownError } = await supabase
      .from("team_events")
      .select("created_at")
      .eq("team_id", teamId)
      .eq("event_type", "member_kicked")
      .eq("initiated_by", user.id)
      .gte("created_at", new Date(Date.now() - 5 * 60 * 1000).toISOString())
      .limit(1)

    if (!cooldownError && recentKicks && recentKicks.length > 0) {
      return new Response(
        JSON.stringify({ error: "Must wait 5 minutes between kicks" }),
        { 
          status: 429, 
          headers: { ...corsHeadersFor(req), "Content-Type": "application/json" }
        }
      )
    }

    // Remove the member from the team
    const { error: kickError } = await supabase
      .from("team_memberships")
      .delete()
      .eq("team_id", teamId)
      .eq("user_id", memberId)

    if (kickError) {
      console.error("Team kick failed:", kickError)
      return new Response(
        JSON.stringify({ error: "Failed to kick team member" }),
        { 
          status: 500, 
          headers: { ...corsHeadersFor(req), "Content-Type": "application/json" }
        }
      )
    }

    // Log the kick event
    await supabase
      .from("team_events")
      .insert({
        team_id: teamId,
        event_type: "member_kicked",
        target_user: memberId,
        initiated_by: user.id,
        created_at: new Date().toISOString()
      })

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Team member kicked successfully" 
      }),
      { 
        status: 200, 
        headers: { ...corsHeadersFor(req), "Content-Type": "application/json" }
      }
    )

  } catch (error) {
    console.error("Team kick error:", error)
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { 
        status: 500, 
        headers: { ...corsHeadersFor(req), "Content-Type": "application/json" }
      }
    )
  }
})
