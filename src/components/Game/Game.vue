<template>
  <div ref="container" class="Game">
    <div class="Game__score">{{ state.score }}</div>
    
    <div v-if="!gyroEnabled" class="Game__overlay">
      <button class="Game__start-btn" @click="enableGyro">Enable Gyro & Start</button>
    </div>

    <Ball 
      :x="state.ball.pos.x" 
      :y="state.ball.pos.y" 
      :radius="state.ball.radius" 
    />
    <Paddle 
      side="left"
      :x="state.paddles.left.pos.x" 
      :y="state.paddles.left.pos.y" 
      :radius="state.paddles.left.radius"
    />
    <Paddle 
      side="right"
      :x="state.paddles.right.pos.x" 
      :y="state.paddles.right.pos.y" 
      :radius="state.paddles.right.radius"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, reactive, shallowRef } from 'vue';
import { Engine } from '../../core/Engine';
import { Input } from '../../core/Input';
import Ball from '../Ball/Ball.vue';
import Paddle from '../Paddle/Paddle.vue';
import './Game.css';

const container = ref<HTMLElement | null>(null);
const engine = shallowRef<Engine | null>(null);
const input = shallowRef<Input | null>(null);
const gyroEnabled = ref(false);

const state = reactive({
  ball: { pos: { x: 0.5, y: 0.5 }, radius: 0.02 },
  paddles: {
    left: { pos: { x: 0.05, y: 0.5 }, radius: 0.05 },
    right: { pos: { x: 0.95, y: 0.5 }, radius: 0.05 },
  },
  score: 0
});

let animationFrame: number;

const update = (now: number) => {
  if (engine.value) {
    engine.value.update(now);
    const newState = engine.value.getState();
    const aspectRatio = newState.dimensions.height / newState.dimensions.width;
    
    // Sync reactive state with normalization for Y
    state.ball.pos.x = newState.ball.pos.x;
    state.ball.pos.y = newState.ball.pos.y / aspectRatio;
    state.ball.radius = newState.ball.radius;
    
    state.paddles.left.pos.x = newState.paddles.left.pos.x;
    state.paddles.left.pos.y = newState.paddles.left.pos.y / aspectRatio;
    
    state.paddles.right.pos.x = newState.paddles.right.pos.x;
    state.paddles.right.pos.y = newState.paddles.right.pos.y / aspectRatio;
    
    state.score = newState.score;
  }
  animationFrame = requestAnimationFrame(update);
};

const handleOrientation = (event: DeviceOrientationEvent) => {
  if (!engine.value) return;

  // Beta: pitch (front/back tilt), Gamma: roll (left/right tilt)
  // In landscape mode, we need to map these based on screen orientation
  const orientation = window.screen.orientation ? window.screen.orientation.type : (window as any).orientation;
  
  let gx = 0;
  let gy = 0;

  const beta = event.beta || 0;
  const gamma = event.gamma || 0;

  if (orientation === 'landscape-primary' || orientation === 90) {
    gx = beta / 45;
    gy = -gamma / 45;
  } else if (orientation === 'landscape-secondary' || orientation === -90) {
    gx = -beta / 45;
    gy = gamma / 45;
  } else {
    // Portrait or unknown
    gx = gamma / 45;
    gy = beta / 45;
  }

  engine.value.setGravity(gx, gy);
};

const enableGyro = async () => {
  // Request fullscreen
  if (container.value) {
    try {
      if (container.value.requestFullscreen) {
        await container.value.requestFullscreen();
      } else if ((container.value as any).webkitRequestFullscreen) {
        await (container.value as any).webkitRequestFullscreen();
      } else if ((container.value as any).msRequestFullscreen) {
        await (container.value as any).msRequestFullscreen();
      }
    } catch (err) {
      console.warn('Fullscreen request failed:', err);
    }
  }

  if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
    try {
      const permission = await (DeviceOrientationEvent as any).requestPermission();
      if (permission === 'granted') {
        window.addEventListener('deviceorientation', handleOrientation);
        gyroEnabled.value = true;
      }
    } catch (e) {
      console.error('Gyro permission denied', e);
    }
  } else {
    // Non-iOS or older iOS
    window.addEventListener('deviceorientation', handleOrientation);
    gyroEnabled.value = true;
  }
};

const handleResize = () => {
  if (engine.value) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    engine.value.setDimensions(w, h);
  }
};

onMounted(() => {
  if (container.value) {
    const width = container.value.clientWidth;
    const height = container.value.clientHeight;
    engine.value = new Engine(width, height);
    input.value = new Input(engine.value, container.value);
    
    handleResize();
    window.addEventListener('resize', handleResize);
    animationFrame = requestAnimationFrame(update);
  }
});

onUnmounted(() => {
  cancelAnimationFrame(animationFrame);
  window.removeEventListener('resize', handleResize);
  window.removeEventListener('deviceorientation', handleOrientation);
});
</script>
