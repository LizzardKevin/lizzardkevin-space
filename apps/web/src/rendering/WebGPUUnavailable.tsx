import { WEBGPU_UNSUPPORTED_MESSAGE } from "./webgpuSupport";

export function WebGPUUnavailable() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 40,
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "rgba(0,0,0,0.72)",
        backdropFilter: "blur(10px)",
        fontFamily: "system-ui",
        color: "rgba(255,255,255,0.92)",
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: 420, lineHeight: 1.6 }}>
        <div
          style={{
            fontSize: 12,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            opacity: 0.65,
            marginBottom: 12,
          }}
        >
          WebGPU Required
        </div>
        <p style={{ margin: 0, fontSize: 15 }}>{WEBGPU_UNSUPPORTED_MESSAGE}</p>
      </div>
    </div>
  );
}
