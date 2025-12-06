/**
 * Composable for calling Supabase Edge Functions
 * Provides typed methods for common edge function operations
 */
import type { UpdateProgressPayload } from '@/types/api';
import type {
  CreateTeamResponse,
  JoinTeamResponse,
  KickMemberResponse,
  LeaveTeamResponse,
} from '@/types/team';
import { logger } from '@/utils/logger';
type GameMode = 'pvp' | 'pve';
export const useEdgeFunctions = () => {
  const { $supabase } = useNuxtApp();
  const runtimeConfig = useRuntimeConfig();
  const rawTeamGatewayUrl = String(
    runtimeConfig?.public?.teamGatewayUrl ||
      runtimeConfig?.public?.team_gateway_url || // safety for snake_case envs
      ''
  );
  const rawTokenGatewayUrl = String(runtimeConfig?.public?.tokenGatewayUrl || rawTeamGatewayUrl);
  const gatewayUrl = rawTeamGatewayUrl.replace(/\/+$/, ''); // team routes
  const tokenGatewayUrl = rawTokenGatewayUrl.replace(/\/+$/, ''); // token routes
  const getAuthToken = async () => {
    const { data, error } = await $supabase.client.auth.getSession();
    if (error) throw error;
    const token = data.session?.access_token;
    if (!token) {
      throw new Error('User not authenticated');
    }
    return token;
  };
  const callGateway = async <T>(action: string, body: Record<string, unknown>): Promise<T> => {
    if (!gatewayUrl) {
      throw new Error('Gateway URL not configured');
    }
    const token = await getAuthToken();
    try {
      const response = await $fetch<T>(`${gatewayUrl}/team/${action}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body,
      });
      return response as T;
    } catch (error: unknown) {
      // Log the full error response for debugging
      if (error && typeof error === 'object' && 'data' in error) {
        logger.error('[EdgeFunctions] Gateway error response:', error.data);
      }
      throw error;
    }
  };
  const callTokenGateway = async <T>(
    action: 'revoke' | 'create',
    body: Record<string, unknown>
  ): Promise<T> => {
    if (!tokenGatewayUrl) {
      throw new Error('Token gateway URL not configured');
    }
    const token = await getAuthToken();
    const response = await $fetch<T>(`${tokenGatewayUrl}/token/${action}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body,
    });
    return response as T;
  };
  const callSupabaseFunction = async <T>(
    fnName: string,
    body: Record<string, unknown>,
    method: 'POST' | 'GET' | 'DELETE' | 'PUT' = 'POST'
  ) => {
    const { data, error } = await $supabase.client.functions.invoke<T>(fnName, {
      body,
      method,
    });
    if (error) {
      throw error;
    }
    return data as T;
  };
  const getTeamMembers = async (
    teamId: string
  ): Promise<{
    members: string[];
    profiles?: Record<
      string,
      { displayName: string | null; level: number | null; tasksCompleted: number | null }
    >;
  }> => {
    // Call Nuxt server route which uses service role and validates membership
    const token = await getAuthToken();
    const result = await $fetch<{
      members: string[];
      profiles?: Record<
        string,
        { displayName: string | null; level: number | null; tasksCompleted: number | null }
      >;
    }>(`/api/team/members`, {
      method: 'GET',
      query: { teamId },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return result;
  };
  const preferGateway = async <T>(action: string, body: Record<string, unknown>): Promise<T> => {
    logger.debug(`[EdgeFunctions] preferGateway called with action: ${action}, body:`, body);
    if (gatewayUrl) {
      try {
        logger.debug(`[EdgeFunctions] Attempting gateway call to: ${gatewayUrl}/team/${action}`);
        const result = await callGateway<T>(action, body);
        logger.debug('[EdgeFunctions] Gateway call succeeded:', result);
        return result;
      } catch (error) {
        logger.warn('[EdgeFunctions] Gateway failed, falling back to Supabase:', error);
      }
    }
    const fnName = `team-${action}`;
    logger.debug(`[EdgeFunctions] Calling Supabase function: ${fnName}`);
    const result = await callSupabaseFunction<T>(fnName, body);
    logger.debug('[EdgeFunctions] Supabase function result:', result);
    return result;
  };
  /**
   * Update user progress for a specific game mode
   * @param gameMode The game mode (pvp or pve)
   * @param progressData The progress data to update
   */
  const updateProgress = async (gameMode: GameMode, progressData: UpdateProgressPayload) => {
    const { data, error } = await $supabase.client.functions.invoke('progress-update', {
      body: { gameMode, progressData },
      method: 'POST',
    });
    if (error) {
      logger.error('[EdgeFunctions] Progress update failed:', error);
      throw error;
    }
    return data;
  };
  /**
   * Create a new team
   * @param name Team name
   * @param joinCode Team join/invite code
   * @param maxMembers Maximum number of team members (2-10)
   * @param gameMode Game mode for the team ('pvp' or 'pve')
   */
  const createTeam = async (
    name: string,
    joinCode: string,
    maxMembers = 5,
    gameMode: GameMode = 'pvp'
  ): Promise<CreateTeamResponse> => {
    if (!joinCode || joinCode.trim().length === 0) {
      throw new Error('Join code cannot be empty');
    }
    return await preferGateway<CreateTeamResponse>('create', {
      name,
      join_code: joinCode,
      maxMembers,
      game_mode: gameMode,
    });
  };
  /**
   * Join an existing team
   * @param teamId The ID of the team to join
   * @param joinCode The team join/invite code
   */
  const joinTeam = async (teamId: string, joinCode: string): Promise<JoinTeamResponse> => {
    return await preferGateway<JoinTeamResponse>('join', { teamId, join_code: joinCode });
  };
  /**
   * Leave a team
   * @param teamId The ID of the team to leave
   */
  const leaveTeam = async (teamId: string): Promise<LeaveTeamResponse> => {
    return await preferGateway<LeaveTeamResponse>('leave', { teamId });
  };
  /**
   * Kick a member from a team (owner only)
   * @param teamId The ID of the team
   * @param memberId The ID of the member to kick
   */
  const kickTeamMember = async (teamId: string, memberId: string): Promise<KickMemberResponse> => {
    return await preferGateway<KickMemberResponse>('kick', { teamId, memberId });
  };
  const preferTokenGateway = async <T>(
    action: 'revoke' | 'create',
    body: Record<string, unknown>
  ): Promise<T> => {
    if (tokenGatewayUrl) {
      try {
        return await callTokenGateway<T>(action, body);
      } catch (error) {
        logger.warn('[EdgeFunctions] Token gateway failed, falling back to Supabase:', error);
      }
    }
    const fnName = action === 'revoke' ? 'token-revoke' : 'token-create';
    const method = action === 'revoke' ? 'DELETE' : 'POST';
    return await callSupabaseFunction<T>(fnName, body, method);
  };
  const createToken = async (payload: {
    permissions: string[];
    gameMode: GameMode;
    note?: string | null;
    tokenValue?: string;
  }) => {
    return await preferTokenGateway<{ success?: boolean; tokenId?: string; tokenValue?: string }>(
      'create',
      payload
    );
  };
  /**
   * Revoke an API token
   * @param tokenId The ID of the token to revoke
   */
  const revokeToken = async (tokenId: string) => {
    try {
      return await preferTokenGateway<{ success?: boolean }>('revoke', { tokenId });
    } catch (error) {
      // Final safety net: direct delete via Supabase table with RLS
      try {
        const { error: deleteError } = await $supabase.client
          .from('api_tokens')
          .delete()
          .eq('token_id', tokenId);
        if (deleteError) throw deleteError;
        return { success: true } as const;
      } catch (innerError) {
        logger.error(
          '[EdgeFunctions] Token revocation failed after all fallbacks:',
          innerError || error
        );
        throw innerError || error;
      }
    }
  };
  return {
    // Progress management
    updateProgress,
    // Team management
    createTeam,
    joinTeam,
    leaveTeam,
    kickTeamMember,
    getTeamMembers,
    // API token management
    createToken,
    revokeToken,
  };
};
