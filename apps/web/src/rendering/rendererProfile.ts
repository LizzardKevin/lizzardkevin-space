export type RendererProfileId = "full" | "simplified";
export type RendererBackend = "webgpu" | "webgl2";

export type RendererProfile = Readonly<{
  id: RendererProfileId;
  maxDpr: 1 | 2;
  postProcessing: boolean;
  shadows: boolean;
  expensiveLeaves: Readonly<{ galleryPointLights: boolean }>;
  physics: true;
  interaction: true;
  spaceScene: true;
  focus: true;
}>;

const full = Object.freeze({
  id: "full",
  maxDpr: 2,
  postProcessing: true,
  shadows: true,
  expensiveLeaves: Object.freeze({ galleryPointLights: true }),
  physics: true,
  interaction: true,
  spaceScene: true,
  focus: true,
}) satisfies RendererProfile;

const simplified = Object.freeze({
  id: "simplified",
  maxDpr: 1,
  postProcessing: false,
  shadows: false,
  expensiveLeaves: Object.freeze({ galleryPointLights: false }),
  physics: true,
  interaction: true,
  spaceScene: true,
  focus: true,
}) satisfies RendererProfile;

export const RENDERER_PROFILES = Object.freeze({ full, simplified });

export function resolveRendererDpr(profile: RendererProfile | null): 1 | [1, number] {
  return profile?.id === "full" ? [1, profile.maxDpr] : 1;
}

export type RendererProfileSwitchState<Pose, ResolvedProfile> = {
  requestedProfile: RendererProfileId;
  initialPose: Pose;
  nonce: number;
  resolvedProfile: ResolvedProfile | null;
  error: Error | null;
};

export function switchRendererProfileState<Pose, ResolvedProfile>(
  state: RendererProfileSwitchState<Pose, ResolvedProfile>,
  requestedProfile: RendererProfileId,
  latestPose: Pose,
): RendererProfileSwitchState<Pose, ResolvedProfile> {
  if (state.requestedProfile === requestedProfile) return state;
  return {
    ...state,
    requestedProfile,
    initialPose: latestPose,
    nonce: state.nonce + 1,
    resolvedProfile: null,
    error: null,
  };
}

export function resolveFocusRequestedProfile(
  mainProfile: RendererProfileId,
): RendererProfileId {
  return mainProfile === "full" ? "full" : "simplified";
}

export type RendererResolution = Readonly<{
  backend: RendererBackend;
  profile: RendererProfileId;
}>;

type BackendFlags = {
  isWebGPUBackend?: boolean;
  isWebGLBackend?: boolean;
};

export function resolveRendererBackend(backend: BackendFlags): RendererResolution {
  if (backend.isWebGPUBackend) return { backend: "webgpu", profile: "full" };
  if (backend.isWebGLBackend) return { backend: "webgl2", profile: "simplified" };
  throw new Error("Unknown renderer backend: expected WebGPU or WebGL2");
}

type ProfiledRenderer = {
  backend: object;
  init: () => Promise<unknown>;
  dispose: () => void;
};

type RendererFactory<Renderer extends ProfiledRenderer> = (forceWebGL: boolean) => Renderer;

export type WebGPUEntryPointProbeDevice = {
  createShaderModule: (descriptor: { code: string }) => unknown;
  createRenderPipeline: (descriptor: {
    layout: "auto";
    vertex: { module: unknown };
  }) => unknown;
};

const IMPLICIT_VERTEX_ENTRY_POINT_PROBE = `
  @vertex
  fn probeVertex() -> @builtin(position) vec4<f32> {
    return vec4<f32>(0.0, 0.0, 0.0, 1.0);
  }
`;

function isRequiredWebGPUEntryPointError(error: unknown) {
  return error instanceof TypeError
    && /entryPoint/i.test(error.message)
    && /required member is undefined/i.test(error.message);
}

export function supportsImplicitWebGPUVertexEntryPoint(
  device: WebGPUEntryPointProbeDevice,
) {
  const module = device.createShaderModule({ code: IMPLICIT_VERTEX_ENTRY_POINT_PROBE });
  try {
    device.createRenderPipeline({ layout: "auto", vertex: { module } });
    return true;
  } catch (error) {
    if (isRequiredWebGPUEntryPointError(error)) return false;
    throw error;
  }
}

async function initRenderer<Renderer extends ProfiledRenderer>(renderer: Renderer) {
  await renderer.init();
  return renderer;
}

function resolveInitializedRenderer<Renderer extends ProfiledRenderer>(renderer: Renderer) {
  try {
    return { renderer, resolution: resolveRendererBackend(renderer.backend as BackendFlags) };
  } catch (error) {
    renderer.dispose();
    throw error;
  }
}

export async function initializeProfiledRenderer<Renderer extends ProfiledRenderer>(
  requestedProfile: RendererProfileId,
  createRenderer: RendererFactory<Renderer>,
) {
  const renderer = createRenderer(requestedProfile === "simplified");
  return resolveInitializedRenderer(await initRenderer(renderer));
}

export async function initializeCompatibleProfiledRenderer<Renderer extends ProfiledRenderer>(
  requestedProfile: RendererProfileId,
  createRenderer: RendererFactory<Renderer>,
  isCompatible: (renderer: Renderer) => boolean,
) {
  const initialized = await initializeProfiledRenderer(requestedProfile, createRenderer);
  if (initialized.resolution.backend !== "webgpu") return initialized;

  try {
    if (isCompatible(initialized.renderer)) return initialized;
  } catch (error) {
    initialized.renderer.dispose();
    throw error;
  }

  initialized.renderer.dispose();
  return initializeProfiledRenderer("simplified", createRenderer);
}
