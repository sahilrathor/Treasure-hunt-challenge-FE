// -------------------------------------------------------------
// Legacy turn-based simulation (preserved for backwards-compatibility)
// -------------------------------------------------------------
export interface InvaderState {
  ship: number;
  destroyed: number[];
  shots: number;
}

export const createInvaderState = (): InvaderState => ({ ship: 1, destroyed: [], shots: 0 });

export function moveShip(state: InvaderState, amount: -1 | 1): InvaderState {
  return { ...state, ship: Math.max(0, Math.min(3, state.ship + amount)) };
}

export function fireShot(state: InvaderState, target: number) {
  const candidate = Array.from({ length: target }, (_, index) => index)
    .filter((index) => index % 4 === state.ship && !state.destroyed.includes(index))
    .at(-1);
  if (candidate === undefined)
    return { state: { ...state, shots: state.shots + 1 }, action: 'miss' };
  return {
    state: { ...state, destroyed: [...state.destroyed, candidate], shots: state.shots + 1 },
    action: `fire:${candidate}`,
  };
}

// -------------------------------------------------------------
// Real-time 60fps Arcade Space Invaders Engine
// -------------------------------------------------------------
export const PLAYFIELD_WIDTH = 320;
export const PLAYFIELD_HEIGHT = 400;
export const SHIP_WIDTH = 32;
export const SHIP_HEIGHT = 16;
export const SHIP_Y = 360;
export const INVADER_WIDTH = 22;
export const INVADER_HEIGHT = 16;
export const BULLET_SPEED = 7.0;
export const ENEMY_BOMB_SPEED = 3.2;

export interface Invader {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 0 | 1 | 2; // 0 = squid, 1 = crab, 2 = octopus
  color: string;
  glow: string;
  alive: boolean;
}

export interface Bullet {
  id: number;
  x: number;
  y: number;
  vy: number;
  fromPlayer: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number; // 0 to 1
}

export type InvaderGameStatus = 'playing' | 'gameover' | 'won';

export interface RealtimeInvaderState {
  target: number;
  lives: number;
  maxLives: number;
  status: InvaderGameStatus;
  shipX: number;
  fleetVx: number;
  invaders: Invader[];
  bullets: Bullet[];
  particles: Particle[];
  destroyed: number[];
  actions: string[];
  lastEnemyFireTick: number;
  tickCount: number;
  invulnerableTicks: number;
}

const ROW_COLORS = [
  { color: '#f43f5e', glow: '#fda4af' }, // Ruby
  { color: '#f59e0b', glow: '#fde68a' }, // Amber
  { color: '#10b981', glow: '#a7f3d0' }, // Emerald
  { color: '#06b6d4', glow: '#a5f3fc' }, // Cyan
  { color: '#a855f7', glow: '#e9d5ff' }, // Purple
];

export function generateInvaders(target: number): Invader[] {
  const cols = target <= 12 ? 4 : target <= 16 ? 4 : 6;
  const spacingX = cols === 6 ? 44 : 56;
  const startX = (PLAYFIELD_WIDTH - (cols - 1) * spacingX - INVADER_WIDTH) / 2;
  const startY = 38;
  const spacingY = 28;

  const list: Invader[] = [];
  for (let i = 0; i < target; i += 1) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const x = startX + col * spacingX;
    const y = startY + row * spacingY;
    const colorDef = ROW_COLORS[row % ROW_COLORS.length]!;

    list.push({
      id: i,
      x,
      y,
      width: INVADER_WIDTH,
      height: INVADER_HEIGHT,
      type: (row % 3) as 0 | 1 | 2,
      color: colorDef.color,
      glow: colorDef.glow,
      alive: true,
    });
  }
  return list;
}

