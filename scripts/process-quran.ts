#!/usr/bin/env ts-node
/**
 * @file scripts/process-quran.ts
 * @description Parses the raw Quran CSV dataset and normalizes it into
 *              NormalizedDocument[] JSON written to src/data/processed/.
 *
 * Usage:
 *   npx ts-node --project tsconfig.json -r tsconfig-paths/register scripts/process-quran.ts
 *
 * Input:  public/datasets/raw/quran/The Quran Dataset.csv
 * Output: src/data/processed/quran.json
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type {
  RawQuranRow,
  NormalizedDocument,
  QuranMetadata,
} from "../src/lib/rag/types";

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const ROOT = path.resolve(__dirname, "..");
const CSV_PATH = path.join(
  ROOT,
  "public/datasets/raw/quran/The Quran Dataset.csv",
);
const OUTPUT_DIR = path.join(ROOT, "src/data/processed");
const OUTPUT_PATH = path.join(OUTPUT_DIR, "quran.json");

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
        i++; // skip escaped quote
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
        if (ch === "\r") i++; // skip \n after \r
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

  // Final field / row
  if (field || current.length > 0) {
    current.push(field);
    if (current.length > 1) rows.push(current);
  }

  return rows;
}

function csvToObjects(raw: string): RawQuranRow[] {
  const rows = parseCSV(raw);
  if (rows.length === 0) throw new Error("CSV is empty.");

  const headers = rows[0].map((h) => h.trim());
  const data: RawQuranRow[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const obj: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = (row[j] ?? "").trim();
    }
    data.push(obj as unknown as RawQuranRow);
  }

  return data;
}

// ---------------------------------------------------------------------------
// Normalization
// ---------------------------------------------------------------------------

function normalizeQuranRow(row: RawQuranRow): NormalizedDocument {
  const surahNum = parseInt(row.surah_no, 10);
  const ayahNum = parseInt(row.ayah_no_surah, 10);

  const metadata: QuranMetadata = {
    surah_number: surahNum,
    surah_name_en: row.surah_name_en,
    surah_name_ar: row.surah_name_ar,
    surah_name_roman: row.surah_name_roman,
    ayah_number: ayahNum,
    ayah_number_quran: parseInt(row.ayah_no_quran, 10),
    juz: parseInt(row.juz_no, 10),
    place_of_revelation: row.place_of_revelation,
    is_sajdah: row.sajah_ayah?.toUpperCase() === "TRUE",
  };

  return {
    id: `quran-${surahNum}-${ayahNum}`,
    type: "quran",
    source: "The Quran Dataset",
    content: row.ayah_en,
    arabic: row.ayah_ar,
    metadata,
  };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validateDocument(doc: NormalizedDocument): string[] {
  const errors: string[] = [];
  const m = doc.metadata as QuranMetadata;
  if (!doc.content || doc.content.trim().length === 0) {
    errors.push(`${doc.id}: empty English content`);
  }
  if (!doc.arabic || doc.arabic.trim().length === 0) {
    errors.push(`${doc.id}: empty Arabic text`);
  }
  if (isNaN(m.surah_number) || m.surah_number < 1 || m.surah_number > 114) {
    errors.push(`${doc.id}: invalid surah_number ${m.surah_number}`);
  }
  if (isNaN(m.ayah_number) || m.ayah_number < 1) {
    errors.push(`${doc.id}: invalid ayah_number ${m.ayah_number}`);
  }
  return errors;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log("╔══════════════════════════════════════════════╗");
  console.log("║   Noor AI — Quran Dataset Processor          ║");
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
    const doc = normalizeQuranRow(row);
    const errs = validateDocument(doc);
    if (errs.length > 0) {
      allErrors.push(...errs);
    } else {
      documents.push(doc);
    }
  }

  console.log(`  Valid documents : ${documents.length}`);
  console.log(`  Validation errors: ${allErrors.length}`);
  if (allErrors.length > 0) {
    console.warn(`  First 5 errors:`);
    allErrors.slice(0, 5).forEach((e) => console.warn(`    ⚠ ${e}`));
  }

  // 3. Write output
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(documents, null, 2), "utf-8");
  console.log(`\n✓ Wrote ${documents.length} documents → ${OUTPUT_PATH}`);

  // 4. Quick stats
  const surahs = new Set(
    documents.map((d) => (d.metadata as QuranMetadata).surah_number),
  );
  console.log(`\n┌─────────────────────────────────┐`);
  console.log(`│  Quran Processing Summary       │`);
  console.log(`├─────────────────────────────────┤`);
  console.log(`│  Total verses  : ${String(documents.length).padStart(6)}        │`);
  console.log(`│  Unique surahs : ${String(surahs.size).padStart(6)}        │`);
  console.log(`│  Output file   : quran.json     │`);
  console.log(`└─────────────────────────────────┘`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
