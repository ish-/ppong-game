<template>
  <div
    class="Paddle" 
    :class="sideModificator"
    :style="paddleStyle"
  >
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import './Paddle.css';

const props = defineProps<{
  x: number;
  y: number;
  radius: number;
  side: 'left' | 'right';
}>();

const sideModificator = computed(() => `--${props.side}`);

const paddleStyle = computed(() => ({
  left: `${props.x * 100}%`,
  top: `${props.y * 100}%`,
  width: `${props.radius * 2 * 100}vw`,
  height: `${props.radius * 2 * 100}vw`,
  transform: 'translate3d(-50%, -50%, 0)',
  willChange: 'left, top',
  backfaceVisibility: 'hidden',
} as const));
</script>