export function createRealtimeInvaderState(
  target = 8,
  lives = 3,
): RealtimeInvaderState {
  return {
    target,
    lives,
    maxLives: lives,
    status: 'playing',
    shipX: (PLAYFIELD_WIDTH - SHIP_WIDTH) / 2,
    fleetVx: 1.0,
    invaders: generateInvaders(target),
    bullets: [],
    particles: [],
    destroyed: [],
    actions: [],
    lastEnemyFireTick: 0,
    tickCount: 0,
    invulnerableTicks: 0,
  };
}

export function moveRealtimeShip(
  state: RealtimeInvaderState,
  newX: number,
): RealtimeInvaderState {
  if (state.status !== 'playing') return state;
  const clampedX = Math.max(8, Math.min(PLAYFIELD_WIDTH - SHIP_WIDTH - 8, newX));
  return {
    ...state,
    shipX: clampedX,
  };
}

export function firePlayerLaser(state: RealtimeInvaderState): RealtimeInvaderState {
  if (state.status !== 'playing') return state;

  // Max 2 active player bullets at once to prevent spamming
  const activePlayerBullets = state.bullets.filter((b) => b.fromPlayer);
  if (activePlayerBullets.length >= 2) return state;

  const newBullet: Bullet = {
    id: Date.now() + Math.random(),
    x: state.shipX + SHIP_WIDTH / 2,
    y: SHIP_Y - 4,
    vy: -BULLET_SPEED,
    fromPlayer: true,
  };

  return {
    ...state,
    bullets: [...state.bullets, newBullet],
  };
}

