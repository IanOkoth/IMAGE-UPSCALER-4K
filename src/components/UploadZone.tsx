"use client";

import React, { useCallback, useState, useRef } from "react";
import { Upload, Image as ImageIcon, AlertCircle, X, Sparkles } from "lucide-react";

interface UploadZoneProps {
    onUpload: (file: File, scale: number, faceEnhance: boolean) => void;
    disabled?: boolean;
}

export default function UploadZone({ onUpload, disabled }: UploadZoneProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [preview, setPreview] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [scale, setScale] = useState<number>(4);
    const [faceEnhance, setFaceEnhance] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    const MAX_SIZE_MB = 10;

    const validateFile = (file: File): string | null => {
        if (!ACCEPTED_TYPES.includes(file.type)) {
            return "Invalid file type. Please upload a JPEG, PNG, or WebP image.";
        }
        if (file.size > MAX_SIZE_MB * 1024 * 1024) {
            return `File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds the ${MAX_SIZE_MB}MB limit.`;
        }
        return null;
    };

    const handleFile = useCallback((file: File) => {
        setError(null);
        const validationError = validateFile(file);
        if (validationError) {
            setError(validationError);
            return;
        }

        setSelectedFile(file);
        const reader = new FileReader();
        reader.onload = (e) => {
            setPreview(e.target?.result as string);
        };
        reader.readAsDataURL(file);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(false);

            const files = e.dataTransfer.files;
            if (files.length > 0) {
                handleFile(files[0]);
            }
        },
        [handleFile]
    );

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            handleFile(files[0]);
        }
    };

    const handleUpload = () => {
        if (selectedFile) {
            onUpload(selectedFile, scale, faceEnhance);
        }
    };

    const clearSelection = () => {
        setSelectedFile(null);
        setPreview(null);
        setError(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto animate-fade-in">
            {!preview ? (
                /* Drop Zone */
                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`
            relative group cursor-pointer rounded-2xl border-2 border-dashed p-12
            transition-all duration-300 ease-out
            ${isDragging
                            ? "border-violet-500 bg-violet-500/10 scale-[1.02]"
                            : "border-white/20 hover:border-violet-500/60 bg-white/[0.03] hover:bg-white/[0.06]"
                        }
            ${disabled ? "opacity-50 pointer-events-none" : ""}
          `}
                >
                    {/* Glow effect */}
                    <div
                        className={`
              absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300
              bg-gradient-to-r from-violet-600/20 via-cyan-500/20 to-violet-600/20
              ${isDragging ? "opacity-100" : "group-hover:opacity-50"}
            `}
                    />

                    <div className="relative flex flex-col items-center gap-4 text-center">
                        <div
                            className={`
                p-4 rounded-2xl transition-all duration-300
                ${isDragging ? "bg-violet-500/20 scale-110" : "bg-white/5 group-hover:bg-violet-500/10"}
              `}
                        >
                            <Upload
                                className={`w-10 h-10 transition-colors duration-300 ${isDragging ? "text-violet-400" : "text-zinc-400 group-hover:text-violet-400"
                                    }`}
                            />
                        </div>

                        <div>
                            <p className="text-lg font-semibold text-white mb-1">
                                {isDragging ? "Drop your image here" : "Drag & drop your image"}
                            </p>
                            <p className="text-sm text-zinc-400">
                                or{" "}
                                <span className="text-violet-400 hover:text-violet-300 underline underline-offset-2">
                                    browse files
                                </span>
                            </p>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                            <ImageIcon className="w-3.5 h-3.5" />
                            <span>JPEG, PNG, WebP • Max 10MB</span>
                        </div>
                    </div>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleFileSelect}
                        className="hidden"
                    />
                </div>
            ) : (
                /* Preview & Settings */
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm overflow-hidden">
                    {/* Image Preview */}
                    <div className="relative group">
                        <img
                            src={preview}
                            alt="Preview"
                            className="w-full max-h-72 object-contain bg-black/40"
                        />
                        <button
                            onClick={clearSelection}
                            className="absolute top-3 right-3 p-1.5 rounded-full bg-black/60 hover:bg-red-500/80 text-white transition-colors duration-200"
                        >
                            <X className="w-4 h-4" />
                        </button>
                        <div className="absolute bottom-3 left-3 px-3 py-1 rounded-full bg-black/60 text-xs text-zinc-300 backdrop-blur-sm">
                            {selectedFile?.name} • {(selectedFile!.size / (1024 * 1024)).toFixed(1)}MB
                        </div>
                    </div>

                    {/* Settings */}
                    <div className="p-6 space-y-5">
                        {/* Scale Selector */}
                        <div>
                            <label className="block text-sm font-medium text-zinc-300 mb-2.5">
                                Upscale Factor
                            </label>
                            <div className="flex gap-2">
                                {[2, 4].map((s) => (
                                    <button
                                        key={s}
                                        onClick={() => setScale(s)}
                                        className={`
                      flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200
                      ${scale === s
                                                ? "bg-violet-600 text-white shadow-lg shadow-violet-500/25"
                                                : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white"
                                            }
                    `}
                                    >
                                        {s}× Upscale
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Face Enhance Toggle */}
                        <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5">
                            <div className="flex items-center gap-2.5">
                                <Sparkles className="w-4 h-4 text-cyan-400" />
                                <span className="text-sm text-zinc-300">Face Enhancement</span>
                            </div>
                            <button
                                onClick={() => setFaceEnhance(!faceEnhance)}
                                className={`
                  relative w-11 h-6 rounded-full transition-colors duration-200
                  ${faceEnhance ? "bg-cyan-500" : "bg-zinc-700"}
                `}
                            >
                                <span
                                    className={`
                    absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md
                    transition-transform duration-200
                    ${faceEnhance ? "translate-x-5" : "translate-x-0"}
                  `}
                                />
                            </button>
                        </div>

                        {/* Upload Button */}
                        <button
                            onClick={handleUpload}
                            disabled={disabled}
                            className={`
                w-full py-3.5 rounded-xl font-semibold text-white text-sm
                transition-all duration-300 relative overflow-hidden group
                ${disabled
                                    ? "bg-zinc-800 cursor-not-allowed opacity-50"
                                    : "bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-[1.02] active:scale-[0.98]"
                                }
              `}
                        >
                            <span className="relative z-10 flex items-center justify-center gap-2">
                                <Sparkles className="w-4 h-4" />
                                Upscale Image to {scale === 4 ? "4K" : "2K"}
                            </span>
                            {!disabled && (
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="mt-4 flex items-center gap-2.5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-fade-in">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}
        </div>
    );
}
