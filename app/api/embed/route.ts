import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function POST(req: NextRequest) {
  const { text } = await req.json()
  if (!text?.trim()) {
    return NextResponse.json({ error: 'text required' }, { status: 400 })
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
  const model = genAI.getGenerativeModel({ model: 'text-embedding-004' })
  const result = await model.embedContent(text.slice(0, 8000))
  return NextResponse.json({ embedding: result.embedding.values })
}
