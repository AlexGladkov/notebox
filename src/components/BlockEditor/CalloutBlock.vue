<template>
  <node-view-wrapper
    class="callout-block"
    :style="{
      backgroundColor: calloutStyle.bgColor,
      borderLeftColor: calloutStyle.borderColor,
    }"
  >
    <div class="callout-icon">{{ calloutStyle.icon }}</div>
    <node-view-content class="callout-content" />
  </node-view-wrapper>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { NodeViewWrapper, NodeViewContent } from '@tiptap/vue-3';
import { CALLOUT_TYPES } from '../../types/editor';
import type { CalloutType } from '../../types/editor';

const props = defineProps<{
  node: {
    attrs: {
      type: CalloutType;
    };
  };
}>();

const calloutStyle = computed(() => {
  return CALLOUT_TYPES[props.node.attrs.type] || CALLOUT_TYPES.info;
});
</script>

<style scoped>
.callout-block {
  display: flex;
  gap: 12px;
  padding: 16px;
  margin: 8px 0;
  border-left: 4px solid;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.callout-block:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.callout-icon {
  flex-shrink: 0;
  font-size: 20px;
  line-height: 1.5;
}

.callout-content {
  flex: 1;
  min-width: 0;
}

.callout-content :deep(p:first-child) {
  margin-top: 0;
}

.callout-content :deep(p:last-child) {
  margin-bottom: 0;
}
</style>
