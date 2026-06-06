/**
 * Web Audio 占位：当 Howl 资源缺失或加载失败时使用。
 * 音量由调用方传入（已含 master × 通道）。
 */

let sharedCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!sharedCtx) sharedCtx = new AudioContext();
  if (sharedCtx.state === "suspended") void sharedCtx.resume();
  return sharedCtx;
}

function makeNoiseBuffer(ctx: AudioContext, seconds: number) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    data[i] = last * 0.35;
  }
  return buf;
}

export type ProceduralAmbientHandle = { stop: () => void };

export function startProceduralAmbient(gain: number): ProceduralAmbientHandle {
  const ctx = getCtx();
  const src = ctx.createBufferSource();
  src.buffer = makeNoiseBuffer(ctx, 2.4);
  src.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 420;
  const g = ctx.createGain();
  g.gain.value = gain * 0.55;
  src.connect(filter);
  filter.connect(g);
  g.connect(ctx.destination);
  src.start();
  return {
    stop: () => {
      try {
        src.stop();
      } catch {
        /* already stopped */
      }
      src.disconnect();
      filter.disconnect();
      g.disconnect();
    },
  };
}

export function playProceduralFootstep(gain: number) {
  const ctx = getCtx();
  const sr = ctx.sampleRate;
  const len = Math.floor(sr * 0.16);
  const buf = ctx.createBuffer(1, len, sr);
  const data = buf.getChannelData(0);
  let brown = 0;
  const thumpHz = 90 + Math.random() * 18;
  for (let i = 0; i < len; i++) {
    const t = i / sr;
    const env = (1 - Math.exp(-t * 140)) * Math.exp(-t * 22);
    const white = Math.random() * 2 - 1;
    brown = (brown + 0.012 * white) / 1.012;
    const thump = Math.sin(2 * Math.PI * thumpHz * t) * Math.exp(-t * 30);
    data[i] = (thump * 0.28 + brown * 0.06) * env * 0.65;
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 520;
  const g = ctx.createGain();
  g.gain.value = gain;
  src.connect(filter);
  filter.connect(g);
  g.connect(ctx.destination);
  src.start();
  src.onended = () => {
    src.disconnect();
    filter.disconnect();
    g.disconnect();
  };
}

/** 展品占位：短促柔和和弦，提示「请替换 demo 音频文件」。 */
export function playProceduralExhibitPreview(gain: number) {
  const ctx = getCtx();
  const freqs = [220, 277.18, 329.63];
  const now = ctx.currentTime;
  const dur = 2.8;
  freqs.forEach((f, i) => {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = f;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(gain * 0.22, now + 0.35 + i * 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + dur + 0.05);
  });
}
