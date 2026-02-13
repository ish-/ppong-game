import { Engine } from './Engine';
import { Settings } from './Settings';

export class Input {
  private engine: Engine;
  private container: HTMLElement;
  private activeTouches: Map<number, 'left' | 'right'> = new Map();
  private lastPaddlePos: Map<'left' | 'right', { x: number; y: number }> = new Map();

  constructor(engine: Engine, container: HTMLElement) {
    this.engine = engine;
    this.container = container;
    this.setupListeners();
  }

  private setupListeners() {
    this.container.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    this.container.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    this.container.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
    this.container.addEventListener('touchcancel', this.handleTouchEnd.bind(this), { passive: false });

    const preventDefault = (e: Event) => e.preventDefault();
    this.container.addEventListener('gesturestart', preventDefault, { passive: false });
    this.container.addEventListener('gesturechange', preventDefault, { passive: false });
    this.container.addEventListener('gestureend', preventDefault, { passive: false });
    this.container.addEventListener('contextmenu', preventDefault, { passive: false });

    // Very aggressive window-level prevention for system gestures
    window.addEventListener('touchmove', (e) => {
      if (!(e.target as HTMLElement).closest('button')) {
        e.preventDefault();
      }
    }, { passive: false });

    window.addEventListener('touchstart', (e) => {
      if (!(e.target as HTMLElement).closest('button')) {
        // Only prevent default if it's not a button to allow clicks
        // But for game area, we want to block browser defaults like "swipe to exit" hint
        if (e.touches.length > 1) e.preventDefault();
      }
    }, { passive: false });

    // Also support mouse for testing
    this.container.addEventListener('mousedown', this.handleMouseDown.bind(this));
  }

  private handleTouchStart(e: TouchEvent) {
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    e.preventDefault();
    const rect = this.container.getBoundingClientRect();
    const state = this.engine.getState();

    const aspectRatio = rect.height / rect.width;
    const touches = Array.from(e.changedTouches);
    for (const touch of touches) {
      const x = (touch.clientX - rect.left) / rect.width;
      const y = ((touch.clientY - rect.top) / rect.height) * aspectRatio;

      const side = x < 0.5 ? 'left' : 'right';
      const paddle = state.paddles[side];
      
      const dx = x - paddle.pos.x;
      const dy = (y - paddle.pos.y) / (rect.width / rect.height);
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= Settings.TAP_RADIUS) {
        this.activeTouches.set(touch.identifier, side);
        this.lastPaddlePos.set(side, { ...paddle.pos });
      }
    }
  }

  private handleTouchMove(e: TouchEvent) {
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    e.preventDefault();
    const rect = this.container.getBoundingClientRect();
    const aspectRatio = rect.height / rect.width;

    const touches = Array.from(e.changedTouches);
    for (const touch of touches) {
      const side = this.activeTouches.get(touch.identifier);
      
      if (side) {
        const x = (touch.clientX - rect.left) / rect.width;
        const y = ((touch.clientY - rect.top) / rect.height) * aspectRatio;
        
        this.movePaddle(side, x, y);
      }
    }
  }

  private handleTouchEnd(e: TouchEvent) {
    if (!(e.target as HTMLElement).closest('button')) {
      e.preventDefault();
    }
    const touches = Array.from(e.changedTouches);
    for (const touch of touches) {
      this.activeTouches.delete(touch.identifier);
    }
  }

  // Mouse fallback for desktop testing
  private handleMouseDown(e: MouseEvent) {
    const rect = this.container.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    
    const side = x < 0.5 ? 'left' : 'right';
    const state = this.engine.getState();
    const paddle = state.paddles[side];
    
    const dx = x - paddle.pos.x;
    const dy = (y - paddle.pos.y) / (rect.width / rect.height);
    const dist = Math.sqrt(dx * dx + dy * dy);

    const aspectRatio = rect.height / rect.width;
    if (dist <= Settings.TAP_RADIUS) {
      const moveHandler = (me: MouseEvent) => {
        const mx = (me.clientX - rect.left) / rect.width;
        const my = ((me.clientY - rect.top) / rect.height) * aspectRatio;
        this.movePaddle(side, mx, my);
      };

      const upHandler = () => {
        window.removeEventListener('mousemove', moveHandler);
        window.removeEventListener('mouseup', upHandler);
      };

      window.addEventListener('mousemove', moveHandler);
      window.addEventListener('mouseup', upHandler);
    }
  }

  private movePaddle(side: 'left' | 'right', targetX: number, targetY: number) {
    const lastPos = this.lastPaddlePos.get(side);
    if (!lastPos) return;

    // Apply speed limit
    // We don't have delta time here easily, but we can limit the displacement per move event
    // though that's not exactly what "max speed" means in a physics sense.
    // However, if we assume move events happen at fixed intervals (e.g. 60Hz), we can limit displacement.
    
    let dx = targetX - lastPos.x;
    let dy = targetY - lastPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    const maxDisplacement = Settings.PADDLE_MAX_SPEED * 0.016; // approx 1/60th of a second
    if (dist > maxDisplacement) {
      const ratio = maxDisplacement / dist;
      dx *= ratio;
      dy *= ratio;
    }

    const nextX = lastPos.x + dx;
    const nextY = lastPos.y + dy;

    this.engine.setPaddlePos(side, nextX, nextY);
    this.lastPaddlePos.set(side, { x: nextX, y: nextY });
  }
}
