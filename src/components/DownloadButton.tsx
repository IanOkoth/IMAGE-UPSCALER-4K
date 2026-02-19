"use client";

import React, { useState } from "react";
import { Download, Check, Loader2 } from "lucide-react";

interface DownloadButtonProps {
    imageUrl: string;
    filename?: string;
}

export default function DownloadButton({
    imageUrl,
    filename = "upscaled-4k.png",
}: DownloadButtonProps) {
    const [state, setState] = useState<"idle" | "downloading" | "done">("idle");

    const handleDownload = async () => {
        try {
            setState("downloading");

            const response = await fetch(imageUrl);
            const blob = await response.blob();

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            setState("done");
            setTimeout(() => setState("idle"), 3000);
        } catch (error) {
            console.error("Download failed:", error);
            setState("idle");
        }
    };

    return (
        <button
            onClick={handleDownload}
            disabled={state === "downloading"}
            className={`
        inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl font-semibold text-sm
        transition-all duration-300 relative overflow-hidden group
        ${state === "done"
                    ? "bg-green-600 text-white shadow-lg shadow-green-500/25"
                    : state === "downloading"
                        ? "bg-violet-700 text-white cursor-wait"
                        : "bg-gradient-to-r from-violet-600 to-violet-500 text-white shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:from-violet-500 hover:to-violet-400 hover:scale-[1.02] active:scale-[0.98]"
                }
      `}
        >
            {state === "downloading" ? (
                <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Downloading...
                </>
            ) : state === "done" ? (
                <>
                    <Check className="w-4 h-4" />
                    Downloaded!
                </>
            ) : (
                <>
                    <Download className="w-4 h-4" />
                    Download 4K Image
                </>
            )}

            {/* Shimmer effect */}
            {state === "idle" && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            )}
        </button>
    );
}
