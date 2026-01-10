<template>
  <div
    role="menuitem"
    class="clickable flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 transition-colors duration-150 dark:text-gray-200"
    :aria-disabled="props.disabled"
    :tabindex="props.disabled ? -1 : 0"
    @click="handleClick"
    @keydown="handleKeydown"
  >
    <img v-if="isImagePath" :src="icon" :alt="label" class="h-4 w-4 shrink-0" />
    <UIcon v-else-if="icon" :name="icon" class="h-4 w-4 shrink-0" />
    <span>{{ label }}</span>
  </div>
</template>
<script setup lang="ts">
  import { computed } from 'vue';
  interface Props {
    label: string;
    icon?: string;
    disabled?: boolean;
  }
  const props = defineProps<Props>();
  const emit = defineEmits<{
    click: [];
  }>();
  const isImagePath = computed(() => {
    if (!props.icon) return false;
    return (
      props.icon.startsWith('/') ||
      props.icon.startsWith('http') ||
      props.icon.endsWith('.webp') ||
      props.icon.endsWith('.png') ||
      props.icon.endsWith('.svg') ||
      props.icon.endsWith('.jpg') ||
      props.icon.endsWith('.jpeg')
    );
  });
  const itemClasses = computed(() => [
    'flex items-center gap-2 px-4 py-2.5 text-sm text-gray-200 transition-colors duration-150',
    props.disabled
      ? 'cursor-not-allowed opacity-60'
      : 'cursor-pointer hover:bg-gray-800 focus-visible:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900',
  ]);
  const handleClick = () => {
    if (props.disabled) return;
    emit('click');
  };
  const handleKeydown = (event: KeyboardEvent) => {
    if (props.disabled) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      emit('click');
    }
  };
</script>
