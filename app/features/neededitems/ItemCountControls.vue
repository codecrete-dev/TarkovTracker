<template>
  <div class="flex items-center gap-2">
    <!-- Counter controls group with background -->
    <div class="flex items-center rounded-lg bg-surface-700 border border-white/20 shadow-sm">
      <!-- Decrease button -->
      <button
        class="flex items-center justify-center w-9 h-9 rounded-l-lg text-surface-200 hover:bg-surface-600 hover:text-white active:bg-surface-500 transition-colors"
        title="Decrease count"
        @click="$emit('decrease')"
      >
        <UIcon name="i-mdi-minus" class="h-5 w-5" />
      </button>

      <!-- Editable count display -->
      <div class="min-w-[80px] h-9 border-x border-white/20 bg-surface-800 flex items-center justify-center">
        <template v-if="isEditing">
          <input
            ref="inputRef"
            v-model.number="editValue"
            type="number"
            :min="0"
            :max="neededCount"
            class="w-full h-full bg-surface-900 px-2 text-center text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-inset"
            @blur="submitEdit"
            @keydown.enter="submitEdit"
            @keydown.escape="cancelEdit"
          />
        </template>
        <template v-else>
          <button
            class="w-full h-full cursor-pointer px-3 text-sm font-semibold text-white hover:bg-surface-600 transition-colors"
            title="Click to enter value"
            @click="startEditing"
          >
            {{ currentCount.toLocaleString() }}/{{ neededCount.toLocaleString() }}
          </button>
        </template>
      </div>

      <!-- Increase button -->
      <button
        class="flex items-center justify-center w-9 h-9 rounded-r-lg text-surface-200 hover:bg-surface-600 hover:text-white active:bg-surface-500 transition-colors"
        title="Increase count"
        @click="$emit('increase')"
      >
        <UIcon name="i-mdi-plus" class="h-5 w-5" />
      </button>
    </div>

    <!-- Mark as 100% complete button - separated with more spacing -->
    <button
      class="flex items-center justify-center w-9 h-9 rounded-lg border transition-colors"
      :class="currentCount >= neededCount
        ? 'bg-success-600 border-success-500 text-white hover:bg-success-500'
        : 'bg-surface-700 border-white/20 text-surface-200 hover:bg-surface-600 hover:text-white'"
      :title="currentCount >= neededCount ? 'Already complete' : 'Mark as 100% complete'"
      @click="$emit('toggle')"
    >
      <UIcon name="i-mdi-check-circle" class="h-5 w-5" />
    </button>
  </div>
</template>
<script setup lang="ts">
  import { ref, nextTick, watch } from 'vue';

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
  watch(() => props.currentCount, () => {
    if (isEditing.value) {
      isEditing.value = false;
    }
  });
</script>
