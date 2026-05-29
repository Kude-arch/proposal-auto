'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { X, ChevronRight, ChevronLeft, Lightbulb } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/client'

const KEYWORD_SUGGESTIONS = [
  '도로공사', '교량', '터널', '아파트', '공공건축', '리모델링',
  '안전', '품질', '공정', '환경', '발주처', '노후화',
  '도심지', '지하', '연약지반', '고층', '장대교량', '복잡한지형',
]

export default function KeywordsPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [keywords, setKeywords] = useState<string[]>([])
  const [input, setInput] = useState('')
  const [proposalTitle, setProposalTitle] = useState('')
  const [sectionCount, setSectionCount] = useState(0)

  useEffect(() => {
    const sb = createClient()
    sb.from('proposals').select('title,sections').eq('id', id).single()
      .then(({ data }) => {
        if (data) {
          setProposalTitle(data.title)
          setSectionCount((data.sections as any[]).length)
        }
      })
  }, [id])

  function addKeyword(kw: string) {
    const cleaned = kw.trim()
    if (!cleaned || keywords.includes(cleaned) || keywords.length >= 20) return
    setKeywords(prev => [...prev, cleaned])
  }

  function removeKeyword(kw: string) {
    setKeywords(prev => prev.filter(k => k !== kw))
  }

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addKeyword(input)
      setInput('')
    } else if (e.key === 'Backspace' && input === '' && keywords.length > 0) {
      setKeywords(prev => prev.slice(0, -1))
    }
  }

  async function handleSearch() {
    // 키워드 저장 후 결과 페이지로
    await fetch(`/api/proposals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keywords }),
    })
    router.push(`/proposals/${id}/results`)
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <header className="bg-white border-b border-[#e0e0e0] px-8 py-4 flex items-center gap-4">
        <h1 className="text-sm font-bold text-[#111]">제안서 자동화 시스템</h1>
        <span className="text-[#ccc]">/</span>
        <span className="text-sm text-[#555] truncate max-w-xs">{proposalTitle}</span>
        <span className="text-[#ccc]">/</span>
        <span className="text-sm text-[#555]">키워드 입력</span>
      </header>

      {/* 진행 단계 */}
      <div className="bg-white border-b border-[#e0e0e0] px-8 py-3 flex gap-6 text-xs">
        {[['1', '섹션 구성', false], ['2', '키워드 입력', true], ['3', '아이템 목록', false]].map(([n, label, active]) => (
          <div key={n as string} className={`flex items-center gap-1.5 ${active ? 'text-[#111] font-medium' : 'text-[#bbb]'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${active ? 'bg-[#333] text-white' : 'bg-[#e0e0e0] text-[#888]'}`}>{n}</span>
            {label}
          </div>
        ))}
      </div>

      <div className="max-w-2xl mx-auto px-8 py-12">
        <div className="mb-2">
          <h2 className="text-base font-bold text-[#111]">현장 키워드 입력</h2>
          <p className="text-sm text-[#888] mt-1">
            이 현장·프로젝트를 설명하는 키워드를 입력하세요.<br />
            <strong className="text-[#555]">{sectionCount}개 섹션</strong> 각각에서 키워드와 관련된 아이템을 찾아드립니다.
          </p>
        </div>

        {/* 키워드 입력 영역 */}
        <div className="bg-white border border-[#e0e0e0] rounded-xl p-4 mt-6 focus-within:border-[#888] transition-colors">
          <div className="flex flex-wrap gap-2 mb-2">
            {keywords.map(kw => (
              <span key={kw} className="inline-flex items-center gap-1 bg-[#333] text-white text-xs px-3 py-1 rounded-full">
                {kw}
                <button onClick={() => removeKeyword(kw)} className="hover:opacity-70 ml-0.5">
                  <X size={11} />
                </button>
              </span>
            ))}
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder={keywords.length === 0 ? '키워드 입력 후 Enter (예: 도심지, 교량, 안전)' : '추가 키워드…'}
              className="flex-1 min-w-32 text-sm text-[#333] placeholder-[#bbb] focus:outline-none bg-transparent"
            />
          </div>
          <p className="text-[10px] text-[#bbb]">Enter 또는 쉼표로 구분 · 최대 20개</p>
        </div>

        {/* 추천 키워드 */}
        <div className="mt-5">
          <p className="text-xs text-[#888] flex items-center gap-1 mb-2">
            <Lightbulb size={11} />빠른 추가
          </p>
          <div className="flex flex-wrap gap-2">
            {KEYWORD_SUGGESTIONS.filter(s => !keywords.includes(s)).map(s => (
              <button key={s} onClick={() => addKeyword(s)}
                className="text-xs border border-[#e0e0e0] rounded-full px-3 py-1 text-[#555] hover:border-[#888] hover:text-[#111] transition-colors bg-white">
                + {s}
              </button>
            ))}
          </div>
        </div>

        {/* 네비게이션 */}
        <div className="flex justify-between mt-10">
          <Button variant="ghost" onClick={() => router.push(`/proposals/${id}/sections`)}>
            <ChevronLeft size={15} />섹션 구성으로
          </Button>
          <Button onClick={handleSearch} size="lg" disabled={keywords.length === 0}>
            아이템 검색 <ChevronRight size={16} />
          </Button>
        </div>
      </div>
    </div>
  )
}
