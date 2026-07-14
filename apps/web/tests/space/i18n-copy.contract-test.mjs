import assert from "node:assert/strict";
import { readSourceFile } from "../helpers/projectPaths.mjs";

const entrySplash = readSourceFile("components/entry/EntrySplash.tsx");
const topbar = readSourceFile("components/TopBar.tsx");
const desktop = readSourceFile("pages/SpaceDesktopExperience.tsx");
const player = readSourceFile("scenes/Player/PlayerController.tsx");
const overlay = readSourceFile("overlay/OverlayLayer.tsx");
const playback = readSourceFile("media/PlaybackBar.tsx");
const webgpuUnavailable = readSourceFile("rendering/WebGPUUnavailable.tsx");
const appErrorBoundary = readSourceFile("components/AppErrorBoundary.tsx");
const debugOverlay = readSourceFile("scenes/debug/SpaceMovementDebugOverlay.tsx");

for (const [sourceName, source, keys] of [
  [
    "EntrySplash",
    entrySplash,
    ["space.entry.blankClickNudge", "space.entry.largeButtonNudge"],
  ],
  [
    "TopBar",
    topbar,
    ["settings.label", "settings.language"],
  ],
  [
    "SpaceDesktopExperience",
    desktop,
    [
      "space.projector.previous",
      "space.projector.next",
      "space.exhibitLoading",
      "space.manifestMissing",
      "space.pointerLockFailed",
    ],
  ],
  [
    "PlayerController",
    player,
    ["space.jumpQuiet", "space.jumpUnlocked"],
  ],
  [
    "OverlayLayer",
    overlay,
    ["overlay.returnPrefix", "overlay.returnLabel"],
  ],
  [
    "PlaybackBar",
    playback,
    ["media.playbackProgress"],
  ],
  [
    "AppErrorBoundary",
    appErrorBoundary,
    ["error.appTitle", "error.appBody", "error.unknown"],
  ],
  [
    "SpaceMovementDebugOverlay",
    debugOverlay,
    [
      "debug.label",
      "debug.title",
      "debug.mesh",
      "debug.exhibit",
      "debug.fps",
      "debug.look",
      "debug.lookDelta",
      "debug.contact",
    ],
  ],
]) {
  for (const key of keys) {
    assert(source.includes(`"${key}"`), `${sourceName} must read ${key} from i18n`);
  }
}

for (const hardcoded of [
  "这么着急吗，倒是点击文字呀",
  "按钮都这么大了还不点吗？",
  "Q 上一张",
  "E 下一张",
  "展品信息加载中…",
  "manifest 无此展品",
  "在展厅要保持安静，不允许跳跃",
  "真拿你没办法～",
  "回到space",
  ">回到</span>",
  'aria-label="播放进度"',
  "WebGPU Required",
  "页面加载失败，请刷新或升级浏览器后重试。",
]) {
  for (const [sourceName, source] of [
    ["EntrySplash", entrySplash],
    ["TopBar", topbar],
    ["SpaceDesktopExperience", desktop],
    ["PlayerController", player],
    ["OverlayLayer", overlay],
    ["PlaybackBar", playback],
    ["WebGPUUnavailable", webgpuUnavailable],
    ["AppErrorBoundary", appErrorBoundary],
    ["SpaceMovementDebugOverlay", debugOverlay],
  ]) {
    assert(!source.includes(hardcoded), `${sourceName} must not hardcode ${hardcoded}`);
  }
}

assert(!desktop.includes("setToast(t("), "SPACE toasts must store i18n keys, not translated strings");
assert(!desktop.includes("setJumpHintMessage"), "SPACE jump hints must store i18n keys, not translated strings");
assert(
  desktop.includes("const toastMessage = toast ?") &&
    desktop.includes("t(toast.key") &&
    desktop.includes("const jumpHintMessage = jumpHintKey ? t(jumpHintKey)"),
  "SPACE transient messages must render through the current i18n language",
);
assert(
  player.includes("export type SpaceJumpNoticeKey") &&
    player.includes('onJumpNoticeRef.current("space.jumpQuiet")') &&
    player.includes('onJumpNoticeRef.current("space.jumpUnlocked")'),
  "PlayerController must emit jump notice i18n keys instead of translated copy",
);

console.log("space i18n copy contract tests passed");
