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

async function waitFor(predicate, message) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setImmediate(resolve));
  }
  assert.fail(message);
}

function createLoaderHarness({ responseOk = true, bodyTask = null } = {}) {
  const decodes = [];
  const createdUrls = [];
  const revokedUrls = [];
  const fetchCalls = [];
  const bodyReads = [];
  const images = [];
  const environment = {
    baseUrl: "https://space.test/",
    fetchImage(url, init) {
      fetchCalls.push({ init, url });
      return Promise.resolve({
        ok: responseOk,
        status: responseOk ? 200 : 503,
        blob: () => {
          bodyReads.push(url);
          return bodyTask?.promise ?? Promise.resolve(new Blob(["image"]));
        },
      });
    },
    createImage() {
      const decodeTask = deferred();
      decodes.push(decodeTask);
      const image = {
        complete: false,
        naturalWidth: 0,
        decoding: "auto",
        loading: "auto",
        src: "",
        decode: () => decodeTask.promise,
        addEventListener() {},
        removeEventListener() {},
      };
      images.push(image);
      return image;
    },
    createObjectUrl() {
      const url = `blob:test-${createdUrls.length + 1}`;
      createdUrls.push(url);
      return url;
    },
    revokeObjectUrl(url) {
      revokedUrls.push(url);
    },
  };
  return { bodyReads, createdUrls, decodes, environment, fetchCalls, images, revokedUrls };
}

test("production loader fetches, blobs, decodes, and revokes a successful owned URL exactly once", async () => {
  const { createSelectedWorkImageLoader } = await importSourceModule("exhibits/selectedWorkMedia.ts");
  const harness = createLoaderHarness();
  const loader = createSelectedWorkImageLoader(harness.environment);
  const controller = new AbortController();
  const pending = loader("https://space.test/a.jpg", controller.signal);
  await waitFor(() => harness.decodes.length === 1, "decode should start after fetch and blob");
  harness.decodes[0].resolve();
  const decoded = await pending;

  assert.equal(harness.fetchCalls.length, 1);
  assert.equal(harness.fetchCalls[0].init.signal, controller.signal);
  assert.equal(decoded.displayUrl, "blob:test-1");
  assert.deepEqual(harness.revokedUrls, []);
  decoded.dispose();
  decoded.dispose();
  assert.deepEqual(harness.revokedUrls, ["blob:test-1"]);
});

test("production loader rejects non-OK fetches without creating or revoking an object URL", async () => {
  const { createSelectedWorkImageLoader } = await importSourceModule("exhibits/selectedWorkMedia.ts");
  const harness = createLoaderHarness({ responseOk: false });
  const loader = createSelectedWorkImageLoader(harness.environment);
  await assert.rejects(loader("https://space.test/fail.jpg", new AbortController().signal), /503/);
  assert.deepEqual(harness.createdUrls, []);
  assert.deepEqual(harness.revokedUrls, []);
});

test("production loader aborts promptly while fetch is still pending", async () => {
  const { createSelectedWorkImageLoader } = await importSourceModule("exhibits/selectedWorkMedia.ts");
  const fetchTask = deferred();
  const createdUrls = [];
  const controller = new AbortController();
  const loader = createSelectedWorkImageLoader({
    baseUrl: "https://space.test/",
    fetchImage: () => fetchTask.promise,
    createImage: () => assert.fail("Image must not be created after fetch abort"),
    createObjectUrl: (blob) => {
      createdUrls.push(blob);
      return "blob:late";
    },
    revokeObjectUrl: () => assert.fail("No URL exists to revoke after fetch abort"),
  });
  const pending = loader("https://space.test/pending.jpg", controller.signal);
  controller.abort();
  await assert.rejects(pending, { name: "AbortError" });
  fetchTask.resolve({
    ok: true,
    status: 200,
    blob: () => Promise.resolve(new Blob(["late"])),
  });
  await Promise.resolve();
  assert.deepEqual(createdUrls, []);
});

test("production loader revokes once on decode rejection", async () => {
  const { createSelectedWorkImageLoader } = await importSourceModule("exhibits/selectedWorkMedia.ts");
  const harness = createLoaderHarness();
  const loader = createSelectedWorkImageLoader(harness.environment);
  const pending = loader("https://space.test/bad-decode.jpg", new AbortController().signal);
  await waitFor(() => harness.decodes.length === 1, "decode should start before rejection");
  harness.decodes[0].reject(new Error("decode failed"));
  await assert.rejects(pending, /decode failed/);
  assert.deepEqual(harness.revokedUrls, ["blob:test-1"]);
});

test("production loader aborts promptly during body and decode, with exact owned URL cleanup", async () => {
  const { createSelectedWorkImageLoader } = await importSourceModule("exhibits/selectedWorkMedia.ts");

  const bodyTask = deferred();
  const bodyHarness = createLoaderHarness({ bodyTask });
  const bodyController = new AbortController();
  const bodyPending = createSelectedWorkImageLoader(bodyHarness.environment)(
    "https://space.test/body.jpg",
    bodyController.signal,
  );
  await waitFor(() => bodyHarness.bodyReads.length === 1, "body read should start before abort");
  bodyController.abort();
  await assert.rejects(bodyPending, { name: "AbortError" });
  assert.deepEqual(bodyHarness.createdUrls, []);
  bodyTask.resolve(new Blob(["late"]));
  await Promise.resolve();
  assert.deepEqual(bodyHarness.revokedUrls, []);

  const decodeHarness = createLoaderHarness();
  const decodeController = new AbortController();
  const decodePending = createSelectedWorkImageLoader(decodeHarness.environment)(
    "https://space.test/decode.jpg",
    decodeController.signal,
  );
  await waitFor(() => decodeHarness.createdUrls.length === 1, "owned URL should exist before decode abort");
  decodeController.abort();
  await assert.rejects(decodePending, { name: "AbortError" });
  assert.deepEqual(decodeHarness.revokedUrls, ["blob:test-1"]);
  decodeHarness.decodes[0].resolve();
  await Promise.resolve();
  assert.deepEqual(decodeHarness.revokedUrls, ["blob:test-1"]);
});

test("production loader owned URLs revoke once on two-work eviction and active cancel", async () => {
  const { createSelectedWorkImageLoader, createSelectedWorkMediaController } =
    await importSourceModule("exhibits/selectedWorkMedia.ts");
  const harness = createLoaderHarness();
  const loadImage = createSelectedWorkImageLoader(harness.environment);
  const controller = createSelectedWorkMediaController({
    baseUrl: "https://space.test/",
    loadImage,
  });
  const work = (id) => ({
    exhibitId: id,
    media: { imageUrls: [`/${id}.jpg`] },
  });

  const one = controller.select(work("one"), () => {});
  await waitFor(() => harness.decodes.length === 1, "work one decode should start");
  harness.decodes[0].resolve();
  await one.done;
  const two = controller.select(work("two"), () => {});
  await waitFor(() => harness.decodes.length === 2, "work two decode should start");
  harness.decodes[1].resolve();
  await two.done;
  const three = controller.select(work("three"), () => {});
  await waitFor(() => harness.decodes.length === 3, "work three decode should start");
  harness.decodes[2].resolve();
  await three.done;
  assert.deepEqual(harness.revokedUrls, ["blob:test-1"]);

  const four = controller.select(work("four"), () => {});
  await waitFor(() => harness.decodes.length === 4, "work four decode should start");
  four.cancel();
  await four.done;
  assert.deepEqual(harness.revokedUrls, ["blob:test-1", "blob:test-2", "blob:test-4"]);
});
