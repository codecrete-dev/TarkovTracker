<template>
  <div
    :class="[
      'relative overflow-hidden',
      !noBorder ? 'bg-stash-cell' : 'rounded',
      containerClasses,
      imageTileClasses,
      fill ? 'flex items-center justify-center' : '',
    ]"
  >
    <div :class="['absolute inset-0', resolvedBackgroundClass]"></div>
    <img
      v-if="isVisible && formattedSrc"
      :src="formattedSrc"
      :alt="alt || itemName || 'Item'"
      :class="[
        fill ? 'max-h-full max-w-full object-contain' : 'h-full w-full object-contain',
        'relative z-10',
        imageElementClasses,
      ]"
      loading="lazy"
      @error="handleImgError"
    />
    <div
      v-else
      :class="[
        'bg-surface-800 flex h-full w-full items-center justify-center rounded relative z-10',
        imageElementClasses,
      ]"
    >
      <UIcon name="i-mdi-loading" class="h-6 w-6 animate-spin text-gray-400" />
    </div>
    <!-- Slot for overlays (like hover actions) -->
    <slot />
  </div>
</template>
<script setup lang="ts">
  import { computed } from 'vue';
  interface Props {
    src?: string;
    alt?: string;
    itemName?: string | null;
    backgroundColor?: string;
    fill?: boolean;
    size?: 'xs' | 'small' | 'medium' | 'large';
    isVisible?: boolean;
    noBorder?: boolean;
  }
  const props = withDefaults(defineProps<Props>(), {
    src: '',
    alt: '',
    itemName: null,
    backgroundColor: 'default',
    fill: false,
    size: 'medium',
    isVisible: true,
    noBorder: false,
  });
  const formattedSrc = computed(() => {
    return props.src;
  });
  const containerClasses = computed(() => {
    const classes = ['block', 'relative'];
    if (props.fill) {
      classes.push('h-full', 'w-full');
    } else {
      classes.push('shrink-0');
      if (props.size === 'xs') {
        classes.push('h-9 w-9'); 
      } else if (props.size === 'small') {
        classes.push('h-12 w-12 md:h-16 md:w-16'); 
      } else if (props.size === 'large') {
        classes.push('h-20 w-20 md:h-28 md:w-28'); 
      } else {
        classes.push('h-16 w-16 md:h-24 md:w-24'); 
      }
    }
    return classes;
  });
  const backgroundClassMap = {
    violet: 'bg-[var(--color-stash-violet)] overlay-stash-bg',
    grey: 'bg-[var(--color-stash-grey)] overlay-stash-bg',
    yellow: 'bg-[var(--color-stash-yellow)] overlay-stash-bg',
    orange: 'bg-[var(--color-stash-orange)] overlay-stash-bg',
    green: 'bg-[var(--color-stash-green)] overlay-stash-bg',
    red: 'bg-[var(--color-stash-red)] overlay-stash-bg',
    black: 'bg-[var(--color-stash-black)] overlay-stash-bg',
    blue: 'bg-[var(--color-stash-blue)] overlay-stash-bg',
    default: 'bg-[var(--color-stash-default)] overlay-stash-bg',
  } as const;
  type BackgroundKey = keyof typeof backgroundClassMap;
  const resolvedBackgroundClass = computed(() => {
    const bgColor = (props.backgroundColor || 'default').toLowerCase() as BackgroundKey;
    return backgroundClassMap[bgColor] ?? backgroundClassMap.default;
  });
  const imageElementClasses = ['rounded'];
  const imageTileClasses = computed(() => {
    const classes = [...imageElementClasses];
    // Border logic is handled by bg-stash-cell, but we keep this for consistency if we add more
    return classes;
  });
  const handleImgError = () => {
    console.warn(`[GameItemImage] Failed to load image: ${props.src}`);
  };
</script>
