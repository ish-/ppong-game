# Round Paddle Ping-Pong Concept

## Overview
A modern, touch-friendly take on the classic Ping-Pong. The game is played from a top-down perspective in landscape mode. Instead of traditional flat paddles, players use circular (round) paddles controlled by their thumbs.

## Gameplay Mechanics
- **Paddles**: Circular paddles that move within a designated area on the left and right sides of the screen.
- **Ball**: A classic ball that bounces off paddles and walls.
- **Walls**:
    - **Top & Bottom**: Reflect the ball and cause it to **accelerate**.
    - **Left & Right**: No walls. If the ball passes the screen boundary, the player on that side loses a point.
- **Collisions**:
    - **Wall Bounce**: The ball's speed increases by a configurable factor.
    - **Paddle Bounce**: The ball reflects off the circular surface, but **does not accelerate**. The angle of reflection depends on where the ball hits the circular paddle.

## Controls
- **Mobile Friendly**: Designed for landscape mode.
- **Dual Thumb Control**:
    - Left thumb controls the left paddle.
    - Right thumb controls the right paddle.
- **Touch Input**: Paddles track the touch position (Y-axis primarily, but can have slight X-axis movement if configured).

## Configuration
All game parameters are stored in a central `settings.ts` (or `config.json`) file, including:
- Starting ball speed.
- Wall bounce acceleration factor.
- Paddle bounce factor (multiplier).
- Ball and paddle sizes.
- Screen dimensions/aspect ratio for landscape.

## Score System
- **Scoring**: Players earn points only when the ball hits their paddle.
- **Other Hits**: Wall bounces or other interactions do not influence the score.
- **Goal**: Score points while preventing the ball from leaving the screen on your side.

## Goal
Classic Ping-Pong: Score points by making the opponent miss the ball.
