<template>
  <div class="flex w-full flex-col items-center justify-center py-4">
    <div class="mb-2 flex items-center">
      <UIcon name="i-mdi-loading" class="mr-2 h-6 w-6 animate-spin text-gray-400" />
      <span class="text-gray-400">{{ t('page.tasks.loading') }}</span>
    </div>
    <refresh-button />
  </div>
</template>
<script setup lang="ts">
  import { useI18n } from 'vue-i18n';
  import RefreshButton from '@/components/ui/RefreshButton.vue';
  const { t } = useI18n({ useScope: 'global' });
</script>
