import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "UpScale AI — 4K Image Upscaler",
    description:
        "Transform blurry, low-resolution images into stunning 4K quality using AI-powered Real-ESRGAN upscaling. Free, fast, and powered by cloud GPU.",
    keywords: ["image upscaler", "AI upscale", "4K", "Real-ESRGAN", "enhance images", "super resolution"],
    openGraph: {
        title: "UpScale AI — 4K Image Upscaler",
        description: "Transform blurry images into stunning 4K quality with AI.",
        type: "website",
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className="antialiased">
                {/* Background effects */}
                <div className="noise-overlay" />
                <div className="gradient-orb gradient-orb-1" />
                <div className="gradient-orb gradient-orb-2" />

                {/* Content */}
                <div className="relative z-10">{children}</div>
            </body>
        </html>
    );
}
