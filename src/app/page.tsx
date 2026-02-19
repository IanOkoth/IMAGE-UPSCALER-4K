"use client";

import React, { useState, useCallback } from "react";
import { Zap, RotateCcw, ArrowUp, Shield } from "lucide-react";
import UploadZone from "@/components/UploadZone";
import ProcessingOverlay from "@/components/ProcessingOverlay";
import ComparisonSlider from "@/components/ComparisonSlider";
import DownloadButton from "@/components/DownloadButton";

type AppState = "idle" | "processing" | "complete" | "error";

interface UpscaleResult {
    originalUrl: string;
    upscaledUrl: string;
    scale: number;
}

export default function Home() {
    const [appState, setAppState] = useState<AppState>("idle");
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<UpscaleResult | null>(null);
    const [processingStatus, setProcessingStatus] = useState("uploading");

    const handleUpload = useCallback(
        async (file: File, scale: number, faceEnhance: boolean) => {
            setAppState("processing");
            setProcessingStatus("uploading");
            setError(null);

            try {
                // Create object URL for original preview
                const originalUrl = URL.createObjectURL(file);

                // Build FormData for the upload
                const formData = new FormData();
                formData.append("image", file);
                formData.append("scale", `${scale}x`);

                setProcessingStatus("processing");

                // Send to API — synchronous call, HuggingFace returns the result directly
                const response = await fetch("/api/upscale", {
                    method: "POST",
                    body: formData,
                });

                let data;
                const responseText = await response.text();

                try {
                    data = JSON.parse(responseText);
                } catch (e) {
                    console.error("Failed to parse API response:", responseText);
                    throw new Error(
                        `API returned invalid response: ${responseText.slice(
                            0,
                            100
                        )}...`
                    );
                }

                // Handle model loading (503)
                if (response.status === 503 && data.loading) {
                    setError(
                        `The AI model is warming up. Please wait ~${data.estimatedTime || 30}s and try again.`
                    );
                    setAppState("error");
                    return;
                }

                if (!response.ok) {
                    throw new Error(data.error || `Server error: ${response.status}`);
                }

                if (data.success && data.output) {
                    setProcessingStatus("succeeded");
                    // Short delay for the UI to show "Finalizing..."
                    await new Promise((r) => setTimeout(r, 500));

                    setResult({
                        originalUrl,
                        upscaledUrl: data.output,
                        scale,
                    });
                    setAppState("complete");
                } else {
                    throw new Error("No output received from the AI model.");
                }
            } catch (err) {
                const message =
                    err instanceof Error ? err.message : "An unexpected error occurred";
                setError(message);
                setAppState("error");
            }
        },
        []
    );

    const handleReset = useCallback(() => {
        setAppState("idle");
        setResult(null);
        setError(null);
    }, []);

    return (
        <main className="min-h-screen flex flex-col">
            {/* Header */}
            <header className="w-full py-5 px-6 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500">
                        <ArrowUp className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-lg font-bold text-white tracking-tight">
                        UpScale<span className="text-violet-400">AI</span>
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20">
                        <Shield className="w-3.5 h-3.5 text-green-400" />
                        <span className="text-xs text-green-400 font-medium">Secure</span>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 sm:py-12">
                {/* Hero Section — show only on idle/error */}
                {(appState === "idle" || appState === "error") && (
                    <div className="text-center mb-10 animate-fade-in">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 mb-5">
                            <Zap className="w-3.5 h-3.5 text-violet-400" />
                            <span className="text-xs font-medium text-violet-300">
                                Powered by Swin2SR Super-Resolution AI
                            </span>
                        </div>
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white mb-4 tracking-tight">
                            Upscale Images to{" "}
                            <span className="bg-gradient-to-r from-violet-400 via-violet-300 to-cyan-400 bg-clip-text text-transparent">
                                4K Quality
                            </span>
                        </h1>
                        <p className="text-base sm:text-lg text-zinc-400 max-w-xl mx-auto leading-relaxed">
                            Transform blurry, low-resolution images into stunning high-resolution
                            masterpieces using AI-powered super resolution.
                        </p>
                    </div>
                )}

                {/* State Rendering */}
                {(appState === "idle" || appState === "error") && (
                    <UploadZone
                        onUpload={handleUpload}
                        disabled={false}
                    />
                )}

                {appState === "processing" && (
                    <ProcessingOverlay
                        status={processingStatus}
                    />
                )}

                {appState === "complete" && result && (
                    <div className="w-full max-w-4xl space-y-6 animate-fade-in">
                        <ComparisonSlider
                            beforeSrc={result.originalUrl}
                            afterSrc={result.upscaledUrl}
                            beforeLabel="Original"
                            afterLabel={`${result.scale}× Upscaled`}
                        />

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                            <DownloadButton
                                imageUrl={result.upscaledUrl}
                                filename={`upscaled-${result.scale}x.png`}
                            />
                            <button
                                onClick={handleReset}
                                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-sm text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all duration-200"
                            >
                                <RotateCcw className="w-4 h-4" />
                                Upscale Another
                            </button>
                        </div>
                    </div>
                )}

                {/* Error message */}
                {appState === "error" && error && (
                    <div className="mt-6 w-full max-w-2xl animate-slide-up">
                        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                            <div className="p-1 rounded-lg bg-red-500/20">
                                <Zap className="w-4 h-4 text-red-400" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-medium text-red-300 mb-0.5">
                                    Something went wrong
                                </p>
                                <p className="text-sm text-red-400/80">{error}</p>
                            </div>
                            <button
                                onClick={handleReset}
                                className="text-sm text-red-400 hover:text-red-300 underline underline-offset-2 transition-colors"
                            >
                                Try Again
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <footer className="w-full py-5 px-6 text-center">
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-xs text-zinc-600">
                    <span>Built with Next.js & Swin2SR AI</span>
                    <span className="hidden sm:inline">•</span>
                    <span>Images are processed securely and never stored</span>
                </div>
            </footer>
        </main>
    );
}
