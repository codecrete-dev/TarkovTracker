<template>
  <UModal :model-value="props.show" @update:model-value="$emit('update:show', $event)">
    <UCard>
      <template #header>
        <div class="px-4 py-3 text-xl font-medium">Confirm Data Import</div>
      </template>
      <div class="px-4 pb-4">
        <p class="mb-3">This will import your progress data into your PvP profile:</p>
        <!-- Game Mode Selection - Fixed to PvP Only -->
        <div class="mb-4 rounded-lg bg-gray-800 p-3">
          <div class="flex items-center">
            <UIcon name="i-mdi-sword-cross" class="mr-2 h-4 w-4" />
            <span class="font-medium">Target Game Mode: PvP</span>
          </div>
          <UAlert
            icon="i-mdi-information"
            color="primary"
            variant="soft"
            class="mt-3 mb-0"
            title="Data will be imported to your PvP (standard multiplayer) progress"
          />
        </div>
        <p class="mb-4">Data to be imported:</p>
        <DataPreviewCard
          :data="data"
          :completed-tasks="completedTasks"
          :failed-tasks="failedTasks"
          :task-objectives="taskObjectives"
          :hideout-modules="hideoutModules"
          :hideout-parts="hideoutParts"
          @show-objectives-details="$emit('show-objectives-details')"
          @show-failed-tasks-details="$emit('show-failed-tasks-details')"
        />
        <p class="mt-5 font-bold text-red-500">Warning: This action cannot be undone!</p>
      </div>
      <template #footer>
        <div class="flex justify-end px-4 pb-4">
          <UButton color="neutral" variant="solid" class="px-4" @click="$emit('cancel')">
            Cancel
          </UButton>
          <UButton
            color="error"
            variant="solid"
            :loading="importing"
            class="ml-3 px-4"
            @click="$emit('confirm')"
          >
            Confirm Import
          </UButton>
        </div>
      </template>
    </UCard>
  </UModal>
</template>
<script setup lang="ts">
  const props = defineProps({
    show: {
      type: Boolean,
      default: false,
    },
    data: {
      type: Object,
      default: null,
    },
    completedTasks: {
      type: Number,
      default: 0,
    },
    failedTasks: {
      type: Number,
      default: 0,
    },
    taskObjectives: {
      type: Number,
      default: 0,
    },
    hideoutModules: {
      type: Number,
      default: 0,
    },
    hideoutParts: {
      type: Number,
      default: 0,
    },
    importing: {
      type: Boolean,
      default: false,
    },
  });
  defineEmits([
    "cancel",
    "confirm",
    "show-objectives-details",
    "show-failed-tasks-details",
    "update:show",
  ]);
</script>
