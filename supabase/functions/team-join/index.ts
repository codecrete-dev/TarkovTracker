import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import {
  authenticateUser,
  handleCorsPrefligh,
  validateMethod,
  validateRequiredFields,
  createErrorResponse,
  createSuccessResponse
} from "../_shared/auth.ts"

serve(async (req) => {
  // Handle CORS preflight requests
  const corsResponse = handleCorsPrefligh(req)
  if (corsResponse) return corsResponse

  try {
    // Validate HTTP method
    const methodError = validateMethod(req, ["POST"])
    if (methodError) return methodError

    // Authenticate user
    const authResult = await authenticateUser(req)
    if ("error" in authResult) {
      return createErrorResponse(authResult.error, authResult.status)
    }

    const { user, supabase } = authResult

    // Parse and validate request body
    const body = await req.json()
    const joinCode =
      typeof body.join_code === "string"
        ? body.join_code
        : typeof (body as Record<string, unknown>).password === "string"
          ? (body as { password: string }).password
          : undefined

    const fieldsError = validateRequiredFields({ ...body, join_code: joinCode }, ["teamId", "join_code"])
    if (fieldsError) return fieldsError

    const { teamId } = body
    const join_code = joinCode as string

    // Check if user is already in a team
    const { data: existingMembership, error: membershipCheckError } = await supabase
      .from("team_memberships")
      .select("team_id")
      .eq("user_id", user.id)
      .limit(1)

    if (membershipCheckError) {
      console.error("Membership check failed:", membershipCheckError)
      return createErrorResponse("Failed to check existing team membership", 500)
    }

    if (existingMembership && existingMembership.length > 0) {
      return createErrorResponse("You are already a member of a team. Leave your current team first.", 400)
    }

    // Get team details
    const { data: team, error: teamError } = await supabase
      .from("teams")
      .select("id, name, join_code, max_members")
      .eq("id", teamId)
      .single()

    if (teamError || !team) {
      console.error("Team lookup failed:", teamError)
      return createErrorResponse("Team not found", 404)
    }

    // Verify join code
    if (team.join_code !== join_code) {
      return createErrorResponse("Invalid team join code", 403)
    }

    // Check if team is full
    const { data: currentMembers, error: membersError } = await supabase
      .from("team_memberships")
      .select("user_id", { count: "exact", head: false })
      .eq("team_id", teamId)

    if (membersError) {
      console.error("Members count failed:", membersError)
      return createErrorResponse("Failed to check team capacity", 500)
    }

    if (currentMembers && currentMembers.length >= team.max_members) {
      return createErrorResponse("Team is full", 400)
    }

    // Add user to team
    const { error: joinError } = await supabase
      .from("team_memberships")
      .insert({
        team_id: teamId,
        user_id: user.id,
        role: "member",
        joined_at: new Date().toISOString()
      })

    if (joinError) {
      console.error("Team join failed:", joinError)

      // Check for unique constraint violation (already a member somehow)
      if (joinError.code === "23505") {
        return createErrorResponse("You are already a member of this team", 409)
      }

      return createErrorResponse("Failed to join team", 500)
    }

    // Log team join event
    await supabase
      .from("team_events")
      .insert({
        team_id: teamId,
        event_type: "member_joined",
        target_user: user.id,
        initiated_by: user.id,
        event_data: { team_name: team.name },
        created_at: new Date().toISOString()
      })

    // Update user_system team_id for the joiner
    const { error: systemError } = await supabase
      .from("user_system")
      .upsert({
        user_id: user.id,
        team_id: teamId,
        updated_at: new Date().toISOString()
      })

    if (systemError) {
      console.error("user_system upsert failed:", systemError)
      return createErrorResponse("Failed to update user system state", 500)
    }

    return createSuccessResponse({
      success: true,
      message: "Successfully joined team",
      team: {
        id: team.id,
        name: team.name
      }
    })

  } catch (error) {
    console.error("Team join error:", error)
    return createErrorResponse("Internal server error", 500)
  }
})
