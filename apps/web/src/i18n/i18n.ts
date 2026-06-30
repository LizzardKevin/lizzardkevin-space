import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { readInitialLanguage } from "./resolveInitialLanguage";

const resources = {
  zh: {
    translation: {
      nav: { lizzardkevin: "LizzardKevin", space: "SPACE", devStories: "DevStories" },
      space: {
        enter: "点击进入 SPACE",
        guide: "WASD 漫游 · 鼠标环顾 · 准星对准展品后点击",
        pointerLockFailed: "鼠标锁定失败；你仍可浏览文字内容，建议在 Chrome 中打开 SPACE 完整体验。",
        onboarding: {
          notice: "SPACE Gallery ver 0.1 / 目前仅开放部分区域，其余展区正在建设中",
          move: "使用WASD控制行走",
          look: "移动鼠标环顾，对准我",
          demo: "把准星对准我，然后点击",
          focusTitle: "展品会在这里展开",
          focusBody: "你将能够了解作品背后的故事",
          focusExit: "双击空白，或点击顶部 space 回到 SPACE",
          esc: "按 Esc 呼出鼠标",
          relock: "点击空白区域重新控制视角",
          done: "顺着道路前往SPACE吧",
        },
        tempBlocker: {
          notice: "后方空间仍在建设中",
        },
      },
      mobile: { underConstruction: "移动端网页正在施工中" },
    },
  },
  en: {
    translation: {
      nav: { lizzardkevin: "LizzardKevin", space: "SPACE", devStories: "DevStories" },
      space: {
        enter: "Click to enter SPACE",
        guide: "WASD to move · Mouse to look · Aim at an exhibit, then click",
        pointerLockFailed: "Pointer lock failed; text surfaces remain available. Open SPACE in Chrome for the full first-person experience.",
        onboarding: {
          notice: "SPACE Gallery ver 0.1 / Selected areas are open now. More rooms are under construction.",
          move: "Use WASD to move",
          look: "Move the mouse to look; aim at me",
          demo: "Aim at this line, then click",
          focusTitle: "Exhibits open here",
          focusBody: "You will learn the story behind each work.",
          focusExit: "Double-click blank space, or click the top space button to return to SPACE",
          esc: "Press Esc to release the mouse",
          relock: "Click an empty area to control the view again",
          done: "Follow the path to SPACE",
        },
        tempBlocker: {
          notice: "More SPACE is under construction",
        },
      },
      mobile: { underConstruction: "Mobile site is under construction" },
    },
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: readInitialLanguage(),
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;
