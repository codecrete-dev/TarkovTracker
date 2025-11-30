import { isRef, onUnmounted, ref, unref, watch, type ComputedRef, type Ref } from 'vue';
import { clearStaleState, devLog, resetStore, safePatchStore } from '@/utils/storeHelpers';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import type { Store } from 'pinia';
export interface SupabaseListenerConfig {
  store: Store;
  table: string;
  filter?: string | Ref<string | undefined> | ComputedRef<string | undefined>;
  primaryKey?: string; // Defaults to 'id' or 'user_id'
  storeId?: string;
  onData?: (data: Record<string, unknown> | null) => void;
  /** Optional sync controller to pause during remote updates */
  syncController?: { pause: () => void; resume: () => void };
}
/**
 * Creates a Supabase realtime listener that automatically manages subscriptions
 * and syncs data with a Pinia store. Supports reactive filter refs for auth changes.
 */
export function useSupabaseListener({
  store,
  table,
  filter,
  storeId,
  onData,
  syncController,
}: SupabaseListenerConfig) {
  const { $supabase } = useNuxtApp();
  const channel = ref<RealtimeChannel | null>(null);
  const isSubscribed = ref(false);
  const storeIdForLogging = storeId || store.$id;
  // Helper to get current filter value (supports both string and ref)
  const getFilterValue = (): string | undefined => unref(filter);
  // Initial fetch
  const fetchData = async () => {
    const currentFilter = getFilterValue();
    if (!currentFilter) return;
    // Parse filter to get column and value
    // Expecting format "column=eq.value"
    const [column, rest] = currentFilter.split('=eq.');
    if (!column || !rest) {
      console.error(`[${storeIdForLogging}] Invalid filter format. Expected 'col=eq.val'`);
      return;
    }
    const { data, error } = await $supabase.client
      .from(table)
      .select('*')
      .eq(column, rest)
      .single();
    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "The result contains 0 rows"
      console.error(`[${storeIdForLogging}] Error fetching initial data:`, error);
      return;
    }
    if (data) {
      devLog(`[${storeIdForLogging}] Initial data received`, data);
      safePatchStore(store, data);
      clearStaleState(store, data);
      if (onData) onData(data);
    } else {
      devLog(`[${storeIdForLogging}] No initial data found`);
      resetStore(store);
      if (onData) onData(null);
    }
  };
  const setupSubscription = () => {
    const currentFilter = getFilterValue();
    if (channel.value) return;
    if (!currentFilter) return;
    devLog(
      `[${storeIdForLogging}] Setting up subscription for ${table} with filter ${currentFilter}`
    );
    channel.value = $supabase.client
      .channel(`public:${table}:${currentFilter}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table,
          filter: currentFilter,
        },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          devLog(`[${storeIdForLogging}] Realtime event received`, payload);
          // Pause sync to prevent bounce loop
          syncController?.pause();
          try {
            if (payload.eventType === 'DELETE') {
              resetStore(store);
              if (onData) onData(null);
            } else {
              // INSERT or UPDATE
              const newData = payload.new as Record<string, unknown>;
              safePatchStore(store, newData);
              clearStaleState(store, newData);
              if (onData) onData(newData);
            }
          } finally {
            // Resume sync after a small delay to let Vue reactivity settle
            setTimeout(() => syncController?.resume(), 100);
          }
        }
      )
      .subscribe((status: string) => {
        isSubscribed.value = status === 'SUBSCRIBED';
        devLog(`[${storeIdForLogging}] Subscription status: ${status}`);
      });
  };
  const cleanup = () => {
    if (channel.value) {
      devLog(`[${storeIdForLogging}] Cleaning up subscription`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      $supabase.client.removeChannel(channel.value as any);
      channel.value = null;
      isSubscribed.value = false;
    }
  };
  // Watch for filter changes - supports both static strings and reactive refs
  const filterSource = isRef(filter) ? filter : () => filter;
  watch(
    filterSource,
    (newFilter) => {
      cleanup();
      if (newFilter) {
        fetchData();
        setupSubscription();
      }
    },
    { immediate: true }
  );
  onUnmounted(() => {
    cleanup();
  });
  return {
    isSubscribed,
    cleanup,
    fetchData,
  };
}
