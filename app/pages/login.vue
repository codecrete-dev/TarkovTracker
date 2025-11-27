<template>
  <div class="bg-surface-950 flex min-h-screen items-center justify-center p-4">
    <UCard
      class="bg-surface-900 w-full max-w-xl shadow-2xl ring-1 ring-white/10"
      :ui="{
        body: 'p-0',
        header: 'p-0',
        footer: 'p-0',
      }"
    >
      <!-- Header Section -->
      <div class="flex flex-col items-center px-10 pt-12 pb-8 text-center">
        <tracker-logo class="mb-8 scale-150" :is-collapsed="false" />
        <h1 class="mb-4 text-4xl font-bold tracking-tight text-white">
          {{ $t("page.login.title") }}
        </h1>
        <p class="text-lg text-gray-400">
          {{ $t("page.login.subtitle") }}
        </p>
      </div>

      <!-- Auth Buttons -->
      <div class="px-10 pb-10">
        <auth-buttons />
      </div>

      <!-- Footer Links -->
      <div class="rounded-b-lg border-t border-white/5 bg-black/20 px-8 py-5">
        <div class="flex items-center justify-between">
          <UButton
            to="/privacy"
            target="_blank"
            variant="ghost"
            color="neutral"
            size="sm"
            class="text-gray-500 transition-colors hover:text-gray-300"
          >
            {{ $t("page.login.privacy_policy") }}
          </UButton>
          <UButton
            to="/terms"
            target="_blank"
            variant="ghost"
            color="neutral"
            size="sm"
            class="text-gray-500 transition-colors hover:text-gray-300"
          >
            {{ $t("page.login.terms_of_service") }}
          </UButton>
        </div>
      </div>
    </UCard>
  </div>
</template>
<script setup lang="ts">
  import AuthButtons from "@/features/auth/AuthButtons.vue";
  import TrackerLogo from "@/features/drawer/TrackerLogo.vue";
</script>
<style scoped>
  /* Scoped styles removed as we use Tailwind utility classes */
</style>
