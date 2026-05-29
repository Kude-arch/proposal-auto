-- 벡터 유사도 검색 함수
create or replace function search_items(
  query_embedding vector(1536),
  match_count      integer default 20
)
returns table (
  id            uuid,
  title         text,
  keywords      text[],
  image_url     text,
  thumbnail_url text,
  body          text,
  section_hints text[],
  usage_count   integer,
  created_at    timestamptz,
  similarity    float
)
language sql stable
as $$
  select
    i.id,
    i.title,
    i.keywords,
    i.image_url,
    i.thumbnail_url,
    i.body,
    i.section_hints,
    i.usage_count,
    i.created_at,
    1 - (i.embedding <=> query_embedding) as similarity
  from items i
  where i.embedding is not null
  order by i.embedding <=> query_embedding
  limit match_count;
$$;
