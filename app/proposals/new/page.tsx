'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'

export default function NewProposalPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleCreate() {
    if (!title.trim()) return
    setLoading(true)
    const res = await fetch('/api/proposals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title.trim(), keywords: [], sections: [] }),
    })
    const data = await res.json()
    router.push(`/proposals/${data.id}/sections`)
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center">
      <div className="bg-white rounded-xl border border-[#e0e0e0] p-10 w-full max-w-md">
        <h1 className="text-lg font-bold text-[#111] mb-6">새 제안서</h1>
        <label className="block text-xs font-medium text-[#555] mb-1.5">제안서 제목</label>
        <input
          autoFocus
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
          placeholder="예: 서울시 도로공사 기술제안서"
          className="w-full border border-[#e0e0e0] rounded-lg px-4 py-2.5 text-sm text-[#111] placeholder-[#bbb] focus:outline-none focus:border-[#888] mb-6"
        />
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" onClick={() => router.push('/dashboard')}>취소</Button>
          <Button onClick={handleCreate} disabled={!title.trim() || loading}>
            {loading ? '생성 중…' : '다음 — 섹션 구성 →'}
          </Button>
        </div>
      </div>
    </div>
  )
}
