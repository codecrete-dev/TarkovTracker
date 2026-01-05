import { createError, defineEventHandler, getQuery, getRequestHeader } from 'h3';
import { useRuntimeConfig } from '#imports';
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);
  const supabaseUrl = config.supabaseUrl as string;
  const supabaseServiceKey = config.supabaseServiceKey as string;
  const supabaseAnonKey = config.supabaseAnonKey as string;
  if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
    throw createError({
      statusCode: 500,
      statusMessage:
        '[team/members] Missing required environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_ANON_KEY must all be set',
    });
  }
  const restFetch = async (path: string, init?: RequestInit) => {
    const url = `${supabaseUrl}/rest/v1/${path}`;
    const headers = {
      apikey: supabaseServiceKey,
      Authorization: `Bearer ${supabaseServiceKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(init?.headers as Record<string, string> | undefined),
    };
    return fetch(url, { ...init, headers });
  };
  const teamId = (getQuery(event).teamId as string | undefined)?.trim();
  if (!teamId) {
    throw createError({ statusCode: 400, statusMessage: 'teamId is required' });
  }
  const authContextUser = (event.context as { auth?: { user?: { id?: string } } }).auth?.user;
  let userId = authContextUser?.id || null;
  if (!userId) {
    const authHeader = getRequestHeader(event, 'authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw createError({ statusCode: 401, statusMessage: 'Missing auth token' });
    }
    // Validate token -> user via auth endpoint
    const authResp = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: authHeader,
        apikey: supabaseAnonKey,
      },
    });
    if (!authResp.ok) {
      throw createError({ statusCode: 401, statusMessage: 'Invalid token' });
    }
    const user = (await authResp.json()) as { id: string };
    userId = user.id;
  }
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid token' });
  }
  // Ensure caller is member
  const membershipResp = await restFetch(
    `team_memberships?team_id=eq.${teamId}&user_id=eq.${userId}&select=user_id&limit=1`
  );
  if (!membershipResp.ok) {
    throw createError({ statusCode: 500, statusMessage: 'Failed membership check' });
  }
  const membershipJson = (await membershipResp.json()) as Array<{ user_id: string }>;
  if (!membershipJson?.length) {
    throw createError({ statusCode: 403, statusMessage: 'Not a team member' });
  }
  // Fetch all members
  const membersResp = await restFetch(`team_memberships?team_id=eq.${teamId}&select=user_id`);
  if (!membersResp.ok) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to load members' });
  }
  const membersJson = (await membersResp.json()) as Array<{ user_id: string }>;
  const memberIds = membersJson.map((m) => m.user_id);
  // Fetch display name + level snapshot using summary view (reduces egress by ~99%)
  const idsParam = memberIds.map((id) => `"${id}"`).join(',');
  const profilesResp = await restFetch(
    `team_member_summary?select=user_id,current_game_mode,pvp_display_name,pvp_level,pvp_tasks_completed,pve_display_name,pve_level,pve_tasks_completed&user_id=in.(${idsParam})`
  );
  if (!profilesResp.ok) {
    const errorText = await profilesResp.text();
    console.error(`[team/members] Profiles fetch error (${profilesResp.status}):`, errorText);
  }
  const profileMap: Record<
    string,
    { displayName: string | null; level: number | null; tasksCompleted: number | null }
  > = {};
  if (profilesResp.ok) {
    const profiles = (await profilesResp.json()) as Array<{
      user_id: string;
      current_game_mode?: string | null;
      pvp_display_name?: string | null;
      pvp_level?: number | null;
      pvp_tasks_completed?: number | null;
      pve_display_name?: string | null;
      pve_level?: number | null;
      pve_tasks_completed?: number | null;
    }>;
    profiles.forEach((p) => {
      const mode = (p.current_game_mode as 'pvp' | 'pve' | null) || 'pvp';
      const isPve = mode === 'pve';
      profileMap[p.user_id] = {
        displayName: isPve ? (p.pve_display_name ?? null) : (p.pvp_display_name ?? null),
        level: isPve ? (p.pve_level ?? null) : (p.pvp_level ?? null),
        tasksCompleted: isPve ? (p.pve_tasks_completed ?? null) : (p.pvp_tasks_completed ?? null),
      };
    });
  } else {
    // Fallback: fetch each user individually using summary view
    for (const id of memberIds) {
      const resp = await restFetch(
        `team_member_summary?select=user_id,current_game_mode,pvp_display_name,pvp_level,pvp_tasks_completed,pve_display_name,pve_level,pve_tasks_completed&user_id=eq.${id}`
      );
      if (!resp.ok) continue;
      const profiles = (await resp.json()) as Array<{
        user_id: string;
        current_game_mode?: string | null;
        pvp_display_name?: string | null;
        pvp_level?: number | null;
        pvp_tasks_completed?: number | null;
        pve_display_name?: string | null;
        pve_level?: number | null;
        pve_tasks_completed?: number | null;
      }>;
      profiles.forEach((p) => {
        const mode = (p.current_game_mode as 'pvp' | 'pve' | null) || 'pvp';
        const isPve = mode === 'pve';
        profileMap[p.user_id] = {
          displayName: isPve ? (p.pve_display_name ?? null) : (p.pvp_display_name ?? null),
          level: isPve ? (p.pve_level ?? null) : (p.pvp_level ?? null),
          tasksCompleted: isPve ? (p.pve_tasks_completed ?? null) : (p.pvp_tasks_completed ?? null),
        };
      });
    }
  }
  return { members: memberIds, profiles: profileMap };
});
