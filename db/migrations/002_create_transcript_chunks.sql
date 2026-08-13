-- Transcript chunks table for storing podcast transcript segments with embeddings
CREATE TABLE IF NOT EXISTS transcript_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id TEXT,
  episode_title TEXT,
  guest_name TEXT,
  speaker TEXT,
  content TEXT NOT NULL,
  embedding vector(1536),
  start_timestamp TEXT,
  end_timestamp TEXT,
  source_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  tsvector_content TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(content, '') || ' ' || coalesce(guest_name, '') || ' ' || coalesce(speaker, '') || ' ' || coalesce(episode_title, ''))
  ) STORED
);

-- HNSW index for fast approximate nearest-neighbor vector search
CREATE INDEX IF NOT EXISTS transcript_chunks_embedding_idx
  ON transcript_chunks
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- GIN index on tsvector for full-text search
CREATE INDEX IF NOT EXISTS transcript_chunks_fts_idx
  ON transcript_chunks
  USING gin (tsvector_content);

-- Index for filtering by episode
CREATE INDEX IF NOT EXISTS transcript_chunks_episode_idx
  ON transcript_chunks (episode_id);

-- Index for filtering by guest
CREATE INDEX IF NOT EXISTS transcript_chunks_guest_idx
  ON transcript_chunks (guest_name);
