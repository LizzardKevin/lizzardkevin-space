import { Howl, Howler } from "howler";
import { AUDIO_PATHS } from "./audioConfig";
import { playFootstepClip, preloadFootstepClips } from "./footstepPlayer";
import {
  playProceduralFootstep,
  startProceduralAmbient,
  type ProceduralAmbientHandle,
} from "./proceduralAudio";

export type VolumeKey = "master" | "bgm" | "ambient" | "sfx" | "exhibit";

export type AudioDirectorConfig = {
  zoneBgmUrls: Partial<Record<string, string>>;
  zoneAmbientUrls: Partial<Record<string, string>>;
  footstepUrls?: readonly string[];
  defaultVolumes?: Partial<Record<VolumeKey, number>>;
};

type Playing = { zone: string; howl: Howl } | null;

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

export class AudioDirector {
  private unlocked = false;
  private volumes: Record<VolumeKey, number>;
  private zoneBgmUrls: Partial<Record<string, string>>;
  private zoneAmbientUrls: Partial<Record<string, string>>;
  private footstepUrls: readonly string[];
  private bgm: Playing = null;
  private ambient: Playing = null;
  private proceduralAmbient: ProceduralAmbientHandle | null = null;
  private footstepIndex = 0;
  private useProceduralFootsteps = false;
  private footstepClipsReady = false;

  constructor(config: AudioDirectorConfig) {
    this.zoneBgmUrls = config.zoneBgmUrls;
    this.zoneAmbientUrls = config.zoneAmbientUrls;
    this.footstepUrls = config.footstepUrls ?? AUDIO_PATHS.footstepUrls;
    this.volumes = {
      master: 0.9,
      bgm: 0.6,
      ambient: 0.6,
      sfx: 0.35,
      exhibit: 0.8,
      ...config.defaultVolumes,
    };
    Howler.volume(this.volumes.master);
    if (this.footstepUrls.length === 0) this.useProceduralFootsteps = true;
  }

  isUnlocked() {
    return this.unlocked;
  }

  unlock() {
    if (this.unlocked) return;
    this.unlocked = true;
    if (!this.footstepClipsReady && this.footstepUrls.length > 0) {
      preloadFootstepClips(this.footstepUrls);
      this.footstepClipsReady = true;
    }
  }

  getVolume(key: VolumeKey) {
    return this.volumes[key];
  }

  channelVolume(key: Exclude<VolumeKey, "master">) {
    return this.volumes.master * this.volumes[key];
  }

  setVolume(key: VolumeKey, value: number) {
    this.volumes[key] = clamp01(value);
    if (key === "master") Howler.volume(this.volumes.master);
    if (key === "bgm" && this.bgm) this.bgm.howl.volume(this.volumes.bgm);
    if (key === "ambient" && this.ambient) this.ambient.howl.volume(this.volumes.ambient);
  }

  async setZone(zone: string) {
    if (!this.unlocked) return;
    await Promise.all([
      this.swapLoop("bgm", zone, this.zoneBgmUrls[zone], this.volumes.bgm),
      this.swapLoop("ambient", zone, this.zoneAmbientUrls[zone], this.volumes.ambient),
    ]);
  }

  duckBgm(duck: boolean) {
    if (!this.bgm) return;
    const target = duck ? this.volumes.bgm * 0.45 : this.volumes.bgm;
    this.bgm.howl.fade(this.bgm.howl.volume(), target, 180);
  }

  duckAmbient(duck: boolean) {
    const target = duck ? this.volumes.ambient * 0.35 : this.volumes.ambient;
    if (this.ambient) {
      this.ambient.howl.fade(this.ambient.howl.volume(), target, 220);
    }
  }

  playFootstep() {
    if (!this.unlocked) return;
    const vol = this.channelVolume("sfx");
    if (this.useProceduralFootsteps || this.footstepUrls.length === 0) {
      playProceduralFootstep(vol);
      return;
    }
    const url = this.footstepUrls[this.footstepIndex % this.footstepUrls.length];
    this.footstepIndex += 1;
    playFootstepClip(url, vol);
  }

  private stopProceduralAmbient() {
    this.proceduralAmbient?.stop();
    this.proceduralAmbient = null;
  }

  private startProceduralAmbientFallback() {
    if (this.proceduralAmbient || this.ambient) return;
    this.proceduralAmbient = startProceduralAmbient(this.channelVolume("ambient"));
  }

  private async swapLoop(
    kind: "bgm" | "ambient",
    zone: string,
    url: string | undefined,
    volume: number,
  ) {
    const current = kind === "bgm" ? this.bgm : this.ambient;
    if (current?.zone === zone) return;

    if (kind === "ambient") this.stopProceduralAmbient();

    if (!url) {
      if (current) {
        current.howl.fade(current.howl.volume(), 0, 450);
        setTimeout(() => current.howl.unload(), 500);
      }
      if (kind === "bgm") this.bgm = null;
      else this.ambient = null;
      return;
    }

    const next = new Howl({
      src: [url],
      loop: true,
      volume: 0,
      html5: true,
    });

    next.once("loaderror", () => {
      next.unload();
      if (kind === "ambient") {
        this.ambient = null;
        this.startProceduralAmbientFallback();
      } else {
        this.bgm = null;
      }
    });

    next.play();
    next.fade(0, volume, 650);

    if (current) {
      current.howl.fade(current.howl.volume(), 0, 650);
      setTimeout(() => current.howl.unload(), 700);
    }

    const playing: Playing = { zone, howl: next };
    if (kind === "bgm") this.bgm = playing;
    else {
      this.ambient = playing;
      this.stopProceduralAmbient();
    }
  }
}
