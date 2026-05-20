-- ==========================================================================
-- Noor AI — Unified Documents Table for Ollama nomic-embed-text (768 dims)
-- ==========================================================================
-- This migration creates a unified `documents` table for the RAG pipeline,
-- optimized for Ollama's nomic-embed-text 768-dimensional embeddings.
--
-- Run this in the Supabase SQL Editor or via psql.
-- ==========================================================================

-- 1. Enable pgvector extension
create extension if not exists vector;

-- 2. Create the unified documents table
create table if not exists public.documents (
  -- Deterministic ID: "quran-{surah}-{ayah}" or "hadith-{source}-{id}"
  id text primary key,

  -- Document type discriminator
  type text not null check (type in ('quran', 'hadith')),

  -- Source dataset label (e.g. "The Quran Dataset", "Sahih al-Bukhari")
  source text not null,

  -- English text (used for embedding generation)
  content text not null,

  -- Arabic text (preserved for display, NOT embedded)
  arabic text not null default '',

  -- Structured metadata as JSONB (surah info, hadith references, etc.)
  metadata jsonb not null default '{}'::jsonb,

  -- 768-dimensional vector from Ollama nomic-embed-text
  embedding vector(768),

  -- Audit timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Enable Row Level Security
alter table public.documents enable row level security;

-- Public read-only access (anyone can search/read)
create policy "documents_public_read"
  on public.documents for select
  using (true);

-- Service role full access (for ingestion scripts)
create policy "documents_service_write"
  on public.documents for all
  using (true)
  with check (true);

-- 4. Indexes for high-performance queries

-- B-Tree index on type for filtered queries
create index if not exists idx_documents_type
  on public.documents (type);

-- B-Tree index on source for collection-level filtering
create index if not exists idx_documents_source
  on public.documents (source);

-- Composite index for type + source filtering
create index if not exists idx_documents_type_source
  on public.documents (type, source);

-- GIN index on metadata for JSONB queries
create index if not exists idx_documents_metadata
  on public.documents using gin (metadata);

-- Full-Text Search index on English content
create index if not exists idx_documents_content_fts
  on public.documents using gin (to_tsvector('english', content));

-- HNSW vector index for fast approximate nearest neighbor search
-- Uses cosine distance operator for semantic similarity
create index if not exists idx_documents_embedding_hnsw
  on public.documents using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

-- 5. Auto-update timestamp trigger
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger documents_updated_at
  before update on public.documents
  for each row
  execute function public.update_updated_at_column();

-- 6. Vector similarity search RPC function
create or replace function public.match_documents(
  query_embedding vector(768),
  match_threshold float default 0.3,
  match_count integer default 10,
  filter_type text default null,
  filter_source text default null
)
returns table (
  id text,
  type text,
  source text,
  content text,
  arabic text,
  metadata jsonb,
  similarity float
)
language plpgsql stable
as $$
begin
  return query
  select
    d.id,
    d.type,
    d.source,
    d.content,
    d.arabic,
    d.metadata,
    1 - (d.embedding <=> query_embedding) as similarity
  from public.documents d
  where d.embedding is not null
    and 1 - (d.embedding <=> query_embedding) > match_threshold
    and (filter_type is null or d.type = filter_type)
    and (filter_source is null or d.source = filter_source)
  order by d.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- 7. Hybrid search: vector + full-text (RRF fusion)
create or replace function public.hybrid_search_documents(
  query_text text,
  query_embedding vector(768),
  match_count integer default 10,
  filter_type text default null,
  -- Reciprocal Rank Fusion weight: 0.0 = pure keyword, 1.0 = pure semantic
  semantic_weight float default 0.7
)
returns table (
  id text,
  type text,
  source text,
  content text,
  arabic text,
  metadata jsonb,
  similarity float,
  rank_score float
)
language plpgsql stable
as $$
begin
  return query
  with semantic as (
    select
      d.id,
      row_number() over (order by d.embedding <=> query_embedding) as rank_ix,
      1 - (d.embedding <=> query_embedding) as sim
    from public.documents d
    where d.embedding is not null
      and (filter_type is null or d.type = filter_type)
    order by d.embedding <=> query_embedding
    limit match_count * 2
  ),
  keyword as (
    select
      d.id,
      row_number() over (order by ts_rank_cd(to_tsvector('english', d.content), websearch_to_tsquery(query_text)) desc) as rank_ix
    from public.documents d
    where to_tsvector('english', d.content) @@ websearch_to_tsquery(query_text)
      and (filter_type is null or d.type = filter_type)
    limit match_count * 2
  )
  select
    d.id,
    d.type,
    d.source,
    d.content,
    d.arabic,
    d.metadata,
    coalesce(s.sim, 0) as similarity,
    (
      coalesce(semantic_weight / (60 + s.rank_ix), 0.0) +
      coalesce((1.0 - semantic_weight) / (60 + k.rank_ix), 0.0)
    ) as rank_score
  from public.documents d
  left join semantic s on d.id = s.id
  left join keyword k on d.id = k.id
  where s.id is not null or k.id is not null
  order by rank_score desc
  limit match_count;
end;
$$;
