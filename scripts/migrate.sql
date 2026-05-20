-- 1. Enable the pgvector extension to support vector embeddings and operations
create extension if not exists vector;

-- 2. Create the quran_verses table
create table if not exists public.quran_verses (
  id uuid default gen_random_uuid() primary key,
  surah_number integer not null,
  verse_number integer not null,
  text_arabic text not null,
  text_english text not null,
  surah_name_english text not null,
  surah_name_arabic text not null,
  juz integer not null,
  revelation_place text check (revelation_place in ('makkah', 'madinah')),
  embedding vector(1536), -- 1536 dimensions for OpenAI text-embedding-3-small or text-embedding-ada-002
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Ensure surah and verse combinations are unique
  constraint quran_verses_surah_verse_unique unique (surah_number, verse_number)
);

-- 3. Create the hadiths table
create table if not exists public.hadiths (
  id uuid default gen_random_uuid() primary key,
  collection text not null, -- e.g., 'Sahih al-Bukhari', 'Sahih Muslim', 'Sunan Abi Dawud'
  book_number text not null,
  book_name text not null,
  hadith_number text not null,
  text_arabic text not null,
  text_english text not null,
  narrator_english text not null,
  narrator_arabic text,
  grade text, -- e.g., 'Sahih', 'Hasan', 'Da''if'
  embedding vector(1536), -- 1536 dimensions for OpenAI embeddings
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Enable Row Level Security (RLS) for public reads and system updates
alter table public.quran_verses enable row level security;
alter table public.hadiths enable row level security;

-- Set up open read policies (anyone can read verses and hadiths)
create policy "Allow public read access to Quran verses" 
  on public.quran_verses for select 
  using (true);

create policy "Allow public read access to Hadith" 
  on public.hadiths for select 
  using (true);

-- 5. Create Indexes for High Performance Queries

-- B-Tree indexes for quick filtering
create index if not exists idx_quran_verses_surah_verse on public.quran_verses (surah_number, verse_number);
create index if not exists idx_quran_verses_juz on public.quran_verses (juz);
create index if not exists idx_hadiths_collection_number on public.hadiths (collection, hadith_number);

-- Full-Text Search (GIN) indexes to enable hybrid retrieval (keyword keyword-matching + semantic)
create index if not exists idx_quran_verses_english_fts on public.quran_verses using gin (to_tsvector('english', text_english));
create index if not exists idx_hadiths_english_fts on public.hadiths using gin (to_tsvector('english', text_english));

-- Vector Similarity Indexes (HNSW for high-performance approximate nearest neighbor search)
-- Use cosine distance operator '<=>' for our vectors
create index if not exists idx_quran_verses_embedding_hnsw on public.quran_verses using hnsw (embedding vector_cosine_ops);
create index if not exists idx_hadiths_embedding_hnsw on public.hadiths using hnsw (embedding vector_cosine_ops);

-- 6. Create RPC Functions for Vector Similarity Matching

-- Vector matching function for Quran verses
create or replace function public.match_verses (
  query_embedding vector(1536),
  match_threshold float,
  match_count integer,
  filter_surah integer default null
)
returns table (
  id uuid,
  surah_number integer,
  verse_number integer,
  text_arabic text,
  text_english text,
  surah_name_english text,
  surah_name_arabic text,
  juz integer,
  revelation_place text,
  metadata jsonb,
  similarity float
)
language plpgsql stable
as $$
begin
  return query
  select
    q.id,
    q.surah_number,
    q.verse_number,
    q.text_arabic,
    q.text_english,
    q.surah_name_english,
    q.surah_name_arabic,
    q.juz,
    q.revelation_place,
    q.metadata,
    1 - (q.embedding <=> query_embedding) as similarity -- Cosine similarity calculation
  from public.quran_verses q
  where 1 - (q.embedding <=> query_embedding) > match_threshold
    and (filter_surah is null or q.surah_number = filter_surah)
  order by q.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- Vector matching function for Hadith
create or replace function public.match_hadiths (
  query_embedding vector(1536),
  match_threshold float,
  match_count integer,
  filter_collection text default null
)
returns table (
  id uuid,
  collection text,
  book_number text,
  book_name text,
  hadith_number text,
  text_arabic text,
  text_english text,
  narrator_english text,
  narrator_arabic text,
  grade text,
  metadata jsonb,
  similarity float
)
language plpgsql stable
as $$
begin
  return query
  select
    h.id,
    h.collection,
    h.book_number,
    h.book_name,
    h.hadith_number,
    h.text_arabic,
    h.text_english,
    h.narrator_english,
    h.narrator_arabic,
    h.grade,
    h.metadata,
    1 - (h.embedding <=> query_embedding) as similarity
  from public.hadiths h
  where 1 - (h.embedding <=> query_embedding) > match_threshold
    and (filter_collection is null or h.collection = filter_collection)
  order by h.embedding <=> query_embedding
  limit match_count;
end;
$$;
