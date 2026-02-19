import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";

export const maxDuration = 30;

const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
});

interface UpscaleRequest {
    image: string;
    scale?: number;
    faceEnhance?: boolean;
}

export async function POST(request: NextRequest) {
    try {
        if (!process.env.REPLICATE_API_TOKEN) {
            return NextResponse.json(
                { error: "Replicate API token is not configured. Please set REPLICATE_API_TOKEN environment variable." },
                { status: 500 }
            );
        }

        const body: UpscaleRequest = await request.json();

        if (!body.image) {
            return NextResponse.json(
                { error: "No image provided. Please upload an image." },
                { status: 400 }
            );
        }

        // Validate base64 data URI
        const dataUriRegex = /^data:image\/(jpeg|png|webp|jpg|gif);base64,/;
        if (!dataUriRegex.test(body.image)) {
            return NextResponse.json(
                { error: "Invalid image format. Please upload a JPEG, PNG, or WebP image." },
                { status: 400 }
            );
        }

        // Check file size (roughly — base64 is ~33% larger than binary)
        const base64Data = body.image.split(",")[1];
        const sizeInBytes = (base64Data.length * 3) / 4;
        const sizeInMB = sizeInBytes / (1024 * 1024);

        if (sizeInMB > 10) {
            return NextResponse.json(
                { error: `File size (${sizeInMB.toFixed(1)}MB) exceeds the 10MB limit.` },
                { status: 400 }
            );
        }

        const scale = body.scale || 4;
        const faceEnhance = body.faceEnhance || false;

        // Create prediction — returns immediately with prediction ID
        const prediction = await replicate.predictions.create({
            version: "f121d640bd286e1fdc67f9799164c1d5be36ff74576ee11c803ae5b665dd46aa",
            input: {
                image: body.image,
                scale: scale,
                face_enhance: faceEnhance,
            },
        });

        return NextResponse.json({
            id: prediction.id,
            status: prediction.status,
        });
    } catch (error) {
        console.error("Upscale API error:", error);

        const message =
            error instanceof Error ? error.message : "An unexpected error occurred";

        return NextResponse.json({ error: message }, { status: 500 });
    }
}
