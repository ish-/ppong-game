<template>
  <Game />
</template>

<script setup lang="ts">
import Game from './components/Game/Game.vue';
import './styles/main.css';
</script>

<style>
/* Landscape orientation message or enforcement could go here */
@media (orientation: portrait) {
  body::before {
    content: 'Please rotate your device to landscape mode';
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: #0f172a;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    font-size: 1.5rem;
    text-align: center;
    padding: 20px;
    box-sizing: border-box;
  }
}
</style>
