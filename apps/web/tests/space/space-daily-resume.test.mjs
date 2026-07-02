import assert from "node:assert/strict";
import test from "node:test";
import { importSourceModule } from "../helpers/projectPaths.mjs";

class MemoryStorage {
  constructor(initial = {}) {
    this.values = new Map(Object.entries(initial));
  }

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }

  setItem(key, value) {
    this.values.set(key, String(value));
  }

  removeItem(key) {
    this.values.delete(key);
  }
}

const samplePose = {
  position: [-0.55, 37.817, -32.2],
  yawRad: 0.24,
  pitchRad: -0.08,
};

test("space daily resume uses the visitor local date key", async () => {
  const resume = await importSourceModule("space/spaceDailyResume.ts");

  assert.equal(
    resume.formatSpaceResumeLocalDate(new Date(2026, 5, 30, 8, 12, 0)),
    "2026-06-30",
  );
});

test("space daily resume reads only valid same-day saved poses", async () => {
  const resume = await importSourceModule("space/spaceDailyResume.ts");
  const now = new Date(2026, 5, 30, 12, 0, 0);
  const storage = new MemoryStorage({
    [resume.SPACE_DAILY_RESUME_STORAGE_KEY]: JSON.stringify({
      version: 1,
      localDate: "2026-06-30",
      savedAtMs: 1782800000000,
      pose: samplePose,
    }),
  });

  assert.deepEqual(resume.readSpaceDailyResume(storage, now), samplePose);
});

test("space daily resume ignores stale, malformed, and unavailable storage", async () => {
  const resume = await importSourceModule("space/spaceDailyResume.ts");
  const now = new Date(2026, 5, 30, 12, 0, 0);

  assert.equal(
    resume.readSpaceDailyResume(
      new MemoryStorage({
        [resume.SPACE_DAILY_RESUME_STORAGE_KEY]: JSON.stringify({
          version: 1,
          localDate: "2026-06-29",
          savedAtMs: 1782700000000,
          pose: samplePose,
        }),
      }),
      now,
    ),
    null,
  );

  assert.equal(
    resume.readSpaceDailyResume(
      new MemoryStorage({ [resume.SPACE_DAILY_RESUME_STORAGE_KEY]: "{bad json" }),
      now,
    ),
    null,
  );

  assert.equal(resume.readSpaceDailyResume(null, now), null);
});

test("space daily resume ignores restricted default localStorage", async () => {
  const resume = await importSourceModule("space/spaceDailyResume.ts");
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      get localStorage() {
        throw new Error("localStorage blocked");
      },
    },
  });

  try {
    assert.equal(resume.readSpaceDailyResume(), null);
    assert.doesNotThrow(() => resume.writeSpaceDailyResume(undefined, samplePose));
    assert.doesNotThrow(() => resume.clearSpaceDailyResume());
  } finally {
    if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
    else delete globalThis.window;
  }
});

test("space daily resume writes only after onboarding completion or a restored session", async () => {
  const resume = await importSourceModule("space/spaceDailyResume.ts");

  assert.equal(
    resume.shouldSaveSpaceDailyResume({
      onboardingCompleted: false,
      restoredFromDailyResume: false,
    }),
    false,
  );
  assert.equal(
    resume.shouldSaveSpaceDailyResume({
      onboardingCompleted: true,
      restoredFromDailyResume: false,
    }),
    true,
  );
  assert.equal(
    resume.shouldSaveSpaceDailyResume({
      onboardingCompleted: false,
      restoredFromDailyResume: true,
    }),
    true,
  );
});

test("space daily resume stores pose silently in localStorage shape", async () => {
  const resume = await importSourceModule("space/spaceDailyResume.ts");
  const now = new Date(2026, 5, 30, 12, 0, 0);
  const storage = new MemoryStorage();

  resume.writeSpaceDailyResume(storage, samplePose, now);
  const raw = storage.getItem(resume.SPACE_DAILY_RESUME_STORAGE_KEY);
  const saved = JSON.parse(raw);

  assert.equal(saved.version, 1);
  assert.equal(saved.localDate, "2026-06-30");
  assert.equal(typeof saved.savedAtMs, "number");
  assert.deepEqual(saved.pose, samplePose);
});

test("space daily resume can be cleared for replaying onboarding", async () => {
  const resume = await importSourceModule("space/spaceDailyResume.ts");
  const storage = new MemoryStorage({
    [resume.SPACE_DAILY_RESUME_STORAGE_KEY]: JSON.stringify({
      version: 1,
      localDate: "2026-06-30",
      savedAtMs: 1782800000000,
      pose: samplePose,
    }),
  });

  resume.clearSpaceDailyResume(storage);

  assert.equal(storage.getItem(resume.SPACE_DAILY_RESUME_STORAGE_KEY), null);
});
