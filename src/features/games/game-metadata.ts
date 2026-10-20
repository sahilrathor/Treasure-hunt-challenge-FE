import type { GameCode } from '@/types/api';

export interface GameInfo {
  code: GameCode;
  name: string;
  emoji: string;
  tagline: string;
  description: string;
  howToPlay: string[];
  controls: string;
  objective: string;
}

export const GAME_METADATA: Record<GameCode, GameInfo> = {
  'flappy-bird': {
    code: 'flappy-bird',
    name: 'Flappy Bird',
    emoji: '🐦',
    tagline: 'Defy gravity and weave through tricky obstacles',
    description:
      'Tap or click to flap wings, maintain altitude, and weave through pipe obstacles without crashing.',
    howToPlay: [
      'Each flap gives the bird upward lift against gravity.',
      'Maintain steady altitude to pass through the gaps between pipe pairs.',
      'Colliding with any pipe, the ground, or the ceiling ends your attempt.',
    ],
    controls: 'Spacebar, Click, or Tap "Flap wings" button',
    objective: 'Safely pass through the required number of pipes.',
  },
  snake: {
    code: 'snake',
    name: 'Snake',
    emoji: '🐍',
    tagline: 'Classic arcade survival and growth',
    description:
      'Steer a growing snake across the arena to devour food pellets while dodging obstacles and your own tail.',
    howToPlay: [
      'Navigate the grid to consume glowing food pellets.',
      'Every pellet collected extends your body length.',
      'Hitting the arena boundary, obstacle blocks, or your own body crashes the snake.',
    ],
    controls: 'Arrow keys / WASD or On-screen D-Pad buttons',
    objective: 'Devour the required amount of food pellets to complete the round.',
  },
  'brick-breaker': {
    code: 'brick-breaker',
    name: 'Brick Breaker',
    emoji: '🧱',
    tagline: 'Smash target bricks with precision paddle bounces',
    description:
      'Control the bottom paddle to bounce the ball at high speed and demolish target brick formations.',
    howToPlay: [
      'Move your paddle left and right to intercept the descending ball.',
      'The point of impact on the paddle dictates the return angle.',
      'Clear the required number of bricks before losing all your reserve balls.',
    ],
    controls: 'Arrow keys / A & D or Touch Left/Right buttons',
    objective: 'Smash the required number of bricks without exhausting your lives.',
  },
  'space-invaders': {
    code: 'space-invaders',
    name: 'Space Invaders',
    emoji: '👾',
    tagline: 'Defend Earth against advancing alien swarms',
    description:
      'Pilot your defense cannon to eliminate advancing alien invaders and dodge incoming enemy laser blasts.',
    howToPlay: [
      'Steer your defense cannon horizontally along the bottom baseline.',
      'Fire laser pulses upward to destroy descending alien invaders.',
      'Dodge incoming alien fire and do not let the swarm reach the bottom.',
    ],
    controls: 'Arrow keys / A & D to steer, Space or Fire button to shoot',
    objective: 'Blast the target number of invaders to win the battle.',
  },
  tetris: {
    code: 'tetris',
    name: 'Tetris',
    emoji: '🕹️',
    tagline: 'The timeless tetromino block-stacking puzzle',
    description:
      'Position and rotate falling geometric tetromino blocks to form solid horizontal lines across the matrix.',
    howToPlay: [
      'Steer and rotate falling tetrominoes to lock them into open slots.',
      'Completing a full horizontal line without gaps clears it and counts toward your goal.',
      'Plan around the "Next" piece indicator and avoid letting blocks stack to the top.',
    ],
    controls: 'Left/Right to move, Up to rotate, Down to soft drop, Space to hard drop',
    objective: 'Clear the target number of complete lines.',
  },
  'memory-match': {
    code: 'memory-match',
    name: 'Memory Match',
    emoji: '🎴',
    tagline: 'Test your visual recall and concentration',
    description:
      'Flip over face-down cards to discover and match identical hidden symbols through recall.',
    howToPlay: [
      'Click or tap two cards at a time to reveal their concealed icons.',
      'Matching cards lock in place and advance your score.',
      'Mismatched cards flip back face down—memorize their locations!',
    ],
    controls: 'Click or tap any face-down card to reveal it',
    objective: 'Uncover and pair all matching cards on the board.',
  },
  'number-merge': {
    code: 'number-merge',
    name: 'Number Merge (2048)',
    emoji: '🔢',
    tagline: 'Slide and combine tiles to reach high numbers',
    description:
      'Slide numbered tiles across a 4x4 grid to merge equal numbers and reach the target score.',
    howToPlay: [
      'Shift the whole board in any of the four directions.',
      'Tiles with identical numbers slide together and merge into their sum.',
      'A new tile (2 or 4) spawns after every slide—keep the board organized!',
    ],
    controls: 'Arrow keys or On-screen Direction Buttons',
    objective: 'Merge tiles until you create a tile equal to or exceeding the target value.',
  },
  'pattern-recall': {
    code: 'pattern-recall',
    name: 'Pattern Recall',
    emoji: '🎨',
    tagline: 'Simon-style audio-visual sequence memorization',
    description:
      'Watch and listen to the sequence of illuminated color sound pads and replicate it accurately.',
    howToPlay: [
      'Watch the pads flash during the "WATCH PATTERN" countdown.',
      'Once the signal activates "YOUR TURN", tap the colored pads in identical order.',
      'Each tap must match the exact sequence.',
    ],
    controls: 'Click or tap the flashing colored pads',
    objective: 'Replicate the full color-sound sequence correctly.',
  },
  'mini-platformer': {
    code: 'mini-platformer',
    name: 'Mini Platformer',
    emoji: '🏃',
    tagline: 'Fast-paced retro precision platforming',
    description:
      'Run and jump across platforms, timing leaps over spikes to collect golden coins and reach the goal.',
    howToPlay: [
      'Guide your runner across suspended and moving platforms.',
      'Collect the shiny golden coins scattered throughout the level.',
      'Avoid contact with hazardous red spikes and do not drop into the abyss.',
    ],
    controls: 'Arrow keys / A & D, Spacebar or Jump button to leap',
    objective: 'Collect the required number of golden coins without losing all lives.',
  },
  'crack-the-code': {
    code: 'crack-the-code',
    name: 'Crack the Code',
    emoji: '🔐',
    tagline: 'Deduce the secret vault combination',
    description:
      'A master vault cipher test. Use logical deduction to guess the secret numeric passcode using color hints.',
    howToPlay: [
      'Enter your multi-digit numeric guess and press Check Code.',
      '🟢 Green: Correct digit placed in the exact right spot.',
      '🟡 Yellow: Correct digit present in the code, but in a different position.',
      'Analyze previous feedback to crack the code within the attempt limit.',
    ],
    controls: 'Number pad buttons 1-9 & Check Code (or keyboard numbers)',
    objective: 'Deduce the exact secret passcode before attempts run out.',
  },
  'sliding-puzzle': {
    code: 'sliding-puzzle',
    name: 'Sliding Puzzle',
    emoji: '🧩',
    tagline: 'Classic 8-puzzle number tile realignment',
    description:
      'Slide adjacent numbered tiles into the empty space to arrange them in sequential numerical order.',
    howToPlay: [
      'Tap any tile adjacent to the blank square to slide it into the empty space.',
      'Carefully maneuver the numbers to put them back in ascending order.',
      'Victory is achieved when the numbers read 1 through 8 from top-left to bottom-right.',
    ],
    controls: 'Tap adjacent tiles or use Arrow keys to push tiles',
    objective: 'Rearrange all numbered tiles in numerical sequence from 1 to 8.',
  },
  pacman: {
    code: 'pacman',
    name: 'Pac-Man',
    emoji: '🟡',
    tagline: 'Classic labyrinth arcade maze chase',
    description:
      'Guide Pac-Man through maze corridors, chomping glowing pellets while evading patrolling ghosts.',
    howToPlay: [
      'Steer Pac-Man through the interconnected maze tunnels.',
      'Gobble up glowing yellow pellets to increment your counter.',
      'Keep clear of wandering ghosts patrolling the corridors.',
      'Clear the target pellet quota to win without losing your lives.',
    ],
    controls: 'Arrow keys / WASD or On-screen D-Pad buttons',
    objective: 'Eat the target count of pellets without getting caught by ghosts.',
  },
};

export function getGameInfo(code: GameCode | string | null | undefined): GameInfo {
  if (code && code in GAME_METADATA) {
    return GAME_METADATA[code as GameCode];
  }
  return {
    code: (code as GameCode) || 'flappy-bird',
    name: String(code || 'Game'),
    emoji: '🎮',
    tagline: 'Complete the objective to unlock the next clue',
    description: 'Complete the challenge target to progress.',
    howToPlay: ['Follow on-screen controls to achieve the target.'],
    controls: 'Keyboard & Touch screen controls',
    objective: 'Complete the designated goal.',
  };
}
