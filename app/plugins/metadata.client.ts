import { useMetadataStore } from "@/stores/metadata";

/**
 * Plugin to initialize the metadata store
 * This ensures the store is properly initialized and data is fetched
 * when the application starts.
 */
export default defineNuxtPlugin(async () => {
  const metadataStore = useMetadataStore();

  // Initialize the metadata store and fetch data
  await metadataStore.initialize();

  return {
    provide: {
      metadata: metadataStore,
    },
  };
});
