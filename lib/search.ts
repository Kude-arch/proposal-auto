import { RankedItem, SectionConfig, SectionResult } from '@/types'
import { createClient } from '@/lib/supabase/client'

// 관련도 70% + 최신도 30%
const RELEVANCE_WEIGHT = 0.7
const RECENCY_WEIGHT = 0.3

// 최신도 기준: 최근 180일을 1.0, 그 이상은 0으로 수렴
const RECENCY_HALF_DAYS = 180

function recencyScore(createdAt: string): number {
  const daysDiff = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)
  return Math.max(0, 1 - daysDiff / (RECENCY_HALF_DAYS * 2))
}

export async function searchItemsForSection(
  sectionName: string,
  sectionKeywords: string[],
  globalKeywords: string[],
  limit: number = 10
): Promise<RankedItem[]> {
  const supabase = createClient()

  // 검색 쿼리 텍스트 = 섹션명 + 섹션 키워드 + 공통 키워드 결합
  const queryText = [sectionName, ...sectionKeywords, ...globalKeywords].join(' ')

  // 1. 임베딩 생성 (서버 API 경유)
  const embedRes = await fetch('/api/embed', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: queryText }),
  })
  if (!embedRes.ok) throw new Error('임베딩 생성 실패')
  const { embedding } = await embedRes.json()

  // 2. pgvector 유사도 검색
  const { data, error } = await supabase.rpc('search_items', {
    query_embedding: embedding,
    match_count: Math.min(limit * 3, 50), // 후보를 넉넉히 가져와서 재정렬
  })
  if (error) throw error

  // 3. 키워드 부분 매칭 보너스 (입력 키워드가 아이템 키워드에 포함되거나, 아이템 키워드가 입력에 포함될 때)
  const lowerGlobal = globalKeywords.map(k => k.toLowerCase())

  const ranked: RankedItem[] = (data as any[]).map(row => {
    const itemKeywords: string[] = row.keywords.map((k: string) => k.toLowerCase())
    const matchCount = lowerGlobal.filter(gk =>
      itemKeywords.some(ik => ik.includes(gk) || gk.includes(ik))
    ).length
    const keywordBonus = Math.min(0.15, matchCount * 0.05) // 최대 +0.15

    const relevance = Math.min(1, (row.similarity as number) + keywordBonus)
    const recency = recencyScore(row.created_at)
    const finalScore = relevance * RELEVANCE_WEIGHT + recency * RECENCY_WEIGHT

    return {
      ...row,
      relevance_score: relevance,
      recency_score: recency,
      final_score: finalScore,
    }
  })

  // 4. 최종 점수 내림차순 정렬 후 limit 적용
  ranked.sort((a, b) => b.final_score - a.final_score)
  return ranked.slice(0, limit)
}

export async function searchAllSections(
  sections: SectionConfig[],
  globalKeywords: string[],
  sectionProfilesMap: Record<string, string[]>
): Promise<SectionResult[]> {
  const results = await Promise.all(
    sections.map(async section => {
      const sectionKeywords = sectionProfilesMap[section.section_name] ?? []
      const items = await searchItemsForSection(
        section.section_name,
        sectionKeywords,
        globalKeywords,
        section.item_count
      )
      return { section, items }
    })
  )
  return results
}
