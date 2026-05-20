import { createClient } from "@supabase/supabase-js";
import { OpenAI } from "openai";
import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables from local .env or .env.local file
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const openaiApiKey = process.env.OPENAI_API_KEY || "";

if (!supabaseUrl || !supabaseServiceKey || !openaiApiKey) {
  console.error("Missing configuration. Please check your environment variables:");
  console.error(`NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? "SET" : "MISSING"}`);
  console.error(`SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceKey ? "SET" : "MISSING"}`);
  console.error(`OPENAI_API_KEY: ${openaiApiKey ? "SET" : "MISSING"}`);
  process.exit(1);
}

// Instantiate clients securely for script context
const supabase = createClient(supabaseUrl, supabaseServiceKey);
const openai = new OpenAI({ apiKey: openaiApiKey });

// 1. High-quality seed data: Quran verses
const sampleQuranVerses = [
  {
    surah_number: 1,
    verse_number: 1,
    surah_name_english: "Al-Fatihah",
    surah_name_arabic: "الفاتحة",
    text_arabic: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
    text_english: "In the name of Allah, the Entirely Merciful, the Especially Merciful.",
    juz: 1,
    revelation_place: "makkah" as const,
  },
  {
    surah_number: 1,
    verse_number: 2,
    surah_name_english: "Al-Fatihah",
    surah_name_arabic: "الفاتحة",
    text_arabic: "الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ",
    text_english: "[All] praise is [due] to Allah, Lord of the worlds -",
    juz: 1,
    revelation_place: "makkah" as const,
  },
  {
    surah_number: 2,
    verse_number: 255,
    surah_name_english: "Al-Baqarah",
    surah_name_arabic: "البقرة",
    text_arabic: "اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَّهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ ۚ مَن ذَا الَّذِي يَشْفَعُ عِندَهُ إِلَّا بِإِذْنِهِ ۚ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ ۚ وَلَا يُحِيطُونَ بِشَيْءٍ مِّنْ عِلْمِهِ إِلَّا بِمَا شَاءَ ۚ وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ ۚ وَلَا يَئُودُهُ حِفْظُهُمَا ۚ وَهُوَ الْعَلِيُّ الْعَظِيمُ",
    text_english: "Allah - there is no deity except Him, the Ever-Living, the Sustainer of [all] existence. Neither drowsiness overtakes Him nor sleep. To Him belongs whatever is in the heavens and whatever is on the earth. Who is it that can intercede with Him except by His permission? He knows what is [presently] before them and what will be after them, and they encompass not a thing of His knowledge except for what He wills. His Kursi extends over the heavens and the earth, and their preservation tires Him not. And He is the Most High, the Most Great.",
    juz: 3,
    revelation_place: "madinah" as const,
  },
  {
    surah_number: 112,
    verse_number: 1,
    surah_name_english: "Al-Ikhlas",
    surah_name_arabic: "الإخلاص",
    text_arabic: "قُلْ هُوَ اللَّهُ أَحَدٌ",
    text_english: "Say, 'He is Allah, [who is] One,",
    juz: 30,
    revelation_place: "makkah" as const,
  },
  {
    surah_number: 112,
    verse_number: 2,
    surah_name_english: "Al-Ikhlas",
    surah_name_arabic: "الإخلاص",
    text_arabic: "اللَّهُ الصَّمَدُ",
    text_english: "Allah, the Eternal Refuge.",
    juz: 30,
    revelation_place: "makkah" as const,
  },
];

