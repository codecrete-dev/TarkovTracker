<template>
  <div class="flex items-center gap-1">
    <!-- Counter controls group with background -->
    <div
      class="flex items-center rounded-md border border-gray-300 bg-white dark:border-white/10 dark:bg-white/5"
    >
      <!-- Decrease button -->
      <button
        v-tooltip="t('page.neededitems.decrease_count')"
        type="button"
        :disabled="currentCount <= 0"
        class="hover-effect flex h-7 w-7 cursor-pointer items-center justify-center rounded-l-md text-gray-500 transition-colors disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-300"
        :aria-label="t('page.neededitems.decrease_count')"
        @click="$emit('decrease')"
      >
        <UIcon name="i-mdi-minus" aria-hidden="true" class="h-4 w-4" />
      </button>
      <div
        class="flex h-7 min-w-14 items-center justify-center px-2 text-[11px] font-semibold text-gray-900 tabular-nums dark:text-gray-100"
      >
        <template v-if="isEditing">
          <input
            ref="inputRef"
            v-model.number="editValue"
            type="number"
            :min="0"
            :max="neededCount"
            class="h-full w-full bg-transparent px-0.5 text-center text-[11px] font-semibold text-gray-900 focus:outline-none dark:text-gray-100"
            @blur="submitEdit"
            @keydown.enter="submitEdit"
            @keydown.escape="cancelEdit"
          />
        </template>
        <template v-else>
          <button
            v-tooltip="t('page.neededitems.click_to_enter_value')"
            class="hover-effect h-full w-full cursor-pointer px-0.5 text-[11px] font-semibold text-gray-900 transition-colors dark:text-gray-100"
            :aria-label="t('page.neededitems.click_to_enter_value')"
            @click="startEditing"
          >
            {{ formatNumber(currentCount) }}/{{ formatNumber(neededCount) }}
          </button>
        </template>
      </div>
      <!-- Increase button -->
      <button
        v-tooltip="t('page.neededitems.increase_count')"
        type="button"
        :disabled="currentCount >= neededCount"
        class="hover-effect flex h-7 w-7 cursor-pointer items-center justify-center rounded-r-md text-gray-500 transition-colors disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-300"
        :aria-label="t('page.neededitems.increase_count')"
        @click="$emit('increase')"
      >
        <UIcon name="i-mdi-plus" aria-hidden="true" class="h-4 w-4" />
      </button>
    </div>
    <!-- Mark as 100% complete button -->
    <ToggleButton
      :is-active="currentCount >= neededCount"
      variant="complete"
      :tooltip="
        currentCount >= neededCount
          ? t('page.neededitems.mark_as_incomplete')
          : t('page.neededitems.mark_as_complete_100')
      "
      :aria-label="
        currentCount >= neededCount
          ? t('page.neededitems.mark_as_incomplete')
          : t('page.neededitems.mark_as_complete_100')
      "
      @toggle="$emit('toggle')"
    />
  </div>
</template>
<script setup lang="ts">
  import { ref, nextTick, watch } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { useLocaleNumberFormatter } from '@/utils/formatters';
  const { t } = useI18n();
  const formatNumber = useLocaleNumberFormatter();
  const props = defineProps<{
    currentCount: number;
    neededCount: number;
  }>();
  const emit = defineEmits<{
    decrease: [];
    increase: [];
    toggle: [];
    setCount: [count: number];
  }>();
  const isEditing = ref(false);
  const editValue = ref(0);
  const inputRef = ref<HTMLInputElement | null>(null);
  const startEditing = () => {
    editValue.value = props.currentCount;
    isEditing.value = true;
    nextTick(() => {
      inputRef.value?.focus();
      inputRef.value?.select();
    });
  };
  const submitEdit = () => {
    if (isEditing.value) {
      // Clamp value between 0 and neededCount
      const clampedValue = Math.max(0, Math.min(editValue.value || 0, props.neededCount));
      emit('setCount', clampedValue);
      isEditing.value = false;
    }
  };
  const cancelEdit = () => {
    isEditing.value = false;
  };
  // Close editing if currentCount changes externally
  watch(
    () => props.currentCount,
    () => {
      if (isEditing.value) {
        isEditing.value = false;
      }
    }
  );
</script>
