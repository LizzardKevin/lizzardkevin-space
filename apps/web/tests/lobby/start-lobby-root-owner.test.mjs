import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";

const ownerUrl = new URL("../../src/lobby/startLobbyRootOwner.ts", import.meta.url);

async function loadOwner() {
  assert.equal(existsSync(ownerUrl), true, "the StrictMode-safe lobby root owner must exist");
  return import(ownerUrl.href);
}

test("StrictMode rehearsal cleanup reuses one root when remount happens in the same turn", async () => {
  const { createStartLobbyRootOwner } = await loadOwner();
  const root = { id: "lobby-root" };
  let creates = 0;
  let releases = 0;
  const owner = createStartLobbyRootOwner(
    () => {
      creates += 1;
      return root;
    },
    () => {
      releases += 1;
    },
  );

  assert.equal(owner.mount(), root);
  owner.scheduleUnmount();
  assert.equal(owner.mount(), root);
  await Promise.resolve();

  assert.equal(creates, 1);
  assert.equal(releases, 0);
});

test("a real unmount releases the owned root once after the remount window", async () => {
  const { createStartLobbyRootOwner } = await loadOwner();
  let releases = 0;
  const owner = createStartLobbyRootOwner(
    () => ({ id: "lobby-root" }),
    () => {
      releases += 1;
    },
  );

  owner.mount();
  owner.scheduleUnmount();
  await Promise.resolve();
  owner.scheduleUnmount();
  await Promise.resolve();

  assert.equal(releases, 1);
});

test("explicit disposal cancels queued cleanup and waits for the release callback", async () => {
  const { createStartLobbyRootOwner } = await loadOwner();
  let releases = 0;
  let releaseDone;
  let disposed = false;
  const owner = createStartLobbyRootOwner(
    () => ({ id: "lobby-root" }),
    (_root, onReleased) => {
      releases += 1;
      releaseDone = onReleased;
    },
  );

  owner.mount();
  owner.scheduleUnmount();
  owner.dispose(() => {
    disposed = true;
  });
  await Promise.resolve();

  assert.equal(releases, 1);
  assert.equal(disposed, false, "disposal cannot finish before R3F reports release");
  releaseDone();
  assert.equal(disposed, true);
});

test("disposal completes synchronously only when no root was ever created", async () => {
  const { createStartLobbyRootOwner } = await loadOwner();
  let releases = 0;
  let disposed = false;
  const owner = createStartLobbyRootOwner(
    () => ({ id: "unused" }),
    () => {
      releases += 1;
    },
  );

  owner.dispose(() => {
    disposed = true;
  });

  assert.equal(disposed, true);
  assert.equal(releases, 0);
});
