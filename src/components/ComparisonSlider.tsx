"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";

interface ComparisonSliderProps {
    beforeSrc: string;
    afterSrc: string;
    beforeLabel?: string;
    afterLabel?: string;
}

export default function ComparisonSlider({
    beforeSrc,
    afterSrc,
    beforeLabel = "Before",
    afterLabel = "After",
}: ComparisonSliderProps) {
    const [sliderPosition, setSliderPosition] = useState(50);
    const [isDragging, setIsDragging] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });

    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                setContainerDimensions({ width: rect.width, height: rect.height });
            }
        };

        updateDimensions();
        window.addEventListener("resize", updateDimensions);
        return () => window.removeEventListener("resize", updateDimensions);
    }, []);

    const handleMove = useCallback(
        (clientX: number) => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const x = clientX - rect.left;
            const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
            setSliderPosition(percentage);
        },
        []
    );

    const handleMouseDown = useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault();
            setIsDragging(true);
            handleMove(e.clientX);
        },
        [handleMove]
    );

    const handleTouchStart = useCallback(
        (e: React.TouchEvent) => {
            setIsDragging(true);
            handleMove(e.touches[0].clientX);
        },
        [handleMove]
    );

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                handleMove(e.clientX);
            }
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (isDragging) {
                handleMove(e.touches[0].clientX);
            }
        };

        const handleEnd = () => {
            setIsDragging(false);
        };

        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleEnd);
        document.addEventListener("touchmove", handleTouchMove);
        document.addEventListener("touchend", handleEnd);

        return () => {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleEnd);
            document.removeEventListener("touchmove", handleTouchMove);
            document.removeEventListener("touchend", handleEnd);
        };
    }, [isDragging, handleMove]);

    return (
        <div className="w-full max-w-4xl mx-auto animate-fade-in">
            <div
                ref={containerRef}
                className="relative rounded-2xl overflow-hidden border border-white/10 bg-black cursor-col-resize select-none"
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
                style={{ aspectRatio: "16/10" }}
            >
                {/* After Image (Full Width Background) */}
                <img
                    src={afterSrc}
                    alt="Upscaled"
                    className="absolute inset-0 w-full h-full object-contain"
                    draggable={false}
                />

                {/* Before Image (Clipped) */}
                <div
                    className="absolute inset-0 overflow-hidden"
                    style={{ width: `${sliderPosition}%` }}
                >
                    <img
                        src={beforeSrc}
                        alt="Original"
                        className="absolute inset-0 w-full h-full object-contain"
                        style={{
                            width: containerDimensions.width ? `${containerDimensions.width}px` : "100%",
                            maxWidth: "none",
                        }}
                        draggable={false}
                    />
                </div>

                {/* Slider Line */}
                <div
                    className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg z-10"
                    style={{ left: `${sliderPosition}%`, transform: "translateX(-50%)" }}
                >
                    {/* Handle */}
                    <div
                        className={`
              absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
              w-10 h-10 rounded-full bg-white shadow-xl
              flex items-center justify-center
              transition-transform duration-150
              ${isDragging ? "scale-110" : "hover:scale-110"}
            `}
                    >
                        <div className="flex items-center gap-0.5">
                            <svg width="6" height="14" viewBox="0 0 6 14" fill="none">
                                <path d="M5 1L1 7L5 13" stroke="#0a0a0f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <svg width="6" height="14" viewBox="0 0 6 14" fill="none">
                                <path d="M1 1L5 7L1 13" stroke="#0a0a0f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                    </div>
                </div>

                {/* Labels */}
                <div className="absolute top-4 left-4 z-20">
                    <span className="px-3 py-1.5 rounded-lg bg-black/70 backdrop-blur-sm text-xs font-semibold text-zinc-300 border border-white/10">
                        {beforeLabel}
                    </span>
                </div>
                <div className="absolute top-4 right-4 z-20">
                    <span className="px-3 py-1.5 rounded-lg bg-violet-600/80 backdrop-blur-sm text-xs font-semibold text-white border border-violet-500/30">
                        {afterLabel}
                    </span>
                </div>
            </div>
        </div>
    );
}
