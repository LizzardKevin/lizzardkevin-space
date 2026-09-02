import { MathUtils, PerspectiveCamera, Scene, Spherical } from "three";
import { Sprite, WebGPURenderer } from "three/webgpu";
import { createWebGPURenderer } from "../rendering/createWebGPURenderer.ts";
import type { RendererResolution } from "../rendering/rendererProfile.ts";
import type { ParticleCacheData } from "./particleCacheLoader.ts";
import {
  createParticlePointsMaterial,
  createParticleUniforms,
  type ParticleUniforms,
} from "./particlePointsMaterial.ts";
import { createGroundPointField } from "./groundPointField.ts";
import type { PointsNodeMaterial } from "three/webgpu";

const CAMERA_FOV = 45;
const FRAME_PADDING = 1.15;
const CURSOR_LERP_PER_SEC = 8;
/** 视差平滑系数(比光标增亮更慢,镜头运动更稳)。 */
const PARALLAX_LERP_PER_SEC = 3;
/** 基础俯仰角:约 8.5°,镜头略俯视模型中心。 */
const BASE_ELEVATION = Math.atan(0.15);

/**
 * 普通 canvas 上的点云渲染闭环(SpaceMinimap 先例,不经 R3F)。
 * 无自转:点云按包围盒中心(体积中心)归零后静止悬浮,微动全在 shader 内。
 * 每帧只写 uniform `.value`;缓冲初始化后永不再写。
 */
export class ParticlePointsRenderer {
  /** 标定参数集中在这里;外部只改 `.value`。 */
  readonly uniforms: ParticleUniforms = createParticleUniforms();

  private renderer: WebGPURenderer | null = null;
  private resolution: RendererResolution | null = null;
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(CAMERA_FOV, 1, 0.1, 1000);
  private points: Sprite | null = null;
  private material: PointsNodeMaterial | null = null;
  private elapsedSec = 0;
  private readonly cursorTarget = { x: 10, y: 10 };
  /** 视差状态:平滑后的方位/俯仰角(rad),与取景视距。 */
  private parallaxAzimuth = 0;
  private parallaxElevation = BASE_ELEVATION;
  private baseDistance = 0;
  /** 视差角上限(rad):方位默认 30°,俯仰 15°。 */
  parallaxMaxAzimuth = MathUtils.degToRad(30);
  parallaxMaxElevation = MathUtils.degToRad(15);
  /** 程序化粒子地面开关(默认开)。 */
  groundEnabled = true;

  async init(
    canvas: HTMLCanvasElement,
    onResolved?: (resolution: RendererResolution) => void,
  ): Promise<RendererResolution> {
    let resolved: RendererResolution | null = null;
    this.renderer = await createWebGPURenderer({
      canvas,
      alpha: true,
      onResolved: (resolution) => {
        resolved = resolution;
        this.resolution = resolution;
        onResolved?.(resolution);
      },
    });
    if (!resolved) throw new Error("Particle renderer initialization did not resolve a backend");
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

    // 粒子地面:贴在模型最低点(局部坐标),与模型点合并进同一批 instanced buffer,
    // 仍是一次 draw call;地面点共享全部 shader 微动与光标效果,额外带径向渐暗。
    const ground = this.groundEnabled
      ? createGroundPointField(min[1] - cy - 0.01)
      : null;
    const modelCount = data.pointCount;
    const groundCount = ground?.pointCount ?? 0;
    const totalCount = modelCount + groundCount;
    const positions = new Float32Array(totalCount * 3);
    const normals = new Float32Array(totalCount * 3);
    const rands = new Float32Array(totalCount);
    const fades = new Float32Array(totalCount);
    positions.set(centeredPositions);
    normals.set(data.normals);
    rands.set(data.rands);
    fades.fill(1, 0, modelCount);
    if (ground) {
      positions.set(ground.positions, modelCount * 3);
      normals.set(ground.normals, modelCount * 3);
      rands.set(ground.rands, modelCount);
      fades.set(ground.fades, modelCount);
    }

    const material = createParticlePointsMaterial(this.uniforms, { positions, normals, rands, fades });
    const points = new Sprite(material);
    points.count = totalCount;
    // 实例位置在着色器里注入,sprite 自身包围球覆盖不到整片点云。
    points.frustumCulled = false;
    this.scene.add(points);
    this.points = points;
    this.material = material;

    // 包围球取景(computeStageFrame 思路):半径 → 视距,看向原点。
    const radius = Math.max(Math.hypot(max[0] - cx, max[1] - cy, max[2] - cz), 1e-3);
    const vFov = MathUtils.degToRad(CAMERA_FOV);
    const aspect = this.camera.aspect > 0.2 ? this.camera.aspect : 16 / 9;
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
    const distance = (radius * FRAME_PADDING) / Math.tan(Math.min(vFov, hFov) / 2);
    this.baseDistance = distance;
    this.updateCameraPose();
    this.camera.near = Math.max(distance / 100, 0.05);
    this.camera.far = distance * 10;
    this.camera.updateProjectionMatrix();

    // 深度明暗区间:模型近端面 ≈ 视距 - 半径,远端面 ≈ 视距 + 半径。
    this.uniforms.depthFadeNear.value = Math.max(distance - radius, 0.01);
    this.uniforms.depthFadeFar.value = distance + radius;

    // 光标随机偏移上限:平均相邻粒子间距 ∛(体积/N) 去零头(截断到一位有效数)的 2 倍。
    const volume = Math.max((max[0] - min[0]) * (max[1] - min[1]) * (max[2] - min[2]), 1e-6);
    const spacing = Math.cbrt(volume / data.pointCount);
    const order = 10 ** Math.floor(Math.log10(spacing));
    this.uniforms.cursorJitterAmp.value = 2 * ((Math.floor((spacing / order) * 10) / 10) * order);
  }

  /** 每帧推进:time 累加、光标平滑、视差镜头,然后渲染一帧。dt 单位秒。 */
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
      const pLerp = Math.min(dt * PARALLAX_LERP_PER_SEC, 1);
      this.parallaxAzimuth += (targetAzimuth - this.parallaxAzimuth) * pLerp;
      this.parallaxElevation += (targetElevation - this.parallaxElevation) * pLerp;
      this.updateCameraPose();
    }

    this.renderer?.render(this.scene, this.camera);
  }

  /** 按当前视差角把球面坐标写到相机,始终看向模型中心(原点)。 */
  private updateCameraPose(): void {
    const spherical = new Spherical(
      this.baseDistance,
      Math.PI / 2 - this.parallaxElevation,
      this.parallaxAzimuth,
    );
    this.camera.position.setFromSpherical(spherical);
    this.camera.lookAt(0, 0, 0);
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
    this.camera.updateProjectionMatrix();
  }

  dispose(): void {
    if (this.points) {
      this.scene.remove(this.points);
      this.points = null;
    }
    // sprite 几何是 three 内部共享的,不 dispose;只释放自己的材质与 renderer。
    this.material?.dispose();
    this.material = null;
    this.renderer?.dispose();
    this.renderer = null;
  }
}
