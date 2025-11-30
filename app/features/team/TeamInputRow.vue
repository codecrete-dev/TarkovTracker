<template>
  <div class="flex items-center gap-2">
    <div class="grow">
      <UInput
        :model-value="modelValue"
        :label="label"
        :maxlength="maxlength"
        :readonly="readonly"
        :ui="{ wrapper: 'w-full' }"
        @update:model-value="$emit('update:modelValue', $event)"
      />
    </div>
    <div class="flex-none">
      <UButton variant="ghost" color="gray" class="h-full" @click="$emit('action')">
        <UIcon :name="icon.startsWith('mdi-') ? `i-${icon}` : icon" class="h-6 w-6" />
      </UButton>
    </div>
  </div>
</template>
<script setup>
  defineProps({
    modelValue: { type: String, default: '' },
    label: { type: String, required: true },
    icon: { type: String, required: true },
    maxlength: { type: Number, default: undefined },
    counter: { type: Boolean, default: false },
    readonly: { type: Boolean, default: false },
  });
  defineEmits(['update:modelValue', 'action']);
</script>
