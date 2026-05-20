/**
 * Represents a Quranic verse in the database and application layer.
 */
export interface QuranVerse {
  id: string;
  surah_number: number;
  verse_number: number;
  text_arabic: string;
  text_english: string;
  surah_name_english: string;
  surah_name_arabic: string;
  juz: number;
  revelation_place: "makkah" | "madinah";
  embedding?: number[];
  metadata?: Record<string, any>;
}

/**
 * Represents a Hadith text in the database and application layer.
 */
export interface Hadith {
  id: string;
  collection: string; // e.g., "Sahih al-Bukhari", "Sahih Muslim"
  book_number: string;
  book_name: string;
  hadith_number: string;
  text_arabic: string;
  text_english: string;
  narrator_english: string;
  narrator_arabic?: string;
  grade?: string; // e.g., "Sahih", "Hasan", "Da'if"
  embedding?: number[];
  metadata?: Record<string, any>;
}

/**
 * Type representing the source category for RAG citations.
 */
export type CitationType = "quran" | "hadith";

/**
 * Represents a citation reference grounded in the AI answer.
 */
export interface Citation {
  id: string;
  type: CitationType;
  title: string; // e.g., "Surah Al-Fatihah 1:1" or "Sahih al-Bukhari Hadith #42"
  text_arabic: string;
  text_english: string;
  source_reference: string; // e.g., "Quran 1:1" or "Bukhari #42"
  relevance_score: number;
  metadata: Record<string, any>;
}

/**
 * Represents a single message in the chat history.
 */
export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  citations?: Citation[];
  timestamp: string;
  isStreaming?: boolean;
}

/**
 * Represents the results returned by our hybrid retrieval engine.
 */
export interface RetrievalResult extends Citation {}

/**
 * API Request payload for RAG chat.
 */
export interface ChatRequest {
  messages: Message[];
  stream?: boolean;
  focusSource?: "all" | "quran" | "hadith";
}

/**
 * API Response payload for semantic search.
 */
export interface SearchResponse {
  query: string;
  results: RetrievalResult[];
}
