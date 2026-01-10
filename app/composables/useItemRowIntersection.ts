import { onMounted, onUnmounted, type Ref, ref } from 'vue';
/**
 * Tracks whether a row element is visible so callers can lazily render heavy content.
 * Uses bidirectional visibility with debounced hiding to prevent flicker during fast scrolling.
 * @param elementRef - Element ref to observe with IntersectionObserver.
 * @param options - Visibility options for initializing the row state.
 * @param options.initialVisible - Set to true only when the element is already visible
 * (for example: pre-rendered or above-the-fold items). When true, observation is skipped
 * and the row is marked visible immediately, which is incorrect if the element is not
 * actually in the viewport.
 */
export function useItemRowIntersection(
  elementRef: Ref<HTMLElement | null>,
  options?: { initialVisible?: boolean }
) {
  if (options?.initialVisible === true) {
    return {
      isVisible: ref(true),
    };
  }
  const isVisible = ref(false);
  let observer: IntersectionObserver | null = null;
  let hideTimeout: ReturnType<typeof setTimeout> | null = null;
  onMounted(() => {
    if (isVisible.value) return;
    const element = elementRef.value;
    if (element) {
      observer = new IntersectionObserver(
        ([entry]) => {
          if (entry?.isIntersecting) {
            // Show immediately
            if (hideTimeout) {
              clearTimeout(hideTimeout);
              hideTimeout = null;
            }
            isVisible.value = true;
          } else {
            // Debounce hiding to prevent flicker during fast scrolling
            if (!hideTimeout) {
              hideTimeout = setTimeout(() => {
                isVisible.value = false;
                hideTimeout = null;
              }, 150);
            }
          }
        },
        {
          rootMargin: '300px',
          threshold: 0,
        }
      );
      observer.observe(element);
    }
  });
  onUnmounted(() => {
    if (hideTimeout) {
      clearTimeout(hideTimeout);
    }
    observer?.disconnect();
  });
  return {
    isVisible,
  };
}
