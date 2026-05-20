/**
 * @file src/lib/ai/ollama.ts
 * @description Production-grade Ollama client for local embedding generation.
 *
 * Talks to the Ollama REST API (default: http://localhost:11434).
 * Implements retry logic with exponential backoff, request timeout,
 * and batch-level concurrency control.
 */

import type { OllamaEmbedResponse } from "@/lib/rag/types";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
const OLLAMA_EMBED_MODEL = process.env.OLLAMA_EMBED_MODEL ?? "nomic-embed-text";
const OLLAMA_TIMEOUT_MS = Number(process.env.OLLAMA_TIMEOUT_MS ?? 30_000);

const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 500;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Sleep helper for back-off delays */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Sanitize text before embedding — strip newlines, collapse whitespace */
function sanitize(text: string): string {
  return text.replace(/\r?\n/g, " ").replace(/\s+/g, " ").trim();
}

// ---------------------------------------------------------------------------
// Core: single embedding request
// ---------------------------------------------------------------------------

/**
 * Generate a 768-dim embedding vector for a single text string via Ollama.
 *
 * @param text  The English text to embed.
 * @param model Override the default embedding model.
 * @returns     768-dimensional float array.
 */
export async function generateEmbedding(
  text: string,
  model: string = OLLAMA_EMBED_MODEL,
): Promise<number[]> {
  const prompt = sanitize(text);
  if (!prompt) {
    throw new Error("[ollama] Cannot embed empty text.");
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS);

      const res = await fetch(`${OLLAMA_BASE_URL}/api/embeddings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, prompt }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(
          `[ollama] HTTP ${res.status}: ${res.statusText} — ${body}`,
        );
      }

      const data: OllamaEmbedResponse = await res.json();

      if (!data.embedding || !Array.isArray(data.embedding)) {
        throw new Error("[ollama] Response missing 'embedding' field.");
      }

      return data.embedding;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      // Don't retry on client-side validation errors
      if (lastError.message.includes("Cannot embed empty text")) throw lastError;

      if (attempt < MAX_RETRIES) {
        const delay = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
        console.warn(
          `[ollama] Attempt ${attempt + 1}/${MAX_RETRIES + 1} failed. Retrying in ${delay}ms…`,
        );
        await sleep(delay);
      }
    }
  }

  throw lastError ?? new Error("[ollama] Embedding generation failed.");
}

// ---------------------------------------------------------------------------
// Batch embedding with concurrency control
// ---------------------------------------------------------------------------

/**
 * Generate embeddings for an array of texts with bounded concurrency.
 *
 * @param texts       Array of English strings to embed.
 * @param concurrency Max parallel requests to Ollama.
 * @param onProgress  Optional callback fired after each completed embedding.
 * @returns           Array of 768-dim vectors in the same order as `texts`.
 */
export async function generateEmbeddingsBatch(
  texts: string[],
  concurrency: number = 5,
  onProgress?: (completed: number, total: number) => void,
): Promise<(number[] | null)[]> {
  const results: (number[] | null)[] = new Array(texts.length).fill(null);
  let completed = 0;

  // Process in concurrency-limited chunks
  for (let i = 0; i < texts.length; i += concurrency) {
    const chunk = texts.slice(i, i + concurrency);
    const promises = chunk.map(async (text, idx) => {
      const globalIdx = i + idx;
      try {
        results[globalIdx] = await generateEmbedding(text);
      } catch (err) {
        console.error(
          `[ollama] Failed to embed text at index ${globalIdx}: ${err instanceof Error ? err.message : err}`,
        );
        results[globalIdx] = null;
      } finally {
        completed++;
        onProgress?.(completed, texts.length);
      }
    });

    await Promise.all(promises);
  }

  return results;
}

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

/**
 * Quick health check — verifies Ollama is reachable and the embed model is loaded.
 */
export async function checkOllamaHealth(): Promise<{
  healthy: boolean;
  model: string;
  baseUrl: string;
  error?: string;
}> {
  const model = OLLAMA_EMBED_MODEL;
  const baseUrl = OLLAMA_BASE_URL;

  try {
    const res = await fetch(`${baseUrl}/api/tags`, { method: "GET" });
    if (!res.ok) {
      return { healthy: false, model, baseUrl, error: `HTTP ${res.status}` };
    }

    const data = await res.json();
    const models: { name: string }[] = data.models ?? [];
    const found = models.some(
      (m) => m.name === model || m.name.startsWith(`${model}:`),
    );

    if (!found) {
      return {
        healthy: false,
        model,
        baseUrl,
        error: `Model "${model}" not found. Available: ${models.map((m) => m.name).join(", ")}`,
      };
    }

    return { healthy: true, model, baseUrl };
  } catch (err) {
    return {
      healthy: false,
      model,
      baseUrl,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
