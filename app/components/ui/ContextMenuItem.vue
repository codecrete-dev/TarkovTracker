<template>
  <div
    class="flex cursor-pointer items-center gap-2 px-4 py-2.5 text-sm text-gray-200 transition-colors duration-150 hover:bg-gray-800"
    @click="handleClick"
  >
    <UIcon v-if="icon" :name="icon" class="h-4 w-4 shrink-0" />
    <span>{{ label }}</span>
  </div>
</template>

<script setup lang="ts">
  interface Props {
    label: string;
    icon?: string;
  }

  defineProps<Props>();
  const emit = defineEmits<{
    click: [];
  }>();

  const handleClick = () => {
    emit("click");
  };
</script>
