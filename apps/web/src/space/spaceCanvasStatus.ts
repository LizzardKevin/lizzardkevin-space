import type { ReactNode } from "react";
import type { RendererProfile } from "../rendering/rendererProfile";

export type SpaceCanvasStatus = Readonly<{
  profile: RendererProfile | null;
  error: Error | null;
  loading: boolean;
}>;

type RendererStatusRuntime = Readonly<{
  attemptId: number;
  requestedProfile: "full" | "simplified";
  nonce: number;
  resolvedProfile: RendererProfile | null;
  error: Error | null;
}>;

type RendererStatusScope = Readonly<{
  attemptId: number;
  requestedProfile: "full" | "simplified";
  nonce: number;
  bootFailed: boolean;
}>;

export function resolveSpaceCanvasStatus(
  runtime: RendererStatusRuntime,
  scope: RendererStatusScope,
): SpaceCanvasStatus {
  const scopeMatches =
    runtime.attemptId === scope.attemptId &&
    runtime.requestedProfile === scope.requestedProfile &&
    runtime.nonce === scope.nonce;
  const profile = scopeMatches ? runtime.resolvedProfile : null;
  const error = scopeMatches ? runtime.error : null;
  return {
    profile,
    error,
    loading: profile === null && error === null && !scope.bootFailed,
  };
}

export function SpaceCanvasSurfaceSlot({
  status,
  renderSurfaces,
}: {
  status: SpaceCanvasStatus;
  renderSurfaces: (status: SpaceCanvasStatus) => ReactNode;
}) {
  return renderSurfaces(status);
}
