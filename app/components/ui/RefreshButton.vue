<template>
  <UButton v-if="refreshEnabled" variant="soft" color="primary" @click="refresh()">
    {{ t('common.refreshbutton') }}
  </UButton>
</template>
<script setup>
  import { storeToRefs } from 'pinia';
  import { ref } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { useRouter } from 'vue-router';
  import { useMetadataStore } from '@/stores/useMetadata';
  const { t } = useI18n({ useScope: 'global' });
  const metadataStore = useMetadataStore();
  const { loading, hideoutLoading } = storeToRefs(metadataStore);
  const router = useRouter();
  const refreshEnabled = ref(false);
  // Wait 10 seconds, then enable the button if we're still loading
  setTimeout(() => {
    if (loading.value || hideoutLoading.value) {
      refreshEnabled.value = true;
    }
  }, 10000);
  const refresh = () => {
    router.go(0);
  };
</script>
