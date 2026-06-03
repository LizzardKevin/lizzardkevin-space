import { Component, type ErrorInfo, type ReactNode } from "react";
import { WebGPUUnavailable } from "./WebGPUUnavailable";

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
};

export class WebGPUErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error("[WebGPU] render init failed", error, info.componentStack);
    }
  }

  render() {
    if (this.state.hasError) return <WebGPUUnavailable />;
    return this.props.children;
  }
}
