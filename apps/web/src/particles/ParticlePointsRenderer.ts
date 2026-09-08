import { MathUtils, PerspectiveCamera, Scene, Spherical } from "three";
import { Sprite, WebGPURenderer } from "three/webgpu";
import { createWebGPURenderer } from "../rendering/createWebGPURenderer.ts";
import type { RendererProfileId, RendererResolution } from "../rendering/rendererProfile.ts";
import type { ParticleCacheData } from "./particleCacheLoader.ts";
import {
  createParticlePointsMaterial,
  createParticleUniforms,
  type ParticleUniforms,
} from "./particlePointsMaterial.ts";
import { mulberry32 } from "./seededRandom.ts";
import { createAmbientPointField, AMBIENT_DEFAULTS } from "./ambientPointField.ts";
import { buildModelParticleArrays } from "./mergeParticleArrays.ts";
import { sampleProjectedDensity } from "./projectedParticleDensity.ts";
import { INTRO_DURATION_SEC } from "./introReveal.ts";
import type { PointsNodeMaterial } from "three/webgpu";
import { particleDeadline } from "./particleDeadline.ts";
import { createGroundPointField, groundFrameTransform, modelProjectionBounds, GROUND_STYLE } from "./groundPointField.ts";

const CAMERA_FOV = 45;
const FRAME_PADDING = 1.15;
const CURSOR_LERP_PER_SEC = 8;
/** 视差平滑系数(比光标增亮更慢,镜头运动更稳)。 */
const PARALLAX_LERP_PER_SEC = 3;
/** 视差收敛阈值(rad):角差小于它时跳过重写相机,静止期帧循环零矩阵重算。 */
const PARALLAX_SETTLE_EPSILON = 1e-6;
/** 基础俯仰角:约 8.5°,镜头略俯视模型中心。 */
const BASE_ELEVATION = Math.atan(0.15);
/** 静态降级点场的模型段点数与 rands 种子。 */
const FALLBACK_POINT_COUNT = 25_000;
const FALLBACK_RAND_SEED = 0x5eed03;

/**
 * 普通 canvas 上的点云渲染闭环(SpaceMinimap 先例,不经 R3F)。
 * 无自转:点云按包围盒中心(体积中心)归零后静止悬浮,微动全在 shader 内。
 * 每帧只写 uniform `.value`;缓冲初始化后永不再写。
 */
export class ParticlePointsRenderer {
  private static densityCache = new WeakMap<ParticleCacheData, ReturnType<typeof sampleProjectedDensity>>();
  /** 标定参数集中在这里;外部只改 `.value`。 */
  uniforms: ParticleUniforms = createParticleUniforms();

  private outgoing: {
    scene: Scene; camera: PerspectiveCamera; points: Sprite;
    material: PointsNodeMaterial; uniforms: ParticleUniforms;
    radius: number; distance: number;
    groundY: number; groundReferenceDistance: number;
  } | null = null;
  private preparing = false;
  private transitionSec = 0;
  reducedMotion = false;
  private settled: Array<() => void> = [];

