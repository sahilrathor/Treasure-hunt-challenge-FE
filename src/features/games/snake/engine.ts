export type SnakeDirection = 'up' | 'down' | 'left' | 'right';

export interface SnakeState {
  snake: number[];
  food: number;
  obstacles: number[];
  direction: SnakeDirection;
  score: number;
  over: boolean;
}

const width = 8;
const obstacleCells = [10, 13, 18, 45, 50, 53, 29, 34];
const opposite: Record<SnakeDirection, SnakeDirection> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
};

function nextFood(score: number, snake: number[], obstacles: number[]) {
  let cell = (score * 17 + 7) % (width * width);
  while (snake.includes(cell) || obstacles.includes(cell)) cell = (cell + 11) % (width * width);
  return cell;
}

export function createSnakeState(obstacleCount: number): SnakeState {
  const obstacles = obstacleCells.slice(0, obstacleCount);
  const snake = [27, 26, 25];
  return {
    snake,
    obstacles,
    food: nextFood(0, snake, obstacles),
    direction: 'right',
    score: 0,
    over: false,
  };
}

export function moveSnake(state: SnakeState, requested: SnakeDirection): SnakeState {
  if (state.over) return state;
  const direction = requested === opposite[state.direction] ? state.direction : requested;
  const head = state.snake[0]!;
  const row = Math.floor(head / width);
  const column = head % width;
  const nextRow = row + (direction === 'down' ? 1 : direction === 'up' ? -1 : 0);
  const nextColumn = column + (direction === 'right' ? 1 : direction === 'left' ? -1 : 0);
  if (nextRow < 0 || nextRow >= width || nextColumn < 0 || nextColumn >= width) {
    return { ...state, direction, over: true };
  }
  const nextHead = nextRow * width + nextColumn;
  const ate = nextHead === state.food;
  const body = ate ? state.snake : state.snake.slice(0, -1);
  if (body.includes(nextHead) || state.obstacles.includes(nextHead)) {
    return { ...state, direction, over: true };
  }
  const snake = [nextHead, ...body];
  const score = state.score + (ate ? 1 : 0);
  return {
    ...state,
    snake,
    score,
    direction,
    food: ate ? nextFood(score, snake, state.obstacles) : state.food,
  };
}
