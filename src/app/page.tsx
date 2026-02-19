"use client";

import React, { useState, useCallback, useRef } from "react";
import { Zap, RotateCcw, ArrowUp, Github, Shield } from "lucide-react";
import UploadZone from "@/components/UploadZone";
import ProcessingOverlay from "@/components/ProcessingOverlay";
import ComparisonSlider from "@/components/ComparisonSlider";
import DownloadButton from "@/components/DownloadButton";

type AppState = "idle" | "uploading" | "processing" | "complete" | "error";

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
    const pollingRef = useRef<NodeJS.Timeout | null>(null);
    const abortRef = useRef(false);

    const stopPolling = useCallback(() => {
        if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
        }
    }, []);

    const pollPrediction = useCallback(
        (predictionId: string, originalUrl: string, scale: number) => {
            setProcessingStatus("starting");

            pollingRef.current = setInterval(async () => {
                if (abortRef.current) {
                    stopPolling();
                    return;
                }

                try {
                    const response = await fetch(`/api/upscale/${predictionId}`);
                    const data = await response.json();

                    if (data.error && !data.status) {
                        stopPolling();
                        setError(data.error);
                        setAppState("error");
                        return;
                    }

                    if (data.status === "processing") {
                        setProcessingStatus("processing");
                    }

                    if (data.status === "succeeded") {
                        stopPolling();
                        setProcessingStatus("succeeded");

                        // The output is the URL of the upscaled image
                        const outputUrl =
                            typeof data.output === "string"
                                ? data.output
                                : Array.isArray(data.output)
                                    ? data.output[0]
                                    : null;

                        if (outputUrl) {
                            setTimeout(() => {
                                setResult({
                                    originalUrl: originalUrl,
                                    upscaledUrl: outputUrl,
                                    scale: scale,
                                });
                                setAppState("complete");
                            }, 500);
                        } else {
                            setError("No output received from the AI model.");
                            setAppState("error");
                        }
                    }

                    if (data.status === "failed") {
                        stopPolling();
                        setError(data.error || "AI processing failed. Please try again.");
                        setAppState("error");
                    }

                    if (data.status === "canceled") {
                        stopPolling();
                        setAppState("idle");
                    }
                } catch (err) {
                    console.error("Polling error:", err);
                    // Don't stop polling on network errors — retry
                }
            }, 2000);
        },
        [stopPolling]
    );

    const handleUpload = useCallback(
        async (file: File, scale: number, faceEnhance: boolean) => {
            setAppState("uploading");
            setProcessingStatus("uploading");
            setError(null);
            abortRef.current = false;

            try {
                // Convert file to base64
                const base64 = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });

                // Create object URL for original preview
                const originalUrl = URL.createObjectURL(file);

                // Send to API
                const response = await fetch("/api/upscale", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        image: base64,
                        scale,
                        faceEnhance,
                    }),
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || "Failed to start upscaling");
                }

                setAppState("processing");
                pollPrediction(data.id, originalUrl, scale);
            } catch (err) {
                const message =
                    err instanceof Error ? err.message : "An unexpected error occurred";
                setError(message);
                setAppState("error");
            }
        },
        [pollPrediction]
    );

    const handleCancel = useCallback(() => {
        abortRef.current = true;
        stopPolling();
        setAppState("idle");
        setError(null);
    }, [stopPolling]);

    const handleReset = useCallback(() => {
        stopPolling();
        setAppState("idle");
        setResult(null);
        setError(null);
    }, [stopPolling]);

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
                                Powered by Real-ESRGAN AI
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
                {(appState === "idle" || appState === "uploading" || appState === "error") && (
                    <UploadZone
                        onUpload={handleUpload}
                        disabled={appState === "uploading"}
                    />
                )}

                {(appState === "uploading" || appState === "processing") && (
                    <ProcessingOverlay
                        status={processingStatus}
                        onCancel={handleCancel}
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
                    <span>Built with Next.js & Real-ESRGAN</span>
                    <span className="hidden sm:inline">•</span>
                    <span>Images are processed securely and never stored</span>
                </div>
            </footer>
        </main>
    );
}
