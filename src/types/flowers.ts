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

export interface FlowerGenerationParams {
  seed: number;
  variations: FlowerVariation[];
  groundTint: string;
  bloomIntensity: number;
  mood: string;
}

export interface FlowerInstance {
  position: [number, number, number];
  scale: number;
  variationIndex: number;
  rotationZ: number;
}
