'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, X, Plus, ChevronRight, Bookmark, Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { STANDARD_SECTIONS, SectionConfig } from '@/types'
import { v4 as uuid } from 'uuid'

// ─── Sortable Section Row ────────────────────────────────────────────────────
function SortableRow({ section, onRemove }: { section: SectionConfig; onRemove: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }

  return (
    <div ref={setNodeRef} style={style}
      className="flex items-center gap-2 bg-white border border-[#e0e0e0] rounded-lg px-3 py-2.5 group">
      <button {...attributes} {...listeners} className="text-[#bbb] hover:text-[#888] cursor-grab active:cursor-grabbing p-0.5">
        <GripVertical size={14} />
      </button>
      <span className="flex-1 text-sm text-[#333]">{section.section_name}</span>
      {section.is_custom && (
        <span className="text-[10px] bg-[#ebebeb] text-[#888] px-1.5 py-0.5 rounded">커스텀</span>
      )}
      <button onClick={() => onRemove(section.id)} className="text-[#ccc] hover:text-[#888] p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <X size={14} />
      </button>
    </div>
  )
}

// ─── Saved Layouts Modal ─────────────────────────────────────────────────────
function SavedLayoutsModal({ onLoad, onClose }: { onLoad: (sections: SectionConfig[]) => void; onClose: () => void }) {
  const [layouts, setLayouts] = useState<any[]>([])
  useEffect(() => {
    fetch('/api/layouts').then(r => r.json()).then(setLayouts)
  }, [])

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl border border-[#e0e0e0] w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-[#111]">저장된 섹션 구성</h3>
          <button onClick={onClose} className="text-[#bbb] hover:text-[#555]"><X size={16} /></button>
        </div>
        {layouts.length === 0 ? (
          <p className="text-xs text-[#888] py-4 text-center">저장된 구성이 없습니다</p>
        ) : (
          <ul className="space-y-2 max-h-64 overflow-y-auto">
            {layouts.map((l: any) => (
              <li key={l.id}>
                <button onClick={() => {
                  const loaded: SectionConfig[] = (l.sections as any[]).map((s: any, i: number) => ({
                    id: uuid(), order: i, section_name: s.section_name,
                    is_custom: s.is_custom ?? false, item_count: s.item_count ?? 10,
                  }))
                  onLoad(loaded)
                  onClose()
                }} className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#f5f5f5] text-sm text-[#333]">
                  {l.name}
                  <span className="text-xs text-[#888] ml-2">{l.sections.length}개 섹션</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SectionsPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const sensors = useSensors(useSensor(PointerSensor))

  const [selected, setSelected] = useState<SectionConfig[]>([])
  const [customInput, setCustomInput] = useState('')
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [showLoadModal, setShowLoadModal] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [saveShared, setSaveShared] = useState(false)

  const isAdded = useCallback((name: string) => selected.some(s => s.section_name === name), [selected])

  function addSection(name: string, isCustom = false) {
    if (isAdded(name)) return
    setSelected(prev => [...prev, { id: uuid(), order: prev.length, section_name: name, is_custom: isCustom, item_count: 10 }])
  }

  function removeSection(id: string) {
    setSelected(prev => prev.filter(s => s.id !== id))
  }

  function addCustom() {
    const name = customInput.trim()
    if (!name) return
    addSection(name, true)
    setCustomInput('')
  }

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    setSelected(prev => {
      const oldIdx = prev.findIndex(s => s.id === active.id)
      const newIdx = prev.findIndex(s => s.id === over.id)
      return arrayMove(prev, oldIdx, newIdx).map((s, i) => ({ ...s, order: i }))
    })
  }

  async function saveLayout() {
    if (!saveName.trim()) return
    await fetch('/api/layouts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: saveName,
        is_shared: saveShared,
        sections: selected.map(({ order, section_name, is_custom, item_count }) =>
          ({ order, section_name, is_custom, item_count })
        ),
      }),
    })
    setShowSaveModal(false)
    setSaveName('')
  }

  async function handleNext() {
    // 섹션 구성을 proposal에 저장 후 키워드 입력으로 이동
    await fetch(`/api/proposals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sections: selected }),
    })
    router.push(`/proposals/${id}/keywords`)
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <header className="bg-white border-b border-[#e0e0e0] px-8 py-4 flex items-center gap-4">
        <h1 className="text-sm font-bold text-[#111]">제안서 자동화 시스템</h1>
        <span className="text-[#ccc]">/</span>
        <span className="text-sm text-[#555]">섹션 구성</span>
        <div className="ml-auto flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowLoadModal(true)}>
            <Bookmark size={13} />저장된 구성 불러오기
          </Button>
        </div>
      </header>

      {/* 진행 단계 표시 */}
      <div className="bg-white border-b border-[#e0e0e0] px-8 py-3 flex gap-6 text-xs">
        {[['1', '섹션 구성', true], ['2', '키워드 입력', false], ['3', '아이템 목록', false]].map(([n, label, active]) => (
          <div key={n as string} className={`flex items-center gap-1.5 ${active ? 'text-[#111] font-medium' : 'text-[#bbb]'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${active ? 'bg-[#333] text-white' : 'bg-[#e0e0e0] text-[#888]'}`}>{n}</span>
            {label}
          </div>
        ))}
      </div>

      <div className="max-w-5xl mx-auto px-8 py-8 flex gap-6">
        {/* 좌측: 표준 섹션 목록 */}
        <div className="w-72 shrink-0">
          <p className="text-xs font-semibold text-[#555] mb-3 uppercase tracking-wider">표준 섹션 목록</p>
          <div className="space-y-1">
            {STANDARD_SECTIONS.map(s => (
              <button key={s.name} onClick={() => addSection(s.name)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                  isAdded(s.name)
                    ? 'bg-[#ebebeb] text-[#888] cursor-default'
                    : 'text-[#333] hover:bg-white hover:border hover:border-[#e0e0e0]'
                }`}>
                {isAdded(s.name) && <Check size={12} className="text-[#bbb] shrink-0" />}
                <span className="truncate">{s.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 우측: 현재 구성 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-[#555] uppercase tracking-wider">
              이번 제안서 섹션 구성 <span className="text-[#888] font-normal">({selected.length}개)</span>
            </p>
            {selected.length > 0 && (
              <button onClick={() => setShowSaveModal(true)} className="text-xs text-[#888] hover:text-[#333] flex items-center gap-1">
                <Bookmark size={11} />이 구성 저장
              </button>
            )}
          </div>

          {selected.length === 0 ? (
            <div className="border-2 border-dashed border-[#e0e0e0] rounded-xl py-16 text-center">
              <p className="text-sm text-[#bbb]">왼쪽에서 섹션을 클릭해 추가하세요</p>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={selected.map(s => s.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {selected.map(s => (
                    <SortableRow key={s.id} section={s} onRemove={removeSection} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}

          {/* 커스텀 섹션 추가 */}
          <div className="flex gap-2 mt-4">
            <input
              type="text"
              value={customInput}
              onChange={e => setCustomInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addCustom()}
              placeholder="직접 섹션명 입력 후 Enter"
              className="flex-1 border border-[#e0e0e0] rounded-lg px-3 py-2 text-sm text-[#333] placeholder-[#bbb] focus:outline-none focus:border-[#888]"
            />
            <Button variant="secondary" size="sm" onClick={addCustom} disabled={!customInput.trim()}>
              <Plus size={13} />추가
            </Button>
          </div>

          {/* 다음 버튼 */}
          <div className="flex justify-end mt-8">
            <Button onClick={handleNext} disabled={selected.length === 0} size="lg">
              다음 — 키워드 입력 <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      </div>

      {/* 저장 모달 */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl border border-[#e0e0e0] w-full max-w-sm p-6">
            <h3 className="text-sm font-semibold text-[#111] mb-4">섹션 구성 저장</h3>
            <input
              autoFocus
              type="text"
              value={saveName}
              onChange={e => setSaveName(e.target.value)}
              placeholder="구성 이름 (예: 도로공사 기본형)"
              className="w-full border border-[#e0e0e0] rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:border-[#888]"
            />
            <label className="flex items-center gap-2 text-xs text-[#555] mb-5 cursor-pointer">
              <input type="checkbox" checked={saveShared} onChange={e => setSaveShared(e.target.checked)} className="rounded" />
              팀 전체 공유
            </label>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setShowSaveModal(false)}>취소</Button>
              <Button size="sm" onClick={saveLayout} disabled={!saveName.trim()}>저장</Button>
            </div>
          </div>
        </div>
      )}

      {showLoadModal && (
        <SavedLayoutsModal
          onLoad={sections => setSelected(sections)}
          onClose={() => setShowLoadModal(false)}
        />
      )}
    </div>
  )
}
