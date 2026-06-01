import type { Metadata } from "next";
import { Geist, Geist_Mono, Amiri } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const amiri = Amiri({
  variable: "--font-amiri",
  weight: ["400", "700"],
  subsets: ["arabic"],
});

export const metadata: Metadata = {
  title: "Noor AI | Intelligent Quranic & Hadith Retrieval",
  description: "Experience Noor AI, a state-of-the-art AI-powered Islamic retrieval and guided answer engine. Grounded in the Holy Quran and authentic Hadiths with vector embeddings, semantic search, and precise source citations.",
  keywords: ["Quran search", "Hadith retrieval", "Islamic AI", "RAG application", "Semantic search", "Grounded AI answers"],
  authors: [{ name: "Noor AI Engineering" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${amiri.variable} dark scroll-smooth`}
    >
      <body className="min-h-[100dvh] bg-[#09090b] text-zinc-100 antialiased selection:bg-emerald-500/30 selection:text-emerald-100 flex flex-col relative">
        {/* Grain Noise Overlay for Premium Texture (Hardware Accelerated) */}
        <div className="fixed inset-0 z-50 noise-overlay pointer-events-none" />

        {/* Global Mesh Gradient Background */}
        <div className="fixed inset-0 -z-10 mesh-gradient pointer-events-none" />
        
        <main className="flex-1 flex flex-col relative z-10">
          <AuthProvider>
            {children}
          </AuthProvider>
        </main>
      </body>
    </html>
  );
}
