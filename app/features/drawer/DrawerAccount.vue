<template>
  <ul class="flex flex-col gap-1 px-1">
    <template v-if="isLoggedIn">
      <UDropdownMenu :items="accountItems" :content="{ side: 'right', align: 'start' }">
        <UButton
          color="neutral"
          variant="ghost"
          :padded="!isCollapsed"
          class="w-full justify-between"
          :class="[isCollapsed ? 'justify-center px-0' : '']"
          :ui="{ rounded: 'rounded-md', padding: { sm: 'p-2' } }"
        >
          <div class="flex min-w-0 items-center gap-3">
            <UAvatar :src="avatarSrc" size="md" alt="User avatar" class="shrink-0" />
            <span v-if="!isCollapsed" class="truncate">{{ userDisplayName }}</span>
          </div>
          <template #trailing>
            <UIcon
              v-if="!isCollapsed"
              name="i-heroicons-chevron-down-20-solid"
              class="h-5 w-5 transition-transform duration-200"
            />
          </template>
        </UButton>
      </UDropdownMenu>
    </template>
    <template v-else>
      <UButton
        to="/login"
        icon="i-mdi-fingerprint"
        color="neutral"
        variant="ghost"
        block
        :padded="!isCollapsed"
        :ui="{ rounded: 'rounded-md', padding: { sm: 'px-3 py-3' } }"
        class="h-12 justify-center"
      >
        <span v-if="!isCollapsed" class="truncate text-base font-medium">
          {{ t('navigation_drawer.login') }}
        </span>
      </UButton>
    </template>
  </ul>
</template>
<script setup>
  import { computed } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { usePreferencesStore } from '@/stores/usePreferences';
  defineProps({
    isCollapsed: {
      type: Boolean,
      default: false,
    },
  });
  const { $supabase } = useNuxtApp();
  const preferencesStore = usePreferencesStore();
  const { t } = useI18n();
  const isLoggedIn = computed(() => $supabase.user?.loggedIn ?? false);
  const avatarSrc = computed(() => {
    return preferencesStore.getStreamerMode || !$supabase.user.photoURL
      ? '/img/default-avatar.svg'
      : $supabase.user.photoURL;
  });
  const userDisplayName = computed(() => {
    return preferencesStore.getStreamerMode ? 'User' : $supabase.user.displayName || 'User';
  });
  const accountItems = computed(() => [
    {
      label: t('navigation_drawer.logout'),
      icon: 'i-mdi-lock',
      onSelect: logout,
    },
  ]);
  function logout() {
    $supabase.signOut();
  }
</script>
