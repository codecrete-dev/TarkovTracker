<template>
  <icon-card
    icon="mdi-account-group"
    icon-background="var(--color-accent-800)"
    icon-color="var(--color-brand-500)"
  >
    <template #stat>
      {{ $t('module.team_settings.title') }}
    </template>
    <template #content>
      <div class="p-4">
        {{ $t('module.team_settings.description') }}
        <div class="mt-4 flex justify-center">
          <div class="w-full">Test</div>
        </div>
      </div>
    </template>
  </icon-card>
</template>
<script setup>
  import IconCard from '@/components/ui/IconCard.vue';
</script>
