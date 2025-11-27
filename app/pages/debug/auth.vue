<template>
  <div class="container mx-auto max-w-4xl space-y-4 px-4 py-6">
    <UCard class="bg-surface-900 border border-white/10" :ui="{ body: 'space-y-4' }">
      <template #header>
        <div class="space-y-1">
          <h1 class="text-surface-50 text-xl font-semibold">Supabase Auth Debug Page</h1>
          <p class="text-surface-300 text-sm">Testing Supabase Authentication</p>
        </div>
      </template>

      <div class="space-y-3">
        <UAlert
          v-if="!user.loggedIn"
          icon="i-mdi-alert"
          color="warning"
          variant="subtle"
          :title="
            $t ? $t('debug.auth.not_logged_in', 'You are not logged in') : 'You are not logged in'
          "
        />
        <UAlert
          v-else
          icon="i-mdi-check"
          color="success"
          variant="subtle"
          :title="
            $t
              ? $t('debug.auth.logged_in', 'Successfully authenticated!')
              : 'Successfully authenticated!'
          "
        />

        <div class="bg-surface-800/80 space-y-3 rounded-lg border border-white/5 p-4">
          <h3 class="text-surface-100 text-sm font-semibold">Auth State</h3>
          <div class="text-surface-300 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
            <div>
              <span class="font-semibold">Logged In:</span>
              {{ user.loggedIn }}
            </div>
            <div>
              <span class="font-semibold">ID:</span>
              {{ user.id || "N/A" }}
            </div>
            <div>
              <span class="font-semibold">Email:</span>
              {{ user.email || "N/A" }}
            </div>
            <div>
              <span class="font-semibold">Provider:</span>
              {{ user.app_metadata?.provider || "N/A" }}
            </div>
            <div>
              <span class="font-semibold">Last Sign In:</span>
              {{ user.last_sign_in_at || "N/A" }}
            </div>
            <div>
              <span class="font-semibold">Created At:</span>
              {{ user.created_at || "N/A" }}
            </div>
          </div>
        </div>

        <div class="bg-surface-800/80 space-y-3 rounded-lg border border-white/5 p-4">
          <h3 class="text-surface-100 text-sm font-semibold">User Store State</h3>
          <div class="text-surface-300 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
            <div>
              <span class="font-semibold">ID from Store:</span>
              {{ user.id || "N/A" }}
            </div>
            <div>
              <span class="font-semibold">Store Initialized:</span>
              {{ preferencesStore ? "Yes" : "No" }}
            </div>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <AuthButtons v-if="!user.loggedIn" />
          <UButton
            v-if="user.loggedIn"
            color="error"
            variant="soft"
            icon="i-mdi-logout"
            @click="handleLogout"
          >
            Logout
          </UButton>
        </div>

        <div class="space-y-2 border-t border-white/10 pt-3">
          <h3 class="text-surface-100 text-sm font-semibold">Raw User Object</h3>
          <pre class="debug-json">{{ JSON.stringify(user, null, 2) }}</pre>
        </div>
      </div>
    </UCard>
  </div>
</template>
<script setup lang="ts">
  import { usePreferencesStore } from "@/stores/preferences";
  const { $supabase } = useNuxtApp();
  const user = $supabase.user;
  const preferencesStore = usePreferencesStore();
  const handleLogout = async () => {
    try {
      await $supabase.signOut();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };
</script>
<style scoped>
  .debug-json {
    max-height: 400px;
    overflow-y: auto;
    padding: 16px;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 4px;
    font-size: 12px;
    border: 1px solid rgba(255, 255, 255, 0.05);
  }
</style>
