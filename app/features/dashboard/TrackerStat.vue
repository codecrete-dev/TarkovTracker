<template>
  <div
    class="bg-surface-900 border-surface-700/30 flex h-full flex-col overflow-hidden rounded-lg border shadow-md transition-transform hover:scale-[1.02]"
  >
    <div class="flex items-center p-4">
      <div
        class="bg-primary-600/15 text-primary-400 mr-4 flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
      >
        <UIcon :name="iconName" class="h-6 w-6" />
      </div>
      <div class="grow-right min-w-0">
        <div class="text-surface-400 mb-1 truncate text-xs font-medium tracking-wider uppercase">
          <slot name="stat"></slot>
        </div>
        <div class="mb-1 text-2xl leading-none font-bold text-white">
          <slot name="value"></slot>
        </div>
        <div v-if="$slots.percentage" class="text-primary-500 text-xs font-medium">
          <slot name="percentage"></slot>
        </div>
      </div>
    </div>
    <div v-if="$slots.details" class="mt-auto px-4 pb-3">
      <div class="mb-2 h-px bg-white/5"></div>
      <div class="text-surface-500 flex items-start text-xs">
        <UIcon
          name="i-mdi-help-circle-outline"
          class="text-surface-600 mt-0.5 mr-1.5 h-4 w-4 shrink-0"
        />
        <span class="line-clamp-2 leading-relaxed"><slot name="details"></slot></span>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
  import { computed } from "vue";

  interface Props {
    icon?: string;
  }

  const props = withDefaults(defineProps<Props>(), {
    icon: "mdi-check-all",
  });

  // Convert icon name to proper format
  const iconName = computed(() => {
    return props.icon.startsWith("mdi-") ? `i-${props.icon}` : props.icon;
  });
</script>
