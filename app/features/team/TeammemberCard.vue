<template>
  <UCard class="p-2" :ui="{ body: { padding: 'p-2' } }">
    <div class="mb-2 flex items-center justify-between">
      <div class="text-left">
        <div class="text-2xl font-bold">
          {{ progressStore.getDisplayName(props.teammember) }}
        </div>
        <div v-if="props.teammember == $supabase.user.id" class="text-left">
          <b class="text-sm">
            {{ $t("page.team.card.manageteam.membercard.this_is_you") }}
          </b>
        </div>
      </div>
      <div class="flex items-center justify-center">
        <span class="leading-none">
          <img :src="groupIcon" class="max-w-[64px] object-contain" />
        </span>
        <span class="ml-2">
          <div class="mb-1 text-center text-xs">
            {{ $t("navigation_drawer.level") }}
          </div>
          <div class="text-center">
            <h1 class="text-4xl leading-[0.8em] font-bold">
              {{ progressStore.getLevel(props.teammember) }}
            </h1>
          </div>
        </span>
      </div>
    </div>
    <div class="flex items-center justify-between">
      <div>
        <i18n-t
          v-if="!preferencesStore.teamIsHidden(props.teammember)"
          keypath="page.team.card.manageteam.membercard.taskscomplete"
          scope="global"
        >
          <template #completed>
            <b>
              {{ completedTaskCount }}
            </b>
          </template>
          <template #total>
            <b>
              {{ tasks.length }}
            </b>
          </template>
        </i18n-t>
      </div>
      <div class="flex gap-1">
        <UButton
          :disabled="props.teammember == $supabase.user.id || preferencesStore.taskTeamAllHidden"
          variant="outline"
          :icon="
            props.teammember != $supabase.user.id && preferencesStore.teamIsHidden(props.teammember)
              ? 'i-mdi-eye-off'
              : 'i-mdi-eye'
          "
          :color="
            props.teammember != $supabase.user.id && preferencesStore.teamIsHidden(props.teammember)
              ? 'red'
              : 'green'
          "
          size="xs"
          @click="preferencesStore.toggleHidden(props.teammember)"
        />
        <!-- Button to delete the token -->
        <UButton
          v-if="props.teammember != $supabase.user.id && isTeamOwnerView"
          variant="outline"
          icon="i-mdi-account-minus"
          color="red"
          size="xs"
          :loading="kickingTeammate"
          :disabled="kickingTeammate"
          @click="kickTeammate()"
        />
      </div>
    </div>
  </UCard>
</template>
<script setup>
  // Team member management moved to Cloudflare Workers - TODO: Implement replacement
  import { computed, ref } from "vue";
  import { useI18n } from "vue-i18n";
  import { usePreferencesStore } from "@/stores/preferences";
  import { useProgressStore } from "@/stores/progress";
  import { useMetadataStore } from "@/stores/metadata";
  const { $supabase } = useNuxtApp();
  const toast = useToast();
  // Define the props for the component
  const props = defineProps({
    teammember: {
      type: String,
      required: true,
    },
    isTeamOwnerView: {
      type: Boolean,
      required: true,
    },
  });
  const teamStoreId = computed(() => {
    if (props.teammember == $supabase.user.id) {
      return "self";
    } else {
      return props.teammember;
    }
  });
  const progressStore = useProgressStore();
  const preferencesStore = usePreferencesStore();
  const metadataStore = useMetadataStore();
  const tasks = computed(() => metadataStore.tasks);
  const playerLevels = computed(() => metadataStore.playerLevels);
  const { t } = useI18n({ useScope: "global" });
  const completedTaskCount = computed(() => {
    return tasks.value.filter(
      (task) => progressStore.tasksCompletions?.[task.id]?.[teamStoreId.value] == true
    ).length;
  });
  const groupIcon = computed(() => {
    const level = progressStore.getLevel(props.teammember);
    const entry = playerLevels.value.find((pl) => pl.level === level);
    return entry?.levelBadgeImageLink ?? "";
  });
  const kickingTeammate = ref(false);
  const kickTeammate = async () => {
    if (!props.teammember) return;
    kickingTeammate.value = true;
    try {
      // TODO: Implement Cloudflare Workers integration for kicking team members
      console.log("TODO: Implement Cloudflare Workers for kickTeammate function");
      throw new Error("Team member kicking not yet implemented with Cloudflare Workers");

      // Placeholder for future implementation:
      // const session = await $supabase.client.auth.getSession();
      // if (!session.data.session) {
      //   throw new Error('User not authenticated');
      // }
      // const response = await fetch('/api/team/kick', {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Bearer ${session.data.session.access_token}`,
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({ kicked: props.teammember }),
      // });
      // const result = await response.json();
      // ... handle response
    } catch (error) {
      const backendMsg = error?.message || error?.data?.message || error?.toString();
      const message = backendMsg || t("page.team.card.manageteam.membercard.kick_error");
      console.error("[TeammemberCard.vue] Error kicking teammate:", error);
      toast.add({ title: message, color: "red" });
    }
    kickingTeammate.value = false;
  };
</script>
