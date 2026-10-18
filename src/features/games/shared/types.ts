export interface GameProps {
  challenge: Record<string, unknown>;
  disabled?: boolean;
  onComplete(result: unknown): void;
}
