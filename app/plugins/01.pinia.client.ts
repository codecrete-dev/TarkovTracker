/* eslint-disable import/no-mutable-exports */
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';
import type { Pinia } from 'pinia';
export let pinia: Pinia | undefined;
export function installPiniaPlugins(target: Pinia): void {
  // Install persistedstate plugin for automatic localStorage persistence
  target.use(piniaPluginPersistedstate);
}
export default defineNuxtPlugin((nuxtApp) => {
  // Get pinia instance from @pinia/nuxt module
  pinia = nuxtApp.$pinia as Pinia | undefined;
  if (!pinia) {
    console.error('[PiniaPlugin] $pinia is undefined – persist plugin not installed');
    return;
  }
  installPiniaPlugins(pinia);
  // Don't provide $pinia again - it's already provided by @pinia/nuxt
});
