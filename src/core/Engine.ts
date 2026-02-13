import { Settings } from './Settings';
import * as planck from 'planck';

export interface Point {
  x: number;
  y: number;
}

export interface GameState {
  ball: {
    pos: Point;
    vel: Point;
    radius: number;
  };
  paddles: {
    left: { pos: Point; prevPos: Point; radius: number };
    right: { pos: Point; prevPos: Point; radius: number };
  };
  score: number;
  gravity: Point;
  lastPaddleHit: 'left' | 'right' | null;
  lastPaddleHitTime: number;
  dimensions: {
    width: number;
    height: number;
  };
}

export class Engine {
  private state: GameState;
  private lastUpdate: number = 0;
  
  private world: planck.World;
  private ballBody: planck.Body;
  private leftPaddleBody: planck.Body;
  private rightPaddleBody: planck.Body;
  private pendingBallPosition: planck.Vec2 | null = null;

  constructor(width: number, height: number) {
    const aspectRatio = height / width;
    this.state = {
      ball: {
        pos: { x: 0.5, y: aspectRatio / 2 },
        vel: { x: 0, y: 0 },
        radius: Settings.BALL_RADIUS,
      },
      paddles: {
        left: { pos: { x: 0.05, y: aspectRatio / 2 }, prevPos: { x: 0.05, y: aspectRatio / 2 }, radius: Settings.PADDLE_RADIUS },
        right: { pos: { x: 0.95, y: aspectRatio / 2 }, prevPos: { x: 0.95, y: aspectRatio / 2 }, radius: Settings.PADDLE_RADIUS },
      },
      score: 0,
      gravity: { x: 0, y: 0 },
      lastPaddleHit: null,
      lastPaddleHitTime: 0,
      dimensions: { width, height },
    };

    // Initialize Planck world
    this.world = new planck.World({
      gravity: planck.Vec2(0, 0)
    });

    // Ball
    this.ballBody = this.world.createBody({
      type: 'dynamic',
      position: planck.Vec2(0.5, aspectRatio / 2),
      bullet: true,
      fixedRotation: true,
      linearDamping: 0,
    });
    this.ballBody.createFixture({
      shape: planck.Circle(Settings.BALL_RADIUS),
      restitution: 1.0, 
      friction: 0,
      density: 1.0,
    });

    // Paddles - using kinematic for manual control
    this.leftPaddleBody = this.world.createBody({
      type: 'kinematic',
      position: planck.Vec2(0.05, aspectRatio / 2),
    });
    this.leftPaddleBody.createFixture({
      shape: planck.Circle(Settings.PADDLE_RADIUS),
      restitution: 0.1,
      friction: 0,
    });

    this.rightPaddleBody = this.world.createBody({
      type: 'kinematic',
      position: planck.Vec2(0.95, aspectRatio / 2),
    });
    this.rightPaddleBody.createFixture({
      shape: planck.Circle(Settings.PADDLE_RADIUS),
      restitution: 0.1,
      friction: 0,
    });

    // Setup walls based on initial dimensions
    this.updateWalls(aspectRatio);

    this.setupContactListener();
    this.resetBall();
  }

  private walls: planck.Body[] = [];
  private readonly WALL_THICKNESS = 0.2; // Thickness of the box

  private updateWalls(aspectRatio: number) {
    // Remove old walls
    for (const wall of this.walls) {
      this.world.destroyBody(wall);
    }
    this.walls = [];

    const halfWidth = 2; // Extra wide to ensure coverage
    const halfThickness = this.WALL_THICKNESS / 2;

    // Top wall: Bottom edge should be at y=0
    const topWall = this.world.createBody({});
    topWall.createFixture(planck.Box(halfWidth, halfThickness, planck.Vec2(0.5, -halfThickness)), {
      restitution: 1.0,
      friction: 0,
    });
    topWall.setUserData('wall');
    this.walls.push(topWall);

    // Bottom wall: Top edge should be at y=aspectRatio
    const bottomWall = this.world.createBody({});
    bottomWall.createFixture(planck.Box(halfWidth, halfThickness, planck.Vec2(0.5, aspectRatio + halfThickness)), {
      restitution: 1.0,
      friction: 0,
    });
    bottomWall.setUserData('wall');
    this.walls.push(bottomWall);
  }

