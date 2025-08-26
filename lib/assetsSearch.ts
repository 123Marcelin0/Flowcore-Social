import { supabase, supabaseAdmin } from './supabase'
import { generateEmbedding } from './openaiService'

// TODO: Adjust table/column names if your project stores assets in a different table
// e.g., `assets`, `stock_assets`, or `pixabay_cache`. For now we try `media_files` with tags in metadata.

export interface AssetRecord {
  id: string
  storage_url: string
  title?: string | null
  tags?: string[] | null
  embedding?: number[] | null
  metadata?: any
}

export async function searchAssetsByEmbedding(queryText: string, limit = 5): Promise<AssetRecord[]> {
  const queryEmbedding = await generateEmbedding(queryText)
  if (!queryEmbedding) {
    // Fall back immediately if embeddings disabled
    return searchAssetsByTags(queryText, limit)
  }

  // Attempt pgvector ANN search if `vector_data` exists on `embeddings` table
  try {
    // Strategy:
    // 1) Find nearest embeddings for entity_type 'asset' (or 'media')
    // 2) Join back to `media_files` via entity_id
    const db = supabaseAdmin || supabase
    const { data: vectors, error: vecErr } = await db
      .from('embeddings' as any)
      .select('entity_id, vector_data')
      .eq('entity_type', 'asset')
      .limit(1000)

    if (vecErr || !vectors || !vectors.length) {
      return searchAssetsByTags(queryText, limit)
    }

    // Compute local cosine similarity since RPC may not be available
    const scored = vectors
      .map((v: any) => ({
        entity_id: v.entity_id,
        score: cosine(queryEmbedding, v.vector_data || []),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit * 3)

    const ids = scored.map((s) => s.entity_id)
    if (ids.length === 0) return []

    const { data: assets, error: aErr } = await db
      .from('media_files')
      .select('id, storage_url, metadata')
      .in('id', ids)

    if (aErr || !assets) return []

    const byId = new Map(assets.map((a) => [a.id, a]))
    const merged = scored
      .map((s) => byId.get(s.entity_id))
      .filter(Boolean)
      .slice(0, limit)
      .map((a: any) => ({
        id: a.id,
        storage_url: a.storage_url,
        title: a.metadata?.title || null,
        tags: a.metadata?.tags || null,
        metadata: a.metadata,
      }))
    return merged
  } catch {
    return searchAssetsByTags(queryText, limit)
  }
}

export async function searchAssetsByTags(queryText: string, limit = 5): Promise<AssetRecord[]> {
  const q = queryText.trim().split(/\s+/).join(' ')
  // Very simple iLike search against metadata fields
  const { data, error } = await supabase
    .from('media_files')
    .select('id, storage_url, metadata')
    .or(`metadata->>title.ilike.%${q}%,metadata->>tags.ilike.%${q}%` as any)
    .limit(limit)

  if (error || !data) return []
  return data.map((a: any) => ({
    id: a.id,
    storage_url: a.storage_url,
    title: a.metadata?.title || null,
    tags: a.metadata?.tags || null,
    metadata: a.metadata,
  }))
}

function cosine(a: number[], b: number[]): number {
  let dot = 0,
    na = 0,
    nb = 0
  const len = Math.min(a.length, b.length)
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-10)
}


