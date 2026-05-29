// ─── Item (아이템 DB) ────────────────────────────────────────────────────────
export interface Item {
  id: string
  title: string
  keywords: string[]
  image_url: string
  thumbnail_url: string | null
  body: string | null
  section_hints: string[]
  usage_count: number
  created_at: string
  updated_at: string
}

// ─── Section (제안서 섹션) ────────────────────────────────────────────────────
export interface SectionConfig {
  id: string          // 임시 uuid (로컬 상태용)
  order: number
  section_name: string
  is_custom: boolean
  item_count: number  // 이 섹션에서 보여줄 아이템 수 (기본 10)
}

// ─── Proposal ───────────────────────────────────────────────────────────────
export interface Proposal {
  id: string
  title: string
  keywords: string[]          // 공통 키워드
  sections: SectionConfig[]
  status: 'draft' | 'review' | 'final'
  created_by: string
  created_at: string
  updated_at: string
}

// ─── Search Result ───────────────────────────────────────────────────────────
export interface SectionResult {
  section: SectionConfig
  items: RankedItem[]
}

export interface RankedItem extends Item {
  relevance_score: number   // 벡터 유사도 (0~1)
  recency_score: number     // 최신도 점수 (0~1, 정규화)
  final_score: number       // relevance*0.7 + recency*0.3
}

// ─── Saved Layout ────────────────────────────────────────────────────────────
export interface SavedLayout {
  id: string
  name: string
  sections: Pick<SectionConfig, 'order' | 'section_name' | 'is_custom' | 'item_count'>[]
  is_shared: boolean
  created_by: string
  created_at: string
}

// ─── Standard Sections ──────────────────────────────────────────────────────
export const STANDARD_SECTIONS = [
  { name: '과업의 성격 및 범위에 대한 이해도', keywords: ['과업이해', '발주목적', '사업범위', 'CM역할'] },
  { name: '현장특성 분석',                     keywords: ['현장', '입지', '지형', '교통', '주변환경', '접근성'] },
  { name: '시설특성 분석',                     keywords: ['시설', '구조', '규모', '용도', '설계', '사양'] },
  { name: '통합사업관리 계획',                  keywords: ['통합관리', '일정', '비용', '리스크', '정보관리'] },
  { name: '단계별 시공관리',                    keywords: ['시공단계', '착공', '골조', '마감', '준공', '검사'] },
  { name: '공종별 시공관리',                    keywords: ['공종', '토공', '철근', '콘크리트', '기계', '전기'] },
  { name: '품질관리 계획',                      keywords: ['품질', 'QC', '검사', '시험', '자재', '불량', '승인'] },
  { name: '공정관리 계획',                      keywords: ['공정', '일정', '공기', '지연', '만회', '네트워크공정표'] },
  { name: '안전관리 계획',                      keywords: ['안전', '재해', '위험', '방호', '안전점검', '사고예방'] },
  { name: '환경관리 계획',                      keywords: ['환경', '소음', '진동', '먼지', '폐기물', '오염'] },
  { name: '시운전 및 유지관리',                  keywords: ['시운전', '준공', '유지관리', '운영', '인수인계'] },
  { name: '조직운영 계획',                      keywords: ['조직', '인원', '역할', '보고체계', '의사결정'] },
  { name: '인력투입 계획',                      keywords: ['인력', '투입', '배치', '전문인력', '경력'] },
  { name: '본사 현장지원 계획',                  keywords: ['본사지원', '기술지원', '검토', '협조', '전문팀'] },
  { name: '설계도서 분석 및 예상문제점 대책',    keywords: ['설계도서', '도면검토', '문제점', '대책', '도면불일치'] },
  { name: '시공 성능 개선방안',                  keywords: ['성능개선', '공법', '신기술', 'VE', '효율화'] },
  { name: '건설현장 이슈 및 예상문제점 대책',    keywords: ['현장이슈', '리스크', '민원', '지하매설물', '인접공사'] },
] as const
