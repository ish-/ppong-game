<template>
  <div 
    class="Ball" 
    :style="ballStyle"
  ></div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  x: number;
  y: number;
  radius: number;
}>();

const ballStyle = computed(() => ({
  left: `${props.x * 100}%`,
  top: `${props.y * 100}%`,
  width: `${props.radius * 2 * 100}vw`,
  height: `${props.radius * 2 * 100}vw`,
  transform: 'translate3d(-50%, -50%, 0)',
  willChange: 'left, top',
  backfaceVisibility: 'hidden',
} as const));
</script>

<style>
.Ball {
  position: absolute;
  border-radius: 50%;
  background-color: var(--ball-color);
  box-shadow: 0 0 15px rgba(255, 255, 255, 0.5);
  pointer-events: none;
  z-index: 10;
}
</style>
