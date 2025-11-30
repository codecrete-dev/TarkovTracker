<template>
  <div class="flex items-center justify-center px-3 py-2">
    <template v-if="isCollapsed">
      <div class="text-center">
        <div class="mb-1 text-[0.7em] text-gray-400">
          {{ t('navigation_drawer.level') }}
        </div>
        <h1 class="text-center text-2xl leading-tight font-bold">
          {{ tarkovStore.playerLevel() }}
        </h1>
      </div>
    </template>
    <template v-else>
      <!-- Card container for expanded state -->
      <div class="w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 backdrop-blur-sm">
        <div class="flex items-center gap-1">
          <span v-if="!mdAndDown" class="mr-1.5 leading-none">
            <div class="group relative h-14 w-14 overflow-hidden">
              <NuxtImg
                :src="pmcFactionIcon"
                class="absolute top-0 left-0 z-20 mt-1.5 max-w-[56px] px-1.5 opacity-0 invert transition-opacity duration-1000 ease-in-out group-hover:opacity-100"
                width="56"
                height="56"
              />
              <NuxtImg
                :src="groupIcon"
                class="absolute top-0 left-0 z-10 max-w-[56px] opacity-100 transition-opacity duration-1000 ease-in-out group-hover:opacity-0"
                width="56"
                height="56"
              />
            </div>
          </span>
          <span class="mx-0.5">
            <div class="mb-0.5 text-center text-[0.65em] text-gray-300">
              {{ t('navigation_drawer.level') }}
            </div>
            <div class="text-center">
              <h1
                v-if="!editingLevel"
                class="hover:text-primary w-[2.2em] cursor-pointer text-[2.2em] leading-[0.85em] transition-colors"
                @click="startEditingLevel"
              >
                {{ tarkovStore.playerLevel() }}
              </h1>
              <input
                v-else
                ref="levelInput"
                v-model.number="levelInputValue"
                type="number"
                :min="minPlayerLevel"
                :max="maxPlayerLevel"
                class="w-[2.2em] appearance-none border-0 bg-transparent p-0 text-center text-[2.2em] leading-[0.85em] outline-none focus:ring-0 focus:outline-none"
                @input="enforceMaxLevel"
                @blur="saveLevel"
                @keyup.enter="saveLevel"
              />
            </div>
          </span>
          <span class="ml-1 flex flex-col items-center gap-1">
            <button
              class="flex h-6 w-6 cursor-pointer items-center justify-center p-0 text-white/70 transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              :disabled="tarkovStore.playerLevel() >= maxPlayerLevel"
              @click="incrementLevel"
            >
              <UIcon name="i-mdi-chevron-up" class="h-5 w-5" />
            </button>
            <template v-if="tarkovStore.playerLevel() > minPlayerLevel">
              <button
                class="flex h-6 w-6 cursor-pointer items-center justify-center p-0 text-white/70 transition-colors hover:text-white"
                @click="decrementLevel"
              >
                <UIcon name="i-mdi-chevron-down" class="h-5 w-5" />
              </button>
            </template>
            <template v-else>
              <div class="h-6 w-6" aria-hidden="true"></div>
            </template>
          </span>
        </div>
      </div>
    </template>
  </div>
</template>
<script setup>
  import { useBreakpoints } from '@vueuse/core';
  import { computed, nextTick, ref } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { useMetadataStore } from '@/stores/useMetadata';
  import { useTarkovStore } from '@/stores/useTarkov';
  const { t } = useI18n({ useScope: 'global' });
  // Define breakpoints (matching Vuetify's md breakpoint at 960px)
  const breakpoints = useBreakpoints({
    mobile: 0,
    md: 960,
  });
  const mdAndDown = breakpoints.smaller('md');
  defineProps({
    isCollapsed: {
      type: Boolean,
      required: true,
    },
  });
  const tarkovStore = useTarkovStore();
  const metadataStore = useMetadataStore();
  const minPlayerLevel = computed(() => metadataStore.minPlayerLevel);
  const maxPlayerLevel = computed(() => metadataStore.maxPlayerLevel);
  const playerLevels = computed(() => metadataStore.playerLevels);
  const pmcFactionIcon = computed(() => {
    return `/img/factions/${tarkovStore.getPMCFaction()}.webp`;
  });
  const groupIcon = computed(() => {
    const level = tarkovStore.playerLevel();
    const entry = playerLevels.value.find((pl) => pl.level === level);
    return entry?.levelBadgeImageLink ?? '';
  });
  // Manual level editing logic
  const editingLevel = ref(false);
  const levelInputValue = ref(tarkovStore.playerLevel());
  const levelInput = ref(null);
  function startEditingLevel() {
    editingLevel.value = true;
    levelInputValue.value = tarkovStore.playerLevel();
    nextTick(() => {
      if (levelInput.value) levelInput.value.focus();
    });
  }
  function enforceMaxLevel() {
    const currentValue = parseInt(levelInputValue.value, 10);
    if (!isNaN(currentValue) && currentValue > maxPlayerLevel.value) {
      levelInputValue.value = maxPlayerLevel.value;
    }
  }
  function saveLevel() {
    let newLevel = parseInt(levelInputValue.value, 10);
    if (isNaN(newLevel)) newLevel = minPlayerLevel.value;
    newLevel = Math.max(minPlayerLevel.value, Math.min(maxPlayerLevel.value, newLevel));
    tarkovStore.setLevel(newLevel);
    editingLevel.value = false;
  }
  function incrementLevel() {
    if (tarkovStore.playerLevel() < maxPlayerLevel.value) {
      tarkovStore.setLevel(tarkovStore.playerLevel() + 1);
    }
  }
  function decrementLevel() {
    if (tarkovStore.playerLevel() > minPlayerLevel.value) {
      tarkovStore.setLevel(tarkovStore.playerLevel() - 1);
    }
  }
</script>
<style>
  /* Hide spin buttons for number input */
  input[type='number']::-webkit-inner-spin-button,
  input[type='number']::-webkit-outer-spin-button {
    -webkit-appearance: none !important;
    margin: 0;
  }
  input[type='number'] {
    appearance: textfield !important;
    -moz-appearance: textfield !important;
  }
</style>
