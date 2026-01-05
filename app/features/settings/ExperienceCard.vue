<template>
  <GenericCard
    icon="mdi-star-circle"
    highlight-color="accent"
    :fill-height="false"
    :title="$t('settings.experience.title', 'Experience & Level')"
    title-classes="text-lg font-bold sm:text-xl"
  >
    <template #content>
      <div class="space-y-4 px-4 py-4">
        <!-- Explanation -->
        <UAlert icon="i-mdi-information" color="primary" variant="soft" class="text-sm">
          <template #description>
            {{
              $t(
                'settings.experience.explanation',
                'Quest XP is auto-calculated. Use the offset to add XP from daily quests, kills, and other gameplay.'
              )
            }}
          </template>
        </UAlert>
        <!-- Automatic Level Calculation Toggle -->
        <div
          class="border-base bg-surface-elevated dark:border-accent-700/30 rounded-lg border p-4"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="flex-1">
              <div class="text-content-primary mb-1 text-sm font-semibold">
                {{ $t('settings.experience.auto_level_title', 'Automatic Level Calculation') }}
              </div>
              <p class="text-content-tertiary text-xs">
                {{
                  $t(
                    'settings.experience.auto_level_description',
                    'When enabled, your level will be automatically calculated based on total XP. When disabled, you can manually set your level independently of XP calculations.'
                  )
                }}
              </p>
            </div>
            <USwitch
              :model-value="preferencesStore.getUseAutomaticLevelCalculation"
              @update:model-value="handleAutoLevelToggle"
            />
          </div>
          <UAlert
            v-if="!preferencesStore.getUseAutomaticLevelCalculation"
            icon="i-mdi-alert"
            color="warning"
            variant="soft"
            class="mt-3 text-xs"
          >
            <template #description>
              {{
                $t(
                  'settings.experience.manual_level_warning',
                  'Manual level mode is active. This allows you to set your level independently of your calculated XP, which can be useful if your in-game level differs due to Arena, raids, or other XP sources not tracked here.'
                )
              }}
            </template>
          </UAlert>
        </div>
        <!-- Current Level Display -->
        <div
          class="border-base bg-surface-elevated dark:border-accent-700/30 rounded-lg border p-4"
        >
          <div class="mb-3 flex items-center justify-between">
            <span class="text-content-primary text-sm font-semibold">
              {{ $t('settings.experience.current_level', 'Current Level') }}
            </span>
            <span class="text-accent-600 dark:text-accent-400 text-2xl font-bold">
              {{ xpCalculation.derivedLevel.value }}
            </span>
          </div>
          <!-- XP Progress Bar -->
          <div class="space-y-1">
            <div class="text-content-tertiary flex justify-between text-xs">
              <span>{{ formatNumber(xpCalculation.totalXP.value) }} XP</span>
              <span>{{ formatNumber(xpCalculation.xpToNextLevel.value) }} to next</span>
            </div>
            <div class="bg-surface-400 dark:bg-surface-700 h-2 overflow-hidden rounded-full">
              <div
                class="bg-accent-500 h-full transition-all duration-300"
                :style="{ width: `${xpCalculation.xpProgress.value}%` }"
              ></div>
            </div>
            <div class="text-content-tertiary flex justify-between text-xs">
              <span>{{ formatNumber(xpCalculation.xpForCurrentLevel.value) }}</span>
              <span>{{ formatNumber(xpCalculation.xpForNextLevel.value) }}</span>
            </div>
          </div>
        </div>
        <div class="grid gap-4 md:grid-cols-2">
          <!-- Left: XP Equation Breakdown -->
          <div
            class="border-base bg-surface-elevated dark:border-accent-700/30 rounded-lg border p-4"
          >
            <div class="text-content-primary mb-3 text-sm font-semibold">
              {{ $t('settings.experience.breakdown', 'XP Breakdown') }}
            </div>
            <div class="flex flex-col gap-1 font-mono text-sm">
              <!-- Quest XP -->
              <div class="text-content-secondary flex items-center justify-between">
                <span>Quest XP</span>
                <span>{{ formatNumber(xpCalculation.calculatedQuestXP.value) }}</span>
              </div>
              <!-- Manual Offset -->
              <div class="text-content-secondary flex items-center justify-between">
                <span class="flex items-center gap-2">
                  <span>+</span>
                  <span>Manual Offset</span>
                </span>
                <span
                  :class="
                    tarkovStore.getXpOffset() >= 0
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-500 dark:text-red-400'
                  "
                >
                  {{ formatNumber(tarkovStore.getXpOffset()) }}
                </span>
              </div>
              <!-- Divider -->
              <div class="border-base my-2 border-b"></div>
              <!-- Total -->
              <div class="flex items-center justify-between py-0.5 text-lg font-bold">
                <span class="text-content-primary">Total XP</span>
                <span class="text-accent-600 dark:text-accent-400">
                  {{ formatNumber(xpCalculation.totalXP.value) }}
                </span>
              </div>
            </div>
          </div>
          <!-- Right: Manual Input Actions -->
          <div
            class="border-base bg-surface-elevated dark:border-accent-700/30 rounded-lg border p-4"
          >
            <label class="text-content-primary mb-3 block text-sm font-semibold">
              {{ $t('settings.experience.set_total_xp', 'Set Total XP') }}
            </label>
            <div class="flex flex-col gap-1">
              <!-- Description (Matches Quest XP row) -->
              <div class="text-content-tertiary flex min-h-[20px] items-center text-xs">
                <p class="line-clamp-1">
                  {{
                    $t(
                      'settings.experience.manual_hint',
                      'Enter your actual total XP to adjust the offset automatically.'
                    )
                  }}
                </p>
              </div>
              <!-- Reset Button (Matches Manual Offset row) -->
              <div class="flex min-h-[20px] items-center">
                <UButton
                  icon="i-mdi-refresh"
                  size="xs"
                  variant="link"
                  color="neutral"
                  class="h-5 px-0"
                  :disabled="tarkovStore.getXpOffset() === 0"
                  @click="resetOffset"
                >
                  {{ $t('settings.experience.reset_offset', 'Reset XP Offset') }}
                </UButton>
              </div>
              <!-- Invisible Divider (Matches visible divider) -->
              <div class="my-2 border-b border-transparent"></div>
              <!-- Input (Matches Total XP row) -->
              <div class="flex items-center gap-2 py-0.5">
                <UInput
                  v-model.number="manualXPInput"
                  type="number"
                  :min="0"
                  :placeholder="xpCalculation.totalXP.value.toString()"
                  size="md"
                  class="flex-1 placeholder:text-gray-500 dark:placeholder:text-gray-400"
                  @keyup.enter="applyManualXP"
                />
                <UButton
                  icon="i-mdi-check"
                  size="md"
                  color="primary"
                  :disabled="!isValidXPInput"
                  @click="applyManualXP"
                >
                  {{ $t('page.tasks.filters.apply') }}
                </UButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </GenericCard>
