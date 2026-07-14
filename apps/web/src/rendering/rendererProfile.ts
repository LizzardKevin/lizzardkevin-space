export type RendererProfileId = "full" | "simplified";
export type RendererBackend = "webgpu" | "webgl2";

export type RendererProfile = Readonly<{
  id: RendererProfileId;
  maxDpr: 1 | 2;
  postProcessing: boolean;
  shadows: boolean;
  expensiveLeaves: Readonly<{ galleryAtmosphere: boolean }>;
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
  expensiveLeaves: Object.freeze({ galleryAtmosphere: true }),
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
  expensiveLeaves: Object.freeze({ galleryAtmosphere: false }),
  physics: true,
  interaction: true,
  spaceScene: true,
  focus: true,
}) satisfies RendererProfile;

export const RENDERER_PROFILES = Object.freeze({ full, simplified });

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

async function initRenderer<Renderer extends ProfiledRenderer>(renderer: Renderer) {
  try {
    await renderer.init();
    return renderer;
  } catch (error) {
    renderer.dispose();
    throw error;
  }
}

function resolveInitializedRenderer<Renderer extends ProfiledRenderer>(renderer: Renderer) {
  try {
    return { renderer, resolution: resolveRendererBackend(renderer.backend as BackendFlags) };
  } catch (error) {
    renderer.dispose();
    throw error;
  }
}

async function initAndResolve<Renderer extends ProfiledRenderer>(renderer: Renderer) {
  return resolveInitializedRenderer(await initRenderer(renderer));
}

export async function initializeProfiledRenderer<Renderer extends ProfiledRenderer>(
  requestedProfile: RendererProfileId,
  createRenderer: RendererFactory<Renderer>,
) {
  if (requestedProfile === "simplified") {
    return initAndResolve(createRenderer(true));
  }

  const preferredRenderer = createRenderer(false);
  try {
    await initRenderer(preferredRenderer);
  } catch {
    return initAndResolve(createRenderer(true));
  }
  return resolveInitializedRenderer(preferredRenderer);
}
