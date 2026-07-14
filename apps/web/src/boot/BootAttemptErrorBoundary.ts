import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  attemptId: number;
  onError: (attemptId: number, error: Error) => void;
  children: ReactNode;
};

type State = {
  attemptId: number;
  hasError: boolean;
};

export class BootAttemptErrorBoundary extends Component<Props, State> {
  state: State = { attemptId: this.props.attemptId, hasError: false };

  static getDerivedStateFromProps(props: Props, state: State): State | null {
    if (props.attemptId === state.attemptId) return null;
    return { attemptId: props.attemptId, hasError: false };
  }

  static getDerivedStateFromError(): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env?.DEV) {
      console.error("[SPACE Boot] Canvas subtree failed", error, info.componentStack);
    }
    this.props.onError(this.props.attemptId, error);
  }

  render() {
    return this.state.hasError ? null : this.props.children;
  }
}
