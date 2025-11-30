import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { reactive } from 'vue';
type SupabaseUser = {
  id: string | null;
  loggedIn: boolean;
  email: string | null;
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
  photoURL: string | null; // Alias for avatarUrl (backward compatibility)
  lastLoginAt: string | null;
  createdAt: string | null;
  provider: string | null; // 'discord', 'twitch', etc.
};
export default defineNuxtPlugin(() => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  // Build a safe stub so components can still render in environments without Supabase env vars
  const buildStub = () => {
    const stubUser = reactive<SupabaseUser>({
      id: null,
      loggedIn: false,
      email: null,
      displayName: null,
      username: null,
      avatarUrl: null,
      photoURL: null,
      lastLoginAt: null,
      createdAt: null,
      provider: null,
    });
    // Extremely small surface area stub — only the bits we call in-app
    const noopPromise = async () => ({}) as unknown as Promise<unknown>;
    const stubClient = {
      from: () => ({ upsert: noopPromise }),
      functions: { invoke: noopPromise },
      auth: {
        getSession: async () => ({ data: { session: null } }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
        signInWithOAuth: async () => ({ url: undefined }),
        signOut: async () => ({}),
      },
    } as unknown as SupabaseClient;
    return {
      client: stubClient,
      user: stubUser,
      signInWithOAuth: async () => {
        throw new Error('Supabase env not configured (VITE_SUPABASE_URL/ANON_KEY)');
      },
      signOut: async () => {},
    };
  };
  if (!supabaseUrl || !supabaseKey) {
    console.error('[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
    // Fail fast in production to avoid silent bad deploys
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Supabase configuration missing');
    }
    const stub = buildStub();
    return { provide: { supabase: stub } };
  }
  const supabase = createClient(supabaseUrl, supabaseKey);
  const user = reactive<SupabaseUser>({
    id: null,
    loggedIn: false,
    email: null,
    displayName: null,
    username: null,
    avatarUrl: null,
    photoURL: null,
    lastLoginAt: null,
    createdAt: null,
    provider: null,
  });
  const updateUserState = (sessionUser: User | null) => {
    if (sessionUser) {
      const provider = sessionUser.app_metadata?.provider || null;
      user.id = sessionUser.id;
      user.loggedIn = true;
      user.email = sessionUser.email || null;
      user.provider = provider;
      if (provider === 'discord') {
        user.username =
          sessionUser.user_metadata?.full_name ||
          sessionUser.user_metadata?.name?.split('#')[0] ||
          sessionUser.user_metadata?.custom_claims?.global_name ||
          sessionUser.email?.split('@')[0] ||
          null;
        user.displayName = user.username;
      } else if (provider === 'twitch') {
        user.username =
          sessionUser.user_metadata?.preferred_username ||
          sessionUser.user_metadata?.name ||
          sessionUser.email?.split('@')[0] ||
          null;
        user.displayName = sessionUser.user_metadata?.full_name || user.username;
      } else {
        user.username = sessionUser.user_metadata?.name || sessionUser.email?.split('@')[0] || null;
        user.displayName = sessionUser.user_metadata?.full_name || user.username;
      }
      const avatarUrl =
        sessionUser.user_metadata?.avatar_url || sessionUser.user_metadata?.picture || null;
      user.avatarUrl = avatarUrl;
      user.photoURL = avatarUrl;
      user.lastLoginAt = sessionUser.last_sign_in_at || null;
      user.createdAt = sessionUser.created_at || null;
    } else {
      user.id = null;
      user.loggedIn = false;
      user.email = null;
      user.displayName = null;
      user.username = null;
      user.avatarUrl = null;
      user.photoURL = null;
      user.lastLoginAt = null;
      user.createdAt = null;
      user.provider = null;
    }
  };
  supabase.auth.getSession().then(({ data: { session } }) => {
    updateUserState(session?.user || null);
    // Clean up OAuth hash after session is established
    if (session && window.location.hash.includes('access_token')) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      console.log('[Supabase] Cleaned OAuth hash from URL after session established');
    }
  });
  supabase.auth.onAuthStateChange((_event, session) => {
    updateUserState(session?.user || null);
    // Clean up OAuth hash on auth state change
    if (session && window.location.hash.includes('access_token')) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      console.log('[Supabase] Cleaned OAuth hash from URL on auth state change');
    }
  });
  const signInWithOAuth = async (
    provider: 'twitch' | 'discord',
    options?: { skipBrowserRedirect?: boolean; redirectTo?: string }
  ) => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        skipBrowserRedirect: options?.skipBrowserRedirect,
        redirectTo: options?.redirectTo || window.location.origin,
      },
    });
    if (error) throw error;
    return data;
  };
  const signOut = async () => {
    // Clear game progress from localStorage to prevent cross-user contamination
    // This prevents User A's data from being migrated to User B's account
    if (typeof window !== 'undefined') {
      console.log('[Supabase] Clearing game progress localStorage on logout');
      localStorage.removeItem('progress');
      // Keep UI preferences (user store) but you may want to clear user-specific data
      // localStorage.removeItem("user"); // Uncomment if user data should also be cleared
    }
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };
  return {
    provide: {
      supabase: {
        client: supabase,
        user,
        signInWithOAuth,
        signOut,
      },
    },
  };
});
