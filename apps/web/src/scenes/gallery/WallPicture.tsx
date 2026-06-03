import { useTexture } from "@react-three/drei";
import { useMemo } from "react";

export function WallPicture({
  imageUrl,
  position,
  rotation = [0, 0, 0],
  maxWidth = 1.2,
  maxHeight = 1.0,
  frameBorder = 0.06,
  frameDepth = 0.04,
}: {
  imageUrl: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  maxWidth?: number;
  maxHeight?: number;
  frameBorder?: number;
  frameDepth?: number;
}) {
  const texture = useTexture(imageUrl);

  const { width, height } = useMemo(() => {
    const img = texture.image as HTMLImageElement | undefined;
    const aspect = img && img.width > 0 ? img.width / img.height : 4 / 3;
    let w = maxWidth;
    let h = w / aspect;
    if (h > maxHeight) {
      h = maxHeight;
      w = h * aspect;
    }
    return { width: w, height: h };
  }, [texture, maxWidth, maxHeight]);

  return (
    <group position={position} rotation={rotation}>
      <mesh castShadow receiveShadow position={[0, 0, -frameDepth / 2]}>
        <boxGeometry args={[width + frameBorder * 2, height + frameBorder * 2, frameDepth]} />
        <meshToonMaterial color="#3a3228" />
      </mesh>
      <mesh position={[0, 0, frameDepth * 0.15]}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
    </group>
  );
}
