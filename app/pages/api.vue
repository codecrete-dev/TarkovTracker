<template>
  <div class="container mx-auto max-w-4xl space-y-4 px-4 py-6">
    <UCard class="bg-surface-900 border border-white/10" :ui="{ body: 'space-y-3' }">
      <template #header>
        <h1 class="text-surface-50 text-xl font-semibold">
          {{ $t("page.api.title") }}
        </h1>
      </template>
      <p class="text-surface-200">
        {{ $t("page.api.description") }}
      </p>
      <UAlert
        icon="i-heroicons-information-circle"
        color="primary"
        variant="subtle"
        :title="$t('page.api.auth_required')"
      />
    </UCard>
    <UCard class="bg-surface-900 border border-white/10" :ui="{ body: 'space-y-3' }">
      <template #header>
        <h2 class="text-surface-50 text-lg font-semibold">
          {{ $t("page.api.endpoints.title") }}
        </h2>
      </template>
      <div class="space-y-3">
        <div class="flex items-start gap-3">
          <UBadge color="primary" variant="solid" size="xs">GET</UBadge>
          <div class="space-y-1">
            <div class="text-surface-50 font-medium">/api/items</div>
            <div class="text-surface-300 text-sm">
              {{ $t("page.api.endpoints.items") }}
            </div>
          </div>
        </div>
        <div class="h-px bg-white/5"></div>
        <div class="flex items-start gap-3">
          <UBadge color="primary" variant="solid" size="xs">GET</UBadge>
          <div class="space-y-1">
            <div class="text-surface-50 font-medium">/api/tasks</div>
            <div class="text-surface-300 text-sm">
              {{ $t("page.api.endpoints.tasks") }}
            </div>
          </div>
        </div>
      </div>
    </UCard>
  </div>
</template>
