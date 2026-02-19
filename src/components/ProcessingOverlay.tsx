"use client";

import React, { useEffect, useState } from "react";
import { Loader2, Cpu, Zap, X } from "lucide-react";

interface ProcessingOverlayProps {
    status: string;
    onCancel?: () => void;
}

const STAGES = [
    { key: "uploading", label: "Uploading image...", icon: Loader2, progress: 15 },
    { key: "starting", label: "Starting GPU instance...", icon: Cpu, progress: 30 },
    { key: "processing", label: "Upscaling on cloud GPU...", icon: Zap, progress: 65 },
    { key: "succeeded", label: "Finalizing...", icon: Zap, progress: 95 },
];

export default function ProcessingOverlay({ status, onCancel }: ProcessingOverlayProps) {
    const [elapsed, setElapsed] = useState(0);
    const [displayProgress, setDisplayProgress] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setElapsed((prev) => prev + 1);
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Determine target progress based on status
    const currentStage =
        STAGES.find((s) => status.toLowerCase().includes(s.key)) || STAGES[0];

    useEffect(() => {
        // Smoothly animate progress toward target
        const target = currentStage.progress;
        const interval = setInterval(() => {
            setDisplayProgress((prev) => {
                if (prev >= target) return target;
                const step = Math.max(0.5, (target - prev) * 0.1);
                return Math.min(prev + step, target);
            });
        }, 100);
        return () => clearInterval(interval);
    }, [currentStage.progress]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    const StageIcon = currentStage.icon;

    return (
        <div className="w-full max-w-2xl mx-auto animate-fade-in">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-8">
                {/* Animated Icon */}
                <div className="flex justify-center mb-6">
                    <div className="relative">
                        <div className="absolute inset-0 rounded-full bg-violet-500/20 animate-ping" />
                        <div className="relative p-4 rounded-full bg-gradient-to-br from-violet-600/30 to-cyan-500/30 border border-violet-500/30">
                            <StageIcon className="w-8 h-8 text-violet-400 animate-spin" style={{ animationDuration: "3s" }} />
                        </div>
                    </div>
                </div>

                {/* Status Text */}
                <div className="text-center mb-6">
                    <h3 className="text-lg font-semibold text-white mb-1">
                        {currentStage.label}
                    </h3>
                    <p className="text-sm text-zinc-500">
                        Elapsed: {formatTime(elapsed)}
                    </p>
                </div>

                {/* Progress Bar */}
                <div className="relative mb-6">
                    <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                        <div
                            className="h-full rounded-full bg-gradient-to-r from-violet-600 via-violet-500 to-cyan-400 transition-all duration-300 ease-out relative"
                            style={{ width: `${displayProgress}%` }}
                        >
                            {/* Shimmer effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                        </div>
                    </div>
                    <div className="flex justify-between mt-2">
                        <span className="text-xs text-zinc-500">{Math.round(displayProgress)}%</span>
                        <span className="text-xs text-zinc-500">Processing on cloud GPU</span>
                    </div>
                </div>

                {/* Stage Indicators */}
                <div className="grid grid-cols-3 gap-2 mb-6">
                    {STAGES.slice(0, 3).map((stage, i) => {
                        const isActive =
                            currentStage.progress >= stage.progress;
                        const isCurrent = currentStage.key === stage.key;
                        return (
                            <div
                                key={stage.key}
                                className={`
                  flex items-center gap-2 px-3 py-2 rounded-lg text-xs
                  transition-all duration-300
                  ${isCurrent
                                        ? "bg-violet-500/15 text-violet-300 border border-violet-500/30"
                                        : isActive
                                            ? "bg-white/[0.03] text-zinc-400"
                                            : "bg-white/[0.02] text-zinc-600"
                                    }
                `}
                            >
                                <div
                                    className={`w-1.5 h-1.5 rounded-full ${isCurrent
                                            ? "bg-violet-400 animate-glow-pulse"
                                            : isActive
                                                ? "bg-green-400"
                                                : "bg-zinc-700"
                                        }`}
                                />
                                <span className="truncate">{stage.label.replace("...", "")}</span>
                            </div>
                        );
                    })}
                </div>

                {/* Cancel Button */}
                {onCancel && (
                    <button
                        onClick={onCancel}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm text-zinc-500 hover:text-red-400 hover:bg-red-500/5 border border-transparent hover:border-red-500/20 transition-all duration-200"
                    >
                        <X className="w-3.5 h-3.5" />
                        Cancel
                    </button>
                )}
            </div>
        </div>
    );
}
