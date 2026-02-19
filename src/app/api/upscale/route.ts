import { NextRequest, NextResponse } from "next/server";
import { Client } from "@gradio/client";

export const maxDuration = 60;

// The only active/reliable Real-ESRGAN Space found
const SPACE_ID = "bookbot/image-upscaling-playground";

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

        // bookbot expects "modelx2" or "modelx4"
        const modelName = scaleParam.includes("2") ? "modelx2" : "modelx4";
        const scaleDisplay = scaleParam.includes("2") ? "2x" : "4x";

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

        console.log(`Connecting to Space: ${SPACE_ID}...`);

        try {
            const client = await Client.connect(SPACE_ID, {
                token: (token as `hf_${string}`) || undefined,
            });

            console.log(`Sending image to ${SPACE_ID} with params: [image, ${modelName}]`);

            // bookbot/image-upscaling-playground signature:
            // fn_index=0
            // inputs: [Input Image, Choose Upscaler]
            // outputs: [output]
            const result = await client.predict("/predict", {
                "Input Image": imageBlob,
                "Choose Upscaler": modelName
            });

            const data = result.data as Array<{ url?: string; path?: string }>;

            if (data && data.length > 0) {
                const outputFile = data[0];
                const imageUrl = outputFile?.url || outputFile?.path;

                if (imageUrl) {
                    // Fetch the temporary URL to get the actual image data
                    const imageResponse = await fetch(imageUrl);
                    if (imageResponse.ok) {
                        const buffer = Buffer.from(await imageResponse.arrayBuffer());
                        const base64 = buffer.toString("base64");
                        const contentType =
                            imageResponse.headers.get("content-type") || "image/png";

                        return NextResponse.json({
                            success: true,
                            output: `data:${contentType};base64,${base64}`,
                            model: SPACE_ID,
                            scale: scaleDisplay,
                        });
                    }
                }
            }

            throw new Error("Space returned no valid output URL");

        } catch (spaceError: unknown) {
            const msg = spaceError instanceof Error ? spaceError.message : String(spaceError);
            console.error(`Space error: ${msg}`);

            // Check for common Gradio queue/capacity errors
            if (msg.includes("Queue") || msg.includes("busy")) {
                return NextResponse.json(
                    {
                        error: "The AI model is currently busy processing other requests. Please try again in 10-20 seconds.",
                    },
                    { status: 503 }
                );
            }

            throw new Error(`AI processing failed: ${msg}`);
        }

    } catch (error) {
        console.error("Upscale API error:", error);
        const message =
            error instanceof Error ? error.message : "An unexpected error occurred";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
