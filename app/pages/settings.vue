<template>
  <div class="container mx-auto space-y-4 px-4 py-6">
    <div class="grid gap-4 md:grid-cols-2">
      <!-- Section 1: General Settings -->
      <GenericCard
        icon="mdi-cog"
        icon-color="primary"
        highlight-color="blue"
        :fill-height="false"
        class="h-full"
      >
        <template #title>
          <span class="text-lg font-semibold">
            {{ $t("settings.general.title", "General Settings") }}
          </span>
        </template>
        <template #title-right>
          <UAlert
            v-if="!user.loggedIn"
            icon="i-mdi-lock"
            color="warning"
            variant="soft"
            class="inline-flex items-center p-1 text-sm"
          >
            <template #description>
              <span class="text-sm">
                {{ $t("settings.general.login_required", "Log in to enable these settings.") }}
              </span>
            </template>
          </UAlert>
        </template>
        <template #content>
          <div class="space-y-4 px-4 py-3">
            <div class="space-y-2">
              <p class="text-surface-200 text-sm font-semibold">
                {{ $t("settings.general.streamer_mode", "Streamer Mode") }}
              </p>
              <div class="flex items-center gap-3">
                <UCheckbox
                  v-model="streamerMode"
                  :disabled="
                    !user.loggedIn ||
                    Boolean(preferencesStore.saving && preferencesStore.saving.streamerMode)
                  "
                  label=""
                />
                <UIcon
                  v-if="preferencesStore.saving && preferencesStore.saving.streamerMode"
                  name="i-heroicons-arrow-path"
                  class="text-primary-500 h-4 w-4 animate-spin"
                />
                <span class="text-surface-400 text-xs">
                  {{
                    $t(
                      "settings.general.streamer_mode_hint",
                      "Hides sensitive information while you're streaming."
                    )
                  }}
                </span>
              </div>
            </div>
          </div>
        </template>
      </GenericCard>
      <!-- Section 2: Game Profile -->
      <GenericCard
        icon="mdi-controller"
        icon-color="secondary"
        highlight-color="secondary"
        :fill-height="false"
        class="h-full"
      >
        <template #title>
          <span class="text-lg font-semibold">
            {{ $t("settings.game_profile.title", "Game Profile") }}
          </span>
        </template>
        <template #content>
          <div class="space-y-4 px-4 py-3">
            <div class="space-y-2">
              <p class="text-surface-200 text-sm font-semibold">
                {{ $t("settings.game_profile.game_edition", "Game Edition") }}
              </p>
              <USelectMenu
                v-model="selectedGameEdition"
                :items="gameEditionOptions"
                value-key="value"
                :popper="{ placement: 'bottom-start', strategy: 'fixed' }"
                :ui="selectUi"
                :ui-menu="selectMenuUi"
              >
                <template #leading>
                  <UIcon name="i-mdi-gift-open" class="text-surface-300 h-4 w-4" />
                </template>
              </USelectMenu>
            </div>
          </div>
        </template>
      </GenericCard>
    </div>
    <!-- Section 3: Data Management -->
    <GenericCard
      icon="mdi-database"
      icon-color="warning"
      highlight-color="tan"
      :fill-height="false"
      :title="$t('settings.data_management.title', 'Data Management')"
      title-classes="text-lg font-semibold"
    >
      <template #title-right>
        <UAlert
          v-if="!user.loggedIn"
          icon="i-mdi-information"
          color="info"
          variant="soft"
          class="inline-flex items-center p-1 text-sm"
        >
          <template #description>
            <span class="text-sm">
              {{
                $t(
                  "settings.data_management.login_hint",
                  "Log in to enable cloud sync and manage your progress across devices."
                )
              }}
            </span>
          </template>
        </UAlert>
      </template>
      <template #content>
        <div class="space-y-3 px-4 py-4">
          <div class="grid gap-3 md:grid-cols-3">
            <!-- Reset PvP Button with Modal -->
            <UModal
              :title="$t('settings.data_management.reset_pvp_title', 'Reset PvP Data')"
              :description="
                $t(
                  'settings.data_management.reset_pvp_confirmation',
                  'Are you sure you want to reset your PvP progress?'
                )
              "
            >
              <UButton
                icon="i-mdi-shield-sword"
                block
                :ui="{
                  base: 'bg-pvp-900 hover:bg-pvp-800 active:bg-pvp-700 text-pvp-200 focus-visible:ring focus-visible:ring-pvp-500',
                }"
              >
                {{ $t("settings.data_management.reset_pvp_data", "Reset PvP Data") }}
              </UButton>
              <template #body>
                <UAlert
                  icon="i-mdi-alert"
                  color="pvp"
                  variant="subtle"
                  :title="
                    $t(
                      'settings.data_management.reset_pvp_confirmation',
                      'Are you sure you want to reset your PvP progress?'
                    )
                  "
                />
                <p class="text-surface-200 mt-4 text-sm">
                  {{
                    $t(
                      "settings.data_management.reset_pvp_warning",
                      "This will permanently delete all your PvP progress including tasks, hideout, and level. Your PvE data will not be affected."
                    )
                  }}
                </p>
              </template>
              <template #footer>
                <div class="flex w-full items-center gap-3 pt-1">
                  <UButton
                    color="neutral"
                    variant="soft"
                    class="min-w-26 justify-center text-center"
                  >
                    {{ $t("settings.data_management.reset_cancel", "Cancel") }}
                  </UButton>
                  <UButton
                    color="error"
                    variant="solid"
                    class="ml-auto min-w-30 justify-center text-center"
                    :loading="resetting"
                    @click="resetPvPData"
                  >
                    {{ $t("settings.data_management.reset_confirm", "Reset PvP Data") }}
                  </UButton>
                </div>
              </template>
            </UModal>

            <!-- Reset PvE Button with Modal -->
            <UModal
              :title="$t('settings.data_management.reset_pve_title', 'Reset PvE Data')"
              :description="
                $t(
                  'settings.data_management.reset_pve_confirmation',
                  'Are you sure you want to reset your PvE progress?'
                )
              "
            >
              <UButton
                icon="i-mdi-account-group"
                block
                :ui="{
                  base: 'bg-pve-900 hover:bg-pve-800 active:bg-pve-700 text-pve-200 focus-visible:ring focus-visible:ring-pve-500',
                }"
              >
                {{ $t("settings.data_management.reset_pve_data", "Reset PvE Data") }}
              </UButton>
              <template #body>
                <UAlert
                  icon="i-mdi-alert"
                  color="pve"
                  variant="subtle"
                  :title="
                    $t(
                      'settings.data_management.reset_pve_confirmation',
                      'Are you sure you want to reset your PvE progress?'
                    )
                  "
                />
                <p class="text-surface-200 mt-4 text-sm">
                  {{
                    $t(
                      "settings.data_management.reset_pve_warning",
                      "This will permanently delete all your PvE progress including tasks, hideout, and level. Your PvP data will not be affected."
                    )
                  }}
                </p>
              </template>
              <template #footer>
                <div class="flex w-full items-center gap-3 pt-1">
                  <UButton color="neutral" variant="soft" class="min-w-26fy-center text-center">
                    {{ $t("settings.data_management.reset_cancel", "Cancel") }}
                  </UButton>
                  <UButton
                    color="error"
                    variant="solid"
                    class="ml-auto min-w-30 justify-center text-center"
                    :loading="resetting"
                    @click="resetPvEData"
                  >
                    {{ $t("settings.data_management.reset_confirm", "Reset PvE Data") }}
                  </UButton>
                </div>
              </template>
            </UModal>

            <!-- Reset All Button with Modal -->
            <UModal
              :title="$t('settings.data_management.reset_all_title', 'Reset All Data')"
              :description="
                $t(
                  'settings.data_management.reset_all_confirmation',
                  'Are you sure you want to reset ALL your progress?'
                )
              "
            >
              <UButton color="error" variant="soft" icon="i-mdi-delete-sweep" block>
                {{ $t("settings.data_management.reset_all_data", "Reset All Data") }}
              </UButton>
              <template #body>
                <UAlert
                  icon="i-mdi-alert-octagon"
                  color="error"
                  variant="subtle"
                  :title="
                    $t(
                      'settings.data_management.reset_all_confirmation',
                      'Are you sure you want to reset ALL your progress?'
                    )
                  "
                />
                <p class="text-surface-200 mt-4 text-sm">
                  {{
                    $t(
                      "settings.data_management.reset_all_warning",
                      "This will permanently delete ALL your progress for both PvP and PvE modes. This action cannot be undone!"
                    )
                  }}
                </p>
              </template>
              <template #footer>
                <div class="flex w-full items-center gap-3 pt-1">
                  <UButton
                    color="neutral"
                    variant="soft"
                    class="min-w-26 justify-center text-center"
                  >
                    {{ $t("settings.data_management.reset_cancel", "Cancel") }}
                  </UButton>
                  <UButton
                    color="error"
                    variant="solid"
                    class="ml-auto min-w-30 justify-center text-center"
                    :loading="resetting"
                    @click="resetAllData"
                  >
                    {{ $t("settings.data_management.reset_confirm", "Reset All Data") }}
                  </UButton>
                </div>
              </template>
            </UModal>
          </div>
          <p class="text-surface-400 text-center text-xs">
            {{
              $t(
                "settings.data_management.reset_hint",
                "Reset your progress for specific game modes or all data."
              )
            }}
          </p>
        </div>
      </template>
    </GenericCard>
    <!-- Section 4: API Management -->
    <GenericCard icon="mdi-api" icon-color="primary" highlight-color="blue" :fill-height="false">
      <template #title>
        <span class="text-lg font-semibold">
          {{ $t("settings.api_management.title", "API Management") }}
        </span>
      </template>
      <template #title-right>
        <UAlert
          v-if="!user.loggedIn"
          icon="i-mdi-lock"
          color="warning"
          variant="soft"
          class="inline-flex items-center p-1 text-sm"
        >
          <template #description>
            <span class="text-sm">
              {{
                $t(
                  "settings.api_management.login_required",
                  "You must be logged in to create and manage API tokens."
                )
              }}
            </span>
          </template>
        </UAlert>
      </template>
      <template #content>
        <div class="space-y-3 px-4 py-4">
          <UButton
            color="primary"
            variant="soft"
            icon="i-mdi-key-plus"
            block
            :disabled="!user.loggedIn"
            @click="navigateToApiPage"
          >
            {{ $t("settings.api_management.manage_tokens", "Manage API Tokens") }}
          </UButton>
          <p class="text-surface-400 text-center text-xs">
            {{
              $t(
                "settings.api_management.hint",
                "Create and manage API tokens for third-party integrations."
              )
            }}
          </p>
        </div>
      </template>
    </GenericCard>
    <!-- Section 5: Data Migration -->
    <DataMigrationCard v-if="user.loggedIn" />
    <!-- Section 6: Account Management -->
    <AccountDeletionCard v-if="user.loggedIn" />
  </div>
