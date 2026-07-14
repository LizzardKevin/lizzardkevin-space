import type { ExhibitManifestItem } from "./manifest.ts";

export type SelectedWorkMediaProgress = {
  loaded: number;
  total: number;
  failed: number;
};

export type SelectedWorkImage = {
  sourceUrl: string;
  displayUrl: string | null;
  status: "loading" | "loaded" | "failed";
};

export type SelectedWorkMediaSnapshot = {
  exhibitId: string;
  images: SelectedWorkImage[];
  progress: SelectedWorkMediaProgress;
};

export type SelectedWorkVideoMetadataSnapshot = {
  exhibitId: string;
  progress: SelectedWorkMediaProgress;
  settledUrls: string[];
  videos: Array<{
    sourceUrl: string;
    status: "loading" | "loaded" | "failed";
  }>;
};

export type DecodedSelectedWorkImage = {
  displayUrl: string;
  dispose: () => void;
};

type SelectedWorkImageLoader = (
  url: string,
  signal: AbortSignal,
) => Promise<DecodedSelectedWorkImage>;

type CachedWork = {
  exhibitId: string;
  images: Map<string, DecodedSelectedWorkImage>;
};

type ActiveAttempt = {
  active: boolean;
  controllers: AbortController[];
  token: number;
};

type VideoMetadataOutcome = "loaded" | "failed";

type VideoMetadataEvent = {
  exhibitId: string;
  url: string;
  outcome: VideoMetadataOutcome;
};

type VideoMetadataBinding = {
  exhibitId: string;
  url: string;
  report: (url: string, outcome: VideoMetadataOutcome) => void;
};

type VideoMetadataElementState = {
  readyState: number;
  error: unknown;
};

export function createSelectedWorkVideoMetadataEventBridge() {
  let binding: VideoMetadataBinding | null = null;
  let pending: VideoMetadataEvent | null = null;

  const matches = (
    left: Pick<VideoMetadataEvent, "exhibitId" | "url">,
    right: Pick<VideoMetadataBinding, "exhibitId" | "url">,
  ) => left.exhibitId === right.exhibitId && left.url === right.url;

  return {
    bind(nextBinding: VideoMetadataBinding, elementState?: VideoMetadataElementState) {
      binding = nextBinding;
      const earlyEvent = pending;
      pending = null;
      if (earlyEvent && matches(earlyEvent, nextBinding)) {
        nextBinding.report(earlyEvent.url, earlyEvent.outcome);
      }
      if (elementState?.error) {
        nextBinding.report(nextBinding.url, "failed");
      } else if ((elementState?.readyState ?? 0) >= 1) {
        nextBinding.report(nextBinding.url, "loaded");
      }
    },
    clear() {
      binding = null;
      pending = null;
    },
    record(event: VideoMetadataEvent) {
      if (binding && matches(event, binding)) {
        binding.report(event.url, event.outcome);
        return;
      }
      pending = event;
    },
    unbind(exhibitId: string, url: string) {
      if (binding?.exhibitId === exhibitId && binding.url === url) binding = null;
    },
  } as const;
}

function defaultBaseUrl() {
  if (typeof document !== "undefined" && document.baseURI) return document.baseURI;
  if (typeof location !== "undefined" && location.href) return location.href;
  return "http://localhost/";
}

function normalizeSelectedWorkUrls(
  urls: readonly string[] | undefined,
  baseUrl = defaultBaseUrl(),
) {
  const normalized: string[] = [];
  const seen = new Set<string>();
  for (const candidate of urls ?? []) {
    const trimmed = candidate.trim();
    if (!trimmed) continue;
    let url: string;
    try {
      url = new URL(trimmed, baseUrl).href;
    } catch {
      continue;
    }
    if (seen.has(url)) continue;
    seen.add(url);
    normalized.push(url);
  }
  return normalized;
}

export function normalizeSelectedWorkImageUrls(
  urls: readonly string[] | undefined,
  baseUrl = defaultBaseUrl(),
) {
  return normalizeSelectedWorkUrls(urls, baseUrl);
}

export function normalizeSelectedWorkVideoUrls(
  urls: readonly string[] | undefined,
  baseUrl = defaultBaseUrl(),
) {
  return normalizeSelectedWorkUrls(urls, baseUrl);
}

function createAbortError() {
  return new DOMException("Image load aborted", "AbortError");
}

