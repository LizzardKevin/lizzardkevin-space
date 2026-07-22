import { useEffect } from "react";
import { useDotGridPointer } from "../components/dotGridPointer";

/**
 * 点阵背景指针光晕驱动：把目标元素注册进 dotGridPointer 的 rAF lerp 循环，
 * 由它为元素写入 --dot-grid-x / --dot-grid-y CSS 变量。
 * 光晕视觉由 .ark-page::after 的 radial-gradient 读取变量呈现，本组件不渲染任何内容。
 *
 * target 由调用方用 callback ref + useState 传入（而非 ref 对象），
 * 这样元素就绪/更换会触发重渲染，effect 依赖 target 随之重新注册。
 */
export function DotGridBackdrop({
  target,
}: {
  target: HTMLElement | null;
}): null {
  const register = useDotGridPointer();

  useEffect(() => {
    if (!target) return undefined;
    return register(target);
  }, [register, target]);

  return null;
}
