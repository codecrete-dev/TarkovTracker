<template>
  <UFormGroup :label="$t('app_bar.overflow_menu.display_name')">
    <UInput
      v-model="displayName"
      :placeholder="$t('app_bar.overflow_menu.display_name_placeholder')"
      :maxlength="25"
      icon="i-mdi-account-circle"
    >
      <template #trailing>
        <UButton
          v-if="displayName"
          icon="i-mdi-backspace"
          size="xs"
          color="neutral"
          variant="link"
          :padded="false"
          @click="clearDisplayName"
        />
      </template>
    </UInput>
  </UFormGroup>
</template>
<script setup lang="ts">
  import { computed } from "vue";
  import { useTarkovStore } from "@/stores/tarkov";
  const tarkovStore = useTarkovStore();
  const displayName = computed({
    get: () => tarkovStore.getDisplayName() || "",
    set: (newName) => {
      if (newName && newName.trim()) {
        tarkovStore.setDisplayName(newName.trim());
      } else {
        tarkovStore.setDisplayName(null);
      }
    },
  });
  const clearDisplayName = () => {
    tarkovStore.setDisplayName(null);
  };
</script>
