<template>
  <div class="flex flex-col gap-2">
    <!-- Section Header -->
    <div v-if="!props.isCollapsed" class="px-4 py-1">
      <h3 class="text-xs font-semibold tracking-wider text-gray-500 uppercase">External</h3>
    </div>
    <!-- External Links -->
    <ul class="flex flex-col gap-1 px-1">
      <DrawerItem
        avatar="/img/logos/tarkovdevlogo.webp"
        locale-key="tarkovdev"
        href="https://tarkov.dev/"
        ext-link
        :is-collapsed="props.isCollapsed"
      />
      <DrawerItem
        avatar="/img/logos/tarkovmonitorlogo.avif"
        locale-key="tarkovmonitor"
        href="https://github.com/the-hideout/TarkovMonitor"
        ext-link
        :is-collapsed="props.isCollapsed"
      />
      <DrawerItem
        avatar="/img/logos/ratscannerlogo.webp"
        locale-key="ratscanner"
        href="https://ratscanner.com/"
        ext-link
        :is-collapsed="props.isCollapsed"
      />
      <DrawerItem
        avatar="/img/logos/tarkovchangeslogo.svg"
        locale-key="tarkovchanges"
        href="https://tarkov-changes.com/"
        ext-link
        :is-collapsed="props.isCollapsed"
      />
    </ul>
  </div>
</template>
<script setup>
  import DrawerItem from '@/features/drawer/DrawerItem.vue';
  const props = defineProps({
    isCollapsed: {
      type: Boolean,
      required: true,
    },
  });
</script>
