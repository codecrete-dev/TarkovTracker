<template>
  <div class="w-full">
    <UAlert
      icon="i-mdi-clipboard-search"
      color="primary"
      variant="soft"
      :title="t('page.tasks.notasksfound')"
    />
  </div>
</template>
<script setup lang="ts">
  import { useI18n } from "vue-i18n";
  const { t } = useI18n({ useScope: "global" });
</script>
