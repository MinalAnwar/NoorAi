/**
 * @file src/lib/rag/retrieval.ts
 * @description Advanced Hybrid Retrieval Engine for Noor AI.
 *
 * Uses the Supabase `hybrid_search_documents` RPC which combines:
 * 1. Semantic Vector Similarity (HNSW index on Ollama 768-dim embeddings)
 * 2. Keyword Matching (Postgres GIN index Full-Text Search)
 * 3. Reciprocal Rank Fusion (RRF) for optimal relevancy scoring
 */

import { supabase } from "../supabase/client";
import { generateEmbedding, expandQuery } from "../ai/ollama";
import type { RetrievalResult, CitationType } from "@/types";
import type { DocumentType } from "./types";

export interface RetrievalOptions {
  limit?: number;
  /** Minimum similarity threshold for results. Default 0.0 */
  threshold?: number;
  /** Focus search on specific source: 'all', 'quran', or 'hadith' */
  sourceFocus?: "all" | DocumentType;
  /** Filter by specific Surah number */
  surahFilter?: number;
  /** Filter by specific dataset source string (e.g., "Sahih al-Bukhari") */
  collectionFilter?: string;
  /** Weight between 0.0 (pure keyword) and 1.0 (pure semantic). Default 0.7 */
  semanticWeight?: number;
}

/**
 * Retrieve grounded sources for a given query using Hybrid Search.
 */
export async function retrieveGroundedSources(
  query: string,
  options: RetrievalOptions = {}
): Promise<RetrievalResult[]> {
  const {
    limit = 6,
    sourceFocus = "all",
    collectionFilter,
    semanticWeight = 0.7,
  } = options;

  try {
    // 0. Expand query to include synonyms/transliterations
    const expandedQuery = await expandQuery(query);
    console.log(`[retrieval] Original: "${query}", Expanded: "${expandedQuery}"`);

    // 1. Generate query embedding via local Ollama
    let queryEmbedding: number[] = [];
    try {
      queryEmbedding = await generateEmbedding(expandedQuery);
    } catch (err) {
      console.warn("[retrieval] Failed to generate vector embedding, falling back to pure keyword search.", err);
      // We pass a zero-vector if embedding fails, and set semanticWeight to 0 for pure FTS
      queryEmbedding = new Array(768).fill(0);
    }

    // 2. Resolve filters
    const filterType = sourceFocus === "all" ? null : sourceFocus;

    // 3. Execute hybrid search RPC on Supabase
    const { data, error } = await supabase.rpc("hybrid_search_documents", {
      query_text: expandedQuery,
      query_embedding: queryEmbedding,
      match_count: limit,
      filter_type: filterType,
      semantic_weight: queryEmbedding.some(v => v !== 0) ? semanticWeight : 0.0
    });

    if (error) {
      throw new Error(`Supabase RPC error: ${error.message}`);
    }

    // 4. Map DB result to application RetrievalResult format
    const results: RetrievalResult[] = (data || []).map((doc: any) => {
      
      // Construct user-friendly title and reference based on type
      let title = doc.source;
      let source_reference = doc.source;

      if (doc.type === "quran") {
        title = `Surah ${doc.metadata.surah_name_en} (${doc.metadata.surah_number}:${doc.metadata.ayah_number})`;
        source_reference = `Quran ${doc.metadata.surah_number}:${doc.metadata.ayah_number}`;
      } else if (doc.type === "hadith") {
        title = `${doc.source} Hadith #${doc.metadata.hadith_no || doc.metadata.hadith_id}`;
        source_reference = `${doc.source} #${doc.metadata.hadith_no || doc.metadata.hadith_id}`;
      }

      return {
        id: doc.id,
        type: doc.type as CitationType,
        title,
        text_arabic: doc.arabic,
        text_english: doc.content,
        source_reference,
        relevance_score: doc.rank_score, // Using the RRF rank score
        metadata: doc.metadata,
      };
    });

    // 5. Apply collection filter if strictly provided
    if (collectionFilter) {
      return results.filter(r => r.metadata.source === collectionFilter);
    }

    return results;

  } catch (error) {
    console.error("Critical error in hybrid retrieval engine:", error);
    return [];
  }
}
