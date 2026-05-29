import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

function keywordsFromFilename(filename: string): string[] {
  return filename
    .replace(/\.[^.]+$/, '')         // 확장자 제거
    .split(/_+/)                     // 언더스코어 기준 분리
    .map(s => s.trim())
    .filter(s => s.length >= 2 && !/^\d+$/.test(s)) // 1자·숫자만은 제외
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY 미설정', titleDraft: '', keywords: [] }, { status: 500 })
  }

  const { imageUrl, filename } = await req.json()
  if (!imageUrl) {
    return NextResponse.json({ error: '이미지 URL 없음', titleDraft: '', keywords: [] }, { status: 400 })
  }

  const filenameKeywords = filename ? keywordsFromFilename(filename) : []
  let aiKeywords: string[] = []
  let errorMsg: string | undefined

  try {
    const imgRes = await fetch(imageUrl)
    if (!imgRes.ok) throw new Error(`이미지 fetch 실패: ${imgRes.status}`)
    const imgBuffer = await imgRes.arrayBuffer()
    const base64 = Buffer.from(imgBuffer).toString('base64')
    const mimeType = imgRes.headers.get('content-type') ?? 'image/jpeg'

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const filenameHint = filenameKeywords.length > 0
      ? `\n파일명 힌트: ${filenameKeywords.join(', ')}`
      : ''

    const result = await model.generateContent([
      { inlineData: { mimeType, data: base64 } },
      `당신은 건설사업관리(CM) 제안서 아이템을 분류하는 전문가입니다.
이미지를 보고 해당 아이템을 가장 잘 설명하는 한국어 키워드를 25개 추출해 주세요.${filenameHint}
키워드 기준:
① 공종/작업 유형 (예: 철근콘크리트, 커튼월, 토공, 포장)
② 관리 분야 (예: 안전관리, 공정관리, 품질관리, 환경관리, 원가관리)
③ 기술/장비/시스템 (예: BIM, 드론, IoT, CCTV, 센서, 스마트건설)
④ 시설물/부위 유형 (예: 교량, 터널, 지하구조물, 외벽, 기초)
⑤ 특징/공법/효과 (예: 친환경, 원가절감, 공기단축, 모듈러, 프리캐스트)
⑥ 관련 규정/절차 (예: 안전점검, 품질시험, 검측, 준공검사)
짧고 명확한 단어 또는 복합어로 작성하고, 반드시 JSON 배열로만 응답하세요.`,
    ])

    const raw = result.response.text()
    const cleaned = raw.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(cleaned)
    if (Array.isArray(parsed)) {
      aiKeywords = parsed.map((k: unknown) => String(k).trim()).filter(Boolean)
    }
  } catch (e) {
    errorMsg = e instanceof Error ? e.message : String(e)
    console.error('[migrate] Gemini error:', errorMsg)
  }

  // AI 키워드 + 파일명 키워드 합치기 (중복 제거, 최대 30개)
  const merged = [...aiKeywords]
  for (const fk of filenameKeywords) {
    if (!merged.some(k => k.toLowerCase() === fk.toLowerCase())) {
      merged.push(fk)
    }
  }
  const keywords = merged.slice(0, 30)

  const titleDraft = filename
    ? filename.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')
    : '제목 없음'

  return NextResponse.json({ titleDraft, keywords, error: errorMsg })
}
