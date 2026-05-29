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
      // Pausamos mientras la pestaña está en background: ahorra red/batería
      // en mobile. Al volver a primer plano se dispara un tick inmediato.
      if (typeof document !== "undefined" && document.hidden) return;
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

    const onVisible = () => {
      if (!cancelled && !document.hidden) void tick();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled, intervalMs]);
}
