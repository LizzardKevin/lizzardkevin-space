import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import test from "node:test";
import { importSourceModule, publicPath } from "../helpers/projectPaths.mjs";

const PROJECTOR_OPTIMIZED_IMAGE_MAX_BYTES = 240 * 1024;

function readWebpSize(filePath) {
  const buffer = readFileSync(filePath);
  assert.equal(buffer.toString("ascii", 0, 4), "RIFF", `${filePath} must be a RIFF WebP`);
  assert.equal(buffer.toString("ascii", 8, 12), "WEBP", `${filePath} must be a WebP file`);

  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const type = buffer.toString("ascii", offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    const payload = offset + 8;
    if (type === "VP8X") {
      return {
        width: 1 + buffer.readUIntLE(payload + 4, 3),
        height: 1 + buffer.readUIntLE(payload + 7, 3),
      };
    }
    if (type === "VP8 ") {
      return {
        width: buffer.readUInt16LE(payload + 6) & 0x3fff,
        height: buffer.readUInt16LE(payload + 8) & 0x3fff,
      };
    }
    if (type === "VP8L") {
      const b0 = buffer[payload + 1];
      const b1 = buffer[payload + 2];
      const b2 = buffer[payload + 3];
      const b3 = buffer[payload + 4];
      return {
        width: 1 + (((b1 & 0x3f) << 8) | b0),
        height: 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6)),
      };
    }
    offset += 8 + size + (size % 2);
  }
  throw new Error(`${filePath} does not contain a readable WebP image chunk`);
}

test("buildProjectorSlides uses only the wall projection image directory", async () => {
  const { PROJECTOR_TARGET_EXHIBIT_IDS, buildProjectorSlides } = await importSourceModule(
    "scenes/projector/projectorSlides.ts",
  );

  const slides = buildProjectorSlides([
    {
      exhibitId: "arch_treehabitat",
      media: {
        imageUrls: [
          "/exhibits/arch_treehabitat/img/FL-1.jpg",
          "/exhibits/arch_treehabitat/img/FL-10.jpg",
          "",
          "/exhibits/arch_treehabitat/img/FL-12.jpg",
        ],
      },
    },
    {
      exhibitId: "demo_box",
      media: { imageUrls: ["/exhibits/demo_box/img/demo.jpg"] },
    },
  ]);

  assert.deepEqual(PROJECTOR_TARGET_EXHIBIT_IDS, ["arch_treehabitat"]);
  assert.deepEqual(
    slides.map((slide) => ({
      exhibitId: slide.exhibitId,
      imageUrl: slide.imageUrl,
    })),
    [
      {
        exhibitId: "arch_treehabitat",
        imageUrl: "/exhibits/projector-selection/arch_treehabitat/optimized/FL-10.webp",
      },
      {
        exhibitId: "arch_treehabitat",
        imageUrl: "/exhibits/projector-selection/arch_treehabitat/optimized/FL-12.webp",
      },
      {
        exhibitId: "arch_treehabitat",
        imageUrl: "/exhibits/projector-selection/arch_treehabitat/optimized/FL-9.webp",
      },
      {
        exhibitId: "arch_treehabitat",
        imageUrl: "/exhibits/projector-selection/arch_treehabitat/optimized/FL-13.webp",
      },
      {
        exhibitId: "arch_treehabitat",
        imageUrl: "/exhibits/projector-selection/arch_treehabitat/optimized/FL-17.webp",
      },
    ],
  );
});

test("default projector selection image files exist in public assets", async () => {
  const { PROJECTOR_IMAGE_DIRECTORY } = await importSourceModule(
    "scenes/projector/projectorImageDirectory.ts",
  );

  for (const entry of PROJECTOR_IMAGE_DIRECTORY) {
    for (const fileName of entry.imageFiles) {
      assert.match(fileName, /^optimized\/.+\.webp$/, "runtime projector images must be optimized WebP files");
      const imagePath = publicPath("exhibits", "projector-selection", entry.exhibitId, fileName);
      assert.equal(existsSync(imagePath), true, `${imagePath} must exist`);
      const { width, height } = readWebpSize(imagePath);
      assert.ok(
        Math.max(width, height) <= 1280,
        `${imagePath} must keep long edge at or below 1280px`,
      );
      assert.ok(
        statSync(imagePath).size <= PROJECTOR_OPTIMIZED_IMAGE_MAX_BYTES,
        `${imagePath} must stay below ${PROJECTOR_OPTIMIZED_IMAGE_MAX_BYTES} bytes`,
      );
    }
  }
});

test("projector image plane fits source aspect ratio inside the wall screen", async () => {
  const { fitProjectorImageToScreen } = await importSourceModule(
    "scenes/projector/projectorLayout.ts",
  );

  assert.deepEqual(
    fitProjectorImageToScreen({
      imageWidth: 1600,
      imageHeight: 900,
      screenWidth: 10,
      screenHeight: 4,
    }).map((value) => Number(value.toFixed(3))),
    [7.111, 4],
  );
  assert.deepEqual(
    fitProjectorImageToScreen({
      imageWidth: 1800,
      imageHeight: 600,
      screenWidth: 6,
      screenHeight: 4,
    }).map((value) => Number(value.toFixed(3))),
    [6, 2],
  );
  assert.deepEqual(
    fitProjectorImageToScreen({
      imageWidth: 900,
      imageHeight: 1350,
      screenWidth: 6,
      screenHeight: 4,
    }).map((value) => Number(value.toFixed(3))),
    [2.667, 4],
  );
});

