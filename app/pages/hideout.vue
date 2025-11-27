<template>
  <div class="container mx-auto min-h-[calc(100vh-250px)] space-y-4 px-4 py-6">
    <div class="flex justify-center">
      <UCard class="bg-surface-900 w-full max-w-4xl border border-white/10">
        <div class="flex flex-wrap justify-center gap-2">
          <UButton
            v-for="view in primaryViews"
            :key="view.view"
            :icon="`i-${view.icon}`"
            :variant="activePrimaryView === view.view ? 'solid' : 'soft'"
            :color="activePrimaryView === view.view ? 'primary' : 'neutral'"
            size="xl"
            class="max-w-[300px] min-w-[160px] flex-1 justify-center"
            @click="activePrimaryView = view.view"
          >
            {{ view.title }}
          </UButton>
        </div>
      </UCard>
    </div>
    <div>
      <div v-if="isStoreLoading" class="text-surface-200 flex flex-col items-center gap-3 py-10">
        <UIcon name="i-heroicons-arrow-path" class="text-primary-500 h-8 w-8 animate-spin" />
        <div class="flex items-center gap-2 text-sm">
          {{ $t("page.hideout.loading") }}
          <RefreshButton />
        </div>
      </div>
      <div v-else-if="visibleStations.length === 0" class="flex justify-center">
        <UAlert
          icon="i-mdi-clipboard-search"
          color="neutral"
          variant="soft"
          class="max-w-xl"
          :title="$t('page.hideout.nostationsfound')"
        />
      </div>
      <div v-else class="mt-2 columns-1 gap-3 space-y-3 md:columns-2 xl:columns-3">
        <HideoutCard
          v-for="(hStation, hIndex) in visibleStations"
          :key="hIndex"
          :station="hStation"
          class="mb-3 break-inside-avoid"
        />
      </div>
    </div>
  </div>
</template>
<script setup>
  import { defineAsyncComponent } from "vue";
  import { useI18n } from "vue-i18n";
  import { useHideoutFiltering } from "@/composables/useHideoutFiltering";
  const HideoutCard = defineAsyncComponent(() => import("@/features/hideout/HideoutCard.vue"));
  const RefreshButton = defineAsyncComponent(() => import("@/components/ui/RefreshButton.vue"));
  const { t } = useI18n({ useScope: "global" });
  // Hideout filtering composable
  const { activePrimaryView, isStoreLoading, visibleStations } = useHideoutFiltering();
  const primaryViews = [
    {
      title: t("page.hideout.primaryviews.available"),
      icon: "mdi-tag-arrow-up-outline",
      view: "available",
    },
    {
      title: t("page.hideout.primaryviews.maxed"),
      icon: "mdi-arrow-collapse-up",
      view: "maxed",
    },
    {
      title: t("page.hideout.primaryviews.locked"),
      icon: "mdi-lock",
      view: "locked",
    },
    {
      title: t("page.hideout.primaryviews.all"),
      icon: "mdi-clipboard-check",
      view: "all",
    },
  ];
</script>
