import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

const HF_MODELS: Record<string, string> = {
    "2x": "caidas/swin2SR-classical-sr-x2-64",
    "4x": "caidas/swin2SR-realworld-sr-x4-64-bsrgan-psnr",
};

export async function POST(request: NextRequest) {
    try {
        const token = process.env.HUGGINGFACE_API_TOKEN;

        if (!token) {
            return NextResponse.json(
                {
                    error:
                        "Hugging Face API token is not configured. Please set HUGGINGFACE_API_TOKEN environment variable.",
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
        const validTypes = [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/jpg",
        ];
        if (!validTypes.includes(file.type)) {
            return NextResponse.json(
                { error: "Invalid file type. Please upload a JPEG, PNG, or WebP image." },
                { status: 400 }
            );
        }

        // Validate file size (10MB)
        const MAX_SIZE = 10 * 1024 * 1024;
        if (file.size > MAX_SIZE) {
            return NextResponse.json(
                {
                    error: `File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds the 10MB limit.`,
                },
                { status: 400 }
            );
        }

        // Select model based on scale
        const modelId = HF_MODELS[scale] || HF_MODELS["4x"];

        // Convert file to buffer for HuggingFace API
        const imageBuffer = Buffer.from(await file.arrayBuffer());

        // Call HuggingFace Inference API
        // This is a simple binary POST — send image bytes, get upscaled image bytes back
        const hfResponse = await fetch(
            `https://api-inference.huggingface.co/models/${modelId}`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/octet-stream",
                },
                body: imageBuffer,
            }
        );

        if (!hfResponse.ok) {
            const errorData = await hfResponse.json().catch(() => null);

            // Handle model loading state
            if (hfResponse.status === 503) {
                const estimatedTime = errorData?.estimated_time || 30;
                return NextResponse.json(
                    {
                        error: `Model is loading. Please try again in ~${Math.ceil(estimatedTime)} seconds.`,
                        loading: true,
                        estimatedTime: Math.ceil(estimatedTime),
                    },
                    { status: 503 }
                );
            }

            const message =
                errorData?.error ||
                `HuggingFace API returned status ${hfResponse.status}`;
            return NextResponse.json({ error: message }, { status: hfResponse.status });
        }

        // The response is the upscaled image as binary data
        const upscaledBuffer = Buffer.from(await hfResponse.arrayBuffer());
        const contentType = hfResponse.headers.get("content-type") || "image/png";

        // Return the upscaled image as base64 data URI
        const base64Image = upscaledBuffer.toString("base64");
        const dataUri = `data:${contentType};base64,${base64Image}`;

        return NextResponse.json({
            success: true,
            output: dataUri,
            model: modelId,
            scale: scale,
        });
    } catch (error) {
        console.error("Upscale API error:", error);
        const message =
            error instanceof Error ? error.message : "An unexpected error occurred";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