  private renderer: WebGPURenderer | null = null;
  private resolution: RendererResolution | null = null;
  private disposed = false;
  get unavailable(): boolean { return this.disposed; }
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(CAMERA_FOV, 1, 0.1, 1000);
  private points: Sprite | null = null;
  private material: PointsNodeMaterial | null = null;
  private elapsedSec = 0;
  private readonly cursorTarget = { x: 10, y: 10 };
  /** 相机球面坐标复用对象:updateCameraPose 每帧改写它,帧循环内不做任何堆分配。 */
  private readonly cameraPoseSpherical = new Spherical(1, Math.PI / 2 - BASE_ELEVATION, 0);
  /** 入场揭示播放状态:<0 = 未在播放(默认/播完),≥0 = 已播秒数。 */
  private introElapsedSec = -1;
  private introDurationSec = INTRO_DURATION_SEC;
  /** 视差状态:平滑后的方位/俯仰角(rad),与取景视距。 */
  private parallaxAzimuth = 0;
  private parallaxElevation = BASE_ELEVATION;
  private baseDistance = 0;
  private baseRadius = 1;
  private groundY = 0;
  private groundReferenceDistance = 1;
  private _viewOffsetFactor = 0;
  /**
   * 相机位姿脏标记:取景参数(目前 viewOffsetFactor)在取景后被改写时置位,
   * update() 的视差收敛跳过逻辑必须尊重它——否则后写的参数永不生效,
   * 直到下次视差激活才突然重写位姿(WorkDetail 初始位姿闪现的根因)。
   */
  private cameraPoseDirty = false;
  /** 视差角上限(rad):方位默认 30°,俯仰 15°。 */
  parallaxMaxAzimuth = MathUtils.degToRad(30);
  parallaxMaxElevation = MathUtils.degToRad(15);
  /**
   * 视觉中心水平偏移(占包围球半径的比例):>0 时点云在画面中向右移,
   * 给左侧标题栏让位(WorkDetail 用);默认 0 = 居中(标定页)。
   * setter:值变化即置位姿脏标记,已取景(baseDistance>0)时立即重写相机;
   * 未取景时由 setParticleData 的取景重写带走新值。两条路径都不会留下旧位姿。
   */
  get viewOffsetFactor(): number {
    return this._viewOffsetFactor;
  }
  set viewOffsetFactor(value: number) {
    if (value === this._viewOffsetFactor) return;
    this._viewOffsetFactor = value;
    this.cameraPoseDirty = true;
    if (this.baseDistance > 0) this.updateCameraPose();
  }

  async init(
    canvas: HTMLCanvasElement,
    onResolved?: (resolution: RendererResolution) => void,
    requestedProfile?: RendererProfileId,
  ): Promise<RendererResolution> {
    if (this.disposed) throw new Error("Particle renderer initialization cancelled after dispose");
    let resolved: RendererResolution | null = null;
    const candidateRenderer = await createWebGPURenderer({
      canvas,
      requestedProfile,
      alpha: true,
      onResolved: (resolution) => {
        resolved = resolution;
      },
    });
    if (this.disposed) {
      candidateRenderer.dispose();
      throw new Error("Particle renderer initialization cancelled after dispose");
    }
    if (!resolved) {
      candidateRenderer.dispose();
      throw new Error("Particle renderer initialization did not resolve a backend");
    }
    this.renderer = candidateRenderer;
    this.resolution = resolved;
    onResolved?.(resolved);
    return resolved;
  }

