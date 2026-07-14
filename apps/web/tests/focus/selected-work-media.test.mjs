import assert from "node:assert/strict";
import test from "node:test";
import { importSourceModule } from "../helpers/projectPaths.mjs";

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

function exhibit(exhibitId, imageUrls, videoUrl = "/media/process.mp4") {
  return {
    exhibitId,
    focusGlbUrl: `/exhibits/${exhibitId}/focus.glb`,
    type: "model3d",
    media: { imageUrls, videoUrl },
  };
}

test("selection starts every unique image concurrently in normalized manifest order", async () => {
  const { createSelectedWorkMediaController } =
    await importSourceModule("exhibits/selectedWorkMedia.ts");
  const pending = new Map();
  const calls = [];
  const controller = createSelectedWorkMediaController({
    baseUrl: "https://space.test/gallery/",
    loadImage(url, signal) {
      calls.push({ signal, url });
      const task = deferred();
      pending.set(url, task);
      return task.promise;
    },
  });
  const snapshots = [];

  const session = controller.select(
    exhibit("work-a", [" /images/a.jpg ", "/images/../images/b.jpg", "/images/a.jpg", ""]),
    (snapshot) => snapshots.push(snapshot),
  );

  assert.deepEqual(calls.map(({ url }) => url), [
    "https://space.test/images/a.jpg",
    "https://space.test/images/b.jpg",
  ]);
  assert.equal(calls.every(({ signal }) => signal.aborted === false), true);
  assert.deepEqual(snapshots[0].progress, { loaded: 0, total: 2, failed: 0 });

  pending.get("https://space.test/images/b.jpg").resolve({
    displayUrl: "blob:b",
    dispose() {},
  });
  await Promise.resolve();
  pending.get("https://space.test/images/a.jpg").resolve({
    displayUrl: "blob:a",
    dispose() {},
  });
  const finalSnapshot = await session.done;

  assert.deepEqual(finalSnapshot.progress, { loaded: 2, total: 2, failed: 0 });
  assert.deepEqual(finalSnapshot.images.map(({ sourceUrl, displayUrl, status }) => ({ sourceUrl, displayUrl, status })), [
    { sourceUrl: "https://space.test/images/a.jpg", displayUrl: "blob:a", status: "loaded" },
    { sourceUrl: "https://space.test/images/b.jpg", displayUrl: "blob:b", status: "loaded" },
  ]);
});

test("failed decodes settle once and remain distinct from successfully decoded images", async () => {
  const { createSelectedWorkMediaController } =
    await importSourceModule("exhibits/selectedWorkMedia.ts");
  const tasks = [deferred(), deferred()];
  let nextTask = 0;
  const snapshots = [];
  const controller = createSelectedWorkMediaController({
    baseUrl: "https://space.test/",
    loadImage() {
      return tasks[nextTask++].promise;
    },
  });

  const session = controller.select(exhibit("partial", ["/ok.jpg", "/bad.jpg"]), (snapshot) => {
    snapshots.push(snapshot);
  });
  tasks[0].resolve({ displayUrl: "blob:ok", dispose() {} });
  tasks[1].reject(new Error("decode failed"));
  const finalSnapshot = await session.done;

  assert.deepEqual(finalSnapshot.progress, { loaded: 1, total: 2, failed: 1 });
  assert.deepEqual(finalSnapshot.images.map(({ status }) => status), ["loaded", "failed"]);
  assert.equal(snapshots.filter(({ progress }) => progress.loaded + progress.failed === 2).length, 1);
});

