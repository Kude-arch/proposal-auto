'use client'
import { useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { Upload, X, Check, Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'

interface DraftItem {
  file: File
  previewUrl: string
  uploadedUrl: string
  thumbnailUrl?: string
  titleDraft: string
  keywords: string[]
  keywordInput: string
  status: 'pending' | 'analyzing' | 'ready' | 'saving' | 'saved' | 'error'
  error?: string
}

export default function DBPage() {
  const [drafts, setDrafts] = useState<DraftItem[]>([])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const updateDraft = useCallback((idx: number, patch: Partial<DraftItem>) => {
    setDrafts(prev => prev.map((d, i) => i === idx ? { ...d, ...patch } : d))
  }, [])

  async function analyzeItem(idx: number, imageUrl: string, filename: string) {
    updateDraft(idx, { status: 'analyzing', error: undefined })
    try {
      const res = await fetch('/api/items/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl, filename }),
      })
      const json = await res.json()
      if (json.error && (!json.keywords || json.keywords.length === 0)) {
        updateDraft(idx, { status: 'ready', keywords: [], error: json.error })
      } else {
        updateDraft(idx, { titleDraft: json.titleDraft, keywords: json.keywords ?? [], status: 'ready', error: undefined })
      }
    } catch (e) {
      updateDraft(idx, { status: 'ready', keywords: [], error: e instanceof Error ? e.message : '분석 실패' })
    }
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploading(true)
    const sb = createClient()

    const newDrafts: DraftItem[] = []
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue
      const previewUrl = URL.createObjectURL(file)

      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `items/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
      const { data: uploadData, error: uploadErr } = await sb.storage
        .from('item-images')
        .upload(path, file, { cacheControl: '3600', upsert: false })

      if (uploadErr) {
        newDrafts.push({ file, previewUrl, uploadedUrl: '', titleDraft: file.name, keywords: [], keywordInput: '', status: 'error', error: uploadErr.message })
        continue
      }

      const { data: { publicUrl } } = sb.storage.from('item-images').getPublicUrl(uploadData.path)
      newDrafts.push({
        file, previewUrl,
        uploadedUrl: publicUrl,
        titleDraft: file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
        keywords: [], keywordInput: '', status: 'pending',
      })
    }

    const base = drafts.length
    setDrafts(prev => [...prev, ...newDrafts])
    setUploading(false)

    for (let i = 0; i < newDrafts.length; i++) {
      const d = newDrafts[i]
      if (d.status !== 'pending' || !d.uploadedUrl) continue
      await analyzeItem(base + i, d.uploadedUrl, d.file.name)
    }
  }

  async function reanalyzeAll() {
    const targets = drafts
      .map((d, i) => ({ d, i }))
      .filter(({ d }) => (d.status === 'ready' || d.status === 'error') && d.keywords.length === 0 && d.uploadedUrl)
    for (const { d, i } of targets) {
      await analyzeItem(i, d.uploadedUrl, d.file.name)
    }
  }

  function addKeyword(idx: number, kw: string) {
    const cleaned = kw.trim()
    if (!cleaned) return
    setDrafts(prev => prev.map((d, i) => {
      if (i !== idx) return d
      if (d.keywords.includes(cleaned) || d.keywords.length >= 30) return d
      return { ...d, keywords: [...d.keywords, cleaned], keywordInput: '' }
    }))
  }

  function removeKeyword(idx: number, kw: string) {
    setDrafts(prev => prev.map((d, i) => i !== idx ? d : { ...d, keywords: d.keywords.filter(k => k !== kw) }))
  }

  async function saveItem(idx: number) {
    const draft = drafts[idx]
    if (!draft.uploadedUrl || draft.keywords.length === 0) return
    updateDraft(idx, { status: 'saving' })

    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()

    const res = await fetch('/api/items/migrate/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{
          title: draft.titleDraft,
          keywords: draft.keywords,
          image_url: draft.uploadedUrl,
          thumbnail_url: draft.thumbnailUrl ?? draft.uploadedUrl,
          created_by: user?.id,
        }]
      }),
    })
    const { saved, failed } = await res.json()
    if (saved > 0) {
      updateDraft(idx, { status: 'saved' })
    } else {
      updateDraft(idx, { status: 'error', error: failed[0] ?? '저장 실패' })
    }
  }

  async function saveAll() {
    const readyIdxs = drafts.map((d, i) => i).filter(i => drafts[i].status === 'ready' && drafts[i].keywords.length > 0)
    for (const idx of readyIdxs) await saveItem(idx)
  }

  const readyCount = drafts.filter(d => d.status === 'ready' && d.keywords.length > 0).length
  const noKeywordCount = drafts.filter(d => (d.status === 'ready' || d.status === 'error') && d.keywords.length === 0 && d.uploadedUrl).length

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <header className="bg-white border-b border-[#e0e0e0] px-8 py-4 flex items-center justify-between">
        <h1 className="text-sm font-bold text-[#111]">제안서 자동화 시스템</h1>
        <nav className="flex gap-4 text-sm text-[#555]">
          <Link href="/dashboard" className="hover:text-[#111]">대시보드</Link>
          <Link href="/db" className="font-medium text-[#111]">아이템 DB</Link>
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-bold text-[#111]">아이템 업로드</h2>
          <div className="flex items-center gap-2">
            {noKeywordCount > 0 && (
              <Button onClick={reanalyzeAll} size="sm" variant="secondary">
                <RefreshCw size={13} />키워드 없는 항목 재분석 ({noKeywordCount}개)
              </Button>
            )}
            {readyCount > 0 && (
              <Button onClick={saveAll} size="sm">
                <Check size={13} />전체 저장 ({readyCount}개)
              </Button>
            )}
          </div>
        </div>

        {/* 드롭존 */}
        <div
          className="border-2 border-dashed border-[#e0e0e0] rounded-xl py-12 text-center mb-6 hover:border-[#888] transition-colors cursor-pointer bg-white"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files) }}
        >
          <Upload size={28} className="mx-auto mb-3 text-[#bbb]" />
          <p className="text-sm text-[#888]">이미지 파일을 드래그하거나 클릭하여 업로드</p>
          <p className="text-xs text-[#bbb] mt-1">PNG, JPG, WebP · 여러 파일 동시 선택 가능</p>
          {uploading && <p className="text-xs text-[#888] mt-2 flex items-center justify-center gap-1"><Loader2 size={12} className="animate-spin" />업로드 중…</p>}
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />

        {/* 드래프트 목록 */}
        {drafts.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {drafts.map((draft, idx) => (
              <div key={idx} className="bg-white rounded-xl border border-[#e0e0e0] overflow-hidden">
                {/* 이미지 */}
                <div className="relative aspect-[4/3] bg-[#f5f5f5]">
                  <Image src={draft.previewUrl} alt={draft.titleDraft} fill className="object-cover" sizes="240px" />
                  {draft.status === 'saved' && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <Check size={28} className="text-white" />
                    </div>
                  )}
                  {draft.status === 'analyzing' && (
                    <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center gap-1">
                      <Loader2 size={20} className="text-white animate-spin" />
                      <span className="text-white text-[10px]">AI 분석 중</span>
                    </div>
                  )}
                </div>

                <div className="p-3">
                  {/* 제목 */}
                  <input
                    type="text"
                    value={draft.titleDraft}
                    onChange={e => updateDraft(idx, { titleDraft: e.target.value })}
                    disabled={draft.status === 'saved'}
                    className="w-full text-xs font-medium text-[#222] border-b border-[#f0f0f0] pb-1 mb-2 focus:outline-none focus:border-[#888] bg-transparent"
                  />

                  {/* 키워드 */}
                  <div className="flex flex-wrap gap-1 mb-2">
                    {draft.keywords.map(kw => (
                      <span key={kw} className="inline-flex items-center gap-0.5 bg-[#333] text-white text-[9px] px-1.5 py-0.5 rounded-full">
                        {kw}
                        {draft.status !== 'saved' && (
                          <button onClick={() => removeKeyword(idx, kw)} className="hover:opacity-70"><X size={8} /></button>
                        )}
                      </span>
                    ))}
                  </div>

                  {draft.status !== 'saved' && draft.status !== 'saving' && draft.status !== 'analyzing' && (
                    <input
                      type="text"
                      value={draft.keywordInput}
                      onChange={e => updateDraft(idx, { keywordInput: e.target.value })}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ',') {
                          e.preventDefault()
                          addKeyword(idx, draft.keywordInput)
                        }
                      }}
                      placeholder="키워드 직접 입력 + Enter"
                      className="w-full text-[10px] border border-[#e0e0e0] rounded px-2 py-1 focus:outline-none focus:border-[#888] mb-2"
                    />
                  )}

                  {draft.status === 'error' && (
                    <p className="text-[10px] text-red-500 flex items-center gap-1 mb-2">
                      <AlertCircle size={10} />{draft.error ?? '오류 발생'}
                    </p>
                  )}

                  <div className="flex gap-1.5">
                    {(draft.status === 'ready' || draft.status === 'error') && draft.keywords.length === 0 && draft.uploadedUrl && (
                      <button
                        onClick={() => analyzeItem(idx, draft.uploadedUrl, draft.file.name)}
                        className="flex-1 flex items-center justify-center gap-1 text-[10px] text-[#555] border border-[#e0e0e0] rounded py-1 hover:border-[#888] transition-colors"
                      >
                        <RefreshCw size={9} />재분석
                      </button>
                    )}
                    {draft.status === 'ready' && draft.keywords.length > 0 && (
                      <Button size="sm" className="flex-1 text-[10px] py-1" onClick={() => saveItem(idx)}>
                        저장
                      </Button>
                    )}
                  </div>

                  {draft.status === 'saving' && (
                    <div className="flex items-center justify-center gap-1 text-[10px] text-[#888] py-1">
                      <Loader2 size={10} className="animate-spin" />저장 중
                    </div>
                  )}
                  {draft.status === 'saved' && (
                    <div className="flex items-center justify-center gap-1 text-[10px] text-[#555] py-1">
                      <Check size={10} />저장 완료
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