test("nextProjectorSlideIndex avoids repeating the active slide", async () => {
  const { nextProjectorSlideIndex } = await importSourceModule(
    "scenes/projector/projectorSlides.ts",
  );

  assert.equal(nextProjectorSlideIndex(0, 1, () => 0.9), 0);
  assert.equal(nextProjectorSlideIndex(1, 4, () => 0), 0);
  assert.equal(nextProjectorSlideIndex(1, 4, () => 0.34), 2);
  assert.equal(nextProjectorSlideIndex(1, 4, () => 0.99), 3);
});

test("manual projector next picks a random non-current slide and records history", async () => {
  const { resolveProjectorNextState } = await importSourceModule(
    "scenes/projector/projectorSlides.ts",
  );

  assert.deepEqual(resolveProjectorNextState(1, 4, [0], () => 0.34), {
    activeIndex: 2,
    history: [0, 1],
  });
  assert.deepEqual(resolveProjectorNextState(0, 1, [0], () => 0.8), {
    activeIndex: 0,
    history: [0],
  });
});

test("manual projector previous returns to the viewed history", async () => {
  const { resolveProjectorPreviousState } = await importSourceModule(
    "scenes/projector/projectorSlides.ts",
  );

  assert.deepEqual(resolveProjectorPreviousState(3, 5, [0, 2]), {
    activeIndex: 2,
    history: [0],
  });
  assert.deepEqual(resolveProjectorPreviousState(3, 5, []), {
    activeIndex: 3,
    history: [],
  });
});

test("buildProjectorSlides puts the strongest projection image first when present", async () => {
  const { buildProjectorSlides } = await importSourceModule(
    "scenes/projector/projectorSlides.ts",
  );

  const slides = buildProjectorSlides([
    {
      exhibitId: "arch_treehabitat",
      media: {
        imageUrls: [
          "/exhibits/arch_treehabitat/img/FL-1.jpg",
          "/exhibits/arch_treehabitat/img/FL-10.jpg",
          "/exhibits/arch_treehabitat/img/FL-2.jpg",
        ],
      },
    },
  ]);

  assert.equal(
    slides[0]?.imageUrl,
    "/exhibits/projector-selection/arch_treehabitat/optimized/FL-10.webp",
  );
});

test("buildProjectorSlides keeps the projection pool curated when curated images exist", async () => {
  const { buildProjectorSlides } = await importSourceModule(
    "scenes/projector/projectorSlides.ts",
  );

  const slides = buildProjectorSlides([
    {
      exhibitId: "arch_treehabitat",
      media: {
        imageUrls: [
          "/exhibits/arch_treehabitat/img/FL-1.jpg",
          "/exhibits/arch_treehabitat/img/FL-9.jpg",
          "/exhibits/arch_treehabitat/img/FL-10.jpg",
          "/exhibits/arch_treehabitat/img/FL-12.jpg",
        ],
      },
    },
  ]);

  assert.deepEqual(
    slides.map((slide) => slide.imageUrl),
    [
      "/exhibits/projector-selection/arch_treehabitat/optimized/FL-10.webp",
      "/exhibits/projector-selection/arch_treehabitat/optimized/FL-12.webp",
      "/exhibits/projector-selection/arch_treehabitat/optimized/FL-9.webp",
      "/exhibits/projector-selection/arch_treehabitat/optimized/FL-13.webp",
      "/exhibits/projector-selection/arch_treehabitat/optimized/FL-17.webp",
    ],
  );
});

test("buildProjectorSlides supports directory entries for multiple exhibits", async () => {
  const { buildProjectorSlides } = await importSourceModule(
    "scenes/projector/projectorSlides.ts",
  );

  const slides = buildProjectorSlides(
    [
      {
        exhibitId: "arch_treehabitat",
        media: { imageUrls: ["/exhibits/arch_treehabitat/img/FL-10.jpg"] },
      },
      {
        exhibitId: "photo_study",
        media: {
          imageUrls: [
            "/exhibits/photo_study/img/contact-sheet.jpg",
            "/exhibits/photo_study/img/outtake.jpg",
          ],
        },
      },
    ],
    [
      {
        exhibitId: "arch_treehabitat",
        title: "Tree Habitat",
        subtitle: "selected images",
        imageFiles: ["optimized/FL-10.webp"],
      },
      {
        exhibitId: "photo_study",
        title: "Photo Study",
        subtitle: "selected images",
        imageFiles: ["optimized/contact-sheet.webp"],
      },
    ],
  );

  assert.deepEqual(
    slides.map((slide) => ({
      exhibitId: slide.exhibitId,
      imageUrl: slide.imageUrl,
      title: slide.title,
    })),
    [
      {
        exhibitId: "arch_treehabitat",
        imageUrl: "/exhibits/projector-selection/arch_treehabitat/optimized/FL-10.webp",
        title: "Tree Habitat",
      },
      {
        exhibitId: "photo_study",
        imageUrl: "/exhibits/projector-selection/photo_study/optimized/contact-sheet.webp",
        title: "Photo Study",
      },
    ],
  );
});
