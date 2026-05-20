/**
 * @file src/lib/rag/embed.ts
 * @description Reusable embedding orchestration utilities for the Noor AI RAG pipeline.
 *
 * Loads normalised JSON documents, generates Ollama embeddings in batches,
 * and produces EmbeddedDocument arrays ready for Supabase insertion.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import {
  generateEmbeddingsBatch,
  checkOllamaHealth,
} from "@/lib/ai/ollama";
import type {
  NormalizedDocument,
  EmbeddedDocument,
  ProcessingStats,
} from "@/lib/rag/types";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const DEFAULT_BATCH_SIZE = 50;
const DEFAULT_CONCURRENCY = 5;

// ---------------------------------------------------------------------------
// Core: embed a set of normalised documents
// ---------------------------------------------------------------------------

export interface EmbedOptions {
  /** Number of documents per processing batch (default 50) */
  batchSize?: number;
  /** Max parallel Ollama requests within a batch (default 5) */
  concurrency?: number;
  /** If true, skip documents that already have an embedding file */
  skipExisting?: boolean;
  /** Path to a checkpoint file for crash recovery */
  checkpointPath?: string;
}

/**
 * Pre-flight: ensure Ollama is up and the model is loaded.
 */
export async function validateOllamaReady(): Promise<void> {
  const health = await checkOllamaHealth();
  if (!health.healthy) {
    throw new Error(
      `[embed] Ollama is not ready — ${health.error}\n` +
        `  Base URL : ${health.baseUrl}\n` +
        `  Model    : ${health.model}\n` +
        `  Fix: run \`ollama pull ${health.model}\` and ensure the server is running.`,
    );
  }
  console.log(
    `✓ Ollama ready — model: ${health.model} @ ${health.baseUrl}`,
  );
}

/**
 * Embed an array of NormalizedDocuments.
 *
 * Processes in configurable batches and writes a checkpoint file
 * after each batch so the pipeline can resume after crashes.
 *
 * @returns Tuple of [embedded docs, processing stats]
 */
export async function embedDocuments(
  documents: NormalizedDocument[],
  options: EmbedOptions = {},
): Promise<[EmbeddedDocument[], ProcessingStats]> {
  const {
    batchSize = DEFAULT_BATCH_SIZE,
    concurrency = DEFAULT_CONCURRENCY,
    checkpointPath,
  } = options;

  const startTime = Date.now();
  const embedded: EmbeddedDocument[] = [];
  let succeeded = 0;
  let failed = 0;
  let skipped = 0;

  // Resume from checkpoint if available
  const completedIds = new Set<string>();
  if (checkpointPath && fs.existsSync(checkpointPath)) {
    const checkpointData: EmbeddedDocument[] = JSON.parse(
      fs.readFileSync(checkpointPath, "utf-8"),
    );
    for (const doc of checkpointData) {
      completedIds.add(doc.id);
      embedded.push(doc);
    }
    console.log(`↻ Resuming from checkpoint — ${completedIds.size} already embedded.`);
  }

  // Filter out already-completed documents
  const pending = documents.filter((d) => !completedIds.has(d.id));
  const total = pending.length;

  console.log(
    `\n╔══════════════════════════════════════════╗\n` +
      `║  Embedding ${total} documents (batch=${batchSize}, concurrency=${concurrency})\n` +
      `╚══════════════════════════════════════════╝\n`,
  );

  // Process in batches
  for (let i = 0; i < total; i += batchSize) {
    const batch = pending.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(total / batchSize);

    console.log(`\n─── Batch ${batchNum}/${totalBatches} (${batch.length} docs) ───`);

    const texts = batch.map((doc) => doc.content);
    const embeddings = await generateEmbeddingsBatch(texts, concurrency, (done, batchTotal) => {
      const globalDone = i + done;
      const pct = ((globalDone / total) * 100).toFixed(1);
      process.stdout.write(`\r  Progress: ${globalDone}/${total} (${pct}%)`);
    });
    process.stdout.write("\n");

    for (let j = 0; j < batch.length; j++) {
      const embedding = embeddings[j];
      if (embedding) {
        embedded.push({ ...batch[j], embedding });
        succeeded++;
      } else {
        console.warn(`  ⚠ Failed: ${batch[j].id}`);
        failed++;
      }
    }

    // Write checkpoint after each batch
    if (checkpointPath) {
      fs.writeFileSync(checkpointPath, JSON.stringify(embedded), "utf-8");
    }
  }

  const stats: ProcessingStats = {
    total: documents.length,
    succeeded,
    failed,
    skipped: completedIds.size + skipped,
    durationMs: Date.now() - startTime,
  };

  return [embedded, stats];
}

// ---------------------------------------------------------------------------
// File I/O helpers
// ---------------------------------------------------------------------------

/**
 * Load normalised documents from a JSON file.
 */
export function loadNormalizedDocuments(
  filePath: string,
): NormalizedDocument[] {
  if (!fs.existsSync(filePath)) {
    throw new Error(`[embed] File not found: ${filePath}`);
  }
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as NormalizedDocument[];
}

/**
 * Save embedded documents to a JSON file.
 */
export function saveEmbeddedDocuments(
  filePath: string,
  documents: EmbeddedDocument[],
): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(documents, null, 2), "utf-8");
  console.log(`\n✓ Saved ${documents.length} embedded documents → ${filePath}`);
}

/**
 * Print a summary table of processing stats.
 */
export function printStats(stats: ProcessingStats): void {
  const durationSec = (stats.durationMs / 1000).toFixed(1);
  const rate = stats.succeeded > 0 ? (stats.succeeded / (stats.durationMs / 1000)).toFixed(1) : "0";

  console.log(`
┌─────────────────────────────────────────┐
│         Embedding Pipeline Stats        │
├─────────────────────────────────────────┤
│  Total documents   : ${String(stats.total).padStart(8)}          │
│  Succeeded         : ${String(stats.succeeded).padStart(8)}          │
│  Failed            : ${String(stats.failed).padStart(8)}          │
│  Skipped           : ${String(stats.skipped).padStart(8)}          │
│  Duration          : ${durationSec.padStart(7)}s          │
│  Throughput        : ${rate.padStart(7)}/s          │
└─────────────────────────────────────────┘`);
}
