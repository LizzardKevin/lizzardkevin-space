import { Color, InstancedBufferAttribute, Vector2 } from "three";
import { PointsNodeMaterial } from "three/webgpu";
import { INTRO_HEIGHT_WEIGHT, INTRO_RAND_JITTER, INTRO_REVEAL_WINDOW } from "./introReveal.ts";
import {
  cameraProjectionMatrix,
  clamp,
  float,
  instancedBufferAttribute,
  mix,
  modelViewMatrix,
  modelWorldMatrix,
  sin,
  smoothstep,
  transformDirection,
  uniform,
  uv,
  varying,
  vec2,
  vec3,
  vec4,
} from "three/tsl";

/**
 * 点云材质(TSL + PointsNodeMaterial)。
 *
 * 注意:r184 的节点体系下 `THREE.Points` 在两个后端都只有 1px 点原语
 * (WebGPU 规范限制;WebGL2 fallback 的 GLSLNodeBuilder 写死 gl_PointSize = 1.0),
 * 所以粒径可控的唯一路径是官方 instanced Sprite 用法:
 * `new Sprite(new PointsNodeMaterial(...))` + `sprite.count = N`,
 * 每点数据经 `instancedBufferAttribute` 注入(而非 geometry attribute)。
 */

const TWO_PI = 6.2831853;

/**
 * 集中管理全部可调 uniform:标定页每帧/参数变更时只改 `.value`。
 */
export function createParticleUniforms() {
  return {
    /** 秒,由渲染闭环累加(暂停时冻结,恢复不跳变)。 */
    time: uniform(0),
    layerOpacity: uniform(1),
    /** 光标 NDC(-1..1);默认放到视野外,避免未移动鼠标时的增亮。 */
    cursorNdc: uniform(new Vector2(10, 10)),
    /** 光标增亮强度。 */
    cursorGain: uniform(1.0),
    /** 光标增亮半径(NDC 单位)。 */
    cursorRadius: uniform(0.25),
    /** 光标附近的额外粒径放大系数:1 + cursorSizeGain × falloff,0.15 即最多放大到 1.15×。 */
    cursorSizeGain: uniform(0.15),
    /**
     * 点粒径(世界单位直径)。渲染闭环按"平均粒子间距 × 0.5"自动写入
     * (Tree Habitat ≈0.05,即标定值);小模型自动收小,不再按固定世界单位放大。
     */
    pointSizeBase: uniform(0.05),
    /** 粒径补偿系数(默认 1);DPR 本身由材质内建 screenDPR 处理,不要在此重复计入。 */
    pixelRatio: uniform(1),
    /** 人浪亮度带幅度。 */
    waveAmp: uniform(0.12),
    /** 人浪速度(rad/s 量级)。 */
    waveSpeed: uniform(0.55),
    /** 人浪空间波长(世界单位)。 */
    waveLength: uniform(3.0),
    /** 人浪 y 位移幅度(世界单位,刻意保持极小)。 */
    waveLift: uniform(0.015),
    /** 微闪幅度。 */
    twinkleAmp: uniform(0.16),
    /** 微闪频率。 */
    twinkleFreq: uniform(1.8),
    /** 基础亮度系数。 */
    brightnessBase: uniform(0.8),
    /**
     * 深度明暗:按模型自身近/远深度区间归一化,越远越暗。
     * 由渲染闭环在取景后写入(视距 ∓ 包围球半径),此处只是占位初值。
     */
    depthFadeNear: uniform(1),
    depthFadeFar: uniform(100),
    /** 深度衰减强度 0..1:最远点亮度压到 (1 - depthFadeAmp)。 */
    depthFadeAmp: uniform(0.65),
    /**
     * 光标附近粒子的随机偏移幅度上限(世界单位)。
     * 由渲染闭环按"平均相邻粒子间距去零头的 2 倍"估算写入:∛(包围盒体积/点数) 截断到一位有效数 ×2。
     */
    cursorJitterAmp: uniform(0),
    /**
     * 解构 morph 进度 0..1:0=模型形态,1=环境散布(alts 目标)。
     * 由渲染闭环 setMorphProgress 写入;位置 mix 与亮度衰减都由它驱动。
     */
    morphProgress: uniform(0),
    /** morph 完成态的整体亮度系数(ambient 点场更稀疏,默认压到 0.55 避免喧宾夺主)。 */
    ambientDim: uniform(0.55),
    /**
     * 入场揭示进度 0..1:0=全隐,1=全显,远→近波浪由 shader 按视距深度推进。
     * 默认 1(标定页等非入场场景直接呈现);宿主在 setParticleData 后调 startIntro()
     * 置 0 并由渲染闭环按 dt 推进,播完置 1 后不再写。
     */
    introProgress: uniform(1),
    /** 入场生成色(页面提示黄 #e8d44d):单点生成瞬间着色,随后混回灰阶白。 */
    introColor: uniform(new Color(0xe8d44d)),
    /**
     * 入场高度归一化区间(局部 y,含地面下限到模型顶):intro reveal 的
     * "从下往上"轴按 (y − introYMin) / (introYMax − introYMin) 归一化。
     * 由渲染闭环 setParticleData 写入,此处只是占位初值(退化为全 0..1 区间)。
     */
    introYMin: uniform(0),
    introYMax: uniform(1),
  };
}