  private setupContactListener() {
    this.world.on('pre-solve', (contact) => {
      const fixtureA = contact.getFixtureA();
      const fixtureB = contact.getFixtureB();
      const bodyA = fixtureA.getBody();
      const bodyB = fixtureB.getBody();

      const isBallA = bodyA === this.ballBody;
      const isBallB = bodyB === this.ballBody;

      if (!isBallA && !isBallB) return;

      const ballBody = isBallA ? bodyA : bodyB;
      const otherBody = isBallA ? bodyB : bodyA;

      // Handle Wall Collision
      if (otherBody.getUserData() === 'wall') {
        this.handleWallCollision(contact, ballBody);
        return;
      }

      // Handle Paddle Collision
      const isLeftPaddle = otherBody === this.leftPaddleBody;
      const isRightPaddle = otherBody === this.rightPaddleBody;

      if (isLeftPaddle || isRightPaddle) {
        const side = isLeftPaddle ? 'left' : 'right';
        const now = Date.now();
        
        const isSamePaddle = this.state.lastPaddleHit === side;
        const timeSinceLastHit = now - this.state.lastPaddleHitTime;
        
        if (isSamePaddle && timeSinceLastHit < Settings.PADDLE_HIT_TIMEOUT) {
          contact.setEnabled(false);
          return;
        }

        this.handlePaddleCollision(side, now, contact, ballBody, otherBody);
      }
    });

    this.world.on('begin-contact', (_contact) => {
      // Keep empty or for sound effects
    });
  }

  private handleWallCollision(contact: planck.Contact, ballBody: planck.Body) {
    const ballVel = ballBody.getLinearVelocity();
    const worldManifold = (contact as any).getWorldManifold();
    if (!worldManifold) return;

    const normal = worldManifold.normal;
    
    // For horizontal walls, ensure the normal is purely vertical and points into the field
    const isTopWall = ballBody.getPosition().y < 0.2; // Heuristic based on position
    normal.x = 0;
    normal.y = isTopWall ? 1 : -1;

    const dot = ballVel.y * normal.y;
    
    if (dot < 0) {
      contact.setEnabled(false);
      // Only reflect Y, keep X unchanged to follow gravity/tilt correctly
      const newVelY = (-ballVel.y) * Settings.WALL_ACCELERATION_FACTOR;
      ballBody.setLinearVelocity(planck.Vec2(ballVel.x, newVelY));
      console.log(`[Engine] ${isTopWall ? 'Top' : 'Bottom'} wall hit, new Y velocity:`, newVelY);
    }
  }

  private handlePaddleCollision(side: 'left' | 'right', now: number, contact: planck.Contact, ballBody: planck.Body, paddleBody: planck.Body) {
    if (this.state.lastPaddleHit !== side) {
      this.state.score++;
    }
    this.state.lastPaddleHit = side;
    this.state.lastPaddleHitTime = now;

    const ballVel = ballBody.getLinearVelocity();
    const paddleVel = paddleBody.getLinearVelocity();
    const worldManifold = (contact as any).getWorldManifold();
    
    if (!worldManifold) return;
    
    const normal = worldManifold.normal;
    // Ensure normal points from paddle to ball
    const dx = ballBody.getPosition().x - paddleBody.getPosition().x;
    const dy = ballBody.getPosition().y - paddleBody.getPosition().y;
    if (normal.x * dx + normal.y * dy < 0) {
      normal.x = -normal.x;
      normal.y = -normal.y;
    }

    const relVelX = ballVel.x - paddleVel.x;
    const relVelY = ballVel.y - paddleVel.y;
    
    const dot = relVelX * normal.x + relVelY * normal.y;
    
    if (dot < 0) {
      // Capture speed before collision for optional preservation
      const oldSpeed = Math.sqrt(ballVel.x * ballVel.x + ballVel.y * ballVel.y);

      // Invert physics: reflect in relative frame, then add scaled paddle velocity
      const reflectedRelVelX = (relVelX - 2 * dot * normal.x) * Settings.PADDLE_BOUNCE_FACTOR;
      const reflectedRelVelY = (relVelY - 2 * dot * normal.y) * Settings.PADDLE_BOUNCE_FACTOR;

      let newVelX = reflectedRelVelX + paddleVel.x * Settings.PADDLE_MOMENTUM_TRANSFER;
      let newVelY = reflectedRelVelY + paddleVel.y * Settings.PADDLE_MOMENTUM_TRANSFER;
      
      if (Settings.PRESERVE_SPEED_ON_PADDLE_HIT) {
        const currentNewSpeed = Math.sqrt(newVelX * newVelX + newVelY * newVelY);
        if (currentNewSpeed > 0) {
          const factor = oldSpeed / currentNewSpeed;
          newVelX *= factor;
          newVelY *= factor;
        }
      }

      // Position Correction: "Teleport" ball to surface of paddle to prevent ghosting
      // regardless of speed differences.
      const paddlePos = paddleBody.getPosition();
      const separationDist = Settings.PADDLE_RADIUS + Settings.BALL_RADIUS + 0.01;
      this.pendingBallPosition = planck.Vec2(
        paddlePos.x + normal.x * separationDist,
        paddlePos.y + normal.y * separationDist
      );

      contact.setEnabled(false);
      ballBody.setLinearVelocity(planck.Vec2(newVelX, newVelY));
      console.log(`[Engine] Hit ${side} paddle, momentum transfer:`, Settings.PADDLE_MOMENTUM_TRANSFER);
      console.log(`[Engine] Hit ${side} paddle, custom reflection applied (speed preserved: ${Settings.PRESERVE_SPEED_ON_PADDLE_HIT})`);
    }
  }

