<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="space-y-1">
        <p class="text-surface-50 text-base font-semibold">
          {{ t('page.settings.card.apitokens.title') }}
        </p>
        <p class="text-surface-400 max-w-3xl text-sm">
          {{
            t('page.settings.card.apitokens.description', {
              openAPI_documentation: t('page.settings.card.apitokens.openAPI_documentation'),
            })
          }}
        </p>
      </div>
      <UButton
        color="primary"
        variant="soft"
        icon="i-mdi-key-plus"
        :disabled="!userLoggedIn || creating"
        @click="showCreateDialog = true"
      >
        {{ t('page.settings.card.apitokens.new_token_expand') }}
      </UButton>
    </div>
    <div class="space-y-3">
      <div v-if="loading" class="space-y-2">
        <div class="h-12 animate-pulse rounded-lg bg-white/5"></div>
        <div class="h-12 animate-pulse rounded-lg bg-white/5"></div>
      </div>
      <div v-else-if="!tokens.length" class="bg-surface-900 rounded-lg border border-white/5 p-4">
        <UAlert
          color="primary"
          variant="soft"
          :title="t('page.settings.card.apitokens.no_tokens')"
        />
      </div>
      <div v-else class="space-y-2">
        <UCard
          v-for="token in tokens"
          :key="token.id"
          class="bg-surface-900 border border-white/10"
          :ui="{ body: 'space-y-2' }"
        >
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="space-y-2">
              <div class="flex items-center gap-2">
                <UIcon name="i-mdi-key-variant" class="text-primary-400 h-5 w-5" />
                <span class="text-surface-50 font-medium">
                  {{ token.note || t('page.settings.card.apitokens.default_note') }}
                </span>
              </div>
              <div class="flex flex-wrap gap-2 text-xs">
                <UBadge color="primary" variant="solid" size="xs">
                  {{ formatGameMode(token.gameMode) }}
                </UBadge>
                <UBadge
                  v-for="perm in token.permissions"
                  :key="perm"
                  color="info"
                  variant="soft"
                  size="xs"
                >
                  {{ permissionLabel(perm) }}
                </UBadge>
              </div>
              <div class="text-surface-400 flex flex-wrap gap-3 text-xs">
                <span>
                  {{ t('page.settings.card.apitokens.list.created') }}:
                  {{ formatDate(token.createdAt) }}
                </span>
                <span>
                  {{ t('page.settings.card.apitokens.list.last_used') }}:
                  {{
                    token.lastUsedAt
                      ? formatDate(token.lastUsedAt)
                      : t('page.settings.card.apitokens.list.never')
                  }}
                </span>
                <span>
                  {{
                    t('page.settings.card.apitokens.list.usage_count', {
                      count: token.usageCount ?? 0,
                    })
                  }}
                </span>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <UBadge v-if="!token.isActive" color="warning" variant="subtle" size="xs">
                {{ t('page.settings.card.apitokens.list.revoked') }}
              </UBadge>
              <UButton
                color="error"
                variant="ghost"
                icon="i-mdi-close-circle"
                size="xs"
                :loading="revokingId === token.id"
                @click="revokeToken(token.id)"
              >
                {{ t('page.settings.card.apitokens.revoke_button') }}
              </UButton>
            </div>
          </div>
        </UCard>
      </div>
    </div>
    <UModal v-model="showCreateDialog">
      <UCard class="bg-surface-900 border border-white/10" :ui="{ body: 'space-y-4' }">
        <template #header>
          <div class="flex items-center gap-2 px-4 py-3">
            <UIcon name="i-mdi-key-plus" class="text-primary-400 h-5 w-5" />
            <h3 class="text-lg font-semibold">
              {{ t('page.settings.card.apitokens.new_token_expand') }}
            </h3>
          </div>
        </template>
        <div class="space-y-4 px-4 pb-2">
          <div class="space-y-2">
            <p class="text-surface-200 text-sm font-semibold">
              {{ t('page.settings.card.apitokens.form.gamemode_title') }}
            </p>
            <URadio
              v-for="mode in gameModes"
              :key="mode.value"
              v-model="selectedGameMode"
              :label="mode.label"
              :value="mode.value"
            />
          </div>
          <div class="space-y-2">
            <p class="text-surface-200 text-sm font-semibold">
              {{ t('page.settings.card.apitokens.form.permissions_title') }}
            </p>
            <UCheckbox
              v-for="permission in permissionOptions"
              :key="permission.value"
              :model-value="selectedPermissions.includes(permission.value)"
              :label="permission.label"
              name="permissions"
              @update:model-value="
                (checked) => togglePermission(permission.value, checked as boolean)
              "
            >
              <template #description>
                <span class="text-surface-400 text-xs">{{ permission.description }}</span>
              </template>
            </UCheckbox>
          </div>
          <div class="space-y-2">
            <p class="text-surface-200 text-sm font-semibold">
              {{ t('page.settings.card.apitokens.form.note_label') }}
            </p>
            <UInput
              v-model="note"
              :placeholder="t('page.settings.card.apitokens.form.note_placeholder')"
            />
          </div>
          <UAlert
            icon="i-mdi-alert-circle"
            color="warning"
            variant="soft"
            :title="t('page.settings.card.apitokens.form.warning')"
          />
        </div>
        <template #footer>
          <div class="flex justify-end gap-2 px-4 pb-4">
            <UButton color="neutral" variant="ghost" @click="closeCreateDialog">
              {{ t('page.settings.card.apitokens.form.cancel') }}
            </UButton>
            <UButton
              color="primary"
              variant="solid"
              :disabled="!canSubmit"
              :loading="creating"
              @click="createToken"
            >
              {{ t('page.settings.card.apitokens.submit_new_token') }}
            </UButton>
          </div>
        </template>
      </UCard>
    </UModal>
    <UModal v-model="showTokenCreatedDialog">
      <UCard class="bg-surface-900 border border-white/10" :ui="{ body: 'space-y-4' }">
        <template #header>
          <div class="flex items-center gap-2 px-4 py-3">
            <UIcon name="i-mdi-check-circle" class="h-5 w-5 text-green-400" />
            <h3 class="text-lg font-semibold">
              {{ t('page.settings.card.apitokens.token_created') }}
            </h3>
          </div>
        </template>
        <div class="space-y-3 px-4 pb-4">
          <p class="text-surface-300 text-sm">
            {{ t('page.settings.card.apitokens.token_created_description') }}
          </p>
          <UInput v-model="generatedToken" readonly>
            <template #trailing>
              <UButton
                color="neutral"
                variant="ghost"
                icon="i-mdi-clipboard-multiple-outline"
                :padded="false"
                @click="copyToken"
              />
            </template>
          </UInput>
        </div>
        <template #footer>
          <div class="flex justify-end gap-2 px-4 pb-4">
            <UButton color="primary" variant="solid" @click="showTokenCreatedDialog = false">
              {{ t('page.settings.card.apitokens.token_created_close') }}
            </UButton>
          </div>
        </template>
      </UCard>
    </UModal>
  </div>
