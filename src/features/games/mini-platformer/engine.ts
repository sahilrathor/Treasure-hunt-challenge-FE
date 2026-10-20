export const PLAYFIELD_WIDTH = 400;
export const PLAYFIELD_HEIGHT = 280;

export interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
  vx?: number;
  minX?: number;
  maxX?: number;
}

export interface Coin {
  id: number;
  x: number;
  y: number;
  collected: boolean;
}

export interface Hazard {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Goal {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PlatformerState {
  player: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    width: number;
    height: number;
    grounded: boolean;
    facing: 'left' | 'right';
  };
  platforms: Platform[];
  coins: Coin[];
  hazards: Hazard[];
  goal: Goal;
  target: number;
  coinsCollected: number;
  lives: number;
  maxLives: number;
  speed: number;
  status: 'playing' | 'crashed' | 'won';
  actions: string[];
}

function playTone(freq: number, type: OscillatorType = 'sine', duration = 0.1) {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {
    // Audio unsupported or blocked
  }
}

export function playJumpSound() {
  playTone(480, 'sine', 0.12);
}

export function playCoinSound() {
  playTone(880, 'triangle', 0.15);
}

export function playHitSound() {
  playTone(160, 'sawtooth', 0.25);
}

export function playWinSound() {
  playTone(523.25, 'triangle', 0.1);
  setTimeout(() => playTone(659.25, 'triangle', 0.1), 100);
  setTimeout(() => playTone(783.99, 'triangle', 0.25), 200);
}

export function createPlatformerState(
  target = 3,
  speed = 3.5,
  lives = 3,
  difficulty = 'easy',
): PlatformerState {
  const platforms: Platform[] = [
    // Bottom ground
    { x: 0, y: 250, width: 140, height: 30 },
    { x: 190, y: 250, width: 210, height: 30 },

    // Middle platforms
    { x: 50, y: 195, width: 85, height: 12 },
    { x: 170, y: 170, width: 75, height: 12 },
    { x: 280, y: 140, width: 85, height: 12 },
    { x: 150, y: 95, width: 90, height: 12 },
    { x: 20, y: 75, width: 90, height: 12 },
  ];

  if (difficulty === 'medium' || difficulty === 'hard') {
    // Moving platform
    platforms.push({
      x: 270,
      y: 70,
      width: 65,
      height: 12,
      vx: 1.2,
      minX: 250,
      maxX: 330,
    });
  } else {
    platforms.push({
      x: 270,
      y: 70,
      width: 75,
      height: 12,
    });
  }

  // Hazards: spikes in the gap between floor platforms
  const hazards: Hazard[] = [
    { x: 140, y: 265, width: 50, height: 15 },
  ];

  if (difficulty === 'hard') {
    hazards.push({ x: 190, y: 83, width: 25, height: 12 });
  }

  // Coin placement based on target
  const coinPositions = [
    { x: 80, y: 175 },
    { x: 205, y: 150 },
    { x: 320, y: 120 },
    { x: 190, y: 75 },
    { x: 60, y: 55 },
    { x: 300, y: 50 },
    { x: 280, y: 230 },
    { x: 110, y: 230 },
  ];

  const coins: Coin[] = coinPositions.slice(0, Math.max(target, 3)).map((pos, idx) => ({
    id: idx,
    x: pos.x,
    y: pos.y,
    collected: false,
  }));

  // Goal portal at top platform
  const goal: Goal = {
    x: 40,
    y: 45,
    width: 22,
    height: 30,
  };

  return {
    player: {
      x: 20,
      y: 220,
      vx: 0,
      vy: 0,
      width: 16,
      height: 22,
      grounded: false,
      facing: 'right',
    },
    platforms,
    coins,
    hazards,
    goal,
    target,
    coinsCollected: 0,
    lives,
    maxLives: lives,
    speed,
    status: 'playing',
    actions: [],
  };
}

export function movePlayer(state: PlatformerState, dir: 'left' | 'right' | 'stop'): PlatformerState {
  if (state.status !== 'playing') return state;
  const vx = dir === 'left' ? -state.speed : dir === 'right' ? state.speed : 0;
  const facing = dir === 'left' ? 'left' : dir === 'right' ? 'right' : state.player.facing;
  return {
    ...state,
    player: {
      ...state.player,
      vx,
      facing,
    },
  };
}

export function jumpPlayer(state: PlatformerState): PlatformerState {
  if (state.status !== 'playing' || !state.player.grounded) return state;
  playJumpSound();
  return {
    ...state,
    player: {
      ...state.player,
      vy: -7.5,
      grounded: false,
    },
    actions: [...state.actions, 'jump'],
  };
}

export function stepPlatformer(state: PlatformerState): PlatformerState {
  if (state.status !== 'playing') return state;

  const gravity = 0.38;
  const player = { ...state.player };
  const actions = [...state.actions];
  let coinsCollected = state.coinsCollected;

  // 1. Update moving platforms
  const platforms = state.platforms.map((p) => {
    if (!p.vx || p.minX === undefined || p.maxX === undefined) return p;
    let nextX = p.x + p.vx;
    let nextVx = p.vx;
    if (nextX <= p.minX) {
      nextX = p.minX;
      nextVx = Math.abs(p.vx);
    } else if (nextX >= p.maxX) {
      nextX = p.maxX;
      nextVx = -Math.abs(p.vx);
    }
    return { ...p, x: nextX, vx: nextVx };
  });

  // 2. Apply gravity and update position
  player.vy += gravity;
  player.x += player.vx;
  player.y += player.vy;

  // Screen horizontal boundaries
  if (player.x < 0) player.x = 0;
  if (player.x + player.width > PLAYFIELD_WIDTH) player.x = PLAYFIELD_WIDTH - player.width;

  // 3. Platform collisions (vertical landing)
  player.grounded = false;
  for (const plat of platforms) {
    // Check if player's bottom intersects platform top
    const prevY = player.y - player.vy;
    const isAbovePlatform = prevY + player.height <= plat.y + 6;
    const isLanding = player.y + player.height >= plat.y && player.y + player.height <= plat.y + plat.height + 6;
    const isHorizontalOverlap =
      player.x + player.width > plat.x + 2 && player.x < plat.x + plat.width - 2;

    if (isAbovePlatform && isLanding && isHorizontalOverlap && player.vy >= 0) {
      player.y = plat.y - player.height;
      player.vy = 0;
      player.grounded = true;
      // Moving platform riding
      if (plat.vx) {
        player.x += plat.vx;
      }
      break;
    }
  }

  // 4. Coin collection
  const coins = state.coins.map((c) => {
    if (c.collected) return c;
    const dist = Math.hypot(player.x + player.width / 2 - c.x, player.y + player.height / 2 - c.y);
    if (dist < 18) {
      coinsCollected += 1;
      actions.push(`coin:${c.id}`);
      playCoinSound();
      return { ...c, collected: true };
    }
    return c;
  });

  // 5. Hazard collision & pit falling
  let status: 'playing' | 'crashed' | 'won' = 'playing';
  let lives = state.lives;

  const hitHazard =
    player.y > PLAYFIELD_HEIGHT ||
    state.hazards.some(
      (h) =>
        player.x + player.width > h.x &&
        player.x < h.x + h.width &&
        player.y + player.height > h.y &&
        player.y < h.y + h.height,
    );

  if (hitHazard) {
    playHitSound();
    lives -= 1;
    if (lives <= 0) {
      status = 'crashed';
    } else {
      // Respawn at safe start
      player.x = 20;
      player.y = 220;
      player.vx = 0;
      player.vy = 0;
      player.grounded = true;
    }
  }

  // 6. Goal check
  if (status === 'playing' && coinsCollected >= state.target) {
    const g = state.goal;
    const reachedGoal =
      player.x + player.width > g.x &&
      player.x < g.x + g.width &&
      player.y + player.height > g.y &&
      player.y < g.y + g.height;

    if (reachedGoal) {
      playWinSound();
      actions.push('goal');
      status = 'won';
    }
  }

  return {
    ...state,
    player,
    platforms,
    coins,
    coinsCollected,
    lives,
    status,
    actions,
  };
}

export function restartAttempt(state: PlatformerState): PlatformerState {
  return createPlatformerState(state.target, state.speed, state.maxLives);
}
