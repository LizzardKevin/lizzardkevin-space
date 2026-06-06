import { playProceduralFootstep } from "./proceduralAudio";

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
