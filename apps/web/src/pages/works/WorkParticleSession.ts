import type { ParticleCacheData } from "../../particles/particleCacheLoader.ts";

type TransitionRenderer = {
  whenSettled(): Promise<void>;
  prepareTransition(data: ParticleCacheData): Promise<void>;
  cancelPreparedTransition(): void;
  startIntro(): void;
  update(dt: number): void;
};

/** Latest request wins; GPU mutations are serial even when fetches finish out of order. */
export class WorkParticleSession {
  private generation = 0;
  private disposed = false;
  private loadController: AbortController | null = null;
  private commits: Promise<void> = Promise.resolve();
  private renderer: TransitionRenderer;
  private load: (id: string, signal: AbortSignal) => Promise<ParticleCacheData>;
  private initialized: Promise<unknown>;
  private notify: (id: string, state: "pending" | "ready" | "failed", message?: string) => void;
  constructor(
    renderer: TransitionRenderer,
    load: (id: string, signal: AbortSignal) => Promise<ParticleCacheData>,
    initialized: Promise<unknown>,
    notify: (id: string, state: "pending" | "ready" | "failed", message?: string) => void,
  ) { this.renderer = renderer; this.load = load; this.initialized = initialized; this.notify = notify; }

  request(id: string) {
    if (this.disposed) return;
    this.loadController?.abort();
    const controller = new AbortController();
    this.loadController = controller;
    const generation = ++this.generation;
    const current = () => !this.disposed && generation === this.generation;
    this.notify(id, "pending");
    void Promise.all([this.initialized, this.load(id, controller.signal)]).then(([, data]) => {
      if (!current()) return;
      this.commits = this.commits.then(async () => {
        await this.renderer.whenSettled();
        if (!current()) return;
        await this.renderer.prepareTransition(data);
        if (!current()) { this.renderer.cancelPreparedTransition(); return; }
        // Compilation and the last outgoing zero-opacity frame are independent
        // conditions. No duration timer can stand in for either completion.
        await this.renderer.whenSettled();
        if (!current()) { this.renderer.cancelPreparedTransition(); return; }
        this.renderer.startIntro();
        this.renderer.update(0);
        this.notify(id, "ready");
      }).catch(error => {
        this.renderer.cancelPreparedTransition();
        if (current()) this.notify(id, "failed", error instanceof Error ? error.message : String(error));
      });
    }).catch(error => {
      if (current()) this.notify(id, "failed", error instanceof Error ? error.message : String(error));
    });
  }

  dispose() { this.disposed = true; this.generation++; this.loadController?.abort(); }
}
