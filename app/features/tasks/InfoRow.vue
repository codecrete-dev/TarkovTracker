<template>
  <div class="mb-1 flex items-start">
    <div v-if="icon || $slots.icon" class="mr-1 shrink-0">
      <slot name="icon">
        <UIcon :name="icon.startsWith('mdi-') ? `i-${icon}` : icon" class="h-6 w-6" />
      </slot>
    </div>
    <div class="grow">
      <slot />
    </div>
  </div>
</template>
<script setup>
  defineProps({
    icon: { type: String, default: "" },
  });
</script>
