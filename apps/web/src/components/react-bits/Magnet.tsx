import React, {
  useState,
  useEffect,
  useRef,
  type ReactNode,
  type HTMLAttributes,
} from "react";

/** 舟味约束：磁吸位移上限（px），避免按钮飞出结构。 */
const MAX_OFFSET_PX = 6;

interface MagnetProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padding?: number;
  disabled?: boolean;
  magnetStrength?: number;
  activeTransition?: string;
  inactiveTransition?: string;
  wrapperClassName?: string;
  innerClassName?: string;
}

/**
 * React Bits Magnet（已收紧）：位移硬夹到 ±6px；reduced-motion 由调用方 disabled。
 */
const Magnet: React.FC<MagnetProps> = ({
  children,
  padding = 48,
  disabled = false,
  magnetStrength = 16,
  activeTransition = "transform 0.22s ease-out",
  inactiveTransition = "transform 0.35s ease-in-out",
  wrapperClassName = "",
  innerClassName = "",
  style,
  ...props
}) => {
  const [isActive, setIsActive] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const magnetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (disabled) return undefined;

    const handleMouseMove = (e: MouseEvent) => {
      if (!magnetRef.current) return;

      const { left, top, width, height } = magnetRef.current.getBoundingClientRect();
      const centerX = left + width / 2;
      const centerY = top + height / 2;

      const distX = Math.abs(centerX - e.clientX);
      const distY = Math.abs(centerY - e.clientY);

      if (distX < width / 2 + padding && distY < height / 2 + padding) {
        setIsActive(true);
        const offsetX = Math.max(
          -MAX_OFFSET_PX,
          Math.min(MAX_OFFSET_PX, (e.clientX - centerX) / magnetStrength),
        );
        const offsetY = Math.max(
          -MAX_OFFSET_PX,
          Math.min(MAX_OFFSET_PX, (e.clientY - centerY) / magnetStrength),
        );
        setPosition({ x: offsetX, y: offsetY });
      } else {
        setIsActive(false);
        setPosition({ x: 0, y: 0 });
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [padding, disabled, magnetStrength]);

  const transitionStyle = isActive && !disabled ? activeTransition : inactiveTransition;
  const x = disabled ? 0 : position.x;
  const y = disabled ? 0 : position.y;

  return (
    <div
      ref={magnetRef}
      className={wrapperClassName}
      style={{ display: "inline-block", ...style }}
      {...props}
    >
      <div
        className={innerClassName}
        style={{
          transform: `translate3d(${x}px, ${y}px, 0)`,
          transition: transitionStyle,
          willChange: "transform",
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default Magnet;
