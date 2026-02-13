# Implementation Plan

## Technology Stack
- **Framework**: Vite + Vue 3 + TypeScript.
- **Rendering**: Initially DOM-based (divs), designed for future migration to PixiJS or ThreeJS.
- **Styling**: Vanilla CSS with alternative BEM pattern (`.Component__element`, `&.--modificator`).
- **Architecture**: Separated logic (Game Engine, Configuration, Components).

## Directory Structure
```text
src/
  assets/         # Icons, sounds, etc.
  components/     # Vue components
    Game/
      Game.vue
      Game.css
    Ball/
      Ball.vue
    Paddle/
      Paddle.vue
  core/           # Game logic
    Engine.ts     # Physics, loop, collision
    Settings.ts   # Configuration constants
    Input.ts      # Touch handling
  App.vue
  main.ts
```

## Core Modules
### `Settings.ts`
Centralizes all game constants:
- `BALL_INITIAL_SPEED`
- `WALL_ACCELERATION_FACTOR`
- `PADDLE_BOUNCE_FACTOR`
- `PADDLE_MAX_SPEED`: Limits how fast the paddle can follow the finger.
- `PADDLE_RANGE_X_FACTOR`: Default is `0.2`. Horizontal range relative to the field width.
- `PADDLE_OVER_LIMIT_SPEED_FACTOR`: Damping factor applied when moving beyond the horizontal limit.

### `Engine.ts`
- `update(deltaTime: number)`: Main loop logic.
- `handleCollisions()`: Boundary and paddle collision logic.
- `handleScoring()`: Logic to increment score when the ball hits a paddle.
- `resetBall()`: Setup for new round.
- `GAME_DIMENSIONS`: Computed dynamically based on `window.innerWidth` and `window.innerHeight`.

### `Input.ts`
- Tracks touch events for left and right screen halves.
- **Drag Only**: Paddles only move if a drag gesture is initiated on or near them. No instant teleportation on touch.
- **Horizontal Bounds**: Restrict movement to `PADDLE_RANGE_X_FACTOR`. Apply `PADDLE_OVER_LIMIT_SPEED_FACTOR` if exceeded.

## UI/UX
- Landscape mode lock (via CSS/JS).
- Touch controls for mobile (drag-based).
- Game Start/Over screens.
- *Note: Scoreboard display is deferred (logic exists, UI pending).*

## Scalability
- The `Engine` will emit state updates.
- The `Game.vue` will render these states using DOM elements for now.
- Future: Replace `Game.vue`'s rendering logic with a `CanvasRenderer` or `WebGLRenderer` while keeping the `Engine` logic intact.
