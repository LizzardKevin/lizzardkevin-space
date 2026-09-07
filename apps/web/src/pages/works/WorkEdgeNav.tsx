import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { workRoute } from "../../app/routeConfig";
import { prefersReducedMotion } from "../../scroll/useLenisScroll";
import {
  WORK_EDGE_NAV_CIPHER_CHARS,
  WORK_EDGE_NAV_DECRYPT_MS,
  WORK_EDGE_NAV_ENCRYPT_MS,
  WORK_EDGE_NAV_IDLE_TICK_MS,
  WORK_EDGE_NAV_SCRAMBLE_TICK_MS,
  createHintClock,
  pickCipherChar,
  resolveArrowGrid,
  resolveHintCellChars,
  resolveRevealCount,
  resolveRevealOrder,
  scrambleText,
  stepHintClock,
  type WorkEdgeNavHintClock,
  type WorkEdgeNavSide,
} from "./workEdgeNavScramble";
import "../../styles/work-edge-nav.css";

export type WorkEdgeNavTarget = Readonly<{
  id: string;
  /** 显示文案( hover 解密出的作品名) */
  title: string;
  /** idle 显词文案(scrollPagesCopy 的 work.prevWork/nextWork);缺省不显词 */
  hint?: string;
}>;

export type WorkEdgeNavProps = Readonly<{
  /** 上一件(左缘);为 null 时不渲染该侧 */
  prev?: WorkEdgeNavTarget | null;
  /** 下一件(右缘);为 null 时不渲染该侧 */
  next?: WorkEdgeNavTarget | null;
  /** 可选覆盖 accent 色;缺省回落到 CSS var(--ark-accent)(work 页黄) */
  accent?: string;
}>;

type WorkEdgeNavPhase = "idle" | "decrypting" | "revealed" | "encrypting";

/** 初始密文确定性取字:首帧即密文态,随后由 idle 闪烁接管。 */
function initialCipherChar(index: number) {
  const chars = WORK_EDGE_NAV_CIPHER_CHARS;
  return chars[(index * 7 + 11) % chars.length];
}

