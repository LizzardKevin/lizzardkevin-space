import { Howl, Howler } from "howler";
import {
  AUDIO_PATHS,
  FOOTSTEP_SFX_GAIN,
  JUMP_SFX_GAIN,
  SPACE_BGM_FADE_IN_DELAY_MS,
  SPACE_BGM_FADE_IN_MS,
} from "./audioConfig";
import { primeSpaceAudioOnGesture } from "./audioUnlock";
import { chooseFootstepUrl, playFootstepClip, preloadFootstepClips } from "./footstepPlayer";
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
  jumpStartUrl?: string;
  jumpLandUrl?: string;
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
  private jumpStartUrl: string | undefined;
  private jumpLandUrl: string | undefined;
  private bgm: Playing = null;
  private ambient: Playing = null;
  private proceduralAmbient: ProceduralAmbientHandle | null = null;
  private bgmStartTimer: ReturnType<typeof setTimeout> | null = null;
  private lastFootstepUrl: string | undefined;
  private useProceduralFootsteps = false;
  private footstepClipsReady = false;
  private routePaused = false;
  private resumeProceduralAmbientAfterRoute = false;

  constructor(config: AudioDirectorConfig) {
    this.zoneBgmUrls = config.zoneBgmUrls;
    this.zoneAmbientUrls = config.zoneAmbientUrls;
    this.footstepUrls = config.footstepUrls ?? AUDIO_PATHS.footstepUrls;
    this.jumpStartUrl = config.jumpStartUrl ?? AUDIO_PATHS.jumpStartUrl;
    this.jumpLandUrl = config.jumpLandUrl ?? AUDIO_PATHS.jumpLandUrl;
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
    const shortSfxUrls = [
      ...this.footstepUrls,
      ...(this.jumpStartUrl ? [this.jumpStartUrl] : []),
      ...(this.jumpLandUrl ? [this.jumpLandUrl] : []),
    ];
    primeSpaceAudioOnGesture(shortSfxUrls);
    if (!this.footstepClipsReady && this.footstepUrls.length > 0) {
      preloadFootstepClips(shortSfxUrls);
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
    if (key === "bgm" && this.bgm && !this.bgmStartTimer) this.bgm.howl.volume(this.volumes.bgm);
    if (key === "ambient" && this.ambient) this.ambient.howl.volume(this.volumes.ambient);
  }

  async setZone(zone: string) {
    if (!this.unlocked) return;
    await Promise.all([
      this.swapLoop("bgm", zone, this.zoneBgmUrls[zone], this.volumes.bgm),
      this.swapLoop("ambient", zone, this.zoneAmbientUrls[zone], this.volumes.ambient),
    ]);
  }

  setRoutePaused(paused: boolean) {
    if (paused === this.routePaused) return;
    this.routePaused = paused;

    if (paused) {
      this.bgm?.howl.pause();
      this.ambient?.howl.pause();
      this.resumeProceduralAmbientAfterRoute = this.proceduralAmbient !== null;
      this.stopProceduralAmbient();
      return;
    }

    if (!this.unlocked) return;
    if (this.bgm && !this.bgmStartTimer && !this.bgm.howl.playing()) {
      this.bgm.howl.play();
      this.bgm.howl.fade(this.bgm.howl.volume(), this.volumes.bgm, 180);
    }
    if (this.ambient && !this.ambient.howl.playing()) {
      this.ambient.howl.play();
      this.ambient.howl.fade(this.ambient.howl.volume(), this.volumes.ambient, 220);
    } else if (this.resumeProceduralAmbientAfterRoute) {
      this.startProceduralAmbientFallback();
    }
    this.resumeProceduralAmbientAfterRoute = false;
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
    if (!this.unlocked || this.routePaused) return;
    const vol = this.channelVolume("sfx") * FOOTSTEP_SFX_GAIN;
    if (this.useProceduralFootsteps || this.footstepUrls.length === 0) {
      playProceduralFootstep(vol);
      return;
    }
    const url = chooseFootstepUrl(this.footstepUrls, this.lastFootstepUrl);
    if (!url) {
      playProceduralFootstep(vol);
      return;
    }
    this.lastFootstepUrl = url;
    playFootstepClip(url, vol);
  }

  playJumpStart() {
    if (!this.unlocked || this.routePaused || !this.jumpStartUrl) return;
    playFootstepClip(this.jumpStartUrl, this.channelVolume("sfx") * JUMP_SFX_GAIN);
  }

  playJumpLand() {
    if (!this.unlocked || this.routePaused || !this.jumpLandUrl) return;
    playFootstepClip(this.jumpLandUrl, this.channelVolume("sfx") * JUMP_SFX_GAIN);
  }

  private stopProceduralAmbient() {
    this.proceduralAmbient?.stop();
    this.proceduralAmbient = null;
  }

  private clearBgmStartTimer() {
    if (!this.bgmStartTimer) return;
    clearTimeout(this.bgmStartTimer);
    this.bgmStartTimer = null;
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

    if (kind === "bgm") this.clearBgmStartTimer();
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
        this.clearBgmStartTimer();
        this.bgm = null;
      }
    });

    if (current) {
      current.howl.fade(current.howl.volume(), 0, 650);
      setTimeout(() => current.howl.unload(), 700);
    }

    const playing: Playing = { zone, howl: next };
    if (kind === "bgm") {
      this.bgm = playing;
      this.bgmStartTimer = setTimeout(() => {
        this.bgmStartTimer = null;
        if (this.bgm?.howl !== next) return;
        if (this.routePaused) return;
        next.play();
        next.fade(0, this.volumes.bgm, SPACE_BGM_FADE_IN_MS);
      }, SPACE_BGM_FADE_IN_DELAY_MS);
    } else {
      if (!this.routePaused) {
        next.play();
        next.fade(0, volume, 650);
      }
      this.ambient = playing;
      this.stopProceduralAmbient();
    }
  }
}
