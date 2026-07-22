import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

/** 三页统一：按下 Escape 返回 SPACE（任何来源均生效，用户拍板）。
 *  lightbox 打开时跳过——此时 ESC 由 lightbox 自己消费（关闭图层）。 */
export function useEscapeToSpace() {
  const navigate = useNavigate();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat) return;
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (event.key !== "Escape") return;
      if (document.querySelector("[data-ark-lightbox]")) return;
      event.preventDefault();
      navigate("/");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navigate]);
}
