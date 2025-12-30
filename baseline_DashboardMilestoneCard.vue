<template>
  <div
    :class="[
      'relative overflow-hidden rounded-xl border p-6 transition-all',
      isAchieved ? achievedClasses : 'bg-surface-900/50 border-surface-700/30 opacity-50',
    ]"
  >
    <div class="relative z-10">
      <UIcon
        :name="isAchieved ? achievedIcon : unachievedIcon"
        :class="['mb-3 h-12 w-12', isAchieved ? iconColorClass : 'text-surface-600']"
      />
      <div class="mb-1 text-3xl font-bold text-white">{{ title }}</div>
      <div class="text-surface-400 text-xs tracking-wider uppercase">{{ subtitle }}</div>
    </div>
  </div>
</template>
<script setup lang="ts">
  export type MilestoneColor = 'primary' | 'info' | 'success' | 'warning' | 'purple';
  const props = withDefaults(
    defineProps<{
      title: string;
      subtitle: string;
      isAchieved: boolean;
      achievedIcon: string;
      unachievedIcon: string;
      color?: MilestoneColor;
    }>(),
    {
      color: 'primary' as MilestoneColor,
    }
  );
  const colorClasses: Record<MilestoneColor, { achieved: string; icon: string }> = {
    primary: {
      achieved: [
        'from-primary-900/40 to-surface-900 border-primary-600/50',
        'shadow-primary-900/20 bg-linear-to-br shadow-lg',
      ].join(' '),
      icon: 'text-primary-400',
    },
    info: {
      achieved: [
        'from-info-900/40 to-surface-900 border-info-600/50',
        'shadow-info-900/20 bg-linear-to-br shadow-lg',
      ].join(' '),
      icon: 'text-info-400',
    },
    success: {
      achieved: [
        'from-success-900/40 to-surface-900 border-success-600/50',
        'shadow-success-900/20 bg-linear-to-br shadow-lg',
      ].join(' '),
      icon: 'text-success-400',
    },
    warning: {
      achieved: [
        'from-warning-900/40 to-surface-900 border-warning-600/50',
        'shadow-warning-900/20 bg-linear-to-br shadow-lg',
      ].join(' '),
      icon: 'text-warning-400',
    },
    purple: {
      achieved: [
        'from-purple-900/40 to-surface-900 border-purple-600/50',
        'shadow-purple-900/20 bg-linear-to-br shadow-lg',
      ].join(' '),
      icon: 'text-purple-400',
    },
  };
  const achievedClasses = computed(() => colorClasses[props.color].achieved);
  const iconColorClass = computed(() => colorClasses[props.color].icon);
</script>
