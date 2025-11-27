<template>
  <div
    class="bg-surface-800 overflow-hidden rounded shadow-md"
    :class="{ 'h-full': props.fillHeight, [props.cardClass]: true }"
  >
    <div class="m-0 h-full p-0">
      <div class="flex h-full flex-col">
        <!-- Header Section -->
        <header v-if="hasHeader" class="relative w-full">
          <!-- Slot for custom header content -->
          <slot name="header">
            <!-- Default header with icon and title -->
            <div
              v-if="props.title || props.icon"
              class="flex items-center justify-between pb-2 text-xl"
              :class="headerClasses"
            >
              <!-- Left side content (icon and title) -->
              <div class="flex items-center gap-3">
                <!-- Icon or Image -->
                <span
                  v-if="props.icon || props.avatar"
                  :class="highlightClasses"
                  class="inline-block rounded-br-lg px-3 py-1 shadow-lg"
                >
                  <img
                    v-if="props.avatar"
                    :src="props.avatar"
                    :height="avatarHeight"
                    :style="{ height: `${avatarHeight}px` }"
                    class="block pt-0"
                    :class="avatarClass"
                  />
                  <UIcon
                    v-else
                    :name="props.icon?.startsWith('mdi-') ? `i-${props.icon}` : props.icon"
                    :class="`text-${props.iconColor}`"
                    class="h-6 w-6"
                  />
                </span>
                <!-- Title -->
                <span
                  v-if="props.title"
                  class="inline-block px-2 text-left leading-6"
                  :class="titleClasses"
                >
                  {{ props.title }}
                </span>
              </div>
              <!-- Right side content -->
              <div
                v-if="$slots['title-right'] || props.subtitle"
                class="flex items-center gap-2 text-right"
              >
                <slot name="title-right">
                  <span v-if="props.subtitle" class="text-surface-400 text-xs">
                    {{ props.subtitle }}
                  </span>
                </slot>
              </div>
            </div>
          </slot>
          <!-- Divider (only if there's content below) -->
          <div
            v-if="showDivider && (hasContent || hasFooter)"
            class="border-surface-700 mx-4 border-b"
          ></div>
        </header>

        <!-- Content Section -->
        <main v-if="hasContent" class="mt-2 w-full grow" :class="contentClasses">
          <slot name="content"></slot>
        </main>

        <!-- Footer Section -->
        <footer v-if="hasFooter" class="mt-auto w-full pb-1" :class="footerClasses">
          <slot name="footer"></slot>
        </footer>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed } from "vue";

  interface Props {
    // Header props
    title?: string;
    subtitle?: string;
    icon?: string;
    avatar?: string;
    iconColor?: string;
    titleClasses?: string;
    headerClasses?: string;

    // Styling props
    highlightColor?: "green" | "blue" | "red" | "tan" | "purple" | "secondary" | "accent";
    fillHeight?: boolean;
    showDivider?: boolean;

    // Layout props
    contentClasses?: string;
    footerClasses?: string;
    cardClass?: string;

    // Avatar props
    avatarHeight?: number;
    avatarClass?: string;
  }

  const props = withDefaults(defineProps<Props>(), {
    title: "",
    subtitle: "",
    icon: "",
    avatar: "",
    iconColor: "white",
    titleClasses: "",
    headerClasses: "",
    highlightColor: "accent",
    fillHeight: true,
    showDivider: true,
    contentClasses: "",
    footerClasses: "",
    cardClass: "",
    avatarHeight: 50,
    avatarClass: "",
  });

  // Compute slot existence
  const slots = useSlots();
  const hasHeader = computed(() => !!(slots.header || props.title || props.icon || props.avatar));
  const hasContent = computed(() => !!slots.content);
  const hasFooter = computed(() => !!slots.footer);

  const highlightClasses = computed(() => {
    const classes: Record<string, boolean> = {};

    // Map highlight colors to Tailwind gradient classes
    switch (props.highlightColor) {
      case "green":
        classes[
          "bg-gradient-to-r from-[rgba(1,36,0,0.15)] via-[rgba(15,121,9,0.15)] to-[rgba(0,83,0,0.15)]"
        ] = true;
        break;
      case "blue":
        classes[
          "bg-gradient-to-r from-[rgba(0,0,36,0.15)] via-[rgba(0,0,121,0.15)] to-[rgba(0,0,83,0.15)]"
        ] = true;
        break;
      case "red":
        classes[
          "bg-gradient-to-r from-[rgba(36,0,0,0.15)] via-[rgba(121,0,0,0.15)] to-[rgba(83,0,0,0.15)]"
        ] = true;
        break;
      case "tan":
        classes[
          "bg-gradient-to-r from-[rgba(36,36,0,0.15)] via-[rgba(121,121,0,0.15)] to-[rgba(83,83,0,0.15)]"
        ] = true;
        break;
      case "purple":
        classes[
          "bg-gradient-to-r from-[rgba(36,0,36,0.15)] via-[rgba(121,0,121,0.15)] to-[rgba(83,0,83,0.15)]"
        ] = true;
        break;
      case "secondary":
        classes["bg-gradient-to-br from-brand-700 via-brand-300 to-brand-500"] = true;
        break;
      case "accent":
      default:
        classes["bg-gradient-to-br from-accent-800 via-accent-700 to-accent-600"] = true;
        break;
    }

    return classes;
  });
</script>
