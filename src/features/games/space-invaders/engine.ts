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
