import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
  message: string;
};

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message || "Unknown error" };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error("[App] render failed", error, info.componentStack);
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: 24,
          background: "#050505",
          color: "rgba(255,255,255,0.9)",
          fontFamily: "system-ui",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 480, lineHeight: 1.6 }}>
          <div style={{ fontSize: 12, letterSpacing: "0.08em", opacity: 0.6, marginBottom: 12 }}>
            APP ERROR
          </div>
          <p style={{ margin: "0 0 12px" }}>页面加载失败，请刷新或升级浏览器后重试。</p>
          <p style={{ margin: 0, fontSize: 12, opacity: 0.55 }}>{this.state.message}</p>
        </div>
      </div>
    );
  }
}
