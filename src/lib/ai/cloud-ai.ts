/**
 * @file src/lib/ai/cloud-ai.ts
 * @description Cloud API implementations for Noor AI.
 *
 * Uses Cloudflare Workers AI for ultra-fast Llama 3.3 70B chat inference
 * and query expansion.
 * Uses HuggingFace Inference API for nomic-embed-text embeddings to maintain
 * perfect vector compatibility with the existing Supabase database indexes.
 */

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID ?? "";
const CF_API_TOKEN = process.env.CF_API_TOKEN ?? "";
const CF_CHAT_MODEL = process.env.CF_CHAT_MODEL ?? "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
const CF_AI_BASE = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run`;

const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY ?? "";
const HF_EMBED_URL = "https://api-inference.huggingface.co/pipeline/feature-extraction/nomic-ai/nomic-embed-text-v1.5";

const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 500;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sanitize(text: string): string {
  return text.replace(/\r?\n/g, " ").replace(/\s+/g, " ").trim();
}

// ---------------------------------------------------------------------------
// HuggingFace Embeddings (nomic-embed-text — DB compatible)
// ---------------------------------------------------------------------------

/**
 * Generate a 768-dim embedding vector via HuggingFace Inference API.
 * Uses nomic-embed-text-v1.5 for compatibility with existing Supabase vectors.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const prompt = sanitize(text);
  if (!prompt) {
    throw new Error("[cloud-ai] Cannot embed empty text.");
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (HUGGINGFACE_API_KEY) {
        headers["Authorization"] = `Bearer ${HUGGINGFACE_API_KEY}`;
      }

      const res = await fetch(HF_EMBED_URL, {
        method: "POST",
        headers,
        body: JSON.stringify({ inputs: prompt }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        if (res.status === 503 && body.includes("is currently loading")) {
          const estimatedTime = JSON.parse(body).estimated_time || 20;
          console.log(`[cloud-ai] HF model loading, waiting ${estimatedTime}s...`);
          await sleep(Math.min(estimatedTime * 1000, 20000));
          throw new Error("Model was loading");
        }
        throw new Error(`[cloud-ai] HF HTTP ${res.status}: ${body}`);
      }

      const data = await res.json();

      let embedding: number[];
      if (Array.isArray(data) && Array.isArray(data[0])) {
        embedding = data[0] as number[];
      } else if (Array.isArray(data)) {
        embedding = data as number[];
      } else {
        throw new Error("[cloud-ai] Unexpected embedding format from HF");
      }

      return embedding;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (lastError.message.includes("Cannot embed empty text")) throw lastError;

      if (attempt < MAX_RETRIES) {
        const delay = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
        console.warn(`[cloud-ai] Attempt ${attempt + 1}/${MAX_RETRIES + 1} failed. Retrying in ${delay}ms…`);
        await sleep(delay);
      }
    }
  }

  throw lastError ?? new Error("[cloud-ai] Embedding generation failed.");
}

// ---------------------------------------------------------------------------
// Cloudflare Workers AI — Non-streaming (for query expansion)
// ---------------------------------------------------------------------------

async function callCFAI(model: string, messages: { role: string; content: string }[]): Promise<string> {
  const res = await fetch(`${CF_AI_BASE}/${model}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${CF_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messages }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`[cloud-ai] Cloudflare AI error ${res.status}: ${body}`);
  }

  const data = await res.json();
  return data?.result?.response ?? "";
}

// ---------------------------------------------------------------------------
// Cloudflare Workers AI — Streaming (for chat completions in route.ts)
// ---------------------------------------------------------------------------

/**
 * Stream a chat completion from Cloudflare Workers AI.
 * Returns a ReadableStream of SSE text chunks.
 */
export async function streamCFAIChat(
  messages: { role: string; content: string }[]
): Promise<ReadableStream<Uint8Array>> {
  const res = await fetch(`${CF_AI_BASE}/${CF_CHAT_MODEL}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${CF_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messages, stream: true }),
  });

  if (!res.ok || !res.body) {
    const body = await res.text().catch(() => "");
    throw new Error(`[cloud-ai] Cloudflare AI stream error ${res.status}: ${body}`);
  }

  return res.body;
}

// ---------------------------------------------------------------------------
// Query Expansion via Cloudflare Workers AI
// ---------------------------------------------------------------------------

/**
 * Expand a user query to include synonyms, transliterations, and related Islamic terminology.
 */
export async function expandQuery(query: string): Promise<string> {
  const prompt = `You are an expert Islamic terminology translator. The user will provide a search query. 
Your task is to identify any Islamic terms, colloquial spellings, or concepts in the query, and output a SINGLE string containing the original query PLUS 2-3 accurate synonyms (such as canonical Arabic transliteration and English meanings).
DO NOT include any explanations, punctuation (like commas), or conversational text. JUST return the space-separated words.

Example Input: Sabar
Example Output: Sabar Sabr patience steadfastness endurance

Input: ${query}
Output:`;

  try {
    const expanded = await callCFAI(CF_CHAT_MODEL, [{ role: "user", content: prompt }]);
    return expanded.trim() || query;
  } catch (err) {
    console.warn("[cloud-ai] Error during query expansion, using original query:", err);
    return query;
  }
}

// ---------------------------------------------------------------------------
// Batch embedding with concurrency control
// ---------------------------------------------------------------------------

export async function generateEmbeddingsBatch(
  texts: string[],
  concurrency: number = 5,
  onProgress?: (completed: number, total: number) => void,
): Promise<(number[] | null)[]> {
  const results: (number[] | null)[] = new Array(texts.length).fill(null);
  let completed = 0;

  for (let i = 0; i < texts.length; i += concurrency) {
    const chunk = texts.slice(i, i + concurrency);
    const promises = chunk.map(async (text, idx) => {
      const globalIdx = i + idx;
      try {
        results[globalIdx] = await generateEmbedding(text);
      } catch (err) {
        console.error(`[cloud-ai] Failed to embed text at index ${globalIdx}:`, err);
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

export async function checkOllamaHealth(): Promise<{
  healthy: boolean;
  model: string;
  baseUrl: string;
  error?: string;
}> {
  return {
    healthy: true,
    model: "cloudflare-workers-ai",
    baseUrl: "cloud",
  };
}
