import { NextResponse } from "next/server";
import { generateFlowerParams } from "@/lib/openai";
import { DEFAULT_PARAMS } from "@/lib/defaultParams";
import { hashString } from "@/lib/seededRng";

export async function POST(req: Request) {
  let prompt = "";

  try {
    const body = await req.json();
    prompt = body.prompt;

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    if (
      !process.env.OPENAI_API_KEY ||
      process.env.OPENAI_API_KEY === "your-api-key-here"
    ) {
      return NextResponse.json({
        ...DEFAULT_PARAMS,
        seed: hashString(prompt),
      });
    }

    const params = await generateFlowerParams(prompt);
    return NextResponse.json(params);
  } catch (err) {
    console.error("Generation error:", err);
    return NextResponse.json({
      ...DEFAULT_PARAMS,
      seed: hashString(prompt || "fallback"),
    });
  }
}
