import { ENGINE_VERSION, type Envelope } from "../types.ts";
export class ReportCache {
  private entries = new Map<string, Envelope<unknown>>();
  private pending = new Map<string, Promise<Envelope<unknown>>>();
  private tail: Promise<unknown> = Promise.resolve();
  constructor(
    private ttl = 30_000,
    private limit = 12,
  ) {}
  async get<T>(
    key: string,
    read: () => Promise<T>,
    force = false,
  ): Promise<Envelope<T>> {
    const pending = this.pending.get(key);
    if (pending) return pending as Promise<Envelope<T>>;
    const cached = this.entries.get(key);
    if (cached && !force && Date.now() - Date.parse(cached.readAt) < this.ttl) {
      this.entries.delete(key);
      this.entries.set(key, cached);
      return cached as Envelope<T>;
    }
    const task = this.tail
      .catch(() => {})
      .then(async () => {
        const start = performance.now();
        const data = await read();
        const value = {
          data,
          readAt: new Date().toISOString(),
          engineVersion: ENGINE_VERSION,
          pricing: `ccusage ${ENGINE_VERSION} bundled offline pricing; costs are API-equivalent estimates, not subscription invoices.`,
          durationMs: Math.round(performance.now() - start),
        };
        this.entries.delete(key);
        this.entries.set(key, value);
        while (this.entries.size > this.limit)
          this.entries.delete(this.entries.keys().next().value!);
        return value;
      });
    this.pending.set(key, task);
    this.tail = task;
    try {
      return await task;
    } finally {
      this.pending.delete(key);
    }
  }
}
