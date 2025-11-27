<template>
  <div>
    <template v-if="!xs">
      <div class="m-0 p-0">
        <div class="mb-2 flex text-lg">
          <div class="w-full">
            <task-link :task="task" />
          </div>
        </div>
        <UTooltip v-if="task.minPlayerLevel != 0" text="Minimum level required to access task">
          <InfoRow icon="mdi-menu-right" class="text-sm text-gray-400">
            <i18n-t keypath="page.tasks.questcard.level" scope="global">
              <template #count>{{ task.minPlayerLevel }}</template>
            </i18n-t>
          </InfoRow>
        </UTooltip>
        <InfoRow
          v-if="task?.predecessors?.length"
          icon="mdi-lock-open-outline"
          class="mb-1 text-sm text-gray-400"
        >
          <i18n-t keypath="page.tasks.questcard.lockedbefore" scope="global">
            <template #count>{{ lockedBefore }}</template>
          </i18n-t>
        </InfoRow>
        <InfoRow v-if="task?.successors?.length" icon="mdi-lock" class="mb-1 text-sm text-gray-400">
          <i18n-t keypath="page.tasks.questcard.lockedbehind" scope="global">
            <template #count>{{ lockedBehind }}</template>
          </i18n-t>
        </InfoRow>
        <InfoRow v-if="task?.factionName != 'Any'" class="mb-1 text-sm text-gray-400">
          <template #icon>
            <img :src="factionImage" class="mx-1 h-6 w-6 invert" />
          </template>
          {{ task.factionName }}
        </InfoRow>
        <div v-if="nonKappa" class="mb-1 flex">
          <div class="mr-1">
            <UBadge size="xs" color="error" variant="outline">
              {{ t("page.tasks.questcard.nonkappa") }}
            </UBadge>
          </div>
        </div>
        <InfoRow
          v-if="activeUserView === 'all' && neededBy.length > 0"
          icon="mdi-account-multiple-outline"
          class="mb-1 text-sm text-gray-400"
        >
          <i18n-t keypath="page.tasks.questcard.neededby" scope="global">
            <template #names>{{ neededBy.join(", ") }}</template>
          </i18n-t>
        </InfoRow>
      </div>
    </template>
    <template v-else>
      <task-link :task="task" class="flex justify-center" />
    </template>
  </div>
</template>
<script setup lang="ts">
  import { useI18n } from "vue-i18n";
  import TaskLink from "./TaskLink.vue";
  import InfoRow from "./InfoRow.vue";

  interface Task {
    minPlayerLevel: number;
    predecessors?: unknown[];
    successors?: unknown[];
    factionName: string;
    wikiLink: string;
  }
  defineProps<{
    task: Task;
    xs: boolean;
    lockedBefore: number;
    lockedBehind: number;
    factionImage: string;
    nonKappa: boolean;
    neededBy: string[];
    activeUserView: string;
  }>();
  const { t } = useI18n({ useScope: "global" });
</script>
