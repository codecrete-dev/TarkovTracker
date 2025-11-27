<template>
  <span>
    <div
      class="flex cursor-pointer items-center rounded p-1 transition-colors duration-200"
      :class="{
        'from-success-500/20 bg-linear-to-b to-transparent': isComplete,
        'hover:bg-white/5': !isComplete,
      }"
      @click="toggleObjectiveCompletion()"
      @mouseenter="objectiveMouseEnter()"
      @mouseleave="objectiveMouseLeave()"
    >
      <UIcon
        :name="objectiveIcon.startsWith('mdi-') ? `i-${objectiveIcon}` : objectiveIcon"
        class="mr-1 h-4 w-4 shrink-0"
      />
      <span class="text-base">{{ props.objective?.description }}</span>

      <!-- Counter for shoot/kill objectives -->
      <div
        v-if="
          fullObjective &&
          showCounterTypes.includes(fullObjective.type) &&
          (fullObjective.count ?? 0) > 1
        "
        class="ml-2"
        @click.stop
      >
        <ItemCountControls
          :current-count="currentObjectiveCount"
          :needed-count="fullObjective.count ?? 1"
          @decrease="decreaseCount"
          @increase="increaseCount"
          @toggle="toggleCount"
        />
      </div>
    </div>
    <div
      v-if="
        fullObjective &&
        ((systemStore.userTeam && userNeeds.length > 0) ||
          itemObjectiveTypes.includes(fullObjective.type))
      "
      class="mt-px mb-px flex items-center text-xs"
    >
      <div v-if="fullObjective && itemObjectiveTypes.includes(fullObjective.type)" class="w-full">
        <div
          class="mb-2 rounded p-1 transition-colors duration-200"
          :class="
            isItemCollected ? 'from-success-500/20 bg-linear-to-b to-transparent' : 'bg-gray-800'
          "
        >
          <GameItem
            :item-id="relatedItem.id"
            :item-name="relatedItem.shortName"
            :dev-link="relatedItem.link"
            :wiki-link="relatedItem.wikiLink"
            :task-id="relatedTask?.id"
            :task-name="relatedTask?.name"
            :task-wiki-link="relatedTask?.wikiLink"
            :count="fullObjective.count ?? 1"
            :clickable="true"
            :show-actions="false"
            :show-counter="(fullObjective.count ?? 1) > 1"
            :current-count="currentItemCount"
            :needed-count="fullObjective.count"
            size="large"
            class="cursor-pointer"
            @click="handleItemClick"
            @decrease="decreaseCount"
            @increase="increaseCount"
            @toggle="toggleCount"
          />
        </div>
      </div>
      <div v-if="systemStore.userTeam && userNeeds.length > 0" class="flex items-center">
        <span v-for="(user, userIndex) in userNeeds" :key="userIndex" class="flex items-center">
          <UIcon name="i-mdi-account-child-circle" class="ml-1 h-4 w-4" />
          {{ progressStore.teammemberNames[user] }}
        </span>
      </div>
      <div v-if="objective.type === 'mark'">
        <!-- Mark specific content -->
      </div>
      <div v-if="objective.type === 'zone'">
        <!-- Zone specific content -->
      </div>
    </div>
  </span>
