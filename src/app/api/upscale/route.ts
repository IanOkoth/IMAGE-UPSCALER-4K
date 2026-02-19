import { NextRequest, NextResponse } from "next/server";
import { Client } from "@gradio/client";

export const maxDuration = 60;

// HuggingFace Spaces running Real-ESRGAN — tried in order
const SPACES = [
    "bookbot/image-upscaling-playground",
    "Nick088/RealESRGAN-Pytorch",
    "not-lain/Super-Resolution",
] as const;

async function trySpace(
    spaceId: string,
    imageBlob: Blob,
    scale: number,
    hfToken?: string
): Promise<{ success: boolean; data?: string; error?: string }> {
    try {
        console.log(`Trying Space: ${spaceId}`);

        const client = await Client.connect(spaceId, {
            token: (hfToken as `hf_${string}`) || undefined,
        });

        // Most Real-ESRGAN Spaces use /predict as the API endpoint
        // with (image, scale) as inputs
        const result = await client.predict("/predict", {
            img: imageBlob,
            scale: scale,
        });

        const data = result.data as Array<{ url?: string; path?: string }>;

        if (data && data.length > 0) {
            const outputFile = data[0];
            const imageUrl = outputFile?.url || outputFile?.path;

            if (imageUrl) {
                // For Gradio Spaces, the URL is temporary — we need to fetch and convert to base64
                const imageResponse = await fetch(imageUrl);
                if (imageResponse.ok) {
                    const buffer = Buffer.from(await imageResponse.arrayBuffer());
                    const base64 = buffer.toString("base64");
                    const contentType =
                        imageResponse.headers.get("content-type") || "image/png";
                    return {
                        success: true,
                        data: `data:${contentType};base64,${base64}`,
                    };
                }
            }
        }

        return { success: false, error: "No output from Space" };
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.log(`Space ${spaceId} failed: ${msg}`);
        return { success: false, error: msg };
    }
}

// Fallback: call HuggingFace Inference API directly for any available model
async function tryHfInference(
    imageBuffer: Buffer,
    hfToken: string
): Promise<{ success: boolean; data?: string; error?: string }> {
    const models = [
        "caidas/swin2SR-classical-sr-x2-64",
        "caidas/swin2SR-lightweight-x2-64",
    ];

    for (const model of models) {
        try {
            console.log(`Trying HF Inference: ${model}`);
            const response = await fetch(
                `https://api-inference.huggingface.co/models/${model}`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${hfToken}`,
                        "Content-Type": "application/octet-stream",
                    },
                    body: new Uint8Array(imageBuffer),
                }
            );

            if (response.ok) {
                const buffer = Buffer.from(await response.arrayBuffer());
                const contentType =
                    response.headers.get("content-type") || "image/png";
                const base64 = buffer.toString("base64");
                return {
                    success: true,
                    data: `data:${contentType};base64,${base64}`,
                };
            }

            const errorBody = await response.text();
            console.log(`HF model ${model} returned ${response.status}: ${errorBody}`);
        } catch (err) {
            console.log(
                `HF model ${model} error: ${err instanceof Error ? err.message : err}`
            );
        }
    }

    return { success: false, error: "All HF Inference models unavailable" };
}

export async function POST(request: NextRequest) {
    try {
        const token = process.env.HUGGINGFACE_API_TOKEN;

        if (!token) {
            return NextResponse.json(
                {
                    error:
                        "Hugging Face API token is not configured. Set HUGGINGFACE_API_TOKEN in your environment variables.",
                },
                { status: 500 }
            );
        }

        const formData = await request.formData();
        const file = formData.get("image") as File | null;
        const scaleParam = (formData.get("scale") as string) || "4x";
        const scale = parseInt(scaleParam.replace("x", ""), 10) || 4;

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
                { error: "Invalid file type. Upload a JPEG, PNG, or WebP image." },
                { status: 400 }
            );
        }

        // Validate file size (5MB)
        const MAX_SIZE = 5 * 1024 * 1024;
        if (file.size > MAX_SIZE) {
            return NextResponse.json(
                {
                    error: `File too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Max 5MB.`,
                },
                { status: 400 }
            );
        }

        const arrayBuffer = await file.arrayBuffer();
        const imageBlob = new Blob([arrayBuffer], { type: file.type });
        const imageBuffer = Buffer.from(arrayBuffer);

        let lastError = "";

        // Strategy 1: Try HuggingFace Spaces via Gradio client
        for (const spaceId of SPACES) {
            const result = await trySpace(spaceId, imageBlob, scale, token);
            if (result.success && result.data) {
                return NextResponse.json({
                    success: true,
                    output: result.data,
                    model: spaceId,
                    scale: `${scale}x`,
                });
            }
            lastError = result.error || "Unknown error";
        }

        // Strategy 2: Try HuggingFace Inference API directly
        const hfResult = await tryHfInference(imageBuffer, token);
        if (hfResult.success && hfResult.data) {
            return NextResponse.json({
                success: true,
                output: hfResult.data,
                model: "HuggingFace Inference API",
                scale: "2x",
            });
        }
        lastError = hfResult.error || lastError;

        return NextResponse.json(
            {
                error: `All upscaling services are currently unavailable. Error: ${lastError}. Please try again in a moment — Spaces may need to wake up.`,
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
