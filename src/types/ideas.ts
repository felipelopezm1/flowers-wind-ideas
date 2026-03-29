import { FlowerGenerationParams } from "./flowers";

export interface FlowerIdea {
  text: string;
  status: "active" | "completed";
  createdAt: number;
  completedAt?: number;
  subWorldSeed?: number;
}

export interface WorldNode {
  id: string;
  parentId: string | null;
  sourceFlowerIndex: number | null;
  title: string;
  subtitle: string;
  params: FlowerGenerationParams;
  ideas: Record<number, FlowerIdea>;
}
