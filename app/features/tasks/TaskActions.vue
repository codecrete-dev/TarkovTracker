<template>
  <div class="block">
    <template v-if="!isComplete && !isLocked">
      <ActionButton
        :xs="xs"
        color="success"
        icon="mdi-check-all"
        :text="t('page.tasks.questcard.completebutton').toUpperCase()"
        :ui="completeButtonUi"
        @click="$emit('complete')"
      />
      <AlternativesList
        v-if="task.alternatives?.length"
        :alternatives="task.alternatives"
        :tasks="tasks"
      />
    </template>
    <template v-else-if="isComplete">
      <ActionButton
        :xs="xs"
        color="accent"
        icon="mdi-undo"
        :text="t('page.tasks.questcard.uncompletebutton')"
        @click="$emit('uncomplete')"
      />
      <AlternativesList
        v-if="task.alternatives?.length"
        :alternatives="task.alternatives"
        :tasks="tasks"
        :label="t('page.tasks.questcard.alternativefailed')"
      />
    </template>
    <template v-else-if="!isOurFaction">
      {{ t('page.tasks.questcard.differentfaction') }}
    </template>
    <template v-else-if="isLocked">
      <div :class="xs ? 'flex justify-center' : ''">
        <ActionButton
          :xs="xs"
          color="accent"
          icon="mdi-fast-forward"
          :text="t('page.tasks.questcard.availablebutton')"
          :size="xs ? 'small' : 'x-large'"
          class="mx-1 my-1"
          @click="$emit('unlock')"
        />
        <ActionButton
          :xs="xs"
          color="success"
          icon="mdi-check-all"
          :text="t('page.tasks.questcard.completebutton').toUpperCase()"
          :ui="completeButtonUi"
          :size="xs ? 'small' : 'x-large'"
          class="mx-1 my-1"
          @click="$emit('complete')"
        />
      </div>
    </template>
  </div>
</template>
<script setup>
  import { defineAsyncComponent } from 'vue';
  import { useI18n } from 'vue-i18n';
  const ActionButton = defineAsyncComponent(() => import('./ActionButton'));
  const AlternativesList = defineAsyncComponent(() => import('./AlternativesList'));
  const completeButtonUi = {
    base: 'bg-success-500 hover:bg-success-600 active:bg-success-700 text-white border border-success-700',
  };
  defineProps({
    task: { type: Object, required: true },
    tasks: { type: Object, required: true },
    xs: { type: Boolean, required: true },
    isComplete: { type: Boolean, required: true },
    isLocked: { type: Boolean, required: true },
    isOurFaction: { type: Boolean, required: true },
  });
  defineEmits(['complete', 'uncomplete', 'unlock']);
  const { t } = useI18n({ useScope: 'global' });
</script>
