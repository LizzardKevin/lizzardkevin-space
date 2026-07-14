type RendererLossInfo = { message?: string; reason?: string };
type LossAwareRenderer = {
  backend?: object;
};

type LossAwareBackend = {
  isWebGPUBackend?: boolean;
  isWebGLBackend?: boolean;
  device?: { lost?: PromiseLike<RendererLossInfo> };
};

export function isIntentionalRendererLoss(info: RendererLossInfo) {
  if (info.reason?.toLowerCase() === "destroyed") return true;
  const message = info.message?.toLowerCase() ?? "";
  return (
    message.includes("disposed") ||
    message.includes("dispose called") ||
    (message.includes("destroy") && message.includes("intentional"))
  );
}

export function watchRendererDeviceLoss(
  renderer: LossAwareRenderer,
  canvas: EventTarget,
  onLost: (error: Error) => void,
) {
  let active = true;
  let reported = false;
  const report = (error: Error) => {
    if (!active || reported) return;
    reported = true;
    onLost(error);
  };
  const onWebGLContextLost = (event: Event) => {
    event.preventDefault();
    report(new Error("WebGL context lost"));
  };
  const backend = renderer.backend as LossAwareBackend | undefined;

  if (backend?.isWebGLBackend) {
    canvas.addEventListener("webglcontextlost", onWebGLContextLost);
  }
  if (backend?.isWebGPUBackend) {
    void backend.device?.lost?.then((info) => {
      if (isIntentionalRendererLoss(info)) return;
      report(new Error(info.message || "WebGPU device lost"));
    });
  }

  return () => {
    active = false;
    canvas.removeEventListener("webglcontextlost", onWebGLContextLost);
  };
}
