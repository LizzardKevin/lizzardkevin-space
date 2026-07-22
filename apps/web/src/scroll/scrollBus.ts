import type Lenis from "lenis";

/**
 * 页面级 Lenis 实例总线：ScrollPageShell 注册/注销，
 * 壳层外组件（如 ArchiveHub）可安全地瞬时设置滚动位置——
 * 直接写 scrollTop 会被 Lenis 的内部状态覆盖。
 */
let lenisInstance: Lenis | null = null;

export function registerScrollBusLenis(lenis: Lenis | null) {
  lenisInstance = lenis;
}

export function scrollBusJumpTo(position: number) {
  if (lenisInstance) {
    lenisInstance.scrollTo(position, { immediate: true, force: true });
    return;
  }
  const scroller = document.querySelector<HTMLElement>(".ark-scroll");
  if (scroller) scroller.scrollTop = position;
}
