'use client'
import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ChevronDown, ChevronUp, RotateCcw, ImageOff, ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/client'
import { SectionConfig, RankedItem, SectionResult } from '@/types'
import { searchAllSections } from '@/lib/search'
import Image from 'next/image'

// ─── Item Card ────────────────────────────────────────────────────────────────
function ItemCard({ item }: { item: RankedItem }) {
  const [imgError, setImgError] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const pct = Math.round(item.relevance_score * 100)
  const barColor = pct >= 70 ? 'bg-[#333]' : pct >= 40 ? 'bg-[#888]' : 'bg-[#ccc]'

  return (
    <div className="bg-white rounded-lg border border-[#e0e0e0] overflow-hidden hover:border-[#888] transition-colors group">
      {/* 이미지 */}
      <div className="relative aspect-[4/3] bg-[#f5f5f5] overflow-hidden">
        {imgError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-[#bbb]">
            <ImageOff size={24} />
            <span className="text-xs mt-1">이미지 없음</span>
          </div>
        ) : (
          <Image
            src={item.thumbnail_url ?? item.image_url}
            alt={item.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImgError(true)}
            sizes="240px"
          />
        )}
        {/* 관련도 배지 */}
        <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
          {pct}%
        </div>
      </div>

      {/* 정보 */}
      <div className="px-3 py-2.5">
        <p className="text-xs font-medium text-[#222] leading-snug mb-1.5 line-clamp-2">{item.title}</p>

        {/* 관련도 바 */}
        <div className="flex items-center gap-2 mb-2">
          <div className="flex-1 bg-[#f0f0f0] rounded-full h-1">
            <div className={`${barColor} h-1 rounded-full`} style={{ width: `${pct}%` }} />
          </div>
          <span className="text-[9px] text-[#bbb] shrink-0">관련도</span>
        </div>

        {/* 키워드 태그 */}
        <div className="flex flex-wrap gap-1">
          {item.keywords.slice(0, 4).map(kw => (
            <span key={kw} className="text-[9px] bg-[#f5f5f5] text-[#888] px-1.5 py-0.5 rounded">{kw}</span>
          ))}
          {item.keywords.length > 4 && (
            <span className="text-[9px] text-[#bbb]">+{item.keywords.length - 4}</span>
          )}
        </div>

        {/* 본문 (접기/펼치기) */}
        {item.body && (
          <div className="mt-2 border-t border-[#f0f0f0] pt-2">
            <button onClick={() => setExpanded(v => !v)}
              className="flex items-center gap-1 text-[9px] text-[#888] hover:text-[#555]">
              {expanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
              {expanded ? '접기' : '설명 보기'}
            </button>
            {expanded && <p className="text-[10px] text-[#888] mt-1 leading-relaxed">{item.body}</p>}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Section Panel ─────────────────────────────────────────────────────────────
function SectionPanel({ result, isOpen, onToggle }: {
  result: SectionResult; isOpen: boolean; onToggle: () => void
}) {
  return (
    <div className="bg-white rounded-xl border border-[#e0e0e0] overflow-hidden">
      <button onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#fafafa] transition-colors">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-[#111]">{result.section.section_name}</span>
          <span className="text-xs bg-[#f5f5f5] text-[#888] px-2 py-0.5 rounded-full">
            {result.items.length}개
          </span>
          {result.section.is_custom && (
            <span className="text-[10px] bg-[#ebebeb] text-[#888] px-1.5 py-0.5 rounded">커스텀</span>
          )}
        </div>
        {isOpen ? <ChevronUp size={16} className="text-[#888]" /> : <ChevronDown size={16} className="text-[#888]" />}
      </button>

      {isOpen && (
        <div className="px-5 pb-5 border-t border-[#f0f0f0]">
          {result.items.length === 0 ? (
            <p className="py-6 text-center text-sm text-[#bbb]">관련 아이템이 없습니다</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 pt-4">
              {result.items.map(item => <ItemCard key={item.id} item={item} />)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main ──────────────────────────────────────────────────────────────────────
export default function ResultsPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [proposal, setProposal] = useState<{ title: string; keywords: string[]; sections: SectionConfig[] } | null>(null)
  const [results, setResults] = useState<SectionResult[]>([])
  const [profilesMap, setProfilesMap] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openSections, setOpenSections] = useState<Set<string>>(new Set())

  // 섹션 프로파일 로드
  useEffect(() => {
    fetch('/api/section-profiles')
      .then(r => r.json())
      .then((data: { section_name: string; base_keywords: string[] }[]) => {
        const map: Record<string, string[]> = {}
        data.forEach(p => { map[p.section_name] = p.base_keywords })
        setProfilesMap(map)
      })
  }, [])

  // 제안서 로드 + 검색
  const runSearch = useCallback(async () => {
    if (Object.keys(profilesMap).length === 0) return
    setLoading(true)
    setError(null)

    const sb = createClient()
    const { data } = await sb.from('proposals')
      .select('title,keywords,sections')
      .eq('id', id)
      .single()

    if (!data) { setError('제안서를 불러올 수 없습니다.'); setLoading(false); return }
    setProposal(data as any)

    const sections = data.sections as SectionConfig[]
    // 첫 번째 섹션 자동 열기
    setOpenSections(new Set(sections.slice(0, 1).map(s => s.id)))

    try {
      const res = await searchAllSections(sections, data.keywords, profilesMap)
      setResults(res)
    } catch (e: any) {
      setError(e.message ?? '검색 중 오류가 발생했습니다.')
    }
    setLoading(false)
  }, [id, profilesMap])

  useEffect(() => { runSearch() }, [runSearch])

  function toggleSection(sectionId: string) {
    setOpenSections(prev => {
      const next = new Set(prev)
      next.has(sectionId) ? next.delete(sectionId) : next.add(sectionId)
      return next
    })
  }

  function expandAll() { setOpenSections(new Set(results.map(r => r.section.id))) }
  function collapseAll() { setOpenSections(new Set()) }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex flex-col">
        <header className="bg-white border-b border-[#e0e0e0] px-8 py-4">
          <h1 className="text-sm font-bold text-[#111]">제안서 자동화 시스템</h1>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="w-8 h-8 border-2 border-[#333] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[#888]">섹션별 아이템을 검색하는 중…</p>
          <p className="text-xs text-[#bbb]">섹션 수에 따라 수 초 정도 걸릴 수 있습니다</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <header className="bg-white border-b border-[#e0e0e0] px-8 py-4 flex items-center gap-4">
        <h1 className="text-sm font-bold text-[#111]">제안서 자동화 시스템</h1>
        <span className="text-[#ccc]">/</span>
        <span className="text-sm text-[#555] truncate max-w-xs">{proposal?.title}</span>
        <span className="text-[#ccc]">/</span>
        <span className="text-sm text-[#555]">아이템 목록</span>
      </header>

      {/* 진행 단계 */}
      <div className="bg-white border-b border-[#e0e0e0] px-8 py-3 flex gap-6 text-xs">
        {[['1', '섹션 구성', false], ['2', '키워드 입력', false], ['3', '아이템 목록', true]].map(([n, label, active]) => (
          <div key={n as string} className={`flex items-center gap-1.5 ${active ? 'text-[#111] font-medium' : 'text-[#bbb]'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${active ? 'bg-[#333] text-white' : 'bg-[#e0e0e0] text-[#888]'}`}>{n}</span>
            {label}
          </div>
        ))}
      </div>

      <div className="max-w-6xl mx-auto px-8 py-6">
        {/* 요약 바 */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-xs text-[#888]">키워드:</span>
              {proposal?.keywords.map(kw => (
                <span key={kw} className="text-xs bg-[#333] text-white px-2 py-0.5 rounded-full">{kw}</span>
              ))}
            </div>
            <p className="text-xs text-[#bbb] mt-1">
              {results.length}개 섹션 · 총 {results.reduce((s, r) => s + r.items.length, 0)}개 아이템
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => router.push(`/proposals/${id}/keywords`)}>
              <ChevronLeft size={13} />키워드 수정
            </Button>
            <Button variant="ghost" size="sm" onClick={collapseAll}>모두 접기</Button>
            <Button variant="ghost" size="sm" onClick={expandAll}>모두 펼치기</Button>
            <Button variant="secondary" size="sm" onClick={runSearch}>
              <RotateCcw size={13} />재검색
            </Button>
          </div>
        </div>

        {error && (
          <div className="bg-white border border-[#e0e0e0] rounded-xl p-6 text-center mb-4">
            <p className="text-sm text-[#555] mb-3">{error}</p>
            <Button size="sm" onClick={runSearch}><RotateCcw size={13} />다시 시도</Button>
          </div>
        )}

        {/* 섹션별 결과 */}
        <div className="space-y-3">
          {results.map(result => (
            <SectionPanel
              key={result.section.id}
              result={result}
              isOpen={openSections.has(result.section.id)}
              onToggle={() => toggleSection(result.section.id)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
