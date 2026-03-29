export interface FlowerVariation {
  name: string;
  petalNum: number;
  petalLength: number;
  petalSharpness: number;
  diameter: number;
  height: number;
  curvature: [number, number];
  bumpiness: number;
  bumpFrequency: number;
  petalColors: string[];
  centerColor: string;
  size: { min: number; max: number };
  frequency: number;
}

export interface SceneColors {
  stemColor: string;
  stemColorDark: string;
  leafColor: string;
  grassBaseColor: string;
  grassTipColor: string;
  sphereColor: string;
  bgColor: string;
  lightColor: string;
  lightIntensity: number;
}

export interface FlowerGenerationParams {
  seed: number;
  variations: FlowerVariation[];
  groundTint: string;
  bloomIntensity: number;
  mood: string;
  sceneColors: SceneColors;
}

export interface FlowerInstance {
  globalIndex: number;
  position: [number, number, number];
  scale: number;
  variationIndex: number;
  rotationZ: number;
}
