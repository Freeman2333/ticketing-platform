import { useEffect, useRef, useState } from 'react';

export function useCountdown(target: Date | null, onExpire?: () => void): number {
  const [remainingMs, setRemainingMs] = useState(() =>
    target ? target.getTime() - Date.now() : 0,
  );
  const hasExpiredRef = useRef(false);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    if (!target) return;
    hasExpiredRef.current = false;

    const tick = () => {
      const remaining = target.getTime() - Date.now();
      setRemainingMs(remaining);
      if (remaining <= 0 && !hasExpiredRef.current) {
        hasExpiredRef.current = true;
        onExpireRef.current?.();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target?.getTime()]);

  return remainingMs;
}
