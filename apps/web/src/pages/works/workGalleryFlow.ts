/**
 * WorkDetail 图集自动流(marquee)纯逻辑:
 * 轨道内容按周期复制,scrollLeft 在 [0, period) 内环绕即无缝循环;
 * 复制份数保证环绕落点始终是合法滚动位(maxScroll >= period)。
 * 全部为纯函数,单测直接断言;DOM 测量在 useGalleryAutoFlow 内。
 */

/** 自动流速度:线性恒定,~24-40px/s 取中档 */
export const WORK_GALLERY_FLOW_SPEED_PX_S = 32;

/**
 * 环绕 scrollLeft 到 [0, period):同一周期相位处内容完全相同,环绕在视觉上无缝。
 * period <= 0(未测量/自动流关闭)时原样返回,退化为普通硬端滚动。
 */
export function wrapGalleryScrollLeft(scrollLeft: number, period: number): number {
  if (period <= 0) return scrollLeft;
  let wrapped = scrollLeft % period;
  if (wrapped < 0) wrapped += period;
  return wrapped;
}

/**
 * 复制份数:环绕不变量要求 maxScroll >= period,即 (copies-1) * setWidth >= clientWidth。
 * 常规图集(项宽 min(68vw, 880px))两份即够;超宽视口 + 极少图时按需要三份以上。
 */
export function resolveGalleryCopyCount(clientWidth: number, setWidth: number): number {
  if (setWidth <= 0) return 2;
  return Math.max(2, Math.ceil(clientWidth / setWidth) + 1);
}