export type ParticleUniforms = ReturnType<typeof createParticleUniforms>;

export type ParticleAttributeArrays = {
  /** xyz 交错,3N。 */
  positions: Float32Array;
  /** xyz 交错,3N。 */
  normals: Float32Array;
  /** 每点 0..1,N。 */
  rands: Float32Array;
  /** 每点亮度衰减 0..1(模型点为 1,地面点为径向衰减),N。 */
  fades: Float32Array;
  /** 每点解构(ambient)目标位置 xyz 交错,3N;morphProgress=1 时的落点。 */
  alts: Float32Array;
};

/**
 * 灰阶亮度合成:法线 lambert + 深度衰减 + 微闪 + 人浪 + 光标增亮,再按 morphProgress 压暗。
 * 位移来源:人浪的极小 y 起伏、光标圆域内的可逆抖动,以及 morphProgress 驱动的
 * 模型→ambient 解构 mix(光标 falloff 始终基于 morph 前位置)。
 */
export function createParticlePointsMaterial(
  uniforms: ParticleUniforms,
  arrays: ParticleAttributeArrays,
): PointsNodeMaterial {
  // 必须包成 InstancedBufferAttribute:BufferAttributeNode 的 instanced 标记取自
  // value.isInstancedBufferAttribute(BufferAttributeNode.js:153);直接传裸 TypedArray 时
  // createBufferAttribute 的末态返回不会置 instanced,属性会退化成逐顶点读取(只有前 4 个点生效)。
  const instancePosition = instancedBufferAttribute<"vec3">(
    new InstancedBufferAttribute(arrays.positions, 3),
    "vec3",
  );
  const instanceNormal = instancedBufferAttribute<"vec3">(
    new InstancedBufferAttribute(arrays.normals, 3),
    "vec3",
  );
  const instanceRand = instancedBufferAttribute<"float">(
    new InstancedBufferAttribute(arrays.rands, 1),
    "float",
  );
  const instanceFade = instancedBufferAttribute<"float">(
    new InstancedBufferAttribute(arrays.fades, 1),
    "float",
  );
  const positionAlt = instancedBufferAttribute<"vec3">(
    new InstancedBufferAttribute(arrays.alts, 3),
    "vec3",
  );

  // 世界系基准位置(人浪相位用它,自转时波形在空间稳定;不能用 positionWorld —
  // 那条链取的是 sprite 面片角点 attribute,不是实例位置)。
  // 人浪相位刻意用 morph 前位置:morph 过程中各点相位不随位置推移,波形不会整体滚动。
  const worldBase = modelWorldMatrix.mul(vec4(instancePosition, 1.0)).xyz;
  const wavePhase = worldBase.x.div(uniforms.waveLength).sub(uniforms.time.mul(uniforms.waveSpeed));
  const wave = sin(wavePhase); // -1..1

  // 极小 y 位移(模型静止悬浮,local y == world y)。
  const displaced = instancePosition.add(vec3(0.0, wave.mul(uniforms.waveLift), 0.0));

  // clip → ndc,与光标 NDC 求距做 soft falloff;同一个 falloff 同时驱动亮度与微放大。
  const viewPosition = modelViewMatrix.mul(vec4(displaced, 1.0));
  const clipPosition = cameraProjectionMatrix.mul(viewPosition);
  const ndc = clipPosition.xy.div(clipPosition.w);
  const cursorDistance = ndc.distance(uniforms.cursorNdc);
  const cursorFalloff = smoothstep(float(0.0), uniforms.cursorRadius, cursorDistance).oneMinus();
  const cursorBoost = uniforms.cursorGain.mul(cursorFalloff);

  // 法线光照:实例法线经 modelWorldMatrix 方向变换,固定灯方向 lambert。
  const lightDirection = vec3(0.35, 0.75, 0.55).normalize();
  const worldNormal = transformDirection(instanceNormal, modelWorldMatrix).normalize();
  const lambert = clamp(worldNormal.dot(lightDirection), 0.0, 1.0);

  // 深度明暗:按模型自身近/远区间归一化,越远越暗。
  const viewDepth = viewPosition.z.negate();
  const depthFactor = clamp(
    viewDepth.sub(uniforms.depthFadeNear).div(uniforms.depthFadeFar.sub(uniforms.depthFadeNear)),
    0.0,
    1.0,
  );
  const depthFade = float(1.0).sub(uniforms.depthFadeAmp.mul(depthFactor));

  // 微闪:相位由每点稳定随机数错开。
  const twinkle = sin(uniforms.time.mul(uniforms.twinkleFreq).add(instanceRand.mul(TWO_PI))).mul(
    uniforms.twinkleAmp,
  );

  const waveGlow = wave.mul(uniforms.waveAmp);

  const brightness = clamp(
    uniforms.brightnessBase
      .mul(float(0.35).add(lambert.mul(0.65)))
      .mul(depthFade)
      .add(twinkle)
      .add(waveGlow)
      .add(cursorBoost)
      .mul(instanceFade)
      // 解构到 ambient 时整体压暗(ambientDim),避免稀疏环境点场亮过模型本体。
      .mul(mix(float(1.0), uniforms.ambientDim, uniforms.morphProgress)),
    0.0,
    1.0,
  );

  // 光标圆域内的随机偏移:每点稳定伪随机方向(由 particleRand 哈希),幅度 = falloff
  // × cursorJitterAmp(平均粒子间距量级)× 轻微时间起伏。只在小圆域内、可逆,不累积。
  const jitterDir = vec3(
    sin(instanceRand.mul(12.9898)),
    sin(instanceRand.mul(78.233)),
    sin(instanceRand.mul(37.719)),
  ).mul(0.5774); // 1/√3:方向分量 ∈[-1,1],缩到 |dir|≤1
  const jitterFlutter = float(0.75).add(
    sin(uniforms.time.mul(2.1).add(instanceRand.mul(TWO_PI))).mul(0.25),
  );
  const jittered = displaced.add(
    jitterDir.mul(uniforms.cursorJitterAmp.mul(cursorFalloff).mul(jitterFlutter)),
  );

  // 解构 morph:morphProgress 0→1 时从模型位置滑向 ambient 目标。
  // 光标 falloff/增亮/微放大/抖动都基于 morph 前位置(displaced/jittered)计算,保持不变。
  const finalPos = mix(jittered, positionAlt, uniforms.morphProgress);

  // 入场揭示(introReveal.ts 的 shader 镜像):排序键 = 深度项(morph 后位置的视距深度
  // 归一化,复用 depthFade 区间 = 视距∓包围球半径;远点先出)与高度项(morph 后位置 y 按
  // introYMin/introYMax 归一化;低点先出)按 INTRO_HEIGHT_WEIGHT 等权混合,rand 抖动打散切片;
  // 单点在 INTRO_REVEAL_WINDOW 进度窗内完成 隐藏→黄→白。introProgress=1 时 introT≡1,
  // 透明度系数为 1、黄色权重为 0,表现与未启用入场完全一致。
  const introViewPosition = modelViewMatrix.mul(vec4(finalPos, 1.0));
  const introDepthNorm = clamp(
    introViewPosition.z
      .negate()
      .sub(uniforms.depthFadeNear)
      .div(uniforms.depthFadeFar.sub(uniforms.depthFadeNear)),
    0.0,
    1.0,
  );
  const introHeightNorm = clamp(
    finalPos.y.sub(uniforms.introYMin).div(uniforms.introYMax.sub(uniforms.introYMin)),
    0.0,
    1.0,
  );
  const introOrder = float(1.0)
    .sub(introDepthNorm)
    .mul(float(1 - INTRO_HEIGHT_WEIGHT))
    .add(introHeightNorm.mul(float(INTRO_HEIGHT_WEIGHT)));
  const introThreshold = introOrder
    .mul(float(1 - INTRO_RAND_JITTER))
    .add(instanceRand.mul(float(INTRO_RAND_JITTER)))
    .mul(float(1 - INTRO_REVEAL_WINDOW));
  // reveal 进度与亮度同在顶点级计算,经 varying 进 fragment(面片四角同值,无插值误差)。
  const brightnessV = varying(brightness, "v_particleBrightness");
  const introT = varying(
    clamp(uniforms.introProgress.sub(introThreshold).div(float(INTRO_REVEAL_WINDOW)), 0.0, 1.0),
    "v_particleIntroT",
  );

  const material = new PointsNodeMaterial();
  material.positionNode = finalPos;
  // 世界单位直径 × 标定补偿;内建链再乘 screenDPR 并按 (0.5 × 视口高 / -viewZ) 做透视衰减。
  // 光标附近额外微放大(默认最多 1.15×),只改尺寸、不动位置。
  material.sizeNode = uniforms.pointSizeBase
    .mul(uniforms.pixelRatio)
    .mul(float(1.0).add(uniforms.cursorSizeGain.mul(cursorFalloff)));
  // 生成瞬间着提示黄(乘 0.5+brightness,微闪/人浪在黄色阶段照常调制),随后混回灰阶白。
  material.colorNode = mix(
    vec3(brightnessV),
    uniforms.introColor.mul(float(0.5).add(brightnessV)),
    smoothstep(float(0.25), float(1.0), introT).oneMinus(),
  );
  // 圆形点:alphaToCoverage + MSAA(createWebGPURenderer antialias:true);无 MSAA 时退化为方点。
  // 注意 three Material 的 alphaToCoverage 默认是 false,必须显式开启。
  material.alphaToCoverage = true;
  // mask 与整体透明度分开乘:圆 mask(边缘) × 散开态透明度(成形 1 → 散开 0.5,
  // 中间值经 MSAA 覆盖抖动呈现半透明)× 入场淡入(未生成前不可见)。
  material.opacityNode = smoothstep(float(0.32), float(0.5), uv().sub(vec2(0.5)).length())
    .oneMinus()
    .mul(mix(float(1.0), float(0.5), uniforms.morphProgress))
    .mul(smoothstep(float(0.0), float(0.4), introT))
    .mul(uniforms.layerOpacity);
  material.transparent = false;
  material.depthWrite = true;
  material.depthTest = true;
  return material;
}
