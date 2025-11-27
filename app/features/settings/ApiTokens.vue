<template>
  <div>
    <div class="m-2 rounded-lg border border-gray-700 bg-gray-800/50 p-6 text-center">
      <UIcon name="i-mdi-key-outline" class="text-primary-500 mb-4 h-16 w-16" />
      <h3 class="mb-2 text-xl font-medium">
        {{ $t("page.api.tokens.title") }}
      </h3>
      <p class="mb-4 text-sm">
        {{ $t("page.api.tokens.description") }}
      </p>
      <UButton
        color="primary"
        variant="soft"
        icon="i-mdi-key-plus"
        @click="showCreateTokenDialog = true"
      >
        {{ $t("page.api.tokens.create_new_token") }}
      </UButton>
    </div>
    <!-- Create Token Dialog -->
    <UModal v-model="showCreateTokenDialog">
      <UCard>
        <template #header>
          <div class="flex items-center px-4 py-3">
            <UIcon name="i-mdi-key-plus" class="mr-2 h-6 w-6 text-white" />
            <h3 class="text-xl font-medium">
              {{ $t("page.api.tokens.create_new_token") }}
            </h3>
          </div>
        </template>
        <div class="px-4 pb-4">
          <form @submit.prevent="createToken">
            <div class="mb-2 flex items-center text-sm font-medium">
              <UIcon name="i-mdi-gamepad-variant" class="mr-2 h-5 w-5" />
              {{ $t("page.api.tokens.form.gamemode_title") }}
            </div>
            <div class="mb-4 space-y-2">
              <URadio
                v-for="mode in gameModes"
                :key="mode.value"
                v-model="selectedGameMode"
                :label="mode.text"
                :value="mode.value"
              />
            </div>
            <div class="mt-4 mb-2 flex items-center text-sm font-medium">
              <UIcon name="i-mdi-shield-key" class="mr-2 h-5 w-5" />
              {{ $t("page.api.tokens.form.permissions_title") }}
            </div>
            <div class="space-y-2">
              <UCheckbox
                v-for="permission in permissions"
                :key="permission.value"
                v-model="selectedPermissions"
                :label="permission.text"
                :value="permission.value"
              />
            </div>
            <UAlert
              icon="i-mdi-alert-circle"
              color="orange"
              variant="soft"
              class="mt-4"
              :title="$t('page.api.tokens.form.warning')"
            />
          </form>
        </div>
        <template #footer>
          <div class="flex justify-end px-4 pb-4">
            <UButton color="gray" variant="ghost" @click="showCreateTokenDialog = false">
              {{ $t("common.cancel") }}
            </UButton>
            <UButton
              color="primary"
              variant="solid"
              class="ml-2"
              :disabled="!isValid"
              @click="createToken"
            >
              {{ $t("common.create") }}
            </UButton>
          </div>
        </template>
      </UCard>
    </UModal>
    <!-- Token Created Dialog -->
    <UModal v-model="showTokenCreatedDialog">
      <UCard>
        <template #header>
          <div class="flex items-center px-4 py-3">
            <UIcon name="i-mdi-check-circle" class="mr-2 h-6 w-6 text-green-500" />
            <h3 class="text-xl font-medium">
              {{ $t("page.api.tokens.token_created") }}
            </h3>
          </div>
        </template>
        <div class="px-4 pb-4">
          <p class="mb-4 text-base">
            {{ $t("page.api.tokens.token_created_description") }}
          </p>
          <UInput :model-value="newToken" readonly :ui="{ icon: { trailing: { pointer: '' } } }">
            <template #trailing>
              <UButton
                color="gray"
                variant="link"
                icon="i-mdi-clipboard-multiple-outline"
                :padded="false"
                @click="copyToken"
              />
            </template>
          </UInput>
        </div>
        <template #footer>
          <div class="flex justify-end px-4 pb-4">
            <UButton color="primary" variant="solid" @click="showTokenCreatedDialog = false">
              {{ $t("common.close") }}
            </UButton>
          </div>
        </template>
      </UCard>
    </UModal>
    <!-- Existing Tokens -->
    <div class="m-2 rounded-lg border border-gray-700 bg-gray-800/50 p-6">
      <h3 class="mb-4 text-xl font-medium">
        {{ $t("page.api.tokens.existing_tokens") }}
      </h3>
      <div v-if="tokens.length > 0" class="space-y-2">
        <div
          v-for="token in tokens"
          :key="token.id"
          class="flex items-center justify-between rounded-lg bg-gray-700/50 p-3"
        >
          <div>
            <div class="font-medium">{{ token.name }}</div>
            <div class="text-sm text-gray-400">
              {{ $t("page.api.tokens.created_at") }}:
              {{ formatDate(token.createdAt) }}
            </div>
          </div>
          <UButton
            icon="i-mdi-delete"
            size="xs"
            variant="ghost"
            color="red"
            @click="deleteToken(token.id)"
          />
        </div>
      </div>
      <UAlert v-else color="blue" variant="soft" :title="$t('page.api.tokens.no_tokens')" />
    </div>
  </div>
</template>
<script setup>
  import { ref, computed } from "vue";
  import { useI18n } from "vue-i18n";
  import { GAME_MODES } from "@/utils/constants";
  const { t } = useI18n();
  const toast = useToast();
  // Dialog states
  const showCreateTokenDialog = ref(false);
  const showTokenCreatedDialog = ref(false);
  // Form state
  const selectedGameMode = ref(GAME_MODES.PVP);
  const selectedPermissions = ref(["read"]);
  const newToken = ref("");
  // Validation
  const isValid = computed(() => {
    return selectedGameMode.value && selectedPermissions.value.length > 0;
  });
  // Game modes
  const gameModes = [
    { text: t("page.api.tokens.form.gamemode_standard"), value: GAME_MODES.PVP },
    { text: t("page.api.tokens.form.gamemode_pve"), value: GAME_MODES.PVE },
  ];
  // Permissions
  const permissions = [
    { text: t("page.api.tokens.form.permission_read"), value: "read" },
    { text: t("page.api.tokens.form.permission_write"), value: "write" },
    { text: t("page.api.tokens.form.permission_delete"), value: "delete" },
  ];
  // Mock tokens data
  const tokens = ref([
    {
      id: "1",
      name: "Test Token",
      createdAt: new Date().toISOString(),
    },
  ]);
  // Methods
  const createToken = () => {
    if (!isValid.value) return;
    // Mock token creation
    newToken.value = "mock-token-" + Math.random().toString(36).substring(7);
    showCreateTokenDialog.value = false;
    showTokenCreatedDialog.value = true;
  };
  const copyToken = () => {
    navigator.clipboard.writeText(newToken.value);
    toast.add({ title: t("page.api.tokens.token_copied"), color: "green" });
  };
  const deleteToken = (tokenId) => {
    // Mock token deletion
    tokens.value = tokens.value.filter((token) => token.id !== tokenId);
    toast.add({ title: t("page.api.tokens.token_deleted"), color: "green" });
  };
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };
</script>
