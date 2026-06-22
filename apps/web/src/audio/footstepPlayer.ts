import { playProceduralFootstep } from "./proceduralAudio.ts";

const POOL_PER_URL = 3;
const pools = new Map<string, HTMLAudioElement[]>();

export function preloadFootstepClips(urls: readonly string[]) {
  for (const url of urls) {
    if (pools.has(url)) continue;
    pools.set(
      url,
      Array.from({ length: POOL_PER_URL }, () => {
        const el = new Audio(url);
        el.preload = "auto";
        el.load();
        return el;
      }),
    );
  }
}

export function primeFootstepClips(urls: readonly string[]) {
  preloadFootstepClips(urls);

  for (const url of urls) {
    const el = pools.get(url)?.[0];
    if (!el) continue;

    const muted = el.muted;
    const volume = el.volume;
    const restore = () => {
      try {
        el.pause();
        el.currentTime = 0;
      } catch {
        /* keep unlock best-effort */
      }
      el.muted = muted;
      el.volume = volume;
    };

    el.muted = true;
    el.volume = 0;
    try {
      const result = el.play();
      if (result && typeof result.then === "function") {
        void result.then(restore).catch(restore);
      } else {
        restore();
      }
    } catch {
      restore();
    }
  }
}

export function playFootstepClip(url: string, volume: number) {
  let pool = pools.get(url);
  if (!pool) {
    preloadFootstepClips([url]);
    pool = pools.get(url);
  }
  if (!pool?.length) {
    playProceduralFootstep(volume);
    return;
  }

  let el = pool.find((a) => a.paused || a.ended);
  if (!el) el = pool[0]!;

  el.volume = Math.min(1, Math.max(0, volume));
  try {
    el.currentTime = 0;
  } catch {
    /* some browsers throw if not ready */
  }
  void el.play().catch(() => playProceduralFootstep(volume));
}

export function clearFootstepPools() {
  pools.clear();
}
