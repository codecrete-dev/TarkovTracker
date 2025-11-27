import { ref, onMounted, onUnmounted, watch, type Ref } from "vue";

export function useInfiniteScroll(
  sentinelRef: Ref<HTMLElement | null>,
  onLoadMore: () => void,
  options: {
    rootMargin?: string;
    threshold?: number;
    enabled?: boolean;
  } = {}
) {
  const { rootMargin = "100px", threshold = 0.1, enabled = true } = options;

  let observer: IntersectionObserver | null = null;
  const isLoading = ref(false);

  const handleIntersection = (entries: IntersectionObserverEntry[]) => {
    const target = entries[0];
    if (target?.isIntersecting && enabled && !isLoading.value) {
      isLoading.value = true;
      onLoadMore();
      // Use a small timeout to prevent rapid successive calls
      setTimeout(() => {
        isLoading.value = false;
      }, 100);
    }
  };

  const start = () => {
    if (!observer) {
      observer = new IntersectionObserver(handleIntersection, {
        rootMargin,
        threshold,
      });
      if (sentinelRef.value) {
        observer.observe(sentinelRef.value);
      }
    }
  };

  const stop = () => {
    observer?.disconnect();
    observer = null;
  };

  // Watch for sentinel element changes (e.g. when v-if renders it)
  watch(sentinelRef, (el) => {
    if (observer) {
      observer.disconnect();
      if (el) {
        observer.observe(el);
      }
    }
  });

  onMounted(() => {
    start();
  });

  onUnmounted(() => {
    stop();
  });

  return {
    isLoading,
    stop,
    start,
  };
}
