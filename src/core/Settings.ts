export const Settings = {
  // Ball settings
  BALL_INITIAL_SPEED: 0.5, // Percentage of screen width per second
  BALL_MIN_SPEED: 0.2,
  BALL_MAX_SPEED: 1.0,
  BALL_RADIUS: 0.015, // Percentage of screen width
  
  // Acceleration/Bounce constants
  WALL_ACCELERATION_FACTOR: 1.05, // 5% speed increase when hitting walls
  PADDLE_BOUNCE_FACTOR: 1.0,     // No speed change when hitting paddles
  PADDLE_MOMENTUM_TRANSFER: 0.2, // How much of paddle velocity is transferred to the ball
  PRESERVE_SPEED_ON_PADDLE_HIT: true, // If true, ball speed remains constant after paddle hit
  
  // Paddle settings
  PADDLE_RADIUS: 0.07,        // Percentage of screen width
  PADDLE_MAX_SPEED: 100.0,       // Max speed the paddle can move to follow finger
  PADDLE_RANGE_X_FACTOR: 0.2,  // Horizontal movement range (0 to 0.2 of screen width)
  PADDLE_OVER_LIMIT_SPEED_FACTOR: 0.3, // Speed multiplier when moving beyond X range
  PADDLE_HIT_TIMEOUT: 250, // Minimal time (ms) between consecutive hits with same paddle
  
  // Game field
  TOP_WALL_Y: 0,
  BOTTOM_WALL_Y: 1,
  LEFT_LIMIT_X: 0,
  RIGHT_LIMIT_X: 1,

  // Input
  TAP_RADIUS: 0.1, // Radius around paddle to pick it up for drag

  // Gravity
  GRAVITY_FACTOR: 0.5, // Multiplier for gyroscope gravity effect
};

export default Settings;