function awaitWithAbort<T>(promise: Promise<T>, signal: AbortSignal) {
  if (signal.aborted) return Promise.reject(createAbortError());
  return new Promise<T>((resolve, reject) => {
    const abort = () => reject(createAbortError());
    signal.addEventListener("abort", abort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener("abort", abort);
        resolve(value);
      },
      (error) => {
        signal.removeEventListener("abort", abort);
        reject(error);
      },
    );
  });
}

function waitForImageDecode(image: HTMLImageElement) {
  if (typeof image.decode === "function") return image.decode();
  if (image.complete && image.naturalWidth > 0) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    image.addEventListener("load", () => resolve(), { once: true });
    image.addEventListener("error", () => reject(new Error("Image decode failed")), { once: true });
  });
}

function loadImageElement(
  displayUrl: string,
  signal: AbortSignal,
  disposeUrl: () => void,
  createImage: () => HTMLImageElement,
): Promise<DecodedSelectedWorkImage> {
  const image = createImage();
  image.decoding = "async";
  image.loading = "eager";
  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    image.src = "";
    disposeUrl();
  };
  const abort = () => {
    image.src = "";
  };
  signal.addEventListener("abort", abort, { once: true });
  image.src = displayUrl;
  return awaitWithAbort(waitForImageDecode(image), signal).then(
    () => {
      signal.removeEventListener("abort", abort);
      if (signal.aborted) {
        dispose();
        throw createAbortError();
      }
      return {
        displayUrl,
        dispose,
      };
    },
    (error) => {
      signal.removeEventListener("abort", abort);
      dispose();
      throw error;
    },
  );
}

type SelectedWorkImageLoaderEnvironment = {
  baseUrl?: string;
  fetchImage?: (
    url: string,
    init: { signal: AbortSignal },
  ) => Promise<Pick<Response, "ok" | "status" | "blob">>;
  createImage?: () => HTMLImageElement;
  createObjectUrl?: (blob: Blob) => string;
  revokeObjectUrl?: (url: string) => void;
};

export function createSelectedWorkImageLoader({
  baseUrl,
  fetchImage = (url, init) => fetch(url, init),
  createImage = () => new Image(),
  createObjectUrl = (blob) => URL.createObjectURL(blob),
  revokeObjectUrl = (url) => URL.revokeObjectURL(url),
}: SelectedWorkImageLoaderEnvironment = {}): SelectedWorkImageLoader {
  return async (url, signal) => {
    const resolvedBaseUrl = baseUrl ?? defaultBaseUrl();
    const parsed = new URL(url, resolvedBaseUrl);
    const currentOrigin = new URL(resolvedBaseUrl).origin;

    if (parsed.origin !== currentOrigin) {
      return loadImageElement(parsed.href, signal, () => undefined, createImage);
    }

    const response = await awaitWithAbort(fetchImage(parsed.href, { signal }), signal);
    if (!response.ok) throw new Error(`Failed to load image: ${response.status}`);
    const blob = await awaitWithAbort(response.blob(), signal);
    if (signal.aborted) throw createAbortError();
    const objectUrl = createObjectUrl(blob);
    return loadImageElement(
      objectUrl,
      signal,
      () => revokeObjectUrl(objectUrl),
      createImage,
    );
  };
}

const defaultLoadImage = createSelectedWorkImageLoader();

function disposeCachedWork(work: CachedWork) {
  for (const image of work.images.values()) image.dispose();
  work.images.clear();
}

