import { BufferAttribute, type BufferGeometry } from "three";
import {
  START_LOBBY_SHATTER_ALPHA_RAMP,
  START_LOBBY_SHATTER_FACES_PER_SHARD,
  START_LOBBY_SHATTER_OVERSHOOT,
  START_LOBBY_SHATTER_START_SCALE,
  clusterLobbyShatterFaces,
  createLobbyShatterFaces,
  type CreateLobbyShatterFacesOptions,
  type LobbyShatterClock,
  type LobbyShatterFaceCenter,
} from "./startLobbyIntroShatter";

type LobbyShatterShader = {
  uniforms: Record<string, { value: unknown }>;
  vertexShader: string;
  fragmentShader: string;
};

const gl = (value: number) => value.toFixed(4);

/**
 * 逐簇爆炸的顶点注入:每簇(START_LOBBY_SHATTER_FACES_PER_SHARD 个相邻三角形)共享
 * aFaceCenter/aScatter/aAxis/aSpin/aTiming,作为一个大碎片整体运动;
 * uShatterClock 驱动 0=聚合、1=炸开。位移、绕簇心自旋、缩放与淡入全部在 GPU 完成,
 * CPU 只每帧推进一个 uniform。法线随簇同轴旋转,保住 MeshToonMaterial 的明暗体积感。
 */
export function injectLobbyShatterMaterial(clock: LobbyShatterClock) {
  return (shader: LobbyShatterShader) => {
    shader.uniforms.uShatterClock = clock;
    shader.vertexShader = `
attribute vec3 aFaceCenter;
attribute vec3 aScatter;
attribute vec3 aAxis;
attribute float aSpin;
attribute vec2 aTiming;
uniform float uShatterClock;
varying float vShatterAlpha;
float lobbyShatterEase(float progress) {
  if (progress <= 0.0) return 0.0;
  if (progress >= 1.0) return 1.0;
  float t = clamp(progress, 0.0, 1.0) - 1.0;
  return 1.0 + ${gl(START_LOBBY_SHATTER_OVERSHOOT + 1)} * t * t * t + ${gl(START_LOBBY_SHATTER_OVERSHOOT)} * t * t;
}
${shader.vertexShader}`
      .replace(
        "#include <beginnormal_vertex>",
        `#include <beginnormal_vertex>
float shatterProgress = clamp((uShatterClock - aTiming.x) / aTiming.y, 0.0, 1.0);
float shatterAssembled = lobbyShatterEase(shatterProgress);
float shatterAmount = 1.0 - shatterAssembled;
float shatterAngle = aSpin * shatterAmount;
float shatterCos = cos(shatterAngle);
float shatterSin = sin(shatterAngle);
objectNormal = normalize(
  objectNormal * shatterCos
  + cross(aAxis, objectNormal) * shatterSin
  + aAxis * dot(aAxis, objectNormal) * (1.0 - shatterCos)
);`,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
float shatterScale = ${gl(START_LOBBY_SHATTER_START_SCALE)} + ${gl(1 - START_LOBBY_SHATTER_START_SCALE)} * shatterAssembled;
vShatterAlpha = clamp(shatterProgress / ${gl(START_LOBBY_SHATTER_ALPHA_RAMP)}, 0.0, 1.0);
vec3 shatterLocal = (transformed - aFaceCenter) * shatterScale;
transformed = aFaceCenter
  + shatterLocal * shatterCos
  + cross(aAxis, shatterLocal) * shatterSin
  + aAxis * dot(aAxis, shatterLocal) * (1.0 - shatterCos)
  + aScatter * shatterAmount;`,
      );
    shader.fragmentShader = `varying float vShatterAlpha;\n${shader.fragmentShader}`.replace(
      "#include <color_fragment>",
      `#include <color_fragment>
\tdiffuseColor.a *= vShatterAlpha;`,
    );
  };
}

/**
 * 把文字几何转为逐簇爆炸格式:非索引化(保留挤出文字的 caps/walls 分组),
 * 先按面序把连续 N 个三角形并成碎片簇,再逐三角形写入所属簇的簇心/散射/自旋/时序
 * attribute(簇内三面共享同一份,作为一个大碎片整体运动)。geometry 原地复用,
 * 仅在意外遇到索引几何时替换并释放旧几何。
 */
export function prepareLobbyShatterGeometry(
  source: BufferGeometry,
  options: CreateLobbyShatterFacesOptions = {},
): BufferGeometry {
  const geometry = source.index ? source.toNonIndexed() : source;
  if (geometry !== source) source.dispose();

  const position = geometry.getAttribute("position");
  const faceCount = Math.floor(position.count / 3);
  const centers: LobbyShatterFaceCenter[] = new Array(faceCount);
  for (let face = 0; face < faceCount; face += 1) {
    const a = face * 3;
    centers[face] = {
      x: (position.getX(a) + position.getX(a + 1) + position.getX(a + 2)) / 3,
      y: (position.getY(a) + position.getY(a + 1) + position.getY(a + 2)) / 3,
      z: (position.getZ(a) + position.getZ(a + 1) + position.getZ(a + 2)) / 3,
    };
  }

  const shards = clusterLobbyShatterFaces(centers);
  const specs = createLobbyShatterFaces(
    shards.map((shard) => shard.center),
    options,
  );
  const vertexCount = faceCount * 3;
  const faceCenters = new Float32Array(vertexCount * 3);
  const scatters = new Float32Array(vertexCount * 3);
  const axes = new Float32Array(vertexCount * 3);
  const spins = new Float32Array(vertexCount);
  const timings = new Float32Array(vertexCount * 2);

  for (let face = 0; face < faceCount; face += 1) {
    const shardIndex = Math.min(
      shards.length - 1,
      Math.floor(face / START_LOBBY_SHATTER_FACES_PER_SHARD),
    );
    const center = shards[shardIndex].center;
    const spec = specs[shardIndex];
    for (let vertex = 0; vertex < 3; vertex += 1) {
      const index = face * 3 + vertex;
      faceCenters[index * 3] = center.x;
      faceCenters[index * 3 + 1] = center.y;
      faceCenters[index * 3 + 2] = center.z;
      scatters[index * 3] = spec.scatterX;
      scatters[index * 3 + 1] = spec.scatterY;
      scatters[index * 3 + 2] = spec.scatterZ;
      axes[index * 3] = spec.axisX;
      axes[index * 3 + 1] = spec.axisY;
      axes[index * 3 + 2] = spec.axisZ;
      spins[index] = spec.spin;
      timings[index * 2] = spec.delayMs / 1000;
      timings[index * 2 + 1] = spec.durationMs / 1000;
    }
  }

  geometry.setAttribute("aFaceCenter", new BufferAttribute(faceCenters, 3));
  geometry.setAttribute("aScatter", new BufferAttribute(scatters, 3));
  geometry.setAttribute("aAxis", new BufferAttribute(axes, 3));
  geometry.setAttribute("aSpin", new BufferAttribute(spins, 1));
  geometry.setAttribute("aTiming", new BufferAttribute(timings, 2));
  return geometry;
}