test("selection changes abort fetch-capable work and ignore stale non-abortable completion", async () => {
  const { createSelectedWorkMediaController } =
    await importSourceModule("exhibits/selectedWorkMedia.ts");
  const oldTask = deferred();
  const newTask = deferred();
  const signals = [];
  const controller = createSelectedWorkMediaController({
    baseUrl: "https://space.test/",
    loadImage(url, signal) {
      signals.push({ signal, url });
      return url.endsWith("old.jpg") ? oldTask.promise : newTask.promise;
    },
  });
  const oldSnapshots = [];
  const newSnapshots = [];

  const oldSession = controller.select(exhibit("old", ["/old.jpg"]), (snapshot) => oldSnapshots.push(snapshot));
  const newSession = controller.select(exhibit("new", ["/new.jpg"]), (snapshot) => newSnapshots.push(snapshot));
  assert.equal(signals[0].signal.aborted, true);

  oldTask.resolve({ displayUrl: "blob:stale", dispose() {} });
  newTask.resolve({ displayUrl: "blob:new", dispose() {} });
  await oldSession.done;
  const current = await newSession.done;

  assert.equal(oldSnapshots.length, 1, "the stale completion must not publish another snapshot");
  assert.deepEqual(current.progress, { loaded: 1, total: 1, failed: 0 });
  assert.equal(current.images[0].displayUrl, "blob:new");
});

test("cache keeps current and immediately previous work, reuses decoded images, and disposes older work", async () => {
  const { createSelectedWorkMediaController } =
    await importSourceModule("exhibits/selectedWorkMedia.ts");
  const loads = [];
  const disposals = [];
  const controller = createSelectedWorkMediaController({
    baseUrl: "https://space.test/",
    async loadImage(url) {
      loads.push(url);
      return { displayUrl: `blob:${url}`, dispose: () => disposals.push(url) };
    },
  });

  await controller.select(exhibit("one", ["/one.jpg"]), () => {}).done;
  await controller.select(exhibit("two", ["/two.jpg"]), () => {}).done;
  await controller.select(exhibit("one", ["/one.jpg"]), () => {}).done;
  assert.deepEqual(loads, [
    "https://space.test/one.jpg",
    "https://space.test/two.jpg",
  ]);

  await controller.select(exhibit("three", ["/three.jpg"]), () => {}).done;
  assert.deepEqual(controller.cachedWorkIds(), ["three", "one"]);
  assert.deepEqual(disposals, ["https://space.test/two.jpg"]);

  controller.dispose();
  assert.deepEqual(new Set(disposals), new Set([
    "https://space.test/one.jpg",
    "https://space.test/two.jpg",
    "https://space.test/three.jpg",
  ]));
});

test("creating the controller makes zero requests and video metadata is excluded from image progress", async () => {
  const { createSelectedWorkMediaController } =
    await importSourceModule("exhibits/selectedWorkMedia.ts");
  const calls = [];
  const controller = createSelectedWorkMediaController({
    baseUrl: "https://space.test/",
    async loadImage(url) {
      calls.push(url);
      return { displayUrl: url, dispose() {} };
    },
  });
  assert.deepEqual(calls, []);

  const result = await controller.select(
    exhibit("video-work", ["/still.jpg"], "/large-process.mp4"),
    () => {},
  ).done;
  assert.deepEqual(calls, ["https://space.test/still.jpg"]);
  assert.deepEqual(result.progress, { loaded: 1, total: 1, failed: 0 });
});

test("cancelling a selection aborts outstanding work and suppresses later UI publication", async () => {
  const { createSelectedWorkMediaController } =
    await importSourceModule("exhibits/selectedWorkMedia.ts");
  const task = deferred();
  let signal;
  const snapshots = [];
  const controller = createSelectedWorkMediaController({
    baseUrl: "https://space.test/",
    loadImage(_url, selectedSignal) {
      signal = selectedSignal;
      return task.promise;
    },
  });
  const session = controller.select(exhibit("closing", ["/closing.jpg"]), (snapshot) => {
    snapshots.push(snapshot);
  });

  session.cancel();
  assert.equal(signal.aborted, true);
  task.resolve({ displayUrl: "blob:late", dispose() {} });
  await session.done;
  assert.equal(snapshots.length, 1);
});

