import { useEffect, useRef } from "react";

export function usePolling(
  enabled: boolean,
  intervalMs: number,
  callback: () => void | Promise<void>,
): void {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const tick = async () => {
      try {
        await savedCallback.current();
      } catch (err) {
        console.error("Polling error", err);
      }
    };

    void tick();
    const id = window.setInterval(() => {
      if (!cancelled) void tick();
    }, intervalMs);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [enabled, intervalMs]);
}
