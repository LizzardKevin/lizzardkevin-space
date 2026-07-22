import { useLayoutEffect, useRef, useState, type JSX } from "react";
import gsap from "gsap";
import { prefersReducedMotion } from "./useLenisScroll";

const COLUMNS = 8;
const ROWS = 4;

/**
 * 「马赛克闪现」标题出场：8×4 = 32 块马赛克色块盖住标题，
 * 挂载后以随机顺序快速消退（0.09s/块、0.018s 交错），全部完成后卸载覆盖层。
 * reduced-motion：不渲染覆盖层，标题直接静态呈现。
 */
export function MosaicTitle({
  text,
  className,
  as: Tag = "h1",
}: {
  text: string;
  className?: string;
  as?: "h1" | "h2" | "span";
}): JSX.Element {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [overlayVisible, setOverlayVisible] = useState(
    () => !prefersReducedMotion(),
  );

  useLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper || !overlayVisible) return undefined;
    const ctx = gsap.context(() => {
      gsap.to("[data-mosaic-tile]", {
        autoAlpha: 0,
        duration: 0.09,
        ease: "none",
        stagger: { each: 0.018, from: "random" },
        onComplete: () => setOverlayVisible(false),
      });
    }, wrapper);
    return () => ctx.revert();
  }, [overlayVisible]);

  return (
    <div
      ref={wrapperRef}
      aria-busy={overlayVisible ? true : undefined}
      style={{ position: "relative", display: "inline-block" }}
    >
      <Tag className={className}>{text}</Tag>
      {overlayVisible ? (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
          }}
        >
          {Array.from({ length: COLUMNS * ROWS }, (_, index) => {
            const column = index % COLUMNS;
            const row = Math.floor(index / COLUMNS);
            return (
              <span
                key={index}
                data-mosaic-tile=""
                style={{
                  position: "absolute",
                  left: `${column * 12.5}%`,
                  top: `${row * 25}%`,
                  width: "12.5%",
                  height: "25%",
                  background: "var(--ark-bg, #1b1b1e)",
                  // 0.5px 透明描边 + padding-box 裁剪：块间留出 1px 间隙透出底色
                  backgroundClip: "padding-box",
                  border: "0.5px solid transparent",
                  boxSizing: "border-box",
                }}
              />
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
