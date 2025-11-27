<template>
  <!-- Renderless component that triggers toasts -->
  <div v-if="false"></div>
</template>

<script setup>
  import { watch } from "vue";
  const props = defineProps({
    modelValue: {
      type: Object,
      default: () => ({ show: false, message: "", color: "accent" }),
    },
  });

  const emit = defineEmits(["update:modelValue"]);
  const toast = useToast();

  watch(
    () => props.modelValue.show,
    (newVal) => {
      if (newVal) {
        toast.add({
          title: props.modelValue.message,
          color: props.modelValue.color === "error" ? "red" : "primary",
          timeout: 4000,
          callback: () => {
            updateShow(false);
          },
        });
        // Reset the show prop immediately or after timeout?
        // If we reset immediately, the parent might think it's closed.
        // But toast handles its own state.
        // We should probably sync them.
        // Actually, if we use toast, we don't need the parent to control 'show' anymore usually.
        // But to keep API compatible:
        setTimeout(() => {
          updateShow(false);
        }, 4000);
      }
    }
  );

  const updateShow = (show) => {
    emit("update:modelValue", { ...props.modelValue, show });
  };
</script>
