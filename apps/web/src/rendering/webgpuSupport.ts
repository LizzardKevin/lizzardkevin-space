export const WEBGPU_UNSUPPORTED_MESSAGE =
  "您的浏览器不支持 WebGPU。请使用 Chrome / Edge 113+、Safari 26+ 或 Firefox 141+（Windows）的最新版本。";

export async function isWebGPUSupported(): Promise<boolean> {
  if (typeof navigator === "undefined" || !("gpu" in navigator)) return false;

  try {
    const adapter = await Promise.race([
      navigator.gpu.requestAdapter(),
      new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 8000)),
    ]);
    return adapter !== null;
  } catch {
    return false;
  }
}

export async function logWebGPUAdapterInfo(): Promise<void> {
  if (!import.meta.env.DEV || !("gpu" in navigator)) return;

  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      console.warn("[WebGPU] no adapter available");
      return;
    }
    const info = "requestAdapterInfo" in adapter
      ? await (adapter as GPUAdapter & { requestAdapterInfo: () => Promise<unknown> }).requestAdapterInfo()
      : null;
    console.info("[WebGPU] adapter", info ?? adapter);
  } catch (error) {
    console.warn("[WebGPU] adapter info unavailable", error);
  }
}
