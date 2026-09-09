import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type JSX,
} from "react";
import { prefersReducedMotion } from "./useLenisScroll";
import { usePageLanguage } from "./usePageLanguage";

/** 退场等待时长，与 scroll-lightbox.css 中 180ms 过渡一致。 */
const CLOSE_MS = 180;

/**
 * 全屏图片灯箱。
 * - data-open 驱动进场/退场过渡（opacity + 图片 scale 0.98→1），父组件按选中图条件渲染即可
 * - 点空白区域关闭（点图片本身不关闭）；Escape 关闭——capture 阶段监听并 stopPropagation，
 *   壳层另有 window 冒泡阶段的全局 ESC→SPACE 导航，灯箱打开时 ESC 只能关灯箱；
 *   根元素带 data-ark-lightbox="true"，壳层也可据此抑制自身 ESC 导航
 * - 进场聚焦 overlay，卸载时焦点还原到打开前的触发元素
 */
export function ImageLightbox({
  src,
  alt,
  onClose,
}: {
  src: string;
  alt: string;
  onClose: () => void;
}): JSX.Element {
  const [open, setOpen] = useState(false);
  const language = usePageLanguage();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const onCloseRef = useRef(onClose);
  const closingRef = useRef(false);
  const closeTimerRef = useRef(0);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // 进场：首帧 data-open=false，下一帧翻 true 以触发 CSS 过渡。
  useEffect(() => {
    const raf = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const requestClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setOpen(false);
    if (prefersReducedMotion()) {
      onCloseRef.current();
      return;
    }
    closeTimerRef.current = window.setTimeout(() => onCloseRef.current(), CLOSE_MS);
  }, []);

  // 焦点管理 + 原生 wheel 拦截。React 合成事件经根节点委托，其 stopPropagation
  // 晚于祖先 .ark-scroll 上 Lenis 的原生 wheel 监听，故在 overlay 上直接拦，
  // 防止灯箱打开时背后的页面响应滚轮。
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const trigger =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    // Isolate siblings at every ancestor level: the dialog lives inside the
    // scroll page, while SPACE and page chrome also live outside that subtree.
    const isolated: { element: HTMLElement; inert: boolean }[] = [];
    let branch: HTMLElement = root;
    while (branch.parentElement) {
      for (const sibling of branch.parentElement.children) {
        if (sibling !== branch && sibling instanceof HTMLElement) {
          isolated.push({ element: sibling, inert: sibling.inert });
          sibling.inert = true;
        }
      }
      branch = branch.parentElement;
      if (branch === document.body) break;
    }
    closeRef.current?.focus({ preventScroll: true });
    const containFocus = (event: FocusEvent) => {
      if (event.target instanceof Node && !root.contains(event.target)) {
        closeRef.current?.focus({ preventScroll: true });
      }
    };
    document.addEventListener("focusin", containFocus);
    const stopWheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();
    };
    root.addEventListener("wheel", stopWheel, { passive: false });
    return () => {
      root.removeEventListener("wheel", stopWheel);
      document.removeEventListener("focusin", containFocus);
      for (const { element, inert } of isolated) element.inert = inert;
      window.clearTimeout(closeTimerRef.current);
      if (trigger?.isConnected && !trigger.closest("[inert]")) trigger.focus({ preventScroll: true });
    };
  }, []);

  // Escape 关闭：capture 阶段 + stopPropagation，先于壳层的冒泡监听执行。
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // The visible close button is the dialog's only interactive control.
      if (event.key === "Tab") {
        event.preventDefault();
        event.stopPropagation();
        closeRef.current?.focus({ preventScroll: true });
        return;
      }
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      requestClose();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [requestClose]);

  return (
    <div
      ref={rootRef}
      className="ark-lightbox"
      data-ark-lightbox="true"
      data-open={open ? "true" : "false"}
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      tabIndex={-1}
      onClick={(event) => {
        if (event.target === event.currentTarget) requestClose();
      }}
      onWheel={(event) => event.stopPropagation()}
    >
      <button ref={closeRef} type="button" className="ark-lightbox__close" onClick={requestClose}>
        {language === "zh" ? "关闭图片" : "Close image"} ×
      </button>
      <figure className="ark-lightbox__stage">
        <img className="ark-lightbox__img" src={src} alt={alt} draggable={false} />
        <figcaption className="ark-lightbox__label">{alt}</figcaption>
      </figure>
    </div>
  );
}
