export type ProjectorImageFitInput = {
  imageWidth: number;
  imageHeight: number;
  screenWidth: number;
  screenHeight: number;
};

export function fitProjectorImageToScreen({
  imageWidth,
  imageHeight,
  screenWidth,
  screenHeight,
}: ProjectorImageFitInput): [number, number] {
  if (imageWidth <= 0 || imageHeight <= 0 || screenWidth <= 0 || screenHeight <= 0) {
    return [screenWidth, screenHeight];
  }

  const imageAspect = imageWidth / imageHeight;
  const screenAspect = screenWidth / screenHeight;

  if (imageAspect >= screenAspect) {
    return [screenWidth, screenWidth / imageAspect];
  }

  return [screenHeight * imageAspect, screenHeight];
}
