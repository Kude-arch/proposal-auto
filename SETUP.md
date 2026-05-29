# 시작 전 설정 (5분)

## 1. Supabase 프로젝트 생성
1. https://supabase.com → New Project
2. 이름: `proposal-auto` / 비밀번호 설정 / 리전: Northeast Asia (Seoul)

## 2. DB 마이그레이션 실행
Supabase 대시보드 → SQL Editor → 아래 파일 내용을 순서대로 실행:
- `supabase/migrations/001_initial.sql`
- `supabase/migrations/002_search_function.sql`

## 3. Storage 버킷 생성
Supabase 대시보드 → Storage → New Bucket
- 이름: `item-images`
- Public bucket: ✅ 체크

## 4. 환경변수 설정
`.env.local` 파일에 아래 값 입력:
- `NEXT_PUBLIC_SUPABASE_URL` → Settings > API > Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` → Settings > API > anon public
- `SUPABASE_SERVICE_ROLE_KEY` → Settings > API > service_role (비공개)
- `OPENAI_API_KEY` → https://platform.openai.com/api-keys

## 5. 실행
```
npm run dev
```
→ http://localhost:3000

## 폴더 구조
```
proposal-auto/
├── app/
│   ├── dashboard/          # 대시보드
│   ├── proposals/
│   │   ├── new/            # 제안서 제목 입력
│   │   └── [id]/
│   │       ├── sections/   # 섹션 구성
│   │       ├── keywords/   # 키워드 입력
│   │       └── results/    # 섹션별 아이템 목록
│   ├── db/                 # 아이템 DB 관리 (업로드)
│   └── api/                # API Routes
├── supabase/migrations/    # DB 스키마
├── types/index.ts          # 타입 정의
└── lib/
    ├── search.ts           # 검색 로직 (벡터 유사도 + 최신순)
    └── supabase/           # Supabase 클라이언트
```
