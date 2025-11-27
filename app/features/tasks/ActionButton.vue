<template>
  <div v-if="xs" class="flex justify-center">
    <UButton
      :color="buttonColor"
      :size="buttonSize"
      :ui="ui || undefined"
      class="mx-1 my-1 w-full max-w-xs"
      @click="$emit('click')"
    >
      <UIcon :name="icon.startsWith('mdi-') ? `i-${icon}` : icon" class="mr-2 h-6 w-6" />
      {{ text }}
    </UButton>
  </div>
  <UButton
    v-else
    :size="buttonSize"
    :color="buttonColor"
    :ui="ui || undefined"
    class="mx-1 my-1"
    @click="$emit('click')"
  >
    <UIcon :name="icon.startsWith('mdi-') ? `i-${icon}` : icon" class="mr-2 h-6 w-6" />
    {{ text }}
  </UButton>
</template>
<script setup lang="ts">
  import { computed } from "vue";
  const props = defineProps({
    xs: { type: Boolean, required: true },
    color: { type: String, default: "primary" },
    icon: { type: String, required: true },
    text: { type: String, required: true },
    size: { type: String, default: "x-large" },
    ui: { type: Object, default: null },
  });
  defineEmits(["click"]);
  const sizeMap: Record<string, string> = {
    "x-small": "xs",
    small: "sm",
    default: "md",
    large: "lg",
    "x-large": "xl",
  };
  const colorMap: Record<string, string> = {
    accent: "primary",
    primary: "primary",
    secondary: "neutral",
    success: "success",
    failure: "error",
    error: "error",
    complete: "success",
  };
  type ButtonSize = "xs" | "sm" | "md" | "lg" | "xl" | undefined;
  type ButtonColor =
    | "primary"
    | "secondary"
    | "success"
    | "info"
    | "warning"
    | "error"
    | "neutral"
    | undefined;
  const buttonSize = computed(() => (sizeMap[props.size] || props.size || "md") as ButtonSize);
  const buttonColor = computed(
    () => (colorMap[props.color] || props.color || "primary") as ButtonColor
  );
</script>
