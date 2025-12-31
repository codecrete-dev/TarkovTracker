<script setup lang="ts">
  import { computed, useAttrs, reactive, onUnmounted } from 'vue';

  // Shared state across all AppTooltip instances to manage precedence
  // The last ID in the stack is the "topmost" hovered tooltip
  const sharedState = reactive({
    stack: [] as string[]
  });

  defineOptions({ inheritAttrs: false });
  type TooltipSide = 'top' | 'bottom' | 'left' | 'right';
  type TooltipContent = {
    side?: TooltipSide;
    sideOffset?: number;
    collisionPadding?: number;
    [key: string]: unknown;
  };
  const props = withDefaults(
    defineProps<{
      text?: string;
      kbds?: Array<string | undefined>;
      content?: TooltipContent;
      arrow?: boolean;
      disabled?: boolean;
    }>(),
    {
      text: undefined,
      kbds: undefined,
      content: () => ({}),
      arrow: false,
      disabled: false,
    }
  );

  const id = useId();
  const attrs = useAttrs();

  // Helper to check if we are the top of the stack
  const isTopmost = computed(() => {
    if (sharedState.stack.length === 0) return false;
    return sharedState.stack[sharedState.stack.length - 1] === id;
  });

  const onEnter = () => {
    sharedState.stack.push(id);
  };

  const onLeave = () => {
    const index = sharedState.stack.indexOf(id);
    if (index > -1) {
      sharedState.stack.splice(index, 1);
    }
  };

  onUnmounted(onLeave);

  // If disabled by prop OR not topmost, we should be disabled
  const isDisabled = computed(() => {
    if (props.disabled) return true;
    if (sharedState.stack.length > 0 && !isTopmost.value) return true;
    return false;
  });

  const mergedContent = computed<TooltipContent>(() => ({
    side: 'top',
    sideOffset: 10,
    collisionPadding: 8,
    ...props.content,
  }));
</script>

<template>
  <!-- 
    Key the UTooltip with the text prop to force re-render when text changes.
    This fixes the stale text issue where the tooltip content wouldn't update after being shown once.
  -->
  <UTooltip
    :key="props.text"
    v-bind="attrs"
    :text="props.text"
    :kbds="props.kbds"
    :arrow="props.arrow"
    :prevent="isDisabled"
    :content="mergedContent"
    @mouseenter="onEnter"
    @mouseleave="onLeave"
  >
    <slot />
    <template v-if="$slots.content" #content="slotProps">
      <slot name="content" v-bind="slotProps" />
    </template>
  </UTooltip>
</template>
