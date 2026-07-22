import type { SupportedLanguage } from "../i18n/resolveInitialLanguage";

/**
 * 滚动流三页的 UI chrome 文案（非正文内容）。
 * 正文一律来自 generated 数据与 content.json；这里只放界面框架文案。
 * 若未来迁入 xlsx 内容管线，整体替换本模块即可。
 */

export type ScrollPageAccent = "teal" | "orange" | "yellow";

export type ScrollPagesCopy = {
  brandMain: string;
  brandSub: string;
  backToSpace: string;
  scrollHint: string;
  indexLabel: string;
  footerNote: string;
  profile: {
    pageCode: string;
    eyebrow: string;
    linksTitle: string;
    rolesLabel: string;
    sectionsLabel: string;
    detailLabel: string;
    fillLabel: string;
    spaceUseLabel: string;
  };
  devStories: {
    pageCode: string;
    eyebrow: string;
    entriesLabel: string;
    spanLabel: string;
    builtLabel: string;
    troubleLabel: string;
    nextLabel: string;
  };
  work: {
    pageCode: string;
    eyebrow: string;
    overviewLabel: string;
    storyLabel: string;
    galleryLabel: string;
    specLabel: string;
    prevWork: string;
    nextWork: string;
    modelLoading: string;
    modelFailed: string;
    dragHint: string;
    typeLabels: Record<string, string>;
  };
};

const zh: ScrollPagesCopy = {
  brandMain: "LIZZARDKEVIN",
  brandSub: "SPACE",
  backToSpace: "返回 SPACE",
  scrollHint: "SCROLL",
  indexLabel: "索引",
  footerNote: "个人档案 · 持续更新",
  profile: {
    pageCode: "ARCHIVE / 01",
    eyebrow: "个人档案 PERSONAL ARCHIVE",
    linksTitle: "链接 LINKS",
    rolesLabel: "身份",
    sectionsLabel: "档案分节",
    detailLabel: "细节 DETAILS",
    fillLabel: "归档笔记 ARCHIVE NOTES",
    spaceUseLabel: "SPACE 中的形态 IN SPACE",
  },
  devStories: {
    pageCode: "ARCHIVE / 02",
    eyebrow: "开发日志 DEV STORIES",
    entriesLabel: "篇目",
    spanLabel: "时间跨度",
    builtLabel: "建成 BUILT",
    troubleLabel: "问题 TROUBLE",
    nextLabel: "下一步 NEXT",
  },
  work: {
    pageCode: "ARCHIVE / 03",
    eyebrow: "作品详情 EXHIBIT",
    overviewLabel: "概览 OVERVIEW",
    storyLabel: "故事 STORY",
    galleryLabel: "图集 GALLERY",
    specLabel: "规格 SPEC",
    prevWork: "上一件",
    nextWork: "下一件",
    modelLoading: "模型加载中",
    modelFailed: "模型加载失败，显示静态图像",
    dragHint: "拖拽 DRAG",
    typeLabels: {
      model3d: "三维模型 3D MODEL",
      image: "图像 IMAGE",
      audio: "音频 AUDIO",
      video: "视频 VIDEO",
    },
  },
};

const en: ScrollPagesCopy = {
  brandMain: "LIZZARDKEVIN",
  brandSub: "SPACE",
  backToSpace: "Back to SPACE",
  scrollHint: "SCROLL",
  indexLabel: "INDEX",
  footerNote: "Personal archive · always in progress",
  profile: {
    pageCode: "ARCHIVE / 01",
    eyebrow: "PERSONAL ARCHIVE",
    linksTitle: "LINKS",
    rolesLabel: "ROLES",
    sectionsLabel: "SECTIONS",
    detailLabel: "DETAILS",
    fillLabel: "ARCHIVE NOTES",
    spaceUseLabel: "IN SPACE",
  },
  devStories: {
    pageCode: "ARCHIVE / 02",
    eyebrow: "DEV STORIES",
    entriesLabel: "ENTRIES",
    spanLabel: "SPAN",
    builtLabel: "BUILT",
    troubleLabel: "TROUBLE",
    nextLabel: "NEXT",
  },
  work: {
    pageCode: "ARCHIVE / 03",
    eyebrow: "EXHIBIT",
    overviewLabel: "OVERVIEW",
    storyLabel: "STORY",
    galleryLabel: "GALLERY",
    specLabel: "SPEC",
    prevWork: "PREV",
    nextWork: "NEXT",
    modelLoading: "Loading model",
    modelFailed: "Model unavailable — showing still image",
    dragHint: "DRAG",
    typeLabels: {
      model3d: "3D MODEL",
      image: "IMAGE",
      audio: "AUDIO",
      video: "VIDEO",
    },
  },
};

const copyByLanguage: Record<SupportedLanguage, ScrollPagesCopy> = { zh, en };

export function getScrollPagesCopy(language: SupportedLanguage): ScrollPagesCopy {
  return copyByLanguage[language] ?? en;
}
