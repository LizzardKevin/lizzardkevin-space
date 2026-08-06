import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { generatedResources } from "../generated/i18nResources.generated.ts";
import { readInitialLanguage } from "./resolveInitialLanguage";

export const runtimeResourceAugmentation = {
  en: {
    settings: {
      quality: "Quality",
      qualityFull: "Full",
      qualitySimplified: "Simplified",
    },
    space: {
      rendererUnavailableTitle: "Renderer unavailable",
      rendererUnavailableBody: "Unable to initialize a WebGPU or WebGL2 renderer.",
      retry: "Retry",
      exploration: {
        label: "EXPLORE",
        tasks: {
          leave_the_floor: "LEAVE THE FLOOR",
          the_long_way: "THE LONG WAY",
          whats_above: "WHAT'S ABOVE",
          whats_below: "WHAT'S BELOW",
          let_the_room_settle: "LET THE ROOM SETTLE",
          three_encounters: "THREE ENCOUNTERS",
          dont_look_away: "DON'T LOOK AWAY",
          another_angle: "ANOTHER ANGLE",
          next_scene: "NEXT SCENE",
          beyond_the_barrier: "BEYOND THE BARRIER",
        },
      },
    },
  },
  zh: {
    settings: {
      quality: "画质",
      qualityFull: "完整",
      qualitySimplified: "简化",
    },
    space: {
      rendererUnavailableTitle: "渲染器不可用",
      rendererUnavailableBody: "无法初始化 WebGPU 或 WebGL2 渲染器。",
      retry: "重试",
      exploration: {
        label: "探索",
        tasks: {
          leave_the_floor: "离开地面",
          the_long_way: "漫长路径",
          whats_above: "头顶有什么",
          whats_below: "脚下有什么",
          let_the_room_settle: "等待空间安静",
          three_encounters: "三次相遇",
          dont_look_away: "别移开视线",
          another_angle: "另一个角度",
          next_scene: "下一幕",
          beyond_the_barrier: "屏障之后",
        },
      },
    },
  },
} as const;

export const runtimeRouteResourceAugmentation = {
  en: {
    notFound: "404 — Page not found",
    notFoundTerminal: "$ route: 404 not found",
  },
  zh: {
    notFound: "404 — 页面不存在",
    notFoundTerminal: "$ route: 404 路径不存在",
  },
} as const;

export const resources = {
  en: {
    translation: {
      ...generatedResources.en.translation,
      settings: {
        ...generatedResources.en.translation.settings,
        ...runtimeResourceAugmentation.en.settings,
      },
      space: {
        ...generatedResources.en.translation.space,
        ...runtimeResourceAugmentation.en.space,
      },
      route: runtimeRouteResourceAugmentation.en,
    },
  },
  zh: {
    translation: {
      ...generatedResources.zh.translation,
      settings: {
        ...generatedResources.zh.translation.settings,
        ...runtimeResourceAugmentation.zh.settings,
      },
      space: {
        ...generatedResources.zh.translation.space,
        ...runtimeResourceAugmentation.zh.space,
      },
      route: runtimeRouteResourceAugmentation.zh,
    },
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: readInitialLanguage(),
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

function syncDocumentLanguage(language: string | undefined) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = language?.startsWith("zh") ? "zh" : "en";
}

syncDocumentLanguage(i18n.resolvedLanguage ?? i18n.language);
i18n.on("languageChanged", syncDocumentLanguage);

export default i18n;
