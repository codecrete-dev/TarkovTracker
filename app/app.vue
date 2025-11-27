<template>
  <UApp>
    <div id="app" class="bg-background text-surface-200 flex min-h-screen flex-col font-sans">
      <NuxtRouteAnnouncer />
      <NuxtLayout>
        <NuxtPage />
      </NuxtLayout>
      <!-- Portal target for modals -->
      <div id="modals"></div>
    </div>
  </UApp>
</template>
<script setup lang="ts">
  import { onMounted } from "vue";
  import { useI18n } from "vue-i18n";
  import { usePreferencesStore } from "@/stores/preferences";
  import { markDataMigrated } from "@/plugins/store-initializer";
  import { useTarkovStore, initializeTarkovSync } from "@/stores/tarkov";
  const { $supabase } = useNuxtApp();
  const preferencesStore = usePreferencesStore();
  const { locale } = useI18n({ useScope: "global" });
  // Note: metadataStore is initialized via metadata.client.ts plugin
  onMounted(async () => {
    const localeOverride = preferencesStore.localeOverride;
    if (localeOverride) {
      locale.value = localeOverride;
    }
    if ($supabase.user.loggedIn) {
      await initializeTarkovSync();
      // initializeProgressSync() removed - tarkov.ts is now the sole sync handler
    }
    const wasMigrated = sessionStorage.getItem("tarkovDataMigrated") === "true";
    if (wasMigrated && $supabase.user.loggedIn) {
      markDataMigrated();
      try {
        const store = useTarkovStore();
        if (typeof store.migrateDataIfNeeded === "function") {
          store.migrateDataIfNeeded();
        }
      } catch (error) {
        console.error("Error initializing store in App component:", error);
      }
    }
  });
</script>
