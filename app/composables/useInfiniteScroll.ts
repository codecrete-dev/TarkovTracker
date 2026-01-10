import {
  type ComputedRef,
  computed,
  isRef,
  nextTick,
  onMounted,
  onUnmounted,
  type Ref,
  ref,
  watch,
} from 'vue';
import { logger } from '@/utils/logger';
export interface UseInfiniteScrollOptions {
  rootMargin?: string;
  threshold?: number;
  enabled?: boolean | Ref<boolean> | ComputedRef<boolean>;
  /** Attach a window scroll listener as a fallback when needed (opt-in). */
  useScrollFallback?: boolean;
  scrollThrottleMs?: number;
}
// Scroll fallback attaches a global window scroll listener; only enable if needed.
export function useInfiniteScroll(
  sentinelRef: Ref<HTMLElement | null> | ComputedRef<HTMLElement | null>,
  onLoadMore: () => void | Promise<void>,
  options: UseInfiniteScrollOptions = {}
) {
  const {
    rootMargin = '1500px',
    threshold = 0,
    // When true, attaches a window scroll listener; opt-in for cases without IntersectionObserver.
    useScrollFallback = false,
    scrollThrottleMs = 100,
  } = options;
  const enabledOption = options.enabled ?? true;
  const enabled = computed(() => (isRef(enabledOption) ? enabledOption.value : enabledOption));
  let observer: IntersectionObserver | null = null;
  const isLoading = ref(false);
  let scrollTimeout: ReturnType<typeof setTimeout> | null = null;
  let pendingScroll = false;
  const marginPx = parseInt(rootMargin) || 1500;
  const handleIntersection = (entries: IntersectionObserverEntry[]) => {
    const target = entries[0];
    if (target?.isIntersecting && enabled.value) {
      void checkAndLoadMore();
    }
  };
  const checkAndLoadMore = async () => {
    if (!enabled.value || isLoading.value || !sentinelRef.value) return;
    const rect = sentinelRef.value.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    if (rect.top < viewportHeight + marginPx) {
      isLoading.value = true;
      try {
        await Promise.resolve(onLoadMore());
      } catch (error) {
        // Avoid leaving isLoading stuck on errors
        logger.error('[useInfiniteScroll] Failed to load more items:', error);
      } finally {
        isLoading.value = false;
      }
    }
  };
  const scheduleScrollCheck = () => {
    scrollTimeout = setTimeout(() => {
      scrollTimeout = null;
      void checkAndLoadMore();
      if (pendingScroll) {
        pendingScroll = false;
        scheduleScrollCheck();
      }
    }, scrollThrottleMs);
  };
  const handleScroll = () => {
    if (!enabled.value) return;
    if (scrollTimeout) {
      pendingScroll = true;
      return;
    }
    scheduleScrollCheck();
  };
  const createObserver = () => {
    if (observer) {
      observer.disconnect();
    }
    observer = new IntersectionObserver(handleIntersection, {
      rootMargin,
      threshold,
    });
    if (sentinelRef.value) {
      observer.observe(sentinelRef.value);
    }
  };
  const start = () => {
    createObserver();
    if (useScrollFallback) {
      window.addEventListener('scroll', handleScroll, { passive: true });
    }
    nextTick(() => {
      checkAndLoadMore();
    });
  };
  const stop = () => {
    observer?.disconnect();
    observer = null;
    if (useScrollFallback) {
      window.removeEventListener('scroll', handleScroll);
    }
    if (scrollTimeout) {
      clearTimeout(scrollTimeout);
      scrollTimeout = null;
    }
    pendingScroll = false;
  };
  watch(
    sentinelRef,
    (el, oldEl) => {
      if (el !== oldEl) {
        if (observer) {
          observer.disconnect();
          if (el) {
            observer.observe(el);
            nextTick(() => {
              checkAndLoadMore();
            });
          }
        }
      }
    },
    { flush: 'post' }
  );
  watch(enabled, (newEnabled) => {
    if (newEnabled) {
      start();
    } else {
      stop();
    }
  });
  onMounted(() => {
    if (enabled.value) {
      start();
    }
  });
  onUnmounted(() => {
    stop();
  });
  return {
    isLoading,
    stop,
    start,
    checkAndLoadMore,
  };
}
