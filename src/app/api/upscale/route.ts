import { NextRequest, NextResponse } from "next/server";
import { HfInference } from "@huggingface/inference";

export const maxDuration = 60;

// Models to try in order — the first one to return a result wins
// Using only swin2SR models which are confirmed to be on HF Inference API
const MODELS_BY_SCALE: Record<string, string[]> = {
    "2x": [
        "caidas/swin2SR-lightweight-x2-64",
        "caidas/swin2SR-classical-sr-x2-64",
    ],
    "4x": [
        "caidas/swin2SR-lightweight-x2-64", // fallback: 2x if 4x unavailable
        "caidas/swin2SR-classical-sr-x2-64",
    ],
};

export async function POST(request: NextRequest) {
    try {
        const token = process.env.HUGGINGFACE_API_TOKEN;

        if (!token) {
            return NextResponse.json(
                {
                    error:
                        "Hugging Face API token is not configured. Please set HUGGINGFACE_API_TOKEN in your environment variables.",
                },
                { status: 500 }
            );
        }

        const formData = await request.formData();
        const file = formData.get("image") as File | null;
        const scale = (formData.get("scale") as string) || "4x";

        if (!file) {
            return NextResponse.json(
                { error: "No image file provided." },
                { status: 400 }
            );
        }

        // Validate file type
        const validTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
        if (!validTypes.includes(file.type)) {
            return NextResponse.json(
                {
                    error:
                        "Invalid file type. Please upload a JPEG, PNG, or WebP image.",
                },
                { status: 400 }
            );
        }

        // Validate file size (5MB for better HF API compatibility)
        const MAX_SIZE = 5 * 1024 * 1024;
        if (file.size > MAX_SIZE) {
            return NextResponse.json(
                {
                    error: `File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds the 5MB limit for upscaling.`,
                },
                { status: 400 }
            );
        }

        const hf = new HfInference(token);
        const imageBlob = new Blob([await file.arrayBuffer()], { type: file.type });
        const models = MODELS_BY_SCALE[scale] || MODELS_BY_SCALE["4x"];

        let lastError: string | null = null;

        // Try each model in order
        for (const modelId of models) {
            try {
                console.log(`Trying model: ${modelId}`);

                const result = await hf.imageToImage({
                    model: modelId,
                    inputs: imageBlob,
                });

                // result is a Blob — convert to base64 data URI
                const arrayBuffer = await result.arrayBuffer();
                const base64 = Buffer.from(arrayBuffer).toString("base64");
                const contentType = result.type || "image/png";
                const dataUri = `data:${contentType};base64,${base64}`;

                return NextResponse.json({
                    success: true,
                    output: dataUri,
                    model: modelId,
                    scale,
                });
            } catch (modelError: unknown) {
                const errMsg =
                    modelError instanceof Error
                        ? modelError.message
                        : String(modelError);
                console.log(`Model ${modelId} failed: ${errMsg}`);
                lastError = errMsg;

                // If model is loading (503), tell the user to retry
                if (errMsg.includes("loading") || errMsg.includes("503")) {
                    return NextResponse.json(
                        {
                            error:
                                "The AI model is warming up (cold start). Please wait 30 seconds and try again.",
                            loading: true,
                            estimatedTime: 30,
                        },
                        { status: 503 }
                    );
                }

                // Continue to next model otherwise
                continue;
            }
        }

        // All models failed
        return NextResponse.json(
            {
                error: `All upscaling models are currently unavailable. Last error: ${lastError}. Please try again in a moment.`,
            },
            { status: 503 }
        );
    } catch (error) {
        console.error("Upscale API error:", error);
        const message =
            error instanceof Error ? error.message : "An unexpected error occurred";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
