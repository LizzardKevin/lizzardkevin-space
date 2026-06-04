/** 展品音/视频统一放在 public/media/，文件名 = exhibitId + 扩展名。 */
export const EXHIBIT_MEDIA_DIR = "/media";

export function exhibitAudioUrl(exhibitId: string) {
  return `${EXHIBIT_MEDIA_DIR}/${exhibitId}.mp3`;
}

export function exhibitVideoUrl(exhibitId: string) {
  return `${EXHIBIT_MEDIA_DIR}/${exhibitId}.mp4`;
}
