import { NextRequest, NextResponse } from "next/server";
import { retrieveGroundedSources } from "@/lib/rag/retrieval";

/**
 * GET /api/search
 * Core API route for hybrid keyword and vector semantic search.
 * Handles inputs, limits, thresholds, and returns grounded Quran and Hadith sources.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim() || "";
    const sourceFocus = (searchParams.get("source") || "all") as "all" | "quran" | "hadith";
    const limit = parseInt(searchParams.get("limit") || "6", 10);
    const threshold = parseFloat(searchParams.get("threshold") || "0.35");
    const surahFilter = searchParams.get("surah") ? parseInt(searchParams.get("surah")!, 10) : undefined;
    const collectionFilter = searchParams.get("collection") || undefined;

    // 1. Input Validation
    if (!query) {
      return NextResponse.json(
        { error: "Query parameter 'q' is required." },
        { status: 400 }
      );
    }

    if (query.length > 300) {
      return NextResponse.json(
        { error: "Query is too long. Maximum query length is 300 characters." },
        { status: 400 }
      );
    }

    // Validate enum boundaries
    if (!["all", "quran", "hadith"].includes(sourceFocus)) {
      return NextResponse.json(
        { error: "Invalid source focus value. Must be 'all', 'quran', or 'hadith'." },
        { status: 400 }
      );
    }

    // 2. Execute Hybrid Retrieval
    const results = await retrieveGroundedSources(query, {
      limit,
      threshold,
      sourceFocus,
      surahFilter,
      collectionFilter,
    });

    // 3. Return Clean JSON Response
    return NextResponse.json(
      {
        query,
        sourceFocus,
        totalResults: results.length,
        results,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=600",
        },
      }
    );
  } catch (error) {
    console.error("API error in /api/search Route Handler:", error);
    return NextResponse.json(
      {
        error: "An unexpected error occurred while performing search.",
        message: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
