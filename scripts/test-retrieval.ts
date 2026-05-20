#!/usr/bin/env ts-node
/**
 * @file scripts/test-retrieval.ts
 * @description A CLI script to test the Noor AI Hybrid RAG Retrieval Engine.
 * 
 * Usage:
 *   npm run rag:test "What is the importance of intention in Islam?"
 */

import * as dotenv from "dotenv";
import * as path from "path";

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config();

import { retrieveGroundedSources } from "../src/lib/rag/retrieval";

async function main() {
  const args = process.argv.slice(2);
  const query = args.join(" ") || "What is the importance of intention in Islam?";

  console.log(`\n🔎 Querying Noor AI Vector DB for: "${query}"...\n`);
  
  const startTime = Date.now();
  
  const results = await retrieveGroundedSources(query, {
    limit: 5,
    sourceFocus: "all",
    semanticWeight: 0.7 // 70% vector semantic, 30% keyword
  });

  const duration = Date.now() - startTime;

  if (results.length === 0) {
    console.log("No results found. Please check your Supabase connection and ensure documents are ingested.");
    return;
  }

  console.log(`✅ Found ${results.length} results in ${duration}ms\n`);

  results.forEach((res, i) => {
    console.log(`[${i + 1}] ${res.title}`);
    console.log(`    Type: ${res.type.toUpperCase()}`);
    console.log(`    Score: ${res.relevance_score.toFixed(4)} (Hybrid RRF)`);
    console.log(`    English: "${res.text_english.substring(0, 150)}${res.text_english.length > 150 ? "..." : ""}"`);
    console.log(`    Arabic:  "${res.text_arabic.substring(0, 100)}${res.text_arabic.length > 100 ? "..." : ""}"`);
    console.log("-".repeat(80));
  });
}

main().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
