import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";
import { importSourceModule, publicPath } from "../helpers/projectPaths.mjs";

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
        imageUrl: "/exhibits/projector-selection/arch_treehabitat/FL-10.jpg",
      },
      {
        exhibitId: "arch_treehabitat",
        imageUrl: "/exhibits/projector-selection/arch_treehabitat/FL-12.jpg",
      },
      {
        exhibitId: "arch_treehabitat",
        imageUrl: "/exhibits/projector-selection/arch_treehabitat/FL-9.jpg",
      },
      {
        exhibitId: "arch_treehabitat",
        imageUrl: "/exhibits/projector-selection/arch_treehabitat/FL-13.jpg",
      },
      {
        exhibitId: "arch_treehabitat",
        imageUrl: "/exhibits/projector-selection/arch_treehabitat/FL-17.jpg",
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
      const imagePath = publicPath("exhibits", "projector-selection", entry.exhibitId, fileName);
      assert.equal(existsSync(imagePath), true, `${imagePath} must exist`);
    }
  }
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
    "/exhibits/projector-selection/arch_treehabitat/FL-10.jpg",
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
      "/exhibits/projector-selection/arch_treehabitat/FL-10.jpg",
      "/exhibits/projector-selection/arch_treehabitat/FL-12.jpg",
      "/exhibits/projector-selection/arch_treehabitat/FL-9.jpg",
      "/exhibits/projector-selection/arch_treehabitat/FL-13.jpg",
      "/exhibits/projector-selection/arch_treehabitat/FL-17.jpg",
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
        imageFiles: ["FL-10.jpg"],
      },
      {
        exhibitId: "photo_study",
        title: "Photo Study",
        subtitle: "selected images",
        imageFiles: ["contact-sheet.jpg"],
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
        imageUrl: "/exhibits/projector-selection/arch_treehabitat/FL-10.jpg",
        title: "Tree Habitat",
      },
      {
        exhibitId: "photo_study",
        imageUrl: "/exhibits/projector-selection/photo_study/contact-sheet.jpg",
        title: "Photo Study",
      },
    ],
  );
});