  /**
   * 构建 instanced Sprite 点云并按 bounds 取景。
   * 位置一次性平移到包围盒中心(体积中心)为原点,相机看向原点;
   * 只在数据到达时调用一次,此后不再触碰任何缓冲。
   */
  setParticleData(data: ParticleCacheData): void {
    if (this.points) {
      this.scene.remove(this.points);
      this.points.geometry.dispose();
      this.material?.dispose();
      this.points = null;
      this.material = null;
    }

    // 体积中心归零:采样数据在 GLB 世界系,中心可能远离原点。
    const min = data.boundsMin;
    const max = data.boundsMax;
    const cx = (min[0] + max[0]) / 2;
    const cy = (min[1] + max[1]) / 2;
    const cz = (min[2] + max[2]) / 2;
    const centeredPositions = new Float32Array(data.positions.length);
    for (let i = 0; i < data.positions.length; i += 3) {
      centeredPositions[i] = data.positions[i] - cx;
      centeredPositions[i + 1] = data.positions[i + 1] - cy;
      centeredPositions[i + 2] = data.positions[i + 2] - cz;
    }

    // 包围球取景,不改变源模型的几何与构图。
    // 半径 → 视距,看向原点。
    const radius = Math.max(Math.hypot(max[0] - cx, max[1] - cy, max[2] - cz), 1e-3);
    const vFov = MathUtils.degToRad(CAMERA_FOV);
    const aspect = this.camera.aspect > 0.2 ? this.camera.aspect : 16 / 9;
    const distance = this.distanceForAspect(radius, aspect);

    const sampled = ParticlePointsRenderer.densityCache.get(data) ?? sampleProjectedDensity(
      { positions: centeredPositions, normals: data.normals, rands: data.rands },
      (radius * FRAME_PADDING) / Math.tan(vFov / 2),
    );
    ParticlePointsRenderer.densityCache.set(data, sampled);
    const modelCount = sampled.pointCount;
    // 模型点的解构目标 = ambient 大范围散布(确定性,与数据一同只生成一次)。
    const ambient = createAmbientPointField(modelCount);
    this.groundY = min[1] - cy - radius * .002;
    this.groundReferenceDistance = distance;
    this.reframeGround(this.uniforms, this.groundY, distance, distance, this._viewOffsetFactor * radius);
    const ground = createGroundPointField(this.groundY, distance, this._viewOffsetFactor * radius, {
      bounds: modelProjectionBounds(sampled.positions, distance, this._viewOffsetFactor * radius),
      modelDensity: sampled.projectedDensity,
    });
    const merged = buildModelParticleArrays(
      sampled,
      modelCount,
      ambient,
      ground,
    );
    const totalCount = merged.totalCount;

    const material = createParticlePointsMaterial(this.uniforms, {
      positions: merged.positions,
      normals: merged.normals,
      rands: merged.rands,
      fades: merged.fades,
      alts: merged.alts,
      groundWeights: merged.groundWeights,
    });
    const points = new Sprite(material);
    // Three associates node attribute buffer cleanup with geometry disposal.
    // Each live layer owns a small quad clone; never dispose the shared Sprite quad.
    points.geometry = points.geometry.clone();
    points.count = totalCount;
    // 实例位置在着色器里注入,sprite 自身包围球覆盖不到整片点云。
    points.frustumCulled = false;
    this.scene.add(points);
    this.points = points;
    this.material = material;

    // 取景参数落地:视距驱动相机与深度明暗区间。
    this.baseDistance = distance;
    this.baseRadius = radius;
    this.updateCameraPose();
    this.camera.near = Math.max(distance / 100, 0.05);
    this.camera.far = distance * GROUND_STYLE.farClipFactor;
    this.camera.updateProjectionMatrix();

    // 深度明暗区间:模型近端面 ≈ 视距 - 半径,远端面 ≈ 视距 + 半径。
    this.uniforms.depthFadeNear.value = Math.max(distance - radius, 0.01);
    this.uniforms.depthFadeFar.value = distance + radius;

    // 入场高度归一化区间(局部 y):模型最低点到模型顶,
    // intro reveal 的"从下往上"波浪按它归一化;区间过窄时撑开防除零。
    const introYMin = min[1] - cy;
    this.uniforms.introYMin.value = introYMin;
    this.uniforms.introYMax.value = Math.max(max[1] - cy, introYMin + 1e-3);

    // 光标随机偏移上限:平均相邻粒子间距 ∛(体积/N) 去零头(截断到一位有效数)的 2 倍。
    const volume = Math.max((max[0] - min[0]) * (max[1] - min[1]) * (max[2] - min[2]), 1e-6);
    const spacing = Math.cbrt(volume / Math.max(modelCount, 1));
    const order = 10 ** Math.floor(Math.log10(spacing));
    this.uniforms.cursorJitterAmp.value = 2 * ((Math.floor((spacing / order) * 10) / 10) * order);

    this.uniforms.pointSizeBase.value = sampled.pointSize;

    // 新数据落地 = 组装态,重置解构进度(setFallbackField 之后再次拿到真实缓存的场景)。
    this.uniforms.morphProgress.value = 0;
  }

  whenSettled(): Promise<void> {
    if (!this.outgoing || this.disposed) return Promise.resolve();
    return new Promise(resolve => this.settled.push(resolve));
  }

  /** Read-only diagnostics used by the development host's opt-in frame trace. */
  getTransitionState() {
    return {
      outgoingOpacity: this.outgoing?.uniforms.layerOpacity.value ?? 0,
      incomingProgress: !this.outgoing && !this.preparing ? this.uniforms.introProgress.value : 0,
      preparing: this.preparing,
      points: this.points?.count ?? 0,
      morphProgress: this.uniforms.morphProgress.value,
      backend: this.resolution?.backend,
    };
  }

