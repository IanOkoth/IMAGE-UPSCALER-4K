import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";

export const maxDuration = 30;

const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
});

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        if (!process.env.REPLICATE_API_TOKEN) {
            return NextResponse.json(
                { error: "Replicate API token is not configured." },
                { status: 500 }
            );
        }

        const { id } = params;

        if (!id) {
            return NextResponse.json(
                { error: "Prediction ID is required." },
                { status: 400 }
            );
        }

        const prediction = await replicate.predictions.get(id);

        return NextResponse.json({
            id: prediction.id,
            status: prediction.status,
            output: prediction.output,
            error: prediction.error,
            metrics: prediction.metrics,
        });
    } catch (error) {
        console.error("Poll API error:", error);

        const message =
            error instanceof Error ? error.message : "An unexpected error occurred";

        return NextResponse.json({ error: message }, { status: 500 });
    }
}
