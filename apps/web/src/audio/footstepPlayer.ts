import { playProceduralFootstep } from "./proceduralAudio.ts";

const POOL_PER_URL = 3;
const pools = new Map<string, HTMLAudioElement[]>();

export function chooseFootstepUrl(
  urls: readonly string[],
  previousUrl: string | undefined,
  random = Math.random,
) {
  if (urls.length === 0) return undefined;
  if (urls.length === 1) return urls[0];

  const available = urls.filter((url) => url !== previousUrl);
  const pool = available.length > 0 ? available : urls;
  const index = Math.min(pool.length - 1, Math.floor(random() * pool.length));
  return pool[index];
}

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
