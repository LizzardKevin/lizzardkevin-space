import { primeFootstepClips } from "./footstepPlayer.ts";
import { primeProceduralAudio } from "./proceduralAudio.ts";

export function primeSpaceAudioOnGesture(shortSfxUrls: readonly string[]) {
  primeProceduralAudio();
  primeFootstepClips(shortSfxUrls);
}
