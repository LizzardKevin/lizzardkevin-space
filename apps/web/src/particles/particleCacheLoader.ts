import { publicAssetUrl } from "../platform/publicAssets.ts";

/**
 * PVB1 粒子点云缓存(小端):
 *   0-3   ASCII "PVB1"
 *   4-7   u32 formatVersion (= 1)
 *   8-11  u32 pointCount
 *   12-35 6 × f32 boundsMin.xyz / boundsMax.xyz(世界系)
 *   36..  pointCount × 7 × f32:px,py,pz,nx,ny,nz,rand
 * 离线采样器:scripts/bake-particle-visual-cache.mjs。
 */

const EXHIBIT_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

/**
 * 按展品 id 拼粒子缓存 URL(经 publicAssetUrl 套部署 base)。
 * 例:particleCacheUrlFor("arch_treehabitat") → /particles/arch_treehabitat.particles.bin。
 * exhibitId 只允许 [A-Za-z0-9_-],防止路径注入。
 */
export function particleCacheUrlFor(exhibitId: string): string {
  if (!EXHIBIT_ID_PATTERN.test(exhibitId)) {
    throw new Error(`Invalid particle cache exhibit id: "${exhibitId}"`);
  }
  return publicAssetUrl(`/particles/${exhibitId}.particles.bin`);
}

const MAGIC = "PVB1";
const FORMAT_VERSION = 1;
const HEADER_BYTES = 36;
const FLOATS_PER_POINT = 7;

export type ParticleCacheData = Readonly<{
  pointCount: number;
  boundsMin: readonly [number, number, number];
  boundsMax: readonly [number, number, number];
  /** xyz 交错,3N。 */
  positions: Float32Array;
  /** xyz 交错,3N。 */
  normals: Float32Array;
  /** 每点稳定随机数 0..1,N。 */
  rands: Float32Array;
}>;

// Only completed caches are shared. An aborted request cannot poison a retry.
const completedCaches = new Map<string, ParticleCacheData>();

export async function loadParticleCache(url: string, signal?: AbortSignal): Promise<ParticleCacheData> {
  signal?.throwIfAborted();
  const cached = completedCaches.get(url);
  if (cached) return cached;
  const timeout = AbortSignal.timeout(15_000);
  const requestSignal = signal ? AbortSignal.any([signal, timeout]) : timeout;
  let response: Response;
  try {
    response = await fetch(url, { signal: requestSignal });
  } catch (error) {
    throw new Error(`Particle cache request failed: ${url}`, { cause: error });
  }
  if (!response.ok) {
    throw new Error(`Particle cache fetch failed (HTTP ${response.status}): ${url}`);
  }

  const buffer = await response.arrayBuffer();
  if (buffer.byteLength < HEADER_BYTES) {
    throw new Error(`Particle cache too small (${buffer.byteLength}B < ${HEADER_BYTES}B header): ${url}`);
  }

  const view = new DataView(buffer);
  const magic = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
  if (magic !== MAGIC) {
    throw new Error(`Particle cache bad magic "${magic}" (expected "${MAGIC}"): ${url}`);
  }
  const formatVersion = view.getUint32(4, true);
  if (formatVersion !== FORMAT_VERSION) {
    throw new Error(`Particle cache unsupported formatVersion ${formatVersion} (expected ${FORMAT_VERSION}): ${url}`);
  }

  const pointCount = view.getUint32(8, true);
  const expectedBytes = HEADER_BYTES + pointCount * FLOATS_PER_POINT * 4;
  if (buffer.byteLength !== expectedBytes) {
    throw new Error(
      `Particle cache size mismatch (${buffer.byteLength}B != ${expectedBytes}B for ${pointCount} points): ${url}`,
    );
  }

  const boundsMin = [view.getFloat32(12, true), view.getFloat32(16, true), view.getFloat32(20, true)] as const;
  const boundsMax = [view.getFloat32(24, true), view.getFloat32(28, true), view.getFloat32(32, true)] as const;

  // 从交错 buffer 拆成三份独立数组:每份后续直接交给 instancedBufferAttribute,
  // 避免共享 ArrayBuffer 带来的视图/偏移坑。
  const interleaved = new Float32Array(buffer, HEADER_BYTES);
  const positions = new Float32Array(pointCount * 3);
  const normals = new Float32Array(pointCount * 3);
  const rands = new Float32Array(pointCount);
  for (let i = 0; i < pointCount; i += 1) {
    const src = i * FLOATS_PER_POINT;
    const dst = i * 3;
    positions[dst] = interleaved[src];
    positions[dst + 1] = interleaved[src + 1];
    positions[dst + 2] = interleaved[src + 2];
    normals[dst] = interleaved[src + 3];
    normals[dst + 1] = interleaved[src + 4];
    normals[dst + 2] = interleaved[src + 5];
    rands[i] = interleaved[src + 6];
  }

  requestSignal.throwIfAborted();
  const data = { pointCount, boundsMin, boundsMax, positions, normals, rands };
  completedCaches.set(url, data);
  if (completedCaches.size > 3) completedCaches.delete(completedCaches.keys().next().value!);
  return data;
}