  /** Keep rendering the old layer while the new material compiles on either backend. */
  async prepareTransition(data: ParticleCacheData): Promise<void> {
    if (this.disposed) return;
    this.preparing = true;
    this.introElapsedSec = -1;
    this.transitionSec = 0;
    if (this.points && this.material) {
      const scene = new Scene();
      scene.add(this.points);
      this.outgoing = { scene, camera: this.camera.clone(), points: this.points, material: this.material, uniforms: this.uniforms, radius: this.baseRadius, distance: this.baseDistance, groundY: this.groundY, groundReferenceDistance: this.groundReferenceDistance };
      this.points = null; this.material = null;
      this.uniforms = createParticleUniforms();
    }
    this.setParticleData(data);
    this.uniforms.introProgress.value = 0;
    try {
      await particleDeadline(this.renderer?.compileAsync(this.scene, this.camera) ?? Promise.resolve());
    } catch (error) {
      // Retire this session before a late compiler can touch a subsequent layer.
      this.dispose();
      throw error;
    }
  }

  cancelPreparedTransition(): void {
    if (!this.preparing || this.disposed) return;
    if (this.points) {
      this.scene.remove(this.points);
      this.points.geometry.dispose();
    }
    this.material?.dispose();
    this.points = null; this.material = null;
    // An exit is irreversible: cancelled/failed incoming work must never flash
    // the old model back to full opacity. Its existing fade may finish normally.
    this.preparing = false;
    if (!this.outgoing) this.settled.splice(0).forEach(resolve => resolve());
  }

  private releaseOutgoing(): void {
    if (this.outgoing) {
      this.outgoing.scene.remove(this.outgoing.points);
      this.outgoing.points.geometry.dispose();
      this.outgoing.material.dispose();
      this.outgoing = null;
    }
    this.settled.splice(0).forEach(resolve => resolve());
  }

  private distanceForAspect(radius: number, aspect: number): number {
    const vertical = MathUtils.degToRad(CAMERA_FOV);
    const horizontal = 2 * Math.atan(Math.tan(vertical / 2) * Math.max(aspect, .2));
    // In portrait windows the intentional title offset also consumes horizontal
    // space. Include it in the fit while preserving the approved desktop frame.
    const padding = FRAME_PADDING + (aspect < 1 ? Math.abs(this._viewOffsetFactor) : 0);
    return radius * padding / Math.tan(Math.min(vertical, horizontal) / 2);
  }

  private reframeGround(uniforms: ParticleUniforms, y: number, from: number, to: number, offset: number): void {
    const frame = groundFrameTransform(y, from, to, offset);
    uniforms.groundScale.value = frame.scale;
    uniforms.groundShift.value.set(...frame.shift);
    uniforms.groundScatterScale.value = frame.scatterScale;
    uniforms.groundScatterShift.value.set(...frame.scatterShift);
  }

  /** 解构 morph 进度 0..1(clamp;只写 uniform,0=模型形态,1=ambient 散布)。 */
  setMorphProgress(value: number): void {
    this.uniforms.morphProgress.value = MathUtils.clamp(value, 0, 1);
  }

  /** morph 完成态整体亮度系数(见材质 ambientDim)。 */
  setAmbientDim(value: number): void {
    this.uniforms.ambientDim.value = value;
  }

  /**
   * 无粒子缓存时的静态降级:纯 ambient 散布。
   * 构造 positions=ambient 的伪数据走正常 setParticleData 路径
   * 经过统一采样后生成确定性 ambient 目标,
   * 然后直接把 morphProgress 置 1,呈现解构完成态。
   */
  setFallbackField(pointCount: number = FALLBACK_POINT_COUNT): void {
    const ambient = createAmbientPointField(pointCount);
    const rand = mulberry32(FALLBACK_RAND_SEED);
    const normals = new Float32Array(pointCount * 3);
    const rands = new Float32Array(pointCount);
    for (let i = 0; i < pointCount; i += 1) {
      normals[i * 3 + 1] = 1; // 朝上,lambert 取中档亮度。
      rands[i] = rand();
    }
    this.setParticleData({
      pointCount,
      boundsMin: [-AMBIENT_DEFAULTS.extentXz, AMBIENT_DEFAULTS.yMin, -AMBIENT_DEFAULTS.extentXz],
      boundsMax: [AMBIENT_DEFAULTS.extentXz, AMBIENT_DEFAULTS.yMax, AMBIENT_DEFAULTS.extentXz],
      positions: ambient.positions,
      normals,
      rands,
    });
    this.uniforms.morphProgress.value = 1;
  }

