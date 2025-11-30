import { useBreakpoints } from '@vueuse/core';
import { computed } from 'vue';
// Shared breakpoints composable to avoid per-component listeners
const breakpoints = useBreakpoints({ mobile: 0, sm: 600 });
const xsRef = breakpoints.smaller('sm');
export function useSharedBreakpoints() {
  // return as readonly/computed to avoid accidental mutation
  const xs = computed(() => xsRef.value);
  return { xs };
}
