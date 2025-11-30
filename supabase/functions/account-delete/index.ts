import { authenticateUser, handleCorsPrefligh, validateMethod, createErrorResponse, createSuccessResponse } from "shared/auth"
import { serve } from "std/http/server"
serve(async (req) => {
  const corsResponse = handleCorsPrefligh(req)
  if (corsResponse) return corsResponse
  try {
    const methodError = validateMethod(req, ["POST"]) // invoked via POST
    if (methodError) return methodError
    const authResult = await authenticateUser(req)
    if ("error" in authResult) {
      return createErrorResponse(authResult.error, authResult.status, req)
    }
    const { user, supabase } = authResult
    const { data: ownedTeams, error: teamQueryError } = await supabase
      .from("teams")
      .select("id")
      .eq("owner_id", user.id)
    if (teamQueryError) {
      console.error("[account-delete] Failed to fetch owned teams:", teamQueryError)
      return createErrorResponse("Failed to fetch owned teams", 500, req)
    }
    if (ownedTeams && ownedTeams.length > 0) {
      for (const team of ownedTeams) {
        const { data: members, error: membersError } = await supabase
          .from("team_memberships")
          .select("user_id, joined_at")
          .eq("team_id", team.id)
          .neq("user_id", user.id)
          .order("joined_at", { ascending: true })
        if (membersError) {
          console.error("[account-delete] Failed to fetch team members:", membersError)
          return createErrorResponse("Failed to process team memberships", 500, req)
        }
        if (members && members.length > 0) {
          const newOwner = members[0].user_id
          const { error: transferError } = await supabase
            .from("teams")
            .update({ owner_id: newOwner })
            .eq("id", team.id)
          if (transferError) {
            console.error("[account-delete] Failed to transfer ownership:", transferError)
            return createErrorResponse("Failed to transfer team ownership", 500, req)
          }
        } else {
          const { error: deleteTeamError } = await supabase
            .from("teams")
            .delete()
            .eq("id", team.id)
          if (deleteTeamError) {
            console.error("[account-delete] Failed to delete empty team:", deleteTeamError)
            return createErrorResponse("Failed to delete empty team", 500, req)
          }
        }
      }
    }
    const { error: membershipDeleteError } = await supabase
      .from("team_memberships")
      .delete()
      .eq("user_id", user.id)
    if (membershipDeleteError) {
      console.error("[account-delete] Failed to delete team memberships:", membershipDeleteError)
      return createErrorResponse("Failed to delete team memberships", 500, req)
    }
    await supabase.from("api_tokens").delete().eq("user_id", user.id)
    await supabase.from("user_progress").delete().eq("user_id", user.id)
    await supabase.from("user_preferences").delete().eq("user_id", user.id)
    await supabase.from("user_system").delete().eq("user_id", user.id)
    await supabase.from("team_events").delete().or(`initiated_by.eq.${user.id},target_user.eq.${user.id}`)
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(user.id)
    if (authDeleteError) {
      console.error("[account-delete] Failed to delete auth user:", authDeleteError)
      return createErrorResponse("Failed to delete account", 500, req)
    }
    return createSuccessResponse({ success: true }, 200, req)
  } catch (error) {
    console.error("[account-delete] Unexpected error:", error)
    return createErrorResponse("Internal server error", 500, req)
  }
})
