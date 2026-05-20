#!/usr/bin/env ts-node
/**
 * @file scripts/process-hadith.ts
 * @description Parses the raw Hadith CSV dataset and normalizes it into
 *              NormalizedDocument[] JSON written to src/data/processed/.
 *
 * Usage:
 *   npx ts-node --project tsconfig.json -r tsconfig-paths/register scripts/process-hadith.ts
 *
 * Input:  public/datasets/raw/hadith/all_hadiths_clean.csv
 * Output: src/data/processed/hadith.json
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type {
  RawHadithRow,
  NormalizedDocument,
  HadithMetadata,
} from "../src/lib/rag/types";

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const ROOT = path.resolve(__dirname, "..");
const CSV_PATH = path.join(
  ROOT,
  "public/datasets/raw/hadith/all_hadiths_clean.csv",
);
const OUTPUT_DIR = path.join(ROOT, "src/data/processed");
const OUTPUT_PATH = path.join(OUTPUT_DIR, "hadith.json");

// ---------------------------------------------------------------------------
// Minimal CSV parser — handles quoted fields with commas and newlines
// ---------------------------------------------------------------------------

function parseCSV(raw: string): string[][] {
  const rows: string[][] = [];
  let current: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    const next = raw[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        current.push(field);
        field = "";
      } else if (ch === "\n" || (ch === "\r" && next === "\n")) {
        current.push(field);
        field = "";
        if (current.length > 1) rows.push(current);
        current = [];
        if (ch === "\r") i++;
      } else if (ch === "\r") {
        current.push(field);
        field = "";
        if (current.length > 1) rows.push(current);
        current = [];
      } else {
        field += ch;
      }
    }
  }

  if (field || current.length > 0) {
    current.push(field);
    if (current.length > 1) rows.push(current);
  }

  return rows;
}

function csvToObjects(raw: string): RawHadithRow[] {
  const rows = parseCSV(raw);
  if (rows.length === 0) throw new Error("CSV is empty.");

  const headers = rows[0].map((h) => h.trim());
  const data: RawHadithRow[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const obj: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = (row[j] ?? "").trim();
    }
    data.push(obj as unknown as RawHadithRow);
  }

  return data;
}

// ---------------------------------------------------------------------------
// Normalization
// ---------------------------------------------------------------------------

/** Normalize source names to clean, consistent labels */
function normalizeSourceName(raw: string): string {
  const cleaned = raw.trim();
  const MAP: Record<string, string> = {
    "sahih bukhari": "Sahih al-Bukhari",
    "sahih muslim": "Sahih Muslim",
    "sunan abu dawud": "Sunan Abu Dawud",
    "sunan abi dawud": "Sunan Abu Dawud",
    "jami at tirmidhi": "Jami at-Tirmidhi",
    "jami` at-tirmidhi": "Jami at-Tirmidhi",
    "sunan an nasai": "Sunan an-Nasa'i",
    "sunan an-nasai": "Sunan an-Nasa'i",
    "sunan ibn majah": "Sunan Ibn Majah",
    "musnad ahmad": "Musnad Ahmad",
    "muwatta malik": "Muwatta Malik",
    "riyad as salihin": "Riyad as-Salihin",
    "al adab al mufrad": "Al-Adab Al-Mufrad",
    "bulugh al maram": "Bulugh al-Maram",
  };

  const key = cleaned.toLowerCase();
  return MAP[key] ?? cleaned;
}

function normalizeHadithRow(row: RawHadithRow): NormalizedDocument {
  const source = normalizeSourceName(row.source);

  const metadata: HadithMetadata = {
    hadith_id: row.hadith_id,
    source,
    chapter_no: parseInt(row.chapter_no, 10) || 0,
    hadith_no: row.hadith_no?.trim(),
    chapter: row.chapter?.trim(),
    chain_indx: row.chain_indx?.trim(),
  };

  // Generate a stable deterministic ID
  const sourceSlug = source.toLowerCase().replace(/[\s'-]/g, "_");
  const id = `hadith-${sourceSlug}-${row.id}`;

  return {
    id,
    type: "hadith",
    source,
    content: row.text_en?.trim() ?? "",
    arabic: row.text_ar?.trim() ?? "",
    metadata,
  };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validateDocument(doc: NormalizedDocument): string[] {
  const errors: string[] = [];

  if (!doc.content || doc.content.trim().length === 0) {
    errors.push(`${doc.id}: empty English content`);
  }
  // Arabic can be empty for some hadiths — warn but don't reject
  if (!doc.source) {
    errors.push(`${doc.id}: missing source`);
  }

  // Skip extremely short content (likely a parsing artifact)
  if (doc.content.length < 10) {
    errors.push(`${doc.id}: content too short (${doc.content.length} chars)`);
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log("╔══════════════════════════════════════════════╗");
  console.log("║   Noor AI — Hadith Dataset Processor         ║");
  console.log("╚══════════════════════════════════════════════╝\n");

  // 1. Read CSV
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`✗ CSV not found at: ${CSV_PATH}`);
    process.exit(1);
  }

  console.log(`→ Reading CSV: ${CSV_PATH}`);
  const rawCsv = fs.readFileSync(CSV_PATH, "utf-8");
  const rows = csvToObjects(rawCsv);
  console.log(`  Parsed ${rows.length} rows.\n`);

  // 2. Normalize
  console.log("→ Normalizing documents…");
  const documents: NormalizedDocument[] = [];
  const allErrors: string[] = [];

  for (const row of rows) {
    const doc = normalizeHadithRow(row);
    const errs = validateDocument(doc);
    if (errs.length > 0) {
      allErrors.push(...errs);
    } else {
      documents.push(doc);
    }
  }

  console.log(`  Valid documents   : ${documents.length}`);
  console.log(`  Validation errors : ${allErrors.length}`);
  if (allErrors.length > 0) {
    console.warn(`  First 10 errors:`);
    allErrors.slice(0, 10).forEach((e) => console.warn(`    ⚠ ${e}`));
  }

  // 3. Deduplicate by ID
  const deduped = new Map<string, NormalizedDocument>();
  for (const doc of documents) {
    if (!deduped.has(doc.id)) {
      deduped.set(doc.id, doc);
    }
  }
  const uniqueDocs = Array.from(deduped.values());
  const dupeCount = documents.length - uniqueDocs.length;
  if (dupeCount > 0) {
    console.log(`  Deduped: removed ${dupeCount} duplicate entries.`);
  }

  // 4. Write output
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(uniqueDocs, null, 2), "utf-8");
  console.log(`\n✓ Wrote ${uniqueDocs.length} documents → ${OUTPUT_PATH}`);

  // 5. Stats
  const sources = new Map<string, number>();
  for (const doc of uniqueDocs) {
    const s = doc.source;
    sources.set(s, (sources.get(s) ?? 0) + 1);
  }

  console.log(`\n┌─────────────────────────────────────────┐`);
  console.log(`│  Hadith Processing Summary              │`);
  console.log(`├─────────────────────────────────────────┤`);
  console.log(`│  Total hadiths   : ${String(uniqueDocs.length).padStart(8)}            │`);
  console.log(`│  Unique sources  : ${String(sources.size).padStart(8)}            │`);
  for (const [src, count] of sources) {
    console.log(`│    ${src.padEnd(20)}: ${String(count).padStart(6)}        │`);
  }
  console.log(`│  Output file     : hadith.json           │`);
  console.log(`└─────────────────────────────────────────┘`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
