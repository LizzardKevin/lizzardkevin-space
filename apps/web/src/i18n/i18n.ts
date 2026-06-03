import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  zh: {
    translation: {
      nav: { lizzardkevin: "LizzardKevin", space: "SPACE", devStories: "DevStories" },
      space: { enter: "点击进入 SPACE", hint: "点击画面进入 · WASD 移动 · 鼠标环顾 · ESC 释放鼠标" },
      mobile: { underConstruction: "移动端网页正在施工中" },
    },
  },
  en: {
    translation: {
      nav: { lizzardkevin: "LizzardKevin", space: "SPACE", devStories: "DevStories" },
      space: { enter: "Click to enter SPACE", hint: "Click to enter · WASD move · Mouse look · ESC unlock" },
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

