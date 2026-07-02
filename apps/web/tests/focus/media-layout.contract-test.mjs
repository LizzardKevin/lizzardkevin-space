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
    !/className=\{`focus-image-frame[\s\S]{0,900}data-cursor="interactive"/.test(overlaySource) &&
      !/className=\{`focus-image-frame[\s\S]{0,900}role="button"/.test(overlaySource) &&
      !/className=\{`focus-image-frame[\s\S]{0,900}tabIndex=\{0\}/.test(overlaySource) &&
      overlaySource.includes("focus-image-hitbox") &&
      overlaySource.includes('data-cursor="interactive"'),
    "Focus cursor hover should only enlarge over the actual image hitbox, not the outer image frame",
  );
  assert.ok(
    overlaySource.includes("focusCanvasInteractive") &&
      overlaySource.includes('data-cursor={focusCanvasInteractive ? "drag-model" : undefined}') &&
      css.includes(".focus-canvas:not(.focus-canvas--visible) canvas"),
    "Focus model canvas should expose drag cursor only while the model page is active",
  );
  assert.ok(
    overlaySource.includes("shouldHandleFocusOverlayBlankClick") &&
      overlaySource.includes("FOCUS_DOUBLE_CLICK_IGNORED_SELECTOR") &&
      overlaySource.includes(".focus-image-frame") &&
      overlaySource.includes(".focus-panel") &&
      overlaySource.includes("onClickCapture={handleFocusOverlayClick}"),
    "Focus blank double-click exit should be handled outside image, text panels, and other media controls",
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
    overlaySource.includes("centerFrameStyle") &&
      overlaySource.includes("--focus-media-half-width") &&
      overlaySource.includes("imageFrameSize.normalWidth / 2"),
    "Focus media arrows should follow the measured normal image width instead of a viewport-only fallback",
  );
  assert.ok(
    overlaySource.includes("preloadedFocusImagesRef") &&
      overlaySource.includes("preloadFocusImages(mediaItems)") &&
      overlaySource.includes("Promise.allSettled") &&
      overlaySource.includes(".ready") &&
      overlaySource.includes('loading="eager"'),
    "Focus should eagerly start and decode all images for the selected exhibit when the overlay opens",
  );
  assert.ok(
    overlaySource.includes("mediaTransitionDirection") &&
      overlaySource.includes("focus-image-frame--step-") &&
      overlaySource.includes("departingImage") &&
      overlaySource.includes("focus-image-frame--departing"),
    "Focus image page changes should render direction-aware incoming and outgoing card layers",
  );
  assert.ok(
    overlaySource.includes("mediaItems.length > 1 && !imageExpanded"),
    "Expanded Focus images should disable arrows and pagination switching",
  );
  assert.ok(
    overlaySource.includes("focus-media-dots") && overlaySource.includes("focus-media-dot--model"),
    "Focus media should render pagination dots and mark the 3D model page distinctly",
  );
  assert.ok(
    overlaySource.includes('activeMedia.kind === "video"') &&
      overlaySource.includes("focus-video--visible") &&
      overlaySource.includes('controls={activeMedia.kind === "video"}') &&
      overlaySource.includes('muted={activeMedia.kind === "video"}') &&
      overlaySource.includes('loop={activeMedia.kind === "video"}') &&
      overlaySource.includes('preload="metadata"') &&
      overlaySource.includes("focus-media-dot--video") &&
      overlaySource.includes("Show process animation"),
    "Focus media should expose MP4 animations as a visible video page with controls, metadata-only preload, and a distinct page dot",
  );
  assert.ok(
    overlaySource.indexOf('className="focus-layout__center"') <
      overlaySource.indexOf('className={`focus-video') &&
      overlaySource.indexOf('className={`focus-video') < overlaySource.indexOf("<FocusModelErrorBoundary"),
    "Focus video should live inside the center media stage instead of being positioned against the full overlay",
  );
  assert.match(
    css,
    /\.focus-image-frame\s*{[^}]*top:\s*calc\([^}]*width:\s*var\(--focus-image-rendered-width\);[^}]*height:\s*var\(--focus-image-rendered-height\);/s,
    "Focus image frame should be sized to the measured rendered image bounds",
  );
  assert.match(
    css,
    /\.focus-image-frame\s*{[^}]*border-radius:\s*14px;[^}]*box-shadow:\s*0 18px 34px rgba\(12,\s*14,\s*14,\s*0\.07\),\s*0 6px 14px rgba\(12,\s*14,\s*14,\s*0\.04\);[^}]*filter:\s*none;[^}]*overflow:\s*visible;/s,
    "Focus image frames should render the actual image as a rounded floating card with a compact underside shadow",
  );
  assert.match(
    css,
    /\.focus-image-frame--hovered\s*{[^}]*--focus-image-lift:\s*-6px;[^}]*--focus-image-scale:\s*1\.012;/s,
    "Focus images should use a stronger lift only while the cursor is truly over the image frame",
  );
  assert.ok(
    overlaySource.includes("resolveFocusImageCardMotion") &&
      overlaySource.includes('window.addEventListener("pointermove", handleWindowPointerMove') &&
      overlaySource.includes("enableImageMotionLive") &&
      overlaySource.includes('target.classList.add("focus-image-frame--live")') &&
      overlaySource.includes("focus-image-surface") &&
      overlaySource.includes("focus-image-frame--live") &&
      overlaySource.includes("imageFrameRef") &&
      overlaySource.includes("--focus-image-card-rotate-x") &&
      overlaySource.includes("--focus-image-glass-angle") &&
      overlaySource.includes("--focus-image-glass-opacity"),
    "Focus image cards should track the page pointer and switch to live motion while hovered",
  );
  assert.match(
    css,
    /\.focus-image-frame\s*{[^}]*--focus-image-motion-transition:\s*360ms cubic-bezier\(0\.16,\s*1,\s*0\.3,\s*1\);[^}]*--focus-image-card-rotate-x:\s*0deg;[^}]*--focus-image-card-rotate-y:\s*0deg;[^}]*--focus-image-card-drift-x:\s*0px;/s,
    "Focus image frame should expose centered rigid-card transform variables for the inner surface",
  );
  assert.match(
    cssRule(css, ".focus-image-surface"),
    /perspective\(1200px\)[\s\S]*rotateX\(var\(--focus-image-card-rotate-x\)\)[\s\S]*rotateY\(var\(--focus-image-card-rotate-y\)\)/,
    "Focus image surface should tilt as one rigid card in 3D space",
  );
  assert.match(
    cssRule(css, ".focus-image-frame"),
    /transform 360ms cubic-bezier\(0\.16,\s*1,\s*0\.3,\s*1\)/,
    "Focus image hover enter and leave transforms should take twice as long with nonlinear easing",
  );
  assert.doesNotMatch(
    cssRule(css, ".focus-image-frame"),
    /\b(?:width|height)\s+560ms/,
    "Normal Focus image card sizing should be instant so the rounded frame never flies in vertically toward the image",
  );
  assert.match(
    cssRule(css, ".focus-image-surface"),
    /transform var\(--focus-image-motion-transition\)/,
    "Focus image live pointer tracking should transition only the inner surface",
  );
  assert.match(
    css,
    /\.focus-image-frame--live\s*{[^}]*--focus-image-motion-transition:\s*0ms linear;/s,
    "Focus image cards should use truly realtime transform updates once the pointer is over the image",
  );
  assert.match(
    css,
    /\.focus-image-surface::after\s*{[^}]*pointer-events:\s*none;[^}]*border-radius:\s*inherit;[^}]*background:\s*conic-gradient\(\s*from calc\(var\(--focus-image-glass-angle\) - 90deg\)[^}]*mask:[^}]*linear-gradient\(#000 0 0\) content-box,[^}]*linear-gradient\(#000 0 0\);[^}]*mask-composite:\s*exclude;/s,
    "Focus image surface should draw a pointer-following glass highlight along the rounded edge ring",
  );
  assert.match(
    css,
    /\.focus-image-frame--expanded \.focus-image-surface::after\s*{[^}]*opacity:\s*0;/s,
    "Expanded images should disable the glass edge highlight",
  );
  assert.ok(
    overlaySource.includes("!imageExpanded && imageHovering") &&
      overlaySource.includes("!imageExpanded && imageMotionLive") &&
      overlaySource.includes("imageExpandedRef") &&
      overlaySource.includes("target.classList.contains(\"focus-image-frame--expanded\")") &&
      overlaySource.includes("if (imageExpandedRef.current) return;") &&
      overlaySource.includes("resetImagePointerMotion(e.currentTarget)") &&
      overlaySource.includes("disableImageMotionLive(e.currentTarget)") &&
      overlaySource.indexOf("resetImagePointerMotion(e.currentTarget)") <
        overlaySource.indexOf("setImageExpandedState(true)") &&
      overlaySource.indexOf("disableImageMotionLive(e.currentTarget)") <
        overlaySource.indexOf("setImageExpandedState(true)"),
    "Expanded Focus images should synchronously clear hover/live motion and render without floating classes",
  );
  assert.doesNotMatch(
    cssRule(css, ".focus-image"),
    /perspective|rotate[XY]|transform:/,
    "Focus image itself should not be separately transformed inside the rigid card",
  );
  assert.match(
    css,
    /\.focus-image-frame--expanded\s*{[^}]*--focus-image-scale:\s*1;[^}]*position:\s*fixed;[^}]*width:\s*var\(--focus-image-expanded-width\);[^}]*height:\s*var\(--focus-image-expanded-height\);[^}]*animation:\s*focusImageExpand 360ms cubic-bezier\(0\.16,\s*1,\s*0\.3,\s*1\)/s,
    "Expanded Focus image should use viewport-scale measured dimensions with a centered nonlinear animation",
  );
  assert.doesNotMatch(
    cssRule(css, ".focus-image-frame--expanded"),
    /\b(?:width|height)\s+560ms/,
    "Expanded Focus image sizing should be instant so first-open images do not jump from the upper viewport before centering",
  );
  assert.doesNotMatch(
    css,
    /@keyframes\s+focusImageExpand[\s\S]*scale\(1\.035\)/,
    "Expanded Focus image animation should not overshoot past final scale because it pulls the first-open image upward",
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
    /\.focus-media-dot--video::before\s*{[^}]*border-left:\s*8px solid rgba\(12,\s*14,\s*14,\s*0\.36\)/s,
    "The video page dot should use a distinct play mark",
  );
  assert.match(
    css,
    /\.focus-video--visible\s*{[^}]*width:\s*min\(980px,\s*74vw\);[^}]*height:\s*min\(552px,[^}]*pointer-events:\s*auto;[^}]*object-fit:\s*contain;/s,
    "Visible Focus videos should occupy the same center-stage media frame as model and image pages",
  );
  assert.match(
    css,
    /@keyframes\s+focusImageInFromRight[\s\S]*translate\(calc\(-50% \+ 72px\)[\s\S]*@keyframes\s+focusImageInFromLeft[\s\S]*translate\(calc\(-50% - 72px\)/s,
    "Focus image switches should define lateral card entrance animations, not subtle vertical slides",
  );
  assert.match(
    css,
    /@keyframes\s+focusImageOutToLeft[\s\S]*translate\(calc\(-50% - 72px\)[\s\S]*@keyframes\s+focusImageOutToRight[\s\S]*translate\(calc\(-50% \+ 72px\)/s,
    "Focus image switches should define lateral outgoing card animations",
  );
  assert.doesNotMatch(
    css,
    /focusImage(?:InFromRight|InFromLeft|OutToLeft|OutToRight)[\s\S]{0,220}translateY\(/,
    "Focus image card switch animations should not fly rounded frames from the top or bottom",
  );
  assert.doesNotMatch(
    css,
    /focusImageInFromRight\s+320ms[^{;]*\bboth\b/,
    "Focus image entrance animation should release transform so hover and press motion can work",
  );
  assert.match(
    css,
    /@keyframes\s+focusImageExpand[\s\S]*0%[\s\S]*opacity:\s*0\.96[\s\S]*scale\(0\.985\)[\s\S]*100%[\s\S]*opacity:\s*1[\s\S]*scale\(1\)/,
    "Focus image expand should fade and settle from the center without overshooting the card",
  );
  assert.match(
    css,
    /\.focus-layout__center\s*{[^}]*--focus-media-half-width:\s*min\(520px,\s*37vw\)/s,
    "Focus center stage should provide a stable half-width fallback for media arrows",
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
