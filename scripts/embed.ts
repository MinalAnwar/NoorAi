#!/usr/bin/env ts-node
/**
 * @file scripts/embed.ts
 * @description End-to-end RAG ingestion pipeline for Noor AI.
 *
 * Pipeline: processed JSON → Ollama embeddings → Supabase pgvector insertion.
 *
 * Usage:
 *   npx ts-node --project tsconfig.json -r tsconfig-paths/register scripts/embed.ts
 *   npx ts-node --project tsconfig.json -r tsconfig-paths/register scripts/embed.ts --type quran
 *   npx ts-node --project tsconfig.json -r tsconfig-paths/register scripts/embed.ts --type hadith
 *   npx ts-node --project tsconfig.json -r tsconfig-paths/register scripts/embed.ts --dry-run
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as dotenv from "dotenv";

// Load environment variables before anything else
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config();

import type {
  NormalizedDocument,
  EmbeddedDocument,
  DocumentType,
  BatchResult,
} from "../src/lib/rag/types";
import {
  validateOllamaReady,
  embedDocuments,
  loadNormalizedDocuments,
  saveEmbeddedDocuments,
  printStats,
} from "../src/lib/rag/embed";
import { createAdminClient } from "../src/lib/supabase/client";

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const ROOT = path.resolve(__dirname, "..");
const PROCESSED_DIR = path.join(ROOT, "src/data/processed");
const EMBEDDED_DIR = path.join(ROOT, "src/data/embedded");
const CHECKPOINT_DIR = path.join(ROOT, "src/data/.checkpoints");

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

interface CLIArgs {
  type: DocumentType | "all";
  dryRun: boolean;
  batchSize: number;
  concurrency: number;
  skipEmbed: boolean;
  skipIngest: boolean;
}

function parseArgs(): CLIArgs {
  const args = process.argv.slice(2);
  const parsed: CLIArgs = {
    type: "all",
    dryRun: false,
    batchSize: 50,
    concurrency: 5,
    skipEmbed: false,
    skipIngest: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--type":
        parsed.type = args[++i] as DocumentType | "all";
        break;
      case "--dry-run":
        parsed.dryRun = true;
        break;
      case "--batch-size":
        parsed.batchSize = parseInt(args[++i], 10);
        break;
      case "--concurrency":
        parsed.concurrency = parseInt(args[++i], 10);
        break;
      case "--skip-embed":
        parsed.skipEmbed = true;
        break;
      case "--skip-ingest":
        parsed.skipIngest = true;
        break;
      case "--help":
        printHelp();
        process.exit(0);
    }
  }

  return parsed;
}

function printHelp(): void {
  console.log(`
Noor AI — Embedding & Ingestion Pipeline

Usage:
  npx ts-node scripts/embed.ts [options]

Options:
  --type <quran|hadith|all>   Process specific dataset (default: all)
  --dry-run                   Validate without writing to Supabase
  --batch-size <n>            Documents per embedding batch (default: 50)
  --concurrency <n>           Parallel Ollama requests (default: 5)
  --skip-embed                Skip embedding, use existing embedded JSON
  --skip-ingest               Skip Supabase ingestion, only embed
  --help                      Show this help
`);
}

// ---------------------------------------------------------------------------
// Supabase ingestion
// ---------------------------------------------------------------------------

const SUPABASE_BATCH_SIZE = 100;

/**
 * Insert embedded documents into the Supabase `documents` table in batches.
 * Uses upsert to handle re-runs gracefully (idempotent).
 */
