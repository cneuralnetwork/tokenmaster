import { useEffect, useRef, useState } from "react";
export function useApi<T>(url: string | null, refresh: number, poll = true) {
  const [state, setState] = useState<{
    value: T | null;
    loading: boolean;
    error: string;
    loadedUrl: string;
  }>({ value: null, loading: false, error: "", loadedUrl: "" });
  const sequence = useRef(0);
  useEffect(() => {
    if (!url) return;
    let controller: AbortController | undefined;
    let busy = false;
    let disposed = false;
    const load = async (force = false) => {
      if (busy) return;
      busy = true;
      const id = ++sequence.current;
      controller = new AbortController();
      setState((s) => ({ ...s, loading: true, error: "" }));
      try {
        const response = await fetch(
          force ? `${url}${url.includes("?") ? "&" : "?"}refresh=1` : url,
          { signal: controller.signal },
        );
        const value = await response.json();
        if (!response.ok)
          throw new Error(value.error ?? `Request failed: ${response.status}`);
        if (!disposed && id === sequence.current)
          setState({
            value: value as T,
            loading: false,
            error: "",
            loadedUrl: url,
          });
      } catch (error) {
        if (!disposed && id === sequence.current)
          setState((s) => ({
            ...s,
            loading: false,
            error:
              error instanceof Error
                ? error.message
                : "Unable to read local usage.",
          }));
      } finally {
        busy = false;
      }
    };
    void load(refresh > 0);
    const timer = poll
      ? setInterval(() => {
          if (document.visibilityState === "visible") void load();
        }, 30_000)
      : undefined;
    const visible = () => {
      if (document.visibilityState === "visible") void load();
    };
    if (poll) document.addEventListener("visibilitychange", visible);
    return () => {
      disposed = true;
      controller?.abort();
      clearInterval(timer);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [url, refresh, poll]);
  return state;
}
