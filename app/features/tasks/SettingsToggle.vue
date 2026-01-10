<template>
  <div class="bg-surface-base flex items-center justify-between rounded-lg px-4 py-3">
    <div class="flex items-center gap-2">
      <USwitch
        :model-value="modelValue"
        size="lg"
        @update:model-value="$emit('update:modelValue', $event)"
      />
      <span class="text-content-primary text-sm">{{ label }}</span>
    </div>
    <span v-if="tooltip" v-tooltip="tooltip" class="flex items-center">
      <UIcon name="i-mdi-help-circle-outline" class="text-content-tertiary h-5 w-5" />
    </span>
  </div>
</template>
<script setup lang="ts">
  defineProps<{
    modelValue: boolean;
    label: string;
    tooltip?: string;
  }>();
  defineEmits<{
    'update:modelValue': [value: boolean];
  }>();
</script>
