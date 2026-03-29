import OpenAI from "openai";
import { FlowerGenerationParams, FlowerVariation, SceneColors } from "@/types/flowers";
import { hashString } from "./seededRng";

function getClient() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
}

const SYSTEM_PROMPT = `You are a botanical artist AI that translates natural language descriptions into mathematical parameters for procedural flower generation. You output structured JSON that drives a polar rose equation renderer.

The polar rose formula is: r(phi) = (petalLength * |sin(petalNum/2 * phi)|^petalSharpness + diameter)

Parameter guide:
- petalNum (3-24): Number of petals. 5=poppy, 8=cosmos, 12=sunflower, 18+=dahlia/chrysanthemum
- petalLength (20-150): How far petals extend. Higher = more dramatic petals
- petalSharpness (0.1-5.0): Controls petal tip shape. 0.2-0.4=broad/round, 0.6-1.0=natural, 1.5-3.0=pointed/spiky, 4.0+=star-like
- diameter (60-250): Base flower size. Large relative to petalLength = subtle petals, small = dramatic separation
- height (80-400): 3D bowl depth (affects shading)
- curvature [a, b]: Bowl shape params. a (0.3-1.5) = steepness, b (0.05-0.4) = falloff rate
- bumpiness (0-4): Surface texture amplitude
- bumpFrequency (0-24): Surface texture frequency
- petalColors: Array of 2-4 hex colors from center to edge of petals
- centerColor: Hex color for the flower center/pistil
- size: {min, max} scale range on the globe (0.08-0.5)
- frequency: How common this variation is (0.05-0.3, all should sum to ~1.0)

Create 6-10 distinct flower variations that match the user's description. Consider:
- Color palette coherence and contrast
- Mix of petal counts (some sparse, some dense)
- Mix of sharpness levels (round, natural, pointed)
- Size variation for visual depth
- Mood and atmosphere from the description

groundTint should be a green-ish hex reflecting the mood (darker for moody, brighter for cheerful).
bloomIntensity (0.3-1.2) controls glow strength.
mood is a one-word summary.

sceneColors controls the entire environment to match the prompt's mood and flower palette:
- stemColor: hex for the main stem stroke (typically a green, but could be brown/dark for dry/autumn, pale for winter, vibrant for tropical)
- stemColorDark: hex for the darker stem gradient end
- leafColor: hex for the leaves along stems
- grassBaseColor: hex for grass root color (darker, earthier)
- grassTipColor: hex for grass blade tips (lighter, brighter)
- sphereColor: hex for the ground sphere (earthy green for meadows, sandy for desert, dark for night, snowy white for winter, etc.)
- bgColor: hex for the page/scene background (should complement flowers — warm whites for sun, dark blues for night, misty greys for fog, etc.)
- lightColor: hex for the key directional light (warm yellow for sunny, cool blue for moonlit, orange for sunset, etc.)
- lightIntensity: (0.5-2.0) overall light brightness

Make these colors strongly reflect the prompt. A "cherry blossom in spring rain" should have soft pinks, muted greens, cool grey sky. A "sunflower field at sunset" should have warm oranges, golden light, rich earth tones. A "dark gothic roses" should have near-black greens, deep reds, moody purple-grey background.`;


const VARIATION_SCHEMA = {
  type: "object" as const,
  properties: {
    name: { type: "string" as const },
    petalNum: { type: "number" as const },
    petalLength: { type: "number" as const },
    petalSharpness: { type: "number" as const },
    diameter: { type: "number" as const },
    height: { type: "number" as const },
    curvature: {
      type: "array" as const,
      items: { type: "number" as const },
      minItems: 2,
      maxItems: 2,
    },
    bumpiness: { type: "number" as const },
    bumpFrequency: { type: "number" as const },
    petalColors: {
      type: "array" as const,
      items: { type: "string" as const },
      minItems: 2,
      maxItems: 4,
    },
    centerColor: { type: "string" as const },
    size: {
      type: "object" as const,
      properties: {
        min: { type: "number" as const },
        max: { type: "number" as const },
      },
      required: ["min", "max"] as const,
      additionalProperties: false,
    },
    frequency: { type: "number" as const },
  },
  required: [
    "name",
    "petalNum",
    "petalLength",
    "petalSharpness",
    "diameter",
    "height",
    "curvature",
    "bumpiness",
    "bumpFrequency",
    "petalColors",
    "centerColor",
    "size",
    "frequency",
  ] as const,
  additionalProperties: false,
};

const SCENE_COLORS_SCHEMA = {
  type: "object" as const,
  properties: {
    stemColor: { type: "string" as const },
    stemColorDark: { type: "string" as const },
    leafColor: { type: "string" as const },
    grassBaseColor: { type: "string" as const },
    grassTipColor: { type: "string" as const },
    sphereColor: { type: "string" as const },
    bgColor: { type: "string" as const },
    lightColor: { type: "string" as const },
    lightIntensity: { type: "number" as const },
  },
  required: [
    "stemColor", "stemColorDark", "leafColor",
    "grassBaseColor", "grassTipColor", "sphereColor",
    "bgColor", "lightColor", "lightIntensity",
  ] as const,
  additionalProperties: false,
};

const RESPONSE_SCHEMA = {
  type: "object" as const,
  properties: {
    variations: {
      type: "array" as const,
      items: VARIATION_SCHEMA,
      minItems: 6,
      maxItems: 10,
    },
    groundTint: { type: "string" as const },
    bloomIntensity: { type: "number" as const },
    mood: { type: "string" as const },
    sceneColors: SCENE_COLORS_SCHEMA,
  },
  required: ["variations", "groundTint", "bloomIntensity", "mood", "sceneColors"] as const,
  additionalProperties: false,
};

export async function generateFlowerParams(
  prompt: string
): Promise<FlowerGenerationParams> {
  const response = await getClient().responses.create({
    model: "gpt-4o",
    input: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Generate flower parameters for: "${prompt}"`,
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "flower_params",
        schema: RESPONSE_SCHEMA,
        strict: true,
      },
    },
  });

  const text = response.output_text;
  const parsed = JSON.parse(text) as {
    variations: FlowerVariation[];
    groundTint: string;
    bloomIntensity: number;
    mood: string;
    sceneColors: SceneColors;
  };

  return {
    seed: hashString(prompt),
    ...parsed,
  };
}
