'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, FileText, Clock } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/client'
import { Proposal } from '@/types'

export default function DashboardPage() {
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [itemCount, setItemCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const sb = createClient()
    Promise.all([
      sb.from('proposals').select('id,title,keywords,status,created_at,updated_at').order('updated_at', { ascending: false }).limit(20),
      sb.from('items').select('id', { count: 'exact', head: true }),
    ]).then(([p, i]) => {
      setProposals((p.data ?? []) as Proposal[])
      setItemCount(i.count ?? 0)
      setLoading(false)
    })
  }, [])

  const statusLabel = { draft: '작성 중', review: '검토 중', final: '완료' }
  const statusColor = { draft: 'text-[#888]', review: 'text-[#555]', final: 'text-[#333]' }

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      {/* 상단 헤더 */}
      <header className="bg-white border-b border-[#e0e0e0] px-8 py-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-[#111] tracking-tight">제안서 자동화 시스템</h1>
        <nav className="flex gap-4 text-sm text-[#555]">
          <Link href="/dashboard" className="font-medium text-[#111]">대시보드</Link>
          <Link href="/db" className="hover:text-[#111]">아이템 DB</Link>
        </nav>
      </header>

      <main className="max-w-5xl mx-auto px-8 py-10">
        {/* 통계 */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: '등록된 아이템', value: itemCount !== null ? itemCount.toLocaleString() : '…', sub: '개' },
            { label: '내 제안서', value: proposals.length, sub: '건' },
            { label: '완료된 제안서', value: proposals.filter(p => p.status === 'final').length, sub: '건' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-lg border border-[#e0e0e0] px-6 py-5">
              <p className="text-xs text-[#888] mb-1">{s.label}</p>
              <p className="text-2xl font-bold text-[#111]">{s.value}<span className="text-sm font-normal text-[#888] ml-1">{s.sub}</span></p>
            </div>
          ))}
        </div>

        {/* 신규 제안서 */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-[#333]">내 제안서</h2>
          <Link href="/proposals/new">
            <Button size="sm"><Plus size={14} />새 제안서</Button>
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-16 text-[#888] text-sm">불러오는 중…</div>
        ) : proposals.length === 0 ? (
          <div className="bg-white rounded-lg border border-[#e0e0e0] py-16 text-center">
            <FileText size={32} className="mx-auto mb-3 text-[#ccc]" />
            <p className="text-sm text-[#888] mb-4">아직 제안서가 없습니다</p>
            <Link href="/proposals/new">
              <Button size="sm"><Plus size={14} />첫 제안서 만들기</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {proposals.map(p => (
              <Link key={p.id} href={`/proposals/${p.id}/sections`}
                className="flex items-center gap-4 bg-white rounded-lg border border-[#e0e0e0] px-6 py-4 hover:border-[#888] transition-colors group">
                <FileText size={18} className="text-[#bbb] shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#222] truncate group-hover:text-[#000]">{p.title}</p>
                  {p.keywords.length > 0 && (
                    <p className="text-xs text-[#888] mt-0.5 truncate">{p.keywords.join(', ')}</p>
                  )}
                </div>
                <span className={`text-xs shrink-0 ${statusColor[p.status]}`}>{statusLabel[p.status]}</span>
                <span className="text-xs text-[#bbb] shrink-0 flex items-center gap-1">
                  <Clock size={11} />{new Date(p.updated_at).toLocaleDateString('ko-KR')}
                </span>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
