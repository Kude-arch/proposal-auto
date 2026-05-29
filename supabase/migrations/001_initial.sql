-- pgvector 확장
create extension if not exists vector;

-- ─── items ──────────────────────────────────────────────────────────────────
create table items (
  id             uuid primary key default gen_random_uuid(),
  title          text not null,
  keywords       text[] not null default '{}',
  image_url      text not null,
  thumbnail_url  text,
  body           text,
  section_hints  text[] not null default '{}',
  embedding      vector(1536),
  usage_count    integer not null default 0,
  source_file    text,
  created_by     uuid references auth.users(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- keywords 배열 최대 10개 제약
alter table items
  add constraint keywords_max_10 check (array_length(keywords, 1) <= 10);

-- updated_at 자동 갱신
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger items_updated_at
  before update on items
  for each row execute function update_updated_at();

-- 벡터 인덱스 (IVFFlat — 10,000건 이상 성능)
create index items_embedding_idx
  on items using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- 키워드 GIN 인덱스 (텍스트 검색)
create index items_keywords_idx on items using gin(keywords);

-- ─── proposals ──────────────────────────────────────────────────────────────
create table proposals (
  id          uuid primary key default gen_random_uuid(),
  title       text not null default '새 제안서',
  keywords    text[] not null default '{}',   -- 공통 키워드
  sections    jsonb not null default '[]',    -- SectionConfig[]
  status      text not null default 'draft' check (status in ('draft','review','final')),
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger proposals_updated_at
  before update on proposals
  for each row execute function update_updated_at();

-- ─── saved_layouts ───────────────────────────────────────────────────────────
create table saved_layouts (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  sections    jsonb not null default '[]',   -- 섹션 구성만 (이미지 배치 제외)
  is_shared   boolean not null default false,
  created_by  uuid references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);

-- ─── section_profiles ────────────────────────────────────────────────────────
create table section_profiles (
  id            uuid primary key default gen_random_uuid(),
  section_name  text not null unique,
  base_keywords text[] not null default '{}',
  embedding     vector(1536),
  default_count integer not null default 10,
  updated_at    timestamptz not null default now()
);

-- ─── RLS ─────────────────────────────────────────────────────────────────────
alter table items          enable row level security;
alter table proposals      enable row level security;
alter table saved_layouts  enable row level security;
alter table section_profiles enable row level security;

-- items: 로그인 사용자 전체 읽기, 본인만 쓰기
create policy "items_read"   on items for select using (auth.uid() is not null);
create policy "items_insert" on items for insert with check (auth.uid() = created_by);
create policy "items_update" on items for update using (auth.uid() = created_by);
create policy "items_delete" on items for delete using (auth.uid() = created_by);

-- proposals: 본인 것만
create policy "proposals_all" on proposals
  using (auth.uid() = created_by)
  with check (auth.uid() = created_by);

-- saved_layouts: 본인 것 + 공유된 것 읽기
create policy "layouts_read" on saved_layouts
  for select using (auth.uid() = created_by or is_shared = true);
create policy "layouts_write" on saved_layouts
  for insert with check (auth.uid() = created_by);
create policy "layouts_update" on saved_layouts
  for update using (auth.uid() = created_by);
create policy "layouts_delete" on saved_layouts
  for delete using (auth.uid() = created_by);

-- section_profiles: 읽기 전용 (관리자만 수정)
create policy "profiles_read" on section_profiles
  for select using (auth.uid() is not null);

-- ─── 표준 섹션 프로파일 초기 데이터 ─────────────────────────────────────────
insert into section_profiles (section_name, base_keywords, default_count) values
  ('과업의 성격 및 범위에 대한 이해도',  array['과업이해','발주목적','사업범위','CM역할'], 10),
  ('현장특성 분석',                      array['현장','입지','지형','교통','주변환경','접근성'], 10),
  ('시설특성 분석',                      array['시설','구조','규모','용도','설계','사양'], 10),
  ('통합사업관리 계획',                   array['통합관리','일정','비용','리스크','정보관리'], 10),
  ('단계별 시공관리',                     array['시공단계','착공','골조','마감','준공','검사'], 10),
  ('공종별 시공관리',                     array['공종','토공','철근','콘크리트','기계','전기'], 10),
  ('품질관리 계획',                       array['품질','QC','검사','시험','자재','불량','승인'], 10),
  ('공정관리 계획',                       array['공정','일정','공기','지연','만회','네트워크공정표'], 10),
  ('안전관리 계획',                       array['안전','재해','위험','방호','안전점검','사고예방'], 10),
  ('환경관리 계획',                       array['환경','소음','진동','먼지','폐기물','오염'], 10),
  ('시운전 및 유지관리',                   array['시운전','준공','유지관리','운영','인수인계'], 10),
  ('조직운영 계획',                       array['조직','인원','역할','보고체계','의사결정'], 10),
  ('인력투입 계획',                       array['인력','투입','배치','전문인력','경력'], 10),
  ('본사 현장지원 계획',                   array['본사지원','기술지원','검토','협조','전문팀'], 10),
  ('설계도서 분석 및 예상문제점 대책',     array['설계도서','도면검토','문제점','대책','도면불일치'], 10),
  ('시공 성능 개선방안',                   array['성능개선','공법','신기술','VE','효율화'], 10),
  ('건설현장 이슈 및 예상문제점 대책',     array['현장이슈','리스크','민원','지하매설물','인접공사'], 10);