</template>
<script setup>
  import { computed, ref, watch, defineAsyncComponent } from "vue";
  import { useTarkovStore } from "@/stores/tarkov";
  import { useMetadataStore } from "@/stores/metadata";
  import { useProgressStore } from "@/stores/progress";
  import { useSystemStoreWithSupabase } from "@/stores/useSystemStore";

  const ItemCountControls = defineAsyncComponent(
    () => import("@/features/neededitems/components/ItemCountControls.vue")
  );

  const { systemStore } = useSystemStoreWithSupabase();
  // Define the props for the component
  const props = defineProps({
    objective: {
      type: Object,
      required: true,
    },
  });

  const metadataStore = useMetadataStore();
  const objectives = computed(() => metadataStore.objectives);
  const tarkovStore = useTarkovStore();
  const progressStore = useProgressStore();
  const tasks = computed(() => metadataStore.tasks);
  const isComplete = computed(() => {
    return tarkovStore.isTaskObjectiveComplete(props.objective.id);
  });
  const fullObjective = computed(() => {
    return objectives.value.find((o) => o.id == props.objective.id);
  });

  const relatedTask = computed(() => {
    if (!fullObjective.value?.taskId) return null;
    return tasks.value.find((t) => t.id === fullObjective.value.taskId);
  });
  const itemObjectiveTypes = ["giveItem", "mark", "buildWeapon", "plantItem"];
  // Objective types that should show a counter (for kill tracking, etc.)
  const showCounterTypes = ["shoot"];
  const relatedItem = computed(() => {
    if (!fullObjective.value) {
      return null;
    }
    switch (fullObjective.value.type) {
      case "giveItem":
        return fullObjective.value.item;
      case "mark":
        return fullObjective.value.markerItem;
      case "buildWeapon": {
        // Prefer the defaultPreset (full build) if available
        const item = fullObjective.value.item;
        if (item?.properties?.defaultPreset) {
          return item.properties.defaultPreset;
        }
        return item;
      }
      case "plantItem":
        return fullObjective.value.item;
      default:
        return null;
    }
  });
  const userNeeds = computed(() => {
    const needingUsers = [];
    if (fullObjective.value == undefined) {
      return needingUsers;
    }
    Object.entries(progressStore.unlockedTasks[fullObjective.value.taskId]).forEach(
      ([teamId, unlocked]) => {
        if (
          unlocked &&
          progressStore.objectiveCompletions?.[props.objective.id]?.[teamId] == false
        ) {
          needingUsers.push(teamId);
        }
      }
    );
    return needingUsers;
  });
  const isHovered = ref(false);
  const objectiveMouseEnter = () => {
    isHovered.value = true;
  };
  const objectiveMouseLeave = () => {
    isHovered.value = false;
  };
  const objectiveIcon = computed(() => {
    if (isHovered.value) {
      if (isComplete.value) {
        return "mdi-close-circle";
      } else {
        return "mdi-check-circle";
      }
    }
    const iconMap = {
      key: "mdi-key",
      shoot: "mdi-target-account",
      giveItem: "mdi-close-circle-outline",
      findItem: "mdi-checkbox-marked-circle-outline",
      findQuestItem: "mdi-alert-circle-outline",
      giveQuestItem: "mdi-alert-circle-check-outline",
      plantQuestItem: "mdi-arrow-down-thin-circle-outline",
      plantItem: "mdi-arrow-down-thin-circle-outline",
      taskStatus: "mdi-account-child-circle",
      extract: "mdi-heart-circle-outline",
      mark: "mdi-remote",
      place: "mdi-arrow-down-drop-circle-outline",
      traderLevel: "mdi-thumb-up",
      traderStanding: "mdi-thumb-up",
      skill: "mdi-dumbbell",
      visit: "mdi-crosshairs-gps",
      buildWeapon: "mdi-progress-wrench",
      playerLevel: "mdi-crown-circle-outline",
      experience: "mdi-eye-circle-outline",
      warning: "mdi-alert-circle",
    };
    return iconMap[props.objective.type] || "mdi-help-circle";
  });
  const toggleObjectiveCompletion = () => {
    if (isComplete.value) {
      const currentCount = currentObjectiveCount.value;
      const neededCount = fullObjective.value.count ?? 1;
      if (currentCount >= neededCount) {
        tarkovStore.setObjectiveCount(props.objective.id, Math.max(0, neededCount - 1));
      }
    }
    tarkovStore.toggleTaskObjectiveComplete(props.objective.id);
  };

  const currentItemCount = computed(() => {
    return tarkovStore.getObjectiveCount(props.objective.id);
  });

  const currentObjectiveCount = computed(() => {
    return tarkovStore.getObjectiveCount(props.objective.id);
  });

  const isItemCollected = computed(() => {
    const neededCount = fullObjective.value.count ?? 1;
    return currentItemCount.value >= neededCount;
  });

  // Watch for objective completion to auto-complete item collection
  watch(isComplete, (newVal) => {
    if (newVal) {
      // If objective is marked complete, ensure item is marked collected
      const neededCount = fullObjective.value.count ?? 1;
      tarkovStore.setObjectiveCount(props.objective.id, neededCount);
    }
  });

  const handleItemClick = (event) => {
    // Prevent bubbling to the objective click handler if needed, though they are separate elements
    event.stopPropagation();

    // If multi-item, clicking the item itself (not the controls) should probably just increment
    // or maybe do nothing if controls are present?
    // The user requested controls "similar to Needed Items", which implies the controls handle the interaction.
    // But for single items, we still want the click-to-toggle behavior.

    const neededCount = fullObjective.value.count ?? 1;

    if (neededCount > 1) {
      // For multi-item, let the controls handle it, or maybe clicking the icon increments?
      // Let's keep increment behavior on icon click for consistency, but controls offer fine-grained.
      increaseCount();
    } else {
      // Single item behavior (toggle)
      toggleCount();
    }
  };

  const decreaseCount = () => {
    const currentCount = currentItemCount.value;
    if (currentCount > 0) {
      const newCount = currentCount - 1;
      tarkovStore.setObjectiveCount(props.objective.id, newCount);

      // If we drop below needed count and objective was complete, uncomplete it
      const neededCount = fullObjective.value.count ?? 1;
      if (newCount < neededCount && isComplete.value) {
        tarkovStore.setTaskObjectiveUncomplete(props.objective.id);
      }
    }
  };

  const increaseCount = () => {
    const currentCount = currentItemCount.value;
    const neededCount = fullObjective.value.count ?? 1;

    if (currentCount < neededCount) {
      const newCount = currentCount + 1;
      tarkovStore.setObjectiveCount(props.objective.id, newCount);

      if (newCount >= neededCount && !isComplete.value) {
        tarkovStore.setTaskObjectiveComplete(props.objective.id);
      }
    }
  };

  const toggleCount = () => {
    const currentCount = currentItemCount.value;
    const neededCount = fullObjective.value.count ?? 1;

    if (currentCount >= neededCount) {
      tarkovStore.setObjectiveCount(props.objective.id, Math.max(0, neededCount - 1));
      if (isComplete.value) {
        tarkovStore.setTaskObjectiveUncomplete(props.objective.id);
      }
    } else {
      tarkovStore.setObjectiveCount(props.objective.id, neededCount);
      if (!isComplete.value) {
        tarkovStore.setTaskObjectiveComplete(props.objective.id);
      }
    }
  };
</script>