  /** 每帧推进:time 累加、光标平滑、视差镜头、入场揭示,然后渲染一帧。dt 单位秒。 */
  update(dt: number): void {
    this.elapsedSec += dt;
    this.uniforms.time.value = this.elapsedSec;

    const cursor = this.uniforms.cursorNdc.value;
    const lerp = Math.min(dt * CURSOR_LERP_PER_SEC, 1);
    cursor.x += (this.cursorTarget.x - cursor.x) * lerp;
    cursor.y += (this.cursorTarget.y - cursor.y) * lerp;

    // 视差:光标偏离画面中心 → 镜头绕模型中心球面转动,方位 ≤30°、俯仰 ≤15°。
    if (this.baseDistance > 0) {
      const px = MathUtils.clamp(this.cursorTarget.x, -1, 1);
      const py = MathUtils.clamp(this.cursorTarget.y, -1, 1);
      // 光标初始在 (10,10) 视野外:此时目标角视为 0,避免开机甩镜头。
      const offscreen = Math.abs(this.cursorTarget.x) > 2 || Math.abs(this.cursorTarget.y) > 2;
      // 方位取反:光标右移 → 镜头向左绕(已定标定的视差方向)。
      const targetAzimuth = offscreen ? 0 : -px * this.parallaxMaxAzimuth;
      const targetElevation = BASE_ELEVATION + (offscreen ? 0 : py * this.parallaxMaxElevation);
      const deltaAzimuth = targetAzimuth - this.parallaxAzimuth;
      const deltaElevation = targetElevation - this.parallaxElevation;
      // 收敛后跳过重写相机:光标静止时镜头完全不动,帧循环零分配零矩阵重算。
      // 位姿脏标记(取景参数后写)优先于收敛判定,必须重写一次。
      if (
        this.cameraPoseDirty ||
        Math.abs(deltaAzimuth) > PARALLAX_SETTLE_EPSILON ||
        Math.abs(deltaElevation) > PARALLAX_SETTLE_EPSILON
      ) {
        const pLerp = Math.min(dt * PARALLAX_LERP_PER_SEC, 1);
        this.parallaxAzimuth += deltaAzimuth * pLerp;
        this.parallaxElevation += deltaElevation * pLerp;
        this.updateCameraPose();
      }
    }

    // 入场揭示:CPU 每帧只写 introProgress(线性推进),播完置 1 后不再动。
    if (this.introElapsedSec >= 0) {
      this.introElapsedSec += dt;
      const progress = this.introElapsedSec / this.introDurationSec;
      if (progress >= 1) {
        this.uniforms.introProgress.value = 1;
        this.introElapsedSec = -1;
      } else {
        this.uniforms.introProgress.value = progress;
      }
    }

    const renderer = this.renderer;
    if (!renderer) return;
    if (this.outgoing) {
      const old = this.outgoing;
      old.uniforms.time.value = this.elapsedSec;
      this.transitionSec += dt;
      const t = this.reducedMotion ? 1 : MathUtils.clamp(this.transitionSec / .8, 0, 1);
      old.uniforms.layerOpacity.value = 1 - t * t * (3 - 2 * t);
      renderer.autoClear = true;
      renderer.render(old.scene, old.camera);
      // This is the only draw for this frame, including the zero-opacity final
      // frame. The incoming layer cannot render until this layer is released.
      if (t === 1) this.releaseOutgoing();
    } else if (!this.preparing) {
      renderer.render(this.scene, this.camera);
    }
  }

  /** 按当前视差角把球面坐标写到相机;viewOffsetFactor 让点云在画面中右移,始终看向偏移后的焦点。 */
  private updateCameraPose(): void {
    const pose = this.cameraPoseSpherical;
    pose.radius = this.baseDistance;
    pose.phi = Math.PI / 2 - this.parallaxElevation;
    pose.theta = this.parallaxAzimuth;
    const offset = this._viewOffsetFactor * this.baseRadius;
    this.camera.position.setFromSpherical(pose);
    this.camera.position.x -= offset;
    this.camera.lookAt(-offset, 0, 0);
    this.cameraPoseDirty = false;
  }