test("Focus media holds an unstable rail until settlement, then renders successes in manifest order", async () => {
  const { getFocusMediaItems } = await importSourceModule("exhibits/focusMedia.ts");
  const work = exhibit("ordered", ["/first.jpg", "/second.jpg", "/third.jpg"]);
  const pendingImages = [
    { sourceUrl: "https://space.test/first.jpg", displayUrl: null, status: "loading" },
    { sourceUrl: "https://space.test/second.jpg", displayUrl: "blob:second", status: "loaded" },
    { sourceUrl: "https://space.test/third.jpg", displayUrl: "blob:third", status: "loaded" },
  ];
  const pendingItems = getFocusMediaItems(work, pendingImages);
  assert.deepEqual(pendingItems, [
    { kind: "model", url: "/exhibits/ordered/focus.glb" },
    { kind: "video", url: "/media/process.mp4" },
  ]);

  const items = getFocusMediaItems(work, [
    { ...pendingImages[0], status: "failed" },
    pendingImages[1],
    pendingImages[2],
  ]);

  assert.deepEqual(items, [
    { kind: "model", url: "/exhibits/ordered/focus.glb" },
    { kind: "video", url: "/media/process.mp4" },
    { kind: "image", url: "blob:second" },
    { kind: "image", url: "blob:third" },
  ]);
  assert.equal(items.some(({ url }) => url === "/first.jpg"), false);
});

test("video metadata URLs normalize and deduplicate without entering image progress", async () => {
  const {
    createSelectedWorkMediaController,
    normalizeSelectedWorkVideoUrls,
  } = await importSourceModule("exhibits/selectedWorkMedia.ts");
  assert.deepEqual(
    normalizeSelectedWorkVideoUrls(
      [" /process.mp4 ", "/clips/../process.mp4", "/process.mp4", ""],
      "https://space.test/gallery/",
    ),
    ["https://space.test/process.mp4"],
  );

  const imageSnapshots = [];
  const videoSnapshots = [];
  const controller = createSelectedWorkMediaController({
    baseUrl: "https://space.test/",
    async loadImage(url) {
      return { displayUrl: url, dispose() {} };
    },
  });
  const session = controller.select(
    exhibit("metadata", ["/still.jpg"], "/process.mp4"),
    (snapshot) => imageSnapshots.push(snapshot),
    (snapshot) => videoSnapshots.push(snapshot),
  );
  await session.done;
  const imageSnapshotCount = imageSnapshots.length;

  session.reportVideoMetadata("/process.mp4", "loaded");
  session.reportVideoMetadata("/process.mp4", "loaded");

  assert.equal(imageSnapshots.length, imageSnapshotCount);
  assert.deepEqual(imageSnapshots.at(-1).progress, { loaded: 1, total: 1, failed: 0 });
  assert.equal(videoSnapshots.length, 2, "duplicate metadata events settle exactly once");
  assert.deepEqual(videoSnapshots.at(-1).progress, { loaded: 1, total: 1, failed: 0 });
  assert.deepEqual(videoSnapshots.at(-1).settledUrls, ["https://space.test/process.mp4"]);
});

test("video metadata failures are separate and stale prior-selection events are ignored", async () => {
  const { createSelectedWorkMediaController } =
    await importSourceModule("exhibits/selectedWorkMedia.ts");
  const controller = createSelectedWorkMediaController({ baseUrl: "https://space.test/" });
  const oldVideoSnapshots = [];
  const newVideoSnapshots = [];
  const oldSession = controller.select(
    exhibit("old-video", [], "/old.mp4"),
    () => {},
    (snapshot) => oldVideoSnapshots.push(snapshot),
  );
  const newSession = controller.select(
    exhibit("new-video", [], "/new.mp4"),
    () => {},
    (snapshot) => newVideoSnapshots.push(snapshot),
  );

  oldSession.reportVideoMetadata("/old.mp4", "loaded");
  newSession.reportVideoMetadata("/new.mp4", "failed");
  newSession.reportVideoMetadata("/new.mp4", "failed");

  assert.equal(oldVideoSnapshots.length, 1);
  assert.equal(newVideoSnapshots.length, 2);
  assert.deepEqual(newVideoSnapshots.at(-1).progress, { loaded: 0, total: 1, failed: 1 });
  assert.deepEqual(newVideoSnapshots.at(-1).settledUrls, ["https://space.test/new.mp4"]);
});
