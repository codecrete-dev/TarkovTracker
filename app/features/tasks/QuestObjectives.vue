<template>
  <div class="flex flex-col">
    <div
      v-for="(objective, objectiveIndex) in objectives"
      :key="objectiveIndex"
      class="w-full py-1"
    >
      <task-objective :objective="objective" />
    </div>
    <div v-if="irrelevantCount > 0" class="flex w-full items-center p-1 opacity-50">
      <UIcon name="i-mdi-eye-off" class="mr-1 h-4 w-4" />
      <i18n-t
        keypath="page.tasks.questcard.objectiveshidden"
        :plural="irrelevantCount"
        scope="global"
      >
        <template #count>{{ irrelevantCount }}</template>
        <template #uncompleted>{{ uncompletedIrrelevant }}</template>
      </i18n-t>
    </div>
  </div>
</template>
<script setup>
  import TaskObjective from "./TaskObjective.vue";
  defineProps({
    objectives: { type: Array, required: true },
    irrelevantCount: { type: Number, required: true },
    uncompletedIrrelevant: { type: Number, required: true },
  });
</script>