</template>
<script setup lang="ts">
  import { computed, ref } from "vue";
  import { useRouter } from "vue-router";
  import { usePreferencesStore } from "@/stores/preferences";
  import { useTarkovStore } from "@/stores/tarkov";
  import { GAME_EDITIONS } from "@/utils/constants";
  import GenericCard from "@/components/ui/GenericCard.vue";
  import AccountDeletionCard from "@/features/settings/AccountDeletionCard.vue";
  import DataMigrationCard from "@/features/settings/DataMigrationCard.vue";

  // Page meta
  definePageMeta({
    title: "Settings",
  });

  // Composables
  const { $supabase } = useNuxtApp();
  const router = useRouter();
  const toast = useToast();
  const preferencesStore = usePreferencesStore();
  const tarkovStore = useTarkovStore();
  const selectUi = {};
  const selectMenuUi = {
    container: "z-[9999]",
    background: "bg-surface-900",
    shadow: "shadow-xl",
    rounded: "rounded-lg",
    ring: "ring-1 ring-white/10",
    padding: "p-1",
    option: {
      base: "px-3 py-2 text-sm cursor-pointer transition-colors rounded",
      inactive: "text-surface-200 hover:bg-surface-800 hover:text-white",
      active: "bg-surface-800 text-white",
      selected: "bg-primary-500/10 text-primary-100 ring-1 ring-primary-500",
    },
  };
  // Reactive state
  const resetting = ref(false);

  // Computed properties
  const user = computed(() => ({
    loggedIn: $supabase.user.loggedIn,
  }));
  // Streamer mode
  const streamerMode = computed({
    get() {
      return preferencesStore.getStreamerMode;
    },
    set(newValue) {
      preferencesStore.setStreamerMode(newValue);
    },
  });
  // Game edition
  const gameEditionOptions = computed(() =>
    GAME_EDITIONS.map((edition) => ({
      label: edition.title,
      value: edition.value,
    }))
  );
  const selectedGameEdition = computed({
    get() {
      return tarkovStore.getGameEdition();
    },
    set(newValue: number) {
      tarkovStore.setGameEdition(newValue);
    },
  });

  // Methods
  const navigateToApiPage = () => {
    router.push("/api");
  };

  const resetPvPData = async () => {
    resetting.value = true;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (tarkovStore as any).resetPvPData();
      toast.add({
        title: "PvP Data Reset",
        description: "Your PvP progress has been reset successfully.",
        color: "success",
      });
      // Modal will auto-close after successful action
    } catch (error) {
      console.error("Error resetting PvP data:", error);
      toast.add({
        title: "Reset Failed",
        description: "Failed to reset PvP data. Please try again.",
        color: "error",
      });
    } finally {
      resetting.value = false;
    }
  };

  const resetPvEData = async () => {
    resetting.value = true;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (tarkovStore as any).resetPvEData();
      toast.add({
        title: "PvE Data Reset",
        description: "Your PvE progress has been reset successfully.",
        color: "success",
      });
      // Modal will auto-close after successful action
    } catch (error) {
      console.error("Error resetting PvE data:", error);
      toast.add({
        title: "Reset Failed",
        description: "Failed to reset PvE data. Please try again.",
        color: "error",
      });
    } finally {
      resetting.value = false;
    }
  };

  const resetAllData = async () => {
    resetting.value = true;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (tarkovStore as any).resetAllData();
      toast.add({
        title: "All Data Reset",
        description: "All your progress has been reset successfully.",
        color: "success",
      });
      // Modal will auto-close after successful action
    } catch (error) {
      console.error("Error resetting all data:", error);
      toast.add({
        title: "Reset Failed",
        description: "Failed to reset data. Please try again.",
        color: "error",
      });
    } finally {
      resetting.value = false;
    }
  };
</script>
