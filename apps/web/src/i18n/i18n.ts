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
    },
    focus: {
      rendererLoadFailed: "Focus renderer failed to load",
      mediaLoadProgress: "Images decoded {{loaded}}/{{total}}",
      mediaLoadFailed: "{{failed}} image(s) failed to load.",
      videoMetadataFailed: "Video metadata failed to load.",
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
    },
    focus: {
      rendererLoadFailed: "Focus 渲染器加载失败",
      mediaLoadProgress: "图片解码 {{loaded}}/{{total}}",
      mediaLoadFailed: "{{failed}} 张图片加载失败。",
      videoMetadataFailed: "视频信息加载失败。",
    },
  },
} as const;

export const runtimeRouteResourceAugmentation = {
  en: {
    workRequiresSpace: "Work {{id}} is available after entering SPACE.",
    enterSpace: "Enter SPACE",
    notFound: "404 — Page not found",
    notFoundTerminal: "$ route: 404 not found",
    invalidWorkReturn: "404 — return to SPACE",
  },
  zh: {
    workRequiresSpace: "进入 SPACE 后可查看作品 {{id}}。",
    enterSpace: "进入 SPACE",
    notFound: "404 — 页面不存在",
    notFoundTerminal: "$ route: 404 路径不存在",
    invalidWorkReturn: "404 — 返回 SPACE",
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
      focus: {
        ...generatedResources.en.translation.focus,
        ...runtimeResourceAugmentation.en.focus,
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
      focus: {
        ...generatedResources.zh.translation.focus,
        ...runtimeResourceAugmentation.zh.focus,
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