  /**
   * 播放入场揭示(远→近波浪生成):introProgress 置 0,由 update() 线性推进到 1,
   * 播完自动停止写入;重复调用即重播。宿主在 setParticleData 成功后调用。
   */
  startIntro(durationSec: number = INTRO_DURATION_SEC): void {
    if (this.outgoing || this.disposed) return;
    this.preparing = false;
    this.transitionSec = 0;
    this.introDurationSec = Math.max(durationSec, 0.01);
    this.introElapsedSec = 0;
    this.uniforms.introProgress.value = 0;
  }

  /** 跳过入场揭示(测试钩子 ?wpIntro=0:无头截图需要稳定终态)。 */
  skipIntro(): void {
    this.releaseOutgoing();
    this.introElapsedSec = -1;
    this.uniforms.introProgress.value = 1;
  }

  /** 测试钩子:直接落地 introProgress 并停止播放(?wpIntro=0..1 定点抽帧,不经时间推进)。 */
  setIntroProgress(value: number): void {
    this.introElapsedSec = -1;
    this.uniforms.introProgress.value = MathUtils.clamp(value, 0, 1);
  }

  /** 光标 NDC(-1..1),y 向上。 */
  setCursor(nx: number, ny: number): void {
    this.cursorTarget.x = nx;
    this.cursorTarget.y = ny;
  }

  /** 测试钩子:把光标增亮与视差直接快照到目标位,不经过平滑(供无头截图等单帧场景)。 */
  snapCursorToTarget(): void {
    this.uniforms.cursorNdc.value.set(this.cursorTarget.x, this.cursorTarget.y);
    const px = MathUtils.clamp(this.cursorTarget.x, -1, 1);
    const py = MathUtils.clamp(this.cursorTarget.y, -1, 1);
    // 方位取反,与 update() 的视差方向一致。
    this.parallaxAzimuth = -px * this.parallaxMaxAzimuth;
    this.parallaxElevation = BASE_ELEVATION + py * this.parallaxMaxElevation;
    if (this.baseDistance > 0) this.updateCameraPose();
  }

  resize(width: number, height: number, dpr: number): void {
    if (!this.renderer) return;
    const w = Math.max(Math.round(width), 1);
    const h = Math.max(Math.round(height), 1);
    const maxDpr = this.resolution?.profile === "simplified" ? 1 : 2;
    this.renderer.setPixelRatio(Math.min(dpr || 1, maxDpr));
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    if (this.baseDistance > 0) {
      this.baseDistance = this.distanceForAspect(this.baseRadius, w / h);
      this.reframeGround(this.uniforms, this.groundY, this.groundReferenceDistance, this.baseDistance, this._viewOffsetFactor * this.baseRadius);
      this.updateCameraPose();
      this.camera.near = Math.max(this.baseDistance / 100, .05);
      this.camera.far = this.baseDistance * GROUND_STYLE.farClipFactor;
      this.uniforms.depthFadeNear.value = Math.max(this.baseDistance - this.baseRadius, .01);
      this.uniforms.depthFadeFar.value = this.baseDistance + this.baseRadius;
    }
    this.camera.updateProjectionMatrix();
    if (this.outgoing) {
      const old = this.outgoing;
      const distance = this.distanceForAspect(old.radius, w / h);
      const offset = this._viewOffsetFactor * old.radius;
      this.reframeGround(old.uniforms, old.groundY, old.groundReferenceDistance, distance, offset);
      // Scale about the old look-at target without changing its particle buffers.
      old.camera.position.x += offset;
      old.camera.position.multiplyScalar(distance / old.distance);
      old.camera.position.x -= offset;
      old.distance = distance;
      old.camera.aspect = w / h;
      old.camera.near = Math.max(distance / 100, .05);
      old.camera.far = distance * GROUND_STYLE.farClipFactor;
      old.uniforms.depthFadeNear.value = Math.max(distance - old.radius, .01);
      old.uniforms.depthFadeFar.value = distance + old.radius;
      old.camera.updateProjectionMatrix();
    }
  }

  dispose(): void {
    this.disposed = true;
    this.releaseOutgoing();
    if (this.points) {
      this.scene.remove(this.points);
      this.points.geometry.dispose();
      this.points = null;
    }
    // Only owned quad clones, layer materials and this renderer are released.
    this.material?.dispose();
    this.material = null;
    this.renderer?.dispose();
    this.renderer = null;
  }
}
