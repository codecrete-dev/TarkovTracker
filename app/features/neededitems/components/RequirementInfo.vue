<template>
  <div class="flex items-center text-sm">
    <!-- Level Requirement -->
    <div v-if="showLevelRequirement" class="mr-2 flex items-center">
      <UIcon name="i-mdi-menu-right" class="h-5 w-5" />
      <i18n-t keypath="page.tasks.questcard.level" scope="global">
        <template #count>{{ levelRequired }}</template>
      </i18n-t>
    </div>
    <!-- Locked Before -->
    <div v-if="lockedBefore > 0" class="mr-2 flex items-center">
      <UIcon name="i-mdi-lock-open-outline" class="h-5 w-5" />
      <i18n-t keypath="page.tasks.questcard.lockedbefore" scope="global">
        <template #count>{{ lockedBefore }}</template>
      </i18n-t>
    </div>
    <!-- Station Info for Hideout -->
    <div v-if="needType === 'hideoutModule'" class="mr-2 flex items-center">
      <station-link :station="relatedStation" />
      <span class="ml-1">{{ hideoutLevel }}</span>
    </div>
  </div>
</template>
<script setup lang="ts">
  import { computed } from "vue";
  import StationLink from "~/features/hideout/StationLink.vue";
  const props = defineProps<{
    needType: string;
    levelRequired: number;
    lockedBefore: number;
    playerLevel: number;
    relatedStation?: Record<string, unknown>;
    hideoutLevel?: number;
  }>();
  const showLevelRequirement = computed(
    () => props.levelRequired > 0 && props.levelRequired > props.playerLevel
  );
</script>