// 2. High-quality seed data: Authentic Hadiths
const sampleHadiths = [
  {
    collection: "Sahih al-Bukhari",
    book_number: "1",
    book_name: "Revelation",
    hadith_number: "1",
    text_arabic: "إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ، وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى",
    text_english: "Actions are judged by intentions, and every person will get what they intended.",
    narrator_english: "Narrated by 'Umar bin Al-Khattab",
    grade: "Sahih",
  },
  {
    collection: "Sahih al-Bukhari",
    book_number: "2",
    book_name: "Belief",
    hadith_number: "9",
    text_arabic: "الإِيمَانُ بِضْعٌ وَسِتُّونَ شُعْبَةً، وَالْحَيَاءُ شُعْبَةٌ مِنَ الإِيمَانِ",
    text_english: "Belief has over sixty branches, and modesty is a branch of belief.",
    narrator_english: "Narrated by Abu Hurairah",
    grade: "Sahih",
  },
  {
    collection: "Sahih Muslim",
    book_number: "1",
    book_name: "Faith",
    hadith_number: "223",
    text_arabic: "الطَّهُورُ شَطْرُ الإِيمَانِ وَالْحَمْدُ لِلَّهِ تَمْلأُ الْمِيزَانَ",
    text_english: "Purity is half of faith, and Al-Hamdulillah fills the scale.",
    narrator_english: "Narrated by Abu Malik al-Ash'ari",
    grade: "Sahih",
  },
];

/**
 * Generates an embedding using OpenAI
 */
async function generateEmbedding(text: string): Promise<number[]> {
  const sanitized = text.replace(/\n/g, " ").trim();
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: sanitized,
    encoding_format: "float",
  });
  return response.data[0].embedding;
}

/**
 * Main seeding runner
 */
async function seedDatabase() {
  console.log("Starting Noor AI database seeding...");

  // --- Seed Quran Verses ---
  console.log("\n--- Processing Quranic Verses ---");
  const seededQuran = [];
  for (const verse of sampleQuranVerses) {
    console.log(`Generating embedding for Surah ${verse.surah_name_english} (${verse.surah_number}:${verse.verse_number})...`);
    try {
      const embedding = await generateEmbedding(verse.text_english);
      seededQuran.push({
        ...verse,
        embedding,
        metadata: {
          surah_name_english: verse.surah_name_english,
          surah_name_arabic: verse.surah_name_arabic,
          juz: verse.juz,
          revelation_place: verse.revelation_place,
        },
      });
    } catch (err) {
      console.error(`Failed to process ${verse.surah_name_english} ${verse.surah_number}:${verse.verse_number}:`, err);
    }
  }

  if (seededQuran.length > 0) {
    console.log(`Bulk upserting ${seededQuran.length} Quran verses to Supabase...`);
    const { error } = await supabase.from("quran_verses").upsert(seededQuran, {
      onConflict: "surah_number,verse_number",
    });
    if (error) {
      console.error("Error bulk uploading Quran verses:", error);
    } else {
      console.log("Quran verses seeded successfully!");
    }
  }

  // --- Seed Hadiths ---
  console.log("\n--- Processing Hadiths ---");
  const seededHadiths = [];
  for (const hadith of sampleHadiths) {
    console.log(`Generating embedding for ${hadith.collection} Hadith #${hadith.hadith_number}...`);
    try {
      const embedding = await generateEmbedding(hadith.text_english);
      seededHadiths.push({
        ...hadith,
        embedding,
        metadata: {
          collection: hadith.collection,
          book_number: hadith.book_number,
          book_name: hadith.book_name,
          hadith_number: hadith.hadith_number,
          narrator_english: hadith.narrator_english,
          grade: hadith.grade,
        },
      });
    } catch (err) {
      console.error(`Failed to process Hadith ${hadith.collection} #${hadith.hadith_number}:`, err);
    }
  }

  if (seededHadiths.length > 0) {
    console.log(`Bulk uploading ${seededHadiths.length} Hadiths to Supabase...`);
    const { error } = await supabase.from("hadiths").upsert(seededHadiths);
    if (error) {
      console.error("Error bulk uploading Hadiths:", error);
    } else {
      console.log("Hadiths seeded successfully!");
    }
  }

  console.log("\nDatabase Seeding Completed Successfully! Noor AI database is ready.");
}

// Execute seeding pipeline
seedDatabase().catch((err) => {
  console.error("Fatal error during database seeding execution:", err);
  process.exit(1);
});
