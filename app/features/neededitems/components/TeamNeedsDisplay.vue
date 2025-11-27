<template>
  <div class="text-center text-sm">
    <i18n-t keypath="page.neededitems.neededby" scope="global">
      <template #users>
        <div
          v-for="(userNeed, userIndex) in teamNeeds"
          :key="userIndex"
          class="flex items-center justify-center"
        >
          <UIcon name="i-mdi-account-child-circle" class="mr-1 h-5 w-5" />
          {{ getDisplayName(userNeed.user) }}
          {{ userNeed.count.toLocaleString() }}/{{ neededCount.toLocaleString() }}
        </div>
      </template>
    </i18n-t>
  </div>
</template>
<script setup lang="ts">
  import { useProgressStore } from "@/stores/progress";
  interface UserNeed {
    user: string;
    count: number;
  }
  defineProps<{
    teamNeeds: UserNeed[];
    neededCount: number;
  }>();
  const progressStore = useProgressStore();
  const getDisplayName = (user: string) => progressStore.getDisplayName(user);
</script>