</template>
<script setup lang="ts">
  import { computed, onMounted, ref, watch } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { useEdgeFunctions } from '@/composables/api/useEdgeFunctions';
  import type { RawTokenRow, TokenPermission, TokenRow } from '@/types/api';
  import { API_PERMISSIONS, GAME_MODE_OPTIONS, GAME_MODES, type GameMode } from '@/utils/constants';
  interface SupabaseTable {
    select: (query: string) => SupabaseTable;
    insert: (data: Record<string, unknown>) => SupabaseTable;
    delete: () => SupabaseTable;
    eq: (column: string, value: unknown) => SupabaseTable;
    order: (column: string, options?: { ascending: boolean }) => SupabaseTable;
    single: () => Promise<{ data: unknown; error: unknown }>;
    then: (
      onfulfilled?: ((value: { data: unknown; error: unknown }) => unknown) | null
    ) => Promise<unknown>;
  }
  const { t } = useI18n();
  const toast = useToast();
  const { $supabase } = useNuxtApp();
  const edgeFunctions = useEdgeFunctions();
  const showCreateDialog = ref(false);
  const showTokenCreatedDialog = ref(false);
  const loading = ref(false);
  const creating = ref(false);
  const revokingId = ref<string | null>(null);
  const tokens = ref<TokenRow[]>([]);
  const selectedGameMode = ref<GameMode>(GAME_MODES.PVP);
  const selectedPermissions = ref<TokenPermission[]>(['GP']);
  const note = ref('');
  const generatedToken = ref('');
  const userLoggedIn = computed(() => $supabase.user.loggedIn);
  const permissionOptions = computed(() =>
    Object.entries(API_PERMISSIONS).map(([key, value]) => ({
      value: key as TokenPermission,
      label: value.title,
      description: value.description,
    }))
  );
  const gameModes = GAME_MODE_OPTIONS.map((mode) => ({
    label: mode.label,
    value: mode.value as GameMode,
  }));
  const canSubmit = computed(
    () => userLoggedIn.value && selectedPermissions.value.length > 0 && !!selectedGameMode.value
  );
  const formatDate = (date: string | null) => {
    if (!date) return '';
    return new Date(date).toLocaleString();
  };
  const formatGameMode = (mode: GameMode) => {
    return mode === GAME_MODES.PVE ? 'PvE' : 'PvP';
  };
  const permissionLabel = (value: TokenPermission) => {
    return permissionOptions.value.find((perm) => perm.value === value)?.label || value;
  };
  const tableClient = (): SupabaseTable | null => {
    return (
      ($supabase.client as unknown as { from?: (name: string) => SupabaseTable })?.from?.(
        'api_tokens'
      ) || null
    );
  };
  const loadTokens = async () => {
    const table = tableClient();
    if (!userLoggedIn.value || !$supabase.user.id || !table) {
      tokens.value = [];
      return;
    }
    loading.value = true;
    try {
      const { data, error } = await table
        .select(
          'token_id, note, permissions, game_mode, created_at, last_used_at, usage_count, is_active'
        )
        .eq('user_id', $supabase.user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      tokens.value =
        (data as RawTokenRow[])?.map((row: RawTokenRow) => ({
          id: row.token_id,
          note: row.note,
          permissions: row.permissions || [],
          gameMode: row.game_mode,
          createdAt: row.created_at,
          lastUsedAt: row.last_used_at,
          usageCount: row.usage_count ?? 0,
          isActive: row.is_active ?? true,
        })) || [];
    } catch (error) {
      console.error('[ApiTokens] Failed to load tokens', error);
      toast.add({
        title: t('page.settings.card.apitokens.create_token_error'),
        color: 'error',
      });
    } finally {
      loading.value = false;
    }
  };
  const generateToken = () => {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return `tt_${hex}`;
  };
  const hashToken = async (token: string) => {
    const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
    return Array.from(new Uint8Array(buffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  };
  const closeCreateDialog = () => {
    showCreateDialog.value = false;
  };
  const resetForm = () => {
    selectedGameMode.value = GAME_MODES.PVP;
    selectedPermissions.value = ['GP'];
    note.value = '';
  };
  const togglePermission = (value: TokenPermission, checked: boolean) => {
    if (checked) {
      if (!selectedPermissions.value.includes(value)) {
        selectedPermissions.value.push(value);
      }
    } else {
      selectedPermissions.value = selectedPermissions.value.filter((p) => p !== value);
    }
  };
  const createToken = async () => {
    const table = tableClient();
    if (!canSubmit.value || !$supabase.user.id || !table) return;
    creating.value = true;
    try {
      const rawToken = generateToken();
      const hashedToken = await hashToken(rawToken);
      const { error } = await table
        .insert({
          user_id: $supabase.user.id,
          token_hash: hashedToken,
          permissions: selectedPermissions.value,
          game_mode: selectedGameMode.value,
          note: note.value || null,
        })
        .select('token_id')
        .single();
      if (error) throw error;
      generatedToken.value = rawToken;
      toast.add({
        title: t('page.settings.card.apitokens.create_token_success'),
        color: 'success',
      });
      showCreateDialog.value = false;
      showTokenCreatedDialog.value = true;
      await loadTokens();
      resetForm();
    } catch (error) {
      console.error('[ApiTokens] Failed to create token', error);
      toast.add({
        title: t('page.settings.card.apitokens.create_token_error'),
        color: 'error',
      });
    } finally {
      creating.value = false;
    }
  };
  const copyToken = async () => {
    if (!generatedToken.value) return;
    try {
      await navigator.clipboard.writeText(generatedToken.value);
      toast.add({
        title: t('page.settings.card.apitokens.token_copied'),
        color: 'success',
      });
    } catch (error) {
      console.error('[ApiTokens] Failed to copy token', error);
    }
  };
  const revokeToken = async (tokenId: string) => {
    if (!tokenId) return;
    revokingId.value = tokenId;
    try {
      await edgeFunctions.revokeToken(tokenId);
      toast.add({
        title: t('page.settings.card.apitokens.token_revoked'),
        color: 'success',
      });
      await loadTokens();
    } catch (error) {
      console.error('[ApiTokens] Failed to revoke token', error);
      toast.add({
        title: t('page.settings.card.apitokens.token_revoke_error'),
        color: 'error',
      });
    } finally {
      revokingId.value = null;
    }
  };
  watch(
    () => $supabase.user.loggedIn,
    (loggedIn) => {
      if (loggedIn) {
        loadTokens();
      } else {
        tokens.value = [];
      }
    },
    { immediate: true }
  );
  onMounted(() => {
    if (userLoggedIn.value) loadTokens();
  });
</script>
