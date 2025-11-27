import { onUnmounted, ref, watch } from "vue";
import type { Store } from "pinia";
import type { RealtimePostgresChangesPayload, RealtimeChannel } from "@supabase/supabase-js";
import { clearStaleState, safePatchStore, resetStore, devLog } from "@/utils/storeHelpers";
export interface SupabaseListenerConfig {
  store: Store;
  table: string;
  filter?: string; // e.g., 'user_id=eq.uuid'
  primaryKey?: string; // Defaults to 'id' or 'user_id'
  storeId?: string;
  onData?: (data: Record<string, unknown> | null) => void;
}
/**
 * Creates a Supabase realtime listener that automatically manages subscriptions
 * and syncs data with a Pinia store
 */
export function useSupabaseListener({
  store,
  table,
  filter,
  storeId,
  onData,
}: SupabaseListenerConfig) {
  const { $supabase } = useNuxtApp();
  const channel = ref<RealtimeChannel | null>(null);
  const isSubscribed = ref(false);
  const storeIdForLogging = storeId || store.$id;
  // Initial fetch
  const fetchData = async () => {
    if (!filter) return;
    // Parse filter to get column and value
    // Expecting format "column=eq.value"
    const [column, rest] = filter.split("=eq.");
    if (!column || !rest) {
      console.error(`[${storeIdForLogging}] Invalid filter format. Expected 'col=eq.val'`);
      return;
    }
    const { data, error } = await $supabase.client
      .from(table)
      .select("*")
      .eq(column, rest)
      .single();
    if (error && error.code !== "PGRST116") {
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
    if (channel.value) return;
    if (!filter) return;
    devLog(`[${storeIdForLogging}] Setting up subscription for ${table} with filter ${filter}`);
    channel.value = $supabase.client
      .channel(`public:${table}:${filter}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: table,
          filter: filter,
        },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          devLog(`[${storeIdForLogging}] Realtime event received`, payload);
          if (payload.eventType === "DELETE") {
            resetStore(store);
            if (onData) onData(null);
          } else {
            // INSERT or UPDATE
            const newData = payload.new as Record<string, unknown>;
            safePatchStore(store, newData);
            clearStaleState(store, newData);
            if (onData) onData(newData);
          }
        }
      )
      .subscribe((status: string) => {
        isSubscribed.value = status === "SUBSCRIBED";
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
  watch(
    () => filter,
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
