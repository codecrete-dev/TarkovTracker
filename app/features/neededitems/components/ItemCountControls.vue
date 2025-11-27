<template>
  <div class="flex items-center">
    <UButton
      variant="ghost"
      color="neutral"
      class="m-0 min-w-0 cursor-pointer p-0"
      size="sm"
      @click="$emit('decrease')"
    >
      <UIcon name="i-mdi-minus-thick" class="h-5 w-5" />
    </UButton>
    <UButton
      variant="ghost"
      color="neutral"
      class="mx-1 min-w-0 cursor-pointer px-2 text-sm font-semibold"
      size="sm"
      @click="$emit('toggle')"
    >
      {{ currentCount.toLocaleString() }}/{{ neededCount.toLocaleString() }}
    </UButton>
    <UButton
      variant="ghost"
      color="neutral"
      class="m-0 min-w-0 cursor-pointer p-0"
      size="sm"
      @click="$emit('increase')"
    >
      <UIcon name="i-mdi-plus-thick" class="h-5 w-5" />
    </UButton>
  </div>
</template>
<script setup lang="ts">
  defineProps<{
    currentCount: number;
    neededCount: number;
  }>();
  defineEmits<{
    decrease: [];
    increase: [];
    toggle: [];
  }>();
</script>
