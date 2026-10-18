export type MatchPair = [number, number];

export function isValidMatch(board: number[], left: number, right: number) {
  return left !== right && board[left] !== undefined && board[left] === board[right];
}

export function isCardMatched(matches: MatchPair[], index: number) {
  return matches.some(([left, right]) => left === index || right === index);
}
