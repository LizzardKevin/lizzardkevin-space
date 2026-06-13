import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  zh: {
    translation: {
      nav: { lizzardkevin: "LizzardKevin", space: "SPACE", devStories: "DevStories" },
      space: {
        enter: "点击进入 SPACE",
        guide: "WASD 漫游 · 鼠标环顾 · 准星对准展品后点击",
        pointerLockFailed: "鼠标锁定失败；你仍可浏览文字内容，建议在 Chrome 中打开 SPACE 完整体验。",
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
      },
      mobile: { underConstruction: "Mobile site is under construction" },
    },
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: localStorage.getItem("lang") || "zh",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;