  public resetBall() {
    const aspectRatio = this.state.dimensions.height / this.state.dimensions.width;
    this.ballBody.setPosition(planck.Vec2(0.5, aspectRatio / 2));
    
    const angle = (Math.random() - 0.5) * Math.PI / 2; // +/- 45 degrees
    const direction = Math.random() > 0.5 ? 1 : -1;
    const speed = Settings.BALL_INITIAL_SPEED;
    
    const vel = planck.Vec2(
      Math.cos(angle) * direction * speed,
      Math.sin(angle) * speed
    );
    this.ballBody.setLinearVelocity(vel);

    this.state.lastPaddleHit = null;
    this.state.lastPaddleHitTime = 0;
    
    // Sync state
    this.updateStateFromPhysics();
  }

  private lastPaddleUpdate: { left: number; right: number } = { left: 0, right: 0 };
  private paddleTargets: { left: Point | null; right: Point | null } = { left: null, right: null };

  public update(now: number) {
    if (!this.lastUpdate) {
      this.lastUpdate = now;
      return;
    }

    let dt = (now - this.lastUpdate) / 1000;
    this.lastUpdate = now;

    // Update paddle velocities to match targets
    const sides: ('left' | 'right')[] = ['left', 'right'];
    for (const side of sides) {
      const body = side === 'left' ? this.leftPaddleBody : this.rightPaddleBody;
      const target = this.paddleTargets[side];
      
      if (target) {
        // Calculate velocity needed to reach target in one step
        const currentPos = body.getPosition();
        // Since we step the world below, we use the upcoming dt
        const velX = (target.x - currentPos.x) / Math.max(dt, 0.001);
        const velY = (target.y - currentPos.y) / Math.max(dt, 0.001);
        body.setLinearVelocity(planck.Vec2(velX, velY));
        
        // Clear target if we have reached it or if touch ended 
        // (but we don't know if touch ended here easily, 
        // so we'll rely on setPaddlePos not being called)
      } else {
        body.setLinearVelocity(planck.Vec2(0, 0));
      }

      // Reset target if not updated recently to prevent drift
      if (now - this.lastPaddleUpdate[side] > 100) { // 100ms threshold
        this.paddleTargets[side] = null;
      }
    }

    // Apply gravity
    const gravityForce = planck.Vec2(
      this.state.gravity.x * Settings.GRAVITY_FACTOR,
      this.state.gravity.y * Settings.GRAVITY_FACTOR
    );
    // Directly modify velocity for gravity to match old behavior
    const currentVel = this.ballBody.getLinearVelocity();
    this.ballBody.setLinearVelocity(planck.Vec2(
      currentVel.x + gravityForce.x * dt,
      currentVel.y + gravityForce.y * dt
    ));

    // Step the world with increased iterations for better collision precision
    this.world.step(Math.min(dt, 0.032), 10, 8); 

    if (this.pendingBallPosition) {
      this.ballBody.setPosition(this.pendingBallPosition);
      this.pendingBallPosition = null;
    } 

    // Manual Boundary Safety Checks
    const ballPos = this.ballBody.getPosition();
    const ballVel = this.ballBody.getLinearVelocity();
    const aspectRatio = this.state.dimensions.height / this.state.dimensions.width;

    // Safety: check if ball escaped top/bottom boundaries
    if (ballPos.y < 0 && ballVel.y < 0) {
      this.ballBody.setLinearVelocity(planck.Vec2(ballVel.x, Math.abs(ballVel.y) * Settings.WALL_ACCELERATION_FACTOR));
      console.warn('[Engine] Boundary safety: corrected ball escaping top');
    } else if (ballPos.y > aspectRatio && ballVel.y > 0) {
      this.ballBody.setLinearVelocity(planck.Vec2(ballVel.x, -Math.abs(ballVel.y) * Settings.WALL_ACCELERATION_FACTOR));
      console.warn('[Engine] Boundary safety: corrected ball escaping bottom');
    }

    // Goal collisions (Left/Right)
    if (ballPos.x <= 0 || ballPos.x >= 1) {
      this.resetBall();
      this.state.score = 0;
    }

    this.updateStateFromPhysics();
  }