async function ingestToSupabase(
  documents: EmbeddedDocument[],
): Promise<BatchResult> {
  const supabase = createAdminClient();
  const result: BatchResult = { inserted: 0, errors: [] };

  console.log(`\n→ Ingesting ${documents.length} documents into Supabase…`);

  for (let i = 0; i < documents.length; i += SUPABASE_BATCH_SIZE) {
    const batch = documents.slice(i, i + SUPABASE_BATCH_SIZE);
    const batchNum = Math.floor(i / SUPABASE_BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(documents.length / SUPABASE_BATCH_SIZE);

    const rows = batch.map((doc) => ({
      id: doc.id,
      type: doc.type,
      source: doc.source,
      content: doc.content,
      arabic: doc.arabic,
      metadata: doc.metadata,
      embedding: doc.embedding,
    }));

    const { error, count } = await supabase
      .from("documents")
      .upsert(rows, { onConflict: "id" });

    if (error) {
      const msg = `Batch ${batchNum}: ${error.message}`;
      console.error(`  ✗ ${msg}`);
      result.errors.push(msg);
    } else {
      result.inserted += batch.length;
      process.stdout.write(
        `\r  Ingested: ${result.inserted}/${documents.length} (batch ${batchNum}/${totalBatches})`,
      );
    }
  }

  process.stdout.write("\n");
  return result;
}

// ---------------------------------------------------------------------------
// Pipeline orchestrator
// ---------------------------------------------------------------------------

async function processDataset(
  type: DocumentType,
  args: CLIArgs,
): Promise<void> {
  const inputPath = path.join(PROCESSED_DIR, `${type}.json`);
  const embeddedPath = path.join(EMBEDDED_DIR, `${type}_embedded.json`);
  const checkpointPath = path.join(CHECKPOINT_DIR, `${type}_checkpoint.json`);

  console.log(`\n${"═".repeat(50)}`);
  console.log(`  Processing: ${type.toUpperCase()}`);
  console.log(`${"═".repeat(50)}`);

  // 1. Load normalised documents
  if (!fs.existsSync(inputPath)) {
    console.error(
      `  ✗ Processed file not found: ${inputPath}\n` +
        `    Run process-${type}.ts first.`,
    );
    return;
  }

  const documents = loadNormalizedDocuments(inputPath);
  console.log(`  Loaded ${documents.length} normalised ${type} documents.`);

  // 2. Generate embeddings (or load existing)
  let embedded: EmbeddedDocument[];

  if (args.skipEmbed && fs.existsSync(embeddedPath)) {
    console.log(`  ↻ Loading existing embeddings from ${embeddedPath}`);
    embedded = JSON.parse(fs.readFileSync(embeddedPath, "utf-8"));
    console.log(`    Loaded ${embedded.length} embedded documents.`);
  } else {
    // Ensure checkpoint dir exists
    if (!fs.existsSync(CHECKPOINT_DIR)) {
      fs.mkdirSync(CHECKPOINT_DIR, { recursive: true });
    }

    const [embeddedDocs, stats] = await embedDocuments(documents, {
      batchSize: args.batchSize,
      concurrency: args.concurrency,
      checkpointPath,
    });

    printStats(stats);
    embedded = embeddedDocs;

    // Save embedded output
    if (!fs.existsSync(EMBEDDED_DIR)) {
      fs.mkdirSync(EMBEDDED_DIR, { recursive: true });
    }
    saveEmbeddedDocuments(embeddedPath, embedded);

    // Clean up checkpoint on success
    if (fs.existsSync(checkpointPath)) {
      fs.unlinkSync(checkpointPath);
    }
  }

  // 3. Ingest to Supabase
  if (args.skipIngest) {
    console.log("  ⊘ Skipping Supabase ingestion (--skip-ingest).");
    return;
  }

  if (args.dryRun) {
    console.log("  ⊘ Dry run — skipping Supabase ingestion.");
    console.log(`    Would insert ${embedded.length} documents.`);
    return;
  }

  const result = await ingestToSupabase(embedded);
  console.log(`\n  ✓ Inserted: ${result.inserted}`);
  if (result.errors.length > 0) {
    console.error(`  ✗ Errors: ${result.errors.length}`);
    result.errors.forEach((e) => console.error(`    → ${e}`));
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const args = parseArgs();

  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║   Noor AI — RAG Embedding & Ingestion Pipeline      ║");
  console.log("╚══════════════════════════════════════════════════════╝");
  console.log(`  Type        : ${args.type}`);
  console.log(`  Batch size  : ${args.batchSize}`);
  console.log(`  Concurrency : ${args.concurrency}`);
  console.log(`  Dry run     : ${args.dryRun}`);
  console.log(`  Skip embed  : ${args.skipEmbed}`);
  console.log(`  Skip ingest : ${args.skipIngest}`);

  // Pre-flight check
  if (!args.skipEmbed) {
    await validateOllamaReady();
  }

  // Run pipeline
  const types: DocumentType[] =
    args.type === "all" ? ["quran", "hadith"] : [args.type];

  const startTime = Date.now();

  for (const type of types) {
    await processDataset(type, args);
  }

  const totalMs = Date.now() - startTime;
  console.log(
    `\n✓ Pipeline complete in ${(totalMs / 1000).toFixed(1)}s`,
  );
}

main().catch((err) => {
  console.error("\nFatal pipeline error:", err);
  process.exit(1);
});
