import assert from "node:assert/strict";
import test from "node:test";
import { cssRule, cssRuleInMedia, declarationValue } from "../helpers/cssAssertions.mjs";
import { readSourceFile } from "../helpers/projectPaths.mjs";

test("Focus media uses dark cursor, image drag affordance, and page dots", () => {
  const overlaySource = readSourceFile("exhibits/FocusOverlay.tsx");
  const css = readSourceFile("styles/global.css");

  assert.match(
    overlaySource,
    /className=\{`focus-overlay[\s\S]*data-cursor-tone="light"/,
    "Focus overlay should inherit the DevStories dark cursor tone on light backgrounds",
  );
  assert.ok(
    overlaySource.includes("onPointerDown={handleImagePointerDown}") &&
      overlaySource.includes("onPointerEnter={handleImagePointerEnter}") &&
      overlaySource.includes("onPointerMove={handleImagePointerMove}") &&
      overlaySource.includes("onPointerUp={handleImagePointerUp}") &&
      overlaySource.includes("focus-image-frame--expanded") &&
      overlaySource.includes("focus-image-lightbox"),
    "Focus images should support drag navigation, real-image hover, and expanded viewing",
  );
  assert.ok(
    overlaySource.includes("naturalWidth") &&
      overlaySource.includes("--focus-image-rendered-width") &&
      overlaySource.includes("--focus-image-rendered-height") &&
      overlaySource.includes("--focus-image-expanded-width") &&
      overlaySource.includes("--focus-image-expanded-height") &&
      overlaySource.includes("contentVisible && imageFrameReady"),
    "Focus images should measure each image's natural dimensions before showing rounded normal and viewport-scale frames",
  );
  assert.ok(
    overlaySource.includes("preloadedFocusImagesRef") &&
      overlaySource.includes("new Image()") &&
      overlaySource.includes('image.loading = "eager"') &&
      overlaySource.includes('loading="eager"'),
    "Focus should eagerly preload all images for the selected exhibit and keep them until the overlay exits",
  );
  assert.ok(
    overlaySource.includes("mediaTransitionDirection") &&
      overlaySource.includes("focus-image-frame--step-") &&
      overlaySource.includes("key={activeMedia.url}"),
    "Focus image page changes should remount with direction-aware animation classes",
  );
  assert.ok(
    overlaySource.includes("mediaItems.length > 1 && !imageExpanded"),
    "Expanded Focus images should disable arrows and pagination switching",
  );
  assert.ok(
    overlaySource.includes("focus-media-dots") && overlaySource.includes("focus-media-dot--model"),
    "Focus media should render pagination dots and mark the 3D model page distinctly",
  );
  assert.match(
    css,
    /\.focus-image-frame\s*{[^}]*top:\s*calc\([^}]*width:\s*var\(--focus-image-rendered-width\);[^}]*height:\s*var\(--focus-image-rendered-height\);/s,
    "Focus image frame should be sized to the measured rendered image bounds",
  );
  assert.match(
    css,
    /\.focus-image-frame\s*{[^}]*border-radius:\s*14px;[^}]*box-shadow:\s*none;[^}]*filter:\s*none;[^}]*overflow:\s*hidden;/s,
    "Focus image frames should render the actual image as a rounded rectangle without a background shadow",
  );
  assert.match(
    css,
    /\.focus-image-frame--hovered\s*{[^}]*--focus-image-lift:\s*-4px;[^}]*--focus-image-scale:\s*1\.006;/s,
    "Focus images should use a reduced, slower lift only while the cursor is truly over the image frame",
  );
  assert.doesNotMatch(cssRule(css, ".focus-image-frame--visible"), /perspective|rotate[XY]/);
  assert.match(
    css,
    /\.focus-image-frame--expanded\s*{[^}]*--focus-image-scale:\s*1;[^}]*position:\s*fixed;[^}]*width:\s*var\(--focus-image-expanded-width\);[^}]*height:\s*var\(--focus-image-expanded-height\);[^}]*animation:\s*focusImageExpand 560ms cubic-bezier\(0\.16,\s*1,\s*0\.3,\s*1\)/s,
    "Expanded Focus image should use viewport-scale measured dimensions with a nonlinear fixed-layer animation",
  );
  assert.match(
    css,
    /\.focus-image\s*{[^}]*object-fit:\s*contain;/s,
    "Focus images should preserve the original frame without cropping in expanded view",
  );
  assert.match(
    css,
    /\.focus-image-lightbox\s*{[^}]*position:\s*fixed;[^}]*background:\s*rgba\(12,\s*14,\s*14,\s*0\.42\);[^}]*backdrop-filter:\s*blur\(12px\);/s,
    "Expanded Focus image should place a dark blurred full-screen backdrop behind the image",
  );
  assert.match(
    css,
    /\.focus-media-dots\s*{[^}]*bottom:\s*76px;/s,
    "Focus media dots should sit higher above the bottom edge",
  );
  assert.match(
    css,
    /\.focus-media-dot--model::before\s*{[^}]*rotate\(45deg\)/s,
    "The 3D model page dot should use a distinct diamond mark",
  );
  assert.match(
    css,
    /@keyframes\s+focusImageInFromRight[\s\S]*@keyframes\s+focusImageInFromLeft/s,
    "Focus image switches should define left/right entrance animations",
  );
  assert.doesNotMatch(
    css,
    /focusImageInFromRight\s+320ms[^{;]*\bboth\b/,
    "Focus image entrance animation should release transform so hover and press motion can work",
  );
  assert.match(
    css,
    /@keyframes\s+focusImageExpand[\s\S]*0%[\s\S]*scale\(0\.96\)[\s\S]*64%[\s\S]*scale\(1\.035\)[\s\S]*100%[\s\S]*scale\(1\)/,
    "Focus image expand should include a restrained nonlinear overshoot while the frame grows to viewport scale",
  );
  assert.match(
    css,
    /\.focus-media-arrow\s*{[^}]*--focus-media-half-width:\s*min\(520px,\s*37vw\)/s,
    "Focus media arrows should position themselves from the image half-width",
  );
  assert.match(
    css,
    /\.focus-media-arrow:active\s*{[^}]*scale\(0\.92\)/s,
    "Focus media arrows should visibly press when clicked",
  );
  assert.match(
    css,
    /\.focus-media-arrow--left::before\s*{[^}]*rgba\(12,\s*14,\s*14,\s*0\.52\)/s,
    "Focus media arrows should stay visible on the light Focus background",
  );
});