  private updateStateFromPhysics() {
    const ballPos = this.ballBody.getPosition();
    const ballVel = this.ballBody.getLinearVelocity();
    this.state.ball.pos = { x: ballPos.x, y: ballPos.y };
    this.state.ball.vel = { x: ballVel.x, y: ballVel.y };

    const leftPos = this.leftPaddleBody.getPosition();
    this.state.paddles.left.prevPos = { ...this.state.paddles.left.pos };
    this.state.paddles.left.pos = { x: leftPos.x, y: leftPos.y };

    const rightPos = this.rightPaddleBody.getPosition();
    this.state.paddles.right.prevPos = { ...this.state.paddles.right.pos };
    this.state.paddles.right.pos = { x: rightPos.x, y: rightPos.y };
  }

  public setPaddlePos(side: 'left' | 'right', x: number, y: number) {
    // We update target and timestamp using the same timeline as update()
    // However, setPaddlePos is called with raw coordinates.
    // We'll use performance.now() for internal tracking if now is not passed.
    const timestamp = performance.now(); // or just use a flag
    this.lastPaddleUpdate[side] = timestamp;

    // Current horizontal restriction logic
    const baseLine = side === 'left' ? 0.05 : 0.95;
    const limit = Settings.PADDLE_RANGE_X_FACTOR;
    
    let targetX = x;
    const diffX = Math.abs(x - baseLine);
    
    if (diffX > limit) {
      const excess = diffX - limit;
      targetX = baseLine + (side === 'left' ? 1 : -1) * (limit + excess * Settings.PADDLE_OVER_LIMIT_SPEED_FACTOR);
    }

    const aspectRatio = this.state.dimensions.height / this.state.dimensions.width;
    const targetY = Math.max(0, Math.min(aspectRatio, y));
    this.paddleTargets[side] = { x: targetX, y: targetY };
  }

  public getState(): GameState {
    return this.state;
  }
  
  public setDimensions(width: number, height: number) {
    const oldAspectRatio = this.state.dimensions.height / this.state.dimensions.width;
    const newAspectRatio = height / width;
    
    this.state.dimensions = { width, height };
    
    // Scale Y positions to match new aspect ratio
    // We normalize to [0, 1] using old ratio, then scale to new ratio
    const scaleFactor = newAspectRatio / oldAspectRatio;
    
    const ballPos = this.ballBody.getPosition();
    this.ballBody.setPosition(planck.Vec2(ballPos.x, ballPos.y * scaleFactor));
    
    const leftPos = this.leftPaddleBody.getPosition();
    this.leftPaddleBody.setPosition(planck.Vec2(leftPos.x, leftPos.y * scaleFactor));
    
    const rightPos = this.rightPaddleBody.getPosition();
    this.rightPaddleBody.setPosition(planck.Vec2(rightPos.x, rightPos.y * scaleFactor));
    
    this.updateWalls(newAspectRatio);
    this.updateStateFromPhysics();
  }

  public setGravity(x: number, y: number) {
    this.state.gravity = { x, y };
  }
}