</template>
<script setup lang="ts">
  import { ref, computed } from 'vue';
  import GenericCard from '@/components/ui/GenericCard.vue';
  import { useXpCalculation } from '@/composables/useXpCalculation';
  import { usePreferencesStore } from '@/stores/usePreferences';
  import { useTarkovStore } from '@/stores/useTarkov';
  import { useLocaleNumberFormatter } from '@/utils/formatters';
  const tarkovStore = useTarkovStore();
  const preferencesStore = usePreferencesStore();
  const xpCalculation = useXpCalculation();
  const formatNumber = useLocaleNumberFormatter();
  // Manual XP input
  const manualXPInput = ref<number | null>(null);
  // Check if input is valid
  const isValidXPInput = computed(() => {
    return (
      manualXPInput.value !== null &&
      !isNaN(manualXPInput.value) &&
      manualXPInput.value >= 0 &&
      manualXPInput.value !== xpCalculation.totalXP.value
    );
  });
  // Apply manual XP
  const applyManualXP = () => {
    if (isValidXPInput.value && manualXPInput.value !== null) {
      xpCalculation.setTotalXP(manualXPInput.value);
      manualXPInput.value = null;
    }
  };
  // Reset offset to 0
  const resetOffset = () => {
    tarkovStore.setXpOffset(0);
    manualXPInput.value = null;
  };
  // Handle automatic level calculation toggle
  const handleAutoLevelToggle = (value: boolean) => {
    preferencesStore.setUseAutomaticLevelCalculation(value);
    // If enabling automatic calculation, sync the manual level with derived level
    if (value) {
      tarkovStore.setLevel(xpCalculation.derivedLevel.value);
    }
  };
</script>
