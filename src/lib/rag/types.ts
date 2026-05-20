/**
 * @file src/lib/rag/types.ts
 * @description Core type definitions for the Noor AI RAG ingestion pipeline.
 *
 * Covers the normalized document structure, Ollama embedding payloads,
 * and Supabase vector insertion contracts.
 */

// ---------------------------------------------------------------------------
// Document type discriminator
// ---------------------------------------------------------------------------

export type DocumentType = "quran" | "hadith";

// ---------------------------------------------------------------------------
// Raw CSV row shapes (typed from the actual file headers)
// ---------------------------------------------------------------------------

/** Columns present in: public/datasets/raw/quran/The Quran Dataset.csv */
export interface RawQuranRow {
  surah_no: string;
  surah_name_en: string;
  surah_name_ar: string;
  surah_name_roman: string;
  ayah_no_surah: string;
  ayah_no_quran: string;
  ayah_ar: string;
  ayah_en: string;
  ruko_no: string;
  juz_no: string;
  manzil_no: string;
  hizb_quarter: string;
  total_ayah_surah: string;
  total_ayah_quran: string;
  place_of_revelation: string;
  sajah_ayah: string;
  sajdah_no: string;
  no_of_word_ayah: string;
  list_of_words: string;
}

/** Columns present in: public/datasets/raw/hadith/all_hadiths_clean.csv */
export interface RawHadithRow {
  id: string;
  hadith_id: string;
  source: string;
  chapter_no: string;
  hadith_no: string;
  chapter: string;
  chain_indx: string;
  text_ar: string;
  text_en: string;
}

// ---------------------------------------------------------------------------
// Normalized document — unified shape for both Quran and Hadith
// ---------------------------------------------------------------------------

/** Quran-specific metadata stored in the JSONB column */
export interface QuranMetadata {
  surah_number: number;
  surah_name_en: string;
  surah_name_ar: string;
  surah_name_roman: string;
  ayah_number: number;
  ayah_number_quran: number;
  juz: number;
  place_of_revelation: "Meccan" | "Medinan" | string;
  is_sajdah: boolean;
}

/** Hadith-specific metadata stored in the JSONB column */
export interface HadithMetadata {
  hadith_id: string;
  source: string;
  chapter_no: number;
  hadith_no: string;
  chapter: string;
  chain_indx: string;
}

/** Canonical normalized document — single shape stored in processed JSON and Supabase */
export interface NormalizedDocument {
  /** Deterministic identifier: "quran-{surah}-{ayah}" or "hadith-{source}-{id}" */
  id: string;
  type: DocumentType;
  /** Dataset source label, e.g. "The Quran Dataset" | "Sahih Bukhari" */
  source: string;
  /** English text used as the embedding input */
  content: string;
  /** Arabic text for display only — NOT embedded */
  arabic: string;
  metadata: QuranMetadata | HadithMetadata;
}

// ---------------------------------------------------------------------------
// Embedding payload shapes
// ---------------------------------------------------------------------------

/** A document that has been enriched with its vector embedding */
export interface EmbeddedDocument extends NormalizedDocument {
  embedding: number[];
}

/** Ollama REST API request body for /api/embeddings */
export interface OllamaEmbedRequest {
  model: string;
  prompt: string;
}

/** Ollama REST API response body */
export interface OllamaEmbedResponse {
  embedding: number[];
}

// ---------------------------------------------------------------------------
// Supabase insertion row shape
// ---------------------------------------------------------------------------

/** Row structure for the `documents` table (vector dim = 768) */
export interface DocumentRow {
  id: string;
  type: DocumentType;
  source: string;
  content: string;
  arabic: string;
  metadata: QuranMetadata | HadithMetadata;
  embedding: number[];
}

// ---------------------------------------------------------------------------
// Pipeline result types
// ---------------------------------------------------------------------------

export interface ProcessingStats {
  total: number;
  succeeded: number;
  failed: number;
  skipped: number;
  durationMs: number;
}

export interface BatchResult {
  inserted: number;
  errors: string[];
}