function WorkEdgeLink({ side, target }: { side: WorkEdgeNavSide; target: WorkEdgeNavTarget }) {
  const grid = useMemo(() => resolveArrowGrid(side), [side]);
  const titleChars = useMemo(() => Array.from(target.title), [target.title]);
  const revealOrder = useMemo(
    () => resolveRevealOrder(titleChars.length, side),
    [titleChars.length, side],
  );
  // 箭头渲染模型:空格位 -1,箭头格为扁平 cell 序号(与 grid.cells 同序)
  const arrowModel = useMemo(() => {
    let cellIndex = 0;
    return grid.rows.map((row) =>
      Array.from(row).map((cell) => (cell === "#" ? cellIndex++ : -1)),
    );
  }, [grid]);
  // idle 显词落位:词字符沿箭杆行居中,cell 序号 → 词字符;语言切换时重算并重排时钟
  const hintCellChars = useMemo(
    () => resolveHintCellChars(grid, target.hint ?? ""),
    [grid, target.hint],
  );

  const [phase, setPhase] = useState<WorkEdgeNavPhase>("idle");
  const linkRef = useRef<HTMLAnchorElement>(null);
  const arrowCellRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const titleCharRefs = useRef<Array<HTMLSpanElement | null>>([]);

  useEffect(() => {
    const link = linkRef.current;
    if (!link) return undefined;

    let destroyed = false;
    let rafId: number | null = null;
    let phaseValue: WorkEdgeNavPhase = "idle";
    let phaseStartAtMs = 0;
    let revealedCount = 0;
    let revealedAtPhaseStart = 0;
    let lastIdleTickAtMs = 0;
    let lastScrambleTickAtMs = 0;
    let hintClock: WorkEdgeNavHintClock = createHintClock(performance.now());

    const changePhase = (next: WorkEdgeNavPhase) => {
      phaseValue = next;
      phaseStartAtMs = performance.now();
      setPhase(next);
    };

    const restoreArrow = () => {
      arrowCellRefs.current.forEach((cell, index) => {
        if (!cell) return;
        cell.textContent = initialCipherChar(index);
        cell.style.opacity = "";
        if (cell.dataset.hint) delete cell.dataset.hint;
      });
    };

    const applyTitleFrame = (count: number) => {
      revealedCount = count;
      const revealed = new Set(revealOrder.slice(0, count));
      const frame = scrambleText(target.title, revealed);
      Array.from(frame).forEach((char, index) => {
        const span = titleCharRefs.current[index];
        if (!span) return;
        if (span.textContent !== char) span.textContent = char;
        const state = revealed.has(index) || titleChars[index] === " " ? "lit" : "cipher";
        if (span.dataset.state !== state) span.dataset.state = state;
      });
    };

    // 换展品(同路由换参数)导致标题变化时,回到密文箭头初始态,不残留上一件的揭示状态。
    phaseValue = "idle";
    setPhase("idle");
    applyTitleFrame(0);
    restoreArrow();

    const tick = (nowMs: number) => {
      rafId = null;
      if (destroyed) return;

      if (phaseValue === "idle") {
        // 常态:密文箭头低频闪烁(逐个随机替换 + 明暗抖动);reduced-motion 下完全不跑。
        // 显词:按随机节奏把"上一件/下一件"(PREV/NEXT)短暂铺在箭杆行——落位格
        // 显示词字符(accent 点亮),显词结束即刻回密文;hover 解密不受影响。
        if (!prefersReducedMotion() && nowMs - lastIdleTickAtMs >= WORK_EDGE_NAV_IDLE_TICK_MS) {
          lastIdleTickAtMs = nowMs;
          if (hintCellChars.size > 0) hintClock = stepHintClock(hintClock, nowMs);
          const hinting = hintClock.visible;
          arrowCellRefs.current.forEach((cell, index) => {
            if (!cell) return;
            const hintChar = hinting ? hintCellChars.get(index) : undefined;
            if (hintChar !== undefined) {
              if (cell.textContent !== hintChar) cell.textContent = hintChar;
              if (cell.dataset.hint !== "true") cell.dataset.hint = "true";
              cell.style.opacity = "1";
            } else {
              if (cell.dataset.hint) {
                delete cell.dataset.hint;
                cell.textContent = pickCipherChar();
              } else if (Math.random() < 0.09) {
                cell.textContent = pickCipherChar();
              }
              cell.style.opacity = (0.42 + Math.random() * 0.5).toFixed(2);
            }
          });
        }
      } else if (phaseValue === "decrypting" || phaseValue === "encrypting") {
        const decrypting = phaseValue === "decrypting";
        const total = titleChars.length;
        const elapsed = nowMs - phaseStartAtMs;
        const count = decrypting
          ? resolveRevealCount(elapsed, total, WORK_EDGE_NAV_DECRYPT_MS)
          : Math.max(
              0,
              Math.round(
                revealedAtPhaseStart *
                  (1 - Math.min(1, elapsed / WORK_EDGE_NAV_ENCRYPT_MS)),
              ),
            );
        const finished = decrypting ? count >= total : count === 0;
        if (nowMs - lastScrambleTickAtMs >= WORK_EDGE_NAV_SCRAMBLE_TICK_MS || finished) {
          lastScrambleTickAtMs = nowMs;
          applyTitleFrame(count);
        }
        if (finished) {
          if (decrypting) changePhase("revealed");
          else {
            changePhase("idle");
            restoreArrow();
            // hover 往返后重排显词时钟,避免刚回密文态立刻显词
            hintClock = createHintClock(nowMs);
          }
        }
      }

      // idle 且 reduced-motion 时停 rAF;hover 解密仍由 ensureLoop 拉起
      if (phaseValue !== "idle") {
        rafId = requestAnimationFrame(tick);
      }
    };

    const ensureLoop = () => {
      if (destroyed || rafId !== null) return;
      rafId = requestAnimationFrame(tick);
    };

    const onEnter = () => {
      if (phaseValue === "decrypting" || phaseValue === "revealed") return;
      changePhase("decrypting");
      // 从当前已揭示数量续播,避免反复进出 hover 时文本跳变
      phaseStartAtMs -=
        (revealedCount / Math.max(1, titleChars.length)) * WORK_EDGE_NAV_DECRYPT_MS;
      ensureLoop();
    };
    const onLeave = () => {
      if (phaseValue === "idle" || phaseValue === "encrypting") return;
      revealedAtPhaseStart = revealedCount;
      changePhase("encrypting");
      ensureLoop();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        if (rafId !== null) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
      } else {
        lastIdleTickAtMs = 0;
        lastScrambleTickAtMs = 0;
        ensureLoop();
      }
    };

    link.addEventListener("pointerenter", onEnter);
    link.addEventListener("pointerleave", onLeave);
    link.addEventListener("focus", onEnter);
    link.addEventListener("blur", onLeave);
    document.addEventListener("visibilitychange", onVisibilityChange);
    rafId = requestAnimationFrame(tick);

    return () => {
      destroyed = true;
      if (rafId !== null) cancelAnimationFrame(rafId);
      link.removeEventListener("pointerenter", onEnter);
      link.removeEventListener("pointerleave", onLeave);
      link.removeEventListener("focus", onEnter);
      link.removeEventListener("blur", onLeave);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [titleChars, revealOrder, target.title, hintCellChars]);

  return (
    <Link
      ref={linkRef}
      to={workRoute(target.id)}
      className={`work-edge-nav__edge work-edge-nav__edge--${side}`}
      data-phase={phase}
      aria-label={`${target.hint}: ${target.title}`}
    >
      <span className="work-edge-nav__hint">{side === "left" ? "← " : ""}{target.hint}{side === "right" ? " →" : ""}</span>
      <span className="work-edge-nav__title" aria-hidden="true">
        {titleChars.map((char, index) => (
          <span
            key={index}
            className="work-edge-nav__char"
            data-state="cipher"
            ref={(element) => {
              titleCharRefs.current[index] = element;
            }}
          >
            {char === " " ? " " : initialCipherChar(index)}
          </span>
        ))}
      </span>
      <span className="work-edge-nav__arrow" aria-hidden="true">
        {arrowModel.map((row, rowIndex) => (
          <span key={rowIndex} className="work-edge-nav__arrowRow">
            {row.map((cellIndex, column) =>
              cellIndex < 0 ? (
                <span key={column}> </span>
              ) : (
                <span
                  key={column}
                  className="work-edge-nav__arrowCell"
                  ref={(element) => {
                    arrowCellRefs.current[cellIndex] = element;
                  }}
                >
                  {initialCipherChar(cellIndex)}
                </span>
              ),
            )}
          </span>
        ))}
      </span>
    </Link>
  );
}

/**
 * 作品页边缘导航:距视口左右缘 16px、垂直居中的常驻密文箭头(无框体,字符直接浮在页面上)。
 * 常态为 ASCII 密文箭头(低频闪烁,按随机节奏短暂显词"上一件/下一件"=PREV/NEXT);
 * hover/聚焦时密文从指针侧解密成作品名。
 * 由调用方挂在 ScrollPageShell 内( fixed 定位,滚动不跟随)。
 */
export function WorkEdgeNav({ prev = null, next = null, accent }: WorkEdgeNavProps) {
  if (!prev && !next) return null;
  return (
    <nav
      className="work-edge-nav"
      aria-label="EXHIBITS"
      style={accent ? ({ "--work-edge-nav-accent": accent } as CSSProperties) : undefined}
    >
      {prev ? <WorkEdgeLink side="left" target={prev} /> : null}
      {next ? <WorkEdgeLink side="right" target={next} /> : null}
    </nav>
  );
}

export default WorkEdgeNav;