export function createSelectedWorkMediaController({
  baseUrl = defaultBaseUrl(),
  loadImage = defaultLoadImage,
}: {
  baseUrl?: string;
  loadImage?: SelectedWorkImageLoader;
} = {}) {
  let attemptSequence = 0;
  let activeAttempt: ActiveAttempt | null = null;
  const cache: CachedWork[] = [];

  const cancelActive = () => {
    const attempt = activeAttempt;
    if (!attempt) return;
    attempt.active = false;
    for (const controller of attempt.controllers) controller.abort();
    activeAttempt = null;
  };

  const promoteWork = (exhibitId: string) => {
    const existingIndex = cache.findIndex((work) => work.exhibitId === exhibitId);
    const work = existingIndex >= 0
      ? cache.splice(existingIndex, 1)[0]
      : { exhibitId, images: new Map<string, DecodedSelectedWorkImage>() };
    cache.unshift(work);
    while (cache.length > 2) disposeCachedWork(cache.pop()!);
    return work;
  };

  const select = (
    exhibit: Pick<ExhibitManifestItem, "exhibitId" | "media">,
    onSnapshot: (snapshot: SelectedWorkMediaSnapshot) => void,
    onVideoSnapshot?: (snapshot: SelectedWorkVideoMetadataSnapshot) => void,
  ) => {
    cancelActive();
    const token = ++attemptSequence;
    const attempt: ActiveAttempt = { active: true, controllers: [], token };
    activeAttempt = attempt;
    const urls = normalizeSelectedWorkImageUrls(exhibit.media?.imageUrls, baseUrl);
    const videoUrls = normalizeSelectedWorkVideoUrls(
      exhibit.media?.videoUrl ? [exhibit.media.videoUrl] : [],
      baseUrl,
    );
    const videoStatuses = new Map<string, "loaded" | "failed">();
    const work = promoteWork(exhibit.exhibitId);
    const activeUrlSet = new Set(urls);
    for (const [url, decoded] of work.images) {
      if (!activeUrlSet.has(url)) {
        decoded.dispose();
        work.images.delete(url);
      }
    }
    const failed = new Set<string>();

    const snapshot = (): SelectedWorkMediaSnapshot => ({
      exhibitId: exhibit.exhibitId,
      images: urls.map((sourceUrl) => ({
        sourceUrl,
        displayUrl: work.images.get(sourceUrl)?.displayUrl ?? null,
        status: work.images.has(sourceUrl)
          ? "loaded"
          : failed.has(sourceUrl)
            ? "failed"
            : "loading",
      })),
      progress: {
        loaded: urls.filter((url) => work.images.has(url)).length,
        total: urls.length,
        failed: failed.size,
      },
    });

    const publish = () => {
      if (activeAttempt !== attempt || !attempt.active || attempt.token !== token) return;
      onSnapshot(snapshot());
    };

    const videoSnapshot = (): SelectedWorkVideoMetadataSnapshot => ({
      exhibitId: exhibit.exhibitId,
      progress: {
        loaded: videoUrls.filter((url) => videoStatuses.get(url) === "loaded").length,
        total: videoUrls.length,
        failed: videoUrls.filter((url) => videoStatuses.get(url) === "failed").length,
      },
      settledUrls: videoUrls.filter((url) => videoStatuses.has(url)),
      videos: videoUrls.map((sourceUrl) => ({
        sourceUrl,
        status: videoStatuses.get(sourceUrl) ?? "loading",
      })),
    });

    const publishVideo = () => {
      if (activeAttempt !== attempt || !attempt.active || attempt.token !== token) return;
      onVideoSnapshot?.(videoSnapshot());
    };

    publish();
    publishVideo();
    const tasks = urls.map(async (url) => {
      if (work.images.has(url)) return;
      const controller = new AbortController();
      attempt.controllers.push(controller);
      try {
        const decoded = await loadImage(url, controller.signal);
        if (activeAttempt !== attempt || !attempt.active || attempt.token !== token) {
          decoded.dispose();
          return;
        }
        work.images.set(url, decoded);
        publish();
      } catch {
        if (activeAttempt !== attempt || !attempt.active || attempt.token !== token) return;
        failed.add(url);
        publish();
      }
    });

    const done = Promise.allSettled(tasks).then(() => snapshot());
    return {
      cancel() {
        if (activeAttempt === attempt) cancelActive();
      },
      done,
      reportVideoMetadata(candidateUrl: string, status: "loaded" | "failed") {
        if (activeAttempt !== attempt || !attempt.active || attempt.token !== token) return;
        const [url] = normalizeSelectedWorkVideoUrls([candidateUrl], baseUrl);
        if (!url || !videoUrls.includes(url) || videoStatuses.has(url)) return;
        videoStatuses.set(url, status);
        publishVideo();
      },
    };
  };

  return {
    cachedWorkIds: () => cache.map(({ exhibitId }) => exhibitId),
    cancel: cancelActive,
    dispose() {
      cancelActive();
      for (const work of cache) disposeCachedWork(work);
      cache.length = 0;
    },
    select,
  } as const;
}

export const selectedWorkMediaController = createSelectedWorkMediaController();
