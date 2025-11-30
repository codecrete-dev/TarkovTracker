import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import {
    authenticateUser,
    handleCorsPrefligh,
    validateMethod,
    createErrorResponse,
    createSuccessResponse
} from "../_shared/auth.ts"
// Valid game modes per VERSION CONTRACT (docs/00_VERSION_CONTRACT.md)
const VALID_GAME_MODES = ["pvp", "pve"] as const
type GameMode = typeof VALID_GAME_MODES[number]
interface ProgressData {
  level?: number
  faction?: string
  taskCompletions?: Record<string, boolean>
  taskObjectives?: Record<string, boolean>
  hideoutModules?: Record<string, number>
  hideoutParts?: Record<string, number>
}
interface ProgressUpdateRequest {
  gameMode: GameMode
  progressData: ProgressData
}
interface UserProgress {
  user_id?: string
  currentGameMode: GameMode
  pvp: ProgressData
  pve: ProgressData
  created_at?: string
  updated_at?: string
  [key: string]: unknown
}
serve(async (req) => {
  // Handle CORS preflight requests
  const corsResponse = handleCorsPrefligh(req)
  if (corsResponse) return corsResponse
  try {
    // Validate HTTP method
    const methodError = validateMethod(req, ["POST", "PUT"])
    if (methodError) return methodError
    // Authenticate user
    const authResult = await authenticateUser(req)
    if ("error" in authResult) {
      return createErrorResponse(authResult.error, authResult.status, req)
    }
    const { user, supabase } = authResult
    // Parse and validate request body
    const body: ProgressUpdateRequest = await req.json()
    if (!body.gameMode || !VALID_GAME_MODES.includes(body.gameMode)) {
      return createErrorResponse(
        `Invalid game mode. Must be one of: ${VALID_GAME_MODES.join(", ")}`,
        400,
        req
      )
    }
    if (!body.progressData || typeof body.progressData !== "object") {
      return createErrorResponse("Missing or invalid progressData", 400, req)
    }
    const { gameMode, progressData } = body
    // Validate progress data fields
    if (progressData.level !== undefined) {
      if (typeof progressData.level !== "number" || progressData.level < 1 || progressData.level > 100) {
        return createErrorResponse("Level must be a number between 1 and 100", 400, req)
      }
    }
    if (progressData.faction !== undefined) {
      const validFactions = ["USEC", "BEAR"]
      if (!validFactions.includes(progressData.faction)) {
        return createErrorResponse(`Faction must be one of: ${validFactions.join(", ")}`, 400, req)
      }
    }
    // Get current user progress
    const { data: currentProgress, error: fetchError } = await supabase
      .from("user_progress")
      .select("*")
      .eq("user_id", user.id)
      .single()
    if (fetchError && fetchError.code !== "PGRST116") {
      // PGRST116 = no rows found (acceptable)
      console.error("Failed to fetch current progress:", fetchError)
      return createErrorResponse("Failed to fetch current progress", 500, req)
    }
    // Prepare the progress data structure
    let updatedProgress: UserProgress
    if (currentProgress) {
      // User has existing progress - merge with new data
      updatedProgress = {
        ...currentProgress,
        currentGameMode: currentProgress.currentGameMode || gameMode,
        [gameMode]: {
          ...(currentProgress[gameMode] || {}),
          ...progressData
        },
        updated_at: new Date().toISOString()
      }
    } else {
      // New user progress - create initial structure
      updatedProgress = {
        user_id: user.id,
        currentGameMode: gameMode,
        pvp: gameMode === "pvp" ? progressData : {
          level: 1,
          faction: "USEC",
          taskCompletions: {},
          taskObjectives: {},
          hideoutModules: {},
          hideoutParts: {}
        },
        pve: gameMode === "pve" ? progressData : {
          level: 1,
          faction: "USEC",
          taskCompletions: {},
          taskObjectives: {},
          hideoutModules: {},
          hideoutParts: {}
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    }
    // Upsert progress with transaction safety
    const { data: savedProgress, error: upsertError } = await supabase
      .from("user_progress")
      .upsert(updatedProgress, {
        onConflict: "user_id",
        ignoreDuplicates: false
      })
      .select()
      .single()
    if (upsertError) {
      console.error("Failed to save progress:", upsertError)
      return createErrorResponse("Failed to save progress", 500, req)
    }
    return createSuccessResponse({
      success: true,
      message: "Progress updated successfully",
      progress: savedProgress
    }, 200, req)
  } catch (error) {
    console.error("Progress update error:", error)
    return createErrorResponse("Internal server error", 500, req)
  }
})