export function stepRealtimeInvaders(state: RealtimeInvaderState): RealtimeInvaderState {
  if (state.status !== 'playing') return state;

  const nextTick = state.tickCount + 1;
  const invulnerable = Math.max(0, state.invulnerableTicks - 1);

  // 1. Move Invader Fleet
  const aliveInvaders = state.invaders.filter((inv) => inv.alive);
  if (aliveInvaders.length === 0) {
    return {
      ...state,
      status: 'won',
    };
  }

  // Fleet speed increases as invaders are cleared!
  const speedMultiplier = 1 + (state.target - aliveInvaders.length) / state.target * 0.9;
  const currentVx = (state.fleetVx > 0 ? 1 : -1) * 1.0 * speedMultiplier;

  let reverseFleet = false;
  let fleetReachedBottom = false;

  for (const inv of aliveInvaders) {
    const nextX = inv.x + currentVx;
    if (nextX <= 8 || nextX + inv.width >= PLAYFIELD_WIDTH - 8) {
      reverseFleet = true;
    }
    if (inv.y + inv.height >= SHIP_Y - 12) {
      fleetReachedBottom = true;
    }
  }

  const nextFleetVx = reverseFleet ? -currentVx : currentVx;
  const dropY = reverseFleet ? 10 : 0;

  const updatedInvaders = state.invaders.map((inv) => {
    if (!inv.alive) return inv;
    return {
      ...inv,
      x: inv.x + (reverseFleet ? 0 : currentVx),
      y: inv.y + dropY,
    };
  });

  // If invaders marched all the way down, player loses a life!
  if (fleetReachedBottom) {
    const nextLives = state.lives - 1;
    if (nextLives <= 0) {
      return {
        ...state,
        lives: 0,
        status: 'gameover',
      };
    }
    // Push fleet back up slightly to give player another chance
    return {
      ...state,
      lives: nextLives,
      invulnerableTicks: 60,
      invaders: updatedInvaders.map((inv) => ({
        ...inv,
        y: Math.max(38, inv.y - 40),
      })),
    };
  }

  // 2. Enemy periodic bomb drop
  let nextBullets = [...state.bullets];
  if (nextTick - state.lastEnemyFireTick > 45 && aliveInvaders.length > 0) {
    // Pick random alive invader to drop bomb
    const shooter = aliveInvaders[Math.floor(Math.random() * aliveInvaders.length)]!;
    nextBullets.push({
      id: Date.now() + Math.random(),
      x: shooter.x + shooter.width / 2,
      y: shooter.y + shooter.height + 2,
      vy: ENEMY_BOMB_SPEED,
      fromPlayer: false,
    });
  }

  // 3. Move bullets & check collisions
  let nextDestroyed = [...state.destroyed];
  let nextActions = [...state.actions];
  const spawnedParticles: Particle[] = [];
  const survivingBullets: Bullet[] = [];
  let playerHit = false;

  for (const bullet of nextBullets) {
    const nextY = bullet.y + bullet.vy;
    if (nextY <= 0 || nextY >= PLAYFIELD_HEIGHT) {
      continue; // Offscreen
    }

    if (bullet.fromPlayer) {
      // Check collision with alive invaders
      let bulletConsumed = false;
      for (const inv of updatedInvaders) {
        if (!inv.alive) continue;
        if (
          bullet.x >= inv.x - 2 &&
          bullet.x <= inv.x + inv.width + 2 &&
          nextY >= inv.y &&
          nextY <= inv.y + inv.height
        ) {
          inv.alive = false;
          bulletConsumed = true;
          nextDestroyed.push(inv.id);
          nextActions.push(`fire:${inv.id}`);

          // Explosion particles
          for (let p = 0; p < 8; p += 1) {
            const angle = (p * Math.PI) / 4;
            spawnedParticles.push({
              x: inv.x + inv.width / 2,
              y: inv.y + inv.height / 2,
              vx: Math.cos(angle) * 2.5,
              vy: Math.sin(angle) * 2.5,
              color: inv.color,
              life: 1.0,
            });
          }
          break;
        }
      }
      if (!bulletConsumed) {
        survivingBullets.push({ ...bullet, y: nextY });
      }
    } else {
      // Enemy bomb vs player ship
      if (
        invulnerable === 0 &&
        bullet.x >= state.shipX &&
        bullet.x <= state.shipX + SHIP_WIDTH &&
        nextY >= SHIP_Y &&
        nextY <= SHIP_Y + SHIP_HEIGHT
      ) {
        playerHit = true;
        // Hit particles
        for (let p = 0; p < 6; p += 1) {
          spawnedParticles.push({
            x: bullet.x,
            y: SHIP_Y,
            vx: (Math.random() - 0.5) * 3,
            vy: (Math.random() - 0.5) * 3,
            color: '#f43f5e',
            life: 1.0,
          });
        }
      } else {
        survivingBullets.push({ ...bullet, y: nextY });
      }
    }
  }

  // 4. Update particles
  const survivingParticles: Particle[] = [
    ...state.particles
      .map((p) => ({
        ...p,
        x: p.x + p.vx,
        y: p.y + p.vy,
        life: p.life - 0.05,
      }))
      .filter((p) => p.life > 0),
    ...spawnedParticles,
  ];

  // 5. Handle Player Lives & Game Over / Victory
  let nextLives = state.lives;
  let nextStatus: InvaderGameStatus = 'playing';
  let nextInvulnerable = invulnerable;

  if (playerHit) {
    nextLives -= 1;
    nextInvulnerable = 75; // ~1.2s invulnerability shield
    if (nextLives <= 0) {
      nextStatus = 'gameover';
    }
  }

  if (nextDestroyed.length >= state.target) {
    nextStatus = 'won';
  }

  return {
    ...state,
    tickCount: nextTick,
    lives: Math.max(0, nextLives),
    status: nextStatus,
    fleetVx: nextFleetVx,
    invaders: updatedInvaders,
    bullets: survivingBullets,
    particles: survivingParticles,
    destroyed: nextDestroyed,
    actions: nextActions,
    lastEnemyFireTick: nextTick - state.lastEnemyFireTick > 45 ? nextTick : state.lastEnemyFireTick,
    invulnerableTicks: nextInvulnerable,
  };
}

export function restartRealtimeInvaders(state: RealtimeInvaderState): RealtimeInvaderState {
  return createRealtimeInvaderState(state.target, state.maxLives);
}
