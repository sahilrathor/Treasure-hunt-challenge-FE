export function patternStepIsCorrect(sequence: number[], input: number[], next: number) {
  return sequence[input.length] === next;
}

export function revealSpeed(difficulty: unknown) {
  if (difficulty === 'hard') return 260;
  if (difficulty === 'medium') return 360;
  return 480;
}
