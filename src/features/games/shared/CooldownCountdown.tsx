import { useEffect, useState } from 'react';

export function CooldownCountdown({ retryAt, onReady }: { retryAt: string; onReady(): void }) {
  const calculate = () => Math.max(0, Math.ceil((new Date(retryAt).getTime() - Date.now()) / 1000));
  const [remaining, setRemaining] = useState(calculate);
  useEffect(() => {
    if (remaining === 0) {
      onReady();
      return;
    }
    const timer = setInterval(() => {
      const next = calculate();
      setRemaining(next);
      if (next === 0) onReady();
    }, 500);
    return () => clearInterval(timer);
  }, [onReady, remaining, retryAt]);
  return (
    <p className="mt-4 font-mono text-amber-300" aria-live="polite">
      Retry available in {remaining}s
    </p>
  );
}
